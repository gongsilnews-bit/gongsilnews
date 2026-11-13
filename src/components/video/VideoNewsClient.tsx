"use client";
// 동영상뉴스 목록 — 누르면 그 자리에서 크게 재생, 아래 [기사 전문 보기] (2026-11-13 사장님)
// 쇼츠는 세로 화면, 위아래로 밀면 다음·이전 영상
import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { VideoNewsItem } from "@/utils/videoNews";

type Filter = "all" | "shorts" | "long";

export default function VideoNewsClient({ items, mobile = false }: { items: VideoNewsItem[]; mobile?: boolean }) {
  const dark = mobile; // 모바일은 홈 동영상뉴스처럼 검은 배경 (2026-11-13 사장님)
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<number | null>(null);
  const list = items.filter((v) => (filter === "all" ? true : filter === "shorts" ? v.isShorts : !v.isShorts));
  const cur = open != null ? list[open] : null;
  const touchY = useRef<number | null>(null);

  const go = useCallback((d: number) => setOpen((i) => (i == null ? i : Math.min(list.length - 1, Math.max(0, i + d)))), [list.length]);

  // 보던 영상을 주소(?v=)에 적어 둔다 — [기사 전문 보기] 뒤 뒤로가기로 오면 그 영상이 다시 떠 있게 (2026-11-13 사장님)
  const restored = useRef(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const f = q.get("f") as Filter | null;
    const v = q.get("v");
    const fl: Filter = f === "shorts" || f === "long" ? f : "all";
    if (fl !== "all") setFilter(fl);
    if (v) {
      const l = items.filter((x) => (fl === "all" ? true : fl === "shorts" ? x.isShorts : !x.isShorts));
      const i = l.findIndex((x) => x.youtubeId === v);
      if (i >= 0) setOpen(i);
    }
    restored.current = true;
  }, [items]);
  useEffect(() => {
    if (!restored.current) return;
    const q = new URLSearchParams(window.location.search);
    if (cur) q.set("v", cur.youtubeId); else q.delete("v");
    if (filter !== "all") q.set("f", filter); else q.delete("f");
    const s = q.toString();
    window.history.replaceState(window.history.state, "", window.location.pathname + (s ? `?${s}` : ""));
  }, [cur, filter]);

  useEffect(() => {
    if (open == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); go(-1); }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, go]);

  const articleHref = (v: VideoNewsItem) => `${mobile ? "/m" : ""}/news/${v.no ?? v.id}`;
  const date = (s: string | null) => (s ? s.slice(0, 10).replace(/-/g, ".") : "");

  return (
    <div style={{ fontFamily: "'Pretendard', sans-serif" }}>
      {/* 머리 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: mobile ? 14 : 24 }}>
        <h1 style={{ margin: 0, display: "flex", alignItems: "center", gap: 10, fontSize: mobile ? 20 : 28, fontWeight: 800, color: dark ? "#fff" : "#111", letterSpacing: "-0.5px" }}>
          {mobile && (
            <Link href="/m" aria-label="공실뉴스 홈" style={{ display: "inline-flex", alignItems: "center" }}>
              {/* 모바일 홈 위쪽과 같은 글자 로고 (2026-11-13 사장님: 로고 대신 텍스트로) */}
              <span style={{ color: "#fff", fontSize: 22, fontWeight: 900, fontStyle: "italic", letterSpacing: "-1px", lineHeight: 1 }}>공실뉴스</span>
            </Link>
          )}
          {/* 동영상뉴스 앞 유튜브 표시 — 모바일도 로고 다음에 (2026-11-13 사장님) */}
          <span style={{ display: "inline-flex", alignItems: "center", gap: mobile ? 6 : 10 }}>
            <svg width={mobile ? 24 : 32} height={mobile ? 17 : 22} viewBox="0 0 28 20" fill="none"><rect width="28" height="20" rx="4" fill="#FF0000" /><path d="M11 5.5L19.5 10L11 14.5V5.5Z" fill="white" /></svg>
            동영상뉴스
          </span>
        </h1>
        <div style={{ display: "flex", gap: 6 }}>
          {([["all", "전체"], ["shorts", "쇼츠"], ["long", "영상"]] as [Filter, string][]).map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)} style={{ padding: "7px 16px", borderRadius: 999, border: filter === k ? `1px solid ${dark ? "#fff" : "#111"}` : `1px solid ${dark ? "rgba(255,255,255,0.3)" : "#d1d5db"}`, background: filter === k ? (dark ? "#fff" : "#111") : "transparent", color: filter === k ? (dark ? "#111" : "#fff") : (dark ? "rgba(255,255,255,0.85)" : "#374151"), fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{label}</button>
          ))}
        </div>
      </div>

      {/* 카드 목록 */}
      {list.length === 0 ? (
        <div style={{ padding: "60px 0", textAlign: "center", color: dark ? "rgba(255,255,255,0.5)" : "#9ca3af" }}>등록된 동영상뉴스가 없습니다.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: mobile ? "18px 10px" : "28px 20px" }}>
          {list.map((v, i) => (
            <button key={v.id} onClick={() => setOpen(i)} style={{ all: "unset", cursor: "pointer", display: "block", minWidth: 0 }}>
              <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: 10, overflow: "hidden", background: "#111" }}>
                <img src={v.thumb} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ width: mobile ? 38 : 48, height: mobile ? 38 : 48, borderRadius: "50%", background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
                  </span>
                </span>
                <span style={{ position: "absolute", left: 8, top: 8, padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800, color: "#fff", background: v.isShorts ? "#FF0000" : "rgba(0,0,0,0.7)" }}>{v.isShorts ? "쇼츠" : "영상"}</span>
              </div>
              <div style={{ marginTop: 8, fontSize: mobile ? 14 : 15.5, fontWeight: 700, color: dark ? "#fff" : "#111", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", letterSpacing: "-0.3px" }}>{v.title}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: dark ? "rgba(255,255,255,0.5)" : "#9ca3af" }}>{date(v.publishedAt)} · {v.author}</div>
            </button>
          ))}
        </div>
      )}

      {/* 재생 창 */}
      {cur && (
        <div
          onClick={() => setOpen(null)}
          onTouchStart={(e) => { touchY.current = e.touches[0].clientY; }}
          onTouchEnd={(e) => {
            if (touchY.current == null) return;
            const dy = e.changedTouches[0].clientY - touchY.current; touchY.current = null;
            if (Math.abs(dy) > 60) go(dy < 0 ? 1 : -1);
          }}
          style={{ position: "fixed", inset: 0, zIndex: 2147483000, background: "rgba(0,0,0,0.94)", display: "flex", alignItems: "center", justifyContent: "center", padding: mobile ? 0 : 24 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: cur.isShorts ? (mobile ? "min(100%, calc(76dvh * 9 / 16))" : "min(420px, calc(78dvh * 9 / 16))") : "min(1000px, calc(76dvh * 16 / 9))", display: "flex", flexDirection: "column", alignItems: "stretch", maxHeight: "100dvh" }}>
            <div style={{ position: "relative", width: "100%", aspectRatio: cur.isShorts ? "9 / 16" : "16 / 9", maxHeight: mobile ? "78dvh" : "80dvh", margin: "0 auto", background: "#000", borderRadius: mobile ? 0 : 12, overflow: "hidden" }}>
              <iframe
                key={cur.youtubeId}
                src={`https://www.youtube.com/embed/${cur.youtubeId}?autoplay=1&rel=0&playsinline=1`}
                title={cur.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
              />
            </div>
            <div style={{ padding: mobile ? "12px 14px 16px" : "14px 2px 0", color: "#fff" }}>
              <div style={{ fontSize: mobile ? 16 : 18, fontWeight: 800, lineHeight: 1.4, letterSpacing: "-0.3px" }}>{cur.title}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
                <Link href={articleHref(cur)} style={{ flex: mobile ? 1 : "none", textAlign: "center", padding: "11px 20px", borderRadius: 10, background: "#fff", color: "#111", fontWeight: 800, fontSize: 15, textDecoration: "none" }}>기사 전문 보기</Link>
                <button onClick={() => go(-1)} disabled={open === 0} style={navBtn(open === 0)}>‹ 이전</button>
                <button onClick={() => go(1)} disabled={open === list.length - 1} style={navBtn(open === list.length - 1)}>다음 ›</button>
                {!mobile && <span style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{(open ?? 0) + 1} / {list.length} · ← → 키로 넘기기</span>}
              </div>
              {mobile && cur.isShorts && <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "center" }}>위아래로 밀면 다음 영상</div>}
            </div>
          </div>
          <button onClick={() => setOpen(null)} aria-label="닫기" style={{ position: "fixed", top: 14, right: 14, zIndex: 2147483001, width: 42, height: 42, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>
      )}
    </div>
  );
}

function navBtn(disabled: boolean): React.CSSProperties {
  return { padding: "11px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: disabled ? "rgba(255,255,255,0.3)" : "#fff", fontWeight: 700, fontSize: 14, cursor: disabled ? "default" : "pointer", fontFamily: "inherit" };
}
