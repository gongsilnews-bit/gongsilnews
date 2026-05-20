import { NextRequest, NextResponse } from "next/server";
import { saveVacancyFlyer } from "@/app/actions/vacancy";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vacancyId, flyerState } = body;

    if (!vacancyId) {
      return NextResponse.json({ success: false, error: "Vacancy ID is required." }, { status: 400 });
    }

    // Save directly using the server action to the vacancy_flyers table
    const saveRes = await saveVacancyFlyer(vacancyId, flyerState);
    if (!saveRes.success) {
      return NextResponse.json({ success: false, error: saveRes.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error in save-flyer API:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
