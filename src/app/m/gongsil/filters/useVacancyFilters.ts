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
}

export const initialFilterState: FilterState = {
  propertyTypes: [],
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
};

export function useVacancyFilters(initialVacancies: any[]) {
  const [filters, setFilters] = useState<FilterState>(initialFilterState);

  const filteredVacancies = useMemo(() => {
    return initialVacancies.filter(v => {
      // 1. 매물 유형
      if (filters.propertyTypes.length > 0 && !filters.propertyTypes.includes(v.property_type)) return false;
      
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
