import React from 'react';

export default function Loading() {
  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff", fontFamily: "'Pretendard', sans-serif" }}>
      <style>{`
        @keyframes pageMapLoadingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.45; }
          30% { transform: translateY(-7px); opacity: 1; }
        }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 14, background: "rgba(255,255,255,0.96)", boxShadow: "0 3px 12px rgba(15,23,42,0.14)", border: "1px solid rgba(226,232,240,0.9)" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 18 }}>
          {[0, 1, 2].map((index) => (
            <span key={index} style={{ width: 6, height: 6, borderRadius: "50%", background: "#2563eb", animation: `pageMapLoadingDot 1s ease-in-out ${index * 0.15}s infinite` }} />
          ))}
        </div>
        <span style={{ color: "#334155", fontSize: 13, fontWeight: 700 }}>매물을 불러오는 중</span>
      </div>
    </div>
  );
}
