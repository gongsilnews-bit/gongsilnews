import { NextRequest, NextResponse } from "next/server";
import { getVacancyDetail } from "@/app/actions/vacancy";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  // 1. Authenticate user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  // 2. Fetch user's member profile and agency to check role & supply agency info
  const { data: member } = await supabase
    .from("members")
    .select("*, agencies(*)")
    .eq("id", user.id)
    .single();

  if (!member) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  const roleUpper = (member.role || "").toUpperCase();
  const isAuthorized = roleUpper === "ADMIN" || roleUpper === "최고관리자" || roleUpper === "REALTOR" || roleUpper === "부동산회원";

  if (!isAuthorized) {
    return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 });
  }

  if (!id) {
    return NextResponse.json({ success: true, currentMember: member });
  }

  const res = await getVacancyDetail(id);

  if (!res.success) {
    return NextResponse.json({ success: false, error: res.error }, { status: 500 });
  }

  // 유리창 홍보지 QR 이 열 매물 페이지 — 중개사 홈페이지가 켜져 있으면 그 주소, 아니면 공실뉴스 주소
  let qrUrl = `https://www.gongsilnews.com/gongsil/detail/${id}`;
  const ownerId = (res.data as { owner_id?: string } | null)?.owner_id;
  if (ownerId) {
    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: site } = await admin
      .from("homepage_settings")
      .select("subdomain, is_active")
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (site?.subdomain && site.is_active !== false) qrUrl = `https://${site.subdomain}.gongsilnews.com/gongsil/detail/${id}`;
  }

  return NextResponse.json({ ...res, qrUrl, currentMember: member });
}
