-- ══════════════════════════════════════════════════════════════
-- 관리자 기사관리 목록 성능 최적화 (2단계)
-- 작성일: 2026-09-16
--
-- [문제]
-- getArticles / getArticleTabCounts 의 모든 쿼리가 .eq("is_deleted", false) 를
-- 붙이는데 is_deleted 를 포함한 인덱스가 하나도 없다.
-- 기존 idx_articles_published / idx_articles_created / idx_articles_status 는
-- is_deleted 필터를 인덱스에서 걸러내지 못해 매번 별도 필터 단계를 거친다.
--
-- 기사 958건(삭제 제외 518건) 시점에서는 아직 체감되지 않지만
-- (목록 117ms, 탭카운트 10종 60ms) 건수에 비례해 그대로 커진다.
--
-- [해결]
-- 실제 ORDER BY 형태와 일치하는 부분 인덱스 2개를 추가한다.
--
-- [실행 방법]
-- Supabase SQL Editor 에 이 파일 내용을 그대로 붙여넣고 Run.
-- (SQL Editor 는 실행문을 트랜잭션으로 감싸므로 CONCURRENTLY 를 쓸 수 없다.
--  958행 규모라 인덱스 생성 락은 무시할 수준이다.)
-- ══════════════════════════════════════════════════════════════

-- 1) 기본 정렬용: ORDER BY published_at DESC NULLS LAST, created_at DESC
--    .order("published_at", { ascending: false, nullsFirst: false }) 와 정렬 순서까지 일치시킨다.
--    (Postgres 의 DESC 기본값은 NULLS FIRST 이므로 NULLS LAST 를 명시해야 인덱스를 탄다)
CREATE INDEX IF NOT EXISTS idx_articles_live_published
  ON public.articles (published_at DESC NULLS LAST, created_at DESC)
  WHERE is_deleted = false;

-- 2) 상태 탭 + 최신순용: 승인대기/작성중/반려 탭과 탭 카운트 쿼리가 사용한다.
--    (status = 'PENDING' 등 스칼라 등치 조건이라 부분 인덱스 조건 증명이 단순하다)
CREATE INDEX IF NOT EXISTS idx_articles_live_status_created
  ON public.articles (status, created_at DESC)
  WHERE is_deleted = false;

-- ──────────────────────────────────────────────────────────────
-- ※ psql / Supabase CLI 등 트랜잭션 밖에서 실행할 수 있는 환경이라면
--   각 문장에 CONCURRENTLY 를 붙여 쓰기 락 없이 생성할 수 있다.
--
-- ※ 되돌리려면:
--   DROP INDEX IF EXISTS public.idx_articles_live_published;
--   DROP INDEX IF EXISTS public.idx_articles_live_status_created;
-- ──────────────────────────────────────────────────────────────

-- 검증
--
-- EXPLAIN ANALYZE
-- SELECT id, article_no, title FROM public.articles
--  WHERE is_deleted = false
--  ORDER BY published_at DESC NULLS LAST, created_at DESC
--  LIMIT 30;
--
-- EXPLAIN ANALYZE
-- SELECT count(*) FROM public.articles
--  WHERE is_deleted = false AND status = 'PENDING';
