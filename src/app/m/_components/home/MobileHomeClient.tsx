"use client";

import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
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
  if (h < 1) return "Î∞©Í∏à ??;
  if (h < 24) return `${h}?úÍ∞Ñ ??;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}????;
  return `${dt.getMonth() + 1}.${dt.getDate()}`;
}

function formatPrice(v: any): string {
  const dep = v.deposit || 0;
  const rent = v.monthly_rent || 0;
  const trade = v.trade_type || "";
  const fmt = (n: number) => n >= 100000000 ? `${(n/100000000).toFixed(n%100000000===0?0:1)}?? : n >= 10000 ? `${Math.round(n/10000)}Îß? : `${n}`;
  if (trade === "Í≤ΩÎß§") return fmt(dep);
  if (trade === "?îÏÑ∏" && rent > 0) return `${fmt(dep)}/${fmt(rent)}`;
  if (trade === "?ÑÏÑ∏") return `?ÑÏÑ∏ ${fmt(dep)}`;
  if (dep > 0) return fmt(dep);
  return "-";
}

const extractYoutubeId = (url?: string, html?: string): string | null => {
  const rx = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/;
  if (url) {
    const m = url.match(rx);
    if (m) return m[1];
  }
  if (html) {
    const m = html.match(rx);
    if (m) return m[1];
  }
  return null;
};

interface Props {
  vacancies: any[];
  headlineArticles: any[];
  gongsilArticles: any[];
  realestateArticles: any[];
  marketingArticles: any[];
  lifeArticles: any[];
  lectures: any[];
  dronePosts: any[];
}

const CATEGORIES = [
  { key: "home", label: "??, path: "/m" },
  { key: "news_gongsil", label: "Í≥µÏã§?¥Ïä§", path: "/m/news_gongsil" },
  { key: "news_politics", label: "Î∂Ä?ôÏÇ∞¬∑Í≤ΩÏ†ú", path: "/m/news_politics" },
  { key: "news_marketing", label: "AIÎßàÏ???, path: "/m/news_marketing" },
  { key: "news_etc", label: "?ºÏù¥?Ñ¬∑Ïò§?ºÎãà??, path: "/m/news_etc" },
];

export default function MobileHomeClient(props: Props) {
  const { headlineArticles, gongsilArticles, realestateArticles, marketingArticles, lifeArticles, lectures, dronePosts } = props;
  const router = useRouter();
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [heroIdx, setHeroIdx] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipingHero, setIsSwipingHero] = useState(false);

  const heroScrollRef = useRef<HTMLDivElement>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    async function loadVacancies() {
      setIsMapLoading(true);
      const { getVacanciesForMap } = await import("@/app/actions/vacancy");
      const res = await getVacanciesForMap({ limit: 10000 });
      if (res.success && res.data) {
        setVacancies(res.data);
      }
      setIsMapLoading(false);
    }
    loadVacancies();
  }, []);

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

  // ???îÎ©¥ ?§ÌÅ¨Î°?Î≥µÏõê: Í∏∞ÏÇ¨ ?¥Î¶≠ ???§Î°úÍ∞ÄÍ∏???Î≥¥Îçò ?ÑÏπòÎ°?Ï¶âÏãú Î≥µÏõê (ÍπúÎπ°???úÍ±∞)
  useLayoutEffect(() => {
    const savedScroll = sessionStorage.getItem('mobile_home_scroll');
    if (savedScroll) {
      const scrollY = parseInt(savedScroll, 10);
      sessionStorage.removeItem('mobile_home_scroll');
      window.scrollTo(0, scrollY);
      const origScrollTo = window.scrollTo;
      (window as any).scrollTo = function(...args: any[]) {
        let targetY: number | undefined;
        if (typeof args[0] === 'number') targetY = args[1] as number;
        else if (args[0] && typeof args[0] === 'object') targetY = (args[0] as ScrollToOptions).top;
        if (targetY === 0) return;
        return origScrollTo.apply(window, args as any);
      };
      setTimeout(() => { (window as any).scrollTo = origScrollTo; }, 300);
    }
  }, []);

  const saveHomeScroll = () => sessionStorage.setItem('mobile_home_scroll', window.scrollY.toString());

  // ?Ä?Ä ?§Îìú?ºÏù∏ ?êÎèô ?¨Îùº?¥Îìú (3Ï¥àÎßà?? ?Ä?Ä
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

  return (
    <div
      style={{ display: "flex", flexDirection: "column", width: "100%", background: "#F4F6F8", minHeight: "100vh", paddingBottom: "80px", letterSpacing: "-0.3px", overflow: "hidden" }}
    >
      {/* ?§ÎπÑÍ≤åÏù¥??Î©îÎâ¥ (?§Ïù¥Î≤?Î™®Î∞î???§Ì???Í∞ÄÎ°??§Ï??¥ÌîÑ) */}
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
      {/* Ïπ¥ÌÖåÍ≥†Î¶¨ Î∞??íÏù¥ÎßåÌÅº Í≥µÍ∞Ñ ?ïÎ≥¥ */}
      <div style={{ height: "46px" }} />

      {/* ??Hero Î∞∞ÎÑà (?§Îìú?ºÏù∏ Í∏∞ÏÇ¨) ??CSS Scroll Snap ?ºÎ°ú Î≥ÄÍ≤ΩÌïò??Î≤ÑÎ≤Ö???úÍ±∞ */}
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
              <Link key={i} href={`/m/news/${hero.article_no || hero.id}`} onClick={saveHomeScroll} style={{ width: "100%", height: "100%", flexShrink: 0, scrollSnapAlign: "start", scrollSnapStop: "always", position: "relative", display: "block", textDecoration: "none" }}>
                {hero.thumbnail_url
                  ? <img src={hero.thumbnail_url} alt={hero.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1a2e50,#2d4a7a)" }} />}
                {!!extractYoutubeId(hero.youtube_url, hero.content) && (
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 48, height: 48, background: "rgba(0,0,0,0.5)", borderRadius: "50%", border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3 }}>
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="white" style={{ marginLeft: "1.5px" }}><path d="M8 5v14l11-7z"/></svg>
                  </div>
                )}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.2) 55%,transparent 100%)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px", zIndex: 2, pointerEvents: "none" }}>
                  <span style={{ background: "#dc2626", color: "#fff", fontSize: 12, fontWeight: 700, padding: "3px 8px", borderRadius: 3, display: "inline-block", marginBottom: 8, letterSpacing: "0.5px" }}>HEADLINE</span>
                  <h2 style={{ color: "#fff", fontSize: 19, fontWeight: 800, lineHeight: 1.45, wordBreak: "keep-all", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", letterSpacing: "-0.5px" }}>{hero.title}</h2>
                  <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 6, marginBottom: 0, letterSpacing: "-0.2px" }}>{hero.author_name} ¬∑ {formatDate(hero.published_at || hero.created_at)}</p>
                </div>
              </Link>
            ))}
          </div>
          
          {/* ?òÎã® ???∏ÎîîÏºÄ?¥ÌÑ∞) */}
          {headlineArticles.length > 1 && (
            <div style={{ position: "absolute", bottom: 12, right: 12, display: "flex", gap: 6, alignItems: "center", zIndex: 10, pointerEvents: "none" }}>
              {headlineArticles.slice(0, 5).map((_, i) => (
                <div key={i} style={{ width: i === heroIdx ? 20 : 6, height: 6, borderRadius: 3, background: i === heroIdx ? "#fff" : "rgba(255,255,255,0.4)", transition: "all 0.3s" }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ???§ÏãúÍ∞?Í≥µÏã§ Í≥µÏã§Í¥ëÍ≥† - Ïπ¥Ïπ¥??ÏßÄ??ÎØ∏Î¶¨Î≥¥Í∏∞ */}
      <div style={{ background: "#fff", marginBottom: 12, borderBottom: "1px solid #f0f0f0", position: "relative" }}>


        <div className="sec-hd">
          <h2>?§ÏãúÍ∞?Í≥µÏã§ Í≥µÏã§Í¥ëÍ≥†</h2>
          <span style={{ fontSize: 15, color: "#6b7280", textDecoration: "none", cursor: "default" }}>?îÎ≥¥Í∏???/span>
        </div>
        <div style={{ padding: "0 16px 16px", position: "relative" }}>
          <MiniVacancyMap vacancies={vacancies} isLoading={isMapLoading} />
        </div>
      </div>


      {/* ??Í≥µÏã§?¥Ïä§ */}
      <NewsSection title="Í≥µÏã§?¥Ïä§" href="/m/news_gongsil" articles={gongsilArticles} onArticleClick={saveHomeScroll} />

      {/* ??Î∂Ä?ôÏÇ∞¬∑Í≤ΩÏ†ú */}
      <NewsSection title="Î∂Ä?ôÏÇ∞¬∑Í≤ΩÏ†ú" href="/m/news_politics" articles={realestateArticles} onArticleClick={saveHomeScroll} />

      {/* ??Í≥µÏã§?¥Ïä§ ?ÅÏÉÅ (PC Í≤Ä?ÄÎ∞∞Í≤Ω VideoGrid Î™®Î∞î??Î≤ÑÏ†Ñ) */}
      {(() => {
        const ytRx = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/;
        const videoArticles = gongsilArticles.filter((a: any) => {
          if (a.youtube_url && ytRx.test(a.youtube_url)) return true;
          if (a.content && ytRx.test(a.content)) return true;
          return false;
        }).slice(0, 5);
        if (videoArticles.length === 0) return null;
        return (
          <div style={{ background: "#111", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 16px 14px" }}>
              <Link href="/m/news_gongsil" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
                <svg width="24" height="17" viewBox="0 0 28 20" fill="none"><rect width="28" height="20" rx="4" fill="#FF0000"/><path d="M11 5.5L19.5 10L11 14.5V5.5Z" fill="white"/></svg>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>Í≥µÏã§?¥Ïä§</span>
              </Link>
              <Link href="/m/news_gongsil" style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>?îÎ≥¥Í∏???/Link>
            </div>
            <div className="no-scrollbar" style={{ display: "flex", gap: 12, padding: "0 16px 20px", overflowX: "auto" }} onTouchStart={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
              {videoArticles.map((a: any) => {
                const ytMatch = (a.youtube_url || a.content || "").match(ytRx);
                const ytId = ytMatch ? ytMatch[1] : null;
                const thumbSrc = a.thumbnail_url || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null);
                return (
                  <Link key={a.id} href={`/m/news/${a.article_no || a.id}`} className="tap" onClick={saveHomeScroll}
                    style={{ flexShrink: 0, width: "calc(65vw - 16px)", maxWidth: 260, borderRadius: 10, overflow: "hidden", cursor: "pointer", textDecoration: "none", display: "block" }}>
                    <div style={{ width: "100%", aspectRatio: "16/9", overflow: "hidden", background: "#222", position: "relative", borderRadius: 10 }}>
                      {thumbSrc
                        ? <Image src={thumbSrc} alt="" fill style={{ objectFit: "cover", opacity: 0.85 }} sizes="65vw" />
                        : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1a2e50,#2d4a7a)" }} />}
                      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 44, height: 44, background: "rgba(0,0,0,0.5)", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="white" style={{ marginLeft: 2 }}><path d="M8 5v14l11-7z"/></svg>
                      </div>
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "keep-all", margin: "10px 0 0", letterSpacing: "-0.3px" }}>{a.title}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ??AIÎßàÏ???*/}
      <NewsSection title="AIÎßàÏ??? href="/m/news_marketing" articles={marketingArticles} onArticleClick={saveHomeScroll} />

      {/* ???ºÏù¥?Ñ¬∑Ïò§?ºÎãà??*/}
      <NewsSection title="?ºÏù¥?Ñ¬∑Ïò§?ºÎãà?? href="/m/news_etc" articles={lifeArticles} onArticleClick={saveHomeScroll} />

      {/* ??Î∂Ä?ôÏÇ∞?πÍ∞ï (PC SpecialLectureBanner ?Ä?? */}
      {lectures.length > 0 && (
        <div style={{ background: "#fff", marginBottom: 12, borderBottom: "1px solid #f0f0f0" }}>
          <div className="sec-hd">
            <h2>Î∂Ä?ôÏÇ∞?πÍ∞ï</h2>
            <Link href="/m/study" style={{ fontSize: 15, color: "#6b7280", textDecoration: "none" }}>?îÎ≥¥Í∏???/Link>
          </div>
          <div className="no-scrollbar" style={{ display: "flex", gap: 12, padding: "0 16px 16px", overflowX: "auto" }} onTouchStart={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
            {lectures.map((lec: any) => (
              <Link key={lec.id} href={`/m/study_read?id=${lec.id}`}
                style={{ flexShrink: 0, width: 180, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", border: "1px solid #f3f4f6", background: "#fff", textDecoration: "none", display: "block" }}>
                <div style={{ width: "100%", height: 112, overflow: "hidden", background: "#e5e7eb", position: "relative" }}>
                  {lec.thumbnail_url
                    ? <Image src={lec.thumbnail_url} alt={lec.title} fill style={{ objectFit: "cover" }} sizes="50vw" />
                    : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#667eea,#764ba2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700, padding: "0 8px", textAlign: "center" }}>{lec.category || "?πÍ∞ï"}</div>}
                </div>
                <div style={{ padding: "10px" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#8a3ffc", display: "block", marginBottom: 4, letterSpacing: "-0.2px" }}>{lec.category}</span>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#333333", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", margin: "0 0 6px", wordBreak: "keep-all", letterSpacing: "-0.3px" }}>{lec.title}</p>
                  <p style={{ fontSize: 14, color: "#666666", margin: 0 }}>{lec.instructor_name || "Í≥µÏã§ÎßàÏä§??}</p>
                  <p style={{ fontSize: 15, fontWeight: 800, color: "#333333", marginTop: 6 }}>{lec.discount_price || lec.price ? `${(lec.discount_price || lec.price).toLocaleString()}P` : "Î¨¥Î£å"}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ???úÎ°†?ÅÏÉÅ (?êÎ£å?? ??PC PremiumDroneSection Î™®Î∞î???Ä??*/}
      {dronePosts.length > 0 && (
        <div style={{ background: "#1a1a2e", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 16px 14px" }}>
            <Link href="/m/board?id=drone" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="4" cy="4" r="2.5"/><circle cx="20" cy="4" r="2.5"/><line x1="4" y1="6.5" x2="4" y2="10"/><line x1="20" y1="6.5" x2="20" y2="10"/><line x1="4" y1="10" x2="20" y2="10"/><rect x="9" y="9" width="6" height="4" rx="1" fill="#60a5fa" stroke="#60a5fa"/><line x1="12" y1="13" x2="12" y2="16"/><circle cx="12" cy="17.5" r="1.5" fill="#60a5fa" stroke="none"/><line x1="8" y1="20" x2="16" y2="20" strokeWidth="1.5"/></svg>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>?úÎ°†?ÅÏÉÅ (?êÎ£å??</span>
            </Link>
            <Link href="/m/board?id=drone" style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>?îÎ≥¥Í∏???/Link>
          </div>
          <div className="no-scrollbar" style={{ display: "flex", gap: 12, padding: "0 16px 20px", overflowX: "auto" }} onTouchStart={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
            {dronePosts.map((item: any) => {
              const ytRx = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/;
              const driveRx = /\/file\/d\/([a-zA-Z0-9_-]+)/;
              const ytMatch = (item.youtube_url || "").match(ytRx);
              const driveMatch = (item.drive_url || "").match(driveRx);
              const thumb = item.thumbnail_url
                || (ytMatch ? `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg` : null)
                || (driveMatch ? `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w400` : null)
                || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=400&h=225";
              const hasVideo = !!(item.youtube_url || item.drive_url);
              return (
                <Link key={item.id} href={`/m/board_read?id=${item.id}`} className="tap"
                  style={{ flexShrink: 0, width: "calc(55vw - 16px)", maxWidth: 220, borderRadius: 10, overflow: "hidden", cursor: "pointer", textDecoration: "none", display: "block" }}>
                  <div style={{ width: "100%", aspectRatio: "16/9", overflow: "hidden", background: "#222", position: "relative", borderRadius: 10 }}>
                    <Image src={thumb} alt="" fill style={{ objectFit: "cover", opacity: 0.85 }} sizes="55vw" />
                    {hasVideo && (
                      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 40, height: 40, background: "rgba(0,0,0,0.5)", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="white" style={{ marginLeft: 2 }}><path d="M8 5v14l11-7z"/></svg>
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "keep-all", margin: "8px 0 0", letterSpacing: "-0.3px" }}>{item.title}</p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "4px 0 0", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.subtitle || "?úÎ°† ?ÅÏÉÅ ?êÎ£å?§ÏûÖ?àÎã§."}</p>
                </Link>
              );
            })}
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

      {/* FAB: Í≥µÏã§?±Î°ù */}
      <button
        onClick={() => {
          if (!currentUser) {
            alert("Í≥µÏã§???±Î°ù?òÎ†§Î©?Î°úÍ∑∏?∏Ïù¥ ?ÑÏöî?©Îãà??");
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
          zIndex: 100000,
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
        <span style={{ fontSize: "14px", fontWeight: 800, color: "#fff", whiteSpace: "nowrap" }}>Í≥µÏã§?±Î°ù</span>
      </button>

      {/* Î°úÍ∑∏??Î™®Îã¨ */}
      {isAuthModalOpen && (
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      )}
    </div>
  );
}

function NewsSection({ title, href, articles, onArticleClick }: { title: string; href: string; articles: any[]; onArticleClick?: () => void; }) {
  if (articles.length === 0) return null;
  const [main, ...rest] = articles;

  return (
    <div style={{ background: "#fff", marginBottom: 12, borderBottom: "1px solid #f0f0f0" }}>
      <div className="sec-hd">
        <h2>{title}</h2>
        <Link href={href} style={{ fontSize: 15, color: "#999999", textDecoration: "none", letterSpacing: "-0.2px" }}>?îÎ≥¥Í∏???/Link>
      </div>
      {/* Î©îÏù∏ Í∏∞ÏÇ¨ (???∏ÎÑ§?? */}
      <Link href={`/m/news/${main.article_no || main.id}`} className="tap art-row" onClick={onArticleClick}
        style={{ padding: "14px 16px", cursor: "pointer", borderBottom: "1px solid #f0f0f0", display: "block" }}>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#333333", lineHeight: 1.5, marginBottom: 6, wordBreak: "keep-all", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", margin: "0 0 6px", letterSpacing: "-0.5px" }}>{main.title}</h3>
            <p style={{ fontSize: 14, color: "#222222", fontWeight: 500, margin: 0, letterSpacing: "-0.2px" }}>{main.author_name} ¬∑ {formatDate(main.published_at || main.created_at)}</p>
          </div>
          {main.thumbnail_url && (
            <div style={{ width: 104, height: 80, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "#e5e7eb", position: "relative" }}>
              <Image src={main.thumbnail_url} alt="" fill style={{ objectFit: "cover" }} sizes="104px" />
              {!!extractYoutubeId(main.youtube_url, main.content) && (
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 32, height: 32, background: "rgba(0,0,0,0.4)", borderRadius: "50%", border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="white" style={{ marginLeft: "1.5px" }}><path d="M8 5v14l11-7z"/></svg>
                </div>
              )}
            </div>
          )}
        </div>
      </Link>
      {/* ?òÎ®∏ÏßÄ Í∏∞ÏÇ¨ (Î≤àÌò∏ Î¶¨Ïä§?? */}
      {rest.slice(0, 3).map((a: any, i: number) => (
        <Link key={a.id} href={`/m/news/${a.article_no || a.id}`} className="tap art-row" onClick={onArticleClick} style={{ display: "flex" }}>
          <span style={{ flexShrink: 0, width: 24, fontSize: 17, fontWeight: 800, color: i === 0 ? "#508bf5" : "#d1d5db", alignSelf: "center" }}>{i + 1}</span>
          <p style={{ fontSize: 18, fontWeight: 600, color: "#333333", lineHeight: 1.5, flex: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "keep-all", margin: 0, letterSpacing: "-0.3px" }}>{a.title}</p>
          {a.thumbnail_url && (
            <div style={{ width: 104, height: 80, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "#e5e7eb", position: "relative" }}>
              <Image src={a.thumbnail_url} alt="" fill style={{ objectFit: "cover" }} sizes="104px" />
              {!!extractYoutubeId(a.youtube_url, a.content) && (
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 32, height: 32, background: "rgba(0,0,0,0.4)", borderRadius: "50%", border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="white" style={{ marginLeft: "1.5px" }}><path d="M8 5v14l11-7z"/></svg>
                </div>
              )}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
