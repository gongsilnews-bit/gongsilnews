import { getArticleDetail } from "@/app/actions/article";
import { getHomepageSettingsBySubdomain } from "@/app/actions/homepage";
import { createClient } from "@supabase/supabase-js";
import { isPermissionAlive } from "@/utils/planCheck";

/**
 * 중개사 서브도메인에서 기사 한 건을 띄우는 데 필요한 것들을 모은다.
 * PC 팝업과 폰 화면이 같은 데이터를 쓰므로 여기 한 군데서 읽는다.
 *
 * 포털 기사 화면(NewsReadContent)을 그대로 쓰되 사이드바의 [많이 본 뉴스]는 끈다.
 * 읽던 사람을 다른 기사로 보내는 자리라 중개사 홈페이지에서는 쓸 일이 없다.
 * 그래서 목록을 불러오는 조회도 하지 않는다 — 팝업이 그만큼 빨리 뜬다.
 */
export async function loadSubdomainArticle(subdomain: string, articleId: string) {
  const [siteRes, articleRes] = await Promise.all([
    getHomepageSettingsBySubdomain(subdomain),
    getArticleDetail(articleId, true),
  ]);

  if (!siteRes.success || !siteRes.data) {
    return { site: null, article: null, authorRole: null, authorEmail: null, attachedVacancy: null };
  }

  const ownerId = siteRes.data.member?.id;
  const article = articleRes.success && articleRes.data ? articleRes.data : null;

  // 남의 기사를 자기 주소로 띄우지 못하게 막는다
  if (!article || article.author_id !== ownerId) {
    return { site: siteRes.data, article: null, authorRole: null, authorEmail: null, attachedVacancy: null };
  }

  // 기사에 붙여둔 공실 매물(스냅샷). 포털 기사 화면과 같은 방식으로 꺼낸다.
  let attachedVacancy: any = null;
  if (Array.isArray(article.article_media)) {
    const attached = article.article_media.find(
      (m: any) =>
        (m.media_type === "FILE" && m.filename === "ATTACHED_VACANCY") || m.media_type === "ATTACHED_VACANCY"
    );
    if (attached?.caption) {
      try {
        attachedVacancy = JSON.parse(attached.caption);
      } catch {
        attachedVacancy = null;
      }
    }
  }

  let authorRole: string | null = null;
  let authorEmail: string | null = null;
  if (article.author_id) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: member } = await supabase
      .from("members")
      .select("role, email, plan_type, plan_end_date, can_article_vacancy_banner")
      .eq("id", article.author_id)
      .single();
    if (member) {
      authorRole = member.role;
      authorEmail = member.email;
    /*
     * 작성자가 권한을 잃었으면 추천 공실을 내린다. 저장된 스냅샷은 그대로
     * 두므로 재결제하면 손대지 않아도 다시 붙는다.
     */
      if (!isPermissionAlive(member, member.can_article_vacancy_banner)) attachedVacancy = null;
    }
  }

  return { site: siteRes.data, article, authorRole, authorEmail, attachedVacancy };
}
