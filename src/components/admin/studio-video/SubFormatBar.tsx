"use client";

// [서식] 탭 줄 — 브루처럼 메인자막 서식만 한 줄에 (2026-10-19 사장님)
//  서식 지우기 · 저장된 서식 · B · I · 글꼴 · 크기 · 색 | 테두리 · 배경 · 그림자 · 빛 · 간격 | 고급 | 위치 | 효과
//  여기서 바꾸면 모든 클립 자막에 (클립마다 따로 바꾼 같은 항목도 덮는다). 자세한 것은 [고급] = 오른쪽 메인자막 칸
import React, { useEffect, useRef, useState } from "react";
import type { Ratio, SubtitleSettings } from "./types";
import { autoSubPosition } from "./types";
import { C, FONT, Icon, Toggle } from "./ui";
import { ColorPick, FontPick } from "./Pickers";
import { effLeading, effSpacing } from "./timeline";
import { loadMyPresets, type MyPreset } from "./SubPresets";
import { DEFAULT_FONT } from "@/lib/studio-video/fonts";

type Sub = SubtitleSettings;
type Patch = Partial<Sub>;
/** 서식 지우기 — 처음 모양 (흰 글자 · 검은 테두리) */
export const PLAIN_LOOK: Patch = {
  font: "Pretendard", color: "#FFFFFF", outline: "#000000", outlineWidth: 3, bg: false, bgColor: "#000000", bgOpacity: 0.62, bold: true, shadow: 0, shadowColor: "#000000", glow: "",
  outline2: undefined, outline2Width: 0, gradTo: "", gradType: undefined, gradAngle: undefined, gradA: undefined, gradB: undefined,
  italic: undefined, underline: undefined, textCase: undefined, spacing: undefined, leading: undefined, align: undefined, bgPad: undefined, shadowAlpha: undefined, glowSize: undefined, glowAlpha: undefined, outlineAlpha: undefined, textAlpha: undefined,
} as Patch;

const POS: [Sub["position"], string][] = [["top", "상단"], ["middle-high", "중상단"], ["middle", "중단"], ["middle-low", "중하단"], ["bottom", "하단"]];

/** 단추를 누르면 바로 아래에 뜨는 작은 칸 (줄이 가로로 굴러가도 잘리지 않게 화면 기준 자리) */
function Drop({ icon, label, on, children, width = 260 }: { icon: string; label: string; on?: boolean; children: React.ReactNode; width?: number }) {
  const [open, setOpen] = useState<DOMRect | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (box.current?.contains(t) || btn.current?.contains(t)) return;
      // 색 고르기 등 칸 안에서 띄운 작은 창은 닫지 않는다
      if ((t as HTMLElement).closest?.("[data-keep-drop]")) return;
      setOpen(null);
    };
    window.addEventListener("pointerdown", down, true);
    return () => window.removeEventListener("pointerdown", down, true);
  }, [open]);
  return (
    <>
      <button ref={btn} type="button" onClick={(e) => setOpen(open ? null : e.currentTarget.getBoundingClientRect())}
        style={{ ...btnS, borderColor: on ? C.accent : C.line2, background: open ? C.cardHover : on ? C.accentDim : C.card }}>
        <Icon name={icon} size={16} />{label}<span style={{ fontSize: 10, color: C.sub }}>▼</span>
      </button>
      {open && (
        <div ref={box} data-keep-drop="" style={{ position: "fixed", left: Math.min(open.left, window.innerWidth - width - 12), top: open.bottom + 6, width, zIndex: 80, padding: 12, background: C.panel, border: `1px solid ${C.line2}`, borderRadius: 8, boxShadow: "0 12px 32px rgba(0,0,0,0.5)", fontFamily: FONT, color: C.text, display: "flex", flexDirection: "column", gap: 10 }}>
          {children}
        </div>
      )}
    </>
  );
}
const btnS: React.CSSProperties = { height: 34, display: "flex", alignItems: "center", gap: 6, padding: "0 10px", borderRadius: 6, border: `1px solid ${C.line2}`, background: C.card, color: C.text, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 };
function Bar({ name, v, min, max, set, unit = "" }: { name: string; v: number; min: number; max: number; set: (x: number) => void; unit?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 46, flexShrink: 0, fontSize: 12.5, color: C.sub, fontWeight: 700 }}>{name}</span>
      <input type="range" min={min} max={max} step={1} value={v} onChange={(e) => set(Number(e.target.value))} style={{ flex: 1, minWidth: 0, accentColor: C.accent }} />
      <span style={{ width: 38, textAlign: "right", fontSize: 12.5 }}>{v}{unit}</span>
    </div>
  );
}
const Row = ({ title, on, set }: { title: string; on: boolean; set: (v: boolean) => void }) => (
  <div style={{ display: "flex", alignItems: "center" }}><span style={{ flex: 1, fontSize: 13.5, fontWeight: 800 }}>{title}</span><Toggle on={on} onChange={set} /></div>
);

export function SubFormatBar({ sub, ratio, pxPer100, onPatch, onMore, onAnim, onPresets }: {
  sub: Sub;
  ratio: Ratio;
  pxPer100: number;
  /** 모든 클립 자막에 — first: 되돌리기 한 칸 새로 */
  onPatch: (p: Patch, first?: boolean) => void;
  onMore: () => void; // [고급] — 오른쪽 메인자막 칸
  onAnim: () => void; // [효과] — 메인자막 애니메이션
  onPresets: () => void; // 저장된 서식 › 더 보기 (사전설정 탭)
}) {
  const px = Math.round(((sub.size || 100) / 100) * pxPer100);
  const toPct = (v: number) => Math.max(40, Math.min(260, Math.round((v / pxPer100) * 100)));
  const [draft, setDraft] = useState(String(px));
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setDraft(String(px)), [px]);
  const commit = () => { const v = Number(draft); if (v > 0) onPatch({ size: toPct(v) }, true); else setDraft(String(px)); };
  const [my, setMy] = useState<MyPreset[]>([]);
  const canBold = !sub.font || sub.font === DEFAULT_FONT;
  const sq = (on: boolean, title: string, go: () => void, child: React.ReactNode, ok = true): React.ReactNode => (
    <button type="button" title={title} onClick={go} disabled={!ok}
      style={{ ...btnS, width: 34, padding: 0, justifyContent: "center", fontFamily: "Georgia, serif", fontSize: 16, borderColor: on ? C.text : C.line2, background: on ? C.text : C.card, color: on ? C.bg : ok ? C.text : C.dim, opacity: ok ? 1 : 0.45 }}>{child}</button>
  );
  const sep = <span style={{ width: 1, alignSelf: "stretch", margin: "8px 4px", background: C.line, flexShrink: 0 }} />;
  const outlineOn = Number(sub.outlineWidth ?? 3) > 0;
  const shadowOn = Number(sub.shadow) > 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 4px" }}>
      <button type="button" onClick={() => onPatch(PLAIN_LOOK, true)} title="서식 지우기 — 처음 모양으로 (흰 글자 · 검은 테두리)" style={{ ...btnS }}><Icon name="undo" size={16} />서식 지우기</button>
      <span onPointerDown={() => setMy(loadMyPresets())}>
        <Drop icon="star" label="저장된 서식" width={240}>
          <div style={{ fontSize: 12.5, color: C.sub, fontWeight: 700 }}>내가 저장한 서식</div>
          {my.length ? my.slice(0, 12).map((pr) => (
            <button key={pr.id} type="button" onClick={() => onPatch({ ...PLAIN_LOOK, ...(pr.look as Patch), anim: pr.anim } as Patch, true)}
              style={{ ...btnS, justifyContent: "flex-start" }}>{pr.anim ? "▶ " : ""}{pr.name}</button>
          )) : <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.6 }}>아직 없어요. [고급] › 사전설정 탭에서 지금 서식을 저장할 수 있어요.</div>}
          <button type="button" onClick={onPresets} style={{ ...btnS, justifyContent: "center", color: C.sub }}>사전설정 견본 더 보기 ›</button>
        </Drop>
      </span>
      {sep}
      {sq(sub.bold !== false && canBold, canBold ? "굵게" : "이 글꼴은 굵기가 하나예요", () => onPatch({ bold: sub.bold === false }, true), <b>B</b>, canBold)}
      {sq(Boolean(sub.italic), "기울임", () => onPatch({ italic: !sub.italic || undefined }, true), <i>I</i>)}
      <div style={{ width: 180, flexShrink: 0 }}><FontPick value={sub.font} onChange={(f) => onPatch({ font: f }, true)} /></div>
      <div title="글자 크기" style={{ ...btnS, gap: 0, padding: "0 4px", cursor: "default" }}>
        <Icon name="font" size={15} color={C.sub} />
        <button type="button" onClick={() => onPatch({ size: toPct(px - 2) }, true)} style={{ width: 22, height: 30, border: 0, background: "transparent", color: C.sub, fontSize: 16, cursor: "pointer" }}>−</button>
        <input value={draft} onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))} onBlur={commit} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") commit(); }}
          style={{ width: 38, height: 28, border: 0, background: "transparent", color: C.text, textAlign: "center", fontSize: 14, fontWeight: 700, fontFamily: FONT }} />
        <button type="button" onClick={() => onPatch({ size: toPct(px + 2) }, true)} style={{ width: 22, height: 30, border: 0, background: "transparent", color: C.sub, fontSize: 16, cursor: "pointer" }}>+</button>
      </div>
      <div title="글자 색" data-keep-drop="" style={{ flexShrink: 0 }}><ColorPick value={sub.color || "#FFFFFF"} onChange={(c) => onPatch({ color: c }, true)} /></div>
      {sep}
      <Drop icon="pen" label="테두리" on={outlineOn && !sub.bg}>
        <Row title="테두리" on={outlineOn} set={(v) => onPatch({ outlineWidth: v ? 3 : 0 }, true)} />
        {outlineOn && <>
          <ColorPick value={sub.outline || "#000000"} onChange={(c) => onPatch({ outline: c }, true)} />
          <Bar name="두께" v={Math.round(Number(sub.outlineWidth ?? 3)) || 3} min={1} max={12} set={(v) => onPatch({ outlineWidth: v }, false)} />
          <Bar name="투명도" v={Math.round((sub.outlineAlpha ?? 0) * 100)} min={0} max={90} unit="%" set={(v) => onPatch({ outlineAlpha: v ? v / 100 : undefined }, false)} />
        </>}
        {sub.bg && <div style={{ fontSize: 12, color: C.dim }}>배경 상자를 쓰면 테두리는 안 나와요.</div>}
      </Drop>
      <Drop icon="fill" label="배경" on={Boolean(sub.bg)}>
        <Row title="글자 뒤 상자" on={Boolean(sub.bg)} set={(v) => onPatch({ bg: v }, true)} />
        {sub.bg && <>
          <ColorPick value={sub.bgColor || "#000000"} onChange={(c) => onPatch({ bgColor: c }, true)} />
          <Bar name="여백" v={Math.round((sub.bgPad ?? 1) * 10)} min={3} max={25} set={(v) => onPatch({ bgPad: v === 10 ? undefined : v / 10 }, false)} />
          <Bar name="투명도" v={Math.round((1 - (sub.bgOpacity ?? 0.62)) * 100)} min={0} max={90} unit="%" set={(v) => onPatch({ bgOpacity: 1 - v / 100 }, false)} />
        </>}
      </Drop>
      <Drop icon="layers" label="그림자" on={shadowOn && !sub.bg}>
        <Row title="그림자" on={shadowOn} set={(v) => onPatch({ shadow: v ? 0.06 : 0 }, true)} />
        {shadowOn && <>
          <ColorPick value={sub.shadowColor || "#000000"} onChange={(c) => onPatch({ shadowColor: c }, true)} />
          <Bar name="크기" v={Math.round(Number(sub.shadow || 0.06) * 100)} min={1} max={20} set={(v) => onPatch({ shadow: v / 100 }, false)} />
          <Bar name="투명도" v={Math.round((sub.shadowAlpha ?? 0) * 100)} min={0} max={90} unit="%" set={(v) => onPatch({ shadowAlpha: v ? v / 100 : undefined }, false)} />
        </>}
      </Drop>
      <Drop icon="star" label="빛" on={Boolean(sub.glow) && !sub.bg}>
        <Row title="빛 (글로우)" on={Boolean(sub.glow)} set={(v) => onPatch({ glow: v ? (sub.outline && sub.outline.toUpperCase() !== "#000000" ? sub.outline : "#22D3EE") : "" }, true)} />
        {sub.glow && <>
          <ColorPick value={sub.glow || "#22D3EE"} onChange={(c) => onPatch({ glow: c }, true)} />
          <Bar name="크기" v={Math.round((sub.glowSize ?? 1) * 10)} min={3} max={30} set={(v) => onPatch({ glowSize: v === 10 ? undefined : v / 10 }, false)} />
          <Bar name="투명도" v={Math.round((sub.glowAlpha ?? 0) * 100)} min={0} max={90} unit="%" set={(v) => onPatch({ glowAlpha: v ? v / 100 : undefined }, false)} />
        </>}
      </Drop>
      <Drop icon="alignC" label="간격">
        <Row title="문자 간격 자동" on={typeof sub.spacing !== "number"} set={(v) => onPatch({ spacing: v ? undefined : effSpacing(sub) }, true)} />
        {typeof sub.spacing === "number" && <Bar name="문자" v={Math.round(effSpacing(sub) * 100)} min={-10} max={50} set={(v) => onPatch({ spacing: v / 100 }, false)} />}
        <Row title="줄 간격 자동" on={typeof sub.leading !== "number"} set={(v) => onPatch({ leading: v ? undefined : effLeading(sub) }, true)} />
        {typeof sub.leading === "number" && <Bar name="줄" v={Math.round((effLeading(sub) / 1.25) * 100) - 100} min={-28} max={100} set={(v) => onPatch({ leading: Math.round(1.25 * (100 + v)) / 100 }, false)} />}
        <div style={{ display: "flex", gap: 6 }}>
          {([["left", "alignL"], ["center", "alignC"], ["right", "alignR"]] as const).map(([a, ic]) => {
            const on = (sub.align || "center") === a;
            return <button key={a} type="button" onClick={() => onPatch({ align: a === "center" ? undefined : a }, true)} title={{ left: "왼쪽 정렬", center: "가운데 정렬", right: "오른쪽 정렬" }[a]}
              style={{ ...btnS, flex: 1, justifyContent: "center", borderColor: on ? C.text : C.line2, background: on ? C.text : C.card, color: on ? C.selText : C.text }}><Icon name={ic} size={16} /></button>;
          })}
        </div>
      </Drop>
      {sep}
      <button type="button" onClick={onMore} title="메인자막 칸 — 패턴·대소문자·사전설정 등 모두" style={btnS}><Icon name="gear" size={16} />고급</button>
      {sep}
      <Drop icon="sub" label="위치" width={220}>
        <Row title="자동 (영상 비율에 맞게)" on={sub.posAuto !== false && sub.x === undefined} set={(v) => onPatch(v ? { posAuto: true, position: autoSubPosition(ratio), x: undefined, y: undefined } : { posAuto: false }, true)} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {POS.map(([v, t]) => {
            const on = sub.posAuto === false && sub.x === undefined && sub.position === v;
            return <button key={v} type="button" onClick={() => onPatch({ position: v, posAuto: false, x: undefined, y: undefined }, true)}
              style={{ ...btnS, justifyContent: "center", borderColor: on ? C.text : C.line2, background: on ? C.text : C.card, color: on ? C.selText : C.text }}>{t}</button>;
          })}
        </div>
        <div style={{ fontSize: 12, color: C.dim }}>미리보기에서 자막을 끌어 옮길 수도 있어요.</div>
      </Drop>
      {sep}
      {/* 한 화면 최대 줄 수 — 넘으면 그 줄 수씩 말하는 때에 맞춰 넘긴다 (2026-10-19 사장님) */}
      <Drop icon="sub" label={sub.maxLines ? `최대 ${sub.maxLines}줄` : sub.length === "short" ? "최대 1줄" : "줄 수"} width={240}>
        <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6 }}>자막 한 화면에 최대 몇 줄까지 보일까요? 넘는 자막은 이 줄 수씩 말하는 때에 맞춰 넘어가요.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          {([1, 2, 3] as const).map((n) => {
            const on = (sub.maxLines || (sub.length === "short" ? 1 : 0)) === n;
            return <button key={n} type="button" onClick={() => onPatch({ maxLines: n, length: n === 1 ? "short" : "long" }, true)}
              style={{ ...btnS, justifyContent: "center", borderColor: on ? C.text : C.line2, background: on ? C.text : C.card, color: on ? C.selText : C.text }}>{n}줄</button>;
          })}
        </div>
      </Drop>
      {sep}
      <button type="button" onClick={onAnim} title="메인자막 애니메이션 — 인·아웃·반복·단어·줄" style={btnS}><Icon name="transition" size={16} />효과</button>
    </div>
  );
}
