import { NextRequest, NextResponse } from "next/server";
import { saveVacancyFlyer } from "@/app/actions/vacancy";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vacancyId, flyerState, type = "flyer" } = body;

    if (!vacancyId) {
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

    // Save directly using the server action to the vacancy_flyers table
    const saveRes = await saveVacancyFlyer(vacancyId, flyerState, type);
    if (!saveRes.success) {
      return NextResponse.json({ success: false, error: saveRes.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error in save-flyer API:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
