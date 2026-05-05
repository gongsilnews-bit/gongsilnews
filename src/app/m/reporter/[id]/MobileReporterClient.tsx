"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthModal from "@/components/AuthModal";
import { toggleSubscription, getSubscriptionStatus, cheerReporter, getCheerStatus, getSubscriptionCount, getCheerCount } from "@/app/actions/subscription";

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
  const formatValue = (val: number) => {
    if (!val) return "";
    const m = Math.floor(val / 10000);
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

  if (v.trade_type === '매매') return formatValue(v.sale_price || 0);
  if (v.trade_type === '전세') return formatValue(v.deposit || 0);
  if (v.trade_type === '월세') {
    const depStr = formatValue(v.deposit || 0);
    const rentStr = formatValue(v.monthly_rent || 0);
    return `${depStr || '0'} / ${rentStr || '0'}`;
  }
  return '';
}

export default function MobileReporterClient({
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
  const router = useRouter();
  const [mainTab, setMainTab] = useState<'articles' | 'vacancies'>('articles');
  const [activeTab, setActiveTab] = useState("all");
  const [realtorTradeType, setRealtorTradeType] = useState('전체');

  const filteredArticles =
    activeTab === "all"
      ? articles
      : articles.filter((a: any) => a.section2 === activeTab);

  const [userLevel, setUserLevel] = React.useState<number>(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isCheered, setIsCheered] = useState(false);
  const [subCount, setSubCount] = useState(profile.subscriber_count || 0);
  const [cheerCount, setCheerCount] = useState(profile.point_balance || 0);
  const [subLoading, setSubLoading] = useState(false);
  const [cheerLoading, setCheerLoading] = useState(false);

  useEffect(() => {
    import("@/utils/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          setCurrentUserId(data.user.id);
          supabase.from("members").select("role").eq("id", data.user.id).single().then(res => {
            if (res.data) {
              const r = res.data.role;
              setUserLevel(r === 'SUPER_ADMIN' || r === 'ADMIN' || r === '최고관리자' ? 3 : r === 'REALTOR' ? 2 : 1);
            }
          });
          getSubscriptionStatus(profile.id, data.user.id).then(r => { if (r.success) setIsSubscribed(r.subscribed); });
          getCheerStatus(profile.id, data.user.id).then(r => { if (r.success) setIsCheered(r.cheered); });
        }
      });
    });
    getSubscriptionCount(profile.id).then(r => { if (r.success) setSubCount(r.count); });
    getCheerCount(profile.id).then(r => { if (r.success) setCheerCount(r.count); });
  }, [profile.id]);

  const handleSubscribe = async () => {
    if (!currentUserId) { setIsAuthModalOpen(true); return; }
    if (subLoading) return;
    setSubLoading(true);
    const res = await toggleSubscription(profile.id, currentUserId);
    if (res.success) {
      setIsSubscribed(res.subscribed!);
      setSubCount(res.count!);
    }
    setSubLoading(false);
  };

  const handleCheer = async () => {
    if (!currentUserId) { setIsAuthModalOpen(true); return; }
    if (cheerLoading || isCheered) {
      if (isCheered) alert("오늘은 이미 응원했습니다! 내일 다시 응원해 주세요 😊");
      return;
    }
    setCheerLoading(true);
    const res = await cheerReporter(profile.id, currentUserId);
    if (res.success) {
      setIsCheered(true);
      setCheerCount(res.count!);
    } else if (res.error === "already_cheered") {
      setIsCheered(true);
      alert(res.message);
    }
    setCheerLoading(false);
  };

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
          paddingBottom: "20px",
        }}
      >
        {/* 상단 네비 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
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
        </div>

        {/* 프로필 카드 (공실 상세 디자인 적용) */}
        <div style={{ 
          background: "rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "20px",
          padding: "24px 20px",
          position: "relative",
          zIndex: 10,
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          marginBottom: "30px",
          color: "#fff"
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "20px" }}>
            {profile.profile_image_url ? (
              <img 
                src={profile.profile_image_url} 
                alt="프로필" 
                style={{ width: "72px", height: "72px", borderRadius: "24px", objectFit: "cover", flexShrink: 0, border: "2px solid rgba(255,255,255,0.2)" }} 
              />
            ) : (
              <div style={{ width: "72px", height: "72px", borderRadius: "24px", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: 700, color: "#fff", flexShrink: 0, border: "2px solid rgba(255,255,255,0.2)" }}>
                {(agencyInfo?.name || profile.name || '?')[0]}
              </div>
            )}

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#fff", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                {agencyInfo ? agencyInfo.name : profile.name}
                <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(255,255,255,0.15)", padding: "2px 6px", borderRadius: "8px", fontSize: "10px", fontWeight: 700, color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                  미니홈피
                </div>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {agencyInfo ? (
                  <>
                    <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>
                      대표 {agencyInfo.ceo_name || agencyInfo.representative || profile.name} <span style={{ color: "rgba(255,255,255,0.3)", margin: "0 4px" }}>|</span> 등록번호 {agencyInfo.reg_num || agencyInfo.registration_number || '-'}
                    </span>
                    <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>
                      {[agencyInfo.address, agencyInfo.address_detail].filter(Boolean).join(" ") || '-'}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>
                    {profile.role === "ADMIN" ? "기자" : "일반회원"} <span style={{ color: "rgba(255,255,255,0.3)", margin: "0 4px" }}>|</span> {profile.name}
                  </span>
                )}
                
                <div style={{ fontSize: "14px", color: "#60a5fa", fontWeight: "bold", marginTop: "4px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {agencyInfo?.phone && agencyInfo.phone.split(',').map((num: string, idx: number) => {
                    const cleanNum = num.trim();
                    return (
                      <a key={`ag-${idx}`} href={`tel:${cleanNum}`} style={{ color: "inherit", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        {cleanNum}
                      </a>
                    );
                  })}
                  {profile.phone && !agencyInfo?.phone?.includes(profile.phone) && (
                    <a href={`tel:${profile.phone}`} style={{ color: "inherit", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                      {profile.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 부동산 소개란 (본문처럼 삽입) */}
          {(agencyInfo?.intro || profile.introduction) && (
            <div style={{ padding: "12px 14px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", fontSize: "13px", color: "#eee", border: "1px solid rgba(255,255,255,0.1)", lineHeight: 1.5, wordBreak: "keep-all", marginBottom: "16px" }}>
              <div style={{ fontWeight: "bold", fontSize: "12px", color: "#aaa", marginBottom: "6px" }}>부동산 소개</div>
              {agencyInfo?.intro || profile.introduction}
            </div>
          )}

          {/* SNS Links */}
          {profile.sns_links && Object.keys(profile.sns_links).filter(k => k !== "api_info" && k !== "api_list" && profile.sns_links[k]?.url).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-start", gap: "10px", marginBottom: "20px" }}>
              {Object.keys(profile.sns_links).filter(k => k !== "api_info" && k !== "api_list" && profile.sns_links[k]?.url).map(key => {
                const link = profile.sns_links[key].url;
                const validUrl = link.startsWith('http') ? link : `https://${link}`;
                let iconHtml;
                switch(key) {
                  case 'contact': iconHtml = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>; break;
                  case 'youtube': iconHtml = <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.99C18.88 4 12 4 12 4s-6.88 0-8.59.43A2.78 2.78 0 0 0 1.46 6.42C1 8.16 1 12 1 12s0 3.84.46 5.58a2.78 2.78 0 0 0 1.95 1.99C5.12 20 12 20 12 20s6.88 0 8.59-.43a2.78 2.78 0 0 0 1.95-1.99C23 15.84 23 12 23 12s0-3.84-.46-5.58zM9.54 15.55V8.45L15.82 12l-6.28 3.55z"></path></svg>; break;
                  case 'instagram': iconHtml = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>; break;
                  case 'facebook': iconHtml = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>; break;
                  case 'twitter': iconHtml = <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>; break;
                  case 'blog': iconHtml = <span style={{ fontSize: "13px", fontWeight: "bold" }}>BLOG</span>; break;
                  case 'cafe': iconHtml = <span style={{ fontSize: "13px", fontWeight: "bold" }}>CAFE</span>; break;
                  case 'kakao': iconHtml = <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.8 5.2 4.4 6.5l-1 3.7c-.1.3.3.6.5.4l4.3-2.9c.6.1 1.2.1 1.8.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z"></path></svg>; break;
                  case 'homepage': iconHtml = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>; break;
                  case 'shopping_mall': iconHtml = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>; break;
                  default: iconHtml = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>;
                }
                const titleNames: Record<string,string> = { homepage: "홈페이지", contact: "문의하기", shopping_mall: "쇼핑몰", blog: "블로그", cafe: "카페", youtube: "유튜브", facebook: "페이스북", twitter: "트위터", instagram: "인스타그램", kakao: "카카오", threads: "쓰레드" };
                return (
                  <a 
                    key={key} href={validUrl} target="_blank" rel="noopener noreferrer" title={titleNames[key] || key}
                    style={{ 
                      display: "flex", alignItems: "center", justifyContent: "center", 
                      width: "40px", height: "40px", borderRadius: "50%", 
                      background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", 
                      color: "#fff", transition: "all 0.2s", textDecoration: "none" 
                    }}
                  >
                    <div style={{ width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>{iconHtml}</div>
                  </a>
                );
              })}
            </div>
          )}

          {/* 통계 */}
          <div style={{ textAlign: "center", fontSize: "13px", color: "rgba(255,255,255,0.7)", marginBottom: "16px" }}>
            구독 {subCount.toLocaleString()} | 응원 {cheerCount.toLocaleString()}
          </div>

          {/* 구독/응원/오시는길/공유 버튼 (PC와 동일한 구조) */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={handleSubscribe} disabled={subLoading}
              style={{ flex: 1, padding: "12px 0", borderRadius: "10px", border: isSubscribed ? "none" : "1px solid rgba(255,255,255,0.2)", background: isSubscribed ? "rgba(255,255,255,0.15)" : "transparent", color: "#fff", fontSize: "14px", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s" }}>
              {subLoading ? "..." : isSubscribed ? "✓ 구독중" : "+ 구독"}
            </button>
            <button onClick={handleCheer} disabled={cheerLoading}
              style={{ flex: 1, padding: "12px 0", borderRadius: "10px", border: isCheered ? "none" : "1px solid rgba(255,255,255,0.2)", background: isCheered ? "rgba(255,255,255,0.15)" : "transparent", color: "#fff", fontSize: "14px", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s" }}>
              {cheerLoading ? "..." : isCheered ? "✓ 응원중" : "👏 응원"}
            </button>
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button onClick={() => {
              const fullAddress = [agencyInfo?.address, agencyInfo?.address_detail].filter(Boolean).join(" ");
              if (fullAddress) {
                window.open(`https://map.kakao.com/link/search/${encodeURIComponent(fullAddress)}`);
              } else {
                alert("등록된 주소가 없습니다.");
              }
            }} style={{ flex: 1, padding: "10px 0", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              오시는길
            </button>
            <button style={{ flex: 1, padding: "10px 0", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
              공유
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
          전체기사 <span style={{ color: '#f97316', fontSize: '13px' }}>{articles.length}</span>
        </button>
        <button onClick={() => setMainTab('vacancies')} style={{ flex: 1, padding: '14px 0', fontSize: '15px', fontWeight: mainTab === 'vacancies' ? 800 : 600, color: mainTab === 'vacancies' ? '#111' : '#888', background: 'none', border: 'none', borderBottom: mainTab === 'vacancies' ? '3px solid #3b82f6' : '3px solid transparent', cursor: 'pointer' }}>
          등록공실 <span style={{ color: '#3b82f6', fontSize: '13px' }}>{vacancies.length}</span>
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
            총 <span style={{ color: '#f97316', fontWeight: 800 }}>{filteredArticles.length}</span>건
          </div>

          {/* 기사 목록 - 리스트형 */}
          <div style={{ flex: 1, padding: '0 16px 24px' }}>
            {filteredArticles.map((article: any) => (
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
        /* ═══ 등록공실 탭 - 공실상세보기 등록자 공실 패턴 적용 ═══ */
        <div style={{ flex: 1, padding: '8px 16px 24px', backgroundColor: '#f9fafb' }}>
          {vacancies.length > 0 ? (
            <div style={{ border: "1px solid #eee", borderRadius: "8px", overflow: "hidden", background: "#fff" }}>
              <div style={{ display: "flex", background: "#f9f9f9", borderBottom: "1px solid #eee" }}>
                <div style={{ flex: "none", padding: "12px 16px", fontSize: 13, fontWeight: "bold", color: "#111", borderRight: "1px solid #eee", display: "flex", alignItems: "center" }}>
                  공실등록현황
                </div>
                <div className="hide-scrollbar" style={{ display: "flex", alignItems: "center", padding: "0 16px", gap: 12, fontSize: 12, color: "#666", overflowX: "auto", whiteSpace: "nowrap" }}>
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
                      {i < arr.length - 1 && <span style={{width:1,height:10,background:"#ddd"}}></span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {vacancies.filter(v => realtorTradeType === "전체" || v.trade_type === realtorTradeType).map((prop, i) => {
                  const cardMasked = prop.exposure_type === '부동산노출' && userLevel < 2;
                  const cardAddr = prop.building_name || [prop.dong, prop.sigungu].filter(Boolean).join(" ") || "이름없는 공실";
                  const title = cardMasked ? cardAddr.replace(/[^\s]/g, "X") : cardAddr;

                  const price = `${prop.trade_type} ${formatPrice(prop)}`;
                  
                  const detailStr = `룸 ${prop.room_count||0}개, 욕실 ${prop.bath_count||0}개`;
                  const thumb = prop.vacancy_photos && prop.vacancy_photos.length > 0 ? prop.vacancy_photos[0].url : "";

                  return (
                    <Link 
                      href={`/m/gongsil?id=${prop.id}`} 
                      key={prop.id || i} 
                      style={{ textDecoration: "none", color: "inherit", display: "block" }}
                      onClick={(e) => {
                        if (cardMasked) {
                          e.preventDefault();
                          setIsAuthModalOpen(true);
                        }
                      }}
                    >
                      <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                        padding: "16px", cursor: "pointer", transition: "background 0.15s",
                        borderBottom: "1px solid #f0f0f0", background: "#fff",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#f9fbff"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
                      >
                        <div style={{ flex: 1, paddingRight: thumb ? 12 : 0, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: "bold", color: cardMasked ? "#bbb" : "#111", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: cardMasked ? 1 : 0 }}>
                            {title}
                            {cardMasked && <span style={{ fontSize: "10px", color: "#3b82f6", fontWeight: 700, background: "#eef6ff", padding: "2px 6px", borderRadius: "4px", marginLeft: "6px", verticalAlign: "middle" }}>🔒 가입 시 무료 열람</span>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <div style={{ fontSize: 15, fontWeight: 800, color: "#1a73e8" }}>{price}</div>
                            {userLevel >= 2 && (prop.realtor_commission || prop.commission_type) && (
                              <span style={{ display: "inline-block", fontSize: 11, color: "#fa5252", border: "1px solid #fa5252", padding: "1px 5px", borderRadius: 4, fontWeight: "bold" }}>
                                {prop.realtor_commission || prop.commission_type}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: "#555", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {prop.property_type || "주택"} <span style={{ color: "#ddd", margin: "0 4px" }}>|</span> {prop.direction || "방향없음"} <span style={{ color: "#ddd", margin: "0 4px" }}>|</span> {prop.exclusive_m2 ? `${prop.exclusive_m2}㎡` : "면적미상"}
                          </div>
                          <div style={{ fontSize: 11, color: "#666", marginBottom: 0, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {[detailStr, ...(prop.options || [])].filter(Boolean).join(", ")}
                          </div>
                        </div>
                        {thumb && (
                          <div style={{ width: 72, height: 72, borderRadius: 6, overflow: "hidden", background: "#f0f0f0", flexShrink: 0 }}>
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
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: '14px' }}>
              등록된 공실 매물이 없습니다.
            </div>
          )}
        </div>
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialTab="login" />
    </div>
  );
}
