// 성우 요청이 몰렸을 때 기다렸다 다시 — 제미나이 · 일레븐랩스 · 타입캐스트 같이 (2026-10-31 사장님: 대본 뒷부분 목소리가 자주 빠짐)
//  - 몰림(429)·서버 혼잡(5xx)·연결 실패·빈 소리 → 알려 준 시간(Retry-After)만큼, 없으면 2·5·10·20·40초 기다렸다 다시
//  - 크레딧 부족·하루 한도·키 오류처럼 기다려도 안 풀리는 것은 바로 멈춘다 (부르는 쪽이 fatal 로 알려 준다)
//  - 기다리는 동안 화면에 "studio:voice-wait" 를 보내 진행 칸에 안내한다 (sec 0 = 다시 만드는 중)
const { BrowserWindow } = require("electron");
const log = require("electron-log/main");

const BACKOFF = [2000, 5000, 10000, 20000, 40000];
const MAX_WAIT = 65000;
const TRIES = BACKOFF.length + 1;

function tellWait(who, sec) {
  for (const w of BrowserWindow.getAllWindows()) {
    try { if (!w.isDestroyed()) w.webContents.send("studio:voice-wait", { who, sec }); } catch {}
  }
}

async function wait(who, ms) {
  const sec = Math.ceil(ms / 1000);
  log.info(`[${who}] 요청이 몰려 ${sec}초 기다렸다 다시`);
  tellWait(who, sec);
  await new Promise((r) => setTimeout(r, ms));
  tellWait(who, 0);
}

/** 기다릴 시간 — 서버가 알려 준 값(초) 우선, 없으면 차례대로 늘린다 */
function delayOf(attempt, hintSec) {
  const s = Number(hintSec);
  return Math.min(MAX_WAIT, s > 0 ? s * 1000 + 1000 : BACKOFF[Math.min(attempt, BACKOFF.length - 1)]);
}

const busyStatus = (s) => s === 429 || s === 500 || s === 502 || s === 503 || s === 504;

/**
 * 일레븐랩스·타입캐스트용 — fetch 를 감싸 소리(Buffer)를 돌려준다.
 *  fatal(status, body) 이 글을 돌려주면 그 글로 바로 멈춘다. errOf(status, body) 는 끝내 못 받았을 때 글.
 */
async function fetchAudio(who, url, init, { fatal, errOf }) {
  let lastErr = "";
  for (let attempt = 0; attempt < TRIES; attempt++) {
    let r;
    try {
      r = await fetch(url, { ...init, signal: AbortSignal.timeout(90000) });
    } catch (e) {
      lastErr = e && e.name === "TimeoutError" ? `${who} 응답 시간 초과` : `${who} 연결 실패`;
      if (attempt < TRIES - 1) { await wait(who, delayOf(attempt)); continue; }
      break;
    }
    if (r.ok) {
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length >= 100) return buf;
      lastErr = `${who}에서 소리를 받지 못했어요.`;
      if (attempt < TRIES - 1) { await wait(who, delayOf(0)); continue; }
      break;
    }
    const body = await r.json().catch(() => null);
    const stop = fatal && fatal(r.status, body);
    if (stop) throw new Error(stop);
    lastErr = errOf(r.status, body);
    if (!busyStatus(r.status) || attempt >= TRIES - 1) break;
    log.warn(`[${who}] 실패 ${r.status} (${attempt + 1}/${TRIES})`);
    await wait(who, delayOf(attempt, r.headers.get("retry-after")));
  }
  throw new Error(lastErr || `${who} 목소리를 만들지 못했어요. 잠시 뒤 다시 해 주세요.`);
}

module.exports = { fetchAudio, wait, delayOf, busyStatus, TRIES };
