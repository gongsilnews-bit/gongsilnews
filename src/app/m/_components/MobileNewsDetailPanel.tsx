"use client";
/**
 * 우리동네뉴스 기사 화면 — 지도(공실열람)에서 연 기사도 이 모양으로 (2026-11-11 사장님: "우리동네뉴스 형식으로 나와야 해 지도에서는")
 *  모양은 MobileNewsClient 의 우리동네뉴스 기사 패널 그대로: [<] 분류 > 세부분류 · [분류] · 제목 · 글쓴이 | 작성 시각 · [원본보기] ·
 *  주황 세로줄 부제목 · 본문 · 키워드 · 저작권 · 글쓴이 광고·배너
 *  여는 법: window.dispatchEvent(new CustomEvent("gs-news-article", { detail: 기사 id })) — 이 화면을 둔 페이지(m/gongsil)가 받는다
 *  휴대폰 [뒤로]로 닫힌다
 */
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getArticleDetail } from "@/app/actions/article";
import BannerSlot from "@/components/BannerSlot";
import ArticleAuthorAdSlot from "@/components/ArticleAuthorAdSlot";
import { formatSection1 } from "@/utils/formatCategory";

function formatDateFull(dateStr: string) {
  if (!dateStr) return "";
  const kst = new Date(dateStr).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
  return `작성 ${kst}`;
}

export default function MobileNewsDetailPanel() {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [article, setArticle] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const open = (e: Event) => {
      const next = String((e as CustomEvent).detail || "");
      if (!next) return;
      window.history.pushState({ panel: "news-article" }, "");
      setId(next);
    };
    const back = () => { if (window.history.state?.panel !== "news-article") setId(null); };
    window.addEventListener("gs-news-article", open);
    window.addEventListener("popstate", back);
    return () => { window.removeEventListener("gs-news-article", open); window.removeEventListener("popstate", back); };
  }, []);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true); setArticle(null);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    getArticleDetail(id).then((res: any) => { if (alive && res?.success) setArticle(res.data); }).catch(() => {}).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  const close = () => { if (window.history.state?.panel === "news-article") window.history.back(); else setId(null); };

  return (
    <div className={`list-panel ${id ? "open" : ""}`} style={{ zIndex: 10003 }} onClick={(e) => e.stopPropagation()}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid #f0f0f0", background: "#fff", flexShrink: 0 }}>
        <button onClick={close} aria-label="뒤로" style={{ background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", padding: 4, cursor: "pointer", marginLeft: -4 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        {article && (
          <div style={{ fontSize: 16, fontWeight: 800, color: "#111", display: "flex", alignItems: "center", gap: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <span>{formatSection1(article.section1)}</span>
            {article.section2 && <><span style={{ color: "#9ca3af", fontSize: 14, fontWeight: 600 }}>&gt;</span><span style={{ color: "#ea580c" }}>{article.section2}</span></>}
          </div>
        )}
      </div>

      {/* 본문 */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", background: "#fff" }}>
        {loading ? (
          <div style={{ padding: 20 }}>
            <div className="skeleton" style={{ width: "80%", height: 24, marginBottom: 16, background: "#f3f4f6", borderRadius: 6 }} />
            <div className="skeleton" style={{ width: "40%", height: 16, marginBottom: 30, background: "#f3f4f6", borderRadius: 6 }} />
            <div className="skeleton" style={{ width: "100%", height: 200, marginBottom: 16, background: "#f3f4f6", borderRadius: 6 }} />
          </div>
        ) : article ? (
          <div style={{ padding: "0 20px 40px", backgroundColor: "#fff" }}>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 10, marginTop: 16 }}>
              [{formatSection1(article.section1)} &gt; {article.section2 || "전체"}]
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111", lineHeight: 1.4, marginBottom: 16, wordBreak: "keep-all" }}>{article.title}</h1>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f0f0f0", paddingBottom: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: "#666" }}>
                <span style={{ fontWeight: 700, color: "#111", marginRight: 8 }}>{article.author_name || "공실뉴스"}</span>
                <span style={{ color: "#d1d5db", margin: "0 4px" }}>|</span>
                {formatDateFull(article.published_at || article.created_at)}
              </div>
              <button onClick={() => router.push(`/m/news/${article.article_no || article.id}`)}
                style={{ fontSize: 12, color: "#508bf5", border: "1px solid #508bf5", background: "#fff", borderRadius: 20, padding: "4px 10px", cursor: "pointer", flexShrink: 0 }}>
                원본보기
              </button>
            </div>
            {article.subtitle && (
              <div style={{ padding: 16, backgroundColor: "#f9fafb", borderLeft: "4px solid #d97706", fontSize: 15, color: "#374151", lineHeight: 1.6, marginBottom: 24, fontWeight: 600, whiteSpace: "pre-line" }}>
                {article.subtitle}
              </div>
            )}
            <div
              className="m-news-detail-body"
              style={{ fontSize: 16, lineHeight: 1.8, color: "#333", wordBreak: "keep-all" }}
              dangerouslySetInnerHTML={{ __html: (article.content || "").replace(/<button[^>]*class="editor-media-delete"[^>]*>.*?<\/button>/gi, "") }}
              onClick={(e) => {
                const a = (e.target as HTMLElement).closest("a");
                if (!a || !a.href) return;
                e.preventDefault();
                try {
                  const u = new URL(a.href);
                  if (u.origin === window.location.origin) router.push(u.pathname + u.search + u.hash);
                  else window.location.href = a.href;
                } catch { window.location.href = a.href; }
              }}
            />
            <style>{`.m-news-detail-body img,.m-news-detail-body video,.m-news-detail-body iframe{max-width:100%;height:auto;border-radius:8px}`}</style>
            {article.article_keywords && article.article_keywords.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "16px 0", padding: "12px 0", borderTop: "1px solid #f0f0f0" }}>
                {article.article_keywords.map((kw: any, i: number) => (
                  <span key={i} style={{ padding: "4px 10px", borderRadius: 16, background: "#fff7ed", color: "#b45309", fontSize: 12, fontWeight: 500, border: "1px solid #fde68a" }}>#{kw.keyword}</span>
                ))}
              </div>
            )}
            <div style={{ marginTop: 24, paddingTop: 12, borderTop: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#888" }}>
              <span style={{ fontWeight: 700, color: "#333" }}>{article.author_name || "공실뉴스"}</span>
              <span>저작권자 © 공실뉴스 무단전재 및 재배포 금지</span>
            </div>
            <ArticleAuthorAdSlot article={article} style={{ margin: "20px 0 16px" }} />
            <BannerSlot placement="NEWS_DETAIL" style={{ margin: "16px 0" }} />
          </div>
        ) : id ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#999" }}>기사를 불러올 수 없습니다.</div>
        ) : null}
      </div>
    </div>
  );
}

/** 지도 목록의 기사 줄을 누르면 — 페이지를 떠나지 않고 우리동네뉴스 기사 화면으로 */
export const openNewsArticle = (id: string) => window.dispatchEvent(new CustomEvent("gs-news-article", { detail: id }));
