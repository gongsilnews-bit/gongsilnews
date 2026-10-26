"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

/**
 * 오른쪽 위 [공실뉴스 무료가입 및 로그인] — 로그인 전 "로그인" 글자 자리 (2026-10-26 사장님, 직방 "중개사무소 가입 및 상품문의" 처럼)
 * 가입과 로그인이 같은 화면(구글·카카오로 첫 로그인 = 가입)이라 /login?simple=1 (왼쪽 설명 없이 로그인만) 으로 보내고, 끝나면 보던 화면으로 돌아온다.
 * tone: dark = 어두운 바탕(메인 홈 위쪽 줄), light = 흰 바탕
 */
function Inner({ tone, small }: { tone: "dark" | "light"; small: boolean }) {
  const pathname = usePathname() || "/";
  const sp = useSearchParams();
  const back = pathname + (sp?.toString() ? "?" + sp.toString() : "");
  const dark = tone === "dark";
  return (
    <Link
      href={"/login?simple=1&returnTo=" + encodeURIComponent(back)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: small ? "3px 9px" : "5px 12px", borderRadius: 4,
        border: `1px solid ${dark ? "rgba(255,255,255,0.75)" : "#374151"}`,
        color: dark ? "#fff" : "#111827", background: "transparent",
        fontSize: small ? 11 : 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0,
      }}
    >
      공실뉴스 무료가입 및 로그인
    </Link>
  );
}

export default function LoginJoinButton({ tone = "light", small = false }: { tone?: "dark" | "light"; small?: boolean }) {
  return (
    <Suspense fallback={null}>
      <Inner tone={tone} small={small} />
    </Suspense>
  );
}
