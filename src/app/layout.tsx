import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "공실뉴스 - 부동산 중개망의 스마트한 변화",
  description: "11만 부동산을 위한 무료 정보 채널. 실시간 공실 정보, 부동산 뉴스, 시세 분석을 제공합니다.",
  metadataBase: new URL("https://gongsilnews.com"),
  openGraph: {
    title: "공실뉴스 - 부동산 중개망의 스마트한 변화",
    description: "11만 부동산을 위한 무료 정보 채널",
    url: "https://gongsilnews.com",
    siteName: "공실뉴스",
    locale: "ko_KR",
    type: "website",
  },
  verification: {
    // 네이버 서치어드바이저에서 받은 인증 코드를 여기에 입력
    // other: { "naver-site-verification": "여기에_인증코드_입력" },
  },
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
