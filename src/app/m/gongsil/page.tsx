"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getVacancies, getVacancyDetail } from "@/app/actions/vacancy";
import HomeHeader from "../_components/HomeHeader";

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc";

// 옵션 아이콘 헬퍼
const OptionIcon = ({ name }: { name: string }) => {
  const sz = 24;
  const str = 1.8;
  switch (name) {
    case "에어컨": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="8" rx="2"/><path d="M7 14v4"/><path d="M17 14v4"/><path d="M12 14v4"/></svg>;
    case "침대": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>;
    case "도어락": case "전자도어락": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
    case "전자렌지": case "전자레인지": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M17 10h.01"/><path d="M17 14h.01"/><path d="M7 12h5"/></svg>;
    case "비데": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z"/><path d="M7 12.5L10 15.5L17 8.5"/></svg>;
    case "TV": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>;
    case "옷장": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M12 2v20"/><path d="M8 12h.01"/><path d="M16 12h.01"/></svg>;
    case "세탁기": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="13" r="5"/><path d="M8 6h.01"/><path d="M10 6h.01"/></svg>;
    case "냉장고": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M5 10h14"/><path d="M9 14v2"/><path d="M9 5v2"/></svg>;
    case "가스레인지": case "인덕션": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 10h16"/><circle cx="8" cy="15" r="2"/><circle cx="16" cy="15" r="2"/></svg>;
    default: return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
  }
};

function formatPrice(v: any): string {
  const dep = v.deposit || 0;
  const rent = v.monthly_rent || 0;
  const trade = v.trade_type || "";
  
  const formatAmount = (amt: number) => {
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
      
      if (rest) {
        result += (result && !result.endsWith(" ") ? " " : "") + rest;
        if (e === 0 && c === 0 && rem > 0) result += "만";
      }
    }
    return result || "";
  };

  if (trade === "월세" && rent > 0) {
    const monthlyManwon = Math.round(rent / 10000);
    return `${formatAmount(dep)}/${monthlyManwon}만`;
  }
  if (dep > 0) return `${formatAmount(dep)}`;
  return "-";
}

function MobileGongsilContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<any>(null);
  const clustererRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const detailPanelRef = useRef<HTMLDivElement>(null);

  const [selectedCluster, setSelectedCluster] = useState<any[] | null>(null);
  const [selectedVacancy, setSelectedVacancy] = useState<any | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const shareDropdownRef = useRef<HTMLDivElement>(null);
  const detailScrollRef = useRef<HTMLDivElement>(null);
  
  const [showGalleryFullscreen, setShowGalleryFullscreen] = useState(false);
  const [detailTab, setDetailTab] = useState<"info" | "realtor">("info");
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [realtorFilter, setRealtorFilter] = useState("전체");

  // Swipe gesture states
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndHandler = () => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe && selectedVacancy?.images) {
      setGalleryIndex(prev => Math.min(selectedVacancy.images.length - 1, prev + 1));
    }
    if (isRightSwipe && selectedVacancy?.images) {
      setGalleryIndex(prev => Math.max(0, prev - 1));
    }
  };

  const itemMapRef = useRef<HTMLDivElement>(null);
  const roadviewRef = useRef<HTMLDivElement>(null);
  const vacancyStackRef = useRef<any[]>([]);

  // 다이렉트 뷰 상태 (URL에 id가 있는 경우 지도를 가리고 상세 정보를 보여줌)
  const [isDirectView, setIsDirectView] = useState(searchParams.has("id"));
  const [isEmbedded, setIsEmbedded] = useState(searchParams.get("embed") === "true");

  useEffect(() => {
    if (selectedVacancy && detailTab === "info") {
      const kakao = (window as any).kakao;
      if (!kakao || !kakao.maps) return;

      const pos = new kakao.maps.LatLng(selectedVacancy.lat, selectedVacancy.lng);
      
      const isAptType = (type: string) => ["아파트", "오피스텔", "도시형생활주택"].includes(type || "");
      const isPrivateAddr = selectedVacancy.address_exposure && selectedVacancy.address_exposure !== '번지공개';
      const isApt = isAptType(selectedVacancy.property_type) || isAptType(selectedVacancy.sub_category);
      const useCircle = isPrivateAddr && !isApt;
      
      setTimeout(() => {
        if (itemMapRef.current) {
          itemMapRef.current.innerHTML = "";
          const map = new kakao.maps.Map(itemMapRef.current, { center: pos, level: useCircle ? 5 : 3 });
          if (useCircle) {
            map.setMinLevel(5);
            map.setMaxLevel(8);
            new kakao.maps.Circle({
              center: pos, radius: 300, strokeWeight: 2, strokeColor: '#3b82f6', strokeOpacity: 0.6,
              strokeStyle: 'solid', fillColor: '#3b82f6', fillOpacity: 0.15, map: map
            });
          } else {
            new kakao.maps.Marker({ position: pos, map: map });
          }
        }

        if (roadviewRef.current) {
          roadviewRef.current.innerHTML = "";
          const rv = new kakao.maps.Roadview(roadviewRef.current);
          const rvClient = new kakao.maps.RoadviewClient();
          const agencyInfo = Array.isArray(selectedVacancy.members?.agencies) ? selectedVacancy.members.agencies[0] : selectedVacancy.members?.agencies;

          if (useCircle && agencyInfo?.lat && agencyInfo?.lng) {
            const agencyPos = new kakao.maps.LatLng(agencyInfo.lat, agencyInfo.lng);
            rvClient.getNearestPanoId(agencyPos, 50, (panoId: any) => {
              if (panoId) { rv.setPanoId(panoId, agencyPos); }
              else if (roadviewRef.current) { roadviewRef.current.innerHTML = '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#999; font-size:13px;">중개업소 위치의 로드뷰를 제공할 수 없습니다.</div>'; }
            });
          } else {
            rvClient.getNearestPanoId(pos, 50, (panoId: any) => {
              if (panoId) { rv.setPanoId(panoId, pos); }
              else if (roadviewRef.current) { roadviewRef.current.innerHTML = '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#999; font-size:13px;">해당 위치의 로드뷰를 제공할 수 없습니다.</div>'; }
            });
          }
        }
      }, 100);
    }
  }, [selectedVacancy, detailTab]);

  useEffect(() => {
    if (selectedVacancy) {
      const saved = localStorage.getItem("gongsil_bookmarks");
      if (saved) {
        try {
          const arr = JSON.parse(saved);
          setIsBookmarked(arr.includes(selectedVacancy.id));
        } catch (e) {}
      } else {
        setIsBookmarked(false);
      }
    }
  }, [selectedVacancy]);

  const toggleBookmark = () => {
    if (!selectedVacancy) return;
    setIsBookmarked((prev) => {
      const next = !prev;
      const saved = localStorage.getItem("gongsil_bookmarks");
      let arr: string[] = [];
      if (saved) { try { arr = JSON.parse(saved); } catch (e) {} }
      if (next) {
        arr = [selectedVacancy.id, ...arr.filter((x: string) => x !== selectedVacancy.id)];
      } else {
        arr = arr.filter((x: string) => x !== selectedVacancy.id);
      }
      localStorage.setItem("gongsil_bookmarks", JSON.stringify(arr));
      alert(next ? "매물을 찜했습니다." : "찜을 해제했습니다.");
      return next;
    });
  };

  const handleKakaoShare = () => {
    if (!selectedVacancy) return;
    const Kakao = (window as any).Kakao;
    if (!Kakao || !Kakao.isInitialized()) {
      alert("카카오 SDK 로드 중입니다. 잠시 후 시도해 주세요.");
      return;
    }
    const shareUrl = `${window.location.origin}/m/gongsil?id=${selectedVacancy.id}`;
    Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: selectedVacancy.building_name || [selectedVacancy.dong, selectedVacancy.sigungu].filter(Boolean).join(" ") || "매물 상세",
        description: `${selectedVacancy.trade_type} ${formatPrice(selectedVacancy)}`,
        imageUrl: selectedVacancy.images?.[0] || "https://gongsilnews.com/favicon.png",
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [{ title: "매물 보기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
    });
    setShowShareDropdown(false);
  };

  const handleCopyUrl = () => {
    if (!selectedVacancy) return;
    const shareUrl = `${window.location.origin}/m/gongsil?id=${selectedVacancy.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("URL이 복사되었습니다.");
    }).catch(() => {
      alert("URL 복사에 실패했습니다.");
    });
    setShowShareDropdown(false);
  };

  useEffect(() => {
    if (!showShareDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (shareDropdownRef.current && !shareDropdownRef.current.contains(e.target as Node)) {
        setShowShareDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showShareDropdown]);

  // 뒤로 가기(안드로이드 하드웨어 백버튼 등) 처리
  useEffect(() => {
    const handlePopState = () => {
      if (vacancyStackRef.current.length > 0) {
        const prev = vacancyStackRef.current.pop();
        if (prev && prev.vacancy) {
          setSelectedVacancy(prev.vacancy);
          setDetailTab("realtor");
          setTimeout(() => { if (detailScrollRef.current) detailScrollRef.current.scrollTo(0, prev.scrollY || 0); }, 50);
        } else {
          setSelectedVacancy(prev);
          setDetailTab("realtor");
          setTimeout(() => { if (detailScrollRef.current) detailScrollRef.current.scrollTo(0, 0); }, 50);
        }
      } else if (selectedVacancy) {
        if (isEmbedded) {
          window.parent.postMessage({ type: 'CLOSE_VACANCY_OVERLAY' }, '*');
          return;
        }
        vacancyStackRef.current = [];
        setSelectedVacancy(null);
        setIsDirectView(false);
        setTimeout(() => kakaoMapRef.current?.relayout(), 50);
      } else if (selectedCluster) {
        vacancyStackRef.current = [];
        setSelectedCluster(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [selectedVacancy, selectedCluster, isEmbedded]);

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

        // URL id 파라미터가 있으면 해당 매물 상세 즉시 열기
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const idParam = params.get("id");
          if (idParam) {
            setIsDirectView(true);
            const target = withImages.find((v: any) => v.id === idParam);
            if (target) {
              handleVacancyClick(target, true);
            }
          }
        }
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
        vacancyStackRef.current = [];
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
    const map = kakaoMapRef.current;

    if (clustererRef.current) clustererRef.current.clear();
    markersRef.current.forEach((m: any) => m.setMap(null));
    markersRef.current = [];

    if (!clustererRef.current) {
      clustererRef.current = new kakao.maps.MarkerClusterer({
        map: map,
        averageCenter: true,
        minLevel: 4,
        gridSize: 60,
        disableClickZoom: true,
        calculator: [10, 30, 50],
        texts: (count: number) => count.toString(),
        styles: [
          { width: '44px', height: '44px', background: '#4b89ff', color: '#fff', textAlign: 'center', lineHeight: '40px', borderRadius: '50%', fontWeight: 'bold', fontSize: '15px', border: '2px solid #ffffff', boxShadow: '0 3px 8px rgba(0,0,0,0.2)' }
        ]
      });

      kakao.maps.event.addListener(clustererRef.current, 'clusterclick', (cluster: any) => {
        const mks = cluster.getMarkers();
        const items = mks.map((m: any) => m.customData);
        window.history.pushState({ panel: "cluster" }, "");
        setSelectedVacancy(null);
        setSelectedCluster(items);
      });
    }

    vacancies.forEach((v) => {
      if (!v.lat || !v.lng) return;
      const size = 36;
      const color = "#4b89ff";

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2-2}" fill="${color}" stroke="white" stroke-width="2"/>
        <text x="50%" y="50%" dy="1px" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="14" font-weight="bold" font-family="sans-serif">1</text>
      </svg>`;

      const img = new kakao.maps.MarkerImage(
        `data:image/svg+xml,${encodeURIComponent(svg)}`,
        new kakao.maps.Size(size, size),
        { offset: new kakao.maps.Point(size / 2, size / 2) }
      );
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(v.lat, v.lng),
        image: img,
      });
      marker.customData = v;

      kakao.maps.event.addListener(marker, "click", () => {
        window.history.pushState({ panel: "cluster" }, "");
        setSelectedVacancy(null);
        setSelectedCluster([v]);
      });
      markersRef.current.push(marker);
    });

    clustererRef.current.addMarkers(markersRef.current);
  }, [vacancies, mapLoaded]);

  // 상세 조회
  const handleVacancyClick = async (v: any, isDirect: boolean = false) => {
    if (!isDirect) {
      window.history.pushState({ panel: "detail", t: Date.now() }, "");
    }
    if (detailScrollRef.current) {
      detailScrollRef.current.scrollTop = 0;
    }
    setDetailLoading(true);
    setSelectedVacancy(v); // 먼저 기본 정보 표시
    setDetailTab("info");
    const res = await getVacancyDetail(v.id);
    if (res.success && res.data) {
      const detail = {
        ...v,
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
    if (vacancyStackRef.current.length > 0) {
      window.history.back();
      return;
    }
    if (isEmbedded) {
      if (detailPanelRef.current) detailPanelRef.current.classList.add("slide-out");
      setTimeout(() => window.parent.postMessage({ type: 'CLOSE_VACANCY_OVERLAY' }, '*'), 350);
      return;
    }
    if (isDirectView) {
      if (detailPanelRef.current) detailPanelRef.current.classList.add("slide-out");
      setTimeout(() => {
        if (window.opener) window.close();
        else window.history.back();
      }, 350);
      return;
    }
    if (selectedVacancy) { window.history.back(); return; }
    if (selectedCluster) { window.history.back(); }
  };

  return (
    <div style={{ width: "100%", backgroundColor: isEmbedded ? "transparent" : "#F4F6F8", height: "calc(100vh - 60px)", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      {!isEmbedded && (
        <HomeHeader 
          bgColor="#4b89ff" 
          logoText="공실등록"
          sloganPrefix="부동산이 무료 열람하는 "
          sloganHighlight="공동중개네트워크"
          highlightColor="#fcd34d"
        />
      )}
      
      <style>{`
        ${isEmbedded ? `
          main { background: transparent !important; }
          div[style*="padding-bottom: 60px"] { padding-bottom: 0 !important; background: transparent !important; }
          nav { display: none !important; }
          body { background: transparent !important; }
          html { background: transparent !important; }
        ` : ''}
        .no-scrollbar::-webkit-scrollbar{display:none;}
        .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none;}
        .list-panel{position:fixed;top:0;left:50%;width:100%;max-width:448px;margin-left:-224px;height:100dvh;background:#fff;z-index:9998;transform:translateX(100vw);transition:transform 0.35s cubic-bezier(0.25,1,0.5,1);overflow-y:hidden;display:flex;flex-direction:column;}
        @media (max-width: 448px) { .list-panel { margin-left: -50vw; } }
        .list-panel.open{transform:translateX(0);}
        .detail-panel{position:fixed;top:0;left:50%;width:100%;max-width:448px;margin-left:-224px;height:100dvh;background:#fff;z-index:9999;transform:translateX(100vw);transition:transform 0.35s cubic-bezier(0.25,1,0.5,1);overflow-y:auto;}
        @media (max-width: 448px) { .detail-panel { margin-left: -50vw; } }
        .detail-panel.open{transform:translateX(0);}
        .detail-panel.direct-view{transform:translateX(0); ${isEmbedded ? '' : 'animation: slideInRight 0.35s cubic-bezier(0.25,1,0.5,1) forwards;'}}
        .detail-panel.slide-out{transform:translateX(100vw) !important; transition: transform 0.35s cubic-bezier(0.25,1,0.5,1) !important;}
        @keyframes slideInRight { from { transform: translateX(100vw); } to { transform: translateX(0); } }
        .skeleton{background:linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:6px;}
        @keyframes shimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}
        .v-card:active{background:#f9fafb;}
      `}</style>
      
      <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingTop: isEmbedded ? "0" : "50px" }}>
        {/* 구분선 (회색 배경) */}
        {!isEmbedded && (
          <div style={{ height: "9px", backgroundColor: "#F4F6F8", width: "100%", flexShrink: 0, borderBottom: "1px solid #e5e7eb" }} />
        )}

        {/* 지도 및 오버레이 컨테이너 */}
        <div style={{ position: "relative", flex: 1, display: isDirectView ? "none" : "flex", flexDirection: "column", backgroundColor: "#fff" }}>
          {/* 카카오 지도 */}
          <div ref={mapRef} style={{ width: "100%", flex: 1 }} />

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
            style={{ position: "absolute", top: "16px", right: "16px", zIndex: 20, background: "#1a4282", color: "#fff", border: "none", borderRadius: "20px", padding: "8px 14px", fontSize: "13px", fontWeight: 700, boxShadow: "0 4px 12px rgba(26,66,130,0.4)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
            내 위치
          </button>
        )}
      </div>

      {/* 슬라이딩 패널: 클러스터 리스트 */}
      <div className={`list-panel ${selectedCluster ? "open" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button onClick={goBack} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "4px", marginLeft: "-4px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#111827", margin: 0 }}>
              매물 <span style={{ color: "#f97316" }}>{selectedCluster?.length || 0}</span>개
            </h3>
          </div>
        </div>
        <div className="no-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "8px 16px 20px" }}>
          {selectedCluster?.map((v: any) => (
            <div
              key={v.id}
              className="v-card"
              onClick={() => handleVacancyClick(v)}
              style={{ display: "flex", gap: "12px", padding: "14px 0", borderBottom: "1px solid #f3f4f6", cursor: "pointer", transition: "background 0.15s" }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Badges & Date (Moved to top) */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#ef4444", border: "1px solid #ef4444", padding: "1px 6px", borderRadius: "3px" }}>공동중개 0%</span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#ef4444" }}>{v.vacancy_no || '-'}</span>
                  <span style={{ fontSize: "12px", color: "#9ca3af" }}>{v.created_at ? new Date(v.created_at).toLocaleDateString("ko-KR").slice(0, -1) : ""}</span>
                </div>

                {/* Title */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <p style={{ fontSize: "16px", fontWeight: 800, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {v.building_name || [v.dong, v.sigungu].filter(Boolean).join(" ")}
                  </p>
                </div>
                
                {/* Price (Blue) */}
                <p style={{ fontSize: "18px", fontWeight: 800, color: "#1a73e8", marginBottom: "6px" }}>
                  {v.trade_type} {formatPrice(v)}
                </p>
                
                {/* Specs 1: Type | Direction | Area */}
                <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {[v.property_type || "건물", v.direction, v.exclusive_m2 && `${v.exclusive_m2}㎡`].filter(Boolean).join(" | ")}
                </p>
                
                {/* Specs 2: Rooms, Options */}
                <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {[v.room_count !== undefined ? `룸 ${v.room_count}개` : null, v.bath_count !== undefined ? `욕실 ${v.bath_count}개` : null, ...(v.options || [])].filter(Boolean).join(", ")}
                </p>

                {/* Themes (Added at bottom) */}
                {v.themes && v.themes.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                    {v.themes.map((theme: string, idx: number) => (
                      <span key={idx} style={{ background: "#f8fafc", color: "#3b82f6", fontSize: "12px", padding: "2px 8px", borderRadius: "12px", fontWeight: 700, border: "1px solid #bfdbfe" }}>
                        {theme.startsWith('#') ? theme : `# ${theme}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {v.images?.[0] && (
                <div style={{ width: "90px", height: "72px", borderRadius: "10px", overflow: "hidden", flexShrink: 0, backgroundColor: "#e5e7eb", alignSelf: "center" }}>
                  <img src={v.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" style={{ flexShrink: 0, alignSelf: "center" }}><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          ))}
        </div>
      </div>

      {/* 상세 패널 */}
      <div ref={detailPanelRef} className={`detail-panel ${selectedVacancy ? "open" : ""} ${isDirectView ? "direct-view" : ""}`} onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* 상단 헤더 */}
        <div style={{ zIndex: 10, background: "#fff", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", position: "sticky", top: 0 }}>
          <button onClick={goBack} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", marginLeft: "-4px" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#111827", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selectedVacancy?.building_name || [selectedVacancy?.dong, selectedVacancy?.sigungu].filter(Boolean).join(" ") || "매물 상세"}
          </h2>
          {/* Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {/* 찜하기 */}
            <button onClick={toggleBookmark} style={{ background: "none", border: "none", cursor: "pointer", padding: "0", display: "flex", alignItems: "center", color: isBookmarked ? "#1a73e8" : "#6b7280" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
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

        {selectedVacancy && (
          <>
            <div ref={detailScrollRef} style={{ flex: 1, overflowY: "auto", paddingBottom: "20px" }}>
            {/* 이미지 슬라이더 (맨 위로 이동) */}
            {selectedVacancy.images?.[0] && (
              <div 
                style={{ position: "relative", width: "100%", height: "220px", backgroundColor: "#e5e7eb", overflow: "hidden" }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEndHandler}
              >
                <img 
                  src={selectedVacancy.images[galleryIndex] || selectedVacancy.images[0]} 
                  alt="" 
                  onClick={() => setShowGalleryFullscreen(true)}
                  style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }} 
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
              {/* Badges */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#ef4444", border: "1px solid #ef4444", padding: "2px 8px", borderRadius: "3px" }}>공동중개 0%</span>
                  <span style={{ fontSize: "15px", fontWeight: 700, color: "#ef4444" }}>{selectedVacancy.vacancy_no || '-'}</span>
                  <span style={{ fontSize: "14px", color: "#6b7280" }}>{selectedVacancy.created_at ? new Date(selectedVacancy.created_at).toLocaleDateString("ko-KR").slice(0, -1) : ""}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#ef4444", fontSize: "14px", fontWeight: 600 }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444" }}></span> 허위매물신고
                </div>
              </div>

              {/* Title & Price */}
              <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#111827", marginBottom: "8px", lineHeight: 1.3 }}>
                {selectedVacancy.building_name || [selectedVacancy.dong, selectedVacancy.sigungu].filter(Boolean).join(" ")}
              </h1>


              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <p style={{ fontSize: "30px", fontWeight: 900, color: "#1a73e8" }}>
                  {selectedVacancy.trade_type} {formatPrice(selectedVacancy)}
                </p>
              </div>

              {/* Sub Info */}
              <div style={{ fontSize: "15px", color: "#4b5563", lineHeight: 1.6, marginBottom: "8px" }}>
                {[selectedVacancy.property_type || "건물", selectedVacancy.direction, `공급/전용 면적: ${selectedVacancy.supply_m2 || "-"}㎡ / ${selectedVacancy.exclusive_m2 || "-"}㎡`].filter(Boolean).join(" · ")}
              </div>
              <div style={{ fontSize: "15px", color: "#4b5563", lineHeight: 1.6, marginBottom: "16px" }}>
                {[
                  selectedVacancy.room_count !== undefined ? `룸 ${selectedVacancy.room_count}개` : null,
                  `주차 ${selectedVacancy.parking || "정보없음"}`,
                  selectedVacancy.options?.length ? selectedVacancy.options.join(", ") : null
                ].filter(Boolean).join(" | ")}
              </div>

              {/* Themes */}
              {selectedVacancy.themes && selectedVacancy.themes.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {selectedVacancy.themes.map((theme: string, idx: number) => (
                    <span key={idx} style={{ background: "#f8fafc", color: "#3b82f6", fontSize: "13px", padding: "4px 10px", borderRadius: "16px", fontWeight: 700, border: "1px solid #bfdbfe" }}>
                      {theme.startsWith('#') ? theme : `# ${theme}`}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 탭 네비게이션 */}
            <div style={{ display: "flex", borderBottom: "1px solid #111827", marginTop: "10px" }}>
              <button 
                onClick={() => setDetailTab("info")} 
                style={{ flex: 1, padding: "14px 0", fontSize: "17px", fontWeight: detailTab === "info" ? 800 : 600, color: detailTab === "info" ? "#111827" : "#6b7280", borderBottom: detailTab === "info" ? "3px solid #111827" : "3px solid transparent", background: "none" }}
              >
                매물정보
              </button>
              <button 
                onClick={() => setDetailTab("realtor")} 
                style={{ flex: 1, padding: "14px 0", fontSize: "17px", fontWeight: detailTab === "realtor" ? 800 : 600, color: detailTab === "realtor" ? "#111827" : "#6b7280", borderBottom: detailTab === "realtor" ? "3px solid #111827" : "3px solid transparent", background: "none" }}
              >
                등록자 공실
              </button>
            </div>

            {/* 탭 컨텐츠 */}
            <div style={{ padding: "0 16px 20px" }}>
              {detailTab === "info" ? (
                <div>
                  {[
                    ["매물번호", selectedVacancy.vacancy_no || '-'],
                    ["소재지", [selectedVacancy.sido, selectedVacancy.sigungu, selectedVacancy.dong, selectedVacancy.building_name].filter(Boolean).join(" ")],
                    ["매물특성", selectedVacancy.building_name || "-"],
                    ["공급/전용면적", `${selectedVacancy.supply_m2 || "-"}㎡ / ${selectedVacancy.exclusive_m2 || "-"}㎡`],
                    ["해당층/총층", `${selectedVacancy.current_floor || "-"}층 / ${selectedVacancy.total_floor || "-"}층`],
                    ["방/욕실수", `${selectedVacancy.room_count || 0}개 / ${selectedVacancy.bath_count || 0}개`],
                    ["방향", selectedVacancy.direction || "-"],
                    ["주차가능 여부", selectedVacancy.parking || "-"],
                    ["입주가능일", selectedVacancy.move_in_date || "즉시입주(공실)"]
                  ].map(([label, val], i) => (
                    <div key={i} style={{ display: "flex", padding: "16px 0", borderBottom: "1px solid #f3f4f6" }}>
                      <div style={{ width: "100px", fontSize: "15px", fontWeight: 700, color: "#374151" }}>{label}</div>
                      <div style={{ flex: 1, fontSize: "16px", color: "#111827" }}>{val}</div>
                    </div>
                  ))}
                  {/* 옵션 */}
                  {selectedVacancy.options && selectedVacancy.options.length > 0 && (
                    <div style={{ paddingTop: "24px" }}>
                      <div style={{ fontSize: "16px", fontWeight: 800, color: "#111827", marginBottom: "16px" }}>옵션</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px 8px" }}>
                        {selectedVacancy.options.map((opt: string) => (
                          <div key={opt} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563" }}>
                              <OptionIcon name={opt} />
                            </div>
                            <span style={{ fontSize: "13px", color: "#374151", fontWeight: 600 }}>{opt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 주변환경 (인프라) */}
                  {selectedVacancy.infrastructure && Object.keys(selectedVacancy.infrastructure).length > 0 && (
                    <div style={{ paddingTop: "24px", marginTop: "24px", borderTop: "1px dashed #e5e7eb" }}>
                      <div style={{ fontSize: "16px", fontWeight: 800, color: "#111827", marginBottom: "16px" }}>주변환경</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {Object.entries(selectedVacancy.infrastructure).map(([category, items]) => {
                          const itemList = Array.isArray(items) ? items : [];
                          if (itemList.length === 0) return null;
                          return (
                            <div key={category} style={{ display: "flex", gap: "12px" }}>
                              <div style={{ width: "80px", fontSize: "14px", fontWeight: 700, color: "#6b7280", paddingTop: "2px" }}>{category}</div>
                              <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                {itemList.map((item: any) => (
                                  <span key={item} style={{ background: "#f3f4f6", color: "#374151", fontSize: "13px", padding: "4px 10px", borderRadius: "12px" }}>{String(item)}</span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 설명 */}
                  {selectedVacancy.description && (
                    <div style={{ padding: "24px 0 0", marginTop: "24px", borderTop: "1px dashed #e5e7eb" }}>
                      <div style={{ fontSize: "16px", fontWeight: 800, color: "#111827", marginBottom: "12px" }}>상세설명</div>
                      <p style={{ fontSize: "15px", color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{selectedVacancy.description}</p>
                    </div>
                  )}

                  {/* 위치정보 및 로드뷰 */}
                  <div style={{ paddingTop: "24px", marginTop: "24px", borderTop: "1px dashed #e5e7eb" }}>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#111827", marginBottom: "12px" }}>위치정보</div>
                    <div ref={itemMapRef} style={{ width: "100%", height: "200px", borderRadius: "8px", background: "#f3f4f6", marginBottom: "20px" }}></div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#111827", marginBottom: "12px" }}>로드뷰</div>
                    <div ref={roadviewRef} style={{ width: "100%", height: "200px", borderRadius: "8px", background: "#f3f4f6" }}></div>
                  </div>
                </div>
              ) : (
                <div style={{ paddingTop: "24px" }}>
                  <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
                    <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#f3f4f6", overflow: "hidden", flexShrink: 0 }}>
                      <img src={selectedVacancy.members?.profile_image_url || selectedVacancy.members?.avatar_url || "https://via.placeholder.com/64"} onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/64?text=Profile"; }} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#111827" }}>
                          {(() => {
                            const agencyInfo = Array.isArray(selectedVacancy.members?.agencies) ? selectedVacancy.members.agencies[0] : selectedVacancy.members?.agencies;
                            return agencyInfo?.name || selectedVacancy.members?.full_name || "착한임대";
                          })()}
                        </h3>
                        <button style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: "4px", padding: "2px 6px", display: "flex", alignItems: "center" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        </button>
                      </div>
                      {(() => {
                        const agencyInfo = Array.isArray(selectedVacancy.members?.agencies) ? selectedVacancy.members.agencies[0] : selectedVacancy.members?.agencies;
                        const phoneStr = [agencyInfo?.phone, agencyInfo?.cell].filter(Boolean).join(', ') || selectedVacancy.members?.phone || selectedVacancy.client_phone || "미등록";
                        const firstPhone = phoneStr !== "미등록" ? phoneStr.split(',')[0].trim() : "";
                        return (
                          <>
                            <p style={{ fontSize: "15px", color: "#6b7280", marginBottom: "4px" }}>
                              대표 {agencyInfo?.ceo_name || selectedVacancy.members?.name || "김동현"} | 등록번호 {agencyInfo?.reg_num || "미등록"}
                            </p>
                            <p style={{ fontSize: "15px", color: "#6b7280", marginBottom: "12px" }}>{agencyInfo?.address || selectedVacancy.sido + " " + selectedVacancy.sigungu}</p>
                            <a href={firstPhone ? `tel:${firstPhone}` : undefined} style={{ display: "flex", alignItems: "center", gap: "6px", color: "#1a73e8", fontSize: "16px", fontWeight: 700, textDecoration: "none" }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                              전화 {phoneStr}
                            </a>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  
                  {/* 소개글 박스 */}
                  <div style={{ background: "#f8f9fa", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
                    <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#9ca3af", marginBottom: "8px" }}>부동산 소개</h4>
                    <p style={{ fontSize: "15px", color: "#4b5563", lineHeight: 1.6 }}>
                      임대차 계약 만료 전, 묵시적 갱신과 계약갱신청구권의 차이를 아는 것이 자산을 지키는 핵심입니다. 세입자에게 더 유리한 거주 기간 확보 전략과 복비 부담 주체를 명확히 정리해 드립니다.
                    </p>
                  </div>
                  
                  {/* 뱃지 아이콘들 */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "30px", justifyContent: "center" }}>
                    {/* SMS/문자 (연락처가 있을 경우에만) */}
                    {(() => {
                      const phone = Array.isArray(selectedVacancy.members?.agencies) ? selectedVacancy.members.agencies[0]?.cell || selectedVacancy.members.agencies[0]?.phone : selectedVacancy.members?.agencies?.cell || selectedVacancy.members?.agencies?.phone || selectedVacancy.members?.phone || selectedVacancy.client_phone;
                      if (!phone) return null;
                      return (
                        <a href={`sms:${phone}`} style={{ width: "40px", height: "40px", borderRadius: "50%", border: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", color: "#4b5563" }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        </a>
                      );
                    })()}

                    {/* SNS Links */}
                    {selectedVacancy.members?.sns_links && Object.keys(selectedVacancy.members.sns_links).filter(k => k !== "api_info" && k !== "api_list" && selectedVacancy.members.sns_links[k]?.url).map(key => {
                      const link = selectedVacancy.members.sns_links[key].url;
                      const validUrl = link.startsWith('http') ? link : `https://${link}`;
                      
                      let iconHtml;
                      switch(key) {
                        case 'youtube': iconHtml = <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.99C18.88 4 12 4 12 4s-6.88 0-8.59.43A2.78 2.78 0 0 0 1.46 6.42C1 8.16 1 12 1 12s0 3.84.46 5.58a2.78 2.78 0 0 0 1.95 1.99C5.12 20 12 20 12 20s6.88 0 8.59-.43a2.78 2.78 0 0 0 1.95-1.99C23 15.84 23 12 23 12s0-3.84-.46-5.58zM9.54 15.55V8.45L15.82 12l-6.28 3.55z"></path></svg>; break;
                        case 'instagram': iconHtml = <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>; break;
                        case 'facebook': iconHtml = <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>; break;
                        case 'twitter': iconHtml = <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>; break;
                        case 'blog': iconHtml = <span style={{ fontSize: 11, fontWeight: "bold" }}>BLOG</span>; break;
                        case 'cafe': iconHtml = <span style={{ fontSize: 11, fontWeight: "bold" }}>CAFE</span>; break;
                        case 'kakao': iconHtml = <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.8 5.2 4.4 6.5l-1 3.7c-.1.3.3.6.5.4l4.3-2.9c.6.1 1.2.1 1.8.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z"></path></svg>; break;
                        case 'homepage': iconHtml = <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>; break;
                        default: iconHtml = <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>;
                      }
                      
                      return (
                        <a key={key} href={validUrl} target="_blank" rel="noopener noreferrer" style={{ width: "40px", height: "40px", borderRadius: "50%", border: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563", textDecoration: "none" }}>
                          {iconHtml}
                        </a>
                      );
                    })}

                    {/* 오시는길 (주소가 있을 경우에만 표시) */}
                    {(() => {
                      const agencyInfo = Array.isArray(selectedVacancy.members?.agencies) ? selectedVacancy.members.agencies[0] : selectedVacancy.members?.agencies;
                      const addr = agencyInfo?.address || selectedVacancy.sido + " " + selectedVacancy.sigungu;
                      if (!addr) return null;
                      return (
                        <a href={agencyInfo?.lat && agencyInfo?.lng ? `https://map.kakao.com/link/roadview/${agencyInfo.lat},${agencyInfo.lng}` : `https://map.kakao.com/link/search/${encodeURIComponent(addr)}`} target="_blank" rel="noopener noreferrer" style={{ width: "40px", height: "40px", borderRadius: "50%", border: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563", textDecoration: "none" }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        </a>
                      );
                    })()}
                  </div>
                  
                  {/* 공실등록현황 및 리스트 */}
                  {(() => {
                    const ownerVacancies = vacancies.filter(v => v.owner_id === selectedVacancy.owner_id);
                    const totalCnt = ownerVacancies.length;
                    const saleCnt = ownerVacancies.filter(v => v.trade_type === "매매").length;
                    const jeonseCnt = ownerVacancies.filter(v => v.trade_type === "전세").length;
                    const wolseCnt = ownerVacancies.filter(v => v.trade_type === "월세").length;
                    const shortCnt = ownerVacancies.filter(v => v.trade_type === "단기").length;

                    return (
                      <>
                        <div style={{ background: "#f9fafb", borderRadius: "8px", padding: "16px", display: "flex", alignItems: "center", marginBottom: "16px" }}>
                          <div style={{ fontSize: "16px", fontWeight: 800, color: "#111827", marginRight: "20px" }}>공실등록현황</div>
                          <div style={{ display: "flex", flex: 1, justifyContent: "space-between", fontSize: "14px", color: "#6b7280" }}>
                            <span onClick={() => setRealtorFilter("전체")} style={{ cursor: "pointer", color: realtorFilter === "전체" ? "#1a73e8" : "inherit", fontWeight: realtorFilter === "전체" ? 700 : "normal" }}>전체 <b style={{ color: realtorFilter === "전체" ? "#1a73e8" : "#111827" }}>{totalCnt}</b></span>
                            <span onClick={() => setRealtorFilter("매매")} style={{ cursor: "pointer", color: realtorFilter === "매매" ? "#1a73e8" : "inherit", fontWeight: realtorFilter === "매매" ? 700 : "normal" }}>매매 <b style={{ color: realtorFilter === "매매" ? "#1a73e8" : "#111827" }}>{saleCnt}</b></span>
                            <span onClick={() => setRealtorFilter("전세")} style={{ cursor: "pointer", color: realtorFilter === "전세" ? "#1a73e8" : "inherit", fontWeight: realtorFilter === "전세" ? 700 : "normal" }}>전세 <b style={{ color: realtorFilter === "전세" ? "#1a73e8" : "#111827" }}>{jeonseCnt}</b></span>
                            <span onClick={() => setRealtorFilter("월세")} style={{ cursor: "pointer", color: realtorFilter === "월세" ? "#1a73e8" : "inherit", fontWeight: realtorFilter === "월세" ? 700 : "normal" }}>월세 <b style={{ color: realtorFilter === "월세" ? "#1a73e8" : "#111827" }}>{wolseCnt}</b></span>
                            <span onClick={() => setRealtorFilter("단기")} style={{ cursor: "pointer", color: realtorFilter === "단기" ? "#1a73e8" : "inherit", fontWeight: realtorFilter === "단기" ? 700 : "normal" }}>단기 <b style={{ color: realtorFilter === "단기" ? "#1a73e8" : "#111827" }}>{shortCnt}</b></span>
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column" }}>
                          {(realtorFilter === "전체" ? ownerVacancies : ownerVacancies.filter(v => v.trade_type === realtorFilter)).map((v: any) => (
                            <div
                              key={v.id}
                              className="v-card"
                              onClick={() => {
                                vacancyStackRef.current.push({
                                  vacancy: selectedVacancy,
                                  scrollY: detailScrollRef.current?.scrollTop || 0
                                });
                                setDetailTab("info");
                                handleVacancyClick(v);
                              }}
                              style={{ display: "flex", gap: "12px", padding: "16px 0", borderBottom: "1px solid #f3f4f6", cursor: "pointer", transition: "background 0.15s" }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                {/* Badges & Date */}
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#ef4444", border: "1px solid #ef4444", padding: "1px 6px", borderRadius: "3px" }}>공동중개 0%</span>
                                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#ef4444" }}>{v.vacancy_no || '-'}</span>
                                  <span style={{ fontSize: "12px", color: "#9ca3af" }}>{v.created_at ? new Date(v.created_at).toLocaleDateString("ko-KR").slice(0, -1) : ""}</span>
                                </div>

                                {/* Title */}
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                  <p style={{ fontSize: "16px", fontWeight: 800, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {v.building_name || [v.dong, v.sigungu].filter(Boolean).join(" ")}
                                  </p>
                                </div>
                                
                                {/* Price */}
                                <p style={{ fontSize: "18px", fontWeight: 800, color: "#1a73e8", marginBottom: "6px" }}>
                                  {v.trade_type} {formatPrice(v)}
                                </p>
                                
                                {/* Specs */}
                                <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {[v.property_type || "건물", v.direction, v.exclusive_m2 && `${v.exclusive_m2}㎡`].filter(Boolean).join(" | ")}
                                </p>
                                
                                {/* Options */}
                                <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {[v.room_count !== undefined ? `룸 ${v.room_count}개` : null, v.bath_count !== undefined ? `욕실 ${v.bath_count}개` : null, ...(v.options || [])].filter(Boolean).join(", ")}
                                </p>

                                {/* Themes */}
                                {v.themes && v.themes.length > 0 && (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                                    {v.themes.map((theme: string, idx: number) => (
                                      <span key={idx} style={{ background: "#f8fafc", color: "#3b82f6", fontSize: "12px", padding: "2px 8px", borderRadius: "12px", fontWeight: 700, border: "1px solid #bfdbfe" }}>
                                        {theme.startsWith('#') ? theme : `# ${theme}`}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {v.images?.[0] && (
                                <div style={{ width: "90px", height: "72px", borderRadius: "10px", overflow: "hidden", flexShrink: 0, backgroundColor: "#e5e7eb", alignSelf: "center" }}>
                                  <img src={v.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                </div>
                              )}
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" style={{ flexShrink: 0, alignSelf: "center" }}><polyline points="9 18 15 12 9 6"/></svg>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
            </div>

            {/* 하단 CTA */}
            <div style={{ background: "#fff", borderTop: "1px solid #e5e7eb", padding: "14px 16px 24px" }}>
              <button
                onClick={() => {
                  const agencyInfo = Array.isArray(selectedVacancy?.members?.agencies) ? selectedVacancy.members.agencies[0] : selectedVacancy?.members?.agencies;
                  const targetPhone = agencyInfo?.cell || agencyInfo?.phone || selectedVacancy?.members?.phone || selectedVacancy?.client_phone;
                  if (targetPhone) {
                    const firstPhone = targetPhone.split(',')[0].trim();
                    window.location.href = `tel:${firstPhone}`;
                  }
                }}
                style={{ width: "100%", height: "52px", borderRadius: "6px", background: "#1a73e8", color: "#fff", fontSize: "18px", fontWeight: 800, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                연락하기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
      {/* 갤러리 풀스크린 모달 */}
      {showGalleryFullscreen && selectedVacancy?.images && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#000", zIndex: 10000, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff" }}>
            <div style={{ fontSize: "15px", fontWeight: 600 }}>{galleryIndex + 1} / {selectedVacancy.images.length}</div>
            <button onClick={() => setShowGalleryFullscreen(false)} style={{ background: "none", border: "none", color: "#fff", fontSize: "24px", cursor: "pointer", padding: "4px" }}>✕</button>
          </div>
          <div 
            style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEndHandler}
          >
            <img 
              src={selectedVacancy.images[galleryIndex]} 
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} 
              alt="갤러리 확대" 
            />
            {selectedVacancy.images.length > 1 && (
              <>
                <button onClick={() => setGalleryIndex(Math.max(0, galleryIndex - 1))} style={{ position: "absolute", top: "50%", left: 0, transform: "translateY(-50%)", background: "none", color: "#fff", border: "none", fontSize: "36px", padding: "20px", cursor: "pointer" }}>〈</button>
                <button onClick={() => setGalleryIndex(Math.min(selectedVacancy.images.length - 1, galleryIndex + 1))} style={{ position: "absolute", top: "50%", right: 0, transform: "translateY(-50%)", background: "none", color: "#fff", border: "none", fontSize: "36px", padding: "20px", cursor: "pointer" }}>〉</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MobileGongsilPage() {
  return (
    <Suspense fallback={null}>
      <MobileGongsilContent />
    </Suspense>
  );
}
