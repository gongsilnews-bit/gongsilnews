-- 부동산회원 신청 저장 실패 수정 (2026-10-13)
--   증상: 등록번호를 넣고 [승인 심사 신청하기] → "invalid input value for enum member_role"
--   원인: 20261004 트리거가 members.role(enum member_role)을 '최고관리자'·'부동산회원'과 비교했는데,
--         enum 에 그 값이 없어 비교 자체가 오류가 난다. → role 을 text 로 바꿔 비교한다.
--   나머지 규칙(유료 사무소 추가 계정 허용, 최고관리자 [중복 허용])은 20261004 와 같다.

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
  IF NEW.allow_duplicate AND auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- 예외 1: 같은 등록번호의 기존 계정 중 유료로 쓰는 사무소가 있으면 허용
  --         (src/utils/planCheck.ts getEffectivePlan 과 같은 기준)
  IF EXISTS (
    SELECT 1
    FROM agencies a
    JOIN members m ON m.id = a.owner_id
    WHERE a.reg_num_norm = new_norm
      AND a.status IN ('PENDING', 'APPROVED')
      AND a.owner_id <> NEW.owner_id
      AND (
        m.role::text IN ('ADMIN', '최고관리자')
        OR (
          m.role::text IN ('REALTOR', '부동산회원')
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
