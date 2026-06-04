import React from 'react';
import { PropertyInfo, FlyerColor, FlyerLayout } from '../../types';
import EditableText from '../shared/EditableText';
import EditableImage from '../shared/EditableImage';
import KakaoMap from '../shared/KakaoMap';
import { 
  MapPinIcon, 
  PhoneIcon, 
  ChatBubbleOvalLeftEllipsisIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  PlayCircleIcon
} from '@heroicons/react/24/solid';
import ErrorBoundary from '../shared/ErrorBoundary';

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

const MapBlock = ({ info, className = "h-[290px]" }: { info: PropertyInfo, className?: string }) => (
  <div className={`w-full overflow-hidden relative ${className}`}>
    {info.agentAddress ? (
      <KakaoMap address={String(info.agentAddress)} />
    ) : (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400 font-bold text-sm">
        <MapPinIcon className="w-8 h-8 text-gray-300 mb-2" />
        오시는 길 주소를 입력하면 지도가 표시됩니다.
      </div>
    )}
  </div>
);

const DirectionsBox = ({ info, hc, qrCodeUrl, className = "bg-white", dark = false }: { info: PropertyInfo, hc: any, qrCodeUrl: string, className?: string, dark?: boolean }) => (
  <div className={`flex gap-3 mb-2 ${className}`}>
    <div className={`flex-1 border ${dark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white'} rounded-xl p-4 shadow-sm flex flex-col justify-center relative overflow-hidden`}>
      <div className={`absolute top-0 left-0 w-1 h-full ${dark ? 'bg-[var(--theme-secondary)]' : 'bg-[var(--theme-primary)]'}`}></div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <MapPinIcon className={`w-3.5 h-3.5 ${dark ? 'text-[var(--theme-secondary)]' : 'text-[var(--theme-primary)]'}`} />
        <span className={`font-black text-xs tracking-widest ${dark ? 'text-[var(--theme-secondary)]' : 'text-[var(--theme-primary)]'}`}>
          <EditableText value={info.page7DirectionsTitle || "오시는 길"} onChange={(v) => hc('page7DirectionsTitle', v)} />
        </span>
      </div>
      <div className={`${dark ? 'text-white/90' : 'text-gray-700'} font-bold text-[13px] leading-relaxed whitespace-pre-wrap break-keep`}>
        <EditableText multiline value={info.agentAddress || "강남구 내 주요 전철역 및 다수의 버스 노선 접근이 용이하여 출퇴근 및 대중교통 편리성 확보"} onChange={(v) => hc('agentAddress', v)} />
      </div>
    </div>

    <div className="w-[90px] shrink-0 flex flex-col items-center justify-center">
      <img src={qrCodeUrl} alt="Naver Map QR" className={`w-16 h-16 ${dark ? 'bg-white p-1 rounded' : 'mix-blend-multiply'}`} />
      <span className={`text-[8px] ${dark ? 'text-white/40' : 'text-gray-400'} font-bold tracking-widest mt-1 uppercase`}>네이버 지도</span>
    </div>
  </div>
);

const PhoneBox = ({ info, hc, dark = false, stacked = false }: { info: PropertyInfo, hc: any, dark?: boolean, stacked?: boolean }) => (
  <div className="flex flex-col justify-center py-2 w-full">
    {stacked && (
       <div className={`text-[13px] ${dark ? 'text-white/50' : 'text-[var(--theme-primary)]'} font-extrabold tracking-widest mb-1`}>
         문의하기
       </div>
    )}
    <div className={`flex items-center gap-3 ${stacked ? 'w-full' : ''}`}>
      <div className={`${stacked ? 'text-[26px]' : 'text-[30px]'} font-black ${dark ? 'text-[var(--theme-secondary)]' : 'text-[var(--theme-primary)]'} flex-1 tracking-tight flex items-center whitespace-nowrap`}>
        {!stacked && (
          <span className={`text-[13px] ${dark ? 'text-white/50' : 'text-[var(--theme-primary)]'} font-extrabold tracking-widest mr-3 whitespace-nowrap shrink-0`}>문의하기</span>
        )}
        <EditableText value={info.agentMobile || "010-5554-4444"} onChange={(v) => hc('agentMobile', v)} />
      </div>
      <div className="flex gap-2 shrink-0">
        <a href={`tel:${String(info.agentMobile || "010-5554-4444").replace(/[^0-9]/g, '')}`} onClick={(e) => e.preventDefault()} className={`w-10 h-10 rounded-full ${dark ? 'bg-[var(--theme-secondary)] text-[var(--theme-dark)]' : 'bg-[var(--theme-primary)] text-white'} flex items-center justify-center shadow-md hover:opacity-80 transition-opacity hover:-translate-y-0.5 active:translate-y-0`} title="전화걸기">
          <PhoneIcon className="w-4 h-4" />
        </a>
        <a href={`sms:${String(info.agentMobile || "010-5554-4444").replace(/[^0-9]/g, '')}`} onClick={(e) => e.preventDefault()} className={`w-10 h-10 rounded-full ${dark ? 'bg-[var(--theme-secondary)] text-[var(--theme-dark)]' : 'bg-[var(--theme-primary)] text-white'} flex items-center justify-center shadow-md hover:opacity-80 transition-opacity hover:-translate-y-0.5 active:translate-y-0`} title="문자보내기">
          <ChatBubbleOvalLeftEllipsisIcon className="w-4 h-4" />
        </a>
      </div>
    </div>
  </div>
);

const SnsBox = ({ info, hc, dark = false, stacked = false }: { info: PropertyInfo, hc: any, dark?: boolean, stacked?: boolean }) => (
  <div className={`flex justify-between items-center text-xs font-bold ${dark ? 'text-white/60' : 'text-gray-500'} w-full`}>
    <div className={`flex ${stacked ? 'flex-col gap-3' : 'gap-6'} w-full`}>
      <div className="flex items-center gap-2 flex-1 group/sns">
        <DocumentTextIcon className={`w-5 h-5 ${dark ? 'text-white/30' : 'text-gray-300'} group-hover/sns:${dark ? 'text-[var(--theme-secondary)]' : 'text-[var(--theme-primary)]'} transition-colors shrink-0`} />
        <a href={info.contactBlog ? (String(info.contactBlog).startsWith('http') ? info.contactBlog : `https://${info.contactBlog}`) : '#'} target="_blank" rel="noopener noreferrer" onClick={(e) => { if (!info.contactBlog) e.preventDefault(); }} className={`w-full hover:${dark ? 'text-white' : 'text-[var(--theme-primary)]'} transition-colors`}>
          <EditableText value={info.contactBlog ? String(info.contactBlog).replace('https://', '') : ""} placeholder="블로그 (미입력시 숨김)" onChange={(v) => hc('contactBlog', v)} className="w-full" />
        </a>
      </div>
      <div className="flex items-center gap-2 flex-1 group/sns">
        <PlayCircleIcon className={`w-5 h-5 ${dark ? 'text-white/30' : 'text-gray-300'} group-hover/sns:${dark ? 'text-[var(--theme-secondary)]' : 'text-[var(--theme-primary)]'} transition-colors shrink-0`} />
        <a href={info.contactYoutube ? (String(info.contactYoutube).startsWith('http') ? info.contactYoutube : `https://${info.contactYoutube}`) : '#'} target="_blank" rel="noopener noreferrer" onClick={(e) => { if (!info.contactYoutube) e.preventDefault(); }} className={`w-full hover:${dark ? 'text-white' : 'text-[var(--theme-primary)]'} transition-colors`}>
          <EditableText value={info.contactYoutube ? String(info.contactYoutube).replace('https://', '') : ""} placeholder="유튜브 (미입력시 숨김)" onChange={(v) => hc('contactYoutube', v)} className="w-full" />
        </a>
      </div>
      <div className="flex items-center gap-2 flex-1 group/sns">
        <GlobeAltIcon className={`w-5 h-5 ${dark ? 'text-white/30' : 'text-gray-300'} group-hover/sns:${dark ? 'text-[var(--theme-secondary)]' : 'text-[var(--theme-primary)]'} transition-colors shrink-0`} />
        <a href={info.contactWebsite ? (String(info.contactWebsite).startsWith('http') ? info.contactWebsite : `https://${info.contactWebsite}`) : '#'} target="_blank" rel="noopener noreferrer" onClick={(e) => { if (!info.contactWebsite) e.preventDefault(); }} className={`w-full hover:${dark ? 'text-white' : 'text-[var(--theme-primary)]'} transition-colors`}>
          <EditableText value={info.contactWebsite ? String(info.contactWebsite).replace('https://', '') : ""} placeholder="웹사이트 (미입력시 숨김)" onChange={(v) => hc('contactWebsite', v)} className="w-full" />
        </a>
      </div>
    </div>
  </div>
);

const Page7Ending: React.FC<Props> = ({ info, pageString, isHidden, layoutTheme, colorTheme, onUpdateInfo, agentImage, onImageUpload, onDeleteImage, isUploading }) => {
  const hc = (key: string, value: any) => { if (onUpdateInfo) onUpdateInfo({ ...info, [key]: value }); };
  const headingFont = layoutTheme?.headingFont || 'font-sans';
  const bodyFont = layoutTheme?.bodyFont || 'font-sans';
  const layoutType = layoutTheme?.type || 'type1';

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(info.agentMapUrl || `https://map.naver.com/p/search/${String(info.agentAddress || '서울 강남구 논현동').split('\n')[0]}`)}`;

  return (
    <ErrorBoundary>
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
            <div className="flex-1 flex flex-col p-16 border-[12px] border-[var(--theme-dark)] h-full">
              <div className="text-center mb-6">
                <h1 className={`text-4xl font-extrabold text-[var(--theme-dark)] tracking-[0.2em] uppercase ${headingFont}`}>CONTACT US</h1>
                <p className="text-xs text-gray-400 tracking-[0.3em] font-bold uppercase mt-2">전문가 상담 및 매물 문의</p>
                <div className="w-12 h-[2px] bg-[var(--theme-primary)] mx-auto mt-4"></div>
              </div>

              <div className="flex flex-col gap-6 flex-1">
                {/* 상단: 지도(좌) + 연락처/SNS(우) */}
                <div className="flex gap-6 flex-1">
                  <MapBlock info={info} className="w-7/12 rounded-xl border border-gray-200" />
                  
                  <div className="w-5/12 flex flex-col justify-center">
                    <div className="bg-white border border-gray-100 p-8 rounded-xl flex-1 flex flex-col justify-center shadow-sm">
                       <div className="flex justify-center mb-6 w-full">
                         <PhoneBox info={info} hc={hc} stacked={true} />
                       </div>
                       <div className="w-full h-px bg-gray-100 mb-5"></div>
                       <SnsBox info={info} hc={hc} stacked={true} />
                    </div>
                  </div>
                </div>

                {/* 하단: 3가지 정보 섹션 */}
                <div className="grid grid-cols-3 gap-5 h-[160px]">
                  {/* Section 1: 중개사무소 정보 */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col">
                    <div className="flex items-center gap-1.5 mb-3 border-b border-gray-100 pb-2">
                      <span className="font-bold text-sm tracking-widest text-[var(--theme-primary)]">🏢 중개사무소 정보</span>
                    </div>
                    <div className="text-gray-700 font-bold text-xs leading-relaxed space-y-1.5 mt-1">
                      <p className="flex justify-between">
                        <span className="text-gray-400">상호</span> 
                        <span><EditableText value={info.agentName || "미래에셋공인중개사사무소"} onChange={(v) => hc('agentName', v)} className="inline-block text-right" /></span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-gray-400">대표</span> 
                        <span><EditableText value={info.agentRepresentative || "김민혁"} onChange={(v) => hc('agentRepresentative', v)} className="inline-block text-right" /></span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-gray-400">등록번호</span> 
                        <span><EditableText value={info.agentRegistrationNo || "제 11680-2024-00123 호"} onChange={(v) => hc('agentRegistrationNo', v)} className="inline-block text-right" /></span>
                      </p>
                    </div>
                  </div>

                  {/* Section 2: 오시는 길 및 주차 */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col">
                    <div className="flex items-center gap-1.5 mb-3 border-b border-gray-100 pb-2">
                      <MapPinIcon className="w-4 h-4 text-[var(--theme-primary)]" />
                      <span className="font-bold text-sm tracking-widest text-[var(--theme-primary)]">
                        <EditableText value={info.page7DirectionsTitle || "오시는 길 및 주차안내"} onChange={(v) => hc('page7DirectionsTitle', v)} />
                      </span>
                    </div>
                    <div className="text-gray-700 font-bold text-xs leading-relaxed whitespace-pre-wrap break-keep mt-1">
                      <EditableText multiline value={info.agentAddress || "강남구 내 주요 전철역 도보 5분 거리\n건물 내 지하주차장 무료 이용 가능"} onChange={(v) => hc('agentAddress', v)} />
                    </div>
                  </div>

                  {/* Section 3: 모바일 퀵 연결 (QR) */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col relative overflow-hidden">
                    <div className="flex items-center gap-1.5 mb-3 border-b border-gray-100 pb-2">
                      <span className="font-bold text-sm tracking-widest text-[var(--theme-primary)]">📱 모바일 길찾기</span>
                    </div>
                    <div className="text-gray-600 font-bold text-xs leading-relaxed pr-16 mt-1 break-keep">
                      스마트폰 카메라로 우측 QR코드를 스캔하시면 네이버 지도 길찾기로 바로 연결됩니다.
                    </div>
                    <div className="absolute bottom-4 right-4 flex flex-col items-center">
                      <img src={qrCodeUrl} alt="Naver Map QR" className="w-14 h-14 mix-blend-multiply border border-gray-100 p-0.5 rounded bg-white shadow-sm" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        if (layoutType === 'type3') {
          // Natural Clean
          return (
            <div className="flex-1 flex h-full border-l-[16px] border-[var(--theme-primary)]">
              <div className="flex-1 flex flex-col justify-between p-16">
                <div>
                  <h1 className={`text-4xl font-black text-gray-900 tracking-tight ${headingFont}`}>CONTACT INFORMATION</h1>
                  <span className="text-[var(--theme-primary)] text-xs font-bold tracking-widest uppercase mt-1 block">중개 및 매물 세부조건 문의처</span>
                  <div className="w-16 h-[5px] bg-[var(--theme-primary)] mt-4"></div>
                </div>

                <div className="flex gap-8 my-5 flex-1 h-full">
                  {/* 왼쪽: 명함 앞/뒷면 업로드 영역 */}
                  <div className="w-5/12 flex flex-col gap-4">
                    <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 group relative shadow-sm min-h-[160px]">
                       <EditableImage 
                         src={info.agentCardFront || ""}
                         alt="명함 앞면"
                         imageKey="agentCardFront"
                         onImageUpload={(file) => onImageUpload && onImageUpload('agentCardFront', file)}
                         onDelete={() => onDeleteImage && onDeleteImage('agentCardFront')}
                         isUploading={isUploading}
                         className="w-full h-full object-contain p-2"
                         placeholderText="명함 앞면 사진 등록"
                       />
                    </div>
                    <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 group relative shadow-sm min-h-[160px]">
                       <EditableImage 
                         src={info.agentCardBack || ""}
                         alt="명함 뒷면"
                         imageKey="agentCardBack"
                         onImageUpload={(file) => onImageUpload && onImageUpload('agentCardBack', file)}
                         onDelete={() => onDeleteImage && onDeleteImage('agentCardBack')}
                         isUploading={isUploading}
                         className="w-full h-full object-contain p-2"
                         placeholderText="명함 뒷면 사진 등록"
                       />
                    </div>
                  </div>

                  {/* 오른쪽: 지도 및 오시는 길/연락처 */}
                  <div className="w-7/12 flex flex-col gap-4 h-full">
                    <MapBlock info={info} className="flex-1 rounded-xl border border-gray-200 shadow-sm" />
                    
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center justify-between gap-4 shrink-0">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-2">
                          <MapPinIcon className="w-4 h-4 text-[var(--theme-primary)]" />
                          <span className="font-black text-xs tracking-widest text-[var(--theme-primary)]">
                            <EditableText value={info.page7DirectionsTitle || "오시는 길"} onChange={(v) => hc('page7DirectionsTitle', v)} />
                          </span>
                        </div>
                        <div className="text-gray-700 font-bold text-xs leading-relaxed whitespace-pre-wrap break-keep">
                          <EditableText multiline value={info.agentAddress || "강남구 내 주요 전철역 도보 5분 거리"} onChange={(v) => hc('agentAddress', v)} />
                        </div>
                      </div>
                      
                      <div className="w-px h-16 bg-gray-100 mx-2 hidden lg:block"></div>
                      
                      <div className="shrink-0 flex items-center">
                        <PhoneBox info={info} hc={hc} stacked={true} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-5 mt-4 shrink-0">
                  <SnsBox info={info} hc={hc} />
                </div>
              </div>
            </div>
          );
        }

        if (layoutType === 'type4') {
          // Bold Box
          return (
            <div className="flex-1 flex flex-col justify-between p-16 bg-[var(--theme-dark)] text-white h-full relative">
              <div className="mb-6">
                <span className="text-[var(--theme-secondary)] text-xs font-bold tracking-[0.25em] block mb-2">FOR INQUIRIES</span>
                <h1 className={`text-5xl font-black tracking-tight leading-none uppercase ${headingFont}`}>CONTACT US</h1>
                <div className="w-20 h-[6px] bg-[var(--theme-secondary)] mt-4"></div>
              </div>

              <div className="flex gap-8 flex-1">
                <div className="w-5/12 flex flex-col justify-center space-y-6 bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                  <div>
                    <span className="text-[9px] text-white/50 font-bold block mb-1">PARTNER FIRM</span>
                    <span className="text-xl font-bold text-white"><EditableText value={info.agentName || "미래에셋공인"} onChange={(v) => hc('agentName', v)} /></span>
                  </div>
                  <div>
                    <span className="text-[9px] text-white/50 font-bold block mb-1">AGENT</span>
                    <span className="text-sm font-semibold text-white/90"><EditableText value={info.agentRepresentative || "김민혁"} onChange={(v) => hc('agentRepresentative', v)} /></span>
                  </div>
                  <PhoneBox info={info} hc={hc} dark />
                </div>
                <div className="w-7/12 flex flex-col">
                  <MapBlock info={info} className="flex-1 mb-3 border border-white/10 rounded-xl" />
                  <DirectionsBox info={info} hc={hc} qrCodeUrl={qrCodeUrl} dark className="" />
                </div>
              </div>

              <div className="border-t border-white/10 pt-5 mt-4">
                <SnsBox info={info} hc={hc} dark />
              </div>
            </div>
          );
        }

        if (layoutType === 'type5') {
          // High-end Minimal
          return (
            <div className="flex-1 flex flex-col justify-between p-16 bg-white h-full border-b-[8px] border-[var(--theme-primary)]">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className={`text-6xl font-black text-gray-900 tracking-tight ${headingFont}`}>CONTACT</h1>
                  <p className="text-base text-gray-400 tracking-[0.3em] font-bold mt-3">상담 및 정보 문의처</p>
                </div>
                <div className="w-[100px] h-[1px] bg-gray-300 mt-4 hidden lg:block"></div>
              </div>

              <div className="flex gap-10 flex-1">
                <div className="w-5/12 flex flex-col justify-center gap-6 h-full border-r border-gray-100 pr-10">
                  <div className="w-full aspect-[9/5] group relative mx-auto">
                     <EditableImage 
                       src={info.agentCardFront || ""}
                       alt="명함 이미지"
                       imageKey="agentCardFront"
                       onImageUpload={(file) => onImageUpload && onImageUpload('agentCardFront', file)}
                       onDelete={() => onDeleteImage && onDeleteImage('agentCardFront')}
                       isUploading={isUploading}
                       className="w-full h-full object-contain"
                       placeholderText="명함 사진 등록"
                     />
                  </div>
                  <div className="pt-2 shrink-0">
                    <PhoneBox info={info} hc={hc} />
                  </div>
                </div>
                <div className="w-7/12 flex flex-col">
                  <MapBlock info={info} className="flex-1 mb-3 border border-gray-200 rounded-xl" />
                  <DirectionsBox info={info} hc={hc} qrCodeUrl={qrCodeUrl} className="" />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5 mt-4">
                <SnsBox info={info} hc={hc} />
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

              <MapBlock info={info} className="flex-1 mb-6 mt-4 rounded-xl border border-gray-200 shadow-sm" />
              <DirectionsBox info={info} hc={hc} qrCodeUrl={qrCodeUrl} className="bg-white" />
              <PhoneBox info={info} hc={hc} />

              <div className="border-t border-gray-200 pt-5 mt-auto flex justify-between items-center text-xs text-gray-500 font-bold">
                <SnsBox info={info} hc={hc} />
              </div>
            </div>

            <div className="w-5/12 bg-[var(--theme-dark)] flex flex-col justify-between p-12 text-white relative overflow-hidden group/coverimg">
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
            </div>
          </div>
        );
      })()}
      </div>
    </ErrorBoundary>
  );
};

export default Page7Ending;
