-- 웹 공실관리 [SNS뉴스발행] 1주일 3번 (2026-10-26 사장님)
-- 공실뉴스부동산 회원이 웹에서 공실 하나로 공실뉴스 기사 초안 + 인스타그램·스레드·페이스북 글을 만든다.
-- 한 번 누르면 1번, 회원마다 1주일에 3번 (한국 시간 월요일 0시부터, created_at 으로 센다). 횟수는 extension_trial_usage 에 같이 센다.
ALTER TABLE extension_trial_usage DROP CONSTRAINT IF EXISTS extension_trial_usage_feature_check;
ALTER TABLE extension_trial_usage
  ADD CONSTRAINT extension_trial_usage_feature_check CHECK (feature IN ('blog', 'sns', 'youtube', 'ai_image', 'web_sns_news'));
