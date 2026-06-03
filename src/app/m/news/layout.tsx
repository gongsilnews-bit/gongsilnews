import React from "react";
// 뉴스 리스트 페이지는 MobileNewsClient 안의 카테고리 탭바가 헤더 역할을 합니다.
// 별도 SubPageHeader 없이 paddingTop: 0으로 탭바가 최상단에 위치합니다.
export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
