import Script from "next/script";
import { getVacanciesForMap } from "@/app/actions/vacancy";

export const revalidate = 60;

import QuickFloatingMenu from "@/components/common/QuickFloatingMenu";
import MarketTickerBar from "@/components/home/MarketTickerBar";
import HeroMapSection from "@/components/home/HeroMapSection";
import HeroSideContent from "@/components/home/HeroSideContent";
import CategoryNewsGrid from "@/components/home/CategoryNewsGrid";
import PremiumDroneSection from "@/components/home/PremiumDroneSection";
import SpecialLectureBanner from "@/components/home/SpecialLectureBanner";
import BannerSlot from "@/components/BannerSlot";

export default async function Home() {
  const { data: initialVacancies } = await getVacanciesForMap();

  return (
    <>
      <Script 
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc"}&libraries=services,clusterer&autoload=false`}
        strategy="afterInteractive"
      />
      <main className="container px-20" style={{ position: "relative" }}>
        
        <QuickFloatingMenu />

        {/* ========== 배너: 메인 상단 ========== */}
        <BannerSlot placement="MAIN_TOP" style={{ borderRadius: 0 }} />

        {/* ========== 3. Hero Section (Map & HOT News) ========== */}
        <div className="hero-section" style={{ padding: "0 25px 0 0", border: "0.5px solid #dcdcdc", borderTop: "none", marginBottom: 0, background: "#fff" }}>
          <HeroMapSection initialVacancies={initialVacancies} />
          <HeroSideContent />
        </div>

        {/* ========== 4. Ticker Section ========== */}
        <MarketTickerBar />

        {/* ========== 5. Category News Grid ========== */}
        <CategoryNewsGrid />
      </main>

      {/* ========== 7. Premium Media ========== */}
      <PremiumDroneSection />



      {/* ========== 9. Lectures ========== */}
      <SpecialLectureBanner />

      <div style={{ width: "100%", maxWidth: 1920, margin: "40px auto 40px auto" }}>
        <BannerSlot placement="MAIN_BOTTOM_FULL" style={{ borderRadius: 0, overflow: "hidden" }} />
      </div>
    </>
  );
}
