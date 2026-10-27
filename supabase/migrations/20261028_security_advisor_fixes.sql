-- Supabase 보안 점검(Security Advisor) 오류 고침 (2026-10-28)

-- 1) article_reactions — RLS 가 꺼져 있어 누구나(공개 anon 키로) 읽고·고치고·지울 수 있었다.
--    기사 스티커는 서버(service_role, src/app/actions/reaction.ts)로만 읽고 쓰므로 정책 없이 RLS 만 켠다.
ALTER TABLE public.article_reactions ENABLE ROW LEVEL SECURITY;

-- 2) v_onbid_auctions — 만든 사람 권한(SECURITY DEFINER)으로 돌아 아래 표의 RLS 를 건너뛰었다.
--    보는 사람 권한으로 돌게 바꾼다 (코드에서는 이 뷰를 쓰지 않는다).
ALTER VIEW public.v_onbid_auctions SET (security_invoker = on);

-- 3) spatial_ref_sys 는 PostGIS 가 만든 좌표계 참고표(공개 자료)라 주인이 supabase_admin 이다.
--    우리 쪽에서 RLS 를 켤 수 없고, 들어 있는 것도 공개 좌표계 정보뿐이라 그대로 둔다.
