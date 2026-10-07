-- 공실 릴스: 회원이 자기 공실로 세로 릴스 영상을 만든다.
-- 흐름: 대본 초안(사진 검사 + AI 대본) → 회원이 대본 수정 → 영상 만들기(성우 + Vercel Sandbox 렌더) → reels 버킷 저장
-- 회의 결정: 사진 릴스 먼저, 굽기는 Vercel Sandbox, 성우는 Gemini TTS (2026-10-06)
--
-- 상태 흐름: queued(대기) → running(제작중, stage 로 세부 단계 표시) → done(완료) | failed(실패)
CREATE TABLE IF NOT EXISTS reel_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id    UUID NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
  member_id     UUID REFERENCES members(id) ON DELETE SET NULL,   -- 요청한 회원
  status        TEXT NOT NULL DEFAULT 'queued'
                CHECK (status IN ('queued', 'running', 'done', 'failed')),
  stage         TEXT,                                             -- voice | verify | render | upload
  script        JSONB NOT NULL,                                   -- 렌더에 쓴 최종 대본 (장면·사진·자막·스티커)
  voice         TEXT NOT NULL DEFAULT 'Aoede',
  video_path    TEXT,                                             -- reels 버킷 안 경로
  duration_s    NUMERIC(6, 2),
  warnings      JSONB NOT NULL DEFAULT '[]'::jsonb,               -- 성우 검사 불일치 등, 실패는 아니지만 확인할 것
  error         TEXT,
  timings       JSONB NOT NULL DEFAULT '{}'::jsonb,               -- 단계별 소요 초
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS reel_jobs_vacancy_created_idx ON reel_jobs (vacancy_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reel_jobs_member_created_idx ON reel_jobs (member_id, created_at DESC);

-- 서버(서비스 키)만 읽고 쓴다. 회원은 /api/reels 를 통해서만 본인 작업을 조회한다.
ALTER TABLE reel_jobs ENABLE ROW LEVEL SECURITY;

-- 완성 영상 보관 (비공개, 서명 URL 로만 내려준다)
INSERT INTO storage.buckets (id, name, public)
VALUES ('reels', 'reels', false)
ON CONFLICT (id) DO NOTHING;
