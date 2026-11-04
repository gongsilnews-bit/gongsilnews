-- 우리동네부동산 지도·찜 알림 — 회원 10만 명이어도 빠르게 (2026-11-04)
--  지도는 "지금 보이는 범위"로만 묻는다 → 위치 색인 / 알림은 "그 사무소·단지를 찜한 사람"만 찾는다 → 찜 색인
--  Supabase → SQL Editor 에서 실행 (이미 있으면 건너뛴다)
CREATE INDEX IF NOT EXISTS articles_map_geo ON articles (lat, lng) WHERE status = 'APPROVED' AND is_deleted = false AND lat IS NOT NULL;
CREATE INDEX IF NOT EXISTS agencies_map_geo ON agencies (lat, lng) WHERE status = 'APPROVED' AND lat IS NOT NULL;
CREATE INDEX IF NOT EXISTS agency_bookmarks_agency ON agency_bookmarks (agency_id);
CREATE INDEX IF NOT EXISTS complex_bookmarks_complex ON complex_bookmarks (complex_id);
CREATE INDEX IF NOT EXISTS vacancies_owner_active ON vacancies (owner_id) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS vacancies_complex_active ON vacancies (complex_id) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS articles_author_approved ON articles (author_id) WHERE status = 'APPROVED' AND is_deleted = false;
CREATE INDEX IF NOT EXISTS apt_complexes_geo ON apt_complexes (lat, lng);
