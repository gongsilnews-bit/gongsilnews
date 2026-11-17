"use client";
// 반려 사유·심사 피드백 — 두 줄만 보이고 [더보기 ▾]로 펼치기 (2026-11-17 사장님: "반려됨 너무 길게 나와, 어플과 같이 짧게 접고 열 수 있게")
import React, { useState } from "react";

export default function FoldReason({ label, text, color, className }: { label: string; text: string; color: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 80; // 짧으면 접지 않는다
  return (
    <div className={className} style={{ marginTop: 4, fontSize: 12, color, fontWeight: 600, lineHeight: 1.5 }}>
      <div style={open || !long ? undefined : { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {label}: {text}
      </div>
      {long && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
          style={{ marginTop: 2, padding: 0, border: "none", background: "none", color: "#6b7280", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
        >
          {open ? "접기 ▴" : "더보기 ▾"}
        </button>
      )}
    </div>
  );
}
