import { Suspense } from "react";
import { getVacancyDetail, getAgencyInfo } from "@/app/actions/vacancy";
import { getHomepageSettingsBySubdomain } from "@/app/actions/homepage";
import GongsilStandaloneDetail from "@/app/(map)/gongsil/detail/[id]/GongsilStandaloneDetail";
import NotFoundVacancy from "@/app/(map)/gongsil/detail/[id]/NotFoundVacancy";
import { getCleanAddrText, getPriceText } from "@/app/(map)/gongsil/gongsilHelpers";
import { pickTheme } from "../../../theme";

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
      const description = `${v.property_type || "부동산"} · ${v.direction || "방향무관"} · 공급/전용 ${v.supply_m2 || 0}㎡/${v.exclusive_m2 || 0}㎡`;
      const images = res.photos && res.photos.length > 0 ? [res.photos[0].url] : [];
      return { title, description, openGraph: { title, description, images } };
    }
  } catch (e) {
    console.error("Metadata generation failed:", e);
  }
  return { title: "공실 상세 정보" };
}

/**
 * 중개사 서브도메인에서 여는 공실 상세 — 기사에 붙는 [추천 공실] 팝업과 같은 화면.
 *
 * 화면을 새로 만들지 않고 포털이 쓰는 GongsilStandaloneDetail 을 그대로 띄운다.
 * 연락처 보기·허위매물 신고·등록자정보처럼 이미 다듬어 둔 것들이 전부 딸려오고,
 * 포털에서 고치면 중개사 홈페이지도 같이 고쳐진다.
 *
 * 다른 점은 주소뿐이다. 주소창에 gongsilnews.com 이 아니라 중개사 자기 도메인이
 * 남는다 — 방문자 눈에는 그 부동산이 가진 매물 페이지다.
 */
export default async function SubdomainGongsilDetailPage({ params }: PageProps) {
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
  if (vacancy.owner_id && vacancy.owner_role === "REALTOR") {
    const agencyRes = await getAgencyInfo(vacancy.owner_id);
    if (agencyRes.success) agencyInfo = agencyRes.data;
  }

  // 퍼 나른 링크가 포털이 아니라 이 중개사에게 사람을 보내도록 공유 주소를 중개사 것으로 준다.
  // 로컬에서 누르든 어디서 누르든 공유는 실제 서비스 주소여야 하므로 여기서 직접 만든다.
  const officeName =
    siteRes.data?.settings?.site_title ||
    siteRes.data?.companyProfile?.name ||
    siteRes.data?.companyProfile?.company_name ||
    siteRes.data?.member?.name ||
    "부동산";
  const shareUrl = `https://${subdomain}.gongsilnews.com/gongsil/detail/${vacancy.id}`;

  return (
    <Suspense
      fallback={
        <div style={{ width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", color: "#64748b" }}>
          공실 상세 정보를 불러오는 중입니다...
        </div>
      }
    >
      <GongsilStandaloneDetail
        initialVacancy={vacancy}
        photos={(res as any)?.photos || []}
        flyer={(res as any)?.flyer || null}
        agencyInfo={agencyInfo}
        hideFalseListingReport
        copyOnlyShare
        hidePrint
        hideWishlist
        shareUrl={shareUrl}
        shareSiteName={officeName}
        accentColor={pickTheme(siteRes.data?.settings?.intake?.theme_color).primary}
      />
    </Suspense>
  );
}
