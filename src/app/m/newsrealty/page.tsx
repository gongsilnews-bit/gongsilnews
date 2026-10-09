"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NewsrealtyLanding from "@/components/newsrealty/NewsrealtyLanding";

export default function MobileNewsRealtyPage() {
  const router = useRouter();

  const handleApplyClick = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("signup_member_type", "broker");
    }
    router.push("/m/newsrealty/apply");
  };

  return (
    <div style={{ backgroundColor: "#fdfdfd", paddingBottom: 90, paddingTop: 50, overflowX: "hidden" }}>
      {/* ── 고정 상단 헤더 ── */}
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: 50,
        background: "#181411",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        zIndex: 50,
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        boxSizing: "border-box"
      }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#ffb347", padding: "4px", cursor: "pointer", display: "flex", alignItems: "center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div style={{ fontSize: 16, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.5px" }}>
          공실뉴스부동산
        </div>
        <Link href="/" style={{ color: "#ffb347", fontSize: 13, textDecoration: "none", fontWeight: 700 }}>
          홈으로
        </Link>
      </div>

      <NewsrealtyLanding
        onApply={handleApplyClick}
        benefitsHref="/m/newsrealty/benefits/brokerage-article"
        showFooter
      />

      {/* ── 하단 고정 신청 바 ── */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        padding: "12px 16px",
        background: "rgba(253, 253, 253, 0.92)",
        backdropFilter: "blur(10px)",
        borderTop: "1px solid rgba(46, 38, 33, 0.14)",
        boxSizing: "border-box",
        zIndex: 40
      }}>
        <button
          onClick={handleApplyClick}
          style={{
            width: "100%",
            padding: "14px 20px",
            background: "oklch(0.48 0.14 45)",
            color: "#ffffff",
            fontFamily: "inherit",
            fontSize: 16,
            fontWeight: 700,
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          공실뉴스부동산 신청하기 &gt;
        </button>
      </div>
    </div>
  );
}
