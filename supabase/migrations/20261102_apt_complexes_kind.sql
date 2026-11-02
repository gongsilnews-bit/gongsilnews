-- 공실열람 지도 시세 — 오피스텔 추가 · 가볍게 갱신 (2026-11-02 사장님)
--  kind: 'apt' 아파트 / 'offi' 오피스텔 (같은 지번에 둘 다 있는 주상복합도 따로 한 줄씩)
--  fp: 거래 지문 (건수·최근 날짜) — 매일 밤 갱신 때 바뀐 단지만 다시 쓴다 (11-02 DB 가 큰 쓰기에 멈춘 뒤)
--  Supabase → SQL Editor 에서 실행

ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'apt';
ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS fp text;
CREATE INDEX IF NOT EXISTS apt_complexes_kind ON apt_complexes (kind);
