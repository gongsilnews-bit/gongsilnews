"use client";

// 공실마케팅 › 인테리어·리모델링 예측 시뮬레이션 (2026-10-22, docs/2026-10-22_sim_report_plan.md)
//  기사와 다르다 — 공실과 연결하지 않고, 공간마다 세부적으로 결과를 만든다 (사장님 2026-10-22).
//  왼쪽(넓게) = ① 현장 정보 ② 공통 조건 ③ 공간(거실·안방·주방·욕실…)마다 조건·면적 먼저 → 사진 ④ [예측 만들기] — 공간마다 하나씩
//  오른쪽 = 보고서(A4 세로: 표지 → 개요·합계 → 공간마다 1쪽 → 종합 견적서). 디자인은 [디자인] 창에서.
//  묶음은 이 PC 에 저장된다 (studio-app sim-writer.js projCreate…). 부동산 이름은 넣지 않는다.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toCanvas, getFontEmbedCSS } from "html-to-image";
import { imagePdf, browserPrint, download } from "../studio-doc/print";
import type { Sim, SimOptions } from "../sections/StudioSimSource";
import { COLORS, KIND_TEXT, LAYOUTS, PAGE_H, PAGE_W, RenderPage, pageDefs, totalOf, type Kind, type Media, type ReportState, type Site, type SpaceView } from "./pages";

type Space = { key: string; name: string; simId: string; sim: Sim | null };
type Proj = { id: string; kind: Kind; createdAt: string; site: Site; common: Record<string, unknown>; spaces: Space[]; report: Partial<ReportState> | null };
type Recent = { id: string; createdAt: string; title: string; spaces: string };
type Bridge = {
  sim: {
    options: (kind: string) => Promise<SimOptions>;
    get: (id: string) => Promise<Sim | null>;
    addPhotos: (opts: { id: string; dataUrls: string[] }) => Promise<Sim>;
    update: (opts: { id: string; pick?: string[]; design?: Record<string, unknown>; costBase?: Record<string, number> }) => Promise<Sim>;
    run: (id: string) => Promise<Sim>;
    onProgress: (fn: (t: string) => void) => () => void;
    reportMedia?: (id: string) => Promise<Media>;
    projCreate?: (kind: string) => Promise<Proj>;
    projGet?: (id: string) => Promise<Proj | null>;
    projList?: (kind: string) => Promise<Recent[]>;
    projSave?: (opts: { id: string; site?: Partial<Site>; common?: Record<string, unknown>; spaces?: { key: string; name: string; simId: string }[]; report?: ReportState }) => Promise<Proj>;
    projAddSpace?: (opts: { id: string; name: string; roomType?: string }) => Promise<Proj>;
    projText?: (id: string) => Promise<Record<string, string>>;
  };
  marketing?: { saveFile?: (opts: { id: string; sub: string; fileName: string; dataUrl: string; quiet?: boolean }) => Promise<{ file: string; folder: string }> };
};
type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; bg?: string };
const bridge = (): Bridge | null => (typeof window !== "undefined" ? ((window as unknown as { gongsilStudio?: Bridge }).gongsilStudio ?? null) : null);
const cleanErr = (e: unknown) => {
  const m = e instanceof Error ? e.message : String(e);
  // 앱 본체가 새 기능보다 옛것 (다시 켜기 전)
  if (/No handler registered/.test(m)) return "공실스튜디오를 다시 켜 주세요. (앱을 껐다 켜면 예측 보고서 기능이 연결돼요)";
  return m.replace(/^Error invoking remote method '[^']+': (Error: )?/, "");
};
const ymd = (d = new Date()) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
const safe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
const blobUrl = (b: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
const readFile = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(f); });
const RESTART = "공실스튜디오를 다시 켜 주세요. (앱을 껐다 켜면 예측 보고서 기능이 연결돼요)";

/* 공간 추가 단추 — 인테리어는 방 이름과 공간 유형, 리모델링은 건물의 면 */
const ADD: Record<Kind, { name: string; roomType?: string }[]> = {
  interior: [
    { name: "거실", roomType: "living-room" }, { name: "안방", roomType: "bedroom" }, { name: "작은방", roomType: "bedroom" },
    { name: "주방", roomType: "kitchen" }, { name: "욕실", roomType: "bathroom" }, { name: "현관", roomType: "entrance" }, { name: "발코니", roomType: "balcony" },
  ],
  remodel: [{ name: "정면" }, { name: "측면" }, { name: "후면" }, { name: "1층 입구" }],
};

function initialReport(kind: Kind, saved: Partial<ReportState> | null): ReportState {
  return {
    color: saved?.color || "teal",
    layout: saved?.layout || "type1",
    footer: saved?.footer || KIND_TEXT[kind].footer,
    off: Array.isArray(saved?.off) ? saved!.off : [],
    t: { ...(saved?.t || {}) },
  };
}

const CSS = `
.gsr-ed{outline:none;border-radius:3px;cursor:text;transition:background .15s}
.gsr-ed:hover{background:rgba(251,191,36,.18);box-shadow:0 0 0 1px rgba(252,211,77,.9)}
.gsr-ed:focus{background:rgba(251,191,36,.28);box-shadow:0 0 0 1px #f59e0b}
.gsr-ed:empty::before{content:attr(data-ph);color:#cbd5e1;font-weight:500}
`;
const card: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "18px 20px" };
const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "9px 11px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13.5, fontFamily: "inherit", color: "#111827", background: "#fff" };
const chip = (on: boolean): React.CSSProperties => ({
  padding: "6px 11px", borderRadius: 999, cursor: "pointer", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit",
  border: `1px solid ${on ? "#1a3a6b" : "#e5e7eb"}`, background: on ? "#1a3a6b" : "#fff", color: on ? "#fff" : "#374151",
});
const plainBtn: React.CSSProperties = { padding: "8px 13px", background: "#fff", color: "#111827", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" };
const shortName = (s: string) => s.replace(/\s*\(.*\)$/, "");
/* 선 픽토그램 (이모지 대신 — 2026-10-22 사장님) */
const PICTO: Record<string, string> = {
  upload: "M4 16.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2.5M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5",
  image: "M4 5h16v14H4zM4 15l4.5-4.5 4 4 2.5-2.5L20 17M15.5 9.5a1.5 1.5 0 1 0 0-.01",
  palette: "M12 3a9 9 0 1 0 0 18c1 0 1.5-.7 1.5-1.5 0-.9-.6-1.2-.6-2 0-.9.7-1.5 1.6-1.5H17a4 4 0 0 0 4-4c0-5-4-9-9-9zM7.5 11.5h.01M10 7.5h.01M14.5 7.5h.01M17 11h.01",
};
const Picto = ({ n, size = 18, color = "currentColor", w = 1.8 }: { n: string; size?: number; color?: string; w?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d={PICTO[n]} /></svg>
);
const step = (n: number, t: string, extra?: React.ReactNode) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
    <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#1a3a6b", color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</span>
    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#111827", flex: 1 }}>{t}</h3>
    {extra}
  </div>
);

export default function SimReport({ kind }: { kind: Kind; theme: Theme }) {
  const LAST = `studio_sim_proj_${kind}`;
  const [opts, setOpts] = useState<SimOptions | null>(null);
  const [proj, setProj] = useState<Proj | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [busy, setBusy] = useState("");
  const [progress, setProgress] = useState("");
  const [note, setNote] = useState("");
  const [running, setRunning] = useState<string>(""); // 예측 중인 공간 key
  const [openCond, setOpenCond] = useState<Record<string, boolean>>({});
  const [ok, setOk] = useState(true);

  const refreshRecent = useCallback(() => { bridge()?.sim.projList?.(kind).then(setRecent).catch(() => {}); }, [kind]);
  const choose = (p: Proj | null) => {
    setProj(p);
    try { if (p) localStorage.setItem(LAST, p.id); } catch {}
  };
  useEffect(() => {
    const b = bridge();
    if (!b) return;
    if (typeof b.sim.projCreate !== "function") { setOk(false); return; }
    b.sim.options(kind).then(setOpts).catch((e) => setNote(cleanErr(e)));
    refreshRecent();
    let id = "";
    try { id = localStorage.getItem(LAST) || ""; } catch {}
    if (id) b.sim.projGet!(id).then((p) => p && setProj(p)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const act = async (label: string, fn: () => Promise<string | void>) => {
    if (busy) return;
    setBusy(label);
    setNote("");
    const off = bridge()?.sim.onProgress(setProgress) || (() => {});
    try {
      const m = await fn();
      if (m) setNote(m);
    } catch (e) {
      setNote(cleanErr(e));
    } finally {
      off();
      setProgress("");
      setBusy("");
    }
  };
  const newProj = () => act("새 보고서를 만드는 중…", async () => { choose(await bridge()!.sim.projCreate!(kind)); refreshRecent(); });
  const reload = async (id = proj?.id) => { if (id) { const p = await bridge()!.sim.projGet!(id); if (p) setProj(p); } };

  /* ① 현장 정보 */
  const saveSite = async (patch: Partial<Site>) => {
    if (!proj) return;
    setProj({ ...proj, site: { ...proj.site, ...patch } });
    await bridge()!.sim.projSave!({ id: proj.id, site: patch }).catch(() => {});
    refreshRecent();
  };
  /* ② 공통 조건 — 모든 공간에 같이 */
  const setCommon = (key: string, ids: string[]) => act("모든 공간에 적용하는 중…", async () => {
    if (!proj) return;
    const common = { ...proj.common, [key]: ids };
    await bridge()!.sim.projSave!({ id: proj.id, common });
    for (const sp of proj.spaces) await bridge()!.sim.update({ id: sp.simId, design: { [key]: ids } });
    await reload();
  });
  /* ③ 공간 */
  const addSpace = (a: { name: string; roomType?: string }) => act(`${a.name}을(를) 넣는 중…`, async () => {
    let p = proj;
    if (!p) { p = await bridge()!.sim.projCreate!(kind); choose(p); }
    const used = p.spaces.filter((x) => x.name.startsWith(a.name)).length;
    const r = await bridge()!.sim.projAddSpace!({ id: p.id, name: used ? `${a.name} ${used + 1}` : a.name, roomType: a.roomType });
    choose(r);
    setOpenCond((o) => ({ ...o, [r.spaces[r.spaces.length - 1].key]: true }));
    refreshRecent();
  });
  const saveSpaces = async (spaces: Space[]) => {
    if (!proj) return;
    setProj({ ...proj, spaces });
    await bridge()!.sim.projSave!({ id: proj.id, spaces: spaces.map(({ key, name, simId }) => ({ key, name, simId })) }).catch(() => {});
  };
  const renameSpace = (key: string, name: string) => saveSpaces(proj!.spaces.map((x) => (x.key === key ? { ...x, name } : x)));
  const removeSpace = (key: string) => { if (window.confirm("이 공간을 보고서에서 뺄까요?")) saveSpaces(proj!.spaces.filter((x) => x.key !== key)); };
  const moveSpace = (key: string, d: -1 | 1) => {
    const a = [...proj!.spaces];
    const i = a.findIndex((x) => x.key === key);
    const j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    saveSpaces(a);
  };
  const updSim = async (sp: Space, patch: { pick?: string[]; design?: Record<string, unknown>; costBase?: Record<string, number> }) => {
    try {
      const s = await bridge()!.sim.update({ id: sp.simId, ...patch });
      setProj((p) => (p ? { ...p, spaces: p.spaces.map((x) => (x.key === sp.key ? { ...x, sim: s } : x)) } : p));
    } catch (e) { setNote(cleanErr(e)); }
  };
  const toggleOpt = (sp: Space, key: string, id: string, single?: boolean) => {
    const cur = ((sp.sim?.design[key] as string[]) || []);
    if (single) return updSim(sp, { design: { [key]: [id] } });
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    if (!next.length) return;
    updSim(sp, { design: { [key]: next } });
  };
  const upload = (sp: Space, files: FileList | null) => {
    if (!files || !files.length) return;
    const list = Array.from(files).slice(0, 4);
    act("사진을 넣는 중…", async () => {
      let s = await bridge()!.sim.addPhotos({ id: sp.simId, dataUrls: await Promise.all(list.map(readFile)) });
      const newest = s.photos[s.photos.length - list.length]; // 방금 올린 첫 장을 지금 모습으로
      if (newest && !newest.on) s = await bridge()!.sim.update({ id: sp.simId, pick: [newest.id] });
      setProj((p) => (p ? { ...p, spaces: p.spaces.map((x) => (x.key === sp.key ? { ...x, sim: s } : x)) } : p));
    });
  };
  /* ④ 예측 — 공간마다 하나씩 차례로 */
  const runSpaces = (only?: Space) => act("예측을 만드는 중…", async () => {
    if (!proj) return;
    const list = only ? [only] : proj.spaces.filter((x) => !x.sim?.result);
    const ready = list.filter((x) => x.sim && x.sim.photos.some((ph) => ph.on));
    if (!ready.length) throw new Error(only ? "이 공간에 사진을 먼저 올려 주세요." : "사진을 올린 공간이 없어요. 공간마다 사진을 1장씩 올려 주세요.");
    let done = 0;
    const fails: string[] = [];
    for (const sp of ready) {
      setRunning(sp.key);
      try {
        const s = await bridge()!.sim.run(sp.simId);
        setProj((p) => (p ? { ...p, spaces: p.spaces.map((x) => (x.key === sp.key ? { ...x, sim: s } : x)) } : p));
        done++;
      } catch (e) {
        fails.push(`${sp.name}: ${cleanErr(e)}`);
        if (/중지했어요/.test(cleanErr(e))) break;
      }
    }
    setRunning("");
    const skipped = list.length - ready.length;
    return fails.length ? `예측 ${done}곳 완료 · 실패 ${fails.join(" / ")}` : `✓ ${done}곳 예측을 만들었어요${skipped ? ` (사진 없는 ${skipped}곳은 건너뜀)` : ""}. 오른쪽 보고서를 확인하세요.`;
  });

  if (!ok) return <div style={{ ...card, textAlign: "center", color: "#b91c1c", fontWeight: 700 }}>{RESTART}</div>;

  const interior = kind === "interior";
  const commonKeys = interior ? ["style"] : ["materials", "colors"];
  const todo = proj ? proj.spaces.filter((x) => !x.sim?.result).length : 0;
  const withPhoto = proj ? proj.spaces.filter((x) => !x.sim?.result && x.sim?.photos.some((p) => p.on)).length : 0;

  const left = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* 보고서 고르기 */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <select value={proj?.id || ""} onChange={(e) => e.target.value && bridge()!.sim.projGet!(e.target.value).then((p) => p && choose(p))} style={{ ...inp, flex: 1 }}>
          <option value="">{recent.length ? `내 보고서 (${recent.length}개, 이 PC)` : "아직 만든 보고서가 없어요"}</option>
          {recent.map((r) => <option key={r.id} value={r.id}>{r.title} · {r.spaces || "공간 없음"} · {r.createdAt.slice(0, 10)}</option>)}
        </select>
        <button style={{ ...plainBtn, background: "#1a3a6b", color: "#fff", border: 0 }} onClick={newProj} disabled={Boolean(busy)}>+ 새 보고서</button>
      </div>

      {!proj ? (
        <div style={{ ...card, textAlign: "center", padding: "40px 20px", color: "#6b7280", fontSize: 14, lineHeight: 1.7 }}>
          [+ 새 보고서]를 누르거나 아래 공간 단추로 바로 시작하세요.
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginTop: 14 }}>
            {ADD[kind].map((a) => <button key={a.name} style={plainBtn} onClick={() => addSpace(a)}>+ {a.name}</button>)}
          </div>
        </div>
      ) : (
        <>
          <div style={card}>
            {step(1, "현장 정보")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: "#6b7280" }}>현장 이름
                <input key={`t${proj.id}`} style={{ ...inp, marginTop: 4 }} defaultValue={proj.site.title} placeholder={interior ? "예: 논현동 빌라 3층" : "예: 논현동 상가 건물"} onBlur={(e) => e.target.value !== proj.site.title && saveSite({ title: e.target.value })} />
              </label>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: "#6b7280" }}>위치 (선택)
                <input key={`a${proj.id}`} style={{ ...inp, marginTop: 4 }} defaultValue={proj.site.address} placeholder="예: 서울 강남구 논현동" onBlur={(e) => e.target.value !== proj.site.address && saveSite({ address: e.target.value })} />
              </label>
              <label style={{ gridColumn: "1 / -1", fontSize: 12.5, fontWeight: 700, color: "#6b7280" }}>요청 사항 (선택 · 보고서 개요에 들어가요)
                <input key={`m${proj.id}`} style={{ ...inp, marginTop: 4 }} defaultValue={proj.site.memo} placeholder="예: 임대 전 전체 리모델링 검토, 밝고 넓어 보이게" onBlur={(e) => e.target.value !== proj.site.memo && saveSite({ memo: e.target.value })} />
              </label>
            </div>
          </div>

          {opts && (
            <div style={card}>
              {step(2, "공통 조건", <span style={{ fontSize: 12, color: "#6b7280" }}>모든 공간에 같이 적용 · 공간마다 따로 바꿀 수도 있어요</span>)}
              {opts.groups.filter((g) => commonKeys.includes(g.key)).map((g) => {
                const cur = (proj.common[g.key] as string[]) || (proj.spaces[0]?.sim?.design[g.key] as string[]) || [];
                return (
                  <div key={g.key} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#6b7280", margin: "4px 0 6px" }}>{g.label}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {g.options.map((o) => (
                        <button key={o.id} style={chip(cur.includes(o.id))} onClick={() => setCommon(g.key, g.single ? [o.id] : cur.includes(o.id) ? cur.filter((x) => x !== o.id) : [...cur, o.id])}>{shortName(o.name)}</button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={card}>
            {step(3, `공간 (${proj.spaces.length}곳)`, <span style={{ fontSize: 12, color: "#6b7280" }}>조건·면적을 먼저 넣고 사진 1장</span>)}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {ADD[kind].map((a) => <button key={a.name} style={plainBtn} onClick={() => addSpace(a)} disabled={Boolean(busy)}>+ {a.name}</button>)}
            </div>
            {!proj.spaces.length && <div style={{ fontSize: 13.5, color: "#6b7280", padding: "10px 0" }}>위 단추로 공간을 넣어 주세요. {interior ? "거실·안방·주방·욕실처럼 고칠 곳마다 하나씩" : "정면·측면처럼 보여 줄 면마다 하나씩"}.</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {proj.spaces.map((sp, i) => {
                const s = sp.sim;
                const on = s?.photos.find((p) => p.on);
                const open = openCond[sp.key] ?? !s?.result;
                const st = running === sp.key ? { t: "예측 중…", c: "#2563eb" } : s?.result ? { t: "완료", c: "#16a34a" } : on ? { t: "사진 있음", c: "#b45309" } : { t: "사진 필요", c: "#9ca3af" };
                return (
                  <div key={sp.key} style={{ border: `1px solid ${running === sp.key ? "#2563eb" : "#e5e7eb"}`, borderRadius: 12, padding: 14, background: "#fcfcfd" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 22, height: 22, borderRadius: 11, background: "#e5e7eb", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                      <input style={{ ...inp, width: 140, fontWeight: 800 }} defaultValue={sp.name} key={`n${sp.key}`} onBlur={(e) => e.target.value !== sp.name && renameSpace(sp.key, e.target.value)} />
                      {interior && opts?.rooms && s && (
                        <select style={{ ...inp, width: 150 }} value={String(s.design.roomType || "")} onChange={(e) => updSim(sp, { design: { roomType: e.target.value } })}>
                          {opts.rooms.map((r) => <option key={r.id} value={r.id}>{shortName(r.name)}</option>)}
                        </select>
                      )}
                      <span style={{ fontSize: 12, fontWeight: 800, color: st.c }}>{st.t}</span>
                      <span style={{ flex: 1 }} />
                      <button style={{ ...plainBtn, padding: "5px 8px" }} onClick={() => moveSpace(sp.key, -1)} title="위로">▲</button>
                      <button style={{ ...plainBtn, padding: "5px 8px" }} onClick={() => moveSpace(sp.key, 1)} title="아래로">▼</button>
                      <button style={{ ...plainBtn, padding: "5px 9px", color: "#b91c1c" }} onClick={() => removeSpace(sp.key)}>빼기</button>
                    </div>
                    {s && (
                      <div style={{ display: "flex", gap: 16, marginTop: 12, alignItems: "flex-start" }}>
                        {/* 사진 — 크게, 눌러서 올리기 · 끌어다 놓기 (2026-10-22 사장님) */}
                        <div style={{ width: 240, flexShrink: 0 }}>
                          <label
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => { e.preventDefault(); upload(sp, e.dataTransfer.files); }}
                            style={{ display: "block", position: "relative", width: 240, height: 180, borderRadius: 10, overflow: "hidden", cursor: "pointer",
                              border: on ? "1px solid #e5e7eb" : "2px dashed #2563eb", background: on ? "#000" : "#eff6ff" }}>
                            {on?.thumb ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={on.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                            ) : (
                              <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: "#1d4ed8", textAlign: "center", padding: 10 }}>
                                <span style={{ width: 52, height: 52, borderRadius: 26, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center" }}><Picto n="upload" size={26} color="#1d4ed8" w={2} /></span>
                                <b style={{ fontSize: 14 }}>{sp.name} 사진 올리기</b>
                                <span style={{ fontSize: 12, color: "#3b82f6" }}>눌러서 고르거나 여기로 끌어다 놓으세요</span>
                              </div>
                            )}
                            {on && <span style={{ position: "absolute", left: 8, top: 8, padding: "2px 8px", borderRadius: 4, background: "rgba(17,24,39,0.75)", color: "#fff", fontSize: 11.5, fontWeight: 700 }}>지금 모습 · 눌러서 바꾸기</span>}
                            <input type="file" accept="image/*" hidden onChange={(e) => { upload(sp, e.target.files); e.target.value = ""; }} />
                          </label>
                          {s.photos.length > 1 && (
                            <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                              {s.photos.map((ph) => (
                                <button key={ph.id} onClick={() => !ph.on && updSim(sp, { pick: [ph.id] })} title="이 사진으로" style={{ width: 54, height: 40, padding: 0, border: 0, borderRadius: 4, overflow: "hidden", cursor: "pointer", boxShadow: ph.on ? "0 0 0 2px #1a3a6b" : "0 0 0 1px #e5e7eb", opacity: ph.on ? 1 : 0.55 }}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  {ph.thumb && <img src={ph.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                                </button>
                              ))}
                            </div>
                          )}
                          {s.result && (
                            <div style={{ position: "relative", width: 240, height: 180, borderRadius: 10, overflow: "hidden", marginTop: 8, boxShadow: "0 0 0 2px #16a34a" }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {s.result.versions[0]?.image && <img src={s.result.versions[0].image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                              <span style={{ position: "absolute", left: 8, top: 8, padding: "2px 8px", borderRadius: 4, background: "#16a34a", color: "#fff", fontSize: 11.5, fontWeight: 700 }}>AI 예측</span>
                            </div>
                          )}
                          {on && <button style={{ ...plainBtn, width: "100%", marginTop: 8, fontSize: 12.5 }} disabled={Boolean(busy)} onClick={() => runSpaces(sp)}>{s.result ? "이 공간만 다시 만들기" : "이 공간만 예측"}</button>}
                        </div>

                        {opts && (
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* 면적 (공사비 기준) */}
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                              {opts.costFields.map((f) => (
                                <label key={f.key} style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 12, fontWeight: 700, color: "#6b7280" }}>
                                  {f.label}
                                  {f.options ? (
                                    <select style={{ ...inp, width: 150 }} value={s.costBase[f.key]} onChange={(e) => updSim(sp, { costBase: { [f.key]: Number(e.target.value) } })}>
                                      {f.options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                                    </select>
                                  ) : (
                                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                      <input type="number" min={0} step={f.step || 1} style={{ ...inp, width: 80 }} value={s.costBase[f.key] ?? ""} onChange={(e) => updSim(sp, { costBase: { [f.key]: Number(e.target.value) } })} />
                                      <span style={{ fontWeight: 600 }}>{f.unit}</span>
                                      {f.unit === "m²" && <span style={{ fontWeight: 600, color: "#9ca3af" }}>≈ {Math.round(((s.costBase[f.key] || 0) / 3.3058) * 10) / 10}평</span>}
                                    </span>
                                  )}
                                </label>
                              ))}
                            </div>
                            <div style={{ marginTop: 8, fontSize: 13, color: "#111827" }}>예상 공사비 <b style={{ color: "#1a3a6b" }}>{s.cost.rangeText}</b></div>
                            {/* 조건 */}
                            <button style={{ ...plainBtn, marginTop: 10, padding: "6px 10px", fontSize: 12.5 }} onClick={() => setOpenCond((o) => ({ ...o, [sp.key]: !open }))}>{open ? "조건 접기 ▲" : "조건 고치기 ▼"}</button>
                            {open && opts.groups.map((g) => (
                              <div key={g.key}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", margin: "10px 0 5px" }}>{g.label} <span style={{ fontWeight: 500 }}>· {g.single ? "하나" : "여러 개"}</span></div>
                                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                  {g.options.map((o) => <button key={o.id} style={chip(((s.design[g.key] as string[]) || []).includes(o.id))} onClick={() => toggleOpt(sp, g.key, o.id, g.single)}>{shortName(o.name)}</button>)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ ...card, display: "flex", alignItems: "center", gap: 12, position: "sticky", bottom: 0, boxShadow: "0 -6px 20px rgba(0,0,0,0.06)" }}>
            {step(4, "예측 만들기")}
            <span style={{ flex: 1, fontSize: 12.5, color: "#6b7280" }}>{todo ? `아직 안 한 ${todo}곳 중 사진 있는 ${withPhoto}곳을 하나씩 만들어요 (공간마다 1~3분)` : proj.spaces.length ? "모든 공간 예측 완료" : ""}</span>
            <button disabled={Boolean(busy) || !withPhoto} onClick={() => runSpaces()}
              style={{ padding: "11px 20px", border: 0, borderRadius: 8, fontSize: 14, fontWeight: 800, fontFamily: "inherit", color: "#fff", background: busy || !withPhoto ? "#94a3b8" : "#16a34a", cursor: busy || !withPhoto ? "default" : "pointer", whiteSpace: "nowrap" }}>
              {busy === "예측을 만드는 중…" ? "만드는 중…" : `예측 만들기 (${withPhoto}곳)`}
            </button>
          </div>
        </>
      )}
      {(busy || note) && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: busy ? "#eff6ff" : /실패|못|없|다시 켜|올려/.test(note) ? "#fef2f2" : "#f0fdf4", color: busy ? "#1e3a8a" : /실패|못|없|다시 켜|올려/.test(note) ? "#b91c1c" : "#166534", fontSize: 13.5, fontWeight: 700, lineHeight: 1.6 }}>
          {busy ? `${busy} ${progress}` : note}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
      <style>{CSS}</style>
      <div style={{ flex: 1, minWidth: 480 }}>{left}</div>
      <div style={{ width: 620, flexShrink: 0, position: "sticky", top: 0 }}>
        {proj && proj.spaces.some((x) => x.sim?.result) ? (
          <ReportPane key={proj.id} kind={kind} proj={proj} onSaved={(p) => setProj((cur) => (cur ? { ...cur, report: p.report } : cur))} />
        ) : (
          <div style={{ background: "#f3f4f6", border: "1px dashed #d1d5db", borderRadius: 14, minHeight: 560, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 30 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#374151" }}>{KIND_TEXT[kind].report}</div>
              <div style={{ fontSize: 14, color: "#6b7280", marginTop: 8, lineHeight: 1.7 }}>
                왼쪽에서 공간마다 조건·면적·사진을 넣고<br />[예측 만들기]를 누르면 여기에 보고서가 나옵니다.<br />(A4 세로 · 표지 → 개요·합계 → 공간마다 1쪽 → 종합 견적서)
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 오른쪽 보고서 ── */
function ReportPane({ kind, proj, onSaved }: { kind: Kind; proj: Proj; onSaved: (p: Proj) => void }) {
  const [st, setSt] = useState<ReportState>(() => initialReport(kind, proj.report));
  const [media, setMedia] = useState<Record<string, Media>>({});
  const [view, setView] = useState<string>("all");
  const [design, setDesign] = useState(false);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState("");
  const dirty = useRef(false);
  const c = COLORS.find((x) => x.id === st.color) || COLORS[0];

  // 예측이 끝난 공간만 보고서에
  const spaces: SpaceView[] = useMemo(
    () => proj.spaces.filter((x) => x.sim?.result).map((x) => ({ key: x.key, name: x.name, r: x.sim!.result!, media: media[x.simId] || null })),
    [proj.spaces, media]
  );
  const simKey = proj.spaces.filter((x) => x.sim?.result).map((x) => `${x.simId}:${x.sim!.result!.dateText}:${x.sim!.result!.versions[0]?.image?.length || 0}`).join("|");
  useEffect(() => {
    const b = bridge();
    if (!b?.sim.reportMedia) return;
    for (const sp of proj.spaces.filter((x) => x.sim?.result)) {
      b.sim.reportMedia(sp.simId).then((m) => setMedia((o) => ({ ...o, [sp.simId]: m }))).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simKey]);

  const save = useCallback(async (s: ReportState, loud = false) => {
    const b = bridge();
    if (!b?.sim.projSave) return;
    try {
      onSaved(await b.sim.projSave({ id: proj.id, report: s }));
      dirty.current = false;
      setSaved(loud ? "✓ 저장했어요" : "✓ 저장됨");
    } catch (e) { setNote(cleanErr(e)); }
  }, [proj.id, onSaved]);
  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(() => save(st), 1000);
    return () => clearTimeout(t);
  }, [st, save]);
  const patch = (fn: (s: ReportState) => ReportState) => { dirty.current = true; setSaved(""); setSt(fn); };
  const setT = (k: string, v: string) => patch((s) => ({ ...s, t: { ...s.t, [k]: v } }));
  const setFooter = (v: string) => patch((s) => ({ ...s, footer: v }));

  const defs = pageDefs(spaces);
  const included = defs.filter((d) => !st.off.includes(d.id));
  const pageString = (id: string) => {
    const i = included.findIndex((d) => d.id === id);
    return i < 0 ? "EXCLUDED" : `PAGE ${String(i + 1).padStart(2, "0")} / ${String(included.length).padStart(2, "0")}`;
  };
  const shown = view === "all" ? defs : defs.filter((d) => d.id === view);
  const W = 572; // 미리보기 너비 (오른쪽 칸 620 - 여백)
  const scale = W / PAGE_W;

  /* ── 내보내기 ── */
  const pagesRef = useRef<HTMLDivElement>(null);
  const capture = async (ratio: number) => {
    if (view !== "all") { setView("all"); await new Promise((res) => setTimeout(res, 300)); }
    const host = document.createElement("div");
    // 화면 밖에 두면 빈 그림이 된다 — 제자리에 투명하게 맨 뒤로 (문서편집과 같은 방법)
    host.style.cssText = `position:fixed;left:0;top:0;width:${PAGE_W}px;height:${PAGE_H}px;overflow:hidden;pointer-events:none;z-index:-1;opacity:0;background:#fff`;
    document.body.appendChild(host);
    try {
      const out: HTMLCanvasElement[] = [];
      let fontEmbedCSS: string | undefined;
      for (const d of included) {
        const src = pagesRef.current?.querySelector(`[data-gsr-id="${d.id}"] .gsr-page`);
        if (!src) continue;
        const clone = src.cloneNode(true) as HTMLElement;
        clone.querySelectorAll("[contenteditable]").forEach((e) => e.removeAttribute("contenteditable"));
        clone.querySelectorAll(".gsr-ed").forEach((e) => e.classList.remove("gsr-ed"));
        host.replaceChildren(clone);
        if (fontEmbedCSS === undefined) { try { fontEmbedCSS = await getFontEmbedCSS(clone); } catch { fontEmbedCSS = ""; } }
        out.push(await toCanvas(host, { pixelRatio: ratio, backgroundColor: "#ffffff", width: PAGE_W, height: PAGE_H, fontEmbedCSS: fontEmbedCSS || undefined, style: { opacity: "1" } }));
      }
      if (!out.length) throw new Error("넣을 쪽을 하나 이상 골라 주세요.");
      return out;
    } finally { host.remove(); }
  };
  const baseName = `${ymd()} ${safe(`${proj.site.title || ""} ${KIND_TEXT[kind].report}`)}`;
  const saveOut = async (fileName: string, dataUrl: string, quiet = false) => {
    const sf = bridge()?.marketing?.saveFile;
    const anySim = proj.spaces.find((x) => x.sim?.result)?.simId || proj.id;
    if (sf) return (await sf({ id: anySim, sub: KIND_TEXT[kind].report, fileName, dataUrl, quiet })).folder;
    const bin = atob(dataUrl.split(",")[1]);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    download(u, fileName, dataUrl.slice(5, dataUrl.indexOf(";")));
    return "";
  };
  const act = async (label: string, fn: () => Promise<string | void>) => {
    if (busy) return;
    setBusy(label); setNote("");
    try { const m = await fn(); if (m) setNote(m); } catch (e) { setNote(cleanErr(e)); } finally { setBusy(""); }
  };
  const exportImages = () => act("이미지를 만드는 중…", async () => {
    const cs = await capture(2);
    let folder = "";
    for (let i = 0; i < cs.length; i++) folder = await saveOut(`${baseName} ${String(i + 1).padStart(2, "0")}.png`, cs[i].toDataURL("image/png"), i < cs.length - 1);
    return `✓ 쪽 그림 ${cs.length}장을 저장했어요${folder ? ` — ${folder}` : ""}`;
  });
  const exportPdf = () => act("PDF를 만드는 중…", async () => {
    const cs = await capture(2);
    const bytes = await imagePdf(cs, 210, 297);
    const folder = await saveOut(`${baseName}.pdf`, await blobUrl(new Blob([bytes as BlobPart], { type: "application/pdf" })));
    return `✓ PDF(${cs.length}쪽)를 저장했어요${folder ? ` — ${folder}` : ""}`;
  });
  const print = () => act("인쇄를 준비하는 중…", async () => {
    const cs = await capture(2);
    const imgs = cs.map((cv) => `<div class="p"><img src="${cv.toDataURL("image/jpeg", 0.92)}"></div>`).join("");
    browserPrint(`<!doctype html><html><head><meta charset="utf-8"><style>@page{size:210mm 297mm;margin:0}html,body{margin:0;padding:0}.p{width:210mm;height:297mm;page-break-after:always;break-after:page;overflow:hidden}.p:last-child{page-break-after:auto;break-after:auto}.p img{width:100%;height:100%;display:block}</style></head><body>${imgs}</body></html>`);
  });
  const aiFill = () => act("AI가 보고서 글을 쓰는 중…", async () => {
    const b = bridge();
    if (!b?.sim.projText) throw new Error(RESTART);
    const f = await b.sim.projText(proj.id);
    patch((s) => ({ ...s, t: { ...s.t, ...f } }));
    return "✓ AI가 요약·디자인 콘셉트·견적 해설·맺음말을 채웠어요. 눌러서 고칠 수 있어요.";
  });
  const btn = (bg?: string): React.CSSProperties => ({
    height: 34, padding: "0 11px", borderRadius: 8, fontSize: 12.5, fontWeight: 800, fontFamily: "inherit", cursor: busy ? "default" : "pointer", whiteSpace: "nowrap",
    border: bg ? 0 : "1px solid #e5e7eb", background: bg || "#fff", color: bg ? "#fff" : "#374151", opacity: busy ? 0.6 : 1,
  });
  const lab: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: "#1f2937", margin: "14px 0 8px" };

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 12px", borderBottom: "1px solid #e5e7eb", flexWrap: "wrap" }}>
        <button style={{ ...btn("#111827"), display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => setDesign((x) => !x)}><Picto n="palette" size={16} />디자인</button>
        <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 700 }}>{saved}</span>
        <span style={{ flex: 1 }} />
        <button style={btn(c.primary)} onClick={() => act("저장하는 중…", async () => { await save(st, true); })}>✓ 저장</button>
        <button style={btn("#5b4ff5")} onClick={aiFill}>✦ AI로 채우기</button>
        <button style={btn()} onClick={exportImages}>이미지</button>
        <button style={btn()} onClick={print}>인쇄</button>
        <button style={btn()} onClick={exportPdf}>PDF</button>
      </div>
      {/* 쪽 탭 */}
      <div style={{ display: "flex", gap: 4, padding: "8px 12px", borderBottom: "1px solid #e5e7eb", overflowX: "auto" }}>
        {[{ id: "all", name: `전체 (${included.length}쪽)` }, ...defs].map((d) => (
          <button key={d.id} onClick={() => setView(d.id)}
            style={{ padding: "5px 10px", borderRadius: 999, border: `1px solid ${view === d.id ? "#2563eb" : "#e5e7eb"}`, background: view === d.id ? "#eff6ff" : "#fff", color: st.off.includes(d.id) ? "#9ca3af" : "#111827", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", textDecoration: st.off.includes(d.id) ? "line-through" : "none" }}>
            {d.name}
          </button>
        ))}
      </div>
      {(busy || note) && <div style={{ padding: "7px 14px", background: busy ? "#1e293b" : /못|없|실패|오류|골라|다시 켜/.test(note) ? "#b91c1c" : "#166534", color: "#fff", fontSize: 12.5, fontWeight: 700, wordBreak: "break-all" }}>{busy || note}</div>}

      {/* 🎨 디자인 창 */}
      {design && (
        <div style={{ position: "absolute", top: 54, left: 12, zIndex: 5, width: 360, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, boxShadow: "0 16px 40px rgba(0,0,0,0.18)", padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <b style={{ flex: 1, fontSize: 14 }}>보고서 디자인</b>
            <button onClick={() => setDesign(false)} style={{ border: 0, background: "transparent", fontSize: 18, cursor: "pointer", color: "#6b7280" }}>×</button>
          </div>
          <div style={lab}>디자인 색상</div>
          <div style={{ display: "flex", gap: 10 }}>
            {COLORS.map((x) => (
              <button key={x.id} title={x.name} onClick={() => patch((s) => ({ ...s, color: x.id }))}
                style={{ width: 36, height: 36, borderRadius: 18, background: x.primary, border: 0, cursor: "pointer", boxShadow: st.color === x.id ? `0 0 0 3px #fff, 0 0 0 5px ${x.dark}` : "none", color: "#fff" }}>{st.color === x.id ? "●" : ""}</button>
            ))}
          </div>
          <div style={lab}>레이아웃 테마</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
            {LAYOUTS.map((x, i) => (
              <button key={x.id} onClick={() => patch((s) => ({ ...s, layout: x.id }))} title={x.name}
                style={{ padding: "8px 2px", borderRadius: 8, border: `1px solid ${st.layout === x.id ? c.primary : "#e5e7eb"}`, background: st.layout === x.id ? `${c.primary}12` : "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#374151" }}>{i + 1}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#4b5563", lineHeight: 1.2, marginTop: 2 }}>{x.name}</div>
              </button>
            ))}
          </div>
          <div style={lab}>하단 공통 문구</div>
          <input style={{ ...inp, fontWeight: 800, letterSpacing: "0.04em", fontSize: 12.5 }} value={st.footer} onChange={(e) => setFooter(e.target.value)} />
          <div style={lab}>출력에 넣을 쪽</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {defs.map((d) => (
              <label key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={!st.off.includes(d.id)} onChange={() => patch((s) => ({ ...s, off: s.off.includes(d.id) ? s.off.filter((x) => x !== d.id) : [...s.off, d.id] }))} />
                {d.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: "#e5e7eb", padding: 24, maxHeight: "calc(100vh - 240px)", overflowY: "auto" }}>
        <div ref={pagesRef} style={{ width: W, margin: "0 auto" }}>
          {shown.map((d) => {
            const n = defs.findIndex((x) => x.id === d.id);
            const out = st.off.includes(d.id);
            return (
              <div key={d.id} data-gsr-id={d.id} style={{ width: W, height: PAGE_H * scale, marginBottom: 20, position: "relative", boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}>
                <div style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
                  <RenderPage def={d} kind={kind} spaces={spaces} site={proj.site} n={n} st={st} c={c} pageString={pageString(d.id)} setT={setT} setFooter={setFooter} />
                </div>
                {out && <div style={{ position: "absolute", top: 0, left: 0, right: 0, background: "rgba(239,68,68,0.9)", color: "#fff", padding: "5px 0", textAlign: "center", fontSize: 12, fontWeight: 700 }}>출력에서 빠진 쪽 — [디자인]에서 체크</div>}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ padding: "8px 14px", fontSize: 12, color: "#6b7280", borderTop: "1px solid #e5e7eb" }}>
        합계 {totalOf(spaces).text} · {spaces.length}곳 · 글은 미리보기에서 눌러서 고쳐요
      </div>
    </div>
  );
}
