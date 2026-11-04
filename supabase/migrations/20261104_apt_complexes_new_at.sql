-- 공실열람 지도 시세 — NEW 배지 (2026-11-04 사장님: 새로 갱신된 거래는 1주일 동안 오른쪽 위에 NEW)
--  new_at: 새로 신고된 거래가 마지막으로 들어온 때 (매일 밤 갱신이 적는다, 처음 받은 날은 적지 않는다)
--  Supabase → SQL Editor 에서 실행

ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS new_at timestamptz;
