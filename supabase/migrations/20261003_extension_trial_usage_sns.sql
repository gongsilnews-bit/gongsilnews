-- 크롬 확장 무료 체험에 'sns'(페이스북·인스타그램·스레드 3종 작성, gongsilwriter30) 추가
-- 기존 'blog'·'youtube' 기록은 그대로 둔다.
ALTER TABLE extension_trial_usage DROP CONSTRAINT IF EXISTS extension_trial_usage_feature_check;
ALTER TABLE extension_trial_usage
  ADD CONSTRAINT extension_trial_usage_feature_check CHECK (feature IN ('blog', 'sns', 'youtube'));
