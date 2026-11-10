import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RealEstateInfoBanner from "@/components/RealEstateInfoBanner";
import { getBannersByPlacement } from "@/app/actions/banner";
import { getNavHighlightCounts } from "@/app/actions/navHighlight";
import ComingSoon from "@/components/common/ComingSoon";
import QuickFloatingMenu from "@/components/common/QuickFloatingMenu";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ data: topFullBanners }, { data: headerTextBanners }, { data: navCounts }] = await Promise.all([
    getBannersByPlacement("TOP_FULL"),
    getBannersByPlacement("HEADER_TEXT"),
    getNavHighlightCounts(),
  ]);

  // const isMaintenance = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

  // if (isMaintenance) {
  //   return <ComingSoon />;
  // }

  return (
    <div style={{ minWidth: "1200px" }}>
      <Header topFullBanners={topFullBanners} headerTextBanners={headerTextBanners} navCounts={navCounts} />
      {/* 하위의 모든 page.tsx 파일 내용물이 이 자리에 렌더링 됩니다 */}
      {children}
      {/* 오른쪽 빠른메뉴 — 첫 화면만이 아니라 공실뉴스 모든 화면에 (2026-11-10 사장님) */}
      <QuickFloatingMenu />
      <RealEstateInfoBanner /> {/* 공공기관 바로가기 7개 (2026-10-26) */}
      <Footer />
    </div>
  );
}
