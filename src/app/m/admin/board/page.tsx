"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getBoards, deleteBoard, saveBoard, getBoard } from "@/app/actions/board";

const SKIN_LABELS: Record<string, string> = { 
  FILE_THUMB: "?ë£Œ?¤í˜•", 
  VIDEO_ALBUM: "?ìƒ/?Œì¼??, 
  LIST: "?¼ë°˜ ëª©ë¡??, 
  GALLERY: "ê°¤ëŸ¬ë¦¬í˜•" 
};

const PERMISSION_OPTIONS = [
  { label: "0?ˆë²¨ (ë¹„íšŒ???´ìƒ)", value: 0 },
  { label: "1?ˆë²¨ (?¼ë°˜?Œì› ?´ìƒ)", value: 1 },
  { label: "2?ˆë²¨ (ë¬´ë£Œë¶€?™ì‚° ?´ìƒ)", value: 2 },
  { label: "3?ˆë²¨ (ê³µì‹¤?´ìŠ¤ë¶€?™ì‚°)", value: 3 },
  { label: "4?ˆë²¨ (ê³µì‹¤?±ë¡ë¶€?™ì‚°)", value: 4 },
  { label: "5?ˆë²¨ (ìµœê³ ê´€ë¦¬ì)", value: 5 },
];

function MobileBoardAdmin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get("action");
  const editId = searchParams.get("id");

  const [dbBoards, setDbBoards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  
  // ???íƒœ
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    id: "", board_id: "", name: "", subtitle: "", board_type: "standard", skin_type: "LIST",
    columns_count: 3, perm_list: 0, perm_read: 0, perm_write: 5, categories: "",
    perm_reply: 1, perm_download: 1, use_print: false, use_editor: true,
    auto_spam_post: false, auto_spam_comment: false, require_approval: false,
    allow_html: true, allow_upload: true, upload_limit_count: 1,
    top_html: "", bottom_html: "", forbidden_words: ""
  });

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/m"); return; }
      const { data } = await supabase.from("members").select("role").eq("id", user.id).single();
      const r = data?.role?.trim().toUpperCase() || '';
      if (!(r === 'ADMIN' || r === 'ìµœê³ ê´€ë¦¬ì' || r.includes('ê´€ë¦¬ì'))) {
        alert("ìµœê³ ê´€ë¦¬ì ?„ìš© ê¸°ëŠ¥?…ë‹ˆ??");
        router.push("/m");
        return;
      }
      setAuthChecked(true);
    }
    init();
  }, [router]);

  useEffect(() => {
    if (authChecked) loadBoards();
  }, [authChecked]);

  useEffect(() => {
    if (action === "new") {
      resetForm();
      setShowForm(true);
    } else if (action === "edit" && editId) {
      loadBoardData(editId);
      setShowForm(true);
    } else {
      setShowForm(false);
    }
  }, [action, editId]);

  const loadBoards = async () => {
    setLoading(true);
    const res = await getBoards();
    if (res.success) setDbBoards(res.data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      id: "", board_id: "", name: "", subtitle: "", board_type: "standard", skin_type: "LIST",
      columns_count: 3, perm_list: 0, perm_read: 0, perm_write: 5, categories: "",
      perm_reply: 1, perm_download: 1, use_print: false, use_editor: true,
      auto_spam_post: false, auto_spam_comment: false, require_approval: false,
      allow_html: true, allow_upload: true, upload_limit_count: 1,
      top_html: "", bottom_html: "", forbidden_words: ""
    });
  };

  const loadBoardData = async (boardId: string) => {
    setFormLoading(true);
    const res = await getBoard(boardId);
    if (res.success && res.data) {
      const d = res.data;
      setFormData(prev => ({
        ...prev, id: d.id || "", board_id: d.board_id || "", name: d.name || "",
        subtitle: d.subtitle || d.description || "", board_type: d.board_type || "standard", skin_type: d.skin_type || "LIST",
        columns_count: d.columns_count || 3, perm_list: d.perm_list ?? 0,
        perm_read: d.perm_read ?? 0, perm_write: d.perm_write ?? 5,
        categories: d.categories || "", perm_reply: d.perm_reply ?? 1,
        perm_download: d.perm_download ?? 1, use_print: d.use_print ?? false,
        use_editor: d.use_editor ?? true, auto_spam_post: d.auto_spam_post ?? false,
        auto_spam_comment: d.auto_spam_comment ?? false, require_approval: d.require_approval ?? false,
        allow_html: d.allow_html ?? true, allow_upload: d.allow_upload ?? true,
        upload_limit_count: d.upload_limit_count ?? 1, top_html: d.top_html || "",
        bottom_html: d.bottom_html || "", forbidden_words: d.forbidden_words || ""
      }));
    }
    setFormLoading(false);
  };

  const handleDelete = async (boardId: string) => {
    if (!confirm("??ê²Œì‹œ?ì„ ?? œ?˜ì‹œê² ìŠµ?ˆê¹Œ?")) return;
    const res = await deleteBoard(boardId);
    if (res.success) loadBoards();
    else alert("?? œ ?¤íŒ¨: " + res.error);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let val: any = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    if (e.target.type === 'number' || ['perm_list', 'perm_read', 'perm_write', 'perm_reply', 'perm_download', 'upload_limit_count', 'columns_count'].includes(e.target.name)) {
      val = Number(val);
    }
    setFormData({ ...formData, [e.target.name]: val });
  };

  const handleRadioChange = (name: string, value: boolean) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.board_id || !formData.name || !formData.skin_type) {
      alert("ê³ ìœ  ID, ê²Œì‹œ?ëª…, ?¤í‚¨ ?€?…ì„ ëª¨ë‘ ?…ë ¥?´ì£¼?¸ìš”.");
      return;
    }
    setFormLoading(true);
    try {
      const payload = {
        id: formData.id || undefined, board_id: formData.board_id, name: formData.name,
        subtitle: formData.subtitle, board_type: formData.board_type, skin_type: formData.skin_type,
        columns_count: formData.columns_count, perm_list: formData.perm_list,
        perm_read: formData.perm_read, perm_write: formData.perm_write, categories: formData.categories
      };
      const res = await saveBoard(payload);
      if (res.success) {
        alert(editId ? "?˜ì •?˜ì—ˆ?µë‹ˆ??" : "ì¶”ê??˜ì—ˆ?µë‹ˆ??");
        router.push("/m/admin/board");
        loadBoards();
      } else {
        alert("?€???¤íŒ¨: " + res.error);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  if (!authChecked) {
    return (
      <div style={{ display: "flex", height: "100dvh", alignItems: "center", justifyContent: "center", background: "#f4f5f7" }}>
        <div style={{ textAlign: "center", color: "#9ca3af" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>?”</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>ê¶Œí•œ???•ì¸?˜ê³  ?ˆìŠµ?ˆë‹¤...</div>
        </div>
      </div>
    );
  }

  if (showForm) {
    const isEdit = !!editId;
    return (
      <div style={{ minHeight: "100dvh", background: "#f4f5f7", paddingBottom: 80 }}>
        {/* ?¤ë” */}
        <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => router.push("/m/admin/board")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>{isEdit ? "ê²Œì‹œ???˜ì •" : "??ê²Œì‹œ???ì„±"}</h1>
          </div>
        </div>

        {formLoading && isEdit ? (
          <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>?°ì´?°ë? ë¶ˆëŸ¬?¤ëŠ” ì¤?..</div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 14, padding: "20px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              {/* ê¸°ë³¸ ?¤ì • */}
              <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 800, color: "#111", borderBottom: "2px solid #111", paddingBottom: 8 }}>ê¸°ë³¸ ?¤ì •</h3>
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 6 }}>ê³ ìœ  ID (?Œì´ë¸? *</label>
                <input name="board_id" value={formData.board_id} onChange={handleFormChange} readOnly={isEdit} required placeholder="?? bbs_1"
                  style={{ width: "100%", padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", background: isEdit ? "#f3f4f6" : "#fff", color: isEdit ? "#9ca3af" : "#111" }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 6 }}>ê²Œì‹œ?ëª… *</label>
                <input name="name" value={formData.name} onChange={handleFormChange} required placeholder="?? ?ìœ ê²Œì‹œ??
                  style={{ width: "100%", padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 6 }}>ë³´ì¡° ?€?´í?</label>
                <input name="subtitle" value={formData.subtitle} onChange={handleFormChange} placeholder="?? ?Œì›ê°€??ê´€???œì‹ ëª¨ìŒ"
                  style={{ width: "100%", padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 6 }}>ê²Œì‹œ??? í˜• *</label>
                <select name="board_type" value={formData.board_type} onChange={handleFormChange}
                  style={{ width: "100%", padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff" }}>
                  <option value="standard">?¼ë°˜ ê²Œì‹œ??/option>
                  <option value="inquiry">1:1 ë¬¸ì˜??(ë¹„ë?ê²Œì‹œ??</option>
                </select>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 6 }}>?¤í‚¨ ? íƒ *</label>
                <select name="skin_type" value={formData.skin_type} onChange={handleFormChange}
                  style={{ width: "100%", padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff" }}>
                  <option value="LIST">?¼ë°˜ ëª©ë¡??(LIST)</option>
                  <option value="FILE_THUMB">?ë£Œ?¤í˜• (FILE_THUMB)</option>
                  <option value="GALLERY">ê°¤ëŸ¬ë¦¬í˜• (GALLERY)</option>
                </select>
              </div>

              {/* ê¶Œí•œ ?¤ì • */}
              <h3 style={{ margin: "24px 0 16px 0", fontSize: 16, fontWeight: 800, color: "#111", borderBottom: "2px solid #111", paddingBottom: 8 }}>ê¶Œí•œ ?¤ì •</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#4b5563", marginBottom: 4 }}>ëª©ë¡ ë³´ê¸°</label>
                  <select name="perm_list" value={formData.perm_list} onChange={handleFormChange} style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, background: "#fff" }}>
                    {PERMISSION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#4b5563", marginBottom: 4 }}>ê¸€ ?½ê¸°</label>
                  <select name="perm_read" value={formData.perm_read} onChange={handleFormChange} style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, background: "#fff" }}>
                    {PERMISSION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#4b5563", marginBottom: 4 }}>ê¸€ ?°ê¸°</label>
                  <select name="perm_write" value={formData.perm_write} onChange={handleFormChange} style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, background: "#fff" }}>
                    {PERMISSION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>

              {/* ê¸°í? ?¤ì • */}
              <h3 style={{ margin: "24px 0 16px 0", fontSize: 16, fontWeight: 800, color: "#111", borderBottom: "2px solid #111", paddingBottom: 8 }}>ê¸°í? ?¤ì •</h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#4b5563" }}>?ë””???¬ìš©</span>
                  <div style={{ display: "flex", gap: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="radio" checked={formData.use_editor} onChange={() => handleRadioChange('use_editor', true)} /> ?¬ìš©</label>
                    <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="radio" checked={!formData.use_editor} onChange={() => handleRadioChange('use_editor', false)} /> ë¯¸ì‚¬??/label>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#4b5563" }}>ê²Œì‹œë¬??¹ì¸ê¸°ëŠ¥</span>
                  <div style={{ display: "flex", gap: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="radio" checked={formData.require_approval} onChange={() => handleRadioChange('require_approval', true)} /> ?¬ìš©</label>
                    <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="radio" checked={!formData.require_approval} onChange={() => handleRadioChange('require_approval', false)} /> ë¯¸ì‚¬??/label>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#4b5563" }}>?Œì¼ ?…ë¡œ??/span>
                  <div style={{ display: "flex", gap: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="radio" checked={formData.allow_upload} onChange={() => handleRadioChange('allow_upload', true)} /> ?ˆìš©</label>
                    <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="radio" checked={!formData.allow_upload} onChange={() => handleRadioChange('allow_upload', false)} /> ë¶ˆê?</label>
                  </div>
                </div>
              </div>

            </div>

            {/* ê³ ì • ë°”í? ë²„íŠ¼ */}
            <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 16px", background: "#fff", borderTop: "1px solid #e5e7eb", display: "flex", gap: 10, zIndex: 100 }}>
              <button type="button" onClick={() => router.push("/m/admin/board")} style={{ flex: 1, height: 48, background: "#f3f4f6", color: "#4b5563", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>ì·¨ì†Œ</button>
              <button type="submit" disabled={formLoading} style={{ flex: 2, height: 48, background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: formLoading ? 0.7 : 1 }}>
                {formLoading ? "?€??ì¤?.." : (isEdit ? "?˜ì • ?€?? : "ê²Œì‹œ??ì¶”ê?")}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#f4f5f7" }}>
      {/* ?¤ë” */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>ê²Œì‹œ?ê?ë¦?/h1>
        </div>
        <button onClick={() => router.push("/m/admin/board?action=new")} style={{ background: "#3b82f6", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 13, fontWeight: 700, color: "#fff" }}>
          + ì¶”ê?
        </button>
      </div>

      <div style={{ padding: "16px 16px 100px" }}>
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#9ca3af", fontSize: 14, fontWeight: 600 }}>ë¶ˆëŸ¬?¤ëŠ” ì¤?..</div>
        ) : dbBoards.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>?“‹</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>?±ë¡??ê²Œì‹œ?ì´ ?†ìŠµ?ˆë‹¤.</div>
          </div>
        ) : dbBoards.map(b => (
          <div key={b.id || b.board_id} style={{ background: "#fff", borderRadius: 14, padding: "16px", marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <span style={{ fontSize: 11, color: "#6b7280", background: "#f3f4f6", padding: "2px 6px", borderRadius: 4, fontFamily: "monospace", letterSpacing: "0.5px" }}>ID: {b.board_id}</span>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#111", marginTop: 6 }}>
                  {b.name}
                  {b.description && <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: 6, fontWeight: 500 }}>{b.description}</span>}
                </div>
              </div>
              <span style={{ padding: "4px 8px", background: "#eff6ff", color: "#3b82f6", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>{SKIN_LABELS[b.skin_type] || b.skin_type}</span>
            </div>

            <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#6b7280", marginBottom: 16, background: "#f9fafb", padding: "10px", borderRadius: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontWeight: 700, color: "#4b5563" }}>ëª©ë¡ê¶Œí•œ</span>
                <span>Lv.{b.perm_list || 0}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontWeight: 700, color: "#4b5563" }}>?½ê¸°ê¶Œí•œ</span>
                <span>Lv.{b.perm_read || 0}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontWeight: 700, color: "#4b5563" }}>?°ê¸°ê¶Œí•œ</span>
                <span>Lv.{b.perm_write || 0}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => router.push(`/m/admin/board?action=edit&id=${b.board_id}`)} style={{ flex: 1, height: 36, background: "#f3f4f6", color: "#4b5563", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
                ?¤ì • ?˜ì •
              </button>
              <button onClick={() => handleDelete(b.board_id)} style={{ width: 44, height: 36, background: "#fff", color: "#9ca3af", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 }}>
                ?—‘ï¸?              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MobileBoardAdminPage() {
  return (
    <Suspense fallback={null}>
      <MobileBoardAdmin />
    </Suspense>
  );
}
