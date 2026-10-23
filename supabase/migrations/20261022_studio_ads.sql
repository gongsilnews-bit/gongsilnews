-- 스튜디오 기다리는 동안 광고 영상 (2026-10-22 회의 — docs/2026-10-22_studio_wait_ads_plan.md)
--
-- 회원이 AI·영상 만들기를 기다리는 동안 최고관리자가 고른 유튜브 영상을 보여 준다.
-- 처음부터 광고 사업 구조: 광고주 · 심사(검토 대기→승인) · 목표 노출 · 하루 최대 · 광고주 보고서.
-- 숫자(노출·시청·클릭)만 모은다 — 어느 회원이 봤는지는 남기지 않는다.
-- 앱·관리자 화면은 이 표가 없어도 깨지지 않는다 (광고 없음 = 지금처럼 로딩만).

-- 광고주 (공실뉴스 자체 광고도 광고주 하나로)
CREATE TABLE IF NOT EXISTS studio_advertisers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,                 -- 화면에 "광고 · 이름" 으로 나감
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  biz_no TEXT,                        -- 사업자등록번호
  memo TEXT,
  is_house BOOLEAN NOT NULL DEFAULT false, -- 공실뉴스 자체 (광고 표시를 "공실뉴스"로)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE studio_advertisers IS '스튜디오 광고 — 광고주';

INSERT INTO studio_advertisers (name, is_house)
SELECT '공실뉴스', true
WHERE NOT EXISTS (SELECT 1 FROM studio_advertisers WHERE is_house);

-- 광고 (유튜브 영상 하나)
CREATE TABLE IF NOT EXISTS studio_ads (
  id BIGSERIAL PRIMARY KEY,
  advertiser_id BIGINT NOT NULL REFERENCES studio_advertisers(id),
  title TEXT NOT NULL,
  youtube_id TEXT NOT NULL,           -- 유튜브 영상 아이디 (11자)
  link_url TEXT,                      -- [자세히 보기] 누르면 열 주소
  places TEXT[] NOT NULL DEFAULT ARRAY['ai','export','survey'], -- ai = AI 덮개 · export = 영상 내보내기 · survey = 전수조사
  status TEXT NOT NULL DEFAULT 'review' CHECK (status IN ('draft','review','approved','paused','ended')),
  weight INT NOT NULL DEFAULT 1 CHECK (weight BETWEEN 1 AND 100), -- 자주 나오는 정도
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  max_views INT,                      -- 목표 노출 수 (채우면 저절로 멈춤)
  daily_cap INT,                      -- 하루 최대 노출
  memo TEXT,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE studio_ads IS '스튜디오 광고 — 기다리는 동안 보여 줄 유튜브 영상';
CREATE INDEX IF NOT EXISTS studio_ads_status_idx ON studio_ads (status);

-- 숫자 기록 (회원 아이디 없음)
CREATE TABLE IF NOT EXISTS studio_ad_events (
  id BIGSERIAL PRIMARY KEY,
  ad_id BIGINT NOT NULL REFERENCES studio_ads(id) ON DELETE CASCADE,
  place TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('view','watch','click')), -- view = 화면에 나옴 · watch = 본 초 · click = [자세히 보기]
  seconds NUMERIC(8,1),
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE studio_ad_events IS '스튜디오 광고 — 노출·시청·클릭 숫자 (회원 정보 없음)';
CREATE INDEX IF NOT EXISTS studio_ad_events_ad_at_idx ON studio_ad_events (ad_id, at);

-- 서버(서비스 키)만 읽고 쓴다
ALTER TABLE studio_advertisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_ad_events ENABLE ROW LEVEL SECURITY;
