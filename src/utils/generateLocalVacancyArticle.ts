/**
 * 공실 매물 기반 기사 초안 로컬 생성기
 * - API 호출 없이 매물 정보(vacancies 행)만으로 즉시 기사 초안을 만든다
 * - 기사 스타일: "news" (뉴스기사형, 문단 중심) | "summary" (단락별 요약, ■ 소제목)
 * - 분량: "short" | "normal" | "long"
 *   매물 스펙만으로는 긴 글을 채울 수 없어서, 분량이 늘면 입지·거래 해설과
 *   확인할 점 같은 해설 문단을 덧붙인다. (매물에 없는 사실은 지어내지 않는다)
 */

export type ArticleStyle = "news" | "summary";
export type ArticleLength = "short" | "normal" | "long";

export interface LocalVacancyArticle {
  title: string;
  subtitle: string;
  content_article: string;
  section2: string;
  keywords: string[];
}

type Vacancy = Record<string, any>;

// ── 공통 헬퍼 ──

/** 받침 유무에 따라 조사 선택 (예: josa("역삼동", "은", "는") → "역삼동은") */
function josa(word: string, withBatchim: string, withoutBatchim: string): string {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) {
    // 한글이 아니면 숫자/영문 끝 — 숫자 읽기 기준으로 대략 판단
    return word + (/[0136780lmnLMN]$/.test(last) ? withBatchim : withoutBatchim);
  }
  return word + ((code - 0xac00) % 28 > 0 ? withBatchim : withoutBatchim);
}

/** 원 단위 금액 → "5억 3,000만원" */
function formatWon(value: any): string {
  const won = Number(value) || 0;
  if (won <= 0) return "";
  const man = Math.round(won / 10000);
  const eok = Math.floor(man / 10000);
  const rest = man % 10000;
  if (eok > 0) return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만원` : `${eok}억원`;
  return `${man.toLocaleString()}만원`;
}

const SIDO_SHORT: Record<string, string> = {
  서울특별시: "서울", 부산광역시: "부산", 대구광역시: "대구", 인천광역시: "인천", 광주광역시: "광주",
  대전광역시: "대전", 울산광역시: "울산", 세종특별자치시: "세종", 경기도: "경기", 강원도: "강원",
  강원특별자치도: "강원", 충청북도: "충북", 충청남도: "충남", 전라북도: "전북", 전북특별자치도: "전북",
  전라남도: "전남", 경상북도: "경북", 경상남도: "경남", 제주특별자치도: "제주",
};

const num = (v: any) => (v === null || v === undefined || v === "" ? null : Number(v));
const list = (v: any): string[] => (Array.isArray(v) ? v.filter(Boolean).map(String) : []);
const takeNames = (items: string[], n = 3) => items.slice(0, n).join(", ");

// ── 매물 정보 정리 ──

function extract(v: Vacancy) {
  const meta = v.metadata || {};
  const propertyType: string = v.property_type || "";
  const isApt = propertyType === "아파트·오피스텔";
  const isCommercial = propertyType.startsWith("상가");
  const isLand = v.sub_category === "토지";
  const typeLabel: string = (v.sub_category || propertyType || "매물").replace(/·/g, "/");
  const trade: string = v.trade_type || "";

  const sido = SIDO_SHORT[v.sido] || v.sido || "";
  const area = [v.sigungu, v.dong].filter(Boolean).join(" ");
  const location = [sido, area].filter(Boolean).join(" ");
  const dong: string = v.dong || v.sigungu || sido || "해당 지역";

  // 건물명은 주소 공개 설정을 따른다 (아파트·오피스텔은 단지명 공개가 기본)
  const showBuilding = isApt || v.address_exposure === "번지공개";
  const building: string = showBuilding && v.building_name ? v.building_name : "";

  const deposit = formatWon(v.deposit);
  const monthly = formatWon(v.monthly_rent);
  const maintenance = formatWon(v.maintenance_fee);
  let price = "";
  let priceShort = "";
  if (trade === "매매") {
    price = deposit ? `매매가 ${deposit}` : "매매가 협의";
    priceShort = deposit ? `매매 ${deposit}` : "매매";
  } else if (trade === "전세") {
    price = deposit ? `전세 보증금 ${deposit}` : "전세 조건 협의";
    priceShort = deposit ? `전세 ${deposit}` : "전세";
  } else {
    price = [deposit && `보증금 ${deposit}`, monthly && `월세 ${monthly}`].filter(Boolean).join(", ") || `${trade} 조건 협의`;
    priceShort = [deposit, monthly].filter(Boolean).join("/") ? `${trade} ${[deposit, monthly].filter(Boolean).join("/")}` : trade;
  }

  const exM2 = num(v.exclusive_m2);
  const exPy = num(v.exclusive_py) ?? (exM2 ? Math.round(exM2 * 0.3025 * 10) / 10 : null);
  const supM2 = num(v.supply_m2);
  const supPy = num(v.supply_py) ?? (supM2 ? Math.round(supM2 * 0.3025 * 10) / 10 : null);
  const areaText = exM2
    ? `전용 ${exM2}㎡(약 ${exPy}평)${supM2 ? `, 공급 ${supM2}㎡(약 ${supPy}평)` : ""}`
    : supM2 ? `공급 ${supM2}㎡(약 ${supPy}평)` : "";

  const floorText = v.current_floor
    ? `${v.total_floor ? `총 ${v.total_floor}층 중 ` : ""}${v.current_floor}층`
    : v.total_floor ? `총 ${v.total_floor}층 건물` : "";

  const infra: Record<string, string[]> = v.infrastructure || {};
  const subway = list(infra["지하철역"]);
  const bus = list(infra["버스정류장"]);
  const school = list(infra["학교"]);
  const hospital = list(infra["병원"]);
  const shopping = list(infra["쇼핑센터"]);

  const parking: string = v.parking && v.parking !== "없음" ? String(v.parking) : "";
  // "즉시입주(공실)" 같은 등록값을 기사 문장에 맞게 다듬는다 (예: "즉시", "1개월 이내")
  const moveInRaw: string = v.move_in_date || "";
  const moveIn = /즉시/.test(moveInRaw) ? "즉시" : moveInRaw.replace(/입주$/, "").trim();
  const approvalYear = num(meta.approval_year);
  const age = approvalYear ? new Date().getFullYear() - approvalYear : null;

  const commercialSpecs = [
    meta.ceiling_height && `천장고 ${meta.ceiling_height}m`,
    meta.power_capacity && `전력 ${meta.power_capacity}kW`,
    meta.has_drive_in && "드라이브인",
    meta.has_door_to_door && "도어투도어",
    meta.has_freight_elevator && "화물용 엘리베이터",
    meta.free_parking_cnt && `무료주차 ${meta.free_parking_cnt}대`,
    num(meta.elevator_cnt) ? `엘리베이터 ${meta.elevator_cnt}대` : "",
  ].filter(Boolean) as string[];

  const landSpecs = [
    meta.zoning && `용도지역 ${meta.zoning}`,
    meta.land_purpose && `지목 ${meta.land_purpose}`,
    meta.terrain && `지형 ${meta.terrain}`,
    meta.road_width && `접면도로 ${meta.road_width}m`,
    meta.development_potential && `개발 가능성 ${meta.development_potential}`,
  ].filter(Boolean) as string[];

  const buildingSpecs = [
    num(meta.ground_floors) ? `지상 ${meta.ground_floors}층` : "",
    num(meta.underground_floors) ? `지하 ${meta.underground_floors}층` : "",
    meta.building_coverage && `건폐율 ${meta.building_coverage}%`,
    meta.floor_area_ratio && `용적률 ${meta.floor_area_ratio}%`,
    meta.main_usage && `주용도 ${meta.main_usage}`,
  ].filter(Boolean) as string[];

  // metadata 금액(권리금·현재 임대료)은 만원 단위로 저장된다
  const manToText = (v: any) => (num(v) ? formatWon(Number(v) * 10000) : "");
  const rentalParts = [
    manToText(meta.current_rental_deposit) && `보증금 ${manToText(meta.current_rental_deposit)}`,
    manToText(meta.current_rental_monthly) && `월세 ${manToText(meta.current_rental_monthly)}`,
  ].filter(Boolean);
  const rentalIncome = rentalParts.length ? `현재 ${rentalParts.join(", ")}에 임대 중` : "";

  return {
    v, meta, isApt, isCommercial, isLand, typeLabel, trade, location, area, dong, building,
    price, priceShort, maintenance, areaText, floorText,
    rooms: !isCommercial && num(v.room_count) ? `방 ${v.room_count}개${num(v.bath_count) ? `·욕실 ${v.bath_count}개` : ""}` : "",
    direction: v.direction ? `${String(v.direction).replace(/향$/, "")}향` : "",
    subway, bus, school, hospital, shopping, parking, moveIn, approvalYear, age,
    illegal: meta.is_illegal === true ? "위반건축물 등재" : meta.is_illegal === false ? "위반건축물 해당 없음" : "",
    options: list(v.options), themes: list(v.themes).map(t => t.replace(/^#\s*/, "")),
    commercialSpecs, landSpecs, buildingSpecs, rentalIncome,
    premium: num(meta.premium_fee) ? `권리금 ${manToText(meta.premium_fee)}` : "",
  };
}

type Info = ReturnType<typeof extract>;

// ── 문장 조각 ──

function subjectPhrase(d: Info): string {
  return `${d.location} ${d.building ? d.building + " " : ""}${d.typeLabel}`.trim();
}

function leadSentence(d: Info): string {
  return `11만 부동산과 임대인을 위한 공실정보채널, 공실뉴스에 ${subjectPhrase(d)} ${d.trade} 물건이 나왔습니다. `
    + `본 물건은 ${d.price} 조건의 ${d.typeLabel}입니다.${d.maintenance ? ` 관리비는 월 ${d.maintenance}입니다.` : ""}`;
}

/**
 * 문장 끝을 "~다."(해라체)에서 "~습니다/~입니다"(합니다체)로 바꾼다.
 * 문장 조각은 해라체로 쓰고 마지막에 한 번에 바꾼다. (새 어미를 쓰면 여기에 추가)
 */
const FORMAL_ENDINGS: [string, string][] = [
  ["않는다.", "않습니다."], ["찾는다.", "찾습니다."], ["꼽힌다.", "꼽힙니다."], ["달라진다.", "달라집니다."],
  ["갈린다.", "갈립니다."], ["나뉜다.", "나뉩니다."], ["된다.", "됩니다."], ["한다.", "합니다."], ["하다.", "합니다."],
  ["있다.", "있습니다."], ["없다.", "없습니다."], ["나왔다.", "나왔습니다."], ["좋다.", "좋습니다."],
  ["가깝다.", "가깝습니다."], ["쉽다.", "쉽습니다."], ["크다.", "큽니다."], ["많다.", "많습니다."], ["차다.", "차입니다."],
  ["먼저다.", "먼저입니다."], ["이다.", "입니다."],
];

function toFormal(text: string): string {
  let out = text;
  for (const [from, to] of FORMAL_ENDINGS) out = out.split(from).join(to);
  return out;
}

function specSentences(d: Info): string[] {
  const out: string[] = [];
  const shape = [d.areaText, d.floorText, d.rooms, d.direction].filter(Boolean);
  if (shape.length) out.push(`매물 규모는 ${shape.join(", ")}이다.`);
  if (d.approvalYear) {
    out.push(`건물은 ${d.approvalYear}년 준공${d.age !== null && d.age <= 5 ? "된 신축급으로" : "됐으며"}, ${
      d.illegal === "위반건축물 해당 없음" ? "위반건축물에는 해당하지 않는다." : d.illegal === "위반건축물 등재" ? "위반건축물로 등재돼 있다." : `올해로 ${d.age}년 차다.`
    }`);
  } else if (d.illegal) {
    out.push(d.illegal === "위반건축물 등재" ? "건축물대장상 위반건축물로 등재돼 있다." : "건축물대장상 위반건축물에는 해당하지 않는다.");
  }
  if (d.buildingSpecs.length) out.push(`건물 개요는 ${d.buildingSpecs.join(", ")}이다.`);
  if (d.parking) out.push(`주차는 ${d.parking} 가능하다.`);
  if (d.moveIn) out.push(`입주는 ${d.moveIn} 가능하다.`);
  return out;
}

function featureSentences(d: Info): string[] {
  const out: string[] = [];
  if (d.isLand && d.landSpecs.length) out.push(`토지 조건은 ${d.landSpecs.join(", ")}이다.`);
  if (d.isCommercial && d.commercialSpecs.length) out.push(`업무·영업 공간으로서의 사양은 ${d.commercialSpecs.join(", ")} 등이다.`);
  if (d.options.length) out.push(`${takeNames(d.options, 6)} 등의 옵션이 갖춰져 있다.`);
  if (d.themes.length) out.push(`등록자가 꼽은 특징은 ${takeNames(d.themes, 4)}이다.`);
  if (d.rentalIncome) out.push(`${d.rentalIncome}인 상태로 거래된다.`);
  if (d.premium) out.push(`${d.premium} 조건이 붙어 있다.`);
  return out;
}

function transportSentences(d: Info): string[] {
  const out: string[] = [];
  if (d.subway.length) {
    out.push(`교통은 ${josa(takeNames(d.subway), "이", "가")} 가까워 ${d.subway.length >= 2 ? "복수 노선을 이용할 수 있는 " : ""}역세권 입지로 분류된다.`);
  }
  if (d.bus.length) out.push(`주변에 ${takeNames(d.bus, 2)} 등 버스 정류장도 있다.`);
  return out;
}

function lifeSentences(d: Info): string[] {
  const out: string[] = [];
  if (d.school.length) out.push(`인근 학교로는 ${takeNames(d.school, 4)} 등이 있다.`);
  if (d.hospital.length) out.push(`의료시설은 ${takeNames(d.hospital)} 등이 가깝다.`);
  if (d.shopping.length) out.push(`생활·쇼핑 시설로는 ${takeNames(d.shopping)} 등이 주변에 있다.`);
  return out;
}

/** 거래유형·매물유형별 확인할 점 (일반 해설) */
function checkpointSentences(d: Info): string[] {
  const out: string[] = [];
  if (d.trade === "매매") {
    out.push("매매 거래라면 등기부등본으로 소유 관계와 근저당 등 권리 관계를 먼저 확인하는 것이 기본이다.");
    if (d.isCommercial) out.push("수익형 부동산은 현재 임대 현황과 임대료 수준, 공실 기간을 함께 따져 실제 수익률을 계산해 보는 것이 좋다.");
    else if (d.isLand) out.push("토지는 용도지역과 건축 가능 여부, 도로 접면 조건에 따라 활용 가치가 크게 달라지므로 토지이용계획확인원을 함께 살펴야 한다.");
    else out.push("주거용 매물은 실거주 여부에 따라 대출 한도와 세금이 달라질 수 있어 자금 계획을 미리 세워두는 편이 안전하다.");
  } else if (d.trade === "전세") {
    out.push("전세 계약에서는 보증금이 매매가 대비 적정한 수준인지, 선순위 채권이 얼마나 있는지를 확인하는 것이 중요하다.");
    out.push("전세보증금 반환보증 가입이 가능한 매물인지도 계약 전에 확인해 두는 것이 좋다.");
  } else {
    out.push("임대차 계약에서는 보증금 보호를 위해 등기부등본상 선순위 권리를 확인하고, 관리비에 포함되는 항목을 미리 짚어보는 것이 좋다.");
    if (d.isCommercial) out.push("상가·사무실은 업종 제한과 인테리어 원상복구 범위, 렌트프리 가능 여부를 계약 전에 협의해 두는 편이 유리하다.");
  }
  if (d.illegal === "위반건축물 등재") out.push("위반건축물로 등재돼 있어 대출이나 용도 변경에 제약이 있을 수 있으므로 건축물대장을 반드시 확인해야 한다.");
  if (d.age !== null && d.age >= 20) out.push(`준공 ${d.age}년 차 건물인 만큼 배관·방수 등 노후 설비 상태도 현장에서 살펴볼 필요가 있다.`);
  return out;
}

// ── 해설 문단 (매물에 없는 사실은 쓰지 않고, 유형·거래별 일반 해설만 담는다) ──

/** 입지 해설: [교통, 생활 인프라] */
function areaCommentary(d: Info): string[] {
  const where = josa(d.dong, "은", "는");
  const transport = d.subway.length
    ? `${where} ${josa(d.subway[0], "을", "를")} 중심으로 대중교통 접근성이 확보된 지역이다. 역과 가까운 매물은 출퇴근 수요가 꾸준해 공실 위험이 상대적으로 낮고, 향후 재거래할 때도 찾는 수요층이 넓다는 장점이 있다.`
    : `${where} 대중교통보다 차량 이동 비중이 높은 편일 수 있어, 주차 여건과 주요 도로 접근성이 매물 가치를 좌우하는 요소로 꼽힌다. 가까운 버스 노선과 배차 간격도 함께 확인해 두는 것이 좋다.`;
  const lifeCount = [d.school, d.hospital, d.shopping].filter(x => x.length).length;
  const life = lifeCount >= 2
    ? "학교와 병원, 쇼핑시설 같은 생활 인프라도 주변에 갖춰져 있다. 생활 편의시설이 가까우면 거주 수요뿐 아니라 이를 이용하는 유동 인구도 함께 기대할 수 있어, 주거용과 상업용 모두에 긍정적인 요소로 평가된다."
    : "주변 생활 인프라 정보는 충분히 등록돼 있지 않아, 현장을 방문할 때 도보권 편의시설과 이동 동선을 직접 확인해 보는 것이 좋다.";
  return [transport, life];
}

/** 매물 유형 해설: [활용, 수요 특성, 관리·현장] */
function typeCommentary(d: Info): string[] {
  if (d.isLand) {
    return [
      "토지는 개별 필지의 조건이 가격을 결정하는 비중이 크다. 용도지역에 따라 지을 수 있는 건물의 종류와 규모가 정해지고, 도로 접면 여부와 도로 폭에 따라 건축 허가 가능성도 달라진다.",
      "토지 매수를 검토한다면 토지이용계획확인원으로 용도지역과 각종 규제를 확인하고, 인근 개발 계획과 도로 확장 여부를 함께 살펴보는 것이 투자 판단의 출발점이다.",
      "현장에서는 경계와 실제 이용 현황이 서류와 일치하는지, 진입로 확보에 문제가 없는지, 배수와 지반 상태는 어떤지를 확인해야 한다. 필요하면 경계측량으로 면적과 경계를 확정해 두는 것이 분쟁을 막는 방법이다.",
    ];
  }
  if (d.isCommercial) {
    return [
      "상업용 매물은 같은 건물이라도 층과 전면 노출도, 출입 동선에 따라 활용도가 크게 달라진다. 1층과 저층부는 가시성이 좋아 판매·서비스 업종에, 상층부는 사무실이나 학원, 병원처럼 목적 방문 수요가 있는 업종에 적합한 경우가 많다.",
      "입점 업종을 정할 때는 건축물대장상 용도와 실제 영업하려는 업종이 맞는지 확인해야 한다. 음식점이나 병원, 학원 등은 업종별로 요구되는 용도와 시설 기준이 달라, 계약 전에 관할 구청이나 전문가에게 인허가 가능 여부를 확인해 두는 것이 안전하다.",
      "사무실 수요는 교통 접근성과 주차 여건에 민감하다. 직원 출퇴근과 거래처 방문이 잦은 업종이라면 역과의 거리와 주차 가능 대수, 건물 출입 시간과 보안 시스템까지 함께 살펴볼 필요가 있다.",
    ];
  }
  return [
    `주거용 매물은 같은 지역 안에서도 면적과 층, 향에 따라 선호도가 뚜렷하게 갈린다. 저층은 출입이 편하고 고층은 조망과 채광에서 유리한 편이어서, 실거주 목적이라면 생활 동선에 맞춰 판단하는 것이 좋다.`,
    "최근 주거 수요는 직주근접과 생활 인프라를 중시하는 경향이 강하다. 대중교통으로 주요 업무지구까지 얼마나 걸리는지, 도보권에 마트와 병원이 있는지가 실거주 만족도를 좌우하는 만큼 실제 이동 시간을 미리 확인해 보는 것도 방법이다.",
    "관리 상태도 눈여겨볼 대목이다. 공용 공간 청소 상태와 엘리베이터·주차장 관리, 분리수거 공간 운영 방식 등은 입주 후 생활 편의와 직결된다. 최근 몇 달 치 관리비 부과 내역을 받아 보면 계절별 부담 수준도 가늠할 수 있다.",
  ];
}

/** 수요층 해설 */
function demandCommentary(d: Info): string {
  if (d.isLand) return "토지 수요는 실사용과 투자 목적으로 나뉜다. 실수요자는 건축 가능 여부와 진입로를, 투자자는 개발 계획과 주변 지가 흐름을 중시하는 만큼 목적에 따라 검토 항목을 달리하는 것이 좋다.";
  if (d.isCommercial) return "상업용 매물의 수요층은 입지 성격에 따라 달라진다. 역세권과 대로변은 프랜차이즈와 병·의원, 금융 업종의 관심이 높고, 이면도로는 임대료 부담을 낮추려는 사무실과 소규모 업체 수요가 주로 찾는다.";
  return "주거 매물은 면적과 방 개수에 따라 수요층이 나뉜다. 역세권 소형 면적은 1~2인 직장인 가구의 수요가, 학교와 가까운 중대형 면적은 자녀를 둔 가구의 수요가 꾸준한 편이다.";
}

/** 거래유형 해설: [가격 판단, 자금·권리 보호] */
function tradeCommentary(d: Info): string[] {
  if (d.trade === "매매") {
    return [
      "매수를 검토한다면 최근 같은 지역 비슷한 매물의 실거래가와 현재 호가를 비교해 가격 수준을 가늠해 보는 것이 먼저다. 국토교통부 실거래가 공개시스템에서 인근 거래 사례를 확인할 수 있다.",
      "자금 계획도 미리 세워야 한다. 매매가 외에 취득세와 중개보수, 등기 비용 등 부대비용이 함께 들고, 대출을 활용한다면 매물 유형과 보유 주택 수에 따라 한도와 금리가 달라질 수 있다.",
    ];
  }
  if (d.trade === "전세") {
    return [
      "전세를 검토한다면 보증금이 매매 시세 대비 적정한 수준인지부터 따져봐야 한다. 전세가율이 지나치게 높은 매물은 보증금을 돌려받는 과정에서 어려움을 겪을 수 있어 주의가 필요하다.",
      "계약 후에는 전입신고와 확정일자를 바로 받아 대항력과 우선변제권을 확보하고, 가능하다면 전세보증금 반환보증에 가입해 두는 것이 안전하다.",
    ];
  }
  return [
    "임차를 검토한다면 같은 지역 비슷한 면적의 매물과 보증금·월세 조합을 비교해 보는 것이 좋다. 보증금을 조정하면 월세가 달라지는 경우가 많아 자금 사정에 맞는 조합을 협의해 볼 수 있다.",
    `계약 기간과 갱신 조건, 중도 해지 시 조건도 미리 정해 두는 것이 분쟁을 줄이는 방법이다. ${d.isCommercial ? "상가라면 사업자등록과 확정일자를" : "주거용이라면 전입신고와 확정일자를"} 챙겨 보증금을 보호해야 한다.`,
  ];
}

/** 거래 절차 해설 */
function processCommentary(d: Info): string {
  return d.trade === "매매"
    ? "거래는 매물 확인과 가격 협의, 계약금 지급과 계약서 작성, 중도금과 잔금 지급, 소유권 이전 등기 순으로 진행된다. 잔금을 치르기 전에 등기부등본을 다시 떼어 권리 관계에 변동이 없는지 확인하는 것이 좋다."
    : "계약은 매물 확인과 조건 협의, 계약금 지급과 계약서 작성, 잔금 지급과 입주 순으로 진행된다. 특약에는 원상복구 범위와 수리 책임, 관리비 항목 등을 구체적으로 적어 두는 것이 분쟁 예방에 도움이 된다.";
}

/** 비용 해설 */
function costCommentary(d: Info): string {
  return d.trade === "매매"
    ? "보유 단계의 비용도 따져볼 필요가 있다. 재산세 등 보유세는 매물 유형과 공시가격, 보유 주택 수에 따라 달라지고, 나중에 매도할 때는 양도소득세가 발생할 수 있다. 세부 금액은 세무 전문가와 상담해 확인하는 것이 정확하다."
    : "매달 나가는 고정비도 계산해 두어야 한다. 월세와 관리비 외에 전기·수도·가스 등 공과금과 인터넷, 주차비가 별도로 드는지 확인하면 실제 월 부담액을 정확히 알 수 있다.";
}

/** 현장 점검 해설 */
function visitCommentary(): string[] {
  return [
    "현장 방문 전에는 매물 사진과 실제 상태가 일치하는지, 관리비에 포함된 항목과 주차 가능 대수가 등록 정보와 같은지를 중개사에게 확인해 두면 방문 시간을 줄일 수 있다.",
    "방문할 때는 누수 흔적과 곰팡이, 창호와 설비 상태를 직접 살펴보고, 낮과 저녁 시간대에 각각 한 번씩 둘러보면 채광과 소음, 주변 분위기를 더 정확히 파악할 수 있다.",
  ];
}

/** 서류·중개보수·협의 해설 (길게) */
function dealCommentary(): string[] {
  return [
    "서류 확인도 빼놓을 수 없다. 등기부등본의 갑구에서는 소유자와 압류·가압류 여부를, 을구에서는 근저당권 등 소유권 외의 권리를 확인할 수 있다. 건축물대장에서는 건물의 용도와 면적, 위반건축물 여부를 살펴볼 수 있다.",
    "중개보수는 거래 금액과 매물 유형에 따라 법정 상한 요율이 정해져 있다. 주택은 거래 금액 구간별 상한 요율이, 상가·사무실 등 주택 외 부동산은 거래 금액의 0.9% 이내에서 협의해 정한다. 계약 전에 중개보수 금액과 부가세 포함 여부를 미리 확인해 두는 것이 좋다.",
    "가격과 조건은 협의 여지가 있는 경우가 많다. 입주 시기나 잔금 일정, 수리 범위처럼 가격 외 조건을 함께 조율하면 양측이 받아들일 만한 합의점을 찾기 쉽다. 협의한 내용은 반드시 계약서 특약에 남겨 두어야 한다.",
  ];
}

/** 매물 정보 한눈에 보기 (항목 목록) */
function factLines(d: Info): string[] {
  return [
    d.location && `· 소재지: ${d.location}${d.building ? ` ${d.building}` : ""}`,
    `· 매물 유형: ${d.typeLabel}`,
    `· 거래 조건: ${d.price}${d.maintenance ? ` (관리비 월 ${d.maintenance})` : ""}`,
    d.areaText && `· 면적: ${d.areaText}`,
    d.floorText && `· 층: ${d.floorText}`,
    d.rooms && `· 구조: ${d.rooms}`,
    d.direction && `· 방향: ${d.direction}`,
    d.approvalYear && `· 준공: ${d.approvalYear}년`,
    d.parking && `· 주차: ${d.parking}`,
    d.moveIn && `· 입주: ${d.moveIn} 가능`,
    d.subway.length && `· 인근 역: ${takeNames(d.subway)}`,
    d.premium && `· 권리금: ${d.premium.replace("권리금 ", "")}`,
  ].filter(Boolean) as string[];
}

const closing = "자세한 매물 정보와 사진은 공실뉴스 공실열람에서 확인할 수 있다.";

// ── 조립 ──
// 짧게: 매물 정보 + 입지·유형 해설 1문단씩 + 핵심 확인할 점
// 보통: + 생활 인프라·유형·거래 해설 + 확인할 점 전체
// 길게: + 수요층·관리·거래 절차·비용·현장 점검 해설

function buildNews(d: Info, length: ArticleLength): string {
  const area = areaCommentary(d);
  const type = typeCommentary(d);
  const trade = tradeCommentary(d);
  const checks = checkpointSentences(d);
  const paras: string[] = [];

  paras.push([leadSentence(d), ...specSentences(d)].join(" "));
  const feature = featureSentences(d);
  if (feature.length) paras.push(feature.join(" "));
  const place = [...transportSentences(d), ...lifeSentences(d)];
  if (place.length) paras.push(place.join(" "));
  paras.push(area[0]);

  if (length === "short") {
    paras.push(type[0]);
    paras.push(checks.slice(0, 2).join(" "));
  } else {
    paras.push(area[1]);
    paras.push(type[0], type[1]);
    if (length === "long") paras.push(demandCommentary(d), type[2]);
    paras.push(...trade);
    paras.push(checks.join(" "));
    if (length === "long") paras.push(processCommentary(d), ...dealCommentary(), costCommentary(d), ...visitCommentary());
    paras.push(`[매물 정보 한눈에 보기]\n${factLines(d).join("\n")}`);
  }
  paras.push(closing);
  return paras.join("\n\n");
}

function buildSummary(d: Info, length: ArticleLength): string {
  const area = areaCommentary(d);
  const type = typeCommentary(d);
  const trade = tradeCommentary(d);
  const checks = checkpointSentences(d);
  const sections: string[] = [];

  const keyFacts = [d.areaText, d.floorText, d.parking && `주차 ${d.parking}`, d.subway[0] && `${d.subway[0]} 인근`].filter(Boolean);
  sections.push(`${leadSentence(d)}${keyFacts.length ? ` ${keyFacts.join(", ")} 조건${d.moveIn ? `이며, 입주는 ${d.moveIn} 가능하다.` : "이다."}` : ""}`);

  const section = (heading: string, body: string[]) => {
    const text = body.filter(Boolean);
    if (text.length) sections.push(`**■ ${heading}**\n${text.join(" ")}`);
  };

  section("매물 개요", specSentences(d));
  section("거래 조건", [
    `${d.price}${d.maintenance ? `, 관리비는 월 ${d.maintenance}` : ""}이다.`,
    ...(d.premium ? [`${d.premium} 조건이 붙어 있다.`] : []),
    ...(d.rentalIncome ? [`${d.rentalIncome}인 상태로 거래된다.`] : []),
    ...(length === "short" ? [] : [trade[0]]),
  ]);
  section("입지·교통", [...transportSentences(d), area[0]]);
  if (length === "short") {
    section("주변 생활환경", lifeSentences(d));
    section("확인할 점", [type[0], ...checks.slice(0, 2)]);
  } else {
    section("주변 생활환경", [...lifeSentences(d), area[1]]);
    section(d.isLand ? "토지 특징" : d.isCommercial ? "건물·시설 특징" : "옵션·특징",
      [...featureSentences(d).filter(s => !s.includes("권리금") && !s.includes("임대 중")), type[0]]);
    section(d.isLand ? "활용·투자 포인트" : d.isCommercial ? "입점 업종 검토" : "실거주 포인트", [type[1], ...(length === "long" ? [type[2]] : [])]);
    if (length === "long") section("수요층 분석", [demandCommentary(d)]);
    section("확인할 점", [...checks, trade[1]]);
    if (length === "long") {
      const deal = dealCommentary();
      section("거래 절차", [processCommentary(d), deal[2]]);
      section("서류·중개보수", [deal[0], deal[1]]);
      section("비용 점검", [costCommentary(d)]);
      section("현장 점검", visitCommentary());
    }
    sections.push(`**■ 매물 정보 한눈에 보기**\n${factLines(d).join("\n")}`);
  }
  sections.push(closing);
  return sections.join("\n\n");
}

export function generateLocalVacancyArticle(
  vacancy: Vacancy,
  style: ArticleStyle,
  length: ArticleLength
): LocalVacancyArticle {
  const d = extract(vacancy);

  const headlineTail = d.trade === "매매" ? "시장에 나와" : "임차인 찾는다";
  const title = `${d.dong} ${d.building ? d.building + " " : ""}${d.typeLabel}, ${d.priceShort} ${headlineTail}`.replace(/\s+/g, " ").trim();

  // 부제목은 항상 3줄: ① 위치·유형·가격 ② 매물 규모·건물 ③ 입지·입주
  // 한쪽 정보가 부족하면 남는 항목을 끌어와 줄이 비지 않게 한다
  const specPool = [
    d.areaText, d.floorText, d.rooms, d.direction,
    d.approvalYear ? `${d.approvalYear}년 준공` : "",
    d.parking && `주차 ${d.parking}`,
    d.illegal === "위반건축물 해당 없음" ? "위반건축물 없음" : "",
    d.options.length ? `${takeNames(d.options, 3)} 옵션` : "",
    ...d.commercialSpecs.slice(0, 2), ...d.landSpecs.slice(0, 2),
  ].filter(Boolean) as string[];
  const placePool = [
    d.subway.length ? `${takeNames(Array.from(new Set(d.subway.map(s => s.split(" ")[0]))), 2)} 인근` : "",
    d.moveIn && `${d.moveIn} 입주 가능`,
    !d.subway.length && d.bus.length ? `${d.bus[0]} 인근` : "",
    d.school.length ? `${d.school[0]} 인근` : "",
    d.themes.length ? takeNames(d.themes, 2) : "",
    d.premium,
  ].filter(Boolean) as string[];
  const line2 = specPool.splice(0, 3);
  const line3 = placePool.splice(0, 3);
  const leftovers = [...specPool, ...placePool];
  while (line2.length < 2 && leftovers.length) line2.push(leftovers.shift()!);
  while (line3.length < 2 && leftovers.length) line3.push(leftovers.shift()!);
  while (line2.length < 2 && line3.length > 2) line2.push(line3.pop()!);
  const subtitleLines = [
    `${subjectPhrase(d)} ${d.priceShort}${d.maintenance ? ` (관리비 월 ${d.maintenance})` : ""}`,
    line2.join(" · ") || `${d.typeLabel} ${d.trade} 매물`,
    line3.join(" · ") || "자세한 정보는 공실뉴스 공실열람에서 확인",
  ];

  const keywords = Array.from(new Set([
    // 역 이름은 노선명을 떼고(예: "영통역 수인분당선" → "영통역"), 시군구는 마지막 단위만 쓴다
    d.dong, String(d.v.sigungu || "").split(" ").pop(), d.typeLabel.split("/")[0], d.trade, d.building,
    ...d.subway.slice(0, 2).map(s => s.split(" ")[0]), "공실뉴스",
  ].filter(Boolean).map(k => String(k).replace(/\s+/g, ""))));

  return {
    title,
    subtitle: subtitleLines.join("\n"),
    content_article: toFormal(style === "summary" ? buildSummary(d, length) : buildNews(d, length)),
    // 기사 2차 섹션 이름은 매물 분류와 표기가 조금 다르다
    section2: d.isCommercial ? "상가/사무실/공장/토지" : (vacancy.property_type || "").replace(/·/g, "/"),
    keywords,
  };
}
