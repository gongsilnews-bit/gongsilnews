"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// 가격 포맷 헬퍼
function formatPrice(v: any): string {
  if (!v) return "-";
  const deposit = v.deposit || 0;
  const rent = v.monthly_rent || 0;
  const trade = v.trade_type || "";
  const fmt = (n: number) => {
    if (n >= 100000000) return `${(n / 100000000).toFixed(n % 100000000 === 0 ? 0 : 1)}억`;
    if (n >= 10000) return `${Math.round(n / 10000)}만`;
    return `${n}`;
  };
  if (trade === "월세" && rent > 0) return `${fmt(deposit)}/${fmt(rent)}`;
  if (trade === "전세") return `전세 ${fmt(deposit)}`;
  return `매매 ${fmt(deposit)}`;
}

// 기사 날짜 포맷
function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 1) return "방금 전";
  if (diffHours < 24) return `${diffHours}시간 전`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

interface Props {
  headlineArticles: any[];
  politicsArticles: any[];
  taxArticles: any[];
  lifeArticles: any[];
  financeArticles: any[];
  vacancies: any[];
}

export default function MobileHomeClient({
  headlineArticles,
  politicsArticles,
  taxArticles,
  lifeArticles,
  financeArticles,
  vacancies,
}: Props) {
  const router = useRouter();
  const [heroIdx, setHeroIdx] = useState(0);

  const hero = headlineArticles[heroIdx] || null;

  return (
    <div className="flex flex-col w-full bg-[#f8f9fa] min-h-screen pb-[80px]">
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes ticker {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .ticker-animate { animation: ticker 20s linear infinite; }
        .news-card-hover { transition: transform 0.15s, box-shadow 0.15s; }
        .news-card-hover:active { transform: scale(0.98); }
        .vacancy-card-hover:active { transform: scale(0.97); }
      `}</style>

      {/* ── Hero 배너 (헤드라인 기사) ── */}
      {hero && (
        <div
          className="relative w-full overflow-hidden cursor-pointer"
          style={{ aspectRatio: "16/9", maxHeight: "260px" }}
          onClick={() => router.push(`/m/news/${hero.article_no || hero.id}`)}
        >
          {hero.thumbnail_url ? (
            <img
              src={hero.thumbnail_url}
              alt={hero.title}
              className="w-full h-full object-cover"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "linear-gradient(135deg, #1a2e50 0%, #2d4a7a 100%)",
              }}
            />
          )}
          {/* 그라데이션 오버레이 */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)",
            }}
          />
          {/* 텍스트 */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 16px" }}>
            <span
              style={{
                display: "inline-block",
                background: "#dc2626",
                color: "#fff",
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "3px",
                marginBottom: "8px",
                letterSpacing: "0.05em",
              }}
            >
              HEADLINE
            </span>
            <h2
              style={{
                color: "#fff",
                fontSize: "18px",
                fontWeight: 800,
                lineHeight: 1.35,
                wordBreak: "keep-all",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {hero.title}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px", marginTop: "6px" }}>
              {hero.author_name} · {formatDate(hero.published_at || hero.created_at)}
            </p>
          </div>

          {/* 헤드라인 인디케이터 dots */}
          {headlineArticles.length > 1 && (
            <div
              style={{
                position: "absolute",
                bottom: "12px",
                right: "12px",
                display: "flex",
                gap: "4px",
                alignItems: "center",
              }}
            >
              {headlineArticles.slice(0, 5).map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setHeroIdx(i); }}
                  style={{
                    width: i === heroIdx ? "16px" : "6px",
                    height: "6px",
                    borderRadius: "3px",
                    background: i === heroIdx ? "#fff" : "rgba(255,255,255,0.5)",
                    border: "none",
                    padding: 0,
                    transition: "all 0.3s",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 실시간 뉴스 티커 ── */}
      {politicsArticles.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px 0",
            borderBottom: "1px solid #e5e7eb",
            backgroundColor: "#fff",
            overflow: "hidden",
          }}
        >
          <span
            style={{
              flexShrink: 0,
              background: "#1a2e50",
              color: "#fff",
              fontSize: "11px",
              fontWeight: 800,
              padding: "3px 10px",
              marginLeft: "16px",
              marginRight: "12px",
              borderRadius: "3px",
            }}
          >
            실시간
          </span>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <p className="ticker-animate" style={{ whiteSpace: "nowrap", fontSize: "13px", color: "#111827", fontWeight: 600 }}>
              {politicsArticles[0]?.title}
            </p>
          </div>
        </div>
      )}

      {/* ── 부동산·주식·재테크 섹션 ── */}
      <NewsSection
        title="부동산·주식·재테크"
        category="부동산·주식·재테크"
        articles={financeArticles}
        onMore={() => router.push("/m/news")}
      />

      {/* ── 공실 매물 미리보기 ── */}
      {vacancies.length > 0 && (
        <div style={{ backgroundColor: "#fff", marginBottom: "8px" }}>
          <SectionHeader title="최신 공실 매물" onMore={() => router.push("/m/gongsil")} badge="NEW" />
          <div
            className="no-scrollbar"
            style={{ display: "flex", gap: "12px", padding: "4px 16px 16px", overflowX: "auto" }}
          >
            {vacancies.map((v: any) => (
              <div
                key={v.id}
                className="vacancy-card-hover"
                onClick={() => router.push("/m/gongsil")}
                style={{
                  flexShrink: 0,
                  width: "160px",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  border: "1px solid #f3f4f6",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                }}
              >
                <div style={{ width: "100%", height: "100px", backgroundColor: "#e5e7eb", overflow: "hidden" }}>
                  {v.vacancy_photos?.[0]?.url ? (
                    <img
                      src={v.vacancy_photos[0].url}
                      alt="매물"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        background: "linear-gradient(135deg, #1a2e50, #2d4a7a)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "28px",
                      }}
                    >
                      🏠
                    </div>
                  )}
                </div>
                <div style={{ padding: "10px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#f97316",
                      backgroundColor: "#fff7ed",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      display: "inline-block",
                      marginBottom: "6px",
                    }}
                  >
                    {v.trade_type || "매매"}
                  </span>
                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: 800,
                      color: "#111827",
                      lineHeight: 1.3,
                      marginBottom: "4px",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {formatPrice(v)}
                  </p>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#6b7280",
                      display: "-webkit-box",
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {v.building_name || [v.dong, v.sigungu].filter(Boolean).join(" ")}
                  </p>
                </div>
              </div>
            ))}

            {/* 더 보기 카드 */}
            <div
              onClick={() => router.push("/m/gongsil")}
              style={{
                flexShrink: 0,
                width: "80px",
                borderRadius: "12px",
                border: "1.5px dashed #d1d5db",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                cursor: "pointer",
                backgroundColor: "#f9fafb",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 600, textAlign: "center" }}>
                공실
                <br />
                더보기
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── 정치·경제·사회 섹션 ── */}
      <NewsSection
        title="정치·경제·사회"
        category="정치·경제·사회"
        articles={politicsArticles}
        onMore={() => router.push("/m/news")}
      />

      {/* ── 세무·법률 섹션 ── */}
      <NewsSection
        title="세무·법률"
        category="세무·법률"
        articles={taxArticles}
        onMore={() => router.push("/m/news")}
      />

      {/* ── 여행·건강·생활 섹션 ── */}
      <NewsSection
        title="여행·건강·생활"
        category="여행·건강·생활"
        articles={lifeArticles}
        onMore={() => router.push("/m/news")}
      />
    </div>
  );
}

// ── 섹션 헤더 컴포넌트 ──
function SectionHeader({ title, onMore, badge }: { title: string; onMore?: () => void; badge?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 16px 12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "16px", fontWeight: 800, color: "#111827" }}>{title}</span>
        {badge && (
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#f97316",
              background: "#fff7ed",
              padding: "2px 6px",
              borderRadius: "4px",
              border: "1px solid #fed7aa",
            }}
          >
            {badge}
          </span>
        )}
      </div>
      {onMore && (
        <button
          onClick={onMore}
          style={{
            fontSize: "13px",
            color: "#6b7280",
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "2px",
            padding: 0,
          }}
        >
          더보기
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── 뉴스 섹션 컴포넌트 ──
function NewsSection({
  title,
  category,
  articles,
  onMore,
}: {
  title: string;
  category: string;
  articles: any[];
  onMore?: () => void;
}) {
  const router = useRouter();

  if (articles.length === 0) return null;

  const [main, ...rest] = articles;

  return (
    <div style={{ backgroundColor: "#fff", marginBottom: "8px" }}>
      <SectionHeader title={title} onMore={onMore} />

      {/* 섹션 메인 기사 */}
      <div
        className="news-card-hover"
        onClick={() => router.push(`/m/news/${main.article_no || main.id}`)}
        style={{ padding: "0 16px 12px", cursor: "pointer" }}
      >
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <h3
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "#111827",
                lineHeight: 1.45,
                marginBottom: "6px",
                wordBreak: "keep-all",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {main.title}
            </h3>
            <p style={{ fontSize: "12px", color: "#9ca3af" }}>
              {main.author_name} · {formatDate(main.published_at || main.created_at)}
            </p>
          </div>
          {main.thumbnail_url && (
            <div
              style={{
                width: "84px",
                height: "64px",
                borderRadius: "8px",
                overflow: "hidden",
                flexShrink: 0,
                backgroundColor: "#e5e7eb",
              }}
            >
              <img
                src={main.thumbnail_url}
                alt={main.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          )}
        </div>
      </div>

      {/* 나머지 기사들 - 컴팩트 리스트 */}
      {rest.slice(0, 3).map((a: any, i: number) => (
        <div
          key={a.id}
          className="news-card-hover"
          onClick={() => router.push(`/m/news/${a.article_no || a.id}`)}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px 16px",
            borderTop: "1px solid #f3f4f6",
            cursor: "pointer",
            gap: "10px",
          }}
        >
          <span
            style={{
              flexShrink: 0,
              width: "20px",
              fontSize: "13px",
              fontWeight: 800,
              color: i === 0 ? "#f97316" : "#d1d5db",
            }}
          >
            {i + 1}
          </span>
          <p
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#374151",
              lineHeight: 1.4,
              flex: 1,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              wordBreak: "keep-all",
            }}
          >
            {a.title}
          </p>
          {a.thumbnail_url && (
            <div
              style={{
                width: "60px",
                height: "44px",
                borderRadius: "6px",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <img
                src={a.thumbnail_url}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
