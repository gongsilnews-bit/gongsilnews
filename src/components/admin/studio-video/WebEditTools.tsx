"use client";
/**
 * 웹 편집 화면 머리줄 — [빈 장면 채우기] · [AI편집] (2026-11-11 사장님)
 *  빈 장면 = 화면 자료가 없거나 앞 장면 사진을 그대로 이어 쓰는 장면. [영상 만들기]의 체크 네 개와 같은 기준(이 PC 에 기억)
 *  둘 다 한 번에 하나의 고치기라 [되돌리기](Ctrl+Z) 한 번으로 돌아간다
 */
import React, { useState } from "react";
import { Btn, C, FONT, Icon } from "./ui";
import { errText, videoBridge, type Clip, type Project } from "./types";
import { FILL_LABELS, assignVisuals, gatherFill, loadFill, saveFill, type FillOpts } from "./webFill";
import { AiEditBox, aiPrompt, applyPlan, parsePlan } from "./webAiEdit";

const shots = (p: Project): Clip[] => p.scenes.flatMap((s) => s.clips);
const lineOf = (c: Clip) => String(c.text || c.subText || "").trim();
/** 빈 장면 id — 자료가 없거나 앞 장면과 같은 자료 */
function emptyIds(p: Project) {
  const out = new Set<string>();
  let prev = "";
  for (const c of shots(p)) {
    const a = c.visual?.asset || "";
    if (!a || a === prev) out.add(c.id);
    if (a) prev = a;
  }
  return out;
}

export default function WebEditTools({ get, change, undo, say }: { get: () => Project; change: (fn: (p: Project) => void) => void; undo: () => void; say: (t: string) => void }) {
  const [open, setOpen] = useState<"" | "fill" | "ai">("");
  const [opts, setOpts] = useState<FillOpts>(() => loadFill());
  const [busy, setBusy] = useState("");
  const [aiDone, setAiDone] = useState("");
  const pop: React.CSSProperties = { position: "absolute", right: 0, top: 38, zIndex: 80, width: 380, padding: 12, borderRadius: 8, border: `1px solid ${C.line2}`, background: C.panel, boxShadow: "0 10px 30px rgba(0,0,0,0.45)", fontFamily: FONT, color: C.text };

  const fill = async () => {
    const b = videoBridge();
    if (!b) return;
    const cur = get();
    const empty = emptyIds(cur);
    if (!empty.size) { say("빈 장면이 없어요"); setOpen(""); return; }
    setBusy("자료를 찾는 중…");
    try {
      const work = structuredClone(cur) as Project;
      const ids = await gatherFill(b, work, { opts, vacId: cur.vacancyId || "", need: empty.size, ratio: cur.ratio, say: setBusy });
      if (!ids.length) { say("넣을 만한 자료를 찾지 못했어요 — 체크를 바꿔 보세요"); setBusy(""); return; }
      change((np) => {
        np.assets = { ...np.assets, ...work.assets };
        assignVisuals(shots(np), ids, (c) => empty.has(c.id));
      });
      say(`빈 장면 ${Math.min(ids.length, empty.size)}개를 채웠어요 — 마음에 안 들면 [되돌리기]`);
      setOpen("");
    } catch (e) {
      say(errText(e));
    }
    setBusy("");
  };

  return (
    <>
      <span style={{ position: "relative", marginRight: 8 }}>
        <Btn small onClick={() => setOpen(open === "fill" ? "" : "fill")} title="사진이 없거나 앞 장면 사진을 이어 쓰는 장면을 공실·단지·공실뉴스 자료로 채워요"><Icon name="image" size={15} />빈 장면 채우기</Btn>
        {open === "fill" && (
          <div style={pop}>
            <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 8 }}>어디서 채울까요? <span style={{ color: C.dim, fontWeight: 600 }}>(빈 장면 {emptyIds(get()).size}개)</span></div>
            {FILL_LABELS.map(([k, l, d]) => (
              <label key={k} title={d} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, padding: "4px 0", cursor: "pointer", color: opts[k] ? C.text : C.sub }}>
                <input type="checkbox" checked={opts[k]} disabled={Boolean(busy)} onChange={(e) => { const n = { ...opts, [k]: e.target.checked }; setOpts(n); saveFill(n); }} style={{ width: 16, height: 16, accentColor: C.accent }} />{l}
              </label>
            ))}
            <div style={{ fontSize: 12.5, color: C.dim, margin: "6px 0 10px", lineHeight: 1.5 }}>관련 있는 것만 넣어요. 모자라면 앞 장면 사진 그대로 둬요.</div>
            <Btn primary small onClick={() => void fill()} disabled={Boolean(busy)}>{busy || "채우기"}</Btn>
          </div>
        )}
      </span>
      <span style={{ position: "relative", marginRight: 8 }}>
        <Btn small onClick={() => setOpen(open === "ai" ? "" : "ai")} title="내 ChatGPT·Gemini 에 복사해 보내고, 답을 붙여 넣으면 제목·강조 글·음악을 넣어요"><Icon name="ai" size={15} />AI편집</Btn>
        {open === "ai" && (
          <div style={{ ...pop, width: 420 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 8 }}>AI편집 — 제목·첫 장면 훅·장면 강조 글·음악</div>
            <AiEditBox compact
              prompt={(req) => aiPrompt(shots(get()).map(lineOf).filter(Boolean), { request: req, ratio: get().ratio })}
              onApply={(ans) => {
                const list = shots(get()).filter((c) => lineOf(c));
                const plan = parsePlan(ans, list.length);
                change((np) => applyPlan(np, plan, shots(np).filter((c) => lineOf(c))));
                setAiDone(`적용했어요${plan.title ? ` — 제목 "${plan.title}"` : ""}${plan.music ? ` · 음악 ${plan.music}` : ""}`);
                say("AI편집을 적용했어요 — 마음에 안 들면 [되돌리기]");
              }}
              applied={aiDone} />
            {aiDone && <div style={{ marginTop: 8 }}><Btn small onClick={() => { undo(); setAiDone(""); say("AI편집 전으로 되돌렸어요"); }}><Icon name="undo" size={14} />되돌리기</Btn></div>}
          </div>
        )}
      </span>
    </>
  );
}
