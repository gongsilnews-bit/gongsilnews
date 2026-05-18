import SearchClient from "./SearchClient";
import { getArticles, searchArticles } from "@/app/actions/article";
import { getVacancyCountByKeyword, getVacancyListByKeyword } from "@/app/actions/vacancy";

interface PageProps {
  searchParams?: any;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const resolvedParams = searchParams ? await Promise.resolve(searchParams) : {};
  const query = resolvedParams.q as string || "";

  // 1. 기사 검색
  let articlesRes;
  if (query) {
    articlesRes = await searchArticles(query);
  } else {
    articlesRes = { success: true, data: [] };
  }
  const articles = articlesRes.success ? (articlesRes.data || []) : [];

  // 2. 공실 검색
  let vacancies = [];
  let vacancyCount = 0;
  if (query) {
    const [vRes, listRes] = await Promise.all([
      getVacancyCountByKeyword(query),
      getVacancyListByKeyword(query)
    ]);
    if (vRes.success) vacancyCount = vRes.count || 0;
    if (listRes.success) vacancies = listRes.data || [];
  }

  return (
    <SearchClient 
      query={query} 
      articles={articles} 
      vacancies={vacancies} 
      vacancyCount={vacancyCount} 
    />
  );
}
