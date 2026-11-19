"use client";
/**
 * AI편집 — 복사 → 내 ChatGPT·Gemini → 붙여넣기 → 적용 (2026-11-11 사장님: "복붙하면 자유롭게 편집할 수 있는 기능")
 *  서버 AI 를 쓰지 않는다 (회원 글쓰기는 회원 본인 AI). AI 는 장면마다 사진 찾는 말·강조 글, 위쪽 제목, 첫 장면 훅, 음악 분위기를 정한다
 *  [영상 만들기]의 [AI편집] 칸과 편집 화면 [AI편집] 단추가 같이 쓴다. 편집 화면에서는 한 번 되돌리기
 */
import React, { useState } from "react";
import { Btn, C, FONT, Icon } from "./ui";
import { uid, type Clip, type Layer, type Project } from "./types";
import { SHORTS_MUSIC } from "./webThemes";

export type AiPlan = { title: string; hook: string; music: string; scenes: { emphasis: string; photo: string }[] };

export function aiPrompt(lines: string[], o: { place?: string; kind?: string; request?: string; ratio?: string }) {
  const musics = SHORTS_MUSIC.map((m) => m.name).join(" / ");
  return [
    "당신은 부동산 쇼츠·릴스 영상 편집자예요. 아래 대본은 한 줄이 한 장면이에요.",
    `영상: ${o.ratio || "9:16"}${o.place || o.kind ? ` · ${[o.place, o.kind].filter(Boolean).join(" ")}` : ""}`,
    o.request?.trim() ? `편집 요청: ${o.request.trim()}` : "",
    "",
    "[대본]",
    ...lines.map((t, i) => `${i + 1}. ${t}`),
    "",
    "아래 형식의 JSON 하나만 답해 주세요. 설명 글은 쓰지 마세요.",
    "{",
    '  "title": "영상 내내 위쪽에 둘 제목 (15자 안팎, 없으면 빈칸)",',
    '  "hook": "첫 장면에 크게 띄울 한마디 (12자 안팎)",',
    `  "music": "다음 중 하나 그대로: ${musics} / 음악 없이",`,
    '  "scenes": [',
    '    { "n": 1, "emphasis": "이 장면에 크게 띄울 짧은 강조 글 (8자 안팎, 꼭 필요한 장면만, 아니면 빈칸)", "photo": "이 장면에 어울리는 무료 사진 검색어 (영어 2~4 단어)" }',
    "  ]",
    "}",
    `scenes 는 대본 줄 수(${lines.length}개)만큼, 순서대로. 가격·숫자는 대본에 있는 것만 쓰고 지어내지 마세요.`,
  ].filter((x) => x !== "").join("\n");
}

export function parsePlan(text: string, n: number): AiPlan {
  const t = text.replace(/```(?:json)?/gi, "");
  const a = t.indexOf("{"), z = t.lastIndexOf("}");
  if (a < 0 || z <= a) throw new Error("AI 답에서 { … } 형식을 찾지 못했어요. 답 전체를 그대로 붙여 넣어 주세요.");
  let j: { title?: unknown; hook?: unknown; music?: unknown; scenes?: { emphasis?: unknown; photo?: unknown }[] };
  try { j = JSON.parse(t.slice(a, z + 1)); } catch { throw new Error("AI 답을 읽지 못했어요. 답 전체를 그대로 붙여 넣어 주세요."); }
  const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
  const scenes = Array.from({ length: n }, (_, i) => ({ emphasis: str(j.scenes?.[i]?.emphasis, 30), photo: str(j.scenes?.[i]?.photo, 60) }));
  return { title: str(j.title, 40), hook: str(j.hook, 30), music: str(j.music, 40), scenes };
}

export const AI_LAYER = /^AI /;
/** 계획을 프로젝트에 — 예전 AI 글은 지우고 새로. 음악은 고른 것으로 바꾼다 */
export function applyPlan(p: Project, plan: AiPlan, clips: Clip[]) {
  if (!clips.length) return;
  const first = clips[0].id, end = clips[clips.length - 1].id;
  const keep = (p.layers || []).filter((l) => !(l.name && AI_LAYER.test(l.name)));
  const add: Layer[] = [];
  const font = "Pretendard";
  if (plan.title) add.push({ id: uid(), type: "text", from: first, to: end, x: 0.5, y: 0.1, pos: "top", text: plan.title, size: 76, color: "#FFFFFF", font, bold: true, box: true, boxColor: "#111827", boxOpacity: 0.85, name: "AI 제목" } as Layer);
  if (plan.hook) add.push({ id: uid(), type: "text", from: first, to: first, ts: 0, te: 2.6, x: 0.5, y: 0.6, text: plan.hook, size: 110, color: "#FFFFFF", font, bold: true, box: true, boxColor: "#E11D48", boxOpacity: 1, anim: { in: "pop", out: "fade", dur: 0.35 }, name: "AI 훅" } as Layer);
  plan.scenes.forEach((s, i) => {
    const c = clips[i];
    if (!c || !s.emphasis || (i === 0 && plan.hook)) return;
    add.push({ id: uid(), type: "text", from: c.id, to: c.id, ts: 0.2, x: 0.5, y: 0.42, text: s.emphasis, size: 96, color: "#111827", font, bold: true, box: true, boxColor: "#FACC15", boxOpacity: 1, anim: { in: "pop", out: "fade", dur: 0.3 }, name: `AI 강조 ${i + 1}` } as Layer);
  });
  let layers = [...keep, ...add];
  const m = SHORTS_MUSIC.find((x) => x.name === plan.music);
  if (m || /음악\s*없이/.test(plan.music)) {
    layers = layers.filter((l) => l.type !== "music");
    if (m) layers.push({ id: uid(), type: "music", from: first, to: end, url: m.url, file: m.url, volume: 0.15, duck: "mid", loop: true, fadeOut: 1.5, name: m.name } as Layer);
  }
  p.layers = layers;
}

/** 복사 → 붙여넣기 → 적용 칸 */
export function AiEditBox({ prompt, onApply, applied, onClear, compact }: { prompt: (request: string) => string; onApply: (answer: string) => void; applied?: string; onClear?: () => void; compact?: boolean }) {
  const [req, setReq] = useState("");
  const [ans, setAns] = useState("");
  const [msg, setMsg] = useState("");
  const box: React.CSSProperties = { width: "100%", boxSizing: "border-box", borderRadius: 6, border: `1px solid ${C.line2}`, background: C.card, color: C.text, fontSize: 14, fontFamily: FONT, padding: "8px 10px" };
  const copy = async (where: "chatgpt" | "gemini") => {
    const t = prompt(req);
    try { await navigator.clipboard.writeText(t); setMsg("복사했어요. 새 탭의 AI 에 붙여 넣고(Ctrl+V) 보내세요. 답을 아래 칸에 붙여 넣으면 돼요."); }
    catch { setMsg("복사가 막혔어요. 아래 글을 직접 복사해 주세요."); setAns(t); }
    window.open(where === "chatgpt" ? "https://chatgpt.com/" : "https://gemini.google.com/app", "_blank");
  };
  const apply = () => {
    try { onApply(ans); setMsg(""); setAns(""); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: FONT, color: C.text }}>
      <input value={req} onChange={(e) => setReq(e.target.value)} placeholder="AI 에게 바라는 점 (없어도 돼요) — 예) 고급스럽게, 가격 장면 강조" style={{ ...box, height: 38 }} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: C.sub }}>① AI 에게 보낼 글 복사 →</span>
        <Btn small onClick={() => void copy("chatgpt")}><Icon name="copy" size={14} />ChatGPT 로</Btn>
        <Btn small onClick={() => void copy("gemini")}><Icon name="copy" size={14} />Gemini 로</Btn>
      </div>
      <textarea value={ans} onChange={(e) => setAns(e.target.value)} rows={compact ? 4 : 5} placeholder="② AI 답을 여기에 붙여 넣으세요" style={{ ...box, resize: "vertical", lineHeight: 1.5 }} />
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <Btn primary small onClick={apply} disabled={!ans.trim()}><Icon name="check" size={14} />③ 적용하기</Btn>
        {applied && <span style={{ fontSize: 13, color: C.accent, fontWeight: 700 }}>{applied}</span>}
        {applied && onClear && <Btn small onClick={onClear}>AI 편집 빼기</Btn>}
      </div>
      {msg && <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.5 }}>{msg}</div>}
    </div>
  );
}
