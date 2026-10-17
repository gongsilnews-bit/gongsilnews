"use client";

// 애셋(레이어) — 브루처럼 클립 목록 왼쪽에 아이콘과 범위 막대, 누르면 오른쪽에 설정 칸
//  음악: 크기·페이드·시작 지점·반복 / 사진: 자리·크기·투명도 / 화면 글자: 글·자리·크기·색·상자
import React from "react";
import type { Clip, Fill, Layer, Project } from "./types";
import { fmtTime } from "./types";
import { type FlatItem, clipOrder, clipText, layerItems } from "./timeline";
import { Side } from "./Panels";
import { Btn, C, FONT, Hint, Icon, Toggle, VolumeControl, input, label } from "./ui";
import { ColorPick, FontPick } from "./Pickers";

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
    // 단어 구간으로 넣은 사진·글자는 왼쪽 줄에 안 그린다 (단어 앞 작은 표시로 보인다)
    .filter((layer) => typeof layer.w0 !== "number")
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

export type LayerDrag = (id: string, end: "from" | "to", ev: React.PointerEvent) => void;

/**
 * 카드 하나 옆의 줄들. idx = 이 카드의 차례. pass = 씬 제목·빈칸처럼 카드가 아닌 줄 (막대만 이어 그린다, idx 는 다음 카드 차례)
 * 위 아이콘을 끌면 시작 클립, 아래 손잡이를 끌면 끝 클립이 바뀐다 (아이콘을 그냥 누르면 설정 칸)
 */
export function Gutter({ entries, lanes, idx, pass, selLayer, onDrag }: { entries: LaneEntry[]; lanes: number; idx: number; pass?: boolean; selLayer: string; onDrag: LayerDrag }) {
  if (!lanes) return null;
  return (
    <div style={{ width: lanes * LANE_W + 6, flexShrink: 0, display: "flex" }}>
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
            <span style={{ position: "absolute", left: LANE_W / 2 - 1, width: 2, top: first ? 22 : 0, bottom: last ? 18 : 0, background: color, borderRadius: 1 }} />
            {last && (
              <span onPointerDown={(ev) => onDrag(e.layer.id, "to", ev)} onClick={(ev) => ev.stopPropagation()} title="위아래로 끌어서 끝 클립 바꾸기"
                style={{ position: "absolute", left: LANE_W / 2 - 11, width: 22, height: 14, bottom: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "ns-resize", touchAction: "none" }}>
                <span style={{ width: 16, height: 5, borderRadius: 3, background: color }} />
              </span>
            )}
            {first && (
              <button type="button" onPointerDown={(ev) => onDrag(e.layer.id, "from", ev)} onClick={(ev) => ev.stopPropagation()} title={`${LAYER_NAME[e.layer.type]}: ${layerTitle(e.layer)} (누르면 설정, 위아래로 끌면 시작 클립 바꾸기)`}
                style={{ position: "absolute", left: LANE_W / 2 - 13, top: 10, width: 26, height: 26, borderRadius: 6, border: `1.5px solid ${on ? C.accent : C.line2}`, background: on ? C.accent : C.panel2, color: on ? "#fff" : C.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "grab", padding: 0, touchAction: "none" }}>
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
export function VisualPanel({ project, clip, n, total, cur, many, sound, trim, onFit, onFlip, onReplace, onStart, onRange, onRemove, onClose }: {
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
            <button type="button" onClick={onReplace} title="눌러서 음악 바꾸기"
              style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", border: `1px solid ${C.line2}`, borderRadius: 6, background: C.card, color: C.text, fontSize: 15, fontWeight: 700, fontFamily: FONT, cursor: "pointer", textAlign: "left" }}>
              <Icon name="music" size={18} />
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{layer.name || "음악"}</span>
            </button>
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
            <button type="button" onClick={onReplace} title="눌러서 사진 바꾸기" style={{ flex: 1, minWidth: 0, padding: 0, border: 0, background: "transparent", color: C.text, fontSize: 14.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer", textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset?.name || "사진"}</button>
            <Btn small onClick={onReplace}>사진 바꾸기</Btn>
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
    </Side>
  );
}

/* ── 아이콘을 누르면 바로 옆에 뜨는 작은 메뉴 (브루처럼) — 적용 범위·간단한 조절·삭제. 자세한 것은 오른쪽 칸 ── */
export function LayerPopup({ project, layer, items, selRange, x, y, onChange, onRemove, onClose, onAnim }: {
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
          <Icon name={LAYER_ICON[layer.type]} size={17} />
          <span style={{ flex: 1, fontSize: 14, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{layerTitle(layer)}</span>
          <button type="button" onClick={onClose} title="닫기" style={{ border: 0, background: "transparent", color: C.sub, cursor: "pointer", padding: 0 }}><Icon name="close" size={18} /></button>
        </div>
        <div style={line}>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>적용 범위 <span style={{ color: C.sub, fontWeight: 600 }}>· 전체 클립 {items.length}개</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 14 }}>
            클립 {numBox(na, setNa)} ~ {numBox(nb, setNb)}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {selRange && <Btn small onClick={() => onChange({ from: selRange.from, to: selRange.to })}>고른 클립 {selRange.n}개로</Btn>}
            {items.length > 0 && <Btn small onClick={() => onChange({ from: items[0].clip.id, to: items[items.length - 1].clip.id })}>처음부터 끝까지</Btn>}
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
        <div style={{ padding: "8px 12px", display: "flex", alignItems: "center" }}>
          <span style={{ flex: 1, fontSize: 12, color: C.dim }}>자세한 설정은 오른쪽 칸</span>
          <Btn small onClick={onRemove} style={{ color: C.danger }}><Icon name="trash" size={15} />삭제</Btn>
        </div>
      </div>
    </>
  );
}
