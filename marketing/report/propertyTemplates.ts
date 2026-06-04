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
  const approvalYear = vacancy.approval_year || '';

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
    case '매매':
      return {
        sectionTitle: 'INVESTMENT SUMMARY',
        sectionSubtitle: '투자요약',
        box1Title: 'LOCATION',
        box1Text: dirText,
        box2Title: category === 'apartment' || category === 'officetel'
          ? 'BRAND' : 'ASSET QUALITY',
        box2Text: buildingName
          ? `${buildingName}\n브랜드 단지`
          : approvalYear
            ? `${approvalYear}년 준공\n우수 관리`
            : '내외관\n리모델링',
        box3Title: 'UNIT',
        box3Text: unitText,
      };

    case '전세':
      return {
        sectionTitle: 'LIVING SUMMARY',
        sectionSubtitle: '생활요약',
        box1Title: 'LOCATION',
        box1Text: dirText,
        box2Title: 'PARKING',
        box2Text: parkText,
        box3Title: 'MOVE-IN',
        box3Text: moveIn === '즉시입주' || moveIn.includes('즉시')
          ? '즉시입주\n가능'
          : `${moveIn}\n입주 가능`,
      };

    case '월세':
    case '단기임대':
      // 월 총비용 계산
      const totalCost = monthlyRent && maintenance
        ? `월세 ${monthlyRent}\n관리비 ${maintenance}`
        : monthlyRent
          ? `월 ${monthlyRent}\n합리적 비용`
          : maintenance
            ? `관리비\n${maintenance}`
            : '합리적\n임대 조건';

      return {
        sectionTitle: 'RENTAL SUMMARY',
        sectionSubtitle: '입주요약',
        box1Title: 'LOCATION',
        box1Text: dirText,
        box2Title: 'TOTAL COST',
        box2Text: totalCost,
        box3Title: 'MOVE-IN',
        box3Text: moveIn === '즉시입주' || moveIn.includes('즉시')
          ? '즉시입주\n가능'
          : `${moveIn}\n입주 가능`,
      };

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
