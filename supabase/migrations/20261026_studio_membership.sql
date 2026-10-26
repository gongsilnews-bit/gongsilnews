-- 공실스튜디오 멤버십 = 등급과 따로 저장하는 이용권 (2026-10-26 사장님, 계획서 docs/2026-10-26_studio_membership_plan.md)
--   공실뉴스부동산(REALTOR) 은 무료, 공실스튜디오 이용 기간이 남아 있으면 이름표 옆에 Studio 마크.
--   나중에 비즈니스회원도 같은 칸으로 Studio 를 단다.

-- 1) 이용 기간 칸
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS studio_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS studio_end_date timestamptz;

COMMENT ON COLUMN public.members.studio_end_date IS
  '공실스튜디오 멤버십 끝나는 날. 오늘 이후면 이용 중 (src/utils/permissionCheck.ts isStudioMember)';

-- 2) 지금 유료 회원(옛 공실뉴스부동산·공실스터디부동산)의 남은 기간을 이용 기간으로 옮긴다.
--    등급 값(plan_type)은 그대로 둔다 — 옮기는 동안 코드가 두 값을 다 읽는다.
UPDATE public.members
SET studio_start_date = COALESCE(plan_start_date, now()),
    studio_end_date = plan_end_date
WHERE plan_type IN ('news_premium', 'study_premium')
  AND plan_end_date IS NOT NULL
  AND studio_end_date IS NULL;

-- 3) 중복 사무소 막기: 같은 등록번호에 공실스튜디오 이용 중인 계정이 있으면 추가 계정 허용
--    (20261013 과 같고, 유료 판단에 studio_end_date 만 더함)
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
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.allow_duplicate AND auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM agencies a
    JOIN members m ON m.id = a.owner_id
    WHERE a.reg_num_norm = new_norm
      AND a.status IN ('PENDING', 'APPROVED')
      AND a.owner_id <> NEW.owner_id
      AND (
        m.role::text IN ('ADMIN', '최고관리자')
        OR (m.studio_end_date IS NOT NULL AND m.studio_end_date::date >= current_date)
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
