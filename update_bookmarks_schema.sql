CREATE TABLE IF NOT EXISTS public.bookmark_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('ARTICLE', 'VACANCY')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.article_bookmarks 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.bookmark_categories(id) ON DELETE SET NULL;

ALTER TABLE public.vacancy_wishlist 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.bookmark_categories(id) ON DELETE SET NULL;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';