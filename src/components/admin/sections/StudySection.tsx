"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminSectionProps } from "./types";
import { getLectures, deleteLecture, updateLectureStatus } from "@/app/actions/lecture";
import StudyWriteForm from "@/components/admin/StudyWriteForm";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  DRAFT: { label: "임시저장", color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db" },
  PENDING: { label: "승인대기", color: "#d97706", bg: "#fef3c7", border: "#fde68a" },
  ACTIVE: { label: "판매중", color: "#92400e", bg: "#fef3c7", border: "#fde68a" },
  CLOSED: { label: "종료", color: "#9ca3af", bg: "#f3f4f6", border: "#d1d5db" },
  DELETED: { label: "삭제", color: "#ef4444", bg: "#fef2f2", border: "#fca5a5" },
};

export default function StudySection({ theme }: AdminSectionProps) {
  const router = useRouter();
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  const [lectures, setLectures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("전체");
  const [searchKw, setSearchKw] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const searchParams = useSearchParams();
  const action = searchParams.get("action");
  const showWriteForm = action === "write";

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await getLectures();
    if (res.success) setLectures(res.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── 필터링 ── */
  const filtered = lectures.filter((l) => {
    if (filterStatus !== "전체") {
      const statusKey = Object.keys(STATUS_MAP).find((k) => STATUS_MAP[k].label === filterStatus);
      if (statusKey && l.status !== statusKey) return false;
    }
    if (searchKw && !l.title?.includes(searchKw)) return false;
    return true;
  });

  /* ── 통계 ── */
  const totalCount = lectures.length;
  const draftCount = lectures.filter((l) => l.status === "DRAFT").length;
  const activeCount = lectures.filter((l) => l.status === "ACTIVE").length;

  /* ── 삭제 ── */
  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const res = await deleteLecture(id);
    if (res.success) fetchData();
    else alert("삭제 실패: " + res.error);
  };

  /* ── 선택 ── */
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((l) => l.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}건을 삭제하시겠습니까?`)) return;
    for (const id of selectedIds) {
      await deleteLecture(id);
    }
    setSelectedIds(new Set());
    fetchData();
  };

  const formatDate = (d: string) => {
    if (!d) return "-";
    const dt = new Date(d);
    return `${dt.getFullYear()}. ${String(dt.getMonth() + 1).padStart(2, "0")}. ${String(dt.getDate()).padStart(2, "0")}. ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
  };

  const formatPrice = (p: number) => {
    if (!p) return "무료";
    return p.toLocaleString() + " 원";
  };

  if (showWriteForm) {
    return <StudyWriteForm />;
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>특강목록 (강의관리)</h1>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          ( <span style={{ color: "#3b82f6" }}>총 {totalCount}건</span> / <span style={{ color: "#6b7280" }}>임시저장 {draftCount}건</span> / <span style={{ color: "#f59e0b" }}>판매중 {activeCount}건</span> )
        </span>
      </div>

      <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        {/* 필터 */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${border}`, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>진행상황</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", minWidth: 80 }}
            >
              <option>전체</option>
              {Object.values(STATUS_MAP).map((s) => (
                <option key={s.label}>{s.label}</option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={searchKw}
            onChange={(e) => setSearchKw(e.target.value)}
            placeholder="강의명을 검색하세요."
            style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", flex: 1, minWidth: 180 }}
          />
          <button
            onClick={() => { setFilterStatus("전체"); setSearchKw(""); }}
            style={{ height: 36, padding: "0 14px", background: darkMode ? "#2c2d31" : "#fff", color: textSecondary, border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            초기화
          </button>
        </div>

        {/* 액션 */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}`, display: "flex", gap: 10 }}>
          <button
            onClick={() => router.push("?menu=study&action=write")}
            style={{ height: 36, padding: "0 16px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            + 새 강의 등록
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0}
            style={{ height: 36, padding: "0 16px", background: darkMode ? "#2c2d31" : "#fff", color: selectedIds.size > 0 ? "#ef4444" : textSecondary, border: `1px solid ${selectedIds.size > 0 ? "#fca5a5" : border}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: selectedIds.size > 0 ? "pointer" : "not-allowed", opacity: selectedIds.size === 0 ? 0.5 : 1 }}
          >
            선택삭제 ({selectedIds.size})
          </button>
        </div>

        {/* 테이블 */}
        <div style={{ overflowX: "auto" }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: "#9ca3af" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>등록된 강의가 없습니다.</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>"+ 새 강의 등록" 버튼을 눌러 강의를 등록해보세요.</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
              <thead>
                <tr style={{ background: darkMode ? "#2c2d31" : "#f9fafb" }}>
                  {[{ w: 40, t: "" }, { w: 80, t: "공개상태" }, { w: 0, t: "강의명", a: "left" }, { w: 100, t: "카테고리" }, { w: 120, t: "수강료" }, { w: 180, t: "최초등록일" }, { w: 100, t: "관리" }].map((h, i) => (
                    <th key={i} style={{ padding: "12px 10px", textAlign: (h.a || "center") as any, fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, ...(h.w ? { width: h.w } : {}) }}>
                      {i === 0 ? <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} style={{ accentColor: "#3b82f6" }} /> : h.t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const st = STATUS_MAP[row.status] || STATUS_MAP.DRAFT;
                  return (
                    <tr key={row.id} style={{ borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}`, transition: "background 0.15s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#2c2d31" : "#fafbfc"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                      <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                        <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelect(row.id)} style={{ accentColor: "#3b82f6" }} />
                      </td>
                      <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                        <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, fontSize: 13, fontWeight: 700, color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>{st.label}</span>
                      </td>
                      <td style={{ padding: "16px 10px", verticalAlign: "middle", fontWeight: 700, color: textPrimary, fontSize: 15 }}>
                        <span style={{ cursor: "pointer" }} onClick={() => router.push(`?menu=study&action=write&id=${row.id}`)}>
                          {row.title}
                        </span>
                      </td>
                      <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 13, color: "#8a3ffc", fontWeight: 600 }}>{row.category}</td>
                      <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 15, fontWeight: 700, color: "#3b82f6" }}>
                        {row.discount_price ? formatPrice(row.discount_price) : formatPrice(row.price)}
                      </td>
                      <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 14, color: textSecondary }}>{formatDate(row.created_at)}</td>
                      <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                          <button
                            onClick={() => router.push(`?menu=study&action=write&id=${row.id}`)}
                            style={{ height: 30, padding: "0 12px", background: darkMode ? "#374151" : "#4b5563", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            수정
                          </button>
                          <button
                            onClick={() => handleDelete(row.id)}
                            style={{ height: 30, padding: "0 12px", background: darkMode ? "#2c2d31" : "#fff", color: "#9ca3af", border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 페이징 */}
        {filtered.length > 0 && (
          <div style={{ padding: "16px 24px", display: "flex", justifyContent: "center", gap: 4, borderTop: `1px solid ${border}` }}>
            <button style={{ width: 32, height: 32, border: "none", borderRadius: 4, background: "#3b82f6", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>1</button>
          </div>
        )}
      </div>
    </div>
  );
}
