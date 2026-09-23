"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getEffectiveMemberRole } from "@/utils/permissionCheck";
import { getAdminEntryLabel } from "@/utils/permissionCheck";

interface NewsrealtyHeaderProps {
  onOpenGuide?: () => void;
}

export default function NewsrealtyHeader({ onOpenGuide }: NewsrealtyHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [internalGuideOpen, setInternalGuideOpen] = useState(false);
  const [internalContactOpen, setInternalContactOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [guideDropdownOpen, setGuideDropdownOpen] = useState(false);
  const guideDropdownTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [planType, setPlanType] = useState<string>("");
  const [agencyStatus, setAgencyStatus] = useState<string>("");

  const handleMouseEnterDropdown = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    setDropdownOpen(true);
  };

  const handleMouseLeaveDropdown = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setDropdownOpen(false);
    }, 150);
  };

  const handleMouseEnterGuideDropdown = () => {
    if (guideDropdownTimeoutRef.current) {
      clearTimeout(guideDropdownTimeoutRef.current);
      guideDropdownTimeoutRef.current = null;
    }
    setGuideDropdownOpen(true);
  };

  const handleMouseLeaveGuideDropdown = () => {
    guideDropdownTimeoutRef.current = setTimeout(() => {
      setGuideDropdownOpen(false);
    }, 150);
  };

  useEffect(() => {
    const supabase = createClient();

    // 메인 헤더와 같은 규칙으로 등급을 판정한다 (members.role + agencies.status)
    const loadRole = async (u: { id: string } | null) => {
      if (!u) {
        setUserRole("");
        setAgencyStatus("");
        return;
      }
      const { data: member } = await supabase.from("members").select("role, plan_type").eq("id", u.id).single();
      const { data: agency } = await supabase.from("agencies").select("status").eq("owner_id", u.id).single();
      setAgencyStatus(agency?.status || "");
      setUserRole(getEffectiveMemberRole(member?.role, agency?.status));
      setPlanType((member as any)?.plan_type || "");
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

  const handleGuideClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenGuide) {
      onOpenGuide();
    } else {
      setInternalGuideOpen(true);
    }
  };

  const handleProductsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (pathname === "/newsrealty") {
      const el = document.getElementById("products");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    router.push("/newsrealty#products");
  };

  const handlePricingClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (pathname === "/newsrealty") {
      const el = document.getElementById("pricing");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    router.push("/newsrealty#pricing");
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  };

  const isHomeActive = pathname === "/newsrealty";
  const isApplyActive = pathname === "/newsrealty/apply";
  const isBenefitsActive = pathname.startsWith("/newsrealty/benefits");
  const isPricingActive = pathname === "/newsrealty/pricing";
  const isGuideActive = pathname.startsWith("/newsrealty/guide");

  return (
    <>
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
            <span
              style={{
                fontSize: "15px",
                color: "#cbd5e1",
                fontWeight: 300,
                margin: "0 4px",
                userSelect: "none",
              }}
            >
              |
            </span>
            <Link
              href="/newsrealty"
              style={{
                fontSize: "18px",
                fontWeight: 800,
                color: "#ff8e15",
                textDecoration: "none",
                letterSpacing: "-0.5px",
                display: "inline-flex",
                alignItems: "center",
              }}
              title="공실뉴스부동산 홈으로"
            >
              공실뉴스부동산
            </Link>
          </div>

          {/* ━━━ 우측 내비게이션 메뉴 (홈 / 무엇이 좋을까? / 금액안내 / 신청하기 / 1:1 문의 / 로그인·회원가입) ━━━ */}
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              flexWrap: "nowrap",
            }}
          >
            {/* 1. 홈 */}
            <Link
              href="/newsrealty"
              style={{
                fontSize: "14px",
                fontWeight: isHomeActive ? 800 : 600,
                color: isHomeActive ? "#ff8e15" : "#475569",
                textDecoration: "none",
                transition: "color 0.15s ease",
                position: "relative",
                padding: "6px 0",
                whiteSpace: "nowrap",
              }}
            >
              홈
              {isHomeActive && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "2px",
                    backgroundColor: "#ff8e15",
                    borderRadius: "2px",
                  }}
                />
              )}
            </Link>

            {/* 2. 무엇이 좋을까? (드롭다운 메뉴) */}
            <div
              style={{ position: "relative" }}
              onMouseEnter={handleMouseEnterDropdown}
              onMouseLeave={handleMouseLeaveDropdown}
            >
              <Link
                href="/newsrealty/benefits/brokerage-article"
                style={{
                  fontSize: "14px",
                  fontWeight: isBenefitsActive ? 800 : 600,
                  color: isBenefitsActive ? "#ff8e15" : dropdownOpen ? "#ff8e15" : "#475569",
                  textDecoration: "none",
                  transition: "color 0.15s ease",
                  padding: "6px 0",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  position: "relative",
                }}
              >
                <span>무엇이 좋을까?</span>
                <span
                  style={{
                    fontSize: "10px",
                    display: "inline-block",
                    transition: "transform 0.2s ease",
                    transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                    opacity: 0.7,
                  }}
                >
                  ▾
                </span>
                {isBenefitsActive && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: "2px",
                      backgroundColor: "#ff8e15",
                      borderRadius: "2px",
                    }}
                  />
                )}
              </Link>

              {/* 직방 동일 스타일: 다크 차콜/블랙 드롭다운 메뉴 + 상단 꼬리표 */}
              {dropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 100,
                    paddingTop: "6px",
                  }}
                >
                  {/* 상단 삼각형 꼬리표 (Arrow) */}
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: "6px solid transparent",
                      borderRight: "6px solid transparent",
                      borderBottom: "6px solid #22242a",
                      margin: "0 auto",
                    }}
                  />

                  {/* 차콜 다크 박스 */}
                  <div
                    style={{
                      backgroundColor: "#22242a",
                      borderRadius: "4px",
                      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.35)",
                      padding: "8px 0",
                      minWidth: "220px",
                    }}
                  >
                    <Link
                      href="/newsrealty/benefits/brokerage-article"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display: "block",
                        padding: "10px 20px",
                        color: "#ffffff",
                        fontSize: "13px",
                        fontWeight: 500,
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                        letterSpacing: "-0.2px",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#2e323b";
                        e.currentTarget.style.color = "#ff8e15";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "#ffffff";
                      }}
                    >
                      공동중개 20건 & 언론기사 4건
                    </Link>

                    <Link
                      href="/newsrealty/benefits/youtube-lecture"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display: "block",
                        padding: "10px 20px",
                        color: "#ffffff",
                        fontSize: "13px",
                        fontWeight: 500,
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                        letterSpacing: "-0.2px",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#2e323b";
                        e.currentTarget.style.color = "#ff8e15";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "#ffffff";
                      }}
                    >
                      부동산유튜브 무료 강의
                    </Link>

                    <Link
                      href="/newsrealty/benefits/ad-revenue"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display: "block",
                        padding: "10px 20px",
                        color: "#ffffff",
                        fontSize: "13px",
                        fontWeight: 500,
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                        letterSpacing: "-0.2px",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#2e323b";
                        e.currentTarget.style.color = "#ff8e15";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "#ffffff";
                      }}
                    >
                      뉴스 광고 영업 수익
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 3. 금액안내 (독립 페이지) */}
            <Link
              href="/newsrealty/pricing"
              style={{
                fontSize: "14px",
                fontWeight: isPricingActive ? 800 : 600,
                color: isPricingActive ? "#ff8e15" : "#475569",
                textDecoration: "none",
                transition: "color 0.15s ease",
                padding: "6px 0",
                cursor: "pointer",
                whiteSpace: "nowrap",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (!isPricingActive) e.currentTarget.style.color = "#ff8e15";
              }}
              onMouseLeave={(e) => {
                if (!isPricingActive) e.currentTarget.style.color = "#475569";
              }}
            >
              금액안내
              {isPricingActive && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "2px",
                    backgroundColor: "#ff8e15",
                    borderRadius: "2px",
                  }}
                />
              )}
            </Link>

            {/* 4. 신청하기 */}
            <Link
              href="/newsrealty/apply"
              style={{
                fontSize: "14px",
                fontWeight: isApplyActive ? 800 : 600,
                color: isApplyActive ? "#ff8e15" : "#475569",
                textDecoration: "none",
                transition: "color 0.15s ease",
                position: "relative",
                padding: "6px 0",
                whiteSpace: "nowrap",
              }}
            >
              신청하기
              {isApplyActive && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "2px",
                    backgroundColor: "#ff8e15",
                    borderRadius: "2px",
                  }}
                />
              )}
            </Link>

            {/* 5. 이용안내 (직방 스타일 다크 차콜 드롭다운) */}
            <div
              style={{ position: "relative" }}
              onMouseEnter={handleMouseEnterGuideDropdown}
              onMouseLeave={handleMouseLeaveGuideDropdown}
            >
              <Link
                href="/newsrealty/guide/notice"
                style={{
                  fontSize: "14px",
                  fontWeight: isGuideActive ? 800 : 600,
                  color: isGuideActive ? "#ff8e15" : guideDropdownOpen ? "#ff8e15" : "#475569",
                  textDecoration: "none",
                  transition: "color 0.15s ease",
                  padding: "6px 0",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  position: "relative",
                }}
              >
                <span>이용안내</span>
                <span
                  style={{
                    fontSize: "10px",
                    display: "inline-block",
                    transition: "transform 0.2s ease",
                    transform: guideDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                    opacity: 0.7,
                  }}
                >
                  ▾
                </span>
                {isGuideActive && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: "2px",
                      backgroundColor: "#ff8e15",
                      borderRadius: "2px",
                    }}
                  />
                )}
              </Link>

              {/* 직방 호갱노노 CEO 1:1 동일: 다크 차콜/블랙 드롭다운 메뉴 + 상단 꼬리표 */}
              {guideDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 100,
                    paddingTop: "6px",
                  }}
                >
                  {/* 상단 삼각형 꼬리표 (Arrow) */}
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: "6px solid transparent",
                      borderRight: "6px solid transparent",
                      borderBottom: "6px solid #22242a",
                      margin: "0 auto",
                    }}
                  />

                  {/* 차콜 다크 박스 */}
                  <div
                    style={{
                      backgroundColor: "#22242a",
                      borderRadius: "4px",
                      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.35)",
                      padding: "8px 0",
                      minWidth: "150px",
                    }}
                  >
                    <Link
                      href="/newsrealty/guide/notice"
                      onClick={() => setGuideDropdownOpen(false)}
                      style={{
                        display: "block",
                        padding: "9px 20px",
                        color: pathname === "/newsrealty/guide/notice" ? "#ff8e15" : "#ffffff",
                        fontSize: "13px",
                        fontWeight: 500,
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                        letterSpacing: "-0.2px",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#2e323b";
                        e.currentTarget.style.color = "#ff8e15";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = pathname === "/newsrealty/guide/notice" ? "#ff8e15" : "#ffffff";
                      }}
                    >
                      공지사항
                    </Link>

                    <Link
                      href="/newsrealty/guide/manual"
                      onClick={() => setGuideDropdownOpen(false)}
                      style={{
                        display: "block",
                        padding: "9px 20px",
                        color: pathname === "/newsrealty/guide/manual" ? "#ff8e15" : "#ffffff",
                        fontSize: "13px",
                        fontWeight: 500,
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                        letterSpacing: "-0.2px",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#2e323b";
                        e.currentTarget.style.color = "#ff8e15";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = pathname === "/newsrealty/guide/manual" ? "#ff8e15" : "#ffffff";
                      }}
                    >
                      이용가이드
                    </Link>

                    <Link
                      href="/newsrealty/guide/inquiry"
                      onClick={() => setGuideDropdownOpen(false)}
                      style={{
                        display: "block",
                        padding: "9px 20px",
                        color: pathname === "/newsrealty/guide/inquiry" ? "#ff8e15" : "#ffffff",
                        fontSize: "13px",
                        fontWeight: 500,
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                        letterSpacing: "-0.2px",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#2e323b";
                        e.currentTarget.style.color = "#ff8e15";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = pathname === "/newsrealty/guide/inquiry" ? "#ff8e15" : "#ffffff";
                      }}
                    >
                      1:1문의
                    </Link>

                    <Link
                      href="/newsrealty/guide/chat"
                      onClick={() => setGuideDropdownOpen(false)}
                      style={{
                        display: "block",
                        padding: "9px 20px",
                        color: pathname === "/newsrealty/guide/chat" ? "#ff8e15" : "#ffffff",
                        fontSize: "13px",
                        fontWeight: 500,
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                        letterSpacing: "-0.2px",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#2e323b";
                        e.currentTarget.style.color = "#ff8e15";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = pathname === "/newsrealty/guide/chat" ? "#ff8e15" : "#ffffff";
                      }}
                    >
                      실시간상담
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 6. 로그인/회원가입 박스 버튼 (직방 CEO 스타일) */}
            <div style={{ marginLeft: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
              {user ? (
                <>
                  {/* 메인 헤더와 동일한 등급 버튼 (관리자 검정, 그 외 빨강) */}
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
                    {getAdminEntryLabel({ role: userRole, plan_type: planType }, agencyStatus)}
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
                  href={`/login?returnTo=${encodeURIComponent(pathname || "/newsrealty")}`}
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
                    e.currentTarget.style.backgroundColor = "#ff8e15";
                    e.currentTarget.style.borderColor = "#ff8e15";
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

      {/* ━━━ 1:1 문의 안내 모달 ━━━ */}
      {internalContactOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setInternalContactOpen(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "500px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
              padding: "36px 32px 32px 32px",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={() => setInternalContactOpen(false)}
              style={{
                position: "absolute",
                top: "22px",
                right: "22px",
                background: "none",
                border: "none",
                fontSize: "24px",
                color: "#94a3b8",
                cursor: "pointer",
                padding: "4px",
                lineHeight: 1,
              }}
            >
              ✕
            </button>

            {/* 타이틀 */}
            <div style={{ marginBottom: "22px" }}>
              <div
                style={{
                  display: "inline-block",
                  background: "#fff5eb",
                  color: "#ff8e15",
                  fontSize: "12px",
                  fontWeight: 800,
                  padding: "4px 12px",
                  borderRadius: "14px",
                  marginBottom: "10px",
                }}
              >
                고객지원 & 입점상담
              </div>
              <h3 style={{ fontSize: "22px", fontWeight: 900, color: "#1e293b", margin: "0 0 8px 0", letterSpacing: "-0.5px" }}>
                1:1 맞춤 상담 및 문의
              </h3>
              <p style={{ fontSize: "14px", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                공실뉴스부동산 입점, 로컬기자 활동 및 시스템 이용에 관해 친절히 안내해 드립니다.
              </p>
            </div>

            {/* 안내 카드 리스트 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "24px" }}>
              {/* 전화 문의 */}
              <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px 20px" }}>
                <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px", fontWeight: 600 }}>대표 유선 상담 전화</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <a href="tel:1555-5343" style={{ fontSize: "20px", fontWeight: 900, color: "#ff8e15", textDecoration: "none" }}>
                    1555-5343
                  </a>
                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>평일 10:00 ~ 18:00</span>
                </div>
              </div>

              {/* 1:1 온라인 게시판 */}
              <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px 20px" }}>
                <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px", fontWeight: 600 }}>1:1 온라인 문의 게시판</div>
                <p style={{ fontSize: "13.5px", color: "#334155", margin: "0 0 12px 0", lineHeight: 1.5 }}>
                  24시간 접수 가능하며, 전담 매니저가 영업시간 내에 신속하게 답변을 드립니다.
                </p>
                <Link
                  href="/board"
                  onClick={() => setInternalContactOpen(false)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    height: "44px",
                    backgroundColor: "#ff8e15",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 800,
                    borderRadius: "8px",
                    textDecoration: "none",
                    boxShadow: "0 2px 8px rgba(255, 142, 21, 0.25)",
                  }}
                >
                  1:1 문의 게시판 바로가기 ➔
                </Link>
              </div>

              {/* 이메일 문의 */}
              <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>공식 제휴 및 이메일</span>
                  <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#1e293b" }}>gongsilnews@naver.com</span>
                </div>
              </div>
            </div>

            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={() => setInternalContactOpen(false)}
              style={{
                width: "100%",
                height: "48px",
                backgroundColor: "#f1f5f9",
                color: "#475569",
                fontSize: "14.5px",
                fontWeight: 700,
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* ━━━ 기본 이용안내 가이드 모달 (onOpenGuide 없을 때 자체 팝업) ━━━ */}
      {internalGuideOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setInternalGuideOpen(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "580px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
              padding: "36px 32px 32px 32px",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={() => setInternalGuideOpen(false)}
              style={{
                position: "absolute",
                top: "22px",
                right: "22px",
                background: "none",
                border: "none",
                fontSize: "24px",
                color: "#94a3b8",
                cursor: "pointer",
                padding: "4px",
                lineHeight: 1,
              }}
            >
              ✕
            </button>

            {/* 타이틀 */}
            <div style={{ marginBottom: "24px" }}>
              <div
                style={{
                  display: "inline-block",
                  background: "#fff2e8",
                  color: "#ea580c",
                  fontSize: "12.5px",
                  fontWeight: 800,
                  padding: "4px 12px",
                  borderRadius: "14px",
                  marginBottom: "10px",
                }}
              >
                공실뉴스부동산 입점 안내
              </div>
              <h3 style={{ fontSize: "24px", fontWeight: 900, color: "#1e293b", margin: "0 0 8px 0", letterSpacing: "-0.5px" }}>
                회원가입 및 이용 절차 안내
              </h3>
              <p style={{ fontSize: "15px", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                공실뉴스부동산 파트너 입점은 아래 4단계를 거쳐 신속하게 진행됩니다.
              </p>
            </div>

            {/* 4단계 스텝 리스트 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* 1단계 */}
              <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <span style={{ backgroundColor: "#ff8e15", color: "#ffffff", fontSize: "13px", fontWeight: 800, padding: "3px 10px", borderRadius: "6px" }}>1단계</span>
                  <span style={{ fontSize: "17.5px", fontWeight: 800, color: "#1e293b" }}>회원가입 및 중개업소 등록</span>
                </div>
                <div style={{ fontSize: "15px", color: "#475569", lineHeight: 1.65, paddingLeft: "4px" }}>
                  <p style={{ margin: "0 0 4px 0" }}>• 공실뉴스 포털에서 기본 <strong>부동산 회원가입</strong>을 진행합니다.</p>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>• 대표 공인중개사 정보 및 소속 중개업소 기본 정보를 등록합니다.</p>
                </div>
              </div>

              {/* 2단계 */}
              <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <span style={{ backgroundColor: "#ff8e15", color: "#ffffff", fontSize: "13px", fontWeight: 800, padding: "3px 10px", borderRadius: "6px" }}>2단계</span>
                  <span style={{ fontSize: "17.5px", fontWeight: 800, color: "#1e293b" }}>신청하기</span>
                </div>
                <div style={{ fontSize: "15px", color: "#475569", lineHeight: 1.65, paddingLeft: "4px" }}>
                  <p style={{ margin: "0 0 4px 0" }}>• <strong>로그인 상태</strong>에서 공실뉴스부동산 파트너 입점 신청서를 제출합니다.</p>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>• 신청자 성함, 연락처, 사무소 명칭을 확인하고 약관 동의 후 원클릭 접수</p>
                </div>
              </div>

              {/* 3단계 */}
              <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <span style={{ backgroundColor: "#ff8e15", color: "#ffffff", fontSize: "13px", fontWeight: 800, padding: "3px 10px", borderRadius: "6px" }}>3단계</span>
                  <span style={{ fontSize: "17.5px", fontWeight: 800, color: "#1e293b" }}>1~2일 내 담당자 확인 및 승인</span>
                </div>
                <div style={{ fontSize: "15px", color: "#475569", lineHeight: 1.65, paddingLeft: "4px" }}>
                  <p style={{ margin: "0 0 4px 0" }}>• 담당 매니저가 관할 지역 중개사무소 정보 확인 및 유선 확인을 진행합니다.</p>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>• 입점 승인이 완료되면 즉시 알림 문자(SMS) 및 권한이 자동 부여됩니다.</p>
                </div>
              </div>

              {/* 4단계 */}
              <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <span style={{ backgroundColor: "#ff8e15", color: "#ffffff", fontSize: "13px", fontWeight: 800, padding: "3px 10px", borderRadius: "6px" }}>4단계</span>
                  <span style={{ fontSize: "17.5px", fontWeight: 800, color: "#1e293b" }}>로컬기자 활동 및 마케팅 시작</span>
                </div>
                <div style={{ fontSize: "15px", color: "#475569", lineHeight: 1.65, paddingLeft: "4px" }}>
                  <p style={{ margin: "0 0 4px 0" }}>• <strong>매월 공실 매물 20건</strong> 등록 및 <strong>뉴스 보도기사 4건</strong> 발행 시작</p>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>• AI 원클릭 블로그/유튜브 쇼츠 제작기 활용 및 관할 지역 로컬기자 혜택을 누리세요.</p>
                </div>
              </div>
            </div>

            {/* 하단 닫기 버튼 */}
            <div style={{ marginTop: "24px", textAlign: "center" }}>
              <button
                type="button"
                onClick={() => setInternalGuideOpen(false)}
                style={{
                  width: "100%",
                  padding: "14px 0",
                  backgroundColor: "#ff8e15",
                  color: "#ffffff",
                  fontSize: "16px",
                  fontWeight: 800,
                  border: "none",
                  borderRadius: "12px",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(255, 142, 21, 0.25)",
                }}
              >
                확인했습니다
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
