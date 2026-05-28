"use client";

import React, { useState, useMemo } from "react";
import { formatAmount } from "./page";
import { getAuctionInfo } from "@/app/(map)/gongsil/gongsilHelpers";

type AuctionSortKey = "latest" | "appraisal" | "bid" | "bidDate";

interface GongsilMobileDrawerListProps {
  selectedCluster: any[] | null;
  showListView: boolean;
  goBack: () => void;
  activeMode: "공실" | "경매";
  listViewMode: "map" | "all" | "filter";
  visibleVacancies: any[];
  filteredVacancies: any[];
  currentUser: any;
  userLevel: number;
  showCommission: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  handleVacancyClick: (v: any) => void;
  formatPrice: (v: any) => string;
}

const GongsilMobileDrawerListImpl: React.FC<GongsilMobileDrawerListProps> = ({
  selectedCluster,
  showListView,
  goBack,
  activeMode,
  listViewMode,
  visibleVacancies,
  filteredVacancies,
  currentUser,
  userLevel,
  showCommission,
  setIsAuthModalOpen,
  handleVacancyClick,
  formatPrice,
}) => {
  const currentList = selectedCluster || (showListView ? (listViewMode === 'map' ? visibleVacancies : filteredVacancies) : []);
  const [auctionSort, setAuctionSort] = useState<AuctionSortKey>("latest");

  const sortedList = useMemo(() => {
    if (!currentList || activeMode !== "경매") return currentList;
    const arr = [...currentList];
    switch (auctionSort) {
      case "latest":
        return arr.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      case "appraisal": {
        const getAppr = (v: any) => {
          const m = v.metadata || {};
          return m.appraisal_price || parseInt(m.apslEvlAmt || "0", 10) || v.deposit * 10000 || 0;
        };
        return arr.sort((a, b) => getAppr(a) - getAppr(b));
      }
      case "bid": {
        const getBid = (v: any) => {
          const m = v.metadata || {};
          return m.lowest_bid_price || parseInt(m.lowstBidPrcIndctCont || "0", 10) || 0;
        };
        return arr.sort((a, b) => getBid(a) - getBid(b));
      }
      case "bidDate": {
        const getBidDate = (v: any) => {
          const m = v.metadata || {};
          return m.pbctBegnDtm || m.pblctBgnDtm || m.bid_start_date || "";
        };
        return arr.sort((a, b) => {
          const da = getBidDate(a);
          const db = getBidDate(b);
          if (!da && !db) return 0;
          if (!da) return 1;
          if (!db) return -1;
          return db.localeCompare(da);
        });
      }
      default:
        return arr;
    }
  }, [currentList, auctionSort, activeMode]);

  const renderList = activeMode === "경매" ? sortedList : currentList;

  return (
    <div className={`list-panel ${(selectedCluster || showListView) ? "open" : ""}`} onClick={(e) => e.stopPropagation()}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button onClick={goBack} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "4px", marginLeft: "-4px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#111827", margin: 0 }}>
            {activeMode === "경매" ? "경공매" : "공실광고"}{" "}
            <span style={{ color: activeMode === "경매" ? "#1a73e8" : "#f97316" }}>
              {currentList?.length || 0}
            </span>개
          </h3>
        </div>
        {activeMode === "경매" && (
          <select
            value={auctionSort}
            onChange={(e) => setAuctionSort(e.target.value as AuctionSortKey)}
            style={{
              padding: "4px 8px",
              fontSize: 12,
              fontWeight: 700,
              color: "#1a4282",
              background: "#fff",
              border: "1px solid #1a4282",
              borderRadius: 6,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="latest">최신등록순</option>
            <option value="appraisal">감정가 낮은순</option>
            <option value="bid">입찰가 낮은순</option>
            <option value="bidDate">입찰 최근순</option>
          </select>
        )}
      </div>
      <div className="no-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "8px 16px 20px" }}>
        {renderList?.map((v: any) => {
          const isMyProperty = currentUser && v && v.owner_id === currentUser.id;
          const cardMasked = v.exposure_type === '부동산노출' && userLevel < 2 && !isMyProperty;
          const cardAddr = v.building_name || [v.dong, v.sigungu].filter(Boolean).join(" ");

          // 경공매 데이터 파싱
          const meta = v.metadata || {};
          const appraisalPrice = meta.appraisal_price || parseInt(meta.apslEvlAmt || "0", 10) || v.deposit * 10000;
          const lowestBidPrice = meta.lowest_bid_price || parseInt(meta.lowstBidPrcIndctCont || "0", 10) || 0;
          const lowestBidText = meta.lowstBidPrcIndctCont === "비공개" ? "비공개" : lowestBidPrice > 0 ? formatAmount(lowestBidPrice) : "";
          const cardDiscountRate = appraisalPrice > 0 ? Math.round(((appraisalPrice - lowestBidPrice) / appraisalPrice) * 100) : 0;
          const mngNo = meta.cltrMngNo || meta.cltrMngNoIndctCont || v.vacancy_no || "";
          const bidStartDate = meta.pbctBegnDtm || meta.bid_start_date || v.created_at;
          const bidStartText = bidStartDate ? new Date(bidStartDate).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\s/g, "").slice(0, -1) : "";
          const info = getAuctionInfo(v);

          // 🔨 1. 법원 경공매 전용 고밀도 프리미엄 카드 레이아웃
          if (v.trade_type === "경매") {
            return (
              <div
                key={v.id}
                className="v-card"
                onClick={() => { if (cardMasked) { setIsAuthModalOpen(true); return; } handleVacancyClick(v); }}
                style={{ display: "flex", gap: "12px", padding: "16px 0", borderBottom: "1px solid #f3f4f6", cursor: "pointer", transition: "background 0.15s" }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* 배지 & 상태 영역 */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                    <span style={{ display: "inline-block", fontSize: "11px", color: "#fa5252", border: "1px solid #fa5252", padding: "1px 6px", borderRadius: "4px", fontWeight: "bold", background: "#fff5f5" }}>
                      {info.badge}
                    </span>
                    {v.created_at && (Date.now() - new Date(v.created_at).getTime()) < 3 * 24 * 60 * 60 * 1000 && (
                      <span style={{ display: "inline-block", fontSize: "10px", color: "#fff", background: "#f97316", padding: "1px 6px", borderRadius: "4px", fontWeight: 800, letterSpacing: 0.5 }}>
                        New
                      </span>
                    )}
                    {cardMasked && <span onClick={(e) => { e.stopPropagation(); setIsAuthModalOpen(true); }} style={{ fontSize: "11px", color: "#3b82f6", fontWeight: 700, background: "#eef6ff", padding: "3px 8px", borderRadius: "4px", cursor: "pointer" }}>🔒 부동산회원 무료열람</span>}
                  </div>

                  {/* 주소 (타이틀) */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <p style={{ fontSize: "16px", fontWeight: 800, color: cardMasked ? "#bbb" : "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: cardMasked ? 1 : 0, margin: 0 }}>
                      {cardMasked ? (cardAddr || "주소 없음").replace(/[^\s]/g, "X") : cardAddr}
                    </p>
                  </div>

                  {/* 감정가 */}
                  <p style={{ fontSize: "17px", fontWeight: 800, color: "#1a73e8", marginBottom: "2px", margin: 0 }}>
                    감정가 <span style={{ fontWeight: 800, color: "#1a73e8" }}>{formatAmount(appraisalPrice)}</span>
                  </p>

                  {/* 최저입찰가 */}
                  {lowestBidText && (
                    <p style={{ fontSize: "16px", fontWeight: 800, color: "#ef4444", marginBottom: "4px", margin: 0 }}>
                      최저입찰가 <span style={{ fontSize: "17px" }}>{lowestBidText}</span>
                      {cardDiscountRate !== 0 && (
                        <span style={{ fontSize: "13px", fontWeight: 800, color: cardDiscountRate > 0 ? "#16a34a" : "#ef4444", marginLeft: "6px" }}>
                          {cardDiscountRate > 0 ? "▼" : "▲"}{Math.abs(cardDiscountRate)}%
                        </span>
                      )}
                    </p>
                  )}

                  {/* 입찰 시작일, 용도 및 정보 (동일 라인 배치 - 입찰일 전면 배치) */}
                  <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                    {bidStartText && (
                      <>
                        <span style={{ fontWeight: 700, color: "#4b5563" }}>입찰 {bidStartText}</span>
                        <span style={{ color: "#d1d5db" }}>|</span>
                      </>
                    )}
                    <span>{info.category} {info.area ? `| ${info.area}` : ""}</span>
                  </p>
                </div>

                {/* 썸네일 영역 */}
                {v.images?.[0] && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, alignSelf: "center" }}>
                    <div style={{ width: "120px", height: "96px", borderRadius: "10px", overflow: "hidden", backgroundColor: "#e5e7eb" }}>
                      <img src={v.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // 🔨 2. 일반 공실 광고 전용 카드 레이아웃
          return (
            <div
              key={v.id}
              className="v-card"
              onClick={() => { if (cardMasked) { setIsAuthModalOpen(true); return; } handleVacancyClick(v); }}
              style={{ display: "flex", gap: "12px", padding: "14px 0", borderBottom: "1px solid #f3f4f6", cursor: "pointer", transition: "background 0.15s" }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Badges & Date */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                  {showCommission && (v.realtor_commission || v.commission_type) && <span style={{ fontSize: "12px", fontWeight: 700, color: "#ef4444", border: "1px solid #ef4444", padding: "1px 6px", borderRadius: "3px" }}>{v.realtor_commission || v.commission_type}</span>}
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#ef4444" }}>{v.vacancy_no || '-'}</span>
                  <span style={{ fontSize: "12px", color: "#9ca3af" }}>{v.created_at ? new Date(v.created_at).toLocaleDateString("ko-KR").slice(0, -1) : ""}</span>
                  {cardMasked && <span onClick={(e) => { e.stopPropagation(); setIsAuthModalOpen(true); }} style={{ fontSize: "11px", color: "#3b82f6", fontWeight: 700, background: "#eef6ff", padding: "3px 8px", borderRadius: "4px", cursor: "pointer" }}>🔒 부동산회원 무료열람</span>}
                </div>

                {/* Title */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <p style={{ fontSize: "16px", fontWeight: 800, color: cardMasked ? "#bbb" : "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: cardMasked ? 1 : 0 }}>
                    {cardMasked ? (cardAddr || "주소 없음").replace(/[^\s]/g, "X") : cardAddr}
                  </p>
                </div>
                
                {/* Price (Blue) */}
                <p style={{ fontSize: "18px", fontWeight: 800, color: "#1a73e8", marginBottom: "6px" }}>
                  {v.trade_type} {formatPrice(v)}
                </p>
                
                {/* Specs 1: Type | Direction | Area */}
                <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {[v.property_type || "건물", v.direction, v.exclusive_m2 && `${v.exclusive_m2}㎡`].filter(Boolean).join(" | ")}
                </p>
                
                {/* Specs 2: Rooms, Options */}
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
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const GongsilMobileDrawerList = React.memo(GongsilMobileDrawerListImpl);
GongsilMobileDrawerList.displayName = "GongsilMobileDrawerList";
