"use client";

import React from "react";

/* ── 14대 공식 브랜드 및 공공기관 실물 배너 데이터 ── */
const ROW_1 = [
  {
    id: "asil",
    url: "https://asil.kr/",
    title: "아실 (아파트 실거래가)",
    render: (
      <div style={{ width: "100%", height: "100%", background: "#155dfc", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "0 12px" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
          <path d="M3 21h18M5 21V7l8-4v18M13 11l6-3v13M9 9v.01M9 12v.01M9 15v.01M9 18v.01M17 11v.01M17 14v.01M17 17v.01" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.1 }}>
          <span style={{ fontSize: 9.5, opacity: 0.85, fontWeight: 600 }}>아파트 실거래가는</span>
          <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.5px" }}>아실</span>
        </div>
      </div>
    ),
  },
  {
    id: "hogangnono",
    url: "https://hogangnono.com/",
    title: "호갱노노",
    render: (
      <div style={{ width: "100%", height: "100%", background: "#4f46e5", color: "#ffffff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1.15 }}>
        <span style={{ fontSize: 9.5, opacity: 0.85, fontWeight: 600 }}>아파트 실거래가는</span>
        <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.5px" }}>호갱노노</span>
      </div>
    ),
  },
  {
    id: "naver_land",
    url: "https://land.naver.com/",
    title: "네이버페이 부동산",
    render: (
      <div style={{ width: "100%", height: "100%", background: "#03c75a", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <div style={{ background: "#ffffff", color: "#03c75a", width: 22, height: 22, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900 }}>
          N
        </div>
        <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: "-0.3px" }}>pay 부동산</span>
      </div>
    ),
  },
  {
    id: "disco",
    url: "https://www.disco.re/",
    title: "디스코 (disco)",
    render: (
      <div style={{ width: "100%", height: "100%", background: "#0075ff", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "0 10px" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 9h2v6H4zm4-4h2v14H8zm4 6h2v4h-2zm4-8h2v16h-2zm4 5h2v6h-2z"/>
        </svg>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.1 }}>
          <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.5px" }}>disco</span>
          <span style={{ fontSize: 8.5, opacity: 0.85, fontWeight: 600, whiteSpace: "nowrap" }}>전국 모든 부동산 정보</span>
        </div>
      </div>
    ),
  },
  {
    id: "pixabay",
    url: "https://pixabay.com/",
    title: "Pixabay",
    render: (
      <div style={{ width: "100%", height: "100%", background: "#ffffff", border: "1px solid #e2e8f0", color: "#1f2937", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.8px", fontFamily: "sans-serif" }}>pixabay</span>
      </div>
    ),
  },
  {
    id: "vrew",
    url: "https://vrew.ai/",
    title: "Vrew (브루)",
    render: (
      <div style={{ width: "100%", height: "100%", background: "#ffffff", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
        <span style={{ fontSize: 19, fontWeight: 900, color: "#00d2d3", letterSpacing: "-0.5px" }}>\</span>
        <span style={{ fontSize: 17, fontWeight: 900, color: "#0abde3", letterSpacing: "-0.5px" }}>rew</span>
      </div>
    ),
  },
  {
    id: "capcut",
    url: "https://www.capcut.com/",
    title: "CapCut (캡컷)",
    render: (
      <div style={{ width: "100%", height: "100%", background: "#ffffff", border: "1px solid #e2e8f0", color: "#111827", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.5">
          <path d="M4 6h16M4 18h16M8 6l8 12M16 6L8 18" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.3px" }}>CapCut</span>
      </div>
    ),
  },
];

const ROW_2 = [
  {
    id: "iros",
    url: "http://www.iros.go.kr/",
    title: "대한민국 법원 인터넷등기소",
    render: (
      <div style={{ width: "100%", height: "100%", background: "#ffffff", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "0 10px" }}>
        <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#1e3a8a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900 }}>
          ⚖️
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.15 }}>
          <span style={{ fontSize: 9, color: "#64748b", fontWeight: 600 }}>대한민국 법원</span>
          <span style={{ fontSize: 13, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.3px" }}>인터넷등기소</span>
        </div>
      </div>
    ),
  },
  {
    id: "rtms",
    url: "https://rtms.molit.go.kr/",
    title: "국토교통부 부동산거래관리시스템",
    render: (
      <div style={{ width: "100%", height: "100%", background: "#ffffff", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "0 10px" }}>
        <div style={{ width: 20, height: 20, borderRadius: 4, background: "#059669", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>
          🌐
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.15 }}>
          <span style={{ fontSize: 9, color: "#059669", fontWeight: 800 }}>국토교통부</span>
          <span style={{ fontSize: 12.5, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.4px" }}>부동산거래관리시스템</span>
        </div>
      </div>
    ),
  },
  {
    id: "nts",
    url: "https://www.nts.go.kr/",
    title: "국세청 NTS",
    render: (
      <div style={{ width: "100%", height: "100%", background: "#ffffff", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "0 10px" }}>
        <div style={{ background: "#ea580c", color: "#ffffff", fontSize: 9.5, fontWeight: 900, padding: "2px 4px", borderRadius: 3 }}>
          NTS
        </div>
        <span style={{ fontSize: 15, fontWeight: 900, color: "#1e3a8a", letterSpacing: "-0.5px" }}>국세청</span>
      </div>
    ),
  },
  {
    id: "seoul_land",
    url: "https://land.seoul.go.kr/",
    title: "서울부동산정보광장 (I·SEOUL·U)",
    render: (
      <div style={{ width: "100%", height: "100%", background: "#ffffff", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1.15 }}>
        <span style={{ fontSize: 9, fontWeight: 900, color: "#e11d48", letterSpacing: "0.5px" }}>I·SEOUL·U</span>
        <span style={{ fontSize: 12.5, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.3px" }}>서울부동산정보광장</span>
      </div>
    ),
  },
  {
    id: "seumter",
    url: "https://www.eais.go.kr/",
    title: "세움터 (건축행정시스템)",
    render: (
      <div style={{ width: "100%", height: "100%", background: "#ffffff", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1.15 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: "#15803d" }}>세움터</span>
          <span style={{ fontSize: 11 }}>🍁</span>
        </div>
        <span style={{ fontSize: 8.5, color: "#64748b", fontWeight: 600 }}>건축행정시스템</span>
      </div>
    ),
  },
  {
    id: "gov24",
    url: "https://www.gov.kr/",
    title: "정부24",
    render: (
      <div style={{ width: "100%", height: "100%", background: "#ffffff", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <svg width="22" height="22" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="14" fill="#1e3a8a"/>
          <path d="M16 4a12 12 0 0 1 0 24 6 6 0 0 0 0-12 6 6 0 0 1 0-12z" fill="#dc2626"/>
          <circle cx="16" cy="10" r="3" fill="#ffffff"/>
        </svg>
        <span style={{ fontSize: 15.5, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.5px" }}>정부24</span>
      </div>
    ),
  },
  {
    id: "chatgpt",
    url: "https://chatgpt.com/",
    title: "ChatGPT (OpenAI)",
    render: (
      <div style={{ width: "100%", height: "100%", background: "#10a37f", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
          <path d="M12 6v12M6 12h12"/>
        </svg>
        <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: "-0.3px" }}>ChatGPT</span>
      </div>
    ),
  },
];

export default function RealEstateInfoBanner() {
  return (
    <section
      style={{
        background: "#ffffff",
        borderTop: "1px solid #e2e8f0",
        borderBottom: "1px solid #e2e8f0",
        padding: "20px 0",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <style>{`
        @keyframes scrollLeft {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes scrollRight {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }
        .banner-track {
          display: flex;
          gap: 14px;
          width: max-content;
          animation: scrollLeft 35s linear infinite;
        }
        .banner-track-reverse {
          display: flex;
          gap: 14px;
          width: max-content;
          animation: scrollRight 35s linear infinite;
        }
        .banner-track:hover,
        .banner-track-reverse:hover {
          animation-play-state: paused;
        }
        .banner-item {
          width: 172px;
          height: 48px;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 5px rgba(0,0,0,0.03);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          flex-shrink: 0;
          display: block;
          text-decoration: none;
        }
        .banner-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 14px rgba(0,0,0,0.08);
        }
      `}</style>

      {/* 좌우 그라데이션 페이드 효과 */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 60, background: "linear-gradient(90deg, #ffffff 0%, rgba(255,255,255,0) 100%)", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 60, background: "linear-gradient(270deg, #ffffff 0%, rgba(255,255,255,0) 100%)", zIndex: 2, pointerEvents: "none" }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
        
        {/* ── 1열: 부동산 플랫폼 & AI/미디어 툴 (좌로 롤링) ── */}
        <div style={{ overflow: "hidden", width: "100%" }}>
          <div className="banner-track">
            {/* 원본 + 무한 루프 복제본 */}
            {[...ROW_1, ...ROW_1, ...ROW_1, ...ROW_1].map((item, idx) => (
              <a
                key={`row1-${idx}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                title={item.title}
                className="banner-item"
              >
                {item.render}
              </a>
            ))}
          </div>
        </div>

        {/* ── 2열: 공공기관 & 정부 & ChatGPT (우로 부드럽게 롤링) ── */}
        <div style={{ overflow: "hidden", width: "100%" }}>
          <div className="banner-track-reverse">
            {/* 원본 + 무한 루프 복제본 */}
            {[...ROW_2, ...ROW_2, ...ROW_2, ...ROW_2].map((item, idx) => (
              <a
                key={`row2-${idx}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                title={item.title}
                className="banner-item"
              >
                {item.render}
              </a>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
