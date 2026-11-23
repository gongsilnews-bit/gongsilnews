/* AI 답 [복사] 알아채기 — 페이지 쪽 (2026-11-23 사장님: "AI 에서 복사하기만 클릭하면 자동으로")
   ChatGPT·Gemini·Claude 의 [복사] 단추는 navigator.clipboard 로 글을 넣는다. 그 순간 같은 글을 도우미(ai-copy.js)에게도 건넨다.
   클립보드를 읽는 권한은 쓰지 않는다 — 페이지가 스스로 복사하는 글만 본다. */
(() => {
  if (window.__gsAiCopyMain) return;
  window.__gsAiCopyMain = true;
  const tell = (text) => {
    try { if (typeof text === "string" && text.trim()) window.postMessage({ gsAiCopyText: true, text }, location.origin); } catch (_) {}
  };
  const cb = navigator.clipboard;
  if (cb && cb.writeText) {
    const orig = cb.writeText.bind(cb);
    cb.writeText = (text) => { tell(text); return orig(text); };
  }
  if (cb && cb.write) {
    const orig = cb.write.bind(cb);
    cb.write = (items) => {
      try {
        for (const it of items || []) {
          if (it && it.types && it.types.includes("text/plain")) it.getType("text/plain").then((b) => b.text()).then(tell).catch(() => {});
        }
      } catch (_) {}
      return orig(items);
    };
  }
  // 예전 방식(execCommand copy)으로 복사하는 화면 — 고른 글
  document.addEventListener("copy", () => { try { tell(String(document.getSelection() || "")); } catch (_) {} }, true);
})();
