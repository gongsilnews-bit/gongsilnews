import NewsListLayout from "@/components/NewsListLayout";
import { getArticles } from "@/app/actions/article";

export default async function NewsPoliticsPage() {
  const [articlesRes, popularRes] = await Promise.all([
    getArticles({ status: "APPROVED", section2: "정치·경제·사회" }),
    getArticles({ status: "APPROVED", limit: 50 }),
  ]);

  const articles = articlesRes.success ? (articlesRes.data || []) : [];
  const popular = popularRes.success
    ? [...(popularRes.data || [])].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5)
    : [];

  return <NewsListLayout category="정치·경제·사회" title="정치·경제·사회" initialArticles={articles} initialPopular={popular} />;
}
