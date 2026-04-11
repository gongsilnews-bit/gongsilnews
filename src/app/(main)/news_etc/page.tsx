import NewsListLayout from "@/components/NewsListLayout";
import { getArticles } from "@/app/actions/article";

export default async function NewsEtcPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedParams = await searchParams;
  const cat = typeof resolvedParams.cat === 'string' ? resolvedParams.cat : undefined;

  let displayTitle = "기타 전체보기";
  let categoryFilter = "기타";

  if (cat === "it") {
    displayTitle = "IT·가전·가구";
    categoryFilter = "IT·가전·가구";
  } else if (cat === "sports") {
    displayTitle = "스포츠·연예·Car";
    categoryFilter = "스포츠·연예·Car";
  } else if (cat === "mission") {
    displayTitle = "인물·미션·기타";
    categoryFilter = "인물·미션·기타";
  }

  const [articlesRes, popularRes] = await Promise.all([
    getArticles({ status: "APPROVED", section2: categoryFilter }),
    getArticles({ status: "APPROVED", limit: 50 }),
  ]);

  const articles = articlesRes.success ? (articlesRes.data || []) : [];
  const popular = popularRes.success
    ? [...(popularRes.data || [])].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5)
    : [];

  return <NewsListLayout category={categoryFilter} title={displayTitle} initialArticles={articles} initialPopular={popular} />;
}
