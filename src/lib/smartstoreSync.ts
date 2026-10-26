// 스마트스토어 결제 → 공실뉴스부동산 자동 연동. /api/cron/smartstore-sync 가 5분마다 부른다.
// 결제 1건 = 공실뉴스부동산(news_premium) 1년 (2026-10-26 공실스터디부동산을 없애고 합침).
// 이미 기간이 남은 회원은 그 뒤로 1년 늘린다.
// 회원은 주문자 연락처로 찾는다 (스토어 정책상 옵션으로 휴대폰·이메일을 받지 못한다).
// 정확히 한 명일 때만 자동 부여하고, 아니면 관리자 확인(needs_review)으로 넘긴다.
import { createClient } from "@supabase/supabase-js";
import { isAdminRole } from "@/utils/permissionCheck";
import { adminUpdateMember } from "@/app/admin/actions";
import { createNotification } from "@/app/actions/notification";
import {
  dispatchWithoutDelivery,
  getChangedProductOrders,
  getProductOrders,
  type ProductOrderDetail,
} from "@/lib/naverCommerce";

/** 멤버십을 켜는 상품 (스마트스토어 판매자상품코드) */
export const MEMBERSHIP_PRODUCT_CODE = "GS-STUDY-1Y";
const MEMBERSHIP_PRODUCT_ID = "13805832960";
const PLAN_TYPE = "news_premium";
const OLD_PLAN = "study_premium"; // 예전 공실스터디부동산 — 남은 기간은 이어 붙인다

const PAID = ["PAYED", "DELIVERING", "DELIVERED", "PURCHASE_DECIDED"];
const CANCELLED = ["CANCELED", "RETURNED", "CANCELED_BY_NOPAYMENT"];

const CURSOR_KEY = "last_changed_from";
const OVERLAP_MS = 10 * 60 * 1000; // 경계에서 놓치지 않게 10분 겹쳐 조회
const MAX_WINDOW_MS = 24 * 60 * 60 * 1000; // 네이버가 한 번에 주는 최대 구간

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const digits = (s?: string | null) => (s || "").replace(/\D/g, "");

/** 01012345678 → 가입 때 쓸 법한 표기들 */
function phoneVariants(d: string) {
  const v = new Set([d]);
  if (d.length === 11) {
    v.add(`${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`);
    v.add(`${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`);
  } else if (d.length === 10) {
    v.add(`${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`);
  }
  return [...v];
}

const isMembershipProduct = (d: ProductOrderDetail) =>
  d.productOrder.sellerProductCode === MEMBERSHIP_PRODUCT_CODE ||
  String(d.productOrder.productId) === MEMBERSHIP_PRODUCT_ID;

type Row = Record<string, any>;

export interface SyncResult {
  checked: number;
  granted: number;
  needsReview: number;
  revoked: number;
  dispatched: number;
  errors: string[];
}

export async function syncSmartstoreOrders(): Promise<SyncResult> {
  const supabase = db();
  const result: SyncResult = { checked: 0, granted: 0, needsReview: 0, revoked: 0, dispatched: 0, errors: [] };

  const { data: cursorRow } = await supabase
    .from("smartstore_sync_state")
    .select("value")
    .eq("key", CURSOR_KEY)
    .maybeSingle();
  const now = Date.now();
  const lastFrom = cursorRow ? new Date(cursorRow.value).getTime() : now - MAX_WINDOW_MS;
  const from = new Date(Math.max(lastFrom - OVERLAP_MS, now - MAX_WINDOW_MS * 30));
  const to = new Date(Math.min(from.getTime() + MAX_WINDOW_MS, now));

  const changed = await getChangedProductOrders(from, to);
  const ids = [...new Set(changed.map((c) => c.productOrderId))];
  const details = ids.length ? await getProductOrders(ids) : [];

  for (const d of details.filter(isMembershipProduct)) {
    result.checked++;
    try {
      await handleOrder(supabase, d, result);
    } catch (e: any) {
      result.errors.push(`${d.productOrder.productOrderId}: ${e.message}`);
    }
  }

  // 멤버십을 켠 주문은 네이버에 발송처리. 관리자 확인 대기 주문은 연결된 뒤 다음 번에 처리된다.
  const { data: undispatched } = await supabase
    .from("smartstore_orders")
    .select("product_order_id")
    .eq("naver_status", "PAYED")
    .is("dispatched_at", null)
    .eq("status", "granted");
  const toDispatch = (undispatched || []).map((r) => r.product_order_id);
  if (toDispatch.length) {
    try {
      const ok = await dispatchWithoutDelivery(toDispatch);
      if (ok.length) {
        await supabase
          .from("smartstore_orders")
          .update({ dispatched_at: new Date().toISOString(), naver_status: "DELIVERING", updated_at: new Date().toISOString() })
          .in("product_order_id", ok);
      }
      result.dispatched = ok.length;
    } catch (e: any) {
      result.errors.push(`발송처리: ${e.message}`);
    }
  }

  // 오류가 났으면 커서를 옮기지 않아 다음 번에 같은 구간을 다시 본다
  if (result.errors.length === 0) {
    await supabase
      .from("smartstore_sync_state")
      .upsert({ key: CURSOR_KEY, value: to.toISOString(), updated_at: new Date().toISOString() });
  }
  return result;
}

async function handleOrder(supabase: ReturnType<typeof db>, d: ProductOrderDetail, result: SyncResult) {
  const po = d.productOrder;
  const { data: existing } = await supabase
    .from("smartstore_orders")
    .select("*")
    .eq("product_order_id", po.productOrderId)
    .maybeSingle<Row>();

  const base = {
    product_order_id: po.productOrderId,
    order_id: d.order.orderId,
    product_id: po.productId ? String(po.productId) : null,
    seller_product_code: po.sellerProductCode ?? null,
    quantity: po.quantity || 1,
    payment_amount: po.totalPaymentAmount ?? null,
    naver_status: po.productOrderStatus,
    orderer_name: d.order.ordererName ?? null,
    orderer_tel: d.order.ordererTel ?? null,
    paid_at: d.order.paymentDate ?? null,
    raw: d,
    updated_at: new Date().toISOString(),
  };

  if (CANCELLED.includes(po.productOrderStatus)) {
    if (existing?.status === "granted") {
      const outcome = await revoke(supabase, existing);
      await supabase.from("smartstore_orders").update({ ...base, ...outcome }).eq("product_order_id", po.productOrderId);
      if (outcome.status === "revoked") result.revoked++;
      await notifyAdmin(
        outcome.status === "revoked" ? "스마트스토어 결제 취소 → 멤버십 회수" : "스마트스토어 결제 취소 — 멤버십 회수 확인 필요",
        `${base.orderer_name || ""} · ${outcome.review_reason || "이전 등급으로 되돌렸습니다"}`,
        po.productOrderId + ":cancel",
      );
    } else if (existing) {
      await supabase
        .from("smartstore_orders")
        .update({ ...base, status: existing.status === "needs_review" ? "ignored" : existing.status, review_reason: "결제 취소됨" })
        .eq("product_order_id", po.productOrderId);
    }
    return;
  }

  if (!PAID.includes(po.productOrderStatus)) return;

  if (existing) {
    // 이미 처리한 주문은 네이버 상태만 갱신
    await supabase.from("smartstore_orders").update(base).eq("product_order_id", po.productOrderId);
    return;
  }

  const match = await findMember(supabase, base.orderer_tel);
  if (!match.memberId) {
    await supabase.from("smartstore_orders").insert({ ...base, status: "needs_review", review_reason: match.reason });
    result.needsReview++;
    await notifyAdmin("스마트스토어 결제 — 회원 연결 필요", `${base.orderer_name || ""} · ${match.reason}`, po.productOrderId);
    return;
  }

  // 먼저 주문을 기록해 같은 주문이 동시에 두 번 부여되지 않게 한다 (상품주문번호가 기본키)
  const { error: lockError } = await supabase
    .from("smartstore_orders")
    .insert({ ...base, status: "needs_review", review_reason: "부여 중" });
  if (lockError) return;
  const granted = await grant(supabase, match.memberId, base.quantity);
  await supabase.from("smartstore_orders").update(granted).eq("product_order_id", po.productOrderId);
  if (granted.status === "granted") result.granted++;
  else result.needsReview++;
  await notifyAdmin(
    granted.status === "granted" ? "스마트스토어 결제 → 공실뉴스부동산 자동 부여" : "스마트스토어 결제 — 확인 필요",
    `${base.orderer_name || ""} · ${granted.review_reason || "1년 부여 완료"}`,
    po.productOrderId,
  );
}

async function findMember(supabase: ReturnType<typeof db>, tel: string | null) {
  const d = digits(tel);
  if (d.length < 10) return { memberId: null, reason: "주문자 연락처가 없습니다" };
  const { data } = await supabase.from("members").select("id, phone").in("phone", phoneVariants(d));
  const hits = (data || []).filter((m) => digits(m.phone) === d);
  if (hits.length === 1) return { memberId: hits[0].id as string, reason: "" };
  if (hits.length === 0) return { memberId: null, reason: "주문자 연락처와 같은 번호의 회원이 없습니다" };
  return { memberId: null, reason: `같은 번호의 회원이 ${hits.length}명입니다` };
}

/** 공실뉴스부동산(news_premium)을 quantity 년 부여. 남은 기간이 있으면 그 뒤로 이어 붙인다. */
export async function grant(supabase: ReturnType<typeof db>, memberId: string, quantity = 1) {
  const { data: member } = await supabase
    .from("members")
    .select("role, plan_type, plan_start_date, plan_end_date")
    .eq("id", memberId)
    .maybeSingle<Row>();
  if (!member) return { status: "needs_review", member_id: memberId, review_reason: "회원 정보를 찾지 못했습니다" };
  if (isAdminRole(member.role)) return { status: "needs_review", member_id: memberId, review_reason: "관리자 계정이라 등급을 바꾸지 않았습니다" };

  const now = new Date();
  const currentEnd = member.plan_end_date ? new Date(member.plan_end_date) : null;
  const active = !!currentEnd && currentEnd > now;
  const isPaid = member.plan_type === PLAN_TYPE || member.plan_type === OLD_PLAN;
  const targetPlan = PLAN_TYPE;
  const startFrom = isPaid && active ? currentEnd! : now;
  const end = new Date(startFrom);
  end.setFullYear(end.getFullYear() + Math.max(1, quantity));
  const start = member.plan_type === targetPlan && member.plan_start_date && active
    ? member.plan_start_date
    : now.toISOString();

  const res = await adminUpdateMember(memberId, {
    role: "REALTOR",
    plan_type: targetPlan,
    plan_start_date: start,
    plan_end_date: end.toISOString(),
  });
  if (!res.success) return { status: "needs_review", member_id: memberId, review_reason: `등급 변경 실패: ${res.error}` };

  return {
    status: "granted",
    member_id: memberId,
    review_reason: null,
    prev_role: member.role,
    prev_plan_type: member.plan_type,
    prev_plan_start: member.plan_start_date,
    prev_plan_end: member.plan_end_date,
    granted_plan_end: end.toISOString(),
    granted_at: now.toISOString(),
  };
}

/** 취소된 주문의 멤버십을 부여 전 등급으로 되돌린다. 그새 등급이 바뀌었으면 관리자에게 넘긴다. */
async function revoke(supabase: ReturnType<typeof db>, row: Row) {
  const { data: member } = await supabase
    .from("members")
    .select("plan_type, plan_end_date")
    .eq("id", row.member_id)
    .maybeSingle<Row>();
  const unchanged =
    member &&
    (member.plan_type === PLAN_TYPE || member.plan_type === OLD_PLAN) &&
    member.plan_end_date &&
    new Date(member.plan_end_date).getTime() === new Date(row.granted_plan_end).getTime();
  if (!unchanged) {
    return { status: "revoke_review", review_reason: "부여 뒤 회원 등급이 바뀌어 자동으로 되돌리지 않았습니다" };
  }
  const res = await adminUpdateMember(row.member_id, {
    role: row.prev_role,
    plan_type: row.prev_plan_type || "free",
    plan_start_date: row.prev_plan_start,
    plan_end_date: row.prev_plan_end,
  });
  if (!res.success) return { status: "revoke_review", review_reason: `되돌리기 실패: ${res.error}` };
  return { status: "revoked", revoked_at: new Date().toISOString(), review_reason: null };
}

async function notifyAdmin(title: string, body: string, sourceId: string) {
  try {
    await createNotification({
      recipientRole: "ADMIN",
      type: "smartstore_order",
      title,
      body,
      link: "/admin?menu=newsrealty",
      mobileLink: "/m/admin/customer",
      sourceId,
    });
  } catch (e) {
    console.error("[smartstore] 알림 실패:", e);
  }
}
