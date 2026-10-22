"use client";

// 이미지 편집 — 인쇄 창 (파일 › 인쇄, Ctrl+P). 포토샵 [인쇄 설정] 과 같은 구성:
// 왼쪽 용지 미리보기 · 오른쪽 프린터 설정 / 위치 및 크기 / 인쇄 표시(재단선) / 기능(뒤집기·네거티브·배경·테두리·도련)
// 편집 화면이 용지 한 장 그림(300dpi)을 만들어 앱으로 보내면, 앱이 숨은 창에 띄워 프린터로 보낸다 (studio-app/src/photo/ipc.js photo:print)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Btn, C, FONT } from "@/components/admin/studio-video/ui";

export type PrintBridge = {
  printers?: () => Promise<{ name: string; label: string; isDefault: boolean }[]>;
  print?: (o: { bytes: Uint8Array; wMm: number; hMm: number; deviceName?: string; copies?: number; dialog?: boolean }) => Promise<{ ok: boolean; error?: string }>;
};

/** 용지 (mm, 세로 기준) */
const PAPERS: { id: string; name: string; w: number; h: number }[] = [
  { id: "A4", name: "A4 (210×297mm)", w: 210, h: 297 },
  { id: "A3", name: "A3 (297×420mm)", w: 297, h: 420 },
  { id: "A5", name: "A5 (148×210mm)", w: 148, h: 210 },
  { id: "B4", name: "B4 (257×364mm)", w: 257, h: 364 },
  { id: "B5", name: "B5 (182×257mm)", w: 182, h: 257 },
  { id: "Letter", name: "Letter (216×279mm)", w: 215.9, h: 279.4 },
  { id: "Legal", name: "Legal (216×356mm)", w: 215.9, h: 355.6 },
];
const UNITS = { cm: 10, mm: 1, inch: 25.4 } as const;
type Unit = keyof typeof UNITS;
type Opts = {
  printer: string; copies: number; land: boolean; paper: string;
  center: boolean; top: number; left: number; scale: number; fit: boolean; unit: Unit; selOnly: boolean;
  corner: boolean; mid: boolean; reg: boolean; label: boolean;
  flip: boolean; neg: boolean; bg: string; border: number; bleed: number;
};
const KEY = "gsp-print-v1";
const DEF: Opts = { printer: "", copies: 1, land: false, paper: "A4", center: true, top: 0, left: 0, scale: 100, fit: false, unit: "cm", selOnly: false, corner: false, mid: false, reg: false, label: false, flip: false, neg: false, bg: "", border: 0, bleed: 0 };
const load = (): Opts => { try { return { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || "{}"), copies: 1, selOnly: false }; } catch { return DEF; } };
const save = (o: Opts) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch {} };

/** 용지 한 장 그림 — dpi 로 그린다 (미리보기는 작게, 인쇄는 300) */
function renderPage(img: HTMLCanvasElement, o: Opts, pageW: number, pageH: number, box: { x: number; y: number; w: number; h: number }, dpi: number, name: string) {
  const k = dpi / 25.4; // mm → 픽셀
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(pageW * k));
  c.height = Math.max(1, Math.round(pageH * k));
  const g = c.getContext("2d")!;
  g.fillStyle = o.bg || "#FFFFFF";
  g.fillRect(0, 0, c.width, c.height);
  const x = box.x * k, y = box.y * k, w = box.w * k, h = box.h * k;
  g.save();
  g.imageSmoothingQuality = "high";
  if (o.neg) g.filter = "invert(1)";
  if (o.flip) { g.translate(x + w, y); g.scale(-1, 1); g.drawImage(img, 0, 0, w, h); }
  else g.drawImage(img, x, y, w, h);
  g.restore();
  if (o.border > 0) {
    const bw = o.border * k;
    g.strokeStyle = "#000000";
    g.lineWidth = bw;
    g.strokeRect(x + bw / 2, y + bw / 2, w - bw, h - bw);
  }
  // 재단선 — 그림 가장자리(도련만큼 안쪽)에서 바깥으로
  const lw = Math.max(1, 0.25 * k), len = 5 * k, gap = 1.5 * k, bl = o.bleed * k;
  const ex0 = x + bl, ey0 = y + bl, ex1 = x + w - bl, ey1 = y + h - bl;
  g.strokeStyle = "#000000";
  g.lineWidth = lw;
  const line = (a: number, b: number, c2: number, d: number) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c2, d); g.stroke(); };
  if (o.corner) {
    for (const [cx, sx] of [[ex0, -1], [ex1, 1]] as const) for (const [cy, sy] of [[ey0, -1], [ey1, 1]] as const) {
      line(cx + sx * gap, cy, cx + sx * (gap + len), cy);
      line(cx, cy + sy * gap, cx, cy + sy * (gap + len));
    }
  }
  if (o.mid) {
    const mx = (ex0 + ex1) / 2, my = (ey0 + ey1) / 2;
    line(mx, y - gap, mx, y - gap - len); line(mx, y + h + gap, mx, y + h + gap + len);
    line(x - gap, my, x - gap - len, my); line(x + w + gap, my, x + w + gap + len, my);
  }
  if (o.reg) {
    // 맞춰찍기 표시 — 네 변 가운데 바깥에 과녁
    const r = 2.2 * k, off = gap + len + r + 1 * k;
    const mx = (ex0 + ex1) / 2, my = (ey0 + ey1) / 2;
    for (const [px, py] of [[mx, y - off], [mx, y + h + off], [x - off, my], [x + w + off, my]]) {
      g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(px, py, r * 0.5, 0, Math.PI * 2); g.stroke();
      line(px - r * 1.4, py, px + r * 1.4, py); line(px, py - r * 1.4, px, py + r * 1.4);
    }
  }
  if (o.label) {
    g.fillStyle = "#000000";
    g.font = `${Math.max(6, 3 * k)}px 'Pretendard', sans-serif`;
    g.textBaseline = "bottom";
    g.fillText(name, x, y - (o.corner || o.mid || o.reg ? gap + len + 1 * k : 1.5 * k));
  }
  return c;
}

export function PrintDialog({ src, sel, ppi, name, bridge, onClose, say }: {
  /** 문서 전체 합친 그림 · 선택 영역만 (있으면) */
  src: HTMLCanvasElement; sel?: HTMLCanvasElement | null; ppi: number; name: string;
  bridge: PrintBridge | null; onClose: () => void; say: (t: string) => void;
}) {
  const [o, setO] = useState<Opts>(load);
  const [printers, setPrinters] = useState<{ name: string; label: string; isDefault: boolean }[] | null>(null);
  const [open, setOpen] = useState({ pos: true, marks: false, fx: false });
  const [busy, setBusy] = useState("");
  const set = (p: Partial<Opts>) => setO((x) => ({ ...x, ...p }));
  useEffect(() => {
    if (!bridge?.printers) { setPrinters([]); return; }
    bridge.printers().then((l) => {
      setPrinters(l);
      setO((x) => (x.printer && l.some((p) => p.name === x.printer) ? x : { ...x, printer: (l.find((p) => p.isDefault) || l[0])?.name || "" }));
    }).catch(() => setPrinters([]));
  }, [bridge]);
  // 문서가 가로면 처음엔 가로 용지 (포토샵처럼)
  const first = useRef(true);
  // 100% 가 용지보다 크면 처음엔 [용지에 맞추기] (72ppi 화면용 문서는 대개 용지보다 큼)
  useEffect(() => {
    if (!first.current) return;
    first.current = false;
    const land = src.width > src.height;
    const pp = PAPERS.find((p) => p.id === o.paper) || PAPERS[0];
    const pw = land ? pp.h : pp.w, ph = land ? pp.w : pp.h;
    const big = (src.width / ppi) * 25.4 > pw || (src.height / ppi) * 25.4 > ph;
    set({ land, ...(big ? { fit: true, center: true } : {}) });
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps

  const img = o.selOnly && sel ? sel : src;
  const paper = PAPERS.find((p) => p.id === o.paper) || PAPERS[0];
  const pageW = o.land ? paper.h : paper.w, pageH = o.land ? paper.w : paper.h;
  const natW = (img.width / ppi) * 25.4, natH = (img.height / ppi) * 25.4; // 100% 크기 (mm)
  // 맞추기 — 재단선·레이블을 켜면 그 자리만큼 용지 가장자리를 비운다
  const mg = o.reg ? 13 : o.corner || o.mid || o.label ? 8 : 0;
  const fitScale = Math.min((pageW - mg * 2) / natW, (pageH - mg * 2) / natH) * 100;
  const scale = o.fit ? fitScale : o.scale;
  const bw = (natW * scale) / 100, bh = (natH * scale) / 100;
  const bx = o.center ? (pageW - bw) / 2 : o.left, by = o.center ? (pageH - bh) / 2 : o.top;
  const box = { x: bx, y: by, w: bw, h: bh };
  const u = UNITS[o.unit];
  const fmt = (mm: number) => Math.round((mm / u) * 100) / 100;
  const outside = bx < -0.5 || by < -0.5 || bx + bw > pageW + 0.5 || by + bh > pageH + 0.5;

  // 미리보기 — 작은 그림으로 빠르게
  const small = useMemo(() => {
    const k = Math.min(1, 1200 / Math.max(img.width, img.height));
    if (k >= 1) return img;
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
    const g = c.getContext("2d")!; g.imageSmoothingQuality = "high"; g.drawImage(img, 0, 0, c.width, c.height);
    return c;
  }, [img]);
  const PV = { w: 400, h: 430 };
  const pvDpi = Math.min(PV.w / (pageW / 25.4), PV.h / (pageH / 25.4));
  const pvUrl = useMemo(() => renderPage(small, o, pageW, pageH, box, pvDpi, name).toDataURL("image/jpeg", 0.85),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [small, o, pageW, pageH, bx, by, bw, bh, pvDpi, name]);

  const doPrint = async (dialog: boolean) => {
    save(o);
    setBusy("인쇄할 그림을 만드는 중…");
    try {
      const dpi = Math.min(300, 9000 / (Math.max(pageW, pageH) / 25.4)); // 너무 큰 용지는 해상도를 낮춰 (앱 메모리)
      const page = renderPage(img, o, pageW, pageH, box, dpi, name);
      const blob: Blob = await new Promise((r, j) => page.toBlob((b) => (b ? r(b) : j(new Error("그림을 만들지 못했어요"))), "image/png"));
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (bridge?.print) {
        setBusy(dialog ? "윈도우 인쇄 창을 여는 중…" : "프린터로 보내는 중…");
        const r = await bridge.print({ bytes, wMm: pageW, hMm: pageH, deviceName: o.printer || undefined, copies: o.copies, dialog });
        if (r.ok) { say(`인쇄를 보냈어요 — ${o.copies}장`); onClose(); }
        else if (r.error) say(`인쇄하지 못했어요 — ${r.error}`);
      } else {
        // 브라우저 — 인쇄 창으로 (용지 크기를 맞춘 숨은 틀)
        const url = URL.createObjectURL(blob);
        const f = document.createElement("iframe");
        f.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0";
        document.body.appendChild(f);
        const d = f.contentDocument!;
        d.open();
        d.write(`<!doctype html><html><head><style>@page{size:${pageW}mm ${pageH}mm;margin:0}html,body{margin:0}img{display:block;width:${pageW}mm;height:${pageH}mm}</style></head><body><img src="${url}"></body></html>`);
        d.close();
        const im = d.images[0];
        await new Promise((r) => { if (im.complete) r(1); else im.onload = () => r(1); });
        f.contentWindow!.print();
        setTimeout(() => { f.remove(); URL.revokeObjectURL(url); }, 60000);
        onClose();
      }
    } catch (e) {
      say(`인쇄하지 못했어요 — ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy("");
    }
  };
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopImmediatePropagation(); onClose(); }
      if (e.key === "Enter" && !(e.target as HTMLElement).closest?.("input,select")) { e.stopImmediatePropagation(); void doPrint(false); }
    };
    window.addEventListener("keydown", on, true);
    return () => window.removeEventListener("keydown", on, true);
  });

  const input: React.CSSProperties = { height: 28, borderRadius: 4, border: `1px solid ${C.line2}`, background: C.bg, color: C.text, fontSize: 13, fontFamily: FONT, padding: "0 6px" };
  const num = (v: number, on: (n: number) => void, off = false, w = 76) => (
    <input type="number" value={Number.isFinite(v) ? v : 0} disabled={off} step={0.01} onKeyDown={(e) => e.stopPropagation()} onChange={(e) => on(Number(e.target.value) || 0)}
      style={{ ...input, width: w, opacity: off ? 0.45 : 1 }} />
  );
  const chk = (on: boolean, text: string, go: (v: boolean) => void, off = false) => (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: off ? C.dim : C.text, cursor: off ? "default" : "pointer" }}>
      <input type="checkbox" checked={on} disabled={off} onChange={(e) => go(e.target.checked)} />{text}
    </label>
  );
  const sec = (key: keyof typeof open, title: string, body: React.ReactNode) => (
    <div style={{ borderTop: `1px solid ${C.line}` }}>
      <button type="button" onClick={() => setOpen({ ...open, [key]: !open[key] })}
        style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", height: 34, padding: "0 4px", border: 0, background: "transparent", color: C.text, fontSize: 13.5, fontWeight: 800, fontFamily: FONT, cursor: "pointer" }}>
        <span style={{ fontSize: 10, color: C.sub, transform: open[key] ? "rotate(90deg)" : "none", display: "inline-block", width: 10 }}>▶</span>{title}
      </button>
      {open[key] && <div style={{ padding: "2px 6px 14px 20px", display: "flex", flexDirection: "column", gap: 10 }}>{body}</div>}
    </div>
  );
  const row = (label: string, el: React.ReactNode) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 64, textAlign: "right", fontSize: 13, color: C.sub, flexShrink: 0 }}>{label}</span>{el}</div>
  );
  const orientBtn = (land: boolean) => (
    <button type="button" title={land ? "가로" : "세로"} onClick={() => set({ land })}
      style={{ width: 34, height: 30, borderRadius: 4, border: `1px solid ${o.land === land ? C.accent : C.line2}`, background: o.land === land ? "rgba(59,130,246,0.18)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
      <span style={{ width: land ? 18 : 12, height: land ? 12 : 18, border: `1.5px solid ${C.text}`, borderRadius: 1 }} />
    </button>
  );
  const fitOff = o.fit;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 4000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, color: C.text }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: 960, maxWidth: "96vw", height: 640, maxHeight: "94vh", display: "flex", flexDirection: "column", background: C.panel, border: `1px solid ${C.line2}`, borderRadius: 10, boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", alignItems: "center", height: 44, padding: "0 16px", borderBottom: `1px solid ${C.line}` }}>
          <b style={{ flex: 1, fontSize: 15 }}>인쇄 설정</b>
          <button type="button" onClick={onClose} style={{ border: 0, background: "transparent", color: C.sub, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          {/* 왼쪽 — 용지 미리보기 */}
          <div style={{ width: 460, flexShrink: 0, display: "flex", flexDirection: "column", background: "#1b1d22", borderRight: `1px solid ${C.line}` }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <span style={{ fontSize: 12, color: C.sub }}>{fmt(pageW)} {o.unit} × {fmt(pageH)} {o.unit}</span>
              <img src={pvUrl} alt="" style={{ boxShadow: "0 0 0 1px #555, 0 6px 18px rgba(0,0,0,0.5)", maxWidth: PV.w, maxHeight: PV.h }} />
              {outside && <span style={{ fontSize: 12, color: "#fbbf24" }}>그림이 용지 밖으로 나가요 — [용지에 맞추기] 를 켜 보세요</span>}
            </div>
            <div style={{ padding: "10px 16px", fontSize: 12, color: C.dim, borderTop: `1px solid ${C.line}` }}>
              문서 {img.width}×{img.height}px · {Math.round(ppi)}ppi · 100% 크기 {fmt(natW)}×{fmt(natH)} {o.unit}
            </div>
          </div>
          {/* 오른쪽 — 설정 */}
          <div style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "12px 16px" }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: C.sub, marginBottom: 10 }}>프린터 설정</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 14 }}>
              {row("프린터", bridge?.printers ? (
                <select value={o.printer} onChange={(e) => set({ printer: e.target.value })} style={{ ...input, flex: 1, minWidth: 0 }}>
                  {printers === null && <option>불러오는 중…</option>}
                  {printers?.length === 0 && <option value="">프린터가 없어요</option>}
                  {printers?.map((p) => <option key={p.name} value={p.name}>{p.label}{p.isDefault ? " (기본)" : ""}</option>)}
                </select>
              ) : <span style={{ fontSize: 12.5, color: C.dim }}>브라우저에서는 [인쇄] 를 누르면 브라우저 인쇄 창에서 골라요</span>)}
              {row("사본", <>
                {num(o.copies, (n) => set({ copies: Math.max(1, Math.min(99, Math.round(n))) }), false, 64)}
                {bridge?.print && <Btn small onClick={() => void doPrint(true)} disabled={Boolean(busy)}>인쇄 설정…</Btn>}
              </>)}
              {row("레이아웃", <>{orientBtn(false)}{orientBtn(true)}</>)}
              {row("용지", (
                <select value={o.paper} onChange={(e) => set({ paper: e.target.value })} style={{ ...input, flex: 1 }}>
                  {PAPERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              ))}
              <div style={{ fontSize: 12, color: C.dim, paddingLeft: 74 }}>색상은 프린터가 맞춰요 (프린터에서 색상 관리). 인쇄소에 보낼 파일은 [내보내기 › 인쇄용 파일 (CMYK)].</div>
            </div>
            {sec("pos", "위치 및 크기", <>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                {chk(o.center, "중앙", (v) => set(v ? { center: true } : { center: false, top: Math.round(by * 100) / 100, left: Math.round(bx * 100) / 100 }))}
                <span style={{ fontSize: 13, color: C.sub }}>위쪽</span>{num(fmt(by), (n) => set({ top: n * u }), o.center)}
                <span style={{ fontSize: 13, color: C.sub }}>왼쪽</span>{num(fmt(bx), (n) => set({ left: n * u }), o.center)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: C.sub }}>비율</span>{num(Math.round(scale * 100) / 100, (n) => set({ scale: Math.max(1, n) }), fitOff, 70)}<span style={{ fontSize: 12, color: C.dim }}>%</span>
                <span style={{ fontSize: 13, color: C.sub, marginLeft: 6 }}>높이</span>{num(fmt(bh), (n) => set({ scale: Math.max(1, ((n * u) / natH) * 100) }), fitOff)}
                <span style={{ fontSize: 13, color: C.sub }}>폭</span>{num(fmt(bw), (n) => set({ scale: Math.max(1, ((n * u) / natW) * 100) }), fitOff)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                {chk(o.fit, "용지에 맞추어 비율 조정", (v) => set({ fit: v, center: v ? true : o.center }))}
                <span style={{ fontSize: 12.5, color: C.dim }}>인쇄 해상도: {Math.round((ppi * 100) / scale)} PPI{(ppi * 100) / scale < 150 ? " (흐릴 수 있어요)" : ""}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {chk(o.selOnly, "선택 영역 인쇄", (v) => set({ selOnly: v }), !sel)}
                <span style={{ fontSize: 13, color: C.sub }}>단위</span>
                <select value={o.unit} onChange={(e) => set({ unit: e.target.value as Unit })} style={input}>
                  <option value="cm">센티미터</option><option value="mm">밀리미터</option><option value="inch">인치</option>
                </select>
              </div>
            </>)}
            {sec("marks", "인쇄 표시", <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {chk(o.corner, "모퉁이 재단선 표시", (v) => set({ corner: v }))}
                {chk(o.label, "레이블 (문서 이름)", (v) => set({ label: v }))}
                {chk(o.mid, "중앙 재단선 표시", (v) => set({ mid: v }))}
                <span />
                {chk(o.reg, "맞춰찍기 표시", (v) => set({ reg: v }))}
              </div>
              <div style={{ fontSize: 12, color: C.dim }}>명함·전단처럼 잘라 쓸 때 자를 자리를 표시해요. 표시가 들어갈 자리가 있게 그림을 조금 줄이세요.</div>
            </>)}
            {sec("fx", "기능", <>
              <div style={{ display: "flex", gap: 18 }}>
                {chk(o.flip, "인쇄면을 아래로 (좌우 뒤집기)", (v) => set({ flip: v }))}
                {chk(o.neg, "네거티브", (v) => set({ neg: v }))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: C.sub }}>배경</span>
                <input type="color" value={o.bg || "#ffffff"} onChange={(e) => set({ bg: e.target.value })} style={{ width: 36, height: 26, padding: 0, border: `1px solid ${C.line2}`, background: "transparent" }} />
                {o.bg && <Btn small onClick={() => set({ bg: "" })}>흰색으로</Btn>}
                <span style={{ fontSize: 13, color: C.sub, marginLeft: 8 }}>테두리</span>{num(o.border, (n) => set({ border: Math.max(0, Math.min(20, n)) }), false, 60)}<span style={{ fontSize: 12, color: C.dim }}>mm</span>
                <span style={{ fontSize: 13, color: C.sub, marginLeft: 8 }}>도련</span>{num(o.bleed, (n) => set({ bleed: Math.max(0, Math.min(10, n)) }), false, 60)}<span style={{ fontSize: 12, color: C.dim }}>mm</span>
              </div>
              <div style={{ fontSize: 12, color: C.dim }}>도련 = 재단선을 그림 안쪽으로 넣는 폭 (인쇄소 안내, 보통 2mm)</div>
            </>)}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderTop: `1px solid ${C.line}` }}>
          <span style={{ flex: 1, fontSize: 12.5, color: C.sub }}>{busy}</span>
          <Btn onClick={onClose}>취소</Btn>
          <Btn onClick={() => { save(o); say("인쇄 설정을 기억했어요"); onClose(); }}>완료</Btn>
          <Btn primary onClick={() => void doPrint(false)} disabled={Boolean(busy) || (Boolean(bridge?.printers) && !o.printer)}>인쇄</Btn>
        </div>
      </div>
    </div>
  );
}
