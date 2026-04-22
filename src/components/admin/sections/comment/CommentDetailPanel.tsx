"use client";

import React, { useState } from "react";
import { AdminTheme } from "../types";

export interface InteractiveData {
  id: string;
  sourceType: "vacancy" | "article" | "homepage";
  sourceTitle: string;
  authorName: string;
  content: string;
  isSecret: boolean;
  isRead: boolean;
  isReplied: boolean;
  createdAt: string;
}

export const MOCK_INTERACTIONS: InteractiveData[] = [
  {
    id: "int_1",
    sourceType: "vacancy",
    sourceTitle: "[매물] 역삼동 테헤란로 아이파크 월세",
    authorName: "강남수산",
    content: "혹시 보증금 조율 가능한가요? 3천 정도로 맞추고 싶은데...",
    isSecret: true,
    isRead: false,
    isReplied: false,
    createdAt: "2026-04-22T14:50:00Z"
  },
  {
    id: "int_2",
    sourceType: "homepage",
    sourceTitle: "[1:1문의] 내 홈페이지 문의게시판",
    authorName: "익명의 손님",
    content: "전화 넘 안받으시네요. 혹시 이번주 토요일에 사무실 방문하면 뵐 수 있을까요?",
    isSecret: true,
    isRead: true,
    isReplied: false,
    createdAt: "2026-04-22T11:20:00Z"
  },
  {
    id: "int_3",
    sourceType: "article",
    sourceTitle: "[뉴스] 빌딩 거래량 역대 최고치 경신",
    authorName: "꼬마빌딩최고",
    content: "좋은 기사 감사합니다. 저희 지역도 슬슬 온기가 도는 것 같네요.",
    isSecret: false,
    isRead: true,
    isReplied: true,
    createdAt: "2026-04-21T09:12:00Z"
  }
];

interface CommentDetailPanelProps {
  theme: AdminTheme;
  interaction: InteractiveData;
  onClose: () => void;
  onReply: (id: string, text: string, isSecret: boolean) => void;
}

export function CommentDetailPanel({ theme, interaction, onClose, onReply }: CommentDetailPanelProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  const [replyText, setReplyText] = useState("");
  const [replyIsSecret, setReplyIsSecret] = useState(interaction.isSecret); // 원본이 비밀글이면 기본으로 체크되도록

  const handleSend = () => {
    if (!replyText.trim()) return;
    onReply(interaction.id, replyText, replyIsSecret);
    setReplyText("");
  };

  const getSourceBadge = (type: string) => {
    switch (type) {
      case "vacancy": return <span style={{ padding: "4px 8px", background: "#fef3c7", color: "#d97706", borderRadius: 4, fontSize: 11, fontWeight: 800 }}>공실 파크</span>;
      case "article": return <span style={{ padding: "4px 8px", background: "#dbeafe", color: "#2563eb", borderRadius: 4, fontSize: 11, fontWeight: 800 }}>공실 뉴스</span>;
      case "homepage": return <span style={{ padding: "4px 8px", background: "#d1fae5", color: "#059669", borderRadius: 4, fontSize: 11, fontWeight: 800 }}>내 홈페이지</span>;
      default: return null;
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, width: "100vw", height: "100vh",
      background: "rgba(0,0,0,0.3)", zIndex: 9999,
      display: "flex", justifyContent: "flex-end"
    }}>
      <div style={{ flex: 1 }} onClick={onClose} />
      
      <div style={{
        width: 500, background: cardBg,
        boxShadow: "-4px 0 15px rgba(0,0,0,0.1)",
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.3s ease-out"
      }}>
        {/* 헤더 */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ marginBottom: 8 }}>{getSourceBadge(interaction.sourceType)}</div>
            <h2 style={{ margin: "0 0 6px 0", fontSize: 18, color: textPrimary, fontWeight: 700, lineHeight: 1.4 }}>{interaction.sourceTitle}</h2>
            <div style={{ fontSize: 13, color: textSecondary }}>작성자: <strong>{interaction.authorName}</strong></div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 24, color: textSecondary, cursor: "pointer" }}>&times;</button>
        </div>

        {/* 본문/댓글 타임라인 영역 */}
        <div style={{ flex: 1, padding: "24px", overflowY: "auto", background: darkMode ? "#222" : "#fff", display: "flex", flexDirection: "column", gap: 24 }}>
          {/* 유저의 질문/댓글 */}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>👤</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: textPrimary }}>
                  {interaction.authorName} {interaction.isSecret && <span title="비밀글">🔒</span>}
                </span>
                <span style={{ fontSize: 12, color: textSecondary }}>{new Date(interaction.createdAt).toLocaleString()}</span>
              </div>
              <div style={{ background: darkMode ? "#2c2d31" : "#f1f5f9", padding: "14px 16px", borderRadius: "0 12px 12px 12px", fontSize: 14, color: textPrimary, lineHeight: 1.6 }}>
                {interaction.content}
              </div>
            </div>
          </div>

          {/* 중개사 답변 (Mockup condition) */}
          {interaction.isReplied && (
            <div style={{ display: "flex", gap: 12, flexDirection: "row-reverse" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#3b82f6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>ME</div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: textSecondary }}>답변 완료</span>
                </div>
                <div style={{ background: "#3b82f6", color: "#fff", padding: "14px 16px", borderRadius: "12px 0 12px 12px", fontSize: 14, lineHeight: 1.6 }}>
                  (임시 작성된 이전 답변 예시입니다) 안녕하세요, 연락 주셔서 감사합니다. 자세한 내용은 유선으로 친절하게 안내드리겠습니다!
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 답글 입력창 (하단 고정) */}
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#f8fafc", display: "flex", flexDirection: "column", gap: 12 }}>
          <textarea
            value={replyText} onChange={(e) => setReplyText(e.target.value)}
            placeholder={`${interaction.authorName}님에게 답글 작성하기...`}
            style={{ width: "100%", height: 80, padding: "12px", borderRadius: 8, border: `1px solid ${border}`, background: darkMode ? "#1f2023" : "#fff", color: textPrimary, outline: "none", resize: "none", fontFamily: "inherit" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, fontWeight: 700, color: replyIsSecret ? "#3b82f6" : textSecondary }}>
                <input type="checkbox" checked={replyIsSecret} onChange={e => setReplyIsSecret(e.target.checked)} style={{ accentColor: "#3b82f6" }} />
                🔒 비밀글로 답글 달기
              </label>
              <span style={{ fontSize: 12, color: textSecondary }}>답글을 등록하면 해당 회원에게 알림이 발송됩니다.</span>
            </div>
            <button onClick={handleSend} style={{ background: "#3b82f6", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 6, fontWeight: 700, cursor: "pointer" }}>
              답글 등록
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
