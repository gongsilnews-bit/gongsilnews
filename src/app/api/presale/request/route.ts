// 앱 [분양자료 신청하기] (2026-11-26) — 웹 신청 창과 같은 저장(utils/presaleRequest). 로그인은 선택(비회원도 신청)
import { NextRequest, NextResponse } from "next/server";
import { savePresaleRequest } from "@/utils/presaleRequest";
import { whoAmI } from "@/app/api/app/auth";

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const me = await whoAmI(req).catch(() => null);
  const r = await savePresaleRequest({
    presaleId: String(b.presaleId || ""), name: String(b.name || ""), phone: String(b.phone || ""),
    areaType: b.areaType ? String(b.areaType) : undefined, agreeCollect: b.agreeCollect === true, agreeThird: b.agreeThird === true,
  }, me?.user?.id || null);
  return NextResponse.json(r, { status: r.success ? 200 : 400 });
}
