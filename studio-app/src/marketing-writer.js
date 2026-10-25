// 공실마케팅 AI 채우기 — AI 매물보고서 · AI 유리창홍보지 (2026-10-15)
// 도구(/marketing/report·ai-detail)가 앱 화면 안에서 지금 칸 글을 보내면,
// 앱이 공실 정보를 서버에서 받아 회원 ChatGPT 로 같은 칸을 이 매물에 맞게 다시 쓴다 (블로그 쓰기와 같은 방법).
// 프롬프트는 서버 묶음 marketing/marketing-prompt.js (설치 파일에 넣지 않음). 개인정보는 프롬프트 파일이 허용 목록으로 뺀다.
// 이용 횟수는 아직 세지 않는다 (사장님이 나중에 정함).
const { session } = require("electron");
const log = require("electron-log/main");
const ext = require("./ext");
const chatgpt = require("./ai"); // 고른 글쓰기 AI (ChatGPT · Gemini) — 그림은 ChatGPT
const reportLocal = require("./report-local");

const lib = () => ext.run(["marketing/marketing-prompt.js"]);
const KINDS = new Set(["flyer", "report"]);

async function fill({ baseUrl, kind, vacancyId, fields, facts, publicFacts, request }, onProgress = () => {}) {
  if (!KINDS.has(kind)) throw new Error("알 수 없는 도구입니다.");
  if (!vacancyId || typeof vacancyId !== "string") throw new Error("공실을 먼저 골라 주세요.");
  if (!fields || typeof fields !== "object" || !Object.keys(fields).length) throw new Error("채울 칸이 없습니다.");
  const L = lib();

  let vacancy;
  if (reportLocal.isLocalReport(vacancyId)) {
    // 공실 없이 만든 매물보고서 (2026-10-23) — 붙여넣은 글을 정리한 정보 + 지금 화면 칸. 멤버십 전용
    await reportLocal.assertPaid(baseUrl);
    // facts = 회원이 보고서 화면에서 고친 가격·면적·층 같은 값 (직접 입력한 보고서는 이것뿐)
    const extra = {};
    for (const [k, val] of Object.entries(facts && typeof facts === "object" ? facts : {})) {
      const t = String(val == null ? "" : val).trim();
      if (t && t !== "-" && typeof val !== "object") extra[String(k).slice(0, 30)] = t.slice(0, 600);
    }
    vacancy = { ...(reportLocal.get(vacancyId).vacancy || {}), metadata: extra };
  } else {
    onProgress("공실 정보를 읽는 중…");
    const res = await session.defaultSession.fetch(`${baseUrl}/api/vacancy/detail?id=${encodeURIComponent(vacancyId)}`);
    const json = await res.json().catch(() => ({}));
    if (!json || !json.success || !json.data) throw new Error((json && json.error) || "공실 정보를 받지 못했습니다.");
    vacancy = json.data;
  }

  // publicFacts = 보고서가 받아 둔 지적도·대장·층별·실거래 요약 (건축물대장·층별·인허가·실거래, 2026-10-24) — 글자만, 길이 제한
  const pub = typeof publicFacts === "string" ? publicFacts.slice(0, 3500) : "";
  // request = 쪽별 [AI 수정 요청]에 회원이 적은 말 (2026-10-25) — 짧게 자른다
  const req = typeof request === "string" ? request.trim().slice(0, 500) : "";
  const prompt = L.gwBuildMarketingPrompt(kind, vacancy, fields, pub, req);
  const text = await chatgpt.ask(prompt, { onProgress, isComplete: (t) => L.gwParseMarketing(t, fields).ok });
  onProgress("받은 글을 칸에 맞추는 중…");
  const parsed = L.gwParseMarketing(text, fields);
  if (!parsed.ok) throw new Error(parsed.reason);
  log.info(`[공실마케팅] ${kind} ${vacancyId} 칸 ${Object.keys(parsed.fields).length}개 채움`);
  return parsed.fields;
}

module.exports = { fill };
