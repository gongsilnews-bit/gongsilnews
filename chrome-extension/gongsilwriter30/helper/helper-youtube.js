/* 유튜브 스튜디오 — 웹 쇼츠릴스studio 에서 보낸 영상·제목·설명을 올리기 화면에 넣는다 (2026-11-05 사장님: "2번으로 — 도우미가 채우고 게시는 회원이")
   - 웹이 맡긴 youtube 일감이 있을 때만 움직인다 (평소 유튜브 스튜디오에서는 아무것도 하지 않는다)
   - 영상 파일 넣기 → 제목·설명 넣기 → "아동용 아님" 고르기까지. 공개 범위·[게시]는 회원이 고른다
   - 찾는 이름표(SEL)는 유튜브 화면이 바뀌면 여기만 고친다 */
(() => {
  "use strict";
  if (window.top !== window || window.__gsHelperYoutube) return;
  window.__gsHelperYoutube = true;

  const SEL = {
    file: "ytcp-uploads-file-picker input[type='file'], ytcp-uploads-dialog input[type='file'], input[type='file'][name='Filedata']",
    title: "#title-textarea #textbox, ytcp-social-suggestions-textbox#title-textarea #textbox",
    desc: "#description-textarea #textbox, ytcp-social-suggestions-textbox#description-textarea #textbox",
    notKids: "tp-yt-paper-radio-button[name='VIDEO_MADE_FOR_KIDS_NOT_MFK']",
    createBtn: "#create-icon, ytcp-button#create-icon",
    uploadItem: "tp-yt-paper-item#text-item-0, #text-item-0",
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const send = (msg) => new Promise((resolve) => {
    try { chrome.runtime.sendMessage(msg, (r) => resolve(chrome.runtime.lastError ? null : r)); } catch (_) { resolve(null); }
  });
  const waitFor = async (sel, ms) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const el = document.querySelector(sel);
      if (el) return el;
      await sleep(400);
    }
    return null;
  };

  /* 알림 상자 — 오른쪽 아래 */
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

  /* 글 넣기 — contenteditable 에 원래 글을 지우고 새 글 */
  async function putText(el, text) {
    el.focus();
    await sleep(80);
    document.execCommand("selectAll", false);
    document.execCommand("insertText", false, text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(150);
    if ((el.innerText || "").trim().length < Math.min(5, text.trim().length)) { el.textContent = text; el.dispatchEvent(new Event("input", { bubbles: true })); }
  }

  async function run() {
    const r = await send({ type: "GS_CLAIM", target: "youtube" });
    const job = r && r.job;
    if (!job) return;
    note("영상을 받는 중이에요…");
    try {
      // 1 영상 파일 — 확장에 맡긴 조각을 이어 붙인다
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
      const file = new File(parts, job.fileName || "shorts.mp4", { type: "video/mp4" });

      // 2 올리기 창 — 없으면 [만들기] → [동영상 업로드]
      let input = await waitFor(SEL.file, 8000);
      if (!input) {
        const c = document.querySelector(SEL.createBtn);
        if (c) { c.click(); await sleep(700); const it = document.querySelector(SEL.uploadItem); if (it) it.click(); }
        input = await waitFor(SEL.file, 10000);
      }
      if (!input) throw new Error("유튜브 올리기 창을 찾지 못했어요. [만들기] → [동영상 업로드]를 누른 뒤 웹에서 다시 눌러 주세요.");
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      note("영상을 넣었어요. 제목·설명을 채우는 중이에요…");

      // 3 제목·설명
      const title = await waitFor(SEL.title, 40000);
      if (!title) throw new Error("영상은 넣었어요. 제목 칸을 찾지 못해 제목·설명은 직접 넣어 주세요 (웹 창의 [글 복사]).");
      await sleep(1200); // 유튜브가 파일 이름을 제목에 넣은 뒤에 바꾼다
      if (job.title) await putText(title, String(job.title).slice(0, 100));
      const desc = document.querySelector(SEL.desc);
      if (desc && job.text) await putText(desc, String(job.text).slice(0, 5000));
      const kids = document.querySelector(SEL.notKids);
      if (kids) kids.click();

      await send({ type: "GS_DONE", id: job.id, result: { ok: true } });
      note("다 채웠어요. 내용을 확인하고 [다음]으로 넘어가 공개 범위를 고른 뒤 [게시]를 눌러 주세요.", "ok");
    } catch (e) {
      await send({ type: "GS_DONE", id: job.id, result: { ok: false, error: String((e && e.message) || e) } });
      note(String((e && e.message) || e), "err");
    }
  }

  // 페이지가 다 그려진 뒤 — 유튜브 스튜디오는 한 페이지 안에서 움직인다
  setTimeout(run, 1500);
})();
