"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import NotificationBell from "@/components/common/NotificationBell";
import { createClient } from "@/utils/supabase/client";
import { getEffectiveMemberRole, getAdminEntryLabel } from "@/utils/permissionCheck";

// 공실뉴스부동산 메뉴 줄. 공실스터디(StudyHeader)와 같은 방식으로 메인 헤더 아래에 붙고,
// 스크롤해서 화면 위에 닿으면 이 줄이 고정된다.

const POINT = "#d9661f";

interface SubNavItem {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  href: string;
  match: (pathname: string) => boolean;
  subItems?: SubNavItem[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "공실뉴스부동산이란?", href: "/newsrealty", match: (p) => p === "/newsrealty" },
  {
    label: "혜택",
    href: "/newsrealty/benefits/brokerage-article",
    match: (p) => p.startsWith("/newsrealty/benefits"),
    subItems: [
      { label: "공동중개 20건 & 언론기사 4건", href: "/newsrealty/benefits/brokerage-article" },
      { label: "부동산유튜브 무료 강의", href: "/newsrealty/benefits/youtube-lecture" },
      { label: "뉴스 광고 영업 수익", href: "/newsrealty/benefits/ad-revenue" },
    ],
  },
  { label: "금액안내", href: "/newsrealty/pricing", match: (p) => p.startsWith("/newsrealty/pricing") },
  { label: "신청하기", href: "/newsrealty/apply", match: (p) => p.startsWith("/newsrealty/apply") },
];

interface NewsrealtyHeaderProps {
  // 예전 헤더의 이용안내 팝업용. 지금 메뉴는 이용안내 페이지로 바로 가므로 쓰지 않는다.
  onOpenGuide?: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function NewsrealtyHeader(_props: NewsrealtyHeaderProps = {}) {
  const pathname = usePathname() || "/newsrealty";
  const router = useRouter();
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

  return (
    <div ref={slotRef} style={{ height: stuck ? slotHeight : undefined, background: "#ffffff" }}>
      <div
        style={stuck
          ? { position: "fixed", top: 0, left: 0, width: "100%", zIndex: 9999990, background: "#ffffff", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", borderBottom: "1px solid #e5e7eb" }
          : { background: "#ffffff" }}
      >
        <nav
          aria-label="공실뉴스부동산 메뉴"
          className="container px-20"
          style={{
            display: "flex", alignItems: stuck ? "center" : "flex-end", gap: stuck ? "32px" : "40px",
            padding: stuck ? "14px 20px" : "20px 20px 14px",
          }}
        >
          <Link
            href="/newsrealty"
            style={{
              fontSize: stuck ? "22px" : "32px", fontWeight: 900, color: "#111", letterSpacing: "-1px", lineHeight: 1,
              textDecoration: "none", whiteSpace: "nowrap",
            }}
            title="공실뉴스부동산 홈"
          >
            공실뉴스부동산
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
            {NAV_ITEMS.map((item) => {
              const isActive = item.match(pathname);
              const showSubBar = Boolean(item.subItems && hoveredNav === item.label);
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
                    onClick={() => setHoveredNav(null)}
                    style={{
                      fontSize: "16px",
                      fontWeight: isActive ? 800 : 500,
                      color: isActive ? POINT : "#6b7280",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                      transition: "color 0.15s ease",
                      display: "inline-block",
                      padding: "6px 0",
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = POINT; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "#6b7280"; }}
                  >
                    {item.label}
                  </Link>

                  {showSubBar && item.subItems && (
                    <div
                      style={{
                        position: "absolute", top: "100%", left: 0, zIndex: 9999999,
                        display: "inline-flex", flexDirection: "row", alignItems: "stretch",
                        background: "#ffffff", borderRadius: "6px", border: "1px solid #d1d5db",
                        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.16), 0 2px 6px rgba(0, 0, 0, 0.06)",
                        overflow: "hidden", whiteSpace: "nowrap",
                      }}
                    >
                      {item.subItems.map((sub, idx) => {
                        const isSubActive = pathname === sub.href || pathname.startsWith(sub.href + "/");
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => setHoveredNav(null)}
                            style={{
                              display: "inline-flex", alignItems: "center", padding: "9px 16px",
                              fontSize: "13.5px", fontWeight: isSubActive ? 800 : 600,
                              color: isSubActive ? POINT : "#1e293b",
                              backgroundColor: isSubActive ? "#fff7ed" : "#ffffff",
                              textDecoration: "none", whiteSpace: "nowrap",
                              borderRight: idx < item.subItems!.length - 1 ? "1px solid #e5e7eb" : "none",
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSubActive) {
                                e.currentTarget.style.backgroundColor = "#f8fafc";
                                e.currentTarget.style.color = POINT;
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSubActive) {
                                e.currentTarget.style.backgroundColor = "#ffffff";
                                e.currentTarget.style.color = "#1e293b";
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

          {/* 붙었을 때(stuck)만 우측 끝에 메인 헤더 기능 버튼들 노출 */}
          {stuck && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
              {member ? <NotificationBell color="#333" /> : (
                <Link href={"/login?returnTo=" + encodeURIComponent(pathname)} style={{ fontSize: "13px", fontWeight: 700, color: "#333", textDecoration: "none" }}>로그인</Link>
              )}
              <button type="button" aria-label="검색" onClick={() => window.dispatchEvent(new Event("gongsil:open-search"))} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </button>
              <button type="button" aria-label="전체 메뉴" onClick={() => window.dispatchEvent(new Event("gongsil:open-megamenu"))} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26 }}><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
              </button>
              {member ? (
                <button type="button" onClick={goAdmin} style={{ background: member.role === "ADMIN" ? "#111827" : "#ef4444", color: "#fff", border: "none", borderRadius: "4px", padding: "6px 14px", fontSize: "12px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
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
