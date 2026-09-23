-- 특강 수강안내를 강의별 직접 입력 방식에서 공통 선택 방식으로 전환합니다.
-- 기존 sidebar_copy.assurance_* 값은 고유한 수강안내로 보존하여 연결합니다.

CREATE TABLE IF NOT EXISTS public.lecture_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lecture_guides_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT lecture_guides_title_not_blank CHECK (length(btrim(title)) > 0),
  CONSTRAINT lecture_guides_body_not_blank CHECK (length(btrim(body)) > 0)
);

CREATE INDEX IF NOT EXISTS lecture_guides_active_sort_idx
  ON public.lecture_guides (is_active, sort_order, created_at);

ALTER TABLE public.lectures
  ADD COLUMN IF NOT EXISTS lecture_guide_id uuid
  REFERENCES public.lecture_guides(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS lectures_lecture_guide_id_idx
  ON public.lectures (lecture_guide_id);

-- 기존 강의의 하단 안내를 중복 없이 수강안내 목록으로 옮깁니다.
WITH legacy_guides AS (
  SELECT DISTINCT
    btrim(sidebar_copy ->> 'assurance_title') AS title,
    btrim(sidebar_copy ->> 'assurance_body') AS body
  FROM public.lectures
  WHERE coalesce(btrim(sidebar_copy ->> 'assurance_title'), '') <> ''
    AND coalesce(btrim(sidebar_copy ->> 'assurance_body'), '') <> ''
), numbered AS (
  SELECT title, body, row_number() OVER (ORDER BY title, body) AS guide_no
  FROM legacy_guides
)
INSERT INTO public.lecture_guides (name, title, body, sort_order)
SELECT
  title || CASE WHEN guide_no > 1 THEN ' ' || guide_no::text ELSE '' END,
  title,
  body,
  guide_no::integer
FROM numbered n
WHERE NOT EXISTS (
  SELECT 1
  FROM public.lecture_guides g
  WHERE g.title = n.title AND g.body = n.body
);

UPDATE public.lectures l
SET lecture_guide_id = g.id
FROM public.lecture_guides g
WHERE l.lecture_guide_id IS NULL
  AND g.title = btrim(l.sidebar_copy ->> 'assurance_title')
  AND g.body = btrim(l.sidebar_copy ->> 'assurance_body');

ALTER TABLE public.lecture_guides ENABLE ROW LEVEL SECURITY;

-- 브라우저에서 테이블을 직접 수정하지 않습니다. 모든 작업은 권한을 확인하는
-- 서버 액션과 service role을 통해서만 수행합니다.
REVOKE ALL ON TABLE public.lecture_guides FROM anon, authenticated;

COMMENT ON TABLE public.lecture_guides IS '최고관리자가 작성하고 강의에서 선택하는 공통 수강안내';
COMMENT ON COLUMN public.lectures.lecture_guide_id IS '강의 상세 우측 하단에 표시할 공통 수강안내';
