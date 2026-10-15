"use server";

import { createClient as createAdminSupabase } from "@supabase/supabase-js";
import { createClient as createCookieSupabase } from "@/utils/supabase/server";
import { isAdminRole } from "@/utils/permissionCheck";

/**
 * 중개사 관리자 메뉴 구성 저장 (2026-10-15 회의 (다)안)
 *  - 기본값(최고관리자): agent_settings id 'realty_menu_default' 의 settings = { main, more }
 *  - 회원 각자: members.admin_menu = { main, more } (null 이면 기본값을 따른다)
 * 로그인 쿠키로 본인을 확인한다. 구성 다듬기(없어진 메뉴 빼기 등)는 화면(realtyMenu.tsx)이 한다.
 */

type Layout = { main: string[]; more: string[] };
const DEFAULT_ID = "realty_menu_default";

function admin() {
  return createAdminSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function me() {
  const cookie = await createCookieSupabase();
  const { data: { user } } = await cookie.auth.getUser();
  return user;
}

function clean(layout: unknown): Layout | null {
  const l = layout as Partial<Layout> | null;
  if (!l || !Array.isArray(l.main) || !Array.isArray(l.more)) return null;
  const str = (a: unknown[]) => a.filter((x): x is string => typeof x === "string").slice(0, 40);
  return { main: str(l.main), more: str(l.more) };
}

async function readDefault(): Promise<Layout | null> {
  const { data } = await admin().from("agent_settings").select("settings").eq("id", DEFAULT_ID).maybeSingle();
  return clean(data?.settings);
}

/** 화면이 처음에 부른다: 최고관리자 기본값과 내 구성 */
export async function getRealtyMenu() {
  const user = await me();
  const defaultLayout = await readDefault();
  if (!user) return { defaultLayout, mine: null, canSaveMine: false };
  const { data, error } = await admin().from("members").select("admin_menu").eq("id", user.id).maybeSingle();
  // 칸이 아직 없으면(DB 변경 전) 내 구성은 저장하지 못한다
  return { defaultLayout, mine: error ? null : clean((data as { admin_menu?: unknown } | null)?.admin_menu), canSaveMine: !error };
}

/** 회원 각자: 내 메뉴 저장. null 이면 기본값으로 되돌린다 */
export async function saveMyRealtyMenu(layout: Layout | null) {
  const user = await me();
  if (!user) return { success: false, error: "로그인이 필요합니다." };
  const value = layout === null ? null : clean(layout);
  const { error } = await admin().from("members").update({ admin_menu: value }).eq("id", user.id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** 최고관리자: 모든 회원의 기본 메뉴 저장 */
export async function saveRealtyMenuDefault(layout: Layout) {
  const user = await me();
  if (!user) return { success: false, error: "로그인이 필요합니다." };
  const { data: member } = await admin().from("members").select("role").eq("id", user.id).maybeSingle();
  if (!isAdminRole(member?.role)) return { success: false, error: "최고관리자만 바꿀 수 있습니다." };
  const value = clean(layout);
  if (!value) return { success: false, error: "메뉴 구성이 올바르지 않습니다." };
  const { error } = await admin().from("agent_settings").upsert({ id: DEFAULT_ID, settings: value, updated_at: new Date().toISOString() });
  if (error) return { success: false, error: error.message };
  return { success: true };
}
