"use client";

// 처음 화면(새로 만들기 · 프로젝트 열기) · 새로 만들기 창(만들 방법 4가지) · 촬영 영상 편집 · 롱폼→숏폼 · 녹화
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Clip, Folders, LibItem, Method, Project, Ratio, Recent, TrashItem } from "./types";
import { RATIO_LABEL, errText, fmtTime, uid, videoBridge } from "./types";
import { splitScript } from "./timeline";
import { useStudioWriter } from "@/components/admin/sections/useStudioWriter";
import { RecordMini, openMiniWindow } from "./RecordMini";
import { listMyStudioVacancies } from "@/app/actions/studio";
import { Btn, C, FONT, Hint, Icon, Modal, Toggle, VolumeControl, Working, input, label } from "./ui";

/* ── 저장 폴더 설정 (처음 화면 [저장 폴더]) — 프로젝트·녹화·내보낸 영상. 앞으로 새로 만드는 것부터 ── */
function FoldersDialog({ onClose }: { onClose: () => void }) {
  const b = videoBridge()!;
  const [f, setF] = useState<Folders | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    b.project.folders?.().then(setF).catch((e) => setErr(errText(e)));
  }, [b]);
  const shown = (d: string) => {
    const parts = d.split(/[\\/]/).filter(Boolean);
    const di = parts.findIndex((x) => /^(documents|문서)$/i.test(x));
    return (di >= 0 ? ["문서", ...parts.slice(di + 1)] : parts).join(" › ");
  };
  const pick = async (k: "projectDir" | "recordDir" | "exportDir", title: string) => {
    if (!f) return;
    const cur = f[k] || f.defaults[k] || f.defaults.projectDir;
    const d = await b.project.pickFolder?.(title, cur);
    if (!d) return;
    setF(await b.project.setFolders!({ [k]: d === f.defaults[k] ? "" : d }));
  };
  const reset = async (k: "projectDir" | "recordDir" | "exportDir") => f && setF(await b.project.setFolders!({ [k]: "" }));
  const row = (k: "projectDir" | "recordDir" | "exportDir", name: string, desc: string, emptyText?: string) => {
    if (!f) return null;
    const v = f[k] || f.defaults[k];
    return (
      <div style={{ padding: "14px 0", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 15.5, fontWeight: 800 }}>{name}</span>
          <span style={{ fontSize: 13, color: C.dim }}>{desc}</span>
          {!f[k] && <span style={{ fontSize: 12, color: C.sub, border: `1px solid ${C.line2}`, borderRadius: 4, padding: "0 6px" }}>기본</span>}
        </div>
        <div title={v} style={{ fontSize: 14, color: C.text, margin: "6px 0 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v ? shown(v) : emptyText}</div>
        <div style={{ display: "flex", gap: 6 }}>
          <Btn small onClick={() => pick(k, `${name} 고르기`)}><Icon name="folder" size={15} />바꾸기</Btn>
          {v && <Btn small onClick={() => b.openPath(v)}><Icon name="open" size={15} />폴더 열기</Btn>}
          {f[k] && <Btn small onClick={() => reset(k)}><Icon name="undo" size={15} />기본으로</Btn>}
        </div>
      </div>
    );
  };
  return (
    <Modal title="저장 폴더" onClose={onClose} width={620} footer={<Btn primary onClick={onClose}>닫기</Btn>}>
      <div style={{ padding: "6px 24px 18px" }}>
        {!f ? <div style={{ padding: 20, color: err ? C.danger : C.sub }}>{err || "불러오는 중…"}</div> : (
          <>
            {row("projectDir", "프로젝트 저장 폴더", "새로 만드는 프로젝트 파일(.gss)")}
            {row("recordDir", "녹화 영상 저장 폴더", "영상 녹화하기 (녹화 창에서 바꿔도 여기에 들어가요)")}
            {row("exportDir", "내보낸 영상 폴더", "완성 영상", "프로젝트 파일(.gss)이 있는 폴더")}
            <div style={{ marginTop: 14 }}><Hint>이미 만든 프로젝트·녹화는 옮기지 않아요. 앞으로 새로 만드는 것부터 이 폴더에 저장돼요. 다른 폴더를 골라도 녹화·완성 영상은 [내 자료]에 그대로 보여요.</Hint></div>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ── 처음 화면 ── */
const iconBtn: React.CSSProperties = { flexShrink: 0, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", border: 0, borderRadius: 4, background: "transparent", color: "#8b95a3", cursor: "pointer" };
export function Home({ onNew, onOpenPick, onOpen }: { onNew: () => void; onOpenPick: () => void; onOpen: (dir: string) => void }) {
  const b = videoBridge()!;
  const [recent, setRecent] = useState<Recent[] | null>(null);
  useEffect(() => {
    b.project.recent().then(setRecent).catch(() => setRecent([]));
  }, [b]);
  // 최근 프로젝트 이름 바꾸기 (연필) — 이름만 바뀌고 폴더는 그대로
  const [editing, setEditing] = useState("");
  const [draft, setDraft] = useState("");
  const saveName = async (r: Recent) => {
    if (editing !== r.dir) return;
    setEditing("");
    const nm = draft.trim();
    if (!nm || nm === r.name || !b.project.rename) return;
    try {
      const saved = await b.project.rename(r.dir, nm);
      setRecent((list) => (list || []).map((x) => (x.dir === r.dir ? { ...x, name: saved } : x)));
    } catch (e) {
      alert(errText(e));
    }
  };
  // 검색 · 보기(이 PC에 기억) · 휴지통
  const [q, setQ] = useState("");
  const [view, setView] = useState<"grid" | "list">(() => {
    try {
      return localStorage.getItem("gsv:homeView") === "list" ? "list" : "grid";
    } catch {
      return "grid";
    }
  });
  const setViewMode = (v: "grid" | "list") => {
    setView(v);
    try {
      localStorage.setItem("gsv:homeView", v);
    } catch {}
  };
  const shown = (recent || []).filter((r) => !q.trim() || r.name.toLowerCase().includes(q.trim().toLowerCase()));
  const [trashView, setTrashView] = useState(false);
  const [trash, setTrash] = useState<TrashItem[] | null>(null);
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null);
  // 여러 개 고르기 — 최근 프로젝트(폴더) / 휴지통(id). 고르는 중에는 카드를 눌러도 열지 않고 고르기만
  const [sel, setSel] = useState<string[]>([]);
  const [tsel, setTsel] = useState<string[]>([]);
  const toggle = (arr: string[], set: (v: string[]) => void, k: string) => set(arr.includes(k) ? arr.filter((x) => x !== k) : [...arr, k]);
  const cardClick = (r: Recent) => {
    if (editing === r.dir) return;
    if (sel.length) toggle(sel, setSel, r.dir);
    else onOpen(r.dir);
  };
  const trashMany = async () => {
    if (!b.project.trash || !sel.length) return;
    const done: { id: string; name: string }[] = [];
    for (const dir of sel) {
      const r = (recent || []).find((x) => x.dir === dir);
      try {
        done.push({ id: await b.project.trash(dir), name: r?.name || "" });
      } catch (e) {
        alert(`${r?.name || dir}: ${errText(e)}`);
      }
    }
    setSel([]);
    reload();
    if (done.length) setToast({ text: `프로젝트 ${done.length}개를 휴지통으로 옮겼어요.`, undo: async () => { for (const d of done) await b.project.restore?.(d.id).catch(() => {}); reload(); } });
  };
  const restoreMany = async () => {
    for (const id of tsel) await b.project.restore?.(id).catch((e) => alert(errText(e)));
    const n = tsel.length;
    setTsel([]);
    setTrash((list) => (list || []).filter((y) => !tsel.includes(y.id)));
    setToast({ text: `프로젝트 ${n}개를 되살렸어요. 최근 프로젝트에 다시 보여요.` });
    reload();
  };
  const purgeMany = async () => {
    if (!tsel.length || !confirm(`고른 프로젝트 ${tsel.length}개를 영구 삭제할까요?\n되돌릴 수 없어요. 녹화 원본·내 자료는 지워지지 않아요.`)) return;
    for (const id of tsel) await b.project.purge?.(id).catch((e) => alert(errText(e)));
    setTrash((list) => (list || []).filter((y) => !tsel.includes(y.id)));
    setTsel([]);
  };
  const check = (on: boolean, onClick: () => void, show: boolean, extra?: React.CSSProperties) => (
    <span role="checkbox" aria-checked={on} onClick={(e) => { e.stopPropagation(); onClick(); }} title={on ? "고르기 풀기" : "고르기"}
      style={{ width: 22, height: 22, borderRadius: 5, border: `2px solid ${on ? C.accent : "rgba(255,255,255,0.85)"}`, background: on ? C.accent : "rgba(0,0,0,0.45)", display: show || on ? "flex" : "none", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer", flexShrink: 0, ...extra }}>
      {on && <Icon name="check" size={14} stroke={3} />}
    </span>
  );
  const [hoverDir, setHoverDir] = useState("");
  const [foldersOpen, setFoldersOpen] = useState(false);
  const reload = () => b.project.recent().then(setRecent).catch(() => {});
  const openTrash = () => {
    setTrashView(true);
    setTrash(null);
    b.project.trashList?.().then(setTrash).catch(() => setTrash([]));
  };
  const toTrash = async (r: Recent) => {
    if (!b.project.trash) return;
    try {
      const id = await b.project.trash(r.dir);
      setRecent((list) => (list || []).filter((x) => x.dir !== r.dir));
      setToast({ text: `'${r.name}' 프로젝트를 휴지통으로 옮겼어요.`, undo: async () => { await b.project.restore?.(id).catch((e) => alert(errText(e))); reload(); } });
    } catch (e) {
      alert(errText(e));
    }
  };
  const restoreOne = async (x: TrashItem) => {
    try {
      await b.project.restore!(x.id);
      setTrash((list) => (list || []).filter((y) => y.id !== x.id));
      setToast({ text: `'${x.name}' 프로젝트를 되살렸어요. 최근 프로젝트에 다시 보여요.` });
      reload();
    } catch (e) {
      alert(errText(e));
    }
  };
  const purgeOne = async (x: TrashItem) => {
    if (!confirm(`'${x.name}' 프로젝트를 영구 삭제할까요?\n프로젝트 폴더(목소리·내보낸 영상 포함)가 지워지고 되돌릴 수 없어요.\n녹화 원본·내 자료는 지워지지 않아요.`)) return;
    try {
      await b.project.purge!(x.id);
      setTrash((list) => (list || []).filter((y) => y.id !== x.id));
    } catch (e) {
      alert(errText(e));
    }
  };
  const emptyTrash = async () => {
    if (!trash?.length || !confirm(`휴지통의 프로젝트 ${trash.length}개를 모두 영구 삭제할까요?\n되돌릴 수 없어요. 녹화 원본·내 자료는 지워지지 않아요.`)) return;
    try {
      await b.project.purge!("all");
      setTrash([]);
    } catch (e) {
      alert(errText(e));
    }
  };
  const tbtn = (on: boolean): React.CSSProperties => ({ height: 32, padding: "0 12px", borderRadius: 5, border: `1px solid ${on ? C.accent : C.line2}`, background: "transparent", color: C.text, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" });
  // 이름 줄 — 연필(이름 바꾸기) · 휴지통
  const nameRow = (r: Recent) =>
    editing === r.dir ? (
      // 이름 고치기 — 엔터·바깥 누르기: 저장, Esc: 그만두기
      <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") saveName(r); if (e.key === "Escape") setEditing(""); }}
        onBlur={() => saveName(r)}
        style={{ ...input, height: 30, fontSize: 14.5, fontWeight: 700, padding: "0 8px", width: "100%", boxSizing: "border-box" }} />
    ) : (
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
        {b.project.rename && (
          <button type="button" title="이름 바꾸기" onClick={(e) => { e.stopPropagation(); setDraft(r.name); setEditing(r.dir); }} style={iconBtn}>
            <Icon name="pen" size={15} />
          </button>
        )}
        {b.project.trash && (
          <button type="button" title="휴지통으로 (되살릴 수 있어요)" onClick={(e) => { e.stopPropagation(); toTrash(r); }} style={iconBtn}>
            <Icon name="trash" size={15} />
          </button>
        )}
      </div>
    );
  const big = (icon: string, title: string, desc: string, onClick: () => void, primary?: boolean) => (
    <button type="button" onClick={onClick}
      style={{ width: 300, height: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, borderRadius: 8, border: `1px solid ${primary ? C.accent : C.line2}`, background: primary ? C.accent : C.card, color: primary ? "#fff" : C.text, cursor: "pointer", fontFamily: FONT }}>
      <span style={{ width: 52, height: 52, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${primary ? "rgba(255,255,255,0.7)" : C.line2}` }}><Icon name={icon} size={28} /></span>
      <span style={{ fontSize: 21, fontWeight: 800 }}>{title}</span>
      <span style={{ fontSize: 15, opacity: 0.85, lineHeight: 1.5, padding: "0 24px", textAlign: "center" }}>{desc}</span>
    </button>
  );
  return (
    <div style={{ flex: 1, overflowY: "auto", background: C.bg, color: C.text, fontFamily: FONT }}>
      {foldersOpen && <FoldersDialog onClose={() => setFoldersOpen(false)} />}
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "64px 24px" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
          {big("plus", "새로 만들기", "원하는 방식으로 새 영상을 만들어요", onNew, true)}
          {big("open", "프로젝트 열기", "저장한 프로젝트를 이어서 편집해요", onOpenPick)}
        </div>
        <div style={{ marginTop: 52 }}>
          {/* 캡컷처럼 — 검색 · 보기(크게/목록) · 휴지통 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            {trashView ? (
              <>
                <button type="button" onClick={() => setTrashView(false)} style={tbtn(false)}><Icon name="back" size={15} />최근 프로젝트</button>
                <span style={{ ...label, fontSize: 17, marginLeft: 6 }}>휴지통{trash ? ` (${trash.length})` : ""}</span>
                <span style={{ flex: 1 }} />
                {tsel.length > 0 ? (
                  <>
                    <span style={{ fontSize: 14, fontWeight: 800, color: C.accent }}>{tsel.length}개 선택</span>
                    <button type="button" onClick={() => setTsel((trash || []).map((x) => x.id))} style={tbtn(false)}>전체 선택</button>
                    <button type="button" onClick={() => setTsel([])} style={tbtn(false)}>선택 풀기</button>
                    <button type="button" onClick={restoreMany} style={tbtn(false)}><Icon name="undo" size={15} />되살리기</button>
                    <button type="button" onClick={purgeMany} style={{ ...tbtn(false), color: C.danger }}><Icon name="trash" size={15} />영구 삭제</button>
                  </>
                ) : trash && trash.length > 0 && <button type="button" onClick={emptyTrash} style={{ ...tbtn(false), color: C.danger }}><Icon name="trash" size={15} />휴지통 비우기</button>}
              </>
            ) : (
              <>
                <span style={{ ...label, fontSize: 17 }}>최근 프로젝트</span>
                <span style={{ flex: 1 }} />
                {sel.length > 0 ? (
                  <>
                    <span style={{ fontSize: 14, fontWeight: 800, color: C.accent }}>{sel.length}개 선택</span>
                    <button type="button" onClick={() => setSel(shown.map((r) => r.dir))} style={tbtn(false)}>전체 선택</button>
                    <button type="button" onClick={() => setSel([])} style={tbtn(false)}>선택 풀기</button>
                    {b.project.trash && <button type="button" onClick={trashMany} style={{ ...tbtn(false), color: C.danger }}><Icon name="trash" size={15} />휴지통으로</button>}
                  </>
                ) : <>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 9, top: 8, color: C.dim, pointerEvents: "none" }}><Icon name="search" size={15} /></span>
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="프로젝트 검색" style={{ ...input, width: 200, height: 32, fontSize: 13.5, padding: "0 10px 0 30px" }} />
                </div>
                <div style={{ display: "flex", border: `1px solid ${C.line2}`, borderRadius: 5, overflow: "hidden" }}>
                  {(["grid", "list"] as const).map((v) => (
                    <button key={v} type="button" onClick={() => setViewMode(v)} title={v === "grid" ? "크게 보기" : "목록으로 보기"}
                      style={{ height: 30, padding: "0 10px", border: 0, background: view === v ? C.card : "transparent", color: view === v ? C.text : C.sub, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>{v === "grid" ? "▦ 크게" : "☰ 목록"}</button>
                  ))}
                </div>
                {b.project.trashList && <button type="button" onClick={openTrash} style={tbtn(false)}><Icon name="trash" size={15} />휴지통</button>}
                {b.project.folders && <button type="button" onClick={() => setFoldersOpen(true)} title="프로젝트·녹화·내보낸 영상을 저장할 폴더" style={tbtn(false)}><Icon name="folder" size={15} />저장 폴더</button>}
                </>}
              </>
            )}
          </div>
          {toast && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 12, borderRadius: 6, background: C.card, border: `1px solid ${C.line2}`, fontSize: 14 }}>
              <span style={{ flex: 1 }}>{toast.text}</span>
              {toast.undo && <button type="button" onClick={() => { const u = toast.undo!; setToast(null); u(); }} style={tbtn(false)}>되돌리기</button>}
            </div>
          )}
          {trashView ? (
            trash === null ? <div style={{ color: C.sub }}>불러오는 중…</div> : trash.length === 0 ? (
              <Hint>휴지통이 비어 있어요.</Hint>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Hint>[되살리기]를 누르면 원래 자리로 돌아가요. [영구 삭제]하면 되돌릴 수 없어요.</Hint>
                {trash.map((x) => (
                  <div key={x.id} onClick={() => toggle(tsel, setTsel, x.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: 8, borderRadius: 6, border: `1px solid ${tsel.includes(x.id) ? C.accent : C.line}`, background: C.card, cursor: "pointer" }}>
                    {check(tsel.includes(x.id), () => toggle(tsel, setTsel, x.id), true)}
                    <div style={{ width: 112, height: 63, flexShrink: 0, borderRadius: 4, overflow: "hidden", background: "#000" }}>{x.thumb && <img src={x.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0.6 }} />}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.name}</div>
                      <div style={{ fontSize: 13, color: C.sub, marginTop: 3 }}>{x.ratio} · {fmtTime(x.duration || 0, false)} · {new Date(x.deletedAt).toLocaleDateString("ko-KR")} 삭제</div>
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); restoreOne(x); }} style={tbtn(false)}><Icon name="undo" size={15} />되살리기</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); purgeOne(x); }} style={{ ...tbtn(false), color: C.danger }}><Icon name="trash" size={15} />영구 삭제</button>
                  </div>
                ))}
              </div>
            )
          ) : recent === null ? <div style={{ color: C.sub }}>불러오는 중…</div> : recent.length === 0 ? (
            <Hint>아직 만든 영상이 없어요. 위의 [새로 만들기]를 눌러 시작하세요.</Hint>
          ) : shown.length === 0 ? (
            <Hint>“{q}” 이름이 들어간 프로젝트가 없어요.</Hint>
          ) : view === "grid" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12 }}>
              {shown.slice(0, 48).map((r) => (
                <div key={r.dir} role="button" tabIndex={0} onClick={() => cardClick(r)} onKeyDown={(e) => e.key === "Enter" && cardClick(r)} onMouseEnter={() => setHoverDir(r.dir)} onMouseLeave={() => setHoverDir((d) => (d === r.dir ? "" : d))}
                  style={{ textAlign: "left", padding: 0, borderRadius: 6, border: `1px solid ${sel.includes(r.dir) ? C.accent : C.line}`, boxShadow: sel.includes(r.dir) ? `0 0 0 1px ${C.accent}` : "none", background: C.card, color: C.text, cursor: "pointer", fontFamily: FONT, overflow: "hidden" }}>
                  <div style={{ position: "relative", aspectRatio: "16 / 9", background: "#000" }}>
                    {r.thumb && <img src={r.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                    {check(sel.includes(r.dir), () => toggle(sel, setSel, r.dir), hoverDir === r.dir || sel.length > 0, { position: "absolute", left: 8, top: 8 })}
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    {nameRow(r)}
                    <div style={{ fontSize: 13, color: C.sub, marginTop: 3 }}>{r.ratio} · {fmtTime(r.duration || 0, false)} · {new Date(r.updatedAt).toLocaleDateString("ko-KR")}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {shown.map((r) => (
                <div key={r.dir} role="button" tabIndex={0} onClick={() => cardClick(r)} onKeyDown={(e) => e.key === "Enter" && cardClick(r)} onMouseEnter={() => setHoverDir(r.dir)} onMouseLeave={() => setHoverDir((d) => (d === r.dir ? "" : d))}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: 6, borderRadius: 6, border: `1px solid ${sel.includes(r.dir) ? C.accent : C.line}`, background: C.card, color: C.text, cursor: "pointer", fontFamily: FONT }}>
                  {check(sel.includes(r.dir), () => toggle(sel, setSel, r.dir), true)}
                  <div style={{ width: 96, height: 54, flexShrink: 0, borderRadius: 4, overflow: "hidden", background: "#000" }}>{r.thumb && <img src={r.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>{nameRow(r)}</div>
                  <span style={{ fontSize: 13, color: C.sub, flexShrink: 0, width: 210, textAlign: "right" }}>{r.ratio} · {fmtTime(r.duration || 0, false)} · {new Date(r.updatedAt).toLocaleDateString("ko-KR")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── 카메라 없음 알아채기 — 가상 카메라(OBS 등)는 켜져 있지 않으면 멈춘 그림만 보낸다. 1.5초 동안 한 점도 안 바뀌면 "카메라 없음" →
   미리보기·녹화 영상에 공실뉴스 로고 (2026-10-18 사장님). 진짜 웹캠은 늘 조금씩 바뀌어서 걸리지 않고, 가상 카메라를 골랐을 때만 본다 ── */
export const CAM_LOGO = "/studio-cam-logo.png"; // 공실뉴스 재생 로고 (앱 아이콘)
/**
 * "카메라 없음" 그림 — OBS 기본 그림과 같은 모양 (파란 사선 배경 + 가운데 동그라미 로고 + 아래 카메라 꺼짐), 로고만 공실뉴스 (2026-10-18 사장님)
 *  미리보기(<img>)와 녹화 캔버스가 같은 그림을 쓴다. 로고를 다 받으면 onReady
 */
let noCamCache: HTMLCanvasElement | null = null;
export function noCamCanvas(onReady?: (c: HTMLCanvasElement) => void): HTMLCanvasElement {
  if (noCamCache) return noCamCache;
  const c = document.createElement("canvas");
  c.width = 1280;
  c.height = 720;
  const g = c.getContext("2d")!;
  const paint = (logo?: HTMLImageElement) => {
    g.fillStyle = "#1b2559";
    g.fillRect(0, 0, 1280, 720);
    // 왼쪽 아래 → 오른쪽 위로 밝은 사선 띠
    g.fillStyle = "#2c3d86";
    g.beginPath();
    g.moveTo(0, 470);
    g.lineTo(1280, 300);
    g.lineTo(1280, 0);
    g.lineTo(0, 140);
    g.closePath();
    g.fill();
    // 가운데 로고 (동그라미)
    if (logo) g.drawImage(logo, 640 - 165, 300 - 165, 330, 330);
    // 카메라 꺼짐 표시
    g.save();
    g.translate(640, 560);
    g.fillStyle = "#cbd5e1";
    g.strokeStyle = "#cbd5e1";
    g.lineWidth = 10;
    g.lineJoin = "round";
    g.beginPath();
    g.roundRect?.(-62, -36, 92, 72, 8);
    g.fill();
    g.beginPath();
    g.moveTo(34, -10);
    g.lineTo(66, -32);
    g.lineTo(66, 32);
    g.lineTo(34, 10);
    g.closePath();
    g.fill();
    g.strokeStyle = "#1b2559";
    g.lineWidth = 16;
    g.beginPath();
    g.moveTo(-74, -54);
    g.lineTo(78, 54);
    g.stroke();
    g.strokeStyle = "#cbd5e1";
    g.lineWidth = 8;
    g.stroke();
    g.restore();
  };
  paint();
  const img = new Image();
  img.onload = () => {
    paint(img);
    onReady?.(c);
  };
  img.src = CAM_LOGO;
  noCamCache = c;
  return c;
}
export const isVirtualCam = (label?: string) => /virtual|가상|\bOBS\b|snap camera|xsplit|manycam|vcam|e2esoft|nvidia broadcast/i.test(label || "");
export function stillDetector() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 36;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  let prev: Uint8ClampedArray | null = null;
  let changed = performance.now();
  return (v: HTMLVideoElement | null): boolean => {
    if (!v || v.readyState < 2) return false;
    g.drawImage(v, 0, 0, 64, 36);
    const d = g.getImageData(0, 0, 64, 36).data;
    let diff = 0;
    if (prev) for (let i = 0; i < d.length; i += 4) diff += Math.abs(d[i] - prev[i]) + Math.abs(d[i + 1] - prev[i + 1]) + Math.abs(d[i + 2] - prev[i + 2]);
    const now = performance.now();
    if (!prev || diff > 6) changed = now;
    prev = d.slice();
    return now - changed > 1500;
  };
}

/* ── 새로 만들기 창 — 만들 방법 4가지 (사장님 확정) ── */
// 새로 만들기 = 3가지 (2026-10-20 사장님) — 롱폼→숏폼은 없앰, 녹화는 [강의/영상녹화] 메뉴에서만
export const METHODS: { id: Method; icon: string; title: string; desc: string }[] = [
  { id: "text", icon: "text", title: "대본 쓰고 편집하기", desc: "매물 소개·뉴스 기사·자유 주제로 대본을 먼저 쓰고, 직접 녹화하거나 AI 보이스로 만들어요" },
  { id: "video", icon: "video", title: "촬영한 영상으로 편집하기", desc: "찍은 영상이나 사진을 불러와 자르고, 자막·AI 목소리를 넣어요" },
  { id: "audio", icon: "mic", title: "녹음한 음성으로 편집하기", desc: "녹음 파일을 글로 받아 적고, 글자를 지우면 소리가 잘려요. 소리만 MP3로도" },
];

export function NewDialog({ onPick, onClose }: { onPick: (m: Method) => void; onClose: () => void }) {
  const last = (() => {
    try {
      return (localStorage.getItem("gsv:lastMethod") as Method) || "";
    } catch {
      return "";
    }
  })();
  const pick = (m: Method) => {
    try {
      localStorage.setItem("gsv:lastMethod", m);
    } catch {}
    onPick(m);
  };
  const lastM = METHODS.find((m) => m.id === last);
  return (
    <Modal title="새로 만들기" onClose={onClose} width={860}>
      <div style={{ padding: "18px 24px 26px" }}>
        {lastM && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 14, color: C.sub }}>최근 사용</span>
            <Btn small onClick={() => pick(lastM.id)}><Icon name={lastM.icon} size={16} />{lastM.title}</Btn>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          {METHODS.map((m) => (
            <button key={m.id} type="button" onClick={() => pick(m.id)}
              style={{ display: "flex", alignItems: "flex-start", gap: 16, textAlign: "left", padding: "24px 22px", borderRadius: 8, border: `1px solid ${C.line2}`, background: C.card, color: C.text, cursor: "pointer", fontFamily: FONT, minHeight: 130 }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.accent)} onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.line2)}>
              <span style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 8, border: `1.5px solid ${C.line2}`, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={m.icon} size={26} /></span>
              <span>
                <span style={{ display: "block", fontSize: 19, fontWeight: 800 }}>{m.title}</span>
                <span style={{ display: "block", fontSize: 15, color: C.sub, marginTop: 8, lineHeight: 1.55 }}>{m.desc}</span>
              </span>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 16 }}><Hint>만들 방법을 하나 누르세요. 다음 화면에서 화면 비율을 고를 수 있어요.</Hint></div>
      </div>
    </Modal>
  );
}

/* ── 화면 비율 고르기 (공통) ── */
export function RatioPick({ value, onChange }: { value: Ratio; onChange: (r: Ratio) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
      {(Object.keys(RATIO_LABEL) as Ratio[]).map((r) => {
        const [w, h] = r.split(":").map(Number);
        const s = 40 / Math.max(w, h);
        return (
          <button key={r} type="button" onClick={() => onChange(r)} style={{ height: 120, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 6, border: `1px solid ${value === r ? C.accent : C.line2}`, background: value === r ? C.accentDim : C.card, color: C.text, cursor: "pointer", fontFamily: FONT }}>
            <span style={{ width: w * s, height: h * s, border: `2px solid ${C.text}`, borderRadius: 2 }} />
            <span style={{ fontSize: 15, fontWeight: 800 }}>{r}</span>
            <span style={{ fontSize: 13, color: C.sub }}>{RATIO_LABEL[r]}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── 영상 고르기 (내 자료 + PC에서) — photos 면 사진도 같이 고르고 [공실 사진] 칸도 ── */
function VideoPicker({ multi, photos = false, picked, setPicked, onVacancy }: { multi: boolean; photos?: boolean; picked: LibItem[]; setPicked: (x: LibItem[]) => void; onVacancy?: (id: string) => void }) {
  const b = videoBridge()!;
  const [tab, setTab] = useState<"mine" | "vacancy">("mine");
  const [items, setItems] = useState<LibItem[] | null>(null);
  const [vacs, setVacs] = useState<{ id: string; label: string }[] | null>(null);
  const [vac, setVac] = useState("");
  const [vacItems, setVacItems] = useState<LibItem[] | null>(null);
  const [vacErr, setVacErr] = useState("");
  const okKind = (x: LibItem) => x.kind === "video" || (photos && x.kind === "image");
  const load = () => b.lib.list(photos ? {} : { kind: "video" }).then((r) => setItems(r.filter(okKind))).catch(() => setItems([]));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (tab !== "vacancy" || vacs) return;
    listMyStudioVacancies().then((r) => setVacs(r.success ? r.data.map((v) => ({ id: v.id, label: `[${v.trade_type || "-"}] ${v.building_name || v.property_type || "공실"} · ${v.address} · 사진 ${v.photoCount}장` })) : [])).catch(() => setVacs([]));
  }, [tab, vacs]);
  const chooseVac = (id: string) => {
    setVac(id);
    setVacItems(null);
    setVacErr("");
    if (!id) return;
    b.vacancy(id)
      .then((r) => {
        setVacItems(r.photos);
        onVacancy?.(id);
      })
      .catch((e) => {
        setVacErr(errText(e));
        setVacItems([]);
      });
  };
  const add = (xs: LibItem[]) => setPicked(multi ? [...picked, ...xs.filter((a) => !picked.some((p) => p.id === a.id))] : xs.slice(0, 1));
  const fromPc = async () => {
    const added = (await b.lib.pick()).filter(okKind);
    if (!added.length) return;
    add(added);
    load();
  };
  const toggle = (it: LibItem) => setPicked(picked.some((p) => p.id === it.id) ? picked.filter((p) => p.id !== it.id) : multi ? [...picked, it] : [it]);
  const what = photos ? "사진·영상" : "영상";
  const grid = (list: LibItem[]) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, maxHeight: 300, overflowY: "auto" }}>
      {list.map((it) => {
        const n = picked.findIndex((p) => p.id === it.id);
        return (
          <button key={it.id} type="button" onClick={() => toggle(it)} title={it.name} style={{ position: "relative", padding: 0, border: `2px solid ${n >= 0 ? C.accent : "transparent"}`, borderRadius: 4, background: "#000", cursor: "pointer", aspectRatio: "16 / 10", overflow: "hidden" }}>
            {(it.thumb || it.kind === "image") && <img src={it.thumb || it.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
            <span style={{ position: "absolute", left: 5, bottom: 4, display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#fff", background: "rgba(0,0,0,0.6)", padding: "1px 5px", borderRadius: 3 }}>
              <Icon name={it.kind === "image" ? "image" : "video"} size={12} />{it.kind === "image" ? "사진" : fmtTime(it.duration || 0, false)}
            </span>
            {/* 고른 순서 번호 — 이 순서대로 이어 붙인다 */}
            {n >= 0 && <span style={{ position: "absolute", right: 5, top: 5, minWidth: 22, height: 22, padding: "0 4px", borderRadius: 11, background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{multi ? n + 1 : <Icon name="check" size={14} stroke={2.4} />}</span>}
          </button>
        );
      })}
    </div>
  );
  const chip = (on: boolean): React.CSSProperties => ({ height: 38, padding: "0 16px", borderRadius: 6, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : C.card, color: C.text, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: FONT });
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Btn primary onClick={fromPc} style={{ height: 50, fontSize: 16 }}><Icon name="plus" size={18} />PC에서 {what} 불러오기</Btn>
        {photos && (
          <>
            <span style={{ width: 1, height: 28, background: C.line2, margin: "0 4px" }} />
            <button type="button" onClick={() => setTab("mine")} style={chip(tab === "mine")}>내 자료</button>
            <button type="button" onClick={() => setTab("vacancy")} style={chip(tab === "vacancy")}>공실 사진</button>
          </>
        )}
      </div>
      {picked.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, fontSize: 15 }}>
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>고른 {what} {picked.length}개: <b>{picked.map((p) => p.name).join(", ")}</b></span>
          {multi && <Btn small onClick={() => setPicked([])}>모두 빼기</Btn>}
        </div>
      )}
      {tab === "mine" ? (
        <>
          <div style={{ ...label, margin: "18px 0 8px" }}>내 자료의 {what}</div>
          {items === null ? <div style={{ color: C.sub }}>불러오는 중…</div> : !items.length ? <div style={{ color: C.sub, fontSize: 14 }}>아직 {what}이 없어요. [PC에서 {what} 불러오기]를 눌러 주세요.</div> : grid(items)}
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 8px" }}>
            <select value={vac} onChange={(e) => chooseVac(e.target.value)} style={{ ...input, flex: 1, fontSize: 15 }}>
              <option value="">{vacs === null ? "내 공실 불러오는 중…" : `공실을 고르세요 (${vacs.length}개)`}</option>
              {(vacs || []).map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
            {multi && vacItems && vacItems.length > 0 && <Btn small onClick={() => add(vacItems)}><Icon name="check" size={15} />사진 모두 고르기</Btn>}
          </div>
          {!vac ? <div style={{ color: C.sub, fontSize: 14 }}>공실을 고르면 그 공실 사진이 나와요.</div> : vacItems === null ? <div style={{ color: C.sub }}>공실 사진을 PC로 받는 중…</div> : vacErr ? <div style={{ color: C.danger, fontSize: 14 }}>{vacErr}</div> : !vacItems.length ? <div style={{ color: C.sub, fontSize: 14 }}>이 공실에는 사진이 없어요.</div> : grid(vacItems)}
        </>
      )}
    </div>
  );
}

/**
 * 사진·영상들 → 새 프로젝트 (고른 순서대로). 받아쓰기(AI 비용)는 하지 않는다.
 * 말소리 있는 영상은 통째로 한 클립, 사진·소리 없는 영상은 화면 클립 (편집 화면에서 끌어 놓을 때와 같은 규칙)
 */
async function importVideos(method: Method, ratio: Ratio, items: LibItem[], name: string, setWork: (w: { title: string; detail?: string; frac?: number | null }) => void, photoSec = 3, vacancyId = "", script = "", folder = ""): Promise<Project> {
  const b = videoBridge()!;
  const p = await b.project.create({ method, ratio, name, vacancyId, folder: folder || undefined });
  p.scenes = [];
  let shots: Clip[] | null = null; // 이어지는 사진·화면 클립은 한 묶음으로
  for (let i = 0; i < items.length; i++) {
    setWork({ title: `${items[i].kind === "image" ? "사진" : "영상"}을 준비하는 중… (${i + 1}/${items.length})`, detail: items[i].name });
    const off = b.onProgress((t, f) => setWork({ title: t, detail: items[i].name, frac: typeof f === "number" ? f : null }));
    try {
      const a = await b.project.addAsset(items[i].id);
      p.assets[a.id] = a;
      if (a.kind === "video" && a.hasAudio) {
        // 영상 통째로 한 클립 (전체 구간) — 앞뒤는 화면 메뉴 [시작·끝 자르기], 문장 나누기는 [자동 자막 만들기]가 한다
        const whole: Clip = { id: uid(), type: "source", text: "", words: [], src: { asset: a.id, s: 0, e: a.duration } };
        const clips: Clip[] = [whole];
        // 녹화 — 편집 화면을 열면 실제 말소리를 받아써서 문장마다 클립 (2026-10-20 사장님: 프롬프터 대본으로 나누면 실제 말과 어긋난다)
        //  대본은 받아쓰기 뒤 "거의 같은 낱말"만 고치는 데 쓴다 (숫자·다른 말·즉석 멘트는 그대로)
        if (method === "record" && i === 0) {
          p.autoSubOnOpen = true;
          if (script.trim()) p.recScript = script;
        }
        p.scenes.push({ id: uid(), title: items.length > 1 ? a.name : "", clips });
        shots = null;
      } else {
        if (!shots) {
          shots = [];
          p.scenes.push({ id: uid(), clips: shots });
        }
        shots.push({ id: uid(), type: "voice", text: "", words: [], voice: null, visual: { asset: a.id, s: 0 }, hold: a.kind === "video" ? a.duration || photoSec : photoSec });
      }
    } finally {
      off();
    }
  }
  if (!p.scenes.length) p.scenes = [{ id: uid(), clips: [] }];
  await b.project.save(p);
  return p;
}

/** 대본(프롬프터) → 영상 한 클립을 문장마다 나눈 클립들. 글은 대본 그대로, 단어 시각은 실제 말소리에 맞춘다 (b.realign, 무료) */
async function scriptClips(p: Project, whole: Clip, script: string): Promise<Clip[] | null> {
  const b = videoBridge()!;
  if (!b.realign || !whole.src) return null;
  const sents = splitScript(script).flat();
  const toks = sents.map((t) => t.split(/\s+/).filter(Boolean));
  const all = toks.flat();
  if (!all.length) return null;
  const { asset, s: S, e: E } = whole.src;
  const [r] = await b.realign(p, [{ id: whole.id, asset, s: S, e: E, text: all.join(" ") }]);
  if (!r || r.words.length !== all.length) return null;
  // 문장마다 단어를 나눠 담고, 클립 경계는 앞 문장 끝 ~ 다음 문장 시작 사이 (빈틈없이 이어진다)
  let k = 0;
  const groups = toks.map((t) => r.words.slice(k, (k += t.length)));
  const cut = groups.map((g, i) => (i === 0 ? S : Math.max(groups[i - 1][groups[i - 1].length - 1].e, g[0].s - 0.08)));
  return groups.map((g, i) => {
    const s = cut[i], e = i + 1 < groups.length ? cut[i + 1] : E;
    return { ...whole, id: i === 0 ? whole.id : uid(), sub: true, text: sents[i], src: { ...whole.src!, s, e }, words: g.map((w) => ({ ...w, s: Math.max(s, w.s), e: Math.min(e, w.e) })) };
  });
}

/* ── 오디오로 편집하기 (2026-10-20 사장님: 브루의 "오디오로 시작하기") ──
 *  녹음 파일(통화·강의·팟캐스트) → 파일마다 한 클립 → 편집 화면을 열면 바로 받아쓰기(Whisper, PC에서 무료)로 문장마다 클립
 *  → 글자를 지우면 그 소리가 잘린다 (영상 클립과 같은 부품). 화면은 검은 화면 또는 사진 한 장, 내보내기는 소리만(MP3)이 기본 */
export function AudioFlow({ onCancel, onDone }: { onCancel: () => void; onDone: (p: Project) => void }) {
  const b = videoBridge()!;
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<LibItem[]>([]);
  const [photo, setPhoto] = useState<LibItem | null>(null);
  const [ratio, setRatio] = useState<Ratio>("16:9");
  const [sub, setSub] = useState(true);
  const [projName, setProjName] = useState("무제");
  const [folder, setFolder] = useState("");
  const [work, setWork] = useState<{ title: string; detail?: string; frac?: number | null } | null>(null);
  const [err, setErr] = useState("");
  const addFiles = async () => {
    setErr("");
    try {
      const r = await b.lib.pick({ kinds: "audio" });
      const add = r.filter((x) => x.kind === "audio" && !picked.some((y) => y.id === x.id));
      if (!add.length) return;
      const next = [...picked, ...add];
      setPicked(next);
      if (projName === "무제") setProjName(next[0].name.replace(/\.[^.]+$/, ""));
    } catch (e) {
      setErr(errText(e));
    }
  };
  const pickPhoto = async () => {
    try {
      const r = await b.lib.pick({ kinds: "media" });
      const img = r.find((x) => x.kind === "image");
      if (img) setPhoto(img);
      else if (r.length) setErr("사진(그림 파일)을 골라 주세요.");
    } catch (e) {
      setErr(errText(e));
    }
  };
  const go = async () => {
    setErr("");
    try {
      setWork({ title: "프로젝트를 만드는 중…" });
      const p = await b.project.create({ method: "audio", ratio, name: projName.trim(), folder: folder || undefined });
      let bg: string | undefined;
      if (photo) {
        const a = await b.project.addAsset(photo.id);
        p.assets[a.id] = a;
        bg = a.id;
      }
      p.scenes = [];
      for (let i = 0; i < picked.length; i++) {
        setWork({ title: `소리 파일을 준비하는 중… (${i + 1}/${picked.length})`, detail: picked[i].name });
        const a = await b.project.addAsset(picked[i].id);
        p.assets[a.id] = a;
        const c: Clip = { id: uid(), type: "source", text: "", words: [], src: { asset: a.id, s: 0, e: a.duration } };
        if (bg) c.visual = { asset: bg, s: 0 };
        p.scenes.push({ id: uid(), title: picked.length > 1 ? a.name : "", clips: [c] });
      }
      if (!p.scenes.length) p.scenes = [{ id: uid(), clips: [] }];
      p.settings.subtitle = { ...p.settings.subtitle, on: true };
      if (sub) p.autoSubOnOpen = true;
      await b.project.save(p);
      onDone(p);
    } catch (e) {
      setErr(errText(e));
      setWork(null);
    }
  };
  if (work) return <Modal title=""><Working title={work.title} detail={work.detail} frac={work.frac ?? null} /></Modal>;
  const total = picked.reduce((a, x) => a + (x.duration || 0), 0);
  const chip = (on: boolean): React.CSSProperties => ({ height: 46, padding: "0 18px", borderRadius: 6, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : C.card, color: C.text, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: FONT });
  return (
    <Modal steps={["소리 파일 고르기", "설정"]} step={step} onClose={onCancel} width={820}
      footer={<>{step > 0 && <Btn onClick={() => setStep(0)}>이전</Btn>}{step === 0 ? <Btn primary disabled={!picked.length} onClick={() => setStep(1)}>다음 <Icon name="chevron" size={16} /></Btn> : <Btn primary onClick={go}>편집 시작 <Icon name="chevron" size={16} /></Btn>}</>}>
      <div style={{ padding: "20px 26px" }}>
        {step === 0 ? (
          <>
            <Btn primary onClick={addFiles} style={{ width: "100%", justifyContent: "center", height: 48 }}><Icon name="plus" size={18} />PC에서 소리 파일 불러오기 (mp3 · wav · m4a …)</Btn>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14 }}>
              {picked.map((x, i) => (
                <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.line2}`, background: C.card }}>
                  <span style={{ width: 24, color: C.sub, fontWeight: 800 }}>{i + 1}</span>
                  <Icon name="music" size={18} />
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14.5, fontWeight: 700 }}>{x.name}</span>
                  <span style={{ color: C.sub, fontSize: 13.5 }}>{x.duration ? fmtTime(x.duration, false) : ""}</span>
                  <button type="button" title="빼기" onClick={() => setPicked(picked.filter((y) => y.id !== x.id))} style={{ border: 0, background: "transparent", color: C.sub, cursor: "pointer", fontSize: 18 }}>×</button>
                </div>
              ))}
              {!picked.length && <div style={{ padding: "26px 0", textAlign: "center", color: C.sub, fontSize: 14.5 }}>통화 녹음 · 강의 · 팟캐스트 · 회의 녹음 파일을 불러오세요. 여러 개면 순서대로 이어 붙여요.</div>}
              {picked.length > 0 && <div style={{ color: C.sub, fontSize: 13.5 }}>{picked.length}개 · 모두 {fmtTime(total, false)}</div>}
            </div>
            <div style={{ marginTop: 14 }}><Hint>소리 파일은 PC에 그대로 두고 편집해요 (올리지 않아요). 받아쓰기도 이 PC에서 해요 (무료).</Hint></div>
          </>
        ) : (
          <>
            <SaveAsFields name={projName} setName={setProjName} folder={folder} setFolder={setFolder} />
            <div style={{ fontSize: 18, fontWeight: 800, margin: "4px 0 12px" }}>화면은 어떻게 할까요?</div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button type="button" onClick={() => setPhoto(null)} style={chip(!photo)}>검은 화면 (소리 위주)</button>
              <button type="button" onClick={pickPhoto} style={chip(Boolean(photo))}>{photo ? `사진: ${photo.name}` : "사진 한 장 깔기…"}</button>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, margin: "22px 0 12px" }}>화면 비율</div>
            <RatioPick value={ratio} onChange={setRatio} />
            <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              <Toggle on={sub} onChange={setSub} />
              열자마자 받아쓰기 — 문장마다 클립으로 나누고 자막을 만들어요 (PC에서, 무료)
            </label>
            <div style={{ marginTop: 14 }}><Hint>편집 화면에서 글자를 지우면 그 소리가 잘려요. [무음 구간 줄이기]로 말 사이 침묵도 정리할 수 있어요. 다 고치면 [내보내기 › 소리만 (MP3)]로 저장하세요.</Hint></div>
          </>
        )}
        {err && <div style={{ marginTop: 12, color: C.danger, fontSize: 14.5 }}>{err}</div>}
      </div>
    </Modal>
  );
}

/* ── 사진·영상으로 편집하기 (녹화하고 바로 편집하기도 여기로) ── */
export function VideoFlow({ method = "video", preset, script = "", onCancel, onDone }: { method?: Method; preset?: LibItem[]; script?: string; onCancel: () => void; onDone: (p: Project) => void }) {
  const b = videoBridge()!;
  const [step, setStep] = useState(preset?.length ? 1 : 0);
  const [picked, setPicked] = useState<LibItem[]>(preset || []);
  const [ratio, setRatio] = useState<Ratio>(() => {
    const v = preset?.[0];
    return v && v.height > v.width ? "9:16" : "16:9";
  });
  const [work, setWork] = useState<{ title: string; detail?: string; frac?: number | null } | null>(null);
  const [err, setErr] = useState("");
  const [photoSec, setPhotoSec] = useState(3);
  const [vacancyId, setVacancyId] = useState("");
  const [projName, setProjName] = useState("무제");
  const [folder, setFolder] = useState("");
  const photos = method === "video";
  const hasPhoto = picked.some((x) => x.kind === "image");
  // 화면 비율은 첫 번째 파일 모양에 맞춰 미리 골라 둔다 (세로면 9:16)
  const pick = (x: LibItem[]) => {
    setPicked(x);
    if (x[0]) setRatio(x[0].height > x[0].width ? "9:16" : "16:9");
  };
  const go = async () => {
    setErr("");
    try {
      const p = await importVideos(method, ratio, picked, projName.trim(), (w) => setWork(w), photoSec, vacancyId, script, folder);
      onDone(p);
    } catch (e) {
      setErr(errText(e));
      setWork(null);
    }
  };
  if (work) return <Modal title=""><Working title={work.title} detail={work.detail} frac={work.frac ?? null} /></Modal>;
  return (
    <Modal steps={[photos ? "사진·영상 고르기" : "영상 고르기", "화면 비율"]} step={step} onClose={onCancel} width={900}
      footer={<>{step > 0 && <Btn onClick={() => setStep(0)}>이전</Btn>}{step === 0 ? <Btn primary disabled={!picked.length} onClick={() => setStep(1)}>다음 <Icon name="chevron" size={16} /></Btn> : <Btn primary onClick={go}>편집 시작 <Icon name="chevron" size={16} /></Btn>}</>}>
      <div style={{ padding: "20px 26px" }}>
        {step === 0 ? (
          <>
            <VideoPicker multi photos={photos} picked={picked} setPicked={pick} onVacancy={setVacancyId} />
            <div style={{ marginTop: 14 }}><Hint>{photos ? "사진·영상은 PC에 그대로 두고 편집해요 (올리지 않아요). 여러 개를 고르면 고른 순서(번호)대로 이어 붙여요." : "영상은 PC에 그대로 두고 편집해요 (올리지 않아요). 여러 개를 고르면 차례로 이어 붙여요."}</Hint></div>
          </>
        ) : (
          <>
            {/* 방금 녹화한 파일 — 어디에 저장됐는지 보여 주고 바로 열어 볼 수 있게 (이 창을 닫아도 파일은 남는다) */}
            {method === "record" && picked[0] && (() => {
              const f = picked[0];
              const parts = (f.path || "").split(/[\\/]/);
              parts.pop(); // 파일 이름 빼고 폴더만
              const dir = parts.join("\\");
              const di = parts.findIndex((x) => /^(documents|문서)$/i.test(x)); // "C:\Users\이름\Documents\…" → "문서 › …"
              const shown = (di >= 0 ? ["문서", ...parts.slice(di + 1)] : parts).filter(Boolean).join(" › ");
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", marginBottom: 18, borderRadius: 6, border: `1px solid ${C.line2}`, background: C.card }}>
                  <Icon name="check" size={20} color="#22c55e" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 800 }}>녹화를 저장했어요 <span style={{ color: C.sub, fontWeight: 600 }}>· {f.name}{f.duration ? ` (${fmtTime(f.duration, false)})` : ""}</span></div>
                    <div title={dir} style={{ fontSize: 13, color: C.sub, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shown || "PC"} · 이 창을 닫아도 파일은 폴더에 그대로 남아요</div>
                  </div>
                  <Btn small onClick={() => b.showFile(f.path || f.url)}><Icon name="folder" size={15} />폴더에서 보기</Btn>
                  <Btn small onClick={() => b.openPath(f.path || f.url)}><Icon name="play" size={15} />바로 재생</Btn>
                </div>
              );
            })()}
            <SaveAsFields name={projName} setName={setProjName} folder={folder} setFolder={setFolder} />
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>어떤 화면 비율로 만들까요?</div>
            <RatioPick value={ratio} onChange={setRatio} />
            {hasPhoto && (
              <div style={{ marginTop: 22 }}>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>사진 한 장을 몇 초 보여 줄까요?</div>
                <div style={{ display: "flex", gap: 10 }}>
                  {[2, 3, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setPhotoSec(n)} style={{ width: 110, height: 52, borderRadius: 6, border: `1px solid ${photoSec === n ? C.accent : C.line2}`, background: photoSec === n ? C.accentDim : C.card, color: C.text, fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: FONT }}>{n}초</button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginTop: 16 }}><Hint>{hasPhoto ? "사진은 한 장씩 클립이 돼요. 클립에 글을 쓰면 AI 목소리로 읽어 주고, 시간은 편집 화면에서 바꿀 수 있어요." : "영상 전체가 한 클립으로 들어가요. 앞뒤 자르기·무음 줄이기·자동 자막은 편집 화면에서 할 수 있어요."}</Hint></div>
          </>
        )}
        {err && <div style={{ marginTop: 12, color: C.danger, fontSize: 14.5 }}>{err}</div>}
      </div>
    </Modal>
  );
}

/**
 * 새 프로젝트 — 이름 · 위치 · 파일 형식 (프리미어 [새 프로젝트] 처럼, 2026-10-19 사장님)
 *  이름을 비우면 "무제", 위치는 [찾아보기]로 바꾼다 (기본: 저장 폴더 설정의 프로젝트 폴더). 같은 이름이 있으면 _2
 */
export function SaveAsFields({ name, setName, folder, setFolder, note, compact }: { name: string; setName: (v: string) => void; folder: string; setFolder: (v: string) => void; /** 파일 형식 줄 설명 (없으면 "이름.gss 로 저장돼요") */ note?: string; /** 좁은 칸 (텍스트로 영상 설정 칸) */ compact?: boolean }) {
  const b = videoBridge()!;
  const [dflt, setDflt] = useState("");
  useEffect(() => {
    b.project.defaultDir?.().then(setDflt).catch(() => {});
  }, [b]);
  const shown = folder || dflt;
  const row: React.CSSProperties = { display: "grid", gridTemplateColumns: compact ? "70px 1fr auto" : "92px 1fr auto", gap: compact ? 8 : 10, alignItems: "center" };
  const lab: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: C.sub };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px", marginBottom: 20, borderRadius: 8, border: `1px solid ${C.line2}`, background: C.card }}>
      <div style={row}>
        <span style={lab}>프로젝트 이름</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="무제" maxLength={60} onKeyDown={(e) => e.stopPropagation()}
          onFocus={(e) => { if (e.target.value === "무제") e.target.select(); }} style={{ ...input, height: 38, border: `2px solid ${C.accent}`, boxShadow: "0 0 0 3px rgba(59,130,246,0.18)" }} />
        <span />
      </div>
      {(b.project.defaultDir || folder) && (
        <div style={row}>
          <span style={lab}>위치</span>
          <div title={shown} style={{ ...input, height: 38, display: "flex", alignItems: "center", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", color: shown ? C.text : C.dim }}>{shown || "기본 폴더"}</div>
          {b.project.pickFolder && <Btn small onClick={async () => { const d = await b.project.pickFolder!("프로젝트를 저장할 폴더", shown || undefined); if (d) setFolder(d); }}><Icon name="folder" size={15} />찾아보기…</Btn>}
        </div>
      )}
      <div style={row}>
        <span style={lab}>파일 형식</span>
        <span style={{ fontSize: 14, color: C.text }}>공실뉴스 스튜디오 (*.gss) <span style={{ color: C.dim, fontSize: 12.5 }}>· {note || `${(name.trim() || "무제").replace(/[\\/:*?"<>|]/g, "_")}.gss 로 저장돼요 (같은 이름이 있으면 _2)`}</span></span>
        <span />
      </div>
    </div>
  );
}

/** 카메라·마이크 고르는 칸 옆 [설정] — 누르면 윈도우 장치 설정이 바로 열린다 (옛 앱은 권한 화면) */
export function SettingsBtn({ what, onOpen }: { what: "camera" | "microphone"; onOpen: (w: "camera" | "microphone") => void }) {
  const b = videoBridge()!;
  const open = b.openDeviceSettings || b.openSettings;
  if (!open) return null;
  const name = what === "camera" ? "카메라" : "마이크";
  return (
    <button type="button" onClick={() => { void open(what); onOpen(what); }} title={`윈도우 ${name} 설정을 열어요 (${what === "camera" ? "밝기·대비, 쓸 카메라" : "쓸 마이크, 소리 크기, 마이크 테스트"})`}
      aria-label={`${name} 설정`}
      onMouseEnter={(e) => { e.currentTarget.style.background = C.cardHover; e.currentTarget.style.borderColor = C.sub; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = C.card; e.currentTarget.style.borderColor = C.line2; }}
      style={{ width: 42, height: 42, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 0, borderRadius: 8, border: `1px solid ${C.line2}`, background: C.card, color: C.text, cursor: "pointer" }}>
      {/* 글자 없이 아이콘만 (사장님 2026-10-17) — 이름은 마우스를 올리면 */}
      <Icon name="winGear" size={22} stroke={1.5} />
    </button>
  );
}

/** [설정]을 누른 뒤 — 무엇을 하면 되는지 한 줄 안내 */
export function SettingsNote({ what }: { what: "camera" | "microphone" }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 8, marginBottom: 8, padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.line2}`, background: C.card, fontSize: 14, lineHeight: 1.6 }}>
      <Icon name="info" size={17} />
      <span>
        {what === "camera"
          ? <>윈도우 <b>카메라 설정</b> 창이 열렸어요. 카메라 이름을 누르면 <b>밝기·대비</b>를 바꿀 수 있어요.</>
          : <>윈도우 <b>소리 설정</b> 창이 열렸어요. 아래 <b>입력</b>에서 쓸 마이크와 <b>소리 크기</b>를 바꿀 수 있어요.</>}
        {" "}다 고치고 이 창으로 돌아오면 저절로 다시 잡아요.
      </span>
    </div>
  );
}

/** 마이크 소리 크기 막대 — 말하면 움직인다 (녹화 전·녹화 중 모두). 너무 크면 노랑·빨강 */
export function MicMeter({ deviceId, gain = 1, auto = true }: { deviceId: string; gain?: number; auto?: boolean }) {
  const [level, setLevel] = useState(0); // 0~1
  const [err, setErr] = useState("");
  const gainRef = useRef(gain);
  useEffect(() => {
    gainRef.current = gain;
  }, [gain]);
  useEffect(() => {
    let dead = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    navigator.mediaDevices
      .getUserMedia({ audio: deviceId ? { deviceId: { exact: deviceId }, autoGainControl: auto } : { autoGainControl: auto }, video: false })
      .then((st) => {
        if (dead) return st.getTracks().forEach((t) => t.stop());
        stream = st;
        ctx = new AudioContext();
        const an = ctx.createAnalyser();
        an.fftSize = 1024;
        ctx.createMediaStreamSource(st).connect(an);
        const buf = new Float32Array(an.fftSize);
        let shown = 0;
        const tick = () => {
          an.getFloatTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
          const rms = Math.sqrt(sum / buf.length) * gainRef.current;
          // dB(-60~0) → 0~1, 올라갈 땐 바로 내려갈 땐 천천히
          const v = Math.max(0, Math.min(1, (20 * Math.log10(rms || 1e-6) + 60) / 60));
          shown = v > shown ? v : shown * 0.92 + v * 0.08;
          setLevel(shown);
          raf = requestAnimationFrame(tick);
        };
        tick();
        setErr("");
      })
      .catch(() => setErr("마이크 소리를 받을 수 없어요"));
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close().catch(() => {});
    };
  }, [deviceId, auto]);
  const color = level > 0.9 ? C.danger : level > 0.75 ? "#eab308" : "#22c55e";
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="mic" size={16} color={level > 0.05 ? color : C.dim} />
        <div style={{ flex: 1, height: 10, borderRadius: 5, background: C.panel2, overflow: "hidden", border: `1px solid ${C.line}` }}>
          <div style={{ width: `${Math.round(level * 100)}%`, height: "100%", background: color, transition: "width 60ms linear" }} />
        </div>
      </div>
      <div style={{ fontSize: 12, color: err ? C.danger : C.dim, marginTop: 4 }}>
        {err || (level < 0.05 ? "말해 보세요 — 막대가 움직이면 마이크가 잘 들려요" : level > 0.9 ? "소리가 너무 커요. 마이크에서 조금 떨어져 주세요" : "마이크가 잘 들려요")}
      </div>
    </div>
  );
}

/* ── 롱폼으로 자동 숏폼 만들기 ── */
export function LongformFlow({ onCancel, onDone }: { onCancel: () => void; onDone: (p: Project) => void }) {
  const b = videoBridge()!;
  const writer = useStudioWriter();
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<LibItem[]>([]);
  const [count, setCount] = useState(3);
  const [maxSec, setMaxSec] = useState(60);
  const [ratio, setRatio] = useState<Ratio>("9:16");
  const [projName, setProjName] = useState("무제");
  const [folder, setFolder] = useState("");
  const [request, setRequest] = useState("");
  const [work, setWork] = useState<{ title: string; detail?: string; frac?: number | null } | null>(null);
  const [err, setErr] = useState("");
  const [src, setSrc] = useState<Project | null>(null);
  const [shorts, setShorts] = useState<{ title: string; start: number; end: number; reason: string; on: boolean }[]>([]);

  const find = async () => {
    setErr("");
    try {
      // 받아쓰기(AI 비용) 없이 — 말소리 구간으로만 나눠 바로 편집 화면으로.
      // 볼만한 구간 자동 고르기(AI)는 나중에 받아쓰기 단추와 함께 (setSrc·setShorts 는 그때 다시 쓴다)
      const p = await importVideos("longform", ratio, picked.slice(0, 1), picked[0].name.replace(/\.[^.]+$/, ""), (w) => setWork(w), 3, "", "", folder);
      setWork(null);
      onDone(p);
      return;
    } catch (e) {
      setErr(errText(e));
    }
    setWork(null);
  };

  const make = async () => {
    if (!src) return;
    const chosen = shorts.filter((s) => s.on);
    let first: Project | null = null;
    try {
      for (let i = 0; i < chosen.length; i++) {
        const s = chosen[i];
        setWork({ title: `숏폼 만드는 중… (${i + 1}/${chosen.length})`, detail: s.title });
        // 이름을 정했으면 "이름_숏폼 제목", 아니면 숏폼 제목 — 모두 [위치] 폴더에
        const nm = projName.trim() && projName.trim() !== "무제" ? `${projName.trim()}_${s.title}` : s.title;
        const p = await b.project.create({ method: "longform", ratio, name: nm, folder: folder || undefined });
        p.assets = src.assets;
        p.settings.subtitle = { ...p.settings.subtitle, length: "short", maxLines: 1, position: ratio === "9:16" ? "middle-low" : "bottom" };
        const clips: Clip[] = [];
        for (const c of src.scenes.flatMap((x) => x.clips)) {
          if (!c.src || c.src.e <= s.start || c.src.s >= s.end) continue;
          const cc: Clip = structuredClone(c);
          cc.id = uid();
          cc.src = { ...c.src, s: Math.max(c.src.s, s.start), e: Math.min(c.src.e, s.end) };
          if (cc.words) cc.words = cc.words.filter((w) => w.e > cc.src!.s && w.s < cc.src!.e);
          if (cc.src.e - cc.src.s > 0.2) clips.push(cc);
        }
        p.scenes = [{ id: uid(), title: s.title, clips }];
        await b.project.save(p);
        if (!first) first = p;
      }
      if (first) onDone(first);
    } catch (e) {
      setErr(errText(e));
      setWork(null);
    }
  };

  if (work) return <Modal title=""><Working title={work.title} detail={work.detail} frac={work.frac ?? null} /></Modal>;
  return (
    <Modal steps={["긴 영상 고르기", "숏폼 설정", "구간 고르기"]} step={step} onClose={onCancel} width={900}
      footer={
        <>
          {step > 0 && step < 2 && <Btn onClick={() => setStep(step - 1)}>이전</Btn>}
          {step === 0 && <Btn primary disabled={!picked.length} onClick={() => setStep(1)}>다음 <Icon name="chevron" size={16} /></Btn>}
          {step === 1 && <Btn primary onClick={find}>숏폼 구간 찾기 <Icon name="chevron" size={16} /></Btn>}
          {step === 2 && <Btn primary disabled={!shorts.some((s) => s.on)} onClick={make}>고른 숏폼 만들기 ({shorts.filter((s) => s.on).length}개)</Btn>}
        </>
      }>
      <div style={{ padding: "20px 26px" }}>
        {step === 0 && <VideoPicker multi={false} picked={picked} setPicked={setPicked} />}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <SaveAsFields name={projName} setName={setProjName} folder={folder} setFolder={setFolder}
              note={projName.trim() && projName.trim() !== "무제" ? `숏폼마다 "${projName.trim()}_숏폼 제목.gss" 로 저장돼요` : "숏폼마다 숏폼 제목.gss 로 저장돼요 (원본 영상 프로젝트도 같은 폴더에)"} />
            <div>
              <div style={{ ...label, marginBottom: 8 }}>몇 개 만들까요?</div>
              <div style={{ display: "flex", gap: 8 }}>{[1, 2, 3, 4, 5].map((n) => <Btn key={n} small primary={count === n} onClick={() => setCount(n)}>{n}개</Btn>)}</div>
            </div>
            <div>
              <div style={{ ...label, marginBottom: 8 }}>한 개 길이 (최대)</div>
              <div style={{ display: "flex", gap: 8 }}>{[30, 45, 60, 90].map((n) => <Btn key={n} small primary={maxSec === n} onClick={() => setMaxSec(n)}>{n}초</Btn>)}</div>
            </div>
            <div>
              <div style={{ ...label, marginBottom: 8 }}>화면 비율</div>
              <RatioPick value={ratio} onChange={setRatio} />
            </div>
            <div>
              <div style={{ ...label, marginBottom: 8 }}>요청 <span style={{ color: C.dim, fontWeight: 600 }}>(선택)</span></div>
              <input value={request} onChange={(e) => setRequest(e.target.value)} placeholder="예: 투자 팁이 나오는 부분 위주로" style={input} />
            </div>
            <Hint>영상 말소리를 글로 바꾼 뒤 {writer}가 볼만한 구간을 골라요. 소리만 보내고 영상은 PC에 그대로 있어요.</Hint>
          </div>
        )}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {shorts.map((s, i) => (
              <label key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", borderRadius: 6, border: `1px solid ${s.on ? C.accent : C.line2}`, background: C.card, cursor: "pointer" }}>
                <input type="checkbox" checked={s.on} onChange={() => setShorts(shorts.map((x, k) => (k === i ? { ...x, on: !x.on } : x)))} style={{ width: 20, height: 20, marginTop: 2, accentColor: C.accent }} />
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: 16.5, fontWeight: 800 }}>{s.title}</span>
                  <span style={{ display: "block", fontSize: 14, color: C.sub, marginTop: 4 }}>{fmtTime(s.start, false)} ~ {fmtTime(s.end, false)} ({Math.round(s.end - s.start)}초) · {s.reason}</span>
                </span>
              </label>
            ))}
            {!shorts.length && <div style={{ color: C.sub }}>알맞은 구간을 찾지 못했어요. 이전으로 가서 다시 해 보세요.</div>}
          </div>
        )}
        {err && <div style={{ marginTop: 12, color: C.danger, fontSize: 14.5 }}>{err}</div>}
      </div>
    </Modal>
  );
}

/* ── 영상 녹화하고 바로 편집하기 ── */
// 화면 + 카메라의 카메라 — 녹화 캔버스(1920×1080) 기준 가운데(cx, cy)·반지름(r, 사각형은 한 변의 절반), 모양, 테두리 두께(line)·색(color)
// 배치(layout) — pip: 화면 위에 작은 카메라, lr: 좌우 반반, tb: 상하 반반. swap: 반반일 때 화면·카메라 자리 바꾸기
// sx·sy·sz — 반반일 때 화면 칸에 보일 곳 (0 = 왼쪽/위 끝, 0.5 = 가운데, 1 = 오른쪽/아래 끝)·확대 (1 = 칸을 꽉 채운 크기)
export type CamBox = { cx: number; cy: number; r: number; shape: "circle" | "square"; line: number; color: string; layout: "pip" | "lr" | "tb"; swap: boolean; sx: number; sy: number; sz: number };
export const CAM_DEFAULT: CamBox = { cx: 1920 - 210, cy: 1080 - 210, r: 170, shape: "circle", line: 6, color: "#ffffff", layout: "pip", swap: false, sx: 0.5, sy: 0.5, sz: 1 };
const clamp01 = (v: unknown, d = 0.5) => (typeof v === "number" && isFinite(v) ? Math.min(1, Math.max(0, v)) : d);
/** 반반 화면 칸 — 화면을 그릴 네모 (칸보다 크면 칸 밖은 잘린다). 녹화 캔버스와 미리보기가 같은 계산 */
export const panRect = (cell: Rect, vw: number, vh: number, b: CamBox): Rect => {
  const [X, Y, W, H] = cell;
  const k = Math.max(W / vw, H / vh) * b.sz;
  const dw = vw * k, dh = vh * k;
  return [X + (W - dw) * b.sx, Y + (H - dh) * b.sy, dw, dh];
};
export type Rect = [number, number, number, number]; // x, y, 너비, 높이 (캔버스 px)
export const splitRects = (b: CamBox): { scr: Rect; cam: Rect } | null => {
  if (b.layout === "pip") return null;
  const a: Rect = b.layout === "lr" ? [0, 0, 960, 1080] : [0, 0, 1920, 540];
  const c: Rect = b.layout === "lr" ? [960, 0, 960, 1080] : [0, 540, 1920, 540];
  return b.swap ? { scr: c, cam: a } : { scr: a, cam: c };
};
const rectPct = (r: Rect) => ({ left: `${(r[0] / 1920) * 100}%`, top: `${(r[1] / 1080) * 100}%`, width: `${(r[2] / 1920) * 100}%`, height: `${(r[3] / 1080) * 100}%` });
const CAM_ROUND = 24; // 사각형 모서리 둥글기
export const CAM_COLORS = ["#ffffff", "#000000", "#22c55e", "#3b82f6", "#ef4444", "#facc15"];
export const fitCamBox = (b: CamBox): CamBox => {
  const r = Math.round(Math.min(400, Math.max(80, b.r)));
  return {
    r,
    cx: Math.round(Math.min(1920 - r, Math.max(r, b.cx))),
    cy: Math.round(Math.min(1080 - r, Math.max(r, b.cy))),
    shape: b.shape === "square" ? "square" : "circle",
    line: Math.round(Math.min(30, Math.max(0, b.line))),
    color: /^#[0-9a-f]{6}$/i.test(b.color) ? b.color : CAM_DEFAULT.color,
    layout: b.layout === "lr" || b.layout === "tb" ? b.layout : "pip",
    swap: !!b.swap,
    sx: clamp01(b.sx),
    sy: clamp01(b.sy),
    sz: typeof b.sz === "number" && isFinite(b.sz) ? Math.min(3, Math.max(1, b.sz)) : 1,
  };
};
// 테두리는 안쪽으로 그려서 미리보기(CSS 테두리)와 크기가 같게
export const camPath = (g: CanvasRenderingContext2D, b: CamBox, inset: number) => {
  const r = b.r - inset;
  g.beginPath();
  if (b.shape === "circle") g.arc(b.cx, b.cy, r, 0, Math.PI * 2);
  else g.roundRect(b.cx - r, b.cy - r, r * 2, r * 2, Math.max(0, CAM_ROUND - inset));
};

/* ── 프롬프터 (뉴스 방송처럼) — 녹화 창에서 대본을 넣으면 녹화할 때 녹화하는 모니터 위쪽에 대본 창이 뜬다 (녹화에 안 찍힘).
   녹화가 끝나면 대본이 그대로 자막 글이 된다 (시각은 PC에서 말소리에 맞춤, 무료) ── */
/** cps = 1초에 읽는 글자 수 (3~8, 보통 5) · size = 프롬프터 글자 px (28~96) · mine = 프롬프터 창에서 [저장]한 내 설정 */
export type Prompter = { on: boolean; text: string; size: number; cps: number; opacity: number; mine: { cps: number; size: number } | null };
// 프롬프터 바탕 진하기 (0 = 바탕 없음 ~ 1 = 꽉 참) — 글자는 늘 선명
const clampOpacity = (v: number) => (Number.isFinite(Number(v)) ? Math.min(1, Math.max(0, Number(v))) : 1);
const OLD_SIZE: Record<string, number> = { s: 40, m: 52, l: 66 };
const OLD_CPS: Record<string, number> = { slow: 4, mid: 5, fast: 6 };
const PROMPTER_KEY = "gsv:prompter";
export const clampCps = (v: number) => Math.min(8, Math.max(3, Math.round(v * 2) / 2));
export const clampSize = (v: number) => Math.min(96, Math.max(28, Math.round(v / 2) * 2));
export function loadPrompter(): Prompter {
  try {
    const v = JSON.parse(localStorage.getItem(PROMPTER_KEY) || "null");
    if (v && typeof v.text === "string")
      return {
        on: v.on !== false,
        text: v.text,
        size: clampSize(typeof v.size === "number" ? v.size : OLD_SIZE[v.size] || 52),
        cps: clampCps(typeof v.cps === "number" ? v.cps : OLD_CPS[v.speed] || 5),
        opacity: clampOpacity(v.opacity ?? 1),
        mine: v.mine && typeof v.mine.cps === "number" ? { cps: clampCps(v.mine.cps), size: clampSize(v.mine.size) } : null,
      };
  } catch {}
  return { on: true, text: "", size: 52, cps: 5, opacity: 1, mine: null };
}
export function savePrompter(p: Prompter) {
  try {
    localStorage.setItem(PROMPTER_KEY, JSON.stringify(p));
  } catch {}
}
const PROMPTER_LEN = [[30, "30초"], [60, "1분"], [120, "2분"], [180, "3분"]] as const;

export function PrompterPanel({ value, onChange, disabled, rehearsing, onRehearse }: { value: Prompter; onChange: (p: Prompter) => void; disabled: boolean; rehearsing: boolean; onRehearse: () => void }) {
  const b = videoBridge()!;
  const writer = useStudioWriter();
  const [ai, setAi] = useState<"" | "topic" | "vacancy">("");
  const [topic, setTopic] = useState("");
  const [len, setLen] = useState(60);
  const [vacs, setVacs] = useState<{ id: string; label: string }[] | null>(null);
  const [vac, setVac] = useState("");
  const [writing, setWriting] = useState("");
  const [err, setErr] = useState("");
  const set = (patch: Partial<Prompter>) => {
    const p = { ...value, ...patch };
    savePrompter(p);
    onChange(p);
  };
  useEffect(() => {
    if (ai !== "vacancy" || vacs) return;
    listMyStudioVacancies().then((r) => setVacs(r.success ? r.data.map((v) => ({ id: v.id, label: `[${v.trade_type || "-"}] ${v.building_name || v.property_type || "공실"} · ${v.address}` })) : [])).catch(() => setVacs([]));
  }, [ai, vacs]);
  const write = async () => {
    setErr("");
    setWriting(`${writer}가 대본을 쓰는 중… (1~2분)`);
    const off = b.onProgress((t) => setWriting(t));
    try {
      const vacancy = ai === "vacancy" && vac ? (await b.vacancy(vac)).vacancy : null;
      const r = await b.ai.script({ topic: ai === "topic" ? topic.trim() : "", chars: len * 5, vacancy, request: "카메라를 보고 직접 읽을 대본. 말하듯 짧은 문장으로." });
      const text = r.scenes.map((s) => s.lines.map((l) => l.text).join("\n")).join("\n\n").trim();
      if (!text) throw new Error("대본을 받지 못했어요. 다시 눌러 주세요.");
      set({ text, on: true });
      setAi("");
    } catch (e) {
      setErr(errText(e));
    } finally {
      off();
      setWriting("");
    }
  };
  const chars = value.text.replace(/\s/g, "").length;
  const secs = Math.round(chars / value.cps);

  const chip = (on: boolean): React.CSSProperties => ({ height: 36, padding: "0 14px", borderRadius: 5, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent", color: C.text, fontSize: 14.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" });
  const can = Boolean(b.record.prompterOpen);
  return (
    <div style={{ border: `1px solid ${C.line2}`, borderRadius: 6, background: C.card, padding: 14, opacity: disabled ? 0.6 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Icon name="text" size={18} />
        <span style={{ flex: 1, fontSize: 16, fontWeight: 800 }}>프롬프터</span>
        <span style={{ fontSize: 13.5, color: C.sub }}>켜기</span>
        <Toggle on={value.on} onChange={(v) => set({ on: v })} disabled={disabled} />
      </div>
      {!can && <div style={{ marginTop: 10, fontSize: 13.5, color: C.danger }}>공실뉴스 스튜디오를 새 버전으로 업데이트하면 쓸 수 있어요.</div>}
      {value.on && (
        <>
          <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            <button type="button" disabled={disabled || Boolean(writing)} onClick={() => setAi(ai === "topic" ? "" : "topic")} style={chip(ai === "topic")}>AI로 쓰기</button>
            <button type="button" disabled={disabled || Boolean(writing)} onClick={() => setAi(ai === "vacancy" ? "" : "vacancy")} style={chip(ai === "vacancy")}>공실로 쓰기</button>
            <span style={{ flex: 1 }} />
            {value.text && <button type="button" disabled={disabled} onClick={() => set({ text: "" })} style={chip(false)}>대본 지우기</button>}
          </div>
          {ai && (
            <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
              {ai === "topic" ? (
                <input value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === "Enter" && topic.trim() && !writing && write()} placeholder="무엇을 말할까요? 예: 강남 사무실 고르는 법" style={{ ...input, flex: 1, minWidth: 0 }} />
              ) : (
                <select value={vac} onChange={(e) => setVac(e.target.value)} style={{ ...input, flex: 1, minWidth: 0 }}>
                  <option value="">{vacs === null ? "내 공실 불러오는 중…" : `소개할 공실을 고르세요 (${vacs.length}개)`}</option>
                  {(vacs || []).map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                </select>
              )}
              <select value={len} onChange={(e) => setLen(Number(e.target.value))} style={{ ...input, width: 92 }} title="대본 길이">
                {PROMPTER_LEN.map(([s, l]) => <option key={s} value={s}>{l}</option>)}
              </select>
              <Btn primary disabled={Boolean(writing) || (ai === "topic" ? !topic.trim() : !vac)} onClick={write}>쓰기</Btn>
            </div>
          )}
          {writing && <div style={{ marginTop: 8, fontSize: 14, color: C.sub }}>{writing}</div>}
          {err && <div style={{ marginTop: 8, fontSize: 14, color: C.danger }}>{err}</div>}
          <textarea value={value.text} onChange={(e) => set({ text: e.target.value })} disabled={disabled} rows={6}
            placeholder="읽을 대본을 쓰거나 붙여 넣으세요"
            style={{ ...input, height: "auto", marginTop: 10, padding: 12, fontSize: 16, lineHeight: 1.6, resize: "vertical" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
            <Btn primary={!rehearsing} disabled={disabled || !can || !value.text.trim()} onClick={onRehearse} title="녹화하지 않고 프롬프터만 띄워 읽어 봐요 (빠르기·글자 크기는 프롬프터 창에서)">
              <Icon name={rehearsing ? "close" : "play"} size={16} />{rehearsing ? "미리보기 닫기" : "미리 읽어 보기"}
            </Btn>
            <span style={{ flex: 1 }} />
            {chars > 0 && <span style={{ fontSize: 14, color: C.sub }}>약 <b style={{ color: C.text }}>{fmtTime(secs, false)}</b></span>}
          </div>
        </>
      )}
    </div>
  );
}

export function RecordFlow({ onCancel, onRecorded }: { onCancel: () => void; onRecorded: (item: LibItem, script?: string) => void }) {
  const b = videoBridge()!;
  const [pr, setPr] = useState<Prompter>(() => loadPrompter()); // 프롬프터 대본·글자·빠르기 (다음 녹화 때도 그대로)
  const [prOpen, setPrOpen] = useState(false); // 녹화 중 프롬프터 창이 떠 있음
  const prUse = pr.on && Boolean(pr.text.trim()) && Boolean(b.record.prompterOpen);
  const openPrompter = (startAt: number, rehearse = false) => {
    if (!b.record.prompterOpen) return;
    setPrOpen(true);
    b.record.prompterOpen({ text: pr.text.trim(), cps: pr.cps, size: pr.size, opacity: pr.opacity, mine: pr.mine, startAt, rehearse }).catch(() => setPrOpen(false));
  };
  const closePrompter = () => {
    setPrOpen(false);
    b.record.prompterClose?.().catch(() => {});
  };
  useEffect(() => b.record.onPrompterClosed?.(() => setPrOpen(false)), [b]);
  // 프롬프터 창에서 바꾼 빠르기·글자 크기·내 빠르기 → 여기에도 (다음 녹화 때도 그대로)
  useEffect(() => b.record.onPrompterPrefs?.((o) => setPr((p) => {
    const n = { ...p, cps: clampCps(o.cps), size: clampSize(o.size), opacity: typeof o.opacity === "number" ? clampOpacity(o.opacity) : p.opacity, mine: o.mine ? { cps: clampCps(o.mine.cps), size: clampSize(o.mine.size) } : p.mine };
    savePrompter(n);
    return n;
  })), [b]);
  useEffect(() => () => void b.record.prompterClose?.().catch(() => {}), [b]);
  const [mode, setMode] = useState<"screen" | "camera" | "both">("screen");
  const [sources, setSources] = useState<{ id: string; name: string; thumb: string }[]>([]);
  const [source, setSource] = useState("");
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [camStill, setCamStill] = useState(false); // 가상 카메라가 멈춘 그림만 보냄 → 공실뉴스 로고
  const [noCamUrl, setNoCamUrl] = useState("");
  useEffect(() => {
    const c = noCamCanvas((cv) => setNoCamUrl(cv.toDataURL("image/png")));
    setNoCamUrl(c.toDataURL("image/png"));
  }, []);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [cam, setCam] = useState("");
  const [mic, setMic] = useState("");
  // 소리 — 마이크·PC 소리 각각 크기·무음 (둘 다 무음이면 소리 없이 녹화). 녹화 중에 바꿔도 바로 들어간다
  const [micMuted, setMicMuted] = useState(false);
  const [micVol, setMicVol] = useState(1);
  const [micAuto, setMicAuto] = useState(true); // 마이크 자동 조절 (작은 소리는 키우고 큰 소리는 줄임)
  const [pcMuted, setPcMuted] = useState(false);
  const [pcVol, setPcVol] = useState(1);
  const micOn = !micMuted;
  const audioCtx = useRef<AudioContext | null>(null);
  const micGain = useRef<GainNode | null>(null);
  const pcGain = useRef<GainNode | null>(null);
  const micAn = useRef<AnalyserNode | null>(null); // 작은 녹화 창의 소리 막대
  const pcAn = useRef<AnalyserNode | null>(null);
  const outVideo = useRef<MediaStream | null>(null); // 지금 녹화되는 화면 (작은 녹화 창에 보여 준다)
  const outAll = useRef<MediaStream | null>(null); // 녹화 화면 + 소리 (녹화하기 창 미리보기)
  // 카메라 원 자리·크기 — 미리보기에서 끌어서 옮기고 모서리 점으로 크기 조절. 녹화 중에도 바로 들어가고, 다음 녹화 때도 그대로
  const [camBox, setCamBoxState] = useState<CamBox>(() => {
    try {
      const v = JSON.parse(localStorage.getItem("gsv:camBox") || "null");
      if (v && typeof v.cx === "number" && typeof v.cy === "number" && typeof v.r === "number") return fitCamBox({ ...CAM_DEFAULT, ...v });
    } catch {}
    return CAM_DEFAULT;
  });
  const camBoxRef = useRef(camBox);
  const setCamBox = (v: CamBox) => {
    const n = fitCamBox(v);
    camBoxRef.current = n;
    setCamBoxState(n);
    try {
      localStorage.setItem("gsv:camBox", JSON.stringify(n));
    } catch {}
  };
  // 저장할 곳·파일 이름 — 폴더는 처음 화면 [저장 폴더]의 "녹화 영상 저장 폴더"와 같은 값 (여기서 바꾸면 거기도 바뀐다).
  // 이름은 비우면 "화면 녹화_날짜시각"
  const [saveDir, setSaveDirState] = useState("");
  const [defaultDir, setDefaultDir] = useState("");
  const [fileName, setFileName] = useState("");
  useEffect(() => {
    if (b.project.folders) {
      b.project.folders().then((f) => {
        setDefaultDir(f.defaults.recordDir);
        let old = "";
        try {
          old = localStorage.getItem("gsv:recDir") || ""; // 예전에 녹화 창에서만 고른 폴더 → 설정으로 옮긴다
          localStorage.removeItem("gsv:recDir");
        } catch {}
        if (!f.recordDir && old) b.project.setFolders?.({ recordDir: old }).catch(() => {});
        setSaveDirState(f.recordDir || old);
      }).catch(() => {});
    } else b.record.defaultDir?.().then(setDefaultDir).catch(() => {});
  }, [b]);
  const setSaveDir = (d: string) => {
    setSaveDirState(d);
    b.project.setFolders?.({ recordDir: d }).catch(() => {});
  };
  const dirShown = saveDir || defaultDir;
  const stage = useRef<HTMLDivElement>(null);
  // 반반 화면 칸 — 끌어서 보일 곳 옮기기 (녹화 중에도)
  const dragPan = (e: React.PointerEvent) => {
    const sp = splitRects(camBoxRef.current);
    if (!stage.current || !sp) return;
    const window = (e.currentTarget as HTMLElement).ownerDocument.defaultView || globalThis.window;
    e.preventDefault();
    e.stopPropagation();
    const k = 1920 / stage.current.getBoundingClientRect().width;
    const vv = liveVid.current;
    const vw = vv?.videoWidth || 1920, vh = vv?.videoHeight || 1080;
    const s = { x: e.clientX, y: e.clientY, ...camBoxRef.current };
    const mv = (ev: PointerEvent) => {
      const [, , dw, dh] = panRect(sp.scr, vw, vh, camBoxRef.current);
      const ox = dw - sp.scr[2], oy = dh - sp.scr[3]; // 칸 밖으로 넘치는 만큼만 옮길 수 있다
      const dx = (ev.clientX - s.x) * k, dy = (ev.clientY - s.y) * k;
      setCamBox({ ...camBoxRef.current, sx: ox > 1 ? s.sx - dx / ox : 0.5, sy: oy > 1 ? s.sy - dy / oy : 0.5 });
    };
    const up = () => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };
  const dragCam = (e: React.PointerEvent, kind: "move" | "size") => {
    if (!stage.current) return;
    const window = (e.currentTarget as HTMLElement).ownerDocument.defaultView || globalThis.window; // 녹화하기 창이 따로 떠 있어도
    e.preventDefault();
    e.stopPropagation();
    const k = 1920 / stage.current.getBoundingClientRect().width;
    const s = { x: e.clientX, y: e.clientY, ...camBoxRef.current };
    const mv = (ev: PointerEvent) => {
      const dx = (ev.clientX - s.x) * k, dy = (ev.clientY - s.y) * k;
      if (kind === "move") setCamBox({ ...camBoxRef.current, cx: s.cx + dx, cy: s.cy + dy });
      else setCamBox({ ...camBoxRef.current, r: s.r + (dx + dy) / 2 });
    };
    const up = () => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };
  useEffect(() => {
    if (micGain.current) micGain.current.gain.value = micMuted ? 0 : micVol;
    if (pcGain.current) pcGain.current.gain.value = pcMuted ? 0 : pcVol;
  }, [micMuted, micVol, pcMuted, pcVol]);
  const [phase, setPhase] = useState<"setup" | "count" | "rec" | "saving">("setup");
  const [count, setCount] = useState(3);
  const [sec, setSec] = useState(0);
  const [err, setErr] = useState("");
  const preview = useRef<HTMLVideoElement | null>(null);
  const bindPreview = (el: HTMLVideoElement | null) => {
    preview.current = el;
    const st = outAll.current;
    if (el && st && el.srcObject !== st) {
      el.srcObject = st;
      el.muted = true;
      el.play().catch(() => {});
    }
  };
  const streams = useRef<MediaStream[]>([]);
  const rec = useRef<MediaRecorder | null>(null);
  const writes = useRef<Promise<void>>(Promise.resolve()); // 녹화 조각 쓰기 줄 (차례대로)
  const token = useRef("");
  const raf = useRef(0);
  // 녹화 전 실시간 보기 — 모니터에 마우스를 올리면 그 모니터, 아니면 고른 모니터 (카메라 모드는 카메라)
  const [hover, setHover] = useState("");
  const [live, setLive] = useState(false);
  const liveSt = useRef<MediaStream | null>(null);
  const liveVid = useRef<HTMLVideoElement>(null);
  const stopLive = () => {
    // 같이 쓰는 카메라는 끄지 않는다 (releaseCam 이 끈다)
    if (liveSt.current && liveSt.current !== liveFromCam.current) liveSt.current.getTracks().forEach((t) => t.stop());
    liveSt.current = null;
    liveFromCam.current = null;
  };
  // 카메라는 한 번만 연다 (윈도우는 카메라를 한 번 여는 데 0.5~2초) — 검사·미리보기·화면+카메라 원·녹화가 같은 카메라를 같이 쓴다.
  //  예전엔 검사·미리보기가 따로 열고, 카메라를 고르면 또 열어 2~5초씩 늦게 잡혔다 (2026-10-17)
  const camPool = useRef<{ id: string; p: Promise<MediaStream> } | null>(null);
  const releaseCam = () => {
    const c = camPool.current;
    camPool.current = null;
    c?.p.then((st) => st.getTracks().forEach((t) => t.stop())).catch(() => {});
  };
  const camAlive = (st: MediaStream) => st.getVideoTracks().some((t) => t.readyState === "live");
  const openCam = async (id: string): Promise<MediaStream> => {
    const c = camPool.current;
    if (c && c.id === id) {
      const st = await c.p.catch(() => null);
      if (st && camAlive(st)) return st;
      if (camPool.current === c) camPool.current = null;
    } else releaseCam();
    const p = navigator.mediaDevices.getUserMedia({ video: id ? { deviceId: { exact: id }, width: 1280, height: 720 } : { width: 1280, height: 720 }, audio: false });
    const mine = { id, p };
    camPool.current = mine;
    p.catch(() => {
      if (camPool.current === mine) camPool.current = null;
    });
    return p;
  };
  const liveFromCam = useRef<MediaStream | null>(null);
  const [camPicked, setCamPicked] = useState(false); // 쓸 카메라를 정한 뒤에 연다 (정하기 전에 열면 고른 뒤 또 열어야 한다)
  const liveTarget = mode === "camera" ? (camPicked ? `cam:${cam}` : "") : hover || source;
  useEffect(() => {
    if (phase !== "setup" || !liveTarget) return;
    let dead = false;
    const t = setTimeout(async () => {
      try {
        let st: MediaStream;
        if (mode === "camera") {
          st = await openCam(cam);
          if (dead) return;
          stopLive();
          liveFromCam.current = st;
          liveSt.current = st;
          if (liveVid.current) {
            liveVid.current.srcObject = st;
            liveVid.current.play().catch(() => {});
          }
          setCamErr("");
          setLive(true);
          return;
        } else {
          await b.record.choose(liveTarget);
          st = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: false });
        }
        if (dead) return st.getTracks().forEach((x) => x.stop());
        stopLive();
        liveSt.current = st;
        if (liveVid.current) {
          liveVid.current.srcObject = st;
          liveVid.current.play().catch(() => {});
        }
        setLive(true);
      } catch (e) {
        if (!dead && mode === "camera") setCamErr(errOf(e));
        setLive(false);
      }
    }, hover ? 180 : 0); // 마우스를 지나가기만 할 때 여러 번 켜지지 않게
    return () => {
      dead = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveTarget, phase, mode]);
  useEffect(() => () => stopLive(), []);
  // 화면 + 카메라 — 녹화 전에도 모니터 위에 카메라 원을 겹쳐 보여 준다 (녹화 결과와 같은 자리·크기)
  const [camLive, setCamLive] = useState(false);
  const camSt = useRef<MediaStream | null>(null);
  const camVid = useRef<HTMLVideoElement>(null);
  const stopCamLive = () => {
    camSt.current = null; // 같이 쓰는 카메라라 끄지 않는다
    setCamLive(false);
  };
  useEffect(() => {
    if (phase !== "setup" || mode !== "both") return stopCamLive();
    if (!camPicked) return;
    let dead = false;
    openCam(cam).then((st) => {
      if (dead) return;
      setCamErr("");
      camSt.current = st;
      if (camVid.current) {
        camVid.current.srcObject = st;
        camVid.current.play().catch(() => {});
      }
      setCamLive(true);
    }).catch((e) => {
      if (!dead) setCamErr(errOf(e));
      setCamLive(false);
    });
    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, mode, cam, camPicked]);
  useEffect(() => () => stopCamLive(), []);
  // 화면만 녹화할 땐 카메라를 꺼 둔다 (카메라 불이 켜져 있지 않게) · 창을 닫으면 끈다
  useEffect(() => {
    if (mode === "screen") releaseCam();
  }, [mode]);
  useEffect(() => () => releaseCam(), []);

  // 카메라·마이크 찾기 — 카메라는 따로 열어 봐서, 못 열면 이유를 알려 준다 (노트북에서 안 잡히던 문제, 2026-10-16)
  //  denied: 윈도우 카메라 권한 꺼짐 · busy: 다른 프로그램이 쓰는 중이거나 카메라 끄기 키·가림막 · none: 카메라 없음
  const [camErr, setCamErr] = useState("");
  const [setOpened, setSetOpened] = useState<"" | "camera" | "microphone">(""); // [설정]으로 윈도우 설정을 열었다는 안내 (이 창으로 돌아오면 사라짐)
  useEffect(() => {
    if (!setOpened) return;
    // 윈도우 설정 창이 앞으로 나간 뒤 이 창으로 돌아오면 안내를 접는다 (돌아올 때 장치는 저절로 다시 찾는다)
    let away = false;
    const blur = () => (away = true);
    const back = () => away && setTimeout(() => setSetOpened(""), 4000);
    window.addEventListener("blur", blur);
    window.addEventListener("focus", back);
    return () => {
      window.removeEventListener("blur", blur);
      window.removeEventListener("focus", back);
    };
  }, [setOpened]);
  const [micErr, setMicErr] = useState("");
  const errOf = (e: unknown) => {
    const n = (e as DOMException)?.name || "";
    return /NotAllowed|Security|PermissionDenied/.test(n) ? "denied" : /NotReadable|TrackStart|Abort/.test(n) ? "busy" : /NotFound|DevicesNotFound|Overconstrained/.test(n) ? "none" : `other:${n}`;
  };
  const probing = useRef(false);
  const micOk = useRef(false);
  // 얼굴 인식용 적외선(IR) 카메라(검은 화면)와 가상 카메라(OBS·줌 등 — 진짜 얼굴이 아니라 그 프로그램 화면)는 뒤로
  const camScore = (v: MediaDeviceInfo) => (/\bIR\b|infrared|적외선/i.test(v.label) ? 2 : /virtual|가상|\bOBS\b|snap camera|xsplit|manycam|vcam|e2esoft|nvidia broadcast/i.test(v.label) ? 1 : 0);
  const pickCam = (vids: MediaDeviceInfo[]) => [...vids].sort((a, b2) => camScore(a) - camScore(b2))[0]?.deviceId || "";
  const probeDevices = async () => {
    if (probing.current || phase !== "setup") return; // 녹화 중에는 장치를 건드리지 않는다
    probing.current = true;
    try {
      let d = await navigator.mediaDevices.enumerateDevices().catch(() => [] as MediaDeviceInfo[]);
      const named = d.some((x) => x.kind === "videoinput" && x.label);
      const needCam = mode !== "screen";
      let err = "";
      let curCam = cam;
      // 카메라 이름을 이미 알면(권한을 준 PC) 먼저 정하고 연다 → 한 번만 열린다
      if (named && !curCam) {
        curCam = pickCam(d.filter((x) => x.kind === "videoinput"));
        if (curCam) setCam(curCam);
      }
      if (needCam || !named) {
        try {
          const st = await openCam(curCam);
          if (!curCam) {
            // 처음 쓰는 PC — 기본 카메라로 열어 권한을 받고 나서 고른다. 고른 게 지금 연 것과 같으면 다시 열지 않는다
            d = await navigator.mediaDevices.enumerateDevices().catch(() => d);
            const want = pickCam(d.filter((x) => x.kind === "videoinput"));
            const now = st.getVideoTracks()[0]?.getSettings().deviceId || "";
            if (want && want === now && camPool.current) camPool.current.id = want;
            if (want) {
              curCam = want;
              setCam(want);
            }
          }
          if (!needCam) releaseCam(); // 이름만 알려고 연 것 — 화면 녹화 중엔 카메라 불을 끈다
        } catch (e) {
          err = errOf(e);
        }
      }
      let merr = "";
      if (!micOk.current) {
        try {
          const st = await navigator.mediaDevices.getUserMedia({ audio: true });
          st.getTracks().forEach((t) => t.stop());
          micOk.current = true;
        } catch (e) {
          merr = errOf(e);
        }
        d = await navigator.mediaDevices.enumerateDevices().catch(() => d);
      }
      const vids = d.filter((x) => x.kind === "videoinput");
      const auds = d.filter((x) => x.kind === "audioinput");
      setCams(vids);
      setMics(auds);
      if (!vids.length && !err) err = "none";
      if (!auds.length && !merr) merr = "none";
      // 고른 카메라를 뺐으면 다른 카메라로
      if (curCam && vids.length && !vids.some((v) => v.deviceId === curCam)) setCam(pickCam(vids));
      if (needCam || err === "none" || err === "denied") setCamErr(err);
      setMicErr(merr);
      if (merr) micOk.current = false;
      setCamPicked(true);
    } finally {
      probing.current = false;
    }
  };
  const probeRef = useRef(probeDevices);
  probeRef.current = probeDevices;
  useEffect(() => {
    const again = () => void probeRef.current();
    navigator.mediaDevices.addEventListener?.("devicechange", again);
    window.addEventListener("focus", again);
    return () => {
      navigator.mediaDevices.removeEventListener?.("devicechange", again);
      window.removeEventListener("focus", again);
    };
  }, []);
  useEffect(() => {
    if (!camErr && !micErr) return;
    const t = setInterval(() => void probeRef.current(), 3000);
    return () => clearInterval(t);
  }, [camErr, micErr]);
  useEffect(() => {
    if (mode !== "screen") void probeRef.current();
  }, [mode]);
  useEffect(() => {
    b.record.sources().then((s) => {
      setSources(s);
      if (s[0]) setSource(s[0].id);
    }).catch(() => {});
    probeDevices();
    return () => stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopAll = () => {
    clearInterval(raf.current);
    audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
    micGain.current = null;
    pcGain.current = null;
    streams.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    streams.current = [];
    comp.current = null;
    micAn.current = pcAn.current = null;
    outVideo.current = null;
  };

  // 녹화 중 화면 바꾸기 — 녹화는 늘 1920×1080 화판(캔버스)에 그려서 한다. 화면 / 카메라 / 화면+카메라를 녹화를 멈추지 않고 바꾼다.
  //  필요한 것만 그때 연다: 카메라는 카메라가 들어가는 모양으로 바꿀 때 켜고, 화면만으로 돌아가면 끈다 (카메라 불). 모니터도 바꿀 수 있다
  const modeRef = useRef(mode);
  // 고른 카메라가 가상 카메라인지 (녹화 캔버스도 본다)
  const virtualCam = mode !== "screen" && (cams.length === 0 || isVirtualCam(cams.find((x) => x.deviceId === cam)?.label));
  const virtualCamRef = useRef(virtualCam);
  virtualCamRef.current = virtualCam;
  useEffect(() => {
    if (phase !== "setup" || !virtualCam) {
      setCamStill(false);
      return;
    }
    const det = stillDetector();
    const id = setInterval(() => setCamStill(det(mode === "camera" ? liveVid.current : camVid.current)), 400);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, virtualCam, mode, cam]);
  modeRef.current = mode;
  const comp = useRef<{ sv: HTMLVideoElement; cv: HTMLVideoElement; screen: MediaStream | null; screenSrc: string; camera: MediaStream | null; busy: Promise<void> } | null>(null);
  const attachScreen = async (src: string) => {
    const c = comp.current;
    if (!c) return;
    await b.record.choose(src);
    const st = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false });
    if (comp.current !== c) return st.getTracks().forEach((t) => t.stop());
    const old = c.screen;
    c.screen = st;
    c.screenSrc = src;
    streams.current.push(st);
    c.sv.srcObject = st;
    await c.sv.play().catch(() => {});
    old?.getTracks().forEach((t) => t.stop());
  };
  const attachCam = async () => {
    const c = comp.current;
    if (!c || c.camera) return;
    const st = await openCam(cam);
    camPool.current = null; // 이제 녹화가 맡는다 — 녹화가 끝나거나 화면만으로 바꾸면 끈다
    if (comp.current !== c) return st.getTracks().forEach((t) => t.stop());
    c.camera = st;
    streams.current.push(st);
    c.cv.srcObject = st;
    await c.cv.play().catch(() => {});
  };
  const detachCam = () => {
    const c = comp.current;
    if (!c?.camera) return;
    c.camera.getTracks().forEach((t) => t.stop());
    c.camera = null;
    c.cv.srcObject = null;
  };
  // 녹화 중에 모양·모니터를 바꾸면 — 필요한 것을 차례대로 연다 (한꺼번에 열지 않게 줄 세움)
  useEffect(() => {
    const c = comp.current;
    if (!c || (phase !== "rec" && phase !== "count")) return;
    c.busy = c.busy.then(async () => {
      try {
        if (mode !== "camera" && (!c.screen || c.screenSrc !== source)) await attachScreen(source);
        if (mode !== "screen") await attachCam();
        else detachCam();
      } catch (e) {
        setErr(`${mode === "screen" ? "화면" : "카메라"}을 열지 못했어요: ${errText(e)}`);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, source, phase]);

  const buildStream = async (): Promise<MediaStream> => {
    stopAll();
    stopLive();
    stopCamLive();
    setLive(false);
    // PC 소리는 따로 받는다 (윈도우 루프백) — 녹화 중에 모니터·모양을 바꿔도 소리는 끊기지 않게
    let pcAudio: MediaStreamTrack[] = [];
    if (!pcMuted) {
      try {
        await b.record.choose(source || sources[0]?.id || "");
        const d = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        d.getVideoTracks().forEach((t) => t.stop());
        streams.current.push(d);
        pcAudio = d.getAudioTracks();
      } catch {
        pcAudio = [];
      }
    }
    const sv = document.createElement("video");
    const cv = document.createElement("video");
    sv.muted = cv.muted = true;
    sv.playsInline = cv.playsInline = true;
    const c = { sv, cv, screen: null, screenSrc: "", camera: null, busy: Promise.resolve() };
    comp.current = c;
    if (mode !== "camera") await attachScreen(source);
    else await b.record.choose(source); // 작은 막대·프롬프터는 고른 모니터에
    if (mode !== "screen") await attachCam();
    // 마이크 + PC 소리를 각각 크기 조절해서 섞는다
    let audio: MediaStream | null = null;
    let micStream: MediaStream | null = null;
    if (micOn) {
      const base = { echoCancellation: true, noiseSuppression: true, autoGainControl: micAuto };
      micStream = await navigator.mediaDevices.getUserMedia({ audio: mic ? { ...base, deviceId: { exact: mic } } : base, video: false });
      streams.current.push(micStream);
    }
    if (micStream || pcAudio.length) {
      const ctx = new AudioContext();
      audioCtx.current = ctx;
      const dest = ctx.createMediaStreamDestination();
      if (micStream) {
        const g = ctx.createGain();
        g.gain.value = micMuted ? 0 : micVol;
        ctx.createMediaStreamSource(micStream).connect(g).connect(dest);
        micGain.current = g;
        micAn.current = ctx.createAnalyser();
        micAn.current.fftSize = 1024;
        g.connect(micAn.current);
      }
      if (pcAudio.length) {
        const g = ctx.createGain();
        g.gain.value = pcMuted ? 0 : pcVol;
        ctx.createMediaStreamSource(new MediaStream(pcAudio)).connect(g).connect(dest);
        pcGain.current = g;
        pcAn.current = ctx.createAnalyser();
        pcAn.current.fftSize = 1024;
        g.connect(pcAn.current);
      }
      audio = dest.stream;
    }
    const canvas = document.createElement("canvas");
    canvas.width = 1920;
    canvas.height = 1080;
    const g = canvas.getContext("2d")!;
    // 카메라가 멈춘 그림만 보내면(가상 카메라) 그 자리에 공실뉴스 로고
    const noCam = noCamCanvas();
    const camDet = stillDetector();
    let camStillRec = false;
    let camChk = 0;
    const logoIn = (X: number, Y: number, W: number, H: number) => {
      // "카메라 없음" 그림을 칸에 꽉 채워 (가운데 기준)
      const k = Math.max(W / 1280, H / 720);
      g.drawImage(noCam, X + (W - 1280 * k) / 2, Y + (H - 720 * k) / 2, 1280 * k, 720 * k);
    };
    const fit = (v: HTMLVideoElement, X: number, Y: number, W: number, H: number, cover: boolean) => {
      if (v === cv && camStillRec) {
        g.save();
        g.beginPath();
        g.rect(X, Y, W, H);
        g.clip();
        logoIn(X, Y, W, H);
        g.restore();
        return;
      }
      const vw = v.videoWidth || 1920, vh = v.videoHeight || 1080;
      const k = cover ? Math.max(W / vw, H / vh) : Math.min(W / vw, H / vh);
      g.save();
      g.beginPath();
      g.rect(X, Y, W, H);
      g.clip();
      g.drawImage(v, X + (W - vw * k) / 2, Y + (H - vh * k) / 2, vw * k, vh * k);
      g.restore();
    };
    const draw = () => {
      const m = modeRef.current;
      if (virtualCamRef.current && performance.now() - camChk > 400) {
        camChk = performance.now();
        camStillRec = camDet(cv);
      }
      const sOk = Boolean(c.screen) && sv.readyState >= 2;
      const cOk = Boolean(c.camera) && cv.readyState >= 2;
      // 바꾸는 중이라 아직 안 열린 것은 — 바로 앞 화면을 그대로 둔다 (검은 화면으로 깜빡이지 않게)
      if (m === "camera" ? !cOk : m === "screen" ? !sOk : !sOk && !cOk) return;
      g.fillStyle = "#000";
      g.fillRect(0, 0, 1920, 1080);
      if (m === "camera" || (m === "both" && !sOk)) return fit(cv, 0, 0, 1920, 1080, true);
      if (m === "screen" || !cOk) return fit(sv, 0, 0, 1920, 1080, false);
      // 화면 + 카메라 (배치·자리·크기는 camBoxRef, 녹화 중에 바꿔도 바로)
      const cb = camBoxRef.current;
      const sp = splitRects(cb);
      if (sp) {
        // 반반 — 화면·카메라 모두 칸을 꽉 채우게 (가운데 기준, 넘치는 곳은 잘라냄 — 검은 띠 없이, 사장님 2026-10-17), 사이에 선
        {
          const [X, Y, W, H] = sp.scr;
          const [dx, dy, dw, dh] = panRect(sp.scr, sv.videoWidth || 1920, sv.videoHeight || 1080, cb);
          g.save();
          g.beginPath();
          g.rect(X, Y, W, H);
          g.clip();
          g.drawImage(sv, dx, dy, dw, dh);
          g.restore();
        }
        fit(cv, ...sp.cam, true);
        if (cb.line > 0) {
          g.fillStyle = cb.color;
          if (cb.layout === "lr") g.fillRect(960 - cb.line / 2, 0, cb.line, 1080);
          else g.fillRect(0, 540 - cb.line / 2, 1920, cb.line);
        }
        return;
      }
      fit(sv, 0, 0, 1920, 1080, false);
      const { r, cx, cy } = cb;
      g.save();
      camPath(g, cb, 0);
      g.clip();
      const cw = cv.videoWidth || 1280, ch = cv.videoHeight || 720;
      const kk = Math.max((r * 2) / cw, (r * 2) / ch);
      if (camStillRec) logoIn(cx - r, cy - r, r * 2, r * 2);
      else g.drawImage(cv, cx - (cw * kk) / 2, cy - (ch * kk) / 2, cw * kk, ch * kk);
      g.restore();
      if (cb.line > 0) {
        g.lineWidth = cb.line;
        g.strokeStyle = cb.color;
        camPath(g, cb, cb.line / 2);
        g.stroke();
      }
    };
    g.fillStyle = "#000";
    g.fillRect(0, 0, 1920, 1080);
    draw();
    // 화면 그리기 신호(requestAnimationFrame)는 창을 내리면 멈춘다 — 작게 하기 중에도 녹화되게 시계로 그린다
    raf.current = window.setInterval(draw, 1000 / 30);
    const video = canvas.captureStream(30);
    outVideo.current = video;
    const out = new MediaStream([...video.getVideoTracks(), ...(audio ? audio.getAudioTracks() : [])]);
    outAll.current = out;
    if (preview.current) {
      preview.current.srcObject = out;
      preview.current.muted = true;
      preview.current.play().catch(() => {});
    }
    return out;
  };

  const start = async () => {
    setErr("");
    try {
      const stream = await buildStream();
      // 프롬프터 — 3·2·1 이 끝나는 때에 맞춰 올라가기 시작한다
      if (prUse) openPrompter(Date.now() + 3000);
      // 녹화하기 창은 앱 틀 밖에 혼자 뜨고, 뒤의 앱 창은 내려간다 (3·2·1 전에 — 화면 녹화 첫 장면에 앱이 안 찍히게)
      const own = Boolean(b.record.console && b.record.onMinimized); // 앱 0.1.8부터
      if (own && openBig()) await b.record.minimize?.().catch(() => {});
      setPhase("count");
      for (let i = 3; i > 0; i--) {
        setCount(i);
        await new Promise((r) => setTimeout(r, 1000));
      }
      token.current = await b.record.start(mode === "camera" ? "카메라 녹화" : "화면 녹화", { dir: saveDir || undefined, fileName: fileName.trim() || undefined });
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm";
      const r = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
      // 조각은 받은 순서대로 하나씩 쓴다 — 따로따로 쓰면 느린 PC에서 순서가 뒤바뀌어(첫 조각=머리말) 파일이 깨졌다 (2026-10-16)
      writes.current = Promise.resolve();
      const tk = token.current;
      r.ondataavailable = (e) => {
        if (!e.data.size) return;
        const blob = e.data;
        writes.current = writes.current.then(async () => {
          await b.record.chunk(tk, await blob.arrayBuffer());
        }).catch(() => {});
      };
      r.start(1000);
      rec.current = r;
      setSec(0);
      setPhase("rec");
      await b.record.live?.(true, Date.now(), { console: own }).catch(() => {});
    } catch (e) {
      setErr(`녹화를 시작하지 못했어요: ${errText(e)}`);
      if (bigRef.current) {
        closeBig();
        void b.record.live?.(true, Date.now(), { console: true }).then(() => b.record.live?.(false)).catch(() => {}); // 앱 창 다시 올리기
      }
      closePrompter();
      setPhase("setup");
      stopAll();
    }
  };
  useEffect(() => {
    if (phase !== "rec") return;
    const t = setInterval(() => setSec((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const stop = async () => {
    const r = rec.current;
    if (!r) return;
    rec.current = null;
    b.record.live?.(false).catch(() => {}); // 작은 막대 닫고 큰 창 다시
    closeMini();
    closeBig();
    closePrompter();
    setPhase("saving");
    await new Promise<void>((res) => {
      r.onstop = () => res();
      r.stop();
    });
    // 마지막 조각까지 다 쓴 뒤에 파일을 닫는다 (느린 PC에서는 0.4초로 모자랐다)
    await new Promise((res) => setTimeout(res, 100));
    await writes.current;
    stopAll();
    try {
      const item = await b.record.stop(token.current);
      onRecorded(item, prUse ? pr.text.trim() : ""); // 프롬프터 대본 → 편집 화면 자막 글
    } catch (e) {
      setErr(errText(e));
      setPhase("setup");
    }
  };

  // 작은 막대의 [녹화 끝내기]
  const stopRef = useRef(stop);
  stopRef.current = stop;
  useEffect(() => b.record.onMiniStop?.(() => stopRef.current()), [b]);
  useEffect(() => () => void b.record.live?.(false).catch(() => {}), [b]);

  /* ── 녹화 중 창 — 녹화하기 창(앱 틀 밖에 혼자) ↔ [작게 하기] 작은 창(카톡 크기). 뒤의 앱 창은 내려가 있다 ── */
  type Win = { root: HTMLElement; close: () => void };
  const [mini, setMini] = useState<Win | null>(null);
  const [bigWin, setBigWin] = useState<Win | null>(null);
  const [bigMax, setBigMax] = useState(false);
  const miniRef = useRef(mini);
  miniRef.current = mini;
  const bigRef = useRef(bigWin);
  bigRef.current = bigWin;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const closeMini = () => {
    miniRef.current?.close();
    miniRef.current = null;
    setMini(null);
  };
  const closeBig = () => {
    bigRef.current?.close();
    bigRef.current = null;
    setBigWin(null);
    setBigMax(false);
  };
  // 녹화하기 창 열기 — 윈도우에서 닫으면(Alt+F4) 녹화는 계속, 작은 창으로
  const openBig = (): boolean => {
    if (bigRef.current) return true;
    // 앱 안에서 보이던 녹화하기 창 자리·크기를 재 둔다 — 따로 뜬 창도 꼭 그 자리·그 크기로 (모양이 바뀌지 않게)
    const boxes = document.querySelectorAll("[data-gsv-modal]");
    const r = boxes.length ? boxes[boxes.length - 1].getBoundingClientRect() : null;
    const w = openMiniWindow(() => {
      bigRef.current = null;
      setBigWin(null);
      if (phaseRef.current === "rec") openMini();
    }, "console");
    if (!w) return false;
    // 자리 — 앱이 정한다 (두 모니터면 녹화하지 않는 모니터, 끌어 옮겨 둔 자리 기억). 크기는 앱 안에서 보이던 그대로
    if (r && r.width > 100) b.record.console?.("place", r.left, r.top, r.width, r.height, mode === "camera" ? 1 : 0).catch(() => {});
    bigRef.current = w;
    setBigWin(w);
    return true;
  };
  // 작은 창 열기 — 윈도우에서 닫으면 녹화하기 창으로
  const openMini = (): boolean => {
    if (miniRef.current) return true;
    const m = openMiniWindow(() => {
      miniRef.current = null;
      setMini(null);
      if (phaseRef.current === "rec") openBig();
    });
    if (!m) return false;
    miniRef.current = m;
    setMini(m);
    return true;
  };
  // [작게 하기] — 녹화하기 창 → 작은 창 (녹화하기 창이 앱 안에 있으면 앱 창을 내린다 → 작은 창)
  const goMini = () => {
    if (bigRef.current) {
      if (openMini()) closeBig();
    } else b.record.minimize?.().catch(() => {});
  };
  // [더 작게 하기] — 작은 창 → 얇은 막대 (앱이 띄운다, 녹화에 안 찍힘)
  const goTiny = () => {
    if (!b.record.tiny) return;
    // 먼저 얇은 막대(작은 창 자리 아래쪽에) → 그다음 작은 창 닫기
    b.record.tiny().catch(() => {}).finally(() => closeMini());
  };
  useEffect(() => b.record.onTinyExpand?.(() => {
    if (phaseRef.current === "rec") openMini(); // 얇은 막대 [크게 보기] → 작은 창
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [b]);
  // [크게 보기] — 작은 창 → 녹화하기 창
  const goBig = () => {
    if (openBig()) closeMini();
    else void b.record.console?.("big");
  };
  // 녹화하기 창 위 줄 끌기·크게 (그 윈도우 창을)
  const winDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (bigMax || e.button !== 0 || (e.target as HTMLElement).closest("button, input, select, a")) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const sx = e.screenX, sy = e.screenY;
    b.record.console?.("drag-start").catch(() => {});
    const mv = (ev: PointerEvent) => void b.record.console?.("drag", ev.screenX - sx, ev.screenY - sy).catch(() => {});
    const up = () => {
      el.removeEventListener("pointermove", mv);
      el.removeEventListener("pointerup", up);
    };
    el.addEventListener("pointermove", mv);
    el.addEventListener("pointerup", up);
  };
  useEffect(() => {
    // 앱 안의 녹화하기 창에서 [작게 하기] → 앱 창이 내려가면 작은 창
    const offMin = b.record.onMinimized?.(() => {
      if (phaseRef.current !== "rec" || miniRef.current || bigRef.current) return;
      openMini();
    });
    // 앱 창을 직접 다시 올리면 — 따로 뜬 창은 닫고 앱 안에서 계속
    const offRes = b.record.onRestored?.(() => {
      closeMini();
      closeBig();
    });
    return () => {
      offMin?.();
      offRes?.();
      miniRef.current?.close();
      bigRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b]);
  // 소리 막대 — 작은 녹화 창이 떠 있을 때만 잰다
  const [levels, setLevels] = useState({ mic: 0, pc: 0 });
  useEffect(() => {
    if (!mini) return;
    const buf = new Float32Array(1024);
    const lv = (an: AnalyserNode | null) => {
      if (!an) return 0;
      an.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      return Math.max(0, Math.min(1, (20 * Math.log10(Math.sqrt(sum / buf.length) || 1e-6) + 60) / 60));
    };
    const t = setInterval(() => setLevels({ mic: lv(micAn.current), pc: lv(pcAn.current) }), 100);
    return () => clearInterval(t);
  }, [mini]);

  const miniView = mini && createPortal(
    <RecordMini mode={mode} setMode={setMode} stream={outVideo.current} sec={sec} levels={levels}
      micVol={micVol} micMuted={micMuted} setMicVol={setMicVol} setMicMuted={setMicMuted}
      pcVol={pcVol} pcMuted={pcMuted} setPcVol={setPcVol} setPcMuted={setPcMuted} onStop={() => void stop()} onBig={goBig} onTiny={b.record.tiny ? goTiny : undefined} />,
    mini.root,
  );
  if (phase === "saving") return <Modal title=""><Working title="녹화 파일을 저장하는 중…" detail={dirShown ? `${dirShown} 폴더에 저장하고 바로 편집 화면으로 가요` : "PC에 저장하고 바로 편집 화면으로 가요"} /></Modal>;
  const split = mode === "both" ? splitRects(camBox) : null; // 반반 배치면 화면·카메라 칸
  const chip = (on: boolean): React.CSSProperties => ({ height: 40, padding: "0 16px", borderRadius: 5, border: `1px solid ${on ? C.text : C.line2}`, background: on ? C.text : "transparent", color: on ? C.bg : C.sub, fontSize: 15, fontWeight: 700, fontFamily: FONT, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 });
  const dialog = (
    <Modal title="영상 녹화하기" onClose={phase === "rec" ? undefined : () => { stopAll(); onCancel(); }} width={980} controls
      win={bigWin ? { drag: winDrag, max: () => void b.record.console?.("max").then((v) => setBigMax(Boolean(v))), big: bigMax } : undefined}
      // 녹화 중 [작게] = [작게 하기] — 작은 창(카톡 크기)으로
      onMinimize={phase === "rec" && b.record.minimize ? goMini : undefined}
      minNote={phase === "rec" ? <span style={{ fontSize: 14, color: C.danger, fontWeight: 700 }}>● 녹화 중 {fmtTime(sec, false)}</span> : null}
      footer={phase === "rec" ? <>{b.record.minimize && <Btn onClick={goMini} title="작은 녹화 창으로 (녹화에 안 찍혀요)">작게 하기</Btn>}<Btn primary danger onClick={stop} style={{ background: C.danger, borderColor: C.danger, color: "#fff" }}><Icon name="pause" size={16} />녹화 끝내기 ({fmtTime(sec, false)})</Btn></> : phase === "count" ? null : <Btn primary onClick={start}><Icon name="record" size={16} />녹화 시작</Btn>}>
      <div style={{ display: "flex", gap: 20, padding: 20 }}>
        <div style={{ width: 360, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ ...label, marginBottom: 8 }}>무엇을 녹화할까요?</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button type="button" onClick={() => setMode("screen")} style={chip(mode === "screen")}><Icon name="screen" size={18} />화면</button>
              <button type="button" onClick={() => setMode("camera")} style={chip(mode === "camera")}><Icon name="camera" size={18} />카메라</button>
              <button type="button" onClick={() => setMode("both")} style={chip(mode === "both")}>화면 + 카메라</button>
            </div>
          </div>
          {mode !== "camera" && (
            <div>
              <div style={{ ...label, marginBottom: 8 }}>녹화할 모니터</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {sources.map((s) => (
                  <button key={s.id} type="button" onClick={() => setSource(s.id)} onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover("")} title={s.name} style={{ padding: 0, border: `2px solid ${source === s.id ? C.accent : "transparent"}`, borderRadius: 4, background: "#000", cursor: "pointer", overflow: "hidden" }}>
                    <img src={s.thumb} alt="" style={{ width: "100%", display: "block" }} />
                    <div style={{ fontSize: 12, color: C.sub, padding: "3px 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", background: C.card }}>{s.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {mode !== "screen" && (
            <div>
              <div style={{ ...label, marginBottom: 8 }}>카메라</div>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={cam} onChange={(e) => setCam(e.target.value)} style={{ ...input, flex: 1, minWidth: 0 }} disabled={phase !== "setup"}>
                  <option value="">기본 카메라</option>
                  {cams.map((c) => <option key={c.deviceId} value={c.deviceId}>{(c.label || "카메라") + (camScore(c) === 1 ? " (가상 카메라)" : camScore(c) === 2 ? " (얼굴 인식용)" : "")}</option>)}
                </select>
                <SettingsBtn what="camera" onOpen={setSetOpened} />
              </div>
              {setOpened === "camera" && <SettingsNote what="camera" />}
              {camErr && (
                <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 6, background: "rgba(239,68,68,0.10)", border: `1px solid ${C.danger}`, fontSize: 13.5, lineHeight: 1.6 }}>
                  {camErr === "denied" ? <>윈도우에서 <b>카메라 사용이 꺼져 있어요.</b> [설정] → [개인 정보 및 보안] → [카메라]에서 <b>“데스크톱 앱이 카메라에 액세스하도록 허용”</b>을 켜 주세요.</>
                    : camErr === "busy" ? <><b>카메라를 열 수 없어요.</b> 다른 프로그램(줌·팀즈·카카오톡 영상통화 등)이 카메라를 쓰고 있거나, 노트북의 <b>카메라 끄기 키</b>(카메라 그림 키)·<b>렌즈 가림막</b>이 닫혀 있을 수 있어요.</>
                    : camErr === "none" ? <><b>카메라를 찾지 못했어요.</b> 노트북의 카메라 끄기 키·렌즈 가림막을 확인하거나, 외장 카메라면 다시 꽂아 주세요.</>
                    : <>카메라를 열지 못했어요 ({camErr.replace("other:", "") || "알 수 없음"}). 노트북을 다시 켜 보거나 다른 카메라를 골라 주세요.</>}
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    {camErr !== "busy" && b.openSettings && <Btn small primary={camErr === "denied"} onClick={() => b.openSettings!("camera")}>윈도우 카메라 설정 열기</Btn>}
                    <Btn small onClick={() => void probeDevices()}>다시 찾기</Btn>
                    <span style={{ fontSize: 12, color: C.dim, alignSelf: "center" }}>고치면 저절로 다시 잡아요</span>
                  </div>
                </div>
              )}
            </div>
          )}
          {mode === "both" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                <span style={{ ...label, flex: 1 }}>화면 배치</span>
                {camBox.layout !== "pip" && (
                  <button type="button" onClick={() => setCamBox({ ...camBox, swap: !camBox.swap })} style={{ height: 28, padding: "0 10px", borderRadius: 4, border: `1px solid ${C.line2}`, background: "transparent", color: C.sub, fontSize: 12.5, fontFamily: FONT, cursor: "pointer" }}>⇄ 자리 바꾸기</button>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {([["pip", "기본"], ["lr", "좌우 반반"], ["tb", "상하 반반"]] as const).map(([v, t]) => {
                  const on = camBox.layout === v;
                  const box = (s: React.CSSProperties): React.CSSProperties => ({ position: "absolute", borderRadius: 2, ...s });
                  const scr = on ? "#9ca3af" : "#6b7280", camC = on ? C.accent : "#9ca3af";
                  return (
                    <button key={v} type="button" onClick={() => setCamBox({ ...camBox, layout: v })} style={{ padding: 6, borderRadius: 5, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? "rgba(59,130,246,0.12)" : "transparent", color: on ? C.text : C.sub, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                      {/* 배치 모양 그림 — 회색: 화면, 색: 카메라 */}
                      <span style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: "#111", borderRadius: 3 }}>
                        {v === "pip" && <><span style={box({ inset: 2, background: scr })} /><span style={box({ right: 4, bottom: 4, width: "26%", aspectRatio: "1", borderRadius: "50%", background: camC })} /></>}
                        {v === "lr" && <><span style={box({ left: 2, top: 2, bottom: 2, width: "calc(50% - 3px)", background: scr })} /><span style={box({ right: 2, top: 2, bottom: 2, width: "calc(50% - 3px)", background: camC })} /></>}
                        {v === "tb" && <><span style={box({ left: 2, right: 2, top: 2, height: "calc(50% - 3px)", background: scr })} /><span style={box({ left: 2, right: 2, bottom: 2, height: "calc(50% - 3px)", background: camC })} /></>}
                      </span>
                      {t}
                    </button>
                  );
                })}
              </div>
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  {camBox.layout === "pip" && <>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13.5, color: C.sub, width: 64, flexShrink: 0 }}>모양</span>
                    {([["circle", "원"], ["square", "사각형"]] as const).map(([v, t]) => (
                      <button key={v} type="button" onClick={() => setCamBox({ ...camBox, shape: v })} style={{ height: 28, padding: "0 12px", borderRadius: 4, border: `1px solid ${camBox.shape === v ? C.accent : C.line2}`, background: camBox.shape === v ? C.accent : "transparent", color: camBox.shape === v ? "#fff" : C.sub, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>{t}</button>
                    ))}
                    <span style={{ flex: 1 }} />
                    <button type="button" onClick={() => setCamBox(CAM_DEFAULT)} style={{ height: 28, padding: "0 10px", borderRadius: 4, border: `1px solid ${C.line2}`, background: "transparent", color: C.sub, fontSize: 12.5, fontFamily: FONT, cursor: "pointer" }}>처음대로</button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13.5, color: C.sub, width: 64, flexShrink: 0 }}>크기</span>
                    <input type="range" min={80} max={400} value={camBox.r} onChange={(e) => setCamBox({ ...camBox, r: Number(e.target.value) })} style={{ flex: 1, accentColor: C.accent }} />
                  </div>
                  </>}
                  {camBox.layout !== "pip" && (
                    // 반반 — 화면 칸 확대 (미리보기에서 끌면 보일 곳이 옮겨져요)
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13.5, color: C.sub, width: 64, flexShrink: 0 }}>화면 확대</span>
                      <input type="range" min={1} max={3} step={0.05} value={camBox.sz} onChange={(e) => setCamBox({ ...camBox, sz: Number(e.target.value) })} style={{ flex: 1, accentColor: C.accent }} />
                      <span style={{ fontSize: 12.5, color: C.sub, width: 38, textAlign: "right" }}>{Math.round(camBox.sz * 100)}%</span>
                      <button type="button" onClick={() => setCamBox({ ...camBox, sx: 0.5, sy: 0.5, sz: 1 })} title="화면을 가운데·처음 크기로" style={{ height: 26, padding: "0 8px", borderRadius: 4, border: `1px solid ${C.line2}`, background: "transparent", color: C.sub, fontSize: 12, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" }}>가운데로</button>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13.5, color: C.sub, width: 64, flexShrink: 0 }}>{camBox.layout === "pip" ? "테두리" : "가운데 선"}</span>
                    <input type="range" min={0} max={30} value={camBox.line} onChange={(e) => setCamBox({ ...camBox, line: Number(e.target.value) })} style={{ flex: 1, accentColor: C.accent }} />
                    <span style={{ fontSize: 12.5, color: C.sub, width: 30, textAlign: "right" }}>{camBox.line ? camBox.line : "없음"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13.5, color: C.sub, width: 64, flexShrink: 0 }}>{camBox.layout === "pip" ? "테두리 색" : "선 색"}</span>
                    {CAM_COLORS.map((c) => (
                      <button key={c} type="button" title={c} onClick={() => setCamBox({ ...camBox, color: c })} style={{ width: 22, height: 22, padding: 0, borderRadius: 11, background: c, border: `2px solid ${camBox.color.toLowerCase() === c ? C.accent : C.line2}`, outline: camBox.color.toLowerCase() === c ? `2px solid ${C.accent}` : "none", outlineOffset: 1, cursor: "pointer" }} />
                    ))}
                    <input type="color" value={camBox.color} onChange={(e) => setCamBox({ ...camBox, color: e.target.value })} title="다른 색 고르기" style={{ width: 26, height: 24, padding: 0, border: "none", background: "transparent", cursor: "pointer" }} />
                  </div>
                  <div style={{ fontSize: 12, color: C.dim }}>{camBox.layout === "pip" ? "미리보기에서 카메라를 끌어 옮기고, 흰 점을 끌어 크기를 바꿔요. 녹화 중에는 흰 점이 숨고, 크기 막대로 바꿀 수 있어요." : "화면과 카메라 모두 칸을 꽉 채워요. 미리보기에서 화면을 끌면 보일 곳이 옮겨지고, [화면 확대]로 더 크게 볼 수 있어요. 녹화 중에도 바로 바뀌어요."}</div>
                </div>
            </div>
          )}
          <div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <span style={{ ...label, flex: 1 }}>마이크</span>
              <span style={{ fontSize: 13, color: C.sub, marginRight: 6 }}>자동 조절</span>
              <Toggle on={micAuto} onChange={setMicAuto} disabled={phase !== "setup" || micMuted} />
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <select value={mic} onChange={(e) => setMic(e.target.value)} style={{ ...input, flex: 1, minWidth: 0 }} disabled={phase !== "setup" || micMuted}>
                <option value="">기본 마이크</option>
                {mics.map((m) => <option key={m.deviceId} value={m.deviceId}>{m.label || "마이크"}</option>)}
              </select>
              <SettingsBtn what="microphone" onOpen={setSetOpened} />
            </div>
            {setOpened === "microphone" && <SettingsNote what="microphone" />}
            <VolumeControl muted={micMuted} value={micVol} onMute={setMicMuted} onVolume={(v) => { setMicVol(v); if (v > 0) setMicMuted(false); }} />
            {micOn && <MicMeter deviceId={mic} gain={micVol} auto={micAuto} />}
            {micErr && !micMuted && (
              <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 6, background: "rgba(239,68,68,0.10)", border: `1px solid ${C.danger}`, fontSize: 13.5, lineHeight: 1.6 }}>
                {micErr === "denied" ? <>윈도우에서 <b>마이크 사용이 꺼져 있어요.</b> [설정] → [개인 정보 및 보안] → [마이크]에서 <b>“데스크톱 앱이 마이크에 액세스하도록 허용”</b>을 켜 주세요.</>
                  : micErr === "busy" ? <><b>마이크를 열 수 없어요.</b> 다른 프로그램(줌·팀즈·카카오톡 통화 등)이 마이크를 쓰고 있을 수 있어요. 그 프로그램을 닫아 주세요.</>
                  : micErr === "none" ? <><b>마이크를 찾지 못했어요.</b> 이어폰·헤드셋 마이크면 다시 꽂아 주세요. 노트북 마이크 끄기 키가 있는지도 확인해 주세요.</>
                  : <>마이크를 열지 못했어요 ({micErr.replace("other:", "") || "알 수 없음"}). 다른 마이크를 골라 주세요.</>}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                  {micErr !== "busy" && b.openSettings && <Btn small primary={micErr === "denied"} onClick={() => b.openSettings!("microphone")}>윈도우 마이크 설정 열기</Btn>}
                  <Btn small onClick={() => void probeDevices()}>다시 찾기</Btn>
                  <span style={{ fontSize: 12, color: C.dim }}>고치면 저절로 다시 잡아요</span>
                </div>
              </div>
            )}
          </div>
          <div>
            <div style={{ ...label, marginBottom: 8 }}>PC 소리 <span style={{ color: C.dim, fontWeight: 600 }}>· 컴퓨터에서 나는 소리 (영상·음악 등)</span></div>
            <VolumeControl muted={pcMuted} value={pcVol} onMute={setPcMuted} onVolume={(v) => { setPcVol(v); if (v > 0) setPcMuted(false); }} />
            {phase !== "setup" && pcMuted !== false && <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>녹화를 시작할 때 무음이었으면 녹화 중에 켤 수 없어요.</div>}
          </div>
          {err && <div style={{ color: C.danger, fontSize: 14.5, lineHeight: 1.5 }}>{err}</div>}
          {b.record.defaultDir && (
            <div>
              <div style={{ ...label, marginBottom: 8 }}>저장</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 13.5, color: C.sub, width: 52, flexShrink: 0 }}>폴더</span>
                <span title={dirShown} style={{ flex: 1, minWidth: 0, fontSize: 13, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dirShown || "…"}</span>
                <button type="button" disabled={phase !== "setup"} onClick={async () => { const d = await b.record.pickDir?.(dirShown); if (d) setSaveDir(d === defaultDir ? "" : d); }} style={{ height: 28, padding: "0 10px", borderRadius: 4, border: `1px solid ${C.line2}`, background: "transparent", color: C.sub, fontSize: 12.5, fontFamily: FONT, cursor: "pointer", flexShrink: 0 }}>바꾸기</button>
                <button type="button" onClick={() => dirShown && b.openPath(dirShown)} style={{ height: 28, padding: "0 10px", borderRadius: 4, border: `1px solid ${C.line2}`, background: "transparent", color: C.sub, fontSize: 12.5, fontFamily: FONT, cursor: "pointer", flexShrink: 0 }}>폴더 열기</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13.5, color: C.sub, width: 52, flexShrink: 0 }}>파일 이름</span>
                <input value={fileName} onChange={(e) => setFileName(e.target.value)} disabled={phase !== "setup"} placeholder={`비우면 자동 (${mode === "camera" ? "카메라 녹화" : "화면 녹화"}_날짜·시각)`} style={{ ...input, height: 34, fontSize: 13.5, flex: 1, minWidth: 0 }} />
                <span style={{ fontSize: 13, color: C.dim, flexShrink: 0 }}>.mp4</span>
              </div>
              {saveDir && <button type="button" disabled={phase !== "setup"} onClick={() => setSaveDir("")} style={{ marginTop: 6, padding: 0, border: 0, background: "transparent", color: C.dim, fontSize: 12, fontFamily: FONT, cursor: "pointer", textDecoration: "underline" }}>기본 폴더로 되돌리기</button>}
            </div>
          )}
          <Hint>[녹화 시작]을 누르면 3초 뒤 녹화돼요. 끝나면 [녹화 끝내기]를 누르세요. 바로 편집 화면으로 가요.</Hint>
        </div>
        {/* 왼쪽 설정이 길어도 미리보기는 위에 붙어 따라온다 (늘어난 칸 한가운데로 내려가지 않게) */}
        <div style={{ flex: 1, minWidth: 0, position: "sticky", top: 0, alignSelf: "flex-start", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ position: "relative", background: "#000", borderRadius: 6, minHeight: 360, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* 화면 + 카메라는 녹화 캔버스(1920×1080)와 같은 비율 — 카메라 원을 같은 자리·크기로 겹쳐 끌 수 있게 */}
          <div ref={stage} style={{ position: "relative", width: "100%", aspectRatio: mode === "both" ? "16 / 9" : undefined, containerType: "inline-size", display: phase !== "setup" || live ? "block" : "none" }}>
            <video ref={bindPreview} playsInline style={{ width: "100%", height: mode === "both" ? "100%" : undefined, maxHeight: 520, objectFit: "contain", display: phase === "setup" ? "none" : "block" }} />
            <video ref={liveVid} playsInline muted style={split ? (() => {
              const lv = liveVid.current;
              const [bx, by, bw, bh] = panRect(split.scr, lv?.videoWidth || 1920, lv?.videoHeight || 1080, camBox);
              const [X, Y, W, H] = split.scr;
              const pc = (v: number, d: number) => `${Math.max(0, (v / d) * 100).toFixed(3)}%`;
              return { position: "absolute", ...rectPct([bx, by, bw, bh]), objectFit: "fill", clipPath: `inset(${pc(Y - by, bh)} ${pc(bx + bw - X - W, bw)} ${pc(by + bh - Y - H, bh)} ${pc(X - bx, bw)})`, display: phase === "setup" ? "block" : "none" } as React.CSSProperties;
            })() : { width: "100%", height: mode === "both" ? "100%" : undefined, maxHeight: 520, objectFit: "contain", display: phase === "setup" ? "block" : "none" }} />
            {/* 반반 화면 칸 — 끌어서 보일 곳 옮기기 (녹화 중에도) */}
            {split && <div onPointerDown={dragPan} title="끌어서 보일 곳 옮기기" style={{ position: "absolute", ...rectPct(split.scr), cursor: "grab", touchAction: "none" }} />}
            {split && phase === "setup" && camBox.line > 0 && (
              <div style={{ position: "absolute", background: camBox.color, ...(camBox.layout === "lr" ? { left: `calc(50% - ${(camBox.line / 2 / 1920) * 100}cqw)`, top: 0, bottom: 0, width: `${(camBox.line / 1920) * 100}cqw` } : { top: `calc(50% - ${(camBox.line / 2 / 1920) * 100}cqw)`, left: 0, right: 0, height: `${(camBox.line / 1920) * 100}cqw` }) }} />
            )}
            {mode === "both" && (
              <div
                onPointerDown={split ? undefined : (e) => dragCam(e, "move")}
                title={split ? undefined : "끌어서 옮기기"}
                style={split
                  ? { position: "absolute", ...rectPct(split.cam), display: phase === "setup" && camLive ? "block" : "none" }
                  : { position: "absolute", left: `${((camBox.cx - camBox.r) / 1920) * 100}%`, top: `${((camBox.cy - camBox.r) / 1080) * 100}%`, width: `${((camBox.r * 2) / 1920) * 100}%`, aspectRatio: "1", cursor: "move", touchAction: "none", display: phase !== "setup" || camLive ? "block" : "none" }}
              >
                {/* 녹화 중에는 캔버스에 이미 카메라가 그려지니 잡는 자리만. 두께·둥글기는 캔버스 px → 미리보기 너비 비율(cqw) */}
                <div style={{ position: "absolute", inset: 0, borderRadius: split ? 0 : camBox.shape === "circle" ? "50%" : `${(CAM_ROUND / 1920) * 100}cqw`, overflow: "hidden", border: !split && phase === "setup" && camBox.line ? `${(camBox.line / 1920) * 100}cqw solid ${camBox.color}` : "none", background: phase === "setup" ? "#222" : "transparent" }}>
                  <video ref={camVid} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: phase === "setup" ? "block" : "none" }} />
                  {phase === "setup" && camStill && noCamUrl && <img src={noCamUrl} alt="카메라 없음" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                {/* 크기 점은 녹화 전에만 — 녹화하는 모니터에 이 창이 있으면 점까지 찍히니까 */}
                {!split && phase === "setup" && <div onPointerDown={(e) => dragCam(e, "size")} title="끌어서 크기 바꾸기" style={{ position: "absolute", right: camBox.shape === "circle" ? "14.6%" : "0%", bottom: camBox.shape === "circle" ? "14.6%" : "0%", width: 14, height: 14, transform: "translate(50%, 50%)", borderRadius: 7, background: "#fff", border: `2px solid ${C.accent}`, cursor: "nwse-resize", touchAction: "none" }} />}
              </div>
            )}
          </div>
          {phase === "setup" && live && mode === "camera" && camStill && (
            <div title="카메라 화면이 멈춰 있어요 (가상 카메라) — 이 그림으로 녹화돼요" style={{ position: "absolute", inset: 0, borderRadius: 6, overflow: "hidden", background: "#1b2559" }}>
              {noCamUrl && <img src={noCamUrl} alt="카메라 없음" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />}
            </div>
          )}
          {phase === "setup" && live && (
            <span style={{ position: "absolute", left: 12, top: 10, padding: "3px 10px", borderRadius: 4, background: "rgba(0,0,0,0.65)", color: "#fff", fontSize: 13, fontWeight: 700 }}>
              {mode === "camera" ? "카메라 미리보기" : `${sources.find((x) => x.id === liveTarget)?.name || "모니터"} 미리보기`}
            </span>
          )}
          {phase === "setup" && !live && <span style={{ color: C.sub, fontSize: 15 }}>모니터에 마우스를 올리면 여기에 보여요</span>}
          {phase === "count" && <span style={{ position: "absolute", fontSize: 96, fontWeight: 800, color: "#fff" }}>{count}</span>}
          {phase === "rec" && <span style={{ position: "absolute", left: 14, top: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 800, color: "#fff" }}><span style={{ width: 12, height: 12, borderRadius: 6, background: C.danger }} />녹화 중 {fmtTime(sec, false)}</span>}
        </div>
        {phase === "setup" ? (
          <PrompterPanel value={pr} onChange={setPr} disabled={false} rehearsing={prOpen} onRehearse={() => (prOpen ? closePrompter() : openPrompter(Date.now() + 3000, true))} />
        ) : prUse && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 6, border: `1px solid ${C.line2}`, background: C.card, fontSize: 14.5 }}>
            <Icon name="text" size={18} />
            <span style={{ flex: 1 }}>{prOpen ? "프롬프터는 녹화하는 모니터 위쪽 창에 떠 있어요 (녹화에는 안 찍혀요)" : "프롬프터 창을 닫았어요"}</span>
            {prOpen && b.record.prompterShow && <Btn small onClick={() => void b.record.prompterShow?.()}>프롬프터 보이기</Btn>}
            {!prOpen && <Btn small primary onClick={() => openPrompter(0)}>프롬프터 다시 열기</Btn>}
          </div>
        )}
        </div>
      </div>
    </Modal>
  );
  // 녹화 중 녹화하기 창이 따로 떠 있으면 그 창에, 아니면 앱 안에
  return <>{miniView}{bigWin ? createPortal(dialog, bigWin.root) : dialog}</>;
}
