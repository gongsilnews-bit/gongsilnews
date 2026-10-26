"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getPlanLabel, isAdminRole } from "@/utils/permissionCheck";

/**
 * 헤더 오른쪽 위 [공실뉴스부동산 가입 ›] — 직방 "중개사무소 가입 및 상품문의" 자리 (2026-10-26 사장님).
 * 누르면 /newsrealty. 누구에게나 보인다 — 이미 공실뉴스부동산·최고관리자면 "가입" 없이 [공실뉴스부동산 ›] (2026-10-26). /newsrealty 안에서는 숨긴다.
 * tone: dark = 어두운 바탕(메인 홈 위쪽 줄), light = 흰 바탕.
 */
/** 아직 공실뉴스부동산이 아닌가 (가입 글자를 붙일지) */
export function showNewsrealtyJoin(member: { role?: string | null; plan_type?: string | null } | null | undefined): boolean {
  if (isAdminRole(member?.role)) return false;
  return getPlanLabel(member) !== "공실뉴스부동산";
}

export default function NewsrealtyJoinButton({ tone = "light", small = false, joined = false }: { tone?: "dark" | "light"; small?: boolean; joined?: boolean }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/newsrealty")) return null;
  const dark = tone === "dark";
  return (
    <Link
      href="/newsrealty"
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: small ? "3px 9px" : "5px 12px", borderRadius: 4,
        border: `1px solid ${dark ? "rgba(255,255,255,0.75)" : "#d1d5db"}`,
        color: dark ? "#fff" : "#374151", background: "transparent",
        fontSize: small ? 11 : 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0,
      }}
    >
      {joined ? "공실뉴스부동산 ›" : "공실뉴스부동산 가입 ›"}
    </Link>
  );
}
