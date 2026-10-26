"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getPlanLabel, isAdminRole } from "@/utils/permissionCheck";

/**
 * 헤더 오른쪽 위 [공실뉴스부동산 가입 ›] — 직방 "중개사무소 가입 및 상품문의" 자리 (2026-10-26 사장님).
 * 아직 가입 전(일반회원·비회원)이면 [공실뉴스부동산 가입 ›] → /newsrealty,
 * 이미 공실뉴스부동산·최고관리자면 다음 단계 [공실스튜디오 ›] → /studio (2026-10-26 사장님). /newsrealty 안에서는 가입 버튼만 숨긴다.
 * tone: dark = 어두운 바탕(메인 홈 위쪽 줄), light = 흰 바탕.
 */
/** 공실스튜디오 공개 전이라 헤더 단추를 숨긴다 (2026-10-27 사장님) */
const STUDIO_BUTTON_HIDDEN = true;

/** 아직 공실뉴스부동산이 아닌가 (가입 글자를 붙일지) */
export function showNewsrealtyJoin(member: { role?: string | null; plan_type?: string | null } | null | undefined): boolean {
  if (isAdminRole(member?.role)) return false;
  return getPlanLabel(member) !== "공실뉴스부동산";
}

export default function NewsrealtyJoinButton({ tone = "light", small = false, joined = false }: { tone?: "dark" | "light"; small?: boolean; joined?: boolean }) {
  const pathname = usePathname();
  // 2026-10-26 사장님: [공실뉴스부동산 가입 ›] 은 없앤다 — 가입 전에는 [공실뉴스 무료가입 및 로그인](LoginJoinButton) 하나만
  if (!joined) return null;
  // 2026-10-27 사장님: 공실스튜디오는 아직 열지 않는다 — 열 때 STUDIO_BUTTON_HIDDEN 을 false 로
  if (STUDIO_BUTTON_HIDDEN) return null;
  void pathname;
  void tone;
  // 2026-10-26 사장님: admin 버튼 옆 마크 대신, 이 버튼을 공실스튜디오 로고 + 이름으로 (앱 색: 짙은 밤색 바탕 + 오렌지)
  const icon = small ? 16 : 18;
  return (
    <Link
      href="/studio"
      title="공실스튜디오"
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        height: small ? 24 : 28, padding: small ? "0 10px 0 4px" : "0 12px 0 5px", borderRadius: 999,
        background: "#1f1714", border: "1px solid #e8890c", color: "#fff",
        fontSize: small ? 11.5 : 12.5, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/studio-app-icon.png" alt="" width={icon} height={icon} style={{ width: icon, height: icon, borderRadius: "50%" }} />
      공실스튜디오
    </Link>
  );
}
