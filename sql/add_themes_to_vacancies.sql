-- ======================================================
-- 공실(Vacancy) 테이블에 테마(themes) 컬럼 추가
-- Supabase SQL Editor에서 실행하세요
-- ======================================================

ALTER TABLE public.vacancies 
ADD COLUMN IF NOT EXISTS themes TEXT[] DEFAULT '{}';

-- 만약 이미 등록된 매물 중 테마가 NULL인 경우를 방지하려면:
UPDATE public.vacancies SET themes = '{}' WHERE themes IS NULL;
