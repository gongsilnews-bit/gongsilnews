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
  roomCount: number | null;        // 방 개수 (1, 2, 3, 4)
  bathCount: number | null;        // 욕실 개수 (1, 2, 3)
  direction: string | null;        // 방향 (남향, 동향 등)
  unitsMin: number | null;         // 세대수 (50, 100, 300, 500, 1000)
  maintMax: number | null;         // 관리비 최대금액
  parking: string | null;          // 주차 (주차가능, 자주식, 기계식 등)
  options: string[];               // 기타옵션 다중선택
  ownerRole: string | null;        // 'USER' | 'REALTOR' | null(전체)
  commissionType: string | null;   // '법정수수료' | '공동수수료' 등
  themes: string[];                // 테마 키워드 (다중 선택)
  sido: string | null;             // 시/도 필터
  sigungu: string | null;          // 시/군/구 필터
  dong: string | null;             // 읍/면/동 필터
  locationSearchType?: 'map' | 'filter'; // 검색 유형 (A스타일: map, B스타일: filter)

  // 🔨 [PC 100% 동일] 경·공매 전용 상세 필터
  auctionAppraisalMin: number | null; // 감정가 최소 (원 단위)
  auctionAppraisalMax: number | null; // 감정가 최대 (원 단위)
  auctionBidPriceMin: number | null;  // 최저입찰가 최소 (원 단위)
  auctionBidPriceMax: number | null;  // 최저입찰가 최대 (원 단위)
  auctionDiscount: number;            // 할인율 (0: 전체, 10, 20, 30, 50)
  auctionBidCount: number;            // 유찰 횟수 (0: 전체, 1, 2, 3)
  auctionStartDate: string;           // 입찰 시작일 ("all", "1w", "2w", "1m", "1_3m", "over_3m")
}

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

export function filterVacanciesList(vacancies: any[], filters: FilterState): any[] {
  const filterSidoNorm = normalizeSido(filters.sido);
  const filterSigunguNorm = filters.sigungu?.trim() || "";
  const filterDongNorm = filters.dong?.trim() || "";

  return vacancies.filter(v => {
    // 1. 공실광고 유형 - 아무것도 선택하지 않으면 아무것도 노출하지 않습니다. (대표님 지침)
    if (filters.propertyTypes.length === 0) return false;
    
    let isPropMatch = false;

    // 🚀 [대표님 지침] '전체 매물' 선택 시 모든 매물 100% 매칭
    if (filters.propertyTypes.length >= ALL_PROPERTY_TYPES.length) {
      isPropMatch = true;
    } else if (v.trade_type === "경매") {
        // 🚀 [대표님 지침] 법원 경공매 모드 전용 6대 자산 분류 고성능 해석 엔진 (PC 동일)
        const meta = v.metadata || {};
        const mcls = meta.cltrUsgMclsCtgrNm || "";
        const scls = meta.cltrUsgSclsCtgrNm || "";
        
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
            return v.sub_category === "원룸" || (v.property_type === "원룸·투룸(풀옵션)" && (!v.sub_category || v.sub_category === "원룸"));
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
        const meta = (v as any).metadata || {};
        const appraisal = meta.appraisal_price || parseInt(meta.apslEvlAmt || "0", 10) || 0;
        const bidPrice = meta.lowest_bid_price || parseInt(meta.lowstBidPrcIndctCont || "0", 10) || 0;

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
          const bidCount = meta.bid_count || meta.pbctCnt || 0;
          if (bidCount < filters.auctionBidCount) return false;
        }

        // 5) 입찰 시작일 필터
        if (filters.auctionStartDate && filters.auctionStartDate !== "all") {
          const now = new Date();
          const dateStr = meta.pbctBegnDtm || meta.pblctBgnDtm || meta.bid_start_date || "";
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
      
      // 3. 가격 (만원 단위 / 원 단위 스마트 비교)
      if (filters.priceMin !== null || filters.priceMax !== null) {
        const rawPrice = v.deposit != null ? v.deposit : (v.trade_type === '월세' ? v.deposit_price : v.trade_price);
        if (rawPrice == null) return false;
        // DB에 원 단위(예: 300,000,000)로 저장된 경우 만원 단위로 환산
        const priceInManwon = rawPrice > 100000 ? Math.round(rawPrice / 10000) : rawPrice;
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

      // 6.1 방 개수 (PC 동일)
      if (filters.roomCount !== null) {
        const rooms = v.room_count || (v.rooms ? parseInt(v.rooms, 10) : 0);
        if (rooms < filters.roomCount) return false;
      }

      // 6.2 욕실 개수 (PC 동일)
      if (filters.bathCount !== null) {
        const baths = v.bath_count || (v.bathrooms ? parseInt(v.bathrooms, 10) : 0);
        if (baths < filters.bathCount) return false;
      }

      // 6.3 방향 (PC 동일)
      if (filters.direction && filters.direction !== "전체") {
        const dir = v.direction || v.main_direction || "";
        if (!dir.includes(filters.direction)) return false;
      }

      // 6.4 세대수 (PC 동일)
      if (filters.unitsMin !== null) {
        const units = parseInt(v.total_units, 10) || 0;
        if (units < filters.unitsMin) return false;
      }

      // 6.5 관리비 (PC 동일)
      if (filters.maintMax !== null) {
        const maint = v.maintenance_fee || v.maintenance_cost || v.maint_fee || 0;
        if (maint > filters.maintMax) return false;
      }

      // 6.6 주차 (PC 동일)
      if (filters.parking && filters.parking !== "전체") {
        const park = v.parking || "";
        if (!park.includes(filters.parking)) return false;
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
      // 단, 필터창에서 주소를 검색하여 결과 목록을 볼 때(B스타일)는 필터에서 선택한 구체적인 지역명과 매물 주소를 하드 매칭합니다.
      if (filters.locationSearchType === 'filter') {
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

export function useVacancyFilters(initialVacancies: any[]) {
  const [filters, setFilters] = useState<FilterState>(initialFilterState);

  const filteredVacancies = useMemo(() => {
    return filterVacanciesList(initialVacancies, filters);
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
