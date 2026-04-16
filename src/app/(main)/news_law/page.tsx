import NewsListLayout from "@/components/NewsListLayout";
import { getArticles } from "@/app/actions/article";

export default async function NewsLawPage() {
  const [articlesRes, popularRes, importantRes] = await Promise.all([
    getArticles({ status: "APPROVED", section2: "세무·법률" }),
    getArticles({ status: "APPROVED", limit: 50 }),
    getArticles({ status: "APPROVED", is_important: true, section2: "세무·법률", limit: 15 })
  ]);

  const articles = articlesRes.success ? (articlesRes.data || []) : [];
  const popular = popularRes.success
    ? [...(popularRes.data || [])].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5)
    : [];
  const importantArticles = importantRes.success ? (importantRes.data || []) : [];

  return <NewsListLayout category="세무·법률" title="세무·법률" initialArticles={articles} initialPopular={popular} importantArticles={importantArticles} />;
}
