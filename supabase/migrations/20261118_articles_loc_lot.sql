-- 기사 번지 (2026-11-18 사장님: 단지·빌라 화면 [뉴스]는 번지가 정확히 같은 기사만)
--  loc_lot = "동 번지@위도,경도" (예: "서초동 1338@37.49085,127.02955") — 서버가 기사 좌표로 카카오에서 구해 채운다 (src/utils/articleLot.ts)
--  화면에는 보이지 않는다. 좌표가 바뀌면 뒤의 좌표가 달라져 저절로 다시 구한다
--  Supabase → SQL Editor 에서 실행

ALTER TABLE articles ADD COLUMN IF NOT EXISTS loc_lot text;
