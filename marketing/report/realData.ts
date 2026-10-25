/* ══════════════════════════════════════════════════════════════
   매물보고서에 가짜(예시) 데이터가 나가지 않게 — 2026-10-15 사장님 결정 "가짜 데이터가 나오면 절대 안 됨"

   예전에는 처음 화면을 예시 값(논현동 500억 빌딩, 501호 사무실 월세 450만, 시세 그래프 80·75·85·65 …)으로
   채운 뒤 일부만 실제 매물로 덮어서, 덮지 않은 칸(임대 현황 표·MD 추천 전략·그래프·사진 설명 등)이
   예시 그대로 손님에게 나갔다.
   - 새로 만들 때: 실제 매물 정보로 만들 수 있는 칸은 실제로, 없는 자료(다른 호실 임대 현황·시세 그래프 숫자)는 비운다
   - 저장본을 열 때: 예전 예시 값이 남아 있으면 지우고 실제 값으로 바꾼다 (scrubSampleInfo)
   ══════════════════════════════════════════════════════════════ */
import { detectPropertyCategory, buildInvestmentSummary, buildPage2Content, buildPage5Content, buildPage6Content } from './propertyTemplates';

/* 원 → "5억", "3억 5,000만" */
export function wonText(amt: number) {
  const m = Math.round((Number(amt) || 0) / 10000);
  if (m <= 0) return '';
  const e = Math.floor(m / 10000);
  const r = m % 10000;
  if (e && r) return `${e}억 ${r.toLocaleString()}만`;
  if (e) return `${e}억`;
  return `${r.toLocaleString()}만`;
}

function priceOf(v: any) {
  const deposit = wonText(v.deposit);
  const rent = wonText(v.monthly_rent);
  if (v.trade_type === '매매') return deposit ? `매매 ${deposit}` : '';
  if (rent) return `보증금 ${deposit || '0'} / 월세 ${rent}`;
  return deposit ? `${v.trade_type || '전세'} ${deposit}` : '';
}

function areaOf(v: any) {
  const ex = parseFloat(v.exclusive_m2);
  return ex ? `${ex}㎡(${(ex / 3.3058).toFixed(1)}평)` : '';
}

/* 층 표기 — 숫자면 "3층", "저층"·"3층"처럼 이미 글이면 그대로 ("저층층" 방지) */
export const floorText = (x: any) => {
  const t = String(x ?? '').trim();
  if (!t) return '';
  return /^-?\d+$/.test(t) ? `${t}층` : t;
};

const HEADERS = ['층수', '호실', '면적', '금액', '현용도', '기타'];

/** 3쪽 임대 현황 표 — 공실뉴스에 있는 것은 이 매물 한 줄뿐이다. 다른 호실은 중개사가 직접 더한다 */
export function buildLeaseTable(v: any) {
  const floor = floorText(v.current_floor);
  const row = [
    floor,
    '', // 호실 — 공실뉴스에 따로 없다 (중개사가 적는다)
    areaOf(v),
    priceOf(v),
    v.sub_category || v.property_type || '',
    v.move_in_date ? `입주 ${v.move_in_date}` : '',
  ];
  return { headers: HEADERS, rows: [row], widths: [10, 10, 15, 35, 15, 15] };
}

/** 3쪽 오른쪽 상자 — 실제 조건만 줄로 */
export function buildLeaseRight(v: any) {
  const lines: string[] = [];
  const push = (label: string, value: string) => { if (value) lines.push(`• ${label}: ${value}`); };
  push('거래 조건', priceOf(v));
  push('관리비', v.maintenance_fee ? `${wonText(v.maintenance_fee)}원` : '');
  push('면적', areaOf(v) ? `전용 ${areaOf(v)}` : '');
  push('층', v.current_floor ? `${floorText(v.current_floor)}${v.total_floor ? ` / 총 ${floorText(v.total_floor)}` : ''}` : '');
  push('입주', v.move_in_date || '');
  push('주차', v.parking || '');
  return { title: '임대 조건 요약', text: lines.join('\n') };
}

export const LEASE_NOTICE = '※ 위 표는 공실뉴스에 등록된 이 매물의 조건입니다. 다른 호실의 임대 현황은 중개사가 직접 확인해 적습니다.';

/* 예전 예시 값 알아보기 (글자 일부로) */
const SAMPLE = {
  lease: /501호|노래연습장|B01호/,
  leaseRight: /MD 리뉴얼|메디컬\/클리닉|책임명도 지원/,
  floor: /가족 거주|가족 사용|소유주 직접 관리/,
  highlights: /파격적인 금매가|오피스 밀집지로 배후수요|용도변경 등 전폭적 지원/,
  valuation: /역세권 500억|감정가 대비 강력한 시세 차익/,
  area: /남부터미널|예술의전당|서초중앙로/,
  roadmap: /단독 사옥 활용 시나리오|역세권 오피스 개발안|서초동 초역세권/,
  invest: /전철역\n도보 4분|사옥 및\n수익형 최적/,
  caption: /^(EXTERIOR VIEW - 건물 정면 외관|Side View|Entrance|1F Interior|Rooftop)$/,
};
const SAMPLE_BARS = ['80', '75', '85', '65'];
const has = (re: RegExp, x: unknown) => re.test(typeof x === 'string' ? x : JSON.stringify(x || ''));

/** 저장본·처음 값에 남은 예시 값을 실제 값(없으면 빈칸)으로 바꾼다 */
export function scrubSampleInfo(info: any, v: any) {
  const out = { ...info };
  const cat = detectPropertyCategory(v.sub_category, v.property_type);
  const trade = v.trade_type || '매매';

  if (!out.leaseTable || !Array.isArray(out.leaseTable.rows) || !out.leaseTable.rows.length || has(SAMPLE.lease, out.leaseTable.rows)) {
    out.leaseTable = buildLeaseTable(v);
    out.leaseNotice = LEASE_NOTICE;
  }
  if (!out.leaseRightText || has(SAMPLE.leaseRight, out.leaseRightText)) {
    const right = buildLeaseRight(v);
    out.leaseRightTitle = right.title;
    out.leaseRightText = right.text;
  }
  if (has(SAMPLE.floor, out.floorStatus) || has(SAMPLE.floor, out.floorStatusNotice)) {
    out.floorStatus = [];
    out.floorStatusNotice = '';
  }
  if (has(SAMPLE.highlights, out.highlights) || has(SAMPLE.valuation, out.valuationText)) {
    const p2 = buildPage2Content(v, cat, trade);
    out.highlights = p2.highlights;
    out.valuationText = p2.valuationText;
  }
  // 시세 그래프: 공실뉴스에 시세 자료가 없다 — 예시 숫자면 지우고 숨긴다 (중개사가 숫자를 넣으면 보인다)
  const bars = Array.isArray(out.chartBars) ? out.chartBars : [];
  const sampleBars = bars.length === 4 && bars.every((b: any, i: number) => String(b?.value) === SAMPLE_BARS[i]);
  if (sampleBars || !bars.some((b: any) => String(b?.value || '').trim())) {
    out.chartBars = buildPage2Content(v, cat, trade).chartBars;
    out.showChart = false;
  }
  if (has(SAMPLE.area, [out.areaTargetName, out.areaTargetDesc, out.areaBox1Text, out.areaBox2Text, out.areaBox3Text])) {
    Object.assign(out, buildPage5Content(v, cat));
  }
  if (has(SAMPLE.roadmap, out.roadmap)) {
    const p6 = buildPage6Content(v, cat, trade);
    out.roadmap = p6.roadmap;
    delete out.roadmapList; // 화면은 roadmapList 를 본다 — 새 로드맵으로 다시 만들게
  }
  if (has(SAMPLE.invest, out.investmentSummary)) {
    const s = buildInvestmentSummary(v, cat, trade);
    out.investmentSummary = { box1Title: s.box1Title, box1Text: s.box1Text, box2Title: s.box2Title, box2Text: s.box2Text, box3Title: s.box3Title, box3Text: s.box3Text };
  }
  // 사진 설명: 어느 사진에 무엇이 찍혔는지 모르므로 예시 이름("Rooftop" 등)은 비운다
  const caps = { ...(out.photoCaptions || {}) };
  for (const k of Object.keys(caps)) if (SAMPLE.caption.test(String(caps[k] || ''))) caps[k] = '';
  out.photoCaptions = caps;
  return out;
}
