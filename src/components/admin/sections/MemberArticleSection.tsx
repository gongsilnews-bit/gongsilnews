"use client";

import React, { useState, useEffect } from "react";
import { AdminSectionProps } from "./types";
import { getMyArticles, adminUpdateArticleStatus, deleteArticle } from "@/app/actions/article";

interface MemberArticleSectionProps extends AdminSectionProps {
  memberId: string;
  memberName: string;
  memberEmail?: string;
  /** 'realtor' | 'user' – 저장 후 돌아갈 admin 경로 판별용 */
  role?: string;
}

export default function MemberArticleSection({ theme, memberId, memberName, memberEmail, role }: MemberArticleSectionProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  const [articles, setArticles] = useState<any[]>([]);
  const [filter, setFilter] = useState("전체");
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchArticles = async () => {
    setLoading(true);
    const res = await getMyArticles(memberId);
    if (res.success) setArticles(res.data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (memberId) fetchArticles();
  }, [memberId]);

  const filtered = articles.filter(a => {
    if (filter === "전체") return true;
    if (filter === "승인대기") return a.status === "PENDING";
    if (filter === "발행됨") return a.status === "APPROVED";
    if (filter === "작성중") return a.status === "DRAFT";
    if (filter === "반려") return a.status === "REJECTED";
    return true;
  });

  /* 승인신청: DRAFT → PENDING */
  const handleRequestApproval = async () => {
    if (checkedIds.length === 0) { alert("승인신청할 기사를 선택하세요."); return; }
    const drafts = checkedIds.filter(id => {
      const a = articles.find(x => x.id === id);
      return a && (a.status === "DRAFT" || a.status === "REJECTED");
    });
    if (drafts.length === 0) { alert("작성중 또는 반려된 기사만 승인신청할 수 있습니다."); return; }
    if (!confirm(`선택한 ${drafts.length}건의 기사를 승인신청하시겠습니까?`)) return;
    const res = await adminUpdateArticleStatus(drafts, "PENDING");
    if (res.success) { await fetchArticles(); setCheckedIds([]); }
    else alert("오류: " + res.error);
  };

  /* 삭제: DRAFT만 가능 */
  const handleDelete = async (id: string) => {
    const a = articles.find(x => x.id === id);
    if (!a || a.status !== "DRAFT") { alert("작성중 상태의 기사만 삭제할 수 있습니다."); return; }
    if (!confirm("기사를 삭제하시겠습니까?")) return;
    const res = await deleteArticle(id);
    if (res.success) await fetchArticles();
    else alert("삭제 실패: " + res.error);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; label: string }> = {
      PENDING: { bg: "#8b5cf6", label: "승인대기" },
      APPROVED: { bg: "#10b981", label: "발행됨" },
      REJECTED: { bg: "#ef4444", label: "반려됨" },
      DRAFT: { bg: "#9ca3af", label: "작성중" },
    };
    const s = map[status] || { bg: "#9ca3af", label: status };
    return <span style={{ padding: "4px 8px", background: s.bg, color: "#fff", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>{s.label}</span>;
  };

  const basePath = role === "realtor" ? "/realty_admin" : "/user_admin";
  const returnParam = role === "realtor" ? "realty_admin" : "user_admin";
  const writeUrl = `${basePath}/news_write?return=${returnParam}`;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>기사관리</h1>
        <span style={{ fontSize: 13, fontWeight: 600, color: textSecondary }}>
          ( 승인대기 {articles.filter(a => a.status === "PENDING").length}건 / 전체 {articles.length}건 )
        </span>
      </div>

      <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        {/* 필터 탭 */}
        <div style={{ display: "flex", borderBottom: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#fafafa", padding: "0 16px" }}>
          {["전체", "승인대기", "발행됨", "작성중", "반려"].map(tab => (
            <button key={tab} onClick={() => { setFilter(tab); setCheckedIds([]); }}
              style={{ border: "none", background: "none", padding: "16px 20px", fontSize: 14, fontWeight: filter === tab ? 800 : 600, color: filter === tab ? "#3b82f6" : textSecondary, borderBottom: filter === tab ? "3px solid #3b82f6" : "3px solid transparent", cursor: "pointer" }}>
              {tab}
              {tab === "승인대기" && <span style={{ marginLeft: 6, background: "#ef4444", color: "#fff", padding: "2px 6px", borderRadius: 10, fontSize: 11 }}>{articles.filter(a => a.status === "PENDING").length}</span>}
              {tab === "반려" && <span style={{ marginLeft: 6, background: "#f59e0b", color: "#fff", padding: "2px 6px", borderRadius: 10, fontSize: 11 }}>{articles.filter(a => a.status === "REJECTED").length}</span>}
            </button>
          ))}
        </div>

        {/* 액션 버튼 */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}`, display: "flex", gap: 10, alignItems: "center" }}>
          <a href={writeUrl} style={{ display: "flex", alignItems: "center", height: 36, padding: "0 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none", gap: 6 }}>+ 새 기사 작성</a>
          <button onClick={handleRequestApproval}
            style={{ height: 36, padding: "0 16px", background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            📋 승인신청
          </button>
          <span style={{ fontSize: 12, color: textSecondary, marginLeft: 4 }}>
            ※ 작성중/반려 기사만 승인신청 가능
          </span>
        </div>

        {/* 안내 배너 */}
        <div style={{ margin: "16px 24px 0", padding: "12px 16px", background: darkMode ? "#1e293b" : "#eff6ff", borderRadius: 8, border: `1px solid ${darkMode ? "#334155" : "#bfdbfe"}`, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>💡</span>
          <span style={{ fontSize: 13, color: darkMode ? "#93c5fd" : "#1d4ed8", fontWeight: 600 }}>
            기사를 작성 후 &quot;승인신청&quot;을 하면 최고관리자 검토 후 발행됩니다. 반려된 기사는 수정 후 재신청할 수 있습니다.
          </span>
        </div>

        {/* 테이블 */}
        <div style={{ overflowX: "auto", padding: "0 0 8px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900, whiteSpace: "nowrap" }}>
            <thead>
              <tr style={{ background: darkMode ? "#2c2d31" : "#f9fafb" }}>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 40 }}>
                  <input type="checkbox" style={{ accentColor: "#3b82f6" }} onChange={(e) => setCheckedIds(e.target.checked ? filtered.map(a => a.id) : [])} checked={filtered.length > 0 && checkedIds.length === filtered.length} />
                </th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 80 }}>상태</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 100 }}>섹션</th>
                <th style={{ padding: "12px 10px", textAlign: "left", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}` }}>기사 제목</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 120 }}>작성일</th>
                <th style={{ padding: "12px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 150 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: textSecondary }}>불러오는 중...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: textSecondary }}>
                  {filter === "전체" ? "작성한 기사가 없습니다. '새 기사 작성' 버튼을 클릭하여 시작하세요." : "조회된 기사가 없습니다."}
                </td></tr>
              ) : filtered.map((a) => (
                <tr key={a.id} style={{ borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}` }}>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                    <input type="checkbox" style={{ accentColor: "#3b82f6" }} checked={checkedIds.includes(a.id)} onChange={(e) => {
                      if (e.target.checked) setCheckedIds(prev => [...prev, a.id]);
                      else setCheckedIds(prev => prev.filter(id => id !== a.id));
                    }} />
                  </td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                    {statusBadge(a.status)}
                  </td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", color: textSecondary }}>{a.section1 || "-"}</td>
                  <td style={{ padding: "16px 10px", textAlign: "left", verticalAlign: "middle" }}>
                    <a href={`${basePath}/news_write?id=${a.id}&return=${returnParam}`}
                      style={{ fontWeight: 700, fontSize: 15, color: textPrimary, textDecoration: "none" }}>
                      {a.title || "(제목 없음)"}
                    </a>
                    {a.status === "REJECTED" && a.reject_reason && (
                      <div style={{ marginTop: 4, fontSize: 12, color: "#ef4444", fontWeight: 600 }}>
                        반려 사유: {a.reject_reason}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", color: textSecondary }}>
                    {a.created_at ? new Date(a.created_at).toISOString().split("T")[0] : "-"}
                  </td>
                  <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                      <a href={`${basePath}/news_write?id=${a.id}&return=${returnParam}`}
                        style={{ padding: "6px 12px", background: "#3b4363", color: "#fff", textDecoration: "none", borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                        {a.status === "DRAFT" || a.status === "REJECTED" ? "수정" : "보기"}
                      </a>
                      {a.status === "DRAFT" && (
                        <button onClick={() => handleDelete(a.id)}
                          style={{ padding: "6px 12px", background: darkMode ? "#2c2d31" : "#fff", border: `1px solid ${border}`, color: textSecondary, borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          삭제
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
