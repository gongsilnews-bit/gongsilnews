// 안드로이드 앱 고객/문의 (2026-11-17 사장님: 웹 화면 대신 앱 자체 화면)
//  사이트 모바일 /m/admin/customer 와 같은 자료·같은 규칙.
//  사이트 서버 함수(actions/customer.ts)는 회원 번호를 받기만 하고 확인은 하지 않으므로, 여기서는 앱이 보낸 로그인 토큰으로
//  "내 부동산"을 찾고, 고객 한 건을 만질 때마다 그 고객이 내 부동산 것인지 확인한다. 남의 고객은 보지도 만지지도 못한다.
//  최고관리자도 사이트와 같이 자기 부동산의 고객만 본다.
//
//  POST { action: "list" }                          → 내 부동산 고객 전부 (최근 문의 순)
//  POST { action: "create", form }                  → 새 고객 등록 (+ 첫 상담 메모)
//  POST { action: "logs", id }                      → 상담 타임라인
//  POST { action: "log.add", id, content }          → 상담 메모 추가
//  POST { action: "status", id, status, log }       → 진행 상태 변경 (log 가 참이면 "상태를 [..]에서 [..](으)로 변경함." 기록)
//  POST { action: "delete", id }                    → 영구 삭제 (상담 기록도 함께)
import { NextRequest, NextResponse } from "next/server";
import { no, whoAmI, type AdminDb } from "../auth";

const ok = (data: Record<string, unknown> = {}) => NextResponse.json({ success: true, ...data });

const STATUSES = ["신규", "진행중", "계약완료", "보류/종료", "휴지통"];

/** 로그인한 회원의 부동산 번호 (없으면 null) */
async function myAgencyId(db: AdminDb, uid: string) {
  const { data } = await db.from("agencies").select("id").eq("owner_id", uid).limit(1).maybeSingle();
  return (data?.id as string | undefined) || null;
}

/** 이 고객이 내 부동산 것인지 — 맞으면 고객 줄, 아니면 null */
async function myCustomer(db: AdminDb, customerId: string, agencyId: string) {
  if (!customerId) return null;
  const { data } = await db.from("crm_customers").select("id, status, agency_id").eq("id", customerId).maybeSingle();
  return data && data.agency_id === agencyId ? data : null;
}

const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.slice(0, max) : "");

export async function POST(req: NextRequest) {
  const me = await whoAmI(req);
  if (!me) return no("로그인이 필요합니다.", 401);
  const body = await req.json().catch(() => null);
  const action = String(body?.action || "");
  const id = String(body?.id || "");
  const db = me.db;

  const agencyId = await myAgencyId(db, me.user.id);
  if (!agencyId) return no("부동산 정보를 찾을 수 없습니다.", 403);

  if (action === "list") {
    const { data, error } = await db.from("crm_customers").select("*").eq("agency_id", agencyId).order("last_contact_at", { ascending: false });
    return error ? no(error.message, 500) : ok({ data: data || [] });
  }

  if (action === "create") {
    const f = body?.form || {};
    const row = {
      name: str(f.name, 100), phone: str(f.phone, 30), type: str(f.type, 50), budget: str(f.budget, 200),
      area: str(f.area, 200), source: str(f.source, 50), agency_id: agencyId,
    };
    if (!row.name && !row.phone) return no("이름 또는 연락처를 입력하세요.");
    const { data: customer, error } = await db.from("crm_customers").insert([row]).select().single();
    if (error) return no(error.message, 500);
    const notes = str(f.notes);
    if (notes && customer) {
      const { error: logError } = await db.from("crm_logs").insert([{ customer_id: customer.id, type: "memo", content: notes }]);
      if (logError) console.error("앱 고객 첫 메모 저장 실패:", logError);
    }
    return ok({ data: customer });
  }

  // 아래는 고객 한 건을 다루므로 내 고객인지 먼저 본다
  const c = await myCustomer(db, id, agencyId);
  if (!c) return no("내 고객이 아닙니다.", 403);

  const logs = async () => {
    const { data, error } = await db.from("crm_logs").select("*").eq("customer_id", id).order("created_at", { ascending: true });
    return { data: data || [], error };
  };

  if (action === "logs") {
    const r = await logs();
    return r.error ? no(r.error.message, 500) : ok({ data: r.data });
  }

  if (action === "log.add") {
    const content = str(body?.content).trim();
    if (!content) return no("메모 내용을 입력하세요.");
    const { error } = await db.from("crm_logs").insert([{ customer_id: id, type: "memo", content }]);
    if (error) return no(error.message, 500);
    const r = await logs();
    return ok({ data: r.data });
  }

  if (action === "status") {
    const status = String(body?.status || "");
    if (!STATUSES.includes(status)) return no("알 수 없는 상태입니다.");
    const { data, error } = await db.from("crm_customers").update({ status }).eq("id", id).eq("agency_id", agencyId).select().single();
    if (error) return no(error.message, 500);
    if (body?.log) {
      await db.from("crm_logs").insert([{ customer_id: id, type: "system", content: `상태를 [${c.status}]에서 [${status}](으)로 변경함.` }]);
    }
    const r = await logs();
    return ok({ data, logs: r.data });
  }

  if (action === "delete") {
    await db.from("crm_logs").delete().eq("customer_id", id);
    const { error } = await db.from("crm_customers").delete().eq("id", id).eq("agency_id", agencyId);
    return error ? no(error.message, 500) : ok();
  }

  return no("알 수 없는 요청입니다.");
}
