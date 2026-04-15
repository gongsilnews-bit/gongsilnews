-- ============================================================
-- 부동산 특강 (Lectures) DB 스키마
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- 1. lectures (강의 메인)
CREATE TABLE IF NOT EXISTS lectures (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lecture_no    serial UNIQUE,
  author_id     uuid REFERENCES members(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'DRAFT'
                CHECK (status IN ('DRAFT','PENDING','ACTIVE','CLOSED','DELETED')),
  category      text NOT NULL DEFAULT '중개실무',
  title         text NOT NULL,
  subtitle      text,
  description   text,
  thumbnail_url text,

  -- 강사 정보
  instructor_name  text,
  instructor_bio   text,
  instructor_photo text,

  -- 가격
  price           integer DEFAULT 0,
  discount_price  integer,
  discount_label  text,
  duration_months integer DEFAULT 5,

  -- 통계
  total_duration  text,
  student_count   integer DEFAULT 0,
  rating          numeric(2,1) DEFAULT 0,
  review_count    integer DEFAULT 0,

  -- 메타
  is_deleted  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 2. lecture_chapters (챕터)
CREATE TABLE IF NOT EXISTS lecture_chapters (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lecture_id  uuid NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  chapter_no  integer NOT NULL,
  title       text NOT NULL,
  sort_order  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- 3. lecture_lessons (개별 강의/영상)
CREATE TABLE IF NOT EXISTS lecture_lessons (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id  uuid NOT NULL REFERENCES lecture_chapters(id) ON DELETE CASCADE,
  lesson_no   integer NOT NULL,
  title       text NOT NULL,
  video_url   text,
  duration    text,
  is_preview  boolean DEFAULT false,
  sort_order  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- 4. lecture_reviews (수강 리뷰)
CREATE TABLE IF NOT EXISTS lecture_reviews (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lecture_id  uuid NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES members(id) ON DELETE SET NULL,
  user_name   text,
  rating      integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content     text,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- 인덱스
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_lectures_status      ON lectures(status);
CREATE INDEX IF NOT EXISTS idx_lectures_category    ON lectures(category);
CREATE INDEX IF NOT EXISTS idx_lectures_author      ON lectures(author_id);
CREATE INDEX IF NOT EXISTS idx_chapters_lecture     ON lecture_chapters(lecture_id);
CREATE INDEX IF NOT EXISTS idx_lessons_chapter      ON lecture_lessons(chapter_id);
CREATE INDEX IF NOT EXISTS idx_reviews_lecture      ON lecture_reviews(lecture_id);

-- ============================================================
-- RLS (Row Level Security) - 기본 정책
-- ============================================================
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_reviews ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 (ACTIVE 강의만)
CREATE POLICY "lectures_public_read" ON lectures
  FOR SELECT USING (status = 'ACTIVE' AND is_deleted = false);

-- service_role은 모든 작업 가능 (서버 액션에서 사용)
CREATE POLICY "lectures_service_all" ON lectures
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "chapters_public_read" ON lecture_chapters
  FOR SELECT USING (true);
CREATE POLICY "chapters_service_all" ON lecture_chapters
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "lessons_public_read" ON lecture_lessons
  FOR SELECT USING (true);
CREATE POLICY "lessons_service_all" ON lecture_lessons
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "reviews_public_read" ON lecture_reviews
  FOR SELECT USING (true);
CREATE POLICY "reviews_service_all" ON lecture_reviews
  FOR ALL USING (true) WITH CHECK (true);
