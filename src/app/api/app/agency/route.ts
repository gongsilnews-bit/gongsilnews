// 앱 부동산 화면 (2026-11-16 사장님: 부동산을 누르면 모바일 웹처럼 사무소 정보 · [공실 N] · [기사 N])
//  GET ?owner=<회원 id> 또는 ?id=<agencies.id> → { success, agency: MapAgency, articles: [...] }
//  사무소 카드·기사 목록은 모바일 웹 공실열람 부동산 화면(MobileAgencyCard)과 같은 함수 — 공실 목록은 앱이 직접 읽는다
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { agencyArticles, listMapAgencies } from "@/app/actions/mapAgencies";

const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get("owner") || "";
  let id = req.nextUrl.searchParams.get("id") || "";
  if (!id && /^[0-9a-f-]{36}$/i.test(owner)) {
    const { data } = await admin().from("agencies").select("id").eq("owner_id", owner).eq("status", "APPROVED").maybeSingle();
    id = data?.id ? String(data.id) : "";
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ success: false, error: "부동산을 찾지 못했습니다." }, { status: 404 });
  const [ag] = await listMapAgencies(null, id);
  if (!ag) return NextResponse.json({ success: false, error: "부동산을 찾지 못했습니다." }, { status: 404 });
  const articles = await agencyArticles(ag.ownerId).catch(() => []);
  return NextResponse.json({ success: true, agency: ag, articles }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
