import React from "react";

export default function MobileAdminLoading({ label = "불러오는 중" }: { label?: string }) {
  return (
    <div style={{ padding: "56px 0", display: "flex", justifyContent: "center" }}>
      <style>{`
        @keyframes mobileAdminLoadingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.45; }
          30% { transform: translateY(-7px); opacity: 1; }
        }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "rgba(255,255,255,0.96)", border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 3px 12px rgba(15,23,42,0.08)" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 16 }}>
          {[0, 1, 2].map(index => (
            <span key={index} style={{ width: 6, height: 6, borderRadius: "50%", background: "#2563eb", animation: `mobileAdminLoadingDot 1s ease-in-out ${index * 0.15}s infinite` }} />
          ))}
        </div>
        <span style={{ color: "#334155", fontSize: 13, fontWeight: 700 }}>{label}</span>
      </div>
    </div>
  );
}
