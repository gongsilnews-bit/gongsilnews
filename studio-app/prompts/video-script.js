/* 공실뉴스 스튜디오 영상 편집기 — 회원 AI 지시문 (서버 묶음으로 내려간다. 앱 설치 파일에는 넣지 않음)
   gwVideoScriptPrompt : 텍스트로 영상 만들기 — 대본 쓰기 (문단 = 장면, 문장 = 클립, 문장마다 화면 검색어)
   gwVideoScenePrompt  : 이미 있는 대본에 문장마다 화면 검색어만 붙이기
   gwShortsPrompt      : 롱폼 → 숏폼 구간 고르기
   gwVideoParse        : 답 해석 */

function gwVideoFacts(v) {
  if (!v) return "";
  const lines = [];
  if (v.title) lines.push(`- 물건: ${v.title}`);
  for (const f of v.fields || []) {
    if (!f || !f.label || !f.value) continue;
    if (/연락처|전화|휴대폰|임대인|의뢰인|비밀|메모|호수|상세주소/.test(f.label)) continue; // 개인정보는 AI 에 보내지 않는다
    lines.push(`- ${f.label}: ${String(f.value).slice(0, 200)}`);
  }
  return lines.join("\n");
}

function gwVideoScriptPrompt({ topic = "", style = "", request = "", chars = 0, vacancy = null, source = "" } = {}) {
  const facts = gwVideoFacts(vacancy);
  const len = chars ? `대본 전체 ${chars}자 안팎 (±10%)` : "대본 전체 600~900자";
  return [
    "당신은 부동산 전문 매체 '공실뉴스'의 영상 대본 작가입니다. 성우가 그대로 읽을 영상 대본을 씁니다.",
    "",
    topic ? `[주제] ${topic}` : "",
    style ? `[영상 스타일] ${style}` : "",
    request ? `[요청] ${request}` : "",
    facts ? `[매물 정보 — 확인된 사실, 숫자·주소는 한 글자도 바꾸지 말 것, 없는 정보는 지어내지 말 것]\n${facts}` : "",
    source ? `[참고 글 — 이 내용을 영상 대본으로 바꿔 쓰기]\n${String(source).slice(0, 6000)}` : "",
    "",
    "[쓰는 법]",
    `- ${len}`,
    "- 귀로 듣기 쉬운 말투. 한 문장은 짧게(40자 안팎). 문장 하나가 화면 하나가 된다.",
    "- 내용이 바뀌는 곳에서 장면을 나눈다 (장면 3~6개).",
    "- 투자 권유·과장 광고·단정 표현을 쓰지 않는다. 연락처·호수·개인 이름은 쓰지 않는다.",
    "- 문장마다 그 문장에 맞는 화면을 정한다: desc(한국어 화면 설명), keywords(무료 영상 사이트 영어 검색어 2~4단어), kind(video 또는 image).",
    "",
    "[출력] 설명 없이 아래 JSON 하나만 ```json 상자로:",
    '{"title":"영상 제목","scenes":[{"title":"장면 이름","lines":[{"text":"성우가 읽을 문장","desc":"화면 설명","keywords":"seoul apartment exterior","kind":"video"}]}]}',
  ].filter((x) => x !== "").join("\n");
}

function gwVideoScenePrompt(lines) {
  return [
    "아래 영상 대본의 문장마다 어울리는 화면을 정해 주세요. 문장은 바꾸지 마세요.",
    "- desc: 한국어 화면 설명, keywords: 무료 영상 사이트 영어 검색어 2~4단어, kind: video 또는 image",
    "",
    lines.map((t, i) => `${i + 1}. ${t}`).join("\n"),
    "",
    "[출력] 설명 없이 JSON 하나만 ```json 상자로:",
    '{"lines":[{"n":1,"desc":"화면 설명","keywords":"english keywords","kind":"video"}]}',
  ].join("\n");
}

function gwShortsPrompt(transcript, { count = 3, maxSec = 60, request = "" } = {}) {
  return [
    "아래는 긴 영상의 받아쓰기입니다 (각 줄 앞 [시작초-끝초]).",
    `이 영상에서 숏폼(세로 짧은 영상)으로 만들기 좋은 구간 ${count}개를 고르세요.`,
    `- 한 구간은 ${Math.round(maxSec / 2)}~${maxSec}초. 앞뒤 맥락 없이도 이해되는 한 덩어리. 처음 3초가 흥미로운 곳에서 시작.`,
    "- 구간은 서로 겹치지 않게. 줄의 시각을 그대로 써서 start, end 를 정한다.",
    request ? `- 요청: ${request}` : "",
    "- 구간마다 짧은 제목(20자 안팎)과 고른 이유(한 문장).",
    "",
    transcript,
    "",
    "[출력] 설명 없이 JSON 하나만 ```json 상자로:",
    '{"shorts":[{"title":"제목","start":12.3,"end":55.0,"reason":"이유"}]}',
  ].filter((x) => x !== "").join("\n");
}

function gwVideoParse(raw) {
  const text = String(raw || "");
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let body = fenced ? fenced[1] : text;
  const a = body.indexOf("{");
  const b = body.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  body = body.slice(a, b + 1);
  try {
    return JSON.parse(body);
  } catch (e) {
    try {
      return JSON.parse(body.replace(/,\s*([}\]])/g, "$1").replace(/[“”]/g, '"'));
    } catch (e2) {
      return null;
    }
  }
}

if (typeof module !== "undefined" && module.exports) module.exports = { gwVideoFacts, gwVideoScriptPrompt, gwVideoScenePrompt, gwShortsPrompt, gwVideoParse };
