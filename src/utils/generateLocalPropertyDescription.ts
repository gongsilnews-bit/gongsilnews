/**
 * 로컬 템플릿 기반 부동산 소개글 자동 생성 유틸리티
 * - API 호출 없이 즉시 생성 (0원, ~0.01초)
 * - 주거형 / 상업형 / 토지 3가지 템플릿
 * - 톤앤매너 선택: "formal" (하십시오체) | "friendly" (해요체)
 * - 해시태그 자동 생성
 */

export type ToneType = "formal" | "friendly";

export interface PropertyDescriptionPayload {
  propertyType: string;       // "아파트·오피스텔", "빌라·주택", "원룸·투룸(풀옵션)", "상가·사무실·건물·공장·토지"
  subCategory: string;        // "아파트", "오피스텔", "상가", "사무실", "토지" 등
  tradeType: string;          // "매매", "전세", "월세"
  deposit: string;
  monthly?: string;
  maintenance?: string;
  currentFloor?: string;
  totalFloor?: string;
  exclusivePy?: string;
  supplyPy?: string;
  roomCount?: string;
  bathCount?: string;
  direction?: string;
  selectedOptions?: string[];
  parking?: string;
  moveInDate?: string;
  infrastructure?: Record<string, string[]>;
  buildingName?: string;
  dong?: string;              // 소재지 동
  sido?: string;
  sigungu?: string;
  // 상업용 특화
  ceilingHeight?: string;
  powerCapacity?: string;
  hasDriveIn?: boolean;
  hasDoorToDoor?: boolean;
  hasFreightElevator?: boolean;
  freeParkingCnt?: string;
  zoning?: string;            // 용도지역
  landPurpose?: string;       // 토지용도
  terrain?: string;           // 지형
  developmentPotential?: string;
  roadWidth?: string;
  groundFloors?: string;
  undergroundFloors?: string;
  // 중개사 정보
  realtorInfo?: {
    company?: string;
    boss?: string;
    tel?: string;
    cell?: string;
    addr?: string;
  } | null;
}

// ── 내부 헬퍼 ──

/** 금액을 읽기 좋게 변환 (예: 30000 → "3억") */
function formatPrice(val: string): string {
  if (!val) return "";
  const num = parseInt(val, 10);
  if (isNaN(num)) return val;
  if (num >= 10000) {
    const uk = Math.floor(num / 10000);
    const rest = num % 10000;
    return rest > 0 ? `${uk}억 ${rest.toLocaleString()}만원` : `${uk}억`;
  }
  return `${num.toLocaleString()}만원`;
}

/** 거래 금액 문장 */
function buildPriceSentence(data: PropertyDescriptionPayload, tone: ToneType): string {
  const f = tone === "formal";
  const deposit = formatPrice(data.deposit);

  if (data.tradeType === "매매") {
    return f
      ? `매매가는 ${deposit}으로, 주변 시세 대비 합리적인 조건으로 출회된 매물입니다.`
      : `매매가 ${deposit}으로 나온 매물이에요.`;
  }
  if (data.tradeType === "전세") {
    return f
      ? `전세가는 ${deposit}이며, 안정적인 거주를 위한 합리적인 조건입니다.`
      : `전세 ${deposit}에 거래 가능한 매물이에요.`;
  }
  // 월세
  const monthly = formatPrice(data.monthly || "");
  const maintenanceText = data.maintenance ? ` (관리비 ${data.maintenance}만원 별도)` : "";
  return f
    ? `보증금 ${deposit} / 월세 ${monthly}${maintenanceText}의 조건으로 임차가 가능합니다.`
    : `보증금 ${deposit} / 월세 ${monthly}${maintenanceText} 조건이에요.`;
}

/** 면적·구조 문장 */
function buildAreaSentence(data: PropertyDescriptionPayload, tone: ToneType): string {
  const f = tone === "formal";
  const parts: string[] = [];

  if (data.exclusivePy) {
    parts.push(`전용 ${data.exclusivePy}평${data.supplyPy ? ` (공급 ${data.supplyPy}평)` : ""}`);
  }

  const isCommercial = data.propertyType === "상가·사무실·건물·공장·토지";
  if (!isCommercial && data.roomCount) {
    parts.push(`방 ${data.roomCount}개`);
    if (data.bathCount) parts.push(`욕실 ${data.bathCount}개`);
  }

  if (data.currentFloor) {
    parts.push(`${data.currentFloor}층${data.totalFloor ? ` / 총 ${data.totalFloor}층` : ""}`);
  }

  if (data.direction) {
    parts.push(`${data.direction}향`);
  }

  if (parts.length === 0) return "";

  return f
    ? `본 매물의 면적은 ${parts.join(", ")}의 구성으로, 효율적인 공간 활용이 가능합니다.`
    : `${parts.join(", ")} 구성이라 공간 활용도가 좋아요.`;
}

/** 옵션 문장 */
function buildOptionSentence(data: PropertyDescriptionPayload, tone: ToneType): string {
  if (!data.selectedOptions || data.selectedOptions.length === 0) return "";
  const f = tone === "formal";
  const opts = data.selectedOptions.join(", ");
  return f
    ? `${opts} 등 다양한 옵션이 기본 제공되어, 별도의 비용 부담 없이 편리하게 입주하실 수 있습니다.`
    : `${opts} 등 옵션이 기본 제공되어 바로 입주할 수 있어요.`;
}

/** 인프라 문장 */
function buildInfraSentence(data: PropertyDescriptionPayload, tone: ToneType): string {
  if (!data.infrastructure || Object.keys(data.infrastructure).length === 0) return "";
  const f = tone === "formal";
  const sentences: string[] = [];

  for (const [category, items] of Object.entries(data.infrastructure)) {
    if (items.length === 0) continue;
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes("지하철") || categoryLower.includes("교통") || categoryLower.includes("버스")) {
      sentences.push(
        f
          ? `교통 면에서는 ${items.slice(0, 3).join(", ")} 등이 인접하여 뛰어난 접근성을 갖추고 있습니다.`
          : `${items.slice(0, 3).join(", ")} 등 교통이 가까워서 이동이 편리해요.`
      );
    } else if (categoryLower.includes("학교") || categoryLower.includes("교육")) {
      sentences.push(
        f
          ? `교육 환경으로는 ${items.slice(0, 3).join(", ")} 등이 위치하여 우수한 학군을 형성하고 있습니다.`
          : `${items.slice(0, 3).join(", ")} 등 학군이 가까워요.`
      );
    } else if (categoryLower.includes("편의") || categoryLower.includes("마트") || categoryLower.includes("쇼핑")) {
      sentences.push(
        f
          ? `생활 편의시설로는 ${items.slice(0, 3).join(", ")} 등이 도보권에 위치하여 편리한 생활이 가능합니다.`
          : `${items.slice(0, 3).join(", ")} 등 편의시설이 가까이 있어요.`
      );
    } else if (categoryLower.includes("병원") || categoryLower.includes("의료")) {
      sentences.push(
        f
          ? `의료 시설로는 ${items.slice(0, 3).join(", ")} 등이 가까이 위치하고 있습니다.`
          : `${items.slice(0, 3).join(", ")} 등 의료시설도 가까워요.`
      );
    } else if (categoryLower.includes("공원") || categoryLower.includes("자연")) {
      sentences.push(
        f
          ? `인근에 ${items.slice(0, 3).join(", ")} 등의 녹지공간이 조성되어 쾌적한 주거 환경을 누리실 수 있습니다.`
          : `${items.slice(0, 3).join(", ")} 등 녹지공간이 가까워서 쾌적해요.`
      );
    } else {
      sentences.push(
        f
          ? `주변 시설로 ${items.slice(0, 3).join(", ")} 등이 위치하고 있습니다.`
          : `${items.slice(0, 3).join(", ")} 등이 가까이 있어요.`
      );
    }
  }

  return sentences.join("\n");
}

/** 주차·입주일 문장 */
function buildParkingMoveInSentence(data: PropertyDescriptionPayload, tone: ToneType): string {
  const f = tone === "formal";
  const parts: string[] = [];

  if (data.parking && data.parking !== "없음") {
    parts.push(
      f
        ? `주차는 ${data.parking}이 가능합니다.`
        : `주차는 ${data.parking} 가능해요.`
    );
  }

  if (data.moveInDate) {
    parts.push(
      f
        ? `입주 가능일은 ${data.moveInDate}입니다.`
        : `${data.moveInDate}부터 입주 가능해요.`
    );
  }

  return parts.join(" ");
}

/** 상업용 특화 스펙 문장 */
function buildCommercialSpecSentence(data: PropertyDescriptionPayload, tone: ToneType): string {
  const f = tone === "formal";
  const specs: string[] = [];

  if (data.ceilingHeight) specs.push(`천장고 ${data.ceilingHeight}m`);
  if (data.powerCapacity) specs.push(`전력 ${data.powerCapacity}kW`);
  if (data.hasDriveIn) specs.push("드라이브인");
  if (data.hasDoorToDoor) specs.push("도어투도어");
  if (data.hasFreightElevator) specs.push("화물용 엘리베이터");
  if (data.freeParkingCnt) specs.push(`무료주차 ${data.freeParkingCnt}대`);

  if (specs.length === 0) return "";

  return f
    ? `특화 사양으로 ${specs.join(", ")}을 갖추고 있어 업무 및 사업 운영에 최적화된 환경입니다.`
    : `${specs.join(", ")} 등 사양을 갖추고 있어 업무에 최적이에요.`;
}

/** 토지 특화 문장 */
function buildLandSpecSentence(data: PropertyDescriptionPayload, tone: ToneType): string {
  const f = tone === "formal";
  const specs: string[] = [];

  if (data.zoning) specs.push(`용도지역: ${data.zoning}`);
  if (data.landPurpose) specs.push(`토지용도: ${data.landPurpose}`);
  if (data.terrain) specs.push(`지형: ${data.terrain}`);
  if (data.developmentPotential) specs.push(`개발가능: ${data.developmentPotential}`);
  if (data.roadWidth) specs.push(`접면도로 ${data.roadWidth}m`);

  if (specs.length === 0) return "";

  return f
    ? `토지 상세 정보로는 ${specs.join(", ")}이며, 다양한 개발 및 활용이 기대되는 입지입니다.`
    : `${specs.join(", ")} 조건을 갖춘 토지예요.`;
}

/** 중개사 클로징 멘트 */
function buildRealtorClosing(data: PropertyDescriptionPayload, tone: ToneType): string {
  const r = data.realtorInfo;
  if (!r || !r.company) return "";
  const f = tone === "formal";
  const contact = r.cell || r.tel || "";
  return f
    ? `${r.company}은(는) 정직과 신뢰를 바탕으로 최선을 다하고 있습니다. 궁금하신 사항이 있으시면 언제든 ${contact ? contact + "으로 " : ""}편하게 연락 주십시오.`
    : `${r.company}에서 정성껏 안내해 드릴게요. 궁금한 점은 ${contact ? contact + "로 " : ""}편하게 연락 주세요!`;
}

/** 해시태그 자동 생성 */
function buildHashtags(data: PropertyDescriptionPayload): string {
  const tags: string[] = [];

  // 매물 유형 태그
  if (data.subCategory) tags.push(`#${data.subCategory.replace(/[\/·\s]/g, "")}`);

  // 거래 유형
  if (data.tradeType) tags.push(`#${data.tradeType}`);

  // 지역 태그
  if (data.dong) tags.push(`#${data.dong}`);
  if (data.sigungu && data.sigungu !== data.dong) tags.push(`#${data.sigungu}`);

  // 방향
  if (data.direction) {
    if (data.direction.includes("남")) tags.push("#남향");
    else tags.push(`#${data.direction}향`);
  }

  // 옵션 관련
  if (data.selectedOptions && data.selectedOptions.length >= 3) {
    tags.push("#풀옵션");
  }

  // 인프라 관련
  if (data.infrastructure) {
    for (const [cat, items] of Object.entries(data.infrastructure)) {
      const catL = cat.toLowerCase();
      if ((catL.includes("지하철") || catL.includes("교통")) && items.length > 0) {
        tags.push("#역세권");
        if (items.length >= 2) tags.push("#더블역세권");
      }
      if ((catL.includes("학교") || catL.includes("교육")) && items.length > 0) {
        tags.push("#학군우수");
      }
    }
  }

  // 입주
  if (data.moveInDate?.includes("즉시")) tags.push("#즉시입주");
  if (data.moveInDate?.includes("공실")) tags.push("#공실");

  // 주차
  if (data.parking && data.parking !== "없음") tags.push("#주차가능");

  // 상업용 특화
  if (data.ceilingHeight) tags.push("#고천장");
  if (data.hasDriveIn) tags.push("#드라이브인");

  // 건물명
  if (data.buildingName) tags.push(`#${data.buildingName.replace(/\s/g, "")}`);

  // 중복 제거 & 최대 8개
  const uniqueTags = [...new Set(tags)];
  return uniqueTags.slice(0, 8).join(" ");
}

// ── 메인 생성 함수 ──

export function generateLocalPropertyDescription(
  data: PropertyDescriptionPayload,
  tone: ToneType = "formal"
): string {
  const f = tone === "formal";
  const isLand = data.subCategory === "토지";
  const isCommercial = data.propertyType === "상가·사무실·건물·공장·토지";
  // ── 그룹1: 물건요약 (인트로 + 가격 + 면적 + 특화스펙 + 옵션) ──
  const group1: string[] = [];

  // 인트로 (위치 + 유형)
  const locationParts: string[] = [];
  if (data.sigungu) locationParts.push(data.sigungu);
  if (data.dong) locationParts.push(data.dong);
  const locationStr = locationParts.join(" ") || "";
  const buildingStr = data.buildingName ? ` ${data.buildingName}` : "";

  if (isLand) {
    group1.push(
      f
        ? `${locationStr}${buildingStr} 일대에 위치한 ${data.subCategory} 매물을 소개해 드리겠습니다.`
        : `${locationStr}${buildingStr} 일대 ${data.subCategory} 매물을 소개해 드릴게요!`
    );
  } else if (isCommercial) {
    group1.push(
      f
        ? `${locationStr}${buildingStr}에 위치한 ${data.subCategory} ${data.tradeType} 매물을 안내해 드리겠습니다.`
        : `${locationStr}${buildingStr}에 위치한 ${data.subCategory} ${data.tradeType} 매물을 안내해 드릴게요!`
    );
  } else {
    group1.push(
      f
        ? `${locationStr}${buildingStr}에 위치한 ${data.subCategory} ${data.tradeType} 매물을 소개해 드리겠습니다.`
        : `${locationStr}${buildingStr}의 ${data.subCategory} ${data.tradeType} 매물을 소개할게요!`
    );
  }

  const priceSentence = buildPriceSentence(data, tone);
  if (priceSentence) group1.push(priceSentence);

  const areaSentence = buildAreaSentence(data, tone);
  if (areaSentence) group1.push(areaSentence);

  if (isLand) {
    const landSpec = buildLandSpecSentence(data, tone);
    if (landSpec) group1.push(landSpec);
  } else if (isCommercial) {
    const commercialSpec = buildCommercialSpecSentence(data, tone);
    if (commercialSpec) group1.push(commercialSpec);
  }

  const optionSentence = buildOptionSentence(data, tone);
  if (optionSentence) group1.push(optionSentence);

  // ── 그룹2: 주변환경/인프라 ──
  const infraSentence = buildInfraSentence(data, tone);

  // ── 그룹3: 주차·입주일 ──
  const parkingMoveIn = buildParkingMoveInSentence(data, tone);

  // ── 그룹4: 중개사 클로징 ──
  const realtorClosing = buildRealtorClosing(data, tone);

  // ── 그룹5: 해시태그 ──
  const hashtags = buildHashtags(data);

  // ── 조립: 그룹 내부는 \n(줄바꿈만), 그룹 사이는 \n\n(빈줄 1개) ──
  const groups: string[] = [];

  if (group1.length > 0) groups.push(group1.join("\n"));
  if (infraSentence) groups.push(infraSentence); // 인프라 내부는 이미 \n으로 연결됨
  if (parkingMoveIn) groups.push(parkingMoveIn);
  if (realtorClosing) groups.push(realtorClosing);
  if (hashtags) groups.push(hashtags);

  return groups.join("\n\n");
}
