"use client";

// 이미지 편집 — 레이어 목록 (포토샵처럼 위가 앞). 눈 · 작은 그림 · 이름 · 잠금, 끌어서 순서, 오른쪽 클릭 메뉴
import React, { useEffect, useState } from "react";
import { C, FONT, Icon } from "@/components/admin/studio-video/ui";
import { isText, kids, thumbOf, type Doc, type PLayer } from "./model";

const thumbs = new WeakMap<HTMLCanvasElement, string>();
const thumb = (c?: HTMLCanvasElement) => {
  if (!c) return "";
  let t = thumbs.get(c);
  if (!t) {
    t = thumbOf(c, 56);
    thumbs.set(c, t);
  }
  return t;
};

/** 레이어 칸에서 다른 문서 창으로 끌어갈 때 쓰는 이름표 */
export const LAYER_DRAG = "application/x-gsp-layer";
export type MenuAct = "dup" | "del" | "group" | "ungroup" | "png" | "merge" | "lock" | "rename" | "hide" | "fx" | "raster" | "up" | "down" | "clip";
/** clip = 아래 레이어에 끼운 것 (클리핑 마스크) · base = 위에 끼운 레이어가 있는 바탕 · bottom = 그 묶음 맨 아래 (끼울 바탕이 없음) */
type Row = { l: PLayer; depth: number; clip?: boolean; base?: boolean; bottom?: boolean };

export function LayerList({ doc, tick, sel, selSet = [], onSel, onPick, onToggle, onDrop, onAct, onRename, maskEdit = false, onMaskThumb, onLayerThumb }: {
  /** 마스크에 칠하는 중 (고른 레이어의 마스크 작은 그림에 테두리) */
  maskEdit?: boolean;
  /** 마스크 작은 그림 누름 (Shift = 끄고 켜기) · 레이어 작은 그림 누름 */
  onMaskThumb?: (k: string, e: React.PointerEvent) => void;
  onLayerThumb?: (k: string) => void;
  doc: Doc;
  tick: number;
  sel: string | null;
  /** 함께 고른 레이어들 (sel 포함) */
  selSet?: string[];
  onSel: (k: string) => void;
  /** 여러 개 고르기 — Ctrl+누르기 = 하나 더하기/빼기, Shift+누르기 = 사이 모두 (포토샵처럼) */
  onPick?: (k: string, keys: string[] | null) => void;
  onToggle: (k: string, what: "hidden" | "lock" | "open") => void;
  /** k 를 target 의 위(before=true)·아래로 */
  onDrop: (k: string, target: string, above: boolean) => void;
  onAct: (k: string, a: MenuAct) => void;
  onRename: (k: string, name: string) => void;
}) {
  const [menu, setMenu] = useState<{ k: string; x: number; y: number } | null>(null);
  const [over, setOver] = useState<{ k: string; above: boolean } | null>(null);
  const [dragK, setDragK] = useState("");
  const [naming, setNaming] = useState("");
  void tick;

  const rows: Row[] = [];
  const add = (list: PLayer[], depth: number) => {
    for (let i = list.length - 1; i >= 0; i--) {
      const l = list[i];
      rows.push({ l, depth, clip: Boolean(l.clipping) && i > 0, base: !l.clipping && Boolean(list[i + 1]?.clipping), bottom: i === 0 });
      if (l.children && l.opened !== false) add(kids(l), depth + 1);
    }
  };
  add(kids(doc.psd), 0);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menu]);

  const ico = (l: PLayer) => (l.children ? "folder" : isText(l) ? "text" : l.adjustment ? "palette" : "image");
  const locked = (l: PLayer) => Boolean(l.protected?.position);
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }} onDragLeave={() => setOver(null)}>
        {rows.map(({ l, depth, clip, base }) => {
          const k = l._k!;
          const on = sel === k || selSet.includes(k);
          return (
            <div key={k} draggable={!naming}
              onDragStart={(e) => { setDragK(k); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", k); e.dataTransfer.setData(LAYER_DRAG, k); }}
              onDragEnd={() => { setDragK(""); setOver(null); }}
              onDragOver={(e) => {
                if (!dragK || dragK === k) return;
                e.preventDefault();
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setOver({ k, above: e.clientY < r.top + r.height / 2 });
              }}
              onDrop={(e) => { e.preventDefault(); if (dragK && over) onDrop(dragK, over.k, over.above); setOver(null); setDragK(""); }}
              onPointerDown={(e) => {
                // Alt+누르기 = 클리핑 마스크 만들기 / 풀기 (포토샵에서 Alt+레이어 사이 누르기)
                if (e.altKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); onAct(k, "clip"); return; }
                if ((e.ctrlKey || e.metaKey) && onPick) { onPick(k, null); return; }
                if (e.shiftKey && onPick && sel) {
                  // 고른 것부터 누른 것까지 모두
                  const i0 = rows.findIndex((r) => r.l._k === sel), i1 = rows.findIndex((r) => r.l._k === k);
                  if (i0 >= 0 && i1 >= 0) { onPick(k, rows.slice(Math.min(i0, i1), Math.max(i0, i1) + 1).map((r) => r.l._k!)); return; }
                }
                onSel(k);
              }}
              onContextMenu={(e) => { e.preventDefault(); if (!selSet.includes(k)) onSel(k); setMenu({ k, x: e.clientX, y: e.clientY }); }}
              style={{
                display: "flex", alignItems: "center", gap: 6, height: 44, padding: `0 8px 0 ${6 + depth * 16}px`, cursor: "pointer",
                background: on ? C.psCtrlHover : "transparent", borderLeft: `3px solid ${on ? "#fff" : "transparent"}`,
                borderTop: over?.k === k && over.above ? "2px solid #3b82f6" : "2px solid transparent",
                borderBottom: over?.k === k && !over.above ? "2px solid #3b82f6" : "2px solid transparent",
                opacity: dragK === k ? 0.4 : 1,
              }}>
              <button type="button" title={l.hidden ? "보이기" : "숨기기"} onPointerDown={(e) => e.stopPropagation()} onClick={() => onToggle(k, "hidden")}
                style={{ width: 24, height: 24, border: 0, background: "transparent", color: l.hidden ? C.dim : C.text, cursor: "pointer", padding: 0, fontSize: 14 }}>
                {l.hidden ? "–" : "👁"}
              </button>
              {l.children ? (
                <button type="button" title={l.opened === false ? "펼치기" : "접기"} onPointerDown={(e) => e.stopPropagation()} onClick={() => onToggle(k, "open")}
                  style={{ width: 16, border: 0, background: "transparent", color: C.sub, cursor: "pointer", padding: 0, transform: l.opened === false ? "none" : "rotate(90deg)" }}>
                  <Icon name="chevron" size={13} />
                </button>
              ) : <span style={{ width: 16 }} />}
              {/* 클리핑 마스크 — 포토샵처럼 들여 쓰고 꺾인 화살표 (아래 레이어 모양 안에서만 보임) */}
              {clip && (
                <span title="클리핑 마스크 — 아래 레이어 모양 안에서만 보여요 (Alt+누르기 = 풀기)" style={{ width: 14, flexShrink: 0, display: "flex", justifyContent: "center", color: C.sub }}>
                  <svg width="11" height="14" viewBox="0 0 11 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 1v8h7M6.5 6.5 9 9l-2.5 2.5" /></svg>
                </span>
              )}
              <span onPointerDown={() => { if (l.mask?.canvas) onLayerThumb?.(k); }} title={l.mask?.canvas ? "누르면 그림에 칠하기" : undefined}
                style={{ width: 40, height: 32, flexShrink: 0, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: l.children || l.adjustment ? "transparent" : "repeating-conic-gradient(#d0d0d0 0% 25%, #fff 0% 50%) 0 0 / 8px 8px", color: C.sub,
                  outline: on && l.mask?.canvas && !maskEdit ? "2px solid #fff" : "none", outlineOffset: 1 }}>
                {l.canvas && !l.children && !l.adjustment ? <img src={thumb(l.canvas)} alt="" style={{ maxWidth: "100%", maxHeight: "100%" }} /> : <Icon name={ico(l)} size={18} />}
              </span>
              {l.mask?.canvas && (
                <span onPointerDown={(e) => { e.stopPropagation(); onMaskThumb?.(k, e); }} title="레이어 마스크 — 누르면 마스크에 칠하기 (검정 = 숨기기 · 흰색 = 보이기) · Shift+누르기 = 끄고 켜기"
                  style={{ position: "relative", width: 40, height: 32, flexShrink: 0, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "#000", cursor: "pointer",
                    outline: on && maskEdit ? "2px solid #fff" : "none", outlineOffset: 1 }}>
                  <img src={thumb(l.mask.canvas)} alt="" style={{ maxWidth: "100%", maxHeight: "100%", opacity: l.mask.disabled ? 0.5 : 1 }} />
                  {l.mask.disabled && <span style={{ position: "absolute", inset: 0, background: "linear-gradient(to top right, transparent 46%, #ef4444 46%, #ef4444 54%, transparent 54%), linear-gradient(to top left, transparent 46%, #ef4444 46%, #ef4444 54%, transparent 54%)" }} />}
                </span>
              )}
              {naming === k ? (
                <input autoFocus defaultValue={l.name || ""} onPointerDown={(e) => e.stopPropagation()}
                  onBlur={(e) => { onRename(k, e.target.value.trim() || l.name || ""); setNaming(""); }}
                  onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setNaming(""); }}
                  style={{ flex: 1, minWidth: 0, height: 26, border: `1px solid ${C.line2}`, background: C.bg, color: C.text, fontSize: 13, fontFamily: FONT, padding: "0 6px", borderRadius: 4 }} />
              ) : (
                <span onDoubleClick={() => setNaming(k)} title="두 번 누르면 이름 바꾸기"
                  style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: on ? 800 : 600, color: l.hidden ? C.dim : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {isText(l) && <span style={{ color: C.sub, fontWeight: 800, marginRight: 4 }}>T</span>}<span style={base ? { textDecoration: "underline", textUnderlineOffset: 3 } : undefined} title={base ? "클리핑 마스크 바탕 — 위 레이어가 이 모양 안에서만 보여요" : undefined}>{l.name || "레이어"}</span>
                </span>
              )}
              {l.effects && !l.effects.disabled && <span title="레이어 효과" style={{ fontSize: 11, color: C.sub, fontStyle: "italic", fontWeight: 800 }}>fx</span>}
              {locked(l) && <span title="잠김" style={{ fontSize: 12 }}>🔒</span>}
            </div>
          );
        })}
        {!rows.length && <div style={{ padding: 16, fontSize: 13, color: C.dim }}>레이어가 없어요. 위 단추로 글자·사진을 넣어 보세요.</div>}
      </div>
      {menu && (() => {
        const l = rows.find((r) => r.l._k === menu.k)?.l;
        if (!l) return null;
        const item = (a: MenuAct, text: string, ok = true, key?: string) => (
          <button key={a} type="button" disabled={!ok}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => { setMenu(null); if (a === "rename") setNaming(menu.k); else onAct(menu.k, a); }}
            style={{ display: "flex", width: "100%", alignItems: "center", gap: 10, padding: "7px 14px", border: 0, background: "transparent", color: ok ? C.text : C.dim, fontSize: 13.5, fontFamily: FONT, textAlign: "left", cursor: ok ? "pointer" : "default" }}
            onMouseEnter={(e) => { if (ok) e.currentTarget.style.background = C.cardHover; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            <span style={{ flex: 1 }}>{text}</span>{key && <span style={{ color: C.dim, fontSize: 12 }}>{key}</span>}
          </button>
        );
        const hr = (i: number) => <div key={`hr${i}`} style={{ height: 1, background: C.line, margin: "4px 0" }} />;
        return (
          <div onPointerDown={(e) => e.stopPropagation()}
            style={{ position: "fixed", left: Math.min(menu.x, window.innerWidth - 230), top: Math.min(menu.y, window.innerHeight - 420), width: 220, padding: "4px 0", background: C.card, border: `1px solid ${C.line2}`, borderRadius: 8, boxShadow: "0 10px 30px rgba(0,0,0,0.5)", zIndex: 3000 }}>
            {item("fx", "혼합 옵션 (효과)…", !l.children)}
            {hr(1)}
            {item("dup", "레이어 복제", true, "Ctrl+J")}
            {item("del", "레이어 삭제", true, "Delete")}
            {item("group", "그룹으로 묶기", true, "Ctrl+G")}
            {l.children && item("ungroup", "그룹 풀기", true, "Ctrl+Shift+G")}
            {hr(2)}
            {item("png", "PNG 빠른 내보내기", !l.children && !l.adjustment)}
            {item("clip", l.clipping ? "클리핑 마스크 풀기" : "클리핑 마스크 만들기", Boolean(l.clipping) || !rows.find((r) => r.l === l)?.bottom, "Alt+Ctrl+G")}
            {item("merge", "아래 레이어와 병합", true, "Ctrl+E")}
            {item("raster", "그림으로 바꾸기 (래스터화)", isText(l) || Boolean(l.placedLayer) || Boolean(l.children))}
            {hr(3)}
            {item("up", "앞으로 (한 칸)", true, "Ctrl+]")}
            {item("down", "뒤로 (한 칸)", true, "Ctrl+[")}
            {hr(4)}
            {item("lock", locked(l) ? "잠금 풀기" : "잠그기")}
            {item("rename", "이름 바꾸기")}
            {item("hide", l.hidden ? "보이기" : "숨기기")}
          </div>
        );
      })()}
    </div>
  );
}
