-- 홈페이지 설정 (homepage_settings) 테이블 upsert 에러 수정을 위한 SQL
-- owner_id 컬럼에 UNIQUE 제약 조건을 추가해야 onConflict 기능을 사용할 수 있습니다.

ALTER TABLE public.homepage_settings ADD CONSTRAINT homepage_settings_owner_id_key UNIQUE (owner_id);
