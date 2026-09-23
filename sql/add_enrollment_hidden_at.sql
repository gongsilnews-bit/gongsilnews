-- 수강생이 [내 강의실] 에서 강의를 빼는 기능.
--
-- 지우지 않고 숨긴다. 포인트로 산 수강을 지워버리면 다시 신청할 때 포인트가
-- 또 빠진다. 낸 값을 두 번 받는 셈이다.
--
-- 숨긴 수강도 자격은 살아 있다. 직접 주소로 들어가면 볼 수 있고, 다시
-- 신청하면 숨김만 풀려 그대로 돌아온다.

ALTER TABLE public.lecture_enrollments
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

COMMENT ON COLUMN public.lecture_enrollments.hidden_at IS '수강생이 내 강의실에서 뺀 시각. 자격은 그대로이고 목록에서만 빠진다';
