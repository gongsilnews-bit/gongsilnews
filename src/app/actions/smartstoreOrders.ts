"use server";

// 멤버십관리 화면의 "스마트스토어 결제" 목록. 자동 연동이 회원을 못 찾은 주문을 관리자가 연결한다.
import { createClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/utils/supabase/server";
import { isAdminRole } from "@/utils/permissionCheck";
import { grant, syncSmartstoreOrders } from "@/lib/smartstoreSync";

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireAdmin() {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return false;
  const { data: member } = await getAdminClient().from("members").select("role").eq("id", user.id).maybeSingle();
  return isAdminRole(member?.role);
}

export async function getSmartstoreOrders() {
  if (!(await requireAdmin())) return { success: false as const, error: "권한이 없습니다", orders: [] };
  const { data, error } = await getAdminClient()
    .from("smartstore_orders")
    .select("product_order_id, order_id, payment_amount, naver_status, orderer_name, orderer_tel, paid_at, status, review_reason, member_id, granted_plan_end, created_at, members:member_id(name, email, phone)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return { success: false as const, error: error.message, orders: [] };
  return { success: true as const, orders: data || [] };
}

/** 이름·연락처·이메일로 연결할 회원 찾기 */
export async function searchMembersForSmartstore(keyword: string) {
  if (!(await requireAdmin())) return [];
  const k = keyword.trim().replace(/[%,()]/g, "");
  if (k.length < 2) return [];
  const { data } = await getAdminClient()
    .from("members")
    .select("id, name, email, phone, plan_type, plan_end_date")
    .or(`name.ilike.%${k}%,phone.ilike.%${k}%,email.ilike.%${k}%`)
    .limit(10);
  return data || [];
}

/** 확인 필요 주문을 회원에게 연결하고 멤버십을 켠다 */
export async function linkSmartstoreOrder(productOrderId: string, memberId: string) {
  if (!(await requireAdmin())) return { success: false, error: "권한이 없습니다" };
  const supabase = getAdminClient();
  const { data: row } = await supabase
    .from("smartstore_orders")
    .select("status, quantity")
    .eq("product_order_id", productOrderId)
    .maybeSingle();
  if (!row) return { success: false, error: "주문을 찾지 못했습니다" };
  if (row.status !== "needs_review") return { success: false, error: "확인 필요 상태의 주문만 연결할 수 있습니다" };

  const outcome = await grant(supabase, memberId, row.quantity || 1);
  await supabase
    .from("smartstore_orders")
    .update({ ...outcome, updated_at: new Date().toISOString() })
    .eq("product_order_id", productOrderId);
  if (outcome.status !== "granted") return { success: false, error: outcome.review_reason };
  return { success: true };
}

/** 처리하지 않기로 한 주문 (중복 결제 확인, 회수 확인 끝 등) */
export async function ignoreSmartstoreOrder(productOrderId: string) {
  if (!(await requireAdmin())) return { success: false, error: "권한이 없습니다" };
  const { error } = await getAdminClient()
    .from("smartstore_orders")
    .update({ status: "ignored", updated_at: new Date().toISOString() })
    .eq("product_order_id", productOrderId)
    .in("status", ["needs_review", "revoke_review"]);
  return error ? { success: false, error: error.message } : { success: true };
}

/** 5분을 기다리지 않고 지금 주문을 가져온다 */
export async function runSmartstoreSyncNow() {
  if (!(await requireAdmin())) return { success: false, error: "권한이 없습니다" };
  try {
    const r = await syncSmartstoreOrders();
    return { success: r.errors.length === 0, error: r.errors.join(" / "), result: r };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
