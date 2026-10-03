/* ══════════════════════════════════════════════════════════════
   3 · SNS 작성 — 페이스북 · 인스타그램 · 스레드 (뉴스메이커)

   기사작성기 V30(gongsilwriter30)의 SNS 와 같은 모양. 다른 점:
   - 매물 광고가 아니라 중개사무소 출처(표시·광고 필수 정보)를 붙이지 않는다.
     대신 소재에 맞는 출처 줄을 붙인다 — 뉴스: "출처: ○○ 보도 재구성", 시세: "자료: 국토교통부 실거래가", 주제: "공실뉴스".
   - 링크는 "발행한 기사 주소"를 넣으면 그 주소, 아니면 공실뉴스 홈.
   - 시세표 그림(kind "chart")은 자르지 않고 여백을 넣어 맞춘다 (sns.js).
   - 링크·출처·해시태그는 AI 가 아니라 코드가 붙인다 (gwSnsCompose).
   기획: docs/2026-10-03_sns_writer_tabs_meeting.md
   ══════════════════════════════════════════════════════════════ */

const GW_SNS_CHANNELS = {
  facebook: {
    label: "페이스북", badge: "Facebook", homeUrl: "https://www.facebook.com/",
    ratio: 1, ratioText: "정사각 1:1", size: [1080, 1080], maxMedia: 10, maxChars: 0, maxTags: 5,
  },
  instagram: {
    label: "인스타그램", badge: "Instagram", homeUrl: "https://www.instagram.com/",
    ratio: 4 / 5, ratioText: "세로 4:5", size: [1080, 1350], maxMedia: 10, maxChars: 2200, maxTags: 30,
  },
  threads: {
    label: "스레드", badge: "Threads", homeUrl: "https://www.threads.com/",
    ratio: 0, ratioText: "원본 비율", size: [1600, 1600], maxMedia: 10, maxChars: 500, maxTags: 1,
  },
};

const GW_SNS_ORDER = ["facebook", "instagram", "threads"];
const GW_SNS_HOME = "https://www.gongsilnews.com";

const gwSnsIsMarket = (source) => Boolean(source && (source.mode === "complex" || source.mode === "local"));

/* 소재에 맞는 원칙 한 줄 */
function gwSnsSourceRule(source) {
  const s = source || {};
  if (s.mode === "news" && s.news) {
    return `- 원문 뉴스(${s.news.publisher || "원문 언론사"})의 문장을 그대로 옮기지 말고 새 문장으로 쓸 것. 원문에 없는 사실·숫자·발언을 만들지 말 것`;
  }
  if (gwSnsIsMarket(s)) {
    return "- 금액·건수·비율·날짜는 [참조 기사]에 있는 숫자만 쓸 것. 계산해 새 숫자를 만들지 말고, 가격 전망·매수 권유를 쓰지 말 것";
  }
  return "- [참조 기사]에 없는 최신 수치·통계·인물·발언을 만들지 말 것";
}

function gwBuildSnsPrompt(source) {
  const input = source || {};
  return `당신은 생활·경제 정보를 정확하게 전하는 공실뉴스의 SNS 에디터입니다.
아래 공실뉴스 기사로 페이스북·인스타그램·스레드 글을 한 번에 작성하십시오.
세 글은 같은 내용을 전하지만 플랫폼마다 모양이 다릅니다. 같은 문장을 돌려 쓰지 마십시오.

[참조 기사 — 공실뉴스]
${gwBlogArticleText(input.article)}

[소재 정보]
${gwBlogSourceLines(input.source)}

[원칙 — 세 플랫폼 공통, 가장 먼저 지킬 것]
- 공실뉴스 기사를 소개하는 글입니다. 광고·호객 표현 금지: "꼭 보세요", "추천합니다", "놓치지 마세요", "지금이 기회", "역대급" 등
${gwSnsSourceRule(input.source)}
- 링크·출처·"프로필 링크" 안내는 쓰지 말 것 (글 끝에 자동으로 붙습니다)
- 어려운 용어는 쉬운 말로 한 번 풀어 줄 것

[페이스북 — facebook]
- 기사 소개형. 첫 문단 1~2문장이 피드에서 "더 보기" 전에 보이는 곳이므로 핵심부터
- 문단 3~5개, 문단마다 2~3문장, 전체 300~600자. 기사체 또는 부드러운 존댓말
- hashtags: 3~5개

[인스타그램 — instagram]
- 사진이 주인공이고 글은 짧은 설명입니다. 한 줄에 정보 하나
- lines 첫 줄: 25자 안팎의 훅 (핵심 + 이모지 1개)
- 이어서 핵심 내용 3~5줄, 줄마다 알맞은 이모지 하나로 시작
- 마지막 1~2줄: 내용을 객관적으로 정리하는 한 문장
- 전체 lines 6~10줄, 500자 이내
- hashtags: 8~12개. 띄어쓰기 없이

[스레드 — threads]
- 말하듯 쓰는 짧은 글. 부드러운 존댓말 대화체(~네요, ~입니다)는 허용하되 원칙은 같습니다
- posts 첫 글: 450자 이내. 이것만 읽어도 핵심을 알 수 있게
- 첫 글은 독자의 생각을 묻는 질문 한 문장으로 끝낼 것. 구매·가입·문의를 유도하는 질문은 금지
- 이어 쓰기 글 0~2개 (posts 둘째·셋째 항목): 배경·확인할 점. 글마다 300자 이내
- topic: 주제 태그 1개

[출력 형식]
설명이나 인사말 없이 아래 JSON 하나만 \`\`\`json 코드블록으로 출력하십시오.
- 배열 한 항목에 문단(줄·글) 하나만 넣고, 문자열 안에 실제 줄바꿈을 넣지 마십시오.
- hashtags·topic 에는 # 기호를 넣지 마십시오. 마지막 항목 뒤에 쉼표를 넣지 마십시오.
- 출력 전에 JSON.parse가 가능한지 확인하십시오.

\`\`\`json
{
  "facebook": { "paragraphs": ["첫 문단", "둘째 문단"], "hashtags": [] },
  "instagram": { "lines": ["훅 한 줄", "📌 ..."], "hashtags": [] },
  "threads": { "posts": ["첫 글"], "topic": "" }
}
\`\`\``;
}

/* 플랫폼 하나만 고친다 — 고친 플랫폼만 같은 JSON 모양으로 받는다 */
function gwBuildSnsRevisePrompt(channel, request) {
  const info = GW_SNS_CHANNELS[channel] || GW_SNS_CHANNELS.facebook;
  const shape = {
    facebook: '{ "facebook": { "paragraphs": [], "hashtags": [] } }',
    instagram: '{ "instagram": { "lines": [], "hashtags": [] } }',
    threads: '{ "threads": { "posts": [], "topic": "" } }',
  }[channel] || '{ "facebook": { "paragraphs": [], "hashtags": [] } }';
  return `위에서 작성한 SNS 글 중 [${info.label}] 글만 아래 요청대로 고쳐 주십시오. 다른 플랫폼 글은 출력하지 마십시오.

요청: ${String(request || "").trim()}

[지킬 것]
- 기사에 있는 사실·숫자는 바꾸거나 새로 만들지 마십시오.
- 처음의 원칙(광고·호객 표현 금지, 링크 쓰지 않기)과 ${info.label} 형식 규칙을 그대로 지키십시오.

[출력 형식]
설명 없이 아래 모양의 JSON 하나만 \`\`\`json 코드블록으로 출력하십시오. 문자열 안에 실제 줄바꿈을 넣지 마십시오.
\`\`\`json
${shape}
\`\`\``;
}

/* ── AI 답변 → 편집용 모양 (V30 과 같다) ── */
function gwSnsCleanTags(tags, max) {
  const seen = new Set();
  return (Array.isArray(tags) ? tags : String(tags || "").split(/[\s,]+/))
    .map((tag) => String(tag || "").replace(/^#+/, "").replace(/\s+/g, "").trim())
    .filter((tag) => tag && !seen.has(tag) && seen.add(tag))
    .slice(0, max || 30);
}

function gwSnsLines(value) {
  return (Array.isArray(value) ? value : String(value || "").split(/\n+/))
    .map((line) => String(line == null ? "" : line).trim())
    .filter(Boolean);
}

function gwSnsNormalize(data) {
  if (!data || typeof data !== "object") return null;
  const out = {};
  const fb = data.facebook;
  if (fb && typeof fb === "object") {
    const paragraphs = gwSnsLines(fb.paragraphs || fb.text || fb.body);
    if (paragraphs.length) out.facebook = { body: paragraphs.join("\n\n"), hashtags: gwSnsCleanTags(fb.hashtags, GW_SNS_CHANNELS.facebook.maxTags) };
  }
  const ig = data.instagram;
  if (ig && typeof ig === "object") {
    const lines = gwSnsLines(ig.lines || ig.caption || ig.body);
    if (lines.length) out.instagram = { body: lines.join("\n"), hashtags: gwSnsCleanTags(ig.hashtags, GW_SNS_CHANNELS.instagram.maxTags) };
  }
  const th = data.threads;
  if (th && typeof th === "object") {
    const posts = gwSnsLines(th.posts || th.text || th.body);
    if (posts.length) out.threads = { posts, topic: gwSnsCleanTags([th.topic], 1)[0] || "" };
  }
  return Object.keys(out).length ? out : null;
}

function gwSnsParse(raw) {
  const parsed = GWYoutubeJson.parseObject(raw);
  if (!parsed.ok) return parsed;
  const posts = gwSnsNormalize(parsed.data);
  if (!posts) return { ok: false, reason: "페이스북·인스타그램·스레드 글을 찾지 못했습니다." };
  return { ok: true, posts, repaired: parsed.repaired };
}

/* ── 글 끝에 붙는 것: 출처 줄 · 링크 · 해시태그 ── */
function gwSnsCredit(source) {
  const s = source || {};
  if (s.mode === "news" && s.news) return `출처: ${s.news.publisher || "원문 언론사"} 보도 내용 재구성 · 공실뉴스`;
  if (gwSnsIsMarket(s)) return "자료: 국토교통부 실거래가 (신고 기준) · 공실뉴스 정리";
  return "공실뉴스";
}

/* ctx = { url, credit } — url 은 발행한 기사 주소 또는 공실뉴스 홈 */
function gwSnsCompose(channel, post, ctx) {
  const c = ctx || {};
  const url = c.url || GW_SNS_HOME;
  const credit = c.credit || "공실뉴스";
  const linkLine = url === GW_SNS_HOME ? `▶ 공실뉴스에서 더 보기\n${url}` : `▶ 공실뉴스 기사 전문 보기\n${url}`;
  const tagLine = (tags) => (tags || []).map((tag) => `#${tag}`).join(" ");

  if (channel === "threads") {
    const posts = (post?.posts || []).map((text) => String(text || "").trim()).filter(Boolean);
    if (!posts.length) return { posts: [], text: "" };
    if (post.topic) posts[0] = `${posts[0]}\n\n#${post.topic}`;
    const tail = `${linkLine}\n\n${credit}`;
    const last = posts.length - 1;
    if (posts[last].length + tail.length + 2 <= GW_SNS_CHANNELS.threads.maxChars) posts[last] = `${posts[last]}\n\n${tail}`;
    else posts.push(tail);
    return { posts, text: posts.join("\n\n―――\n\n") };
  }

  const body = String(post?.body || "").trim();
  if (!body) return { posts: [], text: "" };
  const parts = [body];
  /* 인스타 캡션의 링크는 눌리지 않는다 — 프로필 링크 안내를 먼저, 주소는 복사해 갈 수 있게 글자로 함께 */
  parts.push(channel === "instagram" ? `자세한 내용은 프로필 링크 → 공실뉴스\n${url}` : linkLine);
  parts.push(credit);
  const tags = tagLine(post.hashtags);
  if (tags) parts.push(tags);
  const text = parts.join("\n\n");
  return { posts: [text], text };
}

/* ── 사진 고르기 — AI 이미지가 아닌 것(시세표·직접 올린 사진) 먼저, 그다음 AI 이미지 ── */
function gwSnsIsAi(item) {
  return Boolean(item && item.kind === "ai" && !item.real);
}

function gwSnsPickMedia(channel, media) {
  const info = GW_SNS_CHANNELS[channel] || GW_SNS_CHANNELS.facebook;
  const list = (Array.isArray(media) ? media : []).filter((item) => item && item.url);
  const real = list.filter((item) => !gwSnsIsAi(item));
  real.sort((a, b) => Number(Boolean(b.isCover)) - Number(Boolean(a.isCover)));
  const ai = list.filter(gwSnsIsAi);
  ai.sort((a, b) => Number(Boolean(b.isCover)) - Number(Boolean(a.isCover)));
  return [...real, ...ai]
    .slice(0, info.maxMedia)
    .map((item) => ({ url: item.url, kind: item.kind || "upload", caption: item.caption || "", ai: gwSnsIsAi(item) }));
}

/* 1번(대표) 자리에 AI 이미지를 둘 수 있는가 — AI 가 아닌 사진이 하나라도 있으면 안 된다 */
function gwSnsCanLead(list, index) {
  const item = list && list[index];
  if (!item || !item.ai) return true;
  return !list.some((other) => other && !other.ai);
}

/* AI 이미지가 올라갈 사진에 섞여 있으면 "게시할 때 AI 레이블을 켜세요" */
const GW_SNS_AI_LABEL_WHERE = {
  facebook: "게시물 만들기 창의 이름 아래 [AI 레이블] 단추를 눌러 켜 주세요.",
  instagram: "공유하기 전 캡션 화면의 [고급 설정]에서 [AI 레이블 추가]를 켜 주세요.",
  threads: "게시하기 전 글쓰기 화면의 [AI 레이블] 설정을 켜 주세요.",
};

function gwSnsAiLabelNote(channel, media) {
  const info = GW_SNS_CHANNELS[channel];
  if (!info) return "";
  const count = (Array.isArray(media) ? media : []).slice(0, info.maxMedia).filter((item) => item && item.ai).length;
  if (!count) return "";
  return `AI로 만든 이미지 ${count}장이 들어 있습니다 — ${GW_SNS_AI_LABEL_WHERE[channel]}`;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    GW_SNS_CHANNELS, GW_SNS_ORDER, GW_SNS_HOME, gwBuildSnsPrompt, gwBuildSnsRevisePrompt,
    gwSnsNormalize, gwSnsParse, gwSnsCompose, gwSnsCredit, gwSnsPickMedia, gwSnsCanLead, gwSnsCleanTags, gwSnsAiLabelNote,
  };
}
