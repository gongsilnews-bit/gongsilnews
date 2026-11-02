/**
 * 공실열람 지도 [아파트 시세] — 서버(src/utils/aptMap.ts)와 화면(AptPriceLayer)이 같이 쓰는 계산.
 * DB·네트워크 없이 숫자만 다룬다.
 */

/** 시군구 코드 → 카카오 주소 검색 앞부분. 넓힐 때 여기에 더한다 */
export const LAWD_NAMES: Record<string, string> = {
  "11110": "서울특별시 종로구", "11140": "서울특별시 중구", "11170": "서울특별시 용산구", "11200": "서울특별시 성동구",
  "11215": "서울특별시 광진구", "11230": "서울특별시 동대문구", "11260": "서울특별시 중랑구", "11290": "서울특별시 성북구",
  "11305": "서울특별시 강북구", "11320": "서울특별시 도봉구", "11350": "서울특별시 노원구", "11380": "서울특별시 은평구",
  "11410": "서울특별시 서대문구", "11440": "서울특별시 마포구", "11470": "서울특별시 양천구", "11500": "서울특별시 강서구",
  "11530": "서울특별시 구로구", "11545": "서울특별시 금천구", "11560": "서울특별시 영등포구", "11590": "서울특별시 동작구",
  "11620": "서울특별시 관악구", "11650": "서울특별시 서초구", "11680": "서울특별시 강남구", "11710": "서울특별시 송파구",
  "11740": "서울특별시 강동구",
  // 경기도 (2026-11-02 사장님: 경기 남부부터). 화성·부천은 구가 새로 생겨 카카오 검색은 시까지만 붙인다
  "41131": "경기도 성남시 수정구", "41133": "경기도 성남시 중원구", "41135": "경기도 성남시 분당구",
  "41461": "경기도 용인시 처인구", "41463": "경기도 용인시 기흥구", "41465": "경기도 용인시 수지구",
  "41111": "경기도 수원시 장안구", "41113": "경기도 수원시 권선구", "41115": "경기도 수원시 팔달구", "41117": "경기도 수원시 영통구",
  "41591": "경기도 화성시", "41593": "경기도 화성시", "41595": "경기도 화성시", "41597": "경기도 화성시",
  "41171": "경기도 안양시 만안구", "41173": "경기도 안양시 동안구", "41290": "경기도 과천시", "41430": "경기도 의왕시",
  "41410": "경기도 군포시", "41210": "경기도 광명시", "41450": "경기도 하남시", "41370": "경기도 오산시", "41220": "경기도 평택시",
  "41271": "경기도 안산시 상록구", "41273": "경기도 안산시 단원구", "41390": "경기도 시흥시", "41610": "경기도 광주시",
  "41500": "경기도 이천시", "41550": "경기도 안성시", "41670": "경기도 여주시",
  "41150": "경기도 의정부시", "41192": "경기도 부천시", "41194": "경기도 부천시", "41196": "경기도 부천시",
  "41250": "경기도 동두천시", "41281": "경기도 고양시 덕양구", "41285": "경기도 고양시 일산동구", "41287": "경기도 고양시 일산서구",
  "41310": "경기도 구리시", "41360": "경기도 남양주시", "41480": "경기도 파주시", "41570": "경기도 김포시", "41630": "경기도 양주시",
  "41650": "경기도 포천시", "41800": "경기도 연천군", "41820": "경기도 가평군", "41830": "경기도 양평군",
};

export type Trade = { a: number; p: number; d: string; f: number };               // 매매: 전용㎡ · 만원 · YYYY-MM-DD · 층
export type Rent = { a: number; dep: number; m: number; d: string; f: number };   // 전월세: 보증금·월세 만원 (m 0 = 전세)
export type AreaSummary = { a: number; s: number | null; n: number; p: number; d: string; f: number; lo: number; hi: number };

/** 공급면적 찾기: 전용㎡가 ±0.05 안에서 가장 가까운 것 */
export function supplyFor(map: Record<string, number> | null | undefined, area: number): number | null {
  if (!map) return null;
  let best: number | null = null, gap = 0.051;
  for (const [k, v] of Object.entries(map)) {
    const g = Math.abs(Number(k) - area);
    if (g < gap) { gap = g; best = v; }
  }
  return best;
}

/** 면적 이름 — 국토부 신고 전용면적 그대로 "전용 84.97㎡" (2026-11-02 사장님: 국토부 전용면적만 정확하게.
 *  공급면적으로 바꾼 "33평"은 쓰지 않는다 — 공급은 상세 창에 건축물대장 참고로만). s 는 예전 호출과 맞추려고 남긴 자리 */
export const areaLabel = (a: number, _s?: number | null) => `전용 ${Number(a.toFixed(2))}㎡`;

/** 만원 → "30.9억" · "9,500만" (지도 표시) */
export const shortPrice = (manwon: number) =>
  manwon >= 10000 ? `${Math.round(manwon / 1000) / 10}억` : `${manwon.toLocaleString("ko-KR")}만`;

/** 만원 → "30억 8,500" (호갱노노식 — "만" 없이) */
export const fullPrice = (manwon: number) => {
  const eok = Math.floor(manwon / 10000), rest = manwon % 10000;
  if (!eok) return `${rest.toLocaleString("ko-KR")}만`;
  return rest ? `${eok}억 ${rest.toLocaleString("ko-KR")}` : `${eok}억`;
};

/**
 * 법정 중개보수 상한 (주택, 2021-10-19 개정 · 서울 조례). 만원 단위. 부가세 별도.
 * 매매·교환 / 임대차(월세는 보증금 + 월세×100, 그 합이 5천만 원 미만이면 ×70)
 */
const SALE = [[5000, 0.006, 25], [20000, 0.005, 80], [90000, 0.004, 0], [120000, 0.005, 0], [150000, 0.006, 0], [Infinity, 0.007, 0]] as const;
const LEASE = [[5000, 0.005, 20], [10000, 0.004, 30], [60000, 0.003, 0], [120000, 0.004, 0], [150000, 0.005, 0], [Infinity, 0.006, 0]] as const;

export function brokerFee(kind: "sale" | "lease", manwon: number, monthly = 0) {
  let base = manwon;
  if (kind === "lease" && monthly > 0) {
    base = manwon + monthly * 100;
    if (base < 5000) base = manwon + monthly * 70;
  }
  const row = (kind === "sale" ? SALE : LEASE).find(([upTo]) => base < upTo)!;
  const [, rate, cap] = row;
  const fee = Math.floor(base * rate);
  return { base, rate, fee: cap ? Math.min(fee, cap) : fee, cap };
}
