-- 홍보현황 링크를 회원마다 따로 (2026-10-29 사장님: 경매·공매에도 링크체크)
--  경매·공매 물건은 여러 회원이 같은 물건으로 글을 올린다 — 물건 하나·채널 하나에 링크 하나면 서로 덮어쓴다.
--  (물건, 회원, 채널) 마다 하나로 바꾼다. 내 공실은 원래 회원이 한 명이라 달라지는 것이 없다.
ALTER TABLE vacancy_promos DROP CONSTRAINT IF EXISTS vacancy_promos_vacancy_id_channel_key;
ALTER TABLE vacancy_promos ADD CONSTRAINT vacancy_promos_vacancy_owner_channel_key UNIQUE (vacancy_id, owner_id, channel);
