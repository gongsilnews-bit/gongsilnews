// API 사용 내역 — 회원 API 키(유료)로 쓴 것을 이 PC 에 기록 (2026-10-21 사장님: 회원이 사용 내역을 관리하는 페이지)
//  AI 회사들은 회원 키만으로 "쓴 금액"을 알려 주지 않는다 (OpenAI 는 관리자 키, Gemini 는 조회 없음) → 답에 들어 있는 사용량(토큰) × 공개 가격표
//  금액은 "예상" — 정확한 청구는 각 회사 결제 화면. 가격표에 없는 모델은 금액을 비워 둔다 (지어내지 않는다)
//  기록은 이 PC(userData/ai-usage.json)에만 — 공실뉴스로 보내지 않는다. 내 계정(웹 창, 무료)은 기록하지 않는다
const fs = require("fs");
const path = require("path");
const { app, dialog, BrowserWindow } = require("electron");
const log = require("electron-log/main");

/* 가격표 — USD / 100만 토큰 (표준 요금, 2026-10-21 각 회사 공식 가격 페이지)
   ai.google.dev/gemini-api/docs/pricing · developers.openai.com/api/docs/pricing · claude.com/pricing
   in·out = 입력·출력(생각 포함) · long = 이 토큰보다 긴 입력이면 inL·outL · img = 그림 1장 값(토큰이 없을 때) */
const PRICES = [
  // Gemini — 글
  { re: /^gemini-3\.1-pro-preview/, in: 2, out: 12, long: 200000, inL: 4, outL: 18 },
  { re: /^gemini-3-flash-preview/, in: 0.5, out: 3 },
  { re: /^gemini-3\.6-flash/, in: 0.75, out: 3.75 },
  { re: /^gemini-2\.5-pro/, in: 1.25, out: 10, long: 200000, inL: 2.5, outL: 15 },
  // Gemini — 성우 (말소리 출력)
  { re: /^gemini-2\.5-flash-preview-tts/, in: 0.5, out: 10 },
  { re: /^gemini-2\.5-pro-preview-tts/, in: 1, out: 20 },
  // Gemini — 그림 (출력 = 그림 토큰 값)
  { re: /^gemini-3-pro-image/, in: 2, out: 120 },
  { re: /^gemini-3\.1-flash-lite-image/, in: 0.25, out: 30 },
  { re: /^gemini-3\.1-flash-image/, in: 0.5, out: 60 },
  { re: /^gemini-nano-banana-2\.1/, in: 1.5, out: 30 },
  { re: /^gemini-2\.5-flash-image/, in: 0.3, out: 0, img: 0.039 },
  { re: /^gemini-2\.5-flash(?!-)/, in: 0.3, out: 2.5 },
  // Gemini — 동영상 (Omni Flash, 출력 = 영상 토큰 · 720p 1초 ≈ 5,792 토큰 ≈ $0.10)
  { re: /^gemini-omni-1\.1-flash/, in: 1.5, out: 17.5 },
  // OpenAI — 글
  { re: /^gpt-5\.6-sol/, in: 4, out: 20 },
  { re: /^gpt-5\.6-terra/, in: 2, out: 12 },
  { re: /^gpt-5\.6-luna/, in: 0.2, out: 1.2 },
  { re: /^gpt-5\.5-pro/, in: 30, out: 180 },
  { re: /^gpt-5\.5/, in: 5, out: 30 },
  { re: /^gpt-5\.4-pro/, in: 30, out: 180 },
  { re: /^gpt-5\.4-mini/, in: 0.75, out: 4.5 },
  { re: /^gpt-5\.4-nano/, in: 0.2, out: 1.25 },
  { re: /^gpt-5\.4/, in: 2.5, out: 15 },
  { re: /^gpt-5\.2-pro/, in: 21, out: 168 },
  { re: /^gpt-5\.2/, in: 1.75, out: 14 },
  { re: /^gpt-5\.1/, in: 1.25, out: 10 },
  { re: /^gpt-5-pro/, in: 15, out: 120 },
  { re: /^gpt-5-mini/, in: 0.25, out: 2 },
  { re: /^gpt-5-nano/, in: 0.05, out: 0.4 },
  { re: /^gpt-5(?![.\d])/, in: 1.25, out: 10 },
  { re: /^gpt-4\.1-mini/, in: 0.4, out: 1.6 },
  { re: /^gpt-4\.1-nano/, in: 0.1, out: 0.4 },
  { re: /^gpt-4\.1/, in: 2, out: 8 },
  { re: /^gpt-4o-mini/, in: 0.15, out: 0.6 },
  { re: /^gpt-4o-2024-05-13/, in: 5, out: 15 },
  { re: /^gpt-4o/, in: 2.5, out: 10 },
  // OpenAI — 그림 (입력은 글 값으로 · 출력 = 그림 토큰)
  { re: /^gpt-image-2/, in: 5, out: 30 },
  { re: /^gpt-image-1\.5/, in: 5, out: 32 },
  { re: /^gpt-image-1-mini/, in: 2, out: 8 },
  { re: /^gpt-image-1/, in: 5, out: 40 },
  // Claude
  { re: /fable-5-1/, in: 10, out: 50 },
  { re: /opus-5-5/, in: 4, out: 20 },
  { re: /sonnet-5-5/, in: 2, out: 10 },
  { re: /haiku-5-5/, in: 0.1, out: 0.5, long: 100000, inL: 0.5, outL: 2.5 },
  { re: /fable-5(?!-)/, in: 10, out: 50 },
  { re: /opus-5(?!-)/, in: 5, out: 25 },
  { re: /sonnet-5(?!-)/, in: 2, out: 10 },
  { re: /haiku-4-5/, in: 1, out: 5 },
  { re: /opus-4-[5-8]/, in: 5, out: 25 },
  { re: /sonnet-4-[56]/, in: 3, out: 15 },
];
const PRICE_DATE = "2026-10-21";

/** 예상 금액 (USD) — 가격표에 없으면 null */
function priceOf(model, inTok = 0, outTok = 0, images = 0) {
  const p = PRICES.find((x) => x.re.test(String(model || "")));
  if (!p) return null;
  if (!inTok && !outTok && !(p.img && images)) return null; // 사용량을 못 받았으면 금액도 모름
  const long = p.long && inTok > p.long;
  const usd = (inTok * (long ? p.inL : p.in) + outTok * (long ? p.outL : p.out)) / 1e6 + (p.img ? p.img * images : 0);
  return +usd.toFixed(6);
}

const file = () => path.join(app.getPath("userData"), "ai-usage.json");
function read() {
  try {
    const o = JSON.parse(fs.readFileSync(file(), "utf8"));
    return { list: Array.isArray(o.list) ? o.list : [], limit: Number(o.limit) || 0 };
  } catch {
    return { list: [], limit: 0 };
  }
}
function write(o) {
  try {
    fs.mkdirSync(path.dirname(file()), { recursive: true });
    fs.writeFileSync(file(), JSON.stringify({ list: o.list.slice(-8000), limit: o.limit || 0 }));
  } catch (e) {
    log.warn("[API 사용] 기록 못 함", e && e.message);
  }
}
const NAME = { chatgpt: "ChatGPT", gemini: "Gemini", claude: "Claude" };
const monthOf = (t) => new Date(t).toISOString().slice(0, 7);

/** 한 건 기록 — { provider, feature, model, inTok, outTok, images, seconds, note } */
function record(e) {
  try {
    const o = read();
    const usd = e.usd !== undefined ? e.usd : priceOf(e.model, e.inTok || 0, e.outTok || 0, e.images || 0);
    o.list.push({ at: Date.now(), provider: e.provider, feature: String(e.feature || "기타").slice(0, 40), model: e.model || "", inTok: e.inTok || 0, outTok: e.outTok || 0, images: e.images || 0, seconds: e.seconds || 0, usd, note: e.note || "" });
    write(o);
  } catch {}
}

/** 이 달 요약 — month "YYYY-MM" (없으면 이번 달) */
function summary(month) {
  const o = read();
  const m = month || monthOf(Date.now());
  const rows = o.list.filter((x) => monthOf(x.at) === m);
  const sum = (l) => +l.reduce((t, x) => t + (x.usd || 0), 0).toFixed(4);
  const group = (key) => {
    const g = {};
    for (const x of rows) {
      const k = x[key] || "기타";
      g[k] = g[k] || { usd: 0, n: 0, unknown: 0 };
      g[k].usd += x.usd || 0;
      g[k].n++;
      if (x.usd === null) g[k].unknown++;
    }
    return Object.entries(g).map(([k, v]) => ({ key: k, name: NAME[k] || k, usd: +v.usd.toFixed(4), n: v.n, unknown: v.unknown })).sort((a, b) => b.usd - a.usd);
  };
  const prevM = (() => { const [y, mm] = m.split("-").map(Number); const d = new Date(Date.UTC(y, mm - 2, 1)); return d.toISOString().slice(0, 7); })();
  const months = [...new Set(o.list.map((x) => monthOf(x.at)))].sort().reverse();
  return {
    month: m, months: months.includes(m) ? months : [m, ...months], total: sum(rows), prev: sum(o.list.filter((x) => monthOf(x.at) === prevM)), count: rows.length,
    unknown: rows.filter((x) => x.usd === null).length, byProvider: group("provider"), byFeature: group("feature"),
    rows: rows.slice(-200).reverse(), limit: o.limit, priceDate: PRICE_DATE,
  };
}
function csv(month) {
  const s = summary(month);
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [["때", "AI", "기능", "모델", "입력 토큰", "출력 토큰", "그림", "예상 금액(USD)"].map(q).join(",")];
  for (const x of read().list.filter((r) => monthOf(r.at) === s.month)) lines.push([new Date(x.at).toLocaleString("ko-KR"), NAME[x.provider] || x.provider, x.feature, x.model, x.inTok, x.outTok, x.images, x.usd === null ? "" : x.usd].map(q).join(","));
  return "﻿" + lines.join("\r\n");
}
function setLimit(v) {
  const o = read();
  o.limit = Math.max(0, Number(v) || 0);
  write(o);
  okMonth = "";
  return o.limit;
}

/** 한도 알림 — 이번 달 예상 금액이 한도를 넘었으면 유료 작업 전에 한 번 묻는다 (켠 회원만, 이 앱을 켜 둔 동안 한 번 "계속"하면 다시 안 묻는다) */
let okMonth = "";
async function guard(provider) {
  const o = read();
  if (!o.limit) return;
  const m = monthOf(Date.now());
  if (okMonth === m) return;
  const total = o.list.filter((x) => monthOf(x.at) === m).reduce((t, x) => t + (x.usd || 0), 0);
  if (total < o.limit) return;
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  const r = await dialog.showMessageBox(win, {
    type: "warning", buttons: ["계속 쓰기", "멈추기"], defaultId: 1, cancelId: 1, title: "API 사용 한도",
    message: `이번 달 API 예상 금액이 $${total.toFixed(2)}로, 정해 둔 한도 $${o.limit}를 넘었어요.`,
    detail: `${NAME[provider] || provider} API(유료)로 계속 쓸까요? 계속하면 이번 달에는 다시 묻지 않아요. 한도는 [AI 설정] › [API 사용 내역]에서 바꿔요.`,
  });
  if (r.response !== 0) throw new Error("이번 달 API 사용 한도를 넘어 멈췄어요. [AI 설정] › [API 사용 내역]에서 한도를 바꿀 수 있어요.");
  okMonth = m;
}

module.exports = { record, summary, csv, setLimit, guard, priceOf, PRICE_DATE };
