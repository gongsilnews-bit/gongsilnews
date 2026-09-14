"use client";

import React, { useState } from "react";
import type { LectureMaterial } from "@/types/lectureMaterial";
import { getLectureMaterialUrl } from "@/app/actions/lectureMaterials";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lessonTitle: string;
  materials: { material: LectureMaterial; globalIndex: number }[];
  lectureId: string;
}

export default function LecturePublicMaterialsModal({
  isOpen,
  onClose,
  lessonTitle,
  materials,
  lectureId,
}: Props) {
  const [busyIndex, setBusyIndex] = useState<number | null>(null);

  if (!isOpen || !materials || materials.length === 0) return null;

  const handleDownloadOrOpen = async (item: { material: LectureMaterial; globalIndex: number }) => {
    setBusyIndex(item.globalIndex);
    // Synchronously open blank window to avoid mobile browser popup blocking
    const target = window.open("about:blank", "_blank");
    try {
      const res = await getLectureMaterialUrl(lectureId, item.globalIndex);
      if (!res.success || !res.url) {
        throw new Error(res.error || "자료를 열 수 없습니다.");
      }
      if (target) {
        target.location.href = res.url;
      } else {
        window.location.assign(res.url);
      }
    } catch (err: any) {
      target?.close();
      alert(err.message || "자료를 불러오는데 실패했습니다.");
    } finally {
      setBusyIndex(null);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            background: "#f8fafc",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#1d4ed8",
                  background: "#eff6ff",
                  padding: "2px 7px",
                  borderRadius: 4,
                  border: "1px solid #bfdbfe",
                }}
              >
                📂 공개 학습 자료
              </span>
            </div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#0f172a",
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              {lessonTitle}
            </h3>
            <p style={{ fontSize: 12.5, color: "#64748b", margin: "4px 0 0 0" }}>
              수강 전 무료로 열람 및 다운로드할 수 있는 자료입니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 20,
              color: "#94a3b8",
              cursor: "pointer",
              padding: "2px 6px",
              lineHeight: 1,
              borderRadius: 4,
            }}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 본문 자료 목록 */}
        <div
          style={{
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            maxHeight: "60vh",
            overflowY: "auto",
          }}
        >
          {materials.map((item, idx) => {
            const isFile = item.material.type === "FILE";
            const isBusy = busyIndex === item.globalIndex;

            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "12px 14px",
                  background: "#ffffff",
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: isFile ? "#ecfdf5" : "#eff6ff",
                      color: isFile ? "#059669" : "#2563eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {isFile ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M10 13a5 5 0 0 0 7 .1l3-3a5 5 0 0 0-7-7l-2 2" />
                        <path d="M14 11a5 5 0 0 0-7-.1l-3 3a5 5 0 0 0 7 7l2-2" />
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: "#1e293b",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={item.material.label || (isFile ? "첨부파일" : "외부 자료")}
                    >
                      {item.material.label || (isFile ? "첨부파일" : "외부 자료")}
                    </div>
                    <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                      {isFile ? "첨부파일" : "외부 링크"} · 무료 공개
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={busyIndex !== null}
                  onClick={() => handleDownloadOrOpen(item)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "7px 12px",
                    borderRadius: 6,
                    background: isFile ? "#059669" : "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: busyIndex !== null ? "not-allowed" : "pointer",
                    opacity: busyIndex !== null ? 0.6 : 1,
                    flexShrink: 0,
                  }}
                >
                  {isBusy ? (
                    "확인 중…"
                  ) : isFile ? (
                    <>
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      받기
                    </>
                  ) : (
                    <>
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      열기
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* 푸터 */}
        <div
          style={{
            padding: "12px 20px",
            background: "#f8fafc",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 11.5, color: "#64748b" }}>
            💡 수강 시 모든 챕터 자료를 이용할 수 있습니다.
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              background: "#ffffff",
              color: "#475569",
              border: "1px solid #cbd5e1",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
