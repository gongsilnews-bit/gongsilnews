-- 주소록 2 — 뿌리오 주소록처럼 · 지역별(시도 › 시군구 › 동) (2026-11-25, docs/2026-11-25_crm_contacts_plan.md)
-- Supabase SQL Editor 에서 실행하세요. 여러 번 실행해도 괜찮습니다. (20261125_crm.sql 다음)

alter table public.crm_contacts add column if not exists fax text;     -- 팩스
alter table public.crm_contacts add column if not exists tel text;     -- 일반전화
alter table public.crm_contacts add column if not exists email text;
alter table public.crm_contacts add column if not exists dong text;    -- 동·읍·면 (주소에서)
create index if not exists crm_contacts_region3_idx on public.crm_contacts (sido, sigungu, dong);

-- 왼쪽 지역 폴더: 시도 › 시군구 › 동
create or replace view public.crm_region_counts as
  select coalesce(sido, '(모름)') as sido, coalesce(sigungu, '(모름)') as sigungu, coalesce(dong, '(모름)') as dong, count(*)::int as n
  from public.crm_contacts group by 1, 2, 3;

-- 공실뉴스 회원 수
create or replace view public.crm_member_counts as
  select coalesce(member_grade, '가입 안 함') as grade, count(*)::int as n from public.crm_contacts group by 1;

-- 그룹 이름 바꾸기 (꼬리표 한 번에) — 새 이름이 이미 있는 사람은 겹치지 않게
create or replace function public.crm_rename_tag(p_old text, p_new text)
returns int language sql as $$
  with ins as (
    insert into public.crm_contact_tags (contact_id, tag)
      select contact_id, p_new from public.crm_contact_tags where tag = p_old
    on conflict do nothing returning 1
  ), del as (
    delete from public.crm_contact_tags where tag = p_old returning 1
  ) select count(*)::int from del;
$$;

revoke all on public.crm_region_counts, public.crm_member_counts from anon, authenticated;
revoke all on function public.crm_rename_tag(text, text) from public, anon, authenticated;
grant execute on function public.crm_rename_tag(text, text) to service_role;
