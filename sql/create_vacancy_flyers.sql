-- sql/create_vacancy_flyers.sql
-- Run this SQL query in your Supabase SQL Editor to create the vacancy_flyers table.

CREATE TABLE IF NOT EXISTS public.vacancy_flyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vacancy_id UUID NOT NULL UNIQUE REFERENCES public.vacancies(id) ON DELETE CASCADE,
    flyer_state JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (Row Level Security) if needed or set proper policies
ALTER TABLE public.vacancy_flyers ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all access for service role / admin, and select/insert/update/delete for authenticated users
CREATE POLICY "Allow all operations for everyone" ON public.vacancy_flyers
    FOR ALL USING (true) WITH CHECK (true);
