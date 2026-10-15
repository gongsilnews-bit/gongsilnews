"use client";

import { useEffect, useState } from "react";

/* AI 가 일하는 동안 보이는 표시 — 통통 튀는 점 + 쉬운 말 + 걸린 시간 (글자만 바뀌면 지루하다, 2026-10-15 사장님)
   detail: 지금 하고 있는 일 (작은 회색 글씨) */
export default function StudioWorking({ title, detail }: { title: string; detail?: string }) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSec((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const min = Math.floor(sec / 60);
  return (
    <div style={{ marginTop: 12, padding: "16px 18px", borderRadius: 12, background: "#f0f5ff", border: "1px solid #d6e4ff", textAlign: "center" }}>
      <style>{`@keyframes gwWorkDot { 0%, 60%, 100% { transform: translateY(0); opacity: .45 } 30% { transform: translateY(-7px); opacity: 1 } }`}</style>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 6, height: 20, marginBottom: 8 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: "#2563eb", animation: `gwWorkDot 1.1s ease-in-out ${i * 0.16}s infinite` }} />
        ))}
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#1a3a6b" }}>{title}</div>
      <div style={{ marginTop: 4, fontSize: 13, color: "#475569" }}>잠시만 기다려 주세요 · {min ? `${min}분 ` : ""}{sec % 60}초</div>
      {detail && <div style={{ marginTop: 6, fontSize: 12, color: "#94a3b8" }}>{detail}</div>}
    </div>
  );
}
