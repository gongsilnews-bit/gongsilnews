-- ================================================
-- member_role enum에 'BIZ' 값 추가
-- 실행: Supabase Dashboard > SQL Editor
-- ================================================

ALTER TYPE member_role ADD VALUE IF NOT EXISTS 'BIZ';
