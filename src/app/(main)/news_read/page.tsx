import { getArticleDetail, getArticles } from "@/app/actions/article";
import NewsReadContent from "@/components/NewsReadContent";

export default async function NewsReadPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedParams = await searchParams;
  const articleId = typeof resolvedParams.article_id === "string" ? resolvedParams.article_id : null;

  // 서버에서 미리 데이터 가져오기 — 즉시 표시!
  let article = null;
  let popular: any[] = [];

  if (articleId) {
    const [articleRes, popularRes] = await Promise.all([
      getArticleDetail(articleId),
      getArticles({ status: "APPROVED", limit: 50 }),
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

  return <NewsReadContent article={article} popularArticles={popular} />;
}
