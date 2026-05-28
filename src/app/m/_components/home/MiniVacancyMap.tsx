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
  const mapInstanceRef = useRef<any>(null);
  const [visibleCount, setVisibleCount] = useState(0);

  // vacancies가 로드되거나 바뀔 때 현재 지도의 Bounds 범위 내 개수를 다시 계산하는 동기화 훅
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const withCoords = vacancies.filter((v) => v.lat && v.lng);
    const bounds = map.getBounds();
    if (bounds) {
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const visible = withCoords.filter((v) => {
        return v.lat >= sw.getLat() && v.lat <= ne.getLat() && v.lng >= sw.getLng() && v.lng <= ne.getLng();
      });
      setVisibleCount(visible.length);
    }
  }, [vacancies]);

  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current || mapInitRef.current) return;
      const kakao = (window as any).kakao;
      if (!kakao?.maps) return;

      mapInitRef.current = true;

      // 공실광고 중 좌표 있는 것
      const withCoords = vacancies.filter((v) => v.lat && v.lng);

      // 강남역(37.498095, 127.027610)을 중심으로 초기화 (PC 버전과 동일)
      const centerLat = 37.498095;
      const centerLng = 127.027610;

      const map = new kakao.maps.Map(mapRef.current, {
        center: new kakao.maps.LatLng(centerLat, centerLng),
        level: 7,
      });

      mapInstanceRef.current = map;

      // 현재 보이는 경계 좌표 구해서 카운트 업데이트
      const updateVisibleCount = () => {
        const bounds = map.getBounds();
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

      // 지도 초기 로드 직후 1회 계산
      updateVisibleCount();

      // 지도가 움직이거나 드래그/줌아웃될 때마다 실시간 계산
      kakao.maps.event.addListener(map, "idle", updateVisibleCount);

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
        
        // 경매 매물이 포함된 그룹은 남색(#1a4282)으로, 일반 공실은 파란색(#4b89ff)으로 표시
        const hasAuction = group.some((v) => v.trade_type === "경매");
        const fillColor = hasAuction ? "#1a4282" : "#4b89ff";
        
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
          <circle cx="${size/2}" cy="${size/2}" r="${size/2-2}" fill="${fillColor}" stroke="white" stroke-width="2"/>
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
      style={{ position: "relative", width: "100%", borderRadius: "12px", overflow: "hidden" }}
    >
      {/* 카카오 지도 */}
      <div
        ref={mapRef}
        style={{ width: "100%", height: "200px", background: "#e8ecf0" }}
      />

      {/* 공실 수 뱃지 (클릭 시 전체 지도 이동) */}
      <div
        onClick={() => router.push("/m/gongsil")}
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 20,
          background: "rgba(16,33,66,0.92)", // #102142 with opacity
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

      {/* 더보기 버튼 (클릭 시 전체 지도 이동) */}
      <div
        onClick={() => router.push("/m/gongsil")}
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          zIndex: 20,
          background: "#102142", // Match header dark blue
          color: "#fff",
          borderRadius: 20,
          padding: "7px 16px",
          fontSize: 13,
          fontWeight: 700,
          boxShadow: "0 4px 12px rgba(16,33,66,0.4)",
          cursor: "pointer",
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
