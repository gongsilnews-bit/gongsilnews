/* ══════════════════════════════════════════════════════════════
   3 · SNS 작성 — 페이스북 · 인스타그램 · 스레드

   - AI 에 한 번 요청해 세 플랫폼 글을 함께 받는다 (무료 체험도 "SNS" 1번).
   - 블로그와 같은 객관 보도 원칙: "공실뉴스에 이런 매물이 나왔다". 스레드만 말투를 대화체로.
   - 링크·출처(표시·광고 필수 정보)·해시태그는 AI 가 아니라 코드가 붙인다 (gwSnsCompose).
   - 사진은 2번 기사 사진을 플랫폼별로 다시 고르고 비율대로 자른다 (gwSnsPickMedia · sns.js).
   기획: docs/2026-10-03_sns_writer_tabs_meeting.md
   ══════════════════════════════════════════════════════════════ */

const GW_SNS_CHANNELS = {
  facebook: {
    label: "페이스북",
    badge: "Facebook",
    homeUrl: "https://www.facebook.com/",
    ratio: 1, // 정사각 1:1
    ratioText: "정사각 1:1",
    size: [1080, 1080],
    maxMedia: 10,
    maxChars: 0, // 사실상 제한 없음
    maxTags: 5,
  },
  instagram: {
    label: "인스타그램",
    badge: "Instagram",
    homeUrl: "https://www.instagram.com/",
    ratio: 4 / 5, // 세로 4:5
    ratioText: "세로 4:5",
    size: [1080, 1350],
    maxMedia: 10,
    maxChars: 2200,
    maxTags: 30,
  },
  threads: {
    label: "스레드",
    badge: "Threads",
    homeUrl: "https://www.threads.com/",
    ratio: 0, // 원본 비율
    ratioText: "원본 비율",
    size: [1600, 1600],
    maxMedia: 10,
    maxChars: 500, // 글 하나마다
    maxTags: 1,
  },
};

const GW_SNS_ORDER = ["facebook", "instagram", "threads"];

function gwSnsNoun(vacancy) {
  return vacancy && vacancy.saleKind ? "물건" : "매물";
}

function gwBuildSnsPrompt(source) {
  const input = source || {};
  const noun = gwSnsNoun(input.vacancy);
  const auction = noun === "물건";
  const office = auction ? "" : String((input.vacancy && input.vacancy.office) || "").trim();
  const landlord = auction || office ? "" : String((input.vacancy && input.vacancy.landlord) || "").trim();
  /* 일반 매물은 "정보 글" — 부동산 티를 내지 않는다 (2026-10-29 사장님). 경매·공매는 예전처럼 공실뉴스 소식 */
  const lead = auction
    ? `- "공실뉴스에 이런 ${noun}이 나왔다"는 객관적인 물건 소식입니다. 광고 문구가 아닙니다`
    : `- 이 글은 동네·집 정보를 전하는 "정보 글"입니다. 광고·매물 소개 글처럼 보이지 않게 쓸 것
- 중개사무소 이름·"중개"·"중개사"·"매물을 소개합니다"·"저희"·"문의" 같은 부동산 영업 표현을 본문·제목·해시태그에 쓰지 말 것. "공실뉴스"도 쓰지 말 것
- 주어는 집과 동네입니다 (예: "논현동에 전세 5억 아파트가 있다", "언주역과 신논현역 사이 생활권이다")
- 정보가 중심입니다: 위치·교통(역·노선)·생활권·건물(준공·세대수·층)·집 구조·관리비·입주 시기, 그리고 계약 전 확인할 점을 차례로 담을 것 (자료에 있는 것만)
- 홍보용 꾸밈말을 쓰지 말 것: "최고", "완벽", "강추", "핫한", "역대급", "놓치면 후회", "꿀매물", "가성비 갑" 등. 담담한 정보 말투로
- 물건번호·공실광고번호는 본문에 쓰지 말 것 (글 끝에 자동으로 붙습니다)
- 중개보수·공동중개 같은 중개 조건은 쓰지 말 것
- 연락처·링크·홈페이지·사무소 정보는 쓰지 말 것 (글 끝에 법에 필요한 표시만 작게 자동으로 붙습니다)${landlord ? `
- 집주인이 직접 내놓은 물건이라는 점은 마지막 줄에 한 번만` : ""}`;

  return `당신은 ${auction ? "부동산 정보를 정확하게 전하는 공실뉴스의 SNS 에디터" : "동네·집 정보를 정확하고 짧게 전하는 SNS 에디터"}입니다.
아래 참조 기사와 확인된 ${noun} 정보로 페이스북·인스타그램·스레드 글을 한 번에 작성하십시오.
세 글은 같은 사실을 전하지만 플랫폼마다 모양이 다릅니다. 같은 문장을 돌려 쓰지 마십시오.

[참조 기사]
${gwBlogArticleText(input.article)}

[확인된 ${noun} 정보]
${gwBlogFactLines(input.vacancy)}

[보도 원칙 — 세 플랫폼 공통, 가장 먼저 지킬 것]
${lead}
- 권유·호객·광고 표현 금지: "보세요", "추천합니다", "문의하세요", "연락 주세요", "DM 주세요", "놓치지 마세요", "급매", "지금이 기회", "역대급" 등
- 금액·면적·층·주소·관리비·입주일·주차·옵션 등 고유 조건은 위 두 자료에 실제로 있는 것만 쓸 것. 두 자료가 다르면 [확인된 ${noun} 정보]를 우선
- 면적은 평을 먼저 쓰고 ㎡는 바로 뒤 괄호에 쓰십시오. 예: 32평(105.6㎡). 자료에 평이 함께 적혀 있으면 그 숫자를 그대로 쓰고, ㎡만 있으면 ㎡ ÷ 3.3058을 소수 첫째 자리까지 반올림해 평으로 쓰십시오. ㎡만 따로 쓰지 마십시오.
- 없는 수치·시세·수익률·개발 호재·현장 방문·고객 반응을 만들지 말 것. 자료에 없는 거리·도보 시간도 만들지 말 것
- 소재지가 동까지만 공개됐다면 더 자세한 주소를 추측하지 말 것
- 연락처·링크·홈페이지·"프로필 링크" 안내는 쓰지 말 것 (글 끝에 자동으로 붙습니다)

[페이스북 — facebook]
- 정보 전달형. 첫 문단 1~2문장이 피드에서 "더 보기" 전에 보이는 곳이므로 무엇이 어디에 어떤 조건으로 나왔는지 결론부터
- 문단 3~5개, 문단마다 2~3문장, 전체 300~600자. 기사체 또는 부드러운 존댓말
- 순서: 결론 → 위치·면적·금액 → 특징 → 주변 교통·생활 정보 → 확인할 점 한 문장
- hashtags: 3~5개 (지역명·${noun} 종류 중심)

[인스타그램 — instagram]
- 사진이 주인공이고 글은 짧은 설명입니다. 한 줄에 정보 하나
- lines 첫 줄: 25자 안팎의 훅 (지역 + ${noun} 핵심, 이모지 1개). 예: "양재역 인근 36평 사무실 📍"
- 이어서 핵심 정보 3~5줄, 줄마다 알맞은 이모지 하나로 시작 (📍 위치 · 📐 면적 · 💰 금액 · 🚇 교통 · ✅ 특징 · 🏢 건물 등)
- 마지막 1~2줄: 조건을 객관적으로 정리하는 한 문장
- 전체 lines 6~10줄, 500자 이내
- hashtags: 8~12개 (지역·동네·${noun} 종류·용도·거래 형태). 띄어쓰기 없이

[스레드 — threads]
- 말하듯 쓰는 짧은 글. 부드러운 존댓말 대화체(~네요, ~입니다)는 허용하되 사실 원칙은 같습니다
- posts 첫 글: 450자 이내. 이것만 읽어도 무엇이 어디에 얼마로 나왔는지 알 수 있게
- 첫 글은 독자의 생각을 묻는 질문 한 문장으로 끝낼 것 (예: "이 조건이면 어떤 팀에 맞을까요?"). 문의·연락을 유도하는 질문은 금지
- 이어 쓰기 글 0~2개 (posts 둘째·셋째 항목): 교통·주변·확인할 점. 글마다 300자 이내
- topic: 주제 태그 1개 (지역+${noun} 종류, 예: "양재역사무실")

[출력 형식]
설명이나 인사말 없이 아래 JSON 하나만 \`\`\`json 코드블록으로 출력하십시오.
- 배열 한 항목에 문단(줄·글) 하나만 넣고, 문자열 안에 실제 줄바꿈을 넣지 마십시오.
- hashtags·topic 에는 # 기호를 넣지 마십시오. 마지막 항목 뒤에 쉼표를 넣지 마십시오.
- 출력 전에 JSON.parse가 가능한지 확인하십시오.

\`\`\`json
{
  "facebook": { "paragraphs": ["첫 문단", "둘째 문단"], "hashtags": [] },
  "instagram": { "lines": ["훅 한 줄", "📍 ..."], "hashtags": [] },
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
- 앞서 제공한 금액·면적·층·주소 등 사실은 바꾸거나 새로 만들지 마십시오.
- 처음의 보도 원칙(권유·호객 표현 금지, 연락처·링크 쓰지 않기)과 ${info.label} 형식 규칙을 그대로 지키십시오.

[출력 형식]
설명 없이 아래 모양의 JSON 하나만 \`\`\`json 코드블록으로 출력하십시오. 문자열 안에 실제 줄바꿈을 넣지 마십시오.
\`\`\`json
${shape}
\`\`\``;
}

/* ── AI 답변 → 편집용 모양 ──
   facebook: { body: "문단\n\n문단", hashtags: [] }
   instagram: { body: "줄\n줄", hashtags: [] }
   threads: { posts: ["글", …], topic: "" }
   답변에 있는 플랫폼만 돌려준다 (수정 답변은 하나만 온다). */
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
  const parsed = GWYoutubeJson.parseObject(raw); // ```json 상자 꺼내기·깨진 JSON 고치기는 유튜브와 같다
  if (!parsed.ok) return parsed;
  const posts = gwSnsNormalize(parsed.data);
  if (!posts) return { ok: false, reason: "페이스북·인스타그램·스레드 글을 찾지 못했습니다." };
  return { ok: true, posts, repaired: parsed.repaired };
}

/* ── 글 끝에 붙는 것: 링크 · 출처(표시·광고 필수 정보) · 해시태그 ──
   출처 문구는 블로그와 같다 (GWNaverBlog.sourceBlockLines). */
function gwSnsSourceText(listing, noun) {
  if (!listing) return "";
  const { lines } = GWNaverBlog.sourceBlockLines(listing, "");
  return listing.saleKind ? [`[${noun} 정보 출처]`, ...lines].join("\n") : lines.join("\n"); // 일반 매물은 제목 없이 작게 (2026-10-29)
}

function gwSnsCompose(channel, post, ctx) {
  const c = ctx || {};
  const noun = c.noun || "매물";
  /* 내 부동산을 앞세운다 — 홈페이지를 쓰는 회원은 링크도 내 홈페이지, 물건 맡기기 안내까지 (2026-10-29 사장님).
     무료 회원은 홈페이지를 언급하지 않는다 (GWNaverBlog.homepageOf 가 "") */
  const L = c.listing || null;
  const home = L ? GWNaverBlog.homepageOf(L) : "";
  const url = L && c.url ? GWNaverBlog.listingUrl(null, { ...L, detailUrl: c.url }) : c.url || "";
  const office = L && L.owner && L.owner.type === "agency" ? L.owner.name : "";
  const landlordPost = Boolean(L && L.owner && L.owner.type === "general" && !L.saleKind); // 임대인 직접 등록 — "공실뉴스에서" 대신 그냥 "자세히 보기"
  // 링크 문구는 중립적으로 — 사무소 이름을 앞세우지 않는다 (2026-10-29 사장님: 정보 느낌). 경매·공매만 예전처럼 공실뉴스
  const where = L && L.saleKind ? "공실뉴스" : office || landlordPost ? "" : "공실뉴스";
  const homeLine = home && !(L && L.saleKind) ? `▶ 이 동네 다른 집 보기 · 내 집 내놓기\n${home}` : "";
  const source = gwSnsSourceText(c.listing, noun);
  const tagLine = (tags) => GWNaverBlog.infoTags(tags || [], c.listing).map((tag) => `#${tag}`).join(" ");
  const clean = (t) => GWNaverBlog.infoText(t, c.listing); // 정보 글 — 부동산 티 지우기 (2026-10-29)

  if (channel === "threads") {
    const posts = (post?.posts || []).map((text) => clean(String(text || "").trim())).filter(Boolean);
    if (!posts.length) return { posts: [], text: "" };
    if (post.topic) posts[0] = `${posts[0]}\n\n#${post.topic}`;
    const tail = [url ? `▶ ${where ? `${where}에서 ` : ""}물건 상세 확인하기\n${url}` : "", homeLine, source].filter(Boolean).join("\n\n");
    if (tail) {
      const last = posts.length - 1;
      if (posts[last].length + tail.length + 2 <= GW_SNS_CHANNELS.threads.maxChars) posts[last] = `${posts[last]}\n\n${tail}`;
      else posts.push(tail);
    }
    return { posts, text: posts.join("\n\n―――\n\n") };
  }

  const body = clean(String(post?.body || "").trim());
  if (!body) return { posts: [], text: "" };
  const parts = [body];
  if (channel === "instagram") {
    /* 인스타 캡션의 링크는 눌리지 않는다 — 프로필 링크 안내를 먼저, 주소는 복사해 갈 수 있게 글자로 함께 */
    parts.push(url
      ? `물건 상세 확인하기 → 프로필 링크 🔗\n${url}`
      : `물건 상세 확인하기 → 프로필 링크 🔗`);
  } else if (url) {
    parts.push(`▶ ${where ? `${where}에서 ` : ""}물건 상세 확인하기\n${url}`);
  }
  if (homeLine) parts.push(homeLine);
  if (source) parts.push(source);
  const tags = tagLine(post.hashtags);
  if (tags) parts.push(tags);
  const text = parts.join("\n\n");
  return { posts: [text], text };
}

/* ── 사진 고르기: 2번 기사 사진 → 플랫폼별 순서·장수 ──
   - 실제 사진(대표 먼저) → 공실목록 캡처(proof) → 지도·로드뷰 카드 → AI 이미지 순.
   - 플랫폼 허용 장수(페이스북 4, 스레드 4, 인스타 10)까지 최대한 담고, 화면에서 직접 고르거나 뺄 수 있게 한다.
   - 대표(1번)는 실제 사진이 있으면 반드시 실제 사진 — AI 이미지로 매물 사진을 대신하지 않는다. */
function gwSnsIsAi(item) {
  return Boolean(item && item.kind === "ai" && !item.real);
}

function gwSnsPickMedia(channel, media) {
  const info = GW_SNS_CHANNELS[channel] || GW_SNS_CHANNELS.facebook;
  const list = (Array.isArray(media) ? media : []).filter((item) => item && item.url);
  const isCard = (item) => item.kind === "map" || item.kind === "roadview";
  const isProof = (item) => item.kind === "proof";
  const real = list.filter((item) => !gwSnsIsAi(item) && !isCard(item) && !isProof(item));
  real.sort((a, b) => Number(Boolean(b.isCover)) - Number(Boolean(a.isCover)));
  const proofs = list.filter(isProof);
  const cards = list.filter(isCard);
  const ai = list.filter(gwSnsIsAi);
  return [...real, ...proofs, ...cards, ...ai]
    .slice(0, info.maxMedia)
    .map((item) => ({ url: item.url, kind: item.kind || "photo", caption: item.caption || "", ai: gwSnsIsAi(item) }));
}

/* 1번(대표) 자리에 AI 이미지를 둘 수 있는가 — 실제 사진이 하나라도 있으면 안 된다 */
function gwSnsCanLead(list, index) {
  const item = list && list[index];
  if (!item || !item.ai) return true;
  return !list.some((other) => other && !other.ai);
}

/* AI 이미지가 올라갈 사진에 섞여 있으면 "게시할 때 AI 레이블을 켜세요" 안내.
   메타(페이스북·인스타·스레드)의 AI 레이블은 사진·영상용이라, 실제 사진만 올리면 켤 필요가 없다. */
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
    GW_SNS_CHANNELS, GW_SNS_ORDER, gwBuildSnsPrompt, gwBuildSnsRevisePrompt,
    gwSnsNormalize, gwSnsParse, gwSnsCompose, gwSnsPickMedia, gwSnsCanLead, gwSnsCleanTags, gwSnsAiLabelNote,
  };
}
