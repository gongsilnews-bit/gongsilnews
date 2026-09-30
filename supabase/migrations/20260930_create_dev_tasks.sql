-- AI 개발실: 최고관리자가 오류·수정 요청을 등록하면 사장님 PC의 로컬 에이전트가 가져가 고친다.
-- 회의록: docs/2026-09-30_ai_dev_room_local_agent_meeting.md
--
-- 상태 흐름: waiting(접수) → running(작업중) → review(승인대기) → merged(반영완료)
--           review 에서 반려하면 rejected → 에이전트가 사유를 반영해 다시 running
--           고치지 못하면 failed(실패, 원인 분석만 기록)
CREATE TABLE IF NOT EXISTS dev_tasks (
  id              BIGSERIAL PRIMARY KEY,
  task_no         TEXT UNIQUE,                       -- BUG-2026-001 형식, 아래 트리거가 채운다
  type            TEXT NOT NULL DEFAULT 'bug'
                  CHECK (type IN ('bug', 'feature', 'design', 'urgent')),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  page_url        TEXT,
  repro_steps     TEXT,
  attachments     JSONB NOT NULL DEFAULT '[]'::jsonb, -- devroom 버킷 안 스크린샷 경로 목록
  status          TEXT NOT NULL DEFAULT 'waiting'
                  CHECK (status IN ('waiting', 'running', 'review', 'merged', 'rejected', 'failed')),
  attempt         INTEGER NOT NULL DEFAULT 0,        -- 에이전트가 작업한 횟수 (반려 후 재작업이면 2, 3...)

  -- 에이전트 처리 결과
  branch          TEXT,
  commit_sha      TEXT,
  pr_url          TEXT,
  preview_url     TEXT,
  result_summary  TEXT,
  changed_files   JSONB NOT NULL DEFAULT '[]'::jsonb,
  log             TEXT,
  reject_reason   TEXT,

  created_by      UUID REFERENCES members(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS dev_tasks_status_created_idx ON dev_tasks (status, created_at);

-- 작업번호: 종류별 머리글자 + 연도 + 그해 일련번호 (예: BUG-2026-001, FEAT-2026-002)
CREATE OR REPLACE FUNCTION dev_tasks_set_task_no() RETURNS trigger AS $$
DECLARE
  yr  TEXT := to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYY');
  seq INTEGER;
BEGIN
  IF NEW.task_no IS NULL THEN
    SELECT count(*) + 1 INTO seq FROM dev_tasks WHERE task_no LIKE '%-' || yr || '-%';
    NEW.task_no := CASE NEW.type
                     WHEN 'feature' THEN 'FEAT'
                     WHEN 'design'  THEN 'DSGN'
                     WHEN 'urgent'  THEN 'URG'
                     ELSE 'BUG'
                   END || '-' || yr || '-' || lpad(seq::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS dev_tasks_set_task_no ON dev_tasks;
CREATE TRIGGER dev_tasks_set_task_no BEFORE INSERT ON dev_tasks
  FOR EACH ROW EXECUTE FUNCTION dev_tasks_set_task_no();

CREATE OR REPLACE FUNCTION dev_tasks_touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS dev_tasks_touch_updated_at ON dev_tasks;
CREATE TRIGGER dev_tasks_touch_updated_at BEFORE UPDATE ON dev_tasks
  FOR EACH ROW EXECUTE FUNCTION dev_tasks_touch_updated_at();

-- 에이전트가 처리할 작업 1건을 가져가면서 곧바로 running 으로 바꾼다.
-- 접수(waiting)와 반려(rejected, 재작업)를 먼저 들어온 순서대로 꺼낸다.
-- SKIP LOCKED 로 동시에 두 번 불려도 같은 작업을 두 번 가져가지 않는다.
CREATE OR REPLACE FUNCTION claim_next_dev_task() RETURNS SETOF dev_tasks AS $$
  UPDATE dev_tasks
     SET status = 'running', attempt = attempt + 1, started_at = now(), finished_at = NULL
   WHERE id = (
     SELECT id FROM dev_tasks
      WHERE status IN ('waiting', 'rejected')
      ORDER BY created_at
      LIMIT 1
      FOR UPDATE SKIP LOCKED
   )
  RETURNING *;
$$ LANGUAGE sql;

-- 서버(서비스 키)만 읽고 쓴다. 정책을 두지 않아 브라우저에서는 읽거나 고칠 수 없다.
ALTER TABLE dev_tasks ENABLE ROW LEVEL SECURITY;
REVOKE EXECUTE ON FUNCTION claim_next_dev_task() FROM PUBLIC, anon, authenticated;

-- 스크린샷 보관함 (비공개). 서버가 서비스 키로 올리고 내려받는다.
INSERT INTO storage.buckets (id, name, public)
VALUES ('devroom', 'devroom', false)
ON CONFLICT (id) DO NOTHING;
