/* ══════════════════════════════════════════════════════════════
   인테리어 결과표 → 기사 · 블로그 · 유튜브 대본 지시문

   원자료는 1 · 시뮬레이션의 결과표 하나다.
   - 결과표에 있는 인테리어 조건·예측 모습·예상 공사비만 사실로 쓴다
   - 공사비는 확장이 계산한 범위를 그대로 쓰고, AI 가 새 금액을 만들지 않는다
   - "대략적인 예상 공사비이며, 꼭 실질적인 확인이 필요합니다" 를 반드시 넣는다
   - 개념 시뮬레이션이다. 실제 공사 계획·확정된 공사처럼 쓰지 않는다

   출력 JSON 형식은 기사 작성기와 같다 (article-json · 블로그 · youtube-json 이 그대로 읽는다).
   함수 이름(gwBuildRemodel…)은 리모델링 작성기와 같게 두었다 — blog-prompt · youtube-prompt 가 이 이름으로 부른다.
   ══════════════════════════════════════════════════════════════ */

/* 결과표 → "확인된 사실" 글 */
function rmResultFactLines(r) {
  if (!r) return "(결과표 없음)";
  const lines = [];
  const seen = new Set(); // 같은 항목(예: 소재지)이 결과표와 매물 정보에 겹치면 한 번만
  const push = (k, v) => {
    const t = String(v == null ? "" : v).trim();
    const key = `${k}:${t}`;
    if (!t || seen.has(key)) return;
    seen.add(key);
    lines.push(`- ${k}: ${t}`);
  };
  if (rmIsListing(r)) {
    lines.push(r.saleKind
      ? `[공실뉴스 ${r.saleKind} 물건 정보 — 공실열람에 게재된 확인된 사실]`
      : "[공실뉴스 매물 정보 — 공실열람에 등록된 확인된 사실]");
    push(r.saleKind ? `${r.saleKind} 물건` : "매물", r.title);
    push("소재지", r.location);
    push("금액", r.priceText);
    for (const f of (r.vacancyFacts || []).slice(0, 20)) push(f.label, f.value);
    push("특징", (r.themes || []).join(" "));
    push("주변환경", r.infra);
  } else {
    lines.push("[대상 공간 — 사용자가 직접 올린 실내 사진 (공실 매물 아님)]");
    push("대상", r.title);
    push("소재지", r.location);
  }
  lines.push("");
  lines.push("[인테리어 조건 — 사용자가 고른 것]");
  for (const [label, names] of Object.entries(r.design || {})) push(label, (names || []).join(", "));
  lines.push("");
  lines.push("[예측 결과 — AI 시뮬레이션]");
  const spec = r.designSpec || {};
  for (const key of Object.keys(RM_SPEC_LABELS)) push(`디자인 사양 · ${RM_SPEC_LABELS[key]}`, spec[key]);
  (r.versions || []).forEach((v) => push(`예측 버전 ${v.index}`, v.diffKo));
  push("보존한 구조", r.constraints);
  lines.push("");
  const c = r.cost;
  if (c) {
    lines.push("[예상 공사비 — 공실뉴스 단가표로 계산한 개략 범위. 이 숫자만 쓸 것]");
    push("합계", c.rangeText);
    push("계산 기준", `${c.basisText} (${c.areaText})`);
    for (const it of c.items) push(`항목 · ${it.label}`, `${rmWon(it.min)} ~ ${rmWon(it.max)} (${it.basis || ""})`);
    push("제외", c.excludes);
    push("필수 문구", c.notice);
  }
  push("주의", r.disclaimer);
  return lines.join("\n");
}

/* 공실열람에서 가져온 매물인가 — 매물이면 "이 가격에 나온 집" 이야기로 쓴다 */
function rmIsListing(r) {
  return Boolean(r && (r.vacancyId || r.priceText || (r.vacancyFacts || []).length));
}

/* 결과표의 공간 이름 ("거실") — 옛 결과표에는 없을 수 있다 */
const rmRoomOf = (r) => (r && r.roomName) || "실내";

/* "거실을" · "주방/다이닝을" · "발코니/베란다를" — 마지막 글자 받침으로 을/를을 고른다 */
function rmObj(word) {
  const code = String(word).charCodeAt(String(word).length - 1) - 0xac00;
  return word + (code >= 0 && code <= 11171 && code % 28 ? "을" : "를");
}

/* 공실 매물일 때의 글 흐름 — 매물 보도로 열고 시뮬레이션으로 잇는다 */
function rmStoryFlow(r) {
  const room = rmRoomOf(r);
  return rmIsListing(r)
    ? `[글의 흐름 — 공실 매물]
${r.saleKind
    ? `① 첫 문단: 이 집이 ${r.saleKind}로 나왔다는 것부터 연다 (소재지·단지·면적·감정가·최저입찰가)
   예: "서울 송파구 잠실동 전용 84㎡ 아파트가 ${r.saleKind}로 나왔다. 감정가 20억 원, 최저입찰가 16억 원이다."`
    : `① 첫 문단: 공실뉴스(공실열람)에 이 집이 어떤 조건으로 나왔는지 매물 보도로 연다 (소재지·단지·면적·거래 구분·금액)
   예: "공실뉴스 공실열람에 서울 송파구 잠실동 전용 84㎡ 아파트가 전세 8억 원에 나왔다."`}
② 지금 집의 조건 — 면적·층·방 수·입주 가능일·특징 등 [공실뉴스 매물 정보]에 있는 것
③ 이 집 ${rmObj(room)} [인테리어 조건]으로 꾸미면 어떤 모습이 예상되는지 — 시뮬레이션 결과
④ 예상 공사비 — [예상 공사비]의 범위 그대로, 필수 문구와 함께
⑤ 해설 — 어떤 수요층에 어울리는 인테리어인지, 매매·임대에 미칠 수 있는 영향, 공사 전에 확인할 점
매물 금액과 예상 공사비는 각각 사실로 나란히 전하고, 둘을 더하거나 나눈 비율·총비용을 계산하지 마십시오.`
    : `[글의 흐름 — 직접 올린 사진]
① 어떤 공간(${room})을 시뮬레이션했는지 ② 고른 인테리어 조건 ③ 예측된 모습 ④ 예상 공사비 ⑤ 해설과 확인할 점
공실 매물이 아니므로 금액·매물 조건을 쓰지 마십시오.`;
}

/* 해설로 쓸 수 있는 것 / 없는 것 — 가능성은 쓰되 단정·수치는 쓰지 않는다 */
const RM_OPINION_RULES = `[해설 원칙 — 기자로서 판단을 쓰는 부분]
쓸 수 있는 것 (반드시 "~일 수 있다", "~를 검토해 볼 만하다", "~할 여지가 있다" 같은 가능성 표현으로):
- 매물 조건(면적·방 수·주변환경 등)에 비추어 어떤 수요층(신혼부부·자녀 가구·1인 가구 등)에 어울리는 인테리어일 수 있는지
  예: "방 3개 중형 면적이라 밝은 우드와 화이트 톤이 자녀를 둔 가구에 무난하게 받아들여질 수 있다"
- 인테리어 개선이 집의 첫인상·임차 수요·매매 협상에 긍정적으로 작용할 여지가 있다는 점
  예: "낡은 마감을 바꾸면 집을 보러 온 사람의 첫인상이 달라질 여지가 있다"
- 고른 마감재의 일반적인 성격과 장단점 — 관리·내구성·청소·분위기
  예: "대리석 느낌의 폴리싱 타일은 고급스러워 보이지만 겨울철 발이 차가울 수 있다"
- 실제로 진행하려면 확인할 점 — 정밀 견적, 관리사무소 공사 신고·이웃 동의, 공사 기간과 소음, 전·월세라면 집주인 동의와 원상복구
쓸 수 없는 것:
- 수치 전망: "집값 1억 상승", "전세가 20% 인상", "수익률 ○%", "몇 년 안에 회수"
- 단정·보장: "반드시", "확실히", "무조건 이득", "보장된다"
- 근거 없는 해설: [결과표]에 없는 단지 시설·개발 호재·시세를 지어내서 판단의 근거로 쓰기
- 매수·계약 권유: "지금 사야 한다", "놓치지 마라"
- 특정 인테리어 업체·브랜드·제품 이름`;

/* 모든 글에 공통으로 박는 원칙 */
const RM_FACT_RULES = `[사실 원칙 — 가장 먼저 지킬 것]
- 이 글의 소재는 "실내 인테리어 예측 시뮬레이션"입니다. 실제 공사 계획이나 이미 끝난 공사가 아닙니다.
  "~로 바뀌었다", "공사한다"처럼 확정된 일로 쓰지 말고 "~로 꾸미면 이런 모습이 예상된다", "시뮬레이션해 보니"처럼 쓰십시오.
- 인테리어 조건·예측 결과·공사비는 위 [결과표]에 있는 것만 쓰십시오. 없는 자재·가구·가전·업체·일정을 만들지 마십시오.
- 매물 금액·면적·층 등 매물 조건은 [공실뉴스 매물 정보]에 있는 그대로 쓰십시오. 한 글자도 바꾸지 마십시오.
- 공사비는 [예상 공사비]의 범위를 그대로 쓰고, 새 금액·평당 단가·집값 상승폭을 만들지 마십시오.
- 공사비를 말할 때는 반드시 "대략적인 예상 공사비이며, 꼭 실질적인 확인이 필요합니다"라는 뜻을 함께 쓰십시오.
- 공사비는 [결과표]의 공간 하나({공간}) 기준입니다. 집 전체 공사비처럼 쓰지 마십시오.
- 소재지·매물 조건은 [결과표]에 있는 범위까지만 쓰십시오. 동·호수 등 더 상세한 주소를 추측하지 마십시오.
- 구조 변경(벽 철거·확장)이 가능하다고 단정하지 마십시오. 필요하면 "전문가 확인이 필요하다"로 쓰십시오.
- 중개사무소 이름·연락처·링크는 쓰지 마십시오.`;

/* 공간 이름을 넣은 사실 원칙 */
const rmFactRules = (r) => RM_FACT_RULES.replace("{공간}", rmRoomOf(r));

/* ═════════════ 기사 ═════════════ */
const RM_KIND = {
  news: {
    label: "뉴스기사형",
    brief: "도입부터 결론까지 문단이 자연스럽게 이어지는 뉴스 기사입니다. 아래 [글의 흐름] 순서대로 풀어 주십시오.",
    subs: "1) 어떤 집이 어떤 조건으로 나왔나  2) 인테리어를 바꾸면 어떤 모습인가  3) 예상 공사비와 검토할 점",
    subsPhoto: "1) 어떤 공간을 시뮬레이션했나  2) 어떤 조건으로 꾸미면 어떤 모습인가  3) 예상 공사비와 확인할 점",
  },
  summary: {
    label: "단락별 요약",
    brief: "첫 문단에서 기사 전체를 요약한 뒤, 핵심 내용을 '■ 소제목' 단위로 나누어 독자가 빠르게 훑어볼 수 있게 쓰십시오. 소제목 순서는 아래 [글의 흐름]을 따르십시오.",
    subs: "1) 매물 조건  2) 예측 인테리어의 특징  3) 예상 공사비와 검토할 점",
    subsPhoto: "1) 대상 공간과 인테리어 조건  2) 예측 인테리어의 특징  3) 예상 공사비와 확인할 점",
  },
};

function gwBuildRemodelArticlePrompt(result, opts) {
  const o = opts || {};
  const len = GW_LENGTH[o.length] || GW_LENGTH.normal;
  const kind = RM_KIND[o.kind] || RM_KIND.news;
  const listing = rmIsListing(result);
  const room = rmRoomOf(result);
  return `당신은 부동산 전문 매체 "공실뉴스"의 주거·인테리어 담당 기자입니다.
아래 결과표를 소재로 기사 1건을 작성하십시오.
${listing
    ? `독자가 "공실뉴스에 이 조건으로 나온 집의 ${rmObj(room)} 이렇게 꾸미면 이런 모습이 되고 공사비는 대략 이 정도"를 알 수 있게 씁니다.`
    : `독자가 "이 ${rmObj(room)} 이런 조건으로 꾸미면 이렇게 달라지고, 공사비는 대략 이 정도"를 알 수 있게 씁니다.`}

[결과표 — 확인된 사실]
${rmResultFactLines(result)}

${rmFactRules(result)}

${rmStoryFlow(result)}

${RM_OPINION_RULES}
- ★ 해설(⑤)에 기사 분량의 3분의 1 이상을 쓰십시오.

[기사 스타일] ${kind.label}
${kind.brief}

[분량]   ★ 반드시 지키십시오
- 본문 전체 ${len.chars}
- 문단 ${len.paras}
- 분량이 모자라면 해설 구역을 더 쓰십시오. 결과표 항목을 되풀이해 길이를 채우지 마십시오.

[문체]
- 평서체 경제 기사체 ("~했다", "~로 예상된다")
- 과장 광고 표현을 쓰지 마십시오

[구성]
- title     : 25~45자. 대괄호 말머리 [인테리어 시뮬레이션] 으로 시작${listing ? `\n              지역·주택 종류·금액과 공간(${room})을 넣을 것 (예: [인테리어 시뮬레이션] 잠실동 84㎡ 전세 8억 아파트, 거실 바꾸면)` : ""}
- subtitle  : 세 줄. 각 30~50자, 마침표 없이 끝낼 것
              ${listing ? kind.subs : kind.subsPhoto}
- body      : 위 분량대로 쓴 문단별 문자열 배열. 배열 항목 하나가 문단 하나이며 HTML 태그를 쓰지 말 것
${gwBodyStyle(o, len)}
              공사비 문단에는 "대략적인 예상 공사비이며, 꼭 실질적인 확인이 필요하다"는 문장을 넣을 것
              마지막 문단은 "이번 결과는 공실뉴스 인테리어 예측 시뮬레이션으로 만든 개념 이미지로, 실제 공사 전에는 현장 실측과 정밀 견적이 필요하다."로 맺을 것
- keywords  : 5~8개. # 없이 낱말만. 지역명·주택 종류·인테리어·공간(${room})·주요 스타일을 포함할 것${listing ? "·거래 구분" : ""}

${GW_ARTICLE_OUTPUT}`;
}

/* ═════════════ 블로그 ═════════════
   칩 자리(listing·visit·story·report·consult·shortform)는 기사 작성기와 같고 뜻만 인테리어용이다. */
const RM_BLOG_STYLE = {
  listing: {
    label: "인테리어 소개형", fit: "모든 집", design: "basic",
    titleExample: "잠실동 84㎡ 아파트 거실, 모던 스타일로 바꾸면",
    guide: "깔끔하고 정보 중심으로 쓴다. 첫 문단에서 어떤 집의 어떤 공간을 어떤 조건으로 시뮬레이션했는지 밝히고, 예측 모습과 공사비를 정리한다.",
    structure: "소제목 3~4개 (예: ■ 지금 모습 / ■ 고른 인테리어 조건 / ■ 예측된 모습 / ■ 예상 공사비와 확인할 점)",
  },
  visit: {
    label: "전·후 비교형", fit: "구축 아파트", design: "magazine",
    titleExample: "낡은 벽지·장판이 우드·화이트로… 전후를 비교해 보니",
    guide: "현재 모습과 예측 인테리어를 부분별로 나란히 비교한다(바닥·벽·천장·조명·가구). 실제 공사를 한 것처럼 쓰지 않는다.",
    structure: "소제목 4~5개, 부분별 비교 (예: ■ 바닥 / ■ 벽과 천장 / ■ 조명 / ■ 가구와 분위기 / ■ 예상 공사비)",
  },
  story: {
    label: "스토리텔링형", fit: "신혼·이사 준비", design: "magazine",
    titleExample: "20년 된 아파트 거실, 이렇게 꾸미면 달라질까?",
    guide: "질문이나 상황으로 시작해 시뮬레이션 과정을 따라가듯 풀어 쓴다. 인물·사례를 지어내지 않는다.",
    structure: "소제목 3~4개 (예: ■ 질문 하나 / ■ 조건을 골라 보니 / ■ 달라진 모습 / ■ 비용과 현실)",
  },
  report: {
    label: "공사비 분석형", fit: "매매·임대 준비", design: "news",
    titleExample: "거실 인테리어, 항목별로 얼마나 들까",
    guide: "예상 공사비를 항목별로 풀어 설명한다. 결과표의 계산 기준과 범위만 쓰고, 새 금액·집값 상승폭을 만들지 않는다.",
    structure: "소제목 4~5개 (예: ■ 계산 기준 / ■ 바닥·벽·천장 / ■ 조명과 설비 / ■ 부대비용 / ■ 확인할 점)",
  },
  consult: {
    label: "친근한 해설형", fit: "실거주자", design: "qna",
    titleExample: "헤링본 마루와 포세린 타일, 무엇이 다를까",
    guide: "고른 마감재·조명·가구 톤을 쉬운 말로 풀어 설명한다. 부드러운 존댓말(~습니다)을 쓰되 권유 표현은 쓰지 않는다.",
    structure: "소제목 3~5개, 질문형 (예: ■ 이 바닥재는 어떤 재료일까 / ■ 조명을 바꾸면 무엇이 달라질까 / ■ 비용은)",
  },
  shortform: {
    label: "숏폼·속보형", fit: "SNS 연계", design: "news",
    titleExample: "[인테리어] 잠실동 84㎡ 거실 예측 공개",
    guide: "짧은 문장으로 사실만 빠르게 전한다.",
    structure: "소제목 2~3개, 짧게 (예: ■ 무엇을 바꿨나 / ■ 얼마나 드나)",
  },
};

function gwBuildRemodelBlogPrompt(source, opts) {
  const o = opts || {};
  const style = RM_BLOG_STYLE[o.style] || RM_BLOG_STYLE.listing;
  const length = GW_BLOG_LENGTH[o.length] || GW_BLOG_LENGTH.normal;
  const article = (source && source.article) || {};
  const r = source && source.remodel;
  return `당신은 부동산·인테리어 정보를 정확하고 읽기 쉽게 풀어쓰는 네이버 블로그 전문 에디터입니다.
아래 인테리어 시뮬레이션 결과표와 공실뉴스 기사를 참고해 블로그 초안 1건을 작성하십시오.

[결과표 — 확인된 사실]
${rmResultFactLines(r)}

[참조 기사]
${gwBlogArticleText(article)}

${rmFactRules(r)}

${rmStoryFlow(r)}
선택한 스타일에 맞게 순서와 비중은 조절해도 되지만, 공실 매물이면 첫 문단은 반드시 매물 보도(①)로 여십시오.

${RM_OPINION_RULES}

[선택한 스타일] ${style.label}
- 잘 맞는 독자: ${style.fit}
- 제목 방향 예시: ${style.titleExample}
- 작성 지침: ${style.guide}
- 구성: ${style.structure}

[글자 수]
- 본문 ${length.chars}
- 문단 ${length.paras}

[보도 원칙]
- 이 글은 ${rmIsListing(r)
    ? "\"공실뉴스에 이런 매물이 나왔고, 실내를 이렇게 꾸미면 이런 모습이 예상된다\"는 객관적인 보도입니다. 중개사무소 정보는 본문에 쓰지 말고 글 끝 출처에 맡기십시오"
    : "\"공실뉴스 인테리어 예측 시뮬레이션으로 이 공간을 꾸며 보니\"라는 객관적인 소개입니다"}. 3인칭 전달체로 쓰십시오.
- 첫 문단에서 ${rmIsListing(r) ? "소재지·주택 종류·거래 구분·금액과, 실내 인테리어 시뮬레이션을 해 봤다는 점" : "대상 공간과 시뮬레이션이라는 점"}을 밝히십시오.
- 권유·호객 표현 금지: "보세요", "추천합니다", "문의하세요", "지금이 기회" 등.

[블로그 구성]
- title: 자연스러운 제목 1개. 선택한 스타일을 분명히 반영할 것
- body: 한 문단을 2~4문장으로 짧게. 첫 문단은 2문장 이내의 핵심 요약
- 소제목은 한 줄짜리 독립 문단으로 쓰고 반드시 "■ "로 시작할 것. 소제목 바로 다음에는 본문 문단이 올 것
- 공사비를 다룬 문단에 "대략적인 예상 공사비이며, 꼭 실질적인 확인이 필요합니다"를 넣을 것
- 마지막 문단은 시뮬레이션 결과와 확인할 점(현장 실측·정밀 견적·관리사무소 공사 신고)을 객관적으로 정리할 것
- 기사 문장을 그대로 길게 복사하지 말 것
- keywords: 지역명·주택 종류·인테리어·공간·스타일을 포함한 검색용 핵심어 7~12개. # 제외

[출력 형식]
설명이나 인사말 없이 아래 JSON 하나만 \`\`\`json 코드블록으로 출력하십시오.
- body는 문단별 문자열 배열입니다. 배열 한 항목에 문단 하나만 넣으십시오.
- 문자열 안에 실제 줄바꿈을 넣지 말고, 마지막 항목 뒤에 쉼표를 넣지 마십시오.

\`\`\`json
{
  "title": "",
  "body": ["첫 문단", "둘째 문단"],
  "keywords": []
}
\`\`\``;
}

/* ═════════════ 유튜브 ═════════════ */
const RM_YT_VIDEO_TYPE = {
  listing: { label: "인테리어 소개", structure: "훅(전·후 한 문장) → 대상 집과 공간 → 고른 조건 → 예측 모습 → 예상 공사비 → 확인할 점 → 마무리" },
  news: { label: "전·후 비교", structure: "헤드라인 → 지금 모습 → 바닥·벽·천장·조명·가구 부분별 비교 → 예상 공사비 → 정리" },
  area: { label: "공사비 분석", structure: "질문 훅(얼마나 들까) → 계산 기준 → 항목별 공사비 → 부대비용 → 확인할 점 → 정리" },
};

function gwBuildRemodelYtPrompt(source, settings) {
  const s = settings || {};
  const type = RM_YT_VIDEO_TYPE[s.videoType] || RM_YT_VIDEO_TYPE.listing;
  const duration = GW_YT_DURATION[s.duration] || GW_YT_DURATION.short;
  const tone = GW_YT_TONE[s.tone] || GW_YT_TONE.news;
  const article = (source && source.article) || {};
  const r = source && source.remodel;
  return `당신은 부동산 전문 매체 "공실뉴스"의 유튜브 대본 작가입니다.
아래 인테리어 시뮬레이션 결과표와 공실뉴스 기사만 사용해 "${type.label}" 영상의 내레이션 원고를 작성하십시오.

[결과표 — 확인된 사실]
${rmResultFactLines(r)}

[참조 기사]
[기사 제목] ${article.title || ""}
[기사 본문] ${article.body || ""}

${rmFactRules(r)}

${RM_OPINION_RULES}
${rmIsListing(r)
    ? "- 공실 매물이므로 원고 앞부분(훅 다음)에서 소재지·주택 종류·거래 구분·금액을 밝히고, 그다음 인테리어 시뮬레이션으로 넘어가십시오. 중개사무소 이름·전화번호는 원고에 넣지 마십시오."
    : "- 공실 매물이 아니므로 금액·매물 조건을 말하지 마십시오."}

[영상 설정]
- 유형: ${type.label}
- 흐름: ${type.structure}
- 길이: ${duration.label}. 원고 전체 ${duration.chars} (소리 내어 읽는 속도 기준)
- 말투: ${tone.prompt}

[원고 원칙]
- 첫 문장은 3초 안에 관심을 끄는 짧은 훅입니다.
- 소리 내어 읽기 좋게 한 문장을 짧게 끊으십시오. 모든 문장은 마침표·물음표·느낌표로 끝내십시오.
- 장면 제목·자막·화면 설명·괄호 지시문은 쓰지 마십시오. 읽을 문장만 씁니다.
- 공사비를 말한 뒤에는 "대략적인 예상 공사비이며, 꼭 실질적인 확인이 필요합니다."를 읽으십시오.
- 마지막은 "이번 결과는 인테리어 예측 시뮬레이션입니다. 자세한 내용은 공실뉴스에서 확인할 수 있습니다."로 맺습니다.

${GW_YT_OUTPUT}`;
}
