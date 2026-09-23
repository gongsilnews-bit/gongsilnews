-- 고객문의 목록의 "최근 문의" 를 컬럼으로 못 박는다.
--
-- 지금은 목록을 그릴 때마다 그 부동산 고객을 전부 불러오고, 그 id 를 한 줄에
-- 붙여 crm_logs 를 조회한 다음, 로그 1,000건까지만 보고 앱에서 정렬한다.
-- 접수가 쌓이면 세 가지가 차례로 터진다.
--
--   수백 건   목록이 느려진다
--   1,000건   제한을 넘은 고객은 최근 문의가 비어 뒤로 밀린다.
--             오늘 들어온 문의를 중개사가 못 본다
--   수천 건   id 를 전부 붙인 요청이 길이 제한을 넘어 조회가 실패한다
--
-- 컬럼 하나면 셋 다 없어진다. 목록은 이 컬럼으로 정렬만 하면 되고,
-- crm_logs 조회는 통째로 사라진다.

ALTER TABLE public.crm_customers
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.crm_customers.last_contact_at IS '마지막으로 접촉한 시각. crm_logs 가 쌓일 때 트리거가 올린다';

CREATE INDEX IF NOT EXISTS crm_customers_agency_last_contact_idx
  ON public.crm_customers (agency_id, last_contact_at DESC);

-- 기록을 넣는 곳이 코드 다섯 군데다. 한 곳만 빠뜨려도 그 고객은 목록에서
-- 조용히 뒤로 밀린다. 어디서 넣든 항상 맞도록 DB 가 직접 올린다.
CREATE OR REPLACE FUNCTION public.crm_touch_last_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.crm_customers
     SET last_contact_at = GREATEST(last_contact_at, NEW.created_at)
   WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_logs_touch_last_contact ON public.crm_logs;
CREATE TRIGGER crm_logs_touch_last_contact
  AFTER INSERT ON public.crm_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.crm_touch_last_contact();

-- 이미 있는 고객은 마지막 기록 시각으로, 기록이 없으면 등록일로 채운다.
UPDATE public.crm_customers c
   SET last_contact_at = GREATEST(c.created_at, COALESCE(l.last_at, c.created_at))
  FROM (
    SELECT customer_id, MAX(created_at) AS last_at
      FROM public.crm_logs
     GROUP BY customer_id
  ) l
 WHERE l.customer_id = c.id;

UPDATE public.crm_customers
   SET last_contact_at = created_at
 WHERE last_contact_at IS NULL;
