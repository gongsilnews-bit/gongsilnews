"use client";
import React, { useState, useEffect, useRef } from "react";

interface FilterState {
  propertyTypes: string[];
  tradeTypes: string[];
  keyword: string;
}

interface MobileFilterBarProps {
  vacancies: any[];
  filteredCount: number;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
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
  const [locTab, setLocTab] = useState<"region" | "keyword">("region");
  const [sidoList, setSidoList] = useState<any[]>([]);
  const [gugunList, setGugunList] = useState<any[]>([]);
  const [dongList, setDongList] = useState<any[]>([]);
  const [selSido, setSelSido] = useState("");
  const [selGugun, setSelGugun] = useState("");
  const [selSidoCode, setSelSidoCode] = useState("");
  const [selGugunCode, setSelGugunCode] = useState("");
  const [locKeyword, setLocKeyword] = useState("");
  const [locResults, setLocResults] = useState<any[]>([]);
  const [locLabel, setLocLabel] = useState("위치");
  const [regTab, setRegTab] = useState<"sido"|"gugun"|"dong">("sido");

  // Text search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Temp filters for full filter panel
  const [tempFilters, setTempFilters] = useState<FilterState>(filters);

  useEffect(() => { loadSido(); }, []);
  useEffect(() => { setTempFilters(filters); }, [filters]);
  useEffect(() => { if (searchOpen && searchInputRef.current) searchInputRef.current.focus(); }, [searchOpen]);

  const loadSido = async () => {
    try {
      const res = await fetch('https://grpc-proxy-server-mkvo6j4wsq-du.a.run.app/v1/regcodes?regcode_pattern=*00000000');
      const data = await res.json();
      setSidoList(data.regcodes || []);
    } catch (e) { console.error(e); }
  };
  const loadGugun = async (code: string) => {
    setGugunList([]);
    try {
      const res = await fetch(`https://grpc-proxy-server-mkvo6j4wsq-du.a.run.app/v1/regcodes?regcode_pattern=${code.substring(0,2)}*00000&is_ignore_zero=true`);
      const data = await res.json();
      setGugunList((data.regcodes || []).sort((a:any,b:any) => a.name.localeCompare(b.name)).map((c:any) => ({ code: c.code, name: c.name.split(' ').slice(1).join(' ') })));
    } catch (e) { console.error(e); }
  };
  const loadDong = async (code: string) => {
    setDongList([]);
    try {
      const res = await fetch(`https://grpc-proxy-server-mkvo6j4wsq-du.a.run.app/v1/regcodes?regcode_pattern=${code.substring(0,5)}*&is_ignore_zero=true`);
      const data = await res.json();
      setDongList((data.regcodes || []).filter((c:any) => c.code !== code).sort((a:any,b:any) => a.name.localeCompare(b.name)).map((c:any) => { const p = c.name.split(' '); return { code: c.code, name: p[p.length-1] }; }));
    } catch (e) { console.error(e); }
  };

  const moveMap = (keyword: string, zoom: number) => {
    const kakao = (window as any).kakao;
    if (!kakao?.maps?.services) return;
    const ps = new kakao.maps.services.Places();
    ps.keywordSearch(keyword, (data: any, status: any) => {
      if (status === kakao.maps.services.Status.OK && data.length > 0) {
        onLocationMove(parseFloat(data[0].y), parseFloat(data[0].x), zoom);
      }
    });
  };

  const doLocKeywordSearch = () => {
    if (!locKeyword.trim()) return;
    const kakao = (window as any).kakao;
    if (!kakao?.maps?.services) return;
    const ps = new kakao.maps.services.Places();
    ps.keywordSearch(locKeyword, (data: any, status: any) => {
      if (status === kakao.maps.services.Status.OK) setLocResults(data);
      else setLocResults([]);
    });
  };

  const toggleProp = (arr: string[], item: string) => arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];

  const applyTextSearch = () => {
    onFilterChange({ ...filters, keyword: searchText });
    setSearchOpen(false);
  };

  const hasActiveFilters = filters.propertyTypes.length > 0 || filters.tradeTypes.length > 0 || filters.keyword;
  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: "7px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap",
    border: active ? "1.5px solid #4b89ff" : "1px solid #d1d5db",
    background: active ? "#eef4ff" : "#fff", color: active ? "#4b89ff" : "#374151",
    cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: "4px",
  });

  // Bottom sheet renderer
  const renderSheet = (title: string, content: React.ReactNode) => (
    <>
      <div onClick={() => setActivePanel(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 9990, transition: "opacity 0.2s" }} />
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50)", width: "100%", maxWidth: 448, background: "#fff", borderRadius: "16px 16px 0 0", zIndex: 9991, maxHeight: "55vh", display: "flex", flexDirection: "column", animation: "sheetUp 0.3s ease-out" }}>
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
      <div style={{ display: "flex", alignItems: "center", background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "8px 0 8px 0", flexShrink: 0 }}>
        {/* ≡ 통합필터 버튼 */}
        <button onClick={() => setFullFilterOpen(true)} style={{ flexShrink: 0, width: "40px", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", position: "relative" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.2" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="8" cy="6" r="2" fill="#374151" stroke="#fff" strokeWidth="1.5"/><circle cx="16" cy="12" r="2" fill="#374151" stroke="#fff" strokeWidth="1.5"/><circle cx="10" cy="18" r="2" fill="#374151" stroke="#fff" strokeWidth="1.5"/></svg>
          {hasActiveFilters && <div style={{ position: "absolute", top: 6, right: 6, width: 7, height: 7, borderRadius: "50%", background: "#ef4444" }} />}
        </button>
        <div style={{ width: 1, height: 20, background: "#e5e7eb", flexShrink: 0 }} />

        {/* 수평 스크롤 필 버튼들 */}
        <div className="filter-scroll" style={{ flex: 1, overflowX: "auto", display: "flex", gap: "8px", padding: "0 12px", WebkitOverflowScrolling: "touch" as any }}>
          <button onClick={() => setActivePanel(activePanel === "loc" ? null : "loc")} style={pillStyle(activePanel === "loc" || locLabel !== "위치")}>📍 {locLabel} ▾</button>
          <button onClick={() => setActivePanel(activePanel === "prop" ? null : "prop")} style={pillStyle(activePanel === "prop" || filters.propertyTypes.length > 0)}>
            {filters.propertyTypes.length > 0 ? filters.propertyTypes.slice(0,2).join(", ") + (filters.propertyTypes.length > 2 ? ` +${filters.propertyTypes.length-2}` : "") : "매물유형"} ▾
          </button>
          <button onClick={() => setActivePanel(activePanel === "trade" ? null : "trade")} style={pillStyle(activePanel === "trade" || filters.tradeTypes.length > 0)}>
            {filters.tradeTypes.length > 0 ? filters.tradeTypes.join(", ") : "거래방식"} ▾
          </button>
          <button style={pillStyle(false)} onClick={() => setActivePanel(null)}>가격 ▾</button>
          <button style={pillStyle(false)} onClick={() => setActivePanel(null)}>면적 ▾</button>
          <button style={pillStyle(false)} onClick={() => setActivePanel(null)}>층수 ▾</button>
          <button style={pillStyle(false)} onClick={() => setActivePanel(null)}>방향 ▾</button>
          <button style={pillStyle(false)} onClick={() => setActivePanel(null)}>옵션 ▾</button>
        </div>
      </div>

      {/* ═══ 위치 검색 시트 ═══ */}
      {activePanel === "loc" && renderSheet("📍 위치 검색", (
        <div>
          <div style={{ display: "flex", borderBottom: "2px solid #f3f4f6", marginBottom: "16px" }}>
            <button onClick={() => setLocTab("region")} style={{ flex: 1, padding: "10px", fontSize: "14px", fontWeight: locTab === "region" ? 700 : 500, color: locTab === "region" ? "#4b89ff" : "#9ca3af", borderBottom: locTab === "region" ? "2px solid #4b89ff" : "2px solid transparent", background: "none", border: "none", cursor: "pointer" }}>지역선택</button>
            <button onClick={() => setLocTab("keyword")} style={{ flex: 1, padding: "10px", fontSize: "14px", fontWeight: locTab === "keyword" ? 700 : 500, color: locTab === "keyword" ? "#4b89ff" : "#9ca3af", borderBottom: locTab === "keyword" ? "2px solid #4b89ff" : "2px solid transparent", background: "none", border: "none", cursor: "pointer" }}>키워드검색</button>
          </div>
          {locTab === "region" ? (
            <div>
              <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
                {(["sido","gugun","dong"] as const).map(t => (
                  <button key={t} onClick={() => setRegTab(t)} style={{ flex: 1, padding: "8px 4px", fontSize: "13px", fontWeight: regTab === t ? 700 : 500, background: regTab === t ? "#4b89ff" : "#f3f4f6", color: regTab === t ? "#fff" : "#6b7280", borderRadius: "6px", border: "none", cursor: "pointer" }}>
                    {t === "sido" ? "시/도" : t === "gugun" ? "시/군/구" : "읍/면/동"}
                  </button>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
                {regTab === "sido" && (sidoList.length > 0 ? sidoList.map(c => (
                  <button key={c.code} onClick={() => { setSelSidoCode(c.code); setSelSido(c.name); setSelGugun(""); setRegTab("gugun"); loadGugun(c.code); moveMap(c.name, 8); setLocLabel(c.name); }} style={gridBtnStyle(selSido === c.name)}>{c.name}</button>
                )) : <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px", color: "#9ca3af" }}>로딩중...</div>)}
                {regTab === "gugun" && (!selSidoCode ? <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px", color: "#9ca3af" }}>시/도를 먼저 선택하세요</div> : gugunList.length > 0 ? gugunList.map(c => (
                  <button key={c.code} onClick={() => { setSelGugunCode(c.code); setSelGugun(c.name); setRegTab("dong"); loadDong(c.code); moveMap(`${selSido} ${c.name}`, 6); setLocLabel(`${c.name}`); }} style={gridBtnStyle(selGugun === c.name)}>{c.name}</button>
                )) : <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px", color: "#9ca3af" }}>로딩중...</div>)}
                {regTab === "dong" && (!selGugunCode ? <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px", color: "#9ca3af" }}>시/군/구를 먼저 선택하세요</div> : dongList.length > 0 ? dongList.map(c => (
                  <button key={c.code} onClick={() => { moveMap(`${selSido} ${selGugun} ${c.name}`, 4); setLocLabel(`${selGugun} ${c.name}`); setActivePanel(null); }} style={gridBtnStyle(false)}>{c.name}</button>
                )) : <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px", color: "#9ca3af" }}>로딩중...</div>)}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                <input type="text" placeholder="동, 읍, 면 또는 랜드마크 검색" value={locKeyword} onChange={e => setLocKeyword(e.target.value)} onKeyDown={e => e.key === "Enter" && doLocKeywordSearch()} style={{ flex: 1, padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", outline: "none" }} />
                <button onClick={doLocKeywordSearch} style={{ padding: "10px 16px", background: "#4b89ff", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>이동</button>
              </div>
              <div style={{ maxHeight: "180px", overflowY: "auto" }}>
                {locResults.map((r, i) => (
                  <div key={i} onClick={() => { onLocationMove(parseFloat(r.y), parseFloat(r.x), 5); setLocLabel(r.place_name || r.address_name); setActivePanel(null); }} style={{ padding: "12px 4px", borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#111" }}>{r.place_name || r.address_name}</div>
                    <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>{r.address_name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* ═══ 매물유형 시트 ═══ */}
      {activePanel === "prop" && renderSheet("매물유형", (
        <div>
          {PROPERTY_TYPES.map(g => (
            <div key={g.group} style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#6b7280", marginBottom: "8px" }}>{g.group}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                {g.items.map(item => (
                  <button key={item} onClick={() => onFilterChange({ ...filters, propertyTypes: toggleProp(filters.propertyTypes, item) })} style={gridBtnStyle(filters.propertyTypes.includes(item))}>{item}</button>
                ))}
              </div>
            </div>
          ))}
          <button onClick={() => onFilterChange({ ...filters, propertyTypes: [] })} style={{ width: "100%", padding: "12px", background: "#f3f4f6", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, color: "#6b7280", cursor: "pointer", marginTop: "8px" }}>초기화</button>
        </div>
      ))}

      {/* ═══ 거래방식 시트 ═══ */}
      {activePanel === "trade" && renderSheet("거래방식", (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
            {TRADE_TYPES.map(t => (
              <button key={t} onClick={() => onFilterChange({ ...filters, tradeTypes: toggleProp(filters.tradeTypes, t) })} style={{ ...gridBtnStyle(filters.tradeTypes.includes(t)), padding: "14px" }}>{t}</button>
            ))}
          </div>
          <button onClick={() => onFilterChange({ ...filters, tradeTypes: [] })} style={{ width: "100%", padding: "12px", background: "#f3f4f6", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, color: "#6b7280", cursor: "pointer", marginTop: "16px" }}>초기화</button>
        </div>
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                {TRADE_TYPES.map(t => (
                  <button key={t} onClick={() => setTempFilters(p => ({ ...p, tradeTypes: toggleProp(p.tradeTypes, t) }))} style={gridBtnStyle(tempFilters.tradeTypes.includes(t))}>{t}</button>
                ))}
              </div>
            </div>

            {/* 매물유형 */}
            <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>매물유형</div>
              {PROPERTY_TYPES.map(g => (
                <div key={g.group} style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "6px" }}>{g.group}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                    {g.items.map(item => (
                      <button key={item} onClick={() => setTempFilters(p => ({ ...p, propertyTypes: toggleProp(p.propertyTypes, item) }))} style={gridBtnStyle(tempFilters.propertyTypes.includes(item))}>{item}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 하단 CTA */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #e5e7eb", padding: "12px 20px 24px", display: "flex", gap: "12px" }}>
            <button onClick={() => setTempFilters({ propertyTypes: [], tradeTypes: [], keyword: "" })} style={{ padding: "14px 20px", background: "#f3f4f6", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: 600, color: "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>↻ 초기화</button>
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
