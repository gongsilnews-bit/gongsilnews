// Claude 작성 (스튜디오 전용 크롬, 회원이 로그인한 claude.ai 계정) — 2026-10-15 사장님 회의
// ChatGPT 와 같은 방식: 입력칸에 넣고 보내고, 답은 Claude 대화 원문(/api/organizations/…/chat_conversations/…)에서 읽는다.
// 원문을 못 읽으면 화면에서 읽는다. Claude 웹은 그림을 그리지 못한다 — 그림은 ChatGPT (ai/index.js).
// 수정 요청은 처음 쓴 대화(chatUrl = https://claude.ai/chat/<id>)에 이어 보낸다. 없어졌으면 fallbackPrompt 로 새 대화.
const chrome = require("../studio-chrome");
const log = require("electron-log/main");

const SEL = {
  NEW: "https://claude.ai/new",
  INPUT: ['div.ProseMirror[contenteditable="true"]', 'div[contenteditable="true"][role="textbox"]', 'div[contenteditable="true"]'],
  SEND: ['button[aria-label="Send message"]', 'button[aria-label="메시지 보내기"]', 'button[aria-label="Send Message"]'],
  STOP: ['button[aria-label="Stop response"]', 'button[aria-label="응답 중지"]', 'button[aria-label*="Stop"]', 'button[aria-label*="중지"]'],
  ANSWER: ['div.font-claude-response', '[data-is-streaming] .font-claude-message', ".font-claude-message"],
};

const humanPause = (min = 400, max = 1100) => chrome.sleep(min + Math.random() * (max - min));
let running = false;
const chatIdOf = (url) => (String(url || "").match(/claude\.ai\/chat\/([0-9a-f-]{36})/) || [])[1] || "";

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

async function readScreen(page) {
  return page
    .evaluate((selectors) => {
      for (const sel of selectors) {
        const nodes = document.querySelectorAll(sel);
        if (nodes.length) return nodes[nodes.length - 1].innerText || "";
      }
      return "";
    }, SEL.ANSWER)
    .catch(() => "");
}

/* 대화 원문에서 마지막 Claude 답 (로그인된 페이지 안에서 실행) */
function readByApi(page) {
  return page
    .evaluate(async () => {
      const id = (location.pathname.match(/\/chat\/([0-9a-f-]{36})/) || [])[1];
      if (!id) return { error: "대화 주소 없음" };
      if (!window.__gwOrg) {
        const orgs = await fetch("/api/organizations", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
        window.__gwOrg = Array.isArray(orgs) && orgs[0] ? orgs[0].uuid : "";
      }
      if (!window.__gwOrg) return { error: "로그인 정보 없음" };
      const res = await fetch(`/api/organizations/${window.__gwOrg}/chat_conversations/${id}?tree=True&rendering_mode=messages`, { credentials: "include" });
      if (!res.ok) return { error: "HTTP " + res.status };
      const data = await res.json();
      const msgs = (data.chat_messages || []).filter((m) => m.sender === "assistant");
      const m = msgs[msgs.length - 1];
      if (!m) return { error: "AI 답변 없음" };
      const text = (m.text || (m.content || []).filter((c) => c && c.type === "text").map((c) => c.text || "").join("\n") || "").trim();
      return { id: m.uuid, text, count: msgs.length };
    })
    .catch((e) => ({ error: e.message }));
}

async function openAndSend(prompt, onProgress, { chatUrl = "", fallbackPrompt = "", files = [] } = {}) {
  onProgress("스튜디오 전용 크롬에서 Claude를 여는 중…");
  const page = await chrome.openPage("claude.ai", SEL.NEW);
  let prev = null;
  const wantId = chatIdOf(chatUrl);
  if (wantId) {
    if (chatIdOf(page.url()) !== wantId) await page.goto(`https://claude.ai/chat/${wantId}`, { waitUntil: "domcontentloaded" });
    for (let i = 0; i < 8 && !prev; i++) {
      await chrome.sleep(i ? 1200 : 800);
      if (chatIdOf(page.url()) !== wantId) break;
      const api = await readByApi(page);
      if (api.id) prev = api;
      else if (i >= 4 && (await firstVisible(page, SEL.INPUT, 1000))) prev = { id: "", text: await readScreen(page) };
    }
    if (!prev) {
      log.warn(`[Claude] 이어 쓸 대화를 못 엶: ${page.url()}`);
      if (!fallbackPrompt) throw new Error("처음 쓴 Claude 대화를 찾지 못했습니다. [다시 쓰기]를 해 주세요.");
      prompt = fallbackPrompt;
      await page.goto(SEL.NEW, { waitUntil: "domcontentloaded" });
    }
  } else {
    if (fallbackPrompt) prompt = fallbackPrompt;
    await page.goto(SEL.NEW, { waitUntil: "domcontentloaded" });
  }
  if (/\/login/.test(page.url())) throw new Error("Claude 로그인이 풀렸습니다. 위쪽 메뉴 [AI → 내 AI·계정 연결]에서 다시 연결해 주세요.");

  const input = await firstVisible(page, SEL.INPUT, 30000);
  if (!input) {
    if (/\/login/.test(page.url())) throw new Error("Claude 로그인이 풀렸습니다. 위쪽 메뉴 [AI → 내 AI·계정 연결]에서 다시 연결해 주세요.");
    throw new Error("Claude 입력칸을 찾지 못했습니다. 로그인 상태를 확인해 주세요.");
  }
  await humanPause();

  onProgress("Claude에 요청을 넣는 중…");
  await input.click();
  // 줄마다 문단을 만들어 넣고(ChatGPT 와 같다), 안 들어갔으면 붙여넣기로 한 번 더
  const filled = () => input.evaluate((el) => (el.innerText || "").trim().length).catch(() => 0);
  await input.evaluate((el, text) => {
    el.replaceChildren();
    for (const line of text.split("\n")) {
      const p = document.createElement("p");
      if (line.trim()) p.textContent = line;
      else p.appendChild(document.createElement("br"));
      el.appendChild(p);
    }
    el.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true }));
  }, prompt);
  await chrome.sleep(500);
  if ((await filled()) < Math.min(20, prompt.trim().length)) {
    await input.evaluate((el, text) => {
      el.replaceChildren();
      el.focus();
      const dt = new DataTransfer();
      dt.setData("text/plain", text);
      el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
    }, prompt);
    await chrome.sleep(500);
  }
  if ((await filled()) < Math.min(20, prompt.trim().length)) throw new Error("Claude 입력칸에 글을 넣지 못했습니다. Claude 화면을 확인해 주세요.");
  await humanPause(700, 1500);
  // 함께 보낼 사진 (영상 장면 모음 등) — 올라가는 동안 보내기 단추가 잠긴다
  if (files.length) {
    onProgress(`사진 ${files.length}장을 Claude에 올리는 중…`);
    const fileInput = page.locator('input[type="file"]').first();
    if (!(await fileInput.count())) throw new Error("Claude 사진 올리기 칸을 찾지 못했습니다.");
    await fileInput.setInputFiles(files);
    await chrome.sleep(3000);
    const until = Date.now() + 90 * 1000;
    while (Date.now() < until) {
      const b = await firstVisible(page, SEL.SEND, 2000);
      if (b && (await b.isEnabled().catch(() => false))) break;
      await chrome.sleep(800);
    }
  }

  const send = await firstVisible(page, SEL.SEND, 8000);
  if (send && (await send.isEnabled().catch(() => false))) await send.click();
  else await page.keyboard.press("Enter");
  await chrome.backstage(page); // 작업 중 띠 + 창 내리기 (실수로 닫지 않게)
  return { page, prev };
}

async function exclusive(fn) {
  if (running) throw new Error("이미 Claude가 작업 중입니다. 끝난 뒤 다시 눌러 주세요.");
  running = true;
  try {
    return await fn();
  } finally {
    running = false;
    chrome.idle().catch(() => {});
  }
}

function connected(result) {
  try {
    require("../ai-connect").markConnected("claude");
  } catch {}
  return result;
}

/**
 * 프롬프트를 보내고 답변 글을 돌려준다 (chatgpt.ask 와 같은 모양).
 * 끝: 중지 단추가 없고, 답이 두 번 연달아 같고, isComplete(text) 가 맞으면 (최대 4분)
 */
function ask(prompt, { onProgress = () => {}, isComplete = () => true, onChat = () => {}, chatUrl = "", fallbackPrompt = "", files = [] } = {}) {
  return exclusive(async () => {
    const sent = await openAndSend(prompt, onProgress, { chatUrl, fallbackPrompt, files });
    let page = sent.page;
    const prev = sent.prev;
    let conv = "";
    let reopened = 0;
    const isOld = (api, text) => Boolean(prev && (prev.id && api.id ? api.id === prev.id : text === prev.text));
    onProgress(prev ? "Claude가 고치는 중… (1~2분)" : "Claude가 글을 쓰는 중… (1~2분)");
    const t0 = Date.now();
    const deadline = t0 + 4 * 60 * 1000;
    let last = "";
    let stable = 0;
    while (Date.now() < deadline) {
      await chrome.sleep(2500);
      if (page.isClosed()) {
        const again = reopened < 3 ? await chrome.reopen("claude.ai", conv, onProgress) : null;
        if (!again) throw new Error("Claude 창이 닫혔습니다.");
        page = again;
        reopened++;
        continue;
      }
      if (!chatIdOf(page.url())) continue; // 아직 대화가 만들어지지 않음
      conv = page.url();
      const busy = await anyVisible(page, SEL.STOP);
      const api = await readByApi(page);
      const text = api.text || (await readScreen(page));
      if (!text || isOld(api, text)) continue;
      stable = !busy && text === last ? stable + 1 : 0;
      last = text;
      if (stable >= 1 && isComplete(text)) {
        log.info(`[Claude] 답 받음 ${Math.round((Date.now() - t0) / 1000)}초 (${text.length}자)${api.error ? " 화면에서 읽음" : ""}`);
        try {
          onChat(page.url());
        } catch {}
        return connected(text);
      }
    }
    if (last && !(prev && last === prev.text) && isComplete(last)) return connected(last);
    throw new Error("Claude 답변을 4분 안에 받지 못했습니다. Claude 창을 확인해 주세요.");
  });
}

module.exports = { ask, chatIdOf };
