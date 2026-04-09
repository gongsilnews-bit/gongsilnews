"use client";

export default function QuickFloatingMenu() {
  return (
    <div className="quick-menu">
      <div className="qm-item">
        <span>📌</span>관심매물
      </div>
      <div className="qm-item">
        <span>🕒</span>최근조회
      </div>
      <div className="qm-item">
        <span>📋</span>문의내역
      </div>
      <div
        className="qm-item"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        style={{ background: "#f9f9f9" }}
      >
        <span>🔝</span>TOP
      </div>
    </div>
  );
}
