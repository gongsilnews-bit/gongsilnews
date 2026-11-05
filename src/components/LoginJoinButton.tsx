"use client";

import { usePathname, useSearchParams } from "next/navigation";
import React, { Suspense } from "react";
import Link from "next/link";

/**
 * 오른쪽 위 [공실뉴스 무료가입 및 로그인] — 로그인 전 "로그인" 글자 자리 (2026-10-26 사장님, 직방 "중개사무소 가입 및 상품문의" 처럼)
 * 가입과 로그인이 같은 화면(구글·카카오로 첫 로그인 = 가입)이라 /login?simple=1 (왼쪽 설명 없이 로그인만) 으로 보내고, 끝나면 보던 화면으로 돌아온다.
 * tone: dark = 어두운 바탕(메인 홈 위쪽 줄), light = 흰 바탕
 */
function Inner({ tone, small, inquiry }: { tone: "dark" | "light"; small: boolean; inquiry: boolean }) {
  const pathname = usePathname() || "/";
  const sp = useSearchParams();
  const back = pathname + (sp?.toString() ? "?" + sp.toString() : "");
  const dark = tone === "dark";
  // 직방처럼 둥근 테두리 단추 두 개 (2026-11-05 사장님): [로그인 및 회원가입] [중개사무소 가입 및 상품문의 ⓘ]
  const btn: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6,
    height: small ? 30 : 34, padding: small ? "0 12px" : "0 14px", borderRadius: 7,
    border: `1px solid ${dark ? "rgba(255,255,255,0.85)" : "#374151"}`,
    color: dark ? "#fff" : "#111827", background: "transparent",
    fontSize: small ? 12.5 : 13, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0, boxSizing: "border-box",
  };
  // 중개사무소 가입·상품 소개 = 공실뉴스부동산 사이트. 이미 그 안이면 금액안내로
  const inquiryHref = pathname.startsWith("/newsrealty") || pathname.startsWith("/marketing") ? "/newsrealty/pricing" : "/newsrealty";
  return (
    <>
      <Link href={"/login?simple=1&returnTo=" + encodeURIComponent(back)} style={btn}>로그인 및 회원가입</Link>
      {inquiry && (
        <Link href={inquiryHref} style={btn}>
          중개사무소 가입 및 상품문의
          <svg width={small ? 15 : 16} height={small ? 15 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="10" /><path d="M10.5 8l4 4-4 4" /></svg>
        </Link>
      )}
    </>
  );
}

export default function LoginJoinButton({ tone = "light", small = false, inquiry = tone === "dark" }: { tone?: "dark" | "light"; small?: boolean; inquiry?: boolean }) {
  return (
    <Suspense fallback={null}>
      <Inner tone={tone} small={small} inquiry={inquiry} />
    </Suspense>
  );
}

/** [중개사무소 가입 및 상품문의 ⓘ] 하나만 — 로그인한 뒤에도 위쪽 줄에 늘 (2026-11-05 사장님) */
function InquiryInner({ small }: { small: boolean }) {
  const pathname = usePathname() || "/";
  const href = pathname.startsWith("/newsrealty") || pathname.startsWith("/marketing") ? "/newsrealty/pricing" : "/newsrealty";
  return (
    <Link href={href} style={{
      display: "inline-flex", alignItems: "center", gap: 6, height: small ? 30 : 34, padding: small ? "0 12px" : "0 14px", borderRadius: 7,
      border: "1px solid rgba(255,255,255,0.85)", color: "#fff", background: "transparent", fontSize: small ? 12.5 : 13, fontWeight: 700,
      textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0, boxSizing: "border-box",
    }}>
      중개사무소 가입 및 상품문의
      <svg width={small ? 15 : 16} height={small ? 15 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="10" /><path d="M10.5 8l4 4-4 4" /></svg>
    </Link>
  );
}
export function InquiryButton({ small = true }: { small?: boolean }) {
  return (
    <Suspense fallback={null}>
      <InquiryInner small={small} />
    </Suspense>
  );
}
