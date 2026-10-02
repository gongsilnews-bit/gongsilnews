"use client";

import React, { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import NotificationBell from "@/components/common/NotificationBell";
import { createClient } from "@/utils/supabase/client";
import { getEffectiveMemberRole, getAdminEntryLabel } from "@/utils/permissionCheck";

const POINT = "#059669";
const MINT = "#72e7c3";

/** 진한 초록 히어로(멤버십신청·나의 강의실·Q&A, 145deg 그라데이션)의 위쪽 가장자리 색을 그대로 옮긴 것 */
export const STUDY_HERO_BAR = "linear-gradient(90deg, #052427 0%, #072928 25%, #09302b 50%, #0b372e 75%, #0e4036 100%)";
/** 공실스터디 홈 히어로(사진 + 가운데가 밝은 그림자)의 위쪽 가장자리 색 */
export const STUDY_HOME_HERO_BAR = "linear-gradient(90deg, #071614 0%, #0c1f1b 25%, #102320 50%, #0b1d1a 75%, #061613 100%)";

interface SubNavItem {
  label: string;
  href: string;
  match?: (pathname: string, searchParams: URLSearchParams | null) => boolean;
}

interface NavItem {
  label: string;
  href: string;
  match: (pathname: string) => boolean;
  subItems?: SubNavItem[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "강의목록", href: "/study/lectures", match: (p: string) => p.startsWith("/study/lectures") || p.startsWith("/study_read") },
  {
    label: "멤버십혜택",
    href: "/study/benefits/vacancy-register",
    match: (p: string) => p.startsWith("/study/benefits"),
    subItems: [
      {
        label: "공실20건, 기사4건",
        href: "/study/benefits/vacancy-register",
        match: (p: string) => p.includes("vacancy-register") || p === "/study/benefits",
      },
      {
        label: "블로그포스팅자동화",
        href: "/study/benefits/blog-automation",
        match: (p: string) => p.includes("blog-automation"),
      },
      {
        label: "유튜브강의+드론저작권",
        href: "/study/benefits/ai-youtube",
        match: (p: string) => p.includes("ai-youtube"),
      },
    ],
  },
  {
    label: "멤버십신청",
    href: "/study/apply",
    match: (p: string) => p.startsWith("/study/apply") || p.startsWith("/study/pricing"),
    subItems: [
      {
        label: "멤버십신청",
        href: "/study/apply",
        match: (p: string) => p.startsWith("/study/apply"),
      },
      {
        label: "금액안내",
        href: "/study/pricing",
        match: (p: string) => p.startsWith("/study/pricing"),
      },
    ],
  },
  {
    label: "자료실",
    href: "/study/resources?board=drone",
    match: (p: string) =>
      p.startsWith("/study/resources") ||
      p.includes("board_id=doc") ||
      p.includes("board_id=drone") ||
      p.includes("board_id=prompt") ||
      p.includes("board_id=sound") ||
      p.includes("board_id=app"),
    subItems: [
      {
        label: "드론영상",
        href: "/study/resources?board=drone",
        match: (_p: string, sp: URLSearchParams | null) => {
          const b = sp?.get("board");
          return b === "drone" || (!b && _p.startsWith("/study/resources"));
        },
      },
      {
        label: "APP(앱)",
        href: "/study/resources?board=app",
        match: (_p: string, sp: URLSearchParams | null) => sp?.get("board") === "app",
      },
      {
        label: "AI 프롬프트",
        href: "/study/resources?board=prompt",
        match: (_p: string, sp: URLSearchParams | null) => sp?.get("board") === "prompt",
      },
      {
        label: "음원",
        href: "/study/resources?board=sound",
        match: (_p: string, sp: URLSearchParams | null) => sp?.get("board") === "sound",
      },
      {
        label: "계약서/양식",
        href: "/study/resources?board=doc",
        match: (_p: string, sp: URLSearchParams | null) => sp?.get("board") === "doc",
      },
    ],
  },
  {
    label: "커뮤니티",
    href: "/study/community",
    match: (p: string) =>
      p.startsWith("/study/community") ||
      p.startsWith("/study/qna") ||
      p.includes("board_id=studyqa") ||
      p.includes("board_id=free"),
    subItems: [
      {
        label: "스터디 Q&A",
        href: "/study/community?board=studyqa",
        match: (p: string, sp: URLSearchParams | null) => {
          if (p.startsWith("/study/qna")) return true;
          const b = sp?.get("board");
          return b === "studyqa" || (!b && p.startsWith("/study/community"));
        },
      },
      {
        label: "자유게시판",
        href: "/study/community?board=free",
        match: (_p: string, sp: URLSearchParams | null) => sp?.get("board") === "free",
      },
    ],
  },
];

/** 1차 메뉴 리스트 및 각 메뉴 바로 아래 가로로 펼쳐지는 2차 서브 메뉴 바 */
function StudyNavItems({
  pathname,
  dark,
  activeColor,
  idleColor,
  hoveredNav,
  setHoveredNav,
}: {
  pathname: string;
  dark: boolean;
  activeColor: string;
  idleColor: string;
  hoveredNav: string | null;
  setHoveredNav: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const searchParams = useSearchParams();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
      {NAV_ITEMS.map((item) => {
        const isActive = item.match(pathname);
        const isHovered = hoveredNav === item.label;

        // 2차 메뉴 노출 조건:
        // 1) 해당 1차 메뉴 페이지에 진입해 있고(isActive) 다른 메뉴를 호버하고 있지 않을 때 => 상시 가로 노출!
        // 2) 또는 해당 메뉴에 마우스를 올렸을 때(isHovered) => 가로 노출!
        const showSubBar = Boolean(
          item.subItems && (
            (isActive && (!hoveredNav || hoveredNav === item.label)) ||
            isHovered
          )
        );

        return (
          <div
            key={item.href}
            style={{ position: "relative" }}
            onMouseEnter={() => setHoveredNav(item.label)}
            onMouseLeave={() => setHoveredNav(null)}
          >
            <Link
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              style={{
                fontSize: "16px",
                fontWeight: isActive ? 800 : 500,
                color: isActive ? activeColor : idleColor,
                textDecoration: "none",
                whiteSpace: "nowrap",
                transition: "color 0.15s ease",
                display: "inline-block",
                padding: "6px 0",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = activeColor;
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = idleColor;
              }}
            >
              {item.label}
            </Link>

            {/* 🚀 대표님 승인안: 메뉴 바로 아래 오른쪽 옆으로 펼쳐지는 가로형 2차 서브메뉴 박스 (상시 노출) */}
            {showSubBar && item.subItems && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  zIndex: 9999999,
                  display: "inline-flex",
                  flexDirection: "row",
                  alignItems: "stretch",
                  // 1차 헤더가 흰색(!dark)일 때는 원래 1차 헤더의 짙은 배경 적용
                  background: dark ? "#ffffff" : "#04191c",
                  borderRadius: "6px",
                  border: dark ? "1px solid #d1d5db" : "1px solid rgba(255, 255, 255, 0.2)",
                  boxShadow: dark
                    ? "0 8px 24px rgba(0, 0, 0, 0.16), 0 2px 6px rgba(0, 0, 0, 0.06)"
                    : "0 8px 24px rgba(0, 0, 0, 0.35)",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                }}
              >
                {item.subItems.map((sub, idx) => {
                  const isSubActive = sub.match
                    ? sub.match(pathname, searchParams)
                    : pathname === sub.href;

                  // 1차 카테고리가 흰 바탕(!dark)일 때:
                  // - 선택된 버튼: 흰색 바탕에 포인트 초록 글씨
                  // - 나머지 비선택 버튼: 짙은(원래1차) 배경에 흰 글씨
                  // 1차 카테고리가 짙은 바탕(dark)일 때:
                  // - 선택된 버튼: 연초록 바탕에 포인트 초록 글씨
                  // - 나머지 비선택 버튼: 흰 바탕에 짙은 글씨
                  const btnBg = !dark
                    ? (isSubActive ? "#ffffff" : "#04191c")
                    : (isSubActive ? "#f0fdf4" : "#ffffff");

                  const btnColor = !dark
                    ? (isSubActive ? POINT : "#ffffff")
                    : (isSubActive ? POINT : "#1e293b");

                  const borderColor = !dark
                    ? "rgba(255, 255, 255, 0.18)"
                    : "#e5e7eb";

                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "9px 16px",
                        fontSize: "13.5px",
                        fontWeight: isSubActive ? 800 : 600,
                        color: btnColor,
                        backgroundColor: btnBg,
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                        borderRight: idx < item.subItems!.length - 1 ? `1px solid ${borderColor}` : "none",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSubActive) {
                          if (!dark) {
                            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                            e.currentTarget.style.color = "#ffffff";
                          } else {
                            e.currentTarget.style.backgroundColor = "#f8fafc";
                            e.currentTarget.style.color = POINT;
                          }
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSubActive) {
                          e.currentTarget.style.backgroundColor = btnBg;
                          e.currentTarget.style.color = btnColor;
                        }
                      }}
                    >
                      {sub.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function StudyHeader({ background }: { background?: string } = {}) {
  const pathname = usePathname() || "/study";
  const router = useRouter();
  const dark = !!background;
  const titleColor = dark ? "#ffffff" : "#111";
  const idleColor = dark ? "rgba(255,255,255,0.88)" : "#6b7280";
  const activeColor = dark ? MINT : POINT;
  const barBackground = dark ? "linear-gradient(90deg, #021315 0%, #04191c 50%, #021315 100%)" : "#ffffff";

  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  // 원래 자리(slot)가 화면 위에 닿으면 붙는다.
  const slotRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  const [slotHeight, setSlotHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const check = () => {
      const el = slotRef.current;
      if (!el) return;
      const isStuck = el.getBoundingClientRect().top <= 0 && window.scrollY > 0;
      if (isStuck) setSlotHeight((h) => h ?? el.offsetHeight);
      setStuck(isStuck);
    };
    const raf = window.requestAnimationFrame(check);
    window.addEventListener("scroll", check, { passive: true });
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", check);
    };
  }, []);

  // 붙었을 때 오른쪽에 메인 헤더와 같은 알림·검색·전체메뉴·관리자 버튼을 둔다
  const [member, setMember] = useState<{ role: string; planType: string; agencyStatus: string } | null>(null);
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const [{ data: m }, { data: agency }] = await Promise.all([
        supabase.from("members").select("role, plan_type").eq("id", user.id).single(),
        supabase.from("agencies").select("status").eq("owner_id", user.id).maybeSingle(),
      ]);
      setMember({
        role: getEffectiveMemberRole(m?.role, agency?.status),
        planType: (m as { plan_type?: string } | null)?.plan_type || "",
        agencyStatus: agency?.status || "",
      });
    });
  }, []);

  const goAdmin = () => {
    if (!member) return;
    if (member.role === "REALTOR" && member.agencyStatus === "REJECTED") window.open("/realty_admin?menu=settings&tab=agency", "_blank");
    else if (member.role === "ADMIN") router.push("/admin");
    else if (member.role === "REALTOR") router.push("/realty_admin");
    else router.push("/user_admin");
  };
  const iconColor = dark ? "#ffffff" : "#333";

  return (
    <div ref={slotRef} style={{ height: stuck ? slotHeight : undefined, background: barBackground }}>
      <div
        style={stuck
          ? { position: "fixed", top: 0, left: 0, width: "100%", zIndex: 9999990, background: barBackground, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", borderBottom: dark ? "none" : "1px solid #e5e7eb" }
          : { background: barBackground }}
      >
        <nav
          aria-label="공실스터디 메뉴"
          className="container px-20"
          style={{
            display: "flex", alignItems: stuck ? "center" : "flex-end", gap: stuck ? "32px" : "40px",
            padding: stuck ? "14px 20px" : dark ? "20px 20px 32px" : "20px 20px 14px",
          }}
        >
          <Link
            href="/study"
            style={{
              fontSize: stuck ? "22px" : "32px", fontWeight: 900, color: titleColor, letterSpacing: "-1px", lineHeight: 1,
              textDecoration: "none", marginLeft: "20px", whiteSpace: "nowrap",
            }}
            title="공실스터디 홈"
          >
            공실스터디
          </Link>

          <Suspense fallback={null}>
            <StudyNavItems
              pathname={pathname}
              dark={dark}
              activeColor={activeColor}
              idleColor={idleColor}
              hoveredNav={hoveredNav}
              setHoveredNav={setHoveredNav}
            />
          </Suspense>

          {/* 🚀 대표님 요청: [내 강의실] 버튼을 '커뮤니티' 뒤로 배치 */}
          <Link
            href="/study/classroom"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px 14px",
              borderRadius: "6px",
              fontSize: "13.5px",
              fontWeight: 800,
              color: "#ffffff",
              background: pathname.startsWith("/study/classroom")
                ? "linear-gradient(135deg, #059669 0%, #10b981 100%)"
                : "#059669",
              border: pathname.startsWith("/study/classroom")
                ? "1.5px solid #34d399"
                : "1px solid rgba(255, 255, 255, 0.25)",
              boxShadow: pathname.startsWith("/study/classroom")
                ? "0 3px 12px rgba(5, 150, 105, 0.45)"
                : "0 2px 6px rgba(5, 150, 105, 0.25)",
              textDecoration: "none",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
              cursor: "pointer",
              marginBottom: stuck ? 0 : "3px",
              marginLeft: stuck ? "-12px" : "-16px", // 메뉴들 간격(24px)과 자연스럽게 연결
              flexShrink: 0,
            }}
            title="나의 강의실로 이동"
          >
            내 강의실
          </Link>

          {/* 붙었을 때(stuck)만 우측 끝에 메인 헤더 기능 버튼들 노출 */}
          {stuck && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
              {member ? <NotificationBell color={iconColor} /> : (
                <Link href={"/login?returnTo=" + encodeURIComponent(pathname)} style={{ fontSize: "13px", fontWeight: 700, color: iconColor, textDecoration: "none" }}>로그인</Link>
              )}
              <button type="button" aria-label="검색" onClick={() => window.dispatchEvent(new Event("gongsil:open-search"))} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </button>
              <button type="button" aria-label="전체 메뉴" onClick={() => window.dispatchEvent(new Event("gongsil:open-megamenu"))} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26 }}><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
              </button>
              {member ? (
                <button type="button" onClick={goAdmin} style={{ background: member.role === "ADMIN" ? "#111827" : "#ef4444", color: "#fff", border: dark && member.role === "ADMIN" ? "1px solid rgba(255,255,255,0.3)" : "none", borderRadius: "4px", padding: "6px 14px", fontSize: "12px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {getAdminEntryLabel({ role: member.role, plan_type: member.planType }, member.agencyStatus)}
                </button>
              ) : (
                <button type="button" onClick={() => router.push("/login?returnTo=" + encodeURIComponent("/realty_admin?menu=gongsil&action=write"))} style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: "4px", padding: "6px 14px", fontSize: "12px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                  공실등록 &gt;&gt;
                </button>
              )}
            </div>
          )}
        </nav>
      </div>
    </div>
  );
}
