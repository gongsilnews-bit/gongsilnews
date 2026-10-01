import type { FlyerRow } from './types';

/*
 * 유리창 홍보지 — 물건 종류별로 처음 채워 넣는 크기 줄 · 정보 표.
 * 규칙 문서: docs/2026-10-01_window_flyer_by_property_type.md (묶음 A~G)
 *
 * 처음 한 번만 채운다. 그 뒤로는 사장님이 지우고·고치고·추가한 표를 그대로 쓴다.
 * 값이 비어 있는 항목은 홍보지에 나오지 않는다 (입력란에서 채우면 나온다).
 */

export type FlyerGroup = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export const GROUP_NAME: Record<FlyerGroup, string> = {
  A: '아파트·오피스텔', B: '빌라·원룸', C: '단독·다가구', D: '상가', E: '사무실·지식산업센터', F: '건물·공장', G: '토지',
};

export function flyerGroupOf(propertyType = '', sub = ''): FlyerGroup {
  if (sub === '토지') return 'G';
  if (sub === '건물/빌딩' || sub === '공장/창고') return 'F';
  if (sub === '사무실' || sub === '지식산업센터') return 'E';
  if (sub === '상가' || sub === '상가/업무') return 'D';
  if (['단독/다가구', '전원주택', '상가주택'].includes(sub)) return 'C';
  if (propertyType === '원룸·투룸(풀옵션)' || sub === '빌라/연립' || sub === '빌라') return 'B';
  return 'A';
}

/** 원 → '5억 3천' */
function won(amt: number): string {
  if (!amt) return '';
  const m = Math.round(amt / 10000);
  if (!m) return '';
  const e = Math.floor(m / 10000), r = m % 10000;
  let out = e ? `${e}억` : '';
  if (r) {
    const c = Math.floor(r / 1000), rem = r % 1000;
    const rest = `${c ? `${c}천` : ''}${rem ? rem : ''}`;
    out += (out ? ' ' : '') + rest + (!e && !c && rem ? '만' : '');
  }
  return out;
}
/** 만원 단위 숫자 → '1억 2천' / '800만' */
const manwon = (v: unknown) => {
  const n = Number(v);
  return n ? won(n * 10000) || `${n}만` : '';
};
const num = (v: unknown) => (v === null || v === undefined || v === '' ? '' : String(v));
const py = (m2: unknown) => (Number(m2) ? `${Math.round(Number(m2) / 3.3058)}평` : '');
const m2py = (m2: unknown) => (Number(m2) ? `${Number(m2)}㎡(${(Number(m2) / 3.3058).toFixed(1)}평)` : '');
const join = (parts: string[], sep = ' · ') => parts.filter(Boolean).join(sep);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildFlyerRows(v: any): { group: FlyerGroup; sizeLine: string; rows: FlyerRow[]; showPhoto: boolean } {
  const m = v.metadata || {};
  const get = (k: string) => m[k] ?? v[k];
  const group = flyerGroupOf(v.property_type, v.sub_category);
  const options: string[] = Array.isArray(v.options) ? v.options : v.options ? String(v.options).split(',').map((s: string) => s.trim()) : [];
  const themes: string[] = Array.isArray(v.themes) ? v.themes : [];

  const cur = num(v.current_floor), tot = num(v.total_floor);
  const floor = cur ? (tot ? `${cur}층/${tot}층` : `${cur}층`) : '';
  const supPy = py(v.supply_m2), excPy = py(v.exclusive_m2);
  const landM2 = get('land_share_m2');
  const landPy = py(landM2);
  const area = join([v.supply_m2 ? `공급 ${m2py(v.supply_m2)}` : '', v.exclusive_m2 ? `전용 ${m2py(v.exclusive_m2)}` : ''], ' / ');
  const rooms = v.room_count || v.bath_count ? `${num(v.room_count) || '-'}개 / ${num(v.bath_count) || '-'}개` : '';
  const fee = v.maintenance_fee ? `${Math.round(v.maintenance_fee / 10000)}만원` : '';
  const year = num(get('approval_year')) ? `${get('approval_year')}년` : '';
  const floors = join([num(get('ground_floors')) ? `지상 ${get('ground_floors')}층` : '', num(get('underground_floors')) ? `지하 ${get('underground_floors')}층` : ''], ' / ');
  const road = join([num(get('road_width')) ? `${get('road_width')}m` : '', get('road_direction') || ''], ' ');
  const rental = join([manwon(get('current_rental_deposit')), manwon(get('current_rental_monthly'))], ' / ');
  const optionText = options.join(', ');

  let id = 0;
  const row = (label: string, value: string): FlyerRow => ({ id: `r${Date.now()}-${id++}`, label, value: value || '' });

  let sizeLine = '';
  let rows: FlyerRow[] = [];
  switch (group) {
    case 'A':
      sizeLine = join([supPy || excPy, cur ? `${cur}층` : '']);
      rows = [row('면적', area), row('방/욕실', rooms), row('방향', v.direction), row('동', v.apt_dong ? `${v.apt_dong}동` : ''),
        row('관리비', fee), row('입주', v.move_in_date), row('준공', year), row('세대수', ''), row('커뮤니티', ''), row('옵션', optionText)];
      break;
    case 'B':
      sizeLine = join([excPy ? `전용 ${excPy}` : supPy, v.room_count ? `방 ${v.room_count}개` : '', cur ? `${cur}층` : '']);
      rows = [row('면적', area), row('방/욕실', rooms), row('방향', v.direction),
        row('엘리베이터', options.includes('엘리베이터') ? '있음' : ''), row('주차', v.parking), row('관리비', fee),
        row('입주', v.move_in_date), row('준공', year), row('옵션', optionText.replace(/(^|, )엘리베이터(?=,|$)/, '').replace(/^, /, ''))];
      break;
    case 'C':
      sizeLine = join([landPy ? `대지 ${landPy}` : supPy, floors]);
      rows = [row('대지면적', m2py(landM2)), row('연면적', m2py(v.supply_m2)), row('용도지역', get('zoning')), row('도로', road),
        row('준공', year), row('구조', get('building_structure')), row('주차', v.parking), row('현 임대', rental), row('옵션', optionText)];
      break;
    case 'D':
      sizeLine = join([excPy ? `전용 ${excPy}` : supPy, floor]);
      rows = [row('면적', area), row('권리금', manwon(get('premium_fee')) || (themes.includes('무권리') ? '무권리' : '')),
        row('현 업종', get('current_usage')), row('관리비', fee), row('주차', v.parking), row('입주', v.move_in_date),
        row('특징', themes.join(', ')), row('옵션', optionText)];
      break;
    case 'E':
      sizeLine = join([excPy ? `전용 ${excPy}` : supPy, floor]);
      rows = [row('면적', area), row('관리비', fee),
        row('주차', join([v.parking, num(get('free_parking_cnt')) ? `무료 ${get('free_parking_cnt')}대` : ''])),
        row('입주', v.move_in_date), row('준공', year), row('층고', num(get('ceiling_height')) ? `${get('ceiling_height')}m` : ''),
        row('진입', join([get('has_drive_in') ? '드라이브인' : '', get('has_door_to_door') ? '도어투도어' : '', get('has_freight_elevator') ? '화물승강기' : ''], ', ')),
        row('옵션', optionText)];
      break;
    case 'F':
      sizeLine = join([landPy ? `대지 ${landPy}` : supPy, floors]);
      rows = [row('대지면적', m2py(landM2)), row('연면적', m2py(v.supply_m2)), row('용도지역', get('zoning')), row('도로', road),
        row('건폐율/용적률', join([num(get('building_coverage')) ? `${get('building_coverage')}%` : '', num(get('floor_area_ratio')) ? `${get('floor_area_ratio')}%` : ''], ' / ')),
        row('준공', year), row('승강기', num(get('elevator_cnt')) ? `${get('elevator_cnt')}대` : ''), row('현 임대', rental),
        row('층고/전력', join([num(get('ceiling_height')) ? `층고 ${get('ceiling_height')}m` : '', num(get('power_capacity')) ? `${get('power_capacity')}kW` : ''], ' / ')),
        row('옵션', optionText)];
      break;
    case 'G': {
      const landArea = Number(landM2) || Number(v.supply_m2);
      const perPy = landArea && v.deposit ? won(v.deposit / (landArea / 3.3058)) : '';
      sizeLine = join([py(landArea), get('land_purpose')]);
      rows = [row('면적', m2py(landArea)), row('지목', get('land_purpose')), row('용도지역', get('zoning')), row('도로', road),
        row('지형', get('terrain')), row('개발 가능성', get('development_potential')), row('평당가', perPy ? `평당 ${perPy}` : '')];
      break;
    }
  }
  return { group, sizeLine, rows, showPhoto: group !== 'A' };
}
