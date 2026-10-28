// PC 받아쓰기 — Whisper(whisper.cpp · MIT, 설치 파일에 들어 있음). 소리를 서버로 보내지 않고 무료, 문장 시각이 정확하다.
//  잘못 들린 부동산 낱말은 PC 에서 규칙으로 고친다 (방세계→방 3개, 남양→남향 …) — 서버·AI 비용 0원 (사장님 2026-10-18)
//  회의: docs/2026-10-18_studio_ai_settings_meeting.md 3-16·3-17
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { app } = require("electron");
const log = require("electron-log/main");
const ff = require("./ff");

const MODEL = "ggml-large-v3-turbo-q5_0.bin";
const dir = () => (app.isPackaged ? path.join(process.resourcesPath, "whisper") : path.join(__dirname, "..", "..", "vendor", "whisper"));
const exe = () => path.join(dir(), "whisper-cli.exe");
const ready = () => fs.existsSync(exe()) && fs.existsSync(path.join(dir(), MODEL));

// 말이 없는 곳에서 지어내는 흔한 말 (교정이 안 될 때 대비)
const HALLU = /(자막\s*제공|시청해\s*주셔서|구독|좋아요\s*(와|및)|MBC|KBS|SBS|뉴스\s*[가-힣]+입니다\.?$)/;

/* 부동산 영상에서 Whisper 가 자주 잘못 듣는 낱말 — 앞뒤 문맥이 맞을 때만 고친다 (예: "남양주"·"세계 여행"은 그대로).
   새로 발견하면 여기에 더한다 */
const NUM = { 한: 1, 두: 2, 세: 3, 네: 4, 다섯: 5 };
const ROOMS = "방|욕실|화장실|베란다|발코니|드레스룸|주차";
const FIX = [
  // 방세계 → 방 3개, 욕실 두계 → 욕실 2개
  [new RegExp(`(${ROOMS})\\s?(한|두|세|네|다섯)\\s?(계|개|게)(?=[\\s,.]|이|입|로|$)`, "g"), (m, a, n) => `${a} ${NUM[n]}개`],
  [new RegExp(`(${ROOMS})\\s?(\\d+)\\s?(계|게)(?=[\\s,.]|이|입|로|$)`, "g"), (m, a, n) => `${a} ${n}개`],
  // 남양·북양·동양·서양 + 입니다/이고 … → 향 (집 방향)
  [/(남동|남서|북동|북서|남|북|동|서)양(?=입니다|이고|이며|으로|이라|,|\.|\s*$)/g, "$1향"],
  [/비대(?=가|도|는|,|\s|$)/g, "비데"],
  [/관리지(?=는|가|도|\s)/g, "관리비"],
  [/전세끔/g, "전세금"],
  [/보증끔/g, "보증금"],
  [/(\d)\s?제곱\s?미터/g, "$1제곱미터"],
];
/* 받아쓰기 낱말장 (회의 3-18) — 대표님이 고친 낱말(내 PC) + 모든 대표님 공용(서버에서 켤 때 받아 둠). 비용 0원 */
const wordsFile = (k) => path.join(app.getPath("userData"), `stt-words-${k}.json`);
const readWords = (k) => {
  try {
    const v = JSON.parse(fs.readFileSync(wordsFile(k), "utf8"));
    return Array.isArray(v) ? v.filter((x) => x && typeof x.wrong === "string" && typeof x.right === "string" && x.wrong.length >= 2) : [];
  } catch {
    return [];
  }
};
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** 낱말 앞이 문장 처음·띄어쓰기·문장부호일 때만 바꾼다 ("남양" 규칙이 "서남양…" 한가운데를 바꾸지 않게) */
const applyWords = (t, list) => list.reduce((x, w) => x.replace(new RegExp(`(^|[\\s,.?!·"'(])${esc(w.wrong)}`, "g"), `$1${w.right}`), t);
const fixWords = (t) => applyWords(applyWords(FIX.reduce((x, [re, to]) => x.replace(re, to), String(t)), readWords("shared")), readWords("mine"));

/** 공용 낱말장 받아 두기 — 앱을 켤 때 (실패하면 지난번 것 그대로) */
async function refreshShared() {
  const r = await require("./server").call("/api/studio/stt-words", { method: "GET" }).catch(() => null);
  if (r && r.success && Array.isArray(r.rules)) {
    fs.writeFileSync(wordsFile("shared"), JSON.stringify(r.rules));
    log.info(`[받아쓰기] 공용 낱말장 ${r.rules.length}개`);
  }
}

/** 대표님이 [말한 내용 고치기]로 고친 낱말 — 내 PC 에 바로 쓰고, 서버에 모은다 (낱말 쌍과 앞뒤 몇 글자만) */
async function addWords(pairs) {
  const list = (pairs || []).map((p) => ({ wrong: String(p.wrong || "").trim(), right: String(p.right || "").trim(), context: String(p.context || "").slice(0, 80) })).filter((p) => p.wrong.length >= 2 && p.right && p.wrong !== p.right);
  if (!list.length) return 0;
  const mine = readWords("mine").filter((x) => !list.some((p) => p.wrong === x.wrong));
  fs.writeFileSync(wordsFile("mine"), JSON.stringify([...mine, ...list.map(({ wrong, right }) => ({ wrong, right }))]));
  await require("./server").call("/api/studio/stt-words", { method: "POST", body: { pairs: list } }).catch((e) => log.warn(`[받아쓰기] 낱말장 올리기 실패: ${e.message}`));
  return list.length;
}

/**
 * 소리 토막 받아쓰기 — file 의 start 초부터 len 초
 *  돌려줌: [{ start, end, text }] (토막 맨 앞 = 0초)
 */
async function segments(file, { start = 0, len = 0, fix = true } = {}) {
  if (!ready()) throw new Error("받아쓰기 프로그램(Whisper)이 없습니다. 공실마케팅를 다시 설치해 주세요.");
  const tmp = path.join(os.tmpdir(), `gsw-${crypto.randomBytes(4).toString("hex")}`);
  fs.mkdirSync(tmp, { recursive: true });
  try {
    const wav = path.join(tmp, "a.wav");
    const args = ["-y", "-hide_banner", "-loglevel", "error"];
    if (start) args.push("-ss", start.toFixed(3));
    args.push("-i", file);
    if (len) args.push("-t", len.toFixed(3));
    args.push("-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav);
    await ff.run(ff.ff(), args);
    const dur = (await ff.probe(wav)).duration || len;
    const threads = Math.max(2, Math.min(8, os.cpus().length - 1));
    const t0 = Date.now();
    // (2026-10-20 시험: -nfa -dtw large.v3.turbo 단어 시각은 문장에 따라 0.7~2초씩 늦게 찍혀 쓰지 않는다)
    await ff.run(exe(), ["-m", path.join(dir(), MODEL), "-f", wav, "-l", "ko", "-t", String(threads), "-ojf", "-of", path.join(tmp, "out"), "-np"], { cwd: dir() });
    const j = JSON.parse(fs.readFileSync(path.join(tmp, "out.json"), "utf8"));
    /** 토큰 → 단어 (띄어쓰기로 시작하는 토큰이 새 단어) · 단어 시작 = 첫 토큰 DTW 시각 (초) */
    const wordsOf = (s) => {
      const out = [];
      for (const t of s.tokens || []) {
        const tx = String(t.text || "");
        if (!tx || /^\[_/.test(tx) || /^<\|/.test(tx)) continue;
        const td = Number(t.t_dtw);
        if (/^\s/.test(tx) || !out.length) out.push({ w: tx.trim(), t: td >= 0 ? td / 100 : -1 });
        else out[out.length - 1].w += tx;
      }
      return out.filter((x) => x.w.replace(/[.,?!~'"·…。？！]/g, ""));
    };
    let segs = (j.transcription || [])
      .map((s) => ({ start: s.offsets.from / 1000, end: Math.min(dur, s.offsets.to / 1000), text: String(s.text || "").trim(), words: wordsOf(s) }))
      .filter((s) => s.text && s.end > s.start);
    // 말소리가 거의 없는 곳의 글은 버린다 (Whisper 가 무음에서 말을 지어내는 것)
    const sp = await ff.speech(wav, dur, { min: 0.2 }).catch(() => []);
    if (sp.length) {
      segs = segs.filter((s) => {
        const talk = sp.reduce((a, r) => a + Math.max(0, Math.min(r.e, s.end) - Math.max(r.s, s.start)), 0);
        return talk > Math.min(0.4, (s.end - s.start) * 0.25);
      });
    }
    log.info(`[받아쓰기] Whisper ${dur.toFixed(1)}초 → ${segs.length}구간, ${((Date.now() - t0) / 1000).toFixed(1)}초 (${threads}스레드)`);
    if (fix) segs = segs.map((x) => ({ ...x, text: fixWords(x.text) }));
    return segs.filter((s) => s.text && !HALLU.test(s.text));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

module.exports = { segments, ready, fixWords, refreshShared, addWords };
