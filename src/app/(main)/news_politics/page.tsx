import NewsListLayout from "@/components/NewsListLayout";
import { getArticles } from "@/app/actions/article";

export default async function NewsPoliticsPage() {
  const [articlesRes, popularRes, importantRes] = await Promise.all([
    getArticles({ status: "APPROVED", section2: "정치·경제·사회" }),
    getArticles({ status: "APPROVED", limit: 50 }),
    getArticles({ status: "APPROVED", article_type: "IMPORTANT", section2: "정치·경제·사회", limit: 3 })
  ]);

  const articles = articlesRes.success ? (articlesRes.data || []) : [];
  const popular = popularRes.success
    ? [...(popularRes.data || [])].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5)
    : [];
  const importantArticles = importantRes.success ? (importantRes.data || []) : [];

  return <NewsListLayout category="정치·경제·사회" title="정치·경제·사회" initialArticles={articles} initialPopular={popular} importantArticles={importantArticles} />;
}
