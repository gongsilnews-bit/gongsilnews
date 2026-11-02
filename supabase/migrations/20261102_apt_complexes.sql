-- 공실열람 지도 [아파트 시세] (2026-11-02 사장님: 호갱노노처럼 지도 위에 단지 시세)
--  단지 하나 = 한 줄. 국토부 아파트 매매 실거래가(최근 12개월)를 시군구마다 매일 밤 받아 단지별로 묶는다.
--  - 위치: 카카오 지번 주소 검색 (한 번 찾으면 다시 안 찾는다)
--  - 공급면적(평형): 건축물대장 전유공용면적 = 전유 + 주거공용(복도·계단). 못 찾으면 비워 두고 전용㎡로 표시
--  - 공공 자료라 누구나 읽기만, 쓰기는 서버(서비스 키)만
--  Supabase → SQL Editor 에서 실행

CREATE TABLE IF NOT EXISTS apt_complexes (
  id text PRIMARY KEY,                 -- 시군구코드:법정동:지번 (예: 11680:대치동:1014-3)
  lawd_cd text NOT NULL,               -- 시군구 5자리
  dong text NOT NULL,                  -- 법정동 이름
  jibun text NOT NULL,
  name text NOT NULL,                  -- 실거래 단지명
  build_year int,
  lat double precision,
  lng double precision,
  bcode text,                          -- 법정동 코드 10자리 (카카오)
  geo_tried_at timestamptz,
  supply_map jsonb,                    -- {"97.35": 114.83} 전용㎡ → 공급㎡
  supply_tried_at timestamptz,
  trades jsonb NOT NULL DEFAULT '[]',  -- 최근 12개월 매매 [{a 전용㎡, p 만원, d 날짜, f 층}] 최근 것 먼저
  areas jsonb NOT NULL DEFAULT '[]',   -- 면적별 요약 [{a, s 공급㎡|null, n 건수, p 최근가, d 최근 날짜, f 층}]
  rep_area numeric,                    -- 지도에 보일 대표 면적 (거래가 가장 많은 면적)
  rep_supply numeric,
  rep_price int,                       -- 대표 면적 최근 거래가 (만원)
  rep_date date,
  trade_count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS apt_complexes_lat_lng ON apt_complexes (lat, lng);
CREATE INDEX IF NOT EXISTS apt_complexes_lawd ON apt_complexes (lawd_cd);

ALTER TABLE apt_complexes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS apt_complexes_read ON apt_complexes;
CREATE POLICY apt_complexes_read ON apt_complexes FOR SELECT USING (true);
