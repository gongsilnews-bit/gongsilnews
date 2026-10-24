"use client";

// 이미지 편집 — AI 요청바 (포토샵 상황별 작업 표시줄 + 프롬프트 입력창). 도구 줄 [AI] 단추로 켜고 끈다 (2026-10-22 사장님)
//  선택 영역 있음 → 생성형 채우기 · 글자 레이어 → AI 문구 바꾸기 + 글꼴·크기·색·정렬·뒤틀기 · 도형 → 색
//  그림 레이어 → 프롬프트로 편집 · 배경 제거 · 아무것도 없음 → 이미지 생성
import React, { useEffect, useRef, useState } from "react";
import { C, FONT } from "@/components/admin/studio-video/ui";
import { STUDIO_FONTS } from "@/lib/studio-video/fonts";
import { usePcFonts } from "@/lib/pcFonts";
import { IMAGE_STYLES } from "@/lib/studio-video/imageStyles";

export type AiAct = "fill" | "edit" | "gen" | "removeBg" | "text";
export const AI_ACT_NAME: Record<AiAct, string> = { fill: "생성형 채우기", edit: "프롬프트로 편집", gen: "이미지 생성", removeBg: "배경 제거", text: "AI 문구 바꾸기" };
/** 고른 글자 레이어 — aiOff = 숫자·정보 칸 (가격·중개사무소 등, AI 가 바꾸지 않음) */
/** 이미지 생성 — 그림 스타일(영상 편집기와 같은 16가지 id) · 참고 이미지 (2026-10-24 사장님) */
export type AiGenOpts = { style: string; ref: HTMLCanvasElement | null };
const GEN_STYLE_KEY = "gsp:genStyle";
export type BarText = { name: string; font: string; px: number; color: string; align: "left" | "center" | "right"; aiOff: boolean };
export type BarTextSet = Partial<{ font: string; px: number; color: string; align: "left" | "center" | "right" }>;

const svg = (d: string, size = 15) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const ICON: Record<AiAct | "design" | "add", string> = {
  fill: "M4 4h16v16H4zM9 15l2-2 2 2 3-3M8.5 8.5h.01",
  edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  gen: "M4 5h16v14H4zM8 15l3-3 2 2 3-3 2 2M12 2v3M2 12h2",
  removeBg: "M5 19L19 5M7 5h12v12M5 9v10h10",
  text: "M4 7V5h12v2M10 5v14M7 19h6M17 13l1.5-3 1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5z",
  design: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z",
  add: "M12 5v14M5 12h14",
};

export function AiBar({ hasSel, imgLayer, textLayer = null, shapeColor = null, onTextSet, onWarp, onShapeColor, busy, onRun, onAddImage, onClose, onSelInvert, onSelClear }: {
  /** 선택 영역이 있음 · 그림 레이어를 고름 (이름) */
  hasSel: boolean; imgLayer: string | null;
  /** 글자 레이어를 고름 · 도형/픽토그램을 고름 (색) */
  textLayer?: BarText | null; shapeColor?: string | null;
  onTextSet?: (p: BarTextSet) => void; onWarp?: () => void; onShapeColor?: (c: string) => void;
  /** 진행 글 (있으면 입력 막기) */
  busy: string;
  onRun: (act: AiAct, prompt: string, gen?: AiGenOpts) => void;
  onAddImage: () => void; onClose: () => void;
  onSelInvert: () => void; onSelClear: () => void;
}) {
  const pcFonts = usePcFonts();
  // null = 단추 줄, 값 = 입력창 — 상황(선택 영역·고른 레이어)이 바뀌면 단추 줄로
  const ctx = `${hasSel}|${imgLayer || ""}|${textLayer?.name || ""}|${shapeColor === null ? "" : "s"}`;
  const [st, setSt] = useState<{ act: AiAct | null; ctx: string }>({ act: null, ctx });
  const act = st.ctx === ctx ? st.act : null;
  const setAct = (a: AiAct | null) => setSt({ act: a, ctx });
  const [text, setText] = useState("");
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [more, setMore] = useState(false);
  // 이미지 생성 — 그림 스타일 · 참고 이미지
  const [genStyle, setGenStyleState] = useState(() => { try { return localStorage.getItem(GEN_STYLE_KEY) || "realistic"; } catch { return "realistic"; } });
  const setGenStyle = (id: string) => { setGenStyleState(id); try { localStorage.setItem(GEN_STYLE_KEY, id); } catch {} };
  const [styleOpen, setStyleOpen] = useState(false);
  const [refImg, setRefImg] = useState<{ url: string; canvas: HTMLCanvasElement } | null>(null);
  const refInp = useRef<HTMLInputElement>(null);
  const pickRef = (f: File | undefined) => {
    if (!f) return;
    const url = URL.createObjectURL(f);
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 1536 / Math.max(im.width, im.height)); // 너무 크면 줄여 보낸다
      const c = document.createElement("canvas");
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext("2d")!.drawImage(im, 0, 0, c.width, c.height);
      setRefImg({ url, canvas: c });
    };
    im.src = url;
  };
  const curStyle = IMAGE_STYLES.find((x) => x.id === genStyle) || IMAGE_STYLES[0];
  const inp = useRef<HTMLInputElement>(null);
  useEffect(() => { if (act) inp.current?.focus(); }, [act]);
  const drag = (e: React.PointerEvent) => {
    e.preventDefault();
    const sx = e.clientX - pos.x, sy = e.clientY - pos.y;
    const mv = (ev: PointerEvent) => setPos({ x: ev.clientX - sx, y: ev.clientY - sy });
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };
  const run = () => { if (!act || busy) return; onRun(act, text.trim(), act === "gen" ? { style: genStyle, ref: refImg?.canvas || null } : undefined); };
  const pill = (icon: string, label: string, go: () => void, primary = false, off = false) => (
    <button type="button" onClick={go} disabled={off}
      // 파란 단추 글자는 늘 흰색 — 못 누를 때는 단추를 흐리게 (2026-10-24 사장님: [생성] 글씨가 안 보임)
      style={{ display: "flex", alignItems: "center", gap: 6, height: 30, padding: "0 11px", borderRadius: 6, border: `1px solid ${primary ? "transparent" : C.psCtrlLine}`, background: primary ? C.accent : C.psCtrl, color: primary ? "#ffffff" : off ? C.dim : C.psCtrlText, opacity: primary && off ? 0.55 : 1, fontSize: 13, fontWeight: primary ? 700 : 600, fontFamily: FONT, cursor: off ? "default" : "pointer", whiteSpace: "nowrap" }}>
      {svg(icon)}{label}
    </button>
  );
  const ph = act === "text" ? "어떻게 고칠까요? 예: 더 짧게, 광고 문구처럼, 영어로, 존댓말로"
    : act === "fill" ? (hasSel ? "프롬프트를 입력하세요 (비워 두면 자연스럽게 지우기)" : "")
    : act === "edit" ? `${imgLayer ? `'${imgLayer}'` : "그림 전체"}를 어떻게 바꿀까요? 예: 하늘을 맑게, 저녁 노을로`
    : act === "gen" ? "만들 그림을 설명하세요. 예: 햇살 드는 넓은 사무실, 창밖 한강"
    : "";
  return (
    <div onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}
      style={{ position: "absolute", left: "50%", bottom: 22, transform: `translate(calc(-50% + ${pos.x}px), ${pos.y}px)`, zIndex: 600, display: "flex", alignItems: "center", gap: 6, padding: "6px 8px 6px 4px", borderRadius: 10, background: C.panel, border: `1px solid ${C.psCtrlSep}`, boxShadow: "0 10px 30px rgba(0,0,0,0.55)", fontFamily: FONT, color: C.text, maxWidth: "calc(100% - 40px)" }}>
      <span onPointerDown={drag} title="끌어서 옮기기" style={{ width: 14, alignSelf: "stretch", display: "flex", alignItems: "center", justifyContent: "center", cursor: "grab", color: C.psOff, fontSize: 14, letterSpacing: -2 }}>⋮</span>
      {busy ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, height: 30, padding: "0 6px", fontSize: 13, color: "#cfd3da", minWidth: 320 }}>
          <span style={{ width: 14, height: 14, borderRadius: 7, border: "2px solid #60a5fa", borderTopColor: "transparent", animation: "gspSpin 0.8s linear infinite" }} />
          <style>{"@keyframes gspSpin{to{transform:rotate(360deg)}}"}</style>
          {busy}
        </div>
      ) : act ? (
        <>
          <button type="button" title="뒤로" onClick={() => setAct(null)} style={{ width: 26, height: 30, border: 0, background: "transparent", color: C.sub, cursor: "pointer", fontSize: 15 }}>‹</button>
          <span style={{ fontSize: 12.5, color: "#93c5fd", fontWeight: 700, whiteSpace: "nowrap" }}>{AI_ACT_NAME[act]}</span>
          {act === "gen" && <>
            {/* 그림 스타일 — 누르면 위로 카드 16개 */}
            <div style={{ position: "relative" }}>
              <button type="button" onClick={() => setStyleOpen(!styleOpen)} title={curStyle.desc}
                style={{ height: 30, padding: "0 10px", borderRadius: 6, border: `1px solid ${C.psCtrlLine}`, background: C.psCtrl, color: C.psCtrlText, fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" }}>
                {curStyle.label} ▾
              </button>
              {styleOpen && (
                <div style={{ position: "absolute", left: 0, bottom: 38, width: 420, padding: 8, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, background: C.panel, border: `1px solid ${C.psCtrlSep}`, borderRadius: 10, boxShadow: "0 10px 30px rgba(0,0,0,0.55)" }}>
                  {IMAGE_STYLES.map((s) => {
                    const on = s.id === genStyle;
                    return (
                      <button key={s.id} type="button" title={s.desc} onClick={() => { setGenStyle(s.id); setStyleOpen(false); inp.current?.focus(); }}
                        style={{ position: "relative", height: 48, borderRadius: 7, border: 0, outline: on ? `3px solid ${C.accent}` : "none", outlineOffset: -3, background: s.thumb ? `center / cover no-repeat url("${s.thumb}"), ${s.bg}` : s.bg, cursor: "pointer", overflow: "hidden", padding: 0 }}>
                        <span style={{ position: "absolute", inset: 0, background: on ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.45)" }} />
                        <span style={{ position: "relative", color: "#fff", fontSize: 12.5, fontWeight: 800, fontFamily: FONT, textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>{on ? "✓ " : ""}{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {/* 참고 이미지 — 하나 붙이면 그 그림을 보고 비슷하게 */}
            <input ref={refInp} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { pickRef(e.target.files?.[0]); e.target.value = ""; }} />
            {refImg ? (
              <span style={{ position: "relative", width: 30, height: 30, flexShrink: 0 }} title="참고 이미지">
                <img src={refImg.url} alt="" style={{ width: 30, height: 30, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.psCtrlLine}` }} />
                <button type="button" title="참고 이미지 빼기" onClick={() => setRefImg(null)}
                  style={{ position: "absolute", top: -6, right: -6, width: 16, height: 16, borderRadius: 8, border: 0, background: "#111", color: "#fff", fontSize: 10, lineHeight: "16px", padding: 0, cursor: "pointer" }}>✕</button>
              </span>
            ) : (
              <button type="button" title="참고 이미지 붙이기 (선택)" onClick={() => refInp.current?.click()}
                style={{ height: 30, padding: "0 10px", borderRadius: 6, border: `1px dashed ${C.psCtrlLine}`, background: "transparent", color: C.psCtrlText, fontSize: 12.5, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" }}>+ 참고 이미지</button>
            )}
          </>}
          <input ref={inp} value={text} onChange={(e) => setText(e.target.value)} placeholder={ph}
            onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter" && !e.nativeEvent.isComposing) run(); if (e.key === "Escape") setAct(null); }}
            style={{ width: act === "gen" ? 340 : 440, maxWidth: "50vw", height: 32, padding: "0 10px", borderRadius: 6, border: `1px solid ${C.psCtrlLine}`, background: C.psCtrlIn, color: C.text, fontSize: 13.5, fontFamily: FONT, outline: "none" }} />
          {pill(ICON.gen, act === "text" ? "바꾸기" : "생성", run, true, act !== "fill" && act !== "text" && !text.trim())}
        </>
      ) : (
        <>
          {hasSel && <>
            {pill(ICON.fill, "생성형 채우기", () => setAct("fill"), true)}
            {pill("M4 4h16v16H4zM4 4l16 16", "선택 반전", onSelInvert)}
            {pill("M6 6l12 12M18 6L6 18", "선택 해제", onSelClear)}
          </>}
          {!hasSel && textLayer && <>
            {/* 글자 — 포토샵 문자 작업 표시줄처럼 (AI 문구 바꾸기 · 글꼴 · 크기 · 색 · 정렬 · 뒤틀기) */}
            <span title={textLayer.aiOff ? "가격·면적·주소·전화 같은 정보 칸은 AI 가 바꾸지 않아요 (지어내기 방지)" : undefined}>
              {pill(ICON.text, "AI 문구 바꾸기", () => setAct("text"), true, textLayer.aiOff)}
            </span>
            <select value={textLayer.font} onChange={(e) => onTextSet?.({ font: e.target.value })} title="글꼴"
              style={{ height: 30, maxWidth: 130, borderRadius: 6, border: `1px solid ${C.psCtrlLine}`, background: C.psCtrl, color: C.psCtrlText, fontSize: 12.5, fontFamily: FONT, padding: "0 4px" }}>
              {!STUDIO_FONTS.some((f) => f.family === textLayer.font) && !(pcFonts || []).some((f) => f.family === textLayer.font) && <option value={textLayer.font}>{textLayer.font}</option>}
              <optgroup label="공실뉴스 글꼴">{STUDIO_FONTS.map((f) => <option key={f.family} value={f.family}>{f.label}</option>)}</optgroup>
              {pcFonts && pcFonts.length > 0 && <optgroup label="내 PC 글꼴">{pcFonts.filter((f) => !STUDIO_FONTS.some((x) => x.family === f.family)).map((f) => <option key={f.family} value={f.family}>{f.label}</option>)}</optgroup>}
            </select>
            <input type="number" min={4} max={2000} value={textLayer.px} title="글자 크기 (px)" onKeyDown={(e) => e.stopPropagation()}
              onChange={(e) => { const n = Math.round(Number(e.target.value)); if (n >= 4) onTextSet?.({ px: n }); }}
              style={{ width: 58, height: 30, borderRadius: 6, border: `1px solid ${C.psCtrlLine}`, background: C.psCtrl, color: C.psCtrlText, fontSize: 12.5, padding: "0 6px" }} />
            <input type="color" value={textLayer.color.toLowerCase()} title="글자 색" onChange={(e) => onTextSet?.({ color: e.target.value.toUpperCase() })}
              style={{ width: 30, height: 30, padding: 2, borderRadius: 6, border: `1px solid ${C.psCtrlLine}`, background: C.psCtrl, cursor: "pointer" }} />
            <span style={{ display: "flex", border: `1px solid ${C.psCtrlLine}`, borderRadius: 6, overflow: "hidden" }}>
              {(["left", "center", "right"] as const).map((a) => (
                <button key={a} type="button" title={{ left: "왼쪽 정렬", center: "가운데 정렬", right: "오른쪽 정렬" }[a]} onClick={() => onTextSet?.({ align: a })}
                  style={{ width: 30, height: 28, border: 0, background: textLayer.align === a ? C.psCtrlSel : C.psCtrl, color: C.psCtrlText, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {svg({ left: "M4 6h16M4 10h10M4 14h16M4 18h10", center: "M4 6h16M7 10h10M4 14h16M7 18h10", right: "M4 6h16M10 10h10M4 14h16M10 18h10" }[a], 14)}
                </button>
              ))}
            </span>
            {pill("M6 4h10M11 4v9M4 18q8-6 16 0", "텍스트 뒤틀기", () => onWarp?.())}
          </>}
          {!hasSel && !textLayer && shapeColor !== null && <>
            <label style={{ display: "flex", alignItems: "center", gap: 6, height: 30, padding: "0 10px", borderRadius: 6, border: `1px solid ${C.psCtrlLine}`, background: C.psCtrl, fontSize: 13, color: C.psCtrlText, cursor: "pointer" }}>
              <input type="color" value={shapeColor.toLowerCase()} onChange={(e) => onShapeColor?.(e.target.value.toUpperCase())} style={{ width: 22, height: 22, padding: 0, border: 0, background: "transparent", cursor: "pointer" }} />
              색 바꾸기
            </label>
          </>}
          {!hasSel && !textLayer && shapeColor === null && imgLayer && <>
            {pill(ICON.edit, "프롬프트로 편집", () => setAct("edit"), true)}
            {pill(ICON.removeBg, "배경 제거", () => onRun("removeBg", ""))}
          </>}
          {!hasSel && !textLayer && shapeColor === null && !imgLayer && <>
            {pill(ICON.gen, "이미지 생성", () => setAct("gen"), true)}
            {pill(ICON.edit, "프롬프트로 편집 (전체)", () => setAct("edit"))}
            {pill(ICON.add, "장치에서 추가", onAddImage)}
          </>}
        </>
      )}
      <div style={{ position: "relative" }}>
        <button type="button" title="더 보기" onClick={() => setMore(!more)} style={{ width: 28, height: 30, border: 0, borderRadius: 6, background: "transparent", color: C.sub, cursor: "pointer", fontSize: 16 }}>⋯</button>
        {more && (
          <div style={{ position: "absolute", right: 0, bottom: 36, width: 230, padding: "4px 0", background: C.psCtrl, border: `1px solid ${C.psCtrlSep}`, borderRadius: 8, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
            {([...(textLayer && !textLayer.aiOff ? [["text", "AI 문구 바꾸기"]] : []), ["gen", "이미지 생성 (새 레이어)"], ["edit", "프롬프트로 편집"], ...(hasSel ? [["fill", "생성형 채우기"]] : []), ...(imgLayer ? [["removeBg", "배경 제거"]] : [])] as [AiAct, string][]).map(([a, t]) => (
              <button key={a} type="button" onClick={() => { setMore(false); if (a === "removeBg") onRun(a, ""); else setAct(a); }}
                style={{ display: "block", width: "100%", padding: "7px 14px", border: 0, background: "transparent", color: C.text, fontSize: 13, fontFamily: FONT, textAlign: "left", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.psCtrlHover; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>{t}</button>
            ))}
            <div style={{ height: 1, background: C.psCtrlSep, margin: "4px 0" }} />
            <button type="button" onClick={() => { setMore(false); setPos({ x: 0, y: 0 }); }}
              style={{ display: "block", width: "100%", padding: "7px 14px", border: 0, background: "transparent", color: C.text, fontSize: 13, fontFamily: FONT, textAlign: "left", cursor: "pointer" }}>바 위치 처음대로</button>
            <button type="button" onClick={() => { setMore(false); onClose(); }}
              style={{ display: "block", width: "100%", padding: "7px 14px", border: 0, background: "transparent", color: C.text, fontSize: 13, fontFamily: FONT, textAlign: "left", cursor: "pointer" }}>바 숨기기 (창 › 상황별 작업 표시줄)</button>
          </div>
        )}
      </div>
    </div>
  );
}
