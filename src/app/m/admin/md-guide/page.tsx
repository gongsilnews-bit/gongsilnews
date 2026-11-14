"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { isAdminRole } from "@/utils/permissionCheck";
import { getFileMetaMap, getMdCategoryMap, listMdFiles, readMdFile, saveMdCategoryMap, saveMdFile, updateFileMeta, type CategoryMap, type FileMetaMap } from "@/app/actions/mdGuide";
import { MdViewer } from "@/components/admin/sections/MDGuideSection";
import MdComments from "@/components/admin/sections/MdComments";

/*
 * 모바일 MD 지침서 (최고관리자 전용, 2026-11-14 사장님: "모바일에서도 볼 수 있게")
 * PC 관리자 [MD 지침서]와 같은 문서·카테고리. 읽기 · 새 문서 · 고치기 (2026-11-14 사장님: "새파일 등록이 가능하게 해야지 수정도")
 * 카테고리 이름 바꾸기·순서 정리는 PC 에서.
 */

const NAVY = "#1a3a6b";
const fmtDate = (s?: string) => (s ? new Date(s).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) : "");
const titleOf = (fp: string) => fp.split("/").pop()!.replace(/\.md$/i, "");

export default function MobileMdGuidePage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [catMap, setCatMap] = useState<CategoryMap>({});
  const [meta, setMeta] = useState<FileMetaMap>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [doc, setDoc] = useState<{ path: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [userName, setUserName] = useState("");
  const [editing, setEditing] = useState<string | null>(null); // 고치는 중인 글
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [newDoc, setNewDoc] = useState<{ name: string; cat: string } | null>(null); // cat = "1차/2차" · "" = 미분류

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/m"); return; }
      const { data } = await supabase.from("members").select("role, name").eq("id", user.id).single();
      if (!isAdminRole(data?.role)) { alert("최고관리자 전용 기능입니다."); router.push("/m"); return; }
      setUserName(String(data?.name || "관리자"));
      setAuthChecked(true);
    })();
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    const [f, c, m] = await Promise.all([listMdFiles(), getMdCategoryMap(), getFileMetaMap()]);
    if (f.success) setFiles(f.files);
    if (c.success) setCatMap(c.map);
    if (m.success) setMeta(m.map);
    setLoading(false);
  }, []);
  useEffect(() => { if (authChecked) void load(); }, [authChecked, load]);

  const unassigned = useMemo(() => {
    const s = new Set<string>();
    Object.values(catMap).forEach((subs) => Object.values(subs).forEach((l) => l.forEach((x) => s.add(x))));
    return files.filter((f) => !s.has(f));
  }, [files, catMap]);

  const openDoc = async (path: string, edit = false) => {
    setLoading(true);
    const r = await readMdFile(path);
    setDoc({ path, content: r.content || "" });
    setEditing(edit ? r.content || "" : null);
    setMsg("");
    setLoading(false);
    window.scrollTo(0, 0);
  };

  /* 고친 글 저장 */
  const saveDoc = async () => {
    if (!doc || editing === null) return;
    setSaving(true);
    const r = await saveMdFile(doc.path, editing);
    if (r.success) {
      await updateFileMeta(doc.path, { author: userName });
      setDoc({ ...doc, content: editing });
      setEditing(null);
      setMsg("저장했어요.");
      const m = await getFileMetaMap();
      if (m.success) setMeta(m.map);
    } else setMsg(r.error || "저장하지 못했어요.");
    setSaving(false);
  };

  /* 새 문서 — PC 와 같은 이름 규칙 (오늘날짜_이름.md), 고른 카테고리에 넣고 바로 고치기 */
  const createDoc = async () => {
    if (!newDoc || !newDoc.name.trim()) return;
    const base = newDoc.name.trim().replace(/\.md$/i, "").replace(/[\\/]/g, "_");
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const fp = `${today}_${base}.md`;
    if (files.includes(fp)) { setMsg("같은 이름의 문서가 있어요."); return; }
    setSaving(true);
    const r = await saveMdFile(fp, `# ${base}\n\n`);
    if (!r.success) { setMsg(r.error || "만들지 못했어요."); setSaving(false); return; }
    await updateFileMeta(fp, { author: userName, isNew: true });
    if (newDoc.cat) {
      const [c1, c2] = newDoc.cat.split("/");
      const latest = await getMdCategoryMap(); // PC 에서 막 고친 배정이 지워지지 않게 최신 것에 더한다
      const map: CategoryMap = latest.success ? latest.map : JSON.parse(JSON.stringify(catMap));
      map[c1] = map[c1] || {};
      map[c1][c2] = [...(map[c1][c2] || []), fp];
      await saveMdCategoryMap(map);
    }
    setNewDoc(null);
    setSaving(false);
    await load();
    await openDoc(fp, true);
  };

  // 휴대폰 [뒤로]로 문서에서 목록으로
  //  고치는 중이면 먼저 묻는다 — 저장 안 한 글이 날아가지 않게
  const editRef = React.useRef<{ editing: string | null; content: string }>({ editing: null, content: "" });
  editRef.current = { editing, content: doc?.content || "" };
  const docPath = doc?.path || "";
  useEffect(() => {
    if (!docPath) return;
    history.pushState({ mdDoc: true }, "");
    const back = () => {
      const e = editRef.current;
      if (e.editing !== null && e.editing !== e.content && !window.confirm("고친 내용을 저장하지 않고 나갈까요?")) { history.pushState({ mdDoc: true }, ""); return; }
      setEditing(null);
      setDoc(null);
    };
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, [docPath]);

  if (!authChecked) {
    return <div style={{ display: "flex", height: "100dvh", alignItems: "center", justifyContent: "center", background: "#f4f5f7", color: "#9ca3af", fontSize: 14, fontWeight: 600 }}>확인 중...</div>;
  }

  const header = (title: string, onBack: () => void, right?: React.ReactNode) => (
    <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 12px", height: 52, display: "flex", alignItems: "center", gap: 8 }}>
      <button onClick={onBack} aria-label="뒤로" style={{ background: "none", border: "none", cursor: "pointer", padding: 6, display: "flex" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <span style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 800, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
      {right}
    </div>
  );
  const btn = (primary = false): React.CSSProperties => ({ flexShrink: 0, height: 34, padding: "0 14px", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", border: primary ? "none" : "1px solid #d1d5db", background: primary ? NAVY : "#fff", color: primary ? "#fff" : "#374151" });

  /* 문서 보기 */
  if (doc) {
    const m = meta[doc.path];
    if (editing !== null) {
      return (
        <div style={{ minHeight: "100dvh", background: "#fff", paddingBottom: 90 }}>
          {header(titleOf(doc.path), () => { if (editing === doc.content || window.confirm("고친 내용을 저장하지 않고 나갈까요?")) setEditing(null); },
            <button onClick={() => void saveDoc()} disabled={saving} style={btn(true)}>{saving ? "저장 중…" : "저장"}</button>)}
          <div style={{ padding: "10px 12px 0" }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8, lineHeight: 1.6 }}># 큰 제목 · ## 중간 제목 · - 목록 · **굵게** · ==형광펜== · [빨강]글자[/] · | 칸 | 칸 | 표</div>
            {msg && <div style={{ fontSize: 13, color: "#dc2626", marginBottom: 8 }}>{msg}</div>}
            <textarea value={editing} onChange={(e) => setEditing(e.target.value)} spellCheck={false} aria-label="문서 내용"
              style={{ width: "100%", height: "calc(100dvh - 190px)", boxSizing: "border-box", border: "1px solid #d1d5db", borderRadius: 10, padding: 12, fontSize: 15, lineHeight: 1.6, fontFamily: "inherit", resize: "none", outline: "none" }} />
          </div>
        </div>
      );
    }
    return (
      <div style={{ minHeight: "100dvh", background: "#fff", paddingBottom: 90 }}>
        {header(titleOf(doc.path), () => history.back(), <button onClick={() => { setEditing(doc.content); setMsg(""); }} style={btn()}>수정</button>)}
        <div style={{ padding: "14px 16px 0" }}>
          {msg && <div style={{ fontSize: 13, color: "#16a34a", marginBottom: 8 }}>{msg}</div>}
          {m && <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>✍ {m.author} · {fmtDate(m.updatedAt)}{m.updatedBy && m.updatedBy !== m.author ? ` · 수정 ${m.updatedBy}` : ""}</div>}
          <div style={{ wordBreak: "break-word" }}><MdViewer content={doc.content} /></div>
          <MdComments path={doc.path} />
        </div>
      </div>
    );
  }

  const row = (fp: string) => (
    <button key={fp} onClick={() => void openDoc(fp)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#fff", border: "none", borderBottom: "1px solid #f3f4f6", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
      <span style={{ fontSize: 15 }}>📄</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14.5, fontWeight: 600, color: "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{titleOf(fp)}</span>
        {meta[fp] && <span style={{ display: "block", fontSize: 11.5, color: "#9ca3af", marginTop: 2 }}>{meta[fp].author} · {fmtDate(meta[fp].updatedAt)}</span>}
      </span>
      <span style={{ color: "#d1d5db", fontSize: 18 }}>›</span>
    </button>
  );

  const kw = q.trim().toLowerCase();
  const found = kw ? files.filter((f) => f.toLowerCase().includes(kw)) : [];
  const section = (key: string, label: string, list: string[], depth = 0) => {
    const isOpen = open[key] ?? false;
    return (
      <div key={key}>
        <button onClick={() => setOpen((o) => ({ ...o, [key]: !isOpen }))} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: depth ? "11px 16px 11px 28px" : "14px 16px", background: depth ? "#f9fafb" : "#fff", border: "none", borderBottom: "1px solid #eef0f3", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
          <span style={{ fontSize: depth ? 14 : 15.5, fontWeight: depth ? 700 : 800, color: depth ? "#374151" : NAVY, flex: 1 }}>{label}</span>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>{list.length}</span>
          <span style={{ color: "#9ca3af", fontSize: 12, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▶</span>
        </button>
        {isOpen && list.map(row)}
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100dvh", background: "#f4f5f7", paddingBottom: 90 }}>
      {header("MD 지침서", () => router.push("/m/menu"), <button onClick={() => { setNewDoc({ name: "", cat: "" }); setMsg(""); }} style={btn(true)}>+ 새 문서</button>)}
      <div style={{ padding: "12px 16px", background: "#fff", borderBottom: "1px solid #eee" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="문서 이름 찾기" style={{ width: "100%", boxSizing: "border-box", height: 40, border: "1px solid #e5e7eb", borderRadius: 10, padding: "0 12px", fontSize: 15, background: "#f9fafb", outline: "none" }} />
      </div>

      {/* 새 문서 — 이름 · 카테고리 */}
      {newDoc && (
        <div onClick={() => !saving && setNewDoc(null)} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: "#fff", borderRadius: "16px 16px 0 0", padding: "20px 16px calc(20px + env(safe-area-inset-bottom))", boxSizing: "border-box" }}>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 14 }}>새 문서</div>
            <label style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>문서 이름</label>
            <input autoFocus value={newDoc.name} onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })} placeholder="예: 기사작성 가이드"
              style={{ display: "block", width: "100%", boxSizing: "border-box", height: 44, border: "1px solid #d1d5db", borderRadius: 10, padding: "0 12px", fontSize: 16, margin: "6px 0 14px", outline: "none" }} />
            <label style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>카테고리</label>
            <select value={newDoc.cat} onChange={(e) => setNewDoc({ ...newDoc, cat: e.target.value })}
              style={{ display: "block", width: "100%", boxSizing: "border-box", height: 44, border: "1px solid #d1d5db", borderRadius: 10, padding: "0 10px", fontSize: 16, margin: "6px 0 14px", background: "#fff" }}>
              <option value="">미분류</option>
              {Object.entries(catMap).flatMap(([c1, subs]) => Object.keys(subs).filter(Boolean).map((c2) => <option key={`${c1}/${c2}`} value={`${c1}/${c2}`}>{c1} › {c2}</option>))}
            </select>
            {msg && <div style={{ fontSize: 13, color: "#dc2626", marginBottom: 10 }}>{msg}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setNewDoc(null)} disabled={saving} style={{ ...btn(), flex: 1, height: 46 }}>취소</button>
              <button onClick={() => void createDoc()} disabled={saving || !newDoc.name.trim()} style={{ ...btn(true), flex: 2, height: 46, opacity: !newDoc.name.trim() ? 0.5 : 1 }}>{saving ? "만드는 중…" : "만들기"}</button>
            </div>
          </div>
        </div>
      )}

      {loading && !files.length ? (
        <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>불러오는 중...</div>
      ) : kw ? (
        <div style={{ marginTop: 8 }}>{found.length ? found.map(row) : <div style={{ padding: 30, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>찾는 문서가 없어요.</div>}</div>
      ) : (
        <div style={{ marginTop: 8 }}>
          {Object.entries(catMap).map(([c1, subs]) => {
            const k1 = `c:${c1}`;
            const isOpen = open[k1] ?? false;
            const count = Object.values(subs).flat().length;
            return (
              <div key={k1}>
                <button onClick={() => setOpen((o) => ({ ...o, [k1]: !isOpen }))} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", background: "#fff", border: "none", borderBottom: "1px solid #eef0f3", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                  <span style={{ fontSize: 15.5, fontWeight: 800, color: NAVY, flex: 1 }}>📁 {c1}</span>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>{count}</span>
                  <span style={{ color: "#9ca3af", fontSize: 12, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▶</span>
                </button>
                {isOpen && Object.entries(subs).map(([c2, list]) => (c2 ? section(`c:${c1}/${c2}`, c2, list, 1) : list.map(row)))}
              </div>
            );
          })}
          {unassigned.length > 0 && <div style={{ marginTop: 8 }}>{section("unassigned", "미분류", unassigned)}</div>}
        </div>
      )}
    </div>
  );
}
