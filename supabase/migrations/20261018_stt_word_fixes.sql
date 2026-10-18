-- 받아쓰기 낱말장 (2026-10-18 회의 — docs/2026-10-18_studio_ai_settings_meeting.md 3-18)
--
-- 스튜디오 자동 자막(PC 의 Whisper)이 잘못 들은 낱말을 대표님들이 고치면 "잘못 들린 말 → 고친 말"을 모은다.
--   - 낱말 쌍과 앞뒤 몇 글자만 받는다 (녹음·대본 전체는 받지 않음)
--   - 고친 대표님 PC 에는 바로 적용 (앱이 따로 기억)
--   - 모든 대표님에게는: 서로 다른 회원 3명 이상이 같은 고침을 올렸거나, 최고관리자가 승인한 것만 (거절한 것은 빼고)
-- 앱·API 는 이 표가 없어도 동작한다 (적용 전엔 공용 규칙이 비어 있을 뿐).

CREATE TABLE IF NOT EXISTS stt_word_fixes (
  id BIGSERIAL PRIMARY KEY,
  wrong TEXT NOT NULL,
  fixed TEXT NOT NULL,
  context TEXT,
  member_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, wrong, fixed)
);
COMMENT ON TABLE stt_word_fixes IS '받아쓰기 낱말장 — 회원이 올린 "잘못 들린 말 → 고친 말" (회원마다 한 번)';

CREATE TABLE IF NOT EXISTS stt_word_rules (
  wrong TEXT NOT NULL,
  fixed TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('approved', 'rejected')),
  decided_by UUID,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (wrong, fixed)
);
COMMENT ON TABLE stt_word_rules IS '받아쓰기 낱말장 — 최고관리자 승인(approved)·거절(rejected)';

-- 서버(서비스 키)만 읽고 쓴다
ALTER TABLE stt_word_fixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stt_word_rules ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS stt_word_fixes_pair_idx ON stt_word_fixes (wrong, fixed);
