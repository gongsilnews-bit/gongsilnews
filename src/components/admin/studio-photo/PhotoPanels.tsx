"use client";

// 이미지 편집 — 오른쪽 칸: 글자(영상 편집기 글자 칸 그대로, 애니메이션 빼고) · 사진/도형 속성 · 효과(포토샵 레이어 스타일 빠른판) · 문서 · 그래픽
import React, { useEffect, useState } from "react";
import type { BlendMode, LayerEffectsInfo } from "ag-psd";
import { Btn, C, FONT, Icon, Toggle, input, label } from "@/components/admin/studio-video/ui";
import { ColorPick } from "@/components/admin/studio-video/Pickers";
import { Side } from "@/components/admin/studio-video/Panels";
import { TextTabs } from "@/components/admin/studio-video/TextTabs";
import { CATS, stickerThumb, type Sticker } from "@/components/admin/studio-video/Stickers";
import type { SubLook, TextLook } from "@/components/admin/studio-video/SubPresets";
import { pictoCanvas, PICTOS, type PictoStyle } from "./pictos";
import { FX_DEFAULT, applyResize, boundsOf, flipLayer, hasAdjust, hexToRgb, isText, lookOf, offsetLayer, rgbToHex, shapeCanvas, type Box, type Doc, type PLayer } from "./model";

export type Mutate = (fn: () => void, key?: string) => void;
type Look = TextLook & { text: string; px: number };

const row: React.CSSProperties = { padding: "12px 16px", borderBottom: `1px solid ${C.line}` };
const col: React.CSSProperties = { ...row, display: "flex", flexDirection: "column", gap: 8 };

/** 숫자 칸 (Enter·바깥 누르면 적용) */
function Num({ title, value, onChange, min = -99999, max = 99999, suffix }: { title: string; value: number; onChange: (v: number) => void; min?: number; max?: number; suffix?: string }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
      <span style={{ width: 16, fontSize: 12.5, color: C.sub, fontWeight: 700, flexShrink: 0 }}>{title}</span>
      <input key={value} defaultValue={Math.round(value)}
        onBlur={(e) => { const n = Number(e.target.value.replace(/[^0-9.-]/g, "")); if (e.target.value.trim() && Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n))); else e.target.value = String(Math.round(value)); }}
        onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        style={{ ...input, height: 32, fontSize: 13.5, padding: "0 8px", minWidth: 0 }} />
      {suffix && <span style={{ fontSize: 12, color: C.dim }}>{suffix}</span>}
    </label>
  );
}
function Bar({ name, v, min, max, set, unit }: { name: string; v: number; min: number; max: number; set: (x: number) => void; unit?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 52, flexShrink: 0, fontSize: 13, color: C.sub, fontWeight: 700 }}>{name}</span>
      <input type="range" min={min} max={max} step={1} value={v} onChange={(e) => set(Number(e.target.value))} style={{ flex: 1, minWidth: 0, accentColor: C.accent }} />
      <span style={{ width: 44, textAlign: "right", fontSize: 12.5, color: C.text }}>{v}{unit || ""}</span>
    </div>
  );
}

const BLENDS: [BlendMode, string][] = [
  ["normal", "표준"], ["multiply", "곱하기"], ["screen", "스크린"], ["overlay", "오버레이"], ["soft light", "소프트 라이트"], ["hard light", "하드 라이트"],
  ["darken", "어둡게 하기"], ["lighten", "밝게 하기"], ["color dodge", "색상 닷지"], ["color burn", "색상 번"], ["linear dodge", "선형 닷지(추가)"],
  ["difference", "차이"], ["exclusion", "제외"], ["hue", "색조"], ["saturation", "채도"], ["color", "색상"], ["luminosity", "광도"],
];

/** 변형 · 맞춤 · 불투명도 · 혼합 (모든 레이어 공통) */
export function CommonProps({ doc, l, mutate }: { doc: Doc; l: PLayer; mutate: Mutate }) {
  const b = boundsOf(l);
  const [lockRatio, setLockRatio] = useState(true);
  const locked = Boolean(l.protected?.position);
  const resize = (box: Box) => mutate(() => applyResize(l, box));
  const move = (x: number, y: number) => mutate(() => {
    const bb = boundsOf(l);
    if (bb) offsetLayer(l, Math.round(x - bb.x), Math.round(y - bb.y));
  });
  const W = doc.psd.width, H = doc.psd.height;
  const al = (fn: (bb: Box) => [number, number]) => () => { if (b) { const [x, y] = fn(b); move(x, y); } };
  const ab = (title: string, ic: React.ReactNode, go: () => void) => (
    <button type="button" title={title} onClick={go} disabled={locked}
      style={{ flex: 1, height: 32, border: `1px solid ${C.line2}`, borderRadius: 5, background: "transparent", color: C.text, cursor: locked ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{ic}</button>
  );
  const svgA = (d: string) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d={d} /></svg>;
  return (
    <>
      {b && !l.children && (
        <div style={col}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ ...label, flex: 1 }}>변형</span>
            {!isText(l) && (
              <button type="button" onClick={() => setLockRatio(!lockRatio)} title="가로세로 비율 묶기"
                style={{ height: 26, padding: "0 10px", borderRadius: 5, border: `1px solid ${lockRatio ? C.sel : C.line2}`, background: lockRatio ? C.sel : "transparent", color: lockRatio ? C.selText : C.sub, fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>비율 묶기</button>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Num title="X" value={b.x} onChange={(x) => move(x, b.y)} />
            <Num title="Y" value={b.y} onChange={(y) => move(b.x, y)} />
            <Num title="W" value={b.w} min={1} onChange={(w) => resize({ ...b, w, h: lockRatio || isText(l) ? (b.h * w) / b.w : b.h })} />
            <Num title="H" value={b.h} min={1} onChange={(h) => resize({ ...b, h, w: lockRatio || isText(l) ? (b.w * h) / b.h : b.w })} />
          </div>
          {!isText(l) && (
            <div style={{ display: "flex", gap: 6 }}>
              <Btn small onClick={() => mutate(() => flipLayer(l, true))} disabled={locked}><Icon name="flipH" size={15} />좌우 뒤집기</Btn>
              <Btn small onClick={() => mutate(() => flipLayer(l, false))} disabled={locked}><Icon name="flipV" size={15} />상하 뒤집기</Btn>
            </div>
          )}
        </div>
      )}
      {b && (
        <div style={col}>
          <span style={label}>맞춤 <span style={{ color: C.sub, fontWeight: 600, fontSize: 13 }}>· 캔버스에</span></span>
          <div style={{ display: "flex", gap: 4 }}>
            {ab("왼쪽 맞춤", svgA("M4 3v18M8 7h12v4H8zM8 13h7v4H8z"), al((bb) => [0, bb.y]))}
            {ab("가로 가운데", svgA("M12 3v18M5 7h14v4H5zM8 13h8v4H8z"), al((bb) => [(W - bb.w) / 2, bb.y]))}
            {ab("오른쪽 맞춤", svgA("M20 3v18M4 7h12v4H4zM9 13h7v4H9z"), al((bb) => [W - bb.w, bb.y]))}
            {ab("위쪽 맞춤", svgA("M3 4h18M7 8v12h4V8zM13 8v7h4V8z"), al((bb) => [bb.x, 0]))}
            {ab("세로 가운데", svgA("M3 12h18M7 5v14h4V5zM13 8v8h4V8z"), al((bb) => [bb.x, (H - bb.h) / 2]))}
            {ab("아래쪽 맞춤", svgA("M3 20h18M7 4v12h4V4zM13 9v7h4V9z"), al((bb) => [bb.x, H - bb.h]))}
          </div>
        </div>
      )}
      <div style={col}>
        <Bar name="불투명도" v={Math.round((l.opacity ?? 1) * 100)} min={0} max={100} unit="%" set={(v) => mutate(() => { l.opacity = v / 100; }, `op:${l._k}`)} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 52, flexShrink: 0, fontSize: 13, color: C.sub, fontWeight: 700 }}>혼합</span>
          <select value={l.blendMode || "normal"} onChange={(e) => mutate(() => { l.blendMode = e.target.value as BlendMode; })}
            style={{ ...input, height: 32, fontSize: 13.5, flex: 1 }}>
            {l.children && <option value="pass through">통과</option>}
            {BLENDS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            {l.blendMode && !BLENDS.some(([v]) => v === l.blendMode) && l.blendMode !== "pass through" && <option value={l.blendMode}>{l.blendMode}</option>}
          </select>
        </div>
      </div>
    </>
  );
}

/** 효과 — 포토샵 [레이어 스타일]의 빠른판: 획 · 드롭 섀도 · 외부 광선 · 색상 오버레이 */
export function EffectsPanel({ l, mutate }: { l: PLayer; mutate: Mutate }) {
  const fx: LayerEffectsInfo = l.effects || {};
  const set = (fn: (f: LayerEffectsInfo) => void, key?: string) => mutate(() => {
    const f: LayerEffectsInfo = { ...(l.effects || {}) };
    fn(f);
    l.effects = Object.keys(f).filter((k) => k !== "disabled" && k !== "scale").length ? f : undefined;
  }, key);
  const sec = (title: string, on: boolean, toggle: (v: boolean) => void, body: React.ReactNode) => (
    <div style={{ ...col, gap: on ? 10 : 0 }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <span style={{ ...label, flex: 1 }}>{title}</span>
        <Toggle on={on} onChange={toggle} />
      </div>
      {on && body}
    </div>
  );
  const st = fx.stroke?.[0], sh = fx.dropShadow?.[0], gl = fx.outerGlow, sf = fx.solidFill?.[0];
  const k = l._k;
  return (
    <>
      {sec("획 (테두리)", Boolean(st && st.enabled !== false), (v) => set((f) => { f.stroke = v ? [st ? { ...st, enabled: true } : FX_DEFAULT.stroke()] : undefined; }), st && (
        <>
          <ColorPick value={rgbToHex(st.color)} onChange={(c) => set((f) => { f.stroke = [{ ...st, color: hexToRgb(c) }]; })} />
          <Bar name="두께" v={Math.round(st.size?.value || 1)} min={1} max={80} unit="px" set={(v) => set((f) => { f.stroke = [{ ...st, size: { units: "Pixels", value: v } }]; }, `st:${k}`)} />
          <Bar name="불투명도" v={Math.round((st.opacity ?? 1) * 100)} min={0} max={100} unit="%" set={(v) => set((f) => { f.stroke = [{ ...st, opacity: v / 100 }]; }, `sto:${k}`)} />
        </>
      ))}
      {sec("드롭 섀도 (그림자)", Boolean(sh && sh.enabled !== false), (v) => set((f) => { f.dropShadow = v ? [sh ? { ...sh, enabled: true } : FX_DEFAULT.dropShadow()] : undefined; }), sh && (
        <>
          <ColorPick value={rgbToHex(sh.color)} onChange={(c) => set((f) => { f.dropShadow = [{ ...sh, color: hexToRgb(c) }]; })} />
          <Bar name="거리" v={Math.round(sh.distance?.value || 0)} min={0} max={200} unit="px" set={(v) => set((f) => { f.dropShadow = [{ ...sh, distance: { units: "Pixels", value: v } }]; }, `shd:${k}`)} />
          <Bar name="크기" v={Math.round(sh.size?.value || 0)} min={0} max={150} unit="px" set={(v) => set((f) => { f.dropShadow = [{ ...sh, size: { units: "Pixels", value: v } }]; }, `shs:${k}`)} />
          <Bar name="각도" v={Math.round(sh.angle ?? 120)} min={-180} max={180} unit="°" set={(v) => set((f) => { f.dropShadow = [{ ...sh, angle: v }]; }, `sha:${k}`)} />
          <Bar name="불투명도" v={Math.round((sh.opacity ?? 0.75) * 100)} min={0} max={100} unit="%" set={(v) => set((f) => { f.dropShadow = [{ ...sh, opacity: v / 100 }]; }, `sho:${k}`)} />
        </>
      ))}
      {sec("외부 광선 (빛)", Boolean(gl && gl.enabled !== false), (v) => set((f) => { f.outerGlow = v ? (gl ? { ...gl, enabled: true } : FX_DEFAULT.outerGlow()) : undefined; }), gl && (
        <>
          <ColorPick value={rgbToHex(gl.color)} onChange={(c) => set((f) => { f.outerGlow = { ...gl, color: hexToRgb(c) }; })} />
          <Bar name="크기" v={Math.round(gl.size?.value || 0)} min={1} max={150} unit="px" set={(v) => set((f) => { f.outerGlow = { ...gl, size: { units: "Pixels", value: v } }; }, `gls:${k}`)} />
          <Bar name="불투명도" v={Math.round((gl.opacity ?? 0.75) * 100)} min={0} max={100} unit="%" set={(v) => set((f) => { f.outerGlow = { ...gl, opacity: v / 100 }; }, `glo:${k}`)} />
        </>
      ))}
      {sec("색상 오버레이", Boolean(sf && sf.enabled !== false), (v) => set((f) => { f.solidFill = v ? [sf ? { ...sf, enabled: true } : FX_DEFAULT.solidFill()] : undefined; }), sf && (
        <>
          <ColorPick value={rgbToHex(sf.color)} onChange={(c) => set((f) => { f.solidFill = [{ ...sf, color: hexToRgb(c) }]; })} />
          <Bar name="불투명도" v={Math.round((sf.opacity ?? 1) * 100)} min={0} max={100} unit="%" set={(v) => set((f) => { f.solidFill = [{ ...sf, opacity: v / 100 }]; }, `sfo:${k}`)} />
        </>
      ))}
      {(fx.innerShadow?.length || fx.innerGlow || fx.bevel || fx.satin || fx.gradientOverlay?.length || fx.patternOverlay) ? (
        <div style={{ ...row, fontSize: 12.5, color: C.dim, lineHeight: 1.6 }}>이 레이어에는 포토샵에서 넣은 다른 효과(내부 그림자·경사와 엠보스 등)도 있어요. 저장하면 그대로 남아요 (미리보기에는 안 보여요).</div>
      ) : null}
    </>
  );
}

/** 글자 레이어 — 영상 편집기 글자 칸 (애니메이션 탭 없이) */
export function TextPanel({ doc, l, mutate, onClose, apply }: { doc: Doc; l: PLayer; mutate: Mutate; onClose: () => void; apply: (l: PLayer, look: Look) => void }) {
  const look = lookOf(l);
  const set = (patch: TextLook, key?: string) => mutate(() => {
    const { size, ...rest } = patch;
    const next: Look = { ...look, ...rest };
    if (typeof size === "number") next.px = size;
    apply(l, next);
  }, key);
  return (
    <TextTabs title="글자" kind="photo" look={{ ...look, size: look.px }} onClose={onClose}
      onLook={(p) => set(p, `look:${l._k}:${Object.keys(p).join(",")}`)}
      onPresetLook={(s: SubLook) => set({ ...s })}
      basicTop={
        <div style={col}>
          <span style={label}>글</span>
          <textarea key={`${l._k}:${look.text}`} defaultValue={look.text} rows={Math.min(5, Math.max(2, look.text.split("\n").length))}
            onKeyDown={(e) => e.stopPropagation()}
            onBlur={(e) => { if (e.target.value !== look.text) set({ text: e.target.value } as TextLook); }}
            style={{ ...input, height: "auto", padding: "8px 10px", lineHeight: 1.5, resize: "vertical" }} />
          <span style={{ fontSize: 12, color: C.dim }}>그림판에서 글자를 두 번 눌러도 고칠 수 있어요.</span>
        </div>
      }
      basicBottom={<><CommonProps doc={doc} l={l} mutate={mutate} /></>}
      bubble={<div style={{ padding: 16, fontSize: 13.5, color: C.sub, lineHeight: 1.6 }}>말풍선 모양은 왼쪽 [그래픽] 단추에서 골라 넣어 주세요.</div>}
    />
  );
}

/** 픽토그램을 지금 크기·색·모양으로 다시 그리기 */
function repaintPicto(l: PLayer) {
  const w = l.canvas?.width || 64, h = l.canvas?.height || 64;
  const pc = pictoCanvas(l._picto!.id, Math.max(w, h), l._picto!.color, l._picto!.style);
  if (w === h) return pc;
  const o = document.createElement("canvas");
  o.width = w; o.height = h;
  o.getContext("2d")!.drawImage(pc, 0, 0, w, h);
  return o;
}
/** 사진 · 도형 · 그룹 */
export function LayerPanel({ doc, l, mutate, onClose, fxFirst }: { doc: Doc; l: PLayer; mutate: Mutate; onClose: () => void; fxFirst?: boolean }) {
  const [tab, setTab] = useState<"basic" | "fx">(fxFirst ? "fx" : "basic");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (fxFirst) setTab("fx");
  }, [fxFirst, l._k]);
  const title = l.children ? "그룹" : l._picto ? "픽토그램" : l._shape ? "도형" : l.adjustment ? "조정 레이어" : l.placedLayer ? "스마트 오브젝트" : "픽셀 레이어";
  const s = l._shape;
  return (
    <Side title={title} onClose={onClose}>
      {!l.children && !l.adjustment && (
        <div style={{ display: "flex", borderBottom: `1px solid ${C.line}` }}>
          {([["basic", "기본"], ["fx", "효과"]] as const).map(([k, t]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              style={{ flex: 1, height: 42, border: 0, borderBottom: `2px solid ${tab === k ? C.accent : "transparent"}`, background: "transparent", color: tab === k ? C.text : C.sub, fontSize: 14.5, fontWeight: 800, fontFamily: FONT, cursor: "pointer" }}>
              {t}{k === "fx" && l.effects && !l.effects.disabled ? " •" : ""}
            </button>
          ))}
        </div>
      )}
      {tab === "basic" || l.children || l.adjustment ? (
        <>
          {l.adjustment && <div style={{ ...row, fontSize: 13, color: C.sub, lineHeight: 1.6 }}>포토샵의 조정 레이어예요. 여기서는 미리보기에 안 보이지만, 저장하면 그대로 남아 포토샵에서는 똑같이 보여요.</div>}
          {l.placedLayer && <div style={{ ...row, fontSize: 13, color: C.sub, lineHeight: 1.6 }}>포토샵 스마트 오브젝트예요. 옮기기는 그대로, 크기를 바꾸거나 뒤집으면 그림으로 바뀌어요.</div>}
          {l._picto && (
            <div style={col}>
              <span style={label}>픽토그램 색</span>
              <ColorPick value={l._picto.color} onChange={(c) => mutate(() => { const pp = { ...l._picto!, color: c }; l._picto = pp; l.canvas = repaintPicto(l); })} />
              <div style={{ display: "flex", gap: 6 }}>
                {([["line", "선만"], ["circle", "원 안에"]] as const).map(([v, t]) => (
                  <button key={v} type="button" onClick={() => mutate(() => { l._picto = { ...l._picto!, style: v }; l.canvas = repaintPicto(l); })}
                    style={{ flex: 1, height: 32, borderRadius: 5, border: `1px solid ${l._picto!.style === v ? C.sel : C.line2}`, background: l._picto!.style === v ? C.sel : "transparent", color: l._picto!.style === v ? C.selText : C.text, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>{t}</button>
                ))}
              </div>
            </div>
          )}
          {s && (
            <div style={col}>
              <span style={label}>도형 색</span>
              <ColorPick value={s.color} onChange={(c) => mutate(() => { l._shape = { ...s, color: c }; l.canvas = shapeCanvas(l._shape); })} />
              {(!s.kind || s.kind === "rect") && <Bar name="둥글게" v={s.radius} min={0} max={Math.round(Math.min(s.w, s.h) / 2)} unit="px" set={(v) => mutate(() => { l._shape = { ...s, radius: v }; l.canvas = shapeCanvas(l._shape); }, `rad:${l._k}`)} />}
              {s.kind === "line" && <Bar name="두께" v={s.lw || 6} min={1} max={100} unit="px" set={(v) => mutate(() => { l._shape = { ...s, lw: v }; l.canvas = shapeCanvas(l._shape); }, `lw:${l._k}`)} />}
            </div>
          )}
          <CommonProps doc={doc} l={l} mutate={mutate} />
        </>
      ) : <EffectsPanel l={l} mutate={mutate} />}
    </Side>
  );
}

/** 아무것도 안 골랐을 때 — 문서 */
export function DocPanel({ doc, onResize, gridSize, onGridSize }: { doc: Doc; onResize: (w: number, h: number) => void; gridSize?: number; onGridSize?: (n: number) => void }) {
  const [w, setW] = useState(doc.psd.width), [h, setH] = useState(doc.psd.height);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setW(doc.psd.width); setH(doc.psd.height);
  }, [doc.psd.width, doc.psd.height, doc.id]);
  const adj = hasAdjust(doc);
  const ppi = doc.psd.imageResources?.resolutionInfo?.horizontalResolution;
  return (
    <aside style={{ width: 380, flexShrink: 0, display: "flex", flexDirection: "column", background: C.panel, borderLeft: `1px solid ${C.line}`, fontFamily: FONT, color: C.text, minHeight: 0, overflowY: "auto" }}>
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.line}`, fontSize: 17, fontWeight: 800 }}>문서</div>
      <div style={col}>
        <span style={label}>캔버스 크기</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Num title="W" value={w} min={1} max={30000} onChange={setW} suffix="px" />
          <Num title="H" value={h} min={1} max={30000} onChange={setH} suffix="px" />
        </div>
        {(w !== doc.psd.width || h !== doc.psd.height) && <Btn small primary onClick={() => onResize(w, h)}>캔버스 크기 바꾸기 (가운데 기준)</Btn>}
        {ppi ? <span style={{ fontSize: 12.5, color: C.dim }}>해상도 {Math.round(ppi)} ppi</span> : null}
      </div>
      {onGridSize && (
        <div style={col}>
          <span style={label}>격자 간격 <span style={{ color: C.sub, fontWeight: 600, fontSize: 13 }}>· 보기 › 격자 (Ctrl+&apos;)</span></span>
          <div style={{ width: 170 }}><Num title="" value={gridSize || 100} min={2} max={5000} onChange={onGridSize} suffix="px" /></div>
        </div>
      )}
      {adj > 0 && <div style={{ ...row, fontSize: 13, color: C.sub, lineHeight: 1.6 }}>조정 레이어 {adj}개는 미리보기에 안 보여요. 저장하면 그대로 남아 포토샵에서는 똑같이 보여요.</div>}
      <div style={{ ...row, fontSize: 13, color: C.sub, lineHeight: 1.8 }}>
        <b style={{ color: C.text }}>쓰는 법</b><br />
        누르면 고르기 · 끌면 옮기기 · 모서리로 크기<br />
        글자 두 번 누르기 = 글 고치기<br />
        휠 = 확대/축소 · 스페이스+끌기 = 화면 옮기기<br />
        Ctrl+S 저장 · Ctrl+Z 되돌리기 · Ctrl+J 복제 · Delete 지우기<br />
        Ctrl+0 화면에 맞추기 · Ctrl+1 100%
      </div>
    </aside>
  );
}

/** 그래픽 고르기 (영상 편집기와 같은 그래픽) */
export function StickerSide({ onPick, onClose }: { onPick: (s: Sticker) => Promise<void>; onClose: () => void }) {
  const [cat, setCat] = useState(CATS[0].id);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const items = CATS.find((c) => c.id === cat)?.items || [];
  useEffect(() => {
    let live = true;
    (async () => {
      for (const x of items) {
        const t = await stickerThumb(x).catch(() => "");
        if (!live) return;
        setThumbs((o) => (o[x.text + x.style] ? o : { ...o, [x.text + x.style]: t }));
      }
    })();
    return () => { live = false; };
  }, [cat]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Side title="그래픽" onClose={onClose}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "12px 16px", borderBottom: `1px solid ${C.line}` }}>
        {CATS.map((c) => (
          <button key={c.id} type="button" onClick={() => setCat(c.id)}
            style={{ height: 30, padding: "0 10px", borderRadius: 15, border: `1px solid ${cat === c.id ? C.sel : C.line2}`, background: cat === c.id ? C.sel : "transparent", color: cat === c.id ? C.selText : C.sub, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>{c.label}</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "12px 16px" }}>
        {items.map((x) => {
          const key = x.text + x.style;
          return (
            <button key={key} type="button" disabled={Boolean(busy)} title={x.text}
              onClick={async () => { setBusy(key); try { await onPick(x); } finally { setBusy(""); } }}
              style={{ height: 96, padding: 6, borderRadius: 8, border: `2px solid ${busy === key ? C.accent : "transparent"}`, background: "repeating-conic-gradient(#2a2f3a 0% 25%, #222630 0% 50%) 50% / 16px 16px", cursor: busy ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {thumbs[key] ? <img src={thumbs[key]} alt={x.text} style={{ maxWidth: "100%", maxHeight: 80, objectFit: "contain" }} /> : <span style={{ color: C.sub, fontSize: 12 }}>…</span>}
            </button>
          );
        })}
      </div>
    </Side>
  );
}

/** [픽토그램] 칸 — 심플한 선 아이콘. 누르면 전경색으로 넣는다 (넣은 뒤 오른쪽 칸에서 색·모양을 바꾼다) */
export function PictoSide({ color, onPick, onClose }: { color: string; onPick: (id: string, style: PictoStyle) => void; onClose: () => void }) {
  const [style, setStyle] = useState<PictoStyle>("line");
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    const o: Record<string, string> = {};
    for (const p of PICTOS) o[p.id] = pictoCanvas(p.id, 96, style === "line" ? "#E5E7EB" : color, style).toDataURL();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrls(o);
  }, [style, color]);
  return (
    <Side title="픽토그램" onClose={onClose}>
      <div style={{ display: "flex", gap: 6, padding: "12px 16px", borderBottom: `1px solid ${C.line}` }}>
        {([["line", "선만"], ["circle", "원 안에"]] as const).map(([v, t]) => (
          <button key={v} type="button" onClick={() => setStyle(v)}
            style={{ flex: 1, height: 32, borderRadius: 16, border: `1px solid ${style === v ? C.sel : C.line2}`, background: style === v ? C.sel : "transparent", color: style === v ? C.selText : C.sub, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>{t}</button>
        ))}
      </div>
      <div style={{ padding: "8px 16px 0", fontSize: 12.5, color: C.dim }}>누르면 전경색으로 들어가요 · 크기를 키워도 또렷해요</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, padding: "10px 16px 16px" }}>
        {PICTOS.map((p) => (
          <button key={p.id} type="button" title={p.name} onClick={() => onPick(p.id, style)}
            style={{ padding: "8px 2px 6px", borderRadius: 8, border: `1px solid ${C.line}`, background: C.card, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontFamily: FONT }}>
            {urls[p.id] && <img src={urls[p.id]} alt="" style={{ width: 34, height: 34 }} />}
            <span style={{ fontSize: 11, color: C.sub, whiteSpace: "nowrap" }}>{p.name}</span>
          </button>
        ))}
      </div>
    </Side>
  );
}
