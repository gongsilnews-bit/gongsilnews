/* ══════════════════════════════════════════════════════════════
   공실마케팅 AI 채우기 — AI 매물보고서 · AI 유리창홍보지 (2026-10-15)

   공실뉴스 스튜디오 앱이 회원이 구독한 ChatGPT 로 쓴다 (API 비용 없음).
   도구가 지금 칸 글(틀 문구)을 보내면, 이 매물의 확인된 정보로 같은 칸을 충실하게 다시 쓴다.
   - 숫자(금액·면적·층·관리비)는 매물 정보 그대로. 칸 글에 숫자를 새로 만들지 않는다
   - 매물 정보에 없는 시세·수익률·개발 호재·역 이름·시설을 지어내지 않는다
   - 표시·광고법: "최고·유일·100%·무조건" 같은 과장 금지
   - 칸 길이는 지금 글과 비슷하게 (인쇄물 칸에 맞아야 한다)
   이 파일은 서버 묶음으로만 앱에 내려간다 (studio-app/scripts/sync-ext.mjs, 설치 파일에 넣지 않음).
   개인정보(집주인·의뢰인 이름·연락처·메모)는 앱이 매물 정보에서 아예 빼고 보낸다 (gwMkFacts 허용 목록).
   ══════════════════════════════════════════════════════════════ */

const GW_MK_KIND = {
  flyer: { label: "유리창 홍보지", role: "사무실 유리창과 온라인에 붙이는 A4 한 장 매물 홍보지" },
  report: { label: "매물보고서", role: "손님에게 보내거나 인쇄해 건네는 여러 페이지짜리 매물 소개 보고서" },
};

/* 칸마다 쓰임과 길이 — 없는 칸은 "지금 글과 같은 성격·길이" */
const GW_MK_GUIDE = {
  // 유리창 홍보지
  promotionText: "홍보지 위쪽에 크게 들어가는 한 줄 홍보 문구. 15~25자. 이 매물의 가장 큰 장점 하나. 금액은 따로 크게 들어가므로 넣지 말 것",
  subTitle: "매물 특징 3가지를 ' | '로 이은 한 줄. 특징마다 4~12자 (예: 남향 채광 | 즉시 입주 | 주차 가능)",
  noticeTitle: "코멘트 칸 제목. 8~16자",
  noticeContent: "줄마다 '◼︎ '로 시작하는 4~5줄 (줄바꿈 \\n). 줄마다 15~32자. 손님이 알고 싶은 장점·조건을 매물 정보의 사실로만",
  // 매물보고서
  coverTitle: "표지 큰 제목. 지금 글과 비슷한 길이",
  coverSubtitle: "표지 부제. 지금 글과 비슷한 길이",
  "investmentSummary.box1Title": "요약 박스 1 제목. 영어 대문자 짧게(지금 형식 유지)",
  "investmentSummary.box1Text": "요약 박스 1 글. 2줄(줄바꿈 \\n), 줄마다 6~14자",
  "investmentSummary.box2Title": "요약 박스 2 제목. 영어 대문자 짧게",
  "investmentSummary.box2Text": "요약 박스 2 글. 2줄, 줄마다 6~14자",
  "investmentSummary.box3Title": "요약 박스 3 제목. 영어 대문자 짧게",
  "investmentSummary.box3Text": "요약 박스 3 글. 2줄, 줄마다 6~14자",
  highlights: "핵심 장점 목록. 지금과 같은 개수, 항목마다 12~30자",
  valuationText: "가격·조건을 정리하는 해설 2~3문장. 매물 정보의 금액·조건만 쓰고 시세 비교·상승 전망을 만들지 말 것",
  page2HighlightBoxTitle: "핵심 장점 상자 제목. 짧게",
  chartAdviseText: "시세 그래프 아래 해설 2문장. 그래프 숫자는 중개사가 따로 넣는 값이므로 시세 수치·가치 상승 전망을 쓰지 말고, 이 매물의 금액·조건 정리와 '주변 시세는 상담 때 실거래 자료로 함께 확인' 같은 안내로 쓸 것",
  areaTargetName: "입지 배지. 2줄(줄바꿈 \\n): 1줄 '○○동 일대', 2줄 입지 특징 한 마디",
  areaTargetDesc: "입지 설명 2~3문장. 주변환경 정보에 있는 시설·교통만",
  areaBox1Title: "입지 상자 1 제목. 지금 형식 유지 (예: TRANSIT / 교통)",
  areaBox1Text: "입지 상자 1 글. 1~2문장, 40~70자. 교통 — 주변환경에 있는 것만",
  areaBox2Title: "입지 상자 2 제목. 지금 형식 유지",
  areaBox2Text: "입지 상자 2 글. 1~2문장, 40~70자. 생활 인프라 — 주변환경에 있는 것만",
  areaBox3Title: "입지 상자 3 제목. 지금 형식 유지",
  areaBox3Text: "입지 상자 3 글. 1~2문장, 40~70자. 이 매물의 쓰임새·장점 (개발 호재·가치 상승 전망은 쓰지 말 것)",
  page4TargetTitle: "입지 지도 제목. 지금 글과 비슷한 길이",
  leaseRightTitle: "임대 조건 상자 제목. 8~16자",
  leaseRightText: "임대 조건 요약. 줄마다 '• '로 시작하는 3~5줄(줄바꿈 \\n). 매물 정보의 금액·관리비·면적·층·입주·주차만",
  page6FooterQuote: "마지막 페이지 아래 인용 한 문장. 큰따옴표로 감쌀 것. 25~45자",
  "roadmap.box1Title": "추천 포인트 카드 1 제목. 8~16자",
  "roadmap.box1Text": "추천 포인트 카드 1 글. 2문장, 50~90자",
  "roadmap.box2Title": "추천 포인트 카드 2 제목. 8~16자",
  "roadmap.box2Text": "추천 포인트 카드 2 글. 2문장, 50~90자",
  "roadmap.box3Title": "추천 포인트 카드 3 제목. 8~16자",
  "roadmap.box3Text": "추천 포인트 카드 3 글. 2문장, 50~90자",
  "roadmap.box4Title": "추천 포인트 카드 4 제목. 8~16자",
  "roadmap.box4Text": "추천 포인트 카드 4 글. 2문장, 50~90자",
};

/* ── 매물 정보 → 사실 줄 (허용 목록만 — 개인정보는 들어가지 않는다) ── */
const GW_MK_LABELS = {
  building_name: "건물·단지명", sido: "시도", sigungu: "시군구", dong: "동", detail_addr: "번지",
  property_type: "물건 종류", sub_category: "세부 종류", trade_type: "거래 구분",
  deposit: "보증금·매매가", monthly_rent: "월세", maintenance_fee: "관리비",
  exclusive_m2: "전용면적(㎡)", supply_m2: "공급면적(㎡)", current_floor: "해당 층", total_floor: "전체 층",
  room_count: "방 수", bathroom_count: "욕실 수", direction: "방향", parking: "주차", move_in_date: "입주 가능일",
  options: "옵션", description: "매물 설명(중개사 작성)", themes: "특징 태그",
  approval_year: "사용승인 연도", constructor_name: "건설사", total_units: "총 세대수",
};
const GW_MK_META_SKIP = /phone|memo|owner|landlord|client|contact|mobile|email|_flyer|secret|private|password|token/i;

function gwMkWon(v) {
  const n = Number(v) || 0;
  if (n <= 0) return "";
  const man = Math.round(n / 10000);
  const eok = Math.floor(man / 10000);
  const rest = man % 10000;
  if (eok && rest) return `${eok}억 ${rest.toLocaleString()}만 원`;
  if (eok) return `${eok}억 원`;
  return `${man.toLocaleString()}만 원`;
}

function gwMkFacts(v) {
  const x = v || {};
  const lines = [];
  const push = (label, value) => {
    const t = Array.isArray(value) ? value.join(", ") : String(value == null ? "" : value).trim();
    if (t && t !== "-" && t !== "null") lines.push(`- ${label}: ${t.length > 600 ? `${t.slice(0, 600)}…` : t}`);
  };
  for (const [key, label] of Object.entries(GW_MK_LABELS)) {
    let value = x[key];
    if (value == null && x.metadata) value = x.metadata[key];
    if (["deposit", "monthly_rent", "maintenance_fee"].includes(key)) value = gwMkWon(value);
    push(label, value);
  }
  // 주변환경 (공실 등록 때 모은 주변 시설·교통)
  const infra = x.infrastructure && typeof x.infrastructure === "object" ? x.infrastructure : null;
  if (infra) {
    for (const [k, val] of Object.entries(infra)) {
      if (k.startsWith("_") || GW_MK_META_SKIP.test(k)) continue;
      if (val && typeof val === "object" && !Array.isArray(val)) continue;
      push(`주변환경 · ${k}`, val);
    }
  }
  // 그 밖의 등록 정보 (토지 용도지역·도로 폭 등)
  const meta = x.metadata && typeof x.metadata === "object" ? x.metadata : null;
  if (meta) {
    for (const [k, val] of Object.entries(meta)) {
      if (GW_MK_LABELS[k] || GW_MK_META_SKIP.test(k)) continue;
      if (val == null || typeof val === "object") continue;
      push(`등록 정보 · ${k}`, val);
    }
  }
  return lines.join("\n") || "- (등록된 정보가 거의 없음 — 칸 글을 일반적이고 사실에 어긋나지 않게만 다듬을 것)";
}

/* 지금 칸 글 → "키: 쓰임 / 지금 글" 목록 */
function gwMkFieldLines(fields) {
  const lines = [];
  for (const [key, value] of Object.entries(fields || {})) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [sub, v] of Object.entries(value)) {
        const k = `${key}.${sub}`;
        lines.push(`- ${k}: ${GW_MK_GUIDE[k] || "지금 글과 같은 성격·길이"}\n  지금 글: ${JSON.stringify(v)}`);
      }
    } else {
      lines.push(`- ${key}: ${GW_MK_GUIDE[key] || "지금 글과 같은 성격·길이"}\n  지금 글: ${JSON.stringify(value)}`);
    }
  }
  return lines.join("\n");
}

function gwBuildMarketingPrompt(kind, vacancy, fields) {
  const k = GW_MK_KIND[kind] || GW_MK_KIND.flyer;
  return `당신은 부동산 중개사무소의 매물 마케팅 카피라이터입니다.
아래 [매물 정보]만으로 "${k.label}"(${k.role})의 글 칸을 충실하게 채워 주십시오.
지금 칸에는 어느 매물에나 쓰는 틀 문구가 들어 있습니다. 이 매물에 꼭 맞는 구체적인 문장으로 바꿔 주십시오.

[매물 정보 — 공실뉴스에 등록된 확인된 사실]
${gwMkFacts(vacancy)}

[채울 칸 — 키: 쓰임과 길이 / 지금 글]
${gwMkFieldLines(fields)}

[사실 원칙 — 가장 먼저 지킬 것]
- 금액·면적·층·관리비·방 수 같은 숫자는 [매물 정보]에 있는 그대로만 쓰십시오. 새 숫자를 만들거나 계산하지 마십시오.
- [매물 정보]에 없는 시세·수익률·개발 호재·역 이름·학교·상가 이름·보안 설비·편의시설을 지어내지 마십시오.
  주변환경이 없으면 교통·인프라 칸은 매물 자체의 장점(면적·층·방향·주차·입주일 등)으로 채우십시오.
- "최고", "유일", "100%", "무조건", "확실한 수익" 같은 과장·단정 표현을 쓰지 마십시오 (부동산 표시·광고 기준).
- 중개사무소 이름·전화번호는 칸에 쓰지 마십시오 (홍보지에 따로 들어갑니다).
- [채울 칸]의 모든 칸을 빠짐없이 출력하십시오. 틀 문구를 그대로 두지 말고 이 매물에 맞게 새로 쓰십시오.

[문체와 모양]
- 손님이 한눈에 읽는 홍보물입니다. 짧고 분명하게, 따뜻하지만 차분한 말투로 쓰십시오.
- 칸마다 [채울 칸]에 적힌 길이를 지키십시오. 인쇄물 칸에 맞아야 합니다.
- 지금 글이 영어 제목 형식이면 그 형식을 유지하십시오.
- 줄바꿈이 필요한 칸은 문자열 안에 \\n 으로 쓰십시오.

[출력 형식]
설명 없이 아래처럼 JSON 하나만 \`\`\`json 코드블록으로 출력하십시오.
- 키는 [채울 칸]의 키 그대로 쓰고, 점(.)이 있는 키는 점 앞 이름의 객체 안에 넣으십시오. 예: "roadmap.box1Title" → { "roadmap": { "box1Title": "…" } }
- 목록 칸(배열)은 지금과 같은 개수의 문자열 배열로 쓰십시오.
- JSON.parse 가 가능한지 확인하십시오.

\`\`\`json
{ "키": "새 글" }
\`\`\``;
}

/* AI 답변 → 지금 칸과 같은 모양만 골라 돌려준다 (없는 키·모양이 다른 값은 버린다) */
function gwParseMarketing(text, fields) {
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
    else if (c === "}" && --depth === 0) { end = i; break; }
  }
  if (end < 0) return { ok: false, reason: "AI 답변이 끝나지 않았습니다." };
  let obj = null;
  const body = raw.slice(start, end + 1);
  for (const fix of [(s) => s, (s) => s.replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, "$1")]) {
    try { obj = JSON.parse(fix(body)); break; } catch (_) { /* 다음 */ }
  }
  if (!obj || typeof obj !== "object") return { ok: false, reason: "AI 답변의 JSON 을 읽지 못했습니다." };

  const out = {};
  const clean = (v) => String(v).trim();
  for (const [key, cur] of Object.entries(fields || {})) {
    // "roadmap.box1Title" 처럼 점으로 펴서 준 경우도 받는다
    let val = obj[key];
    if (cur && typeof cur === "object" && !Array.isArray(cur)) {
      const next = {};
      for (const sub of Object.keys(cur)) {
        const v = (val && typeof val === "object" ? val[sub] : undefined) ?? obj[`${key}.${sub}`];
        if (typeof v === "string" && v.trim()) next[sub] = clean(v);
      }
      if (Object.keys(next).length) out[key] = { ...cur, ...next };
    } else if (Array.isArray(cur)) {
      if (Array.isArray(val)) {
        const list = val.map((v) => clean(v)).filter(Boolean);
        if (list.length) out[key] = list.slice(0, Math.max(cur.length, 1) + 1);
      }
    } else if (typeof val === "string" && val.trim()) {
      out[key] = clean(val);
    }
  }
  if (!Object.keys(out).length) return { ok: false, reason: "AI 답변에 채울 글이 없습니다." };
  return { ok: true, fields: out };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { GW_MK_KIND, GW_MK_GUIDE, gwMkFacts, gwBuildMarketingPrompt, gwParseMarketing };
}
