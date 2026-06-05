-- =============================================
-- 공실Talk 출처 필드 및 비밀글 속성 추가
-- Supabase Dashboard -> SQL Editor 또는 CLI를 통해 실행
-- =============================================

-- ① talk_rooms 테이블에 source_type, source_id 추가
ALTER TABLE public.talk_rooms 
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'general', -- 'vacancy', 'article', 'general'
ADD COLUMN IF NOT EXISTS source_id UUID;

-- ② talk_messages 테이블에 is_secret 추가
ALTER TABLE public.talk_messages 
ADD COLUMN IF NOT EXISTS is_secret BOOLEAN DEFAULT FALSE;

-- 인덱스 추가 (조회 최적화)
CREATE INDEX IF NOT EXISTS idx_talk_rooms_source ON public.talk_rooms(source_type, source_id);
