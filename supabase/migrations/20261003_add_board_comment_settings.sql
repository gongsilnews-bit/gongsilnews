-- 게시판별 댓글 사용 여부와 댓글쓰기 권한을 최고관리자가 설정한다.
-- 기존 게시판은 지금까지의 동작을 유지하고, 공지사항만 댓글을 끈다.

ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS comments_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS perm_comment integer NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'boards_perm_comment_range'
       AND conrelid = 'public.boards'::regclass
  ) THEN
    ALTER TABLE public.boards
      ADD CONSTRAINT boards_perm_comment_range
      CHECK (perm_comment BETWEEN 0 AND 5);
  END IF;
END;
$$;

COMMENT ON COLUMN public.boards.comments_enabled IS
  'false이면 게시판 상세에서 댓글 목록과 입력창을 숨기고 서버에서도 댓글 등록을 거부한다';

COMMENT ON COLUMN public.boards.perm_comment IS
  '댓글쓰기 최소 회원 레벨(0 비회원, 1 일반회원, 2 무료부동산, 3 공실스터디, 4 공실뉴스, 5 최고관리자)';

UPDATE public.boards
   SET comments_enabled = false
 WHERE board_id = 'notice';
