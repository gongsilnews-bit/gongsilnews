-- AI 개발실 2단계: [승인] 상태 추가.
-- review(승인대기) → [승인] → approved(승인됨) → PC 에이전트가 PR 병합 → merged(반영완료)
-- 회의록: docs/2026-09-30_ai_dev_room_local_agent_meeting.md
ALTER TABLE dev_tasks DROP CONSTRAINT IF EXISTS dev_tasks_status_check;
ALTER TABLE dev_tasks ADD CONSTRAINT dev_tasks_status_check
  CHECK (status IN ('waiting', 'running', 'review', 'approved', 'merged', 'rejected', 'failed'));
