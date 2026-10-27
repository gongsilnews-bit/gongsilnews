/* 공실스튜디오 도우미 — 앱(PC 안 창구 127.0.0.1)과 이야기한다
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

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
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
