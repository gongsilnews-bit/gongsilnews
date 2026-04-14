import { Suspense } from 'react';
import GongsilClient from './GongsilClient';
import { getVacancies } from '@/app/actions/vacancy';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '공실열람 | 공실뉴스',
  description: '전국 공실 매물을 지도에서 실시간으로 확인하세요.',
};

export default async function GongsilPage() {
  const res = await getVacancies({ all: true });
  const initialVacancies = res.success ? (res.data || []) : [];

  return (
    <Suspense fallback={<div style={{ padding: "50px", textAlign: "center" }}>Loading Maps...</div>}>
      <GongsilClient initialVacancies={initialVacancies} />
    </Suspense>
  );
}
