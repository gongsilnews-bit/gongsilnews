"use client";

// 타임라인 편집 속성 칸 (캡컷·프리미어처럼, 2026-10-20 사장님) — 텍스트 편집 속성 칸과 따로. 작고 촘촘하게
//  위: 고른 것 이름 + 탭 · [기본] = 변형(크기·위치·회전·진하기, 항목마다 ‹ ◇ › ↺) + 정렬 6 + 시간 + 소리
//  다른 탭은 텍스트 편집의 칸 내용을 그대로 작게 (글꼴·스티커·필터·애니메이션 …)
import React, { useState } from "react";
import type { KfProp } from "./types";
import { C, FONT, Icon } from "./ui";

const FS = 11.5;
const rowS: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, minHeight: 28 };
const lab: React.CSSProperties = { width: 46, flexShrink: 0, fontSize: FS, color: C.sub };
const numIn: React.CSSProperties = { width: 58, height: 22, padding: "0 4px", borderRadius: 3, border: `1px solid ${C.line2}`, background: C.bg, color: C.text, fontSize: FS, fontFamily: FONT, textAlign: "right", fontVariantNumeric: "tabular-nums" };

/** 숫자 칸 — 쓰고 엔터·벗어나면 바꾸기, 위아래 화살표 = 1씩 (Shift = 10씩), 끌어서 바꾸기 */
export function Num({ value, onChange, step = 1, min, max, unit, width, digits = 0 }: { value: number; onChange: (v: number, first: boolean) => void; step?: number; min?: number; max?: number; unit?: string; width?: number; digits?: number }) {
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (v: number) => Math.max(min ?? -1e9, Math.min(max ?? 1e9, v));
  const show = draft ?? (Number.isFinite(value) ? value.toFixed(digits) : "");
  const commit = () => {
    if (draft === null) return;
    const v = Number(draft);
    setDraft(null);
    if (Number.isFinite(v)) onChange(clamp(v), true);
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
      <input value={show} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { commit(); (e.target as HTMLInputElement).blur(); }
          else if (e.key === "Escape") setDraft(null);
          else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            const d = (e.key === "ArrowUp" ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
            setDraft(null);
            onChange(clamp(+(value + d).toFixed(4)), true);
          }
        }}
        style={{ ...numIn, width: width ?? numIn.width }} />
      {unit && <span style={{ fontSize: 10.5, color: C.dim, width: 10 }}>{unit}</span>}
    </span>
  );
}

/** 막대 (작게) — 끄는 동안 되돌리기 한 번 */
function Slim({ value, min, max, step, onChange }: { value: number; min: number; max: number; step: number; onChange: (v: number, first: boolean) => void }) {
  const first = React.useRef(true);
  return <input type="range" min={min} max={max} step={step} value={Math.max(min, Math.min(max, value))} onPointerDown={() => { first.current = true; }}
    onChange={(e) => { onChange(Number(e.target.value), first.current); first.current = false; }} style={{ flex: 1, minWidth: 40, accentColor: C.accent, height: 14 }} />;
}

/** ‹ ◇ › ↺ — 앞 점·이 시각 점 찍기/빼기·다음 점·처음대로 */
function KeyBtns({ any, at, can, onPrev, onToggle, onNext, onReset }: { any: boolean; at: boolean; can: boolean; onPrev: () => void; onToggle: () => void; onNext: () => void; onReset: () => void }) {
  const b = (title: string, node: React.ReactNode, fn: () => void, dis = false, color?: string): React.ReactNode => (
    <button type="button" title={title} onClick={fn} disabled={dis}
      style={{ width: 16, height: 20, padding: 0, border: 0, background: "transparent", color: color || C.sub, opacity: dis ? 0.3 : 1, cursor: dis ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontFamily: FONT }}>{node}</button>
  );
  return (
    <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
      {b("앞 키프레임으로", "‹", onPrev, !any)}
      {b(at ? "이 시각 키프레임 빼기" : can ? "이 시각에 키프레임 찍기 (이 항목만)" : "재생 막대를 고른 것이 나오는 곳에 두세요", <Icon name={at ? "diamondFill" : "diamond"} size={12} />, onToggle, !can, at ? "#fde047" : any ? "#9ec5ff" : undefined)}
      {b("다음 키프레임으로", "›", onNext, !any)}
      {b("처음대로", <Icon name="undo" size={11} />, onReset)}
    </span>
  );
}

export type XfRead = { show: Record<KfProp, number>; any: Record<KfProp, boolean>; at: Record<KfProp, boolean> };

/**
 * 변형 칸 — 크기 · 위치 X·Y · 회전 · 진하기 + 정렬 6
 *  can = 재생 막대가 나오는 구간 안 (점을 찍을 수 있음) · onSet(값, first) · onToggle(항목) · onSeekKey(항목, 방향) · base = 처음대로 값
 */
export function Transform({ rd, can, onSet, onToggle, onSeekKey, base, onAlign, noOpacity, sizeLabel = "크기" }: {
  rd: XfRead;
  can: boolean;
  onSet: (v: Partial<Record<KfProp, number>>, first: boolean) => void;
  onToggle: (q: KfProp) => void;
  onSeekKey: (q: KfProp, dir: -1 | 1) => void;
  base: Record<KfProp, number>;
  onAlign?: (a: "l" | "ch" | "r" | "t" | "cv" | "b") => void;
  noOpacity?: boolean;
  sizeLabel?: string;
}) {
  const kb = (q: KfProp) => <KeyBtns any={rd.any[q]} at={rd.at[q]} can={can} onPrev={() => onSeekKey(q, -1)} onNext={() => onSeekKey(q, 1)} onToggle={() => onToggle(q)} onReset={() => onSet({ [q]: base[q] }, true)} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={rowS}>
        <span style={lab}>{sizeLabel}</span>
        <Slim value={rd.show.s} min={1} max={400} step={1} onChange={(v, f) => onSet({ s: v }, f)} />
        <Num value={rd.show.s} onChange={(v, f) => onSet({ s: v }, f)} min={1} max={2000} unit="%" />
        {kb("s")}
      </div>
      <div style={rowS}>
        <span style={lab}>위치</span>
        <span style={{ fontSize: 10.5, color: C.dim }}>X</span>
        <Num value={rd.show.x} onChange={(v, f) => onSet({ x: v }, f)} step={0.5} digits={1} width={50} />
        <span style={{ fontSize: 10.5, color: C.dim, marginLeft: 4 }}>Y</span>
        <Num value={rd.show.y} onChange={(v, f) => onSet({ y: v }, f)} step={0.5} digits={1} width={50} />
        <span style={{ flex: 1 }} />
        <span title="X 항목">{kb("x")}</span>
      </div>
      <div style={{ ...rowS, justifyContent: "flex-end", marginTop: -4 }}>
        <span style={{ fontSize: 10, color: C.dim, flex: 1, paddingLeft: 52 }}>화면 % (50 = 가운데)</span>
        <span title="Y 항목">{kb("y")}</span>
      </div>
      <div style={rowS}>
        <span style={lab}>회전</span>
        <Slim value={rd.show.r} min={-180} max={180} step={1} onChange={(v, f) => onSet({ r: v }, f)} />
        <Num value={rd.show.r} onChange={(v, f) => onSet({ r: v }, f)} step={1} digits={1} unit="°" />
        {kb("r")}
      </div>
      {!noOpacity && (
        <div style={rowS}>
          <span style={lab}>진하기</span>
          <Slim value={rd.show.o} min={0} max={100} step={1} onChange={(v, f) => onSet({ o: v }, f)} />
          <Num value={rd.show.o} onChange={(v, f) => onSet({ o: v }, f)} min={0} max={100} unit="%" />
          {kb("o")}
        </div>
      )}
      {onAlign && (
        <div style={{ ...rowS, gap: 2, marginTop: 2 }}>
          <span style={lab}>정렬</span>
          {([["l", "tlAlignL", "왼쪽 끝에"], ["ch", "tlAlignCH", "가로 가운데"], ["r", "tlAlignR", "오른쪽 끝에"], ["t", "tlAlignT", "위 끝에"], ["cv", "tlAlignCV", "세로 가운데"], ["b", "tlAlignB", "아래 끝에"]] as const).map(([a, ic, t]) => (
            <button key={a} type="button" title={t} onClick={() => onAlign(a)}
              style={{ width: 26, height: 22, padding: 0, border: `1px solid ${C.line2}`, borderRadius: 3, background: "transparent", color: C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={ic} size={14} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** 시간 — 시작·길이·끝 (초) */
export function TimeBox({ s, e, total, onChange, lenOnly }: { s: number; e: number; total: number; onChange?: (s: number, e: number) => void; lenOnly?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {!lenOnly && (
        <div style={rowS}>
          <span style={lab}>시작</span>
          <Num value={s} digits={2} step={0.1} min={0} max={total} unit="초" onChange={(v) => onChange?.(v, v + (e - s))} />
          <span style={{ ...lab, width: 30, marginLeft: 6 }}>끝</span>
          <Num value={e} digits={2} step={0.1} min={0} max={total} unit="초" onChange={(v) => onChange?.(s, Math.max(s + 0.1, v))} />
        </div>
      )}
      <div style={rowS}>
        <span style={lab}>길이</span>
        <Num value={e - s} digits={2} step={0.1} min={0.1} unit="초" onChange={(v) => onChange?.(s, s + Math.max(0.1, v))} />
      </div>
    </div>
  );
}

/** 섹션 (접기) */
export function Sec({ title, children, right, open = true }: { title: string; children: React.ReactNode; right?: React.ReactNode; open?: boolean }) {
  const [o, setO] = useState(open);
  return (
    <div style={{ borderBottom: `1px solid ${C.line}`, padding: "7px 10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: o ? 5 : 0 }}>
        <button type="button" onClick={() => setO(!o)} style={{ display: "flex", alignItems: "center", gap: 4, padding: 0, border: 0, background: "transparent", color: C.text, fontSize: 12, fontWeight: 800, fontFamily: FONT, cursor: "pointer" }}>
          <span style={{ display: "flex", transform: o ? "rotate(90deg)" : undefined, color: C.dim }}><Icon name="chevron" size={11} /></span>{title}
        </button>
        <span style={{ flex: 1 }} />
        {right}
      </div>
      {o && children}
    </div>
  );
}

/** 막대 한 줄 (이름 · 막대 · 숫자) — 소리 크기 등 */
export function SlimRow({ label, value, min, max, step, unit, digits = 0, onChange }: { label: string; value: number; min: number; max: number; step: number; unit?: string; digits?: number; onChange: (v: number, first: boolean) => void }) {
  return (
    <div style={rowS}>
      <span style={lab}>{label}</span>
      <Slim value={value} min={min} max={max} step={step} onChange={onChange} />
      <Num value={value} onChange={onChange} min={min} max={max} step={step} unit={unit} digits={digits} />
    </div>
  );
}

/** 칩 단추 (작게) */
export function Chip({ on, children, onClick, title }: { on?: boolean; children: React.ReactNode; onClick: () => void; title?: string }) {
  return (
    <button type="button" onClick={onClick} title={title}
      style={{ height: 24, padding: "0 8px", borderRadius: 3, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent", color: on ? "#fff" : C.text, fontSize: FS, fontWeight: 600, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}>{children}</button>
  );
}

/**
 * 속성 칸 틀 — 제목 · 탭 · 내용. tabs[i].embed = 텍스트 편집 칸을 작게 그대로 (zoom)
 */
export function PropsFrame({ title, icon, tabs, empty, onClose }: { title: string; icon: string; tabs: { id: string; label: string; node: React.ReactNode; embed?: boolean }[]; empty?: boolean; onClose?: () => void }) {
  const [tab, setTab] = useState(tabs[0]?.id || "");
  const cur = tabs.find((t) => t.id === tab) || tabs[0];
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", minHeight: 0, background: C.panel, color: C.text, fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, height: 30, padding: "0 10px", borderBottom: `1px solid ${C.line}`, flexShrink: 0 }}>
        <span style={{ display: "flex", color: C.sub }}><Icon name={icon} size={14} /></span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
        {onClose && <button type="button" onClick={onClose} title="고르기 풀기" style={{ border: 0, background: "transparent", color: C.dim, cursor: "pointer", display: "flex" }}><Icon name="close" size={14} /></button>}
      </div>
      {empty ? (
        <div style={{ padding: 16, fontSize: 12, color: C.dim, lineHeight: 1.7 }}>타임라인이나 미리보기에서 클립·글자·그래픽·자막·소리를 누르면 여기에 속성이 나와요.<br />Ctrl 을 누르고 누르면 여러 개를 고를 수 있어요.</div>
      ) : (
        <>
          {tabs.length > 1 && (
            <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.line}`, flexShrink: 0, overflowX: "auto" }}>
              {tabs.map((t) => (
                <button key={t.id} type="button" onClick={() => setTab(t.id)}
                  style={{ height: 28, padding: "0 10px", border: 0, borderBottom: `2px solid ${cur?.id === t.id ? C.accent : "transparent"}`, background: "transparent", color: cur?.id === t.id ? C.text : C.sub, fontSize: 11.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" }}>{t.label}</button>
              ))}
            </div>
          )}
          <div style={{ flex: 1, minHeight: 0, overflowY: cur?.embed ? "hidden" : "auto", display: "flex", flexDirection: "column" }}>
            {cur?.embed ? <Embed>{cur.node}</Embed> : cur?.node}
          </div>
        </>
      )}
    </div>
  );
}

/** 텍스트 편집 칸(380px)을 작게 그대로 넣기 — 전문가용 촘촘한 크기 */
export const EMBED_ZOOM = 0.84;
export function Embed({ children, noHead }: { children: React.ReactNode; noHead?: boolean }) {
  return (
    <div className={noHead ? "gsv-embed nohead" : "gsv-embed"} style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
      <style>{`.gsv-embed > div > aside { width: 100% !important; border-left: 0 !important; height: 100%; } .gsv-embed.nohead > div > aside > div:first-child { display: none !important; }`}</style>
      <div style={{ zoom: EMBED_ZOOM, width: "100%", height: "100%", display: "flex" } as React.CSSProperties}>{children}</div>
    </div>
  );
}
