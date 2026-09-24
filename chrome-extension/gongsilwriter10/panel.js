/* ══════════════════════════════════════════════════════════════
   작업창 — 이 확장의 두뇌

   페이지들은 시키는 일만 한다. 판단과 상태는 전부 여기 있다.
   ══════════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  /* ─────────── 상태 ─────────── */
  const S = {
    platform: "chatgpt",
    kind: "news",      // 기사 스타일 — GW_KIND
    length: "normal",  // 분량 — GW_LENGTH
    imageStyle: "news",
    imageRequest: "",
    gongsilTabId: null,
    aiTabId: null,
    origin: "https://gongsilnews.com",
    vacancy: null,
    article: null,   // { title, subtitles[], body, keywords[] }
    media: [],       // [{ kind:'photo'|'proof'|'map'|'roadview'|'ai', url, caption }]
  };

  const $ = (id) => document.getElementById(id);

  const el = {
    status: $("statusPill"),
    tabWork: $("tabWork"), tabDraft: $("tabDraft"), draftBadge: $("draftBadge"),
    viewWork: $("viewWork"), viewDraft: $("viewDraft"),
    btnGoGongsil: $("btnGoGongsil"), btnGrab: $("btnGrab"),
    vacancyCard: $("vacancyCard"), vacancyName: $("vacancyName"), vacancyFields: $("vacancyFields"),
    btnOpenAi: $("btnOpenAi"), btnSubmit: $("btnSubmit"), btnPullDraft: $("btnPullDraft"),
    draftEmpty: $("draftEmpty"), draftBody: $("draftBody"), draftActions: $("draftActions"),
    pvDate: $("pvDate"), pvTitle: $("pvTitle"), pvSubtitle: $("pvSubtitle"),
    pvCover: $("pvCover"), pvContent: $("pvContent"), pvKeywords: $("pvKeywords"),
    reviseInput: $("reviseInput"), btnRevise: $("btnRevise"),
    imageRequest: $("imageRequest"),
    btnMakeImage: $("btnMakeImage"), btnChangeImage: $("btnChangeImage"), fileImage: $("fileImage"),
    btnSendGongsil: $("btnSendGongsil"),
    toastHost: $("toastHost"),
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ═════════════ 알림 ═════════════ */
  function toast(message, kind = "info", ms = 4000) {
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

  /* 누르는 동안 잠가 둔다 — 두 번 눌러 생기는 사고를 막는다 */
  async function guard(btn, busyText, fn) {
    const keep = btn.innerHTML;
    btn.disabled = true;
    status(busyText, "busy");
    try {
      await fn();
    } catch (e) {
      console.error("[공실뉴스 작업창]", e);
      toast(e.message || String(e), "bad", 7000);
      status("문제 발생", "bad");
    } finally {
      btn.disabled = false;
      btn.innerHTML = keep;
      refreshButtons();
    }
  }

  /* ═════════════ 탭 다루기 ═════════════ */
  const GONGSIL_URLS = [
    "https://gongsilnews.com/gongsil*",
    "https://*.gongsilnews.com/gongsil*",
    "http://localhost/gongsil*",
  ];

  async function findTab(patterns) {
    const tabs = await chrome.tabs.query({ url: patterns });
    return tabs.length ? tabs[0] : null;
  }

  async function askTab(tabId, msg) {
    if (!tabId) throw new Error("대상 탭이 없습니다.");
    try {
      const res = await chrome.tabs.sendMessage(tabId, msg);
      if (res === undefined) throw new Error("탭이 응답하지 않았습니다.");
      return res;
    } catch (e) {
      throw new Error(
        "탭과 연결되지 않았습니다. 그 탭을 한 번 새로고침(F5)한 뒤 다시 눌러 주세요. (" + e.message + ")"
      );
    }
  }

  /* ═════════════ ① 공실열람 페이지 이동 ═════════════ */
  el.btnGoGongsil.addEventListener("click", () =>
    guard(el.btnGoGongsil, "공실열람 여는 중", async () => {
      const found = await findTab(GONGSIL_URLS);

      if (found) {
        await chrome.tabs.update(found.id, { active: true });
        await chrome.windows.update(found.windowId, { focused: true });
        S.gongsilTabId = found.id;
        S.origin = new URL(found.url).origin;
        toast("이미 열려 있는 공실열람 탭으로 이동했습니다.", "info");
      } else {
        const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
        const url = "https://www.gongsilnews.com/gongsil";
        const tab = active
          ? await chrome.tabs.update(active.id, { url })
          : await chrome.tabs.create({ url });
        S.gongsilTabId = tab.id;
        S.origin = "https://www.gongsilnews.com";
        toast("공실열람으로 이동했습니다. 매물을 하나 펼쳐 주세요.", "info");
      }

      status("공실열람 열림", "ok");
      save();
    })
  );

  /* ═════════════ ② 물건 가져오기 (+ 사진 4종) ═════════════ */
  el.btnGrab.addEventListener("click", () =>
    guard(el.btnGrab, "매물 읽는 중", async () => {
      let tab = S.gongsilTabId ? await chrome.tabs.get(S.gongsilTabId).catch(() => null) : null;
      if (!tab || !/\/gongsil/.test(tab.url || "")) tab = await findTab(GONGSIL_URLS);

      if (!tab) throw new Error("공실열람 탭이 없습니다. 먼저 [공실열람 페이지 이동] 을 눌러 주세요.");

      S.gongsilTabId = tab.id;
      S.origin = new URL(tab.url).origin;

      const res = await askTab(tab.id, { type: "GW_GET_VACANCY" });
      if (!res.ok) throw new Error(res.reason || "매물을 읽지 못했습니다.");

      S.vacancy = res.vacancy;
      renderVacancy(S.vacancy);

      const n = (S.vacancy.fields || []).length;
      toast(`매물 정보 ${n}개 항목을 가져왔습니다. 이제 사진을 찍습니다.`, "ok");

      /* 사진 4종 — 찍는 동안 공실열람 탭이 화면에 보여야 한다 */
      status("사진 찍는 중", "busy");
      S.media = await captureMedia(tab, S.vacancy);
      renderDraft();

      const shots = S.media.map((m) => m.kind);
      toast(
        `사진 ${S.media.length}장 준비됨 (매물 ${shots.filter((k) => k === "photo").length}장 · 검증 · 지도 · 로드뷰)`,
        "ok",
        5000
      );
      status("매물 준비됨", "ok");
      save();
    })
  );

  function renderVacancy(v) {
    const rows = [];
    if (v.priceText) rows.push(["금액", v.priceText]);
    for (const f of v.fields || []) rows.push([f.label, f.value]);
    if ((v.themes || []).length) rows.push(["특징", v.themes.join(" ")]);
    if (v.infra) rows.push(["주변환경", v.infra]);
    if ((v.images || []).length) rows.push(["등록 사진", `${v.images.length}장`]);

    el.vacancyName.textContent = v.title || "-";
    el.vacancyFields.innerHTML = rows
      .map(([k, val]) => `<div class="vf-row"><dt>${esc(k)}</dt><dd>${esc(val)}</dd></div>`)
      .join("");
    el.vacancyCard.classList.remove("hidden");
  }

  /* ═════════════ 사진 4종 만들기 ═════════════ */
  async function captureMedia(tab, v) {
    const media = [];

    /* 1. 매물 등록 사진 — 있는 만큼 전부 */
    (v.images || []).forEach((url, i) => {
      media.push({ kind: "photo", url, caption: gwCaptionFor("photo", v, i) });
    });

    /* 캡쳐는 그 탭이 화면에 보일 때만 된다 */
    tab = await activateCaptureTab(tab);

    /* 2·3·4. 공실열람 검증 · 지도 · 로드뷰 */
    const failures = [];

    for (const shot of SHOTS) {
      const got = await captureOne(tab, shot);
      if (got.url) {
        media.push({ kind: shot.target, url: got.url, caption: gwCaptionFor(shot.target, v), real: true });
      } else {
        failures.push(`${shot.name}: ${got.reason}`);
        media.push({ kind: shot.target, url: shot.fallback(v), caption: gwCaptionFor(shot.target, v), real: false });
      }
    }

    await askTab(tab.id, { type: "GW_RESTORE_SCROLL" }).catch(() => {});

    /* 실패를 감추지 않는다. 무엇이 왜 안 됐는지 그대로 말한다. */
    if (failures.length) {
      console.warn("[공실뉴스] 캡쳐 실패\n" + failures.join("\n"));
      toast("캡쳐 안 된 것 — " + failures.join(" / "), "bad", 12000);
    }

    return media;
  }

  const SHOTS = [
    { target: "proof", name: "공실열람 검증", force16x9: true, fallback: gwProofCard },
    { target: "map", name: "지도", force16x9: false, fallback: gwMapCard },
    { target: "roadview", name: "로드뷰", force16x9: false, fallback: gwRoadviewCard },
  ];

  /* 화면 캡쳐는 초당 두 번까지만 허용된다. 그 간격을 지킨다. */
  let lastShotAt = 0;
  async function throttleShot() {
    const gap = Date.now() - lastShotAt;
    if (gap < 700) await sleep(700 - gap);
    lastShotAt = Date.now();
  }

  async function activateCaptureTab(tab) {
    if (!tab || !tab.id) throw new Error("캡쳐할 공실열람 탭이 없습니다.");

    const liveTab = await chrome.tabs.get(tab.id);
    await chrome.tabs.update(liveTab.id, { active: true });
    await chrome.windows.update(liveTab.windowId, { focused: true });
    await sleep(250);

    const [active] = await chrome.tabs.query({ active: true, windowId: liveTab.windowId });
    if (!active || active.id !== liveTab.id) {
      throw new Error("공실열람 탭을 화면 앞으로 가져오지 못했습니다.");
    }

    return active;
  }

  async function captureOne(tab, shot) {
    try {
      tab = await activateCaptureTab(tab);
    } catch (e) {
      return { url: null, reason: e.message || "공실열람 탭 활성화 실패" };
    }

    /* ① 찍을 곳으로 굴리고 좌표를 받는다 */
    let prep;
    try {
      prep = await askTab(tab.id, { type: "GW_PREPARE_SHOT", target: shot.target });
    } catch (e) {
      return { url: null, reason: e.message || "탭과 연결 안 됨" };
    }
    if (!prep.ok) return { url: null, reason: prep.reason || "화면에서 못 찾음" };

    /* ② 화면을 찍는다 — 한 번 실패하면 한 번 더 */
    let raw = null;
    let lastErr = "";
    for (let attempt = 0; attempt < 2 && !raw; attempt++) {
      await throttleShot();
      try {
        tab = await activateCaptureTab(tab);
        raw = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 90 });
      } catch (e) {
        lastErr = e.message || String(e);
        await sleep(500);
      }
    }
    if (!raw) return { url: null, reason: "화면 촬영 실패 — " + (lastErr || "알 수 없음") };

    /* ③ 좌표대로 잘라낸다 */
    const url = await gwCropRegion(raw, prep.rect, prep.viewport, shot.force16x9);
    if (!url) return { url: null, reason: "자르기 실패" };

    return { url, reason: "" };
  }

  /* 사진 한 장만 다시 찍기 */
  async function recapture(index) {
    const m = S.media[index];
    if (!m) return;
    const shot = SHOTS.find((s) => s.target === m.kind);
    if (!shot) {
      toast("이 사진은 다시 찍을 수 없습니다 (캡쳐로 만든 것이 아닙니다).", "bad");
      return;
    }

    let tab = S.gongsilTabId ? await chrome.tabs.get(S.gongsilTabId).catch(() => null) : null;
    if (!tab) tab = await findTab(GONGSIL_URLS);
    if (!tab) throw new Error("공실열람 탭이 없습니다.");

    await chrome.tabs.update(tab.id, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
    await sleep(400);

    const got = await captureOne(tab, shot);
    await askTab(tab.id, { type: "GW_RESTORE_SCROLL" }).catch(() => {});

    if (!got.url) {
      toast(`${shot.name} 다시 찍기 실패 — ${got.reason}`, "bad", 9000);
      return;
    }

    S.media[index] = Object.assign({}, m, { url: got.url, real: true });
    renderDraft();
    save();
    toast(`${shot.name} 을(를) 다시 찍었습니다.`, "ok");
  }

  /* ═════════════ ③ AI 선택 ═════════════ */
  const platformBtns = document.querySelectorAll(".choice[data-platform]");
  platformBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      platformBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      S.platform = btn.dataset.platform;
      S.aiTabId = null; /* AI 를 바꾸면 이전 탭은 우리 대화가 아니다 */
      refreshButtons();
      save();
    });
  });

  const aiConf = () => (S.platform === "gemini" ? GW.GEMINI : GW.CHATGPT);

  /* ═════════════ 기사 스타일 · 분량 ═════════════ */
  const kindBtns = document.querySelectorAll(".choice[data-kind]");
  kindBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      kindBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      S.kind = btn.dataset.kind;
      save();
    });
  });

  const lenBtns = document.querySelectorAll(".chip[data-length]");
  lenBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      lenBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      S.length = btn.dataset.length;
      save();
    });
  });

  const promptOpts = () => ({ kind: S.kind, length: S.length });

  /* ═════════════ ④ AI 기사 작성 ═════════════ */
  el.btnOpenAi.addEventListener("click", () =>
    guard(el.btnOpenAi, "AI 탭 여는 중", async () => {
      if (!S.vacancy) throw new Error("먼저 [물건 가져오기] 를 해 주세요.");

      const conf = aiConf();
      const tab = await chrome.tabs.create({ url: conf.URL, active: true });
      S.aiTabId = tab.id;
      save();

      await waitTabReady(tab.id);
      await sleep(1200);

      const res = await askTab(tab.id, {
        type: "GW_FILL",
        text: gwBuildPrompt(S.vacancy, promptOpts()),
      });
      if (!res.ok) throw new Error(res.reason || "프롬프트를 넣지 못했습니다.");

      const k = GW_KIND[S.kind] || GW_KIND.news;
      const l = GW_LENGTH[S.length] || GW_LENGTH.normal;
      toast(`${k.label} · ${l.chars} 로 프롬프트를 넣었습니다. ② 작성하기 를 누르세요.`, "ok", 6000);
      status("프롬프트 입력됨", "ok");
    })
  );

  function waitTabReady(tabId, timeoutMs = 30000) {
    return new Promise((resolve) => {
      const finish = () => {
        chrome.tabs.onUpdated.removeListener(onUpd);
        resolve();
      };
      const timer = setTimeout(finish, timeoutMs);
      const onUpd = (id, info) => {
        if (id === tabId && info.status === "complete") {
          clearTimeout(timer);
          finish();
        }
      };
      chrome.tabs.onUpdated.addListener(onUpd);
      chrome.tabs.get(tabId).then((t) => {
        if (t.status === "complete") {
          clearTimeout(timer);
          finish();
        }
      }).catch(() => {});
    });
  }

  /* ═════════════ ⑤ 작성하기 ═════════════ */
  el.btnSubmit.addEventListener("click", () =>
    guard(el.btnSubmit, "전송 중", async () => {
      if (!S.aiTabId) throw new Error("먼저 ① AI 기사 작성 을 눌러 주세요.");
      await chrome.tabs.update(S.aiTabId, { active: true });
      const res = await askTab(S.aiTabId, { type: "GW_SUBMIT" });
      if (!res.ok) throw new Error(res.reason || "전송 버튼을 누르지 못했습니다.");
      toast("전송했습니다. 기사가 다 나오면 ③ 초안 보내기 를 누르세요.", "ok");
      status("AI 작성 중", "busy");
    })
  );

  /* ═════════════ ⑥ 초안 보내기 ═════════════ */
  el.btnPullDraft.addEventListener("click", () =>
    guard(el.btnPullDraft, "기사 읽는 중", async () => {
      if (!S.aiTabId) throw new Error("먼저 ① AI 기사 작성 을 눌러 주세요.");
      await pullArticle();
      toast("초안을 가져왔습니다.", "ok");
      status("초안 준비됨", "ok");
      switchTab("draft");
    })
  );

  async function pullArticle() {
    const res = await askTab(S.aiTabId, { type: "GW_READ" });
    if (!res.ok) throw new Error(res.reason || "응답을 읽지 못했습니다.");

    const parsed = gwParseArticleJson(res.text);
    if (!parsed.ok) {
      throw new Error(
        parsed.reason + " AI 탭에서 'JSON 형식으로 다시 출력해줘' 라고 한 번 더 요청한 뒤 다시 눌러 주세요."
      );
    }

    S.article = parsed.article;
    draftInsertSlot = null;
    pendingAiInsertSlot = null;
    pendingAiPreviousImage = null;
    pendingAiRequestKey = "";
    renderDraft();
    save();
  }

  /* ═════════════ 초안 미리보기 ═════════════ */

  /* 사진 한 장을 기사 안에 넣는 모양.
     contenteditable="false" 라 본문을 고쳐도 사진이 망가지지 않는다.
     설명글만 따로 고칠 수 있게 열어 둔다. */
  function figureHtml(m, idx) {
    const canReshoot = SHOTS.some((s) => s.target === m.kind);
    const warn = canReshoot && m.real === false
      ? `<span class="fig-warn">캡쳐 실패 · 대체 카드</span>`
      : "";
    return (
      `<figure class="art-fig" contenteditable="false" data-mi="${idx}">` +
      `<img src="${esc(m.url)}" alt="">` +
      `<div class="fig-tools">` +
      warn +
      `<button type="button" class="fig-btn" data-act="replace" data-mi="${idx}">사진 바꾸기</button>` +
      (canReshoot
        ? `<button type="button" class="fig-btn" data-act="reshoot" data-mi="${idx}">다시 찍기</button>`
        : "") +
      `<button type="button" class="fig-btn del" data-act="remove" data-mi="${idx}">삭제</button>` +
      `</div>` +
      `<figcaption class="art-cap" contenteditable="true" spellcheck="false">${esc(m.caption || "")}</figcaption>` +
      `</figure>`
    );
  }

  /* 사진 버튼은 새로 그릴 때마다 생기므로 위임해서 받는다 */
  let replaceIndex = -1;
  let fileInsertSlot = null;
  let pendingAiInsertSlot = null;
  let pendingAiPreviousImage = null;
  let pendingAiRequestKey = "";
  let draftInsertSlot = null;

  function directDraftParagraphs() {
    return Array.from(el.pvContent.children).filter((node) => node.tagName === "P");
  }

  /*
     커서는 버튼을 누르는 순간 본문에서 사라진다. 그래서 본문 안에서 움직일 때마다
     "앞에 문단이 몇 개 있는 자리인지"를 기억한다. 사진은 그 문단 슬롯에 꽂힌다.
  */
  function rememberDraftCursor() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !S.article) return;

    const range = sel.getRangeAt(0);
    if (!el.pvContent.contains(range.startContainer) && range.startContainer !== el.pvContent) return;

    const paras = directDraftParagraphs();
    const startElm = range.startContainer.nodeType === Node.ELEMENT_NODE
      ? range.startContainer
      : range.startContainer.parentElement;
    const currentP = startElm && startElm.closest ? startElm.closest("p") : null;

    if (currentP && currentP.parentElement === el.pvContent) {
      const index = paras.indexOf(currentP);
      const beforeCaret = document.createRange();
      beforeCaret.selectNodeContents(currentP);
      try {
        beforeCaret.setEnd(range.startContainer, range.startOffset);
      } catch (e) {
        draftInsertSlot = Math.max(0, index + 1);
        return;
      }
      draftInsertSlot = Math.max(0, index + (beforeCaret.toString().length > 0 ? 1 : 0));
      return;
    }

    if (range.startContainer === el.pvContent) {
      draftInsertSlot = Array.from(el.pvContent.children)
        .slice(0, range.startOffset)
        .filter((node) => node.tagName === "P").length;
    }
  }

  function requireDraftInsertSlot() {
    rememberDraftCursor();
    if (!Number.isInteger(draftInsertSlot)) {
      toast("초안 본문에서 이미지를 넣을 위치를 먼저 클릭해 주세요.", "bad", 6000);
      return null;
    }
    return Math.max(0, Math.min(draftInsertSlot, directDraftParagraphs().length));
  }

  function focusInsertedFigure(index) {
    requestAnimationFrame(() => {
      const fig = el.pvContent.querySelector(`.art-fig[data-mi="${index}"]`);
      if (!fig) return;
      fig.scrollIntoView({ behavior: "smooth", block: "center" });
      const range = document.createRange();
      range.setStartAfter(fig);
      range.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      rememberDraftCursor();
    });
  }

  function onFigClick(e) {
    const btn = e.target.closest(".fig-btn");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    const idx = Number(btn.dataset.mi);
    const act = btn.dataset.act;

    if (act === "replace") {
      replaceIndex = idx;
      fileInsertSlot = null;
      el.fileImage.click();
      return;
    }

    if (act === "remove") {
      S.media.splice(idx, 1);
      renderDraft();
      save();
      toast("사진을 뺐습니다.", "ok");
      return;
    }

    if (act === "reshoot") {
      guard(btn, "다시 찍는 중", () => recapture(idx));
    }
  }

  el.pvContent.addEventListener("click", onFigClick);
  el.pvCover.addEventListener("click", onFigClick);
  ["mouseup", "keyup", "input", "focus"].forEach((eventName) => {
    el.pvContent.addEventListener(eventName, rememberDraftCursor);
  });
  document.addEventListener("selectionchange", rememberDraftCursor);

  function renderDraft() {
    const a = S.article;

    if (!a) {
      el.draftEmpty.classList.remove("hidden");
      el.draftBody.classList.add("hidden");
      el.draftActions.classList.add("hidden");
      /* 기사 전이라도 찍어 둔 사진은 볼 수 있게 한다 */
      renderCover();
      return;
    }

    el.draftEmpty.classList.add("hidden");
    el.draftBody.classList.remove("hidden");
    el.draftActions.classList.remove("hidden");
    el.draftBadge.classList.remove("hidden");

    el.pvDate.textContent = new Date().toLocaleString("ko-KR", {
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    });
    el.pvTitle.textContent = a.title || "";
    el.pvSubtitle.textContent = (a.subtitles || []).join("\n");
    el.pvKeywords.innerHTML = (a.keywords || [])
      .map((k) => `<span class="kw-tag">#${esc(k)}</span>`)
      .join("");

    renderCover();

    /* ── 본문과 사진을 번갈아 놓는다 ──
       첫 장은 제목 아래 대표로 올라갔으니, 나머지를 문단 사이에 하나씩 끼운다.
       "각각 내용 위에" — 사진이 그 다음 문단을 이끄는 모양이 된다. */
    const paras = String(a.body || "")
      .split(/\n{2,}|\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    const rest = S.media.slice(1).map((media, offset) => ({ media, index: offset + 1 }));
    const slots = Array.from({ length: paras.length + 1 }, () => []);
    const automatic = [];

    rest.forEach((item) => {
      if (Number.isInteger(item.media.insertAfterParagraph)) {
        const slot = Math.max(0, Math.min(item.media.insertAfterParagraph, paras.length));
        slots[slot].push(item);
      } else {
        automatic.push(item);
      }
    });

    /* 위치를 직접 지정하지 않은 기존 사진은 예전처럼 문단 사이에 자동 배치한다. */
    let autoIndex = 0;
    for (let slot = 1; slot < paras.length && autoIndex < automatic.length; slot += 1) {
      slots[slot].push(automatic[autoIndex]);
      autoIndex += 1;
    }
    while (autoIndex < automatic.length) {
      slots[paras.length].push(automatic[autoIndex]);
      autoIndex += 1;
    }

    const figuresAt = (slot) => slots[slot]
      .map((item) => figureHtml(item.media, item.index))
      .join("");

    let html = figuresAt(0);
    paras.forEach((p, i) => {
      const headingClass = p.startsWith("■") ? ' class="article-section-heading"' : "";
      html += `<p${headingClass}>${esc(p)}</p>`;
      html += figuresAt(i + 1);
    });

    el.pvContent.innerHTML = html;
    bindCaptionEdits();
  }

  function renderCover() {
    const cover = S.media[0];
    if (!cover) {
      el.pvCover.classList.add("hidden");
      el.pvCover.innerHTML = "";
      return;
    }
    el.pvCover.classList.remove("hidden");
    el.pvCover.innerHTML = figureHtml(cover, 0);
    bindCaptionEdits();
  }

  /* 설명글을 고치면 상태에 담는다 */
  function bindCaptionEdits() {
    document.querySelectorAll(".art-fig").forEach((fig) => {
      const idx = Number(fig.dataset.mi);
      const cap = fig.querySelector(".art-cap");
      if (!cap || cap.dataset.bound) return;
      cap.dataset.bound = "1";
      cap.addEventListener("blur", () => {
        if (S.media[idx]) S.media[idx].caption = cap.innerText.trim();
        save();
      });
    });
  }

  /* 손으로 고친 것을 상태에 담는다 — 보낼 때 그대로 나가야 한다.
     본문은 <p> 만 읽는다. 사진(figure)은 건드리지 않는다. */
  function harvestEdits() {
    if (!S.article) return;
    S.article.title = el.pvTitle.innerText.trim();
    S.article.subtitles = el.pvSubtitle.innerText.split("\n").map((s) => s.trim()).filter(Boolean);
    S.article.body = Array.from(el.pvContent.querySelectorAll("p"))
      .map((p) => p.innerText.trim())
      .filter(Boolean)
      .join("\n\n");
  }

  ["pvTitle", "pvSubtitle", "pvContent"].forEach((id) => {
    el[id].addEventListener("blur", () => {
      harvestEdits();
      save();
    });
  });

  /* ═════════════ ⑦ 수정 요청 ═════════════ */
  el.btnRevise.addEventListener("click", () => doRevise());
  el.reviseInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doRevise();
  });

  function doRevise() {
    const want = el.reviseInput.value.trim();
    if (!want) {
      toast("고칠 점을 적어 주세요.", "bad");
      return;
    }
    guard(el.btnRevise, "수정 요청 중", async () => {
      if (!S.aiTabId) throw new Error("AI 탭이 없습니다. 초안을 만든 탭이 닫혔습니다.");

      harvestEdits();
      await chrome.tabs.update(S.aiTabId, { active: true });

      const fill = await askTab(S.aiTabId, { type: "GW_FILL", text: gwBuildRevisePrompt(want) });
      if (!fill.ok) throw new Error(fill.reason || "수정 요청을 넣지 못했습니다.");

      const sent = await askTab(S.aiTabId, { type: "GW_SUBMIT" });
      if (!sent.ok) throw new Error(sent.reason || "전송하지 못했습니다.");

      toast("수정을 요청했습니다. 다시 나오면 가져옵니다.", "info");
      await sleep(2500);

      await pullArticle();
      el.reviseInput.value = "";
      toast("수정된 기사를 가져왔습니다.", "ok");
      status("초안 갱신됨", "ok");
    });
  }

  /* ═════════════ ⑦ 이미지 ═════════════ */
  const imageStyleBtns = document.querySelectorAll(".image-style[data-image-style]");
  imageStyleBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      imageStyleBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      S.imageStyle = btn.dataset.imageStyle;
      save();
    });
  });

  el.imageRequest.addEventListener("change", () => {
    S.imageRequest = el.imageRequest.value.trim();
    save();
  });

  el.btnMakeImage.addEventListener("click", () =>
    guard(el.btnMakeImage, "이미지 요청 중", async () => {
      if (!S.aiTabId) throw new Error("AI 탭이 없습니다.");
      if (!S.article) throw new Error("먼저 초안을 가져와 주세요.");

      S.imageRequest = el.imageRequest.value.trim();
      const currentRequestKey = JSON.stringify([S.imageStyle, S.imageRequest]);

      /* 이전 요청과 다른 스타일·내용이면 기다리지 않고 새 이미지 요청으로 전환한다. */
      if (Number.isInteger(pendingAiInsertSlot) && pendingAiRequestKey !== currentRequestKey) {
        pendingAiInsertSlot = null;
        pendingAiPreviousImage = null;
        pendingAiRequestKey = "";
      }

      const slot = Number.isInteger(pendingAiInsertSlot)
        ? pendingAiInsertSlot
        : requireDraftInsertSlot();
      if (!Number.isInteger(slot)) return;

      /* 요청한 뒤 두 번째 클릭이면 새로 완성된 그림만 집는다. */
      if (Number.isInteger(pendingAiInsertSlot)) {
        const already = await askTab(S.aiTabId, { type: "GW_GET_IMAGE" }).catch(() => null);
        const beforeCount = Number(pendingAiPreviousImage && pendingAiPreviousImage.count) || 0;
        const nowCount = Number(already && already.count) || 0;
        const isNewImage = already && already.ok && already.url &&
          (already.url !== (pendingAiPreviousImage && pendingAiPreviousImage.url) || nowCount > beforeCount) &&
          !S.media.some((m) => m.url === already.url);

        if (isNewImage) {
          addAiImage(already.url, slot);
          pendingAiInsertSlot = null;
          pendingAiPreviousImage = null;
          pendingAiRequestKey = "";
          toast("AI 이미지를 커서 위치에 넣었습니다.", "ok");
          return;
        }

        toast("AI 이미지가 아직 만들어지는 중입니다. 완성된 뒤 다시 눌러 주세요.", "info", 5000);
        status("이미지 생성 중", "busy");
        return;
      }

      harvestEdits();
      save();
      const beforeImage = await askTab(S.aiTabId, { type: "GW_GET_IMAGE" }).catch(() => null);
      pendingAiPreviousImage = beforeImage && beforeImage.ok
        ? { url: beforeImage.url, count: Number(beforeImage.count) || 0 }
        : { url: "", count: 0 };
      await chrome.tabs.update(S.aiTabId, { active: true });

      const fill = await askTab(S.aiTabId, {
        type: "GW_FILL",
        text: gwBuildImagePrompt(S.vacancy, S.article, {
          style: S.imageStyle,
          request: S.imageRequest,
        }),
      });
      if (!fill.ok) throw new Error(fill.reason || "이미지 요청을 넣지 못했습니다.");

      const sent = await askTab(S.aiTabId, { type: "GW_SUBMIT" });
      if (!sent.ok) throw new Error(sent.reason || "전송하지 못했습니다.");

      pendingAiInsertSlot = slot;
      pendingAiRequestKey = currentRequestKey;
      const imageStyle = GW_IMAGE_STYLE[S.imageStyle] || GW_IMAGE_STYLE.news;
      toast(`${imageStyle.label} 이미지를 요청했습니다. 그림이 다 나온 뒤 [AI 이미지 만들기] 를 한 번 더 누르세요.`, "info", 7000);
      status("이미지 생성 중", "busy");
    })
  );

  function addAiImage(url, insertAfterParagraph) {
    S.media.push({
      kind: "ai",
      url,
      caption: gwCaptionFor("photo", S.vacancy || {}, 0),
      insertAfterParagraph,
    });
    const insertedIndex = S.media.length - 1;
    renderDraft();
    save();
    focusInsertedFigure(insertedIndex);
    status("이미지 추가됨", "ok");
  }

  /* 하단 바의 [이미지 삽입] 은 PC 사진을 커서 위치에 넣는다. */
  el.btnChangeImage.addEventListener("click", () => {
    const slot = requireDraftInsertSlot();
    if (!Number.isInteger(slot)) return;
    replaceIndex = -1;
    fileInsertSlot = slot;
    el.fileImage.click();
  });

  el.fileImage.addEventListener("change", () => {
    const file = el.fileImage.files && el.fileImage.files[0];
    el.fileImage.value = "";
    if (!file) return;

    const idx = replaceIndex;
    const slot = fileInsertSlot;
    replaceIndex = -1;
    fileInsertSlot = null;

    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result;
      if (idx >= 0 && S.media[idx]) {
        S.media[idx] = Object.assign({}, S.media[idx], { url, kind: "upload", real: true });
        toast(`${idx === 0 ? "대표 " : ""}사진을 바꿨습니다.`, "ok");
      } else {
        S.media.push({
          kind: "upload",
          url,
          caption: "",
          real: true,
          insertAfterParagraph: Number.isInteger(slot) ? slot : directDraftParagraphs().length,
        });
        toast("사진을 커서 위치에 넣었습니다.", "ok");
      }
      const insertedIndex = idx >= 0 ? idx : S.media.length - 1;
      renderDraft();
      save();
      if (idx < 0) focusInsertedFigure(insertedIndex);
    };
    reader.onerror = () => toast("이미지를 읽지 못했습니다.", "bad");
    reader.readAsDataURL(file);
  });

  /* ═════════════ ⑧ 공실뉴스로 보내기 ═════════════ */
  el.btnSendGongsil.addEventListener("click", () =>
    guard(el.btnSendGongsil, "보내는 중", async () => {
      if (!S.article) throw new Error("보낼 초안이 없습니다.");

      harvestEdits();

      if (!S.article.title || !S.article.body) {
        throw new Error("제목과 본문이 있어야 보낼 수 있습니다.");
      }

      const res = await chrome.runtime.sendMessage({
        type: "GW_SEND_TO_GONGSIL",
        article: S.article,
        media: S.media,
        vacancyId: S.vacancy?.vacancyId || null,
        origin: S.origin,
      });

      if (!res || !res.ok) throw new Error((res && res.error) || "기사쓰기 페이지를 열지 못했습니다.");

      toast("기사쓰기 폼에 채웠습니다. 확인 후 [기사 등록] 을 눌러 주세요.", "ok", 7000);
      status("전송 완료", "ok");
    })
  );

  /* ═════════════ 탭 전환 ═════════════ */
  function switchTab(which) {
    const work = which === "work";
    el.tabWork.classList.toggle("active", work);
    el.tabDraft.classList.toggle("active", !work);
    el.viewWork.classList.toggle("active", work);
    el.viewDraft.classList.toggle("active", !work);
    el.draftActions.classList.toggle("hidden", work || !S.article);
    if (!work) el.draftBadge.classList.add("hidden");
  }

  el.tabWork.addEventListener("click", () => switchTab("work"));
  el.tabDraft.addEventListener("click", () => switchTab("draft"));

  /* ═════════════ 버튼 잠금 ═════════════ */
  function refreshButtons() {
    el.btnOpenAi.disabled = !S.vacancy;
    el.btnSubmit.disabled = !S.aiTabId;
    el.btnPullDraft.disabled = !S.aiTabId;
    el.btnRevise.disabled = !S.article || !S.aiTabId;
    el.btnMakeImage.disabled = !S.article || !S.aiTabId;
    el.btnChangeImage.disabled = !S.article;
    el.btnSendGongsil.disabled = !S.article;
  }

  /* ═════════════ 상태 보관 ═════════════ */
  const STATE_KEY = "gw_panel_state";

  let lastSaveError = "";

  function save() {
    chrome.storage.local.set({ [STATE_KEY]: S }).catch((e) => {
      const msg = e.message || String(e);
      console.warn("[공실뉴스] 상태 저장 실패:", msg);
      /* 같은 말을 반복해서 띄우지 않는다 */
      if (msg !== lastSaveError) {
        lastSaveError = msg;
        toast("작업 내용을 저장하지 못했습니다 — " + msg, "bad", 9000);
      }
    });
  }

  async function restore() {
    const got = await chrome.storage.local.get(STATE_KEY);
    const prev = got[STATE_KEY];
    if (!prev) return;
    Object.assign(S, prev);
    if (!Array.isArray(S.media)) S.media = [];
    /* 예전 3가지 기사 성격을 저장한 사용자는 현재 기사형으로 안전하게 옮긴다. */
    if (["listing", "area", "tenant"].includes(S.kind)) S.kind = "news";
    if (!GW_KIND[S.kind]) S.kind = "news";
    if (!GW_LENGTH[S.length]) S.length = "normal";
    if (!GW_IMAGE_STYLE[S.imageStyle]) S.imageStyle = "news";
    if (typeof S.imageRequest !== "string") S.imageRequest = "";

    platformBtns.forEach((b) => b.classList.toggle("active", b.dataset.platform === S.platform));
    kindBtns.forEach((b) => b.classList.toggle("active", b.dataset.kind === S.kind));
    lenBtns.forEach((b) => b.classList.toggle("active", b.dataset.length === S.length));
    imageStyleBtns.forEach((b) => b.classList.toggle("active", b.dataset.imageStyle === S.imageStyle));
    el.imageRequest.value = S.imageRequest;

    /* 기억해 둔 탭이 아직 살아 있는지 확인한다 */
    for (const key of ["gongsilTabId", "aiTabId"]) {
      if (S[key]) {
        const alive = await chrome.tabs.get(S[key]).catch(() => null);
        if (!alive) S[key] = null;
      }
    }

    if (S.vacancy) renderVacancy(S.vacancy);
    renderDraft();
  }

  /* ═════════════ 잡동사니 ═════════════ */
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function gwParseArticleJson(rawText) {
    if (!rawText || !rawText.trim()) return { ok: false, reason: "AI 응답이 비어 있습니다." };

    let candidate = null;
    const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced && fenced[1]) candidate = fenced[1].trim();
    else {
      const first = rawText.indexOf("{");
      const last = rawText.lastIndexOf("}");
      if (first !== -1 && last > first) candidate = rawText.slice(first, last + 1);
    }
    if (!candidate) return { ok: false, reason: "AI 응답에서 JSON 을 찾지 못했습니다." };

    let data;
    try {
      data = JSON.parse(candidate);
    } catch (e) {
      return { ok: false, reason: "AI 가 준 JSON 의 형식이 깨져 있습니다." };
    }

    const title = (data.title || "").trim();
    const body = (data.body || "").trim();
    if (!title || !body) return { ok: false, reason: "AI 응답에 제목 또는 본문이 없습니다." };

    return {
      ok: true,
      article: {
        title,
        subtitles: [data.subtitle1, data.subtitle2, data.subtitle3]
          .map((s) => (s || "").trim()).filter(Boolean),
        body,
        keywords: Array.isArray(data.keywords)
          ? data.keywords.map((k) => String(k).replace(/^#/, "").trim()).filter(Boolean)
          : [],
      },
    };
  }

  /* ═════════════ 시작 ═════════════ */
  (async () => {
    await restore();
    refreshButtons();
    status(S.article ? "초안 있음" : S.vacancy ? "매물 준비됨" : "준비됨", S.article ? "ok" : "");
  })();
})();
