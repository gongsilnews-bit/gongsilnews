/* 네이버 블로그 글쓰기 — 앱에서 보낸 일감(제목·본문 블록·사진·태그)을 받아 채운다
   - 채우기는 naver-fill.js(기사작성기 content-naver.js 그대로)의 GW_APPLY_BLOG_DRAFT
   - 글쓰기 화면은 프레임이 여럿이라 각 프레임에서 돈다. 편집기가 있는 프레임만 일감을 받아 간다
   - [발행]은 누르지 않는다. 태그는 회원이 발행 창을 열면 채워진다 */
(() => {
  "use strict";
  const send = (msg) => new Promise((resolve) => {
    try { chrome.runtime.sendMessage(msg, (r) => resolve(chrome.runtime.lastError ? null : r)); } catch (_) { resolve(null); }
  });

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
    await send({ type: "GS_DONE", id: job.id, result });
  }

  if (typeof self.__gwNaver === "function") void run();
})();
