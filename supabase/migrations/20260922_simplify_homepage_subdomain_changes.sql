ALTER TABLE public.homepage_settings
  ADD COLUMN IF NOT EXISTS subdomain_change_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subdomain_changed_at TIMESTAMPTZ;

ALTER TABLE public.homepage_settings
  DROP CONSTRAINT IF EXISTS homepage_settings_subdomain_change_count_check;

ALTER TABLE public.homepage_settings
  ADD CONSTRAINT homepage_settings_subdomain_change_count_check
  CHECK (subdomain_change_count >= 0);

-- The approval workflow was replaced by three immediate changes followed by a 3-month cooldown.
DROP TABLE IF EXISTS public.homepage_subdomain_change_requests;
