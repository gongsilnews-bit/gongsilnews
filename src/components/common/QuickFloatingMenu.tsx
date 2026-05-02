"use client";

export default function QuickFloatingMenu() {
  return (
    <div className="quick-menu">
      <div className="qm-item" onClick={() => window.location.href = "/gongsil"} style={{ cursor: "pointer" }}>
        <span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a2e50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </span>관심매물
      </div>
      <div className="qm-item" onClick={() => window.location.href = "/news"} style={{ cursor: "pointer" }}>
        <span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a2e50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        </span>관심기사
      </div>
      <div
        className="qm-item"
        onClick={() => window.open("https://pf.kakao.com/_ckHkG/chat", "_blank")}
        style={{ cursor: "pointer" }}
      >
        <span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a2e50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </span>카카오문의
      </div>
      <div
        className="qm-item"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        style={{ cursor: "pointer" }}
      >
        <span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a2e50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15"/>
            <line x1="12" y1="9" x2="12" y2="21"/>
            <line x1="4" y1="3" x2="20" y2="3"/>
          </svg>
        </span>TOP
      </div>
    </div>
  );
}
