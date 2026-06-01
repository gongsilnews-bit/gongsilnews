"use client";

import React, { useState, useEffect } from "react";
import { AdminTheme } from "./types";
import { getInquiries, updateInquiryStatus, updateInquiryNotes } from "@/app/actions/inquiry";

interface InquirySectionProps {
  theme: AdminTheme;
}

export default function InquirySection({ theme }: InquirySectionProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;

  const [activeTab, setActiveTab] = useState("전체"); // 전체, 신규, 확인중, 답변완료, 보류
  const [activeCategory, setActiveCategory] = useState("전체"); // 전체, 매물 등록, AI온라인전단지, 제휴/제안, 오류 신고, 기타
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeFilters, setActiveFilters] = useState({ keyword: "", category: "전체" });

  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<any | null>(null);
  const [tempNotes, setTempNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // 1. 문의글 전체 가져오기
  const fetchAllInquiries = async () => {
    setLoading(true);
    const res = await getInquiries();
    if (res.success && res.data) {
      setInquiries(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAllInquiries();
  }, []);

  // 선택된 문의 최신화
  useEffect(() => {
    if (selectedInquiry) {
      const updated = inquiries.find((i) => i.id === selectedInquiry.id);
      if (updated) {
        setSelectedInquiry(updated);
        setTempNotes(updated.admin_notes || "");
      }
    }
  }, [inquiries]);

  // 필터링 적용
  const filteredInquiries = inquiries.filter((item) => {
    // 1. 상태(탭) 필터
    if (activeTab !== "전체" && item.status !== activeTab) return false;

    // 2. 카테고리 필터
    if (activeFilters.category !== "전체" && item.category !== activeFilters.category) return false;

    // 3. 검색어 필터 (작성자명, 전화번호, 제목, 내용)
    if (activeFilters.keyword) {
      const kw = activeFilters.keyword.toLowerCase();
      const nameMatch = item.name?.toLowerCase().includes(kw);
      const phoneMatch = item.phone?.includes(kw);
      const titleMatch = item.title?.toLowerCase().includes(kw);
      const contentMatch = item.content?.toLowerCase().includes(kw);
      if (!nameMatch && !phoneMatch && !titleMatch && !contentMatch) return false;
    }

    return true;
  });

  // 상태 색상 맵
  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case "신규":
        return { bg: "#ef4444", text: "#fff" };
      case "확인중":
        return { bg: "#f59e0b", text: "#fff" };
      case "답변완료":
        return { bg: "#10b981", text: "#fff" };
      case "보류":
        return { bg: "#6b7280", text: "#fff" };
      default:
        return { bg: "#e5e7eb", text: "#4b5563" };
    }
  };

  // 2. 상태 변경 핸들러
  const handleStatusChange = async (id: string, newStatus: string) => {
    const res = await updateInquiryStatus(id, newStatus);
    if (res.success) {
      // 리스트 갱신
      setInquiries((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
      );
      if (selectedInquiry && selectedInquiry.id === id) {
        setSelectedInquiry((prev: any) => ({ ...prev, status: newStatus }));
      }
    } else {
      alert("상태 변경 실패: " + res.message);
    }
  };

  // 3. 관리자 메모 저장 핸들러
  const handleSaveNotes = async () => {
    if (!selectedInquiry) return;
    setSavingNotes(true);
    const res = await updateInquiryNotes(selectedInquiry.id, tempNotes);
    if (res.success) {
      setInquiries((prev) =>
        prev.map((item) =>
          item.id === selectedInquiry.id ? { ...item, admin_notes: tempNotes } : item
        )
      );
      alert("처리 메모가 저장되었습니다.");
    } else {
      alert("메모 저장 실패: " + res.message);
    }
    setSavingNotes(false);
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg, position: "relative" }}>
      {/* ── 헤더 타이틀 ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>고객 문의 관리</h1>
        <span style={{ fontSize: 13, color: textSecondary, fontWeight: 600 }}>
          (미처리 {inquiries.filter((i) => i.status === "신규").length}건 / 전체 {inquiries.length}건)
        </span>
      </div>

      {/* ── 검색 필터 영역 ── */}
      <div
        style={{
          padding: "16px 24px",
          background: cardBg,
          borderRadius: 14,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          marginBottom: 20,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary, whiteSpace: "nowrap", marginRight: 4 }}>
            문의 카테고리
          </span>
          {["전체", "매물 등록", "AI온라인전단지", "제휴/제안", "오류 신고", "기타"].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setActiveFilters((prev) => ({ ...prev, category: cat }));
              }}
              style={{
                height: 34,
                padding: "0 14px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: activeCategory === cat ? 700 : 600,
                cursor: "pointer",
                transition: "all 0.2s",
                border: `1px solid ${activeCategory === cat ? "#3b82f6" : border}`,
                background:
                  activeCategory === cat
                    ? darkMode
                      ? "rgba(59, 130, 246, 0.2)"
                      : "#eff6ff"
                    : darkMode
                    ? "#2c2d31"
                    : "#fff",
                color: activeCategory === cat ? "#3b82f6" : textSecondary
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setActiveFilters((prev) => ({ ...prev, keyword: searchKeyword }));
            }
          }}
          placeholder="작성자명, 연락처, 제목, 내용 검색"
          style={{
            height: 36,
            padding: "0 12px",
            border: `1px solid ${border}`,
            borderRadius: 6,
            fontSize: 13,
            color: textPrimary,
            background: darkMode ? "#2c2d31" : "#fff",
            outline: "none",
            flex: 1,
            minWidth: 200
          }}
        />
        <button
          onClick={() => setActiveFilters((prev) => ({ ...prev, keyword: searchKeyword }))}
          style={{
            height: 36,
            padding: "0 18px",
            background: darkMode ? "#2c2d31" : "#374151",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          검색
        </button>
        <button
          onClick={() => {
            setSearchKeyword("");
            setActiveCategory("전체");
            setActiveFilters({ keyword: "", category: "전체" });
            setActiveTab("전체");
          }}
          style={{
            height: 36,
            padding: "0 14px",
            background: darkMode ? "#2c2d31" : "#fff",
            color: textSecondary,
            border: `1px solid ${border}`,
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          초기화
        </button>
      </div>

      {/* ── 리스트 및 탭 ── */}
      <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        {/* 상태 필터 탭 */}
        <div
          style={{
            display: "flex",
            borderBottom: `1px solid ${border}`,
            background: darkMode ? "#2c2d31" : "#fafafa",
            padding: "0 16px"
          }}
        >
          {["전체", "신규", "확인중", "답변완료", "보류"].map((tab) => {
            const count = tab === "전체" ? inquiries.length : inquiries.filter((i) => i.status === tab).length;
            const colors = getStatusBadgeStyles(tab);

            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  // 리셋 일부
                  setSearchKeyword("");
                  setActiveCategory("전체");
                  setActiveFilters({ keyword: "", category: "전체" });
                }}
                style={{
                  border: "none",
                  background: "none",
                  padding: "16px 20px",
                  fontSize: 14,
                  fontWeight: activeTab === tab ? 800 : 600,
                  color: activeTab === tab ? "#3b82f6" : textSecondary,
                  borderBottom: activeTab === tab ? "3px solid #3b82f6" : "3px solid transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                {tab}
                <span
                  style={{
                    background: tab === "전체" ? "#e5e7eb" : colors.bg,
                    color: tab === "전체" ? "#4b5563" : colors.text,
                    padding: "2px 8px",
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 700
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 데이터 테이블 */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
            <thead>
              <tr style={{ background: darkMode ? "#2c2d31" : "#f9fafb" }}>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "center",
                    fontWeight: 700,
                    color: textSecondary,
                    fontSize: 14,
                    borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`,
                    width: 90
                  }}
                >
                  상태
                </th>
                <th
                  style={{
                    padding: "12px 10px",
                    textAlign: "center",
                    fontWeight: 700,
                    color: textSecondary,
                    fontSize: 14,
                    borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`,
                    width: 130
                  }}
                >
                  문의 구분
                </th>
                <th
                  style={{
                    padding: "12px 10px",
                    textAlign: "left",
                    fontWeight: 700,
                    color: textSecondary,
                    fontSize: 14,
                    borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`,
                    width: 140
                  }}
                >
                  문의자 / 연락처
                </th>
                <th
                  style={{
                    padding: "12px 10px",
                    textAlign: "left",
                    fontWeight: 700,
                    color: textSecondary,
                    fontSize: 14,
                    borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`
                  }}
                >
                  문의 내용 (요약)
                </th>
                <th
                  style={{
                    padding: "12px 10px",
                    textAlign: "center",
                    fontWeight: 700,
                    color: textSecondary,
                    fontSize: 14,
                    borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`,
                    width: 100
                  }}
                >
                  등록일자
                </th>
                <th
                  style={{
                    padding: "12px 10px",
                    textAlign: "center",
                    fontWeight: 700,
                    color: textSecondary,
                    fontSize: 14,
                    borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}`,
                    width: 100
                  }}
                >
                  메모 여부
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: "center", color: textSecondary, fontSize: 14 }}>
                    문의 내역을 불러오는 중입니다...
                  </td>
                </tr>
              ) : filteredInquiries.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: "center", color: textSecondary, fontSize: 14 }}>
                    조건에 해당하는 문의 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredInquiries.map((row) => {
                  const dateStr = new Date(row.created_at).toLocaleDateString("ko-KR", {
                    timeZone: "Asia/Seoul",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit"
                  });
                  const badge = getStatusBadgeStyles(row.status);

                  return (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}`,
                        transition: "background 0.15s",
                        cursor: "pointer",
                        background: selectedInquiry?.id === row.id ? (darkMode ? "#34363c" : "#f0f4ff") : "transparent"
                      }}
                      onMouseEnter={(e) => {
                        if (selectedInquiry?.id !== row.id) {
                          e.currentTarget.style.background = darkMode ? "#3a3b3f" : "#f8fafc";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedInquiry?.id !== row.id) {
                          e.currentTarget.style.background = "transparent";
                        }
                      }}
                      onClick={() => {
                        setSelectedInquiry(row);
                        setTempNotes(row.admin_notes || "");
                      }}
                    >
                      {/* 상태 */}
                      <td style={{ padding: "14px 16px", textAlign: "center", verticalAlign: "middle" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 8px",
                            borderRadius: 4,
                            background: badge.bg,
                            color: badge.text,
                            fontWeight: 700,
                            fontSize: 11,
                            whiteSpace: "nowrap"
                          }}
                        >
                          {row.status}
                        </span>
                      </td>

                      {/* 구분 */}
                      <td
                        style={{
                          padding: "14px 10px",
                          textAlign: "center",
                          verticalAlign: "middle",
                          fontWeight: 700,
                          fontSize: 13,
                          color: textSecondary
                        }}
                      >
                        {row.category}
                      </td>

                      {/* 이름 / 연락처 */}
                      <td style={{ padding: "14px 10px", verticalAlign: "middle" }}>
                        <div style={{ fontWeight: 800, color: textPrimary, fontSize: 14, marginBottom: 2 }}>
                          {row.name}
                        </div>
                        <div style={{ fontSize: 12, color: textSecondary, fontWeight: 500 }}>{row.phone}</div>
                      </td>

                      {/* 문의 제목 및 요약 */}
                      <td style={{ padding: "14px 10px", verticalAlign: "middle", textAlign: "left" }}>
                        <div style={{ fontWeight: 700, color: textPrimary, fontSize: 14, marginBottom: 2 }}>
                          {row.title || "제목 없음"}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: textSecondary,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 400
                          }}
                        >
                          {row.content}
                        </div>
                      </td>

                      {/* 등록일 */}
                      <td
                        style={{
                          padding: "14px 10px",
                          textAlign: "center",
                          verticalAlign: "middle",
                          fontSize: 12,
                          color: textSecondary
                        }}
                      >
                        {dateStr}
                      </td>

                      {/* 메모 여부 */}
                      <td style={{ padding: "14px 10px", textAlign: "center", verticalAlign: "middle" }}>
                        {row.admin_notes ? (
                          <span
                            style={{
                              background: darkMode ? "#1e3a2f" : "#d1fae5",
                              color: darkMode ? "#34d399" : "#065f46",
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: 4
                            }}
                          >
                            작성됨
                          </span>
                        ) : (
                          <span style={{ color: "#9ca3af", fontSize: 11 }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 우측 슬라이드 아웃 상세 패널 ── */}
      {selectedInquiry && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 480,
            height: "100%",
            background: cardBg,
            boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
            zIndex: 30,
            display: "flex",
            flexDirection: "column",
            borderLeft: `1px solid ${border}`,
            animation: "slideIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards"
          }}
        >
          <style>{`
            @keyframes slideIn {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}</style>

          {/* 패널 헤더 */}
          <div
            style={{
              padding: "20px 24px",
              borderBottom: `1px solid ${border}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexShrink: 0
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  padding: "4px 8px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  ...(() => {
                    const badge = getStatusBadgeStyles(selectedInquiry.status);
                    return { background: badge.bg, color: badge.text };
                  })()
                }}
              >
                {selectedInquiry.status}
              </span>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: textPrimary, margin: 0 }}>문의 상세 정보</h3>
            </div>
            <button
              onClick={() => setSelectedInquiry(null)}
              style={{
                background: "none",
                border: "none",
                fontSize: 18,
                fontWeight: 700,
                color: textSecondary,
                cursor: "pointer",
                padding: 4
              }}
            >
              ✕
            </button>
          </div>

          {/* 패널 본문 */}
          <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
            {/* 1. 기본 인포 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", borderBottom: `1px solid ${border}`, paddingBottom: 10 }}>
                <div style={{ width: 100, fontSize: 13, fontWeight: 700, color: textSecondary }}>문의자명</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: textPrimary }}>{selectedInquiry.name}</div>
              </div>
              <div style={{ display: "flex", borderBottom: `1px solid ${border}`, paddingBottom: 10 }}>
                <div style={{ width: 100, fontSize: 13, fontWeight: 700, color: textSecondary }}>연락처</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary, display: "flex", gap: 8 }}>
                  {selectedInquiry.phone}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedInquiry.phone);
                      alert("연락처가 복사되었습니다.");
                    }}
                    style={{
                      border: "none",
                      background: darkMode ? "#333" : "#f1f5f9",
                      fontSize: 11,
                      padding: "2px 6px",
                      borderRadius: 4,
                      color: textPrimary,
                      cursor: "pointer"
                    }}
                  >
                    복사
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", borderBottom: `1px solid ${border}`, paddingBottom: 10 }}>
                <div style={{ width: 100, fontSize: 13, fontWeight: 700, color: textSecondary }}>이메일</div>
                <div style={{ fontSize: 14, color: textPrimary }}>{selectedInquiry.email || "미입력"}</div>
              </div>
              <div style={{ display: "flex", borderBottom: `1px solid ${border}`, paddingBottom: 10 }}>
                <div style={{ width: 100, fontSize: 13, fontWeight: 700, color: textSecondary }}>카테고리</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#3b82f6" }}>{selectedInquiry.category}</div>
              </div>
              <div style={{ display: "flex", borderBottom: `1px solid ${border}`, paddingBottom: 10 }}>
                <div style={{ width: 100, fontSize: 13, fontWeight: 700, color: textSecondary }}>등록 일시</div>
                <div style={{ fontSize: 13, color: textSecondary }}>
                  {new Date(selectedInquiry.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                </div>
              </div>
            </div>

            {/* 2. 문의 본문 */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 8 }}>문의 제목</div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: textPrimary,
                  background: darkMode ? "#333" : "#f8fafc",
                  padding: "10px 14px",
                  borderRadius: 6,
                  marginBottom: 14
                }}
              >
                {selectedInquiry.title || "제목 없음"}
              </div>

              <div style={{ fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 8 }}>문의 상세 내용</div>
              <div
                style={{
                  fontSize: 14,
                  color: textPrimary,
                  lineHeight: 1.6,
                  background: darkMode ? "#333" : "#f8fafc",
                  padding: "16px",
                  borderRadius: 8,
                  whiteSpace: "pre-wrap",
                  minHeight: 120,
                  maxHeight: 250,
                  overflowY: "auto"
                }}
              >
                {selectedInquiry.content}
              </div>
            </div>

            {/* 3. 상태 신속 관리 */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: textSecondary, marginBottom: 8 }}>처리 상태 지정</div>
              <div style={{ display: "flex", gap: 6 }}>
                {["신규", "확인중", "답변완료", "보류"].map((st) => {
                  const isActive = selectedInquiry.status === st;
                  const colors = getStatusBadgeStyles(st);
                  return (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(selectedInquiry.id, st)}
                      style={{
                        flex: 1,
                        height: 34,
                        border: "none",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        background: isActive ? colors.bg : darkMode ? "#333" : "#f1f5f9",
                        color: isActive ? "#fff" : textSecondary,
                        transition: "all 0.15s"
                      }}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. 관리자 메모 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: textSecondary }}>관리자 처리 메모</div>
              <textarea
                value={tempNotes}
                onChange={(e) => setTempNotes(e.target.value)}
                placeholder="처리 경과, 조치 사항, 답변한 내용 등을 기록해 두세요."
                style={{
                  width: "100%",
                  height: 100,
                  padding: 12,
                  borderRadius: 8,
                  border: `1px solid ${border}`,
                  background: darkMode ? "#222" : "#fff",
                  color: textPrimary,
                  fontSize: 13,
                  outline: "none",
                  resize: "none",
                  fontFamily: "inherit"
                }}
              />
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                style={{
                  height: 38,
                  background: "#3b82f6",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  opacity: savingNotes ? 0.7 : 1
                }}
              >
                {savingNotes ? "메모 저장 중..." : "처리 메모 저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
