/* ══════════════════════════════════════════════════════════════
   뉴스메이커 기사 프롬프트 — 기사 기본틀은 여기 한 곳에만 있다

   소재(source)는 네 가지다.
   - news    : 가져온 뉴스 원문. 사실만 뽑아 공실뉴스 기사로 "완전히 새로" 쓴다 (원문 문장 옮기기 금지, 출처 표기)
   - complex : 아파트 단지 이름 → 국토부 실거래가로 계산한 표 (shared/market-prompt.js)
   - local   : 동 이름 → 그 동네 아파트 실거래 흐름 (shared/market-prompt.js)
   - topic   : 사용자가 넣은 주제와 참고 메모. 확정된 일반 지식과 메모의 사실로 쓴다 (수치·인물·통계 지어내기 금지)

   source = {
     mode: "news" | "complex" | "local" | "topic",
     complex: { query, data, view, asking },  local: { query, data, themes[] },   // market-prompt.js 머리말
     news: { title, publisher, publishedAt, url, body, truncated } | null,
     topic: { subject, intro, points[], outro, memo },   // 서론·본론(여러 개)·결론은 비워도 된다
     angle: "",                    // 추가로 바라는 관점·요청 (두 소재 공통)
     section1: "부동산·경제" | … | "자유",
     section2: "" | 2차 섹션,
   }
   섹션 표는 shared/sections.js 에 있다.
   ══════════════════════════════════════════════════════════════ */

/* 소재가 쓸 만큼 준비됐는가 */
const gwIsMarket = (source) => Boolean(source && (source.mode === "complex" || source.mode === "local"));

function gwSourceReady(source) {
  if (!source) return false;
  if (gwIsMarket(source)) return gwMarketReady(source); // shared/market-prompt.js
  if (source.mode === "news") return Boolean(source.news && source.news.title && source.news.body);
  return Boolean(source.topic && String(source.topic.subject || "").trim());
}

/* 소재 한 줄 이름 — 화면 표시·이미지 프롬프트용 */
function gwSourceLabel(source) {
  if (!source) return "";
  if (gwIsMarket(source)) return gwMarketLabel(source);
  if (source.mode === "news" && source.news) {
    return `${source.news.publisher ? `[${source.news.publisher}] ` : ""}${source.news.title}`;
  }
  return String((source.topic && source.topic.subject) || "").trim();
}

/* 뉴스 보도일을 "2026년 9월 29일"처럼 — 못 읽으면 원래 글자 그대로 */
function gwNewsDate(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

/* 소재를 프롬프트에 넣을 글로 */
function gwSourceText(source) {
  const s = source || {};
  if (gwIsMarket(s)) return gwMarketText(s);
  const angle = String(s.angle || "").trim();
  const angleText = angle ? `\n\n[추가 요청 — 사용자가 바라는 관점]\n${angle}` : "";

  if (s.mode === "news" && s.news) {
    const n = s.news;
    return `[원문 기사 — 사실 자료]
- 언론사: ${n.publisher || "확인 안 됨"}
- 원문 제목: ${n.title}
${n.publishedAt ? `- 보도일: ${gwNewsDate(n.publishedAt)}\n` : ""}- 원문 본문${n.truncated ? " (길어서 앞부분만 옮김)" : ""}:
${n.body}${angleText}`;
  }

  const t = s.topic || {};
  const memo = String(t.memo || "").trim();
  const outline = gwOutlineText(t);
  return `[주제]
${String(t.subject || "").trim()}
${outline ? `\n[글 뼈대 — 사용자가 정한 순서]\n${outline}\n` : ""}
[참고 메모 — 사용자가 준 자료]
${memo || "없음 — 널리 확정된 일반 지식으로만 쓸 것"}${angleText}`;
}

/* 주제의 서론·본론·결론 칸 — 채운 칸만 모은다 */
function gwOutlinePoints(topic) {
  return (Array.isArray(topic && topic.points) ? topic.points : [])
    .map((point) => String(point || "").trim())
    .filter(Boolean);
}

function gwHasOutline(topic) {
  const t = topic || {};
  return Boolean(String(t.intro || "").trim() || String(t.outro || "").trim() || gwOutlinePoints(t).length);
}

function gwOutlineText(topic) {
  if (!gwHasOutline(topic)) return "";
  const t = topic || {};
  const empty = "(비워 둠 — 주제에 맞게 직접 채울 것)";
  const lines = [`- 서론: ${String(t.intro || "").trim() || empty}`];
  const points = gwOutlinePoints(t);
  if (points.length) points.forEach((point, i) => lines.push(`- 본론 ${i + 1}: ${point}`));
  else lines.push(`- 본론: ${empty}`);
  lines.push(`- 결론: ${String(t.outro || "").trim() || empty}`);
  return lines.join("\n");
}

/* ── 섹션 지시 ── 자유면 AI 가 고르고, 1차만 골랐으면 2차를 AI 가 고른다 */
function gwSectionText(source) {
  const s = source || {};
  const first = s.section1;
  if (!first || first === GW_SECTION_FREE || !GW_SECTIONS[first]) {
    return `[공실뉴스 섹션] 아래 목록에서 이 기사에 가장 맞는 1차·2차 섹션을 하나씩 골라 JSON 의 section1·section2 에 목록 글자 그대로 쓰십시오.
${gwSectionMenuText()}`;
  }
  if (!s.section2) {
    return `[공실뉴스 섹션] ${first}
- 글 성격: ${gwSectionGuide(first)}
- 2차 섹션은 다음 중 가장 맞는 것을 골라 JSON 의 section2 에 글자 그대로 쓰십시오: ${gwSubSectionNames(first).join(" / ")}
- section1 에는 "${first}" 를 그대로 쓰십시오.`;
  }
  return `[공실뉴스 섹션] ${first} > ${s.section2}
- 글 성격: ${gwSectionGuide(first, s.section2)}
- JSON 의 section1 에는 "${first}", section2 에는 "${s.section2}" 를 그대로 쓰십시오.`;
}

/* ══════════════════════════════════════════════════════════════
   분량과 기사 스타일 — 작업창에서 고른다
   ══════════════════════════════════════════════════════════════ */
const GW_LENGTH = {
  short:  { label: "짧게",  chars: "700~1,000자",   paras: "4~5개",   sections: "3~4개" },
  normal: { label: "보통",  chars: "1,400~1,800자", paras: "7~9개",   sections: "5~6개" },
  long:   { label: "길게",  chars: "2,800~3,500자", paras: "12~16개", sections: "7~9개" },
};

const GW_KIND = {
  news: {
    label: "뉴스기사형",
    brief: "도입부터 결론까지 문단이 자연스럽게 이어지는 뉴스 기사입니다. 핵심 사실, 배경, 독자 생활에 미치는 영향, 확인할 점을 기사 흐름 안에서 풀어 주십시오.",
  },
  summary: {
    label: "단락별 요약",
    brief: "첫 문단에서 기사 전체를 요약한 뒤, 핵심 내용을 '■ 소제목' 단위로 나누어 독자가 내용을 빠르게 훑어볼 수 있게 작성하십시오.",
  },
};

function gwBodyStyle(o, len) {
  return o.kind === "summary"
    ? `- 첫 문단은 소제목 없이 기사 전체 핵심을 요약한 리드문으로 쓰십시오.
- 그 다음부터는 반드시 "■ 소제목"을 한 줄에 단독으로 쓰고, 바로 다음 줄에 해당 내용을 설명하는 문단을 쓰십시오.
- "■ 소제목 + 설명 문단" 묶음을 ${len.sections}로 구성하십시오.
- 소제목 앞에는 정확히 ■ 기호 하나만 쓰십시오. ##, 번호, 불릿 목록, 굵은 글씨 표시는 쓰지 마십시오.`
    : `- 일반 뉴스 기사처럼 도입부터 결론까지 자연스러운 문단으로 이어 쓰십시오.
- 본문 중간에 소제목, ■ 기호, 번호, 불릿 목록을 넣지 마십시오.`;
}

/* 기사 JSON 모양 — 섹션을 맨 앞에 둔다 (JSON 이 깨져 느슨하게 읽을 때도 섹션을 찾을 수 있게) */
const GW_ARTICLE_SHAPE = `\`\`\`json
{
  "section1": "",
  "section2": "",
  "title": "",
  "subtitle1": "",
  "subtitle2": "",
  "subtitle3": "",
  "body": ["첫 문단", "둘째 문단"],
  "keywords": []
}
\`\`\``;

const GW_ARTICLE_OUTPUT = `[출력 형식]
설명이나 인사말 없이, 아래 JSON 하나만 \`\`\`json 코드블록으로 출력하십시오.
- body는 반드시 JSON 배열이어야 하며, 각 문단과 "■ 소제목" 한 줄을 각각 별도 문자열 항목으로 넣으십시오.
- 문자열 항목 안에 실제 줄바꿈을 넣지 마십시오. 문단 구분은 배열 항목으로만 표현하십시오.
- 모든 문자열은 큰따옴표로 감싸고, 마지막 항목 뒤에 쉼표를 넣지 마십시오.
- 인터넷 검색을 했더라도 출처 표시(cite 기호)·각주 번호·링크·참고 문헌 목록은 본문에 넣지 마십시오. 문장만 쓰십시오.
- 출력 전에 JSON.parse가 가능한 유효한 JSON인지 괄호와 쉼표를 확인하십시오.

${GW_ARTICLE_SHAPE}`;

/* ── 소재별 사실 원칙 ── */
function gwNewsRules(news) {
  const publisher = (news && news.publisher) || "원문 언론사";
  return `════════ 세 가지 원칙을 지키십시오 ════════

【사실 구역】 [원문 기사]에 적힌 것
- 숫자·날짜·금액·비율·기관명·인물명·지명·정책 이름은 원문과 한 글자도 다르게 쓰지 마십시오.
- 원문에 없는 사실·수치·일정을 추측해 더하지 마십시오. 없으면 그 이야기를 아예 하지 마십시오.
- 발언 인용은 원문에 실제로 있는 발언만, 누가 한 말인지 밝혀서 쓰십시오. 원문에 없는 전문가·관계자 발언을 만들지 마십시오.

【새로 쓰기 — 저작권 원칙】   ★ 가장 먼저 지킬 것
- 원문 기사의 문장·문단 구성·제목·리드를 그대로 옮기지 마십시오. 사실만 뽑아 공실뉴스 기자가 처음부터 다시 쓴 기사여야 합니다.
- 원문과 같은 표현이 연달아 10어절 넘게 이어지지 않게 하십시오.
- 본문 안에서 "${publisher} 보도에 따르면"처럼 출처를 한 번 이상 밝히십시오.
- 마지막 문단 끝에 "(참고: ${publisher} 보도)"를 한 줄로 붙이십시오.

【해설 구역】 기자로서 쓰는 부분   ★ 기사 분량의 절반 가까이를 여기에 쓰십시오
- 이 소식이 독자의 집·돈·일·생활에 어떤 의미인지
- 소식을 이해하는 데 필요한 배경 지식과 제도 설명
- 비슷한 상황의 독자가 확인해 볼 점
해설 구역에서도 원문에 없는 구체적 수치 예측("3개월 안에 10% 오른다"), 단정("반드시", "확실하다"), 특정 시점 시세를 아는 것처럼 쓰는 것은 금지합니다.`;
}

/* 글 뼈대가 있으면 그 순서와 내용을 따르게 한다. 단락별 요약이면 본론 하나가 ■ 소제목 하나 */
function gwOutlineRules(topic, o) {
  if (!gwHasOutline(topic)) return "";
  const points = gwOutlinePoints(topic);
  const headings = o.kind === "summary" && points.length
    ? `\n- 단락별 요약이므로 본론 ${points.length}개를 각각 "■ 소제목" 하나로 삼으십시오. 소제목은 그 본론 내용을 짧게 줄인 말로 쓰고, 서론은 첫 리드 문단, 결론은 마지막 문단으로 쓰십시오.`
    : "";
  return `【글 뼈대】   ★ 반드시 지키십시오
- [글 뼈대]의 순서 그대로 서론 → 본론${points.length > 1 ? ` 1~${points.length}` : ""} → 결론으로 쓰십시오. 순서를 바꾸거나 항목을 빼지 마십시오.
- 사용자가 적은 칸은 그 내용을 중심으로 살을 붙여 풀어 쓰십시오. 적힌 말을 그대로 옮기지 말고 기사 문장으로 다듬으십시오.
- 비워 둔 칸은 주제와 앞뒤 흐름에 맞게 직접 채우십시오.
- 분량은 본론에 가장 많이 쓰고, 본론끼리는 비슷한 길이로 나누십시오.${headings}

`;
}

function gwTopicRules(topic, o) {
  return `${gwOutlineRules(topic, o || {})}════════ 두 가지 원칙을 지키십시오 ════════

【사실 원칙】
- [참고 메모]에 있는 사실·숫자는 그대로 쓰고 바꾸지 마십시오.
- 메모에 없는 구체적 수치는 법정 기준처럼 널리 확정된 것만 쓰십시오.
  금리·시세·최근 통계·개정 예정 제도처럼 시점에 따라 바뀌는 수치는 지어내지 마십시오.
  꼭 필요하면 "최신 수치는 관계 기관 발표로 확인할 필요가 있다"처럼 확인을 권하는 문장으로 대신하십시오.
- 실재하지 않는 인물·전문가·기관·업체·설문조사·통계를 만들지 마십시오. 인터뷰한 것처럼 쓰지 마십시오.
- 이해를 돕는 사례가 필요하면 "예를 들어 ~라고 가정하면"처럼 가정한 사례임을 분명히 밝히십시오.

【재미와 쓸모】   ★ 독자가 끝까지 읽게 하십시오
- 첫 문단은 독자가 "내 얘기네" 하고 느낄 생활 장면이나 질문으로 여십시오. 낚시성 과장은 쓰지 마십시오.
- 어려운 용어는 처음 나올 때 쉬운 말로 풀어 주십시오.
- 읽고 나서 바로 써먹을 수 있는 확인 요령·순서·주의할 점을 담으십시오.`;
}

/* ══════════════════════════════════════════════════════════════
   기사 작성 프롬프트
   ══════════════════════════════════════════════════════════════ */
function gwBuildPrompt(source, opts) {
  const s = source || {};
  const o = opts || {};
  const len = GW_LENGTH[o.length] || GW_LENGTH.normal;
  const kind = GW_KIND[o.kind] || GW_KIND.news;
  const isNews = s.mode === "news";
  const isMarket = gwIsMarket(s);
  const intro = isMarket ? gwMarketIntro(s)
    : isNews
      ? "아래 원문 기사의 사실을 바탕으로, 공실뉴스 독자를 위한 기사 1건을 새로 작성하십시오."
      : "아래 주제로 공실뉴스 독자에게 흥미롭고 실생활에 유익한 기사 1건을 작성하십시오.";

  return `당신은 생활·경제 전문 매체 "공실뉴스"의 기자입니다.
${intro}

${gwSourceText(s)}

${gwSectionText(s)}

${isMarket ? gwMarketRules(s) : isNews ? gwNewsRules(s.news) : gwTopicRules(s.topic, o)}

[기사 스타일] ${kind.label}
${kind.brief}

[분량]   ★ 반드시 지키십시오
- 본문 전체 ${len.chars}
- 문단 ${len.paras}
- 분량이 모자라면 해설(의미·배경·확인할 점)을 더 쓰십시오. 같은 사실을 반복해 길이를 채우지 마십시오.

[문체]
- 평서체 기사체 ("~했습니다" 아닌 "~했다")
- 과장·광고 표현, 독자에게 직접 권하는 2인칭 문장("~하세요")을 쓰지 마십시오. 조언은 "~라면 ~를 확인할 필요가 있다"처럼 쓰십시오.

[구성]
- title     : 25~45자. 핵심을 담은 자연스러운 제목. 낚시성 물음·과장 금지
- subtitle  : 세 줄. 각 30~50자, 마침표 없이 끝낼 것. 기사 핵심을 세 갈래로 나눠 요약
- body      : 위 분량대로 쓴 문단별 문자열 배열. 배열 항목 하나가 문단 하나이며 HTML 태그를 쓰지 말 것
${gwBodyStyle(o, len)}
- keywords  : 5~8개. # 없이 낱말만. 검색에 쓰일 핵심어

${GW_ARTICLE_OUTPUT}`;
}

/* ══════════════════════════════════════════════════════════════
   수정 요청 — 같은 대화에 이어 붙인다 (AI 가 앞서 쓴 기사와 소재를 기억하고 있다)
   ══════════════════════════════════════════════════════════════ */
function gwBuildRevisePrompt(request, source) {
  const keep = gwIsMarket(source)
    ? `- 실거래 자료의 금액·면적·층·건수·날짜·비율은 바꾸거나 새로 만들지 마십시오. "국토교통부 실거래가" 출처 표기는 유지하십시오.
- 인용·가격 전망·매수 권유를 새로 넣지 마십시오.`
    : source && source.mode === "news"
      ? `- [원문 기사]의 숫자·날짜·이름·기관명은 바꾸거나 새로 만들지 마십시오.
- 원문 문장을 그대로 옮기지 말고, 출처 표기("${(source.news && source.news.publisher) || "원문 언론사"} 보도에 따르면", 마지막 줄 참고 표기)는 유지하십시오.`
      : `- [참고 메모]의 사실은 바꾸지 말고, 실재하지 않는 인물·통계·수치를 새로 만들지 마십시오.`;
  return `위에서 작성한 기사를 아래 요청대로 고쳐 주십시오.

요청: ${request}

[지킬 것]
${keep}
- 그 밖에는 요청하신 대로 자유롭게 고치십시오.
  분량을 늘리라고 하면 실제로 그만큼 늘리십시오. 앞서 드린 분량 지시는 이 요청으로 대체됩니다.
- section1·section2 는 처음 값을 그대로 두십시오.
- 설명이나 인사말 없이, 고친 기사 전체를 처음과 똑같은 JSON 형식으로 \`\`\`json 코드블록 하나에 다시 출력하십시오.
- body는 문자열 하나가 아니라 문단별 문자열 배열입니다. 배열 항목 하나에 문단 하나만 넣으십시오.
- 배열 항목 안에 실제 줄바꿈을 넣지 말고, 후행 쉼표 없이 JSON.parse가 가능한 유효한 JSON인지 확인하십시오.

${GW_ARTICLE_SHAPE}`;
}

/* ══════════════════════════════════════════════════════════════
   기사 이미지 만들기

   기사 본문에 밀착한 장면을 요구하되, 작업창에서 스타일이나 기사 일부를
   직접 지정할 수 있다. 입력이 없으면 AI 가 본문에서 핵심 장면을 고른다.
   ══════════════════════════════════════════════════════════════ */
const GW_IMAGE_STYLE = {
  /* AI 추천 — 아래 다섯 가지 가운데 본문 내용에 가장 맞는 것을 AI 가 고른다. 초안의 자동 대표 이미지도 이것을 쓴다 */
  auto: {
    label: "AI 추천",
    prompt: "",
  },
  news: {
    label: "보도 실사",
    prompt: "한국 언론사의 현장 취재 사진처럼 자연스럽고 사실적인 장면. 과장 없는 담담한 조명과 구도.",
  },
  life: {
    label: "생활 현장",
    prompt: "기사 내용이 실제로 벌어지는 한국의 일상 공간(집·가게·사무실·거리)을 담은 사실적인 생활 사진. 따뜻하고 자연스러운 빛.",
  },
  city: {
    label: "도시·건물",
    prompt: "한국 도시의 건물·거리·주거지 풍경을 넓게 담은 사실적인 보도사진. 특정 건물이 드러나지 않는 일반적인 풍경.",
  },
  animation: {
    label: "애니메이션 일러스트",
    prompt: "생활·경제 기사에 어울리는 세련된 애니메이션풍 편집 일러스트. 특정 작품이나 작가의 화풍을 모방하지 말고 독창적으로 표현.",
  },
  infographic: {
    label: "통계 도표·인포그래픽",
    prompt: "기사에 쓰는 깔끔한 데이터 인포그래픽. 기사에 나온 숫자만 시각화하고, 비교 자료가 없으면 추세나 비교 그래프를 만들지 말고 핵심 수치 카드 형태로 구성.",
  },
};

/* AI 추천일 때 고를 수 있는 스타일 목록 */
function gwImageStyleMenu() {
  return Object.entries(GW_IMAGE_STYLE)
    .filter(([key]) => key !== "auto")
    .map(([, style]) => `- ${style.label}: ${style.prompt}`)
    .join("\n");
}

/* opts = { style, request, cover }
   cover: 초안이 나오자마자 자동으로 만드는 대표 이미지 — 기사 전체를 대표하는 장면 한 장 */
function gwBuildImagePrompt(source, article, opts) {
  const o = opts || {};
  const auto = !GW_IMAGE_STYLE[o.style] || o.style === "auto";
  const style = auto ? GW_IMAGE_STYLE.auto : GW_IMAGE_STYLE[o.style];
  const request = String(o.request || "").trim();
  const articleText = [article && article.title, article && article.body]
    .filter(Boolean)
    .join("\n")
    .trim();
  const focus = (request || articleText || gwSourceLabel(source)).slice(0, 1600);
  const focusRule = request
    ? "아래 입력이 기사 문장이면 그중 시각적으로 표현할 핵심 장면을 고르고, 연출 지시이면 그대로 반영하십시오."
    : o.cover
      ? "이 이미지는 기사 맨 위에 들어가는 대표 이미지입니다. 아래 기사 본문을 읽고, 기사 전체 내용을 한눈에 보여 주는 장면 하나를 스스로 골라 만드십시오."
      : "아래 기사 내용에서 가장 시각적으로 전달력이 높은 한 가지 핵심을 스스로 골라 장면으로 만드십시오.";
  const styleText = auto
    ? `[스타일] 아래 가운데 기사 본문 내용에 가장 잘 맞는 것 하나를 스스로 고르십시오.
${gwImageStyleMenu()}
- 기사에 비교할 숫자가 여럿 있을 때만 통계 도표·인포그래픽을 고르십시오.`
    : `[선택한 스타일] ${style.label}
${style.prompt}`;
  const textRule = o.style === "infographic"
    ? "- 한글 문구는 꼭 필요한 짧은 항목명만 쓰고, 숫자와 단위는 기사에 나온 것과 정확히 일치시킬 것"
    : auto
      ? "- 통계 도표를 고른 경우가 아니면 이미지 안에 글자, 숫자, 로고, 워터마크를 넣지 말 것. 통계 도표라면 기사 숫자와 정확히 일치시킬 것"
      : "- 이미지 안에 글자, 숫자, 로고, 워터마크를 넣지 말 것";

  return `위 기사에 넣을 ${o.cover ? "대표 " : ""}이미지 1장을 만들어 주십시오.

${styleText}

[이미지로 표현할 내용]
${focusRule}
${focus}

[기본 장면 정보]
- 기사 제목: ${(article && article.title) || gwSourceLabel(source)}
- 배경: 대한민국

[조건]
- ${o.ratio || "가로 16:9"} 비율
- 기사에 없는 숫자, 통계, 건물명, 업체명, 시설을 만들지 말 것
- 비교 수치나 증감률이 없으면 임의의 그래프, 비율, 순위를 만들지 말 것
${textRule}
- 실존 인물의 얼굴, 알아볼 수 있는 사람 얼굴, 존재하지 않는 상호·간판 이름을 넣지 말 것
- 뉴스 원문 사진을 흉내 내거나 베끼지 말고 새로 구성할 것
- 사용자가 입력한 요청은 반영하되, 기사 사실과 충돌하면 사실을 우선할 것

이미지 1장만 출력하고 설명은 붙이지 마십시오.`;
}

/* AI 이미지 설명글 — 기사 본문에 그대로 들어간다 */
function gwAiImageCaption(article) {
  const title = String((article && article.title) || "").trim();
  return title ? `${title} (AI 생성 이미지)` : "기사 내용을 바탕으로 만든 AI 생성 이미지";
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    GW_LENGTH,
    GW_KIND,
    GW_IMAGE_STYLE,
    gwSourceReady,
    gwSourceLabel,
    gwSourceText,
    gwSectionText,
    gwNewsDate,
    gwHasOutline,
    gwOutlineText,
    gwBuildPrompt,
    gwBuildRevisePrompt,
    gwBuildImagePrompt,
    gwAiImageCaption,
  };
}
