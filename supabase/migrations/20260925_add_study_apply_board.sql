-- 공실스터디 멤버십 신청(/study/apply) 저장용 게시판
--
-- board_posts.board_id 는 boards.board_id 를 참조하므로 신청 내역을 담을 보드가 먼저 있어야 한다.
-- 공실뉴스부동산 신청(newsrealty) 보드와 같은 설정: inquiry 타입 + 목록/읽기 권한 99(관리자 전용)
-- 이라 회원은 자기 신청만, 관리자는 전체를 게시판 관리에서 볼 수 있다.

INSERT INTO boards (board_id, name, subtitle, description, skin_type, columns_count,
                    perm_list, perm_read, perm_write, sort_order, is_active, board_type, max_photos)
SELECT 'study_apply', '공실스터디 멤버십 신청', '공실스터디 멤버십 신청 내역',
       '공실스터디 멤버십 신청 접수 데이터입니다.', 'LIST', 3,
       99, 99, 1, 97, true, 'inquiry', 5
WHERE NOT EXISTS (SELECT 1 FROM boards WHERE board_id = 'study_apply');
