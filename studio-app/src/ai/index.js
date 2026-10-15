// 글쓰기 AI 고르기 — 기사·블로그·SNS·유튜브·칼럼·공실마케팅이 모두 이 ask 를 부른다 (2026-10-15 사장님 회의)
//  - 수정 요청은 처음 쓴 AI 대화에 이어 보낸다 (chatUrl 주소로 어느 AI 인지 안다)
//  - 새 글은 [내 AI 연결]에서 고른 "기본 글쓰기 AI". 그 AI 가 연결 안 돼 있고 다른 쪽이 연결돼 있으면 그쪽
//  - 그림(askImage)은 1단계에서는 ChatGPT 만 (제미나이 그림은 2단계)
const AIS = {
  chatgpt: { name: "ChatGPT", mod: () => require("./chatgpt") },
  gemini: { name: "Gemini", mod: () => require("./gemini") },
};

const providerOfUrl = (url) => (/gemini\.google\.com/.test(String(url || "")) ? "gemini" : /chatgpt\.com|chat\.openai\.com/.test(String(url || "")) ? "chatgpt" : "");

/** 지금 새 글을 쓸 AI */
function current() {
  const conn = require("../ai-connect");
  const want = conn.getWriter();
  const ok = (id) => conn.list().some((x) => x.id === id && x.ok && x.ready); // "준비 중" AI 는 쓰지 않는다
  if (ok(want)) return want;
  const other = Object.keys(AIS).find((id) => id !== want && ok(id));
  return other || want;
}

function ask(prompt, opts = {}) {
  const id = providerOfUrl(opts.chatUrl) || opts.provider || current();
  return AIS[id].mod().ask(prompt, opts);
}

function askImage(prompt, opts = {}) {
  return AIS.chatgpt.mod().askImage(prompt, opts);
}

module.exports = { ask, askImage, current, providerOfUrl, nameOf: (id) => (AIS[id] || AIS.chatgpt).name, AIS };
