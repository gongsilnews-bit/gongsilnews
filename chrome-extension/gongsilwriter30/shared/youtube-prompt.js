/* ══════════════════════════════════════════════════════════════
   4 · 유튜브 대본 — AI 지시문

   2번 초안 다듬기의 기사와 1번에서 가져온 물건 정보를 자료로 쓴다.
   기사 프롬프트(prompt.js)와 분리해, 여기서 무엇을 바꿔도 기사 작성에는 영향이 없다.

   일반 매물과 경매·공매 물건은 지시문이 다르다.
   경매·공매 물건은 1번에서 가져올 때 saleKind("경매"·"공매")가 붙어 오므로 그것으로 가른다.
   ══════════════════════════════════════════════════════════════ */

const GW_YT_VIDEO_TYPE = {
  listing: { label: "매물 소개", structure: "훅 → 위치 → 핵심 조건 → 장점 → 확인할 점 → 마무리" },
  news: { label: "부동산 뉴스", structure: "헤드라인 → 배경 → 핵심 사실 → 의미 → 확인할 점" },
  area: { label: "지역 분석", structure: "지역 소개 → 교통 → 생활권 → 물건 조건 → 정리" },
};

/* 경매·공매 물건 — 칩 자리(listing·news·area)는 같고 이름과 흐름이 다르다 */
const GW_YT_AUCTION_VIDEO_TYPE = {
  listing: {
    label: "물건 소개",
    structure: "훅 → 위치·물건 종류 → 가격(감정가·최저입찰가·유찰) → 입찰 일정·방법 → 입찰 전 확인할 점 → 마무리",
  },
  news: {
    label: "경매 뉴스",
    structure: "헤드라인 → 어떤 물건이 나왔나 → 가격과 유찰 → 이 조건이 뜻하는 것 → 입찰 전 확인할 점",
  },
  area: {
    label: "지역 분석",
    structure: "지역 소개 → 교통 → 생활권 → 물건 조건과 가격 → 입찰 일정 → 정리",
  },
};

const GW_YT_DURATION = {
  short: { label: "60초 쇼츠", seconds: 60, chars: "약 280~380자" },
  medium: { label: "약 2분", seconds: 120, chars: "약 600~850자" },
  long: { label: "약 5분", seconds: 300, chars: "약 1,500~2,100자" },
};

const GW_YT_TONE = {
  news: { label: "뉴스형", prompt: "정확하고 신뢰감 있는 뉴스 앵커형" },
  friendly: { label: "친근한 설명", prompt: "부드럽고 친근한 설명형 (존댓말)" },
  expert: { label: "전문가 분석", prompt: "차분하고 논리적인 부동산 전문가 분석형" },
};

/* 경매·공매 물건인가 */
const gwYtIsAuction = (vacancy) => Boolean(vacancy && vacancy.saleKind);

/* 물건 종류에 맞는 콘텐츠 유형 표 */
function gwYtVideoTypes(vacancy) {
  return gwYtIsAuction(vacancy) ? GW_YT_AUCTION_VIDEO_TYPE : GW_YT_VIDEO_TYPE;
}

function gwYtSourceText(source) {
  const input = source || {};
  const article = input.article || {};
  const lines = [];
  const push = (label, value) => {
    const text = String(value == null ? "" : value).trim();
    if (text) lines.push(`[${label}] ${text}`);
  };
  push("기사 제목", article.title);
  push("기사 부제", Array.isArray(article.subtitles) ? article.subtitles.join(" / ") : "");
  push("기사 본문", article.body);

  const facts = input.vacancy && typeof gwFactLines === "function" ? gwFactLines(input.vacancy) : "";
  return lines.join("\n") + (facts ? `\n\n[물건 정보 — 확인된 사실]\n${facts}` : "");
}

/* ══════════════════════════════════════════════════════════════
   대본 쓰기 — AI 는 읽을 원고 전체(완성 대본)만 쓴다
   ══════════════════════════════════════════════════════════════ */
const GW_YT_SCRIPT_SHAPE = `\`\`\`json
{
  "title": "유튜브 제목",
  "narration": ["읽을 원고 첫 문단", "둘째 문단"]
}
\`\`\``;

/* 원고 모양·출력 형식 — 일반·경매 공통 */
const GW_YT_OUTPUT = `[출력 형식]
설명이나 인사말 없이 아래 형식의 유효한 JSON 하나만 \`\`\`json 코드블록으로 출력하십시오.
- narration 은 문단별 문자열 배열입니다. 문자열 안에 실제 줄바꿈을 넣지 마십시오.

${GW_YT_SCRIPT_SHAPE}`;

function gwBuildYtScriptPrompt(source, settings) {
  if (gwYtIsAuction(source && source.vacancy)) return gwBuildYtAuctionScriptPrompt(source, settings);
  const s = settings || {};
  const type = GW_YT_VIDEO_TYPE[s.videoType] || GW_YT_VIDEO_TYPE.listing;
  const duration = GW_YT_DURATION[s.duration] || GW_YT_DURATION.short;
  const tone = GW_YT_TONE[s.tone] || GW_YT_TONE.news;

  return `당신은 부동산 전문 매체 "공실뉴스"의 유튜브 대본 작가입니다.
아래 공실뉴스 기사와 확인된 물건 정보만 사용해 ${type.label} 영상의 내레이션 원고를 작성하십시오.

${gwYtSourceText(source)}

[영상 설정]
- 유형: ${type.label}
- 흐름: ${type.structure}
- 길이: ${duration.label}. 원고 전체 ${duration.chars} (소리 내어 읽는 속도 기준)
- 말투: ${tone.prompt}

[보도 원칙]
- "공실뉴스에 이런 물건이 나왔다"는 객관적인 소개입니다. 3인칭 전달체로 쓰십시오.
- 권유·호객 표현을 쓰지 마십시오: "지금 바로 문의하세요", "놓치지 마세요", "강력 추천", "지금이 기회" 등.
- 중개사무소 이름·전화번호를 원고에 넣지 마십시오.

[사실 원칙]
- 자료에 없는 가격·면적·주소·시세·수익률·교통 시간·개발 호재·인터뷰를 만들지 마십시오.
- 숫자와 고유명사는 자료 그대로 쓰십시오.
- 실제 사진으로 확인되지 않은 내부·외관을 사실처럼 단정하지 마십시오.

[원고 원칙]
- 첫 문장은 3초 안에 관심을 끄는 짧은 훅입니다.
- 소리 내어 읽기 좋게 한 문장을 짧게 끊으십시오. 모든 문장은 마침표·물음표·느낌표로 끝내십시오.
- 장면 제목·자막·화면 설명·괄호 지시문은 쓰지 마십시오. 읽을 문장만 씁니다.
- 마지막은 핵심 조건과 확인할 점을 정리하고 "자세한 내용은 공실뉴스에서 확인할 수 있습니다."로 맺습니다.

${GW_YT_OUTPUT}`;
}

/* ══════════════════════════════════════════════════════════════
   경매·공매 물건 대본

   기사(경매 기사 프롬프트)와 같은 원칙을 따른다.
   - 가격·일정·번호는 자료 그대로. 지어내면 큰 사고다
   - 경매·공매 제도의 일반 설명은 해도 되지만, 투자 권유·낙찰가 예측은 어디서도 하지 않는다
   ══════════════════════════════════════════════════════════════ */
function gwBuildYtAuctionScriptPrompt(source, settings) {
  const s = settings || {};
  const type = GW_YT_AUCTION_VIDEO_TYPE[s.videoType] || GW_YT_AUCTION_VIDEO_TYPE.listing;
  const duration = GW_YT_DURATION[s.duration] || GW_YT_DURATION.short;
  const tone = GW_YT_TONE[s.tone] || GW_YT_TONE.news;
  const vacancy = (source && source.vacancy) || {};
  const saleKind = vacancy.saleKind === "공매" ? "공매" : "경매";
  const saleName = saleKind === "공매" ? "공매(온비드)" : "법원 경매";

  return `당신은 부동산 전문 매체 "공실뉴스"의 경매·공매 담당 유튜브 대본 작가입니다.
아래 공실뉴스 기사와 확인된 ${saleName} 물건 정보만 사용해 ${type.label} 영상의 내레이션 원고를 작성하십시오.

${gwYtSourceText(source)}

[영상 설정]
- 유형: ${type.label}
- 흐름: ${type.structure}
- 길이: ${duration.label}. 원고 전체 ${duration.chars} (소리 내어 읽는 속도 기준)
- 말투: ${tone.prompt}

[보도 원칙]
- "공실뉴스 공실열람에 이런 ${saleKind} 물건이 나왔다"는 객관적인 소개입니다. 3인칭 전달체로 쓰십시오.
- 투자 권유·호객 표현을 쓰지 마십시오: "싸게 살 기회", "놓치지 마세요", "지금이 기회", "강력 추천", "수익이 기대된다", "반값에 잡으세요" 등.
- 온비드 고객센터 등 정보제공업체 연락처(전화번호)를 넣지 마십시오.
- "본 정보는 참고용이며 법적 책임을 지지 않습니다" 같은 입찰 전 법적 주의사항 안내문을 읽지 마십시오.

[사실 원칙]
- 감정가·최저입찰가·감정가 대비 비율·유찰 횟수·입찰 시작/마감·개찰일시·입찰보증금·면적·주소·사건번호(관리번호)·집행기관(관할법원)은 자료 그대로 쓰십시오.
- 금액은 귀로 듣기 쉽게 억·만원 단위로 읽되(예: 2억 9,100만원) 자료의 숫자와 한 자리도 달라지면 안 됩니다.
- 입찰 일정이 자료에 없으면 날짜를 만들지 마십시오.
- 자료에 없는 권리관계·임차인·선순위 채권·체납액·건물 연식·낙찰 결과를 만들지 마십시오.
- 낙찰가·낙찰가율·수익률·시세 상승을 예측하지 마십시오.
- "안전한 물건이다", "권리상 문제가 없다", "반드시 낙찰된다" 같은 단정을 하지 마십시오.
- 실제 사진으로 확인되지 않은 내부·외관을 사실처럼 단정하지 마십시오.

[해설로 쓸 수 있는 것]
- ${saleKind} 제도의 일반 설명은 한두 문장으로 짧게 넣어도 됩니다 — 유찰되면 최저입찰가가 낮아지는 구조, 입찰보증금, 개찰 절차, 명도의 의미 등.
- ${saleKind} 물건을 볼 때 일반적으로 확인하는 점 — 현장 상태, 점유와 명도, 권리관계, 관리비 체납 같은 추가 비용.

[원고 원칙]
- 첫 문장은 3초 안에 관심을 끄는 짧은 훅입니다. 지역·물건 종류와 함께 최저입찰가나 유찰 횟수처럼 자료에 있는 사실로 시작하십시오. 과장하지 마십시오.
- 첫 부분에서 ${saleKind} 물건이라는 점, 소재지, 물건 종류, 감정가와 최저입찰가를 밝히십시오.
- 소리 내어 읽기 좋게 한 문장을 짧게 끊으십시오. 모든 문장은 마침표·물음표·느낌표로 끝내십시오.
- 장면 제목·자막·화면 설명·괄호 지시문은 쓰지 마십시오. 읽을 문장만 씁니다.
- 마지막은 가격·일정 조건을 정리하고 "권리관계와 물건 상태는 입찰 전 공고문과 현장에서 직접 확인할 필요가 있습니다. 자세한 내용은 공실뉴스 공실열람에서 확인할 수 있습니다."로 맺습니다.
- title 은 [공실열람 ${saleKind}] 로 시작하고 지역·물건 종류·최저입찰가(또는 유찰 횟수)를 담으십시오.

${GW_YT_OUTPUT}`;
}

/* 수정 요청 — 같은 대화에 이어 붙인다. 작업창에서 직접 고친 원고를 함께 보낸다. */
function gwBuildYtRevisePrompt(full, request, vacancy) {
  const current = {
    title: full?.title || "",
    narration: String(full?.text || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
  };
  const keep = gwYtIsAuction(vacancy)
    ? `- 감정가·최저입찰가·유찰 횟수·입찰 일정·입찰보증금·면적·주소·사건번호(관리번호) 등 사실과 숫자는 바꾸거나 새로 만들지 마십시오.
- 투자 권유, 낙찰가·수익 예측, 온비드 고객센터 연락처, 입찰 전 법적 주의사항 안내문을 넣지 마십시오.`
    : `- 기사와 물건 정보의 사실·숫자는 바꾸거나 새로 만들지 마십시오.
- 권유·호객 표현과 중개사무소 연락처를 넣지 마십시오.`;
  return `아래 현재 유튜브 원고를 요청대로 고쳐 주십시오.

[수정 요청]
${String(request || "").trim()}

[현재 원고]
${JSON.stringify(current, null, 2)}

[지킬 것]
${keep}
- 읽을 문장만 쓰고, 모든 문장은 마침표·물음표·느낌표로 끝내십시오.
- 원고 전체를 빠짐없이 다시 출력하십시오. 고친 부분만 출력하지 마십시오.
- 설명 없이 처음과 같은 JSON 형식의 \`\`\`json 코드블록 하나만 출력하십시오.

${GW_YT_SCRIPT_SHAPE}`;
}

/* ── 원고 길이 — 한국어 내레이션은 1초에 약 5.5글자(공백 제외)로 읽는다고 본다 ── */
const GW_YT_CHARS_PER_SEC = 5.5;

const gwYtCharCount = (text) => String(text || "").replace(/\s/g, "").length;

function gwYtSpeechSeconds(text) {
  return Math.round(gwYtCharCount(text) / GW_YT_CHARS_PER_SEC);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    GW_YT_VIDEO_TYPE,
    GW_YT_AUCTION_VIDEO_TYPE,
    GW_YT_DURATION,
    GW_YT_TONE,
    gwYtVideoTypes,
    gwYtSourceText,
    gwBuildYtScriptPrompt,
    gwBuildYtAuctionScriptPrompt,
    gwBuildYtRevisePrompt,
    gwYtCharCount,
    gwYtSpeechSeconds,
  };
}
