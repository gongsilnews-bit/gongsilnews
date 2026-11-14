"use client";
// MD 지침서 문서 댓글 — PC·모바일 같이 쓴다 (2026-11-14 사장님: "md 지침서에 댓글도 쓸 수 있게")
//  사장님과 Aside(AI)가 문서 아래에서 대화한다 — 작성자를 [사장님]·[Aside]로 고르고, 댓글마다 작성자 딱지·시각
import React, { useEffect, useState } from "react";
import { addMdComment, deleteMdComment, getMdComments, type MdComment, type MdCommentBy } from "@/app/actions/mdGuide";

const WHO_KEY = "md-comment-by"; // 이 브라우저에서 고른 작성자 기억 (Aside 쪽 브라우저는 Aside 로)
const LOOK: Record<string, { bg: string; border: string; tag: string; tagBg: string }> = {
  사장님: { bg: "#eff6ff", border: "#bfdbfe", tag: "#fff", tagBg: "#1a3a6b" },
  Aside: { bg: "#f5f3ff", border: "#ddd6fe", tag: "#fff", tagBg: "#7c3aed" },
};
const when = (s: string) => {
  const d = new Date(s);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export default function MdComments({ path }: { path: string }) {
  const [list, setList] = useState<MdComment[]>([]);
  const [myId, setMyId] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [by, setBy] = useState<MdCommentBy>("사장님");

  useEffect(() => {
    try { const v = localStorage.getItem(WHO_KEY); if (v === "Aside" || v === "사장님") setBy(v); } catch {}
  }, []);
  const pick = (v: MdCommentBy) => { setBy(v); try { localStorage.setItem(WHO_KEY, v); } catch {} };

  const load = React.useCallback(async () => {
    const r = await getMdComments(path);
    if (r.success) { setList(r.comments); setMyId(r.myId || ""); } else setErr(r.error || "댓글을 불러오지 못했어요.");
  }, [path]);
  useEffect(() => { setList([]); setErr(""); setText(""); void load(); }, [load]);

  const send = async () => {
    if (!text.trim() || busy) return;
    setBusy(true); setErr("");
    const r = await addMdComment(path, text, by);
    setBusy(false);
    if (r.success) { setList(r.comments); setText(""); } else setErr(r.error || "댓글을 남기지 못했어요.");
  };
  const remove = async (id: string) => {
    if (!window.confirm("이 댓글을 지울까요?")) return;
    const r = await deleteMdComment(path, id);
    if (r.success) setList(r.comments); else setErr(r.error || "지우지 못했어요.");
  };

  const chip = (v: MdCommentBy) => (
    <button key={v} type="button" onClick={() => pick(v)} style={{ height: 30, padding: "0 12px", borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: "pointer", border: `1px solid ${by === v ? LOOK[v].tagBg : "#cbd5e1"}`, background: by === v ? LOOK[v].tagBg : "#fff", color: by === v ? "#fff" : "#475569" }}>{v}</button>
  );

  return (
    <div style={{ marginTop: 28, borderTop: "2px solid #e2e8f0", paddingTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#0f2b5b" }}>댓글 {list.length > 0 && <span style={{ color: "#2563eb" }}>{list.length}</span>}</span>
        <button type="button" onClick={() => void load()} title="새 댓글 불러오기" style={{ marginLeft: "auto", border: "1px solid #e2e8f0", background: "#fff", borderRadius: 6, fontSize: 12, color: "#64748b", padding: "3px 8px", cursor: "pointer" }}>↻ 새로고침</button>
      </div>
      {list.length === 0 && !err && <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 10 }}>아직 댓글이 없어요.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {list.map((c) => {
          const look = LOOK[c.author] || LOOK.사장님;
          return (
            <div key={c.id} style={{ background: look.bg, border: `1px solid ${look.border}`, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#64748b", marginBottom: 5 }}>
                <span style={{ background: look.tagBg, color: look.tag, fontSize: 11.5, fontWeight: 800, padding: "2px 8px", borderRadius: 99 }}>{c.author}</span>
                <span>{when(c.createdAt)}</span>
                {c.authorId === myId && <button onClick={() => void remove(c.id)} style={{ marginLeft: "auto", border: "none", background: "none", color: "#dc2626", fontSize: 12, cursor: "pointer", padding: 0 }}>삭제</button>}
              </div>
              <div style={{ fontSize: 14, color: "#1e293b", whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.6 }}>{c.text}</div>
            </div>
          );
        })}
      </div>
      {err && <div style={{ fontSize: 12.5, color: "#dc2626", marginBottom: 8 }}>{err}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 12.5, color: "#64748b" }}>작성자</span>
        {chip("사장님")}{chip("Aside")}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={`${by}(으)로 댓글 남기기`} rows={2} aria-label="댓글 내용"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void send(); }}
          style={{ flex: 1, minWidth: 0, boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 10, padding: "9px 12px", fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none" }} />
        <button onClick={() => void send()} disabled={busy || !text.trim()} style={{ height: 40, padding: "0 16px", border: "none", borderRadius: 10, background: busy || !text.trim() ? "#cbd5e1" : LOOK[by].tagBg, color: "#fff", fontSize: 14, fontWeight: 700, cursor: busy || !text.trim() ? "default" : "pointer", flexShrink: 0 }}>{busy ? "…" : "등록"}</button>
      </div>
    </div>
  );
}
