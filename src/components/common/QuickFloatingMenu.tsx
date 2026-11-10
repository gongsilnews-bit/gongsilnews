"use client";

import { useState, useEffect, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getMySubscriptions } from "@/app/actions/subscription";
import { getMyEnrollments } from "@/app/actions/lecture";
import WebCapture, { OPEN_WEB_CAPTURE } from "@/components/capture/WebCapture";

const itemStyle = (line: boolean): CSSProperties => ({
  display: "flex", alignItems: "center", gap: 10,
  padding: "12px 14px", cursor: "pointer",
  borderBottom: line ? "1px solid #f0f0f0" : "none",
  fontSize: 13, fontWeight: 600, color: "#333",
  transition: "background 0.15s",
});

/**
 * 오른쪽 빠른메뉴 (2026-11-10 사장님: 첫 화면만이 아니라 기사·뉴스 목록 등 공실뉴스 화면 맨 오른쪽에 늘)
 *  (main) 레이아웃에 하나 — 1200 본문 바로 오른쪽 · [화면캡쳐] 막대도 여기서 띄운다
 *  우리동네부동산 지도(/gongsil)에는 넣지 않는다 (2026-11-10 사장님) — 지도는 자기 [화면캡처] 버튼
 */
export default function QuickFloatingMenu() {
  const pathname = usePathname() || "";
  const [isOpen, setIsOpen] = useState(true);
  const [isSubOpen, setIsSubOpen] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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
      window.location.href = `/login?returnTo=${encodeURIComponent(href)}`;
      return;
    }
    if (href.startsWith("http")) {
      window.open(href, "_blank");
    } else {
      window.location.href = href;
    }
  };

  // 공실뉴스부동산 소개(/newsrealty)는 따로 꾸민 페이지라 빠른메뉴를 띄우지 않는다
  if (pathname.startsWith("/newsrealty")) return null;

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
          onClick={() => handleAuthClick("/gongsil?tab=wish")}
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

        {/* 2026-11-10 사장님: 찜한공실 · 관심기사 · 관심단지 · 1:1문의 · 화면캡쳐 · TOP (내 수강특강 · 실시간상담 · 고객센터는 뺌) */}
        {/* 관심단지 — 지도 찜 판의 단지 칸 */}
        <div
          onClick={() => handleAuthClick("/gongsil?tab=wish&star=apt")}
          style={itemStyle(true)}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f6fa")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a6fad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1"/>
          </svg>
          관심단지
        </div>

        {/* 1:1문의 — 고객센터에서 문의 창을 바로 연다 (비회원도 가능) */}
        <div
          onClick={() => { window.location.href = "/help?inquiry=1"; }}
          style={itemStyle(true)}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f6fa")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a6fad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          1:1문의
        </div>

        {/* 화면캡쳐 — 우리동네부동산과 같은 캡처·녹화·판서 막대를 연다 */}
        <div
          onClick={() => window.dispatchEvent(new Event(OPEN_WEB_CAPTURE))}
          style={itemStyle(false)}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f6fa")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a6fad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/><rect x="8" y="8" width="8" height="8" rx="1"/>
          </svg>
          화면캡쳐
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
    {/* 빠른메뉴 [화면캡쳐]로 여는 막대 — 따로 띄우는 버튼은 숨김 */}
    <WebCapture noLauncher />
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
