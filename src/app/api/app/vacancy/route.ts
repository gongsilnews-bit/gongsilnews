// 안드로이드 앱 공실등록 저장 주소 (2026-11-16 사장님: "공실등록하면 모바일웹으로 넘어가면 안 된다 — 기존 회원정보·자료와 똑같이 싱크")
//  앱은 로그인 정보(Authorization: Bearer <access_token>)를 함께 보낸다. 서버가 그 토큰으로 회원을 확인하고,
//  사이트와 똑같은 저장 함수(createVacancy · uploadVacancyPhoto · syncVacancyPhotos — 등록 한도 검사 포함)로 저장한다.
//  올리는 사람(owner_id)은 앱이 보낸 값이 아니라 토큰의 회원으로 정한다.
//
//  GET   → 내 회원 정보(이름·연락처·등급·부동산 여부) — 앱 화면 미리 채우기
//  POST  { action: "create", payload }          → 공실 등록 → { id }
//  POST  multipart { action: "photo", vacancy_id, index, file } → 사진 1장 올리기 → { url }
//  POST  { action: "sync", vacancy_id, urls }   → 사진 순서 맞추기
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createVacancy, syncVacancyPhotos, uploadVacancyPhoto } from "@/app/actions/vacancy";
import { searchNearbyInfrastructure } from "@/app/actions/geocode";

const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
const no = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });

/** 토큰 → 회원 (없으면 null) */
async function whoAmI(req: NextRequest) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const db = admin();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) return null;
  const { data: m } = await db.from("members").select("id, name, phone, role, plan_type").eq("id", data.user.id).maybeSingle();
  if (!m) return null;
  const r = String(m.role || "").toUpperCase();
  const isAdmin = ["ADMIN", "SUPER_ADMIN", "최고관리자"].includes(r);
  const isRealtor = isAdmin || ["REALTOR", "부동산회원"].includes(r);
  return { db, user: data.user, member: m, isAdmin, isRealtor, ownerRole: isAdmin ? "ADMIN" : isRealtor ? "REALTOR" : "USER" };
}

/** 이 공실이 내 것인지 */
async function mine(db: ReturnType<typeof admin>, vacancyId: string, uid: string, isAdmin: boolean) {
  const { data } = await db.from("vacancies").select("owner_id").eq("id", vacancyId).maybeSingle();
  return !!data && (data.owner_id === uid || isAdmin);
}

export async function GET(req: NextRequest) {
  const me = await whoAmI(req);
  if (!me) return no("로그인이 필요합니다.", 401);
  return NextResponse.json({ success: true, member: { id: me.member.id, name: me.member.name, phone: me.member.phone, role: me.member.role, isRealtor: me.isRealtor, isAdmin: me.isAdmin } });
}

// 앱이 보내도 서버가 다시 정하는 칸 (다른 사람 이름으로 올리거나 상태를 마음대로 정하지 못하게)
const SERVER_OWNED = ["owner_id", "owner_role", "id", "vacancy_no", "created_at", "updated_at", "is_onbid", "complex_id"];
// 부동산 회원만 쓰는 칸
const REALTOR_ONLY = ["realtor_commission", "exposure_type", "landlord_name", "landlord_phone", "landlord_memo"];

export async function POST(req: NextRequest) {
  const me = await whoAmI(req);
  if (!me) return no("로그인이 필요합니다.", 401);
  const type = req.headers.get("content-type") || "";

  // 사진 1장
  if (type.includes("multipart/form-data")) {
    const form = await req.formData();
    const vacancyId = String(form.get("vacancy_id") || "");
    const index = Number(form.get("index") || 0);
    const file = form.get("file");
    if (!vacancyId || !(file instanceof File)) return no("사진 또는 공실 번호가 없습니다.");
    if (!(await mine(me.db, vacancyId, me.user.id, me.isAdmin))) return no("내 공실이 아닙니다.", 403);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("path", `${vacancyId}/${index}_${Date.now()}.webp`);
    const up = await uploadVacancyPhoto(fd);
    return up.success ? NextResponse.json({ success: true, url: up.url }) : no(up.error || "사진을 올리지 못했습니다.", 500);
  }

  const body = await req.json().catch(() => null);
  if (!body?.action) return no("요청 형식이 맞지 않습니다.");

  if (body.action === "create") {
    const p: Record<string, unknown> = { ...(body.payload || {}) };
    for (const k of SERVER_OWNED) delete p[k];
    if (!me.isRealtor) for (const k of REALTOR_ONLY) delete p[k];
    if (!p.property_type || !p.trade_type || !p.sido || !p.dong) return no("분류·거래유형·주소는 꼭 넣어 주세요.");
    const status = p.status === "DRAFT" ? "DRAFT" : "ACTIVE";
    // 주변환경(지하철·버스·학교…) — 사이트 공실등록처럼 좌표로 찾아 넣는다 (앱이 보내지 않아도)
    if (!p.infrastructure && typeof p.lat === "number" && typeof p.lng === "number") {
      try { p.infrastructure = await searchNearbyInfrastructure(p.lat, p.lng); } catch { /* 없으면 빈칸 */ }
    }
    const res = await createVacancy({ ...(p as Partial<Parameters<typeof createVacancy>[0]>), owner_id: me.user.id, owner_role: me.ownerRole, consent: true, status } as Parameters<typeof createVacancy>[0]);
    return res.success ? NextResponse.json({ success: true, id: (res as { id?: string }).id }) : no(res.error || "등록하지 못했습니다.", 400);
  }

  if (body.action === "sync") {
    const vacancyId = String(body.vacancy_id || "");
    const urls = Array.isArray(body.urls) ? body.urls.map(String).slice(0, 10) : [];
    if (!vacancyId) return no("공실 번호가 없습니다.");
    if (!(await mine(me.db, vacancyId, me.user.id, me.isAdmin))) return no("내 공실이 아닙니다.", 403);
    const res = await syncVacancyPhotos(vacancyId, urls);
    return res.success ? NextResponse.json({ success: true }) : no(res.error || "사진 순서를 저장하지 못했습니다.", 500);
  }

  return no("모르는 요청입니다.");
}
