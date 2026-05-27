import React from "react";

// 카테고리 설정 데이터
export const CATEGORY_CONFIG: Record<string, { name: string; pills: string[]; basicFilters: string[]; detailFilters: string[]; showToggle: boolean; pillStyle?: string }> = {
  apart: { name: "아파트·오피스텔", pills: ["아파트", "아파트분양권", "재건축", "오피스텔", "오피스텔분양권", "재개발"], basicFilters: ["거래유형"], detailFilters: [], showToggle: false },
  villa: { name: "빌라·주택", pills: ["빌라/연립", "단독/다가구", "전원주택", "상가주택"], basicFilters: ["거래유형"], detailFilters: [], showToggle: false },
  one: { name: "원룸·투룸", pills: ["원룸", "투룸", "오피스텔만 보기"], basicFilters: ["거래유형"], detailFilters: [], showToggle: false },
  biz: { name: "상가·사무실·공장·토지", pills: ["상가", "사무실", "공장/창고", "지식산업센터", "건물", "토지"], basicFilters: ["거래유형"], detailFilters: [], showToggle: false },
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

  return [dong, bldName].filter(Boolean).join(" ");
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
  const monthlyManwon = row.monthly_rent ? Math.round(row.monthly_rent / 10000) : 0;
  return row.trade_type === "매매" ? `매매 ${formatAmount(row.deposit)}`
    : row.trade_type === "전세" ? `전세 ${formatAmount(row.deposit)}`
    : `${formatAmount(row.deposit)}/${monthlyManwon}만`;
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
