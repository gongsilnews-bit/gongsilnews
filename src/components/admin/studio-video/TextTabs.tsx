"use client";

// 글자 칸 — 캡컷처럼 탭으로 (회의 3-28, 2026-10-19 사장님)
//  ① 텍스트 (기본 · 말풍선 · 편집효과)  ② 애니메이션 (인 · 아웃 · 반복)  ③ 사전설정 (내가 만든 글자 = 모양 + 애니메이션)
//  메인자막·화면 글자가 같이 쓴다. 어느 탭에서나 맨 아래 [사전 설정으로 저장]
import React, { useState } from "react";
import type { LayerAnim } from "./types";
import { DEFAULT_FONT } from "@/lib/studio-video/fonts";
import { Btn, C, FONT, Icon, Toggle, input, label } from "./ui";
import { ColorPick, FontPick } from "./Pickers";
import { Side } from "./Panels";
import { AnimBody, type AnimBodyProps } from "./Anim";
import { effLeading, effSpacing } from "./timeline";
import { gradCss, BASIC_GROUPS, EFFECT_GROUPS, LookTile, SubPresetGrid, loadMyPresets, saveMyPresets, type MyPreset, type SubLook, type TextLook } from "./SubPresets";
import { VarietyGrid } from "./Variety";

type Tab = "text" | "anim" | "my";

/** 숫자 칸 + − 단추 (캡컷 문자 간격·줄 간격처럼) */
function Stepper({ title, value, min, max, step, onChange }: { title: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, v)));
  const btn: React.CSSProperties = { width: 26, height: 30, border: 0, background: "transparent", color: C.sub, fontSize: 16, cursor: "pointer", padding: 0 };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {title && <span style={{ fontSize: 12.5, color: C.sub, whiteSpace: "nowrap" }}>{title}</span>}
      <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 5, border: `1px solid ${C.line2}`, background: C.card }}>
        <button type="button" onClick={() => set(value - step)} style={btn}>−</button>
        <input key={value} defaultValue={value}
          onBlur={(e) => { const n = Number(e.target.value.replace(/[^0-9-]/g, "")); if (e.target.value.trim() && Number.isFinite(n)) set(n); else e.target.value = String(value); }}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          style={{ width: 40, height: 30, border: 0, background: "transparent", color: C.text, textAlign: "center", fontSize: 13.5, fontFamily: FONT }} />
        <button type="button" onClick={() => set(value + step)} style={btn}>+</button>
      </span>
    </span>
  );
}
type Sub = "basic" | "bubble" | "effect";
// 마지막에 보던 탭 — 다른 글자를 골라도 그대로 (앱을 켠 동안)
const last: { tab: Tab; sub: Sub } = { tab: "text", sub: "basic" };
const remember = (k: "tab" | "sub", v: string) => { (last as Record<string, string>)[k] = v; };
/** 새 글자를 넣을 때 — 칸을 [텍스트 › 기본]부터 */
export const resetTextTabs = () => { remember("tab", "text"); remember("sub", "basic"); };

export function TextTabs({ title, kind, look, onLook, onPresetLook, basicTop, anim, bubble, onClose, footerTop, pxPer100 = 67, titleExtra, posEl, basicBottom }: {
  title: string;
  /** 제목 줄 오른쪽 — 메인자막 적용 범위 단추 */
  titleExtra?: React.ReactNode;
  /** [기본] 색상 아래·문자 간격 위 — 메인자막 위치 */
  posEl?: React.ReactNode;
  /** [기본] 맨 아래 — 화면 글자 적용 범위·순서 */
  basicBottom?: React.ReactNode;
  /** 글자 크기 100% 일 때 완성 영상에서의 글자 크기 (px) — 크기를 % 대신 글자 크기 숫자로 보여 준다 */
  pxPer100?: number;
  /** 맨 아래 고정 줄 — 메인자막 적용 범위 [전체 적용][선택 클립 적용] (어느 탭에서나 보이게) */
  footerTop?: React.ReactNode;
  /** photo = 이미지 편집 글자 (애니메이션 탭 없음, 크기는 픽셀 그대로) */
  kind: "sub" | "layer" | "photo";
  look: TextLook;
  /** 하나씩 바꾸기 */
  onLook: (patch: TextLook) => void;
  /** 사전 설정 스타일 — 그 모양 그대로 (클립마다 따로 바꾼 모양까지 덮는다) */
  onPresetLook: (look: SubLook) => void;
  /** [텍스트 › 기본] 맨 위 — 메인자막: 적용 범위·이 클립 자막·보이기·위치 / 화면 글자: 글·자리·적용 범위·순서 */
  basicTop?: React.ReactNode;
  anim?: AnimBodyProps;
  /** [텍스트 › 말풍선] — 화면 글자만 */
  bubble?: React.ReactNode;
  onClose: () => void;
}) {
  const [tab, setTabS] = useState<Tab>(!anim && last.tab === "anim" ? "text" : last.tab);
  const [sub, setSubS] = useState<Sub>(last.sub);
  const setTab = (t: Tab) => { remember("tab", t); setTabS(t); };
  const setSub = (t: Sub) => { remember("sub", t); setSubS(t); };
  const [my, setMy] = useState<MyPreset[]>(() => loadMyPresets());
  const [naming, setNaming] = useState<string | null>(null);

  const row: React.CSSProperties = { padding: "12px 16px", borderBottom: `1px solid ${C.line}` };
  const col: React.CSSProperties = { ...row, display: "flex", flexDirection: "column", gap: 6 };

  /** 켜고 끄는 효과 한 묶음 — 끄면 닫힘, 켜면 [색] · 두께 · 투명도 (글자 뒤 상자·그림자·빛 같은 모양) */
  const fxRow = (title: string, on: boolean, ok: boolean, offNote: string, toggle: (v: boolean) => void,
    color: string, setColor: (c: string) => void,
    thick: number, tMin: number, tMax: number, setThick: (v: number) => void,
    clear: number, setClear: (v: number) => void) => {
    const bar = (name: string, v: number, min: number, max: number, set: (x: number) => void) => (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 44, flexShrink: 0, fontSize: 13, color: C.sub, fontWeight: 700 }}>{name}</span>
        <input type="range" min={min} max={max} step={1} value={v} onChange={(e) => set(Number(e.target.value))} style={{ flex: 1, minWidth: 0, accentColor: C.accent }} />
        <Stepper title="" value={v} min={min} max={max} step={1} onChange={set} />
      </div>
    );
    return (
      <div style={{ ...col, gap: on && ok ? 10 : 0 }}>
        <div style={{ display: "flex", alignItems: "center" }} title={ok ? undefined : offNote}>
          <span style={{ ...label, flex: 1, opacity: ok ? 1 : 0.45 }}>{title}</span>
          <Toggle on={on && ok} onChange={(v) => ok && toggle(v)} />
        </div>
        {on && ok && (
          <>
            <ColorPick value={color} onChange={setColor} />
            {bar("두께", thick, tMin, tMax, setThick)}
            {bar("투명도", clear, 0, 90, setClear)}
          </>
        )}
      </div>
    );
  };
  const save = () => {
    const name = (naming || "").trim() || `내 글자 ${my.length + 1}`;
    const pick = <K extends keyof TextLook>(k: K) => look[k];
    const lk: TextLook = {};
    for (const k of ["font", "color", "outline", "outlineWidth", "bg", "bgColor", "bgOpacity", "bold", "shadow", "shadowColor", "glow", "size", "spacing", "leading", "italic", "underline", "textCase", "align", "bgPad", "shadowAlpha", "glowSize", "glowAlpha", "outlineAlpha", "textAlpha", "outline2", "outline2Width", "gradTo", "gradType", "gradAngle", "gradA", "gradB"] as (keyof TextLook)[]) {
      const v = pick(k);
      if (v !== undefined) (lk as Record<string, unknown>)[k] = v;
    }
    const next = [{ id: `p${Date.now().toString(36)}`, name, look: lk, anim: anim?.value && Object.keys(anim.value).length ? anim.value : undefined, at: Date.now() }, ...my];
    setMy(next);
    saveMyPresets(next);
    setNaming(null);
  };
  const applyMy = (pr: MyPreset) => {
    const { size, spacing, leading, ...rest } = pr.look;
    onPresetLook({ font: "Pretendard", color: "#FFFFFF", outline: "#000000", outlineWidth: 3, bg: false, bgColor: "#000000", bgOpacity: 0.62, bold: true, shadow: 0, shadowColor: "#000000", glow: "", outline2Width: 0, gradTo: "", gradType: undefined, gradAngle: undefined, gradA: undefined, gradB: undefined, ...rest } as SubLook);
    const extra: TextLook = {};
    if (size !== undefined) extra.size = size;
    if (spacing !== undefined) extra.spacing = spacing;
    if (kind !== "layer" && leading !== undefined) extra.leading = leading;
    if (Object.keys(extra).length) onLook(extra);
    anim?.onChange(() => ({ ...(pr.anim || {}) } as LayerAnim), false);
  };
  const removeMy = (id: string) => {
    const next = my.filter((x) => x.id !== id);
    setMy(next);
    saveMyPresets(next);
  };

  const shadowOn = Number(look.shadow) > 0;
  return (
    <Side title={title} onClose={onClose} titleExtra={titleExtra}
      footer={footerTop}>
      {/* 큰 탭 */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.line}` }}>
        {([["text", "텍스트"], ["anim", "애니메이션"], ["my", "사전설정"]] as const).filter(([k]) => k !== "anim" || anim).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            style={{ flex: 1, height: 42, border: 0, borderBottom: `2px solid ${tab === k ? C.accent : "transparent"}`, background: "transparent", color: tab === k ? C.text : C.sub, fontSize: 14.5, fontWeight: 800, fontFamily: FONT, cursor: "pointer" }}>
            {l}{k === "anim" && anim?.value && Object.keys(anim.value).length ? " •" : ""}{k === "my" && my.length ? ` ${my.length}` : ""}
          </button>
        ))}
      </div>

      {tab === "text" && (
        <>
          <div style={{ padding: "12px 16px 0" }}>
            <div style={{ display: "flex", borderRadius: 7, background: C.card, padding: 3 }}>
              {([["basic", "기본"], ["bubble", kind === "sub" ? "예능 자막" : "말풍선"], ["effect", "편집효과"]] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setSub(k)}
                  style={{ flex: 1, height: 32, border: 0, borderRadius: 5, background: sub === k ? C.panel2 : "transparent", color: sub === k ? C.text : C.sub, fontSize: 14, fontWeight: 800, fontFamily: FONT, cursor: "pointer" }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {sub === "basic" && (
            <>
              {basicTop}
              <div style={col}><span style={label}>글꼴</span><FontPick value={look.font} onChange={(f) => onLook({ font: f })} /></div>
              {/* 글자 크기 — % 대신 완성 영상 글자 크기 숫자로, 오른쪽에 입력 칸 (2026-10-19 사장님) */}
              {kind === "photo" ? (() => {
                // 이미지 글자 — 크기 = 픽셀 그대로 (포토샵 글자 크기와 같은 숫자)
                const px = Math.round(look.size ?? 60);
                return (
                  <div style={col}>
                    <span style={label}>글자 크기</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input type="range" min={6} max={Math.max(400, px)} step={1} value={px} onChange={(e) => onLook({ size: Number(e.target.value) })} style={{ flex: 1, minWidth: 0, accentColor: C.accent }} />
                      <Stepper title="" value={px} min={4} max={2000} step={1} onChange={(v) => onLook({ size: v })} />
                    </div>
                  </div>
                );
              })() : (() => {
                const toPx = (pct: number) => Math.round((pct / 100) * pxPer100);
                const toPct = (px: number) => Math.max(40, Math.min(260, Math.round((px / pxPer100) * 100)));
                const px = toPx(look.size ?? 100);
                return (
                  <div style={col}>
                    <span style={label}>글자 크기</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input type="range" min={toPx(40)} max={toPx(260)} step={1} value={px} onChange={(e) => onLook({ size: toPct(Number(e.target.value)) })} style={{ flex: 1, minWidth: 0, accentColor: C.accent }} />
                      <Stepper title="" value={px} min={toPx(40)} max={toPx(260)} step={1} onChange={(v) => onLook({ size: toPct(v) })} />
                    </div>
                  </div>
                );
              })()}
              {/* 글자 투명도 — 글자 크기 바로 아래 (0 = 진하게, 2026-10-19 사장님) */}
              <div style={col}>
                <span style={label}>투명도</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="range" min={0} max={90} step={1} value={Math.round((look.textAlpha ?? 0) * 100)} onChange={(e) => onLook({ textAlpha: Number(e.target.value) ? Number(e.target.value) / 100 : undefined })} style={{ flex: 1, minWidth: 0, accentColor: C.accent }} />
                  <Stepper title="" value={Math.round((look.textAlpha ?? 0) * 100)} min={0} max={90} step={1} onChange={(v) => onLook({ textAlpha: v ? v / 100 : undefined })} />
                </div>
              </div>
              {/* 패턴 · 대소문자 · 문자/줄 간격 · 정렬 — 캡컷처럼 (2026-10-19 사장님) */}
              <div style={{ ...row, display: "grid", gridTemplateColumns: "72px 1fr", rowGap: 12, alignItems: "center" }}>
                <span style={label}>패턴</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {(() => {
                    const canBold = !look.font || look.font === DEFAULT_FONT;
                    const b = (on: boolean, ok: boolean, title: string, set: () => void, child: React.ReactNode) => (
                      <button type="button" onClick={set} disabled={!ok} title={title}
                        style={{ width: 40, height: 32, borderRadius: 5, border: `1px solid ${on ? C.text : C.line2}`, background: on ? C.text : "transparent", color: on ? C.bg : ok ? C.text : C.dim, opacity: ok ? 1 : 0.45, fontSize: 15, fontFamily: "Georgia, serif", cursor: ok ? "pointer" : "default" }}>{child}</button>
                    );
                    return (
                      <>
                        {b(look.bold !== false && canBold, canBold, canBold ? "굵게" : "이 글꼴은 굵기가 하나예요", () => onLook({ bold: look.bold === false }), <b>B</b>)}
                        {b(Boolean(look.underline), true, "밑줄", () => onLook({ underline: !look.underline || undefined }), <u>U</u>)}
                        {b(Boolean(look.italic), true, "기울임", () => onLook({ italic: !look.italic || undefined }), <i>I</i>)}
                      </>
                    );
                  })()}
                </div>
                <span style={label}>대소문자</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {([["upper", "TT", "모두 대문자"], ["lower", "tt", "모두 소문자"], ["title", "Tt", "낱말 첫 글자만 대문자"]] as const).map(([v, t, ti]) => (
                    <button key={v} type="button" onClick={() => onLook({ textCase: look.textCase === v ? undefined : v })} title={`${ti} (영어만 · 다시 누르면 그대로)`}
                      style={{ width: 40, height: 32, borderRadius: 5, border: `1px solid ${look.textCase === v ? C.text : C.line2}`, background: look.textCase === v ? C.text : "transparent", color: look.textCase === v ? C.bg : C.text, fontSize: 13.5, fontWeight: 800, fontFamily: FONT, cursor: "pointer" }}>{t}</button>
                  ))}
                </div>
                <span style={label}>색상</span>
                <ColorPick value={look.color || "#FFFFFF"} onChange={(c) => onLook({ color: c })} />
              </div>
              {posEl}
              {/* 문자 간격 · 줄 간격 — [자동]이 기본(이름 오른쪽), 끌개·숫자를 움직이면 직접 값 (2026-10-19 사장님) */}
              {(() => {
                // [자동]이 켜져 있으면 닫힘. 누르면 자동이 꺼지고(지금 값 그대로) 아래에 끌개·숫자 칸이 펼쳐진다. 다시 누르면 자동으로
                const bar = (title: string, auto: boolean, v: number, min: number, max: number, set: (x: number) => void, toAuto: () => void) => (
                  <div style={{ ...col, gap: auto ? 0 : 6 }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span style={{ ...label, flex: 1 }}>{title}</span>
                      <button type="button" onClick={() => (auto ? set(v) : toAuto())} title={auto ? "자동 — 글꼴·모양에 맞춰 저절로 (누르면 직접 조절)" : `눌러서 자동으로 (글꼴·모양에 맞춘 ${title})`}
                        style={{ height: 28, padding: "0 12px", borderRadius: 5, border: `1px solid ${auto ? C.text : C.line2}`, background: auto ? C.text : "transparent", color: auto ? C.bg : C.sub, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>자동</button>
                    </div>
                    {!auto && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input type="range" min={min} max={max} step={1} value={v} onChange={(e) => set(Number(e.target.value))} style={{ flex: 1, minWidth: 0, accentColor: C.accent }} />
                        <Stepper title="" value={v} min={min} max={max} step={1} onChange={set} />
                      </div>
                    )}
                  </div>
                );
                return (
                  <>
                    {bar("문자 간격", typeof look.spacing !== "number", Math.round(effSpacing(look) * 100), -10, 50, (v) => onLook({ spacing: v / 100 }), () => onLook({ spacing: undefined }))}
                    {kind !== "layer" && bar("줄 간격", typeof look.leading !== "number", Math.round((effLeading(look) / 1.25) * 100) - 100, -28, 100, (v) => onLook({ leading: Math.round(1.25 * (100 + v)) / 100 }), () => onLook({ leading: undefined }))}
                  </>
                );
              })()}
              <div style={{ ...row, display: "grid", gridTemplateColumns: "72px 1fr", rowGap: 12, alignItems: "center" }}>
                <span style={label}>정렬</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {([["left", "alignL", "왼쪽"], ["center", "alignC", "가운데"], ["right", "alignR", "오른쪽"]] as const).map(([v, ic, ti]) => {
                    const on = (look.align || "center") === v;
                    return (
                      <button key={v} type="button" onClick={() => onLook({ align: v === "center" ? undefined : v })} title={`${ti} 정렬`}
                        style={{ width: 40, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 5, border: `1px solid ${on ? C.text : C.line2}`, background: on ? C.text : "transparent", color: on ? C.bg : C.text, cursor: "pointer" }}>
                        <Icon name={ic} size={17} />
                      </button>
                    );
                  })}
                </div>
              </div>
              {fxRow("테두리", Number(look.outlineWidth ?? (kind === "sub" ? 3 : 4)) > 0, !look.bg, "글자 뒤 상자를 쓰면 테두리는 안 나와요", (v) => onLook({ outlineWidth: v ? (kind === "sub" ? 3 : 4) : 0 }),
                look.outline || "#000000", (c) => onLook({ outline: c }),
                Math.round(Number(look.outlineWidth ?? (kind === "sub" ? 3 : 4))) || 3, 1, 12, (v) => onLook({ outlineWidth: v }),
                Math.round((look.outlineAlpha ?? 0) * 100), (v) => onLook({ outlineAlpha: v ? v / 100 : undefined }))}
              {/* 예능 자막 — 이중 테두리 · 그라데이션 (메인자막, 2026-10-19 사장님) */}
              {kind === "sub" && (() => {
                const o2 = Number(look.outline2Width || 0) > 0;
                const ok2 = !look.bg;
                const tw = Math.round(Number(look.outline2Width || 4)) || 4;
                return (
                  <>
                    <div style={{ ...col, gap: o2 && ok2 ? 10 : 0 }}>
                      <div style={{ display: "flex", alignItems: "center" }} title={ok2 ? "안쪽 테두리 바깥에 한 겹 더 (예능 자막)" : "글자 뒤 상자를 쓰면 이중 테두리는 안 나와요"}>
                        <span style={{ ...label, flex: 1, opacity: ok2 ? 1 : 0.45 }}>이중 테두리</span>
                        <Toggle on={o2 && ok2} onChange={(v) => ok2 && onLook({ outline2Width: v ? 4 : 0, outline2: look.outline2 || "#FFFFFF", ...(v && Number(look.outlineWidth ?? 3) <= 0 ? { outlineWidth: 3 } : {}) })} />
                      </div>
                      {o2 && ok2 && (
                        <>
                          <ColorPick value={look.outline2 || "#FFFFFF"} onChange={(c) => onLook({ outline2: c })} />
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ width: 44, flexShrink: 0, fontSize: 13, color: C.sub, fontWeight: 700 }}>두께</span>
                            <input type="range" min={1} max={16} step={1} value={tw} onChange={(e) => onLook({ outline2Width: Number(e.target.value) })} style={{ flex: 1, minWidth: 0, accentColor: C.accent }} />
                            <Stepper title="" value={tw} min={1} max={16} step={1} onChange={(v) => onLook({ outline2Width: v })} />
                          </div>
                          <div style={{ fontSize: 12, color: C.dim }}>위 [테두리]가 안쪽, 이 색이 바깥 테두리예요.</div>
                        </>
                      )}
                    </div>
                    <div style={{ ...col, gap: look.gradTo && !look.bg ? 10 : 0 }}>
                      <div style={{ display: "flex", alignItems: "center" }} title={look.bg ? "글자 뒤 상자를 쓰면 그라데이션은 안 나와요" : "글자 색이 위에서 아래로 바뀌어요"}>
                        <span style={{ ...label, flex: 1, opacity: look.bg ? 0.45 : 1 }}>그라데이션 글자</span>
                        <Toggle on={Boolean(look.gradTo) && !look.bg} onChange={(v) => !look.bg && onLook({ gradTo: v ? "#FF8A00" : "" })} />
                      </div>
                      {look.gradTo && !look.bg && (() => {
                        // 포토샵처럼 — 모양(선형·방사형·반사형) · 각도 · 시작/끝 색과 투명도 (2026-10-19 사장님)
                        const gt = look.gradType || "linear";
                        const ang = Math.round(Number(look.gradAngle ?? 180));
                        const bar = (name: string, v: number, min: number, max: number, set: (x: number) => void, unit = "") => (
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ width: 44, flexShrink: 0, fontSize: 13, color: C.sub, fontWeight: 700 }}>{name}</span>
                            <input type="range" min={min} max={max} step={1} value={v} onChange={(e) => set(Number(e.target.value))} style={{ flex: 1, minWidth: 0, accentColor: C.accent }} />
                            <Stepper title={unit} value={v} min={min} max={max} step={1} onChange={set} />
                          </div>
                        );
                        const css = gradCss({ ...look, gradTo: look.gradTo! });
                        return (
                          <>
                            <div style={{ display: "flex", gap: 6 }}>
                              {([["linear", "선형"], ["radial", "방사형"], ["reflect", "반사형"]] as const).map(([v, t]) => (
                                <button key={v} type="button" onClick={() => onLook({ gradType: v === "linear" ? undefined : v })}
                                  style={{ flex: 1, height: 32, borderRadius: 5, border: `1px solid ${gt === v ? C.text : C.line2}`, background: gt === v ? C.text : "transparent", color: gt === v ? C.bg : C.text, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>{t}</button>
                              ))}
                            </div>
                            {gt !== "radial" && bar("각도", ang, 0, 360, (v) => onLook({ gradAngle: v === 180 ? undefined : v }), "°")}
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ width: 44, flexShrink: 0, fontSize: 13, color: C.sub, fontWeight: 700 }}>시작</span>
                              <ColorPick value={look.color || "#FFFFFF"} onChange={(c) => onLook({ color: c })} />
                            </div>
                            {bar("투명도", Math.round((look.gradA ?? 0) * 100), 0, 100, (v) => onLook({ gradA: v ? v / 100 : undefined }), "%")}
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ width: 44, flexShrink: 0, fontSize: 13, color: C.sub, fontWeight: 700 }}>끝</span>
                              <ColorPick value={look.gradTo!} onChange={(c) => onLook({ gradTo: c })} />
                            </div>
                            {bar("투명도", Math.round((look.gradB ?? 0) * 100), 0, 100, (v) => onLook({ gradB: v ? v / 100 : undefined }), "%")}
                            {/* 미리 보기 — 바둑판 위에 (투명한 곳이 보이게) */}
                            <div style={{ height: 40, borderRadius: 4, backgroundColor: "#fff", backgroundImage: "linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%),linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%)", backgroundSize: "12px 12px", backgroundPosition: "0 0,6px 6px", overflow: "hidden" }}>
                              <div style={{ width: "100%", height: "100%", backgroundImage: css }} />
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </>
                );
              })()}
              {/* 글자 뒤 상자 · 그림자 · 빛 — 같은 모양: 끄면 닫힘, 켜면 색 · 두께 · 투명도 (2026-10-19 사장님) */}
              {fxRow("글자 뒤 상자", Boolean(look.bg), true, "", (v) => onLook({ bg: v }),
                look.bgColor || "#000000", (c) => onLook({ bgColor: c }),
                Math.round((look.bgPad ?? 1) * 10), 3, 25, (v) => onLook({ bgPad: v === 10 ? undefined : v / 10 }),
                Math.round((1 - (look.bgOpacity ?? 0.62)) * 100), (v) => onLook({ bgOpacity: 1 - v / 100 }))}
              {fxRow("그림자", shadowOn, !look.bg, "글자 뒤 상자를 쓰면 그림자는 안 나와요", (v) => onLook({ shadow: v ? 0.06 : 0 }),
                look.shadowColor || "#000000", (c) => onLook({ shadowColor: c }),
                Math.round(Number(look.shadow || 0.06) * 100), 1, 20, (v) => onLook({ shadow: v / 100 }),
                Math.round((look.shadowAlpha ?? 0) * 100), (v) => onLook({ shadowAlpha: v ? v / 100 : undefined }))}
              {fxRow("빛 (글로우)", Boolean(look.glow), !look.bg, "글자 뒤 상자를 쓰면 빛은 안 나와요",
                (v) => onLook({ glow: v ? look.outline && look.outline.toUpperCase() !== "#000000" ? look.outline : "#22D3EE" : "" }),
                look.glow || "#22D3EE", (c) => onLook({ glow: c }),
                Math.round((look.glowSize ?? 1) * 10), 3, 30, (v) => onLook({ glowSize: v === 10 ? undefined : v / 10 }),
                Math.round((look.glowAlpha ?? 0) * 100), (v) => onLook({ glowAlpha: v ? v / 100 : undefined }))}
              {basicBottom}
            </>
          )}

          {sub === "effect" && (
            <div style={{ ...col, borderBottom: 0 }}>
              {/* 견본은 모두 여기 한 곳 — 기본 · 글꼴 · 상자 · 네온·빛 · 예능·유튜브 · 다큐·뉴스 (2026-10-19 사장님) */}
              <SubPresetGrid value={look} onPick={onPresetLook} groups={[...BASIC_GROUPS, ...EFFECT_GROUPS]} />
            </div>
          )}

          {/* 메인자막은 말풍선 대신 예능 자막 160종 (2026-10-19 사장님) */}
          {sub === "bubble" && kind === "sub" && <VarietyGrid value={look} onPick={(lk) => onPresetLook({ font: "Pretendard", color: "#FFFFFF", outline: "#000000", outlineWidth: 3, bg: false, bgColor: "#000000", bgOpacity: 0.62, bold: true, shadow: 0, shadowColor: "#000000", glow: "", outline2: undefined, outline2Width: 0, gradTo: "", gradType: undefined, gradAngle: undefined, gradA: undefined, gradB: undefined, glowSize: undefined, glowAlpha: undefined, textAlpha: undefined, shadowAlpha: undefined, outlineAlpha: undefined, ...lk } as SubLook)} />}
          {sub === "bubble" && kind !== "sub" && (bubble || (
            <div style={{ padding: 16, fontSize: 13.5, color: C.sub, lineHeight: 1.6 }}>말풍선은 곧 들어가요.</div>
          ))}
        </>
      )}

      {tab === "anim" && anim && <AnimBody {...anim} />}

      {tab === "my" && (
        <div style={{ padding: "14px 16px" }}>
          {/* 사전 설정으로 저장 — 이 탭 맨 위 (2026-10-19 사장님) */}
          {naming !== null ? (
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              <input value={naming} onChange={(e) => setNaming(e.target.value)} placeholder="이름 (예: 가격 강조)" maxLength={20} autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setNaming(null); }} style={{ ...input, flex: 1, minWidth: 0 }} />
              <Btn small primary onClick={save}>저장</Btn>
              <Btn small onClick={() => setNaming(null)}>그만</Btn>
            </div>
          ) : (
            <div style={{ marginBottom: 14 }}>
              <Btn primary onClick={() => setNaming("")} style={{ width: "100%", justifyContent: "center" }}><Icon name="star" size={15} />지금 글자를 사전 설정으로 저장</Btn>
              <div style={{ fontSize: 12, color: C.dim, marginTop: 6 }}>{anim ? "지금 모양과 애니메이션이 함께 담겨요." : "지금 글자 모양이 담겨요. 영상 편집기에서도 같이 써요."}</div>
            </div>
          )}
          {my.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {my.map((pr) => (
                <div key={pr.id} style={{ position: "relative" }}>
                  <LookTile look={pr.look} big title={`${pr.name}${pr.anim ? " · 애니메이션 들어감" : ""} — 누르면 한 번에`} onClick={() => applyMy(pr)} />
                  <div style={{ fontSize: 12, color: C.sub, marginTop: 4, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pr.anim ? "▶ " : ""}{pr.name}</div>
                  <button type="button" title="지우기" onClick={() => removeMy(pr.id)}
                    style={{ position: "absolute", right: 3, top: 3, width: 18, height: 18, borderRadius: 9, border: 0, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 11, lineHeight: "18px", padding: 0, cursor: "pointer" }}>✕</button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13.5, color: C.sub, lineHeight: 1.7 }}>
              아직 저장한 글자가 없어요.<br />
              [텍스트]·[애니메이션]에서 마음에 드는 글자를 만든 뒤 위 <b>[지금 글자를 사전 설정으로 저장]</b>을 누르세요.
            </div>
          )}
          <div style={{ fontSize: 12, color: C.dim, marginTop: 12 }}>▶ 표시는 애니메이션까지 들어 있는 것. 이 PC 에 저장돼요.</div>
        </div>
      )}
    </Side>
  );
}
