import React, { useState, useEffect } from 'react';
import { FilterState } from './useVacancyFilters';

interface Props {
  onLocationMove: (lat: number, lng: number, zoom: number) => void;
  onFilterChange?: (filters: Partial<FilterState>) => void;
  onClose?: () => void;
  locLabel?: string;
  setLocLabel?: (label: string) => void;
  variant?: "sheet" | "inline";
  tempFilters?: Partial<FilterState>;
}

export default function LocationFilterPanel({ onLocationMove, onFilterChange, onClose, locLabel, setLocLabel, variant = "sheet", tempFilters }: Props) {
  const [locTab, setLocTab] = useState<"region" | "keyword">("region");
  const [sidoList, setSidoList] = useState<any[]>([]);
  const [gugunList, setGugunList] = useState<any[]>([]);
  const [dongList, setDongList] = useState<any[]>([]);
  const [selSido, setSelSido] = useState("");
  const [selGugun, setSelGugun] = useState("");
  const [selDong, setSelDong] = useState("");
  const [selSidoCode, setSelSidoCode] = useState("");
  const [selGugunCode, setSelGugunCode] = useState("");
  const [locKeyword, setLocKeyword] = useState("");
  const [locResults, setLocResults] = useState<any[]>([]);
  const [regTab, setRegTab] = useState<"sido"|"gugun"|"dong">("sido");
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => { loadSido(); }, []);

  useEffect(() => { 
    setSelSido(tempFilters?.sido || "");
    setSelGugun(tempFilters?.sigungu || "");
    setSelDong(tempFilters?.dong || "");
    
    if (!tempFilters?.sido) {
      setSelSidoCode("");
      setSelGugunCode("");
      setRegTab("sido");
    }
  }, [tempFilters]);

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

  const gridBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 4px", borderRadius: "8px", fontSize: "15px", fontWeight: active ? 700 : 500, textAlign: "center",
    border: active ? "1.5px solid #4b89ff" : "1px solid #e5e7eb",
    background: active ? "#eef4ff" : "#fff", color: active ? "#4b89ff" : "#000",
    cursor: "pointer", transition: "all 0.15s",
  });

  const inlinePillStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "8px 4px", borderRadius: "20px", fontSize: "15px", fontWeight: 700, textAlign: "center",
    border: active ? "1.5px solid #4b89ff" : "1px solid #d1d5db",
    background: active ? "#eef4ff" : "#fff", color: active ? "#4b89ff" : "#000",
    cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
  });

  if (variant === "inline") {
    return (
      <div style={{ position: "relative", zIndex: isExpanded ? 10020 : 1 }}>
        {/* 전체 화면을 덮는 검정색 배경 오버레이 (버튼과 팝업은 이 위에 표시됨) */}
        {isExpanded && (
          <div 
            onClick={() => setIsExpanded(false)} 
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: -1, animation: "fadeIn 0.2s" }} 
          />
        )}

        {/* 선택 버튼들 (순차적 표시) */}
        <div style={{ display: "flex", gap: "8px", position: "relative", zIndex: 2 }}>
          {/* 시/도 버튼 (항상 표시) */}
          <button onClick={() => { setRegTab("sido"); setIsExpanded(!isExpanded || regTab !== "sido"); }} style={inlinePillStyle(regTab === "sido" && isExpanded)}>
            {selSido || "전국"} ▾
          </button>
          
          {/* 시/군/구 버튼 (시/도를 선택한 경우에만 표시) */}
          {selSido && (
            <button onClick={() => { setRegTab("gugun"); setIsExpanded(!isExpanded || regTab !== "gugun"); }} style={inlinePillStyle(regTab === "gugun" && isExpanded)}>
              {selGugun || "시/군/구"} ▾
            </button>
          )}

          {/* 읍/면/동 버튼 (시/군/구를 선택한 경우에만 표시) */}
          {selGugun && (
            <button onClick={() => { setRegTab("dong"); setIsExpanded(!isExpanded || regTab !== "dong"); }} style={inlinePillStyle(regTab === "dong" && isExpanded)}>
              {selDong || "읍/면/동"} ▾
            </button>
          )}
        </div>
        
        {/* 클릭한 곳 아래에 새창(Popover) 형태로 뜨는 지역 선택창 */}
        {isExpanded && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "10px", zIndex: 2, background: "#fff", borderRadius: "14px", border: "1px solid #e5e7eb", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", padding: "16px", animation: "fadeIn 0.2s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "15px", fontWeight: 800, color: "#111" }}>
                {regTab === "sido" ? "시/도 선택" : regTab === "gugun" ? `${selSido} 하위 지역` : `${selGugun} 하위 지역`}
              </span>
              <button onClick={() => setIsExpanded(false)} style={{ background: "none", border: "none", fontSize: "20px", color: "#9ca3af", cursor: "pointer", padding: "0 4px" }}>✕</button>
            </div>
            
            <div className="no-scrollbar" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", maxHeight: "240px", overflowY: "auto", paddingRight: "4px" }}>
              {/* 시/도 탭일 때 "전국" 버튼 추가 */}
              {regTab === "sido" && (
                <button onClick={() => {
                  setSelSidoCode(""); setSelSido(""); setSelGugun(""); setSelDong(""); 
                  if (setLocLabel) setLocLabel("위치");
                  if (onFilterChange) onFilterChange({ sido: null, sigungu: null, dong: null });
                  setIsExpanded(false);
                }} style={gridBtnStyle(!selSido)}>전국</button>
              )}
              
              {regTab === "sido" && (sidoList.length > 0 ? sidoList.map(c => (
                <button key={c.code} onClick={() => { 
                  setSelSidoCode(c.code); setSelSido(c.name); setSelGugun(""); setSelDong(""); setRegTab("gugun"); loadGugun(c.code); 
                  moveMap(c.name, 8); if (setLocLabel) setLocLabel(c.name);
                  if (onFilterChange) onFilterChange({ sido: c.name, sigungu: null, dong: null });
                }} style={gridBtnStyle(selSido === c.name)}>{c.name}</button>
              )) : <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px", color: "#9ca3af" }}>로딩중...</div>)}
              
              {regTab === "gugun" && (!selSidoCode ? <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px", color: "#9ca3af" }}>시/도를 먼저 선택하세요</div> : gugunList.length > 0 ? gugunList.map(c => (
                <button key={c.code} onClick={() => { 
                  setSelGugunCode(c.code); setSelGugun(c.name); setSelDong(""); setRegTab("dong"); loadDong(c.code); 
                  moveMap(`${selSido} ${c.name}`, 6); if (setLocLabel) setLocLabel(`${c.name}`);
                  if (onFilterChange) onFilterChange({ sido: selSido, sigungu: c.name, dong: null });
                }} style={gridBtnStyle(selGugun === c.name)}>{c.name}</button>
              )) : <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px", color: "#9ca3af" }}>로딩중...</div>)}
              
              {regTab === "dong" && (!selGugunCode ? <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px", color: "#9ca3af" }}>시/군/구를 먼저 선택하세요</div> : dongList.length > 0 ? dongList.map(c => (
                <button key={c.code} onClick={() => { 
                  setSelDong(c.name); moveMap(`${selSido} ${selGugun} ${c.name}`, 4); if (setLocLabel) setLocLabel(`${selGugun} ${c.name}`); 
                  if (onFilterChange) onFilterChange({ sido: selSido, sigungu: selGugun, dong: c.name });
                  setIsExpanded(false);
                }} style={gridBtnStyle(selDong === c.name)}>{c.name}</button>
              )) : <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px", color: "#9ca3af" }}>로딩중...</div>)}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
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
              <button key={c.code} onClick={() => { 
                setSelSidoCode(c.code); setSelSido(c.name); setSelGugun(""); setSelDong(""); setRegTab("gugun"); loadGugun(c.code); 
                moveMap(c.name, 8); if (setLocLabel) setLocLabel(c.name);
                if (onFilterChange) onFilterChange({ sido: c.name, sigungu: null, dong: null });
              }} style={gridBtnStyle(selSido === c.name)}>{c.name}</button>
            )) : <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px", color: "#9ca3af" }}>로딩중...</div>)}
            {regTab === "gugun" && (!selSidoCode ? <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px", color: "#9ca3af" }}>시/도를 먼저 선택하세요</div> : gugunList.length > 0 ? gugunList.map(c => (
              <button key={c.code} onClick={() => { 
                setSelGugunCode(c.code); setSelGugun(c.name); setSelDong(""); setRegTab("dong"); loadDong(c.code); 
                moveMap(`${selSido} ${c.name}`, 6); if (setLocLabel) setLocLabel(`${c.name}`);
                if (onFilterChange) onFilterChange({ sido: selSido, sigungu: c.name, dong: null });
              }} style={gridBtnStyle(selGugun === c.name)}>{c.name}</button>
            )) : <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px", color: "#9ca3af" }}>로딩중...</div>)}
            {regTab === "dong" && (!selGugunCode ? <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px", color: "#9ca3af" }}>시/군/구를 먼저 선택하세요</div> : dongList.length > 0 ? dongList.map(c => (
              <button key={c.code} onClick={() => { 
                setSelDong(c.name); moveMap(`${selSido} ${selGugun} ${c.name}`, 4); if (setLocLabel) setLocLabel(`${selGugun} ${c.name}`); 
                if (onFilterChange) onFilterChange({ sido: selSido, sigungu: selGugun, dong: c.name });
                if (onClose) onClose(); 
              }} style={gridBtnStyle(selDong === c.name)}>{c.name}</button>
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
              <div key={i} onClick={() => { onLocationMove(parseFloat(r.y), parseFloat(r.x), 5); if (setLocLabel) setLocLabel(r.place_name || r.address_name); if (onClose) onClose(); }} style={{ padding: "12px 4px", borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#111" }}>{r.place_name || r.address_name}</div>
                <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>{r.address_name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
