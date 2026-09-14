ALTER TABLE public.lectures
ADD COLUMN IF NOT EXISTS sidebar_copy jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.lectures.sidebar_copy IS 'Lecture-specific enrollment benefits and assurance copy';
NOTIFY pgrst, 'reload schema';
