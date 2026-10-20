// 프롬프터 대본으로 받아쓰기 맞춤법만 고치기 (2026-10-20 사장님 — 클립은 실제 말소리로 나누고, 대본은 "확실할 때만" 낱말 고치기)
//  1) 받아쓴 문장마다 대본에서 가장 닮은 문장을 찾는다 — 70% 미만이면 즉석에서 한 말이라 그대로
//  2) 닮은 문장 안에서도 "거의 같은 낱말"만: 띄어쓰기·문장부호만 다름 / 한 글자 차이(3글자 이상). 숫자가 다르면 절대 안 바꾼다
//  3) 고친 낱말은 fix 표시 (클립 목록에서 밑줄)
import type { Word } from "./types";
import { splitScript } from "./timeline";

const norm = (t: string) => String(t || "").replace(/[\s.,?!~'"·…。？！「」『』()[\]-]/g, "");
const digits = (t: string) => (String(t).match(/\d+/g) || []).join(",");
function lev(a: string, b: string) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
const sim = (a: string, b: string) => {
  const x = norm(a), y = norm(b);
  return !x && !y ? 1 : 1 - lev(x, y) / Math.max(x.length, y.length, 1);
};
/** 받아쓴 낱말 → 대본 낱말로 바꿔도 되나 */
function closeWord(heard: string, script: string) {
  const a = norm(heard), b = norm(script);
  if (!a || !b || digits(a) !== digits(b)) return false; // 숫자가 다르면 말을 바꿔 읽은 것
  if (a === b) return heard.replace(/[.,?!~…]+$/, "") !== script.replace(/[.,?!~…]+$/, ""); // 띄어쓰기·부호만 다름 (같으면 고칠 것 없음)
  return Math.min(a.length, b.length) >= 3 && Math.abs(a.length - b.length) <= 1 && lev(a, b) <= 1;
}
const tailPunct = (t: string) => (String(t).match(/[.,?!~…]+$/) || [""])[0];

export type FixWord = Word & { fix?: boolean };

/** 한 문장(클립)의 단어들을 대본으로 고친다 → { words, fixed: 고친 수 } */
export function fixByScript(words: Word[], scriptSents: string[]): { words: FixWord[]; fixed: number } {
  const heard = words.map((w) => w.w).join(" ");
  let best = "", bs = 0;
  for (const s of scriptSents) {
    const v = sim(heard, s);
    if (v > bs) (bs = v), (best = s);
  }
  if (bs < 0.7) return { words, fixed: 0 }; // 즉석에서 한 말 — 그대로
  const S = best.split(/\s+/).filter(Boolean);
  const out: FixWord[] = [];
  let j = 0, fixed = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    let done = false;
    // 앞으로 세 낱말 안에서 맞는 대본 낱말을 찾는다 (대본 순서대로)
    for (let k = j; k < Math.min(S.length, j + 3) && !done; k++) {
      // 받아쓰기가 한 낱말을 둘로 나눈 경우 ("공실 뉴스가" ↔ "공실뉴스가")
      const nx = words[i + 1];
      if (nx && norm(w.w + nx.w) === norm(S[k]) && digits(w.w + nx.w) === digits(S[k])) {
        out.push({ ...w, w: S[k].replace(/[.,?!~…]+$/, "") + tailPunct(nx.w), e: nx.e, fix: true });
        fixed++;
        i++;
        j = k + 1;
        done = true;
        break;
      }
      if (norm(w.w) === norm(S[k])) { // 같은 낱말 (부호까지 같으면 그대로)
        if (closeWord(w.w, S[k])) { out.push({ ...w, w: S[k].replace(/[.,?!~…]+$/, "") + tailPunct(w.w), fix: true }); fixed++; } else out.push(w);
        j = k + 1;
        done = true;
      } else if (k === j && closeWord(w.w, S[k])) { // 한 글자 차이 — 순서가 바로 맞을 때만
        out.push({ ...w, w: S[k].replace(/[.,?!~…]+$/, "") + tailPunct(w.w), fix: true });
        fixed++;
        j = k + 1;
        done = true;
      }
    }
    if (!done) out.push(w);
  }
  return { words: out, fixed };
}

export const scriptSentences = (script: string) => splitScript(script).flat().map((t) => t.trim()).filter(Boolean);
