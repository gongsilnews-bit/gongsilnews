// 유튜브 대본 (뉴스·SNS발행 > 유튜브 대본 탭) — 크롬 확장 4번 탭과 같은 프롬프트
//
// AI 는 읽을 원고만 쓴다: 제목 · 제목 후보 3개 · 나레이션 원고(문단별). 장면·이미지 스크립트는 쓰지 않는다.
//  - 공실: 확장 기사작성기 대본(매물 소개·부동산 뉴스·지역 분석, 경매·공매는 경매용). 숫자 읽기는 앱이 한 줄 덧붙인다.
//  - 뉴스칼럼: 확장 뉴스메이커 대본(뉴스 브리핑·생활 정보·이야기형, 숫자 한글 읽기/그대로).
//  - [참조 기사]: 공실뉴스 기사, 없으면 블로그 (칼럼은 기사가 있어야 한다).
//  - 설명란(요약·링크·출처)과 태그는 AI 가 아니라 코드가 붙인다.
//  - 이용 횟수: 'youtube' 로 따로, 공실(칼럼) 하나 = 이번 달 1회. 수정 요청은 같은 대화에 이어 보낸다.
// 원고 길이는 1초에 5.5자(공백 제외)로 어림한다 (확장과 같음).
const { app, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const log = require("electron-log/main");
const yt = require("./ext-youtube");
const nm = require("./ext-newsmaker");
const chatgpt = require("./ai"); // 고른 글쓰기 AI (ChatGPT · Gemini) — 그림은 ChatGPT
const blogWriter = require("./blog-writer");
const { fetchListing } = require("./naver-write");

const { mediaDir, readJson, isColumn } = blogWriter;
const ytFile = (id) => path.join(mediaDir(id), "youtube.json");
const HOME = "https://www.gongsilnews.com";
const DEFAULTS = { duration: "short", tone: "news", number: "hangul" }; // 회의 결정: 60초 쇼츠 · 한글 읽기 (AI 성우가 바로 읽게)

const readAnalysis = (id) => readJson(path.join(mediaDir(id), "analysis.json"));
// 인테리어·리모델링(번호 int-·rem-): 확장 interior10·remodeling10 대본 (결과표 + 기사, 영상 형식은 인테리어용)
const isSim = (id) => blogWriter.isSim(id);
const simW = () => require("./sim-writer");
const lib = (id) => (isColumn(id) ? yt.column : isSim(id) ? simW().lib(id) : yt.gongsil);

function videoTypes(id) {
  if (isColumn(id)) return yt.column.GW_YT_VIDEO_TYPE;
  if (isSim(id)) return simW().lib(id).gwYtVideoTypes(null);
  const analysis = readAnalysis(id);
  return yt.gongsil.gwYtVideoTypes(analysis && analysis.vacancy);
}

const table = (t, extra = (v) => ({})) => Object.entries(t).map(([id, v]) => ({ id, label: v.label, ...extra(v) }));

function options(id) {
  const L = lib(id);
  const types = videoTypes(id);
  return {
    videoTypes: table(types, (v) => ({ structure: v.structure })),
    durations: table(L.GW_YT_DURATION, (v) => ({ chars: v.chars, seconds: v.seconds })),
    tones: table(L.GW_YT_TONE),
    numbers: table(yt.column.GW_YT_NUMBER),
    defaults: { ...DEFAULTS, videoType: Object.keys(types)[0] },
  };
}

/* [참조 기사] 공실뉴스 기사 → 없으면 블로그 */
function referenceArticle(id) {
  const ref = blogWriter.referenceArticle(id);
  if (ref) return ref;
  if (isColumn(id) || isSim(id)) throw new Error("먼저 [공실뉴스 기사] 탭에서 기사를 써 주세요. 대본은 그 기사를 바탕으로 씁니다.");
  const blog = readJson(blogWriter.blogFile(id));
  if (blog) return { title: blog.title, subtitles: [], body: blog.paragraphs.join("\n\n") };
  throw new Error("먼저 [공실뉴스 기사]나 [네이버 블로그]를 써 주세요. 대본은 그 글을 바탕으로 씁니다.");
}

function scriptPrompt(id, settings) {
  const article = referenceArticle(id);
  if (isColumn(id)) return yt.column.gwBuildYtScriptPrompt({ article, source: require("./column-writer").readSource(id) }, settings);
  const number = yt.column.GW_YT_NUMBER[settings.number] || yt.column.GW_YT_NUMBER.hangul;
  if (isSim(id)) {
    const { result, vacancy } = simW().resultOf(id);
    return `${simW().lib(id).gwBuildYtScriptPrompt({ vacancy, article, remodel: result }, settings)}\n\n[숫자 표기]\n- ${number.prompt}`;
  }
  const analysis = readAnalysis(id);
  if (!analysis) throw new Error("먼저 [분석·캡처]를 해 주세요.");
  // 매물 대본 프롬프트에는 숫자 읽기 칸이 없어 한 줄 덧붙인다 (AI 성우가 읽기 좋게)
  return `${yt.gongsil.gwBuildYtScriptPrompt({ vacancy: analysis.vacancy, article }, settings)}\n\n[숫자 표기]\n- ${number.prompt}`;
}

/* 원고 문단 나누기 — AI 가 문자열 하나로 주면 빈 줄로 나눈다 */
function toParagraphs(value) {
  const list = Array.isArray(value) ? value : String(value || "").split(/\n{2,}/);
  return list.map((p) => String(p || "").trim()).filter(Boolean);
}

function parse(id, text) {
  const r = lib(id).GWYoutubeJson.parseObject(text);
  if (!r.ok) throw new Error(r.reason || "대본을 읽지 못했습니다.");
  const d = r.data || {};
  const narration = toParagraphs(d.narration || d.script || d.text);
  if (!narration.length) throw new Error("AI 답변에 원고가 없습니다. 다시 써 주세요.");
  return {
    title: String(d.title || "").trim(),
    titles: (Array.isArray(d.titles) ? d.titles : []).map((t) => String(t || "").trim()).filter(Boolean).slice(0, 3),
    narration,
  };
}

/* 설명란 — 요약(기사 부제) · 링크 · 출처, 태그는 기사 키워드 */
function description(id, d) {
  const article = readJson(blogWriter.docFile(id, "article")) || readJson(blogWriter.blogFile(id)) || {};
  const summary = (article.subtitles && article.subtitles.length ? article.subtitles : (article.paragraphs || []).slice(0, 1)).join("\n");
  const lines = [summary];
  if (isColumn(id)) {
    lines.push(nm.gwSnsCredit(require("./column-writer").readSource(id))); // 공실뉴스 링크 안내 없이 출처만 (2026-10-23 사장님)
  } else if (isSim(id)) {
    // 예측 이미지를 실제 모습으로 오해하지 않게 (SNS 와 같은 안내)
    const L = simW().lib(id);
    lines.push(d.detailUrl ? `▶ 매물 자세히 보기 (공실뉴스 공실열람)\n${d.detailUrl}` : `▶ 공실뉴스에서 더 보기\n${HOME}`, L.GW_SNS_SIM_NOTICE || "", d.detailUrl ? "공실뉴스" : simW().creditOf(id));
  } else if (d.listing) {
    // 내 부동산이 먼저 — 링크·홈페이지 소개·문의 정보는 SNS 와 같은 모양 (2026-10-29 사장님, 무료 회원은 홈페이지 언급 없음)
    const tail = require("./ext-sns").gwSnsCompose("facebook", { body: "-" }, { noun: "매물", url: d.detailUrl, listing: d.listing }).text || "";
    lines.push(tail.replace(/^-\n\n/, ""));
  } else {
    lines.push(`▶ 매물 자세히 보기\n${d.detailUrl || HOME}`);
  }
  const tags = (article.keywords || []).map((k) => `#${String(k).replace(/^#+/, "").replace(/\s+/g, "")}`).filter((t) => t.length > 1 && !(isColumn(id) && /공실뉴스/.test(t))).slice(0, 10); // 뉴스칼럼엔 공실뉴스 태그 없이
  return { text: lines.filter(Boolean).join("\n\n"), tags };
}

function forWeb(id, d) {
  if (!d) return null;
  const all = d.narration.join("\n\n");
  return {
    vacancyId: id,
    settings: d.settings,
    title: d.title,
    titles: d.titles || [],
    narration: d.narration,
    seconds: lib(id).gwYtSpeechSeconds(all),
    chars: lib(id).gwYtCharCount(all),
    description: description(id, d),
    version: [d.writtenAt, d.revisedAt, d.editedAt].map((v) => v || "").join("|"),
  };
}

function get(id) {
  return forWeb(id, readJson(ytFile(id)));
}

async function write({ baseUrl, vacancyId: id, videoType, duration, tone, number }, onProgress = () => {}) {
  const settings = { ...options(id).defaults, ...Object.fromEntries(Object.entries({ videoType, duration, tone, number }).filter(([, v]) => v)) };
  const prompt = scriptPrompt(id, settings); // 기사·분석이 없으면 여기서 먼저 알려 준다
  onProgress("이용 횟수를 확인하는 중…");
  await blogWriter.useQuota(baseUrl, "youtube", id);
  let detailUrl = "";
  let listing = null;
  if (isSim(id)) {
    const { result } = simW().resultOf(id);
    if (result.vacancyId) detailUrl = await fetchListing(baseUrl, result.vacancyId, result.saleKind || "").then((l) => l.detailUrl).catch(() => "");
  } else if (!isColumn(id)) {
    const analysis = readAnalysis(id);
    listing = await fetchListing(baseUrl, id, analysis.vacancy.saleKind || "").catch(() => null);
    detailUrl = (listing && listing.detailUrl) || "";
  }
  let chatUrl = "";
  const text = await chatgpt.ask(prompt, { onProgress, isComplete: (t) => lib(id).GWYoutubeJson.hasCompleteObject(t), onChat: (u) => (chatUrl = u) });
  onProgress("받은 대본을 정리하는 중…");
  const d = { ...parse(id, text), settings, detailUrl, listing, chatUrl, writtenAt: new Date().toISOString() };
  fs.mkdirSync(mediaDir(id), { recursive: true });
  fs.writeFileSync(ytFile(id), JSON.stringify(d, null, 2));
  log.info(`[유튜브] ${id} ${settings.duration} 원고 ${d.narration.length}문단`);
  return forWeb(id, d);
}

/* [수정 요청] — 같은 대화에 이어 보낸다. 지금 원고(고친 내용 포함)가 요청에 함께 들어간다 */
async function revise({ vacancyId: id, request }, onProgress = () => {}) {
  const req = String(request || "").trim();
  if (!req) throw new Error("어떻게 고칠지 적어 주세요.");
  const d = readJson(ytFile(id));
  if (!d) throw new Error("먼저 대본을 써 주세요.");
  const full = { title: d.title, text: d.narration.join("\n\n") };
  const ask = isColumn(id)
    ? yt.column.gwBuildYtRevisePrompt(full, req)
    : isSim(id)
      ? simW().lib(id).gwBuildYtRevisePrompt(full, req, simW().resultOf(id).vacancy)
      : yt.gongsil.gwBuildYtRevisePrompt(full, req, (readAnalysis(id) || {}).vacancy);
  const fallbackPrompt = `${scriptPrompt(id, d.settings || DEFAULTS)}\n\n${ask}`;
  let chatUrl = d.chatUrl || "";
  const text = await chatgpt.ask(ask, { onProgress, isComplete: (t) => lib(id).GWYoutubeJson.hasCompleteObject(t), chatUrl, fallbackPrompt, onChat: (u) => (chatUrl = u) });
  onProgress("고친 대본을 정리하는 중…");
  const p = parse(id, text);
  Object.assign(d, { title: p.title || d.title, titles: p.titles.length ? p.titles : d.titles, narration: p.narration, chatUrl, revisedAt: new Date().toISOString() });
  fs.writeFileSync(ytFile(id), JSON.stringify(d, null, 2));
  log.info(`[유튜브 수정] ${id}`);
  return forWeb(id, d);
}

/* 화면에서 고친 제목·원고 저장 */
function save({ vacancyId: id, title, narration }) {
  const d = readJson(ytFile(id));
  if (!d) throw new Error("저장할 대본이 없습니다.");
  if (typeof title === "string") d.title = title.trim();
  if (Array.isArray(narration)) d.narration = toParagraphs(narration);
  d.editedAt = new Date().toISOString();
  fs.writeFileSync(ytFile(id), JSON.stringify(d, null, 2));
  return forWeb(id, d);
}

const safeName = (s) => String(s || "").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);

/* [텍스트로 저장]: 문서\공실마케팅\01 뉴스SNS발행\유튜브\날짜\<작업 이름>\ 에 대본을 저장하고 폴더를 연다 (SNS 폴더와 같은 자리) */
function exportText(id) {
  const d = readJson(ytFile(id));
  if (!d) throw new Error("먼저 대본을 써 주세요.");
  const web = forWeb(id, d);
  // 저장 자리: 문서\공실마케팅\01 뉴스SNS발행\유튜브\날짜\<매물·칼럼·시뮬레이션> (out-folder.js)
  const folder = require("./out-folder").folderFor(id, "유튜브");
  const min = Math.floor(web.seconds / 60);
  const text = [
    `[제목]\n${d.title}`,
    d.titles && d.titles.length ? `[제목 후보]\n${d.titles.map((t, i) => `${i + 1}. ${t}`).join("\n")}` : "",
    `[나레이션 원고] 약 ${min ? `${min}분 ` : ""}${web.seconds % 60}초 · ${web.chars}자\n\n${d.narration.join("\n\n")}`,
    `[설명란]\n${web.description.text}\n\n${web.description.tags.join(" ")}`,
  ].filter(Boolean).join("\n\n―――――――――――\n\n");
  const file = path.join(folder, "유튜브_대본.txt");
  fs.writeFileSync(file, text, "utf8");
  shell.openPath(folder);
  return { folder, file };
}

/* 한 번에 쓰기 (all-writer) — 설정 맞추기 · 프롬프트 · 받은 JSON 저장. 공실뉴스(매물)만 */
function allSettings(id, pick = {}) {
  const o = options(id);
  const ok = (list, v) => (v && list.some((x) => x.id === v) ? v : "");
  const want = { videoType: ok(o.videoTypes, pick.videoType), duration: ok(o.durations, pick.duration), tone: ok(o.tones, pick.tone), number: ok(o.numbers, pick.number) };
  return { ...o.defaults, ...Object.fromEntries(Object.entries(want).filter(([, v]) => v)) };
}
function allPrompt(id, settings, article) {
  if (isColumn(id)) return yt.column.gwBuildYtScriptPrompt({ article, source: require("./column-writer").readSource(id) }, settings);
  const number = yt.column.GW_YT_NUMBER[settings.number] || yt.column.GW_YT_NUMBER.hangul;
  if (isSim(id)) { // 인테리어·리모델링 — 결과표 + 기사 (따로 쓸 때 scriptPrompt 와 같다)
    const { result, vacancy } = simW().resultOf(id);
    return `${simW().lib(id).gwBuildYtScriptPrompt({ vacancy, article, remodel: result }, settings)}\n\n[숫자 표기]\n- ${number.prompt}`;
  }
  const analysis = readAnalysis(id);
  if (!analysis) throw new Error("먼저 [분석·캡처]를 해 주세요.");
  return `${yt.gongsil.gwBuildYtScriptPrompt({ vacancy: analysis.vacancy, article }, settings)}\n\n[숫자 표기]\n- ${number.prompt}`;
}
async function saveAll(baseUrl, id, text, settings) {
  const analysis = readAnalysis(id) || { vacancy: {} };
  let detailUrl = "";
  let listing = null;
  if (isSim(id)) {
    const { result } = simW().resultOf(id);
    if (result.vacancyId) detailUrl = await fetchListing(baseUrl, result.vacancyId, result.saleKind || "").then((l) => l.detailUrl).catch(() => "");
  } else if (!isColumn(id)) {
    listing = await fetchListing(baseUrl, id, analysis.vacancy.saleKind || "").catch(() => null);
    detailUrl = (listing && listing.detailUrl) || "";
  }
  const d = { ...parse(id, text), settings, detailUrl, listing, chatUrl: "", writtenAt: new Date().toISOString() };
  fs.mkdirSync(mediaDir(id), { recursive: true });
  fs.writeFileSync(ytFile(id), JSON.stringify(d, null, 2));
  log.info(`[유튜브] ${id} ${settings.duration} 원고 ${d.narration.length}문단 (한 번에)`);
  return forWeb(id, d);
}

module.exports = { options, get, write, revise, save, exportText, allSettings, allPrompt, saveAll };
