-- 로그인 안 한 앱 설치자도 푸시 받기 (2026-11-18 사장님: "앱이 설치된 사람에게 모두 보낼 수 없을까?")
--  앱을 처음 켜서 알림을 허락하면 회원 없이(user_id 비움) 휴대폰만 등록 → 로그인하면 그 회원 것으로 바뀜
--  news_off : 로그인 안 한 설치자가 앱 [알림설정]에서 "속보·추천 기사"를 끈 것 (회원은 members.notify_prefs)
--  광고 푸시는 동의를 받을 수 없어 로그인 안 한 설치자에게는 보내지 않는다
--  Supabase → SQL Editor 에서 실행

ALTER TABLE push_tokens ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS news_off boolean NOT NULL DEFAULT false;
