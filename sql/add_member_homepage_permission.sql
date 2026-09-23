-- 물건접수 홈페이지 권한을 회원에게 붙인다.
--
-- 지금까지는 요금제 이름으로만 열렸다(news_premium · study_premium · biz_premium).
-- 이제 이 칸이 주인이고, 등급은 기본값을 내려줄 뿐이다.
-- 다만 요금제로 열린 사람은 요금제가 끝나면 그대로 닫힌다 — 어제 정한 규칙이다.

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS can_homepage BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.members.can_homepage IS '물건접수 홈페이지 권한 (등급 기본값이 내려오고, 최고관리자가 개별로 덮어쓴다)';

-- 지금 열려 있는 사람과 똑같이 맞춘다. 이 SQL 하나로 동작이 달라지지 않는다.
UPDATE public.members SET can_homepage = FALSE
 WHERE role = 'USER';

UPDATE public.members SET can_homepage = FALSE
 WHERE role = 'REALTOR' AND (plan_type IS NULL OR plan_type = 'free');

UPDATE public.members SET can_homepage = TRUE
 WHERE role = 'REALTOR' AND plan_type IN ('news_premium', 'study_premium');

UPDATE public.members SET can_homepage = TRUE
 WHERE role = 'BIZ';
