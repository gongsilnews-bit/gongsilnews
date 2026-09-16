-- ====================================================
-- 공실뉴스부동산 (Newsrealty) 전용 신청 접수 테이블
-- ====================================================

CREATE TABLE IF NOT EXISTS public.newsrealty_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- 신청 회원 정보 (members 테이블 연동)
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    applicant_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),

    -- 중개사무소 정보
    agency_name VARCHAR(255) NOT NULL,
    agency_address TEXT,
    region_city VARCHAR(50),      -- 시/도 (예: 서울특별시)
    region_district VARCHAR(50),  -- 구/군 (예: 강남구)
    region_dong VARCHAR(50),      -- 읍/면/동 (예: 역삼동)

    -- 신청 서비스 및 내용
    interests TEXT[] DEFAULT '{}',  -- 관심 서비스 목록 (['기사작성', '유튜브쇼츠', '블로그', '인스타그램', '쓰레드'])
    memo TEXT,                      -- 신청자 추가 요청사항

    -- 상태 관리
    status VARCHAR(30) DEFAULT '신규' NOT NULL, -- '신규', '연락완료', '진행중', '승인완료', '반려'
    admin_notes TEXT,                          -- 최고관리자 내부 메모
    contacted_at TIMESTAMP WITH TIME ZONE,     -- 연락 일시

    -- 알림 발송 여부 기록
    sms_sent BOOLEAN DEFAULT FALSE,
    email_sent BOOLEAN DEFAULT FALSE,
    kakao_sent BOOLEAN DEFAULT FALSE,

    -- 접속 정보
    ip_address VARCHAR(50)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_newsrealty_app_status ON public.newsrealty_applications(status);
CREATE INDEX IF NOT EXISTS idx_newsrealty_app_created_at ON public.newsrealty_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsrealty_app_member ON public.newsrealty_applications(member_id);

-- RLS (Row Level Security) 설정
ALTER TABLE public.newsrealty_applications ENABLE ROW LEVEL SECURITY;

-- 정책: 누구나 본인의 신청서 등록 가능
CREATE POLICY "Anyone can submit newsrealty applications" 
ON public.newsrealty_applications 
FOR INSERT 
WITH CHECK (true);

-- 정책: 최고관리자는 전체 조회 및 수정 가능
CREATE POLICY "Admins can manage newsrealty applications" 
ON public.newsrealty_applications 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.members 
        WHERE members.id = auth.uid() AND members.role IN ('ADMIN', 'SUPER_ADMIN')
    )
);

-- 정책: 본인은 자신의 신청 내역 조회 가능
CREATE POLICY "Users can view own newsrealty applications" 
ON public.newsrealty_applications 
FOR SELECT 
USING (
    member_id = auth.uid()
);
