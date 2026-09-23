-- 강의마다 "이 등급은 공짜로 듣는다" 를 지정한다.
--
-- 지금은 수강료가 0 이면 모두 무료, 0 보다 크면 모두 포인트 차감이다. 등급은
-- 보지 않는다. 그래서 판매 페이지에 적힌 "공실스터디 회원은 무료" 가 실제로는
-- 동작하지 않았다.
--
-- free_for_plans 에 든 등급은 포인트 없이 바로 등록된다. 최고관리자는 목록에
-- 없어도 통과한다.

ALTER TABLE public.lectures
  ADD COLUMN IF NOT EXISTS free_for_plans text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.lectures.free_for_plans IS '포인트 없이 들을 수 있는 등급 목록 (user · realtor_free · study_premium · news_premium · biz_premium)';

-- 요금제로 공짜가 된 수강은 그 요금제가 끝나면 같이 닫혀야 한다. 무엇 때문에
-- 공짜였는지 적어두지 않으면 나중에 가릴 방법이 없다.
ALTER TABLE public.lecture_enrollments
  ADD COLUMN IF NOT EXISTS granted_by_plan text;

COMMENT ON COLUMN public.lecture_enrollments.granted_by_plan IS '등급 덕분에 무료로 등록된 경우 그 등급. 포인트로 산 수강은 비어 있다';

CREATE INDEX IF NOT EXISTS lectures_free_for_plans_idx
  ON public.lectures USING GIN (free_for_plans);
