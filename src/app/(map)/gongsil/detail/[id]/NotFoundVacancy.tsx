"use client";

import React from "react";
import Link from "next/link";

export default function NotFoundVacancy() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        color: "#334155",
        fontFamily: "Pretendard, -apple-system, sans-serif",
        gap: 16,
      }}
    >
      <div style={{ fontSize: 48, fontWeight: 700, color: "#94a3b8" }}>404</div>
      <h2 style={{ fontSize: 20, fontWeight: 600 }}>해당 공실 매물을 찾을 수 없습니다.</h2>
      <p style={{ fontSize: 14, color: "#64748b" }}>
        이미 거래가 완료되었거나 삭제된 공실일 수 있습니다.
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button
          onClick={() => {
            if (typeof window !== "undefined") window.close();
          }}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          창 닫기
        </button>
        <Link
          href="/gongsil"
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            background: "#2563eb",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          지도에서 매물 찾기
        </Link>
      </div>
    </div>
  );
}
