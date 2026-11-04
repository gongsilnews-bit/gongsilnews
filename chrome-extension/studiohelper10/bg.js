/* 공실마케팅 도우미 — 앱(PC 안 창구 127.0.0.1)과 이야기한다. 공실뉴스 웹에서 올린 일감은 크롬 안에 둔다 (webMessage)
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
//  only — [링크체크]에서 부탁한 링크만 (몇 개). 없으면 하루 한 번 전체 (최대 60개, 하나에 몇 초씩 최소화 창에서)
async function verifyLinks(force, only) {
  let urls = Array.isArray(only) && only.length ? only : null;
  let full = false;
  if (!urls) {
    const { gsVerifiedAt = 0 } = await chrome.storage.local.get("gsVerifiedAt");
    if (!force && Date.now() - gsVerifiedAt < VERIFY_EVERY) return;
    const j = await call("/gs-helper/verify-list");
    if (!j || !j.ok) return; // 앱이 꺼져 있다 — 다음에
    urls = (j.urls || []).slice(0, 60);
    full = true; // 다 끝낸 뒤에 "오늘 확인함" — 중간에 크롬이 잠재우면 다음에 다시 (2026-10-29)
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
  if (full) await chrome.storage.local.set({ gsVerifiedAt: Date.now() });
}
// 크롬을 켜거나 확장을 새로고침하면 1분 뒤 한 번 — setTimeout 은 크롬이 확장을 잠재우면 사라져서 알람으로 (2026-10-29)
chrome.runtime.onStartup.addListener(() => { chrome.alarms.create("gs-verify-once", { delayInMinutes: 1 }); });
// 1분마다 앱에 "지금 확인할까" 묻는다 — 회원이 앱에서 [링크체크]을 누르면 바로 (앱이 꺼져 있으면 아무 일 없음)
const alarms = () => { chrome.alarms.create("gs-verify", { periodInMinutes: 180 }); chrome.alarms.create("gs-verify-poll", { periodInMinutes: 1 }); };
// 새로 깔거나 새로고침하면 "오늘 확인함"을 지우고 1분 뒤 전체를 다시
chrome.runtime.onInstalled.addListener(() => { alarms(); chrome.storage.local.remove("gsVerifiedAt"); chrome.alarms.create("gs-verify-once", { delayInMinutes: 1 }); });
chrome.runtime.onStartup.addListener(alarms);
let verifying = false;
chrome.alarms.onAlarm.addListener(async (a) => {
  if (a.name === "gs-verify" || a.name === "gs-verify-once") verifyLinks(false);
  if (a.name === "gs-verify-poll" && !verifying) {
    const j = await call("/gs-helper/verify-wanted");
    if (j && j.want) { verifying = true; try { await verifyLinks(true, j.urls || []); } finally { verifying = false; } }
  }
});

/* ── 공실뉴스 웹에서 올린 일감 (2026-11-03 사장님: 웹 뉴스·SNS자동화) ──
   web-bridge.js 가 웹페이지의 부탁을 GS_WEB 로 건넨다. 앱 창구(127.0.0.1) 대신 여기(크롬 안)에 일감을 둔다.
   크롬이 확장을 잠재워도 남게 storage.session 에 (크롬을 끄면 사라진다). 5분 안에 안 받아 가면 버린다 */
const WEB_TTL = 5 * 60 * 1000;
const WEB_KEEP = 3 * 60 * 60 * 1000; // 발행 주소를 웹이 가져갈 때까지
const isWebId = (id) => typeof id === "string" && id.startsWith("web-");
async function webJobs() {
  try { const { gsWebJobs = {} } = await chrome.storage.session.get("gsWebJobs"); return gsWebJobs; } catch (_) { return {}; }
}
async function saveWebJobs(jobs) {
  const now = Date.now();
  for (const [id, j] of Object.entries(jobs)) {
    if ((!j.taken && now - j.at > WEB_TTL) || now - j.at > WEB_KEEP) delete jobs[id];
    else if (j.taken && j.payload) delete j.payload; // 받아 간 사진은 비운다 (자리 아끼기)
  }
  await chrome.storage.session.set({ gsWebJobs: jobs });
}
async function webMessage(msg) {
  const jobs = await webJobs();
  if (msg.op === "ping") return { ok: true, version: chrome.runtime.getManifest().version };
  if (msg.op === "job") {
    const target = String(msg.target || "");
    if (!["naver", "instagram", "threads", "facebook"].includes(target)) return { ok: false, error: "알 수 없는 채널" };
    for (const [id, j] of Object.entries(jobs)) if (j.target === target && !j.taken) delete jobs[id]; // 같은 곳의 옛 일감은 버린다
    const id = `web-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    jobs[id] = { id, target, payload: msg.payload || {}, at: Date.now(), taken: 0, done: null, published: "" };
    await saveWebJobs(jobs);
    return { ok: true, id };
  }
  if (msg.op === "status") {
    const j = jobs[msg.id];
    return j ? { ok: true, taken: Boolean(j.taken), done: j.done, published: j.published || "" } : { ok: false };
  }
  if (msg.op === "forget") { delete jobs[msg.id]; await saveWebJobs(jobs); return { ok: true }; }
  return { ok: false };
}
/* 채울 화면이 일감을 찾을 때 — 웹에서 올린 것 먼저 (가장 최근 것) */
async function claimWeb(target) {
  const jobs = await webJobs();
  const j = Object.values(jobs).filter((x) => x.target === target && !x.taken && x.payload && Date.now() - x.at < WEB_TTL).sort((a, b) => b.at - a.at)[0];
  if (!j) return null;
  const job = { id: j.id, target, ...j.payload };
  j.taken = Date.now();
  await saveWebJobs(jobs);
  return job;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "GS_WEB") { webMessage(msg.msg || {}).then(sendResponse, () => sendResponse({ ok: false })); return true; }
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
    claimWeb(msg.target || "").then(async (web) => {
      if (web) return sendResponse({ job: web });
      const j = await call(`/gs-helper/claim?target=${encodeURIComponent(msg.target || "")}`);
      sendResponse({ job: (j && j.job) || null });
    });
    return true;
  }
  if (msg?.type === "GS_DONE" && isWebId(msg.id)) {
    webJobs().then(async (jobs) => { if (jobs[msg.id]) { jobs[msg.id].done = msg.result || { ok: false }; await saveWebJobs(jobs); } sendResponse({ ok: true }); });
    return true;
  }
  if (msg?.type === "GS_PUBLISHED" && isWebId(msg.id)) {
    webJobs().then(async (jobs) => {
      const ok = Boolean(jobs[msg.id] && /^https:\/\//.test(String(msg.url || "")));
      if (ok) { jobs[msg.id].published = String(msg.url); await saveWebJobs(jobs); }
      sendResponse({ ok });
    });
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
