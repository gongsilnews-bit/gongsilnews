-- 요금제 구분 컬럼 (기본값: 'free')
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'free';

-- 요금제 시작일
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS plan_start_date TIMESTAMPTZ;

-- 요금제 종료일
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS plan_end_date TIMESTAMPTZ;

-- 코멘트
COMMENT ON COLUMN public.members.plan_type IS '무료(free), 공실뉴스부동산(news_premium), 공실등록부동산(vacancy_premium)';
