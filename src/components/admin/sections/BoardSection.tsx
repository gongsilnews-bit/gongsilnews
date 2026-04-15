"use client";

import React, { useState, useEffect } from "react";
import { AdminSectionProps } from "./types";
import { getBoards, deleteBoard, saveBoard } from "@/app/actions/board";

export default function BoardSection({ theme }: AdminSectionProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  const [dbBoards, setDbBoards] = useState<any[]>([]);
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [boardId, setBoardId] = useState("");
  const [boardName, setBoardName] = useState("");
  const [boardSubtitle, setBoardSubtitle] = useState("");
  const [boardSkinType, setBoardSkinType] = useState("LIST");
  const [boardCategories, setBoardCategories] = useState("");
  const [permList, setPermList] = useState<number>(0);
  const [permRead, setPermRead] = useState<number>(0);
  const [permWrite, setPermWrite] = useState<number>(9);

  useEffect(() => {
    getBoards().then(res => { if (res.success) setDbBoards(res.data || []); });
  }, []);

  const openCreateModal = () => {
    setEditingBoardId(null); setBoardId(""); setBoardName(""); setBoardSubtitle(""); setBoardSkinType("LIST"); setBoardCategories(""); setPermList(0); setPermRead(0); setPermWrite(9); setShowBoardModal(true);
  };

  const openEditModal = (row: any) => {
    setEditingBoardId(row.id); setBoardId(row.board_id); setBoardName(row.name || ""); setBoardSubtitle(row.subtitle || row.description || ""); setBoardSkinType(row.skin_type || "LIST"); setBoardCategories(row.categories || ""); setPermList(row.perm_list ?? 0); setPermRead(row.perm_read ?? 0); setPermWrite(row.perm_write ?? 9); setShowBoardModal(true);
  };

  const skinLabels: Record<string, string> = { FILE_THUMB: "자료실형 (영상/파일)", VIDEO_ALBUM: "자료실형 (영상/파일)", LIST: "일반 목록형", GALLERY: "갤러리형" };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>게시판 리스트 및 설정</h1>
        <button onClick={openCreateModal} style={{ height: 38, padding: "0 18px", background: "#374151", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ 새 게시판 생성</button>
      </div>

      <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
            <thead>
              <tr>
                {["고유 ID","게시판명","스킨 테마 설정","권한 설정 (목록/읽기/쓰기)","관리 액션"].map((h,i) => (
                  <th key={i} style={{ padding: "14px 20px", textAlign: i >= 3 ? "center" : "left" as any, fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dbBoards.length > 0 ? dbBoards.map((row, idx) => {
                const isVideo = row.skin_type === 'VIDEO_ALBUM' || row.skin_type === 'FILE_THUMB';
                return (
                  <tr key={row.id || idx} style={{ borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}`, transition: "background 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#2c2d31" : "#fafbfc"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                    <td style={{ padding: "16px 20px", verticalAlign: "middle", fontSize: 14, color: textSecondary, fontFamily: "monospace" }}>{row.board_id}</td>
                    <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
                      <span style={{ fontWeight: 700, color: textPrimary, fontSize: 15 }}>{row.name}</span>
                      {row.description && <span style={{ fontSize: 13, color: textSecondary, marginLeft: 6 }}>({row.description})</span>}
                    </td>
                    <td style={{ padding: "16px 20px", verticalAlign: "middle", fontSize: 14, color: textSecondary }}>{skinLabels[row.skin_type] || row.skin_type}</td>
                    <td style={{ padding: "16px 20px", textAlign: "center", verticalAlign: "middle", fontSize: 15, fontWeight: 600, color: textSecondary }}>{row.perm_list} / {row.perm_read} / {row.perm_write}</td>
                    <td style={{ padding: "16px 20px", textAlign: "center", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                        <button onClick={() => openEditModal(row)} style={{ height: 30, padding: "0 12px", background: "#4b5563", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>설정</button>
                        <button onClick={async () => { if (confirm(`'${row.name}' 게시판을 삭제하시겠습니까?`)) { const res = await deleteBoard(row.board_id); if (res.success) setDbBoards(prev => prev.filter(b => b.board_id !== row.board_id)); else alert('삭제 실패: ' + res.error); }}} style={{ height: 30, padding: "0 12px", background: darkMode ? "#2c2d31" : "#fff", color: "#9ca3af", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>삭제</button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={5} style={{ color: "#9ca3af", fontSize: 14, textAlign: "center", padding: 40 }}>등록된 게시판이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 게시판 생성/수정 모달 */}
      {showBoardModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: darkMode ? "#1f2937" : "#ffffff", width: 560, borderRadius: 10, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", overflow: "hidden", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 28px 16px" }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: textPrimary, margin: 0 }}>게시판 {editingBoardId ? "수정" : "생성"}</h2>
              <button onClick={() => setShowBoardModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 20 }}>✕</button>
            </div>
            <div style={{ padding: "10px 28px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>게시판 고유 ID <span style={{ color: "#ef4444" }}>*</span></label>
                <input type="text" placeholder="예: bbs_notice" value={boardId} onChange={e => setBoardId(e.target.value)} disabled={!!editingBoardId} style={{ width: "100%", height: 42, padding: "0 14px", fontSize: 13, border: `1px solid ${border}`, borderRadius: 6, background: editingBoardId ? (darkMode ? "#1a1a1a" : "#f3f4f6") : (darkMode ? "#111" : "#fff"), color: editingBoardId ? "#9ca3af" : textPrimary, outline: "none", fontFamily: "inherit" }} />
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>게시판 이름 <span style={{ color: "#ef4444" }}>*</span></label>
                  <input type="text" placeholder="예: 공지사항" value={boardName} onChange={e => setBoardName(e.target.value)} style={{ width: "100%", height: 42, padding: "0 14px", fontSize: 13, border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#111" : "#fff", color: textPrimary, outline: "none", fontFamily: "inherit" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>보조 타이틀</label>
                  <input type="text" placeholder="예: 자료실" value={boardSubtitle} onChange={e => setBoardSubtitle(e.target.value)} style={{ width: "100%", height: 42, padding: "0 14px", fontSize: 13, border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#111" : "#fff", color: textPrimary, outline: "none", fontFamily: "inherit" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>스킨 / 테마 구조 선택 <span style={{ color: "#ef4444" }}>*</span></label>
                  <select value={boardSkinType} onChange={e => setBoardSkinType(e.target.value)} style={{ width: "100%", height: 42, padding: "0 14px", fontSize: 13, border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#111" : "#fff", color: textPrimary, outline: "none", fontFamily: "inherit" }}>
                    <option value="LIST">📑 일반 리스트형 (자유게시판/공지사항)</option>
                    <option value="FILE_THUMB">📁 자료실형 (영상/파일 통합)</option>
                    <option value="GALLERY">🖼️ 갤러리형 (이미지 위주)</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>가로 갯수 (앨범형)</label>
                  <select style={{ width: "100%", height: 42, padding: "0 14px", fontSize: 13, border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#111" : "#fff", color: textPrimary, outline: "none", fontFamily: "inherit" }}>
                    <option>3개의 보기</option><option>4개의 보기</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>세부 카테고리 (분류)</label>
                <input type="text" placeholder="쉼표(,)로 구분" value={boardCategories} onChange={e => setBoardCategories(e.target.value)} style={{ width: "100%", height: 42, padding: "0 14px", fontSize: 13, border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#111" : "#fff", color: textPrimary, outline: "none", fontFamily: "inherit" }} />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {[{ label: "목록 열람 권한", val: permList, setter: setPermList }, { label: "내용 읽기/다운로드 권한", val: permRead, setter: setPermRead }, { label: "글쓰기 권한", val: permWrite, setter: setPermWrite }].map((col, i) => (
                  <div key={i} style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: textSecondary, marginBottom: 6 }}>{col.label}</label>
                    <select value={col.val} onChange={(e) => col.setter(Number(e.target.value))} style={{ width: "100%", height: 38, padding: "0 10px", fontSize: 12, border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#111" : "#fff", color: textPrimary, outline: "none", fontFamily: "inherit" }}>
                      <option value={0}>비회원 + 전체</option>
                      <option value={1}>1레벨 (일반회원 이상)</option>
                      <option value={5}>5레벨 (기자/제휴 이상)</option>
                      <option value={9}>9레벨 (관리자 전용)</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "20px 28px 28px" }}>
              <button onClick={() => setShowBoardModal(false)} style={{ padding: "0 20px", height: 44, borderRadius: 6, border: `1px solid ${border}`, background: darkMode ? "#374151" : "#ffffff", color: textPrimary, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>취소</button>
              <button onClick={async () => {
                if (!boardId || !boardName || !boardSkinType) { alert("게시판 ID, 이름, 스킨 타입을 모두 입력해주세요."); return; }
                const res = await saveBoard({ id: editingBoardId || undefined, board_id: boardId, name: boardName, subtitle: boardSubtitle, skin_type: boardSkinType, categories: boardCategories, perm_list: permList, perm_read: permRead, perm_write: permWrite });
                if (res.success) { alert("게시판 설정이 저장되었습니다."); setShowBoardModal(false); getBoards().then(r => { if (r.success) setDbBoards(r.data || []) }); }
                else alert("저장 실패: " + res.error);
              }} style={{ padding: "0 24px", height: 44, borderRadius: 6, border: "none", background: "#2a2f3a", color: "#ffffff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>설정 저장하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
