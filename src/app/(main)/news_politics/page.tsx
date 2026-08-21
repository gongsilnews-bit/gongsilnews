import NewsListLayout from "@/components/NewsListLayout";
import { getArticles } from "@/app/actions/article";

export const dynamic = "force-dynamic";

export default async function NewsPoliticsPage() {
  // Fetch all articles for section1 = '정책시장'
  const [articlesRes, popularRes, importantRes] = await Promise.all([
    getArticles({ status: "APPROVED", section1: "정책시장" }),
    getArticles({ status: "APPROVED", section1: "정책시장", limit: 50 }),
    getArticles({ status: "APPROVED", is_important: true, section1: "정책시장", limit: 15 })
  ]);

  const articles = articlesRes.success ? (articlesRes.data || []) : [];
  const popular = popularRes.success
    ? [...(popularRes.data || [])].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5)
    : [];
  const importantArticles = importantRes.success ? (importantRes.data || []) : [];

  const subCategories = ["부동산정책/정치", "경제/재테크/주식", "세무/법률/기타"];

  return <NewsListLayout 
    category="정책시장" 
    title="정책시장" 
    initialArticles={articles} 
    initialPopular={popular} 
    importantArticles={importantArticles} 
    subCategories={subCategories}
  />;
}
