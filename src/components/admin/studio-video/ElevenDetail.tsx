"use client";

// 일레븐랩스 세부 설정 (2026-10-20 사장님: "싹 다 가져와줘") — 모델 · 안정감 · 닮은 정도 · 표현 과장 · 빠르기 · 스피커 부스트 · 들어 보기
//  값은 말투(emotion) 자리에 "x:" + JSON 으로 담는다 → 프로젝트 [AI 목소리 설정]·텍스트로 영상·AI 보이스 녹음이 그대로 앱에 넘기고,
//  바꾸면 캐시 열쇠가 달라져 새로 만든다 (studio-app/src/video/elevenlabs.js 가 읽는다)
import React, { useRef, useState } from "react";
import { errText, videoBridge } from "./types";
import { C, FONT, Icon, Toggle } from "./ui";

export type ElSet = { m: "v2" | "v3" | "flash"; st: number; si: number; sy: number; sp: number; bo: boolean };
const PRESET: Record<string, ElSet> = {
  normal: { m: "v2", st: 0.5, si: 0.75, sy: 0, sp: 1, bo: true },
  calm: { m: "v2", st: 0.75, si: 0.75, sy: 0, sp: 1, bo: true },
  lively: { m: "v2", st: 0.3, si: 0.75, sy: 0.35, sp: 1, bo: true },
};
export const elSetOf = (emotion?: string): ElSet => {
  const e = String(emotion || "");
  if (e.startsWith("x:")) {
    try { return { ...PRESET.normal, ...JSON.parse(e.slice(2)) }; } catch {}
  }
  return PRESET[e] || PRESET.normal;
};
export const isElCustom = (emotion?: string) => String(emotion || "").startsWith("x:");
/** v3 감정 태그 (글에 [신나게]처럼) — 앱이 일레븐랩스 영어 태그로 바꾼다 */
export const EL_TAGS = ["신나게", "차분하게", "진지하게", "속삭이며", "웃으며", "한숨", "궁금한 듯", "소리치며", "장난스럽게", "울먹이며", "비꼬듯", "헛기침"];

export function ElevenDetail({ voiceId, emotion, onEmotion, openFirst }: { voiceId: string; emotion: string; onEmotion: (e: string) => void; /** 처음부터 펼쳐 두기 */ openFirst?: boolean }) {
  const b = videoBridge();
  const v = elSetOf(emotion);
  const [open, setOpen] = useState(Boolean(openFirst) || isElCustom(emotion));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const au = useRef<HTMLAudioElement | null>(null);
  const set = (patch: Partial<ElSet>) => onEmotion("x:" + JSON.stringify({ ...v, ...patch }));
  const listen = async () => {
    if (!b?.eleven?.sample || !voiceId.startsWith("el_")) return;
    setErr("");
    setBusy(true);
    try {
      const url = await b.eleven.sample(voiceId, emotion, v.m === "v3" ? "[신나게] 역세권에 새 매물이 나왔습니다! 채광이 정말 좋아요." : "역세권에 새 매물이 나왔습니다. 채광이 정말 좋아요.");
      au.current?.pause();
      au.current = new Audio(url);
      void au.current.play().catch(() => {});
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };
  const chip = (on: boolean): React.CSSProperties => ({ height: 30, padding: "0 11px", borderRadius: 15, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent", color: on ? C.text : C.sub, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" });
  const slider = (label: string, desc: string, val: number, min: number, max: number, step: number, k: keyof ElSet, fmt: (x: number) => string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 92, flexShrink: 0, fontSize: 13.5, fontWeight: 700 }} title={desc}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={val} onChange={(e) => set({ [k]: Number(e.target.value) } as Partial<ElSet>)} style={{ flex: 1, accentColor: C.accent }} />
      <span style={{ width: 46, textAlign: "right", fontSize: 13, color: C.sub }}>{fmt(val)}</span>
    </div>
  );
  return (
    <div style={{ margin: "8px 16px 0", borderRadius: 8, border: `1px solid ${open ? C.accent : C.line2}`, background: open ? "rgba(59,130,246,0.06)" : "transparent" }}>
      <button type="button" onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 12px", border: 0, background: "transparent", color: C.text, fontFamily: FONT, fontSize: 14, fontWeight: 800, cursor: "pointer", textAlign: "left" }}>
        <Icon name="adjust" size={16} />세부 설정
        <span style={{ fontSize: 12.5, color: C.sub, fontWeight: 600 }}>{isElCustom(emotion) ? `· ${v.m === "v3" ? "v3 감정 표현" : v.m === "flash" ? "Flash" : "v2 다국어"} · 안정감 ${Math.round(v.st * 100)} · 빠르기 ${v.sp.toFixed(2)}` : "· 모델 · 안정감 · 닮은 정도 · 표현 · 빠르기"}</span>
        <span style={{ marginLeft: "auto", color: C.sub }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ padding: "2px 12px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ width: 92, fontSize: 13.5, fontWeight: 700 }}>모델</span>
            {([["v2", "v2 다국어 (안정적)"], ["v3", "v3 감정 표현"], ["flash", "Flash (빠르고 저렴)"]] as const).map(([k, l]) => <button key={k} type="button" onClick={() => set({ m: k })} style={chip(v.m === k)}>{l}</button>)}
          </div>
          {slider("안정감", "낮추면 감정 기복이 커지고, 높이면 차분하고 일정해요", v.st, 0, 1, v.m === "v3" ? 0.5 : 0.05, "st", (x) => (v.m === "v3" ? (x < 0.25 ? "창의" : x < 0.75 ? "자연" : "단단") : `${Math.round(x * 100)}`))}
          {slider("닮은 정도", "높일수록 원래 성우 목소리에 가까워요", v.si, 0, 1, 0.05, "si", (x) => `${Math.round(x * 100)}`)}
          {slider("표현 과장", "높일수록 연기가 과장돼요 (조금만 올려도 커요)", v.sy, 0, 1, 0.05, "sy", (x) => `${Math.round(x * 100)}`)}
          {slider("빠르기", "일레븐랩스 자체 빠르기 (0.7~1.2배)", v.sp, 0.7, 1.2, 0.05, "sp", (x) => `${x.toFixed(2)}배`)}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 92, fontSize: 13.5, fontWeight: 700 }}>스피커 부스트</span>
            <Toggle on={v.bo} onChange={(x) => set({ bo: x })} />
            <span style={{ fontSize: 12.5, color: C.sub }}>목소리를 더 또렷하게</span>
          </div>
          {v.m === "v3" && (
            <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.6 }}>
              v3 는 글 속 감정 태그를 연기해요: {EL_TAGS.map((t) => `[${t}]`).join(" ")} — [AI 보이스 녹음]에서 태그 단추로 넣을 수 있어요. 안정감은 창의·자연·단단 세 단계예요.
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" onClick={() => void listen()} disabled={busy || !voiceId.startsWith("el_")} style={{ ...chip(false), color: C.text }}>{busy ? "만드는 중…" : "▶ 이 설정으로 들어 보기"}</button>
            <button type="button" onClick={() => onEmotion("normal")} style={chip(false)}>처음대로</button>
            {!voiceId.startsWith("el_") && <span style={{ fontSize: 12.5, color: C.dim }}>성우를 먼저 고르세요</span>}
          </div>
          {err && <div style={{ fontSize: 13, color: C.danger }}>{err}</div>}
        </div>
      )}
    </div>
  );
}
