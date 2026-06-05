import React from 'react';
import { PropertyInfo, FlyerColor } from '../../types';

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
        <div className="absolute top-4 right-8 bg-white rounded-xl border border-gray-200/80 shadow-md p-4 w-[280px] text-left z-50 flex flex-col gap-1.5 select-none pointer-events-auto">
          <div className="text-[10px] font-black tracking-widest text-gray-400 uppercase">REALTY AGENCY</div>
          <div className="text-xs font-extrabold text-gray-800 truncate">
            {info.agentName || "미래에셋공인 중개사 사무소"} <span className="text-gray-300 font-normal mx-1">|</span> <span className="text-gray-500 font-semibold">대표 {info.agencyRepresentative || info.agentRepresentative || "김상태"}</span>
          </div>
          <div className="text-[9px] text-gray-400 font-medium flex items-center gap-1">
            <span className="bg-gray-100 text-gray-500 px-1 rounded text-[8px] font-bold shrink-0">등록</span>
            <span className="truncate">{info.agentRegistrationNumber || info.agentRegistrationNo || "제11680-2015-00123호"}</span>
          </div>
          <div className="text-xs text-gray-700 font-bold flex items-center gap-1.5 mt-0.5">
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            <span className="text-gray-900 font-black">{info.agentPhone || info.agentMobile || "02-1234-5678"}</span>
          </div>
          <div className="text-[9px] text-gray-400 font-medium flex items-start gap-1 leading-tight mt-0.5">
            <svg className="w-3 h-3 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span className="line-clamp-1">{info.agentAddress || "서울 강남구 논현동 123-45"}</span>
          </div>
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
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-5 flex items-stretch divide-x divide-gray-100 min-w-[580px] text-left">
          {/* Left: 오시는 길 */}
          <div className="flex-1 pr-6 flex flex-col justify-center gap-1.5">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 shrink-0" style={{ stroke: primaryColor }} viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              <span className="font-extrabold text-xs tracking-widest uppercase" style={{ color: primaryColor }}>오시는 길</span>
            </div>
            <div className="text-gray-700 font-bold text-[11px] leading-relaxed break-keep">
              {info?.agentAddress || "서울 강남구 논현동 123-45"}
            </div>
            <a 
              href={`https://map.naver.com/v5/search/${encodeURIComponent(info?.agentAddress || "서울 강남구 논현동 123-45")}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-1 self-start px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center gap-1.5 text-[10px] font-bold text-gray-600 pointer-events-auto"
            >
              <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></svg>
              <span>네이버 지도 보기</span>
            </a>
          </div>

          {/* Right: 문의하기 */}
          <div className="flex-1 pl-6 flex flex-col justify-center gap-1.5">
            <div className="text-[11px] font-extrabold tracking-widest uppercase" style={{ color: primaryColor }}>문의하기</div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[17px] font-black text-gray-900 tracking-tight">
                {info?.agentMobile || info?.agentPhone || "010-8831-9450"}
              </span>
              <div className="flex items-center gap-2">
                {/* Large Call Button */}
                <a 
                  href={`tel:${(info?.agentMobile || info?.agentPhone || "010-8831-9450").replace(/[^0-9]/g, '')}`} 
                  onClick={(e) => e.stopPropagation()}
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md hover:opacity-80 transition-opacity active:scale-95 pointer-events-auto shrink-0"
                  style={{ backgroundColor: primaryColor }}
                  title="전화하기"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                </a>
                {/* SMS Button */}
                <a 
                  href={`sms:${(info?.agentMobile || info?.agentPhone || "010-8831-9450").replace(/[^0-9]/g, '')}`} 
                  onClick={(e) => e.stopPropagation()}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md hover:opacity-80 transition-opacity active:scale-95 pointer-events-auto shrink-0"
                  style={{ backgroundColor: primaryColor }}
                  title="문자하기"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
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
