import { NextRequest, NextResponse } from "next/server";
import { getVacancyDetail } from "@/app/actions/vacancy";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ success: false, error: "Vacancy ID is required." }, { status: 400 });
  }

  // 1. Authenticate user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  // 2. Fetch user's member profile to check role
  const { data: member } = await supabase
    .from("members")
    .select("role")
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

  const res = await getVacancyDetail(id);

  if (!res.success) {
    return NextResponse.json({ success: false, error: res.error }, { status: 500 });
  }

  return NextResponse.json(res);
}
