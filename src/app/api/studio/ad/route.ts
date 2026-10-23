import { NextRequest, NextResponse } from "next/server";
import { logStudioAd, pickStudioAd } from "@/app/actions/studioAds";

/**
 * 스튜디오 기다리는 동안 광고 (2026-10-22 · docs/2026-10-22_studio_wait_ads_plan.md)
 * 앱이 AI 덮개(studio-app/src/ai-busy.js)에 직접 그리는 스크립트가 같은 출처로 부른다 — 서버 액션을 못 부르므로.
 *  GET  ?place=ai&last=3   → 보여 줄 광고 하나 (없거나 최고관리자면 { ad: null })
 *  POST { id, place, kind: view|watch|click, seconds } → 숫자만 남김 (회원 아이디 없음)
 */
export async function GET(req: NextRequest) {
  const place = req.nextUrl.searchParams.get("place") || "ai";
  const last = Number(req.nextUrl.searchParams.get("last")) || undefined;
  try {
    return NextResponse.json({ ad: await pickStudioAd(place, last) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ad: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    await logStudioAd(Number(b.id), String(b.place), b.kind, Number(b.seconds) || 0);
  } catch {}
  return NextResponse.json({ ok: true });
}
