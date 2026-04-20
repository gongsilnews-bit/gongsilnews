import Script from "next/script";
import { getVacanciesForMap } from "@/app/actions/vacancy";
import { getBannersByPlacement } from "@/app/actions/banner";
import { getLectures } from "@/app/actions/lecture";
import { getArticles } from "@/app/actions/article";

export const revalidate = 300; // 5분 캐시 (60s → 300s 확장)

import QuickFloatingMenu from "@/components/common/QuickFloatingMenu";
import MarketTickerBar from "@/components/home/MarketTickerBar";
import HeroMapSection from "@/components/home/HeroMapSection";
import HeroSideContent from "@/components/home/HeroSideContent";
import CategoryNewsGrid from "@/components/home/CategoryNewsGrid";
import PremiumDroneSection from "@/components/home/PremiumDroneSection";
import SpecialLectureBanner from "@/components/home/SpecialLectureBanner";
import BannerSlot from "@/components/BannerSlot";

export default async function Home() {
  // ✅ 모든 데이터를 한 번에 병렬 요청 (layout→page→component 직렬 제거)
  const [
    { data: initialVacancies },
    { data: mainTopBanners },
    { data: mainBottomBanners },
    { data: issueRightBanners },
    { data: lecturesData },
    allNewsRes,
    mapNewsRes,
  ] = await Promise.all([
    getVacanciesForMap(),
    getBannersByPlacement("MAIN_TOP"),
    getBannersByPlacement("MAIN_BOTTOM_FULL"),
    getBannersByPlacement("MAIN_ISSUE_RIGHT"),
    getLectures({ status: "ACTIVE" }),
    // ✅ 기사 8개 쿼리 → 2개로 통합
    getArticles({ status: "APPROVED", section1: "뉴스/칼럼", limit: 100 }),
    getArticles({ status: "APPROVED", section1: "우리동네부동산", limit: 30 }),
  ]);

  const allNewsArticles = allNewsRes.success ? allNewsRes.data || [] : [];
  const mapArticles = mapNewsRes.success ? mapNewsRes.data || [] : [];

  return (
    <>
      <Script 
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc"}&libraries=services,clusterer&autoload=false`}
        strategy="afterInteractive"
      />
      <main className="container px-20" style={{ position: "relative" }}>
        
        <QuickFloatingMenu />

        {/* ========== 배너: 메인 상단 ========== */}
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <BannerSlot placement="MAIN_TOP" style={{ borderRadius: 0 }} initialBanners={mainTopBanners} />
        </div>

        {/* ========== 3. Hero Section (Map & HOT News) ========== */}
        <div className="hero-section" style={{ padding: "0 25px 0 0", border: "0.5px solid #dcdcdc", borderTop: "none", marginBottom: 0, background: "#fff" }}>
          <HeroMapSection initialVacancies={initialVacancies} />
          <HeroSideContent />
        </div>

        {/* ========== 4. Ticker Section ========== */}
        <MarketTickerBar />

        {/* ========== 5. Category News Grid (pre-fetched data) ========== */}
        <CategoryNewsGrid
          allNewsArticles={allNewsArticles}
          mapArticles={mapArticles}
          issueRightBanners={issueRightBanners}
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

