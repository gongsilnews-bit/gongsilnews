"use client";

import React, { useState, useEffect, useRef } from "react";

interface MapSearchBarProps {
  onSearchCoord: (lat: number, lng: number, zoomLevel?: number) => void;
  onRegionSelect?: (sido: string, gugun: string, dong: string) => void;
  mapCenterRegion?: { sido: string; gugun: string; dong: string } | null;
  themeColor?: string;
  isPushedDown?: boolean;
}

export default function MapSearchBar({ onSearchCoord, onRegionSelect, mapCenterRegion, themeColor = "#ff8e15", isPushedDown = false }: MapSearchBarProps) {
  const [activePanel, setActivePanel] = useState<"region" | "search" | null>(null);
  const [activeTab, setActiveTab] = useState<"sido" | "gugun" | "dong">("sido");

  const [sidoList, setSidoList] = useState<any[]>([]);
  const [gugunList, setGugunList] = useState<any[]>([]);
  const [dongList, setDongList] = useState<any[]>([]);

  const [selectedSido, setSelectedSido] = useState<string>("시/도 선택");
  const [selectedGugun, setSelectedGugun] = useState<string>("-");
  const [selectedDong, setSelectedDong] = useState<string>("-");

  const [currentSidoCode, setCurrentSidoCode] = useState<string>("");
  const [currentGugunCode, setCurrentGugunCode] = useState<string>("");

  const [keyword, setKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const regionRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close panels on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activePanel === "region" && regionRef.current && !regionRef.current.contains(e.target as Node)) {
        // Only close if click is not on the floating filter trigger buttons
        if (!(e.target as Element).closest("#wishFloatingFilter")) {
          setActivePanel(null);
        }
      }
      if (activePanel === "search" && searchRef.current && !searchRef.current.contains(e.target as Node)) {
        if (!(e.target as Element).closest("#wishFloatingFilter")) {
          setActivePanel(null);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activePanel]);

  // Load Sido on mount
  useEffect(() => {
    loadRegSido();
  }, []);

  // Update labels if map moves and we receive new center region, 
  // but only if the user is not actively trying to pick a region from the panel.
  useEffect(() => {
    if (mapCenterRegion && activePanel !== "region") {
      setSelectedSido(mapCenterRegion.sido || "시/도 선택");
      setSelectedGugun(mapCenterRegion.gugun || "-");
      setSelectedDong(mapCenterRegion.dong || "-");
    }
  }, [mapCenterRegion, activePanel]);

  const loadRegSido = async () => {
    try {
      const res = await fetch('https://grpc-proxy-server-mkvo6j4wsq-du.a.run.app/v1/regcodes?regcode_pattern=*00000000');
      const data = await res.json();
      setSidoList(data.regcodes || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadRegGugun = async (sidoCode: string) => {
    setGugunList([]);
    const prefix = sidoCode.substring(0, 2);
    try {
      const res = await fetch(`https://grpc-proxy-server-mkvo6j4wsq-du.a.run.app/v1/regcodes?regcode_pattern=${prefix}*00000&is_ignore_zero=true`);
      const data = await res.json();
      const sorted = (data.regcodes || []).sort((a: any, b: any) => a.name.localeCompare(b.name));
      const formatted = sorted.map((c: any) => {
        const nameParts = c.name.split(' ');
        return { code: c.code, name: nameParts.slice(1).join(' ') };
      });
      setGugunList(formatted);
    } catch (e) {
      console.error(e);
    }
  };

  const loadRegDong = async (gugunCode: string) => {
    setDongList([]);
    const prefix = gugunCode.substring(0, 5);
    try {
      const res = await fetch(`https://grpc-proxy-server-mkvo6j4wsq-du.a.run.app/v1/regcodes?regcode_pattern=${prefix}*&is_ignore_zero=true`);
      const data = await res.json();
      const sorted = (data.regcodes || []).sort((a: any, b: any) => a.name.localeCompare(b.name));
      const formatted = sorted
        .filter((c: any) => c.code !== gugunCode)
        .map((c: any) => {
          const parts = c.name.split(' ');
          return { code: c.code, name: parts[parts.length - 1] };
        });
      setDongList(formatted);
    } catch (e) {
      console.error(e);
    }
  };

  const moveToMapSearchByKeyword = (searchKeyword: string, zlevel: number) => {
    const kakao = (window as any).kakao;
    if (!kakao || !kakao.maps || !kakao.maps.services) return;
    const ps = new kakao.maps.services.Places();

    ps.keywordSearch(searchKeyword, (data: any, status: any) => {
      if (status === kakao.maps.services.Status.OK && data.length > 0) {
        onSearchCoord(parseFloat(data[0].y), parseFloat(data[0].x), zlevel);
      }
    });
  };

  const onRegSelectSido = (code: string, name: string) => {
    setCurrentSidoCode(code);
    setSelectedSido(name);
    setSelectedGugun("-");
    setSelectedDong("-");
    loadRegGugun(code);
    setActiveTab("gugun");
    moveToMapSearchByKeyword(name, 8);
    onRegionSelect?.(name, "", "");
  };

  const onRegSelectGugun = (code: string, name: string) => {
    setCurrentGugunCode(code);
    setSelectedGugun(name);
    setSelectedDong("-");
    loadRegDong(code);
    setActiveTab("dong");
    moveToMapSearchByKeyword(`${selectedSido} ${name}`, 6);
    onRegionSelect?.(selectedSido, name, "");
  };

  const onRegSelectDong = (name: string) => {
    setSelectedDong(name);
    moveToMapSearchByKeyword(`${selectedSido} ${selectedGugun} ${name}`, 4);
    setActivePanel(null); // Close panel after final selection
    onRegionSelect?.(selectedSido, selectedGugun, name);
  };

  const executeMapKeywordSearch = () => {
    if (!keyword.trim()) return;
    setIsSearching(true);
    const kakao = (window as any).kakao;
    if (!kakao || !kakao.maps || !kakao.maps.services) return;
    const ps = new kakao.maps.services.Places();

    ps.keywordSearch(keyword, (data: any, status: any) => {
      setIsSearching(false);
      if (status === kakao.maps.services.Status.OK && data.length > 0) {
        setSearchResults(data);
        // 검색 즉시 첫 번째 결과 위치로 지도를 이동시킵니다
        onSearchCoord(parseFloat(data[0].y), parseFloat(data[0].x), 5);
      } else {
        setSearchResults([]);
      }
    });
  };

  const onSelectSearchResult = (item: any) => {
    onSearchCoord(parseFloat(item.y), parseFloat(item.x), 5); // Navigate and zoom
    setActivePanel(null);
  };

  const [position, setPosition] = useState({ x: 20, y: 15 });
  const isDragging = useRef(false);
  const dragStartOffset = useRef({ x: 0, y: 0 });
  const [isDragActive, setIsDragActive] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('.wish-select') || (e.target as Element).closest('.region-close-btn')) return;
    isDragging.current = true;
    setIsDragActive(true);
    dragStartOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      setPosition({
        x: e.clientX - dragStartOffset.current.x,
        y: e.clientY - dragStartOffset.current.y
      });
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      setIsDragActive(false);
      document.body.style.userSelect = '';
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div style={{ position: "absolute", top: position.y, left: position.x, zIndex: 9 }}>
      <style>{`
        #wishFloatingFilter { display: flex; background: #fff; padding: 5px 15px; border-radius: 30px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 1px solid #ddd; align-items: center; gap: 10px; font-size: 14px; color: #333; transition: box-shadow 0.2s; cursor: ${isDragActive ? 'grabbing' : 'grab'}; }
        #wishFloatingFilter:hover { box-shadow: 0 6px 15px rgba(0,0,0,0.15); }
        .wish-select { background: none; border: none; cursor: pointer; font-weight: bold; padding: 5px 10px; }
        .wish-select::after { content: ' ▼'; font-size: 10px; color: #999; }
        .region-tab { flex:1; padding:12px; background:transparent; border:none; cursor:pointer; font-weight:bold; font-size:14px; color:#666; transition:all 0.2s; border-bottom:2px solid transparent; }
        .region-tab.active { color:${themeColor}; border-bottom:2px solid ${themeColor}; background:#fff; }
        .reg-item-btn { padding:8px 5px; background:#fff; border:1px solid #eee; border-radius:4px; font-size:13px; color:#444; cursor:pointer; transition:all 0.2s; text-align:center; }
        .reg-item-btn:hover { background:${themeColor}; color:#fff; border-color:${themeColor}; }
        .region-close-btn:hover { background:#ddd !important; }
      `}</style>

      {/* 지도 통합 플로팅 검색 바 */}
      <div id="wishFloatingFilter" onMouseDown={handleMouseDown}>
        <span className="wish-select" onClick={() => { setActivePanel("region"); setActiveTab("sido"); }}>
          {selectedSido}
        </span>
        <div style={{ width: 1, height: 12, background: "#ccc" }}></div>
        <span className="wish-select" onClick={() => { setActivePanel("region"); setActiveTab("gugun"); }}>
          {selectedGugun}
        </span>
        <div style={{ width: 1, height: 12, background: "#ccc" }}></div>
        <span className="wish-select" onClick={() => { setActivePanel("region"); setActiveTab("dong"); }}>
          {selectedDong}
        </span>
        <div style={{ width: 1, height: 12, background: "#ccc" }}></div>
        <span className="wish-select" style={{ color: themeColor }} onClick={() => setActivePanel(activePanel === "search" ? null : "search")}>
          검색 🔍
        </span>
      </div>

      {/* 지역 선택 캐스케이딩 패널 */}
      {activePanel === "region" && (
        <div ref={regionRef} style={{ position: "absolute", top: 45, left: 0, zIndex: 101, background: "#fff", width: 380, borderRadius: 8, boxShadow: "0 4px 15px rgba(0,0,0,0.2)", overflow: "hidden" }}>
          <div style={{ display: "flex", borderBottom: "1px solid #ccc", background: "#f9f9f9" }}>
            <button className={`region-tab ${activeTab === "sido" ? "active" : ""}`} onClick={() => setActiveTab("sido")}>시/도</button>
            <button className={`region-tab ${activeTab === "gugun" ? "active" : ""}`} onClick={() => setActiveTab("gugun")}>시/군/구</button>
            <button className={`region-tab ${activeTab === "dong" ? "active" : ""}`} onClick={() => setActiveTab("dong")}>읍/면/동</button>
          </div>
          <div style={{ padding: 15, height: 250, overflowY: "auto" }}>
            {activeTab === "sido" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {sidoList.length > 0 ? (
                  sidoList.map(c => (
                    <button key={c.code} className="reg-item-btn" onClick={() => onRegSelectSido(c.code, c.name)}>{c.name}</button>
                  ))
                ) : (
                  <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 20, color: "#888" }}>로딩중...</div>
                )}
              </div>
            )}
            {activeTab === "gugun" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {!currentSidoCode ? (
                  <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 20, color: "#888" }}>먼저 시/도를 선택해주세요.</div>
                ) : gugunList.length > 0 ? (
                  gugunList.map(c => (
                    <button key={c.code} className="reg-item-btn" onClick={() => onRegSelectGugun(c.code, c.name)}>{c.name}</button>
                  ))
                ) : (
                  <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 20, color: "#888" }}>세부 지역 없음</div>
                )}
              </div>
            )}
            {activeTab === "dong" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {!currentGugunCode ? (
                  <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 20, color: "#888" }}>먼저 시/군/구를 선택해주세요.</div>
                ) : dongList.length > 0 ? (
                  dongList.map(c => (
                    <button key={c.code} className="reg-item-btn" onClick={() => onRegSelectDong(c.name)}>{c.name}</button>
                  ))
                ) : (
                  <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 20, color: "#888" }}>세부 지역 없음</div>
                )}
              </div>
            )}
          </div>
          <button className="region-close-btn" onClick={() => setActivePanel(null)} style={{ width: "100%", padding: 10, border: "none", background: "#eee", cursor: "pointer", fontSize: 14, color: "#555" }}>
            닫기
          </button>
        </div>
      )}

      {/* 지도 검색 입력 패널 */}
      {activePanel === "search" && (
        <div ref={searchRef} style={{ position: "absolute", top: 45, left: 0, zIndex: 101, background: "#fff", padding: 15, borderRadius: 8, boxShadow: "0 4px 15px rgba(0,0,0,0.2)", width: 320 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input 
              type="text" 
              placeholder="동, 읍, 면 또는 랜드마크 검색" 
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && executeMapKeywordSearch()}
              style={{ flex: 1, padding: 8, border: "1px solid #ccc", borderRadius: 4, outline: "none", fontSize: 13 }} 
            />
            <button onClick={executeMapKeywordSearch} style={{ padding: "8px 12px", background: themeColor, color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: "bold", fontSize: 13 }}>
              이동
            </button>
          </div>
          <div style={{ maxHeight: 200, overflowY: "auto", fontSize: 13, color: "#555" }}>
            {isSearching ? (
              <div style={{ padding: 10 }}>검색 중...</div>
            ) : searchResults.length > 0 ? (
              searchResults.map((item, idx) => (
                <div key={idx} style={{ padding: 10, borderBottom: "1px solid #eee", cursor: "pointer" }} onClick={() => onSelectSearchResult(item)}>
                  <div style={{ fontWeight: "bold", color: "#333", marginBottom: 2 }}>{item.place_name || item.address_name}</div>
                  <div style={{ fontSize: 12, color: "#888" }}>{item.address_name}</div>
                </div>
              ))
            ) : keyword && !isSearching ? (
              <div style={{ padding: 10, color: "#e74c3c" }}>검색 결과가 없습니다.</div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
