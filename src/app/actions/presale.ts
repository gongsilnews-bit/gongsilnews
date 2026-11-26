"use server";

// 분양자료 신청 (2026-11-26 사장님 회의) — 표 presale_requests (supabase/migrations/20261126_presale_requests.sql)
//  신청: 누구나(비회원도) · 보기·처리: 최고관리자
//  동의 문구와 "제공받는 자"는 서버가 단지 자료로 다시 만들어 남긴다 (화면이 보낸 글을 믿지 않는다)
import { createClient as createCookieSupabase } from "@/utils/supabase/server";
import { isAdminRole } from "@/utils/permissionCheck";
import { db } from "@/utils/aptMap";
import { savePresaleRequest, type PresaleRequestInput } from "@/utils/presaleRequest";

async function myId() {
  const { data } = await (await createCookieSupabase()).auth.getUser();
  return data?.user?.id || null;
}
async function admin() {
  const id = await myId();
  if (!id) return false;
  const { data: m } = await db().from("members").select("role").eq("id", id).maybeSingle();
  return isAdminRole(String(m?.role || ""));
}

export async function submitPresaleRequest(input: PresaleRequestInput) {
  return savePresaleRequest(input, await myId());
}

export type PresaleRequestRow = { id: string; presale_id: string; presale_name: string; name: string; phone: string; area_type: string | null; agree_third: boolean; third_party: string | null; status: string; memo: string | null; created_at: string };

export async function listPresaleRequests() {
  if (!(await admin())) return { success: false as const, error: "최고관리자만 볼 수 있습니다." };
  const { data, error } = await db().from("presale_requests")
    .select("id, presale_id, presale_name, name, phone, area_type, agree_third, third_party, status, memo, created_at")
    .order("created_at", { ascending: false }).limit(2000);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, rows: (data || []) as PresaleRequestRow[] };
}

export async function updatePresaleRequest(id: string, patch: { status?: string; memo?: string }) {
  if (!(await admin())) return { success: false, error: "최고관리자만 고칠 수 있습니다." };
  const set: Record<string, string> = {};
  if (patch.status && ["new", "contacted", "done"].includes(patch.status)) set.status = patch.status;
  if (typeof patch.memo === "string") set.memo = patch.memo.slice(0, 500);
  const { error } = await db().from("presale_requests").update(set).eq("id", id);
  return error ? { success: false, error: error.message } : { success: true };
}

/* ── 내 분양 신청 (2026-11-26 사장님: MY 에서 보기) — 로그인한 회원 것만: 로그인해 신청한 것 + 회원 휴대폰과 같은 번호로 신청한 것 ── */
async function myRequestsFilter() {
  const id = await myId();
  if (!id) return null;
  const { data: m } = await db().from("members").select("phone").eq("id", id).maybeSingle();
  const d = String(m?.phone || "").replace(/\D/g, "");
  const phone = d.length === 11 ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}` : d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : "";
  return { id, phone };
}

export type MyPresaleRequest = { id: string; presale_id: string; presale_name: string; area_type: string | null; agree_third: boolean; status: string; created_at: string };

export async function listMyPresaleRequests() {
  const me = await myRequestsFilter();
  if (!me) return { success: false as const, error: "로그인이 필요합니다." };
  let q = db().from("presale_requests").select("id, presale_id, presale_name, area_type, agree_third, status, created_at");
  q = me.phone ? q.or(`user_id.eq.${me.id},phone.eq.${me.phone}`) : q.eq("user_id", me.id);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(200);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, rows: (data || []) as MyPresaleRequest[] };
}

/** 내 신청 취소 — 연락처까지 지운다 (동의 철회) */
export async function cancelMyPresaleRequest(id: string) {
  const me = await myRequestsFilter();
  if (!me) return { success: false, error: "로그인이 필요합니다." };
  const { data: r } = await db().from("presale_requests").select("id, user_id, phone").eq("id", id).maybeSingle();
  if (!r || (r.user_id !== me.id && (!me.phone || r.phone !== me.phone))) return { success: false, error: "내 신청만 취소할 수 있습니다." };
  const { error } = await db().from("presale_requests").delete().eq("id", id);
  return error ? { success: false, error: error.message } : { success: true };
}
