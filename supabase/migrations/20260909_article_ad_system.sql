-- ========================================================
-- 공실뉴스 기사 하단 작성자 맞춤 광고/배너 시스템 스키마
-- ========================================================

-- 1. 작성자(공실뉴스기자) 전용 배너 보관함 테이블
CREATE TABLE IF NOT EXISTS article_author_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  link_target VARCHAR(20) DEFAULT '_blank',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_author_banners_author ON article_author_banners(author_id);

-- 2. 기사별 광고/배너 매핑 설정 테이블
CREATE TABLE IF NOT EXISTS article_ad_settings (
  article_id UUID PRIMARY KEY,
  author_id UUID NOT NULL,
  ad_type VARCHAR(20) DEFAULT 'DEFAULT', -- 'DEFAULT': 기본형(등록자정보), 'BANNER': 직접배너, 'NONE': 노출안함
  custom_banner_id UUID REFERENCES article_author_banners(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_ad_settings_author ON article_ad_settings(author_id);

-- RLS 정책 설정 (선택적)
ALTER TABLE article_author_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_ad_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for active author banners" ON article_author_banners
  FOR SELECT USING (is_active = true);

CREATE POLICY "Allow public read for article ad settings" ON article_ad_settings
  FOR SELECT USING (true);
