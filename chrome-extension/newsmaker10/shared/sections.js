/* ══════════════════════════════════════════════════════════════
   공실뉴스 뉴스 카테고리 — 기사쓰기 폼(NewsWriteForm)의 1·2차 섹션과 글자까지 같아야 한다

   매물 전용인 "공실뉴스" 섹션은 뺐다. "자유"는 AI 가 아래 표에서 맞는 섹션을 고른다.
   부동산·경제 · 라이프·오피니언의 가운뎃점은 U+00B7(·)이다. 폼의 option value 와 한 글자라도 다르면
   기사쓰기 폼에서 섹션이 선택되지 않는다.
   ══════════════════════════════════════════════════════════════ */

const GW_SECTIONS = {
  "부동산·경제": {
    short: "부동산·경제",
    guide: "부동산 시장·정책·경제 흐름을 독자의 집과 돈 문제로 풀어 주는 경제 기사",
    subs: {
      "부동산정책/정치": "정책·제도 변화가 무엇이고, 누가 어떤 영향을 받는지 풀어 주는 정책 해설",
      "경제/재테크/주식": "금리·물가·자산 흐름을 생활 속 돈 관리 관점에서 풀어 주는 재테크 기사",
      "세무/법률/기타": "세금·계약·법률 제도를 사례 중심으로 쉽게 풀어 주는 생활 법률 기사",
    },
  },
  "AI마케팅": {
    short: "AI마케팅",
    guide: "AI 도구와 온라인 마케팅을 부동산 실무자·소상공인이 바로 써먹을 수 있게 풀어 주는 실무 기사",
    subs: {
      "AI/NEWS": "AI 서비스·기술 소식이 무엇이고 실무에 어떤 의미가 있는지 전하는 IT 기사",
      "부동산유튜브/블로그": "유튜브·블로그 운영과 콘텐츠 제작 요령을 실무 관점에서 전하는 기사",
      "공실/임대관리": "공실을 줄이고 임대를 관리하는 방법을 실무 사례 중심으로 전하는 기사",
    },
  },
  "라이프·오피니언": {
    short: "라이프",
    guide: "일상에서 바로 도움이 되는 생활 정보와 사람 이야기를 흥미롭게 전하는 라이프 기사",
    subs: {
      "인물/인터뷰": "인물의 활동과 생각을 소개하는 인물 기사 (실제 인터뷰가 없으면 공개된 활동만 소개)",
      "중개실무/인테리어Tip": "중개 현장과 집 꾸미기에서 바로 써먹는 요령을 전하는 생활 실무 기사",
      "맛집/여행/건강": "먹거리·나들이·건강 정보를 실생활에 도움이 되게 전하는 생활 기사",
      "스포츠/연예/기타": "스포츠·연예·화제 소식을 흥미롭게 전하는 가벼운 기사",
    },
  },
};

/* 작업창의 1차 칩 — 자유는 섹션이 아니라 "AI 가 골라 줘"라는 뜻이다 */
const GW_SECTION_FREE = "자유";

function gwSectionNames() {
  return Object.keys(GW_SECTIONS);
}

function gwSubSectionNames(section1) {
  const table = GW_SECTIONS[section1];
  return table ? Object.keys(table.subs) : [];
}

/* 1·2차가 폼에 실제로 있는 조합인가 */
function gwIsValidSection(section1, section2) {
  const table = GW_SECTIONS[section1];
  return Boolean(table && (!section2 || Object.prototype.hasOwnProperty.call(table.subs, section2)));
}

/* AI 가 고른 섹션은 가운뎃점·공백이 조금 달라도 폼의 이름으로 맞춰 준다. 못 맞추면 빈 값 */
function gwNormalizeSection(section1, section2) {
  const squash = (value) => String(value || "").replace(/[\s·ㆍ•.\-]/g, "").toLowerCase();
  const first = gwSectionNames().find((name) => squash(name) === squash(section1)) || "";
  if (!first) return { section1: "", section2: "" };
  const second = gwSubSectionNames(first).find((name) => squash(name) === squash(section2)) || "";
  return { section1: first, section2: second };
}

/* 프롬프트에 넣을 "고를 수 있는 섹션" 목록 */
function gwSectionMenuText() {
  return gwSectionNames()
    .map((first) => `- ${first}: ${gwSubSectionNames(first).join(" / ")}`)
    .join("\n");
}

/* 고른 섹션의 글 성격 안내 */
function gwSectionGuide(section1, section2) {
  const table = GW_SECTIONS[section1];
  if (!table) return "";
  const sub = section2 && table.subs[section2];
  return sub ? `${table.guide}. 세부 분야: ${section2} — ${sub}` : table.guide;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    GW_SECTIONS,
    GW_SECTION_FREE,
    gwSectionNames,
    gwSubSectionNames,
    gwIsValidSection,
    gwNormalizeSection,
    gwSectionMenuText,
    gwSectionGuide,
  };
}
