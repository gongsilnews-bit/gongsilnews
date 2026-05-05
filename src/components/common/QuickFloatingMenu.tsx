"use client";

import { useState, useEffect } from "react";
import AuthModal from "@/components/AuthModal";
import { createClient } from "@/utils/supabase/client";
import { getMySubscriptions } from "@/app/actions/subscription";
import { getMyEnrollments } from "@/app/actions/lecture";

export default function QuickFloatingMenu() {
  const [isOpen, setIsOpen] = useState(true);
  const [isSubOpen, setIsSubOpen] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [subscribedReporters, setSubscribedReporters] = useState<any[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<any[]>([]);
  const [isLecOpen, setIsLecOpen] = useState(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      if (user) {
        const res = await getMySubscriptions(user.id);
        if (res.success) setSubscribedReporters(res.reporters);
        
        const lecRes = await getMyEnrollments(user.id);
        if (lecRes.success) setMyEnrollments(lecRes.data || []);
      }
    };
    checkAuth();
  }, []);

  const handleAuthClick = (href: string) => {
    if (!isLoggedIn) {
      setIsAuthModalOpen(true);
      return;
    }
    if (href.startsWith("http")) {
      window.open(href, "_blank");
    } else {
      window.location.href = href;
    }
  };

  return (
    <>
    <div className="quick-menu" style={{ overflow: "visible", border: "none", boxShadow: "none", background: "transparent", width: 130 }}>
      {/* 빠른메뉴 헤더 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: "linear-gradient(135deg, #3b5998, #4a6fad)",
          color: "#fff",
          border: "none",
          borderRadius: isOpen ? "8px 8px 0 0" : "8px",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: "-0.3px",
          transition: "border-radius 0.2s",
        }}
      >
        빠른메뉴
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s ease" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* 메뉴 아이템 영역 */}
      <div style={{
        maxHeight: isOpen ? "300px" : "0",
        overflow: "hidden",
        transition: "max-height 0.3s ease",
        background: "#fff",
        border: isOpen ? "1px solid #e0e0e0" : "1px solid transparent",
        borderTop: "none",
        borderRadius: "0 0 8px 8px",
        boxShadow: isOpen ? "0 4px 15px rgba(0,0,0,0.1)" : "none",
      }}>
        {/* 관심공실광고 */}
        <div
          onClick={() => handleAuthClick("/gongsil")}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 14px", cursor: "pointer",
            borderBottom: "1px solid #f0f0f0",
            fontSize: 13, fontWeight: 600, color: "#333",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f6fa")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a6fad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          찜한공실
        </div>

        {/* 관심기사 */}
        <div
          onClick={() => handleAuthClick("/news_all?mode=bookmarks")}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 14px", cursor: "pointer",
            borderBottom: "1px solid #f0f0f0",
            fontSize: 13, fontWeight: 600, color: "#333",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f6fa")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a6fad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          관심기사
        </div>

        {/* 내 수강특강 */}
        <div
          onClick={() => handleAuthClick("/my_lectures")}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 14px", cursor: "pointer",
            borderBottom: "1px solid #f0f0f0",
            fontSize: 13, fontWeight: 600, color: "#333",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f6fa")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a6fad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
          </svg>
          내 수강특강
        </div>

        {/* 카카오톡 실시간상담 */}
        <div
          onClick={() => window.open("https://pf.kakao.com/_ckHkG/chat", "_blank")}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 14px", cursor: "pointer",
            borderBottom: "1px solid #f0f0f0",
            fontSize: 13, fontWeight: 600, color: "#333",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f6fa")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a6fad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M12 4.5C6.48 4.5 2 7.86 2 11.94c0 2.62 1.75 4.93 4.38 6.24l-1.12 4.16c-.1.36.3.65.6.44l4.94-3.26c.39.04.79.06 1.2.06 5.52 0 10-3.36 10-7.64C22 7.86 17.52 4.5 12 4.5z"/>
            <text x="12" y="14.3" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="6.5" fill="#4a6fad" stroke="none" textAnchor="middle">TALK</text>
          </svg>
          실시간상담
        </div>

        {/* 1:1 문의 */}
        <div
          onClick={() => handleAuthClick("/board?id=inquiry")}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 14px", cursor: "pointer",
            fontSize: 13, fontWeight: 600, color: "#333",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f6fa")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a6fad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          1:1문의
        </div>
      </div>

      {/* ── 구독기자 섹션 ── */}
      {isLoggedIn && subscribedReporters.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => setIsSubOpen(!isSubOpen)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              background: "#fff",
              color: "#333",
              border: "1px solid #e0e0e0",
              borderRadius: isSubOpen ? "8px 8px 0 0" : "8px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 800,
              transition: "border-radius 0.2s",
            }}
          >
            <span>
              구독기자 <span style={{ color: "#f97316", fontWeight: 800 }}>{subscribedReporters.length}</span>
            </span>
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: isSubOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s ease" }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <div style={{
            maxHeight: isSubOpen ? "300px" : "0",
            overflow: "hidden",
            transition: "max-height 0.3s ease",
            background: "#fff",
            border: isSubOpen ? "1px solid #e0e0e0" : "1px solid transparent",
            borderTop: "none",
            borderRadius: "0 0 8px 8px",
            boxShadow: isSubOpen ? "0 4px 15px rgba(0,0,0,0.08)" : "none",
          }}>
            {subscribedReporters.map((r: any) => (
              <div
                key={r.id}
                onClick={() => window.location.href = `/reporter/${r.id}`}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 14px", cursor: "pointer",
                  borderBottom: "1px solid #f5f5f5",
                  fontSize: 12, fontWeight: 600, color: "#444",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
              >
                {r.profile_image_url ? (
                  <img src={r.profile_image_url} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#888", flexShrink: 0 }}>
                    {(r.name || "?")[0]}
                  </div>
                )}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name || "기자"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TOP 버튼 — 항상 노출 */}
      <div
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        style={{
          marginTop: 8,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "10px 0", cursor: "pointer",
          background: "#fff", border: "1px solid #e0e0e0", borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          fontSize: 12, fontWeight: 700, color: "#555",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f6fa")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
        TOP
      </div>
    </div>
    {isAuthModalOpen && <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />}
    {toastMessage && (
      <div style={{ position: "fixed", top: "25%", left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.85)", color: "#fff", padding: "14px 32px", borderRadius: 10, fontSize: 16, fontWeight: "bold", zIndex: 999999, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", whiteSpace: "nowrap", animation: "toastFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
        {toastMessage}
      </div>
    )}
    <style>{`
      @keyframes toastFadeIn { 
        from { opacity: 0; transform: translate(-50%, 15px); } 
        to { opacity: 1; transform: translate(-50%, 0); } 
      }
    `}</style>
    </>
  );
}
