"use client";

// 이미지 편집 — 쪽 목록 (여러 쪽 문서, 2026-10-23 · docs/2026-10-23_photo_pages_ppt_plan.md)
//  그림판 아래에 떠 있는 줄: 쪽 작은 그림 · 누르면 그 쪽 · 오른쪽 클릭 메뉴(복제·앞/뒤로·지우기) · [+ 쪽]
//  한 장짜리 문서는 오른쪽 아래 작은 [+ 쪽] 만
import React, { useEffect, useRef, useState } from "react";
import { C, FONT } from "@/components/admin/studio-video/ui";
import { pageComposite, pageCount, pageIndex, thumbOf, type Doc } from "./model";

type Props = {
  doc: Doc;
  tick: number;
  onGo: (i: number) => void;
  onAdd: (dup: boolean) => void;
  onDel: (i: number) => void;
  onMove: (i: number, dir: -1 | 1) => void;
};

export function PageStrip({ doc, tick, onGo, onAdd, onDel, onMove }: Props) {
  const n = pageCount(doc);
  const cur = pageIndex(doc);
  // 작은 그림 — 쪽 열쇠마다. 지금 쪽은 고칠 때마다 조금 늦게 다시 (큰 문서도 가볍게)
  const cache = useRef(new Map<string, string>());
  const [, setVer] = useState(0);
  const keyOf = (i: number) => doc.pages?.[i]?.key || "one";
  useEffect(() => {
    if (n <= 1) return;
    let stop = false;
    const t = setTimeout(() => {
      if (stop) return;
      for (let i = 0; i < n; i++) {
        const k = keyOf(i);
        if (i === cur || !cache.current.has(k)) cache.current.set(k, thumbOf(pageComposite(doc, i), 120));
      }
      setVer((v) => v + 1);
    }, 500);
    return () => { stop = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, n, cur, doc.id]);

  const [menu, setMenu] = useState<null | { i: number; x: number; y: number }>(null);
  useEffect(() => {
    if (!menu) return;
    const off = () => setMenu(null);
    window.addEventListener("pointerdown", off);
    return () => window.removeEventListener("pointerdown", off);
  }, [menu]);

  const addBtn = (
    <button type="button" onClick={() => onAdd(false)} title="새 쪽 더하기 (쪽 메뉴에서 복제도 할 수 있어요)"
      style={{ height: 30, padding: "0 12px", borderRadius: 8, border: `1px dashed ${C.line2}`, background: "rgba(32,33,37,0.92)", color: C.sub, fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
      + 쪽
    </button>
  );
  if (n <= 1) return <div style={{ position: "absolute", right: 14, bottom: 12, zIndex: 5 }}>{addBtn}</div>;

  const item = (label: string, go: () => void, off = false, danger = false) => (
    <button type="button" disabled={off} onPointerDown={(e) => e.stopPropagation()} onClick={() => { setMenu(null); go(); }}
      style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 14px", border: 0, background: "transparent", color: off ? C.dim : danger ? C.danger : C.text, fontFamily: FONT, fontSize: 13, cursor: off ? "default" : "pointer" }}>
      {label}
    </button>
  );
  return (
    <div style={{ position: "absolute", left: "50%", bottom: 10, transform: "translateX(-50%)", zIndex: 5, maxWidth: "calc(100% - 40px)", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 12, background: "rgba(24,25,28,0.92)", border: `1px solid ${C.line}`, boxShadow: "0 6px 20px rgba(0,0,0,0.35)", fontFamily: FONT }}>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", minWidth: 0 }}>
        {Array.from({ length: n }, (_, i) => {
          const on = i === cur;
          const src = cache.current.get(keyOf(i));
          const p = doc.pages![i].psd;
          const h = 54, w = Math.max(30, Math.min(110, (p.width / p.height) * h));
          return (
            <button key={keyOf(i)} type="button" onClick={() => onGo(i)} onContextMenu={(e) => { e.preventDefault(); onGo(i); setMenu({ i, x: e.clientX, y: e.clientY }); }}
              title={`${i + 1}쪽 — 오른쪽 클릭: 복제·옮기기·지우기`}
              style={{ flexShrink: 0, padding: 0, border: 0, background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <span style={{ width: w, height: h, borderRadius: 4, overflow: "hidden", background: "#fff", outline: on ? `2px solid ${C.accent}` : `1px solid ${C.line2}`, outlineOffset: on ? 1 : 0, display: "block" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {src && <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />}
              </span>
              <span style={{ fontSize: 11.5, fontWeight: on ? 800 : 600, color: on ? C.text : C.sub }}>{i + 1}</span>
            </button>
          );
        })}
      </div>
      {addBtn}
      {menu && (
        <div onPointerDown={(e) => e.stopPropagation()} style={{ position: "fixed", left: menu.x, top: menu.y, transform: "translateY(-100%)", zIndex: 50, minWidth: 150, padding: "4px 0", borderRadius: 8, background: C.panel2, border: `1px solid ${C.line2}`, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
          {item("쪽 복제", () => onAdd(true))}
          {item("앞으로", () => onMove(menu.i, -1), menu.i <= 0)}
          {item("뒤로", () => onMove(menu.i, 1), menu.i >= n - 1)}
          {item("쪽 지우기…", () => onDel(menu.i), false, true)}
        </div>
      )}
    </div>
  );
}
