import { NextResponse, type NextRequest } from "next/server";
import { getExtensionMember } from "@/utils/extensionMember";
import { parcelAt, buildingsAt, kaptFor, recapAt, unitAt } from "@/utils/publicLand";
import { sizeMixText } from "@/utils/complexRows";

/**
 * 공실등록 — 아파트·오피스텔 단지정보 자동 채우기 (2026-10-24 사장님)
 *  GET ?lat=&lng=&name=<단지명>&dong=<동>&ho=<호>
 *  돌려줌: fill = 공실등록 빈 칸에 넣을 값 (없는 값은 아예 빼서 보낸다 — 지어내지 않음)
 *          complexInfo = 공실에 저장할 단지정보 (공실열람·매물보고서가 쓴다)
 *  등록이 느려지지 않게 화면은 이 답을 기다리지 않고 뒤에서 받는다.
 */
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const member = await getExtensionMember(req);
  if (!member) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const lat = Number(sp.get("lat")), lng = Number(sp.get("lng"));
  if (!lat || !lng) return NextResponse.json({ ok: false, error: "위치가 없어요." }, { status: 400 });
  const p = await parcelAt(lat, lng);
  if (!p) return NextResponse.json({ ok: false, error: "지번을 찾지 못했어요." });
  const dong = String(sp.get("dong") || ""), ho = String(sp.get("ho") || "");

  const [kapt, recap, buildings, unit] = await Promise.all([
    kaptFor(p, String(sp.get("name") || "")).catch(() => null),
    recapAt(p).catch(() => null),
    buildingsAt(p).catch(() => []),
    ho ? unitAt(p, dong, ho).catch(() => null) : Promise.resolve(null),
  ]);
  const dongNo = dong.replace(/[^0-9A-Za-z가-힣]/g, "").replace(/동$/, "");
  const myBld = buildings.find((b) => dongNo && String(b.name).replace(/동$/, "") === dongNo)
    || (buildings.length === 1 ? buildings[0] : undefined);
  const useApr = kapt?.useAprDay || recap?.useAprDay || myBld?.useAprDay || "";

  // 공실등록 빈 칸에 넣을 값 — 없는 것은 넣지 않는다
  const fill: Record<string, string> = {};
  const put = (k: string, v: unknown) => { if (v !== null && v !== undefined && String(v).trim() !== "" && String(v) !== "0") fill[k] = String(v); };
  put("buildingName", kapt?.name || recap?.name || "");
  put("totalUnits", kapt?.households ?? recap?.households ?? null);
  put("approvalYear", /^\d{8}$/.test(useApr) ? useApr.slice(0, 4) : "");
  put("parkingCount", kapt?.parking ?? recap?.parking ?? null);
  put("totalFloor", myBld?.grndFlr ?? null);
  put("structure", unit?.structure || myBld?.structure || "");
  put("elevator", myBld?.elevators || null);
  put("mainUsage", myBld?.purpose || recap?.purpose || "");
  if (unit) {
    put("exclusiveM2", unit.exclusive);
    put("supplyM2", unit.supply);
    put("currentFloor", unit.floorNo);
  }

  // 공실에 저장할 단지정보 (공실열람 상세에서만 읽는다 — 목록·검색은 이 칸을 읽지 않음)
  const complexInfo = (kapt || recap || unit) ? {
    source: { kapt: !!kapt, ledger: !!(recap || myBld), unit: !!unit },
    name: kapt?.name || recap?.name || "",
    households: kapt?.households ?? recap?.households ?? null,
    dongs: kapt?.dongs ?? recap?.dongs ?? null,
    topFloor: kapt?.topFloor ?? null,
    useAprDay: useApr,
    builder: kapt?.builder || "",
    heating: kapt?.heating || "",
    hall: kapt?.hall || "",
    manage: kapt?.manage || "",
    parking: kapt?.parking ?? recap?.parking ?? null,
    evChargers: kapt?.evChargers ?? null,
    subway: kapt?.subway || "",
    subwayTime: kapt?.subwayTime || "",
    school: kapt?.school || "",
    sizes: kapt?.sizes || null,
    sizeMix: sizeMixText(kapt?.sizes), // 공실등록에서 고칠 수 있는 한 줄 (공실열람에 그대로)
    unit: unit ? { dong: unit.dong, ho: unit.ho, floor: unit.floor, exclusive: unit.exclusive, supply: unit.supply } : null,
    kaptCode: kapt?.kaptCode || "",
    fetchedAt: new Date().toISOString(),
  } : null;

  return NextResponse.json({ ok: true, fill, complexInfo });
}
