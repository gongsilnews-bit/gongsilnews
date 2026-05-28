"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc";

interface Props {
  vacancies: any[];
  isLoading?: boolean;
}

export default function MiniVacancyMap({ vacancies, isLoading }: Props) {
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

  // 지도의 현재 중심 좌표와 배율을 유지한 채 전체 지도 페이지로 정밀 이동
  const handleNavigate = () => {
    if (mapInstance) {
      const center = mapInstance.getCenter();
      const lat = center.getLat();
      const lng = center.getLng();
      const level = mapInstance.getLevel();
      router.push(`/m/gongsil?lat=${lat}&lng=${lng}&level=${level}&mode=auction`);
    } else {
      router.push(`/m/gongsil?lat=${centerLat}&lng=${centerLng}&level=7&mode=auction`);
    }
  };

  // 1단계: 카카오 지도 객체 초기화 (조작 허용하되 성능 최적화를 위해 줌아웃 최대범위 제한)
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

      // 지도는 조작 가능하게 활성화!
      map.setZoomable(true);
      map.setDraggable(true);

      // ⚡ [성능 최적화] 성능 부하를 일으키는 전국 단위(레벨 9 이상) 줌아웃은 과감히 제한! (최대 레벨 8 구/시 단위 한계 설정)
      map.setMaxLevel(8);

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

  // 2단계: vacancies 데이터 및 mapInstance가 모두 완료되면 정식 클러스터러 및 동적 노출 개수 계산
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

    // 지도가 드래그되거나 줌인/줌아웃될 때 현재 영역 내 노출 개수를 실시간 업데이트하는 이벤트 핸들러
    const updateVisibleCount = () => {
      const bounds = mapInstance.getBounds();
      if (!bounds) return;
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const visible = withCoords.filter((v) => {
        return (
          v.lat >= sw.getLat() &&
          v.lat <= ne.getLat() &&
          v.lng >= sw.getLng() &&
          v.lng <= ne.getLng()
        );
      });
      setVisibleCount(visible.length);
    };

    // 첫 바인딩 및 지도 움직임 완료(idle) 시 실시간 계산 이벤트 등록
    updateVisibleCount();
    kakao.maps.event.addListener(mapInstance, "idle", updateVisibleCount);

    // 정식 클러스터러 정의
    const clusterer = new kakao.maps.MarkerClusterer({
      map: mapInstance,
      averageCenter: true,
      minLevel: 1,
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
    const newMarkers = withCoords.map((v) => {
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

    return () => {
      kakao.maps.event.removeListener(mapInstance, "idle", updateVisibleCount);
    };
  }, [vacancies, mapInstance]);

  return (
    <div
      style={{ position: "relative", width: "100%", borderRadius: "12px", overflow: "hidden" }}
    >
      {/* 카카오 지도 */}
      <div
        ref={mapRef}
        style={{ width: "100%", height: "200px", background: "#e8ecf0" }}
      />

      {/* 네트워크 로딩 오버레이 */}
      {isLoading && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 99999 }}>
          <style>{`
            @keyframes pulseRingMini {
              0% { transform: scale(0.8); opacity: 0.5; }
              100% { transform: scale(1.5); opacity: 0; }
            }
          `}</style>
          <div style={{ position: "relative", width: "48px", height: "48px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "8px" }}>
            <div style={{ position: "absolute", width: "100%", height: "100%", borderRadius: "50%", background: "#4b89ff", animation: "pulseRingMini 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite" }} />
            <div style={{ position: "relative", width: "24px", height: "24px", borderRadius: "50%", background: "#1a4282", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
            </div>
          </div>
          <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#1a2e50", margin: "0 0 4px 0" }}>네트워크 로딩 중입니다</h3>
          <p style={{ fontSize: "11px", color: "#6b7280", textAlign: "center", lineHeight: 1.4, margin: 0 }}>
            실시간 공실 정보를 안전하게 불러오고 있습니다.
          </p>
        </div>
      )}

      {/* 공실 수 뱃지 (클릭 시 현재 위치 기반으로 이동) */}
      <div
        onClick={handleNavigate}
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
          cursor: "pointer",
        }}
      >
        🏢 공실 {visibleCount}건 지도보기
      </div>

      {/* 더보기 버튼 (클릭 시 현재 위치 기반으로 이동) */}
      <div
        onClick={handleNavigate}
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
          cursor: "pointer",
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
