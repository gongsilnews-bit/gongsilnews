-- ============================================
-- 데이터베이스 변경 사항 전체 원복 (Rollback Script)
-- ============================================

-- 1. 1:1 중개의뢰(tenant_inquiries) 테이블 삭제
DROP TABLE IF EXISTS public.tenant_inquiries CASCADE;

-- 2. 홈페이지 설정(homepage_settings) 테이블 스키마 및 데이터 롤백
-- (JSONB -> 기존 개별 컬럼 체제로 원복)

-- 2-1. 기존 컬럼들 다시 추가
ALTER TABLE public.homepage_settings ADD COLUMN IF NOT EXISTS theme_name VARCHAR(100);
ALTER TABLE public.homepage_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.homepage_settings ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE public.homepage_settings ADD COLUMN IF NOT EXISTS site_title VARCHAR(200);
ALTER TABLE public.homepage_settings ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE public.homepage_settings ADD COLUMN IF NOT EXISTS company_intro TEXT;
ALTER TABLE public.homepage_settings ADD COLUMN IF NOT EXISTS design_settings JSONB;

-- 2-2. settings JSONB 데이터에서 기존 개별 컬럼으로 값 복원
UPDATE public.homepage_settings
SET 
  theme_name = settings->>'theme_name',
  logo_url = settings->'header'->>'logo_url',
  favicon_url = settings->'header'->>'favicon_url',
  site_title = settings->'header'->>'site_title',
  contact_phone = settings->'location_map'->>'contact_number',
  company_intro = settings->'company_info_page'->>'greeting_text';

-- 2-3. 새로 추가했던 settings 컬럼 삭제
ALTER TABLE public.homepage_settings DROP COLUMN IF EXISTS settings;
