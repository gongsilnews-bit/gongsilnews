-- 1:1 문의 게시판: 첨부 가능한 사진 장수를 관리자가 조절할 수 있게 한다
--
-- 상한은 5장이고, 0 으로 두면 사진 첨부를 받지 않는다.
-- 1:1 문의(board_type = 'inquiry') 게시판에서만 쓰인다.

ALTER TABLE boards
  ADD COLUMN IF NOT EXISTS max_photos integer NOT NULL DEFAULT 5;

ALTER TABLE boards
  DROP CONSTRAINT IF EXISTS boards_max_photos_range;

ALTER TABLE boards
  ADD CONSTRAINT boards_max_photos_range CHECK (max_photos >= 0 AND max_photos <= 5);

COMMENT ON COLUMN boards.max_photos IS '1:1 문의 사진 첨부 허용 장수 (0~5, 0이면 첨부 없음)';
