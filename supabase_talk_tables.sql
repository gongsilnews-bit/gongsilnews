-- =============================================
-- 공실Talk 테이블 생성 SQL
-- Supabase Dashboard → SQL Editor에서 실행
-- =============================================

-- ① 채팅방
CREATE TABLE talk_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'group',
  avatar TEXT DEFAULT '🏢',
  created_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ② 채팅방 멤버
CREATE TABLE talk_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES talk_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES members(id),
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- ③ 메시지
CREATE TABLE talk_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES talk_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES members(id),
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_talk_messages_room ON talk_messages(room_id, created_at DESC);
CREATE INDEX idx_talk_room_members_user ON talk_room_members(user_id);

-- RLS 활성화
ALTER TABLE talk_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE talk_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE talk_messages ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "멤버는 자기 방 조회" ON talk_rooms
  FOR SELECT USING (id IN (SELECT room_id FROM talk_room_members WHERE user_id = auth.uid()));

CREATE POLICY "누구나 방 생성" ON talk_rooms
  FOR INSERT WITH CHECK (true);

CREATE POLICY "멤버 조회" ON talk_room_members
  FOR SELECT USING (true);

CREATE POLICY "멤버 추가" ON talk_room_members
  FOR INSERT WITH CHECK (true);

CREATE POLICY "멤버는 메시지 조회" ON talk_messages
  FOR SELECT USING (room_id IN (SELECT room_id FROM talk_room_members WHERE user_id = auth.uid()));

CREATE POLICY "멤버는 메시지 전송" ON talk_messages
  FOR INSERT WITH CHECK (room_id IN (SELECT room_id FROM talk_room_members WHERE user_id = auth.uid()));

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE talk_messages;
