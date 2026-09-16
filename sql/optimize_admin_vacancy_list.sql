-- ══════════════════════════════════════════════════════════════
-- 관리자 공실관리 목록 성능 최적화 (1단계)
-- 작성일: 2026-09-16
--
-- [문제]
-- getVacancies / getVacancyTabCounts 의 ONBID(경공매) 제외 필터
--     .or("metadata->>source_type.is.null,metadata->>source_type.neq.ONBID")
-- 는 JSONB 값 추출 + 부정 비교를 OR 로 묶은 형태라
-- 기존 idx_vacancies_metadata_gin (GIN) 이 전혀 걸리지 않는다.
-- (GIN 은 @> 포함 검색만 지원하고 ->> 추출/부정은 못 탄다)
--
-- 그 결과 화면에 7건을 보여주기 위해 vacancies 11,477행을
-- 전수 스캔하며 행마다 JSONB 를 파싱한다.
-- 화면 진입 1회당 이 스캔이 5번 반복된다 (목록 1 + 탭카운트 4).
--
-- [실측]
--   목록 1페이지 (현재)           509ms
--   목록 1페이지 (필터만 제거)     115ms   ← 394ms 가 JSONB 전수 스캔
--   탭카운트 4종 병렬              447ms
--
-- [해결]
-- 쿼리의 WHERE 절과 문구까지 동일한 부분 인덱스를 만들어
-- 플래너가 predicate 매칭을 증명할 수 있게 한다.
-- ONBID 가 아닌 행은 332건뿐이라 인덱스가 매우 작고,
-- status 를 선두 컬럼으로 두어 목록(status <> 'DELETED')과
-- 탭카운트(status = 'ACTIVE'/'STOPPED'/'DRAFT') 5개 쿼리를 모두 커버한다.
--
-- [실행 방법]
-- Supabase SQL Editor 에 이 파일 내용을 그대로 붙여넣고 Run.
-- (SQL Editor 는 실행문을 트랜잭션으로 감싸므로 CONCURRENTLY 를 쓸 수 없다.
--  11,477행 규모라 인덱스 생성 락은 1초 미만이다.)
-- ══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_vacancies_admin_nononbid
  ON public.vacancies (status, created_at DESC)
  WHERE (metadata->>'source_type') IS NULL
     OR (metadata->>'source_type') <> 'ONBID';

-- ──────────────────────────────────────────────────────────────
-- ※ psql / Supabase CLI 등 트랜잭션 밖에서 실행할 수 있는 환경이라면
--   아래처럼 CONCURRENTLY 를 붙여 쓰기 락 없이 생성할 수 있다.
--
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vacancies_admin_nononbid
--   ON public.vacancies (status, created_at DESC)
--   WHERE (metadata->>'source_type') IS NULL
--      OR (metadata->>'source_type') <> 'ONBID';
--
-- ※ 되돌리려면:  DROP INDEX IF EXISTS public.idx_vacancies_admin_nononbid;
-- ──────────────────────────────────────────────────────────────

-- 검증: Seq Scan 이 사라지고 Index Scan using idx_vacancies_admin_nononbid 로 바뀌어야 한다
--
-- EXPLAIN ANALYZE
-- SELECT id, vacancy_no, status, created_at
--   FROM public.vacancies
--  WHERE status <> 'DELETED'
--    AND ((metadata->>'source_type') IS NULL OR (metadata->>'source_type') <> 'ONBID')
--  ORDER BY created_at DESC
--  LIMIT 30;
