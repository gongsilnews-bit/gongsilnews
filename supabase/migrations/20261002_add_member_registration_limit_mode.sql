-- 회원별 등록 한도를 등급 기본값과 분리해 관리할지 명시한다.
-- false(기본): 등급별 한도 변경을 따라간다.
-- true: 공실·기사·강의 한도를 회원별 값으로 유지하고 등급별 일괄 적용에서 제외한다.
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS use_custom_registration_limits boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.members.use_custom_registration_limits IS
  'true이면 max_vacancies, max_articles_per_month, max_lectures를 등급별 일괄 적용에서 제외하고 회원별 값으로 유지';

-- 이 기능이 추가되기 전에 등급 정책과 회원별 저장값이 이미 어긋난 회원이 있다.
-- 기존 회원은 모두 등급별 적용(false)으로 시작하므로 현재 point_settings 값을 한 번
-- 내려 주어 정책만 4이고 회원은 20인 것 같은 불일치를 함께 정리한다.
WITH policy AS (
  SELECT
    COALESCE(MAX(value) FILTER (WHERE key = 'LIMIT_USER_VACANCY'), 10)::integer AS user_vacancy,
    COALESCE(MAX(value) FILTER (WHERE key = 'LIMIT_USER_ARTICLE'), 0)::integer AS user_article,
    COALESCE(MAX(value) FILTER (WHERE key = 'LIMIT_USER_LECTURE'), 0)::integer AS user_lecture,
    COALESCE(MAX(value) FILTER (WHERE key = 'LIMIT_REALTOR_FREE_VACANCY'), 10)::integer AS realtor_free_vacancy,
    COALESCE(MAX(value) FILTER (WHERE key = 'LIMIT_REALTOR_FREE_ARTICLE'), 0)::integer AS realtor_free_article,
    COALESCE(MAX(value) FILTER (WHERE key = 'LIMIT_REALTOR_FREE_LECTURE'), 0)::integer AS realtor_free_lecture,
    COALESCE(MAX(value) FILTER (WHERE key = 'LIMIT_REALTOR_STUDY_VACANCY'), 20)::integer AS realtor_study_vacancy,
    COALESCE(MAX(value) FILTER (WHERE key = 'LIMIT_REALTOR_STUDY_ARTICLE'), 4)::integer AS realtor_study_article,
    COALESCE(MAX(value) FILTER (WHERE key = 'LIMIT_REALTOR_STUDY_LECTURE'), 3)::integer AS realtor_study_lecture,
    COALESCE(MAX(value) FILTER (WHERE key = 'LIMIT_REALTOR_NEWS_VACANCY'), 50)::integer AS realtor_news_vacancy,
    COALESCE(MAX(value) FILTER (WHERE key = 'LIMIT_REALTOR_NEWS_ARTICLE'), 4)::integer AS realtor_news_article,
    COALESCE(MAX(value) FILTER (WHERE key = 'LIMIT_REALTOR_NEWS_LECTURE'), 3)::integer AS realtor_news_lecture,
    COALESCE(MAX(value) FILTER (WHERE key = 'LIMIT_BIZ_VACANCY'), 0)::integer AS biz_vacancy,
    COALESCE(MAX(value) FILTER (WHERE key = 'LIMIT_BIZ_ARTICLE'), 10)::integer AS biz_article,
    COALESCE(MAX(value) FILTER (WHERE key = 'LIMIT_BIZ_LECTURE'), 3)::integer AS biz_lecture
  FROM public.point_settings
)
UPDATE public.members AS member
SET
  max_vacancies = CASE
    WHEN member.role = 'USER' THEN policy.user_vacancy
    WHEN member.role = 'BIZ' THEN policy.biz_vacancy
    WHEN member.plan_type = 'news_premium' THEN policy.realtor_news_vacancy
    WHEN member.plan_type = 'study_premium' THEN policy.realtor_study_vacancy
    ELSE policy.realtor_free_vacancy
  END,
  max_articles_per_month = CASE
    WHEN member.role = 'USER' THEN policy.user_article
    WHEN member.role = 'BIZ' THEN policy.biz_article
    WHEN member.plan_type = 'news_premium' THEN policy.realtor_news_article
    WHEN member.plan_type = 'study_premium' THEN policy.realtor_study_article
    ELSE policy.realtor_free_article
  END,
  max_lectures = CASE
    WHEN member.role = 'USER' THEN policy.user_lecture
    WHEN member.role = 'BIZ' THEN policy.biz_lecture
    WHEN member.plan_type = 'news_premium' THEN policy.realtor_news_lecture
    WHEN member.plan_type = 'study_premium' THEN policy.realtor_study_lecture
    ELSE policy.realtor_free_lecture
  END
FROM policy
WHERE member.role IN ('USER', 'BIZ', 'REALTOR')
  AND member.use_custom_registration_limits = false;
