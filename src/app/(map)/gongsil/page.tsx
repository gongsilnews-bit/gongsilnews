import { Suspense } from 'react';
import GongsilClient from './GongsilClient';
import { getVacancyDetail, getVacancyByMngNo } from '@/app/actions/vacancy';

export const revalidate = 60;

export const metadata = {
  title: '공실열람 | 공실뉴스',
  description: '전국 공실 공실광고을 지도에서 실시간으로 확인하세요.',
};

export default async function GongsilPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; mng?: string }>;
}) {
  const resolvedParams = await searchParams;
  const id = resolvedParams.id;
  const mng = resolvedParams.mng;

  let initialVacancies: any[] = [];

  try {
    if (id) {
      const res = await getVacancyDetail(id);
      if (res.success && res.data) {
        initialVacancies = [res.data];
      }
    } else if (mng) {
      const res = await getVacancyByMngNo(mng);
      if (res.success && res.data) {
        initialVacancies = [res.data];
      }
    }
  } catch (err) {
    console.error("Failed to fetch initial vacancy on server:", err);
  }

  return (
    <Suspense fallback={<div style={{ padding: "50px", textAlign: "center" }}>Loading Maps...</div>}>
      <GongsilClient initialVacancies={initialVacancies} />
    </Suspense>
  );
}
