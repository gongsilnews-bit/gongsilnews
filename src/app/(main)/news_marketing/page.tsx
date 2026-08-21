import NewsListLayout from "@/components/NewsListLayout";
import { getArticles } from "@/app/actions/article";

export const dynamic = "force-dynamic";

export default async function NewsMarketingPage() {
  // Fetch all articles for section1 = 'AI마케팅'
  const [articlesRes, popularRes, importantRes] = await Promise.all([
    getArticles({ status: "APPROVED", section1: "AI마케팅" }),
    getArticles({ status: "APPROVED", section1: "AI마케팅", limit: 50 }),
    getArticles({ status: "APPROVED", is_important: true, section1: "AI마케팅", limit: 15 })
  ]);

  const articles = articlesRes.success ? (articlesRes.data || []) : [];
  const popular = popularRes.success
    ? [...(popularRes.data || [])].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5)
    : [];
  const importantArticles = importantRes.success ? (importantRes.data || []) : [];

  const subCategories = ["AI/NEWS", "부동산유튜브/블로그", "공실/임대관리"];

  return <NewsListLayout 
    category="AI마케팅" 
    title="AI마케팅" 
    initialArticles={articles} 
    initialPopular={popular} 
    importantArticles={importantArticles} 
    subCategories={subCategories}
  />;
}
