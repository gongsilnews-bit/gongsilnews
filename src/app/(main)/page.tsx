

import QuickFloatingMenu from "@/components/common/QuickFloatingMenu";
import MarketTickerBar from "@/components/home/MarketTickerBar";
import HeroMapSection from "@/components/home/HeroMapSection";
import HeroSideContent from "@/components/home/HeroSideContent";
import CategoryNewsGrid from "@/components/home/CategoryNewsGrid";
import PremiumDroneSection from "@/components/home/PremiumDroneSection";
import NoticeBoardGroup from "@/components/home/NoticeBoardGroup";
import SpecialLectureBanner from "@/components/home/SpecialLectureBanner";
import ChatbotBanner from "@/components/home/ChatbotBanner";

export default function Home() {
  return (
    <>
      <main className="container px-20" style={{ position: "relative" }}>
        
        <QuickFloatingMenu />

        {/* ========== 3. Hero Section (Map & HOT News) ========== */}
        <div className="hero-section" style={{ padding: "0 25px 0 0", border: "0.5px solid #dcdcdc", borderTop: "none", marginBottom: 0, background: "#fff" }}>
          <HeroMapSection />
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
