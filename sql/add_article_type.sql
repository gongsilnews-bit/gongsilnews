-- 1. 기사(articles) 테이블에 노출 유형(article_type) 컬럼 추가
ALTER TABLE articles ADD COLUMN article_type TEXT DEFAULT 'NORMAL' CHECK (article_type IN ('NORMAL', 'IMPORTANT', 'HEADLINE'));

-- 2. 기존 기사들은 모두 일반(NORMAL)으로 초기화
UPDATE articles SET article_type = 'NORMAL' WHERE article_type IS NULL;

-- 3. 관리자나 클라이언트에서 조회 시 사용할 수 있도록 인덱스 추가 (선택사항이나 성능 향상을 위해)
CREATE INDEX idx_articles_type ON articles(article_type);
