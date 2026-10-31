// AI 성우가 읽을 글 — 숫자·단위를 한글 읽는 법으로 (2026-10-22 사장님)
//  자막(화면 글)은 그대로 두고, 목소리 만들 때만 이 글을 넘긴다.
//  8745 → 팔천칠백사십오 · 136㎡ → 백삼십육 제곱미터 · 32평 → 삼십이 평 · 3개 → 세 개 · 02-542-3011 → 공이 오사이 삼공일일

const D = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
const DIGIT = ["공", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"]; // 전화·번호는 하나씩 (0 = 공)

/** 한자어 수 (0 ~ 9999조) */
function sino(nStr) {
  const s = String(nStr).replace(/^0+(?=\d)/, "");
  if (!/^\d+$/.test(s)) return nStr;
  if (/^0+$/.test(s)) return "영";
  const four = (g) => {
    let out = "";
    const n = g.padStart(4, "0");
    const units = ["천", "백", "십", ""];
    for (let i = 0; i < 4; i++) {
      const d = +n[i];
      if (!d) continue;
      out += (d === 1 && i < 3 ? "" : D[d]) + units[i];
    }
    return out;
  };
  const big = ["", "만", "억", "조", "경"];
  const groups = [];
  for (let i = s.length; i > 0; i -= 4) groups.unshift(s.slice(Math.max(0, i - 4), i));
  let out = "";
  groups.forEach((g, i) => {
    const u = big[groups.length - 1 - i];
    const w = four(g);
    if (!w) return;
    out += (u === "만" && w === "일" ? "" : w) + u + " ";
  });
  return out.trim().replace(/\s+/g, "");
}
/** 고유어 수 (1 ~ 99) — 개·명·시·살 같은 단위 앞에서 */
function native(n) {
  const ones = ["", "한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉"];
  const tens = ["", "열", "스물", "서른", "마흔", "쉰", "예순", "일흔", "여든", "아흔"];
  if (n < 1 || n > 99) return null;
  const t = Math.floor(n / 10), o = n % 10;
  if (t === 2 && o === 0) return "스무";
  return tens[t] + ones[o];
}
const decimal = (s) => {
  const [a, b] = s.replace(/,/g, "").split(".");
  return sino(a) + (b ? " 점 " + b.split("").map((c) => DIGIT[+c]).join("") : "");
};
const NATIVE_UNITS = "개|명|시|살|대|채|곳|가지|마리|잔|권|군데|분께|사람|번째|가구|세대째";
const UNIT_READ = [
  [/(?:㎡|m²|m2|제곱미터)/gi, " 제곱미터"],
  [/(?:㎢|km²|km2)/gi, " 제곱킬로미터"],
  [/㎞|km(?![a-z])/gi, " 킬로미터"],
  [/㎝|cm(?![a-z])/gi, " 센티미터"],
  [/㎜|mm(?![a-z])/gi, " 밀리미터"],
  [/(?<![a-z])m(?![a-z²2])/gi, " 미터"],
  [/㎏|kg(?![a-z])/gi, " 킬로그램"],
  [/%/g, " 퍼센트"],
  [/℃/g, " 도"],
];

function toSpoken(text) {
  let t = String(text || "");
  // 전화번호 — 숫자 하나씩
  t = t.replace(/\b(0\d{1,2})[-.\s](\d{3,4})[-.\s](\d{4})\b/g, (_m, a, b, c) => [a, b, c].map((x) => x.split("").map((d) => DIGIT[+d]).join("")).join(" "));
  t = t.replace(/\b(1[5-9]\d{2})[-](\d{4})\b/g, (_m, a, b) => [a, b].map((x) => x.split("").map((d) => DIGIT[+d]).join("")).join(" "));
  // ㎡ 는 읽지 않는다 — 자막은 그대로 두고 성우만 평으로 (2026-10-31 사장님: "가로 열고 제곱미터" 듣기 싫음)
  //  84㎡(25평) · 84㎡ (약 25.4평) → 약 25평 / 25평(84㎡) · 25평 (전용 84㎡) → 25평 / 84㎡ 만 있으면 → 약 25평 (÷3.3058, 반올림)
  t = t.replace(/(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*(?:㎡|m²|m2|제곱미터)\s*[(（]\s*(?:약\s*)?((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*평\s*[)）]/gi, (_m, py) => `약 ${py}평`);
  t = t.replace(/((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*평\s*[(（][^)）]*(?:㎡|m²|m2|제곱미터)[^)）]*[)）]/gi, (_m, py) => `${py}평`);
  t = t.replace(/((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*(?:㎡|m²|m2|제곱미터)/gi, (m, n) => {
    const py = Math.round(Number(String(n).replace(/,/g, "")) / 3.3058);
    return py >= 1 ? `약 ${py}평` : m;
  });
  // 범위 3~4 → 3에서 4
  t = t.replace(/(\d)\s*[~∼]\s*(\d)/g, "$1에서 $2");
  // 월 — 6월 · 10월
  t = t.replace(/(?<![\d.])(\d{1,2})\s*월/g, (_m, n) => ({ 6: "유월", 10: "시월" })[+n] || `${sino(n)}월`);
  // 고유어 단위 — 3개 → 세 개 (99까지)
  t = t.replace(new RegExp(`(?<![\\d.,])(\\d{1,2})\\s*(${NATIVE_UNITS})`, "g"), (m, n, u) => { const w = native(+n); return w ? `${w} ${u}` : m; });
  // 단위 기호 (숫자 뒤)
  for (const [re, w] of UNIT_READ) t = t.replace(new RegExp(`(\\d)\\s*(${re.source})`, re.flags), (_m, d) => `${d}${w}`);
  // 남은 숫자 (쉼표·소수점 포함) → 한자어
  t = t.replace(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g, (m) => decimal(m));
  return t.replace(/[ \t]+/g, " ").trim();
}

module.exports = { toSpoken, sino, native };
