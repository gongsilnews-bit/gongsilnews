-- 단지 번지 목록 (2026-11-22 사장님: 공실·기사는 주소에 맞게 단지에 — 큰 단지는 번지 여러 개를 한 단지로)
--  단지의 대표 번지는 apt_complexes.jibun. 여기에는 건축물대장 "부속지번"(딸린 번지)만 둔다
--  예: 압구정 현대아파트(압구정동 481) → 481-1, 482
--  서버가 필요한 단지만 한 번씩 받아 채운다 (src/utils/complexLots.ts). lots_tried_at = 받아 본 때
--  이 SQL 전에도 사이트는 돌아간다(대표 번지만으로 맞춤)
--  Supabase → SQL Editor 에서 실행

CREATE TABLE IF NOT EXISTS complex_lots (
  complex_id text NOT NULL,       -- apt_complexes.id
  lawd_cd text NOT NULL,          -- 시군구 코드 5자리
  dong text NOT NULL,             -- 법정동 이름
  jibun text NOT NULL,            -- 번지 ("481-1", "산52-6")
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lawd_cd, dong, jibun, complex_id)
);
CREATE INDEX IF NOT EXISTS complex_lots_lot ON complex_lots (dong, jibun);
CREATE INDEX IF NOT EXISTS complex_lots_complex ON complex_lots (complex_id);
ALTER TABLE complex_lots ENABLE ROW LEVEL SECURITY; -- 서버(서비스 키)만 읽고 쓴다

ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS lots_tried_at timestamptz;
