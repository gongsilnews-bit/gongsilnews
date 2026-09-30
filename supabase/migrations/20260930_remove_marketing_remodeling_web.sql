-- 공실마케팅의 웹 외관 리모델링 시뮬레이터 폐기.
-- 프로젝트 보관 테이블은 다른 마케팅 도구와 공유하므로 테이블은 유지하고
-- 웹 시뮬레이터가 저장한 행만 정확히 삭제한다.
DO $cleanup$
BEGIN
  IF to_regclass('public.ai_drafts') IS NOT NULL THEN
    EXECUTE $sql$
      DELETE FROM public.ai_drafts
      WHERE lower(btrim(coalesce(subtitle, ''))) = 'remodeling'
    $sql$;
  END IF;

  IF to_regclass('public.marketing_projects') IS NOT NULL THEN
    EXECUTE $sql$
      DELETE FROM public.marketing_projects
      WHERE lower(btrim(coalesce(app_type, ''))) = 'remodeling'
    $sql$;
  END IF;
END
$cleanup$;
