-- 에이전트 대화 기록 저장 테이블 (기존 공실뉴스 테이블과 완전 독립)
CREATE TABLE IF NOT EXISTS agent_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'agent')),
  content TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost_krw NUMERIC(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스: 채널별 최신순 조회 최적화
CREATE INDEX IF NOT EXISTS idx_agent_chats_channel ON agent_chats(channel_id, created_at DESC);
