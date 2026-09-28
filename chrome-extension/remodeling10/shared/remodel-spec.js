/* ══════════════════════════════════════════════════════════════
   건물 외관 리모델링 예측 시뮬레이터 — 설계 조건과 프롬프트

   공실뉴스 웹 시뮬레이터(/marketing/remodeling)의 선택지와 프롬프트를
   글자 그대로 옮겨 왔다. 문장을 고치면 웹 시뮬레이터와 결과가 달라지니
   바꿀 때는 두 곳을 같이 본다.

   웹 시뮬레이터와 다른 점은 둘뿐이다.
   1) 웹은 API 의 responseSchema 로 JSON 형식을 넘겼다. 채팅 화면에는 그 방법이 없어
      같은 스키마(필드 이름·설명 원문)를 글로 덧붙인다.
   2) 웹은 외장재를 영어 id 로 넣었다. 다른 항목처럼 한국어 이름으로 넣는다.
   ══════════════════════════════════════════════════════════════ */

const RM_OPTIONS = {
  materials: [
    { id: "stone", name: "석재 (화강암, 대리석)" },
    { id: "ceramic", name: "세라믹 패널" },
    { id: "metal", name: "메탈 패널 (알루미늄 복합)" },
    { id: "low-e-glass", name: "로이유리 (커튼월)" },
    { id: "brick", name: "벽돌 (고벽돌, 점토벽돌)" },
    { id: "stucco", name: "스타코 / 스터코플렉스" },
    { id: "wood", name: "목재 사이딩" },
  ],
  windows: [
    { id: "aluminum-system", name: "알루미늄 시스템창호" },
    { id: "pvc-double", name: "PVC 이중창" },
    { id: "curtain-wall", name: "커튼월 (유리)" },
    { id: "wood-frame", name: "목재 프레임 창호" },
    { id: "project-window", name: "프로젝트 창" },
    { id: "fixed-window", name: "픽스 창 (고정창)" },
  ],
  colors: [
    { id: "monochrome", name: "모노크롬 (화이트, 그레이, 블랙)" },
    { id: "neutral", name: "뉴트럴 (베이지, 아이보리)" },
    { id: "warm-tone", name: "웜톤 (브라운, 테라코타)" },
    { id: "cool-tone", name: "쿨톤 (블루, 그린 계열)" },
    { id: "wood-accent", name: "목재 포인트" },
    { id: "metallic-accent", name: "메탈릭 포인트" },
  ],
  facade: [
    { id: "vertical-louver", name: "수직 루버/핀" },
    { id: "horizontal-louver", name: "수평 루버/브리즈 레일" },
    { id: "metal-mesh", name: "메탈 메쉬/확장망" },
    { id: "3d-protrusion", name: "입체적 돌출/보이드" },
    { id: "ground-floor-glass", name: "1층 전면 통유리" },
    { id: "curved-design", name: "비정형/곡선 디자인" },
  ],
  signage: [
    { id: "led-channel", name: "LED 채널 사인" },
    { id: "backlit", name: "백라이트 사인" },
    { id: "minimalist-lettering", name: "미니멀리즘 레터링" },
    { id: "projecting-sign", name: "돌출/플래그 사인" },
    { id: "neon-sign", name: "네온 사인" },
    { id: "no-signage", name: "사인 없음" },
  ],
  landscaping: [
    { id: "planter-box", name: "플랜터 박스" },
    { id: "vertical-garden", name: "수직 정원/벽면 녹화" },
    { id: "rooftop-garden", name: "옥상 정원" },
    { id: "gravel-finish", name: "자갈/조약돌 마감" },
    { id: "deck-terrace", name: "데크/테라스" },
    { id: "no-landscaping", name: "조경 없음" },
  ],
  lighting: [
    { id: "linear-lighting", name: "라인 조명 (윤곽 강조)" },
    { id: "uplight-spotlight", name: "업라이트/스포트라이트" },
    { id: "wall-sconce", name: "벽부등" },
    { id: "eaves-indirect", name: "처마 간접 조명" },
    { id: "recessed-light", name: "계단/바닥 매입등" },
    { id: "no-lighting", name: "조명 계획 없음" },
  ],
};

/* 화면에 보이는 순서와 이름 — 웹 시뮬레이터 "2. 설계 조건 입력"과 같다 */
const RM_GROUPS = [
  { key: "materials", label: "주요 외장재" },
  { key: "windows", label: "창호" },
  { key: "colors", label: "색상" },
  { key: "facade", label: "파사드 구성" },
  { key: "signage", label: "간판/사인" },
  { key: "landscaping", label: "조경" },
  { key: "lighting", label: "조명" },
];

/* 예측 이미지는 1장으로 고정한다 (웹 시뮬레이터는 1~5개). 한 장이면 결과표가 바로 나오고 기사 사진도 명확하다 */
const RM_VERSIONS = [1];
const RM_RATIOS = [
  /* 원본과 같게 — 기본값. 세로로 긴 사진을 가로 비율로 강제하면 위층이 잘려 나간다 */
  { id: "original", name: "원본 (같은 구도)" },
  { id: "1:1", name: "1:1 (정방형)" },
  { id: "4:3", name: "4:3 (표준)" },
  { id: "3:2", name: "3:2 (사진)" },
  { id: "16:9", name: "16:9 (와이드)" },
];

/* 웹 시뮬레이터의 처음 선택값 (id 로 둔다)
   버전 수는 1개로 고정한다 — 이미지 한 장이면 결과표가 바로 나온다 (웹은 2개) */
function rmDefaultDesign() {
  return {
    materials: ["stone"],
    windows: ["aluminum-system", "curtain-wall"],
    colors: ["monochrome", "wood-accent"],
    facade: ["vertical-louver", "ground-floor-glass"],
    signage: ["backlit"],
    landscaping: ["planter-box"],
    lighting: ["linear-lighting", "uplight-spotlight"],
    versions: 1,
    aspectRatio: "original",
  };
}

/* 고른 id → 이름 목록 */
function rmNames(key, ids) {
  const list = RM_OPTIONS[key] || [];
  return (ids || []).map((id) => (list.find((o) => o.id === id) || {}).name).filter(Boolean);
}

/* ── 프롬프트 1: 설계 지시서 (웹 시뮬레이터 원문) ── */
function rmBuildSpecPrompt(design) {
  const n = design || rmDefaultDesign();
  const join = (key) => rmNames(key, n[key]).join(", ");
  return `
    역할: 당신은 '건물 외관 리모델링 예측 시뮬레이터'의 프롬프트 엔지니어입니다.
    목표: 사용자가 제공한 설계 조건을 바탕으로, 사실적인 "예측 렌더" 이미지를 생성하기 위한 상세한 지시사항과 요약 정보를 JSON 형식으로 생성합니다. 이 JSON의 모든 텍스트는 한국어로 작성되어야 하지만, 'imagePrompt'와 'versionDiffsEn' 필드만은 이미지 생성 모델의 성능을 위해 영어로 작성해야 합니다.

    사용자 입력:
    - 외장재: ${join("materials")}
    - 창호: ${join("windows")}
    - 색상: ${join("colors")}
    - 파사드 구성: ${join("facade")}
    - 간판/사인: ${join("signage")}
    - 조경: ${join("landscaping")}
    - 조명: ${join("lighting")}
    - 생성 버전 수: ${n.versions}

    핵심 원칙 준수 (JSON 생성 시 이 원칙들을 반영해주세요):
    - 구조 보존: 원본 건물의 구조벽, 층수, 창 위치 등은 유지.
    - 현실성: 포토리얼리스틱 스타일, 과장된 CG/반사 금지. 수직/수평 라인 보정.
    - 디테일: 재료 질감, 줄눈, 코너 디테일 반영.
    - 맥락 유지: 주변 환경과 스케일감 약하게 유지.
    - 개인정보 보호: 차량번호, 얼굴 등은 흐리게 처리.
    - 텍스트 제한: 이미지 생성 프롬프트(imagePrompt) 작성 시, 간판이나 외벽에 한글 텍스트(Hangul)가 절대 포함되지 않도록 명시하세요. 텍스트가 필요한 경우 반드시 영문을 사용하도록 지시하세요.

    출력 형식(JSON):
    반드시 아래 스키마를 따르는 JSON 객체를 생성해주세요.

${rmSpecSchemaText(n.versions)}

    ※ imagePrompt 에는 카메라 위치·렌즈·시점·구도·화각(eye-level, tilt-shift, two-point perspective 등)을 쓰지 마십시오.
      구도는 첨부할 원본 사진을 그대로 따르고, imagePrompt 는 외관의 재료·색·창호·조명·간판·조경만 설명하십시오.
    ※ 이미지는 아직 만들지 말고, 위 JSON 객체 하나만 코드 블록으로 출력하십시오. 설명 문장은 덧붙이지 마십시오.`;
}

/* 웹 시뮬레이터가 responseSchema 로 넘기던 형식을 글로 적는다 (필드 설명 원문) */
function rmSpecSchemaText(versions) {
  return `{
  "imagePrompt": "string — Photorealistic architectural rendering of a remodeled building exterior. Key features include...",
  "constraints": "string — 반드시 유지해야 할 구조, 모듈, 라인 등 제약 및 보존 규칙.",
  "designSpec": {
    "materials": "string — 선택된 핵심 외장재 요약.",
    "colors": "string — 주요 색상 팔레트 요약.",
    "windows": "string — 창호 프레임 및 스타일 요약.",
    "signage": "string — 간판/사인 계획 요약.",
    "lighting": "string — 조명 계획 요약.",
    "landscaping": "string — 조경 요소 요약."
  },
  "versionDiffsEn": ["string — 각 버전을 차별화할 핵심 변경사항 (재료, 색, 조명 전략 등)을 ${versions}개 항목으로 요약. 이 내용은 기본 imagePrompt에 추가되어 사용됩니다. (영어로 작성)"],
  "versionDiffsKo": ["string — versionDiffsEn의 각 항목을 자연스러운 한국어로 번역한 내용. ${versions}개의 항목으로 요약. 이 내용은 사용자에게 표시됩니다. (한국어로 작성)"],
  "disclaimer": "string — 결과물은 개념 시뮬레이션이며, 실제 시공, 구조 안전, 법규 적합을 보장하지 않는다는 내용의 주의 문구."
}
필수 필드: imagePrompt, constraints, designSpec, versionDiffsEn, versionDiffsKo, disclaimer`;
}

/* ── 프롬프트 2: 예측 이미지 (웹 시뮬레이터 원문 — 글자 하나 바꾸지 않는다) ──
   웹은 ${imagePrompt}. Version-specific change: ${versionDiffsEn[i]} 를 INSTRUCTIONS 에 넣었다.

   원문은 그대로 두고, 채팅 화면용 보충 문장은 원문 뒤에만 덧붙인다 (사장님 결정 2026-09-28).
   - "원본" 비율을 고르면 원문의 ${aspectRatio} 자리에 "the same as the source photo" 를 넣는다 (값만 바뀌고 문장은 원문 그대로).
   - 구도 유지 보충: Gemini 가 올려다본 원본을 눈높이로 다시 그려 위층이 잘린 일이 있어, 원문 뒤에 붙인다. */
function rmBuildImagePrompt(spec, versionIndex, aspectRatio) {
  const diff = (spec && spec.versionDiffsEn && spec.versionDiffsEn[versionIndex]) || "Apply base design.";
  const t = `${(spec && spec.imagePrompt) || ""}. Version-specific change: ${diff}`;
  const o = !aspectRatio || aspectRatio === "original" ? "the same as the source photo" : aspectRatio;
  return `
    **PRIMARY GOAL:** Generate a photorealistic architectural rendering of a remodeled building, based on the provided source image(s) and the following instructions.
    
    **INSTRUCTIONS:** ${t}.
    
    **CRITICAL RULES:**
    1.  **Preserve Core Structure:** Strictly maintain the original building's structural walls, number of floors, floor heights, column spacing, and core locations from the source image.
    2.  **Photorealism Only:** The output MUST be a high-fidelity, photorealistic image. Avoid any CG, cartoonish, or overly stylized looks. Reflections and glossiness must be realistic.
    3.  **Correct Geometry:** Ensure all vertical and horizontal lines are perfectly straight. Correct any lens distortion from the source photo.
    4.  **Contextual Integrity:** Keep the adjacent sidewalks, roads, and general scale of the surroundings, but ensure the remodeled building is the main focus.
    5.  **Privacy Blurring:** Automatically blur any recognizable faces or vehicle license plates.
    6.  **Aspect Ratio:** The final image aspect ratio must be exactly ${o}.
    7.  **No Korean Text:** Do NOT render any Korean text (Hangul) in the image. If signage is required, use English text or abstract patterns only.
    `.trim() + RM_IMAGE_APPENDIX;
}

/* 원문 뒤에 붙이는 채팅 화면용 보충 문장 — 원문 문장은 건드리지 않는다 */
const RM_IMAGE_APPENDIX = `

[Additional note for this chat]
- Use the attached photo(s) of the current building as the source and edit them: keep the same camera position, angle and framing as the source photo, and keep every floor of the building visible.
- Generate the image now.`;

/* ── AI 답변에서 설계 지시서 JSON 을 꺼낸다 ──
   코드 블록·앞뒤 설명이 섞여도 첫 번째로 닫히는 { } 를 찾는다. 흔한 오류(끝 쉼표·둥근 따옴표)는 고쳐 본다. */
function rmParseSpec(text) {
  const raw = String(text || "");
  const start = raw.indexOf("{");
  if (start < 0) return { ok: false, reason: "AI 답변에서 JSON 을 찾지 못했습니다." };
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) return { ok: false, reason: "AI 답변의 JSON 이 끝나지 않았습니다. 답변이 다 나온 뒤 다시 눌러 주세요." };
  let body = raw.slice(start, end + 1);
  let obj = null;
  for (const fix of [
    (s) => s,
    (s) => s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'"),
    (s) => s.replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, "$1"),
  ]) {
    try { obj = JSON.parse(fix(body)); break; } catch (_) { /* 다음 방법 */ }
  }
  if (!obj) return { ok: false, reason: "AI 답변의 JSON 을 읽지 못했습니다. AI 탭에서 'JSON 형식으로 다시 출력해줘'라고 요청한 뒤 다시 눌러 주세요." };

  const arr = (v) => (Array.isArray(v) ? v.map((x) => String(x || "").trim()).filter(Boolean) : []);
  const spec = {
    imagePrompt: String(obj.imagePrompt || "").trim(),
    constraints: String(obj.constraints || "").trim(),
    designSpec: obj.designSpec && typeof obj.designSpec === "object" ? obj.designSpec : {},
    versionDiffsEn: arr(obj.versionDiffsEn),
    versionDiffsKo: arr(obj.versionDiffsKo),
    disclaimer: String(obj.disclaimer || "").trim(),
  };
  if (!spec.imagePrompt) return { ok: false, reason: "지시서에 imagePrompt 가 없습니다. AI 탭에서 스키마대로 다시 출력해 달라고 요청해 주세요." };
  return { ok: true, spec };
}

/* 결과표의 디자인 사양 이름 — 웹 시뮬레이터 tc 와 같다 */
const RM_SPEC_LABELS = {
  materials: "외장재",
  colors: "색상",
  windows: "창호",
  signage: "간판/사인",
  lighting: "조명",
  landscaping: "조경",
};
