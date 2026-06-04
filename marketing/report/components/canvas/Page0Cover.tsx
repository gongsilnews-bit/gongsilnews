import React from 'react';
import { PropertyInfo, FlyerColor, FlyerLayout } from '../../types';
import EditableText from '../shared/EditableText';
import EditableImage from '../shared/EditableImage';
import { Building2, FileText, Phone, MapPin } from 'lucide-react';

interface Props {
  info: PropertyInfo;
  pageString: string;
  isHidden: boolean;
  layoutTheme: FlyerLayout;
  colorTheme: FlyerColor;
  onUpdateInfo?: (info: any) => void;
  coverImage?: string | null;
  customQrImage?: string | null;
  onImageUpload?: (key: string, file: File) => Promise<string | undefined>;
  isUploading?: boolean;
  isUploadingQr?: boolean;
}

const Page0Cover: React.FC<Props> = ({ info, pageString, isHidden, layoutTheme, colorTheme, onUpdateInfo, coverImage, customQrImage, onImageUpload, isUploading, isUploadingQr }) => {
  const hc = (key: string, value: any) => { if (onUpdateInfo) onUpdateInfo({ ...info, [key]: value }); };
  const headingFont = layoutTheme?.headingFont || 'font-sans';
  const bodyFont = layoutTheme?.bodyFont || 'font-sans';
  const layoutType = layoutTheme?.type || 'type1';

  const qrCodeUrl = info.coverQRLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(info.coverQRLink)}`
    : null;

  return (
    <div 
      data-export-id="page-0" 
      className={`relative bg-white w-[1122px] h-[794px] overflow-hidden flex flex-col shadow-2xl mb-8 ${bodyFont}`}
      style={{ pageBreakAfter: 'always' }}
    >
      {isHidden && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-red-500/90 text-white py-1.5 text-center text-sm font-bold shadow-md tracking-wider backdrop-blur-sm">
          ⚠️ 현재 출력(PDF/인쇄)에서 제외된 페이지입니다. (좌측 폼 메뉴에서 설정을 변경할 수 있습니다.)
        </div>
      )}

      {/* Render layout-based Cover - Standardized to Type 1 structure for ALL themes per user request */}
      {(() => {
        // Default Type 1 (Modern Overlay / Split Layout) applied to all themes
        return (
          <div className="flex-1 flex h-full">
            {/* Left side: Content */}
            <div className="w-7/12 p-20 flex flex-col justify-between h-full bg-[#f8fafc] border-r border-gray-200">
              <div className="mt-8">
                <span className="text-[var(--theme-primary)] text-xs font-black tracking-[0.3em] uppercase block mb-4">
                  <EditableText value={info.coverSubtitle || "부동산 물건 보고서"} onChange={(v) => hc('coverSubtitle', v)} />
                </span>
                <h1 className={`text-4xl font-extrabold text-gray-900 tracking-tight leading-[1.3] ${headingFont} max-w-[500px]`}>
                  <EditableText multiline={true} value={info.address || "서울특별시 강남구 논현동 매매 안내서"} onChange={(v) => hc('address', v)} />
                </h1>
                <div className="w-20 h-1 bg-[var(--theme-primary)] mt-8"></div>
              </div>

              <div className="pt-8 flex justify-between items-end">
                <div className="flex flex-col flex-1 whitespace-nowrap">
                  <span className="text-[15px] text-gray-400 font-bold tracking-widest block mb-2">
                    <EditableText value={info.agentLabel || "REALTY AGENCY"} onChange={(v) => hc('agentLabel', v)} className="!w-auto" />
                  </span>
                  <div className="text-[14px] font-extrabold text-black tracking-wide leading-[1.8] flex flex-col items-start gap-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-[14px] h-[14px] text-[var(--theme-primary)]" strokeWidth={2.5} />
                      <EditableText 
                        value={`${info.agentName || "착한임대부동산중개"} | 대표 ${info.agentRepresentative || "김상태"}`} 
                        onChange={(v) => {
                          const parts = v.split('|');
                          hc('agentName', parts[0].trim());
                          if (parts.length > 1) {
                            hc('agentRepresentative', parts[1].replace(/대표\s*/, '').trim());
                          }
                        }} 
                        className="!w-auto" 
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-[14px] h-[14px] text-[var(--theme-primary)]" strokeWidth={2.5} />
                      <EditableText 
                        value={`등록번호 : ${info.agentRegistrationNumber || "제11680-2015-00123호"}`} 
                        onChange={(v) => {
                          const val = v.replace(/^등록번호\s*:\s*/, '');
                          hc('agentRegistrationNumber', val.trim());
                        }} 
                        className="!w-auto" 
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-[14px] h-[14px] text-[var(--theme-primary)]" strokeWidth={2.5} />
                      <EditableText value={info.agentPhone || "02-1234-5678"} onChange={(v) => hc('agentPhone', v)} className="!w-auto" />
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-[14px] h-[14px] text-[var(--theme-primary)]" strokeWidth={2.5} />
                      <EditableText value={info.agentAddress || "서울 강남구 논현동 123-45"} onChange={(v) => hc('agentAddress', v)} className="!w-auto" />
                    </div>
                  </div>
                </div>
                {/* QR code moved to the right side */}
              </div>
            </div>

            {/* Right side: Modern Architectural Graphic/Accent Cover */}
            <div className="w-5/12 bg-[var(--theme-dark)] flex flex-col justify-between p-12 text-white relative overflow-hidden group/coverimg">
              {/* Background Image Layer */}
              <div className="absolute inset-0 z-10 [&_img]:opacity-20 group-hover/coverimg:[&_img]:opacity-30 [&_img]:transition-opacity">
                <EditableImage
                  src={coverImage || ""}
                  alt="표지 메인 이미지"
                  imageKey="mainImage"
                  onImageUpload={onImageUpload}
                  isUploading={isUploading}
                  aspectRatioClass="object-cover"
                  className="w-full h-full !rounded-none !border-none !bg-transparent"
                />
              </div>
              
              <div className="absolute inset-0 z-0 bg-gradient-to-tr from-[var(--theme-dark)] via-[var(--theme-dark)]/90 to-[var(--theme-primary)]/40 mix-blend-multiply pointer-events-none"></div>
              
              <div className="text-right z-20 relative pointer-events-none">
                {/* Removed CONFIDENTIAL text per user request */}
              </div>

              <div className="z-20 flex justify-end items-end h-full relative pointer-events-none">
                <div className="flex flex-col items-end">
                  <div className="w-[72px] text-center pointer-events-auto leading-tight mb-1.5">
                    <p className="text-[10px] font-extrabold text-white tracking-widest uppercase">
                      <EditableText value={info.qrLabel || "QR REPORT"} onChange={(v) => hc('qrLabel', v)} className="!w-full text-center" multiline={true} />
                    </p>
                  </div>
                  {(customQrImage || qrCodeUrl) && (
                    <div className="pointer-events-auto relative group/qr">
                      <label className="cursor-pointer block relative">
                        <img src={customQrImage || qrCodeUrl || ''} alt="QR Code" className="w-[72px] h-[72px] p-1 bg-white rounded shadow-sm opacity-95 object-cover" />
                        {onImageUpload && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/qr:opacity-100 transition-opacity rounded flex flex-col items-center justify-center print:hidden">
                            <span className="text-[10px] text-white font-bold leading-tight text-center">QR<br/>변경</span>
                          </div>
                        )}
                        {onImageUpload && (
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) onImageUpload('customQrImage', file);
                            }} 
                          />
                        )}
                        {isUploadingQr && (
                          <div className="absolute inset-0 bg-white/80 rounded flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Page0Cover;
