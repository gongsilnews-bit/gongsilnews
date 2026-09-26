/* 공실뉴스 AI 유튜브작성기 — 공통 DOM 도구 */
const gywSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function gywPick(selectors, root = document) {
  for (const selector of selectors) {
    const node = root.querySelector(selector);
    if (node) return node;
  }
  return null;
}

async function gywWaitFor(selectors, timeoutMs = 10000, root = document) {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const node = gywPick(list, root);
    if (node) return node;
    await gywSleep(150);
  }
  return null;
}

function gywSetReactValue(node, value) {
  if (!node) return false;
  const proto = node instanceof HTMLTextAreaElement
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(node, value);
  else node.value = value;
  node.dispatchEvent(new Event("input", { bubbles: true }));
  node.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function gywEscape(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function gywUid(prefix = "id") {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${uuid || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function gywNaturalCompare(a, b) {
  return String(a).localeCompare(String(b), "ko", { numeric: true, sensitivity: "base" });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { gywEscape, gywNaturalCompare };
}

