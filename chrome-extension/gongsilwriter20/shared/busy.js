/* ══════════════════════════════════════════════════════════════
   작업 중 표시 — 누른 버튼이 "~중 ···" 으로 바뀌고, AI 가 글을 쓰는 동안 안내 카드를 띄운다

   버튼을 눌렀는지, 지금 무엇을 하는지 헷갈리지 않게 한다.
   panel.js · blog.js · youtube.js 의 guard 가 함께 쓴다.
   ══════════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  const esc = (value) => String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const DOTS = '<span class="gw-dots" aria-hidden="true"><i></i><i></i><i></i></span>';

  /* 버튼마다 함께 덮은 글 영역 — label 로 멘트를 바꾸면 그 영역 멘트도 같이 바뀐다 */
  const covers = new WeakMap();

  /* 버튼 글씨를 "~중 ···" 으로 바꾼다. 원래 글씨는 guard 가 보관했다가 되돌린다.
     높이가 줄어 화면이 튀지 않게 누르기 전 높이를 유지한다.
     cover 를 주면 그 글 영역(기사·블로그·대본)에 반투명 흰 막을 덮고 같은 멘트를 띄운다. */
  function start(button, text, cover = null) {
    if (!button) return;
    button.style.minHeight = `${button.offsetHeight || 0}px`;
    button.classList.add("is-busy");
    button.setAttribute("aria-busy", "true");
    button.innerHTML = `<span class="gw-busy"><span class="gw-busy-text">${esc(text)}</span>${DOTS}</span>`;
    if (cover) {
      covers.set(button, cover);
      coverOn(cover, text);
    }
  }

  /* 하던 일이 바뀌면 글씨만 바꾼다 (예: 수정 요청 중 → AI가 수정하는 중) */
  function label(button, text) {
    const target = button && button.querySelector(".gw-busy-text");
    if (target) target.textContent = text;
    const cover = button && covers.get(button);
    const coverText = cover && cover.querySelector(":scope > .gw-cover .gw-cover-text");
    if (coverText) coverText.textContent = text;
  }

  function stop(button) {
    if (!button) return;
    button.classList.remove("is-busy");
    button.removeAttribute("aria-busy");
    button.style.minHeight = "";
    const cover = covers.get(button);
    if (cover) {
      coverOff(cover);
      covers.delete(button);
    }
  }

  /* 글 영역 위 반투명 흰 막 + 가운데 멘트 */
  function coverOn(box, text) {
    let layer = box.querySelector(":scope > .gw-cover");
    if (!layer) {
      layer = document.createElement("div");
      layer.className = "gw-cover";
      layer.setAttribute("role", "status");
      box.appendChild(layer);
    }
    layer.innerHTML = `<div class="gw-cover-card"><strong class="gw-cover-text">${esc(text)}</strong>${DOTS}</div>`;
    box.classList.add("gw-covered");
  }

  function coverOff(box) {
    box.querySelector(":scope > .gw-cover")?.remove();
    box.classList.remove("gw-covered");
  }

  /* AI 가 글을 쓰는 동안 가져오기 버튼 위에 띄우는 안내 카드 */
  function writing(box, on, text, hint = "") {
    if (!box) return;
    if (on) {
      box.innerHTML =
        `<div class="gw-writing-row"><span class="gw-writing-icon">✍️</span>` +
        `<strong class="gw-writing-text">${esc(text)}</strong>${DOTS}</div>` +
        (hint ? `<small class="gw-writing-hint">${esc(hint)}</small>` : "");
    }
    box.classList.toggle("hidden", !on);
  }

  /* ── AI 가 다 썼는지 알아채기 ──
     ChatGPT 는 대화 원문(마지막 답변이 끝났는지), Gemini 는 화면(답변 칸이 있고 중지 버튼이 사라졌는지)으로 본다. */
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function aiFinished(tabId) {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab) return false;
    if (/^https:\/\/chatgpt\.com\//.test(tab.url || "")) {
      const state = await GWChatGptDirect.imageState(tabId);
      const last = state.ok ? state.last : null;
      return Boolean(!state.busy && last && last.role === "assistant" &&
        last.status === "finished_successfully" && /\}/.test(last.text || ""));
    }
    if (/^https:\/\/gemini\.google\.com\//.test(tab.url || "")) {
      const turn = await chrome.tabs.sendMessage(tabId, { type: "GW_TURN_STATE" }).catch(() => null);
      return Boolean(turn && turn.ok && turn.turns > 0 && !turn.busy && turn.text);
    }
    return false;
  }

  /* AI 가 글을 쓰는 동안 3초마다 살펴보다가, 두 번 연달아 "다 썼다"로 보이면 onDone 을 부른다.
     AI 탭이 닫혀도 더 쓸 수 없으니 onDone 을 부른다 (안내를 끈다).
     글을 먼저 가져왔거나(isOn 이 false) 15분이 지나면 그냥 그만 본다. */
  const watching = {};
  function watchAi(key, getTabId, isOn, onDone) {
    if (watching[key]) return;
    watching[key] = true;
    (async () => {
      const until = Date.now() + 15 * 60 * 1000;
      let streak = 0;
      try {
        while (isOn() && Date.now() < until) {
          await sleep(3000);
          const tabId = getTabId();
          if (!isOn()) break;
          if (!tabId || !(await chrome.tabs.get(tabId).catch(() => null))) {
            onDone("closed");
            break;
          }
          streak = (await aiFinished(tabId).catch(() => false)) ? streak + 1 : 0;
          if (streak >= 2) {
            if (isOn()) onDone("done");
            break;
          }
        }
      } finally {
        watching[key] = false;
      }
    })();
  }

  globalThis.GWBusy = { start, label, stop, writing, watchAi };
})();
