-- Create bookmark_categories table
CREATE TABLE public.bookmark_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL, -- 'ARTICLE' or 'VACANCY'
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add category_id to article_bookmarks
ALTER TABLE public.article_bookmarks
ADD COLUMN category_id uuid REFERENCES public.bookmark_categories(id) ON DELETE SET NULL;

-- Add category_id to vacancy_wishlist
ALTER TABLE public.vacancy_wishlist
ADD COLUMN category_id uuid REFERENCES public.bookmark_categories(id) ON DELETE SET NULL;

-- Add RLS policies for bookmark_categories
ALTER TABLE public.bookmark_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own bookmark categories" 
ON public.bookmark_categories 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);