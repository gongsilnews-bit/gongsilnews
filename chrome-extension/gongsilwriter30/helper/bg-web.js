/* 도우미 — 공실뉴스 웹에서 올린 일감을 크롬 안에 맡아 둔다 (2026-11-04 사장님: 작성기 확장에 도우미 기능을 합침, 앱 없이 웹만)
   흐름: 웹 [도우미로 채우기]·[네이버 블로그에 채우기] → web-bridge.js → GS_WEB(job) 로 여기에 일감
        → 글쓰기 화면(helper-naver.js · helper-sns.js)이 GS_CLAIM 으로 받아 채움 → GS_DONE
        → 회원이 발행하면 GS_PUBLISHED 로 글 주소 → 웹이 status 로 물어 가져가 홍보현황에 저장
   크롬이 확장을 잠재워도 남게 storage.session 에 둔다 (크롬을 끄면 사라진다). 5분 안에 안 받아 가면 버린다
   background.js 가 importScripts 로 부른다 */
(() => {
  const WEB_TTL = 5 * 60 * 1000;
  const WEB_KEEP = 3 * 60 * 60 * 1000; // 발행 주소를 웹이 가져갈 때까지
  const TARGETS = ["naver", "instagram", "threads", "facebook", "youtube"];

  /* 영상 파일 맡기기 (2026-11-05 사장님: 웹 쇼츠릴스studio → 유튜브 스튜디오 채우기)
     영상은 수십 MB 라 일감(storage.session)에 넣지 못한다 — 확장 IndexedDB 에 조각(base64)으로 두고, 유튜브 화면이 조각을 받아 간다 */
  const VDB = "gs-helper-files";
  const vdb = () => new Promise((res, rej) => {
    const r = indexedDB.open(VDB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("chunks");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  async function vput(key, val) {
    const d = await vdb();
    await new Promise((res, rej) => { const t = d.transaction("chunks", "readwrite"); t.objectStore("chunks").put(val, key); t.oncomplete = res; t.onerror = () => rej(t.error); });
    d.close();
  }
  async function vget(key) {
    const d = await vdb();
    const v = await new Promise((res, rej) => { const t = d.transaction("chunks", "readonly"); const q = t.objectStore("chunks").get(key); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
    d.close();
    return v;
  }
  async function vclear(prefix) {
    const d = await vdb();
    await new Promise((res) => {
      const t = d.transaction("chunks", "readwrite");
      const st = t.objectStore("chunks");
      const q = st.openCursor();
      q.onsuccess = () => { const c = q.result; if (!c) return; if (!prefix || String(c.key).startsWith(prefix)) c.delete(); c.continue(); };
      t.oncomplete = res; t.onerror = res;
    });
    d.close();
  }

  async function jobsGet() {
    try { const { gsWebJobs = {} } = await chrome.storage.session.get("gsWebJobs"); return gsWebJobs; } catch (_) { return {}; }
  }
  async function jobsSave(jobs) {
    const now = Date.now();
    for (const [id, j] of Object.entries(jobs)) {
      if ((!j.taken && now - j.at > WEB_TTL) || now - j.at > WEB_KEEP) delete jobs[id];
      else if (j.taken && j.payload) delete j.payload; // 받아 간 사진은 비운다 (자리 아끼기)
    }
    await chrome.storage.session.set({ gsWebJobs: jobs });
  }

  async function webMessage(msg) {
    if (msg.op === "ping") return { ok: true, version: chrome.runtime.getManifest().version };
    const jobs = await jobsGet();
    if (msg.op === "job") {
      const target = String(msg.target || "");
      if (!TARGETS.includes(target)) return { ok: false, error: "알 수 없는 채널" };
      for (const [id, j] of Object.entries(jobs)) if (j.target === target && !j.taken) delete jobs[id]; // 같은 곳의 옛 일감은 버린다
      const id = `web-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      jobs[id] = { id, target, payload: msg.payload || {}, at: Date.now(), taken: 0, done: null, published: "" };
      await jobsSave(jobs);
      return { ok: true, id };
    }
    if (msg.op === "status") {
      const j = jobs[msg.id];
      return j ? { ok: true, taken: Boolean(j.taken), done: j.done, published: j.published || "" } : { ok: false };
    }
    if (msg.op === "forget") { delete jobs[msg.id]; await jobsSave(jobs); return { ok: true }; }
    // 영상 파일 — fileStart(옛 파일 비우기) → fileChunk(i, b64) … → 일감 payload 에 { fileId, fileName, chunks, size }
    if (msg.op === "fileStart") { await vclear(""); return { ok: true }; }
    if (msg.op === "fileChunk") { await vput(`${msg.fileId}:${msg.i}`, String(msg.b64 || "")); return { ok: true }; }
    return { ok: false };
  }

  /* 채울 화면이 일감을 찾을 때 — 가장 최근 것 (일감이 없으면 평소 글쓰기라 아무것도 하지 않는다) */
  async function claim(target) {
    const jobs = await jobsGet();
    const j = Object.values(jobs).filter((x) => x.target === target && !x.taken && x.payload && Date.now() - x.at < WEB_TTL).sort((a, b) => b.at - a.at)[0];
    if (!j) return null;
    const job = { id: j.id, target, ...j.payload };
    j.taken = Date.now();
    await jobsSave(jobs);
    return job;
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    const type = msg && msg.type;
    // 공실뉴스 웹이 "이 탭 찍기"를 부탁 — 그 탭이 보이는 창을 찍어 돌려준다 (권한은 이미 있음: <all_urls>·tabs)
    if (type === "GS_CAPTURE_TAB") {
      const tab = sender && sender.tab;
      if (!tab || !/^https?:\/\/((www\.)?gongsilnews\.com|localhost)(:\d+)?\//.test(tab.url || "")) { sendResponse({ ok: false }); return false; }
      chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 92 }, (dataUrl) => {
        const err = chrome.runtime.lastError && chrome.runtime.lastError.message;
        sendResponse(err || !dataUrl ? { ok: false, error: err || "" } : { ok: true, dataUrl });
      });
      return true;
    }
    if (type === "GS_WEB") { webMessage(msg.msg || {}).then(sendResponse, () => sendResponse({ ok: false })); return true; }
    if (type === "GS_FILE_CHUNK") { vget(`${msg.fileId}:${msg.i}`).then((b64) => sendResponse({ b64: b64 || "" }), () => sendResponse({ b64: "" })); return true; }
    if (type === "GS_CLAIM") { claim(msg.target || "").then((job) => sendResponse({ job }), () => sendResponse({ job: null })); return true; }
    if (type === "GS_DONE") {
      jobsGet().then(async (jobs) => { if (jobs[msg.id]) { jobs[msg.id].done = msg.result || { ok: false }; await jobsSave(jobs); } sendResponse({ ok: true }); });
      return true;
    }
    if (type === "GS_PUBLISHED") {
      jobsGet().then(async (jobs) => {
        const ok = Boolean(jobs[msg.id] && /^https:\/\//.test(String(msg.url || "")));
        if (ok) { jobs[msg.id].published = String(msg.url); await jobsSave(jobs); }
        sendResponse({ ok });
      });
      return true;
    }
    // 글 넣기 전에 그 크롬 창·탭을 앞으로 — 편집기(페이스북·인스타 Lexical)는 창이 뒤에 있으면 커서를 못 잡아 글을 무시한다
    if (type === "GS_FOCUS") {
      const tab = sender && sender.tab;
      if (!tab) { sendResponse({ ok: false }); return false; }
      chrome.windows.update(tab.windowId, { focused: true }, () => {
        const windowError = chrome.runtime.lastError && chrome.runtime.lastError.message;
        if (windowError) { sendResponse({ ok: false, error: windowError }); return; }
        chrome.tabs.update(tab.id, { active: true }, () => {
          const tabError = chrome.runtime.lastError && chrome.runtime.lastError.message;
          sendResponse({ ok: !tabError, error: tabError || "" });
        });
      });
      return true;
    }
    // 기록·지운 글 확인은 앱 쪽 일이었다 — 웹에서는 받기만 한다
    if (type === "GS_LOG" || type === "GS_VERIFY") { sendResponse({ ok: true }); return false; }
    return false;
  });
})();
