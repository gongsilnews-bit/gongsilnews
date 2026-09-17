-- 공실뉴스부동산 파트너 신청 접수 테이블
--
-- 신청 저장은 이 테이블을 1순위로 쓰고, 실패하면 board_posts(newsrealty)로
-- 보조 저장하도록 되어 있다. 그동안 이 테이블이 없어서 모든 신청이 게시판 글
-- 형태로 쌓여 왔다. 테이블을 만들어 정상 경로로 되돌린다.
--
-- sql/create_newsrealty_applications.sql 를 기반으로 하되 두 가지를 고쳤다.
--   1) members.role 은 enum(member_role) 이고 'SUPER_ADMIN' 값이 없어서
--      원본의 정책이 "invalid input value for enum" 오류로 실패한다 → text 캐스팅
--   2) 관리자 정책에 WITH CHECK 를 명시해 FOR ALL 의 쓰기 검사도 통과시킨다

CREATE TABLE IF NOT EXISTS public.newsrealty_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- 신청 회원 정보
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    applicant_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),

    -- 중개사무소 정보
    agency_name VARCHAR(255) NOT NULL,
    agency_address TEXT,
    region_city VARCHAR(50),
    region_district VARCHAR(50),
    region_dong VARCHAR(50),

    -- 신청 서비스 및 내용
    interests TEXT[] DEFAULT '{}',
    memo TEXT,

    -- 상태 관리
    status VARCHAR(30) DEFAULT '신규' NOT NULL,  -- 신규 / 연락완료 / 진행중 / 승인완료 / 반려
    admin_notes TEXT,
    contacted_at TIMESTAMP WITH TIME ZONE,

    -- 알림 발송 여부
    sms_sent BOOLEAN DEFAULT FALSE,
    email_sent BOOLEAN DEFAULT FALSE,
    kakao_sent BOOLEAN DEFAULT FALSE,

    ip_address VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_newsrealty_app_status ON public.newsrealty_applications(status);
CREATE INDEX IF NOT EXISTS idx_newsrealty_app_created_at ON public.newsrealty_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsrealty_app_member ON public.newsrealty_applications(member_id);

ALTER TABLE public.newsrealty_applications ENABLE ROW LEVEL SECURITY;

-- 신청은 비회원도 할 수 있어야 한다
DROP POLICY IF EXISTS "Anyone can submit newsrealty applications" ON public.newsrealty_applications;
CREATE POLICY "Anyone can submit newsrealty applications"
ON public.newsrealty_applications
FOR INSERT
WITH CHECK (true);

-- 최고관리자는 전체 조회/수정
DROP POLICY IF EXISTS "Admins can manage newsrealty applications" ON public.newsrealty_applications;
CREATE POLICY "Admins can manage newsrealty applications"
ON public.newsrealty_applications
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.members m
        WHERE m.id = auth.uid()
          -- role 은 enum 이라 text 로 캐스팅해야 한다 ('SUPER_ADMIN' 은 enum 에 없음)
          AND (upper(m.role::text) = 'ADMIN' OR m.role::text LIKE '%관리자%')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.members m
        WHERE m.id = auth.uid()
          AND (upper(m.role::text) = 'ADMIN' OR m.role::text LIKE '%관리자%')
    )
);

-- 본인 신청 내역 조회
DROP POLICY IF EXISTS "Users can view own newsrealty applications" ON public.newsrealty_applications;
CREATE POLICY "Users can view own newsrealty applications"
ON public.newsrealty_applications
FOR SELECT
USING (member_id = auth.uid());
