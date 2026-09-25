/* ══════════════════════════════════════════════════════════════
   네이버 블로그 초안 전용 프롬프트

   기사 작성 프롬프트와 분리한다. 블로그에서 스타일이나 분량을 바꿔도
   2번 '초안 다듬기'의 기사 프롬프트에는 아무 영향이 없다.
   ══════════════════════════════════════════════════════════════ */

const GW_BLOG_LENGTH = {
  short:  { label: "짧게", chars: "700~1,000자", paras: "5~7개" },
  normal: { label: "중간", chars: "1,500~2,000자", paras: "9~12개" },
  long:   { label: "길게", chars: "2,500~3,500자", paras: "14~20개" },
};

const GW_BLOG_STYLE = {
  listing: {
    label: "기본 매물소개형",
    fit: "모든 매물",
    titleExample: "논현동 아크로힐스 매매 15억, 3룸 남향",
    guide:
      "깔끔하고 정보 중심으로 쓴다. 제목과 첫 문단에서 지역·매물·거래 조건을 분명히 보여 주고, " +
      "본문은 핵심 조건, 입지, 내부 구성, 확인할 점의 순서로 정리한다.",
    design: "basic",
    structure:
      "소제목 3~4개, 명사형으로 짧게 (예: ■ 입지와 교통 / ■ 내부 구성 / ■ 계약 전 확인할 점). " +
      "핵심 요약 → 입지 → 내부 구성 → 확인할 점 순서",
  },
  visit: {
    label: "현장답사형",
    fit: "아파트·상가·빌딩",
    titleExample: "논현동에서 직접 살펴본 아크로힐스",
    guide:
      "현장을 차례로 둘러보는 듯한 흐름으로 쓴다. 다만 실제 방문·촬영·인터뷰를 했다고 거짓말하지 말고, " +
      "제공된 기사와 사진에서 확인할 수 있는 동선과 인상만 관찰형 문장으로 풀어낸다.",
    design: "magazine",
    structure:
      "소제목 3~5개, 둘러보는 동선 순서의 장소형 (예: ■ 단지 입구에서 / ■ 거실과 주방 / ■ 주변 거리). " +
      "바깥에서 안으로, 다시 주변으로 이어지는 흐름",
  },
  story: {
    label: "스토리텔링형",
    fit: "주택·아파트",
    titleExample: "강남에서 15억으로 찾는다면?",
    guide:
      "독자가 실제로 집이나 매물을 찾는 상황, 또는 한 가지 질문으로 시작한다. " +
      "과장된 허구의 고객 사례는 만들지 말고 확인된 조건을 따라 자연스럽게 해답을 제시한다.",
    design: "magazine",
    structure:
      "소제목 1~2개, 질문형 (예: ■ 15억이면 무엇을 먼저 봐야 할까?). " +
      "상황 제시 → 질문 → 확인된 조건으로 해답 순서. 소제목보다 문단 흐름을 중시",
  },
  report: {
    label: "분석·리포트형",
    fit: "빌딩·토지·투자매물",
    titleExample: "논현동 50억 건물, 조건을 하나씩 살펴보니",
    guide:
      "조건과 장점, 한계, 계약 전 확인 사항을 균형 있게 분석한다. " +
      "확인되지 않은 수익률·시세·개발 호재를 추정하지 않는다.",
    design: "news",
    structure:
      "소제목 4~5개, 명사형으로 고정 (■ 핵심 조건 / ■ 장점 / ■ 한계와 확인할 부분 / ■ 계약 전 체크포인트). " +
      "각 구역은 1~2문단",
  },
  consult: {
    label: "친근한 상담형",
    fit: "실수요 매물",
    titleExample: "방 3개 찾으셨다면 이 매물 한번 보세요",
    guide:
      "중개사가 고객에게 차분히 설명하듯 존댓말로 쓴다. 장점만 밀어붙이지 말고, " +
      "어떤 사람에게 잘 맞는지와 현장에서 확인할 점을 함께 알려 준다.",
    design: "qna",
    structure:
      "소제목 3~4개, 고객이 실제로 물어볼 질문형 (예: ■ 관리비는 얼마인가요? / ■ 주차는 가능한가요?). " +
      "각 소제목 바로 다음 문단이 그 질문에 대한 답",
  },
  shortform: {
    label: "숏폼·유튜브형",
    fit: "SNS 연계 매물",
    titleExample: "강남 15억 아파트, 내부 조건이 이렇습니다",
    guide:
      "첫 두 문장을 짧고 강하게 시작한다. 문장을 짧게 끊고 핵심 조건을 빠르게 전달하되, " +
      "낚시성 표현·과도한 감탄·확인되지 않은 단정은 쓰지 않는다.",
    design: "basic",
    structure:
      "소제목 0~2개, 한 줄로 짧게. 강한 첫 두 문장 → 핵심 조건 3가지 → 한 줄 정리. " +
      "문단은 1~2문장으로 짧게 끊을 것",
  },
};

function gwBlogFactLines(v) {
  if (!v || typeof v !== "object") return "- 별도 매물표 없음 — 아래 참조 기사에 나온 사실만 사용할 것";

  const lines = [];
  const seen = new Set();
  const push = (label, value) => {
    const val = value == null ? "" : String(value).trim();
    if (!label || !val || val === "-" || seen.has(label)) return;
    seen.add(label);
    lines.push(`- ${label}: ${val}`);
  };

  push("매물", v.title);
  push("금액", v.priceText);
  for (const field of v.fields || []) push(field.label, field.value);
  push("특징", Array.isArray(v.themes) ? v.themes.join(" ") : v.themes);
  push("주변환경", v.infra);
  return lines.length ? lines.join("\n") : "- 별도 매물표 없음 — 아래 참조 기사에 나온 사실만 사용할 것";
}

function gwBlogArticleText(article) {
  const a = article || {};
  const subtitles = Array.isArray(a.subtitles) ? a.subtitles : [];
  return [
    `[제목] ${String(a.title || "").trim()}`,
    subtitles.length ? `[부제] ${subtitles.join(" / ")}` : "",
    `[본문]\n${String(a.body || "").trim()}`,
  ].filter(Boolean).join("\n");
}

function gwBuildBlogPrompt(source, opts) {
  const input = source || {};
  const o = opts || {};
  const style = GW_BLOG_STYLE[o.style] || GW_BLOG_STYLE.listing;
  const length = GW_BLOG_LENGTH[o.length] || GW_BLOG_LENGTH.normal;
  const article = input.article || {};

  return `당신은 부동산 정보를 정확하고 읽기 쉽게 풀어쓰는 네이버 블로그 전문 에디터입니다.
아래 공실뉴스 기사와 확인된 매물 정보를 참고해 블로그 초안 1건을 작성하십시오.

[참조 기사]
${gwBlogArticleText(article)}

[확인된 매물 정보]
${gwBlogFactLines(input.vacancy)}

[선택한 스타일] ${style.label}
- 잘 맞는 매물: ${style.fit}
- 제목 방향 예시: ${style.titleExample}
- 작성 지침: ${style.guide}
- 구성: ${style.structure}

[글자 수]
- 본문 ${length.chars}
- 문단 ${length.paras}
- 같은 매물 조건을 반복해 분량을 억지로 늘리지 말 것

[가장 중요한 사실 원칙]
- 금액·면적·층·방·주소·관리비·입주일·주차·옵션 등 매물 고유 조건은
  [확인된 매물 정보] 또는 [참조 기사]에 실제로 있는 내용만 쓸 것
- 두 자료가 다르면 [확인된 매물 정보]를 우선할 것
- 없는 수치, 현장 방문, 인터뷰, 고객 반응, 시세, 수익률, 개발 호재를 만들어내지 말 것
- 소재지가 시·군·동까지만 공개됐다면 더 상세한 주소를 추측하지 말 것
- 장점과 함께 계약 전 직접 확인할 점도 균형 있게 안내할 것

[블로그 구성]
- title: 검색어를 억지로 나열하지 않은 자연스러운 제목 1개. 선택한 스타일을 분명히 반영할 것
- body: 모바일에서도 읽기 쉽도록 한 문단을 2~4문장으로 짧게 구성할 것
- 첫 문단은 2문장 이내의 핵심 요약으로 쓸 것 (인사말 없이 바로 본론). 이 문단은 블로그 맨 위 요약으로 쓰입니다
- 소제목은 위 [선택한 스타일]의 구성대로 넣고, 한 줄짜리 독립 문단으로 쓰며 반드시 "■ "로 시작할 것
  ("■"는 소제목 위치를 알리는 표시이며 화면 모양은 블로그 디자인이 따로 정합니다)
- 소제목 바로 다음에는 반드시 본문 문단이 올 것 (소제목을 연달아 쓰거나 글 맨 끝에 두지 말 것)
- 마지막 문단은 전체를 정리하는 한 문단으로 쓸 것. 연락처·문의 안내·링크는 쓰지 말 것 (블로그 디자인이 붙입니다)
- 기사 문장을 그대로 길게 복사하지 말고 블로그 독자를 위한 새 문장으로 재구성할 것
- keywords: 지역명·매물 종류·거래 조건을 포함한 검색용 핵심어 7~12개. # 기호는 제외할 것

[출력 형식]
설명이나 인사말 없이 아래 JSON 하나만 \`\`\`json 코드블록으로 출력하십시오.
- body는 문단별 문자열 배열입니다. 배열 한 항목에 문단 하나만 넣으십시오.
- 문자열 안에 실제 줄바꿈을 넣지 말고, 마지막 항목 뒤에 쉼표를 넣지 마십시오.
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
- 앞서 제공한 매물의 금액·면적·층·주소·번호 등 사실은 바꾸거나 새로 만들지 마십시오.
- 사용자의 수정 요청을 반영하되 과장 광고, 허위 방문, 허위 고객 사례를 만들지 마십시오.
- 소제목 문단은 처음처럼 "■ "로 시작하고, 첫 문단은 핵심 요약으로 유지하십시오.
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
    gwBlogFactLines,
    gwBlogArticleText,
    gwBuildBlogPrompt,
    gwBuildBlogRevisePrompt,
  };
}
