"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { FilterState, filterVacanciesList } from "./filters/useVacancyFilters";
import LocationFilterPanel from "./filters/LocationFilterPanel";
import PropertyTypeFilterPanel from "./filters/PropertyTypeFilterPanel";
import TradeTypeFilterPanel from "./filters/TradeTypeFilterPanel";
import PriceFilterPanel from "./filters/PriceFilterPanel";
import AreaFilterPanel from "./filters/AreaFilterPanel";
import { 
  FloorFilterPanel, 
  YearFilterPanel, 
  OwnerRoleFilterPanel, 
  CommissionFilterPanel, 
  ThemeFilterPanel,
  RoomBathFilterPanel,
  DirectionFilterPanel,
  UnitsFilterPanel,
  MaintFilterPanel,
  ParkingFilterPanel,
  OptionsFilterPanel,
  AuctionAppraisalFilterPanel,
  AuctionBidPriceFilterPanel,
  AuctionDiscountFilterPanel,
  AuctionBidCountFilterPanel,
  AuctionStartDateFilterPanel
} from "./filters/SubFilterPanels";

interface MobileFilterBarProps {
  vacancies: any[];
  filteredCount: number;
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  onLocationMove: (lat: number, lng: number, zoom: number) => void;
  onShowList?: (mode?: "map" | "filter") => void;
  kakaoMapRef: React.MutableRefObject<any>;
  locLabel: string;
  setLocLabel: React.Dispatch<React.SetStateAction<string>>;
  activeMode?: "공실" | "경매";
}

const TRADE_TYPES = ["매매", "전세", "월세", "단기"];

const RESIDENTIAL_TYPES = ["아파트", "오피스텔", "기타", "빌라/연립", "단독/다가구", "전원주택", "원룸", "1.5룸", "투룸", "빌라/주택"];
const COMMERCIAL_TYPES = ["상가", "사무실", "지식산업센터", "건물/빌딩", "공장/창고", "빌딩/사무실"];
const LAND_TYPES = ["토지"];

const RESIDENTIAL_THEMES = ['급매', '추천공실광고', '신축급', '올수리', '한강뷰', '역세권', '풀옵션', '가성비', '단기임대', '주차편리', '대로변안전', '여성안심', '애완견가능', '복층', '마당있음', '투자용'];
const COMMERCIAL_THEMES = ['급매', '추천공실광고', '신축급', '올수리', '역세권', '가성비', '주차편리', '무권리', '코너자리', '유동인구많음', '인테리어잘됨', '층고높음', '테라스', '투자용'];
const LAND_THEMES = ['급매', '추천공실광고', '가성비', '투자용'];

const getSelectedGroup = (propertyTypes: string[]) => {
  if (propertyTypes.length === 0) return "NONE";
  const hasResidential = propertyTypes.some(t => RESIDENTIAL_TYPES.includes(t));
  const hasCommercial = propertyTypes.some(t => COMMERCIAL_TYPES.includes(t));
  const hasLand = propertyTypes.some(t => LAND_TYPES.includes(t));
  
  let groupCount = 0;
  if (hasResidential) groupCount++;
  if (hasCommercial) groupCount++;
  if (hasLand) groupCount++;
  
  if (groupCount > 1) return "MIXED";
  if (hasResidential) return "RESIDENTIAL";
  if (hasCommercial) return "COMMERCIAL";
  if (hasLand) return "LAND";
  return "NONE";
};

// 🚀 [PC 동일] 카테고리별 맞춤 기타옵션 목록 생성기
const getCategoryOptions = (types: string[]) => {
  const hasApart = types.some(p => ["아파트", "오피스텔", "기타"].includes(p));
  const hasOne = types.some(p => ["원룸", "1.5룸", "투룸"].includes(p));
  const hasVilla = types.some(p => ["빌라/연립", "단독/다가구", "전원주택"].includes(p));
  const hasBiz = types.some(p => ["상가", "사무실", "지식산업센터", "건물/빌딩", "공장/창고", "토지", "빌딩/사무실"].includes(p));

  if (hasApart) {
    return ["시스템에어컨", "세탁기", "건조기", "빌트인냉장고", "식기세척기", "인덕션", "붙박이장", "침대", "TV", "비데", "도어락", "무인택배함"];
  }
  if (hasOne) {
    return ["에어컨", "세탁기", "냉장고", "가스레인지/인덕션", "전자레인지", "침대", "옷장", "책상", "신발장", "도어락"];
  }
  if (hasVilla) {
    return ["에어컨", "세탁기", "냉장고", "가스레인지/인덕션", "전자레인지", "침대", "옷장", "책상", "신발장", "도어락", "무인택배함", "CCTV", "엘리베이터"];
  }
  if (hasBiz) {
    return ["천장형에어컨", "내부화장실", "탕비실", "엘리베이터", "개별난방", "테라스", "주차가능", "창고", "환풍시설", "시스템에어컨", "호이스트", "화물엘리베이터", "동력넉넉", "높은층고(5m이상)", "마당넓음", "대형차량진입", "사무동있음", "기숙사", "크린룸"];
  }
  return ["시스템에어컨", "세탁기", "냉장고", "도어락", "엘리베이터", "주차가능"];
};

export default function MobileFilterBar({ vacancies, filteredCount, filters, onFilterChange, onLocationMove, onShowList, kakaoMapRef, locLabel, setLocLabel, activeMode }: MobileFilterBarProps) {
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [fullFilterOpen, setFullFilterOpen] = useState(false);

  // 🚀 PC GongsilClient.tsx 기준 100% 동일 대분류 & 소분류(알약) 구조
  const PROPERTY_TYPES = activeMode === "경매" ? [
    { group: "경·공매 자산유형", items: ["아파트", "단독/다가구", "빌라/주택", "빌딩/사무실", "공장/창고", "토지"] }
  ] : [
    { group: "아파트·오피스텔", items: ["아파트", "오피스텔", "기타"] },
    { group: "빌라·주택", items: ["빌라/연립", "단독/다가구", "전원주택"] },
    { group: "원룸·투룸(풀옵션)", items: ["원룸", "1.5룸", "투룸"] },
    { group: "상가·사무실·공장·토지", items: ["상가", "사무실", "지식산업센터", "건물/빌딩", "공장/창고", "토지"] },
  ];

  // Text search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Temp filters for full filter panel
  const [tempFilters, setTempFilters] = useState<FilterState>(filters);

  // 🚀 [대표님 지침] 옵션 선택 시 실시간 매물 개수 즉시 계산
  const tempFilteredCount = useMemo(() => {
    return filterVacanciesList(vacancies, tempFilters).length;
  }, [vacancies, tempFilters]);

  // 🚀 [PC 동일] 카테고리별 동적 상세 필터 조건 판별기 (전체 선택 시에는 기본 공통 조건만 노출)
  const allPropTypesList = PROPERTY_TYPES.flatMap(g => g.items);
  const isTempAll = tempFilters.propertyTypes.length >= allPropTypesList.length || tempFilters.propertyTypes.length === 0;

  const isApartmentGroup = !isTempAll && tempFilters.propertyTypes.some(p => ["아파트", "오피스텔", "기타"].includes(p));
  const isVillaGroup = !isTempAll && tempFilters.propertyTypes.some(p => ["빌라/연립", "단독/다가구", "전원주택"].includes(p));
  const isOneRoomGroup = !isTempAll && tempFilters.propertyTypes.some(p => ["원룸", "1.5룸", "투룸"].includes(p));
  const isCommercialGroup = !isTempAll && tempFilters.propertyTypes.some(p => ["상가", "사무실", "지식산업센터", "건물/빌딩", "공장/창고", "토지", "빌딩/사무실"].includes(p));

  const showTempPrice = true;
  const showTempArea = true;
  const showTempYear = isApartmentGroup || isVillaGroup;
  const showTempUnits = isApartmentGroup || (isVillaGroup && tempFilters.propertyTypes.includes("빌라/연립"));
  const showTempRoomBath = isApartmentGroup || isVillaGroup || isOneRoomGroup;
  const showTempDirection = isApartmentGroup || isVillaGroup || isOneRoomGroup;
  const showTempFloor = isCommercialGroup;
  const showTempMaint = isOneRoomGroup || isCommercialGroup;
  const showTempParking = isCommercialGroup;
  const showTempOptions = isApartmentGroup || isVillaGroup || isOneRoomGroup || isCommercialGroup;
  const showTempTheme = true;

  // 바깥 스크롤바용 판별기 (전체 선택 시에는 공통 단축 필터만 노출)
  const isExtAll = filters.propertyTypes.length >= allPropTypesList.length || filters.propertyTypes.length === 0;
  const extIsApart = !isExtAll && filters.propertyTypes.some(p => ["아파트", "오피스텔", "기타"].includes(p));
  const extIsVilla = !isExtAll && filters.propertyTypes.some(p => ["빌라/연립", "단독/다가구", "전원주택"].includes(p));
  const extIsOne = !isExtAll && filters.propertyTypes.some(p => ["원룸", "1.5룸", "투룸"].includes(p));
  const extIsBiz = !isExtAll && filters.propertyTypes.some(p => ["상가", "사무실", "지식산업센터", "건물/빌딩", "공장/창고", "토지", "빌딩/사무실"].includes(p));

  const showPricePill = true;
  const showAreaPill = true;
  const showYearPill = extIsApart || extIsVilla;
  const showUnitsPill = extIsApart || (extIsVilla && filters.propertyTypes.includes("빌라/연립"));
  const showRoomBathPill = extIsApart || extIsVilla || extIsOne;
  const showDirectionPill = extIsApart || extIsVilla || extIsOne;
  const showFloorPill = extIsBiz;
  const showMaintPill = extIsOne || extIsBiz;
  const showParkingPill = extIsBiz;
  const showOptionsPill = extIsApart || extIsVilla || extIsOne || extIsBiz;
  const showThemePill = true;

  useEffect(() => { setTempFilters(filters); }, [filters]);
  useEffect(() => { if (searchOpen && searchInputRef.current) searchInputRef.current.focus(); }, [searchOpen]);

  useEffect(() => {
    if (!filters.sido && !filters.sigungu && !filters.dong) {
      setLocLabel("위치");
    }
  }, [filters.sido, filters.sigungu, filters.dong]);

  const handleTempFilterChange = (partial: Partial<FilterState>) => {
    setTempFilters(prev => {
      const next = { ...prev, ...partial };
      if (next.sido || next.sigungu || next.dong) {
        next.locationSearchType = 'filter';
      } else {
        next.locationSearchType = 'map';
      }
      return next;
    });
  };

  const applyTextSearch = () => {
    onFilterChange({ keyword: searchText });
    setSearchOpen(false);
  };

  const hasActiveFilters = 
    filters.propertyTypes.length > 0 || 
    filters.tradeTypes.length > 0 || 
    filters.keyword !== "" ||
    filters.priceMin !== null || filters.priceMax !== null ||
    filters.areaMin !== null || filters.areaMax !== null ||
    filters.yearMin !== null || filters.yearMax !== null ||
    filters.floor !== null ||
    filters.roomCount !== null ||
    filters.bathCount !== null ||
    filters.direction !== null ||
    filters.unitsMin !== null ||
    filters.maintMax !== null ||
    filters.parking !== null ||
    filters.options.length > 0 ||
    filters.ownerRole !== null ||
    filters.commissionType !== null ||
    filters.themes.length > 0 ||
    filters.auctionAppraisalMin !== null || filters.auctionAppraisalMax !== null ||
    filters.auctionBidPriceMin !== null || filters.auctionBidPriceMax !== null ||
    filters.auctionDiscount > 0 ||
    filters.auctionBidCount > 0 ||
    (filters.auctionStartDate && filters.auctionStartDate !== "all");

  const formatPriceVal = (val: number | null) => {
    if (val === null) return "";
    if (val >= 10000) {
      const eok = Math.floor(val / 10000);
      const rem = val % 10000;
      return rem > 0 ? `${eok}억 ${rem}만` : `${eok}억`;
    }
    return `${val}만`;
  };

  const priceLabel = (() => {
    if (filters.priceMin === null && filters.priceMax === null) return "가격 ▾";
    if (filters.priceMin !== null && filters.priceMax !== null) {
      return `${formatPriceVal(filters.priceMin)} ~ ${formatPriceVal(filters.priceMax)}`;
    }
    if (filters.priceMin !== null) return `${formatPriceVal(filters.priceMin)} 이상`;
    return `${formatPriceVal(filters.priceMax)} 이하`;
  })();

  const areaLabel = (() => {
    if (filters.areaMin === null && filters.areaMax === null) return "면적 ▾";
    if (filters.areaMin !== null && filters.areaMax !== null) {
      return `${filters.areaMin}평 ~ ${filters.areaMax}평`;
    }
    if (filters.areaMin !== null) return `${filters.areaMin}평 이상`;
    return `${filters.areaMax}평 이하`;
  })();

  const yearLabel = (() => {
    if (filters.yearMin === null && filters.yearMax === null) return "연식";
    if (filters.yearMin !== null && filters.yearMax !== null) {
      return `${filters.yearMin}~${filters.yearMax}년`;
    }
    if (filters.yearMin !== null) return `${filters.yearMin}년 이후`;
    return `${filters.yearMax}년 이전`;
  })();

  const ownerLabel = (() => {
    if (filters.ownerRole === null || filters.ownerRole === 'NONE') return "등록자 ▾";
    if (filters.ownerRole === 'USER') return "일반인";
    if (filters.ownerRole === 'REALTOR') return "부동산";
    return "등록자 ▾";
  })();

  const commissionLabel = (() => {
    if (filters.commissionType === null || filters.commissionType === 'NONE') return "중개보수 ▾";
    if (filters.commissionType === '공동중개') return "공동중개";
    return `${filters.commissionType}%~`;
  })();

  const themeLabel = (() => {
    if (filters.themes.length === 0) return "테마 ▾";
    if (filters.themes.length === 1) return `#${filters.themes[0]}`;
    return `#${filters.themes[0]} +${filters.themes.length - 1}`;
  })();

  // 🔨 경매 전용 필터 라벨들 (PC 동일)
  const auctionAppraisalLabel = (() => {
    if (filters.auctionAppraisalMin === null && filters.auctionAppraisalMax === null) return "감정가 ▾";
    if (filters.auctionAppraisalMin !== null && filters.auctionAppraisalMax !== null) {
      return `${formatPriceVal(Math.round(filters.auctionAppraisalMin / 10000))}~${formatPriceVal(Math.round(filters.auctionAppraisalMax / 10000))}`;
    }
    if (filters.auctionAppraisalMin !== null) return `${formatPriceVal(Math.round(filters.auctionAppraisalMin / 10000))} 이상`;
    return `${formatPriceVal(Math.round(filters.auctionAppraisalMax / 10000))} 이하`;
  })();

  const auctionBidPriceLabel = (() => {
    if (filters.auctionBidPriceMin === null && filters.auctionBidPriceMax === null) return "최저입찰가 ▾";
    if (filters.auctionBidPriceMin !== null && filters.auctionBidPriceMax !== null) {
      return `${formatPriceVal(Math.round(filters.auctionBidPriceMin / 10000))}~${formatPriceVal(Math.round(filters.auctionBidPriceMax / 10000))}`;
    }
    if (filters.auctionBidPriceMin !== null) return `${formatPriceVal(Math.round(filters.auctionBidPriceMin / 10000))} 이상`;
    return `${formatPriceVal(Math.round(filters.auctionBidPriceMax / 10000))} 이하`;
  })();

  const auctionDiscountLabel = filters.auctionDiscount > 0 ? `할인율 ▼${filters.auctionDiscount}%↑` : "할인율 ▾";
  const auctionBidCountLabel = filters.auctionBidCount > 0 ? `유찰 ${filters.auctionBidCount}회↑` : "유찰횟수 ▾";
  const auctionStartDateLabel = (() => {
    switch (filters.auctionStartDate) {
      case "1w": return "1주 이내";
      case "2w": return "2주 이내";
      case "1m": return "1달 이내";
      case "1_3m": return "1~3개월";
      case "over_3m": return "3개월 이후";
      default: return "입찰일 ▾";
    }
  })();

  // 🏢 매물 유형 라벨 (전체매물, 아파트, 빌라, 원룸, 상가 등 구체적 명시)
  const propertyTypeLabel = (() => {
    const allPropTypes = PROPERTY_TYPES.flatMap(g => g.items);
    if (filters.propertyTypes.length === 0) return activeMode === "경매" ? "자산유형 ▾" : "전체매물 ▾";
    if (filters.propertyTypes.length >= allPropTypes.length) {
      return activeMode === "경매" ? "전체자산 ▾" : "전체매물 ▾";
    }

    // 대분류 전체와 1:1 일치하는지 확인
    for (const group of PROPERTY_TYPES) {
      if (group.items.length === filters.propertyTypes.length && group.items.every(it => filters.propertyTypes.includes(it))) {
        return `${group.group} ▾`;
      }
    }

    if (filters.propertyTypes.length === 1) {
      return `${filters.propertyTypes[0]} ▾`;
    }
    if (filters.propertyTypes.length === 2) {
      return `${filters.propertyTypes[0]}, ${filters.propertyTypes[1]} ▾`;
    }
    return `${filters.propertyTypes[0]} 외 ${filters.propertyTypes.length - 1} ▾`;
  })();

  const pillStyle = (active: boolean) => ({
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: active ? 700 : 500,
    backgroundColor: active ? "#eef4ff" : "#fff",
    border: `1px solid ${active ? "#4b89ff" : "#d1d5db"}`,
    color: active ? "#4b89ff" : "#374151",
    whiteSpace: "nowrap" as const,
    cursor: "pointer",
    flexShrink: 0,
    transition: "all 0.15s",
    display: "flex",
    alignItems: "center",
    gap: "4px"
  });

  const renderSheet = (title: string, children: React.ReactNode) => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10000, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={() => setActivePanel(null)} style={{ flex: 1 }} />
      <div style={{ background: "#fff", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", maxHeight: "85vh", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
          <span style={{ fontSize: "16px", fontWeight: 700 }}>{title}</span>
          <button onClick={() => setActivePanel(null)} style={{ background: "none", border: "none", fontSize: "20px", color: "#6b7280", cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: "20px", overflowY: "auto", flex: 1, WebkitOverflowScrolling: "touch" }}>
          {children}
        </div>
        <div style={{ padding: "12px 20px 24px", borderTop: "1px solid #e5e7eb", background: "#fff" }}>
          <button onClick={() => { setActivePanel(null); if (onShowList) onShowList("filter"); }} style={{ width: "100%", padding: "14px", background: "#4b89ff", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: 700, color: "#fff", cursor: "pointer" }}>
            {filteredCount}개 {activeMode === "경매" ? "경·공매 매물" : "공실광고"} 보기
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div style={{ width: "100%", height: "46px", background: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", position: "relative", zIndex: 50 }}>
        {/* 전체 필터 아이콘 버튼 */}
        <button onClick={() => setFullFilterOpen(true)} style={{ flexShrink: 0, width: "40px", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", position: "relative" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.2" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="8" cy="6" r="2" fill="#374151" stroke="#fff" strokeWidth="1.5"/><circle cx="16" cy="12" r="2" fill="#374151" stroke="#fff" strokeWidth="1.5"/><circle cx="10" cy="18" r="2" fill="#374151" stroke="#fff" strokeWidth="1.5"/></svg>
          {hasActiveFilters && <div style={{ position: "absolute", top: 6, right: 6, width: 7, height: 7, borderRadius: "50%", background: "#ef4444" }} />}
        </button>
        <div style={{ width: 1, height: 20, background: "#e5e7eb", flexShrink: 0 }} />

        {/* 수평 스크롤 필 버튼들 */}
        <div style={{ overflowX: "auto", display: "flex", gap: "8px", padding: "0 12px", flex: 1, scrollbarWidth: "none" }}>
          <button onClick={() => setActivePanel(activePanel === "loc" ? null : "loc")} style={pillStyle(activePanel === "loc" || locLabel !== "위치")}>📍 {locLabel}</button>
          <button onClick={() => setActivePanel(activePanel === "prop" ? null : "prop")} style={pillStyle(activePanel === "prop" || filters.propertyTypes.length > 0)}>
            {propertyTypeLabel}
          </button>

          {/* 🔨 경매 모드 전용 필터 버튼들 (PC 100% 동일) */}
          {activeMode === "경매" ? (
            <>
              <button onClick={() => setActivePanel(activePanel === "auction_appraisal" ? null : "auction_appraisal")} style={pillStyle(activePanel === "auction_appraisal" || filters.auctionAppraisalMin !== null || filters.auctionAppraisalMax !== null)}>
                {auctionAppraisalLabel}
              </button>
              <button onClick={() => setActivePanel(activePanel === "auction_bid_price" ? null : "auction_bid_price")} style={pillStyle(activePanel === "auction_bid_price" || filters.auctionBidPriceMin !== null || filters.auctionBidPriceMax !== null)}>
                {auctionBidPriceLabel}
              </button>
              <button onClick={() => setActivePanel(activePanel === "auction_discount" ? null : "auction_discount")} style={pillStyle(activePanel === "auction_discount" || filters.auctionDiscount > 0)}>
                {auctionDiscountLabel}
              </button>
              <button onClick={() => setActivePanel(activePanel === "auction_bid_count" ? null : "auction_bid_count")} style={pillStyle(activePanel === "auction_bid_count" || filters.auctionBidCount > 0)}>
                {auctionBidCountLabel}
              </button>
              <button onClick={() => setActivePanel(activePanel === "auction_start_date" ? null : "auction_start_date")} style={pillStyle(activePanel === "auction_start_date" || (filters.auctionStartDate && filters.auctionStartDate !== "all"))}>
                {auctionStartDateLabel}
              </button>
            </>
          ) : (
            /* 일반 공실 모드 전용 필터 버튼들 */
            <>
              <button onClick={() => setActivePanel(activePanel === "trade" ? null : "trade")} style={pillStyle(activePanel === "trade" || filters.tradeTypes.length > 0)}>
                {filters.tradeTypes.length === TRADE_TYPES.length ? "전체거래" : filters.tradeTypes.length === 0 ? "거래방식" : filters.tradeTypes.join(", ")}
              </button>
              {showPricePill && (
                <button onClick={() => setActivePanel(activePanel === "price" ? null : "price")} style={pillStyle(activePanel === "price" || filters.priceMin !== null || filters.priceMax !== null)}>
                  {priceLabel}
                </button>
              )}
              {showAreaPill && (
                <button onClick={() => setActivePanel(activePanel === "area" ? null : "area")} style={pillStyle(activePanel === "area" || filters.areaMin !== null || filters.areaMax !== null)}>
                  {areaLabel}
                </button>
              )}
              {showRoomBathPill && (
                <button onClick={() => setActivePanel(activePanel === "room_bath" ? null : "room_bath")} style={pillStyle(activePanel === "room_bath" || filters.roomCount !== null || filters.bathCount !== null)}>
                  {filters.roomCount ? `방 ${filters.roomCount}개+` : "방/욕실 ▾"}
                </button>
              )}
              {showDirectionPill && (
                <button onClick={() => setActivePanel(activePanel === "direction" ? null : "direction")} style={pillStyle(activePanel === "direction" || filters.direction !== null)}>
                  {filters.direction ? `${filters.direction}` : "방향 ▾"}
                </button>
              )}
              {showUnitsPill && (
                <button onClick={() => setActivePanel(activePanel === "units" ? null : "units")} style={pillStyle(activePanel === "units" || filters.unitsMin !== null)}>
                  {filters.unitsMin ? `${filters.unitsMin}세대+` : "세대수 ▾"}
                </button>
              )}
              {showFloorPill && (
                <button onClick={() => setActivePanel(activePanel === "floor" ? null : "floor")} style={pillStyle(activePanel === "floor" || filters.floor !== null)}>
                  {filters.floor ? `${filters.floor}` : "층수 ▾"}
                </button>
              )}
              {showMaintPill && (
                <button onClick={() => setActivePanel(activePanel === "maint" ? null : "maint")} style={pillStyle(activePanel === "maint" || filters.maintMax !== null)}>
                  {filters.maintMax ? `관리비 ${Math.round(filters.maintMax/10000)}만 이하` : "관리비 ▾"}
                </button>
              )}
              {showParkingPill && (
                <button onClick={() => setActivePanel(activePanel === "parking" ? null : "parking")} style={pillStyle(activePanel === "parking" || filters.parking !== null)}>
                  {filters.parking ? `${filters.parking}` : "주차 ▾"}
                </button>
              )}
              {showYearPill && (
                <button onClick={() => setActivePanel(activePanel === "year" ? null : "year")} style={pillStyle(activePanel === "year" || filters.yearMin !== null || filters.yearMax !== null)}>
                  {yearLabel} ▾
                </button>
              )}
              {showOptionsPill && (
                <button onClick={() => setActivePanel(activePanel === "options" ? null : "options")} style={pillStyle(activePanel === "options" || filters.options.length > 0)}>
                  {filters.options.length > 0 ? `옵션 +${filters.options.length}` : "기타옵션 ▾"}
                </button>
              )}
              <button onClick={() => setActivePanel(activePanel === "owner" ? null : "owner")} style={pillStyle(activePanel === "owner" || filters.ownerRole !== 'NONE')}>
                {ownerLabel}
              </button>
              <button onClick={() => setActivePanel(activePanel === "commission" ? null : "commission")} style={pillStyle(activePanel === "commission" || filters.commissionType !== 'NONE')}>
                {commissionLabel}
              </button>
              {showThemePill && (
                <button onClick={() => setActivePanel(activePanel === "theme" ? null : "theme")} style={pillStyle(activePanel === "theme" || filters.themes.length > 0)}>
                  {themeLabel}
                </button>
              )}
            </>
          )}

          {/* 공통 상세필터 버튼 */}
          <button 
            onClick={() => setFullFilterOpen(true)} 
            style={{
              ...pillStyle(fullFilterOpen || hasActiveFilters),
              backgroundColor: hasActiveFilters ? "#eef4ff" : "#fff",
              borderColor: hasActiveFilters ? "#4b89ff" : "#d1d5db",
              color: hasActiveFilters ? "#4b89ff" : "#374151",
            }}
          >
            🎛️ 상세필터 ▾
            {hasActiveFilters && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", marginLeft: "2px" }} />}
          </button>
        </div>
      </div>

      {/* ═══ 바텀시트 패널들 ═══ */}
      {activePanel === "loc" && renderSheet("위치", <LocationFilterPanel onLocationMove={onLocationMove} onFilterChange={onFilterChange} onClose={() => setActivePanel(null)} locLabel={locLabel} setLocLabel={setLocLabel} />)}
      {activePanel === "prop" && renderSheet(activeMode === "경매" ? "경·공매 자산유형" : "공실광고유형", <PropertyTypeFilterPanel filters={filters} onFilterChange={onFilterChange} PROPERTY_TYPES={PROPERTY_TYPES} />)}
      
      {/* 경매 모드 시트들 */}
      {activePanel === "auction_appraisal" && renderSheet("감정가", <AuctionAppraisalFilterPanel filters={filters} onFilterChange={onFilterChange} />)}
      {activePanel === "auction_bid_price" && renderSheet("최저입찰가", <AuctionBidPriceFilterPanel filters={filters} onFilterChange={onFilterChange} />)}
      {activePanel === "auction_discount" && renderSheet("할인율 (감정가 대비)", <AuctionDiscountFilterPanel filters={filters} onFilterChange={onFilterChange} />)}
      {activePanel === "auction_bid_count" && renderSheet("유찰 횟수", <AuctionBidCountFilterPanel filters={filters} onFilterChange={onFilterChange} />)}
      {activePanel === "auction_start_date" && renderSheet("입찰 시작일", <AuctionStartDateFilterPanel filters={filters} onFilterChange={onFilterChange} />)}

      {/* 일반 공실 모드 시트들 */}
      {activePanel === "trade" && renderSheet("거래방식", <TradeTypeFilterPanel filters={filters} onFilterChange={onFilterChange} TRADE_TYPES={TRADE_TYPES} />)}
      {activePanel === "price" && renderSheet("가격", <PriceFilterPanel filters={filters} onFilterChange={onFilterChange} />)}
      {activePanel === "area" && renderSheet("면적", <AreaFilterPanel filters={filters} onFilterChange={onFilterChange} />)}
      {activePanel === "room_bath" && renderSheet("방 / 욕실수", <RoomBathFilterPanel filters={filters} onFilterChange={onFilterChange} />)}
      {activePanel === "direction" && renderSheet("방향", <DirectionFilterPanel filters={filters} onFilterChange={onFilterChange} />)}
      {activePanel === "units" && renderSheet("세대수", <UnitsFilterPanel filters={filters} onFilterChange={onFilterChange} />)}
      {activePanel === "maint" && renderSheet("관리비", <MaintFilterPanel filters={filters} onFilterChange={onFilterChange} />)}
      {activePanel === "parking" && renderSheet("주차", <ParkingFilterPanel filters={filters} onFilterChange={onFilterChange} />)}
      {activePanel === "floor" && renderSheet("층수", <FloorFilterPanel filters={filters} onFilterChange={onFilterChange} />)}
      {activePanel === "year" && renderSheet("사용승인일 (연식)", <YearFilterPanel filters={filters} onFilterChange={onFilterChange} />)}
      {activePanel === "options" && renderSheet("기타옵션 (특화 맞춤)", <OptionsFilterPanel filters={filters} onFilterChange={onFilterChange} optionsList={getCategoryOptions(filters.propertyTypes)} />)}
      {activePanel === "owner" && renderSheet("등록자 유형", <OwnerRoleFilterPanel filters={filters} onFilterChange={onFilterChange} />)}
      {activePanel === "commission" && renderSheet("중개보수", <CommissionFilterPanel filters={filters} onFilterChange={onFilterChange} />)}
      {activePanel === "theme" && (() => {
        const currentGroup = getSelectedGroup(filters.propertyTypes);
        const presets = currentGroup === "RESIDENTIAL" ? RESIDENTIAL_THEMES : currentGroup === "COMMERCIAL" ? COMMERCIAL_THEMES : currentGroup === "LAND" ? LAND_THEMES : undefined;
        return renderSheet("테마 키워드", <ThemeFilterPanel filters={filters} onFilterChange={onFilterChange} presets={presets} />);
      })()}

      {/* ═══ 풀스크린 통합 상세필터 (경매 모드 & 공실 모드 완벽 분기) ═══ */}
      {fullFilterOpen && (
        <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 10001, display: "flex", flexDirection: "column", animation: "fadeIn 0.2s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #e5e7eb" }}>
            <span style={{ fontSize: "17px", fontWeight: 800 }}>
              {activeMode === "경매" ? "법원 경·공매 상세 필터" : "공실광고 상세 필터"}
            </span>
            <button onClick={() => { setTempFilters(filters); setFullFilterOpen(false); }} style={{ background: "none", border: "none", fontSize: "22px", color: "#6b7280", cursor: "pointer" }}>✕</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 100px", WebkitOverflowScrolling: "touch", overscrollBehaviorY: "contain" }}>
            {/* 위치 검색 */}
            <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>위치 (시/구/동)</div>
              <LocationFilterPanel variant="inline" tempFilters={tempFilters} onLocationMove={onLocationMove} onFilterChange={handleTempFilterChange} onClose={() => {}} locLabel={locLabel} setLocLabel={setLocLabel} />
            </div>

            {/* 자산유형 / 공실유형 */}
            <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>
                {activeMode === "경매" ? "경·공매 자산유형" : "공실광고유형"}
              </div>
              <PropertyTypeFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} PROPERTY_TYPES={PROPERTY_TYPES} />
            </div>

            {/* 🔨 경매 모드 전용 5대 조건 섹션 (PC와 100% 동일) */}
            {activeMode === "경매" ? (
              <>
                <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>감정가</div>
                  <AuctionAppraisalFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} />
                </div>

                <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>최저입찰가</div>
                  <AuctionBidPriceFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} />
                </div>

                <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>할인율 (감정가 대비)</div>
                  <AuctionDiscountFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} />
                </div>

                <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>유찰 횟수</div>
                  <AuctionBidCountFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} />
                </div>

                <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>입찰 시작일</div>
                  <AuctionStartDateFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} />
                </div>
              </>
            ) : (
              /* 일반 공실 모드 전용 조건 섹션 */
              <>
                <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>거래유형</div>
                  <TradeTypeFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} TRADE_TYPES={TRADE_TYPES} />
                </div>
                
                {showTempPrice && (
                  <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>가격</div>
                    <PriceFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} />
                  </div>
                )}

                {showTempArea && (
                  <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>면적</div>
                    <AreaFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} />
                  </div>
                )}

                {showTempYear && (
                  <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>사용승인일 (연식)</div>
                    <YearFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} />
                  </div>
                )}

                {showTempUnits && (
                  <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>세대수</div>
                    <UnitsFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} />
                  </div>
                )}

                {showTempRoomBath && (
                  <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>방 / 욕실수</div>
                    <RoomBathFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} />
                  </div>
                )}

                {showTempDirection && (
                  <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>방향</div>
                    <DirectionFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} />
                  </div>
                )}

                {showTempFloor && (
                  <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>층수</div>
                    <FloorFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} />
                  </div>
                )}

                {showTempMaint && (
                  <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>관리비</div>
                    <MaintFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} />
                  </div>
                )}

                {showTempParking && (
                  <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>주차</div>
                    <ParkingFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} />
                  </div>
                )}

                {showTempOptions && (
                  <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>기타옵션</div>
                    <OptionsFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} optionsList={getCategoryOptions(tempFilters.propertyTypes)} />
                  </div>
                )}

                <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>등록자 유형</div>
                  <OwnerRoleFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} />
                </div>

                <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>중개보수</div>
                  <CommissionFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} />
                </div>

                {showTempTheme && (
                  <div style={{ padding: "20px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#111", marginBottom: "12px" }}>테마 키워드</div>
                    <ThemeFilterPanel filters={tempFilters} onFilterChange={handleTempFilterChange} presets={getCategoryOptions(tempFilters.propertyTypes) ? RESIDENTIAL_THEMES : undefined} />
                  </div>
                )}
              </>
            )}
          </div>

          {/* 하단 버튼 영역 */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #e5e7eb", padding: "12px 20px 24px", display: "flex", gap: "12px" }}>
            <button 
              onClick={() => {
                const allPropTypes = PROPERTY_TYPES.flatMap(g => g.items);
                const empty = { 
                  propertyTypes: allPropTypes, 
                  tradeTypes: TRADE_TYPES, 
                  keyword: "", 
                  priceMin: null, 
                  priceMax: null, 
                  areaMin: null, 
                  areaMax: null, 
                  yearMin: null, 
                  yearMax: null, 
                  floor: null, 
                  roomCount: null, 
                  bathCount: null, 
                  direction: null, 
                  unitsMin: null, 
                  maintMax: null, 
                  parking: null, 
                  options: [], 
                  ownerRole: null, 
                  commissionType: null, 
                  themes: [], 
                  sido: null, 
                  sigungu: null, 
                  dong: null, 
                  locationSearchType: 'map' as const,
                  auctionAppraisalMin: null,
                  auctionAppraisalMax: null,
                  auctionBidPriceMin: null,
                  auctionBidPriceMax: null,
                  auctionDiscount: 0,
                  auctionBidCount: 0,
                  auctionStartDate: "all"
                };
                setTempFilters(empty);
                setLocLabel("위치");
              }} 
              style={{ padding: "14px 20px", background: "#f3f4f6", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: 600, color: "#6b7280", cursor: "pointer" }}
            >
              ↻ 초기화
            </button>
            <button onClick={() => { 
              onFilterChange(tempFilters); 
              setFullFilterOpen(false); 
              if (onShowList) onShowList("filter"); 
            }} style={{ flex: 1, padding: "14px", background: "#4b89ff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: 800, color: "#fff", cursor: "pointer" }}>
              {tempFilteredCount}개 {activeMode === "경매" ? "경·공매 매물" : "공실광고"} 보기
            </button>
          </div>

        </div>
      )}

      {/* ═══ 텍스트 검색 오버레이 ═══ */}
      {searchOpen && (
        <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 10002, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px", borderBottom: "1px solid #e5e7eb" }}>
            <button onClick={() => { setSearchOpen(false); setSearchText(""); }} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#6b7280" }}>←</button>
            <input ref={searchInputRef} type="text" placeholder="건물명, 주소, 공실광고번호 검색" value={searchText} onChange={e => setSearchText(e.target.value)} onKeyDown={e => e.key === "Enter" && applyTextSearch()} style={{ flex: 1, padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "15px", outline: "none" }} />
            <button onClick={applyTextSearch} style={{ flexShrink: 0, padding: "10px 14px", background: "#4b89ff", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>🔍</button>
          </div>
          {searchText && (
            <div style={{ padding: "16px 20px", flex: 1, overflowY: "auto" }}>
              <div style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "12px" }}>공실광고 검색 결과</div>
              {vacancies.filter(v => {
                const q = searchText.toLowerCase();
                return (v.building_name || "").toLowerCase().includes(q) || (v.dong || "").toLowerCase().includes(q) || (v.sigungu || "").toLowerCase().includes(q) || (v.vacancy_no || "").toLowerCase().includes(q) || (v.property_type || "").toLowerCase().includes(q);
              }).slice(0, 20).map((v, i) => (
                <div key={i} style={{ padding: "12px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#111" }}>📍 {v.building_name || [v.dong, v.sigungu].filter(Boolean).join(" ")}</div>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>{[v.sido, v.sigungu, v.dong].filter(Boolean).join(" ")} · {v.trade_type} {v.property_type}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
