-- ============================================================================
-- 🏛️ 온비드(Onbid) 경공매 전체 메타데이터 인프라 구축 SQL
-- ============================================================================
-- 📌 용도: Supabase SQL Editor에 복사하여 실행
-- 📌 작성일: 2026-05-25
-- 📌 목적: vacancies 테이블에 경공매 전용 metadata JSONB 컬럼 생성 및
--          온비드 API 50여 개 전 필드를 고속 검색 가능하도록 GIN 인덱싱 적용
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: metadata JSONB 컬럼 생성 (이미 존재하면 안전하게 건너뜀)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.vacancies 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- STEP 1.1: metadata 컬럼에 대한 코멘트 (문서화)
COMMENT ON COLUMN public.vacancies.metadata IS '경공매 전용 JSONB 메타데이터 컬럼.
온비드(Onbid) API 원본 50여 개 전 필드 + 공실뉴스 가공 필드를 flat하게 저장.
source_type이 ONBID인 레코드에만 의미있는 데이터가 존재합니다.';


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: GIN 인덱스 (metadata 내부 전체 키/값 초고속 검색용)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vacancies_metadata_gin 
ON public.vacancies USING gin (metadata);


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: 자주 사용되는 경공매 필터 전용 부분 인덱스 (Partial Index)
-- ─────────────────────────────────────────────────────────────────────────────

-- 3.1 온비드 출처(ONBID) 매물만 빠르게 필터링하는 인덱스
CREATE INDEX IF NOT EXISTS idx_vacancies_metadata_source_onbid
ON public.vacancies ((metadata->>'source_type'))
WHERE metadata->>'source_type' = 'ONBID';

-- 3.2 입찰 종료일 기반 만료 매물 정리용 인덱스
CREATE INDEX IF NOT EXISTS idx_vacancies_metadata_bid_end_date
ON public.vacancies ((metadata->>'bid_end_date'))
WHERE metadata->>'source_type' = 'ONBID';

-- 3.3 온비드 물건번호(onbidCltrno) 중복 방지 고속 검색 인덱스
CREATE INDEX IF NOT EXISTS idx_vacancies_metadata_onbid_cltrno
ON public.vacancies ((metadata->>'onbidCltrno'))
WHERE metadata->>'source_type' = 'ONBID';

-- 3.4 감정평가액 범위 검색 인덱스 (투자 필터링용)
CREATE INDEX IF NOT EXISTS idx_vacancies_metadata_appraisal_price
ON public.vacancies ((( metadata->>'appraisal_price')::bigint))
WHERE metadata->>'source_type' = 'ONBID';


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: 기존 경매 매물 중 metadata가 비어있는 레코드를 
--         description에서 역파싱하여 metadata 자동 백필(Backfill)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.vacancies
SET metadata = jsonb_build_object(
  'source_type', 'ONBID',
  'backfilled', true,
  'building_name', building_name,
  'sido', sido,
  'sigungu', sigungu,
  'dong', dong
)
WHERE trade_type = '경매'
  AND (metadata IS NULL OR metadata = '{}'::jsonb OR metadata->>'source_type' IS NULL);


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: 온비드 경공매 매물 전용 뷰(View) 생성
--         프론트엔드에서 경매 매물만 빠르게 조회 가능
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_onbid_auctions AS
SELECT
  v.id,
  v.vacancy_no,
  v.status,
  v.building_name,
  v.property_type,
  v.trade_type,
  v.sido,
  v.sigungu,
  v.dong,
  v.detail_addr,
  v.lat,
  v.lng,
  v.deposit,
  v.created_at,
  v.updated_at,

  -- ── 공실뉴스 가공 필드 (metadata 내부) ──
  v.metadata->>'source_type'                       AS source_type,
  (v.metadata->>'appraisal_price')::bigint          AS appraisal_price,        -- 감정평가액 (원)
  (v.metadata->>'lowest_bid_price')::bigint         AS lowest_bid_price,       -- 최저입찰가 (원)
  (v.metadata->>'discount_rate')::int               AS discount_rate,          -- 유찰 할인율 (%)
  v.metadata->>'bid_start_date'                     AS bid_start_date,         -- 입찰 시작일시
  v.metadata->>'bid_end_date'                       AS bid_end_date,           -- 입찰 종료일시

  -- ── 온비드 API 원본 식별 필드 ──
  v.metadata->>'onbidCltrno'                        AS onbid_cltrno,           -- 온비드 물건번호 (고유 PK)
  v.metadata->>'cltrMngNo'                          AS cltr_mng_no,            -- 물건 관리번호 (공고번호)
  v.metadata->>'onbidCltrNm'                        AS onbid_cltr_nm,          -- 물건명

  -- ── 재산/물건 구분 ──
  v.metadata->>'prptDivCd'                          AS prpt_div_cd,            -- 재산구분코드 (0005=수탁, 0007=압류)
  v.metadata->>'prptDivNm'                          AS prpt_div_nm,            -- 재산구분명 (압류재산/수탁재산)
  v.metadata->>'cltrDivCd'                          AS cltr_div_cd,            -- 물건구분코드
  v.metadata->>'cltrDivNm'                          AS cltr_div_nm,            -- 물건구분명

  -- ── 물건 상태 ──
  v.metadata->>'cltrSttsCd'                         AS cltr_stts_cd,           -- 물건상태코드
  v.metadata->>'cltrSttsNm'                         AS cltr_stts_nm,           -- 물건상태명 (공고중/입찰중/유찰 등)

  -- ── 용도 분류 (대/중/소) ──
  v.metadata->>'cltrUsgLclsCtgrCd'                  AS cltr_usg_lcls_cd,       -- 용도 대분류 코드
  v.metadata->>'cltrUsgLclsCtgrNm'                  AS cltr_usg_lcls_nm,       -- 용도 대분류명 (주거용/상업용/산업용 등)
  v.metadata->>'cltrUsgMclsCtgrCd'                  AS cltr_usg_mcls_cd,       -- 용도 중분류 코드
  v.metadata->>'cltrUsgMclsCtgrNm'                  AS cltr_usg_mcls_nm,       -- 용도 중분류명 (아파트/오피스텔/상가 등)
  v.metadata->>'cltrUsgSclsCtgrCd'                  AS cltr_usg_scls_cd,       -- 용도 소분류 코드
  v.metadata->>'cltrUsgSclsCtgrNm'                  AS cltr_usg_scls_nm,       -- 용도 소분류명

  -- ── 소재지 상세 ──
  v.metadata->>'lctnSdnm'                           AS lctn_sdnm,              -- 소재지 시도명
  v.metadata->>'lctnSggnm'                          AS lctn_sggnm,             -- 소재지 시군구명
  v.metadata->>'lctnEmdNm'                          AS lctn_emd_nm,            -- 소재지 읍면동명
  v.metadata->>'lctnRiNm'                           AS lctn_ri_nm,             -- 소재지 리명
  v.metadata->>'lctnLnbr'                           AS lctn_lnbr,              -- 소재지 지번
  v.metadata->>'lctnRoadNmAdr'                      AS lctn_road_nm_adr,       -- 소재지 도로명주소
  v.metadata->>'lctnDtlAdr'                         AS lctn_dtl_adr,           -- 소재지 상세주소

  -- ── 면적 정보 ──
  v.metadata->>'ldSqms'                             AS ld_sqms,                -- 토지면적 (㎡)
  v.metadata->>'bldSqms'                            AS bld_sqms,               -- 건물면적 (㎡)

  -- ── 감정/입찰 가격 (API 원본) ──
  v.metadata->>'apslEvlAmt'                         AS apsl_evl_amt,           -- 감정평가액 (원, 문자열)
  v.metadata->>'lowstBidPrcIndctCont'               AS lowst_bid_prc,          -- 최저입찰가 표시내용

  -- ── 입찰 일정 (API 원본, YYYYMMDDHHMI 형식) ──
  v.metadata->>'cltrBidBgngDt'                      AS cltr_bid_bgng_dt,       -- 입찰 시작일시 (원본)
  v.metadata->>'cltrBidEndDt'                       AS cltr_bid_end_dt,        -- 입찰 종료일시 (원본)
  v.metadata->>'pbctBgngDt'                         AS pbct_bgng_dt,           -- 공고 시작일
  v.metadata->>'pbctEndDt'                          AS pbct_end_dt,            -- 공고 종료일

  -- ── 공매 조건 ──
  v.metadata->>'pbctCdtnNo'                         AS pbct_cdtn_no,           -- 공매 조건번호
  v.metadata->>'pbctCdtnNm'                         AS pbct_cdtn_nm,           -- 공매 조건명
  v.metadata->>'pbctNo'                             AS pbct_no,                -- 공고번호
  v.metadata->>'pbctCnt'                            AS pbct_cnt,               -- 공고 횟수 (유찰 횟수)
  v.metadata->>'dpstRt'                             AS dpst_rt,                -- 보증금률 (%)

  -- ── 집행/위탁 기관 ──
  v.metadata->>'orgNm'                              AS org_nm,                 -- 기관명 (캠코 서울본부 등)
  v.metadata->>'orgCd'                              AS org_cd,                 -- 기관코드
  v.metadata->>'sbOfcNm'                            AS sb_ofc_nm,              -- 지사/사업소명
  v.metadata->>'cmsCmmFlnm'                         AS cms_cmm_flnm,           -- 수수료 위원 성명 (위탁사 담당자)
  v.metadata->>'cmsCmmTelNo'                        AS cms_cmm_tel_no,         -- 수수료 위원 전화번호

  -- ── 명도/점유 관련 ──
  v.metadata->>'evctRspbYn'                         AS evct_rspb_yn,           -- 명도책임 여부 (Y/N)
  v.metadata->>'prtcRltDocYn'                       AS prtc_rlt_doc_yn,        -- 권리관계 서류 여부

  -- ── 이미지/URL ──
  v.metadata->>'thnlImgUrlAdr'                      AS thnl_img_url,           -- 썸네일 이미지 URL
  v.metadata->>'dtlInqScrUrl'                       AS dtl_inq_scr_url,        -- 온비드 상세조회 URL (바로가기)

  -- ── 기타 보조 필드 ──
  v.metadata->>'pvctTrgtYn'                         AS pvct_trgt_yn,           -- 사건(분쟁) 대상 여부
  v.metadata->>'rn'                                 AS rn,                     -- 행 번호 (Row Number)
  v.metadata->>'itrnetBidYn'                        AS itrnet_bid_yn,          -- 인터넷 입찰 가능 여부
  v.metadata->>'ldCd'                               AS ld_cd,                  -- 지목코드
  v.metadata->>'ldKnd'                              AS ld_knd,                 -- 지목종류 (대/전/답/임야 등)

  -- ── 전체 원본 메타데이터 (디버깅 및 확장용) ──
  v.metadata                                        AS raw_metadata

FROM public.vacancies v
WHERE v.trade_type = '경매'
  AND v.status = 'ACTIVE'
ORDER BY v.created_at DESC;

-- STEP 5.1: 뷰에 대한 코멘트
COMMENT ON VIEW public.v_onbid_auctions IS '온비드 경공매 매물 전용 조회 뷰.
metadata JSONB에서 50여 개 필드를 정규 컬럼처럼 꺼내어 조회할 수 있습니다.
활성(ACTIVE) 상태의 경매 매물만 필터링됩니다.';


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6: 만료 매물 자동 정리를 위한 DB 함수 (선택적 적용)
--         Supabase Edge Functions 또는 pg_cron과 연동 가능
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cleanup_expired_onbid()
RETURNS TABLE(cleaned_count int) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count int := 0;
BEGIN
  UPDATE public.vacancies
  SET status = 'INACTIVE',
      updated_at = now()
  WHERE trade_type = '경매'
    AND status = 'ACTIVE'
    AND metadata->>'source_type' = 'ONBID'
    AND metadata->>'bid_end_date' IS NOT NULL
    AND (metadata->>'bid_end_date')::timestamp + interval '9 hours' < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RAISE NOTICE '🧹 만료된 온비드 경공매 매물 %건 정리 완료', v_count;
  
  RETURN QUERY SELECT v_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_onbid IS '입찰 기간이 종료된 온비드 경공매 매물을 
자동으로 INACTIVE 상태로 전환하는 정리 함수.
사용법: SELECT * FROM cleanup_expired_onbid();';


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 7: 온비드 통계 요약 함수 (대시보드용)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_onbid_stats()
RETURNS TABLE(
  total_active bigint,
  total_inactive bigint,
  avg_appraisal_price bigint,
  avg_lowest_bid_price bigint,
  avg_discount_rate numeric,
  by_sido jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT count(*) FROM vacancies WHERE trade_type='경매' AND status='ACTIVE')::bigint,
    (SELECT count(*) FROM vacancies WHERE trade_type='경매' AND status='INACTIVE')::bigint,
    COALESCE((SELECT avg((metadata->>'appraisal_price')::bigint) FROM vacancies WHERE trade_type='경매' AND status='ACTIVE' AND metadata->>'appraisal_price' IS NOT NULL), 0)::bigint,
    COALESCE((SELECT avg((metadata->>'lowest_bid_price')::bigint) FROM vacancies WHERE trade_type='경매' AND status='ACTIVE' AND metadata->>'lowest_bid_price' IS NOT NULL), 0)::bigint,
    COALESCE((SELECT avg((metadata->>'discount_rate')::numeric) FROM vacancies WHERE trade_type='경매' AND status='ACTIVE' AND metadata->>'discount_rate' IS NOT NULL), 0),
    COALESCE((
      SELECT jsonb_object_agg(sido, cnt)
      FROM (
        SELECT sido, count(*)::int AS cnt
        FROM vacancies
        WHERE trade_type='경매' AND status='ACTIVE'
        GROUP BY sido
        ORDER BY cnt DESC
      ) sub
    ), '{}'::jsonb);
END;
$$;

COMMENT ON FUNCTION public.get_onbid_stats IS '온비드 경공매 매물 전체 통계를 한번에 조회하는 대시보드용 함수.
사용법: SELECT * FROM get_onbid_stats();';


-- ─────────────────────────────────────────────────────────────────────────────
-- ✅ 실행 완료 확인 쿼리 (아래를 실행하여 적용 결과를 확인하세요)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. metadata 컬럼 존재 확인
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'vacancies' AND column_name = 'metadata';

-- 2. 온비드 매물 전체 조회 (뷰 사용)
-- SELECT * FROM v_onbid_auctions LIMIT 10;

-- 3. 특정 필드로 필터링 예시 (감정가 1억 이상 물건)
-- SELECT * FROM v_onbid_auctions WHERE appraisal_price >= 100000000;

-- 4. 온비드 통계 대시보드
-- SELECT * FROM get_onbid_stats();

-- 5. 만료 매물 수동 정리
-- SELECT * FROM cleanup_expired_onbid();
