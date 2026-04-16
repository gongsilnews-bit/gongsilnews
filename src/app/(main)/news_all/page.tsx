import NewsListLayout from "@/components/NewsListLayout";
import { getArticles } from "@/app/actions/article";

export default async function NewsAllPage() {
  // 서버에서 미리 가져오기 — 클라이언트 로딩 없이 즉시 표시!
  const [articlesRes, popularRes, importantRes] = await Promise.all([
    getArticles({ status: "APPROVED" }),
    getArticles({ status: "APPROVED", limit: 50 }),
    getArticles({ status: "APPROVED", article_type: "IMPORTANT", limit: 3 }),
  ]);

  const articles = articlesRes.success ? (articlesRes.data || []) : [];
  const popular = popularRes.success
    ? [...(popularRes.data || [])].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5)
    : [];
  const importantArticles = importantRes.success ? (importantRes.data || []) : [];

  return <NewsListLayout category="all" title="전체뉴스" initialArticles={articles} initialPopular={popular} importantArticles={importantArticles} />;
}
