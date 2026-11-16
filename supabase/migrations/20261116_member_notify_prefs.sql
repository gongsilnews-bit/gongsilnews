-- 앱 설정 > 알림 켜기·끄기 (2026-11-16 사장님: 설정에서 기사 알림부터 여러 알림을 고르게)
--  notify_prefs: { "star_trade": true, "star_vacancy": true, "sub_article": true, "my_review": true, "inquiry": true, "news_push": true, "quiet": false }
--  비어 있으면(null) 전부 켬으로 본다. 휴대폰 푸시를 붙일 때 서버가 이 값을 보고 보낼지 정한다
--  Supabase → SQL Editor 에서 실행
ALTER TABLE members ADD COLUMN IF NOT EXISTS notify_prefs jsonb;
