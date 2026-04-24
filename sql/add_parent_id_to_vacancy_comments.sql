-- vacancy_comments 테이블 다단계 답글 지원을 위한 parent_id 컬럼 추가
-- Supabase SQL Editor에서 이 쿼리를 실행해주세요.

ALTER TABLE vacancy_comments
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES vacancy_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_vacancy_comments_parent ON vacancy_comments(parent_id);
