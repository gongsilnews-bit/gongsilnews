"use client";

import React, { useState, useEffect } from "react";
import { saveBoard, getBoard } from "@/app/actions/board";

interface BoardRegisterFormProps {
  onBack: () => void;
  darkMode?: boolean;
  editBoardId?: string | null;
}

export default function BoardRegisterForm({ onBack, darkMode = false, editBoardId = null }: BoardRegisterFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    board_id: "",
    name: "",
    subtitle: "",
    board_type: "standard",
    skin_type: "LIST",
    columns_count: 3,
    perm_list: 0,
    perm_read: 0,
    perm_write: 5,
    categories: "",
    max_photos: 5,
  });

  useEffect(() => {
    if (editBoardId) {
      setLoading(true);
      getBoard(editBoardId).then(res => {
        if (res.success && res.data) {
          setFormData(prev => ({
            ...prev,
            id: res.data.id || "",
            board_id: res.data.board_id || "",
            name: res.data.name || "",
            subtitle: res.data.subtitle || res.data.description || "",
            board_type: res.data.board_type || "standard",
            skin_type: res.data.skin_type || "LIST",
            columns_count: res.data.columns_count || 3,
            perm_list: res.data.perm_list ?? 0,
            perm_read: res.data.perm_read ?? 0,
            perm_write: res.data.perm_write ?? 5,
            categories: res.data.categories || "",
            max_photos: res.data.max_photos ?? 5,
          }));
        }
        setLoading(false);
      });
    }
  }, [editBoardId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let val: any = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    if (e.target.type === 'number' || ['perm_list', 'perm_read', 'perm_write', 'columns_count', 'max_photos'].includes(e.target.name)) {
      val = Number(val);
    }
    setFormData({ ...formData, [e.target.name]: val });
  };

  const handleSubmit = async () => {
    if (!formData.board_id || !formData.name || !formData.skin_type) {
      alert("게시판 ID, 이름, 스킨 타입을 모두 입력해주세요.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        id: formData.id || undefined,
        board_id: formData.board_id,
        name: formData.name,
        subtitle: formData.subtitle,
        board_type: formData.board_type,
        skin_type: formData.skin_type,
        columns_count: formData.columns_count,
        perm_list: formData.perm_list,
        perm_read: formData.perm_read,
        perm_write: formData.perm_write,
        categories: formData.categories,
        max_photos: formData.max_photos
      };

      const res = await saveBoard(payload);
      if (res.success) {
         alert(editBoardId ? "게시판이 수정되었습니다." : "새 게시판이 추가되었습니다.");
         onBack();
      } else {
         alert("저장 실패: " + res.error);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    flex: 1, minHeight: 40, height: 40, padding: "0 14px", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 6,
    fontSize: 14, color: darkMode ? "#e1e4e8" : "#111827", background: darkMode ? "#2c2d31" : "#fff", outline: "none", boxSizing: "border-box" as const
  };

  const readOnlyStyle = {
    ...inputStyle,
    background: darkMode ? "#333" : "#f9fafb",
    color: darkMode ? "#9ca3af" : "#6b7280"
  };

  const labelStyle = { width: 180, fontSize: 13, fontWeight: 700, color: darkMode ? "#e1e4e8" : "#111827", flexShrink: 0, padding: "16px 20px", display: "flex", alignItems: "center", background: darkMode ? "#25262b" : "#f9fafb", borderRight: `1px solid ${darkMode ? "#333" : "#e5e7eb"}` };
  const rowStyle = { display: "flex", borderBottom: `1px solid ${darkMode ? "#333" : "#e5e7eb"}` };
  const contentStyle = { flex: 1, padding: "16px 20px", display: "flex", alignItems: "center" };

  const permissionOptions = [
    { label: "0레벨 (비회원 이상)", value: 0 },
    { label: "1레벨 (일반회원 이상)", value: 1 },
    { label: "2레벨 (무료부동산회원 이상)", value: 2 },
    { label: "3레벨 (공실스터디부동산 이상)", value: 3 },
    { label: "4레벨 (공실뉴스부동산 이상)", value: 4 },
    { label: "5레벨 (최고관리자 이상)", value: 5 },
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: darkMode ? "#1a1b1e" : "#f4f5f7" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <button onClick={onBack} style={{ height: 36, padding: "0 16px", background: "#fff", color: "#4b5563", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
          ← 목록으로
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: darkMode ? "#e1e4e8" : "#111827", margin: 0 }}>
          {editBoardId ? "게시판 수정" : "게시판 추가"}
        </h1>
        {/* 우측 상단 정보 배너 모방 */}
        <div style={{ marginLeft: "auto", fontSize: 13, color: "#ef4444" }}>
          * 게시판 생성 시 코드를 확인해주십시오.
        </div>
      </div>

      <div style={{ background: darkMode ? "#2c2d31" : "#fff", borderRadius: 12, border: `1px solid ${darkMode ? "#333" : "#e5e7eb"}`, overflow: "hidden", marginBottom: 24 }}>
        
        <div style={rowStyle}>
          <div style={labelStyle}>고유 ID <span style={{ color: "#3b82f6", marginLeft: 4 }}>(테이블)</span><span style={{ color: "#ef4444", marginLeft: 4 }}>*</span></div>
          <div style={contentStyle}>
            <input type="text" name="board_id" value={formData.board_id} onChange={handleChange} style={editBoardId ? readOnlyStyle : {...inputStyle, maxWidth: 300}} readOnly={!!editBoardId} placeholder="예) bbs_1" />
          </div>
        </div>

        <div style={rowStyle}>
          <div style={labelStyle}>게시판명 <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span></div>
          <div style={contentStyle}>
            <input type="text" name="name" value={formData.name} onChange={handleChange} style={{...inputStyle, maxWidth: 500}} placeholder="예) 자유게시판" />
          </div>
        </div>
        
        <div style={rowStyle}>
          <div style={labelStyle}>보조 타이틀</div>
          <div style={contentStyle}>
            <input type="text" name="subtitle" value={formData.subtitle} onChange={handleChange} style={{...inputStyle, maxWidth: 500}} placeholder="예) 회원가입 관련 서식 모음" />
          </div>
        </div>

        <div style={rowStyle}>
          <div style={labelStyle}>게시판 유형 ⓘ</div>
          <div style={contentStyle}>
            <select name="board_type" value={formData.board_type} onChange={handleChange} style={{ ...inputStyle, maxWidth: 250 }}>
              <option value="standard">일반 게시판</option>
              <option value="inquiry">1:1 문의형 (비밀게시판)</option>
            </select>
          </div>
        </div>

        <div style={rowStyle}>
          <div style={labelStyle}>쓰기권한 ⓘ</div>
          <div style={{...contentStyle, gap: 16}}>
            <select name="perm_write" value={formData.perm_write} onChange={handleChange} style={{ ...inputStyle, maxWidth: 250 }}>
              {permissionOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </div>

        <div style={rowStyle}>
          <div style={labelStyle}>목록보기권한 ⓘ</div>
          <div style={contentStyle}>
            <select name="perm_list" value={formData.perm_list} onChange={handleChange} style={{ ...inputStyle, maxWidth: 250 }}>
              {permissionOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </div>

        <div style={rowStyle}>
          <div style={labelStyle}>읽기권한 ⓘ</div>
          <div style={contentStyle}>
            <select name="perm_read" value={formData.perm_read} onChange={handleChange} style={{ ...inputStyle, maxWidth: 250 }}>
              {permissionOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </div>



        <div style={rowStyle}>
          <div style={labelStyle}>스킨 선택 ⓘ</div>
          <div style={contentStyle}>
            <select name="skin_type" value={formData.skin_type} onChange={handleChange} style={{ ...inputStyle, maxWidth: 250 }}>
              <option value="LIST">default.bbs</option>
              <option value="FILE_THUMB">video_album</option>
              <option value="GALLERY">default_album</option>
            </select>
          </div>
        </div>

        {formData.board_type === "inquiry" && (
          <div style={rowStyle}>
            <div style={labelStyle}>사진 첨부 개수 ⓘ</div>
            <div style={{ ...contentStyle, gap: 10 }}>
              <select name="max_photos" value={formData.max_photos} onChange={handleChange} style={{ ...inputStyle, maxWidth: 200 }}>
                <option value={0}>사용 안 함</option>
                {[1, 2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>{n}장까지</option>
                ))}
              </select>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>최대 5장 · 등록된 사진은 webp로 변환됩니다</span>
            </div>
          </div>
        )}

        <div style={rowStyle}>
          <div style={labelStyle}>카테고리 ⓘ</div>
          <div style={{...contentStyle, gap: 8}}>
            <input type="text" name="categories" value={formData.categories} onChange={handleChange} style={{...inputStyle, maxWidth: 300}} placeholder="카테고리를 쉼표로 분류합니다. 예) 과일,채소" />
            <button style={{ height: 40, padding: "0 16px", background: "#fff", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 6, color: "#3b82f6", fontSize: 13, fontWeight: "bold", cursor: "pointer" }}>+ 추가</button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, paddingBottom: 60, justifyContent: "flex-end" }}>
        <button onClick={handleSubmit} disabled={loading} style={{ height: 44, padding: "0 32px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: "middle" }}><path d="M5 12l5 5L20 7"></path></svg>
          {loading ? "저장 중..." : "확인"}
        </button>
      </div>

    </div>
  );
}
