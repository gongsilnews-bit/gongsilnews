/* 유튜브 대본·장면 이미지 프롬프트 */
const GYW_VIDEO_TYPE = {
  listing: { label: "매물 소개", structure: "훅 → 위치 → 핵심 조건 → 장점 → 확인할 점 → 마무리" },
  news: { label: "부동산 뉴스", structure: "헤드라인 → 배경 → 핵심 사실 → 의미 → 전망" },
  area: { label: "지역 분석", structure: "지역 소개 → 교통 → 생활권 → 시세·조건 → 결론" },
};

const GYW_DURATION = {
  short: { label: "60초 쇼츠", seconds: 60, chars: "약 280~380자" },
  medium: { label: "약 2분", seconds: 120, chars: "약 600~850자" },
  long: { label: "약 5분", seconds: 300, chars: "약 1,500~2,100자" },
};

const GYW_SCENE_LENGTH = {
  short: { label: "짧게", seconds: "3~5초", guide: "화면 전환을 빠르게 하고 장면을 비교적 많이 나눈다" },
  medium: { label: "중간", seconds: "6~9초", guide: "정보 전달과 화면 변화가 균형을 이루게 나눈다" },
  long: { label: "길게", seconds: "10~15초", guide: "한 화면을 오래 보여 주고 장면 수를 줄인다" },
};

const GYW_TONE = {
  news: "정확하고 신뢰감 있는 뉴스 앵커형",
  friendly: "부드럽고 친근한 설명형",
  expert: "차분하고 논리적인 부동산 전문가 분석형",
};

const GYW_IMAGE_STYLE = {
  news: { label: "한국형 보도 실사", prompt: "한국 부동산 뉴스 현장사진 같은 자연스럽고 과장 없는 고해상도 실사" },
  cinematic: { label: "부동산 시네마틱", prompt: "한국 고급 부동산을 세련된 영화 조명과 안정적인 구도로 표현한 실사" },
  documentary: { label: "현장 취재 다큐", prompt: "한국 현장을 직접 취재한 다큐멘터리 사진처럼 사실적인 실사" },
  bright: { label: "밝은 매물 홍보", prompt: "밝은 자연광과 정돈된 구도의 한국 부동산 홍보 실사" },
  infographic: { label: "한국형 인포그래픽", prompt: "한국 방송 뉴스형 데이터 인포그래픽, 정확한 글자는 넣지 않고 텍스트 안전 영역 확보" },
  illustration: { label: "한국형 일러스트·웹툰", prompt: "현대적인 한국형 편집 일러스트, 친근하지만 유아적이지 않은 스타일" },
  presentation: { label: "프리미엄 PPT 프레젠테이션", prompt: "공실뉴스 브랜드의 세련된 프레젠테이션 배경, 사진과 정보 패널을 위한 여백, 글자는 넣지 않음" },
};

function gywSourceText(source) {
  const input = source || {};
  const lines = [];
  const push = (label, value) => {
    const text = String(value == null ? "" : value).trim();
    if (text) lines.push(`[${label}] ${text}`);
  };
  push("제목", input.title);
  push("부제", Array.isArray(input.subtitles) ? input.subtitles.join(" / ") : input.subtitle);
  push("가격", input.priceText);
  for (const field of input.fields || []) push(field.label, field.value);
  push("특징", Array.isArray(input.themes) ? input.themes.join(" ") : input.themes);
  push("주변환경", input.infra);
  push("본문", input.body || input.text);
  return lines.join("\n");
}

function gywBuildScriptPrompt(source, settings) {
  const s = settings || {};
  const type = GYW_VIDEO_TYPE[s.videoType] || GYW_VIDEO_TYPE.listing;
  const duration = GYW_DURATION[s.duration] || GYW_DURATION.short;
  const sceneLength = GYW_SCENE_LENGTH[s.sceneLength] || GYW_SCENE_LENGTH.medium;
  const tone = GYW_TONE[s.tone] || GYW_TONE.news;
  const aspect = s.aspectRatio === "16:9" ? "16:9 일반 유튜브" : "9:16 세로형 쇼츠";

  return `당신은 한국 부동산 유튜브 대본 전문 에디터입니다.
아래 확인된 자료만 사용해 ${type.label} 영상 대본을 작성하십시오.

[확인된 자료]
${gywSourceText(source)}

[영상 설정]
- 유형: ${type.label}
- 구성: ${type.structure}
- 길이: ${duration.label}, 전체 내레이션 ${duration.chars}
- 장면 길이: ${sceneLength.label}, 장면당 약 ${sceneLength.seconds}. ${sceneLength.guide}
- 화면 비율: ${aspect}
- 말투: ${tone}

[사실 원칙]
- 자료에 없는 가격, 면적, 주소, 시세, 수익률, 교통시간, 개발 호재, 인터뷰를 만들지 마십시오.
- 숫자와 고유명사는 원문을 그대로 유지하십시오.
- 실제 매물 사진이 없는데 특정 매물의 내부·외관을 사실처럼 단정하지 마십시오.
- 광고성 과장, 허위 긴급성, 확정 수익 표현을 쓰지 마십시오.

[대본 원칙]
- 첫 장면은 3초 안에 관심을 끄는 짧은 훅으로 시작합니다.
- 한 장면의 내레이션은 선택한 장면 길이에 실제로 읽을 수 있는 분량으로 씁니다.
- caption은 화면에 표시할 짧고 정확한 한국어 자막입니다.
- visualType은 building-exterior, interior, street, map, data, people, title, summary 중 하나입니다.
- visualPrompt는 한국의 건물·도로·상권을 반영한 구체적인 화면 설명입니다.
- 장면 수는 특정 숫자로 고정하지 말고 영상 길이와 선택한 장면 길이에 맞춥니다.

[출력 형식]
설명 없이 아래 형식의 유효한 JSON 하나만 \`\`\`json 코드블록으로 출력하십시오.
sceneId는 작성기가 부여하므로 출력하지 마십시오.

\`\`\`json
{
  "title": "유튜브 제목",
  "description": "영상 설명 2~4문장",
  "scenes": [
    {
      "heading": "오프닝",
      "narration": "장면에서 읽을 문장",
      "caption": "화면 자막",
      "visualType": "building-exterior",
      "visualPrompt": "화면에 필요한 구체적인 이미지 설명"
    }
  ]
}
\`\`\``;
}

function gywBuildRevisePrompt(script, request) {
  return `위에서 작성한 유튜브 대본을 아래 요청대로 수정하십시오.

[수정 요청]
${String(request || "").trim()}

[현재 대본]
${JSON.stringify(script || {}, null, 2)}

- 확인된 원문의 사실과 숫자를 바꾸거나 새로 만들지 마십시오.
- 장면 전체를 빠짐없이 다시 출력하십시오.
- 설명 없이 처음과 같은 유효한 JSON 코드블록 하나만 출력하십시오.`;
}

function gywBuildImagePrompt(scene, settings, extraRequest = "") {
  const style = GYW_IMAGE_STYLE[settings?.imageStyle] || GYW_IMAGE_STYLE.news;
  const ratio = settings?.aspectRatio === "16:9" ? "16:9 가로형" : "9:16 세로형";
  return `다음 유튜브 장면에 사용할 이미지 1장을 만드십시오.

[장면]
- 제목: ${scene.heading || ""}
- 내레이션: ${scene.narration || ""}
- 화면 설명: ${scene.visualPrompt || ""}
- 장면 종류: ${scene.visualType || "auto"}

[스타일]
- ${style.label}: ${style.prompt}
- 비율: ${ratio}
- 한국의 건축물, 도로, 보도, 상권과 생활환경을 정확히 반영
- 미국·일본·중국식 거리와 간판이 섞이지 않게 할 것
- 이미지 안에 한글, 숫자, 로고, 워터마크를 그리지 말 것
- 실제 매물 사진이 아니므로 특정 주소의 실제 건물을 그대로 재현했다고 주장하지 말 것
${extraRequest ? `\n[추가 수정 요청]\n${extraRequest}` : ""}`;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    GYW_VIDEO_TYPE,
    GYW_DURATION,
    GYW_SCENE_LENGTH,
    GYW_TONE,
    GYW_IMAGE_STYLE,
    gywSourceText,
    gywBuildScriptPrompt,
    gywBuildRevisePrompt,
    gywBuildImagePrompt,
  };
}
