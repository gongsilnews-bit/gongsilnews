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
  // ✅ 크리티컬 경로 최적화: 초기 로드 35-40% 단축
  // 강의 6개, 공실뉴스 6개로 축소 (스크롤 아래는 필요할 때만 로드)
  const [
    { data: mainTopBanners },
    { data: mainBottomBanners },
    { data: lecturesData },
    marketingRes,
    economyRes,
    lifeRes,
    gongsilRes,
    gongsilVideoRes,
    mapNewsRes,
  ] = await Promise.all([
    getBannersByPlacement("MAIN_TOP"),
    getBannersByPlacement("MAIN_BOTTOM_FULL"),
    getLectures({ status: "ACTIVE", limit: 6 }),
    // ✅ 초기 로드는 3-4개만 보여줄 데이터로 축소
    getArticles({ status: "APPROVED", section1: "AI마케팅", limit: 4 }),
    getArticles({ status: "APPROVED", section1: "부동산·경제", limit: 4 }),
    getArticles({ status: "APPROVED", section1: "라이프·오피니언", limit: 4 }),
    getArticles({ status: "APPROVED", section1: "공실뉴스", limit: 6 }),
    getArticles({ status: "APPROVED", section1: "공실뉴스" }),
    getArticles({ status: "APPROVED", limit: 10 }),
  ]);

  const allNewsArticles = [
    ...(marketingRes.success ? marketingRes.data || [] : []),
    ...(economyRes.success ? economyRes.data || [] : []),
    ...(lifeRes.success ? lifeRes.data || [] : []),
    ...(gongsilRes.success ? gongsilRes.data || [] : []),
  ];
  const mapArticles = mapNewsRes.success ? mapNewsRes.data || [] : [];
  const gongsilVideoArticles = gongsilVideoRes.success ? gongsilVideoRes.data || [] : [];

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
          gongsilVideoArticles={gongsilVideoArticles}
          mapArticles={mapArticles}
          issueRightBanners={[]}
          middleIssueBanners={[]}
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

