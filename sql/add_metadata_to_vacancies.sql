-- public.vacancies 테이블에 metadata JSONB 컬럼 및 GIN 인덱스 추가
-- 작성일자: 2026-05-25 (경공매 고도화 회의 합의안)

-- 1. vacancies 테이블에 metadata JSONB 컬럼 추가 (기본값 빈 객체 '{}')
ALTER TABLE public.vacancies 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 2. metadata 컬럼 내부의 모든 키/값을 초고속 검색하기 위한 GIN 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_vacancies_metadata_gin 
ON public.vacancies USING gin (metadata);
