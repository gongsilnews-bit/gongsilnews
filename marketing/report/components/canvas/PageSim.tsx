import React from 'react';
import { PropertyInfo, FlyerColor, FlyerLayout } from '../../types';
import { ReportPage, EditableText } from '../shared';
import { pageHead } from '../../reportFields';

/**
 * 12. 인테리어 전후 · 13. 리모델링 전후 (2026-10-24 사장님)
 *  왼쪽 편집 칸의 [AI시뮬레이션 돌리기]로 그 자리에서 만들거나, 이 공실로 만든 시뮬레이션을 넣는다.
 *  자료는 info.simInfo[kind] — 그림은 보고서 사진처럼 서버에 올린 주소 (공유 링크에서도 보이게).
 *  예측 그림에는 늘 "AI 예측 이미지 · 실제 모습이 아닙니다"를 붙인다 (손님이 시공 사진으로 오해하지 않게).
 */
export type SimKind = 'interior' | 'remodel';
export type SimCost = { rangeText: string; basisText: string; areaText?: string; items: { label: string; basis: string; min: number; max: number }[]; notice: string; excludes: string };
export type SimData = {
  simId: string; kind: SimKind; before: string | null; after: { index: number; diffKo: string; image: string | null }[];
  roomName: string; dateText: string; design: Record<string, string[]>; cost: SimCost | null; disclaimer: string; fetchedAt: string;
};
export const SIM_PAGE: Record<SimKind, number> = { interior: 12, remodel: 13 };
export const SIM_LABEL: Record<SimKind, string> = { interior: '인테리어', remodel: '리모델링' };

interface PageProps {
  kind: SimKind;
  info: PropertyInfo;
  pageString: string;
  isHidden: boolean;
  layoutTheme: FlyerLayout;
  colorTheme: FlyerColor;
  onUpdateInfo?: (info: any) => void;
}

const tint = (hex: string, a: string) => (/^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${a}` : hex);

const PageSim: React.FC<PageProps> = ({ kind, info, pageString, isHidden, layoutTheme, colorTheme, onUpdateInfo }) => {
  const p = SIM_PAGE[kind];
  const sim = ((info as any).simInfo || {})[kind] as SimData | undefined;
  const set = (k: string, v: string) => onUpdateInfo && onUpdateInfo({ ...info, [k]: v });
  const val = (k: string, orig: string) => ((info as any)[k] !== undefined ? String((info as any)[k]) : orig);
  const primary = colorTheme.primary || '#1a3a6b';
  const after = sim?.after?.find((a) => a.image);

  const body = !sim || !after ? (
    <div className="h-[520px] border-4 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-gray-50/50">
      <span className="text-4xl mb-3">{kind === 'interior' ? '🛋️' : '🏢'}</span>
      <p className="text-sm font-bold text-gray-600 mb-1">{SIM_LABEL[kind]} 전후 사진이 아직 없어요.</p>
      <p className="text-xs text-gray-400">왼쪽 편집 칸에서 [AI시뮬레이션 돌리기]를 누르거나, 이 공실로 만든 결과를 넣어 주세요.</p>
    </div>
  ) : (
    <div className="h-[520px] flex flex-col gap-4">
      <div className="flex gap-4 h-[330px]">
        {([['지금 모습', sim.before, false], ['AI 예측', after.image, true]] as [string, string | null, boolean][]).map(([label, src, ai]) => (
          <div key={label} className="flex-1 relative rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
            {src ? <img src={src} alt={label} className="w-full h-full object-cover" crossOrigin="anonymous" /> : <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">사진 없음</div>}
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[12px] font-extrabold text-white" style={{ background: ai ? primary : 'rgba(17,24,39,.75)' }}>{label}</span>
            {ai && <span className="absolute bottom-0 inset-x-0 px-3 py-1.5 text-[11px] font-bold text-white bg-black/55">AI 예측 이미지 · 실제 모습이 아닙니다</span>}
          </div>
        ))}
      </div>
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold mb-1.5" style={{ color: primary }}>적용한 조건{sim.roomName ? ` · ${sim.roomName}` : ''}</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(sim.design || {}).filter(([, v]) => v?.length).slice(0, 8).map(([k, v]) => (
              <span key={k} className="text-[11.5px] px-2 py-1 rounded-lg border border-gray-200 bg-gray-50 text-gray-700"><b className="text-gray-500 font-bold">{k}</b> {v.join(', ')}</span>
            ))}
          </div>
        </div>
        {sim.cost && (
          <div className="w-[300px] shrink-0 rounded-2xl px-4 py-3" style={{ background: tint(primary, '10'), border: `1px solid ${tint(primary, '33')}` }}>
            <div className="text-[12px] font-bold" style={{ color: primary }}>예상 공사비</div>
            <div className="text-[22px] font-black leading-tight" style={{ color: primary }}>
              <EditableText value={val(`p${p}Cost`, sim.cost.rangeText)} onChange={(t) => set(`p${p}Cost`, t)} className="!block" placeholder="" />
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              <EditableText value={val(`p${p}CostBasis`, sim.cost.basisText)} onChange={(t) => set(`p${p}CostBasis`, t)} className="!block" placeholder="" />
            </div>
          </div>
        )}
      </div>
      <p className="text-[11px] leading-relaxed text-gray-400">
        AI가 지금 모습 사진과 고른 조건으로 그린 예측 이미지와 단가표 기준 예상 공사비({sim.dateText})입니다. 실제 공사 결과·견적과 다를 수 있으며, 시공 전 현장 실측과 전문 업체 견적을 꼭 받으세요.
      </p>
    </div>
  );

  return (
    <ReportPage layoutTheme={layoutTheme} colorTheme={colorTheme}
      pageNumber={p} pageString={pageString} isHidden={isHidden}
      {...pageHead(info, onUpdateInfo, p)}
      badgeText={kind === 'interior' ? 'INTERIOR' : 'REMODEL'} exportId={`page-${p}`}>
      {body}
    </ReportPage>
  );
};

export default PageSim;
