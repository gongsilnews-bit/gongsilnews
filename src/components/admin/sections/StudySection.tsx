"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { AdminSectionProps } from "./types";
import { getLectures, deleteLecture, updateLectureStatus, setLectureFreePlans } from "@/app/actions/lecture";
import { LECTURE_PLAN_KEYS, LECTURE_PLAN_LABELS } from "@/utils/lectureAccess";
import { assignLectureGuide, getLectureGuides, type LectureGuide } from "@/app/actions/lectureGuides";
import StudyWriteForm from "@/components/admin/StudyWriteForm";

const StudySettingsModal = dynamic(() => import("@/components/admin/study/StudySettingsModal"), {
  ssr: false,
});
const LectureGuideManagerModal = dynamic(() => import("@/components/admin/study/LectureGuideManagerModal"), {
  ssr: false,
});

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
  const [lectureGuides, setLectureGuides] = useState<LectureGuide[]>([]);
  const [assigningGuideTo, setAssigningGuideTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("전체");
  const [searchKw, setSearchKw] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  
  const searchParams = useSearchParams();
  const action = searchParams.get("action");
  const showWriteForm = action === "write";

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [lectureRes, guideRes] = await Promise.all([getLectures(), getLectureGuides()]);
    if (lectureRes.success) setLectures(lectureRes.data || []);
    if (guideRes.success) setLectureGuides(guideRes.data);
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
    return p.toLocaleString() + " P";
  };

  /**
   * 목록에서 무료 등급을 바로 뒤집는다.
   *
   * 화면을 먼저 바꾸고 서버에 보낸다. 실패하면 되돌린다 — 화면만 바뀌어
   * 있으면 열어준 줄 알고 넘어간다.
   */
  const toggleFreePlan = async (lectureId: string, key: string) => {
    const row = lectures.find((l) => l.id === lectureId);
    const before: string[] = Array.isArray(row?.free_for_plans) ? row.free_for_plans : [];
    const next = before.includes(key) ? before.filter((x: string) => x !== key) : [...before, key];
    setLectures((prev) => prev.map((l) => (l.id === lectureId ? { ...l, free_for_plans: next } : l)));
    const res = await setLectureFreePlans(lectureId, next);
    if (!res.success) {
      setLectures((prev) => prev.map((l) => (l.id === lectureId ? { ...l, free_for_plans: before } : l)));
      alert((res as any).error || "무료 등급을 저장하지 못했습니다.");
    }
  };

  const handleGuideAssignment = async (lectureId: string, guideId: string) => {
    const previousGuideId = lectures.find(lecture => lecture.id === lectureId)?.lecture_guide_id || null;
    const nextGuideId = guideId || null;
    setAssigningGuideTo(lectureId);
    setLectures(prev => prev.map(lecture => lecture.id === lectureId
      ? { ...lecture, lecture_guide_id: nextGuideId }
      : lecture));
    const res = await assignLectureGuide(lectureId, nextGuideId);
    if (!res.success) {
      setLectures(prev => prev.map(lecture => lecture.id === lectureId
        ? { ...lecture, lecture_guide_id: previousGuideId }
        : lecture));
      alert(res.error || "수강안내를 저장하지 못했습니다.");
    } else {
      await fetchData();
    }
    setAssigningGuideTo(null);
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
            type="button"
            onClick={() => setShowSettingsModal(true)}
            style={{
              height: 36,
              padding: "0 16px",
              background: darkMode ? "#374151" : "#4b5563",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "background 0.15s",
            }}
          >
            <span>⚙️</span>
            <span>강의 설정</span>
          </button>
          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            style={{ height: 36, padding: "0 16px", background: "#059669", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            수강안내 관리
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
                  {[{ w: 40, t: "" }, { w: 80, t: "공개상태" }, { w: 0, t: "강의명", a: "left" }, { w: 100, t: "카테고리" }, { w: 150, t: "수강안내" }, { w: 230, t: "무료 등급" }, { w: 120, t: "수강료" }, { w: 180, t: "최초등록일" }, { w: 160, t: "관리" }].map((h, i) => (
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
                      <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                        <select
                          aria-label={`${row.title} 수강안내 선택`}
                          value={row.lecture_guide_id || ""}
                          disabled={assigningGuideTo === row.id}
                          onChange={(event) => handleGuideAssignment(row.id, event.target.value)}
                          style={{ width: "100%", minWidth: 140, height: 34, padding: "0 8px", border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, fontSize: 12, cursor: assigningGuideTo === row.id ? "wait" : "pointer" }}
                        >
                          <option value="">선택 안 함</option>
                          {lectureGuides.map(guide => (
                            <option key={guide.id} value={guide.id} disabled={!guide.is_active && guide.id !== row.lecture_guide_id}>
                              {guide.name}{!guide.is_active ? " (사용 중지)" : ""}
                            </option>
                          ))}
                        </select>
                      </td>
                      {/* 어느 등급이 공짜로 듣는지 한눈에 보이고, 누르면 그 자리에서 바뀐다 */}
                      <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
                          {LECTURE_PLAN_KEYS.map((key) => {
                            const on = (row.free_for_plans || []).includes(key);
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => toggleFreePlan(row.id, key)}
                                title={`${LECTURE_PLAN_LABELS[key]} — ${on ? "무료" : "포인트 차감"}`}
                                style={{
                                  padding: "3px 7px",
                                  borderRadius: 5,
                                  border: `1px solid ${on ? "#059669" : border}`,
                                  background: on ? "#059669" : (darkMode ? "#2c2d31" : "#fff"),
                                  color: on ? "#fff" : textSecondary,
                                  fontSize: 11,
                                  fontWeight: on ? 800 : 600,
                                  cursor: "pointer",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {LECTURE_PLAN_LABELS[key].replace("부동산", "").replace("회원", "")}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 15, fontWeight: 700, color: "#3b82f6" }}>
                        {row.discount_price ? formatPrice(row.discount_price) : formatPrice(row.price)}
                      </td>
                      <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle", fontSize: 14, color: textSecondary }}>{formatDate(row.created_at)}</td>
                      <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                          <button
                            type="button"
                            onClick={() => router.push(`?menu=study&action=write&id=${row.id}`)}
                            style={{ height: 30, padding: "0 12px", background: darkMode ? "#374151" : "#4b5563", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDelete(row.id); }}
                            style={{ height: 30, padding: "0 12px", background: darkMode ? "#2c2d31" : "#fff", color: "#ef4444", border: `1px solid ${darkMode ? "#fca5a5" : "#fca5a5"}`, borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0 }}
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

      {showSettingsModal && (
        <StudySettingsModal
          darkMode={darkMode}
          onClose={() => setShowSettingsModal(false)}
          onCategoriesUpdated={() => fetchData()}
        />
      )}
      {showGuideModal && (
        <LectureGuideManagerModal
          darkMode={darkMode}
          onClose={() => setShowGuideModal(false)}
          onUpdated={fetchData}
        />
      )}
    </div>
  );
}
