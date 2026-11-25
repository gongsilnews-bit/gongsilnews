-- 고객관리(CRM) — 전국 부동산 명단 · 꼬리표 · 있었던 일 · 캠페인 (2026-11-25, docs/2026-11-25_crm_contacts_plan.md)
-- Supabase SQL Editor 에서 실행하세요. 여러 번 실행해도 괜찮습니다.
-- 개인정보: RLS 를 켜고 정책을 두지 않는다 → 화면(anon·로그인 사용자)은 못 읽고, 최고관리자 서버 기능(service role)만 읽고 쓴다.

-- ① 사람 카드 (휴대폰 하나 = 한 줄)
create table if not exists public.crm_contacts (
  id bigint generated always as identity primary key,
  phone text not null unique,                       -- 01012345678 한 모양
  name text,                                        -- 대표자·이름
  office_name text,                                 -- 상호
  sido text,
  sigungu text,
  address text,
  sms_status text not null default '보내지않음'
    check (sms_status in ('보냄가능', '확인전', '보내지않음', '수신거부', '쉬는중', '번호오류')),
  rest_until date,                                  -- 쉬는중 끝나는 날
  no_reply_streak int not null default 0,           -- 연속으로 반응 없던 문자 수
  member_id uuid,                                   -- 공실뉴스 가입했으면 members.id (자동)
  member_grade text,                                -- 부동산회원 · 공실뉴스부동산 · 비즈니스회원 · 일반회원 (자동)
  paid_until date,                                  -- 공실뉴스부동산 만기 (자동)
  last_sent_at timestamptz,
  last_reaction_at timestamptz,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists crm_contacts_status_idx on public.crm_contacts (sms_status);
create index if not exists crm_contacts_region_idx on public.crm_contacts (sido, sigungu);
create index if not exists crm_contacts_member_idx on public.crm_contacts (member_id) where member_id is not null;

-- ② 꼬리표 (한 사람에 여러 개)
create table if not exists public.crm_contact_tags (
  contact_id bigint not null references public.crm_contacts(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  primary key (contact_id, tag)
);
create index if not exists crm_contact_tags_tag_idx on public.crm_contact_tags (tag);

-- ③ 캠페인 (보낸 문자 한 번의 묶음)
create table if not exists public.crm_campaigns (
  id bigint generated always as identity primary key,
  name text not null,                               -- 예: 11월 사전모집 1차
  content text,
  filter jsonb not null default '{}'::jsonb,        -- 고른 조건
  message_log_id uuid,                              -- message_logs.id
  sent_count int not null default 0,
  click_count int not null default 0,
  signup_count int not null default 0,
  paid_count int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- ④ 있었던 일 (날짜순으로 쌓임)
create table if not exists public.crm_contact_events (
  id bigint generated always as identity primary key,
  contact_id bigint not null references public.crm_contacts(id) on delete cascade,
  kind text not null
    check (kind in ('가져옴', '문자보냄', '문자실패', '링크누름', '답장', '전화', '가입', '등급바뀜', '결제', '만기끝남', '수신거부', '상태바뀜', '메모')),
  campaign_id bigint references public.crm_campaigns(id) on delete set null,
  detail text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists crm_contact_events_contact_idx on public.crm_contact_events (contact_id, created_at desc);
create index if not exists crm_contact_events_campaign_idx on public.crm_contact_events (campaign_id) where campaign_id is not null;

-- ⑤ 사람마다 다른 짧은 링크 (누가 눌렀는지 → 링크누름 · 반응)
create table if not exists public.crm_links (
  code text primary key,                            -- /api/r/<code>
  contact_id bigint not null references public.crm_contacts(id) on delete cascade,
  campaign_id bigint references public.crm_campaigns(id) on delete cascade,
  url text not null,
  clicked_at timestamptz,
  click_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists crm_links_campaign_idx on public.crm_links (campaign_id);

-- ⑥ 저장 문자 (자주 쓰는 글 — 어느 PC 에서나 같이 보임)
create table if not exists public.crm_templates (
  id bigint generated always as identity primary key,
  title text not null,
  content text not null,
  link text,
  used_count int not null default 0,
  last_used_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 잠금
alter table public.crm_templates enable row level security;
alter table public.crm_contacts enable row level security;
alter table public.crm_contact_tags enable row level security;
alter table public.crm_campaigns enable row level security;
alter table public.crm_contact_events enable row level security;
alter table public.crm_links enable row level security;

-- 숫자 모음 (화면 맨 위 · 꼬리표 고르기)
create or replace view public.crm_tag_counts as
  select tag, count(*)::int as n from public.crm_contact_tags group by tag;
create or replace view public.crm_status_counts as
  select sms_status, count(*)::int as n from public.crm_contacts group by sms_status;
create or replace view public.crm_sido_counts as
  select coalesce(sido, '(모름)') as sido, count(*)::int as n from public.crm_contacts group by 1;
create or replace view public.crm_campaign_stats as
  select c.id, c.name, c.content, c.filter, c.message_log_id, c.created_at, c.sent_count,
    (select count(*) from public.crm_links l where l.campaign_id = c.id and l.clicked_at is not null)::int as click_count,
    (select count(distinct e.contact_id) from public.crm_contact_events e
      where e.kind = '가입' and e.created_at >= c.created_at
        and exists (select 1 from public.crm_contact_events s where s.contact_id = e.contact_id and s.campaign_id = c.id and s.kind = '문자보냄'))::int as signup_count,
    (select count(*) from public.crm_contacts t
      where t.sms_status = '쉬는중' and exists (select 1 from public.crm_contact_events s where s.contact_id = t.id and s.campaign_id = c.id))::int as resting_count
  from public.crm_campaigns c;

-- 문자 보낸 뒤 한 번에: 보낸 때 · 연속 무반응 +1 · 3번째면 90일 쉬는중 · 기록
create or replace function public.crm_mark_sent(p_ids bigint[], p_campaign bigint)
returns void language sql as $$
  update public.crm_contacts set
    last_sent_at = now(),
    no_reply_streak = no_reply_streak + 1,
    sms_status = case when no_reply_streak + 1 >= 3 and sms_status = '보냄가능' then '쉬는중' else sms_status end,
    rest_until = case when no_reply_streak + 1 >= 3 and sms_status = '보냄가능' then (current_date + 90) else rest_until end,
    updated_at = now()
  where id = any(p_ids);
  insert into public.crm_contact_events (contact_id, kind, campaign_id)
    select unnest(p_ids), '문자보냄', p_campaign;
$$;

-- 반응 (링크 누름 · 답장 · 전화 …): 연속 무반응 0 · 쉬는중이면 다시 보냄가능
create or replace function public.crm_mark_reaction(p_contact bigint, p_kind text, p_campaign bigint, p_detail text)
returns void language sql as $$
  update public.crm_contacts set
    last_reaction_at = now(), no_reply_streak = 0,
    sms_status = case when sms_status = '쉬는중' then '보냄가능' else sms_status end,
    rest_until = case when sms_status = '쉬는중' then null else rest_until end,
    updated_at = now()
  where id = p_contact;
  insert into public.crm_contact_events (contact_id, kind, campaign_id, detail) values (p_contact, p_kind, p_campaign, p_detail);
$$;

-- 쉬는 기간이 끝난 사람은 다시 보냄가능
create or replace function public.crm_wake_rested()
returns int language sql as $$
  with w as (
    -- 연속 무반응을 2 로 두어 한 번 더 보냈는데 반응 없으면 바로 다시 쉬는중
    update public.crm_contacts set sms_status = '보냄가능', rest_until = null, no_reply_streak = 2, updated_at = now()
    where sms_status = '쉬는중' and rest_until is not null and rest_until <= current_date returning 1
  ) select count(*)::int from w;
$$;

-- 화면(anon·로그인 사용자)은 못 읽고 못 부르게 — 서버(service role)만
revoke all on public.crm_tag_counts, public.crm_status_counts, public.crm_sido_counts, public.crm_campaign_stats from anon, authenticated;
revoke all on function public.crm_mark_sent(bigint[], bigint) from public, anon, authenticated;
revoke all on function public.crm_mark_reaction(bigint, text, bigint, text) from public, anon, authenticated;
revoke all on function public.crm_wake_rested() from public, anon, authenticated;
grant execute on function public.crm_mark_sent(bigint[], bigint) to service_role;
grant execute on function public.crm_mark_reaction(bigint, text, bigint, text) to service_role;
grant execute on function public.crm_wake_rested() to service_role;
