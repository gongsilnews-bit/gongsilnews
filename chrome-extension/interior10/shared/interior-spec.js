/* ══════════════════════════════════════════════════════════════
   아파트 내부 인테리어 예측 시뮬레이터 — 인테리어 조건과 프롬프트

   공실뉴스 웹 시뮬레이터(marketing/home-interior)의 선택지와 프롬프트를
   글자 그대로 옮겨 왔다. 웹 시뮬레이터는 2026-10-01 삭제했으므로 이제 이 파일이 원본이다.
   (옛 원본은 git 이력의 marketing/home-interior/constants.ts · services/geminiService.ts)

   웹 시뮬레이터와 다른 점
   1) 웹은 API 의 responseSchema 로 JSON 형식을 넘겼다. 채팅 화면에는 그 방법이 없어
      같은 스키마(필드 이름·설명 원문)를 글로 덧붙인다.
   2) 채팅 화면용 문장은 원문 뒤에만 덧붙인다 (리모델링 작성기와 같은 원칙).

   함수·변수 이름(rm…, RM_…)은 리모델링 작성기(remodeling10)와 같게 두었다.
   sim.js · panel.js 를 그대로 쓰기 위해서다.
   ══════════════════════════════════════════════════════════════ */

/* 공간 유형 — 하나만 고른다 (웹은 드롭다운) */
const RM_ROOMS = [
  { id: "living-room", name: "거실 (Living Room)" },
  { id: "bedroom", name: "침실 (Bedroom)" },
  { id: "kitchen", name: "주방/다이닝 (Kitchen/Dining)" },
  { id: "bathroom", name: "욕실 (Bathroom)" },
  { id: "entrance", name: "현관/복도 (Entrance/Hallway)" },
  { id: "balcony", name: "발코니/베란다 (Balcony)" },
];

const RM_OPTIONS = {
  style: [
    { id: "modern", name: "모던 & 심플 (Modern & Simple)" },
    { id: "scandinavian", name: "북유럽/스칸디나비안 (Scandinavian)" },
    { id: "minimalist", name: "미니멀리즘 (Minimalist)" },
    { id: "industrial", name: "인더스트리얼 (Industrial)" },
    { id: "classic", name: "클래식/앤티크 (Classic)" },
    { id: "korean-modern", name: "한옥 모던/젠 스타일 (Korean Modern)" },
  ],
  ceiling: [
    { id: "flat", name: "평천장 (Flat/General)" },
    { id: "well", name: "우물천장/등박스 (Tray/Coffered)" },
    { id: "exposed", name: "노출 천장 (Exposed Concrete)" },
    { id: "molding", name: "웨인스코팅/몰딩 (Molded)" },
    { id: "wood-beam", name: "서까래/우드 빔 (Wood Beams)" },
    { id: "louver", name: "루버/격자 포인트 (Louver/Grid)" },
  ],
  floor: [
    { id: "light-wood", name: "밝은 우드 마루 (Light Wood)" },
    { id: "dark-wood", name: "짙은 우드 마루 (Dark Wood)" },
    { id: "porcelain-tile", name: "포세린 타일 (Matte Tile)" },
    { id: "marble", name: "대리석/폴리싱 타일 (Marble)" },
    { id: "herringbone", name: "헤링본 패턴 (Herringbone)" },
    { id: "concrete", name: "노출 콘크리트/에폭시 (Concrete)" },
  ],
  wall: [
    { id: "white-wallpaper", name: "화이트 실크벽지" },
    { id: "paint-color", name: "컬러 페인트 도장" },
    { id: "wood-panel", name: "템바보드/우드 패널" },
    { id: "stone-tile", name: "석재/아트월 타일" },
    { id: "brick", name: "파벽돌 포인트" },
    { id: "wainscoting", name: "웨인스코팅 (몰딩)" },
  ],
  lighting: [
    { id: "warm-white", name: "전구색 (따뜻한 느낌)" },
    { id: "daylight", name: "주광색 (밝고 환한 느낌)" },
    { id: "indirect", name: "간접 조명 중심 (은은함)" },
    { id: "spotlight", name: "스포트라이트/트랙 조명" },
    { id: "pendant", name: "포인트 펜던트 조명" },
    { id: "chandelier", name: "샹들리에/고급 조명" },
  ],
  furniture: [
    { id: "wood-rattan", name: "우드 & 라탄" },
    { id: "fabric-beige", name: "패브릭 (베이지/그레이)" },
    { id: "leather-dark", name: "가죽 (다크/카멜)" },
    { id: "metal-glass", name: "메탈 & 유리" },
    { id: "pastel", name: "파스텔 포인트" },
    { id: "vivid", name: "비비드 포인트" },
  ],
};

/* 화면에 보이는 순서와 이름 — 웹 시뮬레이터 "2. 인테리어 조건 입력"과 같다 */
const RM_GROUPS = [
  { key: "style", label: "인테리어 스타일" },
  { key: "ceiling", label: "천장 스타일" },
  { key: "floor", label: "바닥재" },
  { key: "wall", label: "벽면 마감" },
  { key: "furniture", label: "가구 톤/소재" },
  { key: "lighting", label: "조명 분위기" },
];

/* 예측 이미지는 1장으로 고정한다 (웹 시뮬레이터는 1~5개). 한 장이면 결과표가 바로 나오고 기사 사진도 명확하다 */
const RM_VERSIONS = [1];
const RM_RATIOS = [
  /* 원본과 같게 — 기본값. 방 사진을 다른 비율로 강제하면 창·문이 잘리거나 방이 넓게 왜곡된다 */
  { id: "original", name: "원본 (같은 구도)" },
  { id: "1:1", name: "1:1 (정방형)" },
  { id: "4:3", name: "4:3 (표준)" },
  { id: "3:2", name: "3:2 (사진)" },
  { id: "16:9", name: "16:9 (와이드)" },
];

/* 웹 시뮬레이터의 처음 선택값 (id 로 둔다) — 각 항목의 첫 번째
   버전 수는 1개로 고정한다 (웹은 2개) */
function rmDefaultDesign() {
  return {
    roomType: "living-room",
    style: ["modern"],
    ceiling: ["flat"],
    floor: ["light-wood"],
    wall: ["white-wallpaper"],
    lighting: ["warm-white"],
    furniture: ["wood-rattan"],
    versions: 1,
    aspectRatio: "original",
  };
}

/* 고른 id → 이름 목록 */
function rmNames(key, ids) {
  const list = RM_OPTIONS[key] || [];
  return (ids || []).map((id) => (list.find((o) => o.id === id) || {}).name).filter(Boolean);
}

/* 공간 유형 id → 이름 */
function rmRoomName(id) {
  return (RM_ROOMS.find((r) => r.id === id) || RM_ROOMS[0]).name;
}

/* "거실 (Living Room)" → "거실" — 결과표·기사에 쓰는 짧은 이름 */
function rmRoomShort(id) {
  return rmRoomName(id).replace(/\s*\(.*\)\s*$/, "");
}

/* ── 프롬프트 1: 설계 지시서 (웹 시뮬레이터 원문) ── */
function rmBuildSpecPrompt(design) {
  const n = design || rmDefaultDesign();
  const join = (key) => rmNames(key, n[key]).join(", ");
  return `
    역할: 당신은 '아파트 내부 인테리어 예측 시뮬레이터'의 수석 인테리어 디자이너입니다.
    목표: 사용자가 제공한 공간 정보와 설계 조건을 바탕으로, 사실적인 "인테리어 예측 렌더" 이미지를 생성하기 위한 상세한 지시사항과 요약 정보를 JSON 형식으로 생성합니다. 이 JSON의 모든 텍스트는 한국어로 작성되어야 하지만, 'imagePrompt'와 'versionDiffsEn' 필드만은 이미지 생성 모델의 성능을 위해 영어로 작성해야 합니다.

    사용자 입력:
    - 공간 유형: ${rmRoomName(n.roomType)}
    - 인테리어 스타일: ${join("style")}
    - 천장 스타일: ${join("ceiling")}
    - 바닥재: ${join("floor")}
    - 벽면 마감: ${join("wall")}
    - 조명 분위기: ${join("lighting")}
    - 가구 톤/소재: ${join("furniture")}
    - 생성 버전 수: ${n.versions}

    핵심 원칙 준수 (JSON 생성 시 이 원칙들을 반영해주세요):
    - 구조 보존: 원본 공간의 창문 위치, 구조벽, 천장 높이 등은 유지.
    - 현실성: 포토리얼리스틱 스타일, 과장된 CG 금지. 자연스러운 빛 반사 및 그림자.
    - 스타일 일관성: 선택된 인테리어 스타일, 천장 마감, 조명에 맞는 가구 배치와 소품 선정.
    - 디테일: 바닥재의 패턴(헤링본 등), 벽지의 질감, 조명의 색온도 반영.
    - 텍스트 제한: 이미지 생성 프롬프트(imagePrompt) 작성 시, 이미지 내에 한글 텍스트(Hangul)가 절대 포함되지 않도록 명시하세요.

    출력 형식(JSON):
    반드시 아래 스키마를 따르는 JSON 객체를 생성해주세요.

${rmSpecSchemaText(n.versions)}

    ※ imagePrompt 에는 카메라 위치·렌즈·시점·구도·화각(eye-level, wide-angle, two-point perspective 등)을 쓰지 마십시오.
      구도는 첨부할 원본 사진을 그대로 따르고, imagePrompt 는 실내의 마감재·색·가구·조명·소품만 설명하십시오.
    ※ 이미지는 아직 만들지 말고, 위 JSON 객체 하나만 코드 블록으로 출력하십시오. 설명 문장은 덧붙이지 마십시오.`;
}

/* 웹 시뮬레이터가 responseSchema 로 넘기던 형식을 글로 적는다 (필드 설명 원문) */
function rmSpecSchemaText(versions) {
  return `{
  "imagePrompt": "string — Photorealistic interior design rendering of an apartment room. Key features include...",
  "constraints": "string — 반드시 유지해야 할 창문 위치, 내력벽, 천장고 등 공간 구조 제약 사항.",
  "designSpec": {
    "roomType": "string — 대상 공간 유형.",
    "style": "string — 적용된 인테리어 스타일.",
    "ceiling": "string — 천장 마감 및 스타일.",
    "floor": "string — 바닥재 사양.",
    "wall": "string — 벽면 마감 사양.",
    "lighting": "string — 조명 및 분위기.",
    "furniture": "string — 주요 가구 및 소재 톤."
  },
  "versionDiffsEn": ["string — 각 버전을 차별화할 핵심 변경사항 (가구 배치, 포인트 컬러, 조명 변화 등)을 ${versions}개 항목으로 요약. 이 내용은 기본 imagePrompt에 추가되어 사용됩니다. (영어로 작성)"],
  "versionDiffsKo": ["string — versionDiffsEn의 각 항목을 자연스러운 한국어로 번역한 내용. ${versions}개의 항목으로 요약. 이 내용은 사용자에게 표시됩니다. (한국어로 작성)"],
  "disclaimer": "string — 결과물은 개념 시뮬레이션이며, 실제 시공 가능 여부 및 견적과는 차이가 있을 수 있다는 주의 문구."
}
필수 필드: imagePrompt, constraints, designSpec, versionDiffsEn, versionDiffsKo, disclaimer`;
}

/* ── 프롬프트 2: 예측 이미지 (웹 시뮬레이터 원문 — 글자 하나 바꾸지 않는다) ──
   웹은 ${imagePrompt}. Version-specific change: ${versionDiffsEn[i]} 를 INSTRUCTIONS 에 넣었다.

   원문은 그대로 두고, 채팅 화면용 보충 문장은 원문 뒤에만 덧붙인다.
   - "원본" 비율을 고르면 원문의 ${aspectRatio} 자리에 "the same as the source photo" 를 넣는다 (값만 바뀌고 문장은 원문 그대로).
   - 구도 유지 보충: 리모델링 작성기에서 AI 가 시점을 바꿔 다시 그린 일이 있어 같은 문장을 붙인다. */
function rmBuildImagePrompt(spec, versionIndex, aspectRatio) {
  const diff = (spec && spec.versionDiffsEn && spec.versionDiffsEn[versionIndex]) || "Apply base design.";
  const prompt = `${(spec && spec.imagePrompt) || ""}. Version-specific change: ${diff}`;
  const ratio = !aspectRatio || aspectRatio === "original" ? "the same as the source photo" : aspectRatio;
  return `
    **PRIMARY GOAL:** Generate a photorealistic interior design rendering based on the provided source image(s) and the following instructions.
    
    **INSTRUCTIONS:** ${prompt}.
    
    **CRITICAL RULES:**
    1.  **Preserve Room Structure:** Strictly maintain the room's shape, ceiling height, window locations, and door positions from the source image. Do not move structural walls.
    2.  **Photorealism Only:** The output MUST be a high-fidelity, photorealistic image. Avoid any CG, cartoonish, or overly stylized looks. Lighting and shadows must be natural.
    3.  **Correct Perspective:** Ensure the perspective matches the original photo. Correct any lens distortion.
    4.  **Interior Focus:** Focus on the interior design elements: flooring, wall finishes, furniture, and lighting.
    5.  **Privacy Blurring:** Automatically blur any personal photos in frames or recognizable faces.
    6.  **Aspect Ratio:** The final image aspect ratio must be exactly ${ratio}.
    7.  **No Korean Text:** Do NOT render any Korean text (Hangul) in the image. Any posters or books should have English or abstract text.
    `.trim() + RM_IMAGE_APPENDIX;
}

/* 원문 뒤에 붙이는 채팅 화면용 보충 문장 — 원문 문장은 건드리지 않는다 */
const RM_IMAGE_APPENDIX = `

[Additional note for this chat]
- Use the attached photo(s) of the current room as the source and edit them: keep the same camera position, angle and framing as the source photo, and keep every window, door and wall where it is.
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

/* 결과표의 디자인 사양 이름 — 웹 시뮬레이터 SPEC_LABELS 와 같다 */
const RM_SPEC_LABELS = {
  roomType: "공간 유형",
  style: "스타일",
  ceiling: "천장 마감",
  floor: "바닥재",
  wall: "벽면 마감",
  lighting: "조명",
  furniture: "가구/소품",
};
