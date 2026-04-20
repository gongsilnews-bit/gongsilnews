"use client";

import React, { useRef, useState, useEffect } from "react";

const AGENCIES = [
  { name: "부동산\n거래관리시스템", url: "https://rtms.molit.go.kr/", color: "#1a56a0", icon: "🏢" },
  { name: "국세청", url: "https://www.nts.go.kr/", color: "#c0392b", icon: "🏛️", sub: "NTS" },
  { name: "일사편리", url: "https://www.kras.go.kr/mainView.do", color: "#e67e22", icon: "📋", sub: "부동산 서류 통합관리" },
  { name: "LH\n한국토지주택공사", url: "https://www.lh.or.kr/", color: "#27ae60", icon: "🏗️" },
  { name: "민원24", url: "https://www.gov.kr/", color: "#2980b9", icon: "📱", sub: "정부24" },
  { name: "국토교통부", url: "https://www.molit.go.kr/portal.do", color: "#2c3e50", icon: "🇰🇷" },
  { name: "인터넷등기소", url: "http://www.iros.go.kr/PMainJ.jsp", color: "#8e44ad", icon: "⚖️", sub: "대한민국 법원" },
  { name: "SEE:REAL", url: "https://seereal.lh.or.kr/main.do", color: "#0097e6", icon: "👁️", sub: "부동산 정보" },
  { name: "실거래가\n공개시스템", url: "http://rt.molit.go.kr/", color: "#e74c3c", icon: "📊", sub: "국토교통부" },
  { name: "위택스", url: "https://www.wetax.go.kr/main.do", color: "#6c5ce7", icon: "💰", sub: "Wetax" },
  { name: "한국부동산원", url: "https://www.reb.or.kr/", color: "#00b894", icon: "📈", sub: "부동산통계정보" },
  { name: "세움터", url: "https://www.eais.go.kr", color: "#fdcb6e", icon: "🏠", sub: "건축행정시스템" },
];

export default function RealEstateInfoBanner() {
  const [page, setPage] = useState(0);

  const handleNext = () => setPage((prev) => (prev === 1 ? 0 : 1));
  const handlePrev = () => setPage((prev) => (prev === 0 ? 1 : 0));

  const page1 = AGENCIES.slice(0, 6);
  const page2 = AGENCIES.slice(6, 12);
  const pages = [page1, page2]; 

  return (
    <section style={{ background: "#fff", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb", padding: "20px 0", display: "flex", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button 
          onClick={handlePrev}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: "10px", 
            display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb",
            transition: "color 0.2s"
          }}
          onMouseOver={(e) => e.currentTarget.style.color = "#333"}
          onMouseOut={(e) => e.currentTarget.style.color = "#bbb"}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        <div style={{ width: 1200, overflow: "hidden", position: "relative" }}>
          <div 
            style={{
              display: "flex",
              width: "200%", // 2 pages
              transform: `translateX(-${page * 50}%)`,
              transition: "transform 0.4s ease-in-out"
            }}
          >
            {pages.map((pageData, pIdx) => (
              <div key={pIdx} style={{ width: 1200, display: "flex", gap: 16, padding: "4px 0" }}>
                {pageData.map((agency, i) => (
                  <a
                    key={`${pIdx}-${i}`}
                    href={agency.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={agency.name.replace("\n", " ")}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 16px",
                      background: "#fff",
                      border: "1px solid #e8eaef",
                      borderRadius: 10,
                      textDecoration: "none",
                      transition: "all 0.2s",
                      cursor: "pointer",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      boxSizing: "border-box"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = agency.color;
                      e.currentTarget.style.boxShadow = `0 2px 12px ${agency.color}20`;
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = "#e8eaef";
                      e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                      e.currentTarget.style.transform = "none";
                    }}
                  >
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: `${agency.color}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      flexShrink: 0,
                    }}>
                      {agency.icon}
                    </div>
                    <div style={{ overflow: "hidden" }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#222", whiteSpace: "nowrap", lineHeight: 1.3, textOverflow: "ellipsis", overflow: "hidden" }}>
                        {agency.name.split("\n").map((line, j) => (
                          <React.Fragment key={j}>{j > 0 && <br />}{line}</React.Fragment>
                        ))}
                      </div>
                      {agency.sub && (
                        <div style={{ fontSize: 11, color: "#999", marginTop: 2, fontWeight: 500, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{agency.sub}</div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={handleNext}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: "10px", 
            display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb",
            transition: "color 0.2s"
          }}
          onMouseOver={(e) => e.currentTarget.style.color = "#333"}
          onMouseOut={(e) => e.currentTarget.style.color = "#bbb"}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    </section>
  );
}
