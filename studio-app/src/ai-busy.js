// AI 가 글·그림을 쓰는 동안 스튜디오 창 전체를 덮는다 — "AI가 기사를 작성하고 있습니다… 잠시만 기다려 주세요 (0:42)"
// 그동안 다른 메뉴를 누르거나 화면을 옮기지 못하게 (사장님 2026-10-16). 웹 화면 버전과 상관없이 앱이 직접 그린다.
// 기사·블로그·SNS·유튜브·칼럼·공실마케팅·영상 대본이 모두 ai/index.js 의 ask·askImage 를 거치므로 거기서 감싼다.
// [중지] 단추·Esc (2026-10-21 사장님: AI 돌릴 때 멈출 수가 없다) — 누르면 바로 덮개를 닫고 "중지했어요" 오류로 끝낸다.
//  뒤에서 돌던 기다리기(studio-chrome sleep)·API 요청도 멈추고, 웹 채팅이면 AI 창의 답변 중지 단추도 누른다.
const log = require("electron-log/main");

let getWin = () => null;
let depth = 0; // 겹쳐 부르면 마지막이 끝날 때 닫는다
let label = "";
let subText = ""; // 아래 작은 글 — API 키로 쓸 때는 "크롬 창" 안내 대신
let since = 0;
let stopped = false; // [중지]를 눌렀다 — 뒤에서 돌던 일이 다 멈출 때까지
let gen = 0; // 중지할 때마다 하나씩 — 중지 앞의 일이 끝나도 덮개 수를 다시 빼지 않게
let ctl = new AbortController(); // API 요청 끊기
const running = new Set(); // 돌고 있는 일
const cancels = new Set(); // 기다리는 during 들 — 중지하면 바로 끝낸다
let poll = null;
const STOP_MSG = "중지했어요";

const overlay = (text, startedAt, sub) => `(() => {
  const id = "__gsAiBusy";
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.innerHTML = \`<style>
      #__gsAiBusy{position:fixed;inset:0;z-index:2147483647;background:rgba(10,14,20,.62);display:flex;align-items:center;justify-content:center;font-family:'Pretendard Variable','Malgun Gothic',sans-serif;cursor:wait}
      #__gsAiBusy .c{background:#16202b;color:#fff;border-radius:14px;padding:30px 40px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.45);min-width:380px;cursor:default}
      #__gsAiBusy .d{display:flex;gap:10px;justify-content:center;margin-bottom:18px}
      #__gsAiBusy .d i{width:14px;height:14px;border-radius:7px;background:#3b82f6;animation:gsb 1.2s infinite ease-in-out}
      #__gsAiBusy .d i:nth-child(2){animation-delay:.15s}#__gsAiBusy .d i:nth-child(3){animation-delay:.3s}
      @keyframes gsb{0%,80%,100%{transform:scale(.55);opacity:.35}40%{transform:scale(1);opacity:1}}
      #__gsAiBusy .t{font-size:19px;font-weight:800}
      #__gsAiBusy .s{font-size:14.5px;color:#b6c2cf;margin-top:8px;line-height:1.6}
      #__gsAiBusy .e{font-size:24px;font-weight:800;margin-top:14px;font-variant-numeric:tabular-nums;color:#93c5fd}
      #__gsAiBusy .x{margin-top:14px;height:24px;padding:0 10px;border-radius:5px;border:1px solid #374151;background:transparent;color:#6b7280;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer}
      #__gsAiBusy .x:hover{color:#fff;background:#dc2626;border-color:#dc2626}
      #__gsAiBusy .k{font-size:12px;color:#6b7280;margin-top:12px}
    </style><div class="c"><div class="d"><i></i><i></i><i></i></div><div class="t"></div>
      <div class="s">보통 1~2분 걸려요. 오른쪽 크롬 창에서 AI가 쓰는 모습을 볼 수 있어요.<br>끝나면 저절로 가져와요 — 크롬 창은 그대로 두세요.</div><div class="e">0:00</div>
      <div class="k">급할 때는 Esc 키로 멈춰요</div></div>\`;
    // 덮개 아래로 누르기·키 입력이 가지 않게 — [중지]만 (앱이 window.__gsAiStopReq 를 읽어 간다)
    for (const ev of ["click", "mousedown", "pointerdown", "keydown", "wheel", "contextmenu"]) el.addEventListener(ev, (e) => {
      const x = e.target && e.target.closest ? e.target.closest(".x") : null;
      if (ev === "click" && x) { window.__gsAiStopReq = true; x.textContent = "멈추는 중…"; }
      e.stopPropagation(); e.preventDefault();
    }, true);
    if (!window.__gsAiEsc) {
      window.__gsAiEsc = true;
      window.addEventListener("keydown", (e) => {
        if (e.key !== "Escape" || !document.getElementById(id)) return;
        window.__gsAiStopReq = true;
        e.stopPropagation(); e.preventDefault();
      }, true);
    }
    document.documentElement.appendChild(el);
  }
  el.querySelector(".t").textContent = ${JSON.stringify(text)};
  if (!el.__gsSub) el.__gsSub = el.querySelector(".s").innerHTML; // 처음 문구 (크롬 창 안내)
  el.querySelector(".s").innerHTML = ${JSON.stringify(sub || "")} || el.__gsSub;
  const t0 = ${startedAt};
  clearInterval(window.__gsAiBusyT);
  const tick = () => { const s = Math.max(0, Math.floor((Date.now() - t0) / 1000)); el.querySelector(".e").textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  tick();
  window.__gsAiBusyT = setInterval(tick, 500);
})()`;
const remove = `(() => { clearInterval(window.__gsAiBusyT); window.__gsAiStopReq = false; const el = document.getElementById("__gsAiBusy"); if (el) el.remove(); })()`;

function paint() {
  const w = getWin();
  if (!w || w.isDestroyed()) return;
  w.webContents.executeJavaScript(depth > 0 ? overlay(label, since, subText) : remove).catch(() => {});
  // [중지]를 눌렀는지 0.3초마다 본다
  if (depth > 0 && !poll) {
    poll = setInterval(() => {
      const w2 = getWin();
      if (!w2 || w2.isDestroyed() || depth <= 0) {
        clearInterval(poll);
        poll = null;
        return;
      }
      w2.webContents
        .executeJavaScript("(() => { const v = window.__gsAiStopReq; window.__gsAiStopReq = false; return Boolean(v); })()")
        .then((v) => v && stop())
        .catch(() => {});
    }, 300);
  }
  if (depth <= 0 && poll) {
    clearInterval(poll);
    poll = null;
  }
}

/** 웹 채팅 AI 창에서 답변 중지 단추 누르기 (되는 대로) */
async function stopChats() {
  try {
    const chrome = require("./studio-chrome");
    for (const p of await chrome.openPages()) {
      if (!/chatgpt\.com|gemini\.google\.com|claude\.ai/.test(p.url())) continue;
      await p
        .evaluate(() => {
          const b = document.querySelector('button[data-testid="stop-button"], button[aria-label*="중지"], button[aria-label*="Stop"], button[aria-label*="stop"]');
          if (b) b.click();
        })
        .catch(() => {});
    }
  } catch {}
}

/** [중지] — 기다리던 일을 모두 "중지했어요" 로 끝내고 덮개를 닫는다 */
function stop() {
  if (depth <= 0) return;
  log.info(`[AI] 중지 (${Math.round((Date.now() - since) / 1000)}초)`);
  stopped = true;
  gen++;
  ctl.abort();
  for (const c of [...cancels]) c();
  cancels.clear();
  depth = 0;
  paint();
  stopChats();
}
/** 중지했는지 — 뒤에서 도는 기다리기(studio-chrome sleep)가 보고 멈춘다 */
const isStopped = () => stopped;
const stopError = () => Object.assign(new Error(STOP_MSG), { code: "GS_STOPPED" });
/** API 요청에 붙일 끊기 신호 */
const signal = () => ctl.signal;

/** main.js 가 앱 창을 알려 준다. 쓰는 중에 화면이 다시 뜨면(새로고침 등) 덮개도 다시 */
function setWindow(fn) {
  getWin = fn;
}
function attach(win) {
  win.webContents.on("did-finish-load", () => depth > 0 && paint());
}

/** fn 이 끝날 때까지 덮개 — text: "ChatGPT가 기사를 작성하고 있어요" */
async function during(text, fn, sub = "") {
  // 중지한 일이 아직 뒤에서 멈추는 중이면 잠깐 기다렸다가 (최대 10초) — 새 일이 중지 표시에 걸리지 않게
  for (let i = 0; stopped && running.size && i < 50; i++) await new Promise((r) => setTimeout(r, 200));
  if (stopped) {
    stopped = false;
    ctl = new AbortController();
  }
  const my = gen;
  depth++;
  if (depth === 1) since = Date.now();
  label = text;
  subText = sub;
  paint();
  let cancel = () => {};
  const halt = new Promise((_, no) => {
    cancel = () => no(stopError());
  });
  cancels.add(cancel);
  const job = Promise.resolve().then(fn);
  running.add(job);
  job
    .catch(() => {})
    .finally(() => {
      running.delete(job);
      if (!running.size && stopped) {
        stopped = false;
        ctl = new AbortController();
      }
    });
  try {
    return await Promise.race([job, halt]);
  } finally {
    cancels.delete(cancel);
    if (my === gen) {
      depth = Math.max(0, depth - 1);
      paint();
      if (!depth) log.info(`[AI] 덮개 닫음 (${Math.round((Date.now() - since) / 1000)}초)`);
    }
  }
}

module.exports = { setWindow, attach, during, stop, isStopped, stopError, signal, STOP_MSG };
