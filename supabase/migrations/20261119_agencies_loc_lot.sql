-- 중개사무소 번지 (2026-11-19 사장님: 단지 화면 [부동산] = 단지와 번지가 같은 입점부동산)
--  loc_lot = "동 번지@위도,경도" (예: "서초동 1362-10@37.48563,127.03252") — 서버가 사무소 좌표로 카카오에서 구해 채운다 (src/utils/complexAgencies.ts)
--  화면에는 보이지 않는다. 사무소 좌표가 바뀌면 뒤의 좌표가 달라져 저절로 다시 구한다
--  이 칸이 없어도 입점부동산은 나온다(그때그때 구함). 있으면 한 번 구한 번지를 저장해 빨라진다
--  Supabase → SQL Editor 에서 실행

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS loc_lot text;
