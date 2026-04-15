"use client";

import React, { useState, useEffect } from "react";
import { AdminSectionProps } from "./types";
import { getArticles, deleteArticle, adminUpdateArticleStatus } from "@/app/actions/article";

const REJECT_REASONS = [
  "사진 화질 불량 또는 이미지 누락",
  "제목 및 본문 오타 수정 요망",
  "사실 확인 필요 (내용 불충분)",
  "기타 사유 (직접 입력)"
];

export default function ArticleSection({ theme, initialData }: AdminSectionProps & { initialData?: any[] }) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  const [dbArticles, setDbArticles] = useState<any[]>(initialData || []);
  const [articleFilter, setArticleFilter] = useState("전체");
  const [checkedArticleIds, setCheckedArticleIds] = useState<string[]>([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedArticleIdsForReject, setSelectedArticleIdsForReject] = useState<string[]>([]);

  useEffect(() => {
    if (!initialData) getArticles().then(res => { if (res.success) setDbArticles(res.data || []); });
  }, []);

  const filtered = dbArticles.filter(a => {
    if (articleFilter === "전체") return true;
    if (articleFilter === "승인대기") return a.status === 'PENDING';
    if (articleFilter === "발행됨") return a.status === 'APPROVED';
    if (articleFilter === "작성중") return a.status === 'DRAFT';
    if (articleFilter === "반려") return a.status === 'REJECTED';
    return true;
  });

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>기사관리</h1>
        <span style={{ fontSize: 13, fontWeight: 600, color: textSecondary }}>
          ( 승인대기 {dbArticles.filter(a => a.status === 'PENDING').length}건 / 전체 {dbArticles.length}건 )
        </span>
      </div>

      <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        {/* 필터 탭 */}
        <div style={{ display: "flex", borderBottom: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#fafafa", padding: "0 16px" }}>
          {["전체", "승인대기", "발행됨", "작성중", "반려"].map(tab => {
            let count = 0;
            if (tab === "전체") count = dbArticles.length;
            else if (tab === "승인대기") count = dbArticles.filter(a => a.status === 'PENDING').length;
            else if (tab === "발행됨") count = dbArticles.filter(a => a.status === 'APPROVED').length;
            else if (tab === "작성중") count = dbArticles.filter(a => a.status === 'DRAFT').length;
            else if (tab === "반려") count = dbArticles.filter(a => a.status === 'REJECTED').length;

            return (
              <button key={tab} onClick={() => { setArticleFilter(tab); setCheckedArticleIds([]); }}
                style={{ border: "none", background: "none", padding: "16px 20px", fontSize: 14, fontWeight: articleFilter === tab ? 800 : 600, color: articleFilter === tab ? "#3b82f6" : textSecondary, borderBottom: articleFilter === tab ? "3px solid #3b82f6" : "3px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                {tab}
                <span style={{ 
                  background: tab === "전체" ? "#e5e7eb" : tab === "승인대기" ? "#ef4444" : tab === "발행됨" ? "#10b981" : tab === "작성중" ? "#9ca3af" : "#f59e0b",
                  color: tab === "전체" ? "#4b5563" : "#fff", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700 
                }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* 액션 버튼 */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}`, display: "flex", gap: 10, alignItems: "center" }}>
          <a href="/admin/news_write" style={{ display: "flex", alignItems: "center", height: 36, padding: "0 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none", gap: 6 }}>+ 새 기사 작성</a>
          <button onClick={async () => {
            if (checkedArticleIds.length === 0) { alert("승인할 기사를 선택하세요."); return; }
            if (confirm(`선택한 ${checkedArticleIds.length}건의 기사를 일괄 승인(발행)하시겠습니까?`)) {
              const res = await adminUpdateArticleStatus(checkedArticleIds, 'APPROVED');
              if (res.success) { getArticles().then(r => setDbArticles(r.data || [])); setCheckedArticleIds([]); }
              else alert("오류가 발생했습니다: " + res.error);
            }
          }} style={{ height: 36, padding: "0 16px", background: "#10b981", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✓ 선택 승인</button>
          <button onClick={() => {
            if (checkedArticleIds.length === 0) { alert("반려할 기사를 선택하세요."); return; }
            setSelectedArticleIdsForReject(checkedArticleIds);
            setShowRejectModal(true);
          }} style={{ height: 36, padding: "0 16px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🚫 선택 반려</button>
        </div>

        {/* 테이블 */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1000, whiteSpace: "nowrap" }}>
            <thead>
              <tr style={{ background: darkMode ? "#2c2d31" : "#f9fafb" }}>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 40 }}>
                  <input type="checkbox" style={{ accentColor: "#3b82f6" }} onChange={(e) => setCheckedArticleIds(e.target.checked ? filtered.map(a => a.id) : [])} />
                </th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 80 }}>상태</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 100 }}>섹션</th>
                <th style={{ padding: "12px 10px", textAlign: "left", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}` }}>기사 제목</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 100 }}>기자명</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 120 }}>발행일</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 150 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: textSecondary }}>조회된 기사가 없습니다.</td></tr>
              ) : filtered.map((a) => (
                <tr key={a.id} style={{ borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}` }}>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                    <input type="checkbox" style={{ accentColor: "#3b82f6" }} checked={checkedArticleIds.includes(a.id)} onChange={(e) => {
                      if (e.target.checked) setCheckedArticleIds(prev => [...prev, a.id]);
                      else setCheckedArticleIds(prev => prev.filter(id => id !== a.id));
                    }} />
                  </td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                    {a.status === 'PENDING' && <span style={{ padding: "4px 8px", background: "#8b5cf6", color: "#fff", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>승인대기</span>}
                    {a.status === 'APPROVED' && <span style={{ padding: "4px 8px", background: "#10b981", color: "#fff", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>발행됨</span>}
                    {a.status === 'REJECTED' && <span style={{ padding: "4px 8px", background: "#ef4444", color: "#fff", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>반려됨</span>}
                    {a.status === 'DRAFT' && <span style={{ padding: "4px 8px", background: "#9ca3af", color: "#fff", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>작성중</span>}
                  </td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", color: textSecondary }}>{a.section1 || '-'}</td>
                  <td style={{ padding: "16px 10px", textAlign: "left", verticalAlign: "middle" }}>
                    <a href={`/admin/news_write?id=${a.id}`} style={{ fontWeight: 700, fontSize: 15, color: textPrimary, textDecoration: "none" }}>{a.title}</a>
                  </td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", color: textPrimary }}>{a.author_name || '-'}</td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", color: textSecondary }}>{a.published_at ? new Date(a.published_at).toISOString().split('T')[0] : '-'}</td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                      <a href={`/admin/news_write?id=${a.id}`} style={{ height: 30, padding: "0 12px", background: darkMode ? "#374151" : "#4b5563", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        수정
                      </a>
                      <button onClick={async () => {
                        if (confirm("기사를 삭제하시겠습니까?")) {
                          const res = await deleteArticle(a.id);
                          if (res.success) getArticles().then(r => setDbArticles(r.data || []));
                          else alert("삭제 실패: " + res.error);
                        }
                      }} style={{ height: 30, padding: "0 12px", background: darkMode ? "#2c2d31" : "#fff", color: "#9ca3af", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 반려 사유 모달 */}
      {showRejectModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: darkMode ? "#1f2937" : "#fff", width: 420, borderRadius: 12, padding: "24px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 18, color: textPrimary, fontWeight: 800 }}>기사 반려 사유 입력</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 13, color: textSecondary }}>선택한 기사를 반려 상태로 변경합니다. 작성자에게 전달할 반려 사유를 선택하거나 기입해주세요.</p>
            <select value={REJECT_REASONS.includes(rejectReason) ? rejectReason : "기타 사유 (직접 입력)"} onChange={(e) => setRejectReason(e.target.value === "기타 사유 (직접 입력)" ? "" : e.target.value)}
              style={{ width: "100%", padding: "12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, marginBottom: 12, outline: "none", color: textPrimary, background: darkMode ? "#374151" : "#fff" }}>
              {REJECT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            {(!REJECT_REASONS.includes(rejectReason) || rejectReason === "기타 사유 (직접 입력)") && (
              <textarea value={rejectReason === "기타 사유 (직접 입력)" ? "" : rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="상세 반려 사유를 직접 입력하세요."
                style={{ width: "100%", height: 80, padding: 12, border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, resize: "none", outline: "none", color: textPrimary, background: darkMode ? "#374151" : "#fff", boxSizing: "border-box" }} />
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 24 }}>
              <button onClick={() => setShowRejectModal(false)} style={{ padding: "10px 18px", background: darkMode ? "#4b5563" : "#f3f4f6", color: darkMode ? "#fff" : "#4b5563", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>취소</button>
              <button onClick={async () => {
                const res = await adminUpdateArticleStatus(selectedArticleIdsForReject, 'REJECTED', rejectReason);
                if (res.success) { getArticles().then(r => setDbArticles(r.data || [])); setCheckedArticleIds([]); setShowRejectModal(false); }
                else alert("처리 실패: " + res.error);
              }} style={{ padding: "10px 18px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>반려 처리</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
