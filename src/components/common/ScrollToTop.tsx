"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // 1. 페이지 이동(경로 변경) 시 즉시 스크롤 최상단 정렬
    window.scrollTo(0, 0);
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
    }, 50);

    // 2. 동일 페이지 링크 클릭 시 스크롤 최상단 스냅을 위해 클릭 이벤트 감지
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (anchor) {
        const href = anchor.getAttribute("href");
        if (href) {
          // 특정 앵커 해시 링크(#section-2 등)인 경우 브라우저 기본 이동을 방해하지 않음
          if (href.startsWith("#") && href !== "#") {
            return;
          }
          try {
            const targetUrl = new URL(href, window.location.href);
            if (targetUrl.pathname === window.location.pathname) {
              // 동일한 페이지인 경우 즉시 최상단으로 강제 스냅
              window.scrollTo({ top: 0, behavior: "instant" });
            }
          } catch (err) {
            // URL 파싱 에러 방지
          }
        }
      }
    };

    window.addEventListener("click", handleGlobalClick);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", handleGlobalClick);
    };
  }, [pathname]);

  return null;
}
