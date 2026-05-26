"use client";

import React, { useEffect, useRef } from "react";
import { formatAmount } from "./page";
import { getAuctionInfo } from "@/app/(map)/gongsil/gongsilHelpers";

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
  const detailAddr = selectedVacancy.building_name || [selectedVacancy.dong, selectedVacancy.sigungu].filter(Boolean).join(" ");

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
            // 일반 공실 매물 전용 헤더 뷰 (기존 폼 절대 유지)
            <div style={{ borderBottom: "1px solid #f3f4f6", paddingBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#ef4444" }}>NO.{selectedVacancy.vacancy_no || '-'}</span>
                <span style={{ fontSize: "12px", color: "#ef4444", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "2px" }}>
                  <span style={{ display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#ef4444" }}></span>
                  허위공실광고신고
                </span>
              </div>
              <h1 style={{ fontSize: "20px", fontWeight: 800, color: detailMasked ? "#bbb" : "#111827", lineHeight: 1.4, letterSpacing: detailMasked ? 1.5 : 0, margin: "0 0 8px" }}>
                {detailMasked ? (detailAddr || "주소 없음").replace(/[^\s]/g, "X") : detailAddr}
              </h1>
              <p style={{ fontSize: "26px", fontWeight: 800, color: "#1a73e8", margin: 0 }}>
                {selectedVacancy.trade_type} {formatPrice(selectedVacancy)}
              </p>
            </div>
          )}

          {/* 중개보수 혜택 공실 전용 배너 */}
          {selectedVacancy.trade_type !== "경매" && showCommission && (selectedVacancy.realtor_commission || selectedVacancy.commission_type) && (
            <div style={{ marginTop: "16px", background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: "8px", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "14px", color: "#b91c1c", fontWeight: 800 }}>부동산 중개 회원 특별 혜택</span>
              <span style={{ fontSize: "15px", color: "#ef4444", fontWeight: 800, background: "#fff", padding: "2px 8px", borderRadius: "4px", border: "1px solid #fecaca" }}>{selectedVacancy.realtor_commission || selectedVacancy.commission_type}</span>
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
              <button onClick={() => setDetailTab("info")} style={{ flex: 1, padding: "14px", fontSize: "15px", fontWeight: detailTab === "info" ? 800 : 500, color: detailTab === "info" ? "#1a73e8" : "#6b7280", borderBottom: detailTab === "info" ? "3px solid #1a73e8" : "3px solid transparent", background: "none", border: "none", cursor: "pointer" }}>
                공실광고정보
              </button>
              <button onClick={() => setDetailTab("realtor")} style={{ flex: 1, padding: "14px", fontSize: "15px", fontWeight: detailTab === "realtor" ? 800 : 500, color: detailTab === "realtor" ? "#1a73e8" : "#6b7280", borderBottom: detailTab === "realtor" ? "3px solid #1a73e8" : "3px solid transparent", background: "none", border: "none", cursor: "pointer" }}>
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
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#222", marginBottom: 12 }}>📍 위치정보</div>
                      <div ref={itemMapRef} style={{ width: "100%", height: 200, borderRadius: 8, marginBottom: 20, background: "#e8eaed", border: "1px solid #eee", overflow: "hidden" }}></div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#222", marginBottom: 12 }}>🛣️ 로드뷰</div>
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
                        본 정보는 한국자산관리공사(KAMCO) 온비드 API를 통해 실시간으로 제공받는 참고용 데이터입니다. 시세, 매물 정보 및 관련 권리관계 데이터는 실시간 변동 또는 지연이 있을 수 있으므로, <strong>입찰 전 반드시 공식 온비드 홈페이지 및 해당 집행기관(법원/신탁사 등)의 공고를 최종 확인</strong>하신 후 진행하시기 바랍니다. 공실뉴스는 단순 정보 제공처로서 데이터의 정확성을 보장하지 않으며, 제공된 정보에 의존하여 행해진 결정이나 거래 결과에 대해 어떠한 법적 책임도 지지 않습니다.
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
            {/* 용도 / 기본 스펙 */}
            <div style={{ padding: "20px 16px", background: "#fff", marginBottom: "8px", borderBottom: "1px solid #f3f4f6" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#111827", margin: "0 0 14px" }}>기본 정보</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <span style={{ fontSize: "13px", color: "#6b7280", display: "block" }}>물건용도</span>
                  <span style={{ fontSize: "15px", color: "#1f2937", fontWeight: 700 }}>{selectedVacancy.property_type || "미선언"}</span>
                </div>
                <div>
                  <span style={{ fontSize: "13px", color: "#6b7280", display: "block" }}>방향</span>
                  <span style={{ fontSize: "15px", color: "#1f2937", fontWeight: 700 }}>{selectedVacancy.direction || "남향"}</span>
                </div>
                <div>
                  <span style={{ fontSize: "13px", color: "#6b7280", display: "block" }}>전용면적</span>
                  <span style={{ fontSize: "15px", color: "#1f2937", fontWeight: 700 }}>
                    {selectedVacancy.exclusive_m2 ? `${selectedVacancy.exclusive_m2}㎡` : selectedVacancy.exclusive_area ? `${selectedVacancy.exclusive_area}㎡` : "-"}
                    {(selectedVacancy.exclusive_m2 || selectedVacancy.exclusive_area) && (
                      <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: "normal", marginLeft: "4px" }}>
                        ({Math.round((selectedVacancy.exclusive_m2 || selectedVacancy.exclusive_area || 0) / 3.3058)}평)
                      </span>
                    )}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "13px", color: "#6b7280", display: "block" }}>해당층 / 전체층</span>
                  <span style={{ fontSize: "15px", color: "#1f2937", fontWeight: 700 }}>{selectedVacancy.floor || "1"}층 / {selectedVacancy.total_floors || "-"}층</span>
                </div>
              </div>
            </div>

            {/* 옵션 항목들 (공실 전용) */}
            {selectedVacancy.options && selectedVacancy.options.length > 0 && (
              <div style={{ padding: "20px 16px", background: "#fff", marginBottom: "8px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#111827", margin: "0 0 14px" }}>옵션 및 시설</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
                  {selectedVacancy.options.map((opt: string, i: number) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px", background: "#f8fafc", borderRadius: "8px" }}>
                      <OptionIcon name={opt} />
                      <span style={{ fontSize: "12px", color: "#475569", fontWeight: 700, marginTop: "6px" }}>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 지도 및 위치 정보 */}
            <div style={{ padding: "20px 16px", background: "#fff", marginBottom: "8px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#111827", margin: "0 0 14px" }}>위치 및 주변 정보</h3>
              <div ref={itemMapRef} style={{ width: "100%", height: "180px", borderRadius: "10px", overflow: "hidden", backgroundColor: "#e5e7eb", marginBottom: "12px" }}></div>
              <div ref={roadviewRef} style={{ width: "100%", height: "180px", borderRadius: "10px", overflow: "hidden", backgroundColor: "#e5e7eb" }}></div>
            </div>

            {/* 상세 설명 */}
            <div style={{ padding: "20px 16px", background: "#fff" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#111827", margin: "0 0 10px" }}>상세 설명</h3>
              <p style={{ fontSize: "14.5px", color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>
                {selectedVacancy.description || "상세 정보가 등록되지 않은 매물입니다."}
              </p>
            </div>
          </div>
        ) : (
          /* 탭 2: 등록자 정보 (공실) */
          <div style={{ padding: "20px 16px", background: "#fff" }}>
            {/* 일반 공실 매물 전용 등록자 뷰 (기존 폼 완벽 유지) */}
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#111827", margin: "0 0 16px" }}>등록자(중개업소) 정보</h3>
              {(() => {
                const m = selectedVacancy.members || {};
                const agencyInfo = Array.isArray(m.agencies) ? m.agencies[0] : m.agencies;
                
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {agencyInfo ? (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          {agencyInfo.profile_photo_url ? (
                            <div style={{ width: "60px", height: "60px", borderRadius: "50%", overflow: "hidden" }}>
                              <img src={agencyInfo.profile_photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                          ) : (
                            <div style={{ width: "60px", height: "60px", borderRadius: "50%", backgroundColor: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            </div>
                          )}
                          <div>
                            <p style={{ fontSize: "17px", fontWeight: 800, color: "#111827", margin: 0 }}>{agencyInfo.agency_name || "중개업소"}</p>
                            <p style={{ fontSize: "13px", color: "#6b7280", margin: "2px 0 0" }}>대표자: {agencyInfo.ceo_name || "-"}</p>
                          </div>
                        </div>
                        <div style={{ background: "#f9fafb", borderRadius: "8px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px", color: "#4b5563" }}>
                          <p style={{ margin: 0 }}><b>등록번호:</b> {agencyInfo.registration_no || "-"}</p>
                          <p style={{ margin: 0 }}><b>소재지:</b> {agencyInfo.address || "-"}</p>
                          <p style={{ margin: 0 }}><b>연락처:</b> {agencyInfo.phone || m.phone || "-"}</p>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "50px", height: "50px", borderRadius: "50%", backgroundColor: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                        <div>
                          <p style={{ fontSize: "16px", fontWeight: 800, color: "#111827", margin: 0 }}>개인 등록 매물 (소유주 직접)</p>
                          <p style={{ fontSize: "13px", color: "#6b7280", margin: "2px 0 0" }}>공실뉴스 플랫폼을 통해 소유주가 직접 업로드한 안전한 공실 매물입니다.</p>
                        </div>
                      </div>
                    )}
                    
                    {/* 공실등록현황 및 리스트 */}
                    {(() => {
                      const ownerVacancies = vacancies.filter(v => v.owner_id === selectedVacancy.owner_id);
                      const totalCnt = ownerVacancies.length;
                      const saleCnt = ownerVacancies.filter(v => v.trade_type === "매매").length;
                      const jeonseCnt = ownerVacancies.filter(v => v.trade_type === "전세").length;
                      const wolseCnt = ownerVacancies.filter(v => v.trade_type === "월세").length;
                      const shortCnt = ownerVacancies.filter(v => v.trade_type === "단기").length;

                      return (
                        <>
                          <div style={{ background: "#f9fafb", borderRadius: "8px", padding: "16px", display: "flex", alignItems: "center", marginBottom: "16px" }}>
                            <div style={{ fontSize: "16px", fontWeight: 800, color: "#111827", marginRight: "20px" }}>공실등록현황</div>
                            <div style={{ display: "flex", flex: 1, justifyContent: "space-between", fontSize: "14px", color: "#6b7280" }}>
                              <span onClick={() => setRealtorFilter("전체")} style={{ cursor: "pointer", color: realtorFilter === "전체" ? "#1a73e8" : "inherit", fontWeight: realtorFilter === "전체" ? 700 : "normal" }}>전체 <b style={{ color: realtorFilter === "전체" ? "#1a73e8" : "#111827" }}>{totalCnt}</b></span>
                              <span onClick={() => setRealtorFilter("매매")} style={{ cursor: "pointer", color: realtorFilter === "매매" ? "#1a73e8" : "inherit", fontWeight: realtorFilter === "매매" ? 700 : "normal" }}>매매 <b style={{ color: realtorFilter === "매매" ? "#1a73e8" : "#111827" }}>{saleCnt}</b></span>
                              <span onClick={() => setRealtorFilter("전세")} style={{ cursor: "pointer", color: realtorFilter === "전세" ? "#1a73e8" : "inherit", fontWeight: realtorFilter === "전세" ? 700 : "normal" }}>전세 <b style={{ color: realtorFilter === "전세" ? "#1a73e8" : "#111827" }}>{jeonseCnt}</b></span>
                              <span onClick={() => setRealtorFilter("월세")} style={{ cursor: "pointer", color: realtorFilter === "월세" ? "#1a73e8" : "inherit", fontWeight: realtorFilter === "월세" ? 700 : "normal" }}>월세 <b style={{ color: realtorFilter === "월세" ? "#1a73e8" : "#111827" }}>{wolseCnt}</b></span>
                              <span onClick={() => setRealtorFilter("단기")} style={{ cursor: "pointer", color: realtorFilter === "단기" ? "#1a73e8" : "inherit", fontWeight: realtorFilter === "단기" ? 700 : "normal" }}>단기 <b style={{ color: realtorFilter === "단기" ? "#1a73e8" : "#111827" }}>{shortCnt}</b></span>
                            </div>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column" }}>
                            {(realtorFilter === "전체" ? ownerVacancies : ownerVacancies.filter(v => v.trade_type === realtorFilter)).map((v: any) => (
                              <div
                                key={v.id}
                                className="v-card"
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
                                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#ef4444" }}>{v.vacancy_no || '-'}</span>
                                    <span style={{ fontSize: "12px", color: "#9ca3af" }}>{v.created_at ? new Date(v.created_at).toLocaleDateString("ko-KR").slice(0, -1) : ""}</span>
                                  </div>

                                  {/* Title */}
                                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                    <p style={{ fontSize: "16px", fontWeight: 800, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {v.building_name || [v.dong, v.sigungu].filter(Boolean).join(" ")}
                                    </p>
                                  </div>
                                  
                                  {/* Price */}
                                  <p style={{ fontSize: "18px", fontWeight: 800, color: "#1a73e8", marginBottom: "6px" }}>
                                    {v.trade_type} {formatPrice(v)}
                                  </p>
                                  
                                  {/* Specs */}
                                  <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {[v.property_type || "건물", v.direction, v.exclusive_m2 && `${v.exclusive_m2}㎡`].filter(Boolean).join(" | ")}
                                  </p>
                                  
                                  {/* Options */}
                                  <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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
                        </>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* 하단 CTA */}
      <div style={{ background: "#fff", borderTop: "1px solid #e5e7eb", padding: "14px 16px 24px" }}>
        <button
          onClick={() => {
            const agencyInfo = Array.isArray(selectedVacancy?.members?.agencies) ? selectedVacancy.members.agencies[0] : selectedVacancy?.members?.agencies;
            const targetPhone = agencyInfo?.cell || agencyInfo?.phone || selectedVacancy?.members?.phone || selectedVacancy?.client_phone;
            if (targetPhone) {
              const firstPhone = targetPhone.split(',')[0].trim();
              window.location.href = `tel:${firstPhone}`;
            }
          }}
          style={{ width: "100%", height: "52px", borderRadius: "6px", background: selectedVacancy.trade_type === "경매" ? "#1a4282" : "#1a73e8", color: "#fff", fontSize: "18px", fontWeight: 800, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          연락하기
        </button>
      </div>
    </>
  );
};

export const GongsilMobileDetailPanel = React.memo(GongsilMobileDetailPanelImpl);
GongsilMobileDetailPanel.displayName = "GongsilMobileDetailPanel";
