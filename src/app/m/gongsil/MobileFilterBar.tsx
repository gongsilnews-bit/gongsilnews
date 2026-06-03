"use client";
import React, { useState, useEffect, useRef } from "react";
import { FilterState } from "./filters/useVacancyFilters";
import LocationFilterPanel from "./filters/LocationFilterPanel";
import PropertyTypeFilterPanel from "./filters/PropertyTypeFilterPanel";
import TradeTypeFilterPanel from "./filters/TradeTypeFilterPanel";
import PriceFilterPanel from "./filters/PriceFilterPanel";
import AreaFilterPanel from "./filters/AreaFilterPanel";
import { FloorFilterPanel, YearFilterPanel, OwnerRoleFilterPanel, CommissionFilterPanel, ThemeFilterPanel } from "./filters/SubFilterPanels";

interface MobileFilterBarProps {
  vacancies: any[];
  filteredCount: number;
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  onLocationMove: (lat: number, lng: number, zoom: number) => void;
  onShowList?: (mode?: "map" | "filter") => void;
  kakaoMapRef: React.MutableRefObject<any>;
  locLabel: string;
  setLocLabel: React.Dispatch<React.SetStateAction<string>>;
  activeMode?: "ê³µì‹¤" | "ê²½ë§¤";
}

const TRADE_TYPES = ["ë§¤ë§¤", "?„ì„¸", "?”ì„¸", "?¨ê¸°"];

export default function MobileFilterBar({ vacancies, filteredCount, filters, onFilterChange, onLocationMove, onShowList, kakaoMapRef, locLabel, setLocLabel, activeMode }: MobileFilterBarProps) {
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [fullFilterOpen, setFullFilterOpen] = useState(false);

  // ?? [?€?œë‹˜ ì§€ì¹? ë²•ì› ê²½ê³µë§?ëª¨ë“œ ì§„ì… ??PC?€ ?‘ê°™?€ 8?€ ì¹´í…Œê³ ë¦¬ êµ¬ì„±?¼ë¡œ ì§€?¥í˜• ?„ê²© ì¹˜í™˜!
  const PROPERTY_TYPES = activeMode === "ê²½ë§¤" ? [
    { group: "ì£¼ê±°", items: ["?„íŒŒ??, "?¨ë…/?¤ê?êµ?, "ë¹Œë¼/ì£¼íƒ"] },
    { group: "?ì—…Â·?…ë¬´", items: ["ë¹Œë”©/?¬ë¬´??, "ê³µì¥/ì°½ê³ "] },
    { group: "? ì?", items: ["? ì?"] }
  ] : [
    { group: "ì£¼ê±°", items: ["?„íŒŒ??, "ë¹Œë¼/?°ë¦½", "?¤í”¼?¤í…”", "?ë£¸", "1.5ë£?, "?¬ë£¸", "?¨ë…/?¤ê?êµ?, "?„ì›ì£¼íƒ", "?ê?ì£¼íƒ"] },
    { group: "?ê?Â·?…ë¬´Â·? ì?", items: ["?ê?", "?¬ë¬´??, "? ì?", "ê±´ë¬¼", "ê³µì¥/ì°½ê³ ", "ì§€?ì‚°?…ì„¼??] },
  ];

  // Text search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Temp filters for full filter panel
  const [tempFilters, setTempFilters] = useState<FilterState>(filters);

  useEffect(() => { setTempFilters(filters); }, [filters]);
  useEffect(() => { if (searchOpen && searchInputRef.current) searchInputRef.current.focus(); }, [searchOpen]);

  useEffect(() => {
    if (!filters.sido && !filters.sigungu && !filters.dong) {
      setLocLabel("?„ì¹˜");
    }
  }, [filters.sido, filters.sigungu, filters.dong]);

  const handleTempFilterChange = (partial: Partial<FilterState>) => {
    setTempFilters(prev => ({ ...prev, ...partial }));
  };

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
    filters.floor !== null ||
    filters.ownerRole !== null ||
    filters.commissionType !== null ||
    filters.commissionType !== null ||
    filters.themes.length > 0;

  const currentYear = new Date().getFullYear();
  const yearLabel = filters.yearMin === currentYear - 1 ? "1???´ë‚´" :
    filters.yearMin === currentYear - 5 ? "5???´ë‚´" :
    filters.yearMin === currentYear - 10 ? "10???´ë‚´" :
    filters.yearMin === currentYear - 15 ? "15???´ë‚´" :
    filters.yearMax === currentYear - 15 ? "15???´ìƒ" :
    "?¬ìš©?¹ì¸??;

  const ownerLabel = filters.ownerRole === 'USER' ? '?¼ë°˜?? : filters.ownerRole === 'REALTOR' ? 'ë¶€?™ì‚°' : '?±ë¡??;
  const commissionLabel = filters.commissionType === 'ê³µë™ì¤‘ê°œ' ? 'ê³µë™ì¤‘ê°œ' : filters.commissionType === '100' ? '100%(ë²•ì •)' : filters.commissionType ? `${filters.commissionType}%~` : 'ì¤‘ê°œë³´ìˆ˜';
  const themeLabel = filters.themes.length > 0 ? `?Œë§ˆ ${filters.themes.length}ê°? : '?Œë§ˆ';

  const priceLabel = (filters.priceMin !== null || filters.priceMax !== null) ? `${filters.priceMin !== null ? `${filters.priceMin >= 10000 ? `${filters.priceMin / 10000}?? : `${filters.priceMin}ë§?}` : ""}~${filters.priceMax !== null ? `${filters.priceMax >= 10000 ? `${filters.priceMax / 10000}?? : `${filters.priceMax}ë§?}` : ""}` : "ê°€ê²©ë?";
  const areaLabel = (filters.areaMin !== null || filters.areaMax !== null) ? `${filters.areaMin !== null ? filters.areaMin : ""}~${filters.areaMax !== null ? filters.areaMax : ""}?? : "ë©´ì ";

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 16px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: active ? 800 : 500, // ?œì„±????800?¼ë¡œ ì°í•˜ê²?
    whiteSpace: "nowrap",
    flexShrink: 0,
    border: active ? "2px solid #1a73e8" : "1px solid #d1d5db", // ?œì„±????2px solid #1a73e8 ë¡???êµµê³  ì§„í•˜ê²?
    background: active ? "#f0f7ff" : "#fff",
    color: active ? "#1a73e8" : "#4b5563", // ?œì„±????ê³ ë?ë¹??Œë???
    cursor: "pointer",
    transition: "all 0.15s ease",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    boxShadow: active ? "0 2px 8px rgba(26, 115, 232, 0.15)" : "none"
  });

  // Bottom sheet renderer
  const renderSheet = (title: string, content: React.ReactNode, customZIndex?: number) => {
    const zBase = customZIndex || 9990;
    return (
      <>
        <div onClick={() => setActivePanel(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: zBase, transition: "opacity 0.2s" }} />
        <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 448, background: "#fff", borderRadius: "16px 16px 0 0", zIndex: zBase + 1, maxHeight: "55vh", display: "flex", flexDirection: "column", animation: "sheetUp 0.3s ease-out" }}>
          <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "16px", fontWeight: 800, color: "#111" }}>{title}</span>
            <button onClick={() => setActivePanel(null)} style={{ background: "none", border: "none", fontSize: "22px", color: "#9ca3af", cursor: "pointer", padding: "4px" }}>??/button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 24px", WebkitOverflowScrolling: "touch", overscrollBehaviorY: "contain" }}>{content}</div>
        </div>
      </>
    );
  };

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

      {/* ?â•???„í„° ë°??â•??*/}
      <div style={{ display: "flex", alignItems: "center", background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "8px 0 8px 0", flexShrink: 0, width: "100%" }}>
        {/* ???µí•©?„í„° ë²„íŠ¼ */}
        {activeMode !== "ê²½ë§¤" && (
          <>
            <button onClick={() => setFullFilterOpen(true)} style={{ flexShrink: 0, width: "40px", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", position: "relative" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.2" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="8" cy="6" r="2" fill="#374151" stroke="#fff" strokeWidth="1.5"/><circle cx="16" cy="12" r="2" fill="#374151" stroke="#fff" strokeWidth="1.5"/><circle cx="10" cy="18" r="2" fill="#374151" stroke="#fff" strokeWidth="1.5"/></svg>
              {hasActiveFilters && <div style={{ position: "absolute", top: 6, right: 6, width: 7, height: 7, borderRadius: "50%", background: "#ef4444" }} />}
            </button>
            <div style={{ width: 1, height: 20, background: "#e5e7eb", flexShrink: 0 }} />
          </>
        )}

        {/* ?˜í‰ ?¤í¬ë¡???ë²„íŠ¼??*/}
        <div style={{ position: "relative", flex: 1, minWidth: 0, overflow: "hidden" }}>
          <div className="filter-scroll" style={{ overflowX: "auto", display: "flex", gap: "8px", padding: "0 12px 0 12px", WebkitOverflowScrolling: "touch" as any }}>
            <button onClick={() => setActivePanel(activePanel === "loc" ? null : "loc")} style={pillStyle(activePanel === "loc" || locLabel !== "?„ì¹˜")}>?“ {locLabel} ??/button>
            <button onClick={() => setActivePanel(activePanel === "prop" ? null : "prop")} style={pillStyle(activePanel === "prop" || filters.propertyTypes.length > 0)}>
              {filters.propertyTypes.length === PROPERTY_TYPES.flatMap(g => g.items).length 
                ? "?„ì²´? í˜•" 
                : filters.propertyTypes.length > 0 
                ? filters.propertyTypes.slice(0,2).join(", ") + (filters.propertyTypes.length > 2 ? ` +${filters.propertyTypes.length-2}` : "") 
                : activeMode === "ê²½ë§¤" ? "ê²½ê³µë§¤ìœ ?? : "ê³µì‹¤ê´‘ê³ ? í˜•"} ??            </button>
            {activeMode !== "ê²½ë§¤" && (
              <button onClick={() => setActivePanel(activePanel === "trade" ? null : "trade")} style={pillStyle(activePanel === "trade" || filters.tradeTypes.length > 0)}>
                {filters.tradeTypes.length === TRADE_TYPES.length || filters.tradeTypes.length === 0
                  ? "?„ì²´ê±°ë˜" 
                  : filters.tradeTypes.join(", ")} ??              </button>
            )}
            {activeMode !== "ê²½ë§¤" && (
              <button 
                onClick={() => setFullFilterOpen(true)} 
                style={{
                  ...pillStyle(fullFilterOpen || hasActiveFilters),
                  backgroundColor: hasActiveFilters ? "#eef4ff" : "#fff",
                  borderColor: hasActiveFilters ? "#4b89ff" : "#d1d5db",
                  color: hasActiveFilters ? "#4b89ff" : "#374151",
                }}
              >
                ?›ï¸?ê°€ê²©Â·ì¡°ê±´í•„????                {hasActiveFilters && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", marginLeft: "2px" }} />}
              </button>
            )}
            {/* ?¤ë¥¸ìª??¨ë”© ?•ë³´ */}
            <div style={{ flexShrink: 0, width: "8px" }} />
          </div>
          {/* ?¤ë¥¸ìª??˜ì´??ê·¸ë¼?°ì´???ŒíŠ¸ */}
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "24px", background: "linear-gradient(to right, transparent, #fff)", pointerEvents: "none" }} />
        </div>
      </div>

      {/* ?â•???„ì¹˜ ê²€???œíŠ¸ ?â•??*/}
      {activePanel === "loc" && renderSheet("?“ ?„ì¹˜ ê²€??, (
        <LocationFilterPanel 
          onLocationMove={onLocationMove} 
          onFilterChange={onFilterChange}
          onClose={() => setActivePanel(null)} 
          locLabel={locLabel} 
          setLocLabel={setLocLabel} 
        />
      ))}

      {/* ?â•??ê³µì‹¤ê´‘ê³ ? í˜• ?œíŠ¸ ?â•??*/}
      {activePanel === "prop" && renderSheet("ê³µì‹¤ê´‘ê³ ? í˜•", (
        <PropertyTypeFilterPanel filters={filters} onFilterChange={onFilterChange} PROPERTY_TYPES={PROPERTY_TYPES} />
      ))}

      {/* ?â•??ê±°ë˜ë°©ì‹ ?œíŠ¸ ?â•??*/}
      {activePanel === "trade" && renderSheet("ê±°ë˜ë°©ì‹", (
        <TradeTypeFilterPanel filters={filters} onFilterChange={onFilterChange} TRADE_TYPES={TRADE_TYPES.filter(t => !(filters.propertyTypes.length > 0 && filters.propertyTypes.every(p => p === "?ë£¸" || p === "?¬ë£¸") && t === "ë§¤ë§¤"))} />
      ))}

      {/* ?â•??ê°€ê²??œíŠ¸ ?â•??*/}
      {activePanel === "price" && renderSheet("ë§¤ë§¤ê°€/?„ì„¸ê°€/ë³´ì¦ê¸?, (
        <PriceFilterPanel filters={filters} onFilterChange={onFilterChange} />
      ))}

      {/* ?â•??ë©´ì  ?œíŠ¸ ?â•??*/}
      {activePanel === "area" && renderSheet("ë©´ì ", (
        <AreaFilterPanel filters={filters} onFilterChange={onFilterChange} />
      ))}

      {/* ?â•??ì¸µìˆ˜ ?œíŠ¸ ?â•??*/}
      {activePanel === "floor" && renderSheet("ì¸µìˆ˜", <FloorFilterPanel filters={filters} onFilterChange={onFilterChange} />)}

      {/* ?â•???¬ìš©?¹ì¸???œíŠ¸ ?â•??*/}
      {activePanel === "year" && renderSheet("?¬ìš©?¹ì¸??(?°ì‹)", <YearFilterPanel filters={filters} onFilterChange={onFilterChange} />)}

      {/* ?â•???±ë¡???œíŠ¸ ?â•??*/}
      {activePanel === "owner" && renderSheet("?±ë¡??? í˜•", <OwnerRoleFilterPanel filters={filters} onFilterChange={onFilterChange} />)}

      {/* ?â•??ì¤‘ê°œë³´ìˆ˜ ?œíŠ¸ ?â•??*/}
      {activePanel === "commission" && renderSheet("ì¤‘ê°œë³´ìˆ˜", <CommissionFilterPanel filters={filters} onFilterChange={onFilterChange} />)}

      {/* ?â•???Œë§ˆ ?œíŠ¸ ?â•??*/}
      {activePanel === "theme" && renderSheet("?Œë§ˆ ?¤ì›Œ??, <ThemeFilterPanel filters={filters} onFilterChange={onFilterChange} />)}

      {/* ?â•???€?¤í¬ë¦??µí•© ?„í„° ?â•??*/}
      {fullFilterOpen && (
        <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 10001, display: "flex", flexDirection: "column", animation: "fadeIn 0.2s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #e5e7eb" }}>
            <span style={{ fontSize: "17px", fontWeight: 800 }}>?„í„°</span>
            <button onClick={() => { setTempFilters(filters); setFullFilterOpen(false); }} style={{ background: "none", border: "none", fontSize: "22px", color: "#6b7280", cursor: "pointer" }}>??/button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 100px", WebkitOverflowScrolling: "touch", overscrollBehaviorY: "contain" }}>
            {/* ?„ì¹˜ ê²€??*/}
            <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>?„ì¹˜ (??êµ???</div>
              <LocationFilterPanel 
                variant="inline"
                tempFilters={tempFilters}
                onLocationMove={onLocationMove} 
                onFilterChange={handleTempFilterChange}
                onClose={() => {}} 
                locLabel={locLabel} 
                setLocLabel={setLocLabel} 
              />
            </div>

            {/* ê±°ë˜? í˜• */}
            <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>ê±°ë˜? í˜•</div>
              <TradeTypeFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} TRADE_TYPES={TRADE_TYPES.filter(t => !(tempFilters.propertyTypes.length > 0 && tempFilters.propertyTypes.every(p => p === "?ë£¸" || p === "?¬ë£¸") && t === "ë§¤ë§¤"))} />
            </div>

            {/* ê³µì‹¤ê´‘ê³ ? í˜• */}
            <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>ê³µì‹¤ê´‘ê³ ? í˜•</div>
              <PropertyTypeFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} PROPERTY_TYPES={PROPERTY_TYPES} />
            </div>
            
            {/* ê°€ê²?*/}
            <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>ê°€ê²?/div>
              <PriceFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} />
            </div>

            {/* ë©´ì  */}
            <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>ë©´ì </div>
              <AreaFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} />
            </div>

            {/* ì¸µìˆ˜ */}
            <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>ì¸µìˆ˜</div>
              <FloorFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} />
            </div>

            {/* ?¬ìš©?¹ì¸??*/}
            <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>?¬ìš©?¹ì¸??(?°ì‹)</div>
              <YearFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} />
            </div>

            {/* ?±ë¡??? í˜• */}
            <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>?±ë¡??? í˜•</div>
              <OwnerRoleFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} />
            </div>

            {/* ì¤‘ê°œë³´ìˆ˜ */}
            <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>ì¤‘ê°œë³´ìˆ˜</div>
              <CommissionFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} />
            </div>

            {/* ?Œë§ˆ */}
            <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>?Œë§ˆ ?¤ì›Œ??/div>
              <ThemeFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} />
            </div>
          </div>

          {/* ?˜ë‹¨ CTA */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #e5e7eb", padding: "12px 20px 24px", display: "flex", gap: "12px" }}>
            <button 
              onClick={() => {
                const allPropTypes = PROPERTY_TYPES.flatMap(g => g.items);
                const empty = { propertyTypes: allPropTypes, tradeTypes: [], keyword: "", priceMin: null, priceMax: null, areaMin: null, areaMax: null, yearMin: null, yearMax: null, floor: null, ownerRole: null, commissionType: null, themes: [], sido: null, sigungu: null, dong: null };
                setTempFilters(empty);
                setLocLabel("?„ì¹˜");
              }} 
              style={{ padding: "14px 20px", background: "#f3f4f6", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: 600, color: "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
            >
              ??ì´ˆê¸°??            </button>
            <button onClick={() => { 
              onFilterChange(tempFilters); 
              setFullFilterOpen(false); 
              if (onShowList) onShowList("filter"); 
            }} style={{ flex: 1, padding: "14px", background: "#4b89ff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: 800, color: "#fff", cursor: "pointer" }}>{filteredCount}ê°?ê³µì‹¤ê´‘ê³  ë³´ê¸°</button>
          </div>

        </div>
      )}

      {/* ?â•???ìŠ¤??ê²€???¤ë²„?ˆì´ ?â•??*/}
      {searchOpen && (
        <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 10002, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px", borderBottom: "1px solid #e5e7eb" }}>
            <button onClick={() => { setSearchOpen(false); setSearchText(""); }} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#6b7280" }}>??/button>
            <input ref={searchInputRef} type="text" placeholder="ê±´ë¬¼ëª? ì£¼ì†Œ, ê³µì‹¤ê´‘ê³ ë²ˆí˜¸ ê²€?? value={searchText} onChange={e => setSearchText(e.target.value)} onKeyDown={e => e.key === "Enter" && applyTextSearch()} style={{ flex: 1, padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "15px", outline: "none" }} />
            <button onClick={applyTextSearch} style={{ flexShrink: 0, padding: "10px 14px", background: "#4b89ff", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>?”</button>
          </div>
          {searchText && (
            <div style={{ padding: "16px 20px", flex: 1, overflowY: "auto" }}>
              <div style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "12px" }}>ê³µì‹¤ê´‘ê³  ê²€??ê²°ê³¼</div>
              {vacancies.filter(v => {
                const q = searchText.toLowerCase();
                return (v.building_name || "").toLowerCase().includes(q) || (v.dong || "").toLowerCase().includes(q) || (v.sigungu || "").toLowerCase().includes(q) || (v.vacancy_no || "").toLowerCase().includes(q) || (v.property_type || "").toLowerCase().includes(q);
              }).slice(0, 20).map((v, i) => (
                <div key={i} style={{ padding: "12px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#111" }}>?“ {v.building_name || [v.dong, v.sigungu].filter(Boolean).join(" ")}</div>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>{[v.sido, v.sigungu, v.dong].filter(Boolean).join(" ")} Â· {v.trade_type} {v.property_type}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
