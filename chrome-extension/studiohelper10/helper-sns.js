/* 인스타그램 · 스레드 · 페이스북 — 앱에서 보낸 일감(글·사진)을 받아 새 게시물 화면에 넣는다
   - 앱 helper-server 에 이 채널 일감이 있을 때만 움직인다 (평소에는 아무것도 하지 않는다)
   - 새 게시물 열기 → 사진 넣기 → 글 넣기까지. [공유하기]·[게시]는 누르지 않는다
   - 사이트 화면이 바뀌어 못 찾은 단계는 도우미 상자에 알리고, 상자 단추로 회원이 이어서 한다
   - 찾는 글자·이름표(SEL)는 사이트가 바뀌면 여기만 고친다 (앱 sns-upload.js 의 인스타그램 찾기와 같은 이름표) */
(() => {
  "use strict";
  const H = location.hostname;
  const target = /instagram\.com$/.test(H) ? "instagram" : /threads\.(com|net)$/.test(H) ? "threads" : /facebook\.com$/.test(H) ? "facebook" : "";
  if (!target || window.top !== window) return;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const send = (msg) => new Promise((resolve) => {
    try { chrome.runtime.sendMessage(msg, (r) => resolve(chrome.runtime.lastError ? null : r)); } catch (_) { resolve(null); }
  });

  /* 지운 글 확인 (2026-10-29) — 도우미가 #gs-verify 를 붙여 연 창. 로그인 화면이면 모름(null), "없는 페이지"면 지움, 글이 보이면 있음 */
  // 스레드는 지운 글이면 #gs-verify 없이 ?error=invalid_post 로 넘긴다 — 확인 중이 아닌 탭이면 도우미가 무시한다
  if ((location.hash === "#gs-verify" || /error=invalid_post/.test(location.search)) && target) {
    const GONE = /Sorry, this page isn.t available|This page isn.t available|This content isn.t available|Post not found|페이지를 사용할 수 없습니다|이 페이지는 사용할 수 없|콘텐츠를 이용할 수 없|게시물을 사용할 수 없|게시물을 찾을 수 없|링크가 잘못되었거나 페이지가 삭제/i;
    // 스레드만 — 인스타·페북은 댓글에도 "삭제" 같은 말이 있어 넓게 잡지 않는다
    const GONE_TH = /Thread not found|has been deleted|was deleted|스레드를 찾을 수 없|찾을 수 없습니다|삭제되었|삭제된 게시물/i;
    const code = (/\/post\/([A-Za-z0-9_-]+)/.exec(location.pathname) || [])[1] || "";
    (async () => {
      let state = null;
      let loggedOut = false;
      for (let i = 0; i < 16; i++) {
        await sleep(1000);
        const loginForm = document.querySelector("input[name='password'], input[name='pass'], form[action*='login']");
        if (/\/accounts\/login|\/login/.test(location.pathname) || loginForm) { state = null; loggedOut = true; break; }
        const text = (document.body && document.body.innerText) || "";
        // 페이스북은 지운 글 주소를 홈 피드로 보낸다 — 글 주소(permalink·posts·story_fbid)가 사라지면 지운 것 (2026-10-29)
        if (target === "facebook" && i >= 2 && !/permalink|\/posts\/|story_fbid|\/videos\/|\/reel\//.test(location.pathname + location.search)) { state = true; break; }
        // 페이스북: 지운 글 주소는 그대로 둔 채 홈 피드(글쓰기 칸 "무슨 생각을 하고 계신가요?")를 보여 준다 (2026-10-29 기록)
        if (target === "facebook" && i >= 2 && /무슨 생각을 하고 계신가요|What.s on your mind/.test(text.slice(0, 300))) { state = true; break; }
        // 스레드: 지운 글은 프로필 화면(/@아이디)으로 보낸다 — 글 주소(/post/)가 사라지면 지운 것
        if (target === "threads" && i >= 2 && !/\/post\//.test(location.pathname)) { state = true; break; } // 우리는 글 주소만 연다 — 글 화면이 아니면 지운 것
        //  주소는 그대로인데 프로필 머리(팔로워 n명)만 보이고 그 글이 없을 때도 (5초 기다린 뒤)
        if (target === "threads" && code && i >= 5 && /팔로워|followers/i.test(text.slice(0, 150)) && !document.querySelector(`a[href*="/post/${code}"] time`)) { state = true; break; }
        if (GONE.test(text) || (target === "threads" && GONE_TH.test(text.slice(0, 600))) || /error=invalid_post/.test(location.search)) { state = true; break; }
        const shown = target === "instagram" ? document.querySelector("article, main [role='presentation'] img, video")
          // 스레드는 그 글 주소(시간 줄 링크)가 보여야 "있음" — 글자만으로는 모른다 (지운 글도 다른 글이 보인다)
          : target === "threads" ? (code ? document.querySelector(`a[href*="/post/${code}"] time`) : null)
          : null; // 페이스북은 피드에도 다른 글(role=article)이 있어 글자로는 "있음"을 정하지 않는다 — 주소가 그대로면 아래에서
        if (shown && i >= 4) { state = false; break; }
      }
      // 페이스북: 끝까지 글 주소 그대로이고 "없는 페이지" 글자도 없으면 있는 글
      if (state === null && target === "facebook" && !loggedOut && /permalink|\/posts\/|story_fbid|\/videos\/|\/reel\//.test(location.pathname + location.search)) state = false;
      if (state !== true) send({ type: "GS_LOG", text: `${target} 확인 ${state === false ? "있음" : "모름"} — ${((document.body && document.body.innerText) || "").replace(/\s+/g, " ").slice(0, 120)}` });
      send({ type: "GS_VERIFY", gone: state });
    })();
    return;
  }
  const visible = (el) => {
    if (!el || !el.isConnected) return false;
    if (el.closest("[aria-hidden='true'], [inert]")) return false;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
  };
  async function waitFor(fn, ms = 10000, step = 300) {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      const v = fn();
      if (v) return v;
      await sleep(step);
    }
    return null;
  }
  const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();
  /** 보이는 글자가 꼭 맞는 단추·링크 (가장 안쪽 것) */
  function byText(texts, scope = document, sel = "[role='button'],button,a,[role='link'],[role='menuitem'],span,div") {
    const want = texts.map(norm);
    const hits = Array.from(scope.querySelectorAll(sel)).filter((el) => visible(el) && want.includes(norm(el.innerText || el.textContent)));
    const el = hits[hits.length - 1] || null;
    return el ? el.closest("[role='button'],button,a,[role='link'],[role='menuitem']") || el : null;
  }
  /** 글자가 들어 있는 것 (자리표시 글 "무슨 생각을 하고 계신가요?" 같은) */
  function byContains(texts, scope = document, sel = "span,div") {
    const el = Array.from(scope.querySelectorAll(sel)).find((x) => visible(x) && x.children.length === 0 && texts.some((t) => norm(x.textContent).includes(t)));
    return el ? el.closest("[role='button'],button,a,[role='link']") || el : null;
  }
  function click(el) {
    if (!el) return false;
    el.scrollIntoView?.({ block: "center" });
    ["pointerdown", "mousedown", "pointerup", "mouseup"].forEach((t) => el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window })));
    el.click();
    return true;
  }
  const dialogName = (el) => {
    if (!el) return "";
    const ids = (el.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean);
    const labelled = ids.map((id) => document.getElementById(id)?.textContent || "").join(" ");
    return norm(`${el.getAttribute("aria-label") || ""} ${labelled}`);
  };
  const visibleDialogs = () => Array.from(document.querySelectorAll("[role='dialog']")).filter(visible);
  const facebookDialog = () => {
    const list = visibleDialogs();
    const titles = ["게시물 만들기", "create post", "create a post"];
    const composer = list.filter((el) => {
      const name = dialogName(el).toLocaleLowerCase();
      if (titles.some((title) => name.includes(title))) return true;
      return Array.from(el.querySelectorAll("h1,h2,h3,[role='heading']"))
        .some((heading) => visible(heading) && titles.some((title) => norm(heading.textContent).toLocaleLowerCase().includes(title)));
    });
    return composer.filter((el) => el.getAttribute("aria-modal") === "true").pop() || composer.pop() || null;
  };
  const dialog = () => {
    const list = visibleDialogs();
    if (target === "facebook") {
      const composer = facebookDialog();
      if (composer) return composer;
    }
    return list.filter((el) => el.getAttribute("aria-modal") === "true").pop() || list.pop() || null;
  };

  function toFiles(urls) {
    return urls.map((u, i) => {
      const m = /^data:([^;]+);base64,(.*)$/s.exec(u);
      const raw = atob(m ? m[2] : "");
      const bytes = new Uint8Array(raw.length);
      for (let k = 0; k < raw.length; k++) bytes[k] = raw.charCodeAt(k);
      return new File([bytes], `gongsil-${Date.now()}-${String(i + 1).padStart(2, "0")}.jpg`, { type: (m && m[1]) || "image/jpeg" });
    });
  }
  function setFiles(input, files) {
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    input.files = dt.files;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
  const fileInput = (scope = document) => Array.from(scope.querySelectorAll("input[type='file']")).find((i) => !i.disabled && (!i.accept || /image|video/.test(i.accept))) || null;

  const EDITOR_SELECTOR = [
    "[data-lexical-editor='true'][contenteditable]:not([contenteditable='false'])",
    "[contenteditable]:not([contenteditable='false'])[role='textbox']",
    "[contenteditable]:not([contenteditable='false'])",
    "textarea",
    "[role='textbox']",
  ].join(",");
  const DIRECT_EDITOR_SELECTOR = "[contenteditable]:not([contenteditable='false']),textarea,input:not([type]),input[type='text']";
  const isDirectEditor = (el) => Boolean(el && el.matches?.(DIRECT_EDITOR_SELECTOR));
  function canonicalEditor(candidate) {
    if (!candidate) return null;
    if (candidate.matches?.("[data-lexical-editor='true'][contenteditable]:not([contenteditable='false'])")) return candidate;
    const lexical = candidate.querySelector?.("[data-lexical-editor='true'][contenteditable]:not([contenteditable='false'])");
    if (lexical) return lexical;
    if (isDirectEditor(candidate)) return candidate;
    const inner = candidate.querySelector?.(DIRECT_EDITOR_SELECTOR);
    return inner || null;
  }
  function labelledText(el) {
    if (!el) return "";
    const ids = (el.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean);
    const labelled = ids.map((id) => document.getElementById(id)?.textContent || "").join(" ");
    return norm([
      el.getAttribute("aria-label"),
      el.getAttribute("aria-placeholder"),
      el.getAttribute("placeholder"),
      el.getAttribute("data-placeholder"),
      labelled,
    ].filter(Boolean).join(" "));
  }
  function collectEditors(scope = document) {
    const raw = [];
    if (scope.matches?.(EDITOR_SELECTOR)) raw.push(scope);
    raw.push(...scope.querySelectorAll(EDITOR_SELECTOR));
    const found = new Map();
    for (const candidate of raw) {
      const editor = canonicalEditor(candidate);
      if (!editor || found.has(editor) || !visible(editor) || editor.closest("#gs-studio-helper")) continue;
      if (editor.matches("[disabled],[readonly]") || editor.getAttribute("aria-disabled") === "true") continue;
      const wrapper = candidate === editor ? editor.closest("[role='textbox']") : candidate;
      found.set(editor, {
        editor,
        label: norm(`${labelledText(candidate)} ${labelledText(editor)} ${wrapper && wrapper !== editor ? labelledText(wrapper) : ""}`),
        fromTextbox: candidate.getAttribute("role") === "textbox" || editor.getAttribute("role") === "textbox",
      });
    }
    return Array.from(found.values());
  }
  function rankedEditor(scope, names, { requireName = false } = {}) {
    const wanted = (names || []).map((name) => norm(name).toLocaleLowerCase()).filter(Boolean);
    const entries = collectEditors(scope);
    const ranked = [];
    for (const item of entries) {
      const label = item.label.toLocaleLowerCase();
      const nameMatch = wanted.some((name) => label.includes(name));
      const lexical = item.editor.matches("[data-lexical-editor='true']");
      const strongTextbox = item.editor.hasAttribute("contenteditable") && item.fromTextbox;
      if (/검색|search|대체\s*텍스트|alt\s*text/i.test(label)) continue;
      if (requireName && !nameMatch) continue;
      if (target === "facebook" && !lexical && !strongTextbox && !nameMatch) continue;
      let score = 0;
      if (nameMatch) score += 1000;
      if (lexical) score += 500;
      if (item.editor.hasAttribute("contenteditable")) score += 250;
      if (item.fromTextbox) score += 150;
      if (item.editor.matches("textarea,input")) score += 50;
      item.score = score;
      ranked.push(item);
    }
    return ranked.sort((a, b) => b.score - a.score)[0]?.editor || null;
  }
  const textbox = (scope) => collectEditors(scope || document).map((item) => item.editor);
  /** 글 칸 찾기 — 가장 위의 작성 창 안에서 실제 Lexical/contenteditable을 먼저 고른다. */
  function findBox(names) {
    const active = dialog();
    if (active) {
      const inDialog = rankedEditor(active, names);
      // Facebook·스레드 작성창이 떠 있으면 본문이 다시 mount될 때까지 기다린다. 뒤 페이지의 댓글·검색칸으로 떨어지면 안 된다.
      if (inDialog || target === "facebook" || target === "threads") return inDialog;
    }
    return rankedEditor(document, names, { requireName: target === "facebook" || target === "threads" });
  }
  function nearestEditor(node) {
    if (!(node instanceof Element) || node.closest("#gs-studio-helper")) return null;
    const candidate = node.matches(EDITOR_SELECTOR) ? node : node.closest(EDITOR_SELECTOR);
    const editor = canonicalEditor(candidate);
    return editor && visible(editor) ? editor : null;
  }
  function usableEditor(candidate) {
    const editor = canonicalEditor(candidate);
    if (!editor || !visible(editor)) return null;
    if (target === "facebook" || target === "threads") {
      const active = dialog();
      if (active && !active.contains(editor)) return null;
    }
    return editor;
  }
  function resolveLiveEditor(candidate, preferResolved = false) {
    const direct = usableEditor(candidate);
    const resolved = findBox(BOX_NAMES[target] || []);
    return preferResolved ? resolved || direct : direct || resolved;
  }
  function editorText(el) {
    return /^(TEXTAREA|INPUT)$/.test(el?.tagName) ? el.value : el?.innerText || el?.textContent || "";
  }
  function containsText(el, text) {
    const expected = norm(text);
    return !expected || norm(editorText(el)).includes(expected);
  }
  function placeCaret(el) {
    const editor = usableEditor(el);
    if (!editor) return null;
    editor.scrollIntoView?.({ block: "center" });
    editor.focus?.({ preventScroll: true });
    if (!editor.isConnected || !visible(editor)) return null;
    if (!/^(TEXTAREA|INPUT)$/.test(editor.tagName)) {
      const doc = editor.ownerDocument;
      const selection = doc.getSelection();
      const range = doc.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      doc.dispatchEvent(new Event("selectionchange", { bubbles: true }));
    }
    return editor;
  }
  /** 글 넣기 — 편집기(Lexical 등)가 받아들이게 붙여넣기 이벤트로, 안 되면 insertText */
  async function insertText(candidate, text) {
    let el = usableEditor(candidate);
    if (!el) return false;
    if (containsText(el, text)) return true; // 재시도 때 같은 글을 두 번 넣지 않는다
    const beforeText = norm(editorText(el));
    if (beforeText) return false; // 이미 다른/일부 글이 있으면 덧붙여 중복시키지 않는다
    // 크롬 창이 뒤에 있으면(앱을 보고 있으면) 편집기가 글을 무시한다 → 창을 앞으로
    if (!document.hasFocus()) {
      const focused = await send({ type: "GS_FOCUS" });
      window.focus();
      const regained = await waitFor(() => document.hasFocus(), 3000, 50);
      if (!focused?.ok || !regained) return false;
    }
    el = placeCaret(el);
    if (!el) return false;
    await sleep(300);
    if (/^(TEXTAREA|INPUT)$/.test(el.tagName)) {
      const view = el.ownerDocument.defaultView;
      const proto = el.tagName === "TEXTAREA" ? view.HTMLTextAreaElement.prototype : view.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      setter ? setter.call(el, text) : (el.value = text);
      el.dispatchEvent(new view.InputEvent("input", { bubbles: true, composed: true, inputType: "insertText", data: text }));
      return containsText(el, text);
    }
    await sleep(350); // 커서가 편집기에 자리 잡을 때까지
    const view = el.ownerDocument.defaultView;
    const dt = new view.DataTransfer();
    dt.setData("text/plain", text);
    el.dispatchEvent(new view.ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true, composed: true }));
    await sleep(600);
    let live = resolveLiveEditor(el, true);
    if (live && containsText(live, text)) return true;
    const changed = norm(editorText(el)) !== beforeText || (live && norm(editorText(live)) !== beforeText);
    if (changed) return false; // 부분 입력 뒤 전체 글을 다시 붙여 중복시키지 않는다
    // 붙여넣기 처리 중 React가 편집기 노드나 selection을 바꿀 수 있어 다시 찾고 커서를 재설정한다.
    live = placeCaret(live || resolveLiveEditor(el, true));
    if (!live) return false;
    const doc = live.ownerDocument;
    const lines = String(text).split("\n");
    lines.forEach((line, i) => {
      if (line) doc.execCommand("insertText", false, line);
      if (i < lines.length - 1) doc.execCommand("insertParagraph", false);
    });
    await sleep(500);
    const current = resolveLiveEditor(live, true);
    return Boolean(current && containsText(current, text));
  }
  /** 글 칸을 못 찾았을 때 — 화면에 있던 편집 칸을 짧게 적어 보여 준다 (고칠 때 쓰려고) */
  const boxDiag = () => {
    const l = collectEditors(document).map((item) => item.editor);
    return `
 (보이는 편집 칸 ${l.length}개: ${l.slice(0, 5).map((el) => `${el.tagName.toLowerCase()} lexical=${el.getAttribute("data-lexical-editor") || "-"} ce=${el.getAttribute("contenteditable")} role=${el.getAttribute("role") || "-"} 이름=${labelledText(el).slice(0, 24)} 폭=${Math.round(el.getBoundingClientRect().width)}`).join(" / ")})`;
  };
  const BOX_NAMES = {
    facebook: ["무슨 생각을 하고 계신가요", "What's on your mind", "에 대해 이야기", "사진에 대해", "Say something about this photo", "Write something about this photo", "Create a public post", "Create post"],
    instagram: ["문구", "Write a caption", "caption"],
    threads: ["새로운 소식", "What's new", "스레드 시작", "Start a thread", "텍스트 필드", "Empty text field"],
  };

  /* ── 채널마다 찾을 것 ── */
  const SEL = {
    instagram: {
      create: ["svg[aria-label='새로운 게시물']", "svg[aria-label='New post']", "svg[aria-label='만들기']", "svg[aria-label='Create']"],
      createText: ["만들기", "Create"],
      post: ["게시물", "Post"],
      next: ["다음", "Next"],
      caption: ["div[aria-label^='문구']", "div[aria-label^='Write a caption']"],
    },
    facebook: {
      composer: ["무슨 생각을 하고 계신가요", "What's on your mind"],
      photo: ["[aria-label='사진/동영상']", "[aria-label='Photo/video']"],
    },
    threads: {
      composer: ["새로운 소식이 있나요?", "What's new?", "스레드 시작하기", "Start a thread"],
      create: ["svg[aria-label='만들기']", "svg[aria-label='Create']", "svg[aria-label='새 스레드']"],
      add: ["스레드에 추가", "Add to thread"],
    },
  };
  const firstSel = (list, scope = document) => {
    for (const s of list) {
      const el = Array.from(scope.querySelectorAll(s)).find(visible);
      if (el) return el.closest("a,[role='button'],[role='link'],button") || el;
    }
    return null;
  };

  let job = null;
  let panel = null;
  let warned = false;
  let lastWarn = "";
  let lastEditor = null;
  let stopTextRecovery = null;
  const warn = (t) => { warned = true; lastWarn = t; panel.status(t, "warn"); };
  const finish = (t) => (warned ? panel.status(lastWarn, "warn") : panel.status(t, "ok"));

  document.addEventListener("focusin", (event) => {
    const editor = nearestEditor(event.target);
    if (editor) lastEditor = editor;
  }, true);

  /* 자동으로 글이 안 들어가면 — 회원이 그 글 칸을 한 번 누르는 순간 넣는다.
     (앱을 보고 있으면 윈도우가 크롬을 앞으로 못 꺼내 편집기가 글을 무시한다. 회원이 누르면 크롬이 확실히 앞에 있다) */
  async function putText(el, text, name) {
    stopTextRecovery?.();
    if (el && (await insertText(el, text))) return true;
    let trying = false;
    let cancelled = false;
    let timeout = null;
    let attemptTimer = null;
    let outlined = canonicalEditor(el);
    const clearOutline = () => {
      if (outlined?.isConnected) outlined.style.outline = "";
    };
    const cleanup = () => {
      cancelled = true;
      document.removeEventListener("pointerdown", onInteract, true);
      document.removeEventListener("focusin", onInteract, true);
      clearTimeout(timeout);
      clearTimeout(attemptTimer);
      clearOutline();
      if (stopTextRecovery === cleanup) stopTextRecovery = null;
    };
    const onInteract = (event) => {
      if (trying || event.target?.closest?.("#gs-studio-helper")) return;
      const clicked = nearestEditor(event.target);
      const fresh = clicked || findBox(BOX_NAMES[target] || []);
      if (!fresh) return;
      // 회원이 누른 바로 이 순간에 글을 클립보드에 — 메타가 확장이 넣은 글을 무시해도 Ctrl+V 한 번이면 된다 (2026-10-23)
      try { void navigator.clipboard.writeText(text).catch(() => {}); } catch (_) {}
      lastEditor = fresh;
      trying = true;
      attemptTimer = setTimeout(async () => {
        if (cancelled) return;
        const live = usableEditor(fresh) || usableEditor(lastEditor) || findBox(BOX_NAMES[target] || []);
        const ok = await insertText(live, text);
        if (cancelled) return;
        trying = false;
        if (ok) {
          cleanup();
          warned = false;
          panel.status("글을 넣었어요. 확인하고 [게시]·[공유하기]를 직접 눌러 주세요.", "ok");
        } else {
          panel.status("글을 복사해 뒀어요. 지금 글 칸에서 Ctrl+V 한 번만 눌러 주세요.", "warn");
        }
      }, 180);
    };
    document.addEventListener("pointerdown", onInteract, true);
    document.addEventListener("focusin", onInteract, true);
    timeout = setTimeout(cleanup, 2 * 60 * 1000);
    stopTextRecovery = cleanup;
    if (outlined && visible(outlined)) {
      outlined.style.outline = "3px solid #16a34a";
      setTimeout(clearOutline, 8000);
    }
    warn(outlined
      ? `👉 ${name} 글 칸(초록 테두리)을 한 번 눌러 주세요 — 바로 넣고, 안 들어가면 복사해 둘 테니 Ctrl+V 한 번이면 돼요.`
      : `👉 ${name} 글 칸을 한 번 눌러 주세요 — 바로 넣고, 안 들어가면 복사해 둘 테니 Ctrl+V 한 번이면 돼요.`);
    return false;
  }
  /* 영상(릴스) — 앱이 내준 파일을 보이지 않는 확장 창(file-bridge)으로 받는다 (helper-youtube.js 와 같은 길) */
  function fetchFile(f) {
    return new Promise((resolve, reject) => {
      const frame = document.createElement("iframe");
      frame.style.cssText = "position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none";
      frame.src = chrome.runtime.getURL(`file-bridge.html?token=${encodeURIComponent(f.token)}&name=${encodeURIComponent(f.name)}&type=${encodeURIComponent(f.type)}&origin=${encodeURIComponent(location.origin)}`);
      const done = (fn) => { window.removeEventListener("message", on); clearTimeout(t); frame.remove(); fn(); };
      const on = (e) => {
        if (e.origin !== new URL(chrome.runtime.getURL("")).origin || !e.data || e.data.gsFile !== f.token) return; // 우리 확장 창이 보낸 것만
        done(() => (e.data.file ? resolve(e.data.file) : reject(new Error(e.data.error || "파일을 받지 못했어요."))));
      };
      const t = setTimeout(() => done(() => reject(new Error("영상 파일을 받는 데 너무 오래 걸려요."))), 5 * 60 * 1000);
      window.addEventListener("message", on);
      document.documentElement.appendChild(frame);
    });
  }
  let videoFile = null;
  const files = async () => {
    if (job.video) return [videoFile ||= await fetchFile(job.video)];
    return toFiles(job.photos || []);
  };
  const texts = () => (target === "threads" && job.posts && job.posts.length ? job.posts : [job.text || ""]);

  /* 인스타그램: 만들기 → 게시물 → 사진 → 다음·다음 → 문구 */
  async function instagram() {
    panel.status("새 게시물 만들기를 여는 중…");
    const create = await waitFor(() => firstSel(SEL.instagram.create) || byText(SEL.instagram.createText), 15000);
    if (!create) return warn("[만들기] 단추를 못 찾았어요. 로그인돼 있는지 보고, [만들기]를 직접 누른 뒤 상자의 [사진 넣기]를 눌러 주세요.");
    click(create);
    await sleep(1200);
    const post = byText(SEL.instagram.post);
    if (post && !fileInput(dialog() || document)) { click(post); await sleep(1200); }
    if (!(await addPhotos())) return;
    // 영상이면 "동영상 게시물은 이제 릴스로 공유됩니다" 안내 [확인]
    if (job.video) {
      const ok = await waitFor(() => byText(["확인", "OK"], dialog() || document), 6000);
      if (ok) { click(ok); await sleep(1200); }
    }
    for (let i = 0; i < 2; i++) {
      const nx = await waitFor(() => byText(SEL.instagram.next, dialog() || document), 20000);
      if (!nx) return warn("[다음]을 못 찾았어요. 크롬 창에서 [다음]을 눌러 문구 칸까지 간 뒤 상자의 [글 넣기]를 눌러 주세요.");
      click(nx);
      await sleep(1800);
    }
    const cap = await waitFor(() => firstSel(SEL.instagram.caption, document) || findBox(BOX_NAMES.instagram), 15000);
    await sleep(800);
    if (!cap) return warn("문구 칸을 못 찾았어요. 문구 칸을 한 번 누르고 상자의 [글 넣기]를 눌러 주세요.");
    await putText(cap, texts()[0], "문구");
    return finish("다 채웠어요. 사진·문구를 확인하고 [공유하기]를 직접 눌러 주세요.");
  }

  /* 페이스북: 무슨 생각을 하고 계신가요? → 글 → 사진/동영상 → 사진 */
  async function facebook() {
    panel.status("게시물 만들기를 여는 중…");
    const composerWasOpen = Boolean(facebookDialog());
    if (!composerWasOpen) {
      const comp = await waitFor(() => byContains(SEL.facebook.composer), 15000);
      if (!comp) return warn("게시물 칸('무슨 생각을 하고 계신가요?')을 못 찾았어요. 직접 누른 뒤 상자의 [글 넣기]·[사진 넣기]를 눌러 주세요.");
      click(comp);
      await waitFor(() => facebookDialog() || findBox(BOX_NAMES.facebook), 12000);
      await sleep(800); // 글 칸이 다 뜨기를
    }
    if (!composerWasOpen && (job.video || (job.photos && job.photos.length))) {
      if (!fileInput(dialog() || document)) {
        const ph = firstSel(SEL.facebook.photo, dialog() || document);
        if (ph) { click(ph); await sleep(1200); }
      }
      if (!(await addPhotos())) return;
    }
    // 사진 여러 장을 처리하는 동안 Facebook이 Lexical root를 교체할 수 있다. 같은 live root가 연속으로 보일 때 사용한다.
    let previous = null;
    let stableSince = 0;
    const box = await waitFor(() => {
      const next = findBox(BOX_NAMES.facebook);
      if (!next) { previous = null; stableSince = 0; return null; }
      if (next !== previous) { previous = next; stableSince = Date.now(); }
      return next.isConnected && visible(next) && Date.now() - stableSince >= 1000 ? next : null;
    }, 20000, 250);
    if (!box) {
      await putText(null, texts()[0], "페이스북");
      panel.status(`${lastWarn}${boxDiag()}`, "warn");
      return;
    }
    await putText(box, texts()[0], "페이스북");
    return finish("다 채웠어요. 글·사진을 확인하고 [게시]를 직접 눌러 주세요.");
  }

  /* 스레드: [+](만들기) → 새로운 스레드 창 → 첫 글 + 사진 → 스레드에 추가로 이어 쓰기
     늘 새 스레드 창을 열고 그 창 안의 칸에만 넣는다 — 화면에 보이던 홈 줄·답글 칸에 넣고 창을 안 열던 것 (2026-10-31 사장님) */
  async function threads() {
    panel.status("새 스레드를 여는 중…");
    const inDialog = () => { const d = dialog(); return d ? rankedEditor(d, BOX_NAMES.threads) : null; };
    let box = inDialog();
    if (!box) {
      const comp = await waitFor(() => firstSel(SEL.threads.create) || byContains(SEL.threads.composer), 15000);
      if (!comp) return warn("[+](만들기) 단추를 못 찾았어요. 로그인돼 있는지 보고, [+]를 직접 눌러 새 스레드를 연 뒤 상자의 [글 넣기]·[사진 넣기]를 눌러 주세요.");
      click(comp);
      box = await waitFor(inDialog, 12000);
    }
    const list = texts();
    if (!box) return warn("새 스레드 창이 안 열렸어요. [+]를 직접 눌러 새 스레드를 연 뒤 상자의 [글 넣기]·[사진 넣기]를 눌러 주세요." + boxDiag());
    if (!(await putText(box, list[0], "스레드 첫"))) return;
    if (job.video || (job.photos && job.photos.length)) { await sleep(500); if (!(await addPhotos())) return; }
    for (let i = 1; i < list.length; i++) {
      const add = byText(SEL.threads.add, dialog() || document) || byContains(SEL.threads.add, dialog() || document);
      if (!add) return warn(`이어 쓰기 ${i}번부터는 [스레드에 추가]를 눌러 상자의 [글 넣기]로 넣어 주세요.`);
      // [스레드에 추가]를 누르면 새 칸이 생긴다 — 칸 수가 늘 때까지 기다렸다가 맨 마지막 칸에
      const before = textbox(dialog()).length;
      click(add);
      const boxes = (await waitFor(() => { const b = textbox(dialog()); return b.length > before ? b : null; }, 6000)) || textbox(dialog());
      await sleep(400);
      const ok = await insertText(boxes[boxes.length - 1], list[i]);
      // 들어갔는지는 창 전체 글에서 확인한다 (칸이 바뀌어 엉뚱한 칸을 보고 실패로 판단하던 것 — 2026-10-23)
      const head = norm(list[i]).slice(0, 12);
      if (!ok && !(await waitFor(() => norm(document.body.innerText).includes(head), 2500))) return warn(`이어 쓰기 ${i}번을 못 넣었어요. 상자의 [복사]로 붙여 넣어 주세요.`);
      await sleep(300);
    }
    return finish("다 채웠어요. 글·사진을 확인하고 [게시]를 직접 눌러 주세요.");
  }

  async function addPhotos() {
    if (!job.video && (!job.photos || !job.photos.length)) return true;
    panel.status(job.video ? "영상을 넣는 중… (파일이 크면 조금 걸려요)" : `사진 ${job.photos.length}장을 넣는 중…`);
    const input = await waitFor(() => fileInput(dialog() || document) || fileInput(document), 10000);
    if (!input) {
      warn("사진 넣는 곳을 못 찾았어요. 사진 추가 단추(사진/동영상·컴퓨터에서 선택)를 누르고 창이 뜨면 닫은 뒤, 상자의 [사진 넣기]를 다시 눌러 주세요.");
      return false;
    }
    const list = await files();
    setFiles(input, input.multiple ? list : list.slice(0, 1));
    await sleep(2500);
    return true;
  }

  async function fillText(i) {
    const scope = dialog();
    const boxes = textbox(scope);
    const remembered = lastEditor && usableEditor(lastEditor) ? lastEditor : null;
    // 스레드 이어 쓰기(i>0)는 열린 창의 i번째 칸, 나머지는 이름으로 찾은 글 칸
    const el = (i > 0 ? boxes[i] : remembered) || (target === "instagram" ? firstSel(SEL.instagram.caption, document) : null) || findBox(BOX_NAMES[target] || []) || boxes[0]
      || nearestEditor(document.activeElement);
    try { await navigator.clipboard.writeText(texts()[i]); } catch (_) {} // 단추를 누른 순간이라 복사가 된다
    const ok = await insertText(el, texts()[i]);
    if (ok) warned = false;
    panel.status(ok ? "글을 넣었어요." : "글을 복사해 뒀어요. 글 칸을 누르고 Ctrl+V 해 주세요.", ok ? "ok" : "warn");
  }

  async function runFlow() {
    stopTextRecovery?.();
    warned = false;
    let result = { ok: false };
    try {
      if (target === "instagram") await instagram();
      else if (target === "facebook") await facebook();
      else await threads();
      result = { ok: !warned, partial: warned };
    } catch (e) {
      warn(`채우다 멈췄어요: ${e && e.message ? e.message : e}\n상자의 단추로 이어서 해 주세요.`);
      result = { ok: false, error: String(e && e.message ? e.message : e) };
    }
    return result;
  }

  async function main() {
    // 앱이 일감을 올리고 이 화면을 열었으면 받아 간다 (몇 번 다시 물어본다 — 앱 창구가 늦게 대답할 때)
    let r = null;
    for (let i = 0; i < 3 && !(r && r.job); i++) {
      r = await send({ type: "GS_CLAIM", target });
      if (!(r && r.job)) await sleep(1500);
    }
    if (!(r && r.job)) return;
    job = r.job;
    panel = self.GSPanel.open({
      label: job.label || target,
      texts: texts(),
      photos: job.photos || [],
      actions: { fillText: (i) => void fillText(i), copy: () => {}, addPhotos: async () => { if (await addPhotos()) panel.status("사진을 넣었어요.", "ok"); }, retry: () => void runFlow() },
    });
    await sleep(1500); // 화면이 다 뜨기를
    const result = await runFlow();
    await send({ type: "GS_DONE", id: job.id, result });
    if (target === "instagram") void watchInstagramShared(job);
    else void afterFillPost(job);
  }

  /* 홍보현황 (2026-10-27) — 회원이 [공유하기]를 누르면 "게시물이 공유되었습니다" 창이 뜬다.
     그때 내 계정 최근 게시물에서 우리가 넣은 글로 시작하는 것을 찾아 그 주소를 앱에 알린다 (30분까지 지켜본다) */
  const SHARED = ["게시물이 공유되었습니다.", "게시물이 공유되었습니다", "릴스가 공유되었습니다.", "릴스가 공유되었습니다", "Your post has been shared.", "Your reel has been shared.", "Post shared"];
  const dlog = (text) => { void send({ type: "GS_LOG", text: `${target} ${text}` }); };
  // 공유 직후 인스타가 화면을 새로 열기도 해서, 찾을 것을 크롬에 적어 두고 새 화면에서 이어서 찾는다
  const PENDING_IG = "gsPendingInsta"; // { id, head, at }
  async function watchInstagramShared(j) {
    dlog(`공유 기다림 ${j.id}`);
    const seen = await waitFor(() => byText(SHARED, document, "span,div,h1,h2,h3"), 30 * 60 * 1000, 1000);
    if (!seen) { dlog("30분 동안 공유 안내를 못 봄"); return; }
    const p = { id: j.id, head: String(j.text || "").replace(/\s+/g, "").slice(0, 20), at: Date.now() };
    try { await chrome.storage.local.set({ [PENDING_IG]: p }); } catch (_) {}
    dlog("공유 안내 봄");
    await findShared(p);
  }
  // 인스타가 게시물 목록 읽기를 막는다 (웹 화면 HTML · 429 너무 많은 요청 — 2026-10-27 시험).
  // 계정이 의심받지 않게 목록은 읽지 않고, 회원이 올린 게시물을 한 번 열면 그 주소를 잡는다
  async function findShared(p) {
    watchPostAddress(p);
    // 프로필 화면에 와 있으면 (단추를 누른 뒤 · 새로 열린 화면) 바로 맨 앞 게시물을 연다
    me = me || p.me || "";
    if (p.step === "profile" && isProfilePage()) { void openNewestPost(p); return; }
    dlog("게시물을 열어 달라고 안내");
    toast("방금 올린 게시물을 열면 그 주소를 공실마케팅 홍보현황에 연결해요.\n아래 단추를 누르면 도우미가 열어 드려요.", 0,
      { label: "방금 올린 게시물 열기", onClick: () => void goProfile(p) });
  }
  // 내 프로필 링크 — 왼쪽 메뉴의 [프로필] (글자·그림 이름으로 찾는다)
  function myProfileLink() {
    const links = Array.from(document.querySelectorAll("a[href]")).filter((a) => /^\/[A-Za-z0-9._]+\/$/.test(a.getAttribute("href") || ""));
    return links.find((a) => /프로필|Profile/i.test(`${a.innerText || ""} ${a.getAttribute("aria-label") || ""} ${a.querySelector("img")?.getAttribute("alt") || ""}`)) || null;
  }
  let me = "";
  function isProfilePage() {
    return Boolean(me) && location.pathname.replace(/\/$/, "") === `/${me}`;
  }
  async function goProfile(p) {
    const a = myProfileLink();
    if (!a) { dlog("프로필 링크를 못 찾음 — 직접 열어 달라고 안내"); toast("내 프로필을 못 찾았어요. 방금 올린 게시물을 직접 한 번 눌러 열어 주세요."); return; }
    me = (a.getAttribute("href") || "").replace(/\//g, "");
    const next = { ...p, step: "profile", me };
    try { await chrome.storage.local.set({ [PENDING_IG]: next }); } catch (_) {}
    dlog(`내 프로필로 ${me}`);
    toast("내 프로필에서 방금 올린 게시물을 여는 중…");
    click(a);
    await waitFor(() => isProfilePage(), 8000, 300);
    void openNewestPost(next);
  }
  // 프로필 맨 앞 게시물 — 위에 고정해 둔 게시물은 건너뛴다
  async function openNewestPost(p) {
    me = me || p.me || "";
    const grid = await waitFor(() => {
      const list = Array.from(document.querySelectorAll("main a[href]")).filter((a) => /\/(p|reel)\/[\w-]+/.test(a.getAttribute("href") || ""));
      return list.length ? list : null;
    }, 12000, 400);
    if (!grid) { dlog("프로필에서 게시물을 못 찾음"); toast("게시물을 못 찾았어요. 방금 올린 게시물을 직접 한 번 눌러 열어 주세요."); return; }
    const pinned = (a) => Boolean(a.querySelector("svg[aria-label*='고정'], svg[aria-label*='Pinned'], svg[aria-label*='pinned']"));
    const first = grid.find((a) => !pinned(a)) || grid[0];
    dlog(`맨 앞 게시물 열기 ${first.getAttribute("href")}`);
    click(first);
  }
  let linkedDone = false;
  async function linked(ok) {
    linkedDone = true;
    try { await chrome.storage.local.remove(PENDING_IG); } catch (_) {}
    toast(ok ? "게시물 주소를 공실마케팅 홍보현황에 연결했어요." : "", 4000);
    if (ok && panel) panel.status("게시물 주소를 공실마케팅 홍보현황에 연결했어요.", "ok");
  }
  // 인스타는 화면을 새로 열지 않고 주소만 바꾼다 → 1초마다 주소를 보고, 내 게시물(/p/…·/reel/…) 화면이면 그 주소를 보낸다
  let watchingAddr = false;
  function watchPostAddress(p) {
    if (watchingAddr) return;
    watchingAddr = true;
    let last = "";
    const t = setInterval(async () => {
      if (linkedDone || Date.now() - p.at > 10 * 60 * 1000) { clearInterval(t); return; }
      if (location.href === last) return;
      last = location.href;
      const m = /^\/(?:[^/]+\/)?(p|reel)\/([\w-]+)/.exec(location.pathname);
      if (!m) return;
      const url = `https://www.instagram.com/${m[1]}/${m[2]}/`;
      const r = await send({ type: "GS_PUBLISHED", id: p.id, url });
      dlog(`게시물 화면 주소 보냄 ${url} → ${r && r.ok ? "연결됨" : "앱이 거절"}`);
      if (r && r.ok) { clearInterval(t); await linked(true); }
    }, 1000);
  }
  // 화면 위 작은 안내 (도우미 상자가 없을 때도 — 공유 뒤 새로 열린 화면) · btn = 큰 단추 하나
  function toast(text, ms = 0, btn = null) {
    let el = document.getElementById("gs-ig-toast");
    if (!text) { el && el.remove(); return; }
    if (!el) {
      el = document.createElement("div");
      el.id = "gs-ig-toast";
      el.style.cssText = "position:fixed;right:20px;bottom:20px;z-index:2147483647;max-width:320px;padding:14px 16px;border-radius:12px;background:#111;color:#fff;font:600 13px/1.5 sans-serif;white-space:pre-line;box-shadow:0 6px 24px rgba(0,0,0,.3)";
      document.body.appendChild(el);
    }
    el.textContent = `공실마케팅 도우미
${text}`;
    if (btn) {
      const b = document.createElement("button");
      b.textContent = btn.label;
      b.style.cssText = "display:block;width:100%;margin-top:10px;padding:10px 12px;border:0;border-radius:10px;background:#fff;color:#111;font:800 14px/1.2 sans-serif;cursor:pointer";
      b.addEventListener("click", (e) => { e.preventDefault(); btn.onClick(); });
      el.appendChild(b);
    }
    if (ms) setTimeout(() => el.remove(), ms);
  }
  // 새로 열린 인스타 화면 — 공유한 지 10분 안에 못 찾은 게 있으면 이어서
  async function resumeShared() {
    let p = null;
    try { p = (await chrome.storage.local.get(PENDING_IG))[PENDING_IG]; } catch (_) { return; }
    if (!p || !p.id) return;
    if (Date.now() - p.at > 10 * 60 * 1000) { try { await chrome.storage.local.remove(PENDING_IG); } catch (_) {} return; }
    dlog("새 화면에서 이어서 찾기");
    await findShared(p);
  }
  /* 스레드 · 페이스북 홍보현황 (2026-10-27) — 채운 뒤 회원이 [게시]하고 올린 게시물을 한 번 열면 그 주소를 잡는다.
     페이스북은 화면을 통째로 새로 열기도 해서 기다림을 크롬에 적어 두고 새 화면에서도 이어서 본다.
     다른 사람 글을 잡지 않게 — 연 게시물 화면에 우리가 넣은 글 첫머리가 보여야 보낸다 */
  const PENDING_POST = `gsPendingPost_${target}`; // { id, head, at }
  const POST_WAIT = 30 * 60 * 1000;
  function postAddress(href = location.href) {
    let u;
    try { u = new URL(href, location.href); } catch (_) { return ""; }
    if (target === "threads") {
      const m = /^\/@([^/]+)\/post\/([\w-]+)/.exec(u.pathname);
      return m ? `https://www.threads.com/@${m[1]}/post/${m[2]}` : "";
    }
    if (target === "facebook") {
      if (/^\/(permalink|story)\.php$/.test(u.pathname) && u.searchParams.get("story_fbid")) {
        return `https://www.facebook.com${u.pathname}?story_fbid=${u.searchParams.get("story_fbid")}&id=${u.searchParams.get("id") || ""}`;
      }
      // 사진 게시물의 사진을 눌러 연 화면 — set=pcb.<게시물 번호> 가 붙으면 그 게시물
      const pcb = /^pcb\.(\d+)$/.exec(u.searchParams.get("set") || "");
      if (/^\/photo\/?$/.test(u.pathname) && pcb) return `https://www.facebook.com/photo/?fbid=${u.searchParams.get("fbid") || ""}&set=pcb.${pcb[1]}`;
      if (/^\/(?:[^/]+\/)?posts\/[\w.-]+\/?$/.test(u.pathname) || /^\/groups\/[^/]+\/posts\/[\w.-]+/.test(u.pathname) || /^\/share\/p\/[\w-]+/.test(u.pathname)) {
        return `https://www.facebook.com${u.pathname.replace(/\/$/, "")}`;
      }
    }
    return "";
  }
  // 피드에 뜬 우리 게시물에서 주소 링크 찾기 — 따로 열지 않아도 (스레드: 시간 링크 · 페이스북: 사진 링크)
  function findInFeed(head) {
    if (!head) return "";
    // 아직 글쓰기 칸에 우리 글이 있으면(게시 전) 찾지 않는다 — 예전 게시물을 잘못 잡지 않게
    const composing = Array.from(document.querySelectorAll("[contenteditable='true'], textarea")).some((e) => norm(e.innerText || e.value || "").replace(/\s+/g, "").includes(head));
    if (composing) return "";
    for (const a of document.querySelectorAll("a[href]")) {
      const url = postAddress(a.getAttribute("href"));
      if (!url) continue;
      let el = a;
      for (let i = 0; i < 15 && el && el !== document.body; i++, el = el.parentElement) {
        const t = norm(el.innerText || "").replace(/\s+/g, "");
        if (t.length > 8000) break; // 피드 전체까지 올라가면 다른 게시물과 섞인다
        if (t.includes(head)) return url;
      }
    }
    return "";
  }
  // 게시 직후 아래쪽 알림 "게시되었습니다 · [보기]" — 그 링크가 방금 올린 글 (스레드, 2026-10-28)
  const POSTED = /게시되었습니다|게시됨|업로드되었습니다|Posted|Your thread was posted/i;
  function findPostedToast() {
    if (target !== "threads") return "";
    for (const a of document.querySelectorAll("a[href]")) {
      const url = postAddress(a.getAttribute("href"));
      if (!url) continue;
      let el = a;
      for (let i = 0; i < 5 && el && el !== document.body; i++, el = el.parentElement) {
        const t = norm(el.innerText || "");
        if (t.length > 200) break; // 알림은 짧다 — 피드 글까지 올라가면 그만
        if (POSTED.test(t)) return url;
      }
    }
    return "";
  }
  // 새 일감이 오면 예전 기다림은 버리고 새 것만 본다 — 예전엔 먼저 시작한 기다림이 남아
  //  새로 올린 글 주소를 예전 공실에 붙였다 (2026-10-29 논현동 영상 스레드 → 팔용동)
  let postTimer = null;
  async function startPostWatch(p) {
    if (postTimer) clearInterval(postTimer);
    linkedDone = false;
    const head = norm(p.head).replace(/\s+/g, "");
    let last = "";
    const t = postTimer = setInterval(async () => {
      if (linkedDone || Date.now() - p.at > POST_WAIT) { clearInterval(t); return; }
      let url = findPostedToast();
      if (url) dlog(`게시 알림에서 찾음 ${url}`);
      if (!url) url = findInFeed(head);
      if (url) dlog(`피드에서 우리 게시물 찾음 ${url}`);
      else {
        if (location.href === last) return;
        last = location.href;
        url = postAddress();
        if (!url) return;
        // 게시물 화면이 다 뜨기를 기다리며 우리 글이 보이는지 (10초까지)
        const mine = await waitFor(() => !head || norm(document.body.innerText).replace(/\s+/g, "").includes(head), 10000, 500);
        if (!mine) { dlog(`게시물 화면인데 우리 글이 아님 ${url}`); return; }
      }
      if (postTimer !== t) return; // 기다리는 사이 새 일감으로 바뀌었으면
      const r = await send({ type: "GS_PUBLISHED", id: p.id, url });
      dlog(`게시물 화면 주소 보냄 ${url} → ${r && r.ok ? "연결됨" : "앱이 거절"}`);
      if (r && r.ok) {
        clearInterval(t);
        linkedDone = true;
        try { await chrome.storage.local.remove(PENDING_POST); } catch (_) {}
        toast("게시물 주소를 공실마케팅 홍보현황에 연결했어요.", 4000);
        if (panel) panel.status("게시물 주소를 공실마케팅 홍보현황에 연결했어요.", "ok");
      }
    }, 2000);
  }
  async function afterFillPost(j) {
    const p = { id: j.id, head: String(texts()[0] || "").replace(/\s+/g, "").slice(0, 15), at: Date.now() };
    try { await chrome.storage.local.set({ [PENDING_POST]: p }); } catch (_) {}
    dlog(`게시 기다림 ${j.id}`);
    if (panel) panel.status("확인하고 [게시]를 눌러 주세요. 올라가면 도우미가 게시물 주소를 홍보현황에 연결해요.", "ok");
    void startPostWatch(p);
  }
  async function resumePostWatch() {
    let p = null;
    try { p = (await chrome.storage.local.get(PENDING_POST))[PENDING_POST]; } catch (_) { return; }
    if (!p || !p.id) return;
    if (Date.now() - p.at > POST_WAIT) { try { await chrome.storage.local.remove(PENDING_POST); } catch (_) {} return; }
    dlog(`새 화면에서 이어서 기다림 ${p.id}`);
    void startPostWatch(p);
  }
  if (self.__GS_HELPER_TEST__) {
    Object.assign(self.__GS_HELPER_TEST__, { canonicalEditor, collectEditors, findBox, insertText, textbox });
    return;
  }
  if (target === "instagram") void resumeShared();
  else void resumePostWatch();
  void main();
})();
