-- ══════════════════════════════════════════════
-- 공실Talk 친구 관리 시스템
-- ══════════════════════════════════════════════

-- 1. 친구 폴더 테이블
CREATE TABLE IF NOT EXISTS talk_friend_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 친구 테이블
CREATE TABLE IF NOT EXISTS talk_friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES talk_friend_folders(id) ON DELETE SET NULL,
  nickname TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_talk_friends_user ON talk_friends(user_id);
CREATE INDEX IF NOT EXISTS idx_talk_friends_folder ON talk_friends(folder_id);
CREATE INDEX IF NOT EXISTS idx_talk_friend_folders_user ON talk_friend_folders(user_id);

-- RLS 활성화
ALTER TABLE talk_friend_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE talk_friends ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 서비스 롤은 모든 접근 허용
CREATE POLICY "service_role_full_access_folders" ON talk_friend_folders
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_access_friends" ON talk_friends
  FOR ALL USING (true) WITH CHECK (true);
