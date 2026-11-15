// 공실 등록자 공개 정보 — 안드로이드 앱 공실 상세 [등록자정보]의 프로필 사진 · SNS 단추 (2026-11-15 사장님)
//  GET ?owner=<회원 id>
//  회원 표(members)는 공개 키로 못 읽게 막혀 있어서, 사이트 상세 화면이 이미 보여 주는 것만 여기서 돌려준다:
//  프로필 사진 주소 + SNS 주소(블로그·카페·유튜브 등). 이름·전화·이메일 같은 다른 칸은 주지 않는다.
//  지금 광고 중인(ACTIVE) 공실이 있는 등록자만 — 아무 회원 id 나 넣어 들여다보지 못하게.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

  return NextResponse.json({ success: true, profile_image_url: m?.profile_image_url || null, sns }, { headers });
}
