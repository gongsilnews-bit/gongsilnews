import React from 'react';
import { PropertyInfo, FlyerColor } from '../../types';
import { Building2, FileText, Phone, MapPin, MessageSquare } from 'lucide-react';

interface CompletedOverlayProps {
  info?: PropertyInfo;
  colorTheme?: FlyerColor;
}

const CompletedOverlay: React.FC<CompletedOverlayProps> = ({ info, colorTheme }) => {
  const primaryColor = colorTheme?.primary || '#00788c';

  return (
    <div className="absolute inset-0 bg-white/90 backdrop-blur-[2px] z-[45] flex flex-col items-center justify-center p-8 select-none pointer-events-auto">
      {/* Top Right Agency Card */}
      {info && (
        <div className="absolute top-4 right-8 bg-white rounded-xl border border-gray-200/80 shadow-md p-3.5 w-[280px] text-left z-50 flex flex-col gap-1 select-none pointer-events-auto">
          <div className="text-[10px] font-black tracking-widest text-gray-400 uppercase">REALTY AGENCY</div>
          <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5 mt-0.5">
            <Building2 className="w-3.5 h-3.5 shrink-0" style={{ color: primaryColor }} />
            <span className="truncate">{info.agentName || "미래에셋공인 중개사"}</span>
          </div>
          <div className="text-[10px] text-gray-500 font-bold flex items-center gap-1.5">
            <span className="text-gray-400">대표</span>
            <span>{info.agentRepresentative || "김상태"}</span>
          </div>
          {(info.agentRegistrationNumber || info.agentRegistrationNo) && (
            <div className="text-[9px] text-gray-400 font-medium flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">등록번호: {info.agentRegistrationNumber || info.agentRegistrationNo}</span>
            </div>
          )}
          <div className="text-[11px] text-gray-700 font-bold flex items-center gap-1.5 mt-0.5">
            <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: primaryColor }} />
            <span>{info.agentMobile || info.agentPhone || "010-8831-9450"}</span>
          </div>
          {info.agentAddress && (
            <div className="text-[9px] text-gray-400 font-medium flex items-start gap-1.5 leading-tight mt-0.5">
              <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{info.agentAddress}</span>
            </div>
          )}
        </div>
      )}

      {/* Central Announcement Box */}
      <div className="flex flex-col items-center text-center max-w-[650px] z-50">
        {/* Theme color banner */}
        <div 
          className="px-8 py-3.5 text-white font-extrabold text-2xl tracking-wide rounded-lg shadow-md mb-3 whitespace-nowrap"
          style={{ backgroundColor: primaryColor }}
        >
          본 물건은 계약완료(종료) 물건입니다.
        </div>
        {/* Theme color sub-text */}
        <div 
          className="font-extrabold text-lg mb-6 tracking-wide"
          style={{ color: primaryColor }}
        >
          궁금한 내용은 아래로 문의주세요
        </div>

        {/* Details Box */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-5 flex items-stretch divide-x divide-gray-100 min-w-[540px] text-left">
          {/* Left: 오시는 길 */}
          <div className="flex-1 pr-6 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 mb-2">
              <MapPin className="w-4 h-4" style={{ color: primaryColor }} />
              <span className="font-extrabold text-xs tracking-widest uppercase" style={{ color: primaryColor }}>오시는 길</span>
            </div>
            <div className="text-gray-700 font-bold text-[11px] leading-relaxed break-keep">
              {info?.agentAddress || "서울시 강남구 논현동 인근"}
            </div>
          </div>

          {/* Right: 문의하기 */}
          <div className="flex-1 pl-6 flex flex-col justify-center">
            <div className="text-[11px] font-extrabold tracking-widest mb-1.5 uppercase" style={{ color: primaryColor }}>문의하기</div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-base font-black text-gray-900 tracking-tight">
                {info?.agentMobile || info?.agentPhone || "010-8831-9450"}
              </span>
              <div className="flex gap-2">
                <a 
                  href={`tel:${(info?.agentMobile || info?.agentPhone || "010-8831-9450").replace(/[^0-9]/g, '')}`} 
                  onClick={(e) => e.stopPropagation()}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md hover:opacity-80 transition-opacity active:scale-95 pointer-events-auto"
                  style={{ backgroundColor: primaryColor }}
                  title="전화하기"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
                <a 
                  href={`sms:${(info?.agentMobile || info?.agentPhone || "010-8831-9450").replace(/[^0-9]/g, '')}`} 
                  onClick={(e) => e.stopPropagation()}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md hover:opacity-80 transition-opacity active:scale-95 pointer-events-auto"
                  style={{ backgroundColor: primaryColor }}
                  title="문자하기"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompletedOverlay;
