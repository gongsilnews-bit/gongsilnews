-- agencies 테이블에 부동산소개(intro) 컬럼 추가 스크립트
ALTER TABLE public.agencies ADD COLUMN intro VARCHAR(100);
