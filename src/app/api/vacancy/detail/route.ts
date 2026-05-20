import { NextRequest, NextResponse } from "next/server";
import { getVacancyDetail } from "@/app/actions/vacancy";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ success: false, error: "Vacancy ID is required." }, { status: 400 });
  }

  const res = await getVacancyDetail(id);

  if (!res.success) {
    return NextResponse.json({ success: false, error: res.error }, { status: 500 });
  }

  return NextResponse.json(res);
}
