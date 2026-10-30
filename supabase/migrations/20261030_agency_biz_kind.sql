-- 공실뉴스부동산 회원 구분 — 일반 중개사무소 / 중개법인 (2026-10-30 사장님)
--  결제할 때 요금을 자동으로 가르기 위해서: 일반 = Pro · Studio(5만) / 법인 = Studio 법인(7만, 공실 60 · 기사 월 12)
--  정하는 법: 사업자등록번호 가운데 두 자리가 81·85·86·87·88 이면 법인 (국세청 사업자 구분). 최고관리자가 서류 승인 때 확인·변경
--  칸이 비어 있어도(null) 화면은 사업자등록번호로 판단한다 (src/utils/agencyKind.ts) — 이 SQL 을 늦게 적용해도 깨지지 않음

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS biz_kind text;
ALTER TABLE agencies DROP CONSTRAINT IF EXISTS agencies_biz_kind_check;
ALTER TABLE agencies ADD CONSTRAINT agencies_biz_kind_check CHECK (biz_kind IS NULL OR biz_kind IN ('general', 'corp'));

-- 지금 회원은 사업자등록번호로 한 번에 채운다 (10자리 숫자만 볼 때 4·5번째 자리)
UPDATE agencies
SET biz_kind = CASE
  WHEN length(regexp_replace(coalesce(biz_num, ''), '\D', '', 'g')) = 10
   AND substring(regexp_replace(biz_num, '\D', '', 'g') from 4 for 2) IN ('81', '85', '86', '87', '88')
  THEN 'corp' ELSE 'general' END
WHERE biz_kind IS NULL;
