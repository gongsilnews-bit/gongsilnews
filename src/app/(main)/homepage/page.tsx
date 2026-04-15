"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getVacancies } from "@/app/actions/vacancy";
import { getMapBlocks } from "@/app/actions/map_blocks";
import MapSearchBar from "@/components/MapSearchBar";

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
  { label: "매물정렬", value: "latest" },
  { label: "가격 낮은순", value: "price_asc" },
  { label: "가격 높은순", value: "price_desc" },
];

const BRAND = "#2845B3";

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
  const [tradeType, setTradeType] = useState("");
  const [sido, setSido] = useState("서울특별시");
  const [sigungu, setSigungu] = useState(""); // 구 선택
  const [selectedDongs, setSelectedDongs] = useState<string[]>([]); // 블럭(동) 복수 선택
  const [sortBy, setSortBy] = useState("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [geoData, setGeoData] = useState<any>(null);
  const [customBlocks, setCustomBlocks] = useState<any[]>([]);
  const [sigunguList, setSigunguList] = useState<string[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<any>(null);
  const prevSigunguRef = useRef(""); // 시군구 변경 감지용
  const polygonsRef = useRef<any[]>([]);
  const overlaysRef = useRef<any[]>([]);
  const ITEMS_PER_PAGE = 10;

  // Fetch vacancies
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await getVacancies({ all: true });
        
        let active = [];
        if (res.success && res.data) {
          active = res.data
            .filter((v: any) => v.status === "ACTIVE")
            .map((v: any) => ({
              ...v,
              photos: v.vacancy_photos
                ? [...v.vacancy_photos].sort((a: any, b: any) => a.sort_order - b.sort_order).map((p: any) => p.url)
                : [],
            }));
        }

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

  // Filtered
  const filtered = useMemo(() => {
    let list = vacancies;
    if (category) list = list.filter(v => v.property_type === category);
    if (tradeType) list = list.filter(v => v.trade_type === tradeType);
    if (sido && sido !== "시도선택") list = list.filter(v => v.sido === sido);
    if (sigungu) list = list.filter(v => v.sigungu === sigungu);
    if (selectedDongs.length > 0) {
      list = list.filter(v => 
        selectedDongs.some(dong => 
          (v.dong && v.dong.includes(dong.replace(/동$/, ""))) || 
          (v.building_name && v.building_name.includes(dong))
        )
      );
    }
    if (sortBy === "price_asc") list = [...list].sort((a, b) => (a.deposit || 0) - (b.deposit || 0));
    else if (sortBy === "price_desc") list = [...list].sort((a, b) => (b.deposit || 0) - (a.deposit || 0));
    else list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  }, [vacancies, category, tradeType, sido, sigungu, selectedDongs, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const formatAmount = (amt: number) => {
    if (!amt) return "";
    const m = Math.round(amt / 10000);
    if (m >= 10000) { const e = Math.floor(m / 10000); const r = m % 10000; return `${e}억${r ? ` ${r.toLocaleString()}` : ""}`; }
    return `${m.toLocaleString()}만`;
  };
  const getPriceLabel = (v: any) => v.trade_type === "매매" ? "매매" : v.trade_type === "전세" ? "전세" : "월세";
  const getPriceBg = (v: any) => v.trade_type === "매매" ? "#e53e3e" : v.trade_type === "전세" ? "#2b6cb0" : "#2f855a";
  const getPriceText = (v: any) => {
    if (v.trade_type === "매매" || v.trade_type === "전세") return formatAmount(v.deposit);
    return `${formatAmount(v.deposit)} / ${v.monthly_rent ? Math.round(v.monthly_rent / 10000).toLocaleString() : "0"}만`;
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
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>

        {/* ── 1. Header Tabs ── */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16, paddingBottom: 8 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: BRAND, margin: 0 }}>서울블럭지도</h2>
          <span style={{ color: "#d1d5db", fontSize: 18 }}>|</span>
          <a href="/gongsil" style={{ fontSize: 16, fontWeight: 600, color: "#6b7280", textDecoration: "none" }}>지도검색</a>
        </div>

        {/* ── 2. Map Container ── */}
        <div style={{ marginBottom: 0 }}>
          <div ref={mapRef} style={{ width: "100%", height: 500, borderRadius: 8, border: "1px solid #d1d5db", background: "#e8eaed", position: "relative", overflow: "hidden" }}>
            {!mapLoaded && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 14 }}>
                <span style={{ display: "inline-block", width: 24, height: 24, border: "3px solid #ddd", borderTop: `3px solid ${BRAND}`, borderRadius: "50%", animation: "spin 1s linear infinite", marginRight: 10 }}></span>
                지도 로딩 중...
              </div>
            )}

            {/* MapSearchBar (Real Functionality) */}
            <style>{`
              #wishFloatingFilter {
                left: 16px !important;
                transform: none !important;
                top: 16px !important;
              }
            `}</style>
            {mapLoaded && (
              <MapSearchBar 
                onSearchCoord={handleSearchCoord} 
                onRegionSelect={(sSido, sGugun, sDong) => {
                  if (sSido && sSido !== "시/도 선택") setSido(sSido);
                  if (sGugun && sGugun !== "-") setSigungu(sGugun);
                  else setSigungu("");
                  
                  if (sDong && sDong !== "-") {
                    setSelectedDongs(prev => prev.includes(sDong) ? prev : [...prev, sDong]);
                  }
                }}
                themeColor="#1a73e8" 
                isPushedDown={false} 
              />
            )}
            
            {/* Bottom Right Floating Badge & Chips */}
            <div style={{ position: "absolute", bottom: 16, right: 16, zIndex: 10, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, maxWidth: "80%" }}>
              <div style={{ display: "flex", alignItems: "center", background: "#1a365d", color: "#fff", padding: "8px 16px", borderRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>총 <strong style={{ color: "#fbbf24" }}>{selectedDongs.length}</strong>개의 블록이 선택되었습니다.</span>
                <button onClick={() => { setSelectedDongs([]); setCurrentPage(1); }} style={{ marginLeft: 12, display: "flex", alignItems: "center", gap: 4, background: "#fff", color: "#1a365d", border: "1px solid #ccc", padding: "4px 8px", fontSize: 12, fontWeight: 700, borderRadius: 2, cursor: "pointer" }}>
                  ↻ 지도초기화
                </button>
              </div>
              
              {/* Selected Blocks List inside Map */}
              {selectedDongs.length > 0 && (
                <div style={{ display: "flex", flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, width: "100%", justifyContent: "flex-end" }}>
                  {selectedDongs.map(dong => (
                    <div key={dong} style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: `1px solid #d1d5db`, padding: "4px 10px", fontSize: 12, color: "#374151", boxShadow: "0 2px 5px rgba(0,0,0,0.15)", borderRadius: 2 }}>
                      <span style={{ fontWeight: 600 }}>{dong}</span>
                      <span onClick={() => { setSelectedDongs(prev => prev.filter(d => d !== dong)); setCurrentPage(1); }} style={{ cursor: "pointer", color: "#888", fontWeight: 800, fontSize: 10 }}>✕</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 3. Compact Search & Control Toolbar ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: isDetailSearchOpen ? "none" : "2px solid #1a365d", paddingBottom: 16, marginBottom: isDetailSearchOpen ? 0 : 16, marginTop: 16 }}>
          {/* Left Side (Previously Right): Search Results & Sort */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#374151", marginRight: 8 }}>총 <span style={{ color: "#1a365d" }}>{filtered.length}</span>건 결과</span>
            <button style={{ padding: "8px 14px", background: "#fff", border: "1px solid #d1d5db", fontSize: 14, cursor: "pointer", borderRadius: 2 }}>검색결과 모두 펼쳐보기</button>
            <button style={{ padding: "8px 14px", background: "#fff", border: "1px solid #d1d5db", fontSize: 14, cursor: "pointer", borderRadius: 2 }}>정확도 순으로</button>
            <button style={{ padding: "8px 14px", background: "#fff", border: "1px solid #d1d5db", fontSize: 14, cursor: "pointer", borderRadius: 2 }}>최신 순으로</button>
            <button style={{ padding: "8px 14px", background: "#fff", border: "1px solid #d1d5db", fontSize: 14, cursor: "pointer", borderRadius: 2 }}>가격 순서로</button>
          </div>

          {/* Right Side (Previously Left): Dropdowns & Search Toggle */}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div ref={dropdownRef1} style={{ position: "relative" }}>
              <button onClick={() => setIsPropertyTypeDropdownOpen(!isPropertyTypeDropdownOpen)} style={{ background: "#fff", border: "1px solid #d1d5db", padding: "8px 16px", borderRadius: 4, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontWeight: 600, color: "#374151" }}>
                {category || "전체물건"} ▼
              </button>
              {isPropertyTypeDropdownOpen && (
                <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: "#fff", border: "1px solid #ccc", borderRadius: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", width: 180, zIndex: 100 }}>
                  {["전체물건", "아파트/주상복합", "오피스텔", "원룸/투룸/주택", "상가/사무실"].map(item => (
                    <div key={item} style={{ padding: "10px 16px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid #eee", color: "#333", background: category === item || (item === "전체물건" && !category) ? "#f0f7ff" : "transparent" }} onClick={() => { setCategory(item === "전체물건" ? "" : item); setIsPropertyTypeDropdownOpen(false); }}>{item}</div>
                  ))}
                </div>
              )}
            </div>
            
            <div ref={dropdownRef2} style={{ position: "relative" }}>
              <button onClick={() => setIsTradeTypeDropdownOpen(!isTradeTypeDropdownOpen)} style={{ background: "#fff", border: "1px solid #d1d5db", padding: "8px 16px", borderRadius: 4, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontWeight: 600, color: "#374151" }}>
                거래방식 ▼
              </button>
              {isTradeTypeDropdownOpen && (
                <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: "#fff", border: "1px solid #ccc", borderRadius: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", width: 140, zIndex: 100 }}>
                  {["매매", "전세", "월세", "단기임대"].map(item => (
                    <label key={item} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid #eee", color: "#333", margin: 0 }}>
                      <input type="checkbox" style={{ zoom: 1.2 }} /> {item}
                    </label>
                  ))}
                  <div style={{ padding: "8px", textAlign: "center", background: "#f9f9f9" }}>
                    <button style={{ padding: "4px 12px", fontSize: 12, border: "1px solid #ccc", background: "#fff", cursor: "pointer", borderRadius: 2 }} onClick={() => setIsTradeTypeDropdownOpen(false)}>닫기 x</button>
                  </div>
                </div>
              )}
            </div>
            
            <button style={{ background: "#fff", color: "#111", border: "1px solid #111", padding: "8px 24px", fontSize: 14, borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}>
              검색 🔍
            </button>
            <button onClick={() => setIsDetailSearchOpen(!isDetailSearchOpen)} style={{ background: "transparent", color: "#1a365d", border: "none", padding: "8px 8px", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontWeight: "bold" }}>
              {isDetailSearchOpen ? "상세검색 닫기 ▲" : "상세검색 열기 ▼"}
            </button>
          </div>
        </div>

        {/* ── 4. Complex Legacy Filter Section (Collapsible) ── */}
        {isDetailSearchOpen && (
          <div style={{ border: "1px solid #8ba4b9", borderTop: "2px solid #1a365d", borderBottom: "2px solid #1a365d", marginBottom: 24, borderRadius: "0 0 4px 4px" }}>
          {/* Top Categories Row */}
          <style>{`
            .legacy-filter-col {
              padding: 10px; text-align: center; font-size: 15px; font-weight: 700; 
              cursor: pointer; transition: all 0.2s ease; position: relative;
            }
            .legacy-filter-col:hover {
              background: #1a365d !important;
              color: #fff !important;
              transform: scale(1.06);
              box-shadow: 0 4px 8px rgba(0,0,0,0.15);
              z-index: 10;
            }
          `}</style>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1.5fr 1fr 1.5fr", background: "#f1f6fa", borderBottom: "1px solid #c2d3e4" }}>
            {[
              { label: "매물구분", active: false },
              { label: "거래구분", active: false },
              { label: "룸갯수", active: false },
              { label: "층 구분", active: false },
              { label: "준공년도", active: false },
              { label: "주차대수", active: false },
              { label: "추가설비", active: false, noBorder: true }
            ].map((col, i) => (
              <div key={i} className="legacy-filter-col"
                style={{ 
                  color: col.active ? "#fff" : "#1e3a5f", 
                  background: col.active ? "#3b5998" : "transparent",
                  borderRight: col.noBorder ? "none" : "1px solid #c2d3e4", 
                }}>
                {col.label}
              </div>
            ))}
          </div>

          {/* Options Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1.5fr 1fr 1.5fr", background: "#fff", borderBottom: "1px solid #8ba4b9" }}>
            <div style={{ padding: "12px", borderRight: "1px solid #e2e8f0", fontSize: 14, color: "#555", display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 4, color: "#2563eb", fontWeight: 700 }}><input type="checkbox" defaultChecked /> 전체</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 아파트</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 오피스텔</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 빌라/주택</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 원룸/투룸</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 상가</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 사무실</label>
            </div>
            <div style={{ padding: "12px", borderRight: "1px solid #e2e8f0", fontSize: 14, color: "#555", display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 4, color: "#2563eb", fontWeight: 700 }}><input type="checkbox" defaultChecked /> 전체</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 매매</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 전세</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 월세</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 단기임대</label>
            </div>
            <div style={{ padding: "12px", borderRight: "1px solid #e2e8f0", fontSize: 14, color: "#555", display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 4, color: "#2563eb", fontWeight: 700 }}><input type="checkbox" defaultChecked /> 전체</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 1개</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 1.5개</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 2개</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 3개</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 4개 이상</label>
            </div>
            <div style={{ padding: "12px", borderRight: "1px solid #e2e8f0", fontSize: 14, color: "#555", display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 4, color: "#2563eb", fontWeight: 700 }}><input type="checkbox" defaultChecked /> 전체</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 1층</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 1층외 지상</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 1층+지상</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 반지하</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 지하</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 옥탑</label>
            </div>
            <div style={{ padding: "12px", borderRight: "1px solid #e2e8f0", fontSize: 14, color: "#555", display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 4, color: "#2563eb", fontWeight: 700 }}><input type="checkbox" defaultChecked /> 전체</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 2020년 이후</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 2015년 이후</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 2010년 이후</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 2005년 이후</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 2005년 이전</label>
            </div>
            <div style={{ padding: "12px", borderRight: "1px solid #e2e8f0", fontSize: 14, color: "#555", display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 4, color: "#2563eb", fontWeight: 700 }}><input type="checkbox" defaultChecked /> 전체</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 1대 이상</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 2대 이상</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 5대 이상</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 10대 이상</label>
            </div>
            <div style={{ padding: "12px", fontSize: 14, color: "#555", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, alignContent: "start" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 엘리베이터</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 테라스/루프탑</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 냉난방기</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 풀옵션</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 탕비실</label>
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" /> 화장실 외부</label>
            </div>
          </div>

          {/* Input Row and Close Details Toolbar */}
          <div style={{ padding: "12px", background: "#f8fafc", display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", fontSize: 14, color: "#555", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700 }}>보증금</span>
                <input type="text" style={{ width: 80, border: "1px solid #cbd5e1", padding: "6px" }} /> 만원 ~ 
                <input type="text" style={{ width: 80, border: "1px solid #cbd5e1", padding: "6px" }} /> 만원
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700 }}>월세</span>
                <input type="text" style={{ width: 80, border: "1px solid #cbd5e1", padding: "6px" }} /> 만원 ~ 
                <input type="text" style={{ width: 80, border: "1px solid #cbd5e1", padding: "6px" }} /> 만원
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700 }}>전용면적</span>
                <input type="text" style={{ width: 60, border: "1px solid #cbd5e1", padding: "6px" }} /> 평 ~ 
                <input type="text" style={{ width: 60, border: "1px solid #cbd5e1", padding: "6px" }} /> 평
              </div>
            </div>
            {/* 우측 하단 상세검색 닫기 버튼 */}
            <button onClick={() => setIsDetailSearchOpen(false)} style={{ padding: "8px 18px", background: "#fff", border: "1px solid #d1d5db", fontSize: 13, cursor: "pointer", borderRadius: 4, display: "flex", alignItems: "center", gap: 4, fontWeight: "bold", color: "#111", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              상세검색닫기 X
            </button>
          </div>
        </div>
        )}

        {/* ── 5. Listings + Sidebar ── */}
        <div style={{ display: "flex", gap: 24 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", color: "#888" }}>
                <span style={{ display: "inline-block", width: 28, height: 28, border: "3px solid #ddd", borderTop: `3px solid ${BRAND}`, borderRadius: "50%", animation: "spin 1s linear infinite", marginRight: 12 }}></span>
                매물 데이터를 불러오고 있습니다...
              </div>
            ) : paged.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#aaa" }}>
                <span style={{ fontSize: 40, display: "block", marginBottom: 12 }}>🏠</span>
                검색 조건에 해당하는 매물이 없습니다.
              </div>
            ) : (
              <div style={{ borderTop: "2px solid #374151" }}>
                {paged.map((v, idx) => (
                <div key={v.id} onClick={() => router.push(`/homepage/${v.id}`)} style={{ display: "flex", padding: "16px 0", borderBottom: "1px solid #d1d5db", borderLeft: "1px solid #d1d5db", borderRight: "1px solid #d1d5db", alignItems: "center", cursor: "pointer", transition: "background 0.15s", background: "#fff" }} onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")} onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                  
                  {/* 1. Checkbox */}
                  <div style={{ width: 40, display: "flex", justifyContent: "center", alignItems: "center", flexShrink: 0 }}>
                    <input type="checkbox" onClick={e => e.stopPropagation()} style={{ zoom: 1.3, cursor: "pointer" }} />
                  </div>

                  {/* 2. Photo */}
                  <div style={{ width: 130, height: 100, overflow: "hidden", flexShrink: 0, background: "#f3f4f6", border: "1px solid #e5e7eb" }}>
                    {v.photos?.length > 0 ? (
                      <img src={v.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: 12 }}>No Photo</div>
                    )}
                  </div>

                  {/* 3. Main Info */}
                  <div style={{ flex: 1, minWidth: 0, paddingLeft: 20 }}>
                    <div style={{ display: "inline-block", background: "#3b82f6", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 12, marginBottom: 6 }}>
                      공실매물 {v.created_at ? fmtDate(v.created_at) : ""}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "#1d4ed8", border: "1px solid #1d4ed8", padding: "1px 4px", fontWeight: "bold" }}>VIP</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {v.building_name || `${v.sigungu || ""} ${v.dong || ""} 매물`} {v.property_type && `(${v.property_type})`}
                      </span>
                      <span style={{ background: "#fbbf24", color: "#fff", fontSize: 10, fontWeight: "bold", padding: "1px 4px", borderRadius: 2 }}>N</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#555", lineHeight: 1.5 }}>
                      공급 {v.area_m2 ? Math.round(v.area_m2 * 1.2) : 0}m²({v.area_m2 ? Math.round(v.area_m2 * 1.2 / 3.3) : 0}P) / 
                      전용 {v.area_m2 || 0}m²({v.area_m2 ? Math.round(v.area_m2 / 3.3) : 0}P) 
                      <span style={{ color: "#3b82f6", marginLeft: 4 }}>{v.property_type}{v.sub_category ? `/${v.sub_category}` : ""}</span> 공실
                    </div>
                    <div style={{ fontSize: 13, color: "#777", marginTop: 2 }}>
                      {v.floor || "해당층"}/{v.total_floors || "전체층"}, 
                      {v.parking_spots ? ` 주차${v.parking_spots}` : " 주차불가"}, 
                      {v.completion_year ? ` ${v.completion_year}년` : " 연식미상"}, 
                      {v.realtor_commission ? ` ${v.realtor_commission}` : " 무권리"}
                    </div>
                  </div>

                  {/* 4. Price */}
                  <div style={{ width: 160, flexShrink: 0, textAlign: "center", borderLeft: "1px solid #f1f5f9", borderRight: "1px solid #f1f5f9", padding: "0 10px" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#111", marginBottom: 6 }}>
                      {getPriceLabel(v)} {getPriceText(v).replace('만', '').replace('억', '')}
                    </div>
                    <div style={{ fontSize: 12, color: "#888" }}>
                      관리비 {Math.floor((v.maintenance_fee || 0)/10000)}만
                    </div>
                  </div>

                  {/* 5. Actions */}
                  <div style={{ width: 140, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, paddingRight: 10 }}>
                    <button onClick={e => e.stopPropagation()} style={{ width: 110, background: "#1a365d", color: "#fff", border: "none", padding: "7px 0", fontSize: 13, fontWeight: "bold", borderRadius: 4, cursor: "pointer" }}>
                      연락처보기
                    </button>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={(e) => { e.stopPropagation(); router.push(`/homepage/${v.id}`); }} style={{ width: 53, background: "#fff", color: "#555", border: "1px solid #cbd5e1", padding: "4px 0", fontSize: 11, cursor: "pointer" }}>
                        상세보기
                      </button>
                      <button onClick={e => e.stopPropagation()} style={{ width: 53, background: "#fff", color: "#555", border: "1px solid #cbd5e1", padding: "4px 0", fontSize: 11, cursor: "pointer" }}>
                        수정신고
                      </button>
                    </div>
                  </div>
                </div>
                ))}
              </div>
            )}

            {/* ── 6. Pagination ── */}
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

          {/* Right: Sidebar */}
          <div style={{ width: 250, flexShrink: 0 }}>
            <div style={{ position: "sticky", top: 80 }}>
              <div style={{ border: "1px solid #e5e7eb", background: "#fff", height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                광고 배너 영역
              </div>
              <div style={{ border: "1px solid #e5e7eb", background: "#fff", height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 13, fontWeight: 600 }}>
                광고 배너 영역
              </div>
            </div>
          </div>
        </div>

        {/* ── 7. Bottom links ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: "32px 0", borderTop: "1px solid #e5e7eb", marginTop: 32 }}>
          {["공공데이터포털", "서울특별시", "국토교통부 실거래가"].map((t) => (
            <span key={t} style={{ padding: "8px 20px", border: "1px solid #d1d5db", borderRadius: 20, fontSize: 13, color: "#6b7280", cursor: "pointer", fontWeight: 500 }}>{t}</span>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
