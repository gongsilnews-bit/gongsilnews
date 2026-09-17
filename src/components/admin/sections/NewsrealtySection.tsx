"use client";

import React, { useState, useEffect } from "react";
import { AdminTheme } from "./types";
import {
  getNewsrealtyApplications,
  updateNewsrealtyStatus,
  updateNewsrealtyAdminNotes,
  resendNewsrealtySms,
  deleteNewsrealtyApplications,
} from "@/app/actions/newsrealtyApply";

interface NewsrealtySectionProps {
  theme: AdminTheme;
}

export default function NewsrealtySection({ theme }: NewsrealtySectionProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;

  const [activeTab, setActiveTab] = useState("전체");
  const [searchStatus, setSearchStatus] = useState("전체");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeFilter, setActiveFilter] = useState({ status: "전체", keyword: "" });

  const [applications, setApplications] = useState<any[]>([]);
  const [checkedAppIds, setCheckedAppIds] = useState<string[]>([]);
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

  // 단일 삭제
  const handleDeleteSingle = async (id: string, name: string) => {
    if (!confirm(`[${name}] 대표님의 신청 내역을 정말 삭제하시겠습니까?`)) return;

    const res = await deleteNewsrealtyApplications([id]);
    if (res.success) {
      setApplications((prev) => prev.filter((a) => a.id !== id));
      setCheckedAppIds((prev) => prev.filter((item) => item !== id));
      if (selectedApp?.id === id) setSelectedApp(null);
      showToast("신청 내역이 삭제되었습니다.");
    } else {
      showToast(res.message || "삭제 실패", "error");
    }
  };

  // 선택 삭제 (일괄)
  const handleDeleteSelected = async () => {
    if (checkedAppIds.length === 0) {
      alert("삭제할 신청 내역을 먼저 선택해 주세요.");
      return;
    }
    if (!confirm(`선택한 ${checkedAppIds.length}건의 신청 내역을 정말 삭제하시겠습니까?`)) return;

    const res = await deleteNewsrealtyApplications(checkedAppIds);
    if (res.success) {
      setApplications((prev) => prev.filter((a) => !checkedAppIds.includes(a.id)));
      if (selectedApp && checkedAppIds.includes(selectedApp.id)) {
        setSelectedApp(null);
      }
      setCheckedAppIds([]);
      showToast(`${checkedAppIds.length}건의 신청 내역이 삭제되었습니다.`);
    } else {
      showToast(res.message || "삭제 실패", "error");
    }
  };

  // 검색 및 필터 적용
  const filteredList = applications.filter((app) => {
    // 탭 필터
    if (activeTab !== "전체" && app.status !== activeTab) return false;

    // 검색 바 필터
    if (activeFilter.status !== "전체" && app.status !== activeFilter.status) return false;
    if (activeFilter.keyword.trim()) {
      const kw = activeFilter.keyword.toLowerCase();
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
  const countInProgress = applications.filter((a) => a.status === "진행중").length;
  const countApproved = applications.filter((a) => a.status === "승인완료").length;
  const countRejected = applications.filter((a) => a.status === "반려").length;

  const tabs = [
    { key: "전체", label: "전체", count: countTotal, color: "#3b82f6" },
    { key: "신규", label: "신규", count: countNew, color: "#ef4444" },
    { key: "연락완료", label: "연락완료", count: countContacted, color: "#3b82f6" },
    { key: "진행중", label: "진행중", count: countInProgress, color: "#f59e0b" },
    { key: "승인완료", label: "승인완료", count: countApproved, color: "#10b981" },
    { key: "반려", label: "반려", count: countRejected, color: "#6b7280" },
  ];

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "신규":
        return { color: "#b91c1c", bg: "#fee2e2", border: "#fecaca" };
      case "연락완료":
        return { color: "#1d4ed8", bg: "#dbeafe", border: "#bfdbfe" };
      case "진행중":
        return { color: "#92400e", bg: "#fef3c7", border: "#fde68a" };
      case "승인완료":
        return { color: "#065f46", bg: "#d1fae5", border: "#a7f3d0" };
      case "반려":
        return { color: "#4b5563", bg: "#f3f4f6", border: "#e5e7eb" };
      default:
        return { color: textSecondary, bg: "#f3f4f6", border: "#e5e7eb" };
    }
  };

  const handleSearchSubmit = () => {
    setActiveFilter({ status: searchStatus, keyword: searchKeyword });
  };

  const handleSearchReset = () => {
    setSearchStatus("전체");
    setSearchKeyword("");
    setActiveFilter({ status: "전체", keyword: "" });
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg, minHeight: "100%" }}>
      {/* 토스트 알림 */}
      {actionMsg && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            padding: "12px 20px",
            borderRadius: 10,
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

      {/* ── 1. 헤더: 회원관리 타이틀 형식과 1:1 통일 ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>
            공실뉴스부동산 파트너 신청 관리
          </h1>
          <span style={{ fontSize: 13, fontWeight: 600, color: textSecondary }}>
            ( <span style={{ color: "#dc2626", fontWeight: 700 }}>신규 {countNew}건</span> / 연락완료 {countContacted}건 / 진행중 {countInProgress}건 / <span style={{ color: "#059669", fontWeight: 700 }}>승인완료 {countApproved}건</span> / 전체 {countTotal}건 )
          </span>
        </div>

        <button
          onClick={fetchApplications}
          style={{
            height: 36,
            padding: "0 16px",
            borderRadius: 6,
            backgroundColor: darkMode ? "#2c2d31" : "#fff",
            border: `1px solid ${border}`,
            color: textPrimary,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <span>🔄</span> 새로고침
        </button>
      </div>

      {/* ── 2. 검색 필터 카드: 회원관리 필터 바와 1:1 통일 ── */}
      <div
        style={{
          background: cardBg,
          borderRadius: 14,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          padding: "16px 24px",
          marginBottom: 20,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap" }}>
            상태구분
          </label>
          <select
            value={searchStatus}
            onChange={(e) => setSearchStatus(e.target.value)}
            style={{
              height: 36,
              padding: "0 12px",
              border: `1px solid ${border}`,
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              color: textPrimary,
              background: darkMode ? "#2c2d31" : "#fff",
              outline: "none",
              minWidth: 100,
            }}
          >
            <option value="전체">전체</option>
            <option value="신규">신규</option>
            <option value="연락완료">연락완료</option>
            <option value="진행중">진행중</option>
            <option value="승인완료">승인완료</option>
            <option value="반려">반려</option>
          </select>
        </div>

        <input
          type="text"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearchSubmit();
          }}
          placeholder="대표자명, 중개사무소, 연락처, 지역 검색"
          style={{
            height: 36,
            padding: "0 14px",
            border: `1px solid ${border}`,
            borderRadius: 6,
            fontSize: 13,
            color: textPrimary,
            background: darkMode ? "#2c2d31" : "#fff",
            outline: "none",
            flex: 1,
            minWidth: 220,
          }}
        />

        <button
          onClick={handleSearchSubmit}
          style={{
            height: 36,
            padding: "0 20px",
            background: darkMode ? "#2c2d31" : "#374151",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          검색
        </button>

        <button
          onClick={handleSearchReset}
          style={{
            height: 36,
            padding: "0 14px",
            background: darkMode ? "#2c2d31" : "#fff",
            color: textSecondary,
            border: `1px solid ${border}`,
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          초기화
        </button>
      </div>

      {/* ── 3. 상태 탭 바: 회원관리 탭 스타일과 100% 동일한 라운드 칩 디자인 ── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, borderBottom: `2px solid ${darkMode ? "#333" : "#e5e7eb"}`, paddingBottom: 12, overflowX: "auto" }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                height: 38,
                padding: "0 16px",
                background: isActive ? (darkMode ? "#3a3b3f" : "#fff") : "transparent",
                color: isActive ? "#3b82f6" : textSecondary,
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: isActive ? 800 : 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "all 0.15s ease",
                boxShadow: isActive ? "0 2px 5px rgba(0,0,0,0.06)" : "none",
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  background: tab.key === "전체" && !isActive ? (darkMode ? "#333" : "#e5e7eb") : tab.color,
                  color: tab.key === "전체" && !isActive ? textSecondary : "#fff",
                  padding: "2px 8px",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 800,
                  transition: "all 0.2s",
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 4. 액션 바 (선택삭제 버튼) ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={handleDeleteSelected}
            style={{
              height: 36,
              padding: "0 16px",
              background: checkedAppIds.length > 0 ? (darkMode ? "#7f1d1d" : "#fee2e2") : (darkMode ? "#2c2d31" : "#fff"),
              color: checkedAppIds.length > 0 ? "#dc2626" : textSecondary,
              border: `1px solid ${checkedAppIds.length > 0 ? "#fca5a5" : border}`,
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              cursor: checkedAppIds.length > 0 ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s ease",
            }}
          >
            <span>🗑</span> 선택삭제 {checkedAppIds.length > 0 ? `(${checkedAppIds.length})` : ""}
          </button>
        </div>
        <div style={{ fontSize: 13, color: textSecondary }}>
          총 <strong style={{ color: textPrimary }}>{filteredList.length}</strong>건의 신청서
        </div>
      </div>

      {/* ── 5. 접수 목록 전체 화면 테이블 (관심서비스 컬럼 제거, 시원하고 넓은 100% 폭) ── */}
      <div
        style={{
          background: cardBg,
          borderRadius: 14,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          overflow: "hidden",
          border: `1px solid ${border}`,
        }}
      >
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: textSecondary, fontSize: 14 }}>
            접수 내역을 불러오는 중입니다...
          </div>
        ) : filteredList.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: textSecondary, fontSize: 14 }}>
            해당 조건의 신청 내역이 없습니다.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
              <thead>
                <tr style={{ background: darkMode ? "#2c2d31" : "#f9fafb" }}>
                  {/* 전체 선택 체크박스 */}
                  <th style={{ padding: "14px 10px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 44 }}>
                    <input
                      type="checkbox"
                      style={{ accentColor: "#3b82f6", width: 16, height: 16, cursor: "pointer" }}
                      checked={filteredList.length > 0 && checkedAppIds.length === filteredList.length}
                      onChange={(e) => {
                        if (e.target.checked) setCheckedAppIds(filteredList.map((a) => a.id));
                        else setCheckedAppIds([]);
                      }}
                    />
                  </th>
                  <th style={{ padding: "14px 12px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 70 }}>
                    번호
                  </th>
                  <th style={{ padding: "14px 12px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 110 }}>
                    상태
                  </th>
                  <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, minWidth: 200 }}>
                    대표자 / 연락처
                  </th>
                  <th style={{ padding: "14px 16px", textAlign: "left", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, minWidth: 220 }}>
                    중개사무소 명칭 / 이메일
                  </th>
                  <th style={{ padding: "14px 14px", textAlign: "left", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, minWidth: 160 }}>
                    지역 / 상세주소
                  </th>
                  <th style={{ padding: "14px 14px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 150 }}>
                    신청일시
                  </th>
                  <th style={{ padding: "14px 14px", textAlign: "center", fontWeight: 700, color: textSecondary, fontSize: 14, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`, width: 160 }}>
                    관리
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((app, idx) => {
                  const isChecked = checkedAppIds.includes(app.id);
                  const badge = getStatusBadgeStyle(app.status);
                  const regionText = [app.region_city, app.region_district, app.region_dong].filter(Boolean).join(" ") || "-";
                  const dateText = new Date(app.created_at).toLocaleDateString("ko-KR", {
                    year: "2-digit",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  const appNumber = String(applications.length - applications.findIndex((x) => x.id === app.id)).padStart(4, "0");

                  return (
                    <tr
                      key={app.id || idx}
                      style={{
                        borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}`,
                        backgroundColor: isChecked ? (darkMode ? "#1e293b" : "#f0f9ff") : "transparent",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!isChecked) e.currentTarget.style.background = darkMode ? "#3a3b3f" : "#f8fafc";
                      }}
                      onMouseLeave={(e) => {
                        if (!isChecked) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {/* 개별 체크박스 */}
                      <td style={{ padding: "16px 10px", textAlign: "center", verticalAlign: "middle" }}>
                        <input
                          type="checkbox"
                          style={{ accentColor: "#3b82f6", width: 16, height: 16, cursor: "pointer" }}
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) setCheckedAppIds((prev) => [...prev, app.id]);
                            else setCheckedAppIds((prev) => prev.filter((id) => id !== app.id));
                          }}
                        />
                      </td>

                      {/* 번호 */}
                      <td style={{ padding: "16px 12px", textAlign: "center", verticalAlign: "middle", fontSize: 14, color: textSecondary, fontWeight: 600 }}>
                        {appNumber}
                      </td>

                      {/* 상태 뱃지 */}
                      <td style={{ padding: "16px 12px", textAlign: "center", verticalAlign: "middle" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "5px 12px",
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 700,
                            backgroundColor: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            letterSpacing: "-0.2px",
                          }}
                        >
                          {app.status}
                        </span>
                      </td>

                      {/* 대표자 / 연락처 */}
                      <td style={{ padding: "16px 16px", verticalAlign: "middle", textAlign: "left" }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: textPrimary, letterSpacing: "-0.3px" }}>
                          {app.applicant_name} 대표
                        </div>
                        <div style={{ fontSize: 13.5, color: "#2563eb", marginTop: 4, fontWeight: 700, letterSpacing: "0.2px" }}>
                          {app.phone}
                        </div>
                      </td>

                      {/* 중개사무소 명칭 / 이메일 */}
                      <td style={{ padding: "16px 16px", verticalAlign: "middle", textAlign: "left" }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: textPrimary, letterSpacing: "-0.3px" }}>
                          {app.agency_name}
                        </div>
                        {app.email && (
                          <div style={{ fontSize: 12.5, color: textSecondary, marginTop: 4 }}>
                            {app.email}
                          </div>
                        )}
                      </td>

                      {/* 지역 / 주소 */}
                      <td style={{ padding: "16px 14px", verticalAlign: "middle", textAlign: "left" }}>
                        <div style={{ fontSize: 13.5, color: textPrimary, fontWeight: 600 }}>
                          {regionText}
                        </div>
                        {app.agency_address && (
                          <div style={{ fontSize: 12, color: textSecondary, marginTop: 3, wordBreak: "keep-all" }}>
                            {app.agency_address}
                          </div>
                        )}
                      </td>

                      {/* 신청일시 */}
                      <td style={{ padding: "16px 14px", textAlign: "center", verticalAlign: "middle", fontSize: 13, color: textSecondary, fontWeight: 500 }}>
                        {dateText}
                      </td>

                      {/* 관리 버튼들 (상세보기 + 개별 삭제) */}
                      <td style={{ padding: "16px 14px", textAlign: "center", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
                          <button
                            onClick={() => setSelectedApp(app)}
                            style={{
                              height: 32,
                              padding: "0 14px",
                              background: "#3b82f6",
                              color: "#fff",
                              border: "none",
                              borderRadius: 6,
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                              boxShadow: "0 1px 3px rgba(59, 130, 246, 0.3)",
                            }}
                          >
                            상세보기
                          </button>
                          <button
                            onClick={() => handleDeleteSingle(app.id, app.applicant_name)}
                            style={{
                              height: 32,
                              padding: "0 10px",
                              background: darkMode ? "#2c2d31" : "#fff",
                              color: "#ef4444",
                              border: `1px solid ${darkMode ? "#555" : "#fca5a5"}`,
                              borderRadius: 6,
                              fontSize: 12.5,
                              fontWeight: 600,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 6. 중앙 팝업 모달 (Center Modal): 테이블 위에 깔끔하게 표출 ── */}
      {selectedApp && (
        <div
          onClick={() => setSelectedApp(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.55)",
            backdropFilter: "blur(4px)",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: cardBg,
              borderRadius: 18,
              maxWidth: 640,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px 28px 24px 28px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: `1px solid ${border}`,
              position: "relative",
            }}
          >
            {/* 팝업 헤더 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, borderBottom: `1px solid ${border}`, paddingBottom: 16 }}>
              <div>
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 800,
                    ...getStatusBadgeStyle(selectedApp.status),
                    marginBottom: 8,
                  }}
                >
                  {selectedApp.status}
                </span>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: textPrimary, margin: 0, letterSpacing: "-0.4px" }}>
                  {selectedApp.applicant_name} 대표
                  <span style={{ fontSize: 15, fontWeight: 700, color: textSecondary, marginLeft: 8 }}>
                    ({selectedApp.agency_name})
                  </span>
                </h2>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                style={{
                  background: darkMode ? "#333" : "#f1f5f9",
                  border: "none",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  cursor: "pointer",
                  color: textSecondary,
                  fontWeight: 800,
                }}
              >
                ✕
              </button>
            </div>

            {/* 기본 상세 정보 테이블 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "100px 1fr",
                gap: "12px 16px",
                fontSize: 14,
                marginBottom: 20,
                backgroundColor: darkMode ? "#222" : "#f8fafc",
                padding: "18px 20px",
                borderRadius: 12,
                border: `1px solid ${border}`,
              }}
            >
              <span style={{ color: textSecondary, fontWeight: 700 }}>연락처</span>
              <div>
                <a
                  href={`tel:${selectedApp.phone}`}
                  style={{ color: "#2563eb", fontWeight: 800, textDecoration: "none", fontSize: 15, letterSpacing: "0.2px" }}
                >
                  📞 {selectedApp.phone} <span style={{ fontSize: 12, fontWeight: 600, color: "#2563eb" }}>(통화 연결)</span>
                </a>
              </div>

              <span style={{ color: textSecondary, fontWeight: 700 }}>이메일</span>
              <span style={{ color: textPrimary, fontWeight: 600 }}>{selectedApp.email || "-"}</span>

              <span style={{ color: textSecondary, fontWeight: 700 }}>중개사무소</span>
              <span style={{ color: textPrimary, fontWeight: 700 }}>{selectedApp.agency_name}</span>

              <span style={{ color: textSecondary, fontWeight: 700 }}>지역</span>
              <span style={{ color: textPrimary, fontWeight: 600 }}>
                {[selectedApp.region_city, selectedApp.region_district, selectedApp.region_dong].filter(Boolean).join(" ") || "-"}
              </span>

              <span style={{ color: textSecondary, fontWeight: 700 }}>상세주소</span>
              <span style={{ color: textPrimary, fontWeight: 500 }}>{selectedApp.agency_address || "-"}</span>

              <span style={{ color: textSecondary, fontWeight: 700 }}>신청일시</span>
              <span style={{ color: textSecondary, fontSize: 13, fontWeight: 500 }}>
                {new Date(selectedApp.created_at).toLocaleString("ko-KR")}
              </span>
            </div>

            {/* 신청자 추가 요청사항 */}
            {selectedApp.memo && (
              <div style={{ marginBottom: 20, padding: "16px 18px", backgroundColor: darkMode ? "#222" : "#f8fafc", borderRadius: 12, border: `1px solid ${border}` }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: textPrimary, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>💬</span> 신청자 추가 요청사항
                </div>
                <p style={{ fontSize: 13, color: textPrimary, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap", fontWeight: 500 }}>
                  {selectedApp.memo}
                </p>
              </div>
            )}

            {/* 상태 변경 버튼 그룹 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: textPrimary, marginBottom: 10 }}>
                상태 변경
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                {["신규", "연락완료", "진행중", "승인완료", "반려"].map((st) => {
                  const isCurrent = selectedApp.status === st;
                  return (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(st)}
                      disabled={isCurrent}
                      style={{
                        height: 40,
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 800,
                        backgroundColor: isCurrent
                          ? (st === "승인완료" ? "#059669" : st === "신규" ? "#dc2626" : "#3b82f6")
                          : (darkMode ? "#2c2d31" : "#fff"),
                        color: isCurrent ? "#fff" : textPrimary,
                        border: `1px solid ${isCurrent ? "transparent" : border}`,
                        cursor: isCurrent ? "default" : "pointer",
                        boxShadow: isCurrent ? "0 2px 6px rgba(0,0,0,0.15)" : "none",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 파트너 안내 문자 재발송 버튼 */}
            <div style={{ marginBottom: 20 }}>
              <button
                onClick={handleResendSms}
                disabled={resendingSms}
                style={{
                  width: "100%",
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: darkMode ? "#1e3a5f" : "#eff6ff",
                  color: "#2563eb",
                  border: "1px solid #bfdbfe",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.15s ease",
                }}
              >
                <span>💬</span> {resendingSms ? "문자 발송 중..." : "파트너 안내 SMS 재발송"}
              </button>
            </div>

            {/* 최고관리자 내부 메모 */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: textPrimary }}>관리자 내부 메모</span>
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  style={{
                    height: 32,
                    padding: "0 14px",
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontWeight: 800,
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
                  padding: "12px",
                  borderRadius: 8,
                  backgroundColor: bg,
                  border: `1px solid ${border}`,
                  color: textPrimary,
                  fontSize: 13.5,
                  outline: "none",
                  boxSizing: "border-box",
                  lineHeight: 1.5,
                }}
              />
            </div>

            {/* 모달 하단 버튼: 닫기 & 삭제 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${border}`, paddingTop: 16 }}>
              <button
                onClick={() => handleDeleteSingle(selectedApp.id, selectedApp.applicant_name)}
                style={{
                  height: 38,
                  padding: "0 16px",
                  backgroundColor: "transparent",
                  color: "#ef4444",
                  border: "1px solid #fca5a5",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                🗑 이 신청서 삭제
              </button>

              <button
                onClick={() => setSelectedApp(null)}
                style={{
                  height: 38,
                  padding: "0 24px",
                  backgroundColor: darkMode ? "#3a3b3f" : "#374151",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
