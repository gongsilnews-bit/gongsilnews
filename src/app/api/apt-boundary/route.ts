// 단지 경계선 (2026-11-16 사장님: 앱 지도에 단지 경계)
//  GET ?ids=a,b,c (최대 80개) → { [id]: [[[lng,lat],...], ...] }  경계가 없으면 그 단지는 빠진다
//  저장된 경계(apt_complexes.boundary)가 있으면 그대로, 없으면 브이월드 연속지적도에서 단지 좌표가 놓인 필지를 받아 저장한다.
//  한계: 단지 좌표 = 대표 지번 하나라 여러 필지에 걸친 큰 단지는 대표 필지만 그려진다.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/aptMap";

export const maxDuration = 30;

type Ring = [number, number][];
type Row = { id: string; lat: number | null; lng: number | null; boundary?: Ring[] | null; boundary_tried_at?: string | null };

const RETRY_MS = 30 * 24 * 3600 * 1000; // 못 찾은 단지는 30일 뒤에 다시

/** 브이월드 — 이 점이 놓인 필지의 경계 (바깥 테두리만, 좌표 소수 6자리) */
async function parcelAt(lat: number, lng: number): Promise<Ring[] | null> {
  const key = process.env.VWORLD_DATA_KEY || process.env.VWORLD_API_KEY || process.env.VWORLD_MAP_KEY;
  if (!key) return null;
  const domain = process.env.VWORLD_DATA_DOMAIN || process.env.VWORLD_DOMAIN || "gongsilnews.com";
  const u = new URL("https://api.vworld.kr/req/data");
  Object.entries({
    service: "data", request: "GetFeature", data: "LP_PA_CBND_BUBUN", key, domain,
    geomFilter: `POINT(${lng} ${lat})`, geometry: "true", attribute: "false", format: "json", size: "1",
  }).forEach(([k, v]) => u.searchParams.set(k, v));
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(8000) });
    const j = await r.json();
    const f = j?.response?.result?.featureCollection?.features?.[0];
    const g = f?.geometry;
    if (!g) return null;
    const polys: number[][][][] = g.type === "MultiPolygon" ? g.coordinates : g.type === "Polygon" ? [g.coordinates] : [];
    const rings = polys.map((p) => (p[0] || []).map(([x, y]) => [Math.round(x * 1e6) / 1e6, Math.round(y * 1e6) / 1e6] as [number, number])).filter((r) => r.length >= 3);
    return rings.length ? rings : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const ids = (req.nextUrl.searchParams.get("ids") || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 80);
  if (!ids.length) return NextResponse.json({});
  const supabase = db();
  let rows: Row[] = [];
  let canSave = true;
  const full = await supabase.from("apt_complexes").select("id, lat, lng, boundary, boundary_tried_at").in("id", ids);
  if (full.error) {
    // 경계 칸을 아직 안 만들었으면(SQL 실행 전) 저장 없이 그때그때 받기만
    canSave = false;
    const { data } = await supabase.from("apt_complexes").select("id, lat, lng").in("id", ids);
    rows = (data as Row[]) || [];
  } else rows = (full.data as Row[]) || [];

  const out: Record<string, Ring[]> = {};
  const todo: Row[] = [];
  const now = Date.now();
  for (const r of rows) {
    if (r.boundary && r.boundary.length) out[r.id] = r.boundary;
    else if (r.lat && r.lng && (!r.boundary_tried_at || now - new Date(r.boundary_tried_at).getTime() > RETRY_MS)) todo.push(r);
  }
  // 브이월드는 6개씩 나눠 묻는다
  for (let i = 0; i < todo.length; i += 6) {
    await Promise.all(todo.slice(i, i + 6).map(async (r) => {
      const b = await parcelAt(r.lat!, r.lng!);
      if (b) out[r.id] = b;
      if (canSave) await supabase.from("apt_complexes").update({ boundary: b, boundary_tried_at: new Date().toISOString() }).eq("id", r.id);
    }));
  }
  return NextResponse.json(out, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
