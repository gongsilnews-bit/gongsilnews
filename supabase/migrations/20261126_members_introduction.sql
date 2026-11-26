-- 회원 소개 (2026-11-26 사장님: 기자 페이지 "기자 소개" · "부동산 소개") — 100자
--  기자 페이지(PC reporter · 모바일 m/reporter)는 이미 profile.introduction 을 보여 주게 되어 있다
--  관리자 [회원관리] 회원 수정 화면에서 넣는다
--  Supabase → SQL Editor 에서 실행
ALTER TABLE members ADD COLUMN IF NOT EXISTS introduction text CHECK (introduction IS NULL OR char_length(introduction) <= 100);
