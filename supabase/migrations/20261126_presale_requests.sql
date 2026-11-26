-- 분양자료 신청 (2026-11-26 사장님 회의: 분양 상세 창 [분양자료 신청하기] — 단지별 관심 고객 접수 현황)
--  1단계: 공실뉴스가 받아 관리자 [분양 신청]에서 단지별로 본다. 연락은 공실뉴스가.
--  분양사(시행사·분양 업무 수행사)에 연락처를 넘기는 것은 "제3자 제공 동의"(선택)를 한 사람만 — 동의 문구·받는 곳을 신청 때 그대로 남긴다
--  보관: 신청일부터 1년 (지난 것은 지운다)
--  Supabase → SQL Editor 에서 실행

CREATE TABLE IF NOT EXISTS presale_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  presale_id text NOT NULL,             -- presale_complexes.id
  presale_name text NOT NULL,           -- 신청 때 단지 이름 (나중에 단지 자료가 바뀌어도 남게)
  name text NOT NULL,
  phone text NOT NULL,
  area_type text,                       -- 관심 평형 "84A" (선택)
  agree_collect boolean NOT NULL,       -- 개인정보 수집·이용 동의 (필수)
  agree_third boolean NOT NULL DEFAULT false,  -- 분양사 제공 동의 (선택)
  third_party text,                     -- 동의한 "제공받는 자" 글 그대로 (예: 경희궁 에피트 사업주체(…) 및 그 분양 업무 수행사)
  consent_text text,                    -- 동의 화면 문구 그대로 (증빙)
  user_id uuid,                         -- 로그인한 회원이면
  status text NOT NULL DEFAULT 'new',   -- new 새 접수 · contacted 연락함 · done 마침
  memo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS presale_requests_presale ON presale_requests (presale_id, created_at DESC);
CREATE INDEX IF NOT EXISTS presale_requests_created ON presale_requests (created_at DESC);
ALTER TABLE presale_requests ENABLE ROW LEVEL SECURITY; -- 서버(서비스 키)만 읽고 쓴다
