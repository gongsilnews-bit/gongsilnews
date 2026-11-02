"use client";

// [프로젝트] 칸 — 프리미어 프로젝트 창처럼: 이 영상에 넣은 사진·영상과 폴더만, 이름·길이 목록 (2026-11-02 사장님: 지금은 너무 복잡해)
//  빈 곳 오른쪽 클릭 = 새 폴더·가져오기 · 파일 오른쪽 클릭 = 넣기·폴더로 옮기기·탐색기·빼기 · 폴더 오른쪽 클릭 = 열기·이름·삭제
//  PC 파일은 옮기지 않는다 — 폴더는 프로젝트 파일 안의 정리일 뿐
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { LibItem, Project, ProjBins } from "./types";
import { DRAG_MEDIA, blankDragImage, errText, fmtTime, mediaDrag, videoBridge } from "./types";
import { Side, type LibPickAction } from "./Panels";
import { C, FONT, Icon } from "./ui";

type Menu = { x: number; y: number; kind: "bg" | "file" | "bin"; id?: string };

export function ProjectPanel({ project, onBins, onPick, canReplace, onClose, pro, onTrim, onOpenLib }: {
  /** 다른 곳에서 가져오기 — 사진·영상 칸(공실 사진·오픈자료·드론)이나 AI 그림 칸을 연다. 거기서 고른 것은 이 프로젝트에 들어온다 */
  onOpenLib?: (what: "vacancy" | "free" | "drone" | "ai") => void;
  project: Project;
  onBins: (b: ProjBins) => void;
  onPick: (item: LibItem, action: LibPickAction) => Promise<void> | void;
  canReplace: boolean;
  onClose: () => void;
  /** 타임라인 편집 — 넣기 = 재생 막대 자리, 두 번 누르면 소스 모니터 */
  pro?: { onPlus: (item: LibItem) => void | Promise<void>; onSource?: (item: LibItem) => void };
  /** 텍스트 편집 — 두 번 누르면 쓸 부분 고르기 */
  onTrim?: (item: LibItem) => void;
}) {
  const b = videoBridge();
  const [items, setItems] = useState<LibItem[] | null>(null);
  const [pf, setPf] = useState(""); // 들어가 있는 폴더 ("" = 맨 위)
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const lastSel = useRef("");
  const [menu, setMenu] = useState<Menu | null>(null);
  const [naming, setNaming] = useState<{ id: string; name: string } | null>(null);
  // 목록 보기 — 폴더 ▸ 누르면 안의 파일을 그 아래에 펼치고 접는다 (프리미어처럼, 2026-11-02 사장님)
  const [openB, setOpenB] = useState<string[]>([]);
  const toggleB = (id: string) => setOpenB((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  const [dropOn, setDropOn] = useState(""); // 끌어다 놓을 폴더 ("^" = 위로)
  const [view, setViewS] = useState<"list" | "icon">(() => { try { return localStorage.getItem("gsv-proj-view") === "icon" ? "icon" : "list"; } catch { return "list"; } });
  const setView = (v: "list" | "icon") => { setViewS(v); try { localStorage.setItem("gsv-proj-view", v); } catch {} };
  const [sortBy, setSortBy] = useState<"name" | "dur">("name");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const binsRef = useRef<ProjBins>(project.bins || { folders: [], of: {} });
  binsRef.current = project.bins || binsRef.current;
  const bins = binsRef.current;
  const save = (nb: ProjBins) => { binsRef.current = nb; onBins(nb); };

  const normP = (x?: string) => (x || "").replace(/\\/g, "/").toLowerCase();
  const usedPaths = useMemo(() => new Set([...Object.values(project.assets || {}).map((a) => normP(a.path)), ...(project.materials || []).map((m) => normP(m.path))].filter(Boolean)), [project.assets, project.materials]);
  const usedIn = (it: LibItem) => usedPaths.has(normP(it.path));
  const inProj = (it: LibItem) => it.id in bins.of || usedIn(it);
  const folderOf = (it: LibItem) => bins.of[it.id] || "";
  const nm = (it: LibItem) => bins.names?.[it.id] || it.name;
  const setName = (id: string, name: string) => { const names = { ...(binsRef.current.names || {}) }; const it = (items || []).find((x) => x.id === id); if (!name || name === it?.name) delete names[id]; else names[id] = name; save({ ...binsRef.current, names }); };

  const load = async () => {
    if (!b) return;
    try { setItems(await b.lib.list({ kind: "all", fav: false, q: "", source: "" })); } catch (e) { setMsg(errText(e)); setItems([]); }
  };
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const mine = useMemo(() => (items || []).filter(inProj), [items, bins, usedPaths]); // eslint-disable-line react-hooks/exhaustive-deps
  const word = q.trim().toLowerCase();
  // 찾기 = 폴더 상관없이 이 프로젝트 전체에서
  const files = mine
    .filter((it) => (word ? nm(it).toLowerCase().includes(word) : folderOf(it) === pf))
    .sort((a, c) => (sortBy === "dur" ? (c.duration || 0) - (a.duration || 0) : nm(a).localeCompare(nm(c), "ko")));
  const folders = word || pf ? [] : [...bins.folders].sort((a, c) => a.name.localeCompare(c.name, "ko"));
  const sortF = (l: LibItem[]) => l.sort((a, c) => (sortBy === "dur" ? (c.duration || 0) - (a.duration || 0) : nm(a).localeCompare(nm(c), "ko")));
  const filesIn = (id: string) => sortF(mine.filter((it) => folderOf(it) === id));
  // Shift 로 여러 개 고를 때 화면에 보이는 차례
  const order = view === "list" ? [...folders.flatMap((f) => (openB.includes(f.id) ? filesIn(f.id) : [])), ...files].map((x) => x.id) : files.map((x) => x.id);
  const countIn = (id: string) => mine.filter((it) => folderOf(it) === id).length;
  const curName = bins.folders.find((f) => f.id === pf)?.name || "";

  /* ── 폴더·넣고 빼기 ── */
  const addProj = (ids: string[], folder = pf) => {
    if (!ids.length) return;
    const of = { ...binsRef.current.of };
    for (const id of ids) of[id] = folder;
    save({ ...binsRef.current, of });
  };
  const moveTo = (ids: string[], folder: string) => addProj(ids, folder);
  const newBin = (name: string) => { const id = `b${Date.now().toString(36)}`; save({ ...binsRef.current, folders: [...binsRef.current.folders, { id, name }] }); return id; };
  const renameBin = (id: string, name: string) => save({ ...binsRef.current, folders: binsRef.current.folders.map((f) => (f.id === id ? { ...f, name } : f)) });
  const removeBin = (id: string) => {
    const of = { ...binsRef.current.of };
    for (const k of Object.keys(of)) if (of[k] === id) of[k] = "";
    save({ folders: binsRef.current.folders.filter((f) => f.id !== id), of });
    if (pf === id) setPf("");
  };
  /** 프로젝트에서 빼기 — 영상에 쓰고 있는 것은 못 뺀다 (PC 파일은 그대로) */
  const drop = (ids: string[]) => {
    const used = mine.filter((it) => ids.includes(it.id) && usedIn(it));
    const of = { ...binsRef.current.of };
    for (const id of ids) if (!used.find((u) => u.id === id)) delete of[id];
    save({ ...binsRef.current, of });
    setSel([]);
    setMsg(used.length ? `영상에 쓰고 있는 ${used.length}개는 뺄 수 없어요.` : "");
  };
  const startNewBin = () => { const id = newBin("새 폴더"); setOpenB((v) => [...v, id]); setNaming({ id, name: "새 폴더" }); setMenu(null); };

  /* ── 가져오기 ── */
  const fromPc = async () => {
    setMenu(null);
    if (!b) return;
    try {
      const added = await b.lib.pick();
      if (added.length) { addProj(added.map((x) => x.id)); await load(); setSel(added.map((x) => x.id)); }
    } catch (e) { setMsg(errText(e)); }
  };
  const fromDir = async () => {
    setMenu(null);
    if (!b?.lib.pickDir) return;
    setBusy("폴더의 사진·영상을 불러오는 중…");
    try {
      const r = await b.lib.pickDir();
      if (r) {
        if (!r.items.length) setMsg(`"${r.name}" 폴더에 사진·영상이 없어요.`);
        else {
          const fid = binsRef.current.folders.find((f) => f.name === r.name)?.id || newBin(r.name);
          addProj(r.items.map((x) => x.id), fid);
          await load();
          setMsg("");
        }
      }
    } catch (e) { setMsg(errText(e)); }
    setBusy("");
  };

  /** 붙여넣기 — 탐색기에서 Ctrl+C 한 파일 (이 칸에서 복사한 것도) */
  const paste = async () => {
    setMenu(null);
    if (!b?.lib.paste) return;
    setBusy("붙여넣는 중…");
    try {
      const got = await b.lib.paste();
      if (got.length) { addProj(got.map((x) => x.id)); await load(); setSel(got.map((x) => x.id)); setMsg(""); }
      else setMsg("붙여넣을 사진·영상·소리 파일이 없어요. 탐색기에서 파일을 복사(Ctrl+C)한 뒤 눌러 주세요.");
    } catch (e) { setMsg(errText(e)); }
    setBusy("");
  };
  /** 복사 — 윈도우 클립보드에 파일로 (탐색기·다른 프로젝트에 붙여넣기) */
  const copy = async (ids: string[]) => {
    setMenu(null);
    const paths = mine.filter((it) => ids.includes(it.id) && it.path).map((it) => it.path as string);
    if (!paths.length || !b?.lib.copy) return;
    if (await b.lib.copy(paths)) setMsg("");
  };
  /** 새 항목 › 단색 화면 — 영상 비율 크기 그림 한 장 */
  const colorIn = useRef<HTMLInputElement>(null);
  const solid = async (color: string, name: string) => {
    setMenu(null);
    if (!b?.lib.saveImage) return;
    const [w, h] = project.ratio === "9:16" ? [1080, 1920] : project.ratio === "4:5" ? [1080, 1350] : project.ratio === "1:1" ? [1080, 1080] : project.ratio === "4:3" ? [1440, 1080] : [1920, 1080];
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const g = cv.getContext("2d");
    if (!g) return;
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    try {
      const it = await b.lib.saveImage(project.dir, cv.toDataURL("image/png"), name);
      const names = { ...(binsRef.current.names || {}), [it.id]: name };
      const of = { ...binsRef.current.of, [it.id]: pf };
      save({ ...binsRef.current, of, names });
      await load();
      setSel([it.id]);
    } catch (e) { setMsg(errText(e)); }
  };
  /** 안 쓰는 것 모두 빼기 — 영상에 안 쓴 것을 이 프로젝트에서 (PC 파일은 그대로) */
  const dropUnused = () => {
    setMenu(null);
    const ids = mine.filter((it) => !usedIn(it)).map((it) => it.id);
    if (!ids.length) return setMsg("안 쓰는 것이 없어요.");
    if (!window.confirm(`영상에 안 쓴 ${ids.length}개를 프로젝트에서 뺄까요?\n(PC 파일과 [사진·영상] 목록에는 그대로 남아요)`)) return;
    drop(ids);
  };

  /* ── 넣기 ── */
  const put = async (it: LibItem, action: LibPickAction | "plus") => {
    setMenu(null);
    setBusy("넣는 중…");
    try {
      if (action === "plus") await pro?.onPlus(it);
      else await onPick(it, action);
    } catch (e) { setMsg(errText(e)); }
    setBusy("");
  };

  /* ── 고르기 (Ctrl·Shift 로 여러 개) ── */
  const click = (e: React.MouseEvent, id: string) => {
    if (e.ctrlKey || e.metaKey) setSel((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
    else if (e.shiftKey && lastSel.current) {
      const ids = order;
      const a = ids.indexOf(lastSel.current), c = ids.indexOf(id);
      if (a >= 0 && c >= 0) setSel(ids.slice(Math.min(a, c), Math.max(a, c) + 1));
    } else setSel([id]);
    lastSel.current = id;
  };
  // Del = 프로젝트에서 빼기 · Ctrl+C·V = 복사·붙여넣기 (마우스가 이 칸 위에 있을 때만 — 편집기의 클립 복사와 안 겹치게)
  const hot = useRef(false);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("input, textarea, [contenteditable]")) return;
      if (e.key === "Escape") setMenu(null);
      if (hot.current && (e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C" || e.key === "v" || e.key === "V")) {
        e.preventDefault();
        e.stopPropagation();
        if (e.key.toLowerCase() === "v") void paste(); else if (sel.length) void copy(sel);
        return;
      }
      if (e.key !== "Delete" || !sel.length) return;
      e.preventDefault();
      e.stopPropagation();
      drop(sel);
    };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  });

  /* ── 끌기 ── */
  const dragStart = (e: React.DragEvent, it: LibItem) => {
    const ids = sel.includes(it.id) ? sel : [it.id];
    e.dataTransfer.setData(DRAG_MEDIA, JSON.stringify({ lib: it, ...(ids.length > 1 ? { ids } : {}) }));
    e.dataTransfer.setData("gsv-proj", JSON.stringify(ids));
    e.dataTransfer.effectAllowed = "copyMove";
    if (pro) { blankDragImage(e); Object.assign(mediaDrag, { len: it.kind === "video" ? it.duration || 3 : it.kind === "audio" ? it.duration || 5 : 3, name: it.name, thumb: it.thumb }); }
  };
  const dropIds = (e: React.DragEvent): string[] => {
    try {
      const own = e.dataTransfer.getData("gsv-proj");
      if (own) return JSON.parse(own);
      const d = JSON.parse(e.dataTransfer.getData(DRAG_MEDIA) || "{}"); // [사진·영상] 칸에서 끌어온 것
      return d.ids || (d.lib?.id ? [d.lib.id] : []);
    } catch { return []; }
  };
  const dropZone = (folder: string) => ({
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDropOn(folder || "^"); },
    onDragLeave: () => setDropOn(""),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDropOn(""); const ids = dropIds(e); if (ids.length) { moveTo(ids, folder); void load(); } },
  });

  /* ── 그리기 ── */
  const folderSvg = (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="#C9A227" stroke="none"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>;
  const kindText = (it: LibItem) => (it.kind === "video" ? (it.duration ? fmtTime(it.duration, false) : "영상") : it.kind === "audio" ? (it.duration ? fmtTime(it.duration, false) : "소리") : "사진");
  const rowBase: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, height: 34, padding: "0 8px", borderRadius: 4, cursor: "default", fontSize: 13.5, userSelect: "none" };
  const nameEdit = (id: string) => naming && naming.id === id ? (
    <input autoFocus value={naming.name} onFocus={(e) => e.currentTarget.select()} onClick={(e) => e.stopPropagation()}
      onChange={(e) => setNaming({ ...naming, name: e.target.value })}
      onKeyDown={(e) => { if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur(); if (e.key === "Escape") setNaming(null); }}
      onBlur={() => { const v = naming.name.trim(); setNaming(null); if (bins.folders.some((f) => f.id === id)) { if (v) renameBin(id, v); } else setName(id, v); }}
      style={{ flex: 1, minWidth: 0, height: 24, padding: "0 6px", background: C.bg, color: C.text, border: `1px solid ${C.accent}`, borderRadius: 3, fontSize: 13.5, fontFamily: FONT, outline: "none" }} />
  ) : null;

  const binRow = (f: { id: string; name: string }) => (
    <div key={f.id} {...dropZone(f.id)}
      onClick={(e) => { e.stopPropagation(); setSel([]); toggleB(f.id); }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setMenu({ x: e.clientX, y: e.clientY, kind: "bin", id: f.id }); }}
      title="누르면 펼치고 접어요 · 사진·영상을 끌어다 놓으면 이 폴더로"
      style={{ ...rowBase, background: dropOn === f.id ? "rgba(59,130,246,0.22)" : "transparent", border: `1px solid ${dropOn === f.id ? C.accent : "transparent"}` }}>
      <span style={{ width: 12, color: C.sub, fontSize: 11, flexShrink: 0, display: "inline-block", transform: openB.includes(f.id) ? "rotate(90deg)" : "none", transition: "transform .12s" }}>▶</span>
      {folderSvg()}
      {nameEdit(f.id) || <span style={{ flex: 1, minWidth: 0, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>}
      <span style={{ width: 54, fontSize: 12, color: C.dim, textAlign: "right" }}>{countIn(f.id)}개</span>
    </div>
  );
  const fileRow = (it: LibItem, inner = false) => {
    const on = sel.includes(it.id);
    return (
      <div key={it.id} draggable onDragStart={(e) => dragStart(e, it)} onDragEnd={() => { mediaDrag.len = 0; }}
        onClick={(e) => { e.stopPropagation(); click(e, it.id); }}
        onDoubleClick={() => (pro ? pro.onSource?.(it) : onTrim?.(it))}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (!sel.includes(it.id)) setSel([it.id]); setMenu({ x: e.clientX, y: e.clientY, kind: "file", id: it.id }); }}
        title={`${nm(it)}${nm(it) !== it.name ? ` (PC 파일: ${it.name})` : ""}${usedIn(it) ? " · 영상에 쓰는 중" : ""}`}
        style={{ ...rowBase, paddingLeft: inner ? 30 : 8, background: on ? "rgba(59,130,246,0.22)" : "transparent", border: `1px solid ${on ? C.accent : "transparent"}` }}>
        <span style={{ width: 40, height: 24, borderRadius: 2, overflow: "hidden", background: "#000", flexShrink: 0 }}>
          {it.thumb ? <img src={it.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <span style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.dim }}><Icon name="music" size={13} /></span>}
        </span>
        {nameEdit(it.id) || <span style={{ flex: 1, minWidth: 0, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nm(it)}</span>}
        {usedIn(it) && <span title="영상에 쓰는 중" style={{ width: 6, height: 6, borderRadius: 3, background: C.accent, flexShrink: 0 }} />}
        <span style={{ width: 54, fontSize: 12, color: C.sub, textAlign: "right" }}>{kindText(it)}</span>
      </div>
    );
  };
  const binTile = (f: { id: string; name: string }) => (
    <div key={f.id} {...dropZone(f.id)} onDoubleClick={() => { setPf(f.id); setSel([]); }} onClick={() => setSel([])}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setMenu({ x: e.clientX, y: e.clientY, kind: "bin", id: f.id }); }}
      style={{ minWidth: 0, borderRadius: 4, padding: 3, border: `1px solid ${dropOn === f.id ? C.accent : "transparent"}`, background: dropOn === f.id ? "rgba(59,130,246,0.22)" : "transparent", userSelect: "none" }}>
      <div style={{ aspectRatio: "16 / 10", display: "flex", alignItems: "center", justifyContent: "center", background: C.card, borderRadius: 3 }}>{folderSvg(30)}</div>
      <div style={{ display: "flex", marginTop: 3, fontSize: 11.5 }}>{nameEdit(f.id) || <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>}<span style={{ color: C.dim, marginLeft: 4 }}>{countIn(f.id)}</span></div>
    </div>
  );
  const fileTile = (it: LibItem) => {
    const on = sel.includes(it.id);
    return (
      <div key={it.id} draggable onDragStart={(e) => dragStart(e, it)} onDragEnd={() => { mediaDrag.len = 0; }}
        onClick={(e) => { e.stopPropagation(); click(e, it.id); }} onDoubleClick={() => (pro ? pro.onSource?.(it) : onTrim?.(it))}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (!sel.includes(it.id)) setSel([it.id]); setMenu({ x: e.clientX, y: e.clientY, kind: "file", id: it.id }); }}
        title={nm(it)}
        style={{ minWidth: 0, borderRadius: 4, padding: 3, border: `1px solid ${on ? C.accent : "transparent"}`, background: on ? "rgba(59,130,246,0.22)" : "transparent", userSelect: "none" }}>
        <div style={{ position: "relative", aspectRatio: "16 / 10", background: "#000", borderRadius: 3, overflow: "hidden" }}>
          {it.thumb && <img src={it.thumb} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
          {it.kind !== "image" && <span style={{ position: "absolute", right: 4, bottom: 3, fontSize: 11, color: "#fff", background: "rgba(0,0,0,0.6)", padding: "0 4px", borderRadius: 2 }}>{kindText(it)}</span>}
          {usedIn(it) && <span title="영상에 쓰는 중" style={{ position: "absolute", left: 5, top: 5, width: 7, height: 7, borderRadius: 4, background: C.accent }} />}
        </div>
        <div style={{ marginTop: 3, fontSize: 11.5, color: C.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nm(it)}</div>
      </div>
    );
  };

  /* ── 오른쪽 클릭 메뉴 ── */
  const mItem = (label: string, go: () => void, o: { off?: boolean; danger?: boolean; key?: string } = {}) => (
    <button key={o.key || label} type="button" disabled={o.off} onClick={() => { if (!o.off) go(); }}
      onMouseEnter={(e) => { if (!o.off) e.currentTarget.style.background = "rgba(59,130,246,0.25)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      style={{ display: "block", width: "100%", padding: "7px 18px", border: 0, background: "transparent", color: o.off ? C.dim : o.danger ? C.danger : C.text, fontSize: 13.5, fontFamily: FONT, textAlign: "left", cursor: o.off ? "default" : "pointer", whiteSpace: "nowrap" }}>{label}</button>
  );
  const [subOpen, setSubOpen] = useState("");
  const sub = (label: string, kids: React.ReactNode[], off = false) => (
    <div key={label} style={{ position: "relative" }} onMouseEnter={() => !off && setSubOpen(label)} onMouseLeave={() => setSubOpen("")}>
      <div style={{ display: "flex", padding: "7px 18px", fontSize: 13.5, color: off ? C.dim : C.text, background: subOpen === label ? "rgba(59,130,246,0.25)" : "transparent", cursor: "default", whiteSpace: "nowrap" }}><span style={{ flex: 1 }}>{label}</span><span style={{ marginLeft: 18 }}>›</span></div>
      {subOpen === label && (
        <div style={{ position: "absolute", top: -5, ...(menu && menu.x > window.innerWidth - 520 ? { right: "100%" } : { left: "100%" }), minWidth: 200, padding: "5px 0", background: C.card, border: `1px solid ${C.line2}`, borderRadius: 6, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>{kids}</div>
      )}
    </div>
  );
  const sep = (k: string) => <div key={k} style={{ height: 1, background: C.line2, margin: "4px 0" }} />;
  const menuBody = () => {
    if (!menu) return null;
    if (menu.kind === "bg") return [
      mItem("붙여넣기  (Ctrl+V)", () => void paste(), { off: !b?.lib.paste }),
      sep("s0"),
      mItem("새 폴더", startNewBin),
      sub("새 항목", [
        mItem("검정 화면", () => void solid("#000000", "검정 화면")),
        mItem("흰색 화면", () => void solid("#ffffff", "흰색 화면")),
        mItem("색 골라 단색 화면…", () => { setMenu(null); colorIn.current?.click(); }),
      ]),
      sep("s1"),
      mItem("가져오기…", () => void fromPc()),
      mItem("폴더째 가져오기…", () => void fromDir(), { off: !b?.lib.pickDir }),
      sub("다른 곳에서 가져오기", [
        mItem("내 공실 사진", () => { setMenu(null); onOpenLib?.("vacancy"); }),
        mItem("오픈자료 (무료 사진·영상)", () => { setMenu(null); onOpenLib?.("free"); }),
        mItem("공실뉴스 드론", () => { setMenu(null); onOpenLib?.("drone"); }),
        mItem("AI 그림 만들기", () => { setMenu(null); onOpenLib?.("ai"); }),
      ], !onOpenLib),
      sep("s2"),
      mItem("안 쓰는 것 모두 빼기", dropUnused),
      mItem("탐색기에서 프로젝트 보기", () => { setMenu(null); const f = project.file || project.dir; if (f) void b?.showFile(f); }, { off: !(project.file || project.dir) }),
      ...(pf ? [sep("s3"), mItem("위 폴더로", () => { setPf(""); setMenu(null); })] : []),
    ];
    if (menu.kind === "bin") {
      const id = menu.id || "";
      return [
        mItem("열기", () => { setPf(id); setSel([]); setMenu(null); }),
        mItem("이름 바꾸기", () => { setNaming({ id, name: bins.folders.find((f) => f.id === id)?.name || "" }); setMenu(null); }),
        sep("s1"),
        mItem("폴더 삭제 (안의 파일은 프로젝트에 남아요)", () => { removeBin(id); setMenu(null); }, { danger: true }),
      ];
    }
    const it = mine.find((x) => x.id === menu.id);
    if (!it) return null;
    const many = sel.length > 1 ? sel : [it.id];
    const vis = it.kind === "image" || it.kind === "video";
    return [
      ...(many.length > 1 ? [<div key="n" style={{ padding: "4px 18px 6px", fontSize: 12, color: C.dim }}>{many.length}개 고름</div>] : []),
      ...(pro
        ? [mItem("타임라인에 넣기 (재생 막대 자리)", () => void put(it, "plus"), { off: many.length > 1 })]
        : [
          ...(canReplace && vis ? [mItem("고른 클립 화면 바꾸기", () => void put(it, "replace"), { off: many.length > 1 })] : []),
          mItem(canReplace ? "고른 클립 뒤에 넣기" : "맨 끝에 넣기", () => void put(it, "insert"), { off: many.length > 1 }),
          ...(vis ? [mItem("화면 위에 올리기", () => void put(it, "overlay"), { off: many.length > 1 })] : []),
        ]),
      ...((pro ? pro.onSource : onTrim) && it.kind !== "audio" ? [mItem(pro ? "소스 모니터에서 열기" : "쓸 부분 골라 넣기", () => { setMenu(null); if (pro) pro.onSource?.(it); else onTrim?.(it); }, { off: many.length > 1 })] : []),
      sep("s1"),
      <div key="mv" style={{ padding: "4px 18px 2px", fontSize: 12, color: C.dim }}>폴더로 옮기기</div>,
      ...[{ id: "", name: "맨 위 (폴더 밖)" }, ...bins.folders].map((f) =>
        mItem(`${many.every((id) => (binsRef.current.of[id] || "") === f.id) ? "✓ " : "   "}${f.name}`, () => { moveTo(many, f.id); setMenu(null); }, { key: `mv${f.id}` })),
      mItem("   + 새 폴더 만들어 옮기기", () => { const id = newBin("새 폴더"); moveTo(many, id); setNaming({ id, name: "새 폴더" }); setPf(""); setMenu(null); }, { key: "mvnew" }),
      sep("s2"),
      mItem(`복사  (Ctrl+C)${many.length > 1 ? ` ${many.length}개` : ""}`, () => void copy(many), { off: !b?.lib.copy }),
      mItem("이름 바꾸기 (프로젝트 안에서만)", () => { setMenu(null); setNaming({ id: it.id, name: nm(it) }); }, { off: many.length > 1 }),
      mItem("탐색기에서 보기", () => { setMenu(null); if (it.path) void b?.showFile(it.path); }, { off: !it.path || many.length > 1 }),
      sep("s3"),
      mItem(`프로젝트에서 빼기${many.length > 1 ? ` (${many.length}개)` : ""} · PC 파일은 그대로`, () => { drop(many); setMenu(null); }, { danger: true }),
    ];
  };

  const empty = items !== null && !folders.length && !files.length;
  return (
    <Side title="프로젝트" onClose={onClose}>
      <input ref={colorIn} type="color" defaultValue="#1e3a8a" onChange={(e) => void solid(e.target.value, `단색 ${e.target.value}`)} style={{ position: "fixed", left: -100, top: -100, width: 1, height: 1, opacity: 0 }} />
      <div onMouseEnter={() => { hot.current = true; }} onMouseLeave={() => { hot.current = false; }} style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        {/* 위치 · 찾기 */}
        <div style={{ padding: "10px 12px 8px", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.sub, marginBottom: 8, minHeight: 22 }}>
            {pf ? (
              <>
                <button type="button" onClick={() => { setPf(""); setSel([]); }} {...dropZone("")} title="위 폴더로 (끌어다 놓으면 폴더 밖으로)"
                  style={{ display: "flex", alignItems: "center", gap: 4, border: `1px solid ${dropOn === "^" ? C.accent : "transparent"}`, background: dropOn === "^" ? "rgba(59,130,246,0.22)" : "transparent", color: C.sub, fontSize: 13, fontFamily: FONT, cursor: "pointer", padding: "1px 4px", borderRadius: 3 }}>
                  ‹ {project.name || "프로젝트"}
                </button>
                <span>/</span>{folderSvg(14)}<b style={{ color: C.text }}>{curName}</b>
              </>
            ) : <>{folderSvg(14)}<span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.name || "프로젝트"}</span></>}
          </div>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 9, top: 7, color: C.dim }}><Icon name="search" size={15} /></span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름으로 찾기"
              style={{ width: "100%", height: 30, padding: "0 10px 0 30px", background: C.bg, color: C.text, border: `1px solid ${C.line2}`, borderRadius: 4, fontSize: 13, fontFamily: FONT, outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>
        {/* 머리줄 */}
        {view === "list" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 20px 6px 64px", borderBottom: `1px solid ${C.line}`, fontSize: 12, fontWeight: 700 }}>
            <button type="button" onClick={() => setSortBy("name")} style={{ flex: 1, textAlign: "left", border: 0, background: "transparent", color: sortBy === "name" ? C.text : C.dim, fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: "pointer", padding: 0 }}>이름{sortBy === "name" ? " ↑" : ""}</button>
            <button type="button" onClick={() => setSortBy("dur")} style={{ width: 54, textAlign: "right", border: 0, background: "transparent", color: sortBy === "dur" ? C.text : C.dim, fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: "pointer", padding: 0 }}>{sortBy === "dur" ? "↓ " : ""}길이</button>
          </div>
        )}
        {/* 목록 — 빈 곳 오른쪽 클릭 = 새 폴더·가져오기 */}
        <div {...dropZone(pf)} onClick={() => { setSel([]); setMenu(null); }}
          onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, kind: "bg" }); }}
          style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "6px 12px", outline: dropOn === (pf || "^") && !folders.length ? `1px dashed ${C.accent}` : undefined }}>
          {busy && <div style={{ padding: "6px 4px", fontSize: 13, color: C.sub }}>{busy}</div>}
          {msg && <div style={{ padding: "6px 4px", fontSize: 13, color: C.danger }}>{msg}</div>}
          {items === null ? <div style={{ padding: 10, color: C.sub, fontSize: 13.5 }}>불러오는 중…</div>
            : view === "list" ? <>{folders.map((f) => (
                <React.Fragment key={f.id}>{binRow(f)}{openB.includes(f.id) && (countIn(f.id) ? filesIn(f.id).map((it) => fileRow(it, true)) : <div style={{ padding: "4px 0 6px 52px", fontSize: 12.5, color: C.dim }}>비어 있어요</div>)}</React.Fragment>
              ))}{files.map((it) => fileRow(it))}</>
            : <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 4 }}>{folders.map(binTile)}{files.map(fileTile)}</div>}
          {empty && (
            <div style={{ padding: "18px 6px", color: C.sub, fontSize: 13.5, lineHeight: 1.7 }}>
              {word ? "찾는 이름이 없어요." : pf ? "빈 폴더예요. 사진·영상을 이 칸에 끌어다 놓아 주세요." : <>아직 아무것도 없어요.<br />빈 곳을 <b style={{ color: C.text }}>오른쪽 클릭</b> → [가져오기]·[새 폴더]</>}
            </div>
          )}
        </div>
        {/* 아래 줄 — 보기 · 새 폴더 · 가져오기 (프리미어처럼) */}
        <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "6px 10px", borderTop: `1px solid ${C.line}` }}>
          {([["list", "목록으로 보기", "M4 6h16M4 12h16M4 18h16"], ["icon", "아이콘으로 보기", "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"]] as const).map(([k, t, d]) => (
            <button key={k} type="button" title={t} onClick={() => setView(k)}
              style={{ width: 30, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: 0, borderRadius: 4, background: view === k ? C.card : "transparent", color: view === k ? C.text : C.dim, cursor: "pointer" }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
            </button>
          ))}
          <span style={{ flex: 1, fontSize: 12, color: C.dim, paddingLeft: 8 }}>{items ? `${folders.length ? `폴더 ${folders.length} · ` : ""}${files.length}개` : ""}</span>
          <button type="button" title="새 폴더" onClick={startNewBin} style={{ width: 30, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: 0, borderRadius: 4, background: "transparent", color: C.sub, cursor: "pointer" }}>
            <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2zM12 11v5M9.5 13.5h5" /></svg>
          </button>
          <button type="button" title="가져오기 (PC 파일)" onClick={() => void fromPc()} style={{ width: 30, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: 0, borderRadius: 4, background: "transparent", color: C.sub, cursor: "pointer" }}>
            <Icon name="plus" size={18} />
          </button>
        </div>
      </div>
      {menu && (
        <>
          <div onClick={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null); }} style={{ position: "fixed", inset: 0, zIndex: 3999 }} />
          <div style={{ position: "fixed", left: Math.min(menu.x, window.innerWidth - 300), top: Math.max(8, Math.min(menu.y, window.innerHeight - (menu.kind === "file" ? 120 + 34 * (bins.folders.length + 11) : 400))), zIndex: 4000, minWidth: 220, padding: "5px 0", background: C.card, border: `1px solid ${C.line2}`, borderRadius: 6, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
            {menuBody()}
          </div>
        </>
      )}
    </Side>
  );
}
