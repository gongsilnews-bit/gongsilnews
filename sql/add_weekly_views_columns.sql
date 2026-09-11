-- ============================================
-- 공실뉴스 기사 주간/월간 조회수(views_week, views_month) 추가
-- Supabase SQL Editor에서 실행하세요
-- ============================================

ALTER TABLE articles ADD COLUMN IF NOT EXISTS views_week INT DEFAULT 0;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS views_month INT DEFAULT 0;

-- 기존 view_count 값을 초기 주간/월간 조회수 기본값으로 안전하게 세팅
UPDATE articles 
SET views_week = COALESCE(view_count, 0), 
    views_month = COALESCE(view_count, 0)
WHERE views_week IS NULL OR views_week = 0;

CREATE INDEX IF NOT EXISTS idx_articles_views_week ON articles(views_week DESC);
CREATE INDEX IF NOT EXISTS idx_articles_views_month ON articles(views_month DESC);
