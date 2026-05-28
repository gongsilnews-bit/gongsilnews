"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc";

interface Props {
  vacancies: any[];
}

export default function MiniVacancyMap({ vacancies }: Props) {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInitRef = useRef(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const clustererRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // 강남역(37.498095, 127.027610) 중심부 좌표 정의
  const centerLat = 37.498095;
  const centerLng = 127.027610;

  // 전체 지도 페이지로 정밀 이동
  const handleNavigate = () => {
    router.push(`/m/gongsil?lat=${centerLat}&lng=${centerLng}&level=7&mode=auction`);
  };

  // 1단계: 카카오 지도 객체 초기화 (터치 스크롤 스크래치 완전 방지용 고정형 프리뷰)
  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current || mapInitRef.current) return;
      const kakao = (window as any).kakao;
      if (!kakao?.maps) return;

      mapInitRef.current = true;

      const map = new kakao.maps.Map(mapRef.current, {
        center: new kakao.maps.LatLng(centerLat, centerLng),
        level: 7,
      });

      // 🛑 모바일 홈 화면 스크롤 오동작을 100% 방지하기 위해 줌 및 드래그 전면 불허!
      map.setZoomable(false);
      map.setDraggable(false);

      setMapInstance(map);
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
  }, []);

  // 2단계: vacancies 데이터 및 mapInstance가 모두 완료되면 정식 클러스터러 렌더링
  useEffect(() => {
    if (!mapInstance) return;
    const kakao = (window as any).kakao;
    if (!kakao?.maps) return;

    // 기존 클러스터러 및 마커 초기화
    if (clustererRef.current) {
      clustererRef.current.clear();
    }
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // 좌표가 유효한 매물 필터링
    const withCoords = vacancies.filter((v) => v.lat && v.lng);

    // ⚡ [성능 극대화 핵심] 어차피 고정형 프리뷰이므로, 현재 강남역 근처에 노출될 수 있는 매물만 초고속 필터링!
    // 레벨 7의 가시범위에 넉넉한 오차범위(위도 0.15, 경도 0.20)를 지정하여 6천 개 중 수백 개만 렌더링하여 모바일 부하 0% 실현!
    const visibleCoords = withCoords.filter(
      (v) => Math.abs(v.lat - centerLat) < 0.15 && Math.abs(v.lng - centerLng) < 0.20
    );

    setVisibleCount(visibleCoords.length);

    // 정식 클러스터러 정의
    const clusterer = new kakao.maps.MarkerClusterer({
      map: mapInstance,
      averageCenter: true,
      minLevel: 1, // 줌 조작이 막혀 있으므로 모든 레벨에서 병합
      gridSize: 60,
      disableClickZoom: true,
      styles: [
        { width: "50px", height: "50px", background: "#1a4282", color: "#fff", textAlign: "center", lineHeight: "44px", borderRadius: "50%", fontWeight: "bold", fontSize: "16px", border: "3px solid #ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }
      ],
    });
    clustererRef.current = clusterer;

    // 클러스터 병합 완료 시 내부 매물 타입에 맞춰 곤색/파란색 동적 색상 매칭
    kakao.maps.event.addListener(clusterer, "clustered", (clusters: any[]) => {
      clusters.forEach((cluster) => {
        const mks = cluster.getMarkers();
        if (mks.length < 2) return;
        const hasStandard = mks.some((m: any) => m.customData && m.customData.trade_type !== "경매" && !m.customData.is_auction);
        const overlay = cluster.getClusterMarker().getContent();
        if (overlay && overlay.style) {
          overlay.style.background = hasStandard ? "#1a73e8" : "#1a4282";
          overlay.style.color = "#ffffff";
          overlay.style.border = "3px solid rgba(255,255,255,0.8)";
        }
      });
    });

    // 개별 마커 생성
    const size = 32;
    const newMarkers = visibleCoords.map((v) => {
      const isAuction = v.trade_type === "경매" || v.is_auction === true;
      const fillColor = isAuction ? "#1a4282" : "#1a73e8";

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2-2}" fill="${fillColor}" stroke="white" stroke-width="2"/>
        <text x="50%" y="50%" dy="1px" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="13" font-weight="bold" font-family="sans-serif">1</text>
      </svg>`;

      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(v.lat, v.lng),
        image: new kakao.maps.MarkerImage(
          `data:image/svg+xml,${encodeURIComponent(svg)}`,
          new kakao.maps.Size(size, size),
          { offset: new kakao.maps.Point(size / 2, size / 2) }
        ),
      });

      marker.customData = v;
      return marker;
    });

    markersRef.current = newMarkers;
    clusterer.addMarkers(newMarkers);
  }, [vacancies, mapInstance]);

  return (
    <div
      onClick={handleNavigate}
      style={{ position: "relative", width: "100%", borderRadius: "12px", overflow: "hidden", cursor: "pointer" }}
    >
      {/* 카카오 지도 */}
      <div
        ref={mapRef}
        style={{ width: "100%", height: "200px", background: "#e8ecf0" }}
      />

      {/* 🛑 투명 터치 오버레이 레이어: 지도상의 드래그나 줌 핀치를 완전히 차단하여 모바일 메인 스크롤의 완벽한 쾌적함을 고수 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 10,
          background: "transparent",
        }}
      />

      {/* 공실 수 뱃지 */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 20,
          background: "rgba(16,33,66,0.92)",
          color: "#fff",
          borderRadius: 20,
          padding: "6px 14px",
          fontSize: 13,
          fontWeight: 700,
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        🏢 공실 {visibleCount}건 지도보기
      </div>

      {/* 더보기 버튼 */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          zIndex: 20,
          background: "#102142",
          color: "#fff",
          borderRadius: 20,
          padding: "7px 16px",
          fontSize: 13,
          fontWeight: 700,
          boxShadow: "0 4px 12px rgba(16,33,66,0.4)",
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
