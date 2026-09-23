-- 기사 광고 권한 2종을 회원에게 붙인다.
--
-- 등급(요금제)은 가입·승인·요금제 변경 때 기본값을 내려줄 뿐이고,
-- 실제 판정은 언제나 이 두 컬럼을 본다. 그래야 최고관리자가 등급과
-- 상관없이 한 사람씩 열고 닫을 수 있다.
--
--   can_article_banner         기사에 내 배너광고를 붙일 수 있는가
--   can_article_vacancy_banner 기사에 내 공실(추천 공실 카드)을 붙일 수 있는가

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS can_article_banner BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS can_article_vacancy_banner BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.members.can_article_banner IS '기사 배너광고 권한 (등급 기본값이 내려오고, 최고관리자가 개별로 덮어쓴다)';
COMMENT ON COLUMN public.members.can_article_vacancy_banner IS '기사 공실배너 권한 (등급 기본값이 내려오고, 최고관리자가 개별로 덮어쓴다)';

-- 오픈 전이라 지켜야 할 예외가 없다. 기존 회원을 전부 등급 기본값으로 맞춘다.
-- (관리자 화면의 [기존 회원에게 소급 적용] 을 누르는 것과 같은 일이다)

UPDATE public.members SET can_article_banner = FALSE, can_article_vacancy_banner = FALSE
 WHERE role = 'USER';

UPDATE public.members SET can_article_banner = FALSE, can_article_vacancy_banner = FALSE
 WHERE role = 'REALTOR' AND (plan_type IS NULL OR plan_type = 'free');

UPDATE public.members SET can_article_banner = TRUE, can_article_vacancy_banner = TRUE
 WHERE role = 'REALTOR' AND plan_type IN ('news_premium', 'study_premium');

UPDATE public.members SET can_article_banner = TRUE, can_article_vacancy_banner = FALSE
 WHERE role = 'BIZ';
