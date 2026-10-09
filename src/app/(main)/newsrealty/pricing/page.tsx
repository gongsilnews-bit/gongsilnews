"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import NewsrealtyHeader from "@/components/newsrealty/NewsrealtyHeader";
import { NewsrealtyPricing } from "@/components/newsrealty/NewsrealtyLanding";

export default function NewsrealtyPricingPage() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setLoggedIn(!!user));
  }, []);

  const handleGeneralClick = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("signup_member_type", "broker");
    }
    if (loggedIn) router.push("/realty_admin");
    else router.push("/login?returnTo=" + encodeURIComponent("/realty_admin"));
  };

  const handleApplyClick = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("signup_member_type", "broker");
    }
    router.push("/newsrealty/apply");
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fdfdfd" }}>
      <NewsrealtyHeader />
      <NewsrealtyPricing onApply={handleApplyClick} onGeneral={handleGeneralClick} />
    </div>
  );
}
