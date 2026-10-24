// AI 가 글·그림을 쓰는 동안 스튜디오 창 전체를 덮는다 — "AI가 기사를 작성하고 있습니다… 잠시만 기다려 주세요 (0:42)"
// 기다리는 동안 공실뉴스 재생 로고가 숨 쉬듯 움직이고 주황 고리가 돈다 · 글 끝 점(...)은 하나씩 늘어난다 (2026-10-24 사장님)
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

/* 기다리는 동안 광고 (2026-10-22 · docs/2026-10-22_studio_wait_ads_plan.md)
 *  덮개가 4초 넘게 떠 있으면 최고관리자가 고른 유튜브 영상을 덮개 안에 틀어 준다 (소리 끈 채).
 *  광고는 사이트의 /api/studio/ad 에서 받는다 — 없거나 최고관리자 계정이면 지금처럼 로딩만.
 *  AI 가 다 쓰면 영상도 바로 끊고 덮개를 닫는다 (2026-10-22 사장님). 숫자(노출·시청 초·클릭)만 남김.
 *  이 함수는 앱이 아니라 스튜디오 화면 안에서 돈다 (문자열로 넣음) */
function adLib() {
  if (window.__gsAd) return;
  const A = { ad: null, shownAt: 0, last: 0, timer: 0, place: "ai", muted: true };
  const post = (kind, seconds) => {
    if (!A.ad) return;
    try {
      fetch("/api/studio/ad", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: A.ad.id, place: A.place, kind, seconds }), keepalive: true }).catch(() => {});
    } catch {}
  };
  const box = () => document.getElementById("__gsAiBusy");
  const btn = (text, fn) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "gb";
    b.textContent = text;
    b.__gsFn = fn;
    return b;
  };
  function show(ad) {
    const el = box();
    const c = el && el.querySelector(".c");
    if (!c || c.querySelector(".ad")) return;
    A.ad = ad;
    A.shownAt = Date.now();
    A.last = ad.id;
    A.muted = true;
    const wrap = document.createElement("div");
    wrap.className = "ad";
    const v = document.createElement("div");
    v.className = "v";
    const f = document.createElement("iframe");
    const yid = encodeURIComponent(ad.youtube_id);
    f.src = "https://www.youtube-nocookie.com/embed/" + yid + "?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=" + yid + "&enablejsapi=1&origin=" + encodeURIComponent(location.origin);
    f.allow = "autoplay; encrypted-media";
    v.appendChild(f);
    // 광고주 링크 — 영상을 눌러도 새 창(평소 브라우저)으로 연다 (2026-10-23 사장님)
    if (ad.link_url) {
      v.style.position = "relative";
      const go = document.createElement("div");
      go.className = "go";
      go.title = "광고주 사이트 열기 (새 창)";
      go.style.cssText = "position:absolute;inset:0;cursor:pointer;background:transparent";
      go.__gsFn = () => { post("click"); window.open(ad.link_url, "_blank"); };
      v.appendChild(go);
    }
    wrap.appendChild(v);
    const bar = document.createElement("div");
    bar.className = "b";
    const lab = document.createElement("span");
    lab.className = "l";
    lab.textContent = ad.label;
    bar.appendChild(lab);
    const mute = btn("🔇 소리 켜기", () => {
      A.muted = !A.muted;
      if (f.contentWindow) f.contentWindow.postMessage(JSON.stringify({ event: "command", func: A.muted ? "mute" : "unMute", args: [] }), "*");
      mute.textContent = A.muted ? "🔇 소리 켜기" : "🔊 소리 끄기";
    });
    bar.appendChild(mute);
    if (ad.link_url) bar.appendChild(btn("광고주 사이트 열기 ↗", () => { post("click"); window.open(ad.link_url, "_blank"); }));
    wrap.appendChild(bar);
    c.appendChild(wrap);
    post("view");
  }
  window.__gsAd = {
    start(place) {
      A.place = place || "ai";
      if (A.ad || A.timer) return;
      A.timer = setTimeout(() => {
        A.timer = 0;
        if (!box() || box().classList.contains("done")) return;
        fetch("/api/studio/ad?place=" + A.place + "&last=" + (A.last || ""), { cache: "no-store" })
          .then((r) => r.json())
          .then((j) => { if (j && j.ad && box() && !box().classList.contains("done")) show(j.ad); })
          .catch(() => {});
      }, 4000);
    },
    has() { const el = box(); return Boolean(A.ad && el && el.querySelector(".ad")); },
    close() {
      clearTimeout(A.timer);
      A.timer = 0;
      if (A.ad) post("watch", (Date.now() - A.shownAt) / 1000);
      A.ad = null;
      const el = box();
      if (el) el.remove();
    },
    click(target) {
      const b = target && target.closest ? target.closest(".gb, .go") : null;
      if (b && b.__gsFn) { b.__gsFn(); return true; }
      return false;
    },
  };
}
const AD_JS = `(${adLib})();`;

const overlay = (text, startedAt, sub) => `(() => {
  const id = "__gsAiBusy";
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.innerHTML = \`<style>
      #__gsAiBusy{position:fixed;inset:0;z-index:2147483647;background:rgba(10,14,20,.62);display:flex;align-items:center;justify-content:center;font-family:'Pretendard Variable','Malgun Gothic',sans-serif;cursor:wait}
      #__gsAiBusy .c{background:#16202b;color:#fff;border-radius:14px;padding:30px 40px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.45);min-width:380px;cursor:default}
      #__gsAiBusy .d{display:none} /* 동그란 로고 — 정신없어서 뺌 (2026-10-24 사장님) */
      #__gsAiBusy .d .r{position:absolute;inset:0;border-radius:50%;border:4px solid rgba(245,166,35,.18);border-top-color:#f5a623;animation:gsr 1s linear infinite}
      #__gsAiBusy .d img{position:absolute;inset:10px;width:68px;height:68px;border-radius:50%;background:#fff;animation:gsp 1.6s ease-in-out infinite}
      @keyframes gsr{to{transform:rotate(360deg)}}
      @keyframes gsp{0%,100%{transform:scale(.93)}50%{transform:scale(1.04)}}
      #__gsAiBusy .t{font-size:19px;font-weight:800}
      #__gsAiBusy .t .p i{font-style:normal;opacity:0;animation:gsd 1.5s infinite}
      #__gsAiBusy .t .p i:nth-child(2){animation-delay:.25s}#__gsAiBusy .t .p i:nth-child(3){animation-delay:.5s}
      @keyframes gsd{0%,15%{opacity:0}35%,100%{opacity:1}}
      #__gsAiBusy .s{font-size:14.5px;color:#b6c2cf;margin-top:8px;line-height:1.6}
      #__gsAiBusy .e{font-size:24px;font-weight:800;margin-top:14px;font-variant-numeric:tabular-nums;color:#93c5fd}
      #__gsAiBusy .x{margin-top:14px;height:24px;padding:0 10px;border-radius:5px;border:1px solid #374151;background:transparent;color:#6b7280;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer}
      #__gsAiBusy .x:hover{color:#fff;background:#dc2626;border-color:#dc2626}
      #__gsAiBusy .k{font-size:12px;color:#6b7280;margin-top:12px}
      #__gsAiBusy .ad{width:600px;max-width:72vw;margin:18px auto 0}
      #__gsAiBusy .ad .v{aspect-ratio:16/9;background:#000;border-radius:8px;overflow:hidden}
      #__gsAiBusy .ad iframe{width:100%;height:100%;border:0;display:block}
      #__gsAiBusy .ad .b{display:flex;align-items:center;gap:8px;margin-top:8px}
      #__gsAiBusy .ad .l{flex:1;text-align:left;font-size:12.5px;color:#9ca3af}
      #__gsAiBusy .gb{height:28px;padding:0 12px;border-radius:6px;border:1px solid #374151;background:#1f2b38;color:#e5e7eb;font-size:12.5px;font-weight:700;font-family:inherit;cursor:pointer}
      #__gsAiBusy .gb:hover{background:#2b3a4b}
      #__gsAiBusy .ok{display:none;margin:14px auto 0;height:40px;padding:0 26px;border-radius:8px;border:0;background:#2563eb;color:#fff;font-size:15px;font-weight:800;font-family:inherit;cursor:pointer}
      #__gsAiBusy.done{cursor:default}
      #__gsAiBusy.done .d,#__gsAiBusy.done .t .p,#__gsAiBusy.done .s,#__gsAiBusy.done .e,#__gsAiBusy.done .k{display:none}
      #__gsAiBusy.done .ok{display:block}
    </style><div class="c"><div class="d"><span class="r"></span><img src="/studio-cam-logo.png" alt=""></div><div class="t"><span class="w"></span><span class="p"><i>.</i><i>.</i><i>.</i></span></div><button type="button" class="ok">결과 보기</button>
      <div class="s">보통 1~2분 걸려요. 오른쪽 크롬 창에서 AI가 쓰는 모습을 볼 수 있어요.<br>끝나면 저절로 가져와요 — 크롬 창은 그대로 두세요.</div><div class="e">0:00</div>
      <div class="k">급할 때는 Esc 키로 멈춰요</div></div>\`;
    // 덮개 아래로 누르기·키 입력이 가지 않게 — [중지]만 (앱이 window.__gsAiStopReq 를 읽어 간다)
    for (const ev of ["click", "mousedown", "pointerdown", "keydown", "wheel", "contextmenu"]) el.addEventListener(ev, (e) => {
      const x = e.target && e.target.closest ? e.target.closest(".x") : null;
      if (ev === "click" && x) { window.__gsAiStopReq = true; x.textContent = "멈추는 중…"; }
      // 수동(복사해서 쓰기) 단추 — 앱이 window.__gsManualAct 를 읽어 간다
      const gm = e.target && e.target.closest ? e.target.closest("[data-gsm]") : null;
      if (ev === "click" && gm) { window.__gsManualAct = gm.getAttribute("data-gsm"); e.stopPropagation(); e.preventDefault(); return; }
      // 광고 단추 (소리 켜기·자세히 보기) · 다 된 뒤 [결과 보기]
      if (ev === "click" && e.target && e.target.closest && e.target.closest(".ok")) { if (window.__gsAd) window.__gsAd.close(); else el.remove(); }
      else if (ev === "click" && window.__gsAd) window.__gsAd.click(e.target);
      e.stopPropagation(); e.preventDefault();
    }, true);
    if (!window.__gsAiEsc) {
      window.__gsAiEsc = true;
      window.addEventListener("keydown", (e) => {
        const cur = document.getElementById(id);
        if (e.key !== "Escape" || !cur) return;
        if (cur.classList.contains("done")) { if (window.__gsAd) window.__gsAd.close(); else cur.remove(); } // 다 된 뒤 광고 창은 Esc 로 닫기
        else window.__gsAiStopReq = true;
        e.stopPropagation(); e.preventDefault();
      }, true);
    }
    document.documentElement.appendChild(el);
  }
  el.classList.remove("done"); // 다시 일하면 "다 됐어요" 를 되돌림 (광고는 이어서)
  el.querySelector(".t .w").textContent = ${JSON.stringify(String(text || "").replace(/[….\s]+$/, ""))}; // 끝 점은 움직이는 점(.p)으로
  if (!el.__gsSub) el.__gsSub = el.querySelector(".s").innerHTML; // 처음 문구 (크롬 창 안내)
  el.querySelector(".s").innerHTML = ${JSON.stringify(sub || "")} || el.__gsSub;
  const t0 = ${startedAt};
  clearInterval(window.__gsAiBusyT);
  const tick = () => { const s = Math.max(0, Math.floor((Date.now() - t0) / 1000)); el.querySelector(".e").textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  tick();
  window.__gsAiBusyT = setInterval(tick, 500);
})()`;
// AI 가 다 쓰면 광고 영상도 바로 끊는다 (2026-10-22 사장님) — 본 초만 남기고 덮개를 닫음
const remove = () => `(() => {
  clearInterval(window.__gsAiBusyT); window.__gsAiStopReq = false;
  const el = document.getElementById("__gsAiBusy");
  if (!el) return;
  if (window.__gsAd) window.__gsAd.close(); else el.remove();
})()`;

function paint() {
  const w = getWin();
  if (!w || w.isDestroyed()) return;
  w.webContents.executeJavaScript(depth > 0 ? `${AD_JS}${overlay(label, since, subText)};window.__gsAd && window.__gsAd.start("ai");` : remove()).catch(() => {});
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

/* 누르는 순간부터 덮개 (2026-10-23 사장님) — AI 에 묻기 전 준비(사진 받기·기사 읽기·화면 캡쳐)도 덮개에 단계로 보여 준다.
   화면이 hold → text(단계마다) → release 로 부른다. 그사이 AI 가 during 으로 덮어도 숫자로 겹쳐 세어 마지막에 닫힌다 */
let holding = false;
let holdGen = -1;
const PREP_SUB = "준비하는 중이에요 — 사진·기사·화면 캡쳐를 모은 뒤 AI 가 쓰기 시작해요.";
function hold(text, sub = "") {
  if (stopped && !running.size) { stopped = false; ctl = new AbortController(); }
  if (!holding) { holding = true; holdGen = gen; depth++; if (depth === 1) since = Date.now(); }
  label = String(text || "준비하는 중…");
  subText = sub || PREP_SUB;
  paint();
  return { stopped: false };
}
/** 단계 글 바꾸기 — 그사이 [중지]·Esc 를 눌렀으면 stopped */
function holdText(text, sub = "") {
  if (!holding) return { stopped: false };
  if (gen !== holdGen) { holding = false; return { stopped: true }; }
  label = String(text || label);
  subText = sub || PREP_SUB;
  paint();
  return { stopped: false };
}
function release() {
  if (!holding) return;
  holding = false;
  if (gen === holdGen) { depth = Math.max(0, depth - 1); paint(); }
}

/** 수동 — 덮개 아래 글(단추 포함)을 바꾼다 */
function setSub(html) {
  subText = String(html || "");
  if (depth > 0) paint();
}
/** 수동 — 눌린 단추 하나 꺼내기 ("copy" · "paste" · "") */
async function takeAct() {
  const w = getWin();
  if (!w || w.isDestroyed()) return "";
  return w.webContents.executeJavaScript("(() => { const v = window.__gsManualAct || ''; window.__gsManualAct = ''; return v; })()").catch(() => "");
}

module.exports = { setWindow, attach, during, stop, isStopped, stopError, signal, STOP_MSG, hold, holdText, release, setSub, takeAct };
