/* ══════════════════════════════════════════════════════════════
   작업창 — 이 확장의 두뇌 (뉴스메이커 1·2번 탭)

   기사 작성기(gongsilwriter20)의 panel.js 를 바탕으로, 원자료만 바꿨다.
   매물 대신 뉴스(보고 있는 탭·주소) 또는 주제를 소재로 기사를 쓰고,
   고른 공실뉴스 카테고리(1·2차 섹션)를 기사쓰기 폼까지 넘긴다.
   페이지들은 시키는 일만 한다. 판단과 상태는 전부 여기 있다.
   ══════════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  /* ─────────── 상태 ─────────── */
  const S = {
    platform: "chatgpt",
    kind: "news",      // 기사 스타일 — GW_KIND
    length: "normal",  // 분량 — GW_LENGTH
    imageStyle: "auto", // AI 추천 — 본문에 맞는 스타일을 AI 가 고른다
    imageRequest: "",
    autoCover: true,    // 초안을 가져오면 대표 이미지 1장을 자동으로 만든다
    coverJob: null,     // 자동 대표 이미지 — { status: "making"|"failed", before: {url,count}, reason }
    aiTabId: null,
    /* 기사 소재 — shared/prompt.js 머리말의 source 모양 그대로 */
    source: {
      mode: "news",     // news(뉴스 가져오기) · topic(주제 입력)
      news: null,       // { title, publisher, publishedAt, url, body, truncated }
      topic: { subject: "", intro: "", points: ["", "", ""], outro: "", memo: "" },
      angle: "",
      section1: "",     // 1단계에서 먼저 고른다 — 자유면 AI 가 고름
      section2: "",
    },
    article: null,   // { title, subtitles[], body, keywords[], section1?, section2? }
    writing: false,  // AI 에 기사를 보내고 아직 가져오지 않았다 — 작성 중 안내를 띄운다
    media: [],       // [{ kind:'ai'|'upload', url, caption, isCover, insertAfterParagraph }]
  };

  const $ = (id) => document.getElementById(id);

  const el = {
    status: $("statusPill"),
    tabWork: $("tabWork"), tabDraft: $("tabDraft"), draftBadge: $("draftBadge"),
    viewWork: $("viewWork"), viewDraft: $("viewDraft"),
    newsBox: $("newsBox"), topicBox: $("topicBox"),
    btnGrabNews: $("btnGrabNews"), newsUrl: $("newsUrl"), btnFetchUrl: $("btnFetchUrl"),
    newsCard: $("newsCard"), newsPublisher: $("newsPublisher"), newsTitle: $("newsTitle"),
    newsFields: $("newsFields"), newsBody: $("newsBody"),
    topicSubject: $("topicSubject"), topicMemo: $("topicMemo"), angleInput: $("angleInput"),
    topicIntro: $("topicIntro"), topicOutro: $("topicOutro"), topicPoints: $("topicPoints"), btnAddPoint: $("btnAddPoint"),
    autoCover: $("autoCover"),
    section1Select: $("section1Select"), section2Select: $("section2Select"), sectionHint: $("sectionHint"), pvSection: $("pvSection"),
    btnOpenAi: $("btnOpenAi"), btnSubmit: $("btnSubmit"), btnPullDraft: $("btnPullDraft"),
    draftEmpty: $("draftEmpty"), draftBody: $("draftBody"), draftActions: $("draftActions"),
    pvDate: $("pvDate"), pvTitle: $("pvTitle"), pvSubtitle: $("pvSubtitle"),
    pvCover: $("pvCover"), pvContent: $("pvContent"), pvKeywords: $("pvKeywords"),
    reviseInput: $("reviseInput"), btnRevise: $("btnRevise"), btnPullRevised: $("btnPullRevised"),
    imageRequest: $("imageRequest"),
    btnMakeImage: $("btnMakeImage"), btnChangeImage: $("btnChangeImage"), fileImage: $("fileImage"),
    btnSendGongsil: $("btnSendGongsil"),
    articleWriting: $("articleWriting"), articleFail: $("articleFail"),
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

  /* 누르는 동안 잠가 둔다 — 두 번 눌러 생기는 사고를 막는다.
     opts.cover   : 그 글 영역에 반투명 흰 막과 같은 멘트를 띄운다
     opts.failTitle: 실패하면 빨간 안내 카드를 남긴다 (opts.fail 칸, 없으면 cover 맨 위)
     opts.retry   : 카드의 [다시 가져오기]가 누를 버튼 */
  async function guard(btn, busyText, fn, opts = {}) {
    const keep = btn.innerHTML;
    const failBox = opts.fail || opts.cover;
    btn.disabled = true;
    GWBusy.clearFail(failBox);
    GWBusy.start(btn, busyText, opts.cover);
    status(busyText, "busy");
    try {
      if (GWBusy.isPullButton(btn, opts)) {
        await GWBusy.retryOnce(fn, () => { GWBusy.label(btn, "3초 뒤 다시 가져오는 중"); status("3초 뒤 다시 시도", "busy"); });
      } else {
        await fn();
      }
    } catch (e) {
      console.error("[공실뉴스 뉴스메이커]", e);
      toast(e.message || String(e), "bad", 7000);
      status("문제 발생", "bad");
      if (opts.failTitle) GWBusy.fail(failBox, opts.failTitle, e.message || String(e), opts.retry);
    } finally {
      GWBusy.stop(btn);
      btn.disabled = false;
      btn.innerHTML = keep;
      refreshButtons();
    }
  }

  /* ═════════════ 탭 다루기 ═════════════ */
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

  /* 입력칸은 칠 때마다 저장하지 않고 잠깐 멈추면 한 번 저장한다 */
  let saveTimer = null;
  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 400);
  }

  /* ═════════════ ① 소재 — 뉴스 가져오기 / 주제 입력 ═════════════ */
  const sourceModeBtns = document.querySelectorAll(".chip[data-source-mode]");
  sourceModeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      S.source.mode = btn.dataset.sourceMode;
      renderSourceMode();
      refreshButtons();
      save();
    });
  });

  function renderSourceMode() {
    const news = S.source.mode === "news";
    sourceModeBtns.forEach((b) => b.classList.toggle("active", b.dataset.sourceMode === S.source.mode));
    el.newsBox.classList.toggle("hidden", !news);
    el.topicBox.classList.toggle("hidden", news);
  }

  /* 뉴스로 읽을 수 없는 탭 — 브라우저·확장 화면, AI 화면, 공실뉴스 관리 화면 */
  const NOT_NEWS = /^(chrome|edge|about|chrome-extension|devtools|view-source):|^https:\/\/(chatgpt\.com|gemini\.google\.com)\/|^https?:\/\/([a-z0-9-]+\.)?gongsilnews\.com\/(admin|realty_admin|user_admin)/i;

  el.btnGrabNews.addEventListener("click", () =>
    guard(el.btnGrabNews, "뉴스 읽는 중", async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id || !/^https?:/i.test(tab.url || "") || NOT_NEWS.test(tab.url || "")) {
        throw new Error("뉴스 기사 한 건을 연 탭을 앞에 띄운 뒤 눌러 주세요. 지금 보고 있는 탭은 뉴스 페이지가 아닙니다.");
      }
      let res;
      try {
        /* 읽는 코드를 그 탭에 넣고 부른다 — 로그인해야 보이는 기사도 화면에 보이는 그대로 읽힌다 */
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["shared/news-extract.js"] });
        const [done] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => globalThis.gwNewsExtract(document, location.href),
        });
        res = done && done.result;
      } catch (e) {
        throw new Error("이 탭의 내용을 읽지 못했습니다. 탭을 새로고침(F5)한 뒤 다시 눌러 주세요. (" + (e.message || String(e)) + ")");
      }
      applyNews(res);
    })
  );

  el.btnFetchUrl.addEventListener("click", fetchNewsUrl);
  el.newsUrl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") fetchNewsUrl();
  });

  function fetchNewsUrl() {
    guard(el.btnFetchUrl, "읽는 중", async () => {
      const url = el.newsUrl.value.trim();
      if (!/^https?:\/\/\S+$/i.test(url)) throw new Error("https:// 로 시작하는 뉴스 주소를 붙여넣어 주세요.");
      const response = await fetch(url, { credentials: "omit", cache: "no-store" }).catch(() => null);
      if (!response || !response.ok) {
        throw new Error(
          `뉴스 페이지를 받지 못했습니다${response ? ` (${response.status})` : ""}. ` +
          "그 뉴스를 탭에 열어 두고 [지금 보는 뉴스 가져오기]를 눌러 주세요."
        );
      }
      const html = GWNewsExtract.decodeHtml(await response.arrayBuffer(), response.headers.get("content-type"));
      const doc = new DOMParser().parseFromString(html, "text/html");
      applyNews(GWNewsExtract.gwNewsExtract(doc, response.url || url));
      el.newsUrl.value = "";
    });
  }

  function applyNews(res) {
    if (!res || !res.ok) throw new Error((res && res.reason) || "뉴스를 읽지 못했습니다.");
    S.source.mode = "news";
    S.source.news = res.news;
    renderSourceMode();
    renderNews();
    refreshButtons();
    save();
    const size = res.news.body.length.toLocaleString("ko-KR");
    toast(`${res.news.publisher || "뉴스"} 기사 본문 ${size}자를 가져왔습니다.${res.news.truncated ? " 길어서 앞부분만 씁니다." : ""}`, "ok", 6000);
    status("뉴스 준비됨", "ok");
  }

  const shortUrl = (url) => String(url || "").replace(/^https?:\/\/(www\.)?/, "").slice(0, 48);

  function renderNews() {
    const n = S.source.news;
    el.newsCard.classList.toggle("hidden", !n);
    if (!n) return;
    el.newsPublisher.textContent = n.publisher || "가져온 뉴스";
    el.newsTitle.textContent = n.title || "-";
    const rows = [];
    if (n.publishedAt) rows.push(["보도일", gwNewsDate(n.publishedAt)]);
    rows.push(["본문", `${String(n.body || "").length.toLocaleString("ko-KR")}자${n.truncated ? " (앞부분)" : ""}`]);
    el.newsFields.innerHTML =
      rows.map(([k, val]) => `<div class="vf-row"><dt>${esc(k)}</dt><dd>${esc(val)}</dd></div>`).join("") +
      (n.url
        ? `<div class="vf-row"><dt>원문</dt><dd><a href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">${esc(shortUrl(n.url))}</a></dd></div>`
        : "");
    if (document.activeElement !== el.newsBody) el.newsBody.value = n.body || "";
  }

  /* 가져온 본문에서 광고·관련기사 글을 지우면 그 본문으로 쓴다 */
  el.newsBody.addEventListener("change", () => {
    if (!S.source.news) return;
    S.source.news.body = el.newsBody.value.trim();
    renderNews();
    refreshButtons();
    save();
  });

  el.topicSubject.addEventListener("input", () => {
    S.source.topic.subject = el.topicSubject.value;
    refreshButtons();
    saveSoon();
  });
  el.topicMemo.addEventListener("input", () => {
    S.source.topic.memo = el.topicMemo.value;
    saveSoon();
  });
  el.angleInput.addEventListener("input", () => {
    S.source.angle = el.angleInput.value;
    saveSoon();
  });

  /* ── 글 뼈대 — 서론 · 본론 1~5 · 결론 ── */
  const MAX_POINTS = 5;
  const POINT_EXAMPLES = [
    "예: 등기부등본으로 근저당 확인",
    "예: 전입신고·확정일자는 잔금 당일에",
    "예: 전세보증금 반환보증 가입",
    "예: 계약서 특약 꼼꼼히 쓰기",
    "예: 입주 전 집 상태 사진으로 남기기",
  ];

  el.topicIntro.addEventListener("input", () => {
    S.source.topic.intro = el.topicIntro.value;
    saveSoon();
  });
  el.topicOutro.addEventListener("input", () => {
    S.source.topic.outro = el.topicOutro.value;
    saveSoon();
  });

  function renderPoints() {
    const points = S.source.topic.points;
    el.topicPoints.innerHTML = points
      .map((point, i) =>
        `<div class="point-row">` +
        `<label class="field-label" for="topicPoint${i}">본론 ${i + 1}</label>` +
        (points.length > 1 ? `<button type="button" class="point-remove" data-remove-point="${i}" title="본론 ${i + 1} 빼기">×</button>` : "") +
        `<textarea id="topicPoint${i}" class="text-area outline-input" rows="2" maxlength="600" data-point="${i}" placeholder="${esc(POINT_EXAMPLES[i] || "")}">${esc(point)}</textarea>` +
        `</div>`)
      .join("");
    el.btnAddPoint.classList.toggle("hidden", points.length >= MAX_POINTS);
  }

  el.topicPoints.addEventListener("input", (e) => {
    const index = Number(e.target.dataset.point);
    if (!Number.isInteger(index)) return;
    S.source.topic.points[index] = e.target.value;
    saveSoon();
  });

  el.topicPoints.addEventListener("click", (e) => {
    const button = e.target.closest("[data-remove-point]");
    if (!button) return;
    S.source.topic.points.splice(Number(button.dataset.removePoint), 1);
    renderPoints();
    save();
  });

  el.btnAddPoint.addEventListener("click", () => {
    if (S.source.topic.points.length >= MAX_POINTS) return;
    S.source.topic.points.push("");
    renderPoints();
    save();
    el.topicPoints.querySelector(`[data-point="${S.source.topic.points.length - 1}"]`)?.focus();
  });

  /* ═════════════ ② 공실뉴스 카테고리 ═════════════
     우리동네뉴스 상단처럼 [1차 ▾ | 2차 ▾] 드롭다운 두 개. 1차를 바꾸면 2차 목록이 바뀐다.
     자유를 고르면 2차는 AI 가 고른다. */
  el.section1Select.innerHTML =
    `<option value="">1차 카테고리 선택</option>` +
    [...gwSectionNames(), GW_SECTION_FREE]
      .map((name) => `<option value="${esc(name)}">${esc(name === GW_SECTION_FREE ? "자유 (AI가 고름)" : name)}</option>`)
      .join("");

  el.section1Select.addEventListener("change", () => {
    S.source.section1 = el.section1Select.value;
    S.source.section2 = "";
    renderSections();
    renderSectionBadge();
    refreshButtons();
    save();
  });

  el.section2Select.addEventListener("change", () => {
    S.source.section2 = el.section2Select.value;
    renderSections();
    renderSectionBadge();
    refreshButtons();
    save();
  });

  function renderSections() {
    const first = S.source.section1;
    el.section1Select.value = first;
    const subs = gwSubSectionNames(first);
    el.section2Select.innerHTML = first === GW_SECTION_FREE
      ? `<option value="">AI가 고름</option>`
      : `<option value="">${first ? "2차 카테고리 선택" : "2차 카테고리"}</option>` +
        subs.map((name) => `<option value="${esc(name)}">${esc(name)}</option>`).join("");
    el.section2Select.value = S.source.section2 || "";
    el.section2Select.disabled = !first || first === GW_SECTION_FREE;
    const need1 = !first;
    const need2 = Boolean(first && first !== GW_SECTION_FREE && !S.source.section2);
    el.section1Select.classList.toggle("need", need1);
    el.section2Select.classList.toggle("need", need2);
    el.sectionHint.classList.toggle("warn-text", need2);
    el.sectionHint.textContent = !first
      ? "1차 카테고리를 고르고, 이어서 2차 카테고리까지 골라 주세요."
      : first === GW_SECTION_FREE
        ? "자유를 고르면 AI가 기사에 맞는 공실뉴스 카테고리를 골라 기사쓰기 화면에 채웁니다."
        : S.source.section2
          ? `${first} > ${S.source.section2} 카테고리로 씁니다.`
          : `${first}의 2차 카테고리를 골라 주세요.`;
  }

  /* 카테고리를 다 골랐는가 — 1·2차 모두, 또는 자유 */
  function sectionReady() {
    const { section1, section2 } = S.source;
    return section1 === GW_SECTION_FREE || Boolean(GW_SECTIONS[section1] && gwIsValidSection(section1, section2) && section2);
  }

  /* 기사쓰기 폼에 넣을 섹션 — 직접 고른 것이 먼저, 비어 있는 자리만 AI 가 고른 것으로 채운다 */
  function chosenSection() {
    const pickedFirst = S.source.section1 !== GW_SECTION_FREE && GW_SECTIONS[S.source.section1] ? S.source.section1 : "";
    const ai = gwNormalizeSection(S.article && S.article.section1, S.article && S.article.section2);
    const section1 = pickedFirst || ai.section1;
    let section2 = S.source.section2 || (ai.section1 === section1 ? ai.section2 : "");
    if (!gwIsValidSection(section1, section2)) section2 = "";
    return { section1, section2 };
  }

  function renderSectionBadge() {
    const { section1, section2 } = chosenSection();
    el.pvSection.textContent = section1 ? `${section1}${section2 ? ` > ${section2}` : ""}` : "공실뉴스";
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

  /* 자동 입력이 실패해도 붙여넣기로 이어갈 수 있게 AI 에 보낼 글을 미리 복사해 둔다.
     AI 탭으로 넘어가면 작업창이 초점을 잃어 복사가 막히므로 반드시 탭을 띄우기 전에 부른다. */
  const copyForPaste = (text) => navigator.clipboard.writeText(text).then(() => true, () => false);

  function pasteGuide(what) {
    const name = S.platform === "gemini" ? "Gemini" : "ChatGPT";
    const other = S.platform === "gemini" ? "ChatGPT" : "Gemini";
    return `${name} 입력칸에 ${what}을 자동으로 넣지 못했습니다. 복사해 두었으니 입력칸을 클릭하고 Ctrl+V 로 붙여넣은 뒤 직접 전송해 주세요. 계속 안 되면 3단계에서 ${other} 를 선택해 주세요.`;
  }

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
    guard(el.btnOpenAi, "기사 작성 요청 중", async () => {
      if (!sectionReady()) throw new Error("먼저 1단계에서 카테고리를 2차까지 골라 주세요.");
      if (!gwSourceReady(S.source)) {
        throw new Error(S.source.mode === "news" ? "먼저 2단계에서 뉴스를 가져와 주세요." : "먼저 2단계에 주제를 입력해 주세요.");
      }
      /* 새 기사를 쓰면 지난 초안에 넣은 사진은 뺀다 — 새 초안에 새 대표 이미지를 만든다 */
      if (S.media.length) {
        if (!confirm(`새 기사를 쓰면 지금 초안에 넣은 사진 ${S.media.length}장이 빠집니다. 계속할까요?`)) return;
        S.media = [];
      }
      coverRun += 1;
      S.coverJob = null;

      const conf = aiConf();
      const job = { type: "GW_FILL", text: gwBuildPrompt(S.source, promptOpts()) };

      const copied = await copyForPaste(job.text);

      const tab = await chrome.tabs.create({ url: conf.URL, active: true });
      S.aiTabId = tab.id;
      save();

      await waitTabReady(tab.id);
      await sleep(1200);

      let res = await askTab(tab.id, job).catch((e) => ({ ok: false, reason: e.message }));

      /* 첫 화면이 덜 그려졌거나 탭 연결이 꼬이면 한 번 새로고침해서 다시 넣는다 */
      if (!res.ok) {
        status("AI 탭 새로고침 후 재시도", "busy");
        await chrome.tabs.reload(tab.id);
        await sleep(500);
        await waitTabReady(tab.id);
        await sleep(2000);
        res = await askTab(tab.id, job).catch((e) => ({ ok: false, reason: e.message }));
      }
      if (!res.ok) {
        if (!copied) throw new Error(res.reason || "프롬프트를 넣지 못했습니다.");
        toast(pasteGuide("프롬프트") + " 전송한 뒤에는 ③ 초안 보내기 로 이어가면 됩니다.", "bad", 15000);
        status("붙여넣기 필요", "bad");
        return;
      }

      const k = GW_KIND[S.kind] || GW_KIND.news;
      const l = GW_LENGTH[S.length] || GW_LENGTH.normal;
      toast(`${k.label} · ${l.chars} 로 프롬프트를 넣었습니다. ② 작성하기 를 누르세요.`, "ok", 6000);
      status("프롬프트 입력됨", "ok");
    }, { fail: el.articleFail, failTitle: "AI 기사 작성을 시작하지 못했습니다" })
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
    guard(el.btnSubmit, "AI에 보내는 중", async () => {
      if (!S.aiTabId) throw new Error("먼저 ① AI 기사 작성 을 눌러 주세요.");
      await chrome.tabs.update(S.aiTabId, { active: true });
      const res = await askTab(S.aiTabId, { type: "GW_SUBMIT" });
      if (!res.ok) throw new Error(res.reason || "전송 버튼을 누르지 못했습니다.");
      toast("전송했습니다. 기사가 다 나오면 ③ 초안 보내기 를 누르세요.", "ok");
      status("AI 작성 중", "busy");
      setWriting(true);
    }, { fail: el.articleFail, failTitle: "AI에 보내지 못했습니다" })
  );

  /* ═════════════ ⑥ 초안 보내기 ═════════════ */
  const pasteBox = $("pasteBox");
  const pasteJson = $("pasteJson");

  el.btnPullDraft.addEventListener("click", () =>
    guard(el.btnPullDraft, "기사 가져오는 중", async () => {
      if (!S.aiTabId) throw new Error("먼저 ① AI 기사 작성 을 눌러 주세요.");
      let repaired;
      try {
        repaired = await pullArticle();
      } catch (e) {
        /* 자동으로 못 읽으면 직접 붙여넣는 길을 연다 */
        if (e.unreadable) {
          pasteJson.focus();
          toast(e.message, "bad", 9000);
          status("붙여넣기 필요", "bad");
          return;
        }
        throw e;
      }
      afterDraftPulled(repaired);
    }, { cover: el.draftBody, fail: el.articleFail, failTitle: "기사를 가져오지 못했습니다", retry: el.btnPullDraft })
  );

  $("btnPasteDraft").addEventListener("click", () =>
    guard($("btnPasteDraft"), "초안 만드는 중", async () => {
      const text = pasteJson.value.trim();
      if (!text) throw new Error("AI 답변의 JSON 을 먼저 붙여넣어 주세요.");
      afterDraftPulled(applyArticleText(text));
    })
  );

  function afterDraftPulled(repaired) {
    pasteBox.classList.add("hidden");
    pasteJson.value = "";
    toast(repaired ? "AI의 JSON 오류를 자동 복구해 초안을 가져왔습니다." : "초안을 가져왔습니다.", "ok");
    status("초안 준비됨", "ok");
    switchTab("draft");
    startAutoCover();
  }

  async function pullArticle(readOpts = {}) {
    /* 새 답변을 기다리는 중(수정 요청 직후)이 아니면 복사 버튼부터 — 가장 정확하고 기다릴 필요도 없다 */
    if (!readOpts.minCount) {
      const direct = await GWChatGptDirect.read(S.aiTabId, (stage) => status(`기사 읽는 중 (${stage})`, "busy"));
      if (direct) return applyArticleText(direct);
    }

    let res = await askTab(S.aiTabId, { type: "GW_READ", ...readOpts });
    if (!res.ok && res.unreadable) {
      const direct = await GWChatGptDirect.read(S.aiTabId, (stage) => status(`기사 읽는 중 (${stage})`, "busy"));
      if (direct) res = { ok: true, text: direct };
    }
    if (!res.ok) {
      if (!res.unreadable) throw new Error(res.reason || "응답을 읽지 못했습니다.");
      /* 수정글도 같은 칸에 붙여넣으면 초안이 바뀐다 */
      pasteBox.classList.remove("hidden");
      const err = new Error(res.reason + " ① 소재·AI 탭 아래 붙여넣기 칸에 JSON 을 직접 붙여넣어 주세요.");
      err.unreadable = true;
      throw err;
    }
    return applyArticleText(res.text);
  }

  function applyArticleText(text) {
    const parsed = GWArticleJson.parse(text);
    if (!parsed.ok) {
      throw new Error(
        parsed.reason + " AI 탭에서 'JSON 형식으로 다시 출력해줘' 라고 한 번 더 요청한 뒤 다시 눌러 주세요."
      );
    }

    S.article = parsed.article;
    S.writing = false;
    showWriting();
    draftInsertSlot = null;
    pendingAiInsertSlot = null;
    pendingAiPreviousImage = null;
    pendingAiRequestKey = "";
    renderDraft();
    /* 글이 왔다는 걸 놓치지 않게 — 파란 테두리 + "아래로 내려서 확인" 안내 */
    window.GWArrival?.notify(el.draftBody.querySelector(".preview-doc"), el.viewDraft);
    save();
    return parsed.repaired === true;
  }

  /* ═════════════ 초안 미리보기 ═════════════ */

  /* 사진 한 장을 기사 안에 넣는 모양.
     contenteditable="false" 라 본문을 고쳐도 사진이 망가지지 않는다.
     설명글만 따로 고칠 수 있게 열어 둔다. */
  function figureHtml(m, idx) {
    const coverControl = m.isCover
      ? `<span class="fig-cover-mark">대표 이미지</span>`
      : `<button type="button" class="fig-btn cover" data-act="cover" data-mi="${idx}">대표지정</button>`;
    return (
      `<figure class="art-fig" contenteditable="false" data-mi="${idx}">` +
      `<img src="${esc(m.url)}" alt="">` +
      `<div class="fig-tools">` +
      coverControl +
      `<button type="button" class="fig-btn" data-act="replace" data-mi="${idx}">사진 바꾸기</button>` +
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

    if (act === "cover") {
      /* 버튼 클릭 직전까지 고친 본문도 다시 그릴 때 잃지 않게 먼저 담는다. */
      harvestEdits();
      S.media = GWMediaCover.select(S.media, idx);
      renderDraft();
      save();
      toast("대표 이미지로 지정했습니다.", "ok");
      return;
    }

    if (act === "replace") {
      replaceIndex = idx;
      fileInsertSlot = null;
      el.fileImage.click();
      return;
    }

    if (act === "remove") {
      S.media.splice(idx, 1);
      S.media = GWMediaCover.normalize(S.media);
      renderDraft();
      save();
      toast("사진을 뺐습니다.", "ok");
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
    S.media = GWMediaCover.normalize(S.media);

    if (!a) {
      el.draftEmpty.classList.remove("hidden");
      el.draftBody.classList.add("hidden");
      el.draftActions.classList.add("hidden");
      renderCover();
      return;
    }

    el.draftEmpty.classList.add("hidden");
    el.draftBody.classList.remove("hidden");
    /* 하단 수정 바는 2번 탭을 보고 있을 때만 — 1번·3번 탭에서 다시 그려져도 튀어나오지 않게 */
    const onDraftTab = el.viewDraft.classList.contains("active");
    el.draftActions.classList.toggle("hidden", !onDraftTab);
    if (!onDraftTab) el.draftBadge.classList.remove("hidden");

    renderSectionBadge();
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

    const rest = S.media
      .map((media, index) => ({ media, index }))
      .filter((item) => !item.media.isCover);
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
    S.media = GWMediaCover.normalize(S.media);
    const coverIndex = GWMediaCover.indexOf(S.media);
    const cover = coverIndex >= 0 ? S.media[coverIndex] : null;
    if (!cover && S.coverJob && S.article) {
      el.pvCover.classList.remove("hidden");
      el.pvCover.innerHTML = coverJobHtml(S.coverJob);
      return;
    }
    if (!cover) {
      el.pvCover.classList.add("hidden");
      el.pvCover.innerHTML = "";
      return;
    }
    el.pvCover.classList.remove("hidden");
    el.pvCover.innerHTML = figureHtml(cover, coverIndex);
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
      if (!S.aiTabId || !(await chrome.tabs.get(S.aiTabId).catch(() => null))) {
        S.aiTabId = null;
        throw new Error("기사를 쓴 AI 탭이 닫혔습니다. ① 소재·AI 탭에서 [AI 기사 작성]으로 새로 만들어 주세요.");
      }

      harvestEdits();
      const text = gwBuildRevisePrompt(want, S.source);
      const copied = await copyForPaste(text);
      await chrome.tabs.update(S.aiTabId, { active: true });
      /* ChatGPT: AI 가 아직 답하는 중이면 기다리고, 보내기 전 대화 메시지 수를 세어 둔다 */
      const api = await GWChatGptDirect.waitIdle(S.aiTabId, () => status("AI 답변이 끝나길 기다리는 중", "busy"));
      // 보내기 전 답변 수를 세어 두었다가 새 답변만 읽는다 (예전 AI 탭이면 세지 못한다)
      const before = await askTab(S.aiTabId, { type: "GW_COUNT" }).catch(() => null);

      const fill = await askTab(S.aiTabId, { type: "GW_FILL", text }).catch((e) => ({ ok: false, reason: e.message }));
      if (!fill.ok) {
        if (!copied) throw new Error(fill.reason || "수정 요청을 넣지 못했습니다.");
        toast(pasteGuide("수정 요청") + " 답변이 끝나면 [수정글 가져오기]를 눌러 주세요.", "bad", 15000);
        status("붙여넣기 필요", "bad");
        return;
      }

      const sent = await askTab(S.aiTabId, { type: "GW_SUBMIT" });
      if (!sent.ok) throw new Error(sent.reason || "전송하지 못했습니다.");

      el.reviseInput.value = "";
      GWBusy.label(el.btnRevise, "AI가 기사를 수정하는 중");
      status("AI가 기사를 수정하는 중", "busy");

      /* ChatGPT 는 대화 원문에서 "새로 끝난 AI 답변"만 받는다 — 보낸 양식·이전 답변이 섞이지 않는다 */
      if (api.ok) {
        const answer = await GWChatGptDirect.waitNewAnswer(S.aiTabId, api.messageCount, 240000);
        if (answer) {
          const repaired = applyArticleText(answer);
          toast(repaired ? "JSON 오류를 자동 복구해 수정 기사를 가져왔습니다." : "수정된 기사를 가져왔습니다.", "ok");
          status("초안 갱신됨", "ok");
          return;
        }
        if (!(await chrome.tabs.get(S.aiTabId).catch(() => null))) {
          throw new Error("AI 탭이 닫혀 수정 기사를 받지 못했습니다.");
        }
        /* 원문으로 못 받았으면 아래 화면 읽기로 한 번 더 시도한다 */
      }

      if (!before?.ok) {
        toast("수정을 요청했습니다. AI 답변이 끝나면 [수정글 가져오기]를 눌러 주세요.", "info", 9000);
        status("수정 답변 기다리는 중", "busy");
        return;
      }
      toast("수정을 요청했습니다. 새 답변이 끝나면 자동으로 가져옵니다.", "info");
      const repaired = await pullArticle({ minCount: before.count + 1, maxMs: 180000 });
      toast(repaired ? "JSON 오류를 자동 복구해 수정 기사를 가져왔습니다." : "수정된 기사를 가져왔습니다.", "ok");
      status("초안 갱신됨", "ok");
    }, { cover: el.draftBody, failTitle: "수정 기사를 받지 못했습니다", retry: el.btnPullRevised });
  }

  el.btnPullRevised.addEventListener("click", () =>
    guard(el.btnPullRevised, "수정글 가져오는 중", async () => {
      if (!S.aiTabId) throw new Error("AI 탭이 없습니다. 초안을 만든 탭이 닫혔습니다.");
      const repaired = await pullArticle();
      toast(repaired ? "JSON 오류를 자동 복구해 수정 기사를 가져왔습니다." : "수정된 기사를 가져왔습니다.", "ok");
      status("초안 갱신됨", "ok");
    }, { cover: el.draftBody, failTitle: "수정 기사를 가져오지 못했습니다", retry: el.btnPullRevised })
  );

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
      const text = gwBuildImagePrompt(S.source, S.article, {
        style: S.imageStyle,
        request: S.imageRequest,
      });
      const copied = await copyForPaste(text);
      await chrome.tabs.update(S.aiTabId, { active: true });

      const fill = await askTab(S.aiTabId, { type: "GW_FILL", text }).catch((e) => ({ ok: false, reason: e.message }));
      if (!fill.ok) {
        if (!copied) throw new Error(fill.reason || "이미지 요청을 넣지 못했습니다.");
        /* 붙여넣어 보낸 그림도 다음 클릭에 가져올 수 있게 요청한 것으로 기억한다 */
        pendingAiInsertSlot = slot;
        pendingAiRequestKey = currentRequestKey;
        toast(pasteGuide("이미지 요청") + " 그림이 다 나온 뒤 [AI 이미지 만들기]를 한 번 더 누르세요.", "bad", 15000);
        status("붙여넣기 필요", "bad");
        return;
      }

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
      caption: gwAiImageCaption(S.article),
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

  /* ═════════════ ⑨ 기사전송하기 ═════════════ */
  el.btnSendGongsil.addEventListener("click", () =>
    guard(el.btnSendGongsil, "기사 전송 중", async () => {
      if (!S.article) throw new Error("보낼 초안이 없습니다.");

      harvestEdits();

      if (!S.article.title || !S.article.body) {
        throw new Error("제목과 본문이 있어야 보낼 수 있습니다.");
      }

      /* 기사쓰기 폼(공실뉴스 페이지)은 AI 화면 같은 바깥 사진을 직접 받지 못한다.
         작업창에서 미리 받아 JPG 로 바꿔 넘긴다. */
      GWBusy.label(el.btnSendGongsil, "사진 준비 중");
      const prepared = await gwMediaToDataUrls(GWMediaCover.coverFirst(S.media));
      if (prepared.failed.length) {
        toast(`사진 ${prepared.failed.length}장을 받지 못해 빼고 보냅니다. 기사쓰기 화면에서 직접 올려 주세요.`, "bad", 9000);
      }
      GWBusy.label(el.btnSendGongsil, "기사 전송 중");

      const res = await chrome.runtime.sendMessage({
        type: "GW_SEND_TO_GONGSIL",
        article: S.article,
        /* 대표를 첫 순서로도 보낸다. isCover 를 모르는 구버전 기사작성 폼도 안전하다. */
        media: prepared.media.filter((item, index) => !prepared.failed.includes(index)),
        /* 기사쓰기 폼에서 1·2차 섹션까지 고른다 */
        section: chosenSection(),
      });

      if (!res || !res.ok) throw new Error((res && res.error) || "기사쓰기 폼에 초안을 넣지 못했습니다.");

      const { section1 } = chosenSection();
      toast(`열어 둔 기사쓰기 폼에 초안을 채웠습니다.${section1 ? "" : " 카테고리는 기사쓰기 화면에서 직접 골라 주세요."} 확인 후 [기사 등록]을 눌러 주세요.`, "ok", 8000);
      status("전송 완료", "ok");
    })
  );

  /* ═════════════ 대표 이미지 자동 생성 ═════════════
     초안을 가져오면 같은 AI 대화에 "본문에 맞는 대표 이미지 1장"을 요청하고,
     그림이 다 나오면 기사 맨 위(대표)에 넣는다. 장면과 스타일은 AI 가 본문을 읽고 고른다.
     기다리는 동안 [수정 요청]·[AI 이미지 만들기]는 잠근다 (refreshButtons). */
  const COVER_WAIT_MS = 180000;
  let coverRun = 0; // 새 기사를 시작하거나 대표가 들어가면 올려서 이전 기다림을 멈춘다

  el.autoCover.addEventListener("change", () => {
    S.autoCover = el.autoCover.checked;
    save();
  });

  function coverJobHtml(job) {
    if (job.status === "making") {
      return `<div class="cover-pending" role="status">` +
        `<span class="cover-spinner"></span>` +
        `<div><strong>AI가 본문에 맞는 대표 이미지를 만드는 중입니다</strong>` +
        `<small>보통 30초~2분 걸립니다. 그동안 제목·본문은 직접 고칠 수 있습니다.</small></div>` +
        `</div>`;
    }
    return `<div class="cover-pending failed">` +
      `<div><strong>대표 이미지를 받지 못했습니다</strong><small>${esc(job.reason || "")} AI 탭에 그림이 나왔다면 [다시 가져오기]를 누르세요.</small></div>` +
      `<div class="cover-actions">` +
      `<button type="button" class="fig-btn" data-cover-act="pull">다시 가져오기</button>` +
      `<button type="button" class="fig-btn" data-cover-act="retry">다시 만들기</button>` +
      `<button type="button" class="fig-btn del" data-cover-act="dismiss">그만두기</button>` +
      `</div></div>`;
  }

  el.pvCover.addEventListener("click", (e) => {
    const button = e.target.closest("[data-cover-act]");
    if (!button) return;
    const act = button.dataset.coverAct;
    if (act === "dismiss") {
      S.coverJob = null;
      renderCover();
      refreshButtons();
      save();
    } else if (act === "retry") {
      startAutoCover(true);
    } else if (act === "pull") {
      guard(button, "가져오는 중", async () => {
        if (!(await takeCoverIfReady())) toast("AI 탭에 새로 완성된 그림이 아직 없습니다. 그림이 다 나온 뒤 다시 눌러 주세요.", "info", 6000);
      });
    }
  });

  async function startAutoCover(force = false) {
    if (!S.article || !S.aiTabId) return;
    if (!force && (!S.autoCover || S.media.length)) return;
    const run = ++coverRun;
    const tabId = S.aiTabId;
    S.coverJob = { status: "making", before: null };
    renderCover();
    refreshButtons();
    save();
    try {
      /* 기사 답변이 아직 끝나지 않았으면 끝날 때까지 기다린다 (ChatGPT) */
      await GWChatGptDirect.waitIdle(tabId, () => status("대표 이미지 요청 전 기다리는 중", "busy"));
      const before = await askTab(tabId, { type: "GW_GET_IMAGE" }).catch(() => null);
      S.coverJob.before = before && before.ok ? { url: before.url, count: Number(before.count) || 0 } : { url: "", count: 0 };
      const text = gwBuildImagePrompt(S.source, S.article, { style: "auto", cover: true });
      const fill = await askTab(tabId, { type: "GW_FILL", text });
      if (!fill.ok) throw new Error(fill.reason || "대표 이미지 요청을 AI 입력칸에 넣지 못했습니다.");
      const sent = await askTab(tabId, { type: "GW_SUBMIT" });
      if (!sent.ok) throw new Error(sent.reason || "대표 이미지 요청을 보내지 못했습니다.");
      status("대표 이미지 만드는 중", "busy");
      save();

      const until = Date.now() + COVER_WAIT_MS;
      await sleep(8000);
      while (Date.now() < until) {
        if (run !== coverRun) return;
        if (await takeCoverIfReady()) return;
        await sleep(4000);
      }
      throw new Error("3분 안에 대표 이미지를 받지 못했습니다.");
    } catch (e) {
      if (run !== coverRun) return;
      S.coverJob = Object.assign({}, S.coverJob, { status: "failed", reason: e.message || String(e) });
      renderCover();
      refreshButtons();
      save();
      status("대표 이미지 못 받음", "bad");
    }
  }

  /* AI 탭에 요청 뒤 새로 완성된 그림이 있으면 대표로 넣는다. 넣었으면 true */
  async function takeCoverIfReady() {
    const job = S.coverJob;
    if (!job || !S.aiTabId) return false;
    const now = await askTab(S.aiTabId, { type: "GW_GET_IMAGE" }).catch(() => null);
    /* 그리는 중(busy)에 보이는 흐린 미리보기는 집지 않는다 */
    if (!now || !now.ok || now.busy || !now.url) return false;
    const before = job.before || { url: "", count: 0 };
    const isNew = (now.url !== before.url || Number(now.count) > before.count) && !S.media.some((m) => m.url === now.url);
    if (!isNew) return false;

    harvestEdits();
    S.media.unshift({ kind: "ai", url: now.url, caption: gwAiImageCaption(S.article) });
    S.media = GWMediaCover.select(S.media, 0);
    S.coverJob = null;
    coverRun += 1;
    renderDraft();
    refreshButtons();
    save();
    toast("AI가 본문에 맞춰 만든 대표 이미지를 기사 맨 위에 넣었습니다.", "ok", 6000);
    status("대표 이미지 들어감", "ok");
    return true;
  }

  /* ═════════════ AI 작성 중 안내 ═════════════
     [작성하기]로 보낸 뒤 [초안 보내기]로 가져올 때까지 띄워 둔다. */
  function showWriting() {
    GWBusy.writing(el.articleWriting, Boolean(S.writing), "AI가 기사를 작성 중입니다", "다 쓰면 이 안내가 꺼집니다. 그때 ③ 초안 보내기를 누르세요");
    /* AI 가 다 쓰면 안내만 끈다 — 가져오기는 [초안 보내기]로 직접 한다 */
    if (S.writing) {
      GWBusy.watchAi("article", () => S.aiTabId, () => S.writing, (why) => {
        setWriting(false);
        status(why === "closed" ? "AI 탭이 닫힘" : "기사 작성 완료", why === "closed" ? "" : "ok");
      });
    }
  }

  function setWriting(on) {
    S.writing = on;
    showWriting();
    save();
  }

  /* ═════════════ 탭 전환 ═════════════ */
  function switchTab(which) {
    /* 3번 블로그·4번 유튜브 탭과 그 하단 바는 blog.js·youtube.js 가 관리한다. 1·2번으로 올 때 내려놓는다. */
    ["tabBlog", "viewBlog", "tabScript", "viewScript"].forEach((id) => $(id)?.classList.remove("active"));
    ["blogActions", "scriptActions"].forEach((id) => $(id)?.classList.add("hidden"));
    document.dispatchEvent(new CustomEvent("gw:leave-youtube"));
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
    /* 대표 이미지를 만드는 동안에는 같은 AI 대화에 다른 요청을 보내지 않는다 — 두 답변이 섞인다 */
    const coverMaking = Boolean(S.coverJob && S.coverJob.status === "making");
    el.btnOpenAi.disabled = !sectionReady() || !gwSourceReady(S.source);
    el.btnSubmit.disabled = !S.aiTabId;
    el.btnPullDraft.disabled = !S.aiTabId;
    el.btnRevise.disabled = !S.article || !S.aiTabId || coverMaking;
    el.btnPullRevised.disabled = !S.aiTabId || coverMaking;
    el.btnMakeImage.disabled = !S.article || !S.aiTabId || coverMaking;
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
    if (!prev) {
      renderPoints();
      renderSections();
      return;
    }
    const defaults = S.source;
    Object.assign(S, prev);
    S.source = normalizeSource(prev.source, defaults);
    if (!Array.isArray(S.media)) S.media = [];
    S.media = GWMediaCover.normalize(S.media);
    if (!GW_KIND[S.kind]) S.kind = "news";
    if (!GW_LENGTH[S.length]) S.length = "normal";
    if (!GW_IMAGE_STYLE[S.imageStyle]) S.imageStyle = "auto";
    if (typeof S.imageRequest !== "string") S.imageRequest = "";
    if (typeof S.autoCover !== "boolean") S.autoCover = true;
    /* 대표 이미지를 기다리던 중에 작업창이 닫혔으면 기다림은 끝났다 — [다시 가져오기]로 이어 간다 */
    if (S.coverJob && S.coverJob.status === "making") {
      S.coverJob = Object.assign({}, S.coverJob, { status: "failed", reason: "작업창이 다시 열려 기다림이 멈췄습니다." });
    }

    platformBtns.forEach((b) => b.classList.toggle("active", b.dataset.platform === S.platform));
    kindBtns.forEach((b) => b.classList.toggle("active", b.dataset.kind === S.kind));
    lenBtns.forEach((b) => b.classList.toggle("active", b.dataset.length === S.length));
    imageStyleBtns.forEach((b) => b.classList.toggle("active", b.dataset.imageStyle === S.imageStyle));
    el.imageRequest.value = S.imageRequest;
    el.topicSubject.value = S.source.topic.subject;
    el.topicMemo.value = S.source.topic.memo;
    el.topicIntro.value = S.source.topic.intro;
    el.topicOutro.value = S.source.topic.outro;
    el.angleInput.value = S.source.angle;
    el.autoCover.checked = S.autoCover;

    /* 기억해 둔 AI 탭이 아직 살아 있는지 확인한다 */
    if (S.aiTabId && !(await chrome.tabs.get(S.aiTabId).catch(() => null))) S.aiTabId = null;

    renderSourceMode();
    renderNews();
    renderPoints();
    renderSections();
    if (!S.aiTabId) S.writing = false; // 기사를 쓰던 AI 탭이 닫혔으면 안내도 내린다
    showWriting();
    renderDraft();
  }

  /* 저장해 둔 소재가 예전 모양이거나 일부가 비어도 화면이 깨지지 않게 채운다 */
  function normalizeSource(saved, defaults) {
    const src = Object.assign({}, defaults, saved && typeof saved === "object" ? saved : {});
    if (!["news", "topic"].includes(src.mode)) src.mode = "news";
    if (!src.news || !src.news.title) src.news = null;
    src.topic = Object.assign({ subject: "", intro: "", outro: "", memo: "" }, src.topic || {});
    ["subject", "intro", "outro", "memo"].forEach((key) => {
      if (typeof src.topic[key] !== "string") src.topic[key] = "";
    });
    const points = Array.isArray(src.topic.points) ? src.topic.points.map((p) => String(p || "")) : [];
    src.topic.points = points.length ? points.slice(0, 5) : ["", "", ""];
    if (typeof src.angle !== "string") src.angle = "";
    if (src.section1 !== GW_SECTION_FREE && !GW_SECTIONS[src.section1]) src.section1 = "";
    if (!gwIsValidSection(src.section1, src.section2)) src.section2 = "";
    return src;
  }

  /* ═════════════ 초기화 ═════════════
     [↺ 초기화 ▾] → [이 탭만 초기화] / [전체 초기화].
     어느 쪽이든 글만 지우고, 고른 AI와 스타일 설정은 남긴다.
     저장소를 고친 뒤 작업창을 새로 불러오고, 보던 탭으로 돌아온다.
     앞 탭을 지워도 뒤 탭(블로그·대본)은 이미 만든 결과물이라 남긴다. */
  const BLOG_STATE_KEY = "gw_blog_state";
  const YOUTUBE_STATE_KEY = "gw_youtube_state";
  const RETURN_TAB_KEY = "gw_return_tab"; // 새로 불러온 뒤 돌아갈 탭 (sessionStorage)

  const FIRST_TAB = "tabWork";
  const RESET_TABS = {
    tabWork: {
      label: "1 소재 · AI",
      what: "가져온 뉴스·입력한 주제와 기사 초안·사진이 지워집니다.\n블로그 글과 유튜브 대본은 남습니다.",
    },
    tabDraft: {
      label: "2 초안 다듬기",
      what: "기사 초안과 사진이 지워집니다.\n가져온 뉴스·주제는 남아서 같은 소재로 다시 쓸 수 있습니다.",
    },
    tabBlog: { label: "3 블로그 작성", what: "블로그 글만 지워집니다.\n소재·기사·유튜브 대본은 남습니다." },
    tabScript: { label: "4 유튜브 대본", what: "유튜브 대본만 지워집니다.\n소재·기사·블로그 글은 남습니다." },
  };
  const ALL_MESSAGE = "가져온 뉴스, 입력한 주제, 초안, 사진, 블로그 글, 유튜브 대본이 모두 지워집니다.\n전체 초기화할까요?";

  /* 소재·초안을 비운 1·2번 탭 상태 — 설정은 그대로 */
  const panelSettings = () => ({
    platform: S.platform,
    source: { mode: S.source.mode, section1: S.source.section1, section2: S.source.section2 },
    kind: S.kind,
    length: S.length,
    imageStyle: S.imageStyle,
    autoCover: S.autoCover,
  });

  const activeTabId = () => Object.keys(RESET_TABS).find((id) => $(id)?.classList.contains("active")) || FIRST_TAB;

  async function blankBlog() {
    const blog = (await chrome.storage.local.get(BLOG_STATE_KEY))[BLOG_STATE_KEY] || {};
    return { style: blog.style, length: blog.length, imageStyle: blog.imageStyle, design: blog.design };
  }

  async function blankYoutube() {
    const youtube = (await chrome.storage.local.get(YOUTUBE_STATE_KEY))[YOUTUBE_STATE_KEY] || {};
    return { settings: youtube.settings };
  }

  async function runReset(scope) {
    const tabId = activeTabId();
    const message = scope === "all"
      ? ALL_MESSAGE
      : `[${RESET_TABS[tabId].label}] 탭만 초기화합니다.\n\n${RESET_TABS[tabId].what}\n\n초기화할까요?`;
    if (!confirm(message)) return;
    try {
      if (scope === "all") {
        await chrome.storage.local.set({
          [STATE_KEY]: panelSettings(),
          [BLOG_STATE_KEY]: await blankBlog(),
          [YOUTUBE_STATE_KEY]: await blankYoutube(),
        });
        await chrome.storage.local.remove([GW.KEY.JOB, GW.KEY.DRAFT]).catch(() => {});
      } else if (tabId === "tabWork") {
        await chrome.storage.local.set({ [STATE_KEY]: panelSettings() });
        await chrome.storage.local.remove([GW.KEY.JOB, GW.KEY.DRAFT]).catch(() => {});
      } else if (tabId === "tabDraft") {
        /* 뉴스메이커의 사진은 모두 초안 단계에서 만든 것(AI·삽입)이라 함께 비운다 */
        await chrome.storage.local.set({
          [STATE_KEY]: Object.assign({}, S, { article: null, writing: false, imageRequest: "", media: [], coverJob: null }),
        });
        await chrome.storage.local.remove(GW.KEY.DRAFT).catch(() => {});
      } else if (tabId === "tabBlog") {
        await chrome.storage.local.set({ [BLOG_STATE_KEY]: await blankBlog() });
      } else if (tabId === "tabScript") {
        await chrome.storage.local.set({ [YOUTUBE_STATE_KEY]: await blankYoutube() });
      }
      try { sessionStorage.setItem(RETURN_TAB_KEY, scope === "all" ? FIRST_TAB : tabId); } catch {}
      location.reload();
    } catch (e) {
      toast("초기화하지 못했습니다 — " + (e.message || String(e)), "bad", 7000);
    }
  }

  const resetMenu = $("resetMenu");
  const btnReset = $("btnReset");

  function closeResetMenu() {
    resetMenu.classList.add("hidden");
    btnReset.setAttribute("aria-expanded", "false");
  }

  btnReset.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!resetMenu.classList.contains("hidden")) { closeResetMenu(); return; }
    $("resetTabLabel").textContent = RESET_TABS[activeTabId()].label;
    resetMenu.classList.remove("hidden");
    btnReset.setAttribute("aria-expanded", "true");
  });
  $("btnResetTab").addEventListener("click", () => { closeResetMenu(); runReset("tab"); });
  $("btnResetAll").addEventListener("click", () => { closeResetMenu(); runReset("all"); });
  document.addEventListener("click", (e) => {
    if (!resetMenu.contains(e.target)) closeResetMenu();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeResetMenu(); });

  /* ═════════════ 잡동사니 ═════════════ */
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ═════════════ 시작 ═════════════ */
  $("brandVersion").textContent = "v" + chrome.runtime.getManifest().version;
  (async () => {
    await restore();
    refreshButtons();
    status(S.article ? "초안 있음" : gwSourceReady(S.source) ? "소재 준비됨" : "준비됨", S.article ? "ok" : "");
    /* 탭만 초기화한 뒤라면 보던 탭으로 돌아간다 */
    let back = null;
    try { back = sessionStorage.getItem(RETURN_TAB_KEY); sessionStorage.removeItem(RETURN_TAB_KEY); } catch {}
    if (back && back !== FIRST_TAB && RESET_TABS[back]) setTimeout(() => $(back)?.click(), 0);
  })();
})();
