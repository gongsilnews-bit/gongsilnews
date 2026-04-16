"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getVacancies, getAgencyInfo, getVacancyDetail } from "@/app/actions/vacancy";
import { getVacancyComments, createVacancyComment } from "@/app/actions/vacancyComments";
import MapSearchBar from "@/components/MapSearchBar";
import MapTopAuthButtons from "@/components/MapTopAuthButtons";

// 카테고리 설정 데이터
const CATEGORY_CONFIG: Record<string, { name: string; pills: string[]; basicFilters: string[]; detailFilters: string[]; showToggle: boolean; pillStyle?: string }> = {
  apart: { name: "아파트·오피스텔", pills: ["아파트", "아파트분양권", "재건축", "오피스텔", "오피스텔분양권", "재개발"], basicFilters: ["거래방식", "가격대", "면적", "사용승인일", "세대수", "층수", "방/욕실수", "방향", "기타옵션"], detailFilters: [], showToggle: false },
  villa: { name: "빌라·주택", pills: ["빌라/연립", "단독/다가구", "전원주택", "상가주택"], basicFilters: ["거래방식", "가격대", "면적", "방/욕실수", "사용승인일", "방향", "기타옵션"], detailFilters: [], showToggle: false },
  one: { name: "원룸·투룸", pills: ["원룸", "투룸", "오피스텔만 보기"], basicFilters: ["거래방식", "가격대", "관리비", "기타옵션"], detailFilters: [], showToggle: false },
  biz: { name: "상가·업무·공장·토지", pills: ["상가", "사무실", "공장/창고", "지식산업센터", "건물", "토지"], basicFilters: ["거래방식", "가격대", "면적", "층수", "관리비", "기타옵션"], detailFilters: [], showToggle: false },
  sale: { name: "분양", pills: ["아파트", "오피스텔", "빌라", "도시형생활주택", "생활숙박시설", "상가/업무"], basicFilters: ["분양단계", "분양형태", "분양가/보증금", "면적", "세대수"], detailFilters: [], showToggle: false },
  wish: { name: "MY관심공실", pills: [], basicFilters: [], detailFilters: [], showToggle: false },
};

// 카테고리 키 → DB property_type 매핑
const CATEGORY_TO_PROPERTY_TYPE: Record<string, string> = {
  apart: "아파트·오피스텔",
  villa: "빌라·주택",
  one: "원룸·투룸(풀옵션)",
  biz: "상가·사무실·건물·공장·토지",
  sale: "분양",
};

// 가격 그리드 버튼 (네이버 부동산 스타일, 단위: 원)
const PRICE_GRID = [
  { label: "1천", val: 10000000 }, { label: "3천", val: 30000000 }, { label: "5천", val: 50000000 },
  { label: "1억", val: 100000000 }, { label: "2억", val: 200000000 }, { label: "3억", val: 300000000 },
  { label: "4억", val: 400000000 }, { label: "5억", val: 500000000 }, { label: "6억", val: 600000000 },
  { label: "7억", val: 700000000 }, { label: "8억", val: 800000000 }, { label: "9억", val: 900000000 },
  { label: "10억", val: 1000000000 }, { label: "12억", val: 1200000000 }, { label: "15억", val: 1500000000 },
  { label: "20억", val: 2000000000 }, { label: "30억", val: 3000000000 }, { label: "30억~", val: -1 },
];

// 면적 그리드 버튼 (평 단위, 내부에서 ㎡로 환산)
const AREA_GRID = [
  { label: "10평", m2: 33 }, { label: "20평", m2: 66 }, { label: "30평", m2: 99 }, { label: "40평", m2: 132 },
  { label: "50평", m2: 165 }, { label: "60평", m2: 198 }, { label: "70평", m2: 231 }, { label: "80평", m2: 264 },
  { label: "100평", m2: 330 }, { label: "150평", m2: 495 }, { label: "200평", m2: 660 },
  { label: "300평", m2: 990 }, { label: "500평", m2: 1650 }, { label: "500평~", m2: -1 },
];

// 사용승인일 그리드 (연도 단위, 1960~2026)
const YEAR_GRID = (() => {
  const years: { label: string; val: number }[] = [];
  for (let y = 1960; y <= 2026; y += 5) {
    years.push({ label: `${y}년`, val: y });
  }
  // Ensure 2026 is included
  if (years[years.length - 1].val !== 2026) years.push({ label: "2026년", val: 2026 });
  return years;
})();

// 세대수 그리드 (50~4000)
const UNIT_GRID = [
  { label: "50세대", val: 50 }, { label: "100세대", val: 100 }, { label: "200세대", val: 200 },
  { label: "300세대", val: 300 }, { label: "500세대", val: 500 }, { label: "700세대", val: 700 },
  { label: "1000세대", val: 1000 }, { label: "1500세대", val: 1500 }, { label: "2000세대", val: 2000 },
  { label: "2500세대", val: 2500 }, { label: "3000세대", val: 3000 }, { label: "4000세대", val: 4000 },
];

// 관리비 프리셋 (원)
const MAINT_PRESETS = [
  { label: "전체", min: 0, max: Infinity },
  { label: "5만 이하", min: 0, max: 50000 },
  { label: "5~10만", min: 50000, max: 100000 },
  { label: "10~20만", min: 100000, max: 200000 },
  { label: "20~30만", min: 200000, max: 300000 },
  { label: "30만 이상", min: 300000, max: Infinity },
];

export default function GongsilClient({ initialVacancies }: { initialVacancies: any[] }) {
  /* ── State & Refs ── */
  const searchParams = useSearchParams();
  const [dbVacancies, setDbVacancies] = useState<any[]>(initialVacancies);
  const [activeCategory, setActiveCategory] = useState("apart");
  const [activePills, setActivePills] = useState<string[]>(["아파트"]);
  const [activeProperty, setActiveProperty] = useState<string | number | null>(null);
  const [prevPropertyId, setPrevPropertyId] = useState<string | number | null>(null);
  const [showDetail, setShowDetail] = useState(true);
  const [activeDetailTab, setActiveDetailTab] = useState<"info" | "realtor">("info");
  const [showDetailFilters, setShowDetailFilters] = useState(false);
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const shareDropdownRef = useRef<HTMLDivElement>(null);

  const [wishTab, setWishTab] = useState<"wish" | "recent">("wish");
  const [recentViews, setRecentViews] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);

  useEffect(() => {
    const savedRecent = localStorage.getItem('gongsil_recent_views');
    if (savedRecent) {
      try { setRecentViews(JSON.parse(savedRecent)); } catch (e) {}
    }
    const savedWish = localStorage.getItem('gongsil_wishlist');
    if (savedWish) {
      try { setWishlist(JSON.parse(savedWish)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (activeProperty) {
      setRecentViews(prev => {
        const id = activeProperty;
        const newViews = [id, ...prev.filter(x => x !== id)].slice(0, 50);
        localStorage.setItem('gongsil_recent_views', JSON.stringify(newViews));
        return newViews;
      });
    }
  }, [activeProperty]);

  const toggleWishlist = (id: any) => {
    const isWished = wishlist.includes(id);
    setToastMessage(isWished ? "찜을 해제했습니다." : "찜했습니다.");
    setWishlist(prev => {
      const newWish = isWished ? prev.filter(x => x !== id) : [id, ...prev];
      localStorage.setItem('gongsil_wishlist', JSON.stringify(newWish));
      return newWish;
    });
  };

  const [realtorTradeType, setRealtorTradeType] = useState<string>("전체");

  // ── 실제 필터 상태 (네이버 부동산 스타일) ──
  const [filterTradeTypes, setFilterTradeTypes] = useState<string[]>([]);
  const [filterPriceMin, setFilterPriceMin] = useState<number | null>(null);
  const [filterPriceMax, setFilterPriceMax] = useState<number | null>(null);
  const [filterAreaMin, setFilterAreaMin] = useState<number | null>(null);  // ㎡ 단위
  const [filterAreaMax, setFilterAreaMax] = useState<number | null>(null);
  const [filterMaintIdx, setFilterMaintIdx] = useState(0);
  const [filterRoomCount, setFilterRoomCount] = useState<number | null>(null);
  const [filterBathCount, setFilterBathCount] = useState<number | null>(null);
  const [filterDirection, setFilterDirection] = useState<string | null>(null);
  const [filterYearMin, setFilterYearMin] = useState<number | null>(null);
  const [filterYearMax, setFilterYearMax] = useState<number | null>(null);
  const [filterUnitMin, setFilterUnitMin] = useState<number | null>(null);
  const [filterUnitMax, setFilterUnitMax] = useState<number | null>(null);
  const [filterFloor, setFilterFloor] = useState<string | null>(null);
  const [filterSaleStage, setFilterSaleStage] = useState<string[]>([]);
  const [filterSaleType, setFilterSaleType] = useState<string[]>([]);
  const [filterOptions, setFilterOptions] = useState<string[]>([]);

  const [selectedClusterIds, setSelectedClusterIds] = useState<string[] | null>(null);
  const selectedClusterIdsRef = useRef<string[] | null>(null);
  const dbVacanciesRef = useRef<any[]>(initialVacancies);
  const [mapBounds, setMapBounds] = useState<any>(null);
  const [mapCenterRegion, setMapCenterRegion] = useState<{ sido: string; gugun: string; dong: string } | null>(null);

  // Set initial data and ref
  useEffect(() => {
    if (initialVacancies && initialVacancies.length > 0) {
      const withImages = initialVacancies.map((v: any) => ({
        ...v,
        images: v.vacancy_photos ? [...v.vacancy_photos].sort((a:any, b:any)=>a.sort_order - b.sort_order).map((p:any) => p.url) : []
      }));
      setDbVacancies(withImages);
      dbVacanciesRef.current = withImages;
    }
  }, [initialVacancies]);

  useEffect(() => {
    selectedClusterIdsRef.current = selectedClusterIds;
    
    // Update Single Markers reactively
    if (markersRef.current && (window as any).kakao?.maps) {
       const size = 42;
       const normalSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="%234b89ff" stroke="white" stroke-width="2"/><text x="50%25" y="50%25" dy="1px" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="16" font-weight="bold" font-family="sans-serif">1</text></svg>`;
       const activeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="white" stroke="%234b89ff" stroke-width="2"/><text x="50%25" y="50%25" dy="1px" text-anchor="middle" dominant-baseline="middle" fill="%234b89ff" font-size="16" font-weight="bold" font-family="sans-serif">1</text></svg>`;

       markersRef.current.forEach((marker: any) => {
          const idStr = markerIdMapRef.current.get(marker);
          const isSelected = selectedClusterIds && idStr && selectedClusterIds.includes(idStr);
          marker.setImage(new (window as any).kakao.maps.MarkerImage(
             `data:image/svg+xml,${isSelected ? activeSvg : normalSvg}`,
             new (window as any).kakao.maps.Size(size, size),
             { offset: new (window as any).kakao.maps.Point(size / 2, size / 2) }
          ));
          marker.setZIndex(isSelected ? 99 : 0);
       });
    }

    // Force cluster redraw to recreate and re-apply active styles via clustered event cleanly!
    if (clustererRef.current) {
       clustererRef.current.redraw();
    }
  }, [selectedClusterIds]);

  // ── 카테고리 + Pills + 드롭다운 필터를 모두 적용한 전체 목록 ──
  const filteredVacancies = React.useMemo(() => {
    let list = dbVacancies;

    if (activeCategory === "wish") {
      if (wishTab === "recent") {
        return recentViews.map(id => dbVacancies.find(v => v.id === id)).filter(Boolean) as any[];
      }
      if (wishTab === "wish") {
        return wishlist.map(id => dbVacancies.find(v => v.id === id)).filter(Boolean) as any[];
      }
      return [];
    }

    // 1) property_type 필터 (메인 카테고리 탭)
    const dbPropType = CATEGORY_TO_PROPERTY_TYPE[activeCategory];
    if (dbPropType) {
      list = list.filter(v => v.property_type === dbPropType);
    }

    // 2) sub_category 필터 (Pills)
    if (activePills.length > 0) {
      list = list.filter(v => activePills.includes(v.sub_category));
    }

    // 3) 거래방식 필터
    if (filterTradeTypes.length > 0) {
      list = list.filter(v => filterTradeTypes.includes(v.trade_type));
    }

    // 4) 가격대 필터 (deposit 기준, min/max)
    if (filterPriceMin !== null || filterPriceMax !== null) {
      list = list.filter(v => {
        const dep = v.deposit || 0;
        if (filterPriceMin !== null && dep < filterPriceMin) return false;
        if (filterPriceMax !== null && dep > filterPriceMax) return false;
        return true;
      });
    }

    // 5) 면적 필터 (전용면적 기준, ㎡ min/max)
    if (filterAreaMin !== null || filterAreaMax !== null) {
      list = list.filter(v => {
        const area = v.exclusive_m2 || v.supply_m2 || 0;
        if (filterAreaMin !== null && area < filterAreaMin) return false;
        if (filterAreaMax !== null && area > filterAreaMax) return false;
        return true;
      });
    }

    // 6) 관리비 필터
    if (filterMaintIdx > 0) {
      const m = MAINT_PRESETS[filterMaintIdx];
      list = list.filter(v => (v.maintenance_fee || 0) >= m.min && (v.maintenance_fee || 0) < (m.max === Infinity ? 99999999 : m.max));
    }

    // 7) 방 개수
    if (filterRoomCount !== null) {
      list = list.filter(v => (v.room_count || 0) >= filterRoomCount);
    }

    // 8) 욕실 개수
    if (filterBathCount !== null) {
      list = list.filter(v => (v.bath_count || 0) >= filterBathCount);
    }

    // 9) 방향
    if (filterDirection) {
      list = list.filter(v => v.direction === filterDirection);
    }

    // 10) 사용승인일 (연도 필터)
    if (filterYearMin !== null || filterYearMax !== null) {
      list = list.filter(v => {
        const year = v.approval_year || 0;
        if (!year) return false;
        if (filterYearMin !== null && year < filterYearMin) return false;
        if (filterYearMax !== null && year > filterYearMax) return false;
        return true;
      });
    }

    // 11) 세대수 필터
    if (filterUnitMin !== null || filterUnitMax !== null) {
      list = list.filter(v => {
        const units = v.total_units || 0;
        if (!units) return false;
        if (filterUnitMin !== null && units < filterUnitMin) return false;
        if (filterUnitMax !== null && units > filterUnitMax) return false;
        return true;
      });
    }

    return list;
  }, [dbVacancies, activeCategory, activePills, filterTradeTypes, filterPriceMin, filterPriceMax, filterAreaMin, filterAreaMax, filterMaintIdx, filterRoomCount, filterBathCount, filterDirection, filterYearMin, filterYearMax, filterUnitMin, filterUnitMax, wishTab, recentViews]);

  // ── 지도 범위 / 클러스터 선택 적용 ──
  const displayVacancies = React.useMemo(() => {
    let filtered = filteredVacancies;
    if (selectedClusterIds) {
      filtered = filtered.filter(v => selectedClusterIds.includes(String(v.id)));
    } else if (mapBounds && (window as any).kakao?.maps) {
      filtered = filtered.filter(v => {
        if (!v.lat || !v.lng) return false;
        const pos = new (window as any).kakao.maps.LatLng(v.lat, v.lng);
        return mapBounds.contain(pos);
      });
    }
    return filtered;
  }, [filteredVacancies, selectedClusterIds, mapBounds]);

  const [mapError, setMapError] = useState<string | null>(null);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [agencyInfo, setAgencyInfo] = useState<any>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSecret, setIsSecret] = useState(true);

  // Lazy Loading Detail Map
  const [fullDetailsMap, setFullDetailsMap] = useState<Record<string, any>>({});

  // SVG Option Helper Function
  const getOptionSvg = (name: string) => {
    if (name.includes("에어컨")) return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h16v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z"></path><line x1="8" y1="16" x2="8" y2="20"></line><line x1="16" y1="16" x2="16" y2="20"></line><line x1="12" y1="16" x2="12" y2="21"></line><path d="M4 8V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2"></path></svg>;
    if (name.includes("싱크대") || name.includes("주방")) return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="10" width="18" height="10" rx="2"></rect><path d="M8 10V6a2 2 0 0 1 4-2a2 2 0 0 1 4 2v4"></path><line x1="12" y1="10" x2="12" y2="20"></line><line x1="6" y1="10" x2="6" y2="20"></line><line x1="18" y1="10" x2="18" y2="20"></line></svg>;
    if (name.includes("옷장") || name.includes("붙박이장")) return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"></rect><line x1="12" y1="4" x2="12" y2="20"></line><rect x="8" y="10" width="1" height="4"></rect><rect x="15" y="10" width="1" height="4"></rect></svg>;
    if (name.includes("TV") || name.includes("티비")) return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>;
    if (name.includes("세탁기")) return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"></rect><circle cx="12" cy="13" r="4"></circle><line x1="8" y1="6" x2="10" y2="6"></line></svg>;
    if (name.includes("침대")) return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v9"></path></svg>;
    if (name.includes("냉장고")) return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"></rect><line x1="5" y1="10" x2="19" y2="10"></line><line x1="9" y1="5" x2="9" y2="8"></line><line x1="9" y1="13" x2="9" y2="16"></line></svg>;
    if (name.includes("보안") || name.includes("도어락")) return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;
    if (name.includes("주차")) return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M9 17V7h4a3 3 0 0 1 0 6H9"></path></svg>;
    return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
  };

  const mapRef = useRef<HTMLDivElement>(null);
  const itemMapRef = useRef<HTMLDivElement>(null);
  const roadviewRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<any>(null);
  const clustererRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const markerIdMapRef = useRef<Map<any, string>>(new Map());
  const infoWindowRef = useRef<any>(null);

  // Close info window
  const closeInfoWindow = useCallback(() => {
    if (infoWindowRef.current) {
      if (typeof infoWindowRef.current.close === 'function') {
        infoWindowRef.current.close();
      } else if (typeof infoWindowRef.current.setMap === 'function') {
        infoWindowRef.current.setMap(null);
      }
      infoWindowRef.current = null;
    }
  }, []);

  const showArticleOnMap = useCallback((prop: any) => {
    if (!kakaoMapRef.current || !prop.lat || !prop.lng) return;
    const kakao = (window as any).kakao;
    const position = new kakao.maps.LatLng(prop.lat, prop.lng);
    kakaoMapRef.current.panTo(position);
  }, []);

  // Handle ?id=X from main page navigation
  useEffect(() => {
    const idParam = searchParams.get("id");
    if (idParam && dbVacancies.length > 0) {
      const target = dbVacancies.find(v => String(v.id) === String(idParam));
      if (target) {
        setActiveProperty(target.id);
        setShowDetail(true);
        setActiveDetailTab("info");
        // Find the correct category and select it
        const catEntry = Object.entries(CATEGORY_TO_PROPERTY_TYPE).find(([, pType]) => pType === target.property_type);
        if (catEntry) {
          setActiveCategory(catEntry[0]);
          setActivePills(target.sub_category ? [target.sub_category] : []);
        }
        // Pan map to the vacancy
        if (target.lat && target.lng && kakaoMapRef.current) {
          const kakao = (window as any).kakao;
          if (kakao?.maps) {
            kakaoMapRef.current.panTo(new kakao.maps.LatLng(target.lat, target.lng));
            kakaoMapRef.current.setLevel(5);
          }
        }
        // Also ensure marker is selected visibly in the map cluster logic
        setSelectedClusterIds([String(target.id)]);
      }
    }
  }, [searchParams, dbVacancies]);

  // On activeProperty change, reset detail scroll position
  useEffect(() => {
    const el = document.getElementById("detail-scroll-container");
    if (el) el.scrollTop = 0;
  }, [activeProperty, showDetail]);

  // Fetch full details for lazy loading
  useEffect(() => {
    if (showDetail && activeProperty && !fullDetailsMap[activeProperty]) {
      getVacancyDetail(String(activeProperty)).then(res => {
        if (res.success && res.data) {
          const detailProp = {
            ...res.data,
            images: res.photos ? res.photos.sort((a:any,b:any) => a.sort_order - b.sort_order).map((p:any) => p.url) : []
          };
          setFullDetailsMap(prev => ({ ...prev, [activeProperty]: detailProp }));
        }
      });
    }
  }, [showDetail, activeProperty]);

  useEffect(() => {
    if (showDetail && activeProperty && activeDetailTab === "realtor") {
      const prop = dbVacancies.find(v => v.id === activeProperty);
      if (prop?.owner_id && prop?.owner_role === 'REALTOR') {
        getAgencyInfo(prop.owner_id).then(res => {
          if (res.success) setAgencyInfo(res.data);
          else setAgencyInfo(null);
        });
      } else {
        setAgencyInfo(null);
      }
    }
  }, [showDetail, activeProperty, activeDetailTab, dbVacancies]);

  useEffect(() => {
    async function initUser() {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data } = await client.auth.getUser();
      if (data?.user) setCurrentUser(data.user);
    }
    initUser();
  }, []);

  const fetchComments = useCallback(async (vacancyId: string) => {
    const res = await getVacancyComments(vacancyId);
    if (res.success) setComments(res.data || []);
  }, []);

  const handleCommentSubmit = async () => {
    if (!activeProperty || !newComment.trim()) return;
    if (!currentUser) return alert('로그인 후 이용 가능합니다.');
    
    // API 호출
    const authorNameValue = currentUser.user_metadata?.name || currentUser.email?.split("@")[0] || "회원";
    
    const res = await createVacancyComment({
      vacancy_id: String(activeProperty),
      author_id: currentUser.id,
      author_name: authorNameValue,
      content: newComment.trim(),
      is_secret: isSecret
    });

    if (res.success) {
      setNewComment("");
      fetchComments(String(activeProperty));
    } else {
      console.error("Comment submit error:", res.error);
      alert('코멘트 등록 중 오류가 발생했습니다. ' + (res.error || ''));
    }
  };

  useEffect(() => {
    if (showDetail && activeProperty) {
      const prop = dbVacancies.find(v => v.id === activeProperty);
      if (prop?.id) fetchComments(prop.id.toString());
      if (activeDetailTab === "info" && prop?.lat && prop?.lng && (window as any).kakao?.maps) {
        const kakao = (window as any).kakao;
        const pos = new kakao.maps.LatLng(prop.lat, prop.lng);
        
        // 지도 초기화
        if (itemMapRef.current) {
          const map = new kakao.maps.Map(itemMapRef.current, { center: pos, level: 3 });
          new kakao.maps.Marker({ position: pos, map: map });
        }
        
        // 로드뷰 초기화
        if (roadviewRef.current) {
          const rv = new kakao.maps.Roadview(roadviewRef.current);
          const rvClient = new kakao.maps.RoadviewClient();
          rvClient.getNearestPanoId(pos, 50, (panoId: any) => {
            if (panoId) {
              rv.setPanoId(panoId, pos);
            } else {
              if (roadviewRef.current) roadviewRef.current.innerHTML = '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#999; font-size:13px;">해당 위치의 로드뷰가 제공되지 않습니다.</div>';
            }
          });
        }
      }
    }
  }, [showDetail, activeProperty, activeDetailTab, dbVacancies]);

  // Preload Kakao Map script immediately on mount
  const [mapLoaded, setMapLoaded] = useState(false);
  useEffect(() => {
    if ((window as any).kakao && (window as any).kakao.maps && typeof (window as any).kakao.maps.LatLng === "function") {
      setMapLoaded(true);
      return;
    }
    const scriptId = "kakao-map-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      const kakaoApiKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc";
      script.id = scriptId;
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoApiKey}&libraries=services,clusterer&autoload=false`;
      script.onerror = () => setMapError("카카오맵 JS 키가 유효하지 않거나 등록되지 않았습니다.");
      document.head.appendChild(script);
      script.onload = () => {
        (window as any).kakao.maps.load(() => {
          setMapLoaded(true);
        });
      };
    } else {
      const check = setInterval(() => {
        if ((window as any).kakao && (window as any).kakao.maps && typeof (window as any).kakao.maps.LatLng === "function") {
          clearInterval(check);
          setMapLoaded(true);
        }
      }, 100);
    }
  }, []);

  // Preload Kakao Share SDK
  useEffect(() => {
    const scriptId = "kakao-share-script";
    if (document.getElementById(scriptId)) return;
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
    script.onload = () => {
      const Kakao = (window as any).Kakao;
      if (Kakao && !Kakao.isInitialized()) {
        const kakaoJsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc";
        Kakao.init(kakaoJsKey);
      }
    };
    document.head.appendChild(script);
  }, []);

  // Close share dropdown on outside click
  useEffect(() => {
    if (!showShareDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (shareDropdownRef.current && !shareDropdownRef.current.contains(e.target as Node)) {
        setShowShareDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showShareDropdown]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 2000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // ── 인쇄 핸들러 ──
  const handlePrint = (prop: any) => {
    const images = prop.images && prop.images.length > 0 && prop.images[0] ? prop.images : [];
    const imageHtml = images.length > 0 ? images.map((src: string) => `<img src="${src}" style="max-width:100%;max-height:300px;object-fit:contain;border-radius:6px;margin-bottom:8px;" />`).join('') : '';
    const addrText = [prop.dong, prop.building_name].filter(Boolean).join(" ");
    const fullAddr = [prop.sido, prop.sigungu, prop.dong, prop.detail_addr].filter(Boolean).join(" ");
    const priceText = getPriceText(prop);
    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>${addrText} - 공실뉴스</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; padding: 30px; color: #222; }
          .header { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #1a73e8; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { font-size: 22px; color: #1a73e8; }
          .header .sub { font-size: 12px; color: #888; }
          .gallery { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
          .price { font-size: 24px; font-weight: 800; color: #1f5edb; margin-bottom: 12px; }
          .info-row { display: flex; border-bottom: 1px solid #eee; }
          .info-label { width: 120px; background: #f4f5f7; padding: 10px 14px; font-size: 13px; font-weight: bold; color: #444; flex-shrink: 0; }
          .info-value { flex: 1; padding: 10px 14px; font-size: 13px; color: #222; word-break: break-all; }
          .section-title { font-size: 16px; font-weight: 800; margin: 25px 0 10px; }
          .options { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 15px; }
          .option-tag { font-size: 12px; background: #f0f0f0; padding: 4px 10px; border-radius: 4px; }
          .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 15px; font-size: 11px; color: #999; text-align: center; }
          @media print { body { padding: 15px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>공실뉴스</h1>
          <span class="sub">부동산 중개망의 스마트한 변화</span>
        </div>
        <div class="gallery">${imageHtml}</div>
        <h2 style="font-size:18px;margin-bottom:8px;">${addrText}</h2>
        <div class="price">${priceText}</div>
        <div style="font-size:13px;color:#555;margin-bottom:20px;">${prop.property_type} · ${prop.direction || '방향없음'} · 공급/전용: ${prop.supply_m2 || 0}㎡ / ${prop.exclusive_m2 || 0}㎡</div>
        <div class="info-row"><div class="info-label">매물번호</div><div class="info-value">${prop.vacancy_no || '-'}</div></div>
        <div class="info-row"><div class="info-label">소재지</div><div class="info-value">${fullAddr || '-'}</div></div>
        <div class="info-row"><div class="info-label">공급/전용면적</div><div class="info-value">${prop.supply_m2 ? prop.supply_m2 + 'm²' : '-'} / ${prop.exclusive_m2 ? prop.exclusive_m2 + 'm²' : '-'}</div></div>
        <div class="info-row"><div class="info-label">해당층/총층</div><div class="info-value">${prop.current_floor || '-'} / ${prop.total_floor || '-'}</div></div>
        <div class="info-row"><div class="info-label">방/욕실</div><div class="info-value">${prop.room_count || 0}개 / ${prop.bathroom_count || 0}개</div></div>
        <div class="info-row"><div class="info-label">방향</div><div class="info-value">${prop.direction || '-'}</div></div>
        <div class="info-row"><div class="info-label">주차</div><div class="info-value">${prop.parking || '없음'}</div></div>
        <div class="info-row"><div class="info-label">입주가능일</div><div class="info-value">${prop.move_in_date || '즉시입주(공실)'}</div></div>
        <div class="info-row"><div class="info-label">관리비</div><div class="info-value">${prop.maintenance_fee ? (prop.maintenance_fee / 10000) + '만원' : '없음'}</div></div>
        ${prop.description ? `<div class="info-row"><div class="info-label">상세설명</div><div class="info-value" style="white-space:pre-line;">${prop.description}</div></div>` : ''}
        ${prop.options && prop.options.length > 0 ? `<div class="section-title">옵션</div><div class="options">${prop.options.map((o:string) => `<span class="option-tag">${o}</span>`).join('')}</div>` : ''}
        <div class="footer">공실뉴스 | ${window.location.origin}/gongsil?id=${prop.id} | 인쇄일: ${new Date().toLocaleDateString('ko-KR')}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    // Wait for images to load before printing
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
    // Fallback if onload doesn't fire quickly
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 1500);
  };

  // ── 카카오톡 공유 ──
  const handleKakaoShare = (prop: any) => {
    const Kakao = (window as any).Kakao;
    if (!Kakao || !Kakao.isInitialized()) {
      alert('카카오 SDK가 로드되지 않았습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    const addrText = [prop.dong, prop.building_name].filter(Boolean).join(" ");
    const priceText = getPriceText(prop);
    const shareUrl = `${window.location.origin}/gongsil?id=${prop.id}`;
    const imageUrl = prop.images?.[0] || '';

    Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: `${addrText} ${priceText}`,
        description: `${prop.property_type} · ${prop.direction || '방향없음'} · ${prop.exclusive_m2 || 0}㎡`,
        imageUrl: imageUrl,
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [
        { title: '매물 보기', link: { mobileWebUrl: shareUrl, webUrl: shareUrl } },
      ],
    });
    setShowShareDropdown(false);
  };

  // ── URL 복사 ──
  const handleCopyUrl = (propId: any) => {
    const url = `${window.location.origin}/gongsil?id=${propId}`;
    navigator.clipboard.writeText(url).then(() => {
      setToastMessage('URL이 복사되었습니다.');
    }).catch(() => {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setToastMessage('URL이 복사되었습니다.');
    });
    setShowShareDropdown(false);
  };

  // 1. Initialize Kakao Map immediately without waiting for data
  useEffect(() => {
    if (!mapLoaded) return;
    const kakao = (window as any).kakao;
    if (!mapRef.current || kakaoMapRef.current) return;

    kakaoMapRef.current = new kakao.maps.Map(mapRef.current, {
      center: new kakao.maps.LatLng(37.498095, 127.027610),
      level: 6,
    });

    const map = kakaoMapRef.current;

    // 제한된 범위 지정 (1: 가장 확대된 상태, 9: 시/군/구 범위)
    map.setMinLevel(1);
    map.setMaxLevel(9);

    kakao.maps.event.addListener(map, 'idle', () => {
      setMapBounds(map.getBounds());
      // Reverse Geocoder for the center
      const center = map.getCenter();
      const geocoder = new kakao.maps.services.Geocoder();
      geocoder.coord2RegionCode(center.getLng(), center.getLat(), (result: any, status: any) => {
        if (status === kakao.maps.services.Status.OK) {
          const bCode = result.find((res: any) => res.region_type === 'B');
          if (bCode) {
            setMapCenterRegion({
              sido: bCode.region_1depth_name,
              gugun: bCode.region_2depth_name,
              dong: bCode.region_3depth_name,
            });
          }
        }
      });
    });

    kakao.maps.event.addListener(map, 'dragstart', () => {
       setSelectedClusterIds(null);
    });

    kakao.maps.event.addListener(map, 'zoom_start', () => {
       setSelectedClusterIds(null);
    });
  }, [mapLoaded]);

  // 2. Render Markers and Clusters after Map and Data are available
  useEffect(() => {
    if (!kakaoMapRef.current || filteredVacancies.length === 0) return;

    const kakao = (window as any).kakao;
    const map = kakaoMapRef.current;

    let initialLat = 37.498095;
    let initialLng = 127.027610;

    const validProp = dbVacanciesRef.current.find((a: any) => a.lat && a.lng);
    if (validProp) { initialLat = validProp.lat; initialLng = validProp.lng; }

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
            { width: '42px', height: '42px', background: 'rgba(75, 137, 255, 1)', color: '#fff', textAlign: 'center', lineHeight: '38px', borderRadius: '50%', fontWeight: 'bold', fontSize: '15px', border: '2px solid #ffffff', boxShadow: '0 3px 8px rgba(0,0,0,0.2)' }
          ]
        });

        // Add cluster events only once
        kakao.maps.event.addListener(clustererRef.current, 'clusterover', (cluster: any) => {
          const overlay = cluster.getClusterMarker().getContent();
          if (overlay && overlay.style) {
             overlay.style.transform = "scale(1.15)";
             overlay.style.transition = "transform 0.2s";
             overlay.style.zIndex = "100";
          }
        });

        kakao.maps.event.addListener(clustererRef.current, 'clusterout', (cluster: any) => {
          const overlay = cluster.getClusterMarker().getContent();
          if (overlay && overlay.style) {
             overlay.style.transform = "scale(1)";
             overlay.style.zIndex = "0";
          }
        });

        kakao.maps.event.addListener(clustererRef.current, 'clusterclick', (cluster: any) => {
          const markers = cluster.getMarkers();
          const ids = markers.flatMap((m: any) => {
             const pos = m.getPosition();
             return dbVacanciesRef.current.filter((v: any) => Math.abs(v.lat - pos.getLat()) < 0.00001 && Math.abs(v.lng - pos.getLng()) < 0.00001).map((v: any) => String(v.id));
          });
          setSelectedClusterIds(Array.from(new Set(ids)));
          setShowDetail(false);
        });

        kakao.maps.event.addListener(clustererRef.current, 'clustered', (clusters: any[]) => {
           if (!selectedClusterIdsRef.current || selectedClusterIdsRef.current.length === 0) return;
           clusters.forEach(cluster => {
              const markers = cluster.getMarkers();
              if (markers.length < 2) return;
              const ids = markers.flatMap((m: any) => {
                 const pos = m.getPosition();
                 return dbVacanciesRef.current.filter((v: any) => Math.abs(v.lat - pos.getLat()) < 0.00001 && Math.abs(v.lng - pos.getLng()) < 0.00001).map((v: any) => String(v.id));
              });
              const isMatch = ids.some((id: any) => id && selectedClusterIdsRef.current?.includes(id));
              if (isMatch) {
                 const overlay = cluster.getClusterMarker().getContent();
                 if (overlay && overlay.style) {
                     overlay.style.background = '#ffffff';
                     overlay.style.color = '#4b89ff';
                     overlay.style.border = '2px solid #4b89ff';
                     overlay.style.zIndex = '999';
                 }
              }
           });
        });
    }


    // Clear existing markers
    if (clustererRef.current) clustererRef.current.clear();
    markersRef.current = [];
    markerIdMapRef.current.clear();

    const newMarkers: any[] = [];
    filteredVacancies.forEach(prop => {
      if (!prop.lat || !prop.lng) return;
      const position = new kakao.maps.LatLng(prop.lat, prop.lng);

      const size = 42;
      const strId = String(prop.id);
      const isSelected = selectedClusterIdsRef.current?.includes(strId) || String(activeProperty) === strId;
      
      const normalSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="%234b89ff" stroke="white" stroke-width="2"/><text x="50%25" y="50%25" dy="1px" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="16" font-weight="bold" font-family="sans-serif">1</text></svg>`;
      const activeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="white" stroke="%234b89ff" stroke-width="2"/><text x="50%25" y="50%25" dy="1px" text-anchor="middle" dominant-baseline="middle" fill="%234b89ff" font-size="16" font-weight="bold" font-family="sans-serif">1</text></svg>`;
      const svgStr = isSelected ? activeSvg : normalSvg;
      
      const markerImage = new kakao.maps.MarkerImage(
        `data:image/svg+xml,${svgStr}`,
        new kakao.maps.Size(size, size),
        { offset: new kakao.maps.Point(size / 2, size / 2) }
      );

      const hoverSize = 48;
      const hoverSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${hoverSize}" height="${hoverSize}"><circle cx="${hoverSize/2}" cy="${hoverSize/2}" r="${hoverSize/2 - 2}" fill="%234b89ff" stroke="white" stroke-width="2"/><text x="50%25" y="50%25" dy="1px" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="17" font-weight="bold" font-family="sans-serif">1</text></svg>`;
      const hoverImage = new kakao.maps.MarkerImage(
        `data:image/svg+xml,${hoverSvg}`,
        new kakao.maps.Size(hoverSize, hoverSize),
        { offset: new kakao.maps.Point(hoverSize / 2, hoverSize / 2) }
      );

      const marker = new kakao.maps.Marker({ position, image: markerImage, title: strId });
      markerIdMapRef.current.set(marker, strId);

      kakao.maps.event.addListener(marker, 'mouseover', () => {
        marker.setImage(hoverImage);
        marker.setZIndex(100);
      });
      kakao.maps.event.addListener(marker, 'mouseout', () => {
        const currentSelected = selectedClusterIdsRef.current?.includes(strId) || String(activeProperty) === strId;
        const updatedNormal = currentSelected ? activeSvg : normalSvg;
        marker.setImage(new kakao.maps.MarkerImage(`data:image/svg+xml,${updatedNormal}`, new kakao.maps.Size(size, size), { offset: new kakao.maps.Point(size/2, size/2) }));
        marker.setZIndex(currentSelected ? 99 : 0);
      });

      kakao.maps.event.addListener(marker, 'click', () => {
        setSelectedClusterIds([strId]);
        setShowDetail(false);
      });

      newMarkers.push(marker);
      markersRef.current.push(marker);
    });

    if (clustererRef.current && newMarkers.length > 0) {
      clustererRef.current.addMarkers(newMarkers);
    }

  }, [filteredVacancies, showArticleOnMap, activeProperty, mapLoaded]);

  const formatAmount = (amt: number) => {
    if (!amt) return "";
    const manwon = Math.round(amt / 10000);
    if (manwon >= 10000) {
      const eok = Math.floor(manwon / 10000);
      const rest = manwon % 10000;
      return `${eok}억${rest ? ` ${rest}` : ""}`;
    }
    return `${manwon}만`;
  };

  const getPriceText = (row: any) => {
    if (!row) return "";
    const monthlyManwon = row.monthly_rent ? Math.round(row.monthly_rent / 10000) : 0;
    return row.trade_type === "매매" ? `매매 ${formatAmount(row.deposit)}`
      : row.trade_type === "전세" ? `전세 ${formatAmount(row.deposit)}`
      : `${formatAmount(row.deposit)}/${monthlyManwon}만`;
  };

  const config = CATEGORY_CONFIG[activeCategory];
  const isOfficePill = (p: string) => p.includes("오피스텔");

  const resetAllFilters = () => {
    setFilterTradeTypes([]);
    setFilterPriceMin(null);
    setFilterPriceMax(null);
    setFilterAreaMin(null);
    setFilterAreaMax(null);
    setFilterMaintIdx(0);
    setFilterRoomCount(null);
    setFilterBathCount(null);
    setFilterDirection(null);
    setFilterYearMin(null);
    setFilterYearMax(null);
    setFilterUnitMin(null);
    setFilterUnitMax(null);
    setFilterFloor(null);
    setFilterSaleStage([]);
    setFilterSaleType([]);
    setFilterOptions([]);
    setActiveFilterDropdown(null);
  };

  const handleCategoryChange = (key: string) => {
    setActiveCategory(key);
    const c = CATEGORY_CONFIG[key];
    setActivePills(key === "wish" ? [] : [c.pills[0] || ""]);
    setShowDetail(false);
    setShowDetailFilters(false);
    resetAllFilters();
  };

  const togglePill = (p: string) => {
    setActivePills((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  const toggleTradeType = (t: string) => {
    setFilterTradeTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const hasActiveFilters = filterTradeTypes.length > 0 || filterPriceMin !== null || filterPriceMax !== null || filterAreaMin !== null || filterAreaMax !== null || filterMaintIdx > 0 || filterRoomCount !== null || filterBathCount !== null || filterDirection !== null || filterYearMin !== null || filterYearMax !== null || filterUnitMin !== null || filterUnitMax !== null;

  // 가격 표시 헬퍼
  const formatPriceLabel = (val: number | null) => {
    if (val === null) return "";
    if (val >= 100000000) return `${val / 100000000}억`;
    if (val >= 10000000) return `${val / 10000000}천`;
    return `${val / 10000}만`;
  };
  const priceFilterLabel = (filterPriceMin !== null || filterPriceMax !== null)
    ? `가격대 ${formatPriceLabel(filterPriceMin) || "~"}~${formatPriceLabel(filterPriceMax) || ""}`
    : "가격대";
  const areaFilterLabel = (filterAreaMin !== null || filterAreaMax !== null)
    ? `면적 ${filterAreaMin ? Math.round(filterAreaMin / 3.3) + "평" : "~"}~${filterAreaMax ? Math.round(filterAreaMax / 3.3) + "평" : ""}`
    : "면적";
  const yearFilterLabel = (filterYearMin !== null || filterYearMax !== null)
    ? `사용승인일 ${filterYearMin || "~"}~${filterYearMax || ""}`
    : "사용승인일";
  const unitFilterLabel = (filterUnitMin !== null || filterUnitMax !== null)
    ? `세대수 ${filterUnitMin || "~"}~${filterUnitMax || ""}`
    : "세대수";

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Pretendard', sans-serif" }}>
      {/* ===== 상단 필터 바 ===== */}
      <div style={{ background: "#fff", width: "100%", zIndex: 200, position: "relative", borderBottom: "1px solid #ccc", flexShrink: 0 }}>
        {/* Tier 1: 메인 탭 */}
        <div style={{ display: "flex", gap: 24, padding: "0 20px", borderBottom: "1px solid #ddd", alignItems: "center", overflowX: "auto" }}>
          <Link href="/" style={{ marginRight: 15, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
            <img src="/logo.png" alt="공실뉴스" style={{ height: 34 }} onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/100x34?text=LOGO"; }} />
          </Link>
          <span style={{ fontSize: 26, fontWeight: 800, color: "#111", marginRight: 20, whiteSpace: "nowrap" }}>공실열람</span>
          {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
            <button key={key} onClick={() => handleCategoryChange(key)} style={{ background: "none", border: "none", fontSize: 16, fontWeight: "bold", color: activeCategory === key ? "#1a73e8" : "#555", cursor: "pointer", padding: "16px 4px", position: "relative", whiteSpace: "nowrap", borderBottom: activeCategory === key ? "3px solid #1a73e8" : "3px solid transparent", fontFamily: "inherit" }}>
              {cfg.name}
            </button>
          ))}
          <MapTopAuthButtons />
        </div>

        {/* Tier 2: 서브 필터(Pills + 드롭다운) */}
        {activeCategory !== "wish" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderBottom: "1px solid #e0e0e0", overflowX: "visible" }}>
            {config.pills.map((p) => (
              <button key={p} onClick={() => togglePill(p)} style={{
                background: activePills.includes(p) ? (isOfficePill(p) ? "#111" : "#e8f0fe") : "#fff",
                border: `1px solid ${activePills.includes(p) ? (isOfficePill(p) ? "#111" : "#1a73e8") : "#ccc"}`,
                fontSize: 13, color: activePills.includes(p) ? (isOfficePill(p) ? "#fff" : "#1a73e8") : "#333",
                cursor: "pointer", padding: "6px 14px",
                borderRadius: isOfficePill(p) ? 4 : 20,
                whiteSpace: "nowrap", fontWeight: activePills.includes(p) ? "bold" : "normal", fontFamily: "inherit", flexShrink: 0
              }}>
                {activePills.includes(p) && !isOfficePill(p) ? `✓ ${p}` : p}
              </button>
            ))}
            <div style={{ width: 1, height: 16, background: "#e0e0e0", margin: "0 8px", flexShrink: 0 }}></div>
            {config.basicFilters.map((f) => {
              const isFilterActive = (
                (f === "거래방식" && filterTradeTypes.length > 0) ||
                ((f === "가격대" || f === "분양가/보증금") && (filterPriceMin !== null || filterPriceMax !== null)) ||
                (f === "면적" && (filterAreaMin !== null || filterAreaMax !== null)) ||
                (f === "관리비" && filterMaintIdx > 0) ||
                (f === "방/욕실수" && (filterRoomCount !== null || filterBathCount !== null)) ||
                (f === "방향" && filterDirection !== null) ||
                (f === "사용승인일" && (filterYearMin !== null || filterYearMax !== null)) ||
                (f === "세대수" && (filterUnitMin !== null || filterUnitMax !== null)) ||
                (f === "층수" && filterFloor !== null) ||
                (f === "분양단계" && filterSaleStage.length > 0) ||
                (f === "분양형태" && filterSaleType.length > 0) ||
                (f === "기타옵션" && filterOptions.length > 0)
              );
              const btnLabel = (f === "가격대" || f === "분양가/보증금") ? priceFilterLabel : f === "면적" ? areaFilterLabel : f === "사용승인일" ? yearFilterLabel : f === "세대수" ? unitFilterLabel : f;

              return (
              <div key={f} style={{ position: "relative" }}>
                <button 
                  onClick={() => setActiveFilterDropdown(activeFilterDropdown === f ? null : f)}
                  style={{ background: isFilterActive ? "#fff" : "#fff", border: `1px solid ${isFilterActive ? "#1a73e8" : "#ccc"}`, fontSize: 13, color: isFilterActive ? "#1a73e8" : "#555", fontWeight: isFilterActive || activeFilterDropdown === f ? "bold" : "normal", cursor: "pointer", padding: "6px 14px", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", borderRadius: 4, flexShrink: 0, fontFamily: "inherit" }}>
                  {btnLabel} <span style={{ fontSize: 10, marginLeft: 2 }}>▼</span>
                </button>

                {/* ── 거래방식 ── */}
                {f === "거래방식" && activeFilterDropdown === "거래방식" && (
                  <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#fff", border: "1px solid #ddd", borderRadius: 4, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", width: 240, zIndex: 9000, padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <span style={{ fontSize: 15, fontWeight: "bold", color: "#111" }}>거래방식</span>
                      <button onClick={() => setActiveFilterDropdown(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#999", padding: 0, lineHeight: 1 }}>✕</button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {["매매", "전세", "월세", "단기임대"].map(type => (
                        <label key={type} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: "#333" }}>
                          <input type="checkbox" checked={filterTradeTypes.includes(type)} onChange={() => toggleTradeType(type)} style={{ width: 18, height: 18, accentColor: "#1a73e8", cursor: "pointer" }} />
                          {type}
                        </label>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: "#999", marginTop: 14, display: "flex", alignItems: "center", gap: 4 }}>
                      <span>ⓘ</span> 중복선택이 가능합니다.
                    </div>
                  </div>
                )}

                {/* ── 가격대 (네이버 스타일 그리드) ── */}
                {(f === "가격대" || f === "분양가/보증금") && activeFilterDropdown === f && (
                  <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#fff", border: "1px solid #ddd", borderRadius: 4, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", width: 380, zIndex: 9000, padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ fontSize: 15, fontWeight: "bold", color: "#111" }}>매매가/전세가/보증금</span>
                      <button onClick={() => setActiveFilterDropdown(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#999", padding: 0, lineHeight: 1 }}>✕</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, marginBottom: 12 }}>
                      {PRICE_GRID.map((p, idx) => {
                        const isMin = filterPriceMin === p.val;
                        const isMax = filterPriceMax === p.val || (p.val === -1 && filterPriceMax === null && filterPriceMin !== null);
                        const isInRange = filterPriceMin !== null && filterPriceMax !== null && p.val >= filterPriceMin && p.val <= filterPriceMax && p.val !== -1;
                        const isActive = isMin || isMax || isInRange;
                        return (
                          <button key={idx} onClick={() => {
                            if (filterPriceMin === null) { setFilterPriceMin(p.val === -1 ? 3000000000 : p.val); }
                            else if (filterPriceMax === null) {
                              const maxVal = p.val === -1 ? null : p.val;
                              if (maxVal !== null && maxVal < filterPriceMin) { setFilterPriceMax(filterPriceMin); setFilterPriceMin(maxVal); }
                              else { setFilterPriceMax(maxVal); }
                            } else { setFilterPriceMin(p.val === -1 ? 3000000000 : p.val); setFilterPriceMax(null); }
                          }}
                          style={{ padding: "8px 4px", border: `1px solid ${isActive ? "#1a73e8" : "#e0e0e0"}`, borderRadius: 2, background: isActive ? "#e8f0fe" : "#fff", fontSize: 13, color: isActive ? "#1a73e8" : "#333", cursor: "pointer", fontWeight: isActive ? "bold" : "normal", textAlign: "center" }}>
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", border: "1px solid #ddd", borderRadius: 4, overflow: "hidden" }}>
                        <button onClick={() => setFilterPriceMin(prev => prev ? Math.max(0, prev - 10000000) : null)} style={{ padding: "6px 10px", background: "#f5f5f5", border: "none", cursor: "pointer", fontSize: 14 }}>−</button>
                        <input
                          type="number"
                          placeholder="최소"
                          value={filterPriceMin !== null ? Math.round(filterPriceMin / 10000) : ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "" || v === "0") { setFilterPriceMin(null); }
                            else { setFilterPriceMin(parseInt(v, 10) * 10000); }
                          }}
                          style={{ flex: 1, textAlign: "center", fontSize: 13, padding: "6px 4px", border: "none", outline: "none", width: 60, color: "#111", background: "transparent" }}
                        />
                        <button onClick={() => setFilterPriceMin(prev => (prev || 0) + 10000000)} style={{ padding: "6px 10px", background: "#f5f5f5", border: "none", cursor: "pointer", fontSize: 14 }}>+</button>
                      </div>
                      <span style={{ color: "#999", fontSize: 13 }}>~</span>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", border: "1px solid #ddd", borderRadius: 4, overflow: "hidden" }}>
                        <button onClick={() => setFilterPriceMax(prev => prev ? Math.max(0, prev - 10000000) : null)} style={{ padding: "6px 10px", background: "#f5f5f5", border: "none", cursor: "pointer", fontSize: 14 }}>−</button>
                        <input
                          type="number"
                          placeholder="최대"
                          value={filterPriceMax !== null ? Math.round(filterPriceMax / 10000) : ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "" || v === "0") { setFilterPriceMax(null); }
                            else { setFilterPriceMax(parseInt(v, 10) * 10000); }
                          }}
                          style={{ flex: 1, textAlign: "center", fontSize: 13, padding: "6px 4px", border: "none", outline: "none", width: 60, color: "#111", background: "transparent" }}
                        />
                        <button onClick={() => setFilterPriceMax(prev => (prev || 0) + 10000000)} style={{ padding: "6px 10px", background: "#f5f5f5", border: "none", cursor: "pointer", fontSize: 14 }}>+</button>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "#aaa", marginBottom: 10, textAlign: "center" }}>
                      직접 입력: 만원 단위 (예: 1억 = 10000, 5천만 = 5000)
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <button onClick={() => { setFilterPriceMin(null); setFilterPriceMax(null); }} style={{ background: "none", border: "none", fontSize: 13, color: "#888", cursor: "pointer" }}>⟲ 조건삭제</button>
                    </div>
                  </div>
                )}

                {/* ── 면적 (네이버 스타일 그리드) ── */}
                {f === "면적" && activeFilterDropdown === "면적" && (
                  <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#fff", border: "1px solid #ddd", borderRadius: 4, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", width: 360, zIndex: 9000, padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ fontSize: 15, fontWeight: "bold", color: "#111" }}>면적</span>
                      <button onClick={() => setActiveFilterDropdown(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#999", padding: 0, lineHeight: 1 }}>✕</button>
                    </div>
                    <div style={{ fontSize: 13, color: "#1a73e8", textAlign: "center", marginBottom: 8, fontWeight: "bold" }}>
                      {filterAreaMin || filterAreaMax ? `${filterAreaMin ? Math.round(filterAreaMin / 3.3) + "평" : "~"} ~ ${filterAreaMax ? Math.round(filterAreaMax / 3.3) + "평" : ""}` : "전체 면적"}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginBottom: 12 }}>
                      {AREA_GRID.map((a, idx) => {
                        const isActive = (filterAreaMin === a.m2) || (filterAreaMax === a.m2) || (filterAreaMin !== null && filterAreaMax !== null && a.m2 >= filterAreaMin && a.m2 <= filterAreaMax && a.m2 !== -1);
                        return (
                          <button key={idx} onClick={() => {
                            if (a.m2 === -1) { setFilterAreaMin(1650); setFilterAreaMax(null); return; }
                            if (filterAreaMin === null) { setFilterAreaMin(a.m2); }
                            else if (filterAreaMax === null) {
                              if (a.m2 < filterAreaMin) { setFilterAreaMax(filterAreaMin); setFilterAreaMin(a.m2); }
                              else { setFilterAreaMax(a.m2); }
                            } else { setFilterAreaMin(a.m2); setFilterAreaMax(null); }
                          }}
                          style={{ padding: "8px 4px", border: `1px solid ${isActive ? "#1a73e8" : "#e0e0e0"}`, borderRadius: 2, background: isActive ? "#e8f0fe" : "#fff", fontSize: 13, color: isActive ? "#1a73e8" : "#333", cursor: "pointer", fontWeight: isActive ? "bold" : "normal", textAlign: "center" }}>
                            {a.label}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", border: "1px solid #ddd", borderRadius: 4, overflow: "hidden" }}>
                        <input
                          type="number"
                          placeholder="최소"
                          value={filterAreaMin !== null ? Math.round(filterAreaMin / 3.3) : ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "" || v === "0") { setFilterAreaMin(null); }
                            else { setFilterAreaMin(Math.round(parseInt(v, 10) * 3.3)); }
                          }}
                          style={{ flex: 1, textAlign: "center", fontSize: 13, padding: "8px 4px", border: "none", outline: "none", width: 60, color: "#111" }}
                        />
                      </div>
                      <span style={{ color: "#999", fontSize: 13 }}>~</span>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", border: "1px solid #ddd", borderRadius: 4, overflow: "hidden" }}>
                        <input
                          type="number"
                          placeholder="최대"
                          value={filterAreaMax !== null ? Math.round(filterAreaMax / 3.3) : ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "" || v === "0") { setFilterAreaMax(null); }
                            else { setFilterAreaMax(Math.round(parseInt(v, 10) * 3.3)); }
                          }}
                          style={{ flex: 1, textAlign: "center", fontSize: 13, padding: "8px 4px", border: "none", outline: "none", width: 60, color: "#111" }}
                        />
                      </div>
                      <span style={{ fontSize: 12, color: "#888", flexShrink: 0 }}>평</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <button onClick={() => { setFilterAreaMin(null); setFilterAreaMax(null); }} style={{ background: "none", border: "none", fontSize: 13, color: "#888", cursor: "pointer" }}>⟲ 조건삭제</button>
                    </div>
                  </div>
                )}

                {/* ── 관리비 ── */}
                {f === "관리비" && activeFilterDropdown === "관리비" && (
                  <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#fff", border: "1px solid #ddd", borderRadius: 4, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", width: 220, zIndex: 9000, padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ fontSize: 15, fontWeight: "bold", color: "#111" }}>관리비</span>
                      <button onClick={() => setActiveFilterDropdown(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#999", padding: 0, lineHeight: 1 }}>✕</button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {MAINT_PRESETS.map((m, idx) => (
                        <label key={idx} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: filterMaintIdx === idx ? "#1a73e8" : "#333", fontWeight: filterMaintIdx === idx ? "bold" : "normal" }}>
                          <input type="radio" name="maintFilter" checked={filterMaintIdx === idx} onChange={() => setFilterMaintIdx(idx)} style={{ accentColor: "#1a73e8", cursor: "pointer" }} />
                          {m.label}
                        </label>
                      ))}
                    </div>
                    <div style={{ textAlign: "right", marginTop: 10 }}>
                      <button onClick={() => { setFilterMaintIdx(0); }} style={{ background: "none", border: "none", fontSize: 13, color: "#888", cursor: "pointer" }}>⟲ 조건삭제</button>
                    </div>
                  </div>
                )}

                {/* ── 방/욕실수 ── */}
                {f === "방/욕실수" && activeFilterDropdown === "방/욕실수" && (
                  <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#fff", border: "1px solid #ddd", borderRadius: 4, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", width: 280, zIndex: 9000, padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <span style={{ fontSize: 15, fontWeight: "bold", color: "#111" }}>방/욕실수</span>
                      <button onClick={() => setActiveFilterDropdown(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#999", padding: 0, lineHeight: 1 }}>✕</button>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: "bold", color: "#555", marginBottom: 8 }}>방 개수</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                      <button onClick={() => setFilterRoomCount(null)} style={{ padding: "6px 14px", borderRadius: 4, border: filterRoomCount === null ? "1px solid #1a73e8" : "1px solid #e0e0e0", background: filterRoomCount === null ? "#e8f0fe" : "#fff", fontSize: 13, color: filterRoomCount === null ? "#1a73e8" : "#555", cursor: "pointer", fontWeight: filterRoomCount === null ? "bold" : "normal" }}>전체</button>
                      {[1,2,3,4,5].map(n => (
                        <button key={n} onClick={() => setFilterRoomCount(n)} style={{ padding: "6px 14px", borderRadius: 4, border: filterRoomCount === n ? "1px solid #1a73e8" : "1px solid #e0e0e0", background: filterRoomCount === n ? "#e8f0fe" : "#fff", fontSize: 13, color: filterRoomCount === n ? "#1a73e8" : "#555", cursor: "pointer", fontWeight: filterRoomCount === n ? "bold" : "normal" }}>{n}개+</button>
                      ))}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: "bold", color: "#555", marginBottom: 8 }}>욕실 수</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button onClick={() => setFilterBathCount(null)} style={{ padding: "6px 14px", borderRadius: 4, border: filterBathCount === null ? "1px solid #1a73e8" : "1px solid #e0e0e0", background: filterBathCount === null ? "#e8f0fe" : "#fff", fontSize: 13, color: filterBathCount === null ? "#1a73e8" : "#555", cursor: "pointer", fontWeight: filterBathCount === null ? "bold" : "normal" }}>전체</button>
                      {[1,2,3].map(n => (
                        <button key={n} onClick={() => setFilterBathCount(n)} style={{ padding: "6px 14px", borderRadius: 4, border: filterBathCount === n ? "1px solid #1a73e8" : "1px solid #e0e0e0", background: filterBathCount === n ? "#e8f0fe" : "#fff", fontSize: 13, color: filterBathCount === n ? "#1a73e8" : "#555", cursor: "pointer", fontWeight: filterBathCount === n ? "bold" : "normal" }}>{n}개+</button>
                      ))}
                    </div>
                    <div style={{ textAlign: "right", marginTop: 12 }}>
                      <button onClick={() => { setFilterRoomCount(null); setFilterBathCount(null); }} style={{ background: "none", border: "none", fontSize: 13, color: "#888", cursor: "pointer" }}>⟲ 조건삭제</button>
                    </div>
                  </div>
                )}

                {/* ── 방향 ── */}
                {f === "방향" && activeFilterDropdown === "방향" && (
                  <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#fff", border: "1px solid #ddd", borderRadius: 4, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", width: 280, zIndex: 9000, padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ fontSize: 15, fontWeight: "bold", color: "#111" }}>방향</span>
                      <button onClick={() => setActiveFilterDropdown(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#999", padding: 0, lineHeight: 1 }}>✕</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                      <button onClick={() => setFilterDirection(null)} style={{ padding: "8px", borderRadius: 4, border: filterDirection === null ? "1px solid #1a73e8" : "1px solid #e0e0e0", background: filterDirection === null ? "#e8f0fe" : "#fff", fontSize: 13, color: filterDirection === null ? "#1a73e8" : "#555", cursor: "pointer", fontWeight: filterDirection === null ? "bold" : "normal" }}>전체</button>
                      {["남향", "남동향", "남서향", "동향", "서향", "북향", "북동향", "북서향"].map(d => (
                        <button key={d} onClick={() => setFilterDirection(d)} style={{ padding: "8px", borderRadius: 4, border: filterDirection === d ? "1px solid #1a73e8" : "1px solid #e0e0e0", background: filterDirection === d ? "#e8f0fe" : "#fff", fontSize: 13, color: filterDirection === d ? "#1a73e8" : "#555", cursor: "pointer", fontWeight: filterDirection === d ? "bold" : "normal" }}>{d}</button>
                      ))}
                    </div>
                    <div style={{ textAlign: "right", marginTop: 10 }}>
                      <button onClick={() => setFilterDirection(null)} style={{ background: "none", border: "none", fontSize: 13, color: "#888", cursor: "pointer" }}>⟲ 조건삭제</button>
                    </div>
                  </div>
                )}

                {/* ── 사용승인일 (연도 그리드 선택) ── */}
                {f === "사용승인일" && activeFilterDropdown === "사용승인일" && (
                  <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#fff", border: "1px solid #ddd", borderRadius: 4, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", width: 380, zIndex: 9000, padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ fontSize: 15, fontWeight: "bold", color: "#111" }}>사용승인일</span>
                      <button onClick={() => setActiveFilterDropdown(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#999", padding: 0, lineHeight: 1 }}>✕</button>
                    </div>
                    <div style={{ fontSize: 13, color: "#1a73e8", textAlign: "center", marginBottom: 8, fontWeight: "bold" }}>
                      {filterYearMin || filterYearMax ? `${filterYearMin || "~"}년 ~ ${filterYearMax || ""}년` : "전체 연도"}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginBottom: 12 }}>
                      {YEAR_GRID.map((a, idx) => {
                        const isActive = (filterYearMin === a.val) || (filterYearMax === a.val) || (filterYearMin !== null && filterYearMax !== null && a.val >= filterYearMin && a.val <= filterYearMax);
                        return (
                          <button key={idx} onClick={() => {
                            if (filterYearMin === null) { setFilterYearMin(a.val); }
                            else if (filterYearMax === null) {
                              if (a.val < filterYearMin) { setFilterYearMax(filterYearMin); setFilterYearMin(a.val); }
                              else { setFilterYearMax(a.val); }
                            } else { setFilterYearMin(a.val); setFilterYearMax(null); }
                          }}
                          style={{ padding: "8px 4px", border: `1px solid ${isActive ? "#1a73e8" : "#e0e0e0"}`, borderRadius: 2, background: isActive ? "#e8f0fe" : "#fff", fontSize: 13, color: isActive ? "#1a73e8" : "#333", cursor: "pointer", fontWeight: isActive ? "bold" : "normal", textAlign: "center" }}>
                            {a.label}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", border: "1px solid #ddd", borderRadius: 4, overflow: "hidden" }}>
                        <input
                          type="number"
                          placeholder="최소(년)"
                          value={filterYearMin !== null ? filterYearMin : ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "") { setFilterYearMin(null); }
                            else { setFilterYearMin(parseInt(v, 10)); }
                          }}
                          style={{ flex: 1, textAlign: "center", fontSize: 13, padding: "8px 4px", border: "none", outline: "none", width: 60, color: "#111" }}
                        />
                      </div>
                      <span style={{ color: "#999", fontSize: 13 }}>~</span>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", border: "1px solid #ddd", borderRadius: 4, overflow: "hidden" }}>
                        <input
                          type="number"
                          placeholder="최대(년)"
                          value={filterYearMax !== null ? filterYearMax : ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "") { setFilterYearMax(null); }
                            else { setFilterYearMax(parseInt(v, 10)); }
                          }}
                          style={{ flex: 1, textAlign: "center", fontSize: 13, padding: "8px 4px", border: "none", outline: "none", width: 60, color: "#111" }}
                        />
                      </div>
                      <span style={{ fontSize: 12, color: "#888", flexShrink: 0 }}>년</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <button onClick={() => { setFilterYearMin(null); setFilterYearMax(null); }} style={{ background: "none", border: "none", fontSize: 13, color: "#888", cursor: "pointer" }}>⟲ 조건삭제</button>
                    </div>
                  </div>
                )}

                {/* ── 세대수 (그리드 선택) ── */}
                {f === "세대수" && activeFilterDropdown === "세대수" && (
                  <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#fff", border: "1px solid #ddd", borderRadius: 4, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", width: 380, zIndex: 9000, padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ fontSize: 15, fontWeight: "bold", color: "#111" }}>세대수</span>
                      <button onClick={() => setActiveFilterDropdown(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#999", padding: 0, lineHeight: 1 }}>✕</button>
                    </div>
                    <div style={{ fontSize: 13, color: "#1a73e8", textAlign: "center", marginBottom: 8, fontWeight: "bold" }}>
                      {filterUnitMin || filterUnitMax ? `${filterUnitMin || "~"} ~ ${filterUnitMax || ""}세대` : "전체 세대수"}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginBottom: 12 }}>
                      {UNIT_GRID.map((u, idx) => {
                        const isActive = (filterUnitMin === u.val) || (filterUnitMax === u.val) || (filterUnitMin !== null && filterUnitMax !== null && u.val >= filterUnitMin && u.val <= filterUnitMax);
                        return (
                          <button key={idx} onClick={() => {
                            if (filterUnitMin === null) { setFilterUnitMin(u.val); }
                            else if (filterUnitMax === null) {
                              if (u.val < filterUnitMin) { setFilterUnitMax(filterUnitMin); setFilterUnitMin(u.val); }
                              else { setFilterUnitMax(u.val); }
                            } else { setFilterUnitMin(u.val); setFilterUnitMax(null); }
                          }}
                          style={{ padding: "8px 4px", border: `1px solid ${isActive ? "#1a73e8" : "#e0e0e0"}`, borderRadius: 2, background: isActive ? "#e8f0fe" : "#fff", fontSize: 13, color: isActive ? "#1a73e8" : "#333", cursor: "pointer", fontWeight: isActive ? "bold" : "normal", textAlign: "center" }}>
                            {u.label}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", border: "1px solid #ddd", borderRadius: 4, overflow: "hidden" }}>
                        <input
                          type="number"
                          placeholder="최소"
                          value={filterUnitMin !== null ? filterUnitMin : ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "" || v === "0") { setFilterUnitMin(null); }
                            else { setFilterUnitMin(parseInt(v, 10)); }
                          }}
                          style={{ flex: 1, textAlign: "center", fontSize: 13, padding: "8px 4px", border: "none", outline: "none", width: 60, color: "#111" }}
                        />
                      </div>
                      <span style={{ color: "#999", fontSize: 13 }}>~</span>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", border: "1px solid #ddd", borderRadius: 4, overflow: "hidden" }}>
                        <input
                          type="number"
                          placeholder="최대"
                          value={filterUnitMax !== null ? filterUnitMax : ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "" || v === "0") { setFilterUnitMax(null); }
                            else { setFilterUnitMax(parseInt(v, 10)); }
                          }}
                          style={{ flex: 1, textAlign: "center", fontSize: 13, padding: "8px 4px", border: "none", outline: "none", width: 60, color: "#111" }}
                        />
                      </div>
                      <span style={{ fontSize: 12, color: "#888", flexShrink: 0 }}>세대</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <button onClick={() => { setFilterUnitMin(null); setFilterUnitMax(null); }} style={{ background: "none", border: "none", fontSize: 13, color: "#888", cursor: "pointer" }}>⟲ 조건삭제</button>
                    </div>
                  </div>
                )}

                {/* ── 층수 (라디오 선택) ── */}
                {f === "층수" && activeFilterDropdown === "층수" && (
                  <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#fff", border: "1px solid #ddd", borderRadius: 4, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", width: 200, zIndex: 9000, padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <span style={{ fontSize: 15, fontWeight: "bold", color: "#111" }}>층수</span>
                      <button onClick={() => setActiveFilterDropdown(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#999", padding: 0, lineHeight: 1 }}>✕</button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {[{ label: "전체", val: null }, { label: "1층", val: "1층" }, { label: "저층", val: "저층" }, { label: "중간층", val: "중간층" }, { label: "고층", val: "고층" }, { label: "탑층", val: "탑층" }].map((opt) => (
                        <label key={opt.label} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, color: filterFloor === opt.val ? "#1a73e8" : "#333", fontWeight: filterFloor === opt.val ? "bold" : "normal" }}>
                          <input type="radio" name="floorFilter" checked={filterFloor === opt.val} onChange={() => setFilterFloor(opt.val)} style={{ accentColor: "#1a73e8", cursor: "pointer" }} />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── 분양단계 (체크박스) ── */}
                {f === "분양단계" && activeFilterDropdown === "분양단계" && (
                  <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#fff", border: "1px solid #ddd", borderRadius: 4, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", width: 220, zIndex: 9000, padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <span style={{ fontSize: 15, fontWeight: "bold", color: "#111" }}>분양단계</span>
                      <button onClick={() => setActiveFilterDropdown(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#999", padding: 0, lineHeight: 1 }}>✕</button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, color: filterSaleStage.length === 0 ? "#1a73e8" : "#333", fontWeight: filterSaleStage.length === 0 ? "bold" : "normal" }}>
                        <input type="checkbox" checked={filterSaleStage.length === 0} onChange={() => setFilterSaleStage([])} style={{ accentColor: "#1a73e8", cursor: "pointer" }} />
                        전체
                      </label>
                      {["분양중", "청약중", "분양계획"].map((s) => (
                        <label key={s} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, color: filterSaleStage.includes(s) ? "#1a73e8" : "#333", fontWeight: filterSaleStage.includes(s) ? "bold" : "normal" }}>
                          <input type="checkbox" checked={filterSaleStage.includes(s)} onChange={() => setFilterSaleStage(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])} style={{ accentColor: "#1a73e8", cursor: "pointer" }} />
                          {s}
                        </label>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: "#aaa", marginTop: 10 }}>ⓘ 중복선택이 가능합니다.</div>
                  </div>
                )}

                {/* ── 분양형태 (체크박스) ── */}
                {f === "분양형태" && activeFilterDropdown === "분양형태" && (
                  <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#fff", border: "1px solid #ddd", borderRadius: 4, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", width: 220, zIndex: 9000, padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <span style={{ fontSize: 15, fontWeight: "bold", color: "#111" }}>분양형태</span>
                      <button onClick={() => setActiveFilterDropdown(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#999", padding: 0, lineHeight: 1 }}>✕</button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, color: filterSaleType.length === 0 ? "#1a73e8" : "#333", fontWeight: filterSaleType.length === 0 ? "bold" : "normal" }}>
                        <input type="checkbox" checked={filterSaleType.length === 0} onChange={() => setFilterSaleType([])} style={{ accentColor: "#1a73e8", cursor: "pointer" }} />
                        전체
                      </label>
                      {["민간분양", "공공분양", "임대분양"].map((t) => (
                        <label key={t} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, color: filterSaleType.includes(t) ? "#1a73e8" : "#333", fontWeight: filterSaleType.includes(t) ? "bold" : "normal" }}>
                          <input type="checkbox" checked={filterSaleType.includes(t)} onChange={() => setFilterSaleType(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])} style={{ accentColor: "#1a73e8", cursor: "pointer" }} />
                          {t}
                        </label>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: "#aaa", marginTop: 10 }}>ⓘ 중복선택이 가능합니다.</div>
                  </div>
                )}

                {/* ── 기타옵션 (카테고리별 다이나믹) ── */}
                {f === "기타옵션" && activeFilterDropdown === "기타옵션" && (
                  <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#fff", border: "1px solid #ddd", borderRadius: 4, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", width: 320, zIndex: 9000, padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <span style={{ fontSize: 15, fontWeight: "bold", color: "#111" }}>옵션</span>
                      <button onClick={() => setActiveFilterDropdown(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#999", padding: 0, lineHeight: 1 }}>✕</button>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                      {(() => {
                        let opts = ["주차", "엘리베이터"];
                        if (activeCategory === "apart" || activeCategory === "one") {
                          opts = ["에어컨", "세탁기", "냉장고", "가스렌지", "전자렌지", "침대", "옷장", "TV", "신발장", "비데", "도어락"];
                        } else if (activeCategory === "biz") {
                          opts = ["냉난방기", "수도설비", "가스설비", "화물용승강기", "보안시스템"];
                        }
                        return opts.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => setFilterOptions(prev => prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt])}
                            style={{
                              padding: "6px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer",
                              border: filterOptions.includes(opt) ? "1px solid #1a73e8" : "1px solid #e0e0e0",
                              background: filterOptions.includes(opt) ? "#e8f0fe" : "#fff",
                              color: filterOptions.includes(opt) ? "#1a73e8" : "#555",
                              fontWeight: filterOptions.includes(opt) ? "bold" : "normal"
                            }}
                          >
                            {opt} {filterOptions.includes(opt) && "✓"}
                          </button>
                        ));
                      })()}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <button onClick={() => setFilterOptions([])} style={{ background: "none", border: "none", fontSize: 13, color: "#888", cursor: "pointer" }}>⟲ 조건삭제</button>
                    </div>
                  </div>
                )}
              </div>
              );
            })}
            {config.showToggle && (
              <button onClick={() => setShowDetailFilters(!showDetailFilters)} style={{ background: "none", border: "none", fontSize: 13, fontWeight: "bold", color: "#1a73e8", cursor: "pointer", padding: "8px 12px", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit" }}>
                {showDetailFilters ? "상세조건검색 닫기 ✕" : "상세매물검색 +"}
              </button>
            )}
            <button onClick={resetAllFilters} style={{ background: hasActiveFilters ? "#fff3f3" : "none", border: hasActiveFilters ? "1px solid #e74c3c" : "none", fontSize: 13, color: hasActiveFilters ? "#e74c3c" : "#666", fontWeight: hasActiveFilters ? "bold" : "normal", cursor: "pointer", padding: "6px 12px", whiteSpace: "nowrap", marginLeft: "auto", flexShrink: 0, fontFamily: "inherit", borderRadius: 20 }}>↻ 초기화</button>
          </div>
        )}

        {/* MY관심공실 전용 탭 (사이드바로 이동됨) */}

        {/* 상세 필터 행 */}
        {showDetailFilters && config.detailFilters.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderBottom: "1px solid #eee", overflowX: "auto", background: "#fff" }}>
            {config.detailFilters.map((f) => (
              <button key={f} style={{ background: "none", border: "none", fontSize: 13, color: "#555", cursor: "pointer", padding: "8px 12px", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", borderRadius: 4, flexShrink: 0, fontFamily: "inherit" }}>
                {f} <span style={{ fontSize: 10, color: "#999" }}>▼</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ===== 메인 3단 레이아웃 ===== */}
      <main style={{ display: "flex", flex: 1, minHeight: 0, position: "relative" }}>
        {/* 좌측 사이드바: 매물 리스트 (380px) */}
        <aside style={{ width: 380, minWidth: 380, height: "100%", background: "#fff", borderRight: "1px solid #eee", display: "flex", flexDirection: "column", zIndex: 20 }}>
          {activeCategory === "wish" ? (
            <>
              <div style={{ display: "flex", width: "100%" }}>
                {["찜한물건", "최근본물건"].map((tab) => {
                  const isTabActive = (tab === "찜한물건" && wishTab === "wish") || (tab === "최근본물건" && wishTab === "recent");
                  return (
                    <div key={tab} 
                      onClick={() => setWishTab(tab === "찜한물건" ? "wish" : "recent")}
                      style={{ flex: 1, padding: "14px 0", textAlign: "center", borderTop: "1px solid transparent", borderBottom: isTabActive ? "none" : "1px solid #e0e0e0", background: isTabActive ? "#1a73e8" : "#f5f5f5", fontSize: 14, cursor: "pointer", color: isTabActive ? "#fff" : "#666", fontWeight: isTabActive ? "bold" : "normal" }}
                    >
                      {tab}
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f5f5f5" }}>
                 <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#999" }}>
                    <span style={{ color: "#1a73e8", fontWeight: "bold", cursor: "pointer" }}>등록취소</span>
                    <span style={{ cursor: "pointer" }}>가나다순</span>
                    <span style={{ cursor: "pointer" }}>세대수순</span>
                    <span style={{ cursor: "pointer" }}>최근접수순</span>
                 </div>
                 <div style={{ fontSize: 12, color: "#999", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path></svg>
                    편집
                 </div>
              </div>
              <div style={{ padding: "15px 20px 5px", fontWeight: "bold", fontSize: 14, color: "#111" }}>
                현재 지도 화면 {displayVacancies.length}개
              </div>
            </>
          ) : (
            <div style={{ padding: "15px 20px", fontWeight: 800, fontSize: 15, color: "#111", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", flexShrink: 0 }}>
              <span>{selectedClusterIds && selectedClusterIds.length > 0 ? "선택된 공실" : "지도위의 공실"} {displayVacancies.length}개</span>
            </div>
          )}

          <div style={{ flex: 1, overflowY: "auto", padding: 0, background: "#fff" }}>
            {displayVacancies.length === 0 ? (
               <div style={{ padding: "60px 40px", textAlign: "center", color: "#888", fontSize: 14 }}>
                 {activeCategory === "wish" ? (wishTab === "wish" ? "현재 등록된 관심 매물이 없습니다." : "최근 본 매물이 없습니다.") : "조건에 맞는 매물이 없습니다."}
               </div>
            ) : displayVacancies.map((prop) => {
                const isActiveAndShowing = activeProperty === prop.id && showDetail;
                const addrText = [prop.dong, prop.building_name].filter(Boolean).join(" ");
                const priceText = getPriceText(prop);

                return (
                  <div key={prop.id} 
                    onClick={() => { 
                      if (isActiveAndShowing) {
                        setShowDetail(false);
                      } else {
                        setPrevPropertyId(null);
                        setActiveProperty(prop.id); 
                        setShowDetail(true); 
                        setActiveDetailTab("info"); 
                        setGalleryIndex(0); 
                        showArticleOnMap(prop);
                      }
                    }}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                      padding: "16px 20px 16px 16px", cursor: "pointer", transition: "background 0.2s, border-color 0.2s",
                      borderBottom: "1px solid #eee",
                      borderLeft: activeProperty === prop.id ? "4px solid #1a73e8" : "4px solid transparent",
                      background: activeProperty === prop.id ? "#eaf4ff" : "#fff",
                    }}>
                    <div style={{ flex: 1, paddingRight: prop.images?.[0] ? 15 : 0, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: "bold", color: "#111", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{addrText || "주소 없음"}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#1a73e8", marginBottom: 4 }}>{priceText}</div>
                      <div style={{ fontSize: 13, color: "#555", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {prop.property_type} <span style={{ color: "#ddd", margin: "0 4px" }}>|</span> {prop.direction || "방향없음"} <span style={{ color: "#ddd", margin: "0 4px" }}>|</span> {prop.exclusive_m2 ? `${prop.exclusive_m2}㎡` : "면적미상"}
                      </div>
                      <div style={{ fontSize: 12, color: "#666", marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {[`룸 ${prop.room_count || 0}개`, `욕실 ${prop.bathroom_count || 0}개`, ...(prop.options || [])].filter(Boolean).join(", ")}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto" }}>
                        <span style={{ display: "inline-block", fontSize: 12, color: "#fa5252", border: "1px solid #fa5252", padding: "1px 5px" }}>{prop.realtor_commission || prop.commission_type || "법정수수료"}</span>
                        <span style={{ fontSize: 13, color: "#fa5252", fontWeight: "bold" }}>{prop.vacancy_no}</span>
                        <span style={{ fontSize: 13, color: "#aaa" }}>{new Date(prop.created_at).toLocaleDateString('ko-KR', {year: 'numeric', month: '2-digit', day: '2-digit'}).replace(/\s/g, '')}</span>
                      </div>
                    </div>
                    {prop.images?.[0] && (
                      <div style={{ width: 110, height: 110, borderRadius: 6, overflow: "hidden", background: "#f0f0f0", flexShrink: 0, marginLeft: 5 }}>
                        <img src={prop.images[0]} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
        </aside>

        {/* 중앙: 매물 상세 패널 (600px) */}
        {showDetail && activeProperty && (
          () => {
            const baseProp = dbVacancies.find(v => v.id === activeProperty);
            if (!baseProp) return null;
            const fullProp = fullDetailsMap[activeProperty] || {};
            const prop = { ...baseProp, ...fullProp }; // Lazy-loaded fields overlay

            const images = prop.images && prop.images.length > 0 ? prop.images : [""];
            const tagColor = prop.commission_type === '공동수수료' ? "#2e7d32" : "#1a73e8";
            
            return (
          <div style={{ position: "absolute", left: 380, top: 0, width: 600, height: "100%", background: "#fff", display: "flex", flexDirection: "column", borderRight: "1px solid #eee", zIndex: 110, boxShadow: "5px 0 15px rgba(0,0,0,0.15)" }}>
            {/* 닫기 버튼 */}
            <button onClick={() => setShowDetail(false)} style={{ position: "absolute", top: 15, right: 15, width: 30, height: 30, background: "rgba(255,255,255,0.8)", border: "1px solid #ddd", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: "bold", color: "#333", zIndex: 100 }}>×</button>

            {/* 뒤로가기 버튼 탭 */}
            {prevPropertyId && (
              <div 
                onClick={() => {
                  setActiveProperty(prevPropertyId);
                  setActiveDetailTab("realtor");
                  setPrevPropertyId(null);
                }}
                style={{
                  position: "absolute",
                  left: -28,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 28,
                  height: 60,
                  background: "#fff",
                  border: "1px solid #eee",
                  borderRight: "none",
                  borderRadius: "6px 0 0 6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "-3px 0 6px rgba(0,0,0,0.04)",
                  zIndex: 26,
                  color: "#666",
                  fontSize: 20,
                  fontWeight: "bold",
                }}
                title="등록자 정보(이전 매물)로 돌아가기"
              >
                ‹
              </div>
            )}

            <div id="detail-scroll-container" style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
              {/* 갤러리 */}
              {prop.images && prop.images.length > 0 && prop.images[0] && (
                <div style={{ position: "relative", width: "100%", height: 200, background: "#f0f0f0" }}>
                  <img src={images[galleryIndex]} onClick={() => setShowGalleryModal(true)} style={{width:'100%', height:'100%', objectFit:'cover', cursor: 'pointer'}} />
                  {images.length > 1 && (
                    <>
                      <button onClick={() => setGalleryIndex(Math.max(0, galleryIndex - 1))} style={{ position: "absolute", top: "50%", left: 0, transform: "translateY(-50%)", background: "rgba(0,0,0,0.2)", color: "#fff", border: "none", fontSize: 18, padding: "10px 6px", cursor: "pointer", borderRadius: "0 4px 4px 0" }}>〈</button>
                      <button onClick={() => setGalleryIndex(Math.min(images.length - 1, galleryIndex + 1))} style={{ position: "absolute", top: "50%", right: 0, transform: "translateY(-50%)", background: "rgba(0,0,0,0.2)", color: "#fff", border: "none", fontSize: 18, padding: "10px 6px", cursor: "pointer", borderRadius: "4px 0 0 4px" }}>〉</button>
                      <div style={{ position: "absolute", bottom: 15, right: 15, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 11, padding: "4px 12px", borderRadius: 20 }}>{galleryIndex + 1}/{images.length}</div>
                    </>
                  )}
                </div>
              )}

              {/* 헤더 정보 */}
              <div style={{ padding: "40px 20px 20px 20px", borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingRight: 30 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: "bold", color: "#ff5a5f", border: "1px solid #ff5a5f", padding: "2px 6px", borderRadius: 2 }}>{prop.realtor_commission || prop.commission_type || "법정수수료"}</span>
                    <span style={{ color: "#e53e3e", fontSize: 14, fontWeight: "bold" }}>{prop.vacancy_no}</span>
                    <span style={{ fontSize: 12, color: "#888" }}>{new Date(prop.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, fontSize: 11 }}>
                    <button style={{ background: "none", border: "none", cursor: "pointer", color: "#ff5a5f", display: "flex", alignItems: "center", gap: 4, padding: 0, fontSize: 11 }}>● 허위매물신고</button>
                    <button onClick={() => handlePrint(prop)} style={{ background: "none", border: "none", cursor: "pointer", color: "#666", display: "flex", alignItems: "center", gap: 4, padding: 0, fontSize: 11 }}>🖨 인쇄</button>
                  </div>
                </div>
                <h2 style={{ fontSize: 15, fontWeight: "bold", color: "#333", margin: "0 0 6px 0" }}>{[prop.dong, prop.building_name].filter(Boolean).join(" ")}</h2>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1f5edb", margin: 0 }}>{getPriceText(prop)}</h1>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, position: "relative" }}>
                    <button onClick={() => toggleWishlist(prop.id)} style={{ background: "none", border: "1px solid #ddd", borderRadius: 6, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: wishlist.includes(prop.id) ? "#1a73e8" : "#666" }} title={wishlist.includes(prop.id) ? "관심매물 해제" : "관심매물 등록"}><svg width="18" height="18" viewBox="0 0 24 24" fill={wishlist.includes(prop.id) ? "#1a73e8" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg></button>
                    <button onClick={() => setShowShareDropdown(!showShareDropdown)} style={{ background: "none", border: "1px solid #ddd", borderRadius: 6, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: showShareDropdown ? "#1a73e8" : "#666" }} title="공유하기"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg></button>
                    {/* 공유 드롭다운 */}
                    {showShareDropdown && (
                      <div ref={shareDropdownRef} style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10, boxShadow: "0 6px 24px rgba(0,0,0,0.15)", width: 200, zIndex: 9999, overflow: "hidden", animation: "dropdownFadeIn 0.15s ease" }}>
                        <button onClick={() => handleKakaoShare(prop)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", borderBottom: "1px solid #f0f0f0", cursor: "pointer", fontSize: 14, color: "#333", fontFamily: "inherit", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#FEE500", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="#3C1E1E"><path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.8 5.2 4.4 6.5l-1 3.7c-.1.3.3.6.5.4l4.3-2.9c.6.1 1.2.1 1.8.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z"></path></svg>
                          </div>
                          <span style={{ fontWeight: 600 }}>카카오톡 공유</span>
                        </button>
                        <button onClick={() => handleCopyUrl(prop.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#333", fontFamily: "inherit", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                          </div>
                          <span style={{ fontWeight: 600 }}>URL 복사</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "#555", marginTop: 4, marginBottom: 12 }}>{prop.property_type} · {prop.direction || "방향없음"} · 공급/전용 면적: {prop.supply_m2 || 0}㎡ / {prop.exclusive_m2 || 0}㎡</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 13, color: "#555" }}>
                  <span>룸 {prop.room_count || 0}개</span><span style={{ width: 1, height: 10, background: "#ddd", display: "inline-block" }}></span>
                  <span>주차 {prop.parking_count ? `${prop.parking_count}대` : "정보없음"}</span><span style={{ width: 1, height: 10, background: "#ddd", display: "inline-block" }}></span>
                  <span>{prop.options?.join(", ") || "옵션없음"}</span>
                </div>
              </div>

              {/* 탭 */}
              <div style={{ display: "flex", borderBottom: "1px solid #ddd", margin: 0 }}>
                {(["info", "realtor"] as const).map((tab) => (
                  <div key={tab} onClick={() => setActiveDetailTab(tab)} style={{ flex: 1, textAlign: "center", padding: "14px 0", fontSize: 15, fontWeight: "bold", cursor: "pointer", color: activeDetailTab === tab ? "#111" : "#888", borderBottom: activeDetailTab === tab ? "2px solid #111" : "2px solid transparent" }}>
                    {tab === "info" ? "매물정보" : "등록자정보"}
                  </div>
                ))}
              </div>

              {/* 매물정보 탭 */}
              {activeDetailTab === "info" && (
                <>
                <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", borderBottom: "10px solid #f5f5f5" }}>
                  <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>매물번호</div>
                  <div style={{ fontSize: 14, color: "#222", fontWeight: "bold", padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{prop.vacancy_no}</div>
                  <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>소재지</div>
                  <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{[prop.sido, prop.sigungu, prop.dong, prop.detail_addr].filter(Boolean).join(" ")}</div>
                  <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>매물특성</div>
                  <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{prop.building_name || "-"}</div>
                  <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>공급/전용면적</div>
                  <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{prop.supply_m2 ? `${prop.supply_m2}m²(${prop.supply_py || 0}평)` : "-"} / {prop.exclusive_m2 ? `${prop.exclusive_m2}m²(${prop.exclusive_py || 0}평)` : "-"}</div>
                  <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>해당층/총층</div>
                  <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{prop.current_floor || "-"} / {prop.total_floor || "-"}</div>
                  <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>방/욕실수</div>
                  <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{prop.room_count || 0}개 / {prop.bathroom_count || 0}개</div>
                  <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>방향</div>
                  <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{prop.direction || "-"}</div>
                  <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>주차가능 여부</div>
                  <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{prop.parking || "없음"}</div>
                  <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>입주가능일</div>
                  <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{prop.move_in_date || "즉시입주(공실)"}</div>
                  <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>관리비</div>
                  <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{prop.maintenance_fee ? `${prop.maintenance_fee / 10000}만원` : "없음"}</div>
                  <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "flex-start", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>상세설명</div>
                  <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all", whiteSpace: "pre-line" }}>{prop.description || "-"}</div>
                </div>

                {/* ──── 위치정보 ──── */}
                <div style={{ padding: "30px 20px 0" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#222", marginBottom: 12 }}>위치정보</div>
                  <div ref={itemMapRef} style={{ width: "100%", height: 300, borderRadius: 8, marginBottom: 20, background: "#e8eaed", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 14, border: "1px solid #eee", overflow: "hidden" }}>
                  </div>
                </div>

                {/* ──── 로드뷰 ──── */}
                <div style={{ padding: "0 20px" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#222", marginBottom: 12 }}>로드뷰</div>
                  <div ref={roadviewRef} style={{ width: "100%", height: 300, borderRadius: 8, marginBottom: 20, background: "#e8eaed", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 14, border: "1px solid #eee", overflow: "hidden" }}>
                  </div>
                </div>

                {/* ──── 옵션 ──── */}
                {prop.options && prop.options.length > 0 && (
                  <div style={{ padding: "10px 20px 20px" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#222", marginBottom: 20 }}>옵션</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 30 }}>
                      {prop.options.map((optName: string, idx: number) => (
                        <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, minWidth: 50 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44 }}>
                            {getOptionSvg(optName)}
                          </div>
                          <span style={{ fontSize: 13, color: "#333", fontWeight: "bold", textAlign: "center", whiteSpace: "nowrap" }}>{optName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ──── 주변환경 (인프라) ──── */}
                {prop.infrastructure && Object.keys(prop.infrastructure).length > 0 && (
                  <div style={{ padding: "10px 20px 20px" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#222", marginBottom: 20, borderTop: "1px dashed #eee", paddingTop: 20 }}>주변환경</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {Object.entries(prop.infrastructure).map(([catName, places]: [string, any]) => (
                        <div key={catName} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                          <span style={{ fontSize: 13, fontWeight: "bold", color: "#666", width: 65, flexShrink: 0, marginTop: 4 }}>
                            {catName}
                          </span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: 1 }}>
                            {(places as string[]).map((place: string, idx: number) => (
                              <div key={idx} style={{ fontSize: 13, color: "#333", background: "#f5f5f5", padding: "4px 10px", borderRadius: 4 }}>
                                {place}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ──── 댓글상담 ──── */}
                <div style={{ marginTop: 20, borderTop: "10px solid #f5f5f5", padding: "30px 20px 40px" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#222", marginBottom: 15, display: "flex", alignItems: "center", gap: 8 }}>
                    댓글상담 <span style={{ color: "#1a73e8", fontSize: 15 }}>{comments.length}개</span>
                  </div>
                  
                  {/* 입력 영역 */}
                  <div style={{ marginBottom: 30, border: "1px solid #ddd", borderRadius: 6, overflow: "hidden", background: "#fff", position: "relative" }}>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={currentUser ? "가격을 제안하거나, 궁금한 점을 남겨보세요. 등작자와의 1:1 상담입니다." : "로그인 후 이용하실 수 있습니다."}
                      style={{ width: "100%", minHeight: 90, border: "none", outline: "none", padding: "14px 15px", fontSize: 14, color: "#333", resize: "vertical", fontFamily: "inherit", background: "#fff", boxSizing: "border-box" }}
                      disabled={!currentUser}
                    />
                    <div style={{ padding: "10px 15px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafafa", borderTop: "1px solid #eee" }}>
                      <label style={{ fontSize: 13, color: "#555", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: "bold" }}>
                        <input type="checkbox" checked={isSecret} onChange={(e) => setIsSecret(e.target.checked)} style={{ width: 16, height: 16 }} />
                        비밀글
                      </label>
                      <button onClick={handleCommentSubmit} disabled={!currentUser || !newComment.trim()} style={{ background: currentUser && newComment.trim() ? "#1a73e8" : "#ccc", color: "#fff", border: "none", padding: "8px 24px", borderRadius: 4, fontWeight: "bold", cursor: currentUser && newComment.trim() ? "pointer" : "default", fontSize: 14, fontFamily: "inherit" }}>등록</button>
                    </div>
                  </div>

                  {/* 댓글 리스트 */}
                  <div>
                    {comments.length === 0 ? (
                      <div style={{ textAlign: "center", padding: 30, color: "#888", fontSize: 13 }}>아직 등록된 문의가 없습니다.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        {comments.map((cm) => {
                          const isCommentOwner = currentUser?.id === cm.author_id;
                          const isPropertyOwner = currentUser?.id === prop.owner_id;
                          const canView = !cm.is_secret || isCommentOwner || isPropertyOwner;

                          return (
                            <div key={cm.id} style={{ padding: "16px 0", borderBottom: "1px solid #f0f0f0" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                <span style={{ fontWeight: "bold", fontSize: 14, color: "#222" }}>{cm.author_name}</span>
                                <span style={{ fontSize: 12, color: "#999" }}>{new Date(cm.created_at).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                {cm.is_secret && <span style={{ fontSize: 12, color: "#ff5a5f", border: "1px solid #ff5a5f", padding: "1px 4px", borderRadius: 3, fontWeight: "bold" }}>비밀글</span>}
                              </div>
                              <div style={{ fontSize: 14, color: canView ? "#333" : "#aaa", lineHeight: 1.5, whiteSpace: "pre-line" }}>
                                {canView ? cm.content : "XXX (등록자와 작성자만 볼 수 있는 비밀글입니다)"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                </>
              )}

              {/* 등록자정보 탭 */}
              {activeDetailTab === "realtor" && (
                <>
                <div style={{ padding: "30px 20px", background: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 25, gap: 15 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#111", marginBottom: 12 }}>{agencyInfo ? agencyInfo.name : (prop.members ? prop.members.name : prop.client_name)}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                        {agencyInfo ? (
                          <>
                            <span style={{ fontSize: 14, color: "#555" }}>대표 {agencyInfo.ceo_name} <span style={{color:"#ccc", margin:"0 6px"}}>|</span> 등록번호 {agencyInfo.reg_num || '-'}</span>
                            <span style={{ fontSize: 14, color: "#555" }}>{[agencyInfo.address, agencyInfo.address_detail].filter(Boolean).join(" ") || '-'}</span>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: 14, color: "#555" }}>일반회원 <span style={{color:"#ccc", margin:"0 6px"}}>|</span> {prop.members ? prop.members.name : prop.client_name}</span>
                          </>
                        )}
                        <span style={{ fontSize: 14, fontWeight: "bold", color: "#1a73e8", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                          전화 {agencyInfo?.phone ? `${agencyInfo.phone}${agencyInfo?.cell && agencyInfo.cell !== agencyInfo.phone ? `, ${agencyInfo.cell}` : ''}` : (prop.client_phone || prop.members?.phone || "미등록")}
                        </span>
                      </div>

                      {/* SNS Links (Excluding API info) */}
                      {prop.members?.sns_links && Object.keys(prop.members.sns_links).filter(k => k !== "api_info" && k !== "api_list" && prop.members.sns_links[k]?.url).length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                          {Object.keys(prop.members.sns_links).filter(k => k !== "api_info" && k !== "api_list" && prop.members.sns_links[k]?.url).map(key => {
                            const link = prop.members.sns_links[key].url;
                            const validUrl = link.startsWith('http') ? link : `https://${link}`;
                            
                            // Icon mapping based on key
                            let iconHtml;
                            switch(key) {
                              case 'youtube': iconHtml = <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.99C18.88 4 12 4 12 4s-6.88 0-8.59.43A2.78 2.78 0 0 0 1.46 6.42C1 8.16 1 12 1 12s0 3.84.46 5.58a2.78 2.78 0 0 0 1.95 1.99C5.12 20 12 20 12 20s6.88 0 8.59-.43a2.78 2.78 0 0 0 1.95-1.99C23 15.84 23 12 23 12s0-3.84-.46-5.58zM9.54 15.55V8.45L15.82 12l-6.28 3.55z"></path></svg>; break;
                              case 'instagram': iconHtml = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>; break;
                              case 'facebook': iconHtml = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>; break;
                              case 'twitter': iconHtml = <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>; break;
                              case 'blog': iconHtml = <span style={{ fontSize: 13, fontWeight: "bold" }}>BLOG</span>; break;
                              case 'cafe': iconHtml = <span style={{ fontSize: 13, fontWeight: "bold" }}>CAFE</span>; break;
                              case 'kakao': iconHtml = <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.8 5.2 4.4 6.5l-1 3.7c-.1.3.3.6.5.4l4.3-2.9c.6.1 1.2.1 1.8.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z"></path></svg>; break;
                              case 'homepage': iconHtml = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>; break;
                              case 'shopping_mall': iconHtml = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>; break;
                              default: iconHtml = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>;
                            }
                            
                            const titleNames: Record<string,string> = { homepage: "홈페이지", contact: "문의하기", shopping_mall: "쇼핑몰", blog: "블로그", cafe: "카페", youtube: "유튜브", facebook: "페이스북", twitter: "트위터", instagram: "인스타그램", kakao: "카카오", threads: "쓰레드" };
                            const titleName = titleNames[key] || key;

                            return (
                              <a 
                                key={key} 
                                href={validUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                title={titleName}
                                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: "50%", background: "#f8f9fa", border: "1px solid #e0e0e0", color: "#444", transition: "all 0.2s", textDecoration: "none" }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "#eaf4ff"; e.currentTarget.style.borderColor = "#1a73e8"; e.currentTarget.style.color = "#1a73e8"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "#f8f9fa"; e.currentTarget.style.borderColor = "#e0e0e0"; e.currentTarget.style.color = "#444"; }}
                              >
                                <div style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>{iconHtml}</div>
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* 부동산 소개란 (agency_info intro) */}
                    {agencyInfo?.intro && (
                      <div style={{ width: 230, flexShrink: 0, padding: "12px 14px", background: "#f8f9fa", borderRadius: 8, fontSize: 13, color: "#444", border: "1px solid #eee", lineHeight: 1.5, wordBreak: "keep-all" }}>
                        <div style={{ fontWeight: "bold", fontSize: 12, color: "#888", marginBottom: 6 }}>부동산 소개</div>
                        {agencyInfo.intro}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <div style={{ display: "flex", background: "#f9f9f9", borderRadius: 8, overflow: "hidden", border: "1px solid #eee" }}>
                      <div style={{ flex: 1, padding: "16px 20px", fontSize: 14, fontWeight: "bold", color: "#111", borderRight: "1px solid #eee", display: "flex", alignItems: "center" }}>공실등록현황</div>
                      <div style={{ display: "flex", alignItems: "center", padding: "0 20px", gap: 16, fontSize: 13, color: "#666" }}>
                        {[
                          { label: '전체', count: dbVacancies.filter(v => v.owner_id === prop.owner_id).length },
                          { label: '매매', count: dbVacancies.filter(v => v.owner_id === prop.owner_id && v.trade_type === '매매').length },
                          { label: '전세', count: dbVacancies.filter(v => v.owner_id === prop.owner_id && v.trade_type === '전세').length },
                          { label: '월세', count: dbVacancies.filter(v => v.owner_id === prop.owner_id && v.trade_type === '월세').length },
                          { label: '단기', count: dbVacancies.filter(v => v.owner_id === prop.owner_id && v.trade_type === '단기').length }
                        ].map((stat, i, arr) => (
                          <React.Fragment key={stat.label}>
                            <span 
                              onClick={() => setRealtorTradeType(stat.label)}
                              style={{ 
                                cursor: "pointer", 
                                color: realtorTradeType === stat.label ? "#1a73e8" : "#666", 
                                fontWeight: realtorTradeType === stat.label ? "bold" : "normal"
                              }}
                            >
                              {stat.label} <strong style={{color: realtorTradeType === stat.label ? "#1a73e8" : "#111"}}>{stat.count}</strong>
                            </span>
                            {i < arr.length - 1 && <span style={{width:1,height:12,background:"#ddd"}}></span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ──── 등록 물건 리스트 ──── */}
                <div style={{ borderTop: "10px solid #f5f5f5" }}>
                  {dbVacancies.filter(v => v.owner_id === prop.owner_id && (realtorTradeType === "전체" || v.trade_type === realtorTradeType)).slice(0, 10).map((vp) => (
                    <div key={vp.id} onClick={() => { setPrevPropertyId(activeProperty); setActiveProperty(vp.id); setActiveDetailTab("info"); setGalleryIndex(0); }}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                        padding: "16px 20px", cursor: "pointer", transition: "background 0.15s",
                        borderBottom: "1px solid #f0f0f0", background: "#fff",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#f9fbff"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
                    >
                      <div style={{ flex: 1, paddingRight: vp.images?.[0] ? 12 : 0, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: "bold", color: "#111", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{vp.building_name || vp.dong}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#1a73e8", marginBottom: 4 }}>{getPriceText(vp)}</div>
                        <div style={{ fontSize: 13, color: "#555", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {vp.property_type} <span style={{ color: "#ddd", margin: "0 4px" }}>|</span> {vp.direction || "방향없음"} <span style={{ color: "#ddd", margin: "0 4px" }}>|</span> {vp.exclusive_m2 ? `${vp.exclusive_m2}㎡` : "면적미상"}
                        </div>
                        <div style={{ fontSize: 12, color: "#666", marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {[`룸 ${vp.room_count || 0}개`, `욕실 ${vp.bathroom_count || 0}개`, ...(vp.options || [])].filter(Boolean).join(", ")}
                        </div>
                      </div>
                      {vp.images?.[0] && (
                        <div style={{ width: 80, height: 80, borderRadius: 6, overflow: "hidden", background: "#f0f0f0", flexShrink: 0 }}>
                          <img src={vp.images[0]} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* ──── 댓글상담 (등록자정보 탭 하단) ──── */}
                <div style={{ marginTop: 0, borderTop: "1px solid #f0f0f0", padding: "20px 20px 40px" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#222", marginBottom: 15, display: "flex", alignItems: "center", gap: 8 }}>
                    댓글상담 <span style={{ color: "#1a73e8", fontSize: 15 }}>{comments.length}개</span>
                  </div>
                  
                  {/* 입력 영역 */}
                  <div style={{ marginBottom: 30, border: "1px solid #ddd", borderRadius: 6, overflow: "hidden", background: "#fff", position: "relative" }}>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={currentUser ? "가격을 제안하거나, 궁금한 점을 남겨보세요. 등록자와의 1:1 상담입니다." : "로그인 후 이용하실 수 있습니다."}
                      style={{ width: "100%", minHeight: 90, border: "none", outline: "none", padding: "14px 15px", fontSize: 14, color: "#333", resize: "vertical", fontFamily: "inherit", background: "#fff", boxSizing: "border-box" }}
                      disabled={!currentUser}
                    />
                    <div style={{ padding: "10px 15px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafafa", borderTop: "1px solid #eee" }}>
                      <label style={{ fontSize: 13, color: "#555", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: "bold" }}>
                        <input type="checkbox" checked={isSecret} onChange={(e) => setIsSecret(e.target.checked)} style={{ width: 16, height: 16 }} />
                        비밀글
                      </label>
                      <button onClick={handleCommentSubmit} disabled={!currentUser || !newComment.trim()} style={{ background: currentUser && newComment.trim() ? "#1a73e8" : "#ccc", color: "#fff", border: "none", padding: "8px 24px", borderRadius: 4, fontWeight: "bold", cursor: currentUser && newComment.trim() ? "pointer" : "default", fontSize: 14, fontFamily: "inherit" }}>등록</button>
                    </div>
                  </div>

                  {/* 댓글 리스트 */}
                  <div>
                    {comments.length === 0 ? (
                      <div style={{ textAlign: "center", padding: 30, color: "#888", fontSize: 13 }}>아직 등록된 문의가 없습니다.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        {comments.map((cm) => {
                          const isCommentOwner = currentUser?.id === cm.author_id;
                          const isPropertyOwner = currentUser?.id === prop.owner_id;
                          const canView = !cm.is_secret || isCommentOwner || isPropertyOwner;

                          return (
                            <div key={cm.id} style={{ padding: "16px 0", borderBottom: "1px solid #f0f0f0" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                <span style={{ fontWeight: "bold", fontSize: 14, color: "#222" }}>{cm.author_name}</span>
                                <span style={{ fontSize: 12, color: "#999" }}>{new Date(cm.created_at).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                {cm.is_secret && <span style={{ fontSize: 12, color: "#ff5a5f", border: "1px solid #ff5a5f", padding: "1px 4px", borderRadius: 3, fontWeight: "bold" }}>비밀글</span>}
                              </div>
                              <div style={{ fontSize: 14, color: canView ? "#333" : "#aaa", lineHeight: 1.5, whiteSpace: "pre-line" }}>
                                {canView ? cm.content : "XXX (등록자와 작성자만 볼 수 있는 비밀글입니다)"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                </>
              )}
            </div>

            {/* 하단 고정 바 */}
            <div style={{ width: "100%", height: 75, flexShrink: 0, background: "#fff", borderTop: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", boxSizing: "border-box", boxShadow: "0 -4px 12px rgba(0,0,0,0.05)", zIndex: 10 }}>
              <span style={{ fontSize: 18, fontWeight: "bold", color: "#111" }}>{getPriceText(prop)}</span>
              <button style={{ background: "#1a73e8", color: "#fff", border: "none", padding: "10px 28px", borderRadius: 4, fontSize: 15, fontWeight: "bold", cursor: "pointer" }}>연락처 보기</button>
            </div>
            

          </div>
            );
          }
        )()}

        {/* 우측: 지도 영역 */}
        <div style={{ flex: 1, height: "100%", position: "relative", minWidth: 0, background: "#eee" }}>
          
          {/* 서울블럭지도 / 지도검색 Floating Header at Top Right */}
          <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10, display: "flex", alignItems: "baseline", gap: 10, background: "rgba(255,255,255,0.95)", padding: "8px 14px", borderRadius: 6, boxShadow: "0 2px 10px rgba(0,0,0,0.1)", border: "1px solid #e5e7eb" }}>
            <Link href="/homepage" style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", textDecoration: "none" }}>서울블럭지도</Link>
            <span style={{ color: "#d1d5db", fontSize: 14 }}>|</span>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#2845B3", margin: 0 }}>지도검색</h2>
          </div>

          <MapSearchBar 
            mapCenterRegion={mapCenterRegion}
            onSearchCoord={(lat, lng, zoomLevel) => {
              if (!kakaoMapRef.current) return;
              const kakao = (window as any).kakao;
              if (zoomLevel) kakaoMapRef.current.setLevel(zoomLevel);
              kakaoMapRef.current.panTo(new kakao.maps.LatLng(lat, lng));
            }}
            themeColor="#1a73e8"
            isPushedDown={activeFilterDropdown !== null}
          />

          <div ref={mapRef} style={{ width: "100%", height: "100%", background: "#e8eaed" }}>
            {mapError && (
              <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "#ffefef", color: "#d32f2f", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, zIndex: 10 }}>
                <span style={{ fontSize: 40 }}>⚠️</span>
                <span style={{ fontSize: 16, fontWeight: "bold" }}>지도 로드 오류</span>
                <span style={{ fontSize: 14 }}>{mapError}</span>
              </div>
            )}
          </div>
          
          {/* Custom Zoom Control (네비게이션 바) */}
          <div style={{ position: "absolute", right: 20, top: 160, zIndex: 10, display: "flex", flexDirection: "column", background: "#fff", borderRadius: 4, boxShadow: "0 2px 6px rgba(0,0,0,0.15)", overflow: "hidden" }}>
             <button onClick={() => { if(kakaoMapRef.current) kakaoMapRef.current.setLevel(kakaoMapRef.current.getLevel() - 1); }} style={{ width: 36, height: 36, border: "none", borderBottom: "1px solid #e0e0e0", background: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>＋</button>
             <button onClick={() => { if(kakaoMapRef.current) kakaoMapRef.current.setLevel(kakaoMapRef.current.getLevel() + 1); }} style={{ width: 36, height: 36, border: "none", background: "#fff", fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, color: "#666" }}>－</button>
          </div>
        </div>
      </main>

      {/* 갤러리 풀스크린 모달 (z-index 문제 해결을 위해 최상위로 이동) */}
      {showGalleryModal && activeProperty !== null && (() => {
        const prop = dbVacancies.find(v => v.id === activeProperty);
        const images = prop?.images || [];
        if (images.length === 0) return null;
        return (
          <div onClick={() => setShowGalleryModal(false)} style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.9)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <button onClick={() => setShowGalleryModal(false)} style={{ position: "absolute", top: 20, right: 30, background: "none", border: "none", color: "#fff", fontSize: 50, cursor: "pointer", zIndex: 100000, fontWeight: 300, lineHeight: 1 }}>×</button>
            
            <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "80%", maxWidth: 1000, height: "80%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src={images[galleryIndex]} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              {images.length > 1 && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); setGalleryIndex(Math.max(0, galleryIndex - 1)); }} style={{ position: "absolute", top: "50%", left: -80, transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", width: 60, height: 60, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, zIndex: 10000 }}>〈</button>
                  <button onClick={(e) => { e.stopPropagation(); setGalleryIndex(Math.min(images.length - 1, galleryIndex + 1)); }} style={{ position: "absolute", top: "50%", right: -80, transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", width: 60, height: 60, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, zIndex: 10000 }}>〉</button>
                  <div style={{ position: "absolute", bottom: -50, left: "50%", transform: "translateX(-50%)", color: "#fff", fontSize: 16, fontWeight: "bold", background: "rgba(255,255,255,0.2)", padding: "6px 20px", borderRadius: 20 }}>{galleryIndex + 1} / {images.length}</div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* 토스트 알림 */}
      {toastMessage && (
        <div style={{ position: "fixed", top: "30%", left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.8)", color: "#fff", padding: "12px 28px", borderRadius: 8, fontSize: 14, fontWeight: "bold", zIndex: 999999, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", animation: "toastFadeIn 0.2s ease", whiteSpace: "nowrap" }}>
          {toastMessage}
        </div>
      )}

      <style>{`
        @keyframes toastFadeIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes dropdownFadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
