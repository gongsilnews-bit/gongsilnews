"use client";

import React from "react";

interface LoadingDotsProps {
  label?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
  style?: React.CSSProperties;
}

export default function LoadingDots({
  label = "데이터를 불러오고 있습니다",
  size = "md",
  fullScreen = false,
  style,
}: LoadingDotsProps) {
  const dotSize = size === "sm" ? 5 : size === "lg" ? 8 : 7;
  const fontSize = size === "sm" ? 13 : size === "lg" ? 16 : 15;
  const dotGap = size === "sm" ? 3 : 5;

  const content = (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: size === "sm" ? "8px 16px" : "14px 24px",
        background: "rgba(255, 255, 255, 0.98)",
        borderRadius: 14,
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
        border: "1px solid #e2e8f0",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <style>{`
        @keyframes gongsilLoadingDotJump {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.45; }
          30% { transform: translateY(-7px); opacity: 1; }
        }
      `}</style>
      <span style={{ color: "#1e293b", fontSize, fontWeight: 700, letterSpacing: "-0.3px" }}>
        {label}
      </span>
      <span style={{ display: "inline-flex", gap: dotGap, alignItems: "center", height: 16 }}>
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            style={{
              width: dotSize,
              height: dotSize,
              borderRadius: "50%",
              background: "#2563eb",
              animation: `gongsilLoadingDotJump 1.1s ease-in-out ${index * 0.16}s infinite`,
            }}
          />
        ))}
      </span>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        style={{
          width: "100%",
          minHeight: "45vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 20px",
        }}
      >
        {content}
      </div>
    );
  }

  return content;
}
