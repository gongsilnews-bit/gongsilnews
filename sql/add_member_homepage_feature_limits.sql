-- 물건접수웹페이지의 무료·유료 기능 차등.
--
-- 홈페이지는 전원에게 열되 안에서 기능을 나눈다. 다른 권한과 마찬가지로
-- 판정의 주인은 이 세 칸이고, 등급은 기본값을 내려줄 뿐이다.
--
--   max_hero_slides        첫 화면 슬라이드 장수 (무료 1 / 유료 3)
--   can_hide_footer_badge  푸터의 'powered by 공실뉴스' 를 숨길 수 있는가
--   can_intake_photo       접수 폼에서 사진 첨부를 받을 수 있는가

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS max_hero_slides INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS can_hide_footer_badge BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS can_intake_photo BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.members.max_hero_slides       IS '물건접수웹페이지 첫 화면 슬라이드 장수';
COMMENT ON COLUMN public.members.can_hide_footer_badge IS 'powered by 공실뉴스 숨김 권한';
COMMENT ON COLUMN public.members.can_intake_photo      IS '접수 폼 사진 첨부 권한';

-- 등급 기본값으로 맞춘다.
UPDATE public.members
   SET max_hero_slides = 1, can_hide_footer_badge = FALSE, can_intake_photo = FALSE
 WHERE role = 'USER';

UPDATE public.members
   SET max_hero_slides = 1, can_hide_footer_badge = FALSE, can_intake_photo = FALSE
 WHERE role = 'REALTOR' AND (plan_type IS NULL OR plan_type = 'free');

UPDATE public.members
   SET max_hero_slides = 3, can_hide_footer_badge = TRUE, can_intake_photo = TRUE
 WHERE role = 'REALTOR' AND plan_type IN ('news_premium', 'study_premium');

UPDATE public.members
   SET max_hero_slides = 3, can_hide_footer_badge = TRUE, can_intake_photo = TRUE
 WHERE role = 'BIZ';

-- 무료 부동산회원에게도 홈페이지를 연다. 문은 열고 안에서 기능으로 나눈다.
UPDATE public.members
   SET can_homepage = TRUE
 WHERE role = 'REALTOR';
