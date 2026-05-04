"use client";

import { useEffect } from "react";
import { handleLocationPermissionDenied, handleLocationUnavailable } from "@/utils/locationPermission";

export default function LocationPermissionInitializer() {
  useEffect(() => {
    // Only run in browser
    if (typeof window === "undefined") return;

    // setTimeout to avoid blocking initial render
    const timer = setTimeout(() => {
      const hasPrompted = localStorage.getItem("app_location_prompted");
      
      if (!hasPrompted) {
        // 앱을 처음 설치(방문)했을 때 위치 정보 사용 의사를 묻습니다.
        const askForLocation = confirm("공실뉴스 앱에 오신 것을 환영합니다!\n\n현재 위치를 기반으로 내 주변 부동산 뉴스와 실시간 매물을 확인하시겠습니까?\n(위치 권한 허용이 필요합니다)");
        
        if (askForLocation) {
          if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                // 권한 허용 및 위치 획득 성공
                localStorage.setItem("app_location_prompted", "true");
              },
              (error) => {
                // 권한 거부 또는 실패
                localStorage.setItem("app_location_prompted", "true");
                
                // 사용자가 명시적으로 거부한 경우 설정 화면으로 유도
                if (error.code === 1 /* PERMISSION_DENIED */) {
                  handleLocationPermissionDenied();
                }
              },
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
          } else {
            handleLocationUnavailable();
            localStorage.setItem("app_location_prompted", "true");
          }
        } else {
          // 사용자가 취소를 누른 경우에도 다음에 다시 묻지 않도록 처리
          localStorage.setItem("app_location_prompted", "true");
        }
      }
    }, 1500); // 페이지 로드 후 1.5초 뒤에 팝업

    return () => clearTimeout(timer);
  }, []);

  return null;
}
