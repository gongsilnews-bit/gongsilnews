"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getVacancies } from "@/app/actions/vacancy";
import { getMapBlocks } from "@/app/actions/map_blocks";
import MapSearchBar from "@/components/MapSearchBar";
import { getPermissionLevel } from "@/utils/permissionCheck";
import AuthModal from "@/components/AuthModal";
import { getAuctionInfo } from "@/app/(map)/gongsil/gongsilHelpers";

export const HOMEPAGE_CATEGORIES = [
  {
    id: "all",
    label: "전체매물",
    icon: "🏠",
    subCategories: []
  },
  {
    id: "apart",
    label: "아파트·오피스텔",
    icon: "🏢",
    subCategories: [
      { name: "아파트", types: ["매", "전", "월", "단"] },
      { name: "오피스텔", types: ["매", "전", "월", "단"] },
      { name: "기타", types: ["매", "전", "월", "단"] }
    ]
  },
  {
    id: "villa",
    label: "빌라·주택",
    icon: "🏡",
    subCategories: [
      { name: "빌라/연립", types: ["매", "전", "월", "단"] },
      { name: "단독/다가구", types: ["매", "전", "월", "단"] },
      { name: "전원주택", types: ["매", "전", "월", "단"] }
    ]
  },
  {
    id: "one",
    label: "원룸·투룸(풀옵션)",
    icon: "🛏️",
    subCategories: [
      { name: "원룸", types: ["전", "월", "단"] },
      { name: "1.5룸", types: ["전", "월", "단"] },
      { name: "투룸", types: ["전", "월", "단"] }
    ]
  },
  {
    id: "biz",
    label: "상가·사무실·공장·토지",
    icon: "🏬",
    subCategories: [
      { name: "상가", types: ["매", "전", "월", "단"] },
      { name: "사무실", types: ["매", "전", "월", "단"] },
      { name: "지식산업센터", types: ["매", "전", "월", "단"] },
      { name: "건물/빌딩", types: ["매", "전", "월", "단"] },
      { name: "공장/창고", types: ["매", "전", "월", "단"] },
      { name: "토지", types: ["매", "전", "월", "단"] }
    ]
  },
  {
    id: "sale",
    label: "신축/분양",
    icon: "🏗️",
    subCategories: [
      { name: "아파트분양", types: ["매"] },
      { name: "오피스텔분양", types: ["매"] },
      { name: "상가분양", types: ["매"] }
    ]
  },
  {
    id: "auction",
    label: "법원 경·공매",
    icon: "🔨",
    subCategories: [
      { name: "아파트", types: ["매"] },
      { name: "단독/다가구", types: ["매"] },
      { name: "빌라/주택", types: ["매"] },
      { name: "빌딩/사무실", types: ["매"] },
      { name: "공장/창고", types: ["매"] },
      { name: "토지", types: ["매"] }
    ]
  }
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

  const [mainCategory, setMainCategory] = useState<string>("all");
  const [subCategory, setSubCategory] = useState<string>("");
  const [expandedMenu, setExpandedMenu] = useState<string | null>("apart");
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
  const [isDetailFilterOpen, setIsDetailFilterOpen] = useState(false);
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
        const { data: memberData } = await client.from('members').select('role, plan_type, agencies(status)').eq('id', data.user.id).single();
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
      center: new kakao.maps.LatLng(37.498095, 127.02761), level: 6, draggable: true,
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
    // 1차/2차 카테고리 필터링 (지도검색 표준 체계와 100% 동일 일치)
    if (mainCategory && mainCategory !== "all") {
      const isAuctionCategory = mainCategory === "auction";
      
      list = list.filter((v: any) => {
        const isAuction = v.trade_type === "경매" || v.trade_type === "공매";
        if (isAuctionCategory) {
          if (!isAuction) return false;
          if (!subCategory) return true; // 경매 전체
          
          // 경매 6대 자산 세부분류 매칭 (gongsilHelpers 동일)
          const meta = v.metadata || {};
          const mcls = meta.cltrUsgMclsCtgrNm || "";
          const scls = meta.cltrUsgSclsCtgrNm || "";
          if (subCategory === "아파트") return scls.includes("아파트") || scls.includes("오피스텔") || scls.includes("공동주택");
          if (subCategory === "단독/다가구") return scls.includes("단독") || scls.includes("다가구") || scls.includes("주택");
          if (subCategory === "빌라/주택") return (mcls.includes("주거") || scls.includes("주택") || scls.includes("빌라") || scls.includes("다세대") || scls.includes("연립")) && !scls.includes("아파트");
          if (subCategory === "빌딩/사무실") return mcls.includes("상업") || scls.includes("상가") || scls.includes("점포") || scls.includes("판매") || scls.includes("사무") || mcls.includes("업무") || scls.includes("오피스텔") || scls.includes("아파트형") || scls.includes("지식산업") || mcls.includes("근린생활") || scls.includes("상가주택") || scls.includes("빌딩") || mcls.includes("숙박") || mcls.includes("의료") || scls.includes("업무시설");
          if (subCategory === "공장/창고") return (scls.includes("공장") || scls.includes("창고") || scls.includes("제조") || mcls.includes("산업") || mcls.includes("공장")) && !scls.includes("아파트형") && !scls.includes("지식산업");
          if (subCategory === "토지") return mcls.includes("토지") || scls.includes("토지") || mcls.includes("대지") || scls.includes("대지") || mcls.includes("임야") || mcls.includes("전") || mcls.includes("답") || mcls.includes("잡종지") || mcls.includes("과수원");
          return true;
        }

        // 일반 공실 모드인 경우 경매 매물은 숨김
        if (isAuction) return false;

        const propType = v.property_type || "";
        const subCat = v.sub_category || "";
        const themes = Array.isArray(v.themes) ? v.themes : [];

        // ① 아파트·오피스텔
        if (mainCategory === "apart") {
          const isMatchMain = propType === "아파트·오피스텔" || ["아파트", "오피스텔", "기타"].includes(subCat);
          if (!isMatchMain) return false;
          if (!subCategory) return true;
          if (subCategory === "아파트") return subCat === "아파트" || (!subCat && propType === "아파트·오피스텔");
          if (subCategory === "오피스텔") return subCat === "오피스텔" || themes.includes("오피스텔");
          if (subCategory === "기타") return ["아파트분양권", "재건축", "오피스텔분양권", "재개발"].includes(subCat);
          return true;
        }

        // ② 빌라·주택
        if (mainCategory === "villa") {
          const isMatchMain = propType === "빌라·주택" || ["빌라/연립", "단독/다가구", "전원주택", "빌라", "연립", "단독", "다가구", "상가주택"].includes(subCat);
          if (!isMatchMain) return false;
          if (!subCategory) return true;
          if (subCategory === "빌라/연립") return subCat === "빌라/연립" || subCat === "빌라" || subCat === "연립" || subCat === "다세대";
          if (subCategory === "단독/다가구") return subCat === "단독/다가구" || subCat === "단독" || subCat === "다가구" || subCat === "상가주택";
          if (subCategory === "전원주택") return subCat === "전원주택";
          return true;
        }

        // ③ 원룸·투룸(풀옵션)
        if (mainCategory === "one") {
          const isMatchMain = propType === "원룸·투룸(풀옵션)" || ["원룸", "1.5룸", "투룸"].includes(subCat) || themes.includes("풀옵션");
          if (!isMatchMain) return false;
          if (!subCategory) return true;
          if (subCategory === "원룸") return subCat === "원룸" || (!subCat && propType === "원룸·투룸(풀옵션)");
          if (subCategory === "1.5룸") return subCat === "1.5룸";
          if (subCategory === "투룸") return subCat === "투룸";
          return true;
        }

        // ④ 상가·사무실·공장·토지
        if (mainCategory === "biz") {
          const isMatchMain = propType === "상가·사무실·건물·공장·토지" || propType === "상가·사무실·공장·토지" || ["상가", "사무실", "지식산업센터", "건물/빌딩", "공장/창고", "토지", "건물", "빌딩"].includes(subCat);
          if (!isMatchMain) return false;
          if (!subCategory) return true;
          if (subCategory === "상가") return subCat === "상가" || subCat === "근린상가" || subCat === "상가건물" || subCat === "상가/점포";
          if (subCategory === "사무실") return subCat === "사무실" || subCat === "업무시설";
          if (subCategory === "지식산업센터") return subCat === "지식산업센터" || subCat === "아파트형공장";
          if (subCategory === "건물/빌딩") return subCat === "건물/빌딩" || subCat === "건물" || subCat === "빌딩/건물" || subCat === "빌딩";
          if (subCategory === "공장/창고") return subCat === "공장/창고" || subCat === "공장" || subCat === "창고";
          if (subCategory === "토지") return subCat === "토지" || subCat === "대지" || subCat === "임야";
          return true;
        }

        // ⑤ 신축/분양
        if (mainCategory === "sale") {
          const isMatchMain = propType === "분양" || subCat.includes("분양");
          if (!isMatchMain) return false;
          if (!subCategory) return true;
          return subCat.includes(subCategory.replace("분양", "")) || subCat === subCategory;
        }

        return true;
      });
    }
    if (tradeTypes.length > 0 && mainCategory !== "auction") list = list.filter(v => tradeTypes.includes(v.trade_type));
    
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
    if (mainCategory === "auction") {
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
  }, [vacancies, mainCategory, subCategory, tradeTypes, sido, sigungu, selectedDongs, sortBy, maxSalePrice, maxDeposit, maxMonthlyRent, minSalePrice, minDeposit, minMonthlyRent, roomsFilter, bathroomsFilter, directionFilter, floorFilter, minArea, maxArea, minSupplyArea, maxSupplyArea, keyword, themeFilter, registrantFilter, commissionFilter, auctionAppraisalMin, auctionAppraisalMax, auctionBidPriceMin, auctionBidPriceMax, auctionDiscount, auctionBidCount]);

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
    if (v.trade_type === "경매" || v.trade_type === "공매") return formatAmount(v.deposit);
    if (v.trade_type === "매매" || v.trade_type === "전세") return formatAmount(v.deposit);
    if (v.monthly_rent && v.monthly_rent > 0) {
      const monthlyManwon = Math.round(v.monthly_rent / 10000);
      return `${formatAmount(v.deposit)} / ${monthlyManwon}만`;
    }
    return formatAmount(v.deposit);
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
    <div style={{ background: "#f8fafc", minHeight: "100vh", padding: "24px 0 60px 0" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px", display: "flex", gap: 24, alignItems: "flex-start" }}>
        
        {/* ── Left Sidebar (LNB) ── */}
        <div style={{ width: 230, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* User Info Block */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "18px 20px", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>회원 등급</div>
            {userLevel >= 2 ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, color: "#0f172a", fontSize: 16 }}>
                  <span>🏢</span> 부동산 중개회원
                </div>
                <div style={{ display: "inline-block", background: "#eff6ff", color: "#2563eb", fontSize: 11.5, fontWeight: 700, padding: "2px 8px", borderRadius: 4, marginTop: 6 }}>
                  ✓ 모든 매물 실시간 열람 가능
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, color: "#0f172a", fontSize: 16 }}>
                  <span>👤</span> 일반회원
                </div>
                <div style={{ display: "inline-block", background: "#fef2f2", color: "#ef4444", fontSize: 11.5, fontWeight: 700, padding: "2px 8px", borderRadius: 4, marginTop: 6 }}>
                  🔒 일부 매물 열람 제한
                </div>
                <button onClick={() => setIsAuthModalOpen(true)} style={{ width: "100%", marginTop: 12, background: BRAND, color: "#fff", border: "none", padding: "8px 0", fontSize: 12.5, borderRadius: 6, cursor: "pointer", fontWeight: 700, transition: "opacity 0.2s" }} onMouseEnter={e => e.currentTarget.style.opacity = "0.9"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                  중개사회원 인증하기
                </button>
              </>
            )}
          </div>

          {/* Categories Accordion */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
            <div style={{ padding: "14px 18px", background: "#fff", borderBottom: "1px solid #f1f5f9", fontWeight: 800, fontSize: 14.5, color: "#0f172a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>매물 카테고리</span>
              <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>대분류 · 중분류</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {HOMEPAGE_CATEGORIES.map((cat, i) => {
                const isMainActive = mainCategory === cat.id;
                const isExpanded = expandedMenu === cat.id;
                const hasSubs = cat.subCategories.length > 0;

                return (
                  <div key={cat.id} style={{ borderBottom: i === HOMEPAGE_CATEGORIES.length - 1 ? "none" : "1px solid #f8fafc" }}>
                    {/* 1차 대분류 헤더 */}
                    <div
                      onClick={() => {
                        if (cat.id === "all") {
                          setMainCategory("all");
                          setSubCategory("");
                          setExpandedMenu(null);
                        } else {
                          setMainCategory(cat.id);
                          setSubCategory("");
                          setExpandedMenu(isExpanded ? null : cat.id);
                        }
                        setCurrentPage(1);
                      }}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 18px",
                        cursor: "pointer",
                        background: isMainActive && !subCategory ? "#eff6ff" : isMainActive ? "#f8fafc" : "#fff",
                        borderLeft: isMainActive ? `3px solid ${BRAND}` : "3px solid transparent",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={e => {
                        if (!(isMainActive && !subCategory)) e.currentTarget.style.background = "#f8fafc";
                      }}
                      onMouseLeave={e => {
                        if (!(isMainActive && !subCategory)) e.currentTarget.style.background = isMainActive ? "#f8fafc" : "#fff";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: isMainActive ? 800 : 600, color: isMainActive ? BRAND : "#334155" }}>
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </div>
                      {hasSubs && (
                        <span style={{ fontSize: 10, color: isMainActive ? BRAND : "#94a3b8", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                          ▼
                        </span>
                      )}
                    </div>

                    {/* 2차 세부분류 본문 */}
                    {hasSubs && isExpanded && (
                      <div style={{ background: "#f8fafc", padding: "4px 0", borderTop: "1px solid #f1f5f9" }}>
                        <div
                          onClick={() => {
                            setMainCategory(cat.id);
                            setSubCategory("");
                            setCurrentPage(1);
                          }}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "7px 18px 7px 34px",
                            cursor: "pointer",
                            fontSize: 12.5,
                            fontWeight: isMainActive && !subCategory ? 700 : 500,
                            color: isMainActive && !subCategory ? BRAND : "#64748b",
                            background: isMainActive && !subCategory ? "#e2edff" : "transparent",
                          }}
                        >
                          <span>• {cat.label} 전체</span>
                        </div>

                        {cat.subCategories.map(sub => {
                          const isSubActive = isMainActive && subCategory === sub.name;
                          return (
                            <div
                              key={sub.name}
                              onClick={() => {
                                setMainCategory(cat.id);
                                setSubCategory(sub.name);
                                setCurrentPage(1);
                              }}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "7px 16px 7px 34px",
                                cursor: "pointer",
                                fontSize: 12.5,
                                fontWeight: isSubActive ? 700 : 500,
                                color: isSubActive ? BRAND : "#475569",
                                background: isSubActive ? "#e2edff" : "transparent",
                                transition: "background 0.1s",
                              }}
                              onMouseEnter={e => {
                                if (!isSubActive) e.currentTarget.style.background = "#f1f5f9";
                              }}
                              onMouseLeave={e => {
                                if (!isSubActive) e.currentTarget.style.background = "transparent";
                              }}
                            >
                              <span>{sub.name}</span>
                              <div style={{ display: "flex", gap: 3 }}>
                                {sub.types.includes("매") && (
                                  <span
                                    onClick={e => {
                                      e.stopPropagation();
                                      setMainCategory(cat.id);
                                      setSubCategory(sub.name);
                                      setTradeTypes(["매매"]);
                                      setCurrentPage(1);
                                    }}
                                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, fontSize: 9, fontWeight: 700, background: tradeTypes.includes("매매") && isSubActive ? "#ef4444" : "#fee2e2", color: tradeTypes.includes("매매") && isSubActive ? "#fff" : "#ef4444", borderRadius: 3, cursor: "pointer" }}
                                    title="매매"
                                  >
                                    매
                                  </span>
                                )}
                                {sub.types.includes("전") && (
                                  <span
                                    onClick={e => {
                                      e.stopPropagation();
                                      setMainCategory(cat.id);
                                      setSubCategory(sub.name);
                                      setTradeTypes(["전세"]);
                                      setCurrentPage(1);
                                    }}
                                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, fontSize: 9, fontWeight: 700, background: tradeTypes.includes("전세") && isSubActive ? "#f97316" : "#ffedd5", color: tradeTypes.includes("전세") && isSubActive ? "#fff" : "#f97316", borderRadius: 3, cursor: "pointer" }}
                                    title="전세"
                                  >
                                    전
                                  </span>
                                )}
                                {sub.types.includes("월") && (
                                  <span
                                    onClick={e => {
                                      e.stopPropagation();
                                      setMainCategory(cat.id);
                                      setSubCategory(sub.name);
                                      setTradeTypes(["월세"]);
                                      setCurrentPage(1);
                                    }}
                                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, fontSize: 9, fontWeight: 700, background: tradeTypes.includes("월세") && isSubActive ? "#f59e0b" : "#fef3c7", color: tradeTypes.includes("월세") && isSubActive ? "#fff" : "#f59e0b", borderRadius: 3, cursor: "pointer" }}
                                    title="월세"
                                  >
                                    월
                                  </span>
                                )}
                                {sub.types.includes("단") && (
                                  <span
                                    onClick={e => {
                                      e.stopPropagation();
                                      setMainCategory(cat.id);
                                      setSubCategory(sub.name);
                                      setTradeTypes(["단기임대"]);
                                      setCurrentPage(1);
                                    }}
                                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, fontSize: 9, fontWeight: 700, background: tradeTypes.includes("단기임대") && isSubActive ? "#a855f7" : "#f3e8ff", color: tradeTypes.includes("단기임대") && isSubActive ? "#fff" : "#a855f7", borderRadius: 3, cursor: "pointer" }}
                                    title="단기임대"
                                  >
                                    단
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Right Main Area ── */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          
          {/* ── Top Header & Tab Switch ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", margin: 0, letterSpacing: -0.5 }}>
                공실 매물 검색
              </h1>
              <span style={{ fontSize: 13, color: "#64748b" }}>
                다양한 맞춤 조건으로 실시간 공실을 빠르게 찾아보세요.
              </span>
            </div>

            {/* Segmented View Switch */}
            <div style={{ display: "flex", background: "#e2e8f0", padding: 3, borderRadius: 8 }}>
              <button
                style={{
                  border: "none",
                  background: "#fff",
                  color: BRAND,
                  fontSize: 13,
                  fontWeight: 800,
                  padding: "6px 16px",
                  borderRadius: 6,
                  cursor: "default",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                }}
              >
                📋 리스트검색
              </button>
              <button
                onClick={() => window.location.href = '/gongsil'}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#64748b",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "6px 16px",
                  borderRadius: 6,
                  cursor: "pointer",
                  transition: "color 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "#0f172a"}
                onMouseLeave={e => e.currentTarget.style.color = "#64748b"}
              >
                🗺️ 지도검색
              </button>
            </div>
          </div>

          {/* ── Top Search Filter Box (Unified Minimal Box) ── */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
            
            {/* 1행: 일체형 스마트 검색바 */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <select
                style={{ border: "1px solid #cbd5e1", padding: "0 14px", height: 44, borderRadius: 8, width: 155, fontSize: 13.5, outline: "none", color: "#334155", background: "#fff" }}
                value={mainCategory === "all" ? "" : (subCategory ? `${mainCategory}:${subCategory}` : `${mainCategory}:all`)}
                onChange={e => {
                  const val = e.target.value;
                  if (!val) {
                    setMainCategory("all");
                    setSubCategory("");
                    setExpandedMenu(null);
                  } else {
                    const [m, s] = val.split(":");
                    setMainCategory(m);
                    setSubCategory(s === "all" ? "" : s);
                    setExpandedMenu(m);
                  }
                  setCurrentPage(1);
                }}
              >
                <option value="">물건 전체</option>
                {HOMEPAGE_CATEGORIES.filter(c => c.id !== "all").map(c => (
                  <optgroup key={c.id} label={`${c.icon} ${c.label}`}>
                    <option value={`${c.id}:all`}>{c.label} (전체)</option>
                    {c.subCategories.map(s => (
                      <option key={s.name} value={`${c.id}:${s.name}`}>└ {s.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>

              <select
                style={{ border: "1px solid #cbd5e1", padding: "0 14px", height: 44, borderRadius: 8, width: 130, fontSize: 13.5, outline: "none", color: "#334155", background: "#fff" }}
                value={sido}
                onChange={e => setSido(e.target.value)}
              >
                {SIDO_LIST.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <select
                style={{ border: "1px solid #cbd5e1", padding: "0 14px", height: 44, borderRadius: 8, width: 140, fontSize: 13.5, outline: "none", color: "#334155", background: "#fff" }}
                value={sigungu}
                onChange={e => { setSigungu(e.target.value); setSelectedDongs([]); setCurrentPage(1); }}
              >
                <option value="">시/구/군 전체</option>
                {sigunguList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="번지수 또는 건물명 입력 (예: 논현동 123, 은마아파트)"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') setCurrentPage(1); }}
                  style={{ width: "100%", height: 44, border: "1px solid #cbd5e1", padding: "0 14px", borderRadius: 8, fontSize: 13.5, outline: "none", transition: "border-color 0.2s", boxSizing: "border-box" }}
                  onFocus={e => e.currentTarget.style.borderColor = BRAND}
                  onBlur={e => e.currentTarget.style.borderColor = "#cbd5e1"}
                />
              </div>

              <button
                onClick={() => setCurrentPage(1)}
                style={{ background: BRAND, color: "#fff", border: "none", height: 44, padding: "0 24px", borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "opacity 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                <span>🔍</span> 검색
              </button>
            </div>

            {/* 2행: 빠른 필터 알약 바 (Quick Filter Bar) */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: "1px solid #f1f5f9", flexWrap: "wrap", gap: 10 }}>
              
              {/* 거래유형 Pills */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginRight: 4 }}>거래유형:</span>
                {[
                  { label: "전체", value: "" },
                  { label: "매매", value: "매매" },
                  { label: "전세", value: "전세" },
                  { label: "월세", value: "월세" },
                  { label: "단기임대", value: "단기임대" },
                ].map(opt => {
                  const isSelected = opt.value === "" 
                    ? (tradeTypes.length === 0 || ["매매","전세","월세","단기임대"].every(v => tradeTypes.includes(v)))
                    : tradeTypes.includes(opt.value);

                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => {
                        if (opt.value === "") {
                          setTradeTypes([]);
                        } else {
                          setTradeTypes(prev => prev.includes(opt.value) ? prev.filter(t => t !== opt.value) : [...prev, opt.value]);
                        }
                        setCurrentPage(1);
                      }}
                      style={{
                        padding: "5px 12px",
                        fontSize: 12.5,
                        fontWeight: isSelected ? 700 : 500,
                        borderRadius: 20,
                        border: isSelected ? `1px solid ${BRAND}` : "1px solid #e2e8f0",
                        background: isSelected ? BRAND : "#fff",
                        color: isSelected ? "#fff" : "#64748b",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* 추가 옵션 & 토글 */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <select
                  value={registrantFilter}
                  onChange={e => { setRegistrantFilter(e.target.value); setCurrentPage(1); }}
                  style={{ border: "1px solid #e2e8f0", padding: "5px 10px", borderRadius: 6, fontSize: 12.5, outline: "none", color: "#475569", background: "#fff" }}
                >
                  <option value="">등록자: 모두</option>
                  <option value="부동산">부동산만</option>
                  <option value="일반인">일반인만</option>
                </select>

                <select
                  value={commissionFilter}
                  onChange={e => { setCommissionFilter(e.target.value); setCurrentPage(1); }}
                  style={{ border: "1px solid #e2e8f0", padding: "5px 10px", borderRadius: 6, fontSize: 12.5, outline: "none", color: "#475569", background: "#fff" }}
                >
                  <option value="">중개보수: 모두</option>
                  <option value="공동중개">공동중개</option>
                  <option value="25">수수료 25%↑</option>
                  <option value="50">수수료 50%↑</option>
                  <option value="법정">법정수수료</option>
                </select>

                <button
                  type="button"
                  onClick={() => setIsDetailFilterOpen(prev => !prev)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "5px 12px",
                    fontSize: 12.5,
                    fontWeight: 700,
                    borderRadius: 6,
                    border: isDetailFilterOpen ? `1px solid ${BRAND}` : "1px solid #e2e8f0",
                    background: isDetailFilterOpen ? "#eff6ff" : "#f8fafc",
                    color: isDetailFilterOpen ? BRAND : "#475569",
                    cursor: "pointer",
                  }}
                >
                  <span>⚙️ 상세필터</span>
                  <span style={{ fontSize: 10 }}>{isDetailFilterOpen ? "▲" : "▼"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMainCategory("all");
                    setSubCategory("");
                    setExpandedMenu(null);
                    setTradeTypes([]);
                    setMaxSalePrice("");
                    setMinSalePrice("");
                    setMaxDeposit("");
                    setMinDeposit("");
                    setMaxMonthlyRent("");
                    setMinMonthlyRent("");
                    setSelectedDongs([]);
                    setRoomsFilter("");
                    setBathroomsFilter("");
                    setDirectionFilter("");
                    setFloorFilter("");
                    setMinArea("");
                    setMaxArea("");
                    setMinSupplyArea("");
                    setMaxSupplyArea("");
                    setKeyword("");
                    setThemeFilter("");
                    setRegistrantFilter("");
                    setCommissionFilter("");
                    setAuctionAppraisalMin("");
                    setAuctionAppraisalMax("");
                    setAuctionBidPriceMin("");
                    setAuctionBidPriceMax("");
                    setAuctionDiscount("");
                    setAuctionBidCount("");
                    setCurrentPage(1);
                  }}
                  style={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    color: "#64748b",
                    padding: "5px 10px",
                    borderRadius: 6,
                    fontSize: 12.5,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  🔄 초기화
                </button>
              </div>
            </div>

            {/* 3행: 동 선택 패널 (구/군 선택 시) */}
            {sigungu && dongsInSigungu.length > 0 && (
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "14px 16px", background: "#f8fafc", marginTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 10 }}>
                  📍 {sigungu} 상세 동 선택 (복수 선택 가능)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8 }}>
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
                          padding: "5px 8px", 
                          fontSize: 12, 
                          cursor: "pointer", 
                          borderRadius: 6,
                          background: isSelected ? BRAND : "#fff",
                          color: isSelected ? "#fff" : "#475569",
                          border: isSelected ? `1px solid ${BRAND}` : "1px solid #e2e8f0",
                          fontWeight: isSelected ? 700 : 500,
                          textAlign: "center",
                          transition: "all 0.1s"
                        }}
                      >
                        {dong}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4행: 상세 필터 아코디언 (금액/면적/옵션) */}
            {isDetailFilterOpen && (
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "16px 20px", marginTop: 14 }}>
                {mainCategory === "auction" ? (
                  /* 경매 / 공매 상세 필터 */
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#334155", width: 65 }}>감정가</span>
                        <input type="text" style={{ width: 75, border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 6, fontSize: 13, background: "#fff" }} placeholder="최소" value={auctionAppraisalMin} onChange={e => setAuctionAppraisalMin(e.target.value)} />
                        <span style={{ color: "#94a3b8" }}>~</span>
                        <input type="text" style={{ width: 75, border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 6, fontSize: 13, background: "#fff" }} placeholder="최대" value={auctionAppraisalMax} onChange={e => setAuctionAppraisalMax(e.target.value)} />
                        <span style={{ fontSize: 12, color: "#64748b" }}>만원</span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#334155", width: 75 }}>최저입찰가</span>
                        <input type="text" style={{ width: 75, border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 6, fontSize: 13, background: "#fff" }} placeholder="최소" value={auctionBidPriceMin} onChange={e => setAuctionBidPriceMin(e.target.value)} />
                        <span style={{ color: "#94a3b8" }}>~</span>
                        <input type="text" style={{ width: 75, border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 6, fontSize: 13, background: "#fff" }} placeholder="최대" value={auctionBidPriceMax} onChange={e => setAuctionBidPriceMax(e.target.value)} />
                        <span style={{ fontSize: 12, color: "#64748b" }}>만원</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>할인율</span>
                        {["", "10", "20", "30", "50"].map(d => (
                          <button key={d} onClick={() => { setAuctionDiscount(d); setCurrentPage(1); }} style={{ padding: "4px 10px", fontSize: 12, borderRadius: 16, cursor: "pointer", fontWeight: 600, border: auctionDiscount === d ? `1px solid ${BRAND}` : "1px solid #cbd5e1", background: auctionDiscount === d ? BRAND : "#fff", color: auctionDiscount === d ? "#fff" : "#475569" }}>
                            {d === "" ? "전체" : `▼${d}%↑`}
                          </button>
                        ))}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>유찰횟수</span>
                        <select value={auctionBidCount} onChange={e => { setAuctionBidCount(e.target.value); setCurrentPage(1); }} style={{ border: "1px solid #cbd5e1", padding: "5px 8px", borderRadius: 6, fontSize: 12.5, outline: "none", background: "#fff" }}>
                          <option value="">전체</option><option value="1">1회↑</option><option value="2">2회↑</option><option value="3">3회↑</option><option value="5">5회↑</option>
                        </select>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>면적</span>
                        <input type="text" style={{ width: 60, border: "1px solid #cbd5e1", padding: "5px 8px", borderRadius: 6, fontSize: 13, background: "#fff" }} placeholder="최소" value={minArea} onChange={e => setMinArea(e.target.value)} />
                        <span style={{ color: "#94a3b8" }}>~</span>
                        <input type="text" style={{ width: 60, border: "1px solid #cbd5e1", padding: "5px 8px", borderRadius: 6, fontSize: 13, background: "#fff" }} placeholder="최대" value={maxArea} onChange={e => setMaxArea(e.target.value)} />
                        <span style={{ fontSize: 12, color: "#64748b" }}>㎡</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 일반 매물 상세 필터 */
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* 금액 범위 */}
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
                      {(tradeTypes.length === 0 || tradeTypes.includes("매매")) && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#334155", width: 45 }}>매매가</span>
                          <input type="text" style={{ width: 70, border: "1px solid #cbd5e1", padding: "5px 8px", borderRadius: 6, fontSize: 13, background: "#fff" }} placeholder="최소" value={minSalePrice} onChange={e => setMinSalePrice(e.target.value)} />
                          <span style={{ color: "#94a3b8" }}>~</span>
                          <input type="text" style={{ width: 70, border: "1px solid #cbd5e1", padding: "5px 8px", borderRadius: 6, fontSize: 13, background: "#fff" }} placeholder="최대" value={maxSalePrice} onChange={e => setMaxSalePrice(e.target.value)} />
                          <span style={{ fontSize: 12, color: "#64748b" }}>만원</span>
                        </div>
                      )}

                      {(tradeTypes.length === 0 || tradeTypes.some(t => ["전세", "월세", "단기임대"].includes(t))) && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#334155", width: 45 }}>{tradeTypes.includes("전세") && !tradeTypes.some(t => ["월세", "단기임대"].includes(t)) ? "전세금" : "보증금"}</span>
                          <input type="text" style={{ width: 70, border: "1px solid #cbd5e1", padding: "5px 8px", borderRadius: 6, fontSize: 13, background: "#fff" }} placeholder="최소" value={minDeposit} onChange={e => setMinDeposit(e.target.value)} />
                          <span style={{ color: "#94a3b8" }}>~</span>
                          <input type="text" style={{ width: 70, border: "1px solid #cbd5e1", padding: "5px 8px", borderRadius: 6, fontSize: 13, background: "#fff" }} placeholder="최대" value={maxDeposit} onChange={e => setMaxDeposit(e.target.value)} />
                          <span style={{ fontSize: 12, color: "#64748b" }}>만원</span>
                        </div>
                      )}

                      {(tradeTypes.length === 0 || tradeTypes.some(t => ["월세", "단기임대"].includes(t))) && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#334155", width: 35 }}>월세</span>
                          <input type="text" style={{ width: 70, border: "1px solid #cbd5e1", padding: "5px 8px", borderRadius: 6, fontSize: 13, background: "#fff" }} placeholder="최소" value={minMonthlyRent} onChange={e => setMinMonthlyRent(e.target.value)} />
                          <span style={{ color: "#94a3b8" }}>~</span>
                          <input type="text" style={{ width: 70, border: "1px solid #cbd5e1", padding: "5px 8px", borderRadius: 6, fontSize: 13, background: "#fff" }} placeholder="최대" value={maxMonthlyRent} onChange={e => setMaxMonthlyRent(e.target.value)} />
                          <span style={{ fontSize: 12, color: "#64748b" }}>만원</span>
                        </div>
                      )}
                    </div>

                    {/* 면적 & 세부 옵션 */}
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>전용면적</span>
                        <input type="text" style={{ width: 60, border: "1px solid #cbd5e1", padding: "5px 8px", borderRadius: 6, fontSize: 13, background: "#fff" }} placeholder="최소" value={minArea} onChange={e => setMinArea(e.target.value)} />
                        <span style={{ color: "#94a3b8" }}>~</span>
                        <input type="text" style={{ width: 60, border: "1px solid #cbd5e1", padding: "5px 8px", borderRadius: 6, fontSize: 13, background: "#fff" }} placeholder="최대" value={maxArea} onChange={e => setMaxArea(e.target.value)} />
                        <span style={{ fontSize: 12, color: "#64748b" }}>평</span>
                      </div>

                      {(mainCategory === "all" || ["apart", "villa", "one"].includes(mainCategory)) && (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>방수</span>
                            <select value={roomsFilter} onChange={e => { setRoomsFilter(e.target.value); setCurrentPage(1); }} style={{ border: "1px solid #cbd5e1", padding: "5px 8px", borderRadius: 6, fontSize: 12.5, outline: "none", background: "#fff" }}>
                              <option value="">전체</option><option value="1">1개</option><option value="2">2개</option><option value="3">3개</option><option value="4개+">4개+</option>
                            </select>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>욕실</span>
                            <select value={bathroomsFilter} onChange={e => { setBathroomsFilter(e.target.value); setCurrentPage(1); }} style={{ border: "1px solid #cbd5e1", padding: "5px 8px", borderRadius: 6, fontSize: 12.5, outline: "none", background: "#fff" }}>
                              <option value="">전체</option><option value="1">1개</option><option value="2">2개</option><option value="3개+">3개+</option>
                            </select>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>방향</span>
                            <select value={directionFilter} onChange={e => { setDirectionFilter(e.target.value); setCurrentPage(1); }} style={{ border: "1px solid #cbd5e1", padding: "5px 8px", borderRadius: 6, fontSize: 12.5, outline: "none", background: "#fff" }}>
                              <option value="">전체</option><option value="남향">남향</option><option value="동향">동향</option><option value="서향">서향</option><option value="북향">북향</option><option value="남동향">남동향</option><option value="남서향">남서향</option>
                            </select>
                          </div>
                        </>
                      )}

                      {(mainCategory === "all" || ["biz", "sale"].includes(mainCategory)) && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>층수</span>
                          <select value={floorFilter} onChange={e => { setFloorFilter(e.target.value); setCurrentPage(1); }} style={{ border: "1px solid #cbd5e1", padding: "5px 8px", borderRadius: 6, fontSize: 12.5, outline: "none", background: "#fff" }}>
                            <option value="">전체</option><option value="지하">지하</option><option value="1층">1층</option><option value="2층이상">2층+</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* 테마 태그 */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>추천 테마</span>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {["신축급", "올수리", "풀옵션", "역세권", "한강뷰", "오피스텔"].map(t => {
                          const isSelected = themeFilter === t;
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => { setThemeFilter(prev => prev === t ? "" : t); setCurrentPage(1); }}
                              style={{
                                padding: "4px 12px",
                                fontSize: 12,
                                borderRadius: 16,
                                cursor: "pointer",
                                fontWeight: isSelected ? 700 : 500,
                                border: isSelected ? `1px solid ${BRAND}` : "1px solid #cbd5e1",
                                background: isSelected ? BRAND : "#fff",
                                color: isSelected ? "#fff" : "#475569",
                                transition: "all 0.15s",
                              }}
                            >
                              #{t}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Results Header & Sorting Bar ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 6px", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
              총 <span style={{ color: BRAND, fontWeight: 900 }}>{filtered.length.toLocaleString()}</span>개의 공실 매물
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12.5, color: "#64748b" }}>정렬:</span>
              <select
                style={{ border: "1px solid #e2e8f0", padding: "6px 12px", fontSize: 13, borderRadius: 6, outline: "none", color: "#334155", background: "#fff" }}
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="latest">최신 등록순</option>
                <option value="price_asc">가격 낮은순</option>
                <option value="price_desc">가격 높은순</option>
              </select>
            </div>
          </div>

          {/* ── Listings Section ── */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", color: "#64748b", background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <div style={{ width: 32, height: 32, border: "3px solid #e2e8f0", borderTop: `3px solid ${BRAND}`, borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: 12 }} />
              <div style={{ fontSize: 14, fontWeight: 600 }}>공실 매물 데이터를 불러오고 있습니다...</div>
            </div>
          ) : paged.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "#94a3b8", background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: 48, display: "block", marginBottom: 14 }}>🏠</span>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#475569", marginBottom: 6 }}>조건에 일치하는 매물이 없습니다.</div>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>검색 조건을 변경하거나 필터를 초기화해 보세요.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {paged.map((v) => {
                const isMasked = v.exposure_type === '부동산노출' && (v.trade_type === '경매' || v.trade_type === '공매' ? userLevel < 1 : userLevel < 2);
                const showCommission = userLevel >= 2;
                const addrText = v.building_name || `${v.sigungu || ""} ${v.dong || ""} 공실`;
                const isExpanded = expandedIds.includes(v.id);

                return (
                  <div
                    key={v.id}
                    style={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 12,
                      overflow: "hidden",
                      transition: "all 0.2s ease-in-out",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = "#cbd5e1";
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.05)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "#e2e8f0";
                      e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.02)";
                    }}
                  >
                    {/* Main Row */}
                    <div
                      onClick={() => {
                        if (isMasked) {
                          window.location.href = "/login?returnTo=" + encodeURIComponent(window.location.pathname + window.location.search);
                          return;
                        }
                        setExpandedIds(prev => prev.includes(v.id) ? prev.filter(x => x !== v.id) : [...prev, v.id]);
                      }}
                      style={{
                        display: "flex",
                        padding: "18px 20px",
                        alignItems: "center",
                        cursor: "pointer",
                        gap: 18,
                      }}
                    >
                      {/* 1. Checkbox */}
                      <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" style={{ width: 16, height: 16, cursor: "pointer", accentColor: BRAND }} />
                      </div>

                      {/* 2. Photo Thumbnail */}
                      <div style={{ width: 140, height: 105, overflow: "hidden", flexShrink: 0, background: "#f1f5f9", borderRadius: 8, position: "relative" }}>
                        {v.photos?.length > 0 ? (
                          <img src={v.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : v.lat && v.lng && mapLoaded ? (
                          <ThumbnailRoadview lat={v.lat} lng={v.lng} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 11, fontWeight: 600 }}>
                            사진 없음
                          </div>
                        )}
                        {v.photos?.length > 1 && (
                          <span style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 4 }}>
                            +{v.photos.length}
                          </span>
                        )}
                      </div>

                      {/* 3. Main Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {(v.trade_type === "경매" || v.trade_type === "공매") ? (() => {
                          const meta = typeof v.metadata === "string" ? JSON.parse(v.metadata) : (v.metadata || {});
                          const auctionBadge = getAuctionInfo(v).badge || `${v.property_type || "물건"} ${v.trade_type}`;
                          const bidDate = meta.pbctBegnDtm || meta.pblctBgnDtm || meta.bid_start_date || meta.bid_date || "미정";
                          const isNew = v.created_at && (Date.now() - new Date(v.created_at).getTime()) < 3 * 24 * 60 * 60 * 1000;

                          return (
                            <>
                              <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center", flexWrap: "wrap" }}>
                                <span style={{ background: "#fee2e2", color: "#dc2626", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 4 }}>
                                  {auctionBadge}
                                </span>
                                {isNew && (
                                  <span style={{ background: "#fef3c7", color: "#d97706", fontSize: 11, fontWeight: 800, padding: "2px 6px", borderRadius: 4 }}>
                                    NEW
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {addrText}
                              </div>
                              <div style={{ fontSize: 13, color: "#475569", fontWeight: 500 }}>
                                {getAuctionInfo(v).category || v.property_type} {v.area_m2 ? `· 면적 ${v.area_m2}m²` : ""}
                              </div>
                              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                                📅 입찰일: {bidDate.substring(0, 10)} {meta.bid_count > 0 && `(유찰 ${meta.bid_count}회)`}
                              </div>
                            </>
                          );
                        })() : (
                          <>
                            <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center", flexWrap: "wrap" }}>
                              {/* 거래구분 배지 */}
                              <span style={{ background: "#eff6ff", color: BRAND, fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 4 }}>
                                {v.trade_type || "임대"}
                              </span>

                              {/* 등록자 구분 배지 */}
                              <span style={{ background: "#f1f5f9", color: "#475569", fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>
                                {v.owner_role === 'REALTOR' || v.members?.role === 'REALTOR' ? '🏢 부동산' : '👤 직거래'}
                              </span>

                              {/* 중개수수료 배지 */}
                              {showCommission && (v.realtor_commission || v.commission_type) && (
                                <span style={{ background: "#fef2f2", color: "#ef4444", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 4 }}>
                                  💰 {v.realtor_commission || v.commission_type}
                                </span>
                              )}

                              {/* 열람제한 배지 */}
                              {isMasked && (
                                <span onClick={(e) => { e.stopPropagation(); window.location.href = "/login?returnTo=" + encodeURIComponent(window.location.pathname + window.location.search); }} style={{ fontSize: 11, color: "#2563eb", fontWeight: 700, background: "#dbeafe", padding: "2px 8px", borderRadius: 4, cursor: "pointer" }}>
                                  🔒 중개회원 전용
                                </span>
                              )}
                            </div>

                            {/* 매물명 / 주소 */}
                            <div style={{ fontSize: 16, fontWeight: 800, color: isMasked ? "#94a3b8" : "#0f172a", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {isMasked ? addrText.replace(/[^s]/g, "●") : addrText} {v.property_type && <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>({v.property_type})</span>}
                            </div>

                            {/* 면적 & 상세 스펙 */}
                            <div style={{ fontSize: 13, color: "#475569", fontWeight: 500 }}>
                              전용 {v.area_m2 || 0}m² ({v.area_m2 ? Math.round(v.area_m2 / 3.3) : 0}평)
                              {v.floor && ` · ${v.floor}/${v.total_floors || ""}층`}
                              {v.rooms ? ` · 방${v.rooms}` : ""}
                              {v.parking_spots ? ` · 주차 ${v.parking_spots}대` : ""}
                            </div>

                            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                              {v.move_in_date ? `입주: ${v.move_in_date}` : "즉시입주 가능"}
                              {v.completion_year ? ` · ${v.completion_year}년 준공` : ""}
                            </div>
                          </>
                        )}
                      </div>

                      {/* 4. Price Column */}
                      {(v.trade_type === "경매" || v.trade_type === "공매") ? (() => {
                        const meta = typeof v.metadata === "string" ? JSON.parse(v.metadata) : (v.metadata || {});
                        const appraisalPrice = meta.appraisal_price || parseInt(meta.apslEvlAmt || "0", 10) || (v.deposit && v.deposit > 100000 ? v.deposit : (v.deposit || 0) * 10000);
                        const lowestBidPrice = meta.lowest_bid_price || parseInt(meta.lowstBidPrcIndctCont || "0", 10) || 0;
                        const cardDiscountRate = appraisalPrice > 0 && lowestBidPrice > 0 ? Math.round(((appraisalPrice - lowestBidPrice) / appraisalPrice) * 100) : (meta.discount_rate || 0);

                        const formatPrice = (val: number) => {
                          if (!val || isNaN(val)) return "0원";
                          const m = Math.round(val / 10000);
                          if (m === 0) return "0원";
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
                          return result || "0원";
                        };

                        return (
                          <div style={{ width: 180, flexShrink: 0, borderLeft: "1px solid #f1f5f9", paddingLeft: 18, display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
                            <div style={{ fontSize: 12, color: "#64748b", display: "flex", justifyContent: "space-between" }}>
                              <span>감정가</span>
                              <span style={{ fontWeight: 700, color: "#334155" }}>{formatPrice(appraisalPrice)}</span>
                            </div>
                            <div style={{ fontSize: 13, color: "#ef4444", fontWeight: 800, display: "flex", justifyContent: "space-between" }}>
                              <span>최저가</span>
                              <span style={{ fontSize: 16 }}>{formatPrice(lowestBidPrice)}</span>
                            </div>
                            {cardDiscountRate > 0 && (
                              <div style={{ fontSize: 12, color: "#059669", fontWeight: 800, textAlign: "right" }}>
                                ▼ {cardDiscountRate}% 할인
                              </div>
                            )}
                          </div>
                        );
                      })() : (
                        <div style={{ width: 170, flexShrink: 0, borderLeft: "1px solid #f1f5f9", paddingLeft: 18, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b", marginBottom: 2 }}>
                            {getPriceLabel(v)}
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", letterSpacing: -0.5 }}>
                            {getPriceText(v)}
                          </div>
                          {v.maintenance_fee ? (
                            <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 4 }}>
                              관리비 {Math.floor(v.maintenance_fee / 10000)}만원
                            </div>
                          ) : null}
                        </div>
                      )}

                      {/* 5. Action Buttons */}
                      <div style={{ width: 120, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => router.push(`/homepage/${v.id}`)}
                          style={{
                            width: "100%",
                            background: BRAND,
                            color: "#fff",
                            border: "none",
                            padding: "9px 0",
                            fontSize: 13,
                            fontWeight: 800,
                            cursor: "pointer",
                            borderRadius: 6,
                            transition: "opacity 0.15s",
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
                          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                        >
                          상세보기
                        </button>
                        <button
                          onClick={() => setExpandedIds(prev => prev.includes(v.id) ? prev.filter(x => x !== v.id) : [...prev, v.id])}
                          style={{
                            width: "100%",
                            background: isExpanded ? "#eff6ff" : "#fff",
                            color: isExpanded ? BRAND : "#64748b",
                            border: isExpanded ? `1px solid ${BRAND}` : "1px solid #cbd5e1",
                            padding: "7px 0",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            borderRadius: 6,
                            transition: "all 0.15s",
                          }}
                        >
                          {isExpanded ? "▲ 정보닫기" : "▼ 펼쳐보기"}
                        </button>
                      </div>
                    </div>

                    {/* 6. Expanded Detail Panel */}
                    {isExpanded && (
                      <div style={{ padding: "0 20px 20px 20px", background: "#fff", cursor: "default" }} onClick={e => e.stopPropagation()}>
                        <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden", display: "grid", gridTemplateColumns: "120px 1fr 120px 1fr", fontSize: 13 }}>
                          {[
                            { l1: "공실관리번호", v1: String(v.id).split('-')[0].toUpperCase(), l2: "방 / 욕실수", v2: `${v.rooms || 0}개 / ${v.bathrooms || 0}개` },
                            { l1: "소재지 주소", v1: `${v.sido} ${v.sigungu} ${v.dong} ${v.detail_addr || ""}`.trim(), l2: "주실 방향", v2: v.direction || "남향" },
                            { l1: "건물/단지명", v1: v.building_name || "특징 없음", l2: "주차 대수", v2: v.parking_spots ? `주차 ${v.parking_spots}대 가능` : "주차 불가" },
                            { l1: "공급/전용면적", v1: `${Math.round((v.area_m2 || 0) * 1.3)}m² / ${v.area_m2 || 0}m²`, l2: "입주가능일", v2: v.move_in_date || "즉시입주" },
                            { l1: "해당층 / 총층", v1: `${v.floor || "해당층"} / ${v.total_floors || "전체층"}`, l2: "월 관리비", v2: v.maintenance_fee ? `${Math.round(v.maintenance_fee/10000)}만원` : "10만원" },
                            { l1: "등록자 / 상호", v1: (() => {
                              const m = v.members;
                              if (!m) return v.client_name || "-";
                              if (m.role === 'REALTOR' && m.agencies && m.agencies.length > 0) return m.agencies[0].agency_name || m.name || v.client_name || "-";
                              return m.name || v.client_name || "-";
                            })(), l2: "담당 연락처", v2: (() => {
                              const m = v.members;
                              if (!m) return v.client_phone || "-";
                              if (m.role === 'REALTOR' && m.agencies && m.agencies.length > 0) return m.agencies[0].phone || m.phone || v.client_phone || "-";
                              return m.phone || v.client_phone || "-";
                            })() }
                          ].map((row, i, arr) => (
                            <div key={i} style={{ display: "contents" }}>
                              <div style={{ background: "#f8fafc", padding: "10px 14px", fontWeight: 700, color: "#64748b", borderBottom: i === arr.length - 1 ? "none" : "1px solid #f1f5f9", display: "flex", alignItems: "center" }}>{row.l1}</div>
                              <div style={{ padding: "10px 14px", color: "#0f172a", borderBottom: i === arr.length - 1 ? "none" : "1px solid #f1f5f9", display: "flex", alignItems: "center" }}>{row.v1}</div>
                              <div style={{ background: "#f8fafc", padding: "10px 14px", fontWeight: 700, color: "#64748b", borderBottom: i === arr.length - 1 ? "none" : "1px solid #f1f5f9", borderLeft: "1px solid #f1f5f9", display: "flex", alignItems: "center" }}>{row.l2}</div>
                              <div style={{ padding: "10px 14px", color: "#0f172a", borderBottom: i === arr.length - 1 ? "none" : "1px solid #f1f5f9", display: "flex", alignItems: "center" }}>{row.v2}</div>
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

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "28px 0" }}>
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} style={{ ...pageBtn(false), opacity: currentPage === 1 ? 0.4 : 1, borderRadius: 6 }}>«</button>
              <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} style={{ ...pageBtn(false), opacity: currentPage === 1 ? 0.4 : 1, borderRadius: 6 }}>‹</button>
              {Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(currentPage - 5, totalPages - 9));
                const p = start + i;
                if (p > totalPages) return null;
                return <button key={p} onClick={() => setCurrentPage(p)} style={{ ...pageBtn(p === currentPage), borderRadius: 6 }}>{p}</button>;
              })}
              <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} style={{ ...pageBtn(false), opacity: currentPage === totalPages ? 0.4 : 1, borderRadius: 6 }}>›</button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} style={{ ...pageBtn(false), opacity: currentPage === totalPages ? 0.4 : 1, borderRadius: 6 }}>»</button>
            </div>
          )}

        </div>
      </div>
      {isAuthModalOpen && <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />}
    </div>
  );
}
