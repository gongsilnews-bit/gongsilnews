/* 공실뉴스 웹 ↔ 공실마케팅 도우미 (2026-11-03 사장님: 웹 뉴스·SNS자동화에서도 도우미로 채우기)
   웹페이지는 확장에 직접 말을 걸 수 없어서, 이 파일이 window.postMessage 를 받아 bg.js 에 건넨다.
   공실뉴스 주소에서만 돈다 (manifest content_scripts). 앱이 없어도 웹이 일감을 올리고 → 채울 화면의 도우미가 받아 간다. */
(() => {
  if (window.__gsHelperBridge) return;
  window.__gsHelperBridge = true;
  // 페이지 태그에 표시를 붙이지 않는다 — 웹 화면(React)이 "서버 화면과 다르다" 오류를 낸다. 웹은 ping 으로 묻는다
  window.addEventListener("message", (e) => {
    if (e.source !== window || !e.data || e.data.gsHelperReq !== true) return;
    const { id, msg } = e.data;
    const reply = (res) => window.postMessage({ gsHelperRes: true, id, res }, location.origin);
    if (msg && msg.op === "ping") return reply({ ok: true, version: chrome.runtime.getManifest().version }); // 깔려 있나 — 바로 대답
    // 기사쓰기 단지 분석 — 지금 보이는 이 탭을 그대로 찍기 (2026-11-09 사장님: 캡처가 자연스럽게, 지도·공실뉴스까지)
    // AI 답 기다리기 시작·끝 (2026-11-23) — 기다리는 동안 AI 창의 [복사]가 이 탭으로 온다
    if (msg && msg.op === "aiWait") {
      try { chrome.runtime.sendMessage({ type: "GS_AI_WAIT", on: Boolean(msg.on) }, () => void chrome.runtime.lastError); } catch (_) {}
      return reply({ ok: true });
    }
    if (msg && msg.op === "captureTab") {
      try { chrome.runtime.sendMessage({ type: "GS_CAPTURE_TAB" }, (r) => reply(chrome.runtime.lastError ? null : r)); } catch (_) { reply(null); }
      return;
    }
    try {
      chrome.runtime.sendMessage({ type: "GS_WEB", msg }, (r) => reply(chrome.runtime.lastError ? null : r));
    } catch (_) {
      reply(null); // 확장을 새로고침했다 — 페이지를 새로고침하면 다시 된다
    }
  });
  // AI 창에서 [복사]한 답 → 웹 화면 (안내 창이 받아서 바로 가져온다)
  chrome.runtime.onMessage.addListener((m) => {
    if (m && m.type === "GS_AI_COPIED" && typeof m.text === "string") window.postMessage({ gsAiCopied: true, text: m.text }, location.origin);
  });
})();
