"use server";

// 시세 지도 단지 정보 수정 요청 (2026-11-02 사장님) — 보내기는 승인된 부동산 회원, 보기·승인은 최고관리자. 계산은 src/utils/aptReports.ts
import { createClient as createCookieSupabase } from "@/utils/supabase/server";
import { getEffectivePlan } from "@/utils/planCheck";
import { isAdminRole } from "@/utils/permissionCheck";
import { db } from "@/utils/aptMap";
import { REPORT_FIELDS, applyReport, reviewAndApply } from "@/utils/aptReports";

async function me() {
  const { data } = await (await createCookieSupabase()).auth.getUser();
  const id = data?.user?.id;
  if (!id) return null;
  const supabase = db();
  const { data: m } = await supabase.from("members").select("id, role, plan_type, plan_end_date, studio_end_date").eq("id", id).maybeSingle();
  if (!m) return null;
  const admin = getEffectivePlan(m) === "admin" || isAdminRole(m.role || "");
  const { data: agency } = await supabase.from("agencies").select("status").eq("owner_id", id).maybeSingle();
  return { id, admin, realtor: admin || agency?.status === "APPROVED" };
}

/** 단지 상세 창 [정보 수정 요청] 보내기 */
export async function submitAptInfoRequest(input: { complexId: string; field: string; exArea?: number | null; value: string; note?: string }) {
  const who = await me();
  if (!who) return { success: false, error: "로그인한 부동산 회원만 보낼 수 있습니다." };
  if (!who.realtor) return { success: false, error: "승인된 부동산 회원만 보낼 수 있습니다." };
  const def = REPORT_FIELDS[input.field];
  const value = String(input.value || "").trim().slice(0, 100);
  if (!def || !input.complexId || !value) return { success: false, error: "고칠 항목과 맞는 값을 넣어 주세요." };
  if (def.numeric && !(Number(value.replace(/[^\d.]/g, "")) > 0)) return { success: false, error: "숫자로 넣어 주세요." };
  const perArea = input.field === "supply" || !!def.perArea;
  if (perArea && !(Number(input.exArea) > 0)) return { success: false, error: "어느 전용면적인지 골라 주세요." };
  const supabase = db();
  const since = new Date(Date.now() - 86400000).toISOString();
  const { count } = await supabase.from("apt_info_reports").select("id", { count: "exact", head: true }).eq("member_id", who.id).eq("source", "request").gte("created_at", since);
  if ((count || 0) >= 20) return { success: false, error: "하루에 20건까지 보낼 수 있습니다." };
  const report = { complex_id: input.complexId, field: input.field, ex_area: perArea ? Number(input.exArea) : null, value };
  const { data: ins, error } = await supabase.from("apt_info_reports").insert({
    ...report, source: "request", note: String(input.note || "").trim().slice(0, 300) || null, member_id: who.id,
  }).select("id").maybeSingle();
  if (error || !ins) return { success: false, error: error?.message || "보내지 못했습니다." };
  // 자동 심사 (2026-11-02) — 결과를 보낸 부동산에게 바로 알려 준다
  const v = await reviewAndApply(ins.id, report);
  return { success: true, decision: v.decision, reason: v.reason };
}

export type AptReportRow = {
  id: number; complex_id: string; complex_name: string; source: string; field: string; ex_area: number | null; value: string; note: string | null;
  member_name: string; status: string; created_at: string; current: string; images: string[];
};

/** 최고관리자 — 요청 목록 */
export async function listAptReports(status: "pending" | "approved" | "rejected" = "pending"): Promise<{ success: boolean; rows?: AptReportRow[]; error?: string }> {
  const who = await me();
  if (!who?.admin) return { success: false, error: "최고관리자만 볼 수 있습니다." };
  const supabase = db();
  const { data, error } = await supabase.from("apt_info_reports").select("*").eq("status", status).order("created_at", { ascending: false }).limit(300);
  if (error) return { success: false, error: error.message };
  const rows = data || [];
  const cids = [...new Set(rows.map((r) => r.complex_id))];
  const mids = [...new Set(rows.map((r) => r.member_id).filter(Boolean))];
  const [{ data: cs }, { data: ms }] = await Promise.all([
    cids.length ? supabase.from("apt_complexes").select("id, name, dong, supply_map, agent_supply, info, agent_info").in("id", cids) : Promise.resolve({ data: [] as any[] }),
    mids.length ? supabase.from("members").select("id, name").in("id", mids) : Promise.resolve({ data: [] as any[] }),
  ]);
  const cmap = new Map((cs || []).map((c: any) => [c.id, c]));
  const mmap = new Map((ms || []).map((m: any) => [m.id, m.name]));
  return {
    success: true,
    rows: rows.map((r) => {
      const c: any = cmap.get(r.complex_id);
      let current = "";
      if (c && r.field === "supply") {
        const all = { ...(c.supply_map || {}), ...(c.agent_supply || {}) };
        const k = Object.keys(all).find((x) => Math.abs(Number(x) - Number(r.ex_area)) <= 0.6);
        current = k ? `${all[k]}㎡` : "없음";
      } else if (c) {
        const v = { ...(c.info || {}), ...(c.agent_info || {}) }[r.field];
        if (v && typeof v === "object") { // 전용면적마다 (계약면적·방/욕실)
          const k = Object.keys(v).find((x) => Math.abs(Number(x) - Number(r.ex_area)) <= 0.6);
          current = k ? String(v[k]) : "없음";
        } else current = v === null || v === undefined || v === "" ? "없음" : String(v);
      }
      return {
        id: r.id, complex_id: r.complex_id, complex_name: c ? `${c.dong} ${c.name}` : r.complex_id, source: r.source, field: r.field,
        ex_area: r.ex_area, value: r.value, note: r.note, member_name: (mmap.get(r.member_id) as string) || "-", status: r.status,
        created_at: r.created_at, current, images: Array.isArray(r.images) ? r.images : [],
      };
    }),
  };
}

/** 최고관리자 — 승인(반영) · 거절 */
export async function decideAptReport(id: number, approve: boolean) {
  const who = await me();
  if (!who?.admin) return { success: false, error: "최고관리자만 할 수 있습니다." };
  const supabase = db();
  const { data: r } = await supabase.from("apt_info_reports").select("*").eq("id", id).maybeSingle();
  if (!r) return { success: false, error: "요청을 찾지 못했습니다." };
  try {
    if (approve && r.field !== "capture") await applyReport(r); // 캡처 요청은 [처리 완료]만 — 값은 관리자가 따로 넣어 반영
    await supabase.from("apt_info_reports").update({ status: approve ? "approved" : "rejected", decided_by: who.id, decided_at: new Date().toISOString() }).eq("id", id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** 단지 상세 창 — 보는 사람 (공실등록 단추를 누구에게 보일지) + 이번 주 조회수 (2026-11-02 사장님: 단지가 보이면 공실등록 유도)
 *  count 가 true 면 이번 조회를 1 센다 (같은 브라우저 하루 한 번은 화면에서 막는다). 조회수 표가 아직 없으면 0 */
export async function aptViewerInfo(complexId: string, count: boolean) {
  const who = await me().catch(() => null);
  let weekViews = 0;
  try {
    const supabase = db();
    if (count && complexId) await supabase.rpc("bump_apt_view", { cid: complexId });
    const since = new Date(Date.now() + 9 * 3600000 - 6 * 86400000).toISOString().slice(0, 10);
    const { data } = await supabase.from("apt_complex_views").select("n").eq("complex_id", complexId).gte("day", since);
    weekViews = (data || []).reduce((t, r) => t + (r.n || 0), 0);
  } catch { /* 조회수는 없어도 된다 */ }
  return { loggedIn: !!who, realtor: !!who?.realtor, admin: !!who?.admin, weekViews };
}

/** 캡처 첨부 요청 — 부동산이 단지정보 화면을 캡처해 붙이고 요청 글을 남긴다 (2026-11-02 사장님)
 *  이미지는 화면에서 WebP 로 압축해 보낸다 (긴 변 1600px). 한 번에 10장, 한 장 1.5MB 까지 */
export async function submitAptInfoCapture(input: { complexId: string; text: string; images: string[] }) {
  const who = await me();
  if (!who) return { success: false, error: "로그인한 부동산 회원만 보낼 수 있습니다." };
  if (!who.realtor) return { success: false, error: "승인된 부동산 회원만 보낼 수 있습니다." };
  const text = String(input.text || "").trim().slice(0, 1000);
  const images = (input.images || []).slice(0, 10); // 여러 장 (2026-11-02 사장님)
  if (!input.complexId || (!text && !images.length)) return { success: false, error: "캡처를 붙이거나 요청사항을 적어 주세요." };
  const supabase = db();
  const since = new Date(Date.now() - 86400000).toISOString();
  const { count } = await supabase.from("apt_info_reports").select("id", { count: "exact", head: true }).eq("member_id", who.id).gte("created_at", since);
  if ((count || 0) >= 20) return { success: false, error: "하루에 20건까지 보낼 수 있습니다." };
  const urls: string[] = [];
  for (const [i, data] of images.entries()) {
    const m = /^data:image\/webp;base64,(.+)$/.exec(data);
    if (!m) return { success: false, error: "이미지를 읽지 못했습니다. 다시 붙여 주세요." };
    const buf = Buffer.from(m[1], "base64");
    if (buf.length > 1.5 * 1024 * 1024) return { success: false, error: "이미지가 너무 큽니다. 필요한 부분만 캡처해 주세요." };
    // 저장소 경로에는 한글을 못 쓴다 (2026-11-02 "Invalid key") — 단지 번호를 영문·숫자로 바꿔 쓴다
    const path = `apt-reports/${Buffer.from(input.complexId).toString("base64url")}/${Date.now()}_${i}.webp`;
    const { error } = await supabase.storage.from("vacancy_images").upload(path, buf, { contentType: "image/webp" });
    if (error) return { success: false, error: `이미지 저장 실패: ${error.message}` };
    urls.push(supabase.storage.from("vacancy_images").getPublicUrl(path).data.publicUrl);
  }
  const { error } = await supabase.from("apt_info_reports").insert({
    complex_id: input.complexId, source: "request", field: "capture", value: text || "(캡처만 첨부)", images: urls, member_id: who.id,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** 최고관리자 — 캡처를 보고 값을 직접 넣어 바로 반영 */
export async function adminSetAptInfo(input: { complexId: string; field: string; exArea?: number | null; value: string }) {
  const who = await me();
  if (!who?.admin) return { success: false, error: "최고관리자만 할 수 있습니다." };
  const report = { complex_id: input.complexId, field: input.field, ex_area: input.exArea ? Number(input.exArea) : null, value: String(input.value || "").trim() };
  if (!report.value) return { success: false, error: "값을 넣어 주세요." };
  try {
    await applyReport(report);
    await db().from("apt_info_reports").insert({ ...report, source: "request", note: "관리자 직접 반영 (캡처 확인)", member_id: who.id, status: "approved", decided_by: who.id, decided_at: new Date().toISOString() });
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
