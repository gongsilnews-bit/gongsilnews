-- 포인트 정책 테이블
CREATE TABLE IF NOT EXISTS point_settings (
  key TEXT PRIMARY KEY,
  value NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 정책값 삽입
INSERT INTO point_settings (key, value) VALUES
  ('SIGNUP_BONUS', 1000),
  ('VACANCY_REWARD', 500),
  ('COMMISSION_RATE', 20),
  ('TRANSFER_FEE_RATE', 5),
  ('TRANSFER_MAX_ONCE', 50000),
  ('TRANSFER_MAX_DAILY', 100000),
  ('CHARGE_RATIO', 1)
ON CONFLICT (key) DO NOTHING;

-- 포인트 거래 내역 테이블
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('EARN', 'SPEND')),
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id UUID,
  counterpart_id UUID REFERENCES members(id) ON DELETE SET NULL,
  balance_after INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_pt_member ON point_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_pt_created ON point_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pt_type ON point_transactions(type);

-- members 테이블에 point_balance 컬럼 추가
ALTER TABLE members ADD COLUMN IF NOT EXISTS point_balance INTEGER DEFAULT 0;
