/* eslint-disable @typescript-eslint/no-explicit-any */
import vm from "node:vm";
import { STUDIO_EXT_FILES, STUDIO_EXT_VERSION } from "@/app/api/studio/prompts/bundle.generated";

/**
 * 웹 뉴스·SNS자동화 (2026-11-03 사장님: 앱의 공실뉴스 부분을 웹에서도 똑같이)
 *
 * 앱(studio-app/src: blog-writer · sns-writer · all-writer · youtube-writer · naver-write)이 PC 에서 하던 일 가운데
 * "프롬프트 만들기 · AI 답 나누기 · SNS 글 끝 붙이기 · 네이버 블록 만들기"를 서버에서 같은 확장 파일로 한다.
 *  - 프롬프트 파일은 화면(브라우저)에 내보내지 않는다 — 만든 질문 글과 나눈 결과만 돌려준다 (2026-10-15 보안 결정과 같게)
 *  - AI 는 회원 본인 계정 (질문 복사 → 새 탭 → 답 붙여넣기). 서버 AI 는 쓰지 않는다
 *  - 저장은 화면이 이 브라우저(IndexedDB)에 한다. 여기는 아무것도 저장하지 않는다
 * 서버 전용 (프롬프트 파일을 화면에 보내지 않는다). 부르는 곳: /api/studio/web
 */

const cache = new Map<string, any>();
function run(fileNames: string[], names?: string[]) {
  const key = `${STUDIO_EXT_VERSION}|${fileNames.join(",")}|${(names || []).join(",")}`;
  if (cache.has(key)) return cache.get(key);
  const ctx = vm.createContext({ console, module: { exports: {} } });
  for (const f of fileNames) {
    const src = STUDIO_EXT_FILES[f];
    if (typeof src !== "string") throw new Error(`글쓰기 설정에 ${f} 이 없습니다.`);
    vm.runInContext(src, ctx, { filename: f });
  }
  const out = names ? vm.runInContext(`({ ${names.join(", ")} })`, ctx) : (ctx as any).module.exports;
  cache.set(key, out);
  return out;
}
/* 웹 공실뉴스 기사 스타일 여섯 개 (2026-11-06 사장님 회의: "6개로 해줘", 기본 매물 소개형, 기타 없음)
 *  확장·앱과 같이 쓰는 prompt.js 는 그대로 두고, 웹 서버가 읽은 GW_KIND 만 바꿔 넣는다 (gwBuildPrompt 가 같은 객체를 읽는다)
 *  예전에 고른 스타일(단락별 요약 등)은 gwBuildPrompt 가 news(매물 소개형)로 쓴다 */
const WEB_KIND: Record<string, { label: string; brief: string; subs: string; heads?: boolean }> = {  // heads — ■ 소제목을 쓴다
  news: {
    label: "매물 소개형",
    brief: "이 매물을 소개하는 스트레이트 기사입니다. 위치 → 면적·구조 → 가격·거래 조건 → 특징·주변 순서로, 문단이 자연스럽게 이어지게 쓰십시오. 사실과 숫자로 쓰고, 독자를 가르치려 드는 말('~확인해야 한다', '~할 필요가 있다')은 쓰지 마십시오.",
    subs: "1) 위치와 매물 개요  2) 면적·구조  3) 가격과 거래 조건",
  },
  location: {
    heads: true,
    label: "입지 분석형",
    brief: "입지를 중심으로 쓰는 기사입니다. 지하철역·버스·상권·학교·병원까지의 거리를 [확인된 매물 정보]에 있는 숫자로 서로 비교해 정리하십시오(예: 가장 가까운 역, 두 학교의 거리 차이). 상가·사무실이면 배후 수요(주변 주거·업무 시설)를 씁니다. 자료에 없는 거리·시설은 쓰지 마십시오.",
    subs: "1) 교통  2) 생활·상권  3) 이 입지의 매물 조건",
  },
  value: {
    heads: true,
    label: "시세·수익 분석형",
    brief: "가격을 중심으로 쓰는 분석 기사입니다. 아파트·오피스텔이면 이 매물 가격을 [확인된 매물 정보]의 같은 단지·주변 실거래와 숫자로 견주고, 상가·사무실·건물 임대 매물이면 보증금·월세·관리비로 따진 수익을 씁니다. 실거래·수익 숫자가 자료에 없으면 계산하거나 지어내지 말고 가격·조건만 정확히 쓰십시오. '시세보다 싸다' 같은 단정은 자료로 확인될 때만 쓰십시오.",
    subs: "1) 가격과 거래 조건  2) 주변 시세·수익 비교  3) 숫자가 뜻하는 것",
  },
  persona: {
    heads: true,
    label: "수요자 맞춤형",
    brief: "이 매물에 가장 잘 맞는 수요자 한 부류(예: 신혼부부, 1인 창업자, 소규모 법인, 학부모)를 매물 조건에서 골라, 그 사람이 궁금해할 순서로 매물을 소개하는 기사입니다. 수요자는 자료에 맞게 정하고, 그 수요자에게 필요한 조건(면적·교통·주차·가격)을 사실로 짚으십시오. 독자를 가르치려 드는 말은 쓰지 마십시오.",
    subs: "1) 이런 분께 맞는 매물  2) 필요한 조건 짚어 보기  3) 가격과 입주",
  },
  qa: {
    heads: true,
    label: "질문·답변형",
    brief: "문의할 때 자주 묻는 질문을 소제목으로 세우고(예: \"보증금과 월세는 얼마인가?\", \"주차는 되나?\", \"언제 들어갈 수 있나?\"), 그 아래에 [확인된 매물 정보]에 근거한 답을 쓰는 기사입니다. 질문은 4~6개, 자료로 답할 수 없는 질문은 넣지 마십시오.",
    subs: "1) 가격은 얼마인가  2) 위치와 교통은  3) 언제 들어갈 수 있나",
  },
  building: {
    heads: true,
    label: "건물 소개형",
    brief: "매물이 있는 건물·단지 자체를 소개하는 기사입니다. 준공 연도·구조·층수·엘리베이터·주차·용도 같은 건물 정보를 중심으로 쓰고, 끝 문단에서 이 건물에 나온 매물 조건을 정리하십시오. 자료에 없는 건물 정보는 쓰지 마십시오.",
    subs: "1) 건물 개요  2) 구조와 시설  3) 이 건물에 나온 매물",
  },
};
/* 웹 공실뉴스 네이버 블로그 문체 다섯 개 (2026-11-06 사장님 회의: "그렇게 해줘")
 *  현장답사형 → 사진 둘러보기형(가 본 척 금지) · 동네 정보형 새로 · 스토리텔링형·숏폼·속보형 뺌 · "확인할 점·체크포인트" 소제목 없앰
 *  확장·앱 blog-prompt.js 는 그대로, 웹 서버가 읽은 GW_BLOG_STYLE 만 바꾼다 (경매 문체는 그대로) */
// 블로그는 부드러운 권유는 된다 (2026-11-06 사장님: "블로그에는 ~해보세요 넣어도 괜찮음") — 훈계·당부는 여전히 안 됨
const NO_PREACH = " 부드러운 권유('~해 보세요', '한번 둘러보세요', '사진으로 먼저 살펴보세요')는 써도 된다. 다만 가르치려 드는 말('~확인해야 한다', '~할 필요가 있다', '~봐야 한다')과 '계약 전 확인할 점' 같은 구역은 쓰지 않는다. 이 동네를 잘 아는 지역 부동산 전문가의 눈으로, 사실과 숫자로 쓴다. '등록 정보에 따르면', '매물 설명을 보면'처럼 어디서 읽었는지 밝히는 말은 쓰지 않는다.";
const WEB_BLOG: Record<string, any> = {
  listing: {
    label: "기본 매물소개형", fit: "모든 매물", titleExample: "논현동 아크로힐스 매매 15억, 3룸 남향", design: "basic",
    guide: "깔끔하고 정보 중심으로 쓴다. 제목과 첫 문단에서 지역·매물·거래 조건을 분명히 보여 주고, 본문은 핵심 조건, 입지, 내부 구성 순서로 정리한다." + NO_PREACH,
    structure: "소제목 3~4개, 명사형으로 짧게 (예: ■ 핵심 조건 / ■ 입지와 교통 / ■ 내부 구성). 핵심 요약 → 입지 → 내부 구성 순서",
  },
  visit: {
    label: "사진 둘러보기형", fit: "사진이 여러 장인 매물", titleExample: "논현동 아크로힐스, 사진으로 먼저 둘러보기", design: "magazine",
    guide: "등록된 사진을 순서대로 보여 주며 공간을 하나씩 소개한다. 실제로 방문·촬영·답사했다고 쓰지 말고('직접 가 보니' 금지), 사진과 매물 정보에서 확인되는 것만 쓴다." + NO_PREACH,
    structure: "소제목 3~5개, 공간 이름으로 (예: ■ 건물 외관 / ■ 실내 공간 / ■ 주변 거리). 사진 순서를 따라 바깥 → 안 → 주변",
  },
  area: {
    label: "동네 정보형", fit: "주변 시설 정보가 있는 매물", titleExample: "논현역 400m·마트 500m, 논현동 생활권 정리", design: "news",
    guide: "이 매물이 있는 동네의 생활 정보를 중심으로 쓰는 정보 글이다. 지하철역·버스·마트·학교·병원까지 거리를 [확인된 매물 정보]에 있는 숫자로 서로 비교해 정리하고, 마지막 구역에서 이 동네에 나온 매물 조건을 짧게 정리한다. 자료에 없는 시설·거리는 쓰지 않는다." + NO_PREACH,
    structure: "소제목 3~4개, 명사형 (예: ■ 교통 / ■ 장보기·병원 / ■ 학교 / ■ 이 동네의 매물). 동네 → 매물 순서",
  },
  report: {
    label: "분석·리포트형", fit: "빌딩·상가·투자매물", titleExample: "논현동 50억 건물, 숫자로 정리해 보니", design: "news",
    guide: "가격·면적·층·수익 같은 숫자로 매물을 분석한다. 아파트·오피스텔은 같은 단지·주변 실거래와 비교하고, 임대 매물은 보증금·월세로 따진 수익을 쓴다. 확인되지 않은 수익률·시세·개발 호재는 추정하지 않는다." + NO_PREACH,
    structure: "소제목 3~4개, 명사형 (■ 핵심 숫자 / ■ 가격 비교 / ■ 입지와 수요). 각 구역은 1~2문단",
  },
  consult: {
    label: "친근한 해설형", fit: "실수요 매물", titleExample: "방 3개 아파트 매물, 어떤 가구에 맞을까", design: "qna",
    guide: "매물 조건을 독자가 이해하기 쉽게 풀어 설명하는 해설 글로 쓴다. 부드러운 존댓말은 허용하지만 권유하지 말고, 어떤 가구·업종에 맞는 조건인지를 사실로 짚는다." + NO_PREACH,
    structure: "소제목 3~4개, 문의할 때 자주 묻는 질문형 (예: ■ 관리비는 얼마인가요? / ■ 주차는 되나요?). 각 소제목 바로 다음 문단이 그 질문의 답",
  },
};
function webBlogStyles(B: any) {
  const S = B && B.GW_BLOG_STYLE;
  if (S && !S.__web) {
    for (const k of Object.keys(S)) delete S[k];
    Object.assign(S, WEB_BLOG);
    Object.defineProperty(S, "__web", { value: true, enumerable: false });
  }
  return B;
}
/* 공실 기사 지시 고치기 — 확장·앱 prompt.js 는 그대로, 웹이 만든 질문 글만 (2026-11-06 사장님: "자세한 내용은 공실뉴스 공실열람에서 확인할 수 있다 — 이렇게 쓰면 안 되지, 부동산이 쓰는 글인데")
 *  · 맺음 문장 "공실뉴스 공실열람에서 확인…" 지시를 뺀다 (경매·공매도)
 *  · 해설 구역의 "계약 전 확인해야 할 점"을 뺀다 — 가르치려 드는 말 금지 */
const ARTICLE_FIX = `

[먼저 지킬 것 — 위 지시와 다르면 이것을 따르십시오]
- 이 기사는 이 동네를 잘 아는 지역 부동산 전문가가 씁니다. 글 안에 '공실뉴스'·'공실열람' 같은 사이트 이름이나 "자세한 내용은 ~에서 확인할 수 있다" 같은 안내 문장을 쓰지 마십시오.
- "계약 전 확인할 점", "확인할 필요가 있다", "~해야 한다", "~하는 편이 좋다" 같은 독자를 가르치려 드는 말과 그런 소제목을 쓰지 마십시오. 해설은 이 조건이 무엇을 뜻하는지, 어떤 수요에 맞는지를 전문가의 해석으로 쓰십시오.
- "등록 사진 대신 매물 설명을 보면", "등록 정보에 따르면", "자료상", "매물 정보를 보면"처럼 어디서 읽었는지 밝히는 말은 쓰지 마십시오. 사실만 바로 말합니다 (예: "실내 인테리어와 회의실이 갖춰져 있습니다").`;
/* 끝맺음 네 가지 — 기사마다 서버가 하나를 골라 준다 (2026-11-06 사장님: "끝내는 형식을 다양하게", "원칙에 넣어줘")
 *  회원은 고르지 않는다. 기사들이 같은 모양으로 끝나지 않게 */
const ARTICLE_ENDINGS = [
  "특징 + 관계자 한마디 — 마지막 문단에서 이 매물의 눈에 띄는 특징(구조·시설·공간)을 숫자와 함께 정리하고, 매물 관계자의 한마디로 맺는다. 예: 매물 관계자는 \"신사역과 논현역을 함께 쓸 수 있어 직원 출퇴근이 편한 자리\"라며 \"소규모 법인 사무실로 잘 맞을 것\"이라고 말했다. 말하는 사람은 '매물 관계자'로만 쓰고(사무소·사람 이름·'공인중개사'는 쓰지 않는다), 말 속에는 입지와 어떤 수요에 맞는지만 담는다. 가격이 오를 것·투자 가치 같은 전망은 넣지 않는다.",
  "동네로 넓혀 맺기 — 마지막 문단에서 시야를 이 동네 전체로 넓혀, 이 일대가 어떤 곳인지(업무지구·주거지·상권의 성격)와 이 매물에서 역·주요 시설까지의 거리로 맺는다. 개발 계획·분양 가구 수·시세처럼 [확인된 매물 정보]에 없는 숫자는 쓰지 않는다. 주변 시설 정보가 없으면 이 형식 대신 '핵심 조건으로 맺기'를 쓴다.",
  "수요자 정리로 맺기 — 마지막 문단에서 이 매물이 어떤 수요자에게 어떤 점이 맞는지를 두세 부류로 정리해 맺는다. 예: 역세권을 원하는 소규모 법인에는 출퇴근 편의가, 회의가 잦은 팀에는 따로 마련된 회의실이 장점이다. 따옴표 인용은 쓰지 않는다.",
  "핵심 조건으로 맺기 — 마지막 문단을 가격·거래 조건·입주 시기 같은 핵심 조건 한두 문장으로 담백하게 맺는다. 예: 매매가는 10억 원이며, 현재 비어 있어 계약 후 바로 입주할 수 있다.",
];
function fixArticlePrompt(t: string) {
  const end = ARTICLE_ENDINGS[Math.floor(Math.random() * ARTICLE_ENDINGS.length)];
  return String(t)
    .replace(/[^\n]*마지막 문단은 "[^"]*공실열람[^"]*"로 맺을 것[^\n]*\n?/g, "")
    .replace(/- 이런 조건의 물건을 볼 때 계약 전 확인해야 할 점\n/g, "")
    + ARTICLE_FIX
    + `\n- 끝맺음 형식(이번 기사): ${end}\n- 예시의 숫자·이름은 모양만 보여 주는 것입니다. 실제 숫자·시설은 [확인된 매물 정보]에 있는 것만 쓰십시오.`;
}
/* ── 뉴스칼럼·자유 글쓰기 웹 정리 (2026-11-06 사장님: "공실뉴스와 같이 성격에 맞게, 하나하나 꼼꼼하게") ──
 *  확장·앱 newsmaker 파일은 그대로, 웹 서버가 읽은 표만 바꾼다
 *  · 기사 스타일: 체크포인트·짧은 단신 뺌 (가르치는 말 · 너무 짧음)
 *  · 블로그 문체: 스토리텔링형·숏폼·속보형 뺌, 전문가 칼럼형 새로, "확인할 점" 구역 없앰
 *  · 쇼츠: 이야기형 뺌, 구성에서 "확인할 점" 없앰 */
const COL_BLOG: Record<string, any> = {
  info: {
    label: "기본 정보형", fit: "모든 주제", titleExample: "논현동 아파트 신고가, 무엇이 달라졌나", design: "basic",
    guide: "깔끔하고 정보 중심으로 쓴다. 제목과 첫 문단에서 무엇에 관한 글인지 분명히 보여 주고, 본문은 핵심 내용, 배경, 이 동네·생활에 미치는 영향, 지역 전문가의 시각 순서로 정리한다.",
    structure: "소제목 3~4개, 명사형으로 짧게 (예: ■ 무엇이 달라졌나 / ■ 누구에게 해당되나 / ■ 이 동네에서는). 핵심 요약 → 내용 → 영향 → 전문가의 시각 순서",
  },
  expert: {
    label: "전문가 칼럼형", fit: "뉴스 해설·동네 시장", titleExample: "논현동에서 20년 지켜본 사람이 보는 이번 신고가", design: "magazine",
    guide: "이 동네를 오래 지켜본 지역 부동산 전문가가 쓰는 칼럼이다. 사실을 먼저 짧게 전하고, 이 소식이 이 지역에 어떤 뜻인지, 전문가로서 어떻게 보는지를 차분한 존댓말로 풀어 쓴다. '제가 보기에는'처럼 1인칭 의견은 되지만, 근거 없는 전망·단정은 쓰지 않는다.",
    structure: "소제목 3~4개, 칼럼처럼 (예: ■ 무슨 일이 있었나 / ■ 이 동네에서 이 숫자가 뜻하는 것 / ■ 지켜본 사람의 생각). 사실 → 의미 → 전문가의 시각 순서",
  },
  qna: {
    label: "Q&A 해설형", fit: "제도·법률·세금", titleExample: "새 임대차 제도, 가장 많이 묻는 5가지", design: "qna",
    guide: "독자가 실제로 궁금해할 질문을 뽑아 하나씩 답하는 해설 글로 쓴다. 부드러운 존댓말로, 사실을 객관적으로 짚는다.",
    structure: "소제목 3~5개, 독자가 물어볼 질문형 (예: ■ 언제부터 적용되나요? / ■ 기존 계약도 해당되나요?). 각 소제목 바로 다음 문단이 그 질문의 답",
  },
  report: {
    label: "분석·리포트형", fit: "정책·시장·경제", titleExample: "금리 동결 이후 강남 아파트 시장, 숫자로 보니", design: "news",
    guide: "배경, 핵심 쟁점, 영향을 균형 있게 분석하고 지역 전문가의 해석으로 맺는다. 자료에 없는 전망 수치·시세·수익률은 추정하지 않는다.",
    structure: "소제목 4~5개, 명사형 (■ 배경 / ■ 핵심 쟁점 / ■ 누구에게 어떤 영향 / ■ 전문가의 해석). 각 구역은 1~2문단",
  },
  tips: {
    label: "생활 꿀팁형", fit: "생활정보·실무 요령", titleExample: "이사 날짜 정할 때 알아 두면 좋은 5가지", design: "basic",
    guide: "읽고 바로 써먹을 수 있는 요령을 순서대로 정리한다. '~해 보세요'처럼 부드럽게 권하고, 각 요령마다 이유를 한두 문장 붙인다. 과장된 효과나 확인되지 않은 수치는 쓰지 않는다.",
    structure: "소제목 4~7개, 행동형으로 짧게 (예: ■ 계약서 특약부터 챙겨 보세요). 각 소제목 뒤에 1문단으로 방법과 이유",
  },
};
const COL_YT_TYPE: Record<string, any> = {
  briefing: { label: "뉴스 브리핑", structure: "훅 → 무슨 일인가 → 배경 → 이 동네·내 생활에 미치는 영향 → 전문가 한마디 → 끝맺음" },
  info: { label: "생활 정보", structure: "훅(생활 속 질문) → 핵심 답 → 알아 둘 내용 2~3가지 → 전문가 한마디 → 끝맺음" },
};
function webCol(M: any) {
  const K = M && M.GW_KIND;
  if (K && !K.__web) {
    delete K.check; delete K.brief;
    Object.defineProperty(K, "__web", { value: true, enumerable: false });
  }
  const B = M && M.GW_BLOG_STYLE;
  if (B && !B.__web) {
    for (const k of Object.keys(B)) delete B[k];
    Object.assign(B, COL_BLOG);
    Object.defineProperty(B, "__web", { value: true, enumerable: false });
  }
  return M;
}
function webColYt(Y: any) {
  const T = Y && Y.GW_YT_VIDEO_TYPE;
  if (T && !T.__web) {
    for (const k of Object.keys(T)) delete T[k];
    Object.assign(T, COL_YT_TYPE);
    Object.defineProperty(T, "__web", { value: true, enumerable: false });
  }
  return Y;
}
/* 뉴스칼럼 쇼츠 끝맺음 · 원칙 (공실 쇼츠의 SHORTS_RULES 와 같은 자리) */
const COL_ENDINGS: { id: string; label: string; line: string }[] = [
  { id: "follow", label: "팔로우해 주세요", line: "더 많은 동네 소식은 팔로우해 주세요!" },
  { id: "comment", label: "댓글로 의견", line: "여러분 생각은 댓글로 남겨 주세요!" },
  { id: "ask", label: "문의주세요!", line: "문의주세요!" },
  { id: "none", label: "멘트 없음", line: "" },
];
function colShortsRules(ending?: string) {
  const e = COL_ENDINGS.find((x) => x.id === ending) || COL_ENDINGS[0];
  return `

[쇼츠 대본 — 위 지시보다 먼저 지킬 것]
- 이 대본은 이 동네를 잘 아는 지역 부동산 전문가가 말합니다. "확인해야 합니다", "~할 필요가 있습니다" 같은 가르치는 말과 "확인할 점" 구간은 넣지 마십시오.
- "기사에 따르면", "보도에 따르면", "자료를 보면" 같은 출처 말은 쓰지 마십시오. 사실만 바로 말합니다.
- 사이트 이름(공실뉴스 등)이나 "자세한 내용은 ~에서" 같은 안내는 쓰지 마십시오.
- 숫자는 원문에 있는 것만, 괄호·㎡ 없이 말하듯 씁니다. 같은 숫자를 두 번 말하지 않습니다.

[이야기처럼 — 2026-11-09 사장님: "숫자와 주의사항을 나열하는 느낌이라 어색", "부동산이 이야기하듯"]
- 동네를 잘 아는 부동산 소장님이 이야기해 주듯, 앞 문장에 자연스럽게 이어지게 씁니다. 정보표를 읽듯 숫자를 늘어놓지 않습니다.
- 첫 질문과 본문을 잇습니다. "살기에도 편할까요?"로 열었다면 역·학교·생활시설로 답하고, 중간에 거래 분석으로 되돌아가지 않습니다.
- 관련 내용은 한곳에 모읍니다. 순서는 '신고가·거래 → 단지 특징 → 주변 생활 여건'입니다. 위 흐름 지시에 '확인할 점'·'배경'이 있어도 이 순서가 먼저입니다.
- 숫자는 꼭 필요한 4~6개만 고릅니다. 용적률·건폐율·거리 차이 계산('530m 더 가깝다')은 말하지 않습니다. '직선거리'라는 말도 쓰지 않습니다.
- 숫자 뒤에 단서를 붙이지 않습니다. 원문(기사)에 있는 '~판단할 수는 없다', '~와는 다르다', '~읽기 어렵다', '~로 묶기는 어렵다' 같은 문장은 옮기지 않습니다.
- 같은 뜻을 두 번 말하지 않습니다("20억8천만원에 거래됐다. 이전 최고가를 넘었다" → "20억8천만원에 거래되며 신고가를 기록했습니다").
- "생활 여건도 살펴보겠습니다", "다음은 ~입니다" 같은 진행 멘트와 "~로 보면", "숫자로 보면", "배치로 보면" 같은 해석 말은 쓰지 않습니다.
- 너무 객관적으로만 말하면 어색합니다. 소장님이 말하듯 사실에서 나오는 느낌·평가를 붙입니다 (예: "역이 코앞이라 출퇴근 걱정이 없어요", "아이 등굣길이 짧아요"). 자료에 없는 사실(걸어서 몇 분, 개발 계획, 앞으로 오른다)은 만들지 않습니다.
- 마지막은 첫 질문에 대한 답을 본문에서 확인한 사실로 한 문장 정리한 뒤 끝맺음 문장을 붙입니다. 막연한 평가나 억지 댓글 유도는 쓰지 않습니다.
- 이런 느낌으로 (모양만 참고, 내용은 반드시 이 기사 사실로):
  상도역 롯데캐슬 파크엘, 살기에도 편할까요?
  지난 10월 22평대가 20억8천만원에 거래되며 신고가를 찍었어요. 찾는 분이 꾸준하다는 얘기죠.
  2021년에 지은 950세대 새 아파트라, 주차도 세대당 1.2대로 넉넉한 편이에요.
  7호선 상도역이 261미터라 역이 코앞이고요.
  신상도초등학교가 221미터, 어린이집도 단지 바로 앞이라 아이 키우는 집에 반가운 거리예요.
  장 볼 마트도 600미터 안에 세 곳이 있어요.
  역, 학교, 마트까지 가까운 새 아파트. 그래서 신고가가 나오는 단지입니다.
- ${e.line ? `마지막 문장은 반드시 "${e.line}" 로 끝냅니다.` : "'팔로우'·'댓글'·'문의' 같은 권유 문장은 쓰지 말고, 마지막 문장은 소식·해석으로 끝냅니다."}`;
}
function colYtPrompt(input: any, set: Record<string, string>) {
  return `${lib.ytCol().gwBuildYtScriptPrompt(input, set)}${colShortsRules(set.ending)}`;
}
/* SNS 글 고치기 — 확장 sns-prompt.js 의 "줄마다 이모지(📍📐💰🚇✅🏢)" 지시를 웹에서 덮는다
 *  (2026-11-06 사장님: "이런 아이콘 안 나왔으면 좋겠어, 촌스러워" — 정보 줄 앞은 ✔️ 하나, "~라고 나와요" 서류 말투 금지) */
const SNS_FIX = `

[먼저 지킬 것 — 위 지시·예시와 다르면 이것을 따르십시오]
- 📍📐💰🚇✅🏢 같은 그림 이모지를 쓰지 마십시오. 첫 줄(훅)에도 이모지를 붙이지 마십시오.
- 인스타그램의 정보 줄은 줄 앞에 ✔️ 하나만 붙입니다 (예: "✔️ 전용 35평 · 1층"). 쓸 수 있는 이모지는 ✔️ 와 맺음의 🙂 뿐입니다. (스레드 감성 문체일 때만 그 문체가 정한 감정 이모지 1~2개를, 아이콘체 문체일 때만 그 문체가 정한 아이콘을 쓸 수 있습니다)
- "등록 정보에는 ~라고 나와요", "~가능하다고 나와요", "~로 등록돼 있어요" 같은 서류를 읽어 주는 말투를 쓰지 마십시오. 전해 주듯 편하게 씁니다 (예: "관리비는 따로 없고, 입주는 2개월 안에 가능하다고 하네요!").
- 같은 조건(평수·가격)을 두 번 쓰지 마십시오. 괄호 속 ㎡ 표기는 쓰지 말고 평으로만 씁니다.
- "확인할 점", "~확인해야 합니다", "~확인할 필요가 있습니다" 같은 가르치려 드는 문장은 쓰지 마십시오 (페이스북·스레드 포함).
- 주용도·건축구조·용도지역 같은 서류 항목은 쓰지 마십시오 (예: 사무실 글에 "건물 주용도는 단독주택" 금지). 보는 사람이 바로 알아듣는 조건만 씁니다.
- 마지막 줄은 매물 조건이나 어떤 분에게 맞는 자리인지로 끝냅니다.
- "등록 사진 대신 매물 설명을 보면", "등록 정보에 따르면", "자료상", "매물 정보를 보면"처럼 어디서 읽었는지 밝히는 말은 쓰지 마십시오. 사실만 바로 말합니다 (예: "실내 인테리어와 회의실이 갖춰져 있습니다").
- "시설 배치로 보면", "숫자로 보면", "거리로 보면", "~가 드러나요"처럼 자료를 해석하는 말은 쓰지 마십시오. 동네를 아는 부동산이 이야기하듯, 사실에서 나오는 느낌을 붙여 씁니다 (예: "초등학교가 단지 바로 앞이라 아이 키우는 집에 반가운 거리예요"). 너무 객관적으로만 쓰면 어색합니다. 자료에 없는 사실은 만들지 마십시오. (2026-11-09 사장님)
- "직선거리"라는 말은 쓰지 마십시오. 같은 종류 정보는 한 줄로 묶습니다 (예: "✔️ 7호선 상도역 261m · 신상도초 221m").
- 기사에 있는 "~판단할 수는 없다", "~와는 다르다", "~읽기 어렵다" 같은 단서 문장은 옮기지 마십시오.`;
function webSns(S: any) {
  for (const k of ["gwBuildSnsPrompt", "gwBuildSnsRevisePrompt"]) {
    const orig = S && S[k];
    if (typeof orig !== "function" || orig.__web) continue;
    // 확장 지시 속 "계약 전 확인할 점을 담을 것"·"→ 확인할 점 한 문장"·"교통·주변·확인할 점"을 지운다 — 덧붙인 금지만으로는 AI 가 따라감 (2026-11-06)
    const wrapped = (...a: any[]) => `${String(orig(...a))
      .replace(/, 그리고 계약 전 확인할 점을 차례로 담을 것/g, "을 차례로 담을 것")
      .replace(/ → 확인할 점 한 문장/g, "")
      .replace(/교통·주변·확인할 점/g, "교통·주변")}${SNS_FIX}`;
    Object.defineProperty(wrapped, "__web", { value: true });
    S[k] = wrapped;
  }
  return S;
}
function webKinds(P: any) {
  if (P.gwBuildPrompt && !P.gwBuildPrompt.__web) {
    const orig = P.gwBuildPrompt;
    const wrapped = (v: any, o: any) => fixArticlePrompt(orig(v, o));
    Object.defineProperty(wrapped, "__web", { value: true });
    P.gwBuildPrompt = wrapped;
  }
  const K = P.GW_KIND;
  if (K && !K.__web) {
    for (const k of Object.keys(K)) delete K[k];
    Object.assign(K, WEB_KIND);
    Object.defineProperty(K, "__web", { value: true, enumerable: false });
  }
  return P;
}
const YT_COMMON = ["GW_YT_VIDEO_TYPE", "GW_YT_DURATION", "GW_YT_TONE", "gwBuildYtScriptPrompt", "gwBuildYtRevisePrompt", "gwYtSpeechSeconds", "gwYtCharCount", "GWYoutubeJson"];
const lib = {
  prompt: () => webKinds(run(["gongsil/prompt.js"], ["gwBuildPrompt", "gwBuildRevisePrompt", "GW_KIND", "GW_AUCTION_KIND", "GW_LENGTH", "GW_IMAGE_STYLE", "gwBuildImagePrompt"])),
  blog: () => webBlogStyles(run(["gongsil/blog-prompt.js"])),
  aj: () => run(["gongsil/article-json.js"]),
  naver: () => run(["gongsil/naver-blog.js"]),
  sns: () => webSns(run(["gongsil/blog-prompt.js", "gongsil/naver-blog.js", "gongsil/youtube-json.js", "gongsil/sns-prompt.js"], ["GW_SNS_CHANNELS", "GW_SNS_ORDER", "gwBuildSnsPrompt", "gwBuildSnsRevisePrompt", "gwSnsParse", "gwSnsCompose", "gwSnsPickMedia", "gwSnsAiLabelNote"])),
  yt: () => run(["gongsil/prompt.js", "gongsil/youtube-json.js", "gongsil/youtube-prompt.js"], [...YT_COMMON, "GW_YT_AUCTION_VIDEO_TYPE", "gwYtVideoTypes"]),
  ytCol: () => webColYt(run(["newsmaker/youtube-json.js", "newsmaker/youtube-prompt.js"], [...YT_COMMON, "GW_YT_NUMBER"])),
  // 뉴스칼럼 (앱 ext-newsmaker.js 와 같은 파일·이름) — 2026-11-04 웹 뉴스칼럼
  nm: () => webCol(webSns(run(["sections.js", "market-prompt.js", "prompt.js", "blog-prompt.js", "naver-blog.js", "youtube-json.js", "article-json.js", "sns-prompt.js"].map((f) => `newsmaker/${f}`), [
    "GW_LENGTH", "GW_KIND", "GW_IMAGE_STYLE", "gwSourceReady", "gwSourceLabel", "gwBuildPrompt", "gwBuildRevisePrompt", "gwNormalizeSection",
    "GW_BLOG_LENGTH", "GW_BLOG_STYLE", "gwBuildBlogPrompt", "gwBuildBlogRevisePrompt",
    "GW_SNS_CHANNELS", "gwBuildSnsPrompt", "gwBuildSnsRevisePrompt", "gwSnsParse", "gwSnsCompose", "gwSnsCredit", "gwSnsAiLabelNote",
    "GWNaverBlog", "GWArticleJson", "gwBuildImagePrompt", "gwAiImageCaption",
  ]))),
};
/* 보고서·홍보지 AI 채우기 (앱 marketing-writer.js 와 같은 프롬프트, 2026-11-04 사장님: 웹에서 다 되게) */
const mk = () => run(["marketing/marketing-prompt.js"]);
function marketingPrompt(b: any) {
  const kind = b.kind === "flyer" ? "flyer" : b.kind === "report" ? "report" : "";
  if (!kind) throw new Error("알 수 없는 도구입니다.");
  const fields = b.fields && typeof b.fields === "object" ? b.fields : null;
  if (!fields || !Object.keys(fields).length) throw new Error("채울 칸이 없습니다.");
  const pub = typeof b.publicFacts === "string" ? b.publicFacts.slice(0, 3500) : "";
  const req = typeof b.request === "string" ? b.request.trim().slice(0, 500) : "";
  return { prompt: mk().gwBuildMarketingPrompt(kind, b.vacancy || {}, fields, pub, req) };
}
function marketingParse(b: any) {
  const r = mk().gwParseMarketing(String(b.text || ""), b.fields || {});
  return r.ok ? { ok: true, fields: r.fields } : { ok: false, error: r.reason || "AI 답을 읽지 못했어요." };
}
/* 뉴스칼럼인지 — 화면이 칼럼 소재(source)를 함께 보낸다 */
const colOf = (b: any) => (b && b.source && typeof b.source === "object" ? b.source : null);

const CHANNELS = ["instagram", "threads", "facebook"];
const fence = (o: unknown) => "```json\n" + JSON.stringify(o) + "\n```";
function outer(text: string) {
  const t = String(text || "");
  const a = t.indexOf("{"), z = t.lastIndexOf("}");
  if (a < 0 || z <= a) return null;
  try { return JSON.parse(t.slice(a, z + 1)); } catch { return null; }
}
const NO_ARTICLE = { title: "(참조 기사 없음)", subtitles: [], body: "이번에는 참조 기사가 없습니다. 아래 [확인된 매물 정보]만 사용해 작성하십시오." };
const NO_REF = { title: "(참조 기사 없음)", subtitles: [], body: "참조 기사 없이, 아래 [확인된 매물 정보](처음 분석·캡처한 공실 정보)만 사용해 작성하십시오." };

/* SNS 문체 — 웹 (2026-11-06 사장님 회의: 스토리체 뺌 · 반말체 → 친근체. 예전 story 는 공손체로 쓴다) */
const TONES: Record<string, string> = {
  polite: "공손체 — 존댓말(~습니다·~해요)로 차분하고 믿음직하게 안내하십시오.",
  casual: "친근체 — 동네 단골에게 말하듯 편하고 다정한 말투(~요, 예: '역에서 진짜 가까워요~', '주차도 돼요!')로 쓰십시오. 툭툭 끊는 반말(~해·~야)·말장난·무례한 말은 쓰지 마십시오.",
  hook: "후킹체 — 첫 줄에서 궁금증을 일으키는 한 문장(숫자·질문·반전)으로 시작하고, 문장은 짧게 끊어 끝까지 읽게 쓰십시오. 과장·낚시성 거짓은 쓰지 마십시오.",
  expert: "전문가체 — 부동산 전문가가 짚어 주듯 입지·교통·가격·활용도를 근거와 함께 분석하는 말투로 쓰십시오. 수익률·시세는 [확인된 매물 정보]에 있는 숫자만 쓰십시오.",
  short: "요약체 — 핵심만 3~5줄로 아주 짧게, 줄마다 한 가지 정보만 쓰십시오.",
  // 아이콘체 — 인스타 전용, 줄마다 알맞은 아이콘 (2026-11-06 사장님: 예전 모양도 살리기)
  icon: "아이콘체 — 인스타그램 매물 소개 글로 쓰십시오. ① 첫 줄: 위치·매물 핵심 한 줄, 끝에 📍 하나 (예: '잠원동 전용 35평, 1층 사무실 📍') ② 이어서 조건 줄 5~8개, 줄마다 알맞은 아이콘 하나로 시작 — 🏢 건물·위치 · 📐 면적 · 💰 가격 · 🚇 교통 · 🚗 주차 · 📅 입주 · ✅ 특징 (한 줄에 정보 하나, [확인된 매물 정보]에 있는 것만) ③ 마지막 한 줄은 친근한 존댓말로 이 매물의 좋은 점. 이 문체에서는 위 아이콘을 쓸 수 있고 ✔️ 는 쓰지 않습니다. 면적은 평으로만(괄호 속 ㎡ 없이), '~라고 나와요' 같은 서류 말투는 쓰지 마십시오.",
  // 뉴스칼럼·자유 글쓰기 전용 (2026-11-06)
  card: "카드뉴스체 — 아래 모양으로 쓰십시오. ① 첫 줄: 이 소식의 핵심을 담은 제목 한 줄 (이모지 없이) ② 빈 줄 ③ '✔️ '로 시작하는 핵심 줄 3~5개 (원문에 있는 사실·숫자만, 한 줄에 하나) ④ 빈 줄 ⑤ 이 동네를 잘 아는 지역 부동산 전문가의 한 줄 해석 (친근한 존댓말). 'DM 주세요'·문의 권유·해시태그는 본문에 쓰지 마십시오.",
  newsfb: "뉴스해설체 — 2~3문단의 차분한 존댓말로 쓰십시오. ① 무슨 일인지 (사실과 숫자) ② 이 동네·생활에 무슨 뜻인지 ③ 지역 부동산 전문가로서 내 생각 한두 문장. 이모지 목록·문의 권유는 쓰지 마십시오.",
  // 동네소식체 — 페이스북 (2026-11-06 사장님)
  local: "동네소식체 — 동네 소식을 전하듯 2~3문단의 정보 글로 쓰십시오. 첫 문단은 이 동네의 소식·특징과 함께 이 매물이 나왔다는 사실(예: '신사역 일대에 2009년 준공 통사무실이 매매로 나왔습니다'), 둘째 문단은 매물 조건을 문장으로, 셋째 문단은 어떤 분에게 맞는 자리인지. 지인에게 공유하기 좋은 차분한 존댓말로, 영업하는 티·이모지 목록은 쓰지 마십시오. 사실·숫자는 [확인된 매물 정보]에 있는 것만 쓰십시오.",
  // 체크체 (2026-11-06 사장님: "이런 느낌 좋은 것 같아", 핀 📍은 촌스러워 빼고 ✔️ 는 좋다)
  // 2026-11-06 실제 인스타 부동산 글(사장님이 보여 준 다섯 개)에 맞춤 — 인스타그램은 매물 광고 글로 써도 된다 (사장님: "인스타그램")
  check: "체크체 — 인스타그램에서 흔히 보는 매물 소개 글 모양으로 쓰십시오. 이 문체에서는 '정보 글·부동산 티 내지 않기·문의 금지' 지시보다 이것이 먼저이며, 매물을 소개하는 글이어도 됩니다. ① 첫 줄: 가장 끌리는 한 줄 (역 거리·위치·핵심 장점, 이모지 없이, 예: '신사역·논현역 더블역세권 1층 사무실') ② 빈 줄 ③ '✔️ 항목  값' 모양의 조건 줄 6~10개 — 매물 종류·위치(동까지)·거래와 가격·면적·층·방/욕실·관리비·주차·옵션·입주 가운데 [확인된 매물 정보]에 있는 것만, 없는 항목은 줄을 만들지 않음 ④ 빈 줄 ⑤ 이 매물의 좋은 점 한두 줄, 친근한 존댓말(~예요·~입니다) ⑥ 마지막 줄 '자세한 조건은 DM 주세요 🙂'. 이모지는 ✔️ 와 🙂 만 쓰고, 사무소 이름·대표·주소·등록번호·전화번호는 쓰지 마십시오(글 끝에 법정 표시로 자동으로 붙습니다). 해시태그는 본문에 넣지 말고 hashtags 칸에만. 이 문체에서는 lines 가 15줄까지 늘어나도 됩니다.",
  // 스레드 감성 = 반말 혼잣말 (2026-11-06 사장님: 실제 스레드 글을 보여 주며 "쓰레드는 거의 혼잣말 반말체야", 예전 존댓말 규칙을 바꿈)
  thread: "스레드 감성 — 이 동네를 잘 아는 사람이 혼잣말하듯 쓰는 반말로 쓰십시오(~했어·~거든·~잖아·~인 듯·~해). 존댓말(~요·~습니다)은 쓰지 마십시오. 줄 끝을 '~임·~함·~궁금·~봐야 함'처럼 명사형(음슴체)으로 끊는 줄을 섞고, 괄호 속 혼잣말 한마디(예: '(이 정도면 괜찮지?)')를 넣어도 됩니다. 감정 이모지(😂·🤣·☝️·😅 중)는 글 전체에 1~2개까지만. ① 첫 줄은 질문이나 툭 던지는 한마디 (예: '신사역 5분에 35평 사무실이 10억이면 어때?') ② 한 줄에 한 마디로 아주 짧게 끊고, 2~4줄마다 빈 줄로 문단을 나눔 ③ 조건이 많으면 '1. 2. 3.' 번호 목록도 됨 ④ 내 생각을 솔직하게 한 줄 (예: '소규모 법인 사무실로 딱인 듯') ⑤ 마지막은 가벼운 질문이나 한마디로 맺기. 해시태그·전화번호·'문의 주세요'·칭찬 늘어놓기('미쳤어' 등)는 쓰지 말고, 직접 가 본 척('다녀왔다')도 하지 마십시오. 숫자·사실은 [확인된 매물 정보]에 있는 것만 쓰십시오.",
};
const CH_NAME: Record<string, string> = { instagram: "인스타그램", threads: "스레드", facebook: "페이스북" };
/* SNS 채널 하나·둘만 쓸 때 — 그 채널만 묻는다 (2026-11-06 사장님: "페북 인스타 쓰레드 전부 한 번에 명령어가 들어감, 각각 돌리는데")
 *  예전에는 [이 인스타그램 글만 쓰기]에도 세 채널을 다 쓰게 하고 화면이 인스타만 골라 담았다 */
const SNS_SHAPE: Record<string, string> = { facebook: '"facebook": { "paragraphs": [], "hashtags": [] }', instagram: '"instagram": { "lines": [], "hashtags": [] }', threads: '"threads": { "posts": [], "topic": "" }' };
function snsOnlyOf(v: unknown): string[] {
  const l = (Array.isArray(v) ? v : [v]).filter((c): c is string => typeof c === "string" && CHANNELS.includes(c));
  return l.length && l.length < CHANNELS.length ? [...new Set(l)] : [];
}
function snsOnlyLine(only: string[]) {
  if (!only.length) return "";
  return `\n\n[이번에 쓸 채널 — 위 지시보다 먼저]\n- 이번에는 ${only.map((c) => CH_NAME[c]).join("·")} 글만 쓰십시오. 위에 적힌 다른 플랫폼 글은 쓰지 말고 JSON 에도 넣지 마십시오.\n- 출력 JSON 모양: { ${only.map((c) => SNS_SHAPE[c]).join(", ")} }`;
}
function toneLine(tone: unknown, only: string[] = []) {
  const chs = only.length ? only : CHANNELS;
  const per: Record<string, string> = tone && typeof tone === "object" ? (tone as Record<string, string>) : { instagram: String(tone || ""), threads: String(tone || ""), facebook: String(tone || "") };
  const pick = Object.fromEntries(CHANNELS.map((ch) => [ch, TONES[per[ch]] ? per[ch] : "polite"]));
  if (chs.every((ch) => pick[ch] === "polite")) return "";
  return `\n\n[문체 지정 — 위 지시보다 우선 · 채널마다 따로]\n${chs.map((ch) => `- ${CH_NAME[ch]} 글: ${TONES[pick[ch]]}`).join("\n")}\n문체만 바꾸고, 사실은 [확인된 매물 정보]·참조 기사에 있는 것만 쓰십시오. 출력 JSON 형식은 그대로 지키십시오.`;
}

/* ── 선택지 (앱 blog-writer styles·articleOptions · sns channelInfo · naver designs · youtube options) ── */
// 웹 유튜브 대본 = 60초 쇼츠만 · 말투 기본 릴스·쇼츠 (2026-11-05 사장님: "무조건 60초 · 릴스 쇼츠 스타일", 말투는 고를 수 있게)
const YT_DEFAULTS = { duration: "short", tone: "listing", number: "digit", ending: "ask" }; // 말투 기본 = 물건 소개형 (2026-11-06 사장님)
// 끝맺음 — 대본 마지막 한마디 (2026-11-06 사장님: "그래 문의주세요" 기본, "부동산에"는 넣지 않음, 프로필 링크는 헷갈려 뺌)
const YT_ENDINGS: { id: string; label: string; line: string }[] = [
  { id: "ask", label: "문의주세요!", line: "문의주세요!" },
  { id: "comment", label: "댓글로 '문의'", line: "댓글로 '문의'라고 남겨주세요!" },
  { id: "dm", label: "DM 주세요", line: "DM 주세요!" },
  { id: "none", label: "멘트 없음", line: "" }, // 권유 한마디 없이 (2026-11-06 사장님: "없음도 있어야지")
]; // 자막은 2017년처럼 숫자로 · 읽을 때는 서버가 한글로 바꿔 읽음 (2026-11-05 사장님)
const REELS_TONE = { label: "릴스·쇼츠", prompt: "릴스·쇼츠 말투 — 첫 문장에서 바로 눈길을 끄는 한마디로 시작하고, 짧고 리듬감 있는 문장으로 핵심만 빠르게, 친근한 구어체 존댓말(~요). 군더더기·인사말 없이, 마지막은 짧게 행동을 이끄는 한마디" };
/** 말투 표에 릴스·쇼츠를 넣고(앞에), 길이는 60초 쇼츠만 — 프롬프트(확장 파일)가 같은 표를 읽으므로 거기에 더한다 */
// 물건 소개형 — 말투 맨 앞·기본 (2026-11-06 사장님: "쇼츠에서 그냥 말투 처음에 물건소개형")
const LISTING_TONE = { label: "물건소개형", prompt: "물건 소개형 — 일반적인 물건 소개 말투. 차분한 존댓말(~입니다·~습니다)로 꾸밈 없이: 무엇(동네·종류·거래) → 면적·금액 → 특징 → 위치 → 누구에게 추천하는지 순서" };
function webYt(T: Record<string, any>, D: Record<string, any>) {
  if (!T.reels) T.reels = REELS_TONE;
  if (!T.listing) T.listing = LISTING_TONE;
  return { tones: [["listing", T.listing] as [string, any], ["reels", T.reels] as [string, any], ...Object.entries(T).filter(([k]) => k !== "reels" && k !== "listing")], durations: Object.entries(D).filter(([k]) => k === "short") };
}
function ytOptions(vacancy: any) {
  const L = lib.yt();
  const types = L.gwYtVideoTypes(vacancy || null);
  const table = (t: Record<string, any>, extra: (v: any) => object = () => ({})) => Object.entries(t).map(([id, v]) => ({ id, label: v.label, ...extra(v) }));
  // 공실 쇼츠 = 매물 소개 하나 · 말투에서 뉴스형 뺌 (2026-11-06 사장님: "매물소개잖아", 부동산 뉴스·지역 분석 뺌)
  return {
    videoTypes: table(types, (v) => ({ structure: v.structure })).slice(0, 1),
    durations: webYt(L.GW_YT_TONE, L.GW_YT_DURATION).durations.map(([id, v]: [string, any]) => ({ id, label: v.label, chars: v.chars, seconds: v.seconds })),
    // 말투 두 개 — 릴스·쇼츠 · 전문가 분석 (뉴스형·친근한 설명 뺌, 2026-11-06)
    tones: webYt(L.GW_YT_TONE, L.GW_YT_DURATION).tones.filter(([id]: [string, any]) => id !== "news" && id !== "friendly").map(([id, v]: [string, any]) => ({ id, label: v.label })),
    endings: YT_ENDINGS.map(({ id, label }) => ({ id, label })),
    numbers: table(lib.ytCol().GW_YT_NUMBER),
    defaults: { ...YT_DEFAULTS, videoType: Object.keys(types)[0] },
  };
}
function ytSettings(vacancy: any, pick: Record<string, string> = {}) {
  const o = ytOptions(vacancy);
  const ok = (list: { id: string }[], v?: string) => (v && list.some((x) => x.id === v) ? v : "");
  const want = { videoType: ok(o.videoTypes, pick.videoType), duration: ok(o.durations, pick.duration), tone: ok(o.tones, pick.tone), number: ok(o.numbers, pick.number), ending: ok(o.endings, pick.ending) };
  return { ...o.defaults, ...Object.fromEntries(Object.entries(want).filter(([, v]) => v)) } as Record<string, string>;
}
/* 뉴스칼럼 선택지 (앱 blog-writer styles · column-writer articleOptions · youtube-writer options 의 칼럼 부분) */
function colOptions() {
  const M = lib.nm(), Y = lib.ytCol(), S = lib.sns();
  const table = (t: Record<string, any>, extra: (v: any) => object = () => ({})) => Object.entries(t).map(([id, v]) => ({ id, label: v.label, ...extra(v) }));
  return {
    blog: { saleKind: "", styles: Object.entries(M.GW_BLOG_STYLE as Record<string, any>).map(([id, s]) => ({ id, label: s.label, fit: s.fit, titleExample: s.titleExample, design: s.design })), lengths: table(M.GW_BLOG_LENGTH, (l) => ({ chars: l.chars })) },
    article: { kinds: table(M.GW_KIND, (k) => ({ brief: k.brief })), lengths: table(M.GW_LENGTH, (l) => ({ chars: l.chars })), autoCover: false },
    channels: CHANNELS.map((id) => {
      const c = S.GW_SNS_CHANNELS[id];
      return { id, label: c.label, homeUrl: c.homeUrl, ratioText: c.ratioText, maxChars: c.maxChars, maxMedia: c.maxMedia, maxTags: c.maxTags, size: c.size, ratio: c.ratio || null };
    }),
    designs: Object.entries(M.GWNaverBlog.DESIGNS as Record<string, any>).map(([id, d]) => ({ id, label: d.label, hint: d.hint })),
    imageStyles: table(M.GW_IMAGE_STYLE),
    youtube: {
      videoTypes: table(Y.GW_YT_VIDEO_TYPE, (v) => ({ structure: v.structure })),
      durations: webYt(Y.GW_YT_TONE, Y.GW_YT_DURATION).durations.map(([id, v]: [string, any]) => ({ id, label: v.label, chars: v.chars, seconds: v.seconds })),
      // 말투 셋 — 뉴스형 · 전문가 해설 · 친근한 이야기 (릴스·쇼츠는 공실 쇼츠용, 2026-11-06)
      tones: ["news", "expert", "friendly"].filter((id) => Y.GW_YT_TONE[id]).map((id) => ({ id, label: Y.GW_YT_TONE[id].label })),
      endings: COL_ENDINGS.map(({ id, label }) => ({ id, label })),
      numbers: table(Y.GW_YT_NUMBER),
      defaults: { ...YT_DEFAULTS, videoType: "briefing", tone: "news", ending: "follow" },
    },
    writeUrl: lib.naver().WRITE_URL,
    siteUrl: lib.naver().SITE_URL,
  };
}
function colYtSettings(pick: Record<string, string> = {}) {
  const o = colOptions().youtube;
  const ok = (list: { id: string }[], v?: string) => (v && list.some((x) => x.id === v) ? v : "");
  const want = { videoType: ok(o.videoTypes, pick.videoType), duration: ok(o.durations, pick.duration), tone: ok(o.tones, pick.tone), number: ok(o.numbers, pick.number), ending: ok(o.endings, pick.ending) };
  return { ...o.defaults, ...Object.fromEntries(Object.entries(want).filter(([, v]) => v)) } as Record<string, string>;
}
/* 내 기사 링크 줄 — 웹 뉴스칼럼은 내 기사만 소재라, 글 끝에 내 물건접수 홈페이지의 그 기사 주소 (2026-11-04 사장님: 링크는 모두 내 홈페이지로)
   뉴스메이커 프롬프트(앱과 같이 씀)는 링크를 안 붙이므로 웹에서만 붙인다 */
const colLink = (source: any) => {
  const u = String(source?.news?.url || "");
  return source?.news?.publisher === "공실뉴스" && /^https:\/\//.test(u) ? `▶ 기사 전문 보기\n${u}` : "";
};
function withColLink(ch: string, post: any, source: any) {
  const link = colLink(source);
  if (!post || !link) return post;
  if (ch === "threads") {
    const posts = [...(post.posts || [])];
    if (!posts.length) return post;
    const max = lib.nm().GW_SNS_CHANNELS.threads.maxChars || 500;
    const last = posts.length - 1;
    if (String(posts[last]).length + link.length + 2 <= max) posts[last] = `${posts[last]}\n\n${link}`;
    else posts.push(link);
    return { ...post, posts };
  }
  return post.body ? { ...post, body: `${post.body}\n\n${link}` } : post;
}
const colRef = (b: any, source: any) => b.ref || { title: source.news?.title || "(참조 기사)", subtitles: [], body: source.news?.body || "" };
function options(vacancy: any) {
  const B = lib.blog(), P = lib.prompt(), S = lib.sns(), N = lib.naver();
  const auction = Boolean(vacancy && vacancy.saleKind);
  return {
    blog: {
      saleKind: (vacancy && vacancy.saleKind) || "",
      styles: Object.entries(B.gwBlogStyles(vacancy || null) as Record<string, any>).map(([id, s]) => ({ id, label: s.label, fit: s.fit, titleExample: s.titleExample, design: s.design })),
      lengths: Object.entries(B.GW_BLOG_LENGTH as Record<string, any>).map(([id, l]) => ({ id, label: l.label, chars: l.chars })),
    },
    article: {
      // 짧은 단신은 뺀다 — 공실 기사는 매물 조건을 다 담아야 해서 단신으로는 쓸 게 없다 (2026-11-06 사장님: "의미가 없지 않아", 분량 [짧게]는 그대로)
      kinds: Object.entries((auction ? P.GW_AUCTION_KIND : P.GW_KIND) as Record<string, any>).filter(([id]) => id !== "brief").map(([id, k]) => ({ id, label: k.label, brief: k.brief })),
      lengths: Object.entries(P.GW_LENGTH as Record<string, any>).map(([id, l]) => ({ id, label: l.label, chars: l.chars })),
    },
    channels: CHANNELS.map((id) => {
      const c = S.GW_SNS_CHANNELS[id];
      return { id, label: c.label, homeUrl: c.homeUrl, ratioText: c.ratioText, maxChars: c.maxChars, maxMedia: c.maxMedia, maxTags: c.maxTags, size: c.size, ratio: c.ratio || null };
    }),
    designs: Object.entries(N.DESIGNS as Record<string, any>).map(([id, d]) => ({ id, label: d.label, hint: d.hint })),
    imageStyles: Object.entries(P.GW_IMAGE_STYLE as Record<string, any>).map(([id, s]) => ({ id, label: s.label })),
    youtube: ytOptions(vacancy),
    writeUrl: N.WRITE_URL,
    siteUrl: N.SITE_URL,
  };
}

/* ── 한 번에 쓰기 프롬프트 (앱 all-writer.js 공실뉴스 부분과 같다) ── */
/* 뉴스칼럼 기사·블로그 말투 — 지역 부동산 전문가가 쓰는 글 (2026-11-06 사장님: "전문가의 말투로", "지역 부동산전문가가 쓰는 거야") · 위 지시보다 먼저 */
const COL_EXPERT = `

[말투 — 위 지시보다 먼저 지킬 것]
- 이 글은 이 동네에서 오래 일해 지역 시장을 잘 아는 지역 부동산 전문가가 씁니다. 글 안에 사무소·중개 이야기는 쓰지 마십시오.
- 전문가답게 숫자를 읽고 그 뜻을 자신 있게 짚으십시오: 면적·층·시기·매매/전세를 비교해 무엇이 다른지, 그 차이가 무엇을 뜻하는지 (예: "같은 84㎡라도 4층과 12층 거래가 4,000만 원 벌어졌다"). 근거는 원문 소재에 있는 것만 쓰고, 근거 없는 전망·단정은 하지 마십시오.
- 지역·주변 시설은 역·마트·학교 거리 같은 숫자를 서로 비교해 객관적인 사실로 쓰십시오.
- 독자를 가르치려 드는 말은 쓰지 마십시오: "~할 필요가 있다", "구분해 볼 필요가 있다", "~봐야 한다", "~확인해야 한다", "~살펴볼 만하다", "~하는 편이 정확하다", "걸어 보라", "주의해야 한다". 문단은 사실·숫자·전문가의 해석으로 끝내십시오.
- 가 보거나 걸어 본 것처럼 꾸며 쓰지 마십시오.`;
/* 블로그는 부동산이 자기 이름으로 홍보하는 글 — 친근하게 (2026-11-09 사장님: "블로그·SNS·대본은 객관적일 필요 없음, 부동산이 개별적으로 홍보하는 것, 친근하게")
 *  뉴스 기사(공실뉴스 기사)는 객관적인 기사체 그대로 — 이 규칙은 블로그에만 붙인다 */
const BLOG_FRIENDLY = `

[블로그 말투 — 위 지시(객관적·전문가 말투 포함)보다 먼저 지킬 것]
- 이 블로그는 동네 부동산이 자기 이웃·손님에게 들려주는 글입니다. 뉴스처럼 객관적으로 쓰지 말고, 친근한 존댓말(~해요·~이에요)로 이야기하듯 쓰십시오.
- 숫자만 늘어놓지 말고, 사실에서 나오는 느낌을 붙이십시오 (예: "역이 코앞이라 출퇴근 걱정이 없어요", "초등학교가 단지 바로 앞이라 아이 키우는 집에 반가운 거리예요", "신고가가 나온 건 찾는 분이 꾸준하다는 얘기죠").
- "~로 보면", "숫자로 보면", "자료상", "~가 드러난다" 같은 해석·보고서 말투, "~판단할 수는 없다", "~와는 다르다" 같은 단서 문장, 거리 숫자 빼기 계산("530m 더 가깝다"), "직선거리"라는 말은 쓰지 마십시오.
- 흐름은 '요즘 무슨 일이 있었나(거래·신고가) → 어떤 단지·집인가 → 살면 어떤가(역·학교·장보기) → 그래서 어떤 분께 맞는 곳인가'로 이어지게 씁니다.
- 자료에 없는 사실(걸어서 몇 분, 개발 계획, 앞으로 오른다)과 과장·투자 권유("무조건 오른다", "지금 사야 한다")는 쓰지 마십시오.`;
/* 뉴스칼럼 한 번에 쓰기 (앱 all-writer.js 의 col 부분과 같다) — 기사를 안 쓰면 소재인 내 기사(ref)가 참조 기사 */
function colAllPrompt(b: any, source: any) {
  const want = { article: b.want?.article === true, blog: b.want?.blog === true, sns: b.want?.sns === true, youtube: b.want?.youtube === true };
  if (!want.article && !want.blog && !want.sns && !want.youtube) throw new Error("쓸 글을 하나 이상 골라 주세요.");
  const M = lib.nm(), Y = lib.ytCol();
  if (!M.gwSourceReady(source)) throw new Error("칼럼 소재(기사 제목·본문)가 비어 있어요. 목록에서 기사를 다시 골라 주세요.");
  const REF = want.article
    ? { title: "(이 답의 [작업 1] 공실뉴스 기사)", subtitles: [], body: "이 요청의 [작업 1]에서 쓴 공실뉴스 기사를 참조 기사로 삼으십시오. 사실은 원문 소재에 있는 것만 쓰십시오." }
    : colRef(b, source);
  const artKind = M.GW_KIND[b.article?.kind] ? b.article.kind : Object.keys(M.GW_KIND)[0];
  const artLen = M.GW_LENGTH[b.article?.length] ? b.article.length : "normal";
  const blogSt = M.GW_BLOG_STYLE[b.blog?.style] ? b.blog.style : "info", blogLen = b.blog?.length || "normal";
  const parts: [string, string, string][] = [];
  if (want.article) parts.push(["article", "공실뉴스 기사 (뉴스칼럼)", M.gwBuildPrompt(source, { kind: artKind, length: artLen }) + COL_EXPERT]);
  if (want.blog) parts.push(["blog", "네이버 블로그 글", M.gwBuildBlogPrompt({ article: REF, source }, { style: blogSt, length: blogLen }) + COL_EXPERT + BLOG_FRIENDLY]);
  const only = snsOnlyOf(b.snsOnly);
  if (want.sns) parts.push(["sns", only.length ? `SNS 글 (${only.map((c) => CH_NAME[c]).join(" · ")})` : "SNS 글 (인스타그램 · 스레드 · 페이스북)", M.gwBuildSnsPrompt({ article: REF, source }) + toneLine(b.tone, only) + snsOnlyLine(only)]);
  const ytSet = want.youtube ? colYtSettings(b.youtube || {}) : null;
  if (want.youtube) parts.push(["youtube", "쇼츠릴스 대본", colYtPrompt({ article: REF, source }, ytSet!)]);
  return bundle(parts, { artKind, artLen, blogSt, blogLen, ytSet });
}
function bundle(parts: [string, string, string][], settings: Record<string, unknown>) {
  const keys = parts.map((p) => p[0]);
  const prompt = [
    `여러 글을 한 번에 씁니다. 아래 [작업 ${parts.map((_, i) => i + 1).join("·")}]을 모두 하십시오.`,
    "각 작업의 지시·규칙·문체·분량은 그 작업에 적힌 그대로 지키고, 각 작업이 요구하는 출력 JSON 을 만드십시오.",
    `그다음 그 JSON 들을 아래처럼 하나로 묶어, 설명 없이 JSON 하나만 답하십시오 (각 작업의 "JSON 하나만 답하라"는 지시는 이 묶음 안의 값으로 지킵니다).`,
    "{" + keys.map((k) => `"${k}": { …[${k}] 작업의 JSON… }`).join(", ") + "}",
    "",
    ...parts.map((p, i) => `===== [작업 ${i + 1}] ${p[1]} — 결과는 "${p[0]}" 키에 =====\n${p[2]}`),
  ].join("\n");
  return { prompt, keys, settings };
}
function allPrompt(b: any) {
  if (colOf(b)) return colAllPrompt(b, colOf(b));
  const v = b.vacancy || {};
  const want = { article: b.want?.article === true, blog: b.want?.blog === true, sns: b.want?.sns === true, youtube: b.want?.youtube === true };
  if (!want.article && !want.blog && !want.sns && !want.youtube) throw new Error("쓸 글을 하나 이상 골라 주세요.");
  const P = lib.prompt(), B = lib.blog(), S = lib.sns();
  const REF = want.article
    ? { title: "(이 답의 [작업 1] 공실뉴스 기사)", subtitles: [], body: "이 요청의 [작업 1]에서 쓴 공실뉴스 기사를 참조 기사로 삼으십시오. 사실은 [확인된 매물 정보]에 있는 것만 쓰십시오." }
    : b.ref || { title: "(참조 기사 없음)", subtitles: [], body: "이번에는 참조 기사가 없습니다. 아래 [확인된 매물 정보]만 사용해 작성하십시오." };
  const artKind = b.article?.kind || "news", artLen = b.article?.length || "normal";
  const blogSt = b.blog?.style || "listing", blogLen = b.blog?.length || "normal";
  const parts: [string, string, string][] = [];
  if (want.article) parts.push(["article", "공실뉴스 기사", P.gwBuildPrompt(v, { kind: artKind, length: artLen })]);
  if (want.blog) parts.push(["blog", "네이버 블로그 글", B.gwBuildBlogPrompt({ vacancy: v, article: REF }, { style: blogSt, length: blogLen }) + BLOG_FRIENDLY]);
  const only = snsOnlyOf(b.snsOnly);
  if (want.sns) parts.push(["sns", only.length ? `SNS 글 (${only.map((c) => CH_NAME[c]).join(" · ")})` : "SNS 글 (인스타그램 · 스레드 · 페이스북)", S.gwBuildSnsPrompt({ vacancy: v, article: NO_REF }) + toneLine(b.tone, only) + snsOnlyLine(only)]);
  const ytSet = want.youtube ? ytSettings(v, b.youtube || {}) : null;
  if (want.youtube) parts.push(["youtube", "쇼츠릴스 대본", ytPrompt(v, ytSet!, REF)]);
  const keys = parts.map((p) => p[0]);
  const prompt = [
    `여러 글을 한 번에 씁니다. 아래 [작업 ${parts.map((_, i) => i + 1).join("·")}]을 모두 하십시오.`,
    "각 작업의 지시·규칙·문체·분량은 그 작업에 적힌 그대로 지키고, 각 작업이 요구하는 출력 JSON 을 만드십시오.",
    `그다음 그 JSON 들을 아래처럼 하나로 묶어, 설명 없이 JSON 하나만 답하십시오 (각 작업의 "JSON 하나만 답하라"는 지시는 이 묶음 안의 값으로 지킵니다).`,
    "{" + keys.map((k) => `"${k}": { …[${k}] 작업의 JSON… }`).join(", ") + "}",
    "",
    ...parts.map((p, i) => `===== [작업 ${i + 1}] ${p[1]} — 결과는 "${p[0]}" 키에 =====\n${p[2]}`),
  ].join("\n");
  return { prompt, keys, settings: { artKind, artLen, blogSt, blogLen, ytSet } };
}
/** 웹 쇼츠 대본 — 군더더기 빼기 (2026-11-05 사장님: "이런 내용을 굳이 넣어야 하나?") · 위 지시와 겹치면 이것이 먼저 */
const SHORTS_RULES = `[쇼츠 대본 — 위 지시보다 먼저 지킬 것]
- "계약 전에는 ~을 확인해야 합니다", "등기사항증명서·권리관계·관리비 항목을 확인하세요" 같은 확인할 점·주의 안내 문장은 쓰지 마십시오.
- "자세한 내용은 영상 설명란(공실뉴스)에서 확인할 수 있습니다" 같은 맺음 안내 문장도 쓰지 마십시오.
- 매물의 좋은 점과 핵심 조건만 짧게 전하고, {{END_HINT}}

[말로 듣는 글 — 2026-11-05 사장님: "내용이 착착 안 달라붙어", "(69.4㎡) 이런 것 읽기가 좋지 않아"]
- 이 글은 성우가 읽고 화면 자막으로 나옵니다. 정보표를 읽듯 쓰지 말고, 친구에게 집을 보여 주며 말하듯 이어지게 쓰십시오.
- 개수·금액·연도·평수·층은 숫자로 씁니다: "방 2개, 욕실 1개", "주차 1대", "보증금 5,000만 원", "월세 100만 원", "매매가 1억 2,000만 원", "2017년", "21평", "3층". 자막에는 숫자로 나오고, 성우는 "방 두 개, 보증금 오천만"처럼 부동산 말투로 읽습니다. (2026-11-05 사장님)
- 괄호 ( )와 ㎡·m²·㎡당 같은 단위·기호는 쓰지 마십시오. 면적은 평으로만 말합니다 (예: "전용 21평"). 전용과 공급이 같으면 전용만 말합니다.
- "각각", "~로 등록돼 있습니다", "~이 제공됩니다", "~시설과 ~시설이 함께 있는" 같은 서류·안내문 말투는 쓰지 마십시오. 사실은 그냥 말합니다 ("전체 수리를 마친 집이에요").
- 주용도·건축구조·용도지역 같은 서류 항목은 말하지 마십시오 (예: 사무실 영상에서 "주용도는 단독주택" 금지, 2026-11-06 사장님). 보는 사람이 바로 알아듣는 것만 말합니다.
- 같은 조건(평수·방 수·가격)은 한 번만 말합니다. 첫 문장에서 말했으면 뒤에서 다시 말하지 않습니다.
- "등록 사진 대신 매물 설명을 보면", "등록 정보에 따르면", "자료상", "매물 정보를 보면"처럼 어디서 읽었는지 밝히는 말은 쓰지 마십시오. 사실만 바로 말합니다 (예: "실내 인테리어와 회의실이 갖춰져 있습니다"). (2026-11-06 사장님)
- 순서: ① 가장 끌리는 한마디(동네 + 가장 좋은 점) → ② 공간(평수·방·욕실) → ③ 건물·상태(준공·수리·향·엘리베이터) → ④ 옵션 → ⑤ 가격(보증금·월세·관리비 한 번에) → ⑥ 입주 시기.
- {{END_RULE}} ("직접 둘러보세요", "확인해 보세요" 같은 맺음은 쓰지 않습니다)
- 분량: 띄어쓰기 포함 400자 안팎(390~420자), 문단 9~11개. 위에 적힌 "약 280~380자"보다 이것이 먼저입니다. 1.25배 성우로 약 55초입니다. (2026-11-05 사장님: "글도 너무 짧아", "400자는 되어야")
  아래 본보기는 형식만 보여 주는 짧은 것이니, 그만큼 짧게 쓰지 마십시오. 늘릴 때도 같은 말을 되풀이하지 말고, 각 조건에 사는 사람에게 어떤 뜻인지 한마디를 더 붙이는 식으로 채웁니다.
- 문단 하나가 화면 한 장입니다. 문단은 한두 문장, 40자 안팎으로 짧게, 앞 문단에 자연스럽게 이어지게 ("게다가", "여기에", "가격은요" 같은 이음말을 가끔).
- 조건 옆에 그것이 사는 사람에게 어떤 뜻인지 짧게 붙여도 됩니다 ("남서향이라 오후 햇살이 들어요", "옵션이 있어 짐만 오면 돼요"). 단, 매물 정보에 없는 사실(역 거리·전망·주변 시설 등)은 만들지 마십시오.

[이런 느낌으로 — 형식 참고용, 내용은 반드시 이 매물 정보로]
논현동에서 바로 들어갈 수 있는 21평 빌라, 보여 드릴게요.
방 1개, 욕실 1개인데 전용이 21평이라 혼자 쓰기엔 넉넉해요.
2017년에 지은 건물이고, 전체 수리까지 마친 집이에요. 엘리베이터도 있어요.
남서향이라 오후 햇살이 잘 들어요.
벽걸이 에어컨이랑 세탁기도 있어서 짐만 오시면 돼요.
가격은 보증금 5,000만 원에 월세 100만 원, 관리비 10만 원은 따로예요.
지금 비어 있어서 바로 들어올 수 있어요.{{ENDING}}`;
/** 말로 읽는 대본 — AI 가 그래도 넣은 괄호 속 ㎡ 등은 빼고 (2026-11-05) */
const speakable = (t: string) => t.replace(/(\d)\.0(?=\s?평)/g, "$1").replace(/\s*\([^()]*(㎡|m²|m2|평형?)[^()]*\)/g, "").replace(/\s{2,}/g, " ").trim();
/** 끝맺음을 넣은 쇼츠 규칙 — 없음이면 권유 한마디 없이 자연스럽게 끝낸다 */
/* 물건 소개형 — 일반적인 물건 소개 순서 (2026-11-06 사장님: "잠원동 사무실 임대 물건입니다 / 전용면적 30평, 금액은 보증금 2억에 월세 2천만 원입니다 / 매물 특징 / 위치 / ~에게 추천합니다") */
const LISTING_RULES = `

[물건 소개형 — 이 말투일 때는 위 "순서"·"말투"·본보기보다 이것이 먼저]
- 말투: 차분한 존댓말(~입니다·~습니다). "~예요·~거든요" 같은 구어체와 첫 문장 후킹은 쓰지 않습니다.
- 순서: ① "동네 + 물건 종류 + 거래 종류 물건입니다." 한 문장으로 시작 → ② 면적과 금액 (예: "전용 30평이고, 금액은 보증금 2억에 월세 2,000만 원입니다.") → ③ 매물 특징 두세 문장 (층·내부·시설·옵션·주차·입주) → ④ 위치 (역·주변, 자료에 있는 것만) → ⑤ "○○ 찾는 분께 추천합니다." 한 문장 → 끝맺음.
- 본보기 모양 (숫자·이름은 모양만, 실제는 이 매물 정보로):
  잠원동 사무실 임대 물건입니다.
  전용 30평이고, 금액은 보증금 2억에 월세 2,000만 원입니다.
  1층이라 드나들기 편하고, 회의실이 따로 갖춰져 있습니다.
  논현역과 신사역을 함께 이용할 수 있습니다.
  소규모 법인 사무실을 찾는 분께 추천합니다.`;
function shortsRules(ending?: string, tone?: string) {
  const e = YT_ENDINGS.find((x) => x.id === ending) || YT_ENDINGS[0];
  return (tone === "listing" ? SHORTS_RULES + LISTING_RULES : SHORTS_RULES)
    .split("{{END_HINT}}").join(e.line ? "마지막은 문의를 이끄는 짧은 한마디로 끝내십시오." : "마지막은 덧붙이는 한마디 없이 매물 소개 문장(가격·입주 등)으로 그냥 끝내십시오.")
    .split("{{END_RULE}}").join(e.line ? `마지막 문장은 반드시 "${e.line}" 로 끝냅니다.` : "'문의주세요'·'DM 주세요'·'댓글 남겨주세요' 같은 권유 문장은 쓰지 마십시오. 마지막 문장은 매물 이야기로 끝냅니다.")
    .split("{{ENDING}}").join(e.line ? ` ${e.line}` : "");
}
function ytPrompt(vacancy: any, settings: Record<string, string>, article: any) {
  const number = lib.ytCol().GW_YT_NUMBER.digit; // 웹은 늘 숫자 그대로 (자막 2017년 · 읽기는 서버가 한글로) — 예전에 고른 "한글 읽기"가 남아 있어도
  return `${lib.yt().gwBuildYtScriptPrompt({ vacancy, article }, settings)}\n\n[숫자 표기]\n- ${number.prompt}\n\n${shortsRules(settings.ending, settings.tone)}`;
}

/* 기사·블로그 답 → 제목·부제·문단·키워드 */
function docOf(parsed: any, col = false) {
  const a = parsed.article;
  const sec = col ? lib.nm().gwNormalizeSection(a.section1, a.section2) || {} : {};
  return { title: a.title, subtitles: a.subtitles || [], paragraphs: lib.naver().splitParagraphs(a.body), keywords: a.keywords || [], ...(col ? { section1: sec.section1 || "", section2: sec.section2 || "" } : {}) };
}
function ytOf(text: string, col = false) {
  const r = (col ? lib.ytCol() : lib.yt()).GWYoutubeJson.parseObject(text);
  if (!r.ok) throw new Error(r.reason || "대본을 읽지 못했습니다.");
  const d = r.data || {};
  const list = Array.isArray(d.narration || d.script || d.text) ? d.narration || d.script || d.text : String(d.narration || d.script || d.text || "").split(/\n{2,}/);
  const narration = list.map((p: unknown) => speakable(String(p || ""))).filter(Boolean);
  if (!narration.length) throw new Error("AI 답변에 원고가 없습니다. 다시 써 주세요.");
  return { title: String(d.title || "").trim(), titles: (Array.isArray(d.titles) ? d.titles : []).map((t: unknown) => String(t || "").trim()).filter(Boolean).slice(0, 3), narration };
}
function allParse(b: any) {
  const o = outer(b.text);
  if (!o) return { ok: false, error: "AI 답을 읽지 못했어요. 답이 다 나온 뒤 코드 상자의 [복사]를 눌러 주세요." };
  const keys: string[] = Array.isArray(b.keys) ? b.keys : [];
  if (!keys.every((k) => o[k] && typeof o[k] === "object")) return { ok: false, error: `답에 ${keys.filter((k) => !(o[k] && typeof o[k] === "object")).map((k) => ({ article: "기사", blog: "블로그", sns: "SNS", youtube: "대본" } as Record<string, string>)[k] || k).join("·")} 글이 없어요. 답이 다 나온 뒤 복사해 주세요.` };
  const col = b.column === true;
  const AJ = col ? lib.nm().GWArticleJson : lib.aj();
  const out: Record<string, unknown> = {};
  const miss: string[] = [];
  if (keys.includes("article")) { const p = AJ.parse(fence(o.article)); if (p.ok) out.article = docOf(p, col); else miss.push("기사"); }
  if (keys.includes("blog")) { const p = AJ.parse(fence(o.blog)); if (p.ok) out.blog = docOf(p); else miss.push("블로그"); }
  if (keys.includes("sns")) { const p = (col ? lib.nm() : lib.sns()).gwSnsParse(fence(o.sns)); if (p.ok) out.sns = p.posts; else miss.push("SNS"); }
  if (keys.includes("youtube")) { try { out.youtube = ytOf(fence(o.youtube), col); } catch { miss.push("쇼츠릴스 대본"); } }
  return { ok: true, ...out, miss };
}

/* 사진 자리 (앱 blog-writer materializeSlots) — 두 문단마다 한 장, 대표는 자리 없음 */
function layout(media: any[], paragraphCount: number) {
  const slots = lib.naver().layoutMediaSlots(paragraphCount, media);
  slots.forEach((items: { index: number }[], slot: number) => items.forEach(({ index }) => (media[index].insertAfterParagraph = slot)));
  media.forEach((m) => {
    if (m.isCover) m.insertAfterParagraph = null;
    else if (Number.isInteger(m.insertAfterParagraph)) m.insertAfterParagraph = Math.min(m.insertAfterParagraph, paragraphCount);
  });
  return media;
}

/* ── 수정 요청 — 웹은 늘 새 대화라 처음 프롬프트 + 지금 글 + 고칠 점을 한 번에 (앱의 fallbackPrompt) ── */
function draftJson(d: any, doc: string) {
  const o: Record<string, unknown> = { title: d.title };
  if (doc === "article") (d.subtitles || []).slice(0, 3).forEach((s: string, i: number) => (o[`subtitle${i + 1}`] = s));
  o.body = d.paragraphs;
  o.keywords = d.keywords || [];
  return "```json\n" + JSON.stringify(o, null, 2) + "\n```";
}
/* 뉴스칼럼 수정 (앱 blog-writer originalPrompt·revisePrompt · sns-writer revise · youtube-writer revise 의 칼럼 부분) */
function colRevisePrompt(b: any, source: any, req: string) {
  const M = lib.nm(), Y = lib.ytCol();
  const d = b.draft || {};
  const ref = colRef(b, source);
  if (b.doc === "article" || b.doc === "blog") {
    const original = b.doc === "article"
      ? M.gwBuildPrompt(source, { kind: M.GW_KIND[d.style] ? d.style : Object.keys(M.GW_KIND)[0], length: d.length || "normal" })
      : M.gwBuildBlogPrompt({ article: ref, source }, { style: M.GW_BLOG_STYLE[d.style] ? d.style : "info", length: d.length || "normal" }) + BLOG_FRIENDLY;
    const ask = b.doc === "article" ? M.gwBuildRevisePrompt(req, source) : M.gwBuildBlogRevisePrompt(req);
    return `${original}\n\n[앞서 작성한 ${b.doc === "article" ? "기사" : "블로그"} — 미리보기에서 고친 내용 포함]\n${draftJson(d, b.doc)}\n\n${ask}`;
  }
  if (b.doc === "sns") {
    if (!CHANNELS.includes(b.channel)) throw new Error("알 수 없는 채널입니다.");
    const now = "```json\n" + JSON.stringify(b.posts || {}, null, 2) + "\n```";
    return `${M.gwBuildSnsPrompt({ article: ref, source })}${toneLine(b.tone)}\n\n[앞서 작성한 SNS 글 — 고친 내용 포함]\n${now}\n\n${M.gwBuildSnsRevisePrompt(b.channel, req)}`;
  }
  if (b.doc === "youtube") {
    const full = { title: d.title, text: (d.narration || []).join("\n\n") };
    return `${colYtPrompt({ article: ref, source }, colYtSettings(d.settings || {}))}\n\n${Y.gwBuildYtRevisePrompt(full, req)}`;
  }
  throw new Error("알 수 없는 글입니다.");
}
/* AI 사진 만들기 — 앱 blog-writer.js makeImage 와 같은 프롬프트 (2026-11-04 사장님: 웹 블로그에도 AI 사진).
   회원 본인 AI(ChatGPT·Gemini) 옆 창에 붙여 넣어 그린다 — 서버는 질문 글만 만든다 */
function imagePrompt(b: any) {
  const article = { title: String(b.title || ""), body: String(b.body || "") };
  const request = String(b.request || "").slice(0, 300);
  const label = String(b.styleLabel || "");
  const withStyle = (prompt: string) => (!b.stylePrompt ? prompt
    : `${prompt}

[화풍·스타일 — 위 [선택한 스타일]보다 이것을 먼저 지킬 것] ${label}
${String(b.stylePrompt).slice(0, 1200)}
- 이미지 안에 글자, 숫자, 로고, 워터마크를 넣지 말 것`);
  const col = colOf(b);
  if (col) {
    const M = lib.nm();
    const st = M.GW_IMAGE_STYLE[b.style] ? b.style : "auto";
    return { prompt: withStyle(M.gwBuildImagePrompt(col, article, { style: st, request })), caption: M.gwAiImageCaption(article) };
  }
  const P = lib.prompt();
  const v = b.vacancy || {};
  const st = P.GW_IMAGE_STYLE[b.style] ? b.style : "news";
  const name = v.title || "해당 매물";
  return {
    prompt: withStyle(P.gwBuildImagePrompt(v, article, { style: st, request, customStyle: label })),
    caption: `${name} ${label || (P.GW_IMAGE_STYLE[st] || {}).label || "AI 이미지"} (AI 생성 이미지)`,
  };
}
function revisePrompt(b: any) {
  const v = b.vacancy || {};
  const req = String(b.request || "").trim();
  if (!req) throw new Error("어떻게 고칠지 적어 주세요.");
  if (colOf(b)) return colRevisePrompt(b, colOf(b), req);
  const d = b.draft || {};
  if (b.doc === "article" || b.doc === "blog") {
    const P = lib.prompt(), B = lib.blog();
    const ask = b.doc === "article" ? P.gwBuildRevisePrompt(req, v) : B.gwBuildBlogRevisePrompt(req, v);
    const original = b.doc === "article"
      ? P.gwBuildPrompt(v, { kind: d.style || "news", length: d.length || "normal" })
      : B.gwBuildBlogPrompt({ vacancy: v, article: b.ref || NO_ARTICLE }, { style: d.style || "listing", length: d.length || "normal" }) + BLOG_FRIENDLY;
    return `${original}\n\n[앞서 작성한 ${b.doc === "article" ? "기사" : "블로그"} — 미리보기에서 고친 내용 포함]\n${draftJson(d, b.doc)}\n\n${ask}`;
  }
  if (b.doc === "sns") {
    const S = lib.sns();
    if (!CHANNELS.includes(b.channel)) throw new Error("알 수 없는 채널입니다.");
    const ask = S.gwBuildSnsRevisePrompt(b.channel, req);
    const now = "```json\n" + JSON.stringify(b.posts || {}, null, 2) + "\n```";
    return `${S.gwBuildSnsPrompt({ vacancy: v, article: NO_REF })}${toneLine(b.tone)}\n\n[앞서 작성한 SNS 글 — 고친 내용 포함]\n${now}\n\n${ask}`;
  }
  if (b.doc === "youtube") {
    const full = { title: d.title, text: (d.narration || []).join("\n\n") };
    const ask = lib.yt().gwBuildYtRevisePrompt(full, req, v);
    return `${ytPrompt(v, ytSettings(v, d.settings || {}), b.ref || NO_ARTICLE)}\n\n${ask}`;
  }
  throw new Error("알 수 없는 글입니다.");
}
function reviseParse(b: any) {
  const col = b.column === true;
  if (b.doc === "article" || b.doc === "blog") {
    const p = (col ? lib.nm().GWArticleJson : lib.aj()).parse(b.text);
    if (!p.ok) return { ok: false, error: p.reason || "AI 답변을 읽지 못했습니다." };
    return { ok: true, doc: docOf(p, col && b.doc === "article") };
  }
  if (b.doc === "sns") {
    const p = (col ? lib.nm() : lib.sns()).gwSnsParse(b.text);
    if (!p.ok || !p.posts[b.channel]) return { ok: false, error: (p && p.reason) || "고친 글을 읽지 못했습니다." };
    return { ok: true, post: p.posts[b.channel] };
  }
  if (b.doc === "youtube") {
    try { return { ok: true, script: ytOf(b.text, col) }; } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
  }
  return { ok: false, error: "알 수 없는 글입니다." };
}

/* ── SNS 글 끝(링크·매물 정보 출처·해시태그) · 사진 고르기 (앱 sns-writer forWeb · pickMedia) ── */
function snsCompose(b: any) {
  const col = colOf(b);
  // 뉴스칼럼 — 중개사무소 출처 대신 소재 출처 줄 (내 기사면 내 물건접수 홈페이지의 그 기사 주소, 2026-11-04 사장님)
  const S = col ? lib.nm() : lib.sns();
  const ctx = col ? { credit: S.gwSnsCredit(col) } : { noun: b.noun || "매물", url: (b.listing && b.listing.detailUrl) || "", listing: b.listing || null };
  const out: Record<string, unknown> = {};
  for (const ch of CHANNELS) {
    const post = b.posts?.[ch] || null;
    const ai = (b.ai?.[ch] || []).map((x: boolean) => ({ ai: Boolean(x) }));
    out[ch] = { composed: post ? S.gwSnsCompose(ch, col ? withColLink(ch, post, col) : post, ctx) : { posts: [], text: "" }, aiNote: S.gwSnsAiLabelNote(ch, ai) };
  }
  return out;
}
function snsPick(b: any) {
  const S = lib.sns();
  const pool: any[] = Array.isArray(b.pool) ? b.pool : [];
  const out: Record<string, string[]> = {};
  for (const ch of CHANNELS) {
    const picked = S.gwSnsPickMedia(ch, pool.map((m) => ({ ...m, url: m.id })));
    out[ch] = picked.map((p: { url: string }) => p.url).filter((id: string) => pool.some((m) => m.id === id));
  }
  return out;
}

/* ── 네이버 블로그 블록 (앱 naver-write fillNaver) — 사진 블록은 mediaIndex 만, 그림은 화면이 넣는다 ── */
function colNaverBlocks(b: any, source: any) {
  const M = lib.nm(), nb = M.GWNaverBlog;
  const blog = b.blog || {};
  const design = nb.DESIGNS[b.design] ? b.design : (M.GW_BLOG_STYLE[blog.style] || {}).design || "basic";
  const media = Array.isArray(b.media) ? b.media : [];
  const blocks = nb.buildNaverBlocks((blog.paragraphs || []).join("\n\n"), media, { design, title: blog.title, source });
  return { blocks, tags: nb.normalizeTags(blog.keywords || []), design };
}
function naverBlocks(b: any) {
  if (colOf(b)) return colNaverBlocks(b, colOf(b));
  const N = lib.naver(), B = lib.blog();
  const saleKind = (b.vacancy && b.vacancy.saleKind) || "";
  const problems = N.listingProblems(b.listing, Boolean(saleKind));
  if (problems.length) {
    throw new Error(saleKind
      ? `물건 정보가 없어 멈췄습니다: ${problems.join(", ")}. 분석을 다시 해 주세요.`
      : `부동산 표시·광고 필수 정보가 없어 멈췄습니다: ${problems.join(", ")}. 공실의 등록자 정보를 확인해 주세요.`);
  }
  const blog = b.blog || {};
  const design = N.DESIGNS[b.design] ? b.design : (B.GW_BLOG_STYLE?.[blog.style] || {}).design || "basic";
  const media = Array.isArray(b.media) ? b.media : [];
  const blocks = N.buildNaverBlocks((blog.paragraphs || []).join("\n\n"), media, { design, title: blog.title, vacancy: { ...(b.vacancy || {}), vacancyId: b.vacancyId }, listing: b.listing });
  return { blocks, tags: N.normalizeTags(blog.keywords || []), design };
}

/* ── 유튜브 설명란·길이 (앱 youtube-writer forWeb · description) ── */
function ytView(b: any) {
  const L = lib.yt();
  const d = b.script || {};
  const all = (d.narration || []).join("\n\n");
  const article = b.article || {};
  const summary = (article.subtitles && article.subtitles.length ? article.subtitles : (article.paragraphs || []).slice(0, 1)).join("\n");
  const lines = [summary];
  const col = colOf(b);
  if (col) lines.push(colLink(col)); // 뉴스칼럼 — 내 홈페이지의 그 기사
  else if (b.listing) {
    const tail = lib.sns().gwSnsCompose("facebook", { body: "-" }, { noun: "매물", url: b.listing.detailUrl, listing: b.listing }).text || "";
    lines.push(tail.replace(/^-\n\n/, ""));
  } else lines.push(`▶ 매물 자세히 보기\n${b.detailUrl || "https://www.gongsilnews.com"}`);
  const tags = (article.keywords || []).map((k: string) => `#${String(k).replace(/^#+/, "").replace(/\s+/g, "")}`).filter((t: string) => t.length > 1 && !(col && /공실뉴스/.test(t))).slice(0, 10);
  return { seconds: L.gwYtSpeechSeconds(all), chars: L.gwYtCharCount(all), description: { text: lines.filter(Boolean).join("\n\n"), tags } };
}

/** 요청 하나 — op 에 따라 */
export function studioWebOp(op: string, b: any): Record<string, unknown> {
  switch (op) {
    case "options": return b.column === true ? colOptions() : options(b.vacancy);
    // 공실열람 상세 읽기 (앱 inject/gongsil-page.js) — 화면이 숨은 창(iframe)에 넣어 매물 정보를 읽는다
    case "pageScript": return { script: STUDIO_EXT_FILES["studio/gongsil-page.js"] || "" };
    case "allPrompt": return allPrompt(b);
    case "marketingPrompt": return marketingPrompt(b);
    case "marketingParse": return marketingParse(b);
    case "allParse": return allParse(b);
    case "layout": return { media: layout(Array.isArray(b.media) ? b.media : [], Number(b.paragraphCount) || 0) };
    case "revisePrompt": return { prompt: revisePrompt(b) };
    case "imagePrompt": return imagePrompt(b);
    case "imageStyleText": { // 기사용 그림 스타일의 조건 글 (사진 모음 [AI 이미지 만들기] — 앱 main.js mediaOp 와 같다)
      const S = (colOf(b) || b.column === true ? lib.nm() : lib.prompt()).GW_IMAGE_STYLE || {};
      return { text: String((S[b.style] || {}).prompt || "") };
    }
    case "reviseParse": return reviseParse(b);
    case "snsCompose": return { channels: snsCompose(b) };
    case "snsPick": return { media: snsPick(b) };
    case "naverBlocks": return naverBlocks(b);
    case "ytView": return ytView(b);
    default: throw new Error("알 수 없는 요청입니다.");
  }
}
