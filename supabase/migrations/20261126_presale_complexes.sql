-- 분양 단지 (2026-11-26 사장님: 신축/분양 지도에 청약홈 분양 정보 — 아파트 단지처럼 보라색으로)
--  출처: 청약홈(한국부동산원) 공공데이터 ApplyhomeInfoDetailSvc — 아파트 · 오피스텔/도시형 · 무순위(잔여세대)
--  서버 cron(/api/cron/presale)이 하루 한 번 받아 채운다. 좌표는 카카오 주소 검색(못 찾으면 비워 두고 지도에 안 띄움 — 추측 금지)
--  청약이 끝나고 3개월 지난 단지는 지도에서 뺀다 (화면 쪽 조건, 표에는 남김)
--  Supabase → SQL Editor 에서 실행

CREATE TABLE IF NOT EXISTS presale_complexes (
  id text PRIMARY KEY,                 -- "apt:2026000598" · "ofc:2026950097" · "rem:2026910294" (종류:공고번호)
  kind text NOT NULL,                  -- apt 아파트 · ofc 오피스텔/도시형/생활숙박/민간임대 · rem 무순위·잔여세대
  house_manage_no text NOT NULL,
  pblanc_no text NOT NULL,
  name text NOT NULL,                  -- 주택명
  address text,                        -- 공급 위치 (청약홈 글자 그대로)
  sido text,                           -- 주소 앞부분에서 (서울특별시 …)
  house_type text,                     -- APT · 오피스텔 · 도시형생활주택 · 무순위 …
  supply_kind text,                    -- 민영 · 국민 …
  total_units int,                     -- 공급 세대수
  notice_date date,                    -- 모집공고일
  special_start date, special_end date,   -- 특별공급
  rank1_date date, rank2_date date,       -- 1순위 · 2순위 (해당지역 기준)
  receipt_start date, receipt_end date,   -- 청약 접수 전체 (처음~끝)
  winner_date date,                    -- 당첨자 발표
  contract_start date, contract_end date, -- 계약
  move_in_ym text,                     -- 입주 예정 "202909"
  builder text,                        -- 시공사
  developer text,                      -- 시행사
  notice_url text,                     -- 청약홈 모집공고
  homepage text,
  phone text,                          -- 분양 문의
  types jsonb NOT NULL DEFAULT '[]',   -- 평형 [{ type:"84A", area:84.9076, supply_area:107.67, units:22, price:42440(만원) }]
  lat double precision,
  lng double precision,
  geo_tried_at timestamptz,            -- 좌표 찾아본 때 (못 찾으면 lat 비어 있음)
  raw jsonb,                           -- 청약홈 원본 (나중에 칸 더 쓸 때)
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS presale_complexes_geo ON presale_complexes (lat, lng);
CREATE INDEX IF NOT EXISTS presale_complexes_end ON presale_complexes (receipt_end);
ALTER TABLE presale_complexes ENABLE ROW LEVEL SECURITY; -- 서버(서비스 키)만 읽고 쓴다
