/* ══════════════════════════════════════════════════════════════
   3 · 블로그 작성

   기사 초안(S.article)을 읽기만 하고, 블로그 글·사진·AI 탭·저장소는
   모두 별도로 관리한다. 2번 초안 다듬기에는 값을 쓰지 않는다.
   ══════════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  const PANEL_STATE_KEY = "gw_panel_state";
  const BLOG_STATE_KEY = "gw_blog_state";
  const NAVER_TAB_PATTERNS = ["https://blog.naver.com/*", "https://blog.editor.naver.com/*"];

  const B = {
    style: "listing",
    length: "normal",
    aiTabId: null,
    article: null,
    media: [],
    imageStyle: "news",
    design: "basic",
    imageRequest: "",
    sourceSignature: "",
    pendingImage: null,
    // 초안을 만든 순간의 매물 정보. 이후 1번 탭에서 다른 매물을 가져와도 이 초안에는 섞이지 않는다.
    vacancy: null,
    listing: null,
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    tabWork: $("tabWork"),
    tabDraft: $("tabDraft"),
    tabBlog: $("tabBlog"),
    blogBadge: $("blogBadge"),
    viewWork: $("viewWork"),
    viewDraft: $("viewDraft"),
    viewBlog: $("viewBlog"),
    draftActions: $("draftActions"),
    blogActions: $("blogActions"),
    blogSourceEmpty: $("blogSourceEmpty"),
    blogSourceReady: $("blogSourceReady"),
    blogSourceTitle: $("blogSourceTitle"),
    btnMakeBlogDraft: $("btnMakeBlogDraft"),
    btnPullBlogDraft: $("btnPullBlogDraft"),
    blogDraftEmpty: $("blogDraftEmpty"),
    blogDraftBody: $("blogDraftBody"),
    blogDate: $("blogDate"),
    blogTitle: $("blogTitle"),
    blogCover: $("blogCover"),
    blogContent: $("blogContent"),
    blogKeywords: $("blogKeywords"),
    blogReviseInput: $("blogReviseInput"),
    btnReviseBlog: $("btnReviseBlog"),
    btnPullBlogRevised: $("btnPullBlogRevised"),
    btnMakeBlogImage: $("btnMakeBlogImage"),
    btnInsertBlogImage: $("btnInsertBlogImage"),
    blogFileImage: $("blogFileImage"),
    blogImageRequest: $("blogImageRequest"),
    blogDesignHint: $("blogDesignHint"),
    blogLock: $("blogLock"),
    blogLockTitle: $("blogLockTitle"),
    blogLockText: $("blogLockText"),
    blogLockLink: $("blogLockLink"),
    btnBlogLockRetry: $("btnBlogLockRetry"),
    btnSendNaver: $("btnSendNaver"),
    status: $("statusPill"),
    toastHost: $("toastHost"),
  };

  let sourceCache = null;
  let blogInsertSlot = null;
  let replaceMediaIndex = -1;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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
      console.error("[공실뉴스 블로그 작성]", error);
      toast(error.message || String(error), "bad", 8000);
      status("문제 발생", "bad");
    } finally {
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

  function isBlogActive() {
    return el.tabBlog.classList.contains("active");
  }

  /* ── 3단계 회원 잠금 ──
     공실뉴스부동산·공실스터디부동산·최고관리자만 블로그 작성을 쓴다. 1·2단계는 누구나 쓴다(홍보용).
     화면 잠금은 안내용이고, 실제 차단은 서버(매물 출처 API)가 한 번 더 한다. */
  let blogAccess = null; // { canBlog, isLoggedIn, name, planLabel }

  async function siteOrigin() {
    // 매물을 localhost에서 가져왔으면 개발 서버에, 아니면 운영 사이트에 묻는다
    const source = await getSource().catch(() => null);
    const url = B.vacancy?.url || source?.vacancy?.url || "";
    try {
      const origin = new URL(url).origin;
      if (/^http:\/\/localhost(:\d+)?$/i.test(origin)) return origin;
    } catch (_) {
      /* 주소가 없으면 운영 사이트 */
    }
    return GWNaverBlog.SITE_URL;
  }

  async function checkBlogAccess() {
    const origin = await siteOrigin();
    try {
      const response = await fetch(`${origin}/api/extension/auth/me`, { credentials: "include", cache: "no-store" });
      const data = await response.json();
      blogAccess = {
        origin,
        canBlog: Boolean(data?.canBlog),
        isLoggedIn: Boolean(data?.isLoggedIn),
        name: data?.user?.name || "",
        planLabel: data?.user?.planLabel || "",
      };
    } catch (_) {
      blogAccess = { origin, canBlog: false, isLoggedIn: false, error: true };
    }
    applyBlogLock();
    return blogAccess;
  }

  function applyBlogLock() {
    const locked = !blogAccess?.canBlog;
    el.viewBlog.classList.toggle("locked", locked);
    el.blogLock.classList.toggle("hidden", !locked);
    if (locked) el.blogActions.classList.add("hidden");
    if (!locked) return;
    if (!blogAccess) {
      el.blogLockTitle.textContent = "회원 정보를 확인하는 중입니다";
      el.blogLockText.textContent = "잠시만 기다려 주세요.";
      el.blogLockLink.classList.add("hidden");
      return;
    }

    const origin = blogAccess.origin || GWNaverBlog.SITE_URL;
    if (blogAccess.error) {
      el.blogLockTitle.textContent = "회원 정보를 확인하지 못했습니다";
      el.blogLockText.textContent = "인터넷 연결을 확인한 뒤 [다시 확인]을 눌러 주세요.";
      el.blogLockLink.classList.add("hidden");
    } else if (!blogAccess.isLoggedIn) {
      el.blogLockTitle.textContent = "공실뉴스에 로그인해 주세요";
      el.blogLockText.textContent = "블로그 작성은 공실뉴스부동산·공실스터디부동산 회원 전용입니다. 이 브라우저에서 공실뉴스에 로그인한 뒤 [다시 확인]을 눌러 주세요.";
      el.blogLockLink.textContent = "공실뉴스 열기";
      el.blogLockLink.href = `${origin}/`;
      el.blogLockLink.classList.remove("hidden");
    } else {
      el.blogLockTitle.textContent = "블로그 작성은 회원 전용입니다";
      el.blogLockText.textContent = `${blogAccess.name}님은 현재 ${blogAccess.planLabel || "무료"} 등급입니다. ` +
        "블로그 작성은 공실뉴스부동산·공실스터디부동산 회원만 사용할 수 있습니다.";
      el.blogLockLink.textContent = "공실뉴스부동산 신청하기";
      el.blogLockLink.href = `${origin}/newsrealty/apply`;
      el.blogLockLink.classList.remove("hidden");
    }
  }

  el.btnBlogLockRetry.addEventListener("click", async () => {
    el.btnBlogLockRetry.disabled = true;
    await checkBlogAccess();
    el.btnBlogLockRetry.disabled = false;
    if (blogAccess?.canBlog) {
      el.blogActions.classList.toggle("hidden", !B.article);
      toast("블로그 작성을 사용할 수 있습니다.", "ok");
    }
  });

  function activateBlogTab() {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    el.tabWork.classList.remove("active");
    el.tabDraft.classList.remove("active");
    el.tabBlog.classList.add("active");
    el.viewWork.classList.remove("active");
    el.viewDraft.classList.remove("active");
    el.viewBlog.classList.add("active");
    el.draftActions.classList.add("hidden");
    el.blogActions.classList.toggle("hidden", !B.article);
    el.blogBadge.classList.add("hidden");
    applyBlogLock();
    updateSourceCard();
    checkBlogAccess().then((access) => {
      if (access.canBlog && isBlogActive()) el.blogActions.classList.toggle("hidden", !B.article);
    });
  }

  function leaveBlogTab() {
    el.tabBlog.classList.remove("active");
    el.viewBlog.classList.remove("active");
    el.blogActions.classList.add("hidden");
  }

  el.tabBlog.addEventListener("click", activateBlogTab);
  el.tabWork.addEventListener("click", leaveBlogTab);
  el.tabDraft.addEventListener("click", leaveBlogTab);

  function liveArticleFromDraft(fallback) {
    if (!fallback) return null;
    const title = $("pvTitle")?.innerText.trim() || fallback.title || "";
    const subtitles = $("pvSubtitle")?.innerText
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean) || fallback.subtitles || [];
    const paragraphNodes = Array.from($("pvContent")?.children || [])
      .filter((node) => node.tagName === "P");
    const body = paragraphNodes.length
      ? paragraphNodes.map((node) => node.innerText.trim()).filter(Boolean).join("\n\n")
      : fallback.body || "";
    const keywords = Array.from($("pvKeywords")?.querySelectorAll(".kw-tag") || [])
      .map((node) => node.innerText.replace(/^#/, "").trim())
      .filter(Boolean);

    return {
      title,
      subtitles,
      body,
      keywords: keywords.length ? keywords : fallback.keywords || [],
    };
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

  function signatureOf(source) {
    return source ? [source.article.title, source.article.body].join("\n") : "";
  }

  async function updateSourceCard() {
    sourceCache = await getSource();
    const ready = Boolean(sourceCache);
    el.blogSourceEmpty.classList.toggle("hidden", ready);
    el.blogSourceReady.classList.toggle("hidden", !ready);
    el.blogSourceTitle.textContent = ready ? sourceCache.article.title : "-";
    refreshButtons();
  }

  const styleButtons = document.querySelectorAll(".blog-style-card[data-blog-style]");
  styleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      styleButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      B.style = button.dataset.blogStyle;
      const recommended = GW_BLOG_STYLE[B.style]?.design;
      if (recommended && GWNaverBlog.DESIGNS[recommended]) {
        B.design = recommended;
        showDesign();
      }
      save();
    });
  });

  const lengthButtons = document.querySelectorAll(".blog-length[data-blog-length]");
  lengthButtons.forEach((button) => {
    button.addEventListener("click", () => {
      lengthButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      B.length = button.dataset.blogLength;
      save();
    });
  });

  function aiConfig(platform) {
    return platform === "gemini" ? GW.GEMINI : GW.CHATGPT;
  }

  el.btnMakeBlogDraft.addEventListener("click", () =>
    guard(el.btnMakeBlogDraft, "블로그 작성 준비 중", async () => {
      const source = await getSource();
      if (!source) throw new Error("먼저 2 · 초안 다듬기에 기사를 준비해 주세요.");

      const sourceSignature = signatureOf(source);
      if (B.sourceSignature !== sourceSignature) {
        B.article = null;
        B.media = GWMediaCover.normalize(source.media.map((item) => ({ ...item })));
        B.pendingImage = null;
        B.sourceSignature = sourceSignature;
        renderBlog();
      }
      B.vacancy = source.vacancy || null;
      B.listing = await fetchListing(B.vacancy).catch(() => null);

      const config = aiConfig(source.platform);
      const tab = await chrome.tabs.create({ url: config.URL, active: true });
      B.aiTabId = tab.id;
      await save();
      refreshButtons();

      await waitTabReady(tab.id);
      await sleep(1200);
      const filled = await askTab(tab.id, {
        type: "GW_FILL",
        text: gwBuildBlogPrompt(source, { style: B.style, length: B.length }),
      });
      if (!filled.ok) throw new Error(filled.reason || "블로그 작성 지시를 넣지 못했습니다.");

      const submitted = await askTab(tab.id, { type: "GW_SUBMIT" });
      if (!submitted.ok) throw new Error(submitted.reason || "AI 전송 버튼을 누르지 못했습니다.");

      const style = GW_BLOG_STYLE[B.style] || GW_BLOG_STYLE.listing;
      const length = GW_BLOG_LENGTH[B.length] || GW_BLOG_LENGTH.normal;
      toast(`${style.label} · ${length.chars}로 작성을 시작했습니다. 다 나오면 [완성 글 가져오기]를 누르세요.`, "ok", 8000);
      status("블로그 작성 중", "busy");
    })
  );

  async function pullBlogArticle(readOpts = {}) {
    if (!B.aiTabId) throw new Error("먼저 AI 블로그 초안 작성을 눌러 주세요.");
    const onStage = (stage) => status(`블로그 글 읽는 중 (${stage})`, "busy");
    /* 새 답변을 기다리는 중(수정 요청 직후)이 아니면 원문부터 — 화면 읽기는 ChatGPT 코드 상자에서 자주 끊긴다 */
    let text = readOpts.minCount ? "" : await GWChatGptDirect.read(B.aiTabId, onStage);
    if (!text) {
      const response = await askTab(B.aiTabId, { type: "GW_READ", ...readOpts });
      if (response.ok) text = response.text;
      else if (response.unreadable) text = await GWChatGptDirect.read(B.aiTabId, onStage);
      if (!text) {
        throw new Error(
          (response.reason || "AI 응답을 읽지 못했습니다.") +
          " 답변이 다 끝났는지 확인하고 AI 탭을 새로고침(F5)한 뒤 다시 눌러 주세요."
        );
      }
    }

    const parsed = GWArticleJson.parse(text);
    if (!parsed.ok) {
      throw new Error(
        parsed.reason + " AI 탭에서 'JSON 형식으로 다시 출력해줘'라고 요청한 뒤 다시 눌러 주세요."
      );
    }

    B.article = parsed.article;
    blogInsertSlot = null;
    B.pendingImage = null;
    renderBlog();
    await save();
    return parsed.repaired === true;
  }

  el.btnPullBlogDraft.addEventListener("click", () =>
    guard(el.btnPullBlogDraft, "블로그 글 읽는 중", async () => {
      const repaired = await pullBlogArticle();
      toast(repaired ? "AI의 JSON 오류를 복구해 블로그 글을 가져왔습니다." : "블로그 글을 가져왔습니다.", "ok");
      status("블로그 초안 준비됨", "ok");
      el.blogBadge.classList.toggle("hidden", isBlogActive());
    })
  );

  function blogFigureHtml(media, index) {
    const coverControl = media.isCover
      ? '<span class="fig-cover-mark">대표 이미지</span>'
      : `<button type="button" class="fig-btn cover" data-blog-act="cover" data-bi="${index}">대표지정</button>`;
    return (
      `<figure class="art-fig blog-fig" contenteditable="false" data-bi="${index}">` +
      `<img src="${esc(media.url)}" alt="">` +
      '<div class="fig-tools">' +
      coverControl +
      `<button type="button" class="fig-btn" data-blog-act="replace" data-bi="${index}">사진 바꾸기</button>` +
      `<button type="button" class="fig-btn del" data-blog-act="remove" data-bi="${index}">삭제</button>` +
      '</div>' +
      `<figcaption class="art-cap blog-cap" contenteditable="true" spellcheck="false">${esc(media.caption || "")}</figcaption>` +
      '</figure>'
    );
  }

  function bodyParagraphs() {
    return Array.from(el.blogContent.children).filter((node) => node.tagName === "P");
  }

  function renderBlog() {
    B.media = GWMediaCover.normalize(B.media);
    if (!B.article) {
      el.blogDraftEmpty.classList.remove("hidden");
      el.blogDraftBody.classList.add("hidden");
      el.blogActions.classList.add("hidden");
      return;
    }

    el.blogDraftEmpty.classList.add("hidden");
    el.blogDraftBody.classList.remove("hidden");
    el.blogActions.classList.toggle("hidden", !isBlogActive() || el.viewBlog.classList.contains("locked"));
    el.blogDate.textContent = new Date().toLocaleString("ko-KR", {
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    });
    el.blogTitle.textContent = B.article.title || "";
    el.blogKeywords.innerHTML = (B.article.keywords || [])
      .map((keyword) => `<span class="kw-tag">#${esc(keyword)}</span>`)
      .join("");

    const coverIndex = GWMediaCover.indexOf(B.media);
    const cover = coverIndex >= 0 ? B.media[coverIndex] : null;
    el.blogCover.classList.toggle("hidden", !cover);
    el.blogCover.innerHTML = cover ? blogFigureHtml(cover, coverIndex) : "";

    // 네이버로 보낼 때와 같은 배치 규칙을 쓴다 (shared/naver-blog.js)
    const paragraphs = GWNaverBlog.splitParagraphs(B.article.body);
    const slots = GWNaverBlog.layoutMediaSlots(paragraphs.length, B.media);

    const figuresAt = (slot) => slots[slot]
      .map((item) => blogFigureHtml(item.media, item.index))
      .join("");
    let html = figuresAt(0);
    paragraphs.forEach((paragraph, index) => {
      // ■는 "여기가 소제목"이라는 표시일 뿐이다. 미리보기에서는 떼고 굵게 보여 주고, 저장할 때 다시 붙인다.
      const paragraphNode = paragraph.startsWith("■")
        ? `<p class="blog-section-heading" data-heading="1">${esc(paragraph.replace(/^■\s*/, ""))}</p>`
        : `<p>${esc(paragraph)}</p>`;
      html += paragraphNode + figuresAt(index + 1);
    });
    el.blogContent.innerHTML = html;
    bindCaptionEdits();
    refreshButtons();
  }

  function bindCaptionEdits() {
    document.querySelectorAll(".blog-cap").forEach((caption) => {
      if (caption.dataset.bound) return;
      caption.dataset.bound = "1";
      caption.addEventListener("blur", () => {
        const figure = caption.closest(".blog-fig");
        const index = Number(figure?.dataset.bi);
        if (B.media[index]) B.media[index].caption = caption.innerText.trim();
        save();
      });
    });
  }

  function harvestBlog() {
    if (!B.article) return;
    B.article.title = el.blogTitle.innerText.trim();
    B.article.body = bodyParagraphs()
      .map((paragraph) => {
        const text = paragraph.innerText.trim();
        if (!text) return "";
        return paragraph.dataset.heading && !text.startsWith("■") ? `■ ${text}` : text;
      })
      .filter(Boolean)
      .join("\n\n");
  }

  [el.blogTitle, el.blogContent].forEach((node) => {
    node.addEventListener("blur", () => {
      harvestBlog();
      save();
    });
  });

  function rememberBlogCursor() {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const node = selection.anchorNode;
    if (!node || !el.blogContent.contains(node)) return;
    const paragraph = (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement)?.closest("p");
    const paragraphs = bodyParagraphs();
    if (paragraph && el.blogContent.contains(paragraph)) {
      blogInsertSlot = Math.max(0, paragraphs.indexOf(paragraph) + 1);
    }
  }

  ["mouseup", "keyup", "input", "focus"].forEach((eventName) => {
    el.blogContent.addEventListener(eventName, rememberBlogCursor);
  });

  function chosenInsertSlot() {
    const length = bodyParagraphs().length;
    if (!Number.isInteger(blogInsertSlot)) return Math.min(1, length);
    return Math.max(0, Math.min(blogInsertSlot, length));
  }

  function handleMediaButton(event) {
    const button = event.target.closest("[data-blog-act]");
    if (!button) return false;
    const index = Number(button.dataset.bi);
    const action = button.dataset.blogAct;
    if (!B.media[index]) return true;

    if (action === "cover") {
      B.media = GWMediaCover.select(B.media, index);
      renderBlog();
      save();
      toast("블로그 대표 이미지를 바꿨습니다.", "ok");
    } else if (action === "remove") {
      B.media.splice(index, 1);
      B.media = GWMediaCover.normalize(B.media);
      renderBlog();
      save();
      toast("블로그에서 사진을 뺐습니다.", "ok");
    } else if (action === "replace") {
      replaceMediaIndex = index;
      el.blogFileImage.click();
    }
    return true;
  }

  el.blogContent.addEventListener("click", (event) => {
    if (!handleMediaButton(event)) rememberBlogCursor();
  });
  el.blogCover.addEventListener("click", handleMediaButton);

  el.btnReviseBlog.addEventListener("click", reviseBlog);
  el.btnPullBlogRevised.addEventListener("click", () =>
    guard(el.btnPullBlogRevised, "수정글 읽는 중", async () => {
      const repaired = await pullBlogArticle();
      toast(repaired ? "JSON 오류를 복구해 수정 글을 가져왔습니다." : "수정된 블로그 글을 가져왔습니다.", "ok");
      status("블로그 초안 갱신됨", "ok");
    })
  );
  el.blogReviseInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") reviseBlog();
  });

  function reviseBlog() {
    const request = el.blogReviseInput.value.trim();
    if (!request) {
      toast("블로그 글에서 고칠 점을 적어 주세요.", "bad");
      return;
    }

    guard(el.btnReviseBlog, "블로그 수정 요청 중", async () => {
      if (!B.aiTabId) throw new Error("블로그 초안을 만든 AI 탭이 없습니다.");
      harvestBlog();
      await save();
      await chrome.tabs.update(B.aiTabId, { active: true });
      // 보내기 전 답변 수를 세어 두었다가 새 답변만 읽는다 (예전 AI 탭이면 세지 못한다)
      const before = await askTab(B.aiTabId, { type: "GW_COUNT" }).catch(() => null);

      const filled = await askTab(B.aiTabId, { type: "GW_FILL", text: gwBuildBlogRevisePrompt(request) });
      if (!filled.ok) throw new Error(filled.reason || "수정 요청을 넣지 못했습니다.");
      const submitted = await askTab(B.aiTabId, { type: "GW_SUBMIT" });
      if (!submitted.ok) throw new Error(submitted.reason || "수정 요청을 전송하지 못했습니다.");

      el.blogReviseInput.value = "";
      if (!before?.ok) {
        toast("블로그 글 수정을 요청했습니다. AI 답변이 끝나면 [수정글 가져오기]를 눌러 주세요.", "info", 9000);
        status("수정 답변 기다리는 중", "busy");
        return;
      }
      toast("블로그 글 수정을 요청했습니다. 새 답변이 끝나면 자동으로 가져옵니다.", "info");
      const repaired = await pullBlogArticle({ minCount: before.count + 1, maxMs: 180000 });
      toast(repaired ? "JSON 오류를 복구해 수정 글을 가져왔습니다." : "수정된 블로그 글을 가져왔습니다.", "ok");
      status("블로그 초안 갱신됨", "ok");
    });
  }

  const designButtons = document.querySelectorAll(".blog-design[data-blog-design]");
  function showDesign() {
    designButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.blogDesign === B.design);
    });
    el.blogDesignHint.textContent = GWNaverBlog.DESIGNS[B.design]?.hint || "";
  }
  designButtons.forEach((button) => {
    button.addEventListener("click", () => {
      B.design = button.dataset.blogDesign;
      showDesign();
      save();
    });
  });

  const imageStyleButtons = document.querySelectorAll(".blog-image-style[data-blog-image-style]");
  imageStyleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      imageStyleButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      B.imageStyle = button.dataset.blogImageStyle;
      save();
    });
  });

  el.blogImageRequest.addEventListener("change", () => {
    B.imageRequest = el.blogImageRequest.value.trim();
    save();
  });

  function addBlogImage(url, slot) {
    B.media.push({
      kind: "ai",
      url,
      caption: "블로그 본문을 바탕으로 AI가 생성한 이미지",
      insertAfterParagraph: slot,
    });
    B.media = GWMediaCover.normalize(B.media);
    B.pendingImage = null;
    renderBlog();
    save();
    status("블로그 이미지 추가됨", "ok");
  }

  el.btnMakeBlogImage.addEventListener("click", () =>
    guard(el.btnMakeBlogImage, "블로그 이미지 요청 중", async () => {
      if (!B.article) throw new Error("먼저 블로그 초안을 만들어 주세요.");
      if (!B.aiTabId) throw new Error("블로그 초안을 만든 AI 탭이 없습니다.");

      harvestBlog();
      B.imageRequest = el.blogImageRequest.value.trim();
      const requestKey = JSON.stringify([B.imageStyle, B.imageRequest]);

      if (B.pendingImage && B.pendingImage.requestKey === requestKey) {
        const found = await askTab(B.aiTabId, { type: "GW_GET_IMAGE" });
        const isNew = found.ok && found.url && (
          found.url !== B.pendingImage.beforeUrl || Number(found.count || 0) > B.pendingImage.beforeCount
        ) && !B.media.some((item) => item.url === found.url);
        if (isNew) {
          addBlogImage(found.url, B.pendingImage.slot);
          toast("AI 이미지를 블로그 글에 넣었습니다.", "ok");
          return;
        }
        toast("AI 이미지가 아직 만들어지는 중입니다. 완성된 뒤 다시 눌러 주세요.", "info", 6000);
        status("이미지 생성 중", "busy");
        return;
      }

      const source = await getSource();
      const before = await askTab(B.aiTabId, { type: "GW_GET_IMAGE" }).catch(() => null);
      await chrome.tabs.update(B.aiTabId, { active: true });
      const filled = await askTab(B.aiTabId, {
        type: "GW_FILL",
        text: gwBuildImagePrompt(source?.vacancy || null, B.article, {
          style: B.imageStyle,
          request: B.imageRequest,
        }),
      });
      if (!filled.ok) throw new Error(filled.reason || "이미지 요청을 넣지 못했습니다.");
      const submitted = await askTab(B.aiTabId, { type: "GW_SUBMIT" });
      if (!submitted.ok) throw new Error(submitted.reason || "이미지 요청을 전송하지 못했습니다.");

      B.pendingImage = {
        requestKey,
        beforeUrl: before?.ok ? before.url : "",
        beforeCount: before?.ok ? Number(before.count || 0) : 0,
        slot: chosenInsertSlot(),
      };
      await save();
      const imageStyle = GW_IMAGE_STYLE[B.imageStyle] || GW_IMAGE_STYLE.news;
      toast(`${imageStyle.label} 이미지를 요청했습니다. 완성된 뒤 이 버튼을 한 번 더 누르세요.`, "info", 8000);
      status("이미지 생성 중", "busy");
    })
  );

  el.btnInsertBlogImage.addEventListener("click", () => {
    replaceMediaIndex = -1;
    el.blogFileImage.click();
  });

  el.blogFileImage.addEventListener("change", () => {
    const file = el.blogFileImage.files?.[0];
    el.blogFileImage.value = "";
    if (!file) return;
    const targetIndex = replaceMediaIndex;
    replaceMediaIndex = -1;

    const reader = new FileReader();
    reader.onload = () => {
      if (targetIndex >= 0 && B.media[targetIndex]) {
        B.media[targetIndex] = { ...B.media[targetIndex], url: reader.result, kind: "upload", real: true };
        toast("블로그 사진을 바꿨습니다.", "ok");
      } else {
        B.media.push({
          kind: "upload",
          url: reader.result,
          caption: "",
          real: true,
          insertAfterParagraph: chosenInsertSlot(),
        });
        toast("블로그 글에 사진을 넣었습니다.", "ok");
      }
      B.media = GWMediaCover.normalize(B.media);
      renderBlog();
      save();
    };
    reader.onerror = () => toast("이미지를 읽지 못했습니다.", "bad");
    reader.readAsDataURL(file);
  });

  function naverTags() {
    return GWNaverBlog.normalizeTags(B.article?.keywords);
  }

  /* 네이버 페이지에서는 외부 사진을 못 받을 수 있으므로 작업창(확장 권한)에서 미리 받아 넘긴다. */
  async function imageToDataUrl(url) {
    if (!url) return null;
    if (url.startsWith("data:")) return url;
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) return null;
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (_) {
      return null;
    }
  }

  /* 매물 출처 정보(중개사무소·소재지·고정 상세 주소)를 공실뉴스에서 받아 온다.
     API는 매물을 가져온 공실뉴스 사이트(운영 또는 localhost)에 묻고, 링크는 항상 운영 주소로 만든다. */
  async function fetchListing(vacancy) {
    const id = vacancy?.vacancyId;
    if (!id) return null;
    let origin = GWNaverBlog.SITE_URL;
    try {
      const pageOrigin = new URL(vacancy.url).origin;
      if (/^https:\/\/([a-z0-9-]+\.)?gongsilnews\.com$|^http:\/\/localhost(:\d+)?$/i.test(pageOrigin)) origin = pageOrigin;
    } catch (_) {
      /* 주소가 없으면 운영 사이트에 묻는다 */
    }
    const response = await fetch(`${origin}/api/extension/vacancy-source?id=${encodeURIComponent(id)}`, {
      credentials: "include", // 서버가 로그인 회원 등급을 확인한다
    });
    const data = await response.json();
    if (!data?.success) throw new Error(data?.error || "매물 출처 정보를 가져오지 못했습니다.");
    return {
      detailUrl: `${GWNaverBlog.SITE_URL}${data.detailPath}`,
      location: data.location || "",
      propertyType: data.propertyType || "",
      tradeType: data.tradeType || "",
      owner: data.owner || null,
      capturedAt: new Date().toISOString(),
    };
  }

  async function naverBlocks() {
    const media = GWMediaCover.normalize(B.media);
    // 예전 초안(매물 정보 고정 전)은 지금 1번 탭의 매물 정보를 쓴다
    const vacancy = B.vacancy || (await getSource().catch(() => null))?.vacancy || null;
    if (!B.listing) B.listing = await fetchListing(vacancy); // 권한 없음·로그인 필요 오류는 그대로 보여 준다
    const problems = GWNaverBlog.listingProblems(B.listing);
    if (problems.length) {
      throw new Error(
        `부동산 표시·광고 필수 정보가 없어 전송을 멈췄습니다: ${problems.join(", ")}. ` +
        "공실뉴스 매물의 등록자정보를 확인한 뒤 1번 탭에서 물건을 다시 가져오고 블로그 초안을 새로 만들어 주세요."
      );
    }
    await save();
    const blocks = GWNaverBlog.buildNaverBlocks(B.article.body, media, {
      design: B.design,
      title: B.article.title,
      vacancy,
      listing: B.listing,
    });
    return Promise.all(blocks.map(async (block) => (
      block.type === "image"
        ? { type: "image", dataUrl: await imageToDataUrl(media[block.mediaIndex]?.url) }
        : block
    )));
  }

  async function findNaverWriteTab() {
    const tabs = await chrome.tabs.query({ currentWindow: true, url: NAVER_TAB_PATTERNS });
    const likely = GWNaverBlog.selectLikelyWriteTab(tabs);
    const ordered = likely ? [likely, ...tabs.filter((tab) => tab.id !== likely.id)] : tabs;

    for (const tab of ordered) {
      let frames = [{ frameId: 0 }];
      try {
        const detected = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
        if (detected?.length) {
          // SmartEditor ONE은 mainFrame 안에서 실행된다. 자식 프레임부터 확인한다.
          frames = [...detected].sort((a, b) => Number(a.frameId === 0) - Number(b.frameId === 0));
        }
      } catch (_) {
        /* 프레임 목록을 못 읽으면 최상위 문서에서 한 번 시도한다. */
      }

      for (const frame of frames) {
        try {
          const ping = await chrome.tabs.sendMessage(
            tab.id,
            { type: "GW_PING_NAVER_WRITE" },
            { frameId: frame.frameId }
          );
          if (ping?.ok) return { tab, frameId: frame.frameId, likely };
        } catch (_) {
          /* 일반 블로그 프레임 또는 확장 새로고침이 필요한 프레임은 건너뛴다. */
        }
      }
    }
    return { tab: null, frameId: null, likely };
  }

  el.btnSendNaver.addEventListener("click", () =>
    guard(el.btnSendNaver, "네이버 블로그로 보내는 중", async () => {
      if (!B.article) throw new Error("보낼 블로그 초안이 없습니다.");
      harvestBlog();
      if (!B.article.title || !B.article.body) throw new Error("블로그 제목과 본문이 있어야 합니다.");
      await save();

      const tags = naverTags();
      const fallbackText = [B.article.title, B.article.body, tags.map((tag) => `#${tag}`).join(" ")]
        .filter(Boolean)
        .join("\n\n");
      await navigator.clipboard.writeText(fallbackText).catch(() => {});

      const found = await findNaverWriteTab();
      if (!found.tab && found.likely) {
        await chrome.tabs.update(found.likely.id, { active: true });
        toast("열려 있는 네이버 글쓰기 탭을 새로고침(F5)한 뒤 [블로그글 전송하기]를 다시 눌러 주세요.", "info", 9000);
        status("네이버 탭 새로고침 필요", "bad");
        return;
      }
      if (!found.tab) {
        await chrome.tabs.create({ url: GWNaverBlog.WRITE_URL, active: true });
        toast("네이버 글쓰기 화면을 열었습니다. 로그인하거나 새 글이 뜨면 [블로그글 전송하기]를 다시 눌러 주세요.", "info", 9000);
        status("네이버 글쓰기 열림", "ok");
        return;
      }

      const tab = found.tab;
      const blocks = await naverBlocks();
      const imagesTotal = blocks.filter((block) => block.type === "image").length;
      await chrome.tabs.update(tab.id, { active: true });
      const result = await chrome.tabs.sendMessage(
        tab.id,
        {
          type: "GW_APPLY_BLOG_DRAFT",
          payload: { title: B.article.title, blocks, tags },
        },
        { frameId: found.frameId }
      );
      if (!result?.ok) throw new Error(result?.error || "네이버 블로그 글쓰기 화면에 넣지 못했습니다.");

      const imagesSkipped = Math.max(0, imagesTotal - (result.imagesInserted || 0));
      const tagNote = tags.length ? " 태그는 [발행]을 누르면 태그 칸에 채워집니다." : "";
      if (imagesSkipped > 0) {
        toast(`제목과 본문을 전송했습니다. 사진 ${imagesSkipped}장은 네이버에서 직접 넣어 주세요.${tagNote} 글 전체는 클립보드에도 복사했습니다.`, "ok", 12000);
      } else {
        const imageNote = result.imagesInserted ? ` 사진 ${result.imagesInserted}장도 함께 넣었습니다.` : "";
        toast(`네이버 글쓰기 화면에 제목과 본문을 채웠습니다.${imageNote}${tagNote} 확인 후 네이버에서 직접 발행해 주세요.`, "ok", 10000);
      }
      status("블로그 전송 완료", "ok");
    })
  );

  function refreshButtons() {
    const hasSource = Boolean(sourceCache);
    el.btnMakeBlogDraft.disabled = !hasSource;
    el.btnPullBlogDraft.disabled = !B.aiTabId;
    el.btnReviseBlog.disabled = !B.article || !B.aiTabId;
    el.btnPullBlogRevised.disabled = !B.aiTabId;
    el.btnMakeBlogImage.disabled = !B.article || !B.aiTabId;
    el.btnInsertBlogImage.disabled = !B.article;
    el.btnSendNaver.disabled = !B.article;
  }

  let lastSaveError = "";
  function save() {
    return chrome.storage.local.set({ [BLOG_STATE_KEY]: B }).catch((error) => {
      const message = error.message || String(error);
      if (message !== lastSaveError) {
        lastSaveError = message;
        toast("블로그 작업 내용을 저장하지 못했습니다 — " + message, "bad", 9000);
      }
    });
  }

  async function restore() {
    const stored = await chrome.storage.local.get(BLOG_STATE_KEY);
    const previous = stored[BLOG_STATE_KEY];
    if (previous) Object.assign(B, previous);
    if (!GW_BLOG_STYLE[B.style]) B.style = "listing";
    if (!GW_BLOG_LENGTH[B.length]) B.length = "normal";
    if (!GW_IMAGE_STYLE[B.imageStyle]) B.imageStyle = "news";
    if (!Array.isArray(B.media)) B.media = [];
    B.media = GWMediaCover.normalize(B.media);
    if (typeof B.imageRequest !== "string") B.imageRequest = "";

    if (B.aiTabId) {
      const live = await chrome.tabs.get(B.aiTabId).catch(() => null);
      if (!live) B.aiTabId = null;
    }

    styleButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.blogStyle === B.style);
    });
    lengthButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.blogLength === B.length);
    });
    imageStyleButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.blogImageStyle === B.imageStyle);
    });
    if (!GWNaverBlog.DESIGNS[B.design]) B.design = "basic";
    showDesign();
    el.blogImageRequest.value = B.imageRequest;
    renderBlog();
    await updateSourceCard();
  }

  restore().catch((error) => {
    console.error("[공실뉴스 블로그 작성] 복원 실패", error);
    refreshButtons();
  });
})();
