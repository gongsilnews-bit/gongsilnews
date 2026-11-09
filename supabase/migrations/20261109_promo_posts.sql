-- 공실뉴스 회사 홍보 기록 — 홍보 달력·홍보현황 (2026-11-09, docs/2026-11-09_superadmin_page_plan.md ② 공실뉴스 홍보)
-- Supabase SQL Editor 에서 실행
-- 채널: youtube · blog · instagram · threads · facebook · kakao
-- ref_code: 그 글 링크에 붙인 꼬리표 (?ref=…) — 가입하면 members.signup_ref 에 같은 값이 들어간다

create table if not exists public.promo_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  posted_on date not null,
  channel text not null,
  title text,
  url text,
  memo text,
  created_by uuid references auth.users(id) on delete set null,
  ref_code text
);

create index if not exists promo_posts_posted_on_idx on public.promo_posts (posted_on);
create index if not exists promo_posts_ref_code_idx on public.promo_posts (ref_code);

-- 서버(service role)만 읽고 쓴다 — 브라우저에서 바로 읽지 않게 정책 없이 RLS 만 켠다
alter table public.promo_posts enable row level security;
