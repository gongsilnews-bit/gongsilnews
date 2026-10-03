/**
 * 국토부 아파트 실거래가(매매·전월세) — 읽기·정리 (뉴스메이커 "단지 시세" · "우리동네 시세")
 *
 * - 원자료: 공공데이터포털 RTMSDataSvcAptTrade / RTMSDataSvcAptRent (XML)
 * - 숫자는 모두 여기서 계산한다. AI 는 이 표의 숫자로 문장만 쓴다 (숫자를 지어내지 않게).
 * - 금액 단위: 만원. 면적: 전용㎡.
 * - 해제된 거래(cdealType "O")는 뺀다. 실거래는 계약 후 30일 안에 신고되므로 최근 달은 덜 잡힌다.
 */

export type AptTrade = {
  name: string;      // 단지명 (aptNm)
  dong: string;      // 법정동 (umdNm)
  jibun: string;
  area: number;      // 전용㎡
  floor: number;
  price: number;     // 만원
  date: string;      // YYYY-MM-DD
  buildYear: number;
};

export type AptRent = {
  name: string;
  dong: string;
  jibun: string;
  area: number;
  floor: number;
  deposit: number;      // 만원
  monthlyRent: number;  // 만원 (0 이면 전세)
  date: string;
};

/* ── XML 읽기 (의존성 없이 — 응답 모양이 단순하다) ── */
function tag(xml: string, name: string): string {
  const match = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return match ? match[1].trim() : "";
}

const num = (value: string) => Number(String(value || "").replace(/[^\d.-]/g, "")) || 0;
const pad = (value: string | number) => String(value).padStart(2, "0");

export function parseItems(xml: string): string[] {
  return xml.match(/<item>[\s\S]*?<\/item>/g) || [];
}

export function parseTotalCount(xml: string): number {
  return num(tag(xml, "totalCount"));
}

/** 응답 머리의 결과 코드 — "000" 이 아니면 오류 메시지를 돌려준다 */
export function parseError(xml: string): string {
  const code = tag(xml, "resultCode");
  if (code && code !== "000" && code !== "00") return tag(xml, "resultMsg") || `오류 코드 ${code}`;
  if (!code && /<OpenAPI_ServiceResponse>|<cmmMsgHeader>/.test(xml)) return tag(xml, "returnAuthMsg") || tag(xml, "errMsg") || "API 오류";
  return "";
}

export function parseTrades(xml: string): AptTrade[] {
  return parseItems(xml)
    .filter((item) => tag(item, "cdealType") !== "O")
    .map((item) => ({
      name: tag(item, "aptNm"),
      dong: tag(item, "umdNm"),
      jibun: tag(item, "jibun"),
      area: num(tag(item, "excluUseAr")),
      floor: num(tag(item, "floor")),
      price: num(tag(item, "dealAmount")),
      date: `${tag(item, "dealYear")}-${pad(tag(item, "dealMonth"))}-${pad(tag(item, "dealDay"))}`,
      buildYear: num(tag(item, "buildYear")),
    }))
    .filter((trade) => trade.name && trade.price > 0);
}

export function parseRents(xml: string): AptRent[] {
  return parseItems(xml)
    .map((item) => ({
      name: tag(item, "aptNm"),
      dong: tag(item, "umdNm"),
      jibun: tag(item, "jibun"),
      area: num(tag(item, "excluUseAr")),
      floor: num(tag(item, "floor")),
      deposit: num(tag(item, "deposit")),
      monthlyRent: num(tag(item, "monthlyRent")),
      date: `${tag(item, "dealYear")}-${pad(tag(item, "dealMonth"))}-${pad(tag(item, "dealDay"))}`,
    }))
    .filter((rent) => rent.name && rent.deposit > 0);
}

/* ── 공통 ── */

/** 기준 달부터 거꾸로 n 개월 — ["202610", "202609", …] */
export function recentMonths(n: number, now = new Date()): string[] {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const out: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const d = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}`);
  }
  return out;
}

/** 이름 비교용: 공백·괄호·"아파트" 를 뗀다 */
export function normalizeName(value: string): string {
  return String(value || "")
    .replace(/\(.*?\)/g, "")
    .replace(/아파트|apt/gi, "")
    .replace(/[\s·.,-]/g, "")
    .toLowerCase();
}

export function sameComplexName(a: string, b: string): boolean {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return false;
  return x === y || (Math.min(x.length, y.length) >= 2 && (x.includes(y) || y.includes(x)));
}

const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

/** 평 = 전용㎡ ÷ 3.3058 */
export const pyeong = (area: number) => Math.round(area / 3.3058);

/** 면적 묶음 이름 — 전용 84.97㎡ → "84㎡" */
export const areaKey = (area: number) => `${Math.floor(area)}㎡`;

/** 만원 → "24억 5,000만 원" */
export function formatPrice(manwon: number): string {
  if (!manwon) return "-";
  const eok = Math.floor(manwon / 10000);
  const rest = manwon % 10000;
  if (!eok) return `${rest.toLocaleString("ko-KR")}만 원`;
  return rest ? `${eok}억 ${rest.toLocaleString("ko-KR")}만 원` : `${eok}억 원`;
}

const byDateDesc = <T extends { date: string }>(list: T[]) => [...list].sort((a, b) => b.date.localeCompare(a.date));

/* ── 단지 시세 ── */

export type ComplexAreaSummary = {
  areaKey: string;
  pyeong: number;
  tradeCount: number;            // 기간 안 매매 건수
  latest: AptTrade | null;       // 가장 최근 매매
  previous: AptTrade | null;     // 그 직전 매매 (변동 비교용)
  high: AptTrade | null;         // 기간 최고가
  low: AptTrade | null;          // 기간 최저가
  jeonseCount: number;
  latestJeonse: AptRent | null;  // 가장 최근 전세(월세 0)
  jeonseRatio: number | null;    // 최근 6개월 전세 중앙값 ÷ 매매 중앙값 (%)
};

export function summarizeComplex(trades: AptTrade[], rents: AptRent[], now = new Date()) {
  const sixMonthsAgo = recentMonths(6, now).at(-1) || "";
  const inSixMonths = (date: string) => date.replace(/-/g, "").slice(0, 6) >= sixMonthsAgo;
  const keys = [...new Set(trades.map((t) => areaKey(t.area)))];
  const areas: ComplexAreaSummary[] = keys.map((key) => {
    const list = byDateDesc(trades.filter((t) => areaKey(t.area) === key));
    const jeonse = byDateDesc(rents.filter((r) => areaKey(r.area) === key && r.monthlyRent === 0));
    const tradeMedian = median(list.filter((t) => inSixMonths(t.date)).map((t) => t.price));
    const jeonseMedian = median(jeonse.filter((r) => inSixMonths(r.date)).map((r) => r.deposit));
    const sortedByPrice = [...list].sort((a, b) => b.price - a.price);
    return {
      areaKey: key,
      pyeong: pyeong(list[0]?.area || 0),
      tradeCount: list.length,
      latest: list[0] || null,
      previous: list[1] || null,
      high: sortedByPrice[0] || null,
      low: sortedByPrice.at(-1) || null,
      jeonseCount: jeonse.length,
      latestJeonse: jeonse[0] || null,
      jeonseRatio: tradeMedian && jeonseMedian ? Math.round((jeonseMedian / tradeMedian) * 100) : null,
    };
  });
  areas.sort((a, b) => b.tradeCount - a.tradeCount);
  return {
    tradeCount: trades.length,
    buildYear: trades.find((t) => t.buildYear)?.buildYear || 0,
    areas,
    recentTrades: byDateDesc(trades).slice(0, 10),
  };
}

/* ── 우리동네 시세 ── */

/** 우리동네 비교에 쓰는 달 — 이번 달·지난달은 신고가 덜 끝나 빼고, 그 앞 3개월과 또 그 앞 3개월을 비교한다.
 *  (빼지 않으면 "거래 급감"으로 잘못 읽힌다) */
export function localMonths(now = new Date()) {
  const months = recentMonths(8, now);
  return { all: months, recent: months.slice(2, 5), before: months.slice(5, 8), pending: months.slice(0, 2) };
}

export function summarizeLocal(trades: AptTrade[], rents: AptRent[], now = new Date()) {
  const { recent: recentMonthList, before: beforeMonthList, pending } = localMonths(now);
  const months = [...recentMonthList, ...beforeMonthList];
  const recentSet = new Set(recentMonthList);     // 신고가 끝난 최근 3개월
  const beforeSet = new Set(beforeMonthList);     // 그 전 3개월
  const ym = (date: string) => date.replace(/-/g, "").slice(0, 6);
  const perPyeong = (price: number, area: number) => Math.round(price / (area / 3.3058));

  const recent = trades.filter((t) => recentSet.has(ym(t.date)));
  const before = trades.filter((t) => beforeSet.has(ym(t.date)));
  const recentJeonse = rents.filter((r) => r.monthlyRent === 0 && recentSet.has(ym(r.date)));

  const byComplex = new Map<string, AptTrade[]>();
  for (const trade of recent) byComplex.set(trade.name, [...(byComplex.get(trade.name) || []), trade]);
  const topComplexes = [...byComplex.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3)
    .map(([name, list]) => {
      const sorted = byDateDesc(list);
      return {
        name,
        tradeCount: list.length,
        latest: sorted[0],
        medianPerPyeong: median(list.map((t) => perPyeong(t.price, t.area))),
      };
    });

  const label = (ym: string) => `${ym.slice(0, 4)}.${ym.slice(4)}`;
  return {
    periodRecent: `${label(months[2])}~${label(months[0])}`,
    periodBefore: `${label(months[5])}~${label(months[3])}`,
    pendingMonths: `${label(pending[1])}~${label(pending[0])}`, // 신고 진행 중이라 비교에서 뺀 달
    pendingCount: trades.filter((t) => pending.includes(ym(t.date))).length,
    recentCount: recent.length,
    beforeCount: before.length,
    recentMedianPerPyeong: median(recent.map((t) => perPyeong(t.price, t.area))),
    beforeMedianPerPyeong: median(before.map((t) => perPyeong(t.price, t.area))),
    recentJeonseCount: recentJeonse.length,
    recentJeonseMedianPerPyeong: median(recentJeonse.map((r) => perPyeong(r.deposit, r.area))),
    complexCount: byComplex.size,
    topComplexes,
  };
}
