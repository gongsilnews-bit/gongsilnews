/* ══════════════════════════════════════════════════════════════
   4 · 유튜브 대본

   대본 유형·길이·말투·숫자 표기를 고르고 AI 가 쓴 완성 대본(읽을 원고)을 받는다.
   기사 작성기의 4번 탭과 같은 흐름이다 (장면·이미지는 넣지 않는다).

   2번 초안 다듬기의 기사와 1번 소재(뉴스·주제)는 읽기만 한다.
   공실뉴스부동산·공실스터디부동산·비즈니스회원·최고관리자는 무제한, 그 외 회원은 매월 3번 무료 체험.
   ══════════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  const PANEL_STATE_KEY = "gw_panel_state";
  const YT_STATE_KEY = "gw_youtube_state";
  const SITE_URL = "https://www.gongsilnews.com"; // 로그인 쿠키가 www 에 있다

  const DEFAULT_SETTINGS = {
    videoType: "info",
    duration: "mid",
    tone: "friendly",
    number: "hangul",
  };

  const Y = {
    settings: { ...DEFAULT_SETTINGS },
    aiTabId: null,
    sourceSignature: "",
    full: null, // { title, titles[], text } — 완성 대본 (titles 는 제목 후보)
    writing: false, // AI 에 대본을 맡기고 아직 가져오지 않았다
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    tabScript: $("tabScript"), tabBlog: $("tabBlog"), tabWork: $("tabWork"), tabDraft: $("tabDraft"),
    scriptBadge: $("scriptBadge"),
    viewScript: $("viewScript"), scriptActions: $("scriptActions"),
    scriptLock: $("scriptLock"), scriptLockTitle: $("scriptLockTitle"), scriptLockText: $("scriptLockText"),
    scriptLockLink: $("scriptLockLink"), btnScriptLockRetry: $("btnScriptLockRetry"),
    ytSourceEmpty: $("ytSourceEmpty"), ytSourceReady: $("ytSourceReady"), ytSourceTitle: $("ytSourceTitle"),
    ytTrial: $("ytTrial"), ytTitleIdeas: $("ytTitleIdeas"),
    btnMakeScript: $("btnMakeScript"), btnPullScript: $("btnPullScript"),
    ytPasteBox: $("ytPasteBox"), ytPasteJson: $("ytPasteJson"), btnYtPaste: $("btnYtPaste"),
    scriptEmpty: $("scriptEmpty"), scriptBody: $("scriptBody"),
    ytTitle: $("ytTitle"), btnCopyNarration: $("btnCopyNarration"), btnDownloadNarration: $("btnDownloadNarration"),
    ytFullText: $("ytFullText"), ytFullMeta: $("ytFullMeta"), ytWriting: $("ytWriting"), ytFail: $("ytFail"),
    ytReviseInput: $("ytReviseInput"), btnReviseScript: $("btnReviseScript"),
    btnPullScriptRevised: $("btnPullScriptRevised"),
    status: $("statusPill"), toastHost: $("toastHost"),
  };

  let sourceCache = null;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

  /* opts 는 panel.js 의 guard 와 같다 — cover(흰 막) · fail/failTitle(빨간 안내 카드) · retry */
  async function guard(button, busyText, job, opts = {}) {
    const original = button.innerHTML;
    const failBox = opts.fail || opts.cover;
    button.disabled = true;
    GWBusy.clearFail(failBox);
    GWBusy.start(button, busyText, opts.cover);
    status(busyText, "busy");
    try {
      if (GWBusy.isPullButton(button, opts)) {
        await GWBusy.retryOnce(job, () => { GWBusy.label(button, "3초 뒤 다시 가져오는 중"); status("3초 뒤 다시 시도", "busy"); });
      } else {
        await job();
      }
    } catch (error) {
      console.error("[공실뉴스 유튜브]", error);
      toast(error.message || String(error), "bad", 8000);
      status("문제 발생", "bad");
      if (opts.failTitle) GWBusy.fail(failBox, opts.failTitle, error.message || String(error), opts.retry);
    } finally {
      GWBusy.stop(button);
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

  /* ═════════════ 회원 잠금 ═════════════
     화면 잠금은 안내용이다. 권한 판정은 서버(/api/extension/auth/me)가 한다. */
  let access = null;

  async function checkAccess() {
    const origin = SITE_URL;
    try {
      const response = await fetch(`${origin}/api/extension/auth/me`, { credentials: "include", cache: "no-store" });
      const data = await response.json();
      access = GWTrial.accessFrom(data, "youtube", origin);
    } catch (_) {
      access = { origin, canUse: false, isLoggedIn: false, error: true };
    }
    applyLock();
    return access;
  }

  function applyLock() {
    const locked = !access?.canUse;
    el.viewScript.classList.toggle("locked", locked);
    el.scriptLock.classList.toggle("hidden", !locked);
    GWTrial.render(el.ytTrial, locked ? null : access, "유튜브 대본");
    refreshButtons();
    if (locked) {
      if (!access) {
        el.scriptLockTitle.textContent = "회원 정보를 확인하는 중입니다";
        el.scriptLockText.textContent = "잠시만 기다려 주세요.";
        el.scriptLockLink.classList.add("hidden");
      } else if (access.error) {
        el.scriptLockTitle.textContent = "회원 정보를 확인하지 못했습니다";
        el.scriptLockText.textContent = "인터넷 연결을 확인한 뒤 [다시 확인]을 눌러 주세요.";
        el.scriptLockLink.classList.add("hidden");
      } else if (!access.isLoggedIn) {
        el.scriptLockTitle.textContent = "공실뉴스에 로그인하면 무료로 체험할 수 있습니다";
        el.scriptLockText.textContent = "유튜브 대본은 공실뉴스 회원이면 매월 3번 무료로 체험할 수 있고, 공실뉴스부동산·공실스터디부동산·비즈니스회원은 무제한입니다. 이 브라우저에서 공실뉴스에 로그인한 뒤 [다시 확인]을 눌러 주세요.";
        el.scriptLockLink.textContent = "공실뉴스 열기";
        el.scriptLockLink.href = `${access.origin}/`;
        el.scriptLockLink.classList.remove("hidden");
      } else {
        /* 로그인은 했는데 무료 체험 횟수를 읽지 못한 경우 */
        el.scriptLockTitle.textContent = "무료 체험 횟수를 확인하지 못했습니다";
        el.scriptLockText.textContent = `${access.name}님은 현재 ${access.planLabel || "무료"} 등급입니다. ` +
          "잠시 뒤 [다시 확인]을 눌러 주세요. 공실뉴스부동산·공실스터디부동산·비즈니스회원은 무제한으로 쓸 수 있습니다.";
        el.scriptLockLink.textContent = "공실스터디 알아보기";
        el.scriptLockLink.href = `${access.origin}/study`;
        el.scriptLockLink.classList.remove("hidden");
      }
    }
    showBottomBar();
  }

  el.btnScriptLockRetry.addEventListener("click", async () => {
    el.btnScriptLockRetry.disabled = true;
    await checkAccess();
    el.btnScriptLockRetry.disabled = false;
    if (access?.canUse) toast("유튜브 대본을 사용할 수 있습니다.", "ok");
  });

  /* ═════════════ 탭 전환 ═════════════
     1·2번은 panel.js, 3번은 blog.js, 4번은 여기서 관리한다.
     4번을 열 때는 다른 탭과 하단 바를 모두 내려놓는다. */
  /* 유료 회원이 아니면 작성할 때마다 무료 체험 1번을 쓴다. 다 썼으면 여기서 멈춘다. */
  async function useTrial() {
    if (!access) await checkAccess();
    if (!access?.canUse) throw new Error("유튜브 대본을 쓸 수 없습니다. 탭 위의 안내를 확인해 주세요.");
    if (access.unlimited) return;
    const result = await GWTrial.consume(access.origin, "youtube");
    if (!result.ok) {
      if (result.exhausted) access.trial.remaining = 0;
      applyLock();
      throw new Error(result.error);
    }
    if (!result.unlimited) {
      access.trial = { remaining: result.remaining, limit: result.limit };
      applyLock();
      if (result.remaining === 0) toast("이번이 이번 달 마지막 유튜브 대본 무료 체험입니다.", "info", 8000);
    }
  }

  const isScriptActive = () => el.tabScript.classList.contains("active");

  function showBottomBar() {
    el.scriptActions.classList.toggle("hidden", !isScriptActive() || !Y.full || el.viewScript.classList.contains("locked"));
  }

  function activateScriptTab() {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    document.querySelectorAll(".nav-tab").forEach((tab) => tab.classList.remove("active"));
    document.querySelectorAll(".scroll-area > .view").forEach((view) => view.classList.remove("active"));
    document.querySelectorAll(".bottom-bar").forEach((bar) => bar.classList.add("hidden"));
    el.tabScript.classList.add("active");
    el.viewScript.classList.add("active");
    el.scriptBadge.classList.add("hidden");
    applyLock();
    updateSourceCard();
    checkAccess();
  }

  function leaveScriptTab() {
    el.tabScript.classList.remove("active");
    el.viewScript.classList.remove("active");
    el.scriptActions.classList.add("hidden");
  }

  el.tabScript.addEventListener("click", activateScriptTab);
  [el.tabWork, el.tabDraft, el.tabBlog].forEach((tab) => tab.addEventListener("click", leaveScriptTab));
  document.addEventListener("gw:leave-youtube", leaveScriptTab);

  /* ═════════════ 참조 자료 — 2번 초안(화면에서 고친 내용까지) + 1번 소재 ═════════════ */
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
      source: panel.source || null,
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

  /* ═════════════ 설정 칩 ═════════════ */
  const settingGroups = document.querySelectorAll("[data-yt-setting]");

  function renderSettings() {
    settingGroups.forEach((group) => {
      const key = group.dataset.ytSetting;
      group.querySelectorAll(".chip").forEach((chip) => chip.classList.toggle("active", chip.dataset.value === Y.settings[key]));
    });
  }

  settingGroups.forEach((group) => {
    group.addEventListener("click", (event) => {
      const chip = event.target.closest(".chip[data-value]");
      if (!chip) return;
      Y.settings[group.dataset.ytSetting] = chip.dataset.value;
      renderSettings();
      save();
    });
  });

  function durationText(seconds) {
    if (seconds < 60) return `${seconds}초`;
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}분${sec ? ` ${sec}초` : ""}`;
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
    return { sent: true, platform };
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

  /* AI 가 답하는 중이면 멈출 때까지 기다린다 (최대 2분). ChatGPT 가 아니면 바로 돌아간다. */
  async function waitIdle(tabId) {
    let state = await GWChatGptDirect.imageState(tabId);
    const until = Date.now() + 120000;
    while (state.ok && state.busy && Date.now() < until) {
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
    throw new Error("AI 입력칸에 넣었지만 전송되지 않았습니다. AI 탭에서 전송 버튼을 눌러 준 뒤 [수정 대본 가져오기]를 눌러 주세요.");
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

  /* AI 답변 읽기 — ChatGPT 는 대화 원문 → 복사 버튼 → 화면 순, 못 읽으면 붙여넣기 칸을 연다 */
  async function readAnswer(readOpts, apiBefore = null) {
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

    el.ytPasteBox.classList.remove("hidden");
    el.ytPasteJson.focus();
    throw new Error((response.reason || "AI 답변을 읽지 못했습니다.") + " 대본 쓰기 칸 아래에 JSON 을 직접 붙여넣어 주세요.");
  }

  function parseJson(text) {
    const parsed = GWYoutubeJson.parseObject(text);
    if (!parsed.ok) throw new Error(parsed.reason + " AI 탭에서 'JSON 형식으로 다시 출력해줘'라고 요청한 뒤 다시 눌러 주세요.");
    return parsed;
  }

  /* ═════════════ 대본 쓰기 ═════════════ */
  el.btnMakeScript.addEventListener("click", () =>
    guard(el.btnMakeScript, "대본 작성 요청 중", async () => {
      const source = await getSource();
      if (!source) throw new Error("먼저 2 · 초안 다듬기에 기사를 준비해 주세요.");
      if (Y.full && !confirm("지금 완성 대본을 새 대본으로 바꿉니다. 계속할까요?")) return;
      await useTrial();
      Y.sourceSignature = signatureOf(source);

      /* 대본은 항상 새 대화에서 시작한다. 다른 대화에 섞이면 AI 가 엉뚱한 내용을 이어 쓴다. */
      const prompt = gwBuildYtScriptPrompt({ article: source.article, source: source.source }, Y.settings);
      const result = await sendInNewTab(prompt, source.platform, "대본 요청");
      if (!result.sent) {
        toast(pasteGuide("대본 요청", result.platform) + " 답변이 끝나면 [완성 대본 가져오기]를 누르세요.", "bad", 15000);
        status("붙여넣기 필요", "bad");
        return;
      }
      const duration = GW_YT_DURATION[Y.settings.duration] || GW_YT_DURATION.mid;
      toast(`${duration.label} 대본 작성을 시작했습니다. 다 나오면 [완성 대본 가져오기]를 누르세요.`, "ok", 8000);
      status("대본 작성 중", "busy");
      Y.writing = true;
      showWriting();
      save();
    }, { fail: el.ytFail, failTitle: "대본 작성을 시작하지 못했습니다" })
  );

  function applyFullScript(text) {
    const { data, repaired } = parseJson(text);
    const narration = Array.isArray(data.narration) ? data.narration : [data.narration || data.script || ""];
    /* 인터넷 검색 출처 표시(cite turn…)는 지운다 — 소리 내어 읽으면 안 된다 */
    const clean = (value) => GWArticleJson.stripCitations(value);
    const body = narration.map(clean).filter(Boolean).join("\n\n");
    if (!body) throw new Error("AI 답변에 원고(narration)가 없습니다. 'JSON 형식으로 다시 출력해줘'라고 요청해 주세요.");
    const title = clean(data.title);
    Y.full = {
      title,
      titles: (Array.isArray(data.titles) ? data.titles : [])
        .map(clean)
        .filter((t) => t && t !== title)
        .slice(0, 5),
      text: body,
    };
    Y.writing = false;
    showWriting();
    el.ytPasteBox.classList.add("hidden");
    el.ytPasteJson.value = "";
    renderScript();
    save();
    return repaired;
  }

  function afterScriptPulled(repaired, revised = false) {
    toast(`${repaired ? "AI의 JSON 오류를 복구해 " : ""}${revised ? "수정 대본" : "완성 대본"}을 가져왔습니다. 읽으면 약 ${durationText(gwYtSpeechSeconds(Y.full.text))}`, "ok");
    status(revised ? "대본 갱신됨" : "대본 준비됨", "ok");
    if (!isScriptActive()) el.scriptBadge.classList.remove("hidden");
  }

  el.btnPullScript.addEventListener("click", () =>
    guard(el.btnPullScript, "대본 가져오는 중", async () => {
      const text = await readAnswer({});
      afterScriptPulled(applyFullScript(text));
    }, { cover: el.scriptBody, fail: el.ytFail, failTitle: "대본을 가져오지 못했습니다", retry: el.btnPullScript })
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
      if (!(await aiTabAlive())) {
        Y.aiTabId = null;
        throw new Error("대본을 쓴 AI 탭이 닫혔습니다. [AI 유튜브 대본 작성]으로 새로 만들어 주세요.");
      }
      const prompt = gwBuildYtRevisePrompt(Y.full, request);
      const result = await sendInSameTab(prompt, "수정 요청");
      if (!result.sent) {
        toast(pasteGuide("수정 요청", result.platform) + " 답변이 끝나면 [수정 대본 가져오기]를 누르세요.", "bad", 15000);
        status("붙여넣기 필요", "bad");
        return;
      }
      el.ytReviseInput.value = "";
      GWBusy.label(el.btnReviseScript, "AI가 대본을 수정하는 중");
      if (result.before == null && result.apiBefore == null) {
        toast("대본 수정을 요청했습니다. 답변이 끝나면 [수정 대본 가져오기]를 누르세요.", "info", 9000);
        status("수정 답변 기다리는 중", "busy");
        return;
      }
      toast("대본 수정을 요청했습니다. 새 답변이 끝나면 자동으로 가져옵니다.", "info");
      const text = await readAnswer({ minCount: result.before + 1, maxMs: 240000 }, result.apiBefore);
      afterScriptPulled(applyFullScript(text), true);
    }, { cover: el.scriptBody, failTitle: "수정 대본을 받지 못했습니다", retry: el.btnPullScriptRevised });
  }

  el.btnReviseScript.addEventListener("click", reviseScript);
  el.ytReviseInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") reviseScript();
  });
  el.btnPullScriptRevised.addEventListener("click", () =>
    guard(el.btnPullScriptRevised, "수정 대본 가져오는 중", async () => {
      const text = await readAnswer({});
      afterScriptPulled(applyFullScript(text), true);
    }, { cover: el.scriptBody, failTitle: "수정 대본을 가져오지 못했습니다", retry: el.btnPullScriptRevised })
  );

  /* AI 에 대본을 맡긴 뒤 [완성 대본 가져오기]로 가져올 때까지 띄워 둔다 */
  function showWriting() {
    GWBusy.writing(el.ytWriting, Boolean(Y.writing), "AI가 유튜브 대본을 작성 중입니다", "다 쓰면 이 안내가 꺼집니다. 그때 완성 대본 가져오기를 누르세요");
    /* AI 가 다 쓰면 안내만 끈다 — 가져오기는 [완성 대본 가져오기]로 직접 한다 */
    if (Y.writing) {
      GWBusy.watchAi("youtube", () => Y.aiTabId, () => Y.writing, (why) => {
        Y.writing = false;
        showWriting();
        save();
        status(why === "closed" ? "AI 탭이 닫힘" : "대본 작성 완료", why === "closed" ? "" : "ok");
      });
    }
  }

  function renderScript() {
    const has = Boolean(Y.full);
    el.scriptEmpty.classList.toggle("hidden", has);
    el.scriptBody.classList.toggle("hidden", !has);
    showBottomBar();
    refreshButtons();
    if (!has) return;
    if (document.activeElement !== el.ytTitle) el.ytTitle.value = Y.full.title || "";
    renderTitleIdeas();
    if (document.activeElement !== el.ytFullText) el.ytFullText.value = Y.full.text || "";
    renderFullMeta();
  }

  /* 제목 후보 — 누르면 제목 칸과 바뀐다 (지금 제목은 후보로 내려간다) */
  function renderTitleIdeas() {
    const ideas = (Y.full && Array.isArray(Y.full.titles)) ? Y.full.titles : [];
    el.ytTitleIdeas.classList.toggle("hidden", !ideas.length);
    el.ytTitleIdeas.innerHTML = ideas.length
      ? '<span class="yt-title-ideas-label">제목 후보 · 누르면 바뀝니다</span>' +
        ideas.map((t, i) => `<button type="button" class="yt-title-idea" data-i="${i}">${escapeHtml(t)}</button>`).join("")
      : "";
  }

  el.ytTitleIdeas.addEventListener("click", (event) => {
    const button = event.target.closest(".yt-title-idea");
    if (!button || !Y.full) return;
    const index = Number(button.dataset.i);
    const picked = Y.full.titles[index];
    if (!picked) return;
    Y.full.titles[index] = Y.full.title;
    Y.full.title = picked;
    el.ytTitle.value = picked;
    Y.full.titles = Y.full.titles.filter(Boolean);
    renderTitleIdeas();
    save();
  });

  const escapeHtml = (value) => String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  function renderFullMeta() {
    if (!Y.full) return;
    el.ytFullMeta.textContent =
      `공백 제외 ${gwYtCharCount(Y.full.text).toLocaleString("ko-KR")}자 · 읽으면 약 ${durationText(gwYtSpeechSeconds(Y.full.text))}`;
  }

  el.ytTitle.addEventListener("input", () => {
    if (Y.full) Y.full.title = el.ytTitle.value;
    save();
  });

  el.ytFullText.addEventListener("input", () => {
    if (!Y.full) return;
    Y.full.text = el.ytFullText.value;
    renderFullMeta();
    save();
  });

  /* ═════════════ 복사 · 저장 ═════════════ */
  el.btnCopyNarration.addEventListener("click", async () => {
    const text = String(Y.full?.text || "").trim();
    if (!text) return toast("복사할 원고가 없습니다.", "bad");
    const ok = await copyForPaste(text);
    toast(ok ? "내레이션 원고 전체를 복사했습니다." : "복사하지 못했습니다. 원고를 직접 선택해 복사해 주세요.", ok ? "ok" : "bad");
  });

  const safeName = (value) => String(value || "영상").replace(/[\\/:*?"<>|~.]/g, "-").replace(/\s+/g, " ").trim().slice(0, 40) || "영상";

  /* 메모장에서 한글이 깨지지 않게 BOM 과 윈도 줄바꿈으로 저장한다.
     다운로드 권한 없이 작업창 안에서 링크를 눌러 받는다. */
  el.btnDownloadNarration.addEventListener("click", () => {
    const text = String(Y.full?.text || "").trim();
    if (!text) return toast("저장할 원고가 없습니다.", "bad");
    const blob = new Blob(["﻿" + text.replace(/\r?\n/g, "\r\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeName(Y.full.title)}_내레이션.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    toast(`${link.download} 을 다운로드 폴더에 저장했습니다.`, "ok", 6000);
  });

  /* ═════════════ 버튼 잠금 · 저장 · 복원 ═════════════ */
  function refreshButtons() {
    /* 무료 체험을 다 썼으면 새 대본은 못 만든다 — 이미 만든 대본은 계속 고칠 수 있다 */
    el.btnMakeScript.disabled = !sourceCache || GWTrial.exhausted(access);
    el.btnPullScript.disabled = !Y.aiTabId;
    el.btnReviseScript.disabled = !Y.full || !Y.aiTabId;
    el.btnPullScriptRevised.disabled = !Y.aiTabId;
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
    }
    for (const [key, table] of [["videoType", GW_YT_VIDEO_TYPE], ["duration", GW_YT_DURATION], ["tone", GW_YT_TONE], ["number", GW_YT_NUMBER]]) {
      if (!table[Y.settings[key]]) Y.settings[key] = DEFAULT_SETTINGS[key];
    }
    if (Y.aiTabId && !(await chrome.tabs.get(Y.aiTabId).catch(() => null))) Y.aiTabId = null;
    if (!Y.aiTabId) Y.writing = false; // 대본을 쓰던 AI 탭이 닫혔으면 안내도 내린다

    renderSettings();
    showWriting();
    renderScript();
    await updateSourceCard();
  }

  restore().catch((error) => {
    console.error("[공실뉴스 유튜브] 복원 실패", error);
    refreshButtons();
  });
})();
