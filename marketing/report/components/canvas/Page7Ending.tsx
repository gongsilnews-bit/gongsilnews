import React from 'react';
import { PropertyInfo, FlyerColor, FlyerLayout } from '../../types';
import EditableText from '../shared/EditableText';
import EditableImage from '../shared/EditableImage';
import KakaoMap from '../shared/KakaoMap';
import CompletedOverlay from '../shared/CompletedOverlay';
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
  isUploadingImage?: Record<string, boolean>;
}

const MapBlock = ({ 
  info, 
  onUpdateInfo,
  onImageUpload,
  onDeleteImage,
  isUploadingImage,
  className = "h-[290px]" 
}: { 
  info: PropertyInfo, 
  onUpdateInfo?: (info: any) => void,
  onImageUpload?: (key: string, file: File) => Promise<string | undefined>,
  onDeleteImage?: (key: string) => void,
  isUploadingImage?: Record<string, boolean>,
  className?: string 
}) => (
  <div className={`w-full overflow-hidden relative group/map z-10 ${className}`}>
    {/* Map Mode Picker Overlay (print:hidden, visible on hover) */}
    <div className="absolute top-4 left-4 z-[40] flex items-center gap-1 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl p-1 shadow-md opacity-0 group-hover/map:opacity-100 transition-opacity duration-200 print:hidden">
      {[
        { type: "kakao", label: "카카오" },
        { type: "upload", label: "이미지 업로드" }
      ].map(opt => (
        <button
          key={opt.type}
          type="button"
          onClick={() => onUpdateInfo && onUpdateInfo({ ...info, agentMapType: opt.type })}
          className={`px-2 py-1 rounded-lg text-[9px] font-extrabold transition-colors cursor-pointer border-none ${
            (info.agentMapType || "kakao") === opt.type 
              ? "bg-[#cc5a27] text-white" 
              : "hover:bg-gray-100 text-gray-600 bg-transparent"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>

    {(!info.agentMapType || info.agentMapType === "kakao") && (
      (info.agentMapAddress || info.agentAddress) ? (
        <KakaoMap 
          address={String(info.agentMapAddress || info.agentAddress)} 
          lat={info.page7Lat}
          lng={info.page7Lng}
          onCoordsChange={(lat, lng) => {
            if (onUpdateInfo) {
              onUpdateInfo({
                ...info,
                page7Lat: lat,
                page7Lng: lng
              });
            }
          }}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400 font-bold text-sm">
          <MapPinIcon className="w-8 h-8 text-gray-300 mb-2" />
          오시는 길 주소를 입력하면 지도가 표시됩니다.
        </div>
      )
    )}

    {info.agentMapType === "upload" && (
      <div className="w-full h-full relative">
        <EditableImage 
          src={info.agentMapImage || ""} 
          alt="Uploaded Agent Map" 
          imageKey="agentMapImage"
          onImageUpload={async (key, file) => {
            if (onImageUpload) {
              const url = await onImageUpload('agentMapImage', file);
              if (url && onUpdateInfo) onUpdateInfo({ ...info, agentMapImage: url });
            }
          }}
          onDelete={() => {
            if (onUpdateInfo) onUpdateInfo({ ...info, agentMapImage: "" });
            if (onDeleteImage) onDeleteImage('agentMapImage');
          }}
          isUploading={isUploadingImage?.agentMapImage}
          aspectRatioClass="object-cover"
        />
        {!info.agentMapImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 text-center">
            <MapPinIcon className="w-8 h-8 text-gray-300 mb-1" />
            <span className="text-[10px] text-gray-400 font-bold">마우스를 올려 지도를 업로드하세요</span>
          </div>
        )}
      </div>
    )}
  </div>
);

const DirectionsBox = ({ info, hc, qrCodeUrl, className = "bg-white", dark = false, hideQR = false }: { info: PropertyInfo, hc: any, qrCodeUrl: string, className?: string, dark?: boolean, hideQR?: boolean }) => (
  <div className={`flex gap-3 mb-2 ${className}`}>
    <div className={`flex-1 border ${dark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white'} rounded-xl p-4 shadow-sm flex flex-col justify-center relative overflow-hidden`}>
      <div className={`absolute top-0 left-0 w-1 h-full ${dark ? 'bg-[var(--theme-secondary)]' : 'bg-[var(--theme-primary)]'}`}></div>
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5">
          <MapPinIcon className={`w-3.5 h-3.5 ${dark ? 'text-[var(--theme-secondary)]' : 'text-[var(--theme-primary)]'}`} />
          <span className={`font-black text-xs tracking-widest ${dark ? 'text-[var(--theme-secondary)]' : 'text-[var(--theme-primary)]'}`}>
            <EditableText value={info.page7DirectionsTitle || "오시는 길"} onChange={(v) => hc('page7DirectionsTitle', v)} />
          </span>
        </div>
        <div className={`text-[13px] font-extrabold ${dark ? 'text-[var(--theme-secondary)]' : 'text-[var(--theme-primary)]'} tracking-wider`}>
          <EditableText value={info.agentName || "미래에셋공인중개사사무소"} onChange={(v) => hc('agentName', v)} />
        </div>
      </div>
      <div className={`${dark ? 'text-white/90' : 'text-gray-700'} font-bold text-[13px] leading-relaxed whitespace-pre-wrap break-keep`}>
        <EditableText multiline value={info.agentAddress || "강남구 내 주요 전철역 및 다수의 버스 노선 접근이 용이하여 출퇴근 및 대중교통 편리성 확보"} onChange={(v) => hc('agentAddress', v)} />
      </div>
    </div>

    {!hideQR && (
      <div className="w-[90px] shrink-0 flex flex-col items-center justify-center">
        <img src={qrCodeUrl} alt="Naver Map QR" className={`w-16 h-16 ${dark ? 'bg-white p-1 rounded' : 'mix-blend-multiply'}`} />
        <span className={`text-[8px] ${dark ? 'text-white/40' : 'text-gray-400'} font-bold tracking-widest mt-1 uppercase`}>네이버 지도</span>
      </div>
    )}
  </div>
);

const PhoneBox = ({ info, hc, dark = false, stacked = false }: { info: PropertyInfo, hc: any, dark?: boolean, stacked?: boolean }) => (
  <div className="flex flex-col justify-center py-2 w-full">
    <div className={`flex items-center gap-3 ${stacked ? 'w-full' : ''}`}>
      <div className={`flex-1 flex items-center gap-3`}>
        {/* Inquiry Label - Theme colored, slightly smaller than phone */}
        <div className={`text-[18px] ${dark ? 'text-[var(--theme-secondary)]' : 'text-[var(--theme-primary)]'} font-extrabold whitespace-nowrap shrink-0`}>
          문의 : <EditableText value={info.agentRepresentative || info.agencyRepresentative || "김정민"} onChange={(v) => hc('agentRepresentative', v)} className="inline-block" />
        </div>
        {/* Phone Number */}
        <div className={`text-[28px] font-black ${dark ? 'text-[var(--theme-secondary)]' : 'text-[var(--theme-primary)]'} tracking-tight whitespace-nowrap`}>
          <EditableText value={info.agentMobile || "010-5554-4444"} onChange={(v) => hc('agentMobile', v)} />
        </div>
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

const SnsBox = ({ info, hc, dark = false, stacked = false }: { info: PropertyInfo, hc: any, dark?: boolean, stacked?: boolean }) => {
  const hasBlog = !!info.contactBlog;
  const hasYoutube = !!info.contactYoutube;
  const hasWebsite = !!info.contactWebsite;
  const hasAny = hasBlog || hasYoutube || hasWebsite;

  return (
    <div className={`flex justify-between items-center text-xs font-bold ${dark ? 'text-white/60' : 'text-gray-500'} w-full`}>
      <div className={`flex ${stacked ? 'flex-col gap-3' : 'gap-6'} w-full`}>
        {hasBlog && (
          <div className="flex items-center gap-2 flex-1 group/sns">
            <DocumentTextIcon className={`w-5 h-5 ${dark ? 'text-white/30' : 'text-gray-300'} group-hover/sns:${dark ? 'text-[var(--theme-secondary)]' : 'text-[var(--theme-primary)]'} transition-colors shrink-0`} />
            <a href={String(info.contactBlog).startsWith('http') ? info.contactBlog : `https://${info.contactBlog}`} target="_blank" rel="noopener noreferrer" className={`w-full hover:${dark ? 'text-white' : 'text-[var(--theme-primary)]'} transition-colors`}>
              <EditableText value={String(info.contactBlog).replace('https://', '')} placeholder="블로그" onChange={(v) => hc('contactBlog', v)} className="w-full" />
            </a>
          </div>
        )}
        {hasYoutube && (
          <div className="flex items-center gap-2 flex-1 group/sns">
            <PlayCircleIcon className={`w-5 h-5 ${dark ? 'text-white/30' : 'text-gray-300'} group-hover/sns:${dark ? 'text-[var(--theme-secondary)]' : 'text-[var(--theme-primary)]'} transition-colors shrink-0`} />
            <a href={String(info.contactYoutube).startsWith('http') ? info.contactYoutube : `https://${info.contactYoutube}`} target="_blank" rel="noopener noreferrer" className={`w-full hover:${dark ? 'text-white' : 'text-[var(--theme-primary)]'} transition-colors`}>
              <EditableText value={String(info.contactYoutube).replace('https://', '')} placeholder="유튜브" onChange={(v) => hc('contactYoutube', v)} className="w-full" />
            </a>
          </div>
        )}
        {hasWebsite && (
          <div className="flex items-center gap-2 flex-1 group/sns">
            <GlobeAltIcon className={`w-5 h-5 ${dark ? 'text-white/30' : 'text-gray-300'} group-hover/sns:${dark ? 'text-[var(--theme-secondary)]' : 'text-[var(--theme-primary)]'} transition-colors shrink-0`} />
            <a href={String(info.contactWebsite).startsWith('http') ? info.contactWebsite : `https://${info.contactWebsite}`} target="_blank" rel="noopener noreferrer" className={`w-full hover:${dark ? 'text-white' : 'text-[var(--theme-primary)]'} transition-colors`}>
              <EditableText value={String(info.contactWebsite).replace('https://', '')} placeholder="웹사이트" onChange={(v) => hc('contactWebsite', v)} className="w-full" />
            </a>
          </div>
        )}
        {!hasAny && (
          <div className={`text-xs ${dark ? 'text-white/20' : 'text-gray-300'} italic`}>
            좌측 폼에서 SNS 링크를 입력하면 자동으로 표시됩니다
          </div>
        )}
      </div>
    </div>
  );
};

const Page7Ending: React.FC<Props> = ({ info, pageString, isHidden, layoutTheme, colorTheme, onUpdateInfo, agentImage, onImageUpload, onDeleteImage, isUploading, isUploadingImage }) => {
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
                <h1 className={`${info.isAdClosed ? 'text-3xl tracking-tight' : 'text-4xl tracking-[0.2em] uppercase'} font-extrabold text-[var(--theme-dark)] ${headingFont}`}>
                  {info.isAdClosed ? "위 매물은 광고가 종료되었습니다." : "CONTACT"}
                </h1>
                <p className="text-xs text-gray-400 tracking-[0.3em] font-bold uppercase mt-3">
                  {info.isAdClosed ? "자세한 문의는 아래로 연락주시기 바랍니다" : "전문가 상담 및 매물 문의"}
                </p>
                <div className="w-12 h-[2px] bg-[var(--theme-primary)] mx-auto mt-4"></div>
              </div>

              <div className="flex flex-col gap-6 flex-1">
                {/* 상단: 지도(좌) + 연락처/SNS(우) */}
                <div className="flex gap-6 flex-1">
                  <MapBlock info={info} onUpdateInfo={onUpdateInfo} onImageUpload={onImageUpload} onDeleteImage={onDeleteImage} isUploadingImage={isUploadingImage} className="w-7/12 rounded-xl border border-gray-200" />
                  
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
                        <span><EditableText value={info.agencyRepresentative || info.agentRepresentative || "김민혁"} onChange={(v) => hc('agencyRepresentative', v)} className="inline-block text-right" /></span>
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
                  <h1 className={`${info.isAdClosed ? 'text-3xl' : 'text-4xl'} font-black text-gray-900 tracking-tight ${headingFont}`}>
                    {info.isAdClosed ? "위 매물은 광고가 종료되었습니다." : "CONTACT"}
                  </h1>
                  <span className="text-[var(--theme-primary)] text-xs font-bold tracking-widest uppercase mt-2 block">
                    {info.isAdClosed ? "자세한 문의는 아래로 연락주시기 바랍니다" : "중개 및 매물 세부조건 문의처"}
                  </span>
                  <div className="w-16 h-[5px] bg-[var(--theme-primary)] mt-4"></div>
                </div>

                <div className="flex gap-8 my-5 flex-1 h-full">
                  {/* 왼쪽: 명함 스타일 문의 카드 */}
                  <div className="w-5/12 flex flex-col justify-center items-center h-full">
                    <div className="w-full aspect-[9/5] border border-gray-300 rounded-2xl p-8 shadow-sm flex flex-col justify-center items-start text-left">
                      {/* Inquiry Label */}
                      <div className="text-[22px] text-[var(--theme-primary)] font-black tracking-tight mb-1 whitespace-nowrap">
                        문의  <EditableText value={info.agentRepresentative || info.agencyRepresentative || "김정민"} onChange={(v) => hc('agentRepresentative', v)} className="inline-block" />
                      </div>
                      {/* Phone Number */}
                      <div className="text-[32px] font-black text-[var(--theme-primary)] tracking-tight mb-5">
                        <EditableText value={info.agentMobile || "010-5554-4444"} onChange={(v) => hc('agentMobile', v)} />
                      </div>
                      {/* Phone / SMS Buttons */}
                      <div className="flex gap-3">
                        <a href={`tel:${String(info.agentMobile || "010-5554-4444").replace(/[^0-9]/g, '')}`} onClick={(e) => e.preventDefault()} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--theme-primary)] text-white font-bold text-sm shadow-md hover:opacity-80 transition-opacity" title="전화걸기">
                          <PhoneIcon className="w-4 h-4" /> 전화하기
                        </a>
                        <a href={`sms:${String(info.agentMobile || "010-5554-4444").replace(/[^0-9]/g, '')}`} onClick={(e) => e.preventDefault()} className="flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-[var(--theme-primary)] text-[var(--theme-primary)] font-bold text-sm hover:bg-[var(--theme-primary)] hover:text-white transition-colors" title="문자보내기">
                          <ChatBubbleOvalLeftEllipsisIcon className="w-4 h-4" /> 문자보내기
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* 오른쪽: 지도 및 오시는 길 */}
                  <div className="w-7/12 flex flex-col gap-4 h-full">
                    <MapBlock info={info} onUpdateInfo={onUpdateInfo} onImageUpload={onImageUpload} onDeleteImage={onDeleteImage} isUploadingImage={isUploadingImage} className="flex-1 rounded-xl border border-gray-200 shadow-sm" />
                    
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm shrink-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <MapPinIcon className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
                          <span className="font-black text-xs tracking-widest text-[var(--theme-primary)]">
                            <EditableText value={info.page7DirectionsTitle || "오시는 길"} onChange={(v) => hc('page7DirectionsTitle', v)} />
                          </span>
                        </div>
                        <span className="text-[12px] font-extrabold text-[var(--theme-primary)] tracking-wider">
                          <EditableText value={info.agentName || "미래에셋공인중개사사무소"} onChange={(v) => hc('agentName', v)} />
                        </span>
                      </div>
                      <div className="text-gray-700 font-bold text-[12px] leading-relaxed whitespace-pre-wrap break-keep">
                        <EditableText multiline value={info.agentAddress || "강남구 내 주요 전철역 도보 5분 거리"} onChange={(v) => hc('agentAddress', v)} />
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
                <span className="text-[var(--theme-secondary)] text-xs font-bold tracking-[0.25em] block mb-2">
                  {info.isAdClosed ? "ADVERTISEMENT ENDED" : "FOR INQUIRIES"}
                </span>
                <h1 className={`${info.isAdClosed ? 'text-4xl' : 'text-5xl'} font-black tracking-tight leading-none uppercase ${headingFont}`}>
                  {info.isAdClosed ? "위 매물은 광고가 종료되었습니다." : "CONTACT"}
                </h1>
                <div className="w-20 h-[6px] bg-[var(--theme-secondary)] mt-4"></div>
              </div>

              <div className="flex gap-8 flex-1 mt-6">
                <div className="w-5/12 flex flex-col justify-center gap-12 bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-xl">
                  <div>
                    <span className="text-xs text-[var(--theme-secondary)] font-bold tracking-widest block mb-3">AGENT</span>
                    <div className="flex items-center gap-3">
                      <span className="text-4xl font-extrabold text-white tracking-tight"><EditableText value={info.agentRepresentative || "김민혁"} onChange={(v) => hc('agentRepresentative', v)} /></span>
                      <a href={`tel:${String(info.agentMobile || "010-5554-4444").replace(/[^0-9]/g, '')}`} onClick={(e) => e.preventDefault()} className="w-10 h-10 rounded-full bg-[var(--theme-secondary)] text-[var(--theme-dark)] flex items-center justify-center shadow-md hover:opacity-80 transition-opacity" title="전화걸기">
                        <PhoneIcon className="w-4 h-4" />
                      </a>
                      <a href={`sms:${String(info.agentMobile || "010-5554-4444").replace(/[^0-9]/g, '')}`} onClick={(e) => e.preventDefault()} className="w-10 h-10 rounded-full bg-[var(--theme-secondary)] text-[var(--theme-dark)] flex items-center justify-center shadow-md hover:opacity-80 transition-opacity" title="문자보내기">
                        <ChatBubbleOvalLeftEllipsisIcon className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[30px] font-black text-[var(--theme-secondary)] tracking-tight">
                      <EditableText value={info.agentMobile || "010-5554-4444"} onChange={(v) => hc('agentMobile', v)} />
                    </div>
                  </div>
                </div>
                
                <div className="w-7/12 flex flex-col">
                  <MapBlock info={info} onUpdateInfo={onUpdateInfo} onImageUpload={onImageUpload} onDeleteImage={onDeleteImage} isUploadingImage={isUploadingImage} className="flex-1 mb-3 border border-white/10 rounded-xl" />
                  
                  {/* Custom Directions Box for Theme 4 with Agent Name */}
                  <div className="flex gap-3 shrink-0">
                    <div className="flex-1 border border-white/10 bg-white/5 rounded-xl p-4 shadow-sm flex items-center justify-between relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-[var(--theme-secondary)]"></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <MapPinIcon className="w-3.5 h-3.5 text-[var(--theme-secondary)]" />
                          <span className="font-black text-xs tracking-widest text-[var(--theme-secondary)]">
                            <EditableText value={info.page7DirectionsTitle || "오시는 길"} onChange={(v) => hc('page7DirectionsTitle', v)} />
                          </span>
                        </div>
                        <div className="font-bold text-[10px] leading-relaxed whitespace-pre-wrap break-keep text-white/80">
                          <EditableText multiline value={info.agentAddress || "강남구 내 주요 전철역 도보 5분 거리"} onChange={(v) => hc('agentAddress', v)} />
                        </div>
                      </div>
                      
                      <div className="shrink-0 text-2xl font-black text-white tracking-tight text-right ml-4 mr-2">
                        <EditableText value={info.agentName || "미래에셋공인"} onChange={(v) => hc('agentName', v)} />
                      </div>
                    </div>
                    
                    <div className="w-[90px] shrink-0 border border-white/10 bg-white/5 rounded-xl p-2 shadow-sm flex flex-col items-center justify-center">
                      {qrCodeUrl ? (
                        <img src={qrCodeUrl} alt="QR Code" className="w-14 h-14 object-contain" />
                      ) : (
                        <div className="w-14 h-14 bg-white/10 rounded-lg flex items-center justify-center">
                          <span className="text-[8px] text-white/30">QR</span>
                        </div>
                      )}
                      <span className="text-[7px] font-bold mt-1 text-white/50">
                        <EditableText value={info.qrLabel || "네이버 지도"} onChange={(v) => hc('qrLabel', v)} />
                      </span>
                    </div>
                  </div>
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
                  <h1 className={`${info.isAdClosed ? 'text-4xl' : 'text-6xl'} font-black text-gray-900 tracking-tight ${headingFont}`}>
                    {info.isAdClosed ? "위 매물은 광고가 종료되었습니다." : "CONTACT"}
                  </h1>
                  <p className="text-base text-gray-400 tracking-[0.3em] font-bold mt-4">
                    {info.isAdClosed ? "자세한 문의는 아래로 연락주시기 바랍니다" : "상담 및 정보 문의처"}
                  </p>
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
                       onImageUpload={async (key, file) => {
                         if (onImageUpload) {
                           const url = await onImageUpload('agentCardFront', file);
                           if (url && onUpdateInfo) onUpdateInfo({ ...info, agentCardFront: url });
                         }
                       }}
                       onDelete={() => {
                         if (onUpdateInfo) onUpdateInfo({ ...info, agentCardFront: "" });
                         if (onDeleteImage) onDeleteImage('agentCardFront');
                       }}
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
                  <MapBlock info={info} onUpdateInfo={onUpdateInfo} onImageUpload={onImageUpload} onDeleteImage={onDeleteImage} isUploadingImage={isUploadingImage} className="flex-1 mb-3 border border-gray-200 rounded-xl" />
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
                <h1 className={`${info.isAdClosed ? 'text-3xl' : 'text-4xl'} font-extrabold text-gray-900 tracking-tight leading-none ${headingFont}`}>
                  {info.isAdClosed ? "위 매물은 광고가 종료되었습니다." : "CONTACT"}
                </h1>
                {info.isAdClosed && (
                  <p className="text-sm text-gray-500 font-bold mt-3">
                    자세한 문의는 아래로 연락주시기 바랍니다
                  </p>
                )}
                <div className="w-16 h-1 bg-[var(--theme-primary)] mt-4"></div>
              </div>

              <MapBlock info={info} onUpdateInfo={onUpdateInfo} onImageUpload={onImageUpload} onDeleteImage={onDeleteImage} isUploadingImage={isUploadingImage} className="flex-1 mb-6 mt-4 rounded-xl border border-gray-200 shadow-sm" />
              <DirectionsBox info={info} hc={hc} qrCodeUrl={qrCodeUrl} className="bg-white" hideQR={true} />
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

              {/* QR Code Block in the bottom right */}
              {qrCodeUrl && (
                <div className="relative z-20 mt-auto ml-auto flex items-center gap-4 bg-white/95 backdrop-blur p-4 rounded-2xl shadow-2xl text-gray-800 border border-white/20">
                  <img src={qrCodeUrl} alt="Naver Map QR" className="w-28 h-28 rounded-xl object-contain bg-white shadow-sm" />
                  <div className="text-left">
                    <p className="text-sm font-black text-gray-950 flex items-center gap-1.5">
                      <MapPinIcon className="w-4 h-4 text-[var(--theme-primary)] shrink-0" />
                      오시는 길
                    </p>
                    <p className="text-xs text-gray-500 font-bold leading-normal mt-1.5 break-keep">
                      스마트폰 카메라로 스캔하여<br />네이버 지도로 바로 연결
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
      {info.isAdClosed && (
        <CompletedOverlay info={info} colorTheme={colorTheme} />
      )}
      </div>
    </ErrorBoundary>
  );
};

export default Page7Ending;
