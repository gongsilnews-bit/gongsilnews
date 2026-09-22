CREATE TABLE IF NOT EXISTS public.homepage_subdomain_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  current_subdomain TEXT NOT NULL,
  requested_subdomain TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  reviewed_by UUID REFERENCES public.members(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS homepage_subdomain_change_requests_one_pending
  ON public.homepage_subdomain_change_requests(owner_id)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS homepage_subdomain_change_requests_status_created
  ON public.homepage_subdomain_change_requests(status, created_at DESC);

ALTER TABLE public.homepage_subdomain_change_requests ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.homepage_subdomain_change_requests IS
  'Requests to change a published realtor homepage subdomain after administrator review.';
