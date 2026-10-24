import React, { useEffect, useState } from 'react';
import { SimKind, SIM_LABEL, SIM_PAGE } from './canvas/PageSim';

/**
 * 12·13쪽 왼쪽 편집 칸 — 보고서 안에서 바로 AI시뮬레이션 (2026-10-24 사장님)
 *  ① 이 공실 사진 중 "지금 모습" 1장 ② 조건 ③ 공사비 기준 → [AI시뮬레이션 돌리기]
 *  공실마케팅·인테리어뉴스와 같은 시뮬레이션(앱의 gongsilStudio.sim)을 쓴다 — 만든 결과는 그쪽 목록에도 남는다.
 *  돌리기·결과 넣기는 App 이 한다 (오래 걸려도 다른 쪽으로 옮겨 다닐 수 있게).
 */
type Opt = { id: string; name: string };
type Options = { rooms: Opt[] | null; groups: { key: string; label: string; single?: boolean; options: Opt[] }[]; ratios: Opt[]; costFields: { key: string; label: string; unit?: string; step?: number; options?: { id: number; name: string }[] }[] };
type Sim = { id: string; vacancyId: string | null; photos: { id: string; on: boolean; thumb: string | null }[]; design: Record<string, any>; costBase: Record<string, number>; cost: { rangeText: string; basisText: string }; result: unknown };
export type SimBridge = {
  options: (kind: string) => Promise<Options>; create: (kind: string) => Promise<Sim>; get: (id: string) => Promise<Sim | null>;
  list: (kind: string) => Promise<{ id: string; createdAt: string; done: boolean; label: string }[]>;
  useVacancy: (o: { id: string; vacancyId: string }) => Promise<Sim>; update: (o: { id: string; pick?: string[]; design?: Record<string, unknown>; costBase?: Record<string, number> }) => Promise<Sim>;
  run: (id: string) => Promise<Sim>; reportMedia: (id: string) => Promise<{ before: string | null; after: { index: number; diffKo: string; image: string | null }[] }>;
  onProgress: (fn: (t: string) => void) => () => void;
};
export const simBridge = (): SimBridge | null => {
  try { return ((window.parent as any)?.gongsilStudio?.sim || (window as any).gongsilStudio?.sim || null) as SimBridge | null; } catch { return null; }
};
export const cleanErr = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

// 만들다 만 시뮬레이션 — 다른 쪽에 갔다 와도 이어서 (이 PC 에만)
const draftKey = (vacancyId: string, kind: SimKind) => `gsReportSimDraft:${vacancyId}:${kind}`;
const readDraft = (k: string) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
const writeDraft = (k: string, v: string) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch { /* 저장 못 해도 화면은 그대로 */ } };

interface Props {
  kind: SimKind;
  vacancyId: string;
  usedSimId?: string;
  busy: string;
  /** 쪽 번호 앞 이름 (예: "12. 인테리어 전후") */
  title: string;
  /** 넓이 처음 값 (아파트 호실 전용면적 등) */
  areaHint?: number | null;
  onRun: (kind: SimKind, simId: string) => void;
  onUse: (kind: SimKind, simId: string) => void;
}

const chip = (on: boolean) => `px-2.5 py-1 rounded-full text-[12px] font-bold border transition-colors ${on ? 'bg-[#1a3a6b] text-white border-[#1a3a6b]' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'}`;

const SimPanel: React.FC<Props> = ({ kind, vacancyId, usedSimId, busy, title, areaHint, onRun, onUse }) => {
  const b = simBridge();
  const dk = draftKey(vacancyId, kind);
  const [opts, setOpts] = useState<Options | null>(null);
  const [sim, setSim] = useState<Sim | null>(null);
  const [done, setDone] = useState<{ id: string; label: string }[]>([]);
  const [wait, setWait] = useState('');
  const [error, setError] = useState('');

  // 이 공실로 만든 결과 + 만들다 만 것 불러오기
  useEffect(() => {
    if (!b || !vacancyId) return;
    let alive = true;
    (async () => {
      try {
        const [o, recent] = await Promise.all([b.options(kind), b.list(kind)]);
        if (!alive) return;
        setOpts(o);
        const mine: { id: string; label: string }[] = [];
        for (const r of recent.filter((x) => x.done)) {
          const s = await b.get(r.id).catch(() => null);
          if (s?.vacancyId === vacancyId) mine.push({ id: r.id, label: r.label });
        }
        if (!alive) return;
        setDone(mine);
        const d = readDraft(dk);
        const s = d ? await b.get(d).catch(() => null) : null;
        if (!alive) return;
        if (s?.result) { writeDraft(dk, ''); setSim(null); } // 다 돌린 것 — 위 "만든 결과"로
        else if (s && s.photos.length) setSim(s);
      } catch (e) { if (alive) setError(cleanErr(e)); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, vacancyId, !busy]); // 돌리기가 끝나면 다시 읽는다 (진행 글자가 바뀔 때마다는 아니고)

  if (!b) return <p className="text-xs text-gray-500 leading-relaxed rounded-lg bg-gray-50 border border-gray-200 p-3">AI시뮬레이션은 <b>공실스튜디오 앱</b>의 공실마케팅 → AI 매물보고서에서 쓸 수 있어요.</p>;
  if (!vacancyId) return <p className="text-xs text-gray-500">등록한 공실로 만든 보고서에서 쓸 수 있어요.</p>;

  const start = async () => {
    setError(''); setWait('이 공실 사진을 불러오는 중…');
    try {
      const s0 = await b.create(kind);
      let s = await b.useVacancy({ id: s0.id, vacancyId });
      if (kind === 'interior' && areaHint && areaHint > 0) s = await b.update({ id: s.id, costBase: { area: Math.round(areaHint) } });
      writeDraft(dk, s.id);
      setSim(s);
    } catch (e) { setError(cleanErr(e)); } finally { setWait(''); }
  };
  const update = async (patch: { pick?: string[]; design?: Record<string, unknown>; costBase?: Record<string, number> }) => {
    if (!sim) return;
    try { setSim(await b.update({ id: sim.id, ...patch })); } catch (e) { setError(cleanErr(e)); }
  };
  const toggleOpt = (key: string, id: string, single?: boolean) => {
    if (!sim) return;
    if (single) return update({ design: { [key]: [id] } });
    const cur: string[] = sim.design[key] || [];
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    if (next.length) update({ design: { [key]: next } });
  };
  const run = () => { if (sim) onRun(kind, sim.id); }; // 실패하면 고른 조건 그대로 다시 돌릴 수 있게 지우지 않는다
  const label = 'text-[12px] font-bold text-gray-500 mb-1.5 mt-3 block';

  return (
    <div className="animate-fadeIn space-y-3 mb-8">
      <div className="pb-2 border-b-[3px] border-black">
        <h2 className="text-lg font-black text-black tracking-tight">{title}</h2>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">이 공실 사진으로 <b>{SIM_LABEL[kind]} 후 모습</b>을 AI가 그리고 예상 공사비를 넣어요. 그림은 <b>[내 AI 연결]의 그림 AI</b>로 만들고 1~4분 걸려요.</p>
      {busy && <div className="text-[13px] font-bold text-[#1a3a6b] rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">{busy}</div>}
      {error && <div className="text-xs text-red-600 rounded-lg bg-red-50 border border-red-100 px-3 py-2">{error}</div>}

      {done.length > 0 && (
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-1.5">
          <div className="text-[12px] font-bold text-gray-600">이 공실로 만든 결과</div>
          {done.map((d) => (
            <div key={d.id} className="flex items-center gap-2 text-xs">
              <span className="flex-1 min-w-0 truncate text-gray-700">{d.label}</span>
              {usedSimId === d.id ? <span className="text-green-600 font-bold shrink-0">✓ {SIM_PAGE[kind]}쪽에 넣음</span>
                : <button type="button" disabled={Boolean(busy)} onClick={() => onUse(kind, d.id)} className="shrink-0 px-2.5 py-1 rounded-md bg-white border border-gray-300 font-bold text-gray-700 hover:border-gray-500 disabled:opacity-50">넣기</button>}
            </div>
          ))}
        </div>
      )}

      {!sim ? (
        <button type="button" onClick={start} disabled={Boolean(wait || busy)} className="w-full py-3 rounded-lg text-white font-bold text-sm disabled:opacity-60" style={{ background: '#1a3a6b' }}>
          {wait || (done.length ? `+ 새로 ${SIM_LABEL[kind]} 시뮬레이션` : `${SIM_LABEL[kind]} AI시뮬레이션 시작`)}
        </button>
      ) : (
        <div className="rounded-xl border border-gray-200 p-3">
          <span className={`${label} !mt-0`}>① 지금 모습 사진 (1장)</span>
          <div className="grid grid-cols-4 gap-1.5">
            {sim.photos.map((p) => (
              <button key={p.id} type="button" onClick={() => !p.on && update({ pick: [p.id] })} className={`relative aspect-[4/3] rounded-md overflow-hidden bg-gray-200 ${p.on ? 'ring-[3px] ring-[#1a3a6b]' : 'opacity-70 hover:opacity-100'}`}>
                {p.thumb && <img src={p.thumb} alt="" className="w-full h-full object-cover" />}
                {p.on && <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-[#1a3a6b] text-white text-[10px] flex items-center justify-center">✓</span>}
              </button>
            ))}
          </div>
          {opts && (
            <>
              {opts.rooms && (
                <>
                  <span className={label}>② 공간 유형</span>
                  <div className="flex flex-wrap gap-1.5">{opts.rooms.map((o) => <button key={o.id} type="button" onClick={() => update({ design: { roomType: o.id } })} className={chip(sim.design.roomType === o.id)}>{o.name.replace(/\s*\(.*\)$/, '')}</button>)}</div>
                </>
              )}
              {opts.groups.map((g, i) => (
                <div key={g.key}>
                  <span className={label}>{!opts.rooms && i === 0 ? '② ' : ''}{g.label} <span className="font-normal">· {g.single ? '하나만' : '여러 개'}</span></span>
                  <div className="flex flex-wrap gap-1.5">{g.options.map((o) => <button key={o.id} type="button" onClick={() => toggleOpt(g.key, o.id, g.single)} className={chip((sim.design[g.key] || []).includes(o.id))}>{o.name}</button>)}</div>
                </div>
              ))}
              <span className={label}>이미지 비율</span>
              <div className="flex flex-wrap gap-1.5">{opts.ratios.map((o) => <button key={o.id} type="button" onClick={() => update({ design: { aspectRatio: o.id } })} className={chip(sim.design.aspectRatio === o.id)}>{o.name}</button>)}</div>
              <span className={label}>③ 공사비 기준</span>
              <div className="flex flex-wrap gap-2 items-end">
                {opts.costFields.map((f) => (
                  <label key={f.key} className="flex flex-col gap-1 text-[11.5px] font-bold text-gray-500">
                    {f.label}
                    {f.options ? (
                      <select value={sim.costBase[f.key]} onChange={(e) => update({ costBase: { [f.key]: Number(e.target.value) } })} className="border rounded p-1.5 text-sm text-gray-800">
                        {f.options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                    ) : (
                      <span className="flex items-center gap-1">
                        <input type="number" min={0} step={f.step || 1} value={sim.costBase[f.key] ?? ''} onChange={(e) => update({ costBase: { [f.key]: Number(e.target.value) } })} className="w-20 border rounded p-1.5 text-sm text-gray-800" />
                        <span className="font-semibold">{f.unit}</span>
                      </span>
                    )}
                  </label>
                ))}
              </div>
              <div className="mt-2 text-[12.5px] rounded-lg bg-gray-50 px-3 py-2">예상 공사비 <b className="text-[#1a3a6b]">{sim.cost.rangeText}</b> <span className="text-gray-500">({sim.cost.basisText})</span></div>
            </>
          )}
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={() => { writeDraft(dk, ''); setSim(null); }} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm font-bold text-gray-600">취소</button>
            <button type="button" onClick={run} disabled={Boolean(busy) || !sim.photos.some((p) => p.on)} className="flex-1 py-2.5 rounded-lg text-white font-bold text-sm disabled:opacity-60" style={{ background: '#1a3a6b' }}>AI시뮬레이션 돌리기</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimPanel;
