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
  isSale: boolean
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
      return [
        { label: '소재지', dataKey: 'address' },
        { label: '용도지역', dataKey: 'zoning' },
        { label: '대지면적', dataKey: 'landArea' },
        { label: '연면적', dataKey: 'totalArea' },
        { label: '건물규모', dataKey: 'buildingScale' },
        { label: '주용도', dataKey: 'mainPurpose' },
        { label: '주차대수', dataKey: 'parking' },
        { label: '승강기', dataKey: 'elevator' },
        { label: '준공연도', dataKey: 'completionYear' },
      ];

    case 'shop':
      return [
        { label: '소재지', dataKey: 'address' },
        { label: '건물명', dataKey: 'buildingName' },
        { label: '전용면적', dataKey: 'area' },
        { label: '해당층/총층', dataKey: 'floor' },
        { label: '현용도', dataKey: 'currentUse' },
        { label: '권리금', dataKey: 'premiumFee' },
        { label: '주차가능 여부', dataKey: 'parking' },
        { label: '입주가능일', dataKey: 'moveInDate' },
        isSale
          ? { label: '준공연도', dataKey: 'completionYear' }
          : { label: '관리비', dataKey: 'maintenanceFee' },
      ];

    case 'office':
      return [
        { label: '소재지', dataKey: 'address' },
        { label: '건물명', dataKey: 'buildingName' },
        { label: '전용면적', dataKey: 'area' },
        { label: '해당층/총층', dataKey: 'floor' },
        { label: '건물등급', dataKey: 'buildingGrade' },
        { label: '주차대수', dataKey: 'parking' },
        { label: '승강기', dataKey: 'elevator' },
        { label: '입주가능일', dataKey: 'moveInDate' },
        isSale
          ? { label: '준공연도', dataKey: 'completionYear' }
          : { label: '관리비', dataKey: 'maintenanceFee' },
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

    case 'house':
      return [
        { label: '소재지', dataKey: 'address' },
        { label: '용도지역', dataKey: 'zoning' },
        { label: '대지면적', dataKey: 'landArea' },
        { label: '연면적', dataKey: 'totalArea' },
        { label: '건물규모', dataKey: 'buildingScale' },
        { label: '세대수', dataKey: 'unitCount' },
        { label: '주차대수', dataKey: 'parking' },
        { label: '준공연도', dataKey: 'completionYear' },
        { label: '월수익', dataKey: 'monthlyIncome' },
      ];

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
  const raw = (subCategory || propertyType || '').trim();

  if (/아파트/.test(raw)) return 'apartment';
  if (/오피스텔/.test(raw)) return 'officetel';
  if (/빌딩|건물|상가건물/.test(raw)) return 'building';
  if (/상가|점포/.test(raw)) return 'shop';
  if (/사무실/.test(raw)) return 'office';
  if (/토지|나대지/.test(raw)) return 'land';
  if (/단독|다가구|다세대/.test(raw)) return 'house';
  if (/원룸|투룸|쓰리룸|고시원/.test(raw)) return 'studio';

  return 'building'; // 기본값
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
  const template = getOverviewTemplate(category, isSale);

  // vacancy 데이터에서 값 자동 매핑
  const dataMap: Record<string, string> = {
    address: [vacancy.sido, vacancy.sigungu, vacancy.dong].filter(Boolean).join(' ') || '',
    buildingName: vacancy.building_name || '',
    area: formatAreaDisplay(vacancy),
    floor: vacancy.current_floor
      ? `${vacancy.current_floor}층 / 총 ${vacancy.total_floor || '-'}층`
      : '',
    roomCount: vacancy.room_count
      ? `${vacancy.room_count}개 / ${vacancy.bathroom_count || '-'}개`
      : '',
    direction: vacancy.direction || '',
    parking: vacancy.parking || '',
    moveInDate: vacancy.move_in_date || '',
    maintenanceFee: vacancy.maintenance_fee
      ? `${Math.round(vacancy.maintenance_fee / 10000)}만원`
      : '',
    completionYear: vacancy.approval_year ? `${vacancy.approval_year}년` : '',
    // 빌딩/토지용 (데이터가 없으면 공란)
    zoning: vacancy.zoning || '',
    landArea: vacancy.land_area || '',
    totalArea: vacancy.total_area || '',
    buildingScale: vacancy.building_scale || '',
    mainPurpose: vacancy.main_purpose || '',
    elevator: vacancy.elevator || '',
    ...extraData,
  };

  return template.map(field => ({
    label: field.label,
    value: field.dataKey ? (dataMap[field.dataKey] || '') : '',
  }));
};

/** 면적 표시 포맷 헬퍼 */
const formatAreaDisplay = (v: any): string => {
  const supply = v.supply_area_m2 || v.exclusive_area;
  const exclusive = v.exclusive_area_m2 || v.net_area;

  if (supply && exclusive) {
    const supplyPy = (parseFloat(supply) / 3.305785).toFixed(1);
    const exclusivePy = (parseFloat(exclusive) / 3.305785).toFixed(1);
    return `${parseFloat(supply).toFixed(0)}㎡(${supplyPy}평) / ${parseFloat(exclusive).toFixed(0)}㎡(${exclusivePy}평)`;
  }
  if (supply) {
    const py = (parseFloat(supply) / 3.305785).toFixed(1);
    return `${parseFloat(supply).toFixed(0)}㎡(${py}평)`;
  }
  return '';
};
