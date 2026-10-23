"use client";

// 사진 올리기·화면 글자 애니메이션 칸 (브루처럼) — 선택된 효과 · [등장/퇴장][강조][확대] 효과 카드 · 빠르기 · 적용 범위.
// 카드에 마우스를 올리면 그 효과가 실제로 움직여 보인다 (미리보기·굽기와 같은 계산 timeline.animAt)
import React, { useEffect, useRef, useState } from "react";
import type { AnimIn, LayerAnim } from "./types";
import { SFX_LIST, animAt, animCss, wordState, type WordFx } from "./timeline";
import { ColorPick } from "./Pickers";
import { Side } from "./Panels";
import { C, FONT, Toggle } from "./ui";
import { FancyText } from "./Variety";
import type { TextLook } from "./SubPresets";

export const IN_LIST: { id: AnimIn; label: string }[] = [
  { id: "auto", label: "자동" },
  { id: "fade", label: "페이드" },
  { id: "fly", label: "날아오기" },
  { id: "zoom", label: "다가오기" },
  { id: "pop", label: "팝" },
  { id: "spin", label: "돌아오기" },
  { id: "flip", label: "뒤집기" },
  { id: "roll", label: "굴러오기" },
  { id: "drop", label: "떨어지기" },
  { id: "slideL", label: "왼쪽에서" },
  { id: "slideR", label: "오른쪽에서" },
  { id: "big", label: "크게에서" },
  { id: "stretch", label: "늘어나기" },
  { id: "swing", label: "흔들며" },
  { id: "jelly", label: "젤리" },
];
export const EMPH_LIST: { id: NonNullable<LayerAnim["emph"]>; label: string }[] = [
  { id: "pulse", label: "두근두근" },
  { id: "shake", label: "흔들기" },
  { id: "blink", label: "깜빡이기" },
  { id: "float", label: "둥실둥실" },
  { id: "sway", label: "좌우 흔들" },
  { id: "bounce", label: "콩콩" },
  { id: "beat", label: "쿵쾅쿵쾅" },
  { id: "wiggle", label: "부르르" },
];
const GROW_LIST: { id: NonNullable<LayerAnim["grow"]>; label: string }[] = [
  { id: "grow", label: "천천히 커지기" },
  { id: "shrink", label: "천천히 작아지기" },
];
const SPEEDS = [{ v: 0.3, label: "빠르게" }, { v: 0.5, label: "보통" }, { v: 1, label: "느리게" }];
const nameOf = (id?: string) => [...IN_LIST, ...EMPH_LIST, ...GROW_LIST].find((x) => x.id === id)?.label || "";

/** 효과 카드 — 마우스를 올리면 움직인다 (등장: 나타나기, 퇴장: 사라지기, 강조·확대: 계속) */
function Card({ label, on, kind, effect, thumb, text, look: tl, onClick }: { label: string; on: boolean; kind: "in" | "out" | "emph" | "grow" | "none"; effect?: string; thumb?: string; text?: string; look?: TextLook; onClick: () => void }) {
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
      <span style={{ width: "100%", aspectRatio: "16 / 9", borderRadius: 6, border: `${on ? 2 : 1}px solid ${on ? C.accent : C.line2}`, background: tl ? (tl.glow ? "#0d0f15" : "#2b303b") : "#fff", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {kind === "none" ? (
          <span style={{ fontSize: 12.5, color: tl ? "#aaa" : "#666", fontWeight: 700 }}>없음</span>
        ) : (
          <span style={{ display: "inline-block", ...look }}>
            {thumb ? <img src={thumb} alt="" style={{ height: 34, maxWidth: 60, objectFit: "contain", display: "block" }} /> : tl ? <FancyText look={tl} px={20} text={text || "가"} k={0.45} /> : <span style={{ fontSize: 18, fontWeight: 900, color: "#111" }}>{text || "가"}</span>}
          </span>
        )}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
    </button>
  );
}

/* ── 단어별 (쇼츠식) — 말하는 때에 맞춰 한 단어씩 나타나기 · 지금 단어 강조 (2026-10-19 회의) ── */
const WSHOW_LIST: { id: "word" | "line"; label: string }[] = [{ id: "word", label: "한 단어씩" }, { id: "line", label: "한 줄씩" }];
export const WHL_LIST: { id: NonNullable<LayerAnim["whl"]>; label: string }[] = [
  { id: "color", label: "색 바꾸기" },
  { id: "big", label: "커지기" },
  { id: "both", label: "색+커지기" },
];
const WCOLORS = ["#FFE000", "#3DFF7A", "#38D9FF", "#FF4FA3", "#FF8A00", "#FF3B30"];
const DEMO = ["지금", "보는", "이", "매물"];
/** 단어별 카드 — 마우스를 올리면 단어가 차례로 (0.35초씩) */
function WordCard({ label, on, fx, onClick }: { label: string; on: boolean; fx: WordFx | null; onClick: () => void }) {
  const [t, setT] = useState(-1);
  const raf = useRef(0);
  const start = () => {
    if (!fx) return;
    const t0 = performance.now();
    const tick = () => {
      setT(((performance.now() - t0) / 1000) % 2.0);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  const stop = () => {
    cancelAnimationFrame(raf.current);
    setT(-1);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return (
    <button type="button" onClick={onClick} onMouseEnter={start} onMouseLeave={stop}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 0, border: 0, background: "transparent", color: on ? C.text : C.sub, fontFamily: FONT, cursor: "pointer" }}>
      <span style={{ width: "100%", aspectRatio: "16 / 9", borderRadius: 6, border: `${on ? 2 : 1}px solid ${on ? C.accent : C.line2}`, background: "#222", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", gap: 3, padding: "0 4px" }}>
        {!fx ? <span style={{ fontSize: 12.5, color: "#aaa", fontWeight: 700 }}>없음</span> : (
          // 한 줄씩은 두 줄로 보여 준다 (지금 보는 / 이 매물)
          <span style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 3px", width: fx.show === "line" ? 70 : undefined }}>
            {DEMO.map((w, i) => {
              const s0 = 0.15 + i * 0.35;
              const st = t < 0 ? { a: 1, cur: i === 1 && Boolean(fx.hl) } : wordState(fx, { s: s0, e: s0 + 0.35, ls: i < 2 ? 0.15 : 0.85 }, t);
              const col = st.cur && fx.hl !== "big", big = st.cur && fx.hl !== "color";
              return <span key={w} style={{ opacity: st.a, color: col ? fx.color : "#fff", fontSize: big ? 15 : 12.5, fontWeight: 900, whiteSpace: "nowrap" }}>{w}</span>;
            })}
          </span>
        )}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
    </button>
  );
}

export type AnimBodyProps = {
  value?: LayerAnim;
  what: string; // 사진 · 글자 · 자막
  thumb?: string; // 카드 시연 그림
  text?: string; // 카드 시연 글자
  /** 카드 시연 글자 모양 — 고른 템플릿·디자인 그대로 (2026-10-21 사장님: 흰 칸 대신) */
  look?: TextLook;
  /** 같은 종류 수 — 있으면 [이 ○만][모든 ○] 범위 단추. 없으면 scopeNote 로 안내 (자막은 메인자막 칸 범위를 따른다) */
  count?: number;
  scopeNote?: string;
  /** 애니메이션 바꾸기 — all 이면 같은 종류 모두 */
  onChange: (fn: (a: LayerAnim) => LayerAnim, all: boolean) => void;
  /** 효과를 고르면 미리보기에서 그 부분을 바로 틀어 보여 준다 (등장: 처음, 퇴장: 끝, 강조·확대: 처음부터 조금) */
  onPreview?: (part: "in" | "out" | "all") => void;
  sfxDefault?: "auto" | "none"; // 효과음을 안 골랐을 때 (사진·글자 자동, 자막 없음)
};

/** 오른쪽 칸 — 애니메이션 (스티커·사진·글자, 메인자막). 글자는 글자 칸의 [애니메이션] 탭 안에 AnimBody 로 들어간다 */
export function AnimPanel({ onClose, onBack, ...body }: AnimBodyProps & { onClose: () => void; onBack?: () => void }) {
  return (
    <Side title={body.what === "자막" ? "메인자막 애니메이션" : "애니메이션"} onClose={onClose}>
      {onBack && (
        <button type="button" onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, width: "100%", padding: "10px 16px", border: 0, borderBottom: `1px solid ${C.line}`, background: "transparent", color: C.sub, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>
          ‹ 메인자막 칸으로
        </button>
      )}
      <AnimBody {...body} />
    </Side>
  );
}

/**
 * 애니메이션 고르기 — 캡컷처럼 [인 / 아웃 / 반복] (회의 3-28, 2026-10-19)
 *  반복 = 나와 있는 동안 계속 (두근두근·흔들기·깜빡이기 + 천천히 커지기·작아지기)
 */
export function AnimBody({ value, what, thumb, text, look, onChange, onPreview, sfxDefault = "auto" }: AnimBodyProps) {
  return <AnimInner value={value} what={what} thumb={thumb} text={text} look={look} onChange={onChange} onPreview={onPreview} sfxDefault={sfxDefault} />;
}

function AnimInner({ value, what, thumb, text, look, onChange, onPreview, sfxDefault = "auto" }: {
  value?: LayerAnim;
  what: string; // 사진 · 글자 · 자막
  thumb?: string; // 카드 시연 그림
  text?: string; // 카드 시연 글자
  /** 카드 시연 글자 모양 — 고른 템플릿·디자인 그대로 (2026-10-21 사장님: 흰 칸 대신) */
  look?: TextLook;
  /** 같은 종류 수 — 있으면 [이 ○만][모든 ○] 범위 단추. 없으면 scopeNote 로 안내 (자막은 메인자막 칸 범위를 따른다) */
  count?: number;
  scopeNote?: string;
  /** 애니메이션 바꾸기 — all 이면 같은 종류 모두 */
  onChange: (fn: (a: LayerAnim) => LayerAnim, all: boolean) => void;
  /** 효과를 고르면 미리보기에서 그 부분을 바로 틀어 보여 준다 (등장: 처음, 퇴장: 끝, 강조·확대: 처음부터 조금) */
  onPreview?: (part: "in" | "out" | "all") => void;
  sfxDefault?: "auto" | "none"; // 효과음을 안 골랐을 때 (사진·글자 자동, 자막 없음)
}) {
  const [tab, setTab] = useState<"in" | "out" | "loop" | "sfx" | "word">("in");
  const wordsOk = what === "자막"; // 단어별은 메인자막부터 (말 시각이 있어서)
  const side: "in" | "out" = tab === "out" ? "out" : "in";
  const all = false; // 적용 범위 단추 없앰 (2026-10-21) — 늘 고른 것 하나에만
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
    a.in && `인 · ${nameOf(a.in)}`,
    a.out && `아웃 · ${nameOf(a.out)}`,
    a.emph && `반복 · ${nameOf(a.emph)}`,
    a.grow && `반복 · ${nameOf(a.grow)}`,
    a.wshow && (a.wshow === "line" ? "단어·줄 · 한 줄씩" : "단어·줄 · 한 단어씩"),
    a.whl && `단어·줄 · ${WHL_LIST.find((x) => x.id === a.whl)?.label}`,
    a.sfx && `효과음 · ${a.sfx === "none" ? "없음" : a.sfx === "auto" ? "자동" : SFX_LIST.find((x) => x.id === a.sfx)?.label || a.sfx}`,
  ].filter(Boolean) as string[];
  const wcol = a.wcolor || WCOLORS[0];
  const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, padding: "12px 16px" };
  return (
    <>
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
      <div style={{ padding: "12px 16px 0" }}>
        <div style={{ display: "flex", borderRadius: 7, background: C.card, padding: 3 }}>
          {([["in", "인"], ["out", "아웃"], ["loop", "반복"], ["word", "단어·줄"], ["sfx", "효과음"]] as const).filter(([k]) => k !== "word" || wordsOk).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              style={{ flex: 1, height: 32, border: 0, borderRadius: 5, background: tab === k ? C.panel2 : "transparent", color: tab === k ? C.text : C.sub, fontSize: 14, fontWeight: 800, fontFamily: FONT, cursor: "pointer" }}>
              {l}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: C.dim, marginTop: 6 }}>
          {tab === "in" ? "나타날 때" : tab === "out" ? "사라질 때" : tab === "sfx" ? "나타날 때 · 사라질 때 나는 소리 (누르면 바로 들려줘요)" : tab === "word" ? "말하는 때에 맞춰 단어마다 · 줄마다 (쇼츠식)" : "나와 있는 동안 계속"}
        </div>
      </div>
      {tab === "word" && (
        <>
          <div style={{ padding: "12px 16px 0", fontSize: 13.5, fontWeight: 800 }}>나타나기</div>
          <div style={grid}>
            <WordCard label="없음" on={!a.wshow} fx={null} onClick={() => set((x) => ({ ...x, wshow: undefined }))} />
            {WSHOW_LIST.map((x) => <WordCard key={x.id} label={x.label} on={a.wshow === x.id} fx={{ show: x.id, hl: a.whl, color: wcol, gap: 0.6 }} onClick={() => set((y) => ({ ...y, wshow: x.id }))} />)}
          </div>
          <div style={{ padding: "0 16px", fontSize: 13.5, fontWeight: 800 }}>지금 단어 강조</div>
          <div style={grid}>
            <WordCard label="없음" on={!a.whl} fx={null} onClick={() => set((x) => ({ ...x, whl: undefined }))} />
            {WHL_LIST.map((x) => <WordCard key={x.id} label={x.label} on={a.whl === x.id} fx={{ show: a.wshow, hl: x.id, color: wcol, gap: 0.6 }} onClick={() => set((y) => ({ ...y, whl: x.id }))} />)}
          </div>
          {a.whl && a.whl !== "big" && (
            <div style={{ padding: "0 16px 8px" }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 6 }}>강조색</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {WCOLORS.map((c) => (
                  <button key={c} type="button" title={c} onClick={() => set((y) => ({ ...y, wcolor: c === WCOLORS[0] ? undefined : c }))}
                    style={{ width: 28, height: 28, borderRadius: 6, background: c, border: `2px solid ${wcol.toUpperCase() === c ? "#fff" : "transparent"}`, cursor: "pointer", padding: 0 }} />
                ))}
                <ColorPick value={wcol} onChange={(c) => set((y) => ({ ...y, wcolor: c }))} />
              </div>
            </div>
          )}
          {a.wshow && (
            <div style={{ padding: "0 16px 10px" }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 6 }}>나오는 빠르기 <span style={{ fontSize: 12, color: C.dim, fontWeight: 600 }}>· 직접 쓴 자막 ({a.wshow === "line" ? "줄" : "단어"} 사이)</span></div>
              <div style={{ display: "flex", gap: 6 }}>
                {[{ v: 0.3, label: "빠르게" }, { v: 0.6, label: "보통" }, { v: 1, label: "느리게" }].map((sp) => (
                  <button key={sp.v} type="button" onClick={() => set((x) => ({ ...x, wgap: sp.v === 0.6 ? undefined : sp.v }))}
                    style={{ ...tabBtn((a.wgap ?? 0.6) === sp.v), flex: 1 }}>{sp.label} {a.wshow === "line" ? sp.v : sp.v / 2}초</button>
                ))}
              </div>
            </div>
          )}
          <div style={{ padding: "0 16px 6px", fontSize: 12.5, color: C.dim, lineHeight: 1.6 }}>
            한 줄씩 + [인] 효과를 고르면 줄마다 그 효과로 들어와요. 목소리에서 받은 단어 시각에 맞춰 움직여요. 자막을 직접 고친 클립은 글자 수로 시간을 나눠요. 인·아웃·반복과 함께 써도 돼요.
          </div>
        </>
      )}
      {(tab === "in" || tab === "out") && (
        <div style={grid}>
          <Card label="없음" kind="none" on={!(side === "in" ? a.in : a.out)} onClick={() => (side === "in" ? pickIn(undefined) : pickOut(undefined))} />
          {IN_LIST.map((x) => (
            <Card key={x.id} label={x.label} kind={side} effect={x.id} thumb={thumb} text={text} look={look} on={(side === "in" ? a.in : a.out) === x.id}
              onClick={() => (side === "in" ? pickIn(x.id) : pickOut(x.id))} />
          ))}
        </div>
      )}
      {tab === "loop" && (
        <>
          <div style={grid}>
            <Card label="없음" kind="none" on={!a.emph} onClick={() => set((x) => ({ ...x, emph: undefined }))} />
            {EMPH_LIST.map((x) => <Card key={x.id} label={x.label} kind="emph" effect={x.id} thumb={thumb} text={text} look={look} on={a.emph === x.id} onClick={() => set((y) => ({ ...y, emph: x.id }))} />)}
          </div>
          <div style={{ padding: "0 16px", fontSize: 13.5, fontWeight: 800 }}>천천히 <span style={{ fontSize: 12, color: C.dim, fontWeight: 600 }}>· 나와 있는 동안 조금씩</span></div>
          <div style={grid}>
            <Card label="없음" kind="none" on={!a.grow} onClick={() => set((x) => ({ ...x, grow: undefined }))} />
            {GROW_LIST.map((x) => <Card key={x.id} label={x.label} kind="grow" effect={x.id} thumb={thumb} text={text} look={look} on={a.grow === x.id} onClick={() => set((y) => ({ ...y, grow: x.id }))} />)}
          </div>
        </>
      )}
      <div style={{ padding: "4px 16px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {(tab === "in" || tab === "out") && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>인·아웃 빠르기</div>
            <div style={{ display: "flex", gap: 6 }}>
              {SPEEDS.map((sp) => <button key={sp.v} type="button" onClick={() => set((x) => ({ ...x, dur: sp.v === 0.5 ? undefined : sp.v }))} style={{ ...tabBtn((a.dur ?? 0.5) === sp.v), flex: 1 }}>{sp.label}</button>)}
            </div>
          </div>
        )}
        {/* 효과음 — [효과음] 탭 (고르면 바로 들려준다) */}
        {tab === "sfx" && <div>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>효과음 <span style={{ fontSize: 12, color: C.dim, fontWeight: 600 }}>· 나타날 때{what === "자막" ? " (클립 첫 줄에만)" : ""}</span></div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {[{ id: "auto", label: "자동" }, { id: "none", label: "없음" }, ...SFX_LIST].map((x) => {
              const cur = a.sfx || sfxDefault;
              return (
                <button key={x.id} type="button" title={x.id === "auto" ? (what === "사진" ? "효과에 맞게 (팝=뽁, 날아오기·다가오기=쉭, 뒤집기=딸깍, 페이드=없음)" : "엔터 소리 (탁)") : undefined}
                  onClick={() => {
                    set((y) => ({ ...y, sfx: x.id === sfxDefault ? undefined : x.id }), "in");
                    if (x.id !== "auto" && x.id !== "none") {
                      try {
                        const au = new Audio(`/studio-sfx/${x.id}.mp3`);
                        au.volume = Math.min(1, a.sfxVol ?? 0.6);
                        void au.play().catch(() => {});
                      } catch {}
                    }
                  }}
                  style={{ ...tabBtn(cur === x.id), height: 30, padding: "0 10px", fontSize: 13 }}>{x.label}</button>
              );
            })}
          </div>
          {(a.sfx || sfxDefault) !== "none" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                <span style={{ fontSize: 13, color: C.sub, width: 64, flexShrink: 0 }}>소리 크기</span>
                <input type="range" min={0.1} max={1} step={0.05} value={a.sfxVol ?? 0.6} onChange={(e) => onChange((y) => ({ ...y, sfxVol: Number(e.target.value) }), all)} style={{ flex: 1, accentColor: C.accent }} />
                <span style={{ fontSize: 12.5, color: C.sub, width: 36, textAlign: "right" }}>{Math.round((a.sfxVol ?? 0.6) * 100)}%</span>
              </div>
              {what !== "자막" && (
                <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
                  <span style={{ flex: 1, fontSize: 13, color: C.sub }}>사라질 때도 소리</span>
                  <Toggle on={Boolean(a.sfxOut)} onChange={(v) => set((y) => ({ ...y, sfxOut: v || undefined }), "out")} />
                </div>
              )}
            </>
          )}
        </div>}
        {/* 적용 범위 [이 ○만][모든 ○] 없앰 — 효과는 고른 것 하나에만 (2026-10-21 사장님: 아래 나오는 구간 단추와 헛갈림) */}
        <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.6 }}>
          {what === "자막"
            ? "효과 그림에 마우스를 올리면 움직임을 미리 볼 수 있어요. 자막 한 줄이 나올 때마다 나타나고 사라져요. [자동]은 클립마다 팝·날아오기·다가오기·페이드·굴러오기를 차례로 써요."
            : `효과 그림에 마우스를 올리면 움직임을 미리 볼 수 있어요. [자동]은 ${what}마다 팝·날아오기·다가오기·페이드·굴러오기를 차례로 써요. 여러 클립에 걸친 ${what}는 첫 클립에서 나타나고 마지막 클립에서 사라져요.`}
        </div>
      </div>
    </>
  );
}
