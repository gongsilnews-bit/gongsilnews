// SNS 쓰기 (SNS뉴스발행 — 인스타그램·스레드·페이스북)
// 크롬 확장 sns.js 와 같은 방법:
//  - ChatGPT 에 한 번 요청해 세 채널 글을 함께 받는다 (이용 횟수도 "SNS" 1회, 공실 하나 기준).
//  - 블로그를 먼저 썼으면 그 글을 [참조 기사]로 쓴다.
//  - 링크·출처(표시·광고 필수 정보)·해시태그는 코드가 붙인다 (gwSnsCompose).
//  - 사진은 채널마다 순서·장수를 다시 고르고(gwSnsPickMedia), 내보낼 때 채널 비율로 자른다.
// 1차는 [글 복사]·[사진·글 폴더로 저장]·[채널 열기]. 자동 채우기는 다음 단계.
// 뉴스칼럼(번호 "col-…")은 확장 뉴스메이커의 SNS 프롬프트를 쓰고, 중개사무소 출처 대신 소재 출처 줄을 붙인다
// ("출처: ○○ 보도 내용 재구성 · 공실뉴스").
const { app, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { execFile } = require("child_process");
const log = require("electron-log/main");
const sns = require("./ext-sns");
const articleJson = require("./ext/article-json");
const chatgpt = require("./ai/chatgpt");
const { thumbOf } = require("./media-util");
const { ffmpegPath } = require("./paths");
const blogWriter = require("./blog-writer");
const { fetchListing } = require("./naver-write");
const nm = require("./ext-newsmaker");

const CHANNELS = ["instagram", "threads", "facebook"]; // 화면 탭 순서 (회의 결정: 인스타 → 스레드 → 페이스북)
const FIT_KINDS = new Set(["proof", "map", "roadview"]); // 화면 캡처는 자르지 않고 흰 여백으로 맞춘다
const { mediaDir, readJson } = blogWriter;
const snsFile = (vacancyId) => path.join(mediaDir(vacancyId), "sns.json");
const newId = () => crypto.randomBytes(6).toString("hex");

function channelInfo() {
  return CHANNELS.map((id) => {
    const c = sns.GW_SNS_CHANNELS[id];
    return { id, label: c.label, homeUrl: c.homeUrl, ratioText: c.ratioText, maxChars: c.maxChars, maxMedia: c.maxMedia, maxTags: c.maxTags };
  });
}

/* 사진 모음: 블로그에서 다듬은 사진(대표·추가·AI 포함)이 있으면 그것, 없으면 기사 사진, 없으면 분석 사진 */
function photoPool(vacancyId) {
  const pick = (d) => (d && Array.isArray(d.media) && d.media.length ? d.media.map((m) => ({ id: m.id, kind: m.kind, file: m.file, caption: m.caption, isCover: Boolean(m.isCover) })) : null);
  const fromDocs = pick(readJson(blogWriter.blogFile(vacancyId))) || (blogWriter.isColumn(vacancyId) ? pick(readJson(blogWriter.docFile(vacancyId, "article"))) : null);
  if (fromDocs) return fromDocs;
  const analysis = readJson(path.join(mediaDir(vacancyId), "analysis.json"));
  return ((analysis && analysis.media) || []).map((m, i) => ({ id: newId(), kind: m.kind, file: m.file, caption: m.caption, isCover: i === 0 }));
}

function forWeb(data) {
  if (!data) return null;
  const column = data.kind === "column";
  const ctx = column ? { credit: data.credit } : { noun: data.noun || "매물", url: (data.listing && data.listing.detailUrl) || "", listing: data.listing || null };
  const compose = column ? nm.gwSnsCompose : sns.gwSnsCompose;
  const aiNote = column ? nm.gwSnsAiLabelNote : sns.gwSnsAiLabelNote;
  const byId = new Map((data.pool || []).map((m) => [m.id, m]));
  const thumbs = new Map((data.pool || []).map((m) => [m.id, thumbOf(m.file, 360)]));
  const channels = {};
  for (const ch of CHANNELS) {
    const post = data.posts[ch] || null;
    const media = (data.media[ch] || []).map((id) => byId.get(id)).filter(Boolean);
    channels[ch] = {
      post,
      composed: post ? compose(ch, post, ctx) : { posts: [], text: "" },
      media: media.map((m) => ({ id: m.id, kind: m.kind, caption: m.caption, ai: m.kind === "ai", thumb: thumbs.get(m.id) })),
      aiNote: aiNote(ch, media.map((m) => ({ ai: m.kind === "ai" }))),
    };
  }
  return {
    vacancyId: data.vacancyId,
    channels,
    pool: (data.pool || []).map((m) => ({ id: m.id, kind: m.kind, caption: m.caption, ai: m.kind === "ai", thumb: thumbs.get(m.id) })),
    writtenAt: data.writtenAt,
  };
}

function get(vacancyId) {
  return forWeb(readJson(snsFile(vacancyId)));
}

async function useQuota(baseUrl, vacancyId) {
  const { session } = require("electron");
  const res = await session.defaultSession.fetch(`${baseUrl}/api/studio/usage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "sns", vacancyId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data || !data.success) throw new Error((data && data.error) || "이용 횟수를 확인하지 못했습니다.");
}

/* SNS 프롬프트 — [참조 기사]: 공실뉴스 기사를 썼으면 그 기사, 없으면 블로그, 둘 다 없으면 "없음" */
function snsPrompt(vacancyId) {
  const blog = readJson(blogWriter.blogFile(vacancyId));
  const article =
    blogWriter.referenceArticle(vacancyId) ||
    (blog
      ? { title: blog.title, subtitles: [], body: blog.paragraphs.join("\n\n") }
      : { title: "(참조 기사 없음)", subtitles: [], body: "이번에는 참조 기사가 없습니다. 아래 확인된 매물 정보만 사용해 작성하십시오." });
  if (blogWriter.isColumn(vacancyId)) return nm.gwBuildSnsPrompt({ article, source: require("./column-writer").readSource(vacancyId) });
  const analysis = readJson(path.join(mediaDir(vacancyId), "analysis.json"));
  if (!analysis) throw new Error("먼저 [분석·캡처]를 해 주세요.");
  return sns.gwBuildSnsPrompt({ vacancy: analysis.vacancy, article });
}

/* [수정 요청]: 한 채널 글만 같은 대화에 이어 보내 고친다 (확장과 같다). 사진은 그대로 */
async function revise({ vacancyId, channel, request }, onProgress = () => {}) {
  const req = String(request || "").trim();
  if (!req) throw new Error("어떻게 고칠지 적어 주세요.");
  const data = readJson(snsFile(vacancyId));
  if (!data) throw new Error("먼저 SNS 글을 써 주세요.");
  if (!CHANNELS.includes(channel)) throw new Error("알 수 없는 채널입니다.");
  const lib = data.kind === "column" ? nm : sns;
  const ask = lib.gwBuildSnsRevisePrompt(channel, req);
  const now = "```json\n" + JSON.stringify(data.posts, null, 2) + "\n```";
  const fallbackPrompt = `${snsPrompt(vacancyId)}\n\n[앞서 작성한 SNS 글 — 고친 내용 포함]\n${now}\n\n${ask}`;
  let chatUrl = data.chatUrl || "";
  const text = await chatgpt.ask(ask, { onProgress, isComplete: (t) => articleJson.hasCompleteObject(t), chatUrl, fallbackPrompt, onChat: (u) => (chatUrl = u) });
  onProgress("고친 글을 정리하는 중…");
  const parsed = lib.gwSnsParse(text);
  if (!parsed.ok || !parsed.posts[channel]) throw new Error((parsed && parsed.reason) || "고친 글을 읽지 못했습니다.");
  data.posts[channel] = parsed.posts[channel];
  data.chatUrl = chatUrl;
  data.revisedAt = new Date().toISOString();
  fs.writeFileSync(snsFile(vacancyId), JSON.stringify(data, null, 2));
  log.info(`[SNS 수정] ${vacancyId} ${channel}`);
  return forWeb(data).channels[channel];
}

async function write({ baseUrl, vacancyId }, onProgress = () => {}) {
  const column = blogWriter.isColumn(vacancyId);
  const analysis = column ? null : readJson(path.join(mediaDir(vacancyId), "analysis.json"));
  if (!column && !analysis) throw new Error("먼저 [분석·캡처]를 해 주세요.");
  const source = column ? require("./column-writer").readSource(vacancyId) : null;
  if (column && !blogWriter.referenceArticle(vacancyId)) throw new Error("먼저 [공실뉴스 기사] 탭에서 기사를 써 주세요. SNS 글은 그 기사를 바탕으로 씁니다.");
  onProgress("이용 횟수를 확인하는 중…");
  await useQuota(baseUrl, vacancyId);

  let listing = null;
  const saleKind = column ? "" : analysis.vacancy.saleKind || "";
  if (!column) {
    onProgress("매물 정보 출처(중개사무소)를 확인하는 중…");
    listing = await fetchListing(baseUrl, vacancyId, saleKind);
  }

  const prompt = snsPrompt(vacancyId);
  let chatUrl = "";
  const text = await chatgpt.ask(prompt, { onProgress, isComplete: (t) => articleJson.hasCompleteObject(t), onChat: (u) => (chatUrl = u) });

  onProgress("받은 글을 정리하는 중…");
  const parsed = (column ? nm.gwSnsParse : sns.gwSnsParse)(text);
  if (!parsed.ok) throw new Error(parsed.reason || "SNS 글을 읽지 못했습니다.");

  // 다시 쓸 때는 고른 사진은 그대로 두고 글만 바꾼다
  const prev = readJson(snsFile(vacancyId));
  const pool = photoPool(vacancyId);
  const media = {};
  for (const ch of CHANNELS) {
    if (prev && prev.media && Array.isArray(prev.media[ch]) && prev.media[ch].every((id) => pool.some((m) => m.id === id))) {
      media[ch] = prev.media[ch];
    } else {
      const picked = sns.gwSnsPickMedia(ch, pool.map((m) => ({ ...m, url: m.file })));
      media[ch] = picked.map((p) => pool.find((m) => m.file === p.url)).filter(Boolean).map((m) => m.id);
    }
  }
  const data = column
    ? { vacancyId, kind: "column", credit: nm.gwSnsCredit(source), posts: parsed.posts, pool, media, chatUrl, writtenAt: new Date().toISOString() }
    : { vacancyId, noun: saleKind ? "물건" : "매물", listing, posts: parsed.posts, pool, media, chatUrl, writtenAt: new Date().toISOString() };
  fs.writeFileSync(snsFile(vacancyId), JSON.stringify(data, null, 2));
  log.info(`[SNS] ${vacancyId} ${Object.keys(parsed.posts).join(",")}`);
  return forWeb(data);
}

/* 미리보기에서 고친 글·사진 순서 저장 */
function save({ vacancyId, channel, post, mediaIds }) {
  const data = readJson(snsFile(vacancyId));
  if (!data) throw new Error("저장할 SNS 글이 없습니다.");
  if (!CHANNELS.includes(channel)) throw new Error("알 수 없는 채널입니다.");
  if (post) data.posts[channel] = post;
  if (Array.isArray(mediaIds)) {
    const max = sns.GW_SNS_CHANNELS[channel].maxMedia;
    data.media[channel] = mediaIds.filter((id) => data.pool.some((m) => m.id === id)).slice(0, max);
  }
  fs.writeFileSync(snsFile(vacancyId), JSON.stringify(data, null, 2));
  return forWeb(data).channels[channel];
}

/* 채널 비율로 자르기 (앱에 넣은 FFmpeg) — 사진은 가운데 맞춰 자르고, 화면 캡처는 흰 여백으로 맞춘다 */
function cropTo(src, dest, channel, kind) {
  const c = sns.GW_SNS_CHANNELS[channel];
  const [w, h] = c.size;
  let vf;
  if (!c.ratio) vf = `scale=w=${w}:h=${h}:force_original_aspect_ratio=decrease`;
  else if (FIT_KINDS.has(kind)) vf = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:white`;
  else vf = `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`;
  const ff = ffmpegPath();
  return new Promise((resolve) => {
    if (!ff) {
      fs.copyFileSync(src, dest);
      return resolve(true);
    }
    execFile(ff, ["-y", "-loglevel", "error", "-i", src, "-vf", vf, "-q:v", "2", dest], (err) => resolve(!err && fs.existsSync(dest)));
  });
}

const safeName = (s) => String(s || "").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);

/* [사진·글 저장]: 문서\공실뉴스 스튜디오\<공실>\<채널>\ 에 글(txt)과 채널 비율 사진을 만들고 폴더를 연다 */
async function exportChannel({ vacancyId, channel }) {
  const data = readJson(snsFile(vacancyId));
  if (!data) throw new Error("먼저 SNS 글을 써 주세요.");
  const analysis = readJson(path.join(mediaDir(vacancyId), "analysis.json")) || { vacancy: {} };
  const c = sns.GW_SNS_CHANNELS[channel];
  const web = forWeb(data).channels[channel];
  // 폴더 이름: 공실이면 매물 이름, 칼럼이면 기사 제목
  const article = blogWriter.isColumn(vacancyId) ? readJson(blogWriter.docFile(vacancyId, "article")) : null;
  const name = article ? `칼럼_${safeName(article.title)}` : safeName(analysis.vacancy.title) || "공실";
  const folder = path.join(app.getPath("documents"), "공실뉴스 스튜디오", `${name}_${String(vacancyId).replace(/^col-/, "").slice(0, 8)}`, c.label);
  fs.rmSync(folder, { recursive: true, force: true });
  fs.mkdirSync(folder, { recursive: true });

  const textForFile = channel === "threads"
    ? web.composed.posts.map((t, i) => `[${i === 0 ? "첫 글" : `이어 쓰기 ${i}`}]\n${t}`).join("\n\n―――――――――――\n\n")
    : web.composed.text;
  fs.writeFileSync(path.join(folder, `${c.label}_글.txt`), textForFile, "utf8");

  const byId = new Map(data.pool.map((m) => [m.id, m]));
  const list = (data.media[channel] || []).map((id) => byId.get(id)).filter(Boolean).slice(0, c.maxMedia);
  let saved = 0;
  for (let i = 0; i < list.length; i++) {
    const no = String(i + 1).padStart(2, "0");
    const ok = await cropTo(list[i].file, path.join(folder, `${no}${i === 0 ? "_대표" : ""}${list[i].kind === "ai" ? "_AI" : ""}.jpg`), channel, list[i].kind);
    if (ok) saved++;
  }
  shell.openPath(folder);
  return { folder, saved, total: list.length };
}

module.exports = { channelInfo, get, write, revise, save, exportChannel };
