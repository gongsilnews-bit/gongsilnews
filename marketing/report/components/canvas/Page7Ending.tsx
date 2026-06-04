import React from 'react';
import { PropertyInfo, FlyerColor, FlyerLayout } from '../../types';
import EditableText from '../shared/EditableText';
import EditableImage from '../shared/EditableImage';
import KakaoMap from '../shared/KakaoMap';
import { 
  MapPinIcon, 
  BuildingOfficeIcon, 
  PhoneIcon, 
  ChatBubbleOvalLeftEllipsisIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  PlayCircleIcon
} from '@heroicons/react/24/solid';
interface Props {
  info: PropertyInfo;
  pageString: string;
  isHidden: boolean;
  layoutTheme: FlyerLayout;
  colorTheme: FlyerColor;
  onUpdateInfo?: (info: any) => void;
  agentImage?: string | null;
  onImageUpload?: (key: string, file: File) => Promise<string | undefined>;
  onDeleteImage?: (key: string) => void;
  isUploading?: boolean;
}

const Page7Ending: React.FC<Props> = ({ info, pageString, isHidden, layoutTheme, colorTheme, onUpdateInfo, agentImage, onImageUpload, onDeleteImage, isUploading }) => {
  const hc = (key: string, value: any) => { if (onUpdateInfo) onUpdateInfo({ ...info, [key]: value }); };
  const headingFont = layoutTheme?.headingFont || 'font-sans';
  const bodyFont = layoutTheme?.bodyFont || 'font-sans';
  const layoutType = layoutTheme?.type || 'type1';

  const qrCodeUrl = info.contactQRLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(info.contactQRLink)}`
    : null;

  return (
    <div 
      data-export-id="page-7" 
      className={`relative bg-white w-[1122px] h-[794px] overflow-hidden flex flex-col shadow-2xl mb-8 ${bodyFont}`}
      style={{ pageBreakAfter: 'always' }}
    >
      {isHidden && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-red-500/90 text-white py-1.5 text-center text-sm font-bold shadow-md tracking-wider backdrop-blur-sm">
          ⚠️ 현재 출력(PDF/인쇄)에서 제외된 페이지입니다. (좌측 폼 메뉴에서 설정을 변경할 수 있습니다.)
        </div>
      )}

      {/* Render layout-based Ending */}
      {(() => {
        if (layoutType === 'type2') {
          // Luxury Center
          return (
            <div className="flex-1 flex flex-col justify-between p-20 border-[16px] border-[var(--theme-dark)] h-full text-center">
              <div className="mt-8">
                <h1 className={`text-4xl font-extrabold text-[var(--theme-dark)] tracking-[0.2em] uppercase ${headingFont}`}>
                  CONTACT US
                </h1>
                <p className="text-xs text-gray-400 tracking-[0.3em] font-bold uppercase mt-2">
                  전문가 상담 및 매물 문의
                </p>
                <div className="w-12 h-[2px] bg-[var(--theme-primary)] mx-auto mt-4"></div>
              </div>

              {/* Agent card */}
              <div className="max-w-[500px] mx-auto bg-gray-50 border border-gray-100 p-8 rounded-xl my-4">
                <h2 className="text-xl font-black text-gray-800">
                  <EditableText value={info.agentName || "미래에셋공인 중개사 사무소"} onChange={(v) => hc('agentName', v)} />
                </h2>
                <p className="text-sm text-gray-500 font-bold mt-1">
                  대표/담당자: <EditableText value={info.agentRepresentative || "김민혁 과장"} onChange={(v) => hc('agentRepresentative', v)} className="inline-block" />
                </p>
                <div className="h-px bg-gray-200 my-4"></div>
                <div className="space-y-1 text-sm font-bold text-gray-700">
                  <p>M. <EditableText value={info.agentMobile || "010-5554-4444"} onChange={(v) => hc('agentMobile', v)} className="inline-block text-[var(--theme-primary)]" /></p>
                  <p>T. <EditableText value={info.agentPhone || "02-1234-5678"} onChange={(v) => hc('agentPhone', v)} className="inline-block" /></p>
                </div>
              </div>

              <div className="flex justify-around items-end mt-4">
                {/* Channels */}
                <div className="text-left space-y-1.5 text-xs text-gray-500 font-bold">
                  <p>블로그: <EditableText value={info.contactBlog || "https://blog.naver.com/gongsilnews"} onChange={(v) => hc('contactBlog', v)} className="inline-block text-gray-700" /></p>
                  <p>유튜브: <EditableText value={info.contactYoutube || "https://youtube.com/@gongsilnews"} onChange={(v) => hc('contactYoutube', v)} className="inline-block text-gray-700" /></p>
                  <p>웹사이트: <EditableText value={info.contactWebsite || "https://gongsilnews.com"} onChange={(v) => hc('contactWebsite', v)} className="inline-block text-gray-700" /></p>
                </div>

                {qrCodeUrl && (
                  <div className="flex flex-col items-center gap-1.5">
                    <img src={qrCodeUrl} alt="QR Code" className="w-16 h-16 border border-gray-200 p-1 bg-white" />
                    <span className="text-[9px] text-gray-400 font-bold tracking-widest">INQUIRY QR</span>
                  </div>
                )}
              </div>
            </div>
          );
        }

        if (layoutType === 'type3') {
          // Natural Clean
          return (
            <div className="flex-1 flex h-full border-l-[16px] border-[var(--theme-primary)]">
              <div className="flex-1 flex flex-col justify-between p-20">
                <div className="mt-6">
                  <h1 className={`text-4xl font-black text-gray-900 tracking-tight ${headingFont}`}>
                    CONTACT INFORMATION
                  </h1>
                  <span className="text-[var(--theme-primary)] text-xs font-bold tracking-widest uppercase mt-1 block">
                    중개 및 매물 세부조건 문의처
                  </span>
                  <div className="w-16 h-[5px] bg-[var(--theme-primary)] mt-4"></div>
                </div>

                {/* Left/Right Split */}
                <div className="flex gap-10 items-center my-6">
                  <div className="flex-1 space-y-4">
                    <div className="border-l-4 border-[var(--theme-primary)] pl-4">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">중개업소명</span>
                      <span className="text-lg font-black text-gray-800">
                        <EditableText value={info.agentName || "미래에셋공인 중개사 사무소"} onChange={(v) => hc('agentName', v)} />
                      </span>
                    </div>
                    <div className="border-l-4 border-[var(--theme-primary)]/40 pl-4">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">담당 대표 공인중개사</span>
                      <span className="text-base font-extrabold text-gray-800">
                        <EditableText value={info.agentRepresentative || "김민혁 과장"} onChange={(v) => hc('agentRepresentative', v)} />
                      </span>
                    </div>
                    <div className="border-l-4 border-[var(--theme-primary)]/40 pl-4">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">연락처</span>
                      <span className="text-lg font-black text-[var(--theme-primary)]">
                        <EditableText value={info.agentMobile || "010-5554-4444"} onChange={(v) => hc('agentMobile', v)} />
                      </span>
                    </div>
                  </div>

                  {qrCodeUrl && (
                    <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl flex flex-col items-center gap-2 shrink-0">
                      <img src={qrCodeUrl} alt="QR Code" className="w-20 h-20 rounded shadow-sm" />
                      <span className="text-[9px] text-gray-400 font-bold tracking-wider">상담 연결 QR</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-6 flex justify-between items-center text-xs text-gray-400 font-bold">
                  <div className="flex gap-6">
                    <span>유튜브: <EditableText value={info.contactYoutube ? info.contactYoutube.replace('https://', '') : ""} onChange={(v) => hc('contactYoutube', v)} className="text-gray-600 inline-block" /></span>
                    <span>블로그: <EditableText value={info.contactBlog ? info.contactBlog.replace('https://', '') : ""} onChange={(v) => hc('contactBlog', v)} className="text-gray-600 inline-block" /></span>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        if (layoutType === 'type4') {
          // Bold Box
          return (
            <div className="flex-1 flex flex-col justify-between p-20 bg-[var(--theme-dark)] text-white h-full relative">
              <div className="mt-6">
                <span className="text-[var(--theme-secondary)] text-xs font-bold tracking-[0.25em] block mb-2">FOR INQUIRIES</span>
                <h1 className={`text-5xl font-black tracking-tight leading-none uppercase ${headingFont}`}>
                  CONTACT US
                </h1>
                <div className="w-20 h-[6px] bg-[var(--theme-secondary)] mt-4"></div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-[1.5fr_1fr] gap-10 my-8 items-center bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] text-white/50 font-bold block mb-1">PARTNER FIRM</span>
                    <span className="text-xl font-bold text-white">
                      <EditableText value={info.agentName || "미래에셋공인 중개사 사무소"} onChange={(v) => hc('agentName', v)} />
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] text-white/50 font-bold block mb-0.5">AGENT</span>
                      <span className="text-sm font-semibold text-white/90">
                        <EditableText value={info.agentRepresentative || "김민혁 과장"} onChange={(v) => hc('agentRepresentative', v)} />
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-white/50 font-bold block mb-0.5">MOBILE</span>
                      <span className="text-sm font-semibold text-[var(--theme-secondary)]">
                        <EditableText value={info.agentMobile || "010-5554-4444"} onChange={(v) => hc('agentMobile', v)} />
                      </span>
                    </div>
                  </div>
                </div>

                {qrCodeUrl && (
                  <div className="flex flex-col items-center gap-2 border-l border-white/10 pl-10">
                    <img src={qrCodeUrl} alt="QR Code" className="w-18 h-18 bg-white p-1 rounded" />
                    <span className="text-[8px] text-white/40 font-bold tracking-widest">SCAN FOR CONTACT</span>
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 pt-6 flex justify-between items-center text-xs text-white/60">
                <div className="flex gap-4">
                  <span>블로그: <EditableText value={info.contactBlog || ""} onChange={(v) => hc('contactBlog', v)} className="text-white/80 inline-block" /></span>
                  <span>웹: <EditableText value={info.contactWebsite || ""} onChange={(v) => hc('contactWebsite', v)} className="text-white/80 inline-block" /></span>
                </div>
              </div>
            </div>
          );
        }

        if (layoutType === 'type5') {
          // High-end Minimal
          return (
            <div className="flex-1 flex flex-col justify-between p-24 bg-white h-full border-b-[8px] border-[var(--theme-primary)]">
              <div className="mt-8 flex justify-between items-start">
                <div>
                  <h1 className={`text-3xl font-light text-gray-900 tracking-[0.2em] uppercase ${headingFont}`}>
                    CONTACT
                  </h1>
                  <p className="text-[9px] text-gray-400 tracking-[0.3em] font-semibold mt-1">상담 및 정보 문의처</p>
                </div>
                <div className="w-[100px] h-[1px] bg-gray-300 mt-4"></div>
              </div>

              {/* Minimal info details */}
              <div className="my-8 space-y-6">
                <div>
                  <span className="text-[9px] text-gray-400 tracking-[0.2em] font-semibold block mb-1">OFFICE</span>
                  <span className="text-lg font-bold text-gray-800 tracking-wider">
                    <EditableText value={info.agentName || "미래에셋공인 중개사 사무소"} onChange={(v) => hc('agentName', v)} />
                  </span>
                </div>
                <div className="flex gap-20">
                  <div>
                    <span className="text-[9px] text-gray-400 tracking-[0.2em] font-semibold block mb-1">REPRESENTATIVE</span>
                    <span className="text-sm text-gray-700 tracking-wide font-medium">
                      <EditableText value={info.agentRepresentative || "김민혁 과장"} onChange={(v) => hc('agentRepresentative', v)} />
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 tracking-[0.2em] font-semibold block mb-1">DIRECT</span>
                    <span className="text-sm font-bold text-[var(--theme-primary)] tracking-wide">
                      <EditableText value={info.agentMobile || "010-5554-4444"} onChange={(v) => hc('agentMobile', v)} />
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-end border-t border-gray-100 pt-8">
                <div className="text-[10px] text-gray-400 font-semibold tracking-wider space-y-1 text-left">
                  <p>YouTube: <EditableText value={info.contactYoutube || ""} onChange={(v) => hc('contactYoutube', v)} className="text-gray-600 inline-block font-medium" /></p>
                  <p>Website: <EditableText value={info.contactWebsite || ""} onChange={(v) => hc('contactWebsite', v)} className="text-gray-600 inline-block font-medium" /></p>
                </div>
                {qrCodeUrl && (
                  <div className="flex items-center gap-4 bg-gray-50 border border-gray-100 p-2.5 rounded">
                    <img src={qrCodeUrl} alt="QR Code" className="w-14 h-14 grayscale hover:grayscale-0 transition-all bg-white p-1" />
                    <div className="text-left">
                      <p className="text-[9px] text-gray-400 font-bold tracking-widest">INQUIRY QR</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        }

        // Default Type 1
        return (
          <div className="flex-1 flex h-full">
            <div className="w-7/12 p-16 flex flex-col justify-between h-full bg-[#f8fafc] border-r border-gray-200">
              <div className="mb-4">
                <h1 className={`text-4xl font-extrabold text-gray-900 tracking-tight leading-none ${headingFont}`}>
                  CONTACT US
                </h1>
                <div className="w-16 h-1 bg-[var(--theme-primary)] mt-4"></div>
              </div>

              {/* Map Box */}
              <div className="w-full h-[290px] rounded-xl overflow-hidden border border-gray-200 shadow-sm mb-4 relative">
                {info.agentAddress ? (
                  <KakaoMap address={info.agentAddress} />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400 font-bold text-sm">
                    <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    오시는 길 주소를 입력하면 지도가 표시됩니다.
                  </div>
                )}
              </div>

              {/* 오시는 길 Box + QR Code */}
              <div className="flex gap-3 mb-2">
                <div className="flex-1 border border-gray-200 rounded-xl p-4 shadow-sm bg-white flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[var(--theme-primary)]"></div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <MapPinIcon className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
                    <span className="font-black text-xs tracking-widest text-[var(--theme-primary)]">
                      <EditableText value={info.page7DirectionsTitle || "오시는 길"} onChange={(v) => hc('page7DirectionsTitle', v)} />
                    </span>
                  </div>
                  <div className="text-gray-700 font-bold text-[13px] leading-relaxed whitespace-pre-wrap break-keep">
                    <EditableText multiline value={info.agentAddress || "강남구 내 주요 전철역 및 다수의 버스 노선 접근이 용이하여 출퇴근 및 대중교통 편리성 확보"} onChange={(v) => hc('agentAddress', v)} />
                  </div>
                </div>

                {/* QR Code (Naver Map) */}
                <div className="w-[90px] shrink-0 flex flex-col items-center justify-center">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(info.agentMapUrl || `https://map.naver.com/p/search/${info.agentAddress || '서울 강남구 논현동'}`)}`} 
                    alt="Naver Map QR" 
                    className="w-16 h-16 mix-blend-multiply"
                  />
                  <span className="text-[8px] text-gray-400 font-bold tracking-widest mt-1 uppercase">네이버 지도</span>
                </div>
              </div>

              {/* Phone Number */}
              <div className="flex flex-col flex-1 justify-center py-2">
                <div className="flex items-center gap-3">
                  <div className="text-[34px] font-black text-[var(--theme-primary)] flex-1 tracking-tight flex items-center">
                    <span className="text-[14px] text-[var(--theme-primary)] font-extrabold tracking-widest mr-3">문의하기</span>
                    <EditableText value={info.agentMobile || "010-5554-4444"} onChange={(v) => hc('agentMobile', v)} />
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <a href={`tel:${(info.agentMobile || "010-5554-4444").replace(/[^0-9]/g, '')}`} onClick={(e) => e.preventDefault()} className="w-11 h-11 rounded-full bg-[var(--theme-primary)] text-white flex items-center justify-center shadow-md hover:opacity-80 transition-opacity hover:-translate-y-0.5 active:translate-y-0" title="전화걸기">
                      <PhoneIcon className="w-5 h-5" />
                    </a>
                    <a href={`sms:${(info.agentMobile || "010-5554-4444").replace(/[^0-9]/g, '')}`} onClick={(e) => e.preventDefault()} className="w-11 h-11 rounded-full bg-[var(--theme-primary)] text-white flex items-center justify-center shadow-md hover:opacity-80 transition-opacity hover:-translate-y-0.5 active:translate-y-0" title="문자보내기">
                      <ChatBubbleOvalLeftEllipsisIcon className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-5 mt-auto flex justify-between items-center text-xs text-gray-500 font-bold">
                <div className="flex gap-6 w-full">
                  <div className="flex items-center gap-2 flex-1 group/sns">
                    <DocumentTextIcon className="w-5 h-5 text-gray-300 group-hover/sns:text-[var(--theme-primary)] transition-colors shrink-0" />
                    <a href={info.contactBlog ? (info.contactBlog.startsWith('http') ? info.contactBlog : `https://${info.contactBlog}`) : '#'} target="_blank" rel="noopener noreferrer" onClick={(e) => { if (!info.contactBlog) e.preventDefault(); }} className="text-gray-500 hover:text-[var(--theme-primary)] transition-colors inline-block w-full">
                      <EditableText value={info.contactBlog ? info.contactBlog.replace('https://', '') : ""} placeholder="블로그 (미입력시 숨김)" onChange={(v) => hc('contactBlog', v)} className="w-full" />
                    </a>
                  </div>
                  <div className="flex items-center gap-2 flex-1 group/sns">
                    <PlayCircleIcon className="w-5 h-5 text-gray-300 group-hover/sns:text-[var(--theme-primary)] transition-colors shrink-0" />
                    <a href={info.contactYoutube ? (info.contactYoutube.startsWith('http') ? info.contactYoutube : `https://${info.contactYoutube}`) : '#'} target="_blank" rel="noopener noreferrer" onClick={(e) => { if (!info.contactYoutube) e.preventDefault(); }} className="text-gray-500 hover:text-[var(--theme-primary)] transition-colors inline-block w-full">
                      <EditableText value={info.contactYoutube ? info.contactYoutube.replace('https://', '') : ""} placeholder="유튜브 (미입력시 숨김)" onChange={(v) => hc('contactYoutube', v)} className="w-full" />
                    </a>
                  </div>
                  <div className="flex items-center gap-2 flex-1 group/sns">
                    <GlobeAltIcon className="w-5 h-5 text-gray-300 group-hover/sns:text-[var(--theme-primary)] transition-colors shrink-0" />
                    <a href={info.contactWebsite ? (info.contactWebsite.startsWith('http') ? info.contactWebsite : `https://${info.contactWebsite}`) : '#'} target="_blank" rel="noopener noreferrer" onClick={(e) => { if (!info.contactWebsite) e.preventDefault(); }} className="text-gray-500 hover:text-[var(--theme-primary)] transition-colors inline-block w-full">
                      <EditableText value={info.contactWebsite ? info.contactWebsite.replace('https://', '') : ""} placeholder="웹사이트 (미입력시 숨김)" onChange={(v) => hc('contactWebsite', v)} className="w-full" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-5/12 bg-[var(--theme-dark)] flex flex-col justify-between p-12 text-white relative overflow-hidden group/coverimg">
              {/* Background Image Layer */}
              <div className={`absolute inset-0 z-10 [&_img]:opacity-20 group-hover/coverimg:[&_img]:opacity-30 [&_img]:transition-opacity transition-opacity duration-300 opacity-100`}>
                <EditableImage
                  src={agentImage || "/marketing/report/default_contact_bg.jpg"}
                  alt="담당자/배경 사진"
                  imageKey="agentImage"
                  onImageUpload={onImageUpload}
                  onDelete={() => onDeleteImage && onDeleteImage('agentImage')}
                  isUploading={isUploading}
                  aspectRatioClass="object-cover"
                  className="w-full h-full !rounded-none !border-none !bg-transparent"
                />
              </div>

              <div className="absolute inset-0 z-10 bg-gradient-to-tr from-[var(--theme-dark)] via-[var(--theme-dark)]/90 to-[var(--theme-primary)]/40 mix-blend-overlay pointer-events-none"></div>
              
              <div className="text-right z-20">
              </div>

              <div className="z-20 flex flex-col items-center gap-3 relative">
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Page7Ending;
