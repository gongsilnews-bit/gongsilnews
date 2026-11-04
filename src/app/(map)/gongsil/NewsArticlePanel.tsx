"use client";
/**
 * 공실열람 [우리동네뉴스] — 기사 보기 창 (2026-11-04 사장님: 우리동네뉴스처럼 왼쪽 목록 옆에 기사가 열리게)
 *  우리동네뉴스(news_map/NewsMapClient)의 기사 상세와 같은 모양 · 지도 왼쪽 위에 750px 로 미끄러져 나온다 · ✕ 로 닫는다.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { getArticleDetail, incrementArticleView } from "@/app/actions/article";
import { formatSection1 } from "@/utils/formatCategory";
import ArticleAuthorAdSlot from "@/components/ArticleAuthorAdSlot";
import BannerSlot from "@/components/BannerSlot";
import { addRecent } from "./stars";

const formatDateFull = (dateStr: string) => {
  if (!dateStr) return "";
  const kst = new Date(dateStr).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
  return `작성 ${kst}`;
};
const youtubeIdOf = (url?: string, html?: string): string | null => {
  const rx = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/;
  return (url && url.match(rx)?.[1]) || (html && html.match(rx)?.[1]) || null;
};
const cleanBody = (html: string) => html
  .replace(/<button[^>]*class="editor-media-delete"[^>]*>.*?<\/button>/gi, "")
  .replace(/<p[^>]*>\s*(?:<br>\s*)*<iframe[^>]*youtube\.com\/embed[^>]*>.*?<\/iframe>(?:\s*<br>\s*)*\s*<\/p>/gi, "")
  .replace(/<div(?:(?!class="article-body")[^>]*)?>\s*(?:<br>\s*)*<iframe[^>]*youtube\.com\/embed[^>]*>.*?<\/iframe>(?:\s*<br>\s*)*\s*<\/div>/gi, "")
  .replace(/<iframe[^>]*youtube\.com\/embed[^>]*>.*?<\/iframe>/gi, "");

const viewed = new Set<string>(); // 한 번 연 기사는 조회수를 다시 올리지 않는다

export default function NewsArticlePanel({ id, onClose }: { id: string | null; onClose: () => void }) {
  const [a, setA] = useState<any>(null);
  const [shownId, setShownId] = useState<string | null>(null); // 닫힐 때도 내용을 둔 채 미끄러져 나가게
  useEffect(() => {
    if (!id) return;
    setShownId(id); setA(null);
    let alive = true;
    getArticleDetail(id).then((r) => {
      if (!alive || !r.success) return;
      setA(r.data);
      const d = r.data as Record<string, unknown>; // MY관심 [최근 본 기사]에
      addRecent("art", { id: String(d.id), article_no: d.article_no ?? null, title: d.title, subtitle: d.subtitle ?? null, thumbnail_url: d.thumbnail_url ?? null, published_at: d.published_at ?? null, author_name: d.author_name ?? null, section1: d.section1 ?? null, section2: d.section2 ?? null, location_name: d.location_name ?? null });
    }).catch(() => {});
    if (!viewed.has(id)) { viewed.add(id); incrementArticleView(id).catch(() => {}); }
    return () => { alive = false; };
  }, [id]);
  useEffect(() => {
    if (!id) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [id, onClose]);

  const open = Boolean(id);
  const yt = a ? youtubeIdOf(a.youtube_url, a.content) : null;
  // 바깥 틀이 지도 칸 밖을 잘라 낸다 — 창이 왼쪽 목록 "밑에서" 나왔다가 다시 밑으로 들어간다 (목록 위로 지나가지 않게, 11-04 사장님)
  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: 780, maxWidth: "100%", height: "100%", overflow: "hidden", zIndex: 2000, pointerEvents: "none" }}>
    <div style={{
      position: "absolute", top: 0, left: 0, width: 750, maxWidth: "100%", height: "100%",
      borderRight: "1px solid #ddd", boxShadow: "5px 0 30px rgba(0,0,0,0.15)", background: "#fff",
      overflowY: "auto",
      transform: open ? "translateX(0)" : "translateX(-100%)", opacity: open ? 1 : 0, visibility: open ? "visible" : "hidden", pointerEvents: open ? "auto" : "none",
      transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease, visibility 0.4s",
    }}>
      <button onClick={onClose} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", fontSize: 32, color: "#999", cursor: "pointer", padding: 10, lineHeight: 1, zIndex: 10 }} title="닫기">✕</button>
      {a && shownId ? (
        <div style={{ margin: "0 auto", padding: "20px 40px 40px", position: "relative" }}>
          <div style={{ fontSize: 14, color: "#666", marginBottom: 8, fontWeight: 600 }}>[{formatSection1(a.section1)} &gt; {a.section2 || "전체"}]</div>
          <h1 style={{ fontSize: 34, fontWeight: 800, color: "#111", lineHeight: 1.3, marginBottom: 16, letterSpacing: -1.5, wordBreak: "keep-all" }}>{a.title}</h1>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #ddd", paddingBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#666" }}>
              <span style={{ color: "#111", fontWeight: "bold" }}>{a.author_name || "공실뉴스"}</span>
              <span style={{ display: "inline-block", width: 1, height: 12, background: "#ddd" }} />
              <span>{formatDateFull(a.published_at || a.created_at)}</span>
              <span style={{ display: "inline-block", width: 1, height: 12, background: "#ddd" }} />
              <span>조회수 {(a.view_count || 0) + 1}</span>
            </div>
            <Link href={`/news/${a.article_no || a.id}`} style={{ fontSize: 13, fontWeight: "bold", color: "#ff8e15", border: "1px solid #ff8e15", borderRadius: 20, padding: "4px 14px", textDecoration: "none" }}>원문보기</Link>
          </div>
          <div style={{ marginTop: 30 }}>
            {a.subtitle && <div className="article-subtitle-box map-subtitle-box">{a.subtitle}</div>}
            <div className="article-body">
              {yt ? (
                <div className="article-img-wrap">
                  <div style={{ position: "relative", width: "100%", maxWidth: a.is_shorts ? 315 : "100%", aspectRatio: a.is_shorts ? "9 / 16" : "16 / 9", margin: "0 auto", overflow: "hidden", borderRadius: 8 }}>
                    <iframe src={`https://www.youtube.com/embed/${yt}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", borderRadius: 8 }} allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                  </div>
                </div>
              ) : a.thumbnail_url && !(a.content && a.content.includes(a.thumbnail_url)) ? (
                <div className="article-img-wrap"><img src={a.thumbnail_url} alt={a.title} style={{ width: "100%", maxHeight: 400, objectFit: "cover", borderRadius: 8 }} /></div>
              ) : null}
              {a.content && (
                <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: cleanBody(a.content) }}
                  onClick={(e) => { const l = (e.target as HTMLElement).closest("a"); if (l && l.href) { e.preventDefault(); window.open(l.href, "_blank"); } }} />
              )}
            </div>
            {a.article_keywords?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "24px 0", padding: "16px 0", borderTop: "1px solid #eee" }}>
                {a.article_keywords.map((kw: any, i: number) => <span key={i} style={{ padding: "6px 14px", borderRadius: 20, background: "#fff7ed", color: "#b45309", fontSize: 13, fontWeight: 500, border: "1px solid #fde68a" }}>#{kw.keyword}</span>)}
              </div>
            )}
            <div className="article-footer-bar" style={{ marginTop: 40 }}>
              <span style={{ fontWeight: 800, color: "#111" }}>{a.author_name || "공실뉴스"}</span>
              <div style={{ color: "#888", fontSize: 13 }}>저작권자 © 공실뉴스 무단전재 및 재배포 금지</div>
            </div>
            <ArticleAuthorAdSlot article={a} style={{ margin: "28px 0 20px" }} />
            <BannerSlot placement="NEWS_DETAIL" style={{ margin: "20px 0" }} />
          </div>
        </div>
      ) : open ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <div style={{ width: 36, height: 36, border: "3px solid #f0f0f0", borderTop: "3px solid #ff8e15", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        </div>
      ) : null}
    </div>
    </div>
  );
}
