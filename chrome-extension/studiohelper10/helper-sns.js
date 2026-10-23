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
  const fileInput = (scope = document) => Array.from(scope.querySelectorAll("input[type='file']")).find((i) => !i.disabled && (!i.accept || /image/.test(i.accept))) || null;

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
      // Facebook 작성창이 떠 있으면 본문이 다시 mount될 때까지 기다린다. 뒤 페이지의 댓글·검색칸으로 떨어지면 안 된다.
      if (inDialog || target === "facebook") return inDialog;
    }
    return rankedEditor(document, names, { requireName: target === "facebook" });
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
    if (target === "facebook") {
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
  const files = () => toFiles(job.photos || []);
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
    if (!composerWasOpen && job.photos && job.photos.length) {
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

  /* 스레드: 새로운 소식이 있나요? → 첫 글 + 사진 → 스레드에 추가로 이어 쓰기 */
  async function threads() {
    panel.status("새 스레드를 여는 중…");
    let box = findBox(BOX_NAMES.threads);
    if (!box) {
      const comp = await waitFor(() => byContains(SEL.threads.composer) || firstSel(SEL.threads.create), 15000);
      if (!comp) return warn("글쓰기 칸을 못 찾았어요. 로그인돼 있는지 보고, 새 스레드를 직접 연 뒤 상자의 [글 넣기]·[사진 넣기]를 눌러 주세요.");
      click(comp);
      box = await waitFor(() => findBox(BOX_NAMES.threads), 12000);
    }
    const list = texts();
    if (!box) return warn("글 칸을 못 찾았어요. 글 칸을 한 번 누르고 상자의 [글 넣기]를 눌러 주세요." + boxDiag());
    if (!(await putText(box, list[0], "스레드 첫"))) return;
    if (job.photos && job.photos.length) { await sleep(500); if (!(await addPhotos())) return; }
    for (let i = 1; i < list.length; i++) {
      const add = byText(SEL.threads.add, dialog() || document) || byContains(SEL.threads.add, dialog() || document);
      if (!add) return warn(`이어 쓰기 ${i}번부터는 [스레드에 추가]를 눌러 상자의 [글 넣기]로 넣어 주세요.`);
      click(add);
      await sleep(900);
      const boxes = textbox(dialog());
      if (!(await insertText(boxes[boxes.length - 1], list[i]))) return warn(`이어 쓰기 ${i}번을 못 넣었어요. 상자의 [복사]로 붙여 넣어 주세요.`);
    }
    return finish("다 채웠어요. 글·사진을 확인하고 [게시]를 직접 눌러 주세요.");
  }

  async function addPhotos() {
    if (!job.photos || !job.photos.length) return true;
    panel.status(`사진 ${job.photos.length}장을 넣는 중…`);
    const input = await waitFor(() => fileInput(dialog() || document) || fileInput(document), 10000);
    if (!input) {
      warn("사진 넣는 곳을 못 찾았어요. 사진 추가 단추(사진/동영상·컴퓨터에서 선택)를 누르고 창이 뜨면 닫은 뒤, 상자의 [사진 넣기]를 다시 눌러 주세요.");
      return false;
    }
    const list = files();
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
  }
  if (self.__GS_HELPER_TEST__) {
    Object.assign(self.__GS_HELPER_TEST__, { canonicalEditor, collectEditors, findBox, insertText, textbox });
    return;
  }
  void main();
})();
