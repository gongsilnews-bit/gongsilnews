"use client";

// 사진·영상 고르기 › [AI 그림] — 클립별 AI 그림 (2026-10-19 사장님, 공실뉴스 AI 스튜디오 앱 방식)
//  1) 만들 클립: 고른 클립 / 모든 클립
//  2) 글 AI 가 클립 대본마다 영어 장면 설명 (자동·배경·인물·그래프, 고쳐 달라는 말로 고치기)
//  3) 그림 스타일 16가지 → 이미지 AI 가 영상 비율로 그림
//  4) 다 그린 것부터 클립 화면에 차례로 들어간다
import React, { useEffect, useMemo, useState } from "react";
import type { Asset, LibItem, Project } from "./types";
import { errText, isStopped, videoBridge } from "./types";
import { clipText, flatten } from "./timeline";
import { IMAGE_STYLES, imagePrompt, sampleScene } from "@/lib/studio-video/imageStyles";
import { useStudioImager, useStudioWriter } from "@/components/admin/sections/useStudioWriter";
import { Btn, C, FONT, Icon } from "./ui";

type Kind = "auto" | "background" | "character" | "graph";
const KINDS: [Kind, string][] = [["auto", "자동"], ["background", "배경"], ["character", "인물"], ["graph", "그래프"]];
type Row = { id: string; n: number; text: string; prompt: string; kind: Kind; st: "" | "run" | "done" | "err"; thumb?: string; err?: string; fix?: string };

// 탭을 오가도 남게 (프로젝트마다)
const memo = new Map<string, Record<string, { prompt: string; kind: Kind; thumb?: string }>>();
const STYLE_KEY = "gsv:aiImgStyle";

export function AiImagesTab({ project, selected, ensureAsset, apply }: {
  project: Project;
  selected: string[];
  ensureAsset: (item: LibItem) => Promise<Asset>;
  /** 클립 화면 넣기 (되돌리기 되게) */
  apply: (fn: (p: Project) => void) => void;
}) {
  const b = videoBridge()!;
  const writer = useStudioWriter();
  const imager = useStudioImager();
  const all = useMemo(() => flatten(project).items.filter((x) => x.clip.type !== "silence" && clipText(x.clip).trim()), [project]);
  const [scope, setScope] = useState<"sel" | "all">(selected.length ? "sel" : "all");
  const [style, setStyle] = useState<string>(() => {
    try { return localStorage.getItem(STYLE_KEY) || "realistic"; } catch { return "realistic"; }
  });
  const sty = IMAGE_STYLES.find((x) => x.id === style) || IMAGE_STYLES[2];
  const saved = memo.get(project.dir) || {};
  const targets = scope === "sel" && selected.length ? all.filter((x) => selected.includes(x.clip.id)) : all;
  const [rows, setRows] = useState<Row[]>([]);
  // 고른 클립이 바뀌면 줄을 다시 (써 둔 설명·그림은 남긴다)
  const key = targets.map((x) => x.clip.id).join(",");
  useEffect(() => {
    setRows((prev) => targets.map((x, i) => {
      const old = prev.find((r) => r.id === x.clip.id);
      const sv = saved[x.clip.id];
      return old ? { ...old, n: i + 1, text: clipText(x.clip) } : { id: x.clip.id, n: all.indexOf(x) + 1, text: clipText(x.clip), prompt: sv?.prompt || "", kind: sv?.kind || "auto", st: sv?.thumb ? "done" : "", thumb: sv?.thumb };
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [autoPut, setAutoPut] = useState(true);
  const stop = React.useRef(false);
  // 스타일 견본 만들기 (공실뉴스 관리용) — [그림 스타일] 제목을 Shift 누른 채 누르면 보인다. 같은 장면을 스타일마다 그려
  //  프로젝트 폴더\스타일견본\assets\견본_<스타일>_….png 로 저장 → 공실뉴스가 카드 그림으로 넣는다 (2026-10-19 사장님)
  const [sampleOn, setSampleOn] = useState(false);
  const [samples, setSamples] = useState<Record<string, string>>({});
  const makeSamples = async () => {
    if (!b.lib.saveImage) return setErr("공실스튜디오를 껐다 켜 주세요");
    setErr("");
    stop.current = false;
    const dir = `${project.dir}\\스타일견본`;
    for (let i = 0; i < IMAGE_STYLES.length; i++) {
      if (stop.current) break;
      const st = IMAGE_STYLES[i];
      if (samples[st.id]) continue;
      setBusy(`${imager}가 스타일 견본을 그리는 중… (${i + 1}/${IMAGE_STYLES.length}) ${st.label}`);
      try {
        const it = await b.ai.image(dir, imagePrompt(sampleScene(st), st), { ratio: "4:3" });
        const blob = await (await fetch(it.url)).blob();
        const data = await new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(blob); });
        await b.lib.saveImage(dir, data, `견본_${st.id}`);
        setSamples((v) => ({ ...v, [st.id]: it.thumb || it.url }));
      } catch (e) {
        setErr(`${st.label}: ${errText(e)}`);
      }
    }
    setBusy("");
  };

  const keep = (id: string, patch: Partial<{ prompt: string; kind: Kind; thumb: string }>) => {
    const m = memo.get(project.dir) || {};
    m[id] = { ...(m[id] || { prompt: "", kind: "auto" }), ...patch };
    memo.set(project.dir, m);
  };
  const setRow = (id: string, patch: Partial<Row>) => {
    setRows((v) => v.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    if (patch.prompt !== undefined || patch.kind !== undefined || patch.thumb !== undefined) keep(id, { ...(patch.prompt !== undefined ? { prompt: patch.prompt } : {}), ...(patch.kind ? { kind: patch.kind } : {}), ...(patch.thumb ? { thumb: patch.thumb } : {}) });
  };
  const pickStyle = (id: string) => {
    setStyle(id);
    try { localStorage.setItem(STYLE_KEY, id); } catch {}
  };

  /** 글 AI — 장면 설명 (rs: 이 줄들만) */
  const writePrompts = async (rs: Row[], modify?: { current: string; request: string }) => {
    if (!b.ai.imagePrompts) throw new Error("공실스튜디오를 껐다 켜 주세요 (클립별 AI 그림 기능을 새로 연결해요)");
    const out = await b.ai.imagePrompts(rs.map((r) => r.text), { kinds: rs.map((r) => r.kind), style: sty.label, character: sty.character, modify });
    rs.forEach((r, i) => out[i] && setRow(r.id, { prompt: out[i] }));
    return rs.map((r, i) => ({ ...r, prompt: out[i] || r.prompt }));
  };
  const runPrompts = async () => {
    setErr("");
    setBusy(`${writer}가 클립마다 장면 설명을 쓰는 중…`);
    const off = b.onProgress((t) => setBusy(t));
    try {
      await writePrompts(rows);
    } catch (e) {
      setErr(errText(e));
    } finally {
      off();
      setBusy("");
    }
  };
  /** 한 줄 — 종류 바꾸기·고쳐 달라는 말 */
  const redoOne = async (r: Row, kind: Kind, request?: string) => {
    setErr("");
    setRow(r.id, { kind });
    setBusy(`${writer}가 ${r.n}번 장면 설명을 다시 쓰는 중…`);
    try {
      await writePrompts([{ ...r, kind }], request && r.prompt ? { current: r.prompt, request } : undefined);
      if (request) setRow(r.id, { fix: "" });
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy("");
    }
  };

  /** 그림 — 한 장 그리고 (켜져 있으면) 바로 그 클립 화면에 */
  const drawOne = async (r: Row) => {
    setRow(r.id, { st: "run", err: "" });
    try {
      const it = await b.ai.image(project.dir, imagePrompt(r.prompt, sty), { ratio: project.ratio });
      setRow(r.id, { st: "done", thumb: it.thumb || it.url });
      if (autoPut) {
        const a = await ensureAsset(it);
        apply((p) => {
          const c = p.scenes.flatMap((s) => s.clips).find((x) => x.id === r.id);
          if (c) { c.visual = { asset: a.id, s: 0 }; delete c.box; }
        });
      }
      return true;
    } catch (e) {
      if (isStopped(e)) { stop.current = true; setRow(r.id, { st: "" }); return false; } // [중지] — 남은 그림은 그리지 않는다
      setRow(r.id, { st: "err", err: errText(e) });
      return false;
    }
  };
  /** [그림 모두 만들기] — 설명이 없으면 먼저 쓰고, 1번부터 차례로 */
  const drawAll = async () => {
    setErr("");
    stop.current = false;
    const off = b.onProgress((t) => setBusy(t));
    try {
      let list = rows;
      if (list.some((r) => !r.prompt.trim())) {
        setBusy(`${writer}가 클립마다 장면 설명을 쓰는 중…`);
        const need = list.filter((r) => !r.prompt.trim());
        const done = await writePrompts(need);
        list = list.map((r) => done.find((d) => d.id === r.id) || r);
      }
      const todo = list.filter((r) => r.prompt.trim() && r.st !== "done");
      for (let i = 0; i < todo.length; i++) {
        if (stop.current) break;
        setBusy(`${imager}가 그리는 중… (${i + 1}/${todo.length}) — ${todo[i].n}번 클립`);
        await drawOne(todo[i]);
      }
    } catch (e) {
      setErr(errText(e));
    } finally {
      off();
      setBusy("");
    }
  };

  const doneN = rows.filter((r) => r.st === "done").length;
  const chip = (on: boolean): React.CSSProperties => ({ height: 30, padding: "0 12px", borderRadius: 15, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent", color: on ? C.text : C.sub, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer" });
  const head: React.CSSProperties = { fontSize: 14, fontWeight: 800, margin: "14px 0 8px" };
  return (
    <div style={{ padding: "4px 14px 16px", fontFamily: FONT, color: C.text }}>
      <div style={head}>만들 클립</div>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" onClick={() => setScope("sel")} disabled={!selected.length} style={{ ...chip(scope === "sel" && selected.length > 0), opacity: selected.length ? 1 : 0.5 }}>고른 클립 ({selected.length}개)</button>
        <button type="button" onClick={() => setScope("all")} style={chip(scope === "all" || !selected.length)}>모든 클립 ({all.length}개)</button>
      </div>

      <div style={head} onClick={(e) => e.shiftKey && setSampleOn((v) => !v)}>그림 스타일 <span style={{ fontSize: 12.5, color: C.sub, fontWeight: 600 }}>· {imager}</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {IMAGE_STYLES.map((s) => (
          <button key={s.id} type="button" onClick={() => pickStyle(s.id)} title={s.desc}
            style={{ position: "relative", height: 54, borderRadius: 8, border: 0, outline: style === s.id ? `3px solid ${C.accent}` : "none", outlineOffset: -3, background: s.thumb ? `center / cover no-repeat url("${s.thumb}"), ${s.bg}` : s.bg, cursor: "pointer", overflow: "hidden", padding: 0 }}>
            <span style={{ position: "absolute", inset: 0, background: style === s.id ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.45)" }} />
            <span style={{ position: "relative", color: "#fff", fontSize: 13, fontWeight: 800, fontFamily: FONT, textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>{style === s.id ? "✓ " : ""}{s.label}</span>
          </button>
        ))}
      </div>
      {sampleOn && (
        <div style={{ marginTop: 8, padding: 10, borderRadius: 8, border: `1px dashed ${C.accent}`, fontSize: 12.5, color: C.sub, lineHeight: 1.6 }}>
          <b style={{ color: C.text }}>스타일 견본 만들기 (공실뉴스 관리용)</b><br />같은 장면을 {IMAGE_STYLES.length}가지 스타일로 그려 이 프로젝트 폴더 [스타일견본]에 저장해요. 다 되면 공실뉴스가 카드 그림으로 넣어요.
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <Btn small primary disabled={Boolean(busy)} onClick={makeSamples}>견본 {IMAGE_STYLES.length - Object.keys(samples).length}장 그리기</Btn>
            {busy && <Btn small onClick={() => { stop.current = true; }}>멈추기</Btn>}
          </div>
          {Object.keys(samples).length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginTop: 8 }}>
              {IMAGE_STYLES.filter((x) => samples[x.id]).map((x) => <img key={x.id} src={samples[x.id]} alt={x.label} title={x.label} style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 4 }} />)}
            </div>
          )}
        </div>
      )}
      <div style={{ fontSize: 12.5, color: C.dim, marginTop: 6, lineHeight: 1.6 }}>{sty.label} — {sty.desc}. 그림에는 글자를 넣지 않아요 (AI 가 한글을 깨뜨려서). 영상 비율({project.ratio})로 그려요.</div>

      <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
        <Btn small onClick={runPrompts} disabled={Boolean(busy) || !rows.length}><Icon name="ai" size={15} />장면 설명 만들기</Btn>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.sub, marginLeft: "auto", cursor: "pointer" }}>
          <input type="checkbox" checked={autoPut} onChange={(e) => setAutoPut(e.target.checked)} />다 그리면 클립에 넣기
        </label>
      </div>
      <div style={{ fontSize: 12.5, color: C.dim, marginTop: 6, lineHeight: 1.6 }}>{writer}가 대본을 읽고 클립마다 영어 장면 설명을 써요. 설명은 직접 고쳐도 돼요.</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ padding: 10, borderRadius: 8, border: `1px solid ${r.st === "err" ? C.danger : r.st === "done" ? C.accent : C.line2}`, background: C.card }}>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ width: 84, height: 56, flexShrink: 0, borderRadius: 4, background: "#000", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", color: C.dim, fontSize: 11.5 }}>
                {r.thumb ? <img src={r.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : r.st === "run" ? "그리는 중…" : "그림 없음"}
              </div>
              <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.5 }}>
                <b>{r.n}.</b> <span style={{ color: C.sub }}>{r.text}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
              {KINDS.map(([k, l]) => <button key={k} type="button" disabled={Boolean(busy)} onClick={() => redoOne(r, k)} title={`${l} 중심으로 설명 다시 쓰기`} style={{ ...chip(r.kind === k), height: 24, padding: "0 8px", fontSize: 12 }}>{l}</button>)}
            </div>
            <textarea value={r.prompt} onChange={(e) => setRow(r.id, { prompt: e.target.value })} rows={3} placeholder="장면 설명 (영어) — [장면 설명 만들기]를 누르거나 직접 쓰기"
              style={{ width: "100%", boxSizing: "border-box", marginTop: 6, padding: 8, borderRadius: 6, border: `1px solid ${C.line2}`, background: C.bg, color: C.text, fontSize: 12.5, lineHeight: 1.5, fontFamily: FONT, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <input value={r.fix || ""} onChange={(e) => setRow(r.id, { fix: e.target.value })} placeholder="고쳐 달라는 말 (예: 밤 장면으로)" disabled={!r.prompt}
                onKeyDown={(e) => { if (e.key === "Enter" && r.fix?.trim()) void redoOne(r, r.kind, r.fix.trim()); }}
                style={{ flex: 1, minWidth: 0, height: 30, padding: "0 8px", borderRadius: 6, border: `1px solid ${C.line2}`, background: C.bg, color: C.text, fontSize: 12.5, fontFamily: FONT }} />
              <Btn small disabled={Boolean(busy) || !r.prompt.trim() || r.st === "run"} onClick={async () => { setBusy(`${imager}가 ${r.n}번 클립을 그리는 중…`); await drawOne(r); setBusy(""); }}>{r.st === "done" ? "다시 그리기" : "그리기"}</Btn>
            </div>
            {r.err && <div style={{ fontSize: 12.5, color: C.danger, marginTop: 6 }}>{r.err}</div>}
          </div>
        ))}
      </div>

      {err && <div style={{ marginTop: 10, fontSize: 13.5, color: C.danger, lineHeight: 1.6 }}>{err}</div>}
      {busy && <div style={{ marginTop: 10, padding: 10, borderRadius: 8, border: `1px solid ${C.accent}`, fontSize: 13.5, lineHeight: 1.6 }}>{busy}</div>}
      <div style={{ display: "flex", gap: 6, marginTop: 12, position: "sticky", bottom: 0, background: C.panel, padding: "8px 0" }}>
        <Btn primary onClick={drawAll} disabled={Boolean(busy) || !rows.length} style={{ flex: 1, justifyContent: "center" }}><Icon name="image" size={17} />그림 모두 만들기 ({rows.length - doneN}장)</Btn>
        {busy && <Btn onClick={() => { stop.current = true; }}>멈추기</Btn>}
      </div>
      <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.6 }}>1번 클립부터 차례로 그려 바로 넣어요. 한 장에 30초~1분 (API 키면 더 빨라요). 다 만든 클립은 건너뛰어요.</div>
    </div>
  );
}
