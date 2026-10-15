/* ══════════════════════════════════════════════════════════════
   4 · 유튜브 대본 — AI 지시문 (뉴스메이커)

   2번 초안 다듬기의 기사와 1번 소재(뉴스·주제)를 자료로 쓴다.
   기사 프롬프트(prompt.js)와 분리해, 여기서 무엇을 바꿔도 기사 작성에는 영향이 없다.
   "흥미 있고 실생활에 재미있고 유익한 이야기"가 목표다 — 훅과 생활 사례로 끌고, 사실은 정확하게.
   숫자는 기본으로 TTS 가 바로 읽게 한글 발음으로 쓴다 (AI 스튜디오 공실스터디 대본기의 원칙).
   ══════════════════════════════════════════════════════════════ */

const GW_YT_VIDEO_TYPE = {
  briefing: { label: "뉴스 브리핑", structure: "훅 → 무슨 일인가 → 배경 → 내 생활에 미치는 영향 → 확인할 점 → 마무리" },
  info: { label: "생활 정보", structure: "훅(생활 속 질문) → 핵심 답 → 알아 둘 내용 2~3가지 → 따라 할 요령 → 마무리" },
  story: { label: "이야기형", structure: "훅(가정한 생활 장면) → 문제 → 알게 된 사실 → 해결 요령 → 교훈 정리" },
};

const GW_YT_DURATION = {
  short: { label: "60초 쇼츠", seconds: 60, chars: "약 280~380자" },
  mid: { label: "약 3분", seconds: 180, chars: "약 900~1,100자" },
  long: { label: "약 6분", seconds: 360, chars: "약 1,800~2,200자" },
  xlong: { label: "약 10분", seconds: 600, chars: "약 3,000~3,600자" },
};

const GW_YT_TONE = {
  news: { label: "뉴스형", prompt: "정확하고 신뢰감 있는 뉴스 앵커형" },
  friendly: { label: "친근한 이야기", prompt: "옆집 선배가 들려주듯 부드럽고 친근한 이야기형 (존댓말)" },
  expert: { label: "전문가 해설", prompt: "차분하고 논리적인 전문가 해설형" },
};

const GW_YT_NUMBER = {
  hangul: { label: "한글 읽기", prompt: "금액과 숫자는 TTS가 그대로 읽도록 한글 발음으로 쓰십시오. (예: 1억 5,000만 원 → 일억 오천만 원, 3.5% → 삼 점 오 퍼센트, 2026년 → 이천이십육 년)" },
  digit: { label: "숫자 그대로", prompt: "금액과 숫자는 자막으로 보기 쉽게 아라비아 숫자로 쓰십시오. (예: 1억 5,000만 원)" },
};

function gwYtSourceText(input) {
  const src = input || {};
  const article = src.article || {};
  const lines = [];
  const push = (label, value) => {
    const text = String(value == null ? "" : value).trim();
    if (text) lines.push(`[${label}] ${text}`);
  };
  push("기사 제목", article.title);
  push("기사 부제", Array.isArray(article.subtitles) ? article.subtitles.join(" / ") : "");
  push("기사 본문", article.body);

  const source = src.source || {};
  if (source.mode === "news" && source.news) {
    push("원문 출처", `${source.news.publisher || "원문 언론사"} 「${source.news.title || ""}」`);
  } else if (source.mode === "complex" || source.mode === "local") {
    push("자료 출처", "국토교통부 실거래가 공개시스템 (신고 기준) — 원고 안에서 출처를 한 번 밝힐 것");
  } else if (source.topic && source.topic.subject) {
    push("주제", source.topic.subject);
  }
  return lines.join("\n");
}

/* ══════════════════════════════════════════════════════════════
   대본 쓰기 — AI 는 읽을 원고 전체(완성 대본)만 쓴다
   ══════════════════════════════════════════════════════════════ */
const GW_YT_SCRIPT_SHAPE = `\`\`\`json
{
  "title": "유튜브 제목",
  "titles": ["다른 제목 후보 1", "다른 제목 후보 2", "다른 제목 후보 3"],
  "narration": ["읽을 원고 첫 문단", "둘째 문단"]
}
\`\`\``;

const GW_YT_OUTPUT = `[출력 형식]
설명이나 인사말 없이 아래 형식의 유효한 JSON 하나만 \`\`\`json 코드블록으로 출력하십시오.
- narration 은 문단별 문자열 배열입니다. 문자열 안에 실제 줄바꿈을 넣지 마십시오.
- 인터넷 검색을 했더라도 출처 표시(cite 기호)·각주 번호·링크·참고 문헌 목록은 본문에 넣지 마십시오. 문장만 쓰십시오.
- titles 에는 title 과 다른 방향의 제목 후보 3개를 넣으십시오.

${GW_YT_SCRIPT_SHAPE}`;

function gwBuildYtScriptPrompt(input, settings) {
  const s = settings || {};
  const type = GW_YT_VIDEO_TYPE[s.videoType] || GW_YT_VIDEO_TYPE.briefing;
  const duration = GW_YT_DURATION[s.duration] || GW_YT_DURATION.short;
  const tone = GW_YT_TONE[s.tone] || GW_YT_TONE.news;
  const number = GW_YT_NUMBER[s.number] || GW_YT_NUMBER.hangul;
  const source = (input && input.source) || {};
  const isNews = source.mode === "news" && source.news;
  const publisher = (isNews && source.news.publisher) || "";

  return `당신은 생활·경제 전문 매체 "공실뉴스"의 유튜브 대본 작가입니다.
아래 공실뉴스 기사의 사실만 사용해, 시청자가 끝까지 보고 싶어지는 흥미롭고 실생활에 유익한 ${type.label} 영상의 내레이션 원고를 작성하십시오.

${gwYtSourceText(input)}

[영상 설정]
- 유형: ${type.label}
- 흐름: ${type.structure}
- 길이: ${duration.label}. 원고 전체 ${duration.chars} (소리 내어 읽는 속도 기준)
- 말투: ${tone.prompt}

[재미와 쓸모]
- 첫 문장은 3초 안에 관심을 끄는 짧은 훅입니다. 시청자 생활과 맞닿은 질문이나 장면으로 여십시오. 낚시성 과장은 쓰지 마십시오.
- 어려운 용어는 처음 나올 때 쉬운 말로 풀어 주십시오.
- 사례가 필요하면 "예를 들어 ~라고 해 볼까요"처럼 가정한 사례임을 분명히 하십시오. 실제 인물인 것처럼 꾸미지 마십시오.
- 끝부분에는 시청자가 바로 써먹을 수 있는 확인 요령이나 한 줄 정리를 넣으십시오.

[사실 원칙]
- 숫자·날짜·금액·기관명·인물명·제도 이름은 기사에 있는 것만, 기사와 똑같이 쓰십시오.
- 기사에 없는 수치·통계·전망·인터뷰·후기를 만들지 마십시오.
- "반드시 오른다", "무조건 이득" 같은 단정과 투자 권유를 하지 마십시오.
${isNews ? `- 원고 안에서 "${publisher} 보도에 따르면"처럼 원문 출처를 한 번 밝히십시오.\n` : ""}
[원고 원칙]
- ${number.prompt}
- 소리 내어 읽기 좋게 한 문장을 짧게 끊으십시오. 모든 문장은 마침표·물음표·느낌표로 끝내십시오.
- 장면 제목·자막·화면 설명·괄호 지시문·이모지는 쓰지 마십시오. 읽을 문장만 씁니다.
- 마지막은 핵심을 정리하고 "더 자세한 소식은 공실뉴스에서 확인할 수 있습니다."로 맺습니다.
- title 은 호기심을 끌되 과장 없는 40자 이내 제목입니다.

${GW_YT_OUTPUT}`;
}

/* 수정 요청 — 같은 대화에 이어 붙인다. 작업창에서 직접 고친 원고를 함께 보낸다. */
function gwBuildYtRevisePrompt(full, request) {
  const current = {
    title: (full && full.title) || "",
    narration: String((full && full.text) || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
  };
  return `아래 현재 유튜브 원고를 요청대로 고쳐 주십시오.

[수정 요청]
${String(request || "").trim()}

[현재 원고]
${JSON.stringify(current, null, 2)}

[지킬 것]
- 기사의 사실·숫자는 바꾸거나 새로 만들지 마십시오. 숫자 표기 방식(한글 읽기·숫자 그대로)은 현재 원고를 따르십시오.
- 과장·투자 권유를 넣지 말고, 원문 출처를 밝혔다면 유지하십시오.
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
    GW_YT_DURATION,
    GW_YT_TONE,
    GW_YT_NUMBER,
    gwYtSourceText,
    gwBuildYtScriptPrompt,
    gwBuildYtRevisePrompt,
    gwYtCharCount,
    gwYtSpeechSeconds,
  };
}
