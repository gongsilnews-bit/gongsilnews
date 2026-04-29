"use client";

import React, { useState } from "react";
import Link from "next/link";
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

export default function MobileHomeClient(props: Props) {
  const { vacancies, headlineArticles, financeArticles, politicsArticles, lawArticles, lifeArticles, etcArticles, mapArticles, lectures } = props;
  const router = useRouter();
  const [heroIdx, setHeroIdx] = useState(0);
  const hero = headlineArticles[heroIdx] || null;

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", background: "#f8f9fa", minHeight: "100vh", paddingBottom: "80px" }}>
      <style>{`
        .no-scrollbar::-webkit-scrollbar{display:none;}
        .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none;}
        .tap:active{opacity:0.75;}
        .sec-hd{display:flex;align-items:center;justify-content:space-between;padding:18px 16px 12px;}
        .sec-hd h2{font-size:16px;font-weight:800;color:#111827;margin:0;}
        .sec-hd a{font-size:13px;color:#6b7280;text-decoration:none;display:flex;align-items:center;gap:2px;}
        .art-row{display:flex;gap:12px;padding:0 16px 16px;cursor:pointer;border-bottom:1px solid #f3f4f6;}
        .art-row:last-child{border-bottom:none;}
        .art-row:active{background:#f9fafb;}
        .skeleton{background:linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:6px;}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>

      {/* ① Hero 배너 (헤드라인 기사) */}
      {hero && (
        <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", maxHeight: 250, overflow: "hidden", cursor: "pointer" }}
          onClick={() => router.push(`/m/news/${hero.article_no || hero.id}`)}>
          {hero.thumbnail_url
            ? <img src={hero.thumbnail_url} alt={hero.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1a2e50,#2d4a7a)" }} />}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.2) 55%,transparent 100%)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px" }}>
            <span style={{ background: "#dc2626", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 3, display: "inline-block", marginBottom: 8 }}>HEADLINE</span>
            <h2 style={{ color: "#fff", fontSize: 17, fontWeight: 800, lineHeight: 1.35, wordBreak: "keep-all", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{hero.title}</h2>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 6, marginBottom: 0 }}>{hero.author_name} · {formatDate(hero.published_at || hero.created_at)}</p>
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

      {/* ② 실시간 공실 매물 (PC Hero Map 대응) */}
      {vacancies.length > 0 && (
        <div style={{ background: "#fff", marginBottom: 8 }}>
          <div className="sec-hd">
            <h2>실시간 공실 매물</h2>
            <Link href="/m/gongsil" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}>더보기 ›</Link>
          </div>
          <div className="no-scrollbar" style={{ display: "flex", gap: 12, padding: "0 16px 16px", overflowX: "auto" }}>
            {vacancies.map((v: any) => (
              <div key={v.id} className="tap" onClick={() => router.push("/m/gongsil")}
                style={{ flexShrink: 0, width: 148, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", border: "1px solid #f3f4f6", background: "#fff", cursor: "pointer" }}>
                <div style={{ width: "100%", height: 96, overflow: "hidden", background: "#e5e7eb" }}>
                  {v.vacancy_photos?.[0]?.url
                    ? <img src={v.vacancy_photos[0].url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1a2e50,#2d4a7a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🏠</div>}
                </div>
                <div style={{ padding: "10px 10px 12px" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#f97316", background: "#fff7ed", padding: "2px 6px", borderRadius: 4, display: "inline-block", marginBottom: 6 }}>{v.trade_type || "매매"}</span>
                  <p style={{ fontSize: 14, fontWeight: 800, color: "#111827", marginBottom: 3, lineHeight: 1.3 }}>{formatPrice(v)}</p>
                  <p style={{ fontSize: 11, color: "#6b7280", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{v.building_name || [v.dong, v.sigungu].filter(Boolean).join(" ")}</p>
                </div>
              </div>
            ))}
            <div className="tap" onClick={() => router.push("/m/gongsil")}
              style={{ flexShrink: 0, width: 72, borderRadius: 12, border: "1.5px dashed #d1d5db", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", background: "#f9fafb" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textAlign: "center" }}>공실{"\n"}더보기</span>
            </div>
          </div>
        </div>
      )}

      {/* ③ 부동산·주식·재테크 */}
      <NewsSection title="부동산·주식·재테크" href="/m/news" articles={financeArticles} />

      {/* ④ 우리동네부동산 (PC VideoGrid 대응) */}
      {mapArticles.length > 0 && (
        <div style={{ background: "#fff", marginBottom: 8 }}>
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
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "keep-all", margin: 0 }}>{a.title}</p>
                  <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 5 }}>{formatDate(a.published_at || a.created_at)}</p>
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
        <div style={{ background: "#fff", marginBottom: 8 }}>
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
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#8a3ffc", display: "block", marginBottom: 4 }}>{lec.category}</span>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", margin: "0 0 6px", wordBreak: "keep-all" }}>{lec.title}</p>
                  <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{lec.instructor_name || "공실마스터"}</p>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "#111827", marginTop: 6 }}>{lec.discount_price || lec.price ? `${(lec.discount_price || lec.price).toLocaleString()}P` : "무료"}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NewsSection({ title, href, articles }: { title: string; href: string; articles: any[] }) {
  const router = useRouter();
  if (articles.length === 0) return null;
  const [main, ...rest] = articles;

  return (
    <div style={{ background: "#fff", marginBottom: 8 }}>
      <div className="sec-hd">
        <h2>{title}</h2>
        <Link href={href} style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}>더보기 ›</Link>
      </div>
      {/* 메인 기사 (큰 썸네일) */}
      <div className="tap" onClick={() => router.push(`/m/news/${main.article_no || main.id}`)}
        style={{ padding: "0 16px 14px", cursor: "pointer" }}>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", lineHeight: 1.45, marginBottom: 6, wordBreak: "keep-all", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", margin: "0 0 6px" }}>{main.title}</h3>
            <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>{main.author_name} · {formatDate(main.published_at || main.created_at)}</p>
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
          <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", lineHeight: 1.4, flex: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "keep-all", margin: 0 }}>{a.title}</p>
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
