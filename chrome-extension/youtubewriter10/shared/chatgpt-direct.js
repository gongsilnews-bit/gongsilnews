/* ══════════════════════════════════════════════════════════════
   ChatGPT 답변을 화면 말고 원문으로 읽기 (작업창 · 블로그 작성 공용)

   ChatGPT 는 JSON 을 스크롤 상자에 담아 보이는 줄만 그린다.
   화면 글자로는 끝까지 읽지 못하는 일이 잦아 원문을 직접 받는다.
   ══════════════════════════════════════════════════════════════ */
const GWChatGptDirect = (() => {
  "use strict";

  /* AI 답변 아래 [복사] 버튼을 대신 눌러 원문을 받는다.
     ChatGPT 는 JSON 을 스크롤 상자에 담아 보이는 줄만 그리므로 화면 글자로는 끝까지 읽을 수 없다.
     복사 버튼은 답변이 다 끝나야 생기므로, 복사로 받은 글은 곧 완성된 답변이다.
     페이지의 클립보드 쓰기를 잠깐 가로채야 해서 페이지 쪽(MAIN)에서 실행한다. */
  async function readByCopyButton(tabId) {
    try {
      const [run] = await chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        func: async () => {
          const answers = document.querySelectorAll('[data-message-author-role="assistant"]');
          const last = answers[answers.length - 1];
          if (!last) return null;
          const turn = last.closest('article, [data-testid^="conversation-turn"]');
          if (!turn) return null;
          const buttons = turn.querySelectorAll('button[data-testid="copy-turn-action-button"]');
          const btn = buttons[buttons.length - 1];
          if (!btn) return null;

          const clip = navigator.clipboard;
          const keep = { writeText: clip.writeText, write: clip.write };
          let got = null;
          clip.writeText = async (text) => { got = String(text); };
          clip.write = async (items) => {
            for (const item of items) {
              if (item.types.includes("text/plain")) {
                got = await (await item.getType("text/plain")).text();
                return;
              }
            }
          };
          try {
            btn.click();
            for (let i = 0; i < 30 && got === null; i += 1) {
              await new Promise((r) => setTimeout(r, 100));
            }
          } finally {
            clip.writeText = keep.writeText;
            clip.write = keep.write;
          }
          return got;
        },
      });
      const text = run && run.result;
      return typeof text === "string" && GWArticleJson.hasCompleteObject(text) ? text : "";
    } catch (e) {
      console.warn("[공실뉴스] 복사 버튼으로 읽기 실패", e);
      return "";
    }
  }

  /* ChatGPT 서버에서 이 대화의 원문을 직접 받아 마지막 AI 답변을 꺼낸다.
     화면(코드 상자·스크롤·버튼 모양)과 상관없어 가장 튼튼하다.
     로그인된 페이지의 세션으로 요청해야 하므로 페이지 쪽(MAIN)에서 실행한다. */
  async function readByConversationApi(tabId) {
    try {
      const [run] = await chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        func: async () => {
          const withTimeout = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error("timeout")), ms))]);
          const id = (location.pathname.match(/\/c\/([0-9a-f-]{36})/) || [])[1];
          if (!id) return { error: "대화 주소 없음" };
          const session = await withTimeout(fetch("/api/auth/session", { credentials: "include" }).then((r) => r.json()), 8000);
          const token = session && session.accessToken;
          if (!token) return { error: "로그인 토큰 없음" };
          const res = await withTimeout(fetch("/backend-api/conversation/" + id, {
            credentials: "include",
            headers: { Authorization: "Bearer " + token },
          }), 10000);
          if (!res.ok) return { error: "HTTP " + res.status };
          const data = await res.json();
          /* 현재 가지의 끝에서 거슬러 올라가며 글이 있는 마지막 AI 답변을 찾는다 */
          let node = data.mapping && data.mapping[data.current_node];
          while (node) {
            const msg = node.message;
            if (msg && msg.author && msg.author.role === "assistant" && msg.content) {
              const parts = (msg.content.parts || []).filter((part) => typeof part === "string");
              const text = (parts.join("\n") || msg.content.text || "").trim();
              if (text) return { text };
            }
            node = node.parent ? data.mapping[node.parent] : null;
          }
          return { error: "AI 답변 없음" };
        },
      });
      const out = (run && run.result) || {};
      if (out.text && GWArticleJson.hasCompleteObject(out.text)) return out.text;
      console.warn("[공실뉴스] 대화 원문으로 읽기 실패:", out.error || "JSON 이 완성되지 않음");
      return "";
    } catch (e) {
      console.warn("[공실뉴스] 대화 원문으로 읽기 실패", e);
      return "";
    }
  }

  /* ChatGPT 탭이면 원문 → 복사 버튼 순서로 시도한다. 둘 다 안 되면 "" — 부르는 쪽이 화면 읽기로 넘어간다.
     onStage(이름) 으로 지금 어느 방법을 쓰는지 알려 준다. */
  async function read(tabId, onStage = () => {}) {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab || !/^https:\/\/chatgpt\.com\//.test(tab.url || "")) return "";
    onStage("대화 원문");
    const viaApi = await readByConversationApi(tabId);
    if (viaApi) return viaApi;
    onStage("복사 버튼");
    const viaCopy = await readByCopyButton(tabId);
    if (viaCopy) return viaCopy;
    onStage("화면");
    return "";
  }


  /* ══════════════════════════════════════════════════════════════
     AI 가 만든 그림 — 화면이 아니라 대화 원문에서 찾는다

     ChatGPT 는 그림을 화면에 어떻게 그릴지 자주 바꾼다. 대화 원문에는
     "이 요청 다음에 이 그림 파일이 나왔다"가 그대로 남으므로 여기서 찾는다.
     ══════════════════════════════════════════════════════════════ */

  /* 현재 대화 가지의 메시지 수, 그림 목록(순서대로), 마지막 메시지 상태 */
  async function imageState(tabId) {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab || !/^https:\/\/chatgpt\.com\//.test(tab.url || "")) return { ok: false, error: "ChatGPT 탭이 아님" };
    try {
      const [run] = await chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        func: async () => {
          const withTimeout = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error("timeout")), ms))]);
          const id = (location.pathname.match(/\/c\/([0-9a-f-]{36})/) || [])[1];
          if (!id) return { ok: false, error: "대화 주소 없음" };
          const session = await withTimeout(fetch("/api/auth/session", { credentials: "include" }).then((r) => r.json()), 8000);
          const token = session && session.accessToken;
          if (!token) return { ok: false, error: "로그인 토큰 없음" };
          const res = await withTimeout(fetch("/backend-api/conversation/" + id, {
            credentials: "include",
            headers: { Authorization: "Bearer " + token },
          }), 12000);
          if (!res.ok) return { ok: false, error: "HTTP " + res.status };
          const data = await res.json();

          /* 끝에서 처음까지 거슬러 모은 뒤 뒤집어 대화 순서로 만든다 */
          const chain = [];
          let node = data.mapping && data.mapping[data.current_node];
          while (node) {
            if (node.message) chain.push(node.message);
            node = node.parent ? data.mapping[node.parent] : null;
          }
          chain.reverse();

          const messages = chain.filter((m) => m.author && m.author.role !== "system");
          const images = [];
          for (const message of messages) {
            if (message.author.role === "user") continue; // 사용자가 올린 그림은 제외
            for (const part of (message.content && message.content.parts) || []) {
              if (part && typeof part === "object" && part.content_type === "image_asset_pointer" && part.asset_pointer) {
                images.push({
                  fileId: String(part.asset_pointer).replace(/^[a-z-]+:\/\//, ""),
                  done: message.status === "finished_successfully",
                });
              }
            }
          }
          const textOf = (m) => (m && m.content
            ? ((m.content.parts || []).filter((p) => typeof p === "string").join("\n") || m.content.text || "").trim()
            : "");
          const last = messages[messages.length - 1] || null;
          /* 끝에서 세 개 안에 아직 쓰는 중인 메시지가 있으면 AI 가 바쁜 것이다 */
          const busy = messages.slice(-3).some((m) => m.status === "in_progress");
          return {
            ok: true,
            conversationId: id,
            messageCount: messages.length,
            images,
            busy,
            last: last ? { role: last.author.role, status: last.status || "", text: textOf(last) } : null,
          };
        },
      });
      return (run && run.result) || { ok: false, error: "결과 없음" };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  }

  /* 그림 파일을 내려받아 data URL 로 돌려준다 */
  async function downloadImage(tabId, fileId) {
    try {
      const [run] = await chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        func: async (file) => {
          const id = (location.pathname.match(/\/c\/([0-9a-f-]{36})/) || [])[1] || "";
          const session = await fetch("/api/auth/session", { credentials: "include" }).then((r) => r.json());
          const token = session && session.accessToken;
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
        args: [fileId],
      });
      return (run && run.result) || null;
    } catch (e) {
      console.warn("[공실뉴스] 그림 받기 실패", e);
      return null;
    }
  }

  return { read, imageState, downloadImage };
})();
