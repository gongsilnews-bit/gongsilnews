import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getVacancyDetail, getAgencyInfo } from '@/app/actions/vacancy';
import GongsilStandaloneDetail from './GongsilStandaloneDetail';
import NotFoundVacancy from './NotFoundVacancy';
import { getCleanAddrText, getPriceText } from '../../gongsilHelpers';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const res = await getVacancyDetail(id);
    if (res.success && res.data) {
      const v = res.data;
      const addr = getCleanAddrText(v);
      const price = getPriceText(v);
      const title = `${addr} ${price} | 공실뉴스`;
      const description = `${v.property_type || '부동산'} · ${v.direction || '방향무관'} · 공급/전용 ${v.supply_m2 || 0}㎡/${v.exclusive_m2 || 0}㎡`;
      const images = res.photos && res.photos.length > 0 ? [res.photos[0].url] : [];

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          images,
        },
      };
    }
  } catch (e) {
    console.error('Metadata generation failed:', e);
  }

  return {
    title: '공실 상세 정보 | 공실뉴스',
    description: '공실뉴스의 엄선된 공실 매물 상세 정보입니다.',
  };
}

export default async function GongsilDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let vacancy: any = null;
  let photos: any[] = [];
  let flyer: any = null;
  let agencyInfo: any = null;

  try {
    const res = await getVacancyDetail(id);
    if (res.success && res.data) {
      vacancy = res.data;
      photos = res.photos || [];
      flyer = res.flyer || null;

      if (vacancy.owner_id && vacancy.owner_role === 'REALTOR') {
        const agencyRes = await getAgencyInfo(vacancy.owner_id);
        if (agencyRes.success) {
          agencyInfo = agencyRes.data;
        }
      }
    }
  } catch (err) {
    console.error('Failed to load vacancy detail:', err);
  }

  if (!vacancy) {
    return <NotFoundVacancy />;
  }

  return (
    <Suspense
      fallback={
        <div
          style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f8fafc',
            color: '#64748b',
          }}
        >
          공실 상세 정보를 불러오는 중입니다...
        </div>
      }
    >
      <GongsilStandaloneDetail
        initialVacancy={vacancy}
        photos={photos}
        flyer={flyer}
        agencyInfo={agencyInfo}
      />
    </Suspense>
  );
}
