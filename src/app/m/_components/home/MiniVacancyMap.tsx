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

  // ê°•ë‚¨??37.498095, 127.027610) ì¤‘ì‹¬ë¶€ ì¢Œí‘œ ?•ì˜
  const centerLat = 37.498095;
  const centerLng = 127.027610;

  // ì§€?„ì˜ ?„ì¬ ì¤‘ì‹¬ ì¢Œí‘œ?€ ë°°ìœ¨??? ì???ì±??„ì²´ ì§€???˜ì´ì§€ë¡??•ë? ?´ë™
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

  // 1?¨ê³„: ì¹´ì¹´??ì§€??ê°ì²´ ì´ˆê¸°??(ì¡°ì‘ ?ˆìš©?˜ë˜ ?±ëŠ¥ ìµœì ?”ë? ?„í•´ ì¤Œì•„??ìµœë?ë²”ìœ„ ?œí•œ)
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

      // ì§€?„ëŠ” ì¡°ì‘ ê°€?¥í•˜ê²??œì„±??
      map.setZoomable(true);
      map.setDraggable(true);

      // ??[?±ëŠ¥ ìµœì ?? ?•ë?(ì¤Œì¸) / ì¶•ì†Œ(ì¤Œì•„?? ë²”ìœ„ë¥??¼ë?ë¡œë§Œ ?œí•œ?˜ì—¬ ê³¨ëª©ê¸??¸ì¶œ ì°¨ë‹¨ ë°?ìµœì ???ˆì´?„ì›ƒ ? ì?!
      map.setMinLevel(6);
      map.setMaxLevel(7);

      setMapInstance(map);
    };

    // Kakao SDK ë¡œë“œ
    if ((window as any).kakao?.maps?.MarkerClusterer) {
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
          if ((window as any).kakao?.maps?.MarkerClusterer) {
            clearInterval(timer);
            initMap();
          }
        }, 100);
        return () => clearInterval(timer);
      }
    }
  }, []);

  // 2?¨ê³„: vacancies ?°ì´??ë°?mapInstanceê°€ ëª¨ë‘ ?„ë£Œ?˜ë©´ ?•ì‹ ?´ëŸ¬?¤í„°??ë°??™ì  ?¸ì¶œ ê°œìˆ˜ ê³„ì‚°
  useEffect(() => {
    if (!mapInstance) return;
    const kakao = (window as any).kakao;
    if (!kakao?.maps) return;

    // ê¸°ì¡´ ?´ëŸ¬?¤í„°??ë°?ë§ˆì»¤ ì´ˆê¸°??    if (typeof kakao.maps.MarkerClusterer !== 'function') {
      const retryTimer = setTimeout(() => {
        setMapInstance({ ...mapInstance });
      }, 500);
      return () => clearTimeout(retryTimer);
    }

    if (clustererRef.current) {
      clustererRef.current.clear();
    }
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // ì¢Œí‘œê°€ ? íš¨??ë§¤ë¬¼ ?„í„°ë§?    const withCoords = vacancies.filter((v) => v.lat && v.lng);

    // ì§€?„ê? ?œë˜ê·¸ë˜ê±°ë‚˜ ì¤Œì¸/ì¤Œì•„?ƒë  ???„ì¬ ?ì—­ ???¸ì¶œ ê°œìˆ˜ë¥??¤ì‹œê°??…ë°?´íŠ¸?˜ëŠ” ?´ë²¤???¸ë“¤??    const updateVisibleCount = () => {
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

    // ì²?ë°”ì¸??ë°?ì§€???€ì§ì„ ?„ë£Œ(idle) ???¤ì‹œê°?ê³„ì‚° ?´ë²¤???±ë¡
    updateVisibleCount();
    kakao.maps.event.addListener(mapInstance, "idle", updateVisibleCount);

    // ?•ì‹ ?´ëŸ¬?¤í„°???•ì˜
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

    // ?´ëŸ¬?¤í„° ë³‘í•© ?„ë£Œ ???´ë? ë§¤ë¬¼ ?€?…ì— ë§ì¶° ê³¤ìƒ‰/?Œë????™ì  ?‰ìƒ ë§¤ì¹­
    kakao.maps.event.addListener(clusterer, "clustered", (clusters: any[]) => {
      clusters.forEach((cluster) => {
        const mks = cluster.getMarkers();
        if (mks.length < 2) return;
        const overlay = cluster.getClusterMarker().getContent();
        if (overlay && overlay.style) {
          overlay.style.background = "#1a4282";
          overlay.style.color = "#ffffff";
          overlay.style.border = "3px solid rgba(255,255,255,0.8)";
        }
      });
    });

    // ê°œë³„ ë§ˆì»¤ ?ì„±
    const size = 32;
    const newMarkers = withCoords.map((v) => {
      const fillColor = "#1a4282";

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
      {/* ì¹´ì¹´??ì§€??*/}
      <div
        ref={mapRef}
        style={{ width: "100%", height: "200px", background: "#e8ecf0" }}
      />

      {/* ?¤íŠ¸?Œí¬ ë¡œë”© ?¤ë²„?ˆì´ */}
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
            <div style={{ position: "relative", width: "24px", height: "24px", borderRadius: "50%", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.12)", border: "1px solid rgba(0,0,0,0.06)" }}>
              <style>{`
                @keyframes spinCircleMini {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
              <div style={{
                width: 14,
                height: 14,
                border: "2px solid rgba(26, 115, 232, 0.15)",
                borderTop: "2px solid #1a73e8",
                borderRadius: "50%",
                animation: "spinCircleMini 0.8s linear infinite"
              }} />
            </div>
          </div>
          <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#1a2e50", margin: "0 0 4px 0" }}>?¤íŠ¸?Œí¬ ë¡œë”© ì¤‘ì…?ˆë‹¤</h3>
          <p style={{ fontSize: "11px", color: "#6b7280", textAlign: "center", lineHeight: 1.4, margin: 0 }}>
            ?¤ì‹œê°?ê³µì‹¤ ?•ë³´ë¥??ˆì „?˜ê²Œ ë¶ˆëŸ¬?¤ê³  ?ˆìŠµ?ˆë‹¤.
          </p>
        </div>
      )}

      {/* ê³µì‹¤ ??ë±ƒì? (?´ë¦­ ???„ì¬ ?„ì¹˜ ê¸°ë°˜?¼ë¡œ ?´ë™) */}
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
        ?¢ ê³µì‹¤ {visibleCount}ê±?ì§€?„ë³´ê¸?      </div>

      {/* ?”ë³´ê¸?ë²„íŠ¼ (?´ë¦­ ???„ì¬ ?„ì¹˜ ê¸°ë°˜?¼ë¡œ ?´ë™) */}
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
        ê³µì‹¤?´ëŒ ë°”ë¡œê°€ê¸?        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </div>
  );
}
