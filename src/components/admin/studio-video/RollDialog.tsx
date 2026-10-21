"use client";

// 영상 이어 깔기 — 컷편집처럼 (2026-10-21 사장님)
//  고른 클립 구간(from~to)에 영상을 시간 순서로 꽉 채워 깐다. 영상이 끝나는 순간 다음 영상 — 클립 경계와 상관없이.
//  영상마다 쓸 구간(앞뒤 자르기) · 순서 · 모자랄 때(반복/끝) · 소리. 실제 깔기는 timeline.ts layRolls (고칠 때마다 다시 깐다)
import React, { useMemo, useState } from "react";
import type { Asset, LibItem, Project, Roll } from "./types";
import { errText, fmtTime, uid, videoBridge } from "./types";
import { clipText, flatten, rollPieces } from "./timeline";
import VideoStart from "./VideoStart";
import { Btn, C, FONT, Icon, Modal, input } from "./ui";

const COLORS = ["#3b82f6", "#f472b6", "#34d399", "#f59e0b", "#a78bfa", "#22d3ee", "#f87171", "#84cc16"];

export default function RollDialog({ project, roll, ensureAsset, onSave, onRemove, onClose }: {
  project: Project;
  roll: Roll;
  ensureAsset: (item: LibItem) => Promise<Asset>;
  onSave: (r: Roll) => void;
  onRemove?: () => void;
  onClose: () => void;
}) {
  const b = videoBridge()!;
  const [r, setR] = useState<Roll>(() => structuredClone(roll));
  const [assets, setAssets] = useState<Record<string, Asset>>({}); // 이 창에서 새로 넣은 영상
  const [trimK, setTrimK] = useState(-1);
  const [picker, setPicker] = useState<LibItem[] | null>(null);
  const [pickSel, setPickSel] = useState<string[]>([]);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const items = useMemo(() => flatten(project).items.filter((x) => x.clip.type !== "silence"), [project]);
  const all = { ...project.assets, ...assets };
  const proj = { ...project, assets: all };
  const res = rollPieces(proj, r, items);
  const ia = items.findIndex((x) => x.clip.id === r.from), ib = items.findIndex((x) => x.clip.id === r.to);
  const A = res?.A ?? 0, B = res?.B ?? 0, L = Math.max(0.01, B - A);
  const lenOf = (it: Roll["items"][number]) => Math.max(0, (it.ve ?? (all[it.asset]?.duration || 0)) - (it.vs || 0));
  const sum = r.items.reduce((t, it) => t + lenOf(it), 0);

  const add = async (list: LibItem[]) => {
    const vids = list.filter((x) => x.kind === "video");
    if (!vids.length) return setErr("영상만 이어 깔 수 있어요 (사진은 클립 화면이나 [삽입하기]로).");
    setBusy("영상을 넣는 중…");
    try {
      const got: Asset[] = [];
      for (const it of vids) got.push(await ensureAsset(it));
      setAssets((m) => ({ ...m, ...Object.fromEntries(got.map((a) => [a.id, a])) }));
      setR((x) => ({ ...x, items: [...x.items, ...got.map((a) => ({ asset: a.id }))] }));
      setErr("");
    } catch (e) {
      setErr(errText(e));
    }
    setBusy("");
  };
  const move = (k: number, d: number) => setR((x) => {
    const list = [...x.items];
    const j = k + d;
    if (j < 0 || j >= list.length) return x;
    [list[k], list[j]] = [list[j], list[k]];
    return { ...x, items: list };
  });
  const chip = (on: boolean): React.CSSProperties => ({ height: 30, padding: "0 12px", borderRadius: 5, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accent : "transparent", color: on ? "#fff" : C.sub, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer" });
  const label = (i: number) => `${i + 1}번 · ${clipText(items[i].clip).slice(0, 16) || "(글 없음)"}`;
  const trimIt = trimK >= 0 ? r.items[trimK] : null;
  const trimA = trimIt ? all[trimIt.asset] : null;

  return (
    <Modal title="영상 이어 깔기 · 컷편집처럼" onClose={onClose} width={980}
      footer={
        <>
          {onRemove && <Btn onClick={() => { onRemove(); onClose(); }} style={{ marginRight: "auto", color: C.danger }}><Icon name="trash" size={15} />이어 깔기 지우기</Btn>}
          <Btn onClick={onClose}>취소</Btn>
          <Btn primary disabled={!r.items.length || Boolean(busy)} onClick={() => { onSave(r); onClose(); }}><Icon name="check" size={16} />적용</Btn>
        </>
      }>
      <div style={{ padding: "14px 20px 18px", fontFamily: FONT, color: C.text }}>
        <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6, marginBottom: 12 }}>
          고른 클립 구간에 영상을 <b style={{ color: C.text }}>시간 순서로 꽉 채워</b> 깔아요. 영상이 끝나는 순간 다음 영상이 나와요 (클립 경계와 상관없이). 목소리·자막은 그대로예요.
        </div>

        {/* 구간 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13.5, fontWeight: 800 }}>구간</span>
          <select value={r.from} onChange={(e) => { const i = items.findIndex((x) => x.clip.id === e.target.value); setR((x) => ({ ...x, from: e.target.value, to: i > ib ? e.target.value : x.to })); }} style={{ ...input, height: 32, fontSize: 13, maxWidth: 260 }}>
            {items.map((x, i) => <option key={x.clip.id} value={x.clip.id}>{label(i)}</option>)}
          </select>
          <span style={{ color: C.dim }}>~</span>
          <select value={r.to} onChange={(e) => setR((x) => ({ ...x, to: e.target.value }))} style={{ ...input, height: 32, fontSize: 13, maxWidth: 260 }}>
            {items.map((x, i) => (i >= ia ? <option key={x.clip.id} value={x.clip.id}>{label(i)}</option> : null))}
          </select>
          <span style={{ fontSize: 13, color: C.sub }}>· {ib - ia + 1}개 클립 · {fmtTime(L, false)}</span>
        </div>

        {/* 한눈에 — 위: 클립 / 아래: 영상 조각 */}
        <div style={{ borderRadius: 6, overflow: "hidden", border: `1px solid ${C.line2}`, marginBottom: 12 }}>
          <div style={{ position: "relative", height: 26, background: C.card }}>
            {ia >= 0 && items.slice(ia, ib + 1).map((x, j) => (
              <span key={x.clip.id} title={clipText(x.clip)} style={{ position: "absolute", left: `${((x.start - A) / L) * 100}%`, width: `${(x.dur / L) * 100}%`, top: 0, bottom: 0, borderRight: `1px solid ${C.line2}`, fontSize: 11, color: C.sub, padding: "5px 4px", boxSizing: "border-box", overflow: "hidden", whiteSpace: "nowrap" }}>{ia + j + 1}번</span>
            ))}
          </div>
          <div style={{ position: "relative", height: 34, background: "#0b0b0b" }}>
            {(res?.pieces || []).map((pc, j) => (
              <span key={j} title={all[pc.asset]?.name} style={{ position: "absolute", left: `${((pc.t0 - A) / L) * 100}%`, width: `${((pc.t1 - pc.t0) / L) * 100}%`, top: 3, bottom: 3, background: COLORS[pc.k % COLORS.length], opacity: 0.85, borderRadius: 3, boxSizing: "border-box", borderRight: "2px solid #000", fontSize: 11, fontWeight: 800, color: "#fff", padding: "6px 5px", overflow: "hidden", whiteSpace: "nowrap" }}>영상 {pc.k + 1}</span>
            ))}
            {res && res.short > 0.05 && <span style={{ position: "absolute", right: 0, width: `${(res.short / L) * 100}%`, top: 3, bottom: 3, border: "1px dashed #facc15", borderRadius: 3, fontSize: 11, color: "#facc15", padding: "6px 5px", boxSizing: "border-box", overflow: "hidden", whiteSpace: "nowrap" }}>빈칸</span>}
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: res && res.short > 0.05 ? "#facc15" : C.dim, marginBottom: 10 }}>
          {!r.items.length ? "아래에서 영상을 넣어 주세요." : `영상 합계 ${sum.toFixed(1)}초 · 구간 ${L.toFixed(1)}초 — ${sum >= L - 0.05 ? "남는 영상은 구간 끝에서 잘라요" : r.end === "stop" ? `${(L - sum).toFixed(1)}초 모자라요 (그 뒤는 클립 화면이 보여요)` : "모자라면 처음 영상부터 다시 깔아요"}`}
        </div>

        {/* 영상 차례 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "34vh", overflowY: "auto" }}>
          {r.items.map((it, k) => {
            const a = all[it.asset];
            return (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", borderRadius: 6, background: C.card, borderLeft: `4px solid ${COLORS[k % COLORS.length]}` }}>
                <span style={{ width: 52, fontSize: 12.5, fontWeight: 800 }}>영상 {k + 1}</span>
                <div style={{ width: 80, height: 45, borderRadius: 4, overflow: "hidden", background: "#000", flexShrink: 0 }}>
                  {a?.thumb && <img src={a.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                </div>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a?.name || "(없는 영상)"}</span>
                <span style={{ fontSize: 12.5, color: C.sub, whiteSpace: "nowrap" }}>{fmtTime(it.vs || 0, false)}~{fmtTime(it.ve ?? (a?.duration || 0), false)} · {lenOf(it).toFixed(1)}초</span>
                <Btn small onClick={() => setTrimK(k)} title="이 영상에서 쓸 부분만 (앞뒤 자르기)"><Icon name="cut" size={14} />자르기</Btn>
                <button type="button" title="앞으로" disabled={k === 0} onClick={() => move(k, -1)} style={iconBtn}>↑</button>
                <button type="button" title="뒤로" disabled={k === r.items.length - 1} onClick={() => move(k, 1)} style={iconBtn}>↓</button>
                <button type="button" title="빼기" onClick={() => setR((x) => ({ ...x, items: x.items.filter((_, j) => j !== k) }))} style={iconBtn}><Icon name="trash" size={14} /></button>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Btn small disabled={Boolean(busy)} onClick={async () => add(await b.lib.pick().catch(() => []))}><Icon name="plus" size={14} />PC에서 영상 넣기</Btn>
          <Btn small disabled={Boolean(busy)} onClick={async () => { setPickSel([]); setPicker(((await b.lib.list({ kind: "all" }).catch(() => [])) as LibItem[]).filter((x) => x.kind === "video")); }}><Icon name="folder" size={14} />내 자료에서</Btn>
          {busy && <span style={{ fontSize: 12.5, color: C.sub }}>{busy}</span>}
          {err && <span style={{ fontSize: 12.5, color: C.danger }}>{err}</span>}
        </div>

        {/* 모자랄 때 · 소리 */}
        <div style={{ display: "flex", gap: 18, marginTop: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 800, marginRight: 4 }}>영상이 모자라면</span>
            <button type="button" onClick={() => setR((x) => ({ ...x, end: "loop" }))} style={chip(r.end !== "stop")}>처음 영상부터 다시</button>
            <button type="button" onClick={() => setR((x) => ({ ...x, end: "stop" }))} style={chip(r.end === "stop")}>거기서 끝</button>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 800, marginRight: 4 }}>영상 소리</span>
            <button type="button" onClick={() => setR((x) => ({ ...x, volume: 0 }))} style={chip(!(r.volume ?? 0))}>끔</button>
            <button type="button" onClick={() => setR((x) => ({ ...x, volume: 1 }))} style={chip((r.volume ?? 0) > 0)}>켬</button>
          </div>
        </div>
      </div>

      {/* 영상 하나 자르기 — 편집 화면과 같은 창 */}
      {trimIt && trimA && (
        <VideoStart key={trimK} trim asset={trimA} dur={lenOf(trimIt) || trimA.duration} start={trimIt.vs || 0} end={trimIt.ve ?? trimA.duration} onClose={() => setTrimK(-1)}
          onApply={(s, e) => setR((x) => ({ ...x, items: x.items.map((y, j) => (j === trimK ? { ...y, vs: s, ve: e } : y)) }))} />
      )}
      {/* 내 자료에서 — 여러 개 */}
      {picker && (
        <Modal title="내 자료 — 영상 고르기 (여러 개)" onClose={() => setPicker(null)} width={760}
          footer={<><Btn onClick={() => setPicker(null)}>취소</Btn><Btn primary disabled={!pickSel.length} onClick={() => { const l = picker.filter((x) => pickSel.includes(x.id)); setPicker(null); void add(pickSel.map((id) => l.find((x) => x.id === id)!).filter(Boolean)); }}><Icon name="check" size={16} />{pickSel.length}개 넣기</Btn></>}>
          <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, maxHeight: "60vh", overflowY: "auto" }}>
            {picker.map((x) => {
              const n = pickSel.indexOf(x.id);
              return (
                <button key={x.id} type="button" title={x.name} onClick={() => setPickSel((v) => (n >= 0 ? v.filter((y) => y !== x.id) : [...v, x.id]))}
                  style={{ position: "relative", height: 90, borderRadius: 6, overflow: "hidden", border: `2px solid ${n >= 0 ? C.accent : C.line2}`, background: "#000", cursor: "pointer", padding: 0 }}>
                  {x.thumb && <img src={x.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  <span style={{ position: "absolute", left: 4, bottom: 4, fontSize: 11, color: "#fff", background: "rgba(0,0,0,.6)", padding: "0 5px", borderRadius: 3 }}>{fmtTime(x.duration || 0, false)}</span>
                  {n >= 0 && <span style={{ position: "absolute", right: 4, top: 4, minWidth: 22, height: 22, borderRadius: 11, background: C.accent, color: "#fff", fontSize: 12, lineHeight: "22px", fontWeight: 800 }}>{n + 1}</span>}
                </button>
              );
            })}
            {!picker.length && <div style={{ color: C.sub, fontSize: 14 }}>내 자료에 영상이 없어요. [PC에서 영상 넣기]로 넣어 주세요.</div>}
          </div>
        </Modal>
      )}
    </Modal>
  );
}

/** 새 묶음 — 고른 클립 구간 (없으면 전체) */
export const newRoll = (from: string, to: string): Roll => ({ id: "roll" + uid(), from, to, items: [], end: "loop", volume: 0 });
const iconBtn: React.CSSProperties = { width: 28, height: 28, flexShrink: 0, border: `1px solid ${C.line2}`, borderRadius: 5, background: "transparent", color: C.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontFamily: FONT };
