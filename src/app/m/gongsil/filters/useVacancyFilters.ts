import { useState, useMemo } from 'react';
import { FilterState } from '../search/vacancySearch.types';

export type { FilterState } from '../search/vacancySearch.types';

const ALL_PROPERTY_TYPES = [
  "아파트", "오피스텔", "기타",
  "빌라/연립", "단독/다가구", "전원주택",
  "원룸", "1.5룸", "투룸",
  "상가", "사무실", "지식산업센터", "건물/빌딩", "공장/창고", "토지"
];

export const initialFilterState: FilterState = {
  propertyTypes: ALL_PROPERTY_TYPES,
  tradeTypes: ["매매", "전세", "월세", "단기"],
  keyword: "",
  priceMin: null,
  priceMax: null,
  salePriceMin: null,
  salePriceMax: null,
  depositMin: null,
  depositMax: null,
  monthlyRentMin: null,
  monthlyRentMax: null,
  areaMin: null,
  areaMax: null,
  yearMin: null,
  yearMax: null,
  floor: null,
  roomCount: null,
  bathCount: null,
  direction: null,
  directions: [],
  unitsMin: null,
  unitsMax: null,
  maintMax: null,
  parking: null,
  parkings: [],
  options: [],
  ownerRole: null,
  commissionType: null,
  themes: [],
  sido: null,
  sigungu: null,
  dong: null,
  locationSearchType: 'map',

  auctionAppraisalMin: null,
  auctionAppraisalMax: null,
  auctionBidPriceMin: null,
  auctionBidPriceMax: null,
  auctionDiscount: 0,
  auctionBidCount: 0,
  auctionStartDate: "all",
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

type VacancyLike = {
  [key: string]: unknown;
  trade_type?: string | null;
  property_type?: string | null;
  sub_category?: string | null;
  building_name?: string | null;
  sido?: string | null;
  sigungu?: string | null;
  dong?: string | null;
  vacancy_no?: string | null;
  deposit?: number;
  monthly_rent?: number;
  deposit_price?: number;
  trade_price?: number;
  exclusive_area?: number | null;
  approval_date?: string | null;
  floor?: string | null;
  room_count?: number;
  rooms?: string | null;
  bath_count?: number;
  bathrooms?: string | null;
  direction?: string | null;
  main_direction?: string | null;
  total_units?: number | string | null;
  maintenance_fee?: number | null;
  maintenance_cost?: number | null;
  maint_fee?: number | null;
  parking?: string | null;
  options?: string[] | string | null;
  facilities?: string[] | string | null;
  owner_role?: string | null;
  realtor_commission?: string | null;
  commission_type?: string | null;
  themes?: string[] | null;
  metadata?: Record<string, unknown> | null;
};

export function filterVacanciesList(vacancies: VacancyLike[], filters: FilterState, mode: "공실" | "경매" = "공실"): VacancyLike[] {
  const filterSidoNorm = normalizeSido(filters.sido);
  const filterSigunguNorm = filters.sigungu?.trim() || "";
  const filterDongNorm = filters.dong?.trim() || "";

  return vacancies.filter(v => {
    // 0. 모드(공실 vs 경매)에 따른 trade_type 철저 격리 (물건 혼입 원천 차단)
    const isAuctionItem = v.trade_type === "경매";
    if (mode === "공실" && isAuctionItem) return false;
    if (mode === "경매" && !isAuctionItem) return false;

    // 1. 공실광고 유형 - 아무것도 선택하지 않으면 아무것도 노출하지 않습니다. (대표님 지침)
    if (filters.propertyTypes.length === 0) return false;
    
    let isPropMatch = false;

    // 🚀 [대표님 지침] '전체 매물' 선택 시 모든 매물 100% 매칭
    if (filters.propertyTypes.length >= ALL_PROPERTY_TYPES.length) {
      isPropMatch = true;
    } else if (v.trade_type === "경매") {
        // 🚀 [대표님 지침] 법원 경공매 모드 전용 6대 자산 분류 고성능 해석 엔진 (PC 동일)
        const meta = (v.metadata ?? {}) as Record<string, unknown>;
        const mcls = String(meta.cltrUsgMclsCtgrNm ?? "");
        const scls = String(meta.cltrUsgSclsCtgrNm ?? "");
        
        isPropMatch = filters.propertyTypes.some((pill) => {
          if (pill === "아파트") return scls.includes("아파트") || scls.includes("오피스텔") || scls.includes("공동주택");
          if (pill === "단독/다가구") return scls.includes("단독") || scls.includes("다가구") || scls.includes("주택");
          if (pill === "빌라/주택")
            return (mcls.includes("주거") || scls.includes("주택") || scls.includes("빌라") || scls.includes("다세대") || scls.includes("연립")) && !scls.includes("아파트");
          if (pill === "빌딩/사무실")
            return (
              mcls.includes("상업") || scls.includes("상가") || scls.includes("점포") || scls.includes("판매") ||
              scls.includes("사무") || mcls.includes("업무") || scls.includes("오피스텔") || scls.includes("아파트형") || scls.includes("지식산업") ||
              mcls.includes("근린생활") || scls.includes("상가주택") || scls.includes("빌딩") || mcls.includes("숙박") || mcls.includes("의료") ||
              scls.includes("업무시설") || mcls.includes("업무시설")
            );
          if (pill === "공장/창고")
            return (
              (scls.includes("공장") || scls.includes("창고") || scls.includes("제조") || mcls.includes("산업") || mcls.includes("공장")) &&
              !scls.includes("아파트형") &&
              !scls.includes("지식산업")
            );
          if (pill === "토지")
            return mcls.includes("토지") || scls.includes("토지") || mcls.includes("대지") || scls.includes("대지") || mcls.includes("임야") || mcls.includes("전") || mcls.includes("답") || mcls.includes("잡종지") || mcls.includes("과수원");
          return false;
        });
      } else {
        // 🚀 일반 공실 매물 필터링 (PC GongsilClient.tsx 100% 동일 매칭 로직)
        isPropMatch = filters.propertyTypes.some((pill) => {
          // ① 아파트·오피스텔
          if (pill === "아파트") {
            return v.sub_category === "아파트" || (v.property_type === "아파트·오피스텔" && (!v.sub_category || v.sub_category === "아파트"));
          }
          if (pill === "오피스텔") {
            return v.sub_category === "오피스텔" || (v.property_type === "아파트·오피스텔" && v.sub_category === "오피스텔") || (v.themes && Array.isArray(v.themes) && v.themes.includes("오피스텔"));
          }
          if (pill === "기타") {
            return ["아파트분양권", "재건축", "오피스텔분양권", "재개발"].includes(v.sub_category);
          }

          // ② 빌라·주택
          if (pill === "빌라/연립") {
            return v.sub_category === "빌라/연립" || v.sub_category === "빌라" || v.sub_category === "연립" || v.sub_category === "다세대";
          }
          if (pill === "단독/다가구") {
            return v.sub_category === "단독/다가구" || v.sub_category === "단독" || v.sub_category === "다가구" || v.sub_category === "상가주택";
          }
          if (pill === "전원주택") {
            return v.sub_category === "전원주택";
          }

          // ③ 원룸·투룸(풀옵션)
          if (pill === "원룸") {
            return v.sub_category === "원룸" || v.sub_category === "원룸/투룸" || v.sub_category === "원룸·투룸" || (v.property_type === "원룸·투룸(풀옵션)" && !v.sub_category);
          }
          if (pill === "1.5룸") {
            return v.sub_category === "1.5룸";
          }
          if (pill === "투룸") {
            return v.sub_category === "투룸";
          }

          // ④ 상가·사무실·공장·토지
          if (pill === "상가") {
            return v.sub_category === "상가" || v.sub_category === "근린상가" || v.sub_category === "상가건물";
          }
          if (pill === "사무실") {
            return v.sub_category === "사무실" || v.sub_category === "업무시설";
          }
          if (pill === "지식산업센터") {
            return v.sub_category === "지식산업센터" || v.sub_category === "아파트형공장";
          }
          if (pill === "건물/빌딩") {
            return v.sub_category === "건물/빌딩" || v.sub_category === "건물" || v.sub_category === "빌딩/건물" || v.sub_category === "빌딩";
          }
          if (pill === "공장/창고") {
            return v.sub_category === "공장/창고" || v.sub_category === "공장" || v.sub_category === "창고";
          }
          if (pill === "토지") {
            return v.sub_category === "토지" || v.sub_category === "대지" || v.sub_category === "임야";
          }

          return v.sub_category === pill || v.property_type === pill;
        });
      }
      
      if (!isPropMatch) return false;
      
      // 🚀 경매 전용 상세 필터 (PC GongsilClient.tsx 100% 동일)
      if (v.trade_type === "경매") {
        const meta = (v.metadata ?? {}) as Record<string, unknown>;
        const appraisal = Number(meta.appraisal_price ?? (meta.apslEvlAmt ? Number(String(meta.apslEvlAmt)) : 0)) || 0;
        const bidPrice = Number(meta.lowest_bid_price ?? (meta.lowstBidPrcIndctCont ? Number(String(meta.lowstBidPrcIndctCont)) : 0)) || 0;

        // 1) 감정가 필터
        if (filters.auctionAppraisalMin !== null && appraisal < filters.auctionAppraisalMin) return false;
        if (filters.auctionAppraisalMax !== null && appraisal > filters.auctionAppraisalMax) return false;

        // 2) 최저입찰가 필터
        if (filters.auctionBidPriceMin !== null && bidPrice < filters.auctionBidPriceMin) return false;
        if (filters.auctionBidPriceMax !== null && bidPrice > filters.auctionBidPriceMax) return false;

        // 3) 할인율 필터
        if (filters.auctionDiscount > 0) {
          if (!appraisal || !bidPrice) return false;
          const discountRate = ((appraisal - bidPrice) / appraisal) * 100;
          if (discountRate < filters.auctionDiscount) return false;
        }

        // 4) 유찰 횟수 필터
        if (filters.auctionBidCount > 0) {
          const bidCount = Number(meta.bid_count ?? meta.pbctCnt ?? 0) || 0;
          if (bidCount < filters.auctionBidCount) return false;
        }

        // 5) 입찰 시작일 필터
        if (filters.auctionStartDate && filters.auctionStartDate !== "all") {
          const now = new Date();
          const dateStr = String(meta.pbctBegnDtm ?? meta.pblctBgnDtm ?? meta.bid_start_date ?? "");
          if (!dateStr) return false;
          const bidDate = new Date(dateStr);
          const diffDays = (bidDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          switch (filters.auctionStartDate) {
            case "1w": if (!(diffDays >= -7 && diffDays <= 7)) return false; break;
            case "2w": if (!(diffDays >= -14 && diffDays <= 14)) return false; break;
            case "1m": if (!(diffDays >= -30 && diffDays <= 30)) return false; break;
            case "1_3m": if (!(diffDays >= 30 && diffDays <= 90)) return false; break;
            case "over_3m": if (!(diffDays > 90)) return false; break;
            default: break;
          }
        }
      }

      // 2. 거래 방식 (일반 공실)
      if (v.trade_type !== "경매" && !filters.tradeTypes.includes(v.trade_type)) return false;
      
      // 3. 거래유형별 금액 (만원 단위 / 원 단위 스마트 비교)
      const toManwon = (value: unknown) => {
        const numberValue = Number(value || 0);
        return numberValue > 100000 ? Math.round(numberValue / 10000) : numberValue;
      };
      const matchesRange = (value: number, min?: number | null, max?: number | null) => (
        (min === null || min === undefined || value >= min) &&
        (max === null || max === undefined || value <= max)
      );

      const hasTradeSpecificPrice = [
        filters.salePriceMin, filters.salePriceMax, filters.depositMin,
        filters.depositMax, filters.monthlyRentMin, filters.monthlyRentMax,
      ].some(value => value !== null && value !== undefined);

      if (hasTradeSpecificPrice) {
        const tradeType = v.trade_type || "";
        const salePrice = toManwon(v.trade_price);
        const deposit = toManwon(v.deposit ?? v.deposit_price);
        const monthlyRent = toManwon(v.monthly_rent);
        const isSaleMatch = tradeType === "매매" && matchesRange(salePrice, filters.salePriceMin, filters.salePriceMax);
        const isJeonseMatch = tradeType === "전세" && matchesRange(deposit, filters.depositMin, filters.depositMax);
        const isMonthlyMatch = (tradeType === "월세" || tradeType === "단기") &&
          matchesRange(deposit, filters.depositMin, filters.depositMax) &&
          matchesRange(monthlyRent, filters.monthlyRentMin, filters.monthlyRentMax);
        if (!isSaleMatch && !isJeonseMatch && !isMonthlyMatch) return false;
      } else if (filters.priceMin !== null || filters.priceMax !== null) {
        const rawPrice = v.deposit != null ? v.deposit : (v.trade_type === '월세' ? v.deposit_price : v.trade_price);
        if (rawPrice == null) return false;
        // DB에 원 단위(예: 300,000,000)로 저장된 경우 만원 단위로 환산
        const priceInManwon = toManwon(rawPrice);
        if (filters.priceMin !== null && priceInManwon < filters.priceMin) return false;
        if (filters.priceMax !== null && priceInManwon > filters.priceMax) return false;
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

      // 6.1 방 개수 (1개, 2개, 3개, 4개 이상 정확한 매칭)
      if (filters.roomCount !== null) {
        const rooms = v.room_count || (v.rooms ? parseInt(v.rooms, 10) : 0);
        if (filters.roomCount >= 4) {
          if (rooms < 4) return false;
        } else {
          if (rooms !== filters.roomCount) return false;
        }
      }

      // 6.2 욕실 개수 (1개, 2개, 3개 이상 정확한 매칭)
      if (filters.bathCount !== null) {
        const baths = v.bath_count || (v.bathrooms ? parseInt(v.bathrooms, 10) : 0);
        if (filters.bathCount >= 3) {
          if (baths < 3) return false;
        } else {
          if (baths !== filters.bathCount) return false;
        }
      }

      // 6.3 방향 (다중 선택 지원: 남향, 남동향 등 선택된 방향 중 하나라도 포함되면 매칭)
      const selectedDirs = (filters.directions && filters.directions.length > 0)
        ? filters.directions
        : (filters.direction && filters.direction !== "전체" ? [filters.direction] : []);
      if (selectedDirs.length > 0) {
        const dir = v.direction || v.main_direction || "";
        const matches = selectedDirs.some(d => dir.includes(d));
        if (!matches) return false;
      }

      // 6.4 세대수 (50세대 이하, 100세대 미만, 300세대 미만, 500세대 미만, 1000세대 이상)
      if (filters.unitsMin !== null || (filters.unitsMax !== null && filters.unitsMax !== undefined)) {
        const units = parseInt(String(v.total_units || 0), 10) || 0;
        if (!units) return false;
        if (filters.unitsMin !== null && units < filters.unitsMin) return false;
        if (filters.unitsMax !== null && filters.unitsMax !== undefined && units > filters.unitsMax) return false;
      }

      // 6.5 관리비 (PC 동일)
      if (filters.maintMax !== null) {
        const maint = v.maintenance_fee || v.maintenance_cost || v.maint_fee || 0;
        if (maint > filters.maintMax) return false;
      }

      // 6.6 주차 (다중 선택 지원)
      const selectedParkings = (filters.parkings && filters.parkings.length > 0)
        ? filters.parkings
        : (filters.parking && filters.parking !== "전체" ? [filters.parking] : []);
      if (selectedParkings.length > 0) {
        const park = v.parking || "";
        const matches = selectedParkings.some(p => park.includes(p));
        if (!matches) return false;
      }

      // 6.7 기타옵션 (PC 동일)
      if (filters.options && filters.options.length > 0) {
        const rawOpts = v.options || v.facilities || [];
        const allOpts: string[] = Array.isArray(rawOpts)
          ? rawOpts.map(s => String(s).trim())
          : typeof rawOpts === 'string'
          ? rawOpts.split(',').map(s => s.trim())
          : [];
        const hasAllOpts = filters.options.every(opt => allOpts.some(o => o.includes(opt)));
        if (!hasAllOpts) return false;
      }

      // 7. 등록자 유형 (일반인 / 부동산)
      if (filters.ownerRole) {
        if (filters.ownerRole === 'NONE') return false;
        if (filters.ownerRole === 'USER' && v.owner_role !== 'USER') return false;
        if (filters.ownerRole === 'REALTOR' && v.owner_role !== 'REALTOR') return false;
      }

      // 8. 중개보수 필터
      if (filters.commissionType) {
        if (filters.commissionType === 'NONE') return false;
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
      // 모바일에서는 위치 검색을 별도 필터로 두지 않고 현재 지도 영역을 기준으로 검색한다.
      // 따라서 텍스트 기반 지역 매칭은 비활성화해 지도 범위가 우선되도록 한다.
      if (filters.locationSearchType === 'filter' && !filters.sido && !filters.sigungu && !filters.dong) {
        // no-op: map mode is the default for mobile searches
      } else if (filters.locationSearchType === 'filter') {
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
      }

      return true;
    });
}

export function useVacancyFilters(initialVacancies: VacancyLike[], mode: "공실" | "경매" = "경매") {
  const [filters, setFilters] = useState<FilterState>(() => {
    if (mode === "경매") {
      return { ...initialFilterState, propertyTypes: ["아파트", "단독/다가구", "빌라/주택", "빌딩/사무실", "공장/창고", "토지"] };
    }
    return initialFilterState;
  });

  const filteredVacancies = useMemo(() => {
    return filterVacanciesList(initialVacancies, filters, mode);
  }, [initialVacancies, filters, mode]);

  const updateFilter = (newFilters: Partial<FilterState>) => {
    setFilters(prev => {
      const sanitizedNext = { ...prev, ...newFilters };

      // 모바일은 지도 영역 기반 검색만 사용한다.
      // 별도 행정구역 검색 상태를 유지하지 않고, 전역적으로 map mode를 강제한다.
      const shouldKeepMapSearch =
        newFilters.locationSearchType === 'filter' ||
        newFilters.sido !== undefined ||
        newFilters.sigungu !== undefined ||
        newFilters.dong !== undefined;

      if (shouldKeepMapSearch) {
        sanitizedNext.locationSearchType = 'map';
        sanitizedNext.sido = null;
        sanitizedNext.sigungu = null;
        sanitizedNext.dong = null;
      }

      const hasChanges = Object.entries(newFilters).some(([key, value]) => {
        return prev[key as keyof FilterState] !== value;
      });

      return hasChanges ? sanitizedNext : prev;
    });
  };

  const resetFilters = () => {
    setFilters(initialFilterState);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.propertyTypes.length > 0) count++;
    if (filters.tradeTypes.length > 0) count++;
    if (filters.priceMin !== null || filters.priceMax !== null) count++;
    if (filters.salePriceMin !== null || filters.salePriceMax !== null || filters.depositMin !== null || filters.depositMax !== null || filters.monthlyRentMin !== null || filters.monthlyRentMax !== null) count++;
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
