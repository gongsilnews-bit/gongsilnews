-- 기사 홍보현황 링크 (2026-10-28 사장님)
--
-- 앱 홈 "내 기사" 카드 — 내 공실뉴스 기사로 쓴 블로그·SNS 글이 어느 채널에 올라가 있는지, 그 글 주소.
-- 공실 홍보현황(vacancy_promos)과 같은 방식: 도우미(크롬 확장)가 발행 순간 잡아 오고(source 'helper'),
-- 못 잡은 것은 회원이 붙여 넣는다(source 'paste').
-- 앱 화면은 이 표가 없어도 깨지지 않는다 (링크 없음 = 연결 전).

CREATE TABLE IF NOT EXISTS article_promos (
  id BIGSERIAL PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,             -- 링크를 단 회원 (기사 쓴 사람)
  channel TEXT NOT NULL CHECK (channel IN ('blog','instagram','threads','facebook','youtube')),
  url TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'paste' CHECK (source IN ('helper','paste')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (article_id, channel)
);
COMMENT ON TABLE article_promos IS '기사 홍보현황 — 내 기사로 쓴 채널별 글 주소';
CREATE INDEX IF NOT EXISTS article_promos_owner_idx ON article_promos (owner_id);

-- 서버(서비스 키)만 읽고 쓴다
ALTER TABLE article_promos ENABLE ROW LEVEL SECURITY;
