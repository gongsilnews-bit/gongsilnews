-- ==============================================================================
-- 마케팅 통합 프로젝트 보관 테이블 (marketing_projects)
-- 건물외관 리모델링(remodeling), 홈인테리어(home-interior), AI스튜디오(studio), 매물보고서(report)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.marketing_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT,
    app_type VARCHAR(50) NOT NULL, -- 'studio' | 'remodeling' | 'home-interior' | 'report'
    title TEXT NOT NULL,
    thumbnail_url TEXT,
    clip_count INTEGER DEFAULT 0,
    project_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 설정
CREATE INDEX IF NOT EXISTS idx_marketing_projects_user_id ON public.marketing_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_projects_app_type ON public.marketing_projects(app_type);
CREATE INDEX IF NOT EXISTS idx_marketing_projects_updated_at ON public.marketing_projects(updated_at DESC);

-- RLS 정책 설정
ALTER TABLE public.marketing_projects ENABLE ROW LEVEL SECURITY;

-- 1. 내 프로젝트 조회 (또는 관리자 조회)
CREATE POLICY "Users can select own marketing projects" 
ON public.marketing_projects FOR SELECT 
USING (
    auth.uid() = user_id 
    OR EXISTS (
        SELECT 1 FROM public.members 
        WHERE id = auth.uid() AND (role = 'ADMIN' OR role = '최고관리자')
    )
);

-- 2. 내 프로젝트 생성
CREATE POLICY "Users can insert own marketing projects" 
ON public.marketing_projects FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. 내 프로젝트 수정
CREATE POLICY "Users can update own marketing projects" 
ON public.marketing_projects FOR UPDATE 
USING (auth.uid() = user_id);

-- 4. 내 프로젝트 삭제
CREATE POLICY "Users can delete own marketing projects" 
ON public.marketing_projects FOR DELETE 
USING (auth.uid() = user_id);
