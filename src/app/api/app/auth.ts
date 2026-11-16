// 안드로이드 앱 요청의 로그인 확인 — 앱은 Authorization: Bearer <access_token> 을 보낸다
// (/api/app/vacancy · /api/app/manage 가 같이 쓴다)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const adminDb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
export type AdminDb = ReturnType<typeof adminDb>;
export const no = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });

/** 토큰 → 회원 (없으면 null) */
export async function whoAmI(req: NextRequest) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const db = adminDb();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) return null;
  const { data: m } = await db.from("members").select("id, name, phone, role, plan_type").eq("id", data.user.id).maybeSingle();
  if (!m) return null;
  const r = String(m.role || "").toUpperCase();
  const isAdmin = ["ADMIN", "SUPER_ADMIN", "최고관리자"].includes(r);
  const isRealtor = isAdmin || ["REALTOR", "부동산회원"].includes(r);
  return { db, user: data.user, member: m, isAdmin, isRealtor, ownerRole: isAdmin ? "ADMIN" : isRealtor ? "REALTOR" : "USER" };
}

/** 이 공실이 내 것인지 (최고관리자는 모두) */
export async function myVacancy(db: AdminDb, vacancyId: string, uid: string, isAdmin: boolean) {
  const { data } = await db.from("vacancies").select("owner_id").eq("id", vacancyId).maybeSingle();
  return !!data && (data.owner_id === uid || isAdmin);
}

/** 이 기사가 내 것인지 (최고관리자는 모두) */
export async function myArticle(db: AdminDb, articleId: string, uid: string, isAdmin: boolean) {
  const { data } = await db.from("articles").select("author_id").eq("id", articleId).maybeSingle();
  return !!data && (data.author_id === uid || isAdmin);
}
