/* 공실마케팅 도우미 — 앱(PC 안 창구 127.0.0.1)과 이야기한다
   글쓰기 화면의 content script 는 https 페이지 안이라 http://127.0.0.1 을 직접 부를 수 없어서 여기서 대신 부른다.
   앱 helper-server.js 와 같은 번호 목록을 차례로 두드린다. */
const PORTS = [47615, 47616, 47617, 47618, 47619];
let found = 0; // 마지막으로 앱이 대답한 번호

async function call(pathAndQuery, init) {
  const order = found ? [found, ...PORTS.filter((p) => p !== found)] : PORTS;
  for (const p of order) {
    try {
      // X-GS-Helper — 앱 창구가 "도우미 확장이 부른 것"으로 알아보는 표시
      const r = await fetch(`http://127.0.0.1:${p}${pathAndQuery}`, { cache: "no-store", ...init, headers: { ...((init && init.headers) || {}), "X-GS-Helper": "1" } });
      if (!r.ok) continue;
      const j = await r.json();
      found = p;
      return j;
    } catch (_) {
      /* 이 번호엔 앱이 없다 — 다음 번호 */
    }
  }
  return null;
}

/* ── 지운 인스타그램·페이스북 글 확인 (2026-10-29 사장님) ──
   로그인한 평소 크롬에서만 지운 글을 알아볼 수 있다. 하루 한 번 앱에게 링크를 받아 최소화한 창으로 하나씩 열어 보고 닫는다.
   페이지 쪽(helper-sns.js)이 #gs-verify 를 보고 "없는 페이지" 글자를 찾아 GS_VERIFY 로 알린다. 확인 못 하면(로그인 안 됨 등) 그대로 둔다 */
const VERIFY_EVERY = 24 * 60 * 60 * 1000;
const waiting = new Map(); // tabId → resolve
//  only — [링크 수정]에서 부탁한 링크만 (몇 개). 없으면 하루 한 번 전체 (최대 60개, 하나에 몇 초씩 최소화 창에서)
async function verifyLinks(force, only) {
  let urls = Array.isArray(only) && only.length ? only : null;
  if (!urls) {
    const { gsVerifiedAt = 0 } = await chrome.storage.local.get("gsVerifiedAt");
    if (!force && Date.now() - gsVerifiedAt < VERIFY_EVERY) return;
    const j = await call("/gs-helper/verify-list");
    if (!j || !j.ok) return; // 앱이 꺼져 있다 — 다음에
    await chrome.storage.local.set({ gsVerifiedAt: Date.now() });
    urls = (j.urls || []).slice(0, 60);
  }
  if (!urls.length) return;
  let win = null;
  for (const u of urls) {
    try {
      const target = `${u}${u.includes("#") ? "" : "#gs-verify"}`;
      let tabId;
      if (!win) {
        win = await chrome.windows.create({ url: target, state: "minimized", focused: false });
        tabId = win.tabs && win.tabs[0] && win.tabs[0].id;
      } else {
        const t = await chrome.tabs.create({ windowId: win.id, url: target, active: true });
        tabId = t.id;
      }
      const gone = await new Promise((resolve) => {
        waiting.set(tabId, resolve);
        setTimeout(() => { if (waiting.delete(tabId)) resolve(null); }, 25000);
      });
      if (gone === true) await call("/gs-helper/gone", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: u }) });
      call("/gs-helper/log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: `지운 글 확인 ${gone === true ? "지움" : gone === false ? "있음" : "모름"} ${u}` }) });
      if (win && tabId && (win.tabs || []).every((x) => x.id !== tabId)) chrome.tabs.remove(tabId).catch(() => {});
    } catch (_) { /* 다음 링크 */ }
  }
  if (win) chrome.windows.remove(win.id).catch(() => {});
}
// 크롬을 켜거나 확장을 새로고침하면 1분 뒤 한 번 — setTimeout 은 크롬이 확장을 잠재우면 사라져서 알람으로 (2026-10-29)
chrome.runtime.onStartup.addListener(() => { chrome.alarms.create("gs-verify-once", { delayInMinutes: 1 }); });
// 1분마다 앱에 "지금 확인할까" 묻는다 — 회원이 앱에서 [링크 수정]을 누르면 바로 (앱이 꺼져 있으면 아무 일 없음)
const alarms = () => { chrome.alarms.create("gs-verify", { periodInMinutes: 180 }); chrome.alarms.create("gs-verify-poll", { periodInMinutes: 1 }); };
chrome.runtime.onInstalled.addListener(() => { alarms(); chrome.alarms.create("gs-verify-once", { delayInMinutes: 1 }); });
chrome.runtime.onStartup.addListener(alarms);
let verifying = false;
chrome.alarms.onAlarm.addListener(async (a) => {
  if (a.name === "gs-verify" || a.name === "gs-verify-once") verifyLinks(false);
  if (a.name === "gs-verify-poll" && !verifying) {
    const j = await call("/gs-helper/verify-wanted");
    if (j && j.want) { verifying = true; try { await verifyLinks(true, j.urls || []); } finally { verifying = false; } }
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "GS_VERIFY") {
    const id = sender && sender.tab && sender.tab.id;
    const done = waiting.get(id);
    if (done) { waiting.delete(id); done(msg.gone === true ? true : msg.gone === false ? false : null); }
    sendResponse({ ok: true });
    return false;
  }
  if (msg?.type === "GS_VERIFY_NOW") { verifyLinks(true).then(() => sendResponse({ ok: true })); return true; }
  // 글 넣기 전에 그 크롬 창·탭을 앞으로 — 편집기(페이스북·인스타 Lexical)는 창이 뒤에 있으면 커서를 못 잡아 글을 무시한다
  if (msg?.type === "GS_FOCUS") {
    const tab = sender && sender.tab;
    if (!tab) { sendResponse({ ok: false }); return false; }
    chrome.windows.update(tab.windowId, { focused: true }, () => {
      const windowError = chrome.runtime.lastError?.message;
      if (windowError) { sendResponse({ ok: false, error: windowError }); return; }
      chrome.tabs.update(tab.id, { active: true }, () => {
        const tabError = chrome.runtime.lastError?.message;
        sendResponse({ ok: !tabError, error: tabError || "" });
      });
    });
    return true;
  }
  if (msg?.type === "GS_PING") {
    call("/gs-helper/ping").then((j) => sendResponse({ ok: Boolean(j && j.ok) }));
    return true;
  }
  if (msg?.type === "GS_CLAIM") {
    call(`/gs-helper/claim?target=${encodeURIComponent(msg.target || "")}`).then((j) => sendResponse({ job: (j && j.job) || null }));
    return true;
  }
  if (msg?.type === "GS_DONE") {
    call("/gs-helper/done", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: msg.id, result: msg.result }) })
      .then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg?.type === "GS_LOG") {
    call("/gs-helper/log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: `v${chrome.runtime.getManifest().version} ${msg.text}` }) })
      .then(() => sendResponse({ ok: true }));
    return true;
  }
  // 회원이 발행한 글 주소 → 앱 (홍보현황 "연결됨", 2026-10-27)
  if (msg?.type === "GS_PUBLISHED") {
    call("/gs-helper/published", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: msg.id, url: msg.url }) })
      .then((j) => sendResponse({ ok: Boolean(j && j.ok) }));
    return true;
  }
  return false;
});
