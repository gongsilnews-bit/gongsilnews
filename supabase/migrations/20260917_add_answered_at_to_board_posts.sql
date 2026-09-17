-- 1:1 문의 상태(신규/답변완료)를 DB에서 바로 거를 수 있게 한다
--
-- 기존에는 "관리자 답변이 달렸는가"를 판정하려고 문의 전체와 댓글 전체를 읽어
-- 서버 메모리에서 계산했다. 문의가 쌓이면 목록이 1000건에서 조용히 잘리고
-- 검색도 반쪽이 된다. 답변 시각을 글에 직접 기록해 인덱스로 거른다.
--   answered_at IS NULL  → 신규
--   answered_at IS NOT NULL → 답변완료
-- 작성자 본인이 다시 질문하면 NULL 로 되돌려 다시 신규가 된다.

ALTER TABLE board_posts
  ADD COLUMN IF NOT EXISTS answered_at timestamptz;

-- 기존 문의 채우기: 작성자 본인이 아닌 사람의 댓글이 있으면 답변완료로 본다
UPDATE board_posts p
SET answered_at = sub.last_at
FROM (
  SELECT c.post_id, MAX(c.created_at) AS last_at
  FROM board_comments c
  JOIN board_posts bp ON bp.id = c.post_id
  WHERE bp.board_id = 'inquiry'
    AND COALESCE(c.is_deleted, false) = false
    AND (c.author_id IS NULL OR c.author_id IS DISTINCT FROM bp.author_id)
  GROUP BY c.post_id
) sub
WHERE p.id = sub.post_id
  AND p.answered_at IS NULL;

-- 목록 조회 패턴(게시판 + 상태 + 최신순) 전용 인덱스
CREATE INDEX IF NOT EXISTS board_posts_inquiry_status_idx
  ON board_posts (board_id, answered_at, created_at DESC);

COMMENT ON COLUMN board_posts.answered_at IS '1:1 문의 답변 시각 (NULL이면 미답변)';
