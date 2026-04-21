-- 회원 테이블(members)에 부동산 홈페이지(템플릿) 운영 및 유료회원 통제를 위한 컬럼 추가

-- 1. 부동산 전용 서브도메인 (예: happy -> happy.gongsilnews.com)
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE DEFAULT NULL;

-- 2. 요금제 등급 (예: FREE, PRO_MONTHLY, PRO_YEARLY, ADMIN)
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'FREE';

-- 3. 요금제 만료일 (이 날짜가 지나면 홈페이지 접속 불가 상태로 전환)
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ DEFAULT NULL;

-- 4. 템플릿 테마 선택 (예: modern_dark, classic_light, luxury_gold)
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS template_id TEXT DEFAULT 'modern_light';

-- 5. 결제 상태 (활성 여부 모니터링: ACTIVE, EXPIRED, CANCELLED)
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'EXPIRED';

-- 인덱스 추가 (미들웨어에서의 서브도메인 검색 속도 최적화)
CREATE INDEX IF NOT EXISTS idx_members_subdomain ON public.members (subdomain);
