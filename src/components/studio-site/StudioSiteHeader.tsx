// 공실마케팅 메뉴 줄 — 공실뉴스부동산 메뉴 줄(NewsrealtyHeader)을 그대로 옮김 (2026-10-26)
"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { FEATURE_GROUPS, featureBySlug } from "@/components/studio-site/studioFeatures";
// 공실뉴스부동산 한 줄 메뉴 (2026-11-09) — 로고 · 칸 이동 메뉴 · [신청하기]. 화면 위에 붙어 따라온다 (sticky)

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
  // "공실마케팅란?"은 뺐다 (2026-10-26 사장님) — 소개는 제목 [공실마케팅] 을 누르면 나온다
  // 브루식 [주요 기능 ▾] 큰 펼침 판 (2026-10-26) — 목록은 studioFeatures.ts
  // 주요 기능 · 사용법 배우기 메뉴는 뺐다 (2026-11-09 사장님) — 페이지(/newsrealty/feature · /newsrealty/guide)는 그대로
  // 원페이지 (2026-11-09 사장님) — 누르면 첫 화면의 그 칸으로 내려간다. 다른 페이지에 있으면 첫 화면으로 와서 내려간다
  { label: "공실뉴스부동산이란?", href: "/newsrealty#intro", match: () => false },
  { label: "SNS 자동화", href: "/newsrealty#sns", match: () => false },
  { label: "부동산마케팅", href: "/newsrealty#benefits", match: () => false },
  { label: "금액안내", href: "/newsrealty#pricing", match: () => false },
  // "신청하기"는 뺐다 (2026-10-26 사장님) — 금액안내의 [공실뉴스부동산 PRO 신청하기] 버튼으로 신청 (/newsrealty/pro-apply 화면은 그대로)
  // 자료실·커뮤니티는 2026-10-26 부동산특강(/study)에서 옮겨 왔다 — 게시판은 그대로, 회원 전용(4레벨) 혜택
  // 자료실 메뉴는 뺐다 (2026-11-09 사장님: "의미가 없어") — 게시판·주소(/newsrealty/resources)는 그대로
  // 커뮤니티 메뉴도 뺐다 (2026-11-09 사장님) — 게시판·주소(/newsrealty/community)는 그대로
];

interface StudioSiteHeaderProps {
  // 예전 헤더의 이용안내 팝업용. 지금 메뉴는 이용안내 페이지로 바로 가므로 쓰지 않는다.
  onOpenGuide?: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function StudioSiteHeader(_props: StudioSiteHeaderProps = {}) {
  const pathname = usePathname() || "/newsrealty";
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  // 원래 자리(slot)가 화면 위에 닿으면 붙는다.
  const slotRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const check = () => {
      const el = slotRef.current;
      if (!el) return;
      const isStuck = el.getBoundingClientRect().top <= 0 && window.scrollY > 0;
      setStuck(isStuck);
    };
    const raf = window.requestAnimationFrame(check);
    window.addEventListener("scroll", check, { passive: true });
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", check);
    };
  }, []);


  return (
    <>
    {/* 한 줄 메뉴 (2026-11-09 사장님) — 예전 위 검은 공실뉴스 줄은 없앰. 공실뉴스 홈·로그인·관리자는 이 줄 오른쪽에 */}
    {/* 메뉴는 늘 화면 맨 위에 고정 (2026-11-09 사장님) — 공실뉴스 CSS 의 body overflow 때문에 sticky 가 안 붙어 fixed 로.
        아래 칸이 메뉴에 가리지 않게 같은 높이(68px)만큼 자리를 비워 둔다 */}
    <div ref={slotRef} style={{ height: 68 }}>
      <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: 68, zIndex: 9999990, background: "#ffffff", transition: "box-shadow 0.2s", boxShadow: stuck ? "0 4px 16px rgba(0,0,0,0.12)" : "none", borderBottom: stuck ? "1px solid #e5e7eb" : "1px solid #f1f1f1" }}>
        <nav
          aria-label="공실뉴스부동산 메뉴"
          className="container px-20"
          style={{
            display: "flex", alignItems: "center", gap: "32px",
            height: 68, padding: "0 20px",
          }}
        >
          {/* 공실마케팅 앱 아이콘 (공실뉴스 홈은 위 남색 줄의 "공실뉴스"로, 2026-10-26 사장님) */}
          {/* 맨 앞은 공실뉴스 로고 → 공실뉴스 홈, 그 옆 "공실뉴스부동산"은 글자 (2026-11-10 사장님) */}
          <Link href="/" title="공실뉴스 홈으로" style={{ display: "inline-flex", alignItems: "center", flexShrink: 0, marginRight: -18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="부동산 정보채널 공실뉴스" style={{ height: 40 }} />
          </Link>
          <Link
            href="/newsrealty"
            style={{
              fontSize: "22px", fontWeight: 900, color: "#111", letterSpacing: "-0.5px", lineHeight: 1,
              textDecoration: "none", whiteSpace: "nowrap",
            }}
            title="공실뉴스부동산 홈"
          >
            공실뉴스부동산
            {/* 사이트 이름 공실뉴스부동산 (2026-11-05 사장님: PRO 이름 뺌 — 유료가 곧 공실뉴스부동산) */}
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
                    onClick={(e) => {
                      setHoveredNav(null);
                      // 원페이지 — 같은 화면에 그 칸이 있으면 바로 부드럽게 내려간다 (주소의 #도 하나만, 2026-11-09)
                      const id = item.href.split("#")[1];
                      const el = id ? document.getElementById(id) : null;
                      if (el) {
                        e.preventDefault();
                        history.replaceState(null, "", `#${id}`);
                        el.scrollIntoView({ behavior: "smooth", block: "start" }); // 메뉴 아래에 멈추는 건 각 칸의 scrollMarginTop
                        // 내려가는 도중 영상이 불려 와 길이가 바뀌면 덜 간다 — 다 멈춘 뒤 한 번만 맞춘다
                        let fixed = false;
                        const fix = () => {
                          if (fixed) return;
                          fixed = true;
                          window.removeEventListener("scrollend", fix);
                          if (Math.abs(el.getBoundingClientRect().top - 80) > 6) el.scrollIntoView({ behavior: "smooth", block: "start" });
                        };
                        window.addEventListener("scrollend", fix);
                        setTimeout(fix, 1600);
                      }
                    }}
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
                              const on = pathname === `/newsrealty/feature/${sl}`;
                              return (
                                <Link key={sl} href={`/newsrealty/feature/${sl}`} onClick={() => setHoveredNav(null)}
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

          {/* 오른쪽은 [신청하기] 하나만 (2026-11-09 사장님) — 금액표의 공실뉴스부동산 [시작하기]와 같은 신청 화면 */}
          <Link href="/newsrealty/pro-apply" style={{ marginLeft: "auto", flexShrink: 0, background: "#e8890c", color: "#fff", borderRadius: 8, padding: "10px 20px", fontSize: 15, fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap" }}>신청하기</Link>
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
