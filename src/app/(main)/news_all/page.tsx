import NewsListLayout from "@/components/NewsListLayout";
import { getArticles } from "@/app/actions/article";

interface PageProps {
  searchParams?: any;
}

export default async function NewsAllPage({ searchParams }: PageProps) {
  const resolvedParams = searchParams ? await Promise.resolve(searchParams) : {};
  const keywordMatch = resolvedParams.keyword as string | undefined;
  const authorMatch = resolvedParams.author_name as string | undefined;

  // 서버에서 미리 가져오기 — 클라이언트 로딩 없이 즉시 표시!
  const [articlesRes, popularRes, importantRes] = await Promise.all([
    getArticles({ status: "APPROVED", keyword: keywordMatch, author_name: authorMatch }),
    getArticles({ status: "APPROVED", limit: 50 }),
    // 검색 중이거나 기자별 리스트일 때는 중요 기사를 불러올 필요 없음
    (keywordMatch || authorMatch) ? Promise.resolve({ success: true, data: [] }) : getArticles({ status: "APPROVED", is_important: true, limit: 15 }),
  ]);

  const articles = articlesRes.success ? (articlesRes.data || []) : [];
  const popular = popularRes.success
    ? [...(popularRes.data || [])].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5)
    : [];
  const importantArticles = importantRes.success ? (importantRes.data || []) : [];

  let pageTitle = "전체뉴스";
  if (keywordMatch) pageTitle = `키워드 검색결과 : #${keywordMatch}`;
  if (authorMatch) pageTitle = `${authorMatch} 기자의 글`;

  return <NewsListLayout category="all" title={pageTitle} initialArticles={articles} initialPopular={popular} importantArticles={importantArticles} />;
}
