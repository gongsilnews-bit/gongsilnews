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
    chrome.idle().catch(() => {});
  }
}

/* 받아 오기에 성공하면 [내 AI 연결]에 "연결됨"으로 남긴다 */
function connected(result) {
  try {
    require("../ai-connect").markConnected("gemini");
  } catch {}
  return result;
}

/* 이어 쓸 대화가 있으면 그 대화로, 아니면 새 대화 — { page, revise, prompt } */
async function openChat(onProgress, { chatUrl = "", fallbackPrompt = "", prompt = "" } = {}) {
  await ext.ensure();
  onProgress("스튜디오 전용 크롬에서 Gemini를 여는 중…");
  const page = await chrome.openPage("gemini.google.com", URL_NEW);
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
  return { page, revise, prompt };
}

/* 전용 공간은 Gemini 화면이 바뀌면(새 대화 주소 등) 없어진다 — 그러면 다시 만들어 이어 간다 */
function worldOf(page) {
  return {
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
}

/* 넣고 보내기 (확장 코드) */
async function fillAndSend(w, prompt) {
  const filled = await w.run(`GwAi.fill(GW.GEMINI, ${JSON.stringify(prompt)})`);
  if (!filled || !filled.ok) throw new Error((filled && filled.reason) || "Gemini 입력칸에 글을 넣지 못했습니다.");
  await humanPause(700, 1500);
  const sent = await w.run("GwAi.submit(GW.GEMINI)");
  if (!sent || !sent.ok) throw new Error((sent && sent.reason) || "Gemini에 보내지 못했습니다.");
  return sent;
}

/**
 * 프롬프트를 보내고 답변 글을 돌려준다 (chatgpt.ask 와 같은 모양).
 * isComplete(text): 답 형식 확인 (JSON 등). onChat(url): 답을 받은 대화 주소 — 수정 요청을 그 대화에 이어 보낸다.
 */
function ask(prompt, { onProgress = () => {}, isComplete = () => true, onChat = () => {}, chatUrl = "", fallbackPrompt = "", files = [] } = {}) {
  return exclusive(async () => {
    const opened = await openChat(onProgress, { chatUrl, fallbackPrompt, prompt });
    let { page } = opened;
    const { revise } = opened;
    let w = worldOf(page);
    let conv = ""; // 대화 주소 — 창이 닫히면 다시 열어 이어 받는다
    let reopened = 0;
    try {
      const t0 = Date.now();
      const sec = () => `${Math.round((Date.now() - t0) / 1000)}초`;
      const before = Number(await w.run("GwAi.countAnswers(GW.GEMINI)")) || 0;
      await humanPause();
      if (files.length) await attachPhotos(page, files, onProgress); // 함께 보낼 사진 (영상 장면 모음 등)
      onProgress("Gemini에 요청을 넣는 중…");
      const sent = await fillAndSend(w, opened.prompt);
      await chrome.backstage(page); // 작업 중 띠 + 창 내리기
      log.info(`[Gemini] 보냄 ${sec()} (이전 답 ${before}개)${sent.note ? " " + sent.note : ""}`);

      onProgress(revise ? "Gemini가 고치는 중… (1~2분)" : "Gemini가 글을 쓰는 중… (1~2분)");
      // 앱이 1초마다 짧게 확인한다 (ChatGPT 와 같은 방식). 끝 판단은 확장과 같다:
      // 새 답이 있고, 중지 단추가 없고, 글자가 SETTLE_MS(3초) 동안 그대로이고, 형식(isComplete)이 맞으면 끝
      // 답 시작은 5분까지 기다리고, 시작한 뒤에는 넉넉히 (전체 7분 — 10분은 길다, 2026-10-23 사장님) — 2026-10-23 사장님
      const askT0 = Date.now();
      const deadline = askT0 + 7 * 60 * 1000;
      let last = "";
      let since = 0;
      let firstSeen = 0;
      while (Date.now() < deadline) {
        await chrome.sleep(1000);
        if (page.isClosed()) {
          const again = reopened < 3 ? await chrome.reopen("gemini.google.com", conv, onProgress) : null;
          if (!again) throw new Error("Gemini 창이 닫혔습니다.");
          page = again;
          w = worldOf(page);
          reopened++;
          continue;
        }
        if (chatIdOf(page.url())) conv = page.url();
        let st;
        try {
          st = await w.run("({ count: GwAi.countAnswers(GW.GEMINI), busy: GwAi.isBusy(GW.GEMINI), text: GwAi.readLast(GW.GEMINI), settle: Number(GW.GEMINI.SETTLE_MS) || 3000 })");
        } catch (e) {
          log.warn(`[Gemini] 화면 확인 실패 ${sec()}: ${e.message}`);
          continue;
        }
        if (!st || st.count <= before || !st.text) {
          // 5분이 지나도 답을 시작하지 않으면 (2026-10-23 사장님) 막힌 것으로 본다 — 쓰는 순서에 따라 API 로 넘어간다 (2026-10-23 사장님: 너무 오래 걸림)
          if (!firstSeen && Date.now() - askT0 > 5 * 60 * 1000) throw new Error("Gemini가 5분 동안 답을 시작하지 않았어요 (Gemini 사이트가 느리거나 막혔어요).");
          continue; // 아직 새 답이 없다
        }
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
        if (Date.now() - since > 15000) {
          log.warn(`[Gemini] 답 형식이 맞지 않음 (${st.text.length}자): ${st.text.slice(0, 160)}`);
          throw new Error(`Gemini가 요청한 형식으로 답하지 않았습니다. [다시 쓰기]를 눌러 주세요. (Gemini: ${st.text.slice(0, 60)})`);
        }
      }
      throw new Error("Gemini 답변을 7분 안에 받지 못했습니다. Gemini 창을 확인해 주세요. (답이 나왔으면 복사해서 대본 칸에 붙여 넣으면 돼요)");
    } finally {
      await w.close();
    }
  });
}

/* ── 그림 (Gemini 이미지 생성 · 나노바나나) ──
   [업로드 및 도구] 메뉴의 그림 칸으로 사진을 붙이고(시뮬레이션), [이미지 만들기] 도구를 켠 뒤 보낸다.
   새 답 안의 큰 그림(확장 turnState 와 같은 기준)이 나오고 멎으면 그 그림을 내려받는다. */
async function openToolMenu(page) {
  const btn = page.locator('button[aria-label="업로드 및 도구"], button[aria-label="Upload and tools"], button[aria-label*="업로드"]').first();
  if (!(await btn.isVisible().catch(() => false))) return false;
  await btn.click();
  await chrome.sleep(900);
  return true;
}

async function attachPhotos(page, files, onProgress) {
  onProgress(`사진 ${files.length}장을 Gemini에 올리는 중…`);
  if (!(await openToolMenu(page))) throw new Error("Gemini 사진 올리기 단추를 찾지 못했습니다.");
  // 여러 장 받는 칸 먼저, 없으면 한 장씩 (한 장만 받는 칸에 여러 장 → 오류, 2026-10-20)
  const multi = page.locator('input[type="file"][multiple]:not([capture])').first();
  const input = (await multi.count()) ? multi : page.locator('input[type="file"][accept*="image"]:not([capture])').first();
  if (!(await input.count())) throw new Error("Gemini 사진 올리기 칸을 찾지 못했습니다.");
  if ((await multi.count()) || files.length < 2) await input.setInputFiles(files);
  else for (const f of files) { await input.setInputFiles([f]); await new Promise((r) => setTimeout(r, 1500)); }
  await page.keyboard.press("Escape").catch(() => {});
  // 올라가는 동안 보내기 단추가 잠긴다 — 사진 미리보기가 생기고 잠깐 더 기다린다
  await chrome.sleep(4000);
}

async function pickImageTool(page) {
  if (!(await openToolMenu(page))) return false;
  const item = page.locator('mat-list-item:has-text("이미지 만들기"), [role="menuitem"]:has-text("이미지 만들기"), mat-list-item:has-text("Create image")').first();
  if (await item.isVisible().catch(() => false)) {
    await item.click();
    await chrome.sleep(800);
    return true;
  }
  await page.keyboard.press("Escape").catch(() => {});
  return false;
}

/* 그림 → data URL.
   Gemini 는 그림을 화면 안에서만 쓰는 임시 주소(blob:)로 보여 줘 주소로는 못 받는다 — 화면의 그 그림을 원본 크기로 캔버스에 떠 온다.
   그래도 안 되면 일반 주소는 로그인 쿠키로 내려받고, 마지막으로 화면 캡처 */
async function download(page, src) {
  const viaCanvas = await page
    .evaluate(async (u) => {
      const img = [...document.querySelectorAll("img")].find((x) => (x.currentSrc || x.src) === u);
      if (!img) return { error: "그림 요소 없음" };
      if (!img.complete) await new Promise((ok) => { img.onload = ok; setTimeout(ok, 5000); });
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext("2d").drawImage(img, 0, 0);
        return { data: c.toDataURL("image/png"), w: img.naturalWidth, h: img.naturalHeight };
      } catch (e) {
        return { error: e.message };
      }
    }, src)
    .catch((e) => ({ error: e.message }));
  if (viaCanvas && viaCanvas.data && viaCanvas.data.length > 1000) {
    log.info(`[Gemini 그림] 화면 그림 떠 옴 ${viaCanvas.w}×${viaCanvas.h}`);
    return viaCanvas.data;
  }
  log.warn(`[Gemini 그림] 캔버스로 못 뜸: ${viaCanvas && viaCanvas.error}`);
  if (/^https?:/.test(src)) {
    const res = await page.context().request.get(src, { headers: { Referer: "https://gemini.google.com/" } }).catch(() => null);
    if (res && res.ok()) {
      const type = (res.headers()["content-type"] || "image/png").split(";")[0];
      return `data:${type};base64,${(await res.body()).toString("base64")}`;
    }
  }
  const el = page.locator(`img[src="${src.replace(/"/g, '\\"')}"]`).last();
  const shot = await el.screenshot({ type: "png" }).catch(() => null);
  if (!shot) throw new Error("Gemini 그림을 받아 오지 못했습니다.");
  log.warn("[Gemini 그림] 화면 캡처로 받음 (해상도가 낮을 수 있음)");
  return `data:image/png;base64,${shot.toString("base64")}`;
}

/** 그림을 그려 data URL 로 돌려준다 (chatgpt.askImage 와 같은 모양). files: 붙일 사진 (시뮬레이션) */
function askImage(prompt, { onProgress = () => {}, chatUrl = "", files = [], onChat = () => {} } = {}) {
  return exclusive(async () => {
    let { page } = await openChat(onProgress, { chatUrl, prompt });
    let w = worldOf(page);
    let conv = "";
    let reopened = 0;
    try {
      const t0 = Date.now();
      const sec = () => `${Math.round((Date.now() - t0) / 1000)}초`;
      const before = Number((await w.run("GwAi.turnState(GW.GEMINI, 0)") || {}).turns) || 0;
      if (files.length) await attachPhotos(page, files, onProgress);
      const tool = await pickImageTool(page);
      onProgress("Gemini에 그림을 요청하는 중…");
      await fillAndSend(w, prompt);
      await chrome.backstage(page); // 작업 중 띠 + 창 내리기
      log.info(`[Gemini 그림] 보냄 ${sec()} (사진 ${files.length}장, 이미지 도구 ${tool ? "켬" : "못 찾음"})`);
      onProgress("Gemini가 그림을 그리는 중… (1~3분)");

      const deadline = Date.now() + 5 * 60 * 1000;
      let lastSrc = "";
      let since = 0;
      let lastText = "";
      let textSince = 0;
      while (Date.now() < deadline) {
        await chrome.sleep(1500);
        if (page.isClosed()) {
          const again = reopened < 3 ? await chrome.reopen("gemini.google.com", conv, onProgress) : null;
          if (!again) throw new Error("Gemini 창이 닫혔습니다.");
          page = again;
          w = worldOf(page);
          reopened++;
          continue;
        }
        if (chatIdOf(page.url())) conv = page.url();
        let st;
        try {
          st = await w.run(`GwAi.turnState(GW.GEMINI, ${before})`);
        } catch (e) {
          log.warn(`[Gemini 그림] 화면 확인 실패 ${sec()}: ${e.message}`);
          continue;
        }
        if (!st) continue;
        const src = st.images.length ? st.images[st.images.length - 1] : "";
        if (src) {
          if (src !== lastSrc || st.busy) {
            lastSrc = src;
            since = Date.now();
            continue;
          }
          if (Date.now() - since < 3000) continue; // 그림 주소가 고화질로 바뀌는 중일 수 있다
          onProgress("그림을 받아 오는 중…");
          const dataUrl = await download(page, src);
          log.info(`[Gemini 그림] 받음 ${sec()} (${Math.round(dataUrl.length / 1024)}KB)`);
          try {
            onChat(page.url());
          } catch {}
          return connected(dataUrl);
        }
        // 그림 없이 글만 오고 멎었으면 (거절·한도 등) 그 이유를 보여 준다
        if (!st.busy && st.turns > before && st.text) {
          if (st.text !== lastText) {
            lastText = st.text;
            textSince = Date.now();
          } else if (Date.now() - textSince > 20000) {
            const why = /^\s*(```|\{)/.test(st.text) ? "" : ` (Gemini: ${st.text.slice(0, 100)})`;
            throw new Error(`Gemini가 그림을 그리지 않고 끝났습니다. 다시 눌러 주세요.${why}`);
          }
        }
      }
      throw new Error(`Gemini 그림을 5분 안에 받지 못했습니다.${lastText ? ` (${lastText.slice(0, 80)})` : ""}`);
    } finally {
      await w.close();
    }
  });
}

module.exports = { ask, askImage, chatIdOf };
