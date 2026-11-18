-- 최고관리자 앱 푸시 보내기 (2026-11-18 사장님)
--  members.marketing_push : 광고·혜택 푸시 수신 동의 (앱 [설정]에서 켜고 끔, 켠 날짜는 marketing_push_at — 정보통신망법 기록)
--  push_campaigns         : 최고관리자가 보낸 푸시 기록 (몇 명·몇 대·몇 명이 눌렀는지)
--  Supabase → SQL Editor 에서 실행

ALTER TABLE members ADD COLUMN IF NOT EXISTS marketing_push boolean NOT NULL DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS marketing_push_at timestamptz;

CREATE TABLE IF NOT EXISTS push_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,              -- info(안내) · ad(광고) · test(나에게 시험)
  title text NOT NULL,
  body text,
  link text,
  audience jsonb,                  -- 고른 대상 (등급·지역)
  recipients int NOT NULL DEFAULT 0, -- 받을 회원 수
  devices int NOT NULL DEFAULT 0,    -- 보낸 휴대폰 수
  failed int NOT NULL DEFAULT 0,
  opened int NOT NULL DEFAULT 0,     -- 알림을 누른 수
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_campaigns_created ON push_campaigns (created_at DESC);
ALTER TABLE push_campaigns ENABLE ROW LEVEL SECURITY;
