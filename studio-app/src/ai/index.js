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
  const viaApi = require("../ai-connect").getMode(id) === "api";
  const apiChat = /^gsapi:\/\//.test(String(opts.chatUrl || ""));
  if (!opts.chatUrl || viaApi === apiChat) return { viaApi, opts };
  return { viaApi, opts: { ...opts, chatUrl: "" }, fallback: true };
}

function ask(prompt, opts = {}) {
  const id = providerOfUrl(opts.chatUrl) || opts.provider || current();
  const r = retarget(id, opts);
  const p = r.fallback ? r.opts.fallbackPrompt || prompt : prompt;
  if (r.fallback && !r.opts.fallbackPrompt) throw new Error("AI 쓰는 방법(계정/API 키)이 바뀌어 처음 대화에 이어 쓸 수 없어요. [다시 쓰기]를 해 주세요.");
  const label = `${AIS[id].name}가 ${opts.busyLabel || "글을 작성하고 있습니다"}`;
  if (r.viaApi) return busy.during(label, () => require("./api").ask(id, p, r.opts), API_SUB);
  return busy.during(label, () => AIS[id].mod().ask(p, r.opts));
}

/** 지금 그림을 그릴 AI — [내 AI 연결]의 기본 이미지 생성 AI ("준비 중"·미연결이면 ChatGPT) */
function currentImager() {
  const conn = require("../ai-connect");
  const want = conn.getImager();
  return conn.list().some((x) => x.id === want && x.ok && x.imageReady) ? want : "chatgpt";
}

function askImage(prompt, opts = {}) {
  const id = opts.provider || currentImager();
  if (require("../ai-connect").getMode(id) === "api") {
    // API 키 그림 — 대화에 이어 그리기(chatUrl)는 없고, 첨부 사진(files)으로 고쳐 그린다
    return busy.during(`${AIS[id].name}가 그림을 그리고 있습니다`, () => require("./api").askImage(id, prompt, opts), API_SUB);
  }
  const mod = AIS[id].mod();
  if (!mod.askImage) throw new Error(`${AIS[id].name} 그림 그리기는 준비 중입니다. [내 AI 연결]에서 기본 이미지 생성 AI 를 ChatGPT 로 골라 주세요.`);
  return busy.during(`${AIS[id].name}가 그림을 그리고 있습니다`, () => mod.askImage(prompt, opts));
}

module.exports = { ask, askImage, current, currentImager, providerOfUrl, nameOf: (id) => (AIS[id] || AIS.chatgpt).name, AIS };
