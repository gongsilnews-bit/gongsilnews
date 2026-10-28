// 글쓰기 AI 고르기 — 기사·블로그·SNS·유튜브·칼럼·공실마케팅이 모두 이 ask 를 부른다 (2026-10-15 사장님 회의)
//  - 수정 요청은 처음 쓴 AI 대화에 이어 보낸다 (chatUrl 주소로 어느 AI 인지 안다)
//  - 새 글은 [내 AI 연결]에서 고른 "기본 글쓰기 AI". 그 AI 가 연결 안 돼 있고 다른 쪽이 연결돼 있으면 그쪽
//  - 그림(askImage)은 1단계에서는 ChatGPT 만 (제미나이 그림은 2단계)
const AIS = {
  chatgpt: { name: "ChatGPT", mod: () => require("./chatgpt") },
  gemini: { name: "Gemini", mod: () => require("./gemini") },
  claude: { name: "Claude", mod: () => require("./claude") }, // 글쓰기만 — 그림은 ChatGPT
};

const providerOfUrl = (url) => {
  const u = String(url || "");
  if (/^gsapi:\/\//.test(u)) return require("./api").providerOfChat(u); // API 키로 쓴 대화 (PC 에 저장)
  if (/gemini\.google\.com/.test(u)) return "gemini";
  if (/claude\.ai/.test(u)) return "claude";
  if (/chatgpt\.com|chat\.openai\.com/.test(u)) return "chatgpt";
  return "";
};

/** 지금 새 글을 쓸 AI */
function current() {
  const conn = require("../ai-connect");
  const want = conn.getWriter();
  const ok = (id) => conn.list().some((x) => x.id === id && x.ok && x.ready); // "준비 중" AI 는 쓰지 않는다
  if (ok(want)) return want;
  const other = Object.keys(AIS).find((id) => id !== want && ok(id));
  return other || want;
}

const busy = require("../ai-busy"); // 쓰는 동안 스튜디오 창 전체를 덮는다 ("AI가 기사를 작성하고 있습니다… 0:42")

const API_SUB = "API 키로 바로 주고받아요. 보통 30초~1분 걸려요.<br>끝나면 저절로 가져와요.";

/* 방법이 바뀐 뒤의 수정 요청 — 계정 대화 주소는 API 로, API 대화는 계정 창으로 이어 갈 수 없다 → 처음 자료(fallbackPrompt)로 새로 */
function retarget(id, opts) {
  // opts.mode — 이번 글만 계정/API 키를 골라 쓴다 (텍스트로 영상 [쓸 AI 고르기], 2026-10-20). 없으면 [내 AI 연결]의 방법
  const viaApi = opts.mode ? opts.mode === "api" : require("../ai-connect").getMode(id) === "api";
  const apiChat = /^gsapi:\/\//.test(String(opts.chatUrl || ""));
  if (!opts.chatUrl || viaApi === apiChat) return { viaApi, opts };
  return { viaApi, opts: { ...opts, chatUrl: "" }, fallback: true };
}

async function ask(prompt, opts = {}) {
  const id = providerOfUrl(opts.chatUrl) || opts.provider || current();
  const r = retarget(id, opts);
  const p = r.fallback ? r.opts.fallbackPrompt || prompt : prompt;
  if (r.fallback && !r.opts.fallbackPrompt) throw new Error("AI 쓰는 방법(계정/API 키)이 바뀌어 처음 대화에 이어 쓸 수 없어요. [다시 쓰기]를 해 주세요.");
  // 사용 내역 기능 이름 — "그림 장면 설명을 쓰고 있습니다" → "그림 장면 설명"
  const feature = String(opts.feature || opts.busyLabel || "글").replace(/\s*(을|를)?\s*(쓰고|작성하고|만들고|그리고) 있습니다$/, "") || "글";
  const run = (viaApi, o, pr, why = "") => {
    const label = `${AIS[id].name} ${viaApi ? "API(유료)" : "내 계정(무료)"}가 ${why}${opts.busyLabel || "글을 작성하고 있습니다"}`; // 2026-10-21: 무료·유료를 확실하게
    if (viaApi) return busy.during(label, () => require("./api").ask(id, pr, { ...o, feature }), o.wait ? API_SUB.replace("30초~1분", o.wait) : API_SUB);
    // 내 계정 — 수동(처음 값): 질문을 복사해 내 브라우저에서 묻고 답을 복사해 온다. 자동: 전용 크롬 조종 (2026-10-23)
    // 수정 요청도 수동 — 처음 대화 창이 닫혔을 수 있어서, 처음 자료·지금 글·요청을 다 담은 질문(fallbackPrompt)을 복사한다
    if (require("../ai-connect").getMethod() === "manual") return busy.during(label.replace("내 계정(무료)가", "내 계정(무료·수동)으로"), () => require("./manual").ask(id, o.chatUrl && o.fallbackPrompt ? o.fallbackPrompt : pr, o), " ");
    return busy.during(label, () => AIS[id].mod().ask(pr, o));
  };
  try {
    return await run(r.viaApi, r.opts, p);
  } catch (e) {
    // 쓰는 순서 — 막히면 다른 방법으로 한 번 (작업에서 계정/API 를 직접 고른 것·중지는 그대로)
    if (opts.mode || (e && e.code === "GS_STOPPED") || busy.isStopped()) throw e;
    if (!r.viaApi && require("../ai-connect").getMethod() === "manual") throw e;
    const alt = require("../ai-connect").fallbackMode(id, r.viaApi ? "api" : "account");
    if (!alt || (opts.chatUrl && !opts.fallbackPrompt)) throw e;
    // 무료 → 유료로 넘어갈 때는 한 번 묻는다 (2026-10-23 사장님). [다음부터 묻지 않기]를 고르면 ai-settings.json 의 paidNoAsk
    if (alt === "api" && !(await confirmPaid(AIS[id].name, e))) throw e;
    require("electron-log/main").warn(`[AI] ${AIS[id].name} ${r.viaApi ? "API" : "내 계정"} 막힘 → ${alt === "api" ? "API(유료)" : "내 계정(무료)"}로: ${e && e.message}`);
    return run(alt === "api", { ...opts, chatUrl: "" }, opts.chatUrl ? opts.fallbackPrompt : prompt, alt === "api" ? "(무료가 막혀서) " : "(API가 막혀서) ");
  }
}

/** 지금 그림을 그릴 AI — [내 AI 연결]의 기본 이미지 생성 AI ("준비 중"·미연결이면 ChatGPT) */
function currentImager() {
  const conn = require("../ai-connect");
  const want = conn.getImager();
  return conn.list().some((x) => x.id === want && x.ok && x.imageReady) ? want : "chatgpt";
}

function askImage(prompt, opts = {}) {
  const id = opts.provider || currentImager();
  // opts.mode — 이번 그림만 계정/API 키 (쓸 AI 고르기, 2026-10-21). 없으면 [내 AI 연결]의 방법
  if (opts.mode ? opts.mode === "api" : require("../ai-connect").getMode(id) === "api") {
    // API 키 그림 — 대화에 이어 그리기(chatUrl)는 없고, 첨부 사진(files)으로 고쳐 그린다
    return busy.during(`${AIS[id].name} API(유료)가 그림을 그리고 있습니다`, () => require("./api").askImage(id, prompt, { ...opts, feature: opts.feature || "이미지" }), API_SUB);
  }
  // 내 계정 — 수동: 그림 설명을 복사해 내 브라우저에서 그리고, 그림을 [이미지 복사]하면 가져온다 (2026-10-23)
  if (require("../ai-connect").getMethod() === "manual") {
    return busy.during(`${AIS[id].name} 내 계정(무료·수동)으로 그림을 그리고 있습니다`, () => require("./manual").askImage(id, prompt, opts), " ");
  }
  const mod = AIS[id].mod();
  if (!mod.askImage) throw new Error(`${AIS[id].name} 그림 그리기는 준비 중입니다. [내 AI 연결]에서 기본 이미지 생성 AI 를 ChatGPT 로 골라 주세요.`);
  return busy.during(`${AIS[id].name}가 그림을 그리고 있습니다`, () => mod.askImage(prompt, opts));
}

/** 무료(내 계정)가 막혔을 때 — API(유료)로 이어서 쓸지 묻기. true = 유료로 */
async function confirmPaid(name, err) {
  const conn = require("../ai-connect");
  if (conn.getPaidNoAsk && conn.getPaidNoAsk()) return true;
  const { dialog, BrowserWindow } = require("electron");
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  const r = await dialog.showMessageBox(win || undefined, {
    type: "question", title: "공실마케팅",
    message: `${name} 내 계정(무료)이 막혔어요`,
    detail: `${String((err && err.message) || "").slice(0, 160)}

${name} API(유료)로 이어서 쓸까요? 쓴 만큼 ${name} 회사에 직접 결제돼요. (AI 설정 › API 사용 내역에서 금액을 볼 수 있어요)`,
    buttons: ["유료(API)로 쓰기", "그만두기"], defaultId: 0, cancelId: 1, noLink: true,
    checkboxLabel: "다음부터 묻지 않고 유료로 넘어가기",
  });
  if (r.response !== 0) return false;
  if (r.checkboxChecked && conn.setPaidNoAsk) conn.setPaidNoAsk(true);
  return true;
}

module.exports = { ask, askImage, current, currentImager, providerOfUrl, nameOf: (id) => (AIS[id] || AIS.chatgpt).name, AIS };
