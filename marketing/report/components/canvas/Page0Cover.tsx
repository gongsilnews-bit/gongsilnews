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

      {/* Render layout-based Cover */}
      {(() => {
        if (layoutType === 'type2') {
          // Luxury Center (Serif, Centered, Gold/Burgundy elegance)
          return (
            <div className="flex-1 flex flex-col justify-between p-20 border-[16px] border-[var(--theme-dark)] h-full">
              <div className="text-center mt-12">
                <p className={`text-[var(--theme-primary)] text-sm tracking-[0.3em] font-bold uppercase mb-4 ${headingFont}`}>
                  <EditableText value={info.coverSubtitle || "부동산 물건 보고서"} onChange={(v) => hc('coverSubtitle', v)} />
                </p>
                <div className="w-16 h-[2px] bg-[var(--theme-primary)] mx-auto my-6"></div>
                <h1 className={`text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-[0.2em] leading-tight ${headingFont}`}>
                  <EditableText value={info.coverTitle || "INVESTMENT MEMORANDUM"} onChange={(v) => hc('coverTitle', v)} />
                </h1>
              </div>

              <div className="text-center flex flex-col items-center justify-center my-6">
                <div className="text-xl font-bold text-gray-800 tracking-wider max-w-[700px] leading-relaxed border-y border-gray-200 py-6 px-10">
                  <EditableText multiline={true} value={info.address || "서울특별시 강남구 논현동 매매 안내서"} onChange={(v) => hc('address', v)} />
                </div>
              </div>

              <div className="flex justify-between items-end">
                <div className="text-left">
                  <p className="text-xs text-gray-400 tracking-wider font-bold mb-1">PREPARED BY</p>
                  <p className="text-base font-extrabold text-gray-800 tracking-wide">
                    <EditableText value={info.agentName || "미래에셋공인 중개사 사무소"} onChange={(v) => hc('agentName', v)} />
                  </p>
                </div>
                {qrCodeUrl && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-2 border border-gray-200 bg-white shadow-sm rounded-lg">
                      <img src={qrCodeUrl} alt="QR Code" className="w-20 h-20" />
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold tracking-wider">SCAN FOR DETAIL</span>
                  </div>
                )}
              </div>
            </div>
          );
        }

        if (layoutType === 'type3') {
          // Natural Clean (Left Accent Bar, Clean Sans, Fresh)
          return (
            <div className="flex-1 flex h-full border-r-[16px] border-[var(--theme-primary)]">
              {/* Left Accent Bar */}
              <div className="w-[40px] bg-[var(--theme-primary)] h-full shrink-0"></div>
              {/* Content */}
              <div className="flex-1 flex flex-col justify-between p-20">
                <div className="mt-10">
                  <div className="inline-block bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] px-3 py-1 text-xs font-black tracking-widest uppercase rounded-full mb-4">
                    <EditableText value={info.coverSubtitle || "부동산 물건 보고서"} onChange={(v) => hc('coverSubtitle', v)} />
                  </div>
                  <h1 className={`text-5xl font-black text-gray-900 tracking-tight leading-none mt-2 ${headingFont}`}>
                    <EditableText value={info.coverTitle || "INVESTMENT MEMORANDUM"} onChange={(v) => hc('coverTitle', v)} />
                  </h1>
                  <div className="w-24 h-[6px] bg-[var(--theme-primary)] mt-8"></div>
                </div>

                <div className="my-10">
                  <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight leading-relaxed max-w-[650px]">
                    <EditableText multiline={true} value={info.address || "서울특별시 강남구 논현동 매매 안내서"} onChange={(v) => hc('address', v)} />
                  </h2>
                </div>

                <div className="flex justify-between items-end border-t border-gray-100 pt-10">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold tracking-widest block mb-1">ISSUED BY</span>
                    <span className="text-lg font-black text-[var(--theme-primary)]">
                      <EditableText value={info.agentName || "미래에셋공인 중개사 사무소"} onChange={(v) => hc('agentName', v)} />
                    </span>
                  </div>
                  {qrCodeUrl && (
                    <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100 shadow-sm">
                      <img src={qrCodeUrl} alt="QR Code" className="w-16 h-16 rounded-md" />
                      <div className="text-left">
                        <p className="text-xs font-black text-gray-800">QR 안내</p>
                        <p className="text-[10px] text-gray-400 font-bold leading-tight mt-0.5">스마트폰 카메라로<br />스캔하여 상세 정보 확인</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }

        if (layoutType === 'type4') {
          // Bold Box (Full Theme Dark / Primary contrast)
          return (
            <div className="flex-1 flex flex-col justify-between p-20 bg-[var(--theme-dark)] text-white h-full relative">
              {/* Decorative background box */}
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[var(--theme-primary)] opacity-10 rounded-bl-full pointer-events-none"></div>
              
              <div className="mt-10">
                <span className="text-[var(--theme-secondary)] text-sm font-bold tracking-[0.3em] uppercase block mb-3">
                  <EditableText value={info.coverSubtitle || "부동산 물건 보고서"} onChange={(v) => hc('coverSubtitle', v)} />
                </span>
                <h1 className={`text-6xl font-black tracking-tighter leading-none uppercase ${headingFont}`}>
                  <EditableText value={info.coverTitle || "INVESTMENT MEMORANDUM"} onChange={(v) => hc('coverTitle', v)} />
                </h1>
                <div className="w-32 h-[8px] bg-[var(--theme-secondary)] mt-6"></div>
              </div>

              <div className="my-10 bg-white/5 border border-white/10 rounded-2xl p-8 max-w-[750px] backdrop-blur-sm">
                <h2 className="text-2xl font-bold text-white tracking-wide leading-normal">
                  <EditableText multiline={true} value={info.address || "서울특별시 강남구 논현동 매매 안내서"} onChange={(v) => hc('address', v)} />
                </h2>
              </div>

              <div className="flex justify-between items-end border-t border-white/10 pt-10">
                <div>
                  <span className="text-[10px] text-white/50 font-bold tracking-widest block mb-1">PARTNER BROKER</span>
                  <span className="text-lg font-bold text-[var(--theme-secondary)] tracking-wide">
                    <EditableText value={info.agentName || "미래에셋공인 중개사 사무소"} onChange={(v) => hc('agentName', v)} />
                  </span>
                </div>
                {qrCodeUrl && (
                  <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-lg border border-white/10">
                    <img src={qrCodeUrl} alt="QR Code" className="w-16 h-16" />
                    <div className="text-left text-gray-800">
                      <p className="text-xs font-bold">ONLINE BRIEFING</p>
                      <p className="text-[9px] text-gray-400 font-bold mt-0.5">Scan to view webpage</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        }

        if (layoutType === 'type5') {
          // High-end Minimal (Sleek, Space, Thin Lines, Editorial Look)
          return (
            <div className="flex-1 flex flex-col justify-between p-24 bg-white h-full border-t-[8px] border-[var(--theme-primary)]">
              <div className="mt-12 flex justify-between items-start">
                <div className="max-w-[60%]">
                  <h1 className={`text-4xl font-light text-gray-900 tracking-[0.25em] leading-tight uppercase mb-4 ${headingFont}`}>
                    <EditableText value={info.coverTitle || "INVESTMENT MEMORANDUM"} onChange={(v) => hc('coverTitle', v)} />
                  </h1>
                  <p className="text-xs text-gray-400 tracking-[0.4em] uppercase font-semibold">
                    <EditableText value={info.coverSubtitle || "부동산 물건 보고서"} onChange={(v) => hc('coverSubtitle', v)} />
                  </p>
                </div>
                <div className="w-[100px] h-[1px] bg-gray-300 mt-4"></div>
              </div>

              <div className="my-10 border-l border-gray-900 pl-8">
                <h2 className="text-3xl font-light text-gray-900 tracking-wide leading-relaxed max-w-[650px]">
                  <EditableText multiline={true} value={info.address || "서울특별시 강남구 논현동 매매 안내서"} onChange={(v) => hc('address', v)} />
                </h2>
              </div>

              <div className="flex justify-between items-end border-t border-gray-100 pt-12">
                <div>
                  <span className="text-[9px] text-gray-400 tracking-[0.3em] font-semibold block mb-2">REPRESENTATIVE AGENCY</span>
                  <span className="text-base font-bold text-gray-800 tracking-wider">
                    <EditableText value={info.agentName || "미래에셋공인 중개사 사무소"} onChange={(v) => hc('agentName', v)} />
                  </span>
                </div>
                {qrCodeUrl && (
                  <div className="flex flex-col items-end gap-1.5">
                    <img src={qrCodeUrl} alt="QR Code" className="w-14 h-14 grayscale hover:grayscale-0 transition-all border border-gray-100 p-1 bg-white" />
                    <span className="text-[9px] text-gray-400 font-semibold tracking-widest">QR CODE</span>
                  </div>
                )}
              </div>
            </div>
          );
        }

        // Default Type 1 (Modern Overlay / Split Layout)
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

              <div className="border-t border-gray-200 pt-8 flex justify-between items-end">
                <div className="flex flex-col flex-1 whitespace-nowrap">
                  <span className="text-[10px] text-gray-400 font-bold tracking-widest block mb-2">
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
                  <div className="text-right mb-3">
                    <p className="text-[10px] text-white/50 tracking-widest uppercase font-bold mb-2">CLASSIFICATION</p>
                    <p className="text-[14px] font-extrabold text-white tracking-wide uppercase">REAL ESTATE BRIEF</p>
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
