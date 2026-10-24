import { NextResponse, type NextRequest } from "next/server";
import { getExtensionMember } from "@/utils/extensionMember";
import { parcelAt, typesAt } from "@/utils/publicLand";

/**
 * 매물보고서 9쪽 — 아파트·오피스텔 타입 구성 (2026-10-24 사장님)
 *  GET ?lat=&lng=  →  { ok, types: [{ exclusive, supply, count }], counted, fetchedAt }
 *  큰 단지는 1~2분 — 보고서가 다른 자료를 먼저 채운 뒤 뒤에서 따로 부른다. 공실등록에서는 부르지 않는다.
 */
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const member = await getExtensionMember(req);
  if (!member) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  const lat = Number(req.nextUrl.searchParams.get("lat")), lng = Number(req.nextUrl.searchParams.get("lng"));
  if (!lat || !lng) return NextResponse.json({ ok: false, error: "위치가 없어요." }, { status: 400 });
  const p = await parcelAt(lat, lng);
  if (!p) return NextResponse.json({ ok: false, error: "지번을 찾지 못했어요." });
  const r = await typesAt(p).catch(() => null);
  if (!r) return NextResponse.json({ ok: false, error: "타입 구성을 받지 못했어요." });
  return NextResponse.json({ ok: true, ...r, fetchedAt: new Date().toISOString() });
}
