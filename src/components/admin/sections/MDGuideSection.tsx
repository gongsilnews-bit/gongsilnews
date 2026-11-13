"use client";
// 최고관리자 MD지침서 — docs/ 폴더를 1차·2차 카테고리로 정리·열람·편집 (2026-11-11)
import React, { useState, useEffect, useCallback } from "react";
import type { AdminTheme } from "./types";
import {
  listMdFiles,
  readMdFile,
  saveMdFile,
  deleteMdFile,
  getMdCategoryMap,
  saveMdCategoryMap,
  getFileMetaMap,
  updateFileMeta,
  type CategoryMap,
  type FileMetaMap,
} from "@/app/actions/mdGuide";

/* ── 단순 마크다운 뷰어 (외부 라이브러리 없음) ──────────── */
// 표: | 칸 | 칸 | 줄이 이어지면 표로. 둘째 줄 |---|---| 는 머리 구분 (2026-11-13 사장님 "표도 넣을 수 있게")
const isRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isSep = (l: string) => /^\s*\|(\s*:?-{2,}:?\s*\|)+\s*$/.test(l);
const cells = (l: string) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
function MdTable({ rows }: { rows: string[] }) {
  const hasHead = rows.length > 1 && isSep(rows[1]);
  const head = hasHead ? cells(rows[0]) : null;
  const body = (hasHead ? rows.slice(2) : rows).filter((r) => !isSep(r)).map(cells);
  const td: React.CSSProperties = { border: "1px solid #cbd5e1", padding: "7px 12px", textAlign: "left", verticalAlign: "top" };
  return (
    <div style={{ overflowX: "auto", margin: "10px 0" }}>
      <table style={{ borderCollapse: "collapse", fontSize: 13.5, minWidth: "60%" }}>
        {head && <thead><tr>{head.map((c, j) => <th key={j} style={{ ...td, background: "#eef2f7", fontWeight: 800, color: "#0f2b5b" }}>{renderInline(c)}</th>)}</tr></thead>}
        <tbody>{body.map((r, i) => <tr key={i} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>{r.map((c, j) => <td key={j} style={td}>{renderInline(c)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function MdViewer({ content }: { content: string }) {
  const raw = content.split("\n");
  // 표 줄은 한 덩어리로 묶는다
  const lines: (string | { table: string[] })[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (isRow(raw[i])) { const t: string[] = []; while (i < raw.length && isRow(raw[i])) t.push(raw[i++]); i--; lines.push({ table: t }); }
    else lines.push(raw[i]);
  }
  return (
    <div style={{ fontFamily: "inherit", lineHeight: 1.75, color: "#1e293b", fontSize: 14 }}>
      {lines.map((line, i) => {
        if (typeof line !== "string") return <MdTable key={i} rows={line.table} />;
        if (line.startsWith("### ")) return <h3 key={i} style={{ margin: "16px 0 6px", fontSize: 15, fontWeight: 700, color: "#1e3a6e" }}>{line.slice(4)}</h3>;
        if (line.startsWith("## ")) return <h2 key={i} style={{ margin: "20px 0 8px", fontSize: 17, fontWeight: 800, color: "#0f2b5b", borderBottom: "1px solid #e2e8f0", paddingBottom: 4 }}>{line.slice(3)}</h2>;
        if (line.startsWith("# ")) return <h1 key={i} style={{ margin: "24px 0 10px", fontSize: 20, fontWeight: 900, color: "#0f172a", borderBottom: "2px solid #1e3a6e", paddingBottom: 6 }}>{line.slice(2)}</h1>;
        if (line.startsWith("- ") || line.startsWith("* ")) return <div key={i} style={{ marginLeft: 16 }}>• {renderInline(line.slice(2))}</div>;
        if (line.startsWith("  - ") || line.startsWith("  * ")) return <div key={i} style={{ marginLeft: 32 }}>◦ {renderInline(line.slice(4))}</div>;
        if (line === "") return <div key={i} style={{ height: 8 }} />;
        if (line.startsWith("```")) return <div key={i} style={{ fontFamily: "monospace", background: "#f1f5f9", padding: "2px 6px", borderRadius: 3, fontSize: 12, color: "#475569" }}>{line}</div>;
        if (line.startsWith(">")) return <blockquote key={i} style={{ borderLeft: "3px solid #94a3b8", paddingLeft: 12, color: "#64748b", margin: "4px 0" }}>{line.slice(1).trim()}</blockquote>;
        return <div key={i}>{renderInline(line)}</div>;
      })}
    </div>
  );
}

/* 글씨 색·형광펜 (2026-11-13 사장님) — [빨강]글자[/] · ==형광펜== · [형광노랑]글자[/]
   AI(Aside)도 같은 표시로 쓰면 그대로 보인다. 다른 곳에서 열면 표시 글자만 보일 뿐 깨지지 않는다 */
const TEXT_COLORS: Record<string, string> = { 빨강: "#dc2626", 파랑: "#2563eb", 초록: "#16a34a", 주황: "#ea580c", 보라: "#7c3aed", 회색: "#6b7280" };
const MARKS: Record<string, string> = { 형광노랑: "#fef08a", 형광초록: "#bbf7d0", 형광분홍: "#fbcfe8", 형광파랑: "#bae6fd" };

/** 인라인 처리 — **굵게** · 글씨 색 · 형광펜 */
function renderInline(text: string, depth = 0): React.ReactNode {
  if (depth > 3) return text;
  const names = [...Object.keys(TEXT_COLORS), ...Object.keys(MARKS)].join("|");
  const re = new RegExp(`(\\*\\*[^*]+\\*\\*|==[^=]+==|\\[(?:${names})\\][\\s\\S]*?\\[\\/\\])`, "g");
  const parts = text.split(re).filter((x) => x !== undefined && x !== "");
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={i}>{renderInline(part.slice(2, -2), depth + 1)}</strong>;
    if (part.startsWith("==") && part.endsWith("==") && part.length > 4) return <mark key={i} style={{ background: MARKS.형광노랑, color: "inherit", padding: "0 2px", borderRadius: 2 }}>{renderInline(part.slice(2, -2), depth + 1)}</mark>;
    const m = part.match(/^\[([^\]]+)\]([\s\S]*?)\[\/\]$/);
    if (m && TEXT_COLORS[m[1]]) return <span key={i} style={{ color: TEXT_COLORS[m[1]], fontWeight: 600 }}>{renderInline(m[2], depth + 1)}</span>;
    if (m && MARKS[m[1]]) return <mark key={i} style={{ background: MARKS[m[1]], color: "inherit", padding: "0 2px", borderRadius: 2 }}>{renderInline(m[2], depth + 1)}</mark>;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

/* ── 메인 섹션 ──────────────────────────────────────────── */
export default function MDGuideSection({ theme, userName }: { theme: AdminTheme; userName?: string }) {
  const [allFiles, setAllFiles] = useState<string[]>([]);
  const [catMap, setCatMap] = useState<CategoryMap>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedCat1, setSelectedCat1] = useState<string | null>(null);
  const [selectedCat2, setSelectedCat2] = useState<string | null>(null);  // null = 미분류
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [showAssign, setShowAssign] = useState(false);
  const [assignC1, setAssignC1] = useState("");
  const [assignC2, setAssignC2] = useState("");
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCat1, setNewCat1] = useState("");
  const [newCat2, setNewCat2] = useState("");
  const [metaMap, setMetaMap] = useState<FileMetaMap>({});
  // 카테고리 이름 바꾸기·삭제 (2026-11-11 사장님) — 줄에 마우스를 올리면 ✎ · 🗑
  const [hoverCat, setHoverCat] = useState("");
  const [renaming, setRenaming] = useState<{ c1: string; c2?: string; name: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [filesRes, mapRes, metaRes] = await Promise.all([listMdFiles(), getMdCategoryMap(), getFileMetaMap()]);
    if (filesRes.success) setAllFiles(filesRes.files);
    if (mapRes.success) {
      setCatMap(mapRes.map);
      // 1차 카테고리는 펼쳐서 — 다시 불러올 때 사용자가 접어 둔 것은 그대로
      setExpanded((prev) => { const exp = { ...prev }; Object.keys(mapRes.map).forEach((k) => { if (exp[k] === undefined) exp[k] = true; }); return exp; });
    }
    if (metaRes.success) setMetaMap(metaRes.map);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  // 다른 창(클로드가 문서를 넣는 동안 등)에 다녀오면 최신 목록으로 — 예전 목록으로 저장해 배정이 지워지던 것 (2026-11-12)
  useEffect(() => {
    const on = () => { if (document.visibilityState === "visible") void load(); };
    window.addEventListener("focus", on);
    document.addEventListener("visibilitychange", on);
    return () => { window.removeEventListener("focus", on); document.removeEventListener("visibilitychange", on); };
  }, [load]);

  /* 분류된 파일 집합 */
  const categorizedSet = useCallback((): Set<string> => {
    const s = new Set<string>();
    Object.values(catMap).forEach((subs) =>
      Object.values(subs).forEach((files) => files.forEach((f) => s.add(f)))
    );
    return s;
  }, [catMap]);

  /* 파일 목록 계산 */
  const getFiles = (): string[] => {
    if (selectedCat1 === null) {
      // 미분류
      const cat = categorizedSet();
      return allFiles.filter((f) => !cat.has(f));
    }
    if (selectedCat2 === null) {
      // 1차 카테고리 전체
      return Object.values(catMap[selectedCat1] || {}).flat();
    }
    return catMap[selectedCat1]?.[selectedCat2] || [];
  };

  /* 파일 열기 */
  const openFile = async (fp: string) => {
    setLoading(true);
    setSelectedFile(fp);
    setEditing(false);
    setMsg("");
    const res = await readMdFile(fp);
    setFileContent(res.success ? res.content : res.content);
    setLoading(false);
  };

  /* 저장 */
  const saveFile = async () => {
    if (!selectedFile) return;
    setLoading(true);
    const res = await saveMdFile(selectedFile, editContent);
    setMsg(res.success ? "저장했습니다." : res.error || "저장 실패");
    if (res.success) {
      setFileContent(editContent);
      setEditing(false);
      await updateFileMeta(selectedFile, { author: userName });
      const metaRes = await getFileMetaMap();
      if (metaRes.success) setMetaMap(metaRes.map);
    }
    setLoading(false);
  };

  /* 삭제 */
  const deleteFile = async (fp: string) => {
    if (!window.confirm(`"${fp}" 파일을 삭제할까요?\n되돌릴 수 없습니다.`)) return;
    setLoading(true);
    const res = await deleteMdFile(fp);
    setMsg(res.success ? "삭제했습니다." : res.error || "삭제 실패");
    if (res.success) {
      // 카테고리 맵에서도 제거
      const newMap: CategoryMap = JSON.parse(JSON.stringify(catMap));
      Object.keys(newMap).forEach((c1) =>
        Object.keys(newMap[c1]).forEach((c2) => {
          newMap[c1][c2] = newMap[c1][c2].filter((f) => f !== fp);
        })
      );
      setCatMap(newMap);
      await saveMdCategoryMap(newMap);
      setAllFiles((prev) => prev.filter((f) => f !== fp));
      if (selectedFile === fp) { setSelectedFile(null); setFileContent(""); }
    }
    setLoading(false);
  };

  /* 새 파일 만들기 */
  const createFile = async () => {
    if (!newFileName.trim()) return;
    const name = newFileName.trim().endsWith(".md") ? newFileName.trim() : `${newFileName.trim()}.md`;
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const fp = name.includes("/") ? name : `${today}_${name}`;
    const res = await saveMdFile(fp, `# ${name.replace(".md", "")}\n\n`);
    setMsg(res.success ? "파일을 만들었습니다." : res.error || "만들기 실패");
    if (res.success) {
      await updateFileMeta(fp, { author: userName, isNew: true });
      const metaRes = await getFileMetaMap();
      if (metaRes.success) setMetaMap(metaRes.map);
      setAllFiles((prev) => [...prev, fp]);
      setShowNewFile(false);
      setNewFileName("");
      await openFile(fp);
    }
    setLoading(false);
  };

  /* 카테고리에 파일 배정 */
  const assignFile = async () => {
    if (!selectedFile || !assignC1 || !assignC2) return;
    const newMap: CategoryMap = JSON.parse(JSON.stringify(catMap));
    // 기존 배정 제거
    Object.keys(newMap).forEach((c1) =>
      Object.keys(newMap[c1]).forEach((c2) => {
        newMap[c1][c2] = newMap[c1][c2].filter((f) => f !== selectedFile);
      })
    );
    if (!newMap[assignC1]) newMap[assignC1] = {};
    if (!newMap[assignC1][assignC2]) newMap[assignC1][assignC2] = [];
    newMap[assignC1][assignC2].push(selectedFile);
    setCatMap(newMap);
    await saveMdCategoryMap(newMap);
    setShowAssign(false);
    setMsg(`"${assignC2}" 카테고리에 넣었습니다.`);
  };

  /* 새 카테고리 추가 */
  const addCategory = async () => {
    // 이름 앞뒤 빈칸은 뺀다 — "공실뉴스 "처럼 끝에 빈칸이 붙어 같은 이름이 둘 생기던 것 (2026-11-11)
    const c1 = newCat1.trim(), c2 = newCat2.trim();
    if (!c1) return;
    const newMap: CategoryMap = JSON.parse(JSON.stringify(catMap));
    if (!newMap[c1]) newMap[c1] = {};
    if (c2 && !newMap[c1][c2]) newMap[c1][c2] = [];
    setCatMap(newMap);
    setExpanded((prev) => ({ ...prev, [c1]: true }));
    await saveMdCategoryMap(newMap);
    setShowAddCat(false);
    setNewCat1(""); setNewCat2("");
    setMsg("카테고리를 추가했습니다.");
  };

  /* 카테고리 이름 바꾸기 — 안의 문서는 그대로 따라간다. 순서도 그대로 */
  const renameCategory = async () => {
    if (!renaming) return;
    const { c1, c2 } = renaming;
    const name = renaming.name.trim();
    const old = c2 ?? c1;
    if (!name || name === old) { setRenaming(null); return; }
    const siblings = c2 === undefined ? Object.keys(catMap) : Object.keys(catMap[c1] || {});
    if (siblings.includes(name)) { setMsg(`"${name}" 카테고리가 이미 있어요.`); return; }
    const newMap: CategoryMap = c2 === undefined
      ? Object.fromEntries(Object.entries(catMap).map(([k, v]) => [k === c1 ? name : k, v]))
      : { ...catMap, [c1]: Object.fromEntries(Object.entries(catMap[c1] || {}).map(([k, v]) => [k === c2 ? name : k, v])) };
    setCatMap(newMap);
    if (c2 === undefined) { setExpanded((p) => ({ ...p, [name]: p[c1] ?? true })); if (selectedCat1 === c1) setSelectedCat1(name); }
    else if (selectedCat1 === c1 && selectedCat2 === c2) setSelectedCat2(name);
    setRenaming(null);
    const r = await saveMdCategoryMap(newMap);
    setMsg(r.success ? `이름을 "${name}"(으)로 바꿨습니다.` : r.error || "저장 실패");
  };

  /* 카테고리 삭제 — 문서는 지우지 않고 미분류로 */
  const deleteCategory = async (c1: string, c2?: string) => {
    const n = c2 === undefined ? Object.values(catMap[c1] || {}).flat().length : (catMap[c1]?.[c2] || []).length;
    const label = c2 === undefined ? `"${c1}" 카테고리(안의 2차 카테고리 포함)` : `"${c1} › ${c2}" 카테고리`;
    if (!window.confirm(`${label}를 삭제할까요?${n ? `\n안의 문서 ${n}개는 지우지 않고 미분류로 옮겨요.` : ""}`)) return;
    const newMap: CategoryMap = JSON.parse(JSON.stringify(catMap));
    if (c2 === undefined) delete newMap[c1];
    else delete newMap[c1][c2];
    setCatMap(newMap);
    if (selectedCat1 === c1 && (c2 === undefined || selectedCat2 === c2)) { setSelectedCat1(null); setSelectedCat2(null); setSelectedFile(null); }
    const r = await saveMdCategoryMap(newMap);
    setMsg(r.success ? `카테고리를 삭제했습니다.${n ? ` 문서 ${n}개는 미분류로 옮겼어요.` : ""}` : r.error || "저장 실패");
  };

  /* 고른 글자를 표시로 감싼다 — 고른 게 없으면 표시만 넣고 그 사이에 커서 */
  const wrapSel = (open: string, close: string) => {
    const ta = document.getElementById("md-edit-ta") as HTMLTextAreaElement | null;
    const a = ta ? ta.selectionStart : editContent.length, b = ta ? ta.selectionEnd : editContent.length;
    const next = editContent.slice(0, a) + open + editContent.slice(a, b) + close + editContent.slice(b);
    setEditContent(next);
    requestAnimationFrame(() => { if (!ta) return; ta.focus(); ta.selectionStart = a + open.length; ta.selectionEnd = b + open.length; });
  };

  /* 순서 바꾸기 — 카테고리·문서를 ▲▼ 로 한 칸씩 (2026-11-13 사장님 "정렬 위치도 조절할 수 있게") */
  const moveKey = <T,>(obj: Record<string, T>, key: string, dir: -1 | 1): Record<string, T> | null => {
    const keys = Object.keys(obj); const i = keys.indexOf(key); const j = i + dir;
    if (i < 0 || j < 0 || j >= keys.length) return null;
    [keys[i], keys[j]] = [keys[j], keys[i]];
    return Object.fromEntries(keys.map((k) => [k, obj[k]]));
  };
  const moveCategory = async (c1: string, c2: string | undefined, dir: -1 | 1) => {
    let newMap: CategoryMap | null;
    if (c2 === undefined) newMap = moveKey(catMap, c1, dir) as CategoryMap | null;
    else { const sub = moveKey(catMap[c1] || {}, c2, dir); newMap = sub ? { ...catMap, [c1]: sub } : null; }
    if (!newMap) return;
    setCatMap(newMap);
    const r = await saveMdCategoryMap(newMap);
    if (!r.success) setMsg(r.error || "저장 실패");
  };
  const moveFile = async (fp: string, dir: -1 | 1) => {
    const newMap: CategoryMap = JSON.parse(JSON.stringify(catMap));
    for (const subs of Object.values(newMap)) for (const files of Object.values(subs)) {
      const i = files.indexOf(fp); const j = i + dir;
      if (i < 0) continue;
      if (j < 0 || j >= files.length) return;
      [files[i], files[j]] = [files[j], files[i]];
      setCatMap(newMap);
      const r = await saveMdCategoryMap(newMap);
      if (!r.success) setMsg(r.error || "저장 실패");
      return;
    }
  };

  /* 날짜 포맷 (ISO → "2026-11-11 14:30") */
  const fmtDate = (iso?: string): string => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  /* 현재 선택 파일이 속한 카테고리 */
  const fileCategory = (fp: string): string => {
    for (const [c1, subs] of Object.entries(catMap)) {
      for (const [c2, files] of Object.entries(subs)) {
        if (files.includes(fp)) return `${c1} > ${c2}`;
      }
    }
    return "미분류";
  };

  /* ── 스타일 상수 ── */
  const C = {
    primary: "#1e3a6e",
    blue: "#2563eb",
    border: theme.border,
    bg: theme.bg,
    card: theme.cardBg,
    text: theme.textPrimary,
    sub: theme.textSecondary,
  };

  const btnStyle = (active?: boolean): React.CSSProperties => ({
    padding: "5px 12px", borderRadius: 6, border: `1px solid ${active ? C.blue : C.border}`,
    background: active ? C.blue : C.card, color: active ? "#fff" : C.text,
    fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: "inherit",
  });

  /* 카테고리 줄 오른쪽 작은 단추 — ✎ 이름 바꾸기 · 🗑 삭제 */
  const catTools = (c1: string, c2?: string) => (
    <span style={{ display: "flex", gap: 2, paddingRight: 8, flexShrink: 0 }}>
      <button title="위로" onClick={() => void moveCategory(c1, c2, -1)} style={{ width: 20, height: 24, border: "none", borderRadius: 4, background: "transparent", cursor: "pointer", fontSize: 10, color: C.sub }}>▲</button>
      <button title="아래로" onClick={() => void moveCategory(c1, c2, 1)} style={{ width: 20, height: 24, border: "none", borderRadius: 4, background: "transparent", cursor: "pointer", fontSize: 10, color: C.sub }}>▼</button>
      <button title="이름 바꾸기" onClick={() => setRenaming({ c1, c2, name: c2 ?? c1 })} style={{ width: 24, height: 24, border: "none", borderRadius: 4, background: "transparent", cursor: "pointer", fontSize: 13, color: C.sub }}>✎</button>
      <button title="삭제 (문서는 미분류로)" onClick={() => void deleteCategory(c1, c2)} style={{ width: 24, height: 24, border: "none", borderRadius: 4, background: "transparent", cursor: "pointer", fontSize: 13, color: "#dc2626" }}>🗑</button>
    </span>
  );
  /* 이름 고치는 칸 — Enter 저장 · Esc 그만 · 바깥 누르면 저장 */
  const catInput = (sub?: boolean) => (
    <div style={{ padding: sub ? "3px 8px 3px 28px" : "4px 8px 4px 12px" }}>
      <input autoFocus value={renaming?.name || ""} onChange={(e) => setRenaming((r) => (r ? { ...r, name: e.target.value } : r))}
        onKeyDown={(e) => { if (e.key === "Enter") void renameCategory(); if (e.key === "Escape") setRenaming(null); }}
        onBlur={() => void renameCategory()}
        style={{ width: "100%", boxSizing: "border-box", height: 28, padding: "0 8px", border: `1px solid ${C.blue}`, borderRadius: 4, fontSize: sub ? 12 : 13, fontWeight: sub ? 400 : 700, fontFamily: "inherit", color: C.text, background: C.card }} />
    </div>
  );

  const fileList = getFiles();
  const uncatCount = allFiles.filter((f) => !categorizedSet().has(f)).length;

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", background: C.bg }}>
      {/* ── 왼쪽 카테고리 트리 ── */}
      <aside style={{ width: 230, minWidth: 230, background: C.card, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.primary }}>MD 지침서</span>
          <button onClick={() => setShowAddCat(true)} style={{ ...btnStyle(), padding: "3px 8px", fontSize: 11 }} title="카테고리 추가">+ 카테고리</button>
        </div>
        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {Object.entries(catMap).map(([c1, subs]) => {
            const c1Files = Object.values(subs).flat().length;
            return (
              <div key={c1}>
                {/* 1차 카테고리 — 마우스를 올리면 ✎ 이름 바꾸기 · 🗑 삭제 */}
                {renaming && renaming.c1 === c1 && renaming.c2 === undefined ? catInput() : (
                <div onMouseEnter={() => setHoverCat(c1)} onMouseLeave={() => setHoverCat("")} style={{ display: "flex", alignItems: "center", background: selectedCat1 === c1 && selectedCat2 === null ? "#eef2fb" : "transparent" }}>
                <button
                  onClick={() => {
                    setExpanded((p) => ({ ...p, [c1]: !p[c1] }));
                    setSelectedCat1(c1); setSelectedCat2(null); setSelectedFile(null);
                  }}
                  style={{ flex: 1, minWidth: 0, textAlign: "left", padding: "7px 4px 7px 16px", border: "none", background: "transparent", color: C.text, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}
                >
                  <span style={{ fontSize: 10, color: C.sub, marginRight: 2 }}>{expanded[c1] ? "▼" : "▶"}</span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c1}</span>
                  {hoverCat !== c1 && <span style={{ fontSize: 11, color: C.sub, fontWeight: 400 }}>{c1Files}</span>}
                </button>
                {hoverCat === c1 && catTools(c1)}
                </div>
                )}
                {/* 2차 카테고리 */}
                {/* 2차 카테고리 */}
                {expanded[c1] && Object.entries(subs).map(([c2, files]) => (
                  renaming && renaming.c1 === c1 && renaming.c2 === c2 ? <React.Fragment key={c2}>{catInput(true)}</React.Fragment> : (
                  <div key={c2} onMouseEnter={() => setHoverCat(`${c1}/${c2}`)} onMouseLeave={() => setHoverCat("")} style={{ display: "flex", alignItems: "center", background: selectedCat1 === c1 && selectedCat2 === c2 ? "#dbeafe" : "transparent" }}>
                  <button
                    onClick={() => { setSelectedCat1(c1); setSelectedCat2(c2); setSelectedFile(null); }}
                    style={{ flex: 1, minWidth: 0, textAlign: "left", padding: "5px 4px 5px 32px", border: "none", background: "transparent", color: selectedCat1 === c1 && selectedCat2 === c2 ? C.blue : C.text, fontSize: 12, fontWeight: selectedCat1 === c1 && selectedCat2 === c2 ? 700 : 400, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit" }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c2}</span>
                    {hoverCat !== `${c1}/${c2}` && <span style={{ fontSize: 11, color: C.sub }}>{files.length}</span>}
                  </button>
                  {hoverCat === `${c1}/${c2}` && catTools(c1, c2)}
                  </div>
                  )
                ))}
              </div>
            );
          })}
          {/* 미분류 */}
          <button
            onClick={() => { setSelectedCat1(null); setSelectedCat2(null); setSelectedFile(null); }}
            style={{ width: "100%", textAlign: "left", padding: "7px 16px", border: "none", background: selectedCat1 === null ? "#fef9ec" : "transparent", color: selectedCat1 === null ? "#92400e" : C.sub, fontSize: 12, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit", marginTop: 4, borderTop: `1px solid ${C.border}` }}
          >
            <span>미분류</span>
            <span style={{ fontSize: 11 }}>{uncatCount}</span>
          </button>
        </nav>
        <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}` }}>
          <button onClick={() => setShowNewFile(true)} style={{ ...btnStyle(true), width: "100%", justifyContent: "center", display: "flex" }}>+ 새 파일</button>
        </div>
      </aside>

      {/* ── 오른쪽 메인 영역 ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* 상단 툴바 */}
        <div style={{ height: 50, padding: "0 20px", borderBottom: `1px solid ${C.border}`, background: C.card, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {selectedFile ? (
            <>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedFile}</span>
              <span style={{ fontSize: 11, color: C.sub, whiteSpace: "nowrap" }}>{fileCategory(selectedFile)}</span>
              <button onClick={() => { setShowAssign(true); setAssignC1(Object.keys(catMap)[0] || ""); setAssignC2(""); }} style={btnStyle()}>카테고리 배정</button>
              {editing ? (
                <>
                  <button onClick={saveFile} disabled={loading} style={btnStyle(true)}>저장</button>
                  <button onClick={() => { setEditing(false); setEditContent(""); }} style={btnStyle()}>취소</button>
                </>
              ) : (
                <button onClick={() => { setEditing(true); setEditContent(fileContent); }} style={btnStyle()}>편집</button>
              )}
              <button onClick={() => deleteFile(selectedFile)} style={{ ...btnStyle(), color: "#dc2626", borderColor: "#fca5a5" }}>삭제</button>
              <button onClick={() => { setSelectedFile(null); setEditing(false); }} style={btnStyle()}>목록</button>
            </>
          ) : (
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
              {selectedCat1 === null ? "미분류 파일" : selectedCat2 ? `${selectedCat1} › ${selectedCat2}` : selectedCat1}
              <span style={{ fontSize: 12, fontWeight: 400, color: C.sub, marginLeft: 8 }}>({fileList.length}개)</span>
            </span>
          )}
          {msg && <span style={{ fontSize: 12, color: msg.includes("실패") ? "#dc2626" : "#16a34a", marginLeft: "auto" }}>{msg}</span>}
        </div>

        {/* 콘텐츠 */}
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          {loading && <div style={{ color: C.sub, fontSize: 13, textAlign: "center", padding: 40 }}>불러오는 중...</div>}

          {/* 파일 목록 */}
          {!loading && !selectedFile && (
            fileList.length === 0 ? (
              <div style={{ color: C.sub, fontSize: 13, textAlign: "center", padding: 60 }}>
                이 카테고리에 파일이 없습니다.<br />
                <span style={{ fontSize: 12 }}>미분류 탭에서 파일을 선택해 카테고리를 배정하세요.</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {fileList.map((fp) => {
                  const meta = metaMap[fp];
                  return (
                    <div key={fp} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.card, cursor: "pointer" }}
                      onClick={() => openFile(fp)}>
                      <span style={{ fontSize: 11, color: "#6366f1", fontFamily: "monospace", minWidth: 14 }}>MD</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fp}</div>
                        {meta && (
                          <div style={{ fontSize: 11, color: C.sub, marginTop: 2, display: "flex", gap: 8 }}>
                            <span>✍ {meta.author}</span>
                            <span>{fmtDate(meta.updatedAt)}</span>
                            {meta.updatedBy && meta.updatedBy !== meta.author && <span>수정: {meta.updatedBy}</span>}
                          </div>
                        )}
                      </div>
                      {selectedCat1 !== null && (
                        <span style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                          <button title="위로" onClick={(e) => { e.stopPropagation(); void moveFile(fp, -1); }} style={{ ...btnStyle(), padding: "2px 7px", fontSize: 10 }}>▲</button>
                          <button title="아래로" onClick={(e) => { e.stopPropagation(); void moveFile(fp, 1); }} style={{ ...btnStyle(), padding: "2px 7px", fontSize: 10 }}>▼</button>
                        </span>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); deleteFile(fp); }} style={{ ...btnStyle(), padding: "2px 8px", fontSize: 11, color: "#dc2626", borderColor: "#fca5a5", flexShrink: 0 }}>삭제</button>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* 파일 뷰어 / 편집기 */}
          {!loading && selectedFile && (() => {
            const meta = metaMap[selectedFile];
            return (
              <>
                {meta && !editing && (
                  <div style={{ display: "flex", gap: 20, fontSize: 12, color: C.sub, marginBottom: 10, padding: "6px 12px", background: C.card, borderRadius: 6, border: `1px solid ${C.border}` }}>
                    <span>✍ 작성: <strong style={{ color: C.text }}>{meta.author}</strong></span>
                    <span>📅 {fmtDate(meta.createdAt)}</span>
                    {meta.updatedBy && (
                      <>
                        <span>|</span>
                        <span>🖊 최종수정: <strong style={{ color: C.text }}>{meta.updatedBy}</strong></span>
                        <span>{fmtDate(meta.updatedAt)}</span>
                      </>
                    )}
                  </div>
                )}
              </>
            );
          })()}
          {!loading && selectedFile && (
            editing ? (
              <>
              {/* 표 넣기 — 커서 자리에 3칸 표 틀 (2026-11-13) */}
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    const ta = document.getElementById("md-edit-ta") as HTMLTextAreaElement | null;
                    const tpl = "\n| 제목1 | 제목2 | 제목3 |\n|---|---|---|\n| 내용 | 내용 | 내용 |\n| 내용 | 내용 | 내용 |\n";
                    const at = ta ? ta.selectionStart : editContent.length;
                    setEditContent(editContent.slice(0, at) + tpl + editContent.slice(at));
                  }}
                  style={{ ...btnStyle(), padding: "5px 12px", fontSize: 12 }}
                >표 넣기</button>
                <span style={{ width: 1, background: C.border, margin: "0 4px" }} />
                {[["빨강", "#dc2626"], ["파랑", "#2563eb"], ["초록", "#16a34a"], ["주황", "#ea580c"]].map(([n, c]) => (
                  <button key={n} type="button" title={`글씨 ${n}`} onClick={() => wrapSel(`[${n}]`, "[/]")} style={{ ...btnStyle(), padding: "5px 9px", fontSize: 12, color: c, fontWeight: 800 }}>가</button>
                ))}
                <span style={{ width: 1, background: C.border, margin: "0 4px" }} />
                {[["형광노랑", "#fef08a"], ["형광초록", "#bbf7d0"], ["형광분홍", "#fbcfe8"]].map(([n, c]) => (
                  <button key={n} type="button" title={n} onClick={() => wrapSel(`[${n}]`, "[/]")} style={{ ...btnStyle(), padding: "5px 9px", fontSize: 12, background: c, fontWeight: 800 }}>가</button>
                ))}
                <button type="button" title="굵게" onClick={() => wrapSel("**", "**")} style={{ ...btnStyle(), padding: "5px 9px", fontSize: 12, fontWeight: 900 }}>B</button>
                <span style={{ fontSize: 12, color: C.sub, alignSelf: "center" }}>글자를 고른 뒤 색 단추를 누르세요</span>
              </div>
              <textarea
                id="md-edit-ta"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                style={{ width: "100%", height: "calc(100vh - 180px)", fontFamily: "monospace", fontSize: 13, lineHeight: 1.6, padding: 16, border: `1px solid ${C.border}`, borderRadius: 8, background: C.card, color: C.text, resize: "none", outline: "none", boxSizing: "border-box" }}
                spellCheck={false}
              />
              </>
            ) : (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "24px 32px", minHeight: 200 }}>
                <MdViewer content={fileContent} />
              </div>
            )
          )}
        </div>
      </main>

      {/* ── 모달: 새 파일 ── */}
      {showNewFile && (
        <Overlay onClose={() => setShowNewFile(false)}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, minWidth: 360 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, color: C.primary }}>새 MD 파일 만들기</h3>
            <p style={{ fontSize: 12, color: C.sub, margin: "0 0 10px" }}>파일 이름을 입력하세요. .md 확장자는 자동으로 붙습니다.<br />앞에 오늘 날짜(YYYYMMDD)가 자동으로 붙습니다.</p>
            <input
              autoFocus
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createFile(); if (e.key === "Escape") setShowNewFile(false); }}
              placeholder="파일명 (예: 기사작성_가이드)"
              style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, boxSizing: "border-box", marginBottom: 14 }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowNewFile(false)} style={btnStyle()}>취소</button>
              <button onClick={createFile} disabled={!newFileName.trim()} style={btnStyle(true)}>만들기</button>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── 모달: 카테고리 배정 ── */}
      {showAssign && selectedFile && (
        <Overlay onClose={() => setShowAssign(false)}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, minWidth: 360 }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 16, color: C.primary }}>카테고리 배정</h3>
            <p style={{ fontSize: 12, color: C.sub, margin: "0 0 16px" }}>{selectedFile}</p>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.text, display: "block", marginBottom: 6 }}>1차 카테고리</label>
            <select value={assignC1} onChange={(e) => { setAssignC1(e.target.value); setAssignC2(""); }}
              style={{ width: "100%", padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, marginBottom: 12, fontFamily: "inherit" }}>
              <option value="">선택</option>
              {Object.keys(catMap).map((c1) => <option key={c1} value={c1}>{c1}</option>)}
            </select>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.text, display: "block", marginBottom: 6 }}>2차 카테고리</label>
            <select value={assignC2} onChange={(e) => setAssignC2(e.target.value)}
              style={{ width: "100%", padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, marginBottom: 16, fontFamily: "inherit" }}>
              <option value="">선택</option>
              {assignC1 && Object.keys(catMap[assignC1] || {}).map((c2) => <option key={c2} value={c2}>{c2}</option>)}
            </select>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowAssign(false)} style={btnStyle()}>취소</button>
              <button onClick={assignFile} disabled={!assignC1 || !assignC2} style={btnStyle(true)}>배정</button>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── 모달: 카테고리 추가 ── */}
      {showAddCat && (
        <Overlay onClose={() => setShowAddCat(false)}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, minWidth: 360 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, color: C.primary }}>카테고리 추가</h3>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.text, display: "block", marginBottom: 6 }}>1차 카테고리 이름</label>
            <input value={newCat1} onChange={(e) => setNewCat1(e.target.value)} placeholder="예: 공실뉴스"
              style={{ width: "100%", padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, marginBottom: 12, boxSizing: "border-box", fontFamily: "inherit" }} />
            <label style={{ fontSize: 12, fontWeight: 700, color: C.text, display: "block", marginBottom: 6 }}>2차 카테고리 이름 (선택)</label>
            <input value={newCat2} onChange={(e) => setNewCat2(e.target.value)} placeholder="예: 기사작성"
              style={{ width: "100%", padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, marginBottom: 16, boxSizing: "border-box", fontFamily: "inherit" }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowAddCat(false)} style={btnStyle()}>취소</button>
              <button onClick={addCategory} disabled={!newCat1.trim()} style={btnStyle(true)}>추가</button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
