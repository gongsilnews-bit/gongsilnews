/* 네이버 블로그 SmartEditor ONE 글쓰기 화면

   - 발행 버튼은 대신 누르지 않는다.
   - 비어 있는 새 글에만 제목과 본문을 넣는다.
   - 편집기는 mainFrame 안에 있으므로 manifest의 all_frames로 각 프레임에서 실행한다.
   - 글과 사진은 숨은 input_buffer iframe에 붙여넣기 이벤트로 넣는다 (아래 clickAt·pasteInto).
   - 태그는 사용자가 발행 창을 열면 태그 칸에 채운다.
*/
(() => {
  "use strict";

  const TITLE_SELECTORS = [
    ".se-documentTitle .se-title-text[contenteditable='true']",
    ".se-title-text[contenteditable='true']",
    ".se-documentTitle textarea",
    ".se-title-textarea",
    ".se-documentTitle .se-title-text",
    ".se-title-text",
    "textarea[placeholder*='제목']",
    "input[placeholder*='제목']",
    "[contenteditable='true'][data-placeholder*='제목']",
  ];

  const BODY_SELECTORS = [
    ".se-component.se-text .se-component-content .se-text-paragraph[contenteditable='true']",
    ".se-component-content .se-text-paragraph[contenteditable='true']",
    ".se-component.se-text .se-text-paragraph[contenteditable='true']",
    ".se-section-text .se-text-paragraph[contenteditable='true']",
    ".se-component-content .se-text-paragraph",
    ".se-content .se-text-paragraph[contenteditable='true']",
    ".se-content [contenteditable='true']",
    ".se-main-container [contenteditable='true']",
    "[contenteditable='true'][data-placeholder*='본문']",
  ];

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function collectRoots() {
    const roots = [];
    const seen = new Set();

    function visit(doc) {
      if (!doc || seen.has(doc)) return;
      seen.add(doc);
      roots.push(doc);

      for (const frame of doc.querySelectorAll("iframe")) {
        try {
          if (frame.contentDocument) visit(frame.contentDocument);
        } catch (_) {
          /* 다른 출처 iframe은 해당 프레임의 content script가 직접 처리한다. */
        }
      }
    }

    visit(document);
    return roots;
  }

  function overlaps(candidate, excluded) {
    return excluded.some((item) => item && (
      candidate === item || candidate.contains(item) || item.contains(candidate)
    ));
  }

  function pick(selectors, excluded = []) {
    const excludedList = Array.isArray(excluded) ? excluded : [excluded];
    for (const root of collectRoots()) {
      for (const selector of selectors) {
        for (const candidate of root.querySelectorAll(selector)) {
          if (!candidate || overlaps(candidate, excludedList)) continue;
          const style = candidate.ownerDocument.defaultView?.getComputedStyle(candidate);
          if (style && (style.display === "none" || style.visibility === "hidden")) continue;
          return candidate;
        }
      }
    }
    return null;
  }

  function normalizeTarget(candidate, kind) {
    if (!candidate) return null;
    if (/^(TEXTAREA|INPUT)$/i.test(candidate.tagName) || candidate.isContentEditable) return candidate;

    const inner = candidate.querySelector?.("[contenteditable='true'], textarea, input");
    if (inner) return inner;

    // SmartEditor ONE의 일부 버전은 실제 편집 문단에 contenteditable 속성을 늦게 붙인다.
    if (kind === "title" && candidate.matches?.(".se-title-text")) return candidate;
    if (kind === "body" && candidate.matches?.(".se-text-paragraph")) return candidate;
    return null;
  }

  function findEditor() {
    const rawTitle = pick(TITLE_SELECTORS);
    const title = normalizeTarget(rawTitle, "title");
    const rawBody = pick(BODY_SELECTORS, [rawTitle, title]);
    const body = normalizeTarget(rawBody, "body");
    return { title, body };
  }

  function wakeBodyEditor(title) {
    const container = pick([".se-content", ".se-main-container"], title ? [title] : []);
    if (!container) return;
    container.click();
    container.focus?.();
  }

  async function waitForEditor(timeoutMs = 12000) {
    const until = Date.now() + timeoutMs;
    let found = findEditor();
    while ((!found.title || !found.body) && Date.now() < until) {
      wakeBodyEditor(found.title);
      await sleep(250);
      found = findEditor();
    }
    return found;
  }

  function cleanText(value) {
    return String(value || "").replace(/[\u200B\uFEFF]/g, "").trim();
  }

  function currentText(el) {
    if (!el) return "";
    const value = /^(TEXTAREA|INPUT)$/i.test(el.tagName) ? el.value : el.innerText || el.textContent;
    const text = cleanText(value);
    const placeholder = cleanText(
      el.getAttribute("placeholder") ||
      el.getAttribute("data-placeholder") ||
      el.getAttribute("aria-placeholder") ||
      ""
    );
    const editorPrompt = /^(제목|본문을 입력해 주세요[.!]?|내용을 입력해 주세요[.!]?|글감과 함께 나의 일상을 기록해보세요[.!]?)$/;
    return text && text !== placeholder && !editorPrompt.test(text) ? text : "";
  }

  function dispatchInput(el, text) {
    const view = el.ownerDocument.defaultView;
    try {
      el.dispatchEvent(new view.InputEvent("input", {
        bubbles: true,
        cancelable: true,
        composed: true,
        inputType: "insertText",
        data: text,
      }));
    } catch (_) {
      el.dispatchEvent(new view.Event("input", { bubbles: true, cancelable: true }));
    }
    el.dispatchEvent(new view.Event("change", { bubbles: true }));
  }

  function setFormValue(el, text) {
    const view = el.ownerDocument.defaultView;
    const proto = el.tagName === "TEXTAREA" ? view.HTMLTextAreaElement.prototype : view.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(el, text);
    else el.value = text;
    dispatchInput(el, text);
  }

  /* SmartEditor ONE은 보이는 문단에 직접 입력을 받지 않는다.
     제목·본문을 눌러 편집기 커서를 옮긴 뒤, 숨은 input_buffer iframe에 붙여넣기 이벤트를 보내야
     편집기가 자기 문서 데이터로 받아들인다. (2026-09-25 실제 글쓰기 화면에서 확인) */
  function clickAt(el) {
    const view = el.ownerDocument.defaultView;
    const rect = el.getBoundingClientRect();
    const init = {
      bubbles: true,
      cancelable: true,
      view,
      button: 0,
      clientX: rect.left + 5,
      clientY: rect.top + rect.height / 2,
    };
    ["mousedown", "mouseup", "click"].forEach((type) => el.dispatchEvent(new view.MouseEvent(type, init)));
  }

  function findInputBuffer(doc) {
    const frame = doc.querySelector("iframe[id*='input_buffer'], iframe[class*='input_buffer']");
    try {
      return frame?.contentDocument?.body || null;
    } catch (_) {
      return null;
    }
  }

  function pasteInto(doc, { html, text, file }) {
    const target = findInputBuffer(doc);
    if (!target) throw new Error("네이버 편집기 입력창(input_buffer)을 찾지 못했습니다. 글쓰기 화면을 새로고침(F5)해 주세요.");
    const view = target.ownerDocument.defaultView;
    const transfer = new view.DataTransfer();
    if (file) transfer.items.add(file);
    if (html) transfer.setData("text/html", html);
    if (text) transfer.setData("text/plain", text);
    const event = new view.ClipboardEvent("paste", { clipboardData: transfer, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event.defaultPrevented;
  }

  function htmlToText(html) {
    const box = document.createElement("div");
    box.innerHTML = html;
    return Array.from(box.children).map((node) => node.textContent).join("\n");
  }

  function extensionFor(type) {
    if (/png/i.test(type)) return "png";
    if (/webp/i.test(type)) return "webp";
    if (/gif/i.test(type)) return "gif";
    return "jpg";
  }

  function dataUrlToFile(dataUrl, index) {
    const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(String(dataUrl || ""));
    if (!match) return null;
    const type = match[1] && match[1].startsWith("image/") ? match[1] : "image/jpeg";
    const raw = match[2] ? atob(match[3]) : decodeURIComponent(match[3]);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
    return new File([bytes], `gongsil-blog-${Date.now()}-${index + 1}.${extensionFor(type)}`, { type });
  }

  function countEditorImages(doc) {
    return doc.querySelectorAll(".se-main-container .se-component.se-image, .se-main-container .se-component.se-imageGroup img").length;
  }

  function bodyHasContent(doc, body) {
    if (currentText(body)) return true;
    const components = doc.querySelectorAll(".se-main-container .se-component");
    return components.length > 1;
  }

  /* ── 발행 창 태그 칸: 사용자가 [발행]을 눌러 창이 열리면 태그를 채운다 ── */
  let pendingTags = [];
  let tagObserver = null;

  function pressEnter(el) {
    const view = el.ownerDocument.defaultView;
    const init = { bubbles: true, cancelable: true, key: "Enter", code: "Enter", keyCode: 13, which: 13 };
    ["keydown", "keypress", "keyup"].forEach((type) => el.dispatchEvent(new view.KeyboardEvent(type, init)));
  }

  async function fillTags(input) {
    const tags = pendingTags;
    pendingTags = [];
    input.dataset.gwTagsFilled = "1";
    for (const tag of tags) {
      input.focus();
      setFormValue(input, tag);
      await sleep(80);
      pressEnter(input);
      await sleep(150);
    }
  }

  function watchPublishTags(doc, tags) {
    pendingTags = tags;
    tagObserver?.disconnect();
    if (!tags.length) return;
    const check = () => {
      if (!pendingTags.length) {
        tagObserver?.disconnect();
        return;
      }
      const input = Array.from(doc.querySelectorAll("input[placeholder*='태그']"))
        .find((item) => !item.dataset.gwTagsFilled && item.getBoundingClientRect().width > 0);
      if (input) fillTags(input);
    };
    tagObserver = new MutationObserver(check);
    tagObserver.observe(doc.body, { childList: true, subtree: true });
    // 30분 안에 발행 창을 열지 않으면 감시를 끝낸다
    setTimeout(() => tagObserver?.disconnect(), 30 * 60 * 1000);
  }

  async function applyBlogDraft(payload) {
    const titleText = cleanText(payload?.title);
    const blocks = Array.isArray(payload?.blocks) ? payload.blocks : [];
    if (!titleText || !blocks.some((block) => block.type === "html")) {
      return { ok: false, error: "블로그 제목과 본문이 비어 있습니다." };
    }

    const editor = await waitForEditor();
    if (!editor.title || !editor.body) {
      return { ok: false, error: "네이버 블로그 제목 또는 본문 입력칸을 찾지 못했습니다." };
    }
    const doc = editor.body.ownerDocument;
    if (!findInputBuffer(doc)) {
      return { ok: false, error: "네이버 편집기 입력창을 찾지 못했습니다. 글쓰기 화면을 새로고침(F5)한 뒤 다시 보내 주세요." };
    }

    // 본문이 비어 있어야 보낸다. 제목만 같은 글로 들어가 있으면(이전 시도) 제목은 건너뛰고 본문만 넣는다.
    const existingTitle = currentText(editor.title);
    if (bodyHasContent(doc, editor.body) || (existingTitle && existingTitle !== titleText)) {
      return {
        ok: false,
        error: "네이버 글쓰기 화면에 이미 내용이 있습니다. 새 글쓰기 화면에서 다시 전송해 주세요.",
      };
    }

    if (!existingTitle) {
      clickAt(editor.title);
      await sleep(300);
      if (!pasteInto(doc, { text: titleText })) {
        return { ok: false, error: "네이버 편집기가 제목 입력을 받지 않았습니다. 글쓰기 화면을 새로고침(F5)해 주세요." };
      }
      await sleep(300);
    }

    clickAt(editor.body);
    await sleep(300);

    const imagesBefore = countEditorImages(doc);
    let imagesSent = 0;
    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index];
      if (block.type === "html") {
        if (!pasteInto(doc, { html: block.html, text: htmlToText(block.html) })) {
          return { ok: false, error: "네이버 편집기가 본문 입력을 받지 않았습니다. 글쓰기 화면을 새로고침(F5)해 주세요." };
        }
        await sleep(300);
      } else if (block.type === "image" && block.dataUrl) {
        const file = dataUrlToFile(block.dataUrl, index);
        if (!file) continue;
        pasteInto(doc, { file });
        imagesSent += 1;
        await sleep(1200); // 편집기가 사진 칸을 만들고 커서를 사진 뒤로 옮길 시간
      }
    }

    // 사진은 업로드가 끝나야 칸이 확정되므로 잠시 기다리며 센다
    let imagesInserted = 0;
    for (let waited = 0; waited <= 6000; waited += 500) {
      imagesInserted = Math.min(imagesSent, Math.max(0, countEditorImages(doc) - imagesBefore));
      if (imagesInserted >= imagesSent) break;
      await sleep(500);
    }

    watchPublishTags(doc, Array.isArray(payload?.tags) ? payload.tags : []);

    return { ok: true, imagesInserted };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "GW_PING_NAVER_WRITE") {
      waitForEditor(2500)
        .then((editor) => sendResponse({
          ok: Boolean(editor.title && editor.body),
          hasTitle: Boolean(editor.title),
          hasBody: Boolean(editor.body),
          frameUrl: location.href,
        }))
        .catch(() => sendResponse({ ok: false, frameUrl: location.href }));
      return true;
    }

    if (msg?.type === "GW_APPLY_BLOG_DRAFT") {
      applyBlogDraft(msg.payload)
        .then(sendResponse)
        .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
      return true;
    }

    return false;
  });
})();
