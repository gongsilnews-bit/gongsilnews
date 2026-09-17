-- 1:1 문의 게시판: 등록자 연락처/이메일 저장용 컬럼 추가
--
-- 문의는 "글을 남길 당시의 연락처"로 회신해야 하므로 members 를 조인해 그때그때
-- 가져오지 않고 작성 시점의 값을 함께 저장한다.
--  - 회원이 나중에 번호를 바꿔도 당시 남긴 연락처가 남는다
--  - author_id 가 비어 있는 과거 글처럼 회원 연결이 끊겨도 회신할 수 있다
--  - 회원정보에 전화번호가 없는 회원도 폼에서 직접 입력해 채울 수 있다
--
-- 1:1 문의(board_type = 'inquiry') 에서만 입력받는다.

ALTER TABLE board_posts
  ADD COLUMN IF NOT EXISTS author_phone text,
  ADD COLUMN IF NOT EXISTS author_email text;

COMMENT ON COLUMN board_posts.author_phone IS '1:1 문의 작성 시점의 회신용 연락처';
COMMENT ON COLUMN board_posts.author_email IS '1:1 문의 작성 시점의 회신용 이메일';
