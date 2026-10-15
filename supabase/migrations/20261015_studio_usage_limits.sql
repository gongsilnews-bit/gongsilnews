-- 공실뉴스 스튜디오 이용 횟수 (2026-10-15 회의 결정)
--
-- 블로그(SNS뉴스발행) 한 달 기본 횟수는 등급으로 정한다 (src/utils/studioUsage.ts):
--   일반회원 0 · 무료부동산 3 · 공실스터디부동산·비즈니스회원 무제한(하루 20건) · 최고관리자 무제한
-- 최고관리자는 회원관리 > 회원 상세에서 회원마다 따로 정할 수 있다.
--   members.studio_blog_limit: NULL = 등급 기본, -1 = 무제한, 0 이상 = 한 달 n회
ALTER TABLE members ADD COLUMN IF NOT EXISTS studio_blog_limit INT;
COMMENT ON COLUMN members.studio_blog_limit IS '스튜디오 블로그 한 달 횟수. NULL=등급 기본, -1=무제한, 0이상=월 n회';

-- 사용 기록은 크롬 확장 무료 체험 기록을 함께 쓴다 (확장과 앱이 같은 횟수를 나눠 쓴다).
--   스튜디오는 "이번 달 공실 하나 = 1회"라 공실 번호를 남긴다. 확장 기록은 vacancy_id 가 비어 있다.
--   유료 회원도 하루 안전 상한(계정 보호)을 세기 위해 기록한다.
ALTER TABLE extension_trial_usage ADD COLUMN IF NOT EXISTS vacancy_id TEXT;
ALTER TABLE extension_trial_usage ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'extension';

-- AI 이미지(하루 10장, 계정 보호용)
ALTER TABLE extension_trial_usage DROP CONSTRAINT IF EXISTS extension_trial_usage_feature_check;
ALTER TABLE extension_trial_usage
  ADD CONSTRAINT extension_trial_usage_feature_check CHECK (feature IN ('blog', 'sns', 'youtube', 'ai_image'));

CREATE INDEX IF NOT EXISTS extension_trial_usage_member_created_idx
  ON extension_trial_usage (member_id, feature, created_at);
