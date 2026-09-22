import { Suspense } from "react";
import { getVacancyDetail, getAgencyInfo } from "@/app/actions/vacancy";
import { getHomepageSettingsBySubdomain } from "@/app/actions/homepage";
import MobileGongsilStandaloneDetail from "@/app/m/gongsil/detail/[id]/MobileGongsilStandaloneDetail";
import NotFoundVacancy from "@/app/(map)/gongsil/detail/[id]/NotFoundVacancy";
import { getCleanAddrText, getPriceText } from "@/app/(map)/gongsil/gongsilHelpers";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ subdomain: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  try {
    const res = await getVacancyDetail(id);
    if (res.success && res.data) {
      const v = res.data;
      const title = `${getCleanAddrText(v)} ${getPriceText(v)}`;
      return { title };
    }
  } catch (e) {
    console.error("Metadata generation failed:", e);
  }
  return { title: "공실 상세 정보" };
}

/**
 * 폰에서 여는 공실 상세.
 *
 * 폰에는 팝업 창이 없다. 띄우면 그냥 새 탭이 되고, 620px 팝업용 화면은 폰에서
 * 좁다. 그래서 포털이 쓰는 모바일 상세를 같은 자리에 그대로 올린다.
 */
export default async function SubdomainMobileGongsilDetailPage({ params }: PageProps) {
  const { subdomain, id } = await params;

  const [siteRes, res] = await Promise.all([
    getHomepageSettingsBySubdomain(subdomain),
    getVacancyDetail(id).catch(() => null),
  ]);

  const vacancy = res && res.success ? res.data : null;

  // 남의 매물을 자기 주소로 띄우지 못하게 막는다
  const mine = vacancy && siteRes.success && vacancy.owner_id === siteRes.data?.member?.id;
  if (!mine) return <NotFoundVacancy />;

  let agencyInfo: any = null;
  if (vacancy.owner_id) {
    const agencyRes = await getAgencyInfo(vacancy.owner_id);
    if (agencyRes.success) agencyInfo = agencyRes.data;
  }

  return (
    <Suspense
      fallback={
        <div style={{ maxWidth: 600, margin: "0 auto", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", color: "#64748b", fontSize: 14 }}>
          공실 상세 정보를 불러오는 중입니다...
        </div>
      }
    >
      <MobileGongsilStandaloneDetail
        vacancy={vacancy}
        photos={(res as any)?.photos || []}
        agencyInfo={agencyInfo}
      />
    </Suspense>
  );
}
