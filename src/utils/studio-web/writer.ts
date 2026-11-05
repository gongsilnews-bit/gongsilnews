/* eslint-disable @typescript-eslint/no-explicit-any */
import vm from "node:vm";
import { STUDIO_EXT_FILES, STUDIO_EXT_VERSION } from "@/app/api/studio/prompts/bundle.generated";

/**
 * 웹 뉴스·SNS자동화 (2026-11-03 사장님: 앱의 공실뉴스 부분을 웹에서도 똑같이)
 *
 * 앱(studio-app/src: blog-writer · sns-writer · all-writer · youtube-writer · naver-write)이 PC 에서 하던 일 가운데
 * "프롬프트 만들기 · AI 답 나누기 · SNS 글 끝 붙이기 · 네이버 블록 만들기"를 서버에서 같은 확장 파일로 한다.
 *  - 프롬프트 파일은 화면(브라우저)에 내보내지 않는다 — 만든 질문 글과 나눈 결과만 돌려준다 (2026-10-15 보안 결정과 같게)
 *  - AI 는 회원 본인 계정 (질문 복사 → 새 탭 → 답 붙여넣기). 서버 AI 는 쓰지 않는다
 *  - 저장은 화면이 이 브라우저(IndexedDB)에 한다. 여기는 아무것도 저장하지 않는다
 * 서버 전용 (프롬프트 파일을 화면에 보내지 않는다). 부르는 곳: /api/studio/web
 */

const cache = new Map<string, any>();
function run(fileNames: string[], names?: string[]) {
  const key = `${STUDIO_EXT_VERSION}|${fileNames.join(",")}|${(names || []).join(",")}`;
  if (cache.has(key)) return cache.get(key);
  const ctx = vm.createContext({ console, module: { exports: {} } });
  for (const f of fileNames) {
    const src = STUDIO_EXT_FILES[f];
    if (typeof src !== "string") throw new Error(`글쓰기 설정에 ${f} 이 없습니다.`);
    vm.runInContext(src, ctx, { filename: f });
  }
  const out = names ? vm.runInContext(`({ ${names.join(", ")} })`, ctx) : (ctx as any).module.exports;
  cache.set(key, out);
  return out;
}
const YT_COMMON = ["GW_YT_VIDEO_TYPE", "GW_YT_DURATION", "GW_YT_TONE", "gwBuildYtScriptPrompt", "gwBuildYtRevisePrompt", "gwYtSpeechSeconds", "gwYtCharCount", "GWYoutubeJson"];
const lib = {
  prompt: () => run(["gongsil/prompt.js"], ["gwBuildPrompt", "gwBuildRevisePrompt", "GW_KIND", "GW_AUCTION_KIND", "GW_LENGTH", "GW_IMAGE_STYLE", "gwBuildImagePrompt"]),
  blog: () => run(["gongsil/blog-prompt.js"]),
  aj: () => run(["gongsil/article-json.js"]),
  naver: () => run(["gongsil/naver-blog.js"]),
  sns: () => run(["gongsil/blog-prompt.js", "gongsil/naver-blog.js", "gongsil/youtube-json.js", "gongsil/sns-prompt.js"], ["GW_SNS_CHANNELS", "GW_SNS_ORDER", "gwBuildSnsPrompt", "gwBuildSnsRevisePrompt", "gwSnsParse", "gwSnsCompose", "gwSnsPickMedia", "gwSnsAiLabelNote"]),
  yt: () => run(["gongsil/prompt.js", "gongsil/youtube-json.js", "gongsil/youtube-prompt.js"], [...YT_COMMON, "GW_YT_AUCTION_VIDEO_TYPE", "gwYtVideoTypes"]),
  ytCol: () => run(["newsmaker/youtube-json.js", "newsmaker/youtube-prompt.js"], [...YT_COMMON, "GW_YT_NUMBER"]),
  // 뉴스칼럼 (앱 ext-newsmaker.js 와 같은 파일·이름) — 2026-11-04 웹 뉴스칼럼
  nm: () => run(["sections.js", "market-prompt.js", "prompt.js", "blog-prompt.js", "naver-blog.js", "youtube-json.js", "article-json.js", "sns-prompt.js"].map((f) => `newsmaker/${f}`), [
    "GW_LENGTH", "GW_KIND", "GW_IMAGE_STYLE", "gwSourceReady", "gwSourceLabel", "gwBuildPrompt", "gwBuildRevisePrompt", "gwNormalizeSection",
    "GW_BLOG_LENGTH", "GW_BLOG_STYLE", "gwBuildBlogPrompt", "gwBuildBlogRevisePrompt",
    "GW_SNS_CHANNELS", "gwBuildSnsPrompt", "gwBuildSnsRevisePrompt", "gwSnsParse", "gwSnsCompose", "gwSnsCredit", "gwSnsAiLabelNote",
    "GWNaverBlog", "GWArticleJson", "gwBuildImagePrompt", "gwAiImageCaption",
  ]),
};
/* 보고서·홍보지 AI 채우기 (앱 marketing-writer.js 와 같은 프롬프트, 2026-11-04 사장님: 웹에서 다 되게) */
const mk = () => run(["marketing/marketing-prompt.js"]);
function marketingPrompt(b: any) {
  const kind = b.kind === "flyer" ? "flyer" : b.kind === "report" ? "report" : "";
  if (!kind) throw new Error("알 수 없는 도구입니다.");
  const fields = b.fields && typeof b.fields === "object" ? b.fields : null;
  if (!fields || !Object.keys(fields).length) throw new Error("채울 칸이 없습니다.");
  const pub = typeof b.publicFacts === "string" ? b.publicFacts.slice(0, 3500) : "";
  const req = typeof b.request === "string" ? b.request.trim().slice(0, 500) : "";
  return { prompt: mk().gwBuildMarketingPrompt(kind, b.vacancy || {}, fields, pub, req) };
}
function marketingParse(b: any) {
  const r = mk().gwParseMarketing(String(b.text || ""), b.fields || {});
  return r.ok ? { ok: true, fields: r.fields } : { ok: false, error: r.reason || "AI 답을 읽지 못했어요." };
}
/* 뉴스칼럼인지 — 화면이 칼럼 소재(source)를 함께 보낸다 */
const colOf = (b: any) => (b && b.source && typeof b.source === "object" ? b.source : null);

const CHANNELS = ["instagram", "threads", "facebook"];
const fence = (o: unknown) => "```json\n" + JSON.stringify(o) + "\n```";
function outer(text: string) {
  const t = String(text || "");
  const a = t.indexOf("{"), z = t.lastIndexOf("}");
  if (a < 0 || z <= a) return null;
  try { return JSON.parse(t.slice(a, z + 1)); } catch { return null; }
}
const NO_ARTICLE = { title: "(참조 기사 없음)", subtitles: [], body: "이번에는 참조 기사가 없습니다. 아래 [확인된 매물 정보]만 사용해 작성하십시오." };
const NO_REF = { title: "(참조 기사 없음)", subtitles: [], body: "참조 기사 없이, 아래 [확인된 매물 정보](처음 분석·캡처한 공실 정보)만 사용해 작성하십시오." };

/* SNS 문체 — 앱 sns-writer.js TONES 와 같은 글 (바꾸면 둘 다) */
const TONES: Record<string, string> = {
  polite: "공손체 — 존댓말(~습니다·~해요)로 차분하고 믿음직하게 안내하십시오.",
  casual: "반말체 — 친구에게 말하듯 편한 반말(~했어·~야·~지)로 쓰십시오. 무례하거나 비꼬는 말은 쓰지 마십시오.",
  hook: "후킹체 — 첫 줄에서 궁금증을 일으키는 한 문장(숫자·질문·반전)으로 시작하고, 문장은 짧게 끊어 끝까지 읽게 쓰십시오. 과장·낚시성 거짓은 쓰지 마십시오.",
  expert: "전문가체 — 부동산 전문가가 짚어 주듯 입지·교통·가격·활용도를 근거와 함께 분석하는 말투로 쓰십시오. 수익률·시세는 [확인된 매물 정보]에 있는 숫자만 쓰십시오.",
  story: "스토리체 — 현장을 다녀온 사람이 들려주듯 장면과 이야기로 풀어 쓰십시오. 없는 일화나 사람을 지어내지 마십시오.",
  short: "요약체 — 핵심만 3~5줄로 아주 짧게, 줄마다 한 가지 정보만 쓰십시오.",
  thread: "스레드 감성 — 현장을 아는 사람이 지나가며 툭 던지는 편한 존댓말 혼잣말로 쓰십시오. ① 첫 줄은 놀라운 사실·숫자 비교 한 문장(명사로 끝내도 됨) ② 3~8줄, 한 줄에 한 생각, 줄바꿈을 자주 ③ 끝맺음은 '~네요·~더라고요·~거든요', 짧은 줄은 명사형으로 끊기 ④ 끝에서 둘째 줄에 내 생각 한 줄('~같네요', '근데 ~는 꼭 보셔야 해요') ⑤ 마지막 줄은 독자에게 묻는 질문 하나. ~습니다·반말(~해·~야)·해시태그·전화번호·'문의 주세요'·칭찬 늘어놓기('미쳤어' 등)는 쓰지 말고, 숫자·사실은 [확인된 매물 정보]에 있는 것만 쓰십시오.",
};
const CH_NAME: Record<string, string> = { instagram: "인스타그램", threads: "스레드", facebook: "페이스북" };
function toneLine(tone: unknown) {
  const per: Record<string, string> = tone && typeof tone === "object" ? (tone as Record<string, string>) : { instagram: String(tone || ""), threads: String(tone || ""), facebook: String(tone || "") };
  const pick = Object.fromEntries(CHANNELS.map((ch) => [ch, TONES[per[ch]] ? per[ch] : "polite"]));
  if (CHANNELS.every((ch) => pick[ch] === "polite")) return "";
  return `\n\n[문체 지정 — 위 지시보다 우선 · 채널마다 따로]\n${CHANNELS.map((ch) => `- ${CH_NAME[ch]} 글: ${TONES[pick[ch]]}`).join("\n")}\n문체만 바꾸고, 사실은 [확인된 매물 정보]·참조 기사에 있는 것만 쓰십시오. 출력 JSON 형식은 그대로 지키십시오.`;
}

/* ── 선택지 (앱 blog-writer styles·articleOptions · sns channelInfo · naver designs · youtube options) ── */
// 웹 유튜브 대본 = 60초 쇼츠만 · 말투 기본 릴스·쇼츠 (2026-11-05 사장님: "무조건 60초 · 릴스 쇼츠 스타일", 말투는 고를 수 있게)
const YT_DEFAULTS = { duration: "short", tone: "reels", number: "digit" }; // 자막은 2017년처럼 숫자로 · 읽을 때는 서버가 한글로 바꿔 읽음 (2026-11-05 사장님)
const REELS_TONE = { label: "릴스·쇼츠", prompt: "릴스·쇼츠 말투 — 첫 문장에서 바로 눈길을 끄는 한마디로 시작하고, 짧고 리듬감 있는 문장으로 핵심만 빠르게, 친근한 구어체 존댓말(~요). 군더더기·인사말 없이, 마지막은 짧게 행동을 이끄는 한마디" };
/** 말투 표에 릴스·쇼츠를 넣고(앞에), 길이는 60초 쇼츠만 — 프롬프트(확장 파일)가 같은 표를 읽으므로 거기에 더한다 */
function webYt(T: Record<string, any>, D: Record<string, any>) {
  if (!T.reels) T.reels = REELS_TONE;
  return { tones: [["reels", T.reels] as [string, any], ...Object.entries(T).filter(([k]) => k !== "reels")], durations: Object.entries(D).filter(([k]) => k === "short") };
}
function ytOptions(vacancy: any) {
  const L = lib.yt();
  const types = L.gwYtVideoTypes(vacancy || null);
  const table = (t: Record<string, any>, extra: (v: any) => object = () => ({})) => Object.entries(t).map(([id, v]) => ({ id, label: v.label, ...extra(v) }));
  return {
    videoTypes: table(types, (v) => ({ structure: v.structure })),
    durations: webYt(L.GW_YT_TONE, L.GW_YT_DURATION).durations.map(([id, v]: [string, any]) => ({ id, label: v.label, chars: v.chars, seconds: v.seconds })),
    tones: webYt(L.GW_YT_TONE, L.GW_YT_DURATION).tones.map(([id, v]: [string, any]) => ({ id, label: v.label })),
    numbers: table(lib.ytCol().GW_YT_NUMBER),
    defaults: { ...YT_DEFAULTS, videoType: Object.keys(types)[0] },
  };
}
function ytSettings(vacancy: any, pick: Record<string, string> = {}) {
  const o = ytOptions(vacancy);
  const ok = (list: { id: string }[], v?: string) => (v && list.some((x) => x.id === v) ? v : "");
  const want = { videoType: ok(o.videoTypes, pick.videoType), duration: ok(o.durations, pick.duration), tone: ok(o.tones, pick.tone), number: ok(o.numbers, pick.number) };
  return { ...o.defaults, ...Object.fromEntries(Object.entries(want).filter(([, v]) => v)) } as Record<string, string>;
}
/* 뉴스칼럼 선택지 (앱 blog-writer styles · column-writer articleOptions · youtube-writer options 의 칼럼 부분) */
function colOptions() {
  const M = lib.nm(), Y = lib.ytCol(), S = lib.sns();
  const table = (t: Record<string, any>, extra: (v: any) => object = () => ({})) => Object.entries(t).map(([id, v]) => ({ id, label: v.label, ...extra(v) }));
  return {
    blog: { saleKind: "", styles: Object.entries(M.GW_BLOG_STYLE as Record<string, any>).map(([id, s]) => ({ id, label: s.label, fit: s.fit, titleExample: s.titleExample, design: s.design })), lengths: table(M.GW_BLOG_LENGTH, (l) => ({ chars: l.chars })) },
    article: { kinds: table(M.GW_KIND, (k) => ({ brief: k.brief })), lengths: table(M.GW_LENGTH, (l) => ({ chars: l.chars })), autoCover: false },
    channels: CHANNELS.map((id) => {
      const c = S.GW_SNS_CHANNELS[id];
      return { id, label: c.label, homeUrl: c.homeUrl, ratioText: c.ratioText, maxChars: c.maxChars, maxMedia: c.maxMedia, maxTags: c.maxTags, size: c.size, ratio: c.ratio || null };
    }),
    designs: Object.entries(M.GWNaverBlog.DESIGNS as Record<string, any>).map(([id, d]) => ({ id, label: d.label, hint: d.hint })),
    imageStyles: table(M.GW_IMAGE_STYLE),
    youtube: {
      videoTypes: table(Y.GW_YT_VIDEO_TYPE, (v) => ({ structure: v.structure })),
      durations: webYt(Y.GW_YT_TONE, Y.GW_YT_DURATION).durations.map(([id, v]: [string, any]) => ({ id, label: v.label, chars: v.chars, seconds: v.seconds })),
      tones: webYt(Y.GW_YT_TONE, Y.GW_YT_DURATION).tones.map(([id, v]: [string, any]) => ({ id, label: v.label })),
      numbers: table(Y.GW_YT_NUMBER),
      defaults: { ...YT_DEFAULTS, videoType: Object.keys(Y.GW_YT_VIDEO_TYPE)[0] },
    },
    writeUrl: lib.naver().WRITE_URL,
    siteUrl: lib.naver().SITE_URL,
  };
}
function colYtSettings(pick: Record<string, string> = {}) {
  const o = colOptions().youtube;
  const ok = (list: { id: string }[], v?: string) => (v && list.some((x) => x.id === v) ? v : "");
  const want = { videoType: ok(o.videoTypes, pick.videoType), duration: ok(o.durations, pick.duration), tone: ok(o.tones, pick.tone), number: ok(o.numbers, pick.number) };
  return { ...o.defaults, ...Object.fromEntries(Object.entries(want).filter(([, v]) => v)) } as Record<string, string>;
}
/* 내 기사 링크 줄 — 웹 뉴스칼럼은 내 기사만 소재라, 글 끝에 내 물건접수 홈페이지의 그 기사 주소 (2026-11-04 사장님: 링크는 모두 내 홈페이지로)
   뉴스메이커 프롬프트(앱과 같이 씀)는 링크를 안 붙이므로 웹에서만 붙인다 */
const colLink = (source: any) => {
  const u = String(source?.news?.url || "");
  return source?.news?.publisher === "공실뉴스" && /^https:\/\//.test(u) ? `▶ 기사 전문 보기\n${u}` : "";
};
function withColLink(ch: string, post: any, source: any) {
  const link = colLink(source);
  if (!post || !link) return post;
  if (ch === "threads") {
    const posts = [...(post.posts || [])];
    if (!posts.length) return post;
    const max = lib.nm().GW_SNS_CHANNELS.threads.maxChars || 500;
    const last = posts.length - 1;
    if (String(posts[last]).length + link.length + 2 <= max) posts[last] = `${posts[last]}\n\n${link}`;
    else posts.push(link);
    return { ...post, posts };
  }
  return post.body ? { ...post, body: `${post.body}\n\n${link}` } : post;
}
const colRef = (b: any, source: any) => b.ref || { title: source.news?.title || "(참조 기사)", subtitles: [], body: source.news?.body || "" };
function options(vacancy: any) {
  const B = lib.blog(), P = lib.prompt(), S = lib.sns(), N = lib.naver();
  const auction = Boolean(vacancy && vacancy.saleKind);
  return {
    blog: {
      saleKind: (vacancy && vacancy.saleKind) || "",
      styles: Object.entries(B.gwBlogStyles(vacancy || null) as Record<string, any>).map(([id, s]) => ({ id, label: s.label, fit: s.fit, titleExample: s.titleExample, design: s.design })),
      lengths: Object.entries(B.GW_BLOG_LENGTH as Record<string, any>).map(([id, l]) => ({ id, label: l.label, chars: l.chars })),
    },
    article: {
      kinds: Object.entries((auction ? P.GW_AUCTION_KIND : P.GW_KIND) as Record<string, any>).map(([id, k]) => ({ id, label: k.label, brief: k.brief })),
      lengths: Object.entries(P.GW_LENGTH as Record<string, any>).map(([id, l]) => ({ id, label: l.label, chars: l.chars })),
    },
    channels: CHANNELS.map((id) => {
      const c = S.GW_SNS_CHANNELS[id];
      return { id, label: c.label, homeUrl: c.homeUrl, ratioText: c.ratioText, maxChars: c.maxChars, maxMedia: c.maxMedia, maxTags: c.maxTags, size: c.size, ratio: c.ratio || null };
    }),
    designs: Object.entries(N.DESIGNS as Record<string, any>).map(([id, d]) => ({ id, label: d.label, hint: d.hint })),
    imageStyles: Object.entries(P.GW_IMAGE_STYLE as Record<string, any>).map(([id, s]) => ({ id, label: s.label })),
    youtube: ytOptions(vacancy),
    writeUrl: N.WRITE_URL,
    siteUrl: N.SITE_URL,
  };
}

/* ── 한 번에 쓰기 프롬프트 (앱 all-writer.js 공실뉴스 부분과 같다) ── */
/* 뉴스칼럼 한 번에 쓰기 (앱 all-writer.js 의 col 부분과 같다) — 기사를 안 쓰면 소재인 내 기사(ref)가 참조 기사 */
function colAllPrompt(b: any, source: any) {
  const want = { article: b.want?.article === true, blog: b.want?.blog === true, sns: b.want?.sns === true, youtube: b.want?.youtube === true };
  if (!want.article && !want.blog && !want.sns && !want.youtube) throw new Error("쓸 글을 하나 이상 골라 주세요.");
  const M = lib.nm(), Y = lib.ytCol();
  if (!M.gwSourceReady(source)) throw new Error("칼럼 소재(기사 제목·본문)가 비어 있어요. 목록에서 기사를 다시 골라 주세요.");
  const REF = want.article
    ? { title: "(이 답의 [작업 1] 공실뉴스 기사)", subtitles: [], body: "이 요청의 [작업 1]에서 쓴 공실뉴스 기사를 참조 기사로 삼으십시오. 사실은 원문 소재에 있는 것만 쓰십시오." }
    : colRef(b, source);
  const artKind = M.GW_KIND[b.article?.kind] ? b.article.kind : Object.keys(M.GW_KIND)[0];
  const artLen = M.GW_LENGTH[b.article?.length] ? b.article.length : "normal";
  const blogSt = M.GW_BLOG_STYLE[b.blog?.style] ? b.blog.style : "info", blogLen = b.blog?.length || "normal";
  const parts: [string, string, string][] = [];
  if (want.article) parts.push(["article", "공실뉴스 기사 (뉴스칼럼)", M.gwBuildPrompt(source, { kind: artKind, length: artLen })]);
  if (want.blog) parts.push(["blog", "네이버 블로그 글", M.gwBuildBlogPrompt({ article: REF, source }, { style: blogSt, length: blogLen })]);
  if (want.sns) parts.push(["sns", "SNS 글 (인스타그램 · 스레드 · 페이스북)", M.gwBuildSnsPrompt({ article: REF, source }) + toneLine(b.tone)]);
  const ytSet = want.youtube ? colYtSettings(b.youtube || {}) : null;
  if (want.youtube) parts.push(["youtube", "쇼츠릴스 대본", Y.gwBuildYtScriptPrompt({ article: REF, source }, ytSet)]);
  return bundle(parts, { artKind, artLen, blogSt, blogLen, ytSet });
}
function bundle(parts: [string, string, string][], settings: Record<string, unknown>) {
  const keys = parts.map((p) => p[0]);
  const prompt = [
    `여러 글을 한 번에 씁니다. 아래 [작업 ${parts.map((_, i) => i + 1).join("·")}]을 모두 하십시오.`,
    "각 작업의 지시·규칙·문체·분량은 그 작업에 적힌 그대로 지키고, 각 작업이 요구하는 출력 JSON 을 만드십시오.",
    `그다음 그 JSON 들을 아래처럼 하나로 묶어, 설명 없이 JSON 하나만 답하십시오 (각 작업의 "JSON 하나만 답하라"는 지시는 이 묶음 안의 값으로 지킵니다).`,
    "{" + keys.map((k) => `"${k}": { …[${k}] 작업의 JSON… }`).join(", ") + "}",
    "",
    ...parts.map((p, i) => `===== [작업 ${i + 1}] ${p[1]} — 결과는 "${p[0]}" 키에 =====\n${p[2]}`),
  ].join("\n");
  return { prompt, keys, settings };
}
function allPrompt(b: any) {
  if (colOf(b)) return colAllPrompt(b, colOf(b));
  const v = b.vacancy || {};
  const want = { article: b.want?.article === true, blog: b.want?.blog === true, sns: b.want?.sns === true, youtube: b.want?.youtube === true };
  if (!want.article && !want.blog && !want.sns && !want.youtube) throw new Error("쓸 글을 하나 이상 골라 주세요.");
  const P = lib.prompt(), B = lib.blog(), S = lib.sns();
  const REF = want.article
    ? { title: "(이 답의 [작업 1] 공실뉴스 기사)", subtitles: [], body: "이 요청의 [작업 1]에서 쓴 공실뉴스 기사를 참조 기사로 삼으십시오. 사실은 [확인된 매물 정보]에 있는 것만 쓰십시오." }
    : b.ref || { title: "(참조 기사 없음)", subtitles: [], body: "이번에는 참조 기사가 없습니다. 아래 [확인된 매물 정보]만 사용해 작성하십시오." };
  const artKind = b.article?.kind || "news", artLen = b.article?.length || "normal";
  const blogSt = b.blog?.style || "listing", blogLen = b.blog?.length || "normal";
  const parts: [string, string, string][] = [];
  if (want.article) parts.push(["article", "공실뉴스 기사", P.gwBuildPrompt(v, { kind: artKind, length: artLen })]);
  if (want.blog) parts.push(["blog", "네이버 블로그 글", B.gwBuildBlogPrompt({ vacancy: v, article: REF }, { style: blogSt, length: blogLen })]);
  if (want.sns) parts.push(["sns", "SNS 글 (인스타그램 · 스레드 · 페이스북)", S.gwBuildSnsPrompt({ vacancy: v, article: NO_REF }) + toneLine(b.tone)]);
  const ytSet = want.youtube ? ytSettings(v, b.youtube || {}) : null;
  if (want.youtube) parts.push(["youtube", "쇼츠릴스 대본", ytPrompt(v, ytSet!, REF)]);
  const keys = parts.map((p) => p[0]);
  const prompt = [
    `여러 글을 한 번에 씁니다. 아래 [작업 ${parts.map((_, i) => i + 1).join("·")}]을 모두 하십시오.`,
    "각 작업의 지시·규칙·문체·분량은 그 작업에 적힌 그대로 지키고, 각 작업이 요구하는 출력 JSON 을 만드십시오.",
    `그다음 그 JSON 들을 아래처럼 하나로 묶어, 설명 없이 JSON 하나만 답하십시오 (각 작업의 "JSON 하나만 답하라"는 지시는 이 묶음 안의 값으로 지킵니다).`,
    "{" + keys.map((k) => `"${k}": { …[${k}] 작업의 JSON… }`).join(", ") + "}",
    "",
    ...parts.map((p, i) => `===== [작업 ${i + 1}] ${p[1]} — 결과는 "${p[0]}" 키에 =====\n${p[2]}`),
  ].join("\n");
  return { prompt, keys, settings: { artKind, artLen, blogSt, blogLen, ytSet } };
}
/** 웹 쇼츠 대본 — 군더더기 빼기 (2026-11-05 사장님: "이런 내용을 굳이 넣어야 하나?") · 위 지시와 겹치면 이것이 먼저 */
const SHORTS_RULES = `[쇼츠 대본 — 위 지시보다 먼저 지킬 것]
- "계약 전에는 ~을 확인해야 합니다", "등기사항증명서·권리관계·관리비 항목을 확인하세요" 같은 확인할 점·주의 안내 문장은 쓰지 마십시오.
- "자세한 내용은 영상 설명란(공실뉴스)에서 확인할 수 있습니다" 같은 맺음 안내 문장도 쓰지 마십시오.
- 매물의 좋은 점과 핵심 조건만 짧게 전하고, 마지막은 문의·방문을 이끄는 짧은 한마디로 끝내십시오.

[말로 듣는 글 — 2026-11-05 사장님: "내용이 착착 안 달라붙어", "(69.4㎡) 이런 것 읽기가 좋지 않아"]
- 이 글은 성우가 읽고 화면 자막으로 나옵니다. 정보표를 읽듯 쓰지 말고, 친구에게 집을 보여 주며 말하듯 이어지게 쓰십시오.
- 개수·금액·연도·평수·층은 숫자로 씁니다: "방 2개, 욕실 1개", "주차 1대", "보증금 5,000만 원", "월세 100만 원", "매매가 1억 2,000만 원", "2017년", "21평", "3층". 자막에는 숫자로 나오고, 성우는 "방 두 개, 보증금 오천만"처럼 부동산 말투로 읽습니다. (2026-11-05 사장님)
- 괄호 ( )와 ㎡·m²·㎡당 같은 단위·기호는 쓰지 마십시오. 면적은 평으로만 말합니다 (예: "전용 21평"). 전용과 공급이 같으면 전용만 말합니다.
- "각각", "~로 등록돼 있습니다", "~이 제공됩니다", "~시설과 ~시설이 함께 있는" 같은 서류·안내문 말투는 쓰지 마십시오. 사실은 그냥 말합니다 ("전체 수리를 마친 집이에요").
- 같은 조건(평수·방 수·가격)은 한 번만 말합니다. 첫 문장에서 말했으면 뒤에서 다시 말하지 않습니다.
- 순서: ① 가장 끌리는 한마디(동네 + 가장 좋은 점) → ② 공간(평수·방·욕실) → ③ 건물·상태(준공·수리·향·엘리베이터) → ④ 옵션 → ⑤ 가격(보증금·월세·관리비 한 번에) → ⑥ 입주 시기.
- 마지막 문장은 반드시 "문의주세요!" 또는 "문의 남겨주세요!" 로 끝냅니다. ("직접 둘러보세요", "확인해 보세요" 같은 맺음은 쓰지 않습니다)
- 분량: 띄어쓰기 포함 400자 안팎(390~420자), 문단 9~11개. 위에 적힌 "약 280~380자"보다 이것이 먼저입니다. 1.25배 성우로 약 55초입니다. (2026-11-05 사장님: "글도 너무 짧아", "400자는 되어야")
  아래 본보기는 형식만 보여 주는 짧은 것이니, 그만큼 짧게 쓰지 마십시오. 늘릴 때도 같은 말을 되풀이하지 말고, 각 조건에 사는 사람에게 어떤 뜻인지 한마디를 더 붙이는 식으로 채웁니다.
- 문단 하나가 화면 한 장입니다. 문단은 한두 문장, 40자 안팎으로 짧게, 앞 문단에 자연스럽게 이어지게 ("게다가", "여기에", "가격은요" 같은 이음말을 가끔).
- 조건 옆에 그것이 사는 사람에게 어떤 뜻인지 짧게 붙여도 됩니다 ("남서향이라 오후 햇살이 들어요", "옵션이 있어 짐만 오면 돼요"). 단, 매물 정보에 없는 사실(역 거리·전망·주변 시설 등)은 만들지 마십시오.

[이런 느낌으로 — 형식 참고용, 내용은 반드시 이 매물 정보로]
논현동에서 바로 들어갈 수 있는 21평 빌라, 보여 드릴게요.
방 1개, 욕실 1개인데 전용이 21평이라 혼자 쓰기엔 넉넉해요.
2017년에 지은 건물이고, 전체 수리까지 마친 집이에요. 엘리베이터도 있어요.
남서향이라 오후 햇살이 잘 들어요.
벽걸이 에어컨이랑 세탁기도 있어서 짐만 오시면 돼요.
가격은 보증금 5,000만 원에 월세 100만 원, 관리비 10만 원은 따로예요.
지금 비어 있어서 바로 들어올 수 있어요. 문의주세요!`;
/** 말로 읽는 대본 — AI 가 그래도 넣은 괄호 속 ㎡ 등은 빼고 (2026-11-05) */
const speakable = (t: string) => t.replace(/(\d)\.0(?=\s?평)/g, "$1").replace(/\s*\([^()]*(㎡|m²|m2|평형?)[^()]*\)/g, "").replace(/\s{2,}/g, " ").trim();
function ytPrompt(vacancy: any, settings: Record<string, string>, article: any) {
  const number = lib.ytCol().GW_YT_NUMBER.digit; // 웹은 늘 숫자 그대로 (자막 2017년 · 읽기는 서버가 한글로) — 예전에 고른 "한글 읽기"가 남아 있어도
  return `${lib.yt().gwBuildYtScriptPrompt({ vacancy, article }, settings)}\n\n[숫자 표기]\n- ${number.prompt}\n\n${SHORTS_RULES}`;
}

/* 기사·블로그 답 → 제목·부제·문단·키워드 */
function docOf(parsed: any, col = false) {
  const a = parsed.article;
  const sec = col ? lib.nm().gwNormalizeSection(a.section1, a.section2) || {} : {};
  return { title: a.title, subtitles: a.subtitles || [], paragraphs: lib.naver().splitParagraphs(a.body), keywords: a.keywords || [], ...(col ? { section1: sec.section1 || "", section2: sec.section2 || "" } : {}) };
}
function ytOf(text: string, col = false) {
  const r = (col ? lib.ytCol() : lib.yt()).GWYoutubeJson.parseObject(text);
  if (!r.ok) throw new Error(r.reason || "대본을 읽지 못했습니다.");
  const d = r.data || {};
  const list = Array.isArray(d.narration || d.script || d.text) ? d.narration || d.script || d.text : String(d.narration || d.script || d.text || "").split(/\n{2,}/);
  const narration = list.map((p: unknown) => speakable(String(p || ""))).filter(Boolean);
  if (!narration.length) throw new Error("AI 답변에 원고가 없습니다. 다시 써 주세요.");
  return { title: String(d.title || "").trim(), titles: (Array.isArray(d.titles) ? d.titles : []).map((t: unknown) => String(t || "").trim()).filter(Boolean).slice(0, 3), narration };
}
function allParse(b: any) {
  const o = outer(b.text);
  if (!o) return { ok: false, error: "AI 답을 읽지 못했어요. 답이 다 나온 뒤 코드 상자의 [복사]를 눌러 주세요." };
  const keys: string[] = Array.isArray(b.keys) ? b.keys : [];
  if (!keys.every((k) => o[k] && typeof o[k] === "object")) return { ok: false, error: `답에 ${keys.filter((k) => !(o[k] && typeof o[k] === "object")).map((k) => ({ article: "기사", blog: "블로그", sns: "SNS", youtube: "대본" } as Record<string, string>)[k] || k).join("·")} 글이 없어요. 답이 다 나온 뒤 복사해 주세요.` };
  const col = b.column === true;
  const AJ = col ? lib.nm().GWArticleJson : lib.aj();
  const out: Record<string, unknown> = {};
  const miss: string[] = [];
  if (keys.includes("article")) { const p = AJ.parse(fence(o.article)); if (p.ok) out.article = docOf(p, col); else miss.push("기사"); }
  if (keys.includes("blog")) { const p = AJ.parse(fence(o.blog)); if (p.ok) out.blog = docOf(p); else miss.push("블로그"); }
  if (keys.includes("sns")) { const p = (col ? lib.nm() : lib.sns()).gwSnsParse(fence(o.sns)); if (p.ok) out.sns = p.posts; else miss.push("SNS"); }
  if (keys.includes("youtube")) { try { out.youtube = ytOf(fence(o.youtube), col); } catch { miss.push("쇼츠릴스 대본"); } }
  return { ok: true, ...out, miss };
}

/* 사진 자리 (앱 blog-writer materializeSlots) — 두 문단마다 한 장, 대표는 자리 없음 */
function layout(media: any[], paragraphCount: number) {
  const slots = lib.naver().layoutMediaSlots(paragraphCount, media);
  slots.forEach((items: { index: number }[], slot: number) => items.forEach(({ index }) => (media[index].insertAfterParagraph = slot)));
  media.forEach((m) => {
    if (m.isCover) m.insertAfterParagraph = null;
    else if (Number.isInteger(m.insertAfterParagraph)) m.insertAfterParagraph = Math.min(m.insertAfterParagraph, paragraphCount);
  });
  return media;
}

/* ── 수정 요청 — 웹은 늘 새 대화라 처음 프롬프트 + 지금 글 + 고칠 점을 한 번에 (앱의 fallbackPrompt) ── */
function draftJson(d: any, doc: string) {
  const o: Record<string, unknown> = { title: d.title };
  if (doc === "article") (d.subtitles || []).slice(0, 3).forEach((s: string, i: number) => (o[`subtitle${i + 1}`] = s));
  o.body = d.paragraphs;
  o.keywords = d.keywords || [];
  return "```json\n" + JSON.stringify(o, null, 2) + "\n```";
}
/* 뉴스칼럼 수정 (앱 blog-writer originalPrompt·revisePrompt · sns-writer revise · youtube-writer revise 의 칼럼 부분) */
function colRevisePrompt(b: any, source: any, req: string) {
  const M = lib.nm(), Y = lib.ytCol();
  const d = b.draft || {};
  const ref = colRef(b, source);
  if (b.doc === "article" || b.doc === "blog") {
    const original = b.doc === "article"
      ? M.gwBuildPrompt(source, { kind: M.GW_KIND[d.style] ? d.style : Object.keys(M.GW_KIND)[0], length: d.length || "normal" })
      : M.gwBuildBlogPrompt({ article: ref, source }, { style: M.GW_BLOG_STYLE[d.style] ? d.style : "info", length: d.length || "normal" });
    const ask = b.doc === "article" ? M.gwBuildRevisePrompt(req, source) : M.gwBuildBlogRevisePrompt(req);
    return `${original}\n\n[앞서 작성한 ${b.doc === "article" ? "기사" : "블로그"} — 미리보기에서 고친 내용 포함]\n${draftJson(d, b.doc)}\n\n${ask}`;
  }
  if (b.doc === "sns") {
    if (!CHANNELS.includes(b.channel)) throw new Error("알 수 없는 채널입니다.");
    const now = "```json\n" + JSON.stringify(b.posts || {}, null, 2) + "\n```";
    return `${M.gwBuildSnsPrompt({ article: ref, source })}${toneLine(b.tone)}\n\n[앞서 작성한 SNS 글 — 고친 내용 포함]\n${now}\n\n${M.gwBuildSnsRevisePrompt(b.channel, req)}`;
  }
  if (b.doc === "youtube") {
    const full = { title: d.title, text: (d.narration || []).join("\n\n") };
    return `${Y.gwBuildYtScriptPrompt({ article: ref, source }, colYtSettings(d.settings || {}))}\n\n${Y.gwBuildYtRevisePrompt(full, req)}`;
  }
  throw new Error("알 수 없는 글입니다.");
}
/* AI 사진 만들기 — 앱 blog-writer.js makeImage 와 같은 프롬프트 (2026-11-04 사장님: 웹 블로그에도 AI 사진).
   회원 본인 AI(ChatGPT·Gemini) 옆 창에 붙여 넣어 그린다 — 서버는 질문 글만 만든다 */
function imagePrompt(b: any) {
  const article = { title: String(b.title || ""), body: String(b.body || "") };
  const request = String(b.request || "").slice(0, 300);
  const label = String(b.styleLabel || "");
  const withStyle = (prompt: string) => (!b.stylePrompt ? prompt
    : `${prompt}

[화풍·스타일 — 위 [선택한 스타일]보다 이것을 먼저 지킬 것] ${label}
${String(b.stylePrompt).slice(0, 1200)}
- 이미지 안에 글자, 숫자, 로고, 워터마크를 넣지 말 것`);
  const col = colOf(b);
  if (col) {
    const M = lib.nm();
    const st = M.GW_IMAGE_STYLE[b.style] ? b.style : "auto";
    return { prompt: withStyle(M.gwBuildImagePrompt(col, article, { style: st, request })), caption: M.gwAiImageCaption(article) };
  }
  const P = lib.prompt();
  const v = b.vacancy || {};
  const st = P.GW_IMAGE_STYLE[b.style] ? b.style : "news";
  const name = v.title || "해당 매물";
  return {
    prompt: withStyle(P.gwBuildImagePrompt(v, article, { style: st, request, customStyle: label })),
    caption: `${name} ${label || (P.GW_IMAGE_STYLE[st] || {}).label || "AI 이미지"} (AI 생성 이미지)`,
  };
}
function revisePrompt(b: any) {
  const v = b.vacancy || {};
  const req = String(b.request || "").trim();
  if (!req) throw new Error("어떻게 고칠지 적어 주세요.");
  if (colOf(b)) return colRevisePrompt(b, colOf(b), req);
  const d = b.draft || {};
  if (b.doc === "article" || b.doc === "blog") {
    const P = lib.prompt(), B = lib.blog();
    const ask = b.doc === "article" ? P.gwBuildRevisePrompt(req, v) : B.gwBuildBlogRevisePrompt(req, v);
    const original = b.doc === "article"
      ? P.gwBuildPrompt(v, { kind: d.style || "news", length: d.length || "normal" })
      : B.gwBuildBlogPrompt({ vacancy: v, article: b.ref || NO_ARTICLE }, { style: d.style || "listing", length: d.length || "normal" });
    return `${original}\n\n[앞서 작성한 ${b.doc === "article" ? "기사" : "블로그"} — 미리보기에서 고친 내용 포함]\n${draftJson(d, b.doc)}\n\n${ask}`;
  }
  if (b.doc === "sns") {
    const S = lib.sns();
    if (!CHANNELS.includes(b.channel)) throw new Error("알 수 없는 채널입니다.");
    const ask = S.gwBuildSnsRevisePrompt(b.channel, req);
    const now = "```json\n" + JSON.stringify(b.posts || {}, null, 2) + "\n```";
    return `${S.gwBuildSnsPrompt({ vacancy: v, article: NO_REF })}${toneLine(b.tone)}\n\n[앞서 작성한 SNS 글 — 고친 내용 포함]\n${now}\n\n${ask}`;
  }
  if (b.doc === "youtube") {
    const full = { title: d.title, text: (d.narration || []).join("\n\n") };
    const ask = lib.yt().gwBuildYtRevisePrompt(full, req, v);
    return `${ytPrompt(v, ytSettings(v, d.settings || {}), b.ref || NO_ARTICLE)}\n\n${ask}`;
  }
  throw new Error("알 수 없는 글입니다.");
}
function reviseParse(b: any) {
  const col = b.column === true;
  if (b.doc === "article" || b.doc === "blog") {
    const p = (col ? lib.nm().GWArticleJson : lib.aj()).parse(b.text);
    if (!p.ok) return { ok: false, error: p.reason || "AI 답변을 읽지 못했습니다." };
    return { ok: true, doc: docOf(p, col && b.doc === "article") };
  }
  if (b.doc === "sns") {
    const p = (col ? lib.nm() : lib.sns()).gwSnsParse(b.text);
    if (!p.ok || !p.posts[b.channel]) return { ok: false, error: (p && p.reason) || "고친 글을 읽지 못했습니다." };
    return { ok: true, post: p.posts[b.channel] };
  }
  if (b.doc === "youtube") {
    try { return { ok: true, script: ytOf(b.text, col) }; } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
  }
  return { ok: false, error: "알 수 없는 글입니다." };
}

/* ── SNS 글 끝(링크·매물 정보 출처·해시태그) · 사진 고르기 (앱 sns-writer forWeb · pickMedia) ── */
function snsCompose(b: any) {
  const col = colOf(b);
  // 뉴스칼럼 — 중개사무소 출처 대신 소재 출처 줄 (내 기사면 내 물건접수 홈페이지의 그 기사 주소, 2026-11-04 사장님)
  const S = col ? lib.nm() : lib.sns();
  const ctx = col ? { credit: S.gwSnsCredit(col) } : { noun: b.noun || "매물", url: (b.listing && b.listing.detailUrl) || "", listing: b.listing || null };
  const out: Record<string, unknown> = {};
  for (const ch of CHANNELS) {
    const post = b.posts?.[ch] || null;
    const ai = (b.ai?.[ch] || []).map((x: boolean) => ({ ai: Boolean(x) }));
    out[ch] = { composed: post ? S.gwSnsCompose(ch, col ? withColLink(ch, post, col) : post, ctx) : { posts: [], text: "" }, aiNote: S.gwSnsAiLabelNote(ch, ai) };
  }
  return out;
}
function snsPick(b: any) {
  const S = lib.sns();
  const pool: any[] = Array.isArray(b.pool) ? b.pool : [];
  const out: Record<string, string[]> = {};
  for (const ch of CHANNELS) {
    const picked = S.gwSnsPickMedia(ch, pool.map((m) => ({ ...m, url: m.id })));
    out[ch] = picked.map((p: { url: string }) => p.url).filter((id: string) => pool.some((m) => m.id === id));
  }
  return out;
}

/* ── 네이버 블로그 블록 (앱 naver-write fillNaver) — 사진 블록은 mediaIndex 만, 그림은 화면이 넣는다 ── */
function colNaverBlocks(b: any, source: any) {
  const M = lib.nm(), nb = M.GWNaverBlog;
  const blog = b.blog || {};
  const design = nb.DESIGNS[b.design] ? b.design : (M.GW_BLOG_STYLE[blog.style] || {}).design || "basic";
  const media = Array.isArray(b.media) ? b.media : [];
  const blocks = nb.buildNaverBlocks((blog.paragraphs || []).join("\n\n"), media, { design, title: blog.title, source });
  return { blocks, tags: nb.normalizeTags(blog.keywords || []), design };
}
function naverBlocks(b: any) {
  if (colOf(b)) return colNaverBlocks(b, colOf(b));
  const N = lib.naver(), B = lib.blog();
  const saleKind = (b.vacancy && b.vacancy.saleKind) || "";
  const problems = N.listingProblems(b.listing, Boolean(saleKind));
  if (problems.length) {
    throw new Error(saleKind
      ? `물건 정보가 없어 멈췄습니다: ${problems.join(", ")}. 분석을 다시 해 주세요.`
      : `부동산 표시·광고 필수 정보가 없어 멈췄습니다: ${problems.join(", ")}. 공실의 등록자 정보를 확인해 주세요.`);
  }
  const blog = b.blog || {};
  const design = N.DESIGNS[b.design] ? b.design : (B.GW_BLOG_STYLE?.[blog.style] || {}).design || "basic";
  const media = Array.isArray(b.media) ? b.media : [];
  const blocks = N.buildNaverBlocks((blog.paragraphs || []).join("\n\n"), media, { design, title: blog.title, vacancy: { ...(b.vacancy || {}), vacancyId: b.vacancyId }, listing: b.listing });
  return { blocks, tags: N.normalizeTags(blog.keywords || []), design };
}

/* ── 유튜브 설명란·길이 (앱 youtube-writer forWeb · description) ── */
function ytView(b: any) {
  const L = lib.yt();
  const d = b.script || {};
  const all = (d.narration || []).join("\n\n");
  const article = b.article || {};
  const summary = (article.subtitles && article.subtitles.length ? article.subtitles : (article.paragraphs || []).slice(0, 1)).join("\n");
  const lines = [summary];
  const col = colOf(b);
  if (col) lines.push(colLink(col)); // 뉴스칼럼 — 내 홈페이지의 그 기사
  else if (b.listing) {
    const tail = lib.sns().gwSnsCompose("facebook", { body: "-" }, { noun: "매물", url: b.listing.detailUrl, listing: b.listing }).text || "";
    lines.push(tail.replace(/^-\n\n/, ""));
  } else lines.push(`▶ 매물 자세히 보기\n${b.detailUrl || "https://www.gongsilnews.com"}`);
  const tags = (article.keywords || []).map((k: string) => `#${String(k).replace(/^#+/, "").replace(/\s+/g, "")}`).filter((t: string) => t.length > 1 && !(col && /공실뉴스/.test(t))).slice(0, 10);
  return { seconds: L.gwYtSpeechSeconds(all), chars: L.gwYtCharCount(all), description: { text: lines.filter(Boolean).join("\n\n"), tags } };
}

/** 요청 하나 — op 에 따라 */
export function studioWebOp(op: string, b: any): Record<string, unknown> {
  switch (op) {
    case "options": return b.column === true ? colOptions() : options(b.vacancy);
    // 공실열람 상세 읽기 (앱 inject/gongsil-page.js) — 화면이 숨은 창(iframe)에 넣어 매물 정보를 읽는다
    case "pageScript": return { script: STUDIO_EXT_FILES["studio/gongsil-page.js"] || "" };
    case "allPrompt": return allPrompt(b);
    case "marketingPrompt": return marketingPrompt(b);
    case "marketingParse": return marketingParse(b);
    case "allParse": return allParse(b);
    case "layout": return { media: layout(Array.isArray(b.media) ? b.media : [], Number(b.paragraphCount) || 0) };
    case "revisePrompt": return { prompt: revisePrompt(b) };
    case "imagePrompt": return imagePrompt(b);
    case "imageStyleText": { // 기사용 그림 스타일의 조건 글 (사진 모음 [AI 이미지 만들기] — 앱 main.js mediaOp 와 같다)
      const S = (colOf(b) || b.column === true ? lib.nm() : lib.prompt()).GW_IMAGE_STYLE || {};
      return { text: String((S[b.style] || {}).prompt || "") };
    }
    case "reviseParse": return reviseParse(b);
    case "snsCompose": return { channels: snsCompose(b) };
    case "snsPick": return { media: snsPick(b) };
    case "naverBlocks": return naverBlocks(b);
    case "ytView": return ytView(b);
    default: throw new Error("알 수 없는 요청입니다.");
  }
}
