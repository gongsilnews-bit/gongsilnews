-- 1. 새로운 settings 컬럼(JSONB) 추가
ALTER TABLE public.homepage_settings ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- 2. 기존 데이터 마이그레이션 (기존 컬럼의 데이터를 JSON 내부로 이동)
UPDATE public.homepage_settings
SET settings = jsonb_build_object(
  'theme_name', theme_name,
  'header', jsonb_build_object(
    'logo_url', logo_url,
    'favicon_url', favicon_url,
    'site_title', site_title
  ),
  'location_map', jsonb_build_object(
    'contact_number', contact_phone
  ),
  'company_info_page', jsonb_build_object(
    'greeting_text', company_intro
  )
);

-- 3. 불필요해진 기존 컬럼 삭제 (완전한 5개 컬럼 체제로 변경)
ALTER TABLE public.homepage_settings DROP COLUMN IF EXISTS theme_name;
ALTER TABLE public.homepage_settings DROP COLUMN IF EXISTS logo_url;
ALTER TABLE public.homepage_settings DROP COLUMN IF EXISTS favicon_url;
ALTER TABLE public.homepage_settings DROP COLUMN IF EXISTS site_title;
ALTER TABLE public.homepage_settings DROP COLUMN IF EXISTS contact_phone;
ALTER TABLE public.homepage_settings DROP COLUMN IF EXISTS company_intro;
ALTER TABLE public.homepage_settings DROP COLUMN IF EXISTS design_settings; -- (혹시 이전에 만들었다면 삭제)

-- 4. 컬럼 설명 추가
COMMENT ON COLUMN public.homepage_settings.settings IS '헤더, 푸터, 로고, 색상, 테마명 등 모든 홈페이지 설정이 포함된 JSONB';
