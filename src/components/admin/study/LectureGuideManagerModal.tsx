"use client";

import { useCallback, useEffect, useState } from "react";
import { deleteLectureGuide, getLectureGuides, saveLectureGuide, type LectureGuide } from "@/app/actions/lectureGuides";

type Props = { darkMode?: boolean; onClose: () => void; onUpdated?: () => void };
const EMPTY = { name: "", title: "", body: "", is_active: true };

export default function LectureGuideManagerModal({ darkMode = false, onClose, onUpdated }: Props) {
  const [guides, setGuides] = useState<LectureGuide[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getLectureGuides();
    setLoading(false);
    if (res.success) setGuides(res.data);
    else setMessage(res.error || "수강안내를 불러오지 못했습니다.");
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  const reset = () => { setEditingId(null); setForm(EMPTY); setMessage(""); };
  const edit = (guide: LectureGuide) => {
    setEditingId(guide.id);
    setForm({ name: guide.name, title: guide.title, body: guide.body, is_active: guide.is_active });
    setMessage("");
  };
  const save = async () => {
    setSaving(true);
    setMessage("");
    const res = await saveLectureGuide({ ...form, id: editingId || undefined, sort_order: editingId ? guides.findIndex(g => g.id === editingId) : guides.length });
    setSaving(false);
    if (!res.success) return setMessage(res.error || "저장하지 못했습니다.");
    reset();
    await load();
    onUpdated?.();
  };
  const remove = async (guide: LectureGuide) => {
    if (!confirm(`'${guide.name}' 수강안내를 삭제하시겠습니까?`)) return;
    const res = await deleteLectureGuide(guide.id);
    if (!res.success) return setMessage(res.error || "삭제하지 못했습니다.");
    if (editingId === guide.id) reset();
    await load();
    onUpdated?.();
  };

  const bg = darkMode ? "#1f2937" : "#fff";
  const panel = darkMode ? "#111827" : "#f8fafc";
  const border = darkMode ? "#374151" : "#e5e7eb";
  const text = darkMode ? "#f9fafb" : "#111827";
  const muted = darkMode ? "#9ca3af" : "#64748b";
  const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: `1px solid ${border}`, borderRadius: 8, padding: "10px 12px", color: text, background: bg, fontSize: 13 };

  return <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
    <div onClick={e => e.stopPropagation()} style={{ width: "min(920px, 100%)", maxHeight: "90vh", overflow: "auto", borderRadius: 16, background: bg, color: text, border: `1px solid ${border}`, boxShadow: "0 24px 60px rgba(0,0,0,.3)" }}>
      <header style={{ padding: "20px 24px", borderBottom: `1px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div><h2 style={{ margin: 0, fontSize: 20 }}>수강안내 관리</h2><p style={{ margin: "6px 0 0", color: muted, fontSize: 13 }}>여기서 작성한 안내를 강의 등록·수정 화면에서 선택합니다.</p></div>
        <button type="button" onClick={onClose} aria-label="닫기" style={{ border: 0, background: "transparent", color: muted, fontSize: 24, cursor: "pointer" }}>×</button>
      </header>

      <div style={{ padding: 24, display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(320px, 1.25fr)", gap: 20 }}>
        <section style={{ background: panel, border: `1px solid ${border}`, borderRadius: 12, padding: 18 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>{editingId ? "수강안내 수정" : "새 수강안내 등록"}</h3>
          <label style={{ fontSize: 12, fontWeight: 700 }}>관리용 이름</label>
          <input value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} placeholder="예: 공실스터디 기본 수강안내" style={{ ...input, margin: "6px 0 14px" }} />
          <label style={{ fontSize: 12, fontWeight: 700 }}>화면 노출 제목</label>
          <input value={form.title} onChange={e => setForm(v => ({ ...v, title: e.target.value }))} placeholder="예: 공실스터디 수강 안내" style={{ ...input, margin: "6px 0 14px" }} />
          <label style={{ fontSize: 12, fontWeight: 700 }}>안내 내용</label>
          <textarea value={form.body} onChange={e => setForm(v => ({ ...v, body: e.target.value }))} rows={8} placeholder={"반복수업 가능\n공실스터디 동산 무료 열람"} style={{ ...input, resize: "vertical", lineHeight: 1.6, margin: "6px 0 12px" }} />
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginBottom: 16 }}><input type="checkbox" checked={form.is_active} onChange={e => setForm(v => ({ ...v, is_active: e.target.checked }))} />강의 선택 목록에서 사용</label>
          {message && <p style={{ color: "#dc2626", fontSize: 12, lineHeight: 1.5 }}>{message}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={save} disabled={saving} style={{ border: 0, borderRadius: 8, padding: "10px 18px", background: "#059669", color: "white", fontWeight: 700, cursor: "pointer" }}>{saving ? "저장 중..." : editingId ? "수정 저장" : "등록"}</button>
            {editingId && <button type="button" onClick={reset} style={{ border: `1px solid ${border}`, borderRadius: 8, padding: "10px 16px", background: bg, color: text, cursor: "pointer" }}>취소</button>}
          </div>
        </section>

        <section>
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>등록된 수강안내 ({guides.length})</h3>
          {loading ? <div style={{ color: muted, padding: 30, textAlign: "center" }}>불러오는 중...</div> : guides.length === 0 ? <div style={{ color: muted, padding: 30, textAlign: "center", border: `1px dashed ${border}`, borderRadius: 10 }}>등록된 수강안내가 없습니다.</div> :
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{guides.map(guide => <article key={guide.id} style={{ border: `1px solid ${border}`, borderRadius: 10, padding: 14, opacity: guide.is_active ? 1 : .65 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div><strong style={{ fontSize: 14 }}>{guide.name}</strong><span style={{ marginLeft: 8, fontSize: 11, color: guide.is_active ? "#059669" : muted }}>{guide.is_active ? "사용 중" : "사용 중지"}</span><div style={{ marginTop: 5, fontSize: 12, color: muted }}>{guide.title} · 연결 강의 {guide.usage_count || 0}개</div></div>
                <div style={{ display: "flex", gap: 6 }}><button type="button" onClick={() => edit(guide)} style={{ border: `1px solid ${border}`, borderRadius: 6, background: bg, color: text, cursor: "pointer" }}>수정</button><button type="button" onClick={() => remove(guide)} style={{ border: "1px solid #fecaca", borderRadius: 6, background: bg, color: "#dc2626", cursor: "pointer" }}>삭제</button></div>
              </div>
              <div style={{ marginTop: 10, whiteSpace: "pre-wrap", color: muted, fontSize: 12, lineHeight: 1.5 }}>{guide.body}</div>
            </article>)}</div>}
        </section>
      </div>
    </div>
  </div>;
}
