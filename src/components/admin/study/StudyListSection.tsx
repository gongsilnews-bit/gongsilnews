"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { AdminSectionProps } from "@/components/admin/sections/types";
import { getLectures, deleteLecture, setLectureFreePlans } from "@/app/actions/lecture";
import { approveLectures, rejectLectures, getMyLectures, getMyLectureQuota, getLectureAuthorNames } from "@/app/actions/lectureApproval";
import { LECTURE_PLAN_KEYS, LECTURE_PLAN_LABELS } from "@/utils/lectureAccess";
import { assignLectureGuide, getLectureGuides, type LectureGuide } from "@/app/actions/lectureGuides";
import type { LectureQuota } from "@/utils/lectureQuota";

const StudySettingsModal = dynamic(() => import("@/components/admin/study/StudySettingsModal"), { ssr: false });
const LectureGuideManagerModal = dynamic(() => import("@/components/admin/study/LectureGuideManagerModal"), { ssr: false });
const LectureRejectModal = dynamic(() => import("@/components/admin/study/LectureRejectModal"), { ssr: false });

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PENDING: { label: "승인대기", color: "#d97706", bg: "#fef3c7", border: "#fde68a" },
  ACTIVE: { label: "판매중", color: "#047857", bg: "#d1fae5", border: "#a7f3d0" },
  REJECTED: { label: "반려", color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
  DRAFT: { label: "임시저장", color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db" },
  CLOSED: { label: "종료", color: "#9ca3af", bg: "#f3f4f6", border: "#d1d5db" },
};
const TABS = ["ALL", "PENDING", "ACTIVE", "REJECTED", "DRAFT", "CLOSED"] as const;

/**
 * 특강 목록. 최고관리자와 회원이 같이 쓴다.
 *
 * admin  : 전체 강의, 승인·반려, 등록자·수강안내·무료등급 칸, 강의 설정·수강안내 관리
 * member : 내 강의만, 등록 한도 안내, 승인 요청 상태와 반려 사유
 */
export default function StudyListSection({ theme, mode = "admin" }: AdminSectionProps & { mode?: "admin" | "member" }) {
  const isAdmin = mode === "admin";
  const router = useRouter();
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  const [lectures, setLectures] = useState<any[]>([]);
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({});
  const [quota, setQuota] = useState<LectureQuota | null>(null);
  const [lectureGuides, setLectureGuides] = useState<LectureGuide[]>([]);
  const [assigningGuideTo, setAssigningGuideTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>("ALL");
  const [searchKw, setSearchKw] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [rejectTargets, setRejectTargets] = useState<string[] | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (isAdmin) {
      const [lectureRes, guideRes] = await Promise.all([getLectures(), getLectureGuides()]);
      const rows = lectureRes.success ? lectureRes.data || [] : [];
      setLectures(rows);
      if (guideRes.success) setLectureGuides(guideRes.data);
      const namesRes = await getLectureAuthorNames(rows.map((l: any) => l.author_id));
      if (namesRes.success) setAuthorNames(namesRes.names);
    } else {
      const [lectureRes, quotaRes] = await Promise.all([getMyLectures(), getMyLectureQuota()]);
      setLectures(lectureRes.success ? lectureRes.data : []);
      if (quotaRes.success) setQuota(quotaRes.quota);
    }
    setSelectedIds(new Set());
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── 필터 ── */
  const filtered = lectures.filter((l) => {
    if (tab !== "ALL" && l.status !== tab) return false;
    if (searchKw && !l.title?.includes(searchKw)) return false;
    return true;
  });
  const countOf = (t: (typeof TABS)[number]) => (t === "ALL" ? lectures.length : lectures.filter((l) => l.status === t).length);

  /* ── 선택 ── */
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === filtered.length ? new Set() : new Set(filtered.map((l) => l.id)));
  };

  /* ── 삭제 ── */
  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const res = await deleteLecture(id);
    if (res.success) fetchData();
    else alert("삭제 실패: " + res.error);
  };
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}건을 삭제하시겠습니까?`)) return;
    for (const id of selectedIds) await deleteLecture(id);
    fetchData();
  };

  /* ── 승인·반려 (최고관리자) ── */
  const handleApprove = async (ids: string[]) => {
    if (ids.length === 0) { alert("승인할 강의를 선택해 주세요."); return; }
    if (!confirm(`${ids.length}건을 승인하시겠습니까? 승인하면 바로 판매중이 됩니다.`)) return;
    const res = await approveLectures(ids);
    if (!res.success) alert(res.error || "승인하지 못했습니다.");
    fetchData();
  };
  const handleReject = async (reason: string) => {
    if (!rejectTargets) return;
    const res = await rejectLectures(rejectTargets, reason);
    if (!res.success) { alert(res.error || "반려하지 못했습니다."); return; }
    setRejectTargets(null);
    fetchData();
  };

  /** 목록에서 무료 등급을 바로 뒤집는다. 화면을 먼저 바꾸고, 실패하면 되돌린다 */
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
    const previousGuideId = lectures.find((l) => l.id === lectureId)?.lecture_guide_id || null;
    const nextGuideId = guideId || null;
    setAssigningGuideTo(lectureId);
    setLectures((prev) => prev.map((l) => (l.id === lectureId ? { ...l, lecture_guide_id: nextGuideId } : l)));
    const res = await assignLectureGuide(lectureId, nextGuideId);
    if (!res.success) {
      setLectures((prev) => prev.map((l) => (l.id === lectureId ? { ...l, lecture_guide_id: previousGuideId } : l)));
      alert(res.error || "수강안내를 저장하지 못했습니다.");
    }
    setAssigningGuideTo(null);
  };

  const formatDate = (d: string) => {
    if (!d) return "-";
    const dt = new Date(d);
    return `${dt.getFullYear()}. ${String(dt.getMonth() + 1).padStart(2, "0")}. ${String(dt.getDate()).padStart(2, "0")}. ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
  };
  const formatPrice = (p: number) => (p ? p.toLocaleString() + " P" : "무료");

  const canCreate = isAdmin || !!quota?.canCreate;
  const btn = (bgColor: string, color = "#fff"): React.CSSProperties => ({ height: 36, padding: "0 16px", background: bgColor, color, border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" });
  const cell: React.CSSProperties = { padding: "16px 10px", textAlign: "center", verticalAlign: "middle" };
  const selected = Array.from(selectedIds);

  const headers = [
    { w: 40, t: "" },
    { w: 90, t: "상태" },
    { w: 0, t: "강의명", a: "left" },
    ...(isAdmin ? [{ w: 110, t: "등록자" }] : []),
    { w: 100, t: "카테고리" },
    ...(isAdmin ? [{ w: 150, t: "수강안내" }, { w: 230, t: "무료 등급" }] : []),
    { w: 110, t: "수강료" },
    { w: 160, t: "최초등록일" },
    { w: isAdmin ? 200 : 160, t: "관리" },
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>{isAdmin ? "특강목록 (강의관리)" : "내 강의"}</h1>
        <span style={{ fontSize: 13, fontWeight: 600, color: textSecondary }}>
          ( 총 {lectures.length}건 / <span style={{ color: "#d97706" }}>승인대기 {countOf("PENDING")}건</span> / <span style={{ color: "#047857" }}>판매중 {countOf("ACTIVE")}건</span> )
        </span>
      </div>

      {/* 회원: 등록 한도 안내 */}
      {!isAdmin && quota && (
        <div style={{ marginBottom: 16, padding: "14px 18px", borderRadius: 12, background: quota.canCreate ? (darkMode ? "#1e293b" : "#eff6ff") : (darkMode ? "#3b1d1d" : "#fef2f2"), border: `1px solid ${quota.canCreate ? "#bfdbfe" : "#fecaca"}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, color: textPrimary }}>
            <b>강의 등록 {quota.used} / {quota.max ?? "무제한"}개</b>
            <span style={{ marginLeft: 10, color: textSecondary, fontSize: 13 }}>
              {quota.reason || "등록한 강의는 최고관리자 승인 후 판매중으로 공개됩니다."}
            </span>
          </div>
          {!quota.paid && (
            <button type="button" onClick={() => router.push("/study")} style={btn("#2563eb")}>공실스터디 신청하기</button>
          )}
        </div>
      )}

      <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        {/* 상태 탭 */}
        <div style={{ padding: "0 24px", borderBottom: `1px solid ${border}`, display: "flex", gap: 4, overflowX: "auto" }}>
          {TABS.map((t) => {
            const on = tab === t;
            return (
              <button key={t} type="button" onClick={() => setTab(t)} style={{ padding: "14px 14px", background: "none", border: "none", borderBottom: `3px solid ${on ? "#3b82f6" : "transparent"}`, color: on ? "#3b82f6" : textSecondary, fontSize: 14, fontWeight: on ? 800 : 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                {t === "ALL" ? "전체" : STATUS_MAP[t].label}
                <span style={{ marginLeft: 6, padding: "1px 7px", borderRadius: 10, fontSize: 12, background: t === "PENDING" && countOf(t) > 0 ? "#f59e0b" : (darkMode ? "#374151" : "#e5e7eb"), color: t === "PENDING" && countOf(t) > 0 ? "#fff" : textSecondary }}>{countOf(t)}</span>
              </button>
            );
          })}
        </div>

        {/* 검색 + 버튼 */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}`, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => (canCreate ? router.push("?menu=study&action=write") : alert(quota?.reason || "강의를 등록할 수 없습니다."))}
            style={{ ...btn(canCreate ? "#f59e0b" : "#d1d5db"), cursor: canCreate ? "pointer" : "not-allowed" }}
          >
            + 새 강의 등록
          </button>
          {isAdmin && (
            <>
              <button type="button" onClick={() => handleApprove(selected)} style={btn("#10b981")}>✔ 선택 승인</button>
              <button type="button" onClick={() => (selected.length ? setRejectTargets(selected) : alert("반려할 강의를 선택해 주세요."))} style={btn("#ef4444")}>⊘ 선택 반려</button>
              <button type="button" onClick={() => setShowSettingsModal(true)} style={btn(darkMode ? "#374151" : "#4b5563")}>⚙️ 강의 설정</button>
              <button type="button" onClick={() => setShowGuideModal(true)} style={btn("#059669")}>수강안내 관리</button>
            </>
          )}
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0}
            style={{ ...btn(darkMode ? "#2c2d31" : "#fff", selectedIds.size > 0 ? "#ef4444" : textSecondary), border: `1px solid ${selectedIds.size > 0 ? "#fca5a5" : border}`, fontWeight: 600, cursor: selectedIds.size > 0 ? "pointer" : "not-allowed", opacity: selectedIds.size === 0 ? 0.5 : 1 }}
          >
            선택삭제 ({selectedIds.size})
          </button>
          <input
            type="text"
            value={searchKw}
            onChange={(e) => setSearchKw(e.target.value)}
            placeholder="강의명을 검색하세요."
            style={{ height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: darkMode ? "#2c2d31" : "#fff", outline: "none", flex: 1, minWidth: 180 }}
          />
        </div>

        {/* 테이블 */}
        <div style={{ overflowX: "auto" }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: "#9ca3af" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>등록된 강의가 없습니다.</div>
              {canCreate && <div style={{ fontSize: 13, marginTop: 6 }}>[+ 새 강의 등록] 버튼을 눌러 강의를 등록해보세요.</div>}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: isAdmin ? 1100 : 760 }}>
              <thead>
                <tr style={{ background: darkMode ? "#2c2d31" : "#f9fafb" }}>
                  {headers.map((h, i) => (
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
                    <tr key={row.id} style={{ borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}` }}>
                      <td style={cell}>
                        <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelect(row.id)} style={{ accentColor: "#3b82f6" }} />
                      </td>
                      <td style={cell}>
                        <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 4, fontSize: 13, fontWeight: 700, color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>{st.label}</span>
                      </td>
                      <td style={{ padding: "16px 10px", verticalAlign: "middle" }}>
                        <span style={{ cursor: "pointer", fontWeight: 700, color: textPrimary, fontSize: 15 }} onClick={() => router.push(`?menu=study&action=write&id=${row.id}`)}>
                          {row.title}
                        </span>
                        {row.status === "REJECTED" && row.reject_reason && (
                          <div style={{ marginTop: 6, fontSize: 12, color: "#dc2626", lineHeight: 1.5 }}>반려 사유: {row.reject_reason}</div>
                        )}
                      </td>
                      {isAdmin && <td style={{ ...cell, fontSize: 13, color: textSecondary }}>{authorNames[row.author_id] || "-"}</td>}
                      <td style={{ ...cell, fontSize: 13, color: "#8a3ffc", fontWeight: 600 }}>{row.category}</td>
                      {isAdmin && (
                        <td style={cell}>
                          <select
                            aria-label={`${row.title} 수강안내 선택`}
                            value={row.lecture_guide_id || ""}
                            disabled={assigningGuideTo === row.id}
                            onChange={(event) => handleGuideAssignment(row.id, event.target.value)}
                            style={{ width: "100%", minWidth: 140, height: 34, padding: "0 8px", border: `1px solid ${border}`, borderRadius: 6, background: darkMode ? "#2c2d31" : "#fff", color: textPrimary, fontSize: 12, cursor: assigningGuideTo === row.id ? "wait" : "pointer" }}
                          >
                            <option value="">선택 안 함</option>
                            {lectureGuides.map((guide) => (
                              <option key={guide.id} value={guide.id} disabled={!guide.is_active && guide.id !== row.lecture_guide_id}>
                                {guide.name}{!guide.is_active ? " (사용 중지)" : ""}
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                      {isAdmin && (
                        <td style={cell}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
                            {LECTURE_PLAN_KEYS.map((key) => {
                              const on = (row.free_for_plans || []).includes(key);
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => toggleFreePlan(row.id, key)}
                                  title={`${LECTURE_PLAN_LABELS[key]} — ${on ? "무료" : "포인트 차감"}`}
                                  style={{ padding: "3px 7px", borderRadius: 5, border: `1px solid ${on ? "#059669" : border}`, background: on ? "#059669" : (darkMode ? "#2c2d31" : "#fff"), color: on ? "#fff" : textSecondary, fontSize: 11, fontWeight: on ? 800 : 600, cursor: "pointer", whiteSpace: "nowrap" }}
                                >
                                  {LECTURE_PLAN_LABELS[key].replace("부동산", "").replace("회원", "")}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      )}
                      <td style={{ ...cell, fontSize: 15, fontWeight: 700, color: "#3b82f6" }}>
                        {row.discount_price ? formatPrice(row.discount_price) : formatPrice(row.price)}
                      </td>
                      <td style={{ ...cell, fontSize: 14, color: textSecondary }}>{formatDate(row.created_at)}</td>
                      <td style={cell}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                          {isAdmin && row.status === "PENDING" && (
                            <>
                              <button type="button" onClick={() => handleApprove([row.id])} style={{ ...btn("#10b981"), height: 30, padding: "0 10px", fontSize: 12 }}>승인</button>
                              <button type="button" onClick={() => setRejectTargets([row.id])} style={{ ...btn("#ef4444"), height: 30, padding: "0 10px", fontSize: 12 }}>반려</button>
                            </>
                          )}
                          <button type="button" onClick={() => router.push(`?menu=study&action=write&id=${row.id}`)} style={{ ...btn(darkMode ? "#374151" : "#4b5563"), height: 30, padding: "0 10px", fontSize: 12 }}>수정</button>
                          <button type="button" onClick={() => handleDelete(row.id)} style={{ ...btn(darkMode ? "#2c2d31" : "#fff", "#ef4444"), height: 30, padding: "0 10px", fontSize: 12, border: "1px solid #fca5a5" }}>삭제</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showSettingsModal && (
        <StudySettingsModal darkMode={darkMode} onClose={() => setShowSettingsModal(false)} onCategoriesUpdated={() => fetchData()} />
      )}
      {showGuideModal && (
        <LectureGuideManagerModal darkMode={darkMode} onClose={() => setShowGuideModal(false)} onUpdated={fetchData} />
      )}
      {rejectTargets && (
        <LectureRejectModal count={rejectTargets.length} darkMode={darkMode} onClose={() => setRejectTargets(null)} onSubmit={handleReject} />
      )}
    </div>
  );
}
