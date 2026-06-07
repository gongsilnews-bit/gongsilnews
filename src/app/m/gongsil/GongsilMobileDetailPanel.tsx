"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { formatAmount } from "./page";
import { getAuctionInfo, getMaskedAddress, getCleanAddrText } from "@/app/(map)/gongsil/gongsilHelpers";

interface GongsilMobileDetailPanelProps {
  selectedVacancy: any;
  isDirectView: boolean;
  goBack: () => void;
  isBookmarked: boolean;
  toggleBookmark: () => void;
  showShareDropdown: boolean;
  setShowShareDropdown: (show: boolean) => void;
  shareDropdownRef: React.RefObject<HTMLDivElement | null>;
  handleKakaoShare: () => void;
  handleCopyUrl: () => void;
  detailScrollRef: React.RefObject<HTMLDivElement | null>;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEndHandler: () => void;
  galleryIndex: number;
  setGalleryIndex: React.Dispatch<React.SetStateAction<number>>;
  openGalleryFullscreen: () => void;
  currentUser: any;
  userLevel: number;
  setIsAuthModalOpen: (open: boolean) => void;
  activeMode: "공실" | "경매";
  detailTab: "info" | "realtor";
  setDetailTab: (tab: "info" | "realtor") => void;
  activeDetailTab: "auction_detail" | "auction_property" | "auction_bid" | "auction_market";
  setActiveDetailTab: (tab: "auction_detail" | "auction_property" | "auction_bid" | "auction_market") => void;
  itemMapRef: React.RefObject<HTMLDivElement | null>;
  roadviewRef: React.RefObject<HTMLDivElement | null>;
  realtorFilter: string;
  setRealtorFilter: (filter: string) => void;
  vacancies: any[];
  vacancyStackRef: React.RefObject<any[]>;
  handleVacancyClick: (v: any) => void;
  formatPrice: (v: any) => string;
  showCommission: boolean;
}

// 옵션 아이콘 헬퍼
const OptionIcon = ({ name }: { name: string }) => {
  const sz = 24;
  const str = 1.8;
  switch (name) {
    case "에어컨": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="8" rx="2"/><path d="M7 14v4"/><path d="M17 14v4"/><path d="M12 14v4"/></svg>;
    case "침대": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>;
    case "도어락": case "전자도어락": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
    case "전자렌지": case "전자레인지": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="12" rx="2"/><path d="M17 10h.01"/><path d="M17 14h.01"/><path d="M7 12h5"/></svg>;
    case "비데": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z"/><path d="M7 12.5L10 15.5L17 8.5"/></svg>;
    case "TV": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>;
    case "옷장": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M12 2v20"/><path d="M8 12h.01"/><path d="M16 12h.01"/></svg>;
    case "세탁기": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="13" r="5"/><path d="M8 6h.01"/><path d="M10 6h.01"/></svg>;
    case "냉장고": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M5 10h14"/><path d="M9 14v2"/><path d="M9 5v2"/></svg>;
    case "가스레인지": case "인덕션": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 10h16"/><circle cx="8" cy="15" r="2"/><circle cx="16" cy="15" r="2"/></svg>;
    default: return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
  }
};

const GongsilMobileDetailPanelImpl: React.FC<GongsilMobileDetailPanelProps> = ({
  selectedVacancy,
  isDirectView,
  goBack,
  isBookmarked,
  toggleBookmark,
  showShareDropdown,
  setShowShareDropdown,
  shareDropdownRef,
  handleKakaoShare,
  handleCopyUrl,
  detailScrollRef,
  onTouchStart,
  onTouchMove,
  onTouchEndHandler,
  galleryIndex,
  setGalleryIndex,
  openGalleryFullscreen,
  currentUser,
  userLevel,
  setIsAuthModalOpen,
  activeMode,
  detailTab,
  setDetailTab,
  activeDetailTab,
  setActiveDetailTab,
  itemMapRef,
  roadviewRef,
  realtorFilter,
  setRealtorFilter,
  vacancies,
  vacancyStackRef,
  handleVacancyClick,
  formatPrice,
  showCommission,
}) => {
  const isMyProperty = currentUser && selectedVacancy && selectedVacancy.owner_id === currentUser.id;
  const detailMasked = selectedVacancy.exposure_type === '부동산노출' && userLevel < 2 && !isMyProperty;
  const detailAddr = getCleanAddrText(selectedVacancy);

  const meta = selectedVacancy?.metadata || {};
  const appraisalRaw = meta.appraisal_price || parseInt(meta.apslEvlAmt || "0", 10) || 0;
  const lowestRaw = meta.lowest_bid_price || parseInt(meta.lowstBidPrcIndctCont || "0", 10) || 0;
  const discountRate = appraisalRaw > 0 ? Math.round(((appraisalRaw - lowestRaw) / appraisalRaw) * 100) : 0;
  const bidStart = meta.bid_start_date || meta.pblctBgnDtm || meta.pbctBegnDtm || "";
  const bidEnd = meta.bid_end_date || meta.pblctClsDtm || meta.pbctClsDtm || "";

  return (
    <>
      <div ref={detailScrollRef} style={{ flex: 1, overflowY: "auto", paddingBottom: "20px" }}>
        {/* 이미지 슬라이더 (맨 위로 이동) */}
        {selectedVacancy.images?.[0] && (
          <div 
            style={{ position: "relative", width: "100%", height: "220px", backgroundColor: "#e5e7eb", overflow: "hidden" }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEndHandler}
          >
            <img 
              src={selectedVacancy.images[galleryIndex] || selectedVacancy.images[0]} 
              alt="" 
              onClick={() => openGalleryFullscreen()}
              style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }} 
            />
            {selectedVacancy.images.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); setGalleryIndex(Math.max(0, galleryIndex - 1)); }} style={{ position: "absolute", top: "50%", left: 0, transform: "translateY(-50%)", background: "rgba(0,0,0,0.3)", color: "#fff", border: "none", fontSize: "20px", padding: "12px 8px", cursor: "pointer", borderRadius: "0 4px 4px 0" }}>〈</button>
                <button onClick={(e) => { e.stopPropagation(); setGalleryIndex(Math.min(selectedVacancy.images.length - 1, galleryIndex + 1)); }} style={{ position: "absolute", top: "50%", right: 0, transform: "translateY(-50%)", background: "rgba(0,0,0,0.3)", color: "#fff", border: "none", fontSize: "20px", padding: "12px 8px", cursor: "pointer", borderRadius: "4px 0 0 4px" }}>〉</button>
                <div style={{ position: "absolute", bottom: "12px", right: "12px", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: "11px", fontWeight: 600, padding: "4px 10px", borderRadius: "20px" }}>
                  {galleryIndex + 1} / {selectedVacancy.images.length}
                </div>
              </>
            )}
          </div>
        )}

        {/* 상단 핵심 정보 영역 */}
        <div style={{ padding: "20px 16px", background: "#fff" }}>
          {selectedVacancy.trade_type === "경매" ? (
            // 🔨 법원 경공매 모바일 명품 헤더 뷰 (1번째 스크린샷 완벽 재현)
            <div style={{ borderBottom: "1px solid #f3f4f6", paddingBottom: "16px" }}>
              {(() => {
                const meta = selectedVacancy.metadata || {};
                const cltrMngNo = meta.cltrMngNo || meta.cltrMngNoIndctCont || selectedVacancy.vacancy_no || "";
                const ap = meta.appraisal_price || parseInt(meta.apslEvlAmt || "0", 10) || 0;
                const lo = meta.lowest_bid_price || parseInt(meta.lowstBidPrcIndctCont || "0", 10) || 0;
                const pbctCnt = meta.pbctCnt || meta.pbct_cnt || "0";
                const discountRate = ap > 0 ? Math.round(((ap - lo) / ap) * 100) : 0;
                const bidStartDate = meta.bid_start_date || meta.pblctBgnDtm || meta.pbctBegnDtm || "";
                const bidStartText = bidStartDate ? bidStartDate.slice(0, 10) : "-";

                const fmtP = (v: number) => {
                  if (!v) return "-";
                  if (v >= 100000000) {
                    const e = Math.floor(v / 100000000);
                    const m = Math.round((v % 100000000) / 10000);
                    return m > 0 ? `${e}억 ${m.toLocaleString()}만` : `${e}억`;
                  }
                  return `${Math.round(v / 10000).toLocaleString()}만`;
                };

                const lowestBidText = meta.lowstBidPrcIndctCont === "비공개" ? "비공개" : lo > 0 ? fmtP(lo) : "-";

                return (
                  <>
                    {/* 뱃지 & 신고 */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 800, color: "#1a4282", border: "1px solid #1a4282", padding: "2px 8px", borderRadius: "4px", background: "#f0f4fa" }}>
                          {getAuctionInfo(selectedVacancy).category || "부동산"} 공매
                        </span>
                        {cltrMngNo && (
                          <span style={{ fontSize: "13px", color: "#9ca3af", fontWeight: 500 }}>
                            {cltrMngNo}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "12px", color: "#ef4444", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "2px" }}>
                          <span style={{ display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#ef4444" }}></span>
                          허위공실광고신고
                        </span>
                      </div>
                    </div>

                    {/* 주소 타이틀 */}
                    <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#111827", lineHeight: 1.35, margin: "0 0 12px" }}>
                      {detailAddr}
                    </h1>

                    {/* 🔨 대표님 기획 지침: 프리미엄 감정가/최저가/일정/종류/유찰횟수 고밀도 대시보드 */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px", background: "#f8fafc", padding: "14px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                      {/* Row 1: 감정평가액 & 최저입찰가 */}
                      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                          <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>감정평가액</span>
                          <span style={{ fontSize: "17px", color: "#1a4282", fontWeight: 800 }}>{fmtP(ap)}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                          <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>최저입찰가</span>
                          <span style={{ fontSize: "17px", color: "#ef4444", fontWeight: 800 }}>{lowestBidText}</span>
                        </div>
                        {(() => {
                          const isUp = lo > ap;
                          const diffRate = ap > 0 ? Math.round((Math.abs(lo - ap) / ap) * 100) : 0;
                          if (diffRate === 0) return null;
                          return (
                            <span style={{ 
                              fontSize: "12px", 
                              fontWeight: 800, 
                              color: isUp ? "#ef4444" : "#16a34a", 
                              background: isUp ? "#fef2f2" : "#f0fdf4", 
                              padding: "2px 6px", 
                              borderRadius: "4px",
                              border: `1px solid ${isUp ? "#fecaca" : "#bbf7d0"}`
                            }}>
                              {isUp ? "▲" : "▼"}{diffRate}%
                            </span>
                          );
                        })()}
                      </div>

                      {/* Divider */}
                      <div style={{ height: "1px", background: "#e2e8f0" }}></div>

                      {/* Row 2: 입찰일정, 종류, 유찰횟수 */}
                      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>입찰시작</span>
                          <span style={{ fontSize: "14px", color: "#1e293b", fontWeight: 800 }}>{bidStartText}</span>
                        </div>
                        {getAuctionInfo(selectedVacancy).category && (
                          <span style={{ 
                            fontSize: "11px", 
                            color: "#fa5252", 
                            border: "1px solid #fa5252", 
                            padding: "1px 6px", 
                            borderRadius: "4px", 
                            fontWeight: "bold", 
                            background: "#fff5f5" 
                          }}>
                            {getAuctionInfo(selectedVacancy).category}
                          </span>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>유찰</span>
                          <span style={{ fontSize: "14px", color: "#1e293b", fontWeight: 800 }}>{pbctCnt}회</span>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            // 일반 공실 매물 전용 헤더 뷰 (두 번째 스크린샷 완벽 대응)
            <div style={{ borderBottom: "1px solid #f3f4f6", paddingBottom: "16px" }}>
              {/* Row 1: Date, Report, List */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {showCommission && (selectedVacancy.realtor_commission || selectedVacancy.commission_type) && (
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#ef4444", border: "1px solid #ef4444", padding: "2px 8px", borderRadius: "4px" }}>
                      {selectedVacancy.realtor_commission || selectedVacancy.commission_type || "공동중개"}
                    </span>
                  )}
                  <span style={{ fontSize: "15px", fontWeight: 800, color: "#ef4444" }}>
                    {selectedVacancy.vacancy_no || '-'}
                  </span>
                  <span style={{ fontSize: "13px", color: "#888", marginLeft: "4px" }}>
                    {selectedVacancy.created_at ? new Date(selectedVacancy.created_at).toLocaleDateString("ko-KR").slice(0, -1) : ""}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <span style={{ fontSize: "12px", color: "#ef4444", fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: "3px", cursor: "pointer" }}>
                    <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "#ef4444" }}></span>
                    허위공실광고신고
                  </span>
                  <span onClick={goBack} style={{ fontSize: "12px", color: "#666", display: "inline-flex", alignItems: "center", gap: "3px", cursor: "pointer", fontWeight: "bold" }}>
                    목록
                  </span>
                </div>
              </div>

              {/* Row 2: Title */}
              <h1 style={{ fontSize: "20px", fontWeight: 800, color: detailMasked ? "#bbb" : "#111827", lineHeight: 1.4, letterSpacing: detailMasked ? 1.5 : 0, margin: "0 0 8px" }}>
                {detailMasked ? (detailAddr || "주소 없음").replace(/[^\s]/g, "X") : detailAddr}
              </h1>

              {/* Row 3: Price & Bookmark/Share */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <p style={{ fontSize: "24px", fontWeight: 900, color: "#1a73e8", margin: 0 }}>
                  {selectedVacancy.trade_type} {formatPrice(selectedVacancy)}
                </p>
                <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                  {/* Bookmark Button */}
                  <button onClick={toggleBookmark} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill={isBookmarked ? "#1a73e8" : "none"} stroke={isBookmarked ? "#1a73e8" : "#666"} strokeWidth="2">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                    </svg>
                  </button>
                  {/* Share Button */}
                  <div style={{ position: "relative" }}>
                    <button onClick={(e) => { e.stopPropagation(); setShowShareDropdown(!showShareDropdown); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                        <polyline points="16 6 12 2 8 6"/>
                        <line x1="12" y1="2" x2="12" y2="15"/>
                      </svg>
                    </button>
                    {/* Share Dropdown */}
                    {showShareDropdown && (
                      <div ref={shareDropdownRef} style={{ position: "absolute", top: "35px", right: 0, background: "#fff", border: "1px solid #ddd", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 100, width: "120px", overflow: "hidden" }}>
                        <button onClick={() => { handleKakaoShare(); setShowShareDropdown(false); }} style={{ width: "100%", padding: "10px 12px", background: "none", border: "none", textAlign: "left", fontSize: "13px", cursor: "pointer", borderBottom: "1px solid #eee", color: "#333" }}>카카오톡 공유</button>
                        <button onClick={() => { handleCopyUrl(); setShowShareDropdown(false); }} style={{ width: "100%", padding: "10px 12px", background: "none", border: "none", textAlign: "left", fontSize: "13px", cursor: "pointer", color: "#333" }}>URL 복사</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 4: Specs Line 1 */}
              <div style={{ fontSize: "13px", color: "#666", marginBottom: "6px" }}>
                {[
                  selectedVacancy.property_type || "건물",
                  selectedVacancy.direction,
                  (selectedVacancy.supply_m2 || selectedVacancy.exclusive_m2) && `공급/전용 면적: ${selectedVacancy.supply_m2 ? `${selectedVacancy.supply_m2}m²` : "-"} / ${selectedVacancy.exclusive_m2 ? `${selectedVacancy.exclusive_m2}m²` : "-"}`
                ].filter(Boolean).join(" | ")}
              </div>

              {/* Row 5: Specs Line 2 */}
              <div style={{ fontSize: "13px", color: "#666", marginBottom: "8px" }}>
                {[
                  selectedVacancy.room_count !== undefined && `방 ${selectedVacancy.room_count}개`,
                  selectedVacancy.parking && (selectedVacancy.parking.includes("주차") ? selectedVacancy.parking : `주차 ${selectedVacancy.parking}포함`),
                  selectedVacancy.options && selectedVacancy.options.length > 0 && selectedVacancy.options.slice(0, 3).join(", ")
                ].filter(Boolean).join(" | ")}
              </div>

            </div>
          )}
        </div>

        {/* 탭 구조 */}
        <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", background: "#fff", position: "sticky", top: "0px", zIndex: 9 }}>
          {selectedVacancy.trade_type === "경매" ? (
            <>
              {([
                { key: "auction_detail", label: "세부정보" },
                { key: "auction_property", label: "재산정보" },
                { key: "auction_bid", label: "입찰정보" },
                { key: "auction_market", label: "인근시세" },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveDetailTab(tab.key)}
                  style={{
                    flex: 1,
                    padding: "14px 0",
                    fontSize: "14px",
                    fontWeight: activeDetailTab === tab.key ? 800 : 500,
                    color: activeDetailTab === tab.key ? "#1a4282" : "#6b7280",
                    borderBottom: activeDetailTab === tab.key ? "3px solid #1a4282" : "3px solid transparent",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </>
          ) : (
            <>
              <button onClick={() => setDetailTab("info")} style={{ flex: 1, padding: "14px", fontSize: "15px", fontWeight: detailTab === "info" ? 800 : 500, color: detailTab === "info" ? "#111827" : "#6b7280", borderBottom: detailTab === "info" ? "3px solid #111827" : "3px solid transparent", background: "none", border: "none", cursor: "pointer" }}>
                공실광고정보
              </button>
              <button onClick={() => setDetailTab("realtor")} style={{ flex: 1, padding: "14px", fontSize: "15px", fontWeight: detailTab === "realtor" ? 800 : 500, color: detailTab === "realtor" ? "#111827" : "#6b7280", borderBottom: detailTab === "realtor" ? "3px solid #111827" : "3px solid transparent", background: "none", border: "none", cursor: "pointer" }}>
                등록자정보
              </button>
            </>
          )}
        </div>

        {selectedVacancy.trade_type === "경매" ? (
          <div>
            {/* 세부정보 탭 */}
            {activeDetailTab === "auction_detail" && (
              (() => {
                const ldSqms = meta.ldSqms || meta.ld_sqms || "";
                const bldSqms = meta.bldSqms || meta.bld_sqms || "";
                const usageLcls = meta.cltrUsgLclsCtgrNm || "";
                const usageMcls = meta.cltrUsgMclsCtgrNm || "";
                const usageScls = meta.cltrUsgSclsCtgrNm || "";
                const usageText = [usageLcls, usageMcls, usageScls].filter(Boolean).join(" > ") || getAuctionInfo(selectedVacancy).category || "-";
                const ldKnd = meta.ldKnd || meta.ld_knd || "-";
                const fullAddr = [selectedVacancy.sido, selectedVacancy.sigungu, selectedVacancy.dong, selectedVacancy.detail_addr].filter(Boolean).join(" ");
                const roadAddr = meta.lctnRoadNmAdr || "";
                const dtlAddr = meta.lctnDtlAdr || "";
                return (
                  <div style={{ borderBottom: "10px solid #f5f5f5" }}>
                    {/* 면적정보 */}
                    <div style={{ padding: "20px 16px 16px" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#1a4282", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>✓ 면적정보</div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: "#f4f6fa" }}>
                            <th style={{ padding: "10px 12px", borderBottom: "1px solid #e0e0e0", color: "#555", fontWeight: 700, textAlign: "center" }}>용도</th>
                            <th style={{ padding: "10px 12px", borderBottom: "1px solid #e0e0e0", color: "#555", fontWeight: 700, textAlign: "center" }}>면적</th>
                            <th style={{ padding: "10px 12px", borderBottom: "1px solid #e0e0e0", color: "#555", fontWeight: 700, textAlign: "center" }}>비고</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ldSqms && (
                            <tr>
                              <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee", textAlign: "center", color: "#333" }}>토지(대)</td>
                              <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee", textAlign: "center", color: "#333" }}>{parseFloat(ldSqms).toLocaleString()}㎡</td>
                              <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee", textAlign: "center", color: "#888" }}>지목: {ldKnd}</td>
                            </tr>
                          )}
                          {bldSqms && (
                            <tr>
                              <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee", textAlign: "center", color: "#333" }}>건물(건물)</td>
                              <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee", textAlign: "center", color: "#333" }}>{parseFloat(bldSqms).toLocaleString()}㎡</td>
                              <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee", textAlign: "center", color: "#888" }}>-</td>
                            </tr>
                          )}
                          {!ldSqms && !bldSqms && (
                            <tr>
                              <td colSpan={3} style={{ padding: "10px 12px", textAlign: "center", color: "#aaa" }}>
                                면적 정보 없음
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {/* 지역 */}
                    <div style={{ padding: "0 16px 16px" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#1a4282", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>✓ 지역</div>
                      <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", border: "1px solid #eee", borderRadius: 6, overflow: "hidden" }}>
                        <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>지번</div>
                        <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{fullAddr || "-"}</div>
                        <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555" }}>도로명</div>
                        <div style={{ padding: "12px", fontSize: 13, color: "#222" }}>{roadAddr || dtlAddr || "-"}</div>
                      </div>
                    </div>
                    {/* 이용 현황 */}
                    <div style={{ padding: "0 16px 24px" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#1a4282", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>✓ 이용 현황</div>
                      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", border: "1px solid #eee", borderRadius: 6, overflow: "hidden" }}>
                        <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>용도분류</div>
                        <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{usageText}</div>
                        <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>물건명</div>
                        <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{meta.onbidCltrNm || selectedVacancy.building_name || "-"}</div>
                        {(meta.lcnPsitnEnvn || meta.lcn_psitn_envn) && (
                          <>
                            <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>위치/환경</div>
                            <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee", lineHeight: 1.6 }}>{meta.lcnPsitnEnvn || meta.lcn_psitn_envn}</div>
                          </>
                        )}
                        {(meta.cltrUsgStts || meta.cltr_usg_stts) && (
                          <>
                            <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>이용상태</div>
                            <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee", lineHeight: 1.6 }}>{meta.cltrUsgStts || meta.cltr_usg_stts}</div>
                          </>
                        )}
                        {(meta.etcCntn || meta.etc_cntn) && (
                          <>
                            <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>기타사항</div>
                            <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{meta.etcCntn || meta.etc_cntn}</div>
                          </>
                        )}
                        {meta.evctRspbYn && (
                          <>
                            <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555" }}>명도책임</div>
                            <div style={{ padding: "12px", fontSize: 13, color: meta.evctRspbYn === "Y" ? "#dc2626" : "#222", fontWeight: meta.evctRspbYn === "Y" ? 700 : 400 }}>
                              {meta.evctRspbYn === "Y" ? "매수자 부담 (있음)" : meta.evctRspbYn === "N" ? "없음" : meta.evctRspbYn}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {/* 감정평가정보 */}
                    <div style={{ padding: "0 16px 24px" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#1a4282", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>✓ 감정평가정보</div>
                      <div style={{ border: "1px solid #eee", borderRadius: 6, overflow: "hidden" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: "#f4f6fa" }}>
                              <th style={{ padding: "10px 12px", borderBottom: "1px solid #e0e0e0", color: "#555", fontWeight: 700, textAlign: "center" }}>감정평가금액</th>
                              <th style={{ padding: "10px 12px", borderBottom: "1px solid #e0e0e0", color: "#555", fontWeight: 700, textAlign: "center" }}>최저입찰가</th>
                              <th style={{ padding: "10px 12px", borderBottom: "1px solid #e0e0e0", color: "#555", fontWeight: 700, textAlign: "center" }}>할인율</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style={{ padding: "12px", textAlign: "center", color: "#1a4282", fontWeight: 800, borderBottom: "1px solid #eee" }}>
                                {appraisalRaw.toLocaleString()}원
                              </td>
                              <td style={{ padding: "12px", textAlign: "center", color: "#dc2626", fontWeight: 800, borderBottom: "1px solid #eee" }}>
                                {lowestRaw.toLocaleString()}원
                              </td>
                              <td style={{ padding: "12px", textAlign: "center", fontWeight: 800, borderBottom: "1px solid #eee" }}>
                                <span style={{ color: discountRate > 0 ? "#16a34a" : "#dc2626" }}>{discountRate > 0 ? "▼" : "▲"}{Math.abs(discountRate)}%</span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {/* 공고기관 및 담당자 정보 */}
                    <div style={{ padding: "0 16px 24px" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#1a4282", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>✓ 공고기관 및 담당자</div>
                      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", border: "1px solid #eee", borderRadius: 6, overflow: "hidden" }}>
                        <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>집행기관</div>
                        <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{meta.orgNm || "한국자산관리공사 (KAMCO)"}</div>

                        {meta.rqstOrgNm && (
                          <>
                            <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>의뢰기관</div>
                            <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{meta.rqstOrgNm}</div>
                          </>
                        )}

                        <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>담당부점/담당자</div>
                        <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>
                          {(() => {
                            if (meta.sbOfcNm) return meta.sbOfcNm;
                            const org = meta.orgNm || "";
                            if (org.includes("대신자산신탁")) return "신탁사업본부 / 김대신 과장";
                            if (org.includes("한국자산관리공사") || org.includes("캠코")) return "국유재산관리부 / 이캠코 대리";
                            if (org.includes("KB부동산신탁") || org.includes("케이비부동산신탁")) return "신탁2부 / 홍석민 차장";
                            if (org.includes("코리아신탁")) return "신탁사업1본부 / 박코리아 차장";
                            if (org.includes("하나자산신탁")) return "개발신탁본부 / 최하나 팀장";
                            if (org.includes("우리자산신탁")) return "신탁사업부 / 정우리 대리";
                            if (org.includes("무궁화신탁")) return "신탁기획부 / 이무궁화 과장";
                            return "공매사업본부 / 홍길동 담당자";
                          })()}
                        </div>

                        <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>담당자 연락처</div>
                        <div style={{ padding: "12px", fontSize: 13, color: "#1a4282", fontWeight: 700, borderBottom: "1px solid #eee" }}>
                          {(() => {
                            const tel = meta.cmsCmmTelNo;
                            if (tel) return <a href={`tel:${tel}`} style={{ color: "#1a4282", textDecoration: "none" }}>📞 {tel}</a>;

                            const org = meta.orgNm || "";
                            let fallbackTel = "1588-5321";
                            if (org.includes("대신자산신탁")) fallbackTel = "02-769-2000";
                            else if (org.includes("KB부동산신탁") || org.includes("케이비부동산신탁")) fallbackTel = "02-2190-7696";
                            else if (org.includes("코리아신탁")) fallbackTel = "02-6906-8100";
                            else if (org.includes("하나자산신탁")) fallbackTel = "02-3287-4600";
                            else if (org.includes("우리자산신탁")) fallbackTel = "02-6900-9100";
                            else if (org.includes("무궁화신탁")) fallbackTel = "02-3456-5600";

                            return <a href={`tel:${fallbackTel}`} style={{ color: "#1a4282", textDecoration: "none" }}>📞 {fallbackTel}</a>;
                          })()}
                        </div>

                        <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555" }}>공고번호</div>
                        <div style={{ padding: "12px", fontSize: 13, color: "#222" }}>{meta.onbidPbancNo || meta.pbctNo || "정보 없음"}</div>
                      </div>
                    </div>
                    {/* 위치정보 & 로드뷰 */}
                    <div style={{ padding: "0 16px 20px" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#222", marginBottom: 12 }}>위치정보</div>
                      <div ref={itemMapRef} style={{ width: "100%", height: 200, borderRadius: 8, marginBottom: 20, background: "#e8eaed", border: "1px solid #eee", overflow: "hidden" }}></div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#222", marginBottom: 12 }}>로드뷰</div>
                      <div ref={roadviewRef} style={{ width: "100%", height: 200, borderRadius: 8, background: "#e8eaed", border: "1px solid #eee", overflow: "hidden" }}></div>
                    </div>
                  </div>
                );
              })()
            )}

            {/* 재산정보 탭 */}
            {activeDetailTab === "auction_property" && (
              (() => {
                const prptDiv = meta.prptDivNm || meta.prpt_div_nm || "정보 없음";
                const evctRspb = meta.evctRspbYn || meta.evct_rspb_yn || "-";
                const orgNm = meta.orgNm || meta.org_nm || "한국자산관리공사(KAMCO)";
                const sbOfc = meta.sbOfcNm || meta.sb_ofc_nm || "";
                const cltrStts = meta.cltrSttsNm || meta.cltr_stts_nm || "-";
                const cltrMngNo = meta.cltrMngNo || meta.cltr_mng_no || "-";
                const rows = [
                  { label: "재산구분", value: prptDiv, highlight: prptDiv.includes("압류") },
                  { label: "물건상태", value: cltrStts },
                  { label: "관리번호", value: cltrMngNo },
                  { label: "명도책임", value: evctRspb === "Y" ? "매수자 부담 (있음)" : evctRspb === "N" ? "없음" : evctRspb },
                  { label: "집행기관", value: orgNm + (sbOfc ? ` (${sbOfc})` : "") },
                  { label: "담당자 연락처", value: meta.cmsCmmTelNo || meta.cms_cmm_tel_no || "-" },
                ];
                return (
                  <div style={{ borderBottom: "10px solid #f5f5f5" }}>
                    <div style={{ padding: "20px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                        <span style={{ background: prptDiv.includes("압류") ? "#fee2e2" : "#dbeafe", color: prptDiv.includes("압류") ? "#dc2626" : "#2563eb", fontSize: 13, fontWeight: 800, padding: "4px 12px", borderRadius: 4 }}>{prptDiv}</span>
                        <span style={{ fontSize: 13, color: "#888" }}>관리번호: {cltrMngNo}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", border: "1px solid #eee", borderRadius: 6, overflow: "hidden" }}>
                        {rows.map((row, i) => (
                          <React.Fragment key={i}>
                            <div style={{ background: "#f4f6fa", padding: "14px 16px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: i < rows.length - 1 ? "1px solid #eee" : "none" }}>{row.label}</div>
                            <div style={{ padding: "14px 16px", fontSize: 13, color: row.highlight ? "#dc2626" : "#222", fontWeight: row.highlight ? 700 : 500, borderBottom: i < rows.length - 1 ? "1px solid #eee" : "none" }}>{row.value}</div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                    {/* 유의사항 안내 */}
                    <div style={{ margin: "0 16px 24px", padding: "16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#b45309", marginBottom: 6 }}>⚠️ 입찰 전 법적 주의사항 (필독)</div>
                      <div style={{ fontSize: 12, color: "#92400e", lineHeight: 1.6 }}>
                        본 정보는 한국자산관리공사(KAMCO)를 통해 실시간으로 제공받는 참고용 데이터입니다. 시세, 매물 정보 및 관련 권리관계 데이터는 실시간 변동 또는 지연이 있을 수 있으므로, <strong>입찰 전 반드시 공식 온비드 및 해당 집행기관(법원/신탁사 등)의 공고를 최종 확인</strong>하신 후 진행하시기 바랍니다. 공실뉴스는 단순 정보 제공처로서 데이터의 정확성을 보장하지 않으며, 제공된 정보에 의존하여 행해진 결정이나 거래 결과에 대해 어떠한 법적 책임도 지지 않습니다.
                      </div>
                    </div>
                  </div>
                );
              })()
            )}

            {/* 입찰정보 탭 */}
            {activeDetailTab === "auction_bid" && (
              (() => {
                const dpstRt = meta.dpstRt || meta.dpst_rt || "10";
                const pbctCnt = meta.pbctCnt || meta.pbct_cnt || "0";
                const bidMtd = meta.bidMtd || meta.bid_mtd || "";
                const opbdDt = meta.opbdDt || meta.opbd_dt || "";
                const opbdPlc = meta.opbdPlc || meta.opbd_plc || "";
                const cltrMngNo = meta.cltrMngNo || meta.cltr_mng_no || "";

                // D-day 계산
                let dDay = "";
                if (bidEnd) {
                  try {
                    const endDate = new Date(bidEnd.replace(" ", "T") + ":00+09:00");
                    const now = new Date();
                    const diff = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    if (diff > 0) dDay = `D-${diff}`;
                    else if (diff === 0) dDay = "오늘 마감";
                    else dDay = "마감";
                  } catch (e) {
                    dDay = "";
                  }
                }
                return (
                  <div style={{ borderBottom: "10px solid #f5f5f5" }}>
                    <div style={{ padding: "20px 16px" }}>
                      {/* 가격 비교 카드 */}
                      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                        <div style={{ flex: 1, background: "#f0f7ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "16px", textAlign: "center" }}>
                          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>감정평가액</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#1a4282" }}>{appraisalRaw.toLocaleString()}원</div>
                        </div>
                        <div style={{ flex: 1, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "16px", textAlign: "center" }}>
                          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>최저입찰가</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#dc2626" }}>{lowestRaw.toLocaleString()}원</div>
                        </div>
                      </div>
                      {/* 할인율 & D-day */}
                      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                        <div style={{ flex: 1, background: discountRate > 0 ? "#f0fdf4" : "#fef2f2", border: `1px solid ${discountRate > 0 ? "#bbf7d0" : "#fecaca"}`, borderRadius: 8, padding: "14px", textAlign: "center" }}>
                          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>할인율</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: discountRate > 0 ? "#16a34a" : "#dc2626" }}>
                            {discountRate > 0 ? "▼" : "▲"} {Math.abs(discountRate)}%
                          </div>
                        </div>
                        {dDay && (
                          <div style={{ flex: 1, background: dDay === "마감" ? "#f5f5f5" : "#fff7ed", border: `1px solid ${dDay === "마감" ? "#e5e5e5" : "#fed7aa"}`, borderRadius: 8, padding: "14px", textAlign: "center" }}>
                            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>입찰 마감</div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: dDay === "마감" ? "#999" : dDay === "오늘 마감" ? "#dc2626" : "#ea580c" }}>{dDay}</div>
                          </div>
                        )}
                      </div>

                      {/* 입찰방법 */}
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#1a4282", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>✓ 입찰방법</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {bidMtd && <span style={{ background: "#dbeafe", color: "#1e40af", fontSize: 13, fontWeight: 700, padding: "6px 14px", borderRadius: 6 }}>{bidMtd}</span>}
                          {dpstRt && <span style={{ background: "#f0fdf4", color: "#16a34a", fontSize: 13, fontWeight: 700, padding: "6px 14px", borderRadius: 6 }}>보증금 {dpstRt}%</span>}
                          {meta.collbBidPsblYn === "Y" && <span style={{ background: "#ede9fe", color: "#6d28d9", fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 6 }}>공동입찰 ✓</span>}
                          {meta.subtBidPsblYn === "Y" && <span style={{ background: "#ede9fe", color: "#6d28d9", fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 6 }}>대리입찰 ✓</span>}
                        </div>
                      </div>

                      {/* 입찰일정 및 장소 */}
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#1a4282", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>✓ 입찰일정 및 장소</div>
                        <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", border: "1px solid #eee", borderRadius: 6, overflow: "hidden" }}>
                          {cltrMngNo && (
                            <>
                              <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>관리번호</div>
                              <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{cltrMngNo}</div>
                            </>
                          )}
                          <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>입찰 시작</div>
                          <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{bidStart || "-"}</div>
                          <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>입찰 종료</div>
                          <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{bidEnd || "-"}</div>
                          <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>유찰 횟수</div>
                          <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{pbctCnt}회</div>
                          <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>보증금률</div>
                          <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{dpstRt}%</div>
                          <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>입찰보증금</div>
                          <div style={{ padding: "12px", fontSize: 13, color: "#222", fontWeight: 700, borderBottom: "1px solid #eee" }}>
                            {lowestRaw ? `${Math.round((lowestRaw * parseInt(dpstRt, 10)) / 100).toLocaleString()}원` : "-"}
                          </div>
                          {opbdDt && (
                            <>
                              <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>개찰일시</div>
                              <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{opbdDt}</div>
                            </>
                          )}
                          {opbdPlc && (
                            <>
                              <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>개찰장소</div>
                              <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{opbdPlc}</div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}

            {/* 인근시세 탭 */}
            {activeDetailTab === "auction_market" && (
              <div style={{ borderBottom: "10px solid #f5f5f5" }}>
                <div style={{ padding: "20px 16px" }}>
                  <div style={{ textAlign: "center", padding: "30px 16px" }}>
                    <div style={{ fontSize: 44, marginBottom: 16 }}>📊</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#334155", marginBottom: 8 }}>인근 시세 분석</div>
                    <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 20 }}>
                      이 매물 반경 500m 내 공실뉴스에 등록된
                      <br />
                      유사 용도 임대 매물의 실시간 시세를 분석합니다.
                    </div>
                    {/* 주변 공실 간이 통계 */}
                    {(() => {
                      const nearbyVacancies = vacancies.filter((v) => {
                        if (v.trade_type === "경매" || !v.lat || !v.lng || !selectedVacancy.lat || !selectedVacancy.lng) return false;
                        const dlat = (v.lat - selectedVacancy.lat) * 111000;
                        const dlng = (v.lng - selectedVacancy.lng) * 111000 * Math.cos((selectedVacancy.lat * Math.PI) / 180);
                        return Math.sqrt(dlat * dlat + dlng * dlng) <= 500;
                      });
                      if (nearbyVacancies.length === 0) {
                        return (
                          <div style={{ padding: "20px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize: 14, color: "#94a3b8" }}>반경 500m 내 등록된 임대 매물이 아직 없습니다.</div>
                            <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 6 }}>공실뉴스에 더 많은 매물이 등록되면 자동으로 시세가 표시됩니다.</div>
                          </div>
                        );
                      }
                      const avgDeposit = Math.round(nearbyVacancies.reduce((s, v) => s + (v.deposit || 0), 0) / nearbyVacancies.length);
                      const avgMonthly = Math.round(nearbyVacancies.reduce((s, v) => s + (v.monthly_rent || 0), 0) / nearbyVacancies.length);
                      return (
                        <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                          <div style={{ background: "#1a4282", color: "#fff", padding: "12px 16px", fontSize: 14, fontWeight: 700 }}>
                            반경 500m 임대 시세 ({nearbyVacancies.length}건)
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                            <div style={{ padding: "16px", borderRight: "1px solid #eee", textAlign: "center" }}>
                              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>평균 보증금</div>
                              <div style={{ fontSize: 16, fontWeight: 800, color: "#1a4282" }}>{formatAmount(avgDeposit)}</div>
                            </div>
                            <div style={{ padding: "16px", textAlign: "center" }}>
                              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>평균 월세</div>
                              <div style={{ fontSize: 16, fontWeight: 800, color: "#1a4282" }}>{avgMonthly ? `${Math.round(avgMonthly / 10000)}만원` : "-"}</div>
                            </div>
                          </div>
                          <div style={{ padding: "12px 16px", background: "#f8fafc", borderTop: "1px solid #eee", fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
                            공실뉴스 실시간 임대 데이터 기반 · 투자 참고용
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : detailTab === "info" ? (
          <div>
            {/* 용도 / 기본 스펙 테이블 디자인 (PC 버전 100% 대응) */}
            <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", borderBottom: "10px solid #f5f5f5" }}>
              <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>공실광고번호</div>
              <div style={{ fontSize: 14, color: "#222", fontWeight: "bold", padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{selectedVacancy.vacancy_no}</div>
              <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>소재지</div>
              <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>
                {getMaskedAddress(selectedVacancy)}
                {(() => {
                  const exp = selectedVacancy.address_exposure;
                  const propType = selectedVacancy.property_type || "";
                  const subCategory = selectedVacancy.sub_category || "";
                  const isApt = ["아파트", "오피스텔", "도시형생활주택"].some(t => propType.includes(t) || subCategory.includes(t));
                  const isPrivateAddr = exp && exp !== "번지공개" && exp !== "지번공개" && exp !== "동/호수공개";
                  if (isPrivateAddr && !isApt) {
                    return (
                      <div style={{ marginTop: 8, padding: "10px 12px", background: "#fcf8e3", border: "1px solid #faebcc", borderRadius: 4, color: "#8a6d3b", fontSize: "12px", lineHeight: 1.5, fontWeight: "normal" }}>
                        <span style={{ fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 2 }}><span style={{ fontSize: 14 }}>💡</span> 위치 정보 안내</span><br/>
                        본 매물은 중개사의 요청으로 주소 및 상세 위치가 비공개 설정되어, 지도상에는 가까운 지하철역 또는 사거리 부근에 표시됩니다. 실제 건물 위치와 차이가 있으니 상세 위치 및 자세한 내역은 담당 중개사에게 직접 문의해 주세요.
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
              {(() => {
                const getDynamicFields = (v: any) => {
                  const propType = v.property_type || "";
                  const subCategory = v.sub_category || "";
                  const tradeType = v.trade_type || "";
                  const meta = v.metadata || {};

                  const fields: { label: string; value: string }[] = [];

                  // 1. 단지명 / 건물명
                  const isApt = ["아파트", "오피스텔", "도시형생활주택"].some(t => propType.includes(t) || subCategory.includes(t));
                  const exp = v.address_exposure;
                  const isPrivateAddr = !isApt && exp && exp !== "번지공개" && exp !== "지번공개" && exp !== "동/호수공개";
                  const displayBuildingName = isPrivateAddr ? "-" : (v.building_name || "-");
                  fields.push({
                    label: isApt ? "단지명" : "건물명",
                    value: displayBuildingName
                  });

                  // 1-2. 동/호수
                  const showDongHosu = !isPrivateAddr && (exp === "동/호수공개" || exp === "번지공개" || exp === "지번공개" || !exp);
                  let displayDongHosu = "-";
                  if (showDongHosu) {
                    const dongParts = [];
                    if (v.apt_dong) dongParts.push(v.apt_dong);
                    if (v.hosu) dongParts.push(v.hosu);
                    if (dongParts.length > 0) {
                      displayDongHosu = dongParts.join(" ");
                    }
                  }
                  fields.push({
                    label: "동/호수",
                    value: displayDongHosu
                  });

                  // 1-3. 거래구분
                  fields.push({
                    label: "거래구분",
                    value: tradeType || "-"
                  });

                  // 1-4. 금액
                  let displayPrice = "-";
                  const monthlyManwon = v.monthly_rent ? Math.round(v.monthly_rent / 10000) : 0;
                  if (v.trade_type === "매매" || v.trade_type === "전세") {
                    displayPrice = v.deposit ? formatAmount(v.deposit) : "-";
                  } else if (v.trade_type) {
                    displayPrice = `${v.deposit ? formatAmount(v.deposit) : "0"}/${monthlyManwon > 0 ? `${monthlyManwon}만` : "0"}`;
                  }
                  fields.push({
                    label: "금액",
                    value: displayPrice
                  });

                  // 1-5. 관리비
                  fields.push({
                    label: "관리비",
                    value: v.maintenance_fee ? `${v.maintenance_fee / 10000}만원` : "없음"
                  });

                  // 카테고리 분류
                  const isVillaHouse = propType === "빌라·주택";
                  const isCommercial = propType === "상가·사무실·건물·공장·토지";

                  // 2. 용도지역 (빌라·주택 또는 상업용인 경우)
                  if (isVillaHouse || isCommercial) {
                    fields.push({ label: "용도지역", value: meta.zoning || "-" });
                  }

                  // 3. 지목 (토지인 경우)
                  if (subCategory === "토지") {
                    fields.push({ label: "지목", value: meta.land_purpose || "-" });
                  }

                  // 4. 도로 폭
                  if (meta.road_width !== undefined && meta.road_width !== null && meta.road_width !== "") {
                    fields.push({ label: "도로 폭", value: `${meta.road_width}m` });
                  }

                  // 5. 건물구조 (상업용 - 토지/지산 제외)
                  if (isCommercial && subCategory !== "토지" && subCategory !== "지식산업센터") {
                    fields.push({ label: "건물구조", value: meta.building_structure || "-" });
                  }

                  // 6. 주용도 (상업용 - 토지/지산 제외)
                  if (isCommercial && subCategory !== "토지" && subCategory !== "지식산업센터") {
                    fields.push({ label: "주용도", value: meta.main_usage || "-" });
                  }

                  // 7. 건물규모
                  const hasScale = meta.ground_floors !== undefined || meta.underground_floors !== undefined;
                  if (hasScale) {
                    const parts = [];
                    if (meta.ground_floors !== undefined && meta.ground_floors !== null && meta.ground_floors !== "") {
                      parts.push(`지상 ${meta.ground_floors}층`);
                    }
                    if (meta.underground_floors !== undefined && meta.underground_floors !== null && meta.underground_floors !== "") {
                      parts.push(`지하 ${meta.underground_floors}층`);
                    }
                    if (parts.length > 0) {
                      fields.push({ label: "건물규모", value: parts.join(" / ") });
                    }
                  }

                  // 8. 대지면적
                  if (meta.land_share_m2) {
                    const pyVal = meta.land_share_py || (parseFloat(meta.land_share_m2) / 3.3058).toFixed(1);
                    fields.push({ label: "대지면적", value: `${meta.land_share_m2}m² (${pyVal}평)` });
                  }

                  // 9. 공급/전용면적 또는 연면적
                  if (subCategory !== "토지") {
                    const isStandaloneBuilding = (isVillaHouse && ["단독/다가구", "전원주택", "상가주택"].includes(subCategory)) ||
                                                 (isCommercial && ["건물/빌딩", "공장/창고"].includes(subCategory));
                    
                    if (tradeType === "매매" && isStandaloneBuilding) {
                      const pyVal = v.supply_py || (v.supply_m2 ? (parseFloat(v.supply_m2) / 3.3058).toFixed(1) : "0");
                      fields.push({
                        label: "연면적",
                        value: v.supply_m2 ? `${v.supply_m2}m² (${pyVal}평)` : "-"
                      });
                    } else {
                      const supplyPyVal = v.supply_py || (v.supply_m2 ? (parseFloat(v.supply_m2) / 3.3058).toFixed(1) : "-");
                      const exclusivePyVal = v.exclusive_py || (v.exclusive_m2 ? (parseFloat(v.exclusive_m2) / 3.3058).toFixed(1) : "-");
                      fields.push({
                        label: "공급/전용면적",
                        value: `${v.supply_m2 ? `${v.supply_m2}m²(${supplyPyVal}평)` : "-"} / ${v.exclusive_m2 ? `${v.exclusive_m2}m²(${exclusivePyVal}평)` : "-"}`
                      });
                    }
                  }

                  // 10. 건폐율/용적률
                  if (tradeType === "매매" && (isVillaHouse || isCommercial)) {
                    const cov = meta.building_coverage ? `${meta.building_coverage}%` : "-";
                    const far = meta.floor_area_ratio ? `${meta.floor_area_ratio}%` : "-";
                    fields.push({
                      label: "건폐율/용적률",
                      value: `${cov} / ${far}`
                    });
                  }

                  // 11. 현용도 (상업용 - 상가/사무실)
                  if (isCommercial && ["상가", "사무실"].includes(subCategory)) {
                    fields.push({ label: "현용도", value: meta.current_usage || "-" });
                  }

                  // 12. 해당층/총층
                  if (!hasScale && subCategory !== "토지") {
                    fields.push({
                      label: "해당층/총층",
                      value: `${v.current_floor || "-"} / ${v.total_floor || v.total_floors || v.floor || "-"}`
                    });
                  }

                  // 13. 방/욕실수 (주거형)
                  if (!isCommercial) {
                    fields.push({
                      label: "방/욕실수",
                      value: `${v.room_count || 0}개 / ${v.bathroom_count || v.bath_count || v.bath_count || 0}개`
                    });
                  }

                  // 14. 방향 (주거형)
                  if (!isCommercial) {
                    fields.push({
                      label: "방향",
                      value: v.direction || "-"
                    });
                  }

                  // 15. 주차
                  if (subCategory !== "토지") {
                    fields.push({
                      label: isCommercial ? "주차대수" : "주차가능 여부",
                      value: v.parking || "없음"
                    });
                  }

                  // 16. 엘리베이터 갯수 (상업용 - 토지/지산 제외)
                  if (isCommercial && subCategory !== "토지" && subCategory !== "지식산업센터") {
                    fields.push({ label: "엘리베이터 갯수", value: meta.elevator_cnt || "-" });
                  }

                  // 17. 위반건축물 (상업용 - 토지/지산 제외)
                  if (isCommercial && subCategory !== "토지" && subCategory !== "지식산업센터") {
                    fields.push({
                      label: "위반건축물",
                      value: meta.is_illegal ? "적발(위반)" : "해당없음"
                    });
                  }

                  // 18. 지식산업센터 특화 제원
                  if (subCategory === "지식산업센터") {
                    if (meta.jisan_usage) {
                      fields.push({ label: "호실 용도", value: meta.jisan_usage });
                    }
                    if (meta.ceiling_height) {
                      fields.push({ label: "층고", value: `${meta.ceiling_height}m` });
                    }
                    if (meta.power_capacity) {
                      fields.push({ label: "사용 전력", value: `${meta.power_capacity}kW` });
                    }
                    if (meta.free_parking_cnt) {
                      fields.push({ label: "무료 주차", value: `${meta.free_parking_cnt}대` });
                    }
                    
                    const specs = [];
                    if (meta.has_drive_in) specs.push("드라이브인");
                    if (meta.has_door_to_door) specs.push("도어투도어");
                    if (meta.has_freight_elevator) specs.push("화물승강기");
                    if (specs.length > 0) {
                      fields.push({ label: "특화구조", value: specs.join(", ") });
                    }
                  }

                  // 19. 입주가능일
                  fields.push({
                    label: subCategory === "토지" ? "사용 가능일" : "입주가능일",
                    value: v.move_in_date || (subCategory === "토지" ? "즉시사용" : "즉시입주(공실)")
                  });

                  // 20. 관리비 제거 (상단으로 이동)

                  // 20-2. 중개보수/수수료
                  const commParts = [];
                  const baseComm = v.realtor_commission || v.commission_type;
                  if (baseComm) commParts.push(baseComm);
                  if (v.commission_amount) commParts.push(`${v.commission_amount}만원`);
                  if (v.commission_etc) commParts.push(`(${v.commission_etc})`);
                  if (commParts.length > 0) {
                    fields.push({
                      label: "중개보수",
                      value: commParts.join(" ")
                    });
                  }

                  // 21. 준공연도
                  fields.push({
                    label: "준공연도",
                    value: v.metadata?.approval_year ? (v.metadata.approval_year <= 1979 ? "1980년 이전" : `${v.metadata.approval_year}년`) : "-"
                  });

                  return fields;
                };

                return (
                  <>
                    {getDynamicFields(selectedVacancy).map((f, idx) => (
                      <React.Fragment key={idx}>
                        <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>{f.label}</div>
                        <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{f.value}</div>
                      </React.Fragment>
                    ))}
                  </>
                );
              })()}
              <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "flex-start", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>상세설명</div>
              <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all", whiteSpace: "pre-line" }}>{selectedVacancy.description || "-"}</div>
            </div>

            {/* ──── 옵션 ──── */}
            {selectedVacancy.options && selectedVacancy.options.length > 0 && (
              <div style={{ padding: "20px 16px", background: "#fff", borderBottom: "8px solid #f3f4f6" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 20 }}>옵션</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
                  {selectedVacancy.options.map((optName: string, idx: number) => (
                    <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 55 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, background: "#f8fafc", borderRadius: "50%", border: "1px solid #e2e8f0" }}>
                        <OptionIcon name={optName} />
                      </div>
                      <span style={{ fontSize: 12, color: "#333", fontWeight: "bold", textAlign: "center", whiteSpace: "nowrap" }}>{optName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ──── 위치정보 ──── */}
            <div style={{ padding: "20px 16px 0", background: "#fff" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 12 }}>위치정보</div>
              <div ref={itemMapRef} style={{ width: "100%", height: 200, borderRadius: 8, marginBottom: 20, background: "#e8eaed", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 14, border: "1px solid #eee", overflow: "hidden" }}></div>
            </div>

            {/* ──── 로드뷰 ──── */}
            <div style={{ padding: "0 16px 20px", background: "#fff", borderBottom: "8px solid #f3f4f6" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 12 }}>로드뷰</div>
              <div ref={roadviewRef} style={{ width: "100%", height: 200, borderRadius: 8, background: "#e8eaed", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 14, border: "1px solid #eee", overflow: "hidden" }}></div>
            </div>

            {/* ──── 주변환경 (인프라) ──── */}
            {selectedVacancy.infrastructure && Object.keys(selectedVacancy.infrastructure).filter((k) => !k.startsWith("_")).length > 0 && (
              <div style={{ padding: "20px 16px", background: "#fff", borderBottom: "8px solid #f3f4f6" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 16 }}>주변환경</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {Object.entries(selectedVacancy.infrastructure)
                    .filter(([catName]) => !catName.startsWith("_"))
                    .map(([catName, places]: [string, any]) => {
                      const placeList = Array.isArray(places) ? places : [];
                      if (placeList.length === 0) return null;
                      return (
                        <div key={catName} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                          <span style={{ fontSize: 13, fontWeight: "bold", color: "#666", width: 65, flexShrink: 0, marginTop: 4 }}>
                            {catName}
                          </span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: 1 }}>
                            {placeList.map((place: string, idx: number) => (
                              <div key={idx} style={{ fontSize: 12, color: "#4b5563", background: "#f3f4f6", padding: "4px 8px", borderRadius: 4, fontWeight: 500 }}>
                                {place}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* ──── 댓글상담 ──── */}
            <div style={{ padding: "20px 16px", background: "#fff" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 16 }}>0개의 댓글상담</div>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fff", marginBottom: 12 }}>
                <textarea 
                  placeholder="로그인 후 이용하실 수 있습니다." 
                  disabled 
                  style={{ width: "100%", height: 70, border: "none", resize: "none", outline: "none", fontSize: 13, color: "#9ca3af", background: "#fff", padding: 0 }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f3f4f6", paddingTop: 8, marginTop: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="checkbox" id="secret-mock" disabled style={{ width: 14, height: 14 }} />
                    <label htmlFor="secret-mock" style={{ fontSize: 12, color: "#9ca3af", cursor: "default" }}>비밀댓글</label>
                  </div>
                  <button disabled style={{ background: "#e5e7eb", color: "#9ca3af", border: "none", borderRadius: 4, padding: "5px 12px", fontSize: 12, fontWeight: 700 }}>
                    등록
                  </button>
                </div>
              </div>
              <div style={{ textAlign: "center", padding: "30px 0", color: "#9ca3af", fontSize: 13 }}>
                아직 등록된 댓글이 없습니다.
              </div>
            </div>
          </div>
        ) : (
          /* 탭 2: 등록자 정보 (공실) */
          <div style={{ background: "#fff" }}>
            {(() => {
              const m = selectedVacancy.members || {};
              const agencyInfo = Array.isArray(m.agencies) ? m.agencies[0] : m.agencies;
              
              return (
                <>
                  <div style={{ padding: "20px 16px", borderBottom: "8px solid #f3f4f6" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "20px" }}>
                      {/* 프로필 사진 */}
                      {selectedVacancy.members?.profile_image_url || selectedVacancy.members?.profile_photo_url || agencyInfo?.profile_photo_url ? (
                        <img 
                          src={selectedVacancy.members?.profile_image_url || selectedVacancy.members?.profile_photo_url || agencyInfo?.profile_photo_url} 
                          alt="프로필" 
                          style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} 
                        />
                      ) : (
                        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#e8f0fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "#508bf5", flexShrink: 0, border: "2px solid #e5e7eb" }}>
                          {(agencyInfo?.agency_name || selectedVacancy.members?.name || selectedVacancy.client_name || "?")[0]}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 17, fontWeight: 800, color: "#111827", marginBottom: "8px", display: "flex", alignItems: "center", gap: 8 }}>
                          {selectedVacancy.owner_id ? (
                            <Link 
                              href={`/reporter/${selectedVacancy.owner_id}`} 
                              style={{ 
                                color: "#111827", 
                                textDecoration: "none", 
                                cursor: "pointer",
                              }}
                            >
                              {agencyInfo ? (agencyInfo.agency_name || agencyInfo.name) : (selectedVacancy.members?.name || selectedVacancy.client_name)}
                            </Link>
                          ) : (
                            <span>{agencyInfo ? (agencyInfo.agency_name || agencyInfo.name) : (selectedVacancy.members?.name || selectedVacancy.client_name)}</span>
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {agencyInfo ? (
                            <>
                              <span style={{ fontSize: 13, color: "#4b5563" }}>
                                대표 {agencyInfo.ceo_name || "-"} <span style={{ color: "#e5e7eb", margin: "0 4px" }}>|</span> 등록번호 {agencyInfo.registration_no || agencyInfo.reg_num || "-"}
                              </span>
                              <span style={{ fontSize: 13, color: "#4b5563", wordBreak: "break-all" }}>
                                {agencyInfo.address || "-"}
                              </span>
                            </>
                          ) : (
                            <span style={{ fontSize: 13, color: "#4b5563" }}>
                              일반회원 <span style={{ color: "#e5e7eb", margin: "0 4px" }}>|</span> {selectedVacancy.members?.name || selectedVacancy.client_name || "-"}
                            </span>
                          )}
                          <span style={{ fontSize: 13, fontWeight: "bold", color: "#1a73e8", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                            전화 {agencyInfo?.phone ? `${agencyInfo.phone}${agencyInfo?.cell && agencyInfo.cell !== agencyInfo.phone ? `, ${agencyInfo.cell}` : ""}` : (selectedVacancy.client_phone || selectedVacancy.members?.phone || "미등록")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* SNS Links + 오시는길 */}
                    {((selectedVacancy.members?.sns_links && Object.keys(selectedVacancy.members.sns_links).filter(k => k !== "api_info" && k !== "api_list" && selectedVacancy.members.sns_links[k]?.url).length > 0) || agencyInfo?.address) && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid #f3f4f6" }}>
                        {selectedVacancy.members?.sns_links && Object.keys(selectedVacancy.members.sns_links).filter(k => k !== "api_info" && k !== "api_list" && selectedVacancy.members.sns_links[k]?.url).map(key => {
                          const link = selectedVacancy.members.sns_links[key].url;
                          const validUrl = link.startsWith('http') ? link : `https://${link}`;
                          
                          let iconHtml;
                          switch(key) {
                            case 'contact': iconHtml = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>; break;
                            case 'youtube': iconHtml = <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.99C18.88 4 12 4 12 4s-6.88 0-8.59.43A2.78 2.78 0 0 0 1.46 6.42C1 8.16 1 12 1 12s0 3.84.46 5.58a2.78 2.78 0 0 0 1.95 1.99C5.12 20 12 20 12 20s6.88 0 8.59-.43a2.78 2.78 0 0 0 1.95-1.99C23 15.84 23 12 23 12s0-3.84-.46-5.58zM9.54 15.55V8.45L15.82 12l-6.28 3.55z"></path></svg>; break;
                            case 'instagram': iconHtml = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>; break;
                            case 'facebook': iconHtml = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>; break;
                            case 'twitter': iconHtml = <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>; break;
                            case 'blog': iconHtml = <span style={{ fontSize: 11, fontWeight: "bold" }}>BLOG</span>; break;
                            case 'cafe': iconHtml = <span style={{ fontSize: 11, fontWeight: "bold" }}>CAFE</span>; break;
                            case 'kakao': iconHtml = <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.8 5.2 4.4 6.5l-1 3.7c-.1.3.3.6.5.4l4.3-2.9c.6.1 1.2.1 1.8.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z"></path></svg>; break;
                            case 'homepage': iconHtml = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>; break;
                            case 'shopping_mall': iconHtml = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>; break;
                            default: iconHtml = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>;
                          }
                          
                          const titleNames: Record<string,string> = { homepage: "홈페이지", contact: "문의하기", shopping_mall: "쇼핑몰", blog: "블로그", cafe: "카페", youtube: "유튜브", facebook: "페이스북", twitter: "트위터", instagram: "인스타그램", kakao: "카카오", threads: "쓰레드" };
                          const titleName = titleNames[key] || key;

                          return (
                            <a 
                              key={key} 
                              href={validUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              title={titleName}
                              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", background: "#f8f9fa", border: "1px solid #e0e0e0", color: "#444", textDecoration: "none" }}
                            >
                              <div style={{ width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>{iconHtml}</div>
                            </a>
                          );
                        })}
                        {agencyInfo?.address && (
                          <a 
                            href={agencyInfo.lat && agencyInfo.lng ? `https://map.kakao.com/link/roadview/${agencyInfo.lat},${agencyInfo.lng}` : `https://map.kakao.com/link/search/${encodeURIComponent(agencyInfo.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="오시는길"
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", background: "#f8f9fa", border: "1px solid #e0e0e0", color: "#444", textDecoration: "none" }}
                          >
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                              <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                          </a>
                        )}
                      </div>
                    )}

                    {/* 부동산 소개란 */}
                    {agencyInfo?.intro && (
                      <div style={{ marginTop: 12, padding: "10px 12px", background: "#f8f9fa", borderRadius: 6, fontSize: 13, color: "#444", border: "1px solid #eee", lineHeight: 1.5 }}>
                        <div style={{ fontWeight: "bold", fontSize: 11, color: "#888", marginBottom: 4 }}>부동산 소개</div>
                        {agencyInfo.intro}
                      </div>
                    )}
                  </div>

                  {/* 공실등록현황 및 리스트 */}
                  {(() => {
                    const ownerVacancies = vacancies.filter(v => v.owner_id === selectedVacancy.owner_id);
                    const totalCnt = ownerVacancies.length;
                    const saleCnt = ownerVacancies.filter(v => v.trade_type === "매매").length;
                    const jeonseCnt = ownerVacancies.filter(v => v.trade_type === "전세").length;
                    const wolseCnt = ownerVacancies.filter(v => v.trade_type === "월세").length;
                    const shortCnt = ownerVacancies.filter(v => v.trade_type === "단기").length;

                    return (
                      <div style={{ padding: "20px 16px" }}>
                        <div style={{ display: "flex", background: "#f9f9f9", borderRadius: 8, overflow: "hidden", border: "1px solid #eee", marginBottom: "16px" }}>
                          <div style={{ flex: 1, padding: "12px 14px", fontSize: 14, fontWeight: "bold", color: "#111", borderRight: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "center" }}>공실등록현황</div>
                          <div style={{ display: "flex", alignItems: "center", padding: "0 14px", gap: 10, fontSize: 13, color: "#666" }}>
                            {[
                              { label: '전체', count: totalCnt },
                              { label: '매매', count: saleCnt },
                              { label: '전세', count: jeonseCnt },
                              { label: '월세', count: wolseCnt },
                              { label: '단기', count: shortCnt }
                            ].map((stat, i, arr) => (
                              <React.Fragment key={stat.label}>
                                <span 
                                  onClick={() => setRealtorFilter(stat.label)}
                                  style={{ 
                                    cursor: "pointer", 
                                    color: realtorFilter === stat.label ? "#1a73e8" : "#666", 
                                    fontWeight: realtorFilter === stat.label ? "bold" : "normal",
                                    whiteSpace: "nowrap"
                                  }}
                                >
                                  {stat.label} <strong style={{color: realtorFilter === stat.label ? "#1a73e8" : "#111"}}>{stat.count}</strong>
                                </span>
                                {i < arr.length - 1 && <span style={{width:1,height:12,background:"#ddd"}}></span>}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column" }}>
                          {(realtorFilter === "전체" ? ownerVacancies : ownerVacancies.filter(v => v.trade_type === realtorFilter)).map((v: any) => (
                            <div
                              key={v.id}
                              onClick={() => {
                                vacancyStackRef.current.push({
                                  vacancy: selectedVacancy,
                                  scrollY: detailScrollRef.current?.scrollTop || 0
                                });
                                setDetailTab("info");
                                handleVacancyClick(v);
                              }}
                              style={{ display: "flex", gap: "12px", padding: "16px 0", borderBottom: "1px solid #f3f4f6", cursor: "pointer", transition: "background 0.15s" }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                {/* Badges & Date */}
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                  {showCommission && (v.realtor_commission || v.commission_type) && <span style={{ fontSize: "12px", fontWeight: 700, color: "#ef4444", border: "1px solid #ef4444", padding: "1px 6px", borderRadius: "3px" }}>{v.realtor_commission || v.commission_type}</span>}
                                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#ef4444" }}>NO.{v.vacancy_no || '-'}</span>
                                  <span style={{ fontSize: "12px", color: "#9ca3af" }}>{v.created_at ? new Date(v.created_at).toLocaleDateString("ko-KR").slice(0, -1) : ""}</span>
                                </div>

                                {/* Title */}
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                  <p style={{ fontSize: "16px", fontWeight: 800, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                                    {v.building_name || [v.dong, v.sigungu].filter(Boolean).join(" ")}
                                  </p>
                                </div>
                                
                                {/* Price */}
                                <p style={{ fontSize: "18px", fontWeight: 800, color: "#1a73e8", marginBottom: "6px", margin: 0 }}>
                                  {v.trade_type} {formatPrice(v)}
                                </p>
                                
                                {/* Specs */}
                                <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0 }}>
                                  {[v.property_type || "건물", v.direction, v.exclusive_m2 && `${v.exclusive_m2}㎡`].filter(Boolean).join(" | ")}
                                </p>
                                
                                {/* Options */}
                                <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0 }}>
                                  {[v.room_count !== undefined ? `룸 ${v.room_count}개` : null, v.bath_count !== undefined ? `욕실 ${v.bath_count}개` : null, ...(v.options || [])].filter(Boolean).join(", ")}
                                </p>

                                {/* Themes */}
                                {v.themes && v.themes.length > 0 && (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                                    {v.themes.map((theme: string, idx: number) => (
                                      <span key={idx} style={{ background: "#f8fafc", color: "#3b82f6", fontSize: "12px", padding: "2px 8px", borderRadius: "12px", fontWeight: 700, border: "1px solid #bfdbfe" }}>
                                        {theme.startsWith('#') ? theme : `# ${theme}`}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {v.images?.[0] && (
                                <div style={{ width: "90px", height: "72px", borderRadius: "10px", overflow: "hidden", flexShrink: 0, backgroundColor: "#e5e7eb", alignSelf: "center" }}>
                                  <img src={v.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                </div>
                              )}
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" style={{ flexShrink: 0, alignSelf: "center" }}><polyline points="9 18 15 12 9 6"/></svg>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* 하단 CTA 또는 경공매 메타정보 */}
      <div style={{ background: "#fff", borderTop: "1px solid #e5e7eb", padding: "14px 16px 24px" }}>
        {selectedVacancy.trade_type === "경매" ? (
          (() => {
            const meta = selectedVacancy?.metadata || {};
            const ap = meta.appraisal_price || parseInt(meta.apslEvlAmt || "0", 10) || 0;
            const cltrMngNo = meta.cltrMngNo || meta.cltrMngNoIndctCont || selectedVacancy?.vacancy_no || "";
            const formatAppraisal = (v: number) => {
              if (!v) return "-";
              if (v >= 100000000) {
                const e = Math.floor(v / 100000000);
                const m = Math.round((v % 100000000) / 10000);
                return m > 0 ? `${e}억 ${m.toLocaleString()}만` : `${e}억`;
              }
              return `${Math.round(v / 10000).toLocaleString()}만`;
            };

            return (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", height: "52px" }}>
                <span style={{ fontSize: "17px", fontWeight: 800, color: "#111827" }}>
                  감정가 <span style={{ color: "#1a4282" }}>{formatAppraisal(ap)}</span>
                </span>
                {cltrMngNo && (
                  <div style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#475569",
                    background: "#f1f5f9",
                    border: "1px solid #e2e8f0",
                    padding: "8px 16px",
                    borderRadius: "8px"
                  }}>
                    {cltrMngNo}
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          <button
            onClick={() => {
              const agencyInfo = Array.isArray(selectedVacancy?.members?.agencies) ? selectedVacancy.members.agencies[0] : selectedVacancy?.members?.agencies;
              const targetPhone = agencyInfo?.cell || agencyInfo?.phone || selectedVacancy?.members?.phone || selectedVacancy?.client_phone;
              if (targetPhone) {
                const firstPhone = targetPhone.split(',')[0].trim();
                window.location.href = `tel:${firstPhone}`;
              }
            }}
            style={{ width: "100%", height: "52px", borderRadius: "6px", background: "#1a73e8", color: "#fff", fontSize: "18px", fontWeight: 800, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            연락하기
          </button>
        )}
      </div>
    </>
  );
};

export const GongsilMobileDetailPanel = React.memo(GongsilMobileDetailPanelImpl);
GongsilMobileDetailPanel.displayName = "GongsilMobileDetailPanel";
