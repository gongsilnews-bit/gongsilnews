// AI 가 글·그림을 쓰는 동안 스튜디오 창 전체를 덮는다 — "AI가 기사를 작성하고 있습니다… 잠시만 기다려 주세요 (0:42)"
// 그동안 다른 메뉴를 누르거나 화면을 옮기지 못하게 (사장님 2026-10-16). 웹 화면 버전과 상관없이 앱이 직접 그린다.
// 기사·블로그·SNS·유튜브·칼럼·공실마케팅·영상 대본이 모두 ai/index.js 의 ask·askImage 를 거치므로 거기서 감싼다.
const log = require("electron-log/main");

let getWin = () => null;
let depth = 0; // 겹쳐 부르면 마지막이 끝날 때 닫는다
let label = "";
let subText = ""; // 아래 작은 글 — API 키로 쓸 때는 "크롬 창" 안내 대신
let since = 0;

const overlay = (text, startedAt, sub) => `(() => {
  const id = "__gsAiBusy";
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.innerHTML = \`<style>
      #__gsAiBusy{position:fixed;inset:0;z-index:2147483647;background:rgba(10,14,20,.62);display:flex;align-items:center;justify-content:center;font-family:'Pretendard Variable','Malgun Gothic',sans-serif;cursor:wait}
      #__gsAiBusy .c{background:#16202b;color:#fff;border-radius:14px;padding:30px 40px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.45);min-width:380px}
      #__gsAiBusy .d{display:flex;gap:10px;justify-content:center;margin-bottom:18px}
      #__gsAiBusy .d i{width:14px;height:14px;border-radius:7px;background:#3b82f6;animation:gsb 1.2s infinite ease-in-out}
      #__gsAiBusy .d i:nth-child(2){animation-delay:.15s}#__gsAiBusy .d i:nth-child(3){animation-delay:.3s}
      @keyframes gsb{0%,80%,100%{transform:scale(.55);opacity:.35}40%{transform:scale(1);opacity:1}}
      #__gsAiBusy .t{font-size:19px;font-weight:800}
      #__gsAiBusy .s{font-size:14.5px;color:#b6c2cf;margin-top:8px;line-height:1.6}
      #__gsAiBusy .e{font-size:24px;font-weight:800;margin-top:14px;font-variant-numeric:tabular-nums;color:#93c5fd}
    </style><div class="c"><div class="d"><i></i><i></i><i></i></div><div class="t"></div>
      <div class="s">보통 1~2분 걸려요. 오른쪽 크롬 창에서 AI가 쓰는 모습을 볼 수 있어요.<br>끝나면 저절로 가져와요 — 크롬 창은 그대로 두세요.</div><div class="e">0:00</div></div>\`;
    // 덮개 아래로 누르기·키 입력이 가지 않게
    for (const ev of ["click", "mousedown", "pointerdown", "keydown", "wheel", "contextmenu"]) el.addEventListener(ev, (e) => { e.stopPropagation(); e.preventDefault(); }, true);
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
const remove = `(() => { clearInterval(window.__gsAiBusyT); const el = document.getElementById("__gsAiBusy"); if (el) el.remove(); })()`;

function paint() {
  const w = getWin();
  if (!w || w.isDestroyed()) return;
  w.webContents.executeJavaScript(depth > 0 ? overlay(label, since, subText) : remove).catch(() => {});
}

/** main.js 가 앱 창을 알려 준다. 쓰는 중에 화면이 다시 뜨면(새로고침 등) 덮개도 다시 */
function setWindow(fn) {
  getWin = fn;
}
function attach(win) {
  win.webContents.on("did-finish-load", () => depth > 0 && paint());
}

/** fn 이 끝날 때까지 덮개 — text: "ChatGPT가 기사를 작성하고 있어요" */
async function during(text, fn, sub = "") {
  depth++;
  if (depth === 1) since = Date.now();
  label = text;
  subText = sub;
  paint();
  try {
    return await fn();
  } finally {
    depth = Math.max(0, depth - 1);
    paint();
    if (!depth) log.info(`[AI] 덮개 닫음 (${Math.round((Date.now() - since) / 1000)}초)`);
  }
}

module.exports = { setWindow, attach, during };
