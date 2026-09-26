/* ══════════════════════════════════════════════════════════════
   3 · 유튜브 대본 / 4 · 유튜브 이미지 — AI 지시문

   2번 초안 다듬기의 기사와 1번에서 가져온 물건 정보를 자료로 쓴다.
   기사 프롬프트(prompt.js)와 분리해, 여기서 무엇을 바꿔도 기사 작성에는 영향이 없다.
   ══════════════════════════════════════════════════════════════ */

const GW_YT_VIDEO_TYPE = {
  listing: { label: "매물 소개", structure: "훅 → 위치 → 핵심 조건 → 장점 → 확인할 점 → 마무리" },
  news: { label: "부동산 뉴스", structure: "헤드라인 → 배경 → 핵심 사실 → 의미 → 확인할 점" },
  area: { label: "지역 분석", structure: "지역 소개 → 교통 → 생활권 → 물건 조건 → 정리" },
};

const GW_YT_DURATION = {
  short: { label: "60초 쇼츠", seconds: 60, chars: "약 280~380자" },
  medium: { label: "약 2분", seconds: 120, chars: "약 600~850자" },
  long: { label: "약 5분", seconds: 300, chars: "약 1,500~2,100자" },
};

const GW_YT_SCENE_LENGTH = {
  short: { label: "짧게", seconds: "3~5초", mid: 4, guide: "화면 전환을 빠르게 하고 장면을 많이 나눈다" },
  medium: { label: "중간", seconds: "6~9초", mid: 7.5, guide: "정보 전달과 화면 변화가 균형을 이루게 나눈다" },
  long: { label: "길게", seconds: "10~15초", mid: 12.5, guide: "한 화면을 오래 보여 주고 장면 수를 줄인다" },
};

const GW_YT_TONE = {
  news: { label: "뉴스형", prompt: "정확하고 신뢰감 있는 뉴스 앵커형" },
  friendly: { label: "친근한 설명", prompt: "부드럽고 친근한 설명형 (존댓말)" },
  expert: { label: "전문가 분석", prompt: "차분하고 논리적인 부동산 전문가 분석형" },
};

const GW_YT_IMAGE_STYLE = {
  news: { label: "한국형 보도 실사", prompt: "한국 부동산 뉴스 현장사진 같은 자연스럽고 과장 없는 고해상도 실사" },
  cinematic: { label: "부동산 시네마틱", prompt: "한국 고급 부동산을 세련된 영화 조명과 안정적인 구도로 표현한 실사" },
  documentary: { label: "현장 취재 다큐", prompt: "한국 현장을 직접 취재한 다큐멘터리 사진처럼 사실적인 실사" },
  bright: { label: "밝은 매물 홍보", prompt: "밝은 자연광과 정돈된 구도의 한국 부동산 홍보 실사" },
  infographic: { label: "한국형 인포그래픽", prompt: "한국 방송 뉴스형 데이터 인포그래픽 배경. 글자와 숫자는 넣지 않고 텍스트를 올릴 여백을 확보" },
  illustration: { label: "한국형 일러스트·웹툰", prompt: "현대적인 한국형 편집 일러스트. 친근하지만 유아적이지 않은 스타일" },
  presentation: { label: "프리미엄 PPT", prompt: "공실뉴스 브랜드의 세련된 프레젠테이션 배경 사진. 아래쪽 3분의 1에 자막을 올릴 차분한 여백, 글자는 넣지 않음" },
};

/* 영상 길이 ÷ 장면 길이 — 대본을 요청하기 전에 보여 주는 대략의 장면 수 */
function gwYtEstimateScenes(settings) {
  const s = settings || {};
  const duration = GW_YT_DURATION[s.duration] || GW_YT_DURATION.short;
  const scene = GW_YT_SCENE_LENGTH[s.sceneLength] || GW_YT_SCENE_LENGTH.medium;
  return Math.max(3, Math.round(duration.seconds / scene.mid));
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
   ① 대본 쓰기 — AI 는 읽을 원고 전체(완성 대본)만 쓴다. 장면은 나누지 않는다.
   ══════════════════════════════════════════════════════════════ */
const GW_YT_SCRIPT_SHAPE = `\`\`\`json
{
  "title": "유튜브 제목",
  "description": "영상 설명 2~4문장",
  "narration": ["읽을 원고 첫 문단", "둘째 문단"]
}
\`\`\``;

function gwBuildYtScriptPrompt(source, settings) {
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

[출력 형식]
설명이나 인사말 없이 아래 형식의 유효한 JSON 하나만 \`\`\`json 코드블록으로 출력하십시오.
- narration 은 문단별 문자열 배열입니다. 문자열 안에 실제 줄바꿈을 넣지 마십시오.

${GW_YT_SCRIPT_SHAPE}`;
}

/* 수정 요청 — 같은 대화에 이어 붙인다. 작업창에서 직접 고친 원고를 함께 보낸다. */
function gwBuildYtRevisePrompt(full, request) {
  const current = {
    title: full?.title || "",
    description: full?.description || "",
    narration: String(full?.text || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
  };
  return `아래 현재 유튜브 원고를 요청대로 고쳐 주십시오.

[수정 요청]
${String(request || "").trim()}

[현재 원고]
${JSON.stringify(current, null, 2)}

[지킬 것]
- 기사와 물건 정보의 사실·숫자는 바꾸거나 새로 만들지 마십시오.
- 권유·호객 표현과 중개사무소 연락처를 넣지 마십시오.
- 읽을 문장만 쓰고, 모든 문장은 마침표·물음표·느낌표로 끝내십시오.
- 원고 전체를 빠짐없이 다시 출력하십시오. 고친 부분만 출력하지 마십시오.
- 설명 없이 처음과 같은 JSON 형식의 \`\`\`json 코드블록 하나만 출력하십시오.

${GW_YT_SCRIPT_SHAPE}`;
}

/* ══════════════════════════════════════════════════════════════
   ② 장면 나누기 — 작성기가 직접 나눈다

   문장을 자르거나 바꾸지 않고, 문장 경계에서만 장면을 나눈다.
   그래서 장면 내레이션을 이어 붙이면 완성 대본과 글자 하나 다르지 않다.
   한국어 내레이션은 1초에 약 5.5글자(공백 제외)로 읽는다고 본다.
   ══════════════════════════════════════════════════════════════ */
const GW_YT_CHARS_PER_SEC = 5.5;
const GW_YT_SCENE_RANGE = {
  short: [3, 5],
  medium: [6, 9],
  long: [10, 15],
};

const gwYtCharCount = (text) => String(text || "").replace(/\s/g, "").length;

function gwYtNormalize(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function gwYtSpeechSeconds(text) {
  return Math.round(gwYtCharCount(text) / GW_YT_CHARS_PER_SEC);
}

/* 문장 단위로 끊는다. 너무 긴 문장은 쉼표 자리에서만 더 끊는다 (글자는 그대로 둔다). */
function gwYtSentences(text, maxChars) {
  const sentences = gwYtNormalize(text).split(/(?<=[.!?。…])\s+/).filter(Boolean);
  const pieces = [];
  for (const sentence of sentences) {
    if (gwYtCharCount(sentence) <= maxChars * 1.5) {
      pieces.push(sentence);
      continue;
    }
    let current = "";
    for (const part of sentence.split(/(?<=,)\s+/)) {
      if (current && gwYtCharCount(current + part) > maxChars) {
        pieces.push(current);
        current = part;
      } else {
        current = current ? `${current} ${part}` : part;
      }
    }
    if (current) pieces.push(current);
  }
  return pieces;
}

/* 장면 수를 직접 정했으면 글자 수가 고르게 되도록 그 개수로 묶는다 (문장 개수보다 많게는 못 나눈다) */
function gwYtSplitByCount(pieces, count) {
  const total = pieces.reduce((sum, piece) => sum + gwYtCharCount(piece), 0);
  const want = Math.max(1, Math.min(count, pieces.length));
  const scenes = [];
  let current = "";
  let used = 0;
  pieces.forEach((piece, index) => {
    current = current ? `${current} ${piece}` : piece;
    used += gwYtCharCount(piece);
    const left = pieces.length - index - 1;
    const scenesLeft = want - scenes.length - 1;
    /* 지금까지 몫을 채웠거나, 남은 문장 수가 남은 장면 수만큼밖에 없으면 끊는다 */
    if (scenesLeft > 0 && (used >= (total * (scenes.length + 1)) / want || left <= scenesLeft)) {
      scenes.push(current);
      current = "";
    }
  });
  if (current) scenes.push(current);
  return scenes;
}

function gwYtSplitScenes(text, sceneLength, count = 0) {
  const [minSec, maxSec] = GW_YT_SCENE_RANGE[sceneLength] || GW_YT_SCENE_RANGE.medium;
  if (Number(count) > 0) return gwYtSplitByCount(gwYtSentences(text, maxSec * GW_YT_CHARS_PER_SEC), Number(count));
  const minChars = minSec * GW_YT_CHARS_PER_SEC;
  const maxChars = maxSec * GW_YT_CHARS_PER_SEC;
  const scenes = [];
  let current = "";
  for (const piece of gwYtSentences(text, maxChars)) {
    const joined = current ? `${current} ${piece}` : piece;
    /* 최소 길이를 채웠고, 붙이면 최대를 넘으면 여기서 끊는다 */
    if (current && gwYtCharCount(current) >= minChars && gwYtCharCount(joined) > maxChars) {
      scenes.push(current);
      current = piece;
    } else {
      current = joined;
    }
  }
  if (current) {
    /* 마지막 조각이 너무 짧으면 앞 장면에 붙인다 */
    if (scenes.length && gwYtCharCount(current) < minChars / 2) scenes[scenes.length - 1] += ` ${current}`;
    else scenes.push(current);
  }
  return scenes;
}

/* ── 나눈 장면마다 자막·장면 설명만 AI 에 받는다. 내레이션은 보내기만 하고 바꾸지 못하게 한다. ── */
function gwBuildYtScenePrompt(narrations, settings, title) {
  const s = settings || {};
  const style = GW_YT_IMAGE_STYLE[s.imageStyle] || GW_YT_IMAGE_STYLE.news;
  const aspect = s.aspectRatio === "16:9" ? "16:9 가로형" : "9:16 세로형";
  const list = narrations.map((narration, index) => ({ no: index + 1, narration }));
  return `아래 유튜브 영상 "${title || ""}"의 장면 목록에 자막과 이미지 장면 설명을 붙여 주십시오.
내레이션은 이미 확정됐습니다. 내레이션은 출력하지도, 고치지도 마십시오.

[장면 목록]
${JSON.stringify(list, null, 2)}

[영상 화면]
- 비율: ${aspect}
- 이미지 스타일: ${style.label} — ${style.prompt}

[쓸 것 — 장면마다]
- heading: 장면 제목 (10자 안팎, 예: 오프닝·가격·위치·정리)
- caption: 화면에 올릴 자막 (20자 안팎). 시청자가 한눈에 이해하도록 그 장면 내레이션의 핵심을 요약.
  금액·면적·부동산 용어(예: 매매 50억, 대지 70평, 유찰 3회)가 나오면 내레이션 그대로 정확히 쓰고,
  깔끔하고 신뢰감 있는 말투로 쓸 것
- visualType: building-exterior, interior, street, map, data, people, title, summary 중 하나
- visualPrompt: 위 이미지 스타일로 만들 화면 설명. 배경은 현대 한국이며 한국의 건물·도로·상권을 반영.
  이미지 안에 글자·숫자·간판 문구·말풍선을 넣지 않는 장면으로 구체적으로 묘사.
  돈을 표현해야 하면 원화(₩)만 쓰고 달러($)는 쓰지 말 것

[지킬 것]
- 장면 수와 번호(no)를 그대로 유지하십시오. 장면을 합치거나 나누지 마십시오.
- 내레이션에 없는 가격·면적·시설을 자막에 만들지 마십시오.

[출력 형식]
설명 없이 아래 형식의 유효한 JSON 하나만 \`\`\`json 코드블록으로 출력하십시오.

\`\`\`json
{
  "scenes": [
    { "no": 1, "heading": "오프닝", "caption": "자막", "visualType": "street", "visualPrompt": "화면 설명" }
  ]
}
\`\`\``;
}

function gwBuildYtImagePrompt(scene, settings, extraRequest = "") {
  const s = settings || {};
  const style = GW_YT_IMAGE_STYLE[s.imageStyle] || GW_YT_IMAGE_STYLE.news;
  const ratio = s.aspectRatio === "16:9" ? "16:9 가로형" : "9:16 세로형";
  const extra = String(extraRequest || "").trim();
  return `다음 유튜브 장면에 쓸 이미지 1장을 만들어 주십시오.

[장면]
- 제목: ${scene?.heading || ""}
- 내레이션: ${scene?.narration || ""}
- 화면 설명: ${scene?.visualPrompt || ""}
- 장면 종류: ${scene?.visualType || "auto"}

[스타일] ${style.label}
${style.prompt}

[조건]
- 비율: ${ratio}
- 한국의 건축물·도로·보도·상권과 생활환경을 정확히 반영하고, 미국·일본·중국식 거리와 간판을 섞지 말 것
- 이미지 안에 한글·숫자·로고·워터마크·말풍선·헤드라인을 그리지 말 것 (자막은 작성기가 따로 올립니다)
- 돈을 표현해야 하면 원화(₩) 기호 하나만 쓰고, 달러($)는 절대 쓰지 말 것
- 사람 얼굴이 크게 드러나지 않게 하고, 존재하지 않는 상호·간판 이름을 넣지 말 것
- 특정 주소의 실제 건물을 그대로 재현했다고 단정하지 말 것${extra ? `\n\n[추가 요청]\n${extra}` : ""}

이미지 1장만 출력하고 설명은 붙이지 마십시오.`;
}

function gwBuildYtThumbPrompt(full, settings, text) {
  const s = settings || {};
  const style = GW_YT_IMAGE_STYLE[s.imageStyle] || GW_YT_IMAGE_STYLE.news;
  return `이 영상의 유튜브 썸네일 배경 이미지 1장을 만들어 주십시오.

[영상 제목] ${full?.title || ""}
[썸네일 문구] ${String(text || "").trim()} (문구는 작성기가 따로 올립니다)

[스타일] ${style.label}
${style.prompt}

[조건]
- 16:9 가로형, 한눈에 주제가 보이는 강한 한 장면
- 아래쪽 절반에 큰 제목을 올릴 수 있도록 복잡하지 않은 구도
- 한국의 건물·거리 분위기를 반영하고 외국식 요소를 섞지 말 것
- 이미지 안에 글자·숫자·로고·워터마크를 그리지 말 것

이미지 1장만 출력하고 설명은 붙이지 마십시오.`;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    GW_YT_VIDEO_TYPE,
    GW_YT_DURATION,
    GW_YT_SCENE_LENGTH,
    GW_YT_TONE,
    GW_YT_IMAGE_STYLE,
    gwYtEstimateScenes,
    gwYtSourceText,
    gwBuildYtScriptPrompt,
    gwBuildYtRevisePrompt,
    gwYtNormalize,
    gwYtCharCount,
    gwYtSpeechSeconds,
    gwYtSplitScenes,
    gwBuildYtScenePrompt,
    gwBuildYtImagePrompt,
    gwBuildYtThumbPrompt,
  };
}
