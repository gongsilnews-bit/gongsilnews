"use client";

import React from "react";
import type { AdminTheme } from "@/components/admin/sections/types";
import { TASK_STATUSES } from "./types";

interface Props {
  theme: AdminTheme;
}

const FLOW = ["작업 등록", "PC 에이전트가 가져감", "코드 수정·빌드", "브랜치 push·미리보기", "대표 승인", "실서버 반영"];

export default function DevRoomBoard({ theme }: Props) {
  const { cardBg, textPrimary, textSecondary, border, darkMode } = theme;

  const cardStyle: React.CSSProperties = {
    background: cardBg,
    borderRadius: 14,
    padding: "24px 28px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    border: `1px solid ${border}`,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── 안내 + 흐름 ── */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: textPrimary }}>🛠️ AI 개발실</h3>
          <button
            disabled
            title="DB 연결 후 사용 가능"
            style={{
              padding: "8px 20px", borderRadius: 8, background: "#93c5fd", color: "#fff",
              border: "none", fontSize: 13, fontWeight: 700, cursor: "not-allowed", fontFamily: "inherit",
            }}
          >
            ＋ 작업 등록 (준비중)
          </button>
        </div>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: textSecondary, lineHeight: 1.6 }}>
          오류·수정 요청을 한국어로 등록하면 사장님 PC의 로컬 에이전트가 가져가 코드를 고치고, 검증 후 GitHub 브랜치에 올려 승인을 기다립니다.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {FLOW.map((step, i) => (
            <React.Fragment key={step}>
              <span style={{
                padding: "6px 12px", borderRadius: 16, fontSize: 12, fontWeight: 600,
                background: darkMode ? "#2c2d33" : "#f1f5f9", color: textPrimary,
              }}>
                {i + 1}. {step}
              </span>
              {i < FLOW.length - 1 && <span style={{ color: textSecondary, fontSize: 12 }}>→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── 작업 목록 ── */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: textPrimary }}>📋 작업 목록</h3>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TASK_STATUSES.map((s) => (
              <span
                key={s.key}
                title={s.description}
                style={{
                  padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 700,
                  color: s.color, border: `1px solid ${s.color}`, background: "transparent",
                }}
              >
                {s.label} 0
              </span>
            ))}
          </div>
        </div>
        <div style={{ textAlign: "center", padding: "40px 0", color: textSecondary }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🛠️</div>
          <div style={{ fontSize: 14 }}>아직 등록된 작업이 없습니다.</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>작업 등록 기능은 DB 연결 후 열립니다.</div>
        </div>
      </div>
    </div>
  );
}
