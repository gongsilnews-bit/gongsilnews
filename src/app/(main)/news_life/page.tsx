import NewsListLayout from "@/components/NewsListLayout";
import { getArticles } from "@/app/actions/article";

export default async function NewsLifePage() {
  const [articlesRes, popularRes] = await Promise.all([
    getArticles({ status: "APPROVED", section2: "여행·건강·생활" }),
    getArticles({ status: "APPROVED", limit: 50 }),
  ]);

  const articles = articlesRes.success ? (articlesRes.data || []) : [];
  const popular = popularRes.success
    ? [...(popularRes.data || [])].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5)
    : [];

  return <NewsListLayout category="여행·건강·생활" title="여행·건강·생활" initialArticles={articles} initialPopular={popular} />;
}
