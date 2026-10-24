/**
 * 공공자료 공용 — AI 매물보고서 부록(지적도·건축물대장·층별 현황·실거래 이력·주변시세, 2026-10-24 사장님)
 *  - 좌표 → 지번·법정동 코드 (카카오)
 *  - 건축물대장 표제부 (공공데이터포털 건축HUB)
 *  - 실거래가 (국토교통부 RTMS, 종류마다 다른 창구) — 한 달씩 받아 서버 기억에 둔다
 *  공부·신고 자료에 있는 값만 쓴다. 지어내지 않는다.
 */

export type Parcel = {
  bcode: string; // 법정동 코드 10자리
  sigungu: string; // 앞 5자리
  bjdong: string; // 뒤 5자리
  dong: string; // 법정동 이름 (예: 논현동)
  mountain: boolean;
  bun: string; // 본번 4자리
  ji: string; // 부번 4자리
  pnu: string;
  jibunAddr: string;
  roadAddr: string;
};

/** 좌표 → 지번·법정동 (카카오). 못 찾으면 null */
export async function parcelAt(lat: number, lng: number): Promise<Parcel | null> {
  const kakao = (path: string) =>
    fetch(`https://dapi.kakao.com/v2/local/geo/${path}?x=${lng}&y=${lat}`, { headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` } }).then((r) => r.json());
  const [addr, region] = await Promise.all([kakao("coord2address.json"), kakao("coord2regioncode.json")]).catch(() => [null, null]);
  const a = addr?.documents?.[0]?.address;
  const b = (region?.documents || []).find((d: { region_type: string }) => d.region_type === "B");
  const bcode: string = b?.code || "";
  if (!a || bcode.length !== 10) return null;
  const mountain = a.mountain_yn === "Y";
  const bun = String(a.main_address_no || 0).padStart(4, "0");
  const ji = String(a.sub_address_no || 0).padStart(4, "0");
  return {
    bcode, sigungu: bcode.slice(0, 5), bjdong: bcode.slice(5),
    dong: String(b?.region_3depth_name || a.region_3depth_name || "").trim(),
    mountain, bun, ji, pnu: `${bcode}${mountain ? "2" : "1"}${bun}${ji}`,
    jibunAddr: a.address_name || "", roadAddr: addr?.documents?.[0]?.road_address?.address_name || "",
  };
}

/** 공공데이터포털 JSON 응답의 item 목록 (하나면 배열로) */
const itemsOf = (j: { response?: { body?: { items?: { item?: unknown } } } }) => {
  const it = j?.response?.body?.items?.item;
  return (Array.isArray(it) ? it : it ? [it] : []) as Record<string, unknown>[];
};
const s = (v: unknown) => String(v ?? "").trim();
const n = (v: unknown) => (v === null || v === undefined || String(v).trim() === "" ? null : Number(v));

export type Building = {
  name: string; kind: string; mainAtch: string; purpose: string; etcPurpose: string; structure: string; roof: string;
  platArea: number | null; archArea: number | null; totArea: number | null; bcRat: number | null; vlRat: number | null; height: number | null;
  grndFlr: number | null; ugrndFlr: number | null; households: number | null; families: number | null; elevators: number; parking: number;
  permitDay: string; useAprDay: string;
};

/** 건축HUB 한 창구 호출 (지번 기준) */
async function hub(service: string, op: string, p: Parcel, rows = 100) {
  const key = process.env.DATA_GO_KR_API_KEY;
  if (!key) throw new Error("공공데이터포털 키(DATA_GO_KR_API_KEY)가 서버에 없어요.");
  const url = `https://apis.data.go.kr/1613000/${service}/${op}?serviceKey=${key}&sigunguCd=${p.sigungu}&bjdongCd=${p.bjdong}&platGbCd=${p.mountain ? 1 : 0}&bun=${p.bun}&ji=${p.ji}&numOfRows=${rows}&pageNo=1&_type=json`;
  return itemsOf(await fetch(url).then((r) => r.json()));
}

/** 건축물대장 표제부 — 주건축물 먼저 */
export async function buildingsAt(p: Parcel): Promise<Building[]> {
  const list = await hub("BldRgstHubService", "getBrTitleInfo", p, 30);
  return list
    .sort((x, y) => Number(s(x.mainAtchGbCd) !== "0") - Number(s(y.mainAtchGbCd) !== "0"))
    .map((b) => ({
      name: s(b.bldNm) || s(b.dongNm),
      kind: s(b.regstrKindCdNm),
      mainAtch: s(b.mainAtchGbCdNm),
      purpose: s(b.mainPurpsCdNm),
      etcPurpose: s(b.etcPurps),
      structure: s(b.strctCdNm),
      roof: s(b.roofCdNm),
      platArea: n(b.platArea), archArea: n(b.archArea), totArea: n(b.totArea),
      bcRat: n(b.bcRat), vlRat: n(b.vlRat), height: n(b.heit),
      grndFlr: n(b.grndFlrCnt), ugrndFlr: n(b.ugrndFlrCnt),
      households: n(b.hhldCnt), families: n(b.fmlyCnt),
      elevators: (n(b.rideUseElvtCnt) || 0) + (n(b.emgenUseElvtCnt) || 0),
      parking: ["indrMechUtcnt", "oudrMechUtcnt", "indrAutoUtcnt", "oudrAutoUtcnt"].reduce((t, k) => t + (Number(b[k]) || 0), 0),
      permitDay: s(b.pmsDay), useAprDay: s(b.useAprDay),
    }));
}

/* ── 층별 현황 ── */
export type Floor = { dong: string; floor: string; floorNo: number; under: boolean; roof: boolean; structure: string; purpose: string; etcPurpose: string; area: number | null; mainAtch: string };
/** 건축물대장 층별개요 — 지하 → 지상 순 */
export async function floorsAt(p: Parcel): Promise<Floor[]> {
  const list = await hub("BldRgstHubService", "getBrFlrOulnInfo", p, 200);
  return list
    .map((f) => ({
      dong: s(f.dongNm),
      floor: s(f.flrNoNm) || `${s(f.flrGbCdNm)} ${s(f.flrNo)}층`,
      floorNo: Number(f.flrNo) || 0,
      under: s(f.flrGbCd) === "10", // 10 지하 · 20 지상 · 30 옥탑
      roof: s(f.flrGbCd) === "30",
      structure: s(f.strctCdNm),
      purpose: s(f.mainPurpsCdNm),
      etcPurpose: s(f.etcPurps),
      area: n(f.area),
      mainAtch: s(f.mainAtchGbCdNm),
    }))
    .sort((x, y) => {
      const g = (f: { under: boolean; roof: boolean }) => (f.under ? 0 : f.roof ? 2 : 1); // 지하 → 지상 → 옥탑
      return g(x) - g(y) || (x.under ? y.floorNo - x.floorNo : x.floorNo - y.floorNo);
    });
}

/* ── 건축인허가 ── */
export type Permit = { kind: string; purpose: string; zoning: string; jimok: string; platArea: number | null; archArea: number | null; totArea: number | null; bcRat: number | null; vlRat: number | null; permitDay: string; startDay: string; useAprDay: string; reason: string };
/** 건축인허가 기본개요 — 최근 것 먼저 */
export async function permitsAt(p: Parcel): Promise<Permit[]> {
  const list = await hub("ArchPmsHubService", "getApBasisOulnInfo", p, 30);
  return list
    .map((x) => ({
      kind: s(x.archGbCdNm), // 신축·증축·대수선·용도변경 …
      purpose: s(x.mainPurpsCdNm),
      zoning: s(x.jiyukCdNm), // 용도지역
      jimok: s(x.jimokCdNm),
      platArea: n(x.platArea), archArea: n(x.archArea), totArea: n(x.totArea), bcRat: n(x.bcRat), vlRat: n(x.vlRat),
      permitDay: s(x.archPmsDay), startDay: s(x.realStcnsDay), useAprDay: s(x.useAprDay),
      reason: s(x.archGbCdNm),
    }))
    .sort((a, b) => (b.permitDay || "").localeCompare(a.permitDay || ""));
}

/* ── 실거래가 ── */
export type TradeKind = "Apt" | "Offi" | "RH" | "SH" | "Nrg" | "Indu" | "Land";
export const TRADE_LABEL: Record<TradeKind, string> = { Apt: "아파트", Offi: "오피스텔", RH: "연립다세대", SH: "단독다가구", Nrg: "상업업무용", Indu: "공장·창고", Land: "토지" };
const HAS_RENT: TradeKind[] = ["Apt", "Offi", "RH", "SH"];

/** 매물 종류(공실등록 값) + 건축물대장 용도 → 실거래 자료 종류 */
export function tradeKindFor(propertyType: string, subCategory: string, ledgerPurpose: string): TradeKind {
  const t = `${propertyType} ${subCategory}`;
  const p = ledgerPurpose || "";
  if (/아파트/.test(subCategory)) return "Apt";
  if (/오피스텔/.test(subCategory)) return "Offi";
  if (/토지/.test(subCategory)) return "Land";
  if (/공장|창고/.test(subCategory)) return "Indu";
  if (/건물|빌딩|상가|사무실|지식산업/.test(subCategory)) return "Nrg";
  if (/빌라|주택|원룸|투룸|단독|다가구|연립|다세대/.test(t)) {
    if (/단독/.test(p)) return "SH"; // 대장이 단독주택(다가구 포함)
    if (/공동/.test(p)) return "RH";
    if (/업무/.test(p)) return "Offi";
    return /단독|다가구/.test(subCategory) ? "SH" : "RH";
  }
  if (/아파트/.test(t)) return /오피스텔/.test(p) ? "Offi" : "Apt";
  return "Nrg";
}
export const hasRent = (k: TradeKind) => HAS_RENT.includes(k);

export type Deal = {
  ym: string; day: string; // 202506 · 11
  amount: number | null; // 매매가 (만원)
  deposit: number | null; monthly: number | null; // 전월세 (만원)
  name: string; dong: string; jibun: string;
  excluAr: number | null; plotAr: number | null; bldAr: number | null; landAr: number | null;
  floor: string; buildYear: string; buyer: string; seller: string; cancelled: boolean; houseType: string; buildingType: string; use: string;
};

const cache = new Map<string, { at: number; deals: Deal[] }>(); // 서버 기억 — 지난달까지는 거의 안 바뀐다
const tag = (x: string, t: string) => { const m = x.match(new RegExp(`<${t}>([^<]*)</${t}>`)); return m ? m[1].trim() : ""; };
const num = (v: string) => { const c = v.replace(/,/g, "").trim(); return c === "" ? null : Number(c); };

/** 한 달 치 실거래 (시군구) */
async function monthDeals(kind: TradeKind, rent: boolean, sigungu: string, ym: string): Promise<Deal[]> {
  const svc = `RTMSDataSvc${kind}${rent ? "Rent" : "Trade"}`;
  const ck = `${svc}:${sigungu}:${ym}`;
  const now = Date.now();
  const thisMonth = ym >= ymOf(new Date());
  const hit = cache.get(ck);
  if (hit && (now - hit.at < (thisMonth ? 6 : 72) * 3600_000)) return hit.deals;
  const key = process.env.DATA_GO_KR_API_KEY;
  const out: Deal[] = [];
  for (let page = 1; page <= 5; page++) {
    // 초당 요청 제한에 걸리면 잠깐 쉬었다 다시 (2026-10-24 — 한꺼번에 부르면 공공데이터포털이 막는다)
    let x = "";
    for (let tryNo = 0; tryNo < 5; tryNo++) {
      x = await fetch(`https://apis.data.go.kr/1613000/${svc}/get${svc}?serviceKey=${key}&LAWD_CD=${sigungu}&DEAL_YMD=${ym}&numOfRows=1000&pageNo=${page}`).then((r) => r.text()).catch(() => "");
      if (!/LIMITED_NUMBER|<html|^$/i.test(x.slice(0, 400))) break;
      await new Promise((r) => setTimeout(r, 700 * (tryNo + 1)));
    }
    if (!/<resultCode>0+</.test(x)) throw new Error(/NOT_REGISTERED/.test(x) ? `${TRADE_LABEL[kind]} ${rent ? "전월세" : "매매"} 실거래 자료 이용 신청이 아직 반영되지 않았어요.` : "실거래 자료를 받지 못했어요.");
    const items = x.match(/<item>[\s\S]*?<\/item>/g) || [];
    for (const it of items) {
      out.push({
        ym, day: tag(it, "dealDay"),
        amount: num(tag(it, "dealAmount")), deposit: num(tag(it, "deposit")), monthly: num(tag(it, "monthlyRent")),
        name: tag(it, "aptNm") || tag(it, "offiNm") || tag(it, "mhouseNm"),
        dong: tag(it, "umdNm"), jibun: tag(it, "jibun"),
        excluAr: num(tag(it, "excluUseAr")), plotAr: num(tag(it, "plottageAr")),
        bldAr: num(tag(it, "buildingAr")) ?? num(tag(it, "totalFloorAr")), landAr: num(tag(it, "dealArea")),
        floor: tag(it, "floor"), buildYear: tag(it, "buildYear"),
        buyer: tag(it, "buyerGbn"), seller: tag(it, "slerGbn"), cancelled: tag(it, "cdealType") === "O",
        houseType: tag(it, "houseType"), buildingType: tag(it, "buildingType"), use: tag(it, "buildingUse") || tag(it, "jimok"),
      });
    }
    const total = Number(tag(x, "totalCount")) || 0;
    if (page * 1000 >= total) break;
  }
  cache.set(ck, { at: now, deals: out });
  return out;
}

export const ymOf = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
/** 최근 n달 (이번 달 포함) — 오래된 것부터 */
export function lastMonths(n: number, from = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(ymOf(new Date(from.getFullYear(), from.getMonth() - i, 1)));
  return out;
}

/** 여러 달 실거래 — 한 번에 한 달씩, 0.2초 간격 (2026-10-24 시험: 동시에 부르면 공공데이터포털이 한동안 막는다) */
export async function dealsFor(kind: TradeKind, rent: boolean, sigungu: string, months: string[]): Promise<Deal[]> {
  const all: Deal[] = [];
  for (const ym of months) {
    const cached = cache.has(`RTMSDataSvc${kind}${rent ? "Rent" : "Trade"}:${sigungu}:${ym}`);
    all.push(...(await monthDeals(kind, rent, sigungu, ym)));
    if (!cached) await new Promise((r) => setTimeout(r, 200));
  }
  return all;
}

const near = (a: number | null, b: number | null, tol: number) => a !== null && b !== null && Math.abs(a - b) <= tol;
/**
 * 이 건물(이 단지)의 거래인가
 *  - 아파트·오피스텔·연립: 지번이 다 나온다 → 같은 동 + 같은 지번
 *  - 단독·상업·공장·토지: 지번 뒷자리가 가려진다(예: 1**) → 앞자리·자릿수 + 면적·준공연도가 대장과 맞을 때만
 */
export function isThisBuilding(d: Deal, kind: TradeKind, p: Parcel, b: Building | undefined): { ok: boolean; by: string } {
  if (d.dong && p.dong && d.dong !== p.dong) return { ok: false, by: "" };
  const bun = String(Number(p.bun)), ji = Number(p.ji) ? String(Number(p.ji)) : "";
  const full = ji ? `${bun}-${ji}` : bun;
  if (kind === "Apt" || kind === "Offi" || kind === "RH") return { ok: d.jibun === full, by: "지번" };
  const masked = d.jibun.replace(/\s/g, "");
  // 집합건물(상가 호실 등)은 지번이 다 나온다 → 그대로 같아야
  if (masked && !masked.includes("*")) return { ok: masked === full, by: "지번" };
  if (masked && (masked[0] !== bun[0] || masked.split("-")[0].length !== bun.length)) return { ok: false, by: "" };
  const year = (b?.useAprDay || "").slice(0, 4);
  if (kind === "Land") return { ok: near(d.landAr, b?.platArea ?? null, 0.5), by: "지번 앞자리·면적" };
  const plot = near(d.plotAr, b?.platArea ?? null, 0.5);
  const bld = near(d.bldAr, b?.totArea ?? null, 1.5);
  const yr = !!year && d.buildYear === year;
  const ok = (plot && bld) || (plot && yr) || (bld && yr);
  return { ok, by: [plot && "대지면적", bld && "연면적", yr && "준공연도"].filter(Boolean).join("·") };
}

/** 평당가 기준 면적 (㎡) — 아파트·오피스텔·연립 = 전용, 단독·일반건물 = 대지, 집합건물 = 건물, 토지 = 거래면적 */
export function basisArea(d: Deal, kind: TradeKind, rent: boolean): number | null {
  if (kind === "Apt" || kind === "Offi" || kind === "RH") return d.excluAr;
  if (kind === "Land") return d.landAr;
  if (rent) return d.bldAr; // 단독다가구 전월세는 연면적만 나온다
  if (kind === "Nrg" || kind === "Indu") return d.buildingType === "집합" ? d.bldAr : d.plotAr;
  return d.plotAr;
}
export const basisLabel = (kind: TradeKind, rent: boolean, collective = false) =>
  kind === "Apt" || kind === "Offi" || kind === "RH" ? "전용면적" : kind === "Land" ? "토지면적" : rent ? "연면적" : collective ? "건물면적" : "대지면적";

export const median = (xs: number[]) => {
  if (!xs.length) return null;
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

/* ── 아파트 단지정보 (K-apt 공동주택관리정보, 2026-10-24) ──
 *  단지 목록(AptListService4) → 지번·이름으로 이 단지 번호(kaptCode) → 기본정보·상세정보(AptBasisInfoServiceV5)
 *  의무관리 단지(대략 150세대 이상)만 있다. 못 찾으면 null — 지어내지 않는다 */
export type KaptInfo = {
  kaptCode: string; name: string; builder: string; heating: string; hall: string; manage: string; saleType: string;
  households: number | null; dongs: number | null; topFloor: number | null; baseFloor: number | null; useAprDay: string;
  sizes: { le60: number | null; le85: number | null; le135: number | null; gt135: number | null };
  parking: number | null; parkingGround: number | null; elevators: number | null; cctv: number | null; evChargers: number | null;
  subway: string; subwayTime: string; busTime: string; school: string; convenience: string; welfare: string;
};
const kget = async (path: string) => {
  const key = process.env.DATA_GO_KR_API_KEY;
  // 초당 요청 한도에 막히면 잠깐 쉬고 다시
  for (let tryNo = 0; tryNo < 3; tryNo++) {
    const txt = await fetch(`https://apis.data.go.kr/1613000/${path}${path.includes("?") ? "&" : "?"}serviceKey=${key}`).then((r) => r.text()).catch(() => "");
    if (/LIMITED_NUMBER|HTTP_ERROR/.test(txt) || !txt) { await new Promise((r) => setTimeout(r, 400 * (tryNo + 1))); continue; }
    try { return JSON.parse(txt)?.response?.body; } catch { return undefined; }
  }
  return undefined;
};
const kaptBasisCache = new Map<string, { at: number; item: Record<string, unknown> | null }>(); // 단지 기본정보는 거의 안 바뀐다 — 하루 기억
async function kaptBasis(code: string) {
  const hit = kaptBasisCache.get(code);
  if (hit && Date.now() - hit.at < 864e5) return hit.item;
  // 초당 요청 한도 — 막히면 잠깐 쉬고 다시 (실패는 기억하지 않는다)
  for (let tryNo = 0; tryNo < 3; tryNo++) {
    const key = process.env.DATA_GO_KR_API_KEY;
    const txt = await fetch(`https://apis.data.go.kr/1613000/AptBasisInfoServiceV5/getAphusBassInfoV5?kaptCode=${code}&serviceKey=${key}`).then((r) => r.text()).catch(() => "");
    if (/LIMITED_NUMBER|HTTP_ERROR/.test(txt) || !txt) { await new Promise((r) => setTimeout(r, 400 * (tryNo + 1))); continue; }
    let item: Record<string, unknown> | null = null;
    try { item = JSON.parse(txt)?.response?.body?.item || null; } catch { return null; }
    kaptBasisCache.set(code, { at: Date.now(), item });
    return item;
  }
  return null;
}
export async function kaptFor(p: Parcel, nameHint = ""): Promise<KaptInfo | null> {
  const body = await kget(`AptListService4/getLegaldongAptList4?bjdCode=${p.bcode}&numOfRows=500&pageNo=1`);
  const list = (body?.items || []) as { kaptCode: string; kaptName: string }[];
  if (!list.length) return null;
  // 맞추기 (2026-10-24: "ACROHILLS논현"↔"아크로힐스논현", 지번 276-1↔276 처럼 다르게 적힌 단지)
  //  도로명 주소 같음 3 · 지번 같음 3 · 본번만 같음 1 · 이름 같음 2 → 2점 이상 중 가장 높은 단지
  const bun = String(Number(p.bun)), ji = Number(p.ji) ? String(Number(p.ji)) : "";
  const norm = (x: string) => x.replace(/\s|아파트|\(.*?\)/g, "").toLowerCase();
  const hint = norm(nameHint);
  const road = (p.roadAddr.match(/([가-힣0-9]+(?:로|길)\s*\d+(?:-\d+)?)\s*$/) || [])[1]?.replace(/\s/g, "") || "";
  // 이름이 비슷한 단지를 먼저, 나머지는 뒤에 (큰 동은 단지가 100개 넘는다 — 반포동)
  const loose = (x: string) => norm(x).replace(/[^가-힣a-z0-9]/g, "");
  const near = (x: string) => !!hint && (loose(x).includes(loose(hint).slice(0, 2)) || loose(hint).includes(loose(x).slice(0, 2)));
  const cands = [...list.filter((c) => near(c.kaptName)), ...list.filter((c) => !near(c.kaptName))].slice(0, 80);
  // 한 번에 하나씩 (초당 한도) — 확실한 단지(5점 이상: 도로명+지번 또는 도로명+이름)를 찾으면 바로 멈춘다
  const basis: (Record<string, unknown> | null)[] = [];
  let best = -1, bestScore = 1;
  for (let i = 0; i < cands.length; i++) {
    const cached = kaptBasisCache.has(cands[i].kaptCode);
    const b = await kaptBasis(cands[i].kaptCode).catch(() => null);
    basis.push(b);
    if (!cached) await new Promise((r) => setTimeout(r, 120));
    if (!b) continue;
    const addr = s(b.kaptAddr), doro = s(b.doroJuso).replace(/\s/g, ""), nm = norm(s(b.kaptName));
    const m = addr.match(new RegExp(`${p.dong}\\s*(\\d+)(?:-(\\d+))?`));
    let score = 0;
    if (road && doro.endsWith(road)) score += 3;
    if (m && m[1] === bun && (m[2] || "") === ji) score += 3;
    else if (m && m[1] === bun) score += 1;
    if (hint && nm && (nm.includes(hint) || hint.includes(nm))) score += 2;
    if (score > bestScore) { bestScore = score; best = i; }
    if (bestScore >= 5) break;
  }
  if (best < 0) return null;
  {
    const c = cands[best], b = basis[best] as Record<string, unknown>;
    const d = (await kget(`AptBasisInfoServiceV5/getAphusDtlInfoV5?kaptCode=${c.kaptCode}`))?.item || {};
    const num = (v: unknown) => (v === null || v === undefined || String(v).trim() === "" ? null : Number(v));
    return {
      kaptCode: c.kaptCode, name: s(b.kaptName), builder: s(b.kaptBcompany), heating: s(b.codeHeatNm), hall: s(b.codeHallNm), manage: s(b.codeMgrNm), saleType: s(b.codeSaleNm),
      households: num(b.kaptdaCnt), dongs: num(b.kaptDongCnt), topFloor: num(b.kaptTopFloor), baseFloor: num(b.kaptBaseFloor), useAprDay: s(b.kaptUsedate),
      sizes: { le60: num(b.kaptMparea60), le85: num(b.kaptMparea85), le135: num(b.kaptMparea135), gt135: num(b.kaptMparea136) },
      parking: num(d.kaptdPcntu) !== null || num(d.kaptdPcnt) !== null ? (num(d.kaptdPcntu) || 0) + (num(d.kaptdPcnt) || 0) : null,
      parkingGround: num(d.kaptdPcnt), elevators: num(d.kaptdEcnt ?? b.kaptdEcntp), cctv: num(d.kaptdCccnt),
      evChargers: num(d.groundElChargerCnt) !== null || num(d.undergroundElChargerCnt) !== null ? (num(d.groundElChargerCnt) || 0) + (num(d.undergroundElChargerCnt) || 0) : null,
      subway: [s(d.subwayLine), s(d.subwayStation)].filter(Boolean).join(" "), subwayTime: s(d.kaptdWtimesub), busTime: s(d.kaptdWtimebus),
      school: s(d.educationFacility), convenience: s(d.convenientFacility), welfare: s(d.welfareFacility),
    };
  }
  return null;
}

/** 단지 전체(총괄표제부) — 동이 여러 지번에 걸친 단지도 여기 합계가 있다 */
export async function recapAt(p: Parcel) {
  const it = (await hub("BldRgstHubService", "getBrRecapTitleInfo", p, 5).catch(() => []))[0];
  if (!it) return null;
  return { name: s(it.bldNm), households: n(it.hhldCnt), units: n(it.hoCnt), dongs: n(it.mainBldCnt), totArea: n(it.totArea), parking: n(it.totPkngCnt), useAprDay: s(it.useAprDay), purpose: s(it.mainPurpsCdNm) };
}

/** 이 호실 — 전유·공용 면적 (호 이름 적는 방식이 건물마다 달라 마지막 숫자 묶음으로 맞춘다. 같은 번호가 여러 동이면 null) */
export async function unitAt(p: Parcel, dongIn: string, hoIn: string) {
  const dongNo = dongIn.replace(/[^0-9A-Za-z가-힣]/g, "").replace(/동$/, "");
  const last = (h: string) => (h.match(/\d+/g) || []).pop() || "";
  const hoNo = last(hoIn);
  if (!hoNo) return null;
  const same = (x: Record<string, unknown>) => {
    const hn = s(x.hoNm);
    if (last(hn) !== hoNo) return false;
    if (!dongNo) return true;
    const inHo = (hn.match(/^([0-9A-Za-z가-힣]+)동/) || [])[1] || "";
    return s(x.dongNm).replace(/동$/, "") === dongNo || inHo === dongNo;
  };
  const tries: (() => Promise<Record<string, unknown>[]>)[] = [
    ...(dongNo ? [`${dongNo}동`, dongNo] : []).map((d) => async () => {
      const key = process.env.DATA_GO_KR_API_KEY;
      const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${key}&sigunguCd=${p.sigungu}&bjdongCd=${p.bjdong}&platGbCd=${p.mountain ? 1 : 0}&bun=${p.bun}&ji=${p.ji}&dongNm=${encodeURIComponent(d)}&hoNm=${hoNo}&numOfRows=100&pageNo=1&_type=json`;
      return itemsOf(await fetch(url).then((r) => r.json()));
    }),
    async () => {
      const key = process.env.DATA_GO_KR_API_KEY;
      const all: Record<string, unknown>[] = [];
      for (let page = 1; page <= 3; page++) {
        const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${key}&sigunguCd=${p.sigungu}&bjdongCd=${p.bjdong}&platGbCd=${p.mountain ? 1 : 0}&bun=${p.bun}&ji=${p.ji}&numOfRows=1000&pageNo=${page}&_type=json`;
        const rows = itemsOf(await fetch(url).then((r) => r.json()));
        all.push(...rows);
        if (rows.length < 1000) break;
      }
      return all;
    },
  ];
  for (const run of tries) {
    const mine = (await run().catch(() => [])).filter(same);
    if (!mine.length || new Set(mine.map((x) => `${s(x.dongNm)}|${s(x.hoNm)}`)).size > 1) continue;
    const ex = mine.filter((x) => s(x.exposPubuseGbCdNm) === "전유"), pub = mine.filter((x) => s(x.exposPubuseGbCdNm) === "공용");
    const sum = (xs: Record<string, unknown>[]) => Math.round(xs.reduce((t, x) => t + (Number(x.area) || 0), 0) * 100) / 100;
    // 주거공용(계단·복도)만 공급면적에 — 기타공용(주차장·관리동 등)은 뺀다
    const resPub = pub.filter((x) => !/주차|기계|전기|관리|경비|커뮤니티|지하/.test(`${s(x.mainPurpsCdNm)} ${s(x.etcPurps)}`) && !/^지하/.test(s(x.flrNoNm)));
    return {
      dong: s(mine[0].dongNm), ho: s(mine[0].hoNm), floor: s(ex[0]?.flrNoNm || mine[0].flrNoNm), floorNo: n(ex[0]?.flrNo ?? mine[0].flrNo),
      purpose: s(ex[0]?.mainPurpsCdNm), structure: s(ex[0]?.strctCdNm),
      exclusive: ex.length ? sum(ex) : null, common: pub.length ? sum(pub) : null, supply: ex.length ? Math.round((sum(ex) + sum(resPub)) * 100) / 100 : null,
    };
  }
  return null;
}

/** 타입 구성 (매물보고서 9쪽, 2026-10-24 사장님) — 같은 지번 전유부를 모두 받아 주거 호실을 전용면적별로 센다
 *  한 번에 100줄까지만 줘서 큰 단지는 1~2분 걸린다 → 보고서에서만 · 뒤에서 따로 받는다.
 *  중간에 끊기면 틀린 숫자를 내지 않고 null. 상가·사무실 호실은 용도로 거른다. */
export type UnitType = { exclusive: number; supply: number | null; count: number };
export async function typesAt(p: Parcel): Promise<{ types: UnitType[]; counted: number } | null> {
  const key = process.env.DATA_GO_KR_API_KEY;
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const rows: Record<string, unknown>[] = [];
  let total = Infinity;
  for (let page = 1; (page - 1) * 100 < total; page++) {
    if (page > 400) return null; // 4만 줄 넘는 곳은 세지 않는다
    const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${key}&sigunguCd=${p.sigungu}&bjdongCd=${p.bjdong}&platGbCd=${p.mountain ? 1 : 0}&bun=${p.bun}&ji=${p.ji}&numOfRows=100&pageNo=${page}&_type=json`;
    let body: { totalCount?: unknown; items?: { item?: unknown } } | undefined;
    for (let tryNo = 0; tryNo < 4 && !body; tryNo++) {
      const txt = await fetch(url).then((r) => r.text()).catch(() => "");
      if (/LIMITED_NUMBER|HTTP_ERROR/.test(txt) || !txt) { await wait(500 * (tryNo + 1)); continue; }
      try { body = JSON.parse(txt)?.response?.body; } catch { /* 아래에서 null */ }
      if (!body) return null;
    }
    if (!body) return null;
    total = Number(body.totalCount) || 0;
    const it = body.items?.item;
    rows.push(...((Array.isArray(it) ? it : it ? [it] : []) as Record<string, unknown>[]));
    await wait(120);
  }
  // 호실마다 전유 합 · 주거공용 합 (공급면적 = 전유 + 계단·복도 같은 주거공용, unitAt 과 같은 기준)
  const units = new Map<string, { ex: number; pub: number; home: boolean }>();
  for (const x of rows) {
    const k = `${s(x.dongNm)}|${s(x.hoNm)}`;
    const u = units.get(k) || { ex: 0, pub: 0, home: false };
    const use = `${s(x.mainPurpsCdNm)} ${s(x.etcPurps)}`;
    if (s(x.exposPubuseGbCdNm) === "전유") {
      u.ex += Number(x.area) || 0;
      if (/공동주택|아파트|오피스텔|주택/.test(use) && !/근린|판매|상가/.test(use)) u.home = true;
    } else if (!/주차|기계|전기|관리|경비|커뮤니티|지하/.test(use) && !/^지하/.test(s(x.flrNoNm))) u.pub += Number(x.area) || 0;
    units.set(k, u);
  }
  const groups = new Map<string, { exclusive: number; supplies: Map<string, number>; count: number }>();
  for (const u of units.values()) {
    if (!u.home || u.ex < 10) continue;
    const ex = Math.round(u.ex * 100) / 100, k = ex.toFixed(2);
    const g = groups.get(k) || { exclusive: ex, supplies: new Map(), count: 0 };
    g.count++;
    if (u.pub > 0) { const sk = (Math.round((u.ex + u.pub) * 100) / 100).toFixed(2); g.supplies.set(sk, (g.supplies.get(sk) || 0) + 1); }
    groups.set(k, g);
  }
  if (!groups.size) return null;
  const types = [...groups.values()].map((g) => {
    const top = [...g.supplies.entries()].sort((a, b) => b[1] - a[1])[0];
    return { exclusive: g.exclusive, supply: top ? Number(top[0]) : null, count: g.count };
  }).sort((a, b) => a.exclusive - b.exclusive);
  return { types, counted: types.reduce((t, x) => t + x.count, 0) };
}
