/* 유튜브 — 앱 동영상제작 [SNS에 올리기 › 유튜브]의 일감(영상·제목·설명·썸네일·공개 범위)을 YouTube Studio 업로드 창에 넣는다 (2026-10-28)
   - 예전엔 전용 크롬을 앱이 조종했다(sns-upload.js). 사장님: 전용 크롬 싫어 → 평소 크롬 + 이 도우미
   - 앱 helper-server 에 youtube 일감이 있을 때만 움직인다. [게시]는 누르지 않는다 (마지막 공개 범위까지 골라 두고 멈춘다)
   - 영상 주소가 생기면 바로 앱에 알린다 → 홍보현황 ✓ (공개·비공개·예약 상관없이)
   - 찾는 이름표(YT)는 앱 sns-upload.js 의 YT 와 같다. 유튜브 화면이 바뀌면 여기만 고친다 */
(() => {
  "use strict";
  if (window.top !== window || location.hostname !== "studio.youtube.com") return;

  const YT = {
    dialog: "ytcp-uploads-dialog",
    picker: ["ytcp-uploads-file-picker input[type='file']", "ytcp-uploads-dialog input[type='file'][name='Filedata']", "ytcp-uploads-dialog input[type='file']", "input[type='file'][name='Filedata']"],
    title: ["#title-textarea #textbox", "ytcp-social-suggestions-textbox#title-textarea #textbox", "#textbox[aria-label*='제목']", "#textbox[aria-label*='title' i]"],
    desc: ["#description-textarea #textbox", "ytcp-social-suggestions-textbox#description-textarea #textbox", "#textbox[aria-label*='설명']", "#textbox[aria-label*='description' i]"],
    videoLink: ["a[href*='youtu.be/']", "a[href*='youtube.com/shorts/']"],
    thumbInput: ["ytcp-thumbnail-uploader input#file-loader", "input#file-loader"],
    notKids: ["tp-yt-paper-radio-button[name='VIDEO_MADE_FOR_KIDS_NOT_MFK']"],
    next: ["#next-button", "ytcp-button#next-button"],
    vis: { public: "tp-yt-paper-radio-button[name='PUBLIC']", unlisted: "tp-yt-paper-radio-button[name='UNLISTED']", private: "tp-yt-paper-radio-button[name='PRIVATE']" },
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const norm = (t) => String(t || "").replace(/\s+/g, " ").trim();
  const send = (msg) => new Promise((resolve) => {
    try { chrome.runtime.sendMessage(msg, (r) => resolve(chrome.runtime.lastError ? null : r)); } catch (_) { resolve(null); }
  });
  const dlog = (text) => { void send({ type: "GS_LOG", text: `youtube ${text}` }); };

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
  function typeInto(box, text) {
    box.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(box);
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand("delete");
    document.execCommand("insertText", false, String(text || ""));
    box.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  }

  /* 앱이 내준 파일을 보이지 않는 확장 창(file-bridge)으로 받는다 */
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

  async function run(job) {
    const result = { ok: false, thumb: "none", vis: "skip" };
    try {
      // 업로드 창 — /upload 로 열면 스튜디오가 띄운다. 안 떴으면 기다린다
      const input = await waitFor(() => find(YT.picker, { any: true }), 30000);
      if (!input) throw new Error("유튜브 올리기 창을 찾지 못했어요. [만들기] → [동영상 업로드]를 눌러 주세요.");
      dlog("영상 파일 받는 중");
      const video = await fetchFile(job.video);
      dlog(`영상 받음 ${Math.round(video.size / 1048576)}MB`);
      putFile(input, video);

      const title = await waitFor(() => find(YT.title), 60000);
      if (!title) { result.partial = "제목 칸을 찾지 못했어요. 제목·설명은 직접 넣어 주세요 (앱의 [글 복사])."; result.ok = true; return result; }
      // 유튜브가 파일 이름으로 제목을 늦게 덮어쓰기도 한다 — 넣은 뒤 확인하고 다를 때 다시 (5번까지)
      const want = String(job.title || "").trim();
      let titleOk = false;
      for (let k = 0; k < 5 && !titleOk; k++) {
        await sleep(k ? 1500 : 800);
        const box = find(YT.title) || title;
        typeInto(box, want);
        await sleep(600);
        titleOk = norm(box.innerText) === norm(want);
      }
      const desc = await waitFor(() => find(YT.desc), 8000);
      if (desc) typeInto(desc, job.text);
      dlog(`제목·설명 넣음 — 제목 ${titleOk ? "맞음" : `다름: ${norm((find(YT.title) || title).innerText).slice(0, 60)}`}`);
      if (!titleOk) result.partial = "제목이 그대로 들어가지 않았어요. 크롬 창에서 제목을 확인해 주세요 (앱의 [글 복사]).";

      if (job.thumb) {
        try {
          const thumbFile = await fetchFile(job.thumb);
          // 영상 자리(주소)가 생긴 뒤에 넣어야 오류가 안 난다 (sns-upload.js 2026-10-21)
          await waitFor(() => find(YT.videoLink), 90000, 1000);
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
        // 고른 뒤 정말 골라졌는지 확인 (3번까지)
        const checked = (el) => el && (el.getAttribute("aria-checked") === "true" || el.hasAttribute("checked"));
        let r = null;
        for (let k = 0; k < 3 && !checked(r); k++) {
          r = await waitFor(() => find(YT.vis[job.visibility] || YT.vis.public), 8000);
          if (!r) break;
          click(r);
          await sleep(700);
        }
        result.vis = checked(r) ? "ok" : "fail";
        dlog(`공개 범위 ${job.visibility} → ${result.vis}${r ? ` (aria-checked=${r.getAttribute("aria-checked")})` : " (칸 못 찾음)"}`);
      }
      result.ok = true;
    } catch (e) {
      result.error = e.message || String(e);
    }
    return result;
  }

  /* [게시] 뒤 — 업로드 창이 닫히면 영상 주소를 앱에 (앱이 공개됐는지 확인하고 ✓) · 30분까지 */
  // 업로드 창이 열려 있나 — 창 안의 제목 칸·[다음]·[게시] 단추가 하나라도 보이면 열린 것
  const uploadOpen = () => Boolean(find(YT.title) || find(YT.next) || find(["#done-button", "ytcp-button#done-button"]));
  async function watchPublished(job) {
    let link = "";
    let misses = 0;
    let ticks = 0;
    const until = Date.now() + 30 * 60 * 1000;
    while (Date.now() < until) {
      if (!link) {
        const a = find(YT.videoLink, { any: true });
        if (a && a.href) link = a.href;
      }
      // 화면이 잠깐 바뀌는 사이를 닫힘으로 알지 않게 — 세 번(약 9초) 연달아 안 보일 때만
      misses = uploadOpen() ? 0 : misses + 1;
      if (++ticks % 10 === 1) dlog(`지켜보는 중 — 주소 ${link || "아직"} · 창 ${misses ? "안 보임" : "열림"} (제목칸 ${Boolean(find(YT.title))} 다음 ${Boolean(find(YT.next))} 게시 ${Boolean(find(["#done-button"]))})`);
      // 창 닫힘을 기다리지 않는다 (유튜브 창 모양을 못 알아봐 계속 놓쳤다, 2026-10-28) —
      //  영상 주소가 보이면 바로 앱에 보낸다. 앱이 공개·비공개·예약 상관없이 바로 ✓ (사장님 2026-10-28)
      if (link) {
        const m = /(?:youtu\.be\/|shorts\/|[?&]v=)([\w-]{6,})/.exec(link);
        const url = m ? (/shorts\//.test(link) ? `https://www.youtube.com/shorts/${m[1]}` : `https://www.youtube.com/watch?v=${m[1]}`) : link;
        const r = await send({ type: "GS_PUBLISHED", id: job.id, url });
        dlog(`영상 주소 보냄 (✓) ${url} → ${r && r.ok ? "앱이 받음" : "앱이 거절"}`);
        return;
      }
      await sleep(3000);
    }
    dlog("30분 동안 업로드 창이 안 닫혀 주소를 안 보냄");
  }

  // 일감 찾기 — 화면이 뜬 뒤 20초 동안 몇 번 물어본다 (앱이 크롬을 연 직후)
  (async () => {
    for (let i = 0; i < 8; i++) {
      const r = await send({ type: "GS_CLAIM", target: "youtube" });
      const job = r && r.job;
      if (job) {
        dlog(`일감 받음 ${job.id}`);
        await send({ type: "GS_FOCUS" });
        const result = await run(job);
        await send({ type: "GS_DONE", id: job.id, result });
        dlog(`채움 ${JSON.stringify(result).slice(0, 200)}`);
        if (result.ok) void watchPublished(job);
        return;
      }
      await sleep(2500);
    }
  })();
})();
