"use client";
// 모션 자동 입히기 (2026-10-28 사장님) — 장면(클립)마다 문장을 읽어 고른 모션을 보여 주고, 바꿀 수 있게 한 뒤 한 번에 입힌다
import React, { useMemo, useState } from "react";
import type { FlatItem } from "./timeline";
import { clipText } from "./timeline";
import { planAll, planAs, SCENE_LABELS, type ScenePlan } from "./motionAuto";
import { STYLE_PACKS, INTRO_PACK } from "./stylePacks";
import { Btn, C, FONT, Modal, input } from "./ui";

export type AutoRun = { plans: { clipId: string; plan: ScenePlan }[]; packId: string; intro: string };

export default function MotionAutoDialog({ items, vacancy, onClose, onRun }: { items: FlatItem[]; vacancy?: { trade?: string; price?: string }; onClose: () => void; onRun: (r: AutoRun) => void }) {
  // 입힐 수 있는 장면 — 글이 있는 클립 (인트로·끝 화면으로 넣은 모션 클립은 빼고)
  const rows = useMemo(() => { const xs = items.filter((x) => clipText(x.clip).trim() && !x.clip.mg); const plans = planAll(xs.map((x) => clipText(x.clip)), vacancy); return xs.map((x, i) => ({ x, plan: plans[i] })); }, [items, vacancy]);
  const [pick, setPick] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((r) => [r.x.clip.id, r.plan.template])));
  const [packId, setPackId] = useState("modern");
  const intros = Object.entries(INTRO_PACK).filter(([, p]) => p === packId).map(([id]) => id);
  const [intro, setIntro] = useState(true);
  const plansOut = () => rows.filter((r) => pick[r.x.clip.id] !== "none").map((r) => ({ clipId: r.x.clip.id, plan: pick[r.x.clip.id] === r.plan.template ? r.plan : planAs(clipText(r.x.clip), pick[r.x.clip.id], vacancy) }));
  return (
    <Modal title="모션 자동 입히기" onClose={onClose} width={860}
      footer={<><Btn onClick={onClose}>취소</Btn><Btn primary onClick={() => onRun({ plans: plansOut(), packId, intro: intro ? intros[0] || "intro" : "" })}>장면 {rows.filter((r) => pick[r.x.clip.id] !== "none").length}개에 모두 입히기</Btn></>}>
      <div style={{ fontFamily: FONT, color: C.text, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 13.5, color: C.sub, lineHeight: 1.6 }}>장면마다 성우 문장을 읽어 어울리는 모션을 골랐어요. 가격·숫자·장소·장점·인용·질문에 맞는 모션을 고르고, 같은 모양이 이어지지 않게 23가지를 돌려 써요. 바꾸거나 빼도 돼요. 글자는 문장에 있는 값만 써요.</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>스타일</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 6 }}>
            {STYLE_PACKS.map((p) => (
              <button key={p.id} type="button" onClick={() => setPackId(p.id)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, border: `2px solid ${packId === p.id ? C.accent : C.line2}`, background: packId === p.id ? C.accentDim : C.card, color: C.text, cursor: "pointer", fontFamily: FONT, fontSize: 13, fontWeight: 800 }}>
                <span style={{ display: "inline-flex", gap: 2 }}>{p.swatch.map((c) => <span key={c} style={{ width: 12, height: 12, borderRadius: 3, background: c, border: "1px solid rgba(255,255,255,.3)" }} />)}</span>
                {p.label}
              </button>
            ))}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
            <input type="checkbox" checked={intro} onChange={(e) => setIntro(e.target.checked)} style={{ width: 16, height: 16, accentColor: C.accent }} />
            인트로 · 끝 화면 · 자막·전환·배경음악도 이 스타일로 함께
          </label>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>장면별 모션</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 340, overflowY: "auto" }}>
            {rows.map(({ x }, i) => (
              <div key={x.clip.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.line2}`, background: C.card }}>
                <span style={{ width: 24, fontSize: 13, fontWeight: 800, color: C.sub }}>{i + 1}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clipText(x.clip)}</span>
                <span style={{ fontSize: 12, color: C.sub }}>{x.dur.toFixed(1)}초</span>
                <select value={pick[x.clip.id]} onChange={(e) => setPick({ ...pick, [x.clip.id]: e.target.value })} style={{ ...input, width: 140, fontSize: 13 }}>
                  {Object.entries(SCENE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  <option value="none">입히지 않기</option>
                </select>
              </div>
            ))}
            {!rows.length && <div style={{ color: C.sub, fontSize: 14 }}>글이 있는 장면이 없어요. 먼저 장면에 글(성우 문장)을 넣어 주세요.</div>}
          </div>
        </div>
      </div>
    </Modal>
  );
}
