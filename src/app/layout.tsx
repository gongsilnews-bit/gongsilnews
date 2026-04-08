import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "공실뉴스 - 부동산 중개망의 스마트한 변화",
  description: "11만 부동산을 위한 무료 정보 채널",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
