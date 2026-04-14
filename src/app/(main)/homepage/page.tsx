"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getVacancies } from "@/app/actions/vacancy";

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
  const [category, setCategory] = useState("");
  const [tradeType, setTradeType] = useState("");
  const [sido, setSido] = useState("서울특별시");
  const [sigungu, setSigungu] = useState(""); // 구 선택
  const [selectedDong, setSelectedDong] = useState(""); // 블럭(동) 선택
  const [sortBy, setSortBy] = useState("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [geoData, setGeoData] = useState<any>(null);
  const [sigunguList, setSigunguList] = useState<string[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<any>(null);
  const polygonsRef = useRef<any[]>([]);
  const overlaysRef = useRef<any[]>([]);
  const ITEMS_PER_PAGE = 10;

  // Fetch vacancies
  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getVacancies({ all: true });
      if (res.success && res.data) {
        const active = res.data
          .filter((v: any) => v.status === "ACTIVE")
          .map((v: any) => ({
            ...v,
            photos: v.vacancy_photos
              ? [...v.vacancy_photos].sort((a: any, b: any) => a.sort_order - b.sort_order).map((p: any) => p.url)
              : [],
          }));
        setVacancies(active);
      }
      setLoading(false);
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
      center: new kakao.maps.LatLng(37.498095, 127.02761), level: 7,
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

    // Filter features by selected sigungu
    const features = sigungu
      ? geoData.features.filter((f: any) => f.properties.sggnm === sigungu)
      : [];

    if (features.length === 0) return;

    const bounds = new kakao.maps.LatLngBounds();

    features.forEach((feature: any) => {
      const admNm = feature.properties.adm_nm || "";
      const dongName = admNm.split(" ").pop() || "";
      const coords = feature.geometry.coordinates;
      const isMulti = feature.geometry.type === "MultiPolygon";
      const polygonPaths = isMulti ? coords : [coords];

      polygonPaths.forEach((polyCoords: any) => {
        const path = polyCoords[0].map((c: number[]) => {
          const latlng = new kakao.maps.LatLng(c[1], c[0]);
          bounds.extend(latlng);
          return latlng;
        });

        const isSelected = selectedDong === dongName;
        const polygon = new kakao.maps.Polygon({
          path,
          strokeWeight: isSelected ? 3 : 2,
          strokeColor: isSelected ? "#c53030" : "#004c80",
          strokeOpacity: 0.8,
          fillColor: isSelected ? "#fed7d7" : "#3182ce",
          fillOpacity: isSelected ? 0.5 : 0.3,
        });
        polygon.setMap(map);
        polygonsRef.current.push(polygon);

        // Hover effect
        kakao.maps.event.addListener(polygon, "mouseover", () => {
          if (selectedDong !== dongName) polygon.setOptions({ fillOpacity: 0.45, fillColor: "#63b3ed" });
        });
        kakao.maps.event.addListener(polygon, "mouseout", () => {
          if (selectedDong !== dongName) polygon.setOptions({ fillOpacity: 0.2, fillColor: "#3182ce" });
        });

        // Click → filter
        kakao.maps.event.addListener(polygon, "click", () => {
          setSelectedDong(prev => prev === dongName ? "" : dongName);
          setCurrentPage(1);
        });
      });

      // Label overlay at center
      const allCoords = (isMulti ? coords[0][0] : coords[0]) as number[][];
      const cLat = allCoords.reduce((s: number, c: number[]) => s + c[1], 0) / allCoords.length;
      const cLng = allCoords.reduce((s: number, c: number[]) => s + c[0], 0) / allCoords.length;
      const count = countVacanciesInDong(vacancies, admNm);

      const overlayContent = document.createElement("div");
      overlayContent.style.cssText = `padding:3px 8px;background:rgba(255,255,255,0.92);border:1px solid #4a90d9;border-radius:4px;font-size:11px;font-weight:700;color:#1a365d;white-space:nowrap;pointer-events:none;box-shadow:0 1px 4px rgba(0,0,0,0.15);`;
      overlayContent.innerHTML = `${dongName}${count > 0 ? ` <span style="color:#e53e3e">(${count})</span>` : ""}`;

      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(cLat, cLng),
        content: overlayContent,
        yAnchor: 0.5,
      });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    });

    map.setBounds(bounds);
  }, [mapLoaded, geoData, sigungu, selectedDong, vacancies]);

  useEffect(() => { renderPolygons(); }, [renderPolygons]);

  // Filtered
  const filtered = useMemo(() => {
    let list = vacancies;
    if (category) list = list.filter(v => v.property_type === category);
    if (tradeType) list = list.filter(v => v.trade_type === tradeType);
    if (sido && sido !== "시도선택") list = list.filter(v => v.sido === sido);
    if (sigungu) list = list.filter(v => v.sigungu === sigungu);
    if (selectedDong) list = list.filter(v => v.dong && v.dong.includes(selectedDong.replace(/동$/, "")));
    if (sortBy === "price_asc") list = [...list].sort((a, b) => (a.deposit || 0) - (b.deposit || 0));
    else if (sortBy === "price_desc") list = [...list].sort((a, b) => (b.deposit || 0) - (a.deposit || 0));
    else list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  }, [vacancies, category, tradeType, sido, sigungu, selectedDong, sortBy]);

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
    <div style={{ background: "#f8f9fa", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>

        {/* ── 1. Search Filter Bar ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "stretch", border: "1px solid #d1d5db", borderRadius: 4, overflow: "hidden" }}>
            <span style={{ padding: "8px 14px", background: BRAND, color: "#fff", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>📋 매물종류</span>
            <select value={category} onChange={e => { setCategory(e.target.value); setCurrentPage(1); }} style={{ ...selectStyle, border: "none", borderRadius: 0, minWidth: 140 }}>
              {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "stretch", border: "1px solid #d1d5db", borderRadius: 4, overflow: "hidden" }}>
            <span style={{ padding: "8px 14px", background: "#e53e3e", color: "#fff", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>📍 시도선택</span>
            <select value={sido} onChange={e => { setSido(e.target.value); setSigungu(""); setSelectedDong(""); setCurrentPage(1); }} style={{ ...selectStyle, border: "none", borderRadius: 0, minWidth: 120 }}>
              {SIDO_LIST.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "stretch", border: "1px solid #d1d5db", borderRadius: 4, overflow: "hidden", flex: 1, minWidth: 200 }}>
            <input type="text" placeholder="단지명 / 주소 검색" style={{ padding: "8px 14px", fontSize: 14, outline: "none", border: "none", flex: 1 }} />
            <button style={{ padding: "8px 16px", background: "#f3f4f6", borderLeft: "1px solid #d1d5db", fontSize: 13, color: "#555", cursor: "pointer", fontWeight: 600 }}>검색</button>
          </div>
          <button style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 16px", border: "1px solid #d1d5db", borderRadius: 4, background: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 600, color: "#374151" }}>
            🔍 상세검색 ▾
          </button>
        </div>

        {/* ── 2. Map + Sigungu Sidebar ── */}
        <div style={{ display: "flex", gap: 0, marginBottom: 16 }}>
          <div ref={mapRef} style={{ flex: 1, height: 480, borderRadius: "8px 0 0 8px", border: "1px solid #d1d5db", borderRight: "none", background: "#e8eaed", position: "relative" }}>
            {!mapLoaded && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 14 }}>
                <span style={{ display: "inline-block", width: 24, height: 24, border: "3px solid #ddd", borderTop: `3px solid ${BRAND}`, borderRadius: "50%", animation: "spin 1s linear infinite", marginRight: 10 }}></span>
                지도 로딩 중...
              </div>
            )}
            {/* Selected dong badge */}
            {selectedDong && (
              <div style={{ position: "absolute", top: 12, left: 12, zIndex: 10, display: "flex", alignItems: "center", gap: 8, background: "#fff", border: `2px solid ${BRAND}`, borderRadius: 20, padding: "6px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: BRAND }}>📍 {selectedDong}</span>
                <span onClick={() => { setSelectedDong(""); setCurrentPage(1); }} style={{ fontSize: 11, color: "#888", cursor: "pointer", fontWeight: 600 }}>✕ 초기화</span>
              </div>
            )}
          </div>

          {/* Sigungu Sidebar */}
          <div style={{ width: 160, height: 480, border: "1px solid #d1d5db", borderRadius: "0 8px 8px 0", background: "#fff", overflowY: "auto" }}>
            <div style={{ padding: "10px 14px", borderBottom: `2px solid ${BRAND}`, fontSize: 13, fontWeight: 800, color: BRAND, textAlign: "center" }}>시도선택</div>
            {sigunguList.map(sg => (
              <div key={sg} onClick={() => { setSigungu(prev => prev === sg ? "" : sg); setSelectedDong(""); setCurrentPage(1); }}
                style={{ padding: "8px 14px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid #f0f0f0", fontWeight: sigungu === sg ? 700 : 400, color: sigungu === sg ? BRAND : "#374151", background: sigungu === sg ? "#eff6ff" : "transparent", transition: "all 0.15s" }}
                onMouseEnter={e => { if (sigungu !== sg) e.currentTarget.style.background = "#f9fafb"; }}
                onMouseLeave={e => { if (sigungu !== sg) e.currentTarget.style.background = "transparent"; }}
              >{sg}</div>
            ))}
            {sigunguList.length === 0 && <div style={{ padding: 16, fontSize: 12, color: "#aaa", textAlign: "center" }}>시도를 선택하세요</div>}
          </div>
        </div>

        {/* ── 3. Filter tabs ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginRight: 4 }}>매물종류전체</span>
            <span style={{ color: "#d1d5db" }}>|</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginRight: 8 }}>거래전체</span>
            {TRADE_OPTIONS.map(t => (
              <button key={t.value} onClick={() => { setTradeType(t.value); setCurrentPage(1); }} style={btnStyle(tradeType === t.value)}>
                {t.label}
              </button>
            ))}
            {selectedDong && (
              <span style={{ fontSize: 12, fontWeight: 600, color: "#e53e3e", marginLeft: 8, display: "flex", alignItems: "center", gap: 4 }}>
                📍 {sigungu} {selectedDong} 선택됨
                <span onClick={() => { setSelectedDong(""); setCurrentPage(1); }} style={{ cursor: "pointer", textDecoration: "underline" }}>해제</span>
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>총 <strong style={{ color: BRAND }}>{filtered.length}</strong>건</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selectStyle}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* ── 4. 매물목록 header ── */}
        <div style={{ borderBottom: `3px solid ${BRAND}`, paddingBottom: 8, marginBottom: 0 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>매물목록</h2>
        </div>

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
              paged.map((v, idx) => (
                <div key={v.id} onClick={() => router.push(`/homepage/${v.id}`)} style={{ display: "flex", gap: 16, padding: "16px 0", borderBottom: idx < paged.length - 1 ? "1px solid #e5e7eb" : "none", alignItems: "flex-start", cursor: "pointer", transition: "background 0.15s" }} onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <div style={{ width: 110, height: 85, borderRadius: 6, overflow: "hidden", flexShrink: 0, background: "#f3f4f6", border: "1px solid #e5e7eb" }}>
                    {v.photos?.length > 0 ? (
                      <img src={v.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: 12 }}>No Photo</div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.building_name || v.dong || "매물"}</span>
                      {v.created_at && <span style={{ fontSize: 11, color: "#999", whiteSpace: "nowrap" }}>등록 {fmtDate(v.created_at)}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ background: getPriceBg(v), color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 3 }}>{getPriceLabel(v)}</span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: "#c53030" }}>{getPriceText(v)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
                      {v.property_type}{v.sub_category ? `/${v.sub_category}` : ""}
                      {v.area_m2 ? ` · ${v.area_m2}m²` : ""}
                      {v.rooms ? ` · 방${v.rooms}개` : ""}
                      {v.bathrooms ? `, 욕실${v.bathrooms}개` : ""}
                    </div>
                    <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                      📍 {v.sido || ""} {v.sigungu || ""} {v.dong || ""}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", gap: 6, minWidth: 130 }}>
                    {v.realtor_commission && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#ea580c", border: "1px solid #fed7aa", padding: "2px 8px", borderRadius: 3, background: "#fff7ed" }}>{v.realtor_commission}</span>
                    )}
                    {v.client_phone && (
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8", display: "flex", alignItems: "center", gap: 4 }}>📞 {v.client_phone}</span>
                    )}
                  </div>
                </div>
              ))
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
          <div style={{ width: 180, flexShrink: 0 }}>
            <div style={{ position: "sticky", top: 80 }}>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                광고 배너 영역
              </div>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 13, fontWeight: 600 }}>
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
