-- 관리자 회원 문자 보낸 기록 (2026-11-09, docs/2026-11-09_superadmin_page_plan.md ③ 회원에게 연락)
-- Supabase SQL Editor 에서 실행하세요.
-- 서버 액션(src/app/actions/adminMessage.ts)이 service role 로 쓰고 읽는다. 화면에서 직접 읽지 않는다.

create table if not exists public.message_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  sent_by uuid,                                   -- 보낸 관리자 (members.id)
  channel text not null default 'sms' check (channel in ('sms', 'kakao')),
  is_ad boolean not null default false,           -- 광고 문자인지
  subject text,
  content text not null,                          -- 실제로 보낸 글 ((광고)·수신거부 문구 포함)
  recipient_count int not null default 0,
  success_count int not null default 0,           -- 뿌리오가 접수한 수
  fail_count int not null default 0,
  recipients jsonb not null default '[]'::jsonb,  -- [{id, name, phone_tail}] 최소한만
  reserved_at timestamptz,                        -- 예약 발송 (지금은 쓰지 않음)
  status text not null default 'sent'             -- sent · partial · failed
);

create index if not exists message_logs_created_at_idx on public.message_logs (created_at desc);

alter table public.message_logs enable row level security;

-- 로그인한 관리자만 읽기 (서버 액션은 service role 이라 RLS 를 거치지 않는다)
drop policy if exists "message_logs_admin_read" on public.message_logs;
create policy "message_logs_admin_read" on public.message_logs
  for select using (
    exists (
      select 1 from public.members m
      where m.id = auth.uid()
        and upper(coalesce(m.role::text, '')) in ('ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', '최고관리자')
    )
  );
