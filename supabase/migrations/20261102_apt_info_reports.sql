-- 시세 지도 단지 정보를 부동산이 보완 (2026-11-02 사장님: 전용·공급은 부동산이 가장 잘 안다)
--  apt_info_reports: 한 줄 = 제보 하나
--   source 'vacancy' — 공실등록 때 넣은 공급·전용㎡ (부동산이 따로 할 일 없음, 크론이 모은다)
--   source 'request' — 단지 상세 창 [정보 수정 요청] (승인된 부동산 회원만)
--   status pending(확인 기다림) · approved(반영) · rejected(반영 안 함)
--   공공 자료에 없는 공급면적을 서로 다른 부동산 2곳 이상이 같은 값으로 넣으면 저절로 approved
--  apt_complexes.agent_supply: 반영된 공급면적 {"84.97": 112.4} — 공공 자료(supply_map)보다 우선
--  apt_complexes.agent_info: 반영된 단지 정보 {"households": 160, "parking": 210 …}
--  Supabase → SQL Editor 에서 실행

CREATE TABLE IF NOT EXISTS apt_info_reports (
  id bigserial PRIMARY KEY,
  complex_id text NOT NULL,
  source text NOT NULL CHECK (source IN ('vacancy', 'request')),
  field text NOT NULL,              -- supply(공급면적) · households · dongs · parking · top_floor · heating · hall · builder · etc
  ex_area numeric,                  -- 공급면적일 때 전용㎡
  value text NOT NULL,              -- 맞는 값 (공급면적은 ㎡ 숫자)
  note text,                        -- 근거·설명
  member_id uuid,
  vacancy_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS apt_info_reports_status ON apt_info_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS apt_info_reports_complex ON apt_info_reports (complex_id);
-- 같은 공실의 같은 면적은 한 번만 (크론이 매일 돌아도 쌓이지 않게)
CREATE UNIQUE INDEX IF NOT EXISTS apt_info_reports_vacancy ON apt_info_reports (vacancy_id, field) WHERE vacancy_id IS NOT NULL;

ALTER TABLE apt_info_reports ENABLE ROW LEVEL SECURITY; -- 읽기·쓰기는 서버(서비스 키)만

ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS agent_supply jsonb;
ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS agent_info jsonb;
