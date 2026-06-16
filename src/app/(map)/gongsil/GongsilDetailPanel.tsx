import React from "react";
import Link from "next/link";
import {
  getCleanAddrText,
  getMaskedAddress,
  getPriceText,
  getAuctionInfo,
  formatAmount,
  getOptionSvg,
  isApartmentType,
} from "./gongsilHelpers";

interface GongsilDetailPanelProps {
  showDetail: boolean;
  activeProperty: string | number | null;
  dbVacancies: any[];
  fullDetailsMap: Record<string, any>;
  galleryIndex: number;
  setGalleryIndex: React.Dispatch<React.SetStateAction<number>>;
  prevPropertyId: string | number | null;
  setPrevPropertyId: React.Dispatch<React.SetStateAction<string | number | null>>;
  setActiveProperty: React.Dispatch<React.SetStateAction<string | number | null>>;
  setShowDetail: React.Dispatch<React.SetStateAction<boolean>>;
  activeDetailTab: "info" | "realtor" | "auction_detail" | "auction_property" | "auction_bid" | "auction_market";
  setActiveDetailTab: React.Dispatch<React.SetStateAction<"info" | "realtor" | "auction_detail" | "auction_property" | "auction_bid" | "auction_market">>;
  userLevel: number;
  handlePrint: (prop: any) => void;
  wishlist: any[];
  toggleWishlist: (id: any) => void;
  showShareDropdown: boolean;
  setShowShareDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  shareDropdownRef: React.RefObject<HTMLDivElement | null>;
  handleKakaoShare: (prop: any) => void;
  handleCopyUrl: (id: any) => void;
  itemMapRef: React.RefObject<HTMLDivElement | null>;
  roadviewRef: React.RefObject<HTMLDivElement | null>;
  comments: any[];
  currentUser: any;
  newComment: string;
  setNewComment: React.Dispatch<React.SetStateAction<string>>;
  isSecret: boolean;
  setIsSecret: React.Dispatch<React.SetStateAction<boolean>>;
  replyTarget: any;
  setReplyTarget: React.Dispatch<React.SetStateAction<any>>;
  handleCommentSubmit: () => void;
  agencyInfo: any;
  realtorTradeType: string;
  setRealtorTradeType: React.Dispatch<React.SetStateAction<string>>;
  openGalleryModal: () => void;
  isAuctionMode: boolean;
}

export default function GongsilDetailPanel({
  showDetail,
  activeProperty,
  dbVacancies,
  fullDetailsMap,
  galleryIndex,
  setGalleryIndex,
  prevPropertyId,
  setPrevPropertyId,
  setActiveProperty,
  setShowDetail,
  activeDetailTab,
  setActiveDetailTab,
  userLevel,
  handlePrint,
  wishlist,
  toggleWishlist,
  showShareDropdown,
  setShowShareDropdown,
  shareDropdownRef,
  handleKakaoShare,
  handleCopyUrl,
  itemMapRef,
  roadviewRef,
  comments,
  currentUser,
  newComment,
  setNewComment,
  isSecret,
  setIsSecret,
  replyTarget,
  setReplyTarget,
  handleCommentSubmit,
  agencyInfo,
  realtorTradeType,
  setRealtorTradeType,
  openGalleryModal,
  isAuctionMode,
}: GongsilDetailPanelProps) {
  if (!showDetail || !activeProperty) return null;

  const baseProp = dbVacancies.find((v) => v.id === activeProperty);
  if (!baseProp) return null;
  const fullProp = fullDetailsMap[activeProperty] || {};
  const prop = { ...baseProp, ...fullProp }; // Lazy-loaded fields overlay

  const images = prop.images && prop.images.length > 0 ? prop.images : [""];

  const renderCommentArea = (targetProp: any) => {
    const rootComments = comments.filter((c) => !c.parent_id);
    const getChildren = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

    const renderComment = (comment: any, depth: number = 0) => {
      const children = getChildren(comment.id);
      const isCommentOwner = currentUser?.id === comment.author_id;
      const isPropertyOwner = currentUser?.id === targetProp.owner_id;
      const canView = !comment.is_secret || isCommentOwner || isPropertyOwner;

      const dateStr = new Date(comment.created_at)
        .toLocaleString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
        .replace(/\.$/, "");

      return (
        <div
          key={comment.id}
          id={`comment-${comment.id}`}
          style={{
            paddingLeft: depth > 0 ? 30 : 0,
            paddingBottom: 20,
            paddingTop: 20,
            borderBottom: depth === 0 ? "1px solid #f0f0f0" : "none",
          }}
        >
          {/* 작성자 정보 & 날짜 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {depth > 0 && <span style={{ color: "#aaa", fontWeight: "bold" }}>↳</span>}
              {/* 프로필 아바타 원형 */}
              {comment.profile_image_url ? (
                <img
                  src={comment.profile_image_url}
                  alt=""
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    objectFit: "cover",
                    flexShrink: 0,
                    border: "1px solid #e5e7eb",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: depth > 0 ? "#e8f0fe" : "#f0f4f8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    color: depth > 0 ? "#508bf5" : "#666",
                    flexShrink: 0,
                  }}
                >
                  {(comment.author_name || "회")[0]}
                </div>
              )}
              <span style={{ fontSize: 14, fontWeight: "bold", color: "#111" }}>
                {comment.author_name || "회원"}
              </span>
              {comment.is_secret && (
                <span
                  style={{
                    fontSize: 10,
                    color: "#ef4444",
                    border: "1px solid #fca5a5",
                    padding: "1px 4px",
                    borderRadius: 4,
                    fontWeight: "bold",
                  }}
                >
                  비밀글
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>{dateStr}</div>
          </div>

          {/* 댓글 내용 */}
          <div
            style={{
              fontSize: 14,
              color: canView ? "#333" : "#999",
              lineHeight: 1.6,
              marginBottom: 12,
              wordBreak: "break-word",
            }}
          >
            {canView ? comment.content : "등록자와 작성자만 볼 수 있는 비밀글입니다."}
          </div>

          {/* 하단 액션 버튼 */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              style={{
                background: "none",
                border: "none",
                padding: 0,
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                color: "#666",
              }}
            >
              <span style={{ fontSize: 14 }}>👍</span>
              <span style={{ fontSize: 13, fontWeight: "bold" }}>0</span>
            </button>
            <button
              style={{
                background: "none",
                border: "none",
                padding: 0,
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                color: "#666",
              }}
            >
              <span style={{ fontSize: 14 }}>👎</span>
              <span style={{ fontSize: 13, fontWeight: "bold" }}>0</span>
            </button>
            {currentUser && canView && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (replyTarget?.id === comment.id) {
                    setReplyTarget(null);
                  } else {
                    setReplyTarget(comment);
                    setIsSecret(comment.is_secret); // 부모 답글 비밀 여부 연동
                  }
                }}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: 13,
                  color: "#666",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                답글
              </button>
            )}
          </div>

          {/* 인라인 답글 폼 */}
          {replyTarget && replyTarget.id === comment.id && (
            <div style={{ marginTop: 16, background: "#f8f9fa", borderRadius: 8, border: "1px solid #e5e7eb", padding: 16 }}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value.substring(0, 400))}
                placeholder="답글을 남겨보세요"
                style={{
                  width: "100%",
                  height: 80,
                  border: "1px solid #d1d5db",
                  borderRadius: 4,
                  padding: "12px",
                  fontSize: 14,
                  outline: "none",
                  resize: "vertical",
                  marginBottom: 12,
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "#555" }}>
                  <input
                    type="checkbox"
                    checked={isSecret}
                    onChange={(e) => setIsSecret(e.target.checked)}
                    style={{ width: 14, height: 14 }}
                  />
                  비밀답글
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setReplyTarget(null)}
                    style={{
                      padding: "8px 16px",
                      background: "#fff",
                      color: "#555",
                      border: "1px solid #d1d5db",
                      borderRadius: 4,
                      fontWeight: "bold",
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    취소
                  </button>
                  <button
                    onClick={handleCommentSubmit}
                    disabled={!newComment.trim()}
                    style={{
                      padding: "8px 16px",
                      background: newComment.trim() ? "#9ca3af" : "#cbd5e1",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      fontWeight: "bold",
                      cursor: newComment.trim() ? "pointer" : "default",
                      fontSize: 13,
                    }}
                  >
                    답글 등록
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 대댓글 렌더링 */}
          <div>{children.map((child) => renderComment(child, depth + 1))}</div>
        </div>
      );
    };

    return (
      <div style={{ marginTop: 20, borderTop: "10px solid #f5f5f5", padding: "30px 20px 40px" }}>
        {/* 헤더 */}
        <div style={{ fontSize: 16, fontWeight: 800, color: "#222", marginBottom: 20 }}>
          {comments.length}개의 댓글상담
        </div>

        {/* 입력창 (일반 기사 형태) */}
        {!replyTarget && (
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 20,
              marginBottom: 40,
              background: "#fff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: "bold",
                color: "#111",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {currentUser
                ? currentUser.user_metadata?.full_name ||
                  currentUser.user_metadata?.name ||
                  currentUser.email?.split("@")[0] ||
                  "회원"
                : "비회원"}
            </div>

            <textarea
              id="gongsil-comment-input"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value.substring(0, 400))}
              placeholder={
                currentUser
                  ? "가격을 제안하거나, 궁금한 점을 남겨보세요. 등록자와의 1:1 상담입니다."
                  : "로그인 후 이용하실 수 있습니다."
              }
              disabled={!currentUser}
              style={{
                width: "100%",
                height: 80,
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                padding: "12px",
                fontSize: 14,
                outline: "none",
                resize: "vertical",
                marginBottom: 16,
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: 13, color: "#666", fontWeight: "bold" }}>
                  <span style={{ color: "#111" }}>{newComment.length}</span> / 400
                </span>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "#555" }}>
                  <input
                    type="checkbox"
                    checked={isSecret}
                    onChange={(e) => setIsSecret(e.target.checked)}
                    style={{ width: 14, height: 14 }}
                  />
                  비밀댓글
                </label>
              </div>
              <button
                onClick={handleCommentSubmit}
                disabled={!currentUser || !newComment.trim()}
                style={{
                  padding: "8px 24px",
                  background: currentUser && newComment.trim() ? "#9ca3af" : "#cbd5e1", // 기사의 등록버튼 색상
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  fontWeight: "bold",
                  cursor: currentUser && newComment.trim() ? "pointer" : "default",
                  fontSize: 14,
                }}
              >
                등록
              </button>
            </div>
          </div>
        )}

        {/* 댓글 리스트 */}
        <div>
          {comments.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#888", fontSize: 13 }}>아직 등록된 문의가 없습니다.</div>
          ) : (
            <div>{rootComments.map((c) => renderComment(c, 0))}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        position: "absolute",
        left: 380,
        top: 0,
        width: 600,
        height: "100%",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid #eee",
        zIndex: 1100,
        boxShadow: "5px 0 15px rgba(0,0,0,0.15)",
      }}
    >
      {/* 닫기 버튼 */}
      <button
        onClick={() => setShowDetail(false)}
        style={{
          position: "absolute",
          top: 15,
          right: 15,
          width: 30,
          height: 30,
          background: "rgba(255,255,255,0.8)",
          border: "1px solid #ddd",
          borderRadius: "50%",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          fontWeight: "bold",
          color: "#333",
          zIndex: 100,
        }}
      >
        ×
      </button>

      {/* 뒤로가기 버튼 탭 */}
      {prevPropertyId && (
        <div
          onClick={() => {
            setActiveProperty(prevPropertyId);
            setActiveDetailTab("realtor");
            setPrevPropertyId(null);
          }}
          style={{
            position: "absolute",
            left: -28,
            top: "50%",
            transform: "translateY(-50%)",
            width: 28,
            height: 60,
            background: "#fff",
            border: "1px solid #eee",
            borderRight: "none",
            borderRadius: "6px 0 0 6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "-3px 0 6px rgba(0,0,0,0.04)",
            zIndex: 26,
            color: "#666",
            fontSize: 20,
            fontWeight: "bold",
          }}
          title="등록자 정보(이전 공실광고)로 돌아가기"
        >
          ‹
        </div>
      )}

      <div id="detail-scroll-container" style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {/* 갤러리 */}
        {prop.images && prop.images.length > 0 && prop.images[0] && (
          <div style={{ position: "relative", width: "100%", height: 200, background: "#f0f0f0" }}>
            <img
              src={images[galleryIndex]}
              onClick={() => openGalleryModal()}
              style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setGalleryIndex(Math.max(0, galleryIndex - 1))}
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: 0,
                    transform: "translateY(-50%)",
                    background: "rgba(0,0,0,0.2)",
                    color: "#fff",
                    border: "none",
                    fontSize: 18,
                    padding: "10px 6px",
                    cursor: "pointer",
                    borderRadius: "0 4px 4px 0",
                  }}
                >
                  〈
                </button>
                <button
                  onClick={() => setGalleryIndex(Math.min(images.length - 1, galleryIndex + 1))}
                  style={{
                    position: "absolute",
                    top: "50%",
                    right: 0,
                    transform: "translateY(-50%)",
                    background: "rgba(0,0,0,0.2)",
                    color: "#fff",
                    border: "none",
                    fontSize: 18,
                    padding: "10px 6px",
                    cursor: "pointer",
                    borderRadius: "4px 0 0 4px",
                  }}
                >
                  〉
                </button>
                <div
                  style={{
                    position: "absolute",
                    bottom: 15,
                    right: 15,
                    background: "rgba(0,0,0,0.6)",
                    color: "#fff",
                    fontSize: 11,
                    padding: "4px 12px",
                    borderRadius: 20,
                  }}
                >
                  {galleryIndex + 1}/{images.length}
                </div>
              </>
            )}
          </div>
        )}

        {/* 헤더 정보 */}
        <div style={{ padding: "40px 20px 20px 20px", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingRight: 30 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {userLevel >= 2 && !isAuctionMode && (prop.realtor_commission || prop.commission_type) && (
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: "bold",
                    color: "#ff5a5f",
                    border: "1px solid #ff5a5f",
                    padding: "2px 6px",
                    borderRadius: 2,
                  }}
                >
                  {prop.realtor_commission || prop.commission_type}
                </span>
              )}
              {prop.trade_type === "경매" && (
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: "bold",
                    color: "#fa5252",
                    border: "1px solid #fa5252",
                    padding: "2px 6px",
                    borderRadius: 2,
                  }}
                >
                  {getAuctionInfo(prop).badge}
                </span>
              )}
              {prop.trade_type === "경매" ? (
                <span style={{ fontSize: 13, color: "#888" }}>{(prop as any).metadata?.cltrMngNo || ""}</span>
              ) : (
                <>
                  <span style={{ color: "#e53e3e", fontSize: 14, fontWeight: "bold" }}>{prop.vacancy_no}</span>
                  <span style={{ fontSize: 12, color: "#888" }}>{new Date(prop.created_at).toLocaleDateString()}</span>
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, fontSize: 11 }}>
              <button
                onClick={() => alert("준비중입니다.")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#ff5a5f",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: 0,
                  fontSize: 11,
                }}
              >
                ● 허위공실광고신고
              </button>
              <button
                onClick={() => handlePrint(prop)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#666",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: 0,
                  fontSize: 11,
                }}
              >
                🖨 인쇄
              </button>
            </div>
          </div>
          <h2 style={{ fontSize: 15, fontWeight: "bold", color: "#333", margin: "0 0 6px 0" }}>{getCleanAddrText(prop)}</h2>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {prop.trade_type === "경매" ? (
              (() => {
                const dm = (prop as any).metadata || {};
                const ap = dm.appraisal_price || parseInt(dm.apslEvlAmt || "0", 10) || 0;
                const lp = dm.lowest_bid_price || parseInt(dm.lowstBidPrcIndctCont || "0", 10) || 0;
                const lpText = dm.lowstBidPrcIndctCont === "비공개" ? "비공개" : lp > 0 ? formatAmount(lp) : "-";
                const pbct = dm.pbctCnt || dm.pbct_cnt || "0";
                const discountRate = ap > 0 ? Math.round(((ap - lp) / ap) * 100) : 0;
                const fmtP = (v: number) => {
                  if (!v) return "-";
                  if (v >= 100000000) {
                    const e = Math.floor(v / 100000000);
                    const m = Math.round((v % 100000000) / 10000);
                    return m > 0 ? `${e}억 ${m.toLocaleString()}만` : `${e}억`;
                  }
                  return `${Math.round(v / 10000).toLocaleString()}만`;
                };
                return (
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
                      <div>
                        <span style={{ fontSize: 13, color: "#888" }}>감정가 </span>
                        <span style={{ fontWeight: 800, fontSize: 20, color: isAuctionMode ? "#1a4282" : "#1f5edb" }}>{fmtP(ap)}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: 13, color: "#888" }}>최저입찰가 </span>
                        <span style={{ fontWeight: 800, fontSize: 20, color: "#fa5252" }}>{lpText}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: 13, color: "#888" }}>유찰 </span>
                        <span style={{ fontWeight: 700, fontSize: 16, color: "#333" }}>{pbct}회</span>
                      </div>
                      {discountRate !== 0 && (
                        <div>
                          <span
                            style={{
                              fontWeight: 800,
                              fontSize: 16,
                              color: discountRate > 0 ? "#16a34a" : "#fa5252",
                            }}
                          >
                            {discountRate > 0 ? "▼" : "▲"}
                            {Math.abs(discountRate)}%
                          </span>
                        </div>
                      )}
                      {(dm.bid_start_date || dm.pblctBgnDtm) && (
                        <div>
                          <span style={{ fontSize: 13, color: "#888" }}>입찰시작 </span>
                          <span style={{ fontWeight: 700, fontSize: 14, color: "#333" }}>
                            {(dm.bid_start_date || dm.pblctBgnDtm || "").substring(0, 10)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : (
              <h1 style={{ fontSize: 26, fontWeight: 800, color: isAuctionMode ? "#1a4282" : "#1f5edb", margin: 0 }}>{getPriceText(prop)}</h1>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6, position: "relative" }}>
              <button
                onClick={() => toggleWishlist(prop.id)}
                style={{
                  background: "none",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  width: 34,
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: wishlist.includes(prop.id) ? "#1a73e8" : "#666",
                }}
                title={wishlist.includes(prop.id) ? "관심공실광고 해제" : "관심공실광고 등록"}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill={wishlist.includes(prop.id) ? "#1a73e8" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
              </button>
              <button
                onClick={() => setShowShareDropdown(!showShareDropdown)}
                style={{
                  background: "none",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  width: 34,
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: showShareDropdown ? "#1a73e8" : "#666",
                }}
                title="공유하기"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
              </button>
              {/* 공유 드롭다운 */}
              {showShareDropdown && (
                <div
                  ref={shareDropdownRef}
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: 8,
                    background: "#fff",
                    border: "1px solid #e0e0e0",
                    borderRadius: 10,
                    boxShadow: "0 6px 24px rgba(0,0,0,0.15)",
                    width: 200,
                    zIndex: 9999,
                    overflow: "hidden",
                    animation: "dropdownFadeIn 0.15s ease",
                  }}
                >
                  <button
                    onClick={() => handleKakaoShare(prop)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 16px",
                      background: "none",
                      border: "none",
                      borderBottom: "1px solid #f0f0f0",
                      cursor: "pointer",
                      fontSize: 14,
                      color: "#333",
                      fontFamily: "inherit",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8f9fa")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "#FEE500",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#3C1E1E">
                        <path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.8 5.2 4.4 6.5l-1 3.7c-.1.3.3.6.5.4l4.3-2.9c.6.1 1.2.1 1.8.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z"></path>
                      </svg>
                    </div>
                    <span style={{ fontWeight: 600 }}>카카오톡 공유</span>
                  </button>
                  <button
                    onClick={() => handleCopyUrl(prop.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 16px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 14,
                      color: "#333",
                      fontFamily: "inherit",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8f9fa")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "#f0f0f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                      </svg>
                    </div>
                    <span style={{ fontWeight: 600 }}>URL 복사</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          {prop.trade_type === "경매" ? (
            (() => {
              const info = getAuctionInfo(prop);
              return (
                <div style={{ fontSize: 13, color: "#555", marginTop: 4, marginBottom: 12 }}>
                  {info.category}
                  {prop.direction && prop.direction !== "방향없음" && prop.direction !== "남향" && <> · {prop.direction}</>}
                  {info.area && <> · 면적: {info.area}</>}
                </div>
              );
            })()
          ) : (
            <>
              <div style={{ fontSize: 13, color: "#555", marginTop: 4, marginBottom: 12 }}>
                {prop.property_type} · {prop.direction || "방향없음"} · {prop.trade_type === "매매" && ((prop.property_type === "빌라·주택" && ["단독/다가구", "전원주택", "상가주택"].includes(prop.sub_category)) || (prop.property_type === "상가·사무실·건물·공장·토지" && ["건물/빌딩", "공장/창고"].includes(prop.sub_category))) ? `연면적: ${prop.supply_m2 || 0}㎡` : `공급/전용 면적: ${prop.supply_m2 || 0}㎡ / ${prop.exclusive_m2 || 0}㎡`}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 13, color: "#555" }}>
                <span>룸 {prop.room_count || 0}개</span>
                <span style={{ width: 1, height: 10, background: "#ddd", display: "inline-block" }}></span>
                <span>주차 {prop.parking_count ? `${prop.parking_count}대` : "정보없음"}</span>
                <span style={{ width: 1, height: 10, background: "#ddd", display: "inline-block" }}></span>
                <span>{prop.options?.join(", ") || "옵션없음"}</span>
              </div>
            </>
          )}
          {/* 테마 키워드 */}
          {prop.themes && prop.themes.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {prop.themes.map((theme: string, idx: number) => (
                <span
                  key={idx}
                  style={{
                    background: "#f8fafc",
                    color: "#3b82f6",
                    fontSize: 13,
                    padding: "4px 12px",
                    borderRadius: 16,
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

        {/* 탭 */}
        <div style={{ display: "flex", borderBottom: "1px solid #ddd", margin: 0 }}>
          {prop.trade_type === "경매" ? (
            <>
              {([
                { key: "auction_detail", label: "세부정보" },
                { key: "auction_property", label: "재산정보" },
                { key: "auction_bid", label: "입찰정보" },
                { key: "auction_market", label: "인근시세" },
              ] as const).map((tab) => (
                <div
                  key={tab.key}
                  onClick={() => setActiveDetailTab(tab.key)}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "14px 0",
                    fontSize: 14,
                    fontWeight: "bold",
                    cursor: "pointer",
                    color: activeDetailTab === tab.key ? (isAuctionMode ? "#1a4282" : "#1a73e8") : "#888",
                    borderBottom: activeDetailTab === tab.key ? (isAuctionMode ? "2px solid #1a4282" : "2px solid #1a73e8") : "2px solid transparent",
                  }}
                >
                  {tab.label}
                </div>
              ))}
            </>
          ) : (
            (["info", "realtor"] as const).map((tab) => (
              <div
                key={tab}
                onClick={() => setActiveDetailTab(tab)}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "14px 0",
                  fontSize: 15,
                  fontWeight: "bold",
                  cursor: "pointer",
                  color: activeDetailTab === tab ? "#111" : "#888",
                  borderBottom: activeDetailTab === tab ? "2px solid #111" : "2px solid transparent",
                }}
              >
                {tab === "info" ? "공실광고정보" : "등록자정보"}
              </div>
            ))
          )}
        </div>

        {/* 공실광고정보 탭 */}
        {activeDetailTab === "info" && (
          <>
            {prop.trade_type === "경매" ? (
              <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", borderBottom: "10px solid #f5f5f5" }}>
                <div style={{ fontSize: 13, color: "#444", background: "#f4f6fa", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>경매물건번호</div>
                <div style={{ fontSize: 14, color: "#222", fontWeight: "bold", padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{prop.vacancy_no}</div>
                <div style={{ fontSize: 13, color: "#444", background: "#f4f6fa", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>소재지</div>
                <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{[prop.sido, prop.sigungu, prop.dong, prop.detail_addr].filter(Boolean).join(" ")}</div>
                <div style={{ fontSize: 13, color: "#444", background: "#f4f6fa", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>용도구분</div>
                <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{prop.property_type || "-"}</div>
                <div style={{ fontSize: 13, color: "#444", background: "#f4f6fa", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>감정평가액</div>
                <div style={{ fontSize: 15, color: isAuctionMode ? "#1a4282" : "#1a73e8", fontWeight: "800", padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{formatAmount(prop.trade_type === "경매" ? prop.deposit * 10000 : prop.deposit)}</div>
                <div style={{ fontSize: 13, color: "#444", background: "#f4f6fa", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>면적</div>
                <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{prop.exclusive_m2 ? `${prop.exclusive_m2}m² (${Math.round(prop.exclusive_m2 / 3.3)}평)` : "-"}</div>
                <div style={{ fontSize: 13, color: "#444", background: "#f4f6fa", fontWeight: "bold", display: "flex", alignItems: "flex-start", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>입찰 및 설명</div>
                <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all", whiteSpace: "pre-line" }}>{prop.description || "-"}</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 110px 1fr", borderBottom: "10px solid #f5f5f5" }}>
                <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>공실광고번호</div>
                <div style={{ fontSize: 14, color: "#222", fontWeight: "bold", padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all", gridColumn: "span 3" }}>{prop.vacancy_no}</div>
                <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>소재지</div>
                <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all", gridColumn: "span 3" }}>
                  {getMaskedAddress(prop)}
                  {(() => {
                    const exp = prop.address_exposure;
                    const propType = prop.property_type || "";
                    const subCategory = prop.sub_category || "";
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
                    const formatManwon = (val: number | string | null | undefined): string => {
                      if (val === undefined || val === null) return "-";
                      const num = typeof val === "string" ? parseInt(val, 10) : val;
                      if (isNaN(num) || num <= 0) return "-";
                      
                      const eok = Math.floor(num / 10000);
                      const man = num % 10000;
                      
                      let result = "";
                      if (eok > 0) result += `${eok}억`;
                      if (man > 0) {
                        const formattedMan = man.toLocaleString("ko-KR");
                        result += (result ? " " : "") + `${formattedMan}만`;
                      }
                      return result + "원";
                    };

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
                      value: v.maintenance_fee ? `${Math.round(v.maintenance_fee / 10000)}만원` : "없음"
                    });

                    // 2. 용도지역 (토지/상업용)
                    const isVillaHouse = propType.includes("빌라") || propType.includes("주택") || propType.includes("원룸") || propType.includes("상가주택");
                    const isCommercial = propType.includes("상가") || propType.includes("사무실") || propType.includes("공장") || propType.includes("창고") || propType.includes("건물") || propType.includes("빌딩") || propType.includes("지식산업센터") || subCategory.includes("토지");
                    if ((isCommercial || subCategory === "토지") && meta.land_use_region) {
                      fields.push({ label: "용도지역", value: meta.land_use_region });
                    }

                    // 3. 지목 (토지)
                    if (subCategory === "토지" && meta.land_category) {
                      fields.push({ label: "지목", value: meta.land_category });
                    }

                    // 4. 준공연도
                    if (meta.completion_year) {
                      fields.push({ label: "준공연도", value: `${meta.completion_year}년` });
                    }

                    // 5. 주용도 (상업용)
                    if (isCommercial && meta.primary_usage) {
                      fields.push({ label: "주용도", value: meta.primary_usage });
                    }

                    // 6. 건물구조 (상업용)
                    if (isCommercial && meta.building_structure) {
                      fields.push({ label: "건물구조", value: meta.building_structure });
                    }

                    // 7. 건물규모 (건물/빌딩, 공장/창고)
                    const hasScale = (isVillaHouse && ["단독/다가구", "전원주택", "상가주택"].includes(subCategory)) ||
                                     (isCommercial && ["건물/빌딩", "공장/창고"].includes(subCategory));
                    if (hasScale) {
                      const parts = [];
                      if (meta.underground_floors) parts.push(`지하 ${meta.underground_floors}층`);
                      if (meta.aboveground_floors) parts.push(`지상 ${meta.aboveground_floors}층`);
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
                        value: `${v.current_floor || "-"} / ${v.total_floor || v.floor || "-"}`
                      });
                    }

                    // 13. 방/욕실수 (주거형)
                    if (!isCommercial) {
                      fields.push({
                        label: "방/욕실수",
                        value: `${v.room_count || 0}개 / ${v.bathroom_count || v.bath_count || 0}개`
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

                    // 19-1. 도로방향 (건물/빌딩, 공장/창고 매매)
                    if (isCommercial && meta.road_direction) {
                      fields.push({ label: "도로방향", value: meta.road_direction });
                    }

                    // 19-2. 권리금 (상가)
                    if (isCommercial && subCategory === "상가" && meta.premium_fee) {
                      fields.push({ label: "권리금", value: formatManwon(meta.premium_fee) });
                    }

                    // 19-3. 현재임대 보증금/월세 (건물 매매)
                    if (tradeType === "매매" && isCommercial && (meta.current_rental_deposit || meta.current_rental_monthly)) {
                      const rentalDep = meta.current_rental_deposit ? formatManwon(meta.current_rental_deposit) : "-";
                      const rentalMon = meta.current_rental_monthly ? formatManwon(meta.current_rental_monthly) : "-";
                      fields.push({ label: "현재임대 보증금/월세", value: `${rentalDep} / ${rentalMon}` });
                    }

                    // 19-4. 융자금/대출이율 (매매)
                    if (tradeType === "매매" && meta.loan_amount) {
                      const loanText = formatManwon(meta.loan_amount);
                      const rateText = meta.loan_rate ? ` (연 ${meta.loan_rate}%)` : "";
                      fields.push({ label: "융자금", value: `${loanText}${rateText}` });
                    }

                    // 19-7. 수익률 계산 및 추가 (매매이고 임대 월세 정보가 있으며, 매매가가 0보다 큰 경우)
                    if (tradeType === "매매" && meta.current_rental_monthly && parseFloat(meta.current_rental_monthly) > 0 && v.deposit && parseFloat(v.deposit) > 0) {
                      const monthlyRent = parseFloat(meta.current_rental_monthly);
                      const salePrice = parseFloat(v.deposit) / 10000; // deposit is in won, convert to manwon
                      const simpleYield = ((monthlyRent * 12) / salePrice) * 100;
                      fields.push({
                        label: "단순 수익률",
                        value: `연 ${simpleYield.toFixed(2)}%`
                      });

                      // 실투자 수익률 (융자금 및 대출이율이 있는 경우)
                      if (meta.loan_amount && meta.loan_rate && parseFloat(meta.loan_amount) > 0 && parseFloat(meta.loan_rate) > 0) {
                        const tenantDeposit = parseFloat(meta.current_rental_deposit || "0");
                        const loan = parseFloat(meta.loan_amount);
                        const rate = parseFloat(meta.loan_rate);
                        const monthlyInterest = loan * (rate / 100) / 12;
                        const netMonthly = monthlyRent - monthlyInterest;
                        const realInvestment = salePrice - tenantDeposit - loan;
                        
                        if (realInvestment > 0) {
                          const leveragedYield = (netMonthly * 12 / realInvestment) * 100;

                          fields.push({
                            label: "실투자 수익률",
                            value: `연 ${leveragedYield.toFixed(2)}% (실투자금: ${formatManwon(realInvestment)})`
                          });
                        }
                      }
                    }

                    // 19-5. 지형/형상 (토지)
                    if (subCategory === "토지" && meta.terrain) {
                      fields.push({ label: "지형/형상", value: meta.terrain });
                    }

                    // 19-6. 개발가능 여부 (토지)
                    if (subCategory === "토지" && meta.development_potential) {
                      fields.push({ label: "개발가능", value: meta.development_potential });
                    }

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

                    const filteredFields = fields.filter(field => {
                      const isRequired = [
                        "공실광고번호",
                        "소재지",
                        "단지명",
                        "건물명",
                        "동/호수",
                        "거래구분",
                        "금액",
                        "공급/전용면적",
                        "연면적",
                        "관리비",
                        "입주가능일",
                        "사용 가능일"
                      ].includes(field.label);
                      if (isRequired) return true;

                      const val = field.value?.trim();
                      return val && val !== "-" && val !== "없음" && val !== "0/0" && val !== "0층 / 0층" && val !== "지하 0층 / 지상 0층" && val !== "-개 / -개";
                    });

                    return filteredFields;
                  };

                  const fields = getDynamicFields(prop);
                  const pairedRows: { f1: typeof fields[0]; f2?: typeof fields[0] }[] = [];
                  for (let i = 0; i < fields.length; i += 2) {
                    pairedRows.push({
                      f1: fields[i],
                      f2: fields[i + 1]
                    });
                  }

                  return (
                    <>
                      {pairedRows.map((row, idx) => (
                        <React.Fragment key={idx}>
                          <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>{row.f1.label}</div>
                          <div style={{
                            fontSize: 14,
                            color: "#222",
                            fontWeight: 500,
                            padding: "16px 20px 16px 16px",
                            borderBottom: "1px solid #eee",
                            borderRight: row.f2 ? "1px solid #eee" : undefined,
                            lineHeight: 1.6,
                            wordBreak: "break-all",
                            gridColumn: row.f2 ? undefined : "span 3"
                          }}>{row.f1.value}</div>
                          {row.f2 && (
                            <>
                              <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "center", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>{row.f2.label}</div>
                              <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all" }}>{row.f2.value}</div>
                            </>
                          )}
                        </React.Fragment>
                      ))}
                    </>
                  );
                })()}
                <div style={{ fontSize: 13, color: "#444", background: "#f4f5f7", fontWeight: "bold", display: "flex", alignItems: "flex-start", padding: "16px 12px 16px 20px", borderBottom: "1px solid #eee" }}>상세설명</div>
                <div style={{ fontSize: 14, color: "#222", fontWeight: 500, padding: "16px 20px 16px 16px", borderBottom: "1px solid #eee", lineHeight: 1.6, wordBreak: "break-all", whiteSpace: "pre-line", gridColumn: "span 3" }}>{prop.description || "-"}</div>
              </div>
            )}

            {/* ──── 위치정보 ──── */}
            <div style={{ padding: "30px 20px 0" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#222", marginBottom: 12 }}>위치정보</div>
              <div
                ref={itemMapRef}
                style={{
                  width: "100%",
                  height: 300,
                  borderRadius: 8,
                  marginBottom: 20,
                  background: "#e8eaed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#999",
                  fontSize: 14,
                  border: "1px solid #eee",
                  overflow: "hidden",
                }}
              ></div>
            </div>

            {/* ──── 로드뷰 ──── */}
            <div style={{ padding: "0 20px" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#222", marginBottom: 12 }}>로드뷰</div>
              <div
                ref={roadviewRef}
                style={{
                  width: "100%",
                  height: 300,
                  borderRadius: 8,
                  marginBottom: 20,
                  background: "#e8eaed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#999",
                  fontSize: 14,
                  border: "1px solid #eee",
                  overflow: "hidden",
                }}
              ></div>
            </div>

            {/* ──── 옵션 ──── */}
            {prop.options && prop.options.length > 0 && (
              <div style={{ padding: "10px 20px 20px" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#222", marginBottom: 20 }}>옵션</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 30 }}>
                  {prop.options.map((optName: string, idx: number) => (
                    <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, minWidth: 50 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44 }}>
                        {getOptionSvg(optName)}
                      </div>
                      <span style={{ fontSize: 13, color: "#333", fontWeight: "bold", textAlign: "center", whiteSpace: "nowrap" }}>
                        {optName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ──── 주변환경 (인프라) ──── */}
            {prop.infrastructure && Object.keys(prop.infrastructure).filter((k) => !k.startsWith("_")).length > 0 && (
              <div style={{ padding: "10px 20px 20px" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#222", marginBottom: 20, borderTop: "1px dashed #eee", paddingTop: 20 }}>
                  주변환경
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {Object.entries(prop.infrastructure)
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
                              <div key={idx} style={{ fontSize: 13, color: "#333", background: "#f5f5f5", padding: "4px 10px", borderRadius: 4 }}>
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
            {renderCommentArea(prop)}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* ══ 경공매 전용 4탭 콘텐츠 (metadata 기반) ══ */}
        {/* ══════════════════════════════════════════════════════════ */}

        {/* 경매 세부정보 탭 */}
        {activeDetailTab === "auction_detail" && prop.trade_type === "경매" && (
          (() => {
            const meta = (prop as any).metadata || {};
            const ldSqms = meta.ldSqms || meta.ld_sqms || "";
            const bldSqms = meta.bldSqms || meta.bld_sqms || "";
            const usageLcls = meta.cltrUsgLclsCtgrNm || "";
            const usageMcls = meta.cltrUsgMclsCtgrNm || "";
            const usageScls = meta.cltrUsgSclsCtgrNm || "";
            const usageText = [usageLcls, usageMcls, usageScls].filter(Boolean).join(" > ") || getAuctionInfo(prop).category || "-";
            const ldKnd = meta.ldKnd || meta.ld_knd || "-";
            const fullAddr = [prop.sido, prop.sigungu, prop.dong, prop.detail_addr].filter(Boolean).join(" ");
            const roadAddr = meta.lctnRoadNmAdr || "";
            const dtlAddr = meta.lctnDtlAdr || "";
            return (
              <div style={{ borderBottom: "10px solid #f5f5f5" }}>
                {/* 면적정보 */}
                <div style={{ padding: "24px 20px 16px" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#1a73e8", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>✓ 면적정보</div>
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
                <div style={{ padding: "0 20px 16px" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#1a73e8", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>✓ 지역</div>
                  <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", border: "1px solid #eee", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>지번</div>
                    <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{fullAddr || "-"}</div>
                    <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555" }}>도로명</div>
                    <div style={{ padding: "12px", fontSize: 13, color: "#222" }}>{roadAddr || dtlAddr || "-"}</div>
                  </div>
                </div>
                {/* 이용 현황 */}
                <div style={{ padding: "0 20px 24px" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#1a73e8", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>✓ 이용 현황</div>
                  <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", border: "1px solid #eee", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>용도분류</div>
                    <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{usageText}</div>
                    <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>물건명</div>
                    <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{meta.onbidCltrNm || prop.building_name || "-"}</div>
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
                <div style={{ padding: "0 20px 24px" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#1a73e8", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>✓ 감정평가정보</div>
                  <div style={{ border: "1px solid #eee", borderRadius: 6, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#f4f6fa" }}>
                          <th style={{ padding: "10px 12px", borderBottom: "1px solid #e0e0e0", color: "#555", fontWeight: 700, textAlign: "center" }}>감정평가금액(원)</th>
                          <th style={{ padding: "10px 12px", borderBottom: "1px solid #e0e0e0", color: "#555", fontWeight: 700, textAlign: "center" }}>최저입찰가(원)</th>
                          <th style={{ padding: "10px 12px", borderBottom: "1px solid #e0e0e0", color: "#555", fontWeight: 700, textAlign: "center" }}>할인율</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ padding: "12px", textAlign: "center", color: "#1e40af", fontWeight: 800, borderBottom: "1px solid #eee" }}>
                            {(meta.appraisal_price || parseInt(meta.apslEvlAmt || "0", 10) || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: "12px", textAlign: "center", color: "#dc2626", fontWeight: 800, borderBottom: "1px solid #eee" }}>
                            {(meta.lowest_bid_price || parseInt(meta.lowstBidPrcIndctCont || "0", 10) || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: "12px", textAlign: "center", fontWeight: 800, borderBottom: "1px solid #eee" }}>
                            {(() => {
                              const ap = meta.appraisal_price || parseInt(meta.apslEvlAmt || "0", 10) || 0;
                              const lo = meta.lowest_bid_price || parseInt(meta.lowstBidPrcIndctCont || "0", 10) || 0;
                              const dr = ap > 0 ? Math.round(((ap - lo) / ap) * 100) : 0;
                              return <span style={{ color: dr > 0 ? "#16a34a" : "#dc2626" }}>{dr > 0 ? "▼" : "▲"}{Math.abs(dr)}%</span>;
                            })()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* 공고기관 및 담당자 정보 */}
                <div style={{ padding: "0 20px 24px" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#1a73e8", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>✓ 공고기관 및 담당자</div>
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
                    <div style={{ padding: "12px", fontSize: 13, color: "#1a73e8", fontWeight: 700, borderBottom: "1px solid #eee" }}>
                      {(() => {
                        const tel = meta.cmsCmmTelNo;
                        if (tel) return <a href={`tel:${tel}`} style={{ color: "#1a73e8", textDecoration: "none" }}>📞 {tel}</a>;

                        const org = meta.orgNm || "";
                        let fallbackTel = "1588-5321";
                        if (org.includes("대신자산신탁")) fallbackTel = "02-769-2000";
                        else if (org.includes("KB부동산신탁") || org.includes("케이비부동산신탁")) fallbackTel = "02-2190-7696";
                        else if (org.includes("코리아신탁")) fallbackTel = "02-6906-8100";
                        else if (org.includes("하나자산신탁")) fallbackTel = "02-3287-4600";
                        else if (org.includes("우리자산신탁")) fallbackTel = "02-6900-9100";
                        else if (org.includes("무궁화신탁")) fallbackTel = "02-3456-5600";

                        return <a href={`tel:${fallbackTel}`} style={{ color: "#1a73e8", textDecoration: "none" }}>📞 {fallbackTel}</a>;
                      })()}
                    </div>

                    <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555" }}>공고번호</div>
                    <div style={{ padding: "12px", fontSize: 13, color: "#222" }}>{meta.onbidPbancNo || meta.pbctNo || "정보 없음"}</div>
                  </div>
                </div>
                {/* 위치정보 & 로드뷰 */}
                <div style={{ padding: "0 20px 20px" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#222", marginBottom: 12 }}>위치정보</div>
                  <div ref={itemMapRef} style={{ width: "100%", height: 250, borderRadius: 8, marginBottom: 20, background: "#e8eaed", border: "1px solid #eee", overflow: "hidden" }}></div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#222", marginBottom: 12 }}>로드뷰</div>
                  <div ref={roadviewRef} style={{ width: "100%", height: 250, borderRadius: 8, background: "#e8eaed", border: "1px solid #eee", overflow: "hidden" }}></div>
                </div>
              </div>
            );
          })()
        )}

        {/* 경매 재산정보 탭 */}
        {activeDetailTab === "auction_property" && prop.trade_type === "경매" && (
          (() => {
            const meta = (prop as any).metadata || {};
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
                <div style={{ padding: "24px 20px" }}>
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
                <div style={{ margin: "0 20px 24px", padding: "16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#b45309", marginBottom: 6 }}>⚠️ 입찰 전 법적 주의사항 (필독)</div>
                  <div style={{ fontSize: 12, color: "#92400e", lineHeight: 1.6 }}>
                    본 정보는 한국자산관리공사(KAMCO)를 통해 실시간으로 제공받는 참고용 데이터입니다. 시세, 매물 정보 및 관련 권리관계 데이터는 실시간 변동 또는 지연이 있을 수 있으므로, <strong>입찰 전 반드시 공식 온비드 및 해당 집행기관(법원/신탁사 등)의 공고를 최종 확인</strong>하신 후 진행하시기 바랍니다. 공실뉴스는 단순 정보 제공처로서 데이터의 정확성을 보장하지 않으며, 제공된 정보에 의존하여 행해진 결정이나 거래 결과에 대해 어떠한 법적 책임도 지지 않습니다.
                  </div>
                </div>
              </div>
            );
          })()
        )}

        {/* 경매 입찰정보 탭 */}
        {activeDetailTab === "auction_bid" && prop.trade_type === "경매" && (
          (() => {
            const meta = (prop as any).metadata || {};
            const appraisalRaw = meta.appraisal_price || parseInt(meta.apslEvlAmt || "0", 10) || 0;
            const lowestRaw = meta.lowest_bid_price || parseInt(meta.lowstBidPrcIndctCont || "0", 10) || 0;
            const discountRate = appraisalRaw > 0 ? Math.round(((appraisalRaw - lowestRaw) / appraisalRaw) * 100) : 0;
            const bidStart = meta.bid_start_date || "";
            const bidEnd = meta.bid_end_date || "";
            const dpstRt = meta.dpstRt || meta.dpst_rt || "10";
            const pbctCnt = meta.pbctCnt || meta.pbct_cnt || "0";
            const bidMtd = meta.bidMtd || meta.bid_mtd || "";
            const opbdDt = meta.opbdDt || meta.opbd_dt || "";
            const opbdPlc = meta.opbdPlc || meta.opbd_plc || "";
            const cltrMngNo = meta.cltrMngNo || meta.cltr_mng_no || "";
            const fmtPrice = (v: number) => {
              if (!v) return "-";
              return `${v.toLocaleString()}원`;
            };
            // D-day 계산
            let dDay = "";
            if (bidEnd) {
              const endDate = new Date(bidEnd.replace(" ", "T") + ":00+09:00");
              const now = new Date();
              const diff = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              if (diff > 0) dDay = `D-${diff}`;
              else if (diff === 0) dDay = "오늘 마감";
              else dDay = "마감";
            }
            return (
              <div style={{ borderBottom: "10px solid #f5f5f5" }}>
                <div style={{ padding: "24px 20px" }}>
                  {/* 가격 비교 카드 */}
                  <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                    <div style={{ flex: 1, background: "#f0f7ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "16px", textAlign: "center" }}>
                      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>감정평가액</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#1e40af" }}>{fmtPrice(appraisalRaw)}</div>
                    </div>
                    <div style={{ flex: 1, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "16px", textAlign: "center" }}>
                      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>최저입찰가</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#dc2626" }}>{fmtPrice(lowestRaw)}</div>
                    </div>
                  </div>
                  {/* 할인율 & D-day */}
                  <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                    <div style={{ flex: 1, background: discountRate > 0 ? "#f0fdf4" : "#fef2f2", border: `1px solid ${discountRate > 0 ? "#bbf7d0" : "#fecaca"}`, borderRadius: 8, padding: "14px", textAlign: "center" }}>
                      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>할인율</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: discountRate > 0 ? "#16a34a" : "#dc2626" }}>
                        {discountRate > 0 ? "▼" : "▲"} {Math.abs(discountRate)}%
                      </div>
                    </div>
                    {dDay && (
                      <div style={{ flex: 1, background: dDay === "마감" ? "#f5f5f5" : "#fff7ed", border: `1px solid ${dDay === "마감" ? "#e5e5e5" : "#fed7aa"}`, borderRadius: 8, padding: "14px", textAlign: "center" }}>
                        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>입찰 마감</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: dDay === "마감" ? "#999" : dDay === "오늘 마감" ? "#dc2626" : "#ea580c" }}>{dDay}</div>
                      </div>
                    )}
                  </div>

                  {/* 입찰방법 */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#1a73e8", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>✓ 입찰방법</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {bidMtd && <span style={{ background: "#dbeafe", color: "#1e40af", fontSize: 13, fontWeight: 700, padding: "6px 14px", borderRadius: 6 }}>{bidMtd}</span>}
                      {dpstRt && <span style={{ background: "#f0fdf4", color: "#16a34a", fontSize: 13, fontWeight: 700, padding: "6px 14px", borderRadius: 6 }}>보증금 {dpstRt}%</span>}
                      {meta.bidMthodNm && <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 6 }}>{meta.bidMthodNm}</span>}
                      {meta.cptnMthodNm && <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 6 }}>{meta.cptnMthodNm}</span>}
                      {meta.dspsMthodNm && <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 6 }}>{meta.dspsMthodNm}</span>}
                      {meta.collbBidPsblYn === "Y" && <span style={{ background: "#ede9fe", color: "#6d28d9", fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 6 }}>공동입찰 ✓</span>}
                      {meta.subtBidPsblYn === "Y" && <span style={{ background: "#ede9fe", color: "#6d28d9", fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 6 }}>대리입찰 ✓</span>}
                      {meta.eltrGrprUseYn === "Y" && <span style={{ background: "#ede9fe", color: "#6d28d9", fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 6 }}>전자보증서 ✓</span>}
                    </div>
                    {meta.evcRsbyTrgtCont && (
                      <div style={{ marginTop: 10, fontSize: 13, color: meta.evcRsbyTrgtCont.includes("매수") ? "#dc2626" : "#333", fontWeight: meta.evcRsbyTrgtCont.includes("매수") ? 700 : 400 }}>
                        ⚠️ 명도책임: {meta.evcRsbyTrgtCont}
                      </div>
                    )}
                  </div>

                  {/* 입찰일정 및 장소 */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#1a73e8", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>✓ 입찰일정 및 장소</div>
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
                        {lowestRaw ? fmtPrice(Math.round((lowestRaw * parseInt(dpstRt, 10)) / 100)) : "-"}
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
                      {meta.prptDivNm && (
                        <>
                          <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>재산구분</div>
                          <div style={{ padding: "12px", fontSize: 13, color: meta.prptDivNm.includes("압류") ? "#dc2626" : "#222", fontWeight: meta.prptDivNm.includes("압류") ? 700 : 400, borderBottom: "1px solid #eee" }}>{meta.prptDivNm}</div>
                        </>
                      )}
                      {meta.pbctStatNm && (
                        <>
                          <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>공매상태</div>
                          <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{meta.pbctStatNm}</div>
                        </>
                      )}
                      {meta.totalamtUnpcDivNm && (
                        <>
                          <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555", borderBottom: "1px solid #eee" }}>대금납부</div>
                          <div style={{ padding: "12px", fontSize: 13, color: "#222", borderBottom: "1px solid #eee" }}>{meta.totalamtUnpcDivNm}</div>
                        </>
                      )}
                      {meta.dtbtRqrEdtmCont && (
                        <>
                          <div style={{ background: "#f4f6fa", padding: "12px", fontSize: 13, fontWeight: 700, color: "#555" }}>채무정리기한</div>
                          <div style={{ padding: "12px", fontSize: 13, color: "#222" }}>{meta.dtbtRqrEdtmCont}</div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 이전 입찰내역 */}
                  {parseInt(pbctCnt, 10) > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#1a73e8", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>✓ 이전 입찰내역</div>
                      <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ flex: 1, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "14px", textAlign: "center" }}>
                          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>이전 입찰 결과</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#dc2626" }}>유찰</div>
                        </div>
                        <div style={{ flex: 1, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "14px", textAlign: "center" }}>
                          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>최저입찰가격</div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#1e40af" }}>{getPriceText(lowestRaw)}</div>
                        </div>
                        <div style={{ flex: 1, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "14px", textAlign: "center" }}>
                          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>전체 입찰내역</div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#333" }}>유찰 {pbctCnt}회</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()
        )}

        {/* 경매 인근시세 탭 */}
        {activeDetailTab === "auction_market" && prop.trade_type === "경매" && (
          <div style={{ borderBottom: "10px solid #f5f5f5" }}>
            <div style={{ padding: "24px 20px" }}>
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#334155", marginBottom: 8 }}>인근 시세 분석</div>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 20 }}>
                  이 매물 반경 500m 내 공실뉴스에 등록된
                  <br />
                  유사 용도 임대 매물의 실시간 시세를 분석합니다.
                </div>
                {/* 주변 공실 간이 통계 */}
                {(() => {
                  const nearbyVacancies = dbVacancies.filter((v) => {
                    if (v.trade_type === "경매" || !v.lat || !v.lng || !prop.lat || !prop.lng) return false;
                    const dlat = (v.lat - prop.lat) * 111000;
                    const dlng = (v.lng - prop.lng) * 111000 * Math.cos((prop.lat * Math.PI) / 180);
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
                      <div style={{ background: "#1a73e8", color: "#fff", padding: "12px 16px", fontSize: 14, fontWeight: 700 }}>
                        반경 500m 임대 시세 ({nearbyVacancies.length}건)
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                        <div style={{ padding: "16px", borderRight: "1px solid #eee", textAlign: "center" }}>
                          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>평균 보증금</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#1e40af" }}>{formatAmount(avgDeposit)}</div>
                        </div>
                        <div style={{ padding: "16px", textAlign: "center" }}>
                          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>평균 월세</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#1e40af" }}>{avgMonthly ? `${Math.round(avgMonthly / 10000)}만원` : "-"}</div>
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

        {/* 등록자정보 탭 */}
        {activeDetailTab === "realtor" && (
          <>
            <div style={{ padding: "30px 20px", background: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 25, gap: 15 }}>
                {/* 프로필 사진 */}
                {prop.members?.profile_image_url ? (
                  <img
                    src={prop.members.profile_image_url}
                    alt="프로필"
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: "50%",
                      objectFit: "cover",
                      flexShrink: 0,
                      border: "2px solid #e5e7eb",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: "50%",
                      background: "#e8f0fe",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 28,
                      fontWeight: 700,
                      color: "#508bf5",
                      flexShrink: 0,
                      border: "2px solid #e5e7eb",
                    }}
                  >
                    {(agencyInfo?.name || prop.members?.name || prop.client_name || "?")[0]}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#111",
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {prop.owner_id ? (
                      <Link
                        href={`/reporter/${prop.owner_id}`}
                        style={{
                          color: "#111",
                          textDecoration: "none",
                          cursor: "pointer",
                          transition: "color 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.textDecoration = "underline";
                          e.currentTarget.style.color = "#3b82f6";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.textDecoration = "none";
                          e.currentTarget.style.color = "#111";
                        }}
                      >
                        {agencyInfo ? agencyInfo.name : prop.members ? prop.members.name : prop.client_name}
                      </Link>
                    ) : (
                      <span>{agencyInfo ? agencyInfo.name : prop.members ? prop.members.name : prop.client_name}</span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                    {agencyInfo ? (
                      <>
                        <span style={{ fontSize: 14, color: "#555" }}>
                          대표 {agencyInfo.ceo_name} <span style={{ color: "#ccc", margin: "0 6px" }}>|</span> 등록번호{" "}
                          {agencyInfo.reg_num || "-"}
                        </span>
                        <span style={{ fontSize: 14, color: "#555" }}>
                          {[agencyInfo.address, agencyInfo.address_detail].filter(Boolean).join(" ") || "-"}
                        </span>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: 14, color: "#555" }}>
                          일반회원 <span style={{ color: "#ccc", margin: "0 6px" }}>|</span>{" "}
                          {prop.members ? prop.members.name : prop.client_name}
                        </span>
                      </>
                    )}
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        color: "#1a73e8",
                        marginTop: 4,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                      </svg>
                      전화{" "}
                      {agencyInfo?.phone
                        ? `${agencyInfo.phone}${
                            agencyInfo?.cell && agencyInfo.cell !== agencyInfo.phone ? `, ${agencyInfo.cell}` : ""
                          }`
                        : prop.client_phone || prop.members?.phone || "미등록"}
                    </span>
                  </div>

                  {/* 그룹 컨테이너 (SNS + 오시는길) */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                    {/* SNS Links (Excluding API info) */}
                    {prop.members?.sns_links &&
                      Object.keys(prop.members.sns_links).filter((k) => k !== "api_info" && k !== "api_list" && prop.members.sns_links[k]?.url)
                        .length > 0 &&
                      Object.keys(prop.members.sns_links)
                        .filter((k) => k !== "api_info" && k !== "api_list" && prop.members.sns_links[k]?.url)
                        .map((key) => {
                          const link = prop.members.sns_links[key].url;
                          const validUrl = link.startsWith("http") ? link : `https://${link}`;

                          let iconHtml;
                          switch (key) {
                            case "contact":
                              iconHtml = (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                </svg>
                              );
                              break;
                            case "youtube":
                              iconHtml = (
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.99C18.88 4 12 4 12 4s-6.88 0-8.59.43A2.78 2.78 0 0 0 1.46 6.42C1 8.16 1 12 1 12s0 3.84.46 5.58a2.78 2.78 0 0 0 1.95 1.99C5.12 20 12 20 12 20s6.88 0 8.59-.43a2.78 2.78 0 0 0 1.95-1.99C23 15.84 23 12 23 12s0-3.84-.46-5.58zM9.54 15.55V8.45L15.82 12l-6.28 3.55z"></path>
                                </svg>
                              );
                              break;
                            case "instagram":
                              iconHtml = (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                                </svg>
                              );
                              break;
                            case "facebook":
                              iconHtml = (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                                </svg>
                              );
                              break;
                            case "twitter":
                              iconHtml = (
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
                                </svg>
                              );
                              break;
                            case "blog":
                              iconHtml = <span style={{ fontSize: 13, fontWeight: "bold" }}>BLOG</span>;
                              break;
                            case "cafe":
                              iconHtml = <span style={{ fontSize: 13, fontWeight: "bold" }}>CAFE</span>;
                              break;
                            case "kakao":
                              iconHtml = (
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.8 5.2 4.4 6.5l-1 3.7c-.1.3.3.6.5.4l4.3-2.9c.6.1 1.2.1 1.8.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z"></path>
                                </svg>
                              );
                              break;
                            case "homepage":
                              iconHtml = (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                </svg>
                              );
                              break;
                            case "shopping_mall":
                              iconHtml = (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="9" cy="21" r="1"></circle>
                                  <circle cx="20" cy="21" r="1"></circle>
                                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                </svg>
                              );
                              break;
                            default:
                              iconHtml = (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                </svg>
                              );
                          }

                          const titleNames: Record<string, string> = {
                            homepage: "홈페이지",
                            contact: "문의하기",
                            shopping_mall: "쇼핑몰",
                            blog: "블로그",
                            cafe: "카페",
                            youtube: "유튜브",
                            facebook: "페이스북",
                            twitter: "트위터",
                            instagram: "인스타그램",
                            kakao: "카카오",
                            threads: "쓰레드",
                          };
                          const titleName = titleNames[key] || key;

                          return (
                            <a
                              key={key}
                              href={validUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={titleName}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 44,
                                height: 44,
                                borderRadius: "50%",
                                background: "#f8f9fa",
                                border: "1px solid #e0e0e0",
                                color: "#444",
                                transition: "all 0.2s",
                                textDecoration: "none",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#eaf4ff";
                                e.currentTarget.style.borderColor = "#1a73e8";
                                e.currentTarget.style.color = "#1a73e8";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#f8f9fa";
                                e.currentTarget.style.borderColor = "#e0e0e0";
                                e.currentTarget.style.color = "#444";
                              }}
                            >
                              <div
                                style={{
                                  width: 22,
                                  height: 22,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {iconHtml}
                              </div>
                            </a>
                          );
                        })}

                    {/* 오시는길 아이콘 (다음 로드뷰 연결) */}
                    {agencyInfo?.address && (
                      <a
                        href={
                          agencyInfo.lat && agencyInfo.lng
                            ? `https://map.kakao.com/link/roadview/${agencyInfo.lat},${agencyInfo.lng}`
                            : `https://map.kakao.com/link/search/${encodeURIComponent(agencyInfo.address)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        title="오시는길"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          background: "#f8f9fa",
                          border: "1px solid #e0e0e0",
                          color: "#444",
                          transition: "all 0.2s",
                          textDecoration: "none",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#eaf4ff";
                          e.currentTarget.style.borderColor = "#1a73e8";
                          e.currentTarget.style.color = "#1a73e8";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#f8f9fa";
                          e.currentTarget.style.borderColor = "#e0e0e0";
                          e.currentTarget.style.color = "#444";
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="22"
                          height="22"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                      </a>
                    )}
                  </div>
                </div>

                {/* 부동산 소개란 (agency_info intro) */}
                {agencyInfo?.intro && (
                  <div
                    style={{
                      width: 230,
                      flexShrink: 0,
                      padding: "12px 14px",
                      background: "#f8f9fa",
                      borderRadius: 8,
                      fontSize: 13,
                      color: "#444",
                      border: "1px solid #eee",
                      lineHeight: 1.5,
                      wordBreak: "keep-all",
                    }}
                  >
                    <div style={{ fontWeight: "bold", fontSize: 12, color: "#888", marginBottom: 6 }}>부동산 소개</div>
                    {agencyInfo.intro}
                  </div>
                )}
              </div>

              <div>
                <div
                  style={{
                    display: "flex",
                    background: "#f9f9f9",
                    borderRadius: 8,
                    overflow: "hidden",
                    border: "1px solid #eee",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      padding: "16px 20px",
                      fontSize: 14,
                      fontWeight: "bold",
                      color: "#111",
                      borderRight: "1px solid #eee",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    공실등록현황
                  </div>
                  <div style={{ display: "flex", alignItems: "center", padding: "0 20px", gap: 16, fontSize: 13, color: "#666" }}>
                    {[
                      { label: "전체", count: dbVacancies.filter((v) => v.owner_id === prop.owner_id).length },
                      {
                        label: "매매",
                        count: dbVacancies.filter((v) => v.owner_id === prop.owner_id && v.trade_type === "매매").length,
                      },
                      {
                        label: "전세",
                        count: dbVacancies.filter((v) => v.owner_id === prop.owner_id && v.trade_type === "전세").length,
                      },
                      {
                        label: "월세",
                        count: dbVacancies.filter((v) => v.owner_id === prop.owner_id && v.trade_type === "월세").length,
                      },
                      {
                        label: "단기",
                        count: dbVacancies.filter((v) => v.owner_id === prop.owner_id && v.trade_type === "단기").length,
                      },
                    ].map((stat, i, arr) => (
                      <React.Fragment key={stat.label}>
                        <span
                          onClick={() => setRealtorTradeType(stat.label)}
                          style={{
                            cursor: "pointer",
                            color: realtorTradeType === stat.label ? "#1a73e8" : "#666",
                            fontWeight: realtorTradeType === stat.label ? "bold" : "normal",
                          }}
                        >
                          {stat.label}{" "}
                          <strong style={{ color: realtorTradeType === stat.label ? "#1a73e8" : "#111" }}>{stat.count}</strong>
                        </span>
                        {i < arr.length - 1 && <span style={{ width: 1, height: 12, background: "#ddd" }}></span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ──── 등록 물건 리스트 ──── */}
            <div style={{ borderTop: "10px solid #f5f5f5" }}>
              {dbVacancies
                .filter(
                  (v) =>
                    v.owner_id === prop.owner_id && (realtorTradeType === "전체" || v.trade_type === realtorTradeType)
                )
                .map((vp) => (
                  <div
                    key={vp.id}
                    onClick={() => {
                      setPrevPropertyId(activeProperty);
                      setActiveProperty(vp.id);
                      setActiveDetailTab("info");
                      setGalleryIndex(0);
                    }}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      padding: "16px 20px",
                      cursor: "pointer",
                      transition: "background 0.15s",
                      borderBottom: "1px solid #f0f0f0",
                      background: "#fff",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#f9fbff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#fff";
                    }}
                  >
                    <div style={{ flex: 1, paddingRight: vp.images?.[0] ? 12 : 0, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: "bold",
                          color: "#111",
                          marginBottom: 4,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {vp.building_name || vp.dong}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#1a73e8", marginBottom: 4 }}>
                        {getPriceText(vp)}
                      </div>
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
                        {vp.property_type} <span style={{ color: "#ddd", margin: "0 4px" }}>|</span> {vp.direction || "방향없음"}{" "}
                        <span style={{ color: "#ddd", margin: "0 4px" }}>|</span> {vp.exclusive_m2 ? `${vp.exclusive_m2}㎡` : "면적미상"}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#666",
                          marginBottom: 8,
                          display: "-webkit-box",
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {[`룸 ${vp.room_count || 0}개`, `욕실 ${vp.bathroom_count || 0}개`, ...(vp.options || [])]
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    </div>
                    {vp.images?.[0] && (
                      <div
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 6,
                          overflow: "hidden",
                          background: "#f0f0f0",
                          flexShrink: 0,
                        }}
                      >
                        <img src={vp.images[0]} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {/* ──── 댓글상담 (등록자정보 탭 하단) ──── */}
            {renderCommentArea(prop)}
          </>
        )}
      </div>

      {/* 하단 고정 바 */}
      <div
        style={{
          width: "100%",
          height: 75,
          flexShrink: 0,
          background: "#fff",
          borderTop: "1px solid #e0e0e0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          boxSizing: "border-box",
          boxShadow: "0 -4px 12px rgba(0,0,0,0.05)",
          zIndex: 10,
        }}
      >
        <span style={{ fontSize: 18, fontWeight: "bold", color: prop.trade_type === "경매" ? (isAuctionMode ? "#1a4282" : "#1a73e8") : "#111" }}>
          {prop.trade_type === "경매" ? `감정가 ${formatAmount(prop.deposit * 10000)}` : getPriceText(prop)}
        </span>
        {prop.trade_type === "경매" ? (
          <span
            style={{
              background: "#f4f6fa",
              border: "1px solid #d0d5dd",
              padding: "8px 16px",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 700,
              color: "#333",
              letterSpacing: 0.5,
            }}
          >
            {(prop as any).metadata?.cltrMngNo || ""}
          </span>
        ) : (
          <button
            onClick={() => {
              setActiveDetailTab("realtor");
              setTimeout(() => {
                const el = document.getElementById("detail-scroll-container");
                if (el) el.scrollTo({ top: 0, behavior: "smooth" });
              }, 100);
            }}
            style={{
              background: "#1a73e8",
              color: "#fff",
              border: "none",
              padding: "10px 28px",
              borderRadius: 4,
              fontSize: 15,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            연락처 보기
          </button>
        )}
      </div>
    </div>
  );
}
