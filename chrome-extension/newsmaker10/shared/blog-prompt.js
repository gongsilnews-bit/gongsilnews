/* ══════════════════════════════════════════════════════════════
   네이버 블로그 초안 전용 프롬프트 (뉴스메이커)

   기사 작성 프롬프트와 분리한다. 블로그에서 스타일이나 분량을 바꿔도
   2번 '초안 다듬기'의 기사 프롬프트에는 아무 영향이 없다.

   input = { article, source }  — article 은 2번의 공실뉴스 기사, source 는 1번의 소재(뉴스·주제)
   ══════════════════════════════════════════════════════════════ */

const GW_BLOG_LENGTH = {
  short:  { label: "짧게", chars: "700~1,000자", paras: "5~7개" },
  normal: { label: "중간", chars: "1,500~2,000자", paras: "9~12개" },
  long:   { label: "길게", chars: "2,500~3,500자", paras: "14~20개" },
};

const GW_BLOG_STYLE = {
  info: {
    label: "기본 정보형",
    fit: "모든 주제",
    titleExample: "전세 계약 전 꼭 확인할 3가지, 달라진 기준 정리",
    guide:
      "깔끔하고 정보 중심으로 쓴다. 제목과 첫 문단에서 무엇에 관한 글인지 분명히 보여 주고, " +
      "본문은 핵심 내용, 배경, 생활에 미치는 영향, 확인할 점의 순서로 정리한다.",
    design: "basic",
    structure:
      "소제목 3~4개, 명사형으로 짧게 (예: ■ 무엇이 달라졌나 / ■ 누구에게 해당되나 / ■ 확인할 점). " +
      "핵심 요약 → 내용 → 영향 → 확인할 점 순서",
  },
  story: {
    label: "스토리텔링형",
    fit: "생활·재테크",
    titleExample: "월세 사는 30대 직장인이라면, 이번 변화 무엇이 달라질까?",
    guide:
      "독자가 실제로 겪을 법한 생활 장면이나 한 가지 질문으로 시작한다. " +
      "사례는 '예를 들어 ~라고 가정하면'처럼 가정임을 밝히고, 실재하는 사람인 것처럼 꾸미지 않는다.",
    design: "magazine",
    structure:
      "소제목 1~2개, 질문형 (예: ■ 그래서 내 생활은 무엇이 바뀔까?). " +
      "상황 제시 → 질문 → 확인된 사실로 해답 순서. 소제목보다 문단 흐름을 중시",
  },
  qna: {
    label: "Q&A 해설형",
    fit: "제도·법률·세금",
    titleExample: "새 임대차 제도, 세입자가 가장 많이 묻는 5가지",
    guide:
      "독자가 실제로 궁금해할 질문을 뽑아 하나씩 답하는 해설 글로 쓴다. 부드러운 존댓말은 허용하지만 " +
      "권유하지 말고, 사실과 확인할 점을 객관적으로 짚는다.",
    design: "qna",
    structure:
      "소제목 3~5개, 독자가 물어볼 질문형 (예: ■ 언제부터 적용되나요? / ■ 기존 계약도 해당되나요?). " +
      "각 소제목 바로 다음 문단이 그 질문에 대한 답",
  },
  report: {
    label: "분석·리포트형",
    fit: "정책·시장·경제",
    titleExample: "금리 동결 이후 부동산 시장, 쟁점을 하나씩 살펴보니",
    guide:
      "배경, 핵심 쟁점, 영향, 남은 과제를 균형 있게 분석한다. " +
      "자료에 없는 전망 수치·시세·수익률을 추정하지 않는다.",
    design: "news",
    structure:
      "소제목 4~5개, 명사형으로 고정 (■ 배경 / ■ 핵심 쟁점 / ■ 누구에게 어떤 영향 / ■ 앞으로 확인할 점). " +
      "각 구역은 1~2문단",
  },
  tips: {
    label: "생활 꿀팁형",
    fit: "생활정보·실무 요령",
    titleExample: "이사 전날 꼭 챙길 체크리스트 7가지",
    guide:
      "읽고 바로 따라 할 수 있는 요령을 순서대로 정리한다. 각 요령마다 왜 필요한지 한두 문장으로 이유를 붙이고, " +
      "과장된 효과나 확인되지 않은 수치는 쓰지 않는다.",
    design: "basic",
    structure:
      "소제목 4~7개, 번호 없이 행동형으로 짧게 (예: ■ 계약서 특약부터 확인하기). " +
      "각 소제목 뒤에 1문단으로 방법과 이유",
  },
  shortform: {
    label: "숏폼·속보형",
    fit: "SNS 연계 소식",
    titleExample: "[속보] 내년부터 달라지는 청약 기준 한눈에",
    guide:
      "속보 기사처럼 첫 두 문장에 무엇이 어떻게 됐는지를 짧게 전한다. 문장을 짧게 끊고 사실만 빠르게 전달하되, " +
      "낚시성 표현·과도한 감탄·확인되지 않은 단정은 쓰지 않는다.",
    design: "basic",
    structure:
      "소제목 0~2개, 한 줄로 짧게. 강한 첫 두 문장 → 핵심 3가지 → 한 줄 정리. " +
      "문단은 1~2문장으로 짧게 끊을 것",
  },
};

function gwBlogArticleText(article) {
  const a = article || {};
  const subtitles = Array.isArray(a.subtitles) ? a.subtitles : [];
  return [
    `[제목] ${String(a.title || "").trim()}`,
    subtitles.length ? `[부제] ${subtitles.join(" / ")}` : "",
    `[본문]\n${String(a.body || "").trim()}`,
  ].filter(Boolean).join("\n");
}

/* 소재 요약 — 뉴스면 원문 출처, 주제면 참고 메모. 원문 본문은 다시 넣지 않는다 (기사에 이미 녹아 있다) */
function gwBlogSourceLines(source) {
  const s = source || {};
  if (s.mode === "news" && s.news) {
    return [
      `- 소재: 뉴스 기사`,
      `- 원문 언론사: ${s.news.publisher || "확인 안 됨"}`,
      `- 원문 제목: ${s.news.title || ""}`,
    ].join("\n");
  }
  if (s.mode === "complex" || s.mode === "local") {
    return [
      `- 소재: ${s.mode === "complex" ? "아파트 단지" : "동네"} 실거래 시세${typeof gwSourceLabel === "function" ? ` — ${gwSourceLabel(s)}` : ""}`,
      "- 자료: 국토교통부 실거래가 공개시스템 (신고 기준, 최근 거래는 집계 중)",
      "- 숫자는 [참조 기사]에 있는 것만 쓰고, 본문에서 \"국토교통부 실거래가에 따르면\"처럼 출처를 한 번 밝힐 것",
    ].join("\n");
  }
  const t = s.topic || {};
  const memo = String(t.memo || "").trim();
  return [`- 소재: 주제 — ${String(t.subject || "").trim()}`, memo ? `- 참고 메모: ${memo}` : ""]
    .filter(Boolean)
    .join("\n");
}

function gwBuildBlogPrompt(input, opts) {
  const src = input || {};
  const o = opts || {};
  const style = GW_BLOG_STYLE[o.style] || GW_BLOG_STYLE.info;
  const length = GW_BLOG_LENGTH[o.length] || GW_BLOG_LENGTH.normal;
  const source = src.source || {};
  const isNews = source.mode === "news" && source.news;
  const publisher = (isNews && source.news.publisher) || "원문 언론사";

  return `당신은 생활·경제 정보를 정확하고 읽기 쉽게 풀어쓰는 네이버 블로그 전문 에디터입니다.
아래 공실뉴스 기사를 참고해 블로그 초안 1건을 작성하십시오.

[참조 기사 — 공실뉴스]
${gwBlogArticleText(src.article)}

[소재 정보]
${gwBlogSourceLines(source)}

[선택한 스타일] ${style.label}
- 잘 맞는 주제: ${style.fit}
- 제목 방향 예시: ${style.titleExample}
- 작성 지침: ${style.guide}
- 구성: ${style.structure}

[글자 수]
- 본문 ${length.chars}
- 문단 ${length.paras}
- 같은 내용을 반복해 분량을 억지로 늘리지 말 것

[전달 원칙 — 모든 스타일 공통, 가장 먼저 지킬 것]
- 이 글은 공실뉴스가 독자에게 전하는 객관적인 정보 글입니다. 위 스타일은 전개 방식만 정하고 이 틀은 바꾸지 않습니다
- 기본·분석·속보형은 기사체(~다), 스토리텔링·Q&A·꿀팁형은 부드러운 존댓말(~습니다)도 허용
- 광고·호객 표현 금지: "추천합니다", "문의하세요", "놓치지 마세요", "지금이 기회", "강력 추천" 등
- 독자에게 무엇을 사라·팔라고 권하지 말 것. 조언이 필요하면 "~라면 ~를 확인할 필요가 있다"처럼 쓸 것
${isNews ? `- 본문에서 "${publisher} 보도에 따르면"처럼 원문 출처를 한 번 이상 밝힐 것 (원문 링크는 글 끝 "참고 자료"에 자동으로 들어갑니다)
- 원문 기사의 문장을 그대로 옮기지 말 것` : "- 링크는 본문에 쓰지 말 것"}

[가장 중요한 사실 원칙]
- 숫자·날짜·금액·기관명·인물명·제도 이름은 [참조 기사]에 실제로 있는 내용만 쓸 것
- 기사에 없는 수치·통계·전망·인터뷰·후기·현장 방문을 만들어내지 말 것
- 실재하지 않는 인물·업체·기관을 만들지 말 것. 사례가 필요하면 가정한 사례임을 밝힐 것

[블로그 구성]
- title: 검색어를 억지로 나열하지 않은 자연스러운 제목 1개. 선택한 스타일을 분명히 반영할 것
- body: 모바일에서도 읽기 쉽도록 한 문단을 2~4문장으로 짧게 구성할 것
- 첫 문단은 2문장 이내의 핵심 요약으로 쓸 것 (인사말 없이 바로 본론). 이 문단은 블로그 맨 위 요약으로 쓰입니다
- 소제목은 위 [선택한 스타일]의 구성대로 넣고, 한 줄짜리 독립 문단으로 쓰며 반드시 "■ "로 시작할 것
  ("■"는 소제목 위치를 알리는 표시이며 화면 모양은 블로그 디자인이 따로 정합니다)
- 소제목 바로 다음에는 반드시 본문 문단이 올 것 (소제목을 연달아 쓰거나 글 맨 끝에 두지 말 것)
- 마지막 문단은 핵심과 확인할 점을 객관적으로 정리하는 한 문단으로 쓸 것
- 기사 문장을 그대로 길게 복사하지 말고 블로그 독자를 위한 새 문장으로 재구성할 것
- keywords: 검색용 핵심어 7~12개. # 기호는 제외할 것

[출력 형식]
설명이나 인사말 없이 아래 JSON 하나만 \`\`\`json 코드블록으로 출력하십시오.
- body는 문단별 문자열 배열입니다. 배열 한 항목에 문단 하나만 넣으십시오.
- 문자열 안에 실제 줄바꿈을 넣지 말고, 마지막 항목 뒤에 쉼표를 넣지 마십시오.
- 인터넷 검색을 했더라도 출처 표시(cite 기호)·각주 번호·링크·참고 문헌 목록은 본문에 넣지 마십시오. 문장만 쓰십시오.
- 출력 전에 JSON.parse가 가능한지 확인하십시오.

\`\`\`json
{
  "title": "",
  "body": ["첫 문단", "둘째 문단"],
  "keywords": []
}
\`\`\``;
}

function gwBuildBlogRevisePrompt(request) {
  return `위에서 작성한 블로그 글을 아래 요청대로 고쳐 주십시오.

요청: ${String(request || "").trim()}

[지킬 것]
- 앞서 제공한 기사의 숫자·날짜·이름·기관명 등 사실은 바꾸거나 새로 만들지 마십시오.
- 사용자의 수정 요청을 반영하되 과장 광고, 허위 후기·인터뷰·통계를 만들지 마십시오.
- 소제목 문단은 처음처럼 "■ "로 시작하고, 첫 문단은 핵심 요약으로 유지하십시오.
- 광고·호객 표현을 넣지 말고, 원문 출처 표기가 있었다면 유지하십시오.
- 고친 블로그 글 전체를 다시 출력하십시오. 수정된 부분만 출력하지 마십시오.
- 설명 없이 처음과 같은 JSON 형식의 \`\`\`json 코드블록 하나만 출력하십시오.
- body는 문단별 문자열 배열이며 JSON.parse가 가능한 유효한 JSON이어야 합니다.

\`\`\`json
{
  "title": "",
  "body": ["첫 문단", "둘째 문단"],
  "keywords": []
}
\`\`\``;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    GW_BLOG_LENGTH,
    GW_BLOG_STYLE,
    gwBlogArticleText,
    gwBlogSourceLines,
    gwBuildBlogPrompt,
    gwBuildBlogRevisePrompt,
  };
}
