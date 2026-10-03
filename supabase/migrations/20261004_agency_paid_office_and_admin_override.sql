-- 중개사무소 1곳 = 부동산 신청 1개 — 예외 두 가지 (2026-10-04)
--   1) 같은 사무소의 기존 계정이 유료로 쓰고 있으면 추가 계정(직원) 허용 — 개수 제한 없음
--   2) 최고관리자가 [중복 허용]한 계정
-- 20261003_agency_one_per_reg_num.sql 다음에 실행한다.

-- 서버(최고관리자 확인 후)만 켜는 표시. 일반 회원이 직접 켜도 아래 트리거가 믿지 않는다.
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS allow_duplicate boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION agencies_block_duplicate_reg_num()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  new_norm text := regexp_replace(coalesce(NEW.reg_num, ''), '[^0-9]', '', 'g');
  old_norm text;
BEGIN
  IF length(new_norm) < 5 THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    old_norm := regexp_replace(coalesce(OLD.reg_num, ''), '[^0-9]', '', 'g');
    IF old_norm = new_norm THEN
      RETURN NEW; -- 등록번호를 그대로 두고 다른 정보만 고치는 경우 (기존 계정 포함) 는 검사하지 않는다
    END IF;
  END IF;

  -- 예외 2: 최고관리자 허용 — 서비스 키로 들어온 요청(auth.uid() 가 없음)에서만 믿는다.
  --         로그인한 일반 회원이 브라우저에서 allow_duplicate 를 켜도 통과되지 않는다.
  IF NEW.allow_duplicate AND auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- 예외 1: 같은 등록번호의 기존 계정 중 유료로 쓰는 사무소가 있으면 허용
  --         (src/utils/planCheck.ts getEffectivePlan 과 같은 기준: 부동산회원 + 유료 등급 + 기간 안, 또는 최고관리자)
  IF EXISTS (
    SELECT 1
    FROM agencies a
    JOIN members m ON m.id = a.owner_id
    WHERE a.reg_num_norm = new_norm
      AND a.status IN ('PENDING', 'APPROVED')
      AND a.owner_id <> NEW.owner_id
      AND (
        m.role IN ('ADMIN', '최고관리자')
        OR (
          m.role IN ('REALTOR', '부동산회원')
          AND m.plan_type IN ('news_premium', 'study_premium', 'biz_premium')
          AND (m.plan_end_date IS NULL OR m.plan_end_date::date >= current_date)
        )
      )
  ) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM agencies a
    WHERE a.reg_num_norm = new_norm
      AND a.status IN ('PENDING', 'APPROVED')
      AND a.owner_id <> NEW.owner_id
  ) THEN
    RAISE EXCEPTION '이미 가입된 중개사무소입니다. 무료 회원은 중개사무소 한 곳당 부동산회원 계정을 하나만 만들 수 있습니다.'
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;
