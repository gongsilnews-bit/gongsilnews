-- ================================================
-- Banner Management System - Database Schema
-- Run this SQL in Supabase SQL Editor
-- ================================================

-- 1. banners 테이블
CREATE TABLE IF NOT EXISTS public.banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  link_target VARCHAR(10) DEFAULT '_blank',
  placement_code VARCHAR(30) NOT NULL,
  device_type VARCHAR(10) DEFAULT 'ALL',
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  margin_top INT DEFAULT 0,
  margin_bottom INT DEFAULT 0,
  sort_order INT DEFAULT 0,
  auto_rotate BOOLEAN DEFAULT false,
  rotate_interval INT DEFAULT 5,
  click_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. banner_clicks 로그 테이블
CREATE TABLE IF NOT EXISTS public.banner_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  banner_id UUID REFERENCES public.banners(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT
);

-- 3. 인덱스
CREATE INDEX IF NOT EXISTS idx_banners_placement ON public.banners(placement_code);
CREATE INDEX IF NOT EXISTS idx_banners_active ON public.banners(is_active);
CREATE INDEX IF NOT EXISTS idx_banner_clicks_banner_id ON public.banner_clicks(banner_id);
CREATE INDEX IF NOT EXISTS idx_banner_clicks_date ON public.banner_clicks(clicked_at);

-- 4. RLS 정책 (공개 읽기, 관리자만 수정)
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banner_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banners_public_read" ON public.banners FOR SELECT USING (true);
CREATE POLICY "banners_admin_all" ON public.banners FOR ALL USING (
  EXISTS (SELECT 1 FROM public.members WHERE id = auth.uid() AND role = 'ADMIN')
);

CREATE POLICY "banner_clicks_public_insert" ON public.banner_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "banner_clicks_admin_read" ON public.banner_clicks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.members WHERE id = auth.uid() AND role = 'ADMIN')
);
