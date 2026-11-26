"use server";

// 분양자료 신청 (2026-11-26 사장님 회의) — 표 presale_requests (supabase/migrations/20261126_presale_requests.sql)
//  신청: 누구나(비회원도) · 보기·처리: 최고관리자
//  동의 문구와 "제공받는 자"는 서버가 단지 자료로 다시 만들어 남긴다 (화면이 보낸 글을 믿지 않는다)
import { createClient as createCookieSupabase } from "@/utils/supabase/server";
import { isAdminRole } from "@/utils/permissionCheck";
import { db } from "@/utils/aptMap";
import { collectText, thirdPartyName, thirdText } from "@/utils/presaleConsent";
import { createNotification } from "@/app/actions/notification";

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

export async function submitPresaleRequest(input: { presaleId: string; name: string; phone: string; areaType?: string; agreeCollect: boolean; agreeThird: boolean }) {
  const name = String(input.name || "").trim().slice(0, 30);
  const digits = String(input.phone || "").replace(/\D/g, "");
  if (!input.agreeCollect) return { success: false, error: "개인정보 수집·이용에 동의해 주세요." };
  if (name.length < 2) return { success: false, error: "이름을 적어 주세요." };
  if (!/^01\d{8,9}$/.test(digits)) return { success: false, error: "휴대폰 번호를 확인해 주세요." };
  const phone = digits.length === 11 ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}` : `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  const supabase = db();
  const { data: p } = await supabase.from("presale_complexes").select("id, name, developer, types").eq("id", String(input.presaleId || "")).maybeSingle();
  if (!p) return { success: false, error: "분양 단지를 찾지 못했습니다." };
  const types = Array.isArray(p.types) ? (p.types as { type: string }[]).map((t) => t.type) : [];
  const areaType = input.areaType && types.includes(input.areaType) ? input.areaType : null;
  const agreeThird = Boolean(input.agreeThird);
  const row = {
    presale_id: p.id, presale_name: p.name, name, phone, area_type: areaType,
    agree_collect: true, agree_third: agreeThird,
    third_party: agreeThird ? thirdPartyName(p.name, p.developer) : null,
    consent_text: [collectText(p.name), agreeThird ? thirdText(p.name, p.developer) : ""].filter(Boolean).join("\n\n"),
    user_id: await myId(),
  };
  // 같은 번호로 같은 단지를 하루 안에 또 누르면 새 줄 대신 고친다 (여러 번 눌러도 한 명)
  const since = new Date(Date.now() - 86400000).toISOString();
  const { data: same } = await supabase.from("presale_requests").select("id").eq("presale_id", p.id).eq("phone", phone).gte("created_at", since).maybeSingle();
  const { error } = same
    ? await supabase.from("presale_requests").update(row).eq("id", same.id)
    : await supabase.from("presale_requests").insert(row);
  if (error) return { success: false, error: "신청을 저장하지 못했습니다. 잠시 뒤 다시 해 주세요." };
  if (!same) {
    await createNotification({
      recipientRole: "ADMIN", type: "presale_request",
      title: `분양자료 신청 · ${p.name}`, body: `${name}${areaType ? ` · ${areaType}` : ""}${agreeThird ? " · 분양사 제공 동의" : ""}`,
      link: "/admin?menu=presale_requests",
    }).catch(() => {});
  }
  return { success: true };
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
