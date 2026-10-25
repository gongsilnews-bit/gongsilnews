import React from 'react';
import { PropertyInfo, FlyerColor, FlyerLayout } from '../../types';
import { detectPropertyCategory, getOverviewTemplate } from '../../propertyTemplates';
import { EditableText, EditableBlock, ReportPage, SectionTitle, EditableImage } from '../shared';
import { fieldProps, fieldValue, setField } from '../../reportFields';

interface Props {
  info: PropertyInfo; pageString: string; isHidden: boolean;
  layoutTheme: FlyerLayout; colorTheme: FlyerColor;
  mainImage: string;
  customQrImage?: string | null;
  onUpdateInfo?: (info: any) => void;
  onImageUpload?: (key: string, file: File) => Promise<string | undefined>;
  isUploadingImage?: Record<string, boolean>;
}

const Page1Overview: React.FC<Props> = ({ info, pageString, isHidden, layoutTheme, colorTheme, mainImage, customQrImage, onUpdateInfo, onImageUpload, isUploadingImage }) => {
  const hc = (key: string, value: any) => { if (onUpdateInfo) onUpdateInfo({ ...info, [key]: value }); };
  // 글 칸은 칸 목록(reportFields)에서 — 입력란 [개요] 탭과 같은 값 (2026-10-25)
  const F = (key: string, cls = '') => fieldProps(info, onUpdateInfo, key, cls);
  const on = (key: string) => (v: string) => { if (onUpdateInfo) onUpdateInfo(setField(info, key, v)); };

  // [표지] QR코드 넣기를 끄면 표지·개요의 QR을 모두 뺀다
  const qrCodeUrl = info.coverQRLink && !info.hideCoverQR
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(info.coverQRLink)}`
    : null;
  const qrImage = info.hideCoverQR ? null : customQrImage;

  return (
    <ReportPage layoutTheme={layoutTheme} colorTheme={colorTheme}
        pageNumber={1} pageString={pageString} isHidden={isHidden}
        title={fieldValue(info, 'address')} subtitle={fieldValue(info, 'subTitle')}
        badgeText={fieldValue(info, 'pageBadges.page1')} exportId="page-1"
        onUpdateTitle={on('address')} onUpdateSubtitle={on('subTitle')}
        onUpdateBadge={on('pageBadges.page1')}
        footerText={fieldValue(info, 'footerText')}
        onUpdateFooter={on('footerText')}
    >
        <div className="flex gap-8 h-full">
            {/* Left Col: Overview Table */}
            <div className="w-5/12 flex flex-col justify-between">
                <div>
                    <SectionTitle
                        title={fieldValue(info, 'overviewTitle')} subtitle={fieldValue(info, 'overviewSubtitle')}
                        onUpdateTitle={on('overviewTitle')} onUpdateSubtitle={on('overviewSubtitle')}
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
                            const cat = detectPropertyCategory(info.subCategory, info.propertyCategory);
                            const isSale = !info.transactionType || info.transactionType === '매매';
                            const template = getOverviewTemplate(cat, isSale, info.subCategory);
                            const tblObj = info.overviewTable as any;
                            const rows = template.map((f: any) => ({
                                k: f.label,
                                v: f.dataKey ? (tblObj?.[f.dataKey] || '') : ''
                            }));
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
                            return (
                                <tr className="border-t border-gray-200" style={{ backgroundColor: info.priceBgColor || '#fff9f0' }}>
                                    <td className="w-1/3 text-gray-600 font-bold py-2 pl-4 align-middle">
                                        <EditableText {...F('priceMainLabel', 'w-full hover:bg-white/50 hover:ring-2 hover:ring-amber-200 rounded px-1 -ml-1 transition-all text-left')} />
                                    </td>
                                    <td className="w-2/3 font-extrabold py-2 pl-4 align-middle" style={{ color: info.priceTextColor || '#cc5a27' }}>
                                        {/* 가격 · 월세는 칸이 따로 (예전엔 "가격 / 월세"를 통째로 가격 칸에 써서 월세가 두 번 붙었다) */}
                                        <span className="inline-flex items-center gap-1 w-full">
                                            <EditableText {...F('priceMain', '!w-auto')} />
                                            {(tType === "월세" || tType === "단기임대") && (<><span>/</span><EditableText {...F('priceSub', '!w-auto')} /></>)}
                                        </span>
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
                            <EditableText {...F('agentNameLabel', 'w-full hover:bg-gray-100 hover:ring-2 hover:ring-gray-200 rounded px-1 -ml-1 transition-all text-left')} />
                        </span>
                        <span className="text-gray-800 font-extrabold flex items-center">
                            <EditableText {...F('agentName', 'w-full')} />
                        </span>
                        <span className="text-gray-500 font-bold flex items-center">
                            <EditableText {...F('agentRepresentativeLabel', 'w-full hover:bg-gray-100 hover:ring-2 hover:ring-gray-200 rounded px-1 -ml-1 transition-all text-left')} />
                        </span>
                        <span className="text-gray-800 font-extrabold flex items-center">
                            <EditableText {...F('agentRepresentative', 'w-full')} />
                        </span>
                        <span className="text-gray-500 font-bold flex items-center">
                            <EditableText {...F('agentContactLabel', 'w-full hover:bg-gray-100 hover:ring-2 hover:ring-gray-200 rounded px-1 -ml-1 transition-all text-left')} />
                        </span>
                        <span className="text-[#cc5a27] font-black text-base flex items-center">
                            <EditableText {...F('agentMobile', 'w-full')} />
                        </span>
                    </div>
                </div>
            </div>
            {/* Right Col: Image & Summary */}
            <div className="w-7/12 flex flex-col justify-between h-full">
                <div className="h-[340px] relative">
                    <EditableImage src={mainImage || ""} alt="Main Image" imageKey="mainImage" onImageUpload={onImageUpload} isUploading={isUploadingImage?.mainImage} aspectRatioClass="object-cover" />
                    {(qrImage || qrCodeUrl) && (
                        <div className="absolute bottom-3 right-3 p-1 bg-white rounded shadow-md border border-gray-100 z-30">
                            <img src={qrImage || qrCodeUrl || ''} alt="QR Code" className="w-32 h-32 rounded object-cover" />
                        </div>
                    )}
                </div>
                <div>
                    <SectionTitle
                        title={fieldValue(info, 'investmentTitle')} subtitle={fieldValue(info, 'investmentSubtitle')}
                        onUpdateTitle={on('investmentTitle')} onUpdateSubtitle={on('investmentSubtitle')}
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
