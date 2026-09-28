-- 특강을 회원도 등록하고, 최고관리자가 승인해야 판매중이 되게 한다.
-- 회의록: docs/2026-09-28_lecture_member_registration_settlement_meeting.md
--
-- 1) 회원별 강의 등록 한도. 등급별 한도 설정에서 내려주고, 회원관리에서 개별로 덮어쓴다.
--    공실·기사 한도(max_vacancies, max_articles_per_month)와 같은 방식이다.
ALTER TABLE members ADD COLUMN IF NOT EXISTS max_lectures integer NOT NULL DEFAULT 0;

-- 유료회원(공실스터디부동산·공실뉴스부동산·비즈니스회원)에게 기본 3건을 채워 둔다.
-- 일반회원·무료부동산은 0 — 등록할 수 없다.
UPDATE members SET max_lectures = 3
 WHERE max_lectures = 0
   AND (role = 'BIZ' OR (role = 'REALTOR' AND plan_type IN ('study_premium', 'news_premium')));

-- 2) 반려 상태와 반려 사유.
--    상태 제약의 이름을 모르므로 status 를 검사하는 제약을 찾아 지우고 다시 건다.
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'lectures'::regclass AND contype = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE lectures DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE lectures ADD CONSTRAINT lectures_status_check
  CHECK (status IN ('DRAFT', 'PENDING', 'ACTIVE', 'REJECTED', 'CLOSED', 'DELETED'));

ALTER TABLE lectures ADD COLUMN IF NOT EXISTS reject_reason text;
