"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import NotificationBell from "@/components/common/NotificationBell";
import { createClient } from "@/utils/supabase/client";
import { getEffectiveMemberRole, getAdminEntryLabel } from "@/utils/permissionCheck";

/**
 * 공실스터디 2차 메뉴 줄.
 * 공실스터디 페이지도 공실뉴스 메인 헤더를 그대로 쓰고, 그 아래에 공실뉴스 섹션 페이지
 * (예: /news_gongsil 의 "공실뉴스  전체 · 아파트/오피스텔 …")와 같은 모양으로
 * 왼쪽 "공실스터디" 제목 + 오른쪽 탭을 둔다. 포인트 색만 공실스터디 에메랄드.
 * 로그인·관리자 버튼은 메인 헤더에 있으므로 여기에는 두지 않는다.
 *
 * 바로 아래가 진한 히어로 배너인 페이지는 background 로 배너 색을 넘긴다. 메뉴 줄은 그 색 위에
 * 어두운 막을 한 겹 더 깔아 배너보다 한 단계 진하게 보이고, 글자는 막 위에 흰색으로 또렷하게,
 * 선택된 메뉴는 히어로 강조색(민트)으로 둔다.
 *
 * 스크롤해서 이 줄이 화면 위에 닿으면 얇은 모양으로 화면 맨 위에 붙는다.
 * (공실스터디 페이지에서는 메인 헤더가 붙지 않고 위로 지나간다 — Header.tsx)
 */
const POINT = "#059669";
const MINT = "#72e7c3";

/** 진한 초록 히어로(멤버십신청·나의 강의실·Q&A, 145deg 그라데이션)의 위쪽 가장자리 색을 그대로 옮긴 것 */
export const STUDY_HERO_BAR = "linear-gradient(90deg, #052427 0%, #072928 25%, #09302b 50%, #0b372e 75%, #0e4036 100%)";
/** 공실스터디 홈 히어로(사진 + 가운데가 밝은 그림자)의 위쪽 가장자리 색 */
export const STUDY_HOME_HERO_BAR = "linear-gradient(90deg, #071614 0%, #0c1f1b 25%, #102320 50%, #0b1d1a 75%, #061613 100%)";

const NAV_ITEMS: {
  label: string;
  href: string;
  match: (p: string) => boolean;
  subItems?: { label: string; href: string }[];
}[] = [
  { label: "홈", href: "/study", match: (p: string) => p === "/study" || p.startsWith("/study/about") },
  { label: "강의목록", href: "/study/lectures", match: (p: string) => p.startsWith("/study/lectures") || p.startsWith("/study_read") },
  { label: "멤버십혜택", href: "/study/benefits/vacancy-register", match: (p: string) => p.startsWith("/study/benefits") },
  { label: "멤버십신청", href: "/study/apply", match: (p: string) => p.startsWith("/study/apply") },
  {
    label: "자료실",
    href: "/study/resources",
    match: (p: string) =>
      p.startsWith("/study/resources") ||
      p.includes("board_id=doc") ||
      p.includes("board_id=drone") ||
      p.includes("board_id=prompt") ||
      p.includes("board_id=sound") ||
      p.includes("board_id=app"),
    subItems: [
      { label: "드론영상", href: "/study/resources?board=drone" },
      { label: "APP(앱)", href: "/study/resources?board=app" },
      { label: "AI 프롬프트", href: "/study/resources?board=prompt" },
      { label: "음원", href: "/study/resources?board=sound" },
      { label: "계약서/양식", href: "/study/resources?board=doc" },
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
      { label: "스터디 Q&A", href: "/study/community?board=studyqa" },
      { label: "자유게시판", href: "/study/community?board=free" },
    ],
  },
];

export default function StudyHeader({ background }: { background?: string } = {}) {
  const pathname = usePathname() || "/study";
  const router = useRouter();
  const dark = !!background;
  const titleColor = dark ? "#ffffff" : "#111";
  const idleColor = dark ? "rgba(255,255,255,0.88)" : "#6b7280";
  const activeColor = dark ? MINT : POINT;
  const barBackground = dark ? "linear-gradient(90deg, #021315 0%, #04191c 50%, #021315 100%)" : "#ffffff";

  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  // 원래 자리(slot)가 화면 위에 닿으면 붙는다. 붙는 동안 slot 이 원래 높이를 지켜 내용이 튀지 않는다
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
        // 진한 메뉴 줄은 아래 여백을 강의목록 페이지(메뉴 ~ 카드 사이 간격)만큼 넉넉히 둔다. 붙었을 때는 얇게
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

        <div style={{ display: "flex", alignItems: "center", gap: "22px", marginBottom: stuck ? 0 : "3px", flexWrap: "wrap" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.match(pathname);
            const isHovered = hoveredNav === item.label;
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
                    padding: "4px 0",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = activeColor; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = idleColor; }}
                >
                  {item.label}
                </Link>

                {item.subItems && isHovered && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      paddingTop: "10px",
                      zIndex: 9999999,
                      minWidth: "140px",
                    }}
                  >
                    <div
                      style={{
                        background: "#ffffff",
                        borderRadius: "6px",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08)",
                        border: "1px solid #d1d5db",
                        overflow: "hidden",
                        textAlign: "center",
                      }}
                    >
                      {item.subItems.map((sub, idx) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setHoveredNav(null)}
                          style={{
                            display: "block",
                            padding: "11px 16px",
                            fontSize: "14px",
                            fontWeight: 700,
                            color: "#1e293b",
                            textDecoration: "none",
                            borderBottom: idx < item.subItems!.length - 1 ? "1px solid #e5e7eb" : "none",
                            transition: "all 0.15s ease",
                            whiteSpace: "nowrap",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#f0fdf4";
                            e.currentTarget.style.color = POINT;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.color = "#1e293b";
                          }}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 우측 끝: [내 강의실] 바로가기 버튼 (상시 노출) 및 스크롤 시 추가 기능 버튼들 */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0, marginBottom: stuck ? 0 : "3px" }}>
          <Link
            href="/study/classroom"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "7px 18px",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 800,
              color: "#ffffff",
              background: pathname.startsWith("/study/classroom")
                ? "linear-gradient(135deg, #059669 0%, #10b981 100%)"
                : dark ? "rgba(5, 150, 105, 0.4)" : "#059669",
              border: pathname.startsWith("/study/classroom")
                ? "1.5px solid #34d399"
                : "1px solid rgba(255, 255, 255, 0.35)",
              boxShadow: pathname.startsWith("/study/classroom")
                ? "0 3px 12px rgba(5, 150, 105, 0.45)"
                : "none",
              textDecoration: "none",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
              cursor: "pointer",
            }}
            title="나의 강의실로 이동"
          >
            내 강의실
          </Link>

          {/* 붙었을 때는 메인 헤더가 안 보이므로 메인 헤더의 오른쪽 버튼들을 그대로 둔다 */}
          {stuck && (
            <>
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
            </>
          )}
        </div>
      </nav>
    </div>
    </div>
  );
}
