-- 포토DB "삭제"는 실제 삭제가 아니라 보관함 목록에서만 숨긴다.
-- 기사 본문·대표사진에서 쓰는 사진과 스토리지 파일은 그대로 둔다.
ALTER TABLE article_media
  ADD COLUMN IF NOT EXISTS hidden_from_library BOOLEAN NOT NULL DEFAULT FALSE;
