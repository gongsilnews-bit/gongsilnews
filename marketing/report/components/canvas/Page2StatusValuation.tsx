import React from 'react';
import { PropertyInfo, FlyerColor, FlyerLayout } from '../../types';
import { EditableText, EditableBlock, ReportPage } from '../shared';

interface Props {
  info: PropertyInfo; pageString: string; isHidden: boolean;
  layoutTheme: FlyerLayout; colorTheme: FlyerColor; onUpdateInfo?: (info: any) => void;
}

const Page2StatusValuation: React.FC<Props> = ({ info, pageString, isHidden, layoutTheme, colorTheme, onUpdateInfo }) => {
  const hc = (key: string, value: any) => { if (onUpdateInfo) onUpdateInfo({ ...info, [key]: value }); };
  const ia = info as any;

  return (
    <ReportPage layoutTheme={layoutTheme} colorTheme={colorTheme}
        pageNumber={2} pageString={pageString} isHidden={isHidden}
        title={info.page2Title || "매물설명 & 시세"} onUpdateTitle={(v) => hc('page2Title', v)}
        subtitle={info.page2Subtitle || "Status & Valuation"} onUpdateSubtitle={(v) => hc('page2Subtitle', v)}
        badgeText={info.pageBadges?.page2 || "DETAILS"} exportId="page-2"
        onUpdateBadge={(v) => { if (onUpdateInfo) onUpdateInfo({ ...info, pageBadges: { ...(info.pageBadges || {}), page2: v } }); }}
        footerText={info.footerText || "PROPERTY REPORT"}
        onUpdateFooter={(v) => hc('footerText', v)}
    >
        <div className="flex gap-8 h-full w-full">
            <div className="w-full h-full flex flex-col">
                <div className="text-gray-600 font-bold text-sm mb-4">
                    <EditableText value={info.page2HighlightHeader || "PROPERTY INFORMATION & VALUE"} onChange={(v) => hc('page2HighlightHeader', v)} />
                </div>
                <div className="flex-1 flex gap-6">
                    {/* Left: Highlights */}
                    <div className="w-1/2 border border-gray-200 rounded-lg p-6 bg-white shadow-sm flex flex-col">
                        <h3 className="text-xl font-extrabold text-gray-900 mb-4 border-b-2 border-gray-800 pb-2 inline-block">
                            <EditableText value={info.page2HighlightBoxTitle || "매물 핵심 하이라이트"} onChange={(v) => hc('page2HighlightBoxTitle', v)} />
                        </h3>
                        <ul className="space-y-3 mb-8">
                            {info.highlights?.map((hl, i) => (
                                <li key={i} className="flex gap-2 text-sm items-center w-full">
                                    <span className="font-bold" style={{ color: colorTheme?.primary || '#cc5a27' }}>•</span>
                                    <span className="w-full"><EditableText value={hl} onChange={(v) => { const n = [...info.highlights]; n[i] = v; hc('highlights', n); }} /></span>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-auto">
                            <div className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: colorTheme?.primary || '#cc5a27' }}>
                                <EditableText value={ia.valuationAdvisoryTitle || "STRATEGIC ADVISORY"} onChange={(v) => hc('valuationAdvisoryTitle', v)} />
                            </div>
                            <div className="text-xs text-gray-600 leading-relaxed">
                                <EditableBlock value={info.valuationText || ""} onChange={(v) => hc('valuationText', v)} />
                            </div>
                        </div>
                    </div>
                    {/* Right: Chart */}
                    <div className="w-1/2 border border-gray-200 rounded-lg p-6 bg-white shadow-sm flex flex-col justify-between">
                        <h3 className="text-xl font-extrabold text-gray-900 mb-4 border-b-2 border-gray-800 pb-2 inline-block">
                            <EditableText value={ia.page2ChartBoxTitle || "주변시세 리포트"} onChange={(v) => hc('page2ChartBoxTitle', v)} />
                        </h3>
                        {(() => {
                            const showChart = info.showChart !== false;
                            const bars = info.chartBars || [
                                { label: "탁상감정가", value: "80", isHighlight: false },
                                { label: "기존 희망가", value: "75", isHighlight: false },
                                { label: "인근 시세", value: "85", isHighlight: false },
                                { label: "현재 급매가", value: "65", isHighlight: true }
                            ];
                            const upd = (newBars: any) => { if (onUpdateInfo) onUpdateInfo({ ...info, chartBars: newBars }); };
                            return (
                                <div className="relative group/chart flex flex-col h-full justify-center">
                                    <div className="absolute -top-3 right-0 opacity-0 group-hover/chart:opacity-100 transition-all duration-200 z-30 flex gap-2 print:hidden">
                                        <button type="button" onClick={() => { if (onUpdateInfo) onUpdateInfo({ ...info, showChart: !showChart }); }}
                                            className="px-2 py-1 bg-slate-900 text-white rounded text-[9px] font-bold shadow flex items-center gap-1 active:scale-95 cursor-pointer">
                                            {showChart ? "📊 그래프 숨기기" : "📊 그래프 보이기"}
                                        </button>
                                        {showChart && bars.length < 6 && (
                                            <button type="button" onClick={() => upd([...bars, { label: "새 항목", value: "70", isHighlight: false }])}
                                                className="px-2 py-1 bg-[var(--theme-primary)] text-white rounded text-[9px] font-bold shadow flex items-center gap-1 active:scale-95 cursor-pointer">➕ 항목 추가</button>
                                        )}
                                    </div>
                                    {showChart ? (
                                        <div className="animate-fadeIn mt-auto mb-auto">
                                            <div className="h-40 flex items-end justify-around px-4 border-b border-slate-200 pb-2 mb-2 relative">
                                                {bars.map((bar: any, idx: number) => {
                                                    const nums = bars.map((b: any) => parseFloat(b.value) || 0);
                                                    const mx = Math.max(...nums, 1);
                                                    const hp = Math.max(15, Math.min(95, Math.round(((parseFloat(bar.value) || 0) / mx) * 90)));
                                                    return (
                                                        <div key={idx} className="flex flex-col items-center justify-end h-full relative w-20 group/bar">
                                                            {bars.length > 2 && (
                                                                <button type="button" onClick={() => upd(bars.filter((_: any, i: number) => i !== idx))}
                                                                    className="absolute -top-3 p-0.5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover/bar:opacity-100 transition-opacity z-20 cursor-pointer shadow print:hidden" title="삭제">
                                                                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                                                </button>
                                                            )}
                                                            <div className="text-[10px] font-extrabold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded shadow-sm border border-slate-200/50 mb-1 leading-none hover:bg-amber-100 transition-colors">
                                                                <EditableText value={bar.value} onChange={(v) => { const n = [...bars]; n[idx] = { ...n[idx], value: v }; upd(n); }} />
                                                            </div>
                                                            <div className={`w-12 rounded-t transition-all duration-500 shadow-sm relative cursor-pointer ${bar.isHighlight || idx === bars.length - 1 ? 'bg-[#cc5a27] hover:bg-[#cc5a27]/90' : 'bg-slate-300 hover:bg-slate-400'}`}
                                                                style={{ height: `${hp}%` }} title="클릭하여 강조 색상 변경"
                                                                onClick={() => { const n = [...bars]; n[idx] = { ...n[idx], isHighlight: !n[idx].isHighlight }; upd(n); }}>
                                                                {(bar.isHighlight || idx === bars.length - 1) && <div className="absolute inset-x-0 top-0 h-1 bg-white/20 rounded-t"></div>}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="flex justify-around px-4 text-[10px] font-bold text-gray-500">
                                                {bars.map((bar: any, idx: number) => (
                                                    <div key={idx} className={`w-20 text-center truncate ${bar.isHighlight || idx === bars.length - 1 ? 'text-[#cc5a27]' : ''}`}>
                                                        <EditableText value={bar.label} onChange={(v) => { const n = [...bars]; n[idx] = { ...n[idx], label: v }; upd(n); }} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="border-2 border-dashed border-slate-200 rounded-xl py-8 px-4 text-center text-slate-400 text-xs font-semibold hover:bg-slate-50 cursor-pointer animate-fadeIn print:hidden mt-auto mb-auto"
                                             onClick={() => { if (onUpdateInfo) onUpdateInfo({ ...info, showChart: true }); }}>
                                            📊 시세 분석 그래프가 숨김 처리되었습니다. 클릭하여 다시 표시하기
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                        <div className="mt-auto pt-6 border-t border-gray-100">
                            <div className="text-[10px] font-bold tracking-widest text-[#cc5a27] uppercase mb-1">
                                <EditableText value={ia.chartAdvisoryTitle || "STRATEGIC ADVISORY"} onChange={(v) => hc('chartAdvisoryTitle', v)} />
                            </div>
                            <div className="text-xs text-gray-600 leading-relaxed">
                                <EditableBlock value={ia.chartAdviseText || "본 자산의 시세는 최근 실거래가 및 시장 동향을 반영하여 산출되었습니다. 입지 조건에 따른 프리미엄이 내재되어 있어 향후 가치 상승이 기대됩니다."} onChange={(v) => hc('chartAdviseText', v)} placeholder="그래프 분석 및 조언 입력..." />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </ReportPage>
  );
};

export default Page2StatusValuation;
