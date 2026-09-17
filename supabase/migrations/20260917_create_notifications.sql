-- 알림 (네이버 메일 알림처럼 "안 읽은 것"을 세어 보여준다)
--
-- 처리 대기 건수만 세면 회원가입처럼 "처리" 개념이 없는 항목은 영영 남고,
-- 회원에게 보내는 "답변이 달렸습니다"는 끌 방법이 없다. 그래서 이벤트를 행으로
-- 쌓고 읽음 시각을 기록한다.
--
-- 수신자 지정 방식 두 가지
--   recipient_id   : 특정 회원에게 (1:1 문의 답변 알림 등)
--   recipient_role : 역할 전체에게 (ADMIN = 최고관리자 전원)

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid,
  recipient_role text,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  mobile_link text,
  source_id text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_recipient_required
    CHECK (recipient_id IS NOT NULL OR recipient_role IS NOT NULL)
);

-- 같은 사건으로 알림이 중복 생성되지 않도록 (재시도/중복 호출 대비)
CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedupe_idx
  ON notifications (type, source_id, COALESCE(recipient_id::text, recipient_role))
  WHERE source_id IS NOT NULL;

-- 종 아이콘이 매번 읽는 조회 패턴
CREATE INDEX IF NOT EXISTS notifications_recipient_idx
  ON notifications (recipient_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_role_idx
  ON notifications (recipient_role, read_at, created_at DESC);

COMMENT ON COLUMN notifications.recipient_role IS 'ADMIN 이면 최고관리자 전원에게';
COMMENT ON COLUMN notifications.source_id IS '원본 레코드 id (중복 알림 방지용)';
COMMENT ON COLUMN notifications.read_at IS '읽은 시각 (NULL이면 안 읽음)';

-- 실시간 구독 대상에 포함 (새 알림이 오면 종 숫자가 즉시 올라간다)
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ── RLS ──
-- 읽기/쓰기는 모두 서버 액션(service role)이 하므로 RLS 를 통과한다.
-- 브라우저(anon 키)에는 "내 알림 읽기"만 열어 준다. 이 권한이 없으면 실시간
-- 구독이 이벤트를 받지 못해 종 숫자가 즉시 갱신되지 않는다.

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON notifications;
CREATE POLICY notifications_select_own ON notifications
  FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS notifications_select_admin ON notifications;
CREATE POLICY notifications_select_admin ON notifications
  FOR SELECT TO authenticated
  USING (
    recipient_role = 'ADMIN'
    AND EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = auth.uid()
        -- members.role 은 enum(member_role) 이라 text 로 캐스팅해야 한다
        AND (upper(m.role::text) IN ('ADMIN', 'SUPER_ADMIN') OR m.role::text LIKE '%관리자%')
    )
  );

-- INSERT/UPDATE 정책은 두지 않는다. 알림 생성과 읽음 처리는 서버에서만 한다.
