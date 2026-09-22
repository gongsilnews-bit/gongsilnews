-- 요금제 코드값 개명: vacancy_premium → study_premium
--
-- '공실등록부동산'이라는 이름은 실제로 파는 상품 이름이 아니었다.
-- 관리자 화면의 이름을 판매 중인 상품(공실스터디)에 맞춘다.
-- 권한·한도·레벨은 그대로 둔다. 이 파일은 이름만 바꾼다.

UPDATE public.members
   SET plan_type = 'study_premium'
 WHERE plan_type = 'vacancy_premium';

COMMENT ON COLUMN public.members.plan_type IS '무료(free), 공실뉴스부동산(news_premium), 공실스터디부동산(study_premium)';
