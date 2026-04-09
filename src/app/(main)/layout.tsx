import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      {/* 하위의 모든 page.tsx 파일 내용물이 이 자리에 렌더링 됩니다 */}
      {children}
      <Footer />
    </>
  );
}
