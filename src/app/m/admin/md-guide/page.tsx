"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { isAdminRole } from "@/utils/permissionCheck";
import { getFileMetaMap, getMdCategoryMap, listMdFiles, readMdFile, type CategoryMap, type FileMetaMap } from "@/app/actions/mdGuide";
import { MdViewer } from "@/components/admin/sections/MDGuideSection";
import MdComments from "@/components/admin/sections/MdComments";

/*
 * 모바일 MD 지침서 (최고관리자 전용, 2026-11-14 사장님: "모바일에서도 볼 수 있게")
 * PC 관리자 [MD 지침서]와 같은 문서·카테고리를 읽기만 한다. 고치기·카테고리 정리는 PC 에서.
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

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/m"); return; }
      const { data } = await supabase.from("members").select("role").eq("id", user.id).single();
      if (!isAdminRole(data?.role)) { alert("최고관리자 전용 기능입니다."); router.push("/m"); return; }
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

  const openDoc = async (path: string) => {
    setLoading(true);
    const r = await readMdFile(path);
    setDoc({ path, content: r.content || "" });
    setLoading(false);
    window.scrollTo(0, 0);
  };

  // 휴대폰 [뒤로]로 문서에서 목록으로
  useEffect(() => {
    if (!doc) return;
    history.pushState({ mdDoc: true }, "");
    const back = () => setDoc(null);
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, [doc]);

  if (!authChecked) {
    return <div style={{ display: "flex", height: "100dvh", alignItems: "center", justifyContent: "center", background: "#f4f5f7", color: "#9ca3af", fontSize: 14, fontWeight: 600 }}>확인 중...</div>;
  }

  const header = (title: string, onBack: () => void) => (
    <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 12px", height: 52, display: "flex", alignItems: "center", gap: 8 }}>
      <button onClick={onBack} aria-label="뒤로" style={{ background: "none", border: "none", cursor: "pointer", padding: 6, display: "flex" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <span style={{ fontSize: 16, fontWeight: 800, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
    </div>
  );

  /* 문서 보기 */
  if (doc) {
    const m = meta[doc.path];
    return (
      <div style={{ minHeight: "100dvh", background: "#fff", paddingBottom: 90 }}>
        {header(titleOf(doc.path), () => history.back())}
        <div style={{ padding: "14px 16px 0" }}>
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
      {header("MD 지침서", () => router.push("/m/menu"))}
      <div style={{ padding: "12px 16px", background: "#fff", borderBottom: "1px solid #eee" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="문서 이름 찾기" style={{ width: "100%", boxSizing: "border-box", height: 40, border: "1px solid #e5e7eb", borderRadius: 10, padding: "0 12px", fontSize: 15, background: "#f9fafb", outline: "none" }} />
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>모바일에서는 읽기만 돼요. 고치기·카테고리 정리는 PC 관리자에서 해 주세요.</div>
      </div>

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
