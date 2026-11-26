// 분양 단지 지도 자료 (2026-11-26 사장님: 신축/분양 지도에 청약홈 분양 — 아파트 단지처럼 보라색)
//  GET ?sw=lat,lng&ne=lat,lng → { items: [{ id, kind, name, lat, lng, house_type, total_units, receipt_start, receipt_end, winner_date, rep }] }
//  GET ?id=…                  → { item: 전체 칸 (원본 raw 빼고) }
//  청약이 끝나고 3개월 지난 단지는 지도에서 뺀다 (표에는 남김). 자료는 /api/cron/presale 이 하루 한 번 채운다
import { NextResponse } from "next/server";
import { db } from "@/utils/aptMap";
import { repType, type PresaleType } from "@/utils/presale";

export const dynamic = "force-dynamic";

const KEEP_DAYS = 92;
const LIST = "id, kind, name, lat, lng, house_type, total_units, notice_date, receipt_start, receipt_end, winner_date, types";
const FULL = "id, kind, house_manage_no, pblanc_no, name, address, house_type, supply_kind, total_units, notice_date, special_start, special_end, rank1_date, rank2_date, receipt_start, receipt_end, winner_date, contract_start, contract_end, move_in_ym, builder, developer, types, lat, lng"; // 분양사 전화·홈페이지·모집공고 주소는 화면에 내보내지 않는다 (11-26)

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const supabase = db();
  const id = q.get("id");
  if (id) {
    const { data, error } = await supabase.from("presale_complexes").select(FULL).eq("id", id).maybeSingle();
    if (error || !data) return NextResponse.json({ success: false, error: "분양 정보를 찾지 못했습니다." }, { status: 404 });
    return NextResponse.json({ success: true, item: data });
  }
  const sw = (q.get("sw") || "").split(",").map(Number), ne = (q.get("ne") || "").split(",").map(Number);
  if (sw.length !== 2 || ne.length !== 2 || [...sw, ...ne].some((v) => !Number.isFinite(v))) {
    return NextResponse.json({ success: false, error: "지도 범위가 올바르지 않습니다." }, { status: 400 });
  }
  const cut = new Date(Date.now() - KEEP_DAYS * 86400000).toISOString().slice(0, 10);
  const { data, error } = await supabase.from("presale_complexes").select(LIST)
    .gte("lat", sw[0]).lte("lat", ne[0]).gte("lng", sw[1]).lte("lng", ne[1])
    .or(`receipt_end.gte.${cut},and(receipt_end.is.null,notice_date.gte.${cut})`)
    .order("receipt_end", { ascending: false, nullsFirst: false })
    .limit(300);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  const items = (data || []).map(({ types, ...r }) => ({ ...r, rep: repType(types as PresaleType[]) }));
  return NextResponse.json({ success: true, items });
}
