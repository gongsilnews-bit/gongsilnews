-- AI 개발실 대화: 작업마다 사장님 ↔ 에이전트 대화를 쌓는다.
-- 사장님이 승인대기·실패·반영완료 작업에 메시지를 보내면 그 내용을 반영해 에이전트가 다시 작업한다.
-- 에이전트는 시작·질문(모르면 모른다고)·결과를 여기에 남긴다.
-- 회의록: docs/2026-09-30_ai_dev_room_local_agent_meeting.md
CREATE TABLE IF NOT EXISTS dev_task_messages (
  id          BIGSERIAL PRIMARY KEY,
  task_id     BIGINT NOT NULL REFERENCES dev_tasks(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'agent')),
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dev_task_messages_task_idx ON dev_task_messages (task_id, created_at);

-- 서버(서비스 키)만 읽고 쓴다.
ALTER TABLE dev_task_messages ENABLE ROW LEVEL SECURITY;
