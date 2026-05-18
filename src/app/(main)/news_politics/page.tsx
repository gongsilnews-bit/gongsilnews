import NewsListLayout from "@/components/NewsListLayout";
import { getArticles } from "@/app/actions/article";

export default async function NewsPoliticsPage() {
  // Fetch all articles for section1 = '부동산·경제'
  const [articlesRes, popularRes, importantRes] = await Promise.all([
    getArticles({ status: "APPROVED", section1: "부동산·경제" }),
    getArticles({ status: "APPROVED", section1: "부동산·경제", limit: 50 }),
    getArticles({ status: "APPROVED", is_important: true, section1: "부동산·경제", limit: 15 })
  ]);

  const articles = articlesRes.success ? (articlesRes.data || []) : [];
  const popular = popularRes.success
    ? [...(popularRes.data || [])].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5)
    : [];
  const importantArticles = importantRes.success ? (importantRes.data || []) : [];

  const subCategories = ["부동산 정책/동향", "경제/재테크/주식", "법률/세무 지식"];

  return <NewsListLayout 
    category="부동산·경제" 
    title="부동산·경제" 
    initialArticles={articles} 
    initialPopular={popular} 
    importantArticles={importantArticles} 
    subCategories={subCategories}
  />;
}
