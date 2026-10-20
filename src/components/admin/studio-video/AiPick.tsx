"use client";

// 쓸 AI 고르기 (2026-10-20 사장님: "내가 등록한 API 또는 내가 연결한 GPT·제미나이·클로드를 골라서 작성하기")
//  [내 AI 연결]에 연결된 계정(웹 창)과 넣어 둔 API 키를 칩으로 — 고르면 이번 글만 그것으로. 마지막에 고른 것을 기억한다
import React, { useEffect, useState } from "react";
import { C, FONT } from "./ui";

export type AiChoice = { provider: string; mode: "account" | "api" } | null;
type Item = { id: string; name: string; ready?: boolean; canWrite?: boolean; accountOk?: boolean; keyHas?: boolean; isWriter?: boolean; mode?: string };
type Root = { openAiConnect?: () => void; ai?: { list?: () => Promise<Item[]>; onWriterChanged?: (fn: () => void) => () => void } };
const root = () => (typeof window === "undefined" ? undefined : (window as unknown as { gongsilStudio?: Root }).gongsilStudio);
const bridge = () => root()?.ai;
const KEY = "gsv:aiPick";

export const aiChoiceName = (c: AiChoice, list: { id: string; name: string }[], fallback: string) =>
  c ? `${list.find((x) => x.id === c.provider)?.name || c.provider}${c.mode === "api" ? " API" : ""}` : fallback;

export function useAiPick(): [AiChoice, (c: AiChoice) => void, Item[]] {
  const [list, setList] = useState<Item[]>([]);
  const [pick, setPickRaw] = useState<AiChoice>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
  });
  useEffect(() => {
    const ai = bridge();
    if (!ai?.list) return;
    const load = () => ai.list!().then(setList).catch(() => {});
    load();
    const off = ai.onWriterChanged?.(load);
    window.addEventListener("focus", load);
    return () => { off?.(); window.removeEventListener("focus", load); };
  }, []);
  const setPick = (c: AiChoice) => {
    setPickRaw(c);
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch {}
  };
  return [pick, setPick, list];
}

/** 실제로 쓸 AI — 고른 게 연결돼 있으면 그것, 아니면 null (= [AI 설정] 기본) */
export const effectiveAi = (value: AiChoice, list: Item[]): AiChoice => {
  if (!value) return null;
  const x = list.find((i) => i.id === value.provider);
  return x && (value.mode === "api" ? x.keyHas : x.accountOk) ? value : null;
};

/**
 * 칩 줄 — ChatGPT·Gemini·Claude × 계정·API 를 늘 같은 자리에 (2026-10-20 사장님)
 *  쓸 수 있음 = 녹색 테두리 + 녹색 점 · 고른 것 = 파란 단추 · 연결 안 됨 = 회색 점선 (누르면 AI 설정 창)
 *  처음(고른 게 없으면)은 [AI 설정]의 기본 글쓰기 AI 가 골라져 있다
 */
export function AiPick({ value, onChange, list, noTitle }: { value: AiChoice; onChange: (c: AiChoice) => void; list: Item[]; noTitle?: boolean }) {
  const opts: { c: { provider: string; mode: "account" | "api" }; label: string; ok: boolean }[] = [];
  for (const x of list) {
    if (!x.canWrite || x.ready === false) continue;
    opts.push({ c: { provider: x.id, mode: "account" }, label: `${x.name} 계정`, ok: Boolean(x.accountOk) });
    opts.push({ c: { provider: x.id, mode: "api" }, label: `${x.name} API`, ok: Boolean(x.keyHas) });
  }
  const same = (a: AiChoice, b: AiChoice): boolean => Boolean(a && b && a.provider === b.provider && a.mode === b.mode);
  const def = list.find((x) => x.isWriter);
  const defC: AiChoice = def ? { provider: def.id, mode: def.mode === "api" ? "api" : "account" } : null;
  // 지금 고른 것 — 고른 게 쓸 수 있으면 그것, 아니면 기본 AI (그것도 안 되면 처음 쓸 수 있는 것)
  const okOf = (c: AiChoice) => opts.some((o) => o.ok && same(o.c, c));
  const cur: AiChoice = value && okOf(value) ? value : defC && okOf(defC) ? defC : opts.find((o) => o.ok)?.c || null;
  const openConnect = () => root()?.openAiConnect?.();
  const style = (ok: boolean, on: boolean): React.CSSProperties => ({
    height: 30, padding: "0 11px", borderRadius: 15, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 5,
    ...(on ? { border: `1px solid ${C.accent}`, background: C.accent, color: "#fff" }
      : ok ? { border: "1px solid #22c55e", background: "transparent", color: C.text }
      : { border: `1px dashed ${C.line2}`, background: "transparent", color: C.dim }),
  });
  // 계정끼리 · API 끼리 한 줄씩 (2026-10-20 사장님) — 이름 순서 ChatGPT · Gemini · Claude
  const ORDER = ["chatgpt", "gemini", "claude"];
  const row = (mode: "account" | "api", title: string, desc: string) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      <span style={{ width: 44, flexShrink: 0, fontSize: 12.5, fontWeight: 800, color: C.sub }} title={desc}>{title}</span>
      {opts.filter((o) => o.c.mode === mode).sort((x, y) => ORDER.indexOf(x.c.provider) - ORDER.indexOf(y.c.provider)).map((o) => {
        const on = same(cur, o.c);
        return (
          <button key={`${o.c.provider}-${o.c.mode}`} type="button" onClick={() => (o.ok ? onChange(o.c) : openConnect())}
            title={o.ok ? (on ? "지금 이 AI 로 써요" : "눌러서 이 AI 로 쓰기") : "연결 안 됨 — 눌러서 [AI 설정]에서 연결하거나 키 넣기"} style={style(o.ok, on)}>
            {o.ok && !on && <span style={{ width: 7, height: 7, borderRadius: 4, background: "#22c55e" }} />}
            {o.label.replace(/ (계정|API)$/, "")}
          </button>
        );
      })}
    </div>
  );
  return (
    <div>
      {!noTitle && <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 6 }}>쓸 AI</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {row("account", "계정", "연결한 웹 창에서 써요 (요금제 안)")}
        {row("api", "API", "넣어 둔 API 키로 바로 (쓴 만큼 요금)")}
      </div>
      <div style={{ fontSize: 12, color: C.dim, marginTop: 6, lineHeight: 1.5 }}>
        <span style={{ color: "#22c55e" }}>●</span> 쓸 수 있음 · <span style={{ color: C.accent }}>■</span> 고른 것 · 회색은 눌러서 연결 · 계정 = 연결한 웹 창 (요금제 안) · API = 넣어 둔 키 (쓴 만큼 요금)
      </div>
    </div>
  );
}
