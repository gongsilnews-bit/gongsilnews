-- registerIncomingInquiry(외부 유입 접수)가 insert 하는 컬럼들이 테이블에 없었다.
-- 전단지 유입용으로 만들어져 있었지만 실제로 호출된 적이 없어서, 스키마와 코드가
-- 어긋난 채로 남아 있다가 물건접수장에서 처음 부르면서 드러났다.
--
-- client_role 은 고객문의 표(CustomerSection)가 [고객유형] 칸에 읽는 값인데
-- 마찬가지로 없었다.
--
-- 외래키는 일부러 걸지 않는다. 참조 대상이 지워졌다고 접수가 통째로 실패하면
-- 안 된다 — 접수는 무슨 일이 있어도 받는 쪽이 맞다.
alter table crm_customers add column if not exists is_registered_member boolean default false;
alter table crm_customers add column if not exists target_vacancy_id uuid;
alter table crm_customers add column if not exists source_flyer_id     uuid;
alter table crm_customers add column if not exists client_role         text;

comment on column crm_customers.is_registered_member is '접수자가 공실뉴스 가입 회원인지';
comment on column crm_customers.target_vacancy_id    is '특정 공실을 보고 들어온 경우 그 공실 id';
comment on column crm_customers.source_flyer_id      is '전단지·접수장 등 유입 매체 id';
comment on column crm_customers.client_role          is '고객유형 (임대인/임차인 등)';
