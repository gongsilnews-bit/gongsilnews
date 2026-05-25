import { NextResponse } from "next/server";
import { refreshOnbidMetadata } from "@/app/actions/onbidSync";

export const maxDuration = 300; // 최대 5분

export async function GET(req: Request) {
  const urlObj = new URL(req.url);
  const sido = urlObj.searchParams.get("sido") || "서울특별시";

  console.log(`🔄 온비드 Metadata 보강 시작 (${sido})...`);
  const result = await refreshOnbidMetadata(sido);
  
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
