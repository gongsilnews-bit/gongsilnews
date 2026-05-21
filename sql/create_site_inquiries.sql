-- ============================================
-- 공실뉴스 플랫폼 1:1 고객 문의 (Site Inquiries)
-- ============================================

CREATE TABLE IF NOT EXISTS public.site_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    category VARCHAR(50) NOT NULL, -- '매물 등록', 'AI온라인전단지', '제휴/제안', '오류 신고', '기타'
    title VARCHAR(255),
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT '신규'::character varying NOT NULL, -- '신규', '확인중', '답변완료', '보류'
    admin_notes TEXT,
    user_id UUID REFERENCES public.members(id) ON DELETE SET NULL, -- 로그인한 회원 식별
    ip_address VARCHAR(50)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_site_inquiries_status ON public.site_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_site_inquiries_created_at ON public.site_inquiries(created_at DESC);

-- RLS (Row Level Security) 설정
ALTER TABLE public.site_inquiries ENABLE ROW LEVEL SECURITY;

-- 정책: 누구나 문의를 작성할 수 있음
CREATE POLICY "Anyone can create site inquiries" 
ON public.site_inquiries 
FOR INSERT 
WITH CHECK (true);

-- 정책: 최고관리자(ADMIN)만 전체 조회 및 수정 가능
CREATE POLICY "Only admins can manage site inquiries" 
ON public.site_inquiries 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.members 
        WHERE members.id = auth.uid() AND members.role = 'ADMIN'
    )
);
