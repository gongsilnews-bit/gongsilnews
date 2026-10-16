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

function ask(prompt, opts = {}) {
  const id = providerOfUrl(opts.chatUrl) || opts.provider || current();
  return busy.during(`${AIS[id].name}가 ${opts.busyLabel || "글을 작성하고 있습니다"}`, () => AIS[id].mod().ask(prompt, opts));
}

/** 지금 그림을 그릴 AI — [내 AI 연결]의 기본 이미지 생성 AI ("준비 중"·미연결이면 ChatGPT) */
function currentImager() {
  const conn = require("../ai-connect");
  const want = conn.getImager();
  return conn.list().some((x) => x.id === want && x.ok && x.imageReady) ? want : "chatgpt";
}

function askImage(prompt, opts = {}) {
  const id = opts.provider || currentImager();
  const mod = AIS[id].mod();
  if (!mod.askImage) throw new Error(`${AIS[id].name} 그림 그리기는 준비 중입니다. [내 AI 연결]에서 기본 이미지 생성 AI 를 ChatGPT 로 골라 주세요.`);
  return busy.during(`${AIS[id].name}가 그림을 그리고 있습니다`, () => mod.askImage(prompt, opts));
}

module.exports = { ask, askImage, current, currentImager, providerOfUrl, nameOf: (id) => (AIS[id] || AIS.chatgpt).name, AIS };
