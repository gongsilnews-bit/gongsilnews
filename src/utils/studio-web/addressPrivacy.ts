/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 웹 SNS 자동화 — 블로그·SNS·쇼츠 글에 상세주소 안 나오게 (2026-11-14 사장님)
 *  - 위치는 시·구·동까지만. 번지·도로명 번호·동/호수는 쓰지 않는다
 *  - 아파트·오피스텔(상세 표에 "단지명" 칸이 있는 매물)은 단지 이름을 꼭 쓴다
 *  - 그 밖의 매물(상가·사무실·빌라·원룸 등)은 건물 이름도 쓰지 않는다
 *  - 공실뉴스 기사(작업 1)는 그대로. 경매·공매 물건(saleKind 있음)은 공개 정보라 그대로
 *  - 글 끝 법정 표시의 중개사무소 소재지는 법에 필요한 것이라 그대로
 */

const t = (x: unknown) => String(x ?? "").trim();
const empty = (x: string) => !x || x === "-" || x === "없음";
const fieldOf = (v: any, label: string) => {
  const f = (Array.isArray(v?.fields) ? v.fields : []).find((x: any) => x && t(x.label) === label);
  return f ? t(f.value) : "";
};

/** 이 규칙을 쓰는 매물인가 — 일반 공실만 (경매·공매 물건, 뉴스칼럼은 아님) */
export const privacyApplies = (v: any) => Boolean(v && Array.isArray(v.fields) && !v.saleKind);

/** 아파트·오피스텔 — 상세 표가 "단지명" 칸으로 나온다 */
export const isComplex = (v: any) => (Array.isArray(v?.fields) ? v.fields : []).some((x: any) => x && t(x.label) === "단지명");

/** "서울 강남구 대치동 테헤란로86길 12, 디케이빌딩" → "서울 강남구 대치동" (시·구·동까지만) */
export function areaOf(addr: string) {
  const keep: string[] = [];
  for (const w of t(addr).replace(/[,()]/g, " ").split(/\s+/).filter(Boolean)) {
    if (/^[가-힣]+(특별시|광역시|특별자치시|특별자치도|시|도|군|구|읍|면|동|리)$/.test(w) || /^[가-힣]+\d+가$/.test(w) || /^[가-힣]+\d*동$/.test(w) || /^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)$/.test(w)) keep.push(w);
    else break;
  }
  return keep.join(" ");
}

/** 글에 나오면 안 되는 말 (상세주소 · 동/호수 · 단지 아닌 건물 이름) */
export function hiddenBits(v: any): string[] {
  if (!privacyApplies(v)) return [];
  const bits: string[] = [];
  const addr = fieldOf(v, "소재지");
  const area = areaOf(addr);
  const rest = t(addr.slice(addr.indexOf(area) >= 0 ? addr.indexOf(area) + area.length : 0)).replace(/^[,\s]+/, "");
  if (rest) {
    bits.push(rest);
    rest.split(/\s*,\s*/).forEach((p) => p.length >= 2 && bits.push(p)); // "테헤란로86길 12" · "디케이오케이빌딩"
  }
  const building = fieldOf(v, "건물명");
  if (!isComplex(v) && !empty(building) && building.length >= 2) bits.push(building);
  const dongHo = fieldOf(v, "동/호수");
  // 동/호수 칸에 층만 적힌 경우(사무실 "8층")는 주소가 아니라 그대로 둔다
  if (!empty(dongHo) && /\d+\s*(동|호)/.test(dongHo)) { bits.push(dongHo); dongHo.split(/\s+/).forEach((p) => /^\S*\d+(동|호)$/.test(p) && bits.push(p)); }
  const complexName = isComplex(v) ? fieldOf(v, "단지명") : "";
  return Array.from(new Set(bits.map(t).filter((b) => b.length >= 2 && !/^[\d\s-]+$/.test(b) && b !== complexName && b !== area))).sort((a, b) => b.length - a.length);
}

/** AI 에 넘기는 매물 정보 — 소재지는 동까지, 건물명(단지 아님)·동/호수·지번·도로명 칸은 뺀다. 제목에 섞인 상세주소도 뺀다 */
export function privateVacancy(v: any) {
  if (!privacyApplies(v)) return v;
  const bits = hiddenBits(v);
  const complex = isComplex(v);
  const fields = (v.fields as any[])
    .filter((f) => {
      const l = t(f?.label);
      if ((l === "동/호수" && /\d+\s*(동|호)/.test(t(f?.value))) || /지번|도로명|상세\s*주소|번지/.test(l)) return false;
      if (l === "건물명" && !complex) return false;
      return true;
    })
    .map((f) => (t(f.label) === "소재지" ? { ...f, value: areaOf(f.value) || t(f.value) } : f));
  return { ...v, fields, title: scrubText(t(v.title), bits) || v.title };
}

/** AI 에게 덧붙이는 지시 (블로그·SNS·쇼츠) */
export function privacyRule(v: any) {
  if (!privacyApplies(v)) return "";
  const area = areaOf(fieldOf(v, "소재지"));
  const complexName = isComplex(v) ? fieldOf(v, "단지명") : "";
  const bits = hiddenBits(v);
  return `

[주소 공개 범위 — 위 지시보다 먼저 지킬 것]
- 위치는 ${area ? `"${area}"` : "시·구·동"}까지만 쓰십시오. 번지·도로명 번호(예: "○○로12길 34")·동/호수는 쓰지 마십시오.
${complexName && !empty(complexName) ? `- 이 매물은 아파트·오피스텔입니다. 단지 이름(${complexName})은 제목이나 첫 문장에 꼭 넣으십시오.` : "- 건물 이름(○○빌딩·○○타워 등)도 쓰지 마십시오. 동네 이름과 가까운 역·큰길 정도로만 위치를 알려 주십시오."}${bits.length ? `\n- 참조 기사나 자료에 아래 말이 있어도 글에는 쓰지 마십시오: ${bits.map((b) => `"${b}"`).join(", ")}` : ""}`;
}

// 번호 뒤에 이런 말이 오면 주소가 아니다 (55평 · 3층 · 2호선 · 5분 · 2017년 …)
const NOT_ADDR = String.raw`(?![\d-])(?![.,]\d)(?!\s*(?:층|평|호선|호|년|억|만|천|원|m|M|㎡|분|개|세대|%|대|번|위|등|km|미터|회|차|건(?!물)|명|곳|가지|시|일|월|주|배|실|룸|가구))`;
const DONG_NUM = new RegExp(String.raw`([가-힣]{1,8}(?:동|리|가))\s+(?:산\s?)?\d+(?:-\d+)?(?:번지)?` + NOT_ADDR, "g");
const ROAD_NUM = new RegExp(String.raw`([가-힣A-Za-z0-9]{1,12}(?:로|길))\s*\d+(?:-\d+)?` + NOT_ADDR, "g");
const NOT_ROAD = /^(따|새|주|바|서|별|실제|정말|대체|그대|스스|억지|자체|홀|오|길|이|그|저|어디|앞|뒤|옆|위|아래|안|밖)로$|으로$|에로$/;

/** 글에서 상세주소 지우기 — 숨길 말을 빼고, 남은 "○○동 123-4"·"○○로86길 12" 꼴 번호도 뺀다 */
export function scrubText(s: string, bits: string[]) {
  if (!s) return s;
  let out = s;
  for (const b of bits) out = out.split(b).join("");
  out = out.replace(DONG_NUM, "$1").replace(ROAD_NUM, (m, road: string) => (NOT_ROAD.test(road) ? m : road.replace(/\d+번?길$/, "") || road));
  return out
    .replace(/\(\s*[,·]?\s*\)/g, "")
    .replace(/\s*,\s*(?=[,.)\n]|$)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([,.!?)])/g, "$1")
    .replace(/[ \t]+$/gm, "")
    .replace(/^[ \t]+(?=\S)/gm, "");
}

/** AI 답(글 묶음) 안의 모든 글자에 scrubText — 공실뉴스 기사(article)는 빼고 */
export function scrubDeep<T>(x: T, bits: string[], skipKeys: string[] = []): T {
  if (typeof x === "string") return scrubText(x, bits) as unknown as T;
  if (Array.isArray(x)) return x.map((y) => scrubDeep(y, bits)) as unknown as T;
  if (x && typeof x === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(x as Record<string, unknown>)) o[k] = skipKeys.includes(k) ? val : scrubDeep(val, bits);
    return o as T;
  }
  return x;
}
