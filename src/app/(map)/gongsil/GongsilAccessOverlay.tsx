"use client";

import React, { useEffect, useState } from "react";
import { getOnbidCount } from "@/app/actions/agentChat";

interface GongsilAccessOverlayProps {
  property: {
    id: string | number;
    owner_id?: string;
    trade_type?: string;
    exposure_type?: string;
  };
  currentUser: { id?: string; email?: string; role?: string } | null;
  userLevel: number;
  onBack: () => void;
  isStandalone?: boolean;
  isAuthChecking?: boolean;
}

export default function GongsilAccessOverlay({
  property,
  currentUser,
  userLevel,
  onBack,
  isStandalone = false,
  isAuthChecking = false,
}: GongsilAccessOverlayProps) {
  const [onbidCount, setOnbidCount] = useState<number | null>(null);
  const isMyProperty = currentUser && property?.owner_id === currentUser.id;
  const isAuctionProperty = property?.trade_type === "경매" || property?.trade_type === "공매";
  const isMasked = isAuctionProperty
    ? userLevel < 1
    : property?.exposure_type === "부동산노출" && userLevel < 2 && !isMyProperty;

  useEffect(() => {
    if (!isMasked || !isAuctionProperty) return;
    getOnbidCount().then(setOnbidCount).catch(() => setOnbidCount(null));
  }, [isMasked, isAuctionProperty]);

  if (!isMasked || isAuthChecking) return null;

  const currentReturnUrl =
    isStandalone || (typeof window !== "undefined" && window.location.pathname.startsWith("/gongsil/detail"))
      ? typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : `/gongsil/detail/${property.id}`
      : `/gongsil?id=${property.id}`;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(255, 255, 255, 0.94)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        zIndex: 90,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        textAlign: "center",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
          border: "2px solid #f59e0b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 34,
          marginBottom: 20,
          boxShadow: "0 10px 25px rgba(245, 158, 11, 0.2)",
        }}
      >
        🔒
      </div>

      <h3
        style={{
          fontSize: 22,
          fontWeight: 900,
          color: "#0f172a",
          margin: "0 0 12px 0",
          letterSpacing: "-0.5px",
          lineHeight: 1.35,
        }}
      >
        {isAuctionProperty ? (
          <>
            회원가입하시면
            <br />
            무료 열람
          </>
        ) : (
          <>
            중개업소 회원만
            <br />
            열람할 수 있습니다
          </>
        )}
      </h3>

      <p
        style={{
          fontSize: 14,
          color: "#64748b",
          lineHeight: 1.65,
          margin: "0 0 28px 0",
          wordBreak: "keep-all",
          maxWidth: 320,
        }}
      >
        {isAuctionProperty ? (
          <>
            매물 최신일자로 업데이트됩니다.
            <br />
            전국 <strong style={{ color: "#dc2626" }}>{onbidCount !== null ? onbidCount.toLocaleString() : "-"}건</strong> 경매 물건 (
            {String(new Date().getFullYear()).slice(-2)}년{new Date().getMonth() + 1}월{new Date().getDate()}일)
          </>
        ) : (
          <>
            부동산 대표님이시라면 <strong>100% 무료 중개업소 등록</strong> 후 실매물을 즉시 열람하실 수 있습니다.
          </>
        )}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 300 }}>
        <button
          onClick={() => {
            if (isAuctionProperty) {
              window.location.replace("/login?returnTo=" + encodeURIComponent(currentReturnUrl));
            } else if (!currentUser) {
              localStorage.setItem("signup_member_type", "broker");
              window.location.replace("/login?returnTo=" + encodeURIComponent("/realty_admin?menu=settings&tab=agency"));
            } else {
              window.location.href = "/realty_admin?menu=settings";
            }
          }}
          style={{
            width: "100%",
            padding: "14px 0",
            background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
            color: "#ffffff",
            border: "none",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)",
          }}
        >
          {isAuctionProperty ? "무료 회원가입하기" : "✨ 중개업소 무료 가입하기 →"}
        </button>

        {(!currentUser || userLevel < 2) && (
          <button
            onClick={() => {
              window.location.replace("/login?returnTo=" + encodeURIComponent(currentReturnUrl));
            }}
            style={{
              width: "100%",
              padding: "12px 0",
              background: "#ffffff",
              color: "#475569",
              border: "1px solid #cbd5e1",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {currentUser ? "🔑 중개업소 계정으로 로그인" : "🔑 로그인"}
          </button>
        )}

        <button
          onClick={onBack}
          style={{
            width: "100%",
            padding: "10px 0",
            background: "transparent",
            color: "#94a3b8",
            border: "none",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {isStandalone ? "닫기" : "닫기 (다른 매물 둘러보기)"}
        </button>
      </div>
    </div>
  );
}
