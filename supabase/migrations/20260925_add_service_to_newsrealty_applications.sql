-- 멤버십관리: 공실뉴스부동산 신청과 공실스터디 멤버십 신청을 한 표에서 받는다
--
-- service : 'newsrealty' (공실뉴스부동산) | 'study' (공실스터디)
-- 기존 행은 모두 공실뉴스부동산 신청이므로 기본값 'newsrealty' 로 채워진다.

ALTER TABLE newsrealty_applications
  ADD COLUMN IF NOT EXISTS service text NOT NULL DEFAULT 'newsrealty';

CREATE INDEX IF NOT EXISTS newsrealty_applications_service_idx
  ON newsrealty_applications (service, created_at DESC);

-- 그동안 board_posts('study_apply')에 쌓인 스터디 신청을 옮긴다
INSERT INTO newsrealty_applications
  (created_at, updated_at, member_id, applicant_name, phone, email, agency_name,
   interests, memo, status, admin_notes, sms_sent, email_sent, kakao_sent, service)
SELECT
  p.created_at,
  p.created_at,
  p.author_id,
  COALESCE(NULLIF(p.external_url::jsonb->>'name', ''), p.author_name),
  COALESCE(p.external_url::jsonb->>'phone', ''),
  NULLIF(p.external_url::jsonb->>'email', ''),
  COALESCE(NULLIF(p.external_url::jsonb->>'agencyName', ''), '-'),
  ARRAY['공실스터디'],
  p.content,
  COALESCE(NULLIF(p.external_url::jsonb->>'status', ''), '신규'),
  COALESCE(p.external_url::jsonb->>'admin_notes', ''),
  COALESCE((p.external_url::jsonb->>'sms_sent')::boolean, false),
  false,
  false,
  'study'
FROM board_posts p
WHERE p.board_id = 'study_apply'
  AND p.is_deleted = false;

UPDATE board_posts SET is_deleted = true WHERE board_id = 'study_apply';
