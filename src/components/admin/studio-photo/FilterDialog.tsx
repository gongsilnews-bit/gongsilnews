"use client";

// 이미지 편집 — 필터 대화상자 (포토샵 필터 창처럼): 값 막대 · 미리보기 · 확인/취소. 그림을 가리지 않게 떠 있다
import React, { useEffect, useRef, useState } from "react";
import { Btn, C, FONT } from "@/components/admin/studio-video/ui";
import { filterDefaults, type Filter, type FVals } from "./filters";

export function FilterDialog({ filter, init, onPreview, onOk, onCancel }: { filter: Filter; init?: FVals | null; onPreview: (v: FVals | null) => void; onOk: (v: FVals) => void; onCancel: () => void }) {
  const [v, setV] = useState<FVals>(() => ({ ...filterDefaults(filter), ...(init || {}) }));
  const [pv, setPv] = useState(true);
  const [busy, setBusy] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => {
      setBusy(true);
      // 계산이 무거운 필터도 화면이 먼저 "계산 중" 을 보이게 한 박자 쉬고
      setTimeout(() => { onPreview(pv ? v : null); setBusy(false); }, 16);
    }, 160);
    return () => { if (t.current) clearTimeout(t.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, pv]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopImmediatePropagation(); onCancel(); }
      if (e.key === "Enter" && !(e.target as HTMLElement).closest?.("input,select")) { e.stopImmediatePropagation(); onOk(v); }
    };
    window.addEventListener("keydown", on, true);
    return () => window.removeEventListener("keydown", on, true);
  });
  return (
    <div onPointerDown={(e) => e.stopPropagation()}
      style={{ position: "fixed", right: 400, top: 130, zIndex: 3000, width: 340, maxHeight: "78vh", display: "flex", flexDirection: "column", background: C.panel, border: `1px solid ${C.line2}`, borderRadius: 8, boxShadow: "0 12px 36px rgba(0,0,0,0.55)", fontFamily: FONT, color: C.text }}>
      <div style={{ display: "flex", alignItems: "center", height: 40, padding: "0 14px", borderBottom: `1px solid ${C.line}`, fontWeight: 800, fontSize: 14.5, flexShrink: 0 }}>
        <span style={{ flex: 1 }}>{filter.name}</span>
        {busy && <span style={{ fontSize: 12, color: C.sub, fontWeight: 600, marginRight: 10 }}>계산 중…</span>}
        <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, color: C.sub }}><input type="checkbox" checked={pv} onChange={(e) => setPv(e.target.checked)} />미리보기</label>
      </div>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
        {(filter.params || []).map((p) => "options" in p ? (
          <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
            <span style={{ flex: 1, color: C.sub }}>{p.label}</span>
            <select value={String(v[p.key])} onChange={(e) => setV({ ...v, [p.key]: e.target.value })}
              style={{ height: 28, borderRadius: 4, border: `1px solid ${C.line2}`, background: C.bg, color: C.text, fontSize: 12.5, fontFamily: FONT }}>
              {p.options.map(([val, t2]) => <option key={val} value={val}>{t2}</option>)}
            </select>
          </div>
        ) : (
          <div key={p.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", fontSize: 13 }}>
              <span style={{ flex: 1, color: C.sub }}>{p.label}</span>
              <input type="number" value={Number(v[p.key])} step={p.step || 1} min={p.min} max={p.max} onKeyDown={(e) => e.stopPropagation()}
                onChange={(e) => setV({ ...v, [p.key]: Math.max(p.min, Math.min(p.max, Number(e.target.value) || 0)) })}
                style={{ width: 64, height: 24, borderRadius: 4, border: `1px solid ${C.line2}`, background: C.bg, color: C.text, fontSize: 12.5, padding: "0 4px", textAlign: "right" }} />
              <span style={{ width: 30, marginLeft: 4, fontSize: 12, color: C.dim }}>{p.unit}</span>
            </div>
            <input type="range" min={p.min} max={p.max} step={p.step || 1} value={Number(v[p.key])} onChange={(e) => setV({ ...v, [p.key]: Number(e.target.value) })} style={{ accentColor: C.accent }} />
          </div>
        ))}
        <div style={{ fontSize: 12, color: C.dim }}>선택 영역이 있으면 그 안에만 적용해요. 확인하면 Ctrl+Z 한 번으로 되돌릴 수 있어요.</div>
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", padding: "10px 14px", borderTop: `1px solid ${C.line}`, flexShrink: 0 }}>
        <Btn small onClick={() => setV(filterDefaults(filter))}>처음대로</Btn>
        <div style={{ flex: 1 }} />
        <Btn small onClick={onCancel}>취소</Btn>
        <Btn small primary onClick={() => onOk(v)}>확인</Btn>
      </div>
    </div>
  );
}
