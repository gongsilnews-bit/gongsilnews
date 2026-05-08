-- 비즈니스 회원(업체 정보) 테이블 생성
CREATE TABLE IF NOT EXISTS public.business_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  ceo_name TEXT NOT NULL,
  business_type TEXT, -- 업종 (예: 인테리어, 청소, 법무사 등)
  contact_number TEXT,
  address TEXT,
  biz_num TEXT,
  biz_cert_url TEXT,
  description TEXT,
  logo_url TEXT,
  status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  rejection_reason TEXT,
  lat NUMERIC,
  lng NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS 활성화
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

-- 누구나 승인된 업체 정보를 조회할 수 있음
CREATE POLICY "Anyone can view approved business profiles" 
  ON public.business_profiles FOR SELECT 
  USING (status = 'APPROVED' OR auth.uid() = user_id);

-- 본인 프로필은 본인이 수정 가능
CREATE POLICY "Users can manage their own business profile" 
  ON public.business_profiles FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
