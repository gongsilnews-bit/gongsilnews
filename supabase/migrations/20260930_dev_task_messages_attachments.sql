-- AI 개발실 대화에 이미지 첨부. devroom 비공개 버킷 안 경로 목록.
ALTER TABLE dev_task_messages ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;
