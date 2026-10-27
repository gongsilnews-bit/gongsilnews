-- 공실 홍보현황 링크 (2026-10-27 회의)
--
-- 앱 홈 "내 공실 홍보현황" 카드 — 공실마다 어느 채널에 광고가 올라가 있는지, 그 글 주소.
-- 링크는 공실스튜디오 도우미(크롬 확장)가 발행 순간 잡아 오고(source 'helper'),
-- 못 잡은 것은 회원이 붙여 넣는다(source 'paste').
-- 공실뉴스 기사·매물 페이지는 이 표가 아니라 기사·공실 기록에서 바로 만든다.
-- 앱 화면은 이 표가 없어도 깨지지 않는다 (링크 없음 = 연결 전).

CREATE TABLE IF NOT EXISTS vacancy_promos (
  id BIGSERIAL PRIMARY KEY,
  vacancy_id UUID NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,             -- 링크를 단 회원 (공실 주인)
  channel TEXT NOT NULL CHECK (channel IN ('blog','instagram','threads','facebook','youtube')),
  url TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'paste' CHECK (source IN ('helper','paste')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vacancy_id, channel)
);
COMMENT ON TABLE vacancy_promos IS '공실 홍보현황 — 채널별 광고 글 주소';
CREATE INDEX IF NOT EXISTS vacancy_promos_owner_idx ON vacancy_promos (owner_id);

-- 서버(서비스 키)만 읽고 쓴다
ALTER TABLE vacancy_promos ENABLE ROW LEVEL SECURITY;
