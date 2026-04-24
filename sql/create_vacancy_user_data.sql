-- 공실 찜(관심매물) 기록 테이블
CREATE TABLE IF NOT EXISTS public.vacancy_wishlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vacancy_id BIGINT NOT NULL REFERENCES public.vacancies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, vacancy_id)
);

-- 공실 최근 본 매물 기록 테이블
CREATE TABLE IF NOT EXISTS public.vacancy_recent_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vacancy_id BIGINT NOT NULL REFERENCES public.vacancies(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, vacancy_id)
);

-- RLS 활성화
ALTER TABLE public.vacancy_wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacancy_recent_views ENABLE ROW LEVEL SECURITY;

-- 정책: 찜 기록은 본인만 읽고 쓸 수 있음
CREATE POLICY "Users can manage their own wishlist" ON public.vacancy_wishlist
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 정책: 본 기록도 본인만 접근 가능
CREATE POLICY "Users can manage their own recent views" ON public.vacancy_recent_views
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
