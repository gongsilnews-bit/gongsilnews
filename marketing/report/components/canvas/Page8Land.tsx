import React from 'react';
import { PropertyInfo, FlyerColor, FlyerLayout } from '../../types';
import { ReportPage, EditableText } from '../shared';

/**
 * 8. 지적도 · 9. 건축물대장 요약 (2026-10-24 사장님: 로드맵 뒤에)
 *  자료는 왼쪽 [지적도·건축물대장 가져오기]가 서버(/api/report/land)에서 받아 info.landInfo 에 넣는다.
 *  공부(公簿)에 있는 실제 값만 — 없는 칸은 줄째 뺀다 (지어내지 않음).
 */
export type LandBuilding = {
  name: string; dong?: string; kind: string; mainAtch: string; purpose: string; etcPurpose: string; structure: string; roof: string;
  platArea: number | null; archArea: number | null; totArea: number | null; bcRat: number | null; vlRat: number | null; height: number | null;
  grndFlr: number | null; ugrndFlr: number | null; households: number | null; families: number | null; elevators: number; parking: number;
  permitDay: string; useAprDay: string;
};
export type LandInfo = {
  pnu: string; jibunAddr: string; roadAddr: string; center: [number, number];
  parcels: { pnu: string; jibun: string; rings: number[][][] }[]; cadastralError: string;
  zones?: { name: string; rings: number[][][] }[];
  landChar?: { year: string; jimok: string; area: number | null; zoning: string; price: number | null; road: string; terrain: string; use: string } | null;
  buildings: LandBuilding[]; buildingError: string; fetchedAt: string;
  /** 아파트·오피스텔 — 단지(건물) 전체 · 이 매물 호실 */
  multiUnit?: boolean;
  complex?: { name: string; households: number | null; families: number | null; units: number | null; dongs: number | null; platArea: number | null; archArea: number | null; totArea: number | null; bcRat: number | null; vlRat: number | null; parking: number | null; purpose: string; useAprDay: string } | null;
  unit?: { dong: string; ho: string; floor: string; purpose: string; etcPurpose: string; structure: string; exclusive: number | null; common: number | null } | null;
};

interface PageProps {
  info: PropertyInfo;
  pageString: string;
  isHidden: boolean;
  layoutTheme: FlyerLayout;
  colorTheme: FlyerColor;
  onUpdateInfo?: (info: any) => void;
}

const ymd = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; };
const day8 = (s: string) => (/^\d{8}$/.test(s) ? `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6)}` : s);
const m2 = (v: number | null) => (v ? `${v.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}㎡ (${(v / 3.3058).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}평)` : '');
/** 타입 구성 — 소수점만 다른 전용면적(84.01·84.07·84.21㎡)은 "84㎡형" 하나로 묶는다 (사람들이 부르는 84타입, 2026-10-24 사장님) */
export type TypeGroup = { key: string; label: string; exMin: number; exMax: number; supMin: number | null; supMax: number | null; count: number };
export const typeGroups = (types: { exclusive: number; supply: number | null; count: number }[] = []): TypeGroup[] => {
  const g = new Map<string, TypeGroup>();
  for (const t of types) {
    const key = String(Math.round(t.exclusive));
    const x = g.get(key) || { key, label: `${key}㎡형`, exMin: t.exclusive, exMax: t.exclusive, supMin: null, supMax: null, count: 0 };
    x.exMin = Math.min(x.exMin, t.exclusive); x.exMax = Math.max(x.exMax, t.exclusive); x.count += t.count;
    if (t.supply) { x.supMin = x.supMin === null ? t.supply : Math.min(x.supMin, t.supply); x.supMax = x.supMax === null ? t.supply : Math.max(x.supMax, t.supply); }
    g.set(key, x);
  }
  return [...g.values()].sort((a, b) => a.exMin - b.exMin);
};
const range = (a: number | null, b: number | null) => (a === null || b === null ? '' : Math.abs(a - b) < 0.05 ? `${a}` : `${a}~${b}`);
const tint = (hex: string, a: string) => (/^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${a}` : hex);

/* 받은 값 고치기 · 줄 숨기기 (2026-10-24 사장님) — 원래 받은 값은 그대로 두고 info.publicEdits[칸] · info.publicHidden[줄] 에 따로 적는다.
   다시 받아도 고친 값·숨긴 줄은 남고, 고친 쪽에는 출처 끝에 "중개사가 수정함"이 붙는다 (손님이 공공자료 그대로인지 알 수 있게) */
type Ed = {
  v: (k: string, orig: string) => string; set: (k: string, t: string) => void; hidden: (k: string) => boolean; hide: (k: string) => void; touched: (prefix: string) => boolean;
  /** 회원이 [+ 행 추가]로 넣은 줄 (표마다) */
  added: (t: string) => string[][]; addRow: (t: string, cols: number) => void; setCell: (t: string, r: number, c: number, v: string) => void; delRow: (t: string, r: number) => void;
};
const useEd = (info: any, onUpdateInfo?: (info: any) => void): Ed => {
  const edits: Record<string, string> = info.publicEdits || {};
  const hidden: Record<string, boolean> = info.publicHidden || {};
  const added: Record<string, string[][]> = info.publicAdded || {};
  const putAdded = (t: string, rows: string[][]) => onUpdateInfo && onUpdateInfo({ ...info, publicAdded: { ...added, [t]: rows } });
  return {
    added: (t) => added[t] || [],
    addRow: (t, cols) => putAdded(t, [...(added[t] || []), Array.from({ length: cols }, () => '')]),
    setCell: (t, r, c, v) => putAdded(t, (added[t] || []).map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row))),
    delRow: (t, r) => putAdded(t, (added[t] || []).filter((_, i) => i !== r)),
    v: (k, orig) => (edits[k] !== undefined ? edits[k] : orig),
    set: (k, t) => onUpdateInfo && onUpdateInfo({ ...info, publicEdits: { ...edits, [k]: t } }),
    hidden: (k) => !!hidden[k],
    hide: (k) => onUpdateInfo && onUpdateInfo({ ...info, publicHidden: { ...hidden, [k]: true } }),
    touched: (prefix) => Object.keys(edits).some((x) => x.startsWith(prefix)) || Object.keys(hidden).some((x) => hidden[x] && x.startsWith(prefix))
      || Object.entries(added).some(([t, rows]) => `${t}.`.startsWith(prefix) && rows.length > 0),
  };
};
/** 눌러서 고치는 칸 */
const E: React.FC<{ ed: Ed; k: string; v: string; className?: string }> = ({ ed, k, v, className }) => (
  // 표 칸 안에서 줄 높이가 커지거나 위로 붙지 않게 — 블록으로 (2026-10-24 사장님: 칸 안에 박혀 어색함)
  <EditableText value={ed.v(k, v)} onChange={(t) => ed.set(k, t)} className={`!block leading-snug ${className || ''}`} placeholder="" />
);
/** 줄 지우기 — 3쪽 임대현황 표와 같은 빨간 동그라미. 줄에 마우스를 올리면 왼쪽 끝에 뜬다 (받은 줄은 숨김, 넣은 줄은 지움) */
const DelBtn: React.FC<{ onClick: () => void; title?: string }> = ({ onClick, title = '행 삭제' }) => (
  <button type="button" onClick={onClick} title={title} data-html2canvas-ignore="true"
    className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 bg-red-500 text-white rounded-full items-center justify-center text-[8px] font-bold shadow-md hover:bg-red-600 print:hidden hidden group-hover/row:flex z-50">✕</button>
);
const Hide: React.FC<{ ed: Ed; k: string }> = ({ ed, k }) => <DelBtn onClick={() => ed.hide(k)} title="행 삭제 (왼쪽 편집 칸에서 되살릴 수 있어요)" />;
/** 표 위 [+ 행 추가] — 표에 마우스를 올리면 오른쪽 위에 (3쪽과 같은 모양) */
const AddRow: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <div className="absolute -top-3 right-3 gap-2 print:hidden z-20 hidden group-hover/table:flex" data-html2canvas-ignore="true">
    <button type="button" onClick={onClick} className="px-3 py-1.5 bg-[#008299] text-white text-[11px] font-bold rounded shadow-sm hover:bg-[#006f82] transition-colors flex items-center gap-1">
      <span className="text-sm leading-none">+</span> 행 추가
    </button>
  </div>
);
/** 넣은 줄의 칸 */
const AE: React.FC<{ ed: Ed; t: string; r: number; c: number; v: string; ph?: string }> = ({ ed, t, r, c, v, ph = '입력' }) => (
  <EditableText value={v} onChange={(x) => ed.setCell(t, r, c, x)} placeholder={ph} className="!block leading-snug" />
);
const edited = (ed: Ed, prefix: string) => (ed.touched(prefix) ? ' · 일부 내용은 중개사가 수정함' : '');

/** 용도지역 색 — 토지이음 지적편집도와 비슷하게 (주거 노랑 · 상업 분홍 · 공업 보라 · 녹지 초록 · 관리 연갈색, 2026-10-24 사장님) */
const zoneColor = (n: string) => {
  const z = n.replace(/\s/g, '');
  if (/제1종전용주거/.test(z)) return '#fff6c9';
  if (/제2종전용주거/.test(z)) return '#ffef9f';
  if (/제1종일반주거/.test(z)) return '#f2ef93';
  if (/제2종일반주거/.test(z)) return '#dbdb63';
  if (/제3종일반주거/.test(z)) return '#c3c24c';
  if (/준주거/.test(z)) return '#e9b96b';
  if (/주거/.test(z)) return '#fbe27a';
  if (/중심상업/.test(z)) return '#ee8088';
  if (/일반상업/.test(z)) return '#f5a3a8';
  if (/근린상업/.test(z)) return '#f8c3c6';
  if (/유통상업|상업/.test(z)) return '#f4add0';
  if (/전용공업/.test(z)) return '#b9a3dc';
  if (/일반공업/.test(z)) return '#c9b6e6';
  if (/준공업|공업/.test(z)) return '#dccdf0';
  if (/보전녹지/.test(z)) return '#8fcb7d';
  if (/생산녹지/.test(z)) return '#acd994';
  if (/자연녹지|녹지/.test(z)) return '#c6e6ad';
  if (/계획관리/.test(z)) return '#e6dab8';
  if (/생산관리/.test(z)) return '#dbe7b4';
  if (/보전관리|관리/.test(z)) return '#c3dea8';
  if (/농림/.test(z)) return '#d3e8a6';
  if (/자연환경보전/.test(z)) return '#a6d6bb';
  return '#efece4';
};

/** 빈 자료일 때 — 편집 화면에서만 보이는 안내 (내보내기·인쇄에서는 이 쪽을 끄면 됨) */
const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div className="h-[520px] border-4 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-gray-50/50">
    <span className="text-4xl mb-3">🗺️</span>
    <p className="text-sm font-bold text-gray-600 mb-1">{text}</p>
    <p className="text-xs text-gray-400">왼쪽 편집 칸의 [지적도·대장·층별·실거래 채우기]를 눌러 주세요.</p>
  </div>
);

export const Page8Cadastral: React.FC<PageProps> = ({ info, pageString, isHidden, layoutTheme, colorTheme, onUpdateInfo }) => {
  const land = (info as any).landInfo as LandInfo | undefined;
  const ed = useEd(info, onUpdateInfo);
  const set = (k: string, v: string) => onUpdateInfo && onUpdateInfo({ ...info, [k]: v });
  const primary = colorTheme.primary || '#1a3a6b';

  // 위경도 → 미터 (그 자리 기준 평면) → 화면. 대상 필지가 가운데 오게, 둘레 필지가 보이게
  const body = (() => {
    if (!land) return <Empty text="지적도 자료가 아직 없어요." />;
    if (!land.parcels?.length) return <Empty text={land.cadastralError || '지적도 자료가 없어요.'} />;
    const [lng0, lat0] = land.center;
    const kx = Math.cos((lat0 * Math.PI) / 180) * 111320, ky = 110540;
    const P = (p: number[]) => [(p[0] - lng0) * kx, -(p[1] - lat0) * ky];
    const target = land.parcels.find((p) => p.pnu === land.pnu) || land.parcels[0];
    const tp = target.rings.flat().map(P);
    const tx = tp.map((p) => p[0]), ty = tp.map((p) => p[1]);
    const cx = (Math.min(...tx) + Math.max(...tx)) / 2, cy = (Math.min(...ty) + Math.max(...ty)) / 2;
    const span = Math.max(70, (Math.max(...tx) - Math.min(...tx)) * 2.6, (Math.max(...ty) - Math.min(...ty)) * 2.6);
    const W = 640, H = 480, s = Math.min(W, H) / span;
    const S = (p: number[]) => { const q = P(p); return [W / 2 + (q[0] - cx) * s, H / 2 + (q[1] - cy) * s]; };
    const path = (rings: number[][][]) => rings.map((r) => r.map((p, i) => `${i ? 'L' : 'M'}${S(p).map((v) => v.toFixed(1)).join(',')}`).join('') + 'Z').join('');
    const scaleM = span > 160 ? 50 : 20;
    const jimok = (target.jibun.match(/[가-힣]+$/) || [''])[0];
    const main = land.buildings?.[0];
    const lc = land.landChar;
    const area = lc?.area ?? main?.platArea ?? null;
    const won = (n: number) => (n >= 1e8 ? `약 ${(n / 1e8).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억 원` : `${Math.round(n / 1e4).toLocaleString('ko-KR')}만 원`);
    const rows: [string, string][] = ([
      ['소재지 (지번)', land.jibunAddr],
      ['도로명주소', land.roadAddr],
      ['지목', lc?.jimok || jimok],
      ['용도지역', lc?.zoning || ''],
      ['토지면적', m2(area)],
      ['개별공시지가', lc?.price ? `㎡당 ${lc.price.toLocaleString('ko-KR')}원 (${lc.year}년)${area ? ` · 필지 전체 ${won(lc.price * area)} (공시지가 기준)` : ''}` : ''],
      ['도로 접면', lc?.road || ''],
      ['지형', lc?.terrain || ''],
      ['이용 상황', lc?.use || ''],
    ] as [string, string][]).filter(([, v]) => v);
    // 지적편집도처럼 — 이 화면에 걸친 용도지역마다 색 (범례도 이 순서)
    // 이름 없는 구역(자료에 가끔 섞여 옴)은 매물 자리를 품으면 매물 용도지역으로, 아니면 칠하지 않는다 · 큰 구역부터 칠해 작은 구역이 가리지 않게
    const inside = (pt: number[], ring: number[][]) => {
      let c = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i], [xj, yj] = ring[j];
        if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    const ownZone = (lc?.zoning || '').split(' · ')[0];
    const zones = (land.zones || [])
      .filter((z) => z.rings?.length)
      .map((z) => (z.name ? z : { ...z, name: ownZone && z.rings.some((r) => inside(land.center, r)) ? ownZone : '' }))
      .filter((z) => z.name)
      .sort((a, b) => b.rings.reduce((t, r) => t + r.length, 0) - a.rings.reduce((t, r) => t + r.length, 0));
    const legend = [...new Set(zones.map((z) => z.name))].slice(0, 6);
    return (
      <div className="flex gap-6 h-[520px]">
        <div className="flex-1 rounded-2xl overflow-hidden border border-gray-300 relative" style={{ background: '#fbf8ef' }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }}>
            {zones.map((z, i) => <path key={`z${i}`} d={path(z.rings)} fill={zoneColor(z.name)} fillRule="evenodd" stroke="none" />)}
            {land.parcels.filter((p) => p !== target).map((p) => (
              <path key={p.pnu} d={path(p.rings)} fill="none" stroke="#3f3f46" strokeWidth={0.8} />
            ))}
            <path d={path(target.rings)} fill="rgba(220,38,38,0.10)" stroke="#dc2626" strokeWidth={3.2} />
            {/* 용도지역 이름 — 지적편집도처럼 구역 한가운데 (2026-10-24 사장님) */}
            {(() => {
              const inPoly = (pt: number[], rings: number[][][]) => {
                let c = false;
                for (const r of rings) {
                  const q = r.map(S);
                  for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
                    if ((q[i][1] > pt[1]) !== (q[j][1] > pt[1]) && pt[0] < ((q[j][0] - q[i][0]) * (pt[1] - q[i][1])) / (q[j][1] - q[i][1]) + q[i][0]) c = !c;
                  }
                }
                return c;
              };
              const tq = target.rings.flat().map(S);
              const tb = [Math.min(...tq.map((q) => q[0])) - 40, Math.max(...tq.map((q) => q[0])) + 40, Math.min(...tq.map((q) => q[1])) - 20, Math.max(...tq.map((q) => q[1])) + 20];
              const hits: Record<number, number[][]> = {};
              for (let x = 60; x < W - 60; x += 18) for (let y = 30; y < H - 30; y += 18) {
                if (x > tb[0] && x < tb[1] && y > tb[2] && y < tb[3]) continue;
                for (let i = zones.length - 1; i >= 0; i--) if (inPoly([x, y], zones[i].rings)) { (hits[i] ||= []).push([x, y]); break; }
              }
              const used = new Set<string>();
              return Object.entries(hits).filter(([, pts]) => pts.length >= 8).sort((a, b) => b[1].length - a[1].length).map(([i, pts]) => {
                const z = zones[Number(i)];
                if (used.has(z.name)) return null; // 같은 이름은 한 번만
                used.add(z.name);
                const mx = pts.reduce((t, q) => t + q[0], 0) / pts.length, my = pts.reduce((t, q) => t + q[1], 0) / pts.length;
                const [x, y] = pts.reduce((b2, q) => (Math.hypot(q[0] - mx, q[1] - my) < Math.hypot(b2[0] - mx, b2[1] - my) ? q : b2), pts[0]);
                return <text key={`zl${i}`} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={17} fontWeight={900} fill="#5b4a12" stroke="#fffbe8" strokeWidth={4} paintOrder="stroke" opacity={0.92}>{z.name}</text>;
              });
            })()}
            {land.parcels.map((p) => {
              const pts = p.rings[0]?.map(S) || [];
              if (!pts.length) return null;
              const x = pts.reduce((t, q) => t + q[0], 0) / pts.length, y = pts.reduce((t, q) => t + q[1], 0) / pts.length;
              if (x < 10 || x > W - 10 || y < 10 || y > H - 10) return null;
              const on = p === target;
              return <text key={`t${p.pnu}`} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={on ? 15 : 10} fontWeight={on ? 800 : 500} fill={on ? '#b91c1c' : '#27272a'} stroke={on ? '#ffffff' : 'none'} strokeWidth={on ? 3 : 0} paintOrder="stroke">{p.jibun}</text>;
            })}
            {/* 방위 · 축척 */}
            <g transform={`translate(${W - 34},34)`}>
              <path d="M0,-18 L7,6 L0,1 L-7,6 Z" fill="#334155" />
              <text y={20} textAnchor="middle" fontSize={11} fontWeight={800} fill="#334155">N</text>
            </g>
            <g transform={`translate(18,${H - 18})`}>
              <rect width={scaleM * s} height={4} fill="#334155" />
              <text y={-6} fontSize={11} fill="#334155">{scaleM}m</text>
            </g>
          </svg>
        </div>
        <div className="w-[320px] shrink-0 flex flex-col">
          <div className="relative group/table rounded-2xl border border-gray-200">
            <AddRow onClick={() => ed.addRow('p8', 2)} />
            {rows.filter(([k]) => !ed.hidden(`p8.${k}`)).map(([k, v]) => (
              <div key={k} className="group/row relative flex border-b border-gray-100 last:border-0 text-[12.5px]">
                <div className="w-[96px] shrink-0 bg-gray-50 px-3 py-2 font-bold text-gray-600">{k}<Hide ed={ed} k={`p8.${k}`} /></div>
                <div className="flex-1 px-3 py-2 text-gray-900 break-all"><E ed={ed} k={`p8.${k}`} v={v} /></div>
              </div>
            ))}
            {ed.added('p8').map((r, i) => (
              <div key={`a${i}`} className="group/row relative flex border-b border-gray-100 last:border-0 text-[12.5px]">
                <div className="w-[96px] shrink-0 bg-gray-50 px-3 py-2 font-bold text-gray-600"><AE ed={ed} t="p8" r={i} c={0} v={r[0]} ph="항목" /><DelBtn onClick={() => ed.delRow('p8', i)} /></div>
                <div className="flex-1 px-3 py-2 text-gray-900 break-all"><AE ed={ed} t="p8" r={i} c={1} v={r[1]} ph="내용" /></div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[11.5px] text-gray-600">
            <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-3 rounded-sm" style={{ background: 'rgba(220,38,38,0.10)', border: '2px solid #dc2626' }} />이 매물 필지</span>
            {legend.map((n) => <span key={n} className="flex items-center gap-1.5"><span className="inline-block w-4 h-3 rounded-sm border border-gray-300" style={{ background: zoneColor(n) }} />{n}</span>)}
          </div>
          <p className="mt-auto text-[11px] leading-relaxed text-gray-400">
            자료: 국토교통부 브이월드 연속지적도 ({ymd(land.fetchedAt)} 조회). 연속지적도는 참고용으로 실제 경계와 다를 수 있으니 정확한 경계는 지적측량으로 확인하세요.{edited(ed, 'p8.')}
          </p>
        </div>
      </div>
    );
  })();

  return (
    <ReportPage layoutTheme={layoutTheme} colorTheme={colorTheme}
      pageNumber={8} pageString={pageString} isHidden={isHidden}
      title={(info as any).page8Title || '지적도'} onUpdateTitle={(v) => set('page8Title', v)}
      subtitle={(info as any).page8Subtitle || 'Cadastral Map'} onUpdateSubtitle={(v) => set('page8Subtitle', v)}
      badgeText="LAND" exportId="page-8"
      footerText={info.footerText || 'PROPERTY REPORT'} onUpdateFooter={(v) => set('footerText', v)}>
      {body}
    </ReportPage>
  );
};

export const Page9Building: React.FC<PageProps> = ({ info, pageString, isHidden, layoutTheme, colorTheme, onUpdateInfo }) => {
  const land = (info as any).landInfo as LandInfo | undefined;
  const ed = useEd(info, onUpdateInfo);
  const set = (k: string, v: string) => onUpdateInfo && onUpdateInfo({ ...info, [k]: v });
  const primary = colorTheme.primary || '#1a3a6b';

  const body = (() => {
    if (!land) return <Empty text="건축물대장 자료가 아직 없어요." />;
    // 아파트·오피스텔 — 단지(건물) 전체 + 이 매물 호실 + 동별 요약 (2026-10-24 사장님)
    if (land.multiUnit && (land.complex || land.unit || land.buildings?.length)) {
      const c = land.complex, u = land.unit, b0 = land.buildings?.[0];
      const isOffi = /오피스텔|업무/.test(`${(info as any).subCategory || ''} ${b0?.purpose || ''}`) && !/공동주택|아파트/.test(b0?.purpose || '');
      const head = isOffi ? '건물 개요' : '단지 개요';
      const cRows: [string, string][] = ([
        [isOffi ? '건물명' : '단지명', c?.name || b0?.name || ''],
        ['대지위치', land.jibunAddr],
        ['도로명주소', land.roadAddr],
        ['동 수', c?.dongs ? `${c.dongs}개 동` : ''],
        [isOffi ? '호 수' : '세대 수', isOffi ? (c?.units || b0?.households ? `${c?.units || b0?.households}호` : '') : (c?.households || b0?.households ? `${(c?.households || b0?.households || 0).toLocaleString('ko-KR')}세대` : '')],
        ['주용도', c?.purpose || b0?.purpose || ''],
        ['대지면적', m2(c?.platArea ?? b0?.platArea ?? null)],
        ['연면적', m2(c?.totArea ?? b0?.totArea ?? null)],
        ['건폐율 / 용적률', [c?.bcRat ?? b0?.bcRat, c?.vlRat ?? b0?.vlRat].every((x) => x) ? `${c?.bcRat ?? b0?.bcRat}% / ${c?.vlRat ?? b0?.vlRat}%` : ''],
        ['주차', c?.parking || b0?.parking ? `${(c?.parking || b0?.parking || 0).toLocaleString('ko-KR')}대` : ''],
        ['사용승인일', day8(c?.useAprDay || b0?.useAprDay || '')],
      ] as [string, string][]).filter(([k, v]) => v && !ed.hidden(`p9.c.${k}`));
      const uRows: [string, string][] = u ? ([
        // 동 칸에 건물 이름이 오는 오피스텔은 빼고, 호 이름에 이미 '호'가 있으면 붙이지 않는다
        ['동 · 호', [/동$/.test(u.dong) ? u.dong : '', u.ho && (/호$/.test(u.ho) ? u.ho : `${u.ho}호`)].filter(Boolean).join(' ')],
        ['층', u.floor],
        ['용도', [u.purpose, u.etcPurpose && u.etcPurpose !== u.purpose ? u.etcPurpose : ''].filter(Boolean).join(' · ')],
        ['전용면적', m2(u.exclusive)],
        ['공용면적', m2(u.common)],
        ['합계(계약)면적', u.exclusive && u.common ? m2(Math.round((u.exclusive + u.common) * 100) / 100) : ''],
        ['구조', u.structure],
      ] as [string, string][]).filter(([k, v]) => v && !ed.hidden(`p9.u.${k}`)) : [];
      // 타입 구성이 있으면 표 줄을 조금 좁혀 한 쪽에 들어가게
      const groups = typeGroups((info as any).typeInfo?.types).filter((g) => !ed.hidden(`p9.t.${g.key}`));
      const tight = groups.length > 0 || ed.added('p9t').length > 0;
      const py = tight ? 'py-1.5' : 'py-2';
      const table = (pre: string, list: [string, string][], addKey: string) => (
        <div className="relative group/table rounded-2xl border border-gray-200 self-start w-full">
          <AddRow onClick={() => ed.addRow(addKey, 2)} />
          {list.map(([k, v]) => (
            <div key={k} className="group/row relative flex border-b border-gray-100 last:border-0 text-[13px]">
              <div className={`w-[118px] shrink-0 px-3 ${py} font-bold`} style={{ background: tint(primary, '12'), color: primary }}>{k}<Hide ed={ed} k={`${pre}.${k}`} /></div>
              <div className={`flex-1 px-3 ${py} text-gray-900 break-all`}><E ed={ed} k={`${pre}.${k}`} v={v} /></div>
            </div>
          ))}
          {ed.added(addKey).map((r, i) => (
            <div key={`a${i}`} className="group/row relative flex border-b border-gray-100 last:border-0 text-[13px]">
              <div className="w-[118px] shrink-0 px-3 py-2 font-bold" style={{ background: tint(primary, '12'), color: primary }}><AE ed={ed} t={addKey} r={i} c={0} v={r[0]} ph="항목" /><DelBtn onClick={() => ed.delRow(addKey, i)} /></div>
              <div className="flex-1 px-3 py-2 text-gray-900 break-all"><AE ed={ed} t={addKey} r={i} c={1} v={r[1]} ph="내용" /></div>
            </div>
          ))}
        </div>
      );
      const mineDong = /동$/.test(u?.dong || '') ? (u?.dong || '').replace(/동$/, '') : String((info as any).aptDong || '').replace(/동$/, '');
      const dongs = (land.buildings || []).filter((b) => b.dong && /공동주택|아파트|오피스텔|업무/.test(b.purpose) && !/주차장|관리|경비|커뮤니티/.test(b.dong) && (b.households || 0) > 0).slice(0, 12); // 지하주차장·관리동은 뺀다
      return (
        <div className="h-[520px] flex flex-col gap-4">
          <div className="flex gap-5">
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="text-[13px] font-bold" style={{ color: primary }}>{head}</div>
              {table('p9.c', cRows, 'p9c')}
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="text-[13px] font-bold" style={{ color: primary }}>이 매물 호실</div>
              {uRows.length ? table('p9.u', uRows, 'p9u') : (
                <div className="relative group/table rounded-2xl border border-dashed border-gray-300 px-4 py-3 text-[12.5px] text-gray-500">
                  <AddRow onClick={() => ed.addRow('p9u', 2)} />
                  공실등록에 <b>동·호수</b>를 넣으면 이 호실의 전용·공용 면적이 저절로 들어가요. [+ 행 추가]로 직접 넣을 수도 있어요.
                  {ed.added('p9u').length > 0 && <div className="mt-2">{table('p9.u', [], 'p9u')}</div>}
                </div>
              )}
              {dongs.length > 1 && !ed.hidden('p9.dongs') && (
                <div className="group/row relative mt-2">
                  <div className="text-[13px] font-bold mb-1.5" style={{ color: primary }}>동별 요약 <span className="font-normal text-gray-400">(같은 지번 {dongs.length}개 동)</span><Hide ed={ed} k="p9.dongs" /></div>
                  <div className="flex flex-wrap gap-2">
                    {dongs.map((d, i) => {
                      const on = mineDong && d.dong.replace(/동$/, '') === mineDong;
                      return (
                        <span key={i} className="text-[12px] px-2.5 py-1 rounded-lg border" style={on ? { borderColor: primary, background: tint(primary, '14'), color: primary, fontWeight: 800 } : { borderColor: '#e5e7eb', background: '#f9fafb', color: '#374151' }}>
                          {d.dong}{d.grndFlr ? ` · ${d.grndFlr}층` : ''}{d.households ? ` · ${d.households}세대` : ''}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* 타입 구성 — 같은 지번 전유부를 모두 세어 (보고서에서만, 뒤에서 따로 받음) */}
          {(groups.length > 0 || ed.added('p9t').length > 0) && (() => {
            const mine = u?.exclusive ? String(Math.round(u.exclusive)) : '';
            const box = 'group/row relative rounded-xl border px-3 py-2 min-w-[104px] text-center';
            return (
              <div className="relative group/table">
                <AddRow onClick={() => ed.addRow('p9t', 3)} />
                <div className="text-[13px] font-bold mb-1.5" style={{ color: primary }}>타입 구성 <span className="font-normal text-gray-400">(전용면적별 · 같은 지번 {((info as any).typeInfo?.counted || 0).toLocaleString('ko-KR')}세대)</span></div>
                <div className="flex flex-wrap gap-2">
                  {groups.map((g) => {
                    const on = mine === g.key;
                    const sup = range(g.supMin, g.supMax);
                    return (
                      <div key={g.key} className={box} style={on ? { borderColor: primary, background: tint(primary, '14') } : { borderColor: '#e5e7eb', background: '#f9fafb' }}>
                        <Hide ed={ed} k={`p9.t.${g.key}`} />
                        {on && <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 rounded text-[10px] font-bold text-white whitespace-nowrap" style={{ background: primary }}>이 매물</div>}
                        <div className="text-[13px] font-extrabold" style={{ color: on ? primary : '#111827' }}><E ed={ed} k={`p9.t.${g.key}.a`} v={g.label} /></div>
                        <div className="text-[11px] text-gray-500"><E ed={ed} k={`p9.t.${g.key}.b`} v={sup ? `공급 ${sup}㎡` : `전용 ${range(g.exMin, g.exMax)}㎡`} /></div>
                        <div className="text-[12.5px] font-bold" style={{ color: primary }}><E ed={ed} k={`p9.t.${g.key}.c`} v={`${g.count.toLocaleString('ko-KR')}세대`} /></div>
                      </div>
                    );
                  })}
                  {ed.added('p9t').map((r, i) => (
                    <div key={`a${i}`} className={box} style={{ borderColor: '#e5e7eb', background: '#f9fafb' }}>
                      <DelBtn onClick={() => ed.delRow('p9t', i)} />
                      <div className="text-[13px] font-extrabold text-gray-900"><AE ed={ed} t="p9t" r={i} c={0} v={r[0]} ph="타입" /></div>
                      <div className="text-[11px] text-gray-500"><AE ed={ed} t="p9t" r={i} c={1} v={r[1]} ph="공급면적" /></div>
                      <div className="text-[12.5px] font-bold" style={{ color: primary }}><AE ed={ed} t="p9t" r={i} c={2} v={r[2]} ph="세대수" /></div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          <p className="mt-auto text-[11px] leading-relaxed text-gray-400">
            자료: 국토교통부 건축물대장 총괄표제부·표제부·전유부 ({ymd(land.fetchedAt)} 조회). 공부상 내용으로, 계약 전에는 건축물대장 원본을 꼭 확인하세요.{edited(ed, 'p9')}
          </p>
        </div>
      );
    }
    const b = land.buildings?.[0];
    if (!b) return <Empty text={land.buildingError || '건축물대장 자료가 없어요.'} />;
    const flr = [b.grndFlr ? `지상 ${b.grndFlr}층` : '', b.ugrndFlr ? `지하 ${b.ugrndFlr}층` : ''].filter(Boolean).join(' / ');
    const rows: [string, string][] = ([
      ['대지위치', land.jibunAddr],
      ['도로명주소', land.roadAddr],
      ['대장 종류', [b.kind, b.mainAtch].filter(Boolean).join(' · ')],
      ['주용도', b.purpose],
      ['기타용도', b.etcPurpose],
      ['구조', b.structure],
      ['지붕', b.roof],
      ['대지면적', m2(b.platArea)],
      ['건축면적', m2(b.archArea)],
      ['연면적', m2(b.totArea)],
      ['건폐율', b.bcRat ? `${b.bcRat}%` : ''],
      ['용적률', b.vlRat ? `${b.vlRat}%` : ''],
      ['높이', b.height ? `${b.height}m` : ''],
      ['층수', flr],
      ['세대 / 가구', [b.households ? `${b.households}세대` : '', b.families ? `${b.families}가구` : ''].filter(Boolean).join(' / ')],
      ['승강기', b.elevators ? `${b.elevators}대` : ''],
      ['주차', b.parking ? `${b.parking}대` : ''],
      ['허가일', day8(b.permitDay)],
      ['사용승인일', day8(b.useAprDay)],
    ] as [string, string][]).filter(([k, v]) => v && !ed.hidden(`p9.${k}`));
    type R9 = { k: string; v: string; add?: number };
    const all: R9[] = [...rows.map(([k, v]) => ({ k, v })), ...ed.added('p9').map((r, i) => ({ k: r[0], v: r[1], add: i }))];
    const half = Math.ceil(all.length / 2);
    const col = (list: R9[], last: boolean) => (
      <div className="relative group/table flex-1 rounded-2xl border border-gray-200 self-start">
        {last && <AddRow onClick={() => ed.addRow('p9', 2)} />}
        {list.map(({ k, v, add }) => add !== undefined ? (
          <div key={`a${add}`} className="group/row relative flex border-b border-gray-100 last:border-0 text-[13px]">
            <div className="w-[110px] shrink-0 px-3 py-2.5 font-bold" style={{ background: tint(primary, '12'), color: primary }}><AE ed={ed} t="p9" r={add} c={0} v={k} ph="항목" /><DelBtn onClick={() => ed.delRow('p9', add)} /></div>
            <div className="flex-1 px-3 py-2.5 text-gray-900 break-all"><AE ed={ed} t="p9" r={add} c={1} v={v} ph="내용" /></div>
          </div>
        ) : (
          <div key={k} className="group/row relative flex border-b border-gray-100 last:border-0 text-[13px]">
            <div className="w-[110px] shrink-0 px-3 py-2.5 font-bold" style={{ background: tint(primary, '12'), color: primary }}>{k}<Hide ed={ed} k={`p9.${k}`} /></div>
            <div className="flex-1 px-3 py-2.5 text-gray-900 break-all"><E ed={ed} k={`p9.${k}`} v={v} /></div>
          </div>
        ))}
      </div>
    );
    const others = land.buildings.slice(1, 6);
    return (
      <div className="h-[520px] flex flex-col">
        <div className="flex gap-5">{col(all.slice(0, half), false)}{col(all.slice(half), true)}</div>
        {others.length > 0 && !ed.hidden('p9.others') && (
          <div className="group/row relative mt-4 text-[12px] text-gray-600">
            <b>같은 지번의 다른 건축물 {land.buildings.length - 1}동</b> — <E ed={ed} k="p9.others" v={others.map((o) => [o.name || o.mainAtch, o.purpose, m2(o.totArea).split(' (')[0]].filter(Boolean).join(' ')).join(' · ')} /><Hide ed={ed} k="p9.others" />
          </div>
        )}
        <p className="mt-auto text-[11px] leading-relaxed text-gray-400">
          자료: 국토교통부 건축물대장 표제부 ({ymd(land.fetchedAt)} 조회). 공부상 내용으로, 계약 전에는 세움터에서 건축물대장 원본(위반건축물 여부 포함)을 꼭 확인하세요.{edited(ed, 'p9.')}
        </p>
      </div>
    );
  })();

  return (
    <ReportPage layoutTheme={layoutTheme} colorTheme={colorTheme}
      pageNumber={9} pageString={pageString} isHidden={isHidden}
      title={(info as any).page9Title || '건축물대장 요약'} onUpdateTitle={(v) => set('page9Title', v)}
      subtitle={(info as any).page9Subtitle || 'Building Register'} onUpdateSubtitle={(v) => set('page9Subtitle', v)}
      badgeText="BUILDING" exportId="page-9"
      footerText={info.footerText || 'PROPERTY REPORT'} onUpdateFooter={(v) => set('footerText', v)}>
      {body}
    </ReportPage>
  );
};

/* ── 10. 층별 현황 · 11. 실거래 이력 (2026-10-24 사장님: 매물 종류별 구성) — 자료는 info.tradeInfo (/api/report/trades) ── */
export type TradeRow = { date: string; amount: number | null; deposit: number | null; monthly: number | null; area: number | null; perPyeong: number | null; floor: string; excluAr: number | null; name: string; buyer: string; seller: string; cancelled: boolean; matchedBy: string; buildYear: string };
export type TradeInfo = {
  kind: string; kindLabel: string; rentChart: boolean; tradeType: string;
  parcel: { pnu: string; dong: string; jibunAddr: string; roadAddr: string };
  floors: { dong: string; floor: string; structure: string; purpose: string; etcPurpose: string; area: number | null; mainAtch: string }[];
  permits: { kind: string; purpose: string; zoning: string; jimok: string; platArea: number | null; totArea: number | null; bcRat: number | null; vlRat: number | null; permitDay: string; startDay: string; useAprDay: string }[];
  history: TradeRow[]; rentHistory: TradeRow[]; examples: TradeRow[];
  chart: { scope: string; basis: string; unit: string; points: { label: string; value: number; count: number }[] };
  errors: string[]; fetchedAt: string;
};
/** 만원 → "137.5억" · "9,800만" */
export const won = (v: number | null) => {
  if (v === null || v === undefined) return '';
  if (Math.abs(v) >= 10000) return `${(v / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}억`;
  return `${v.toLocaleString('ko-KR')}만`;
};

export const Page10Floors: React.FC<PageProps> = ({ info, pageString, isHidden, layoutTheme, colorTheme, onUpdateInfo }) => {
  const t = (info as any).tradeInfo as TradeInfo | undefined;
  const ed = useEd(info, onUpdateInfo);
  const set = (k: string, v: string) => onUpdateInfo && onUpdateInfo({ ...info, [k]: v });
  const primary = colorTheme.primary || '#1a3a6b';
  const body = (() => {
    if (!t) return <Empty text="층별 현황 자료가 아직 없어요." />;
    const fl = (t.floors || []).filter((f) => f.mainAtch !== '부속건축물');
    const shown = fl.slice(0, 13).map((f, i) => ({ f, i })).filter(({ i }) => !ed.hidden(`p10.${i}`));
    if (!fl.length) return <Empty text={(t.errors || []).find((e) => e.startsWith('층별')) || '건축물대장에 층별 내용이 없어요.'} />;
    const total = shown.reduce((s, { f }) => s + (f.area || 0), 0);
    const multiDong = new Set(fl.map((f) => f.dong).filter(Boolean)).size > 1;
    const permits = (t.permits || []).slice(0, 5);
    return (
      <div className="h-[520px] flex flex-col">
        <div className="relative group/table rounded-2xl border border-gray-200">
          <AddRow onClick={() => ed.addRow('p10', 4)} />
          <table className="w-full text-[13px] [&_td]:align-middle [&_td]:py-1.5">
            <thead>
              <tr style={{ background: tint(primary, '12'), color: primary }}>
                {multiDong && <th className="text-left px-3 py-2 font-bold">동</th>}
                <th className="text-left px-3 py-2 font-bold w-[90px]">층</th>
                <th className="text-left px-3 py-2 font-bold">용도</th>
                <th className="text-left px-3 py-2 font-bold">구조</th>
                <th className="text-right px-3 py-2 font-bold w-[170px]">면적</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ f, i }) => (
                <tr key={i} className="group/row border-t border-gray-100">
                  {multiDong && <td className="px-3 py-1.5 text-gray-600"><E ed={ed} k={`p10.${i}.dong`} v={f.dong} /></td>}
                  <td className="relative px-3 py-1.5 font-bold text-gray-800"><E ed={ed} k={`p10.${i}.floor`} v={f.floor} /><Hide ed={ed} k={`p10.${i}`} /></td>
                  <td className="px-3 py-1.5 text-gray-900"><E ed={ed} k={`p10.${i}.purpose`} v={`${f.purpose}${f.etcPurpose && f.etcPurpose !== f.purpose ? ` · ${f.etcPurpose}` : ''}`} /></td>
                  <td className="px-3 py-1.5 text-gray-600"><E ed={ed} k={`p10.${i}.structure`} v={f.structure} /></td>
                  <td className="px-3 py-1.5 text-right text-gray-900"><E ed={ed} k={`p10.${i}.area`} v={m2(f.area)} /></td>
                </tr>
              ))}
              {ed.added('p10').map((r, i) => (
                <tr key={`a${i}`} className="group/row border-t border-gray-100">
                  {multiDong && <td className="px-3 py-1.5" />}
                  <td className="relative px-3 py-1.5 font-bold text-gray-800"><AE ed={ed} t="p10" r={i} c={0} v={r[0]} ph="층" /><DelBtn onClick={() => ed.delRow('p10', i)} /></td>
                  <td className="px-3 py-1.5 text-gray-900"><AE ed={ed} t="p10" r={i} c={1} v={r[1]} ph="용도" /></td>
                  <td className="px-3 py-1.5 text-gray-600"><AE ed={ed} t="p10" r={i} c={2} v={r[2]} ph="구조" /></td>
                  <td className="px-3 py-1.5 text-right text-gray-900"><AE ed={ed} t="p10" r={i} c={3} v={r[3]} ph="면적" /></td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-200 font-bold">
                <td className="px-3 py-1.5" colSpan={multiDong ? 4 : 3}>합계{fl.length > 13 ? ` (${fl.length}개 층 중 13개 표시)` : ''}</td>
                <td className="px-3 py-1.5 text-right"><E ed={ed} k="p10.total" v={m2(Math.round(total * 100) / 100)} /></td>
              </tr>
            </tbody>
          </table>
        </div>
        {permits.length > 0 && (
          <div className="mt-4">
            <div className="text-[13px] font-bold mb-1.5" style={{ color: primary }}>건축 인허가 이력</div>
            <div className="flex flex-wrap gap-2">
              {permits.map((p, i) => ed.hidden(`p10.permit.${i}`) ? null : (
                <span key={i} className="group/row relative text-[12px] px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-700">
                  <E ed={ed} k={`p10.permit.${i}`} v={`${day8(p.permitDay) || '날짜 없음'} ${p.kind}${p.purpose ? ` · ${p.purpose}` : ''}${p.totArea ? ` · 연면적 ${p.totArea.toLocaleString('ko-KR')}㎡` : ''}`} /><Hide ed={ed} k={`p10.permit.${i}`} />
                </span>
              ))}
            </div>
            {permits[0]?.zoning && !ed.hidden('p10.zoning') && <div className="group/row relative mt-1.5 text-[12px] text-gray-500"><E ed={ed} k="p10.zoning" v={`용도지역: ${permits[0].zoning}${permits[0].jimok ? ` · 지목 ${permits[0].jimok}` : ''}`} /><Hide ed={ed} k="p10.zoning" /></div>}
          </div>
        )}
        <p className="mt-auto text-[11px] leading-relaxed text-gray-400">
          자료: 국토교통부 건축물대장 층별개요 · 건축인허가 기본개요 ({ymd(t.fetchedAt)} 조회). 공사 중이거나 사용승인 전 변경 내용은 대장에 아직 반영되지 않았을 수 있어요.{edited(ed, 'p10.')}
        </p>
      </div>
    );
  })();
  return (
    <ReportPage layoutTheme={layoutTheme} colorTheme={colorTheme}
      pageNumber={10} pageString={pageString} isHidden={isHidden}
      title={(info as any).page10Title || '층별 현황'} onUpdateTitle={(v) => set('page10Title', v)}
      subtitle={(info as any).page10Subtitle || 'Floor Overview'} onUpdateSubtitle={(v) => set('page10Subtitle', v)}
      badgeText="FLOORS" exportId="page-10"
      footerText={info.footerText || 'PROPERTY REPORT'} onUpdateFooter={(v) => set('footerText', v)}>
      {body}
    </ReportPage>
  );
};

export const Page11Trades: React.FC<PageProps> = ({ info, pageString, isHidden, layoutTheme, colorTheme, onUpdateInfo }) => {
  const t = (info as any).tradeInfo as TradeInfo | undefined;
  const ed = useEd(info, onUpdateInfo);
  const set = (k: string, v: string) => onUpdateInfo && onUpdateInfo({ ...info, [k]: v });
  const primary = colorTheme.primary || '#1a3a6b';
  const body = (() => {
    if (!t) return <Empty text="실거래 자료가 아직 없어요." />;
    const hk = (h: TradeRow) => `p11.h.${h.date}.${h.amount}`;
    const hist = (t.history || []).filter((h) => !ed.hidden(hk(h)));
    const live = hist.filter((h) => !h.cancelled && h.amount);
    // 보유 기간별 변화 — 해제되지 않은 거래끼리
    const steps = live.slice(1).map((h, i) => {
      const a = live[i];
      const yrs = (new Date(h.date.replace(/\./g, '-')).getTime() - new Date(a.date.replace(/\./g, '-')).getTime()) / (365.25 * 864e5);
      const diff = (h.amount || 0) - (a.amount || 0);
      return `${a.date.slice(0, 7)} → ${h.date.slice(0, 7)} (${yrs >= 1 ? `${yrs.toFixed(1)}년` : `${Math.max(1, Math.round(yrs * 12))}개월`}): ${diff >= 0 ? '+' : ''}${won(diff)} (${diff >= 0 ? '+' : ''}${Math.round((diff / (a.amount || 1)) * 100)}%)`;
    });
    const basis = t.chart?.basis || '';
    const head = (cols: string[]) => (
      <thead><tr style={{ background: tint(primary, '12'), color: primary }}>{cols.map((c) => <th key={c} className="text-left px-3 py-2 font-bold">{c}</th>)}</tr></thead>
    );
    const isNamed = t.kind === 'Apt' || t.kind === 'Offi' || t.kind === 'RH';
    const failed = (t.errors || []).some((e) => /실거래/.test(e));
    return (
      <div className="h-[520px] flex flex-col gap-3">
        <div>
          <div className="text-[13px] font-bold mb-1.5" style={{ color: primary }}>{isNamed ? '이 단지' : '이 건물'} 매매 이력 <span className="font-normal text-gray-400">(최근 {t.rentChart ? 5 : 10}년 · {t.kindLabel} 실거래)</span></div>
          {hist.length || ed.added('p11h').length ? (
            <div className="relative group/table rounded-2xl border border-gray-200">
              <AddRow onClick={() => ed.addRow('p11h', 5)} />
              <table className="w-full text-[12.5px] [&_td]:align-middle">
                {head(['거래일', '금액', `평당가 (${basis})`, isNamed ? '층·전용' : '판 쪽 → 산 쪽', '비고'])}
                <tbody>
                  {hist.slice(-8).map((h, i) => (
                    <tr key={i} className={`group/row border-t border-gray-100 ${h.cancelled ? 'text-gray-400' : ''}`}>
                      <td className="relative px-3 py-1.5"><E ed={ed} k={`${hk(h)}.date`} v={h.date} /><Hide ed={ed} k={hk(h)} /></td>
                      <td className={`px-3 py-1.5 font-bold ${h.cancelled ? 'line-through' : ''}`}><E ed={ed} k={`${hk(h)}.amount`} v={won(h.amount)} /></td>
                      <td className="px-3 py-1.5"><E ed={ed} k={`${hk(h)}.pp`} v={h.perPyeong ? won(h.perPyeong) : ''} /></td>
                      <td className="px-3 py-1.5"><E ed={ed} k={`${hk(h)}.who`} v={isNamed ? [h.floor && `${h.floor}층`, h.excluAr && `${h.excluAr}㎡`].filter(Boolean).join(' · ') : [h.seller, h.buyer].filter(Boolean).join(' → ')} /></td>
                      <td className="px-3 py-1.5 text-gray-500"><E ed={ed} k={`${hk(h)}.note`} v={h.cancelled ? '해제됨' : !isNamed && h.matchedBy ? `${h.matchedBy} 일치` : ''} /></td>
                    </tr>
                  ))}
                  {ed.added('p11h').map((r, i) => (
                    <tr key={`a${i}`} className="group/row border-t border-gray-100">
                      {['거래일', '금액', '평당가', isNamed ? '층·전용' : '판 쪽 → 산 쪽', '비고'].map((ph, c) => (
                        <td key={c} className={`${c === 0 ? 'relative ' : ''}px-3 py-1.5${c === 1 ? ' font-bold' : ''}`}><AE ed={ed} t="p11h" r={i} c={c} v={r[c]} ph={ph} />{c === 0 && <DelBtn onClick={() => ed.delRow('p11h', i)} />}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="relative group/table text-[13px] text-gray-500 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
              <AddRow onClick={() => ed.addRow('p11h', 5)} />
              {failed ? '실거래 내용을 채우지 못했어요. 잠시 뒤 [새로 채우기]를 눌러 주세요.' : `최근 ${t.rentChart ? 5 : 10}년 동안 이 건물로 확인된 매매 신고가 없어요.`}
            </div>
          )}
          {steps.length > 0 && <ul className="mt-2 text-[12.5px] text-gray-700 list-disc pl-5 space-y-0.5">{steps.slice(-3).map((s, i) => ed.hidden(`p11.s.${i}`) ? null : <li key={i} className="group/row relative"><E ed={ed} k={`p11.s.${i}`} v={s} /><Hide ed={ed} k={`p11.s.${i}`} /></li>)}</ul>}
        </div>
        {(t.rentHistory || []).length > 0 && (
          <div>
            <div className="text-[13px] font-bold mb-1.5" style={{ color: primary }}>이 단지 최근 전월세</div>
            <div className="flex flex-wrap gap-2 text-[12px]">
              {t.rentHistory.slice(0, 8).map((h, i) => ed.hidden(`p11.r.${i}`) ? null : <span key={i} className="group/row relative px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200"><Hide ed={ed} k={`p11.r.${i}`} />{h.date.slice(2)} · {h.monthly ? `${won(h.deposit)}/${h.monthly}` : `전세 ${won(h.deposit)}`}{h.excluAr ? ` · ${h.excluAr}㎡` : ''}{h.floor ? ` · ${h.floor}층` : ''}</span>)}
            </div>
          </div>
        )}
        {(t.examples || []).length > 0 && (
          <div>
            <div className="text-[13px] font-bold mb-1.5" style={{ color: primary }}>{t.parcel?.dong} 최근 비슷한 거래 <span className="font-normal text-gray-400">(최근 12개월 · {t.rentChart ? '전월세' : '매매'})</span></div>
            <div className="relative group/table rounded-2xl border border-gray-200">
              <AddRow onClick={() => ed.addRow('p11e', 4)} />
              <table className="w-full text-[12.5px] [&_td]:align-middle">
                {head(['거래일', t.rentChart ? '보증금 / 월세' : '금액', t.rentChart ? '면적' : `평당가 (${basis})`, isNamed ? '단지' : '건축연도'])}
                <tbody>
                  {t.examples.map((h, i) => ed.hidden(`p11.e.${i}`) ? null : (
                    <tr key={i} className="group/row border-t border-gray-100">
                      <td className="relative px-3 py-1.5"><E ed={ed} k={`p11.e.${i}.date`} v={h.date} /><Hide ed={ed} k={`p11.e.${i}`} /></td>
                      <td className="px-3 py-1.5 font-bold"><E ed={ed} k={`p11.e.${i}.price`} v={t.rentChart ? (h.monthly ? `${won(h.deposit)} / ${h.monthly}만` : `전세 ${won(h.deposit)}`) : won(h.amount)} /></td>
                      <td className="px-3 py-1.5"><E ed={ed} k={`p11.e.${i}.area`} v={t.rentChart ? (h.area ? `${h.area}㎡` : '') : h.perPyeong ? won(h.perPyeong) : ''} /></td>
                      <td className="px-3 py-1.5 text-gray-600"><E ed={ed} k={`p11.e.${i}.etc`} v={isNamed ? h.name : h.buildYear ? `${h.buildYear}년` : ''} /></td>
                    </tr>
                  ))}
                  {ed.added('p11e').map((r, i) => (
                    <tr key={`a${i}`} className="group/row border-t border-gray-100">
                      {['거래일', t.rentChart ? '보증금 / 월세' : '금액', t.rentChart ? '면적' : '평당가', isNamed ? '단지' : '건축연도'].map((ph, c) => (
                        <td key={c} className={`${c === 0 ? 'relative ' : ''}px-3 py-1.5${c === 1 ? ' font-bold' : ''}`}><AE ed={ed} t="p11e" r={i} c={c} v={r[c]} ph={ph} />{c === 0 && <DelBtn onClick={() => ed.delRow('p11e', i)} />}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <p className="mt-auto text-[11px] leading-relaxed text-gray-400">
          자료: 국토교통부 실거래가 공개 자료 ({ymd(t.fetchedAt)} 조회). {isNamed ? '' : '지번 뒷자리가 가려져 공개되므로, 대지면적·연면적·준공연도가 건축물대장과 맞는 거래만 이 건물로 표시했어요. '}거래 당사자는 개인·법인 구분만 공개돼요.{edited(ed, 'p11.')}
        </p>
      </div>
    );
  })();
  return (
    <ReportPage layoutTheme={layoutTheme} colorTheme={colorTheme}
      pageNumber={11} pageString={pageString} isHidden={isHidden}
      title={(info as any).page11Title || '실거래 이력'} onUpdateTitle={(v) => set('page11Title', v)}
      subtitle={(info as any).page11Subtitle || 'Transaction History'} onUpdateSubtitle={(v) => set('page11Subtitle', v)}
      badgeText="TRADES" exportId="page-11"
      footerText={info.footerText || 'PROPERTY REPORT'} onUpdateFooter={(v) => set('footerText', v)}>
      {body}
    </ReportPage>
  );
};
