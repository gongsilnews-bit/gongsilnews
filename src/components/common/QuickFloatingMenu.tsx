"use client";

export default function QuickFloatingMenu() {
  return (
    <div className="quick-menu">
      <div className="qm-item" onClick={() => window.location.href = "/gongsil"} style={{ cursor: "pointer" }}>
        <span>📌</span>관심매물
      </div>
      <div className="qm-item" onClick={() => window.location.href = "/news"} style={{ cursor: "pointer" }}>
        <span>📰</span>관심기사
      </div>
      <div
        className="qm-item"
        onClick={() => window.open("https://pf.kakao.com/_ckHkG/chat", "_blank")}
        style={{ cursor: "pointer" }}
      >
        <span>💬</span>카카오톡문의
      </div>
      <div
        className="qm-item"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        style={{ background: "#f9f9f9", cursor: "pointer" }}
      >
        <span>🔝</span>TOP
      </div>
    </div>
  );
}
