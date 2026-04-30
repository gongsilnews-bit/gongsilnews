"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const MiniVacancyMap = dynamic(() => import("./MiniVacancyMap"), { ssr: false });
import { useRouter } from "next/navigation";

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
  financeArticles: any[];
  politicsArticles: any[];
  lawArticles: any[];
  lifeArticles: any[];
  etcArticles: any[];
  mapArticles: any[];
  lectures: any[];
}

const CATEGORIES = [
  { key: "home", label: "홈" },
  { key: "all", label: "전체뉴스" },
  { key: "부동산·주식·재테크", label: "부동산·재테크" },
  { key: "정치·경제·사회", label: "정치·경제" },
  { key: "세무·법률", label: "세무·법률" },
  { key: "여행·건강·생활", label: "여행·생활" },
  { key: "etc", label: "기타" },
];

export default function MobileHomeClient(props: Props) {
  const { vacancies, headlineArticles, financeArticles, politicsArticles, lawArticles, lifeArticles, etcArticles, mapArticles, lectures } = props;
  const router = useRouter();
  const [heroIdx, setHeroIdx] = useState(0);
  const hero = headlineArticles[heroIdx] || null;

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", background: "#F4F6F8", minHeight: "100vh", paddingBottom: "80px", letterSpacing: "-0.3px" }}>
      {/* 네비게이션 메뉴 (네이버 모바일 스타일 가로 스와이프) */}
      <div
        className="hide-scrollbar"
        style={{
          display: "flex",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-x",
          backgroundColor: "#ffffff",
          borderBottom: "16px solid #F4F6F8",
          position: "fixed",
          top: "30px",
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
              router.push(`/m/news?tab=${cat.key}`);
            }}
            style={{
              flexShrink: 0,
              padding: "11px 16px",
              fontSize: "16px",
              fontWeight: cat.key === "home" ? 700 : 500,
              color: cat.key === "home" ? "#1a2e50" : "#222222",
              background: "none",
              border: "none",
              borderBottom: cat.key === "home" ? "2.5px solid #1a2e50" : "2.5px solid transparent",
              cursor: "pointer",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
              letterSpacing: "-0.3px",
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>
      {/* 카테고리 바 높이만큼 공간 확보 */}
      <div style={{ height: "46px" }} />

      {/* ① Hero 배너 (헤드라인 기사) */}
      {hero && (
        <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", maxHeight: 250, overflow: "hidden", cursor: "pointer" }}
          onClick={() => router.push(`/m/news/${hero.article_no || hero.id}`)}>
          {hero.thumbnail_url
            ? <img src={hero.thumbnail_url} alt={hero.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1a2e50,#2d4a7a)" }} />}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.2) 55%,transparent 100%)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px" }}>
            <span style={{ background: "#dc2626", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 3, display: "inline-block", marginBottom: 8, letterSpacing: "0.5px" }}>HEADLINE</span>
            <h2 style={{ color: "#fff", fontSize: 17, fontWeight: 800, lineHeight: 1.45, wordBreak: "keep-all", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", letterSpacing: "-0.5px" }}>{hero.title}</h2>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 6, marginBottom: 0, letterSpacing: "-0.2px" }}>{hero.author_name} · {formatDate(hero.published_at || hero.created_at)}</p>
          </div>
          {headlineArticles.length > 1 && (
            <div style={{ position: "absolute", bottom: 12, right: 12, display: "flex", gap: 4 }}>
              {headlineArticles.slice(0, 5).map((_, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setHeroIdx(i); }}
                  style={{ width: i === heroIdx ? 16 : 6, height: 6, borderRadius: 3, background: i === heroIdx ? "#fff" : "rgba(255,255,255,0.5)", border: "none", padding: 0, transition: "all 0.3s", cursor: "pointer" }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ② 실시간 공실 매물 - 카카오 지도 미리보기 */}
      <div style={{ background: "#fff", marginBottom: 12, borderBottom: "1px solid #f0f0f0" }}>
        <div className="sec-hd">
          <h2>실시간 공실 매물</h2>
          <Link href="/m/gongsil" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}>더보기 ›</Link>
        </div>
        <div style={{ padding: "0 16px 16px" }}>
          <MiniVacancyMap vacancies={vacancies} />
        </div>
      </div>


      {/* ③ 부동산·주식·재테크 */}
      <NewsSection title="부동산·주식·재테크" href="/m/news?tab=부동산·주식·재테크" articles={financeArticles} />

      {/* ④ 우리동네부동산 (PC VideoGrid 대응) */}
      {mapArticles.length > 0 && (
        <div style={{ background: "#fff", marginBottom: 12, borderBottom: "1px solid #f0f0f0" }}>
          <div className="sec-hd">
            <h2>우리동네부동산</h2>
            <Link href="/m/news" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}>더보기 ›</Link>
          </div>
          <div className="no-scrollbar" style={{ display: "flex", gap: 12, padding: "0 16px 16px", overflowX: "auto" }}>
            {mapArticles.slice(0, 5).map((a: any) => (
              <div key={a.id} className="tap" onClick={() => router.push(`/m/news/${a.article_no || a.id}`)}
                style={{ flexShrink: 0, width: 200, borderRadius: 10, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", border: "1px solid #f3f4f6", background: "#fff", cursor: "pointer" }}>
                <div style={{ width: "100%", height: 112, overflow: "hidden", background: "#e5e7eb", position: "relative" }}>
                  {a.thumbnail_url
                    ? <img src={a.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1a2e50,#2d4a7a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>📺</div>}
                  {a.youtube_url && (
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 36, height: 36, background: "rgba(0,0,0,0.55)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  )}
                </div>
                <div style={{ padding: "10px" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#333333", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "keep-all", margin: 0, letterSpacing: "-0.3px" }}>{a.title}</p>
                  <p style={{ fontSize: 11, color: "#999999", marginTop: 5 }}>{formatDate(a.published_at || a.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ⑤ 정치·경제·사회 */}
      <NewsSection title="정치·경제·사회" href="/m/news" articles={politicsArticles} />

      {/* ⑥ 세무·법률 */}
      <NewsSection title="세무·법률" href="/m/news" articles={lawArticles} />

      {/* ⑦ 여행·건강·생활 */}
      <NewsSection title="여행·건강·생활" href="/m/news" articles={lifeArticles} />

      {/* ⑧ 기타 */}
      <NewsSection title="기타" href="/m/news" articles={etcArticles} />

      {/* ⑨ 부동산특강 (PC SpecialLectureBanner 대응) */}
      {lectures.length > 0 && (
        <div style={{ background: "#fff", marginBottom: 12, borderBottom: "1px solid #f0f0f0" }}>
          <div className="sec-hd">
            <h2>부동산특강</h2>
            <Link href="/m/study" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}>더보기 ›</Link>
          </div>
          <div className="no-scrollbar" style={{ display: "flex", gap: 12, padding: "0 16px 16px", overflowX: "auto" }}>
            {lectures.map((lec: any) => (
              <Link key={lec.id} href={`/study_read?id=${lec.id}`}
                style={{ flexShrink: 0, width: 160, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", border: "1px solid #f3f4f6", background: "#fff", textDecoration: "none", display: "block" }}>
                <div style={{ width: "100%", height: 100, overflow: "hidden", background: "#e5e7eb" }}>
                  {lec.thumbnail_url
                    ? <img src={lec.thumbnail_url} alt={lec.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#667eea,#764ba2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, padding: "0 8px", textAlign: "center" }}>{lec.category || "특강"}</div>}
                </div>
                <div style={{ padding: "10px" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#8a3ffc", display: "block", marginBottom: 4, letterSpacing: "-0.2px" }}>{lec.category}</span>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#333333", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", margin: "0 0 6px", wordBreak: "keep-all", letterSpacing: "-0.3px" }}>{lec.title}</p>
                  <p style={{ fontSize: 12, color: "#666666", margin: 0 }}>{lec.instructor_name || "공실마스터"}</p>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "#333333", marginTop: 6 }}>{lec.discount_price || lec.price ? `${(lec.discount_price || lec.price).toLocaleString()}P` : "무료"}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      <style>{`
        .no-scrollbar::-webkit-scrollbar{display:none;}
        .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none;}
        .tap:active{opacity:0.75;}
        .sec-hd{display:flex;align-items:center;justify-content:space-between;padding:20px 16px 14px;}
        .sec-hd h2{font-size:16px;font-weight:800;color:#333333;margin:0;letter-spacing:-0.5px;}
        .sec-hd a{font-size:13px;color:#999999;text-decoration:none;display:flex;align-items:center;gap:2px;letter-spacing:-0.2px;}
        .art-row{display:flex;gap:12px;padding:12px 16px;cursor:pointer;border-bottom:1px solid #f0f0f0;}
        .art-row:last-child{border-bottom:none;}
        .art-row:active{background:#f9fafb;}
        .skeleton{background:linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:6px;}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>
    </div>
  );
}

function NewsSection({ title, href, articles }: { title: string; href: string; articles: any[] }) {
  const router = useRouter();
  if (articles.length === 0) return null;
  const [main, ...rest] = articles;

  return (
    <div style={{ background: "#fff", marginBottom: 12, borderBottom: "1px solid #f0f0f0" }}>
      <div className="sec-hd">
        <h2>{title}</h2>
        <Link href={href} style={{ fontSize: 13, color: "#999999", textDecoration: "none", letterSpacing: "-0.2px" }}>더보기 ›</Link>
      </div>
      {/* 메인 기사 (큰 썸네일) */}
      <div className="tap" onClick={() => router.push(`/m/news/${main.article_no || main.id}`)}
        style={{ padding: "0 16px 14px", cursor: "pointer" }}>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#333333", lineHeight: 1.5, marginBottom: 6, wordBreak: "keep-all", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", margin: "0 0 6px", letterSpacing: "-0.5px" }}>{main.title}</h3>
            <p style={{ fontSize: 12, color: "#999999", margin: 0, letterSpacing: "-0.2px" }}>{main.author_name} · {formatDate(main.published_at || main.created_at)}</p>
          </div>
          {main.thumbnail_url && (
            <div style={{ width: 84, height: 64, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "#e5e7eb" }}>
              <img src={main.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
        </div>
      </div>
      {/* 나머지 기사 (번호 리스트) */}
      {rest.slice(0, 3).map((a: any, i: number) => (
        <div key={a.id} className="tap art-row" onClick={() => router.push(`/m/news/${a.article_no || a.id}`)}>
          <span style={{ flexShrink: 0, width: 20, fontSize: 13, fontWeight: 800, color: i === 0 ? "#f97316" : "#d1d5db", alignSelf: "center" }}>{i + 1}</span>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#333333", lineHeight: 1.5, flex: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "keep-all", margin: 0, letterSpacing: "-0.3px" }}>{a.title}</p>
          {a.thumbnail_url && (
            <div style={{ width: 60, height: 44, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
              <img src={a.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
