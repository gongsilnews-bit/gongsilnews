import NewsListLayout from "@/components/NewsListLayout";
import { getArticles } from "@/app/actions/article";

export const dynamic = "force-dynamic";

export default async function NewsLocalPage() {
  const [articlesRes, popularRes, importantRes] = await Promise.all([
    getArticles({ status: "APPROVED", section1: "공실뉴스" }),
    getArticles({ status: "APPROVED", section1: "공실뉴스", limit: 50 }),
    getArticles({ status: "APPROVED", is_important: true, section1: "공실뉴스", limit: 15 })
  ]);

  const articles = articlesRes.success ? (articlesRes.data || []) : [];
  const popular = popularRes.success
    ? [...(popularRes.data || [])].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5)
    : [];
  const importantArticles = importantRes.success ? (importantRes.data || []) : [];

  const subCategories = ["아파트/오피스텔", "빌라/주택", "원룸/투룸(풀옵션)", "상가/사무실/공장/토지", "신축/분양/경매"];

  return <NewsListLayout 
    category="공실뉴스" 
    title="공실뉴스" 
    initialArticles={articles} 
    initialPopular={popular} 
    importantArticles={importantArticles} 
    subCategories={subCategories}
  />;
}
