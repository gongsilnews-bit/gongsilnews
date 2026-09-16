"use client";

import React, { useState, useEffect } from "react";
import {
  getStudySettings,
  getStudyCategoryUsage,
  saveStudyCategories,
  renameStudyCategory,
} from "@/app/actions/studySettings";

interface StudySettingsModalProps {
  darkMode?: boolean;
  onClose: () => void;
  onCategoriesUpdated?: (cats: string[]) => void;
}

export default function StudySettingsModal({
  darkMode = false,
  onClose,
  onCategoriesUpdated,
}: StudySettingsModalProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [newCatName, setNewCatName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 데이터 로드
  useEffect(() => {
    let mounted = true;
    async function init() {
      setLoading(true);
      const [settingsRes, usageRes] = await Promise.all([
        getStudySettings(),
        getStudyCategoryUsage(),
      ]);

      if (mounted) {
        if (settingsRes.success && settingsRes.categories) {
          setCategories(settingsRes.categories);
        }
        if (usageRes.success && usageRes.counts) {
          setCounts(usageRes.counts);
        }
        setLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, []);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // 알림 메시지 3초 후 자동 소멸
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(t);
  }, [message]);

  // 카테고리 추가
  const handleAddCategory = () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      setMessage({ type: "error", text: "이미 존재하는 카테고리명입니다." });
      return;
    }
    const updated = [...categories, trimmed];
    setCategories(updated);
    setNewCatName("");
    setMessage({ type: "success", text: `'${trimmed}' 카테고리가 추가되었습니다. [저장 및 적용]을 눌러주세요.` });
  };

  // 순서 위로 이동
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...categories];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setCategories(updated);
  };

  // 순서 아래로 이동
  const handleMoveDown = (index: number) => {
    if (index === categories.length - 1) return;
    const updated = [...categories];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setCategories(updated);
  };

  // 카테고리 삭제
  const handleDelete = (index: number) => {
    const target = categories[index];
    const usedCount = counts[target] || 0;

    if (usedCount > 0) {
      if (
        !confirm(
          `⚠️ 주의: 현재 '${target}' 카테고리로 등록된 강의가 ${usedCount}건 있습니다.\n정말 삭제하시겠습니까?\n(삭제 시 해당 강의는 유지되나 필터 탭에서는 숨겨집니다.)`
        )
      ) {
        return;
      }
    } else {
      if (!confirm(`'${target}' 카테고리를 삭제하시겠습니까?`)) return;
    }

    const updated = categories.filter((_, i) => i !== index);
    setCategories(updated);
    setMessage({ type: "success", text: `'${target}' 카테고리가 목록에서 제외되었습니다.` });
  };

  // 인라인 이름 수정 시작
  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditName(categories[index]);
  };

  // 인라인 이름 수정 저장
  const commitEdit = async (index: number) => {
    const oldName = categories[index];
    const trimmed = editName.trim();

    if (!trimmed || trimmed === oldName) {
      setEditingIndex(null);
      return;
    }

    if (categories.some((c, i) => i !== index && c === trimmed)) {
      setMessage({ type: "error", text: "이미 존재하는 다른 카테고리명입니다." });
      return;
    }

    setSaving(true);
    const res = await renameStudyCategory(oldName, trimmed);
    setSaving(false);

    if (res.success) {
      const updated = [...categories];
      updated[index] = trimmed;
      setCategories(updated);
      setEditingIndex(null);

      // 개수 맵 업데이트
      setCounts((prev) => {
        const next = { ...prev };
        if (next[oldName] !== undefined) {
          next[trimmed] = (next[trimmed] || 0) + next[oldName];
          delete next[oldName];
        }
        return next;
      });

      setMessage({ type: "success", text: `'${oldName}' ➔ '${trimmed}'(으)로 변경 및 기존 강의에 일괄 적용되었습니다.` });
      onCategoriesUpdated?.(updated);
    } else {
      setMessage({ type: "error", text: res.error || "수정 실패" });
    }
  };

  // 전체 목록 최종 저장
  const handleSaveAll = async () => {
    setSaving(true);
    const res = await saveStudyCategories(categories);
    setSaving(false);

    if (res.success) {
      setMessage({ type: "success", text: "카테고리 설정이 성공적으로 저장 및 적용되었습니다!" });
      onCategoriesUpdated?.(res.categories);
      setTimeout(() => {
        onClose();
      }, 700);
    } else {
      setMessage({ type: "error", text: res.error || "저장 실패" });
    }
  };

  // 기본값 복원
  const handleResetDefault = () => {
    if (!confirm("기본 6대 카테고리(중개실무, 법률, 세무, 분양, 마케팅, 기타)로 초기화하시겠습니까?")) return;
    const defaults = ["중개실무", "법률", "세무", "분양", "마케팅", "기타"];
    setCategories(defaults);
    setMessage({ type: "success", text: "기본값으로 세팅되었습니다. [저장 및 적용]을 눌러주세요." });
  };

  const bg = darkMode ? "#1f2937" : "#ffffff";
  const border = darkMode ? "#374151" : "#e5e7eb";
  const textPrimary = darkMode ? "#f9fafb" : "#111827";
  const textSecondary = darkMode ? "#9ca3af" : "#6b7280";
  const itemBg = darkMode ? "#111827" : "#f8fafc";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: bg,
          borderRadius: 16,
          width: "100%",
          maxWidth: 620,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
          border: `1px solid ${border}`,
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 헤더 ── */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>⚙️</span>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: textPrimary, margin: 0 }}>
                공실스터디 설정
              </h2>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 12,
                  background: "#10b981",
                  color: "#fff",
                }}
              >
                실시간 동기화
              </span>
            </div>
            <p style={{ fontSize: 12.5, color: textSecondary, margin: "4px 0 0 0" }}>
              등록창 및 PC/모바일 스터디 메인의 카테고리 탭을 동적으로 추가·수정·삭제합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: textSecondary,
              fontSize: 22,
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: 6,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* ── 알림 배너 ── */}
        {message && (
          <div
            style={{
              padding: "10px 24px",
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: message.type === "success" ? "#ecfdf5" : "#fef2f2",
              color: message.type === "success" ? "#065f46" : "#b91c1c",
              borderBottom: `1px solid ${message.type === "success" ? "#a7f3d0" : "#fecaca"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>{message.type === "success" ? "✓ " : "⚠️ "}{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: 700 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ── 본문 ── */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {/* 새 카테고리 등록 인풋 바 */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: textPrimary, marginBottom: 8 }}>
              + 새 카테고리 추가
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCategory();
                  }
                }}
                placeholder="예: 경매/공매, 숏폼영상, 상가분석 등 입력"
                style={{
                  flex: 1,
                  height: 40,
                  padding: "0 14px",
                  borderRadius: 8,
                  border: `1px solid ${border}`,
                  fontSize: 13.5,
                  backgroundColor: darkMode ? "#111827" : "#fff",
                  color: textPrimary,
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={handleAddCategory}
                style={{
                  height: 40,
                  padding: "0 18px",
                  background: "#059669",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                + 추가
              </button>
            </div>
          </div>

          {/* 카테고리 목록 리스트 */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>
                현재 카테고리 순서 ({categories.length}개)
              </span>
              <button
                type="button"
                onClick={handleResetDefault}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 12,
                  color: textSecondary,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                기본값 복원
              </button>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: textSecondary, fontSize: 13 }}>
                카테고리 정보를 불러오는 중...
              </div>
            ) : categories.length === 0 ? (
              <div
                style={{
                  padding: 30,
                  textAlign: "center",
                  color: textSecondary,
                  backgroundColor: itemBg,
                  borderRadius: 8,
                  border: `1px dashed ${border}`,
                  fontSize: 13,
                }}
              >
                등록된 카테고리가 없습니다. 상단에서 카테고리를 추가해주세요.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {categories.map((cat, idx) => {
                  const lectureCount = counts[cat] || 0;
                  const isEditing = editingIndex === idx;

                  return (
                    <div
                      key={cat + idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        backgroundColor: itemBg,
                        borderRadius: 10,
                        border: `1px solid ${border}`,
                      }}
                    >
                      {/* 순서 변경 버튼 & 이름 */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveUp(idx)}
                            style={{
                              background: "none",
                              border: "none",
                              fontSize: 10,
                              cursor: idx === 0 ? "not-allowed" : "pointer",
                              color: idx === 0 ? "#cbd5e1" : textPrimary,
                              padding: 0,
                              lineHeight: 1,
                            }}
                            title="위로 이동"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={idx === categories.length - 1}
                            onClick={() => handleMoveDown(idx)}
                            style={{
                              background: "none",
                              border: "none",
                              fontSize: 10,
                              cursor: idx === categories.length - 1 ? "not-allowed" : "pointer",
                              color: idx === categories.length - 1 ? "#cbd5e1" : textPrimary,
                              padding: 0,
                              lineHeight: 1,
                            }}
                            title="아래로 이동"
                          >
                            ▼
                          </button>
                        </div>

                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#059669",
                            width: 22,
                            textAlign: "center",
                          }}
                        >
                          {idx + 1}
                        </span>

                        {isEditing ? (
                          <div style={{ display: "flex", gap: 6, flex: 1, maxWidth: 220 }}>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitEdit(idx);
                                if (e.key === "Escape") setEditingIndex(null);
                              }}
                              autoFocus
                              style={{
                                height: 30,
                                padding: "0 8px",
                                fontSize: 13,
                                borderRadius: 4,
                                border: "1px solid #10b981",
                                width: "100%",
                                color: textPrimary,
                                backgroundColor: darkMode ? "#1f2937" : "#fff",
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => commitEdit(idx)}
                              disabled={saving}
                              style={{
                                height: 30,
                                padding: "0 10px",
                                background: "#059669",
                                color: "#fff",
                                border: "none",
                                borderRadius: 4,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              저장
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>
                              {cat}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: "2px 7px",
                                borderRadius: 10,
                                backgroundColor: lectureCount > 0 ? "#ecfdf5" : darkMode ? "#374151" : "#f1f5f9",
                                color: lectureCount > 0 ? "#047857" : textSecondary,
                              }}
                            >
                              강의 {lectureCount}건
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 수정 & 삭제 버튼 */}
                      {!isEditing && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => startEdit(idx)}
                            style={{
                              height: 28,
                              padding: "0 10px",
                              background: darkMode ? "#374151" : "#e2e8f0",
                              color: textPrimary,
                              border: "none",
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(idx)}
                            style={{
                              height: 28,
                              padding: "0 10px",
                              background: "none",
                              color: "#ef4444",
                              border: `1px solid ${darkMode ? "#7f1d1d" : "#fecaca"}`,
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── 하단 액션 ── */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: `1px solid ${border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: itemBg,
          }}
        >
          <span style={{ fontSize: 12, color: textSecondary }}>
            순서 변경 후 <strong>[저장 및 적용]</strong>을 눌러야 메인에 반영됩니다.
          </span>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                height: 38,
                padding: "0 18px",
                background: darkMode ? "#374151" : "#fff",
                color: textSecondary,
                border: `1px solid ${border}`,
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              닫기
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving}
              style={{
                height: 38,
                padding: "0 22px",
                background: "#059669",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "저장 중..." : "저장 및 적용"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
