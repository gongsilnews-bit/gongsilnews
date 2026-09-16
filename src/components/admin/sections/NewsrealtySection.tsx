"use client";

import React, { useState, useEffect } from "react";
import { AdminTheme } from "./types";
import {
  getNewsrealtyApplications,
  updateNewsrealtyStatus,
  updateNewsrealtyAdminNotes,
  resendNewsrealtySms,
} from "@/app/actions/newsrealtyApply";

interface NewsrealtySectionProps {
  theme: AdminTheme;
}

const STATUS_LIST = ["전체", "신규", "연락완료", "진행중", "승인완료", "반려"];

export default function NewsrealtySection({ theme }: NewsrealtySectionProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;

  const [activeTab, setActiveTab] = useState("전체");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [resendingSms, setResendingSms] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await getNewsrealtyApplications();
      if (res.success && res.data) {
        setApplications(res.data);
      }
    } catch (err) {
      console.error("fetchApplications error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    if (selectedApp) {
      const updated = applications.find((a) => a.id === selectedApp.id);
      if (updated) {
        setSelectedApp(updated);
        setAdminNotes(updated.admin_notes || "");
      }
    }
  }, [applications]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setActionMsg({ text, type });
    setTimeout(() => setActionMsg(null), 3500);
  };

  // 상태 변경
  const handleStatusChange = async (newStatus: string) => {
    if (!selectedApp) return;
    const isFallback = Boolean(selectedApp.category);
    const res = await updateNewsrealtyStatus(selectedApp.id, newStatus, isFallback);

    if (res.success) {
      setApplications((prev) =>
        prev.map((item) => (item.id === selectedApp.id ? { ...item, status: newStatus } : item))
      );
      setSelectedApp((prev: any) => ({ ...prev, status: newStatus }));
      showToast(`상태가 [${newStatus}](으)로 변경되었습니다.`);
    } else {
      showToast(res.message || "상태 변경 실패", "error");
    }
  };

  // 관리자 메모 저장
  const handleSaveNotes = async () => {
    if (!selectedApp) return;
    setSavingNotes(true);
    const isFallback = Boolean(selectedApp.category);
    const res = await updateNewsrealtyAdminNotes(selectedApp.id, adminNotes, isFallback);

    if (res.success) {
      setApplications((prev) =>
        prev.map((item) => (item.id === selectedApp.id ? { ...item, admin_notes: adminNotes } : item))
      );
      showToast("관리자 메모가 저장되었습니다.");
    } else {
      showToast(res.message || "메모 저장 실패", "error");
    }
    setSavingNotes(false);
  };

  // SMS 재발송
  const handleResendSms = async () => {
    if (!selectedApp) return;
    if (!confirm(`[${selectedApp.phone}] 번호로 파트너 안내 문자를 재발송하시겠습니까?`)) return;

    setResendingSms(true);
    try {
      const res = await resendNewsrealtySms(
        selectedApp.phone,
        selectedApp.applicant_name,
        selectedApp.agency_name
      );
      if (res.success) {
        showToast("안내 문자가 성공적으로 재발송되었습니다.");
      } else {
        showToast(`발송 실패: ${res.error || "뿌리오 오류"}`, "error");
      }
    } catch (err: any) {
      showToast(`발송 에러: ${err.message}`, "error");
    } finally {
      setResendingSms(false);
    }
  };

  // 필터링
  const filteredList = applications.filter((app) => {
    if (activeTab !== "전체" && app.status !== activeTab) return false;
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      const matchName = app.applicant_name?.toLowerCase().includes(kw);
      const matchPhone = app.phone?.includes(kw);
      const matchAgency = app.agency_name?.toLowerCase().includes(kw);
      const matchRegion = `${app.region_city || ""} ${app.region_district || ""} ${app.region_dong || ""}`.toLowerCase().includes(kw);
      if (!matchName && !matchPhone && !matchAgency && !matchRegion) return false;
    }
    return true;
  });

  // KPI 통계
  const countTotal = applications.length;
  const countNew = applications.filter((a) => a.status === "신규").length;
  const countContacted = applications.filter((a) => a.status === "연락완료").length;
  const countApproved = applications.filter((a) => a.status === "승인완료").length;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "신규":
        return { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" };
      case "연락완료":
        return { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" };
      case "진행중":
        return { bg: "#fef3c7", text: "#d97706", border: "#fde68a" };
      case "승인완료":
        return { bg: "#ecfdf5", text: "#059669", border: "#a7f3d0" };
      case "반려":
        return { bg: "#f3f4f6", text: "#6b7280", border: "#e5e7eb" };
      default:
        return { bg: "#f9fafb", text: "#4b5563", border: "#e5e7eb" };
    }
  };

  return (
    <div style={{ padding: "20px 24px", minHeight: "100%" }}>
      {/* 토스트 알림 */}
      {actionMsg && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            padding: "12px 20px",
            borderRadius: 12,
            backgroundColor: actionMsg.type === "success" ? "#059669" : "#dc2626",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>{actionMsg.type === "success" ? "✓" : "⚠️"}</span>
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* 헤더 & 타이틀 */}
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 24 }}>🏢</span>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: textPrimary, margin: 0 }}>
              공실뉴스부동산 파트너 신청 접수 현황
            </h1>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: "#059669",
                backgroundColor: darkMode ? "#064e3b" : "#ecfdf5",
                padding: "3px 8px",
                borderRadius: 20,
              }}
            >
              실시간 접수 관리
            </span>
          </div>
          <p style={{ fontSize: 13, color: textSecondary, margin: 0 }}>
            공실뉴스부동산 입점을 희망한 공인중개사 대표님들의 신청서를 확인하고 상담을 진행합니다.
          </p>
        </div>

        <button
          onClick={fetchApplications}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            backgroundColor: cardBg,
            border: `1px solid ${border}`,
            color: textPrimary,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>🔄</span> 새로고침
        </button>
      </div>

      {/* KPI 통계 카드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 12, color: textSecondary, fontWeight: 600 }}>총 신청 건수</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: textPrimary, marginTop: 4 }}>{countTotal}건</div>
        </div>
        <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 12, color: "#dc2626", fontWeight: 700 }}>🚨 신규 미확인</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#dc2626", marginTop: 4 }}>{countNew}건</div>
        </div>
        <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 12, color: "#2563eb", fontWeight: 700 }}>📞 상담/연락 완료</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#2563eb", marginTop: 4 }}>{countContacted}건</div>
        </div>
        <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 12, color: "#059669", fontWeight: 700 }}>🎉 최종 승인 파트너</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#059669", marginTop: 4 }}>{countApproved}건</div>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${border}`,
          borderRadius: 14,
          padding: 16,
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {/* 상태 탭 */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {STATUS_LIST.map((tab) => {
            const isActive = activeTab === tab;
            const count =
              tab === "전체"
                ? applications.length
                : applications.filter((a) => a.status === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: isActive ? 800 : 600,
                  backgroundColor: isActive ? "#059669" : darkMode ? "#333" : "#f1f5f9",
                  color: isActive ? "#fff" : textSecondary,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                }}
              >
                <span>{tab}</span>
                <span
                  style={{
                    fontSize: 11,
                    backgroundColor: isActive ? "rgba(255,255,255,0.25)" : darkMode ? "#222" : "#e2e8f0",
                    padding: "1px 6px",
                    borderRadius: 10,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 검색창 */}
        <div style={{ position: "relative", minWidth: 260 }}>
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="대표자, 사무소, 연락처, 지역 검색"
            style={{
              width: "100%",
              padding: "8px 12px 8px 32px",
              borderRadius: 8,
              backgroundColor: bg,
              border: `1px solid ${border}`,
              color: textPrimary,
              fontSize: 13,
              outline: "none",
            }}
          />
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: textSecondary }}>
            🔍
          </span>
        </div>
      </div>

      {/* 메인 2분할 뷰: 목록 + 상세 */}
      <div style={{ display: "grid", gridTemplateColumns: selectedApp ? "1fr 420px" : "1fr", gap: 20 }}>
        {/* 접수 목록 테이블 */}
        <div
          style={{
            backgroundColor: cardBg,
            border: `1px solid ${border}`,
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: textSecondary, fontSize: 14 }}>
              접수 내역을 불러오는 중입니다...
            </div>
          ) : filteredList.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: textSecondary, fontSize: 14 }}>
              해당 조건의 신청 내역이 없습니다.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: bg, borderBottom: `1px solid ${border}`, color: textSecondary, textAlign: "left" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 700 }}>상태</th>
                  <th style={{ padding: "12px 16px", fontWeight: 700 }}>대표자 / 연락처</th>
                  <th style={{ padding: "12px 16px", fontWeight: 700 }}>중개사무소 명칭</th>
                  <th style={{ padding: "12px 16px", fontWeight: 700 }}>지역</th>
                  <th style={{ padding: "12px 16px", fontWeight: 700 }}>관심 서비스</th>
                  <th style={{ padding: "12px 16px", fontWeight: 700 }}>신청일시</th>
                  <th style={{ padding: "12px 16px", fontWeight: 700 }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((app) => {
                  const isSelected = selectedApp?.id === app.id;
                  const badgeStyle = getStatusStyle(app.status);
                  const regionText = [app.region_city, app.region_district, app.region_dong].filter(Boolean).join(" ") || "-";
                  const dateText = new Date(app.created_at).toLocaleDateString("ko-KR", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      style={{
                        borderBottom: `1px solid ${border}`,
                        backgroundColor: isSelected
                          ? darkMode
                            ? "#1e293b"
                            : "#f0fdf4"
                          : "transparent",
                        cursor: "pointer",
                        transition: "background-color 0.1s",
                      }}
                    >
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 800,
                            backgroundColor: badgeStyle.bg,
                            color: badgeStyle.text,
                            border: `1px solid ${badgeStyle.border}`,
                          }}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 800, color: textPrimary }}>{app.applicant_name}</div>
                        <div style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>{app.phone}</div>
                      </td>
                      <td style={{ padding: "14px 16px", fontWeight: 700, color: textPrimary }}>
                        {app.agency_name}
                      </td>
                      <td style={{ padding: "14px 16px", color: textSecondary, fontSize: 12 }}>
                        {regionText}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {app.interests && app.interests.length > 0 ? (
                            app.interests.slice(0, 2).map((item: string) => (
                              <span
                                key={item}
                                style={{
                                  fontSize: 10,
                                  backgroundColor: darkMode ? "#333" : "#f1f5f9",
                                  color: textSecondary,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                }}
                              >
                                {item}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: 11, color: textSecondary }}>-</span>
                          )}
                          {app.interests && app.interests.length > 2 && (
                            <span style={{ fontSize: 10, color: textSecondary }}>+{app.interests.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", color: textSecondary, fontSize: 11 }}>
                        {dateText}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedApp(app);
                          }}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: darkMode ? "#2563eb" : "#3b82f6",
                            color: "#fff",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          상세보기
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 상세 패널 */}
        {selectedApp && (
          <div
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${border}`,
              borderRadius: 14,
              padding: 20,
              position: "sticky",
              top: 20,
              height: "fit-content",
            }}
          >
            {/* 패널 헤더 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: `1px solid ${border}`, paddingBottom: 12 }}>
              <div>
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 800,
                    ...getStatusStyle(selectedApp.status),
                  }}
                >
                  {selectedApp.status}
                </span>
                <h3 style={{ fontSize: 16, fontWeight: 900, color: textPrimary, margin: "6px 0 0 0" }}>
                  {selectedApp.applicant_name} 대표 ({selectedApp.agency_name})
                </h3>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 18,
                  cursor: "pointer",
                  color: textSecondary,
                }}
              >
                ✕
              </button>
            </div>

            {/* 기본 정보 */}
            <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "8px 12px", fontSize: 13, marginBottom: 16 }}>
              <span style={{ color: textSecondary }}>연락처</span>
              <div>
                <a
                  href={`tel:${selectedApp.phone}`}
                  style={{ color: "#2563eb", fontWeight: 700, textDecoration: "none" }}
                >
                  📞 {selectedApp.phone}
                </a>
              </div>

              <span style={{ color: textSecondary }}>이메일</span>
              <span style={{ color: textPrimary }}>{selectedApp.email || "-"}</span>

              <span style={{ color: textSecondary }}>지역</span>
              <span style={{ color: textPrimary }}>
                {[selectedApp.region_city, selectedApp.region_district, selectedApp.region_dong].filter(Boolean).join(" ") || "-"}
              </span>

              <span style={{ color: textSecondary }}>상세주소</span>
              <span style={{ color: textPrimary }}>{selectedApp.agency_address || "-"}</span>

              <span style={{ color: textSecondary }}>신청일시</span>
              <span style={{ color: textSecondary, fontSize: 12 }}>
                {new Date(selectedApp.created_at).toLocaleString("ko-KR")}
              </span>
            </div>

            {/* 관심 서비스 */}
            <div style={{ marginBottom: 16, padding: "12px 14px", backgroundColor: bg, borderRadius: 10, border: `1px solid ${border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>
                🎯 선택한 관심 서비스
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {selectedApp.interests && selectedApp.interests.length > 0 ? (
                  selectedApp.interests.map((item: string) => (
                    <span
                      key={item}
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor: "#ecfdf5",
                        color: "#059669",
                        border: "1px solid #a7f3d0",
                        padding: "3px 8px",
                        borderRadius: 6,
                      }}
                    >
                      {item}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: 12, color: textSecondary }}>선택 없음</span>
                )}
              </div>
            </div>

            {/* 신청자 추가 요청사항 */}
            {selectedApp.memo && (
              <div style={{ marginBottom: 16, padding: "12px 14px", backgroundColor: bg, borderRadius: 10, border: `1px solid ${border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: textPrimary, marginBottom: 4 }}>
                  💬 신청자 추가 요청사항
                </div>
                <p style={{ fontSize: 12, color: textSecondary, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>
                  {selectedApp.memo}
                </p>
              </div>
            )}

            {/* 상태 변경 버튼 그룹 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>
                상태 변경
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["신규", "연락완료", "진행중", "승인완료", "반려"].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(st)}
                    disabled={selectedApp.status === st}
                    style={{
                      flex: 1,
                      minWidth: 60,
                      padding: "6px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      backgroundColor: selectedApp.status === st ? "#059669" : darkMode ? "#333" : "#f1f5f9",
                      color: selectedApp.status === st ? "#fff" : textPrimary,
                      border: `1px solid ${border}`,
                      cursor: selectedApp.status === st ? "default" : "pointer",
                      opacity: selectedApp.status === st ? 0.7 : 1,
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* 알림 재발송 버튼 */}
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={handleResendSms}
                disabled={resendingSms}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 8,
                  backgroundColor: darkMode ? "#1e3a5f" : "#eff6ff",
                  color: "#2563eb",
                  border: "1px solid #bfdbfe",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <span>💬</span> {resendingSms ? "문자 발송 중..." : "파트너 안내 SMS 재발송"}
              </button>
            </div>

            {/* 최고관리자 내부 메모 */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: textPrimary }}>관리자 내부 메모</span>
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    backgroundColor: "#059669",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {savingNotes ? "저장 중..." : "메모 저장"}
                </button>
              </div>
              <textarea
                rows={4}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="통화 내용, 계약 조건, 담당 매니저 배정 메모 등을 입력하세요."
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: bg,
                  border: `1px solid ${border}`,
                  color: textPrimary,
                  fontSize: 12,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
