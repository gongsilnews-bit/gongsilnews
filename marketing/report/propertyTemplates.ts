/**
 * 물건 유형별 개요 테이블 필드 템플릿
 * 
 * 각 유형마다 9개 필드를 정의하며, 10번째 행(가격)은 별도 로직으로 처리됨.
 * 거래유형(매매/임대)에 따라 9번 칸이 교체되는 유형은 sale/rent 분기 적용.
 */

export type PropertyCategory = 
  | 'apartment'    // 아파트
  | 'officetel'    // 오피스텔
  | 'building'     // 빌딩/상가건물
  | 'shop'         // 상가/점포
  | 'office'       // 사무실
  | 'land'         // 토지
  | 'house'        // 단독/다가구
  | 'studio';      // 원룸/투룸

export interface OverviewField {
  label: string;
  dataKey?: string;  // vacancy 데이터에서 자동 매핑할 키
}

/**
 * 물건 유형별 9개 필드 템플릿 반환
 * @param category 물건 유형
 * @param isSale true=매매, false=임대(전세/월세/단기)
 */
export const getOverviewTemplate = (
  category: PropertyCategory,
  isSale: boolean,
  subCategory?: string
): OverviewField[] => {
  switch (category) {
    case 'apartment':
      return [
        { label: '소재지', dataKey: 'address' },
        { label: '단지명', dataKey: 'buildingName' },
        { label: '공급/전용면적', dataKey: 'area' },
        { label: '해당층/총층', dataKey: 'floor' },
        { label: '방/욕실수', dataKey: 'roomCount' },
        { label: '방향', dataKey: 'direction' },
        { label: '주차가능 여부', dataKey: 'parking' },
        { label: '입주가능일', dataKey: 'moveInDate' },
        isSale
          ? { label: '준공연도', dataKey: 'completionYear' }
          : { label: '관리비', dataKey: 'maintenanceFee' },
      ];

    case 'officetel':
      return [
        { label: '소재지', dataKey: 'address' },
        { label: '건물명', dataKey: 'buildingName' },
        { label: '공급/전용면적', dataKey: 'area' },
        { label: '해당층/총층', dataKey: 'floor' },
        { label: '방/욕실수', dataKey: 'roomCount' },
        { label: '방향', dataKey: 'direction' },
        { label: '주차가능 여부', dataKey: 'parking' },
        { label: '입주가능일', dataKey: 'moveInDate' },
        isSale
          ? { label: '준공연도', dataKey: 'completionYear' }
          : { label: '관리비', dataKey: 'maintenanceFee' },
      ];

    case 'building':
      if (subCategory === "지식산업센터") {
        if (isSale) {
          return [
            { label: '소재지', dataKey: 'address' },
            { label: '공급 / 전용면적', dataKey: 'area' },
            { label: '해당층 / 총층', dataKey: 'floor' },
            { label: '호실 용도', dataKey: 'mainPurpose' },
            { label: '특화 구조 / 접근성', dataKey: 'jisangSpecialStructure' },
            { label: '층고 / 사용 전력', dataKey: 'jisangHeightPower' },
            { label: '준공연도', dataKey: 'jisangCompletionYear' },
            { label: '주차 / 승강기', dataKey: 'parkingElevator' },
            { label: '임대수익(수익률)', dataKey: 'rentalYield' },
          ];
        } else {
          return [
            { label: '소재지', dataKey: 'address' },
            { label: '공급 / 전용면적', dataKey: 'area' },
            { label: '해당층 / 총층', dataKey: 'floor' },
            { label: '호실 용도', dataKey: 'mainPurpose' },
            { label: '특화 구조 / 접근성', dataKey: 'jisangSpecialStructure' },
            { label: '층고 / 사용 전력', dataKey: 'jisangHeightPower' },
            { label: '준공연도', dataKey: 'jisangCompletionYear' },
            { label: '주차 / 승강기', dataKey: 'parkingElevator' },
            { label: '관리비', dataKey: 'maintenanceFee' },
          ];
        }
      }

      if (isSale) {
        return [
          { label: '소재지', dataKey: 'address' },
          { label: '용도지역', dataKey: 'zoning' },
          { label: '대지 / 연면적', dataKey: 'landTotalArea' },
          { label: '건폐율 / 용적률', dataKey: 'coverageFar' },
          { label: '건물 규모', dataKey: 'buildingScaleYear' },
          { label: '도로 조건 / 구조', dataKey: 'roadStructure' },
          { label: '건축물용도 / 현용도', dataKey: 'mainUsageCurrent' },
          { label: '주차 / 승강기', dataKey: 'parkingElevator' },
          { label: '임대수익(수익률)', dataKey: 'rentalYield' },
        ];
      }
      return [
        { label: '소재지', dataKey: 'address' },
        { label: '공급 / 전용면적', dataKey: 'area' },
        { label: '건물 규모', dataKey: 'buildingScale' },
        { label: '준공연도 / 구조', dataKey: 'buildingScaleYearOnly' },
        { label: '도로 조건', dataKey: 'roadWidth' },
        { label: '건축물 주용도', dataKey: 'mainPurpose' },
        { label: '주차 / 승강기', dataKey: 'parkingElevator' },
        { label: '사용가능일', dataKey: 'moveInDate' },
        { label: '관리비', dataKey: 'maintenanceFee' },
      ];

    case 'shop':
      if (isSale) {
        return [
          { label: '소재지', dataKey: 'address' },
          { label: '건물명', dataKey: 'buildingName' },
          { label: '공급/전용면적', dataKey: 'area' },
          { label: '해당층/총층', dataKey: 'floor' },
          { label: '현용도', dataKey: 'currentUse' },
          { label: '주차 / 사용가능일', dataKey: 'parkingMoveIn' },
          { label: '준공연도', dataKey: 'completionYear' },
          { label: '건축물용도/구조', dataKey: 'mainUsageStructure' },
          { label: '임대수익(수익률)', dataKey: 'rentalYield' },
        ];
      }
      return [
        { label: '소재지', dataKey: 'address' },
        { label: '건물명', dataKey: 'buildingName' },
        { label: '공급/전용면적', dataKey: 'area' },
        { label: '해당층/총층', dataKey: 'floor' },
        { label: '현용도', dataKey: 'currentUse' },
        { label: '권리금', dataKey: 'premiumFee' },
        { label: '주차가능 여부', dataKey: 'parking' },
        { label: '사용가능일', dataKey: 'moveInDate' },
        { label: '관리비', dataKey: 'maintenanceFee' },
      ];

    case 'office':
      if (isSale) {
        return [
          { label: '소재지', dataKey: 'address' },
          { label: '건물명', dataKey: 'buildingName' },
          { label: '공급/전용면적', dataKey: 'area' },
          { label: '해당층/총층', dataKey: 'floor' },
          { label: '현용도', dataKey: 'currentUse' },
          { label: '주차 / 사용가능일', dataKey: 'parkingMoveIn' },
          { label: '준공연도', dataKey: 'completionYear' },
          { label: '건축물용도/구조', dataKey: 'mainUsageStructure' },
          { label: '임대수익(수익률)', dataKey: 'rentalYield' },
        ];
      }
      return [
        { label: '소재지', dataKey: 'address' },
        { label: '건물명', dataKey: 'buildingName' },
        { label: '전용면적', dataKey: 'area' },
        { label: '해당층/총층', dataKey: 'floor' },
        { label: '건물등급', dataKey: 'buildingGrade' },
        { label: '주차대수', dataKey: 'parking' },
        { label: '승강기', dataKey: 'elevator' },
        { label: '사용가능일', dataKey: 'moveInDate' },
        { label: '관리비', dataKey: 'maintenanceFee' },
      ];

    case 'land':
      return [
        { label: '소재지', dataKey: 'address' },
        { label: '지목', dataKey: 'landCategory' },
        { label: '용도지역', dataKey: 'zoning' },
        { label: '대지면적', dataKey: 'landArea' },
        { label: '건폐율/용적률', dataKey: 'coverageRatio' },
        { label: '도로조건', dataKey: 'roadCondition' },
        { label: '지형/형상', dataKey: 'terrain' },
        { label: '현재이용', dataKey: 'currentUse' },
        { label: '개발가능', dataKey: 'developmentPotential' },
      ];

    case 'house': {
      // 빌라/연립 매매인 경우 공급/전용면적 아래에 대지/용도 1줄로 추가, 관리비 삭제
      const isVillaSale = isSale && ["빌라/연립", "빌라"].includes(subCategory || '');
      if (isVillaSale) {
        return [
          { label: '소재지', dataKey: 'address' },
          { label: '건물명', dataKey: 'buildingName' },
          { label: '공급/전용면적', dataKey: 'area' },
          { label: '대지 / 용도', dataKey: 'landAreaZoning' },
          { label: '해당층/총층', dataKey: 'floor' },
          { label: '방/욕실수', dataKey: 'roomCount' },
          { label: '방향', dataKey: 'direction' },
          { label: '주차가능 여부', dataKey: 'parking' },
          { label: '입주가능일', dataKey: 'moveInDate' },
        ];
      }

      // 단독/다가구, 전원주택, 상가주택 매매일 경우 건물형 필드 (대지면적, 연면적, 건물규모 등)
      const isStandaloneSale = isSale && ["단독/다가구", "전원주택", "상가주택"].includes(subCategory || '');
      if (isStandaloneSale) {
        return [
          { label: '소재지', dataKey: 'address' },
          { label: '대지면적/연면적', dataKey: 'landTotalArea' },
          { label: '건폐율/용적률', dataKey: 'coverageFar' },
          { label: '용도지역', dataKey: 'zoning' },
          { label: '지상/지하층수', dataKey: 'buildingScale' },
          { label: '도로폭/방향', dataKey: 'roadWidthDirection' },
          { label: '주차대수', dataKey: 'parking' },
          { label: '사용가능일', dataKey: 'moveInDate' },
          { label: '준공연도', dataKey: 'completionYear' },
        ];
      }
      return [
        { label: '소재지', dataKey: 'address' },
        { label: '건물명', dataKey: 'buildingName' },
        { label: '공급/전용면적', dataKey: 'area' },
        { label: '해당층/총층', dataKey: 'floor' },
        { label: '방/욕실수', dataKey: 'roomCount' },
        { label: '방향', dataKey: 'direction' },
        { label: '주차가능 여부', dataKey: 'parking' },
        { label: '입주가능일', dataKey: 'moveInDate' },
        { label: '관리비', dataKey: 'maintenanceFee' },
      ];
    }

    case 'studio':
      return [
        { label: '소재지', dataKey: 'address' },
        { label: '건물명', dataKey: 'buildingName' },
        { label: '전용면적', dataKey: 'area' },
        { label: '해당층/총층', dataKey: 'floor' },
        { label: '방/욕실수', dataKey: 'roomCount' },
        { label: '방향', dataKey: 'direction' },
        { label: '주차가능 여부', dataKey: 'parking' },
        { label: '입주가능일', dataKey: 'moveInDate' },
        { label: '관리비', dataKey: 'maintenanceFee' },
      ];

    default:
      // 기본값: 빌딩 템플릿
      return getOverviewTemplate('building', isSale);
  }
};

/**
 * 공실뉴스 데이터의 카테고리 문자열 → PropertyCategory 변환
 */
export const detectPropertyCategory = (
  subCategory?: string,
  propertyType?: string
): PropertyCategory => {
  const sub = (subCategory || '').trim();

  // 1. 2차 카테고리(subCategory) 정확한 매칭을 최우선으로 처리 (혼동 방지)
  if (["아파트", "아파트분양권", "도시형생활주택"].includes(sub)) return 'apartment';
  if (["오피스텔", "오피스텔분양권", "생활숙박시설"].includes(sub)) return 'officetel';
  if (["빌라/연립", "단독/다가구", "전원주택", "상가주택", "빌라"].includes(sub)) return 'house';
  if (["건물/빌딩", "공장/창고", "지식산업센터"].includes(sub)) return 'building';
  if (["상가", "상가/업무"].includes(sub)) return 'shop';
  if (["사무실"].includes(sub)) return 'office';
  if (["토지"].includes(sub)) return 'land';
  if (["원룸", "1.5룸", "투룸"].includes(sub)) return 'studio';

  // 2. 1차 카테고리(propertyType) 매칭
  const type = (propertyType || '').trim();
  if (type === "아파트·오피스텔") return 'apartment'; 
  if (type === "빌라·주택") return 'house';
  if (type === "원룸·투룸(풀옵션)") return 'studio';
  if (type === "상가·사무실·건물·공장·토지") return 'building';

  // 3. 예전 데이터나 텍스트 직접 입력 시트를 위한 폴백 매칭 (가장 나중)
  const raw = (sub || type || '').trim();
  if (/아파트/.test(raw)) return 'apartment';
  if (/오피스텔/.test(raw)) return 'officetel';
  if (/빌라|주택|단독|다가구|다세대/.test(raw)) return 'house';
  if (/빌딩|건물|상가건물/.test(raw)) return 'building';
  if (/상가|점포/.test(raw)) return 'shop';
  if (/사무실/.test(raw)) return 'office';
  if (/토지|나대지/.test(raw)) return 'land';
  if (/원룸|투룸|쓰리룸|고시원/.test(raw)) return 'studio';

  return 'building'; // 기본값
};

/**
 * 만원 단위 숫자를 한글 금액(억, 천, 만)으로 포맷팅
 */
const formatKoreanAmountFromMan = (num: number): string => {
  if (isNaN(num) || num <= 0) return '';
  const eok = Math.floor(num / 10000);
  const man = num % 10000;
  let result = '';
  if (eok > 0) result += `${eok}억`;
  if (man > 0) {
    let manStr = '';
    const cheon = Math.floor(man / 1000);
    const rest = man % 1000;

    if (cheon > 0) manStr += `${cheon}천`;
    if (rest > 0) {
      manStr += rest;
    }
    result += (eok > 0 ? ' ' : '') + `${manStr}만`;
  }
  return result.trim();
};

/**
 * 대지면적 포맷 (metadata.land_share_m2 / land_share_py)
 */
const formatLandArea = (meta: any): string => {
  const m2 = meta.land_share_m2;
  const py = meta.land_share_py;
  if (m2 && py) return `${Number(py).toFixed(1)}평 (${Number(m2).toFixed(1)}㎡)`;
  if (m2) return `${Number(m2).toFixed(1)}㎡ (${(Number(m2) * 0.3025).toFixed(1)}평)`;
  if (py) return `${Number(py).toFixed(1)}평`;
  return '';
};

/**
 * 연면적/총면적 포맷 (supply_m2/supply_py — 건물 매매 시 연면적으로 사용)
 */
const formatTotalArea = (vacancy: any): string => {
  const m2 = vacancy.supply_m2;
  const py = vacancy.supply_py;
  if (m2 && py) return `${Number(py).toFixed(1)}평 (${Number(m2).toFixed(1)}㎡)`;
  if (m2) return `${Number(m2).toFixed(1)}㎡ (${(Number(m2) * 0.3025).toFixed(1)}평)`;
  if (py) return `${Number(py).toFixed(1)}평`;
  return '';
};

/**
 * 건물규모 포맷 (metadata.ground_floors / underground_floors → "지상5층 / 지하1층")
 */
const formatBuildingScale = (meta: any, vacancy: any): string => {
  const ground = meta.ground_floors;
  const underground = meta.underground_floors;
  if (ground || underground) {
    const parts: string[] = [];
    if (ground) parts.push(`지상 ${ground}층`);
    if (underground) parts.push(`지하 ${underground}층`);
    return parts.join(' / ');
  }
  // fallback: current_floor / total_floor
  if (vacancy.total_floor) return `총 ${vacancy.total_floor}층`;
  return '';
};

/**
 * 승강기 포맷 (metadata.elevator_cnt)
 */
const formatElevator = (meta: any): string => {
  const cnt = meta.elevator_cnt;
  if (!cnt) return '';
  if (cnt === '없음' || cnt === '0') return '없음';
  const num = parseInt(cnt, 10);
  if (!isNaN(num)) return `${num}대`;
  return cnt;
};

/**
 * vacancy 데이터에서 overviewTable 배열을 자동 생성
 */
export const buildOverviewTable = (
  vacancy: any,
  category: PropertyCategory,
  isSale: boolean,
  extraData?: Record<string, string>
): { label: string; value: string }[] => {
  const subCategory = vacancy.sub_category || '';
  const template = getOverviewTemplate(category, isSale, subCategory);
  const meta = vacancy.metadata || {};

  // vacancy 데이터에서 값 자동 매핑
  // 주의: 빌딩/상가 관련 필드는 vacancy.metadata.* 에 저장됨 (VacancyRegisterForm 참조)
  const dataMap: Record<string, string> = {
    // 공통 필드 (최상위)
    address: [vacancy.sido, vacancy.sigungu, vacancy.dong].filter(Boolean).join(' ') || '',
    buildingName: vacancy.building_name || '',
    area: formatAreaDisplay(vacancy),
    floor: vacancy.current_floor
      ? `${vacancy.current_floor}층 / 총 ${vacancy.total_floor || '-'}층`
      : '',
    roomCount: vacancy.room_count
      ? `${vacancy.room_count}개 / ${vacancy.bath_count || vacancy.bathroom_count || '-'}개`
      : '',
    direction: vacancy.direction || '',
    parking: vacancy.parking || '',
    moveInDate: vacancy.move_in_date || '',
    maintenanceFee: vacancy.maintenance_fee
      ? `${Math.round(vacancy.maintenance_fee / 10000)}만원`
      : '',
    completionYear: vacancy.metadata?.approval_year ? (vacancy.metadata.approval_year <= 1979 ? "1980년 이전" : `${vacancy.metadata.approval_year}년`) : '',

    // 빌딩/상가/토지용 — metadata 내부 필드 참조
    zoning: meta.zoning || '',
    landCategory: meta.land_purpose || '',
    coverageRatio: (() => {
      const cov = meta.building_coverage || meta.coverage;
      const far = meta.floor_area_ratio || meta.far;
      if (cov && far) return `건폐율 ${cov}% / 용적률 ${far}%`;
      if (cov) return `건폐율 ${cov}%`;
      if (far) return `용적률 ${far}%`;
      return '';
    })(),
    roadCondition: meta.road_width ? `${meta.road_width}m 도로 접함` : '',
    terrain: meta.terrain || '',
    developmentPotential: meta.development_potential || '',
    landArea: formatLandArea(meta),
    landAreaZoning: [formatLandArea(meta), meta.zoning].filter(Boolean).join(' / '),
    totalArea: formatTotalArea(vacancy),
    buildingScale: formatBuildingScale(meta, vacancy),
    mainPurpose: meta.jisan_usage || meta.main_usage || meta.main_purpose || '',
    currentUse: meta.current_usage || '',
    premiumFee: (() => {
      let valMan = 0;
      if (meta.premium_fee !== undefined && meta.premium_fee !== null) {
        valMan = parseFloat(meta.premium_fee);
      } else if (vacancy.premium) {
        valMan = Math.round(parseFloat(vacancy.premium) / 10000);
      }
      const amt = formatKoreanAmountFromMan(valMan);
      return amt ? `${amt}원` : '없음';
    })(),
    buildingGrade: meta.building_grade || '',
    mainUsageStructure: [meta.main_usage, meta.building_structure].filter(Boolean).join(' / '),
    elevator: formatElevator(meta),
    landTotalArea: (() => {
      const land = formatLandArea(meta);
      const total = formatTotalArea(vacancy);
      if (land && total) return `대지 ${land} / 연면적 ${total}`;
      return land || total || '';
    })(),
    coverageFar: (() => {
      const cov = meta.building_coverage || meta.coverage;
      const far = meta.floor_area_ratio || meta.far;
      if (cov && far) return `건폐율 ${cov}% / 용적률 ${far}%`;
      if (cov) return `건폐율 ${cov}%`;
      if (far) return `용적률 ${far}%`;
      return '';
    })(),
    buildingScaleYear: (() => {
      const scale = formatBuildingScale(meta, vacancy);
      const year = meta.approval_year ? `${meta.approval_year}년 준공` : '';
      if (scale && year) return `${scale} (${year})`;
      return scale || year || '';
    })(),
    roadStructure: (() => {
      const width = meta.road_width ? `${meta.road_width}m 도로 접함` : '';
      const structure = meta.building_structure || '';
      if (width && structure) return `${width} / ${structure}`;
      return width || structure || '';
    })(),
    mainUsageCurrent: (() => {
      const main = meta.main_usage || meta.main_purpose || '';
      const cur = meta.current_usage || '';
      if (main && cur) return `${main} / ${cur}`;
      return main || cur || '';
    })(),
    parkingElevator: (() => {
      let park = vacancy.parking && vacancy.parking !== '없음' ? `주차 ${vacancy.parking}` : '';
      if (meta.free_parking_cnt) {
        park += ` (무료 ${meta.free_parking_cnt}대)`;
      }
      const elev = meta.has_freight_elevator ? '화물승강기' : formatElevator(meta);
      if (park && elev) return `${park} / ${elev}`;
      return park || elev || '';
    })(),
    jisangSpecialStructure: (() => {
      const parts: string[] = [];
      if (meta.has_drive_in) parts.push('드라이브인');
      if (meta.has_door_to_door) parts.push('도어투도어');
      if (meta.has_freight_elevator) parts.push('화물승강기');
      return parts.join(', ') || '없음';
    })(),
    jisangHeightPower: (() => {
      const h = meta.ceiling_height ? `${meta.ceiling_height}m` : '';
      const p = meta.power_capacity ? `${meta.power_capacity}kW` : '';
      if (h && p) return `${h} / ${p}`;
      return h || p || '미입력';
    })(),
    buildingScaleYearOnly: (() => {
      const year = meta.approval_year ? `${meta.approval_year}년 준공` : '';
      const structure = meta.building_structure || '';
      if (year && structure) return `${year} / ${structure}`;
      return year || structure || '';
    })(),
    jisangCompletionYear: meta.approval_year ? `${meta.approval_year}년 준공` : '',
    roadWidth: meta.road_width ? `${meta.road_width}m 도로 접함` : '',
    roadWidthDirection: (() => {
      const width = meta.road_width ? `${meta.road_width}m` : '';
      const dir = meta.road_direction ? `${meta.road_direction}` : '';
      if (width && dir) return `${width} / ${dir}`;
      return width || dir || '';
    })(),
    parkingMoveIn: [vacancy.parking, vacancy.move_in_date].filter(Boolean).join(' / '),
    salePrice: (() => {
      const d = vacancy.deposit;
      if (!d) return '';
      const num = parseFloat(d);
      if (isNaN(num) || num <= 0) return '';
      // deposit는 원 단위 → 만원으로 변환
      const man = Math.round(num / 10000);
      const eok = Math.floor(man / 10000);
      const remainder = man % 10000;
      let result = '';
      if (eok > 0) result += `${eok}억`;
      if (remainder > 0) result += (result ? ' ' : '') + `${remainder}만`;
      return (result || '0') + '원';
    })(),
    rentalYield: (() => {
      const dep = meta.current_rental_deposit;
      const mon = meta.current_rental_monthly;
      // deposit는 원 단위, rental는 만원 단위 → 만원으로 통일
      const salePriceMan = Math.round(parseFloat(vacancy.deposit || '0') / 10000);
      if (!mon || salePriceMan <= 0) return '';
      const monthly = parseFloat(mon);
      const deposit = dep ? parseFloat(dep) : 0;
      const yieldRate = parseFloat((monthly * 12 / salePriceMan * 100).toFixed(2));
      let result = '';
      if (deposit > 0) {
        const depStr = formatKoreanAmountFromMan(deposit);
        result += `보증금 ${depStr} / `;
      }
      const monStr = formatKoreanAmountFromMan(monthly);
      result += `월 ${monStr} (연 ${yieldRate}%)`;
      return result;
    })(),
    ...extraData,
  };

  return template.map(field => ({
    label: field.label,
    value: field.dataKey ? (dataMap[field.dataKey] || '') : '',
  }));
};

/** 면적 표시 포맷 헬퍼 */
const formatAreaDisplay = (v: any): string => {
  const supply = v.supply_m2;
  const exclusive = v.exclusive_m2;

  if (supply && exclusive) {
    const supplyVal = parseFloat(supply);
    const exclusiveVal = parseFloat(exclusive);
    const supplyPy = (supplyVal / 3.3058).toFixed(1);
    const exclusivePy = (exclusiveVal / 3.3058).toFixed(1);
    return `${supplyVal.toFixed(0)}㎡(${supplyPy}평) / ${exclusiveVal.toFixed(0)}㎡(${exclusivePy}평)`;
  }
  if (supply) {
    const val = parseFloat(supply);
    const py = (val / 3.3058).toFixed(1);
    return `${val.toFixed(0)}㎡(${py}평)`;
  }
  if (exclusive) {
    const val = parseFloat(exclusive);
    const py = (val / 3.3058).toFixed(1);
    return `${val.toFixed(0)}㎡(${py}평)`;
  }
  return '';
};

/**
 * 거래유형 × 물건유형 기반 투자요약 3박스 자동 생성
 * Gemini 호출 없이 기존 vacancy 데이터만 활용
 */
export const buildInvestmentSummary = (
  vacancy: any,
  category: PropertyCategory,
  transactionType: string
): {
  sectionTitle: string;
  sectionSubtitle: string;
  box1Title: string; box1Text: string;
  box2Title: string; box2Text: string;
  box3Title: string; box3Text: string;
} => {
  const direction = vacancy.direction || '';
  const parking = vacancy.parking || '';
  const moveIn = vacancy.move_in_date || '즉시입주';
  const maintenance = vacancy.maintenance_fee
    ? `${Math.round(vacancy.maintenance_fee / 10000)}만원`
    : '';
  const monthlyRent = vacancy.monthly_rent
    ? `${Math.round(vacancy.monthly_rent / 10000)}만`
    : '';
  const buildingName = vacancy.building_name || '';
  const roomCount = vacancy.room_count || '';
  const exclusiveM2 = vacancy.exclusive_m2 ? parseFloat(vacancy.exclusive_m2) : 0;
  const exclusivePy = exclusiveM2 ? `${(exclusiveM2 / 3.3058).toFixed(0)}평` : '';
  const approvalYear = vacancy.metadata?.approval_year ? (vacancy.metadata.approval_year <= 1979 ? "1980년 이전" : `${vacancy.metadata.approval_year}년`) : '';

  // 방향 텍스트
  const dirText = direction ? `${direction}\n채광 우수` : '우수한\n채광 조건';
  // 주차 텍스트
  const parkText = parking && parking !== '없음' ? `주차 ${parking}\n확보` : '대중교통\n우수';
  // 면적+방 텍스트
  const unitText = exclusivePy && roomCount
    ? `${exclusivePy} ${roomCount}룸\n${direction || '효율형'}`
    : roomCount
      ? `${roomCount}룸 구조\n분리형`
      : '넓은 공간\n활용';

  switch (transactionType) {
    case '매매': {
      const meta = vacancy.metadata || {};
      const isCommercialSale = ['shop', 'office', 'building'].includes(category);
      const rentalMon = meta.current_rental_monthly ? parseFloat(meta.current_rental_monthly) : 0;
      const rentalDep = meta.current_rental_deposit ? parseFloat(meta.current_rental_deposit) : 0;
      const salePriceMan = Math.round(parseFloat(vacancy.deposit || '0') / 10000);

      // box2: 상가/사무실/건물 매매일 때 임대현황
      let box2Title = category === 'apartment' || category === 'officetel'
        ? 'BRAND' : 'ASSET QUALITY';
      let box2Text = buildingName
        ? `${buildingName}\n브랜드 단지`
        : approvalYear
          ? `${approvalYear}년 준공\n우수 관리`
          : '내외관\n리모델링';

      if (isCommercialSale && rentalMon > 0) {
        box2Title = 'RENTAL';
        const depStr = rentalDep > 0 ? formatKoreanAmountFromMan(rentalDep) : '';
        const monStr = formatKoreanAmountFromMan(rentalMon);
        box2Text = depStr ? `보증금 ${depStr}\n월 ${monStr}원` : `월 ${monStr}원\n임대 중`;
      }

      // box3: 상가/사무실/건물 매매일 때 수익률
      let box3Title = 'UNIT';
      let box3Text = unitText;

      if (isCommercialSale && rentalMon > 0 && salePriceMan > 0) {
        box3Title = 'YIELD';
        const yieldRate = parseFloat((rentalMon * 12 / salePriceMan * 100).toFixed(2));
        box3Text = `연 ${yieldRate}%\n수익률`;
      }

      return {
        sectionTitle: 'INVESTMENT SUMMARY',
        sectionSubtitle: '투자요약',
        box1Title: 'LOCATION',
        box1Text: dirText,
        box2Title,
        box2Text,
        box3Title,
        box3Text,
      };
    }

    case '전세': {
      const isCommercial = ['shop', 'office', 'building'].includes(category);
      const moveInLabel = isCommercial ? '사용 가능' : '입주 가능';
      const moveInText = moveIn === '즉시입주' || moveIn.includes('즉시')
        ? (isCommercial ? '즉시사용\n가능' : '즉시입주\n가능')
        : `${moveIn}\n${moveInLabel}`;

      return {
        sectionTitle: 'LIVING SUMMARY',
        sectionSubtitle: isCommercial ? '사용요약' : '생활요약',
        box1Title: 'LOCATION',
        box1Text: dirText,
        box2Title: 'PARKING',
        box2Text: parkText,
        box3Title: isCommercial ? 'USE-DATE' : 'MOVE-IN',
        box3Text: moveInText,
      };
    }

    case '월세':
    case '단기임대': {
      const isCommercial = ['shop', 'office', 'building'].includes(category);
      // 월 총비용 계산
      const totalCost = monthlyRent && maintenance
        ? `월세 ${monthlyRent}\n관리비 ${maintenance}`
        : monthlyRent
          ? `월 ${monthlyRent}\n합리적 비용`
          : maintenance
            ? `관리비\n${maintenance}`
            : '합리적\n임대 조건';

      const moveInLabel = isCommercial ? '사용 가능' : '입주 가능';
      const moveInText = moveIn === '즉시입주' || moveIn.includes('즉시')
        ? (isCommercial ? '즉시사용\n가능' : '즉시입주\n가능')
        : `${moveIn}\n${moveInLabel}`;

      return {
        sectionTitle: 'RENTAL SUMMARY',
        sectionSubtitle: isCommercial ? '임대요약' : '입주요약',
        box1Title: 'LOCATION',
        box1Text: dirText,
        box2Title: 'TOTAL COST',
        box2Text: totalCost,
        box3Title: isCommercial ? 'USE-DATE' : 'MOVE-IN',
        box3Text: moveInText,
      };
    }

    default:
      return {
        sectionTitle: 'INVESTMENT SUMMARY',
        sectionSubtitle: '투자요약',
        box1Title: 'CONNECTIVITY',
        box1Text: dirText,
        box2Title: 'ASSET QUALITY',
        box2Text: parkText,
        box3Title: 'SUITABILITY',
        box3Text: unitText,
      };
  }
};

/**
 * Page2 (매물설명 & 시세) 콘텐츠 자동 생성
 * 차트 라벨, 하이라이트, 어드바이저리를 거래유형 × 물건유형으로 생성
 */
export const buildPage2Content = (
  vacancy: any,
  category: PropertyCategory,
  transactionType: string
): {
  highlights: string[];
  chartBars: { label: string; value: string; isHighlight: boolean }[];
  valuationText: string;
  page2Title: string;
  page2Subtitle: string;
  page2HighlightHeader: string;
} => {
  const direction = vacancy.direction || '';
  const parking = vacancy.parking || '';
  const moveIn = vacancy.move_in_date || '즉시입주';
  const buildingName = vacancy.building_name || '';
  const roomCount = vacancy.room_count || '';
  const approvalYear = vacancy.metadata?.approval_year ? (vacancy.metadata.approval_year <= 1979 ? "1980년 이전" : `${vacancy.metadata.approval_year}년`) : '';
  const maintenance = vacancy.maintenance_fee
    ? `${Math.round(vacancy.maintenance_fee / 10000)}만원`
    : '';
  const address = [vacancy.sido, vacancy.sigungu, vacancy.dong].filter(Boolean).join(' ');

  // ── 차트 라벨 (거래유형별) ──
  let chartBars: { label: string; value: string; isHighlight: boolean }[];

  switch (transactionType) {
    case '매매':
      chartBars = [
        { label: '탁상감정가', value: '', isHighlight: false },
        { label: '기존 희망가', value: '', isHighlight: false },
        { label: '인근 시세', value: '', isHighlight: false },
        { label: '현재 매매가', value: '', isHighlight: true },
      ];
      break;
    case '전세':
      chartBars = [
        { label: '단지 평균 전세', value: '', isHighlight: false },
        { label: '주변 전세 시세', value: '', isHighlight: false },
        { label: '최근 실거래', value: '', isHighlight: false },
        { label: '현재 전세가', value: '', isHighlight: true },
      ];
      break;
    case '월세':
    case '단기임대':
    default:
      chartBars = [
        { label: '주변 평균 월세', value: '', isHighlight: false },
        { label: '단지 평균 월세', value: '', isHighlight: false },
        { label: '최근 실거래', value: '', isHighlight: false },
        { label: '현재 월세', value: '', isHighlight: true },
      ];
      break;
  }

  // ── 하이라이트 (물건유형 × 거래유형) ──
  const highlights: string[] = [];

  // 1. 방향/채광
  if (direction) {
    highlights.push(`채광 우수: ${direction} 배치로 밝고 쾌적한 주거 환경`);
  }

  // 2. 교통/입지
  highlights.push(
    transactionType === '매매'
      ? `입지 가치: ${address || '우수한 입지'} 역세권 프리미엄`
      : `교통 편의: ${address || '주요 지역'} 대중교통 접근 우수`
  );

  // 3. 주차
  if (parking && parking !== '없음') {
    highlights.push(`주차 편의: ${parking} 주차 가능`);
  }

  // 4. 입주조건/건물상태
  if (transactionType === '매매') {
    if (approvalYear) {
      highlights.push(`건물 상태: ${approvalYear}년 준공, 관리 상태 양호`);
    }
    if (buildingName) {
      highlights.push(`브랜드 가치: ${buildingName} 단지 프리미엄`);
    }
  } else {
    if (moveIn) {
      highlights.push(`입주 조건: ${moveIn} 가능`);
    }
    if (maintenance) {
      highlights.push(`관리비: 월 ${maintenance}으로 합리적 관리`);
    }
  }

  // 5. 방/구조
  if (roomCount) {
    highlights.push(`공간 구성: ${roomCount}룸 구조로 효율적 공간 활용`);
  }

  // 최소 4개 보장
  while (highlights.length < 4) {
    highlights.push(
      transactionType === '매매'
        ? '투자 가치: 안정적 자산 가치 상승 기대'
        : '생활 환경: 주변 편의시설 및 인프라 우수'
    );
  }

  // ── 어드바이저리 텍스트 ──
  let valuationText: string;
  if (transactionType === '매매') {
    valuationText = buildingName
      ? `본 자산은 ${buildingName} 단지의 우수한 입지와 시설을 갖추고 있어, 안정적인 자산 가치와 향후 프리미엄 상승이 기대됩니다.`
      : `본 자산의 시세는 최근 실거래가 및 시장 동향을 반영하여 산출되었습니다. 입지 조건에 따른 프리미엄이 내재되어 있어 향후 가치 상승이 기대됩니다.`;
  } else {
    valuationText = maintenance
      ? `본 물건은 월세 및 관리비(${maintenance})를 포함하여 합리적인 주거 비용으로 쾌적한 생활이 가능합니다. 주변 시세 대비 경쟁력 있는 조건입니다.`
      : `본 물건은 주변 시세 대비 경쟁력 있는 임대 조건을 갖추고 있으며, 교통 및 생활 인프라가 우수한 입지에 위치해 있습니다.`;
  }

  // ── 페이지 제목 ──
  const page2Title = transactionType === '매매'
    ? '매물설명 & 시세'
    : '매물설명 & 임대시세';
  const page2Subtitle = 'Status & Valuation';
  const page2HighlightHeader = transactionType === '매매'
    ? '매물 핵심 하이라이트'
    : '입주 핵심 포인트';

  return {
    highlights: highlights.slice(0, 4),
    chartBars,
    valuationText,
    page2Title,
    page2Subtitle,
    page2HighlightHeader,
  };
};

/**
 * Page5 (입지 및 위치도) 콘텐츠 자동 생성
 * 주소(sido, sigungu, dong)와 물건 카테고리에 맞춰 텍스트 생성
 */
export const buildPage5Content = (
  vacancy: any,
  category: PropertyCategory
): {
  areaTargetName: string;
  areaTargetDesc: string;
  areaBox1Title: string;
  areaBox1Text: string;
  areaBox2Title: string;
  areaBox2Text: string;
  areaBox3Title: string;
  areaBox3Text: string;
  page4TargetTitle: string;
} => {
  const sido = vacancy.sido || '';
  const sigungu = vacancy.sigungu || '';
  const dong = vacancy.dong || '';
  const buildingName = vacancy.building_name || '';

  const locName = dong ? `${dong} 일대` : sigungu ? `${sigungu} 일대` : '해당 지역';
  const displaySigungu = sigungu || '인근';
  const displayDong = dong || sigungu || '해당 지역';

  // 1. 타겟 로케이션 뱃지
  const areaTargetName = `${locName}\n대중교통 및 우수한 입지`;

  // 2. 우측 박스 타이틀 및 설명 (주거형 vs 상업용/기타)
  const isResidential = ['apartment', 'officetel', 'house', 'studio'].includes(category);
  const page4TargetTitle = `${locName} 주거·업무 클러스터`;

  let areaTargetDesc = '';
  if (isResidential) {
    areaTargetDesc = `본 자산이 위치한 ${locName} 주변은 우수한 교육 및 생활 밀착형 인프라가 조성되어 있어 주거 편의성이 매우 뛰어납니다. 대중교통 접근성이 양호하고 인근 상권이 잘 정비되어 있어 안정적인 주거 임차 수요가 강점입니다.`;
  } else {
    areaTargetDesc = `본 자산이 위치한 ${locName} 일대는 주요 업무 지구 및 활성화된 상권이 인접하여 배후 유동인구와 비즈니스 수요가 매우 풍부합니다. 주요 도로망 진입이 용이해 직주근접성 및 물류/업무 효율성을 극대화할 수 있는 핵심 입지입니다.`;
  }

  // 3. 하단 3개 특징 박스
  const areaBox1Title = 'TRANSIT / 교통';
  const areaBox1Text = `${displaySigungu} 내 주요 전철역 및 다수의 버스 노선 접근이 용이하여 출퇴근 및 대중교통 편리성 확보`;

  const areaBox2Title = 'LIFE / 인프라';
  const areaBox2Text = isResidential
    ? `단지 인근 생활 편의시설, 마트, 카페 및 쾌적한 근린 공원이 인접하여 원스톱 생활권 형성`
    : `오피스 타운, 은행, 주요 행정기관 및 상업 편의시설 밀집으로 편리한 비즈니스 환경 지원`;

  const areaBox3Title = 'VALUE / 미래가치';
  const areaBox3Text = `${displayDong} 주변의 지속적인 인프라 확충 및 정비사업 등으로 안정적인 임대 수요 유지와 향후 자산가치 상승 기대`;

  return {
    areaTargetName,
    areaTargetDesc,
    areaBox1Title,
    areaBox1Text,
    areaBox2Title,
    areaBox2Text,
    areaBox3Title,
    areaBox3Text,
    page4TargetTitle,
  };
};

/**
 * Page6 (가치 및 로드맵) 콘텐츠 자동 생성
 * 거래유형 x 물건카테고리에 최적화된 로드맵 카드 생성
 */
export const buildPage6Content = (
  vacancy: any,
  category: PropertyCategory,
  transactionType: string
): {
  page6Title: string;
  page6Subtitle: string;
  page6Badge: string;
  page6FooterQuote: string;
  roadmap: {
    box1Title: string; box1Text: string; box1Icon: string;
    box2Title: string; box2Text: string; box2Icon: string;
    box3Title: string; box3Text: string; box3Icon: string;
    box4Title: string; box4Text: string; box4Icon: string;
  };
} => {
  const isResidential = ['apartment', 'officetel', 'house', 'studio'].includes(category);
  const dong = vacancy.dong || vacancy.sigungu || '해당 지역';

  // 1. 주거용 임대 (전세, 월세, 단기임대)
  if (isResidential && (transactionType === '월세' || transactionType === '전세' || transactionType === '단기임대')) {
    return {
      page6Title: '주거 가치 & 추천 전략',
      page6Subtitle: 'Living Strategy',
      page6Badge: 'LIVING STRATEGY',
      page6FooterQuote: `"${dong}에서 편리하고 품격 있는 라이프스타일을 시작해 보세요."`,
      roadmap: {
        box1Title: '완벽한 교통 및 직주근접',
        box1Text: '지하철역 및 주요 도로망이 인접하여 도심 주요 업무 지구 및 핵심 상권으로 신속한 출퇴근 및 대중교통 이동이 가능합니다.',
        box1Icon: '🚗',
        box2Title: '편리한 원스톱 라이프',
        box2Text: '도보 거리에 대형마트, 은행, 병원 및 풍부한 먹거리와 인프라 상권이 완벽히 조성되어 우수한 정주 여건을 보장합니다.',
        box2Icon: '🛒',
        box3Title: '안전한 주거 안심 케어',
        box3Text: '입주민 전용 카드키, CCTV 및 체계적인 관리 시스템을 적용하여 외부 침입 걱정 없이 프라이빗하고 안심할 수 있는 환경입니다.',
        box3Icon: '🔒',
        box4Title: '합리적인 유지 비용 관리',
        box4Text: '단열 및 난방 효율이 우수한 친환경 자재 마감과 세대 수 대비 낮은 공동 관리비로 매월 합리적인 가계 소비가 가능합니다.',
        box4Icon: '💵',
      }
    };
  }

  // 2. 주거용 매매 (아파트, 오피스텔 등)
  if (isResidential && transactionType === '매매') {
    return {
      page6Title: '자산 가치 & 주거 로드맵',
      page6Subtitle: 'Asset Roadmap',
      page6Badge: 'ASSET ROADMAP',
      page6FooterQuote: `"${dong} 최고의 생활 환경에서 편리한 일상과 자산 가치 상승을 함께 누리세요."`,
      roadmap: {
        box1Title: '최고의 정주 여건 만족',
        box1Text: '우수한 학군, 단지 근린공원 및 편리한 생활 인프라를 일상에서 누릴 수 있어 장기 거주 시 만족도가 매우 뛰어납니다.',
        box1Icon: '🏡',
        box2Title: '입지 희소성 및 시세 방어',
        box2Text: '대기 수요가 탄탄한 도심 주거 핵심지에 위치하여 인플레이션에 강하며 안정적인 시세 상승 및 탁월한 가격 방어력을 보입니다.',
        box2Icon: '📈',
        box3Title: '공실 걱정 없는 임대 운영',
        box3Text: '역세권 입지와 1~2인 가구 중심의 임대 수요를 확보하기 용이해 향후 임대 전환 시에도 지속적이고 안정적인 캐시플로우가 창출됩니다.',
        box3Icon: '💰',
        box4Title: '리모델링을 통한 가치 상승',
        box4Text: '인테리어 현대식 리뉴얼을 통해 주변 유사 매물 대비 한 차원 높은 보증금 및 월세 책정이 가능하며 단기적 시세 견인이 가능합니다.',
        box4Icon: '🛠️',
      }
    };
  }

  // 3. 상업용/사무실 임대 (빌딩, 상가, 오피스 등 x 전월세)
  if (!isResidential && (transactionType === '월세' || transactionType === '전세' || transactionType === '단기임대')) {
    return {
      page6Title: '비즈니스 공간 & 추천 전략',
      page6Subtitle: 'Business Blueprint',
      page6Badge: 'BUSINESS BLUEPRINT',
      page6FooterQuote: `"귀사의 성장과 비즈니스 성공을 위한 최상의 업무 파트너가 되어 드립니다."`,
      roadmap: {
        box1Title: '비즈니스 효율 공간 설계',
        box1Text: '팀원 간 유기적인 협업과 집중도 향상을 고려한 스마트 레이아웃으로, 넓고 쾌적한 비즈니스 및 컨퍼런스 룸 활용이 용이합니다.',
        box1Icon: '🏢',
        box2Title: '최적의 대외 네트워킹',
        box2Text: '파트너사 방문 및 바이어 초청 시 품격 있는 첫인상을 심어줄 수 있는 자주식 무료 주차 혜택과 높은 빌딩 인지도를 지닙니다.',
        box2Icon: '🚇',
        box3Title: '고정 비용 절감 효과',
        box3Text: '인근 유사 프라임급 빌딩 대비 합리적이고 조율 가능한 임대료와 관리비 조건으로 장기 운영 시 고정 비용 절감을 실현합니다.',
        box3Icon: '📉',
        box4Title: '신속한 공공 업무 편의',
        box4Text: '도보 5분 거리 내 세무서, 우체국, 구청 및 주요 시중은행들이 밀집해 있어 신속하고 매끄러운 오피스 행정 처리를 돕습니다.',
        box4Icon: '🤝',
      }
    };
  }

  // 4. 상업용 매매 (빌딩, 상가 등 x 매매) -> 기존 유지
  return {
    page6Title: '가치 및 로드맵',
    page6Subtitle: 'Value & Roadmap',
    page6Badge: 'INVESTMENT ROADMAP',
    page6FooterQuote: '"최고의 입지에 미래 가치를 더합니다."',
    roadmap: {
      box1Title: '단독 사옥 활용 시나리오',
      box1Text: '전층 명도 협의 후 기업의 아이덴티티를 투영한 단독 사옥으로 활용합니다. 역세권 입지의 상징성을 동시에 확보할 수 있는 최상의 환경을 제공합니다.',
      box1Icon: '🏢',
      box2Title: '주거 및 근생 수익 모델',
      box2Text: '상층부 실거주를 통해 최고의 직주근접 환경을 실현합니다. 하층부는 오피스 및 상가 임대를 통해 안정적인 월세 수익을 확보할 수 있습니다.',
      box2Icon: '🏡',
      box3Title: '수익형 자산 밸류업 전략',
      box3Text: '주택 부분의 근생 용도변경 및 전면 리모델링을 통해 우량 법인 임차를 유치합니다. 자산 가치 극대화 후 시세 차익 실현에 집중하는 투자 안입니다.',
      box3Icon: '📈',
      box4Title: '역세권 오피스 개발안',
      box4Text: '높은 용적률을 활용한 고품격 오피스 빌딩 신축 개발입니다. 역세권 입지의 희소성을 활용하여 개발 이익을 극대화할 수 있습니다.',
      box4Icon: '🏗️',
    }
  };
};


