-- 공실 릴스: 회원이 올린 동영상 (클립에 사진 대신 영상)
-- 흐름: 브라우저 → reels/upload/ 원본(서명 업로드) → 샌드박스가 세로 1080p H.264 변환본 + 썸네일 → 원본 즉시 삭제
-- 보관: 변환본은 편집하는 동안. 30일 동안 안 쓰면 삭제 (회의 결정 2026-10-06)
--
-- 상태: uploading(올리는 중) → processing(변환 중) → ready(사용 가능) | failed(실패)
CREATE TABLE IF NOT EXISTS reel_media (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id    UUID NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
  member_id     UUID REFERENCES members(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'uploading'
                CHECK (status IN ('uploading', 'processing', 'ready', 'failed')),
  file_name     TEXT,
  original_path TEXT,                     -- reels 버킷 upload/... (변환 후 삭제, null)
  path          TEXT,                     -- reels 버킷 media/<vacancy>/<id>.mp4 (변환본)
  poster_path   TEXT,                     -- reels 버킷 media/<vacancy>/<id>.jpg (썸네일)
  duration      NUMERIC(7, 2),            -- 초
  width         INT,
  height        INT,
  has_audio     BOOLEAN NOT NULL DEFAULT false,
  size_bytes    BIGINT,                   -- 변환본 크기
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ NOT NULL DEFAULT now()   -- 편집 저장·영상 만들기 때 갱신 (30일 미사용 정리 기준)
);

CREATE INDEX IF NOT EXISTS reel_media_vacancy_idx ON reel_media (vacancy_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reel_media_used_idx ON reel_media (last_used_at);

-- 서버(서비스 키)만 읽고 쓴다
ALTER TABLE reel_media ENABLE ROW LEVEL SECURITY;

-- 휴대폰 원본(3분 4K ≈ 1GB)이 올라갈 수 있게 reels 버킷 파일 크기 한도를 1.5GB 로
-- (주의: Supabase 대시보드 Storage → Settings 의 전체 업로드 한도가 이보다 작으면 그쪽도 올려야 한다)
UPDATE storage.buckets SET file_size_limit = 1610612736 WHERE id = 'reels';
