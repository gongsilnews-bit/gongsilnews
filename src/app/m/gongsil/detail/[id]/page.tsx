import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getVacancyDetail, getAgencyInfo } from "@/app/actions/vacancy";
import MobileGongsilStandaloneDetail from "./MobileGongsilStandaloneDetail";
import NotFoundVacancy from "@/app/(map)/gongsil/detail/[id]/NotFoundVacancy";
import { getCleanAddrText, getPriceText } from "@/app/(map)/gongsil/gongsilHelpers";
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
      const title = `${addr} ${price} | 공실뉴스 모바일`;
      const description = `${v.property_type || "부동산"} · ${v.direction || "방향무관"} · 공급/전용 ${v.supply_m2 || 0}㎡/${v.exclusive_m2 || 0}㎡`;
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
    console.error("Metadata generation failed:", e);
  }

  return {
    title: "공실 상세 정보 | 공실뉴스 모바일",
    description: "공실뉴스의 엄선된 공실 매물 상세 정보입니다.",
  };
}

export default async function MobileVacancyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let vacancy: any = null;
  let photos: any[] = [];
  let agencyInfo: any = null;

  try {
    const res = await getVacancyDetail(id);
    if (res.success && res.data) {
      vacancy = res.data;
      photos = res.photos || [];

      if (vacancy.owner_id) {
        const agencyRes = await getAgencyInfo(vacancy.owner_id);
        if (agencyRes.success) {
          agencyInfo = agencyRes.data;
        }
      }
    }
  } catch (err) {
    console.error("[MobileVacancyDetailPage] load error:", err);
  }

  if (!vacancy) {
    return <NotFoundVacancy />;
  }

  return (
    <Suspense
      fallback={
        <div
          style={{
            maxWidth: 600,
            margin: "0 auto",
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fff",
            color: "#64748b",
            fontSize: 14,
          }}
        >
          공실 상세 정보를 불러오는 중입니다...
        </div>
      }
    >
      <MobileGongsilStandaloneDetail
        vacancy={vacancy}
        photos={photos}
        agencyInfo={agencyInfo}
      />
    </Suspense>
  );
}
