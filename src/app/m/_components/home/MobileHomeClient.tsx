"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";

const MiniVacancyMap = dynamic(() => import("./MiniVacancyMap"), { ssr: false });
import { useRouter } from "next/navigation";
import AuthModal from "@/components/AuthModal";
import { createClient } from "@/utils/supabase/client";

function formatDate(d: string) {
  if (!d) return "";
  const dt = new Date(d);
  const now = new Date();
  const h = Math.floor((now.getTime() - dt.getTime()) / 3600000);
  if (h < 1) return "방금 전";
  if (h < 24) return `${h}시간 전`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}일 전`;
  return `${dt.getMonth() + 1}.${dt.getDate()}`;
}

function formatPrice(v: any): string {
  const dep = v.deposit || 0;
  const rent = v.monthly_rent || 0;
  const trade = v.trade_type || "";
  const fmt = (n: number) => n >= 100000000 ? `${(n/100000000).toFixed(n%100000000===0?0:1)}억` : n >= 10000 ? `${Math.round(n/10000)}만` : `${n}`;
  if (trade === "월세" && rent > 0) return `${fmt(dep)}/${fmt(rent)}`;
  if (trade === "전세") return `전세 ${fmt(dep)}`;
  if (dep > 0) return fmt(dep);
  return "-";
}

interface Props {
  vacancies: any[];
  headlineArticles: any[];
  gongsilArticles: any[];
  realestateArticles: any[];
  marketingArticles: any[];
  lifeArticles: any[];
  mapArticles: any[];
  lectures: any[];
}

const CATEGORIES = [
  { key: "home", label: "홈", path: "/m" },
  { key: "news_gongsil", label: "공실뉴스", path: "/m/news_gongsil" },
  { key: "news_politics", label: "부동산·경제", path: "/m/news_politics" },
  { key: "news_marketing", label: "AI마케팅", path: "/m/news_marketing" },
  { key: "news_etc", label: "라이프·오피니언", path: "/m/news_etc" },
];

export default function MobileHomeClient(props: Props) {
  const { vacancies, headlineArticles, gongsilArticles, realestateArticles, marketingArticles, lifeArticles, mapArticles, lectures } = props;
  const router = useRouter();
  const [heroIdx, setHeroIdx] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipingHero, setIsSwipingHero] = useState(false);

  const heroScrollRef = useRef<HTMLDivElement>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    async function getSession() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: memberData } = await supabase
          .from("members")
          .select("role")
          .eq("id", user.id)
          .single();
        setCurrentUser({ ...user, role: memberData?.role });
      } else {
        setCurrentUser(null);
      }
    }
    getSession();
  }, []);

  // ── 헤드라인 자동 슬라이드 (3초마다) ──
  useEffect(() => {
    if (headlineArticles.length <= 1 || isSwipingHero) return;
    const timer = setInterval(() => {
      if (heroScrollRef.current) {
        const width = heroScrollRef.current.clientWidth;
        const maxScroll = heroScrollRef.current.scrollWidth - width;
        let nextScroll = heroScrollRef.current.scrollLeft + width;
        if (nextScroll > maxScroll + 10) nextScroll = 0;
        heroScrollRef.current.scrollTo({ left: nextScroll, behavior: "smooth" });
      }
    }, 3500);
    return () => clearInterval(timer);
  }, [headlineArticles.length, isSwipingHero]);
  
  // ── 스와이프 탭 전환 ──
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleSwipeStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleSwipeEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(dy) > Math.abs(dx)) return;
    if (dx < -60) {
      // ← 왼쪽 스와이프 → 다음 카테고리(공실뉴스)로 이동
      router.push("/m/news_gongsil");
    }
  };

  return (
    <div
      onTouchStart={handleSwipeStart}
      onTouchEnd={handleSwipeEnd}
      style={{ display: "flex", flexDirection: "column", width: "100%", background: "#F4F6F8", minHeight: "100vh", paddingBottom: "80px", letterSpacing: "-0.3px", overflow: "hidden" }}
    >
      {/* 네비게이션 메뉴 (네이버 모바일 스타일 가로 스와이프) */}
      <div
        className="hide-scrollbar"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-x",
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #f0f0f0", // Subtle border under nav instead of thick background
          position: "fixed",
          top: "50px", // Match new header height
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "448px",
          zIndex: 40,
          scrollBehavior: "smooth",
        }}
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => {
              if (cat.key === "home") return;
              router.push(cat.path);
            }}
            style={{
              flexShrink: 0,
              padding: "11px 16px 0",
              fontSize: "17px",
              fontWeight: cat.key === "home" ? 700 : 500,
              color: cat.key === "home" ? "#1a2e50" : "#222222",
              background: "none",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
              letterSpacing: "-0.3px",
            }}
          >
            <span style={{
              display: "inline-block",
              paddingBottom: "5px",
              borderBottom: cat.key === "home" ? "3px solid #1a2e50" : "3px solid transparent",
            }}>
              {cat.label}
            </span>
          </button>
        ))}
      </div>
      {/* 카테고리 바 높이만큼 공간 확보 */}
      <div style={{ height: "46px" }} />

      {/* ① Hero 배너 (헤드라인 기사) — CSS Scroll Snap 으로 변경하여 버벅임 제거 */}
      {headlineArticles.length > 0 && (
        <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", maxHeight: 280 }}>
          <div
            ref={heroScrollRef}
            className="no-scrollbar"
            style={{ 
              display: "flex", width: "100%", height: "100%", 
              overflowX: "auto", scrollSnapType: "x mandatory", scrollBehavior: "smooth", WebkitOverflowScrolling: "touch",
              overscrollBehaviorX: "contain"
            }}
            onTouchStart={(e) => { e.stopPropagation(); setIsSwipingHero(true); }}
            onTouchEnd={() => setIsSwipingHero(false)}
            onScroll={(e) => {
               const scrollLeft = e.currentTarget.scrollLeft;
               const width = e.currentTarget.clientWidth;
               if (width > 0) {
                 const newIdx = Math.round(scrollLeft / width);
                 if (newIdx !== heroIdx) setHeroIdx(newIdx);
               }
            }}
          >
            {headlineArticles.slice(0, 5).map((hero, i) => (
              <Link key={i} href={`/m/news/${hero.article_no || hero.id}`} style={{ width: "100%", height: "100%", flexShrink: 0, scrollSnapAlign: "start", scrollSnapStop: "always", position: "relative", display: "block", textDecoration: "none" }}>
                {hero.thumbnail_url
                  ? <img src={hero.thumbnail_url} alt={hero.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1a2e50,#2d4a7a)" }} />}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.2) 55%,transparent 100%)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px", zIndex: 2, pointerEvents: "none" }}>
                  <span style={{ background: "#dc2626", color: "#fff", fontSize: 12, fontWeight: 700, padding: "3px 8px", borderRadius: 3, display: "inline-block", marginBottom: 8, letterSpacing: "0.5px" }}>HEADLINE</span>
                  <h2 style={{ color: "#fff", fontSize: 19, fontWeight: 800, lineHeight: 1.45, wordBreak: "keep-all", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", letterSpacing: "-0.5px" }}>{hero.title}</h2>
                  <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 6, marginBottom: 0, letterSpacing: "-0.2px" }}>{hero.author_name} · {formatDate(hero.published_at || hero.created_at)}</p>
                </div>
              </Link>
            ))}
          </div>
          
          {/* 하단 점(인디케이터) */}
          {headlineArticles.length > 1 && (
            <div style={{ position: "absolute", bottom: 12, right: 12, display: "flex", gap: 6, alignItems: "center", zIndex: 10, pointerEvents: "none" }}>
              {headlineArticles.slice(0, 5).map((_, i) => (
                <div key={i} style={{ width: i === heroIdx ? 20 : 6, height: 6, borderRadius: 3, background: i === heroIdx ? "#fff" : "rgba(255,255,255,0.4)", transition: "all 0.3s" }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ② 실시간 공실 공실광고 - 카카오 지도 미리보기 */}
      <div style={{ background: "#fff", marginBottom: 12, borderBottom: "1px solid #f0f0f0", position: "relative" }}>
        {/* 🛑 6월 1일 오픈 전 가림막 (오버레이) */}
        <div style={{ 
          position: "absolute", top: 0, left: 0, width: "100%", height: "100%", 
          background: "rgba(255,255,255,0.75)", backdropFilter: "blur(6px)", zIndex: 10, 
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" 
        }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: 18, color: "#111", fontWeight: 800, letterSpacing: "-0.5px" }}>6월 1일 정식 오픈!</h3>
          <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "#555", lineHeight: 1.4 }}>현재는 중개사무소 회원<br/>사전 매물 등록 기간입니다.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/signup" style={{ background: "#1a73e8", color: "#fff", padding: "8px 14px", borderRadius: 6, fontSize: 13, fontWeight: "bold", textDecoration: "none" }}>중개사무소 가입</Link>
            <Link href="/realty_admin" style={{ background: "#fff", color: "#1a73e8", border: "1px solid #1a73e8", padding: "8px 14px", borderRadius: 6, fontSize: 13, fontWeight: "bold", textDecoration: "none" }}>매물 등록</Link>
          </div>
        </div>

        <div className="sec-hd">
          <h2>실시간 공실 공실광고</h2>
          <span style={{ fontSize: 15, color: "#6b7280", textDecoration: "none", cursor: "default" }}>더보기 ›</span>
        </div>
        <div style={{ padding: "0 16px 16px", position: "relative" }}>
          <MiniVacancyMap vacancies={vacancies} />
        </div>
      </div>


      {/* ② 공실뉴스 */}
      <NewsSection title="공실뉴스" href="/m/news_gongsil" articles={gongsilArticles} />

      {/* ③ 부동산·경제 */}
      <NewsSection title="부동산·경제" href="/m/news_politics" articles={realestateArticles} />

      {/* ④ 우리동네뉴스 (PC VideoGrid 대응) */}
      {mapArticles.length > 0 && (
        <div style={{ background: "#fff", marginBottom: 12, borderBottom: "1px solid #f0f0f0" }}>
          <div className="sec-hd">
            <h2>우리동네뉴스</h2>
            <Link href="/m/news_map" style={{ fontSize: 15, color: "#6b7280", textDecoration: "none" }}>더보기 ›</Link>
          </div>
          <div className="no-scrollbar" style={{ display: "flex", gap: 12, padding: "0 16px 16px", overflowX: "auto" }} onTouchStart={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
            {mapArticles.slice(0, 5).map((a: any) => (
              <Link key={a.id} href={`/m/news/${a.article_no || a.id}`} className="tap"
                style={{ flexShrink: 0, width: "calc(50vw - 22px)", maxWidth: 200, borderRadius: 10, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", border: "1px solid #f3f4f6", background: "#fff", cursor: "pointer", textDecoration: "none", display: "block" }}>
                <div style={{ width: "100%", aspectRatio: "16/9", overflow: "hidden", background: "#e5e7eb", position: "relative" }}>
                  {a.thumbnail_url
                    ? <Image src={a.thumbnail_url} alt="" fill style={{ objectFit: "cover" }} sizes="50vw" />
                    : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1a2e50,#2d4a7a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>📺</div>}
                  {a.youtube_url && (
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 36, height: 36, background: "rgba(0,0,0,0.55)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  )}
                </div>
                <div style={{ padding: "10px" }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#333333", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "keep-all", margin: 0, letterSpacing: "-0.3px" }}>{a.title}</p>
                  <p style={{ fontSize: 13, color: "#222222", fontWeight: 500, marginTop: 5 }}>{formatDate(a.published_at || a.created_at)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ⑤ AI마케팅 */}
      <NewsSection title="AI마케팅" href="/m/news_marketing" articles={marketingArticles} />

      {/* ⑥ 라이프·오피니언 */}
      <NewsSection title="라이프·오피니언" href="/m/news_etc" articles={lifeArticles} />

      {/* ⑨ 부동산특강 (PC SpecialLectureBanner 대응) */}
      {lectures.length > 0 && (
        <div style={{ background: "#fff", marginBottom: 12, borderBottom: "1px solid #f0f0f0" }}>
          <div className="sec-hd">
            <h2>부동산특강</h2>
            <Link href="/m/study" style={{ fontSize: 15, color: "#6b7280", textDecoration: "none" }}>더보기 ›</Link>
          </div>
          <div className="no-scrollbar" style={{ display: "flex", gap: 12, padding: "0 16px 16px", overflowX: "auto" }} onTouchStart={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
            {lectures.map((lec: any) => (
              <Link key={lec.id} href={`/m/study_read?id=${lec.id}`}
                style={{ flexShrink: 0, width: 180, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", border: "1px solid #f3f4f6", background: "#fff", textDecoration: "none", display: "block" }}>
                <div style={{ width: "100%", height: 112, overflow: "hidden", background: "#e5e7eb", position: "relative" }}>
                  {lec.thumbnail_url
                    ? <Image src={lec.thumbnail_url} alt={lec.title} fill style={{ objectFit: "cover" }} sizes="50vw" />
                    : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#667eea,#764ba2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700, padding: "0 8px", textAlign: "center" }}>{lec.category || "특강"}</div>}
                </div>
                <div style={{ padding: "10px" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#8a3ffc", display: "block", marginBottom: 4, letterSpacing: "-0.2px" }}>{lec.category}</span>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#333333", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", margin: "0 0 6px", wordBreak: "keep-all", letterSpacing: "-0.3px" }}>{lec.title}</p>
                  <p style={{ fontSize: 14, color: "#666666", margin: 0 }}>{lec.instructor_name || "공실마스터"}</p>
                  <p style={{ fontSize: 15, fontWeight: 800, color: "#333333", marginTop: 6 }}>{lec.discount_price || lec.price ? `${(lec.discount_price || lec.price).toLocaleString()}P` : "무료"}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar{display:none;}
        .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none;}
        .tap{-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;}
        .tap:active{background:#f3f4f6 !important;}
        .sec-hd{display:flex;align-items:center;justify-content:space-between;padding:20px 16px 14px;}
        .sec-hd h2{font-size:18px;font-weight:800;color:#333333;margin:0;letter-spacing:-0.5px;}
        .sec-hd a{font-size:15px;color:#999999;text-decoration:none;display:flex;align-items:center;gap:2px;letter-spacing:-0.2px;}
        .art-row{display:flex;gap:12px;padding:12px 16px;cursor:pointer;border-bottom:1px solid #f0f0f0;transition:background 0.15s ease;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;text-decoration:none;}
        .art-row:last-child{border-bottom:none;}
        .art-row:active{background:#f3f4f6 !important;}
        .skeleton{background:linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:6px;}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>

      {/* FAB: 공실등록 */}
      <button
        onClick={() => {
          if (!currentUser) {
            alert("공실을 등록하려면 로그인이 필요합니다.");
            setIsAuthModalOpen(true);
          } else {
            router.push("/m/admin/vacancy/write");
          }
        }}
        style={{
          position: "fixed", bottom: "80px", right: "16px", height: "48px",
          borderRadius: "24px", background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
          color: "#fff", border: "none", boxShadow: "0 6px 20px rgba(29, 78, 216, 0.4)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 18px", gap: "6px",
          zIndex: 40,
          transition: "transform 0.15s ease",
        }}
        onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.92)"; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        onTouchStart={(e) => { e.currentTarget.style.transform = "scale(0.92)"; }}
        onTouchEnd={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: "none" }}>
          <rect x="4" y="2" width="10" height="15" rx="1.5" ry="1.5" />
          <line x1="7" y1="5" x2="8" y2="5" />
          <line x1="7" y1="8" x2="8" y2="8" />
          <line x1="7" y1="11" x2="8" y2="11" />
          <line x1="11" y1="5" x2="12" y2="5" />
          <line x1="11" y1="8" x2="12" y2="8" />
          <line x1="11" y1="11" x2="12" y2="11" />
          <path d="M9 17v-3h2v3" />
          <path d="M14 17h6M17 14v6" stroke="#ffffff" strokeWidth="2.5" />
        </svg>
        <span style={{ fontSize: "14px", fontWeight: 800, color: "#fff", whiteSpace: "nowrap" }}>공실등록</span>
      </button>

      {/* 로그인 모달 */}
      {isAuthModalOpen && (
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      )}
    </div>
  );
}

function NewsSection({ title, href, articles }: { title: string; href: string; articles: any[]; }) {
  if (articles.length === 0) return null;
  const [main, ...rest] = articles;

  return (
    <div style={{ background: "#fff", marginBottom: 12, borderBottom: "1px solid #f0f0f0" }}>
      <div className="sec-hd">
        <h2>{title}</h2>
        <Link href={href} style={{ fontSize: 15, color: "#999999", textDecoration: "none", letterSpacing: "-0.2px" }}>더보기 ›</Link>
      </div>
      {/* 메인 기사 (큰 썸네일) */}
      <Link href={`/m/news/${main.article_no || main.id}`} className="tap art-row"
        style={{ padding: "14px 16px", cursor: "pointer", borderBottom: "1px solid #f0f0f0", display: "block" }}>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#333333", lineHeight: 1.5, marginBottom: 6, wordBreak: "keep-all", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", margin: "0 0 6px", letterSpacing: "-0.5px" }}>{main.title}</h3>
            <p style={{ fontSize: 14, color: "#222222", fontWeight: 500, margin: 0, letterSpacing: "-0.2px" }}>{main.author_name} · {formatDate(main.published_at || main.created_at)}</p>
          </div>
          {main.thumbnail_url && (
            <div style={{ width: 104, height: 80, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "#e5e7eb", position: "relative" }}>
              <Image src={main.thumbnail_url} alt="" fill style={{ objectFit: "cover" }} sizes="104px" />
            </div>
          )}
        </div>
      </Link>
      {/* 나머지 기사 (번호 리스트) */}
      {rest.slice(0, 3).map((a: any, i: number) => (
        <Link key={a.id} href={`/m/news/${a.article_no || a.id}`} className="tap art-row" style={{ display: "flex" }}>
          <span style={{ flexShrink: 0, width: 24, fontSize: 17, fontWeight: 800, color: i === 0 ? "#508bf5" : "#d1d5db", alignSelf: "center" }}>{i + 1}</span>
          <p style={{ fontSize: 18, fontWeight: 600, color: "#333333", lineHeight: 1.5, flex: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "keep-all", margin: 0, letterSpacing: "-0.3px" }}>{a.title}</p>
          {a.thumbnail_url && (
            <div style={{ width: 104, height: 80, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "#e5e7eb", position: "relative" }}>
              <Image src={a.thumbnail_url} alt="" fill style={{ objectFit: "cover" }} sizes="104px" />
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
