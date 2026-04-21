-- 부동산 회원의 등록 건수 한도를 통제하는 컬럼 (관리자가 숫자를 직접 수정 가능하도록 설계)

-- 1. 부동산별 공실/매물 최대 등록 가능 건수 (기본 요금제 기준: 5건)
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS max_vacancies INT DEFAULT 5;

-- 2. 부동산별 뉴스 기사 월 최대 작성 가능 건수 (기본 요금제는 작성 불가이므로 0건)
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS max_articles_per_month INT DEFAULT 0;

-- 3. 이번 달에 작성한 기사 개수 카운팅 (매월 1일 자정에 초기화하는 스케줄러/함수 필요)
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS current_month_articles_count INT DEFAULT 0;
