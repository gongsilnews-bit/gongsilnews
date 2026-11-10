"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { getEffectiveMemberRole } from "@/utils/permissionCheck";

/** [무료로 시작하기] — 공실뉴스부동산 가입 신청 (중개사 서류 승인 뒤 무료) */
/** [무료로 시작하기] — 로그인 안 했으면 회원가입, 했으면 관리자 화면 (2026-11-05 사장님). 헤더 [admin >>] 와 같은 곳으로 */
export function useStartHref() {
  // 2026-11-10 사장님: 회원가입 화면(/signup)으로 보내지 않고 관리자 화면으로 — 로그인 안 했으면 그 화면이 로그인으로 넘겨 주고, 로그인 뒤 돌아온다
  const [href, setHref] = useState("/realty_admin");
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const [{ data: m }, { data: agency }] = await Promise.all([
        supabase.from("members").select("role").eq("id", user.id).single(),
        supabase.from("agencies").select("status").eq("owner_id", user.id).maybeSingle(),
      ]);
      const role = getEffectiveMemberRole((m as { role?: string } | null)?.role, agency?.status);
      setHref(role === "ADMIN" ? "/admin" : role === "REALTOR" ? (agency?.status === "REJECTED" ? "/realty_admin?menu=settings&tab=agency" : "/realty_admin") : "/user_admin");
    }).catch(() => {});
  }, []);
  return href;
}
