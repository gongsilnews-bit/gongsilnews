"use client";

import React from "react";
import Link from "next/link";
import StudioVrewLanding from "@/components/studio-site/StudioVrewLanding";
import StudioFooter from "@/components/studio-site/StudioFooter";

/**
 * 모바일 공실뉴스부동산 소개 (2026-11-11 사장님: "지금 우리 사이트에 있는 내용으로 해야지")
 *  PC /newsrealty 와 같은 화면(StudioVrewLanding — app/marketing/(site)/page.tsx)을 그대로 쓴다. 머리줄만 폰에 맞게.
 *  예전 옛 소개(NewsrealtyLanding)는 쓰지 않는다
 */
const ORANGE = "#e8890c";
const MENU = [
  { label: "공실뉴스부동산이란?", id: "intro" },
  { label: "SNS 자동화", id: "sns" },
  { label: "부동산마케팅", id: "benefits" },
  { label: "금액안내", id: "pricing" },
];

export default function MobileNewsRealtyPage() {
  const go = (id: string) => (e: React.MouseEvent) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    history.replaceState(null, "", `#${id}`);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={{ backgroundColor: "#ffffff", paddingBottom: 140, overflowX: "hidden" }}>
      {/* 폰 머리줄 — 로고 · 공실뉴스부동산 · [신청하기], 아래 줄에 PC 와 같은 메뉴 넷 (옆으로 밀어 봄) */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #eee" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, height: 52, padding: "0 16px" }}>
          <Link href="/" title="공실뉴스 홈으로" style={{ display: "inline-flex", flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="부동산 정보채널 공실뉴스" style={{ height: 28 }} />
          </Link>
          <Link href="/m/newsrealty" style={{ fontSize: 17, fontWeight: 900, color: "#111", letterSpacing: "-0.5px", textDecoration: "none", whiteSpace: "nowrap" }}>공실뉴스부동산</Link>
          <Link href="/newsrealty/pro-apply" style={{ marginLeft: "auto", flexShrink: 0, background: ORANGE, color: "#fff", borderRadius: 8, padding: "7px 14px", fontSize: 13.5, fontWeight: 800, textDecoration: "none" }}>신청하기</Link>
        </div>
        <nav aria-label="공실뉴스부동산 메뉴" style={{ display: "flex", gap: 18, overflowX: "auto", padding: "0 16px", height: 40, alignItems: "center", scrollbarWidth: "none" }}>
          {MENU.map((m) => (
            <a key={m.id} href={`#${m.id}`} onClick={go(m.id)} style={{ fontSize: 14, fontWeight: 600, color: "#6b7280", textDecoration: "none", whiteSpace: "nowrap" }}>{m.label}</a>
          ))}
        </nav>
      </div>

      {/* 칸으로 건너갈 때 머리줄(92px)에 가리지 않게 */}
      <style>{`.m-nr [id]{scroll-margin-top:100px !important}`}</style>
      <div className="m-nr">
        <StudioVrewLanding />
      </div>
      <StudioFooter />

      {/* 하단 고정 신청 바 — 아래 메뉴(높이 60px) 위에 (2026-11-11) */}
      <div style={{ position: "fixed", bottom: 60, left: 0, width: "100%", padding: "10px 16px", background: "rgba(255,255,255,0.94)", backdropFilter: "blur(10px)", borderTop: "1px solid #eee", boxSizing: "border-box", zIndex: 40 }}>
        <Link href="/newsrealty/pro-apply" style={{ display: "block", textAlign: "center", padding: "13px 20px", background: ORANGE, color: "#fff", fontSize: 16, fontWeight: 800, borderRadius: 8, textDecoration: "none" }}>
          공실뉴스부동산 신청 &gt;&gt;
        </Link>
      </div>
    </div>
  );
}
