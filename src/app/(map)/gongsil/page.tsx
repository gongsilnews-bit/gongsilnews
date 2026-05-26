import { Suspense } from 'react';
import GongsilClient from './GongsilClient';
import { getVacancies } from '@/app/actions/vacancy';

export const revalidate = 60;

export const metadata = {
  title: '공실열람 | 공실뉴스',
  description: '전국 공실 공실광고을 지도에서 실시간으로 확인하세요.',
};

export default async function GongsilPage() {
  // 💡 초기 렌더링 속도 극대화를 위해 대한민국 전체 매물을 미리 불러오지 않고 빈 배열을 넘깁니다.
  // 지도가 로드되자마자 클라이언트의 Map Bbox에 맞춰 실시간 1ms 인덱스 스캔 패치가 수행됩니다.
  const initialVacancies: any[] = [];

  return (
    <Suspense fallback={<div style={{ padding: "50px", textAlign: "center" }}>Loading Maps...</div>}>
      <GongsilClient initialVacancies={initialVacancies} />
    </Suspense>
  );
}
