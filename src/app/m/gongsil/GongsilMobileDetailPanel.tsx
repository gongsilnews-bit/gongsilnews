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
  activeMode: "Í≥µÏã§" | "Í≤ΩÎß§";
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

// ?µÏÖò ?ÑÏù¥ÏΩ??¨Ìçº
const OptionIcon = ({ name }: { name: string }) => {
  const sz = 24;
  const str = 1.8;
  switch (name) {
    case "?êÏñ¥Ïª?: return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="8" rx="2"/><path d="M7 14v4"/><path d="M17 14v4"/><path d="M12 14v4"/></svg>;
    case "Ïπ®Î?": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>;
    case "?ÑÏñ¥??: case "?ÑÏûê?ÑÏñ¥??: return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
    case "?ÑÏûê?åÏ?": case "?ÑÏûê?àÏù∏ÏßÄ": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="12" rx="2"/><path d="M17 10h.01"/><path d="M17 14h.01"/><path d="M7 12h5"/></svg>;
    case "ÎπÑÎç∞": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z"/><path d="M7 12.5L10 15.5L17 8.5"/></svg>;
    case "TV": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>;
    case "?∑Ïû•": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M12 2v20"/><path d="M8 12h.01"/><path d="M16 12h.01"/></svg>;
    case "?∏ÌÉÅÍ∏?: return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="13" r="5"/><path d="M8 6h.01"/><path d="M10 6h.01"/></svg>;
    case "?âÏû•Í≥?: return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M5 10h14"/><path d="M9 14v2"/><path d="M9 5v2"/></svg>;
    case "Í∞Ä?§Î†à?∏Ï?": case "?∏Îçï??: return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 10h16"/><circle cx="8" cy="15" r="2"/><circle cx="16" cy="15" r="2"/></svg>;
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
  const detailMasked = selectedVacancy.exposure_type === 'Î∂Ä?ôÏÇ∞?∏Ï∂ú' && userLevel < 2 && !isMyProperty;
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
        {/* ?¥Î?ÏßÄ ?¨Îùº?¥Îçî (Îß??ÑÎ°ú ?¥Îèô) */}
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
                <button onClick={(e) => { e.stopPropagation(); setGalleryIndex(Math.max(0, galleryIndex - 1)); }} style={{ position: "absolute", top: "50%", left: 0, transform: "translateY(-50%)", background: "rgba(0,0,0,0.3)", color: "#fff", border: "none", fontSize: "20px", padding: "12px 8px", cursor: "pointer", borderRadius: "0 4px 4px 0" }}>??/button>
                <button onClick={(e) => { e.stopPropagation(); setGalleryIndex(Math.min(selectedVacancy.images.length - 1, galleryIndex + 1)); }} style={{ position: "absolute", top: "50%", right: 0, transform: "translateY(-50%)", background: "rgba(0,0,0,0.3)", color: "#fff", border: "none", fontSize: "20px", padding: "12px 8px", cursor: "pointer", borderRadius: "4px 0 0 4px" }}>??/button>
                <div style={{ position: "absolute", bottom: "12px", right: "12px", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: "11px", fontWeight: 600, padding: "4px 10px", borderRadius: "20px" }}>
                  {galleryIndex + 1} / {selectedVacancy.images.length}
                </div>
              </>
            )}
          </div>
        )}

        {/* ?ÅÎã® ?µÏã¨ ?ïÎ≥¥ ?ÅÏó≠ */}
        <div style={{ padding: "20px 16px", background: "#fff" }}>
          {selectedVacancy.trade_type === "Í≤ΩÎß§" ? (
            // ?î® Î≤ïÏõê Í≤ΩÍ≥µÎß?Î™®Î∞î??Î™ÖÌíà ?§Îçî Î∑?(1Î≤àÏß∏ ?§ÌÅ¨Î¶∞ÏÉ∑ ?ÑÎ≤Ω ?¨ÌòÑ)
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
                    return m > 0 ? `${e}??${m.toLocaleString()}Îß? : `${e}??;
                  }
                  return `${Math.round(v / 10000).toLocaleString()}Îß?;
                };

                const lowestBidText = meta.lowstBidPrcIndctCont === "ÎπÑÍ≥µÍ∞? ? "ÎπÑÍ≥µÍ∞? : lo > 0 ? fmtP(lo) : "-";

                return (
                  <>
                    {/* Î±ÉÏ? & ?†Í≥† */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 800, color: "#1a4282", border: "1px solid #1a4282", padding: "2px 8px", borderRadius: "4px", background: "#f0f4fa" }}>
                          {getAuctionInfo(selectedVacancy).category || "Î∂Ä?ôÏÇ∞"} Í≥µÎß§
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
                          ?àÏúÑÍ≥µÏã§Í¥ëÍ≥†?†Í≥†
                        </span>
                      </div>
                    </div>

                    {/* Ï£ºÏÜå ?Ä?¥Ì? */}
                    <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#111827", lineHeight: 1.35, margin: "0 0 12px" }}>
                      {detailAddr}
                    </h1>

                    {/* ?î® ?Ä?úÎãò Í∏∞Ìöç ÏßÄÏπ? ?ÑÎ¶¨ÎØ∏ÏóÑ Í∞êÏ†ïÍ∞Ä/ÏµúÏ?Í∞Ä/?ºÏ†ï/Ï¢ÖÎ•ò/?†Ï∞∞?üÏàò Í≥†Î????Ä?úÎ≥¥??*/}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px", background: "#f8fafc", padding: "14px 16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                      {/* Row 1: Í∞êÏ†ï?âÍ???& ÏµúÏ??ÖÏ∞∞Í∞Ä */}
                      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                          <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>Í∞êÏ†ï?âÍ???/span>
                          <span style={{ fontSize: "17px", color: "#1a4282", fontWeight: 800 }}>{fmtP(ap)}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                          <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>ÏµúÏ??ÖÏ∞∞Í∞Ä</span>
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
                              {isUp ? "?? : "??}{diffRate}%
                            </span>
                          );
                        })()}
                      </div>

                      {/* Divider */}
                      <div style={{ height: "1px", background: "#e2e8f0" }}></div>

                      {/* Row 2: ?ÖÏ∞∞?ºÏ†ï, Ï¢ÖÎ•ò, ?†Ï∞∞?üÏàò */}
                      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>?ÖÏ∞∞?úÏûë</span>
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
                          <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>?†Ï∞∞</span>
                          <span style={{ fontSize: "14px", color: "#1e293b", fontWeight: 800 }}>{pbctCnt}??/span>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            // ?ºÎ∞ò Í≥µÏã§ Îß§Î¨º ?ÑÏö© ?§Îçî Î∑?(??Î≤àÏß∏ ?§ÌÅ¨Î¶∞ÏÉ∑ ?ÑÎ≤Ω ?Ä??
            <div style={{ borderBottom: "1px solid #f3f4f6", paddingBottom: "16px" }}>
              {/* Row 1: Date, Report, List */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {showCommission && (selectedVacancy.realtor_commission || selectedVacancy.commission_type) && (
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#ef4444", border: "1px solid #ef4444", padding: "2px 8px", borderRadius: "4px" }}>
                      {selectedVacancy.realtor_commission || selectedVacancy.commission_type || "Í≥µÎèôÏ§ëÍ∞ú"}
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
                    ?àÏúÑÍ≥µÏã§Í¥ëÍ≥†?†Í≥†
                  </span>
                  <span onClick={goBack} style={{ fontSize: "12px", color: "#666", display: "inline-flex", alignItems: "center", gap: "3px", cursor: "pointer", fontWeight: "bold" }}>
                    Î™©Î°ù
                  </span>
                </div>
              </div>

              {/* Row 2: Title */}
              <h1 style={{ fontSize: "20px", fontWeight: 800, color: detailMasked ? "#bbb" : "#111827", lineHeight: 1.4, letterSpacing: detailMasked ? 1.5 : 0, margin: "0 0 8px" }}>
                {detailMasked ? (detailAddr || "Ï£ºÏÜå ?ÜÏùå").replace(/[^\s]/g, "X") : detailAddr}
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
                        <button onClick={() => { handleKakaoShare(); setShowShareDropdown(false); }} style={{ width: "100%", padding: "10px 12px", background: "none", border: "none", textAlign: "left", fontSize: "13px", cursor: "pointer", borderBottom: "1px solid #eee", color: "#333" }}>Ïπ¥Ïπ¥?§ÌÜ° Í≥µÏú†</button>
                        <button onClick={() => { handleCopyUrl(); setShowShareDropdown(false); }} style={{ width: "100%", padding: "10px 12px", background: "none", border: "none", textAlign: "left", fontSize: "13px", cursor: "pointer", color: "#333" }}>URL Î≥µÏÇ¨</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 4: Specs Line 1 */}
              <div style={{ fontSize: "13px", color: "#666", marginBottom: "6px" }}>
                {[
                  selectedVacancy.property_type || "Í±¥Î¨º",
                  selectedVacancy.direction,
                  (selectedVacancy.supply_m2 || selectedVacancy.exclusive_m2) && `Í≥µÍ∏â/?ÑÏö© Î©¥Ï†Å: ${selectedVacancy.supply_m2 ? `${selectedVacancy.supply_m2}m¬≤` : "-"} / ${selectedVacancy.exclusive_m2 ? `${selectedVacancy.exclusive_m2}m¬≤` : "-"}`
                ].filter(Boolean).join(" | ")}
              </div>

              {/* Row 5: Specs Line 2 */}
              <div style={{ fontSize: "13px", color: "#666", marginBottom: "8px" }}>
                {[
                  selectedVacancy.room_count !== undefined && `Î∞?${selectedVacancy.room_count}Í∞?,
                  selectedVacancy.parking && (selectedVacancy.parking.includes("Ï£ºÏ∞®") ? selectedVacancy.parking : `Ï£ºÏ∞® ${selectedVacancy.parking}?¨Ìï®`),
                  selectedVacancy.options && selectedVacancy.options.length > 0 && selectedVacancy.options.slice(0, 3).join(", ")
                ].filter(Boolean).join(" | ")}
              </div>

            </div>
          )}
        </div>

        {/* ??Íµ¨Ï°∞ */}
        <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", background: "#fff", position: "sticky", top: "0px", zIndex: 9 }}>
          {selectedVacancy.trade_type === "Í≤ΩÎß§" ? (
            <>
              {([
                { key: "auction_detail", label: "?∏Î??ïÎ≥¥" },
                { key: "auction_property", label: "?¨ÏÇ∞?ïÎ≥¥" },
                { key: "auction_bid", label: "?ÖÏ∞∞?ïÎ≥¥" },
                { key: "auction_market", label: "?∏Í∑º?úÏÑ∏" },
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
                Í≥µÏã§Í¥ëÍ≥†?ïÎ≥¥
              </button>
              <button onClick={() => setDetailTab("realtor")} style={{ flex: 1, padding: "14px", fontSize: "15px", fontWeight: detailTab === "realtor" ? 800 : 500, color: detailTab === "realtor" ? "#111827" : "#6b7280", borderBottom: detailTab === "realtor" ? "3px solid #111827" : "3px solid transparent", background: "none", border: "none", cursor: "pointer" }}>
                ?±Î°ù?êÏ†ïÎ≥?
              </button>
            </>
          )}
        </div>

        {selectedVacancy.trade_type === "Í≤ΩÎß§" ? (
          <div>
            {/* ?∏Î??ïÎ≥¥ ??*/}
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
                    {/* Î©¥Ï†Å?ïÎ≥¥ */}
                    <div style={{ padding: "20px 16px 16px" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#1a4282", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>??Î©¥Ï†Å?ïÎ≥¥</div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: "#f4f6fa" }}>
                            <th style={{ padding: "10px 12px", borderBottom: "1px solid #e0e0e0", color: "#555", fontWeight: 700, textAlign: "center" }}>?©ÎèÑ</th>
                            <th style={{ padding: "10px 12px", borderBottom: "1px solid #e0e0e0", color: "#555", fontWeight: 700, textAlign: "center" }}>Î©¥Ï†Å</th>
                            <th style={{ padding: "10px 12px", borderBottom: "1px solid #e0e0e0", color: "#555", fontWeight: 700, textAlign: "center" }}>ÎπÑÍ≥†</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ldSqms && (
                            <tr>
                              <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee", textAlign: "center", color: "#333" }}>?†Ï?(?Ä)</td>
                              <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee", textAlign: "center", color: "#333" }}>{parseFloat(ldSqms).toLocaleString()}??/td>
                              <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee", textAlign: "center", color: "#888" }}>ÏßÄÎ™? {ldKnd}</td>
                            </tr>
                          )}
                          {bldSqms && (
                            <tr>
                              <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee", textAlign: "center", color: "#333" }}>Í±¥Î¨º(Í±¥Î¨º)</td>
                              <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee", textAlign: "center", color: "#333" }}>{parseFloat(bldSqms).toLocaleString()}??/td>
                              <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee", textAlign: "center", color: "#888" }}>-</td>
                            </tr>
                          )}
                          {!ldSqms && !bldSqms && (
                            <tr>
                              <td colSpan={3} style={{ padding: "10px 12px", textAlign: "center", color: "#aaa" }}>
                                Î©¥Ï†Å ?ïÎ≥¥ ?ÜÏùå
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {/* ÏßÄ??*/}
                    <div style={{ padding: "0 16px 16px" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#1a4282", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>??ÏßÄ??/div>
                      <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", border: "1px solid #eee", borderRadius: 6, overflow: "hidden" }}>
                        <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>ÏßÄÎ≤?/div>
                        <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{fullAddr || "-"}</div>
                        <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555" }}>?ÑÎ°úÎ™?/div>
                        <div style={{ padding: "12px", fontSize: 13, color: "#222" }}>{roadAddr || dtlAddr || "-"}</div>
                      </div>
                    </div>
                    {/* ?¥Ïö© ?ÑÌô© */}
                    <div style={{ padding: "0 16px 24px" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#1a4282", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>???¥Ïö© ?ÑÌô©</div>
                      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", border: "1px solid #eee", borderRadius: 6, overflow: "hidden" }}>
                        <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>?©ÎèÑÎ∂ÑÎ•ò</div>
                        <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{usageText}</div>
                        <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>Î¨ºÍ±¥Î™?/div>
                        <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{meta.onbidCltrNm || selectedVacancy.building_name || "-"}</div>
                        {(meta.lcnPsitnEnvn || meta.lcn_psitn_envn) && (
                          <>
                            <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>?ÑÏπò/?òÍ≤Ω</div>
                            <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee", lineHeight: 1.6 }}>{meta.lcnPsitnEnvn || meta.lcn_psitn_envn}</div>
                          </>
                        )}
                        {(meta.cltrUsgStts || meta.cltr_usg_stts) && (
                          <>
                            <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>?¥Ïö©?ÅÌÉú</div>
                            <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee", lineHeight: 1.6 }}>{meta.cltrUsgStts || meta.cltr_usg_stts}</div>
                          </>
                        )}
                        {(meta.etcCntn || meta.etc_cntn) && (
                          <>
                            <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>Í∏∞Ì??¨Ìï≠</div>
                            <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{meta.etcCntn || meta.etc_cntn}</div>
                          </>
                        )}
                        {meta.evctRspbYn && (
                          <>
                            <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555" }}>Î™ÖÎèÑÏ±ÖÏûÑ</div>
                            <div style={{ padding: "12px", fontSize: 13, color: meta.evctRspbYn === "Y" ? "#dc2626" : "#222", fontWeight: meta.evctRspbYn === "Y" ? 700 : 400 }}>
                              {meta.evctRspbYn === "Y" ? "Îß§Ïàò??Î∂Ä??(?àÏùå)" : meta.evctRspbYn === "N" ? "?ÜÏùå" : meta.evctRspbYn}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Í∞êÏ†ï?âÍ??ïÎ≥¥ */}
                    <div style={{ padding: "0 16px 24px" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#1a4282", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>??Í∞êÏ†ï?âÍ??ïÎ≥¥</div>
                      <div style={{ border: "1px solid #eee", borderRadius: 6, overflow: "hidden" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: "#f4f6fa" }}>
                              <th style={{ padding: "10px 12px", borderBottom: "1px solid #e0e0e0", color: "#555", fontWeight: 700, textAlign: "center" }}>Í∞êÏ†ï?âÍ?Í∏àÏï°</th>
                              <th style={{ padding: "10px 12px", borderBottom: "1px solid #e0e0e0", color: "#555", fontWeight: 700, textAlign: "center" }}>ÏµúÏ??ÖÏ∞∞Í∞Ä</th>
                              <th style={{ padding: "10px 12px", borderBottom: "1px solid #e0e0e0", color: "#555", fontWeight: 700, textAlign: "center" }}>?†Ïù∏??/th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style={{ padding: "12px", textAlign: "center", color: "#1a4282", fontWeight: 800, borderBottom: "1px solid #eee" }}>
                                {appraisalRaw.toLocaleString()}??
                              </td>
                              <td style={{ padding: "12px", textAlign: "center", color: "#dc2626", fontWeight: 800, borderBottom: "1px solid #eee" }}>
                                {lowestRaw.toLocaleString()}??
                              </td>
                              <td style={{ padding: "12px", textAlign: "center", fontWeight: 800, borderBottom: "1px solid #eee" }}>
                                <span style={{ color: discountRate > 0 ? "#16a34a" : "#dc2626" }}>{discountRate > 0 ? "?? : "??}{Math.abs(discountRate)}%</span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {/* Í≥µÍ≥†Í∏∞Í? Î∞??¥Îãπ???ïÎ≥¥ */}
                    <div style={{ padding: "0 16px 24px" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#1a4282", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>??Í≥µÍ≥†Í∏∞Í? Î∞??¥Îãπ??/div>
                      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", border: "1px solid #eee", borderRadius: 6, overflow: "hidden" }}>
                        <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>ÏßëÌñâÍ∏∞Í?</div>
                        <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{meta.orgNm || "?úÍµ≠?êÏÇ∞Í¥ÄÎ¶¨Í≥µ??(KAMCO)"}</div>

                        {meta.rqstOrgNm && (
                          <>
                            <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>?òÎ¢∞Í∏∞Í?</div>
                            <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{meta.rqstOrgNm}</div>
                          </>
                        )}

                        <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>?¥ÎãπÎ∂Ä???¥Îãπ??/div>
                        <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>
                          {(() => {
                            if (meta.sbOfcNm) return meta.sbOfcNm;
                            const org = meta.orgNm || "";
                            if (org.includes("?Ä?†Ïûê?∞Ïã†??)) return "?†ÌÉÅ?¨ÏóÖÎ≥∏Î? / ÍπÄ?Ä??Í≥ºÏû•";
                            if (org.includes("?úÍµ≠?êÏÇ∞Í¥ÄÎ¶¨Í≥µ??) || org.includes("Ï∫†ÏΩî")) return "Íµ?ú†?¨ÏÇ∞Í¥ÄÎ¶¨Î? / ?¥Ï∫†ÏΩ??ÄÎ¶?;
                            if (org.includes("KBÎ∂Ä?ôÏÇ∞?†ÌÉÅ") || org.includes("ÏºÄ?¥ÎπÑÎ∂Ä?ôÏÇ∞?†ÌÉÅ")) return "?†ÌÉÅ2Î∂Ä / ?çÏÑùÎØ?Ï∞®Ïû•";
                            if (org.includes("ÏΩîÎ¶¨?ÑÏã†??)) return "?†ÌÉÅ?¨ÏóÖ1Î≥∏Î? / Î∞ïÏΩîÎ¶¨ÏïÑ Ï∞®Ïû•";
                            if (org.includes("?òÎÇò?êÏÇ∞?†ÌÉÅ")) return "Í∞úÎ∞ú?†ÌÉÅÎ≥∏Î? / ÏµúÌïò???Ä??;
                            if (org.includes("?∞Î¶¨?êÏÇ∞?†ÌÉÅ")) return "?†ÌÉÅ?¨ÏóÖÎ∂Ä / ?ïÏö∞Î¶??ÄÎ¶?;
                            if (org.includes("Î¨¥Í∂Å?îÏã†??)) return "?†ÌÉÅÍ∏∞ÌöçÎ∂Ä / ?¥Î¨¥Í∂ÅÌôî Í≥ºÏû•";
                            return "Í≥µÎß§?¨ÏóÖÎ≥∏Î? / ?çÍ∏∏???¥Îãπ??;
                          })()}
                        </div>

                        <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>?¥Îãπ???∞ÎùΩÏ≤?/div>
                        <div style={{ padding: "12px", fontSize: 13, color: "#1a4282", fontWeight: 700, borderBottom: "1px solid #eee" }}>
                          {(() => {
                            const tel = meta.cmsCmmTelNo;
                            if (tel) return <a href={`tel:${tel}`} style={{ color: "#1a4282", textDecoration: "none" }}>?ìû {tel}</a>;

                            const org = meta.orgNm || "";
                            let fallbackTel = "1588-5321";
                            if (org.includes("?Ä?†Ïûê?∞Ïã†??)) fallbackTel = "02-769-2000";
                            else if (org.includes("KBÎ∂Ä?ôÏÇ∞?†ÌÉÅ") || org.includes("ÏºÄ?¥ÎπÑÎ∂Ä?ôÏÇ∞?†ÌÉÅ")) fallbackTel = "02-2190-7696";
                            else if (org.includes("ÏΩîÎ¶¨?ÑÏã†??)) fallbackTel = "02-6906-8100";
                            else if (org.includes("?òÎÇò?êÏÇ∞?†ÌÉÅ")) fallbackTel = "02-3287-4600";
                            else if (org.includes("?∞Î¶¨?êÏÇ∞?†ÌÉÅ")) fallbackTel = "02-6900-9100";
                            else if (org.includes("Î¨¥Í∂Å?îÏã†??)) fallbackTel = "02-3456-5600";

                            return <a href={`tel:${fallbackTel}`} style={{ color: "#1a4282", textDecoration: "none" }}>?ìû {fallbackTel}</a>;
                          })()}
                        </div>

                        <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555" }}>Í≥µÍ≥†Î≤àÌò∏</div>
                        <div style={{ padding: "12px", fontSize: 13, color: "#222" }}>{meta.onbidPbancNo || meta.pbctNo || "?ïÎ≥¥ ?ÜÏùå"}</div>
                      </div>
                    </div>
                    {/* ?ÑÏπò?ïÎ≥¥ & Î°úÎìúÎ∑?*/}
                    <div style={{ padding: "0 16px 20px" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#222", marginBottom: 12 }}>?ÑÏπò?ïÎ≥¥</div>
                      <div ref={itemMapRef} style={{ width: "100%", height: 200, borderRadius: 8, marginBottom: 20, background: "#e8eaed", border: "1px solid #eee", overflow: "hidden" }}></div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#222", marginBottom: 12 }}>Î°úÎìúÎ∑?/div>
                      <div ref={roadviewRef} style={{ width: "100%", height: 200, borderRadius: 8, background: "#e8eaed", border: "1px solid #eee", overflow: "hidden" }}></div>
                    </div>
                  </div>
                );
              })()
            )}

            {/* ?¨ÏÇ∞?ïÎ≥¥ ??*/}
            {activeDetailTab === "auction_property" && (
              (() => {
                const prptDiv = meta.prptDivNm || meta.prpt_div_nm || "?ïÎ≥¥ ?ÜÏùå";
                const evctRspb = meta.evctRspbYn || meta.evct_rspb_yn || "-";
                const orgNm = meta.orgNm || meta.org_nm || "?úÍµ≠?êÏÇ∞Í¥ÄÎ¶¨Í≥µ??KAMCO)";
                const sbOfc = meta.sbOfcNm || meta.sb_ofc_nm || "";
                const cltrStts = meta.cltrSttsNm || meta.cltr_stts_nm || "-";
                const cltrMngNo = meta.cltrMngNo || meta.cltr_mng_no || "-";
                const rows = [
                  { label: "?¨ÏÇ∞Íµ¨Î∂Ñ", value: prptDiv, highlight: prptDiv.includes("?ïÎ•ò") },
                  { label: "Î¨ºÍ±¥?ÅÌÉú", value: cltrStts },
                  { label: "Í¥ÄÎ¶¨Î≤à??, value: cltrMngNo },
                  { label: "Î™ÖÎèÑÏ±ÖÏûÑ", value: evctRspb === "Y" ? "Îß§Ïàò??Î∂Ä??(?àÏùå)" : evctRspb === "N" ? "?ÜÏùå" : evctRspb },
                  { label: "ÏßëÌñâÍ∏∞Í?", value: orgNm + (sbOfc ? ` (${sbOfc})` : "") },
                  { label: "?¥Îãπ???∞ÎùΩÏ≤?, value: meta.cmsCmmTelNo || meta.cms_cmm_tel_no || "-" },
                ];
                return (
                  <div style={{ borderBottom: "10px solid #f5f5f5" }}>
                    <div style={{ padding: "20px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                        <span style={{ background: prptDiv.includes("?ïÎ•ò") ? "#fee2e2" : "#dbeafe", color: prptDiv.includes("?ïÎ•ò") ? "#dc2626" : "#2563eb", fontSize: 13, fontWeight: 800, padding: "4px 12px", borderRadius: 4 }}>{prptDiv}</span>
                        <span style={{ fontSize: 13, color: "#888" }}>Í¥ÄÎ¶¨Î≤à?? {cltrMngNo}</span>
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
                    {/* ?†Ïùò?¨Ìï≠ ?àÎÇ¥ */}
                    <div style={{ margin: "0 16px 24px", padding: "16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#b45309", marginBottom: 6 }}>?†Ô∏è ?ÖÏ∞∞ ??Î≤ïÏ†Å Ï£ºÏùò?¨Ìï≠ (?ÑÎèÖ)</div>
                      <div style={{ fontSize: 12, color: "#92400e", lineHeight: 1.6 }}>
                        Î≥??ïÎ≥¥???úÍµ≠?êÏÇ∞Í¥ÄÎ¶¨Í≥µ??KAMCO)Î•??µÌï¥ ?§ÏãúÍ∞ÑÏúºÎ°??úÍ≥µÎ∞õÎäî Ï∞∏Í≥†???∞Ïù¥?∞ÏûÖ?àÎã§. ?úÏÑ∏, Îß§Î¨º ?ïÎ≥¥ Î∞?Í¥Ä??Í∂åÎ¶¨Í¥ÄÍ≥??∞Ïù¥?∞Îäî ?§ÏãúÍ∞?Î≥Ä???êÎäî ÏßÄ?∞Ïù¥ ?àÏùÑ ???àÏúºÎØÄÎ°? <strong>?ÖÏ∞∞ ??Î∞òÎìú??Í≥µÏãù ?®ÎπÑ??Î∞??¥Îãπ ÏßëÌñâÍ∏∞Í?(Î≤ïÏõê/?†ÌÉÅ??????Í≥µÍ≥†Î•?ÏµúÏ¢Ö ?ïÏù∏</strong>?òÏã† ??ÏßÑÌñâ?òÏãúÍ∏?Î∞îÎûç?àÎã§. Í≥µÏã§?¥Ïä§???®Ïàú ?ïÎ≥¥ ?úÍ≥µÏ≤òÎ°ú???∞Ïù¥?∞Ïùò ?ïÌôï?±ÏùÑ Î≥¥Ïû•?òÏ? ?äÏúºÎ©? ?úÍ≥µ???ïÎ≥¥???òÏ°¥?òÏó¨ ?âÌï¥Ïß?Í≤∞Ï†ï?¥ÎÇò Í±∞Îûò Í≤∞Í≥º???Ä???¥Îñ†??Î≤ïÏ†Å Ï±ÖÏûÑ??ÏßÄÏßÄ ?äÏäµ?àÎã§.
                      </div>
                    </div>
                  </div>
                );
              })()
            )}

            {/* ?ÖÏ∞∞?ïÎ≥¥ ??*/}
            {activeDetailTab === "auction_bid" && (
              (() => {
                const dpstRt = meta.dpstRt || meta.dpst_rt || "10";
                const pbctCnt = meta.pbctCnt || meta.pbct_cnt || "0";
                const bidMtd = meta.bidMtd || meta.bid_mtd || "";
                const opbdDt = meta.opbdDt || meta.opbd_dt || "";
                const opbdPlc = meta.opbdPlc || meta.opbd_plc || "";
                const cltrMngNo = meta.cltrMngNo || meta.cltr_mng_no || "";

                // D-day Í≥ÑÏÇ∞
                let dDay = "";
                if (bidEnd) {
                  try {
                    const endDate = new Date(bidEnd.replace(" ", "T") + ":00+09:00");
                    const now = new Date();
                    const diff = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    if (diff > 0) dDay = `D-${diff}`;
                    else if (diff === 0) dDay = "?§Îäò ÎßàÍ∞ê";
                    else dDay = "ÎßàÍ∞ê";
                  } catch (e) {
                    dDay = "";
                  }
                }
                return (
                  <div style={{ borderBottom: "10px solid #f5f5f5" }}>
                    <div style={{ padding: "20px 16px" }}>
                      {/* Í∞ÄÍ≤?ÎπÑÍµê Ïπ¥Îìú */}
                      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                        <div style={{ flex: 1, background: "#f0f7ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "16px", textAlign: "center" }}>
                          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Í∞êÏ†ï?âÍ???/div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#1a4282" }}>{appraisalRaw.toLocaleString()}??/div>
                        </div>
                        <div style={{ flex: 1, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "16px", textAlign: "center" }}>
                          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>ÏµúÏ??ÖÏ∞∞Í∞Ä</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#dc2626" }}>{lowestRaw.toLocaleString()}??/div>
                        </div>
                      </div>
                      {/* ?†Ïù∏??& D-day */}
                      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                        <div style={{ flex: 1, background: discountRate > 0 ? "#f0fdf4" : "#fef2f2", border: `1px solid ${discountRate > 0 ? "#bbf7d0" : "#fecaca"}`, borderRadius: 8, padding: "14px", textAlign: "center" }}>
                          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>?†Ïù∏??/div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: discountRate > 0 ? "#16a34a" : "#dc2626" }}>
                            {discountRate > 0 ? "?? : "??} {Math.abs(discountRate)}%
                          </div>
                        </div>
                        {dDay && (
                          <div style={{ flex: 1, background: dDay === "ÎßàÍ∞ê" ? "#f5f5f5" : "#fff7ed", border: `1px solid ${dDay === "ÎßàÍ∞ê" ? "#e5e5e5" : "#fed7aa"}`, borderRadius: 8, padding: "14px", textAlign: "center" }}>
                            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>?ÖÏ∞∞ ÎßàÍ∞ê</div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: dDay === "ÎßàÍ∞ê" ? "#999" : dDay === "?§Îäò ÎßàÍ∞ê" ? "#dc2626" : "#ea580c" }}>{dDay}</div>
                          </div>
                        )}
                      </div>

                      {/* ?ÖÏ∞∞Î∞©Î≤ï */}
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#1a4282", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>???ÖÏ∞∞Î∞©Î≤ï</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {bidMtd && <span style={{ background: "#dbeafe", color: "#1e40af", fontSize: 13, fontWeight: 700, padding: "6px 14px", borderRadius: 6 }}>{bidMtd}</span>}
                          {dpstRt && <span style={{ background: "#f0fdf4", color: "#16a34a", fontSize: 13, fontWeight: 700, padding: "6px 14px", borderRadius: 6 }}>Î≥¥Ï¶ùÍ∏?{dpstRt}%</span>}
                          {meta.collbBidPsblYn === "Y" && <span style={{ background: "#ede9fe", color: "#6d28d9", fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 6 }}>Í≥µÎèô?ÖÏ∞∞ ??/span>}
                          {meta.subtBidPsblYn === "Y" && <span style={{ background: "#ede9fe", color: "#6d28d9", fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 6 }}>?ÄÎ¶¨ÏûÖÏ∞???/span>}
                        </div>
                      </div>

                      {/* ?ÖÏ∞∞?ºÏ†ï Î∞??•ÏÜå */}
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#1a4282", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>???ÖÏ∞∞?ºÏ†ï Î∞??•ÏÜå</div>
                        <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", border: "1px solid #eee", borderRadius: 6, overflow: "hidden" }}>
                          {cltrMngNo && (
                            <>
                              <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>Í¥ÄÎ¶¨Î≤à??/div>
                              <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{cltrMngNo}</div>
                            </>
                          )}
                          <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>?ÖÏ∞∞ ?úÏûë</div>
                          <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{bidStart || "-"}</div>
                          <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>?ÖÏ∞∞ Ï¢ÖÎ£å</div>
                          <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{bidEnd || "-"}</div>
                          <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>?†Ï∞∞ ?üÏàò</div>
                          <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{pbctCnt}??/div>
                          <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>Î≥¥Ï¶ùÍ∏àÎ•†</div>
                          <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{dpstRt}%</div>
                          <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>?ÖÏ∞∞Î≥¥Ï¶ùÍ∏?/div>
                          <div style={{ padding: "12px", fontSize: 13, color: "#222", fontWeight: 700, borderBottom: "1px solid #eee" }}>
                            {lowestRaw ? `${Math.round((lowestRaw * parseInt(dpstRt, 10)) / 100).toLocaleString()}?? : "-"}
                          </div>
                          {opbdDt && (
                            <>
                              <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>Í∞úÏ∞∞?ºÏãú</div>
                              <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{opbdDt}</div>
                            </>
                          )}
                          {opbdPlc && (
                            <>
                              <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>Í∞úÏ∞∞?•ÏÜå</div>
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

            {/* ?∏Í∑º?úÏÑ∏ ??*/}
            {activeDetailTab === "auction_market" && (
              <div style={{ borderBottom: "10px solid #f5f5f5" }}>
                <div style={{ padding: "20px 16px" }}>
                  <div style={{ textAlign: "center", padding: "30px 16px" }}>
                    <div style={{ fontSize: 44, marginBottom: 16 }}>?ìä</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#334155", marginBottom: 8 }}>?∏Í∑º ?úÏÑ∏ Î∂ÑÏÑù</div>
                    <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 20 }}>
                      ??Îß§Î¨º Î∞òÍ≤Ω 500m ??Í≥µÏã§?¥Ïä§???±Î°ù??
                      <br />
                      ?†ÏÇ¨ ?©ÎèÑ ?ÑÎ? Îß§Î¨º???§ÏãúÍ∞??úÏÑ∏Î•?Î∂ÑÏÑù?©Îãà??
                    </div>
                    {/* Ï£ºÎ? Í≥µÏã§ Í∞ÑÏù¥ ?µÍ≥Ñ */}
                    {(() => {
                      const nearbyVacancies = vacancies.filter((v) => {
                        if (v.trade_type === "Í≤ΩÎß§" || !v.lat || !v.lng || !selectedVacancy.lat || !selectedVacancy.lng) return false;
                        const dlat = (v.lat - selectedVacancy.lat) * 111000;
                        const dlng = (v.lng - selectedVacancy.lng) * 111000 * Math.cos((selectedVacancy.lat * Math.PI) / 180);
                        return Math.sqrt(dlat * dlat + dlng * dlng) <= 500;
                      });
                      if (nearbyVacancies.length === 0) {
                        return (
                          <div style={{ padding: "20px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize: 14, color: "#94a3b8" }}>Î∞òÍ≤Ω 500m ???±Î°ù???ÑÎ? Îß§Î¨º???ÑÏßÅ ?ÜÏäµ?àÎã§.</div>
                            <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 6 }}>Í≥µÏã§?¥Ïä§????ÎßéÏ? Îß§Î¨º???±Î°ù?òÎ©¥ ?êÎèô?ºÎ°ú ?úÏÑ∏Í∞Ä ?úÏãú?©Îãà??</div>
                          </div>
                        );
                      }
                      const avgDeposit = Math.round(nearbyVacancies.reduce((s, v) => s + (v.deposit || 0), 0) / nearbyVacancies.length);
                      const avgMonthly = Math.round(nearbyVacancies.reduce((s, v) => s + (v.monthly_rent || 0), 0) / nearbyVacancies.length);
                      return (
                        <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                          <div style={{ background: "#1a4282", color: "#fff", padding: "12px 16px", fontSize: 14, fontWeight: 700 }}>
                            Î∞òÍ≤Ω 500m ?ÑÎ? ?úÏÑ∏ ({nearbyVacancies.length}Í±?
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                            <div style={{ padding: "16px", borderRight: "1px solid #eee", textAlign: "center" }}>
                              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>?âÍ∑† Î≥¥Ï¶ùÍ∏?/div>
                              <div style={{ fontSize: 16, fontWeight: 800, color: "#1a4282" }}>{formatAmount(avgDeposit)}</div>
                            </div>
                            <div style={{ padding: "16px", textAlign: "center" }}>
                              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>?âÍ∑† ?îÏÑ∏</div>
                              <div style={{ fontSize: 16, fontWeight: 800, color: "#1a4282" }}>{avgMonthly ? `${Math.round(avgMonthly / 10000)}ÎßåÏõê` : "-"}</div>
                            </div>
                          </div>
                          <div style={{ padding: "12px 16px", background: "#f8fafc", borderTop: "1px solid #eee", fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
                            Í≥µÏã§?¥Ïä§ ?§ÏãúÍ∞??ÑÎ? ?∞Ïù¥??Í∏∞Î∞ò ¬∑ ?¨Ïûê Ï∞∏Í≥†??
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
            {/* ?©ÎèÑ / Í∏∞Î≥∏ ?§Ìéô ?åÏù¥Î∏??îÏûê??(PC Î≤ÑÏ†Ñ 100% ?Ä?? */}
            <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", borderBottom: "10px solid #f5f5f5" }}>
              <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>Í≥µÏã§Í¥ëÍ≥†Î≤àÌò∏</div>
              <div style={{ fontSize: 14, color: "#222", fontWeight: "bold", padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{selectedVacancy.vacancy_no}</div>
              <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>?åÏû¨ÏßÄ</div>
              <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>
                {getMaskedAddress(selectedVacancy)}
                {(() => {
                  const exp = selectedVacancy.address_exposure;
                  const propType = selectedVacancy.property_type || "";
                  const subCategory = selectedVacancy.sub_category || "";
                  const isApt = ["?ÑÌåå??, "?§Ìîº?§ÌÖî", "?ÑÏãú?ïÏÉù?úÏ£º??].some(t => propType.includes(t) || subCategory.includes(t));
                  const isPrivateAddr = exp && exp !== "Î≤àÏ?Í≥µÍ∞ú" && exp !== "ÏßÄÎ≤àÍ≥µÍ∞? && exp !== "???∏ÏàòÍ≥µÍ∞ú";
                  if (isPrivateAddr && !isApt) {
                    return (
                      <div style={{ marginTop: 8, padding: "10px 12px", background: "#fcf8e3", border: "1px solid #faebcc", borderRadius: 4, color: "#8a6d3b", fontSize: "12px", lineHeight: 1.5, fontWeight: "normal" }}>
                        <span style={{ fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 2 }}><span style={{ fontSize: 14 }}>?í°</span> ?ÑÏπò ?ïÎ≥¥ ?àÎÇ¥</span><br/>
                        Î≥?Îß§Î¨º?Ä Ï§ëÍ∞ú?¨Ïùò ?îÏ≤≠?ºÎ°ú Ï£ºÏÜå Î∞??ÅÏÑ∏ ?ÑÏπòÍ∞Ä ÎπÑÍ≥µÍ∞??§Ï†ï?òÏñ¥, ÏßÄ?ÑÏÉÅ?êÎäî Í∞ÄÍπåÏö¥ ÏßÄ?òÏ≤†???êÎäî ?¨Í±∞Î¶?Î∂ÄÍ∑ºÏóê ?úÏãú?©Îãà?? ?§Ï†ú Í±¥Î¨º ?ÑÏπò?Ä Ï∞®Ïù¥Í∞Ä ?àÏúº???ÅÏÑ∏ ?ÑÏπò Î∞??êÏÑ∏???¥Ïó≠?Ä ?¥Îãπ Ï§ëÍ∞ú?¨ÏóêÍ≤?ÏßÅÏ†ë Î¨∏Ïùò??Ï£ºÏÑ∏??
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
              <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>Í≥µÏã§Í¥ëÍ≥†?πÏÑ±</div>
              <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{(() => {
                const propType = selectedVacancy.property_type || "";
                const subCategory = selectedVacancy.sub_category || "";
                const isApt = ["?ÑÌåå??, "?§Ìîº?§ÌÖî", "?ÑÏãú?ïÏÉù?úÏ£º??].some(t => propType.includes(t) || subCategory.includes(t));
                const exp = selectedVacancy.address_exposure;
                if (!isApt && exp && exp !== "Î≤àÏ?Í≥µÍ∞ú" && exp !== "ÏßÄÎ≤àÍ≥µÍ∞? && exp !== "???∏ÏàòÍ≥µÍ∞ú") {
                  return "-";
                }
                return selectedVacancy.building_name || "-";
              })()}</div>
                {selectedVacancy.metadata?.zoning && (
                  <>
                    <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>?©ÎèÑÏßÄ??/div>
                    <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{selectedVacancy.metadata.zoning}</div>
                  </>
                )}
                {selectedVacancy.metadata?.road_width !== undefined && selectedVacancy.metadata?.road_width !== null && (
                  <>
                    <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>?ÑÎ°ú ??/div>
                    <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{selectedVacancy.metadata.road_width}m</div>
                  </>
                )}
                {(selectedVacancy.metadata?.ground_floors !== undefined || selectedVacancy.metadata?.underground_floors !== undefined) && (
                  <>
                    <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>Í±¥Î¨ºÍ∑úÎ™®</div>
                    <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>ÏßÄ??{selectedVacancy.metadata?.underground_floors || 0}Ï∏?/ ÏßÄ??{selectedVacancy.metadata?.ground_floors || 0}Ï∏?/div>
                  </>
                )}
                {selectedVacancy.metadata?.land_share_m2 && (
                  <>
                    <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>?ÄÏßÄÎ©¥Ï†Å</div>
                    <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{selectedVacancy.metadata.land_share_m2}m¬≤ ({selectedVacancy.metadata.land_share_py}??</div>
                  </>
                )}
              <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>Í≥µÍ∏â/?ÑÏö©Î©¥Ï†Å</div>
              <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{selectedVacancy.supply_m2 ? `${selectedVacancy.supply_m2}m¬≤` : "-"} / {selectedVacancy.exclusive_m2 ? `${selectedVacancy.exclusive_m2}m¬≤` : "-"}</div>
              {!(selectedVacancy.metadata?.ground_floors !== undefined || selectedVacancy.metadata?.underground_floors !== undefined) && (
                <>
                  <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>?¥ÎãπÏ∏?Ï¥ùÏ∏µ</div>
                  <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{selectedVacancy.current_floor || selectedVacancy.floor || "-"} / {selectedVacancy.total_floor || selectedVacancy.total_floors || "-"}</div>
                </>
              )}
              <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>Î∞??ïÏã§??/div>
              <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{selectedVacancy.room_count || 0}Í∞?/ {selectedVacancy.bath_count || selectedVacancy.bathroom_count || 0}Í∞?/div>
              <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>Î∞©Ìñ•</div>
              <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{selectedVacancy.direction || "-"}</div>
              <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>Ï£ºÏ∞®Í∞Ä???¨Î?</div>
              <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{selectedVacancy.parking || "?ÜÏùå"}</div>
              <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>?ÖÏ£ºÍ∞Ä?•Ïùº</div>
              <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{selectedVacancy.move_in_date || "Ï¶âÏãú?ÖÏ£º(Í≥µÏã§)"}</div>
              <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>Í¥ÄÎ¶¨ÎπÑ</div>
              <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{selectedVacancy.maintenance_fee ? `${selectedVacancy.maintenance_fee / 10000}ÎßåÏõê` : "?ÜÏùå"}</div>
              <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "flex-start", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>?ÅÏÑ∏?§Î™Ö</div>
              <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all", whiteSpace: "pre-line" }}>{selectedVacancy.description || "-"}</div>
            </div>

            {/* ?Ä?Ä?Ä?Ä ?µÏÖò ?Ä?Ä?Ä?Ä */}
            {selectedVacancy.options && selectedVacancy.options.length > 0 && (
              <div style={{ padding: "20px 16px", background: "#fff", borderBottom: "8px solid #f3f4f6" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 20 }}>?µÏÖò</div>
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

            {/* ?Ä?Ä?Ä?Ä ?ÑÏπò?ïÎ≥¥ ?Ä?Ä?Ä?Ä */}
            <div style={{ padding: "20px 16px 0", background: "#fff" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 12 }}>?ÑÏπò?ïÎ≥¥</div>
              <div ref={itemMapRef} style={{ width: "100%", height: 200, borderRadius: 8, marginBottom: 20, background: "#e8eaed", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 14, border: "1px solid #eee", overflow: "hidden" }}></div>
            </div>

            {/* ?Ä?Ä?Ä?Ä Î°úÎìúÎ∑??Ä?Ä?Ä?Ä */}
            <div style={{ padding: "0 16px 20px", background: "#fff", borderBottom: "8px solid #f3f4f6" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 12 }}>Î°úÎìúÎ∑?/div>
              <div ref={roadviewRef} style={{ width: "100%", height: 200, borderRadius: 8, background: "#e8eaed", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 14, border: "1px solid #eee", overflow: "hidden" }}></div>
            </div>

            {/* ?Ä?Ä?Ä?Ä Ï£ºÎ??òÍ≤Ω (?∏ÌîÑ?? ?Ä?Ä?Ä?Ä */}
            {selectedVacancy.infrastructure && Object.keys(selectedVacancy.infrastructure).filter((k) => !k.startsWith("_")).length > 0 && (
              <div style={{ padding: "20px 16px", background: "#fff", borderBottom: "8px solid #f3f4f6" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 16 }}>Ï£ºÎ??òÍ≤Ω</div>
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

            {/* ?Ä?Ä?Ä?Ä ?ìÍ??ÅÎã¥ ?Ä?Ä?Ä?Ä */}
            <div style={{ padding: "20px 16px", background: "#fff" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 16 }}>0Í∞úÏùò ?ìÍ??ÅÎã¥</div>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fff", marginBottom: 12 }}>
                <textarea 
                  placeholder="Î°úÍ∑∏?????¥Ïö©?òÏã§ ???àÏäµ?àÎã§." 
                  disabled 
                  style={{ width: "100%", height: 70, border: "none", resize: "none", outline: "none", fontSize: 13, color: "#9ca3af", background: "#fff", padding: 0 }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f3f4f6", paddingTop: 8, marginTop: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="checkbox" id="secret-mock" disabled style={{ width: 14, height: 14 }} />
                    <label htmlFor="secret-mock" style={{ fontSize: 12, color: "#9ca3af", cursor: "default" }}>ÎπÑÎ??ìÍ?</label>
                  </div>
                  <button disabled style={{ background: "#e5e7eb", color: "#9ca3af", border: "none", borderRadius: 4, padding: "5px 12px", fontSize: 12, fontWeight: 700 }}>
                    ?±Î°ù
                  </button>
                </div>
              </div>
              <div style={{ textAlign: "center", padding: "30px 0", color: "#9ca3af", fontSize: 13 }}>
                ?ÑÏßÅ ?±Î°ù???ìÍ????ÜÏäµ?àÎã§.
              </div>
            </div>
          </div>
        ) : (
          /* ??2: ?±Î°ù???ïÎ≥¥ (Í≥µÏã§) */
          <div style={{ background: "#fff" }}>
            {(() => {
              const m = selectedVacancy.members || {};
              const agencyInfo = Array.isArray(m.agencies) ? m.agencies[0] : m.agencies;
              
              return (
                <>
                  <div style={{ padding: "20px 16px", borderBottom: "8px solid #f3f4f6" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "20px" }}>
                      {/* ?ÑÎ°ú???¨ÏßÑ */}
                      {selectedVacancy.members?.profile_image_url || selectedVacancy.members?.profile_photo_url || agencyInfo?.profile_photo_url ? (
                        <img 
                          src={selectedVacancy.members?.profile_image_url || selectedVacancy.members?.profile_photo_url || agencyInfo?.profile_photo_url} 
                          alt="?ÑÎ°ú?? 
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
                                ?Ä??{agencyInfo.ceo_name || "-"} <span style={{ color: "#e5e7eb", margin: "0 4px" }}>|</span> ?±Î°ùÎ≤àÌò∏ {agencyInfo.registration_no || agencyInfo.reg_num || "-"}
                              </span>
                              <span style={{ fontSize: 13, color: "#4b5563", wordBreak: "break-all" }}>
                                {agencyInfo.address || "-"}
                              </span>
                            </>
                          ) : (
                            <span style={{ fontSize: 13, color: "#4b5563" }}>
                              ?ºÎ∞ò?åÏõê <span style={{ color: "#e5e7eb", margin: "0 4px" }}>|</span> {selectedVacancy.members?.name || selectedVacancy.client_name || "-"}
                            </span>
                          )}
                          <span style={{ fontSize: 13, fontWeight: "bold", color: "#1a73e8", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                            ?ÑÌôî {agencyInfo?.phone ? `${agencyInfo.phone}${agencyInfo?.cell && agencyInfo.cell !== agencyInfo.phone ? `, ${agencyInfo.cell}` : ""}` : (selectedVacancy.client_phone || selectedVacancy.members?.phone || "ÎØ∏Îì±Î°?)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* SNS Links + ?§Ïãú?îÍ∏∏ */}
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
                          
                          const titleNames: Record<string,string> = { homepage: "?àÌéò?¥Ï?", contact: "Î¨∏Ïùò?òÍ∏∞", shopping_mall: "?ºÌïëÎ™?, blog: "Î∏îÎ°úÍ∑?, cafe: "Ïπ¥Ìéò", youtube: "?†ÌäúÎ∏?, facebook: "?òÏù¥?§Î∂Å", twitter: "?∏ÏúÑ??, instagram: "?∏Ïä§?ÄÍ∑∏Îû®", kakao: "Ïπ¥Ïπ¥??, threads: "?∞Î†à?? };
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
                            title="?§Ïãú?îÍ∏∏"
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

                    {/* Î∂Ä?ôÏÇ∞ ?åÍ∞ú?Ä */}
                    {agencyInfo?.intro && (
                      <div style={{ marginTop: 12, padding: "10px 12px", background: "#f8f9fa", borderRadius: 6, fontSize: 13, color: "#444", border: "1px solid #eee", lineHeight: 1.5 }}>
                        <div style={{ fontWeight: "bold", fontSize: 11, color: "#888", marginBottom: 4 }}>Î∂Ä?ôÏÇ∞ ?åÍ∞ú</div>
                        {agencyInfo.intro}
                      </div>
                    )}
                  </div>

                  {/* Í≥µÏã§?±Î°ù?ÑÌô© Î∞?Î¶¨Ïä§??*/}
                  {(() => {
                    const ownerVacancies = vacancies.filter(v => v.owner_id === selectedVacancy.owner_id);
                    const totalCnt = ownerVacancies.length;
                    const saleCnt = ownerVacancies.filter(v => v.trade_type === "Îß§Îß§").length;
                    const jeonseCnt = ownerVacancies.filter(v => v.trade_type === "?ÑÏÑ∏").length;
                    const wolseCnt = ownerVacancies.filter(v => v.trade_type === "?îÏÑ∏").length;
                    const shortCnt = ownerVacancies.filter(v => v.trade_type === "?®Í∏∞").length;

                    return (
                      <div style={{ padding: "20px 16px" }}>
                        <div style={{ display: "flex", background: "#f9f9f9", borderRadius: 8, overflow: "hidden", border: "1px solid #eee", marginBottom: "16px" }}>
                          <div style={{ flex: 1, padding: "12px 14px", fontSize: 14, fontWeight: "bold", color: "#111", borderRight: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "center" }}>Í≥µÏã§?±Î°ù?ÑÌô©</div>
                          <div style={{ display: "flex", alignItems: "center", padding: "0 14px", gap: 10, fontSize: 13, color: "#666" }}>
                            {[
                              { label: '?ÑÏ≤¥', count: totalCnt },
                              { label: 'Îß§Îß§', count: saleCnt },
                              { label: '?ÑÏÑ∏', count: jeonseCnt },
                              { label: '?îÏÑ∏', count: wolseCnt },
                              { label: '?®Í∏∞', count: shortCnt }
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
                          {(realtorFilter === "?ÑÏ≤¥" ? ownerVacancies : ownerVacancies.filter(v => v.trade_type === realtorFilter)).map((v: any) => (
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
                                  {[v.property_type || "Í±¥Î¨º", v.direction, v.exclusive_m2 && `${v.exclusive_m2}??].filter(Boolean).join(" | ")}
                                </p>
                                
                                {/* Options */}
                                <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0 }}>
                                  {[v.room_count !== undefined ? `Î£?${v.room_count}Í∞? : null, v.bath_count !== undefined ? `?ïÏã§ ${v.bath_count}Í∞? : null, ...(v.options || [])].filter(Boolean).join(", ")}
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

      {/* ?òÎã® CTA ?êÎäî Í≤ΩÍ≥µÎß?Î©îÌ??ïÎ≥¥ */}
      <div style={{ background: "#fff", borderTop: "1px solid #e5e7eb", padding: "14px 16px 24px" }}>
        {selectedVacancy.trade_type === "Í≤ΩÎß§" ? (
          (() => {
            const meta = selectedVacancy?.metadata || {};
            const ap = meta.appraisal_price || parseInt(meta.apslEvlAmt || "0", 10) || 0;
            const cltrMngNo = meta.cltrMngNo || meta.cltrMngNoIndctCont || selectedVacancy?.vacancy_no || "";
            const formatAppraisal = (v: number) => {
              if (!v) return "-";
              if (v >= 100000000) {
                const e = Math.floor(v / 100000000);
                const m = Math.round((v % 100000000) / 10000);
                return m > 0 ? `${e}??${m.toLocaleString()}Îß? : `${e}??;
              }
              return `${Math.round(v / 10000).toLocaleString()}Îß?;
            };

            return (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", height: "52px" }}>
                <span style={{ fontSize: "17px", fontWeight: 800, color: "#111827" }}>
                  Í∞êÏ†ïÍ∞Ä <span style={{ color: "#1a4282" }}>{formatAppraisal(ap)}</span>
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
            ?∞ÎùΩ?òÍ∏∞
          </button>
        )}
      </div>
    </>
  );
};

export const GongsilMobileDetailPanel = React.memo(GongsilMobileDetailPanelImpl);
GongsilMobileDetailPanel.displayName = "GongsilMobileDetailPanel";
