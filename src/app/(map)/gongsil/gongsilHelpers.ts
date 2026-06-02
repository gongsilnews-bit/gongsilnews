import React from "react";

// 카테고리 설정 데이터
export const CATEGORY_CONFIG: Record<string, { name: string; pills: string[]; basicFilters: string[]; detailFilters: string[]; showToggle: boolean; pillStyle?: string }> = {
  apart: { name: "아파트·오피스텔", pills: ["아파트", "오피스텔", "기타"], basicFilters: ["거래유형"], detailFilters: [], showToggle: false },
  villa: { name: "빌라·주택", pills: ["빌라/연립", "단독/다가구", "전원주택"], basicFilters: ["거래유형"], detailFilters: [], showToggle: false },
  one: { name: "원룸·투룸(풀옵션)", pills: ["원룸", "1.5룸", "투룸", "오피스텔만 보기"], basicFilters: ["거래유형"], detailFilters: [], showToggle: false },
  biz: { name: "상가·사무실·공장·토지", pills: ["상가", "사무실", "건물/빌딩", "공장/창고", "토지"], basicFilters: ["거래유형"], detailFilters: [], showToggle: false },
  sale: { name: "신축/분양", pills: ["아파트", "오피스텔", "빌라", "도시형생활주택", "생활숙박시설", "상가/업무"], basicFilters: ["거래유형"], detailFilters: [], showToggle: false },
  auction: { name: "경매/공매", pills: ["아파트", "단독/다가구", "빌라/주택", "빌딩/사무실", "공장/창고", "토지"], basicFilters: ["거래유형"], detailFilters: [], showToggle: false },
  wish: { name: "MY관심공실", pills: [], basicFilters: [], detailFilters: [], showToggle: false },
};

// 카테고리 키 → DB property_type 매핑
export const CATEGORY_TO_PROPERTY_TYPE: Record<string, string> = {
  apart: "아파트·오피스텔",
  villa: "빌라·주택",
  one: "원룸·투룸(풀옵션)",
  biz: "상가·사무실·건물·공장·토지",
  sale: "분양",
};

// 가격 그리드 버튼 (네이버 부동산 스타일, 단위: 원)
export const PRICE_GRID = [
  { label: "1천", val: 10000000 }, { label: "3천", val: 30000000 }, { label: "5천", val: 50000000 },
  { label: "1억", val: 100000000 }, { label: "2억", val: 200000000 }, { label: "3억", val: 300000000 },
  { label: "4억", val: 400000000 }, { label: "5억", val: 500000000 }, { label: "6억", val: 600000000 },
  { label: "7억", val: 700000000 }, { label: "8억", val: 800000000 }, { label: "9억", val: 900000000 },
  { label: "10억", val: 1000000000 }, { label: "12억", val: 1200000000 }, { label: "15억", val: 1500000000 },
  { label: "20억", val: 2000000000 }, { label: "30억", val: 3000000000 }, { label: "30억~", val: -1 },
];

// 면적 그리드 버튼 (평 단위, 내부에서 ㎡로 환산)
export const AREA_GRID = [
  { label: "10평", m2: 33 }, { label: "20평", m2: 66 }, { label: "30평", m2: 99 }, { label: "40평", m2: 132 },
  { label: "50평", m2: 165 }, { label: "60평", m2: 198 }, { label: "70평", m2: 231 }, { label: "80평", m2: 264 },
  { label: "100평", m2: 330 }, { label: "150평", m2: 495 }, { label: "200평", m2: 660 },
  { label: "300평", m2: 990 }, { label: "500평", m2: 1650 }, { label: "500평~", m2: -1 },
];

// 사용승인일 그리드 (연도 단위, 1960~2026)
export const YEAR_GRID = (() => {
  const years: { label: string; val: number }[] = [];
  for (let y = 1960; y <= 2026; y += 5) {
    years.push({ label: `${y}년`, val: y });
  }
  if (years.length === 0 || years[years.length - 1].val !== 2026) years.push({ label: "2026년", val: 2026 });
  return years;
})();

// 세대수 그리드 (50~4000)
export const UNIT_GRID = [
  { label: "50세대", val: 50 }, { label: "100세대", val: 100 }, { label: "200세대", val: 200 },
  { label: "300세대", val: 300 }, { label: "500세대", val: 500 }, { label: "700세대", val: 700 },
  { label: "1000세대", val: 1000 }, { label: "1500세대", val: 1500 }, { label: "2000세대", val: 2000 },
  { label: "2500세대", val: 2500 }, { label: "3000세대", val: 3000 }, { label: "4000세대", val: 4000 },
];

// 관리비 프리셋 (원)
export const MAINT_PRESETS = [
  { label: "전체", min: 0, max: Infinity },
  { label: "5만 이하", min: 0, max: 50000 },
  { label: "5~10만", min: 50000, max: 100000 },
  { label: "10~20만", min: 100000, max: 200000 },
  { label: "20~30만", min: 200000, max: 300000 },
  { label: "30만 이상", min: 300000, max: Infinity },
];

// 온비드 경공매 물건과 일반 매물의 주소/건물명 중복을 방지하여 깔끔한 타이틀을 반환하는 헬퍼 함수
export const getCleanAddrText = (prop: any) => {
  if (!prop) return "";
  const bldName = prop.building_name || "";
  const dong = prop.dong || "";

  if (prop.trade_type === "경매") {
    return bldName;
  }

  const propType = prop.property_type || "";
  const subCategory = prop.sub_category || "";
  const isApt = ["아파트", "오피스텔", "도시형생활주택"].some(t => propType.includes(t) || subCategory.includes(t));

  if (isApt) {
    // 아파트/오피스텔: 동 + sub_category + 건물명 (예: 논현동 아파트 아크로힐스논현)
    return [dong, subCategory, bldName].filter(Boolean).join(" ");
  }

  // 그 외: 동 + sub_category (예: 논현동 사무실)
  return [dong, subCategory].filter(Boolean).join(" ") || "공실 매물";
};

// 온비드 경공매 물건의 세부 카테고리 정보 및 면적을 안전하게 분석하는 헬퍼 함수
export const getAuctionInfo = (prop: any) => {
  if (!prop) return { category: "공매", badge: "공매", area: "" };

  let meta = prop.metadata || {};
  if (typeof meta === 'string') {
    try {
      meta = JSON.parse(meta);
    } catch {
      meta = {};
    }
  }

  let scls = meta.cltrUsgSclsCtgrNm || "";
  let mcls = meta.cltrUsgMclsCtgrNm || "";
  let bldName = prop.building_name || "";
  let propType = prop.property_type || "";

  let category = "";
  if (scls) {
    category = scls;
  } else if (mcls) {
    category = mcls;
  } else {
    if (propType === "아파트·오피스텔") {
      category = bldName.includes("오피스텔") ? "오피스텔" : "아파트";
    } else if (propType === "빌라·주택") {
      if (bldName.includes("단독") || bldName.includes("다가구")) category = "단독주택";
      else if (bldName.includes("다세대") || bldName.includes("연립")) category = "다세대주택";
      else category = "빌라/주택";
    } else {
      if (bldName.includes("토지") || bldName.includes("전") || bldName.includes("답") || bldName.includes("임야") || bldName.includes("대지") || bldName.includes("잡종지")) {
        if (bldName.includes("임야")) category = "임야";
        else if (bldName.includes("전")) category = "전";
        else if (bldName.includes("답")) category = "답";
        else if (bldName.includes("대지")) category = "대지";
        else category = "토지";
      } else if (bldName.includes("공장") || bldName.includes("창고") || bldName.includes("제조")) {
        category = bldName.includes("창고") ? "창고" : "공장";
      } else if (bldName.includes("사무") || bldName.includes("사무실") || bldName.includes("지산") || bldName.includes("오피스")) {
        category = "사무실";
      } else if (bldName.includes("빌딩") || bldName.includes("근생") || bldName.includes("근린") || bldName.includes("숙박") || bldName.includes("의료") || bldName.includes("콘도") || bldName.includes("리조트")) {
        if (bldName.includes("근생") || bldName.includes("근린")) category = "근린생활시설";
        else if (bldName.includes("콘도") || bldName.includes("리조트") || bldName.includes("호텔")) category = "숙박시설";
        else category = "빌딩";
      } else {
        category = "상가/점포";
      }
    }
  }

  if (category === "상가·사무실·건물·공장·토지") {
    category = "상업용";
  }

  if (["상가/점포", "사무실/지산", "빌딩/근생", "근린생활시설", "숙박시설", "빌딩", "사무실"].includes(category)) {
    category = "빌딩/사무실";
  }

  const areaVal = meta.bldSqms || meta.cltrAr || prop.exclusive_m2;
  const areaText = areaVal ? `${parseFloat(areaVal).toLocaleString()}㎡` : "";

  return {
    category,
    badge: `${category} 공매`,
    area: areaText
  };
};

export const formatAmount = (amt: number) => {
  if (!amt) return "";
  const m = Math.round(amt / 10000);
  if (m === 0) return "";

  const e = Math.floor(m / 10000);
  const r = m % 10000;

  let result = "";
  if (e > 0) {
    result += `${e}억`;
  }

  if (r > 0) {
    const c = Math.floor(r / 1000);
    const rem = r % 1000;
    let rest = "";
    if (c > 0) rest += `${c}천`;
    if (rem > 0) rest += `${rem}`;
    result += (result ? " " : "") + rest + "만";
  }

  return result || "";
};

export const getPriceText = (row: any) => {
  if (!row) return "";
  if (row.trade_type === "경매") {
    const meta = row.metadata || {};
    const appraisalPrice = meta.appraisal_price || parseInt(meta.apslEvlAmt || "0", 10) || (row.deposit && row.deposit > 100000 ? row.deposit : (row.deposit || 0) * 10000);
    const lowestBidPrice = meta.lowest_bid_price || parseInt(meta.lowstBidPrcIndctCont || "0", 10) || 0;
    const displayPrice = lowestBidPrice > 0 ? lowestBidPrice : appraisalPrice;
    return `경매 ${formatAmount(displayPrice)}`;
  }
  const monthlyManwon = row.monthly_rent ? Math.round(row.monthly_rent / 10000) : 0;
  return row.trade_type === "매매" ? `매매 ${formatAmount(row.deposit)}`
    : row.trade_type === "전세" ? `전세 ${formatAmount(row.deposit)}`
    : `${row.trade_type || '월세'} ${formatAmount(row.deposit)}/${monthlyManwon}만`;
};

// 집합건물 판별 헬퍼
export const isApartmentType = (type: string | undefined) =>
  ['아파트', '오피스텔', '아파트분양권', '오피스텔분양권'].some(t => type?.includes(t));

// 숫자 크기(매물 밀집도)에 따라 마커의 버블 크기와 폰트 크기를 다이내믹하게 결정하는 헬퍼 함수
export const getMarkerDimensions = (count: number) => {
  if (count === 1) {
    return { size: 38, radius: 17, fontSize: 13 };
  } else if (count < 10) {
    return { size: 44, radius: 20, fontSize: 14 };
  } else if (count < 100) {
    return { size: 50, radius: 23, fontSize: 15 };
  } else {
    return { size: 58, radius: 27, fontSize: 17 };
  }
};

// 가격 및 원형 마커 SVG를 줌 레벨과 밀집도에 따라 동적 생성하는 헬퍼 함수
export const getMarkerSvg = (prop: any, group: any[], isSelected: boolean, isZoomedIn: boolean, isAuctionMode: boolean, isHover: boolean = false) => {
  const overlappingCount = group.length;
  const color = isAuctionMode ? "%231a73e8" : "%234b89ff";
  const textVal = overlappingCount.toString();
  const { size, radius, fontSize } = getMarkerDimensions(overlappingCount);

  const svgSize = isHover ? size + 6 : size;
  const center = svgSize / 2;
  const finalRadius = isHover ? radius + 3 : radius;
  const finalFontSize = isHover ? fontSize + 1 : fontSize;

  if (isHover) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}"><circle cx="${center}" cy="${center}" r="${finalRadius}" fill="${color}" stroke="white" stroke-width="2"/><text x="50%25" y="50%25" dy="1px" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="${finalFontSize}" font-weight="bold" font-family="sans-serif">${textVal}</text></svg>`;
  } else {
    if (isSelected) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}"><circle cx="${center}" cy="${center}" r="${finalRadius}" fill="white" stroke="${color}" stroke-width="2"/><text x="50%25" y="50%25" dy="1px" text-anchor="middle" dominant-baseline="middle" fill="${color}" font-size="${finalFontSize}" font-weight="bold" font-family="sans-serif">${textVal}</text></svg>`;
    } else {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}"><circle cx="${center}" cy="${center}" r="${finalRadius}" fill="${color}" stroke="white" stroke-width="2"/><text x="50%25" y="50%25" dy="1px" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="${finalFontSize}" font-weight="bold" font-family="sans-serif">${textVal}</text></svg>`;
    }
  }
};

export const getOptionSvg = (name: string) => {
  if (name.includes("에어컨")) return React.createElement("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "#222", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" },
    React.createElement("path", { d: "M4 8h16v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z" }),
    React.createElement("line", { x1: "8", y1: "16", x2: "8", y2: "20" }),
    React.createElement("line", { x1: "16", y1: "16", x2: "16", y2: "20" }),
    React.createElement("line", { x1: "12", y1: "16", x2: "12", y2: "21" }),
    React.createElement("path", { d: "M4 8V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2" })
  );
  if (name.includes("싱크대") || name.includes("주방")) return React.createElement("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "#222", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" },
    React.createElement("rect", { x: "3", y: "10", width: "18", height: "10", rx: "2" }),
    React.createElement("path", { d: "M8 10V6a2 2 0 0 1 4-2a2 2 0 0 1 4 2v4" }),
    React.createElement("line", { x1: "12", y1: "10", x2: "12", y2: "20" }),
    React.createElement("line", { x1: "6", y1: "10", x2: "6", y2: "20" }),
    React.createElement("line", { x1: "18", y1: "10", x2: "18", y2: "20" })
  );
  if (name.includes("옷장") || name.includes("붙박이장")) return React.createElement("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "#222", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" },
    React.createElement("rect", { x: "4", y: "4", width: "16", height: "16", rx: "2" }),
    React.createElement("line", { x1: "12", y1: "4", x2: "12", y2: "20" }),
    React.createElement("rect", { x: "8", y: "10", width: "1", height: "4" }),
    React.createElement("rect", { x: "15", y: "10", width: "1", height: "4" })
  );
  if (name.includes("TV") || name.includes("티비")) return React.createElement("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "#222", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" },
    React.createElement("rect", { x: "2", y: "7", width: "20", height: "15", rx: "2", ry: "2" }),
    React.createElement("polyline", { points: "17 2 12 7 7 2" })
  );
  if (name.includes("세탁기")) return React.createElement("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "#222", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" },
    React.createElement("rect", { x: "5", y: "3", width: "14", height: "18", rx: "2" }),
    React.createElement("circle", { cx: "12", cy: "13", r: "4" }),
    React.createElement("line", { x1: "8", y1: "6", x2: "10", y2: "6" })
  );
  if (name.includes("침대")) return React.createElement("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "#222", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" },
    React.createElement("path", { d: "M2 4v16" }),
    React.createElement("path", { d: "M2 8h18a2 2 0 0 1 2 2v10" }),
    React.createElement("path", { d: "M2 17h20" }),
    React.createElement("path", { d: "M6 8v9" })
  );
  if (name.includes("냉장고")) return React.createElement("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "#222", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" },
    React.createElement("rect", { x: "5", y: "2", width: "14", height: "20", rx: "2" }),
    React.createElement("line", { x1: "5", y1: "10", x2: "19", y2: "10" }),
    React.createElement("line", { x1: "9", y1: "5", x2: "9", y2: "8" }),
    React.createElement("line", { x1: "9", y1: "13", x2: "9", y2: "16" })
  );
  if (name.includes("보안") || name.includes("도어락")) return React.createElement("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "#222", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" },
    React.createElement("rect", { x: "3", y: "11", width: "18", height: "11", rx: "2", ry: "2" }),
    React.createElement("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" })
  );
  if (name.includes("주차")) return React.createElement("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "#222", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" },
    React.createElement("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2", ry: "2" }),
    React.createElement("path", { d: "M9 17V7h4a3 3 0 0 1 0 6H9" })
  );
  return React.createElement("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "#222", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" },
    React.createElement("path", { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" }),
    React.createElement("polyline", { points: "22 4 12 14.01 9 11.01" })
  );
};

export const getMaskedAddress = (prop: any) => {
  if (!prop) return "";
  const sido = prop.sido || "";
  const sigungu = prop.sigungu || "";
  const dong = prop.dong || "";
  const detailAddr = prop.detail_addr || "";

  if (prop.trade_type === "경매") {
    return [sido, sigungu, dong, detailAddr].filter(Boolean).join(" ");
  }

  const exp = prop.address_exposure;
  const propType = prop.property_type || "";
  const subCategory = prop.sub_category || "";
  const isApt = ["아파트", "오피스텔", "도시형생활주택"].some(t => propType.includes(t) || subCategory.includes(t));

  if (!exp || exp === "번지공개" || exp === "지번공개" || exp === "동/호수공개") {
    return [sido, sigungu, dong, detailAddr].filter(Boolean).join(" ");
  }

  if (exp === "비공개") {
    if (isApt) {
      const bldName = prop.building_name || "";
      return [sido, sigungu, dong, bldName].filter(Boolean).join(" ");
    } else {
      return `${[sido, sigungu, dong].filter(Boolean).join(" ")} (상세주소 비공개)`;
    }
  }

  if (exp === "기본주소만공개") {
    return [sido, sigungu, dong].filter(Boolean).join(" ");
  }

  if (exp === "본번지만공개") {
    let baseAddr = [sido, sigungu, dong].filter(Boolean).join(" ");
    if (detailAddr) {
      const match = detailAddr.match(/^([0-9\-\s가-힣]+)/);
      if (match) {
        const numPart = match[1].trim();
        const mainNum = numPart.split("-")[0].trim();
        if (mainNum) {
          return `${baseAddr} ${mainNum} 일대`;
        }
      }
    }
    return `${baseAddr} 일대`;
  }

  if (exp === "동수공개") {
    let baseAddr = [sido, sigungu, dong].filter(Boolean).join(" ");
    const bldName = prop.building_name || "";
    let aptPart = bldName;

    if (detailAddr) {
      const match = detailAddr.match(/(\d+동)/);
      if (match) {
        aptPart = [bldName, match[1]].filter(Boolean).join(" ");
      }
    }
    return [baseAddr, aptPart].filter(Boolean).join(" ");
  }

  return [sido, sigungu, dong, detailAddr].filter(Boolean).join(" ");
};

interface SubwayStation {
  name: string;
  lat: number;
  lng: number;
}

const SUBWAY_STATIONS: SubwayStation[] = [
  // 강남구
  { name: "강남역", lat: 37.497942, lng: 127.027621 },
  { name: "역삼역", lat: 37.500622, lng: 127.036461 },
  { name: "선릉역", lat: 37.504503, lng: 127.049008 },
  { name: "삼성역", lat: 37.508844, lng: 127.06316 },
  { name: "논현역", lat: 37.511093, lng: 127.021415 },
  { name: "신논현역", lat: 37.504598, lng: 127.02525 },
  { name: "학동역", lat: 37.514229, lng: 127.031656 },
  { name: "언주역", lat: 37.507278, lng: 127.033878 },
  { name: "선정릉역", lat: 37.510297, lng: 127.043958 },
  { name: "삼성중앙역", lat: 37.513011, lng: 127.053282 },
  { name: "봉은사역", lat: 37.514219, lng: 127.060232 },
  { name: "신사역", lat: 37.516334, lng: 127.020114 },
  { name: "압구정역", lat: 37.527072, lng: 127.028461 },
  { name: "압구정로데오역", lat: 37.527381, lng: 127.040546 },
  { name: "청담역", lat: 37.519097, lng: 127.051897 },
  { name: "강남구청역", lat: 37.517179, lng: 127.041243 },
  { name: "학여울역", lat: 37.496587, lng: 127.072899 },
  { name: "대청역", lat: 37.493968, lng: 127.079529 },
  { name: "일원역", lat: 37.483679, lng: 127.08439 },
  { name: "수서역", lat: 37.487258, lng: 127.101168 },
  { name: "매봉역", lat: 37.486899, lng: 127.046779 },
  { name: "도곡역", lat: 37.490847, lng: 127.055377 },
  { name: "대치역", lat: 37.494612, lng: 127.063642 },
  { name: "한티역", lat: 37.496237, lng: 127.052873 },
  { name: "구룡역", lat: 37.486835, lng: 127.059434 },
  { name: "개포동역", lat: 37.489116, lng: 127.06614 },
  { name: "대모산입구역", lat: 37.491373, lng: 127.072725 },

  // 서초구
  { name: "양재역", lat: 37.484147, lng: 127.034631 },
  { name: "양재시민의숲역", lat: 37.470023, lng: 127.038483 },
  { name: "방배역", lat: 37.481426, lng: 126.997596 },
  { name: "서초역", lat: 37.491897, lng: 127.007917 },
  { name: "교대역", lat: 37.493415, lng: 127.014227 },
  { name: "고속터미널역", lat: 37.50481, lng: 127.004944 },
  { name: "신반포역", lat: 37.503415, lng: 126.995924 },
  { name: "구반포역", lat: 37.501365, lng: 126.987332 },
  { name: "사평역", lat: 37.504245, lng: 127.015252 },
  { name: "잠원역", lat: 37.512759, lng: 127.01122 },
  { name: "반포역", lat: 37.508178, lng: 127.01173 },
  { name: "내방역", lat: 37.487618, lng: 126.993077 },
  { name: "이수역", lat: 37.486263, lng: 126.981977 },
  { name: "남태령역", lat: 37.463863, lng: 126.989182 },

  // 송파구
  { name: "잠실역", lat: 37.513262, lng: 127.100159 },
  { name: "잠실나루역", lat: 37.520684, lng: 127.103788 },
  { name: "신천역", lat: 37.511612, lng: 127.083434 },
  { name: "종합운동장역", lat: 37.510986, lng: 127.073617 },
  { name: "석촌역", lat: 37.505431, lng: 127.109873 },
  { name: "송파역", lat: 37.499709, lng: 127.112187 },
  { name: "가락시장역", lat: 37.492264, lng: 127.118335 },
  { name: "문정역", lat: 37.485854, lng: 127.122228 },
  { name: "장지역", lat: 37.478225, lng: 127.126394 },
  { name: "거여역", lat: 37.493105, lng: 127.143926 },
  { name: "마천역", lat: 37.49499, lng: 127.152781 },
  { name: "오금역", lat: 37.502162, lng: 127.128111 },
  { name: "방이역", lat: 37.508548, lng: 127.126435 },
  { name: "올림픽공원역", lat: 37.516078, lng: 127.130838 },
  { name: "한성백제역", lat: 37.516812, lng: 127.116772 },
  { name: "송파나루역", lat: 37.509831, lng: 127.112444 },
  { name: "석촌고분역", lat: 37.502444, lng: 127.096772 },
  { name: "삼전역", lat: 37.505312, lng: 127.087431 },

  // 성동구 / 광진구
  { name: "성수역", lat: 37.544581, lng: 127.055961 },
  { name: "뚝섬역", lat: 37.547184, lng: 127.047367 },
  { name: "한양대역", lat: 37.555273, lng: 127.043655 },
  { name: "왕십리역", lat: 37.561533, lng: 127.037554 },
  { name: "건대입구역", lat: 37.540693, lng: 127.07023 },
  { name: "구의역", lat: 37.537077, lng: 127.085916 },
  { name: "강변역", lat: 37.535095, lng: 127.094678 },

  // 마포구 / 용산구
  { name: "홍대입구역", lat: 37.557527, lng: 126.924466 },
  { name: "합정역", lat: 37.549463, lng: 126.913753 },
  { name: "망원역", lat: 37.555979, lng: 126.910129 },
  { name: "신촌역", lat: 37.555184, lng: 126.936893 },
  { name: "이대역", lat: 37.556733, lng: 126.946007 },
  { name: "아현역", lat: 37.557402, lng: 126.956115 },
  { name: "공덕역", lat: 37.54322, lng: 126.951564 },
  { name: "마포역", lat: 37.539316, lng: 126.945892 },
  { name: "삼각지역", lat: 37.534571, lng: 126.973121 },
  { name: "신용산역", lat: 37.529141, lng: 126.967888 },
  { name: "용산역", lat: 37.529849, lng: 126.964821 },
  { name: "이태원역", lat: 37.534446, lng: 126.994301 },
  { name: "녹사평역", lat: 37.534678, lng: 126.986681 },
  { name: "한강진역", lat: 37.539611, lng: 127.001712 },
  { name: "한남역", lat: 37.529444, lng: 127.009122 },

  // 영등포구 / 여의도
  { name: "여의도역", lat: 37.521742, lng: 126.924294 },
  { name: "여의나루역", lat: 37.527123, lng: 126.932901 },
  { name: "국회의사당역", lat: 37.528114, lng: 126.917882 },
  { name: "샛강역", lat: 37.517228, lng: 126.928424 },
  { name: "당산역", lat: 37.534957, lng: 126.902237 },
  { name: "영등포구청역", lat: 37.52497, lng: 126.89595 },
  { name: "영등포역", lat: 37.515779, lng: 126.9073 },
  { name: "신풍역", lat: 37.500057, lng: 126.909895 },
];

export const getNearestSubwayStation = (lat: number, lng: number) => {
  let minDistance = Infinity;
  let nearest = SUBWAY_STATIONS[0];

  for (const station of SUBWAY_STATIONS) {
    const dy = station.lat - lat;
    const dx = station.lng - lng;
    const dist = dy * dy + dx * dx;
    if (dist < minDistance) {
      minDistance = dist;
      nearest = station;
    }
  }

  if (minDistance > 0.001) {
    const seed = Math.sin(lat) * Math.cos(lng);
    const offsetLat = (seed * 1000 % 1) * 0.003;
    const offsetLng = (seed * 2000 % 1) * 0.003;
    return { lat: lat + offsetLat, lng: lng + offsetLng };
  }

  return { lat: nearest.lat, lng: nearest.lng };
};

export const getJitteredCoords = (prop: any, isZoomedIn: boolean = true) => {
  if (!prop || !prop.lat || !prop.lng) return { lat: 0, lng: 0 };

  const exp = prop.address_exposure;
  const propType = prop.property_type || "";
  const subCategory = prop.sub_category || "";
  const isApt = ["아파트", "오피스텔", "도시형생활주택"].some(t => propType.includes(t) || subCategory.includes(t));
  const isPrivateAddr = exp && exp !== "번지공개" && exp !== "지번공개" && exp !== "동/호수공개";

  if (isPrivateAddr && !isApt) {
    return getNearestSubwayStation(prop.lat, prop.lng);
  }

  return { lat: prop.lat, lng: prop.lng };
};
