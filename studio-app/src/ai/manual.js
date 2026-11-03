// 내 계정 — 수동 (2026-10-23 사장님 회의)
//  앱이 브라우저를 조종하지 않는다. 질문을 복사해 회원의 평소 브라우저에 AI 창을 열어 주고,
//  회원이 답을 복사하면 앱이 그 글을 읽어 가져온다 (AI 덮개 안에서 — 기사·블로그·SNS·영상 대본 모두 같은 길)
//  - 시작하면 질문을 클립보드에 넣고 AI 사이트를 연다 (평소 크롬 · 회원이 로그인해 둔 그 계정)
//  - 클립보드를 1초마다 본다: 질문과 다른 글이 들어왔고 형식(isComplete)이 맞으면 그 글로 끝
//  - [질문 다시 복사하고 열기] · [복사한 답 가져오기] 단추 · Esc 로 그만두기
const { clipboard, shell } = require("electron");
const crypto = require("crypto");
const log = require("electron-log/main");
const busy = require("../ai-busy");
const float = require("./manual-float"); // 크롬이 앱을 덮어도 보이는 작은 "답 기다리는 중" 창 (2026-11-03)

const SITE = {
  chatgpt: { name: "ChatGPT", url: "https://chatgpt.com/" },
  gemini: { name: "Gemini", url: "https://gemini.google.com/app" },
  claude: { name: "Claude", url: "https://claude.ai/new" },
};

/* 그림 설명 — 입력칸 Ctrl+V · 답의 코드 상자 오른쪽 위 [복사] (2026-11-03 사장님: 처음 하는 사람은 모름, 복사 단추 위치까지) */
const pic = (name) => `
<div style="display:flex;gap:10px;justify-content:center;margin:12px auto 0;max-width:560px;flex-wrap:wrap;text-align:left">
  <div style="flex:1;min-width:230px;border:1px solid #334155;border-radius:12px;background:#1e293b;padding:8px 10px;display:flex;align-items:center;gap:8px">
    <span style="flex:1;font-size:12px;color:#94a3b8">${name}에게 메시지 보내기…</span>
    <span style="font-size:11px;font-weight:800;color:#fff;border:2px solid #f87171;border-radius:6px;padding:1px 7px">Ctrl + V</span>
    <span style="width:22px;height:22px;border-radius:50%;background:#fff;color:#111;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:800">↑</span>
  </div>
  <div style="flex:1;min-width:230px;border:1px solid #334155;border-radius:10px;overflow:hidden;background:#0f172a">
    <div style="display:flex;align-items:center;padding:5px 10px;background:#1e293b;font-size:11px;color:#94a3b8"><span style="flex:1">json</span><span style="color:#fff;font-weight:800;border:2px solid #f87171;border-radius:6px;padding:0 6px">⧉ 복사</span></div>
    <div style="padding:6px 10px;font-family:Consolas,monospace;font-size:11px;color:#cbd5e1">{ "title": "…", "paragraphs": [ … ] }</div>
  </div>
</div>`;
const panel = (name, msg = "", preview = "") => `
<div style="text-align:left;line-height:1.75;max-width:520px;margin:0 auto">
  <b>1.</b> 질문을 복사해 두고 평소 브라우저에 <b>${name}</b> 창을 열었어요. <b>입력칸을 한 번 누르고 Ctrl+V</b> 하고 보내세요.<br>
  <b>2.</b> 답이 다 나오면 답 안의 <b>코드 상자 오른쪽 위 [복사]</b>를 누르세요 (코드 상자가 없으면 답 맨 아래 복사 단추) — 앱이 알아서 가져와요.
</div>
${pic(name)}
<div style="display:flex;gap:8px;justify-content:center;margin-top:12px;flex-wrap:wrap">
  <button type="button" class="gb" data-gsm="copy">질문 다시 복사하고 ${name} 열기</button>
  <button type="button" class="gb" data-gsm="paste">복사한 답 가져오기</button>
  ${preview ? `<button type="button" class="gb" data-gsm="use" style="background:#2563eb;color:#fff;border-color:#2563eb">✓ 이 그림 쓰기</button>` : ""}
</div>
${preview ? `<div style="margin:12px auto 0;text-align:center"><img src="${preview}" alt="" style="max-width:320px;max-height:200px;border-radius:8px;border:2px solid #60a5fa"></div>` : ""}
${msg ? `<div style="margin-top:10px;color:#fbbf24">${msg}</div>` : ""}`;

/** 수동으로 묻기 — 돌려줌: 회원이 복사해 온 답 글 */
async function ask(id, prompt, opts = {}) {
  const site = SITE[id] || SITE.chatgpt;
  const isComplete = typeof opts.isComplete === "function" ? opts.isComplete : null;
  const q = String(prompt);
  const ok = (t) => {
    const s = String(t || "").trim();
    if (!s || s === q.trim() || s.length < 2) return false;
    return isComplete ? Boolean(isComplete(s)) : true;
  };
  const open = () => {
    clipboard.writeText(q);
    void shell.openExternal(site.url);
  };
  let start = "";
  try { start = clipboard.readText(); } catch {}
  // opts.allowImage — 장면 설명(글)을 묻는데 AI 가 그림을 바로 그려 줬으면 그 그림을 쓴다 (2026-10-31 사장님: Gemini 가 그림을 그려 복사해도 안 들어갔다)
  //  새로 복사한 그림을 작게 보여 주고 [이 그림 쓰기] → "data:image/png;base64,…" 를 돌려준다 (부르는 쪽이 그림으로 쓴다)
  let imgStart = "", imgShown = "", img = null;
  if (opts.allowImage) { try { imgStart = imgKey(clipboard.readImage()); } catch {} }
  open();
  log.info(`[AI 수동] ${site.name} — 질문 ${q.length}자 복사, 창 열기`);
  busy.setSub(panel(site.name));
  let floatAct = "";
  float.show(site.name, (a) => { floatAct = a; });
  try {
  while (true) {
    if (floatAct === "stop") { floatAct = ""; busy.stop(); }
    if (busy.isStopped()) throw busy.stopError();
    await new Promise((r) => setTimeout(r, 900));
    let cur = "";
    try { cur = clipboard.readText(); } catch {}
    if (opts.allowImage) {
      let ci = null;
      try { ci = clipboard.readImage(); } catch {}
      const k = imgKey(ci);
      if (k && k !== imgStart && k !== imgShown) {
        imgShown = k;
        img = ci;
        const sz = ci.getSize();
        busy.setSub(panel(site.name, `${site.name}가 그림을 바로 그렸네요 — 이 그림을 쓰려면 [이 그림 쓰기]를 누르세요.`, ci.resize({ width: Math.min(320, sz.width) }).toDataURL()));
      }
    }
    // 새로 복사한 글이고 형식이 맞으면 끝
    if (isComplete && cur !== start && cur !== q && ok(cur)) { // 형식을 알 때만 저절로 (모르면 [복사한 답 가져오기])
      log.info(`[AI 수동] ${site.name} 답 가져옴 (${cur.length}자)`);
      float.bringAppFront();
      return cur;
    }
    let act = await busy.takeAct();
    if (!act && floatAct) { act = floatAct; floatAct = ""; }
    if (act === "use" && img) { log.info(`[AI 수동] ${site.name} 그림으로 받음 (${img.getSize().width}×${img.getSize().height})`); float.bringAppFront(); return img.toDataURL(); }
    if (act === "copy") { open(); imgStart = imgShown || imgStart; imgShown = ""; img = null; busy.setSub(panel(site.name, "질문을 다시 복사했어요. 붙여 넣고 보내세요.")); }
    if (act === "paste") {
      if (ok(cur)) { log.info(`[AI 수동] ${site.name} 답 가져옴 (단추, ${cur.length}자)`); float.bringAppFront(); return cur; }
      const why = cur.trim() === q.trim() ? "아직 질문이 복사돼 있어요. 답 아래 복사 단추를 눌러 주세요." : "복사한 글이 답 형식과 달라요. 답이 다 나온 뒤 답 아래 복사 단추를 눌러 주세요.";
      busy.setSub(panel(site.name, why));
      float.setMsg(site.name, why);
    }
  }
  } finally { float.close(); }
}

/* ── 그림 — 그림 설명을 복사 → AI 창에서 그림 → 그림 오른쪽 클릭 [이미지 복사] → 앱이 가져온다 ── */
/* 2026-10-30 사장님: 클립보드에 들어온 그림을 바로 넣지 않는다 — 화면 캡처 등 다른 그림을 AI 그림으로 잘못 가져갔다.
   새로 복사한 그림을 작게 보여 주고 [이 그림 쓰기] 한 번 누르면 넣는다. 다른 그림이면 다시 복사하면 바뀐다 */
const imgPanel = (name, files, msg = "", preview = "") => `
<div style="text-align:left;line-height:1.75;max-width:540px;margin:0 auto">
  <b>1.</b> 그림 설명을 복사해 두고 평소 브라우저에 <b>${name}</b> 창을 열었어요. 입력칸에 <b>붙여 넣기(Ctrl+V)</b> 하고 보내세요.<br>
  ${files ? `<b>·</b> 참고 사진 ${files}장이 든 폴더도 열었어요. 사진을 ${name} 입력칸에 <b>끌어다 놓고</b> 보내세요.<br>` : ""}
  <b>2.</b> 그림이 다 나오면 그림을 <b>오른쪽 클릭 › 이미지 복사</b> 하고 아래 <b>[이 그림 쓰기]</b>를 누르세요.
</div>
${preview ? `<div style="margin:12px auto 0;text-align:center"><img src="${preview}" alt="" style="max-width:320px;max-height:200px;border-radius:8px;border:2px solid #60a5fa"></div>` : ""}
<div style="display:flex;gap:8px;justify-content:center;margin-top:12px;flex-wrap:wrap">
  <button type="button" class="gb" data-gsm="copy">그림 설명 다시 복사하고 ${name} 열기</button>
  ${preview ? `<button type="button" class="gb" data-gsm="use" style="background:#2563eb;color:#fff;border-color:#2563eb">✓ 이 그림 쓰기</button>` : ""}
</div>
${msg ? `<div style="margin-top:10px;color:#fbbf24">${msg}</div>` : ""}`;

const imgKey = (img) => (img && !img.isEmpty() ? crypto.createHash("md5").update(img.toPNG()).digest("hex") : "");

/** 수동으로 그림 받기 — 돌려줌: data:image/png;base64,… (자동 askImage 와 같은 모양) */
async function askImage(id, prompt, opts = {}) {
  const site = SITE[id] || SITE.chatgpt;
  const q = String(prompt);
  const files = (Array.isArray(opts.files) ? opts.files : []).filter((f) => f && require("fs").existsSync(f));
  const open = () => {
    clipboard.writeText(q);
    void shell.openExternal(site.url);
  };
  let start = "";
  try { start = imgKey(clipboard.readImage()); } catch {}
  open();
  if (files.length) shell.showItemInFolder(files[0]); // 참고 사진 — 회원이 AI 창에 끌어다 놓는다
  log.info(`[AI 수동 그림] ${site.name} — 설명 ${q.length}자 복사, 창 열기${files.length ? ` · 참고 사진 ${files.length}장` : ""}`);
  busy.setSub(imgPanel(site.name, files.length));
  let shownKey = "", shown = null;
  let floatAct = "";
  float.show(site.name, (a) => { floatAct = a; });
  try {
  while (true) {
    if (floatAct === "stop") { floatAct = ""; busy.stop(); }
    if (busy.isStopped()) throw busy.stopError();
    await new Promise((r) => setTimeout(r, 900));
    // 새로 복사한 그림이 생기면 작게 보여 준다 (넣지는 않는다)
    let img = null;
    try { img = clipboard.readImage(); } catch {}
    const k = imgKey(img);
    if (k && k !== start && k !== shownKey) {
      shownKey = k;
      shown = img;
      const sz = img.getSize();
      const thumb = img.resize({ width: Math.min(320, sz.width) }).toDataURL();
      busy.setSub(imgPanel(site.name, files.length, `복사한 그림 ${sz.width}×${sz.height} — 맞으면 [이 그림 쓰기], 아니면 그림을 다시 복사하세요.`, thumb));
    }
    let act = await busy.takeAct();
    if (!act && floatAct) { act = floatAct === "paste" ? "use" : floatAct; floatAct = ""; } // 그림은 [복사한 답 가져오기] = 이 그림 쓰기
    if (act === "copy") { open(); start = shownKey || start; shownKey = ""; shown = null; busy.setSub(imgPanel(site.name, files.length, "그림 설명을 다시 복사했어요. 붙여 넣고 보내세요.")); }
    if (act === "use" && shown) {
      const sz = shown.getSize();
      log.info(`[AI 수동 그림] ${site.name} 그림 가져옴 (${sz.width}×${sz.height}, [이 그림 쓰기])`);
      float.bringAppFront();
      return shown.toDataURL();
    }
  }
  } finally { float.close(); }
}

module.exports = { ask, askImage, SITE };
