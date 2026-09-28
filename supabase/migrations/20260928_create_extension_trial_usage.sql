-- 크롬 확장(공실뉴스 AI 기사 & 블로그·유튜브 작성기) 무료 체험 사용 기록
--
-- 3번 블로그 작성 · 4번 유튜브 대본은 공실뉴스부동산·공실스터디부동산·최고관리자만 무제한이고,
-- 그 외 로그인 회원은 기능별로 매월 3번까지 체험할 수 있다. (1·2번 기사 작성은 누구나 무료라 기록하지 않는다)
-- [AI 블로그 초안 작성]·[AI 유튜브 대본 작성]을 누를 때 한 줄씩 쌓고, 이번 달 줄 수로 남은 횟수를 센다.
-- used_month 는 한국 시간 기준 'YYYY-MM' — 매월 1일에 저절로 다시 3번이 된다.
CREATE TABLE IF NOT EXISTS extension_trial_usage (
  id          BIGSERIAL PRIMARY KEY,
  member_id   UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  feature     TEXT NOT NULL CHECK (feature IN ('blog', 'youtube')),
  used_month  TEXT NOT NULL CHECK (used_month ~ '^[0-9]{4}-[0-9]{2}$'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS extension_trial_usage_member_month_idx
  ON extension_trial_usage (member_id, feature, used_month);

-- 서버(서비스 키)만 읽고 쓴다. 정책을 두지 않아 브라우저에서는 읽거나 고칠 수 없다.
ALTER TABLE extension_trial_usage ENABLE ROW LEVEL SECURITY;
