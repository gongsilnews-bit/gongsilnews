-- 단지 경계선 (2026-11-16 사장님: 앱 지도에 단지 경계)
--  브이월드 연속지적도(LP_PA_CBND_BUBUN)에서 단지 좌표가 놓인 필지 경계를 한 번 받아 저장해 둔다 — /api/apt-boundary
--  boundary: [[[lng,lat], ...], ...] 바깥 테두리들 (여러 조각이면 여러 개) · 못 찾으면 null 로 두고 boundary_tried_at 만 남겨 30일 동안 다시 안 묻는다
--  Supabase → SQL Editor 에서 실행

ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS boundary jsonb;
ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS boundary_tried_at timestamptz;
