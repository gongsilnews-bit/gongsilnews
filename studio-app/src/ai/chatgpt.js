// ChatGPT 작성 (스튜디오 전용 크롬, 회원이 로그인한 구독 계정)
// 크롬 확장 shared/ai-common.js 의 입력·전송·읽기 방법을 Playwright 로 옮겼다.
//  - 새 대화를 열고, 입력칸에 프롬프트를 넣고, 전송 버튼을 누르고,
//  - 답변은 ChatGPT 대화 원문(/backend-api/conversation)에서 읽는다. 화면 모양과 상관없어 가장 튼튼하다
//    (확장 shared/chatgpt-direct.js 와 같은 방법). 원문을 못 읽으면 화면에서 읽는다.
//  - 2026-10 ChatGPT 화면 개편으로 data-message-author-role 이 사라졌다. 화면 읽기는 새 표시를 먼저 본다.
//  - 수정 요청은 처음 쓴 대화(chatUrl)에 이어 보낸다 (확장과 같다). 그 대화가 없어졌으면 fallbackPrompt 로 새 대화에서 한다.
// 사람이 쓰는 것처럼: 크롬 창을 보이게 띄우고, 한 번에 한 건만, 동작 사이에 잠깐씩 쉰다.
const chrome = require("../studio-chrome");
const log = require("electron-log/main");

const SEL = {
  URL: "https://chatgpt.com/",
  INPUT: ["#prompt-textarea", 'div.ProseMirror[contenteditable="true"]', 'form [contenteditable="true"]', 'textarea[name="prompt-textarea"]'],
  SEND: ['button[data-testid="send-button"]', 'button[aria-label="Send prompt"]', 'button[aria-label="프롬프트 보내기"]'],
  STOP: ['button[data-testid="stop-button"]', 'button[aria-label*="중지"]', 'button[aria-label*="Stop"]'],
  ANSWER: ['[data-markdown-text-style="assistant-message"]', 'div[data-message-author-role="assistant"]', ".markdown.prose"],
};

const humanPause = (min = 400, max = 1100) => chrome.sleep(min + Math.random() * (max - min));
let running = false;

async function firstVisible(page, list, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const sel of list) {
      const loc = page.locator(sel).first();
      if (await loc.isVisible().catch(() => false)) return loc;
    }
    await chrome.sleep(300);
  }
  return null;
}

async function anyVisible(page, list) {
  for (const sel of list) if (await page.locator(sel).first().isVisible().catch(() => false)) return true;
  return false;
}

async function readLastAnswer(page) {
  return page.evaluate((selectors) => {
    for (const sel of selectors) {
      const nodes = document.querySelectorAll(sel);
      if (nodes.length) return nodes[nodes.length - 1].innerText || "";
    }
    return "";
  }, SEL.ANSWER);
}

/* 대화 원문에서 현재 가지의 마지막 AI 답변과 상태를 읽는다 (로그인된 페이지 안에서 실행) */
function readByConversationApi(page) {
  return page
    .evaluate(async () => {
      const withTimeout = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error("timeout")), ms))]);
      const id = (location.pathname.match(/\/c\/([0-9a-f-]{36})/) || [])[1];
      if (!id) return { error: "대화 주소 없음" };
      // 로그인 토큰은 5분 동안 다시 묻지 않는다 (자주 물으면 ChatGPT 가 429 로 막는다)
      const { session } = (window.__gwTok && Date.now() - window.__gwTok.at < 300000 ? window.__gwTok : (window.__gwTok = { at: Date.now(), session: await withTimeout(fetch("/api/auth/session", { credentials: "include" }).then((r) => r.json()), 8000) }));
      const token = session && session.accessToken;
      if (!token) window.__gwTok = null;
      if (!token) return { error: "로그인 토큰 없음" };
      const res = await withTimeout(fetch("/backend-api/conversation/" + id, { credentials: "include", headers: { Authorization: "Bearer " + token } }), 10000);
      if (!res.ok) return { error: "HTTP " + res.status };
      const data = await res.json();
      let node = data.mapping && data.mapping[data.current_node];
      while (node) {
        const msg = node.message;
        if (msg && msg.author && msg.author.role === "assistant" && msg.content) {
          const parts = (msg.content.parts || []).filter((part) => typeof part === "string");
          const text = (parts.join("\n") || msg.content.text || "").trim();
          if (text) return { id: msg.id, text, status: msg.status || "", endTurn: msg.end_turn };
        }
        node = node.parent ? data.mapping[node.parent] : null;
      }
      return { error: "AI 답변 없음" };
    })
    .catch((e) => ({ error: e.message }));
}

/**
 * 프롬프트를 보내고 답변 글을 돌려준다.
 * isComplete(text) 가 true 가 되고 답변이 멈추면 끝난다 (최대 4분).
 */
const chatIdOf = (url) => (String(url || "").match(/\/c\/([0-9a-f-]{36})/) || [])[1] || "";

/* 대화를 열고 프롬프트를 넣어 보낸다. 보낸 ChatGPT 페이지와, 보내기 전 마지막 답변(prev)을 돌려준다.
   chatUrl 이 있으면 그 대화에 이어 보낸다 (수정 요청). 그 대화를 못 열면 새 대화에 fallbackPrompt 를 보낸다. */
async function openAndSend(prompt, onProgress, { chatUrl = "", fallbackPrompt = "", files = [] } = {}) {
  onProgress("스튜디오 전용 크롬에서 ChatGPT를 여는 중…");
  const page = await chrome.openPage("chatgpt.com", SEL.URL);
  let prev = null;
  const wantId = chatIdOf(chatUrl);
  if (wantId) {
    // 이미 그 대화가 열려 있으면 다시 열지 않는다 (방금 쓴 대화에 바로 이어 그리는 시뮬레이션)
    if (chatIdOf(page.url()) !== wantId) await page.goto(`${SEL.URL}c/${wantId}`, { waitUntil: "domcontentloaded" });
    // 보내기 전 마지막 답변 — 대화 원문이 늦게 읽히면 몇 번 더 본다
    let found = false;
    for (let i = 0; i < 8; i++) {
      await chrome.sleep(i ? 1200 : 800);
      if (chatIdOf(page.url()) !== wantId) continue;
      const api = await readByConversationApi(page);
      if (api.id) {
        prev = api;
        found = true;
        break;
      }
      // 원문을 못 읽어도 대화가 열렸고 입력칸이 보이면 그 대화에 이어 보낸다 (이전 답은 화면 글로 구분)
      if (i >= 4 && (await firstVisible(page, SEL.INPUT, 1000))) {
        log.warn(`[ChatGPT] 대화 원문 읽기 실패(${api.error || "?"}) — 화면으로 이어 보냄`);
        prev = { id: "", text: await readLastAnswer(page) };
        found = true;
        break;
      }
    }
    if (!found) {
      // 대화가 지워졌거나 열리지 않으면 새 대화에서 처음 자료와 지금 글을 함께 보낸다
      log.warn(`[ChatGPT] 이어 쓸 대화를 못 엶: ${page.url()}`);
      prev = null;
      if (!fallbackPrompt) throw new Error("처음 쓴 ChatGPT 대화를 찾지 못했습니다. [다시 쓰기]를 해 주세요.");
      prompt = fallbackPrompt;
      await page.goto(SEL.URL, { waitUntil: "domcontentloaded" });
    }
  } else {
    if (fallbackPrompt) prompt = fallbackPrompt; // 이어 쓸 대화가 없는 예전 글
    await page.goto(SEL.URL, { waitUntil: "domcontentloaded" }); // 새 대화에서 쓴다
  }
  if (/auth|login/.test(new URL(page.url()).pathname + new URL(page.url()).hostname)) {
    throw new Error("ChatGPT 로그인이 풀렸습니다. 위쪽 메뉴 [AI → 내 AI·계정 연결]에서 다시 연결해 주세요.");
  }

  const input = await firstVisible(page, SEL.INPUT, 30000);
  if (!input) throw new Error("ChatGPT 입력칸을 찾지 못했습니다. 로그인 상태를 확인해 주세요.");
  await humanPause();

  onProgress("ChatGPT에 요청을 넣는 중…");
  await input.click();
  // contenteditable 은 줄마다 문단을 만들어야 줄바꿈이 살아남는다 (확장과 같은 방법)
  await input.evaluate((el, text) => {
    if (el.tagName === "TEXTAREA") {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
      setter.call(el, text);
    } else {
      el.innerHTML = "";
      for (const line of text.split("\n")) {
        const p = document.createElement("p");
        if (line.trim()) p.textContent = line;
        else p.appendChild(document.createElement("br"));
        el.appendChild(p);
      }
    }
    el.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true }));
  }, prompt);
  await humanPause(700, 1500);

  // 사진 첨부 (인테리어·리모델링 시뮬레이션 — 지금 모습 사진을 고쳐 그리게 한다). 올라가는 동안 보내기 버튼이 잠긴다
  if (files.length) {
    onProgress(`사진 ${files.length}장을 ChatGPT에 올리는 중…`);
    const input = page.locator('input[type="file"][accept*="image"]').first();
    const anyInput = page.locator('input[type="file"]').first();
    await ((await input.count()) ? input : anyInput).setInputFiles(files);
    await chrome.sleep(2500);
    const deadline = Date.now() + 90 * 1000;
    while (Date.now() < deadline) {
      const btn = await firstVisible(page, SEL.SEND, 2000);
      if (btn && (await btn.isEnabled().catch(() => false))) break;
      await chrome.sleep(800);
    }
    await humanPause();
  }

  const send = await firstVisible(page, SEL.SEND, 8000);
  if (send && (await send.isEnabled().catch(() => false))) await send.click();
  else await page.keyboard.press("Enter");
  return { page, prev };
}

async function exclusive(fn) {
  if (running) throw new Error("이미 ChatGPT가 작업 중입니다. 끝난 뒤 다시 눌러 주세요.");
  running = true;
  try {
    return await fn();
  } finally {
    running = false;
  }
}

/**
 * 프롬프트를 보내고 답변 글을 돌려준다.
 * isComplete(text) 가 true 가 되고 답변이 멈추면 끝난다 (최대 4분).
 */
/* 받아 오기에 성공하면 [내 AI 연결]에 "연결됨"으로 남긴다 */
function connected(result) {
  try {
    require("../ai-connect").markConnected("chatgpt");
  } catch {}
  return result;
}

/**
 * onChat(url): 답을 받은 대화 주소 — 글에 남겨 두었다가 수정 요청을 그 대화에 이어 보낸다.
 * chatUrl·fallbackPrompt: 수정 요청 (openAndSend 참고)
 */
function ask(prompt, { onProgress = () => {}, isComplete = () => true, onChat = () => {}, chatUrl = "", fallbackPrompt = "" } = {}) {
  return exclusive(async () => {
    const { page, prev } = await openAndSend(prompt, onProgress, { chatUrl, fallbackPrompt });
    const done = (text) => {
      try {
        onChat(page.url());
      } catch {}
      return connected(text);
    };
    // 이어 보낸 경우: 보내기 전 답변(prev)을 새 답으로 잘못 읽지 않는다
    const isOld = (api, text) => Boolean(prev && (prev.id && api.id ? api.id === prev.id : text === prev.text));
    onProgress(prev ? "ChatGPT가 고치는 중… (1~2분)" : "ChatGPT가 글을 쓰는 중… (1~2분)");
    const deadline = Date.now() + 4 * 60 * 1000;
    let last = "";
    let stable = 0;
    while (Date.now() < deadline) {
      await chrome.sleep(3000); // 너무 자주 읽으면 ChatGPT 가 429 로 막는다
      if (page.isClosed()) throw new Error("ChatGPT 창이 닫혔습니다.");
      if (!/\/c\/[0-9a-f-]{36}/.test(page.url())) continue; // 아직 대화가 만들어지지 않음

      // 1순위: 대화 원문 — 답변이 끝났다고(finished_successfully) 표시되면 바로 끝
      const api = await readByConversationApi(page);
      if (api.text && api.status === "finished_successfully" && !isOld(api, api.text) && isComplete(api.text)) return done(api.text);

      // 2순위: 화면 — 중지 버튼이 없고 글자가 두 번 연달아 같으면 끝
      const busy = await anyVisible(page, SEL.STOP);
      const text = api.text || (await readLastAnswer(page));
      if (isOld(api, text)) continue;
      stable = !busy && text && text === last ? stable + 1 : 0;
      last = text;
      if (stable >= 2 && isComplete(text)) return done(text);
    }
    if (last && !(prev && last === prev.text) && isComplete(last)) return done(last);
    throw new Error("ChatGPT 답변을 4분 안에 받지 못했습니다. ChatGPT 창을 확인해 주세요.");
  });
}

/* 대화 원문에서 AI 가 만든 그림 파일 목록 (확장 chatgpt-direct.js imageState 와 같은 방법) */
function readImages(page) {
  return page
    .evaluate(async () => {
      const id = (location.pathname.match(/\/c\/([0-9a-f-]{36})/) || [])[1];
      if (!id) return { error: "대화 주소 없음" };
      const { session } = (window.__gwTok && Date.now() - window.__gwTok.at < 300000 ? window.__gwTok : (window.__gwTok = { at: Date.now(), session: await fetch("/api/auth/session", { credentials: "include" }).then((r) => r.json()) }));
      const token = session && session.accessToken;
      if (!token) window.__gwTok = null;
      if (!token) return { error: "로그인 토큰 없음" };
      const res = await fetch("/backend-api/conversation/" + id, { credentials: "include", headers: { Authorization: "Bearer " + token } });
      if (!res.ok) return { error: "HTTP " + res.status };
      const data = await res.json();
      const chain = [];
      let node = data.mapping && data.mapping[data.current_node];
      while (node) {
        if (node.message) chain.push(node.message);
        node = node.parent ? data.mapping[node.parent] : null;
      }
      const images = [];
      let text = "";
      for (const m of chain.reverse()) {
        if (!m.author || m.author.role === "user" || m.author.role === "system") continue;
        for (const part of (m.content && m.content.parts) || []) {
          if (part && typeof part === "object" && part.content_type === "image_asset_pointer" && part.asset_pointer) {
            images.push({ fileId: String(part.asset_pointer).replace(/^[a-z-]+:\/\//, ""), done: m.status === "finished_successfully" });
          } else if (typeof part === "string" && m.author.role === "assistant") text = part;
        }
      }
      const busy = chain.slice(-3).some((m) => m.status === "in_progress");
      return { conversationId: id, images, busy, text };
    })
    .catch((e) => ({ error: e.message }));
}

function downloadImage(page, conversationId, fileId) {
  return page.evaluate(
    async ({ id, file }) => {
      const { session } = (window.__gwTok && Date.now() - window.__gwTok.at < 300000 ? window.__gwTok : (window.__gwTok = { at: Date.now(), session: await fetch("/api/auth/session", { credentials: "include" }).then((r) => r.json()) }));
      const token = session && session.accessToken;
      if (!token) window.__gwTok = null;
      if (!token) return null;
      const meta = await fetch(`/backend-api/files/download/${encodeURIComponent(file)}?conversation_id=${id}&inline=false`, {
        credentials: "include",
        headers: { Authorization: "Bearer " + token },
      }).then((r) => (r.ok ? r.json() : null));
      if (!meta || !meta.download_url) return null;
      const blob = await fetch(meta.download_url, { credentials: "include" }).then((r) => (r.ok ? r.blob() : null));
      if (!blob) return null;
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    },
    { id: conversationId, file: fileId }
  );
}

/**
 * 그림 프롬프트를 보내고, ChatGPT 가 만든 그림 1장을 data URL 로 돌려준다 (최대 5분).
 */
/* chatUrl: 그 대화에 이어서 그린다 (시뮬레이션: 설계 지시서를 받은 대화) · files: 첨부할 사진 경로 · onChat: 대화 주소 */
function askImage(prompt, { onProgress = () => {}, chatUrl = "", files = [], onChat = () => {} } = {}) {
  return exclusive(async () => {
    const { page } = await openAndSend(prompt, onProgress, { chatUrl, files });
    onProgress("ChatGPT가 그림을 그리는 중… (1~3분)");
    const deadline = Date.now() + 5 * 60 * 1000;
    let lastText = "";
    while (Date.now() < deadline) {
      await chrome.sleep(3000);
      if (page.isClosed()) throw new Error("ChatGPT 창이 닫혔습니다.");
      if (!/\/c\/[0-9a-f-]{36}/.test(page.url())) continue;
      const st = await readImages(page);
      if (st.error) continue;
      lastText = st.text || lastText;
      const done = st.images.filter((i) => i.done);
      if (done.length && !st.busy) {
        onProgress("그림을 받아 오는 중…");
        const dataUrl = await downloadImage(page, st.conversationId, done[done.length - 1].fileId);
        if (!dataUrl) throw new Error("ChatGPT 그림을 내려받지 못했습니다.");
        try {
          onChat(page.url());
        } catch {}
        return connected(dataUrl);
      }
      // 그림 없이 글로만 답하고 끝났으면 (거절·하루 한도 등) 그 이유를 보여 준다
      if (!st.busy && !st.images.length && st.text && Date.now() > deadline - 4 * 60 * 1000) {
        throw new Error(`ChatGPT가 그림 대신 글로 답했습니다: ${st.text.slice(0, 120)}`);
      }
    }
    throw new Error(`ChatGPT 그림을 5분 안에 받지 못했습니다.${lastText ? ` (${lastText.slice(0, 80)})` : ""}`);
  });
}

module.exports = { ask, askImage };
