-- ══════════════════════════════════════════════════════════════
-- 관리자 공실관리 목록 성능 최적화 (1단계 재작업 / v2)
-- 작성일: 2026-09-16
--
-- [v1 이 실패한 이유]
-- v1 은 쿼리 WHERE 절과 같은 문구의 부분 인덱스를 만들어
-- 플래너가 predicate 매칭을 증명하게 하는 방식이었다.
--     WHERE (metadata->>'source_type') IS NULL
--        OR (metadata->>'source_type') <> 'ONBID'
-- 실측 결과 이 인덱스는 전혀 쓰이지 않았다.
--     onbid 필터 O : 201ms (대상 332행)
--     onbid 필터 X :  22ms (대상 11,152행)
--   → 필터를 건 쪽이 10배 느리다 = 여전히 전수 스캔
-- PostgREST 가 생성하는 SQL 과 인덱스 predicate 이 구조적으로
-- 일치하지 않아 증명에 실패한 것으로 보이는데,
-- 프로덕션에서는 EXPLAIN 이 막혀 있어 확인할 수 없다.
--
-- [v2 방침]
-- 플래너의 predicate 증명에 의존하지 않는다.
-- 애초에 <> (부정) 은 btree 로 탐색할 수 없는 연산자이므로,
-- ONBID 여부를 NOT NULL boolean 생성 컬럼으로 승격시켜
-- 단순 등치 조건(is_onbid = false)으로 조회한다.
-- 등치 조건은 증명이 필요 없고 JSONB 파싱도 질의 시점에 일어나지 않는다.
--
-- [안전성 확인]
-- - 생성 컬럼은 INSERT/UPDATE 로 쓸 수 없다. vacancies 쓰기 경로
--   (createVacancy / updateVacancy / onbidSync) 의 payload 는 모두
--   필드를 명시적으로 나열해 구성하며 DB 행을 전개(spread)하는 곳이 없어
--   is_onbid 가 payload 에 섞여 들어갈 수 없다. 확인 완료.
-- - 값은 Postgres 가 자동 유지하므로 ONBID 동기화 코드는 수정 불필요.
-- - 의미는 기존 필터와 정확히 동일하다 (NOT (source_type = 'ONBID')).
--
-- [주의] 2번 ALTER 는 테이블 재작성(ACCESS EXCLUSIVE 락)을 유발한다.
--        11,477행 규모라 수 초 내로 끝나지만 실행 중 공실 쓰기는 대기한다.
--        트래픽이 적은 시간에 실행하는 것을 권장한다.
--
-- [실행 방법] Supabase SQL Editor 에 전체를 붙여넣고 Run.
-- ══════════════════════════════════════════════════════════════

-- 1) v1 에서 만든, 실제로 쓰이지 않는 인덱스 제거
--    (쓰기마다 갱신 비용만 발생하고 조회에는 도움이 되지 않음)
DROP INDEX IF EXISTS public.idx_vacancies_admin_nononbid;

-- 2) ONBID 여부를 NOT NULL boolean 생성 컬럼으로 승격
--    COALESCE 로 감싸 source_type 이 없는 행도 false 가 되게 한다
--    (NULL = 'ONBID' 는 NULL 이 되므로 COALESCE 가 없으면 NOT NULL 을 만족하지 못한다)
ALTER TABLE public.vacancies
  ADD COLUMN IF NOT EXISTS is_onbid boolean NOT NULL
  GENERATED ALWAYS AS (COALESCE((metadata->>'source_type') = 'ONBID', false)) STORED;

-- 3) 관리자 목록/탭카운트 5개 쿼리를 한 번에 커버하는 복합 인덱스
--    is_onbid = false  → 등치 (선두 컬럼)
--    status            → 목록은 <> 'DELETED', 탭카운트는 = 'ACTIVE'/'STOPPED'/'DRAFT'
--    created_at DESC   → 목록 정렬
CREATE INDEX IF NOT EXISTS idx_vacancies_admin_list
  ON public.vacancies (is_onbid, status, created_at DESC);

-- 4) 새 컬럼/인덱스 통계 갱신
ANALYZE public.vacancies;

-- 5) PostgREST 스키마 캐시 새로고침
--    이걸 빠뜨리면 컬럼을 만들어도 API 가 "column vacancies.is_onbid does not exist" 를 낸다.
NOTIFY pgrst, 'reload schema';

-- 6) 검증 (이 결과가 화면에 표시된다)
--    is_onbid 컬럼 정의 + 값 분포가 함께 나와야 정상이다.
SELECT
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema='public' AND table_name='vacancies' AND column_name='is_onbid')
                                                    AS "컬럼생성됨(1이어야함)",
  (SELECT count(*) FROM public.vacancies)           AS "전체",
  (SELECT count(*) FROM public.vacancies WHERE is_onbid)     AS "경공매",
  (SELECT count(*) FROM public.vacancies WHERE NOT is_onbid) AS "일반",
  (SELECT count(*) FROM pg_indexes
    WHERE schemaname='public' AND indexname='idx_vacancies_admin_list')
                                                    AS "인덱스생성됨(1이어야함)";

-- ──────────────────────────────────────────────────────────────
-- 되돌리려면:
--   DROP INDEX IF EXISTS public.idx_vacancies_admin_list;
--   ALTER TABLE public.vacancies DROP COLUMN IF EXISTS is_onbid;
-- (코드도 함께 되돌려야 한다 — sql/optimize_admin_vacancy_list.sql 참고)
-- ──────────────────────────────────────────────────────────────

-- 검증: 아래가 11,477 / 11,145 / 332 로 나와야 한다
--
-- SELECT count(*) AS 전체,
--        count(*) FILTER (WHERE is_onbid)     AS onbid,
--        count(*) FILTER (WHERE NOT is_onbid) AS 일반
--   FROM public.vacancies;
--
-- EXPLAIN ANALYZE
-- SELECT id, vacancy_no, status, created_at FROM public.vacancies
--  WHERE is_onbid = false AND status <> 'DELETED'
--  ORDER BY created_at DESC LIMIT 30;
