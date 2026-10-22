"use client";

// 이미지 편집 — AI 요청바 (포토샵 상황별 작업 표시줄 + 프롬프트 입력창). 도구 줄 [AI] 단추로 켜고 끈다 (2026-10-22 사장님)
//  선택 영역 있음 → 생성형 채우기 · 글자 레이어 → AI 문구 바꾸기 + 글꼴·크기·색·정렬·뒤틀기 · 도형 → 색
//  그림 레이어 → 프롬프트로 편집 · 배경 제거 · 아무것도 없음 → 이미지 생성
import React, { useEffect, useRef, useState } from "react";
import { C, FONT } from "@/components/admin/studio-video/ui";
import { STUDIO_FONTS } from "@/lib/studio-video/fonts";

export type AiAct = "fill" | "edit" | "gen" | "removeBg" | "text";
export const AI_ACT_NAME: Record<AiAct, string> = { fill: "생성형 채우기", edit: "프롬프트로 편집", gen: "이미지 생성", removeBg: "배경 제거", text: "AI 문구 바꾸기" };
/** 고른 글자 레이어 — aiOff = 숫자·정보 칸 (가격·중개사무소 등, AI 가 바꾸지 않음) */
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
  onRun: (act: AiAct, prompt: string) => void;
  onAddImage: () => void; onClose: () => void;
  onSelInvert: () => void; onSelClear: () => void;
}) {
  // null = 단추 줄, 값 = 입력창 — 상황(선택 영역·고른 레이어)이 바뀌면 단추 줄로
  const ctx = `${hasSel}|${imgLayer || ""}|${textLayer?.name || ""}|${shapeColor === null ? "" : "s"}`;
  const [st, setSt] = useState<{ act: AiAct | null; ctx: string }>({ act: null, ctx });
  const act = st.ctx === ctx ? st.act : null;
  const setAct = (a: AiAct | null) => setSt({ act: a, ctx });
  const [text, setText] = useState("");
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [more, setMore] = useState(false);
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
  const run = () => { if (!act || busy) return; onRun(act, text.trim()); };
  const pill = (icon: string, label: string, go: () => void, primary = false, off = false) => (
    <button type="button" onClick={go} disabled={off}
      style={{ display: "flex", alignItems: "center", gap: 6, height: 30, padding: "0 11px", borderRadius: 6, border: `1px solid ${primary ? "transparent" : "#4a4d55"}`, background: primary ? C.accent : "#2a2c31", color: off ? C.dim : "#f1f1f1", fontSize: 13, fontWeight: 600, fontFamily: FONT, cursor: off ? "default" : "pointer", whiteSpace: "nowrap" }}>
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
      style={{ position: "absolute", left: "50%", bottom: 22, transform: `translate(calc(-50% + ${pos.x}px), ${pos.y}px)`, zIndex: 600, display: "flex", alignItems: "center", gap: 6, padding: "6px 8px 6px 4px", borderRadius: 10, background: "#1f2125", border: "1px solid #3d4048", boxShadow: "0 10px 30px rgba(0,0,0,0.55)", fontFamily: FONT, color: C.text, maxWidth: "calc(100% - 40px)" }}>
      <span onPointerDown={drag} title="끌어서 옮기기" style={{ width: 14, alignSelf: "stretch", display: "flex", alignItems: "center", justifyContent: "center", cursor: "grab", color: "#777", fontSize: 14, letterSpacing: -2 }}>⋮</span>
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
          <input ref={inp} value={text} onChange={(e) => setText(e.target.value)} placeholder={ph}
            onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter" && !e.nativeEvent.isComposing) run(); if (e.key === "Escape") setAct(null); }}
            style={{ width: 440, maxWidth: "50vw", height: 32, padding: "0 10px", borderRadius: 6, border: "1px solid #4a4d55", background: "#141518", color: C.text, fontSize: 13.5, fontFamily: FONT, outline: "none" }} />
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
              style={{ height: 30, maxWidth: 130, borderRadius: 6, border: "1px solid #4a4d55", background: "#2a2c31", color: "#f1f1f1", fontSize: 12.5, fontFamily: FONT, padding: "0 4px" }}>
              {!STUDIO_FONTS.some((f) => f.family === textLayer.font) && <option value={textLayer.font}>{textLayer.font}</option>}
              {STUDIO_FONTS.map((f) => <option key={f.family} value={f.family}>{f.label}</option>)}
            </select>
            <input type="number" min={4} max={2000} value={textLayer.px} title="글자 크기 (px)" onKeyDown={(e) => e.stopPropagation()}
              onChange={(e) => { const n = Math.round(Number(e.target.value)); if (n >= 4) onTextSet?.({ px: n }); }}
              style={{ width: 58, height: 30, borderRadius: 6, border: "1px solid #4a4d55", background: "#2a2c31", color: "#f1f1f1", fontSize: 12.5, padding: "0 6px" }} />
            <input type="color" value={textLayer.color.toLowerCase()} title="글자 색" onChange={(e) => onTextSet?.({ color: e.target.value.toUpperCase() })}
              style={{ width: 30, height: 30, padding: 2, borderRadius: 6, border: "1px solid #4a4d55", background: "#2a2c31", cursor: "pointer" }} />
            <span style={{ display: "flex", border: "1px solid #4a4d55", borderRadius: 6, overflow: "hidden" }}>
              {(["left", "center", "right"] as const).map((a) => (
                <button key={a} type="button" title={{ left: "왼쪽 정렬", center: "가운데 정렬", right: "오른쪽 정렬" }[a]} onClick={() => onTextSet?.({ align: a })}
                  style={{ width: 30, height: 28, border: 0, background: textLayer.align === a ? "#3b4252" : "#2a2c31", color: "#f1f1f1", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {svg({ left: "M4 6h16M4 10h10M4 14h16M4 18h10", center: "M4 6h16M7 10h10M4 14h16M7 18h10", right: "M4 6h16M10 10h10M4 14h16M10 18h10" }[a], 14)}
                </button>
              ))}
            </span>
            {pill("M6 4h10M11 4v9M4 18q8-6 16 0", "텍스트 뒤틀기", () => onWarp?.())}
          </>}
          {!hasSel && !textLayer && shapeColor !== null && <>
            <label style={{ display: "flex", alignItems: "center", gap: 6, height: 30, padding: "0 10px", borderRadius: 6, border: "1px solid #4a4d55", background: "#2a2c31", fontSize: 13, color: "#f1f1f1", cursor: "pointer" }}>
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
          <div style={{ position: "absolute", right: 0, bottom: 36, width: 230, padding: "4px 0", background: "#2a2c31", border: "1px solid #3d4048", borderRadius: 8, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
            {([...(textLayer && !textLayer.aiOff ? [["text", "AI 문구 바꾸기"]] : []), ["gen", "이미지 생성 (새 레이어)"], ["edit", "프롬프트로 편집"], ...(hasSel ? [["fill", "생성형 채우기"]] : []), ...(imgLayer ? [["removeBg", "배경 제거"]] : [])] as [AiAct, string][]).map(([a, t]) => (
              <button key={a} type="button" onClick={() => { setMore(false); if (a === "removeBg") onRun(a, ""); else setAct(a); }}
                style={{ display: "block", width: "100%", padding: "7px 14px", border: 0, background: "transparent", color: C.text, fontSize: 13, fontFamily: FONT, textAlign: "left", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#3a3d45"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>{t}</button>
            ))}
            <div style={{ height: 1, background: "#3d4048", margin: "4px 0" }} />
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
