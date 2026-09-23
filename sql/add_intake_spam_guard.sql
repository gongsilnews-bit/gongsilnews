-- 접수 폼 스팸 방어에 쓸 칸과 색인.
--
-- IP 는 원본으로 쌓지 않는다. 개인정보라 그대로 두면 지켜야 할 것이 하나 더 는다.
-- 해시로 넣으면 "같은 곳에서 또 왔는가"는 알 수 있고 누구인지는 알 수 없다.

ALTER TABLE public.crm_customers
  ADD COLUMN IF NOT EXISTS submit_ip_hash TEXT;

COMMENT ON COLUMN public.crm_customers.submit_ip_hash IS '접수 당시 접속 정보의 해시 (스팸 방지 전용, 원본 IP 는 저장하지 않는다)';

-- 같은 번호가 방금 또 들어왔는지 보는 조회
CREATE INDEX IF NOT EXISTS idx_crm_agency_phone_created
  ON public.crm_customers (agency_id, phone, created_at DESC);

-- 같은 곳에서 얼마나 들어왔는지 보는 조회
CREATE INDEX IF NOT EXISTS idx_crm_ip_created
  ON public.crm_customers (submit_ip_hash, created_at DESC);

-- 한 홈페이지의 하루 접수량을 보는 조회
CREATE INDEX IF NOT EXISTS idx_crm_agency_created
  ON public.crm_customers (agency_id, created_at DESC);
