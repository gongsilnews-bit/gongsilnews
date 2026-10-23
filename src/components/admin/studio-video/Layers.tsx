"use client";

// 애셋(레이어) — 브루처럼 클립 목록 왼쪽에 아이콘과 범위 막대, 누르면 오른쪽에 설정 칸
//  음악: 크기·페이드·시작 지점·반복 / 사진: 자리·크기·투명도 / 화면 글자: 글·자리·크기·색·상자
import React from "react";
import type { Clip, Fill, Layer, Project } from "./types";
import { RATIO_SIZE, fmtTime } from "./types";
import { type FlatItem, SFX_LIST, clipOrder, clipText, layerItems, zLayers } from "./timeline";
import { Side } from "./Panels";
import { Btn, C, FONT, Hint, Icon, Toggle, VolumeControl, input, label } from "./ui";
import { ColorPick, FontPick } from "./Pickers";
import { TextTabs } from "./TextTabs";
import { AnimBody, type AnimBodyProps } from "./Anim";
import type { TextLook } from "./SubPresets";
import { BubbleGrid, type Sticker } from "./Stickers";
import { TemplateFields } from "./Templates";

export const LAYER_ICON: Record<Layer["type"], string> = { music: "music", image: "image", text: "text", sfx: "bell" };
export const LAYER_NAME: Record<Layer["type"], string> = { music: "배경 음악", image: "사진 올리기", text: "텍스트", sfx: "효과음" };
/** 화면에 보이는 것 (겹치는 순서가 있는 것) — 사진·스티커·화면 글자 */
const isVis = (l: Layer) => l.type === "image" || l.type === "text";
export const layerTitle = (l: Layer) => (l.type === "text" ? String(l.text || "").trim() || "텍스트" : (l.name || "").replace(/^스티커_/, "") || layerName(l));
/** 스티커는 사진 레이어로 그리지만 이름·아이콘은 따로 (먼저 넣은 것은 이름 "스티커_…" 로 알아본다) */
export const isSticker = (l: Layer) => Boolean(l.sticker) || (l.type === "image" && /^스티커_/.test(l.name || ""));
/** 화면 위 영상 (사진 올리기 레이어인데 영상 — 영상 안 시작 초 vs 가 있다) — 아이콘·이름을 영상으로 (2026-10-21 사장님: 다 사진 아이콘이라 헷갈린다) */
export const isVideoLayer = (l: Layer) => l.type === "image" && !isSticker(l) && typeof l.vs === "number";
export const layerName = (l: Layer) => (isSticker(l) ? "그래픽" : isVideoLayer(l) ? "영상 올리기" : LAYER_NAME[l.type]);
export const layerIcon = (l: Layer) => (isSticker(l) ? "star" : isVideoLayer(l) ? "play" : LAYER_ICON[l.type]);

/* ── 클립 목록 왼쪽 줄 ── */
export type LaneEntry = { layer: Layer; lane: number; a: number; b: number }; // a·b = 보이는 클립 차례

/** 애셋마다 줄(lane)을 나눠 준다 — 겹치는 애셋은 옆 줄로 */
export function computeLanes(p: Project, items: FlatItem[]): { entries: LaneEntry[]; lanes: number; singles: LaneEntry[] } {
  const order = clipOrder(p);
  const pos = new Map(items.map((x, i) => [x.clip.id, i]));
  const spans = (p.layers || [])
    // 단어 구간으로 넣은 사진·글자는 왼쪽 줄에 안 그린다 (단어 앞 작은 표시로 보인다)
    .filter((layer) => typeof layer.w0 !== "number")
    .map((layer) => {
      const cov = layerItems(p, layer, items, order);
      return cov.length ? { layer, a: pos.get(cov[0].clip.id)!, b: pos.get(cov[cov.length - 1].clip.id)! } : null;
    })
    .filter(Boolean) as { layer: Layer; a: number; b: number }[];
  // 한 클립에만 있는 것은 그 클립 카드 안 아래 줄에 (왼쪽 줄은 2개 클립 이상만, 2026-10-19 사장님)
  //  카드 안에서도 왼쪽 줄과 같은 차례 — 음악·효과음 먼저, 그다음 화면에 보이는 것은 앞(위)에 있는 것일수록 왼쪽
  const zi0 = new Map(zLayers(p, p.layers || []).map((l, i) => [l.id, i]));
  const singles: LaneEntry[] = spans.filter((s) => s.a === s.b)
    .sort((x, y) => Number(isVis(x.layer)) - Number(isVis(y.layer)) || (zi0.get(y.layer.id) ?? 0) - (zi0.get(x.layer.id) ?? 0))
    .map((s) => ({ ...s, lane: -1 }));
  spans.splice(0, spans.length, ...spans.filter((s) => s.a !== s.b));
  // 음악·효과음 — 맨 왼쪽 줄들 (화면에 안 보여 겹치는 순서와 상관없다)
  const mus = spans.filter((s) => !isVis(s.layer)).sort((x, y) => x.a - y.a || y.b - x.b);
  const laneEnd: number[] = [];
  const entries: LaneEntry[] = [];
  for (const sp of mus) {
    let lane = laneEnd.findIndex((e) => e < sp.a);
    if (lane < 0) {
      lane = laneEnd.length;
      laneEnd.push(sp.b);
    } else laneEnd[lane] = sp.b;
    entries.push({ ...sp, lane });
  }
  // 화면 위에 겹치는 것 — 겹치는 순서대로 (회의 3-26): 브루처럼 왼쪽 줄일수록 앞, 클립 쪽(오른쪽)일수록 뒤.
  //  뒤 → 앞으로 쌓아 줄을 정한 뒤 좌우를 뒤집는다. 시간이 겹치는 것과는 다른 줄, 안 겹치면 같은 줄을 같이 쓴다
  const base = laneEnd.length;
  let lanes = base;
  const zi = new Map(zLayers(p, p.layers || []).map((l, i) => [l.id, i]));
  const vis = spans.filter((s) => isVis(s.layer)).sort((x, y) => (zi.get(x.layer.id) ?? 0) - (zi.get(y.layer.id) ?? 0));
  const placed: LaneEntry[] = [];
  for (const sp of vis) {
    let lane = base;
    for (const q of placed) if (q.a <= sp.b && sp.a <= q.b) lane = Math.max(lane, q.lane + 1);
    placed.push({ ...sp, lane });
    lanes = Math.max(lanes, lane + 1);
  }
  // 좌우 뒤집기 — 가장 앞 = 음악 바로 오른쪽, 가장 뒤 = 클립 바로 옆 (2026-10-19 사장님)
  for (const q of placed) q.lane = base + (lanes - 1 - q.lane);
  return { entries: [...entries, ...placed], lanes, singles };
}

/** 카드 안 작은 아이콘 — 한 클립에만 있는 애셋 (누르면 설정, 아래로 끌면 범위를 늘려 왼쪽 줄로 나간다) */
export function SingleChips({ list, selLayer, onDrag }: { list: LaneEntry[]; selLayer: string; onDrag: LayerDrag }) {
  if (!list.length) return null;
  return (
    <span data-layer-ui="" style={{ display: "flex", gap: LANE_W - 26, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
      {list.map(({ layer }) => {
        const on = layer.id === selLayer;
        return (
          <button key={layer.id} type="button" data-nodrag="" draggable={false}
            onPointerDown={(ev) => {
              // 카드(클립) 끌기가 먼저 시작되지 않게 — 카드를 잠시 못 끌게 해 두고 (카드를 다시 누르면 풀린다)
              const card = (ev.currentTarget as HTMLElement).closest<HTMLElement>("[data-clip]");
              if (card) card.draggable = false;
              onDrag(layer.id, "to", ev);
            }}
            onMouseDown={(ev) => ev.preventDefault()} onDragStart={(ev) => { ev.preventDefault(); ev.stopPropagation(); }}
            onClick={(ev) => ev.stopPropagation()}
            title={`${layerName(layer)}: ${layerTitle(layer)} — 이 클립에만 있어요 (누르면 메뉴 · 좌우로 끌면 겹치는 순서, 왼쪽일수록 앞 · 위아래 클립으로 끌면 범위가 늘어나 왼쪽 줄로 나가요)`}
            style={{ width: 26, height: 26, borderRadius: 6, border: `1.5px solid ${on ? C.accent : C.line2}`, background: on ? C.accent : C.panel2, color: on ? "#fff" : C.text, opacity: layer.off ? 0.35 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "grab", padding: 0, touchAction: "none" }}>
            <Icon name={layerIcon(layer)} size={14} />
          </button>
        );
      })}
    </span>
  );
}

/** 오른쪽 칸 맨 위 — 스티커 글자 고치기 (같은 모양으로 다시 그린다) */
function StickerText({ text, ok, onText }: { text: string; ok: boolean; onText: (t: string) => Promise<void> }) {
  const [v, setV] = React.useState(text);
  const [busy, setBusy] = React.useState(false);
  const go = async () => {
    const t = v.trim();
    if (!t || t === text || busy) return;
    setBusy(true);
    try { await onText(t); } finally { setBusy(false); }
  };
  return (
    <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.line}` }}>
      <div style={{ ...label, marginBottom: 8 }}>그래픽 글자</div>
      {ok ? (
        <>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={v} onChange={(e) => setV(e.target.value)} maxLength={20} onKeyDown={(e) => { if (e.key === "Enter") go(); }}
              style={{ ...input, flex: 1, minWidth: 0 }} />
            <Btn small primary onClick={go} disabled={busy || !v.trim() || v.trim() === text}>{busy ? "그리는 중…" : "바꾸기"}</Btn>
          </div>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 6 }}>모양·색·움직임은 그대로, 글자만 바뀌어요 (엔터로 바꾸기).</div>
        </>
      ) : (
        <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.5 }}>이 그래픽은 모양을 알 수 없어 글자를 고칠 수 없어요. [그래픽]에서 다시 넣어 주세요.</div>
      )}
    </div>
  );
}

/* ── 겹치는 순서 바꾸기 (맨 앞으로·앞으로·뒤로·맨 뒤로) — 시간이 겹치는 것끼리만 따진다 (회의 3-26) ── */
export type ZMove = "top" | "up" | "down" | "bottom";
function zParts(p: Project, items: FlatItem[], id: string) {
  const order = clipOrder(p);
  const pos = new Map(items.map((x, i) => [x.clip.id, i]));
  const span = (l: Layer): [number, number] | null => {
    const cov = layerItems(p, l, items, order);
    return cov.length ? [pos.get(cov[0].clip.id)!, pos.get(cov[cov.length - 1].clip.id)!] : null;
  };
  const vis = zLayers(p, p.layers || []);
  const i = vis.findIndex((l) => l.id === id);
  const s = i >= 0 ? span(vis[i]) : null;
  const ov = (l: Layer) => {
    const t = span(l);
    return Boolean(s && t && t[0] <= s[1] && s[0] <= t[1]);
  };
  const above = s ? vis.map((_, k) => k).filter((k) => k > i && ov(vis[k])) : [];
  const below = s ? vis.map((_, k) => k).filter((k) => k < i && ov(vis[k])) : [];
  return { vis, i, above, below };
}
/** 앞으로·뒤로 갈 수 있는지 (겹치는 것이 위·아래에 있는지) */
export function zCan(p: Project, items: FlatItem[], id: string) {
  const z = zParts(p, items, id);
  return { up: z.above.length > 0, down: z.below.length > 0 };
}
/** 순서 바꾸기 — 바꿨으면 true. 처음 바꿀 때 예전 순서(사진 먼저·글자 위)를 배열에 옮겨 적고 p.layerZ = 1 */
export function zReorder(p: Project, items: FlatItem[], id: string, o: ZMove) {
  const { vis, i, above, below } = zParts(p, items, id);
  if (i < 0) return false;
  let at = -1; // 나를 뺀 배열에서 넣을 자리
  if (o === "up" && above.length) at = above[0];
  else if (o === "top" && above.length) at = above[above.length - 1];
  else if (o === "down" && below.length) at = below[below.length - 1];
  else if (o === "bottom" && below.length) at = below[0];
  if (at < 0) return false;
  const me = vis[i];
  const rest = vis.filter((_, k) => k !== i);
  rest.splice(at, 0, me);
  p.layers = [...(p.layers || []).filter((l) => !isVis(l)), ...rest];
  p.layerZ = 1;
  return true;
}
/** 순서 단추 4개 (오른쪽 칸·작은 메뉴) */
export function ZButtons({ can, onMove }: { can: { up: boolean; down: boolean }; onMove: (o: ZMove) => void }) {
  const b = (o: ZMove, icon: string, text: string, ok: boolean, title: string) => (
    <button type="button" disabled={!ok} onClick={() => onMove(o)} title={ok ? title : "겹치는 것이 없어요"}
      style={{ flex: 1, minWidth: 0, height: 34, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 6, border: `1px solid ${C.line2}`, background: "transparent", color: ok ? C.text : C.dim, opacity: ok ? 1 : 0.45, fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: ok ? "pointer" : "default", whiteSpace: "nowrap" }}>
      <Icon name={icon} size={14} />{text}
    </button>
  );
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
      {b("top", "front", "맨 앞으로", can.up, "겹친 것 중 가장 위에 보이게")}
      {b("up", "front", "앞으로", can.up, "한 칸 위로")}
      {b("down", "down", "뒤로", can.down, "한 칸 아래로")}
      {b("bottom", "down", "맨 뒤로", can.down, "겹친 것 중 가장 아래로 (클립 화면보다는 늘 위)")}
    </div>
  );
}

export const LANE_W = 30;

export type LayerDrag = (id: string, end: "from" | "to", ev: React.PointerEvent) => void;

/**
 * 카드 하나 옆의 줄들. idx = 이 카드의 차례. pass = 씬 제목·빈칸처럼 카드가 아닌 줄 (막대만 이어 그린다, idx 는 다음 카드 차례)
 * 위 아이콘을 끌면 시작 클립, 아래 손잡이를 끌면 끝 클립이 바뀐다 (아이콘을 그냥 누르면 설정 칸)
 */
export function Gutter({ entries, lanes, idx, pass, selLayer, onDrag }: { entries: LaneEntry[]; lanes: number; idx: number; pass?: boolean; selLayer: string; onDrag: LayerDrag }) {
  if (!lanes) return null;
  return (
    <div data-layer-ui="" style={{ width: lanes * LANE_W + 6, flexShrink: 0, display: "flex" }}>
      {Array.from({ length: lanes }, (_, lane) => {
        const e = entries.find((x) => x.lane === lane && (pass ? x.a < idx && x.b >= idx : x.a <= idx && x.b >= idx));
        if (!e) return <div key={lane} style={{ width: LANE_W }} />;
        const on = e.layer.id === selLayer;
        const dim = e.layer.off ? 0.35 : 1; // 꺼 둔 애셋은 흐리게
        const color = on ? C.accent : C.line2;
        const first = !pass && e.a === idx;
        const last = !pass && e.b === idx;
        return (
          <div key={lane} style={{ width: LANE_W, position: "relative", opacity: dim }} title={e.layer.off ? "꺼 둔 애셋 (미리보기 아래에서 다시 켤 수 있어요)" : undefined}>
            <span style={{ position: "absolute", left: LANE_W / 2 - 1, width: 2, top: first ? (on ? 6 : 22) : 0, bottom: last ? 18 : 0, background: color, borderRadius: 1 }} />
            {/* 고른 줄 — 위에도 손잡이 (위로도 늘이고 줄일 수 있게, 브루처럼) */}
            {first && on && (
              <span onPointerDown={(ev) => onDrag(e.layer.id, "from", ev)} onClick={(ev) => ev.stopPropagation()} title="위아래로 끌어서 시작 클립 바꾸기"
                style={{ position: "absolute", left: LANE_W / 2 - 11, width: 22, height: 12, top: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "ns-resize", touchAction: "none", zIndex: 1 }}>
                <span style={{ width: 16, height: 5, borderRadius: 3, background: color }} />
              </span>
            )}
            {last && (
              <span onPointerDown={(ev) => onDrag(e.layer.id, "to", ev)} onClick={(ev) => ev.stopPropagation()} title="위아래로 끌어서 끝 클립 바꾸기"
                style={{ position: "absolute", left: LANE_W / 2 - 11, width: 22, height: 14, bottom: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "ns-resize", touchAction: "none" }}>
                <span style={{ width: 16, height: 5, borderRadius: 3, background: color }} />
              </span>
            )}
            {first && (
              <button type="button" onPointerDown={(ev) => onDrag(e.layer.id, "from", ev)} onClick={(ev) => ev.stopPropagation()} title={`${layerName(e.layer)}: ${layerTitle(e.layer)} (누르면 설정, 위아래로 끌면 시작 클립 바꾸기)`}
                style={{ position: "absolute", left: LANE_W / 2 - 13, top: on ? 14 : 10, width: 26, height: 26, borderRadius: 6, border: `1.5px solid ${on ? C.accent : C.line2}`, background: on ? C.accent : C.panel2, color: on ? "#fff" : C.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "grab", padding: 0, touchAction: "none" }}>
                <Icon name={layerIcon(e.layer)} size={15} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── 오른쪽 설정 칸 ── */
const chip = (on: boolean): React.CSSProperties => ({ height: 34, padding: "0 12px", borderRadius: 5, border: `1px solid ${on ? C.sel : C.line2}`, background: on ? C.sel : "transparent", color: on ? C.selText : C.sub, fontSize: 14, fontWeight: 700, fontFamily: FONT, cursor: "pointer" });
const row: React.CSSProperties = { padding: "14px 16px", borderBottom: `1px solid ${C.line}` };

function Slider({ title, value, min, max, step, show, onChange }: { title: string; value: number; min: number; max: number; step: number; show: string; onChange: (v: number) => void }) {
  return (
    <div style={row}>
      <div style={{ ...label, display: "flex", marginBottom: 6 }}><span style={{ flex: 1 }}>{title}</span><span style={{ color: C.sub }}>{show}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", accentColor: C.accent }} />
    </div>
  );
}

function Choice<T extends string | number>({ title, value, options, onChange }: { title: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div style={row}>
      <div style={{ ...label, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {options.map(([v, l]) => <button key={String(v)} type="button" onClick={() => onChange(v)} style={chip(value === v)}>{l}</button>)}
      </div>
    </div>
  );
}

const FITS: ["free" | "contain" | "cover", string, string, string][] = [
  ["free", "fitFree", "직접 크기", "미리보기에서 끌어 자리와 크기를 정해요"],
  ["contain", "fitContain", "비율 유지", "사진이 잘리지 않게 화면 안에 다 보여요"],
  ["cover", "fitCover", "잘라서 채우기", "빈 곳 없이 꽉 채우고 가장자리는 잘려요"],
];
const FADES: [number, string][] = [[0, "없음"], [1, "1초"], [2, "2초"], [3, "3초"]];
const GRID: [number, number, string][] = [
  [0.2, 0.18, "왼쪽 위"], [0.5, 0.18, "위"], [0.8, 0.18, "오른쪽 위"],
  [0.2, 0.5, "왼쪽"], [0.5, 0.5, "가운데"], [0.8, 0.5, "오른쪽"],
  [0.2, 0.82, "왼쪽 아래"], [0.5, 0.82, "아래"], [0.8, 0.82, "오른쪽 아래"],
];

/** 원본 소리 설정 — 볼륨·빠르기를 맞추고 [선택한 클립에만] / [모든 클립] 으로 적용. 목소리 바꾸기 */
export function SourcePanel({ selCount, allCount, muted, value, speed, onApply, onToVoice, onClose }: {
  selCount: number;
  allCount: number;
  muted: boolean;
  value: number;
  speed: number;
  onApply: (o: { muted: boolean; volume: number; speed: number }, scope: "sel" | "all") => void;
  onToVoice: () => void;
  onClose: () => void;
}) {
  const [m, setM] = React.useState(muted);
  const [v, setV] = React.useState(value);
  const [sp, setSp] = React.useState(speed);
  React.useEffect(() => {
    setM(muted);
    setV(value);
    setSp(speed);
  }, [muted, value, speed]);
  return (
    <Side title="원본 소리 설정" onClose={onClose}>
      <div style={row}>
        <div style={{ ...label, marginBottom: 8 }}>볼륨</div>
        <VolumeControl muted={m} value={v} onMute={setM} onVolume={(x) => { setV(x); if (x > 0) setM(false); }} />
      </div>
      <div style={row}>
        <div style={{ ...label, display: "flex", marginBottom: 6 }}><span style={{ flex: 1 }}>빠르기</span><span style={{ color: C.sub }}>{+sp.toFixed(2)}배</span></div>
        <input type="range" min={-1} max={Math.log10(20)} step={0.01} value={Math.log10(sp)}
          onChange={(e) => { const x = Math.pow(10, Number(e.target.value)); setSp(+(x < 5 ? x.toFixed(2) : x.toFixed(1))); }}
          style={{ width: "100%", accentColor: C.accent }} />
        <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((x) => (
            <button key={x} type="button" onClick={() => setSp(x)} style={{ ...chip(Math.abs(sp - x) < 0.001), flex: 1, padding: 0, height: 32, fontSize: 12.5 }}>{x}배</button>
          ))}
        </div>
      </div>
      <div style={row}>
        <div style={{ ...label, marginBottom: 8 }}>적용 범위</div>
        <div style={{ display: "flex", gap: 6 }}>
          <Btn primary small onClick={() => onApply({ muted: m, volume: v, speed: sp }, "sel")} disabled={!selCount} style={{ flex: 1, justifyContent: "center" }}><Icon name="check" size={16} />선택한 클립에만{selCount > 1 ? ` (${selCount}개)` : ""}</Btn>
          <Btn small onClick={() => onApply({ muted: m, volume: v, speed: sp }, "all")} style={{ flex: 1, justifyContent: "center" }}><Icon name="check" size={16} />모든 클립 ({allCount}개)</Btn>
        </div>
      </div>
      <div style={row}>
        <div style={{ ...label, marginBottom: 8 }}>목소리 바꾸기</div>
        <Btn small onClick={onToVoice}><Icon name="voice" size={15} />AI 목소리 고르기</Btn>
      </div>
    </Side>
  );
}

/** 클립 속도·길이 — 클립 시간을 누르면 오른쪽에. 여러 클립을 고르면 고른 클립 모두 */
// 속도 막대 자리(0~100) ↔ 배속 — 50 = 1배, 0 = 0.1배, 100 = 20배
const speedToPos = (v: number) => (v <= 1 ? 50 + 50 * Math.log10(Math.max(0.1, v)) : 50 + (50 * Math.log(Math.min(20, v))) / Math.log(20));
const posToSpeed = (x: number) => (x <= 50 ? Math.pow(10, (x - 50) / 50) : Math.pow(20, (x - 50) / 50));

export function TimingPanel({ clips, nums, durs, speeds, onSpeed, onLength, onReset, onClose }: {
  clips: Clip[];
  nums: number[]; // 클립 번호 (1부터)
  durs: number[]; // 지금 길이 (초)
  speeds: (number | null)[]; // 지금 빠르기 (바꿀 수 없는 클립은 null)
  onSpeed: (v: number, first: boolean) => void;
  onLength: (sec: number) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const first = React.useRef(true);
  const sp = speeds.filter((x): x is number => x !== null);
  const same = sp.length > 0 && sp.every((x) => Math.abs(x - sp[0]) < 0.001);
  const total = durs.reduce((a, b) => a + b, 0);
  const sameLen = durs.length > 0 && durs.every((d) => Math.abs(d - durs[0]) < 0.01);
  const [len, setLen] = React.useState(sameLen ? durs[0].toFixed(1) : "");
  const [spd, setSpd] = React.useState(same ? String(+sp[0].toFixed(2)) : "");
  React.useEffect(() => setSpd(same ? String(+sp[0].toFixed(2)) : ""), [same, sp[0]]); // eslint-disable-line react-hooks/exhaustive-deps
  const applySpd = () => {
    const v = Number(spd);
    if (v > 0 && !(same && Math.abs(v - sp[0]) < 0.001)) onSpeed(Math.max(0.1, Math.min(20, v)), true);
  };
  React.useEffect(() => setLen(sameLen ? durs[0].toFixed(1) : ""), [sameLen, durs[0]]); // eslint-disable-line react-hooks/exhaustive-deps
  const apply = (v: number) => {
    if (!(v > 0)) return;
    onLength(Math.max(0.3, Math.min(600, v)));
  };
  const many = clips.length > 1;
  return (
    <Side title={many ? `속도·길이 · 고른 클립 ${clips.length}개` : `속도·길이 · 클립 ${nums[0]}`} onClose={onClose}
      footer={<Btn small onClick={onReset}><Icon name="undo" size={15} />원래대로</Btn>}>
      {/* 어느 클립에 들어가는지 크게 — 목록에서 고른(파랗게 칠한) 클립 */}
      <div style={{ ...row, display: "flex", alignItems: "center", gap: 10, background: C.accentDim }}>
        <span style={{ fontSize: 13.5, color: C.sub, flexShrink: 0 }}>바꾸는 클립</span>
        <span style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{many ? nums.length > 6 ? `${nums.length}개` : nums.map((x) => `${x}번`).join(", ") : `${nums[0]}번`}</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: C.dim }}>목록에서 다른 클립을 누르면 바뀌어요</span>
      </div>
      <div style={row}>
        <div style={{ ...label, display: "flex", marginBottom: 6 }}>
          <span style={{ flex: 1 }}>속도</span>
          <span style={{ color: C.sub }}>{sp.length ? (same ? `${sp[0].toFixed(2).replace(/\.?0+$/, "")}배` : "클립마다 달라요") : "바꿀 수 없어요"}</span>
        </div>
        {/* 가운데 = 1배 — 왼쪽 반은 0.1~1배, 오른쪽 반은 1~20배 (로그 눈금이라 1배 근처도 곱게) */}
        <div style={{ position: "relative" }}>
          <input type="range" min={0} max={100} step={0.5} value={speedToPos(same ? sp[0] : 1)} disabled={!sp.length}
            onPointerDown={() => (first.current = true)}
            onChange={(e) => { const v = posToSpeed(Number(e.target.value)); onSpeed(+(v < 5 ? v.toFixed(2) : v.toFixed(1)), first.current); first.current = false; }}
            style={{ width: "100%", accentColor: C.accent, display: "block" }} />
          <div style={{ position: "relative", height: 16, fontSize: 11.5, color: C.dim }}>
            <span style={{ position: "absolute", left: 0 }}>0.1배</span>
            <span style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", color: C.sub, fontWeight: 700 }}>| 1배</span>
            <span style={{ position: "absolute", right: 0 }}>20배</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
          <input value={spd} onChange={(e) => setSpd(e.target.value.replace(/[^0-9.]/g, ""))} onKeyDown={(e) => e.key === "Enter" && applySpd()} onBlur={applySpd} disabled={!sp.length} inputMode="decimal"
            placeholder={same ? "" : "클립마다 달라요"} style={{ ...input, flex: 1, height: 34, textAlign: "center", fontSize: 15, fontWeight: 800 }} />
          <span style={{ fontSize: 14 }}>배</span>
        </div>
        <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
          {[0.1, 0.5, 1, 1.5, 2, 5, 10, 20].map((v) => (
            <button key={v} type="button" disabled={!sp.length} onClick={() => onSpeed(v, true)}
              style={{ ...chip(same && Math.abs(sp[0] - v) < 0.001), flex: 1, padding: 0, height: 32, fontSize: 12.5 }}>{v}</button>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: C.dim, marginTop: 8, lineHeight: 1.5 }}>AI 목소리 클립은 목소리가, 촬영 영상 클립은 영상과 소리가 함께 빨라지거나 느려져요.</div>
      </div>
      <div style={row}>
        <div style={{ ...label, display: "flex", marginBottom: 8 }}>
          <span style={{ flex: 1 }}>길이</span>
          <span style={{ color: C.sub }}>{many ? `모두 ${total.toFixed(1)}초` : ""}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Btn small onClick={() => apply((sameLen ? durs[0] : Number(len) || 0) - 0.5)}>-0.5초</Btn>
          <input value={len} onChange={(e) => setLen(e.target.value.replace(/[^0-9.]/g, ""))} onKeyDown={(e) => e.key === "Enter" && apply(Number(len))} placeholder={sameLen ? "" : "클립마다 달라요"} inputMode="decimal"
            style={{ ...input, flex: 1, height: 36, textAlign: "center", fontSize: 15, fontWeight: 800 }} />
          <span style={{ fontSize: 14 }}>초</span>
          <Btn small onClick={() => apply((sameLen ? durs[0] : Number(len) || 0) + 0.5)}>+0.5초</Btn>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <Btn small primary onClick={() => apply(Number(len))} disabled={!Number(len)}>{many ? `고른 클립 모두 ${Number(len) || 0}초로` : "이 길이로"}</Btn>
        </div>
        <div style={{ fontSize: 12.5, color: C.dim, marginTop: 8, lineHeight: 1.5 }}>
          늘리면 AI 목소리 클립은 말이 끝난 뒤 그만큼 화면이 머물러요. 줄이면 빠르게 해서 맞춰요 (0.1~20배 안에서).<br />촬영 영상 클립은 속도를 바꿔서 맞추고, 화면만 있는 클립은 그 시간만큼 보여요.
        </div>
      </div>
    </Side>
  );
}

/** 클립 화면 속성 — 썸네일을 누르면 오른쪽에 (채우기·반전·교체·다른 클립에도 쓰기·지우기) */
export function VisualPanel({ project, clip, n, total, cur, many, sound, trim, onFit, onFlip, onReplace, onStart, onRange, onRemove, onClose, extra }: {
  /** 키프레임·돌리기·진하기·필터 칸 (2026-10-20) — 화면 미리보기 바로 아래 */
  extra?: React.ReactNode;
  project: Project;
  trim?: { s: number; e: number } | null; // 원본 영상 클립이면 지금 쓰는 구간 → [시작·끝 자르기]
  clip: Clip;
  n: number; // 이 클립 번호 (1부터)
  total: number;
  cur: number;
  many: { a: number; b: number; n: number } | null; // 고른 클립 범위 (여러 개 골랐을 때)
  sound?: { muted: boolean; value: number; label?: string; onMute: (v: boolean) => void; onVolume: (v: number, first: boolean) => void };
  onFit: (f: Fill) => void;
  onFlip: (axis: "x" | "y") => void;
  onReplace: () => void;
  onStart?: () => void;
  onRange: (a: number, b: number) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const a = clip.visual ? project.assets[clip.visual.asset] : clip.src ? project.assets[clip.src.asset] : null;
  const fill = clip.box ? "" : clip.fill || project.settings.fill;
  const flip = clip.flipX || clip.flipY ? `scale(${clip.flipX ? -1 : 1}, ${clip.flipY ? -1 : 1})` : undefined;
  const FILLS: [Fill, string, string, string][] = [
    ["contain", "fitContain", "비율 유지", "사진이 잘리지 않게 화면 안에 다 보여요"],
    ["cover", "fitCover", "잘라서 채우기", "빈 곳 없이 꽉 채우고 가장자리는 잘려요"],
    ["blur", "fill", "흐린 배경", "사진은 다 보이고 빈 곳은 같은 사진을 흐리게 깔아요"],
  ];
  return (
    <Side title={`화면 속성 · 클립 ${n}`} onClose={onClose}
      footer={clip.visual ? <Btn small onClick={onRemove} style={{ color: C.danger }}><Icon name="trash" size={15} />이 클립 화면 지우기</Btn> : undefined}>
      <div style={row}>
        <div style={{ width: "100%", aspectRatio: "16 / 9", borderRadius: 6, overflow: "hidden", background: "#000", marginBottom: 10 }}>
          {a && (a.kind === "video"
            ? <video src={a.url} muted autoPlay loop playsInline style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", transform: flip }} />
            : <img src={a.url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", transform: flip }} />)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a?.name || "화면 없음"}</span>
          <Btn small onClick={onReplace}><Icon name="swap" size={15} />교체</Btn>
        </div>
        {a && <div style={{ fontSize: 12.5, color: C.dim, marginTop: 4 }}>{a.kind === "video" ? `영상 ${Math.round(a.duration || 0)}초` : "사진"}{a.width ? ` · ${a.width}×${a.height}` : ""}</div>}
        {onStart && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            {trim ? (
              <>
                <Btn small onClick={onStart}><Icon name="cut" size={15} />시작·끝 자르기</Btn>
                <span style={{ fontSize: 13, color: C.sub }}>{fmtTime(trim.s, false)} ~ {fmtTime(trim.e, false)}</span>
              </>
            ) : <><Btn small onClick={onStart}><Icon name="video" size={15} />비디오 시작점 변경</Btn>
            <span style={{ fontSize: 13, color: C.sub }}>{(clip.visual?.s || 0) > 0 ? `${Math.floor((clip.visual?.s || 0) / 60)}:${String(Math.floor((clip.visual?.s || 0) % 60)).padStart(2, "0")}부터` : "처음부터"}</span></>}
          </div>
        )}
      </div>
      {extra}
      {sound && (
        <div style={row}>
          <div style={{ ...label, marginBottom: 8 }}>소리 <span style={{ color: C.sub, fontWeight: 600 }}>· {sound.label || "이 클립의 원본 소리"}</span></div>
          <VolumeControl muted={sound.muted} value={sound.value} onMute={sound.onMute} onVolume={sound.onVolume} />
        </div>
      )}
      <div style={row}>
        <div style={{ ...label, marginBottom: 8 }}>채우기</div>
        <div style={{ display: "flex", gap: 6 }}>
          {FILLS.map(([v, ic, t, d]) => (
            <button key={v} type="button" onClick={() => onFit(v)} title={`${t} — ${d}`}
              style={{ ...chip(fill === v), flex: 1, height: 58, padding: "4px 2px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, fontSize: 12 }}>
              <Icon name={ic} size={20} />
              {t}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: clip.box ? C.accent : C.dim, marginTop: 8, lineHeight: 1.5 }}>
          {clip.box ? "지금은 직접 크기예요. 위 채우기를 누르면 원래대로 돌아가요." : "미리보기에서 화면을 누르면 끌어 옮기고, 네 모서리로 크기를 바꿀 수 있어요."}
        </div>
      </div>
      <div style={{ ...row, display: "flex", gap: 6 }}>
        <button type="button" onClick={() => onFlip("x")} title="왼쪽과 오른쪽을 거울처럼 뒤집어요" style={{ ...chip(Boolean(clip.flipX)), flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Icon name="flipH" size={17} />좌우 반전</button>
        <button type="button" onClick={() => onFlip("y")} title="위와 아래를 뒤집어요" style={{ ...chip(Boolean(clip.flipY)), flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Icon name="flipV" size={17} />상하 반전</button>
      </div>
      {a && total > 1 && (
        <div style={row}>
          <div style={{ ...label, marginBottom: 8 }}>이 화면을 다른 클립에도</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {many && <Btn small onClick={() => onRange(many.a, many.b)}>고른 클립 {many.n}개</Btn>}
            <Btn small onClick={() => onRange(1, total)}>전체 클립</Btn>
            <Btn small onClick={() => onRange(1, cur)}>처음~이 클립</Btn>
            <Btn small onClick={() => onRange(cur, total)}>이 클립~끝</Btn>
          </div>
          <div style={{ fontSize: 12.5, color: C.dim, marginTop: 6 }}>채우기·반전도 똑같이 들어가요.</div>
        </div>
      )}
    </Side>
  );
}

export function LayerPanel({ project, layer, items, selRange, onChange, onRemove, onReplace, onClose, onZ, sticker, template, textAnim, imgAnim, onBubble, curClip, kfEl }: {
  /** 그래픽·사진 — 속성 창 [애니메이션] 탭 (2026-10-21 사장님: 그래픽 속성에 모션이 나와야) */
  imgAnim?: AnimBodyProps;
  /** 키프레임 칸 (2026-10-20) — 맨 위 */
  kfEl?: React.ReactNode;
  /** 지금 클립 (재생·고른) — [이 클립만] */
  curClip?: string;
  /** 화면 글자 → 말풍선 스티커로 바꾸기 */
  onBubble?: (s: Sticker) => Promise<void>;
  /** 화면 글자 — [애니메이션] 탭 (글자 칸 탭, 회의 3-28) */
  textAnim?: AnimBodyProps;
  /** 스티커 글자 고치기 — 지금 글자, 고칠 수 있는지, 바꾸기 */
  sticker?: { text: string; ok: boolean; onText: (t: string) => Promise<void> };
  /** 템플릿 글·색 고치기 (칸마다) */
  template?: { style: string; text: string; color?: string; onSave: (text: string, color?: string) => Promise<void> };
  /** 겹치는 순서 (사진·스티커·화면 글자) */
  onZ?: (o: ZMove) => void;
  project: Project;
  layer: Layer;
  items: FlatItem[];
  selRange: { from: string; to: string; n: number } | null;
  onChange: (patch: Partial<Layer>) => void;
  onRemove: () => void;
  onReplace: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = React.useState(layer.text || "");
  const [gtab, setGtab] = React.useState<"prop" | "anim">("prop");
  const textTimer = React.useRef<number | undefined>(undefined);
  React.useEffect(() => setDraft(layer.text || ""), [layer.id, layer.text]); // 화면에서 고친 글도 칸에 바로
  const clipLabel = (x: FlatItem, i: number) => {
    const t = clipText(x.clip).trim() || (x.clip.type === "silence" ? "말 없는 구간" : "화면");
    return `클립 ${i + 1} · ${t.length > 16 ? t.slice(0, 16) + "…" : t}`;
  };
  const cov = layerItems(project, layer, items);
  const asset = layer.asset ? project.assets[layer.asset] : null;
  const pickClip = (key: "from" | "to", id: string) => {
    const pos = new Map(items.map((x, i) => [x.clip.id, i]));
    const other = key === "from" ? layer.to : layer.from;
    // 시작이 끝보다 뒤로 가면 서로 바꾼다
    // 클립으로 고르면 초 단위 구간(타임라인에서 끈 것)은 풀고 클립 전체로
    if (key === "from" && (pos.get(id) ?? 0) > (pos.get(other) ?? 0)) onChange({ from: other, to: id, ts: undefined, te: undefined });
    else if (key === "to" && (pos.get(id) ?? 0) < (pos.get(other) ?? 0)) onChange({ from: id, to: other, ts: undefined, te: undefined });
    else onChange({ [key]: id, ...(key === "from" ? { ts: undefined } : { te: undefined }) });
  };

  const orderEl = onZ && layer.type !== "music" && layer.type !== "sfx" && (
    <div style={row}>
      <div style={{ ...label, marginBottom: 8 }}>순서 <span style={{ color: C.sub, fontWeight: 600 }}>· 겹친 그래픽·사진·글자 사이</span></div>
      <ZButtons can={zCan(project, items, layer.id)} onMove={onZ} />
      <div style={{ fontSize: 12, color: C.dim, marginTop: 6 }}>클립 옆 아이콘을 좌우로 끌어도 바뀌어요. 왼쪽 줄일수록 앞이에요.</div>
    </div>
  );
  const rangeEl = (
    <>
      {/* 적용 범위 */}
      <div style={row}>
        <div style={{ ...label, marginBottom: 8 }}>적용 범위 <span style={{ color: C.sub, fontWeight: 600 }}>· 클립 {cov.length}개</span></div>
        {/* [클립 ▼] 부터 [클립 ▼] 까지 — 한 줄 (2026-10-19 사장님) */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <select value={layer.from} onChange={(e) => pickClip("from", e.target.value)} style={{ ...input, flex: 1, minWidth: 0 }}>
            {items.map((x, i) => <option key={x.clip.id} value={x.clip.id}>{clipLabel(x, i)}</option>)}
          </select>
          <span style={{ fontSize: 13.5, color: C.sub, flexShrink: 0 }}>부터</span>
          <select value={layer.to} onChange={(e) => pickClip("to", e.target.value)} style={{ ...input, flex: 1, minWidth: 0 }}>
            {items.map((x, i) => <option key={x.clip.id} value={x.clip.id}>{clipLabel(x, i)}</option>)}
          </select>
          <span style={{ fontSize: 13.5, color: C.sub, flexShrink: 0 }}>까지</span>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {selRange && <Btn small onClick={() => onChange({ from: selRange.from, to: selRange.to, ts: undefined, te: undefined })}>고른 클립 {selRange.n}개로 바꾸기</Btn>}
          {items.length > 0 && <Btn small onClick={() => onChange({ from: items[0].clip.id, to: items[items.length - 1].clip.id, ts: undefined, te: undefined })}>처음부터 끝까지</Btn>}
        </div>
      </div>
      {orderEl}
    </>
  );
  // 효과음 — 소리 고르기·크기·언제 (회의 3-29)
  if (layer.type === "sfx") {
    const play = (id: string, v: number) => {
      try {
        const au = new Audio(`/studio-sfx/${id}.mp3`);
        au.volume = Math.min(1, v);
        void au.play().catch(() => {});
      } catch {}
    };
    const v = layer.volume ?? 0.8;
    return (
      <Side title="효과음" onClose={onClose}
        footer={<Btn small onClick={onRemove} style={{ color: C.danger }}><Icon name="trash" size={16} />이 효과음 지우기</Btn>}>
        <div style={row}>
          <div style={{ ...label, marginBottom: 8 }}>소리 <span style={{ color: C.sub, fontWeight: 600 }}>· 누르면 들어 보고 바뀌어요</span></div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SFX_LIST.map((x) => (
              <button key={x.id} type="button" onClick={() => { onChange({ sfx: x.id, name: x.label, file: undefined, url: undefined }); play(x.id, v); }}
                style={{ height: 32, padding: "0 12px", borderRadius: 16, border: `1px solid ${!layer.file && layer.sfx === x.id ? C.accent : C.line2}`, background: !layer.file && layer.sfx === x.id ? C.accentDim : "transparent", color: C.text, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>
                {x.label}
              </button>
            ))}
            {/* 내 효과음 — 지금 쓰는 내 파일 (2026-10-21) */}
            {layer.file && layer.url && (
              <button type="button" onClick={() => { try { const au = new Audio(layer.url); au.volume = Math.min(1, v); void au.play().catch(() => {}); } catch {} }}
                style={{ height: 32, padding: "0 12px", borderRadius: 16, border: `1px solid ${C.accent}`, background: C.accentDim, color: C.text, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>★ {layer.name || "내 효과음"}</button>
            )}
          </div>
        </div>
        <Slider title="소리 크기" value={v} min={0.1} max={1} step={0.05} show={`${Math.round(v * 100)}%`} onChange={(x) => onChange({ volume: x })} />
        <div style={row}>
          <div style={{ ...label, marginBottom: 8 }}>언제 <span style={{ color: C.sub, fontWeight: 600 }}>· 이 클립이 시작할 때 한 번</span></div>
          <select value={layer.from} onChange={(e) => onChange({ from: e.target.value, to: e.target.value, w0: undefined, w1: undefined })} style={input}>
            {items.map((x, i) => <option key={x.clip.id} value={x.clip.id}>{clipLabel(x, i)}</option>)}
          </select>
          {typeof layer.w0 === "number" && <div style={{ fontSize: 12.5, color: C.sub, marginTop: 6 }}>고른 단어를 말할 때 나와요.</div>}
          <div style={{ fontSize: 12, color: C.dim, marginTop: 6 }}>클립 옆 종 아이콘을 위아래로 끌어도 바뀌어요.</div>
        </div>
      </Side>
    );
  }
  // 화면 글자 — 메인자막과 같은 글자 칸 탭 (텍스트 / 애니메이션 / 사전설정)
  if (layer.type === "text" && textAnim) {
    const autoOutline = String(layer.color).toUpperCase() === "#111111" ? "#FFFFFF" : "#000000";
    const look: TextLook = {
      font: layer.font, color: layer.color || "#FFFFFF", outline: layer.outline || autoOutline, outlineWidth: layer.outlineWidth ?? 4, bold: layer.bold,
      bg: Boolean(layer.box), bgColor: layer.boxColor, bgOpacity: layer.boxOpacity, shadow: layer.shadow, shadowColor: layer.shadowColor, glow: layer.glow, size: layer.size ?? 100, spacing: layer.spacing,
      italic: layer.italic, underline: layer.underline, textCase: layer.textCase, align: layer.align, textAlpha: layer.textAlpha, outlineAlpha: layer.outlineAlpha, bgPad: layer.bgPad, shadowAlpha: layer.shadowAlpha, glowSize: layer.glowSize, glowAlpha: layer.glowAlpha,
      outline2: layer.outline2, outline2Width: layer.outline2Width, gradTo: layer.gradTo, gradType: layer.gradType, gradAngle: layer.gradAngle, gradA: layer.gradA, gradB: layer.gradB,
    };
    const toLayer = (p: TextLook): Partial<Layer> => {
      const o: Partial<Layer> = {};
      for (const [k, v] of Object.entries(p)) {
        if (k === "leading") continue;
        const key = k === "bg" ? "box" : k === "bgColor" ? "boxColor" : k === "bgOpacity" ? "boxOpacity" : k;
        (o as Record<string, unknown>)[key] = v;
      }
      return o;
    };
    return (
      <TextTabs title="텍스트" kind="layer" onClose={onClose} look={look} anim={textAnim} sample={layer.text || ""} pxPer100={Math.round(Math.min(...RATIO_SIZE[project.ratio]) * 0.08)}
        bubble={onBubble ? <BubbleGrid text={layer.text || ""} onPick={onBubble} /> : undefined}
        onLook={(p) => onChange(toLayer(p))} onPresetLook={(lk) => onChange(toLayer(lk))}
        basicTop={
          <>
            {kfEl}
            <div style={row}>
              <div style={{ ...label, marginBottom: 8 }}>글</div>
              {/* 쓰는 대로 바로 (멈추고 0.5초 뒤, 칸을 벗어나면 바로) — [글 바꾸기]·[지우기] 단추 없음 (2026-10-19 사장님) */}
              <textarea value={draft} rows={3}
                onChange={(e) => {
                  const t = e.target.value;
                  setDraft(t);
                  window.clearTimeout(textTimer.current);
                  if (t.trim()) textTimer.current = window.setTimeout(() => onChange({ text: t }), 500);
                }}
                onBlur={() => { window.clearTimeout(textTimer.current); if (draft.trim() && draft !== layer.text) onChange({ text: draft }); }}
                style={{ ...input, height: "auto", padding: 10, lineHeight: 1.5, resize: "vertical" }} />
            </div>
          </>
        }
        posEl={
          // 자리 — 메인자막 위치처럼 색상 아래·문자 간격 위 (2026-10-19 사장님)
          <div style={{ ...row, display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={label}>자리</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {([["top", "상단"], ["middle", "가운데"], ["bottom", "하단"]] as const).map(([k, l]) => {
                const on = typeof layer.x !== "number" && (layer.pos || "top") === k;
                return (
                  <button key={k} type="button" onClick={() => onChange({ pos: k, x: undefined, y: undefined })}
                    style={{ height: 32, padding: "0 12px", borderRadius: 5, border: `1px solid ${on ? C.sel : C.line2}`, background: on ? C.sel : "transparent", color: on ? C.selText : C.sub, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>{l}</button>
                );
              })}
              {typeof layer.x === "number" && <span style={{ height: 32, padding: "0 12px", display: "inline-flex", alignItems: "center", borderRadius: 5, background: C.text, color: C.bg, fontSize: 13.5, fontWeight: 700 }}>옮긴 자리</span>}
            </div>
          </div>
        }
        basicBottom={orderEl}
        footerTop={items.length > 0 && (() => {
          // 나오는 구간 — 맨 아래 고정 줄 (회의 3-30): [클립 ▼] ~ [클립 ▼] + [이 클립만][고른 클립들][처음~끝]
          const first = items[0].clip.id, last = items[items.length - 1].clip.id;
          const set = (from: string, to: string) => onChange({ from, to, w0: undefined, w1: undefined, ts: undefined, te: undefined });
          const one = curClip && items.some((x) => x.clip.id === curClip) ? curClip : "";
          const quick = (on: boolean, ok: boolean, text: string, title: string, go: () => void) => (
            <button type="button" onClick={go} disabled={!ok} title={title}
              style={{ flex: 1, height: 34, padding: "0 8px", borderRadius: 6, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accent : "transparent", color: on ? "#fff" : ok ? C.text : C.dim, opacity: ok ? 1 : 0.45, fontSize: 13, fontWeight: 800, fontFamily: FONT, cursor: ok ? "pointer" : "default", whiteSpace: "nowrap" }}>{text}</button>
          );
          const shortLabel = (x: FlatItem, i: number) => {
            const t = clipText(x.clip).trim();
            return `클립 ${i + 1}${t ? ` · ${t.length > 8 ? t.slice(0, 8) + "…" : t}` : ""}`;
          };
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ ...label, flexShrink: 0 }}>나오는 구간</span>
                <select value={layer.from} onChange={(e) => pickClip("from", e.target.value)} style={{ ...input, flex: 1, minWidth: 0, height: 32, fontSize: 13 }}>
                  {items.map((x, i) => <option key={x.clip.id} value={x.clip.id}>{shortLabel(x, i)}</option>)}
                </select>
                <span style={{ fontSize: 13, color: C.sub, flexShrink: 0 }}>~</span>
                <select value={layer.to} onChange={(e) => pickClip("to", e.target.value)} style={{ ...input, flex: 1, minWidth: 0, height: 32, fontSize: 13 }}>
                  {items.map((x, i) => <option key={x.clip.id} value={x.clip.id}>{shortLabel(x, i)}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {quick(Boolean(one) && layer.from === one && layer.to === one, Boolean(one), "이 클립만", "지금 클립에서만 나오게", () => one && set(one, one))}
                {quick(Boolean(selRange && layer.from === selRange.from && layer.to === selRange.to), Boolean(selRange), `고른 클립들${selRange ? ` (${selRange.n})` : ""}`, selRange ? "고른 클립의 처음~끝 구간에 나오게" : "클립을 먼저 골라 주세요 (카드 왼쪽 네모 칸)", () => selRange && set(selRange.from, selRange.to))}
                {quick(layer.from === first && layer.to === last, true, "처음~끝", "영상 처음부터 끝까지 나오게", () => set(first, last))}
              </div>
            </div>
          );
        })()} />
    );
  }

  return (
    <Side title={layerName(layer)} onClose={onClose}
      footer={<Btn small onClick={onRemove} style={{ color: C.danger }}><Icon name="trash" size={16} />이 {layerName(layer)} 지우기</Btn>}>
      {imgAnim && layer.type === "image" && (
        <div style={{ padding: "12px 16px 4px" }}>
          <div style={{ display: "flex", borderRadius: 7, background: C.card, padding: 3 }}>
            {([["prop", "속성"], ["anim", `애니메이션${layer.anim && Object.keys(layer.anim).length ? " •" : ""}`]] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setGtab(k)}
                style={{ flex: 1, height: 32, border: 0, borderRadius: 5, background: gtab === k ? C.panel2 : "transparent", color: gtab === k ? C.text : C.sub, fontSize: 14, fontWeight: 800, fontFamily: FONT, cursor: "pointer" }}>
                {l}
              </button>
            ))}
          </div>
        </div>
      )}
      {imgAnim && layer.type === "image" && gtab === "anim" ? <AnimBody {...imgAnim} /> : <>
      {kfEl}
      {sticker && <StickerText key={layer.id + sticker.text} {...sticker} />}
      {template && <TemplateFields key={layer.id + template.text + (template.color || "")} {...template} />}
      {rangeEl}
      {layer.type === "music" && (
        <>
          <div style={{ ...row, display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" onClick={onReplace} title="눌러서 음악 바꾸기"
              style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", border: `1px solid ${C.line2}`, borderRadius: 6, background: C.card, color: C.text, fontSize: 15, fontWeight: 700, fontFamily: FONT, cursor: "pointer", textAlign: "left" }}>
              <Icon name="music" size={18} />
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{layer.name || "음악"}</span>
            </button>
            <Btn small onClick={onReplace}>음악 바꾸기</Btn>
          </div>
          <Slider title="음악 크기" value={layer.volume ?? 0.15} min={0} max={2} step={0.01} show={`${Math.round((layer.volume ?? 0.15) * 100)}%`} onChange={(v) => onChange({ volume: v })} />
          <Choice title="점점 커지며 시작 (페이드인)" value={layer.fadeIn ?? 0} options={FADES} onChange={(v) => onChange({ fadeIn: v })} />
          <Choice title="점점 작아지며 끝 (페이드아웃)" value={layer.fadeOut ?? 0} options={FADES} onChange={(v) => onChange({ fadeOut: v })} />
          <div style={row}>
            <div style={{ ...label, marginBottom: 8 }}>음악 시작 지점</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Btn small onClick={() => onChange({ offset: Math.max(0, (layer.offset || 0) - 5) })}>-5초</Btn>
              <span style={{ flex: 1, textAlign: "center", fontSize: 16, fontWeight: 800 }}>{Math.round(layer.offset || 0)}초부터</span>
              <Btn small onClick={() => onChange({ offset: (layer.offset || 0) + 5 })}>+5초</Btn>
            </div>
            <div style={{ fontSize: 12.5, color: C.dim, marginTop: 6 }}>음악 앞부분을 건너뛰고 싶을 때 써요.</div>
          </div>
          <div style={{ ...row, display: "flex", alignItems: "center" }}>
            <span style={{ ...label, flex: 1 }}>음악이 짧으면 반복</span>
            <Toggle on={layer.loop !== false} onChange={(v) => onChange({ loop: v })} />
          </div>
          <div style={{ padding: "12px 16px" }}><Hint>목소리가 나올 때는 음악이 저절로 작아져요.</Hint></div>
        </>
      )}

      {layer.type === "image" && (
        <>
          <div style={{ ...row, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 64, height: 40, borderRadius: 4, overflow: "hidden", background: "#000", flexShrink: 0 }}>
              {asset && <img src={asset.thumb || asset.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
            </div>
            <button type="button" onClick={onReplace} title={isSticker(layer) ? "눌러서 그래픽 바꾸기" : "눌러서 사진 바꾸기"} style={{ flex: 1, minWidth: 0, padding: 0, border: 0, background: "transparent", color: C.text, fontSize: 14.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer", textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset?.name || "사진"}</button>
            <Btn small onClick={onReplace}>{isSticker(layer) ? "그래픽 바꾸기" : "사진 바꾸기"}</Btn>
          </div>
          <div style={row}>
            <div style={{ ...label, marginBottom: 8 }}>채우기</div>
            <div style={{ display: "flex", gap: 6 }}>
              {FITS.map(([v, ic, t, d]) => (
                <button key={v} type="button" onClick={() => onChange({ fit: v === "free" ? undefined : v })} title={`${t} — ${d}`}
                  style={{ ...chip((layer.fit || "free") === v), flex: 1, height: 58, padding: "4px 2px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, fontSize: 12 }}>
                  <Icon name={ic} size={20} />
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div style={{ ...row, display: "flex", gap: 6 }}>
            <button type="button" onClick={() => onChange({ flipX: !layer.flipX || undefined })} title="왼쪽과 오른쪽을 거울처럼 뒤집어요" style={{ ...chip(Boolean(layer.flipX)), flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Icon name="flipH" size={17} />좌우 반전</button>
            <button type="button" onClick={() => onChange({ flipY: !layer.flipY || undefined })} title="위와 아래를 뒤집어요" style={{ ...chip(Boolean(layer.flipY)), flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Icon name="flipV" size={17} />상하 반전</button>
          </div>
          {(layer.fit || "free") === "free" && <>
          <div style={row}>
            <div style={{ ...label, marginBottom: 8 }}>자리</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, maxWidth: 260 }}>
              {GRID.map(([x, y, t]) => {
                const on = Math.abs((layer.x ?? 0.5) - x) < 0.01 && Math.abs((layer.y ?? 0.5) - y) < 0.01;
                return <button key={t} type="button" onClick={() => onChange({ x, y })} style={{ ...chip(on), padding: 0, height: 38, fontSize: 13 }}>{t}</button>;
              })}
            </div>
          </div>
          <div style={{ padding: "10px 16px 0" }}><Hint>미리보기에서 사진을 끌면 옮겨지고, 네 모서리 네모를 끌면 크기가 바뀌어요. 미리보기 옆 [크게]를 누르면 크게 보며 고칠 수 있어요.</Hint></div>
          <Slider title="크기" value={layer.w ?? 0.35} min={0.1} max={1} step={0.01} show={`${Math.round((layer.w ?? 0.35) * 100)}%`} onChange={(v) => onChange({ w: v })} />
          </>}
          <Slider title="진하기" value={layer.opacity ?? 1} min={0.2} max={1} step={0.05} show={`${Math.round((layer.opacity ?? 1) * 100)}%`} onChange={(v) => onChange({ opacity: v })} />
        </>
      )}

      {layer.type === "text" && (
        <>
          <div style={row}>
            <div style={{ ...label, marginBottom: 8 }}>글</div>
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => draft !== layer.text && onChange({ text: draft })} rows={3}
              style={{ ...input, height: "auto", padding: 10, lineHeight: 1.5, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <Btn small primary onClick={() => onChange({ text: draft })} disabled={draft === layer.text}>글 바꾸기</Btn>
            </div>
          </div>
          <Choice title="자리" value={typeof layer.x === "number" ? "free" : layer.pos || "top"} options={[["top", "상단"], ["middle", "가운데"], ["bottom", "하단"], ...(typeof layer.x === "number" ? [["free", "옮긴 자리"] as ["free", string]] : [])]}
            onChange={(v) => v !== "free" && onChange({ pos: v as Layer["pos"], x: undefined, y: undefined })} />
          <div style={{ padding: "10px 16px 0" }}><Hint>미리보기에서 글자를 끌면 옮겨지고, 네 모서리 네모를 끌면 크기가 바뀌어요. 미리보기 옆 [크게]를 누르면 크게 보며 고칠 수 있어요.</Hint></div>
          <Slider title="글자 크기" value={layer.size ?? 100} min={50} max={200} step={5} show={`${layer.size ?? 100}%`} onChange={(v) => onChange({ size: v })} />
          <div style={row}>
            <div style={{ ...label, marginBottom: 8 }}>글꼴</div>
            <FontPick value={layer.font} onChange={(f) => onChange({ font: f })} />
          </div>
          <div style={row}>
            <div style={{ ...label, marginBottom: 8 }}>글자 색</div>
            <ColorPick value={layer.color} onChange={(c) => onChange({ color: c })} />
          </div>
          <div style={{ ...row, display: "flex", alignItems: "center" }}>
            <span style={{ ...label, flex: 1 }}>글자 뒤 상자</span>
            <Toggle on={Boolean(layer.box)} onChange={(v) => onChange({ box: v })} />
          </div>
          {layer.box && (
            <>
              <div style={row}>
                <div style={{ ...label, marginBottom: 8 }}>상자 색</div>
                <ColorPick value={layer.boxColor || "#000000"} onChange={(c) => onChange({ boxColor: c })} />
              </div>
              <Slider title="상자 진하기" value={layer.boxOpacity ?? 0.62} min={0.1} max={1} step={0.05} show={`${Math.round((layer.boxOpacity ?? 0.62) * 100)}%`} onChange={(v) => onChange({ boxOpacity: v })} />
            </>
          )}
        </>
      )}
      </>}
    </Side>
  );
}

/* ── 아이콘을 누르면 바로 옆에 뜨는 작은 메뉴 (브루처럼) — 적용 범위·간단한 조절·삭제. 자세한 것은 오른쪽 칸 ── */
export function LayerPopup({ project, layer, items, selRange, x, y, onChange, onRemove, onClose, onAnim, onZ }: {
  onZ?: (o: ZMove) => void; // 겹치는 순서 (화면 글자)
  project: Project;
  layer: Layer;
  items: FlatItem[];
  selRange: { from: string; to: string; n: number } | null;
  x: number;
  y: number;
  onChange: (patch: Partial<Layer>) => void;
  onRemove: () => void;
  onClose: () => void;
  onAnim?: () => void; // 화면 글자 애니메이션 — 오른쪽 칸
}) {
  React.useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const cov = layerItems(project, layer, items);
  const pos = new Map(items.map((it, i) => [it.clip.id, i + 1]));
  const a = cov.length ? pos.get(cov[0].clip.id) : 0;
  const b = cov.length ? pos.get(cov[cov.length - 1].clip.id) : 0;
  // 숫자로 적용 범위 (클립 번호 1부터)
  const [na, setNa] = React.useState(String(a || 1));
  const [nb, setNb] = React.useState(String(b || 1));
  React.useEffect(() => {
    setNa(String(a || 1));
    setNb(String(b || 1));
  }, [a, b]);
  const applyNum = () => {
    const n = items.length;
    if (!n) return;
    let x = Math.max(1, Math.min(n, parseInt(na, 10) || 1));
    let z = Math.max(1, Math.min(n, parseInt(nb, 10) || x));
    if (x > z) [x, z] = [z, x];
    onChange({ from: items[x - 1].clip.id, to: items[z - 1].clip.id });
  };
  const numBox = (v: string, set: (s: string) => void) => (
    <input value={v} onChange={(e) => set(e.target.value.replace(/[^0-9]/g, ""))} data-num="1" onBlur={(e) => !(e.relatedTarget as HTMLElement | null)?.dataset?.num && applyNum()} onKeyDown={(e) => e.key === "Enter" && applyNum()} inputMode="numeric"
      style={{ ...input, width: 64, height: 36, padding: "0 8px", textAlign: "center", fontSize: 15, fontWeight: 700 }} />
  );
  const top = Math.max(8, Math.min(y, (typeof window !== "undefined" ? window.innerHeight : 900) - 420));
  const line: React.CSSProperties = { padding: "10px 12px", borderBottom: `1px solid ${C.line}` };
  const mini = (title: string, value: number, min: number, max: number, step: number, show: string, set: (v: number) => void) => (
    <div style={line}>
      <div style={{ display: "flex", fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}><span style={{ flex: 1 }}>{title}</span><span style={{ color: C.sub }}>{show}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(Number(e.target.value))} style={{ width: "100%", accentColor: C.accent }} />
    </div>
  );
  const sw = (title: string, on: boolean, set: (v: boolean) => void) => (
    <div style={{ ...line, display: "flex", alignItems: "center" }}><span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{title}</span><Toggle on={on} onChange={set} /></div>
  );
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 69 }} />
      <div onClick={(e) => e.stopPropagation()}
        style={{ position: "fixed", left: x, top, zIndex: 70, width: 270, background: C.panel, border: `1px solid ${C.line2}`, borderRadius: 8, boxShadow: "0 12px 36px rgba(0,0,0,0.45)", fontFamily: FONT, color: C.text, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: `1px solid ${C.line}` }}>
          <Icon name={layerIcon(layer)} size={17} />
          <span style={{ flex: 1, fontSize: 14, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{layerTitle(layer)}</span>
          <button type="button" onClick={onClose} title="닫기" style={{ border: 0, background: "transparent", color: C.sub, cursor: "pointer", padding: 0 }}><Icon name="close" size={18} /></button>
        </div>
        <div style={line}>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>적용 범위 <span style={{ color: C.sub, fontWeight: 600 }}>· 전체 클립 {items.length}개</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 14 }}>
            클립 {numBox(na, setNa)} ~ {numBox(nb, setNb)}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {selRange && <Btn small onClick={() => onChange({ from: selRange.from, to: selRange.to, ts: undefined, te: undefined })}>고른 클립 {selRange.n}개로</Btn>}
            {items.length > 0 && <Btn small onClick={() => onChange({ from: items[0].clip.id, to: items[items.length - 1].clip.id, ts: undefined, te: undefined })}>처음부터 끝까지</Btn>}
          </div>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 6 }}>막대 끝 손잡이를 끌어도 바뀌어요.</div>
        </div>
        {layer.type === "music" && (
          <>
            {mini("볼륨", layer.volume ?? 0.15, 0.03, 0.6, 0.01, `${Math.round((layer.volume ?? 0.15) * 100)}%`, (v) => onChange({ volume: v }))}
            {sw("페이드인 (점점 커지며 시작)", (layer.fadeIn ?? 0) > 0, (v) => onChange({ fadeIn: v ? 2 : 0 }))}
            {sw("페이드아웃 (점점 작아지며 끝)", (layer.fadeOut ?? 0) > 0, (v) => onChange({ fadeOut: v ? 2 : 0 }))}
            {sw("반복 (루프)", layer.loop !== false, (v) => onChange({ loop: v }))}
          </>
        )}
        {layer.type === "image" && (
          <>
            {mini("크기", layer.w ?? 0.35, 0.1, 1, 0.01, `${Math.round((layer.w ?? 0.35) * 100)}%`, (v) => onChange({ w: v }))}
            {mini("진하기", layer.opacity ?? 1, 0.2, 1, 0.05, `${Math.round((layer.opacity ?? 1) * 100)}%`, (v) => onChange({ opacity: v }))}
          </>
        )}
        {layer.type === "text" && mini("글자 크기", layer.size ?? 100, 40, 260, 5, `${layer.size ?? 100}%`, (v) => onChange({ size: v }))}
        {onAnim && (
          <div style={line}>
            <Btn small onClick={onAnim} style={{ width: "100%" }}><Icon name="transition" size={15} />애니메이션{layer.anim ? " · 들어감" : ""}</Btn>
          </div>
        )}
        {onZ && layer.type !== "music" && (
          <div style={line}>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>순서</div>
            <ZButtons can={zCan(project, items, layer.id)} onMove={onZ} />
          </div>
        )}
        <div style={{ padding: "8px 12px", display: "flex", alignItems: "center" }}>
          <span style={{ flex: 1, fontSize: 12, color: C.dim }}>자세한 설정은 오른쪽 칸</span>
          <Btn small onClick={onRemove} style={{ color: C.danger }}><Icon name="trash" size={15} />삭제</Btn>
        </div>
      </div>
    </>
  );
}
