// 매물보고서 칸 목록 — 입력란(FlyerForm)과 보고서 화면(canvas)이 같은 칸을 같은 값으로 보게 하는 한 곳 (2026-10-25 사장님: "입력란과 보고서 100% 호환")
// - 화면·입력란 모두 fieldValue() 로 읽는다. 비어 있으면 빈칸 그대로 ("" 를 기본 글로 덮지 않는다 — 지운 글이 다시 나오던 문제)
// - def = 처음 넣는 글 (장식 글·제목). 값이 아직 없을 때만 쓴다
// - ph  = 빈칸일 때 편집 화면에만 흐리게 보이는 안내 (결과물에는 안 나온다)
// - key 는 "pageBadges.page2" 처럼 점으로 안쪽 칸도 가리킨다
// 표·목록(개요 표·임대 표·하이라이트·그래프·로드맵·투자요약 상자·사진 설명)은 각자 입력란이 있다 — 여기는 글 한 칸짜리
// 보고서 화면에 새 글 칸을 만들면 여기에도 꼭 넣는다 (scripts/check-fields.mjs 가 빠진 칸을 찾는다)

export type FieldDef = {
  key: string;
  /** 이 칸이 나오는 쪽 (입력란 탭) — 여러 쪽에 나오면 배열 */
  page: number | number[];
  label: string;
  def?: (info: any) => string;
  /** def 가 다른 칸을 따라 바뀌는 글이면 true — 저장하지 않고 늘 지금 값으로 계산 (회원이 고치면 그때부터 고친 글) */
  live?: boolean;
  ph?: string;
  multiline?: boolean;
  /** 입력란에서 "쪽 꾸밈 글"(제목·머리글·배지)로 접어 둘 칸 */
  deco?: boolean;
};

const s = (v: any) => String(v || '');
const repLine = (i: any) => [s(i.agentName).trim(), s(i.agencyRepresentative).trim() && `대표 ${s(i.agencyRepresentative).trim()}`].filter(Boolean).join(' | ');
const BODY_PAGES = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13];
const head = (page: number, title: string, sub: string, badge?: string): FieldDef[] => [
  { key: `page${page}Title`, page, label: '쪽 제목', def: () => title, deco: true },
  { key: `page${page}Subtitle`, page, label: '쪽 부제목', def: () => sub, deco: true },
  ...(badge ? [{ key: `pageBadges.page${page}`, page, label: '오른쪽 위 배지', def: () => badge, deco: true }] : []),
];
const leaseSummary = (i: any) => {
  const rows = i.leaseTable?.rows || [];
  return rows.length === 1 ? `이 매물 · ${rows[0][3] || ''}` : rows.length ? `총 ${rows.length}건` : '';
};
const priceLabel = (i: any) => {
  const t = i.transactionType || '매매';
  return t === '매매' ? '매매가' : t === '전세' ? '보증금 (전세)' : t === '월세' || t === '임대' ? '보증금 / 월세' : '임대가';
};

export const FIELDS: FieldDef[] = [
  // 0쪽 표지
  { key: 'coverSubtitle', page: 0, label: '표지 윗줄 문구', def: () => '부동산 물건 보고서' },
  { key: 'address', page: [0, 1], label: '보고서 제목 (표지·개요 큰 글씨)', ph: '보고서 제목 입력', multiline: true },
  { key: 'agentLabel', page: 0, label: '중개사 줄 머리글', def: () => 'REALTY AGENCY', deco: true },
  // 표지 중개사 줄은 회원이 마음대로 바꿔 쓴다 ("문의 : 김정일" 처럼) — 고치기 전에는 중개사 정보를 따라간다
  { key: 'coverLine1', page: 0, label: '표지 1줄 (회사·대표)', ph: '회사 이름 | 대표', live: true, def: (i) => i.coverAgentLine ?? repLine(i) },
  { key: 'coverLine2', page: 0, label: '표지 2줄 (등록번호)', ph: '등록번호', live: true, def: (i) => i.coverRegLine ?? (i.agentRegistrationNumber ? `등록번호 : ${i.agentRegistrationNumber}` : '') },
  { key: 'coverLine3', page: 0, label: '표지 3줄 (전화)', ph: '전화번호', live: true, def: (i) => s(i.agentPhone || i.agentMobile) },
  { key: 'coverLine4', page: 0, label: '표지 4줄 (주소)', ph: '사무소 주소', live: true, def: (i) => s(i.agentAddress) },

  // 모든 쪽 아래 글
  { key: 'footerText', page: BODY_PAGES, label: '쪽 아래 글 (모든 쪽 같음)', def: () => 'PROPERTY REPORT', deco: true },

  // 1쪽 개요
  { key: 'subTitle', page: 1, label: '서브 타이틀', ph: '서브 타이틀 입력', multiline: true },
  { key: 'pageBadges.page1', page: 1, label: '오른쪽 위 배지', live: true, deco: true, def: (i) => `${i.subCategory || '매물'} | ${i.transactionType || '매매'}` },
  { key: 'overviewTitle', page: 1, label: '개요 표 제목', def: () => 'PROPERTY OVERVIEW', deco: true },
  { key: 'overviewSubtitle', page: 1, label: '개요 표 부제목', def: () => '물건개요', deco: true },
  { key: 'priceMainLabel', page: 1, label: '가격 칸 이름', live: true, def: priceLabel, deco: true },
  { key: 'priceMain', page: 1, label: '가격', ph: '가격 입력' },
  { key: 'priceSub', page: 1, label: '월세 (월세·단기임대일 때 가격 옆)', ph: '월세' },
  { key: 'agentNameLabel', page: 1, label: '중개사 칸 이름 (부동산명)', def: () => '부동산명', deco: true },
  { key: 'agentRepresentativeLabel', page: 1, label: '중개사 칸 이름 (담당자)', def: () => '담당자', deco: true },
  { key: 'agentContactLabel', page: 1, label: '중개사 칸 이름 (연락처)', def: () => '연락처', deco: true },
  { key: 'investmentTitle', page: 1, label: '투자요약 제목', def: () => 'INVESTMENT SUMMARY', deco: true },
  { key: 'investmentSubtitle', page: 1, label: '투자요약 부제목', def: () => '투자요약', deco: true },

  // 2쪽 매물설명 & 시세
  ...head(2, '매물설명 & 시세', 'Status & Valuation', 'DETAILS'),
  { key: 'page2HighlightHeader', page: 2, label: '쪽 윗줄 머리글', def: () => 'PROPERTY INFORMATION & VALUE', deco: true },
  { key: 'page2HighlightBoxTitle', page: 2, label: '왼쪽 상자 제목', def: () => '매물 핵심 하이라이트' },
  { key: 'valuationAdvisoryTitle', page: 2, label: '왼쪽 아래 글 머리글', def: () => 'STRATEGIC ADVISORY', deco: true },
  { key: 'valuationText', page: 2, label: '왼쪽 아래 글', ph: '설명 입력', multiline: true },
  { key: 'page2ChartBoxTitle', page: 2, label: '오른쪽 상자 제목 (그래프)', def: () => '주변시세 리포트' },
  { key: 'chartAdvisoryTitle', page: 2, label: '오른쪽 아래 글 머리글', def: () => 'STRATEGIC ADVISORY', deco: true },
  { key: 'chartAdviseText', page: 2, label: '오른쪽 아래 글 (그래프 설명)', ph: '그래프 설명 입력', multiline: true },

  // 3쪽 임대 현황
  ...head(3, '임대 상세 현황', 'Rent Roll', 'LEASING'),
  { key: 'page3HighlightHeader', page: 3, label: '표 위 머리글', def: () => 'PROPERTY RENTAL REPORT', deco: true },
  { key: 'leaseSummaryText', page: 3, label: '표 아래 요약 (Total Summary)', live: true, def: leaseSummary, ph: '요약 입력' },
  { key: 'leaseSummaryDesc', page: 3, label: '요약 옆 설명', def: () => '상세 조건은 상담 때 함께 확인해 주세요.', multiline: true },
  { key: 'leaseNotice', page: 3, label: '표 아래 유의 사항', ph: '유의 사항 입력', multiline: true },

  // 4쪽 사진 (사진 설명은 사진 칸마다 — photoCaption)
  ...head(4, '매물 사진', 'Property Photo', 'GALLERY'),

  // 5쪽 입지
  ...head(5, '입지 및 위치도', 'Strategic Connectivity', 'LOCATION'),
  { key: 'page4TargetLocationHeader', page: 5, label: '지도 위 상자 머리글', def: () => 'TARGET LOCATION', deco: true },
  { key: 'areaTargetName', page: 5, label: '타겟 로케이션 (지도 위 상자)', ph: '지역 이름 입력', multiline: true },
  { key: 'page4TargetTitle', page: 5, label: '오른쪽 상자 제목', live: true, ph: '제목 입력', def: (i) => { const n = s(i.areaTargetName).split('\n')[0].trim(); return n ? `${n} 클러스터` : ''; } },
  { key: 'areaTargetDesc', page: 5, label: '입지 설명', ph: '입지 설명 입력', multiline: true },

  // 6쪽 로드맵
  ...head(6, '가치 및 로드맵', 'Value & Roadmap', 'ROADMAP'),
  { key: 'page6FooterQuote', page: 6, label: '아래 인용 문구', def: () => '"최고의 입지에 미래 가치를 더합니다."' },

  // 7쪽 연락처 — 중개사 정보는 개요·끝 쪽이 같은 칸을 쓴다
  { key: 'agentName', page: [1, 7], label: '중개사무소 이름', ph: '중개사무소 이름' },
  { key: 'agencyRepresentative', page: 7, label: '대표자 이름', ph: '대표자' },
  { key: 'agentRepresentative', page: [1, 7], label: '담당자 이름·직급', ph: '담당자' },
  { key: 'agentMobile', page: [1, 7], label: '문의 휴대전화', ph: '휴대전화' },
  { key: 'agentPhone', page: 7, label: '대표 번호', ph: '대표 번호' },
  { key: 'agentRegistrationNumber', page: 7, label: '등록번호', ph: '등록번호' },
  { key: 'agentAddress', page: 7, label: '사무소 주소 (오시는 길)', ph: '사무소 주소', multiline: true },
  { key: 'page7DirectionsTitle', page: 7, label: '오시는 길 제목', def: () => '오시는 길', deco: true },
  { key: 'qrLabel', page: 7, label: 'QR 아래 글 (4번 디자인)', def: () => '네이버 지도', deco: true },

  // 8~13쪽 — 제목·부제목 (표 칸은 보고서 위에서 고친다)
  ...head(8, '지적도', 'Cadastral Map'),
  ...head(9, '건축물대장 요약', 'Building Register'),
  ...head(10, '층별 현황', 'Floor Overview'),
  ...head(11, '실거래 이력', 'Transaction History'),
  ...head(12, '인테리어 전후 예측', 'Interior Before & After'),
  ...head(13, '리모델링 전후 예측', 'Remodeling Before & After'),
];

const BY_KEY = new Map(FIELDS.map((f) => [f.key, f]));
export const fieldDef = (key: string) => BY_KEY.get(key);
export const pageFields = (page: number) => FIELDS.filter((f) => (Array.isArray(f.page) ? f.page.includes(page) : f.page === page));

export const getPath = (obj: any, path: string): any =>
  path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

export const setPath = (obj: any, path: string, value: any): any => {
  const [first, ...rest] = path.split('.');
  if (!rest.length) return { ...obj, [first]: value };
  return { ...obj, [first]: setPath(obj?.[first] || {}, rest.join('.'), value) };
};

/** 입력란·화면이 같이 쓰는 값 — 저장된 값이 있으면 그대로 (빈칸 포함), 없을 때만 처음 글 */
export const fieldValue = (info: any, key: string): string => {
  const v = getPath(info, key);
  if (v !== undefined && v !== null) return String(v);
  const f = BY_KEY.get(key);
  return f?.def ? f.def(info) : '';
};

export const setField = (info: any, key: string, value: string) => setPath(info, key, value);

type Upd = ((info: any) => void) | undefined;
/** 보고서 화면 글 칸(EditableText·EditableBlock)에 그대로 펼쳐 넣는 값 — <EditableText {...fieldProps(info, onUpdateInfo, 'page2Title')} /> */
export const fieldProps = (info: any, upd: Upd, key: string, cls = '') => {
  const d = BY_KEY.get(key);
  return {
    value: fieldValue(info, key),
    onChange: (v: string) => { if (upd) upd(setField(info, key, v)); },
    placeholder: d?.ph || '',
    multiline: !!d?.multiline,
    className: `field-ph ${cls}`.trim(),
  };
};

/** ReportPage 머리(제목·부제목·배지)와 아래 글 — 칸 목록에 배지가 없는 쪽(8~13)은 배지를 쪽에서 따로 준다 */
export const pageHead = (info: any, upd: Upd, page: number) => {
  const on = (key: string) => (v: string) => { if (upd) upd(setField(info, key, v)); };
  const badge = `pageBadges.page${page}`;
  return {
    title: fieldValue(info, `page${page}Title`), onUpdateTitle: on(`page${page}Title`),
    subtitle: fieldValue(info, `page${page}Subtitle`), onUpdateSubtitle: on(`page${page}Subtitle`),
    footerText: fieldValue(info, 'footerText'), onUpdateFooter: on('footerText'),
    ...(BY_KEY.has(badge) ? { badgeText: fieldValue(info, badge), onUpdateBadge: on(badge) } : {}),
  };
};

/** 사진 설명 — 사진 칸 이름(mainImage·photoP2_1)에서 설명 칸(main·p2_1)으로. 입력란·화면 같은 값, 없으면 빈칸 */
const FIRST_CAPTION: Record<string, string> = { mainImage: 'main', subImage1: 'sub1', subImage2: 'sub2', featureImage1: 'feat1', featureImage2: 'feat2' };
export const captionKeyOf = (imageKey: string) => FIRST_CAPTION[imageKey] || imageKey.replace(/^photoP/, 'p');
export const photoCaption = (info: any, captionKey: string) => s(info?.photoCaptions?.[captionKey]);
export const setPhotoCaption = (info: any, captionKey: string, v: string) => ({ ...info, photoCaptions: { ...(info.photoCaptions || {}), [captionKey]: v } });

/** 로드맵 상자 — 화면·입력란·AI 가 같은 목록을 본다 (예전 roadmap.box1~4 → roadmapList) */
const RM_BG = ['bg-[var(--theme-primary)]/10', 'bg-green-50', 'bg-red-50', 'bg-yellow-50'];
const RM_BORDER = ['border-blue-100', 'border-green-100', 'border-red-100', 'border-yellow-100'];
export const roadmapItems = (info: any): { title: string; text: string; icon: string; bg?: string; border?: string }[] =>
  info?.roadmapList || [1, 2, 3, 4].map((n, i) => ({
    title: s(info?.roadmap?.[`box${n}Title`]),
    text: s(info?.roadmap?.[`box${n}Text`]),
    icon: info?.roadmap?.[`box${n}Icon`] || ['🏢', '🏡', '📈', '🏗️'][i],
    bg: RM_BG[i],
    border: RM_BORDER[i],
  }));

/** 불러올 때 한 번 — 아직 없는 칸에 처음 글을 실제 값으로 넣는다 (보이는 글 = 저장된 글).
 *  옛 보고서(fieldsVersion 없음)는 "" 일 때도 화면에 기본 글이 나왔으므로 그 글을 넣어 보이던 그대로 둔다 */
export const FIELDS_VERSION = 1;
export const fillFieldDefaults = (info: any): any => {
  if (!info) return info;
  const old = (Number(info.fieldsVersion) || 0) < 1;
  let next = info;
  if (old) {
    // 화면이 "없으면 다른 칸"으로 보여 주던 것을 그 칸의 실제 값으로 — 입력란에도 똑같이 보이게
    const fill = (to: string, ...from: string[]) => {
      if (s(next[to]).trim()) return;
      const got = from.map((k) => next[k]).find((v) => s(v).trim());
      if (got) next = { ...next, [to]: got };
    };
    fill('agentRegistrationNumber', 'agentRegistrationNo');
    fill('agentMobile', 'agentPhone');
    fill('agentRepresentative', 'agencyRepresentative');
    fill('agencyRepresentative', 'agentRepresentative');
    // 끝 쪽 2번 디자인이 비운 주소 자리에 예시 글을 보여 주던 것 — 예시는 버린다
  }
  for (const f of FIELDS) {
    if (!f.def) continue;
    const v = getPath(next, f.key);
    if (f.live) {
      // 옛 보고서의 "" 는 계산된 글이 보이던 것 — 다시 계산되게 비운다
      if (old && v === '') next = setPath(next, f.key, undefined);
      continue;
    }
    if (v === undefined || v === null || (old && v === '')) next = setPath(next, f.key, f.def(next));
  }
  if (!next.roadmapList) next = { ...next, roadmapList: roadmapItems(next) };
  if (next.fieldsVersion !== FIELDS_VERSION) next = { ...next, fieldsVersion: FIELDS_VERSION };
  return next;
};
