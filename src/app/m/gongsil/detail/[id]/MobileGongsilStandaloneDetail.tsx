"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCleanAddrText, formatAreaWithPy, getMaskedAddress } from "@/app/(map)/gongsil/gongsilHelpers";

interface MobileGongsilStandaloneDetailProps {
  vacancy: any;
  photos: any[];
  agencyInfo: any;
  ownerVacancies?: any[];
}

// 🌟 글로벌 금액 포맷터 (기존 소스 100% 동일)
export const formatAmount = (amt: number) => {
  if (!amt) return "";
  const m = Math.round(amt / 10000);
  if (m === 0) return "";

  const e = Math.floor(m / 10000);
  const r = m % 10000;

  let result = "";
  if (e > 0) result += `${e}억`;
  if (r > 0) {
    const c = Math.floor(r / 1000);
    const rem = r % 1000;
    let rest = "";
    if (c > 0) rest += `${c}천`;
    if (rem > 0) rest += `${rem}`;
    result += (result ? " " : "") + rest + "만";
  }
  return result || "";
};

function formatPrice(v: any): string {
  const dep = v.deposit || 0;
  const rent = v.monthly_rent || 0;
  const trade = v.trade_type || "";

  if (trade === "월세" && rent > 0) {
    const monthlyManwon = Math.round(rent / 10000);
    return `${formatAmount(dep)}/${monthlyManwon}만`;
  }
  if (dep > 0) return `${formatAmount(dep)}`;
  return "";
}

// 옵션 아이콘 헬퍼 (기존 소스 100% 동일)
const OptionIcon = ({ name }: { name: string }) => {
  const sz = 24;
  const str = 1.8;
  switch (name) {
    case "에어컨": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="8" rx="2"/><path d="M7 14v4"/><path d="M17 14v4"/><path d="M12 14v4"/></svg>;
    case "침대": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>;
    case "도어락": case "전자도어락": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
    case "전자렌지": case "전자레인지": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="12" rx="2"/><path d="M17 10h.01"/><path d="M17 14h.01"/><path d="M7 12h5"/></svg>;
    case "비데": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z"/><path d="M7 12.5L10 15.5L17 8.5"/></svg>;
    case "TV": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>;
    case "옷장": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M12 2v20"/><path d="M8 12h.01"/><path d="M16 12h.01"/></svg>;
    case "세탁기": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="13" r="5"/><path d="M8 6h.01"/><path d="M10 6h.01"/></svg>;
    case "냉장고": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M5 10h14"/><path d="M9 14v2"/><path d="M9 5v2"/></svg>;
    case "가스레인지": case "인덕션": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 10h16"/><circle cx="8" cy="15" r="2"/><circle cx="16" cy="15" r="2"/></svg>;
    default: return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
  }
};

export default function MobileGongsilStandaloneDetail({
  vacancy,
  photos,
  agencyInfo,
}: MobileGongsilStandaloneDetailProps) {
  const router = useRouter();
  const [detailTab, setDetailTab] = useState<"info" | "realtor">("info");
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const shareDropdownRef = useRef<HTMLDivElement | null>(null);

  // 병합 이미지 목록
  const images = (photos && photos.length > 0)
    ? photos.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((p) => p.url).filter(Boolean)
    : (vacancy.images && vacancy.images.length > 0)
    ? vacancy.images
    : vacancy.photo_url
    ? [vacancy.photo_url]
    : [];

  const selectedVacancy = {
    ...vacancy,
    images,
  };

  const goBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/m");
    }
  };

  const handleCopyUrl = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      alert("URL이 복사되었습니다.");
      setShowShareDropdown(false);
    }
  };

  const handleKakaoShare = () => {
    if (typeof window !== "undefined" && (window as any).Kakao) {
      const kakao = (window as any).Kakao;
      if (!kakao.isInitialized()) {
        const key = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc";
        kakao.init(key);
      }
      kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title: getCleanAddrText(selectedVacancy) || "공실뉴스 매물",
          description: `${selectedVacancy.trade_type} ${formatPrice(selectedVacancy)}`,
          imageUrl: selectedVacancy.images?.[0] || "",
          link: { mobileWebUrl: window.location.href, webUrl: window.location.href },
        },
      });
      setShowShareDropdown(false);
    } else {
      handleCopyUrl();
    }
  };

  const targetAgency = agencyInfo || (Array.isArray(selectedVacancy.members?.agencies) ? selectedVacancy.members.agencies[0] : selectedVacancy.members?.agencies);
  const targetPhone = targetAgency?.cell || targetAgency?.phone || selectedVacancy?.members?.phone || selectedVacancy?.client_phone || "";
  const firstPhone = targetPhone.split(",")[0].trim();

  const itemMapRef = useRef<HTMLDivElement | null>(null);
  const roadviewRef = useRef<HTMLDivElement | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // 1. Load Kakao Maps SDK
  useEffect(() => {
    if ((window as any).kakao?.maps?.LatLng) {
      setMapLoaded(true);
      return;
    }

    const kakaoApiKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc";
    const existingScript = document.querySelector('script[src*="dapi.kakao.com"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if ((window as any).kakao?.maps) {
          (window as any).kakao.maps.load(() => setMapLoaded(true));
        }
      });
      return;
    }

    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoApiKey}&libraries=services,clusterer&autoload=false`;
    script.onload = () => {
      if ((window as any).kakao?.maps) {
        (window as any).kakao.maps.load(() => setMapLoaded(true));
      }
    };
    document.head.appendChild(script);
  }, []);

  // 2. Render Mini Map & Roadview when ready
  useEffect(() => {
    if (!mapLoaded || !(window as any).kakao?.maps) return;
    if (detailTab !== "info") return;
    const kakao = (window as any).kakao;

    const lat = selectedVacancy.lat || selectedVacancy.latitude;
    const lng = selectedVacancy.lng || selectedVacancy.longitude;

    const renderMapAndRoadview = (pos: any) => {
      const exp = selectedVacancy.address_exposure;
      const propType = selectedVacancy.property_type || "";
      const subCategory = selectedVacancy.sub_category || "";
      const isApt = ["아파트", "오피스텔", "도시형생활주택"].some((t: string) =>
        propType.includes(t) || subCategory.includes(t)
      );
      const isPrivateAddr = exp && exp !== "번지공개" && exp !== "지번공개" && exp !== "동/호수공개";
      const useCircle = isPrivateAddr && !isApt;

      if (itemMapRef.current) {
        itemMapRef.current.innerHTML = "";
        const map = new kakao.maps.Map(itemMapRef.current, {
          center: pos,
          level: useCircle ? 5 : 3,
        });

        if (useCircle) {
          map.setMinLevel(5);
          map.setMaxLevel(8);
          new kakao.maps.Circle({
            center: pos,
            radius: 500,
            strokeWeight: 2,
            strokeColor: "#3b82f6",
            strokeOpacity: 0.6,
            strokeStyle: "solid",
            fillColor: "#3b82f6",
            fillOpacity: 0.15,
            map: map,
          });
        } else {
          new kakao.maps.Marker({ position: pos, map: map });
        }
      }

      if (roadviewRef.current) {
        roadviewRef.current.innerHTML = "";
        const rv = new kakao.maps.Roadview(roadviewRef.current);
        const rvClient = new kakao.maps.RoadviewClient();

        rvClient.getNearestPanoId(pos, 50, (panoId: any) => {
          if (panoId) {
            rv.setPanoId(panoId, pos);
          } else if (roadviewRef.current) {
            roadviewRef.current.innerHTML =
              '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#999; font-size:13px;">해당 위치 근처의 로드뷰가 제공되지 않습니다.</div>';
          }
        });
      }
    };

    if (lat && lng) {
      const pos = new kakao.maps.LatLng(lat, lng);
      renderMapAndRoadview(pos);
    } else if (selectedVacancy.address) {
      const geocoder = new kakao.maps.services.Geocoder();
      geocoder.addressSearch(selectedVacancy.address, (result: any, status: any) => {
        if (status === kakao.maps.services.Status.OK && result[0]) {
          const pos = new kakao.maps.LatLng(result[0].y, result[0].x);
          renderMapAndRoadview(pos);
        }
      });
    }
  }, [mapLoaded, selectedVacancy, detailTab]);

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", background: "#fff", minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative" }}>
      {/* ── 3. 정상 상세 헤더 (기존 src/app/m/gongsil/page.tsx 1770-1820줄 100% 동일) ── */}
      <div style={{ zIndex: 100, background: "#fff", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", position: "sticky", top: 0 }}>
        <button onClick={goBack} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", marginLeft: "-4px" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#111827", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
          {getCleanAddrText(selectedVacancy) || "공실광고 상세"}
        </h2>
        {/* Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {/* 공유(전달) */}
          <div style={{ position: "relative" }} ref={shareDropdownRef}>
            <button onClick={() => setShowShareDropdown(!showShareDropdown)} style={{ background: "none", border: "none", cursor: "pointer", padding: "0", display: "flex", alignItems: "center", color: showShareDropdown ? "#1a73e8" : "#6b7280" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line>
              </svg>
            </button>
            {showShareDropdown && (
              <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", background: "#fff", border: "1px solid #e0e0e0", borderRadius: "10px", boxShadow: "0 6px 24px rgba(0,0,0,0.15)", width: "200px", zIndex: 9999, overflow: "hidden" }}>
                <button onClick={handleKakaoShare} style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", background: "none", border: "none", borderBottom: "1px solid #f0f0f0", cursor: "pointer", fontSize: "14px", color: "#333", fontWeight: 600 }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#FEE500", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#3C1E1E"><path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.8 5.2 4.4 6.5l-1 3.7c-.1.3.3.6.5.4l4.3-2.9c.6.1 1.2.1 1.8.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z"></path></svg>
                  </div>
                  카카오톡 공유
                </button>
                <button onClick={handleCopyUrl} style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "#333", fontWeight: 600 }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                  </div>
                  URL 복사
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 본문 영역 (GongsilMobileDetailPanel.tsx 100% 원형 복사) ── */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: "90px" }}>
        {/* 이미지 슬라이더 (맨 위로 이동) */}
        {selectedVacancy.images?.[0] && (
          <div style={{ position: "relative", width: "100%", height: "220px", backgroundColor: "transparent", overflow: "hidden" }}>
            <img 
              src={selectedVacancy.images[galleryIndex] || selectedVacancy.images[0]} 
              alt="" 
              style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }} 
              onError={(e) => {
                const wrapper = (e.currentTarget as HTMLImageElement).parentElement;
                if (wrapper) wrapper.style.display = "none";
              }}
            />
            {selectedVacancy.images.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); setGalleryIndex(Math.max(0, galleryIndex - 1)); }} style={{ position: "absolute", top: "50%", left: 0, transform: "translateY(-50%)", background: "rgba(0,0,0,0.3)", color: "#fff", border: "none", fontSize: "20px", padding: "12px 8px", cursor: "pointer", borderRadius: "0 4px 4px 0" }}>〈</button>
                <button onClick={(e) => { e.stopPropagation(); setGalleryIndex(Math.min(selectedVacancy.images.length - 1, galleryIndex + 1)); }} style={{ position: "absolute", top: "50%", right: 0, transform: "translateY(-50%)", background: "rgba(0,0,0,0.3)", color: "#fff", border: "none", fontSize: "20px", padding: "12px 8px", cursor: "pointer", borderRadius: "4px 0 0 4px" }}>〉</button>
                <div style={{ position: "absolute", bottom: "12px", right: "12px", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: "11px", fontWeight: 600, padding: "4px 10px", borderRadius: "20px" }}>
                  {galleryIndex + 1} / {selectedVacancy.images.length}
                </div>
              </>
            )}
          </div>
        )}

        {/* 상단 핵심 정보 영역 */}
        <div style={{ padding: "20px 16px", background: "#fff" }}>
          {/* 일반 공실 매물 전용 헤더 뷰 (두 번째 스크린샷 완벽 대응) */}
          <div style={{ borderBottom: "1px solid #f3f4f6", paddingBottom: "16px" }}>
            {/* Row 1: Date, Report */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "15px", fontWeight: 800, color: "#ef4444" }}>
                  {selectedVacancy.vacancy_no || '-'}
                </span>
                <span style={{ fontSize: "13px", color: "#888", marginLeft: "4px" }}>
                  {selectedVacancy.created_at ? new Date(selectedVacancy.created_at).toLocaleDateString("ko-KR").slice(0, -1) : ""}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <span style={{ fontSize: "12px", color: "#ef4444", fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: "3px", cursor: "pointer" }} onClick={() => alert("허위공실광고 신고 센터로 연결됩니다.")}>
                  <span style={{ display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#ef4444" }}></span>
                  허위공실광고신고
                </span>
              </div>
            </div>

            {/* Row 2: Title */}
            <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#111827", lineHeight: 1.35, margin: "0 0 8px" }}>
              {getCleanAddrText(selectedVacancy)}
            </h1>

            {/* Row 3: Price */}
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "10px" }}>
              <span style={{ fontSize: "24px", fontWeight: 800, color: "#1a73e8" }}>
                {selectedVacancy.trade_type} {formatPrice(selectedVacancy)}
              </span>
            </div>

            {/* Row 4: Specs */}
            <div style={{ fontSize: "13px", color: "#4b5563", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px", marginBottom: "6px" }}>
              <span>{selectedVacancy.property_type || "건물"}</span>
              <span style={{ color: "#d1d5db" }}>|</span>
              <span>{selectedVacancy.direction || "남동향"}</span>
              <span style={{ color: "#d1d5db" }}>|</span>
              <span>공급/전용 면적: {selectedVacancy.supply_m2 ? `${selectedVacancy.supply_m2}㎡ (${(selectedVacancy.supply_m2 * 0.3025).toFixed(1)}평)` : "-"} / {selectedVacancy.exclusive_m2 ? `${selectedVacancy.exclusive_m2}㎡ (${(selectedVacancy.exclusive_m2 * 0.3025).toFixed(1)}평)` : "-"}</span>
            </div>

            {/* Row 5: Details */}
            <div style={{ fontSize: "13px", color: "#6b7280", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
              <span>방 {selectedVacancy.room_count || 1}개</span>
              <span style={{ color: "#d1d5db" }}>|</span>
              <span>주차 {selectedVacancy.parking || "가능"}</span>
              {selectedVacancy.options && selectedVacancy.options.length > 0 && (
                <>
                  <span style={{ color: "#d1d5db" }}>|</span>
                  <span>{selectedVacancy.options.slice(0, 3).join(", ")}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 (공실광고정보 vs 등록자정보) */}
        <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", background: "#fff", position: "sticky", top: 52, zIndex: 9 }}>
          <button onClick={() => setDetailTab("info")} style={{ flex: 1, padding: "14px", fontSize: "15px", fontWeight: detailTab === "info" ? 800 : 500, color: detailTab === "info" ? "#111827" : "#6b7280", borderBottom: detailTab === "info" ? "3px solid #111827" : "3px solid transparent", background: "none", border: "none", cursor: "pointer" }}>
            공실광고정보
          </button>
          <button onClick={() => setDetailTab("realtor")} style={{ flex: 1, padding: "14px", fontSize: "15px", fontWeight: detailTab === "realtor" ? 800 : 500, color: detailTab === "realtor" ? "#111827" : "#6b7280", borderBottom: detailTab === "realtor" ? "3px solid #111827" : "3px solid transparent", background: "none", border: "none", cursor: "pointer" }}>
            등록자정보
          </button>
        </div>

        {detailTab === "info" ? (
          <div>
            {/* 용도 / 기본 스펙 테이블 디자인 (PC 버전 100% 대응) */}
            <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", borderBottom: "10px solid #f5f5f5" }}>
              <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>공실광고번호</div>
              <div style={{ fontSize: 14, color: "#222", fontWeight: "bold", padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{selectedVacancy.vacancy_no}</div>
              <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>소재지</div>
              <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>
                {getMaskedAddress(selectedVacancy)}
              </div>
              {(() => {
                const getDynamicFields = (v: any) => {
                  const formatManwon = (val: number | string | null | undefined): string => {
                    if (val === undefined || val === null) return "-";
                    const num = typeof val === "string" ? parseInt(val, 10) : val;
                    if (isNaN(num) || num <= 0) return "-";
                    
                    const eok = Math.floor(num / 10000);
                    const man = num % 10000;
                    
                    let result = "";
                    if (eok > 0) result += `${eok}억`;
                    if (man > 0) {
                      const formattedMan = man.toLocaleString("ko-KR");
                      result += (result ? " " : "") + `${formattedMan}만`;
                    }
                    return result + "원";
                  };

                  const propType = v.property_type || "";
                  const subCategory = v.sub_category || "";
                  const tradeType = v.trade_type || "";
                  const meta = v.metadata || {};

                  const fields: { label: string; value: string }[] = [];

                  // 1. 단지명 / 건물명
                  const isApt = ["아파트", "오피스텔", "도시형생활주택"].some(t => propType.includes(t) || subCategory.includes(t));
                  const exp = v.address_exposure;
                  const isPrivateAddr = !isApt && exp && exp !== "번지공개" && exp !== "지번공개" && exp !== "동/호수공개";
                  const displayBuildingName = isPrivateAddr ? "-" : (v.building_name || "-");
                  fields.push({
                    label: isApt ? "단지명" : "건물명",
                    value: displayBuildingName
                  });

                  // 1-2. 동/호수
                  const showDongHosu = !isPrivateAddr && (exp === "동/호수공개" || exp === "번지공개" || exp === "지번공개" || !exp);
                  let displayDongHosu = "-";
                  if (showDongHosu) {
                    const dongParts = [];
                    if (v.apt_dong) dongParts.push(v.apt_dong);
                    if (v.hosu) dongParts.push(v.hosu);
                    if (dongParts.length > 0) {
                      displayDongHosu = dongParts.join(" ");
                    }
                  }
                  fields.push({
                    label: "동/호수",
                    value: displayDongHosu
                  });

                  // 1-3. 거래구분
                  fields.push({
                    label: "거래구분",
                    value: tradeType || "-"
                  });

                  // 1-4. 금액
                  let displayPrice = "-";
                  const monthlyManwon = v.monthly_rent ? Math.round(v.monthly_rent / 10000) : 0;
                  if (v.trade_type === "매매" || v.trade_type === "전세") {
                    displayPrice = v.deposit ? formatAmount(v.deposit) : "-";
                  } else if (v.trade_type) {
                    displayPrice = `${v.deposit ? formatAmount(v.deposit) : "0"}/${monthlyManwon > 0 ? `${monthlyManwon}만` : "0"}`;
                  }
                  fields.push({
                    label: "금액",
                    value: displayPrice
                  });

                  // 1-5. 관리비
                  fields.push({
                    label: "관리비",
                    value: v.maintenance_fee ? `${v.maintenance_fee / 10000}만원` : "없음"
                  });

                  // 카테고리 분류
                  const isVillaHouse = propType === "빌라·주택";
                  const isCommercial = propType === "상가·사무실·건물·공장·토지";

                  // 8. 대지면적
                  if (meta.land_share_m2) {
                    const pyVal = meta.land_share_py || (parseFloat(meta.land_share_m2) / 3.3058).toFixed(1);
                    fields.push({ label: "대지면적", value: `${meta.land_share_m2}m² (${pyVal}평)` });
                  }

                  // 9. 공급/전용면적 또는 연면적
                  if (subCategory !== "토지") {
                    const isStandaloneBuilding = (isVillaHouse && ["단독/다가구", "전원주택", "상가주택"].includes(subCategory)) ||
                                                 (isCommercial && ["건물/빌딩", "공장/창고"].includes(subCategory));
                    
                    if (tradeType === "매매" && isStandaloneBuilding) {
                      const pyVal = v.supply_py || (v.supply_m2 ? (parseFloat(v.supply_m2) / 3.3058).toFixed(1) : "0");
                      fields.push({
                        label: "연면적",
                        value: v.supply_m2 ? `${v.supply_m2}m² (${pyVal}평)` : "-"
                      });
                    } else {
                      const supplyPyVal = v.supply_py || (v.supply_m2 ? (parseFloat(v.supply_m2) / 3.3058).toFixed(1) : "-");
                      const exclusivePyVal = v.exclusive_py || (v.exclusive_m2 ? (parseFloat(v.exclusive_m2) / 3.3058).toFixed(1) : "-");
                      fields.push({
                        label: "공급/전용면적",
                        value: `${v.supply_m2 ? `${v.supply_m2}m²(${supplyPyVal}평)` : "-"} / ${v.exclusive_m2 ? `${v.exclusive_m2}m²(${exclusivePyVal}평)` : "-"}`
                      });
                    }
                  }

                  // 7. 건물규모
                  const hasScale = meta.ground_floors !== undefined || meta.underground_floors !== undefined;
                  if (hasScale) {
                    const parts = [];
                    if (meta.ground_floors !== undefined && meta.ground_floors !== null && meta.ground_floors !== "") {
                      parts.push(`지상 ${meta.ground_floors}층`);
                    }
                    if (meta.underground_floors !== undefined && meta.underground_floors !== null && meta.underground_floors !== "") {
                      parts.push(`지하 ${meta.underground_floors}층`);
                    }
                    if (parts.length > 0) {
                      fields.push({ label: "건물규모", value: parts.join(" / ") });
                    }
                  }

                  // 12. 해당층/총층
                  if (!hasScale && subCategory !== "토지") {
                    fields.push({
                      label: "해당층/총층",
                      value: `${v.current_floor || "-"} / ${v.total_floor || v.total_floors || v.floor || "-"}`
                    });
                  }

                  // 15. 주차
                  if (subCategory !== "토지") {
                    fields.push({
                      label: isCommercial ? "주차대수" : "주차가능 여부",
                      value: v.parking || "없음"
                    });
                  }

                  // 13. 방/욕실수 (주거형)
                  if (!isCommercial) {
                    fields.push({
                      label: "방/욕실수",
                      value: `${v.room_count || 0}개 / ${v.bathroom_count || v.bath_count || 0}개`
                    });
                  }

                  // 14. 방향 (주거형)
                  if (!isCommercial) {
                    fields.push({
                      label: "방향",
                      value: v.direction || "-"
                    });
                  }

                  // 19. 입주가능일
                  fields.push({
                    label: subCategory === "토지" ? "사용 가능일" : "입주가능일",
                    value: v.move_in_date || (subCategory === "토지" ? "즉시사용" : "즉시입주(공실)")
                  });

                  // 20-2. 중개보수/수수료
                  const commParts = [];
                  const baseComm = v.realtor_commission || v.commission_type;
                  if (baseComm) commParts.push(baseComm);
                  if (v.commission_amount) commParts.push(`${v.commission_amount}만원`);
                  if (v.commission_etc) commParts.push(`(${v.commission_etc})`);
                  if (commParts.length > 0) {
                    fields.push({
                      label: "중개보수",
                      value: commParts.join(" ")
                    });
                  }

                  const filteredFields = fields.filter(field => {
                    const isRequired = [
                      "공실광고번호",
                      "소재지",
                      "단지명",
                      "건물명",
                      "동/호수",
                      "거래구분",
                      "금액",
                      "공급/전용면적",
                      "연면적",
                      "관리비",
                      "입주가능일",
                      "사용 가능일"
                    ].includes(field.label);
                    if (isRequired) return true;

                    const val = field.value?.trim();
                    return val && val !== "-" && val !== "없음" && val !== "0/0" && val !== "0층 / 0층" && val !== "지하 0층 / 지상 0층" && val !== "-개 / -개";
                  });

                  return filteredFields;
                };

                return (
                  <>
                    {getDynamicFields(selectedVacancy).map((f, idx) => (
                      <React.Fragment key={idx}>
                        <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>{f.label}</div>
                        <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{f.value}</div>
                      </React.Fragment>
                    ))}
                  </>
                );
              })()}
              <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "flex-start", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>상세설명</div>
              <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all", whiteSpace: "pre-line" }}>{selectedVacancy.description || "-"}</div>
            </div>

            {/* ──── 옵션 ──── */}
            {selectedVacancy.options && selectedVacancy.options.length > 0 && (
              <div style={{ padding: "20px 16px", background: "#fff", borderBottom: "8px solid #f3f4f6" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 20 }}>옵션</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
                  {selectedVacancy.options.map((optName: string, idx: number) => (
                    <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 55 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, background: "#f8fafc", borderRadius: "50%", border: "1px solid #e2e8f0" }}>
                        <OptionIcon name={optName} />
                      </div>
                      <span style={{ fontSize: 12, color: "#333", fontWeight: "bold", textAlign: "center", whiteSpace: "nowrap" }}>{optName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ──── 위치정보 ──── */}
            <div style={{ padding: "20px 16px 0", background: "#fff" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 12 }}>위치정보</div>
              <div ref={itemMapRef} style={{ width: "100%", height: 200, borderRadius: 8, marginBottom: 20, background: "#e8eaed", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 14, border: "1px solid #eee", overflow: "hidden" }}></div>
            </div>

            {/* ──── 로드뷰 ──── */}
            <div style={{ padding: "0 16px 20px", background: "#fff", borderBottom: "8px solid #f3f4f6" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 12 }}>로드뷰</div>
              <div ref={roadviewRef} style={{ width: "100%", height: 200, borderRadius: 8, background: "#e8eaed", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 14, border: "1px solid #eee", overflow: "hidden" }}></div>
            </div>

            {/* ──── 주변환경 (인프라) ──── */}
            {selectedVacancy.infrastructure && Object.keys(selectedVacancy.infrastructure).filter((k) => !k.startsWith("_")).length > 0 && (
              <div style={{ padding: "20px 16px", background: "#fff", borderBottom: "8px solid #f3f4f6" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 16 }}>주변환경</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {Object.entries(selectedVacancy.infrastructure)
                    .filter(([catName]) => !catName.startsWith("_"))
                    .map(([catName, places]: [string, any]) => {
                      const placeList = Array.isArray(places) ? places : [];
                      if (placeList.length === 0) return null;
                      return (
                        <div key={catName} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                          <span style={{ fontSize: 13, fontWeight: "bold", color: "#666", width: 65, flexShrink: 0, marginTop: 4 }}>
                            {catName}
                          </span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: 1 }}>
                            {placeList.map((place: string, idx: number) => (
                              <div key={idx} style={{ fontSize: 12, color: "#4b5563", background: "#f3f4f6", padding: "4px 8px", borderRadius: 4, fontWeight: 500 }}>
                                {place}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* ──── 댓글상담 ──── */}
            <div style={{ padding: "20px 16px", background: "#fff" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 16 }}>0개의 댓글상담</div>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fff", marginBottom: 12 }}>
                <textarea 
                  placeholder="로그인 후 이용하실 수 있습니다." 
                  disabled 
                  style={{ width: "100%", height: 70, border: "none", resize: "none", outline: "none", fontSize: 13, color: "#9ca3af", background: "#fff", padding: 0 }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f3f4f6", paddingTop: 8, marginTop: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="checkbox" id="secret-mock" disabled style={{ width: 14, height: 14 }} />
                    <label htmlFor="secret-mock" style={{ fontSize: 12, color: "#9ca3af", cursor: "default" }}>비밀댓글</label>
                  </div>
                  <button disabled style={{ background: "#e5e7eb", color: "#9ca3af", border: "none", borderRadius: 4, padding: "5px 12px", fontSize: 12, fontWeight: 700 }}>
                    등록
                  </button>
                </div>
              </div>
              <div style={{ textAlign: "center", padding: "30px 0", color: "#9ca3af", fontSize: 13 }}>
                아직 등록된 댓글이 없습니다.
              </div>
            </div>
          </div>
        ) : (
          /* 탭 2: 등록자 정보 (공실) (기존 GongsilMobileDetailPanel.tsx 1378-1620줄 100% 동일) */
          <div style={{ background: "#fff" }}>
            <div style={{ padding: "20px 16px", borderBottom: "8px solid #f3f4f6" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "20px" }}>
                {/* 프로필 사진 */}
                {selectedVacancy.members?.profile_image_url || selectedVacancy.members?.profile_photo_url || targetAgency?.profile_photo_url || targetAgency?.logo_url ? (
                  <img 
                    src={selectedVacancy.members?.profile_image_url || selectedVacancy.members?.profile_photo_url || targetAgency?.profile_photo_url || targetAgency?.logo_url} 
                    alt="프로필" 
                    style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} 
                  />
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#e8f0fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "#508bf5", flexShrink: 0, border: "2px solid #e5e7eb" }}>
                    {(targetAgency?.agency_name || targetAgency?.name || selectedVacancy.members?.name || selectedVacancy.client_name || "?")[0]}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#111827", marginBottom: "8px", display: "flex", alignItems: "center", gap: 8 }}>
                    {selectedVacancy.owner_id ? (
                      <Link 
                        href={`/reporter/${selectedVacancy.owner_id}`} 
                        style={{ 
                          color: "#111827", 
                          textDecoration: "none", 
                          cursor: "pointer",
                        }}
                      >
                        {targetAgency ? (targetAgency.agency_name || targetAgency.name) : (selectedVacancy.members?.name || selectedVacancy.client_name)}
                      </Link>
                    ) : (
                      <span>{targetAgency ? (targetAgency.agency_name || targetAgency.name) : (selectedVacancy.members?.name || selectedVacancy.client_name)}</span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {targetAgency ? (
                      <>
                        <span style={{ fontSize: 13, color: "#4b5563" }}>
                          대표 {targetAgency.ceo_name || targetAgency.leader || "-"} <span style={{ color: "#e5e7eb", margin: "0 4px" }}>|</span> 등록번호 {targetAgency.registration_no || targetAgency.reg_num || "-"}
                        </span>
                        <span style={{ fontSize: 13, color: "#4b5563", wordBreak: "break-all" }}>
                          {targetAgency.address || targetAgency.addr || "-"}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: 13, color: "#4b5563" }}>
                        일반회원 <span style={{ color: "#e5e7eb", margin: "0 4px" }}>|</span> {selectedVacancy.members?.name || selectedVacancy.client_name || "-"}
                      </span>
                    )}
                    <span style={{ fontSize: 13, fontWeight: "bold", color: "#1a73e8", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                      </svg>
                      전화 {targetAgency?.phone ? `${targetAgency.phone}${targetAgency?.cell && targetAgency.cell !== targetAgency.phone ? `, ${targetAgency.cell}` : ""}` : (selectedVacancy.client_phone || selectedVacancy.members?.phone || "미등록")}
                    </span>
                  </div>
                </div>
              </div>

              {/* 부동산 소개란 */}
              {targetAgency?.intro && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: "#f8f9fa", borderRadius: 6, fontSize: 13, color: "#444", border: "1px solid #eee", lineHeight: 1.5 }}>
                  <div style={{ fontWeight: "bold", fontSize: 11, color: "#888", marginBottom: 4 }}>부동산 소개</div>
                  {targetAgency.intro}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 하단 CTA 버튼 (기존 GongsilMobileDetailPanel.tsx 1667-1681줄 100% 동일) ── */}
      <div style={{ background: "#fff", borderTop: "1px solid #e5e7eb", padding: "14px 16px 24px", position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 600, margin: "0 auto", zIndex: 100 }}>
        <button
          onClick={() => {
            if (firstPhone) {
              window.location.href = `tel:${firstPhone}`;
            } else {
              alert("등록된 연락처가 없습니다.");
            }
          }}
          style={{ width: "100%", height: "52px", borderRadius: "6px", background: "#1a73e8", color: "#fff", fontSize: "18px", fontWeight: 800, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          연락하기
        </button>
      </div>
    </div>
  );
}
