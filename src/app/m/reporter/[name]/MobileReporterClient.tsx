"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  { key: "all", label: "전체 기사" },
  { key: "부동산·주식·재테크", label: "부동산·재테크" },
  { key: "정치·경제·사회", label: "정치·경제" },
  { key: "세무·법률", label: "세무·법률" },
  { key: "여행·건강·생활", label: "여행·생활" },
  { key: "IT·가전·가구", label: "IT·가전" },
  { key: "스포츠·연예·Car", label: "스포츠·연예" },
  { key: "인물·미션·기타", label: "인물·기타" },
];

function formatDate(d: string) {
  if (!d) return "";
  const dt = new Date(d);
  const now = new Date();
  const diff = Math.floor((now.getTime() - dt.getTime()) / 3600000);
  if (diff < 1) return "방금 전";
  if (diff < 24) return `${diff}시간전`;
  const days = Math.floor(diff / 24);
  if (days < 7) return `${days}일전`;
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
}

const stripHtml = (html: string) =>
  html ? html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() : "";

function formatPrice(v: any): string {
  const dep = v.deposit || 0;
  const rent = v.monthly_rent || 0;
  const depStr = dep >= 10000 ? `${Math.floor(dep / 10000)}억${dep % 10000 !== 0 ? ` ${dep % 10000}` : ''}` : dep > 0 ? `${dep}` : '';
  const rentStr = rent > 0 ? `${rent}` : '';
  if (v.trade_type === '월세') return `${depStr}/${rentStr}`;
  if (v.trade_type === '전세') return depStr;
  if (v.trade_type === '매매') return v.sale_price ? `${v.sale_price >= 10000 ? `${Math.floor(v.sale_price / 10000)}억` : v.sale_price}` : '';
  return '';
}

export default function MobileReporterClient({
  profile,
  articles,
  vacancies,
  authorName,
}: {
  profile: any;
  articles: any[];
  vacancies: any[];
  authorName: string;
}) {
  const router = useRouter();
  const [mainTab, setMainTab] = useState<'articles' | 'vacancies'>('articles');
  const [activeTab, setActiveTab] = useState("all");

  const filteredArticles =
    activeTab === "all"
      ? articles
      : articles.filter((a: any) => a.section2 === activeTab);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 448,
        margin: "0 auto",
        backgroundColor: "#fff",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ═══ 기자 프로필 헤더 ═══ */}
      <div
        style={{
          position: "relative",
          width: "100%",
          background: "linear-gradient(135deg, #2b1139 0%, #1a0824 100%)",
          color: "#fff",
          padding: "16px",
          paddingTop: "20px",
          paddingBottom: "60px",
        }}
      >
        {/* 상단 네비 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <button
            onClick={() => router.back()}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18L9 12L15 6"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            onClick={() => router.push("/m/news?tab=all")}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            전체 기자
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 18L15 12L9 6"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* 프로필 카드 */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "20px",
            padding: "24px",
            position: "relative",
            zIndex: 10,
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            {profile.profile_image_url ? (
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "24px",
                  overflow: "hidden",
                  flexShrink: 0,
                  border: "2px solid rgba(255,255,255,0.2)",
                }}
              >
                <img
                  src={profile.profile_image_url}
                  alt={profile.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "24px",
                  backgroundColor: "rgba(255,255,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: "2px solid rgba(255,255,255,0.2)",
                }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}

            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "bold",
                    background: "rgba(255,255,255,0.2)",
                    padding: "2px 8px",
                    borderRadius: "12px",
                  }}
                >
                  {profile.role === "ADMIN" ? "기자" : "부동산기자"}
                </span>
              </div>
              <div
                style={{
                  fontSize: "26px",
                  fontWeight: "800",
                  letterSpacing: "-0.5px",
                }}
              >
                {profile.name}
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: "15px",
              lineHeight: "1.6",
              color: "rgba(255,255,255,0.9)",
              marginBottom: "20px",
              wordBreak: "keep-all",
            }}
          >
            {profile.introduction ||
              "공실뉴스와 함께하는 소중한 기자님입니다. 항상 신속하고 정확한 뉴스를 전달하기 위해 최선을 다하겠습니다."}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "13px",
              color: "rgba(255,255,255,0.7)",
              marginBottom: "20px",
              flexWrap: "wrap",
            }}
          >
            <div>
              구독 {profile.subscriber_count || 0} | 응원{" "}
              {profile.point_balance || 0}
            </div>
            <div
              style={{
                width: 1,
                height: 10,
                background: "rgba(255,255,255,0.3)",
              }}
            />
            <div>
              {profile.phone || profile.email || "연락처 정보 없음"}
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              style={{
                flex: 1,
                padding: "12px 0",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.4)",
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                fontSize: "14px",
                fontWeight: "bold",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
              }}
            >
              + 구독
            </button>
            <button
              style={{
                flex: 1,
                padding: "12px 0",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.4)",
                background: "transparent",
                color: "#fff",
                fontSize: "14px",
                fontWeight: "bold",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
              }}
            >
              👏 응원
            </button>
            <button
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.4)",
                background: "transparent",
                color: "#fff",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexShrink: 0,
                cursor: "pointer",
              }}
            >
              ✉️
            </button>
            <button
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.4)",
                background: "transparent",
                color: "#fff",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexShrink: 0,
                cursor: "pointer",
              }}
            >
              🔗
            </button>
          </div>
        </div>

        {/* 하단 둥근 흰색 전환 */}
        <div
          style={{
            position: "absolute",
            bottom: "-20px",
            left: 0,
            width: "100%",
            height: "40px",
            background: "#fff",
            borderTopLeftRadius: "24px",
            borderTopRightRadius: "24px",
            zIndex: 5,
          }}
        />
      </div>

      {/* ═══ 메인 탭 (전체기사 / 등록공실) ═══ */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', background: '#fff', position: 'sticky', top: 0, zIndex: 30 }}>
        <button onClick={() => setMainTab('articles')} style={{ flex: 1, padding: '14px 0', fontSize: '15px', fontWeight: mainTab === 'articles' ? 800 : 600, color: mainTab === 'articles' ? '#111' : '#888', background: 'none', border: 'none', borderBottom: mainTab === 'articles' ? '3px solid #111' : '3px solid transparent', cursor: 'pointer' }}>
          전체기사 <span style={{ color: '#3b82f6', fontSize: '13px' }}>{articles.length}</span>
        </button>
        <button onClick={() => setMainTab('vacancies')} style={{ flex: 1, padding: '14px 0', fontSize: '15px', fontWeight: mainTab === 'vacancies' ? 800 : 600, color: mainTab === 'vacancies' ? '#111' : '#888', background: 'none', border: 'none', borderBottom: mainTab === 'vacancies' ? '3px solid #f97316' : '3px solid transparent', cursor: 'pointer' }}>
          등록공실 <span style={{ color: '#f97316', fontSize: '13px' }}>{vacancies.length}</span>
        </button>
      </div>

      {mainTab === 'articles' ? (
        <>
          {/* ═══ 카테고리 서브탭 ═══ */}
          <div className="hide-scrollbar" style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid #e5e7eb', background: '#fff', WebkitOverflowScrolling: 'touch' }}>
            {CATEGORIES.map((cat) => (
              <button key={cat.key} onClick={() => setActiveTab(cat.key)} style={{ flexShrink: 0, padding: '12px 14px', fontSize: '13px', fontWeight: activeTab === cat.key ? 700 : 500, color: activeTab === cat.key ? '#111' : '#888', background: 'none', border: 'none', borderBottom: activeTab === cat.key ? '2px solid #111' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {cat.label}
              </button>
            ))}
          </div>

          {/* 기사 개수 */}
          <div style={{ padding: '16px 16px 8px', fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>
            총 <span style={{ color: '#3b82f6', fontWeight: 800 }}>{filteredArticles.length}</span>건
          </div>

          {/* 기사 목록 */}
          <div style={{ flex: 1, padding: '0 16px 24px' }}>
            {filteredArticles.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                {filteredArticles.slice(0, 2).map((article: any) => (
                  <Link key={article.id} href={`/m/news/${article.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ borderRadius: '12px', overflow: 'hidden', background: '#f9fafb', border: '1px solid #f3f4f6' }}>
                      <div style={{ width: '100%', aspectRatio: '16/10', background: article.thumbnail_url ? `url(${article.thumbnail_url}) center/cover` : 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', position: 'relative' }}>
                        {article.section2 && <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>{article.section2}</span>}
                      </div>
                      <div style={{ padding: '10px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#111', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: '6px' }}>{article.title}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>{formatDate(article.published_at || article.created_at)}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {filteredArticles.slice(2).map((article: any) => (
              <Link key={article.id} href={`/m/news/${article.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ display: 'flex', gap: '12px', padding: '14px 0', borderBottom: '1px solid #f3f4f6', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {article.section2 && <div style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6', marginBottom: '4px' }}>{article.section2}</div>}
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#111', lineHeight: 1.4, marginBottom: '6px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{article.title}</div>
                    <div style={{ fontSize: '13px', color: '#9ca3af', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', marginBottom: '4px' }}>{stripHtml(article.subtitle || article.content || '')}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#b0b0b0' }}>
                      <span>{formatDate(article.published_at || article.created_at)}</span>
                      <span>· {authorName}</span>
                    </div>
                  </div>
                  {article.thumbnail_url && <div style={{ width: '84px', height: '64px', borderRadius: '8px', flexShrink: 0, background: `url(${article.thumbnail_url}) center/cover`, border: '1px solid #f3f4f6' }} />}
                </div>
              </Link>
            ))}
            {filteredArticles.length === 0 && <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: '14px' }}>이 카테고리에 작성된 기사가 없습니다.</div>}
          </div>
        </>
      ) : (
        /* ═══ 등록공실 탭 ═══ */
        <div style={{ flex: 1, padding: '16px' }}>
          <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 600, marginBottom: '12px' }}>
            총 <span style={{ color: '#f97316', fontWeight: 800 }}>{vacancies.length}</span>건
          </div>
          {vacancies.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {vacancies.map((v: any) => (
                <Link key={v.id} href={`/m/gongsil?id=${v.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb', background: '#fff' }}>
                    <div style={{ width: '100%', aspectRatio: '16/10', background: v.images?.[0] ? `url(${v.images[0]}) center/cover` : 'linear-gradient(135deg, #fef3c7, #fde68a)', position: 'relative' }}>
                      <span style={{ position: 'absolute', top: 8, left: 8, background: '#f97316', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>{v.trade_type}</span>
                    </div>
                    <div style={{ padding: '10px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#111', marginBottom: '4px' }}>{formatPrice(v)}<span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginLeft: '4px' }}>만원</span></div>
                      <div style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', marginBottom: '2px' }}>{v.building_name || [v.dong, v.sigungu].filter(Boolean).join(' ')}</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>{v.property_type} · {v.supply_m2 || '-'}㎡</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: '14px' }}>등록된 공실이 없습니다.</div>
          )}
        </div>
      )}
    </div>
  );
}
