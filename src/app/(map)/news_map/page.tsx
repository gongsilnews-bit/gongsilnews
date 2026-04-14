import { Suspense } from 'react';
import NewsMapClient from './NewsMapClient';
import { getArticles } from '@/app/actions/article';

export const revalidate = 60;

export const metadata = {
  title: '우리동네뉴스 지도 | 공실뉴스',
  description: '위치 기반으로 우리동네 부동산 뉴스와 매물을 확인하세요.',
};

export default async function NewsMapPage() {
  // 1. Fetch main approved articles
  const res = await getArticles({ status: 'APPROVED' });
  const initialArticles = res.success ? (res.data || []) : [];

  // 2. Fetch popular articles for the sidebar limits
  const popRes = await getArticles({ status: 'APPROVED', limit: 50 });
  let initialPopularArticles = [];
  if (popRes.success && popRes.data) {
    initialPopularArticles = [...popRes.data]
      .sort((a: any, b: any) => (b.view_count || 0) - (a.view_count || 0))
      .slice(0, 5);
  }

  return (
    <Suspense fallback={<div style={{ padding: "80px", textAlign: "center" }}>Loading News Map...</div>}>
      <NewsMapClient initialArticles={initialArticles} initialPopularArticles={initialPopularArticles} />
    </Suspense>
  );
}
