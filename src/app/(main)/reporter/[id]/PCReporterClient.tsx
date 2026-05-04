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
  agencyInfo,
  authorName,
}: {
  profile: any;
  articles: any[];
  vacancies: any[];
  agencyInfo?: any;
  authorName: string;
}) {
  const [mainTab, setMainTab] = useState<'articles' | 'vacancies'>('articles');
  const [activeTab, setActiveTab] = useState("all");
  const [realtorTradeType, setRealtorTradeType] = useState('전체');

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

            {agencyInfo ? (
              <>
                <div style={{ fontSize: "24px", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "10px" }}>
                  {agencyInfo.agency_name || profile.name}
                </div>
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", marginBottom: "4px" }}>
                  대표 {agencyInfo.representative} <span style={{ margin: "0 6px", color: "rgba(255,255,255,0.3)" }}>|</span> 등록번호 {agencyInfo.registration_number}
                </div>
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", marginBottom: "4px" }}>
                  {agencyInfo.address}
                </div>
                <div style={{ fontSize: "13px", color: "#60a5fa", fontWeight: "bold", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
                  {agencyInfo.phone?.split(',').map((num: string, idx: number) => {
                    const cleanNum = num.trim();
                    return (
                      <a key={idx} href={`tel:${cleanNum}`} style={{ color: "inherit", textDecoration: "none" }}>
                        📞 {cleanNum}
                      </a>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <span style={{ fontSize: "12px", fontWeight: "bold", background: "rgba(255,255,255,0.2)", padding: "3px 10px", borderRadius: "12px", marginBottom: "8px" }}>
                  {profile.role === "ADMIN" ? "기자" : "부동산기자"}
                </span>
                <div style={{ fontSize: "24px", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "10px" }}>
                  {profile.name}
                </div>
              </>
            )}
          </div>

          {/* 소개글 */}
          <div style={{ fontSize: "13px", lineHeight: "1.6", color: "rgba(255,255,255,0.85)", marginBottom: "18px", textAlign: "center", wordBreak: "keep-all" }}>
            {agencyInfo?.intro || profile.introduction || "공실뉴스와 함께하는 소중한 기자님입니다. 항상 신속하고 정확한 뉴스를 전달하기 위해 최선을 다하겠습니다."}
          </div>

          {/* 통계 */}
          <div style={{ textAlign: "center", fontSize: "13px", color: "rgba(255,255,255,0.65)", marginBottom: "16px" }}>
            구독 {profile.subscriber_count || 0} | 응원 {profile.point_balance || 0}
          </div>

          {/* SNS 아이콘 (공실상세 스타일) */}
          {agencyInfo?.sns_links && typeof agencyInfo.sns_links === 'object' && Object.keys(agencyInfo.sns_links).filter(k => k !== "api_info" && k !== "api_list" && agencyInfo.sns_links[k]).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px", marginBottom: "20px" }}>
              {Object.keys(agencyInfo.sns_links).filter(k => k !== "api_info" && k !== "api_list" && agencyInfo.sns_links[k]).map(key => {
                const link = agencyInfo.sns_links[key];
                const validUrl = link.startsWith('http') ? link : `https://${link}`;
                let iconHtml;
                switch(key) {
                  case 'contact': iconHtml = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>; break;
                  case 'youtube': iconHtml = <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.99C18.88 4 12 4 12 4s-6.88 0-8.59.43A2.78 2.78 0 0 0 1.46 6.42C1 8.16 1 12 1 12s0 3.84.46 5.58a2.78 2.78 0 0 0 1.95 1.99C5.12 20 12 20 12 20s6.88 0 8.59-.43a2.78 2.78 0 0 0 1.95-1.99C23 15.84 23 12 23 12s0-3.84-.46-5.58zM9.54 15.55V8.45L15.82 12l-6.28 3.55z"></path></svg>; break;
                  case 'instagram': iconHtml = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>; break;
                  case 'facebook': iconHtml = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>; break;
                  case 'twitter': iconHtml = <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>; break;
                  case 'blog': iconHtml = <span style={{ fontSize: 13, fontWeight: "bold" }}>BLOG</span>; break;
                  case 'cafe': iconHtml = <span style={{ fontSize: 13, fontWeight: "bold" }}>CAFE</span>; break;
                  case 'kakao': iconHtml = <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.8 5.2 4.4 6.5l-1 3.7c-.1.3.3.6.5.4l4.3-2.9c.6.1 1.2.1 1.8.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z"></path></svg>; break;
                  case 'homepage': iconHtml = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>; break;
                  case 'shopping_mall': iconHtml = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>; break;
                  default: iconHtml = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>;
                }
                const titleNames: Record<string,string> = { homepage: "홈페이지", contact: "문의하기", shopping_mall: "쇼핑몰", blog: "블로그", cafe: "카페", youtube: "유튜브", facebook: "페이스북", twitter: "트위터", instagram: "인스타그램", kakao: "카카오", threads: "쓰레드" };
                const titleName = titleNames[key] || key;
                return (
                  <a 
                    key={key} 
                    href={validUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    title={titleName}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: "50%", background: "#f8f9fa", border: "1px solid #e0e0e0", color: "#444", transition: "all 0.2s", textDecoration: "none" }}
                  >
                    <div style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>{iconHtml}</div>
                  </a>
                );
              })}
            </div>
          )}

          {/* 버튼들 */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={{ flex: 1, padding: "10px 0", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: "13px", fontWeight: "bold", cursor: "pointer" }}>
              + 구독
            </button>
            <button style={{ flex: 1, padding: "10px 0", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.4)", background: "transparent", color: "#fff", fontSize: "13px", fontWeight: "bold", cursor: "pointer" }}>
              👏 응원
            </button>
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button style={{ flex: 1, padding: "10px 0", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.4)", background: "transparent", color: "#fff", fontSize: "13px", cursor: "pointer" }}>
              ✉️ 메일
            </button>
            <button style={{ flex: 1, padding: "10px 0", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.4)", background: "transparent", color: "#fff", fontSize: "13px", cursor: "pointer" }}>
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
          /* 등록공실 - 공실상세보기 등록자 공실 패턴 적용 */
          <>
            {vacancies.length > 0 ? (
              <div style={{ border: "1px solid #eee", borderRadius: "8px", overflow: "hidden", background: "#fff" }}>
                <div style={{ display: "flex", background: "#f9f9f9", borderBottom: "1px solid #eee" }}>
                  <div style={{ flex: "none", padding: "16px 20px", fontSize: 14, fontWeight: "bold", color: "#111", borderRight: "1px solid #eee", display: "flex", alignItems: "center" }}>
                    공실등록현황
                  </div>
                  <div style={{ display: "flex", alignItems: "center", padding: "0 20px", gap: 16, fontSize: 13, color: "#666", overflowX: "auto", whiteSpace: "nowrap" }}>
                    {[
                      { label: '전체', count: vacancies.length },
                      { label: '매매', count: vacancies.filter(v => v.trade_type === '매매').length },
                      { label: '전세', count: vacancies.filter(v => v.trade_type === '전세').length },
                      { label: '월세', count: vacancies.filter(v => v.trade_type === '월세').length },
                      { label: '단기', count: vacancies.filter(v => v.trade_type === '단기').length }
                    ].map((stat, i, arr) => (
                      <React.Fragment key={stat.label}>
                        <span 
                          onClick={() => setRealtorTradeType(stat.label)}
                          style={{ 
                            cursor: "pointer", 
                            color: realtorTradeType === stat.label ? "#1a73e8" : "#666", 
                            fontWeight: realtorTradeType === stat.label ? "bold" : "normal"
                          }}
                        >
                          {stat.label} <strong style={{color: realtorTradeType === stat.label ? "#1a73e8" : "#111"}}>{stat.count}</strong>
                        </span>
                        {i < arr.length - 1 && <span style={{width:1,height:12,background:"#ddd"}}></span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {vacancies.filter(v => realtorTradeType === "전체" || v.trade_type === realtorTradeType).map((prop: any, i: number) => {
                    const cardMasked = prop.exposure_type === '부동산노출' && userLevel < 2;
                    const cardAddr = prop.building_name || [prop.dong, prop.sigungu].filter(Boolean).join(" ") || "이름없는 공실";
                    const title = cardMasked ? cardAddr.replace(/[^\s]/g, "X") : cardAddr;

                    let price = prop.trade_type;
                    if (prop.trade_type === "매매" || prop.trade_type === "전세") price += ` ${prop.deposit >= 10000 ? `${Math.floor(prop.deposit/10000)}억${prop.deposit%10000!==0 ? ` ${prop.deposit%10000}`:''}` : prop.deposit}`;
                    else if (prop.trade_type === "월세") price += ` ${prop.deposit >= 10000 ? `${Math.floor(prop.deposit/10000)}억${prop.deposit%10000!==0 ? ` ${prop.deposit%10000}`:''}` : prop.deposit} / ${prop.monthly_rent}`;
                    
                    const detailStr = `룸 ${prop.room_count||0}개, 욕실 ${prop.bath_count||0}개`;
                    const thumb = prop.vacancy_photos && prop.vacancy_photos.length > 0 ? prop.vacancy_photos[0].url : "";

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
                        <div style={{
                          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                          padding: "16px 20px", cursor: "pointer", transition: "background 0.15s",
                          borderBottom: "1px solid #f0f0f0", background: "#fff",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#f9fbff"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
                        >
                          <div style={{ flex: 1, paddingRight: thumb ? 12 : 0, minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: "bold", color: cardMasked ? "#bbb" : "#111", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: cardMasked ? 1 : 0 }}>
                              {title}
                              {cardMasked && <span style={{ fontSize: "11px", color: "#3b82f6", fontWeight: 700, background: "#eef6ff", padding: "3px 8px", borderRadius: "4px", marginLeft: "8px", verticalAlign: "middle" }}>🔒 가입 시 무료 열람</span>}
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: "#1a73e8", marginBottom: 4 }}>{price}</div>
                            <div style={{ fontSize: 13, color: "#555", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {prop.property_type || "주택"} <span style={{ color: "#ddd", margin: "0 4px" }}>|</span> {prop.direction || "방향없음"} <span style={{ color: "#ddd", margin: "0 4px" }}>|</span> {prop.exclusive_m2 ? `${prop.exclusive_m2}㎡` : "면적미상"}
                            </div>
                            <div style={{ fontSize: 12, color: "#666", marginBottom: 0, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              {[detailStr, ...(prop.options || [])].filter(Boolean).join(", ")}
                            </div>
                          </div>
                          {thumb && (
                            <div style={{ width: 80, height: 80, borderRadius: 6, overflow: "hidden", background: "#f0f0f0", flexShrink: 0 }}>
                              <img src={thumb} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="" />
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
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
