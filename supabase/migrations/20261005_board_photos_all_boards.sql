-- 사진 첨부 장수(max_photos)를 1:1 문의뿐 아니라 모든 게시판 설정에서 쓰게 한다.
--
-- 컬럼이 처음 생길 때 DEFAULT 5 로 모든 게시판에 5가 들어가 있다.
-- 이대로 두면 자료실(드론영상·계약서 등)에도 사진 칸이 갑자기 생기므로,
-- 1:1 문의가 아닌 게시판은 "사용 안 함"(0)으로 되돌리고 새 게시판의 기본값도 0으로 바꾼다.
-- 필요한 게시판(스터디Q&A·자유게시판 등)은 관리자 > 게시판 수정에서 장수를 고른다.

UPDATE boards
   SET max_photos = 0
 WHERE board_type IS DISTINCT FROM 'inquiry';

ALTER TABLE boards
  ALTER COLUMN max_photos SET DEFAULT 0;

COMMENT ON COLUMN boards.max_photos IS '게시판 사진 첨부 허용 장수 (0~5, 0이면 첨부 없음). 사진은 webp 로 변환해 저장한다';
