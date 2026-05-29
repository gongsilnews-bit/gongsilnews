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
                    <div className="bg-[#cc5a27] text-white text-xs font-bold px-2 py-1 inline-block mb-3 tracking-widest rounded-sm">
                        {badgeText || 'PROPERTY INFORMATION'}
                    </div>
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
            subtitle="Asset Sales Briefing" 
            targetName={targetSub}
        >
            <div className="flex gap-8 h-full">
                {/* Left Col: Overview Table */}
                <div className="w-5/12 flex flex-col justify-between">
                    <div>
                        <SectionTitle title="PROPERTY OVERVIEW" subtitle="물건개요" />
                        <div className="border-t-[3px] border-gray-800 flex flex-col text-sm border-b border-gray-200">
                            {[
                                { k: '소재지', v: info.address || '서울 서초구 서초동 1444-9' },
                                { k: '용도지역', v: '제3종 일반주거지역 / 도로 6m 접' },
                                { k: '대지면적', v: '317.9㎡ (96.16평)' },
                                { k: '연면적', v: info.area || '905.13㎡ (273.8평)' },
                                { k: '건물규모', v: info.floor || '지하 1층 / 지상 5층' },
                                { k: '주용도', v: '근린생활시설 및 주택 (상가주택)' },
                                { k: '주차대수', v: info.parking || '자주식 7대' },
                                { k: '승강기', v: '1대 완비' },
                                { k: '준공연도', v: '2002년 (최근 층별 리모델링 완료)' },
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

                    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-5 mt-4">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-full bg-[#cc5a27] text-white flex items-center justify-center font-bold text-xs">L</div>
                            <span className="font-bold text-gray-800">Location Index</span>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            {info.noticeContent || "3호선 남부터미널역 도보 4분 초역세권 입지로, 예술의전당 및 국제전자센터 인근의 핵심 업무/문화 인프라를 직접 누리는 최상의 요지입니다."}
                        </p>
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
                            <div className="flex-1 bg-white border border-gray-100 rounded-lg p-4 text-center shadow-sm">
                                <div className="text-xs text-gray-400 font-bold tracking-widest mb-2 uppercase">CONNECTIVITY</div>
                                <div className="font-extrabold text-gray-800 text-lg leading-tight">전철역<br/>도보 4분</div>
                            </div>
                            <div className="flex-1 bg-white border border-gray-100 rounded-lg p-4 text-center shadow-sm">
                                <div className="text-xs text-gray-400 font-bold tracking-widest mb-2 uppercase">ASSET QUALITY</div>
                                <div className="font-extrabold text-gray-800 text-lg leading-tight">내외관<br/>리모델링</div>
                            </div>
                            <div className="flex-1 bg-white border border-gray-100 rounded-lg p-4 text-center shadow-sm">
                                <div className="text-xs text-gray-400 font-bold tracking-widest mb-2 uppercase">SUITABILITY</div>
                                <div className="font-extrabold text-gray-800 text-lg leading-tight">사옥 및<br/>수익형 최적</div>
                            </div>
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
                                <tr><td className="py-4">5F</td><td>주택</td><td rowSpan={6} className="text-[#cc5a27] font-bold text-xs writing-vertical-lr tracking-widest border-x border-dashed border-[#cc5a27]/30 bg-[#fff9f0]">보증금 / 차임 내역 별도문의</td><td className="font-bold">임대 중</td><td className="text-gray-500">명도 용이</td></tr>
                                <tr><td className="py-4">4F</td><td>주택</td><td className="font-bold">가족 거주</td><td className="text-gray-500">명도 용이</td></tr>
                                <tr><td className="py-4">3F</td><td>근생</td><td className="font-bold">임대 중</td><td className="text-gray-500">명도 협의</td></tr>
                                <tr><td className="py-4">2F</td><td>근생</td><td className="font-bold">임대 중</td><td className="text-gray-500">명도 용이</td></tr>
                                <tr><td className="py-4">1F</td><td>근생</td><td className="font-bold">가족 사용</td><td className="text-gray-500">명도 용이</td></tr>
                                <tr><td className="py-4 font-bold">B1</td><td className="font-bold">근생</td><td className="text-[#cc5a27] font-bold">현재 공실</td><td className="font-bold text-gray-800">즉시 활용</td></tr>
                            </tbody>
                        </table>
                        <div className="p-4 mt-auto border-t border-gray-100 text-xs text-gray-500 leading-relaxed bg-[#f8fafc]">
                            ※ 전체 6개 층 중 3개 층(B1, 1F, 4F)이 소유주 직접 관리 하에 있어, 신속한 인도 및 명도 협의가 가능합니다.
                        </div>
                    </div>
                </div>

                {/* Right: Highlights & Chart */}
                <div className="w-7/12 h-full flex flex-col">
                    <div className="text-gray-600 font-bold text-sm mb-4">2. 매각 핵심 하이라이트 & 시세 분석</div>
                    <div className="flex-1 border border-yellow-200 rounded-lg p-6 bg-white shadow-sm flex flex-col">
                        <h3 className="text-xl font-extrabold text-gray-900 mb-4 border-b-2 border-gray-800 pb-2 inline-block">매각 핵심 하이라이트</h3>
                        <ul className="space-y-3 mb-8">
                            <li className="flex gap-2 text-sm"><span className="text-[#cc5a27] font-bold">•</span><span><strong>가격 경쟁력:</strong> 감정가 대비 매우 낮은 파격적인 금매가</span></li>
                            <li className="flex gap-2 text-sm"><span className="text-[#cc5a27] font-bold">•</span><span><strong>입지 강점:</strong> 역세권 초인접, 오피스 밀집지로 배후수요 풍부</span></li>
                            <li className="flex gap-2 text-sm"><span className="text-[#cc5a27] font-bold">•</span><span><strong>명도 완료:</strong> 지하 공실 및 소유주 가족 점유로 즉시 인도 협의 가능</span></li>
                            <li className="flex gap-2 text-sm"><span className="text-[#cc5a27] font-bold">•</span><span><strong>행정 지원:</strong> 책임명도 및 근생 용도변경 등 전폭적 지원</span></li>
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
                                <p className="text-sm text-gray-600 leading-relaxed">본 자산은 역세권 {price} 희소 급매물로, 매입 즉시 감정가 대비 강력한 시세 차익 확보가 가능하며 사업 가치 증대에 최적화된 조건입니다.</p>
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
                        <span className="text-white font-bold">EXTERIOR VIEW - 건물 정면 외관</span>
                    </div>
                </div>
                {/* 4 Grid Photos */}
                <div className="w-1/2 grid grid-cols-2 grid-rows-2 gap-4">
                    {[
                        { img: subImage1, label: "Side View" },
                        { img: subImage2, label: "Entrance" },
                        { img: featureImage1, label: "1F Interior" },
                        { img: featureImage2, label: "Rooftop" },
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
                            <div className="font-bold text-sm">남부터미널역(3호선)<br/>도보 4분 초역세권</div>
                        </div>
                    </div>
                    {/* Info Box */}
                    <div className="w-1/3 bg-[#0d1424] rounded-2xl p-8 flex flex-col shadow-md text-white">
                        <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-6">
                            <svg className="w-6 h-6 text-[#e29d45]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </div>
                        <h3 className="text-[#e29d45] text-2xl font-bold mb-4 leading-snug">서초동 문화/비즈니스<br/>클러스터</h3>
                        <p className="text-gray-300 text-sm leading-relaxed mb-auto">
                            대한민국 최고의 문화 인프라와 남부터미널 업무 지구의 풍부한 배후 수요가 공존합니다.
                        </p>
                        <p className="text-gray-400 text-sm leading-relaxed mt-6 border-t border-white/10 pt-6">
                            희소성 높은 초역세권 대지로서 사옥 신축 및 수익형 밸류업 시 최고의 자산 가치를 보장합니다.
                        </p>
                    </div>
                </div>

                {/* Bottom 3 Boxes */}
                <div className="flex gap-4 h-1/4">
                    <div className="flex-1 border border-gray-200 rounded-xl p-5 bg-white shadow-sm flex flex-col justify-center">
                        <div className="text-[#cc5a27] font-bold text-xs uppercase tracking-widest mb-2">STATION AREA</div>
                        <div className="text-gray-800 font-bold text-sm">지하철 3호선 남부터미널역과 도보 약 250m 거리로 최상의 대중교통 접근성 확보</div>
                    </div>
                    <div className="flex-1 border border-gray-200 rounded-xl p-5 bg-white shadow-sm flex flex-col justify-center">
                        <div className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-2">CULTURAL DIST.</div>
                        <div className="text-gray-800 font-bold text-sm">대한민국 대표 문화거점인 예술의전당, 국립국악원 및 관련 클러스터 인접</div>
                    </div>
                    <div className="flex-1 border border-gray-200 rounded-xl p-5 bg-[#f8fafc] shadow-sm flex flex-col justify-center">
                        <div className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-2">CONNECTIVITY</div>
                        <div className="text-gray-800 font-bold text-sm">남부순환로, 서초중앙로 진입이 용이하여 강남권 전역 및 고속도로 접근성 탁월</div>
                    </div>
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
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 flex items-start gap-6 hover:shadow-md transition-shadow">
                    <div className="w-20 h-20 shrink-0 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-center">
                         <span className="text-4xl">🏢</span>
                    </div>
                    <div>
                        <h3 className="text-xl font-extrabold text-gray-900 mb-3">단독 사옥 활용 시나리오</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">전층 명도 협의 후 기업의 아이덴티티를 투영한 단독 사옥으로 활용합니다. 서초동 초역세권 입지의 상징성을 동시에 확보할 수 있는 최상의 환경을 제공합니다.</p>
                    </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 flex items-start gap-6 hover:shadow-md transition-shadow">
                    <div className="w-20 h-20 shrink-0 bg-green-50 rounded-xl border border-green-100 flex items-center justify-center">
                         <span className="text-4xl">🏡</span>
                    </div>
                    <div>
                        <h3 className="text-xl font-extrabold text-gray-900 mb-3">주거 및 근생 수익 모델</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">상층부(4~5층) 실거주를 통해 최고의 직주근접 환경을 실현합니다. 하층부(B1~3층)는 오피스 및 갤러리 임대를 통해 안정적인 월세 수익을 확보할 수 있습니다.</p>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 flex items-start gap-6 hover:shadow-md transition-shadow">
                    <div className="w-20 h-20 shrink-0 bg-red-50 rounded-xl border border-red-100 flex items-center justify-center">
                         <span className="text-4xl">📈</span>
                    </div>
                    <div>
                        <h3 className="text-xl font-extrabold text-gray-900 mb-3">수익형 자산 밸류업 전략</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">주택 부분의 근생 용도변경 및 전면 리모델링을 통해 우량 법인 임차를 유치합니다. 자산 가치 극대화 후 시세 차익 실현에 집중하는 투자 안입니다.</p>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 flex items-start gap-6 hover:shadow-md transition-shadow">
                    <div className="w-20 h-20 shrink-0 bg-yellow-50 rounded-xl border border-yellow-100 flex items-center justify-center">
                         <span className="text-4xl">🏗️</span>
                    </div>
                    <div>
                        <h3 className="text-xl font-extrabold text-gray-900 mb-3">역세권 오피스 개발안</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">제3종일반주거지역의 높은 용적률을 활용한 고품격 오피스 빌딩 신축 개발입니다. 서초동 초역세권 입지의 희소성을 활용하여 개발 이익을 극대화할 수 있습니다.</p>
                    </div>
                </div>
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
