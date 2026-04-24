"use client";

import React, { useState, useEffect } from "react";
import { AdminTheme } from "./types";
import { CommentDetailPanel, InteractiveData } from "./comment/CommentDetailPanel";
import { getAllTalkItems, TalkItem } from "@/app/actions/talk";

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
  const [interactions, setInteractions] = useState<InteractiveData[]>([]);
  const [loading, setLoading] = useState(true);

  // 실제 데이터 조회
  useEffect(() => {
    async function fetchTalkData() {
      setLoading(true);
      try {
        const res = await getAllTalkItems(role === "admin" ? undefined : memberId);
        if (res.success && res.data) {
          const mapped: InteractiveData[] = res.data.map(item => ({
            id: item.id,
            sourceType: item.sourceType,
            sourceTitle: item.sourceTitle,
            authorName: item.authorName,
            content: item.content,
            isSecret: item.isSecret,
            isRead: item.isRead,
            isReplied: item.isReplied,
            createdAt: item.createdAt,
          }));
          setInteractions(mapped);
        }
      } catch (err) {
        console.error("공실Talk 데이터 로드 실패:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTalkData();
  }, [role, memberId]);

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
      default: return null;
    }
  };

  const handleRowClick = (item: InteractiveData) => {
    if (!item.isRead) {
      setInteractions(prev => prev.map(p => p.id === item.id ? { ...p, isRead: true } : p));
    }
    setSelectedInteraction({ ...item, isRead: true });
  };

  const handleReply = (id: string, text: string, isSecret: boolean) => {
    alert(`답글이 등록되었습니다. (비밀글: ${isSecret})\n내용: ${text}`);
    setInteractions(prev => prev.map(p => p.id === id ? { ...p, isReplied: true } : p));
    setSelectedInteraction(null);
  };

  const vacancyCount = interactions.filter(i => i.sourceType === "vacancy").length;
  const articleCount = interactions.filter(i => i.sourceType === "article").length;

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
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: textSecondary }}>
            전체 <strong style={{ color: textPrimary }}>{interactions.length}</strong>건
          </span>
        </div>
      </div>

      {/* 메인 컨테이너 */}
      <div style={{ background: cardBg, borderRadius: 12, boxShadow: "0 4px 6px rgba(0,0,0,0.05)", border: `1px solid ${border}`, overflow: "hidden" }}>
        
        {/* 상단 탭 */}
        <div style={{ display: "flex", borderBottom: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#f8fafc" }}>
          {[
            { label: "전체", count: interactions.length },
            { label: "공실 매물", count: vacancyCount },
            { label: "뉴스 기사", count: articleCount },
          ].map(tab => (
            <button key={tab.label} onClick={() => setActiveTab(tab.label)} style={{
              flex: 1, height: 48, background: "none", border: "none",
              borderBottom: activeTab === tab.label ? "2px solid #3b82f6" : "2px solid transparent",
              color: activeTab === tab.label ? "#3b82f6" : textSecondary,
              fontSize: 14, fontWeight: activeTab === tab.label ? 800 : 600,
              cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6
            }}>
              {tab.label}
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 10, background: activeTab === tab.label ? "#3b82f6" : (darkMode ? "#374151" : "#e5e7eb"), color: activeTab === tab.label ? "#fff" : textSecondary }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* 필터 및 액션 바 */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}`, display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
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
          {loading ? (
            <div style={{ padding: 60, textAlign: "center", color: textSecondary }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>공실Talk 데이터를 불러오고 있습니다...</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
              <thead style={{ background: darkMode ? "#232428" : "#f9fafb", borderBottom: `1px solid ${border}` }}>
                <tr>
                  <th style={{ padding: "14px 24px", textAlign: "left", fontSize: 13, color: textSecondary, fontWeight: 700, width: "12%" }}>분류</th>
                  <th style={{ padding: "14px 12px", textAlign: "left", fontSize: 13, color: textSecondary, fontWeight: 700, width: "20%" }}>관련 글 / 매물</th>
                  <th style={{ padding: "14px 12px", textAlign: "left", fontSize: 13, color: textSecondary, fontWeight: 700 }}>내용 요약</th>
                  <th style={{ padding: "14px 12px", textAlign: "center", fontSize: 13, color: textSecondary, fontWeight: 700, width: "12%" }}>작성자</th>
                  <th style={{ padding: "14px 12px", textAlign: "center", fontSize: 13, color: textSecondary, fontWeight: 700, width: "12%" }}>등록일</th>
                  <th style={{ padding: "14px 24px", textAlign: "center", fontSize: 13, color: textSecondary, fontWeight: 700, width: "10%" }}>상태</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 60, textAlign: "center", color: textSecondary, fontSize: 14 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                    조건에 맞는 대화가 없습니다.
                  </td></tr>
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
          )}
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
