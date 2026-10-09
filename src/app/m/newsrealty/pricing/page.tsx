"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { NewsrealtyPricing } from "@/components/newsrealty/NewsrealtyLanding";

export default function MobileNewsrealtyPricingPage() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setLoggedIn(!!user));
  }, []);

  const handleGeneralClick = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("signup_member_type", "broker");
    }
    if (loggedIn) router.push("/m/admin/dashboard");
    else router.push("/m/login?returnTo=" + encodeURIComponent("/m/admin/dashboard"));
  };

  const handleApplyClick = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("signup_member_type", "broker");
    }
    router.push("/m/newsrealty/apply");
  };

  return (
    <div style={{ backgroundColor: "#fdfdfd", minHeight: "100vh", paddingBottom: "80px" }}>
      {/* ━━━ 모바일 상단 헤더 ━━━ */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          height: "50px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{ background: "none", border: "none", fontSize: "18px", color: "#475569", cursor: "pointer", padding: "4px" }}
          >
            ‹
          </button>
          <Link href="/m/newsrealty" style={{ fontSize: "16px", fontWeight: 800, color: "#111827", textDecoration: "none" }}>
            공실뉴스부동산
          </Link>
        </div>
        <Link
          href="/m/newsrealty/apply"
          style={{
            fontSize: "12.5px",
            fontWeight: 800,
            color: "#ffffff",
            backgroundColor: "#ff8e15",
            padding: "5px 12px",
            borderRadius: "6px",
            textDecoration: "none",
          }}
        >
          입점신청
        </Link>
      </header>

      <NewsrealtyPricing onApply={handleApplyClick} onGeneral={handleGeneralClick} />
    </div>
  );
}
