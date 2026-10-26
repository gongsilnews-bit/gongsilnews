"use server";

// 최고관리자 — 받아쓰기 낱말장 (대표님들이 모은 "잘못 들린 말 → 고친 말" 보기·승인·거절·직접 넣기)
import { createClient as createCookieSupabase } from "@/utils/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { getEffectivePlan } from "@/utils/planCheck";
import { isAdminRole } from "@/utils/permissionCheck";
import { decideRule, sttRows, SHARE_MIN, type SttRow } from "@/lib/sttWords";

async function adminId(): Promise<string | null> {
  const { data } = await (await createCookieSupabase()).auth.getUser();
  const id = data?.user?.id;
  if (!id) return null;
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: m } = await db.from("members").select("id, role, plan_type, plan_end_date, studio_end_date").eq("id", id).maybeSingle();
  return m && (getEffectivePlan(m) === "admin" || isAdminRole(m.role || "")) ? id : null;
}

export async function listSttWords(): Promise<{ success: boolean; rows?: SttRow[]; shareMin?: number; error?: string }> {
  if (!(await adminId())) return { success: false, error: "최고관리자만 볼 수 있습니다." };
  return { success: true, rows: await sttRows(), shareMin: SHARE_MIN };
}

/** status: approved(모두에게 쓰기) · rejected(쓰지 않기) · null(결정 지우기 → 회원 수 기준으로) */
export async function decideSttWord(wrong: string, right: string, status: "approved" | "rejected" | null) {
  const id = await adminId();
  if (!id) return { success: false, error: "최고관리자만 할 수 있습니다." };
  try {
    await decideRule(wrong, right, status, id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
