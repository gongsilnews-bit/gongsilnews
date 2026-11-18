-- 휴대폰 푸시 토큰 (2026-11-18 사장님: 앱 잠금화면 알림)
--  앱이 로그인하면 이 휴대폰의 Expo 푸시 토큰을 /api/app/manage(push.register)로 보내 여기에 적는다
--  사이트 알림이 생기면 src/utils/push.ts 가 받는 사람의 토큰으로 보낸다. 로그아웃하면 지운다
--  서버(서비스 키)만 읽고 쓴다 — RLS 켜고 정책 없음
--  Supabase → SQL Editor 에서 실행

CREATE TABLE IF NOT EXISTS push_tokens (
  token text PRIMARY KEY,
  user_id uuid NOT NULL,
  platform text,
  device text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_tokens_user ON push_tokens (user_id);
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
