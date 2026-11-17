import NewsListLayout from "@/components/NewsListLayout";
import { GONGSIL_SECTION2 } from "@/utils/formatCategory";
import { getImportantArticles, getArticles } from "@/app/actions/article";

export const dynamic = "force-dynamic";

export default async function NewsLocalPage() {
  const [articlesRes, popularRes, importantRes] = await Promise.all([
    getArticles({ status: "APPROVED", section1: "공실뉴스" }),
    getArticles({ status: "APPROVED", section1: "공실뉴스", limit: 50 }),
    getImportantArticles({ section1: "공실뉴스" })
  ]);

  const articles = articlesRes.success ? (articlesRes.data || []) : [];
  const popular = popularRes.success
    ? [...(popularRes.data || [])].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5)
    : [];
  const importantArticles = importantRes.success ? (importantRes.data || []) : [];

  // 공실열람과 같은 10칸 (2026-11-17 사장님)
  const subCategories = [...GONGSIL_SECTION2];

  return <NewsListLayout 
    category="공실뉴스" 
    title="공실뉴스" 
    initialArticles={articles} 
    initialPopular={popular} 
    importantArticles={importantArticles} 
    subCategories={subCategories}
  />;
}
