-- 공실 릴스 프로젝트: 매물마다 편집 중인 릴스 대본을 저장한다 (브루처럼 다시 열면 이어서 편집).
-- [릴스 만들기]를 처음 누를 때만 AI 초안을 만들고, 이후에는 저장된 프로젝트를 연다.
-- 성우 녹음은 reels 버킷 voice/<vacancy_id>/<해시>.wav 에 저장해 다시 쓰고, 완성 영상은 reel_jobs 에 쌓인다.
CREATE TABLE IF NOT EXISTS reel_projects (
  vacancy_id   UUID PRIMARY KEY REFERENCES vacancies(id) ON DELETE CASCADE,
  member_id    UUID REFERENCES members(id) ON DELETE SET NULL,   -- 마지막으로 저장한 회원
  script       JSONB NOT NULL,                                   -- 사진 검사 결과 + 장면(대사·강조·스티커·사진·순서)
  voice        TEXT NOT NULL DEFAULT 'Aoede',
  music        TEXT NOT NULL DEFAULT 'upbeat',                   -- upbeat | calm | none
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 서버(서비스 키)만 읽고 쓴다. 회원은 /api/reels/project 를 통해서만 본인 매물 프로젝트를 연다.
ALTER TABLE reel_projects ENABLE ROW LEVEL SECURITY;
