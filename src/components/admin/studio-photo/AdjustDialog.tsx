"use client";

// 이미지 편집 — 보정 대화상자 (레벨 · 곡선 · 색조/채도 · 색상 균형 · 명도/대비). 그림을 가리지 않게 떠 있는 창, 바꾸는 대로 미리보기
import React, { useEffect, useRef, useState } from "react";
import { Btn, C, FONT } from "@/components/admin/studio-video/ui";
import { ADJ_DEFAULT, ADJ_TITLE, curveLut, type AdjKind, type AdjVal, type CurvePt } from "./adjust";

type Props<K extends AdjKind> = { kind: K; hist: Uint32Array; onPreview: (v: AdjVal[K]) => void; onOk: (v: AdjVal[K]) => void; onCancel: () => void };

export function AdjustDialog<K extends AdjKind>({ kind, hist, onPreview, onOk, onCancel }: Props<K>) {
  const [v, setV] = useState<AdjVal[K]>(() => structuredClone(ADJ_DEFAULT[kind]));
  const [pv, setPv] = useState(true);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => onPreview(pv ? v : structuredClone(ADJ_DEFAULT[kind])), 60);
    return () => { if (t.current) clearTimeout(t.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, pv]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopImmediatePropagation(); onCancel(); }
      if (e.key === "Enter" && !(e.target as HTMLElement).closest?.("input")) { e.stopImmediatePropagation(); onOk(v); }
    };
    window.addEventListener("keydown", on, true);
    return () => window.removeEventListener("keydown", on, true);
  });
  const set = (p: Partial<AdjVal[K]>) => setV((o) => ({ ...(o as object), ...(p as object) }) as AdjVal[K]);
  const bar = (name: string, val: number, min: number, max: number, on: (n: number) => void, step = 1, tint?: [string, string]) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", fontSize: 13 }}>
        {tint ? <span style={{ flex: 1, display: "flex", justifyContent: "space-between", color: C.sub }}><span>{tint[0]}</span><span>{tint[1]}</span></span> : <span style={{ flex: 1, color: C.sub }}>{name}</span>}
        <input type="number" value={val} step={step} min={min} max={max} onKeyDown={(e) => e.stopPropagation()} onChange={(e) => on(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
          style={{ width: 60, height: 24, marginLeft: 8, borderRadius: 4, border: `1px solid ${C.line2}`, background: C.bg, color: C.text, fontSize: 12.5, padding: "0 4px" }} />
      </div>
      <input type="range" min={min} max={max} step={step} value={val} onChange={(e) => on(Number(e.target.value))} style={{ accentColor: C.accent }} />
    </div>
  );
  const max = Math.max(1, ...Array.from(hist));
  const histSvg = (
    <svg viewBox="0 0 256 100" preserveAspectRatio="none" style={{ width: "100%", height: 90, background: "#111", display: "block" }}>
      {Array.from(hist).map((n, i) => <line key={i} x1={i + 0.5} x2={i + 0.5} y1={100} y2={100 - (Math.sqrt(n / max) * 100)} stroke="#888" />)}
    </svg>
  );
  let body: React.ReactNode = null;
  if (kind === "levels") {
    const L = v as AdjVal["levels"];
    body = (
      <>
        {histSvg}
        {bar("입력 검정", L.inB, 0, 253, (n) => set({ inB: Math.min(n, L.inW - 2) } as never))}
        {bar("중간 (감마)", L.gamma, 0.1, 9.99, (n) => set({ gamma: n } as never), 0.01)}
        {bar("입력 흰색", L.inW, 2, 255, (n) => set({ inW: Math.max(n, L.inB + 2) } as never))}
        {bar("출력 검정", L.outB, 0, 255, (n) => set({ outB: n } as never))}
        {bar("출력 흰색", L.outW, 0, 255, (n) => set({ outW: n } as never))}
      </>
    );
  } else if (kind === "curves") body = <CurveBox pts={v as CurvePt[]} hist={hist} onChange={(p) => setV(p as AdjVal[K])} />;
  else if (kind === "hueSat") {
    const H = v as AdjVal["hueSat"];
    body = (
      <>
        {bar("색조", H.hue, -180, 180, (n) => set({ hue: n } as never))}
        <div style={{ height: 8, borderRadius: 3, background: "linear-gradient(90deg, #0ff, #00f, #f0f, #f00, #ff0, #0f0, #0ff)" }} />
        {bar("채도", H.sat, -100, 100, (n) => set({ sat: n } as never))}
        {bar("밝기", H.light, -100, 100, (n) => set({ light: n } as never))}
      </>
    );
  } else if (kind === "balance") {
    const B = v as AdjVal["balance"];
    body = (
      <>
        <div style={{ fontSize: 12.5, color: C.dim }}>중간 톤 기준</div>
        {bar("", B.cr, -100, 100, (n) => set({ cr: n } as never), 1, ["녹청", "빨강"])}
        {bar("", B.mg, -100, 100, (n) => set({ mg: n } as never), 1, ["마젠타", "초록"])}
        {bar("", B.yb, -100, 100, (n) => set({ yb: n } as never), 1, ["노랑", "파랑"])}
      </>
    );
  } else {
    const BC = v as AdjVal["brightCon"];
    body = (
      <>
        {bar("명도", BC.b, -150, 150, (n) => set({ b: n } as never))}
        {bar("대비", BC.c, -50, 100, (n) => set({ c: n } as never))}
      </>
    );
  }
  return (
    <div onPointerDown={(e) => e.stopPropagation()}
      style={{ position: "fixed", right: 400, top: 130, zIndex: 3000, width: 320, background: C.panel, border: `1px solid ${C.line2}`, borderRadius: 8, boxShadow: "0 12px 36px rgba(0,0,0,0.55)", fontFamily: FONT, color: C.text }}>
      <div style={{ display: "flex", alignItems: "center", height: 40, padding: "0 14px", borderBottom: `1px solid ${C.line}`, fontWeight: 800, fontSize: 14.5 }}>
        <span style={{ flex: 1 }}>{ADJ_TITLE[kind]}</span>
        <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, color: C.sub }}><input type="checkbox" checked={pv} onChange={(e) => setPv(e.target.checked)} />미리보기</label>
      </div>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>{body}</div>
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", padding: "10px 14px", borderTop: `1px solid ${C.line}` }}>
        <Btn small onClick={() => setV(structuredClone(ADJ_DEFAULT[kind]))}>처음대로</Btn>
        <div style={{ flex: 1 }} />
        <Btn small onClick={onCancel}>취소</Btn>
        <Btn small primary onClick={() => onOk(v)}>확인</Btn>
      </div>
    </div>
  );
}

/** 곡선 — 누르면 점 추가, 끌어서 옮기기, 칸 밖으로 끌어내면 지우기 (양 끝 점은 남는다) */
function CurveBox({ pts, hist, onChange }: { pts: CurvePt[]; hist: Uint32Array; onChange: (p: CurvePt[]) => void }) {
  const box = useRef<SVGSVGElement>(null);
  const S = 256;
  const lut = curveLut(pts);
  const at = (e: { clientX: number; clientY: number }) => {
    const r = box.current!.getBoundingClientRect();
    return { x: Math.round(((e.clientX - r.left) / r.width) * 255), y: Math.round((1 - (e.clientY - r.top) / r.height) * 255) };
  };
  const drag = (i: number, list: CurvePt[]) => {
    const mv = (ev: PointerEvent) => {
      const p = at(ev);
      const end = i === 0 || i === list.length - 1;
      const out = !end && (p.y < -30 || p.y > 285 || p.x < -30 || p.x > 285);
      const next = list.map((q, j) => (j === i ? { x: end ? q.x : Math.max(1, Math.min(254, p.x)), y: Math.max(0, Math.min(255, p.y)) } : q));
      onChange(out ? list.filter((_, j) => j !== i) : next);
    };
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };
  const max = Math.max(1, ...Array.from(hist));
  const sorted = [...pts].sort((a, b) => a.x - b.x);
  return (
    <>
      <svg ref={box} viewBox={`0 0 ${S} ${S}`} style={{ width: "100%", aspectRatio: "1", background: "#111", cursor: "crosshair", touchAction: "none" }}
        onPointerDown={(e) => {
          if ((e.target as Element).tagName === "circle") return;
          const p = at(e);
          const list = [...sorted, { x: Math.max(1, Math.min(254, p.x)), y: Math.max(0, Math.min(255, p.y)) }].sort((a, b) => a.x - b.x);
          onChange(list);
          drag(list.findIndex((q) => q.x === Math.max(1, Math.min(254, p.x))), list);
        }}>
        {Array.from(hist).map((n, i) => <line key={i} x1={i + 0.5} x2={i + 0.5} y1={S} y2={S - Math.sqrt(n / max) * S * 0.6} stroke="#333" />)}
        {[64, 128, 192].map((g) => <React.Fragment key={g}><line x1={g} x2={g} y1={0} y2={S} stroke="#2a2a2a" /><line y1={g} y2={g} x1={0} x2={S} stroke="#2a2a2a" /></React.Fragment>)}
        <line x1={0} y1={S} x2={S} y2={0} stroke="#444" strokeDasharray="3 3" />
        <polyline points={Array.from(lut).map((y, x) => `${x},${255 - y}`).join(" ")} fill="none" stroke="#e5e5e5" strokeWidth={1.5} />
        {sorted.map((p, i) => <circle key={i} cx={p.x} cy={255 - p.y} r={5} fill="#fff" stroke="#000" style={{ cursor: "move" }} onPointerDown={(e) => { e.stopPropagation(); drag(i, sorted); }} />)}
      </svg>
      <div style={{ fontSize: 12, color: C.dim }}>눌러서 점 추가 · 끌어서 옮기기 · 칸 밖으로 끌면 지우기</div>
    </>
  );
}
