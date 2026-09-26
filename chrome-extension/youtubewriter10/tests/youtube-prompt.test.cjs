/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");

/* 작업창에서는 prompt.js 의 gwFactLines 가 먼저 불린다 */
globalThis.gwFactLines = (v) => (v.fields || []).map((f) => `- ${f.label}: ${f.value}`).join("\n");
const yt = require("../shared/youtube-prompt.js");

const source = {
  article: {
    title: "[공실열람 보도] 논현동 단독주택 매매 50억",
    subtitles: ["지하철 7호선 학동역 도보권"],
    body: "서울 강남구 논현동에 단독주택이 매물로 나왔다.\n\n대지 198㎡ 규모다.",
  },
  vacancy: { fields: [{ label: "금액", value: "매매 50억" }, { label: "대지면적", value: "198㎡" }] },
};

const SCRIPT = "논현동에 50억 단독주택이 나왔습니다. 대지는 231제곱미터, 연면적은 198제곱미터입니다. " +
  "주차는 3대까지 가능합니다. 지하철 7호선 학동역이 가깝습니다. 인근에는 초등학교와 병원이 있습니다. " +
  "매입 전 권리관계를 확인할 필요가 있습니다. 자세한 내용은 공실뉴스에서 확인할 수 있습니다.";

test("대본 프롬프트는 기사·물건 정보·길이·말투를 넣고, 장면이 아닌 읽을 원고만 요청한다", () => {
  const prompt = yt.gwBuildYtScriptPrompt(source, { videoType: "news", duration: "medium", tone: "expert" });
  assert.ok(prompt.includes("[기사 제목] [공실열람 보도] 논현동 단독주택 매매 50억"));
  assert.ok(prompt.includes("- 금액: 매매 50억"));
  assert.ok(prompt.includes("부동산 뉴스"));
  assert.ok(prompt.includes("약 2분"));
  assert.ok(prompt.includes("부동산 전문가 분석형"));
  assert.ok(prompt.includes('"narration"'));
  assert.ok(!prompt.includes('"scenes"'), "대본 단계에서는 장면을 요청하지 않는다");
  assert.ok(prompt.includes("권유·호객 표현을 쓰지 마십시오"));
});

test("수정 프롬프트는 작업창에서 고친 원고 전체를 함께 보낸다", () => {
  const prompt = yt.gwBuildYtRevisePrompt({ title: "제목", text: "직접 고친 첫 문단.\n\n둘째 문단." }, "더 짧게");
  assert.ok(prompt.includes("더 짧게"));
  assert.ok(prompt.includes("직접 고친 첫 문단."));
  assert.ok(prompt.includes("둘째 문단."));
  assert.ok(prompt.includes("원고 전체를 빠짐없이"));
});

test("장면 나누기: 어떤 길이로 나눠도 장면 내레이션을 이으면 완성 대본과 같다", () => {
  for (const length of ["short", "medium", "long"]) {
    const scenes = yt.gwYtSplitScenes(SCRIPT, length);
    assert.equal(yt.gwYtNormalize(scenes.join(" ")), yt.gwYtNormalize(SCRIPT), length);
  }
});

test("장면 나누기: 짧게 고를수록 장면이 많아진다", () => {
  const short = yt.gwYtSplitScenes(SCRIPT, "short").length;
  const medium = yt.gwYtSplitScenes(SCRIPT, "medium").length;
  const long = yt.gwYtSplitScenes(SCRIPT, "long").length;
  assert.ok(short > medium && medium > long, `${short} > ${medium} > ${long}`);
});

test("장면 수를 직접 정하면 그 개수로 나누고, 문장보다 많게는 나누지 않는다", () => {
  assert.equal(yt.gwYtSplitScenes(SCRIPT, "medium", 4).length, 4);
  assert.equal(yt.gwYtSplitScenes(SCRIPT, "medium", 50).length, 7);
  const scenes = yt.gwYtSplitScenes(SCRIPT, "medium", 4);
  assert.equal(yt.gwYtNormalize(scenes.join(" ")), yt.gwYtNormalize(SCRIPT));
});

test("장면 분석 프롬프트는 내레이션을 보내되 고치지 못하게 하고, 스타일·자막 규칙을 넣는다", () => {
  const prompt = yt.gwBuildYtScenePrompt(["첫 장면 문장.", "둘째 장면 문장."], { imageStyle: "infographic", aspectRatio: "16:9" }, "제목");
  assert.ok(prompt.includes('"no": 1') && prompt.includes('"no": 2'));
  assert.ok(prompt.includes("내레이션은 출력하지도, 고치지도 마십시오"));
  assert.ok(prompt.includes("한국형 인포그래픽"));
  assert.ok(prompt.includes("16:9 가로형"));
  assert.ok(prompt.includes("금액·면적·부동산 용어"));
  assert.ok(prompt.includes("원화(₩)"));
});

test("이미지 프롬프트는 스타일·비율을 넣고 글자·달러를 그리지 못하게 한다", () => {
  const prompt = yt.gwBuildYtImagePrompt(
    { heading: "오프닝", narration: "문장", visualPrompt: "논현동 주택가", visualType: "street" },
    { imageStyle: "presentation", aspectRatio: "16:9" },
    "해 질 녘으로"
  );
  assert.ok(prompt.includes("프리미엄 PPT"));
  assert.ok(prompt.includes("16:9 가로형"));
  assert.ok(prompt.includes("한글·숫자·로고·워터마크·말풍선·헤드라인을 그리지 말 것"));
  assert.ok(prompt.includes("달러($)는 절대 쓰지 말 것"));
  assert.ok(prompt.includes("[추가 요청]\n해 질 녘으로"));
});

test("읽는 시간은 공백 제외 글자 수 ÷ 5.5초로 계산한다", () => {
  assert.equal(yt.gwYtSpeechSeconds("가".repeat(55)), 10);
  assert.equal(Object.keys(yt.GW_YT_IMAGE_STYLE).length, 7);
});
