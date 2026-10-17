"use client";

// 사진 올리기·화면 글자 애니메이션 칸 (브루처럼) — 선택된 효과 · [등장/퇴장][강조][확대] 효과 카드 · 빠르기 · 적용 범위.
// 카드에 마우스를 올리면 그 효과가 실제로 움직여 보인다 (미리보기·굽기와 같은 계산 timeline.animAt)
import React, { useEffect, useRef, useState } from "react";
import type { AnimIn, LayerAnim } from "./types";
import { animAt, animCss } from "./timeline";
import { Side } from "./Panels";
import { C, FONT } from "./ui";

const IN_LIST: { id: AnimIn; label: string }[] = [
  { id: "auto", label: "자동" },
  { id: "fade", label: "페이드" },
  { id: "fly", label: "날아오기" },
  { id: "zoom", label: "다가오기" },
  { id: "pop", label: "팝" },
  { id: "spin", label: "돌아오기" },
  { id: "flip", label: "뒤집기" },
  { id: "roll", label: "굴러오기" },
];
const EMPH_LIST: { id: NonNullable<LayerAnim["emph"]>; label: string }[] = [
  { id: "pulse", label: "두근두근" },
  { id: "shake", label: "흔들기" },
  { id: "blink", label: "깜빡이기" },
];
const GROW_LIST: { id: NonNullable<LayerAnim["grow"]>; label: string }[] = [
  { id: "grow", label: "천천히 커지기" },
  { id: "shrink", label: "천천히 작아지기" },
];
const SPEEDS = [{ v: 0.3, label: "빠르게" }, { v: 0.5, label: "보통" }, { v: 1, label: "느리게" }];
const nameOf = (id?: string) => [...IN_LIST, ...EMPH_LIST, ...GROW_LIST].find((x) => x.id === id)?.label || "";

/** 효과 카드 — 마우스를 올리면 움직인다 (등장: 나타나기, 퇴장: 사라지기, 강조·확대: 계속) */
function Card({ label, on, kind, effect, thumb, text, onClick }: { label: string; on: boolean; kind: "in" | "out" | "emph" | "grow" | "none"; effect?: string; thumb?: string; text?: string; onClick: () => void }) {
  const [t, setT] = useState(-1);
  const raf = useRef(0);
  const start = () => {
    if (kind === "none") return;
    const t0 = performance.now();
    const tick = () => {
      setT(((performance.now() - t0) / 1000) % 1.8);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  const stop = () => {
    cancelAnimationFrame(raf.current);
    setT(-1);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const real = effect === "auto" ? "pop" : effect;
  const look = t < 0 || !real ? undefined : (() => {
    // 카드 안 작은 시연 — 등장은 0.6초 동안 나타나고 머묾, 퇴장은 머물다 사라짐
    if (kind === "in") return animCss(animAt({ in: real, dur: 0.6 }, t, 0, 100), 120, 70);
    if (kind === "out") return animCss(animAt({ out: real, dur: 0.6 }, t, -100, 1.2), 120, 70);
    if (kind === "emph") return animCss(animAt({ emph: real, dur: 0.5 }, t, 0, 100), 120, 70);
    return animCss(animAt({ grow: real, dur: 0.5 }, t, 0, 1.8), 120, 70);
  })();
  return (
    <button type="button" onClick={onClick} onMouseEnter={start} onMouseLeave={stop}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 0, border: 0, background: "transparent", color: on ? C.text : C.sub, fontFamily: FONT, cursor: "pointer" }}>
      <span style={{ width: "100%", aspectRatio: "16 / 9", borderRadius: 6, border: `${on ? 2 : 1}px solid ${on ? C.accent : C.line2}`, background: "#fff", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {kind === "none" ? (
          <span style={{ fontSize: 12.5, color: "#666", fontWeight: 700 }}>없음</span>
        ) : (
          <span style={{ display: "inline-block", ...look }}>
            {thumb ? <img src={thumb} alt="" style={{ height: 34, maxWidth: 60, objectFit: "contain", display: "block" }} /> : <span style={{ fontSize: 18, fontWeight: 900, color: "#111" }}>{text || "가"}</span>}
          </span>
        )}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
    </button>
  );
}

export function AnimPanel({ value, what, thumb, text, count, scopeNote, onChange, onClose, onBack, onPreview }: {
  value?: LayerAnim;
  what: string; // 사진 · 글자 · 자막
  thumb?: string; // 카드 시연 그림
  text?: string; // 카드 시연 글자
  /** 같은 종류 수 — 있으면 [이 ○만][모든 ○] 범위 단추. 없으면 scopeNote 로 안내 (자막은 메인자막 칸 범위를 따른다) */
  count?: number;
  scopeNote?: string;
  /** 애니메이션 바꾸기 — all 이면 같은 종류 모두 */
  onChange: (fn: (a: LayerAnim) => LayerAnim, all: boolean) => void;
  onClose: () => void;
  onBack?: () => void; // 앞 칸으로 (메인자막 칸)
  /** 효과를 고르면 미리보기에서 그 부분을 바로 틀어 보여 준다 (등장: 처음, 퇴장: 끝, 강조·확대: 처음부터 조금) */
  onPreview?: (part: "in" | "out" | "all") => void;
}) {
  const [tab, setTab] = useState<"inout" | "emph" | "grow">("inout");
  const [side, setSide] = useState<"in" | "out">("in");
  const [all, setAll] = useState(false);
  const a = value || {};
  const set = (fn: (a: LayerAnim) => LayerAnim, part: "in" | "out" | "all" = "all") => {
    onChange(fn, all);
    setTimeout(() => onPreview?.(part), 30); // 바뀐 값이 들어간 뒤에
  };
  // 등장을 고르면 — 퇴장이 비었거나 등장과 같았으면 퇴장도 같은 효과 (거꾸로)
  const pickIn = (id?: AnimIn) => set((x) => ({ ...x, in: id, out: !x.out || x.out === x.in ? id : x.out }), "in");
  const pickOut = (id?: AnimIn) => set((x) => ({ ...x, out: id }), "out");
  const tabBtn = (on: boolean): React.CSSProperties => ({ height: 32, padding: "0 12px", borderRadius: 5, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent", color: on ? C.text : C.sub, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" });
  const chosen = [
    a.in && `등장 · ${nameOf(a.in)}`,
    a.out && `퇴장 · ${nameOf(a.out)}`,
    a.emph && `강조 · ${nameOf(a.emph)}`,
    a.grow && `확대 · ${nameOf(a.grow)}`,
  ].filter(Boolean) as string[];
  const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, padding: "12px 16px" };
  return (
    <Side title={what === "자막" ? "메인자막 애니메이션" : "애니메이션"} onClose={onClose}>
      {onBack && (
        <button type="button" onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, width: "100%", padding: "10px 16px", border: 0, borderBottom: `1px solid ${C.line}`, background: "transparent", color: C.sub, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>
          ‹ 메인자막 칸으로
        </button>
      )}
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <span style={{ flex: 1, fontSize: 15, fontWeight: 800 }}>선택된 효과</span>
          <button type="button" disabled={!chosen.length} onClick={() => set(() => ({}))} style={{ height: 28, padding: "0 10px", borderRadius: 4, border: `1px solid ${C.line2}`, background: "transparent", color: chosen.length ? C.sub : C.dim, fontSize: 12.5, fontFamily: FONT, cursor: chosen.length ? "pointer" : "default" }}>처음대로</button>
        </div>
        {chosen.length ? (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {chosen.map((c) => <span key={c} style={{ padding: "4px 10px", borderRadius: 4, background: C.card, border: `1px solid ${C.line2}`, fontSize: 13.5, fontWeight: 700 }}>{c}</span>)}
          </div>
        ) : (
          <div style={{ fontSize: 14, color: C.sub }}>애니메이션 없음</div>
        )}
      </div>
      <div style={{ padding: "14px 16px 0" }}>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>모든 효과</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" onClick={() => setTab("inout")} style={tabBtn(tab === "inout")}>등장/퇴장</button>
          <button type="button" onClick={() => setTab("emph")} style={tabBtn(tab === "emph")}>강조</button>
          <button type="button" onClick={() => setTab("grow")} style={tabBtn(tab === "grow")}>확대</button>
        </div>
        {tab === "inout" && (
          <div style={{ display: "flex", marginTop: 12, borderBottom: `1px solid ${C.line}` }}>
            {(["in", "out"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setSide(k)} style={{ flex: 1, height: 36, border: 0, borderBottom: `2px solid ${side === k ? C.text : "transparent"}`, background: "transparent", color: side === k ? C.text : C.sub, fontSize: 14, fontWeight: 800, fontFamily: FONT, cursor: "pointer" }}>
                {k === "in" ? "등장" : "퇴장"}
              </button>
            ))}
          </div>
        )}
      </div>
      {tab === "inout" && (
        <div style={grid}>
          <Card label="없음" kind="none" on={!(side === "in" ? a.in : a.out)} onClick={() => (side === "in" ? pickIn(undefined) : pickOut(undefined))} />
          {IN_LIST.map((x) => (
            <Card key={x.id} label={x.label} kind={side} effect={x.id} thumb={thumb} text={text} on={(side === "in" ? a.in : a.out) === x.id}
              onClick={() => (side === "in" ? pickIn(x.id) : pickOut(x.id))} />
          ))}
        </div>
      )}
      {tab === "emph" && (
        <div style={grid}>
          <Card label="없음" kind="none" on={!a.emph} onClick={() => set((x) => ({ ...x, emph: undefined }))} />
          {EMPH_LIST.map((x) => <Card key={x.id} label={x.label} kind="emph" effect={x.id} thumb={thumb} text={text} on={a.emph === x.id} onClick={() => set((y) => ({ ...y, emph: x.id }))} />)}
        </div>
      )}
      {tab === "grow" && (
        <div style={grid}>
          <Card label="없음" kind="none" on={!a.grow} onClick={() => set((x) => ({ ...x, grow: undefined }))} />
          {GROW_LIST.map((x) => <Card key={x.id} label={x.label} kind="grow" effect={x.id} thumb={thumb} text={text} on={a.grow === x.id} onClick={() => set((y) => ({ ...y, grow: x.id }))} />)}
        </div>
      )}
      <div style={{ padding: "4px 16px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {tab === "inout" && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>등장·퇴장 빠르기</div>
            <div style={{ display: "flex", gap: 6 }}>
              {SPEEDS.map((sp) => <button key={sp.v} type="button" onClick={() => set((x) => ({ ...x, dur: sp.v === 0.5 ? undefined : sp.v }))} style={{ ...tabBtn((a.dur ?? 0.5) === sp.v), flex: 1 }}>{sp.label}</button>)}
            </div>
          </div>
        )}
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>적용 범위 <span style={{ fontSize: 12, color: C.dim, fontWeight: 600 }}>· 고른 뒤 효과를 누르세요</span></div>
          {typeof count === "number" ? (
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={() => setAll(false)} style={{ ...tabBtn(!all), flex: 1 }}>이 {what}만</button>
              <button type="button" onClick={() => setAll(true)} style={{ ...tabBtn(all), flex: 1 }}>모든 {what} ({count}개)</button>
            </div>
          ) : (
            <div style={{ fontSize: 13.5, color: C.sub }}>{scopeNote}</div>
          )}
        </div>
        <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.6 }}>
          {what === "자막"
            ? "효과 그림에 마우스를 올리면 움직임을 미리 볼 수 있어요. 자막 한 줄이 나올 때마다 나타나고 사라져요. [자동]은 클립마다 팝·날아오기·다가오기·페이드·굴러오기를 차례로 써요."
            : `효과 그림에 마우스를 올리면 움직임을 미리 볼 수 있어요. [자동]은 ${what}마다 팝·날아오기·다가오기·페이드·굴러오기를 차례로 써요. 여러 클립에 걸친 ${what}는 첫 클립에서 나타나고 마지막 클립에서 사라져요.`}
        </div>
      </div>
    </Side>
  );
}
