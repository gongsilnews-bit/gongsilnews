"use client";

// 사진·영상 메뉴 — 브루처럼 클립 화면 썸네일이나 사진 올리기 아이콘을 누르면 바로 옆에 뜬다.
// 채우기·반전·교체·적용 범위·순서·삭제. 항목에 마우스를 올리면 옆에 설명이 뜬다
import React from "react";
import { C, FONT, Icon, VolumeControl, input } from "./ui";

export type MediaFit = "free" | "contain" | "cover" | "blur";
export type MediaOrder = "top" | "up" | "down" | "bottom";

const FIT_INFO: Record<MediaFit, { icon: string; label: string; desc: string }> = {
  free: { icon: "fitFree", label: "직접 크기", desc: "미리보기에서 끌어 자리와 크기를 마음대로 정해요" },
  contain: { icon: "fitContain", label: "비율 유지하며 채우기", desc: "사진이 잘리지 않게 화면 안에 다 보여요. 비율이 다르면 위아래나 양옆이 비어요" },
  cover: { icon: "fitCover", label: "잘라서 채우기", desc: "빈 곳 없이 화면을 꽉 채워요. 비율이 다르면 사진 가장자리가 잘려요" },
  blur: { icon: "fill", label: "흐린 배경으로 채우기", desc: "사진은 다 보이게 두고, 빈 곳은 같은 사진을 흐리게 깔아 채워요" },
};

// 사진 움직임 (브루처럼)
export const MOTION_INFO: { id: string; label: string; desc: string }[] = [
  { id: "auto", label: "자동", desc: "사진 클립마다 차례로 줌인·좌→우·줌아웃·우→좌·위→아래로 바뀌어요 (옆 클립과 겹치지 않게)" },
  { id: "none", label: "움직임 없음", desc: "사진이 가만히 있어요" },
  { id: "zoomIn", label: "줌인", desc: "천천히 다가가며 커져요" },
  { id: "zoomOut", label: "줌아웃", desc: "크게 시작해서 천천히 멀어져요" },
  { id: "leftRight", label: "좌 → 우", desc: "왼쪽에서 오른쪽으로 천천히 훑어요" },
  { id: "rightLeft", label: "우 → 좌", desc: "오른쪽에서 왼쪽으로 천천히 훑어요" },
  { id: "topBottom", label: "위 → 아래", desc: "위에서 아래로 천천히 훑어요" },
  { id: "bottomTop", label: "아래 → 위", desc: "아래에서 위로 천천히 훑어요" },
];
const POWER_LABEL: Record<string, string> = { low: "약하게", mid: "보통", high: "강하게" };

type Props = {
  title: string;
  x: number;
  y: number;
  kind: "clip" | "layer";
  /** 무엇의 메뉴 — 사진 · 스티커 · 글자 · 음악 · 효과음 (아래 안내·설명에) */
  what?: string;
  /** 그 종류만의 것 (맨 위) — 누르면 하고 닫힌다 */
  extra?: { icon: string; label: string; desc: string; run: () => void }[];
  /** 삭제 바로 위에 넣는 항목 (글자 → 메인자막으로 바꾸기, 2026-10-25) */
  extraEnd?: { icon: string; label: string; desc: string; run: () => void }[];
  /** [크기·설정 ›] 안의 끌개 · 켜고 끄기 (글자 크기 · 사진 크기·진하기 · 음악 볼륨·페이드) */
  sliders?: { label: string; value: number; min: number; max: number; step: number; show: string; onChange: (v: number) => void }[];
  toggles?: { label: string; on: boolean; set: (v: boolean) => void }[];
  /** 영상 속도 (촬영·녹화 영상 클립만) — 0.25~4배, 소리·자막도 같이 */
  speedCtl?: { value: number; onChange: (v: number) => void };
  /** 적용 범위 — 고른 클립들 (2개 이상 골랐을 때) */
  sel?: { a: number; b: number; n: number } | null;
  fit?: MediaFit;
  fits?: MediaFit[];
  flipX?: boolean;
  flipY?: boolean;
  /** 적용 범위 — 지금 범위(클립 번호 1부터), 지금 클립 번호, 전체 클립 수 */
  range: { a: number; b: number; cur: number; total: number };
  /** 순서 (사진 올리기만) — 앞으로/뒤로 갈 수 있는지 */
  order?: { up: boolean; down: boolean };
  canRemove: boolean;
  onFit?: (f: MediaFit) => void;
  onFlip?: (axis: "x" | "y") => void;
  onReplace?: () => void;
  onStart?: () => void; // 비디오 시작점 변경 (영상일 때만)
  trim?: boolean; // 녹화·촬영 영상 클립이면 "시작·끝 자르기"로
  /** 클립 소리 (원본 소리가 있는 영상 클립만) */
  sound?: { muted: boolean; value: number; onMute: (v: boolean) => void; onVolume: (v: number, first: boolean) => void; none?: boolean /* 소리 없는 영상 — 흐리게 */; note?: string };
  onRange: (a: number, b: number) => void;
  /** 사진 움직임 (클립 화면이 사진일 때만) — 지금 값, 크기, 고른 클립 수·사진 클립 수, 바꾸기 (적용 범위 one/sel/all) */
  motion?: { value: string; power: string; selCount: number; allCount: number; onPick: (m: string, scope: "one" | "sel" | "all") => void; onPower: (pw: string, scope: "one" | "sel" | "all") => void };
  onOrder?: (o: MediaOrder) => void;
  onAnim?: () => void; // 애니메이션 (사진 올리기만) — 오른쪽 칸
  onRemove: () => void;
  onClose: () => void;
  /** AI 이미지 생성하기 (클립 화면, 2026-10-31 사장님) — 스타일을 고르면 이 클립 대사로 그림을 그려 바꾼다. last = 지난번 스타일 */
  ai?: { last?: { id: string; label: string }; styles: { id: string; label: string; desc: string; thumb?: string; bg: string }[]; onPick: (id: string) => void };
};

type Item = { icon: string; label: string; desc: string; on?: boolean; off?: boolean; sub?: boolean; danger?: boolean; run: () => void };

export default function MediaMenu(p: Props) {
  const [page, setPage] = React.useState<"" | "fit" | "flip" | "range" | "order" | "volume" | "motion" | "size" | "speed" | "ai">("");
  const [mScope, setMScope] = React.useState<"one" | "sel" | "all">("one");
  const [hover, setHover] = React.useState<{ desc: string; top: number } | null>(null);
  const [na, setNa] = React.useState(String(p.range.a));
  const [nb, setNb] = React.useState(String(p.range.b));
  React.useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && p.onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [p]);
  React.useEffect(() => setHover(null), [page]);
  // 바깥을 누르면 닫는다 — 화면을 덮는 막 없이 (막이 있으면 아이콘을 바로 끌 수 없었다, 2026-10-19). 누른 것은 그대로 동작한다
  const boxRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const down = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) p.onClose();
    };
    const t = setTimeout(() => window.addEventListener("pointerdown", down, true), 0); // 메뉴를 연 그 누르기는 빼고
    return () => { clearTimeout(t); window.removeEventListener("pointerdown", down, true); };
  }, [p]);

  const what = p.what || (p.kind === "clip" ? "화면" : "사진");
  const { a, b, cur, total } = p.range;
  const go = (pg: typeof page) => () => setPage(pg);
  const done = (f: () => void) => () => {
    f();
    p.onClose();
  };
  const applyNum = () => {
    let x = Math.max(1, Math.min(total, parseInt(na, 10) || 1));
    let z = Math.max(1, Math.min(total, parseInt(nb, 10) || x));
    if (x > z) [x, z] = [z, x];
    p.onRange(x, z);
    p.onClose();
  };

  let head = "";
  let items: Item[] = [];
  if (page === "") {
    // 모든 애셋이 같은 차례: ① 그 종류만의 것 → ② 애니메이션 → ③ 적용 범위 → ④ 순서 → 삭제 (회의 2026-10-19)
    items = [
      ...(p.extra || []).map((x) => ({ ...x, run: done(x.run) })),
      ...(p.sliders?.length || p.toggles?.length ? [{ icon: "ratio", label: p.what === "글자" ? "글자 크기" : p.what === "음악" || p.what === "효과음" ? "소리 크기" + (p.toggles?.length ? "·페이드" : "") : "크기·진하기", desc: "끌개로 바로 바꿔요 (미리보기에 바로 보여요)", sub: true, run: go("size") }] : []),
      ...(p.fit && p.onFit ? [{ icon: FIT_INFO[p.fit].icon, label: "채우기", desc: "화면에 어떻게 채울지 골라요", sub: true, run: go("fit") }] : []),
      ...(p.onFlip ? [{ icon: "flipH", label: "반전", desc: "거울처럼 좌우나 위아래를 뒤집어요", sub: true, run: go("flip") }] : []),
      ...(p.onAnim ? [{ icon: "transition", label: "애니메이션", desc: "나타날 때·사라질 때 움직임, 강조, 천천히 커지기를 넣어요 (오른쪽 칸)", run: done(p.onAnim) }] : []),
      ...(p.motion ? [{ icon: "zoom", label: `움직임 · ${MOTION_INFO.find((x) => x.id === p.motion!.value)?.label || "자동"}`, desc: "사진이 줌인·좌우·상하로 천천히 움직여요. 기본은 자동", sub: true, run: go("motion") }] : []),
      ...(p.onStart ? [p.trim
        ? { icon: "cut", label: "시작·끝 자르기", desc: "영상 앞뒤를 잘라 쓸 부분만 남겨요 (프리미어·캡컷처럼). 소리·자막도 같이 잘려요", run: done(p.onStart) }
        : { icon: "video", label: "비디오 시작점 변경", desc: "영상의 어느 부분부터 쓸지 골라요. 고르지 않으면 처음부터 나가요", run: done(p.onStart) }] : []),
      ...(p.speedCtl ? [{ icon: "play", label: `속도 · ${+p.speedCtl.value.toFixed(2)}배`, desc: "영상을 빠르게·느리게 (소리·자막도 같이). 1배가 원래 속도", sub: true, run: go("speed") }] : []),
      ...(p.sound ? [{ icon: p.sound.muted ? "mute" : "volume", label: "볼륨 조절", desc: "이 클립의 소리를 끄거나 크게·작게 해요", sub: true, run: go("volume") }] : []),
      ...(p.onReplace ? [{ icon: "swap", label: "교체", desc: `다른 ${p.what === "그래픽" ? "그래픽으" : "사진·영상으"}로 바꿔요. 자리·범위는 그대로예요`, run: done(p.onReplace) }] : []),
      ...(p.ai?.last ? [{ icon: "ai", label: `${p.ai.last.label} 스타일로 다시 만들기`, desc: "지난번에 고른 스타일로 이 클립 대사에 맞는 그림을 바로 그려요", run: done(() => p.ai!.onPick(p.ai!.last!.id)) }] : []),
      ...(p.ai ? [{ icon: "ai", label: "AI 이미지 생성하기", desc: "스타일을 고르면 이 클립 대사에 맞는 그림을 그려 화면을 바꿔요 (30초~1분)", sub: true, run: go("ai") }] : []),
      { icon: "range", label: "적용 범위 변경", desc: p.kind === "clip" ? "이 화면을 다른 클립에도 똑같이 써요" : `이 ${what}이(가) 몇 번 클립부터 몇 번 클립까지 나올지 정해요`, sub: true, run: go("range") },
      ...(p.kind === "layer" && p.order ? [{ icon: "layers", label: "순서", desc: "그래픽·사진·글자가 겹칠 때 어느 것을 위에 둘지 정해요", sub: true, off: !p.order.up && !p.order.down, run: go("order") }] : []),
      ...(p.extraEnd || []).map((x) => ({ ...x, run: done(x.run) })),
      { icon: "trash", label: "삭제", desc: p.kind === "clip" ? "이 클립의 화면만 지워요. 글·목소리·자막은 그대로예요" : `이 ${what}을(를) 지워요`, danger: true, off: !p.canRemove, run: done(p.onRemove) },
    ];
  } else if (page === "fit") {
    head = "채우기";
    items = (p.fits || []).map((f) => ({ icon: FIT_INFO[f].icon, label: FIT_INFO[f].label, desc: FIT_INFO[f].desc, on: p.fit === f, run: done(() => p.onFit?.(f)) }));
  } else if (page === "flip") {
    head = "반전";
    items = [
      { icon: "flipH", label: "좌우 반전", desc: "왼쪽과 오른쪽을 거울처럼 뒤집어요. 한 번 더 누르면 원래대로", on: p.flipX, run: done(() => p.onFlip?.("x")) },
      { icon: "flipV", label: "상하 반전", desc: "위와 아래를 뒤집어요. 한 번 더 누르면 원래대로", on: p.flipY, run: done(() => p.onFlip?.("y")) },
    ];
  } else if (page === "range") {
    head = "적용 범위 변경";
    items = [
      ...(p.sel && p.sel.n > 1 ? [{ icon: "applySel", label: `고른 클립 ${p.sel.n}개로`, desc: `고른 클립 ${p.sel.a}번부터 ${p.sel.b}번까지`, on: a === p.sel.a && b === p.sel.b, run: done(() => p.onRange(p.sel!.a, p.sel!.b)) }] : []),
      { icon: "range", label: "이 클립에만", desc: `클립 ${cur}번에서만`, on: a === cur && b === cur, run: done(() => p.onRange(cur, cur)) },
      { icon: "range", label: "전체 클립으로 (처음부터 끝까지)", desc: `클립 1번부터 ${total}번까지 모두`, on: a === 1 && b === total, run: done(() => p.onRange(1, total)) },
      { icon: "range", label: "처음부터 현재 클립까지", desc: `클립 1번부터 ${cur}번까지`, run: done(() => p.onRange(1, cur)) },
      { icon: "range", label: "현재 클립부터 끝까지", desc: `클립 ${cur}번부터 ${total}번까지`, run: done(() => p.onRange(cur, total)) },
    ];
  } else if (page === "ai") {
    head = "AI 이미지 생성하기";
  } else if (page === "volume") {
    head = "볼륨 조절";
  } else if (page === "speed") {
    head = "속도";
  } else if (page === "size") {
    head = p.what === "글자" ? "글자 크기" : p.what === "음악" || p.what === "효과음" ? "소리" : "크기·진하기";
  } else if (page === "motion" && p.motion) {
    head = "움직임";
    const mo = p.motion;
    items = MOTION_INFO.map((x) => ({ icon: x.id === "none" ? "close" : "zoom", label: x.label, desc: x.desc, on: mo.value === x.id, run: done(() => mo.onPick(x.id, mScope)) }));
  } else if (page === "order") {
    head = "순서";
    const o = p.order || { up: false, down: false };
    items = [
      { icon: "front", label: "맨 앞으로 가져오기", desc: "겹친 그래픽·사진·글자 중 가장 위에 보이게", off: !o.up, run: done(() => p.onOrder?.("top")) },
      { icon: "front", label: "앞으로 가져오기", desc: "한 칸 위로", off: !o.up, run: done(() => p.onOrder?.("up")) },
      { icon: "down", label: "뒤로 보내기", desc: "한 칸 아래로", off: !o.down, run: done(() => p.onOrder?.("down")) },
      { icon: "down", label: "맨 뒤로 보내기", desc: "겹친 것 중 가장 아래로 (클립 화면보다는 늘 위)", off: !o.down, run: done(() => p.onOrder?.("bottom")) },
    ];
  }

  const W = 250;
  const left = Math.max(8, Math.min(p.x, (typeof window !== "undefined" ? window.innerWidth : 1600) - W - 260));
  const top = Math.max(8, Math.min(p.y, (typeof window !== "undefined" ? window.innerHeight : 900) - 360));
  return (
    <>
      <div ref={boxRef} onClick={(e) => e.stopPropagation()} onMouseLeave={() => setHover(null)}
        style={{ position: "fixed", left, top, zIndex: 70, width: W, padding: 6, background: C.panel, border: `1px solid ${C.line2}`, borderRadius: 8, boxShadow: "0 12px 36px rgba(0,0,0,0.45)", fontFamily: FONT, color: C.text }}>
        {head ? (
          <button type="button" onClick={go("")} style={{ ...rowStyle, fontWeight: 800, color: C.text }}>
            <Icon name="back" size={16} color={C.sub} />
            {head}
          </button>
        ) : (
          <div style={{ padding: "6px 10px 8px", fontSize: 12.5, color: C.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
        )}
        {items.map((it, i) => (
          <React.Fragment key={it.label}>
            {it.danger && <div style={{ height: 1, background: C.line, margin: "4px 6px" }} />}
            <button type="button" disabled={it.off} onClick={it.run}
              onMouseEnter={(e) => setHover({ desc: it.desc, top: (e.currentTarget as HTMLElement).offsetTop })}
              style={{ ...rowStyle, color: it.off ? C.dim : it.danger ? C.danger : C.text, cursor: it.off ? "default" : "pointer", background: it.on ? C.accentDim : "transparent" }}
              onMouseOver={(e) => { if (!it.off && !it.on) (e.currentTarget as HTMLElement).style.background = C.cardHover; }}
              onMouseOut={(e) => { if (!it.on) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              data-i={i}>
              <Icon name={it.icon} size={17} />
              <span style={{ flex: 1, textAlign: "left" }}>{it.label}</span>
              {it.on && <Icon name="check" size={15} color={C.accent} />}
              {it.sub && <Icon name="chevron" size={14} color={C.sub} />}
            </button>
          </React.Fragment>
        ))}
        {page === "motion" && p.motion && (
          <div style={{ padding: "8px 10px 6px", borderTop: `1px solid ${C.line}`, marginTop: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>크기</div>
            <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
              {["low", "mid", "high"].map((pw) => (
                <button key={pw} type="button" onClick={() => p.motion!.onPower(pw, mScope)} style={{ ...chipStyle(p.motion!.power === pw), flex: 1 }}>{POWER_LABEL[pw]}</button>
              ))}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>적용 범위 <span style={{ color: C.dim, fontWeight: 600, fontSize: 11.5 }}>· 고르고 위에서 움직임을 누르세요</span></div>
            <div style={{ display: "flex", gap: 5 }}>
              <button type="button" onClick={() => setMScope("one")} style={{ ...chipStyle(mScope === "one"), flex: 1 }}>이 클립에만</button>
              <button type="button" disabled={p.motion.selCount < 2} onClick={() => setMScope("sel")} style={{ ...chipStyle(mScope === "sel"), flex: 1, opacity: p.motion.selCount < 2 ? 0.4 : 1 }}>선택 ({p.motion.selCount})</button>
              <button type="button" onClick={() => setMScope("all")} style={{ ...chipStyle(mScope === "all"), flex: 1 }}>모든 사진 ({p.motion.allCount})</button>
            </div>
          </div>
        )}
        {page === "ai" && p.ai && (
          <div style={{ padding: "6px 4px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, maxHeight: 340, overflowY: "auto" }}>
            {p.ai.styles.map((s) => (
              <button key={s.id} type="button" title={s.desc} onClick={done(() => p.ai!.onPick(s.id))}
                style={{ position: "relative", height: 46, borderRadius: 6, border: 0, outline: p.ai!.last?.id === s.id ? `2px solid ${C.accent}` : "none", outlineOffset: -2, background: s.thumb ? `center / cover no-repeat url("${s.thumb}"), ${s.bg}` : s.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <span style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
                <span style={{ position: "relative", color: "#fff", fontSize: 12.5, fontWeight: 800, fontFamily: FONT, textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>{s.label}</span>
              </button>
            ))}
          </div>
        )}
        {page === "speed" && p.speedCtl && (
          <div style={{ padding: "6px 10px 6px" }}>
            <div style={{ display: "flex", fontSize: 13, fontWeight: 700, marginBottom: 4 }}><span style={{ flex: 1 }}>빠르기</span><span style={{ color: C.sub }}>{+p.speedCtl.value.toFixed(2)}배</span></div>
            <input type="range" min={0.25} max={4} step={0.05} value={Math.min(4, Math.max(0.25, p.speedCtl.value))} onChange={(e) => p.speedCtl!.onChange(+Number(e.target.value).toFixed(2))} style={{ width: "100%", accentColor: C.accent }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 5, marginTop: 6 }}>
              {[0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4].map((v) => (
                <button key={v} type="button" onClick={() => p.speedCtl!.onChange(v)} style={chipStyle(Math.abs(p.speedCtl!.value - v) < 0.001)}>{v}배</button>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: C.dim, marginTop: 8, lineHeight: 1.5 }}>빠르게 하면 클립이 짧아지고, 느리게 하면 길어져요. 소리 높낮이는 그대로예요.</div>
          </div>
        )}
        {page === "size" && (
          <div style={{ padding: "6px 10px 6px" }}>
            {(p.sliders || []).map((s) => (
              <div key={s.label} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", fontSize: 13, fontWeight: 700, marginBottom: 4 }}><span style={{ flex: 1 }}>{s.label}</span><span style={{ color: C.sub }}>{s.show}</span></div>
                <input type="range" min={s.min} max={s.max} step={s.step} value={s.value} onChange={(e) => s.onChange(Number(e.target.value))} style={{ width: "100%", accentColor: C.accent }} />
              </div>
            ))}
            {(p.toggles || []).map((t) => (
              <label key={t.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, padding: "5px 0", cursor: "pointer" }}>
                <input type="checkbox" checked={t.on} onChange={(e) => t.set(e.target.checked)} style={{ width: 16, height: 16, accentColor: C.accent }} />{t.label}
              </label>
            ))}
          </div>
        )}
        {page === "volume" && p.sound && (
          <div style={{ padding: "8px 10px 6px" }}>
            {p.sound.none ? (
              <div style={{ fontSize: 13.5, color: C.dim, padding: "6px 2px" }}>이 영상에는 소리가 없어요.</div>
            ) : (
              <VolumeControl muted={p.sound.muted} value={p.sound.value} onMute={p.sound.onMute} onVolume={p.sound.onVolume} />
            )}
            {p.sound.note && <div style={{ fontSize: 12, color: C.dim, marginTop: 6, lineHeight: 1.5 }}>{p.sound.note}</div>}
          </div>
        )}
        {page === "range" && (
          <div style={{ padding: "8px 10px 6px", borderTop: `1px solid ${C.line}`, marginTop: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>직접 입력 <span style={{ color: C.dim, fontWeight: 600 }}>· 지금 {a}~{b}번</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5 }}>
              클립
              <input value={na} onChange={(e) => setNa(e.target.value.replace(/[^0-9]/g, ""))} onKeyDown={(e) => e.key === "Enter" && applyNum()} inputMode="numeric" style={numStyle} />
              ~
              <input value={nb} onChange={(e) => setNb(e.target.value.replace(/[^0-9]/g, ""))} onKeyDown={(e) => e.key === "Enter" && applyNum()} inputMode="numeric" style={numStyle} />
              <button type="button" onClick={applyNum} style={{ height: 32, padding: "0 10px", borderRadius: 5, border: 0, background: C.accent, color: "#fff", fontSize: 13, fontWeight: 800, fontFamily: FONT, cursor: "pointer" }}>적용</button>
            </div>
          </div>
        )}
        {page === "" && <div style={{ padding: "6px 10px 2px", fontSize: 11.5, color: C.dim }}>{what} 메뉴 · Esc 로 닫기</div>}
        {/* 마우스를 올린 항목 설명 — 메뉴 바로 옆에 */}
        {hover && (
          <div style={{ position: "absolute", left: W + 6, top: hover.top, width: 230, padding: "8px 10px", borderRadius: 6, background: "#111", border: `1px solid ${C.line2}`, color: "#eee", fontSize: 12.5, lineHeight: 1.5, pointerEvents: "none", boxShadow: "0 6px 18px rgba(0,0,0,0.4)" }}>
            {hover.desc}
          </div>
        )}
      </div>
    </>
  );
}

/** 클립 아이콘 메뉴 — 사진·글자·효과음 메뉴와 같은 생김새 (2026-10-21 사장님: 통일성, 깔끔하게)
 *  1차 = 항목 목록 · 2차 = 항목을 누르면 같은 상자 안에서 바로 고치기 (‹ 로 돌아감). run 만 있으면 하고 닫힌다 */
export type QuickItem = { icon: string; iconEl?: React.ReactNode /* 아이콘 대신 그림 (화면 비율 상자 등) */; label: string; desc: string; run?: () => void; page?: () => React.ReactNode; on?: boolean; danger?: boolean };
export function QuickMenu({ title, what, x, y, items, onClose, z = 70 }: { title: string; what: string; x: number; y: number; items: QuickItem[]; onClose: () => void; /** 큰 창(AI 편집 등) 위에 띄울 때 */ z?: number }) {
  const [page, setPage] = React.useState(-1);
  const [hover, setHover] = React.useState<{ desc: string; top: number } | null>(null);
  React.useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  React.useEffect(() => setHover(null), [page]);
  const boxRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const down = (e: PointerEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) onClose(); };
    const t = setTimeout(() => window.addEventListener("pointerdown", down, true), 0);
    return () => { clearTimeout(t); window.removeEventListener("pointerdown", down, true); };
  }, [onClose]);
  const W = 250;
  const left = Math.max(8, Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 1600) - W - 260));
  const top = Math.max(8, Math.min(y, (typeof window !== "undefined" ? window.innerHeight : 900) - 360));
  const cur = page >= 0 ? items[page] : null;
  return (
    <div ref={boxRef} onClick={(e) => e.stopPropagation()} onMouseLeave={() => setHover(null)}
      style={{ position: "fixed", left, top, zIndex: z, width: W, padding: 6, background: C.panel, border: `1px solid ${C.line2}`, borderRadius: 8, boxShadow: "0 12px 36px rgba(0,0,0,0.45)", fontFamily: FONT, color: C.text }}>
      {cur ? (
        <>
          <button type="button" onClick={() => setPage(-1)} style={{ ...rowStyle, fontWeight: 800, color: C.text }}>
            <Icon name="back" size={16} color={C.sub} />
            {cur.label}
          </button>
          <div style={{ padding: "6px 10px 6px" }}>{cur.page?.()}</div>
        </>
      ) : (
        <>
          <div style={{ padding: "6px 10px 8px", fontSize: 12.5, color: C.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
          {items.map((it, i) => (
            <React.Fragment key={it.label}>
              {it.danger && <div style={{ height: 1, background: C.line, margin: "4px 6px" }} />}
              <button type="button" onClick={() => { if (it.page) setPage(i); else { it.run?.(); onClose(); } }}
                onMouseEnter={(e) => setHover({ desc: it.desc, top: (e.currentTarget as HTMLElement).offsetTop })}
                style={{ ...rowStyle, color: it.danger ? C.danger : C.text, background: it.on ? C.accentDim : "transparent" }}
                onMouseOver={(e) => { if (!it.on) (e.currentTarget as HTMLElement).style.background = C.cardHover; }}
                onMouseOut={(e) => { if (!it.on) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                {it.iconEl ? <span style={{ width: 17, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{it.iconEl}</span> : <Icon name={it.icon} size={17} />}
                <span style={{ flex: 1, textAlign: "left" }}>{it.label}</span>
                {it.on && <Icon name="check" size={15} color={C.accent} />}
                {it.page && <Icon name="chevron" size={14} color={C.sub} />}
              </button>
            </React.Fragment>
          ))}
          <div style={{ padding: "6px 10px 2px", fontSize: 11.5, color: C.dim }}>{what} 메뉴 · Esc 로 닫기</div>
        </>
      )}
      {hover && !cur && (
        <div style={{ position: "absolute", left: W + 6, top: hover.top, width: 230, padding: "8px 10px", borderRadius: 6, background: "#111", border: `1px solid ${C.line2}`, color: "#eee", fontSize: 12.5, lineHeight: 1.5, pointerEvents: "none", boxShadow: "0 6px 18px rgba(0,0,0,0.4)" }}>
          {hover.desc}
        </div>
      )}
    </div>
  );
}
/** 화면 비율 상자 — 그 비율 모양 그대로 (2026-10-21 사장님) */
export function RatioBox({ ratio, size = 16 }: { ratio: string; size?: number }) {
  const [w, h] = ratio.split(":").map(Number);
  const k = size / Math.max(w || 1, h || 1);
  return <span style={{ display: "inline-block", width: Math.round(w * k), height: Math.round(h * k), border: "1.6px solid currentColor", borderRadius: 2, boxSizing: "border-box", flexShrink: 0 }} />;
}
/** 2차 칸 안 — 같은 모양 칩 · 끌개 (QuickMenu 와 메뉴들이 같이 쓴다) */
export const quickChip = (on: boolean): React.CSSProperties => chipStyle(on);
export function QuickSlider({ label, value, min, max, step, show, onChange }: { label: string; value: number; min: number; max: number; step: number; show: string; onChange: (v: number) => void }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", fontSize: 13, fontWeight: 700, marginBottom: 4 }}><span style={{ flex: 1 }}>{label}</span><span style={{ color: C.sub }}>{show}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", accentColor: C.accent }} />
    </div>
  );
}

/** 2차 칸 — 글 고치기 (엔터 = 저장, Shift+엔터 = 줄바꿈) */
export function QuickText({ value, onSave }: { value: string; onSave: (t: string) => void }) {
  const [t, setT] = React.useState(value);
  return (
    <>
      <textarea value={t} autoFocus rows={3} onChange={(e) => setT(e.target.value)}
        onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSave(t); } }}
        style={{ ...input, width: "100%", boxSizing: "border-box", height: "auto", padding: 8, lineHeight: 1.5, resize: "vertical", fontSize: 14 }} />
      <button type="button" onClick={() => onSave(t)} style={{ height: 32, width: "100%", marginTop: 6, borderRadius: 5, border: 0, background: C.accent, color: "#fff", fontSize: 13, fontWeight: 800, fontFamily: FONT, cursor: "pointer" }}>저장</button>
    </>
  );
}

/** 소리 칩(원본 소리·AI 목소리)을 누르면 바로 옆에 — 볼륨·빠르기·목소리 바꾸기 */
export function SoundMenu({ title, x, y, scope, selCount, allCount, onScope, muted, value, speed, onMute, onVolume, onSpeed, onVoice, onRedo, onClose, len, base, pad, onLength, lenMin, lenMax, lenOnly }: {
  title: string;
  x: number;
  y: number;
  count: number; // 적용되는 클립 수
  scope: "one" | "sel" | "all"; // 적용 범위 — 이 클립에만 / 선택 클립 / 모든 클립
  selCount: number;
  allCount: number;
  onScope: (s: "one" | "sel" | "all") => void;
  muted: boolean;
  value: number;
  speed: number;
  onMute: (v: boolean) => void;
  onVolume: (v: number, first: boolean) => void;
  onSpeed: (v: number) => void;
  onVoice?: () => void; // AI 목소리 클립만 — 촬영한 영상(원본 소리)은 목소리를 바꾸지 않는다
  onRedo?: () => void; // AI 목소리 다시 만들기 — 저장해 둔 것 말고 새로 (내 목소리처럼 만들 때마다 다른 것)
  onClose: () => void;
  // 길이 — 지금 길이 / 목소리(또는 영상) 길이 / 끝에 머무는 쉼. 늘리면 쉼, 줄이면 쉼부터 줄이고 빠르게
  len?: number;
  base?: number;
  pad?: number;
  onLength?: (sec: number) => void;
  lenMin?: number; // AI 목소리: 다 읽는 시간 (그 아래로는 못 줄임) / 영상: 0.3초
  lenMax?: number; // 영상: 원본이 끝나는 곳까지 / AI 목소리: 넉넉히
  lenOnly?: boolean; // 오른쪽 클립 시간을 눌렀을 때 — 길이만 (소리 칩에서는 길이 없이 볼륨·빠르기만)
}) {
  const [lenDraft, setLenDraft] = React.useState("");
  React.useEffect(() => setLenDraft(len ? len.toFixed(1) : ""), [len]);
  const lenOff = false; // 길이는 늘 이 클립만 (적용 범위 단추는 볼륨·빠르기를 넓혀 넣는다)
  const lo = Math.max(0.3, lenMin ?? 0.3);
  const hi = Math.max(lo + 0.1, lenMax ?? Math.max(30, (len ?? 0) + 10));
  const clampLen = (v: number) => +Math.min(hi, Math.max(lo, v)).toFixed(2);
  React.useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const W = 320;
  const left = Math.max(8, Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 1600) - W - 16));
  // 실제 높이를 재서 — 아래에 자리가 없으면 위로 올린다 (메뉴가 길어져 화면 아래로 잘리던 문제). 그래도 길면 메뉴 안에서 굴린다
  const box = React.useRef<HTMLDivElement>(null);
  const [top, setTop] = React.useState(y);
  React.useLayoutEffect(() => {
    const h = box.current?.offsetHeight || 0;
    const H = window.innerHeight;
    setTop(y + h <= H - 8 ? y : Math.max(8, Math.min(y - h - 44, H - h - 8)));
  }, [y, len, onLength]);
  const chipS = (on: boolean): React.CSSProperties => ({ flex: 1, height: 28, padding: 0, borderRadius: 5, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent", color: C.text, fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: "pointer" });
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 69 }} />
      <div ref={box} onClick={(e) => e.stopPropagation()}
        style={{ position: "fixed", left, top, zIndex: 70, width: W, maxHeight: "calc(100vh - 16px)", overflowY: "auto", boxSizing: "border-box", padding: 12, background: C.panel, border: `1px solid ${C.line2}`, borderRadius: 8, boxShadow: "0 12px 36px rgba(0,0,0,0.45)", fontFamily: FONT, color: C.text }}>
        <div style={{ fontSize: 12.5, color: C.dim, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
        {!lenOnly && <>
        <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 6 }}>적용 범위</div>
        <div style={{ display: "flex", gap: 5, marginBottom: 4 }}>
          <button type="button" onClick={() => onScope("one")} style={{ ...chipS(scope === "one"), height: 30 }}>이 클립에만</button>
          {/* 선택 클립 — 클립을 2개 이상 골랐을 때만 */}
          <button type="button" disabled={selCount < 2} onClick={() => onScope("sel")} title={selCount < 2 ? "클립을 2개 이상 고르면 쓸 수 있어요" : undefined} style={{ ...chipS(scope === "sel"), height: 30, opacity: selCount < 2 ? 0.4 : 1, cursor: selCount < 2 ? "default" : "pointer" }}>선택 클립 ({selCount}개)</button>
          <button type="button" onClick={() => onScope("all")} style={{ ...chipS(scope === "all"), height: 30 }}>모든 클립 ({allCount}개)</button>
        </div>
        <div style={{ fontSize: 11.5, color: C.dim, marginBottom: 10 }}>아래에서 바꾸고 누르면 그 클립들에 넣고 닫혀요 (바꾸는 동안은 이 클립에서 들어 봐요).</div>
        <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 6 }}>볼륨 <span style={{ color: C.sub, fontWeight: 600, fontSize: 12 }}>· {onVoice ? "이 AI 목소리만" : "이 원본 소리만"}</span></div>
        <VolumeControl muted={muted} value={value} onMute={onMute} onVolume={onVolume} />
        <div style={{ fontSize: 13.5, fontWeight: 800, margin: "12px 0 6px" }}>빠르기 <span style={{ color: C.sub, fontWeight: 600 }}>{+speed.toFixed(2)}배</span></div>
        {/* 막대 — AI 목소리 0.5~2배 · 원본 영상 0.25~4배 (영상 메뉴 [속도]와 같은 값, 2026-10-19) */}
        <input type="range" min={onVoice ? 0.5 : 0.25} max={onVoice ? 2 : 4} step={0.05} value={Math.min(onVoice ? 2 : 4, Math.max(onVoice ? 0.5 : 0.25, speed))} onChange={(e) => onSpeed(+Number(e.target.value).toFixed(2))} style={{ width: "100%", accentColor: C.accent, marginBottom: 6 }} />
        <div style={{ display: "flex", gap: 5 }}>
          {(onVoice ? [0.75, 1, 1.25, 1.5, 2] : [0.5, 1, 1.5, 2, 3, 4]).map((v) => <button key={v} type="button" onClick={() => onSpeed(v)} style={chipS(Math.abs(speed - v) < 0.001)}>{v}배</button>)}
        </div>
        </>}
        {lenOnly && onLength && typeof len === "number" && (
          <>
            <div style={{ fontSize: 13.5, fontWeight: 800, margin: "0 0 6px" }}>길이 <span style={{ color: C.sub, fontWeight: 600 }}>{len.toFixed(1)}초</span></div>
            <div style={{ display: "flex", gap: 5, alignItems: "center", opacity: lenOff ? 0.4 : 1 }}>
              <button type="button" disabled={lenOff || len <= lo + 0.01} onClick={() => onLength(Math.max(lo, +(len - 0.5).toFixed(2)))} style={{ ...chipS(false), flex: "0 0 58px", height: 32, opacity: len <= lo + 0.01 ? 0.4 : 1 }}>−0.5초</button>
              <input value={lenDraft} disabled={lenOff} onChange={(e) => setLenDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { const v = Number(lenDraft); if (v > 0.2) onLength(clampLen(v)); } }}
                onBlur={() => { const v = Number(lenDraft); if (v > 0.2 && Math.abs(v - len) > 0.04) onLength(clampLen(v)); else setLenDraft(len.toFixed(1)); }}
                style={{ ...input, flex: 1, minWidth: 0, height: 32, padding: "0 8px", textAlign: "center", fontSize: 14, fontWeight: 800 }} />
              <span style={{ fontSize: 12.5, color: C.sub }}>초</span>
              <button type="button" disabled={lenOff || len >= hi - 0.01} onClick={() => onLength(Math.min(hi, +(len + 0.5).toFixed(2)))} style={{ ...chipS(false), flex: "0 0 58px", height: 32, opacity: len >= hi - 0.01 ? 0.4 : 1 }}>+0.5초</button>
            </div>
            {/* 막대 — 가장 짧게(다 읽는 시간 / 0.3초) ~ 가장 길게(영상은 원본 끝까지) */}
            <input type="range" min={lo} max={hi} step={0.1} value={Math.min(hi, Math.max(lo, len))} onChange={(e) => onLength(clampLen(Number(e.target.value)))} style={{ width: "100%", accentColor: C.accent, marginTop: 6 }} />
            <div style={{ fontSize: 11.5, color: C.dim, marginTop: 5 }}>
              {onVoice
                ? `목소리 ${(base ?? len).toFixed(1)}초${pad ? ` + 쉼 ${pad.toFixed(1)}초` : ""} · 늘리면 다 읽고 끝에 머물러요 (다 읽는 시간보다 짧게는 안 돼요)`
                : `시작점은 그대로, 끝만 당기거나 늘려요 · 원본 영상 끝까지 ${hi.toFixed(1)}초`}
            </div>
          </>
        )}
        {onVoice && !lenOnly && <button type="button" onClick={() => { onVoice(); onClose(); }} style={{ ...rowStyle, marginTop: 12, border: `1px solid ${C.line2}`, justifyContent: "center", color: C.text }}>
          <Icon name="voice" size={16} />AI 목소리 바꾸기<Icon name="chevron" size={14} color={C.sub} />
        </button>}
        {onRedo && !lenOnly && <button type="button" onClick={() => { onRedo(); onClose(); }} title="이 목소리를 새로 만들어요 (마음에 안 들면 몇 번이든)" style={{ ...rowStyle, marginTop: 6, border: `1px solid ${C.line2}`, justifyContent: "center", color: C.text }}>
          <Icon name="redo" size={16} />목소리 다시 만들기
        </button>}
        <div style={{ fontSize: 11.5, color: C.dim, marginTop: 6 }}>{lenOnly ? "볼륨·빠르기는 위 소리 칩에서 · Esc 로 닫기" : "길이는 오른쪽 클립 시간을 눌러서 · Esc 로 닫기"}</div>
      </div>
    </>
  );
}

const chipStyle = (on: boolean): React.CSSProperties => ({ height: 30, padding: "0 4px", borderRadius: 5, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent", color: C.text, fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" });

const rowStyle: React.CSSProperties = { width: "100%", display: "flex", alignItems: "center", gap: 9, height: 36, padding: "0 10px", border: 0, borderRadius: 5, background: "transparent", fontSize: 14, fontWeight: 700, fontFamily: FONT, cursor: "pointer" };
const numStyle: React.CSSProperties = { ...input, width: 52, height: 32, padding: "0 6px", textAlign: "center", fontSize: 14, fontWeight: 700 };
