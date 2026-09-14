ALTER TABLE public.lecture_lessons
  ADD COLUMN IF NOT EXISTS description text;

NOTIFY pgrst, 'reload schema';
