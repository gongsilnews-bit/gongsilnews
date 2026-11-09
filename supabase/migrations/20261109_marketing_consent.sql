-- 2026-11-09 마케팅 수신 동의 · 가입 경로 (docs/2026-11-09_superadmin_page_plan.md)
-- Supabase SQL Editor 에서 실행하세요. 여러 번 실행해도 괜찮습니다.

alter table public.members add column if not exists marketing_sms boolean not null default false;     -- 문자 받기 (광고성 정보 수신 동의)
alter table public.members add column if not exists marketing_kakao boolean not null default false;   -- 카카오톡 받기
alter table public.members add column if not exists marketing_agreed_at timestamptz;                  -- 마지막으로 켜고 끈 때 (2년마다 다시 확인 안내용)
alter table public.members add column if not exists signup_ref text;                                  -- 가입 경로: 링크 꼬리표 (?ref= · utm_source/utm_campaign)
alter table public.members add column if not exists signup_landing varchar(300);                      -- 처음 들어온 주소

create index if not exists members_signup_ref_idx on public.members (signup_ref) where signup_ref is not null;
