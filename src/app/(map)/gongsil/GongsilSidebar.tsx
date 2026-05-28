import React, { useState, useMemo } from "react";
import { getCleanAddrText, getPriceText, getAuctionInfo, formatAmount } from "./gongsilHelpers";

type AuctionSortKey = "latest" | "appraisal" | "bid" | "bidDate";

interface GongsilSidebarProps {
  activeCategory: string;
  wishTab: "wish" | "recent";
  setWishTab: React.Dispatch<React.SetStateAction<"wish" | "recent">>;
  displayVacancies: any[];
  categories: any[];
  selectedCategoryId: string | null;
  setSelectedCategoryId: React.Dispatch<React.SetStateAction<string | null>>;
  zoomLevel: number;
  isAuctionMode: boolean;
  selectedClusterIds: string[] | null;
  visibleCount: number;
  setVisibleCount: React.Dispatch<React.SetStateAction<number>>;
  activeProperty: string | number | null;
  setActiveProperty: React.Dispatch<React.SetStateAction<string | number | null>>;
  showDetail: boolean;
  setShowDetail: React.Dispatch<React.SetStateAction<boolean>>;
  setPrevPropertyId: React.Dispatch<React.SetStateAction<string | number | null>>;
  setActiveDetailTab: React.Dispatch<React.SetStateAction<any>>;
  setGalleryIndex: React.Dispatch<React.SetStateAction<number>>;
  showArticleOnMap: (prop: any) => void;
  currentUser: any;
  userLevel: number;
  setIsAuthModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedVacancyId: React.Dispatch<React.SetStateAction<any>>;
  setShowCategoryModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function GongsilSidebar({
  activeCategory,
  wishTab,
  setWishTab,
  displayVacancies,
  categories,
  selectedCategoryId,
  setSelectedCategoryId,
  zoomLevel,
  isAuctionMode,
  selectedClusterIds,
  visibleCount,
  setVisibleCount,
  activeProperty,
  setActiveProperty,
  showDetail,
  setShowDetail,
  setPrevPropertyId,
  setActiveDetailTab,
  setGalleryIndex,
  showArticleOnMap,
  currentUser,
  userLevel,
  setIsAuthModalOpen,
  setSelectedVacancyId,
  setShowCategoryModal,
}: GongsilSidebarProps) {
  const [auctionSort, setAuctionSort] = useState<AuctionSortKey>("latest");

  const sortedVacancies = useMemo(() => {
    if (!isAuctionMode) return displayVacancies;
    const arr = [...displayVacancies];
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
  }, [displayVacancies, auctionSort, isAuctionMode]);
  return (
    <aside
      style={{
        width: 380,
        minWidth: 380,
        height: "100%",
        background: "#fff",
        borderRight: "1px solid #eee",
        display: "flex",
        flexDirection: "column",
        zIndex: 20,
      }}
    >
      {activeCategory === "wish" ? (
        <>
          <div style={{ display: "flex", width: "100%" }}>
            {["찜한물건", "최근본물건"].map((tab) => {
              const isTabActive =
                (tab === "찜한물건" && wishTab === "wish") ||
                (tab === "최근본물건" && wishTab === "recent");
              return (
                <div
                  key={tab}
                  onClick={() => setWishTab(tab === "찜한물건" ? "wish" : "recent")}
                  style={{
                    flex: 1,
                    padding: "14px 0",
                    textAlign: "center",
                    borderTop: "1px solid transparent",
                    borderBottom: isTabActive ? "none" : "1px solid #e0e0e0",
                    background: isTabActive ? "#1a73e8" : "#f5f5f5",
                    fontSize: 14,
                    cursor: "pointer",
                    color: isTabActive ? "#fff" : "#666",
                    fontWeight: isTabActive ? "bold" : "normal",
                  }}
                >
                  {tab}
                </div>
              );
            })}
          </div>
          <div
            style={{
              padding: "12px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid #f5f5f5",
            }}
          >
            <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#999" }}>
              <span style={{ color: "#1a73e8", fontWeight: "bold", cursor: "pointer" }}>가나다순</span>
              <span style={{ cursor: "pointer" }}>최근접수순</span>
            </div>
          </div>

          {wishTab === "wish" && (
            <div
              style={{
                display: "flex",
                overflowX: "auto",
                background: "#fff",
                borderBottom: "1px solid #e5e7eb",
                padding: "10px 16px",
                gap: "8px",
                WebkitOverflowScrolling: "touch",
              }}
              className="no-scrollbar"
            >
              <button
                onClick={() => setSelectedCategoryId("ALL")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: selectedCategoryId === "ALL" ? 700 : 500,
                  background: selectedCategoryId === "ALL" ? "#1e56a0" : "#f3f4f6",
                  color: selectedCategoryId === "ALL" ? "#fff" : "#4b5563",
                  border: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                전체
              </button>
              <button
                onClick={() => setSelectedCategoryId(null)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: selectedCategoryId === null ? 700 : 500,
                  background: selectedCategoryId === null ? "#1e56a0" : "#f3f4f6",
                  color: selectedCategoryId === null ? "#fff" : "#4b5563",
                  border: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                기본 폴더
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    fontSize: "13px",
                    fontWeight: selectedCategoryId === cat.id ? 700 : 500,
                    background: selectedCategoryId === cat.id ? "#1e56a0" : "#f3f4f6",
                    color: selectedCategoryId === cat.id ? "#fff" : "#4b5563",
                    border: "none",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          <div style={{ padding: "15px 20px 5px", fontWeight: "bold", fontSize: 14, color: "#111" }}>
            현재 화면 {displayVacancies.length}개
          </div>
        </>
      ) : (
        <div
          style={{
            padding: "12px 16px",
            fontWeight: 800,
            fontSize: 15,
            color: isAuctionMode ? "#1a4282" : "#111",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: isAuctionMode ? "2px solid #1a4282" : "1px solid #eee",
            flexShrink: 0,
            background: isAuctionMode ? "#e3ecf5" : "#fff",
          }}
        >
          <span>
            {zoomLevel >= 9 ? (
              "지도를 더 확대해 주세요"
            ) : (
              <>
                {isAuctionMode ? "해당 지역의 경/공매 매물" : selectedClusterIds && selectedClusterIds.length > 0 ? "선택된 공실" : "지도위의 공실"}{" "}
                {displayVacancies.length}개
              </>
            )}
          </span>
          {isAuctionMode && zoomLevel < 9 && (
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
      )}

      <div
        onScroll={(e) => {
          const target = e.currentTarget;
          if (target.scrollHeight - target.scrollTop <= target.clientHeight + 150) {
            if (sortedVacancies.length > visibleCount) {
              setVisibleCount((prev) => prev + 30);
            }
          }
        }}
        style={{ flex: 1, overflowY: "auto", padding: 0, background: "#fff" }}
      >
        {zoomLevel >= 9 && activeCategory !== "wish" ? (
          <div
            style={{
              padding: "80px 30px",
              textAlign: "center",
              color: "#64748b",
              background: "#f8fafc",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="11" y1="8" x2="11" y2="14"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}>지도를 조금만 더 확대해 주세요</div>
            <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
              지도를 조금만 더 확대하시면 해당 지역의
              <br />
              상세 매물 목록이 자동으로 표시됩니다.
            </div>
          </div>
        ) : displayVacancies.length === 0 ? (
          <div style={{ padding: "60px 40px", textAlign: "center", color: "#888", fontSize: 14 }}>
            {activeCategory === "wish"
              ? wishTab === "wish"
                ? "현재 등록된 관심 공실광고가 없습니다."
                : "최근 본 공실광고가 없습니다."
              : "조건에 맞는 공실광고가 없습니다."}
          </div>
        ) : (
          sortedVacancies.slice(0, visibleCount).map((prop) => {
            const isActiveAndShowing = activeProperty === prop.id && showDetail;
            const addrText = getCleanAddrText(prop);
            const meta = (prop as any).metadata || {};
            const appraisalPrice = meta.appraisal_price || parseInt(meta.apslEvlAmt || "0", 10) || prop.deposit * 10000;
            const lowestBidPrice = meta.lowest_bid_price || parseInt(meta.lowstBidPrcIndctCont || "0", 10) || 0;
            const lowestBidText =
              meta.lowstBidPrcIndctCont === "비공개" ? "비공개" : lowestBidPrice > 0 ? formatAmount(lowestBidPrice) : "";
            const cardDiscountRate = appraisalPrice > 0 ? Math.round(((appraisalPrice - lowestBidPrice) / appraisalPrice) * 100) : 0;
            const priceText = isAuctionMode ? `감정가 ${formatAmount(appraisalPrice)}` : getPriceText(prop);
            // 마스킹 판별: 부동산노출 전용 + 부동산회원 미만 (본인 등록 매물 제외)
            const isMyProperty = currentUser && prop && prop.owner_id === currentUser.id;
            const isMasked = prop.exposure_type === "부동산노출" && userLevel < 2 && !isMyProperty;
            const showCommission = userLevel >= 2; // 중개보수는 부동산회원 이상만

            return (
              <div
                key={prop.id}
                onClick={() => {
                  // 비공개 물건(부동산노출)은 부동산회원만 열람 가능
                  if (isMasked) {
                    setIsAuthModalOpen(true);
                    return;
                  }
                  if (isActiveAndShowing) {
                    setShowDetail(false);
                  } else {
                    setPrevPropertyId(null);
                    setActiveProperty(prop.id);
                    setShowDetail(true);
                    setActiveDetailTab(prop.trade_type === "경매" ? "auction_detail" : "info");
                    setGalleryIndex(0);
                    showArticleOnMap(prop);
                  }
                }}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  padding: "16px 20px 16px 16px",
                  cursor: "pointer",
                  transition: "background 0.2s, border-color 0.2s",
                  borderBottom: "1px solid #eee",
                  borderLeft: activeProperty === prop.id ? (isAuctionMode ? "4px solid #1a4282" : "4px solid #1a73e8") : "4px solid transparent",
                  background: activeProperty === prop.id ? (isAuctionMode ? "#e3ecf5" : "#eaf4ff") : "#fff",
                }}
              >
                <div style={{ flex: 1, paddingRight: prop.images?.[0] ? 15 : 0, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {isAuctionMode && (
                        <>
                          <span
                            style={{
                              display: "inline-block",
                              fontSize: 11,
                              color: "#fa5252",
                              border: "1px solid #fa5252",
                              padding: "1px 5px",
                              borderRadius: 4,
                              fontWeight: "bold",
                            }}
                          >
                            {getAuctionInfo(prop).badge}
                          </span>
                          {prop.created_at && (Date.now() - new Date(prop.created_at).getTime()) < 3 * 24 * 60 * 60 * 1000 && (
                            <span
                              style={{
                                display: "inline-block",
                                fontSize: 10,
                                color: "#fff",
                                background: "#f97316",
                                padding: "1px 6px",
                                borderRadius: 4,
                                fontWeight: 800,
                                letterSpacing: 0.5,
                              }}
                            >
                              New
                            </span>
                          )}
                        </>
                      )}
                      {showCommission && !isAuctionMode && (prop.realtor_commission || prop.commission_type) && (
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: 11,
                            color: "#fa5252",
                            border: "1px solid #fa5252",
                            padding: "1px 5px",
                            borderRadius: 4,
                            fontWeight: "bold",
                          }}
                        >
                          {prop.realtor_commission || prop.commission_type}
                        </span>
                      )}
                      {!isAuctionMode && (
                        <>
                          <span style={{ fontSize: 12, color: "#fa5252", fontWeight: "bold" }}>{prop.vacancy_no}</span>
                          <span style={{ fontSize: 12, color: "#aaa" }}>
                            {new Date(prop.created_at)
                              .toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
                              .replace(/\s/g, "")}
                          </span>
                        </>
                      )}
                      {isMasked && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsAuthModalOpen(true);
                          }}
                          style={{
                            fontSize: 11,
                            color: "#3b82f6",
                            fontWeight: 700,
                            background: "#eef6ff",
                            padding: "3px 8px",
                            borderRadius: 4,
                            cursor: "pointer",
                          }}
                        >
                          🔒 가입 시 무료 열람
                        </span>
                      )}
                    </div>
                    {activeCategory === "wish" && wishTab === "wish" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVacancyId(prop.id);
                          setShowCategoryModal(true);
                        }}
                        style={{
                          background: "#f3f4f6",
                          border: "none",
                          padding: "4px 10px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#4b5563",
                          cursor: "pointer",
                        }}
                      >
                        폴더 이동
                      </button>
                    )}
                  </div>

                  {/* 주소 영역: 마스킹 시 글자수에 맞춰 X로 대체 */}
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: "bold",
                      color: isMasked ? "#bbb" : "#111",
                      marginBottom: 4,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      letterSpacing: isMasked ? 1 : 0,
                    }}
                  >
                    {isMasked ? (addrText || "주소 없음").replace(/[^\s]/g, "X") : addrText || "주소 없음"}
                  </div>
                  {/* 가격, 면적, 옵션: 항상 정상 표시 */}
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: isAuctionMode ? "#1a4282" : "#1a73e8",
                      marginBottom: isAuctionMode && lowestBidText ? 0 : 4,
                    }}
                  >
                    {isAuctionMode ? (
                      <>
                        <span style={{ fontSize: 13, color: "#888", fontWeight: "normal", marginRight: 4 }}>감정가</span>
                        <span style={{ fontWeight: 800 }}>{formatAmount(appraisalPrice)}</span>
                      </>
                    ) : (
                      priceText
                    )}
                  </div>
                  {isAuctionMode && lowestBidText && (
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#fa5252", marginBottom: 4 }}>
                      최저입찰가 {lowestBidText}
                      {cardDiscountRate !== 0 && (
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color: cardDiscountRate > 0 ? "#16a34a" : "#fa5252",
                            marginLeft: 8,
                          }}
                        >
                          {cardDiscountRate > 0 ? "▼" : "▲"}
                          {Math.abs(cardDiscountRate)}%
                        </span>
                      )}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 13,
                      color: "#555",
                      marginBottom: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {prop.trade_type === "경매" ? (
                      (() => {
                        const info = getAuctionInfo(prop);
                        return (
                          <>
                            {info.category}
                            {info.area ? (
                              <>
                                <span style={{ color: "#ddd", margin: "0 4px" }}>|</span>
                                {info.area}
                              </>
                            ) : null}
                          </>
                        );
                      })()
                    ) : (
                      <>
                        {prop.property_type} <span style={{ color: "#ddd", margin: "0 4px" }}>|</span> {prop.direction || "방향없음"}{" "}
                        <span style={{ color: "#ddd", margin: "0 4px" }}>|</span> {prop.exclusive_m2 ? `${prop.exclusive_m2}㎡` : "면적미상"}
                      </>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#666",
                      marginBottom: prop.themes?.length ? 8 : 0,
                      display: "-webkit-box",
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {prop.trade_type === "경매"
                      ? [
                          (() => {
                            const av = meta.bldSqms || meta.cltrAr || prop.exclusive_m2;
                            return av ? `면적 ${parseFloat(av).toLocaleString()}㎡` : null;
                          })(),
                          meta.pblctBgnDtm || meta.bid_start_date
                            ? `입찰 ${(meta.pblctBgnDtm || meta.bid_start_date || "").substring(0, 10)}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "상세정보 확인"
                      : [`룸 ${prop.room_count || 0}개`, `욕실 ${prop.bathroom_count || 0}개`, ...(prop.options || [])]
                          .filter(Boolean)
                          .join(", ")}
                  </div>

                  {/* 테마 키워드 */}
                  {prop.themes && prop.themes.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: "auto" }}>
                      {prop.themes.map((theme: string, idx: number) => (
                        <span
                          key={idx}
                          style={{
                            background: "#f8fafc",
                            color: "#3b82f6",
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 12,
                            fontWeight: 700,
                            border: "1px solid #bfdbfe",
                          }}
                        >
                          {theme.startsWith("#") ? theme : `# ${theme}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                 {prop.images?.[0] && (
                  <div style={{ flexShrink: 0, marginLeft: 5, textAlign: "center", alignSelf: isAuctionMode ? "center" : "flex-start" }}>
                    <div style={{ width: isAuctionMode ? 130 : 110, height: isAuctionMode ? 100 : 110, borderRadius: 6, overflow: "hidden", background: "#f0f0f0" }}>
                      <img src={prop.images[0]} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    {isAuctionMode && (meta.cltrMngNo || meta.cltr_mng_no) && (
                      <div style={{ fontSize: 10, color: "#999", marginTop: 4, lineHeight: 1.2 }}>
                        {meta.cltrMngNo || meta.cltr_mng_no}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        {sortedVacancies.length > visibleCount && (
          <button
            onClick={() => setVisibleCount((prev) => prev + 30)}
            style={{
              width: "100%",
              padding: "16px",
              color: isAuctionMode ? "#1a4282" : "#1a73e8",
              border: "none",
              borderTop: "1px solid #eee",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = isAuctionMode ? "#e3ecf5" : "#eaf4ff")}
            onMouseOut={(e) => (e.currentTarget.style.background = "#f8fafc")}
          >
            더보기 ({sortedVacancies.length - visibleCount}개 남음)
          </button>
        )}
      </div>
    </aside>
  );
}
