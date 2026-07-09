"use client";

import React, { useState } from "react";
import Link from "next/link";

const formatPrice = (val: any) => {
  const deposit = val.deposit || 0;
  const monthlyRent = val.monthly_rent || 0;
  const tradeType = val.trade_type;

  const formatValue = (num: number) => {
    if (!num) return "";
    const m = Math.floor(num / 10000);
    if (m === 0) return "";
    const e = Math.floor(m / 10000);
    const r = m % 10000;
    let result = "";
    if (e > 0) result += `${e}억`;
    if (r > 0) {
      const c = Math.floor(r / 1000);
      const rem = r % 1000;
      let rest = "";
      if (c > 0) rest += `${c}천`;
      if (rem > 0) rest += `${rem}`;
      result += (result ? " " : "") + rest + "만";
    }
    return result;
  };

  const depStr = formatValue(deposit);
  if (tradeType === "경매") {
    return depStr || "0";
  }
  if (tradeType === "월세" && monthlyRent) {
    return `${depStr || '0'} / ${formatValue(monthlyRent)}`;
  }
  return depStr || "0";
};

interface SearchClientProps {
  query: string;
  articles: any[];
  vacancies: any[];
  vacancyCount: number;
}

export default function SearchClient({ query, articles, vacancies, vacancyCount }: SearchClientProps) {
  const [searchTab, setSearchTab] = useState<'article' | 'vacancy'>('article');

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  const stripHtml = (html: string) => {
    if (!html) return "";
    let text = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    text = text.replace(/^(?:X|×|✕)(?=[가-힣\[\(])/i, "").trim();
    return text;
  };

  const extractYoutubeIdInfo = (article: any) => {
    if (article.youtube_url) {
      const match = article.youtube_url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
      if (match) return { id: match[1], hasVideo: true };
    }
    if (article.content) {
      const match = article.content.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
      if (match) return { id: match[1], hasVideo: true };
    }
    return { id: null, hasVideo: false };
  };

  const getThumbnailSrc = (article: any, ytInfo: { id: string | null; hasVideo: boolean }) => {
    if (article.thumbnail_url) {
      if (article.thumbnail_url.includes('maxresdefault.jpg')) {
        return article.thumbnail_url.replace('maxresdefault.jpg', 'hqdefault.jpg');
      }
      return article.thumbnail_url;
    }
    if (ytInfo.id) return `https://img.youtube.com/vi/${ytInfo.id}/hqdefault.jpg`;
    return null;
  };

  return (
    <main className="container px-20" style={{ paddingBottom: "60px" }}>
      {/* Search Header */}
      <div style={{ marginTop: "30px", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#111" }}>
          <span style={{ color: "#102c57" }}>#{query}</span> 검색결과
        </h1>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "2px solid #e5e7eb", marginBottom: "30px" }}>
        <div 
          onClick={() => setSearchTab('article')}
          style={{ flex: 1, textAlign: "center", padding: "16px 0", fontSize: "18px", fontWeight: searchTab === 'article' ? 800 : 600, color: searchTab === 'article' ? "#111" : "#888", borderBottom: searchTab === 'article' ? "4px solid #111" : "4px solid transparent", cursor: "pointer", transition: "all 0.2s" }}>
          관련기사 <span style={{ color: searchTab === 'article' ? "#508bf5" : "#888" }}>{articles.length}</span>
        </div>
        <div 
          onClick={() => setSearchTab('vacancy')}
          style={{ flex: 1, textAlign: "center", padding: "16px 0", fontSize: "18px", fontWeight: searchTab === 'vacancy' ? 800 : 600, color: searchTab === 'vacancy' ? "#111" : "#888", borderBottom: searchTab === 'vacancy' ? "4px solid #111" : "4px solid transparent", cursor: "pointer", transition: "all 0.2s" }}>
          관련공실 <span style={{ color: searchTab === 'vacancy' ? "#f97316" : "#888" }}>{vacancyCount}</span>
        </div>
      </div>

      <div className="news-layout">
        <div className="news-list-area" style={{ flex: 1 }}>
          {/* Article List */}
          {searchTab === 'article' && (
            <div>
              {articles.length > 0 ? articles.map((article, index) => {
                const ytInfo = extractYoutubeIdInfo(article);
                const thumbSrc = getThumbnailSrc(article, ytInfo);
                const showImgArea = Boolean(thumbSrc);

                return (
                  <div key={article.id} style={{ position: "relative", marginBottom: "20px" }}>
                    <Link href={`/news/${article.article_no || article.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                      <div className="an-card">
                        {showImgArea && (
                          <div className="an-img" style={{ position: "relative", flexShrink: 0 }}>
                            <img
                              src={thumbSrc as string}
                              alt={article.title}
                              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6 }}
                            />
                            {ytInfo.hasVideo && (
                              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 44, height: 44, background: "rgba(0,0,0,0.4)", borderRadius: "50%", border: "2.5px solid white", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
                                <svg viewBox="0 0 24 24" width="24" height="24" fill="white" style={{ marginLeft: 4 }}><path d="M8 5v14l11-7z"/></svg>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="an-body">
                          <div className="an-title">{article.title}</div>
                          <div className="an-desc">
                            {article.subtitle || stripHtml(article.content || "").slice(0, 160)}
                          </div>
                          <div className="an-meta">
                            <span style={{ color: "#508bf5", fontWeight: "bold", marginRight: 8 }}>
                              [{article.section1 || "뉴스"} &gt; {article.section2 || "전체"}]
                            </span>
                            {formatDate(article.published_at || article.created_at)} · {article.author_name || "공실뉴스"}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              }) : (
                <div style={{ padding: "80px 0", textAlign: "center", color: "#888", fontSize: "16px" }}>
                  관련 기사가 없습니다.
                </div>
              )}
            </div>
          )}

          {/* Vacancy List */}
          {searchTab === 'vacancy' && (
            <div>
              {vacancies.length > 0 ? vacancies.map((v) => {
                const baseAddr = v.building_name || [v.dong, v.sigungu].filter(Boolean).join(" ");
                const price = formatPrice ? formatPrice(v) : (v.deposit + " / " + (v.monthly_rent || 0));

                return (
                  <div
                    key={v.id}
                    style={{ display: "flex", gap: "16px", padding: "20px", border: "1px solid #e5e7eb", borderRadius: "12px", marginBottom: "16px", background: "#fff", transition: "box-shadow 0.2s", cursor: "pointer" }}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)"}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
                    onClick={() => {
                        window.location.href = `/gongsil?id=${v.id}`;
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                        {(v.realtor_commission || v.commission_type) && (
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "#ef4444", border: "1px solid #ef4444", padding: "2px 8px", borderRadius: "4px" }}>
                            {v.realtor_commission || v.commission_type}
                          </span>
                        )}
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "#ef4444" }}>{v.vacancy_no || '-'}</span>
                        <span style={{ fontSize: "13px", color: "#9ca3af" }}>{v.created_at ? new Date(v.created_at).toLocaleDateString("ko-KR").slice(0, -1) : ""}</span>
                      </div>

                      <p style={{ fontSize: "20px", fontWeight: 800, color: "#111827", marginBottom: "8px" }}>
                        {baseAddr}
                      </p>
                      
                      <p style={{ fontSize: "22px", fontWeight: 800, color: "#1a73e8", marginBottom: "8px" }}>
                        {v.trade_type} {price}
                      </p>
                      
                      <p style={{ fontSize: "15px", color: "#6b7280", marginBottom: "4px" }}>
                        {[v.property_type || "건물", v.direction, v.exclusive_m2 && `${v.exclusive_m2}㎡`].filter(Boolean).join(" | ")}
                      </p>
                      
                      <p style={{ fontSize: "15px", color: "#6b7280", marginBottom: "12px" }}>
                        {[v.room_count !== undefined ? `룸 ${v.room_count}개` : null, v.bath_count !== undefined ? `욕실 ${v.bath_count}개` : null, ...(v.options || [])].filter(Boolean).join(", ")}
                      </p>

                      {v.themes && v.themes.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                          {v.themes.map((theme: string, idx: number) => (
                            <span key={idx} style={{ background: "#f8fafc", color: "#3b82f6", fontSize: "13px", padding: "4px 10px", borderRadius: "14px", fontWeight: 700, border: "1px solid #bfdbfe" }}>
                              #{theme}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Vacancy Image (if available) */}
                    {v.vacancy_photos && v.vacancy_photos.length > 0 && (
                        <div style={{ width: "160px", height: "160px", flexShrink: 0, borderRadius: "12px", overflow: "hidden" }}>
                            <img src={v.vacancy_photos[0].url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="공실" />
                        </div>
                    )}
                  </div>
                );
              }) : (
                <div style={{ padding: "80px 0", textAlign: "center", color: "#888", fontSize: "16px" }}>
                  관련 공실이 없습니다.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
