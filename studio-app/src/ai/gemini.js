// Gemini 작성 (스튜디오 전용 크롬, 회원이 로그인한 구글 계정)
// 크롬 확장(기사작성기)이 Gemini 탭에서 하는 일을 **같은 코드 그대로** 돌린다 (2026-10-15 사장님 회의).
//  - 확장처럼 Gemini 페이지 안에 "전용 공간"(isolated world)을 만들고, 확장의 config.js · ui.js · article-json.js ·
//    ai-common.js (서버 묶음 ai/…)를 그 안에서 실행한다. 페이지 보안 규칙(Trusted Types)에 걸리지 않고,
//    입력·보내기·답이 끝났는지 판단이 확장과 똑같다. Gemini 화면이 바뀌면 확장만 고치면 앱도 같이 고쳐진다.
//  - 순서도 확장과 같다: 답 수 세기(GW_COUNT) → 넣기(GW_FILL) → 보내기(GW_SUBMIT) → 새 답이 멎을 때까지 읽기(GW_READ)
//  - 수정 요청은 처음 쓴 대화(chatUrl = https://gemini.google.com/app/<id>)에 이어 보낸다. 없어졌으면 fallbackPrompt 로 새 대화.
const chrome = require("../studio-chrome");
const ext = require("../ext");
const log = require("electron-log/main");

const URL_NEW = "https://gemini.google.com/app";
const AI_FILES = ["ai/config.js", "ai/ui.js", "ai/article-json.js", "ai/ai-common.js"];
const humanPause = (min = 400, max = 1100) => chrome.sleep(min + Math.random() * (max - min));
let running = false;

const chatIdOf = (url) => (String(url || "").match(/gemini\.google\.com\/app\/([0-9a-f]{8,})/) || [])[1] || "";

/* 페이지 안 전용 공간에 확장 코드를 올리고, 그 안에서 식을 실행하는 함수를 돌려준다 */
async function extWorld(page) {
  const cdp = await page.context().newCDPSession(page);
  const { frameTree } = await cdp.send("Page.getFrameTree");
  // 부를 때마다 새 공간 — 같은 이름이면 앞 공간이 다시 쓰여 확장 코드가 두 번 올라가며 충돌한다
  const { executionContextId } = await cdp.send("Page.createIsolatedWorld", { frameId: frameTree.frame.id, worldName: `gongsil-studio-${Date.now()}` });
  const run = async (expression) => {
    const r = await cdp.send("Runtime.evaluate", { expression, contextId: executionContextId, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text || "Gemini 화면에서 오류가 났습니다.");
    return r.result ? r.result.value : undefined;
  };
  await run(AI_FILES.map((f) => ext.text(f)).join("\n;\n"));
  return { run, close: () => cdp.detach().catch(() => {}) };
}

/* 로그인 안 된 화면: 구글 로그인 주소로 넘어갔거나 계정 단추가 없다 */
async function loggedOut(page) {
  if (/accounts\.google\.com/.test(page.url())) return true;
  return page
    .evaluate(() => !document.querySelector('a[aria-label*="Google 계정"], a[aria-label*="Google Account"], [aria-label*="Google 계정:"], [aria-label*="Google Account:"]'))
    .catch(() => false);
}

async function exclusive(fn) {
  if (running) throw new Error("이미 Gemini가 작업 중입니다. 끝난 뒤 다시 눌러 주세요.");
  running = true;
  try {
    return await fn();
  } finally {
    running = false;
  }
}

/* 받아 오기에 성공하면 [내 AI 연결]에 "연결됨"으로 남긴다 */
function connected(result) {
  try {
    require("../ai-connect").markConnected("gemini");
  } catch {}
  return result;
}

/**
 * 프롬프트를 보내고 답변 글을 돌려준다 (chatgpt.ask 와 같은 모양).
 * isComplete(text): 답 형식 확인 (JSON 등). onChat(url): 답을 받은 대화 주소 — 수정 요청을 그 대화에 이어 보낸다.
 */
function ask(prompt, { onProgress = () => {}, isComplete = () => true, onChat = () => {}, chatUrl = "", fallbackPrompt = "" } = {}) {
  return exclusive(async () => {
    await ext.ensure();
    onProgress("스튜디오 전용 크롬에서 Gemini를 여는 중…");
    const page = await chrome.openPage("gemini.google.com", URL_NEW);

    // 이어 쓸 대화가 있으면 그 대화로, 아니면 새 대화
    const wantId = chatIdOf(chatUrl);
    let revise = false;
    if (wantId) {
      if (chatIdOf(page.url()) !== wantId) await page.goto(`${URL_NEW}/${wantId}`, { waitUntil: "domcontentloaded" });
      await chrome.sleep(2500);
      revise = chatIdOf(page.url()) === wantId;
      if (!revise) {
        log.warn(`[Gemini] 이어 쓸 대화를 못 엶: ${page.url()}`);
        if (!fallbackPrompt) throw new Error("처음 쓴 Gemini 대화를 찾지 못했습니다. [다시 쓰기]를 해 주세요.");
        prompt = fallbackPrompt;
      }
    } else if (fallbackPrompt) {
      prompt = fallbackPrompt; // 이어 쓸 대화가 없는 예전 글
    }
    if (!revise) {
      await page.goto(URL_NEW, { waitUntil: "domcontentloaded" });
      await chrome.sleep(2000);
    }
    if (await loggedOut(page)) throw new Error("Gemini 로그인이 풀렸습니다. 위쪽 메뉴 [AI → 내 AI·계정 연결]에서 다시 연결해 주세요.");

    // 전용 공간은 Gemini 화면이 바뀌면(새 대화 주소 등) 없어진다 — 그러면 다시 만들어 이어 간다
    const w = {
      cur: null,
      async run(expression) {
        for (let tryNo = 0; ; tryNo++) {
          try {
            if (!this.cur) this.cur = await extWorld(page);
            return await this.cur.run(expression);
          } catch (e) {
            const lost = /navigated|closed|context|not defined|Target/i.test(String(e && e.message));
            if (!lost || tryNo >= 2) throw e;
            if (this.cur) await this.cur.close();
            this.cur = null;
            await chrome.sleep(700);
          }
        }
      },
      close() {
        return this.cur ? this.cur.close() : undefined;
      },
    };
    try {
      const t0 = Date.now();
      const sec = () => `${Math.round((Date.now() - t0) / 1000)}초`;
      const before = Number(await w.run("GwAi.countAnswers(GW.GEMINI)")) || 0;
      await humanPause();
      onProgress("Gemini에 요청을 넣는 중…");
      const filled = await w.run(`GwAi.fill(GW.GEMINI, ${JSON.stringify(prompt)})`);
      if (!filled || !filled.ok) throw new Error((filled && filled.reason) || "Gemini 입력칸에 글을 넣지 못했습니다.");
      await humanPause(700, 1500);
      const sent = await w.run("GwAi.submit(GW.GEMINI)");
      if (!sent || !sent.ok) throw new Error((sent && sent.reason) || "Gemini에 보내지 못했습니다.");
      log.info(`[Gemini] 보냄 ${sec()} (이전 답 ${before}개)${sent.note ? " " + sent.note : ""}`);

      onProgress(revise ? "Gemini가 고치는 중… (1~2분)" : "Gemini가 글을 쓰는 중… (1~2분)");
      // 앱이 1초마다 짧게 확인한다 (ChatGPT 와 같은 방식). 끝 판단은 확장과 같다:
      // 새 답이 있고, 중지 단추가 없고, 글자가 SETTLE_MS(3초) 동안 그대로이고, 형식(isComplete)이 맞으면 끝
      const deadline = Date.now() + 5 * 60 * 1000;
      let last = "";
      let since = 0;
      let firstSeen = 0;
      let warned = 0;
      while (Date.now() < deadline) {
        await chrome.sleep(1000);
        if (page.isClosed()) throw new Error("Gemini 창이 닫혔습니다.");
        let st;
        try {
          st = await w.run("({ count: GwAi.countAnswers(GW.GEMINI), busy: GwAi.isBusy(GW.GEMINI), text: GwAi.readLast(GW.GEMINI), settle: Number(GW.GEMINI.SETTLE_MS) || 3000 })");
        } catch (e) {
          log.warn(`[Gemini] 화면 확인 실패 ${sec()}: ${e.message}`);
          continue;
        }
        if (!st || st.count <= before || !st.text) continue; // 아직 새 답이 없다
        if (!firstSeen) {
          firstSeen = Date.now();
          log.info(`[Gemini] 답 시작 ${sec()}`);
        }
        if (st.busy || st.text !== last) {
          last = st.text;
          since = Date.now();
          continue;
        }
        if (Date.now() - since < st.settle) continue;
        if (isComplete(st.text)) {
          log.info(`[Gemini] 답 받음 ${sec()} (${st.text.length}자)`);
          try {
            onChat(page.url());
          } catch {}
          return connected(st.text);
        }
        // 답이 멎었는데 형식이 안 맞으면 (거절·설명 글 등) 오래 기다리지 않는다
        if (Date.now() - since > 15000 && !warned++) {
          log.warn(`[Gemini] 답 형식이 맞지 않음 (${st.text.length}자): ${st.text.slice(0, 160)}`);
          throw new Error(`Gemini가 요청한 형식으로 답하지 않았습니다. [다시 쓰기]를 눌러 주세요. (Gemini: ${st.text.slice(0, 60)})`);
        }
      }
      throw new Error("Gemini 답변을 5분 안에 받지 못했습니다. Gemini 창을 확인해 주세요.");
    } finally {
      await w.close();
    }
  });
}

module.exports = { ask, chatIdOf };
