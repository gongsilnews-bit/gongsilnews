import Script from "next/script";
import { getVacanciesForMap } from "@/app/actions/vacancy";

import NoticeBoardGroup from "@/components/home/NoticeBoardGroup";
import SpecialLectureBanner from "@/components/home/SpecialLectureBanner";
import ChatbotBanner from "@/components/home/ChatbotBanner";

export default async function Home() {
  const { data: initialVacancies } = await getVacanciesForMap();

  return (
    <>
      <Script 
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc"}&libraries=services,clusterer&autoload=false`}
        strategy="beforeInteractive"
      />
      <main className="container px-20" style={{ position: "relative" }}>
        
        <QuickFloatingMenu />

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

      {/* ========== 8. Board & Notice ========== */}
      <div className="container px-20 mt-50 mb-50">
        <NoticeBoardGroup />
      </div>

      {/* ========== 9. Lectures ========== */}
      <SpecialLectureBanner />

      {/* ========== 10. Floating or Promotions ========== */}
      <ChatbotBanner />
    </>
  );
}
