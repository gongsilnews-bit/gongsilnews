-- 한도 정책 키 개명: LIMIT_REALTOR_VACANCY_* → LIMIT_REALTOR_STUDY_*
--
-- 요금제 이름을 공실스터디부동산으로 바꿨으니 한도 키도 따라간다.
-- point_settings 에 이미 저장된 값(50 / 20)을 그대로 들고 간다.
-- 키만 바꾸고 이 행을 두면, 화면이 새 키를 못 찾아 기본값으로 되돌아간다.

UPDATE public.point_settings
   SET key = 'LIMIT_REALTOR_STUDY_VACANCY'
 WHERE key = 'LIMIT_REALTOR_VACANCY_VACANCY';

UPDATE public.point_settings
   SET key = 'LIMIT_REALTOR_STUDY_ARTICLE'
 WHERE key = 'LIMIT_REALTOR_VACANCY_ARTICLE';
