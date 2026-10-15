"use client";

// 애셋(레이어) — 브루처럼 클립 목록 왼쪽에 아이콘과 범위 막대, 누르면 오른쪽에 설정 칸
//  음악: 크기·페이드·시작 지점·반복 / 사진: 자리·크기·투명도 / 화면 글자: 글·자리·크기·색·상자
import React from "react";
import type { Layer, Project } from "./types";
import { type FlatItem, clipOrder, clipText, layerItems } from "./timeline";
import { Side } from "./Panels";
import { Btn, C, FONT, Hint, Icon, Toggle, input, label } from "./ui";

export const LAYER_ICON: Record<Layer["type"], string> = { music: "music", image: "image", text: "text" };
export const LAYER_NAME: Record<Layer["type"], string> = { music: "배경 음악", image: "사진 올리기", text: "화면 글자" };
export const layerTitle = (l: Layer) => (l.type === "text" ? String(l.text || "").trim() || "화면 글자" : l.name || LAYER_NAME[l.type]);

/* ── 클립 목록 왼쪽 줄 ── */
export type LaneEntry = { layer: Layer; lane: number; a: number; b: number }; // a·b = 보이는 클립 차례

/** 애셋마다 줄(lane)을 나눠 준다 — 겹치는 애셋은 옆 줄로 */
export function computeLanes(p: Project, items: FlatItem[]): { entries: LaneEntry[]; lanes: number } {
  const order = clipOrder(p);
  const pos = new Map(items.map((x, i) => [x.clip.id, i]));
  const spans = (p.layers || [])
    .map((layer) => {
      const cov = layerItems(p, layer, items, order);
      return cov.length ? { layer, a: pos.get(cov[0].clip.id)!, b: pos.get(cov[cov.length - 1].clip.id)! } : null;
    })
    .filter(Boolean) as { layer: Layer; a: number; b: number }[];
  spans.sort((x, y) => x.a - y.a || y.b - x.b);
  const laneEnd: number[] = [];
  const entries: LaneEntry[] = [];
  for (const sp of spans) {
    let lane = laneEnd.findIndex((e) => e < sp.a);
    if (lane < 0) {
      lane = laneEnd.length;
      laneEnd.push(sp.b);
    } else laneEnd[lane] = sp.b;
    entries.push({ ...sp, lane });
  }
  return { entries, lanes: laneEnd.length };
}

const LANE_W = 30;

/**
 * 카드 하나 옆의 줄들. idx = 이 카드의 차례. pass = 씬 제목·빈칸처럼 카드가 아닌 줄 (막대만 이어 그린다, idx 는 다음 카드 차례)
 */
export function Gutter({ entries, lanes, idx, pass, selLayer, onOpen }: { entries: LaneEntry[]; lanes: number; idx: number; pass?: boolean; selLayer: string; onOpen: (id: string) => void }) {
  if (!lanes) return null;
  return (
    <div style={{ width: lanes * LANE_W + 6, flexShrink: 0, display: "flex" }}>
      {Array.from({ length: lanes }, (_, lane) => {
        const e = entries.find((x) => x.lane === lane && (pass ? x.a < idx && x.b >= idx : x.a <= idx && x.b >= idx));
        if (!e) return <div key={lane} style={{ width: LANE_W }} />;
        const on = e.layer.id === selLayer;
        const color = on ? C.accent : C.line2;
        const first = !pass && e.a === idx;
        const last = !pass && e.b === idx;
        return (
          <div key={lane} style={{ width: LANE_W, position: "relative" }}>
            <span style={{ position: "absolute", left: LANE_W / 2 - 1, width: 2, top: first ? 22 : 0, bottom: last ? 18 : 0, background: color, borderRadius: 1 }} />
            {last && <span style={{ position: "absolute", left: LANE_W / 2 - 5, width: 10, height: 2, bottom: 18, background: color }} />}
            {first && (
              <button type="button" onClick={(ev) => { ev.stopPropagation(); onOpen(e.layer.id); }} title={`${LAYER_NAME[e.layer.type]}: ${layerTitle(e.layer)}`}
                style={{ position: "absolute", left: LANE_W / 2 - 13, top: 10, width: 26, height: 26, borderRadius: 6, border: `1.5px solid ${on ? C.accent : C.line2}`, background: on ? C.accent : C.panel2, color: on ? "#fff" : C.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                <Icon name={LAYER_ICON[e.layer.type]} size={15} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── 오른쪽 설정 칸 ── */
const chip = (on: boolean): React.CSSProperties => ({ height: 34, padding: "0 12px", borderRadius: 5, border: `1px solid ${on ? C.text : C.line2}`, background: on ? C.text : "transparent", color: on ? C.bg : C.sub, fontSize: 14, fontWeight: 700, fontFamily: FONT, cursor: "pointer" });
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

const FADES: [number, string][] = [[0, "없음"], [1, "1초"], [2, "2초"], [3, "3초"]];
const COLORS: [string, string][] = [["#FFFFFF", "흰색"], ["#111111", "검정"], ["#FFD400", "노랑"]];
const GRID: [number, number, string][] = [
  [0.2, 0.18, "왼쪽 위"], [0.5, 0.18, "위"], [0.8, 0.18, "오른쪽 위"],
  [0.2, 0.5, "왼쪽"], [0.5, 0.5, "가운데"], [0.8, 0.5, "오른쪽"],
  [0.2, 0.82, "왼쪽 아래"], [0.5, 0.82, "아래"], [0.8, 0.82, "오른쪽 아래"],
];

export function LayerPanel({ project, layer, items, selRange, onChange, onRemove, onReplace, onClose }: {
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
  React.useEffect(() => setDraft(layer.text || ""), [layer.id]); // eslint-disable-line react-hooks/exhaustive-deps
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
    if (key === "from" && (pos.get(id) ?? 0) > (pos.get(other) ?? 0)) onChange({ from: other, to: id });
    else if (key === "to" && (pos.get(id) ?? 0) < (pos.get(other) ?? 0)) onChange({ from: id, to: other });
    else onChange({ [key]: id });
  };

  return (
    <Side title={LAYER_NAME[layer.type]} onClose={onClose}
      footer={<Btn small onClick={onRemove} style={{ color: C.danger }}><Icon name="trash" size={16} />이 {LAYER_NAME[layer.type]} 지우기</Btn>}>
      {/* 적용 범위 */}
      <div style={row}>
        <div style={{ ...label, marginBottom: 8 }}>적용 범위 <span style={{ color: C.sub, fontWeight: 600 }}>· 클립 {cov.length}개</span></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <select value={layer.from} onChange={(e) => pickClip("from", e.target.value)} style={input}>
            {items.map((x, i) => <option key={x.clip.id} value={x.clip.id}>{clipLabel(x, i)}</option>)}
          </select>
          <div style={{ fontSize: 13.5, color: C.sub, textAlign: "center" }}>부터</div>
          <select value={layer.to} onChange={(e) => pickClip("to", e.target.value)} style={input}>
            {items.map((x, i) => <option key={x.clip.id} value={x.clip.id}>{clipLabel(x, i)}</option>)}
          </select>
          <div style={{ fontSize: 13.5, color: C.sub, textAlign: "center" }}>까지</div>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {selRange && <Btn small onClick={() => onChange({ from: selRange.from, to: selRange.to })}>고른 클립 {selRange.n}개로 바꾸기</Btn>}
          {items.length > 0 && <Btn small onClick={() => onChange({ from: items[0].clip.id, to: items[items.length - 1].clip.id })}>처음부터 끝까지</Btn>}
        </div>
      </div>

      {layer.type === "music" && (
        <>
          <div style={{ ...row, display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="music" size={18} />
            <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{layer.name || "음악"}</span>
            <Btn small onClick={onReplace}>음악 바꾸기</Btn>
          </div>
          <Slider title="음악 크기" value={layer.volume ?? 0.15} min={0.03} max={0.6} step={0.01} show={`${Math.round((layer.volume ?? 0.15) * 100)}%`} onChange={(v) => onChange({ volume: v })} />
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
            <span style={{ flex: 1, fontSize: 14.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset?.name || "사진"}</span>
            <Btn small onClick={onReplace}>사진 바꾸기</Btn>
          </div>
          <div style={row}>
            <div style={{ ...label, marginBottom: 8 }}>자리</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, maxWidth: 260 }}>
              {GRID.map(([x, y, t]) => {
                const on = Math.abs((layer.x ?? 0.5) - x) < 0.01 && Math.abs((layer.y ?? 0.5) - y) < 0.01;
                return <button key={t} type="button" onClick={() => onChange({ x, y })} style={{ ...chip(on), padding: 0, height: 38, fontSize: 13 }}>{t}</button>;
              })}
            </div>
          </div>
          <Slider title="크기" value={layer.w ?? 0.35} min={0.1} max={1} step={0.01} show={`${Math.round((layer.w ?? 0.35) * 100)}%`} onChange={(v) => onChange({ w: v })} />
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
          <Choice title="자리" value={layer.pos || "top"} options={[["top", "상단"], ["middle", "가운데"], ["bottom", "하단"]]} onChange={(v) => onChange({ pos: v })} />
          <Slider title="글자 크기" value={layer.size ?? 100} min={50} max={200} step={5} show={`${layer.size ?? 100}%`} onChange={(v) => onChange({ size: v })} />
          <Choice title="글자 색" value={(layer.color || "#FFFFFF").toUpperCase()} options={COLORS} onChange={(v) => onChange({ color: v })} />
          <div style={{ ...row, display: "flex", alignItems: "center" }}>
            <span style={{ ...label, flex: 1 }}>글자 뒤 검은 상자</span>
            <Toggle on={Boolean(layer.box)} onChange={(v) => onChange({ box: v })} />
          </div>
        </>
      )}
    </Side>
  );
}
