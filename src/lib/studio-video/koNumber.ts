/**
 * AI 목소리에 보낼 글만 숫자를 한글 발음으로 (2026-11-05 사장님: "읽는 것은 이천십칠년, 자막에는 2017년")
 *  자막·클립 글은 그대로 두고, 서버가 TTS 로 보내기 직전에만 바꾼다
 *  예) 2017년 → 이천십칠 년 · 5억 3,000만원 → 오억 삼천만원 · 3.5% → 삼 점 오 퍼센트 · 105.8㎡ → 백오 점 팔 제곱미터 · 3개 → 세 개
 */
const D = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
const DIGIT = ["영", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];

/** 0~9999 */
function under10k(n: number): string {
  let out = "";
  const units = ["천", "백", "십", ""];
  const ds = String(n).padStart(4, "0").split("").map(Number);
  ds.forEach((d, i) => {
    if (!d) return;
    out += (d === 1 && i < 3 ? "" : D[d]) + units[i];
  });
  return out;
}
/** 정수 → 한자어 수 (만·억·조) */
export function sino(n: number): string {
  if (!Number.isFinite(n)) return "";
  if (n === 0) return "영";
  const big = ["", "만", "억", "조", "경"];
  let out = "";
  let i = 0;
  let x = Math.floor(n);
  while (x > 0 && i < big.length) {
    const part = x % 10000;
    if (part) out = (part === 1 && i === 1 ? "" : under10k(part)) + big[i] + out;
    x = Math.floor(x / 10000);
    i++;
  }
  return out;
}
/** 고유어 수 (1~99) — 개·명·살·시 등 앞 */
function native(n: number, attach: boolean): string {
  const ONES = ["", attach ? "한" : "하나", attach ? "두" : "둘", attach ? "세" : "셋", attach ? "네" : "넷", "다섯", "여섯", "일곱", "여덟", "아홉"];
  const TENS = ["", "열", attach && n === 20 ? "스무" : "스물", "서른", "마흔", "쉰", "예순", "일흔", "여든", "아흔"];
  return TENS[Math.floor(n / 10)] + ONES[n % 10];
}
const NATIVE_COUNTER = /^(개|명|살|시(?!간|세|장|청|공|행|설|점)|마리|가지|군데|채|번(?!지|째)|번째|달)/;

function decimalPart(s: string) {
  return s.split("").map((c) => DIGIT[Number(c)]).join(" ");
}

export function koReadNumbers(text: string): string {
  let t = String(text || "");
  // 단위 기호
  t = t.replace(/(\d)\s*(㎡|m²|m2)(?![\w])/gi, "$1 제곱미터").replace(/(\d)\s*㎥/g, "$1 세제곱미터").replace(/(\d)\s*km(?![a-z])/gi, "$1 킬로미터").replace(/(\d)\s*m(?![a-z²\d])/gi, "$1 미터");
  // 전화번호·등록번호 같은 줄 숫자 — 한 자리씩
  t = t.replace(/\d{2,4}(?:-\d{2,5}){1,3}/g, (m) => m.split("-").map((g) => g.split("").map((c) => DIGIT[Number(c)]).join("")).join(", "));
  // 숫자 (쉼표·소수점) + 뒤 글자
  t = t.replace(/(\d[\d,]*)(?:\.(\d+))?(\s*)(%|퍼센트)?/g, (m, int: string, dec: string | undefined, sp: string, pct: string | undefined, off: number, all: string) => {
    const n = Number(int.replace(/,/g, ""));
    if (!Number.isFinite(n)) return m;
    const after = all.slice(off + m.length);
    let word: string;
    if (!dec && !pct && !sp && n >= 1 && n < 100 && NATIVE_COUNTER.test(after)) word = native(n, true);
    else word = sino(n) + (dec ? ` 점 ${decimalPart(dec)}` : "");
    return word + (pct ? " 퍼센트" : sp);
  });
  return t;
}
