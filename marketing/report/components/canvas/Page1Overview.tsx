import React from 'react';
import { PropertyInfo, FlyerColor, FlyerLayout } from '../../types';
import { EditableText, EditableBlock, ReportPage, SectionTitle, EditableImage } from '../shared';

interface Props {
  info: PropertyInfo; pageString: string; isHidden: boolean;
  layoutTheme: FlyerLayout; colorTheme: FlyerColor;
  mainImage: string;
  onUpdateInfo?: (info: any) => void;
  onImageUpload?: (key: string, file: File) => Promise<string | undefined>;
  isUploadingImage?: Record<string, boolean>;
}

const Page1Overview: React.FC<Props> = ({ info, pageString, isHidden, layoutTheme, colorTheme, mainImage, onUpdateInfo, onImageUpload, isUploadingImage }) => {
  const hc = (key: string, value: any) => { if (onUpdateInfo) onUpdateInfo({ ...info, [key]: value }); };
  const targetTitle = info.address || '서초동 역세권 매매 안내서';
  const price = info.priceMain || '75억 원';

  return (
    <ReportPage layoutTheme={layoutTheme} colorTheme={colorTheme}
        pageNumber={1} pageString={pageString} isHidden={isHidden}
        title={targetTitle} subtitle={info.subTitle} 
        badgeText={info.pageBadges?.page1 || "FOR SALE"} exportId="page-1"
        onUpdateTitle={(v) => hc('address', v)} onUpdateSubtitle={(v) => hc('subTitle', v)}
        onUpdateBadge={(v) => { if (onUpdateInfo) onUpdateInfo({ ...info, pageBadges: { ...(info.pageBadges || {}), page1: v } }); }}
        footerText={info.footerText || "PROPERTY REPORT"}
        onUpdateFooter={(v) => hc('footerText', v)}
    >
        <div className="flex gap-8 h-full">
            {/* Left Col: Overview Table */}
            <div className="w-5/12 flex flex-col justify-between">
                <div>
                    <SectionTitle 
                        title={info.overviewTitle || "PROPERTY OVERVIEW"} subtitle={info.overviewSubtitle || "물건개요"} 
                        onUpdateTitle={(v) => { if (onUpdateInfo) onUpdateInfo({ ...info, overviewTitle: v }); }}
                        onUpdateSubtitle={(v) => { if (onUpdateInfo) onUpdateInfo({ ...info, overviewSubtitle: v }); }}
                    />
                    <table className="w-full text-sm border-collapse table-fixed border-t-[3px] border-gray-800 border-b border-gray-200">
                        <tbody>
                        {(() => {
                            if (Array.isArray(info.overviewTable)) {
                                return (<>
                                    {info.overviewTable.map((row, i) => (
                                        <tr key={i} className="border-b border-gray-100 last:border-0 bg-white">
                                            <td className="w-1/3 text-gray-500 font-bold py-2 pl-4 align-middle">
                                                <EditableText value={row.label} onChange={(v) => { const n = [...info.overviewTable]; n[i] = { ...n[i], label: v }; hc('overviewTable', n); }} />
                                            </td>
                                            <td className="w-2/3 text-gray-800 font-bold py-2 pl-4 align-middle">
                                                <EditableText value={row.value} onChange={(v) => { const n = [...info.overviewTable]; n[i] = { ...n[i], value: v }; hc('overviewTable', n); }} />
                                            </td>
                                        </tr>
                                    ))}
                                </>);
                            }
                            const rows = [
                                { k: '소재지', v: info.overviewTable?.location }, { k: '용도지역', v: info.overviewTable?.zoning },
                                { k: '대지면적', v: info.overviewTable?.landArea }, { k: '연면적', v: info.overviewTable?.totalArea },
                                { k: '건물규모', v: info.overviewTable?.buildingScale }, { k: '주용도', v: info.overviewTable?.mainPurpose },
                                { k: '주차대수', v: info.overviewTable?.parking }, { k: '승강기', v: info.overviewTable?.elevator },
                                { k: '준공연도', v: info.overviewTable?.completionYear },
                            ];
                            return rows.filter(r => r.v && r.v.trim() !== '').map((r, i) => (
                                <tr key={i} className="border-b border-gray-100 last:border-0 bg-white">
                                    <td className="w-1/3 text-gray-500 font-bold py-2 pl-4 align-middle">{r.k}</td>
                                    <td className="w-2/3 text-gray-800 font-bold py-2 pl-4 align-middle">{r.v}</td>
                                </tr>
                            ));
                        })()}
                        {/* Price Row */}
                        {(() => {
                            const tType = info.transactionType || "매매";
                            let label = "매매가";
                            if (tType === "전세") label = "보증금 (전세)";
                            else if (tType === "월세" || tType === "임대") label = "보증금 / 월세";
                            else if (tType !== "매매") label = "임대가";
                            return (
                                <tr className="border-t border-gray-200" style={{ backgroundColor: info.priceBgColor || '#fff9f0' }}>
                                    <td className="w-1/3 text-gray-600 font-bold py-2 pl-4 align-middle">
                                        <EditableText value={info.priceMainLabel || label} onChange={(v) => hc('priceMainLabel', v)} className="w-full hover:bg-white/50 hover:ring-2 hover:ring-amber-200 rounded px-1 -ml-1 transition-all text-left" />
                                    </td>
                                    <td className="w-2/3 font-extrabold py-2 pl-4 align-middle" style={{ color: info.priceTextColor || '#cc5a27' }}>
                                        <EditableText value={(() => {
                                            const tType = info.transactionType || "매매";
                                            if ((tType === "월세" || tType === "단기임대") && info.priceSub) {
                                                return `${price} / ${info.priceSub}`;
                                            }
                                            return price;
                                        })()} onChange={(v) => hc('priceMain', v)} />
                                    </td>
                                </tr>
                            );
                        })()}
                        </tbody>
                    </table>
                </div>
                {/* Agent Footer */}
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3.5 mt-3 flex flex-col justify-center shadow-sm">
                    <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1.5 text-sm">
                        <span className="text-gray-500 font-bold flex items-center">
                            <EditableText value={info.agentNameLabel || "부동산명"} onChange={(v) => hc('agentNameLabel', v)} className="w-full hover:bg-gray-100 hover:ring-2 hover:ring-gray-200 rounded px-1 -ml-1 transition-all text-left" />
                        </span>
                        <span className="text-gray-800 font-extrabold flex items-center">
                            <EditableText value={info.agentName} onChange={(v) => hc('agentName', v)} className="w-full" />
                        </span>
                        <span className="text-gray-500 font-bold flex items-center">
                            <EditableText value={info.agentRepresentativeLabel || "담당자"} onChange={(v) => hc('agentRepresentativeLabel', v)} className="w-full hover:bg-gray-100 hover:ring-2 hover:ring-gray-200 rounded px-1 -ml-1 transition-all text-left" />
                        </span>
                        <span className="text-gray-800 font-extrabold flex items-center">
                            <EditableText value={info.agentRepresentative} onChange={(v) => hc('agentRepresentative', v)} className="w-full" />
                        </span>
                        <span className="text-gray-500 font-bold flex items-center">
                            <EditableText value={info.agentContactLabel || "연락처"} onChange={(v) => hc('agentContactLabel', v)} className="w-full hover:bg-gray-100 hover:ring-2 hover:ring-gray-200 rounded px-1 -ml-1 transition-all text-left" />
                        </span>
                        <span className="text-[#cc5a27] font-black text-base flex items-center">
                            <EditableText value={info.agentMobile || info.agentPhone || ""} onChange={(v) => hc('agentMobile', v)} className="w-full" />
                        </span>
                    </div>
                </div>
            </div>
            {/* Right Col: Image & Summary */}
            <div className="w-7/12 flex flex-col justify-between h-full">
                <div className="h-[340px]">
                    <EditableImage src={mainImage || ""} alt="Main Image" imageKey="mainImage" onImageUpload={onImageUpload} isUploading={isUploadingImage?.mainImage} aspectRatioClass="object-cover" />
                </div>
                <div>
                    <SectionTitle 
                        title={info.investmentTitle || "INVESTMENT SUMMARY"} subtitle={info.investmentSubtitle || "투자요약"}
                        onUpdateTitle={(v) => { if (onUpdateInfo) onUpdateInfo({ ...info, investmentTitle: v }); }}
                        onUpdateSubtitle={(v) => { if (onUpdateInfo) onUpdateInfo({ ...info, investmentSubtitle: v }); }}
                    />
                    <div className="flex gap-4 border-l-4 pl-4" style={{ borderColor: colorTheme?.primary || '#cc5a27' }}>
                        {[1,2,3].map(i => (
                            <div key={i} className="flex-1 bg-white border border-gray-100 rounded-lg p-4 text-center shadow-sm">
                                <div className="text-xs text-gray-400 font-bold tracking-widest mb-2 uppercase">
                                    <EditableText value={(info.investmentSummary as any)?.[`box${i}Title`] || ""} onChange={(v) => { if (onUpdateInfo) onUpdateInfo({ ...info, investmentSummary: { ...info.investmentSummary, [`box${i}Title`]: v } }); }} />
                                </div>
                                <div className="font-extrabold text-gray-800 text-lg leading-tight whitespace-pre-wrap">
                                    <EditableBlock value={(info.investmentSummary as any)?.[`box${i}Text`] || ""} onChange={(v) => { if (onUpdateInfo) onUpdateInfo({ ...info, investmentSummary: { ...info.investmentSummary, [`box${i}Text`]: v } }); }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </ReportPage>
  );
};

export default Page1Overview;
