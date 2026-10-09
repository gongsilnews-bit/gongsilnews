"use client";

import React from "react";
import { useRouter } from "next/navigation";
import NewsrealtyHeader from "@/components/newsrealty/NewsrealtyHeader";
import NewsrealtyLanding from "@/components/newsrealty/NewsrealtyLanding";

export default function NewsRealtyPage() {
  const router = useRouter();

  const handleApplyClick = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("signup_member_type", "broker");
    }
    router.push("/newsrealty/apply");
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fdfdfd" }}>
      <NewsrealtyHeader />
      <NewsrealtyLanding onApply={handleApplyClick} />
    </div>
  );
}
