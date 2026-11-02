-- 공실열람 지도 [아파트 시세] 상세 창 (2026-11-02 사장님: 호갱노노 구성처럼 크게)
--  rents: 전월세 실거래 최근 36개월 [{a 전용㎡, dep 보증금 만원, m 월세 만원, d 날짜, f 층}] 최근 것 먼저
--  unit_map: 전용㎡별 세대수 {"84.97": 120} (건축물대장 전유부 호수 세기)
--  info: 단지 기본정보 (총괄표제부·표제부·공동주택 기본정보) — 세대수·준공·용적률·건폐율·최고층·난방·계단식·주차
--  Supabase → SQL Editor 에서 실행

ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS rents jsonb NOT NULL DEFAULT '[]';
ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS unit_map jsonb;
ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS info jsonb;
ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS info_tried_at timestamptz;
