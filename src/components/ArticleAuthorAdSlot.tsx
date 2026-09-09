"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getArticleAdInfo, AuthorBanner } from "@/app/actions/articleAd";

interface ArticleAuthorAdSlotProps {
  article: any;
  className?: string;
  style?: React.CSSProperties;
  forceType?: "DEFAULT" | "BANNER" | "NONE";
  previewMode?: boolean;
}

export default function ArticleAuthorAdSlot({
  article,
  className,
  style,
  forceType,
  previewMode = false,
}: ArticleAuthorAdSlotProps) {
  const [loading, setLoading] = useState(true);
  const [adData, setAdData] = useState<{
    ad_type: "DEFAULT" | "BANNER" | "NONE";
    banner: AuthorBanner | null;
    agencyInfo: any | null;
    memberInfo: any | null;
    vacancyStats: { total: number; maemae: number; jeonse: number; rent: number; short: number };
  } | null>(null);

  useEffect(() => {
    const targetId = article?.id || "preview";
    const authorId = article?.author_id;
    if (!targetId && !authorId) {
      setLoading(false);
      return;
    }
    let isMounted = true;

    getArticleAdInfo(targetId, authorId)
      .then((res) => {
        if (isMounted && res.success) {
          setAdData(res);
        }
      })
      .catch((err) => console.warn("AdSlot load error:", err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [article?.id, article?.author_id]);

  if (loading) {
    return (
      <div
        style={{
          margin: previewMode ? "8px 0" : "28px 0",
          height: 100,
          borderRadius: 12,
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          fontSize: 13,
          ...style,
        }}
      >
        <span>등록자 프로필 박스를 불러오는 중...</span>
      </div>
    );
  }

  const effectiveType = forceType || adData?.ad_type;
  if (!adData && !forceType) {
    return null;
  }
  if (effectiveType === "NONE") {
    return null;
  }

  const { banner, agencyInfo, memberInfo, vacancyStats: dbStats } = adData || {};
  const vacancyStats = dbStats || { total: 0, maemae: 0, jeonse: 0, rent: 0, short: 0 };

  // 1. 배너형 광고 (유료회원 맞춤 이미지 배너)
  if (effectiveType === "BANNER" && banner && banner.image_url) {
    const bannerContent = (
      <div
        style={{
          position: "relative",
          width: "100%",
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)",
          background: "#ffffff",
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
      >
        {/* AD 뱃지 */}
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: "rgba(15, 23, 42, 0.72)",
            color: "#ffffff",
            fontSize: 10,
            fontWeight: 800,
            padding: "2px 6px",
            borderRadius: 4,
            letterSpacing: "0.5px",
            zIndex: 2,
          }}
        >
          AD
        </span>
        <img
          src={banner.image_url}
          alt={banner.name || "광고 배너"}
          style={{
            width: "100%",
            maxHeight: 220,
            objectFit: "cover",
            display: "block",
          }}
        />
      </div>
    );

    return (
      <div className={`article-author-ad-slot ${className || ""}`} style={{ margin: previewMode ? "10px 0" : "32px 0 28px", ...style }}>
        {previewMode && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 12, fontWeight: 700, color: "#2563eb" }}>
            <span>👀 [미리보기] 실제 기사 하단에 노출되는 배너 박스</span>
          </div>
        )}
        {banner.link_url ? (
          <a
            href={banner.link_url}
            target={banner.link_target || "_blank"}
            rel="noopener noreferrer"
            onClick={(e) => {
              if (previewMode) e.preventDefault();
            }}
            style={{ textDecoration: "none", display: "block" }}
          >
            {bannerContent}
          </a>
        ) : (
          bannerContent
        )}
      </div>
    );
  }

  // 2. 기본형 광고 (대표님 지정 등록자 정보 카드: 미니홈피 스타일)
  const agencyName = agencyInfo?.agency_name || agencyInfo?.name || memberInfo?.name || article.author_name || "공실뉴스 공식 부동산";
  const ceoName = agencyInfo?.ceo_name || memberInfo?.name || "-";
  const regNum = agencyInfo?.registration_no || agencyInfo?.reg_num || "-";
  const address = [agencyInfo?.address, agencyInfo?.address_detail].filter(Boolean).join(" ") || "주소 미등록";
  const phone = agencyInfo?.phone || memberInfo?.phone || "02-0000-0000";
  const cell = agencyInfo?.cell && agencyInfo.cell !== phone ? `, ${agencyInfo.cell}` : "";
  const intro = agencyInfo?.intro || "공실 등록 및 중개 매물을 신속하고 정직하게 안내해 드립니다.";
  const profileImg = memberInfo?.profile_image_url || agencyInfo?.profile_image_url;
  const authorInitial = agencyName.slice(0, 1) || "공";
  const mapSearchUrl = agencyInfo?.address ? `https://map.kakao.com/link/search/${encodeURIComponent(agencyInfo.address)}` : null;
  const targetReporterId = article.author_id || memberInfo?.id || "";
  const miniHomeUrl = targetReporterId ? `/reporter/${targetReporterId}` : "#";

  // SNS 링크 목록 (미니홈피 연동)
  const snsLinks = memberInfo?.sns_links || {};
  const activeSnsKeys = Object.keys(snsLinks).filter(
    (k) => k !== "api_info" && k !== "api_list" && snsLinks[k]?.url
  );

  return (
    <div
      className={`article-author-ad-slot ${className || ""}`}
      style={{
        margin: previewMode ? "10px 0" : "32px 0 28px",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
        position: "relative",
        fontFamily: "'Pretendard', -apple-system, sans-serif",
        ...style,
      }}
    >
      {previewMode && (
        <div
          style={{
            padding: "8px 16px",
            background: "#eff6ff",
            borderBottom: "1px solid #dbeafe",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 800, color: "#1d4ed8", display: "flex", alignItems: "center", gap: 6 }}>
            <span>👀</span> [실시간 미리보기] 실제 기사 하단에 노출되는 등록자 프로필 박스입니다.
          </span>
          <span style={{ fontSize: 11, color: "#3b82f6" }}>실제 기사 독자에게 100% 동일하게 보여집니다</span>
        </div>
      )}

      {/* 상단: 우측에 AD만 깔끔하게 단독 표시 */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          padding: "8px 16px",
          borderBottom: "1px solid #f8fafc",
          background: "#fafafa",
        }}
      >
        <span
          style={{
            background: "#f1f5f9",
            color: "#64748b",
            fontSize: 10,
            fontWeight: 800,
            padding: "2px 6px",
            borderRadius: 4,
            border: "1px solid #cbd5e1",
            letterSpacing: "0.5px",
          }}
        >
          AD
        </span>
      </div>

      {/* 본문 카드 영역 */}
      <div style={{ padding: "18px 20px 16px" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 20,
            marginBottom: 16,
          }}
        >
          {/* 좌측 기본 정보 영역 */}
          <div style={{ flex: "1 1 320px", minWidth: 260 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              {/* 프로필 사진 또는 원형 이니셜 (미니홈피로 이동 링크) */}
              <Link
                href={miniHomeUrl}
                onClick={(e) => {
                  if (previewMode) e.preventDefault();
                }}
                style={{ textDecoration: "none" }}
              >
                {profileImg ? (
                  <img
                    src={profileImg}
                    alt={agencyName}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "16px",
                      objectFit: "cover",
                      flexShrink: 0,
                      border: "1.5px solid #e5e7eb",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "16px",
                      background: "#e8f0fe",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      fontWeight: 800,
                      color: "#2563eb",
                      flexShrink: 0,
                      border: "1.5px solid #dbeafe",
                    }}
                  >
                    {authorInitial}
                  </div>
                )}
              </Link>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Link
                    href={miniHomeUrl}
                    onClick={(e) => {
                      if (previewMode) e.preventDefault();
                    }}
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      color: "#0f172a",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {agencyName}
                  </Link>
                </div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                  <span>
                    대표 {ceoName} <span style={{ color: "#cbd5e1", margin: "0 6px" }}>|</span> 등록번호 {regNum}
                  </span>
                </div>
              </div>
            </div>

            {/* 주소 및 연락처 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
              {address && (
                <div style={{ fontSize: 13, color: "#334155", display: "flex", alignItems: "flex-start", gap: 6 }}>
                  <span style={{ color: "#94a3b8", width: 44, flexShrink: 0 }}>주소</span>
                  <span style={{ flex: 1, lineHeight: 1.4 }}>{address}</span>
                </div>
              )}
              <div style={{ fontSize: 13, color: "#334155", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#94a3b8", width: 44, flexShrink: 0 }}>연락처</span>
                <span style={{ fontWeight: 800, color: "#1a73e8", fontSize: 14 }}>
                  {phone}{cell}
                </span>
              </div>
            </div>

            {/* ═══ 오직 동그란 원형 아이콘들만 깔끔하게 배치 ═══ */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              {/* 1) 오시는길 지도 버튼 (동그란 원형 버튼) */}
              {mapSearchUrl && (
                <a
                  href={mapSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (previewMode) {
                      e.preventDefault();
                      window.open(mapSearchUrl, "_blank");
                    }
                  }}
                  title="오시는길 지도보기 (카카오맵)"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textDecoration: "none",
                    boxShadow: "0 1px 3px rgba(37,99,235,0.12)",
                    transition: "all 0.15s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.08)";
                    e.currentTarget.style.background = "#dbeafe";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.background = "#eff6ff";
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </a>
              )}

              {/* 3) 미니홈피 등록 SNS 아이콘들 (동그란 원형 버튼들) */}
              {activeSnsKeys.length > 0 &&
                activeSnsKeys.slice(0, 5).map((key) => {
                  const link = snsLinks[key].url;
                  const validUrl = link.startsWith("http") ? link : `https://${link}`;
                  let iconHtml: React.ReactNode = null;
                  let titleText = "SNS 링크";
                  if (key === "youtube") {
                    titleText = "유튜브 채널";
                    iconHtml = <svg viewBox="0 0 24 24" width="16" height="16" fill="#dc2626"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.99C18.88 4 12 4 12 4s-6.88 0-8.59.43A2.78 2.78 0 0 0 1.46 6.42C1 8.16 1 12 1 12s0 3.84.46 5.58a2.78 2.78 0 0 0 1.95 1.99C5.12 20 12 20 12 20s6.88 0 8.59-.43a2.78 2.78 0 0 0 1.95-1.99C23 15.84 23 12 23 12s0-3.84-.46-5.58zM9.54 15.55V8.45L15.82 12l-6.28 3.55z"></path></svg>;
                  } else if (key === "kakao") {
                    titleText = "카카오톡 오픈채팅/채널";
                    iconHtml = <svg viewBox="0 0 24 24" width="16" height="16" fill="#381e1f"><path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.8 5.2 4.4 6.5l-1 3.7c-.1.3.3.6.5.4l4.3-2.9c.6.1 1.2.1 1.8.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z"></path></svg>;
                  } else if (key === "instagram") {
                    titleText = "인스타그램";
                    iconHtml = <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#e1306c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>;
                  } else if (key === "contact") {
                    titleText = "문의하기";
                    iconHtml = <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;
                  } else if (key === "blog") {
                    titleText = "네이버 블로그";
                    iconHtml = <span style={{ fontSize: 10, fontWeight: 900, color: "#03c75a" }}>BLOG</span>;
                  } else {
                    titleText = "공식 홈페이지";
                    iconHtml = <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>;
                  }
                  return (
                    <a
                      key={key}
                      href={validUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={titleText}
                      onClick={(e) => {
                        if (previewMode) {
                          e.preventDefault();
                          window.open(validUrl, "_blank");
                        }
                      }}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textDecoration: "none",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "scale(1.08)";
                        e.currentTarget.style.borderColor = "#94a3b8";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.borderColor = "#cbd5e1";
                      }}
                    >
                      {iconHtml}
                    </a>
                  );
                })}
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
              </button>
            </div>
          </div>

          {/* 우측 소개말 박스 */}
          <div style={{ flex: "1 1 240px", minWidth: 200 }}>
            <div
              style={{
                height: "100%",
                minHeight: 100,
                padding: "14px 16px",
                background: "#f8fafc",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>소개말</div>
              <div
                style={{
                  fontSize: 13,
                  color: "#334155",
                  lineHeight: 1.55,
                  whiteSpace: "pre-line",
                  wordBreak: "break-word",
                }}
              >
                {intro}
              </div>
            </div>
          </div>
        </div>

        {/* 하단 공실등록현황 바 (미니홈피로 이동) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "#f8fafc",
            borderRadius: 10,
            overflow: "hidden",
            border: "1px solid #e2e8f0",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              padding: "12px 18px",
              fontSize: 13,
              fontWeight: 800,
              color: "#0f172a",
              borderRight: "1px solid #e2e8f0",
              background: "#f1f5f9",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>공실등록현황</span>
          </div>

          <Link
            href={miniHomeUrl}
            onClick={(e) => {
              if (previewMode) {
                e.preventDefault();
                alert("기사 작성 중 미리보기 상태입니다. 실제 기사에서는 해당 기자의 미니홈피로 연결됩니다.");
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              flex: 1,
              padding: "12px 18px",
              gap: 14,
              fontSize: 13,
              color: "#64748b",
              textDecoration: "none",
              flexWrap: "wrap",
            }}
          >
            <span>
              전체 <strong style={{ color: "#2563eb", fontWeight: 800 }}>{vacancyStats.total}</strong>
            </span>
            <span style={{ width: 1, height: 12, background: "#cbd5e1" }} />
            <span>
              매매 <strong style={{ color: "#0f172a" }}>{vacancyStats.maemae}</strong>
            </span>
            <span style={{ width: 1, height: 12, background: "#cbd5e1" }} />
            <span>
              전세 <strong style={{ color: "#0f172a" }}>{vacancyStats.jeonse}</strong>
            </span>
            <span style={{ width: 1, height: 12, background: "#cbd5e1" }} />
            <span>
              월세 <strong style={{ color: "#0f172a" }}>{vacancyStats.rent}</strong>
            </span>
            <span style={{ width: 1, height: 12, background: "#cbd5e1" }} />
            <span>
              단기 <strong style={{ color: "#0f172a" }}>{vacancyStats.short}</strong>
            </span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#2563eb", fontWeight: 700 }}>
              매물 보러가기 &gt;
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
