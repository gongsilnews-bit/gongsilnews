-- members 테이블에 sns_links JSON 컬럼 추가 스크립트
ALTER TABLE public.members
ADD COLUMN sns_links JSONB DEFAULT '{}'::jsonb;

-- 주석
COMMENT ON COLUMN public.members.sns_links IS '회원 SNS 및 마케팅 링크 정보 (11개 항목)';
