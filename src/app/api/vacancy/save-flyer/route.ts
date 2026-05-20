import { NextRequest, NextResponse } from "next/server";
import { updateVacancy, getVacancyDetail } from "@/app/actions/vacancy";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vacancyId, flyerState } = body;

    if (!vacancyId) {
      return NextResponse.json({ success: false, error: "Vacancy ID is required." }, { status: 400 });
    }

    // 1. Fetch current vacancy detail to preserve existing infrastructure settings
    const detailRes = await getVacancyDetail(vacancyId);
    if (!detailRes.success || !detailRes.data) {
      return NextResponse.json({ success: false, error: detailRes.error || "Vacancy not found." }, { status: 404 });
    }

    const currentInfra = detailRes.data.infrastructure || {};

    // 2. Merge flyer settings under the _flyer_settings key of the JSONB column
    const updatedInfra = {
      ...currentInfra,
      _flyer_settings: flyerState
    };

    // 3. Save back to Supabase
    const updateRes = await updateVacancy(vacancyId, { infrastructure: updatedInfra });
    if (!updateRes.success) {
      return NextResponse.json({ success: false, error: updateRes.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error in save-flyer API:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
