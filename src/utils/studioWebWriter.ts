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
  prompt: () => run(["gongsil/prompt.js"], ["gwBuildPrompt", "gwBuildRevisePrompt", "GW_KIND", "GW_AUCTION_KIND", "GW_LENGTH", "GW_IMAGE_STYLE"]),
  blog: () => run(["gongsil/blog-prompt.js"]),
  aj: () => run(["gongsil/article-json.js"]),
  naver: () => run(["gongsil/naver-blog.js"]),
  sns: () => run(["gongsil/blog-prompt.js", "gongsil/naver-blog.js", "gongsil/youtube-json.js", "gongsil/sns-prompt.js"], ["GW_SNS_CHANNELS", "GW_SNS_ORDER", "gwBuildSnsPrompt", "gwBuildSnsRevisePrompt", "gwSnsParse", "gwSnsCompose", "gwSnsPickMedia", "gwSnsAiLabelNote"]),
  yt: () => run(["gongsil/prompt.js", "gongsil/youtube-json.js", "gongsil/youtube-prompt.js"], [...YT_COMMON, "GW_YT_AUCTION_VIDEO_TYPE", "gwYtVideoTypes"]),
  ytCol: () => run(["newsmaker/youtube-json.js", "newsmaker/youtube-prompt.js"], [...YT_COMMON, "GW_YT_NUMBER"]),
};

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
const YT_DEFAULTS = { duration: "short", tone: "news", number: "hangul" };
function ytOptions(vacancy: any) {
  const L = lib.yt();
  const types = L.gwYtVideoTypes(vacancy || null);
  const table = (t: Record<string, any>, extra: (v: any) => object = () => ({})) => Object.entries(t).map(([id, v]) => ({ id, label: v.label, ...extra(v) }));
  return {
    videoTypes: table(types, (v) => ({ structure: v.structure })),
    durations: table(L.GW_YT_DURATION, (v) => ({ chars: v.chars, seconds: v.seconds })),
    tones: table(L.GW_YT_TONE),
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
function allPrompt(b: any) {
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
  if (want.youtube) parts.push(["youtube", "유튜브 대본", ytPrompt(v, ytSet!, REF)]);
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
function ytPrompt(vacancy: any, settings: Record<string, string>, article: any) {
  const number = lib.ytCol().GW_YT_NUMBER[settings.number] || lib.ytCol().GW_YT_NUMBER.hangul;
  return `${lib.yt().gwBuildYtScriptPrompt({ vacancy, article }, settings)}\n\n[숫자 표기]\n- ${number.prompt}`;
}

/* 기사·블로그 답 → 제목·부제·문단·키워드 */
function docOf(parsed: any) {
  const a = parsed.article;
  return { title: a.title, subtitles: a.subtitles || [], paragraphs: lib.naver().splitParagraphs(a.body), keywords: a.keywords || [] };
}
function ytOf(text: string) {
  const r = lib.yt().GWYoutubeJson.parseObject(text);
  if (!r.ok) throw new Error(r.reason || "대본을 읽지 못했습니다.");
  const d = r.data || {};
  const list = Array.isArray(d.narration || d.script || d.text) ? d.narration || d.script || d.text : String(d.narration || d.script || d.text || "").split(/\n{2,}/);
  const narration = list.map((p: unknown) => String(p || "").trim()).filter(Boolean);
  if (!narration.length) throw new Error("AI 답변에 원고가 없습니다. 다시 써 주세요.");
  return { title: String(d.title || "").trim(), titles: (Array.isArray(d.titles) ? d.titles : []).map((t: unknown) => String(t || "").trim()).filter(Boolean).slice(0, 3), narration };
}
function allParse(b: any) {
  const o = outer(b.text);
  if (!o) return { ok: false, error: "AI 답을 읽지 못했어요. 답이 다 나온 뒤 코드 상자의 [복사]를 눌러 주세요." };
  const keys: string[] = Array.isArray(b.keys) ? b.keys : [];
  if (!keys.every((k) => o[k] && typeof o[k] === "object")) return { ok: false, error: `답에 ${keys.filter((k) => !(o[k] && typeof o[k] === "object")).map((k) => ({ article: "기사", blog: "블로그", sns: "SNS", youtube: "대본" } as Record<string, string>)[k] || k).join("·")} 글이 없어요. 답이 다 나온 뒤 복사해 주세요.` };
  const AJ = lib.aj();
  const out: Record<string, unknown> = {};
  const miss: string[] = [];
  if (keys.includes("article")) { const p = AJ.parse(fence(o.article)); if (p.ok) out.article = docOf(p); else miss.push("기사"); }
  if (keys.includes("blog")) { const p = AJ.parse(fence(o.blog)); if (p.ok) out.blog = docOf(p); else miss.push("블로그"); }
  if (keys.includes("sns")) { const p = lib.sns().gwSnsParse(fence(o.sns)); if (p.ok) out.sns = p.posts; else miss.push("SNS"); }
  if (keys.includes("youtube")) { try { out.youtube = ytOf(fence(o.youtube)); } catch { miss.push("유튜브 대본"); } }
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
function revisePrompt(b: any) {
  const v = b.vacancy || {};
  const req = String(b.request || "").trim();
  if (!req) throw new Error("어떻게 고칠지 적어 주세요.");
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
  if (b.doc === "article" || b.doc === "blog") {
    const p = lib.aj().parse(b.text);
    if (!p.ok) return { ok: false, error: p.reason || "AI 답변을 읽지 못했습니다." };
    return { ok: true, doc: docOf(p) };
  }
  if (b.doc === "sns") {
    const p = lib.sns().gwSnsParse(b.text);
    if (!p.ok || !p.posts[b.channel]) return { ok: false, error: (p && p.reason) || "고친 글을 읽지 못했습니다." };
    return { ok: true, post: p.posts[b.channel] };
  }
  if (b.doc === "youtube") {
    try { return { ok: true, script: ytOf(b.text) }; } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
  }
  return { ok: false, error: "알 수 없는 글입니다." };
}

/* ── SNS 글 끝(링크·매물 정보 출처·해시태그) · 사진 고르기 (앱 sns-writer forWeb · pickMedia) ── */
function snsCompose(b: any) {
  const S = lib.sns();
  const ctx = { noun: b.noun || "매물", url: (b.listing && b.listing.detailUrl) || "", listing: b.listing || null };
  const out: Record<string, unknown> = {};
  for (const ch of CHANNELS) {
    const post = b.posts?.[ch] || null;
    const ai = (b.ai?.[ch] || []).map((x: boolean) => ({ ai: Boolean(x) }));
    out[ch] = { composed: post ? S.gwSnsCompose(ch, post, ctx) : { posts: [], text: "" }, aiNote: S.gwSnsAiLabelNote(ch, ai) };
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
function naverBlocks(b: any) {
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
  if (b.listing) {
    const tail = lib.sns().gwSnsCompose("facebook", { body: "-" }, { noun: "매물", url: b.listing.detailUrl, listing: b.listing }).text || "";
    lines.push(tail.replace(/^-\n\n/, ""));
  } else lines.push(`▶ 매물 자세히 보기\n${b.detailUrl || "https://www.gongsilnews.com"}`);
  const tags = (article.keywords || []).map((k: string) => `#${String(k).replace(/^#+/, "").replace(/\s+/g, "")}`).filter((t: string) => t.length > 1).slice(0, 10);
  return { seconds: L.gwYtSpeechSeconds(all), chars: L.gwYtCharCount(all), description: { text: lines.filter(Boolean).join("\n\n"), tags } };
}

/** 요청 하나 — op 에 따라 */
export function studioWebOp(op: string, b: any): Record<string, unknown> {
  switch (op) {
    case "options": return options(b.vacancy);
    // 공실열람 상세 읽기 (앱 inject/gongsil-page.js) — 화면이 숨은 창(iframe)에 넣어 매물 정보를 읽는다
    case "pageScript": return { script: STUDIO_EXT_FILES["studio/gongsil-page.js"] || "" };
    case "allPrompt": return allPrompt(b);
    case "allParse": return allParse(b);
    case "layout": return { media: layout(Array.isArray(b.media) ? b.media : [], Number(b.paragraphCount) || 0) };
    case "revisePrompt": return { prompt: revisePrompt(b) };
    case "reviseParse": return reviseParse(b);
    case "snsCompose": return { channels: snsCompose(b) };
    case "snsPick": return { media: snsPick(b) };
    case "naverBlocks": return naverBlocks(b);
    case "ytView": return ytView(b);
    default: throw new Error("알 수 없는 요청입니다.");
  }
}
