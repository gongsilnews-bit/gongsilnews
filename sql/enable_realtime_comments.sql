-- 공실Talk 실시간 채팅을 위해 댓글 테이블에 Supabase Realtime 활성화
-- Supabase SQL Editor에서 실행하세요

-- article_comments 테이블 Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE article_comments;

-- vacancy_comments 테이블 Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE vacancy_comments;
