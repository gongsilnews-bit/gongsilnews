"use client";

// 이미지 편집 — 이미지 메뉴 대화상자 (포토샵과 같게): 이미지 크기 · 캔버스 크기 · 재단
import React, { useState } from "react";
import { Btn, C, FONT, Modal, input } from "@/components/admin/studio-video/ui";

type Unit = "px" | "pct" | "cm" | "mm" | "inch";
const UNIT_NAME: Record<Unit, string> = { px: "픽셀", pct: "퍼센트", cm: "센티미터", mm: "밀리미터", inch: "인치" };
const toPx = (v: number, u: Unit, base: number, ppi: number) => (u === "px" ? v : u === "pct" ? (base * v) / 100 : u === "cm" ? (v / 2.54) * ppi : u === "mm" ? (v / 25.4) * ppi : v * ppi);
const fromPx = (px: number, u: Unit, base: number, ppi: number) => {
  const v = u === "px" ? px : u === "pct" ? (px / base) * 100 : u === "cm" ? (px / ppi) * 2.54 : u === "mm" ? (px / ppi) * 25.4 : px / ppi;
  return u === "px" ? Math.round(v) : Math.round(v * 100) / 100;
};
const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10 };
const lab: React.CSSProperties = { width: 70, textAlign: "right", fontSize: 13.5, color: C.sub, flexShrink: 0 };
const numIn = (v: number, on: (n: number) => void, w = 110, off = false) => (
  <input type="number" value={Number.isFinite(v) ? v : 0} disabled={off} step="any" onKeyDown={(e) => e.stopPropagation()} onChange={(e) => on(Number(e.target.value) || 0)}
    style={{ ...input, width: w, height: 34, fontSize: 14, opacity: off ? 0.5 : 1 }} />
);
const unitSel = (u: Unit, on: (u: Unit) => void, units: Unit[]) => (
  <select value={u} onChange={(e) => on(e.target.value as Unit)} style={{ ...input, width: 110, height: 34, fontSize: 13.5 }}>
    {units.map((x) => <option key={x} value={x}>{UNIT_NAME[x]}</option>)}
  </select>
);
const sizeText = (w: number, h: number) => {
  const mb = (w * h * 4) / 1024 / 1024;
  return `${w} × ${h} 픽셀 (${mb >= 1 ? `${mb.toFixed(1)}MB` : `${Math.round(mb * 1024)}KB`})`;
};

/** 이미지 › 이미지 크기 (Alt+Ctrl+I) — 레이어 전체를 늘이고 줄인다 */
export function ImageSizeDialog({ w0, h0, ppi0, onOk, onClose }: { w0: number; h0: number; ppi0: number; onOk: (w: number, h: number, ppi: number) => void; onClose: () => void }) {
  const [w, setW] = useState(w0), [h, setH] = useState(h0), [ppi, setPpi] = useState(ppi0);
  const [unit, setUnit] = useState<Unit>("px");
  const [keep, setKeep] = useState(true);
  const [resample, setResample] = useState(true);
  const setWpx = (px: number) => { const nw = Math.max(1, Math.round(px)); setW(nw); if (keep) setH(Math.max(1, Math.round((nw * h0) / w0))); };
  const setHpx = (px: number) => { const nh = Math.max(1, Math.round(px)); setH(nh); if (keep) setW(Math.max(1, Math.round((nh * w0) / h0))); };
  // 리샘플링 끔 = 픽셀은 그대로, 해상도만 바꿔 인쇄 크기가 바뀐다 (포토샵처럼)
  const setPpiV = (n: number) => {
    const p = Math.max(1, n);
    if (!resample) { setPpi(p); return; }
    setPpi(p);
  };
  const preset = (k: number) => { setWpx(w0 * k); if (!keep) setH(Math.max(1, Math.round(h0 * k))); };
  return (
    <Modal title="이미지 크기" onClose={onClose} width={480}
      footer={<><Btn onClick={onClose}>취소</Btn><Btn primary onClick={() => onOk(resample ? w : w0, resample ? h : h0, ppi)}>확인</Btn></>}>
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
        <div style={{ fontSize: 13, color: C.sub }}>이미지 크기: <b style={{ color: C.text }}>{sizeText(resample ? w : w0, resample ? h : h0)}</b> · 지금 {sizeText(w0, h0)}</div>
        <div style={row}>
          <span style={lab}>맞춤</span>
          <select defaultValue="" onChange={(e) => { const k = Number(e.target.value); if (k) preset(k); }} style={{ ...input, flex: 1, height: 34 }}>
            <option value="">원래 크기</option>
            <option value="0.25">25%</option><option value="0.5">50%</option><option value="0.75">75%</option><option value="2">200%</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" title={keep ? "비율 고정 (누르면 풀기)" : "비율 풀림 (누르면 고정)"} onClick={() => setKeep(!keep)}
            style={{ width: 26, alignSelf: "stretch", margin: "6px 0", border: `1px solid ${keep ? C.accent : C.line2}`, borderLeft: 0, borderRadius: "0 6px 6px 0", background: "transparent", color: keep ? C.accent : C.dim, cursor: "pointer", fontSize: 12 }}>{keep ? "🔗" : "⛓"}</button>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={row}><span style={lab}>폭</span>{numIn(fromPx(w, unit, w0, ppi), (v) => setWpx(toPx(v, unit, w0, ppi)), 110, !resample)}{unitSel(unit, setUnit, ["px", "pct", "cm", "mm", "inch"])}</div>
            <div style={row}><span style={lab}>높이</span>{numIn(fromPx(h, unit, h0, ppi), (v) => setHpx(toPx(v, unit, h0, ppi)), 110, !resample)}<span style={{ fontSize: 13, color: C.dim }}>{UNIT_NAME[unit]}</span></div>
          </div>
        </div>
        <div style={row}><span style={lab}>해상도</span>{numIn(ppi, setPpiV)}<span style={{ fontSize: 13, color: C.dim }}>픽셀/인치</span></div>
        <label style={{ ...row, paddingLeft: 80, fontSize: 13.5, cursor: "pointer" }}>
          <input type="checkbox" checked={resample} onChange={(e) => { setResample(e.target.checked); if (!e.target.checked) { setW(w0); setH(h0); } }} />리샘플링 (픽셀 수 바꾸기)
        </label>
        <div style={{ fontSize: 12.5, color: C.dim, paddingLeft: 80 }}>
          {resample ? "글자는 글자 크기로, 사진은 원본에서 다시 줄여 흐려지지 않게 해요." : "픽셀은 그대로 두고 해상도만 바꿔요 (인쇄 크기만 달라져요)."} 인쇄 크기 {((w / ppi) * 2.54).toFixed(1)} × {((h / ppi) * 2.54).toFixed(1)} cm
        </div>
      </div>
    </Modal>
  );
}

/** 이미지 › 캔버스 크기 (Alt+Ctrl+C) — 그림은 그대로, 바탕 크기만. 기준점 9칸 */
export function CanvasSizeDialog({ w0, h0, ppi, onOk, onClose }: { w0: number; h0: number; ppi: number; onOk: (w: number, h: number, ax: number, ay: number, ext: string) => void; onClose: () => void }) {
  const [unit, setUnit] = useState<Unit>("px");
  const [rel, setRel] = useState(false);
  const [w, setW] = useState(w0), [h, setH] = useState(h0);
  const [ax, setAx] = useState(0.5), [ay, setAy] = useState(0.5);
  const [ext, setExt] = useState<"white" | "black" | "transparent" | "custom">("white");
  const [custom, setCustom] = useState("#808080");
  // 상대치 — 입력은 늘릴 양 (0 = 그대로)
  const shown = (px: number, base: number) => fromPx(rel ? px - base : px, unit, base, ppi);
  const take = (v: number, base: number) => Math.max(1, Math.round(toPx(v, unit, base, ppi) + (rel ? (unit === "pct" ? 0 : base) : 0)));
  const takePct = (v: number, base: number) => (rel ? Math.max(1, Math.round(base + (base * v) / 100)) : Math.max(1, Math.round((base * v) / 100)));
  const setWv = (v: number) => setW(unit === "pct" ? takePct(v, w0) : take(v, w0));
  const setHv = (v: number) => setH(unit === "pct" ? takePct(v, h0) : take(v, h0));
  const extColor = ext === "white" ? "#FFFFFF" : ext === "black" ? "#000000" : ext === "transparent" ? "" : custom;
  // 기준점 화살표 — 고른 칸에서 바깥으로
  const arrow = (cx: number, cy: number) => {
    const dx = cx - ax, dy = cy - ay;
    if (dx === 0 && dy === 0) return "●";
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) return "";
    const m: Record<string, string> = { "-0.5,-0.5": "↖", "0,-0.5": "↑", "0.5,-0.5": "↗", "-0.5,0": "←", "0.5,0": "→", "-0.5,0.5": "↙", "0,0.5": "↓", "0.5,0.5": "↘" };
    return m[`${dx},${dy}`] || "";
  };
  return (
    <Modal title="캔버스 크기" onClose={onClose} width={500}
      footer={<><Btn onClick={onClose}>취소</Btn><Btn primary onClick={() => onOk(w, h, ax, ay, extColor)}>확인</Btn></>}>
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
        <div style={{ fontSize: 13, color: C.sub }}>현재 크기: <b style={{ color: C.text }}>폭 {w0}픽셀 × 높이 {h0}픽셀</b></div>
        <div style={{ height: 1, background: C.line }} />
        <div style={{ fontSize: 13, color: C.sub }}>새로운 크기: <b style={{ color: C.text }}>{sizeText(w, h)}</b></div>
        <div style={row}><span style={lab}>폭</span>{numIn(shown(w, w0), setWv)}{unitSel(unit, setUnit, ["px", "pct", "cm", "mm", "inch"])}</div>
        <div style={row}><span style={lab}>높이</span>{numIn(shown(h, h0), setHv)}<span style={{ fontSize: 13, color: C.dim }}>{UNIT_NAME[unit]}</span></div>
        <label style={{ ...row, paddingLeft: 80, fontSize: 13.5, cursor: "pointer" }}>
          <input type="checkbox" checked={rel} onChange={(e) => setRel(e.target.checked)} />상대치 (늘릴 만큼만 쓰기)
        </label>
        <div style={{ ...row, alignItems: "flex-start" }}>
          <span style={{ ...lab, paddingTop: 6 }}>기준</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 30px)", gap: 3 }}>
            {[0, 0.5, 1].map((yy) => [0, 0.5, 1].map((xx) => (
              <button key={`${xx}-${yy}`} type="button" onClick={() => { setAx(xx); setAy(yy); }}
                style={{ width: 30, height: 30, border: `1px solid ${C.line2}`, borderRadius: 3, background: ax === xx && ay === yy ? C.accent : C.bg, color: ax === xx && ay === yy ? "#fff" : C.sub, cursor: "pointer", fontSize: 14, padding: 0 }}>
                {arrow(xx, yy)}
              </button>
            )))}
          </div>
          <span style={{ fontSize: 12.5, color: C.dim, paddingTop: 6 }}>고른 칸 쪽으로 붙여 두고 나머지 쪽으로 늘이거나 줄여요</span>
        </div>
        <div style={row}>
          <span style={lab}>캔버스 확장 색상</span>
          <select value={ext} onChange={(e) => setExt(e.target.value as typeof ext)} style={{ ...input, width: 150, height: 34 }}>
            <option value="white">흰색</option><option value="black">검정</option><option value="transparent">투명</option><option value="custom">기타…</option>
          </select>
          {ext === "custom" && <input type="color" value={custom} onChange={(e) => setCustom(e.target.value)} style={{ width: 36, height: 30, padding: 0, border: `1px solid ${C.line2}`, background: "transparent" }} />}
        </div>
        <div style={{ fontSize: 12.5, color: C.dim }}>늘어난 곳은 배경 레이어에만 이 색으로 칠해요. 줄이면 바깥이 잘려 보이지만 레이어 그림은 지우지 않아요.</div>
      </div>
    </Modal>
  );
}

/** 이미지 › 재단 — 가장자리의 투명한 곳 · 같은 색을 잘라낸다 */
export function TrimDialog({ onOk, onClose }: { onOk: (basis: "transparent" | "topleft" | "bottomright", sides: { top: boolean; bottom: boolean; left: boolean; right: boolean }) => void; onClose: () => void }) {
  const [basis, setBasis] = useState<"transparent" | "topleft" | "bottomright">("transparent");
  const [sides, setSides] = useState({ top: true, bottom: true, left: true, right: true });
  const radio = (v: typeof basis, t: string) => (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, cursor: "pointer" }}><input type="radio" checked={basis === v} onChange={() => setBasis(v)} />{t}</label>
  );
  const chk = (k: keyof typeof sides, t: string) => (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, cursor: "pointer" }}><input type="checkbox" checked={sides[k]} onChange={(e) => setSides({ ...sides, [k]: e.target.checked })} />{t}</label>
  );
  return (
    <Modal title="재단" onClose={onClose} width={400}
      footer={<><Btn onClick={onClose}>취소</Btn><Btn primary onClick={() => onOk(basis, sides)}>확인</Btn></>}>
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.sub }}>기준</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 8 }}>
          {radio("transparent", "투명 픽셀")}{radio("topleft", "왼쪽 위 픽셀 색상")}{radio("bottomright", "오른쪽 아래 픽셀 색상")}
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.sub }}>잘라낼 곳</div>
        <div style={{ display: "flex", gap: 16, paddingLeft: 8 }}>{chk("top", "위")}{chk("bottom", "아래")}{chk("left", "왼쪽")}{chk("right", "오른쪽")}</div>
      </div>
    </Modal>
  );
}
