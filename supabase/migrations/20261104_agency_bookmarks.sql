-- 공실열람 지도 부동산 찜(★) (2026-11-04 사장님: 공실·기사·부동산 다 찜하기)
--  Supabase → SQL Editor 에서 실행
CREATE TABLE IF NOT EXISTS agency_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, agency_id)
);
CREATE INDEX IF NOT EXISTS agency_bookmarks_user ON agency_bookmarks (user_id);

-- 단지 찜(★) — 아파트·오피스텔·빌라 단지 (complex_id = apt_complexes.id)
CREATE TABLE IF NOT EXISTS complex_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  complex_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, complex_id)
);
CREATE INDEX IF NOT EXISTS complex_bookmarks_user ON complex_bookmarks (user_id);
