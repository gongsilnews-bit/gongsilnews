-- ============================================
-- 공실뉴스 기사(Articles) DB 테이블 생성
-- Supabase SQL Editor에서 한번에 실행하세요
-- ============================================

-- 1. articles 메인 테이블
CREATE TABLE articles (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_no    BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
  author_id     UUID REFERENCES members(id) ON DELETE SET NULL,
  author_name   TEXT,
  author_email  TEXT,
  status        TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PENDING','APPROVED','REJECTED','DELETED')),
  form_type     TEXT NOT NULL DEFAULT 'NORMAL' CHECK (form_type IN ('NORMAL','CARD_NEWS','GALLERY')),
  section1      TEXT,
  section2      TEXT,
  series        TEXT,
  title         TEXT NOT NULL,
  subtitle      TEXT,
  content       TEXT,
  summary       TEXT,
  thumbnail_url TEXT,
  youtube_url   TEXT,
  is_shorts     BOOLEAN DEFAULT FALSE,
  lat           FLOAT8,
  lng           FLOAT8,
  location_name TEXT,
  view_count    INT DEFAULT 0,
  like_count    INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  is_deleted    BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_section ON articles(section1, section2);
CREATE INDEX idx_articles_author ON articles(author_id);
CREATE INDEX idx_articles_published ON articles(published_at DESC);
CREATE INDEX idx_articles_created ON articles(created_at DESC);

-- 2. article_media 첨부 미디어
CREATE TABLE article_media (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id  UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  media_type  TEXT NOT NULL CHECK (media_type IN ('PHOTO','FILE')),
  url         TEXT NOT NULL,
  filename    TEXT,
  caption     TEXT,
  sort_order  INT DEFAULT 0,
  file_size   INT,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_article_media_article ON article_media(article_id);

-- 3. article_keywords 키워드
CREATE TABLE article_keywords (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id  UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  keyword     TEXT NOT NULL,
  UNIQUE(article_id, keyword)
);

CREATE INDEX idx_article_keywords_article ON article_keywords(article_id);
CREATE INDEX idx_article_keywords_keyword ON article_keywords(keyword);

-- 4. article_relations 관련 기사
CREATE TABLE article_relations (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id      UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  related_id      UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  UNIQUE(article_id, related_id),
  CHECK (article_id != related_id)
);

CREATE INDEX idx_article_relations_article ON article_relations(article_id);

-- 5. RLS 정책
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "공개 기사 읽기" ON articles FOR SELECT USING (status = 'APPROVED' AND is_deleted = FALSE);
CREATE POLICY "본인 기사 수정" ON articles FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "기사 작성" ON articles FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "미디어 읽기" ON article_media FOR SELECT USING (true);
CREATE POLICY "미디어 작성" ON article_media FOR INSERT WITH CHECK (true);
CREATE POLICY "미디어 삭제" ON article_media FOR DELETE USING (true);

CREATE POLICY "키워드 읽기" ON article_keywords FOR SELECT USING (true);
CREATE POLICY "키워드 작성" ON article_keywords FOR INSERT WITH CHECK (true);
CREATE POLICY "키워드 삭제" ON article_keywords FOR DELETE USING (true);

CREATE POLICY "관련기사 읽기" ON article_relations FOR SELECT USING (true);
CREATE POLICY "관련기사 작성" ON article_relations FOR INSERT WITH CHECK (true);
CREATE POLICY "관련기사 삭제" ON article_relations FOR DELETE USING (true);
