import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RealEstateInfoBanner from "@/components/RealEstateInfoBanner";
import PopupBanner from "@/components/PopupBanner";
import { getBannersByPlacement } from "@/app/actions/banner";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ data: topFullBanners }, { data: headerTextBanners }] = await Promise.all([
    getBannersByPlacement("TOP_FULL"),
    getBannersByPlacement("HEADER_TEXT")
  ]);

  const isMaintenance = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

  if (isMaintenance) {
    return (
      <>
        <PopupBanner />
      </>
    );
  }

  return (
    <>
      <Header topFullBanners={topFullBanners} headerTextBanners={headerTextBanners} />
      <PopupBanner />
      {/* 하위의 모든 page.tsx 파일 내용물이 이 자리에 렌더링 됩니다 */}
      {children}
      <RealEstateInfoBanner />
      <Footer />
    </>
  );
}
