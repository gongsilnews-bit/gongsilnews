/* AI 답 [복사] 알아채기 — 도우미 쪽 (2026-11-23)
   ai-copy-main.js 가 건넨 글을 백그라운드에 보낸다. 공실뉴스 화면이 "답을 기다리는 중"일 때만 백그라운드가 그 화면으로 넘긴다.
   답 모양({ 가 있는 글)만 보낸다. */
(() => {
  if (window.__gsAiCopy) return;
  window.__gsAiCopy = true;
  let last = "";
  window.addEventListener("message", (e) => {
    if (e.source !== window || !e.data || e.data.gsAiCopyText !== true) return;
    const text = String(e.data.text || "");
    if (!text.includes("{") || text.length > 400000 || text === last) return;
    last = text;
    try { chrome.runtime.sendMessage({ type: "GS_AI_COPIED", text, site: location.hostname }, () => void chrome.runtime.lastError); } catch (_) {}
  });
})();
