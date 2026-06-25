import { getVacanciesForMap } from "@/app/actions/vacancy";
import { getBannersByPlacement } from "@/app/actions/banner";
import { getLectures } from "@/app/actions/lecture";
import { getArticles } from "@/app/actions/article";

export const revalidate = 300; // 5분 캐시 (60s → 300s 확장)

import QuickFloatingMenu from "@/components/common/QuickFloatingMenu";
import HeroMapSection from "@/components/home/HeroMapSection";
import HeroSideContent from "@/components/home/HeroSideContent";
import CategoryNewsGrid from "@/components/home/CategoryNewsGrid";
import PremiumDroneSection from "@/components/home/PremiumDroneSection";
import SpecialLectureBanner from "@/components/home/SpecialLectureBanner";
import BannerSlot from "@/components/BannerSlot";

export default async function Home() {
  // ✅ 모든 데이터를 한 번에 병렬 요청 (layout→page→component 직렬 제거)
  const [
    { data: mainTopBanners },
    { data: mainBottomBanners },
    { data: issueRightBanners },
    { data: middleIssueBanners },
    { data: lecturesData },
    marketingRes,
    economyRes,
    lifeRes,
    gongsilRes,
    mapNewsRes,
  ] = await Promise.all([
    getBannersByPlacement("MAIN_TOP"),
    getBannersByPlacement("MAIN_BOTTOM_FULL"),
    getBannersByPlacement("MAIN_ISSUE_RIGHT"),
    getBannersByPlacement("MAIN_MIDDLE_ISSUE"),
    getLectures({ status: "ACTIVE" }),
    // ✅ 카테고리별로 개별 조회하여 노출 및 성능 최적화
    getArticles({ status: "APPROVED", section1: "AI마케팅", limit: 5 }),
    getArticles({ status: "APPROVED", section1: "부동산·경제", limit: 5 }),
    getArticles({ status: "APPROVED", section1: "라이프·오피니언", limit: 5 }),
    getArticles({ status: "APPROVED", section1: "공실뉴스", limit: 10 }),
    getArticles({ status: "APPROVED", section1: "우리동네뉴스", limit: 30 }),
  ]);

  const allNewsArticles = [
    ...(marketingRes.success ? marketingRes.data || [] : []),
    ...(economyRes.success ? economyRes.data || [] : []),
    ...(lifeRes.success ? lifeRes.data || [] : []),
    ...(gongsilRes.success ? gongsilRes.data || [] : []),
  ];
  const mapArticles = mapNewsRes.success ? mapNewsRes.data || [] : [];

  return (
    <>
      <main className="container px-20" style={{ position: "relative" }}>
        
        <QuickFloatingMenu />

        {/* ========== 배너: 메인 상단 ========== */}
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <BannerSlot placement="MAIN_TOP" style={{ borderRadius: 0 }} initialBanners={mainTopBanners} />
        </div>

        {/* ========== 3. Hero Section (Map & HOT News) ========== */}
        <div className="hero-section" style={{ padding: "0 25px 0 0", border: "0.5px solid #dcdcdc", borderTop: "none", marginBottom: 0, background: "#fff" }}>
          <HeroMapSection />
          <HeroSideContent />
        </div>

        {/* ========== 5. Category News Grid (pre-fetched data) ========== */}
        <CategoryNewsGrid
          allNewsArticles={allNewsArticles}
          mapArticles={mapArticles}
          issueRightBanners={issueRightBanners}
          middleIssueBanners={middleIssueBanners}
        />
      </main>

      {/* ========== 7. Premium Media ========== */}
      <PremiumDroneSection />



      {/* ========== 9. Lectures ========== */}
      <SpecialLectureBanner initialLectures={lecturesData} />

      <div style={{ width: "100%", maxWidth: 1200, margin: "40px auto 40px auto" }}>
        <BannerSlot placement="MAIN_BOTTOM_FULL" style={{ borderRadius: 0, overflow: "hidden" }} initialBanners={mainBottomBanners} />
      </div>
    </>
  );
}

