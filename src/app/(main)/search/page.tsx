import SearchClient from "./SearchClient";
import { getArticles, searchArticles } from "@/app/actions/article";
import { getVacancyCountByKeyword, getVacancyListByKeyword } from "@/app/actions/vacancy";

interface PageProps {
  searchParams?: any;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const resolvedParams = searchParams ? await Promise.resolve(searchParams) : {};
  const query = resolvedParams.q as string || "";

  // 1. 기사 검색 및 공실 개수 병렬 초고속 조회 (초기 800KB 공실 리스트 다운로드 제거)
  let articles: any[] = [];
  let vacancyCount = 0;

  if (query) {
    const [articlesRes, vRes] = await Promise.all([
      searchArticles(query),
      getVacancyCountByKeyword(query),
    ]);
    if (articlesRes.success) articles = articlesRes.data || [];
    if (vRes.success) vacancyCount = vRes.count || 0;
  }

  return (
    <SearchClient 
      query={query} 
      articles={articles} 
      vacancyCount={vacancyCount} 
    />
  );
}
