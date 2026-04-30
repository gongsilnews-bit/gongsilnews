"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc";

interface Props {
  vacancies: any[];
}

export default function MiniVacancyMap({ vacancies }: Props) {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInitRef = useRef(false);

  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current || mapInitRef.current) return;
      const kakao = (window as any).kakao;
      if (!kakao?.maps) return;

      mapInitRef.current = true;

      // 매물 중 좌표 있는 것
      const withCoords = vacancies.filter((v) => v.lat && v.lng);

      // 중심점 계산 (평균)
      let centerLat = 37.5665;
      let centerLng = 126.978;
      if (withCoords.length > 0) {
        centerLat = withCoords.reduce((s, v) => s + v.lat, 0) / withCoords.length;
        centerLng = withCoords.reduce((s, v) => s + v.lng, 0) / withCoords.length;
      }

      const map = new kakao.maps.Map(mapRef.current, {
        center: new kakao.maps.LatLng(centerLat, centerLng),
        level: 7,
        draggable: false,    // 미리보기이므로 드래그 비활성화
        scrollwheel: false,
        disableDoubleClickZoom: true,
      });

      // 줌 컨트롤 숨김 (미리보기)
      map.setZoomable(false);

      // 마커 그룹화 (좌표 기준)
      const groups: Record<string, any[]> = {};
      withCoords.forEach((v) => {
        // 소수점 3자리(약 100m) 단위로 그룹화
        const key = `${Math.round(v.lat * 1000)}_${Math.round(v.lng * 1000)}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(v);
      });

      // 그룹별 마커 그리기
      Object.values(groups).forEach((group) => {
        const { lat, lng } = group[0];
        const count = group.length;
        const size = count > 9 ? 42 : 36;
        
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
          <circle cx="${size/2}" cy="${size/2}" r="${size/2-2}" fill="#4b89ff" stroke="white" stroke-width="2"/>
          <text x="50%" y="50%" dy="1px" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="${count > 9 ? 14 : 15}" font-weight="bold" font-family="sans-serif">${count}</text>
        </svg>`;

        new kakao.maps.Marker({
          position: new kakao.maps.LatLng(lat, lng),
          image: new kakao.maps.MarkerImage(
            `data:image/svg+xml,${encodeURIComponent(svg)}`,
            new kakao.maps.Size(size, size),
            { offset: new kakao.maps.Point(size / 2, size / 2) }
          ),
          map,
        });
      });
    };

    // Kakao SDK 로드
    if ((window as any).kakao?.maps?.LatLng) {
      initMap();
    } else {
      const scriptId = "kakao-map-script";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&libraries=services,clusterer&autoload=false`;
        script.onload = () => (window as any).kakao.maps.load(initMap);
        document.head.appendChild(script);
      } else {
        const timer = setInterval(() => {
          if ((window as any).kakao?.maps?.LatLng) {
            clearInterval(timer);
            initMap();
          }
        }, 100);
        return () => clearInterval(timer);
      }
    }
  }, [vacancies]);

  return (
    <div
      onClick={() => router.push("/m/gongsil")}
      style={{ position: "relative", width: "100%", cursor: "pointer", borderRadius: "12px", overflow: "hidden" }}
    >
      {/* 카카오 지도 */}
      <div
        ref={mapRef}
        style={{ width: "100%", height: "200px", background: "#e8ecf0" }}
      />

      {/* 오버레이: 클릭 유도 (지도 인터랙션 방지용) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 10,
          // 투명 오버레이로 지도 드래그 방지 + 클릭 이벤트만 통과
        }}
      />

      {/* 공실 수 뱃지 */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 20,
          background: "rgba(26,66,130,0.92)",
          color: "#fff",
          borderRadius: 20,
          padding: "6px 14px",
          fontSize: 13,
          fontWeight: 700,
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          pointerEvents: "none",
        }}
      >
        🏢 공실 {vacancies.filter((v) => v.lat && v.lng).length}건 지도보기
      </div>

      {/* 더보기 버튼 */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          zIndex: 20,
          background: "#1a4282",
          color: "#fff",
          borderRadius: 20,
          padding: "7px 16px",
          fontSize: 13,
          fontWeight: 700,
          boxShadow: "0 4px 12px rgba(26,66,130,0.4)",
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        공실열람 바로가기
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </div>
  );
}
