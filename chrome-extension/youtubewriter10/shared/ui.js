/* ══════════════════════════════════════════════════════════════
   공실뉴스 AI 기사작성기 — 공통 도구
   원칙: 실패하면 조용히 넘어가지 않는다. 사람이 볼 수 있게 말한다.
   ══════════════════════════════════════════════════════════════ */

/* ── 잠깐 기다리기 ── */
const gwSleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── 여러 셀렉터 중 먼저 걸리는 것을 쓴다 (화면이 바뀌어도 하나는 남도록) ── */
function gwPick(selectors, root = document) {
  for (const sel of selectors) {
    const el = root.querySelector(sel);
    if (el) return el;
  }
  return null;
}

/* ── 요소가 나타날 때까지 기다린다. 못 찾으면 null 을 준다 (거짓말하지 않는다) ── */
async function gwWaitFor(selectors, timeoutMs = 10000, root = document) {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const el = gwPick(list, root);
    if (el) return el;
    await gwSleep(150);
  }
  return null;
}

/* ══════════════════════════════════════════════════════════════
   React 통제 입력에 값 넣기

   공실뉴스 기사작성 폼은 전부 React 통제 입력이다.
   el.value = "..." 로 넣으면 React 가 다음 렌더에서 옛 값으로 되돌린다.
   화면에 잠깐 보였다가 사라지는 증상이 이것이다.
   네이티브 setter 로 넣고 input 이벤트를 띄워야 React 가 받아들인다.
   ══════════════════════════════════════════════════════════════ */
function gwSetReactValue(el, value) {
  if (!el) return false;
  const proto = el instanceof HTMLTextAreaElement
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

/* contenteditable 본문에 넣기 — onInput 이 innerHTML 을 읽어가므로 이벤트가 필수 */
function gwSetEditable(el, html) {
  if (!el) return false;
  el.focus();
  el.innerHTML = html;
  el.dispatchEvent(new InputEvent("input", { bubbles: true }));
  return true;
}

/* ══════════════════════════════════════════════════════════════
   알림 띠 (토스트)
   ══════════════════════════════════════════════════════════════ */
function gwToast(message, kind = "info", ms = 3200) {
  document.querySelectorAll(".gw-toast").forEach((n) => n.remove());
  const box = document.createElement("div");
  box.className = `gw-toast gw-toast-${kind}`;
  box.textContent = message;
  document.body.appendChild(box);
  requestAnimationFrame(() => box.classList.add("gw-in"));
  if (ms > 0) {
    setTimeout(() => {
      box.classList.remove("gw-in");
      setTimeout(() => box.remove(), 300);
    }, ms);
  }
  return box;
}

/* ══════════════════════════════════════════════════════════════
   떠 있는 진행 표시
   ══════════════════════════════════════════════════════════════ */
function gwBusy(message) {
  gwBusyDone();
  const box = document.createElement("div");
  box.className = "gw-busy";
  box.innerHTML = `<span class="gw-busy-dot"></span><strong></strong>`;
  box.querySelector("strong").textContent = message;
  document.body.appendChild(box);
  return box;
}
function gwBusyDone() {
  document.querySelectorAll(".gw-busy").forEach((n) => n.remove());
}

/* ══════════════════════════════════════════════════════════════
   글자를 HTML 에 안전하게 넣기
   ══════════════════════════════════════════════════════════════ */
function gwEscape(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ══════════════════════════════════════════════════════════════
   AI 응답에서 JSON 블록 꺼내기

   프롬프트에서 ```json 으로 답하라고 못 박았다.
   산문을 정규식으로 뜯지 않는다 — 못 찾으면 못 찾았다고 말한다.
   ══════════════════════════════════════════════════════════════ */
function gwParseArticleJson(rawText) {
  if (!rawText || !rawText.trim()) {
    return { ok: false, reason: "AI 응답이 비어 있습니다." };
  }

  let candidate = null;

  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    candidate = fenced[1].trim();
  } else {
    const first = rawText.indexOf("{");
    const last = rawText.lastIndexOf("}");
    if (first !== -1 && last > first) candidate = rawText.slice(first, last + 1);
  }

  if (!candidate) {
    return { ok: false, reason: "AI 응답에서 JSON 을 찾지 못했습니다." };
  }

  let data;
  try {
    data = JSON.parse(candidate);
  } catch (e) {
    return { ok: false, reason: "AI 가 준 JSON 의 형식이 깨져 있습니다: " + e.message };
  }

  const title = (data.title || "").trim();
  const body = (data.body || "").trim();
  if (!title || !body) {
    return { ok: false, reason: "AI 응답에 제목 또는 본문이 없습니다." };
  }

  /* 값이 없으면 비워 둔다. 지어내지 않는다. */
  return {
    ok: true,
    article: {
      title,
      subtitles: [data.subtitle1, data.subtitle2, data.subtitle3]
        .map((s) => (s || "").trim())
        .filter(Boolean),
      body,
      keywords: Array.isArray(data.keywords)
        ? data.keywords.map((k) => String(k).replace(/^#/, "").trim()).filter(Boolean)
        : [],
    },
  };
}

/* 본문 문자열을 기사작성기 에디터가 쓰는 <p> 묶음으로 */
function gwBodyToHtml(body) {
  return body
    .split(/\n{2,}|\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${gwEscape(line)}</p>`)
    .join("");
}
