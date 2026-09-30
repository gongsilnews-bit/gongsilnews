/* ══════════════════════════════════════════════════════════════
   3 · 유튜브 대본 / 4 · 장면·이미지

   3번: 대본 스타일·길이를 고르고 AI 가 쓴 완성 대본(읽을 원고)을 받는다.
   4번: 이미지 스타일·장면 길이를 고르고 [대본 분석] → [AI 이미지 만들기] → [한 번에 다운로드].

   2번 초안 다듬기의 기사와 1번 물건 정보·사진은 읽기만 한다.
   두 탭은 공실뉴스부동산·공실스터디부동산 회원과 최고관리자만 쓴다.
   ══════════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  const PANEL_STATE_KEY = "gw_panel_state";
  const YT_STATE_KEY = "gw_youtube_state";
  const SITE_URL = "https://www.gongsilnews.com"; // 로그인 쿠키가 www 에 있다

  const DEFAULT_SETTINGS = {
    videoType: "listing",
    duration: "short",
    tone: "news",
    sceneLength: "medium",
    sceneCount: "",
    aspectRatio: "9:16",
    imageStyle: "news",
    styleLocked: true,
  };

  const Y = {
    settings: { ...DEFAULT_SETTINGS },
    aiTabId: null,
    sourceSignature: "",
    full: null, // { title, text } — 3번 완성 대본
    scenes: [], // 4번 장면
    scenesBasedOn: "", // 장면을 나눈 때의 원고 (바뀌었는지 비교용)
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    tabWork: $("tabWork"), tabDraft: $("tabDraft"), tabScript: $("tabScript"), tabImage: $("tabImage"),
    scriptBadge: $("scriptBadge"),
    viewWork: $("viewWork"), viewDraft: $("viewDraft"), viewScript: $("viewScript"), viewImage: $("viewImage"),
    draftActions: $("draftActions"), scriptActions: $("scriptActions"),
    ytSourceEmpty: $("ytSourceEmpty"), ytSourceReady: $("ytSourceReady"), ytSourceTitle: $("ytSourceTitle"),
    btnMakeScript: $("btnMakeScript"), btnPullScript: $("btnPullScript"),
    ytPasteBox: $("ytPasteBox"), ytPasteJson: $("ytPasteJson"), btnYtPaste: $("btnYtPaste"),
    scriptEmpty: $("scriptEmpty"), scriptBody: $("scriptBody"),
    ytTitle: $("ytTitle"), btnCopyNarration: $("btnCopyNarration"), btnDownloadNarration: $("btnDownloadNarration"), ytFullText: $("ytFullText"), ytFullMeta: $("ytFullMeta"),
    ytReviseInput: $("ytReviseInput"), btnReviseScript: $("btnReviseScript"),
    btnPullScriptRevised: $("btnPullScriptRevised"), btnGoImages: $("btnGoImages"),
    imageEmpty: $("imageEmpty"), imageBody: $("imageBody"),
    ytStyleGrid: $("ytStyleGrid"), ytStyleLocked: $("ytStyleLocked"), ytSceneCountInput: $("ytSceneCountInput"),
    ytSceneHint: $("ytSceneHint"), btnAnalyze: $("btnAnalyze"),
    ytScenePasteBox: $("ytScenePasteBox"), ytScenePasteJson: $("ytScenePasteJson"), btnYtScenePaste: $("btnYtScenePaste"),
    ytSceneStale: $("ytSceneStale"), scenesEmpty: $("scenesEmpty"), scenesBody: $("scenesBody"),
    ytSceneCount: $("ytSceneCount"),
    btnMakeAllImages: $("btnMakeAllImages"),
    ytQueueControls: $("ytQueueControls"), btnPauseImages: $("btnPauseImages"), btnStopImages: $("btnStopImages"),
    ytProgressBar: $("ytProgressBar"), ytProgressText: $("ytProgressText"),
    ytSceneList: $("ytSceneList"), ytReplaceFile: $("ytReplaceFile"),
    btnDownloadAll: $("btnDownloadAll"), btnDownloadPrompts: $("btnDownloadPrompts"),
    status: $("statusPill"), toastHost: $("toastHost"),
  };

  const STATUS_LABEL = { empty: "이미지 없음", generating: "만드는 중", complete: "완성", failed: "실패", recheck: "재확인 필요" };

  let sourceCache = null;
  let replaceSceneId = null;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const uid = (prefix) => `${prefix}-${crypto.randomUUID()}`;
  const two = (n) => String(n).padStart(2, "0");
  const clipName = (index) => `clip${two(index + 1)}`;

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function toast(message, kind = "info", ms = 4500) {
    const box = document.createElement("div");
    box.className = `toast ${kind}`;
    box.textContent = message;
    el.toastHost.appendChild(box);
    requestAnimationFrame(() => box.classList.add("in"));
    setTimeout(() => {
      box.classList.remove("in");
      setTimeout(() => box.remove(), 260);
    }, ms);
  }

  function status(text, kind = "") {
    el.status.textContent = text;
    el.status.className = "status-pill" + (kind ? " " + kind : "");
  }

  async function guard(button, busyText, job) {
    const original = button.innerHTML;
    button.disabled = true;
    status(busyText, "busy");
    try {
      await job();
    } catch (error) {
      console.error("[공실뉴스 유튜브]", error);
      toast(error.message || String(error), "bad", 8000);
      status("문제 발생", "bad");
    } finally {
      button.disabled = false;
      button.innerHTML = original;
      refreshButtons();
    }
  }

  /* 확장을 새로고침하면 이미 열린 AI 탭과의 연결이 끊긴다 — 그 탭에 연결 코드를 다시 넣는다 (F5 없이) */
  const AI_TAB_SCRIPTS = {
    chatgpt: ["shared/config.js", "shared/ui.js", "shared/article-json.js", "shared/ai-common.js", "content-chatgpt.js"],
    gemini: ["shared/config.js", "shared/ui.js", "shared/article-json.js", "shared/ai-common.js", "content-gemini.js"],
  };

  async function reconnectTab(tabId) {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    const host = /^https:\/\/chatgpt\.com\//.test(tab?.url || "") ? "chatgpt"
      : /^https:\/\/gemini\.google\.com\//.test(tab?.url || "") ? "gemini" : "";
    if (!host) return false;
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: AI_TAB_SCRIPTS[host] });
      return true;
    } catch (_) {
      return false;
    }
  }

  async function askTab(tabId, message) {
    if (!tabId) throw new Error("대상 AI 탭이 없습니다.");
    try {
      let response;
      try {
        response = await chrome.tabs.sendMessage(tabId, message);
      } catch (error) {
        if (!/Receiving end does not exist|Could not establish connection/i.test(error?.message || "")) throw error;
        if (!(await reconnectTab(tabId))) throw error;
        response = await chrome.tabs.sendMessage(tabId, message);
      }
      if (response === undefined) throw new Error("탭이 응답하지 않았습니다.");
      return response;
    } catch (error) {
      throw new Error(
        "탭과 연결되지 않았습니다. 해당 탭을 새로고침(F5)한 뒤 다시 눌러 주세요. (" +
        (error.message || String(error)) + ")"
      );
    }
  }

  function waitTabReady(tabId, timeoutMs = 30000) {
    return new Promise((resolve) => {
      const finish = () => {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      };
      const timer = setTimeout(finish, timeoutMs);
      const onUpdated = (id, info) => {
        if (id === tabId && info.status === "complete") {
          clearTimeout(timer);
          finish();
        }
      };
      chrome.tabs.onUpdated.addListener(onUpdated);
      chrome.tabs.get(tabId).then((tab) => {
        if (tab.status === "complete") {
          clearTimeout(timer);
          finish();
        }
      }).catch(() => {});
    });
  }

  /* 자동 입력이 실패해도 붙여넣기로 이어갈 수 있게 AI 에 보낼 글을 미리 복사해 둔다.
     AI 탭으로 넘어가면 작업창이 초점을 잃어 복사가 막히므로 반드시 탭을 띄우기 전에 부른다. */
  const copyForPaste = (text) => navigator.clipboard.writeText(text).then(() => true, () => false);

  function pasteGuide(what, platform) {
    const name = platform === "gemini" ? "Gemini" : "ChatGPT";
    return `${name} 입력칸에 ${what}을 자동으로 넣지 못했습니다. 복사해 두었으니 입력칸을 클릭하고 Ctrl+V 로 붙여넣은 뒤 직접 전송해 주세요.`;
  }

  /* ═════════════ 3·4단계 회원 잠금 ═════════════
     화면 잠금은 안내용이다. 권한 판정은 서버(/api/extension/auth/me)가 한다. */
  let access = null;

  async function siteOrigin() {
    const source = await getSource().catch(() => null);
    try {
      const origin = new URL(source?.vacancy?.url || "").origin;
      if (/^http:\/\/localhost(:\d+)?$/i.test(origin)) return origin;
    } catch (_) {
      /* 주소가 없으면 운영 사이트 */
    }
    return SITE_URL;
  }

  async function checkAccess() {
    const origin = await siteOrigin();
    try {
      const response = await fetch(`${origin}/api/extension/auth/me`, { credentials: "include", cache: "no-store" });
      const data = await response.json();
      access = {
        origin,
        canUse: Boolean(data?.canYoutubeWriter),
        isLoggedIn: Boolean(data?.isLoggedIn),
        name: data?.user?.name || "",
        planLabel: data?.user?.planLabel || "",
      };
    } catch (_) {
      access = { origin, canUse: false, isLoggedIn: false, error: true };
    }
    applyLock();
    return access;
  }

  function applyLock() {
    const locked = !access?.canUse;
    for (const key of ["script", "image"]) {
      const view = key === "script" ? el.viewScript : el.viewImage;
      const title = $(`${key}LockTitle`);
      const text = $(`${key}LockText`);
      const link = $(`${key}LockLink`);
      view.classList.toggle("locked", locked);
      $(`${key}Lock`).classList.toggle("hidden", !locked);
      if (!locked) continue;

      if (!access) {
        title.textContent = "회원 정보를 확인하는 중입니다";
        text.textContent = "잠시만 기다려 주세요.";
        link.classList.add("hidden");
      } else if (access.error) {
        title.textContent = "회원 정보를 확인하지 못했습니다";
        text.textContent = "인터넷 연결을 확인한 뒤 [다시 확인]을 눌러 주세요.";
        link.classList.add("hidden");
      } else if (!access.isLoggedIn) {
        title.textContent = "공실뉴스에 로그인해 주세요";
        text.textContent = "유튜브 대본·장면 이미지는 공실뉴스부동산·공실스터디부동산 회원 전용입니다. 이 브라우저에서 공실뉴스에 로그인한 뒤 [다시 확인]을 눌러 주세요.";
        link.textContent = "공실뉴스 열기";
        link.href = `${access.origin}/`;
        link.classList.remove("hidden");
      } else {
        title.textContent = "유튜브 작성은 회원 전용입니다";
        text.textContent = `${access.name}님은 현재 ${access.planLabel || "무료"} 등급입니다. ` +
          "유튜브 대본·장면 이미지는 공실뉴스부동산·공실스터디부동산 회원만 사용할 수 있습니다.";
        link.textContent = "공실뉴스부동산 신청하기";
        link.href = `${access.origin}/newsrealty/apply`;
        link.classList.remove("hidden");
      }
    }
    showBottomBar();
  }

  ["btnScriptLockRetry", "btnImageLockRetry"].forEach((id) => {
    $(id).addEventListener("click", async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      await checkAccess();
      button.disabled = false;
      if (access?.canUse) toast("유튜브 작성을 사용할 수 있습니다.", "ok");
    });
  });

  /* ═════════════ 탭 전환 ═════════════ */
  const activeYoutubeTab = () =>
    el.tabScript.classList.contains("active") ? "script" : el.tabImage.classList.contains("active") ? "image" : "";

  function showBottomBar() {
    const onScript = activeYoutubeTab() === "script";
    el.scriptActions.classList.toggle("hidden", !onScript || !Y.full || el.viewScript.classList.contains("locked"));
  }

  function activateTab(which) {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    [el.tabWork, el.tabDraft, el.tabScript, el.tabImage].forEach((tab) => tab.classList.remove("active"));
    [el.viewWork, el.viewDraft, el.viewScript, el.viewImage].forEach((view) => view.classList.remove("active"));
    el.draftActions.classList.add("hidden");
    (which === "script" ? el.tabScript : el.tabImage).classList.add("active");
    (which === "script" ? el.viewScript : el.viewImage).classList.add("active");
    if (which === "script") el.scriptBadge.classList.add("hidden");
    applyLock();
    if (which === "script") updateSourceCard();
    if (which === "image") renderImageTab();
    checkAccess();
  }

  function leaveYoutubeTabs() {
    el.tabScript.classList.remove("active");
    el.tabImage.classList.remove("active");
    el.viewScript.classList.remove("active");
    el.viewImage.classList.remove("active");
    el.scriptActions.classList.add("hidden");
  }

  el.tabScript.addEventListener("click", () => activateTab("script"));
  el.tabImage.addEventListener("click", () => activateTab("image"));
  el.tabWork.addEventListener("click", leaveYoutubeTabs);
  el.tabDraft.addEventListener("click", leaveYoutubeTabs);
  document.addEventListener("gw:leave-youtube", leaveYoutubeTabs);

  /* ═════════════ 참조 자료 — 2번 초안(화면에서 고친 내용까지) + 1번 물건 ═════════════ */
  function liveArticleFromDraft(fallback) {
    if (!fallback) return null;
    const title = $("pvTitle")?.innerText.trim() || fallback.title || "";
    const subtitles = $("pvSubtitle")?.innerText
      .split("\n").map((value) => value.trim()).filter(Boolean) || fallback.subtitles || [];
    const paragraphNodes = Array.from($("pvContent")?.children || []).filter((node) => node.tagName === "P");
    const body = paragraphNodes.length
      ? paragraphNodes.map((node) => node.innerText.trim()).filter(Boolean).join("\n\n")
      : fallback.body || "";
    return { title, subtitles, body, keywords: fallback.keywords || [] };
  }

  async function getSource() {
    const stored = await chrome.storage.local.get(PANEL_STATE_KEY);
    const panel = stored[PANEL_STATE_KEY] || {};
    const article = liveArticleFromDraft(panel.article);
    if (!article || !article.title || !article.body) return null;
    return {
      article,
      vacancy: panel.vacancy || null,
      media: Array.isArray(panel.media) ? panel.media : [],
      platform: panel.platform === "gemini" ? "gemini" : "chatgpt",
    };
  }

  const signatureOf = (source) => (source ? [source.article.title, source.article.body].join("\n") : "");

  async function updateSourceCard() {
    sourceCache = await getSource();
    const ready = Boolean(sourceCache);
    el.ytSourceEmpty.classList.toggle("hidden", ready);
    el.ytSourceReady.classList.toggle("hidden", !ready);
    el.ytSourceTitle.textContent = ready ? sourceCache.article.title : "-";
    refreshButtons();
  }

  /* ═════════════ 설정 칩 (3번 대본 · 4번 장면 공용) ═════════════ */
  const settingGroups = document.querySelectorAll("[data-yt-setting]");

  function renderSettings() {
    settingGroups.forEach((group) => {
      const key = group.dataset.ytSetting;
      group.querySelectorAll(".chip").forEach((chip) => chip.classList.toggle("active", chip.dataset.value === Y.settings[key]));
    });
    if (document.activeElement !== el.ytSceneCountInput) el.ytSceneCountInput.value = Y.settings.sceneCount || "";
    renderSceneHint();
  }

  settingGroups.forEach((group) => {
    group.addEventListener("click", (event) => {
      const chip = event.target.closest(".chip[data-value]");
      if (!chip) return;
      Y.settings[group.dataset.ytSetting] = chip.dataset.value;
      renderSettings();
      if (group.dataset.ytSetting === "aspectRatio" && Y.scenes.length) renderScenes();
      save();
    });
  });

  el.ytSceneCountInput.addEventListener("input", () => {
    const value = Math.floor(Number(el.ytSceneCountInput.value));
    Y.settings.sceneCount = value > 0 ? String(value) : "";
    renderSceneHint();
    save();
  });

  function durationText(seconds) {
    if (seconds < 60) return `${seconds}초`;
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}분${sec ? ` ${sec}초` : ""}`;
  }

  function renderSceneHint() {
    if (!Y.full?.text) {
      el.ytSceneHint.textContent = "";
      return;
    }
    const count = gwYtSplitScenes(Y.full.text, Y.settings.sceneLength, Number(Y.settings.sceneCount) || 0).length;
    el.ytSceneHint.textContent =
      `완성 대본은 읽으면 약 ${durationText(gwYtSpeechSeconds(Y.full.text))} → [대본 분석]을 누르면 장면 ${count}개로 나뉩니다.`;
  }

  /* ═════════════ AI 탭 ═════════════ */
  function aiConfig(platform) {
    return platform === "gemini" ? GW.GEMINI : GW.CHATGPT;
  }

  async function aiPlatformOf(tabId) {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    return /gemini\.google\.com/.test(tab?.url || "") ? "gemini" : "chatgpt";
  }

  const aiTabAlive = async () => Boolean(Y.aiTabId && (await chrome.tabs.get(Y.aiTabId).catch(() => null)));

  /* 새 대화 탭을 열어 프롬프트를 넣고 보낸다. 넣기에 실패하면 한 번 새로고침해 다시 넣는다. */
  async function sendInNewTab(prompt, platform, what) {
    const copied = await copyForPaste(prompt);
    const tab = await chrome.tabs.create({ url: aiConfig(platform).URL, active: true });
    Y.aiTabId = tab.id;
    await save();
    refreshButtons();
    await waitTabReady(tab.id);
    await sleep(1200);
    const job = { type: "GW_FILL", text: prompt };
    let filled = await askTab(tab.id, job).catch((error) => ({ ok: false, reason: error.message }));
    if (!filled.ok) {
      status("AI 탭 새로고침 후 재시도", "busy");
      await chrome.tabs.reload(tab.id);
      await sleep(500);
      await waitTabReady(tab.id);
      await sleep(2000);
      filled = await askTab(tab.id, job).catch((error) => ({ ok: false, reason: error.message }));
    }
    if (!filled.ok) {
      if (!copied) throw new Error(filled.reason || `${what}을 넣지 못했습니다.`);
      return { sent: false, platform };
    }
    const submitted = await askTab(tab.id, { type: "GW_SUBMIT" });
    if (!submitted.ok) throw new Error(submitted.reason || "AI 전송 버튼을 누르지 못했습니다.");
    return { sent: true, before: 0, apiBefore: 0, platform };
  }

  /* 이미 열린 대화에 이어서 보낸다 */
  async function sendInSameTab(prompt, what) {
    const platform = await aiPlatformOf(Y.aiTabId);
    const copied = await copyForPaste(prompt);
    await chrome.tabs.update(Y.aiTabId, { active: true });
    /* AI 가 아직 답하는 중이면 끝날 때까지 기다린다 — 그 사이 보내면 전송이 무시된다 */
    const api = await waitIdle(Y.aiTabId);
    const before = await askTab(Y.aiTabId, { type: "GW_COUNT" }).catch(() => null);
    const filled = await askTab(Y.aiTabId, { type: "GW_FILL", text: prompt }).catch((error) => ({ ok: false, reason: error.message }));
    if (!filled.ok) {
      if (!copied) throw new Error(filled.reason || `${what}을 넣지 못했습니다.`);
      return { sent: false, platform };
    }
    const submitted = await askTab(Y.aiTabId, { type: "GW_SUBMIT" });
    if (!submitted.ok) throw new Error(submitted.reason || `${what}을 전송하지 못했습니다.`);
    if (api.ok) await confirmSent(Y.aiTabId, api.messageCount);
    return { sent: true, before: before?.ok ? before.count : null, apiBefore: api.ok ? api.messageCount : null, platform };
  }

  /* ── ChatGPT 대화 원문으로 AI 상태 보기 ── */
  const REFUSAL = /정책|위반|죄송|할 수 없|만들 수 없|생성할 수 없|한도|제한|잠시 후|policy|violat|sorry|can't|cannot|unable|limit/i;

  /* AI 가 답하는 중이면 멈출 때까지 기다린다 (최대 2분). ChatGPT 가 아니면 바로 돌아간다. */
  async function waitIdle(tabId, isCancelled = () => false) {
    let state = await GWChatGptDirect.imageState(tabId);
    const until = Date.now() + 120000;
    while (state.ok && state.busy && Date.now() < until && !isCancelled()) {
      status("AI 답변이 끝나길 기다리는 중", "busy");
      await sleep(2000);
      state = await GWChatGptDirect.imageState(tabId);
    }
    return state;
  }

  /* 보낸 요청이 실제로 대화에 올라갔는지 확인한다. 안 올라갔으면 전송을 두 번 더 눌러 본다. */
  async function confirmSent(tabId, beforeCount) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const until = Date.now() + 10000;
      while (Date.now() < until) {
        await sleep(1500);
        const now = await GWChatGptDirect.imageState(tabId);
        if (!now.ok || now.messageCount > beforeCount) return;
      }
      await askTab(tabId, { type: "GW_SUBMIT" }).catch(() => null);
    }
    const error = new Error("AI 입력칸에 넣었지만 전송되지 않았습니다. AI 탭에서 전송 버튼을 눌러 준 뒤 [다시 시작]을 눌러 주세요.");
    error.kind = "send";
    throw error;
  }

  /* 새 AI 답변이 끝날 때까지 대화 원문으로 기다렸다가 그 글을 돌려준다 */
  async function waitAnswerApi(tabId, beforeCount, maxMs) {
    const until = Date.now() + maxMs;
    while (Date.now() < until) {
      await sleep(2500);
      const now = await GWChatGptDirect.imageState(tabId);
      if (!now.ok) return "";
      const last = now.last;
      if (now.messageCount > beforeCount + 1 && !now.busy && last?.role === "assistant" &&
          last.status === "finished_successfully" && last.text) {
        return last.text;
      }
    }
    return "";
  }

  /* AI 답변 읽기 — ChatGPT 는 대화 원문 → 복사 버튼 → 화면 순, 못 읽으면 해당 붙여넣기 칸을 연다 */
  async function readAnswer(readOpts, pasteBox, pasteInput, where, apiBefore = null) {
    if (!(await aiTabAlive())) throw new Error("AI 탭이 닫혔습니다. 다시 요청해 주세요.");
    const onStage = (stage) => status(`답변 읽는 중 (${stage})`, "busy");
    let text = "";
    if (apiBefore != null) {
      status("AI 답변 기다리는 중 (대화 원문)", "busy");
      text = await waitAnswerApi(Y.aiTabId, apiBefore, readOpts.maxMs || 240000);
      if (text) return text;
    }
    text = readOpts.minCount ? "" : await GWChatGptDirect.read(Y.aiTabId, onStage);
    if (text) return text;

    const response = await askTab(Y.aiTabId, { type: "GW_READ", ...readOpts });
    if (response.ok) return response.text;
    if (response.unreadable) text = await GWChatGptDirect.read(Y.aiTabId, onStage);
    if (text) return text;

    pasteBox.classList.remove("hidden");
    pasteInput.focus();
    throw new Error((response.reason || "AI 답변을 읽지 못했습니다.") + ` ${where} 아래 칸에 JSON 을 직접 붙여넣어 주세요.`);
  }

  function parseJson(text) {
    const parsed = GWYoutubeJson.parseObject(text);
    if (!parsed.ok) throw new Error(parsed.reason + " AI 탭에서 'JSON 형식으로 다시 출력해줘'라고 요청한 뒤 다시 눌러 주세요.");
    return parsed;
  }

  /* ═════════════ 3 · 유튜브 대본 ═════════════ */
  el.btnMakeScript.addEventListener("click", () =>
    guard(el.btnMakeScript, "대본 요청 준비 중", async () => {
      const source = await getSource();
      if (!source) throw new Error("먼저 2 · 초안 다듬기에 기사를 준비해 주세요.");
      if (Y.full && !confirm("지금 완성 대본을 새 대본으로 바꿉니다. 계속할까요?")) return;
      Y.sourceSignature = signatureOf(source);

      /* 대본은 항상 새 대화에서 시작한다. 다른 대화에 섞이면 AI 가 엉뚱한 내용을 이어 쓴다. */
      const result = await sendInNewTab(gwBuildYtScriptPrompt(source, Y.settings), source.platform, "대본 요청");
      if (!result.sent) {
        toast(pasteGuide("대본 요청", result.platform) + " 답변이 끝나면 [완성 대본 가져오기]를 누르세요.", "bad", 15000);
        status("붙여넣기 필요", "bad");
        return;
      }
      const duration = GW_YT_DURATION[Y.settings.duration] || GW_YT_DURATION.short;
      toast(`${duration.label} 대본 작성을 시작했습니다. 다 나오면 [완성 대본 가져오기]를 누르세요.`, "ok", 8000);
      status("대본 작성 중", "busy");
    })
  );

  function applyFullScript(text) {
    const { data, repaired } = parseJson(text);
    const narration = Array.isArray(data.narration) ? data.narration : [data.narration || data.script || ""];
    const body = narration.map((p) => String(p || "").trim()).filter(Boolean).join("\n\n");
    if (!body) throw new Error("AI 답변에 원고(narration)가 없습니다. 'JSON 형식으로 다시 출력해줘'라고 요청해 주세요.");
    Y.full = {
      title: String(data.title || "").trim(),
      text: body,
    };
    el.ytPasteBox.classList.add("hidden");
    el.ytPasteJson.value = "";
    renderScript();
    save();
    return repaired;
  }

  function afterScriptPulled(repaired, revised = false) {
    toast(`${repaired ? "AI의 JSON 오류를 복구해 " : ""}${revised ? "수정 대본" : "완성 대본"}을 가져왔습니다. 읽으면 약 ${durationText(gwYtSpeechSeconds(Y.full.text))}`, "ok");
    status(revised ? "대본 갱신됨" : "대본 준비됨", "ok");
    if (activeYoutubeTab() !== "script") el.scriptBadge.classList.remove("hidden");
  }

  el.btnPullScript.addEventListener("click", () =>
    guard(el.btnPullScript, "대본 읽는 중", async () => {
      const text = await readAnswer({}, el.ytPasteBox, el.ytPasteJson, "대본 쓰기 칸");
      afterScriptPulled(applyFullScript(text));
    })
  );

  el.btnYtPaste.addEventListener("click", () =>
    guard(el.btnYtPaste, "대본 만드는 중", async () => {
      const text = el.ytPasteJson.value.trim();
      if (!text) throw new Error("AI 답변의 JSON 을 먼저 붙여넣어 주세요.");
      afterScriptPulled(applyFullScript(text));
    })
  );

  function reviseScript() {
    const request = el.ytReviseInput.value.trim();
    if (!request) {
      toast("대본에서 고칠 점을 적어 주세요.", "bad");
      return;
    }
    guard(el.btnReviseScript, "수정 요청 중", async () => {
      if (!Y.full) throw new Error("수정할 대본이 없습니다.");
      if (!(await aiTabAlive())) throw new Error("대본을 만든 AI 탭이 닫혔습니다. [AI 유튜브 대본 작성]으로 새로 만들어 주세요.");
      const result = await sendInSameTab(gwBuildYtRevisePrompt(Y.full, request), "수정 요청");
      if (!result.sent) {
        toast(pasteGuide("수정 요청", result.platform) + " 답변이 끝나면 [수정 대본 가져오기]를 누르세요.", "bad", 15000);
        status("붙여넣기 필요", "bad");
        return;
      }
      el.ytReviseInput.value = "";
      if (result.before == null && result.apiBefore == null) {
        toast("대본 수정을 요청했습니다. 답변이 끝나면 [수정 대본 가져오기]를 누르세요.", "info", 9000);
        status("수정 답변 기다리는 중", "busy");
        return;
      }
      toast("대본 수정을 요청했습니다. 새 답변이 끝나면 자동으로 가져옵니다.", "info");
      const text = await readAnswer({ minCount: result.before + 1, maxMs: 240000 }, el.ytPasteBox, el.ytPasteJson, "대본 쓰기 칸", result.apiBefore);
      afterScriptPulled(applyFullScript(text), true);
    });
  }

  el.btnReviseScript.addEventListener("click", reviseScript);
  el.ytReviseInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") reviseScript();
  });
  el.btnPullScriptRevised.addEventListener("click", () =>
    guard(el.btnPullScriptRevised, "수정 대본 읽는 중", async () => {
      const text = await readAnswer({}, el.ytPasteBox, el.ytPasteJson, "대본 쓰기 칸");
      afterScriptPulled(applyFullScript(text), true);
    })
  );

  el.btnGoImages.addEventListener("click", () => activateTab("image"));

  function renderScript() {
    const has = Boolean(Y.full);
    el.scriptEmpty.classList.toggle("hidden", has);
    el.scriptBody.classList.toggle("hidden", !has);
    showBottomBar();
    refreshButtons();
    if (!has) return;
    if (document.activeElement !== el.ytTitle) el.ytTitle.value = Y.full.title || "";
    if (document.activeElement !== el.ytFullText) el.ytFullText.value = Y.full.text || "";
    renderFullMeta();
  }

  function renderFullMeta() {
    if (!Y.full) return;
    el.ytFullMeta.textContent =
      `공백 제외 ${gwYtCharCount(Y.full.text).toLocaleString("ko-KR")}자 · 읽으면 약 ${durationText(gwYtSpeechSeconds(Y.full.text))}`;
  }

  el.ytTitle.addEventListener("input", () => {
    if (Y.full) Y.full.title = el.ytTitle.value;
    save();
  });

  el.btnCopyNarration.addEventListener("click", async () => {
    const text = String(Y.full?.text || "").trim();
    if (!text) return toast("복사할 원고가 없습니다.", "bad");
    const ok = await copyForPaste(text);
    toast(ok ? "내레이션 원고 전체를 복사했습니다." : "복사하지 못했습니다. 원고를 직접 선택해 복사해 주세요.", ok ? "ok" : "bad");
  });

  el.btnDownloadNarration.addEventListener("click", async () => {
    const text = String(Y.full?.text || "").trim();
    if (!text) return toast("저장할 원고가 없습니다.", "bad");
    const name = `공실뉴스-유튜브/${safeName(Y.full?.title)}_내레이션.txt`;
    try {
      await download(textBlob(text), name);
      toast(`다운로드 폴더에 ${name} 을 저장했습니다.`, "ok", 6000);
    } catch (e) {
      toast(`저장하지 못했습니다: ${e?.message || e}`, "bad");
    }
  });
  el.ytFullText.addEventListener("input", () => {
    if (!Y.full) return;
    Y.full.text = el.ytFullText.value;
    renderFullMeta();
    save();
  });

  /* ═════════════ 4 · 장면·이미지 ═════════════ */
  const selectedMedia = (scene) => scene?.candidates?.find((item) => item.id === scene.selectedId) || null;
  const styleOf = (scene) => (Y.settings.styleLocked ? Y.settings.imageStyle : scene.imageStyle || Y.settings.imageStyle);
  const sceneById = (id) => Y.scenes.find((scene) => scene.sceneId === id) || null;
  const scenesStale = () => Y.scenes.length > 0 && Boolean(Y.full) && gwYtNormalize(Y.full.text) !== Y.scenesBasedOn;

  function newScene(narration, index) {
    return {
      sceneId: uid("scene"),
      heading: `장면 ${index + 1}`,
      narration,
      caption: "",
      visualType: "auto",
      visualPrompt: "",
      imageStyle: "",
      candidates: [],
      selectedId: null,
      status: "empty",
    };
  }

  function renderImageTab() {
    const hasFull = Boolean(Y.full?.text);
    el.imageEmpty.classList.toggle("hidden", hasFull);
    el.imageBody.classList.toggle("hidden", !hasFull);
    refreshButtons();
    if (!hasFull) return;
    renderSettings();
    renderStyles();
    el.ytSceneStale.classList.toggle("hidden", !scenesStale());
    const hasScenes = Y.scenes.length > 0;
    el.scenesEmpty.classList.toggle("hidden", hasScenes);
    el.scenesBody.classList.toggle("hidden", !hasScenes);
    if (!hasScenes) return;
    renderScenes();
  }

  function renderStyles() {
    el.ytStyleGrid.innerHTML = Object.entries(GW_YT_IMAGE_STYLE).map(([key, style]) =>
      `<button type="button" class="image-style ${Y.settings.imageStyle === key ? "active" : ""}" data-style="${esc(key)}">${esc(style.label)}</button>`
    ).join("");
    el.ytStyleLocked.checked = Boolean(Y.settings.styleLocked);
  }

  el.ytStyleGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-style]");
    if (!button) return;
    Y.settings.imageStyle = button.dataset.style;
    renderStyles();
    if (Y.scenes.length) renderScenes();
    save();
  });

  el.ytStyleLocked.addEventListener("change", () => {
    Y.settings.styleLocked = el.ytStyleLocked.checked;
    if (Y.scenes.length) renderScenes();
    save();
  });

  /* ── [대본 분석] — 문장 그대로 나누고, 자막·장면 설명은 AI 에 받아 채운다 ── */
  el.btnAnalyze.addEventListener("click", () =>
    guard(el.btnAnalyze, "대본 분석 중", async () => {
      if (!Y.full?.text) throw new Error("3 · 유튜브 대본에서 완성 대본을 먼저 만들어 주세요.");
      if (queue.running) throw new Error("AI 이미지 만들기가 진행 중입니다. 중지한 뒤 다시 분석해 주세요.");
      const hasImages = Y.scenes.some((scene) => selectedMedia(scene));
      if (hasImages && !confirm("장면을 다시 나눕니다. 이미 만든 이미지는 같은 순서의 장면에 남겨 두고 '재확인 필요'로 표시합니다. 계속할까요?")) return;

      const narrations = gwYtSplitScenes(Y.full.text, Y.settings.sceneLength, Number(Y.settings.sceneCount) || 0);
      /* 장면 내레이션을 이어 붙이면 완성 대본과 같아야 한다 — 어긋나면 진행하지 않는다 */
      if (gwYtNormalize(narrations.join(" ")) !== gwYtNormalize(Y.full.text)) {
        throw new Error("장면을 나누는 중 원고가 달라졌습니다. 완성 대본을 확인한 뒤 다시 눌러 주세요.");
      }
      const previous = Y.scenes;
      Y.scenes = narrations.map((narration, index) => {
        const scene = newScene(narration, index);
        const old = previous[index];
        if (old) {
          scene.sceneId = old.sceneId;
          scene.imageStyle = old.imageStyle;
          scene.candidates = old.candidates || [];
          scene.selectedId = old.selectedId || null;
          scene.status = scene.selectedId ? "recheck" : "empty";
        }
        return scene;
      });
      Y.scenesBasedOn = gwYtNormalize(Y.full.text);
      await save();
      renderImageTab();
      toast(`장면 ${Y.scenes.length}개로 나눴습니다. 자막·장면 설명을 AI에 요청합니다. 답이 오면 자동으로 채워집니다.`, "info", 7000);

      const prompt = gwBuildYtScenePrompt(narrations, Y.settings, Y.full.title);
      const source = await getSource();
      const result = (await aiTabAlive())
        ? await sendInSameTab(prompt, "장면 분석 요청")
        : await sendInNewTab(prompt, source?.platform || "chatgpt", "장면 분석 요청");
      if (!result.sent) {
        el.ytScenePasteBox.classList.remove("hidden");
        toast(pasteGuide("장면 분석 요청", result.platform) + " 답변이 끝나면 JSON 을 [대본 분석] 아래 칸에 붙여넣어 주세요.", "bad", 15000);
        status("붙여넣기 필요", "bad");
        return;
      }
      status("자막·장면 설명 기다리는 중", "busy");
      const text = await readAnswer(
        { minCount: (result.before ?? 0) + 1, maxMs: 240000 },
        el.ytScenePasteBox, el.ytScenePasteJson, "[대본 분석]", result.apiBefore
      );
      applySceneDetails(text);
    })
  );

  const pick = (item, ...keys) => {
    for (const key of keys) {
      const value = item?.[key];
      if (value != null && String(value).trim()) return String(value).trim();
    }
    return "";
  };

  /* AI 가 비워 둔 장면은 내레이션으로 기본값을 채운다 — 자막·장면 설명이 빈 채로 그림을 요청하지 않게 */
  function fillSceneDefaults(scene) {
    const first = (scene.narration.split(/(?<=[.!?。…])\s+/)[0] || scene.narration).replace(/[.!?。…]+$/, "").trim();
    if (!scene.caption) scene.caption = first.length > 24 ? `${first.slice(0, 23).trim()}…` : first;
    /* 스타일 이름은 넣지 않는다 — 스타일을 바꾸면 이미지 요청 때 새 스타일이 붙는다 */
    if (!scene.visualPrompt) scene.visualPrompt = `Korean real estate scene in South Korea that illustrates this narration: "${scene.narration}". No text, numbers or signage in the image.`;
  }

  function applySceneDetails(text) {
    const { data } = parseJson(text);
    const list = Array.isArray(data.scenes) ? data.scenes
      : Array.isArray(data.장면) ? data.장면
      : Array.isArray(data) ? data : [];
    let filled = 0;
    list.forEach((item, order) => {
      if (!item || typeof item !== "object") return;
      const no = Number(pick(item, "no", "number", "index", "번호"));
      const scene = Y.scenes[no > 0 ? no - 1 : order];
      if (!scene) return;
      const heading = pick(item, "heading", "title", "제목", "장면제목");
      const caption = pick(item, "caption", "subtitle", "screenText", "자막", "화면자막");
      const visualType = pick(item, "visualType", "visual_type", "type");
      const visualPrompt = pick(item, "visualPrompt", "visual_prompt", "imagePrompt", "image_prompt", "prompt", "장면설명", "이미지설명");
      if (heading) scene.heading = heading;
      if (caption) scene.caption = caption;
      if (visualType) scene.visualType = visualType;
      if (visualPrompt) scene.visualPrompt = visualPrompt;
      if (caption || visualPrompt) filled += 1;
    });
    if (!filled) throw new Error("AI 답변에서 자막·장면 설명을 찾지 못했습니다. 'JSON 형식으로 다시 출력해줘'라고 요청한 뒤 답변을 [대본 분석] 아래 칸에 붙여넣어 주세요.");
    Y.scenes.forEach(fillSceneDefaults);
    el.ytScenePasteBox.classList.add("hidden");
    el.ytScenePasteJson.value = "";
    renderScenes();
    save();
    const missing = Y.scenes.length - filled;
    toast(
      missing > 0
        ? `AI가 장면 ${filled}개의 자막·장면 설명을 채웠고, 나머지 ${missing}개는 내레이션으로 기본값을 넣었습니다. 필요하면 고쳐 주세요.`
        : `장면 ${filled}개 모두 자막·장면 설명을 채웠습니다. 이제 [AI 이미지 만들기]를 누르세요.`,
      missing > 0 ? "info" : "ok",
      9000
    );
    status("대본 분석 완료", "ok");
  }

  el.btnYtScenePaste.addEventListener("click", () =>
    guard(el.btnYtScenePaste, "장면 채우는 중", async () => {
      const text = el.ytScenePasteJson.value.trim();
      if (!text) throw new Error("AI 답변의 JSON 을 먼저 붙여넣어 주세요.");
      applySceneDetails(text);
    })
  );

  /* ── 장면 카드 ── */
  async function mediaUrl(ref) {
    if (!ref) return "";
    if (ref.kind === "idb") return GWMediaStore.url(ref.storageId);
    return ref.url || "";
  }

  function renderScenes() {
    const vertical = Y.settings.aspectRatio !== "16:9";
    const total = Y.scenes.reduce((sum, scene) => sum + gwYtSpeechSeconds(scene.narration), 0);
    const made = Y.scenes.filter((scene) => selectedMedia(scene)).length;
    el.ytSceneCount.textContent = `— 장면 ${Y.scenes.length}개 · 약 ${durationText(total)} · 이미지 ${made}/${Y.scenes.length}`;
    el.ytSceneStale.classList.toggle("hidden", !scenesStale());

    el.ytSceneList.innerHTML = Y.scenes.map((scene, index) => {
      const has = Boolean(selectedMedia(scene));
      const generating = scene.status === "generating";
      const ppt = styleOf(scene) === "presentation";
      const styleSelect = Y.settings.styleLocked ? "" : `
        <select class="yt-input" data-scene-style>
          ${Object.entries(GW_YT_IMAGE_STYLE).map(([key, style]) =>
            `<option value="${esc(key)}" ${key === styleOf(scene) ? "selected" : ""}>${esc(style.label)}</option>`).join("")}
        </select>`;
      return `
      <article class="card yt-scene" data-scene-id="${esc(scene.sceneId)}">
        <div class="yt-scene-head">
          <span class="yt-scene-no">${clipName(index)}</span>
          <span class="yt-status ${esc(scene.status)}">${esc(STATUS_LABEL[scene.status] || STATUS_LABEL.empty)}</span>
        </div>
        <label class="yt-label">내레이션 <span class="yt-label-note">— 완성 대본 그대로 · 약 ${gwYtSpeechSeconds(scene.narration)}초</span></label>
        <textarea class="yt-input yt-textarea yt-narration" rows="2" readonly>${esc(scene.narration)}</textarea>
        <div class="yt-scene-tools">
          <button type="button" data-act="split" title="내레이션에서 커서를 둔 곳을 기준으로 둘로 나눕니다">✂ 커서에서 나누기</button>
          <button type="button" data-act="merge" title="다음 장면과 합칩니다" ${index >= Y.scenes.length - 1 ? "disabled" : ""}>⊕ 다음 장면과 합치기</button>
        </div>
        <label class="yt-label">자막</label>
        <input class="yt-input" data-field="caption" value="${esc(scene.caption)}" placeholder="화면에 올릴 짧은 자막">
        <label class="yt-label">이미지 프롬프트 (영어)</label>
        <textarea class="yt-input yt-textarea" data-field="visualPrompt" rows="2" placeholder="어떤 그림을 만들지 적어 주세요">${esc(scene.visualPrompt)}</textarea>
        ${styleSelect}
        <div class="yt-frame ${vertical ? "vertical" : ""}" data-frame>
          ${generating && !has ? "" : `<span class="yt-frame-empty">${has ? "불러오는 중…" : "[AI 이미지 만들기] 또는 채워넣기"}</span>`}
          ${has && (ppt || scene.caption) ? `<div class="yt-caption ${ppt ? "ppt" : ""}">${ppt ? "<small>공실뉴스</small>" : ""}<strong>${esc(scene.caption || scene.heading)}</strong></div>` : ""}
          ${generating ? `<div class="yt-frame-busy ${has ? "over" : ""}"><span class="yt-dots"><i></i><i></i><i></i></span>이미지 제작중</div>` : ""}
        </div>
        <div class="yt-image-tools">
          <button type="button" class="btn-sub yt-primary" data-img="remake">${has ? "AI 다시 만들기" : "AI 만들기"}</button>
          <button type="button" class="btn-sub" data-img="replace">채워넣기</button>
          <button type="button" class="btn-sub" data-img="remove" ${has ? "" : "disabled"}>삭제</button>
          ${scene.candidates.length > 1 ? `<button type="button" class="btn-sub yt-image-prev" data-img="previous">↺ 이전 이미지로 되돌리기</button>` : ""}
        </div>
      </article>`;
    }).join("");

    Y.scenes.forEach(async (scene) => {
      const ref = selectedMedia(scene);
      if (!ref) return;
      const url = await mediaUrl(ref).catch(() => "");
      const frame = el.ytSceneList.querySelector(`[data-scene-id="${CSS.escape(scene.sceneId)}"] [data-frame]`);
      if (!frame || !url) return;
      frame.querySelector(".yt-frame-empty")?.remove();
      const image = document.createElement("img");
      image.src = url;
      image.alt = scene.heading;
      frame.prepend(image);
    });
  }

  el.ytSceneList.addEventListener("input", (event) => {
    const field = event.target.dataset.field;
    const scene = sceneById(event.target.closest("[data-scene-id]")?.dataset.sceneId);
    if (!scene || !field) return;
    scene[field] = event.target.value;
    /* 장면 설명이 바뀌면 이미 만든 이미지가 맞는지 다시 봐야 한다 */
    if (field === "visualPrompt" && selectedMedia(scene)) scene.status = "recheck";
    save();
  });

  el.ytSceneList.addEventListener("change", (event) => {
    if (!event.target.matches("[data-scene-style]")) return;
    const scene = sceneById(event.target.closest("[data-scene-id]")?.dataset.sceneId);
    if (!scene) return;
    scene.imageStyle = event.target.value;
    if (selectedMedia(scene)) scene.status = "recheck";
    renderScenes();
    save();
  });

  /* 나누기·합치기는 띄어쓰기 자리에서만 한다 — 이어 붙이면 여전히 완성 대본과 같다 */
  function splitAtCursor(scene, textarea) {
    const text = scene.narration;
    let cut = textarea?.selectionStart || 0;
    if (cut <= 0 || cut >= text.length) {
      const pieces = text.split(/(?<=[.!?。…])\s+/);
      if (pieces.length < 2) return toast("나눌 곳이 없습니다. 내레이션에서 나눌 위치를 클릭한 뒤 눌러 주세요.", "bad");
      cut = pieces.slice(0, Math.ceil(pieces.length / 2)).join(" ").length;
    }
    /* 글자 중간이면 앞쪽 띄어쓰기로 옮긴다 */
    while (cut > 0 && !/\s/.test(text[cut]) && !/\s/.test(text[cut - 1])) cut -= 1;
    const left = text.slice(0, cut).trim();
    const right = text.slice(cut).trim();
    if (!left || !right) return toast("나눌 곳이 없습니다. 문장 사이를 클릭한 뒤 눌러 주세요.", "bad");
    const index = Y.scenes.indexOf(scene);
    scene.narration = left;
    if (selectedMedia(scene)) scene.status = "recheck";
    const added = newScene(right, index + 1);
    added.heading = `${scene.heading} (2)`;
    added.caption = scene.caption;
    added.visualType = scene.visualType;
    added.visualPrompt = scene.visualPrompt;
    Y.scenes.splice(index + 1, 0, added);
    renderScenes();
    save();
  }

  el.ytSceneList.addEventListener("click", (event) => {
    const card = event.target.closest("[data-scene-id]");
    const scene = sceneById(card?.dataset.sceneId);
    if (!scene) return;
    const index = Y.scenes.indexOf(scene);

    const tool = event.target.closest("button[data-act]");
    if (tool) {
      if (queue.running) return toast("AI 이미지 만들기가 진행 중입니다. 끝나거나 중지한 뒤 바꿔 주세요.", "info");
      if (tool.dataset.act === "split") splitAtCursor(scene, card.querySelector(".yt-narration"));
      if (tool.dataset.act === "merge" && index < Y.scenes.length - 1) {
        const next = Y.scenes[index + 1];
        scene.narration = `${scene.narration} ${next.narration}`.trim();
        scene.visualPrompt = [scene.visualPrompt, next.visualPrompt].filter(Boolean).join(" / ");
        if (!selectedMedia(scene) && selectedMedia(next)) {
          scene.candidates = next.candidates;
          scene.selectedId = next.selectedId;
        }
        if (selectedMedia(scene)) scene.status = "recheck";
        Y.scenes.splice(index + 1, 1);
        renderScenes();
        save();
      }
      return;
    }

    const button = event.target.closest("button[data-img]");
    if (!button) return;
    const act = button.dataset.img;
    if (act === "remake" && queue.running) {
      return toast("AI 이미지 만들기가 진행 중입니다. 일시정지한 뒤 눌러 주세요.", "info");
    }
    if (act === "remake") {
      guard(button, `${clipName(Y.scenes.indexOf(scene))} 이미지 만드는 중`, async () => {
        await makeSceneImage(scene, selectedMedia(scene) ? "같은 장면을 다른 구도로 새로 만들어 주세요." : "");
        toast(`${clipName(Y.scenes.indexOf(scene))} 이미지를 넣었습니다.`, "ok");
        status("이미지 완성", "ok");
      });
    }
    if (act === "replace") {
      replaceSceneId = scene.sceneId;
      el.ytReplaceFile.click();
    }
    if (act === "previous") {
      const list = scene.candidates || [];
      const current = list.findIndex((item) => item.id === scene.selectedId);
      scene.selectedId = list[(current - 1 + list.length) % list.length].id;
      scene.status = "complete";
      renderScenes();
      save();
    }
    if (act === "remove") {
      /* 후보는 남겨 두고 선택만 푼다 — [이전 이미지로 되돌리기]로 되살릴 수 있다 */
      scene.selectedId = null;
      scene.status = "empty";
      renderScenes();
      save();
    }
  });

  /* ═════════════ 이미지 받기·보관 ═════════════ */
  function dataUrlToBlob(dataUrl) {
    const [header, content] = String(dataUrl).split(",");
    const mime = header.match(/data:([^;]+)/)?.[1] || "image/png";
    const binary = atob(content || "");
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  async function storeBlob(blob, source, name) {
    const storageId = await GWMediaStore.put(blob, { name, source });
    return { id: uid("media"), kind: "idb", storageId, source, createdAt: Date.now() };
  }

  /* 그림 받기 — 작업창에서 받아 보고, 안 되면 AI 페이지 안에서 받아 넘긴다 */
  async function fetchImageBlob(url, tabId) {
    try {
      const response = await fetch(url, { credentials: "include" });
      if (response.ok) {
        const blob = await response.blob();
        if (blob.type.startsWith("image/")) return blob;
      }
    } catch (_) {
      /* 페이지 쪽에서 다시 받는다 */
    }
    if (!tabId) return null;
    const [run] = await chrome.scripting.executeScript({
      target: { tabId },
      func: async (src) => {
        try {
          const response = await fetch(src, { credentials: "include" });
          if (response.ok) {
            const blob = await response.blob();
            return await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(blob);
            });
          }
        } catch (_) {
          /* 아래에서 화면의 그림을 직접 옮겨 그린다 */
        }
        /* Gemini 는 그림을 blob: 주소로 띄운다 — 받기가 막히면 화면에 뜬 그림을 캔버스에 옮겨 그려 가져온다 */
        const img = Array.from(document.images).find((node) => (node.currentSrc || node.src) === src);
        if (!img || !img.complete || !img.naturalWidth) return null;
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext("2d").drawImage(img, 0, 0);
          return canvas.toDataURL("image/png");
        } catch (_) {
          return null;
        }
      },
      args: [url],
    }).catch(() => [null]);
    return run?.result ? dataUrlToBlob(run.result) : null;
  }

  function addCandidate(scene, ref) {
    scene.candidates = [...(scene.candidates || []), ref];
    scene.selectedId = ref.id;
    scene.status = "complete";
  }

  /* ══════════════════════════════════════════════════════════════
     AI 에 그림 한 장 요청하고 완성될 때까지 기다린다 (장면 이미지)

     ChatGPT: 대화 원문에서 "요청 뒤에 새로 생긴 그림 파일"을 찾는다. 화면 모양과 무관하다.
     Gemini 이거나 원문을 못 읽으면: 화면의 그림이 멈출 때까지 본다.
     ══════════════════════════════════════════════════════════════ */
  const IMAGE_WAIT_MS = 300000;

  async function ensureAiTab() {
    if (await aiTabAlive()) return;
    /* 대본을 만든 대화가 닫혔으면 새 대화를 연다 — 그림 요청은 장면 설명만으로도 충분하다 */
    const source = await getSource();
    const tab = await chrome.tabs.create({ url: aiConfig(source?.platform || "chatgpt").URL, active: false });
    Y.aiTabId = tab.id;
    await save();
    await waitTabReady(tab.id);
    await sleep(2000);
  }

  /* ── Gemini 등 화면으로 보는 AI: 답변이 완전히 끝나 잠잠해질 때까지 기다린다 ──
     중지 버튼이 사라지고, 답변 수가 3초 동안 그대로여야 끝난 것으로 본다. */
  const turnState = (tabId, after = 0) => askTab(tabId, { type: "GW_TURN_STATE", after }).catch(() => null);
  const IMAGE_GAP_MS = 3000; // 장면 사이 쉬는 시간 — 연달아 보내면 AI 가 속도 제한을 건다
  let lastImageAt = 0;

  async function waitIdleDom(tabId, isCancelled) {
    const until = Date.now() + 180000;
    let state = await turnState(tabId);
    if (!state?.ok) return null; // 예전 content script — 새로고침 전에는 옛 방식으로
    let quietSince = 0;
    let lastTurns = state.turns;
    while (Date.now() < until && !isCancelled()) {
      if (!state.busy && state.turns === lastTurns) {
        quietSince = quietSince || Date.now();
        if (Date.now() - quietSince >= 3000) break;
      } else {
        quietSince = 0;
        lastTurns = state.turns;
        status("AI 답변이 끝나길 기다리는 중", "busy");
      }
      await sleep(1000);
      state = (await turnState(tabId)) || state;
    }
    const rest = IMAGE_GAP_MS - (Date.now() - lastImageAt);
    if (rest > 0) await sleep(rest);
    return state;
  }

  /* 화면으로 보는 AI 에 그림 요청 — 새 답변 안의 그림만 받는다 */
  async function requestImageDom(tabId, prompt, name, isCancelled, before) {
    const filled = await askTab(tabId, { type: "GW_FILL", text: prompt });
    if (!filled.ok) throw new Error(filled.reason || "이미지 요청을 넣지 못했습니다.");

    /* 전송 확인 — 내 요청이 대화에 올라갔는지 보고, 안 올라갔으면 두 번 더 누른다 */
    let sent = false;
    for (let attempt = 0; attempt < 3 && !sent; attempt += 1) {
      await askTab(tabId, { type: "GW_SUBMIT" }).catch(() => null);
      const until = Date.now() + 10000;
      while (Date.now() < until) {
        await sleep(1000);
        const now = await turnState(tabId);
        if (now && (now.users > before.users || now.turns > before.turns)) {
          sent = true;
          break;
        }
      }
    }
    if (!sent) {
      const error = new Error("AI 입력칸에 넣었지만 전송되지 않았습니다. AI 탭에서 전송 버튼을 눌러 준 뒤 [다시 시작]을 눌러 주세요.");
      error.kind = "send";
      throw error;
    }

    const until = Date.now() + IMAGE_WAIT_MS;
    let lastSrc = "";
    let stableSince = 0;
    let textSince = 0;
    const startedAt = Date.now();
    const trace = { turns: `${before.turns}→?`, images: 0, busy: "-", fail: 0 };
    const traceDom = () => `[진단 답변수 ${trace.turns} · 새그림 ${trace.images} · 답변중 ${trace.busy} · 받기실패 ${trace.fail}]`;
    while (Date.now() < until) {
      if (isCancelled()) throw new Error("중지했습니다.");
      await sleep(1200);
      status(`그림 기다리는 중 ${Math.round((Date.now() - startedAt) / 1000)}초`, "busy");
      const now = await turnState(tabId, before.turns);
      if (!now) continue;
      trace.turns = `${before.turns}→${now.turns}`;
      trace.images = now.images.length;
      trace.busy = now.busy ? "예" : "아니오";
      const src = now.images[now.images.length - 1] || "";
      if (src) {
        textSince = 0;
        if (src !== lastSrc) {
          lastSrc = src;
          stableSince = 0;
          continue;
        }
        stableSince = stableSince || Date.now();
        /* 새 답변 안의 그림이 2.5초 그대로이고 답변도 끝났으면 완성 */
        if (!now.busy && Date.now() - stableSince >= 2500) {
          status("그림 받는 중", "busy");
          const blob = await fetchImageBlob(src, tabId);
          if (blob) return storeBlob(blob, "generated", name);
          /* blob: 주소는 AI 탭 밖에서는 열리지 않는다 — 주소만 저장하면 카드가 비어 보이므로 다시 받아 본다 */
          if (!src.startsWith("blob:")) return { id: uid("media"), kind: "url", url: src, source: "generated", createdAt: Date.now() };
          trace.fail += 1;
          if (trace.fail >= 5) throw new Error(`그림은 나왔지만 가져오지 못했습니다. ${traceDom()}`);
          stableSince = Date.now();
        }
        continue;
      }
      /* 그림 없이 글로만 답하고 끝났으면 — 거절·한도 안내는 바로, 그 밖의 글은 20초 더 보고 실패 */
      if (!now.busy && now.turns > before.turns && now.text) {
        textSince = textSince || Date.now();
        const patience = REFUSAL.test(now.text) ? 3000 : 20000;
        if (Date.now() - textSince > patience) {
          const error = new Error(`AI가 그림을 만들지 않았습니다: ${now.text.replace(/\s+/g, " ").slice(0, 80)} ${traceDom()}`);
          error.kind = "text";
          throw error;
        }
      } else {
        textSince = 0;
      }
    }
    throw new Error(`5분 동안 새 그림이 나오지 않았습니다. AI 탭을 확인해 주세요. ${traceDom()}`);
  }

  async function requestImage(prompt, name, isCancelled = () => false) {
    try {
      return await requestImageOnce(prompt, name, isCancelled);
    } finally {
      lastImageAt = Date.now();
    }
  }

  /* 진단 — 화면 그림 수·답변 중 여부·원문 확인 횟수·새 그림 수·받기 실패 횟수 */
  const traceText = (t) =>
    `[진단 화면그림 ${t.shown} · 답변중 ${t.busy} · 원문확인 ${t.apiOk} · 원문새그림 ${t.apiFresh} · 받기실패 원문${t.apiFail}/화면${t.domFail}]`;

  async function requestImageOnce(prompt, name, isCancelled) {
    await ensureAiTab();
    const tabId = Y.aiTabId;
    /* 앞 요청의 답이 아직 쓰이는 중이면 끝날 때까지 기다린 뒤 보낸다 */
    const beforeApi = await waitIdle(tabId, isCancelled);
    if (!beforeApi.ok) {
      const before = await waitIdleDom(tabId, isCancelled);
      if (isCancelled()) throw new Error("중지했습니다.");
      if (before) return requestImageDom(tabId, prompt, name, isCancelled, before);
    }
    const beforeDom = beforeApi.ok ? null : await askTab(tabId, { type: "GW_GET_IMAGE" }).catch(() => null);
    /* 화면의 마지막 그림 — 대화 원문보다 화면에 그림이 먼저 뜨므로, 화면에서도 새 그림을 같이 찾는다 */
    const beforeShown = beforeApi.ok ? await askTab(tabId, { type: "GW_GET_IMAGE" }).catch(() => null) : null;

    const filled = await askTab(tabId, { type: "GW_FILL", text: prompt });
    if (!filled.ok) throw new Error(filled.reason || "이미지 요청을 넣지 못했습니다.");
    const submitted = await askTab(tabId, { type: "GW_SUBMIT" });
    if (!submitted.ok) throw new Error(submitted.reason || "이미지 요청을 전송하지 못했습니다.");

    const until = Date.now() + IMAGE_WAIT_MS;

    /* ── ChatGPT 대화 원문 ── */
    if (beforeApi.ok) {
      await confirmSent(tabId, beforeApi.messageCount);
      const known = new Set(beforeApi.images.map((image) => image.fileId));
      const seen = new Set(); // 지난번 확인 때 이미 보였던 새 그림
      let textOnlySince = 0;
      let domSrc = "";
      let domSince = 0;
      const startedAt = Date.now();
      /* 끝내 못 받았을 때 원인을 알려 주기 위한 기록 */
      const trace = { shown: "-", busy: "-", apiOk: 0, apiFresh: 0, apiFail: 0, domFail: 0 };
      const beforeUrl = beforeShown?.ok ? beforeShown.url : "";
      const beforeCount = beforeShown?.ok ? Number(beforeShown.count || 0) : 0;
      while (Date.now() < until) {
        if (isCancelled()) throw new Error("중지했습니다.");
        await sleep(1200);
        status(`그림 기다리는 중 ${Math.round((Date.now() - startedAt) / 1000)}초`, "busy");

        /* 빠른 길: 화면 맨 끝 그림이 요청 전과 다르고, 답변이 끝나 2초 그대로면 바로 받는다 */
        const shown = await askTab(tabId, { type: "GW_GET_IMAGE" }).catch(() => null);
        trace.shown = shown?.ok ? `${shown.count}` : "0";
        trace.busy = shown?.busy ? "예" : "아니오";
        const src = shown?.ok && shown.url && (shown.url !== beforeUrl || Number(shown.count || 0) > beforeCount) ? shown.url : "";
        if (src && !shown.busy) {
          if (src !== domSrc) {
            domSrc = src;
            domSince = Date.now();
          } else if (Date.now() - domSince >= 2000) {
            const blob = await fetchImageBlob(src, tabId);
            if (blob) {
              status("그림 받는 중", "busy");
              return storeBlob(blob, "generated", name);
            }
            trace.domFail += 1;
            domSince = Date.now(); // 아직 못 받으면 조금 뒤 다시
          }
        } else {
          domSrc = "";
        }

        const now = await GWChatGptDirect.imageState(tabId);
        if (!now.ok) continue;
        trace.apiOk += 1;
        trace.apiFresh = now.images.filter((image) => !known.has(image.fileId)).length;
        const fresh = now.images.filter((image) => !known.has(image.fileId));
        /* 완료 표시가 붙었거나, 같은 새 파일이 두 번 연속 보이면 완성으로 본다 */
        const ready = fresh.filter((image) => image.done || seen.has(image.fileId));
        fresh.forEach((image) => seen.add(image.fileId));
        if (ready.length) {
          status("그림 받는 중", "busy");
          const dataUrl = await GWChatGptDirect.downloadImage(tabId, ready[ready.length - 1].fileId);
          if (dataUrl) return storeBlob(dataUrlToBlob(dataUrl), "generated", name);
          /* 아직 파일이 준비되지 않았으면 다음 확인 때 다시 받아 본다 */
          trace.apiFail += 1;
          ready.forEach((image) => seen.delete(image.fileId));
          continue;
        }
        /* 그림 없이 글로만 답하고 끝났을 때:
           거절·한도 안내면 바로 실패로 넘기고, 그 밖의 글이면 그림이 늦게 올 수 있으니 90초 더 기다린다 */
        const last = now.last;
        const repliedWithText = !src && !fresh.length && !now.busy && now.messageCount > beforeApi.messageCount + 1 &&
          last?.role === "assistant" && last.status === "finished_successfully" && last.text;
        if (repliedWithText) {
          textOnlySince = textOnlySince || Date.now();
          const patience = REFUSAL.test(last.text) ? 4000 : 90000;
          if (Date.now() - textOnlySince > patience) {
            throw new Error(`AI가 그림을 만들지 않았습니다: ${last.text.replace(/\s+/g, " ").slice(0, 80)} ${traceText(trace)}`);
          }
        } else {
          textOnlySince = 0;
        }
      }
      throw new Error(`5분 동안 새 그림을 받지 못했습니다. AI 탭을 확인해 주세요. ${traceText(trace)}`);
    }

    /* ── 화면에서 찾기 (Gemini 등) ── */
    const beforeUrl = beforeDom?.ok ? beforeDom.url : "";
    const beforeCount = beforeDom?.ok ? Number(beforeDom.count || 0) : 0;
    let lastUrl = "";
    let stableSince = 0;
    while (Date.now() < until) {
      if (isCancelled()) throw new Error("중지했습니다.");
      await sleep(2500);
      const now = await askTab(tabId, { type: "GW_GET_IMAGE" }).catch(() => null);
      const fresh = now?.ok && now.url && (now.url !== beforeUrl || Number(now.count || 0) > beforeCount);
      if (!fresh) continue;
      if (now.url !== lastUrl) {
        lastUrl = now.url;
        stableSince = 0;
        continue;
      }
      stableSince = stableSince || Date.now();
      /* 그리는 중에는 흐린 그림이 계속 바뀐다. 같은 주소가 5초 이어지면 완성으로 본다 */
      if (Date.now() - stableSince >= 5000) {
        const blob = await fetchImageBlob(now.url, tabId);
        if (blob) return storeBlob(blob, "generated", name);
        if (!now.url.startsWith("blob:")) return { id: uid("media"), kind: "url", url: now.url, source: "generated", createdAt: Date.now() };
        stableSince = Date.now(); // blob: 주소는 탭 밖에서 안 열린다 — 조금 뒤 다시 받아 본다
      }
    }
    throw new Error("5분 동안 새 그림을 찾지 못했습니다. AI 탭에서 그림이 나왔는지 확인해 주세요.");
  }

  /* ── 장면 이미지 한 장 — 완성되면 그 장면 칸에 바로 넣는다 ── */
  async function makeSceneImage(scene, extra = "", isCancelled) {
    fillSceneDefaults(scene);
    scene.status = "generating";
    renderScenes();
    /* 연속으로 만들 때는 지금 만드는 장면 카드를 화면에 보여 준다 */
    if (queue.running) {
      el.ytSceneList.querySelector(`[data-scene-id="${CSS.escape(scene.sceneId)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    await save();
    try {
      const settings = { ...Y.settings, imageStyle: styleOf(scene) };
      const ref = await requestImage(gwBuildYtImagePrompt(scene, settings, extra), `${scene.sceneId}.png`, isCancelled);
      addCandidate(scene, ref);
      return true;
    } catch (error) {
      scene.status = "failed";
      throw error;
    } finally {
      renderScenes();
      await save();
    }
  }

  /* ══════════════════════════════════════════════════════════════
     [AI 이미지 만들기] — 처음부터 끝까지 연속, 일시정지 · 다시 시작 · 중지

     일시정지: 지금 만드는 장면까지 마치고 멈춘다. [다시 시작]으로 다음 장면부터 이어 간다.
     중지: 기다림을 바로 끝내고 닫는다. 이미 만든 장면은 그대로 남는다.
     ══════════════════════════════════════════════════════════════ */
  const queue = { running: false, paused: false, stopped: false };

  function setProgress(done, total, label = "") {
    el.ytProgressBar.style.width = `${total ? Math.round((done / total) * 100) : 0}%`;
    el.ytProgressText.textContent = total ? `${done} / ${total} ${label}` : "대기 중";
  }

  function showQueueControls() {
    el.ytQueueControls.classList.toggle("hidden", !queue.running);
    el.btnMakeAllImages.classList.toggle("hidden", queue.running);
    el.btnPauseImages.textContent = queue.paused ? "▶ 다시 시작" : "⏸ 일시정지";
    el.btnPauseImages.classList.toggle("yt-primary", queue.paused);
  }

  async function runQueue(mode) {
    if (queue.running) return;
    if (scenesStale() && !confirm("완성 대본이 장면을 나눈 뒤 바뀌었습니다. 그래도 지금 장면으로 이미지를 만들까요?")) return;
    const targets = Y.scenes.filter((scene) => (mode === "failed" ? scene.status === "failed" : !selectedMedia(scene)));
    if (!targets.length) {
      toast(mode === "failed" ? "실패한 장면이 없습니다." : "모든 장면에 이미지가 있습니다.", "info");
      return;
    }
    const blank = targets.filter((scene) => !scene.visualPrompt || !scene.caption);
    if (blank.length) {
      blank.forEach(fillSceneDefaults);
      renderScenes();
      toast(`자막·장면 설명이 빈 장면 ${blank.length}개는 내레이션으로 기본값을 채웠습니다.`, "info", 6000);
    }
    await ensureAiTab();
    const platform = await aiPlatformOf(Y.aiTabId);
    if (!confirm(`${targets.length}개 장면의 이미지를 ${platform === "gemini" ? "Gemini" : "ChatGPT"}에 차례로 요청합니다.\n한 장에 1~2분씩 걸리며, 만드는 동안 AI 탭은 그대로 두세요.\n시작할까요?`)) return;

    Object.assign(queue, { running: true, paused: false, stopped: false });
    showQueueControls();
    let done = 0;
    let failed = 0;
    try {
      for (const scene of targets) {
        while (queue.paused && !queue.stopped) {
          setProgress(done, targets.length, "· 일시정지됨");
          status("일시정지됨", "");
          await sleep(400);
        }
        if (queue.stopped) break;
        /* 멈춘 사이 직접 채워넣었으면 건너뛴다 */
        if (mode !== "failed" && selectedMedia(scene)) {
          done += 1;
          continue;
        }
        setProgress(done, targets.length, `· ${clipName(Y.scenes.indexOf(scene))} 만드는 중`);
        status(`이미지 ${done + 1}/${targets.length}`, "busy");
        try {
          try {
            await makeSceneImage(scene, "", () => queue.stopped);
          } catch (first) {
            /* 전송 실패·중지가 아니면 한 번 더 요청해 본다 — 잠깐의 속도 제한·거절은 다시 하면 되는 경우가 많다 */
            if (first.kind === "send" || queue.stopped) throw first;
            console.warn("[공실뉴스 유튜브] 장면 이미지 재시도", scene.heading, first);
            toast(`${clipName(Y.scenes.indexOf(scene))} 다시 요청합니다: ${first.message}`, "info", 15000);
            setProgress(done, targets.length, `· ${clipName(Y.scenes.indexOf(scene))} 다시 요청 중`);
            status(`이미지 ${done + 1}/${targets.length} 재시도`, "busy");
            await sleep(first.kind === "text" ? 15000 : 5000);
            if (queue.stopped) throw first;
            await makeSceneImage(scene, "", () => queue.stopped);
          }
        } catch (error) {
          console.warn("[공실뉴스 유튜브] 장면 이미지 실패", scene.heading, error);
          if (error.kind === "send" && !queue.stopped) {
            /* 전송 자체가 안 되면 다음 장면도 안 된다 — 멈추고, 다시 시작하면 이 장면부터 */
            queue.paused = true;
            showQueueControls();
            toast(error.message, "bad", 15000);
            targets.splice(targets.indexOf(scene) + 1, 0, scene);
            continue;
          }
          if (!queue.stopped) {
            failed += 1;
            toast(`${clipName(Y.scenes.indexOf(scene))}: ${error.message} — 다음 장면으로 넘어갑니다.`, "info", 15000);
          }
        }
        done += 1;
        setProgress(done, targets.length, "");
      }
    } finally {
      queue.running = false;
      queue.paused = false;
      showQueueControls();
    }
    const message = queue.stopped
      ? `중지했습니다. ${done}/${targets.length}개 장면까지 처리했습니다. 남은 장면은 [AI 이미지 만들기]로 이어서 만들 수 있습니다.`
      : `${done}개 장면 처리 완료${failed ? ` · 실패 ${failed}개는 장면 카드의 [AI 만들기]로 다시 요청하세요` : " · 이제 [한 번에 다운로드]를 누르세요"}`;
    toast(message, failed || queue.stopped ? "info" : "ok", 10000);
    status(queue.stopped ? "중지됨" : failed ? "일부 실패" : "이미지 완료", failed ? "bad" : queue.stopped ? "" : "ok");
  }

  function startQueue(mode) {
    runQueue(mode).catch((error) => {
      toast(error.message || String(error), "bad", 8000);
      status("문제 발생", "bad");
    });
  }

  el.btnMakeAllImages.addEventListener("click", () => startQueue("missing"));
  el.btnPauseImages.addEventListener("click", () => {
    if (!queue.running) return;
    queue.paused = !queue.paused;
    showQueueControls();
    toast(queue.paused ? "지금 만드는 장면까지 마치고 멈춥니다." : "다음 장면부터 이어서 만듭니다.", "info");
  });
  el.btnStopImages.addEventListener("click", () => {
    if (!queue.running) return;
    if (!confirm("이미지 만들기를 중지할까요? 이미 만든 장면은 그대로 남습니다.")) return;
    queue.stopped = true;
    queue.paused = false;
    showQueueControls();
  });

  el.ytReplaceFile.addEventListener("change", async () => {
    const file = el.ytReplaceFile.files?.[0];
    el.ytReplaceFile.value = "";
    const scene = sceneById(replaceSceneId);
    replaceSceneId = null;
    if (!file || !scene) return;
    addCandidate(scene, await storeBlob(file, "uploaded", file.name));
    renderScenes();
    save();
    toast(`${scene.heading}에 이미지를 채워넣었습니다.`, "ok");
  });

  /* ═════════════ 저장 — 한글 자막은 작성기가 직접 그린다 ═════════════ */
  async function blobOf(ref) {
    if (!ref) return null;
    if (ref.kind === "idb") return (await GWMediaStore.get(ref.storageId))?.blob || null;
    return fetchImageBlob(ref.url, null);
  }

  function wrapLines(context, text, maxWidth, maxLines) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    const lines = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (context.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines.slice(0, maxLines);
  }

  /* 비율마다 크기·글자 위치를 따로 잡는다 — 가로 화면을 잘라 세로로 쓰지 않는다 */
  async function compose(ref, { ratio, text, brand, big }) {
    const blob = await blobOf(ref);
    if (!blob) throw new Error("저장할 이미지를 불러오지 못했습니다.");
    const vertical = ratio === "9:16";
    const width = vertical ? 1080 : 1920;
    const height = vertical ? 1920 : 1080;
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    const scale = Math.max(width / bitmap.width, height / bitmap.height);
    context.drawImage(bitmap, (width - bitmap.width * scale) / 2, (height - bitmap.height * scale) / 2, bitmap.width * scale, bitmap.height * scale);

    if (text) {
      const gradient = context.createLinearGradient(0, height * (vertical ? 0.55 : 0.45), 0, height);
      gradient.addColorStop(0, "rgba(10,20,40,0)");
      gradient.addColorStop(1, "rgba(10,20,40,.88)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      const size = Math.round((vertical ? width : height) * (big ? 0.085 : 0.058));
      context.font = `800 ${size}px "Pretendard", "Malgun Gothic", sans-serif`;
      context.textAlign = "center";
      context.fillStyle = "#ffffff";
      context.shadowColor = "rgba(0,0,0,.45)";
      context.shadowBlur = 12;
      const lines = wrapLines(context, text, width * 0.86, big ? 3 : 2);
      const lineHeight = size * 1.25;
      const bottom = height * (vertical ? 0.86 : 0.88);
      lines.forEach((line, index) => {
        context.fillText(line, width / 2, bottom - (lines.length - 1 - index) * lineHeight);
      });
      if (brand) {
        context.shadowBlur = 0;
        context.font = `800 ${Math.round(size * 0.42)}px "Pretendard", "Malgun Gothic", sans-serif`;
        context.fillStyle = "#93c5fd";
        context.fillText("공실뉴스", width / 2, bottom - lines.length * lineHeight - size * 0.1);
      }
    }
    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  }

  const safeName = (value) => String(value || "영상").replace(/[\\/:*?"<>|~.]/g, "-").replace(/\s+/g, " ").trim().slice(0, 40) || "영상";

  /* 메모장에서 한글이 깨지지 않게 BOM 과 윈도 줄바꿈으로 저장한다 */
  const textBlob = (text) => new Blob(["﻿" + String(text || "").replace(/\r?\n/g, "\r\n")], { type: "text/plain;charset=utf-8" });

  async function download(blob, path) {
    const url = URL.createObjectURL(blob);
    try {
      await chrome.downloads.download({ url, filename: path, saveAs: false, conflictAction: "uniquify" });
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
  }

  /* 대본.txt — 제목과 장면별 내레이션 ([clip01] …, 이미지 파일 이름과 짝). 장면이 없으면 완성 원고 통째 */
  const scriptText = () => {
    const body = Y.scenes.length
      ? Y.scenes.map((scene, index) => `[${clipName(index)}]\n${String(scene.narration || "").trim()}`).join("\n\n")
      : Y.full?.text || "";
    return [Y.full?.title || "", body].filter(Boolean).join("\n\n").trim() + "\n";
  };

  /* 이미지프롬프트.txt — [clip01] Narrative / Style / Visual Prompt 형식 (Flow 에 그대로 쓴다) */
  function promptsText() {
    Y.scenes.forEach(fillSceneDefaults);
    return gwBuildYtVisualPromptsText(Y.scenes, styleOf);
  }

  el.btnDownloadPrompts.addEventListener("click", async () => {
    if (!Y.scenes.length) return toast("먼저 [대본 분석]으로 장면을 나눠 주세요.", "bad");
    const name = `공실뉴스-유튜브/${safeName(Y.full?.title)}_이미지프롬프트.txt`;
    try {
      await download(textBlob(promptsText()), name);
      toast(`다운로드 폴더에 ${name} 을 저장했습니다.`, "ok", 6000);
    } catch (e) {
      toast(`저장하지 못했습니다: ${e?.message || e}`, "bad");
    }
  });

  /* ── [한 번에 다운로드] — 이미지·대본·이미지프롬프트를 폴더 하나에 담아 ZIP 한 개로 받는다 ──
     낱개 다운로드는 다른 확장·크롬 설정에 따라 폴더 없이 흩어질 수 있어 ZIP 으로 묶는다. */
  el.btnDownloadAll.addEventListener("click", () =>
    guard(el.btnDownloadAll, "한 번에 다운로드 중", async () => {
      if (!Y.scenes.length) throw new Error("먼저 [대본 분석]으로 장면을 나눠 주세요.");
      const missing = Y.scenes.map((scene, index) => (selectedMedia(scene) ? null : index + 1)).filter(Boolean);
      if (missing.length && !confirm(`이미지가 없는 장면이 ${missing.length}개 있습니다 (${missing.slice(0, 8).join(", ")}${missing.length > 8 ? "…" : ""}번).\n있는 것만 먼저 받을까요?`)) return;

      const now = new Date();
      const stamp = `${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}-${two(now.getHours())}${two(now.getMinutes())}`;
      const folder = `${safeName(Y.full?.title)}_${stamp}`;
      const bytes = async (blob) => new Uint8Array(await blob.arrayBuffer());
      const files = [];
      for (const [index, scene] of Y.scenes.entries()) {
        const ref = selectedMedia(scene);
        if (!ref) continue;
        status(`이미지 담는 중 ${index + 1}/${Y.scenes.length}`, "busy");
        const ppt = styleOf(scene) === "presentation";
        const blob = await compose(ref, { ratio: Y.settings.aspectRatio, text: ppt ? scene.caption || scene.heading : "", brand: ppt, big: false });
        files.push({ name: `${folder}/${clipName(index)}.png`, data: await bytes(blob) });
      }
      const images = files.length;
      files.push({ name: `${folder}/대본.txt`, data: await bytes(textBlob(scriptText())) });
      files.push({ name: `${folder}/이미지프롬프트.txt`, data: await bytes(textBlob(promptsText())) });

      status("ZIP 만드는 중", "busy");
      const zip = new Blob([GWZip.make(files, now)], { type: "application/zip" });
      await download(zip, `공실뉴스-유튜브/${folder}.zip`);

      toast(`${folder}.zip 을 저장했습니다 (이미지 ${images}장 · 대본.txt · 이미지프롬프트.txt). 압축을 풀면 폴더 하나로 나옵니다.`, "ok", 10000);
      status("다운로드 완료", "ok");
    })
  );

  /* ═════════════ 버튼 잠금 · 저장 · 복원 ═════════════ */
  function refreshButtons() {
    el.btnMakeScript.disabled = !sourceCache;
    el.btnPullScript.disabled = !Y.aiTabId;
    el.btnReviseScript.disabled = !Y.full || !Y.aiTabId;
    el.btnPullScriptRevised.disabled = !Y.aiTabId;
    el.btnAnalyze.disabled = !Y.full?.text;
    el.btnMakeAllImages.disabled = !Y.scenes.length;
  }

  let lastSaveError = "";
  function save() {
    return chrome.storage.local.set({ [YT_STATE_KEY]: Y }).catch((error) => {
      const message = error.message || String(error);
      if (message !== lastSaveError) {
        lastSaveError = message;
        toast("유튜브 작업 내용을 저장하지 못했습니다 — " + message, "bad", 9000);
      }
    });
  }

  async function restore() {
    const stored = await chrome.storage.local.get(YT_STATE_KEY);
    const previous = stored[YT_STATE_KEY];
    if (previous) {
      Object.assign(Y, previous);
      Y.settings = { ...DEFAULT_SETTINGS, ...(previous.settings || {}) };
      delete Y.thumbnail; // 썸네일 기능은 뺐다 — 예전 저장분은 버린다
      /* 예전 형식(대본과 장면이 한 덩어리)은 완성 대본 + 장면으로 옮긴다 */
      if (previous.script?.scenes && !previous.full) {
        const text = previous.script.scenes.map((scene) => scene.narration).filter(Boolean).join("\n\n");
        Y.full = { title: previous.script.title || "", text };
        Y.scenes = previous.script.scenes;
        Y.scenesBasedOn = gwYtNormalize(text);
      }
      delete Y.script;
    }
    for (const [key, table] of [
      ["videoType", GW_YT_VIDEO_TYPE], ["duration", GW_YT_DURATION], ["sceneLength", GW_YT_SCENE_LENGTH],
      ["tone", GW_YT_TONE], ["imageStyle", GW_YT_IMAGE_STYLE],
    ]) {
      if (!table[Y.settings[key]]) Y.settings[key] = DEFAULT_SETTINGS[key];
    }
    if (!["9:16", "16:9"].includes(Y.settings.aspectRatio)) Y.settings.aspectRatio = DEFAULT_SETTINGS.aspectRatio;
    Y.scenes = (Array.isArray(Y.scenes) ? Y.scenes : []).map((scene, index) => {
      const restored = { ...newScene(scene.narration || "", index), ...scene };
      restored.candidates = Array.isArray(scene.candidates) ? scene.candidates : [];
      /* 만들던 도중에 작업창이 닫혔으면 실패로 돌려 다시 요청할 수 있게 한다 */
      if (restored.status === "generating") restored.status = "failed";
      return restored;
    });
    if (Y.aiTabId && !(await chrome.tabs.get(Y.aiTabId).catch(() => null))) Y.aiTabId = null;

    renderSettings();
    renderScript();
    renderImageTab();
    await updateSourceCard();
  }

  restore().catch((error) => {
    console.error("[공실뉴스 유튜브] 복원 실패", error);
    refreshButtons();
  });
})();
