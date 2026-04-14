import React from 'react';

export default function Loading() {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8f9fa", fontFamily: "'Pretendard', sans-serif" }}>
      <div style={{ width: 50, height: 50, border: "4px solid #e0e0e0", borderTop: "4px solid #1a73e8", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: 20 }}></div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#333", margin: "0 0 8px 0", letterSpacing: "-0.5px" }}>실시간 공실 지도 로딩 중...</h2>
      <p style={{ fontSize: 14, color: "#888", margin: 0 }}>최신 매물 데이터를 실시간으로 동기화하고 있습니다.</p>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
