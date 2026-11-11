/* 공실마케팅 앱 창구 — 앱(PC 안 127.0.0.1)이 맡긴 일감을 받아 온다 (2026-11-11 사장님: "하나로")
   앱용 공실마케팅 도우미(studiohelper10 bg.js)를 이 확장에 합침. 웹 일감은 bg-web.js, 앱 일감은 여기.
   - 글쓰기 화면의 content script 는 https 페이지 안이라 http://127.0.0.1 을 직접 부를 수 없어서 여기서 대신 부른다
   - 앱 helper-server.js 와 같은 번호 목록을 차례로 두드린다. 앱이 꺼져 있으면 조용히 아무 일 없음
   - 지운 인스타그램·페이스북 글 확인(하루 한 번·[링크체크])도 앱 일이라 여기서
   background.js 가 importScripts 로 부른다 (bg-web.js 보다 먼저) → self.gsApp */
(() => {
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
      } catch (_) { /* 이 번호엔 앱이 없다 — 다음 번호 */ }
    }
    return null;
  }
  const post = (path, body) => call(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  /* ── 지운 인스타그램·페이스북 글 확인 (2026-10-29) ──
     로그인한 평소 크롬에서만 지운 글을 알아볼 수 있다. 하루 한 번 앱에게 링크를 받아 최소화한 창으로 하나씩 열어 보고 닫는다.
     페이지 쪽(helper-sns.js)이 #gs-verify 를 보고 "없는 페이지" 글자를 찾아 GS_VERIFY 로 알린다 */
  const VERIFY_EVERY = 24 * 60 * 60 * 1000;
  const waiting = new Map(); // tabId → resolve
  async function verifyLinks(force, only) {
    let urls = Array.isArray(only) && only.length ? only : null;
    let full = false;
    if (!urls) {
      const { gsVerifiedAt = 0 } = await chrome.storage.local.get("gsVerifiedAt");
      if (!force && Date.now() - gsVerifiedAt < VERIFY_EVERY) return;
      const j = await call("/gs-helper/verify-list");
      if (!j || !j.ok) return; // 앱이 꺼져 있다 — 다음에
      urls = (j.urls || []).slice(0, 60);
      full = true;
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
        if (gone === true) await post("/gs-helper/gone", { url: u });
        post("/gs-helper/log", { text: `지운 글 확인 ${gone === true ? "지움" : gone === false ? "있음" : "모름"} ${u}` });
        if (win && tabId && (win.tabs || []).every((x) => x.id !== tabId)) chrome.tabs.remove(tabId).catch(() => {});
      } catch (_) { /* 다음 링크 */ }
    }
    if (win) chrome.windows.remove(win.id).catch(() => {});
    if (full) await chrome.storage.local.set({ gsVerifiedAt: Date.now() });
  }
  // 크롬을 켜거나 확장을 새로고침하면 1분 뒤 한 번 — 알람으로 (크롬이 확장을 잠재우면 setTimeout 은 사라진다)
  const alarms = () => { chrome.alarms.create("gs-verify", { periodInMinutes: 180 }); chrome.alarms.create("gs-verify-poll", { periodInMinutes: 1 }); };
  chrome.runtime.onStartup.addListener(() => { alarms(); chrome.alarms.create("gs-verify-once", { delayInMinutes: 1 }); });
  chrome.runtime.onInstalled.addListener(() => { alarms(); chrome.storage.local.remove("gsVerifiedAt"); chrome.alarms.create("gs-verify-once", { delayInMinutes: 1 }); });
  let verifying = false;
  chrome.alarms.onAlarm.addListener(async (a) => {
    if (a.name === "gs-verify" || a.name === "gs-verify-once") verifyLinks(false);
    // 1분마다 앱에 "지금 확인할까" 묻는다 — 회원이 앱에서 [링크체크]를 누르면 바로 (앱이 꺼져 있으면 아무 일 없음)
    if (a.name === "gs-verify-poll" && !verifying) {
      const j = await call("/gs-helper/verify-wanted");
      if (j && j.want) { verifying = true; try { await verifyLinks(true, j.urls || []); } finally { verifying = false; } }
    }
  });

  self.gsApp = {
    call,
    /** 앱이 맡긴 일감 — 없거나 앱이 꺼져 있으면 null */
    claim: async (target) => { const j = await call(`/gs-helper/claim?target=${encodeURIComponent(target || "")}`); return (j && j.job) || null; },
    done: (id, result) => post("/gs-helper/done", { id, result }),
    published: async (id, url) => { const j = await post("/gs-helper/published", { id, url }); return Boolean(j && j.ok); },
    log: (text) => post("/gs-helper/log", { text: `v${chrome.runtime.getManifest().version} ${text}` }),
    ping: async () => { const j = await call("/gs-helper/ping"); return Boolean(j && j.ok); },
    verified: (tabId, gone) => { const done = waiting.get(tabId); if (done) { waiting.delete(tabId); done(gone === true ? true : gone === false ? false : null); } },
    verifyNow: () => verifyLinks(true),
  };
})();
