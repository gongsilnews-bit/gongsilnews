"use client";

import React from "react";
import NewsrealtyHeader from "@/components/newsrealty/NewsrealtyHeader";
import { NewsrealtyPricing } from "@/components/newsrealty/NewsrealtyLanding";

export default function NewsrealtyPricingPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fdfdfd" }}>
      <NewsrealtyHeader />
      <NewsrealtyPricing />
    </div>
  );
}
