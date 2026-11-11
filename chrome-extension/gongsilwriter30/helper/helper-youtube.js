/* 유튜브 스튜디오 — 올리기 화면에 영상·제목·설명(앱이면 썸네일·공개 범위까지)을 넣는다. [게시]는 회원이 누른다
   (2026-11-11 사장님: "하나로" — 앱용 공실마케팅 도우미(studiohelper10)를 이 확장에 합침)
   일감은 두 곳에서 온다 — 둘 다 GS_CLAIM youtube 하나로 받는다 (bg-web.js: 웹 일감 먼저, 없으면 앱 창구 127.0.0.1)
   - 웹 쇼츠릴스studio: 영상을 확장에 조각으로 맡김 → job.fileId · job.chunks (GS_FILE_CHUNK)
   - 공실마케팅 앱 동영상제작 [SNS에 올리기 › 유튜브]: 앱이 파일 표(token)를 줌 → job.video · job.thumb (file-bridge.html)
   일감이 없으면 아무것도 하지 않는다 (평소 유튜브 스튜디오). 영상 주소가 생기면 GS_PUBLISHED → 홍보현황 ✓
   찾는 이름표(YT)는 유튜브 화면이 바뀌면 여기만 고친다 */
(() => {
  "use strict";
  if (window.top !== window || location.hostname !== "studio.youtube.com" || window.__gsHelperYoutube) return;
  window.__gsHelperYoutube = true;

  const YT = {
    picker: ["ytcp-uploads-file-picker input[type='file']", "ytcp-uploads-dialog input[type='file'][name='Filedata']", "ytcp-uploads-dialog input[type='file']", "input[type='file'][name='Filedata']"],
    title: ["#title-textarea #textbox", "ytcp-social-suggestions-textbox#title-textarea #textbox", "#textbox[aria-label*='제목']", "#textbox[aria-label*='title' i]"],
    desc: ["#description-textarea #textbox", "ytcp-social-suggestions-textbox#description-textarea #textbox", "#textbox[aria-label*='설명']", "#textbox[aria-label*='description' i]"],
    videoLink: ["a[href*='youtu.be/']", "a[href*='youtube.com/shorts/']"],
    thumbInput: ["ytcp-thumbnail-uploader input#file-loader", "input#file-loader"],
    notKids: ["tp-yt-paper-radio-button[name='VIDEO_MADE_FOR_KIDS_NOT_MFK']"],
    next: ["#next-button", "ytcp-button#next-button"],
    createBtn: ["#create-icon", "ytcp-button#create-icon"],
    uploadItem: ["tp-yt-paper-item#text-item-0", "#text-item-0"],
    vis: { public: "tp-yt-paper-radio-button[name='PUBLIC']", unlisted: "tp-yt-paper-radio-button[name='UNLISTED']", private: "tp-yt-paper-radio-button[name='PRIVATE']" },
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const norm = (t) => String(t || "").replace(/\s+/g, " ").trim();
  const send = (msg) => new Promise((resolve) => {
    try { chrome.runtime.sendMessage(msg, (r) => resolve(chrome.runtime.lastError ? null : r)); } catch (_) { resolve(null); }
  });
  const dlog = (text) => { void send({ type: "GS_LOG", text: `youtube ${text}` }); };

  /* 알림 상자 — 오른쪽 아래 (웹·앱 모두) */
  let box = null;
  function note(text, kind = "") {
    if (!box) {
      box = document.createElement("div");
      box.style.cssText = "position:fixed;right:20px;bottom:20px;z-index:2147483647;max-width:360px;padding:14px 16px;border-radius:12px;background:#0b1a33;color:#fff;font:600 14px/1.6 'Malgun Gothic',sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35)";
      document.documentElement.appendChild(box);
    }
    box.style.background = kind === "err" ? "#7f1d1d" : kind === "ok" ? "#065f46" : "#0b1a33";
    box.innerHTML = `<div style="font-weight:800;margin-bottom:4px">공실뉴스 도우미</div><div></div>`;
    box.lastChild.textContent = text;
  }

  /* 유튜브 스튜디오는 그림자 DOM(shadow root) 안에 칸이 있다 — 그 안까지 찾는다 */
  function deepAll(sel, root = document, out = []) {
    try { root.querySelectorAll(sel).forEach((el) => out.push(el)); } catch (_) {}
    const walker = (root.querySelectorAll ? root.querySelectorAll("*") : []);
    for (const el of walker) if (el.shadowRoot) deepAll(sel, el.shadowRoot, out);
    return out;
  }
  const visible = (el) => {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const find = (sels, { any = false } = {}) => {
    for (const s of [].concat(sels)) {
      const hit = deepAll(s).find((el) => any || visible(el));
      if (hit) return hit;
    }
    return null;
  };
  async function waitFor(fn, ms = 15000, step = 400) {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      const v = fn();
      if (v) return v;
      await sleep(step);
    }
    return null;
  }
  function click(el) {
    if (!el) return false;
    el.scrollIntoView?.({ block: "center" });
    ["pointerdown", "mousedown", "pointerup", "mouseup"].forEach((t) => el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, composed: true, view: window })));
    el.click();
    return true;
  }
  function putFile(input, file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  }
  function typeInto(el, text) {
    el.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand("delete");
    document.execCommand("insertText", false, String(text || ""));
    el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  }

  /* 앱이 내준 파일 — 보이지 않는 확장 창(file-bridge)으로 받는다 */
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
  /* 웹이 맡긴 영상 — 확장에 둔 조각을 이어 붙인다 */
  async function fetchChunks(job) {
    const parts = [];
    for (let i = 0; i < Number(job.chunks || 0); i++) {
      const c = await send({ type: "GS_FILE_CHUNK", fileId: job.fileId, i });
      if (!c || !c.b64) throw new Error("영상 조각을 받지 못했어요. 웹에서 다시 눌러 주세요.");
      const bin = atob(c.b64);
      const u8 = new Uint8Array(bin.length);
      for (let k = 0; k < bin.length; k++) u8[k] = bin.charCodeAt(k);
      parts.push(u8);
      note(`영상을 받는 중이에요… ${Math.round(((i + 1) / job.chunks) * 100)}%`);
    }
    return new File(parts, job.fileName || "shorts.mp4", { type: "video/mp4" });
  }

  async function run(job) {
    const fromApp = Boolean(job.video);
    const result = { ok: false, thumb: "none", vis: "skip" };
    try {
      note("영상을 받는 중이에요…");
      // 올리기 창 — 앱은 /upload 로 열어 스튜디오가 띄운다. 없으면 [만들기] → [동영상 업로드]
      let input = await waitFor(() => find(YT.picker, { any: true }), fromApp ? 30000 : 8000);
      if (!input) {
        click(find(YT.createBtn)); await sleep(700); click(find(YT.uploadItem));
        input = await waitFor(() => find(YT.picker, { any: true }), 10000);
      }
      if (!input) throw new Error("유튜브 올리기 창을 찾지 못했어요. [만들기] → [동영상 업로드]를 누른 뒤 다시 해 주세요.");
      dlog("영상 파일 받는 중");
      const video = fromApp ? await fetchFile(job.video) : await fetchChunks(job);
      dlog(`영상 받음 ${Math.round(video.size / 1048576)}MB`);
      putFile(input, video);
      note("영상을 넣었어요. 제목·설명을 채우는 중이에요…");

      const title = await waitFor(() => find(YT.title), 60000);
      if (!title) { result.partial = "제목 칸을 찾지 못했어요. 제목·설명은 직접 넣어 주세요 ([글 복사])."; result.ok = true; return result; }
      // 유튜브가 파일 이름으로 제목을 늦게 덮어쓰기도 한다 — 넣은 뒤 확인하고 다를 때 다시 (5번까지)
      const want = String(job.title || "").trim().slice(0, 100);
      let titleOk = !want;
      for (let k = 0; k < 5 && !titleOk; k++) {
        await sleep(k ? 1500 : 800);
        const el = find(YT.title) || title;
        typeInto(el, want);
        await sleep(600);
        titleOk = norm(el.innerText) === norm(want);
      }
      const desc = await waitFor(() => find(YT.desc), 8000);
      if (desc && job.text) typeInto(desc, String(job.text).slice(0, 5000));
      dlog(`제목·설명 넣음 — 제목 ${titleOk ? "맞음" : "다름"}`);
      if (!titleOk) result.partial = "제목이 그대로 들어가지 않았어요. 제목을 확인해 주세요 ([글 복사]).";

      if (job.thumb) {
        try {
          const thumbFile = await fetchFile(job.thumb);
          await waitFor(() => find(YT.videoLink), 90000, 1000); // 영상 자리(주소)가 생긴 뒤에 넣어야 오류가 안 난다
          const tin = await waitFor(() => find(YT.thumbInput, { any: true }), 15000);
          if (tin) { putFile(tin, thumbFile); result.thumb = "ok"; } else result.thumb = "fail";
        } catch (e) { result.thumb = "fail"; dlog(`썸네일 못 넣음 ${e.message}`); }
      }

      const kids = await waitFor(() => find(YT.notKids), 10000);
      if (kids) click(kids);

      if (job.visibility) {
        for (let i = 0; i < 3; i++) {
          const nx = await waitFor(() => find(YT.next), 8000);
          if (!nx) break;
          click(nx);
          await sleep(1300);
        }
        const checked = (el) => el && (el.getAttribute("aria-checked") === "true" || el.hasAttribute("checked"));
        let r = null;
        for (let k = 0; k < 3 && !checked(r); k++) {
          r = await waitFor(() => find(YT.vis[job.visibility] || YT.vis.public), 8000);
          if (!r) break;
          click(r);
          await sleep(700);
        }
        result.vis = checked(r) ? "ok" : "fail";
      }
      result.ok = true;
      note(result.partial || (job.visibility ? "다 채웠어요. 내용을 확인하고 [게시]를 눌러 주세요." : "다 채웠어요. 내용을 확인하고 [다음]으로 넘어가 공개 범위를 고른 뒤 [게시]를 눌러 주세요."), result.partial ? "" : "ok");
    } catch (e) {
      result.error = (e && e.message) || String(e);
      note(result.error, "err");
    }
    return result;
  }

  /* 영상 주소가 보이면 바로 알린다 (공개·비공개·예약 상관없이 ✓, 2026-10-28) · 30분까지 */
  async function watchPublished(job) {
    const until = Date.now() + 30 * 60 * 1000;
    while (Date.now() < until) {
      const a = find(YT.videoLink, { any: true });
      if (a && a.href) {
        const link = a.href;
        const m = /(?:youtu\.be\/|shorts\/|[?&]v=)([\w-]{6,})/.exec(link);
        const url = m ? (/shorts\//.test(link) ? `https://www.youtube.com/shorts/${m[1]}` : `https://www.youtube.com/watch?v=${m[1]}`) : link;
        const r = await send({ type: "GS_PUBLISHED", id: job.id, url });
        dlog(`영상 주소 보냄 ${url} → ${r && r.ok ? "받음" : "거절"}`);
        return;
      }
      await sleep(3000);
    }
  }

  // 일감 찾기 — 화면이 뜬 뒤 20초 동안 몇 번 물어본다 (앱이 크롬을 연 직후·웹에서 막 누른 직후)
  (async () => {
    await sleep(1500);
    for (let i = 0; i < 8; i++) {
      const r = await send({ type: "GS_CLAIM", target: "youtube" });
      const job = r && r.job;
      if (job) {
        dlog(`일감 받음 ${job.id}`);
        await send({ type: "GS_FOCUS" });
        const result = await run(job);
        await send({ type: "GS_DONE", id: job.id, result });
        if (result.ok) void watchPublished(job);
        return;
      }
      await sleep(2500);
    }
  })();
})();
