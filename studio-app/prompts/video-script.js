/* 공실스튜디오 영상 편집기 — 회원 AI 지시문 (서버 묶음으로 내려간다. 앱 설치 파일에는 넣지 않음)
   gwVideoScriptPrompt : 텍스트로 영상 만들기 — 대본 쓰기 (문단 = 장면, 문장 = 클립). 대본만 — 화면은 만들 때 gwVideoScenePrompt 로 (2026-10-20 사장님: 대본 쓸 때 화면까지 정하느라 느림)
   gwVideoScenePrompt  : 이미 있는 대본에 문장마다 화면 검색어만 붙이기
   gwShortsPrompt      : 롱폼 → 숏폼 구간 고르기
   gwVideoParse        : 답 해석 */

/* 면적은 평을 먼저 — "84㎡ (25.4평)" → "25.4평(84㎡)" (2026-10-21 사장님: 한국인에게는 평이 익숙하다)
   평이 함께 적혀 있으면 그 숫자를 쓰고, 없으면 ㎡ ÷ 3.3058 을 소수 첫째 자리까지. "3.3㎡당" 같은 단가는 그대로 둔다. */
function gwPyeongFirst(value) {
  let s = String(value == null ? "" : value);
  const NUM = /\d[\d,]*(?:\.\d+)?/.source;
  const UNIT = /(?:㎡|m²|m2|제곱미터)(?!\s*당)/.source;
  const count = (s.match(new RegExp(`${NUM}\\s*${UNIT}`, "g")) || []).length;
  if (!count) return s;
  let shared = [];
  const group = s.match(new RegExp(`\\s*\\(\\s*(?:약\\s*)?${NUM}\\s*평(?:\\s*\\/\\s*(?:약\\s*)?${NUM}\\s*평)+\\s*\\)`));
  if (group) {
    const nums = group[0].match(new RegExp(NUM, "g"));
    if (nums.length === count) { shared = nums; s = s.replace(group[0], ""); }
  }
  const one = new RegExp(`(${NUM})\\s*${UNIT}(?:\\s*\\(\\s*(?:약\\s*)?(${NUM})\\s*평\\s*\\)|\\s*\\/\\s*(?:약\\s*)?(${NUM})\\s*평(?!\\s*\\())?`, "g");
  let i = 0;
  return s.replace(one, (all, m2, py1, py2) => {
    const py = py1 || py2 || shared[i] || String(Math.round((parseFloat(m2.replace(/,/g, "")) / 3.3058) * 10) / 10);
    i++;
    return `${py}평(${m2}㎡)`;
  });
}

function gwVideoFacts(v) {
  if (!v) return "";
  const lines = [];
  if (v.title) lines.push(`- 물건: ${v.title}`);
  for (const f of v.fields || []) {
    if (!f || !f.label || !f.value) continue;
    if (/연락처|전화|휴대폰|임대인|의뢰인|비밀|메모|호수|상세주소/.test(f.label)) continue; // 개인정보는 AI 에 보내지 않는다
    lines.push(`- ${f.label}: ${gwPyeongFirst(String(f.value).slice(0, 200))}`);
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
    "- 문장 끝은 반드시 마침표(.)·물음표(?)·느낌표(!) 중 하나로 확실히 끝낸다. 말줄임표(…)·쉼표·물결(~)로 끝내거나 끝 부호를 빼먹지 않는다. 성우가 문장 끝을 또렷하게 내려 읽게 하기 위해서다.",
    "- text 하나에는 한 문장만 쓴다. 한 text 안에서 문장이 둘로 이어지면 두 줄(lines)로 나눈다.",
    "- 내용이 바뀌는 곳에서 장면을 나눈다 (장면 3~6개).",
    "- 투자 권유·과장 광고·단정 표현을 쓰지 않는다. 연락처·호수·개인 이름은 쓰지 않는다.",
    "- 면적은 평을 먼저 쓰고 ㎡는 바로 뒤 괄호에 쓰십시오. 예: 32평(105.6㎡). 자료에 평이 함께 적혀 있으면 그 숫자를 그대로 쓰고, ㎡만 있으면 ㎡ ÷ 3.3058을 소수 첫째 자리까지 반올림해 평으로 쓰십시오. ㎡만 따로 쓰지 마십시오.",
    "- 대본 글만 쓴다. 화면 설명·검색어는 쓰지 않는다.",
    "",
    "[출력] 설명 없이 아래 JSON 하나만 ```json 상자로:",
    '{"title":"영상 제목","scenes":[{"title":"장면 이름","lines":[{"text":"성우가 읽을 문장"}]}]}',
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

/* 완성 영상 SNS 올리기 — 유튜브 제목·설명·해시태그 + 인스타그램 캡션·해시태그 (2026-10-21, docs/2026-10-21_studio_sns_upload_plan.md)
   중개사무소 정보·공실뉴스 링크·출처 줄은 코드가 붙인다 (AI 는 쓰지 않는다) */
function gwVideoPostPrompt({ title = "", lines = [], vacancy = null, ratio = "16:9", seconds = 0 } = {}) {
  const facts = gwVideoFacts(vacancy);
  const shorts = ratio === "9:16" || ratio === "1:1";
  const script = (lines || []).map((t) => String(t || "").replace(/\s+/g, " ").trim()).filter(Boolean).join("\n").slice(0, 6000);
  return [
    "당신은 부동산 전문 매체 '공실뉴스'의 SNS 에디터입니다. 아래 완성된 부동산 영상을 유튜브와 인스타그램에 올릴 글을 씁니다.",
    "",
    title ? `[영상 제목(편집기 이름)] ${title}` : "",
    `[영상] ${shorts ? "세로 짧은 영상 (유튜브 쇼츠 · 인스타그램 릴스)" : "가로 영상 (유튜브 일반 영상)"}${seconds ? ` · 약 ${Math.round(seconds)}초` : ""}`,
    facts ? `[매물 정보 — 확인된 사실, 숫자·주소는 한 글자도 바꾸지 말 것, 없는 정보는 지어내지 말 것]\n${facts}` : "",
    script ? `[영상 대본 — 성우가 읽은 그대로]\n${script}` : "",
    "",
    "[원칙]",
    "- 영상과 매물 정보에 실제로 있는 내용만 씁니다. 없는 수치·시세·수익률·개발 호재·교통 시간을 만들지 않습니다.",
    "- 권유·호객·광고 표현을 쓰지 않습니다: \"문의하세요\", \"연락 주세요\", \"DM 주세요\", \"놓치지 마세요\", \"급매\", \"지금이 기회\", \"역대급\" 등.",
    "- 중개사무소 이름·전화번호·주소·링크·\"프로필 링크\" 안내는 쓰지 않습니다 (글 끝에 자동으로 붙습니다).",
    "- 면적은 평을 먼저 쓰고 ㎡는 바로 뒤 괄호에 쓰십시오. 예: 32평(105.6㎡). 자료에 평이 함께 적혀 있으면 그 숫자를 그대로 쓰고, ㎡만 있으면 ㎡ ÷ 3.3058을 소수 첫째 자리까지 반올림해 평으로 쓰십시오. ㎡만 따로 쓰지 마십시오.",
    "",
    "[유튜브 — youtube]",
    "- title: 40자 안팎 (최대 90자). 지역 + 매물 종류 + 핵심 조건이 앞에 오게. 낚시성 과장·물음표 남발 금지",
    "- description: 300~700자. 첫 두 줄에 무엇이 어디에 어떤 조건으로 나왔는지 결론부터. 이어서 영상에서 보여 준 순서대로 핵심을 짧은 문단으로",
    "- hashtags: 5~8개. # 없이 낱말만, 띄어쓰기 없이 (지역명·매물 종류 중심)",
    "",
    "[인스타그램 — instagram]",
    "- caption: 첫 줄은 25자 안팎의 훅 (지역 + 매물 핵심, 이모지 1개). 이어서 한 줄에 정보 하나씩 3~6줄, 줄마다 알맞은 이모지 하나로 시작. 전체 500자 이내",
    "- hashtags: 8~12개. # 없이 낱말만, 띄어쓰기 없이",
    "",
    "[출력] 설명 없이 아래 JSON 하나만 ```json 상자로:",
    '{"youtube":{"title":"","description":"","hashtags":[]},"instagram":{"caption":"","hashtags":[]}}',
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

if (typeof module !== "undefined" && module.exports) module.exports = { gwVideoFacts, gwVideoScriptPrompt, gwVideoScenePrompt, gwShortsPrompt, gwVideoPostPrompt, gwVideoParse };
