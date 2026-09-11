import { notFound } from "next/navigation";
import { getArticleDetail, getArticles } from "@/app/actions/article";
import { createClient } from "@supabase/supabase-js";
import NewsReadContent from "@/components/NewsReadContent";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewsReadPage({ params }: { params: Promise<{ article_id: string }> }) {
  const resolvedParams = await params;
  const articleId = typeof resolvedParams.article_id === "string" ? resolvedParams.article_id : null;

  if (!articleId) {
    notFound();
  }

  // 서버에서 미리 데이터 가져오기 — 즉시 표시!
  let article = null;
  let popular: any[] = [];

  if (articleId) {
    const [articleRes, popularRes] = await Promise.all([
      getArticleDetail(articleId, true),
      getArticles({ status: "APPROVED", limit: 50, noCache: true }),
    ]);

    if (articleRes.success && articleRes.data) {
      article = articleRes.data;
    }

    if (popularRes.success && popularRes.data) {
      popular = [...popularRes.data]
        .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        .slice(0, 5);
    }
  }

  // 기사 없음
  if (!article) {
    return (
      <main className="container px-20" style={{ padding: "100px 0", textAlign: "center", color: "#888" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>기사를 찾을 수 없습니다.</div>
        <div style={{ fontSize: 14, color: "#aaa", marginBottom: 24 }}>삭제되었거나 존재하지 않는 기사입니다.</div>
      </main>
    );
  }

  let authorRole = null;
  let authorEmail = null;
  let attachedVacancy = null;

  // ⚡ 기사에 연결된 공실 매물(스냅샷) 추출 - 추가 DB 쿼리 0건!
  if (article?.article_media && Array.isArray(article.article_media)) {
    const attachedMedia = article.article_media.find(
      (m: any) =>
        (m.media_type === "FILE" && m.filename === "ATTACHED_VACANCY") ||
        m.media_type === "ATTACHED_VACANCY"
    );
    if (attachedMedia?.caption) {
      try {
        attachedVacancy = JSON.parse(attachedMedia.caption);
      } catch (e) {
        attachedVacancy = null;
      }
    }
  }

  if (article && article.author_id) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    
    const { data: member } = await supabase.from("members").select("role, email").eq("id", article.author_id).single();
    if (member) {
      authorRole = member.role;
      authorEmail = member.email;
    }
  }

  return (
    <NewsReadContent
      article={article}
      popularArticles={popular}
      initialAuthorRole={authorRole}
      initialAuthorEmail={authorEmail}
      initialAttachedVacancy={attachedVacancy}
    />
  );
}
