"use client";
import React, { useState, useEffect, useRef } from "react";
import { FilterState } from "./filters/useVacancyFilters";
import LocationFilterPanel from "./filters/LocationFilterPanel";
import PropertyTypeFilterPanel from "./filters/PropertyTypeFilterPanel";
import TradeTypeFilterPanel from "./filters/TradeTypeFilterPanel";
import PriceFilterPanel from "./filters/PriceFilterPanel";
import AreaFilterPanel from "./filters/AreaFilterPanel";
import DetailFilterPanel from "./filters/DetailFilterPanel";

interface MobileFilterBarProps {
  vacancies: any[];
  filteredCount: number;
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  onLocationMove: (lat: number, lng: number, zoom: number) => void;
  kakaoMapRef: React.MutableRefObject<any>;
}

const PROPERTY_TYPES = [
  { group: "주거", items: ["아파트", "빌라/연립", "오피스텔", "원룸", "투룸", "단독/다가구", "전원주택", "상가주택", "재건축", "재개발"] },
  { group: "상가·업무·토지", items: ["상가", "사무실", "토지", "건물", "공장/창고", "지식산업센터"] },
];
const TRADE_TYPES = ["매매", "전세", "월세", "단기"];

export default function MobileFilterBar({ vacancies, filteredCount, filters, onFilterChange, onLocationMove, kakaoMapRef }: MobileFilterBarProps) {
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [fullFilterOpen, setFullFilterOpen] = useState(false);

  // Location search state
  const [locLabel, setLocLabel] = useState("위치");

  // Text search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Temp filters for full filter panel
  const [tempFilters, setTempFilters] = useState<FilterState>(filters);

  useEffect(() => { setTempFilters(filters); }, [filters]);
  useEffect(() => { if (searchOpen && searchInputRef.current) searchInputRef.current.focus(); }, [searchOpen]);

  const applyTextSearch = () => {
    onFilterChange({ keyword: searchText });
    setSearchOpen(false);
  };

  const hasActiveFilters = 
    filters.propertyTypes.length > 0 || 
    filters.tradeTypes.length > 0 || 
    filters.keyword !== "" ||
    filters.priceMin !== null || filters.priceMax !== null ||
    filters.areaMin !== null || filters.areaMax !== null ||
    filters.yearMin !== null || filters.yearMax !== null ||
    filters.floor !== null;

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: "7px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0,
    border: active ? "1.5px solid #4b89ff" : "1px solid #d1d5db",
    background: active ? "#eef4ff" : "#fff", color: active ? "#4b89ff" : "#374151",
    cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: "4px",
  });

  // Bottom sheet renderer
  const renderSheet = (title: string, content: React.ReactNode) => (
    <>
      <div onClick={() => setActivePanel(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 9990, transition: "opacity 0.2s" }} />
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 448, background: "#fff", borderRadius: "16px 16px 0 0", zIndex: 9991, maxHeight: "55vh", display: "flex", flexDirection: "column", animation: "sheetUp 0.3s ease-out" }}>
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "16px", fontWeight: 800, color: "#111" }}>{title}</span>
          <button onClick={() => setActivePanel(null)} style={{ background: "none", border: "none", fontSize: "22px", color: "#9ca3af", cursor: "pointer", padding: "4px" }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 24px" }}>{content}</div>
      </div>
    </>
  );

  const gridBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 4px", borderRadius: "8px", fontSize: "13px", fontWeight: active ? 700 : 500, textAlign: "center",
    border: active ? "1.5px solid #4b89ff" : "1px solid #e5e7eb",
    background: active ? "#eef4ff" : "#fff", color: active ? "#4b89ff" : "#374151",
    cursor: "pointer", transition: "all 0.15s",
  });

  return (
    <>
      <style>{`
        @keyframes sheetUp { from { transform: translateX(-50%) translateY(100%); } to { transform: translateX(-50%) translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .filter-scroll::-webkit-scrollbar { display: none; }
        .filter-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ═══ 필터 바 ═══ */}
      <div style={{ display: "flex", alignItems: "center", background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "8px 0 8px 0", flexShrink: 0, width: "100%" }}>
        {/* ≡ 통합필터 버튼 */}
        <button onClick={() => setFullFilterOpen(true)} style={{ flexShrink: 0, width: "40px", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", position: "relative" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.2" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="8" cy="6" r="2" fill="#374151" stroke="#fff" strokeWidth="1.5"/><circle cx="16" cy="12" r="2" fill="#374151" stroke="#fff" strokeWidth="1.5"/><circle cx="10" cy="18" r="2" fill="#374151" stroke="#fff" strokeWidth="1.5"/></svg>
          {hasActiveFilters && <div style={{ position: "absolute", top: 6, right: 6, width: 7, height: 7, borderRadius: "50%", background: "#ef4444" }} />}
        </button>
        <div style={{ width: 1, height: 20, background: "#e5e7eb", flexShrink: 0 }} />

        {/* 수평 스크롤 필 버튼들 */}
        <div style={{ position: "relative", flex: 1, minWidth: 0, overflow: "hidden" }}>
          <div className="filter-scroll" style={{ overflowX: "auto", display: "flex", gap: "8px", padding: "0 12px 0 12px", WebkitOverflowScrolling: "touch" as any }}>
            <button onClick={() => setActivePanel(activePanel === "loc" ? null : "loc")} style={pillStyle(activePanel === "loc" || locLabel !== "위치")}>📍 {locLabel} ▾</button>
            <button onClick={() => setActivePanel(activePanel === "prop" ? null : "prop")} style={pillStyle(activePanel === "prop" || filters.propertyTypes.length > 0)}>
              {filters.propertyTypes.length > 0 ? filters.propertyTypes.slice(0,2).join(", ") + (filters.propertyTypes.length > 2 ? ` +${filters.propertyTypes.length-2}` : "") : "매물유형"} ▾
            </button>
            <button onClick={() => setActivePanel(activePanel === "trade" ? null : "trade")} style={pillStyle(activePanel === "trade" || filters.tradeTypes.length > 0)}>
              {filters.tradeTypes.length > 0 ? filters.tradeTypes.join(", ") : "거래방식"} ▾
            </button>
            <button onClick={() => setActivePanel(activePanel === "price" ? null : "price")} style={pillStyle(activePanel === "price" || filters.priceMin !== null || filters.priceMax !== null)}>
              가격 ▾
            </button>
            <button onClick={() => setActivePanel(activePanel === "area" ? null : "area")} style={pillStyle(activePanel === "area" || filters.areaMin !== null || filters.areaMax !== null)}>
              면적 ▾
            </button>
            <button onClick={() => setActivePanel(activePanel === "detail" ? null : "detail")} style={pillStyle(activePanel === "detail" || filters.floor !== null || filters.yearMin !== null)}>
              층수/연식 ▾
            </button>
            {/* 오른쪽 패딩 확보 */}
            <div style={{ flexShrink: 0, width: "8px" }} />
          </div>
          {/* 오른쪽 페이드 그라데이션 힌트 */}
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "24px", background: "linear-gradient(to right, transparent, #fff)", pointerEvents: "none" }} />
        </div>
      </div>

      {/* ═══ 위치 검색 시트 ═══ */}
      {activePanel === "loc" && renderSheet("📍 위치 검색", (
        <LocationFilterPanel 
          onLocationMove={onLocationMove} 
          onClose={() => setActivePanel(null)} 
          locLabel={locLabel} 
          setLocLabel={setLocLabel} 
        />
      ))}

      {/* ═══ 매물유형 시트 ═══ */}
      {activePanel === "prop" && renderSheet("매물유형", (
        <PropertyTypeFilterPanel filters={filters} onFilterChange={onFilterChange} PROPERTY_TYPES={PROPERTY_TYPES} />
      ))}

      {/* ═══ 거래방식 시트 ═══ */}
      {activePanel === "trade" && renderSheet("거래방식", (
        <TradeTypeFilterPanel filters={filters} onFilterChange={onFilterChange} TRADE_TYPES={TRADE_TYPES} />
      ))}

      {/* ═══ 가격 시트 ═══ */}
      {activePanel === "price" && renderSheet("매매가/전세가/보증금", (
        <PriceFilterPanel filters={filters} onFilterChange={onFilterChange} />
      ))}

      {/* ═══ 면적 시트 ═══ */}
      {activePanel === "area" && renderSheet("면적", (
        <AreaFilterPanel filters={filters} onFilterChange={onFilterChange} />
      ))}

      {/* ═══ 층수/연식 시트 ═══ */}
      {activePanel === "detail" && renderSheet("층수 및 연식", (
        <DetailFilterPanel filters={filters} onFilterChange={onFilterChange} />
      ))}

      {/* ═══ 풀스크린 통합 필터 ═══ */}
      {fullFilterOpen && (
        <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 10001, display: "flex", flexDirection: "column", animation: "fadeIn 0.2s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #e5e7eb" }}>
            <span style={{ fontSize: "17px", fontWeight: 800 }}>필터</span>
            <button onClick={() => { setTempFilters(filters); setFullFilterOpen(false); }} style={{ background: "none", border: "none", fontSize: "22px", color: "#6b7280", cursor: "pointer" }}>✕</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 100px" }}>
            {/* 거래유형 */}
            <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>거래유형</div>
              <TradeTypeFilterPanel filters={tempFilters} onFilterChange={setTempFilters} TRADE_TYPES={TRADE_TYPES} />
            </div>

            {/* 매물유형 */}
            <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>매물유형</div>
              <PropertyTypeFilterPanel filters={tempFilters} onFilterChange={setTempFilters} PROPERTY_TYPES={PROPERTY_TYPES} />
            </div>
            
            {/* 가격 */}
            <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>가격</div>
              <PriceFilterPanel filters={tempFilters} onFilterChange={setTempFilters} />
            </div>

            {/* 면적 */}
            <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>면적</div>
              <AreaFilterPanel filters={tempFilters} onFilterChange={setTempFilters} />
            </div>

            {/* 층수 및 연식 */}
            <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>층수 및 연식</div>
              <DetailFilterPanel filters={tempFilters} onFilterChange={setTempFilters} />
            </div>
          </div>

          {/* 하단 CTA */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #e5e7eb", padding: "12px 20px 24px", display: "flex", gap: "12px" }}>
            <button 
              onClick={() => {
                const empty = { propertyTypes: [], tradeTypes: [], keyword: "", priceMin: null, priceMax: null, areaMin: null, areaMax: null, yearMin: null, yearMax: null, floor: null };
                setTempFilters(empty);
              }} 
              style={{ padding: "14px 20px", background: "#f3f4f6", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: 600, color: "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
            >
              ↻ 초기화
            </button>
            <button onClick={() => { onFilterChange(tempFilters); setFullFilterOpen(false); }} style={{ flex: 1, padding: "14px", background: "#4b89ff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: 800, color: "#fff", cursor: "pointer" }}>{filteredCount}개 매물 보기</button>
          </div>
        </div>
      )}

      {/* ═══ 텍스트 검색 오버레이 ═══ */}
      {searchOpen && (
        <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 10002, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px", borderBottom: "1px solid #e5e7eb" }}>
            <button onClick={() => { setSearchOpen(false); setSearchText(""); }} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#6b7280" }}>←</button>
            <input ref={searchInputRef} type="text" placeholder="건물명, 주소, 매물번호 검색" value={searchText} onChange={e => setSearchText(e.target.value)} onKeyDown={e => e.key === "Enter" && applyTextSearch()} style={{ flex: 1, padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "15px", outline: "none" }} />
            <button onClick={applyTextSearch} style={{ flexShrink: 0, padding: "10px 14px", background: "#4b89ff", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>🔍</button>
          </div>
          {searchText && (
            <div style={{ padding: "16px 20px", flex: 1, overflowY: "auto" }}>
              <div style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "12px" }}>매물 검색 결과</div>
              {vacancies.filter(v => {
                const q = searchText.toLowerCase();
                return (v.building_name || "").toLowerCase().includes(q) || (v.dong || "").toLowerCase().includes(q) || (v.sigungu || "").toLowerCase().includes(q) || (v.vacancy_no || "").toLowerCase().includes(q) || (v.property_type || "").toLowerCase().includes(q);
              }).slice(0, 20).map((v, i) => (
                <div key={i} style={{ padding: "12px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#111" }}>📍 {v.building_name || [v.dong, v.sigungu].filter(Boolean).join(" ")}</div>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>{[v.sido, v.sigungu, v.dong].filter(Boolean).join(" ")} · {v.trade_type} {v.property_type}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
