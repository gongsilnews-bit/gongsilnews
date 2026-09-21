"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getEffectiveMemberRole } from "@/utils/permissionCheck";

/**
 * 공실스터디 전용 상단 헤더 (공실뉴스부동산 헤더와 동일 포맷 / 포인트 컬러만 에메랄드)
 * 2차 카테고리 4종: 공실스터디란? · 강의목록 · 나의 강의실 · Q&A게시판
 */
const POINT = "#059669";

const NAV = [
  { label: "홈", href: "/study", match: (p: string) => p === "/study" },
  { label: "공실스터디란?", href: "/study/about", match: (p: string) => p.startsWith("/study/about") },
  { label: "강의목록", href: "/study/lectures", match: (p: string) => p.startsWith("/study/lectures") || p.startsWith("/study_read") },
  { label: "나의 강의실", href: "/study/classroom", match: (p: string) => p.startsWith("/study/classroom") },
  { label: "Q&A게시판", href: "/study/qna", match: (p: string) => p.startsWith("/study/qna") },
];

export default function StudyHeader() {
  const pathname = usePathname() || "/study";
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [agencyStatus, setAgencyStatus] = useState<string>("");

  useEffect(() => {
    const supabase = createClient();

    // 메인 헤더와 같은 규칙으로 등급을 판정한다 (members.role + agencies.status)
    const loadRole = async (u: { id: string } | null) => {
      if (!u) {
        setUserRole("");
        setAgencyStatus("");
        return;
      }
      const { data: member } = await supabase.from("members").select("role").eq("id", u.id).single();
      const { data: agency } = await supabase.from("agencies").select("status").eq("owner_id", u.id).single();
      setAgencyStatus(agency?.status || "");
      setUserRole(getEffectiveMemberRole(member?.role, agency?.status));
    };

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      void loadRole(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      void loadRole(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  };

  return (
    <header
      style={{
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #eaedf0",
        height: "60px",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
      }}
    >
      <div
        style={{
          maxWidth: "1080px",
          margin: "0 auto",
          height: "100%",
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        {/* ━━━ 좌측 로고 영역 ━━━ */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <Link
            href="/"
            style={{
              fontSize: "18px",
              fontWeight: 800,
              color: "#111827",
              textDecoration: "none",
              letterSpacing: "-0.5px",
              display: "inline-flex",
              alignItems: "center",
            }}
            title="공실뉴스 메인 포털 홈으로"
          >
            공실뉴스
          </Link>
          <span style={{ fontSize: "15px", color: "#cbd5e1", fontWeight: 300, margin: "0 4px", userSelect: "none" }}>
            |
          </span>
          <Link
            href="/study"
            style={{
              fontSize: "18px",
              fontWeight: 800,
              color: POINT,
              textDecoration: "none",
              letterSpacing: "-0.5px",
              display: "inline-flex",
              alignItems: "center",
            }}
            title="공실스터디 홈으로"
          >
            공실스터디
          </Link>
        </div>

        {/* ━━━ 우측 내비게이션 (홈 / 공실스터디란? / 강의목록 / 나의 강의실 / Q&A게시판) ━━━ */}
        <nav style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "nowrap" }}>
          {NAV.map((item) => {
            const isActive = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  fontSize: "14px",
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? POINT : "#475569",
                  textDecoration: "none",
                  transition: "color 0.15s ease",
                  position: "relative",
                  padding: "6px 0",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = POINT;
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = "#475569";
                }}
              >
                {item.label}
                {isActive && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: "2px",
                      backgroundColor: POINT,
                      borderRadius: "2px",
                    }}
                  />
                )}
              </Link>
            );
          })}

          {/* 회원 등급 버튼 / 로그인 */}
          <div style={{ marginLeft: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (userRole === "REALTOR" && agencyStatus === "REJECTED") window.open("/realty_admin?menu=settings&tab=agency", "_blank");
                    else if (userRole === "ADMIN") router.push("/admin");
                    else if (userRole === "REALTOR") router.push("/realty_admin");
                    else router.push("/user_admin");
                  }}
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#ffffff",
                    background: userRole === "ADMIN" ? "#111827" : "#ef4444",
                    border: "none",
                    borderRadius: "4px",
                    padding: "6px 12px",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = userRole === "ADMIN" ? "#1f2937" : "#dc2626")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = userRole === "ADMIN" ? "#111827" : "#ef4444")}
                  title="내 관리자 페이지로 이동"
                >
                  {userRole === "ADMIN" ? "최고관리자 >>" : (userRole === "REALTOR" && agencyStatus === "REJECTED") ? "서류보완 >>" : userRole === "REALTOR" ? "부동산회원 >>" : "일반회원 >>"}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#64748b",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px 6px",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
                >
                  로그아웃
                </button>
              </>
            ) : (
              <Link
                href={"/login?returnTo=" + encodeURIComponent(pathname)}
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#111827",
                  border: "1px solid #111827",
                  borderRadius: "4px",
                  padding: "5px 12px",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = POINT;
                  e.currentTarget.style.borderColor = POINT;
                  e.currentTarget.style.color = "#ffffff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.borderColor = "#111827";
                  e.currentTarget.style.color = "#111827";
                }}
              >
                로그인/회원가입
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
