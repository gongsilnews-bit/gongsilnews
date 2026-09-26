/* ChatGPT / Gemini 탭 공통 제어 */
const GYWAI = (() => {
  "use strict";

  async function fill(conf, text) {
    const input = await gywWaitFor(conf.INPUT, 30000);
    if (!input) return { ok: false, reason: "AI 입력칸을 찾지 못했습니다. 로그인 상태를 확인해 주세요." };
    input.focus();
    if (input.tagName === "TEXTAREA" || input.tagName === "INPUT") {
      gywSetReactValue(input, text);
    } else {
      input.innerHTML = "";
      for (const line of String(text || "").split("\n")) {
        const p = document.createElement("p");
        if (line) p.textContent = line;
        else p.appendChild(document.createElement("br"));
        input.appendChild(p);
      }
      input.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true }));
    }
    return { ok: true };
  }

  async function submit(conf) {
    const until = Date.now() + 7000;
    let button = null;
    while (Date.now() < until) {
      button = gywPick(conf.SEND);
      if (button && !button.disabled && button.getAttribute("aria-disabled") !== "true") break;
      button = null;
      await gywSleep(200);
    }
    if (button) {
      button.click();
      return { ok: true };
    }
    return { ok: false, reason: "AI 전송 버튼을 찾지 못했습니다. 화면에서 직접 전송해 주세요." };
  }

  function answers(conf) {
    for (const selector of conf.ANSWER) {
      const nodes = document.querySelectorAll(selector);
      if (nodes.length) return Array.from(nodes);
    }
    return [];
  }

  function readNode(node) {
    const shown = (node?.innerText || "").trim();
    if (!shown.includes("{") || GYWYoutubeJson.hasCompleteObject(shown)) return shown;
    for (const code of node.querySelectorAll("pre, code, .cm-content")) {
      const raw = (code.textContent || "").trim();
      if (raw.includes("{") && GYWYoutubeJson.hasCompleteObject(raw)) return raw;
    }
    return (node?.textContent || "").trim() || shown;
  }

  async function read(conf, maxMs = 180000, minCount = 0) {
    const until = Date.now() + maxMs;
    const settleMs = Number(conf.SETTLE_MS) || 1800;
    let previous = "";
    let stableSince = 0;

    while (Date.now() < until) {
      const nodes = answers(conf);
      if (nodes.length < minCount || !nodes.length) {
        await gywSleep(400);
        continue;
      }
      const text = readNode(nodes[nodes.length - 1]);
      if (text && text === previous) {
        if (!stableSince) stableSince = Date.now();
        const complete = !text.includes("{") || GYWYoutubeJson.hasCompleteObject(text);
        if (complete && Date.now() - stableSince >= settleMs) return { ok: true, text, count: nodes.length };
      } else {
        previous = text;
        stableSince = 0;
      }
      await gywSleep(300);
    }
    if (previous && (!previous.includes("{") || GYWYoutubeJson.hasCompleteObject(previous))) {
      return { ok: true, text: previous, note: "제한 시간까지 생성된 답변을 가져왔습니다." };
    }
    return { ok: false, reason: "AI 답변이 아직 완성되지 않았습니다." };
  }

  function imageList(conf) {
    const seen = new Set();
    const result = [];
    for (const selector of conf.IMAGE || []) {
      for (const image of document.querySelectorAll(selector)) {
        const url = image.currentSrc || image.src || "";
        if (!url || seen.has(url) || url.startsWith("data:image/svg")) continue;
        const width = image.naturalWidth || image.width || 0;
        const height = image.naturalHeight || image.height || 0;
        if (width < 200 || height < 150) continue;
        seen.add(url);
        result.push({ url, width, height });
      }
    }
    return result;
  }

  async function waitImage(conf, minCount = 0, maxMs = 180000) {
    const until = Date.now() + maxMs;
    let lastUrl = "";
    let stableSince = 0;
    while (Date.now() < until) {
      const images = imageList(conf);
      if (images.length > minCount) {
        const latest = images[images.length - 1];
        if (latest.url === lastUrl) {
          if (!stableSince) stableSince = Date.now();
          if (Date.now() - stableSince >= 1800) return { ok: true, image: latest, count: images.length };
        } else {
          lastUrl = latest.url;
          stableSince = 0;
        }
      }
      await gywSleep(600);
    }
    return { ok: false, reason: "새로 생성된 이미지를 찾지 못했습니다." };
  }

  async function imageData(url) {
    if (!url) return { ok: false, reason: "이미지 주소가 없습니다." };
    try {
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error(`이미지 응답 오류 (${response.status})`);
      const blob = await response.blob();
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error("이미지를 읽지 못했습니다."));
        reader.readAsDataURL(blob);
      });
      return { ok: true, dataUrl, mime: blob.type || "image/png" };
    } catch (error) {
      return { ok: false, reason: error.message || String(error) };
    }
  }

  function listen(conf) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      const known = ["GYW_PING", "GYW_FILL", "GYW_SUBMIT", "GYW_READ", "GYW_COUNT", "GYW_IMAGE_LIST", "GYW_WAIT_IMAGE", "GYW_GET_IMAGE_DATA"];
      if (!known.includes(message.type)) return false;
      (async () => {
        try {
          if (message.type === "GYW_PING") return { ok: true };
          if (message.type === "GYW_FILL") return fill(conf, message.text);
          if (message.type === "GYW_SUBMIT") return submit(conf);
          if (message.type === "GYW_READ") return read(conf, Number(message.maxMs) || 180000, Number(message.minCount) || 0);
          if (message.type === "GYW_COUNT") return { ok: true, count: answers(conf).length };
          if (message.type === "GYW_IMAGE_LIST") return { ok: true, images: imageList(conf) };
          if (message.type === "GYW_GET_IMAGE_DATA") return imageData(message.url);
          return waitImage(conf, Number(message.minCount) || 0, Number(message.maxMs) || 180000);
        } catch (error) {
          return { ok: false, reason: error.message || String(error) };
        }
      })().then(sendResponse);
      return true;
    });
  }

  return { listen };
})();
