-- 물건접수장(공개 접수 폼)에서 들어오는 값을 담을 칸 두 개.
--
-- photo_urls  : 접수자가 올린 사진 URL 목록. 선택 항목이라 비어 있을 수 있다.
-- move_in_date: '매물구해요' 로 접수할 때만 받는 입주 희망일.
--               고객문의 표에 [입주일] 열이 이미 있는데 채울 데이터가 없었다.
alter table crm_customers add column if not exists photo_urls text[];
alter table crm_customers add column if not exists move_in_date date;

comment on column crm_customers.photo_urls  is '물건접수장에서 접수자가 첨부한 사진 URL 목록 (선택)';
comment on column crm_customers.move_in_date is '입주 희망일 (매물구해요 접수 시)';
