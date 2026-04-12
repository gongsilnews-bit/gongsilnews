"use client";

import React, { useState, useRef, useEffect } from "react";

const PROVINCES = [
  "서울특별시", "부산광역시", "대구광역시", "인천광역시", 
  "광주광역시", "대전광역시", "울산광역시", "세종특별자치시",
  "경기도", "강원특별자치도", "충청북도", "충청남도", 
  "전라북도", "전라남도", "경상북도", "경상남도", "제주특별자치도"
];

interface MapSearchBarProps {
  onSearchCoord: (lat: number, lng: number) => void;
}

export default function MapSearchBar({ onSearchCoord }: MapSearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState("지역 선택");
  const [keyword, setKeyword] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 모달 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const searchLocation = (query: string) => {
    const kakao = (window as any).kakao;
    if (!kakao || !kakao.maps || !kakao.maps.services) {
      alert("카카오맵 서비스 로딩 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const ps = new kakao.maps.services.Places();
    const geocoder = new kakao.maps.services.Geocoder();

    // 1. 장소(Places) 키워드 검색
    ps.keywordSearch(query, (data: any, status: any) => {
      if (status === kakao.maps.services.Status.OK && data.length > 0) {
        onSearchCoord(parseFloat(data[data.length > 1 ? 0 : 0].y), parseFloat(data[0].x)); 
      } else {
        // 2. 장소가 없으면 주소(Geocoder) 검색으로 Fallback
        geocoder.addressSearch(query, (result: any, status2: any) => {
          if (status2 === kakao.maps.services.Status.OK && result.length > 0) {
            onSearchCoord(parseFloat(result[result.length > 1 ? 0 : 0].y), parseFloat(result[0].x));
          } else {
            alert("검색결과가 존재하지 않습니다.");
          }
        });
      }
    });
  };

  const handleProvinceSelect = (province: string) => {
    setSelectedProvince(province);
    setIsOpen(false);
    searchLocation(province);
  };

  const handleKeywordSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    const finalQuery = selectedProvince !== "지역 선택" ? `${selectedProvince} ${keyword}` : keyword;
    searchLocation(finalQuery);
  };

  return (
    <div style={{ position: "absolute", top: 20, left: 60, zIndex: 1000, display: "flex", alignItems: "center", gap: 10 }}>
      {/* 검색 바 컨테이너 */}
      <div style={{ 
        display: "flex", background: "#fff", borderRadius: 8, 
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)", height: 46, overflow: "visible", position: "relative"
      }}>
        
        {/* 드롭다운 트리거 버튼 */}
        <div ref={dropdownRef} style={{ position: "relative" }}>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            style={{ 
              height: "100%", padding: "0 16px", borderRight: "1px solid #eee", fontSize: 14, 
              fontWeight: 700, color: selectedProvince !== "지역 선택" ? "#ff8e15" : "#333", 
              cursor: "pointer", display: "flex", alignItems: "center", gap: 8 
            }}
          >
            {selectedProvince} <span style={{ fontSize: 10, color: "#999" }}>{isOpen ? "▲" : "▼"}</span>
          </button>

          {/* 시/도 선택 팝오버 */}
          {isOpen && (
            <div style={{ 
              position: "absolute", top: 54, left: 0, width: 380, background: "#fff", 
              borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", padding: 20, zIndex: 1001,
              border: "1px solid #ddd"
            }}>
              <div style={{ display: "flex", gap: 10, borderBottom: "1px solid #eee", paddingBottom: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: "bold", color: "#ff8e15", borderBottom: "2px solid #ff8e15", paddingBottom: 11, marginBottom: -13 }}>시/도</span>
                <span style={{ fontSize: 14, fontWeight: "bold", color: "#ccc", cursor: "not-allowed" }} title="상세 주소는 우측 검색창을 이용해주세요">시/군/구</span>
                <span style={{ fontSize: 14, fontWeight: "bold", color: "#ccc", cursor: "not-allowed" }} title="상세 주소는 우측 검색창을 이용해주세요">읍/면/동</span>
              </div>
              
              <div style={{ 
                display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, maxHeight: 300, overflowY: "auto"
              }}>
                {PROVINCES.map(prov => (
                  <button 
                    key={prov} 
                    onClick={() => handleProvinceSelect(prov)}
                    style={{ 
                      padding: "10px 0", fontSize: 13, border: "1px solid #ebebeb", borderRadius: 4,
                      background: selectedProvince === prov ? "#fff7ed" : "#fff",
                      color: selectedProvince === prov ? "#dd6b20" : "#555",
                      fontWeight: selectedProvince === prov ? "bold" : "normal",
                      cursor: "pointer", transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = "#ff8e15"}
                    onMouseLeave={(e) => { if(selectedProvince !== prov) e.currentTarget.style.borderColor = "#ebebeb" }}
                  >
                    {prov}
                  </button>
                ))}
              </div>
              <div style={{ borderTop: "1px solid #eee", marginTop: 16, paddingTop: 16, textAlign: "center" }}>
                <button onClick={() => setIsOpen(false)} style={{ fontSize: 14, color: "#666", width: "100%", background: "#f8f9fa", padding: "10px", borderRadius: 4, cursor: "pointer", border: "1px solid #ddd" }}>닫기</button>
              </div>
            </div>
          )}
        </div>

        {/* 텍스트 검색 폼 */}
        <form onSubmit={handleKeywordSearch} style={{ display: "flex", alignItems: "center", flex: 1 }}>
          <input 
            type="text" 
            placeholder="동네, 단지, 지하철역 검색" 
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ border: "none", outline: "none", padding: "0 16px", fontSize: 14, width: 220, color: "#111" }}
          />
          <button type="submit" style={{ padding: "0 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderLeft: "1px solid #eee", color: "#ff8e15" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
        </form>
      </div>
      
      {/* 초기화 버튼 */}
      {(selectedProvince !== "지역 선택" || keyword) && (
        <button onClick={() => { setSelectedProvince("지역 선택"); setKeyword(""); }} style={{ background: "#fff", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", cursor: "pointer", border: "1px solid #ddd", color: "#888", fontSize: 15 }} title="검색 초기화">
          ↺
        </button>
      )}
    </div>
  );
}
