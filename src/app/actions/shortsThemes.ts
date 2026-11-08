"use server";

/**
 * 쇼츠릴스studio 기본 테마 5칸 (2026-11-05 사장님: "1번 테마 이렇게 만들어줘 · 제목 길이·그래픽 쓴 것부터 똑같이")
 *  최고관리자가 편집한 영상을 [기본 테마 N으로 저장] → 모든 회원의 기본 테마 N 이 그 모양으로
 *  agent_settings id 'shorts_themes' 의 settings = { slots: (테마 | null)[5] } — null 이면 코드에 있는 처음 테마
 */
import { createClient as createAdminSupabase } from "@supabase/supabase-js";
import { createClient as createCookieSupabase } from "@/utils/supabase/server";
import { isAdminRole } from "@/utils/permissionCheck";

const ID = "shorts_themes";
/** 기본 테마를 바꿀 수 있는 계정 — 최고관리자 + 사장님이 영상을 편집하는 공실마케팅 계정 (2026-11-05) */
const EDITORS = ["gongsilmarketing@gmail.com"];
const SLOTS = 15; // 공실소개 5 · 단지소개 5 · 뉴스칼럼 5 (2026-11-06)
const db = () => createAdminSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

async function read(): Promise<(Record<string, unknown> | null)[]> {
  const { data } = await db().from("agent_settings").select("settings").eq("id", ID).maybeSingle();
  const slots = (data?.settings as { slots?: unknown[] } | null)?.slots;
  return Array.from({ length: SLOTS }, (_, i) => (slots && slots[i] && typeof slots[i] === "object" ? (slots[i] as Record<string, unknown>) : null));
}

export async function getShortsThemes() {
  try { return { success: true as const, slots: await read() }; } catch { return { success: true as const, slots: Array.from({ length: SLOTS }, () => null) }; }
}

async function canEdit() {
  const cookie = await createCookieSupabase();
  const { data: { user } } = await cookie.auth.getUser();
  if (!user) return false;
  if (EDITORS.includes(String(user.email || "").toLowerCase())) return true;
  const { data: me } = await db().from("members").select("role").eq("id", user.id).maybeSingle();
  return isAdminRole(me?.role);
}
/** 편집기 [내 테마로 저장] 창에 기본 테마 칸을 보일지 */
export async function canEditShortsThemes() {
  return canEdit().catch(() => false);
}

/** 최고관리자·공실마케팅 계정만 — i: 0~4, theme: null 이면 처음 테마로 되돌리기 */
export async function saveShortsTheme(i: number, theme: Record<string, unknown> | null) {
  if (!(await canEdit())) return { success: false as const, error: "기본 테마는 최고관리자만 바꿀 수 있어요." };
  if (!Number.isInteger(i) || i < 0 || i >= SLOTS) return { success: false as const, error: "테마 칸을 다시 골라 주세요." };
  const json = theme ? JSON.stringify(theme) : "";
  if (json.length > 200_000) return { success: false as const, error: "테마가 너무 커요." };
  const slots = await read();
  slots[i] = theme ? JSON.parse(json) : null;
  const { error } = await db().from("agent_settings").upsert({ id: ID, settings: { slots }, updated_at: new Date().toISOString() });
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, slots };
}
