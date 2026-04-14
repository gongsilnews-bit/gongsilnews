import React from 'react';

export default function Loading() {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8f9fa", fontFamily: "'Pretendard', sans-serif" }}>
      <div style={{ width: 50, height: 50, border: "4px solid #e0e0e0", borderTop: "4px solid #ff8e15", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: 20 }}></div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#333", margin: "0 0 8px 0", letterSpacing: "-0.5px" }}>우리동네 뉴스 지도 로딩 중...</h2>
      <p style={{ fontSize: 14, color: "#888", margin: 0 }}>지역별 핫한 뉴스 및 매물 기사를 불러오고 있습니다.</p>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
