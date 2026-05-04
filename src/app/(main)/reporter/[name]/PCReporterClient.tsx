"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthModal from "@/components/AuthModal";

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

export default function PCReporterClient({
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
  const [mainTab, setMainTab] = useState<'articles' | 'vacancies'>('articles');
  const [activeTab, setActiveTab] = useState("all");

  const filteredArticles =
    activeTab === "all"
      ? articles
      : articles.filter((a: any) => a.section2 === activeTab);

  const [userLevel, setUserLevel] = React.useState<number>(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);

  React.useEffect(() => {
    import("@/utils/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          supabase.from("members").select("role").eq("id", data.user.id).single().then(res => {
            if (res.data) {
              const r = res.data.role;
              setUserLevel(r === 'SUPER_ADMIN' || r === 'ADMIN' || r === '최고관리자' ? 3 : r === 'REALTOR' ? 2 : 1);
            }
          });
        }
      });
    });
  }, []);

  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "32px 24px 60px",
        display: "flex",
        gap: "32px",
        alignItems: "flex-start",
      }}
    >
      {/* ═══ 좌측: 기자 프로필 카드 (고정) ═══ */}
      <div
        style={{
          width: "280px",
          flexShrink: 0,
          position: "sticky",
          top: "100px",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #2b1139 0%, #1a0824 100%)",
            borderRadius: "20px",
            padding: "28px 24px",
            color: "#fff",
            boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
          }}
        >
          {/* 전체 기자 링크 */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "20px",
            }}
          >
            <Link
              href="/news_all"
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              전체 기자 &gt;
            </Link>
          </div>

          {/* 프로필 사진 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            {profile.profile_image_url ? (
              <div
                style={{
                  width: "90px",
                  height: "90px",
                  borderRadius: "28px",
                  overflow: "hidden",
                  border: "3px solid rgba(255,255,255,0.2)",
                  marginBottom: "14px",
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
                  width: "90px",
                  height: "90px",
                  borderRadius: "28px",
                  backgroundColor: "rgba(255,255,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "3px solid rgba(255,255,255,0.2)",
                  marginBottom: "14px",
                }}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
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

            {/* 직함 & 이름 */}
            <span
              style={{
                fontSize: "12px",
                fontWeight: "bold",
                background: "rgba(255,255,255,0.2)",
                padding: "3px 10px",
                borderRadius: "12px",
                marginBottom: "8px",
              }}
            >
              {profile.role === "ADMIN" ? "기자" : "부동산기자"}
            </span>
            <div
              style={{
                fontSize: "24px",
                fontWeight: 800,
                letterSpacing: "-0.5px",
                marginBottom: "10px",
              }}
            >
              {profile.name}
            </div>
          </div>

          {/* 소개글 */}
          <div
            style={{
              fontSize: "13px",
              lineHeight: "1.6",
              color: "rgba(255,255,255,0.85)",
              marginBottom: "18px",
              textAlign: "center",
              wordBreak: "keep-all",
            }}
          >
            {profile.introduction ||
              "공실뉴스와 함께하는 소중한 기자님입니다. 항상 신속하고 정확한 뉴스를 전달하기 위해 최선을 다하겠습니다."}
          </div>

          {/* 통계 */}
          <div
            style={{
              textAlign: "center",
              fontSize: "13px",
              color: "rgba(255,255,255,0.65)",
              marginBottom: "20px",
            }}
          >
            구독 {profile.subscriber_count || 0} | 응원{" "}
            {profile.point_balance || 0}
          </div>

          {/* 버튼들 */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.4)",
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              + 구독
            </button>
            <button
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.4)",
                background: "transparent",
                color: "#fff",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              👏 응원
            </button>
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.4)",
                background: "transparent",
                color: "#fff",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              ✉️ 메일
            </button>
            <button
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.4)",
                background: "transparent",
                color: "#fff",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              🔗 공유
            </button>
          </div>
        </div>
      </div>

      {/* ═══ 우측: 기사/공실 목록 ═══ */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 메인 탭 */}
        <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: '24px' }}>
          <button onClick={() => setMainTab('articles')} style={{ padding: '14px 24px', fontSize: '15px', fontWeight: mainTab === 'articles' ? 800 : 600, color: mainTab === 'articles' ? '#111' : '#888', background: 'none', border: 'none', borderBottom: mainTab === 'articles' ? '3px solid #111' : '3px solid transparent', cursor: 'pointer', marginBottom: '-2px' }}>
            전체기사 <span style={{ color: '#f97316', fontSize: '13px' }}>{articles.length}</span>
          </button>
          <button onClick={() => setMainTab('vacancies')} style={{ padding: '14px 24px', fontSize: '15px', fontWeight: mainTab === 'vacancies' ? 800 : 600, color: mainTab === 'vacancies' ? '#111' : '#888', background: 'none', border: 'none', borderBottom: mainTab === 'vacancies' ? '3px solid #3b82f6' : '3px solid transparent', cursor: 'pointer', marginBottom: '-2px' }}>
            등록공실 <span style={{ color: '#3b82f6', fontSize: '13px' }}>{vacancies.length}</span>
          </button>
        </div>

        {mainTab === 'articles' ? (
          <>
            {/* 카테고리 서브탭 */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '16px', gap: '4px', flexWrap: 'wrap' }}>
              {CATEGORIES.map((cat) => (
                <button key={cat.key} onClick={() => setActiveTab(cat.key)} style={{ padding: '10px 14px', fontSize: '13px', fontWeight: activeTab === cat.key ? 700 : 500, color: activeTab === cat.key ? '#111' : '#888', background: 'none', border: 'none', borderBottom: activeTab === cat.key ? '2px solid #111' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: '-1px' }}>
                  {cat.label}
                </button>
              ))}
            </div>

            <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: 600, marginBottom: '16px' }}>
              총 <span style={{ color: '#f97316', fontWeight: 800 }}>{filteredArticles.length}</span>건
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {Array.from({ length: Math.ceil(filteredArticles.length / 2) }, (_, rowIdx) => {
                const pair = filteredArticles.slice(rowIdx * 2, rowIdx * 2 + 2);
                return (
                  <div key={rowIdx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', padding: '16px 0', borderBottom: '1px solid #f3f4f6' }}>
                    {pair.map((article: any) => (
                      <Link key={article.id} href={`/news/${article.article_no || article.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                        {article.thumbnail_url && <div style={{ width: '120px', height: '80px', borderRadius: '8px', flexShrink: 0, background: `url(${article.thumbnail_url}) center/cover`, border: '1px solid #f3f4f6' }} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#111', lineHeight: 1.5, marginBottom: '6px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{article.title}</div>
                          <div style={{ fontSize: '12px', color: '#9ca3af', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{stripHtml(article.subtitle || article.content || '')}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#b0b0b0', marginTop: '6px' }}>
                            <span>{formatDate(article.published_at || article.created_at)}</span>
                            {article.view_count > 0 && <><span>·</span><span>💬 {article.view_count > 10 ? `${Math.floor(article.view_count / 10) * 10}+` : article.view_count}</span></>}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
            {filteredArticles.length === 0 && <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af', fontSize: '15px' }}>이 카테고리에 작성된 기사가 없습니다.</div>}
          </>
        ) : (
          /* 등록공실 - 기존 공실리스트 스타일 */
          <>
            <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: 600, marginBottom: '16px' }}>
              총 <span style={{ color: '#3b82f6', fontWeight: 800 }}>{vacancies.length}</span>건
            </div>
            {vacancies.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {vacancies.map((prop: any, i: number) => {
                  const cardMasked = prop.exposure_type === '부동산노출' && userLevel < 2;
                  const cardAddr = prop.building_name || [prop.dong, prop.sigungu].filter(Boolean).join(" ") || "이름없는 공실";
                  const title = cardMasked ? cardAddr.replace(/[^\s]/g, "X") : cardAddr;
                  const showCommission = userLevel >= 2;

                  let price = prop.trade_type;
                  if (prop.trade_type === "매매" || prop.trade_type === "전세") price += ` ${prop.deposit >= 10000 ? `${Math.floor(prop.deposit/10000)}억${prop.deposit%10000!==0 ? ` ${prop.deposit%10000}`:''}` : prop.deposit}`;
                  else if (prop.trade_type === "월세") price += ` ${prop.deposit >= 10000 ? `${Math.floor(prop.deposit/10000)}억${prop.deposit%10000!==0 ? ` ${prop.deposit%10000}`:''}` : prop.deposit} / ${prop.monthly_rent}`;
                  
                  const detailStr = `룸 ${prop.room_count||0}개, 욕실 ${prop.bath_count||0}개`;
                  const thumb = prop.vacancy_photos && prop.vacancy_photos.length > 0 ? prop.vacancy_photos[0].url : "";
                  const createdDate = prop.created_at ? new Date(prop.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\.$/, "") : "";

                  return (
                    <Link 
                      key={prop.id || i} 
                      href={`/gongsil?id=${prop.id}`} 
                      target="_blank"
                      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                      onClick={(e) => {
                        if (cardMasked) {
                          e.preventDefault();
                          setIsAuthModalOpen(true);
                        }
                      }}
                    >
                      <div style={{ display: 'flex', gap: '16px', padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }} onMouseEnter={e => {e.currentTarget.style.borderColor='#3b82f6'; e.currentTarget.style.boxShadow='0 4px 12px rgba(59,130,246,0.1)'}} onMouseLeave={e => {e.currentTarget.style.borderColor='#e5e7eb'; e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.02)'}}>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                            {showCommission && (prop.realtor_commission || prop.commission_type) && (
                              <span style={{ fontSize: "12px", fontWeight: 700, color: "#ef4444", border: "1px solid #ef4444", padding: "2px 8px", borderRadius: "4px" }}>
                                {prop.realtor_commission || prop.commission_type}
                              </span>
                            )}
                            {prop.vacancy_no && <span style={{ fontSize: "13px", fontWeight: 700, color: "#ef4444" }}>{prop.vacancy_no}</span>}
                            <span style={{ fontSize: "13px", color: "#9ca3af" }}>{createdDate}</span>
                            {cardMasked && <span onClick={(e) => { e.preventDefault(); setIsAuthModalOpen(true); }} style={{ fontSize: "12px", color: "#3b82f6", fontWeight: 700, background: "#eef6ff", padding: "4px 10px", borderRadius: "4px", cursor: "pointer" }}>🔒 부동산회원 무료열람</span>}
                          </div>
                          
                          <div style={{ fontSize: '18px', fontWeight: 700, color: cardMasked ? "#bbb" : '#111827', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: cardMasked ? 1 : 0 }}>
                            {title}
                          </div>
                          <div style={{ fontSize: '22px', fontWeight: 800, color: '#3b82f6', marginBottom: '8px' }}>
                            {price}
                          </div>
                          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {prop.property_type || "주택"} <span style={{color: "#e5e7eb"}}>|</span> {prop.direction || "방향없음"} <span style={{color: "#e5e7eb"}}>|</span> {prop.exclusive_m2 || 0}㎡
                          </div>
                          <div style={{ fontSize: '14px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {detailStr}{prop.options && prop.options.length > 0 ? `, ${prop.options.join(", ")}` : ""}
                          </div>
                        </div>
                        {thumb && (
                          <div style={{ width: '140px', height: '110px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#f3f4f6', alignSelf: 'center', backgroundImage: `url(${thumb})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid #f3f4f6' }} />
                        )}
                        {!thumb && (
                          <div style={{ width: '140px', height: '110px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: '#f9fafb', alignSelf: 'center', border: '1px solid #f3f4f6' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af', fontSize: '15px' }}>등록된 공실이 없습니다.</div>
            )}
          </>
        )}
      </div>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialTab="login" />
    </div>
  );
}
