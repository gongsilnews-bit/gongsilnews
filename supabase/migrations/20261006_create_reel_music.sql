-- 공실 릴스: 회원이 직접 올린 배경음악
-- 올릴 때 "직접 만들었거나 상업적 사용 허락을 받은 음악"이라는 동의를 받는다 (agreed_at). 저작권 책임은 올린 회원
-- 보관: reels 버킷 music/<vacancy>/<id>.<확장자>. 30일 동안 안 쓰면 삭제 (회의 결정 2026-10-06)
CREATE TABLE IF NOT EXISTS reel_music (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id    UUID NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
  member_id     UUID REFERENCES members(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading', 'ready')),
  title         TEXT,
  path          TEXT NOT NULL,
  duration      NUMERIC(7, 2),
  size_bytes    BIGINT,
  agreed_at     TIMESTAMPTZ NOT NULL,                 -- 저작권 동의 시각
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reel_music_vacancy_idx ON reel_music (vacancy_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reel_music_used_idx ON reel_music (last_used_at);

-- 서버(서비스 키)만 읽고 쓴다
ALTER TABLE reel_music ENABLE ROW LEVEL SECURITY;
