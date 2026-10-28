// 장면별 모션 자동 고르기 (2026-10-28 사장님: 장면 초안 → [모션 자동 입히기] 한 번에 장면마다 모션 · 정확함보다 다양하게)
//  클립 문장(성우가 읽는 글)을 읽어 어울리는 후보를 고르고, 최근에 쓴 것은 피해 돌려 가며 고른다. AI 를 부르지 않는다.
//  가격 → 가격 강조·폭발 말풍선·줌 펀치 · 숫자 여럿 → 정보 카드·막대 그래프 · 숫자 하나 → 큰 숫자·줌 펀치·빨간 동그라미
//  역·장소 → 위치 핀·화살표·하단 바 · 장점 나열 → 장점 체크 · 따옴표 → 인용 · 물음 → 질문·글리치 · 그 밖 → 범용 효과 여러 가지
//  글자는 문장에 있는 값만 쓴다 (지어내지 않는다)

export type ScenePlan = { template: string; label: string; data: Record<string, unknown> };

export const SCENE_LABELS: Record<string, string> = {
  "scene-price": "가격 강조", "scene-info": "정보 카드", "scene-pin": "위치 핀", "scene-check": "장점 체크", "scene-kinetic": "키네틱 강조",
  "scene-quote": "인용 카드", "scene-question": "질문 카드", "scene-number": "큰 숫자", "scene-lower": "하단 바", "scene-box": "테두리 상자",
  "scene-split": "반쪽 색판", "scene-sticky": "메모지", "scene-spot": "스포트라이트", "scene-typing": "타자", "scene-bubble": "말풍선",
  "fx-circle": "빨간 동그라미", "fx-punch": "줌 펀치", "fx-glitch": "글리치", "fx-burst": "폭발 말풍선", "fx-arrow": "화살표",
  "fx-marker": "형광펜", "fx-sparkle": "반짝 입자", "fx-bars": "막대 그래프",
};
/** 내용과 상관없이 쓰는 범용 효과 — 돌려 가며 */
const GENERIC = ["scene-kinetic", "fx-marker", "scene-lower", "fx-circle", "scene-box", "fx-sparkle", "scene-split", "scene-sticky", "fx-punch", "scene-spot", "scene-bubble", "scene-typing", "fx-arrow", "fx-glitch"];

const FEATURES = ["역세권", "더블역세권", "남향", "남서향", "남동향", "동향", "서향", "채광", "주차", "엘리베이터", "풀옵션", "신축", "리모델링", "테라스", "복층", "반려동물", "보안", "CCTV", "시스템에어컨", "에어컨", "붙박이장", "베란다", "발코니", "학군", "공원", "조용", "넓은", "깔끔", "즉시 입주", "입주 가능"];
const PRICE = /(매매|전세|월세|보증금|매매가|전세금)?[^\d]{0,6}?(\d+(?:\.\d+)?\s*억(?:\s*[\d,]+\s*(?:만\s*원?)?)?|[\d,]{2,}\s*만\s*원)/;
const STATION = /([가-힣A-Za-z0-9]{1,10}역)(?!세권)/;
const DIST = /(도보\s*\d+\s*분|차로\s*\d+\s*분|\d+\s*분\s*거리|\d+\s*m\s*거리|바로\s*옆|인근|맞은편)/;
const PLACE = /([가-힣A-Za-z0-9]{1,12}(?:정류장|IC|나들목|초등학교|중학교|고등학교|공원|마트|병원|시장|백화점|대학교))/;
const NUM = /(\d[\d,]*(?:\.\d+)?)\s*(%|퍼센트|명|만\s*원|원|억|개월|개|배|년|분|초|평|층|세대|가구|건|곳|대|m²|㎡)/g;

const tradeOf = (s: string) => (/월세/.test(s) ? "월세" : /전세/.test(s) ? "전세" : /매매/.test(s) ? "매매" : "");
const clean = (s: string) => String(s || "").replace(/\s+/g, " ").trim();

/** 짧은 문구 — 쉼표 앞 첫 마디(두 낱말 이상)나 앞 6낱말, 나머지는 둘째 줄 */
function phrase(s: string) {
  const c = clean(s).replace(/[.!。]+$/, "");
  const first = c.split(/[,，]/)[0].trim();
  const base = first.split(" ").length >= 2 ? first : c;
  const words = base.split(" ").slice(0, 6);
  const title = words.join(" ");
  const rest = clean(c.slice(c.indexOf(title) + title.length).replace(/^[,，\s]+/, ""));
  const noun = (w: string) => !/(며|고|다|요|니다|습니다|있는|하는|된|할|을|를|은|는|이|가)$/.test(w.replace(/[,.?]/g, ""));
  const highlight = (words.find((w) => /\d/.test(w)) || [...words].filter(noun).sort((a, b) => b.length - a.length)[0] || words[0] || "").replace(/[,.?]/g, "");
  return { title, sub: rest.length > 26 ? rest.slice(0, 24) + "…" : rest, highlight };
}
/** 숫자 + 단위 모두 */
function numbers(s: string) {
  const out: { v: string; unit: string; l: string }[] = [];
  for (const m of s.matchAll(NUM)) {
    const before = s.slice(0, m.index).trim().split(/\s+/).slice(-1)[0] || "";
    out.push({ v: m[1], unit: m[2].replace(/\s+/g, ""), l: before.replace(/[,.은는이가을를의에]$/, "").slice(0, 8) });
  }
  return out;
}
/** 부동산 숫자 칸 — 평·㎡·방·욕실·층 */
function stats(s: string): { v: string; unit: string; l: string }[] {
  const out: { v: string; unit: string; l: string }[] = [];
  for (const a of s.matchAll(/(전용|공급|대지|연면적)?\s*(?:면적)?\s*(\d+(?:\.\d+)?)\s*평/g)) out.push({ v: a[2], unit: "평", l: a[1] === "공급" ? "공급면적" : a[1] === "대지" ? "대지" : a[1] === "연면적" ? "연면적" : "전용면적" });
  if (!out.length) { const m2 = s.match(/(\d+(?:\.\d+)?)\s*(?:㎡|m²|제곱미터)/); if (m2) out.push({ v: m2[1], unit: "㎡", l: "면적" }); }
  const room = s.match(/방\s*(\d+)\s*개?|(\d+)\s*개의?\s*방|(\d+)\s*룸/);
  if (room) out.push({ v: room[1] || room[2] || room[3], unit: "개", l: "방" });
  const bath = s.match(/(?:욕실|화장실)\s*(\d+)\s*개?|(\d+)\s*개의?\s*(?:욕실|화장실)/);
  if (bath) out.push({ v: bath[1] || bath[2], unit: "개", l: "욕실" });
  const floor = s.match(/(지상\s*)?(\d+)\s*층/);
  if (floor && out.length < 3) out.push({ v: floor[2], unit: "층", l: floor[1] ? "지상" : "층수" });
  return out.slice(0, 3);
}

/** 이 문장에 어울리는 후보 (앞일수록 잘 맞음) */
function candidates(s: string): string[] {
  const c: string[] = [];
  const pr = s.match(PRICE);
  if (pr && /억|만\s*원/.test(pr[2])) c.push("scene-price", "fx-burst", "fx-punch");
  const st = stats(s), nums = numbers(s);
  if (st.length >= 2) c.push("scene-info", "fx-bars");
  else if (nums.length >= 2) c.push("fx-bars", "scene-info");
  if (nums.length === 1 || st.length === 1) c.push("scene-number", "fx-circle", "fx-punch");
  if (STATION.test(s) || PLACE.test(s)) c.push("scene-pin", "fx-arrow", "scene-lower");
  if (FEATURES.filter((f) => s.includes(f)).length >= 2) c.push("scene-check");
  if (/["“”]|라고\s*(말|밝|전했|설명)/.test(s)) c.push("scene-quote");
  if (/\?|까요|일까|인가요|을까/.test(s)) c.push("scene-question", "fx-glitch");
  return c;
}

/** 고른 모션에 맞는 글자 (문장에서). 맞는 값이 없으면 null */
function dataFor(template: string, s: string, vacancy?: { trade?: string; price?: string }): Record<string, unknown> | null {
  const ph = phrase(s);
  const pr = s.match(PRICE);
  const price = pr && /억|만\s*원/.test(pr[2]) ? pr[2].replace(/\s*원$/, "").replace(/\s+/g, " ").trim() : "";
  const nums = numbers(s), st = stats(s);
  switch (template) {
    case "scene-price": return price || vacancy?.price ? { trade: tradeOf(s) || vacancy?.trade || "", price: price || vacancy?.price, sub: "" } : null;
    case "scene-info": { const it = st.length ? st : nums.slice(0, 3); return it.length ? { title: "", items: it } : null; }
    case "fx-bars": { const it = nums.length >= 2 ? nums.slice(0, 4) : st; return it.length >= 2 ? { items: it, label: ph.title } : null; }
    case "scene-number": { const n = nums[0] || st[0]; return n ? { num: n.v, unit: n.unit, label: n.l || ph.title } : null; }
    case "scene-pin": { const m = s.match(STATION) || s.match(PLACE); const d = s.match(DIST); return m ? { title: m[1], sub: d ? d[1] : "" } : null; }
    case "fx-arrow": { const m = s.match(STATION) || s.match(PLACE); const d = s.match(DIST); return { title: m ? `${m[1]}${d ? " " + d[1] : ""}` : ph.title, highlight: m ? m[1] : ph.highlight }; }
    case "scene-check": { const f = FEATURES.filter((x) => s.includes(x)); const parts = f.length ? f : clean(s).replace(/[.!?]+$/, "").split(/[,，·]/).map((x) => x.trim()).filter((x) => x && x.length <= 14); return parts.length >= 2 ? { title: "이런 점이 좋아요", items: parts.slice(0, 4) } : null; }
    case "scene-quote": { const q = s.match(/["“]([^"”]{2,40})["”]/); return { title: q ? q[1] : ph.title, sub: "" }; }
    case "fx-burst": { const n = nums[0] ? `${nums[0].v}${nums[0].unit}` : ""; return { highlight: price || n || ph.highlight, title: ph.title }; }
    case "fx-punch": case "fx-circle": case "fx-marker": case "fx-sparkle": case "fx-glitch":
      return { title: ph.title, highlight: (price && ph.title.includes(price.split(" ")[0]) ? price.split(" ")[0] : "") || (nums[0] && ph.title.includes(nums[0].v) ? nums[0].v : "") || ph.highlight };
    default: return { title: ph.title, sub: ph.sub, highlight: ph.highlight };
  }
}

/** 장면 전체 계획 — 내용 후보 중 최근 3개에 안 쓴 것, 없으면 범용 효과를 돌려 가며 */
export function planAll(texts: string[], vacancy?: { trade?: string; price?: string }): ScenePlan[] {
  const recent: string[] = [];
  let g = 0;
  return texts.map((raw) => {
    const s = clean(raw);
    const pool = [...candidates(s), ...GENERIC.slice(g % GENERIC.length), ...GENERIC.slice(0, g % GENERIC.length)];
    let pick: ScenePlan | null = null;
    for (const t of pool) {
      if (recent.includes(t)) continue;
      const d = dataFor(t, s, vacancy);
      if (!d) continue;
      pick = { template: t, label: SCENE_LABELS[t] || t, data: d };
      if (GENERIC.includes(t)) g = GENERIC.indexOf(t) + 1;
      break;
    }
    if (!pick) pick = { template: "scene-kinetic", label: SCENE_LABELS["scene-kinetic"], data: dataFor("scene-kinetic", s)! };
    recent.push(pick.template);
    if (recent.length > 3) recent.shift();
    return pick;
  });
}
export const planScene = (text: string, vacancy?: { trade?: string; price?: string }) => planAll([text], vacancy)[0];
/** 회원이 고른 모션으로 — 맞는 값이 없으면 키네틱 문구 */
export function planAs(text: string, template: string, vacancy?: { trade?: string; price?: string }): ScenePlan {
  const d = dataFor(template, clean(text), vacancy);
  return d ? { template, label: SCENE_LABELS[template] || template, data: d } : { template: "scene-kinetic", label: SCENE_LABELS["scene-kinetic"], data: dataFor("scene-kinetic", clean(text))! };
}
