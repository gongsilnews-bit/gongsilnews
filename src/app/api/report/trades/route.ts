import { NextResponse, type NextRequest } from "next/server";
import { getExtensionMember } from "@/utils/extensionMember";
import {
  parcelAt, buildingsAt, floorsAt, permitsAt, tradeKindFor, hasRent, dealsFor, lastMonths, isThisBuilding, basisArea, basisLabel, median,
  TRADE_LABEL, type Deal,
} from "@/utils/publicLand";

export const maxDuration = 60; // 10년 치 실거래를 받는 데 시간이 걸린다

/**
 * AI 매물보고서 공공자료 (2026-10-24 사장님: 매물 종류별 구성)
 *  GET ?lat=&lng=&type=<property_type>&sub=<sub_category>&trade=<매매|전세|월세|경매>
 *  돌려줌: 지번 · 건축물대장 · 층별 현황 · 인허가 · 이 건물 실거래 이력(최근 10년) · 주변시세(최근 3년, 반기별 평당가 중앙값) · 비슷한 거래
 *  신고된 값만 쓴다. 지번이 가려진 자료는 면적·준공연도가 대장과 맞을 때만 "이 건물"로 본다.
 */
const P = 3.3058;
export async function GET(req: NextRequest) {
  const member = await getExtensionMember(req);
  if (!member) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const lat = Number(sp.get("lat")), lng = Number(sp.get("lng"));
  if (!lat || !lng) return NextResponse.json({ ok: false, error: "공실 위치(좌표)가 없어요." }, { status: 400 });
  const tradeType = sp.get("trade") || "매매";
  const rentListing = /전세|월세/.test(tradeType);

  const p = await parcelAt(lat, lng);
  if (!p) return NextResponse.json({ ok: false, error: "이 위치의 지번을 찾지 못했어요." });

  const errors: string[] = [];
  const [buildings, floors, permits] = await Promise.all([
    buildingsAt(p).catch((e) => (errors.push(`건축물대장: ${e.message}`), [])),
    floorsAt(p).catch((e) => (errors.push(`층별 현황: ${e.message}`), [])),
    permitsAt(p).catch((e) => (errors.push(`인허가: ${e.message}`), [])),
  ]);
  const main = buildings[0];
  const kind = tradeKindFor(sp.get("type") || "", sp.get("sub") || "", main?.purpose || "");
  const rentChart = rentListing && hasRent(kind); // 상가·사무실 전월세는 공개 자료가 없어 매매로 보여 준다

  // 실거래 — 매매 10년(이 건물 이력) · 전월세 3년(주변시세)
  let sale: Deal[] = [], rent: Deal[] = [];
  try {
    sale = await dealsFor(kind, false, p.sigungu, lastMonths(rentChart ? 60 : 120)); // 전월세 매물은 매매 이력을 참고로만 → 5년
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }
  if (rentChart) {
    try {
      rent = await dealsFor(kind, true, p.sigungu, lastMonths(36));
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  // 이 건물(이 단지) 거래
  const mine = (list: Deal[]) => list.map((d) => ({ d, m: isThisBuilding(d, kind, p, main) })).filter((x) => x.m.ok);
  const fmt = (d: Deal, by: string, isRent: boolean) => {
    const ar = basisArea(d, kind, isRent);
    return {
      date: `${d.ym.slice(0, 4)}.${d.ym.slice(4)}.${String(d.day).padStart(2, "0")}`,
      amount: d.amount, deposit: d.deposit, monthly: d.monthly,
      area: ar, perPyeong: !isRent && d.amount && ar ? Math.round(d.amount / (ar / P)) : null,
      floor: d.floor, excluAr: d.excluAr, name: d.name, buyer: d.buyer, seller: d.seller, cancelled: d.cancelled, matchedBy: by, buildYear: d.buildYear,
    };
  };
  const history = mine(sale).map(({ d, m }) => fmt(d, m.by, false)).sort((a, b) => a.date.localeCompare(b.date));
  const rentHistory = rentChart && (kind === "Apt" || kind === "Offi" || kind === "RH")
    ? mine(rent).map(({ d, m }) => fmt(d, m.by, true)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12)
    : [];

  // 주변시세 — 최근 36달, 반기별 중앙값. 같은 단지(아파트 등)가 8건 넘으면 단지, 아니면 같은 동, 그것도 적으면 구 전체
  const recent36 = new Set(lastMonths(36));
  // 상업·공장: 통건물(일반)과 호실(집합)은 평당가 기준이 달라 섞지 않는다 — 이 매물 대장 종류를 따른다
  const collective = (kind === "Nrg" || kind === "Indu") && /집합/.test(main?.kind || "");
  const sameType = (d: Deal) => !(kind === "Nrg" || kind === "Indu") || rentChart || (d.buildingType || "일반") === (collective ? "집합" : "일반");
  const pool = (rentChart ? rent : sale).filter((d) => recent36.has(d.ym) && !d.cancelled && sameType(d));
  const priceOf = (d: Deal) => {
    const ar = basisArea(d, kind, rentChart);
    if (!ar) return null;
    if (rentChart) return d.deposit && !d.monthly ? d.deposit / (ar / P) : null; // 전세만 (월세는 비교가 어렵다)
    return d.amount ? d.amount / (ar / P) : null;
  };
  const complex = (kind === "Apt" || kind === "Offi" || kind === "RH") ? pool.filter((d) => isThisBuilding(d, kind, p, main).ok) : [];
  const dongPool = pool.filter((d) => d.dong === p.dong);
  const usable = (xs: Deal[]) => xs.filter((d) => priceOf(d) !== null);
  let scope = "", base: Deal[] = [];
  if (usable(complex).length >= 8) { scope = complex[0]?.name || "같은 단지"; base = complex; }
  else if (usable(dongPool).length >= 8) { scope = p.dong; base = dongPool; }
  else { scope = "같은 구 전체"; base = pool; }
  const halves = new Map<string, number[]>();
  for (const d of usable(base)) {
    const y = d.ym.slice(2, 4), h = Number(d.ym.slice(4)) <= 6 ? "상" : "하";
    const k = `${y}년 ${h}`;
    if (!halves.has(k)) halves.set(k, []);
    halves.get(k)!.push(priceOf(d)!);
  }
  const chart = [...halves.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .filter(([, xs]) => xs.length >= 3) // 3건 미만 구간은 한두 건에 휘둘려 뺀다
    .slice(-6)
    .map(([label, xs]) => ({ label, value: Math.round(median(xs) || 0), count: xs.length }));

  // 비슷한 거래 — 최근 12달, 같은 동, 면적 ±35% (대장 면적 기준, 없으면 최근 순)
  const recent12 = new Set(lastMonths(12));
  // 전월세는 한 집(호실) 단위라 건물 대장 면적과 비교하지 않는다
  const subjectAr = rentChart ? null : kind === "Land" || kind === "SH" || kind === "Nrg" || kind === "Indu" ? main?.platArea ?? null : null;
  const examples = (rentChart ? rent : sale)
    .filter((d) => recent12.has(d.ym) && d.dong === p.dong && !d.cancelled && sameType(d))
    .filter((d) => { const ar = basisArea(d, kind, rentChart); return !subjectAr || !ar || (ar >= subjectAr * 0.65 && ar <= subjectAr * 1.35); })
    .sort((a, b) => `${b.ym}${String(b.day).padStart(2, "0")}`.localeCompare(`${a.ym}${String(a.day).padStart(2, "0")}`))
    .slice(0, 6)
    .map((d) => fmt(d, "", rentChart));

  return NextResponse.json({
    ok: true,
    kind, kindLabel: TRADE_LABEL[kind], rentChart, tradeType,
    parcel: { pnu: p.pnu, dong: p.dong, jibunAddr: p.jibunAddr, roadAddr: p.roadAddr },
    buildings, floors, permits,
    history, rentHistory,
    chart: { scope, basis: basisLabel(kind, rentChart, collective), unit: rentChart ? "전세 보증금 만원/평" : "만원/평", points: chart },
    examples,
    errors,
    fetchedAt: new Date().toISOString(),
  });
}
