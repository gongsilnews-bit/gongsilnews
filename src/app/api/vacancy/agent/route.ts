// 공실 등록자 공개 정보 — 안드로이드 앱 공실 상세 [등록자정보]의 프로필 사진 · SNS 단추 (2026-11-15 사장님)
//  GET ?owner=<회원 id>
//  회원 표(members)는 공개 키로 못 읽게 막혀 있어서, 사이트 상세 화면이 이미 보여 주는 것만 여기서 돌려준다:
//  프로필 사진 주소 + SNS 주소(블로그·카페·유튜브 등). 이름·전화·이메일 같은 다른 칸은 주지 않는다.
//  지금 광고 중인(ACTIVE) 공실이 있는 등록자만 — 아무 회원 id 나 넣어 들여다보지 못하게.
//
//  &v=<공실 id> (2026-11-17 사장님: 임대인 등 사무소 없는 일반회원 공실은 앱 [등록자정보]가 "등록자 정보가 없어요"로 나오던 것)
//   → 그 공실이 이 등록자의 광고 중 공실이고 등록자에게 부동산 사무소가 없으면 person: { name, phone } 도 준다
//     (모바일 사이트와 같게: 이름 = 회원 이름 → 공실의 의뢰인 이름, 전화 = 공실에 적은 연락처 → 회원 전화)
//   "부동산노출" 공실은 사이트처럼 부동산회원·최고관리자·본인만 (앱이 보낸 로그인 토큰으로 확인)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { whoAmI } from "@/app/api/app/auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers = { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" };

export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get("owner") || "";
  if (!UUID.test(owner)) return NextResponse.json({ success: false, error: "owner 가 필요합니다." }, { status: 400 });

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
  const { count } = await db.from("vacancies").select("id", { count: "exact", head: true }).eq("owner_id", owner).eq("status", "ACTIVE");
  if (!count) return NextResponse.json({ success: false, error: "not found" }, { status: 404 });

  const { data: m } = await db.from("members").select("profile_image_url, sns_links").eq("id", owner).maybeSingle();
  const links = (m?.sns_links || {}) as Record<string, { url?: string } | undefined>;
  // 사이트 상세와 같은 규칙 — api_info · api_list 는 빼고 주소가 있는 것만
  const sns = Object.keys(links)
    .filter((k) => k !== "api_info" && k !== "api_list" && links[k]?.url)
    .map((k) => ({ key: k, url: String(links[k]!.url) }));

  const vid = req.nextUrl.searchParams.get("v") || "";
  if (!vid) return NextResponse.json({ success: true, profile_image_url: m?.profile_image_url || null, sns }, { headers });

  // 일반회원 등록자 이름·연락처 — 보는 사람에 따라 달라서 공용 캐시에 두지 않는다
  let person: { name: string; phone: string } | null = null;
  const { data: vac } = await db.from("vacancies").select("owner_id, status, exposure_type, client_name, client_phone").eq("id", vid).maybeSingle();
  if (vac && vac.owner_id === owner && vac.status === "ACTIVE") {
    const { data: ag } = await db.from("agencies").select("id").eq("owner_id", owner).maybeSingle();
    if (!ag) {
      let allowed = vac.exposure_type !== "부동산노출" && vac.exposure_type !== "홈페이지전용";
      if (vac.exposure_type === "부동산노출") {
        const me = await whoAmI(req);
        allowed = !!me && (me.isRealtor || me.user.id === owner);
      }
      if (allowed) {
        const { data: mm } = await db.from("members").select("name, phone").eq("id", owner).maybeSingle();
        const name = String(mm?.name || vac.client_name || "").trim();
        const phone = String(vac.client_phone || mm?.phone || "").trim();
        if (name || phone) person = { name, phone };
      }
    }
  }
  return NextResponse.json({ success: true, profile_image_url: m?.profile_image_url || null, sns, person }, { headers: { "Cache-Control": "private, no-store" } });
}
