import React from 'react';
import { PropertyInfo, FlyerColor, FlyerLayout } from '../../types';
import { EditableText, EditableBlock, ReportPage } from '../shared';
import { ROADMAP_ICONS, RoadmapIcon, roadmapIconKey } from './roadmapIcons';

interface Page6RoadmapProps {
  info: PropertyInfo;
  pageString: string;
  isHidden: boolean;
  layoutTheme: FlyerLayout;
  colorTheme: FlyerColor;
  onUpdateInfo?: (info: any) => void;
}

const Page6Roadmap: React.FC<Page6RoadmapProps> = ({
  info,
  pageString,
  isHidden,
  layoutTheme,
  colorTheme,
  onUpdateInfo,
}) => {
  // 아이콘 고르는 칸 (누른 칸 번호, 없으면 -1)
  const [pickIdx, setPickIdx] = React.useState(-1);
  // 아이콘 색 — 테마색을 직접 (html2canvas 가 SVG 를 따로 그려 currentColor·CSS 변수가 검게 찍히는 것 막기)
  const tint = /^#[0-9a-f]{6}$/i.test(colorTheme.primary || '') ? colorTheme.primary : '#1a3a6b';
  const handleTextChange = (key: string, value: string) => {
    if (onUpdateInfo) {
      onUpdateInfo({ ...info, [key]: value });
    }
  };

  return (
    <ReportPage layoutTheme={layoutTheme} colorTheme={colorTheme}
        pageNumber={6} 
        pageString={pageString}
        isHidden={isHidden}
        title={info.page6Title || "가치 및 로드맵"} 
        onUpdateTitle={(val) => handleTextChange('page6Title', val)}
        subtitle={info.page6Subtitle || "Value & Roadmap"} 
        onUpdateSubtitle={(val) => handleTextChange('page6Subtitle', val)}
        badgeText="ROADMAP"
        exportId="page-6"
        onUpdateBadge={(val) => {
            if (onUpdateInfo) {
                onUpdateInfo({
                    ...info,
                    pageBadges: { ...(info.pageBadges || {}), page6: val }
                });
            }
        }}
        footerText={info.footerText || "PROPERTY REPORT"}
        onUpdateFooter={(val) => handleTextChange('footerText', val)}
    >
        <div className="h-[480px] overflow-hidden">
            {(() => {
                const list = (info as any).roadmapList || [1, 2, 3, 4].map((i, index) => ({
                    title: (info.roadmap as any)?.[`box${i}Title`] || "",
                    text: (info.roadmap as any)?.[`box${i}Text`] || "",
                    icon: (info.roadmap as any)?.[`box${i}Icon`] || ['🏢', '🏡', '📈', '🏗️'][index] || '🏢',
                    bg: ['bg-[var(--theme-primary)]/10', 'bg-green-50', 'bg-red-50', 'bg-yellow-50'][index] || 'bg-gray-50',
                    border: ['border-blue-100', 'border-green-100', 'border-red-100', 'border-yellow-100'][index] || 'border-gray-200'
                }));
                
                return (
                    <div className={`grid grid-cols-2 gap-6 h-full ${
                        list.length <= 2 ? 'grid-rows-1' :
                        list.length <= 4 ? 'grid-rows-2' : 'grid-rows-3'
                    }`}>
                        {list.map((item: any, idx: number) => (
                            <div key={idx} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex items-center gap-5 hover:shadow-md transition-shadow h-full">
                                <div className="relative shrink-0">
                                    <button type="button" title="아이콘 바꾸기" onClick={() => setPickIdx(pickIdx === idx ? -1 : idx)}
                                        className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform hover:scale-105"
                                        style={{ background: `${tint}14`, border: `1px solid ${tint}33`, color: tint }}>
                                        <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={tint} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            {ROADMAP_ICONS[roadmapIconKey(item.icon, idx, item.title)].svg}
                                        </svg>
                                    </button>
                                    {pickIdx === idx && (
                                        <div className="print:hidden absolute left-0 top-[72px] z-50 w-[300px] p-3 bg-white border border-gray-200 rounded-xl shadow-xl grid grid-cols-6 gap-1.5" data-html2canvas-ignore="true">
                                            {Object.entries(ROADMAP_ICONS).map(([key, ic]) => (
                                                <button key={key} type="button" title={ic.label}
                                                    onClick={() => {
                                                        setPickIdx(-1);
                                                        if (onUpdateInfo) {
                                                            const newList = [...list];
                                                            newList[idx] = { ...newList[idx], icon: key };
                                                            onUpdateInfo({ ...info, roadmapList: newList });
                                                        }
                                                    }}
                                                    className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100"
                                                    style={{ color: tint, outline: roadmapIconKey(item.icon, idx, item.title) === key ? `2px solid ${tint}` : 'none' }}>
                                                    <RoadmapIcon name={key} size={22} />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-extrabold text-gray-900 mb-2">
                                        <EditableText 
                                            value={item.title} 
                                            onChange={(val) => {
                                                if (onUpdateInfo) {
                                                    const newList = [...list];
                                                    newList[idx] = { ...newList[idx], title: val };
                                                    onUpdateInfo({ ...info, roadmapList: newList });
                                                }
                                            }}
                                        />
                                    </h3>
                                    <div className="text-gray-500 text-xs leading-relaxed">
                                        <EditableBlock 
                                            value={item.text} 
                                            onChange={(val) => {
                                                if (onUpdateInfo) {
                                                    const newList = [...list];
                                                    newList[idx] = { ...newList[idx], text: val };
                                                    onUpdateInfo({ ...info, roadmapList: newList });
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })()}
        </div>
        
        <div className="mt-8 text-right pr-4">
            <p className="text-gray-500 italic font-serif-kr text-lg">
                <EditableText 
                    value={info.page6FooterQuote || '"최고의 입지에 미래 가치를 더합니다."'} 
                    onChange={(val) => handleTextChange('page6FooterQuote', val)} 
                />
            </p>
        </div>
    </ReportPage>
  );
};

export default Page6Roadmap;
