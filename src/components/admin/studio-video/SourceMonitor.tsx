"use client";
// 소스 모니터 (프리미어처럼, 2026-10-25 사장님) — 타임라인 편집 왼쪽 위 [소스: 이름] 탭
//  프로젝트 칸에서 두 번 누른 자료를 크게 보고, 시작(I)·끝(O)을 찍어 그 구간만 타임라인에 넣는다
//  [삽입](,) = 재생 막대 자리 V1 에 끼워 넣기 (뒤 클립은 밀림) · [덮어쓰기](.) = 재생 막대 자리 V2 에 올리기 · 화면을 끌어 타임라인에 놓기
import React, { useEffect, useRef, useState } from "react";
import type { LibItem } from "./types";
import { DRAG_MEDIA, blankDragImage, fmtTime, mediaDrag } from "./types";
import { C, FONT, Icon } from "./ui";

export type SrcRange = { s: number; e: number };

export function SourceMonitor({ item, range, onRange, onInsert, onOverwrite, onOpen }: {
  item: LibItem | null;
  /** 프로젝트 칸에서 끌어다 놓으면 소스로 열기 (2026-10-25 사장님) */
  onOpen?: (item: LibItem) => void;
  range: SrcRange | null;
  onRange: (r: SrcRange | null) => void;
  onInsert: () => void;
  onOverwrite: () => void;
}) {
  const vRef = useRef<HTMLVideoElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [box, setBox] = useState({ w: 320, h: 180 });
  const vid = item?.kind === "video";
  const dur = vid ? item!.duration || 0 : 0;
  const inP = range?.s ?? 0, outP = range?.e ?? dur;

  // 칸 크기에 맞춰 16:9 로 가장 크게
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const W = el.clientWidth, H = el.clientHeight;
      const w = Math.min(W, (H * 16) / 9);
      setBox({ w: Math.max(80, Math.floor(w)), h: Math.max(45, Math.floor((w * 9) / 16)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => { setT(0); setPlaying(false); }, [item?.id]);

  const seek = (x: number) => {
    const v = vRef.current;
    const n = Math.max(0, Math.min(dur, x));
    if (v) try { v.currentTime = n; } catch {}
    setT(n);
  };
  const toggle = () => {
    const v = vRef.current;
    if (!v) return;
    if (v.paused) {
      if (v.currentTime >= outP - 0.03) seek(inP); // 끝 표시에 닿았으면 시작 표시부터
      void v.play();
    } else v.pause();
  };
  const markIn = () => onRange({ s: Math.min(t, outP - 0.1), e: outP });
  const markOut = () => onRange({ s: inP, e: Math.max(t, inP + 0.1) });

  // 글쇠 — 소스 칸에 마우스가 있을 때만 (I·O·스페이스·←→·, .)
  const hover = useRef(false);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!hover.current || !vid) return;
      const tg = e.target as HTMLElement | null;
      if (tg?.closest?.("input, textarea, select, [contenteditable]")) return;
      const key = e.key.toLowerCase();
      const go = (fn: () => void) => { e.preventDefault(); e.stopPropagation(); fn(); };
      if (key === "i") go(markIn);
      else if (key === "o") go(markOut);
      else if (key === " ") go(toggle);
      else if (key === "arrowleft") go(() => seek(t - 1 / 30));
      else if (key === "arrowright") go(() => seek(t + 1 / 30));
      else if (key === ",") go(onInsert);
      else if (key === ".") go(onOverwrite);
    };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  });

  // 재생 중 끝 표시에서 멈춤
  const onTime = () => {
    const v = vRef.current;
    if (!v) return;
    setT(v.currentTime);
    if (!v.paused && range && v.currentTime >= range.e) { v.pause(); seek(range.e); }
  };

  const bar = useRef<HTMLDivElement>(null);
  const scrub = (e: React.PointerEvent) => {
    const el = bar.current;
    if (!el || !dur) return;
    e.preventDefault();
    const at = (x: number) => { const r = el.getBoundingClientRect(); seek(((x - r.left) / r.width) * dur); };
    at(e.clientX);
    const mv = (ev: PointerEvent) => at(ev.clientX);
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", () => window.removeEventListener("pointermove", mv), { once: true });
  };

  const btn = (icon: React.ReactNode, title: string, fn: () => void, off = false) => (
    <button type="button" title={title} onClick={fn} disabled={off}
      style={{ minWidth: 26, height: 26, padding: "0 4px", border: 0, borderRadius: 4, background: "transparent", color: off ? C.dim : C.text, cursor: off ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, fontFamily: FONT }}>{icon}</button>
  );
  // 프로젝트 칸의 영상·사진을 끌어다 놓으면 소스로
  const [over, setOver] = useState(false);
  const dropProps = {
    onDragOver: (e: React.DragEvent) => { if (!onOpen || !e.dataTransfer.types.includes(DRAG_MEDIA)) return; e.preventDefault(); e.dataTransfer.dropEffect = "copy"; if (!over) setOver(true); },
    onDragLeave: (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false); },
    onDrop: (e: React.DragEvent) => {
      setOver(false);
      if (!onOpen) return;
      try {
        const d = JSON.parse(e.dataTransfer.getData(DRAG_MEDIA) || "{}") as { lib?: LibItem; range?: unknown };
        if (!d.lib || d.range || d.lib.kind === "audio") return; // 소스 화면을 자기 위에 놓은 것은 무시
        e.preventDefault();
        onOpen(d.lib);
      } catch {}
    },
  };
  const ring: React.CSSProperties = over ? { outline: `2px dashed ${C.accent}`, outlineOffset: -4, background: "rgba(59,130,246,0.12)" } : {};
  const pct = (x: number) => (dur ? `${(x / dur) * 100}%` : "0%");
  const len = Math.max(0, outP - inP);

  if (!item) {
    return (
      <div {...dropProps} style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center", color: C.sub, fontSize: 13, lineHeight: 1.7, fontFamily: FONT, ...ring }}>
        아래 프로젝트 칸에서 영상·사진을 <b style={{ color: C.text }}>두 번 누르거나 여기로 끌어다 놓으면</b> 열려요.<br />
        시작(I)·끝(O)을 찍고 [삽입]·[덮어쓰기]를 누르거나, 화면을 타임라인으로 끌어 놓으세요.
      </div>
    );
  }
  return (
    <div {...dropProps} onMouseEnter={() => (hover.current = true)} onMouseLeave={() => (hover.current = false)}
      style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 10px 4px", gap: 5, background: "#141518", fontFamily: FONT, ...ring }}>
      <div ref={boxRef} style={{ flex: 1, minHeight: 0, width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* 화면을 끌어 타임라인에 놓으면 — 시작~끝 구간만 */}
        <div draggable title="끌어서 타임라인에 놓으면 시작~끝 구간만 들어가요"
          onDragStart={(e) => {
            e.dataTransfer.setData(DRAG_MEDIA, JSON.stringify({ lib: item, ...(vid ? { range: { s: inP, e: outP } } : {}) }));
            e.dataTransfer.effectAllowed = "copy";
            // 큰 화면 그림 대신 — 타임라인에 고른 길이만큼 자리가 보인다 (프리미어처럼)
            blankDragImage(e);
            Object.assign(mediaDrag, { len: vid ? Math.max(0.1, outP - inP) : 3, name: item.name, thumb: item.thumb });
          }}
          onDragEnd={() => { mediaDrag.len = 0; }}
          style={{ width: box.w, height: box.h, background: "#000", cursor: "grab", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {vid ? (
            <video ref={vRef} src={item.url} preload="auto" playsInline onTimeUpdate={onTime} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onClick={toggle}
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", pointerEvents: "auto" }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.url || item.thumb} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
          )}
        </div>
      </div>
      {vid && (
        <>
          {/* 시간 막대 — 시작~끝 구간은 밝게 */}
          <div ref={bar} onPointerDown={scrub} style={{ position: "relative", width: box.w, height: 14, cursor: "pointer", flexShrink: 0 }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: 6, height: 2, background: C.line2 }} />
            {range && <div style={{ position: "absolute", left: pct(inP), width: `calc(${pct(outP)} - ${pct(inP)})`, top: 3, height: 8, background: "rgba(94,162,255,0.45)", borderRadius: 2 }} />}
            <div style={{ position: "absolute", left: pct(t), top: 0, width: 2, height: 14, marginLeft: -1, background: "#5ea2ff" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 2, width: box.w, flexShrink: 0, fontSize: 12 }}>
            <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "#5ea2ff", minWidth: 62 }}>{fmtTime(t)}</span>
            <span style={{ flex: 1 }} />
            {btn("{", "시작 표시 (I)", markIn)}
            {btn("}", "끝 표시 (O)", markOut)}
            {btn("{←", "시작 표시로 가기", () => seek(inP), !range)}
            {btn("◀|", "한 장면 뒤로 (←)", () => seek(t - 1 / 30))}
            {btn(<Icon name={playing ? "pause" : "play"} size={15} stroke={2} />, "재생·정지 (스페이스)", toggle)}
            {btn("|▶", "한 장면 앞으로 (→)", () => seek(t + 1 / 30))}
            {btn("→}", "끝 표시로 가기", () => seek(outP), !range)}
            {range && btn("✕", "시작·끝 표시 지우기", () => onRange(null))}
            <span style={{ flex: 1 }} />
            <span title="고른 구간 길이" style={{ fontVariantNumeric: "tabular-nums", color: C.sub, minWidth: 62, textAlign: "right" }}>{fmtTime(len)}</span>
          </div>
        </>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 6, width: box.w, flexShrink: 0 }}>
        <span title={item.name} style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: C.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.name} · {item.width && item.height ? `${item.width}×${item.height}` : ""}{vid ? ` · 전체 ${fmtTime(dur)}` : " · 사진"}
        </span>
        <button type="button" onClick={onInsert} title="재생 막대 자리 V1 에 끼워 넣기 — 뒤 클립은 밀려요 (,)"
          style={{ height: 26, padding: "0 10px", borderRadius: 4, border: `1px solid ${C.line2}`, background: C.card, color: C.text, fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" }}>삽입 ,</button>
        <button type="button" onClick={onOverwrite} title="재생 막대 자리 V2 에 올리기 — 뒤 클립은 그대로 (.)"
          style={{ height: 26, padding: "0 10px", borderRadius: 4, border: 0, background: C.accent, color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" }}>덮어쓰기 .</button>
      </div>
    </div>
  );
}
