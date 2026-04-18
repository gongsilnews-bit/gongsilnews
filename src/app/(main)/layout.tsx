import Header from "@/components/Header";
import Footer from "@/components/Footer";
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

  return (
    <>
      <Header topFullBanners={topFullBanners} headerTextBanners={headerTextBanners} />
      <PopupBanner />
      {/* 하위의 모든 page.tsx 파일 내용물이 이 자리에 렌더링 됩니다 */}
      {children}
      <Footer />
    </>
  );
}
