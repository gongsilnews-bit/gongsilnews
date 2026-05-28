import React from 'react';

export default function Loading() {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#ffffff", fontFamily: "'Pretendard', sans-serif" }}>
      <style>{`
        @keyframes pulseRingHero {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>

      {/* 🌀 스크린샷과 100% 일치하는 대형 펄싱 로케이션 마커 */}
      <div style={{ position: "relative", width: "60px", height: "60px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
        <div style={{ position: "absolute", width: "100%", height: "100%", borderRadius: "50%", background: "#4b89ff", animation: "pulseRingHero 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite" }} />
        <div style={{ position: "relative", width: "36px", height: "36px", borderRadius: "50%", background: "#1a4282", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
          <style>{`
            @keyframes spinCircle {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <div style={{
            width: 20,
            height: 20,
            border: "2.5px solid rgba(255, 255, 255, 0.2)",
            borderTop: "2.5px solid #ffffff",
            borderRadius: "50%",
            animation: "spinCircle 0.8s linear infinite"
          }} />
        </div>
      </div>

      <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#1a2e50", marginBottom: "8px", margin: "0 0 8px 0", letterSpacing: "-0.5px" }}>
        실시간 공실 지도 로딩 중입니다
      </h2>
      
      <p style={{ fontSize: "14px", color: "#6b7280", textAlign: "center", lineHeight: 1.5, margin: 0 }}>
        최신 공실광고 데이터를 실시간으로 동기화하고 있습니다.<br/>잠시만 기다려 주세요.
      </p>
    </div>
  );
}
