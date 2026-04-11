-- ============================================
-- 공실뉴스 게시판(Board) DB 테이블 생성
-- 4개 테이블: boards, board_posts, board_attachments, board_comments
-- Supabase SQL Editor에서 한번에 실행하세요
-- ============================================

-- 1. boards 게시판 정의
CREATE TABLE boards (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id      TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  subtitle      TEXT,                           -- 보조 타이틀
  description   TEXT,
  categories    TEXT,                           -- 분류 카테고리 (쉼표 구분: "드론,아파트,빌딩")
  skin_type     TEXT NOT NULL DEFAULT 'FILE_THUMB'
                CHECK (skin_type IN ('FILE_THUMB','VIDEO_ALBUM','LIST','GALLERY')),
  columns_count INT DEFAULT 3,                 -- 앨범형 가로 갯수 (3칸, 4칸 등)
  perm_list     INT NOT NULL DEFAULT 1,
  perm_read     INT NOT NULL DEFAULT 5,
  perm_write    INT NOT NULL DEFAULT 9,
  sort_order    INT DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_boards_board_id ON boards(board_id);

-- 2. board_posts 게시글
CREATE TABLE board_posts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_no         BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
  board_id        TEXT NOT NULL REFERENCES boards(board_id) ON DELETE CASCADE,
  author_id       UUID REFERENCES members(id) ON DELETE SET NULL,
  author_name     TEXT,
  title           TEXT NOT NULL,
  content         TEXT,
  thumbnail_url   TEXT,
  youtube_url     TEXT,
  drive_url       TEXT,                       -- 구글 드라이브 다운로드 링크
  drive_label     TEXT,                       -- 링크 표시명 (예: "참고자료 링크")
  view_count      INT DEFAULT 0,
  download_count  INT DEFAULT 0,
  comment_count   INT DEFAULT 0,
  is_notice       BOOLEAN DEFAULT FALSE,
  is_deleted      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_board_posts_board ON board_posts(board_id);
CREATE INDEX idx_board_posts_author ON board_posts(author_id);
CREATE INDEX idx_board_posts_created ON board_posts(created_at DESC);

-- 3. board_attachments 다중 첨부파일
CREATE TABLE board_attachments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     UUID NOT NULL REFERENCES board_posts(id) ON DELETE CASCADE,
  file_url    TEXT NOT NULL,
  file_name   TEXT NOT NULL,
  file_size   INT,
  file_type   TEXT,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_board_attachments_post ON board_attachments(post_id);

-- 4. board_comments 댓글
CREATE TABLE board_comments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     UUID NOT NULL REFERENCES board_posts(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES members(id) ON DELETE SET NULL,
  author_name TEXT,
  content     TEXT NOT NULL,
  parent_id   UUID REFERENCES board_comments(id) ON DELETE CASCADE,
  is_deleted  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_board_comments_post ON board_comments(post_id);
CREATE INDEX idx_board_comments_parent ON board_comments(parent_id);

-- 5. RLS 정책
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "게시판 읽기" ON boards FOR SELECT USING (is_active = TRUE);
CREATE POLICY "게시판 관리" ON boards FOR ALL USING (true);

CREATE POLICY "게시글 읽기" ON board_posts FOR SELECT USING (is_deleted = FALSE);
CREATE POLICY "게시글 작성" ON board_posts FOR INSERT WITH CHECK (true);
CREATE POLICY "게시글 수정" ON board_posts FOR UPDATE USING (true);
CREATE POLICY "게시글 삭제" ON board_posts FOR DELETE USING (true);

CREATE POLICY "첨부파일 읽기" ON board_attachments FOR SELECT USING (true);
CREATE POLICY "첨부파일 작성" ON board_attachments FOR INSERT WITH CHECK (true);
CREATE POLICY "첨부파일 삭제" ON board_attachments FOR DELETE USING (true);

CREATE POLICY "댓글 읽기" ON board_comments FOR SELECT USING (is_deleted = FALSE);
CREATE POLICY "댓글 작성" ON board_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "댓글 수정" ON board_comments FOR UPDATE USING (true);
CREATE POLICY "댓글 삭제" ON board_comments FOR DELETE USING (true);

-- 6. 기본 게시판 5개 삽입
INSERT INTO boards (board_id, name, description, skin_type, perm_list, perm_read, perm_write, sort_order) VALUES
  ('doc',    '계약서/양식', '부동산 계약서외',       'FILE_THUMB',  1, 5, 9, 1),
  ('sound',  '음원',       '유튜브 전용 음원',      'VIDEO_ALBUM', 1, 5, 9, 2),
  ('design', '디자인',     '부동산 마케팅 디자인',    'FILE_THUMB',  1, 5, 9, 3),
  ('app',    'App(앱)',    '부동산 마케팅 앱',       'FILE_THUMB',  1, 5, 9, 4),
  ('drone',  '드론영상',   '드론 영상 전용 게시판',   'VIDEO_ALBUM', 1, 5, 9, 5);
