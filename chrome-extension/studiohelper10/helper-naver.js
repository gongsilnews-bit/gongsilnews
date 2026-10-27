/* 네이버 블로그 글쓰기 — 앱에서 보낸 일감(제목·본문 블록·사진·태그)을 받아 채운다
   - 채우기는 naver-fill.js(기사작성기 content-naver.js 그대로)의 GW_APPLY_BLOG_DRAFT
   - 글쓰기 화면은 프레임이 여럿이라 각 프레임에서 돈다. 편집기가 있는 프레임만 일감을 받아 간다
   - [발행]은 누르지 않는다. 태그는 회원이 발행 창을 열면 채워진다
   - 홍보현황 (2026-10-27): 채운 뒤 회원이 [발행]하면 네이버가 글 화면(blog.naver.com/아이디/글번호)으로 넘어간다
     → 그 주소를 앱에 알려 준다 (앱이 서버에 "연결됨"으로 저장) */
(() => {
  "use strict";
  const send = (msg) => new Promise((resolve) => {
    try { chrome.runtime.sendMessage(msg, (r) => resolve(chrome.runtime.lastError ? null : r)); } catch (_) { resolve(null); }
  });
  const dlog = (text) => { void send({ type: "GS_LOG", text: `naver ${text}` }); };
  const PENDING = "gsPendingNaver"; // { id, title, at } — 채우기를 마친 일감 (발행 기다림)
  const WAIT = 30 * 60 * 1000; // 채운 뒤 30분 안에 발행한 글만

  async function run() {
    // 편집기가 이 프레임에 있나 (최대 20초 — 글쓰기 화면이 늦게 뜰 때)
    let ping = null;
    for (let i = 0; i < 8; i++) {
      ping = await self.__gwNaver({ type: "GW_PING_NAVER_WRITE" });
      if (ping && ping.ok) break;
      await new Promise((r) => setTimeout(r, 1500));
    }
    if (!ping || !ping.ok) return;
    const r = await send({ type: "GS_CLAIM", target: "naver" });
    const job = r && r.job;
    if (!job) return; // 앱이 보낸 일감이 없으면 아무것도 하지 않는다 (평소 글쓰기)
    let result;
    // 크롬 창이 뒤에 있으면 편집기가 붙여넣기를 무시할 수 있다 → 창·탭을 앞으로
    if (!document.hasFocus()) {
      await send({ type: "GS_FOCUS" });
      await new Promise((r) => setTimeout(r, 600));
    }
    try {
      result = await self.__gwNaver({ type: "GW_APPLY_BLOG_DRAFT", payload: { title: job.title, blocks: job.blocks, tags: job.tags } });
    } catch (e) {
      result = { ok: false, error: e && e.message ? e.message : String(e) };
    }
    if (result && result.ok) {
      try { await chrome.storage.local.set({ [PENDING]: { id: job.id, title: String(job.title || ""), at: Date.now() } }); dlog(`발행 기다림 저장 ${job.id}`); } catch (e) { dlog(`발행 기다림 저장 실패 ${e && e.message}`); }
    }
    await send({ type: "GS_DONE", id: job.id, result });
  }

  /* 발행한 글 화면인가 — blog.naver.com/아이디/글번호 또는 PostView.naver?blogId=…&logNo=… (맨 위 창에서만) */
  function postUrl() {
    const u = new URL(location.href);
    if (u.hostname !== "blog.naver.com") return "";
    const m = /^\/([A-Za-z0-9_-]+)\/(\d{6,})\/?$/.exec(u.pathname);
    if (m) return `https://blog.naver.com/${m[1]}/${m[2]}`;
    const id = u.searchParams.get("blogId"), no = u.searchParams.get("logNo");
    if (/PostView/i.test(u.pathname) && id && /^\d{6,}$/.test(no || "")) return `https://blog.naver.com/${id}/${no}`;
    return "";
  }
  async function catchPublished() {
    const url = postUrl();
    if (!url) return;
    let p = null;
    try { p = (await chrome.storage.local.get(PENDING))[PENDING]; } catch (_) { return; }
    dlog(`글 화면 ${location.href.slice(0, 160)} 기다림=${p ? p.id : "없음"}`);
    if (!p || !p.id) return;
    if (Date.now() - p.at > WAIT) { try { await chrome.storage.local.remove(PENDING); } catch (_) {} return; }
    // 다른 사람 글을 잘못 잡지 않게 —
    //  ① 발행 직후 네이버가 여는 글 화면(안쪽 프레임 PostView…&isAfterWrite=true) 이거나
    //  ② 화면 제목·글 제목이 채운 제목과 같을 때 (네이버가 제목을 늦게 붙여서 10초까지 다시 본다)
    const afterWrite = /[?&]isAfterWrite=true/i.test(location.search);
    if (!afterWrite) {
      const norm = (s) => String(s || "").replace(/\s+/g, "");
      const want = norm(p.title).slice(0, 12);
      const titleNow = () => norm(document.title) + "|" + norm((document.querySelector(".se-title-text, .pcol1, .htitle") || {}).textContent);
      let same = false;
      for (let i = 0; i < 20 && !(same = Boolean(want) && titleNow().includes(want)); i++) await new Promise((r) => setTimeout(r, 500));
      if (!same) { dlog(`제목 다름 want=${want} now=${titleNow().slice(0, 60)}`); return; }
    }
    const r = await send({ type: "GS_PUBLISHED", id: p.id, url });
    dlog(`주소 보냄 ${url} → ${r && r.ok ? "연결됨" : "앱이 거절(일감 기록 없음)"}`);
    if (r && r.ok) { try { await chrome.storage.local.remove(PENDING); } catch (_) {} }
  }

  // 네이버는 발행 뒤 화면을 새로 열지 않고 주소만 바꾸기도 한다 → 발행 기다리는 일감이 있으면 주소를 1초마다 본다
  //  (글 화면 안쪽 프레임 PostView.naver?blogId=…&logNo=… 에서도 본다)
  let watching = false;
  async function watchPublished() {
    if (watching) return;
    let p = null;
    try { p = (await chrome.storage.local.get(PENDING))[PENDING]; } catch (_) { return; }
    if (!p || !p.id || Date.now() - p.at > WAIT) return;
    watching = true;
    let last = "";
    const t = setInterval(async () => {
      if (Date.now() - p.at > WAIT) return clearInterval(t);
      if (location.href === last) return;
      last = location.href;
      if (!postUrl()) return;
      await catchPublished();
      let still = null;
      try { still = (await chrome.storage.local.get(PENDING))[PENDING]; } catch (_) {}
      if (!still) clearInterval(t);
    }, 1000);
  }
  if (window === window.top) dlog(`화면 열림 ${location.href.slice(0, 120)}`);
  void watchPublished();
  try { chrome.storage.onChanged.addListener((c) => { if (c[PENDING] && c[PENDING].newValue) void watchPublished(); }); } catch (_) {}
  if (typeof self.__gwNaver === "function") void run();
})();
