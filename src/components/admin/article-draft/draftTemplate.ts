import type { ArticleDraftResult, DraftChannel, DraftLength, DraftStyle, DraftVacancy } from "./types";

const won = (value?: number | null) => {
  if (!value) return "";
  const man = Math.round(value / 10_000);
  if (man >= 10_000) {
    const eok = Math.floor(man / 10_000);
    const rest = man % 10_000;
    return rest ? `${eok}억 ${rest.toLocaleString()}만원` : `${eok}억`;
  }
  return `${man.toLocaleString()}만원`;
};

const list = (value?: string[] | string | null) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? value.split(/[,#]/).map((item) => item.trim()).filter(Boolean) : [];
};

const price = (vacancy: DraftVacancy) => {
  if (vacancy.trade_type?.includes("매매")) return `매매 ${won(vacancy.deposit || vacancy.sale_price) || "가격 협의"}`;
  if (vacancy.trade_type?.includes("전세")) return `전세 ${won(vacancy.deposit) || "가격 협의"}`;
  const deposit = won(vacancy.deposit);
  const rent = won(vacancy.monthly_rent);
  return `월세 ${[deposit, rent].filter(Boolean).join(" / ") || "가격 협의"}`;
};

export function createArticleDraft(
  vacancy: DraftVacancy,
  channel: DraftChannel,
  style: DraftStyle,
  length: DraftLength,
): ArticleDraftResult {
  const name = vacancy.building_name || "공실 매물";
  const address = [vacancy.sido, vacancy.sigungu, vacancy.dong, vacancy.detail_addr].filter(Boolean).join(" ");
  const priceText = price(vacancy);
  const area = vacancy.exclusive_m2 ? `전용 ${vacancy.exclusive_m2}㎡` : "면적 정보 확인 필요";
  const rooms = vacancy.room_count ? `방 ${vacancy.room_count}개` : "";
  const baths = vacancy.bath_count ? `욕실 ${vacancy.bath_count}개` : "";
  const structure = [rooms, baths, vacancy.direction || ""].filter(Boolean).join(" · ");
  const options = list(vacancy.options);
  const themes = list(vacancy.themes);
  const highlights = [...themes, ...options].slice(0, 5);
  const featureText = highlights.length ? highlights.join("·") : "입지와 상품성을 함께 살펴볼 수 있는 매물";
  const region = [vacancy.sigungu, vacancy.dong].filter(Boolean).join(" ") || "도심권";
  const title = channel === "blog"
    ? `${region} ${name}, ${priceText} 매물 핵심정보 한눈에 보기`
    : `[공실열람 보도] ${region} '${name}' ${priceText} 신규 등록…${area} 실매물`;
  const subtitle = [
    `${address || region}에 나온 ${vacancy.property_type || "부동산"} 매물`,
    `${area}${structure ? ` · ${structure}` : ""}`,
    `${featureText}…현장 정보와 계약 조건 확인 필요`,
  ].join("\n");

  const facts = [
    `매물번호: ${vacancy.vacancy_no || "확인 필요"}`,
    `거래조건: ${priceText}`,
    `소재지: ${address || "상세 주소 확인 필요"}`,
    `면적·구조: ${[area, structure].filter(Boolean).join(" · ")}`,
    vacancy.maintenance_fee ? `관리비: ${won(vacancy.maintenance_fee)}` : "",
    vacancy.move_in_date ? `입주 가능일: ${vacancy.move_in_date}` : "",
    highlights.length ? `주요 특징: ${highlights.join(", ")}` : "",
  ].filter(Boolean);

  const intro = channel === "blog"
    ? `안녕하세요. 오늘은 ${region}에서 확인할 수 있는 ${name} 매물을 정리해 드립니다.`
    : `${region}에 위치한 ${name} 매물이 ${priceText} 조건으로 시장에 나왔다.`;
  const analysis = style === "analysis"
    ? `## 입지와 상품성 분석\n${name}은 ${address || region}에 자리해 지역 생활권과 교통 여건을 함께 누릴 수 있다. 이번 매물은 ${area} 규모로, ${structure || "내부 구조는 현장 확인이 필요하다"}. ${featureText}라는 점이 주요 검토 요소다. 동일 생활권 매물과 비교할 때에는 단순 호가뿐 아니라 관리비와 실제 내부 상태, 주차 여건, 입주 가능 시기를 함께 살펴야 한다.\n\n## 수요자별 확인사항\n실수요자는 동선과 생활 편의성, 수리 상태를 중심으로 보고 투자자는 인근 임대 수요와 보유비용, 향후 환금성을 비교해야 한다. 특히 현장 방문 때 채광과 소음, 공용부 관리 상태를 확인하면 온라인 정보만으로 놓치기 쉬운 차이를 파악할 수 있다.`
    : `## 매물 핵심 브리핑\n${name}은 ${address || region}에 자리한다. 현재 확인되는 조건은 ${priceText}, ${area}이며 ${featureText}이 특징이다. ${structure || "구조와 방향은 현장에서 확인할 수 있다"}. 등록된 사진과 실제 현장 상태를 비교하고 입주 일정과 관리 조건까지 확인하면 보다 정확한 판단이 가능하다.`;
  const closing = channel === "blog"
    ? "사진과 표기 정보는 등록 시점을 기준으로 하며, 방문 전 최신 거래 조건과 실제 상태를 다시 확인해 주세요."
    : "등록 정보는 변동될 수 있으므로 계약 전 현장 확인과 등기·권리관계 검토가 필요하다.";

  const sections = length === "short"
    ? [intro, analysis, closing]
    : length === "long"
      ? [intro, `## 등록 매물 상세정보\n${facts.map((fact) => `- ${fact}`).join("\n")}`, analysis, `## 현장 체크포인트\n${vacancy.description || "현장 접근성과 주변 생활환경, 건물 공용부 상태도 함께 비교할 필요가 있다."}`, "## 시장 관점\n실수요자는 자금 계획과 입주 시기를, 투자자는 임대수요와 보유비용을 중심으로 판단하는 것이 바람직하다. 같은 지역이라도 층과 방향, 수리 여부에 따라 실제 체감가치는 달라질 수 있다.", closing]
      : [intro, `## 등록 매물 상세정보\n${facts.map((fact) => `- ${fact}`).join("\n")}`, analysis, `## 계약 전 확인\n${closing}`];
  const article = sections.join("\n\n");
  const photo = [...(vacancy.vacancy_photos || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))[0]?.url;

  return {
    title,
    subtitle,
    content_article: article,
    content_blog: article,
    content_shorts: `${title}\n\n${intro} ${analysis}`,
    content_sns: `${title}\n${highlights.map((item) => `#${item.replace(/\s/g, "")}`).join(" ")}`,
    section2: vacancy.property_type || "부동산",
    keywords: [region, name, vacancy.property_type || "부동산", ...themes].filter(Boolean).slice(0, 8),
    imageUrl: photo,
    imageCaption: `${name} 등록 매물 사진. /자료=공실뉴스`,
    vacancyId: vacancy.id,
  };
}
