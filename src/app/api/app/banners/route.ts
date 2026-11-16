// 앱 배너 (2026-11-16 사장님: 앱 배너도 최고관리자 [광고/배너 관리]에서) — 앱은 읽기만, 올리기·기간·순서는 관리 화면에서
//  GET ?p=APP_POPUP | APP_HOME_STRIP | APP_EXIT(종료 창) | APP_MAP_BOTTOM(공실열람 아래) → { success, data: [{ id, title, image_url, link_url, rotate_interval }] } (켜져 있고 기간 안인 것, 순서대로)
//  APP_MAP_BOTTOM 은 &cat=apart|offi|villa|one|biz|sale|auction — 그 종류에 고른 배너만
//  POST { id, kind: "view" | "click" } → 노출·클릭 수 (관리 화면 카드의 "클릭 N 노출 N" 에 그대로 쌓인다)
import { NextRequest, NextResponse } from "next/server";
import { getBannersByPlacement, trackBannerClick, trackBannerView } from "@/app/actions/banner";

const ALLOWED = new Set(["APP_POPUP", "APP_HOME_STRIP", "APP_EXIT", "APP_MAP_BOTTOM"]);

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get("p") || "";
  if (!ALLOWED.has(p)) return NextResponse.json({ success: false, error: "p=APP_POPUP|APP_HOME_STRIP|APP_EXIT|APP_MAP_BOTTOM" }, { status: 400 });
  const res = await getBannersByPlacement(p);
  // 공실열람 아래 큰 배너는 종류마다 (?cat=apart 등) — 관리 화면에서 고른 종류가 link_target "_blank|apart,offi" 뒤쪽에 있다. 없거나 all 이면 모든 종류
  const cat = req.nextUrl.searchParams.get("cat") || "";
  const fitsCat = (b: { link_target?: string | null }) => {
    if (p !== "APP_MAP_BOTTOM") return true;
    const cats = String(b.link_target || "").split("|")[1]?.split(",").filter(Boolean) || [];
    return !cats.length || cats.includes("all") || (!!cat && cats.includes(cat));
  };
  const data = (res.data || []).filter((b: { image_url?: string | null; link_target?: string | null }) => b.image_url && fitsCat(b))
    .map((b: { id: string; title?: string | null; image_url: string; link_url?: string | null; rotate_interval?: number | null }) => ({ id: b.id, title: b.title || "", image_url: b.image_url, link_url: b.link_url || null, rotate_interval: b.rotate_interval || 5 }));
  return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = String(body?.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ success: false }, { status: 400 });
  if (body?.kind === "click") await trackBannerClick(id, "app", req.headers.get("user-agent") || undefined);
  else await trackBannerView(id);
  return NextResponse.json({ success: true });
}
