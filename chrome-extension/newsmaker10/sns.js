/* ══════════════════════════════════════════════════════════════
   3 · 블로그·SNS — 페이스북 · 인스타그램 · 스레드 (뉴스메이커)

   기사작성기 V30(gongsilwriter30/sns.js)을 옮겨 왔다. 다른 점:
   - 매물 출처(표시·광고 필수 정보) 대신 소재 출처 줄 — 뉴스 원문 언론사 / 국토교통부 실거래가 / 공실뉴스
   - 링크는 [발행한 기사 주소]를 넣으면 그 주소, 아니면 공실뉴스 홈
   - 시세표 그림(kind "chart")은 자르지 않고 흰 여백을 넣어 비율을 맞춘다
   - 무료 체험은 "sns" (뉴스메이커 권한 — shared/trial.js 가 app: newsmaker 로 센다)
   규칙(프롬프트·글 조립·사진 고르기): shared/sns-prompt.js
   ══════════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  const PANEL_STATE_KEY = "gw_panel_state";
  const SNS_STATE_KEY = "gw_sns_state";
  const CHANNELS = GW_SNS_CHANNELS;
  const emptyMedia = () => ({ facebook: [], instagram: [], threads: [] });

  const N = {
    channel: "blog",   // 3번 탭에서 보고 있는 것 — blog · facebook · instagram · threads
    aiTabId: null,
    writing: false,    // AI 에 SNS 글을 맡기고 아직 가져오지 않았다
    sourceSignature: "",
    source: null,      // 글을 만든 순간의 소재 — 출처 줄을 만든다 (이후 1번 탭에서 소재를 바꿔도 섞이지 않는다)
    articleUrl: "",    // 발행한 공실뉴스 기사 주소 (비우면 공실뉴스 홈)
    posts: null,       // { facebook: {body, hashtags}, instagram: {body, hashtags}, threads: {posts, topic} }
    media: emptyMedia(),
    imageStyle: "auto",
    customStyle: "",   // 직접 입력한 화풍 — 있으면 스타일 버튼보다 먼저
    imageRequest: "",
    pendingImage: null, // { channel, requestKey, beforeUrl, beforeCount }
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    tabWork: $("tabWork"), tabDraft: $("tabDraft"), tabBlog: $("tabBlog"), tabScript: $("tabScript"),
    blogBadge: $("blogBadge"),
    viewBlog: $("viewBlog"), viewSns: $("viewSns"),
    blogActions: $("blogActions"), snsActions: $("snsActions"),
    channelBar: $("channelBar"),
    snsLock: $("snsLock"), snsLockTitle: $("snsLockTitle"), snsLockText: $("snsLockText"),
    snsLockLink: $("snsLockLink"), btnSnsLockRetry: $("btnSnsLockRetry"),
    snsSourceEmpty: $("snsSourceEmpty"), snsSourceReady: $("snsSourceReady"), snsSourceTitle: $("snsSourceTitle"),
    snsTrial: $("snsTrial"), snsFail: $("snsFail"), snsWriting: $("snsWriting"),
    btnMakeSns: $("btnMakeSns"), btnPullSns: $("btnPullSns"),
    snsDraftEmpty: $("snsDraftEmpty"), snsDraftBody: $("snsDraftBody"),
    snsBadge: $("snsBadge"), snsCount: $("snsCount"), snsEditor: $("snsEditor"), snsTail: $("snsTail"),
    snsMedia: $("snsMedia"), snsMediaHint: $("snsMediaHint"), snsAiNotice: $("snsAiNotice"),
    snsReviseInput: $("snsReviseInput"), btnReviseSns: $("btnReviseSns"), btnPullSnsRevised: $("btnPullSnsRevised"),
    btnInsertSnsImage: $("btnInsertSnsImage"), snsFileImage: $("snsFileImage"),
    snsImageCustomStyle: $("snsImageCustomStyle"),
    snsImageRequest: $("snsImageRequest"), btnMakeSnsImage: $("btnMakeSnsImage"), snsRatioNote: $("snsRatioNote"),
    snsHomeLink: $("snsHomeLink"), btnCopySns: $("btnCopySns"), snsArticleUrl: $("snsArticleUrl"),
    btnSnsCopyOnly: $("btnSnsCopyOnly"), btnSnsZip: $("btnSnsZip"),
    status: $("statusPill"), toastHost: $("toastHost"),
  };

  let sourceCache = null;
  let replaceIndex = -1;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const isSnsChannel = (channel) => Boolean(CHANNELS[channel]);
  const info = () => CHANNELS[N.channel] || CHANNELS.facebook;

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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

  /* panel.js·blog.js 의 guard 와 같다 — cover(흰 막) · fail/failTitle(빨간 안내 카드) · retry */
  async function guard(button, busyText, job, opts = {}) {
    const original = button.innerHTML;
    const failBox = opts.fail || opts.cover;
    button.disabled = true;
    GWBusy.clearFail(failBox);
    GWBusy.start(button, busyText, opts.cover);
    status(busyText, "busy");
    try {
      await job();
    } catch (error) {
      console.error("[공실뉴스 SNS 작성]", error);
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

  async function askTab(tabId, message) {
    if (!tabId) throw new Error("대상 AI 탭이 없습니다.");
    try {
      const response = await chrome.tabs.sendMessage(tabId, message);
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
      const onUpdated = (id, changed) => {
        if (id === tabId && changed.status === "complete") {
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

  function showWriting() {
    GWBusy.writing(el.snsWriting, Boolean(N.writing), "AI가 SNS 글 3종을 작성 중입니다", "다 쓰면 이 안내가 꺼집니다. 그때 완성 글 가져오기를 누르세요");
    if (N.writing) {
      GWBusy.watchAi("sns", () => N.aiTabId, () => N.writing, (why) => {
        N.writing = false;
        showWriting();
        save();
        status(why === "closed" ? "AI 탭이 닫힘" : "SNS 글 작성 완료", why === "closed" ? "" : "ok");
      });
    }
  }

  /* ═════════════ 선택 줄 · 화면 전환 ═════════════ */
  const channelButtons = el.channelBar.querySelectorAll(".channel-btn[data-channel]");

  function isSnsActive() {
    return el.tabBlog.classList.contains("active") && el.viewSns.classList.contains("active");
  }

  function paintChannelButtons() {
    channelButtons.forEach((button) => button.classList.toggle("active", button.dataset.channel === N.channel));
  }

  function showSns() {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    el.viewBlog.classList.remove("active");
    el.blogActions.classList.add("hidden");
    el.viewSns.classList.add("active");
    el.blogBadge.classList.add("hidden");
    applyLock();
    renderSns();
    updateSourceCard();
    checkAccess().then(() => applyLock());
  }

  function hideSns() {
    el.viewSns.classList.remove("active");
    el.snsActions.classList.add("hidden");
  }

  /* blog.js 가 먼저 블로그 화면을 연다. SNS 를 보고 있었으면 이어서 SNS 로 바꾼다. */
  el.tabBlog.addEventListener("click", () => {
    el.channelBar.classList.remove("hidden");
    paintChannelButtons();
    if (isSnsChannel(N.channel)) showSns();
    else hideSns();
  });

  [el.tabWork, el.tabDraft, el.tabScript].forEach((tab) => tab.addEventListener("click", () => {
    el.channelBar.classList.add("hidden");
    hideSns();
  }));

  channelButtons.forEach((button) => {
    button.addEventListener("click", () => {
      harvest();
      N.channel = button.dataset.channel;
      save();
      if (N.channel === "blog") {
        hideSns();
        el.tabBlog.click(); // 블로그 화면은 blog.js 가 연다
      } else {
        paintChannelButtons();
        showSns();
      }
    });
  });

  /* ═════════════ 회원 · 무료 체험 (블로그와 같은 방식, 기능 이름만 "sns") ═════════════ */
  let access = null;

  async function siteOrigin() {
    return GWNaverBlog.SITE_URL;
  }

  async function checkAccess() {
    const origin = await siteOrigin();
    try {
      const response = await fetch(`${origin}/api/extension/auth/me`, { credentials: "include", cache: "no-store" });
      access = GWTrial.accessFrom(await response.json(), "sns", origin);
    } catch (_) {
      access = { origin, canUse: false, isLoggedIn: false, error: true };
    }
    return access;
  }

  function applyLock() {
    const locked = !access?.canUse;
    el.viewSns.classList.toggle("locked", locked);
    el.snsLock.classList.toggle("hidden", !locked);
    GWTrial.render(el.snsTrial, locked ? null : access, "SNS 작성");
    el.snsActions.classList.toggle("hidden", locked || !N.posts || !isSnsActive());
    refreshButtons();
    if (!locked) return;
    if (!access) {
      el.snsLockTitle.textContent = "회원 정보를 확인하는 중입니다";
      el.snsLockText.textContent = "잠시만 기다려 주세요.";
      el.snsLockLink.classList.add("hidden");
      return;
    }
    const origin = access.origin || GWNaverBlog.SITE_URL;
    if (access.error) {
      el.snsLockTitle.textContent = "회원 정보를 확인하지 못했습니다";
      el.snsLockText.textContent = "인터넷 연결을 확인한 뒤 [다시 확인]을 눌러 주세요.";
      el.snsLockLink.classList.add("hidden");
    } else if (!access.isLoggedIn) {
      el.snsLockTitle.textContent = "공실뉴스에 로그인하면 무료로 체험할 수 있습니다";
      el.snsLockText.textContent = "SNS 작성은 공실뉴스 회원이면 매월 3번 무료로 체험할 수 있고, 공실뉴스부동산·공실스터디부동산 회원은 무제한입니다. 이 브라우저에서 공실뉴스에 로그인한 뒤 [다시 확인]을 눌러 주세요.";
      el.snsLockLink.textContent = "공실뉴스 열기";
      el.snsLockLink.href = `${origin}/`;
      el.snsLockLink.classList.remove("hidden");
    } else {
      el.snsLockTitle.textContent = "무료 체험 횟수를 확인하지 못했습니다";
      el.snsLockText.textContent = `${access.name}님은 현재 ${access.planLabel || "무료"} 등급입니다. ` +
        "잠시 뒤 [다시 확인]을 눌러 주세요. 공실뉴스부동산·공실스터디부동산 회원은 무제한으로 쓸 수 있습니다.";
      el.snsLockLink.textContent = "공실스터디 알아보기";
      el.snsLockLink.href = `${origin}/study`;
      el.snsLockLink.classList.remove("hidden");
    }
  }

  el.btnSnsLockRetry.addEventListener("click", async () => {
    el.btnSnsLockRetry.disabled = true;
    await checkAccess();
    applyLock();
    el.btnSnsLockRetry.disabled = false;
    if (access?.canUse) toast("SNS 작성을 사용할 수 있습니다.", "ok");
  });

  async function useTrial() {
    if (!access) await checkAccess();
    if (!access?.canUse) throw new Error("SNS 작성을 쓸 수 없습니다. 탭 위의 안내를 확인해 주세요.");
    if (access.unlimited) return;
    const result = await GWTrial.consume(access.origin, "sns");
    if (!result.ok) {
      if (result.exhausted && access.trial) access.trial.remaining = 0;
      applyLock();
      throw new Error(result.error);
    }
    if (!result.unlimited) {
      access.trial = { remaining: result.remaining, limit: result.limit };
      applyLock();
      if (result.remaining === 0) toast("이번이 이번 달 마지막 SNS 무료 체험입니다.", "info", 8000);
    }
  }

  /* ═════════════ 참조 자료 — 2번 초안(화면에서 고친 내용까지) ═════════════ */
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
      media: Array.isArray(panel.media) ? panel.media : [],
      platform: panel.platform === "gemini" ? "gemini" : "chatgpt",
    };
  }

  const signatureOf = (source) => (source ? [source.article.title, source.article.body].join("\n") : "");

  async function updateSourceCard() {
    sourceCache = await getSource();
    const ready = Boolean(sourceCache);
    el.snsSourceEmpty.classList.toggle("hidden", ready);
    el.snsSourceReady.classList.toggle("hidden", !ready);
    el.snsSourceTitle.textContent = ready ? sourceCache.article.title : "-";
    refreshButtons();
  }

  /* ═════════════ AI 에 요청 · 가져오기 ═════════════ */
  const aiConfig = (platform) => (platform === "gemini" ? GW.GEMINI : GW.CHATGPT);

  el.btnMakeSns.addEventListener("click", () =>
    guard(el.btnMakeSns, "SNS 글 작성 요청 중", async () => {
      const source = await getSource();
      if (!source) throw new Error("먼저 2 · 초안 다듬기에 기사를 준비해 주세요.");
      await useTrial();

      const signature = signatureOf(source);
      if (N.sourceSignature !== signature) {
        N.posts = null;
        N.media = seedMedia(source.media);
        N.pendingImage = null;
        N.sourceSignature = signature;
      }
      N.source = source.source || null;
      renderSns();

      const config = aiConfig(source.platform);
      const tab = await chrome.tabs.create({ url: config.URL, active: true });
      N.aiTabId = tab.id;
      await save();
      refreshButtons();

      await waitTabReady(tab.id);
      await sleep(1200);
      const filled = await askTab(tab.id, { type: "GW_FILL", text: gwBuildSnsPrompt(source) });
      if (!filled.ok) throw new Error(filled.reason || "SNS 작성 지시를 넣지 못했습니다.");
      const submitted = await askTab(tab.id, { type: "GW_SUBMIT" });
      if (!submitted.ok) throw new Error(submitted.reason || "AI 전송 버튼을 누르지 못했습니다.");

      toast("페이스북·인스타그램·스레드 글 작성을 시작했습니다. 다 나오면 [완성 글 가져오기]를 누르세요.", "ok", 8000);
      status("SNS 글 작성 중", "busy");
      N.writing = true;
      showWriting();
      save();
    }, { fail: el.snsFail, failTitle: "SNS 글 작성을 시작하지 못했습니다" })
  );

  function seedMedia(sourceMedia) {
    const media = emptyMedia();
    GW_SNS_ORDER.forEach((channel) => { media[channel] = gwSnsPickMedia(channel, sourceMedia); });
    return media;
  }

  async function readAnswer(readOpts = {}) {
    if (!N.aiTabId) throw new Error("먼저 [AI SNS 3종 작성]을 눌러 주세요.");
    const onStage = (stage) => status(`SNS 글 읽는 중 (${stage})`, "busy");
    let text = readOpts.minCount ? "" : await GWChatGptDirect.read(N.aiTabId, onStage);
    if (!text) {
      const response = await askTab(N.aiTabId, { type: "GW_READ", ...readOpts });
      if (response.ok) text = response.text;
      else if (response.unreadable) text = await GWChatGptDirect.read(N.aiTabId, onStage);
      if (!text) {
        throw new Error((response.reason || "AI 응답을 읽지 못했습니다.") +
          " 답변이 다 끝났는지 확인하고 AI 탭을 새로고침(F5)한 뒤 다시 눌러 주세요.");
      }
    }
    return text;
  }

  /* AI 답변 → SNS 글. only 를 주면 그 플랫폼만 바꾼다 (수정 요청). JSON 을 고쳐 읽었으면 true */
  async function applySnsText(text, only = null) {
    const parsed = gwSnsParse(text);
    if (!parsed.ok) throw new Error(parsed.reason + " AI 탭에서 'JSON 형식으로 다시 출력해줘'라고 요청한 뒤 다시 눌러 주세요.");
    const next = { ...(N.posts || {}) };
    if (only) {
      if (!parsed.posts[only]) throw new Error(`답변에 ${CHANNELS[only].label} 글이 없습니다. AI 답변이 끝났는지 확인해 주세요.`);
      next[only] = parsed.posts[only];
    } else {
      Object.assign(next, parsed.posts);
    }
    N.posts = next;
    N.writing = false;
    showWriting();
    if (!GW_SNS_ORDER.some((channel) => N.media[channel]?.length) && sourceCache) N.media = seedMedia(sourceCache.media);
    if (!isSnsChannel(N.channel)) N.channel = "facebook";
    renderSns();
    window.GWArrival?.notify(el.snsDraftBody.querySelector(".preview-doc"), el.viewSns);
    await save();
    return parsed.repaired === true;
  }

  el.btnPullSns.addEventListener("click", () =>
    guard(el.btnPullSns, "SNS 글 가져오는 중", async () => {
      const repaired = await applySnsText(await readAnswer());
      const missing = GW_SNS_ORDER.filter((channel) => !N.posts?.[channel]).map((channel) => CHANNELS[channel].label);
      toast((repaired ? "AI의 JSON 오류를 복구해 " : "") + "SNS 글을 가져왔습니다." +
        (missing.length ? ` (${missing.join("·")} 글은 답변에 없었습니다)` : ""), missing.length ? "info" : "ok", 7000);
      status("SNS 글 준비됨", "ok");
      if (!isSnsActive()) el.blogBadge.classList.remove("hidden");
      paintChannelButtons();
    }, { cover: el.snsDraftBody, fail: el.snsFail, failTitle: "SNS 글을 가져오지 못했습니다", retry: el.btnPullSns })
  );

  /* ── 수정 요청: 지금 보는 플랫폼만 ── */
  function reviseSns() {
    const request = el.snsReviseInput.value.trim();
    if (!request) {
      toast(`${info().label} 글에서 고칠 점을 적어 주세요.`, "bad");
      return;
    }
    const channel = N.channel;
    guard(el.btnReviseSns, "수정 요청 중", async () => {
      if (!N.aiTabId || !(await chrome.tabs.get(N.aiTabId).catch(() => null))) {
        N.aiTabId = null;
        throw new Error("SNS 글을 쓴 AI 탭이 닫혔습니다. [AI SNS 3종 작성]으로 새로 만들어 주세요.");
      }
      harvest();
      await save();
      await chrome.tabs.update(N.aiTabId, { active: true });
      const api = await GWChatGptDirect.waitIdle(N.aiTabId, () => status("AI 답변이 끝나길 기다리는 중", "busy"));
      const before = await askTab(N.aiTabId, { type: "GW_COUNT" }).catch(() => null);

      const filled = await askTab(N.aiTabId, { type: "GW_FILL", text: gwBuildSnsRevisePrompt(channel, request) });
      if (!filled.ok) throw new Error(filled.reason || "수정 요청을 넣지 못했습니다.");
      const submitted = await askTab(N.aiTabId, { type: "GW_SUBMIT" });
      if (!submitted.ok) throw new Error(submitted.reason || "수정 요청을 전송하지 못했습니다.");

      el.snsReviseInput.value = "";
      GWBusy.label(el.btnReviseSns, `AI가 ${CHANNELS[channel].label} 글을 수정하는 중`);
      status("AI가 SNS 글을 수정하는 중", "busy");

      if (api.ok) {
        const answer = await GWChatGptDirect.waitNewAnswer(N.aiTabId, api.messageCount, 240000);
        if (answer) {
          await applySnsText(answer, channel);
          toast(`수정된 ${CHANNELS[channel].label} 글을 가져왔습니다.`, "ok");
          status("SNS 글 갱신됨", "ok");
          return;
        }
        if (!(await chrome.tabs.get(N.aiTabId).catch(() => null))) throw new Error("AI 탭이 닫혀 수정 글을 받지 못했습니다.");
      }
      if (!before?.ok) {
        toast("수정을 요청했습니다. AI 답변이 끝나면 [수정글 가져오기]를 눌러 주세요.", "info", 9000);
        status("수정 답변 기다리는 중", "busy");
        return;
      }
      toast("수정을 요청했습니다. 새 답변이 끝나면 자동으로 가져옵니다.", "info");
      await applySnsText(await readAnswer({ minCount: before.count + 1, maxMs: 180000 }), channel);
      toast(`수정된 ${CHANNELS[channel].label} 글을 가져왔습니다.`, "ok");
      status("SNS 글 갱신됨", "ok");
    }, { cover: el.snsDraftBody, failTitle: "수정 글을 받지 못했습니다", retry: el.btnPullSnsRevised });
  }

  el.btnReviseSns.addEventListener("click", reviseSns);
  el.snsReviseInput.addEventListener("keydown", (event) => { if (event.key === "Enter") reviseSns(); });
  el.btnPullSnsRevised.addEventListener("click", () =>
    guard(el.btnPullSnsRevised, "수정글 가져오는 중", async () => {
      await applySnsText(await readAnswer(), N.channel);
      toast(`수정된 ${info().label} 글을 가져왔습니다.`, "ok");
      status("SNS 글 갱신됨", "ok");
    }, { cover: el.snsDraftBody, failTitle: "수정 글을 가져오지 못했습니다", retry: el.btnPullSnsRevised })
  );

  /* ═════════════ 화면 그리기 ═════════════ */
  function ctx() {
    return { url: N.articleUrl || GW_SNS_HOME, credit: gwSnsCredit(N.source) };
  }

  function renderSns() {
    if (!isSnsChannel(N.channel)) return;
    const channel = N.channel;
    const c = info();
    el.snsActions.dataset.channel = channel;
    el.snsBadge.dataset.channel = channel;
    el.snsBadge.textContent = c.badge;
    el.snsHomeLink.href = c.homeUrl;
    el.snsHomeLink.textContent = `${c.label} 바로가기`;
    el.snsRatioNote.textContent = `— ${c.label}: ${channel === "threads" ? "가로 16:9" : c.ratioText}`;

    const post = N.posts?.[channel];
    el.snsDraftEmpty.classList.toggle("hidden", Boolean(N.posts));
    el.snsDraftBody.classList.toggle("hidden", !N.posts);
    el.snsActions.classList.toggle("hidden", !N.posts || !isSnsActive() || el.viewSns.classList.contains("locked"));
    if (!N.posts) {
      refreshButtons();
      return;
    }

    if (!post) {
      el.snsEditor.innerHTML = `<div class="sns-media-empty">답변에 ${c.label} 글이 없습니다. 수정 요청 칸에 "${c.label} 글도 써 줘"라고 적어 보세요.</div>`;
    } else if (channel === "threads") {
      el.snsEditor.innerHTML = post.posts.map((text, index) => (
        `<div class="sns-field">` +
        `<div class="sns-field-head"><b>${index === 0 ? "첫 글" : `이어 쓰기 ${index}`}</b>` +
        `<span><span class="sns-count" data-count-for="${index}"></span> ` +
        `<button type="button" class="sns-mini" data-sns-act="copy-post" data-i="${index}">복사</button>` +
        (index > 0 ? ` <button type="button" class="sns-mini" data-sns-act="drop-post" data-i="${index}">삭제</button>` : "") +
        `</span></div>` +
        `<textarea class="sns-text" data-post="${index}" rows="2" spellcheck="false">${esc(text)}</textarea>` +
        `</div>`
      )).join("") +
        `<div class="sns-field"><div class="sns-field-head"><b>주제 태그 (1개)</b>` +
        (post.posts.length < 3 ? `<button type="button" class="sns-mini" data-sns-act="add-post">+ 이어 쓰기 추가</button>` : "") +
        `</div><input class="sns-tags" data-topic="1" value="${esc(post.topic ? `#${post.topic}` : "")}" placeholder="#양재역사무실"></div>`;
    } else {
      el.snsEditor.innerHTML =
        `<div class="sns-field"><div class="sns-field-head"><b>${channel === "instagram" ? "캡션" : "본문"}</b></div>` +
        `<textarea class="sns-text" data-body="1" rows="3" spellcheck="false">${esc(post.body)}</textarea></div>` +
        `<div class="sns-field"><div class="sns-field-head"><b>해시태그 (${channel === "instagram" ? "8~12개 권장, 최대 30개" : "3~5개"})</b></div>` +
        `<input class="sns-tags" data-tags="1" value="${esc((post.hashtags || []).map((tag) => `#${tag}`).join(" "))}" placeholder="#지역 #매물종류"></div>`;
    }
    autosize();
    renderTail();
    renderMedia();
    refreshButtons();
  }

  function autosize() {
    el.snsEditor.querySelectorAll("textarea.sns-text").forEach((area) => {
      area.style.height = "auto";
      area.style.height = `${Math.min(520, area.scrollHeight + 2)}px`;
    });
  }

  /* 글 끝에 코드가 붙이는 것 + 글자 수 */
  function renderTail() {
    if (!isSnsChannel(N.channel) || !N.posts?.[N.channel]) {
      el.snsTail.textContent = "";
      el.snsCount.textContent = "";
      return;
    }
    const channel = N.channel;
    const c = info();
    const post = N.posts[channel];
    const composed = gwSnsCompose(channel, post, ctx());

    if (channel === "threads") {
      const first = gwSnsCompose("threads", { posts: post.posts, topic: "" }, ctx());
      const lastAi = post.posts[post.posts.length - 1] || "";
      const lastOut = first.posts[post.posts.length - 1] || "";
      const tail = first.posts.length > post.posts.length ? first.posts[first.posts.length - 1] : lastOut.slice(lastAi.length).trim();
      el.snsTail.textContent = tail +
        (first.posts.length > post.posts.length ? "\n\n→ 마지막 글이 길어 위 내용은 새 이어 쓰기 글로 나뉩니다." : "");
      const over = composed.posts.filter((text) => text.length > c.maxChars).length;
      el.snsCount.textContent = `글 ${composed.posts.length}개 · 글마다 ${c.maxChars}자 이내` + (over ? ` · ${over}개 초과` : "");
      el.snsCount.classList.toggle("over", over > 0);
      composed.posts.forEach((text, index) => {
        const badge = el.snsEditor.querySelector(`[data-count-for="${index}"]`);
        if (!badge) return;
        badge.textContent = `${text.length}/${c.maxChars}`;
        badge.classList.toggle("over", text.length > c.maxChars);
        el.snsEditor.querySelector(`textarea[data-post="${index}"]`)?.classList.toggle("over", text.length > c.maxChars);
      });
      return;
    }

    const body = String(post.body || "").trim();
    el.snsTail.textContent = composed.text.slice(body.length).trim();
    const length = composed.text.length;
    const tags = (post.hashtags || []).length;
    const over = (c.maxChars && length > c.maxChars) || tags > c.maxTags;
    el.snsCount.textContent = c.maxChars
      ? `${length.toLocaleString()}/${c.maxChars.toLocaleString()}자 · 태그 ${tags}/${c.maxTags}`
      : `${length.toLocaleString()}자 · 태그 ${tags}개`;
    el.snsCount.classList.toggle("over", Boolean(over));
  }

  /* 편집 → 상태 */
  function harvest() {
    if (!isSnsChannel(N.channel) || !N.posts?.[N.channel]) return;
    const post = N.posts[N.channel];
    if (N.channel === "threads") {
      const areas = el.snsEditor.querySelectorAll("textarea[data-post]");
      if (areas.length) post.posts = Array.from(areas).map((area) => area.value.trim()).filter(Boolean);
      if (!post.posts.length) post.posts = [""];
      const topic = el.snsEditor.querySelector("input[data-topic]");
      if (topic) post.topic = gwSnsCleanTags([topic.value.split(/\s+/)[0]], 1)[0] || "";
      return;
    }
    const body = el.snsEditor.querySelector("textarea[data-body]");
    if (body) post.body = body.value.trim();
    const tags = el.snsEditor.querySelector("input[data-tags]");
    if (tags) post.hashtags = gwSnsCleanTags(tags.value.split(/[\s,]+/), info().maxTags);
  }

  el.snsEditor.addEventListener("input", (event) => {
    harvest();
    if (event.target.matches("textarea")) {
      event.target.style.height = "auto";
      event.target.style.height = `${Math.min(520, event.target.scrollHeight + 2)}px`;
    }
    renderTail();
  });
  el.snsEditor.addEventListener("change", () => { harvest(); save(); });

  el.snsEditor.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-sns-act]");
    if (!button || N.channel !== "threads" || !N.posts?.threads) return;
    harvest();
    const index = Number(button.dataset.i);
    const post = N.posts.threads;
    if (button.dataset.snsAct === "copy-post") {
      const composed = gwSnsCompose("threads", post, ctx());
      await copyText(composed.posts[index] || "");
      toast(`${index === 0 ? "첫 글" : `이어 쓰기 ${index}`}을 복사했습니다.`, "ok");
      return;
    }
    if (button.dataset.snsAct === "add-post" && post.posts.length < 3) post.posts.push("");
    if (button.dataset.snsAct === "drop-post" && index > 0) post.posts.splice(index, 1);
    renderSns();
    save();
  });

  /* ── 사진 ── */
  function renderMedia() {
    const channel = N.channel;
    const c = info();
    const list = N.media[channel] || [];
    const ratioClass = c.ratio === 1 ? "r-1" : c.ratio ? "r-45" : "r-0";
    el.snsMediaHint.textContent = `${c.ratioText} · 최대 ${c.maxMedia}장 · 1번이 대표` +
      (channel === "instagram" ? " · 사진 필수" : " · 없어도 됩니다");
    const aiNote = gwSnsAiLabelNote(channel, list);
    el.snsAiNotice.classList.toggle("hidden", !aiNote);
    el.snsAiNotice.textContent = aiNote ? `🤖 ${aiNote}` : "";
    if (!list.length) {
      el.snsMedia.innerHTML = `<div class="sns-media-empty">사진이 없습니다. 아래 [🖼️ 이미지 삽입]이나 [🎨 AI 이미지 만들기]로 넣어 주세요.</div>`;
      return;
    }
    el.snsMedia.innerHTML = list.map((item, index) => (
      `<figure class="sns-fig ${ratioClass}">` +
      `<img src="${esc(item.url)}" alt="">` +
      `<span class="sns-fig-no${index === 0 ? " lead" : ""}">${index === 0 ? "1 대표" : index + 1}</span>` +
      (item.ai ? '<span class="sns-fig-ai">AI</span>' : "") +
      `<div class="sns-fig-tools">` +
      `<button type="button" data-media-act="left" data-i="${index}" ${index === 0 ? "disabled" : ""} title="앞으로">◀</button>` +
      `<button type="button" data-media-act="right" data-i="${index}" ${index === list.length - 1 ? "disabled" : ""} title="뒤로">▶</button>` +
      `<button type="button" data-media-act="replace" data-i="${index}" title="내 PC 사진으로 바꾸기">바꾸기</button>` +
      `<button type="button" class="del" data-media-act="remove" data-i="${index}" title="이 플랫폼에서 빼기">✕</button>` +
      `</div></figure>`
    )).join("");
  }

  el.snsMedia.addEventListener("click", (event) => {
    const button = event.target.closest("[data-media-act]");
    if (!button) return;
    const list = N.media[N.channel] || [];
    const index = Number(button.dataset.i);
    const action = button.dataset.mediaAct;
    if (!list[index]) return;
    if (action === "left" || action === "right") {
      const target = action === "left" ? index - 1 : index + 1;
      if (target < 0 || target >= list.length) return;
      const next = list.slice();
      [next[index], next[target]] = [next[target], next[index]];
      if (!gwSnsCanLead(next, 0)) {
        toast("실제 매물 사진이 있으면 AI 이미지를 대표(1번)로 쓸 수 없습니다.", "bad", 6000);
        return;
      }
      N.media[N.channel] = next;
    } else if (action === "remove") {
      const next = list.filter((_, i) => i !== index);
      if (!gwSnsCanLead(next, 0)) {
        toast("대표 사진을 빼면 AI 이미지가 1번이 됩니다. 실제 사진을 먼저 1번으로 옮겨 주세요.", "bad", 6000);
        return;
      }
      N.media[N.channel] = next;
    } else if (action === "replace") {
      replaceIndex = index;
      el.snsFileImage.click();
      return;
    }
    renderMedia();
    save();
  });

  el.btnInsertSnsImage.addEventListener("click", () => {
    if ((N.media[N.channel] || []).length >= info().maxMedia) {
      toast(`${info().label} 사진은 최대 ${info().maxMedia}장입니다. 하나를 뺀 뒤 넣어 주세요.`, "bad");
      return;
    }
    replaceIndex = -1;
    el.snsFileImage.click();
  });

  el.snsFileImage.addEventListener("change", () => {
    const file = el.snsFileImage.files?.[0];
    el.snsFileImage.value = "";
    if (!file) return;
    const target = replaceIndex;
    replaceIndex = -1;
    const reader = new FileReader();
    reader.onload = () => {
      const list = N.media[N.channel] || (N.media[N.channel] = []);
      const item = { url: reader.result, kind: "upload", caption: "", ai: false };
      if (target >= 0 && list[target]) {
        list[target] = item;
        toast("사진을 바꿨습니다.", "ok");
      } else {
        list.push(item);
        toast(`${info().label} 사진에 넣었습니다.`, "ok");
      }
      renderMedia();
      save();
    };
    reader.onerror = () => toast("이미지를 읽지 못했습니다.", "bad");
    reader.readAsDataURL(file);
  });

  /* ── AI 이미지 — 블로그와 같은 흐름, 플랫폼 비율로 요청 ── */
  const imageStyleButtons = document.querySelectorAll(".sns-image-style[data-sns-image-style]");
  imageStyleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      imageStyleButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      N.imageStyle = button.dataset.snsImageStyle;
      N.customStyle = "";
      if (el.snsImageCustomStyle) {
        el.snsImageCustomStyle.value = "";
        el.snsImageCustomStyle.classList.remove("active");
      }
      save();
    });
  });
  /* 화풍 직접 입력 — 쓰면 스타일 버튼 선택이 풀리고, 지우면 버튼 선택으로 돌아간다 (V30 과 같다) */
  if (el.snsImageCustomStyle) {
    ["input", "change"].forEach((evt) => {
      el.snsImageCustomStyle.addEventListener(evt, () => {
        N.customStyle = el.snsImageCustomStyle.value.trim();
        const hasCustom = Boolean(N.customStyle);
        el.snsImageCustomStyle.classList.toggle("active", hasCustom);
        imageStyleButtons.forEach((item) => item.classList.toggle("active", !hasCustom && item.dataset.snsImageStyle === N.imageStyle));
        save();
      });
    });
  }

  el.snsImageRequest.addEventListener("change", () => {
    N.imageRequest = el.snsImageRequest.value.trim();
    save();
  });

  el.btnMakeSnsImage.addEventListener("click", () =>
    guard(el.btnMakeSnsImage, "이미지 요청 중", async () => {
      if (!N.posts) throw new Error("먼저 SNS 글을 만들어 주세요.");
      if (!N.aiTabId) throw new Error("SNS 글을 만든 AI 탭이 없습니다.");
      harvest();
      const channel = N.channel;
      N.imageRequest = el.snsImageRequest.value.trim();
      N.customStyle = el.snsImageCustomStyle ? el.snsImageCustomStyle.value.trim() : "";
      const requestKey = JSON.stringify([channel, N.imageStyle, N.customStyle, N.imageRequest]);

      if (N.pendingImage && N.pendingImage.requestKey === requestKey) {
        const found = await askTab(N.aiTabId, { type: "GW_GET_IMAGE" });
        const list = N.media[channel] || (N.media[channel] = []);
        const isNew = found.ok && found.url &&
          (found.url !== N.pendingImage.beforeUrl || Number(found.count || 0) > N.pendingImage.beforeCount) &&
          !list.some((item) => item.url === found.url);
        if (isNew) {
          list.push({ url: found.url, kind: "ai", caption: "AI 생성 이미지", ai: true });
          N.pendingImage = null;
          renderMedia();
          save();
          toast(`AI 이미지를 ${CHANNELS[channel].label} 사진에 넣었습니다.`, "ok");
          status("SNS 이미지 추가됨", "ok");
          return;
        }
        toast("AI 이미지가 아직 만들어지는 중입니다. 완성된 뒤 다시 눌러 주세요.", "info", 6000);
        status("이미지 생성 중", "busy");
        return;
      }

      if ((N.media[channel] || []).length >= CHANNELS[channel].maxMedia) {
        throw new Error(`${CHANNELS[channel].label} 사진은 최대 ${CHANNELS[channel].maxMedia}장입니다. 하나를 뺀 뒤 다시 눌러 주세요.`);
      }
      const source = await getSource();
      const post = N.posts[channel];
      const body = channel === "threads" ? (post?.posts || []).join("\n") : post?.body || "";
      const before = await askTab(N.aiTabId, { type: "GW_GET_IMAGE" }).catch(() => null);
      await chrome.tabs.update(N.aiTabId, { active: true });
      const filled = await askTab(N.aiTabId, {
        type: "GW_FILL",
        text: gwBuildImagePrompt(source?.source || N.source, { title: source?.article?.title || "", body }, {
          style: N.imageStyle,
          customStyle: N.customStyle,
          request: N.imageRequest,
          ratio: channel === "threads" ? "가로 16:9" : CHANNELS[channel].ratioText,
        }),
      });
      if (!filled.ok) throw new Error(filled.reason || "이미지 요청을 넣지 못했습니다.");
      const submitted = await askTab(N.aiTabId, { type: "GW_SUBMIT" });
      if (!submitted.ok) throw new Error(submitted.reason || "이미지 요청을 전송하지 못했습니다.");
      N.pendingImage = {
        channel,
        requestKey,
        beforeUrl: before?.ok ? before.url : "",
        beforeCount: before?.ok ? Number(before.count || 0) : 0,
      };
      await save();
      const style = GW_IMAGE_STYLE[N.imageStyle] || GW_IMAGE_STYLE.news;
      toast(`${style.label} 이미지를 요청했습니다. 완성된 뒤 이 버튼을 한 번 더 누르세요.`, "info", 8000);
      status("이미지 생성 중", "busy");
    })
  );

  /* ═════════════ 복사 · 사진 내려받기 ═════════════ */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      /* 작업창에 초점이 없으면 막힌다 — 숨은 칸으로 한 번 더 */
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      if (!ok) throw new Error("클립보드에 복사하지 못했습니다. 작업창을 한 번 클릭한 뒤 다시 눌러 주세요.");
    }
  }

  /* 비율대로 가운데를 잘라 JPG 로 — ratio 0 이면 원본 비율 그대로 크기만 줄인다.
     시세표 그림(chart)은 자르면 표가 잘리므로 흰 여백을 넣어 통째로 맞춘다 */
  async function cropForChannel(item, channel) {
    const url = item.url;
    const c = CHANNELS[channel];
    const dataUrl = await gwImageToDataUrl(url, 2400);
    if (!dataUrl) return null;
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("사진을 읽지 못했습니다."));
      img.src = dataUrl;
    }).catch(() => null);
    if (!image) return null;
    let sx = 0;
    let sy = 0;
    let sw = image.naturalWidth;
    let sh = image.naturalHeight;
    let width;
    let height;
    if (c.ratio && item.kind === "chart") {
      [width, height] = c.size;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const g = canvas.getContext("2d");
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, width, height);
      const scale = Math.min(width / sw, height / sh);
      const dw = Math.round(sw * scale);
      const dh = Math.round(sh * scale);
      g.drawImage(image, 0, 0, sw, sh, Math.round((width - dw) / 2), Math.round((height - dh) / 2), dw, dh);
      return canvas.toDataURL("image/jpeg", 0.92);
    }
    if (c.ratio) {
      if (sw / sh > c.ratio) {
        const w = Math.round(sh * c.ratio);
        sx = Math.round((sw - w) / 2);
        sw = w;
      } else {
        const h = Math.round(sw / c.ratio);
        sy = Math.round((sh - h) / 2);
        sh = h;
      }
      [width, height] = c.size;
    } else {
      const scale = Math.min(1, c.size[0] / Math.max(sw, sh));
      width = Math.round(sw * scale);
      height = Math.round(sh * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const g = canvas.getContext("2d");
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, width, height);
    g.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.92);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  /* 지금 플랫폼의 완성 글 — 링크·출처·해시태그까지 붙인 것 */
  async function prepare() {
    const channel = N.channel;
    const c = CHANNELS[channel];
    harvest();
    const post = N.posts?.[channel];
    if (!post) throw new Error(`${c.label} 글이 없습니다.`);
    renderTail();
    const composed = gwSnsCompose(channel, post, ctx());
    if (!composed.text) throw new Error(`${c.label} 글이 비어 있습니다.`);
    const over = channel === "threads"
      ? composed.posts.some((text) => text.length > c.maxChars)
      : Boolean(c.maxChars && composed.text.length > c.maxChars);
    return { channel, c, composed, over };
  }

  /* 버튼에 잠깐 "✓ 복사됨" — 눌렀는데 된 건지 모르겠다는 말이 있었다 */
  function flash(button, text) {
    const original = button.dataset.label || button.innerHTML;
    button.dataset.label = original;
    button.innerHTML = text;
    button.classList.add("done");
    clearTimeout(button._flashTimer);
    button._flashTimer = setTimeout(() => {
      button.innerHTML = button.dataset.label;
      button.classList.remove("done");
      delete button.dataset.label;
    }, 2500);
  }

  const stamp = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  };

  /* 사진(비율대로 자른 JPG) + 글.txt 를 ZIP 하나로 — 압축을 풀면 폴더 하나가 나온다 */
  async function downloadPackage({ channel, c, composed }, button) {
    const folder = `공실뉴스_${c.label}_${stamp()}`;
    const files = [];
    const textForFile = channel === "threads"
      ? composed.posts.map((text, i) => `[${i === 0 ? "첫 글" : `이어 쓰기 ${i}`}]\n${text}`).join("\n\n―――――――――――\n\n")
      : composed.text;
    files.push({ name: `${folder}/${c.label}_글.txt`, data: GWZip.textBytes(textForFile) });

    const list = (N.media[channel] || []).slice(0, c.maxMedia);
    let saved = 0;
    for (let i = 0; i < list.length; i += 1) {
      GWBusy.label(button, `사진 준비 중 (${i + 1}/${list.length})`);
      const dataUrl = await cropForChannel(list[i], channel);
      if (!dataUrl) continue;
      const no = String(i + 1).padStart(2, "0");
      files.push({ name: `${folder}/${no}${i === 0 ? "_대표" : ""}${list[i].ai ? "_AI" : ""}.jpg`, data: GWZip.dataUrlBytes(dataUrl) });
      saved += 1;
    }
    GWBusy.label(button, "압축 파일 만드는 중");
    downloadBlob(new Blob([GWZip.build(files)], { type: "application/zip" }), `${folder}.zip`);
    return { saved, total: list.length, zipName: `${folder}.zip` };
  }

  /* 내려받은 사진에 AI 이미지가 섞여 있으면 "AI 레이블을 켜세요" (shared/sns-prompt.js) */
  function aiLabelNote(channel) {
    const note = gwSnsAiLabelNote(channel, N.media[channel]);
    return note ? ` 🤖 ${note}` : "";
  }

  function overNote({ c, over }) {
    return over ? ` ⚠ ${c.label} 글자 수를 넘었습니다. 줄여서 올려 주세요.` : "";
  }

  /* [📋 복사] — 글만 */
  el.btnSnsCopyOnly.addEventListener("click", () =>
    guard(el.btnSnsCopyOnly, "복사 중", async () => {
      const ready = await prepare();
      const { channel, c, composed } = ready;
      await copyText(channel === "threads" ? composed.posts[0] : composed.text);
      const threadNote = channel === "threads" && composed.posts.length > 1 ? " 이어 쓰기 글은 각 칸의 [복사]로 붙여 주세요." : "";
      toast(`${c.label} ${channel === "threads" ? "첫 글" : "글"}을 복사했습니다. 게시물 칸에 Ctrl+V로 붙여 넣으세요.${threadNote}${overNote(ready)}`, ready.over ? "info" : "ok", 8000);
      status(`${c.label} 복사 완료`, "ok");
    }, { failTitle: "복사하지 못했습니다" }).then(() => {
      if (el.status.textContent.endsWith("복사 완료")) flash(el.btnSnsCopyOnly, "✓ 복사됨");
    })
  );

  /* [⬇ 받기] — 사진 + 글.txt 압축 파일만 */
  el.btnSnsZip.addEventListener("click", () =>
    guard(el.btnSnsZip, "받는 중", async () => {
      const ready = await prepare();
      const result = await downloadPackage(ready, el.btnSnsZip);
      const missNote = result.saved < result.total ? ` (사진 ${result.total - result.saved}장은 받지 못했습니다)` : "";
      const aiNote = aiLabelNote(ready.channel);
      toast(`${result.zipName} 을 다운로드 폴더에 받았습니다. 압축을 풀면 사진 ${result.saved}장과 글(TXT)이 한 폴더에 있습니다.${missNote}${aiNote}`,
        missNote || aiNote ? "info" : "ok", aiNote ? 15000 : 10000);
      status(`${ready.c.label} 받기 완료`, "ok");
    }, { failTitle: "내려받지 못했습니다" }).then(() => {
      if (el.status.textContent.endsWith("받기 완료")) flash(el.btnSnsZip, "✓ 받음");
    })
  );

  /* [글·사진 받기] — 글 복사 + 압축 파일 */
  el.btnCopySns.addEventListener("click", () =>
    guard(el.btnCopySns, "준비 중", async () => {
      const ready = await prepare();
      const { channel, c, composed } = ready;
      await copyText(channel === "threads" ? composed.posts[0] : composed.text);
      const result = await downloadPackage(ready, el.btnCopySns);
      const missNote = result.saved < result.total ? ` (사진 ${result.total - result.saved}장은 받지 못했습니다)` : "";
      const aiNote = aiLabelNote(channel);
      toast(`${c.label} 글을 복사했고, 사진 ${result.saved}장과 글(TXT)을 ${result.zipName} 으로 받았습니다.${missNote} ` +
        `[${c.label} 바로가기]에서 새 게시물에 Ctrl+V로 붙여 넣고, 압축을 푼 폴더의 사진을 01부터 올리세요.${overNote(ready)}${aiNote}`,
        ready.over || missNote || aiNote ? "info" : "ok", aiNote ? 15000 : 12000);
      status(`${c.label} 복사 완료`, "ok");
    }, { failTitle: "글·사진을 받지 못했습니다" }).then(() => {
      if (el.status.textContent.endsWith("복사 완료")) flash(el.btnCopySns, '<span class="send-icon">✓</span><strong>복사·받기 완료</strong>');
    })
  );

  /* 발행한 공실뉴스 기사 주소 — 넣으면 SNS 글 끝 링크가 그 기사로 바뀐다 */
  el.snsArticleUrl.addEventListener("change", () => {
    const value = el.snsArticleUrl.value.trim();
    if (value && !/^https?:\/\/([a-z0-9-]+\.)?gongsilnews\.com\//i.test(value)) {
      toast("공실뉴스 기사 주소(https://www.gongsilnews.com/…)만 넣을 수 있습니다.", "bad", 6000);
      el.snsArticleUrl.value = N.articleUrl;
      return;
    }
    N.articleUrl = value;
    save();
    renderTail();
    if (value) toast("SNS 글 끝 링크를 발행한 기사 주소로 바꿨습니다.", "ok");
  });

  /* ═════════════ 버튼 잠금 · 저장 ═════════════ */
  function refreshButtons() {
    const exhausted = GWTrial.exhausted(access);
    const has = Boolean(N.posts?.[N.channel]);
    el.btnMakeSns.disabled = !sourceCache || exhausted;
    el.btnPullSns.disabled = !N.aiTabId;
    el.btnReviseSns.disabled = !N.posts || !N.aiTabId;
    el.btnPullSnsRevised.disabled = !N.aiTabId;
    el.btnMakeSnsImage.disabled = !N.posts || !N.aiTabId;
    el.btnInsertSnsImage.disabled = !N.posts;
    el.btnCopySns.disabled = !has;
    el.btnSnsCopyOnly.disabled = !has;
    el.btnSnsZip.disabled = !has;
  }

  let lastSaveError = "";
  function save() {
    return chrome.storage.local.set({ [SNS_STATE_KEY]: N }).catch((error) => {
      const message = error.message || String(error);
      if (message !== lastSaveError) {
        lastSaveError = message;
        toast("SNS 작업 내용을 저장하지 못했습니다 — " + message, "bad", 9000);
      }
    });
  }

  async function restore() {
    const stored = await chrome.storage.local.get(SNS_STATE_KEY);
    const previous = stored[SNS_STATE_KEY];
    if (previous) Object.assign(N, previous);
    if (typeof N.articleUrl !== "string") N.articleUrl = "";
    delete N.video; // SNS 영상 넣기는 뺐다 — 예전에 저장된 값 정리
    delete N.reviseScope;
    if (N.channel !== "blog" && !isSnsChannel(N.channel)) N.channel = "blog";
    if (!N.media || typeof N.media !== "object") N.media = emptyMedia();
    GW_SNS_ORDER.forEach((channel) => { if (!Array.isArray(N.media[channel])) N.media[channel] = []; });
    if (!GW_IMAGE_STYLE[N.imageStyle]) N.imageStyle = "auto";
    if (typeof N.imageRequest !== "string") N.imageRequest = "";
    if (N.posts && typeof N.posts !== "object") N.posts = null;

    if (N.aiTabId) {
      const live = await chrome.tabs.get(N.aiTabId).catch(() => null);
      if (!live) N.aiTabId = null;
    }
    if (!N.aiTabId) N.writing = false;
    showWriting();
    if (typeof N.customStyle !== "string") N.customStyle = "";
    imageStyleButtons.forEach((button) => button.classList.toggle("active", button.dataset.snsImageStyle === N.imageStyle && !N.customStyle));
    if (el.snsImageCustomStyle) {
      el.snsImageCustomStyle.value = N.customStyle;
      el.snsImageCustomStyle.classList.toggle("active", Boolean(N.customStyle));
    }
    el.snsImageRequest.value = N.imageRequest;
    el.snsArticleUrl.value = N.articleUrl;
    paintChannelButtons();
    await updateSourceCard();
    renderSns();
    /* 저장된 상태를 읽기 전에 3번 탭이 먼저 열렸으면(초기화 뒤 돌아오기 등) 여기서 SNS 로 맞춘다 */
    if (el.tabBlog.classList.contains("active")) {
      el.channelBar.classList.remove("hidden");
      if (isSnsChannel(N.channel)) showSns();
    }
  }

  restore().catch((error) => {
    console.error("[공실뉴스 SNS 작성] 복원 실패", error);
    refreshButtons();
  });
})();
