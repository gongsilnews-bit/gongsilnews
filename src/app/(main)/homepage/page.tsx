"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getVacancies } from "@/app/actions/vacancy";
import { getMapBlocks } from "@/app/actions/map_blocks";
import MapSearchBar from "@/components/MapSearchBar";
import { getPermissionLevel } from "@/utils/permissionCheck";
import AuthModal from "@/components/AuthModal";

const DETAILED_CATEGORIES = [
  { name: "아파트", types: ["매", "전", "월", "단"] },
  { name: "오피스텔", types: ["매", "전", "월", "단"] },
  { name: "빌라/연립", types: ["매", "전", "월", "단"] },
  { name: "단독/다가구", types: ["매", "전", "월", "단"] },
  { name: "전원주택", types: ["매", "전", "월", "단"] },
  { name: "풀옵션", types: ["매", "전", "월", "단"] },
  { name: "상가", types: ["매", "전", "월", "단"] },
  { name: "사무실", types: ["매", "전", "월", "단"] },
  { name: "건물/빌딩", types: ["매", "전", "월", "단"] },
  { name: "공장/창고", types: ["매", "전", "월", "단"] },
  { name: "토지/기타", types: ["매", "전", "월", "단"] },
  { name: "경매/공매", types: ["매"] }
];

const CATEGORY_OPTIONS = [
  { label: "전체", value: "" },
  { label: "아파트·오피스텔", value: "아파트·오피스텔" },
  { label: "빌라·주택", value: "빌라·주택" },
  { label: "원룸·투룸(풀옵션)", value: "원룸·투룸(풀옵션)" },
  { label: "상가·사무실·건물·공장·토지", value: "상가·사무실·건물·공장·토지" },
  { label: "분양", value: "분양" },
];

const TRADE_OPTIONS = [
  { label: "전체", value: "" },
  { label: "매매", value: "매매" },
  { label: "전세", value: "전세" },
  { label: "월세", value: "월세" },
  { label: "단기임대", value: "단기임대" },
];

const SIDO_LIST = [
  "시도선택", "서울특별시", "경기도", "인천광역시", "부산광역시",
  "대구광역시", "대전광역시", "광주광역시", "울산광역시", "세종특별자치시",
  "강원도", "충청북도", "충청남도", "전라북도", "전라남도",
  "경상북도", "경상남도", "제주특별자치도"
];

const SORT_OPTIONS = [
  { label: "공실광고정렬", value: "latest" },
  { label: "가격 낮은순", value: "price_asc" },
  { label: "가격 높은순", value: "price_desc" },
];

const BRAND = "#2845B3";

const ThumbnailRoadview = ({ lat, lng }: { lat: number, lng: number }) => {
  const rvRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!rvRef.current) return;
    const kakao = (window as any).kakao;
    if (!kakao?.maps?.Roadview) return;
    const rv = new kakao.maps.Roadview(rvRef.current);
    const rvClient = new kakao.maps.RoadviewClient();
    const pos = new kakao.maps.LatLng(lat, lng);
    rvClient.getNearestPanoId(pos, 50, (panoId: any) => {
      if (panoId) rv.setPanoId(panoId, pos);
      else if (rvRef.current) rvRef.current.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#bbb;font-size:12px;background:#f3f4f6;">No Photo</div>';
    });
  }, [lat, lng]);
  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      <div ref={rvRef} style={{ width: 300, height: 300, flexShrink: 0, background: "#f3f4f6" }} />
    </div>
  );
};

// Extract unique sigungu list from GeoJSON data
function extractSigunguList(geojson: any): string[] {
  if (!geojson?.features) return [];
  const set = new Set<string>();
  geojson.features.forEach((f: any) => {
    const sggnm = f.properties?.sggnm;
    if (sggnm) set.add(sggnm);
  });
  return Array.from(set).sort();
}

// Count vacancies whose dong matches a feature
function countVacanciesInDong(vacancies: any[], dongName: string): number {
  // adm_nm format: "서울특별시 종로구 사직동" → extract last part
  const dong = dongName.split(" ").pop() || "";
  return vacancies.filter(v => v.dong && v.dong.includes(dong.replace(/동$/, ""))).length;
}

export default function HomepagePage() {
  const router = useRouter();
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDetailSearchOpen, setIsDetailSearchOpen] = useState(false);
  const [isPropertyTypeDropdownOpen, setIsPropertyTypeDropdownOpen] = useState(false);
  const [isTradeTypeDropdownOpen, setIsTradeTypeDropdownOpen] = useState(false);

  const dropdownRef1 = useRef<HTMLDivElement>(null);
  const dropdownRef2 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef1.current && !dropdownRef1.current.contains(e.target as Node)) {
        setIsPropertyTypeDropdownOpen(false);
      }
      if (dropdownRef2.current && !dropdownRef2.current.contains(e.target as Node)) {
        setIsTradeTypeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [category, setCategory] = useState("");
  const [expandedMenu, setExpandedMenu] = useState<string | null>("아파트·오피스텔");
  const [tradeTypes, setTradeTypes] = useState<string[]>([]);
  const [maxSalePrice, setMaxSalePrice] = useState("");
  const [maxDeposit, setMaxDeposit] = useState("");
  const [maxMonthlyRent, setMaxMonthlyRent] = useState("");
  const [roomsFilter, setRoomsFilter] = useState("");
  const [bathroomsFilter, setBathroomsFilter] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");
  const [floorFilter, setFloorFilter] = useState("");
  const [minArea, setMinArea] = useState("");
  const [maxArea, setMaxArea] = useState("");
  const [minSupplyArea, setMinSupplyArea] = useState("");
  const [maxSupplyArea, setMaxSupplyArea] = useState("");
  const [keyword, setKeyword] = useState("");
  const [themeFilter, setThemeFilter] = useState("");
  const [minSalePrice, setMinSalePrice] = useState("");
  const [minDeposit, setMinDeposit] = useState("");
  const [minMonthlyRent, setMinMonthlyRent] = useState("");
  const [registrantFilter, setRegistrantFilter] = useState("");
  const [commissionFilter, setCommissionFilter] = useState("");
  // 경매/공매 전용 필터
  const [auctionAppraisalMin, setAuctionAppraisalMin] = useState("");
  const [auctionAppraisalMax, setAuctionAppraisalMax] = useState("");
  const [auctionBidPriceMin, setAuctionBidPriceMin] = useState("");
  const [auctionBidPriceMax, setAuctionBidPriceMax] = useState("");
  const [auctionDiscount, setAuctionDiscount] = useState("");
  const [auctionBidCount, setAuctionBidCount] = useState("");
  const [sido, setSido] = useState("서울특별시");
  const [sigungu, setSigungu] = useState(""); // 구 선택
  const [selectedDongs, setSelectedDongs] = useState<string[]>([]); // 블럭(동) 복수 선택
  const [sortBy, setSortBy] = useState("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [userLevel, setUserLevel] = useState<number>(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [geoData, setGeoData] = useState<any>(null);
  const [customBlocks, setCustomBlocks] = useState<any[]>([]);
  const [sigunguList, setSigunguList] = useState<string[]>([]);
  const [mapCenterRegion, setMapCenterRegion] = useState<{ sido: string; gugun: string; dong: string } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<any>(null);
  const prevSigunguRef = useRef(""); // 시군구 변경 감지용
  const polygonsRef = useRef<any[]>([]);
  const overlaysRef = useRef<any[]>([]);
  const ITEMS_PER_PAGE = 10;

  // 유저 인증 상태 + 권한 레벨 감지
  useEffect(() => {
    async function initUser() {
      const { createClient } = await import("@/utils/supabase/client");
      const client = createClient();
      const { data } = await client.auth.getUser();
      if (data?.user) {
        const { data: memberData } = await client.from('members').select('role, plan_type').eq('id', data.user.id).single();
        if (memberData) {
          setUserLevel(getPermissionLevel(memberData));
        } else {
          setUserLevel(1);
        }
      }
    }
    initUser();
  }, []);

// --- In-Memory Cache for Instant Back Navigation ---
let _globalVacanciesCache: any[] | null = null;
let _globalVacanciesCacheTime: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Fetch vacancies
  useEffect(() => {
    async function load() {
      // 1. Try Cache
      if (_globalVacanciesCache && (Date.now() - _globalVacanciesCacheTime < CACHE_TTL)) {
        setVacancies(_globalVacanciesCache);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await getVacancies({ all: true, stringify: true });
        
        let active = [];
        if (res.success && res.data) {
          const parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
          active = parsed
            // .filter((v: any) => v.status === "ACTIVE") // 일단 모든 물건 표시 요청에 따라 임시 주석 처리
            .map((v: any) => ({
              ...v,
              photos: v.vacancy_photos
                ? [...v.vacancy_photos].sort((a: any, b: any) => a.sort_order - b.sort_order).map((p: any) => p.url)
                : [],
            }));
        }

        // Save to cache
        _globalVacanciesCache = active;
        _globalVacanciesCacheTime = Date.now();
        setVacancies(active);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Load GeoJSON
  useEffect(() => {
    if (sido === "서울특별시") {
      fetch("/geo/seoul.geojson")
        .then(r => r.json())
        .then(data => {
          setGeoData(data);
          setSigunguList(extractSigunguList(data));
        })
        .catch(() => {});
    }
  }, [sido]);

  // Load Custom Blocks
  useEffect(() => {
    async function loadCustom() {
      const res = await getMapBlocks({ sido: sido === "시도선택" ? undefined : sido });
      if (res.success && res.data) {
        setCustomBlocks(res.data);
      }
    }
    loadCustom();
  }, [sido]);

  const handleSearchCoord = useCallback((lat: number, lng: number, zoomLevel?: number) => {
    if (kakaoMapRef.current) {
      const kakao = (window as any).kakao;
      if (!kakao || !kakao.maps) return;
      const moveLatLon = new kakao.maps.LatLng(lat, lng);
      kakaoMapRef.current.setCenter(moveLatLon);
      if (typeof zoomLevel === 'number') {
        kakaoMapRef.current.setLevel(zoomLevel);
      }
    }
  }, []);

  // Load Kakao Map
  useEffect(() => {
    if ((window as any).kakao?.maps?.LatLng) { setMapLoaded(true); return; }
    const sid = "kakao-map-script";
    if (!document.getElementById(sid)) {
      const s = document.createElement("script");
      s.id = sid;
      s.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc"}&libraries=services,clusterer&autoload=false`;
      document.head.appendChild(s);
      s.onload = () => { (window as any).kakao.maps.load(() => setMapLoaded(true)); };
    } else {
      const iv = setInterval(() => { if ((window as any).kakao?.maps?.LatLng) { clearInterval(iv); setMapLoaded(true); } }, 100);
    }
  }, []);

  // Init map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || kakaoMapRef.current) return;
    const kakao = (window as any).kakao;
    kakaoMapRef.current = new kakao.maps.Map(mapRef.current, {
      center: new kakao.maps.LatLng(37.498095, 127.02761), level: 6,
    });
    // Set zoom restrictions based on the requirement for block maps
    kakaoMapRef.current.setMinLevel(4); // Max zoom in (1 block clearly fills the center)
    kakaoMapRef.current.setMaxLevel(8); // Max zoom out (Multiple blocks outline visible)

    kakao.maps.event.addListener(kakaoMapRef.current, 'idle', () => {
      const center = kakaoMapRef.current.getCenter();
      const geocoder = new kakao.maps.services.Geocoder();
      geocoder.coord2RegionCode(center.getLng(), center.getLat(), (result: any, status: any) => {
        if (status === kakao.maps.services.Status.OK) {
          const bCode = result.find((res: any) => res.region_type === 'B');
          if (bCode) {
            if (bCode.region_1depth_name !== '서울특별시') {
              alert("현재 페이지는 서울 전용 지역 검색 페이지입니다. 전국 지도검색으로 이동하시기 바랍니다.");
              window.location.href = "/gongsil";
              return;
            }
            setMapCenterRegion({
              sido: bCode.region_1depth_name,
              gugun: bCode.region_2depth_name,
              dong: bCode.region_3depth_name,
            });
          }
        }
      });
    });
  }, [mapLoaded]);

  // Render polygons on map when sigungu changes
  const renderPolygons = useCallback(() => {
    if (!kakaoMapRef.current || !mapLoaded || !geoData) return;
    const kakao = (window as any).kakao;
    const map = kakaoMapRef.current;

    // Clear existing
    polygonsRef.current.forEach(p => p.setMap(null));
    overlaysRef.current.forEach(o => o.setMap(null));
    polygonsRef.current = [];
    overlaysRef.current = [];

    // Load all features and blocks for the entire Sido
    const features = geoData.features || [];
    const activeCustomBlocks = customBlocks || [];

    if (features.length === 0 && activeCustomBlocks.length === 0) return;

    const bounds = new kakao.maps.LatLngBounds();
    let hasBounds = false;

    features.forEach((feature: any) => {
      const admNm = feature.properties.adm_nm || "";
      const dongName = admNm.split(" ").pop() || "";
      const sggnm = feature.properties.sggnm || "";
      const isSigunguMatch = sigungu ? (sggnm === sigungu || admNm.includes(sigungu)) : true;
      
      // If a custom block exists with the same name, skip GeoJSON to avoid overlapping darker layers
      if (activeCustomBlocks.some(b => b.name === dongName)) return;

      const coords = feature.geometry.coordinates;
      const isMulti = feature.geometry.type === "MultiPolygon";
      const polygonPaths = isMulti ? coords : [coords];

      polygonPaths.forEach((polyCoords: any) => {
        const path = polyCoords[0].map((c: number[]) => {
          const latlng = new kakao.maps.LatLng(c[1], c[0]);
          if (isSigunguMatch) {
            bounds.extend(latlng);
            hasBounds = true;
          }
          return latlng;
        });

        const isSelected = selectedDongs.includes(dongName);
        const polygon = new kakao.maps.Polygon({
          path,
          strokeWeight: isSelected ? 3 : 2,
          strokeColor: isSelected ? "#c53030" : "#004c80",
          strokeOpacity: isSelected ? 0.8 : 0.01,
          fillColor: isSelected ? "#fed7d7" : "#3182ce",
          fillOpacity: isSelected ? 0.3 : 0.01,
        });
        polygon.setMap(map);
        polygonsRef.current.push(polygon);

        // Hover effect
        kakao.maps.event.addListener(polygon, "mouseover", () => {
          if (!selectedDongs.includes(dongName)) {
            polygon.setOptions({ fillColor: "#718096", fillOpacity: 0.4, strokeOpacity: 0.6 });
          }
        });
        kakao.maps.event.addListener(polygon, "mouseout", () => {
          if (!selectedDongs.includes(dongName)) {
            polygon.setOptions({ fillColor: "#3182ce", fillOpacity: 0.01, strokeOpacity: 0.01 });
          }
        });

        // Click → filter
        kakao.maps.event.addListener(polygon, "click", () => {
          setSelectedDongs(prev => prev.includes(dongName) ? prev.filter(d => d !== dongName) : [...prev, dongName]);
          setMapCenterRegion({ sido, gugun: sigungu, dong: dongName });
          setCurrentPage(1);
        });
      });
    });

    // Handle Custom Blocks (from DB)
    activeCustomBlocks.forEach(block => {
      if (!block.coordinates || block.coordinates.length < 3) return;
      
      const isSigunguMatch = sigungu ? block.sigungu === sigungu : true;

      const path = block.coordinates.map((c: any) => {
        const latlng = new kakao.maps.LatLng(c.lat, c.lng);
        if (isSigunguMatch) {
          bounds.extend(latlng);
          hasBounds = true;
        }
        return latlng;
      });

      const isSelected = selectedDongs.includes(block.name);
      const polygon = new kakao.maps.Polygon({
        path,
        strokeWeight: isSelected ? 3 : 2,
        strokeColor: isSelected ? "#c53030" : (block.color || "#004c80"),
        strokeOpacity: isSelected ? 0.8 : 0.01,
        fillColor: isSelected ? "#fed7d7" : (block.color || "#3182ce"),
        fillOpacity: isSelected ? 0.3 : 0.01,
      });
      polygon.setMap(map);
      polygonsRef.current.push(polygon);

      kakao.maps.event.addListener(polygon, "mouseover", () => {
        if (!selectedDongs.includes(block.name)) {
          polygon.setOptions({ fillColor: "#718096", fillOpacity: 0.4, strokeOpacity: 0.6 });
        }
      });
      kakao.maps.event.addListener(polygon, "mouseout", () => {
        if (!selectedDongs.includes(block.name)) {
          polygon.setOptions({ fillColor: (block.color || "#3182ce"), fillOpacity: 0.01, strokeOpacity: 0.01 });
        }
      });
      kakao.maps.event.addListener(polygon, "click", () => {
        setSelectedDongs(prev => prev.includes(block.name) ? prev.filter(d => d !== block.name) : [...prev, block.name]);
        setMapCenterRegion({ sido, gugun: block.sigungu || sigungu, dong: block.name });
        setCurrentPage(1);
      });
    });

    if (prevSigunguRef.current !== sigungu) {
      if (hasBounds) {
        map.setBounds(bounds);
      }
      prevSigunguRef.current = sigungu;
    }
  }, [mapLoaded, geoData, customBlocks, sigungu, selectedDongs, vacancies]);

  useEffect(() => { renderPolygons(); }, [renderPolygons]);

  const dongsInSigungu = useMemo(() => {
    if (!sigungu || !geoData) return [];
    const set = new Set<string>();
    (geoData.features || []).forEach((f: any) => {
      const sggnm = f.properties.sggnm || "";
      const admNm = f.properties.adm_nm || "";
      if (sggnm === sigungu || admNm.includes(sigungu)) {
        set.add(admNm.split(" ").pop() || "");
      }
    });
    return Array.from(set).sort();
  }, [sigungu, geoData]);

  // Filtered
  const filtered = useMemo(() => {
    let list = vacancies;
    if (category) {
      list = list.filter(v => {
        const p = v.property_type || "";
        const isAuction = v.trade_type === "경매" || v.trade_type === "공매";
        
        if (category === "경매/공매") return isAuction;
        if (isAuction) return false; // 경매/공매가 아닌 일반 탭에서는 경매 매물 숨김

        switch (category) {
          case "아파트": return p === "아파트";
          case "오피스텔": return p === "오피스텔";
          case "빌라/연립": return p === "빌라/연립";
          case "단독/다가구": return p === "단독/다가구" || p === "상가주택";
          case "전원주택": return p === "전원주택";
          case "풀옵션": { const s = v.sub_category || ""; return p === "원룸" || p === "투룸" || p.includes("풀옵션") || p.includes("원룸") || p.includes("투룸") || s.includes("풀옵션") || s.includes("원룸") || s.includes("투룸"); }
          case "상가": return p === "상가" || p === "상가/점포";
          case "사무실": return p === "사무실" || p === "지식산업센터";
          case "건물/빌딩": return p === "건물/빌딩" || p === "건물" || p === "빌딩/건물";
          case "공장/창고": return p === "공장/창고";
          case "토지/기타": { const s2 = v.sub_category || ""; const isFull = p.includes("풀옵션") || p.includes("원룸") || p.includes("투룸") || s2.includes("풀옵션") || s2.includes("원룸") || s2.includes("투룸"); return !isFull && (p === "토지" || p === "토지/임야" || !["아파트", "오피스텔", "빌라/연립", "단독/다가구", "상가주택", "전원주택", "원룸", "투룸", "상가", "상가/점포", "사무실", "지식산업센터", "건물/빌딩", "건물", "빌딩/건물", "공장/창고"].includes(p)); }
          default: return p === category;
        }
      });
    }
    if (tradeTypes.length > 0 && category !== "경매/공매") list = list.filter(v => tradeTypes.includes(v.trade_type));
    
    // Price filters
    if ((tradeTypes.length === 0 || tradeTypes.includes("매매")) && maxSalePrice) {
      const ms = parseInt(maxSalePrice);
      if (!isNaN(ms)) list = list.filter(v => (v.trade_type === "매매" ? (v.deposit || 0) / 10000 <= ms : true));
    }
    if ((tradeTypes.length === 0 || tradeTypes.some(t => ["전세", "월세", "단기임대"].includes(t))) && maxDeposit) {
      const md = parseInt(maxDeposit);
      if (!isNaN(md)) list = list.filter(v => (["전세", "월세", "단기임대"].includes(v.trade_type) ? (v.deposit || 0) / 10000 <= md : true));
    }
    if ((tradeTypes.length === 0 || tradeTypes.some(t => ["월세", "단기임대"].includes(t))) && maxMonthlyRent) {
      const mr = parseInt(maxMonthlyRent);
      if (!isNaN(mr)) list = list.filter(v => (["월세", "단기임대"].includes(v.trade_type) ? (v.monthly_rent || 0) / 10000 <= mr : true));
    }

    // 전용면적 필터 (평 단위)
    if (minArea) { const n = parseFloat(minArea); if (!isNaN(n)) list = list.filter(v => (v.exclusive_m2 || v.area_m2 || 0) / 3.3058 >= n); }
    if (maxArea) { const n = parseFloat(maxArea); if (!isNaN(n)) list = list.filter(v => (v.exclusive_m2 || v.area_m2 || 0) / 3.3058 <= n); }
    // 공급면적 필터 (평 단위)
    if (minSupplyArea) { const n = parseFloat(minSupplyArea); if (!isNaN(n)) list = list.filter(v => (v.supply_m2 || 0) / 3.3058 >= n); }
    if (maxSupplyArea) { const n = parseFloat(maxSupplyArea); if (!isNaN(n)) list = list.filter(v => (v.supply_m2 || 0) / 3.3058 <= n); }
    // 금액 최소값 필터
    if (minSalePrice) { const n = parseInt(minSalePrice); if (!isNaN(n)) list = list.filter(v => v.trade_type === "매매" ? (v.deposit || 0) / 10000 >= n : true); }
    if (minDeposit) { const n = parseInt(minDeposit); if (!isNaN(n)) list = list.filter(v => ["전세","월세","단기임대"].includes(v.trade_type) ? (v.deposit || 0) / 10000 >= n : true); }
    if (minMonthlyRent) { const n = parseInt(minMonthlyRent); if (!isNaN(n)) list = list.filter(v => ["월세","단기임대"].includes(v.trade_type) ? (v.monthly_rent || 0) / 10000 >= n : true); }
    // 방 개수 필터
    if (roomsFilter) { const r = parseInt(roomsFilter); if (!isNaN(r)) { if (r >= 4) list = list.filter(v => (v.room_count || v.rooms || 0) >= 4); else list = list.filter(v => (v.room_count || v.rooms || 0) === r); } }
    // 욕실 개수 필터
    if (bathroomsFilter) { const b = parseInt(bathroomsFilter); if (!isNaN(b)) { if (b >= 3) list = list.filter(v => (v.bath_count || v.bathrooms || 0) >= 3); else list = list.filter(v => (v.bath_count || v.bathrooms || 0) === b); } }
    // 방향 필터
    if (directionFilter) { list = list.filter(v => v.direction === directionFilter); }
    // 층수 필터 (상업용)
    if (floorFilter) {
      const fl = (v: any) => v.current_floor || v.floor || "";
      if (floorFilter === "지하") list = list.filter(v => { const f = fl(v); return f && (f.includes("지하") || f.startsWith("B") || f.startsWith("-")); });
      else if (floorFilter === "1층") list = list.filter(v => { const f = fl(v); return f === "1" || f === "1층"; });
      else if (floorFilter === "2층이상") list = list.filter(v => { const f = parseInt(fl(v)); return !isNaN(f) && f >= 2; });
    }
    // 번지수/건물명 키워드 검색
    if (keyword.trim()) { const kw = keyword.trim().toLowerCase(); list = list.filter(v => (v.building_name || "").toLowerCase().includes(kw) || (v.dong || "").toLowerCase().includes(kw) || (v.detail_addr || "").toLowerCase().includes(kw)); }
    // 테마 필터
    if (themeFilter) { list = list.filter(v => v.themes && Array.isArray(v.themes) && v.themes.some((t: string) => t.includes(themeFilter))); }
    // 등록자구분 필터
    if (registrantFilter === "부동산") { list = list.filter(v => v.exposure_type === "부동산" || v.owner_role === "REALTOR"); }
    else if (registrantFilter === "일반인") { list = list.filter(v => v.exposure_type !== "부동산" && v.owner_role !== "REALTOR"); }
    // 법정수수료 필터
    if (commissionFilter) {
      list = list.filter(v => {
        const vc = v.realtor_commission || v.commission_type || "";
        const percentMatch = vc.match(/(\d+)%/);
        const vcPercent = percentMatch ? parseInt(percentMatch[1], 10) : (vc.includes("100") || vc === "법정수수료" || vc.includes("법정")) ? 100 : vc.includes("50") ? 50 : vc.includes("25") ? 25 : 0;
        if (commissionFilter === "공동중개") return vc.includes("공동");
        if (commissionFilter === "법정") return vcPercent >= 100 || vc.includes("법정");
        const minPercent = parseInt(commissionFilter, 10);
        if (!isNaN(minPercent)) return vcPercent >= minPercent;
        return true;
      });
    }

    // 경매/공매 전용 필터
    if (category === "경매/공매") {
      if (auctionAppraisalMin) { const v2 = parseInt(auctionAppraisalMin); if (!isNaN(v2)) list = list.filter(v => { const meta = v.metadata || {}; const ap = meta.appraisal_price || parseInt(meta.apslEvlAmt || "0", 10) || 0; return ap >= v2 * 10000; }); }
      if (auctionAppraisalMax) { const v2 = parseInt(auctionAppraisalMax); if (!isNaN(v2)) list = list.filter(v => { const meta = v.metadata || {}; const ap = meta.appraisal_price || parseInt(meta.apslEvlAmt || "0", 10) || 0; return ap <= v2 * 10000; }); }
      if (auctionBidPriceMin) { const v2 = parseInt(auctionBidPriceMin); if (!isNaN(v2)) list = list.filter(v => { const meta = v.metadata || {}; const bp = meta.lowest_bid_price || parseInt(meta.lowstBidPrcIndctCont || "0", 10) || 0; return bp >= v2 * 10000; }); }
      if (auctionBidPriceMax) { const v2 = parseInt(auctionBidPriceMax); if (!isNaN(v2)) list = list.filter(v => { const meta = v.metadata || {}; const bp = meta.lowest_bid_price || parseInt(meta.lowstBidPrcIndctCont || "0", 10) || 0; return bp <= v2 * 10000; }); }
      if (auctionDiscount) { const minD = parseInt(auctionDiscount); if (!isNaN(minD)) list = list.filter(v => { const meta = v.metadata || {}; const ap = meta.appraisal_price || parseInt(meta.apslEvlAmt || "0", 10) || 0; const bp = meta.lowest_bid_price || parseInt(meta.lowstBidPrcIndctCont || "0", 10) || 0; if (!ap || !bp) return false; return ((ap - bp) / ap) * 100 >= minD; }); }
      if (auctionBidCount) { const minB = parseInt(auctionBidCount); if (!isNaN(minB)) list = list.filter(v => { const meta = v.metadata || {}; return (meta.bid_count || meta.pbctCnt || 0) >= minB; }); }
    }

    // 사용자가 명시적으로 구/동을 선택했을 때만 지역 필터링
    const isRegionSelected = sigungu || selectedDongs.length > 0;
    if (isRegionSelected) {
      if (sido && sido !== "시도선택") list = list.filter(v => v.sido === sido);
      if (sigungu) list = list.filter(v => v.sigungu === sigungu);
      if (selectedDongs.length > 0) { list = list.filter(v => selectedDongs.some(dong => (v.dong && v.dong.includes(dong.replace(/동$/, ""))) || (v.building_name && v.building_name.includes(dong)))); }
    }

    if (sortBy === "price_asc") list = [...list].sort((a, b) => (a.deposit || 0) - (b.deposit || 0));
    else if (sortBy === "price_desc") list = [...list].sort((a, b) => (b.deposit || 0) - (a.deposit || 0));
    else if (sortBy === "sale_desc") list = [...list].sort((a, b) => (b.trade_type === "매매" ? b.deposit || 0 : 0) - (a.trade_type === "매매" ? a.deposit || 0 : 0));
    else list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  }, [vacancies, category, tradeTypes, sido, sigungu, selectedDongs, sortBy, maxSalePrice, maxDeposit, maxMonthlyRent, minSalePrice, minDeposit, minMonthlyRent, roomsFilter, bathroomsFilter, directionFilter, floorFilter, minArea, maxArea, minSupplyArea, maxSupplyArea, keyword, themeFilter, registrantFilter, commissionFilter, auctionAppraisalMin, auctionAppraisalMax, auctionBidPriceMin, auctionBidPriceMax, auctionDiscount, auctionBidCount]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const formatAmount = (amt: number) => {
    if (!amt) return "0";
    const m = Math.round(amt / 10000);
    if (m === 0) return "0";
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
    return result || "0";
  };
  const getPriceLabel = (v: any) => v.trade_type === "매매" ? "매매" : v.trade_type === "전세" ? "전세" : v.trade_type === "경매" ? "경매" : "월세";
  const getPriceBg = (v: any) => v.trade_type === "매매" ? "#e53e3e" : v.trade_type === "전세" ? "#2b6cb0" : v.trade_type === "경매" ? "#ff8c00" : "#2f855a";
  const getPriceText = (v: any) => {
    if (v.trade_type === "경매") return formatAmount(v.deposit);
    if (v.trade_type === "매매" || v.trade_type === "전세") return formatAmount(v.deposit);
    return `${formatAmount(v.deposit)} / ${formatAmount(v.monthly_rent)}`;
  };
  const fmtDate = (d: string) => { if (!d) return ""; const x = new Date(d); return `${x.getFullYear()}.${String(x.getMonth()+1).padStart(2,"0")}.${String(x.getDate()).padStart(2,"0")}`; };

  const selectStyle: React.CSSProperties = { padding: "8px 12px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 4, outline: "none", background: "#fff", cursor: "pointer" };
  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 14px", fontSize: 13, borderRadius: 4, fontWeight: 600, cursor: "pointer",
    border: active ? `1px solid ${BRAND}` : "1px solid #d1d5db",
    background: active ? BRAND : "#fff",
    color: active ? "#fff" : "#374151",
    transition: "all 0.15s",
  });
  const pageBtn = (active: boolean): React.CSSProperties => ({
    width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: "pointer",
    border: active ? `1px solid ${BRAND}` : "1px solid #d1d5db",
    background: active ? BRAND : "#fff",
    color: active ? "#fff" : "#555",
  });

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1300, margin: "20px auto 0", padding: "0 20px", display: "flex", gap: 24, alignItems: "flex-start" }}>
        
        {/* ── Left Sidebar (LNB) ── */}
        <div style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* User Info Block */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", padding: 16, borderRadius: 8, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 13, color: "#777", marginBottom: 8 }}>회원정보</div>
            {userLevel >= 2 ? (
              <>
                <div style={{ fontWeight: "bold", color: "#111", fontSize: 15 }}>부동산 중개회원</div>
                <div style={{ fontSize: 12, color: "#2563eb", marginTop: 4 }}>모든 매물 열람 가능</div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: "bold", color: "#111", fontSize: 15 }}>일반회원</div>
                <div style={{ fontSize: 12, color: "#fa5252", marginTop: 4 }}>일부 매물 열람 제한됨</div>
                <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                  <button onClick={() => setIsAuthModalOpen(true)} style={{ flex: 1, background: BRAND, color: "#fff", border: "none", padding: "6px 0", fontSize: 12, borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}>중개사회원 인증</button>
                </div>
              </>
            )}
          </div>

          {/* Quick Filters (Property Type) */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
            <div style={{ padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e5e7eb", fontWeight: "bold", fontSize: 14, color: "#111" }}>매물종류</div>
                                                <div style={{ display: "flex", flexDirection: "column", fontSize: 13, color: "#333" }}>
              {DETAILED_CATEGORIES.map((opt, i) => (
                 <div key={opt.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: i === DETAILED_CATEGORIES.length - 1 ? "none" : "1px solid #f1f5f9", cursor: "pointer", transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"} onClick={() => { setCategory(opt.name); const typeMap: Record<string, string> = {"매":"매매","전":"전세","월":"월세","단":"단기임대"}; setTradeTypes(opt.types.map(t => typeMap[t]).filter(Boolean)); setCurrentPage(1); }}>
                    <div style={{ fontWeight: category === opt.name ? 800 : 500, color: category === opt.name ? "#2563eb" : "#333", letterSpacing: -0.5 }}>
                      {opt.name}
                    </div>
                    <div style={{ display: "flex", gap: 3 }}>
                      {opt.types.includes("매") && <span onClick={e => { e.stopPropagation(); setCategory(opt.name); setTradeTypes(["매매"]); setCurrentPage(1); }} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, fontSize: 10, fontWeight: "bold", background: "#ea4335", color: "#fff", borderRadius: 2, cursor: "pointer" }}>매</span>}
                      {opt.types.includes("전") && <span onClick={e => { e.stopPropagation(); setCategory(opt.name); setTradeTypes(["전세"]); setCurrentPage(1); }} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, fontSize: 10, fontWeight: "bold", background: "#f97316", color: "#fff", borderRadius: 2, cursor: "pointer" }}>전</span>}
                      {opt.types.includes("월") && <span onClick={e => { e.stopPropagation(); setCategory(opt.name); setTradeTypes(["월세"]); setCurrentPage(1); }} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, fontSize: 10, fontWeight: "bold", background: "#f59e0b", color: "#fff", borderRadius: 2, cursor: "pointer" }}>월</span>}
                      {opt.types.includes("단") && <span onClick={e => { e.stopPropagation(); setCategory(opt.name); setTradeTypes(["단기임대"]); setCurrentPage(1); }} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, fontSize: 10, fontWeight: "bold", background: "#a855f7", color: "#fff", borderRadius: 2, cursor: "pointer" }}>단</span>}
                    </div>
                 </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Main Area ── */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
          
          {/* ── Top Search Filter Panel ── */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#111" }}>매물 상세검색</span>
              <span style={{ fontSize: 13, color: "#777" }}>다양한 조건으로 원하시는 매물을 빠르게 찾아보세요.</span>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <select style={{ border: "1px solid #cbd5e1", padding: "10px 14px", borderRadius: 4, width: 150, fontSize: 14, outline: "none", color: "#333" }} value={category} onChange={e => { setCategory(e.target.value); setCurrentPage(1); }}>
                  <option value="">물건 전체</option>
                  {DETAILED_CATEGORIES.map(opt => <option key={opt.name} value={opt.name}>{opt.name}</option>)}
                </select>
                <div style={{ width: 1, height: 20, background: "#e2e8f0", margin: "0 4px" }} />
                <select style={{ border: "1px solid #cbd5e1", padding: "10px 14px", borderRadius: 4, width: 140, fontSize: 14, outline: "none", color: "#333" }} value={sido} onChange={e => setSido(e.target.value)}>
                  {SIDO_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select style={{ border: "1px solid #cbd5e1", padding: "10px 14px", borderRadius: 4, width: 140, fontSize: 14, outline: "none", color: "#333" }} value={sigungu} onChange={e => { setSigungu(e.target.value); setSelectedDongs([]); setCurrentPage(1); }}>
                  <option value="">시/구/군 전체</option>
                  {sigunguList.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div style={{ width: 1, height: 20, background: "#e2e8f0", margin: "0 4px" }} />
                <input type="text" placeholder="번지수 또는 건물명 입력 (예: 논현동 123)" value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') setCurrentPage(1); }} style={{ flex: 1, minWidth: 200, border: "1px solid #cbd5e1", padding: "10px 14px", borderRadius: 4, fontSize: 14, outline: "none" }} />
                <button onClick={() => setCurrentPage(1)} style={{ background: BRAND, color: "#fff", border: "none", padding: "10px 32px", borderRadius: 4, fontWeight: "bold", fontSize: 14, cursor: "pointer" }}>조건검색</button>
              </div>

              {/* ── Dong Selector Expanded Panel ── */}
              {sigungu && dongsInSigungu.length > 0 && (
                <div style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "16px", background: "#f8fafc", marginTop: -4 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "10px" }}>
                    {dongsInSigungu.map(dong => {
                      const isSelected = selectedDongs.includes(dong);
                      return (
                        <div 
                          key={dong} 
                          onClick={() => {
                            setSelectedDongs(prev => prev.includes(dong) ? prev.filter(d => d !== dong) : [...prev, dong]);
                            setCurrentPage(1);
                          }}
                          style={{ 
                            padding: "6px 12px", 
                            fontSize: 13, 
                            cursor: "pointer", 
                            borderRadius: 4,
                            background: isSelected ? "#e0e7ff" : "#fff",
                            color: isSelected ? "#4338ca" : "#475569",
                            border: isSelected ? "1px solid #818cf8" : "1px solid #e2e8f0",
                            fontWeight: isSelected ? "bold" : "normal",
                            textAlign: "center",
                            transition: "all 0.1s"
                          }}
                        >
                          {dong}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 12 }}>※ 여러 동을 중복해서 선택할 수 있습니다. 선택된 동의 매물만 표시됩니다.</div>
                </div>
              )}

              {category === "경매/공매" ? (
                <div style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 15.5, padding: "0 4px", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: "#111" }}>경매/공매 필터</span>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => { setAuctionAppraisalMin(""); setAuctionAppraisalMax(""); setAuctionBidPriceMin(""); setAuctionBidPriceMax(""); setAuctionDiscount(""); setAuctionBidCount(""); setMinArea(""); setMaxArea(""); setMinSupplyArea(""); setMaxSupplyArea(""); setKeyword(""); setSelectedDongs([]); setCategory(""); setCurrentPage(1); }} style={{ background: "#fff", border: "1px solid #cbd5e1", color: "#555", padding: "6px 14px", borderRadius: 4, fontSize: 13, cursor: "pointer", fontWeight: "bold", whiteSpace: "nowrap" }}>옵션 초기화</button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 20, alignItems: "center", fontSize: 15.5, padding: "0 4px" }}>
                  <span style={{ fontWeight: 700, color: "#111", width: 60 }}>거래방식</span>
                  {TRADE_OPTIONS.map(opt => (
                    <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "#111" }}>
                      <input type="checkbox" checked={opt.value === "" ? (["매매","전세","월세","단기임대"].every(v => tradeTypes.includes(v))) : tradeTypes.includes(opt.value)} onChange={() => { if (opt.value === "") { const all = ["매매","전세","월세","단기임대"]; setTradeTypes(prev => all.every(v => prev.includes(v)) ? [] : all); } else { setTradeTypes(prev => prev.includes(opt.value) ? prev.filter(t => t !== opt.value) : [...prev, opt.value]); } setCurrentPage(1); }} style={{ zoom: 1.1 }} />
                      {opt.label || "전체"}
                    </label>
                  ))}
                  <div style={{ width: 1, height: 20, background: "#cbd5e1", margin: "0 4px" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontWeight: 700, color: "#111" }}>등록자구분</span>
                    <select value={registrantFilter} onChange={e => { setRegistrantFilter(e.target.value); setCurrentPage(1); }} style={{ border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4, width: 90, outline: "none" }}><option value="">모두</option><option value="부동산">부동산</option><option value="일반인">일반인</option></select>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontWeight: 700, color: "#111" }}>법정수수료</span>
                    <select value={commissionFilter} onChange={e => { setCommissionFilter(e.target.value); setCurrentPage(1); }} style={{ border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4, width: 100, outline: "none" }}><option value="">모두</option><option value="공동중개">공동중개</option><option value="25">중개보수25%↑</option><option value="50">중개보수50%↑</option><option value="법정">법정수수료</option></select>
                  </div>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => { setTradeTypes([]); setCategory(""); setMaxSalePrice(""); setMinSalePrice(""); setMaxDeposit(""); setMinDeposit(""); setMaxMonthlyRent(""); setMinMonthlyRent(""); setSelectedDongs([]); setRoomsFilter(""); setBathroomsFilter(""); setDirectionFilter(""); setFloorFilter(""); setMinArea(""); setMaxArea(""); setMinSupplyArea(""); setMaxSupplyArea(""); setKeyword(""); setThemeFilter(""); setRegistrantFilter(""); setCommissionFilter(""); setCurrentPage(1); }} style={{ background: "#fff", border: "1px solid #cbd5e1", color: "#555", padding: "6px 14px", borderRadius: 4, fontSize: 13, cursor: "pointer", fontWeight: "bold", whiteSpace: "nowrap" }}>옵션 초기화</button>
                </div>
              )}
              {category === "경매/공매" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 15.5, background: "#f8fafc", padding: "16px 20px", borderRadius: 6, border: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontWeight: 700, color: "#111", width: 60 }}>감정가</span><input type="text" style={{ width: 80, border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4 }} placeholder="최소" value={auctionAppraisalMin} onChange={e => setAuctionAppraisalMin(e.target.value)} /><span>~</span><input type="text" style={{ width: 80, border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4 }} placeholder="최대" value={auctionAppraisalMax} onChange={e => setAuctionAppraisalMax(e.target.value)} /><span style={{ fontSize: 12, color: "#111" }}>만원</span></div>
                    <div style={{ width: 1, height: 20, background: "#cbd5e1" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontWeight: 700, color: "#111", width: 75 }}>최저입찰가</span><input type="text" style={{ width: 80, border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4 }} placeholder="최소" value={auctionBidPriceMin} onChange={e => setAuctionBidPriceMin(e.target.value)} /><span>~</span><input type="text" style={{ width: 80, border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4 }} placeholder="최대" value={auctionBidPriceMax} onChange={e => setAuctionBidPriceMax(e.target.value)} /><span style={{ fontSize: 12, color: "#111" }}>만원</span></div>
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontWeight: 700, color: "#111" }}>할인율</span>{["", "10", "20", "30", "50"].map(d => (<button key={d} onClick={() => { setAuctionDiscount(d); setCurrentPage(1); }} style={{ padding: "4px 14px", fontSize: 13, borderRadius: 20, cursor: "pointer", fontWeight: 600, border: auctionDiscount === d ? `1px solid ${BRAND}` : "1px solid #d1d5db", background: auctionDiscount === d ? BRAND : "#fff", color: auctionDiscount === d ? "#fff" : "#555" }}>{d === "" ? "전체" : `▼${d}%↑`}</button>))}</div>
                    <div style={{ width: 1, height: 20, background: "#cbd5e1" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontWeight: 700, color: "#111" }}>유찰횟수</span><select value={auctionBidCount} onChange={e => { setAuctionBidCount(e.target.value); setCurrentPage(1); }} style={{ border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4, width: 80, outline: "none" }}><option value="">전체</option><option value="1">1회↑</option><option value="2">2회↑</option><option value="3">3회↑</option><option value="5">5회↑</option></select></div>
                    <div style={{ width: 1, height: 20, background: "#cbd5e1" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontWeight: 700, color: "#111" }}>면적</span><input type="text" style={{ width: 55, border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4 }} placeholder="최소" value={minArea} onChange={e => setMinArea(e.target.value)} /><span>~</span><input type="text" style={{ width: 55, border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4 }} placeholder="최대" value={maxArea} onChange={e => setMaxArea(e.target.value)} /><span style={{ fontSize: 12, color: "#111" }}>㎡</span></div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 15.5, background: "#f8fafc", padding: "16px 20px", borderRadius: 6, border: "1px solid #f1f5f9" }}>                {/* 1행: 가격 범위 필터 */}                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>                  {(tradeTypes.length === 0 || tradeTypes.includes("매매")) && (                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>                      <span style={{ fontWeight: 700, color: "#111", width: 50 }}>매매가</span>                      <input type="text" style={{ width: 60, border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4 }} placeholder="최소" value={minSalePrice} onChange={e => setMinSalePrice(e.target.value)} />                      <span>~</span>                      <input type="text" style={{ width: 60, border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4 }} placeholder="최대" value={maxSalePrice} onChange={e => setMaxSalePrice(e.target.value)} />                      <span style={{ fontSize: 12, color: "#111" }}>만원</span>                    </div>                  )}                  {(tradeTypes.length === 0 || tradeTypes.some(t => ["전세", "월세", "단기임대"].includes(t))) && (                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>                      <span style={{ fontWeight: 700, color: "#111", width: 50 }}>{tradeTypes.includes("전세") && !tradeTypes.some(t => ["월세", "단기임대"].includes(t)) ? "전세금" : "보증금"}</span>                      <input type="text" style={{ width: 60, border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4 }} placeholder="최소" value={minDeposit} onChange={e => setMinDeposit(e.target.value)} />                      <span>~</span>                      <input type="text" style={{ width: 60, border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4 }} placeholder="최대" value={maxDeposit} onChange={e => setMaxDeposit(e.target.value)} />                      <span style={{ fontSize: 12, color: "#111" }}>만원</span>                    </div>                  )}                  {(tradeTypes.length === 0 || tradeTypes.some(t => ["월세", "단기임대"].includes(t))) && (                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>                      <span style={{ fontWeight: 700, color: "#111", width: 35 }}>월세</span>                      <input type="text" style={{ width: 60, border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4 }} placeholder="최소" value={minMonthlyRent} onChange={e => setMinMonthlyRent(e.target.value)} />                      <span>~</span>                      <input type="text" style={{ width: 60, border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4 }} placeholder="최대" value={maxMonthlyRent} onChange={e => setMaxMonthlyRent(e.target.value)} />                      <span style={{ fontSize: 12, color: "#111" }}>만원</span>                    </div>                  )}                </div>                {/* 2행: 면적 + 카테고리별 조건 */}                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>                    <span style={{ fontWeight: 700, color: "#111" }}>공급면적</span>                    <input type="text" style={{ width: 55, border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4 }} placeholder="최소" value={minSupplyArea} onChange={e => setMinSupplyArea(e.target.value)} />                    <span>~</span>                    <input type="text" style={{ width: 55, border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4 }} placeholder="최대" value={maxSupplyArea} onChange={e => setMaxSupplyArea(e.target.value)} />                    <span style={{ fontSize: 12, color: "#111" }}>평</span>                  </div>                  <div style={{ width: 1, height: 20, background: "#cbd5e1" }} />                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>                    <span style={{ fontWeight: 700, color: "#111" }}>전용면적</span>                    <input type="text" style={{ width: 55, border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4 }} placeholder="최소" value={minArea} onChange={e => setMinArea(e.target.value)} />                    <span>~</span>                    <input type="text" style={{ width: 55, border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4 }} placeholder="최대" value={maxArea} onChange={e => setMaxArea(e.target.value)} />                    <span style={{ fontSize: 12, color: "#111" }}>평</span>                  </div>                  <div style={{ width: 1, height: 20, background: "#cbd5e1" }} />                  {/* 주거형: 방수, 욕실, 방향 */}                  {(!category || ["아파트", "오피스텔", "빌라/연립", "단독/다가구", "전원주택", "풀옵션"].includes(category)) && (                    <>                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>                        <span style={{ fontWeight: 700, color: "#111" }}>방수</span>                        <select value={roomsFilter} onChange={e => { setRoomsFilter(e.target.value); setCurrentPage(1); }} style={{ border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4, width: 80, outline: "none" }}>                          <option value="">전체</option><option value="1">1개</option><option value="2">2개</option><option value="3">3개</option><option value="4">4+</option>                        </select>                      </div>                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>                        <span style={{ fontWeight: 700, color: "#111" }}>욕실</span>                        <select value={bathroomsFilter} onChange={e => { setBathroomsFilter(e.target.value); setCurrentPage(1); }} style={{ border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4, width: 80, outline: "none" }}>                          <option value="">전체</option><option value="1">1개</option><option value="2">2개</option><option value="3">3+</option>                        </select>                      </div>                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>                        <span style={{ fontWeight: 700, color: "#111" }}>방향</span>                        <select value={directionFilter} onChange={e => { setDirectionFilter(e.target.value); setCurrentPage(1); }} style={{ border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4, width: 80, outline: "none" }}>                          <option value="">전체</option><option value="남향">남향</option><option value="동향">동향</option><option value="서향">서향</option><option value="북향">북향</option><option value="남동향">남동향</option><option value="남서향">남서향</option>                        </select>                      </div>                    </>                  )}                  {/* 상업용: 층수 */}                  {["상가", "사무실", "건물/빌딩", "공장/창고", "토지/기타"].includes(category) && (                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>                      <span style={{ fontWeight: 700, color: "#111" }}>층수</span>                      <select value={floorFilter} onChange={e => { setFloorFilter(e.target.value); setCurrentPage(1); }} style={{ border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4, width: 90, outline: "none" }}>                        <option value="">전체</option><option value="지하">지하</option><option value="1층">1층</option><option value="2층이상">2층+</option>                      </select>                    </div>                  )}                </div>                {/* 3행: 테마 + 초기화 */}                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>                    <span style={{ fontWeight: 700, color: "#111" }}>테마</span>                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>                      {["신축급", "올수리", "풀옵션", "역세권", "한강뷰", "오피스텔"].map(t => (                        <button key={t} onClick={() => { setThemeFilter(prev => prev === t ? "" : t); setCurrentPage(1); }} style={{ padding: "4px 12px", fontSize: 12, borderRadius: 20, cursor: "pointer", fontWeight: 600, border: themeFilter === t ? `1px solid ${BRAND}` : "1px solid #d1d5db", background: themeFilter === t ? BRAND : "#fff", color: themeFilter === t ? "#fff" : "#555", transition: "all 0.15s" }}>#{t}</button>                      ))}                    </div>                  </div>                  
                </div>
                </div>
              )}

            </div>
          </div>

                  {/* ── Wide Card Listings ── */}
            <div style={{ padding: "16px 20px", borderBottom: "2px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#111" }}>총 <span style={{ color: BRAND }}>{filtered.length.toLocaleString()}</span>건의 공실 매물</div>
              <select style={{ border: "1px solid #cbd5e1", padding: "6px 12px", fontSize: 13, borderRadius: 4, outline: "none" }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="latest">최신 등록순</option>
                <option value="price_asc">가격 낮은순</option>
                <option value="price_desc">가격 높은순</option>
              </select>
            </div>

            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", color: "#888" }}>
                <span style={{ display: "inline-block", width: 28, height: 28, border: "3px solid #ddd", borderTop: `3px solid ${BRAND}`, borderRadius: "50%", animation: "spin 1s linear infinite", marginRight: 12 }}></span>
                공실광고 데이터를 불러오고 있습니다...
              </div>
            ) : paged.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#aaa" }}>
                <span style={{ fontSize: 40, display: "block", marginBottom: 12 }}>🏠</span>
                검색 조건에 해당하는 공실광고가 없습니다.
              </div>
            ) : (
              <div>
                {paged.map((v, idx) => {
                  const isMasked = v.exposure_type === '부동산노출' && userLevel < 2;
                  const showCommission = userLevel >= 2;
                  const addrText = v.building_name || `${v.sigungu || ""} ${v.dong || ""} 공실광고`;
                  
                  return (
                    <div key={v.id} style={{ borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
                      <div onClick={() => { 
                        if (isMasked) { setIsAuthModalOpen(true); return; }
                        setExpandedIds(prev => prev.includes(v.id) ? prev.filter(x => x !== v.id) : [...prev, v.id]); 
                      }} style={{ display: "flex", padding: "16px 0", alignItems: "center", cursor: "pointer", transition: "background 0.15s" }} onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      
                      {/* 1. Checkbox */}
                      <div style={{ width: 40, display: "flex", justifyContent: "center", alignItems: "center", flexShrink: 0 }}>
                        <input type="checkbox" onClick={e => e.stopPropagation()} style={{ zoom: 1.3, cursor: "pointer" }} />
                      </div>

                      {/* 2. Photo */}
                      <div style={{ width: 140, height: 105, overflow: "hidden", flexShrink: 0, background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 4 }}>
                        {v.photos?.length > 0 ? (
                          <img src={v.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : v.lat && v.lng && mapLoaded ? (
                          <ThumbnailRoadview lat={v.lat} lng={v.lng} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: 12 }}>No Photo</div>
                        )}
                      </div>
                      
                      {/* 3. Main Info */}
                      <div style={{ flex: 1, minWidth: 0, paddingLeft: 20 }}>
                        <div style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "center" }}>
                          {showCommission && (v.realtor_commission || v.commission_type) && (
                            <span style={{ display: "inline-block", background: "#fff", color: "#fa5252", border: "1px solid #fa5252", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>
                              {v.realtor_commission || v.commission_type}
                            </span>
                          )}
                          <span style={{ display: "inline-block", fontSize: 11, color: "#fa5252", border: "1px solid #fa5252", padding: "2px 6px", fontWeight: "bold", borderRadius: 4, background: "#fff" }}>
                            {v.owner_role === 'REALTOR' || v.members?.role === 'REALTOR' ? '부동산' : '일반'}
                          </span>
                          {isMasked && (
                            <span onClick={(e) => { e.stopPropagation(); setIsAuthModalOpen(true); }} style={{ fontSize: 11, color: "#3b82f6", fontWeight: 700, background: "#eef6ff", padding: "3px 8px", borderRadius: 4, cursor: "pointer" }}>🔒 부동산회원 가입 시 무료 열람</span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <span style={{ fontSize: 17, fontWeight: 800, color: isMasked ? "#bbb" : "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: isMasked ? 1 : 0 }}>
                            {isMasked ? addrText.replace(/[^s]/g, "X") : addrText} {v.property_type && `(${v.property_type})`}
                          </span>
                          <span style={{ background: "#fbbf24", color: "#fff", fontSize: 10, fontWeight: "bold", padding: "1px 4px", borderRadius: 2 }}>N</span>
                        </div>
                        <div style={{ fontSize: 14, color: "#444", lineHeight: 1.5, fontWeight: 500 }}>
                          공급 {v.area_m2 ? Math.round(v.area_m2 * 1.2) : 0}m²({v.area_m2 ? Math.round(v.area_m2 * 1.2 / 3.3) : 0}P) / 
                          전용 {v.area_m2 || 0}m²({v.area_m2 ? Math.round(v.area_m2 / 3.3) : 0}P) 
                          <span style={{ color: "#1a365d", marginLeft: 4, fontWeight: 700 }}>{v.property_type}{v.sub_category ? `/${v.sub_category}` : ""}</span> 공실
                        </div>
                        <div style={{ fontSize: 13, color: "#777", marginTop: 4 }}>
                          {v.floor || "해당층"}/{v.total_floors || "전체층"}, 
                          {v.parking_spots ? ` 주차${v.parking_spots}` : " 주차불가"}, 
                          {v.completion_year ? ` ${v.completion_year}년` : " 연식미상"}
                          {(v.realtor_commission || v.commission_type) && `, ${v.realtor_commission || v.commission_type}`}
                        </div>
                      </div>

                      {/* 4. Price */}
                      <div style={{ width: 160, flexShrink: 0, textAlign: "center", borderLeft: "1px solid #f1f5f9", borderRight: "1px solid #f1f5f9", padding: "0 10px" }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#111", marginBottom: 6 }}>
                          {getPriceLabel(v)} {getPriceText(v).replace('만', '').replace('억', '')}
                        </div>
                        <div style={{ fontSize: 12, color: "#888" }}>
                          관리비 {Math.floor((v.maintenance_fee || 0)/10000)}만
                        </div>
                      </div>

                      {/* 5. Actions */}
                      <div style={{ width: 140, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, paddingRight: 10 }}>
                        <button onClick={e => e.stopPropagation()} style={{ width: 110, background: "#1a365d", color: "#fff", border: "none", padding: "8px 0", fontSize: 13, fontWeight: "bold", borderRadius: 4, cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                          연락처보기
                        </button>
                        <div style={{ display: "flex", width: 110 }}>
                          <button onClick={(e) => { e.stopPropagation(); router.push(`/homepage/${v.id}`); }} style={{ width: "100%", background: "#fff", color: "#555", border: "1px solid #cbd5e1", padding: "6px 0", fontSize: 12, fontWeight: 600, cursor: "pointer", borderRadius: 4 }}>
                            상세보기
                          </button>
                        </div>
                      </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedIds.includes(v.id) && (
                        <div style={{ padding: "0 24px 24px 40px", background: "#fff", cursor: "default" }} onClick={e => e.stopPropagation()}>
                          <div style={{ borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", borderLeft: "1px solid #e2e8f0", display: "grid", gridTemplateColumns: "130px 1fr 130px 1fr", fontSize: 14 }}>
                            {[
                              { l1: "공실광고번호", v1: String(v.id).split('-')[0].toUpperCase(), l2: "방/욕실수", v2: `${v.rooms || 0}개 / ${v.bathrooms || 0}개` },
                              { l1: "소재지", v1: `${v.sido} ${v.sigungu} ${v.dong} ${v.detail_addr || ""}`.trim(), l2: "방향", v2: v.direction || "남향" },
                              { l1: "공실광고특징", v1: v.building_name || "특징 없음", l2: "주차가능 여부", v2: v.parking_spots ? `${v.parking_spots}대` : "불가" },
                              { l1: "공급/전용면적", v1: `${Math.round((v.area_m2 || 0) * 1.3)}m² / ${v.area_m2 || 0}m²`, l2: "입주가능일", v2: v.move_in_date || "1개월 이내" },
                              { l1: "해당층/총층", v1: `${v.floor || "해당층"} / ${v.total_floors || "전체층"}`, l2: "관리비", v2: v.maintenance_fee ? `${Math.round(v.maintenance_fee/10000)}만원` : "10만원" },
                              { l1: "등록자명", v1: (() => {
                                const m = v.members;
                                if (!m) return v.client_name || "-";
                                if (m.role === 'REALTOR' && m.agencies && m.agencies.length > 0) return m.agencies[0].agency_name || m.name || v.client_name || "-";
                                return m.name || v.client_name || "-";
                              })(), l2: "연락처", v2: (() => {
                                const m = v.members;
                                if (!m) return v.client_phone || "-";
                                if (m.role === 'REALTOR' && m.agencies && m.agencies.length > 0) return m.agencies[0].phone || m.phone || v.client_phone || "-";
                                return m.phone || v.client_phone || "-";
                              })() }
                            ].map((row, i, arr) => (
                              <div key={i} style={{ display: "contents" }}>
                                <div style={{ background: "#f8f9fa", padding: "12px 16px", fontWeight: "bold", color: "#555", borderBottom: i === arr.length - 1 ? "none" : "1px solid #f1f5f9", display: "flex", alignItems: "center" }}>{row.l1}</div>
                                <div style={{ padding: "12px 16px", color: "#111", borderBottom: i === arr.length - 1 ? "none" : "1px solid #f1f5f9", display: "flex", alignItems: "center" }}>{row.v1}</div>
                                <div style={{ background: "#f8f9fa", padding: "12px 16px", fontWeight: "bold", color: "555", borderBottom: i === arr.length - 1 ? "none" : "1px solid #f1f5f9", borderLeft: "1px solid #f1f5f9", display: "flex", alignItems: "center" }}>{row.l2}</div>
                                <div style={{ padding: "12px 16px", color: "#111", borderBottom: i === arr.length - 1 ? "none" : "1px solid #f1f5f9", display: "flex", alignItems: "center" }}>{row.v2}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
{/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "24px 0" }}>
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} style={{ ...pageBtn(false), opacity: currentPage === 1 ? 0.4 : 1 }}>«</button>
              <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} style={{ ...pageBtn(false), opacity: currentPage === 1 ? 0.4 : 1 }}>‹</button>
              {Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(currentPage - 5, totalPages - 9));
                const p = start + i;
                if (p > totalPages) return null;
                return <button key={p} onClick={() => setCurrentPage(p)} style={pageBtn(p === currentPage)}>{p}</button>;
              })}
              <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} style={{ ...pageBtn(false), opacity: currentPage === totalPages ? 0.4 : 1 }}>›</button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} style={{ ...pageBtn(false), opacity: currentPage === totalPages ? 0.4 : 1 }}>»</button>
            </div>
          )}

        </div>
      </div>
      {isAuthModalOpen && <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />}
    </div>
  );
}
