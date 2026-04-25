"use client";

import React, { useState, useEffect } from "react";
import { AdminSectionProps } from "./types";
import { getBoards, deleteBoard } from "@/app/actions/board";
import BoardRegisterForm from "./BoardRegisterForm";

export default function BoardSection({ theme }: AdminSectionProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  const [dbBoards, setDbBoards] = useState<any[]>([]);
  const [showBoardRegister, setShowBoardRegister] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  useEffect(() => {
    getBoards().then(res => { if (res.success) setDbBoards(res.data || []); });
  }, []);

  if (showBoardRegister) {
    return (
      <BoardRegisterForm
        darkMode={darkMode}
        editBoardId={selectedBoardId}
        onBack={() => {
          setShowBoardRegister(false);
          setSelectedBoardId(null);
          getBoards().then(res => { if (res.success) setDbBoards(res.data || []); });
        }}
      />
    );
  }

  const openCreateForm = () => {
    setSelectedBoardId(null);
    setShowBoardRegister(true);
  };

  const openEditForm = (row: any) => {
    setSelectedBoardId(row.board_id);
    setShowBoardRegister(true);
  };

  const skinLabels: Record<string, string> = { FILE_THUMB: "자료실형 (영상/파일)", VIDEO_ALBUM: "자료실형 (영상/파일)", LIST: "일반 목록형", GALLERY: "갤러리형" };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>게시판 리스트 및 설정</h1>
        <button onClick={openCreateForm} style={{ height: 38, padding: "0 18px", background: darkMode ? "#2c2d31" : "#374151", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = darkMode ? "#3f3f46" : "#4b5563"} onMouseLeave={(e) => e.currentTarget.style.background = darkMode ? "#2c2d31" : "#374151"}>+ 새 게시판 생성</button>
      </div>

      <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
            <thead>
              <tr style={{ background: darkMode ? "#2c2d31" : "#f9fafb" }}>
                {["고유 ID","게시판명","스킨 테마 설정","권한 설정 (목록/읽기/쓰기)","관리 액션"].map((h,i) => (
                  <th key={i} style={{ padding: "14px 20px", textAlign: i >= 3 ? "center" : "left" as any, fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dbBoards.length > 0 ? dbBoards.map((row, idx) => {
                return (
                  <tr key={row.id || idx} style={{ borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}`, transition: "background 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#3a3b3f" : "#f1f3f5"; }}
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
                        <button onClick={() => openEditForm(row)} style={{ height: 30, padding: "0 12px", background: darkMode ? "#374151" : "#4b5563", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          수정
                        </button>
                        <button onClick={async () => { if (confirm(`'${row.name}' 게시판을 삭제하시겠습니까?`)) { const res = await deleteBoard(row.board_id); if (res.success) setDbBoards(prev => prev.filter(b => b.board_id !== row.board_id)); else alert('삭제 실패: ' + res.error); }}} style={{ height: 30, padding: "0 12px", background: darkMode ? "#2c2d31" : "#fff", color: "#9ca3af", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          삭제
                        </button>
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
    </div>
  );
}
