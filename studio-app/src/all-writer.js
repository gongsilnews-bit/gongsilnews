// 한 번에 모두 쓰기 (2026-10-23 사장님 회의) — 공실 하나로 공실뉴스 기사 · 네이버 블로그 · SNS(인스타·스레드·페이스북)를
// AI 에 한 번만 물어 함께 받는다. 각 글의 프롬프트(스타일·분량·규칙)는 따로 쓸 때와 같은 것을 그대로 묶어 보낸다.
//  - 블로그·SNS 는 원래 기사를 [참조 기사]로 쓴다 → 한 번에 쓸 때는 "같은 답의 [작업 1] 기사"를 참조하라고 한다
//  - 받은 답은 {"article":…, "blog":…, "sns":…} 하나 — 나눠서 따로 쓴 것과 같은 자리에 저장한다 (탭마다 수정 요청 그대로)
//  - 이용 횟수는 따로 쓸 때와 같게: 블로그 1회 · SNS 1회 (기사는 등록할 때)
//  - 지금은 공실뉴스(매물)만. 뉴스칼럼·인테리어·리모델링은 다음 단계
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const log = require("electron-log/main");
const ext = require("./ext");
const blogPrompt = ext.lazyModule(() => ext.run(["gongsil/blog-prompt.js"]));
const articleJson = ext.lazyModule(() => ext.run(["gongsil/article-json.js"]));
const extPrompt = require("./ext-prompt");
const sns = require("./ext-sns");
const nm = require("./ext-newsmaker");
const ai = require("./ai");
const blogWriter = require("./blog-writer");
const { fetchListing } = require("./naver-write");

const fence = (o) => "```json\n" + JSON.stringify(o) + "\n```";
/** 답에서 가장 바깥 { } 를 꺼낸다 */
function outer(text) {
  const t = String(text || "");
  const a = t.indexOf("{"), z = t.lastIndexOf("}");
  if (a < 0 || z <= a) return null;
  try { return JSON.parse(t.slice(a, z + 1)); } catch { return null; }
}

async function writeAll({ baseUrl, vacancyId, article = {}, blog = {}, sns: snsOpt = {}, youtube = {} }, onProgress = () => {}) {
  if (blogWriter.isSim(vacancyId)) throw new Error("한 번에 쓰기는 공실뉴스·뉴스칼럼만 돼요. 인테리어·리모델링은 탭마다 써 주세요.");
  const col = blogWriter.isColumn(vacancyId); // 뉴스칼럼 — 뉴스메이커 프롬프트, 소재(원문)로 (2026-10-23 사장님)
  const source = col ? require("./column-writer").readSource(vacancyId) : null;
  const analysis = col ? null : blogWriter.readJson(path.join(blogWriter.mediaDir(vacancyId), "analysis.json"));
  if (!col && !analysis) throw new Error("먼저 [분석·캡처]를 해 주세요.");
  const v = col ? null : analysis.vacancy;
  const want = { article: article.on !== false, blog: blog.on !== false, sns: snsOpt.on !== false, youtube: youtube.on === true };
  if (!want.article && !want.blog && !want.sns && !want.youtube) throw new Error("쓸 글을 하나 이상 골라 주세요.");
  if (col && !want.article && !blogWriter.referenceArticle(vacancyId)) throw new Error("뉴스칼럼은 기사를 바탕으로 블로그·SNS·대본을 써요. [공실뉴스 기사]도 ☑ 해 주세요.");

  // 이용 횟수 — 따로 쓸 때와 같게
  onProgress("이용 횟수를 확인하는 중…");
  if (want.blog) await blogWriter.useQuota(baseUrl, "blog", vacancyId);
  if (want.sns) await require("./sns-writer").useQuota(baseUrl, vacancyId);
  if (want.youtube) await blogWriter.useQuota(baseUrl, "youtube", vacancyId);

  // 참조 기사 — 이미 쓴 기사가 있으면 그것, 이번에 기사도 쓰면 [작업 1] 기사, 둘 다 아니면 없음
  const REF = want.article
    ? { title: "(이 답의 [작업 1] 공실뉴스 기사)", subtitles: [], body: `이 요청의 [작업 1]에서 쓴 공실뉴스 기사를 참조 기사로 삼으십시오. 사실은 ${col ? "원문 소재" : "[확인된 매물 정보]"}에 있는 것만 쓰십시오.` }
    : blogWriter.referenceArticle(vacancyId) || { title: "(참조 기사 없음)", subtitles: [], body: "이번에는 참조 기사가 없습니다. 아래 [확인된 매물 정보]만 사용해 작성하십시오." };
  const parts = [];
  // 뉴스칼럼 — 기사 종류·블로그 문체가 공실과 달라 없는 값이면 처음 것으로
  const artKind = col ? (nm.GW_KIND[article.kind] ? article.kind : Object.keys(nm.GW_KIND)[0]) : article.kind || "news";
  const artLen = col ? (nm.GW_LENGTH[article.length] ? article.length : "normal") : article.length || "normal";
  const blogSt = col ? (nm.GW_BLOG_STYLE[blog.style] ? blog.style : "info") : blog.style || "listing";
  if (want.article) parts.push(["article", col ? "공실뉴스 기사 (뉴스칼럼)" : "공실뉴스 기사", col ? nm.gwBuildPrompt(source, { kind: artKind, length: artLen }) : extPrompt.gwBuildPrompt(v, { kind: artKind, length: artLen })]);
  if (want.blog) parts.push(["blog", "네이버 블로그 글", col ? nm.gwBuildBlogPrompt({ article: REF, source }, { style: blogSt, length: blog.length || "normal" }) : blogPrompt.gwBuildBlogPrompt({ vacancy: v, article: REF }, { style: blogSt, length: blog.length || "normal" })]);
  if (want.sns) parts.push(["sns", "SNS 글 (인스타그램 · 스레드 · 페이스북)", (col ? nm.gwBuildSnsPrompt({ article: REF, source }) : sns.gwBuildSnsPrompt({ vacancy: v, article: require("./sns-writer").NO_REF }) /* 공실 SNS 는 분석한 공실 정보만으로 */) + require("./sns-writer").toneLine(snsOpt.tone)]);
  const ytW = require("./youtube-writer");
  const ytSet = want.youtube ? ytW.allSettings(vacancyId, youtube) : null;
  if (want.youtube) parts.push(["youtube", "유튜브 대본", ytW.allPrompt(vacancyId, ytSet, REF)]);
  const keys = parts.map((p) => p[0]);
  const prompt = [
    `여러 글을 한 번에 씁니다. 아래 [작업 ${parts.map((_, i) => i + 1).join("·")}]을 모두 하십시오.`,
    "각 작업의 지시·규칙·문체·분량은 그 작업에 적힌 그대로 지키고, 각 작업이 요구하는 출력 JSON 을 만드십시오.",
    `그다음 그 JSON 들을 아래처럼 하나로 묶어, 설명 없이 JSON 하나만 답하십시오 (각 작업의 "JSON 하나만 답하라"는 지시는 이 묶음 안의 값으로 지킵니다).`,
    "{" + keys.map((k) => `"${k}": { …[${k}] 작업의 JSON… }`).join(", ") + "}",
    "",
    ...parts.map((p, i) => `===== [작업 ${i + 1}] ${p[1]} — 결과는 "${p[0]}" 키에 =====\n${p[2]}`),
  ].join("\n");
  const done = (t) => { const o = outer(t); return Boolean(o && keys.every((k) => o[k] && typeof o[k] === "object")); };

  const text = await ai.ask(prompt, { onProgress, isComplete: done, busyLabel: `${keys.length}가지 글을 한 번에 쓰고 있습니다`, feature: "한 번에 모두 쓰기", wait: keys.length >= 3 ? "1~3분" : "1~2분" });
  onProgress("받은 글을 나누는 중…");
  const o = outer(text);
  if (!o) throw new Error("AI 답을 읽지 못했어요. 다시 해 주세요.");
  const out = {};
  const miss = [];
  const AJ = col ? nm.GWArticleJson : articleJson;
  if (want.article) {
    const pa = AJ.parse(fence(o.article));
    if (pa.ok) out.article = blogWriter.saveWritten(vacancyId, "article", pa, { style: artKind, length: artLen, chatUrl: "", ...(col ? nm.gwNormalizeSection(pa.article.section1, pa.article.section2) : {}) });
    else miss.push("기사");
  }
  if (want.blog) {
    const pb = AJ.parse(fence(o.blog));
    if (pb.ok) out.blog = blogWriter.saveWritten(vacancyId, "blog", pb, { style: blogSt, length: blog.length || "normal", chatUrl: "" });
    else miss.push("블로그");
  }
  if (want.sns && col) {
    const ps = nm.gwSnsParse(fence(o.sns));
    if (ps.ok) out.sns = require("./sns-writer").saveAll(vacancyId, { posts: ps.posts, column: true });
    else miss.push("SNS");
  } else if (want.sns) {
    const ps = sns.gwSnsParse(fence(o.sns));
    if (ps.ok) {
      const saleKind = v.saleKind || "";
      onProgress("매물 정보 출처(중개사무소)를 확인하는 중…");
      const listing = await fetchListing(baseUrl, vacancyId, saleKind).catch(() => null);
      out.sns = require("./sns-writer").saveAll(vacancyId, { noun: saleKind ? "물건" : "매물", listing, posts: ps.posts });
    } else miss.push("SNS");
  }
  if (want.youtube) {
    try { out.youtube = await ytW.saveAll(baseUrl, vacancyId, fence(o.youtube), ytSet); } catch { miss.push("유튜브 대본"); }
  }
  // 뉴스칼럼 기사 — 다 쓰면 AI 대표 이미지 (켠 때만, 따로 쓸 때와 같다)
  if (col && out.article && article.autoCover !== false) {
    onProgress("기사에 맞는 AI 대표 이미지를 만드는 중…");
    out.article = await require("./column-writer").addCover(baseUrl, vacancyId, out.article, onProgress);
  }
  log.info(`[한 번에 쓰기] ${vacancyId} ${keys.join(",")}${miss.length ? " · 못 읽음 " + miss.join(",") : ""}`);
  return { ...out, miss };
}

module.exports = { writeAll };
