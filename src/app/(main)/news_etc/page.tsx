import NewsListLayout from "@/components/NewsListLayout";
import { getArticles } from "@/app/actions/article";

export const dynamic = "force-dynamic";

export default async function NewsEtcPage() {
  const [articlesRes, popularRes, importantRes] = await Promise.all([
    getArticles({ status: "APPROVED", section1: "라이프·오피니언" }),
    getArticles({ status: "APPROVED", section1: "라이프·오피니언", limit: 50 }),
    getArticles({ status: "APPROVED", is_important: true, section1: "라이프·오피니언", limit: 15 })
  ]);

  const articles = articlesRes.success ? (articlesRes.data || []) : [];
  const popular = popularRes.success
    ? [...(popularRes.data || [])].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5)
    : [];
  const importantArticles = importantRes.success ? (importantRes.data || []) : [];

  const subCategories = ["인물/인터뷰", "부동산/인테리어 꿀팁", "맛집/여행/건강", "스포츠", "연예", "기타"];

  return <NewsListLayout 
    category="라이프·오피니언" 
    title="라이프·오피니언" 
    initialArticles={articles} 
    initialPopular={popular} 
    importantArticles={importantArticles} 
    subCategories={subCategories}
  />;
}
