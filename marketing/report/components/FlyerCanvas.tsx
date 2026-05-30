import React, { forwardRef } from 'react';
import { FlyerState } from '../types';

interface FlyerCanvasProps {
  data: FlyerState;
}

const ReportPage = ({ 
    children, 
    pageNumber, 
    title, 
    subtitle, 
    targetName, 
    badgeText 
}: { 
    children: React.ReactNode, 
    pageNumber: number, 
    title: string, 
    subtitle: string, 
    targetName: string, 
    badgeText?: string 
}) => {
    return (
        <div className="relative bg-white w-[1122px] h-[794px] overflow-hidden flex flex-col shadow-2xl mb-8" style={{ pageBreakAfter: 'always' }}>
            {/* Header */}
            <div className="h-[120px] bg-[#0d1424] text-white px-10 py-6 flex justify-between items-end shrink-0">
                <div>

                    <h1 className="text-3xl font-extrabold mb-1 tracking-tight">{title}</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-400 text-sm">{subtitle}</span>
                        <span className="text-[#cc5a27] text-sm font-bold">{targetName}</span>
                    </div>
                </div>
                {pageNumber === 1 && (
                    <div className="flex items-center gap-4 h-full pb-2">
                        <div className="w-px h-8 bg-gray-600"></div>
                        <span className="text-[#e29d45] text-2xl font-black tracking-widest">FOR SALE</span>
                    </div>
                )}
                {pageNumber === 2 && (
                    <div className="flex items-center gap-4 h-full pb-2">
                        <div className="w-px h-8 bg-gray-600"></div>
                        <span className="text-white text-2xl font-black tracking-widest">HIGHLIGHTS</span>
                    </div>
                )}
                {pageNumber === 3 && (
                    <div className="flex items-center gap-4 h-full pb-2">
                        <div className="w-px h-8 bg-gray-600"></div>
                        <span className="text-white text-2xl font-black tracking-widest">ASSET GALLERY</span>
                    </div>
                )}
                {pageNumber === 4 && (
                    <div className="flex items-center gap-4 h-full pb-2">
                        <div className="w-px h-8 bg-gray-600"></div>
                        <span className="text-white text-2xl font-black tracking-widest">ACCESSIBILITY</span>
                    </div>
                )}
                {pageNumber === 5 && (
                    <div className="flex items-center gap-4 h-full pb-2">
                        <div className="w-px h-8 bg-gray-600"></div>
                        <span className="text-white text-2xl font-black tracking-widest">FINAL SUMMARY</span>
                    </div>
                )}
            </div>

            {/* Content Body */}
            <div className="flex-1 p-10 relative">
                {children}
            </div>

            {/* Footer */}
            <div className="h-[50px] px-10 flex justify-between items-center shrink-0 border-t border-gray-100">
                <div className="text-gray-400 text-xs font-bold tracking-widest">
                    CONFIDENTIAL <span className="mx-1">|</span> INFORMATION MEMORANDUM
                </div>
                <div className="text-gray-400 text-xs font-bold tracking-widest">
                    PAGE 0{pageNumber} / 05
                </div>
            </div>
        </div>
    );
};

const SectionTitle = ({ title, subtitle }: { title: string, subtitle: string }) => (
    <div className="mb-4 flex items-center gap-2">
        <h3 className="text-gray-500 font-bold tracking-widest uppercase text-sm">{title}</h3>
        <span className="text-gray-300">|</span>
        <span className="text-gray-800 font-bold text-sm">{subtitle}</span>
    </div>
);

const FlyerCanvas = forwardRef<HTMLDivElement, FlyerCanvasProps>(({ data }, ref) => {
  const { info, mainImage, subImage1, subImage2, featureImage1, featureImage2 } = data; 
  const placeholder = "https://placehold.co/800x600/e2e8f0/1e293b?text=Image";

  // Data mapping from info
  const targetTitle = `${info.address || '서초동 역세권'} 매매 안내서`;
  const targetSub = `대상물건: ${info.address || '서울 서초구 서초동 1444-9'}`;
  const price = info.priceMain || '75억 원';

  return (
    <div className="flex flex-col items-center p-8 bg-gray-100" ref={ref}>
        {/* PAGE 1: OVERVIEW */}
        <ReportPage 
            pageNumber={1} 
            title={targetTitle} 
            subtitle={info.subTitle} 
            targetName={targetSub}
        >
            <div className="flex gap-8 h-full">
                {/* Left Col: Overview Table */}
                <div className="w-5/12 flex flex-col justify-between">
                    <div>
                        <SectionTitle title="PROPERTY OVERVIEW" subtitle="물건개요" />
                        <div className="border-t-[3px] border-gray-800 flex flex-col text-sm border-b border-gray-200">
                            {[
                                { k: '소재지', v: info.overviewTable?.location },
                                { k: '용도지역', v: info.overviewTable?.zoning },
                                { k: '대지면적', v: info.overviewTable?.landArea },
                                { k: '연면적', v: info.overviewTable?.totalArea },
                                { k: '건물규모', v: info.overviewTable?.buildingScale },
                                { k: '주용도', v: info.overviewTable?.mainPurpose },
                                { k: '주차대수', v: info.overviewTable?.parking },
                                { k: '승강기', v: info.overviewTable?.elevator },
                                { k: '준공연도', v: info.overviewTable?.completionYear },
                            ].map((row, i) => (
                                <div key={i} className="flex border-b border-gray-100 last:border-0">
                                    <div className="w-1/3 bg-white text-gray-500 font-bold py-3 pl-4 flex items-center">{row.k}</div>
                                    <div className="w-2/3 bg-white text-gray-800 font-bold py-3 pl-4 flex items-center">{row.v}</div>
                                </div>
                            ))}
                            {/* Price Row */}
                            <div className="flex bg-[#fff9f0] border-t border-gray-200">
                                <div className="w-1/3 text-gray-600 font-bold py-3 pl-4 flex items-center">매매가</div>
                                <div className="w-2/3 text-[#cc5a27] font-extrabold py-3 pl-4 flex items-center">{price}</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-5 mt-4 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-full bg-[#cc5a27] text-white flex items-center justify-center font-bold text-xs">📞</div>
                            <span className="font-bold text-gray-800">문의 안내</span>
                        </div>
                        <div className="text-gray-800 text-sm leading-relaxed space-y-1">
                            <div className="font-extrabold text-[#cc5a27] text-base mb-2">문의 : {info.agentMobile || info.agentPhone}</div>
                            <div className="font-bold">{info.agentRepresentative}</div>
                            <div className="text-gray-600">{info.agentName}</div>
                        </div>
                    </div>
                </div>

                {/* Right Col: Image & Summary */}
                <div className="w-7/12 flex flex-col h-full">
                    <div className="relative flex-1 rounded-2xl overflow-hidden mb-6 shadow-md border border-gray-100">
                        <img src={mainImage || placeholder} alt="Main" className="w-full h-full object-cover" />
                        <div className="absolute top-4 right-4 text-xs font-black tracking-widest uppercase text-gray-800 mix-blend-overlay">ASSET PREVIEW</div>
                    </div>
                    <div>
                        <SectionTitle title="INVESTMENT SUMMARY" subtitle="투자요약" />
                        <div className="flex gap-4 border-l-4 border-[#cc5a27] pl-4">
                            {[1,2,3].map(i => (
                                <div key={i} className="flex-1 bg-white border border-gray-100 rounded-lg p-4 text-center shadow-sm">
                                    <div className="text-xs text-gray-400 font-bold tracking-widest mb-2 uppercase">{(info.investmentSummary as any)?.[`box${i}Title`]}</div>
                                    <div className="font-extrabold text-gray-800 text-lg leading-tight whitespace-pre-wrap">{(info.investmentSummary as any)?.[`box${i}Text`]}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </ReportPage>

        {/* PAGE 2: STATUS & VALUATION */}
        <ReportPage 
            pageNumber={2} 
            title="현황 및 가치" 
            subtitle="Status & Valuation" 
            targetName={targetSub}
            badgeText="EVIDENCE & DATA"
        >
            <div className="flex gap-8 h-full">
                {/* Left: Table */}
                <div className="w-5/12 h-full">
                    <div className="text-gray-600 font-bold text-sm mb-4">1. 층별 점유 및 임대 상세 현황</div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-[#f8fafc] flex flex-col h-[500px]">
                        <table className="w-full text-center text-sm">
                            <thead className="bg-white border-b border-gray-200">
                                <tr>
                                    <th className="py-4 font-bold text-gray-600">층수</th>
                                    <th className="py-4 font-bold text-gray-600">현용도</th>
                                    <th className="py-4 font-bold text-gray-600">임대차</th>
                                    <th className="py-4 font-bold text-gray-600">점유 상태</th>
                                    <th className="py-4 font-bold text-gray-600">비고</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {info.floorStatus?.map((row, i) => (
                                    <tr key={i}>
                                        <td className={`py-4 ${row.floor === 'B1' || row.floor.includes('지하') ? 'font-bold' : ''}`}>{row.floor}</td>
                                        <td className={row.floor === 'B1' || row.floor.includes('지하') ? 'font-bold' : ''}>{row.purpose}</td>
                                        {i === 0 && info.floorStatus[0].lease === '보증금 / 차임 내역 별도문의' ? (
                                             <>
                                                <td rowSpan={6} className="text-[#cc5a27] font-bold text-xs writing-vertical-lr tracking-widest border-x border-dashed border-[#cc5a27]/30 bg-[#fff9f0]">{row.lease}</td>
                                                <td className="font-bold">{row.status}</td>
                                                <td className="text-gray-500">{row.note}</td>
                                             </>
                                        ) : (
                                             info.floorStatus[0].lease === '보증금 / 차임 내역 별도문의' ? (
                                                 <>
                                                     <td className={row.status.includes('현재 공실') ? 'text-[#cc5a27] font-bold' : 'font-bold'}>{row.status}</td>
                                                     <td className={row.note.includes('즉시 활용') ? 'font-bold text-gray-800' : 'text-gray-500'}>{row.note}</td>
                                                 </>
                                             ) : (
                                                 <>
                                                     <td className={row.lease.includes('공실') ? 'text-[#cc5a27] font-bold' : 'font-bold'}>{row.lease}</td>
                                                     <td className={row.status.includes('공실') ? 'text-[#cc5a27] font-bold' : 'font-bold'}>{row.status}</td>
                                                     <td className={row.note.includes('즉시') ? 'font-bold text-gray-800' : 'text-gray-500'}>{row.note}</td>
                                                 </>
                                             )
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="p-4 mt-auto border-t border-gray-100 text-xs text-gray-500 leading-relaxed bg-[#f8fafc]">
                            {info.floorStatusNotice}
                        </div>
                    </div>
                </div>

                {/* Right: Highlights & Chart */}
                <div className="w-7/12 h-full flex flex-col">
                    <div className="text-gray-600 font-bold text-sm mb-4">2. 매각 핵심 하이라이트 & 시세 분석</div>
                    <div className="flex-1 border border-yellow-200 rounded-lg p-6 bg-white shadow-sm flex flex-col">
                        <h3 className="text-xl font-extrabold text-gray-900 mb-4 border-b-2 border-gray-800 pb-2 inline-block">매각 핵심 하이라이트</h3>
                        <ul className="space-y-3 mb-8">
                            {info.highlights?.map((hl, i) => (
                                <li key={i} className="flex gap-2 text-sm"><span className="text-[#cc5a27] font-bold">•</span><span><strong>{hl.split(':')[0]}{hl.includes(':')?':':''}</strong> {hl.split(':')[1] || hl}</span></li>
                            ))}
                        </ul>
                        
                        {/* Fake Chart */}
                        <div className="mt-auto border-t-2 border-[#cc5a27] pt-6 relative">
                            <div className="h-40 flex items-end justify-around px-8 border-b border-gray-300 pb-2 mb-2">
                                <div className="w-12 bg-gray-200 h-[80%] rounded-t-sm"></div>
                                <div className="w-12 bg-gray-300 h-[75%] rounded-t-sm"></div>
                                <div className="w-12 bg-gray-400 h-[85%] rounded-t-sm"></div>
                                <div className="w-12 bg-[#cc5a27] h-[65%] rounded-t-sm"></div>
                            </div>
                            <div className="flex justify-around px-8 text-xs font-bold text-gray-500">
                                <span>탁상감정가</span>
                                <span>기존 희망가</span>
                                <span>인근 시세</span>
                                <span className="text-[#cc5a27]">현재 급매가</span>
                            </div>

                            <div className="mt-6">
                                <div className="text-xs font-bold tracking-widest text-[#cc5a27] uppercase mb-1">STRATEGIC ADVISORY</div>
                                <p className="text-sm text-gray-600 leading-relaxed">{info.valuationText}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ReportPage>

        {/* PAGE 3: PHOTOS */}
        <ReportPage 
            pageNumber={3} 
            title="현장 사진" 
            subtitle="Actual Field Photos" 
            targetName={targetSub}
            badgeText="PROPERTY VISUALS"
        >
            <div className="flex gap-4 h-[550px]">
                {/* Main Large Photo */}
                <div className="w-1/2 relative rounded-xl overflow-hidden shadow-md">
                    <img src={mainImage || placeholder} alt="Exterior" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/80 to-transparent">
                        <span className="text-white font-bold">{info.photoCaptions?.main}</span>
                    </div>
                </div>
                {/* 4 Grid Photos */}
                <div className="w-1/2 grid grid-cols-2 grid-rows-2 gap-4">
                    {[
                        { img: subImage1, label: info.photoCaptions?.sub1 },
                        { img: subImage2, label: info.photoCaptions?.sub2 },
                        { img: featureImage1, label: info.photoCaptions?.feat1 },
                        { img: featureImage2, label: info.photoCaptions?.feat2 },
                    ].map((p, i) => (
                        <div key={i} className="relative rounded-xl overflow-hidden shadow-md bg-gray-200">
                            <img src={p.img || placeholder} alt={p.label} className="w-full h-full object-cover" />
                            <div className="absolute bottom-0 left-0 w-full p-3 bg-gradient-to-t from-[#0d1424]/90 to-transparent">
                                <span className="text-white font-bold text-sm">{p.label}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </ReportPage>

        {/* PAGE 4: AREA ANALYSIS */}
        <ReportPage 
            pageNumber={4} 
            title="입지 및 위치도" 
            subtitle="Strategic Connectivity" 
            targetName={targetSub}
            badgeText="AREA ANALYSIS"
        >
            <div className="flex flex-col h-[550px] gap-6">
                <div className="flex gap-6 h-3/4">
                    {/* Map Box */}
                    <div className="w-2/3 border border-gray-200 rounded-2xl overflow-hidden relative shadow-sm">
                        <img src="https://placehold.co/800x400/e2e8f0/1e293b?text=Map+View" alt="Map" className="w-full h-full object-cover" />
                        <div className="absolute top-4 right-4 bg-[#0d1424] text-white p-3 rounded-lg shadow-lg border border-gray-700">
                            <div className="text-[#e29d45] text-[10px] font-bold tracking-widest uppercase mb-1">TARGET LOCATION</div>
                            <div className="font-bold text-sm whitespace-pre-wrap">{info.areaTargetName}</div>
                        </div>
                    </div>
                    {/* Info Box */}
                    <div className="w-1/3 bg-[#0d1424] rounded-2xl p-8 flex flex-col shadow-md text-white">
                        <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-6">
                            <svg className="w-6 h-6 text-[#e29d45]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </div>
                        <h3 className="text-[#e29d45] text-2xl font-bold mb-4 leading-snug whitespace-pre-wrap">{info.areaTargetName?.split('\n')[0]}<br/>클러스터</h3>
                        <p className="text-gray-300 text-sm leading-relaxed mb-auto whitespace-pre-wrap">
                            {info.areaTargetDesc?.split('\n')[0]}
                        </p>
                        <p className="text-gray-400 text-sm leading-relaxed mt-6 border-t border-white/10 pt-6 whitespace-pre-wrap">
                            {info.areaTargetDesc?.split('\n').slice(1).join('\n')}
                        </p>
                    </div>
                </div>

                {/* Bottom 3 Boxes */}
                <div className="flex gap-4 h-1/4">
                    {[1,2,3].map(i => (
                        <div key={i} className={`flex-1 border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-center ${i===3 ? 'bg-[#f8fafc]' : 'bg-white'}`}>
                            <div className={`font-bold text-xs uppercase tracking-widest mb-2 ${i===1 ? 'text-[#cc5a27]' : 'text-gray-400'}`}>{(info as any)[`areaBox${i}Title`]}</div>
                            <div className="text-gray-800 font-bold text-sm">{(info as any)[`areaBox${i}Text`]}</div>
                        </div>
                    ))}
                </div>
            </div>
        </ReportPage>

        {/* PAGE 5: ROADMAP */}
        <ReportPage 
            pageNumber={5} 
            title="가치 및 로드맵" 
            subtitle="Value & Roadmap" 
            targetName={targetSub}
            badgeText="INVESTMENT ROADMAP"
        >
            <div className="grid grid-cols-2 grid-rows-2 gap-8 h-[480px]">
                {[
                    { bg: 'bg-blue-50', border: 'border-blue-100', icon: '🏢' },
                    { bg: 'bg-green-50', border: 'border-green-100', icon: '🏡' },
                    { bg: 'bg-red-50', border: 'border-red-100', icon: '📈' },
                    { bg: 'bg-yellow-50', border: 'border-yellow-100', icon: '🏗️' },
                ].map((style, i) => {
                    const idx = i + 1;
                    return (
                        <div key={idx} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 flex items-start gap-6 hover:shadow-md transition-shadow">
                            <div className={`w-20 h-20 shrink-0 ${style.bg} rounded-xl border ${style.border} flex items-center justify-center`}>
                                 <span className="text-4xl">{style.icon}</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-extrabold text-gray-900 mb-3">{(info.roadmap as any)?.[`box${idx}Title`]}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed whitespace-pre-wrap">{(info.roadmap as any)?.[`box${idx}Text`]}</p>
                            </div>
                        </div>
                    )
                })}
            </div>
            
            <div className="mt-8 text-right pr-4">
                <p className="text-gray-500 italic font-serif-kr text-lg">"최고의 입지에 미래 가치를 더합니다."</p>
            </div>
        </ReportPage>
    </div>
  );
});

FlyerCanvas.displayName = 'FlyerCanvas';

export default FlyerCanvas;
