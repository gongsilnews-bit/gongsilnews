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
  const moveIn: string = v.move_in_date || "";
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
  const target = d.trade === "매매" ? "매물" : "임대 매물";
  return `${josa(`${subjectPhrase(d)} ${d.trade} ${target}`, "이", "가")} 시장에 나왔다. 거래 조건은 ${d.price}${d.maintenance ? `, 관리비 월 ${d.maintenance}` : ""}이다.`;
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
  const use = [d.parking && `주차 ${d.parking}`, d.moveIn && `입주 ${d.moveIn}`].filter(Boolean);
  if (use.length) out.push(`${use.join(", ")} 조건이다.`);
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

/** 분량이 "길게"일 때 덧붙이는 해설 문단 */
function marketCommentary(d: Info): string[] {
  const out: string[] = [];
  const where = josa(d.dong, "은", "는");
  if (d.subway.length) {
    out.push(`${where} ${d.subway[0]}을 중심으로 대중교통 접근성이 확보된 지역이다. 역과 가까운 매물은 출퇴근 수요가 꾸준해 공실 위험이 상대적으로 낮고, 향후 재거래 시에도 수요층이 넓다는 장점이 있다.`);
  } else {
    out.push(`${where} 대중교통보다는 차량 이동 비중이 높은 편일 수 있어, 주차 여건과 주요 도로 접근성이 매물 가치를 좌우하는 요소로 꼽힌다.`);
  }
  if (d.isCommercial) {
    out.push("상업용 매물은 같은 지역이라도 층과 전면 노출도, 주변 유동 인구에 따라 체감 가치가 크게 달라진다. 실제 방문해 시간대별 유동 인구와 인근 공실 현황을 살펴보면 적정 조건을 판단하는 데 도움이 된다.");
  } else if (d.isLand) {
    out.push("토지는 개별 필지의 조건이 가격을 결정하는 비중이 크다. 인근 개발 계획과 도로 확장 여부, 주변 토지의 실제 활용 사례를 함께 살펴보는 것이 투자 판단의 출발점이다.");
  } else {
    out.push("주거용 매물은 학교와 병원, 생활편의시설까지의 거리가 실거주 만족도를 좌우한다. 같은 조건이라도 채광과 소음, 단지 관리 상태에 따라 체감이 달라지므로 낮과 저녁 시간대에 각각 방문해 보는 것이 좋다.");
  }
  if (d.trade === "매매") {
    out.push("매수를 검토한다면 최근 같은 지역의 실거래가와 호가를 비교해 가격 수준을 가늠해 보고, 취득세와 중개보수 등 부대비용까지 포함해 총비용을 계산해 보는 것이 바람직하다.");
  } else {
    out.push("임차를 검토한다면 같은 지역 비슷한 면적의 매물과 보증금·월세 조합을 비교해 보고, 계약 기간과 갱신 조건, 중도 해지 시 조건까지 미리 확인해 두는 것이 분쟁을 줄이는 방법이다.");
  }
  out.push("현장 방문 전에는 매물 사진과 실제 상태가 일치하는지, 관리비에 포함된 항목과 주차 가능 대수가 등록 정보와 같은지를 중개사에게 확인해 두면 방문 시간을 줄일 수 있다.");
  return out;
}

const closing = "자세한 매물 정보와 사진은 공실뉴스 공실열람에서 확인할 수 있다.";

// ── 조립 ──

function buildNews(d: Info, length: ArticleLength): string {
  const paras: string[] = [];
  paras.push([leadSentence(d), ...specSentences(d)].join(" "));
  const feature = featureSentences(d);
  if (feature.length) paras.push(feature.join(" "));
  const place = [...transportSentences(d), ...(length === "short" ? lifeSentences(d).slice(0, 1) : lifeSentences(d))];
  if (place.length) paras.push(place.join(" "));
  if (length !== "short") paras.push(checkpointSentences(d).join(" "));
  if (length === "long") paras.push(...marketCommentary(d));
  paras.push(closing);
  return paras.join("\n\n");
}

function buildSummary(d: Info, length: ArticleLength): string {
  const sections: string[] = [];
  const keyFacts = [d.areaText, d.floorText, d.parking && `주차 ${d.parking}`, d.subway[0] && `${d.subway[0]} 인근`].filter(Boolean);
  sections.push(`${leadSentence(d)}${keyFacts.length ? ` ${keyFacts.join(", ")} 조건으로, ${d.moveIn ? `입주는 ${d.moveIn}이다.` : "세부 조건은 협의로 정할 수 있다."}` : ""}`);

  const section = (heading: string, body: string[]) => {
    if (body.length) sections.push(`**■ ${heading}**\n${body.join(" ")}`);
  };

  section("매물 개요", specSentences(d));
  section("거래 조건", [
    `${d.trade} 거래로 ${d.price}${d.maintenance ? `, 관리비는 월 ${d.maintenance}` : ""}이다.`,
    ...(d.premium ? [`${d.premium} 조건이 붙어 있다.`] : []),
    ...(d.rentalIncome ? [`${d.rentalIncome}인 상태로 거래된다.`] : []),
  ]);
  section("입지·교통", transportSentences(d));
  if (length !== "short") {
    section("주변 생활환경", lifeSentences(d));
    section(d.isLand ? "토지 특징" : d.isCommercial ? "건물·시설 특징" : "옵션·특징", featureSentences(d).filter(s => !s.includes("권리금") && !s.includes("임대 중")));
    section("확인할 점", checkpointSentences(d));
  }
  if (length === "long") {
    const commentary = marketCommentary(d);
    section("지역·수요 분석", commentary.slice(0, 2));
    section("거래 전 체크포인트", commentary.slice(2));
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

  const subtitleLines = [
    [d.areaText, d.floorText, d.parking && `주차 ${d.parking}`].filter(Boolean).join(" · "),
    [d.subway.length ? `${takeNames(d.subway, 2)} 인근` : "", d.moveIn && `입주 ${d.moveIn}`].filter(Boolean).join(" · "),
  ].filter(Boolean);

  const keywords = Array.from(new Set([
    d.dong, d.v.sigungu, d.typeLabel.split("/")[0], d.trade, d.building, ...d.subway.slice(0, 2), "공실뉴스",
  ].filter(Boolean).map(k => String(k).replace(/\s+/g, ""))));

  return {
    title,
    subtitle: subtitleLines.join("\n"),
    content_article: style === "summary" ? buildSummary(d, length) : buildNews(d, length),
    // 기사 2차 섹션 이름은 매물 분류와 표기가 조금 다르다
    section2: d.isCommercial ? "상가/사무실/공장/토지" : (vacancy.property_type || "").replace(/·/g, "/"),
    keywords,
  };
}
