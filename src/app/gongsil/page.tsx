"use client";

import React, { useState } from "react";
import Link from "next/link";

// 카테고리 설정 데이터
const CATEGORY_CONFIG: Record<string, { name: string; pills: string[]; basicFilters: string[]; detailFilters: string[]; showToggle: boolean; pillStyle?: string }> = {
  apart: { name: "아파트·오피스텔", pills: ["아파트", "아파트분양권", "재건축", "오피스텔", "오피스텔분양권", "재개발"], basicFilters: ["거래방식", "가격대", "면적", "사용승인일", "세대수"], detailFilters: ["층수", "방/욕실수", "방향", "융자금", "기타옵션"], showToggle: true },
  villa: { name: "빌라·주택", pills: ["빌라/연립", "단독/다가구", "전원주택", "상가주택"], basicFilters: ["거래방식", "가격대", "면적", "방/욕실수", "사용승인일", "방향", "융자금", "기타옵션"], detailFilters: [], showToggle: false },
  one: { name: "원룸·투룸", pills: ["원룸", "투룸", "오피스텔만 보기"], basicFilters: ["거래방식", "가격대", "관리비", "기타옵션"], detailFilters: [], showToggle: false },
  biz: { name: "상가·업무·공장·토지", pills: ["상가", "사무실", "공장/창고", "지식산업센터", "건물", "토지"], basicFilters: ["거래방식", "가격대", "면적", "층수", "융자금", "관리비", "기타옵션"], detailFilters: [], showToggle: false },
  sale: { name: "분양", pills: ["아파트", "오피스텔", "빌라", "도시형생활주택", "생활숙박시설", "상가/업무"], basicFilters: ["분양단계", "분양형태", "분양가/보증금", "면적", "세대수"], detailFilters: ["입주예정", "청약가능통장", "브랜드"], showToggle: true },
  wish: { name: "MY관심공실", pills: [], basicFilters: [], detailFilters: [], showToggle: false },
};

// 더미 매물 데이터
const dummyProperties = [
  { id: 1, name: "서초플러스 1동", price: "매매 7억", type: "아파트", direction: "남향", area: '49.57㎡(15.0평) / ...', rooms: "룸 2개, 욕실 1개, 에어컨, 보안시스템, 급매, ...", tag: "공동중개", tagId: "1360207898", date: "2026.03.30.", img: "" },
  { id: 2, name: "논현빌2 101동 101호", price: "매매 10억", type: "아파트", direction: "남향", area: '84㎡(25.4평) / 59...', rooms: "룸 3개, 욕실 2개, 에어컨, 싱크대, 문워이장", tag: "수수료25%", tagId: "4146662407", date: "2026.03.28.", img: "" },
  { id: 3, name: "동부센트레빌 101동 101호", price: "매매 10억", type: "아파트", direction: "남향", area: '84㎡(25.4평) / 59...', rooms: "룸 3개, 욕실 2개, 에어컨, 바닥, 문워이장, ...", tag: "공동중개", tagId: "619120431", date: "2026.03.27.", img: "" },
  { id: 4, name: "거평타운오피스텔 101동 101호", price: "매매 10억", type: "아파트", direction: "남향", area: '', rooms: "룸 3개, 욕실 2개, 에어컨, 싱크대, 보안시스...", tag: "공동중개", tagId: "738290754", date: "2026.03.26.", img: "" },
  { id: 5, name: "동부센트레빌", price: "매매 10억", type: "아파트", direction: "남향", area: '', rooms: "룸 1개, 욕실 1개, 에어컨, 싱크대", tag: "공동중개", tagId: "3872338338", date: "2026.03.26.", img: "" },
  { id: 6, name: "동부센트레빌 101동 101호", price: "매매 50억", type: "아파트", direction: "남향", area: '', rooms: "룸 3개, 욕실 1개, 문워이장, 싱크대, ...", tag: "공동중개", tagId: "637449093", date: "2026.03.25.", img: "" },
  { id: 7, name: "한양아파트 101동 101호", price: "매매 50억", type: "오피스텔", direction: "남향", area: '', rooms: "룸 1개, 욕실 1개, 세탁기, 인덕션, 주차기능", tag: "공동중개", tagId: "564902613", date: "2026.03.26.", img: "" },
];

// 상세 매물 정보
const detailData = {
  images: ["/sample1.jpg", "/sample2.jpg", "/sample3.jpg", "/sample4.jpg"],
  tag: "공동중개", tagId: "1360207898", date: "2026.03.30.",
  buildingName: "서초플러스 1동", price: "매매 7억",
  type: "아파트", direction: "남향",
  supplyArea: '49.57㎡(15.0평) / 38.12㎡(11.5평)',
  rooms: "룸 2개", parking: "주차 없음", options: "에어컨, 보안시스템, 급매",
  tableInfo: [
    { label: "매물번호", value: "1360207898" },
    { label: "소재지", value: "서울특별시 서초구 서초동 1612" },
    { label: "매물특징", value: "서초플러스" },
    { label: "공급/전용면적", value: '49.57㎡(15.0평) / 38.12㎡(11.5평)' },
    { label: "해당층/총층", value: "3층 / 10층" },
    { label: "방/욕실수", value: "2개 / 1개" },
    { label: "방향", value: "남향" },
  ],
  realtor: { name: "착한임대부동산", rep: "대표 김동현", regNum: "등록번호 1666-4414411", addr: "서울 강남구 논현동 189-13", phone: "☎ 전화 02-541-1611, 010-8831-9450" },
  realtorStats: { sell: 10, rent: 0, monthly: 0, short: 0 },
};

export default function GongsilPage() {
  const [activeCategory, setActiveCategory] = useState("apart");
  const [activePills, setActivePills] = useState<string[]>(["아파트"]);
  const [activeProperty, setActiveProperty] = useState<number | null>(1);
  const [showDetail, setShowDetail] = useState(true);
  const [activeDetailTab, setActiveDetailTab] = useState<"info" | "realtor">("info");
  const [showDetailFilters, setShowDetailFilters] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const config = CATEGORY_CONFIG[activeCategory];
  const isOfficePill = (p: string) => p.includes("오피스텔");

  const handleCategoryChange = (key: string) => {
    setActiveCategory(key);
    const c = CATEGORY_CONFIG[key];
    setActivePills(key === "wish" ? [] : [c.pills[0] || ""]);
    setShowDetail(false);
    setShowDetailFilters(false);
  };

  const togglePill = (p: string) => {
    setActivePills((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Pretendard', sans-serif" }}>
      {/* ===== 상단 필터 바 ===== */}
      <div style={{ background: "#fff", width: "100%", zIndex: 20, position: "relative", borderBottom: "1px solid #ccc", flexShrink: 0 }}>
        {/* Tier 1: 메인 탭 */}
        <div style={{ display: "flex", gap: 24, padding: "0 20px", borderBottom: "1px solid #ddd", alignItems: "center", overflowX: "auto" }}>
          <Link href="/" style={{ marginRight: 15, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
            <img src="/logo.png" alt="공실뉴스" style={{ height: 34 }} onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/100x34?text=LOGO"; }} />
          </Link>
          <span style={{ fontSize: 26, fontWeight: 800, color: "#111", marginRight: 20, whiteSpace: "nowrap" }}>공실열람</span>
          {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
            <button key={key} onClick={() => handleCategoryChange(key)} style={{ background: "none", border: "none", fontSize: 16, fontWeight: "bold", color: activeCategory === key ? "#1a73e8" : "#555", cursor: "pointer", padding: "16px 4px", position: "relative", whiteSpace: "nowrap", borderBottom: activeCategory === key ? "3px solid #1a73e8" : "3px solid transparent", fontFamily: "inherit" }}>
              {cfg.name}
            </button>
          ))}
        </div>

        {/* Tier 2: 서브 필터(Pills + 드롭다운) */}
        {activeCategory !== "wish" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderBottom: "1px solid #e0e0e0", overflowX: "auto" }}>
            {config.pills.map((p) => (
              <button key={p} onClick={() => togglePill(p)} style={{
                background: activePills.includes(p) ? (isOfficePill(p) ? "#111" : "#e8f0fe") : "#fff",
                border: `1px solid ${activePills.includes(p) ? (isOfficePill(p) ? "#111" : "#1a73e8") : "#ccc"}`,
                fontSize: 13, color: activePills.includes(p) ? (isOfficePill(p) ? "#fff" : "#1a73e8") : "#333",
                cursor: "pointer", padding: "6px 14px",
                borderRadius: isOfficePill(p) ? 4 : 20,
                whiteSpace: "nowrap", fontWeight: activePills.includes(p) ? "bold" : "normal", fontFamily: "inherit", flexShrink: 0
              }}>
                {activePills.includes(p) && !isOfficePill(p) ? `✓ ${p}` : p}
              </button>
            ))}
            <div style={{ width: 1, height: 16, background: "#e0e0e0", margin: "0 8px", flexShrink: 0 }}></div>
            {config.basicFilters.map((f) => (
              <button key={f} style={{ background: "none", border: "none", fontSize: 13, color: "#555", cursor: "pointer", padding: "8px 12px", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", borderRadius: 4, flexShrink: 0, fontFamily: "inherit" }}>
                {f} <span style={{ fontSize: 10, color: "#999" }}>▼</span>
              </button>
            ))}
            {config.showToggle && (
              <button onClick={() => setShowDetailFilters(!showDetailFilters)} style={{ background: "none", border: "none", fontSize: 13, fontWeight: "bold", color: "#1a73e8", cursor: "pointer", padding: "8px 12px", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit" }}>
                {showDetailFilters ? "상세조건검색 닫기 ✕" : "상세매물검색 +"}
              </button>
            )}
            <button style={{ background: "none", border: "none", fontSize: 13, color: "#666", cursor: "pointer", padding: "8px 12px", whiteSpace: "nowrap", marginLeft: "auto", flexShrink: 0, fontFamily: "inherit" }}>↻ 초기화</button>
          </div>
        )}

        {/* MY관심공실 전용 탭 */}
        {activeCategory === "wish" && (
          <div style={{ display: "flex", width: "100%", borderBottom: "1px solid #eee" }}>
            {["찜한물건", "최근본물건"].map((tab) => (
              <div key={tab} style={{ flex: 1, padding: "12px 0", textAlign: "center", border: "1px solid #eee", background: tab === "찜한물건" ? "#1a73e8" : "#fff", fontSize: 13, cursor: "pointer", color: tab === "찜한물건" ? "#fff" : "#666", fontWeight: "bold" }}>{tab}</div>
            ))}
          </div>
        )}

        {/* 상세 필터 행 */}
        {showDetailFilters && config.detailFilters.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderBottom: "1px solid #eee", overflowX: "auto", background: "#fff" }}>
            {config.detailFilters.map((f) => (
              <button key={f} style={{ background: "none", border: "none", fontSize: 13, color: "#555", cursor: "pointer", padding: "8px 12px", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", borderRadius: 4, flexShrink: 0, fontFamily: "inherit" }}>
                {f} <span style={{ fontSize: 10, color: "#999" }}>▼</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ===== 메인 3단 레이아웃 ===== */}
      <main style={{ display: "flex", flex: 1, minHeight: 0, position: "relative" }}>
        {/* 좌측 사이드바: 매물 리스트 (380px) */}
        <aside style={{ width: 380, minWidth: 380, height: "100%", background: "#fff", borderRight: "1px solid #eee", display: "flex", flexDirection: "column", zIndex: 20 }}>
          <div style={{ padding: "15px 20px", fontWeight: 800, fontSize: 15, color: "#111", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", flexShrink: 0 }}>
            <span>현재 지도 화면 {dummyProperties.length}개</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 0, background: "#fff" }}>
            {dummyProperties.map((prop) => (
              <div key={prop.id} onClick={() => { setActiveProperty(prop.id); setShowDetail(true); setActiveDetailTab("info"); setGalleryIndex(0); }}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                  padding: "16px 20px 16px 16px", cursor: "pointer", transition: "background 0.2s, border-color 0.2s",
                  borderBottom: "1px solid #eee",
                  borderLeft: activeProperty === prop.id ? "4px solid #1a73e8" : "4px solid transparent",
                  background: activeProperty === prop.id ? "#eaf4ff" : "#fff",
                }}>
                <div style={{ flex: 1, paddingRight: 15, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: "bold", color: "#111", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prop.name}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#1a73e8", marginBottom: 2 }}>{prop.price}</div>
                  <div style={{ fontSize: 13, color: "#555", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prop.type} · {prop.direction} · {prop.area}</div>
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 6, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{prop.rooms}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto" }}>
                    <span style={{ display: "inline-block", fontSize: 11, color: prop.tag === "수수료25%" ? "#2e7d32" : "#1a73e8", fontWeight: "bold", border: `1px solid ${prop.tag === "수수료25%" ? "#2e7d32" : "#1a73e8"}`, borderRadius: 3, padding: "2px 6px" }}>{prop.tag}</span>
                    <span style={{ fontSize: 11, color: "#e53e3e", fontWeight: "bold" }}>{prop.tagId}</span>
                    <span style={{ fontSize: 11, color: "#aaa" }}>{prop.date}</span>
                  </div>
                </div>
                <div style={{ width: 90, height: 90, borderRadius: 6, overflow: "hidden", background: "#f0f0f0", flexShrink: 0, marginLeft: 5 }}>
                  <div style={{ width: "100%", height: "100%", background: "#ddd" }}></div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* 중앙: 매물 상세 패널 (600px) */}
        {showDetail && (
          <div style={{ width: 600, minWidth: 600, flexShrink: 0, background: "#fff", display: "flex", flexDirection: "column", position: "relative", borderRight: "1px solid #eee", zIndex: 25, boxShadow: "5px 0 15px rgba(0,0,0,0.05)", height: "100%" }}>
            {/* 닫기 버튼 */}
            <button onClick={() => setShowDetail(false)} style={{ position: "absolute", top: 15, right: 15, width: 30, height: 30, background: "rgba(255,255,255,0.8)", border: "1px solid #ddd", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: "bold", color: "#333", zIndex: 100 }}>×</button>

            <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
              {/* 갤러리 */}
              <div style={{ position: "relative", width: "100%", height: 200, background: "#f0f0f0" }}>
                <div style={{ width: "100%", height: "100%", background: "#c0c0c0", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>매물 이미지</div>
                <button onClick={() => setGalleryIndex(Math.max(0, galleryIndex - 1))} style={{ position: "absolute", top: "50%", left: 0, transform: "translateY(-50%)", background: "rgba(0,0,0,0.2)", color: "#fff", border: "none", fontSize: 18, padding: "10px 6px", cursor: "pointer", borderRadius: "0 4px 4px 0" }}>〈</button>
                <button onClick={() => setGalleryIndex(Math.min(3, galleryIndex + 1))} style={{ position: "absolute", top: "50%", right: 0, transform: "translateY(-50%)", background: "rgba(0,0,0,0.2)", color: "#fff", border: "none", fontSize: 18, padding: "10px 6px", cursor: "pointer", borderRadius: "4px 0 0 4px" }}>〉</button>
                <div style={{ position: "absolute", bottom: 15, right: 15, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 11, padding: "4px 12px", borderRadius: 20 }}>{galleryIndex + 1}/4</div>
              </div>

              {/* 헤더 정보 */}
              <div style={{ padding: "40px 20px 20px 20px", borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingRight: 30 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: "bold", color: "#ff5a5f", border: "1px solid #ff5a5f", padding: "2px 4px", borderRadius: 2 }}>확인매물</span>
                    <span style={{ color: "#e53e3e", fontSize: 11, fontWeight: "bold" }}>{detailData.tag} {detailData.tagId}</span>
                    <span style={{ fontSize: 12, color: "#888" }}>{detailData.date}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, fontSize: 11 }}>
                    <button style={{ background: "none", border: "none", cursor: "pointer", color: "#ff5a5f", display: "flex", alignItems: "center", gap: 4, padding: 0, fontSize: 11 }}>● 허위매물신고</button>
                    <button style={{ background: "none", border: "none", cursor: "pointer", color: "#666", display: "flex", alignItems: "center", gap: 4, padding: 0, fontSize: 11 }}>🖨 인쇄</button>
                  </div>
                </div>
                <h2 style={{ fontSize: 15, fontWeight: "bold", color: "#333", margin: "0 0 6px 0" }}>{detailData.buildingName}</h2>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1f5edb", margin: 0 }}>{detailData.price}</h1>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button style={{ background: "none", border: "1.5px solid #ddd", borderRadius: 6, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#666", fontSize: 17 }} title="찜하기">🔖</button>
                    <button style={{ background: "none", border: "1.5px solid #ddd", borderRadius: 6, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#666", fontSize: 17 }} title="공유">🔗</button>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "#555", marginTop: 4, marginBottom: 12 }}>{detailData.type} · {detailData.direction} · 공급/전용 면적: {detailData.supplyArea}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 13, color: "#555" }}>
                  <span>{detailData.rooms}</span><span style={{ width: 1, height: 10, background: "#ddd", display: "inline-block" }}></span>
                  <span>{detailData.parking}</span><span style={{ width: 1, height: 10, background: "#ddd", display: "inline-block" }}></span>
                  <span>{detailData.options}</span>
                </div>
              </div>

              {/* 탭 */}
              <div style={{ display: "flex", borderBottom: "1px solid #ddd", margin: 0 }}>
                {(["info", "realtor"] as const).map((tab) => (
                  <div key={tab} onClick={() => setActiveDetailTab(tab)} style={{ flex: 1, textAlign: "center", padding: "14px 0", fontSize: 15, fontWeight: "bold", cursor: "pointer", color: activeDetailTab === tab ? "#111" : "#888", borderBottom: activeDetailTab === tab ? "2px solid #111" : "2px solid transparent" }}>
                    {tab === "info" ? "매물정보" : "등록자정보"}
                  </div>
                ))}
              </div>

              {/* 매물정보 탭 */}
              {activeDetailTab === "info" && (
                <>
                <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", borderBottom: "10px solid #f5f5f5" }}>
                  {detailData.tableInfo.map((row, i) => (
                    <React.Fragment key={i}>
                      <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "flex-start", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>{row.label}</div>
                      <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{row.value}</div>
                    </React.Fragment>
                  ))}
                </div>

                {/* ──── 위치정보 ──── */}
                <div style={{ padding: "20px 20px 0" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#222", marginTop: 10, marginBottom: 12 }}>위치정보</div>
                  <div style={{ width: "100%", height: 200, borderRadius: 8, marginBottom: 20, background: "#e8eaed", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 14, border: "1px solid #eee" }}>
                    🗺️ 카카오맵 (위치정보)
                  </div>
                </div>

                {/* ──── 로드뷰 ──── */}
                <div style={{ padding: "0 20px" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#222", marginBottom: 12 }}>로드뷰</div>
                  <div style={{ width: "100%", height: 200, borderRadius: 8, marginBottom: 20, background: "#e8eaed", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 14, border: "1px solid #eee" }}>
                    🛣️ 카카오 로드뷰
                  </div>
                </div>

                {/* ──── 옵션 (3탭: 옵션/관리비/시간정보) ──── */}
                <div style={{ padding: "0 20px 20px" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#222", marginBottom: 20 }}>옵션</div>
                  {/* 탭 아이콘 3개 */}
                  <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid #eee" }}>
                    {[
                      { icon: "🛒", label: "옵션" },
                      { icon: "🏛", label: "관리비" },
                      { icon: "⏰", label: "시간정보" },
                    ].map((tab, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "14px 28px", cursor: "pointer", borderBottom: idx === 0 ? "2px solid #333" : "2px solid transparent", color: idx === 0 ? "#333" : "#bbb", fontSize: 22, transition: "all 0.2s" }} title={tab.label}>
                        {tab.icon}
                      </div>
                    ))}
                  </div>
                  {/* 옵션 아이콘 그리드 */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
                    {[
                      { icon: "❄️", name: "에어컨" },
                      { icon: "🍳", name: "싱크대" },
                      { icon: "🚿", name: "붙박이장" },
                      { icon: "🔒", name: "보안시스템" },
                      { icon: "🅿️", name: "주차기능" },
                      { icon: "📺", name: "TV" },
                    ].map((opt, idx) => (
                      <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 64 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 8, background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{opt.icon}</div>
                        <span style={{ fontSize: 11, color: "#666", textAlign: "center", whiteSpace: "nowrap" }}>{opt.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ──── 댓글상담 ──── */}
                <div style={{ marginTop: 20, borderTop: "1px solid #f0f0f0", padding: "20px 20px 30px" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#222", marginBottom: 15, display: "flex", alignItems: "center", gap: 8 }}>
                    댓글상담 <span style={{ color: "#1a73e8", fontSize: 15 }}>0개</span>
                  </div>
                  {/* 입력 영역 */}
                  <div style={{ marginBottom: 25, border: "1px solid #ddd", borderRadius: 6, overflow: "hidden", background: "#fff" }}>
                    <textarea
                      placeholder={"가격을 제안하거나, 궁금한 점을 남겨보세요. 작성자에게 중개사인 알고 답변 수 있는 1:1 비공개 상담입니다."}
                      style={{ width: "100%", minHeight: 80, border: "none", outline: "none", padding: "14px 15px", fontSize: 14, color: "#333", resize: "vertical", fontFamily: "inherit", background: "#fff", boxSizing: "border-box" }}
                    />
                    <div style={{ padding: "10px 15px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafafa", borderTop: "1px solid #eee" }}>
                      <span style={{ fontSize: 13, color: "#888", display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ color: "#1a73e8" }}>🔒</span> 비밀댓글 자동적용
                      </span>
                      <button style={{ background: "#1a73e8", color: "#fff", border: "none", padding: "8px 24px", borderRadius: 4, fontWeight: "bold", cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>등록</button>
                    </div>
                  </div>
                  {/* 댓글 리스트 */}
                  <div style={{ textAlign: "center", padding: 30, color: "#888", fontSize: 13 }}>
                    아직 등록된 문의가 없습니다.
                  </div>
                </div>
                </>
              )}

              {/* 등록자정보 탭 */}
              {activeDetailTab === "realtor" && (
                <>
                <div style={{ padding: "24px 20px", background: "#fff" }}>
                  <div style={{ fontSize: 16, fontWeight: "bold", color: "#111", marginBottom: 12 }}>{detailData.realtor.name}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "#fafafa", padding: 16, borderRadius: 8, border: "1px solid #eee" }}>
                    <span style={{ fontWeight: "bold", fontSize: 15, color: "#222" }}>{detailData.realtor.rep}</span>
                    <span style={{ fontSize: 13, color: "#666" }}>{detailData.realtor.regNum}</span>
                    <span style={{ fontSize: 13, color: "#666" }}>{detailData.realtor.addr}</span>
                    <span style={{ fontSize: 14, fontWeight: "bold", color: "#1f5edb", marginTop: 4 }}>{detailData.realtor.phone}</span>
                  </div>
                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "#111" }}>공실등록현황</div>
                    <div style={{ display: "flex", gap: 8, borderBottom: "2px solid #1a73e8", paddingBottom: 8 }}>
                      {Object.entries(detailData.realtorStats).map(([k, v]) => (
                        <span key={k} style={{ fontSize: 13, color: k === "sell" ? "#1a73e8" : "#888", fontWeight: k === "sell" ? "bold" : "normal", padding: "4px 8px" }}>
                          {k === "sell" ? "매매" : k === "rent" ? "전세" : k === "monthly" ? "월세" : "단기"} {v}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ──── 등록 물건 리스트 ──── */}
                <div style={{ borderTop: "10px solid #f5f5f5" }}>
                  {dummyProperties.slice(0, 5).map((prop) => (
                    <div key={prop.id} onClick={() => { setActiveProperty(prop.id); setActiveDetailTab("info"); setGalleryIndex(0); }}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                        padding: "16px 20px", cursor: "pointer", transition: "background 0.15s",
                        borderBottom: "1px solid #f0f0f0", background: "#fff",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#f9fbff"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
                    >
                      <div style={{ flex: 1, paddingRight: 12, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: "bold", color: "#111", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prop.name}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#1a73e8", marginBottom: 2 }}>{prop.price}</div>
                        <div style={{ fontSize: 13, color: "#555", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prop.type} · {prop.direction} · {prop.area}</div>
                        <div style={{ fontSize: 12, color: "#666", marginBottom: 6, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{prop.rooms}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: prop.tag === "수수료25%" ? "#2e7d32" : "#1a73e8", fontWeight: "bold", border: `1px solid ${prop.tag === "수수료25%" ? "#2e7d32" : "#1a73e8"}`, borderRadius: 3, padding: "2px 6px" }}>{prop.tag}</span>
                          <span style={{ fontSize: 11, color: "#e53e3e", fontWeight: "bold" }}>{prop.tagId}</span>
                          <span style={{ fontSize: 11, color: "#aaa" }}>{prop.date}</span>
                        </div>
                      </div>
                      <div style={{ width: 80, height: 80, borderRadius: 6, overflow: "hidden", background: "#f0f0f0", flexShrink: 0 }}>
                        <div style={{ width: "100%", height: "100%", background: "#ddd" }}></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ──── 댓글상담 (등록자정보 탭 하단) ──── */}
                <div style={{ marginTop: 0, borderTop: "1px solid #f0f0f0", padding: "20px 20px 30px" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#222", marginBottom: 15, display: "flex", alignItems: "center", gap: 8 }}>
                    댓글상담 <span style={{ color: "#1a73e8", fontSize: 15 }}>0개</span>
                  </div>
                  <div style={{ marginBottom: 25, border: "1px solid #ddd", borderRadius: 6, overflow: "hidden", background: "#fff" }}>
                    <textarea
                      placeholder={"가격을 제안하거나, 궁금한 점을 남겨보세요. 작성자에게 중개사인 알고 답변 수 있는 1:1 비공개 상담입니다."}
                      style={{ width: "100%", minHeight: 80, border: "none", outline: "none", padding: "14px 15px", fontSize: 14, color: "#333", resize: "vertical", fontFamily: "inherit", background: "#fff", boxSizing: "border-box" }}
                    />
                    <div style={{ padding: "10px 15px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafafa", borderTop: "1px solid #eee" }}>
                      <span style={{ fontSize: 13, color: "#888", display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ color: "#1a73e8" }}>🔒</span> 비밀댓글 자동적용
                      </span>
                      <button style={{ background: "#1a73e8", color: "#fff", border: "none", padding: "8px 24px", borderRadius: 4, fontWeight: "bold", cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>등록</button>
                    </div>
                  </div>
                  <div style={{ textAlign: "center", padding: 30, color: "#888", fontSize: 13 }}>
                    아직 등록된 문의가 없습니다.
                  </div>
                </div>
                </>
              )}
            </div>

            {/* 하단 고정 바 */}
            <div style={{ width: "100%", height: 75, flexShrink: 0, background: "#fff", borderTop: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", boxSizing: "border-box", boxShadow: "0 -4px 12px rgba(0,0,0,0.05)", zIndex: 10 }}>
              <span style={{ fontSize: 18, fontWeight: "bold", color: "#111" }}>{detailData.price}</span>
              <button style={{ background: "#1a73e8", color: "#fff", border: "none", padding: "10px 28px", borderRadius: 4, fontSize: 15, fontWeight: "bold", cursor: "pointer" }}>연락처 보기</button>
            </div>
          </div>
        )}

        {/* 우측: 지도 영역 */}
        <div style={{ flex: 1, height: "100%", position: "relative", minWidth: 0, background: "#eee" }}>
          {/* 지도 위 플로팅 필터 */}
          <div style={{ display: "flex", position: "absolute", top: 15, left: 20, zIndex: 10, background: "#fff", padding: "5px 15px", borderRadius: 30, boxShadow: "0 4px 10px rgba(0,0,0,0.1)", border: "1px solid #ddd", alignItems: "center", gap: 10, fontSize: 14, color: "#333" }}>
            <span style={{ fontWeight: "bold", padding: "5px 10px", cursor: "pointer" }}>위치 파악중 ▼</span>
            <div style={{ width: 1, height: 12, background: "#ddd" }}></div>
            <span style={{ fontWeight: "bold", padding: "5px 10px", cursor: "pointer" }}>- ▼</span>
            <div style={{ width: 1, height: 12, background: "#ddd" }}></div>
            <span style={{ fontWeight: "bold", padding: "5px 10px", cursor: "pointer" }}>- ▼</span>
            <div style={{ width: 1, height: 12, background: "#ddd" }}></div>
            <span style={{ fontWeight: "bold", padding: "5px 10px", cursor: "pointer", color: "#1a73e8" }}>검색 🔍</span>
          </div>
          {/* 지도 placeholder */}
          <div style={{ width: "100%", height: "100%", background: "#e8eaed", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 18 }}>
            🗺️ 카카오맵 영역 (향후 연동)
          </div>
        </div>
      </main>
    </div>
  );
}
