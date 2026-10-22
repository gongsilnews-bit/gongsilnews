"use client";

// 이미지 편집 — 텍스트 뒤틀기 창 (포토샵 문자 › 텍스트 뒤틀기). 그림을 가리지 않게 떠 있고, 바꾸는 대로 미리보기
import React, { useEffect, useRef, useState } from "react";
import { Btn, C, FONT } from "@/components/admin/studio-video/ui";
import { WARP_GROUPS, WARP_NAME, type TextWarp } from "./warp";

const icon = (d: string, size = 18) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">{d && <path d={d} />}</svg>
);

export function WarpDialog({ init, onPreview, onOk, onCancel }: { init?: TextWarp; onPreview: (w: TextWarp) => void; onOk: (w: TextWarp) => void; onCancel: () => void }) {
  const [w, setW] = useState<TextWarp>(() => ({ style: "none", bend: 50, h: 0, v: 0, ...init }));
  const [open, setOpen] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => onPreview(w), 40);
    return () => { if (t.current) clearTimeout(t.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopImmediatePropagation(); if (open) setOpen(false); else onCancel(); }
      if (e.key === "Enter" && !(e.target as HTMLElement).closest?.("input")) { e.stopImmediatePropagation(); onOk(w); }
    };
    window.addEventListener("keydown", on, true);
    return () => window.removeEventListener("keydown", on, true);
  });
  const none = w.style === "none";
  const cur = WARP_GROUPS.flat().find((x) => x.id === w.style);
  const bar = (name: string, key: "bend" | "h" | "v") => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, opacity: none ? 0.4 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", fontSize: 13 }}>
        <span style={{ flex: 1, color: C.sub }}>{name}</span>
        <input type="number" disabled={none} value={w[key] ?? 0} min={-100} max={100} onKeyDown={(e) => e.stopPropagation()}
          onChange={(e) => setW({ ...w, [key]: Math.max(-100, Math.min(100, Math.round(Number(e.target.value) || 0))) })}
          style={{ width: 56, height: 24, borderRadius: 4, border: `1px solid ${C.line2}`, background: C.bg, color: C.text, fontSize: 12.5, padding: "0 4px", textAlign: "right" }} />
        <span style={{ marginLeft: 4, color: C.dim, fontSize: 12 }}>%</span>
      </div>
      <input type="range" disabled={none} min={-100} max={100} value={w[key] ?? 0} onChange={(e) => setW({ ...w, [key]: Number(e.target.value) })}
        onDoubleClick={() => setW({ ...w, [key]: 0 })} style={{ accentColor: C.accent }} />
    </div>
  );
  const radio = (on: boolean, text: string, go: () => void) => (
    <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: none ? C.dim : C.text, cursor: none ? "default" : "pointer" }}>
      <input type="radio" disabled={none} checked={on} onChange={go} />{text}
    </label>
  );
  return (
    <div onPointerDown={(e) => e.stopPropagation()}
      style={{ position: "fixed", right: 400, top: 130, zIndex: 3000, width: 330, background: C.panel, border: `1px solid ${C.line2}`, borderRadius: 8, boxShadow: "0 12px 36px rgba(0,0,0,0.55)", fontFamily: FONT, color: C.text }}>
      <div style={{ display: "flex", alignItems: "center", height: 40, padding: "0 14px", borderBottom: `1px solid ${C.line}`, fontWeight: 800, fontSize: 14.5 }}>텍스트 뒤틀기</div>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
          <span style={{ fontSize: 13, color: C.sub, width: 44 }}>스타일</span>
          <button type="button" onClick={() => setOpen(!open)}
            style={{ flex: 1, height: 30, display: "flex", alignItems: "center", gap: 8, padding: "0 8px", borderRadius: 4, border: `1px solid ${C.line2}`, background: C.bg, color: C.text, fontSize: 13, fontFamily: FONT, cursor: "pointer" }}>
            <span style={{ width: 18, display: "flex" }}>{cur?.icon ? icon(cur.icon, 16) : null}</span>
            <span style={{ flex: 1, textAlign: "left" }}>{WARP_NAME[w.style] || "없음"}</span>
            <span style={{ fontSize: 10, color: C.sub }}>▼</span>
          </button>
          {open && (
            <div style={{ position: "absolute", left: 54, right: 0, top: 32, zIndex: 2, background: C.card, border: `1px solid ${C.line2}`, borderRadius: 6, boxShadow: "0 10px 30px rgba(0,0,0,0.5)", padding: "4px 0", maxHeight: 440, overflowY: "auto" }}>
              {WARP_GROUPS.map((g, gi) => (
                <React.Fragment key={gi}>
                  {gi > 0 && <div style={{ height: 1, background: C.line, margin: "4px 0" }} />}
                  {g.map((x) => (
                    <button key={x.id} type="button" onClick={() => { setW({ ...w, style: x.id, bend: w.style === "none" && x.id !== "none" ? 50 : w.bend }); setOpen(false); }}
                      style={{ display: "flex", width: "100%", alignItems: "center", gap: 8, padding: "5px 10px", border: 0, background: x.id === w.style ? C.accent : "transparent", color: x.id === w.style ? "#fff" : C.text, fontSize: 13, fontFamily: FONT, cursor: "pointer", textAlign: "left" }}
                      onMouseEnter={(e) => { if (x.id !== w.style) e.currentTarget.style.background = C.cardHover; }} onMouseLeave={(e) => { if (x.id !== w.style) e.currentTarget.style.background = "transparent"; }}>
                      <span style={{ width: 18, display: "flex" }}>{x.icon ? icon(x.icon, 16) : null}</span>{x.name}
                    </button>
                  ))}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 18, paddingLeft: 54 }}>
          {radio(!w.vertical, "가로", () => setW({ ...w, vertical: false }))}
          {radio(Boolean(w.vertical), "세로", () => setW({ ...w, vertical: true }))}
        </div>
        {bar("구부리기", "bend")}
        {bar("가로 왜곡", "h")}
        {bar("세로 왜곡", "v")}
        <div style={{ fontSize: 12, color: C.dim }}>막대를 두 번 누르면 0 · 뒤틀어도 글은 그대로 고칠 수 있어요</div>
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", padding: "10px 14px", borderTop: `1px solid ${C.line}` }}>
        <Btn small onClick={() => setW({ style: "none", bend: 50, h: 0, v: 0 })}>뒤틀기 없음</Btn>
        <div style={{ flex: 1 }} />
        <Btn small onClick={onCancel}>취소</Btn>
        <Btn small primary onClick={() => onOk(w)}>확인</Btn>
      </div>
    </div>
  );
}
