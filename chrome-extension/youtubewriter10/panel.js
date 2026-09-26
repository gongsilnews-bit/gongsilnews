(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const DEFAULT_STATE = {
    platform: "chatgpt",
    sourceType: "article",
    source: null,
    settings: {
      videoType: "listing",
      duration: "short",
      sceneLength: "medium",
      aspectRatio: "9:16",
      tone: "news",
      imageStyle: "news",
      styleLocked: true,
    },
    script: null,
    aiTabId: null,
    pendingRevisionCount: 0,
    thumbnail: { text: "", suggestions: [], candidates: [], selectedMediaId: null },
  };

  let state = structuredClone(DEFAULT_STATE);
  let accessGranted = false;
  let queueStop = false;
  let queueRunning = false;
  let replaceSceneId = null;
  let pendingImport = [];

  const statusLabel = {
    empty: "이미지 없음",
    generating: "생성 중",
    complete: "완성",
    failed: "실패",
    recheck: "재확인 필요",
  };

  function setStatus(text, kind = "") {
    const node = $("#statusPill");
    node.textContent = text;
    node.className = `status-pill ${kind}`.trim();
  }

  function toast(message, kind = "") {
    const node = document.createElement("div");
    node.className = `toast ${kind}`.trim();
    node.textContent = message;
    $("#toastHost").appendChild(node);
    requestAnimationFrame(() => node.classList.add("in"));
    setTimeout(() => {
      node.classList.remove("in");
      setTimeout(() => node.remove(), 240);
    }, 3200);
  }

  function save() {
    return chrome.storage.local.set({ [GYW.KEY.STATE]: state });
  }

  async function load() {
    const stored = await chrome.storage.local.get(GYW.KEY.STATE);
    const value = stored[GYW.KEY.STATE];
    if (!value || typeof value !== "object") return;
    state = {
      ...structuredClone(DEFAULT_STATE),
      ...value,
      settings: { ...DEFAULT_STATE.settings, ...(value.settings || {}) },
      thumbnail: { ...DEFAULT_STATE.thumbnail, ...(value.thumbnail || {}) },
    };
    if (state.script?.scenes) state.script.scenes = state.script.scenes.map(normalizeScene);
  }

  function normalizeScene(scene, index = 0) {
    const candidates = Array.isArray(scene?.mediaCandidates) ? scene.mediaCandidates : [];
    return {
      sceneId: scene?.sceneId || gywUid(`scene-${index + 1}`),
      heading: String(scene?.heading || `장면 ${index + 1}`).trim(),
      narration: String(scene?.narration || "").trim(),
      caption: String(scene?.caption || "").trim(),
      visualType: String(scene?.visualType || "auto").trim(),
      visualPrompt: String(scene?.visualPrompt || "").trim(),
      imageStyle: String(scene?.imageStyle || "").trim(),
      mediaCandidates: candidates,
      selectedMediaId: scene?.selectedMediaId || candidates.at(-1)?.id || null,
      imageStatus: scene?.imageStatus || (candidates.length ? "complete" : "empty"),
    };
  }

  function getSelectedMedia(scene) {
    if (!scene) return null;
    return scene.mediaCandidates?.find((item) => item.id === scene.selectedMediaId) || null;
  }

  async function mediaUrl(ref) {
    if (!ref) return "";
    if (ref.kind === "idb" && ref.storageId) return GYWMediaStore.url(ref.storageId);
    return ref.url || "";
  }

  function activateView(name) {
    $$(".nav-tab").forEach((button) => button.classList.toggle("active", button.dataset.tab === name));
    $$(".view").forEach((view) => view.classList.toggle("active", view.id === `view${name[0].toUpperCase()}${name.slice(1)}`));
    if (name === "script") renderScript();
    if (name === "images") renderImages();
  }

  async function getSiteOrigin() {
    const candidates = [state.source?.url];
    const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
    candidates.push(active?.url);
    for (const value of candidates) {
      try {
        const parsed = new URL(value || "");
        if (/^(localhost|127\.0\.0\.1|(?:www\.)?gongsilnews\.com)$/i.test(parsed.hostname)) return parsed.origin;
      } catch (_error) {
        // 다음 후보를 확인한다.
      }
    }
    return GYW.SITE_URL;
  }

  async function checkAccess() {
    setStatus("권한 확인 중", "busy");
    $("#accessLock").classList.remove("hidden");
    $("#lockTitle").textContent = "회원 정보를 확인하는 중입니다";
    $("#lockText").textContent = "잠시만 기다려 주세요.";
    $("#lockLink").classList.add("hidden");
    try {
      const origin = await getSiteOrigin();
      const response = await fetch(`${origin}/api/extension/auth/me`, { credentials: "include", cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.isLoggedIn) {
        accessGranted = false;
        $("#lockTitle").textContent = "공실뉴스 로그인이 필요합니다";
        $("#lockText").textContent = "공실뉴스에 로그인한 뒤 다시 확인해 주세요.";
        $("#lockLink").href = `${origin}/login`;
        $("#lockLink").classList.remove("hidden");
        setStatus("로그인 필요", "bad");
        return;
      }
      if (!data.canYoutubeWriter) {
        accessGranted = false;
        $("#lockTitle").textContent = "유튜브작성기 이용 권한이 없습니다";
        $("#lockText").textContent = "공실뉴스부동산·공실스터디부동산 회원 또는 최고관리자 계정으로 이용할 수 있습니다.";
        $("#lockLink").href = origin;
        $("#lockLink").textContent = "공실뉴스 열기";
        $("#lockLink").classList.remove("hidden");
        setStatus("권한 없음", "bad");
        return;
      }
      accessGranted = true;
      $("#accessLock").classList.add("hidden");
      setStatus("사용 가능", "ok");
    } catch (error) {
      accessGranted = false;
      $("#lockTitle").textContent = "공실뉴스 연결을 확인해 주세요";
      $("#lockText").textContent = error.message || "회원 정보를 불러오지 못했습니다.";
      $("#lockLink").href = GYW.SITE_URL;
      $("#lockLink").classList.remove("hidden");
      setStatus("연결 실패", "bad");
    }
  }

  function sourcePath() {
    return state.sourceType === "vacancy" ? "/gongsil" : "/";
  }

  async function openSourcePage(url = "") {
    const input = String(url || "").trim();
    const origin = await getSiteOrigin();
    const target = input && state.sourceType === "vacancy" && !/^https?:\/\//i.test(input)
      ? `${origin}/gongsil?id=${encodeURIComponent(input)}`
      : input || `${origin}${sourcePath()}`;
    const parsed = new URL(target);
    if (!/^(gongsilnews\.com|www\.gongsilnews\.com|localhost|127\.0\.0\.1)$/i.test(parsed.hostname)) {
      throw new Error("공실뉴스 기사 또는 매물 주소만 열 수 있습니다.");
    }
    const tab = await chrome.tabs.create({ url: parsed.href, active: true });
    return tab;
  }

  async function waitTabLoaded(tabId, maxMs = 20000) {
    const end = Date.now() + maxMs;
    while (Date.now() < end) {
      const tab = await chrome.tabs.get(tabId).catch(() => null);
      if (tab?.status === "complete") return tab;
      await gywSleep(300);
    }
    return chrome.tabs.get(tabId);
  }

  async function ensureSourceBridge(tabId) {
    const file = state.sourceType === "vacancy" ? "content-gongsil.js" : "content-article.js";
    await chrome.scripting.executeScript({ target: { tabId }, files: ["shared/config.js", file] });
    await gywSleep(250);
  }

  async function grabSource() {
    if (state.sourceType === "manual") return applyManualSource();
    const messageType = state.sourceType === "vacancy" ? "GYW_GET_VACANCY" : "GYW_GET_ARTICLE";
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url?.includes("gongsilnews.com") && !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(tab?.url || "")) {
      const patterns = state.sourceType === "vacancy"
        ? ["https://gongsilnews.com/gongsil*", "http://localhost/*", "http://127.0.0.1/*"]
        : ["https://gongsilnews.com/*", "http://localhost/*", "http://127.0.0.1/*"];
      const tabs = await chrome.tabs.query({ url: patterns });
      tab = tabs.at(-1);
    }
    if (!tab?.id) throw new Error("가져올 공실뉴스 페이지를 먼저 열어 주세요.");
    let result = await chrome.tabs.sendMessage(tab.id, { type: messageType }).catch(() => null);
    if (!result) {
      await ensureSourceBridge(tab.id);
      result = await chrome.tabs.sendMessage(tab.id, { type: messageType }).catch(() => null);
    }
    if (!result?.ok) throw new Error(result?.reason || "이 페이지에서 자료를 가져오지 못했습니다. 페이지를 새로고침해 주세요.");
    state.source = result.source;
    await save();
    renderSource();
    toast("자료를 가져왔습니다.", "ok");
  }

  async function applyManualSource() {
    const title = $("#manualTitle").value.trim();
    const body = $("#manualBody").value.trim();
    if (!title || !body) throw new Error("제목과 참고 내용을 모두 입력해 주세요.");
    state.source = { type: "manual", title, body, facts: [], images: [], url: "", capturedAt: Date.now() };
    await save();
    renderSource();
    toast("직접 입력한 자료를 사용합니다.", "ok");
  }

  function renderSource() {
    $$("#sourceTypeGroup button").forEach((button) => button.classList.toggle("active", button.dataset.value === state.sourceType));
    $("#pageSourceBox").classList.toggle("hidden", state.sourceType === "manual");
    $("#manualSourceBox").classList.toggle("hidden", state.sourceType !== "manual");
    $$("#platformGroup button").forEach((button) => button.classList.toggle("active", button.dataset.value === state.platform));
    const source = state.source;
    $("#sourceEmpty").classList.toggle("hidden", Boolean(source));
    $("#sourcePreview").classList.toggle("hidden", !source);
    if (!source) return;
    $("#sourceBadge").textContent = source.type === "vacancy" ? "공실 매물" : source.type === "manual" ? "직접 입력" : "공실뉴스 기사";
    $("#sourceTitle").textContent = source.title || "제목 없음";
    const meta = [];
    if (source.url) meta.push(source.url);
    if (source.images?.length) meta.push(`실제 이미지 ${source.images.length}개`);
    $("#sourceMeta").textContent = meta.join(" · ") || "확인된 참고 자료";
    const facts = Array.isArray(source.facts) && source.facts.length ? source.facts : (Array.isArray(source.fields) ? source.fields : []);
    $("#sourceFacts").innerHTML = facts.slice(0, 16).map((fact) => {
      const label = typeof fact === "object" ? fact.label || fact.key || "정보" : "정보";
      const value = typeof fact === "object" ? fact.value || fact.text || "" : fact;
      return `<div class="fact-row"><b>${gywEscape(label)}</b><span>${gywEscape(value)}</span></div>`;
    }).join("");
    const excerpt = source.body || source.text || [source.priceText, ...(source.themes || [])].filter(Boolean).join(" · ");
    $("#sourceExcerpt").textContent = String(excerpt || "확인된 구조화 자료를 대본에 사용합니다.").slice(0, 5000);
  }

  function renderSettings() {
    $$('[data-setting]').forEach((group) => {
      const key = group.dataset.setting;
      $$('button[data-value]', group).forEach((button) => button.classList.toggle("active", state.settings[key] === button.dataset.value));
    });
    const sceneLength = GYW_SCENE_LENGTH[state.settings.sceneLength];
    $("#sceneLengthHint").textContent = sceneLength ? `장면당 약 ${sceneLength.seconds} · ${sceneLength.guide}` : "";
  }

  function renderScript() {
    renderSettings();
    $("#scriptSourceWarning").classList.toggle("hidden", Boolean(state.source));
    $("#scriptWorkspace").classList.toggle("hidden", !state.source);
    if (!state.source) return;
    $("#scriptSourceTitle").textContent = state.source.title || "참고 자료";
    const script = state.script;
    $("#scriptEmpty").classList.toggle("hidden", Boolean(script));
    $("#scriptEditor").classList.toggle("hidden", !script);
    if (!script) return;
    $("#videoTitle").value = script.title || "";
    $("#videoDescription").value = script.description || "";
    renderSceneEditors();
  }

  function estimateDuration() {
    const seconds = { short: 4, medium: 7.5, long: 12.5 }[state.settings.sceneLength] || 7.5;
    return Math.round((state.script?.scenes?.length || 0) * seconds);
  }

  function durationText(seconds) {
    if (seconds < 60) return `예상 ${seconds}초`;
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `예상 ${min}분${sec ? ` ${sec}초` : ""}`;
  }

  function renderSceneEditors() {
    const scenes = state.script?.scenes || [];
    $("#sceneCount").textContent = `${scenes.length}개 장면`;
    $("#estimatedDuration").textContent = durationText(estimateDuration());
    $("#sceneList").innerHTML = scenes.map((scene, index) => `
      <article class="scene-card" data-scene-id="${gywEscape(scene.sceneId)}">
        <div class="scene-head">
          <span class="scene-number">${String(index + 1).padStart(2, "0")}</span>
          <strong>${gywEscape(scene.heading || `장면 ${index + 1}`)}</strong>
          <div class="scene-actions">
            <button type="button" data-action="up" title="위로">↑</button>
            <button type="button" data-action="down" title="아래로">↓</button>
            <button type="button" data-action="split" title="나누기">✂</button>
            <button type="button" data-action="merge" title="다음 장면과 합치기">＋</button>
            <button type="button" data-action="delete" title="삭제">×</button>
          </div>
        </div>
        <div class="scene-body">
          <label class="field-label">장면 제목</label>
          <input type="text" data-field="heading" value="${gywEscape(scene.heading)}">
          <label class="field-label">내레이션</label>
          <textarea data-field="narration">${gywEscape(scene.narration)}</textarea>
          <div class="scene-mini-grid">
            <div><label class="field-label">화면 자막</label><input type="text" data-field="caption" value="${gywEscape(scene.caption)}"></div>
            <div><label class="field-label">장면 종류</label><input type="text" data-field="visualType" value="${gywEscape(scene.visualType)}"></div>
          </div>
          <label class="field-label">이미지 장면 설명</label>
          <textarea data-field="visualPrompt">${gywEscape(scene.visualPrompt)}</textarea>
        </div>
      </article>`).join("");
  }

  function markSceneChanged(scene, field, value) {
    scene[field] = value;
    if (["narration", "caption", "visualType", "visualPrompt"].includes(field) && scene.mediaCandidates?.length) scene.imageStatus = "recheck";
  }

  async function applyScript(parsed) {
    const previous = state.script?.scenes || [];
    const scenes = parsed.scenes.map((scene, index) => {
      const old = previous[index];
      const normalized = normalizeScene({ ...scene, sceneId: old?.sceneId || scene.sceneId }, index);
      if (old) {
        normalized.imageStyle = old.imageStyle || "";
        normalized.mediaCandidates = old.mediaCandidates || [];
        normalized.selectedMediaId = old.selectedMediaId || null;
        normalized.imageStatus = old.mediaCandidates?.length ? "recheck" : "empty";
      }
      return normalized;
    });
    state.script = { title: parsed.title, description: parsed.description || "", scenes };
    await assignActualImages();
    await save();
    renderScript();
    toast(`${scenes.length}개 장면 대본을 가져왔습니다.`, "ok");
  }

  async function askTab(tabId, message, timeoutMs = 195000) {
    return Promise.race([
      chrome.tabs.sendMessage(tabId, message),
      new Promise((_, reject) => setTimeout(() => reject(new Error("AI 응답 대기 시간이 지났습니다.")), timeoutMs)),
    ]);
  }

  async function ensureAiTab() {
    let tab = null;
    if (state.aiTabId) {
      const existing = await chrome.tabs.get(state.aiTabId).catch(() => null);
      if (existing?.url?.startsWith(GYW.aiConfig(state.platform).URL.split("/app")[0])) tab = existing;
    }
    const config = GYW.aiConfig(state.platform);
    const matches = tab ? [] : await chrome.tabs.query({ url: state.platform === "gemini" ? "https://gemini.google.com/*" : "https://chatgpt.com/*" });
    tab = tab || matches.at(-1);
    if (!tab) tab = await chrome.tabs.create({ url: config.URL, active: true });
    await waitTabLoaded(tab.id, 30000);
    state.aiTabId = tab.id;
    await save();
    await gywSleep(1000);
    const ping = await chrome.tabs.sendMessage(tab.id, { type: "GYW_PING" }).catch(() => null);
    if (!ping?.ok) {
      const platformFile = state.platform === "gemini" ? "content-gemini.js" : "content-chatgpt.js";
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: [
          "shared/config.js",
          "shared/ui.js",
          "shared/youtube-json.js",
          "shared/ai-common.js",
          platformFile,
        ],
      });
      await gywSleep(300);
    }
    return tab;
  }

  async function sendPrompt(prompt) {
    const tab = await ensureAiTab();
    const filled = await askTab(tab.id, { type: "GYW_FILL", text: prompt }, 40000);
    if (!filled?.ok) throw new Error(filled?.reason || "AI 입력창에 내용을 넣지 못했습니다.");
    const count = await askTab(tab.id, { type: "GYW_COUNT" }, 10000).catch(() => ({ count: 0 }));
    const submitted = await askTab(tab.id, { type: "GYW_SUBMIT" }, 15000);
    if (!submitted?.ok) throw new Error(submitted?.reason || "AI 전송에 실패했습니다.");
    return { tab, previousCount: count.count || 0 };
  }

  async function createScript() {
    if (!state.source) throw new Error("참고 자료를 먼저 가져와 주세요.");
    setStatus("대본 요청 중", "busy");
    const sent = await sendPrompt(gywBuildScriptPrompt(state.source, state.settings));
    state.pendingRevisionCount = sent.previousCount;
    await save();
    setStatus("AI 작성 중", "busy");
    toast("AI에 대본 작성을 요청했습니다. 완성된 뒤 ‘완성 대본 가져오기’를 누르세요.", "ok");
  }

  async function pullScript(isRevision = false) {
    const tab = await ensureAiTab();
    setStatus("대본 가져오는 중", "busy");
    const response = await askTab(tab.id, {
      type: "GYW_READ",
      minCount: Number(state.pendingRevisionCount) + 1,
      maxMs: 180000,
    });
    if (!response?.ok) throw new Error(response?.reason || "완성 대본을 읽지 못했습니다.");
    const parsed = GYWYoutubeJson.parse(response.text);
    if (!parsed.ok) throw new Error(parsed.reason || "대본 JSON 형식을 확인해 주세요.");
    await applyScript(parsed.script);
    setStatus(isRevision ? "수정 완료" : "대본 완료", "ok");
  }

  async function requestRevision() {
    if (!state.script) throw new Error("수정할 대본이 없습니다.");
    const request = $("#reviseRequest").value.trim();
    if (!request) throw new Error("수정 요청을 입력해 주세요.");
    setStatus("수정 요청 중", "busy");
    const sent = await sendPrompt(gywBuildRevisePrompt(state.script, request));
    state.pendingRevisionCount = sent.previousCount;
    await save();
    setStatus("AI 수정 중", "busy");
    toast("AI에 대본 수정을 요청했습니다.", "ok");
  }

  async function assignActualImages() {
    const images = (state.source?.images || []).filter(Boolean);
    const scenes = state.script?.scenes || [];
    if (!images.length || !scenes.length) return;
    let imageIndex = 0;
    for (const scene of scenes) {
      if (scene.mediaCandidates?.length || imageIndex >= images.length) continue;
      const raw = images[imageIndex++];
      const url = typeof raw === "string" ? raw : raw.url || raw.src;
      if (!url) continue;
      const ref = { id: gywUid("media"), kind: "url", url, name: `actual-${imageIndex}`, source: "actual", createdAt: Date.now() };
      scene.mediaCandidates = [ref];
      scene.selectedMediaId = ref.id;
      scene.imageStatus = "complete";
    }
  }

  function renderStyles() {
    $("#imageStyleGrid").innerHTML = Object.entries(GYW_IMAGE_STYLE).map(([key, item]) =>
      `<button type="button" class="style-btn ${state.settings.imageStyle === key ? "active" : ""}" data-style="${gywEscape(key)}">${gywEscape(item.label)}</button>`
    ).join("");
    $("#styleLocked").checked = Boolean(state.settings.styleLocked);
  }

  function renderImages() {
    const hasScript = Boolean(state.script?.scenes?.length);
    $("#imageScriptWarning").classList.toggle("hidden", hasScript);
    $("#imageWorkspace").classList.toggle("hidden", !hasScript);
    if (!hasScript) return;
    renderStyles();
    $("#imageScriptTitle").textContent = state.script.title || "유튜브 대본";
    $("#imageSceneCount").textContent = `${state.script.scenes.length}개 장면`;
    renderImageScenes();
    renderThumbnail();
  }

  function renderImageScenes() {
    const list = $("#imageSceneList");
    list.innerHTML = state.script.scenes.map((scene, index) => {
      const selected = getSelectedMedia(scene);
      const activeStyle = state.settings.styleLocked ? state.settings.imageStyle : (scene.imageStyle || state.settings.imageStyle);
      const ppt = activeStyle === "presentation";
      return `<article class="scene-card" data-scene-id="${gywEscape(scene.sceneId)}">
        <div class="scene-head">
          <span class="scene-number">${String(index + 1).padStart(2, "0")}</span>
          <strong>${gywEscape(scene.heading || `장면 ${index + 1}`)}</strong>
          <span class="scene-status ${gywEscape(scene.imageStatus)}">${gywEscape(statusLabel[scene.imageStatus] || statusLabel.empty)}</span>
        </div>
        <div class="image-preview ${state.settings.aspectRatio === "9:16" ? "vertical" : ""}" data-preview>
          ${selected ? `<span class="image-placeholder">이미지 불러오는 중…</span>` : `<span class="image-placeholder">직접 넣거나 AI로 만들어 주세요.</span>`}
          ${selected && ppt ? `<div class="ppt-overlay"><small>공실뉴스</small><strong>${gywEscape(scene.caption || scene.heading)}</strong></div>` : ""}
        </div>
        <div class="image-controls">
          <button type="button" class="primary-action" data-action="generate">${selected ? "수정하기" : "만들기"}</button>
          <button type="button" data-action="replace">바꾸기</button>
          <button type="button" data-action="previous">이전 이미지</button>
          <button type="button" data-action="download">저장</button>
          <button type="button" data-action="delete">이미지 삭제</button>
        </div>
        ${state.settings.styleLocked ? "" : `<div class="scene-body"><label class="field-label">이 장면 스타일</label><select data-scene-style>${Object.entries(GYW_IMAGE_STYLE).map(([key, item]) => `<option value="${gywEscape(key)}" ${key === activeStyle ? "selected" : ""}>${gywEscape(item.label)}</option>`).join("")}</select></div>`}
      </article>`;
    }).join("");
    state.script.scenes.forEach(async (scene) => {
      const ref = getSelectedMedia(scene);
      if (!ref) return;
      const card = list.querySelector(`[data-scene-id="${CSS.escape(scene.sceneId)}"]`);
      const preview = card?.querySelector("[data-preview]");
      const url = await mediaUrl(ref).catch(() => "");
      if (!preview || !url) return;
      const image = document.createElement("img");
      image.src = url;
      image.alt = scene.heading;
      preview.querySelector(".image-placeholder")?.remove();
      preview.prepend(image);
    });
  }

  function dataUrlToBlob(dataUrl) {
    const [header, content] = String(dataUrl).split(",");
    const mime = header.match(/data:([^;]+)/)?.[1] || "image/png";
    const binary = atob(content || "");
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mime });
  }

  async function mediaFromGeneratedUrl(url, name) {
    let blob = null;
    try {
      const response = await fetch(url, { credentials: "include" });
      if (response.ok) blob = await response.blob();
    } catch (_error) {
      // AI 페이지에서 다시 읽는다.
    }
    if (!blob && state.aiTabId) {
      const response = await askTab(state.aiTabId, { type: "GYW_GET_IMAGE_DATA", url }, 50000).catch(() => null);
      if (response?.ok && response.dataUrl) blob = dataUrlToBlob(response.dataUrl);
    }
    if (!blob) return { id: gywUid("media"), kind: "url", url, name, source: "generated", createdAt: Date.now() };
    const storageId = await GYWMediaStore.put(blob, { name, source: "generated" });
    return { id: gywUid("media"), kind: "idb", storageId, name, source: "generated", createdAt: Date.now() };
  }

  async function mediaFromFile(file, source = "uploaded") {
    const storageId = await GYWMediaStore.put(file, { name: file.name, source });
    return { id: gywUid("media"), kind: "idb", storageId, name: file.name, source, createdAt: Date.now() };
  }

  async function generateSceneImage(scene, extraRequest = "") {
    scene.imageStatus = "generating";
    renderImageScenes();
    await save();
    try {
      const tab = await ensureAiTab();
      const before = await askTab(tab.id, { type: "GYW_IMAGE_LIST" }, 15000);
      const imageSettings = {
        ...state.settings,
        imageStyle: state.settings.styleLocked ? state.settings.imageStyle : (scene.imageStyle || state.settings.imageStyle),
      };
      const filled = await askTab(tab.id, { type: "GYW_FILL", text: gywBuildImagePrompt(scene, imageSettings, extraRequest) }, 40000);
      if (!filled?.ok) throw new Error(filled?.reason || "이미지 요청을 입력하지 못했습니다.");
      const submitted = await askTab(tab.id, { type: "GYW_SUBMIT" }, 15000);
      if (!submitted?.ok) throw new Error(submitted?.reason || "이미지 요청을 전송하지 못했습니다.");
      const generated = await askTab(tab.id, { type: "GYW_WAIT_IMAGE", minCount: before?.images?.length || 0, maxMs: 180000 }, 195000);
      if (!generated?.ok || !generated.image?.url) throw new Error(generated?.reason || "생성된 이미지를 찾지 못했습니다.");
      const ref = await mediaFromGeneratedUrl(generated.image.url, `${scene.sceneId}.png`);
      scene.mediaCandidates = [...(scene.mediaCandidates || []), ref];
      scene.selectedMediaId = ref.id;
      scene.imageStatus = "complete";
      await save();
      renderImageScenes();
      return true;
    } catch (error) {
      scene.imageStatus = "failed";
      await save();
      renderImageScenes();
      toast(`${scene.heading}: ${error.message}`, "bad");
      return false;
    }
  }

  function updateQueueProgress(done, total, label = "") {
    const percent = total ? Math.round((done / total) * 100) : 0;
    $("#imageProgressBar").style.width = `${percent}%`;
    $("#imageProgressText").textContent = total ? `${done}/${total} ${label}` : "대기 중";
  }

  async function runImageQueue(mode = "missing") {
    if (queueRunning) return;
    const targets = state.script.scenes.filter((scene) => mode === "failed" ? scene.imageStatus === "failed" : !getSelectedMedia(scene));
    if (!targets.length) {
      toast(mode === "failed" ? "실패한 이미지가 없습니다." : "모든 장면에 이미지가 있습니다.", "ok");
      return;
    }
    queueRunning = true;
    queueStop = false;
    $("#btnStopQueue").classList.remove("hidden");
    setStatus("이미지 생성 중", "busy");
    let done = 0;
    updateQueueProgress(done, targets.length, "시작");
    for (const scene of targets) {
      if (queueStop) break;
      updateQueueProgress(done, targets.length, scene.heading);
      await generateSceneImage(scene);
      done += 1;
      updateQueueProgress(done, targets.length, scene.heading);
    }
    queueRunning = false;
    $("#btnStopQueue").classList.add("hidden");
    setStatus(queueStop ? "생성 중지" : "이미지 완료", queueStop ? "bad" : "ok");
    toast(queueStop ? `이미지 생성을 중지했습니다. (${done}/${targets.length})` : `${done}개 장면 이미지 작업을 마쳤습니다.`, queueStop ? "bad" : "ok");
  }

  function createThumbSuggestions() {
    const title = state.script?.title || state.source?.title || "";
    const first = state.script?.scenes?.[0]?.caption || "";
    const clean = title.replace(/[\[\](){}]/g, "").trim();
    return [
      clean.slice(0, 28),
      first.slice(0, 28) || clean.slice(0, 28),
      `${state.settings.videoType === "listing" ? "이 매물" : "핵심 내용"}, 꼭 확인하세요`.slice(0, 28),
    ].filter((item, index, array) => item && array.indexOf(item) === index);
  }

  function renderThumbnail() {
    const thumb = state.thumbnail;
    $("#thumbText").value = thumb.text || "";
    $("#thumbOverlay").textContent = thumb.text || "";
    $("#thumbSuggestions").innerHTML = (thumb.suggestions || []).map((text) => `<button type="button" data-thumb-text="${gywEscape(text)}">${gywEscape(text)}</button>`).join("");
    const preview = $("#thumbPreview");
    preview.querySelector("img")?.remove();
    const ref = thumb.candidates?.find((item) => item.id === thumb.selectedMediaId);
    preview.classList.toggle("empty", !ref);
    if (!ref) return;
    mediaUrl(ref).then((url) => {
      if (!url) return;
      const image = document.createElement("img");
      image.src = url;
      image.alt = "유튜브 썸네일";
      preview.prepend(image);
    });
  }

  async function generateThumbnail() {
    const text = $("#thumbText").value.trim() || state.script?.title || "유튜브 영상";
    state.thumbnail.text = text;
    const scene = {
      sceneId: "thumbnail",
      heading: text,
      narration: state.script?.description || "",
      caption: text,
      visualType: "title",
      visualPrompt: `한국 유튜브 썸네일에 어울리는 강한 한 장면의 배경. 주제: ${state.script?.title || text}. 글자는 그리지 않는다.`,
    };
    setStatus("썸네일 생성 중", "busy");
    const tab = await ensureAiTab();
    const before = await askTab(tab.id, { type: "GYW_IMAGE_LIST" }, 15000);
    await sendPrompt(gywBuildImagePrompt(scene, { ...state.settings, aspectRatio: "16:9" }, "유튜브 썸네일 배경용. 큰 제목 글자는 확장 프로그램에서 따로 넣으므로 배경에 글자를 생성하지 마세요."));
    const generated = await askTab(tab.id, { type: "GYW_WAIT_IMAGE", minCount: before?.images?.length || 0, maxMs: 180000 }, 195000);
    if (!generated?.ok || !generated.image?.url) throw new Error(generated?.reason || "썸네일 이미지를 찾지 못했습니다.");
    const ref = await mediaFromGeneratedUrl(generated.image.url, "youtube-thumbnail.png");
    state.thumbnail.candidates = [...(state.thumbnail.candidates || []), ref];
    state.thumbnail.selectedMediaId = ref.id;
    await save();
    renderThumbnail();
    setStatus("썸네일 완료", "ok");
  }

  async function blobForMedia(ref) {
    if (!ref) return null;
    if (ref.kind === "idb") return (await GYWMediaStore.get(ref.storageId))?.blob || null;
    const response = await fetch(ref.url, { credentials: "include" });
    if (!response.ok) throw new Error("이미지를 저장용으로 불러오지 못했습니다.");
    return response.blob();
  }

  async function composeImage(ref, title, ratio = "16:9", addText = false) {
    const blob = await blobForMedia(ref);
    if (!blob) throw new Error("저장할 이미지가 없습니다.");
    if (!addText) return blob;
    const bitmap = await createImageBitmap(blob);
    const width = ratio === "9:16" ? 1080 : 1920;
    const height = ratio === "9:16" ? 1920 : 1080;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    const scale = Math.max(width / bitmap.width, height / bitmap.height);
    const drawWidth = bitmap.width * scale;
    const drawHeight = bitmap.height * scale;
    context.drawImage(bitmap, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    const gradient = context.createLinearGradient(0, height * 0.38, 0, height);
    gradient.addColorStop(0, "rgba(8,15,35,0)");
    gradient.addColorStop(1, "rgba(8,15,35,.92)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#c4b5fd";
    context.font = `800 ${Math.round(width * 0.028)}px sans-serif`;
    context.fillText("공실뉴스", width * 0.06, height * 0.72);
    context.fillStyle = "#ffffff";
    context.font = `900 ${Math.round(width * 0.065)}px sans-serif`;
    context.textAlign = "center";
    const words = String(title || "").split(/\s+/);
    const lines = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (context.measureText(test).width > width * 0.86 && current) {
        lines.push(current);
        current = word;
      } else current = test;
    }
    if (current) lines.push(current);
    const lineHeight = width * 0.08;
    const baseY = height * 0.84 - (lines.length - 1) * lineHeight;
    lines.slice(0, 3).forEach((line, index) => context.fillText(line, width / 2, baseY + index * lineHeight));
    return new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.96));
  }

  function safeName(value) {
    return String(value || "image").replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim().slice(0, 80) || "image";
  }

  async function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    try {
      await chrome.downloads.download({ url, filename, saveAs: false, conflictAction: "uniquify" });
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    }
  }

  async function downloadScene(scene, index) {
    const ref = getSelectedMedia(scene);
    if (!ref) throw new Error("이 장면에 저장할 이미지가 없습니다.");
    const activeStyle = state.settings.styleLocked ? state.settings.imageStyle : (scene.imageStyle || state.settings.imageStyle);
    const ppt = activeStyle === "presentation";
    const blob = await composeImage(ref, scene.caption || scene.heading, state.settings.aspectRatio, ppt);
    await downloadBlob(blob, `공실뉴스-유튜브/${String(index + 1).padStart(2, "0")}-${safeName(scene.heading)}.png`);
  }

  async function downloadThumbnail() {
    const ref = state.thumbnail.candidates?.find((item) => item.id === state.thumbnail.selectedMediaId);
    if (!ref) throw new Error("썸네일 이미지를 먼저 만들거나 직접 넣어 주세요.");
    const blob = await composeImage(ref, state.thumbnail.text || state.script?.title, "16:9", true);
    await downloadBlob(blob, `공실뉴스-유튜브/${safeName(state.thumbnail.text || "thumbnail")}-썸네일.png`);
  }

  function fullScriptText() {
    if (!state.script) return "";
    const scenes = state.script.scenes.map((scene, index) => [
      `[장면 ${String(index + 1).padStart(2, "0")}] ${scene.heading}`,
      scene.narration,
      scene.caption ? `화면 자막: ${scene.caption}` : "",
      scene.visualPrompt ? `화면: ${scene.visualPrompt}` : "",
    ].filter(Boolean).join("\n")).join("\n\n");
    return `${state.script.title}\n\n${state.script.description || ""}\n\n${scenes}`.trim();
  }

  function prepareBulkImport(files) {
    const sorted = Array.from(files).sort((a, b) => gywNaturalCompare(a.name, b.name));
    pendingImport.forEach((item) => URL.revokeObjectURL(item.preview));
    pendingImport = sorted.map((file, index) => {
      const match = file.name.match(/(?:scene|장면)?[\s_-]*(\d{1,3})/i);
      const parsedIndex = match ? Number(match[1]) - 1 : index;
      return { file, preview: URL.createObjectURL(file), sceneIndex: Math.min(Math.max(parsedIndex, 0), state.script.scenes.length - 1) };
    });
    $("#importMappingList").innerHTML = pendingImport.map((item, index) => `
      <div class="mapping-row" data-import-index="${index}">
        <img src="${item.preview}" alt="">
        <div><small>${gywEscape(item.file.name)}</small><select>${state.script.scenes.map((scene, sceneIndex) =>
          `<option value="${sceneIndex}" ${sceneIndex === item.sceneIndex ? "selected" : ""}>${String(sceneIndex + 1).padStart(2, "0")} · ${gywEscape(scene.heading)}</option>`
        ).join("")}</select></div>
      </div>`).join("");
    $("#importDialog").showModal();
  }

  async function applyBulkImport() {
    const replace = $('input[name="importMode"]:checked')?.value === "replace";
    let applied = 0;
    for (const [index, item] of pendingImport.entries()) {
      const select = $(`[data-import-index="${index}"] select`, $("#importMappingList"));
      const scene = state.script.scenes[Number(select.value)];
      if (!scene || (!replace && getSelectedMedia(scene))) continue;
      const ref = await mediaFromFile(item.file);
      scene.mediaCandidates = [...(scene.mediaCandidates || []), ref];
      scene.selectedMediaId = ref.id;
      scene.imageStatus = "complete";
      applied += 1;
    }
    pendingImport.forEach((item) => URL.revokeObjectURL(item.preview));
    pendingImport = [];
    $("#importDialog").close();
    await save();
    renderImageScenes();
    toast(`${applied}개 장면에 이미지를 넣었습니다.`, "ok");
  }

  async function handleSceneEditorClick(event) {
    const action = event.target.closest("button[data-action]")?.dataset.action;
    if (!action) return;
    const card = event.target.closest("[data-scene-id]");
    const index = state.script.scenes.findIndex((scene) => scene.sceneId === card?.dataset.sceneId);
    if (index < 0) return;
    const scenes = state.script.scenes;
    if (action === "up" && index > 0) [scenes[index - 1], scenes[index]] = [scenes[index], scenes[index - 1]];
    if (action === "down" && index < scenes.length - 1) [scenes[index + 1], scenes[index]] = [scenes[index], scenes[index + 1]];
    if (action === "delete" && scenes.length > 1 && confirm("이 장면을 삭제할까요?")) scenes.splice(index, 1);
    if (action === "split") {
      const scene = scenes[index];
      const parts = scene.narration.split(/(?<=[.!?。])\s+/).filter(Boolean);
      const cut = parts.length > 1 ? Math.ceil(parts.length / 2) : Math.ceil(scene.narration.length / 2);
      const first = parts.length > 1 ? parts.slice(0, cut).join(" ") : scene.narration.slice(0, cut);
      const second = parts.length > 1 ? parts.slice(cut).join(" ") : scene.narration.slice(cut);
      scene.narration = first.trim();
      scene.imageStatus = scene.mediaCandidates.length ? "recheck" : "empty";
      scenes.splice(index + 1, 0, normalizeScene({ ...scene, sceneId: gywUid("scene"), heading: `${scene.heading} 2`, narration: second.trim(), mediaCandidates: [], selectedMediaId: null, imageStatus: "empty" }, index + 1));
    }
    if (action === "merge" && index < scenes.length - 1) {
      const next = scenes[index + 1];
      scenes[index].narration = `${scenes[index].narration} ${next.narration}`.trim();
      scenes[index].visualPrompt = `${scenes[index].visualPrompt} ${next.visualPrompt}`.trim();
      scenes[index].imageStatus = scenes[index].mediaCandidates.length ? "recheck" : "empty";
      scenes.splice(index + 1, 1);
    }
    await save();
    renderSceneEditors();
  }

  async function handleImageClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const card = button.closest("[data-scene-id]");
    const scene = state.script.scenes.find((item) => item.sceneId === card?.dataset.sceneId);
    if (!scene) return;
    const index = state.script.scenes.indexOf(scene);
    if (button.dataset.action === "generate") {
      let extra = "";
      if (getSelectedMedia(scene)) {
        const request = prompt("어떻게 수정할까요? 비워 두면 같은 장면의 새 버전을 만듭니다.", "");
        if (request === null) return;
        extra = request.trim();
      }
      await generateSceneImage(scene, extra);
    }
    if (button.dataset.action === "replace") {
      replaceSceneId = scene.sceneId;
      $("#replaceImageInput").click();
    }
    if (button.dataset.action === "previous") {
      const candidates = scene.mediaCandidates || [];
      if (candidates.length < 2) return toast("이전 이미지가 없습니다.");
      const current = candidates.findIndex((item) => item.id === scene.selectedMediaId);
      scene.selectedMediaId = candidates[(current - 1 + candidates.length) % candidates.length].id;
      scene.imageStatus = "complete";
      await save();
      renderImageScenes();
    }
    if (button.dataset.action === "delete") {
      scene.selectedMediaId = null;
      scene.imageStatus = "empty";
      await save();
      renderImageScenes();
    }
    if (button.dataset.action === "download") await downloadScene(scene, index);
  }

  function bind() {
    $("#brandVersion").textContent = `v${GYW.VERSION}`;
    $$(".nav-tab").forEach((button) => button.addEventListener("click", () => activateView(button.dataset.tab)));
    $("#btnRetryAccess").addEventListener("click", checkAccess);
    $("#sourceTypeGroup").addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-value]");
      if (!button) return;
      state.sourceType = button.dataset.value;
      await save();
      renderSource();
    });
    $("#platformGroup").addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-value]");
      if (!button) return;
      state.platform = button.dataset.value;
      state.aiTabId = null;
      await save();
      renderSource();
    });
    $$('[data-setting]').forEach((group) => group.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-value]");
      if (!button) return;
      state.settings[group.dataset.setting] = button.dataset.value;
      await save();
      renderSettings();
    }));
    $("#btnOpenSourcePage").addEventListener("click", () => runAction(() => openSourcePage()));
    $("#btnGrabSource").addEventListener("click", () => runAction(grabSource));
    $("#btnLoadUrl").addEventListener("click", () => runAction(async () => {
      const tab = await openSourcePage($("#sourceUrl").value.trim());
      await waitTabLoaded(tab.id);
      toast("페이지가 열렸습니다. 내용을 확인한 뒤 가져오기를 눌러 주세요.", "ok");
    }));
    $("#btnUseManual").addEventListener("click", () => runAction(applyManualSource));
    $("#btnGoScript").addEventListener("click", () => activateView("script"));
    $("#btnCreateScript").addEventListener("click", () => runAction(createScript));
    $("#btnPullScript").addEventListener("click", () => runAction(() => pullScript(false)));
    $("#videoTitle").addEventListener("input", async (event) => { state.script.title = event.target.value; await save(); });
    $("#videoDescription").addEventListener("input", async (event) => { state.script.description = event.target.value; await save(); });
    $("#sceneList").addEventListener("input", async (event) => {
      const field = event.target.dataset.field;
      const sceneId = event.target.closest("[data-scene-id]")?.dataset.sceneId;
      const scene = state.script.scenes.find((item) => item.sceneId === sceneId);
      if (!scene || !field) return;
      markSceneChanged(scene, field, event.target.value);
      await save();
      if (field === "heading") event.target.closest(".scene-card").querySelector(".scene-head strong").textContent = event.target.value;
    });
    $("#sceneList").addEventListener("click", (event) => runAction(() => handleSceneEditorClick(event)));
    $("#btnAddScene").addEventListener("click", () => runAction(async () => {
      state.script.scenes.push(normalizeScene({ heading: `장면 ${state.script.scenes.length + 1}` }, state.script.scenes.length));
      await save();
      renderSceneEditors();
    }));
    $("#btnRequestRevise").addEventListener("click", () => runAction(requestRevision));
    $("#btnPullRevision").addEventListener("click", () => runAction(() => pullScript(true)));
    $("#btnGoImages").addEventListener("click", () => activateView("images"));
    $("#imageStyleGrid").addEventListener("click", async (event) => {
      const button = event.target.closest("[data-style]");
      if (!button) return;
      state.settings.imageStyle = button.dataset.style;
      await save();
      renderImages();
    });
    $("#styleLocked").addEventListener("change", async (event) => {
      state.settings.styleLocked = event.target.checked;
      await save();
      renderImages();
    });
    $("#btnGenerateAll").addEventListener("click", () => runAction(() => runImageQueue("missing")));
    $("#btnRetryFailed").addEventListener("click", () => runAction(() => runImageQueue("failed")));
    $("#btnStopQueue").addEventListener("click", () => { queueStop = true; toast("현재 장면이 끝나면 중지합니다."); });
    $("#btnImportAll").addEventListener("click", () => $("#bulkImageInput").click());
    $("#bulkImageInput").addEventListener("change", (event) => {
      if (event.target.files?.length) prepareBulkImport(event.target.files);
      event.target.value = "";
    });
    $("#btnCancelImport").addEventListener("click", () => {
      pendingImport.forEach((item) => URL.revokeObjectURL(item.preview));
      pendingImport = [];
      $("#importDialog").close();
    });
    $("#importDialog").addEventListener("close", () => {
      pendingImport.forEach((item) => URL.revokeObjectURL(item.preview));
      pendingImport = [];
    });
    $("#btnApplyImport").addEventListener("click", () => runAction(applyBulkImport));
    $("#imageSceneList").addEventListener("click", (event) => runAction(() => handleImageClick(event)));
    $("#imageSceneList").addEventListener("change", async (event) => {
      if (!event.target.matches("[data-scene-style]")) return;
      const sceneId = event.target.closest("[data-scene-id]")?.dataset.sceneId;
      const scene = state.script.scenes.find((item) => item.sceneId === sceneId);
      if (!scene) return;
      scene.imageStyle = event.target.value;
      if (scene.mediaCandidates?.length) scene.imageStatus = "recheck";
      await save();
      renderImageScenes();
    });
    $("#replaceImageInput").addEventListener("change", (event) => runAction(async () => {
      const file = event.target.files?.[0];
      const scene = state.script.scenes.find((item) => item.sceneId === replaceSceneId);
      event.target.value = "";
      replaceSceneId = null;
      if (!file || !scene) return;
      const ref = await mediaFromFile(file);
      scene.mediaCandidates = [...(scene.mediaCandidates || []), ref];
      scene.selectedMediaId = ref.id;
      scene.imageStatus = "complete";
      await save();
      renderImageScenes();
    }));
    $("#btnSuggestThumb").addEventListener("click", async () => {
      state.thumbnail.suggestions = createThumbSuggestions();
      if (!state.thumbnail.text) state.thumbnail.text = state.thumbnail.suggestions[0] || "";
      await save();
      renderThumbnail();
    });
    $("#thumbSuggestions").addEventListener("click", async (event) => {
      const button = event.target.closest("[data-thumb-text]");
      if (!button) return;
      state.thumbnail.text = button.dataset.thumbText;
      await save();
      renderThumbnail();
    });
    $("#thumbText").addEventListener("input", async (event) => {
      state.thumbnail.text = event.target.value;
      $("#thumbOverlay").textContent = event.target.value;
      await save();
    });
    $("#btnGenerateThumb").addEventListener("click", () => runAction(generateThumbnail));
    $("#btnImportThumb").addEventListener("click", () => $("#thumbImageInput").click());
    $("#thumbImageInput").addEventListener("change", (event) => runAction(async () => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      const ref = await mediaFromFile(file);
      state.thumbnail.candidates = [...(state.thumbnail.candidates || []), ref];
      state.thumbnail.selectedMediaId = ref.id;
      await save();
      renderThumbnail();
    }));
    $("#btnDownloadThumb").addEventListener("click", () => runAction(downloadThumbnail));
    $("#btnCopyScript").addEventListener("click", () => runAction(async () => {
      await navigator.clipboard.writeText(fullScriptText());
      toast("전체 대본을 복사했습니다.", "ok");
    }));
    $("#btnDownloadImages").addEventListener("click", () => runAction(async () => {
      let count = 0;
      for (const [index, scene] of state.script.scenes.entries()) {
        if (!getSelectedMedia(scene)) continue;
        await downloadScene(scene, index);
        count += 1;
      }
      toast(`${count}개 장면 이미지를 저장했습니다.`, "ok");
    }));
    $("#btnReset").addEventListener("click", () => runAction(async () => {
      if (!confirm("유튜브 작업 내용과 직접 넣은 이미지를 모두 초기화할까요?")) return;
      await GYWMediaStore.clear();
      state = structuredClone(DEFAULT_STATE);
      await save();
      renderAll();
      toast("작업 내용을 초기화했습니다.", "ok");
    }));
  }

  async function runAction(work) {
    try {
      if (!accessGranted && work !== checkAccess) return;
      await work();
    } catch (error) {
      console.error(error);
      setStatus("확인 필요", "bad");
      toast(error.message || String(error), "bad");
    }
  }

  function renderAll() {
    renderSource();
    renderScript();
    renderImages();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await load();
      bind();
      renderAll();
      await checkAccess();
    } catch (error) {
      console.error(error);
      toast(error.message || String(error), "bad");
      setStatus("초기화 실패", "bad");
    }
  });
})();
