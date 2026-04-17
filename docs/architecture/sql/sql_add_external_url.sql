-- board_posts 테이블에 external_url 컬럼 추가
-- Supabase SQL Editor에서 실행하세요

ALTER TABLE board_posts 
ADD COLUMN IF NOT EXISTS external_url TEXT;

COMMENT ON COLUMN board_posts.external_url IS '외부 참조 링크 URL (클릭 시 외부 사이트로 이동)';
