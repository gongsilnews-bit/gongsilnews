"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getVacancies, getVacancyDetail } from "@/app/actions/vacancy";

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc";

function formatPrice(v: any): string {
  const dep = v.deposit || 0;
  const rent = v.monthly_rent || 0;
  const trade = v.trade_type || "";
  const fmt = (n: number) => {
    if (n >= 100000000) return `${(n / 100000000).toFixed(n % 100000000 === 0 ? 0 : 1)}억`;
    if (n >= 10000) return `${Math.round(n / 10000)}만`;
    return `${n}`;
  };
  if (trade === "월세" && rent > 0) return `${fmt(dep)}/${fmt(rent)}`;
  if (trade === "전세") return `전세 ${fmt(dep)}`;
  if (dep > 0) return `${fmt(dep)}`;
  return "-";
}

export default function MobileGongsilPage() {
  const router = useRouter();
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCluster, setSelectedCluster] = useState<any[] | null>(null);
  const [selectedVacancy, setSelectedVacancy] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // 데이터 로드
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await getVacancies({ status: "ACTIVE" });
      if (res.success && res.data) {
        const withImages = res.data.map((v: any) => ({
          ...v,
          images: v.vacancy_photos
            ? [...v.vacancy_photos].sort((a: any, b: any) => a.sort_order - b.sort_order).map((p: any) => p.url)
            : [],
        }));
        setVacancies(withImages);
      }
      setLoading(false);
    };
    load();
  }, []);

  // 카카오 지도 초기화
  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current || kakaoMapRef.current) return;
      const kakao = (window as any).kakao;
      if (!kakao?.maps) return;

      const map = new kakao.maps.Map(mapRef.current, {
        center: new kakao.maps.LatLng(37.5665, 126.978),
        level: 7,
      });

      kakao.maps.event.addListener(map, "click", () => {
        setSelectedCluster(null);
        setSelectedVacancy(null);
      });

      kakaoMapRef.current = map;
      setMapLoaded(true);
    };

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
          if ((window as any).kakao?.maps?.LatLng) { clearInterval(timer); initMap(); }
        }, 100);
      }
    }
  }, []);

  // 마커 그리기
  useEffect(() => {
    if (!kakaoMapRef.current || !mapLoaded || vacancies.length === 0) return;
    const kakao = (window as any).kakao;

    markersRef.current.forEach((m: any) => m.setMap(null));
    markersRef.current = [];

    // lat/lng 기준으로 그룹화
    const groups: Record<string, any[]> = {};
    vacancies.forEach((v) => {
      if (!v.lat || !v.lng) return;
      const key = `${Math.round(v.lat * 1000)}_${Math.round(v.lng * 1000)}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(v);
    });

    Object.values(groups).forEach((group) => {
      const { lat, lng } = group[0];
      const count = group.length;
      const size = count > 9 ? 52 : 44;
      const color = "#1a2e50";

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2-2}" fill="${color}" stroke="white" stroke-width="2.5"/>
        <text x="50%" y="50%" dy="1px" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="${count>9?14:15}" font-weight="bold" font-family="sans-serif">${count}</text>
      </svg>`;

      const img = new kakao.maps.MarkerImage(
        `data:image/svg+xml,${encodeURIComponent(svg)}`,
        new kakao.maps.Size(size, size),
        { offset: new kakao.maps.Point(size / 2, size / 2) }
      );
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(lat, lng),
        image: img,
        map: kakaoMapRef.current,
      });
      kakao.maps.event.addListener(marker, "click", () => {
        setSelectedVacancy(null);
        setSelectedCluster(group);
      });
      markersRef.current.push(marker);
    });
  }, [vacancies, mapLoaded]);

  // 상세 조회
  const handleVacancyClick = async (v: any) => {
    setDetailLoading(true);
    setSelectedVacancy(v); // 먼저 기본 정보 표시
    const res = await getVacancyDetail(v.id);
    if (res.success && res.data) {
      const detail = {
        ...res.data,
        images: res.data.vacancy_photos
          ? [...res.data.vacancy_photos].sort((a: any, b: any) => a.sort_order - b.sort_order).map((p: any) => p.url)
          : v.images || [],
      };
      setSelectedVacancy(detail);
    }
    setDetailLoading(false);
  };

  const goBack = () => {
    if (selectedVacancy) { setSelectedVacancy(null); return; }
    if (selectedCluster) { setSelectedCluster(null); }
  };

  return (
    <div style={{ width: "100%", backgroundColor: "#fff", minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative" }}>
      <style>{`
        .no-scrollbar::-webkit-scrollbar{display:none;}
        .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none;}
        .gongsil-sheet{position:absolute;bottom:0;left:0;width:100%;background:#fff;border-radius:20px 20px 0 0;box-shadow:0 -8px 32px rgba(0,0,0,0.15);transform:translateY(100%);transition:transform 0.35s cubic-bezier(0.25,1,0.5,1);z-index:30;max-height:75vh;display:flex;flex-direction:column;}
        .gongsil-sheet.open{transform:translateY(0);}
        .detail-panel{position:absolute;top:0;left:0;width:100%;height:100%;background:#fff;z-index:40;transform:translateX(100%);transition:transform 0.35s cubic-bezier(0.25,1,0.5,1);overflow-y:auto;}
        .detail-panel.open{transform:translateX(0);}
        .skeleton{background:linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:6px;}
        @keyframes shimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}
        .v-card:active{background:#f9fafb;}
      `}</style>

      {/* 카카오 지도 */}
      <div ref={mapRef} style={{ width: "100%", flex: 1, minHeight: "calc(100vh - 124px)" }} />

      {/* 지도 로딩 중 */}
      {!mapLoaded && (
        <div style={{ position: "absolute", inset: 0, background: "#e8ecf0", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🗺️</div>
            <p style={{ color: "#6b7280", fontSize: "14px" }}>지도를 불러오는 중...</p>
          </div>
        </div>
      )}

      {/* 매물 수 표시 */}
      {mapLoaded && (
        <div style={{ position: "absolute", top: "16px", left: "16px", zIndex: 20, background: "rgba(255,255,255,0.95)", borderRadius: "20px", padding: "8px 14px", fontSize: "13px", fontWeight: 700, color: "#1a2e50", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          🏢 공실 {vacancies.filter(v => v.lat && v.lng).length}건
        </div>
      )}

      {/* 내 위치 버튼 */}
      {mapLoaded && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (navigator.geolocation && kakaoMapRef.current) {
              navigator.geolocation.getCurrentPosition((pos) => {
                const kakao = (window as any).kakao;
                kakaoMapRef.current.panTo(new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude));
                kakaoMapRef.current.setLevel(5);
              });
            }
          }}
          style={{ position: "absolute", top: "16px", right: "16px", zIndex: 20, background: "#f97316", color: "#fff", border: "none", borderRadius: "20px", padding: "8px 14px", fontSize: "13px", fontWeight: 700, boxShadow: "0 4px 12px rgba(249,115,22,0.4)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
          내 위치
        </button>
      )}

      {/* 바텀시트: 클러스터 리스트 */}
      <div className={`gongsil-sheet ${selectedCluster && !selectedVacancy ? "open" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px", cursor: "pointer" }} onClick={() => setSelectedCluster(null)}>
          <div style={{ width: "40px", height: "4px", backgroundColor: "#e5e7eb", borderRadius: "4px" }} />
        </div>
        <div style={{ padding: "0 20px 14px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#111827" }}>
            매물 <span style={{ color: "#f97316" }}>{selectedCluster?.length || 0}</span>개
          </h3>
          <button onClick={() => setSelectedCluster(null)} style={{ background: "#f3f4f6", border: "none", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer", fontSize: "15px", color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div className="no-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "8px 16px 20px" }}>
          {selectedCluster?.map((v: any) => (
            <div
              key={v.id}
              className="v-card"
              onClick={() => handleVacancyClick(v)}
              style={{ display: "flex", gap: "12px", padding: "14px 0", borderBottom: "1px solid #f3f4f6", cursor: "pointer", transition: "background 0.15s" }}
            >
              <div style={{ width: "90px", height: "72px", borderRadius: "10px", overflow: "hidden", flexShrink: 0, backgroundColor: "#e5e7eb" }}>
                {v.images?.[0] ? (
                  <img src={v.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1a2e50,#2d4a7a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>🏠</div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: "4px", marginBottom: "5px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#f97316", background: "#fff7ed", padding: "2px 6px", borderRadius: "4px" }}>{v.trade_type || "-"}</span>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", background: "#f3f4f6", padding: "2px 6px", borderRadius: "4px" }}>{v.property_type || ""}</span>
                </div>
                <p style={{ fontSize: "17px", fontWeight: 800, color: "#111827", marginBottom: "4px" }}>{formatPrice(v)}</p>
                <p style={{ fontSize: "12px", color: "#6b7280" }}>
                  {[v.exclusive_m2 && `전용 ${v.exclusive_m2}㎡`, v.current_floor && `${v.current_floor}층`, v.direction].filter(Boolean).join(" · ")}
                </p>
                <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>{v.building_name || [v.dong, v.sigungu].filter(Boolean).join(" ")}</p>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" style={{ flexShrink: 0, alignSelf: "center" }}><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          ))}
        </div>
      </div>

      {/* 상세 패널 */}
      <div className={`detail-panel ${selectedVacancy ? "open" : ""}`} onClick={(e) => e.stopPropagation()}>
        {/* 상단 헤더 */}
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#fff", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px" }}>
          <button onClick={goBack} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h2 style={{ fontSize: "16px", fontWeight: 800, color: "#111827", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selectedVacancy?.building_name || "매물 상세"}
          </h2>
        </div>

        {selectedVacancy && (
          <>
            {/* 이미지 슬라이더 */}
            <div style={{ width: "100%", aspectRatio: "4/3", backgroundColor: "#e5e7eb", overflow: "hidden" }}>
              {selectedVacancy.images?.[0] ? (
                <img src={selectedVacancy.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1a2e50,#2d4a7a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "48px" }}>🏠</div>
              )}
            </div>

            {/* 매물 핵심 정보 */}
            <div style={{ padding: "20px 16px", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#f97316", background: "#fff7ed", padding: "3px 8px", borderRadius: "5px" }}>{selectedVacancy.trade_type}</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#1a2e50", background: "#e2e8f0", padding: "3px 8px", borderRadius: "5px" }}>{selectedVacancy.property_type}</span>
                {detailLoading && <span style={{ fontSize: "11px", color: "#9ca3af", alignSelf: "center" }}>상세 로드중...</span>}
              </div>
              <p style={{ fontSize: "26px", fontWeight: 900, color: "#111827", marginBottom: "8px" }}>{formatPrice(selectedVacancy)}</p>
              {selectedVacancy.maintenance_fee > 0 && (
                <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>관리비 {Math.round(selectedVacancy.maintenance_fee / 10000)}만원</p>
              )}
              <p style={{ fontSize: "14px", color: "#374151" }}>
                {[selectedVacancy.sido, selectedVacancy.sigungu, selectedVacancy.dong].filter(Boolean).join(" ")}
                {selectedVacancy.building_name && ` ${selectedVacancy.building_name}`}
              </p>
            </div>

            {/* 상세 정보 테이블 */}
            <div style={{ padding: "16px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#111827", marginBottom: "14px" }}>기본 정보</h3>
              {[
                ["거래방식", selectedVacancy.trade_type],
                ["건물유형", selectedVacancy.property_type],
                ["공급/전용", selectedVacancy.supply_m2 && `${selectedVacancy.supply_m2}㎡ / ${selectedVacancy.exclusive_m2 || "-"}㎡`],
                ["해당/총층", selectedVacancy.current_floor && `${selectedVacancy.current_floor}층 / ${selectedVacancy.total_floor || "-"}층`],
                ["방향", selectedVacancy.direction],
                ["방/욕실", selectedVacancy.room_count && `${selectedVacancy.room_count}개 / ${selectedVacancy.bath_count || 0}개`],
                ["주차", selectedVacancy.parking],
                ["입주가능일", selectedVacancy.move_in_date || "즉시입주(공실)"],
              ].filter(([, v]) => v).map(([label, val]) => (
                <div key={label as string} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f9fafb" }}>
                  <span style={{ fontSize: "14px", color: "#6b7280" }}>{label}</span>
                  <span style={{ fontSize: "14px", color: "#111827", fontWeight: 700 }}>{val}</span>
                </div>
              ))}
            </div>

            {/* 설명 */}
            {selectedVacancy.description && (
              <div style={{ margin: "0 16px 16px", padding: "14px", background: "#f8f9fa", borderRadius: "10px" }}>
                <p style={{ fontSize: "14px", color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{selectedVacancy.description}</p>
              </div>
            )}

            {/* 옵션 */}
            {selectedVacancy.options?.length > 0 && (
              <div style={{ padding: "0 16px 16px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#111827", marginBottom: "12px" }}>옵션</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {selectedVacancy.options.map((opt: string) => (
                    <span key={opt} style={{ fontSize: "13px", background: "#f3f4f6", color: "#374151", padding: "6px 12px", borderRadius: "6px", fontWeight: 600 }}>{opt}</span>
                  ))}
                </div>
              </div>
            )}

            {/* 하단 CTA */}
            <div style={{ position: "sticky", bottom: 0, background: "#fff", borderTop: "1px solid #e5e7eb", padding: "14px 16px 24px", display: "flex", gap: "10px" }}>
              <button style={{ width: "52px", height: "52px", borderRadius: "12px", border: "1.5px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", cursor: "pointer", flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </button>
              <button
                onClick={() => { const phone = selectedVacancy?.members?.phone || selectedVacancy?.client_phone; if (phone) window.location.href = `tel:${phone}`; }}
                style={{ flex: 1, height: "52px", borderRadius: "12px", background: "#1a2e50", color: "#fff", fontSize: "16px", fontWeight: 800, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                전화하기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
