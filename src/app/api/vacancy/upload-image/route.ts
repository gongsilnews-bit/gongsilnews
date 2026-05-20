import { NextRequest, NextResponse } from "next/server";
import { uploadVacancyPhoto } from "@/app/actions/vacancy";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const vacancyId = formData.get("vacancyId") as string;
    
    if (!file) {
      return NextResponse.json({ success: false, error: "File is required." }, { status: 400 });
    }

    // Generate a unique path for the flyer custom image
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const fileName = `flyer_${vacancyId || "unknown"}_${timestamp}_${randomId}.webp`;
    const path = `flyers/${fileName}`;

    // Prepare FormData for the server action
    const uploadFormData = new FormData();
    uploadFormData.append("file", file);
    uploadFormData.append("path", path);

    const result = await uploadVacancyPhoto(uploadFormData);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, url: result.url });
  } catch (err: any) {
    console.error("Error in upload-image API:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
