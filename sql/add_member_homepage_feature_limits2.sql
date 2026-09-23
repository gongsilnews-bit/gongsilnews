-- 물건접수웹페이지 기능 차등 2차 — 로고 · 첫 화면 영상 · SNS 링크
--
--   can_site_logo    헤더에 로고를 올릴 수 있는가 (무료는 상호 글자만)
--   can_hero_video   첫 화면에 유튜브 영상을 넣을 수 있는가 (무료는 사진까지)
--   can_sns_links    연락처 구역에 SNS 링크를 붙일 수 있는가
--
-- 배경사진 · 테마 색상 · 접수 항목은 일부러 막지 않는다. 무료 페이지가 명함에
-- 박을 수 없을 만큼 초라해지면 아무도 쓰지 않고, 안 쓰면 붙잡아 둘 것도 없다.

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS can_site_logo  BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS can_hero_video BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS can_sns_links  BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.members.can_site_logo  IS '물건접수웹페이지 로고 올리기 권한';
COMMENT ON COLUMN public.members.can_hero_video IS '물건접수웹페이지 첫 화면 유튜브 영상 권한';
COMMENT ON COLUMN public.members.can_sns_links  IS '물건접수웹페이지 SNS 링크 권한';

UPDATE public.members
   SET can_site_logo = FALSE, can_hero_video = FALSE, can_sns_links = FALSE
 WHERE role = 'USER' OR (role = 'REALTOR' AND (plan_type IS NULL OR plan_type = 'free'));

UPDATE public.members
   SET can_site_logo = TRUE, can_hero_video = TRUE, can_sns_links = TRUE
 WHERE role = 'BIZ' OR (role = 'REALTOR' AND plan_type IN ('news_premium', 'study_premium'));
