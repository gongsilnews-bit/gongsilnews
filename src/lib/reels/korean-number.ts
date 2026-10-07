// 금액·매물번호를 성우가 틀리지 않게 한글로 읽는다.
// 실측: "팔육삼공이를" 은 "86301을" 로 들렸다 → 매물번호는 자릿수 나열 대신 수로 읽는다 ("팔만 육천삼백이 번").

const DIGITS = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
const SMALL_UNITS = ["", "십", "백", "천"];
const BIG_UNITS = ["", "만", "억", "조"];

/** 0 < n < 10000 을 한글로. 1은 "십/백/천" 앞에서 생략 (일천 → 천). */
function under10000(n: number): string {
  let out = "";
  const s = String(n).padStart(4, "0");
  for (let i = 0; i < 4; i++) {
    const d = Number(s[i]);
    if (d === 0) continue;
    const unit = SMALL_UNITS[3 - i];
    out += (d === 1 && unit ? "" : DIGITS[d]) + unit;
  }
  return out;
}

/** 정수를 한글 수사로: 86302 → "팔만 육천삼백이", 10000000 → "천만" */
export function readNumber(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "영";
  const parts: string[] = [];
  let i = 0;
  while (n > 0) {
    const chunk = n % 10000;
    if (chunk) parts.unshift(under10000(chunk) + BIG_UNITS[i]);
    n = Math.floor(n / 10000);
    i++;
  }
  return parts.join(" ");
}

// 개수를 세는 말 앞에서는 고유어로 읽는다 (1대 → 한 대, 2개 → 두 개)
const NATIVE = ["", "한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열"];
const COUNTERS = /^(대|개|명|곳|채|시간|군데|가지|살)/;

/**
 * 회원이 쓴 문장의 숫자를 성우가 읽을 말로 바꾼다 (화면 자막은 원문 그대로).
 * "월세 50만원" → "월세 오십만원", "주차 1대" → "주차 한 대", "26.4㎡" → "이십육 점 사 제곱미터"
 */
export function speakDigits(word: string): string {
  return word
    .replace(/(\d[\d,]*)(\.\d+)?(?=(.*))/g, (m, int: string, dec: string | undefined, rest: string) => {
      const n = Number(int.replace(/,/g, ""));
      if (!dec && n >= 1 && n <= 10 && COUNTERS.test(rest)) return `${NATIVE[n]} `;
      const head = readNumber(n);
      return dec ? `${head} 점 ${[...dec.slice(1)].map((d) => (d === "0" ? "영" : readNumber(Number(d)))).join(" ")}` : head;
    })
    .replace(/㎡/g, " 제곱미터")
    .replace(/%/g, " 퍼센트")
    .replace(/\s+/g, " ")
    .trim();
}

/** 원 단위 금액을 읽기: 500000 → "오십만 원", 0 → "없음" */
export function readWon(won: number): string {
  return won > 0 ? `${readNumber(won)} 원` : "없음";
}

/** 화면 표기: 10000000 → "1,000만", 500000 → "50만", 15500000 → "1,550만" */
export function displayManwon(won: number): string {
  if (won <= 0) return "없음";
  const man = won / 10000;
  return `${Number.isInteger(man) ? man.toLocaleString("ko-KR") : man.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}만`;
}
