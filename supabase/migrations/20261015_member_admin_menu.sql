-- 중개사 관리자 메뉴를 회원 각자 꾸미기 (2026-10-15 회의 (다)안)
-- { "main": [...업무 메뉴 키], "more": [...더보기 메뉴 키] }. NULL 이면 최고관리자 기본값(agent_settings 'realty_menu_default')을 따른다.
ALTER TABLE members ADD COLUMN IF NOT EXISTS admin_menu JSONB;
COMMENT ON COLUMN members.admin_menu IS '중개사 관리자 메뉴 구성 {main, more}. NULL=최고관리자 기본값';
