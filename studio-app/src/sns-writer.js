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
const ext = require("./ext");
const articleJson = ext.lazyModule(() => ext.run(["gongsil/article-json.js"]));
const chatgpt = require("./ai"); // 고른 글쓰기 AI (ChatGPT · Gemini) — 그림은 ChatGPT
const { thumbOf } = require("./media-util");
const { ffmpegPath } = require("./paths");
const blogWriter = require("./blog-writer");
const { fetchListing } = require("./naver-write");
const nm = require("./ext-newsmaker");
// 인테리어·리모델링(번호 int-·rem-): 확장 interior10·remodeling10 의 SNS 프롬프트 (글 끝 "AI 예측 이미지" 안내 포함)
const simW = () => require("./sim-writer");

const CHANNELS = ["instagram", "threads", "facebook"]; // 화면 탭 순서 (회의 결정: 인스타 → 스레드 → 페이스북)
const FIT_KINDS = new Set(["proof", "map", "roadview", "capture"]); // 화면 캡처는 자르지 않고 흰 여백으로 맞춘다
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
  const fromDocs = pick(readJson(blogWriter.blogFile(vacancyId))) || (blogWriter.isColumn(vacancyId) || blogWriter.isSim(vacancyId) ? pick(readJson(blogWriter.docFile(vacancyId, "article"))) : null);
  if (fromDocs) return fromDocs;
  if (blogWriter.isSim(vacancyId)) return simW().resultMedia(vacancyId);
  const analysis = readJson(path.join(mediaDir(vacancyId), "analysis.json"));
  return ((analysis && analysis.media) || []).map((m, i) => ({ id: newId(), kind: m.kind, file: m.file, caption: m.caption, isCover: i === 0 }));
}

function forWeb(data) {
  if (!data) return null;
  const column = data.kind === "column";
  const simL = data.kind === "sim" ? simW().lib(data.vacancyId) : null;
  const ctx = column ? { credit: data.credit } : simL ? data.ctx : { noun: data.noun || "매물", url: (data.listing && data.listing.detailUrl) || "", listing: data.listing || null };
  const compose = column ? nm.gwSnsCompose : simL ? simL.gwSnsCompose : sns.gwSnsCompose;
  const aiNote = column ? nm.gwSnsAiLabelNote : simL ? simL.gwSnsAiLabelNote : sns.gwSnsAiLabelNote;
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

/* 분석에서 새로 넣은 사진(AI 사진 등)을 이미 쓴 SNS 글에도 — 채널마다 끝에 붙인다 (최대 장수까지), 분석에서 뺀 사진은 뺀다 (2026-10-28 사장님)
 * SNS 글을 쓴 뒤 새로 생긴 사진만 · 한 번 넣은 것은 seenFiles 에 적어 두어 일부러 뺀 것을 다시 넣지 않는다 */
function syncNewMedia(vacancyId, data) {
  if (!data || data.kind === "sim" || blogWriter.isSim(vacancyId)) return data;
  try { blogWriter.syncAnalysisMedia(vacancyId); } catch {}
  const an = blogWriter.mediaSourceOf(vacancyId) || {}; // 칼럼은 기사 화면 (2026-10-28)
  const gone = new Set((an.hidden || []).map((m) => m.file));
  // 사진 모음(pool)에 새 사진을 더하고, 채널마다 "그 채널에 한 번도 들어간 적 없는" 사진을 끝에 붙인다
  let pool = (data.pool || []).filter((m) => !gone.has(m.file));
  const inPool = new Set(pool.map((m) => m.file));
  pool = pool.concat(photoPool(vacancyId).filter((m) => !inPool.has(m.file) && !gone.has(m.file)).map((m) => ({ ...m, isCover: false })));
  const byId = new Map(pool.map((m) => [m.id, m]));
  const used = new Set();
  for (const ch of CHANNELS) for (const id of (data.media && data.media[ch]) || []) { const m = byId.get(id); if (m) used.add(m.file); }
  const seen = blogWriter.seenOf(data, an, [...used]);
  const fresh = pool.filter((m) => !used.has(m.file) && !seen.has(m.file));
  const changed = fresh.length || pool.length !== (data.pool || []).length || !Array.isArray(data.seenFiles);
  if (!changed) return data;
  const max = Object.fromEntries(channelInfo().map((c) => [c.id, c.maxMedia || 10]));
  const media = {};
  for (const ch of CHANNELS) {
    const cur = ((data.media && data.media[ch]) || []).filter((id) => byId.has(id));
    media[ch] = cur.concat(fresh.map((m) => m.id)).slice(0, max[ch]);
  }
  const next = { ...data, pool, media, seenFiles: [...new Set([...seen, ...used, ...fresh.map((m) => m.file)])] };
  fs.writeFileSync(snsFile(vacancyId), JSON.stringify(next, null, 2));
  log.info(`[SNS 사진 맞춤] ${vacancyId} +${fresh.length}`);
  return next;
}

function get(vacancyId) {
  const data = readJson(snsFile(vacancyId));
  try { return forWeb(syncNewMedia(vacancyId, data)); } catch { return forWeb(data); }
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
/* SNS 문체 (2026-10-23 사장님 회의) — 세 채널에 같이 쓴다. 문체만 바꾸고 사실은 그대로 */
const TONES = {
  polite: "공손체 — 존댓말(~습니다·~해요)로 차분하고 믿음직하게 안내하십시오.",
  casual: "반말체 — 친구에게 말하듯 편한 반말(~했어·~야·~지)로 쓰십시오. 무례하거나 비꼬는 말은 쓰지 마십시오.",
  hook: "후킹체 — 첫 줄에서 궁금증을 일으키는 한 문장(숫자·질문·반전)으로 시작하고, 문장은 짧게 끊어 끝까지 읽게 쓰십시오. 과장·낚시성 거짓은 쓰지 마십시오.",
  expert: "전문가체 — 부동산 전문가가 짚어 주듯 입지·교통·가격·활용도를 근거와 함께 분석하는 말투로 쓰십시오. 수익률·시세는 [확인된 매물 정보]에 있는 숫자만 쓰십시오.",
  story: "스토리체 — 현장을 다녀온 사람이 들려주듯 장면과 이야기로 풀어 쓰십시오. 없는 일화나 사람을 지어내지 마십시오.",
  short: "요약체 — 핵심만 3~5줄로 아주 짧게, 줄마다 한 가지 정보만 쓰십시오.",
};
/* tone — 문자열(세 채널 같이) 또는 { instagram, threads, facebook } (채널마다 따로, 2026-10-23 사장님). 모두 공손체면 덧붙이지 않는다 */
const CH_NAME = { instagram: "인스타그램", threads: "스레드", facebook: "페이스북" };
function toneLine(tone) {
  const per = tone && typeof tone === "object" ? tone : { instagram: tone, threads: tone, facebook: tone };
  const pick = Object.fromEntries(CHANNELS.map((ch) => [ch, TONES[per[ch]] ? per[ch] : "polite"]));
  if (CHANNELS.every((ch) => pick[ch] === "polite")) return "";
  return `\n\n[문체 지정 — 위 지시보다 우선 · 채널마다 따로]\n${CHANNELS.map((ch) => `- ${CH_NAME[ch]} 글: ${TONES[pick[ch]]}`).join("\n")}\n문체만 바꾸고, 사실은 [확인된 매물 정보]·참조 기사에 있는 것만 쓰십시오. 출력 JSON 형식은 그대로 지키십시오.`;
}

function snsPrompt(vacancyId, tone = "") {
  return snsPromptBase(vacancyId) + toneLine(tone);
}
const NO_REF = { title: "(참조 기사 없음)", subtitles: [], body: "참조 기사 없이, 아래 [확인된 매물 정보](처음 분석·캡처한 공실 정보)만 사용해 작성하십시오." };
function snsPromptBase(vacancyId) {
  const blog = readJson(blogWriter.blogFile(vacancyId));
  const article =
    blogWriter.referenceArticle(vacancyId) ||
    (blog
      ? { title: blog.title, subtitles: [], body: blog.paragraphs.join("\n\n") }
      : { title: "(참조 기사 없음)", subtitles: [], body: "이번에는 참조 기사가 없습니다. 아래 확인된 매물 정보만 사용해 작성하십시오." });
  if (blogWriter.isColumn(vacancyId)) return nm.gwBuildSnsPrompt({ article, source: require("./column-writer").readSource(vacancyId) });
  if (blogWriter.isSim(vacancyId)) return simW().lib(vacancyId).gwBuildSnsPrompt({ vacancy: simW().resultOf(vacancyId).vacancy, article });
  // 공실뉴스(매물) SNS 는 처음 분석·캡처한 공실 정보만으로 쓴다 — 블로그·기사를 바탕으로 하지 않는다 (2026-10-23 사장님)
  const analysis = readJson(path.join(mediaDir(vacancyId), "analysis.json"));
  if (!analysis) throw new Error("먼저 [분석·캡처]를 해 주세요.");
  return sns.gwBuildSnsPrompt({ vacancy: analysis.vacancy, article: NO_REF });
}

/* [수정 요청]: 한 채널 글만 같은 대화에 이어 보내 고친다 (확장과 같다). 사진은 그대로 */
async function revise({ vacancyId, channel, request }, onProgress = () => {}) {
  const req = String(request || "").trim();
  if (!req) throw new Error("어떻게 고칠지 적어 주세요.");
  const data = readJson(snsFile(vacancyId));
  if (!data) throw new Error("먼저 SNS 글을 써 주세요.");
  if (!CHANNELS.includes(channel)) throw new Error("알 수 없는 채널입니다.");
  const lib = data.kind === "column" ? nm : data.kind === "sim" ? simW().lib(vacancyId) : sns;
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

async function write({ baseUrl, vacancyId, tone = "" }, onProgress = () => {}) {
  if (blogWriter.isSim(vacancyId)) return writeSim({ baseUrl, vacancyId, tone }, onProgress);
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

  const prompt = snsPrompt(vacancyId, tone);
  let chatUrl = "";
  const text = await chatgpt.ask(prompt, { onProgress, isComplete: (t) => articleJson.hasCompleteObject(t), onChat: (u) => (chatUrl = u) });

  onProgress("받은 글을 정리하는 중…");
  const parsed = (column ? nm.gwSnsParse : sns.gwSnsParse)(text);
  if (!parsed.ok) throw new Error(parsed.reason || "SNS 글을 읽지 못했습니다.");

  const { pool, media } = pickMedia(vacancyId);
  const data = column
    ? { vacancyId, kind: "column", credit: nm.gwSnsCredit(source), posts: parsed.posts, pool, media, chatUrl, writtenAt: new Date().toISOString() }
    : { vacancyId, noun: saleKind ? "물건" : "매물", listing, posts: parsed.posts, pool, media, chatUrl, writtenAt: new Date().toISOString() };
  fs.writeFileSync(snsFile(vacancyId), JSON.stringify(data, null, 2));
  log.info(`[SNS] ${vacancyId} ${Object.keys(parsed.posts).join(",")}`);
  return forWeb(data);
}

/* 한 번에 쓰기 (all-writer) — 인테리어·리모델링 SNS 저장 (출처·글 끝은 따로 쓸 때 writeSim 과 같게) */
async function saveSimPosts(baseUrl, vacancyId, posts) {
  const S = simW();
  const L = S.lib(vacancyId);
  const { result, vacancy } = S.resultOf(vacancyId);
  let listing = null;
  if (result.vacancyId) listing = await fetchListing(baseUrl, result.vacancyId, result.saleKind || "").catch(() => null);
  const { pool, media } = pickMedia(vacancyId);
  const ctx = { noun: L.gwSnsNoun(vacancy), url: listing ? listing.detailUrl : "https://www.gongsilnews.com", listing, noVacancy: !result.vacancyId, credit: S.creditOf(vacancyId) };
  const data = { vacancyId, kind: "sim", ctx, posts, pool, media, chatUrl: "", writtenAt: new Date().toISOString() };
  fs.writeFileSync(snsFile(vacancyId), JSON.stringify(data, null, 2));
  log.info(`[SNS] 시뮬레이션 ${vacancyId} (한 번에)`);
  return forWeb(data);
}

/* 채널마다 사진 고르기 — 다시 쓸 때는 고른 사진을 그대로 둔다 (실제 사진 먼저, AI·예측 이미지는 뒤) */
function pickMedia(vacancyId) {
  const prev = readJson(snsFile(vacancyId));
  const pool = photoPool(vacancyId);
  const media = {};
  for (const ch of CHANNELS) {
    if (prev && prev.media && Array.isArray(prev.media[ch]) && prev.media[ch].length && prev.media[ch].every((id) => pool.some((m) => m.id === id))) {
      media[ch] = prev.media[ch];
    } else {
      const picked = sns.gwSnsPickMedia(ch, pool.map((m) => ({ ...m, url: m.file })));
      media[ch] = picked.map((p) => pool.find((m) => m.file === p.url)).filter(Boolean).map((m) => m.id);
    }
  }
  return { pool, media };
}

/* 인테리어·리모델링 SNS — 결과표로 쓴 기사가 있어야 한다. 매물과 연결된 시뮬레이션만 매물 출처(표시·광고)를 붙인다 */
async function writeSim({ baseUrl, vacancyId, tone = "" }, onProgress) {
  const S = simW();
  const L = S.lib(vacancyId);
  const { result, vacancy } = S.resultOf(vacancyId);
  if (!blogWriter.referenceArticle(vacancyId)) throw new Error("먼저 [공실뉴스 기사] 탭에서 기사를 써 주세요. SNS 글은 그 기사를 바탕으로 씁니다.");
  onProgress("이용 권한을 확인하는 중…");
  await useQuota(baseUrl, vacancyId);
  let listing = null;
  if (result.vacancyId) {
    onProgress("매물 정보 출처(중개사무소)를 확인하는 중…");
    listing = await fetchListing(baseUrl, result.vacancyId, result.saleKind || "");
    const problems = L.GWNaverBlog.listingProblems(listing, Boolean(result.saleKind));
    if (problems.length) throw new Error(`${result.saleKind ? "물건" : "부동산 표시·광고 필수"} 정보가 없어 멈췄습니다: ${problems.join(", ")}. 공실의 등록자 정보를 확인해 주세요.`);
  }
  let chatUrl = "";
  const text = await chatgpt.ask(snsPrompt(vacancyId, tone), { onProgress, isComplete: (t) => articleJson.hasCompleteObject(t), onChat: (u) => (chatUrl = u) });
  onProgress("받은 글을 정리하는 중…");
  const parsed = L.gwSnsParse(text);
  if (!parsed.ok) throw new Error(parsed.reason || "SNS 글을 읽지 못했습니다.");
  const { pool, media } = pickMedia(vacancyId);
  const ctx = {
    noun: L.gwSnsNoun(vacancy),
    url: listing ? listing.detailUrl : "https://www.gongsilnews.com",
    listing,
    noVacancy: !result.vacancyId,
    credit: S.creditOf(vacancyId), // 매물과 연결되지 않았을 때
  };
  const data = { vacancyId, kind: "sim", ctx, posts: parsed.posts, pool, media, chatUrl, writtenAt: new Date().toISOString() };
  if (tone && typeof tone === "object") data.tone = tone;
  fs.writeFileSync(snsFile(vacancyId), JSON.stringify(data, null, 2));
  log.info(`[SNS] 시뮬레이션 ${vacancyId} ${Object.keys(parsed.posts).join(",")}`);
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

/* [사진·글 저장]: 문서\공실스튜디오\01 뉴스SNS발행\<채널>\날짜\<작업 이름>\ 에 글(txt)과 채널 비율 사진을 만들고 폴더를 연다 */
async function exportChannel({ vacancyId, channel }) {
  const r = await channelFiles({ vacancyId, channel });
  shell.openPath(r.folder);
  return { folder: r.folder, saved: r.files.length, total: r.total };
}

/* 채널 비율로 자른 사진·글을 폴더에 만든다 — [사진·글 저장]·도우미 채우기 공용 */
async function channelFiles({ vacancyId, channel }) {
  const data = syncNewMedia(vacancyId, readJson(snsFile(vacancyId))); // 분석에서 새로 넣은 사진도
  if (!data) throw new Error("먼저 SNS 글을 써 주세요.");
  const c = sns.GW_SNS_CHANNELS[channel];
  const web = forWeb(data).channels[channel];
  // 저장 자리: 문서\공실스튜디오\01 뉴스SNS발행\<채널>\날짜\<매물 이름_공실번호 | 뉴스칼럼_제목 | 시뮬레이션> (out-folder.js)
  const folder = require("./out-folder").folderFor(vacancyId, c.label);
  fs.rmSync(folder, { recursive: true, force: true });
  fs.mkdirSync(folder, { recursive: true });

  const textForFile = channel === "threads"
    ? web.composed.posts.map((t, i) => `[${i === 0 ? "첫 글" : `이어 쓰기 ${i}`}]\n${t}`).join("\n\n―――――――――――\n\n")
    : web.composed.text;
  fs.writeFileSync(path.join(folder, `${c.label}_글.txt`), textForFile, "utf8");

  const byId = new Map(data.pool.map((m) => [m.id, m]));
  const list = (data.media[channel] || []).map((id) => byId.get(id)).filter(Boolean).slice(0, c.maxMedia);
  let saved = 0;
  const files = [];
  for (let i = 0; i < list.length; i++) {
    const no = String(i + 1).padStart(2, "0");
    const dest = path.join(folder, `${no}${i === 0 ? "_대표" : ""}${list[i].kind === "ai" ? "_AI" : ""}.jpg`);
    const ok = await cropTo(list[i].file, dest, channel, list[i].kind);
    if (ok) { saved++; files.push(dest); }
  }
  return { folder, files, total: list.length, text: web.composed.text, posts: web.composed.posts || [] };
}

/* [도우미로 채우기] — 평소 크롬에 그 채널을 열고, 공실마케팅 도우미 확장이 사진·글을 넣는다 ([공유하기]·[게시]는 회원이)
   30초 안에 도우미가 안 받아 가면 HELPER_NONE (화면이 [글 복사]·[사진·글 저장]을 안내) */
const HOME = { instagram: "https://www.instagram.com/", threads: "https://www.threads.com/", facebook: "https://www.facebook.com/" };
async function fillByHelper({ vacancyId, channel }, onProgress = () => {}) {
  if (!HOME[channel]) throw new Error("알 수 없는 채널입니다.");
  const c = sns.GW_SNS_CHANNELS[channel];
  onProgress("사진을 채널 비율로 맞추는 중…");
  const r = await channelFiles({ vacancyId, channel });
  const photos = r.files.map((f) => `data:image/jpeg;base64,${fs.readFileSync(f).toString("base64")}`);
  const helper = require("./helper-server");
  // 공실 글이면 회원이 [공유하기]한 뒤 게시물 주소를 홍보현황에 (2026-10-27, 지금은 인스타그램만 잡는다)
  const isVacancy = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(vacancyId || ""));
  const articleNo = isVacancy ? "" : require("./column-writer").articleOf(vacancyId); // 홈 "내 기사"로 쓴 글 (2026-10-28)
  const id = helper.addJob(channel, { channel, label: c.label, text: r.text, posts: r.posts, photos }, isVacancy ? { vacancyId, channel } : articleNo ? { articleNo, channel } : null);
  void shell.openExternal(HOME[channel]);
  onProgress(`평소 크롬에 ${c.label}을(를) 열었어요. 공실마케팅 도우미가 채우기를 기다리는 중…`);
  if (!(await helper.wait(id, "taken", 45000))) {
    helper.cancel(id);
    throw new Error(`HELPER_NONE: 공실마케팅 도우미(크롬 확장)가 응답하지 않았어요. [글 복사]·[사진·글 저장]으로 직접 올리거나, 도우미를 설치해 주세요.`);
  }
  onProgress(`도우미가 ${c.label}에 사진 ${photos.length}장과 글을 넣는 중… (크롬 창을 닫지 마세요)`);
  const done = await helper.wait(id, "done", 180000);
  if (!done) return { ok: true, partial: true, note: `크롬 창의 도우미 상자를 확인해 주세요. 확인하고 [공유하기]·[게시]는 직접 눌러 주세요.` };
  log.info(`[도우미] ${channel} ${vacancyId} ${JSON.stringify(done).slice(0, 200)}`);
  return { ...done, folder: r.folder };
}

/** 채널 하나만 쓰기 (2026-10-28 사장님) — 새로 받은 글 중 그 채널만 바꾸고 나머지 채널 글은 그대로 둔다 */
function keepOthers(vacancyId, posts, only) {
  if (!only || !posts || !posts[only]) return posts;
  const prev = (readJson(snsFile(vacancyId)) || {}).posts || {};
  return { ...prev, [only]: posts[only] };
}

/** 한 번에 모두 쓰기(all-writer.js)가 받은 SNS 글을 따로 쓴 것과 같은 자리에 저장 */
function saveAll(vacancyId, { noun, listing, posts, column = false }) {
  const { pool, media } = pickMedia(vacancyId);
  const data = column
    ? { vacancyId, kind: "column", credit: nm.gwSnsCredit(require("./column-writer").readSource(vacancyId)), posts, pool, media, chatUrl: "", writtenAt: new Date().toISOString() }
    : { vacancyId, noun, listing, posts, pool, media, chatUrl: "", writtenAt: new Date().toISOString() };
  const prevSeen = (readJson(snsFile(vacancyId)) || {}).seenFiles;
  if (Array.isArray(prevSeen)) data.seenFiles = prevSeen;
  fs.writeFileSync(snsFile(vacancyId), JSON.stringify(data, null, 2));
  log.info(`[SNS] ${vacancyId} ${Object.keys(posts).join(",")} (한 번에)`);
  try { return forWeb(syncNewMedia(vacancyId, data)); } catch { return forWeb(data); } // 분석에서 넣은 사진도
}

module.exports = { channelInfo, get, write, revise, save, exportChannel, fillByHelper, saveSimPosts, useQuota, saveAll, toneLine, TONES, NO_REF, keepOthers };
