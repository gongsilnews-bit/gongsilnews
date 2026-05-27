import { useState, useMemo } from 'react';

export interface FilterState {
  propertyTypes: string[];
  tradeTypes: string[];
  keyword: string;
  priceMin: number | null;
  priceMax: number | null;
  areaMin: number | null;
  areaMax: number | null;
  yearMin: number | null;
  yearMax: number | null;
  floor: string | null;
  ownerRole: string | null;        // 'USER' | 'REALTOR' | null(전체)
  commissionType: string | null;   // '법정수수료' | '공동수수료' 등
  themes: string[];                // 테마 키워드 (다중 선택)
  sido: string | null;             // 시/도 필터
  sigungu: string | null;          // 시/군/구 필터
  dong: string | null;             // 읍/면/동 필터
}

const ALL_PROPERTY_TYPES = [
  "아파트", "빌라/연립", "오피스텔", "원룸", "투룸", "단독/다가구",
  "전원주택", "상가주택", "재건축", "재개발",
  "상가", "사무실", "토지", "건물", "공장/창고", "지식산업센터"
];

export const initialFilterState: FilterState = {
  propertyTypes: ALL_PROPERTY_TYPES,
  tradeTypes: [],
  keyword: "",
  priceMin: null,
  priceMax: null,
  areaMin: null,
  areaMax: null,
  yearMin: null,
  yearMax: null,
  floor: null,
  ownerRole: null,
  commissionType: null,
  themes: [],
  sido: null,
  sigungu: null,
  dong: null,
};

export const normalizeSido = (sido: string | null): string => {
  if (!sido) return "";
  const clean = sido.trim();
  
  // 특수 줄임말 예외 처리
  if (clean === "충청북도" || clean === "충북") return "충북";
  if (clean === "충청남도" || clean === "충남") return "충남";
  if (clean === "전라북도" || clean === "전북" || clean === "전북특별자치도") return "전북";
  if (clean === "전라남도" || clean === "전남") return "전남";
  if (clean === "경상북도" || clean === "경북") return "경북";
  if (clean === "경상남도" || clean === "경남") return "경남";
  if (clean === "강원특별자치도" || clean === "강원도" || clean === "강원") return "강원";
  if (clean === "제주특별자치도" || clean === "제주도" || clean === "제주") return "제주";
  
  // 일반 광역시 및 특별시는 앞 2글자 반환 (서울, 경기, 인천, 대구, 부산, 대전, 광주, 울산, 세종)
  return clean.substring(0, 2);
};

export function useVacancyFilters(initialVacancies: any[]) {
  const [filters, setFilters] = useState<FilterState>(initialFilterState);

  const filteredVacancies = useMemo(() => {
    const filterSidoNorm = normalizeSido(filters.sido);
    const filterSigunguNorm = filters.sigungu?.trim() || "";
    const filterDongNorm = filters.dong?.trim() || "";

    return initialVacancies.filter(v => {
      // 1. 공실광고 유형 - 아무것도 선택하지 않으면 아무것도 노출하지 않습니다. (대표님 지침)
      if (filters.propertyTypes.length === 0) return false;
      
      let isPropMatch = false;

      if (v.trade_type === "경매") {
        // 🚀 [대표님 지침] 법원 경공매 모드 전용 8대 카테고리 고성능 해석 엔진!
        const meta = v.metadata || {};
        const mcls = meta.cltrUsgMclsCtgrNm || "";
        const scls = meta.cltrUsgSclsCtgrNm || "";
        
        isPropMatch = filters.propertyTypes.some((pill) => {
          if (pill === "아파트") return scls === "아파트";
          if (pill === "단독/다가구") return scls === "단독주택" || scls === "다가구주택";
          if (pill === "빌라/주택")
            return mcls === "주거용건물" && scls !== "아파트" && scls !== "단독주택" && scls !== "다가구주택";
          if (pill === "빌딩/사무실")
            return (
              mcls.includes("상업") || scls.includes("상가") || scls.includes("점포") || scls.includes("판매") ||
              scls.includes("사무") || mcls.includes("업무") || scls.includes("오피스텔") || scls.includes("아파트형") || scls.includes("지식산업") ||
              mcls.includes("근린생활") || scls.includes("상가주택") || scls.includes("빌딩") || mcls.includes("숙박") || mcls.includes("의료")
            );
          if (pill === "공장/창고")
            return (
              (scls.includes("공장") || scls.includes("창고") || scls.includes("제조") || mcls.includes("산업")) &&
              !scls.includes("아파트형") &&
              !scls.includes("지식산업")
            );
          if (pill === "토지") return mcls === "토지";
          return false;
        });
      } else {
        // 일반 공실 매물 필터링
        isPropMatch = filters.propertyTypes.includes(v.property_type);
        
        // 🚀 [대표님 지침] 원룸/투룸 초강력 매칭 예외 보정 장치
        if (!isPropMatch) {
          if (v.property_type === "원룸·투룸(풀옵션)") {
            isPropMatch = filters.propertyTypes.includes("원룸") || filters.propertyTypes.includes("투룸");
          }
        }
      }
      
      if (!isPropMatch) return false;
      
      // 2. 거래 방식
      if (filters.tradeTypes.length > 0 && !filters.tradeTypes.includes(v.trade_type)) return false;
      
      // 3. 가격 (만원 단위) - 월세의 경우 보증금(deposit_price), 그 외는 매매가/전세가(trade_price)
      if (filters.priceMin !== null || filters.priceMax !== null) {
        const price = v.trade_type === '월세' ? v.deposit_price : v.trade_price;
        if (price == null) return false;
        if (filters.priceMin !== null && price < filters.priceMin) return false;
        if (filters.priceMax !== null && price > filters.priceMax) return false;
      }

      // 4. 면적 (전용면적 exclusive_area, ㎡ 기준, 1평 ≈ 3.3058㎡)
      if (filters.areaMin !== null || filters.areaMax !== null) {
        if (v.exclusive_area == null) return false;
        const py = v.exclusive_area / 3.3058;
        if (filters.areaMin !== null && py < filters.areaMin) return false;
        if (filters.areaMax !== null && py >= filters.areaMax) return false;
      }

      // 5. 사용승인일 (연식)
      if (filters.yearMin !== null || filters.yearMax !== null) {
        if (!v.approval_date) return false;
        const year = parseInt(v.approval_date.substring(0, 4), 10);
        if (isNaN(year)) return false;
        if (filters.yearMin !== null && year < filters.yearMin) return false;
        if (filters.yearMax !== null && year > filters.yearMax) return false;
      }

      // 6. 층수
      if (filters.floor) {
        if (!v.floor) return false;
        if (filters.floor === '1층' && v.floor !== '1') return false;
        if (filters.floor === '2층이상' && (parseInt(v.floor, 10) < 2 || v.floor.includes('B'))) return false;
        if (filters.floor === '반지하/지하' && !v.floor.includes('B')) return false;
        if (filters.floor === '옥탑' && v.floor !== '옥탑') return false;
      }

      // 7. 등록자 유형 (일반인 / 부동산)
      if (filters.ownerRole) {
        if (filters.ownerRole === 'USER' && v.owner_role !== 'USER') return false;
        if (filters.ownerRole === 'REALTOR' && v.owner_role !== 'REALTOR') return false;
      }

      // 8. 중개보수 필터
      if (filters.commissionType) {
        const vc = v.realtor_commission || v.commission_type || '';
        if (filters.commissionType === '공동중개') {
          if (!vc.includes('공동')) return false;
        } else {
          // 퍼센트 기반 필터: '25%~', '50%~', '75%~', '100%'
          // DB 값: '수수료25%', '수수료50%', '수수료75%', '수수료100%', '법정수수료', '' 등
          const percentMatch = vc.match(/(\d+)%/);
          const vcPercent = percentMatch ? parseInt(percentMatch[1], 10) : (vc === '' || vc === '법정수수료' ? 100 : 0);
          
          if (filters.commissionType === '25') {
            if (vcPercent < 25) return false;
          } else if (filters.commissionType === '50') {
            if (vcPercent < 50) return false;
          } else if (filters.commissionType === '75') {
            if (vcPercent < 75) return false;
          } else if (filters.commissionType === '100') {
            if (vcPercent < 100) return false;
          }
        }
      }

      // 9. 테마 키워드 (선택된 테마 중 하나라도 포함)
      if (filters.themes.length > 0) {
        if (!v.themes || !Array.isArray(v.themes)) return false;
        const hasMatch = filters.themes.some(t => v.themes.includes(t));
        if (!hasMatch) return false;
      }

      // 10. 키워드 검색
      if (filters.keyword) {
        const q = filters.keyword.toLowerCase();
        const match = 
          (v.building_name || "").toLowerCase().includes(q) || 
          (v.dong || "").toLowerCase().includes(q) || 
          (v.sigungu || "").toLowerCase().includes(q) || 
          (v.vacancy_no || "").toLowerCase().includes(q) ||
          (v.property_type || "").toLowerCase().includes(q);
        if (!match) return false;
      }

      // 11. 위치 필터 (시/구/동) - [대표님 최종 개혁 지침]: 행정동 텍스트 하드 매칭을 걷어내어 화면(Bbox) 안 매물은 다 보이게 공간 연산 일원화!
      /*
      if (filterSidoNorm) {
        const vSidoNorm = normalizeSido(v.sido);
        if (vSidoNorm !== filterSidoNorm) return false;
      }
      if (filterSigunguNorm) {
        const vSigungu = v.sigungu?.trim() || "";
        if (vSigungu !== filterSigunguNorm) return false;
      }
      if (filterDongNorm) {
        const vDong = v.dong?.trim() || "";
        if (vDong !== filterDongNorm) return false;
      }
      */

      return true;
    });
  }, [initialVacancies, filters]);

  const updateFilter = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFilters(initialFilterState);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.propertyTypes.length > 0) count++;
    if (filters.tradeTypes.length > 0) count++;
    if (filters.priceMin !== null || filters.priceMax !== null) count++;
    if (filters.areaMin !== null || filters.areaMax !== null) count++;
    if (filters.yearMin !== null || filters.yearMax !== null) count++;
    if (filters.floor !== null) count++;
    if (filters.ownerRole !== null) count++;
    if (filters.commissionType !== null) count++;
    if (filters.themes.length > 0) count++;
    if (filters.keyword !== "") count++;
    if (filters.sido || filters.sigungu || filters.dong) count++;
    return count;
  }, [filters]);

  return {
    filters,
    filteredVacancies,
    updateFilter,
    resetFilters,
    setFilters,
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0
  };
}
