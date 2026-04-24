"use client";

import React, { useState } from "react";
import { AdminTheme } from "./types";
import { CommentDetailPanel, MOCK_INTERACTIONS, InteractiveData } from "./comment/CommentDetailPanel";

interface CommentSectionProps {
  theme: AdminTheme;
  role: "admin" | "realtor" | "user";
  memberId?: string;
}

export default function CommentSection({ theme, role, memberId }: CommentSectionProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  
  const [activeTab, setActiveTab] = useState("전체");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selectedInteraction, setSelectedInteraction] = useState<InteractiveData | null>(null);
  const [interactions, setInteractions] = useState<InteractiveData[]>(MOCK_INTERACTIONS);

  // 필터 로직
  const filteredList = interactions.filter(item => {
    if (activeTab === "공실 매물" && item.sourceType !== "vacancy") return false;
    if (activeTab === "뉴스 기사" && item.sourceType !== "article") return false;

    if (showUnreadOnly && item.isRead) return false;
    
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      if (!item.authorName.toLowerCase().includes(kw) && !item.content.toLowerCase().includes(kw) && !item.sourceTitle.toLowerCase().includes(kw)) {
        return false;
      }
    }
    return true;
  });

  const getSourceBadge = (type: string) => {
    switch (type) {
      case "vacancy": return <span style={{ padding: "4px 8px", background: darkMode ? "rgba(217, 119, 6, 0.2)" : "#fef3c7", color: "#d97706", borderRadius: 4, fontSize: 11, fontWeight: 800 }}>공실 파크</span>;
      case "article": return <span style={{ padding: "4px 8px", background: darkMode ? "rgba(37, 99, 235, 0.2)" : "#dbeafe", color: "#2563eb", borderRadius: 4, fontSize: 11, fontWeight: 800 }}>공실 뉴스</span>;
      case "homepage": return <span style={{ padding: "4px 8px", background: darkMode ? "rgba(5, 150, 105, 0.2)" : "#d1fae5", color: "#059669", borderRadius: 4, fontSize: 11, fontWeight: 800 }}>내 홈페이지</span>;
      default: return null;
    }
  };

  const handleRowClick = (item: InteractiveData) => {
    // 읽음 처리
    if (!item.isRead) {
      setInteractions(prev => prev.map(p => p.id === item.id ? { ...p, isRead: true } : p));
    }
    // Deep copy to prevent reference issues in local mock state rendering
    setSelectedInteraction({ ...item, isRead: true });
  };

  const handleReply = (id: string, text: string, isSecret: boolean) => {
    alert(`답글이 등록되었습니다. (비밀글: ${isSecret})\n내용: ${text}`);
    setInteractions(prev => prev.map(p => p.id === id ? { ...p, isReplied: true } : p));
    setSelectedInteraction(null);
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
      {/* 화면 타이틀 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: textPrimary, margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 26 }}>💬</span>
              <span>공실</span><span style={{ color: "#3b82f6" }}>Talk</span>
            </span>
          </h1>
          <p style={{ fontSize: 14, color: textSecondary, margin: 0 }}>
            {role === "admin" 
              ? "공실뉴스 플랫폼 전체의 모든 대화와 댓글을 한 곳에서 통합 관리합니다."
              : "내 공실과 기사에 달린 댓글, 문의를 확인하고 회원과 소통하세요."
            }
          </p>
        </div>
      </div>

      {/* 메인 컨테이너 */}
      <div style={{ background: cardBg, borderRadius: 12, boxShadow: "0 4px 6px rgba(0,0,0,0.05)", border: `1px solid ${border}`, overflow: "hidden" }}>
        
        {/* 상단 탭 */}
        <div style={{ display: "flex", borderBottom: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#f8fafc" }}>
          {["전체", "공실 매물", "뉴스 기사"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, height: 48, background: "none", border: "none",
              borderBottom: activeTab === tab ? "2px solid #3b82f6" : "2px solid transparent",
              color: activeTab === tab ? "#3b82f6" : textSecondary,
              fontSize: 14, fontWeight: activeTab === tab ? 800 : 600,
              cursor: "pointer", transition: "all 0.2s"
            }}>
              {tab}
            </button>
          ))}
        </div>

        {/* 필터 및 액션 바 */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}`, display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
          {/* 검색 및 미확인 필터 */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1 }}>
            <input type="text" value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} 
              placeholder="작성자, 내용, 관련 글 제목 검색" 
              style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#1f2023" : "#fff", outline: "none", flex: 1, maxWidth: 300 }} 
            />
            <button style={{ height: 36, padding: "0 16px", background: darkMode ? "#374151" : "#e5e7eb", color: textPrimary, border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>검색</button>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: textPrimary }}>
            <input type="checkbox" checked={showUnreadOnly} onChange={e => setShowUnreadOnly(e.target.checked)} style={{ accentColor: "#3b82f6", width: 16, height: 16 }} />
            안 읽은 문의만 보기
          </label>
        </div>

        {/* 리스트 테이블 */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
            <thead style={{ background: darkMode ? "#232428" : "#f9fafb", borderBottom: `1px solid ${border}` }}>
              <tr>
                <th style={{ padding: "14px 24px", textAlign: "left", fontSize: 13, color: textSecondary, fontWeight: 700, width: "12%" }}>분류 (출처)</th>
                <th style={{ padding: "14px 12px", textAlign: "left", fontSize: 13, color: textSecondary, fontWeight: 700, width: "20%" }}>관련 글 / 상품</th>
                <th style={{ padding: "14px 12px", textAlign: "left", fontSize: 13, color: textSecondary, fontWeight: 700 }}>내용 요약</th>
                <th style={{ padding: "14px 12px", textAlign: "center", fontSize: 13, color: textSecondary, fontWeight: 700, width: "12%" }}>작성자</th>
                <th style={{ padding: "14px 12px", textAlign: "center", fontSize: 13, color: textSecondary, fontWeight: 700, width: "12%" }}>등록일</th>
                <th style={{ padding: "14px 24px", textAlign: "center", fontSize: 13, color: textSecondary, fontWeight: 700, width: "12%" }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: textSecondary, fontSize: 14 }}>조건에 맞는 내역이 없습니다.</td></tr>
              ) : filteredList.map(item => {
                const isUnread = !item.isRead;
                return (
                  <tr key={item.id} onClick={() => handleRowClick(item)} style={{ 
                    borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}`, 
                    cursor: "pointer", transition: "background 0.2s",
                    background: isUnread ? (darkMode ? "rgba(59, 130, 246, 0.05)" : "#eff6ff") : "transparent"
                  }} onMouseEnter={e => e.currentTarget.style.background = darkMode ? "#2c2d31" : "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = isUnread ? (darkMode ? "rgba(59, 130, 246, 0.05)" : "#eff6ff") : "transparent"}>
                    
                    <td style={{ padding: "16px 24px", verticalAlign: "middle" }}>
                      {getSourceBadge(item.sourceType)}
                      {isUnread && <span style={{ marginLeft: 6, display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} title="새로운 문의/댓글" />}
                    </td>
                    
                    <td style={{ padding: "16px 12px", verticalAlign: "middle", fontSize: 13, color: textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 150 }}>
                      {item.sourceTitle}
                    </td>

                    <td style={{ padding: "16px 12px", verticalAlign: "middle" }}>
                      <div style={{ fontSize: 14, fontWeight: isUnread ? 700 : 500, color: textPrimary, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.5 }}>
                        {item.isSecret && <span title="비밀글" style={{ marginRight: 6 }}>🔒</span>}
                        {item.content}
                      </div>
                    </td>

                    <td style={{ padding: "16px 12px", textAlign: "center", verticalAlign: "middle", fontSize: 13, color: textSecondary }}>
                      {item.authorName}
                    </td>

                    <td style={{ padding: "16px 12px", textAlign: "center", verticalAlign: "middle", fontSize: 12, color: textSecondary }}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>

                    <td style={{ padding: "16px 24px", textAlign: "center", verticalAlign: "middle" }}>
                      {item.isReplied ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981", border: "1px solid #10b981", padding: "2px 8px", borderRadius: 12 }}>답변완료</span>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 700, color: textSecondary, border: `1px solid ${textSecondary}`, padding: "2px 8px", borderRadius: 12 }}>답변대기</span>
                      )}
                    </td>

                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 우측 상세 패널 */}
      {selectedInteraction && (
        <CommentDetailPanel 
          theme={theme} 
          interaction={selectedInteraction} 
          onClose={() => setSelectedInteraction(null)} 
          onReply={handleReply}
        />
      )}
    </div>
  );
}
