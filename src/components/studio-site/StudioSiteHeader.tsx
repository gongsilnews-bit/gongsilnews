// 공실스튜디오 메뉴 줄 — 공실뉴스부동산 메뉴 줄(NewsrealtyHeader)을 그대로 옮김 (2026-10-26)
"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FEATURE_GROUPS, featureBySlug } from "@/components/studio-site/studioFeatures";
import NotificationBell from "@/components/common/NotificationBell";
import { createClient } from "@/utils/supabase/client";
import { getEffectiveMemberRole, getAdminEntryLabel, isStudioMember, isNewsAdminButton, NEWS_ADMIN_BUTTON_ORANGE } from "@/utils/permissionCheck";

import LoginJoinButton from "@/components/LoginJoinButton";
// 공실스튜디오 메뉴 줄. 공실스터디(StudyHeader)와 같은 방식으로 메인 헤더 아래에 붙고,
// 스크롤해서 화면 위에 닿으면 이 줄이 고정된다.

const POINT = "#d9661f";

interface SubNavItem {
  label: string;
  href: string;
  /** 자료실·커뮤니티 2차 탭 — 주소의 ?board= 값 (없는 주소면 first 가 켜진다) */
  board?: string;
  first?: boolean;
}

interface NavItem {
  label: string;
  href: string;
  match: (pathname: string) => boolean;
  subItems?: SubNavItem[];
  mega?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  // "공실스튜디오란?"은 뺐다 (2026-10-26 사장님) — 소개는 제목 [공실스튜디오] 을 누르면 나온다
  // 브루식 [주요 기능 ▾] 큰 펼침 판 (2026-10-26) — 목록은 studioFeatures.ts
  { label: "주요 기능", href: "/studio/feature/news", match: (p) => p.startsWith("/studio/feature") || p.startsWith("/studio/benefits"), mega: true },
  { label: "사용법 배우기", href: "/studio/guide", match: (p) => p.startsWith("/studio/guide") }, // 유튜브 사용법 영상 게시판 (2026-10-26)
  { label: "금액안내", href: "/studio/pricing", match: (p) => p.startsWith("/studio/pricing") },
  // "신청하기"는 뺐다 (2026-10-26 사장님) — 금액안내의 [공실스튜디오 신청하기] 버튼으로 신청 (/studio/apply 화면은 그대로)
  // 자료실·커뮤니티는 2026-10-26 부동산특강(/study)에서 옮겨 왔다 — 게시판은 그대로, 회원 전용(4레벨) 혜택
  {
    label: "자료실",
    href: "/studio/resources?board=drone",
    match: (p) => p.startsWith("/studio/resources"),
    subItems: [
      { label: "드론영상", href: "/studio/resources?board=drone", board: "drone", first: true },
      { label: "APP(앱)", href: "/studio/resources?board=app", board: "app" },
      { label: "AI 프롬프트", href: "/studio/resources?board=prompt", board: "prompt" },
      { label: "음원", href: "/studio/resources?board=sound", board: "sound" },
      { label: "계약서/양식", href: "/studio/resources?board=doc", board: "doc" },
    ],
  },
  {
    label: "커뮤니티",
    href: "/studio/community",
    match: (p) => p.startsWith("/studio/community"),
    subItems: [
      { label: "회원 Q&A", href: "/studio/community?board=studyqa", board: "studyqa", first: true },
      { label: "자유게시판", href: "/studio/community?board=free", board: "free" },
    ],
  },
];

interface StudioSiteHeaderProps {
  // 예전 헤더의 이용안내 팝업용. 지금 메뉴는 이용안내 페이지로 바로 가므로 쓰지 않는다.
  onOpenGuide?: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function StudioSiteHeader(_props: StudioSiteHeaderProps = {}) {
  const pathname = usePathname() || "/studio";
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
  const [member, setMember] = useState<{ role: string; planType: string; agencyStatus: string; studioOn: boolean } | null>(null);
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const [{ data: m }, { data: agency }] = await Promise.all([
        supabase.from("members").select("role, plan_type, plan_end_date, studio_end_date").eq("id", user.id).single(),
        supabase.from("agencies").select("status").eq("owner_id", user.id).maybeSingle(),
      ]);
      setMember({
        role: getEffectiveMemberRole(m?.role, agency?.status),
        planType: (m as { plan_type?: string } | null)?.plan_type || "",
        agencyStatus: agency?.status || "",
        studioOn: isStudioMember(m as any),
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
    <>
    {/* 위 남색 줄 — 메인 홈 위쪽 줄과 같게: 왼쪽 "공실뉴스"(홈), 오른쪽 공실등록 · 무료가입 및 로그인 / 알림 · admin · 로그아웃 (2026-10-26 사장님) */}
    <div style={{ background: "#1f1714", color: "#fff" }}>
      <div style={{ maxWidth: 1820, margin: "0 auto", padding: "0 40px", height: 58, display: "flex", alignItems: "center", gap: 18 }}>
        <Link href="/" title="공실뉴스 홈" style={{ fontSize: 22, fontWeight: 900, color: "#fff", textDecoration: "none", letterSpacing: "-0.5px", fontStyle: "italic" }}>공실뉴스</Link>
        <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>11만 부동산을 위한 무료 정보 채널</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {member ? (
            <>
              <NotificationBell color="#ffffff" />
              <button type="button" onClick={goAdmin} style={{ background: member.role === "ADMIN" ? "#111827" : isNewsAdminButton({ role: member.role, plan_type: member.planType }, member.agencyStatus) ? NEWS_ADMIN_BUTTON_ORANGE : "#ef4444", color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                {getAdminEntryLabel({ role: member.role, plan_type: member.planType }, member.agencyStatus)}
              </button>
              <button type="button" onClick={async () => { await createClient().auth.signOut({ scope: "local" }); window.location.reload(); }} style={{ background: "none", border: 0, color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>로그아웃</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => router.push("/login?returnTo=" + encodeURIComponent("/realty_admin?menu=gongsil&action=write"))} style={{ background: "#e8890c", color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>공실등록 &gt;&gt;</button>
              <LoginJoinButton tone="dark" small />
            </>
          )}
        </div>
      </div>
    </div>
    <div ref={slotRef} style={{ height: stuck ? slotHeight : undefined, background: "#ffffff" }}>
      <div
        style={stuck
          ? { position: "fixed", top: 0, left: 0, width: "100%", zIndex: 9999990, background: "#ffffff", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", borderBottom: "1px solid #e5e7eb" }
          : { background: "#ffffff" }}
      >
        <nav
          aria-label="공실스튜디오 메뉴"
          className="container px-20"
          style={{
            display: "flex", alignItems: "center", gap: "32px",
            padding: stuck ? "12px 20px" : "16px 20px",
          }}
        >
          {/* 공실스튜디오 앱 아이콘 (공실뉴스 홈은 위 남색 줄의 "공실뉴스"로, 2026-10-26 사장님) */}
          <Link href="/studio" title="공실스튜디오 홈" style={{ display: "inline-flex", alignItems: "center", flexShrink: 0, marginRight: -22 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/studio-app-icon.png" alt="공실스튜디오" style={{ height: stuck ? 34 : 42, width: stuck ? 34 : 42, borderRadius: 8 }} />
          </Link>
          <Link
            href="/studio"
            style={{
              fontSize: stuck ? "20px" : "24px", fontWeight: 900, color: "#111", letterSpacing: "-0.5px", lineHeight: 1,
              textDecoration: "none", whiteSpace: "nowrap",
            }}
            title="공실스튜디오 홈"
          >
            공실스튜디오
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
                      fontWeight: isActive ? 800 : 600,
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
                    {item.label}{item.mega && <span style={{ fontSize: 11, marginLeft: 4 }}>▾</span>}
                  </Link>

                  {item.mega && hoveredNav === item.label && (
                    <div style={{ position: "absolute", top: "100%", left: -290, zIndex: 9999999, paddingTop: 8 }}>{/* 5칸이라 왼쪽으로 당겨 화면 안에 */}
                      <div style={{ display: "grid", gridTemplateColumns: `repeat(${FEATURE_GROUPS.length}, minmax(160px, auto))`, gap: "0 32px", background: "#ffffff", borderRadius: 14, border: "1px solid #e5e7eb", boxShadow: "0 16px 40px rgba(0,0,0,0.14)", padding: "22px 28px 24px", whiteSpace: "nowrap" }}>
                        {FEATURE_GROUPS.map((g) => (
                          <div key={g.name}>
                            <div style={{ fontSize: 13, color: "#9ca3af", fontWeight: 600, marginBottom: 14 }}>{g.name}</div>
                            {g.slugs.map((sl) => {
                              const f = featureBySlug(sl);
                              if (!f) return null;
                              const on = pathname === `/studio/feature/${sl}`;
                              return (
                                <Link key={sl} href={`/studio/feature/${sl}`} onClick={() => setHoveredNav(null)}
                                  style={{ display: "block", padding: "8px 0", fontSize: 15, fontWeight: on ? 800 : 500, color: on ? POINT : "#1f2937", textDecoration: "none" }}
                                  onMouseEnter={(e) => { e.currentTarget.style.color = POINT; }}
                                  onMouseLeave={(e) => { if (!on) e.currentTarget.style.color = "#1f2937"; }}>
                                  {f.name}
                                </Link>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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

          {/* 로그인·관리자 버튼은 위 남색 줄에 — 스크롤해서 메뉴 줄이 위에 붙었을 때만 여기에도 (2026-10-26) */}
          {stuck && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
              {member ? <NotificationBell color="#333" /> : (
                <LoginJoinButton />
              )}
              {member ? (
                <button type="button" onClick={goAdmin} style={{ background: member.role === "ADMIN" ? "#111827" : isNewsAdminButton({ role: member.role, plan_type: member.planType }, member.agencyStatus) ? NEWS_ADMIN_BUTTON_ORANGE : "#ef4444", color: "#fff", border: "none", borderRadius: "4px", padding: "6px 14px", fontSize: "12px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {getAdminEntryLabel({ role: member.role, plan_type: member.planType }, member.agencyStatus)}
                </button>
              ) : (
                <button type="button" onClick={() => router.push("/login?returnTo=" + encodeURIComponent("/realty_admin?menu=gongsil&action=write"))} style={{ background: "#e8890c", color: "#fff", border: "none", borderRadius: "4px", padding: "6px 14px", fontSize: "12px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                  공실등록 &gt;&gt;
                </button>
              )}
            </div>
          )}
        </nav>
        <Suspense fallback={null}>
          <StudioSiteSubTabs pathname={pathname} />
        </Suspense>
      </div>
    </div>
    </>
  );
}

/** 자료실·커뮤니티 아래 2차 탭 줄 — 게시판은 주소(?board=)로 바뀐다 */
function StudioSiteSubTabs({ pathname }: { pathname: string }) {
  const searchParams = useSearchParams();
  const active = NAV_ITEMS.find((item) => item.match(pathname) && item.subItems?.some((s) => s.board));
  if (!active?.subItems) return null;
  const board = searchParams?.get("board");
  return (
    <div style={{ borderTop: "1px solid #f1ece6", borderBottom: "1px solid #e5e7eb" }}>
      <div className="container px-20" style={{ display: "flex", gap: 4, overflowX: "auto", padding: "0 20px" }}>
        {active.subItems.map((sub) => {
          const on = board ? board === sub.board : !!sub.first;
          return (
            <Link
              key={sub.href}
              href={sub.href}
              aria-current={on ? "page" : undefined}
              style={{
                display: "inline-flex", alignItems: "center", padding: "12px 14px",
                fontSize: 14, whiteSpace: "nowrap", textDecoration: "none",
                borderBottom: `2px solid ${on ? POINT : "transparent"}`,
                color: on ? "#1e293b" : "#64748b", fontWeight: on ? 600 : 400,
              }}
            >
              {sub.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
