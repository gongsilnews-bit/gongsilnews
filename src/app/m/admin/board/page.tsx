"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getBoards, deleteBoard, saveBoard, getBoard } from "@/app/actions/board";

const SKIN_LABELS: Record<string, string> = { 
  FILE_THUMB: "자료실형", 
  VIDEO_ALBUM: "영상/파일형", 
  LIST: "일반 목록형", 
  GALLERY: "갤러리형" 
};

const PERMISSION_OPTIONS = [
  { label: "0레벨 (비회원 이상)", value: 0 },
  { label: "1레벨 (일반회원 이상)", value: 1 },
  { label: "2레벨 (무료부동산 이상)", value: 2 },
  { label: "3레벨 (공실뉴스부동산)", value: 3 },
  { label: "4레벨 (공실등록부동산)", value: 4 },
  { label: "5레벨 (최고관리자)", value: 5 },
];

function MobileBoardAdmin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get("action");
  const editId = searchParams.get("id");

  const [dbBoards, setDbBoards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  
  // 폼 상태
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    id: "", board_id: "", name: "", subtitle: "", skin_type: "LIST",
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
      if (!(r === 'ADMIN' || r === '최고관리자' || r.includes('관리자'))) {
        alert("최고관리자 전용 기능입니다.");
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
      id: "", board_id: "", name: "", subtitle: "", skin_type: "LIST",
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
        subtitle: d.subtitle || d.description || "", skin_type: d.skin_type || "LIST",
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
    if (!confirm("이 게시판을 삭제하시겠습니까?")) return;
    const res = await deleteBoard(boardId);
    if (res.success) loadBoards();
    else alert("삭제 실패: " + res.error);
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
      alert("고유 ID, 게시판명, 스킨 타입을 모두 입력해주세요.");
      return;
    }
    setFormLoading(true);
    try {
      const payload = {
        id: formData.id || undefined, board_id: formData.board_id, name: formData.name,
        subtitle: formData.subtitle, skin_type: formData.skin_type,
        columns_count: formData.columns_count, perm_list: formData.perm_list,
        perm_read: formData.perm_read, perm_write: formData.perm_write, categories: formData.categories
      };
      const res = await saveBoard(payload);
      if (res.success) {
        alert(editId ? "수정되었습니다." : "추가되었습니다.");
        router.push("/m/admin/board");
        loadBoards();
      } else {
        alert("저장 실패: " + res.error);
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
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔐</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>권한을 확인하고 있습니다...</div>
        </div>
      </div>
    );
  }

  if (showForm) {
    const isEdit = !!editId;
    return (
      <div style={{ minHeight: "100dvh", background: "#f4f5f7", paddingBottom: 80 }}>
        {/* 헤더 */}
        <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => router.push("/m/admin/board")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>{isEdit ? "게시판 수정" : "새 게시판 생성"}</h1>
          </div>
        </div>

        {formLoading && isEdit ? (
          <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>데이터를 불러오는 중...</div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 14, padding: "20px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              {/* 기본 설정 */}
              <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 800, color: "#111", borderBottom: "2px solid #111", paddingBottom: 8 }}>기본 설정</h3>
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 6 }}>고유 ID (테이블) *</label>
                <input name="board_id" value={formData.board_id} onChange={handleFormChange} readOnly={isEdit} required placeholder="예) bbs_1"
                  style={{ width: "100%", padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", background: isEdit ? "#f3f4f6" : "#fff", color: isEdit ? "#9ca3af" : "#111" }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 6 }}>게시판명 *</label>
                <input name="name" value={formData.name} onChange={handleFormChange} required placeholder="예) 자유게시판"
                  style={{ width: "100%", padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 6 }}>보조 타이틀</label>
                <input name="subtitle" value={formData.subtitle} onChange={handleFormChange} placeholder="예) 회원가입 관련 서식 모음"
                  style={{ width: "100%", padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 6 }}>스킨 선택 *</label>
                <select name="skin_type" value={formData.skin_type} onChange={handleFormChange}
                  style={{ width: "100%", padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff" }}>
                  <option value="LIST">일반 목록형 (LIST)</option>
                  <option value="FILE_THUMB">자료실형 (FILE_THUMB)</option>
                  <option value="GALLERY">갤러리형 (GALLERY)</option>
                </select>
              </div>

              {/* 권한 설정 */}
              <h3 style={{ margin: "24px 0 16px 0", fontSize: 16, fontWeight: 800, color: "#111", borderBottom: "2px solid #111", paddingBottom: 8 }}>권한 설정</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#4b5563", marginBottom: 4 }}>목록 보기</label>
                  <select name="perm_list" value={formData.perm_list} onChange={handleFormChange} style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, background: "#fff" }}>
                    {PERMISSION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#4b5563", marginBottom: 4 }}>글 읽기</label>
                  <select name="perm_read" value={formData.perm_read} onChange={handleFormChange} style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, background: "#fff" }}>
                    {PERMISSION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#4b5563", marginBottom: 4 }}>글 쓰기</label>
                  <select name="perm_write" value={formData.perm_write} onChange={handleFormChange} style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, background: "#fff" }}>
                    {PERMISSION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>

              {/* 기타 설정 */}
              <h3 style={{ margin: "24px 0 16px 0", fontSize: 16, fontWeight: 800, color: "#111", borderBottom: "2px solid #111", paddingBottom: 8 }}>기타 설정</h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#4b5563" }}>에디터 사용</span>
                  <div style={{ display: "flex", gap: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="radio" checked={formData.use_editor} onChange={() => handleRadioChange('use_editor', true)} /> 사용</label>
                    <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="radio" checked={!formData.use_editor} onChange={() => handleRadioChange('use_editor', false)} /> 미사용</label>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#4b5563" }}>게시물 승인기능</span>
                  <div style={{ display: "flex", gap: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="radio" checked={formData.require_approval} onChange={() => handleRadioChange('require_approval', true)} /> 사용</label>
                    <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="radio" checked={!formData.require_approval} onChange={() => handleRadioChange('require_approval', false)} /> 미사용</label>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#4b5563" }}>파일 업로드</span>
                  <div style={{ display: "flex", gap: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="radio" checked={formData.allow_upload} onChange={() => handleRadioChange('allow_upload', true)} /> 허용</label>
                    <label style={{ display: "flex", alignItems: "center", gap: 4 }}><input type="radio" checked={!formData.allow_upload} onChange={() => handleRadioChange('allow_upload', false)} /> 불가</label>
                  </div>
                </div>
              </div>

            </div>

            {/* 고정 바텀 버튼 */}
            <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 16px", background: "#fff", borderTop: "1px solid #e5e7eb", display: "flex", gap: 10, zIndex: 100 }}>
              <button type="button" onClick={() => router.push("/m/admin/board")} style={{ flex: 1, height: 48, background: "#f3f4f6", color: "#4b5563", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>취소</button>
              <button type="submit" disabled={formLoading} style={{ flex: 2, height: 48, background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: formLoading ? 0.7 : 1 }}>
                {formLoading ? "저장 중..." : (isEdit ? "수정 저장" : "게시판 추가")}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#f4f5f7" }}>
      {/* 헤더 */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push('/m?menu=open')} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>게시판관리</h1>
        </div>
        <button onClick={() => router.push("/m/admin/board?action=new")} style={{ background: "#3b82f6", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 13, fontWeight: 700, color: "#fff" }}>
          + 추가
        </button>
      </div>

      <div style={{ padding: "16px 16px 100px" }}>
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#9ca3af", fontSize: 14, fontWeight: 600 }}>불러오는 중...</div>
        ) : dbBoards.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>등록된 게시판이 없습니다.</div>
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
                <span style={{ fontWeight: 700, color: "#4b5563" }}>목록권한</span>
                <span>Lv.{b.perm_list || 0}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontWeight: 700, color: "#4b5563" }}>읽기권한</span>
                <span>Lv.{b.perm_read || 0}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontWeight: 700, color: "#4b5563" }}>쓰기권한</span>
                <span>Lv.{b.perm_write || 0}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => router.push(`/m/admin/board?action=edit&id=${b.board_id}`)} style={{ flex: 1, height: 36, background: "#f3f4f6", color: "#4b5563", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
                설정 수정
              </button>
              <button onClick={() => handleDelete(b.board_id)} style={{ width: 44, height: 36, background: "#fff", color: "#9ca3af", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 }}>
                🗑️
              </button>
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
