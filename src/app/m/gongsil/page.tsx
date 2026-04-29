"use client";

import React, { useState } from 'react';
import Link from 'next/link';

export default function MobileGongsilPage() {
  const [filters] = useState(['거래유형', '가격', '구조', '면적', '층수']);

  return (
    <div className="w-full relative flex flex-col bg-gray-50 overflow-hidden" style={{ width: '100%', height: 'calc(100vh - 116px)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* 1. 필터 칩 영역 (검색창 삭제됨) */}
      <div className="w-full bg-white border-b border-gray-200 overflow-x-auto whitespace-nowrap no-scrollbar z-10 py-2" style={{ width: '100%', backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', overflowX: 'auto', whiteSpace: 'nowrap', zIndex: 10, padding: '8px 0' }}>
        <ul className="flex px-4 gap-2" style={{ display: 'flex', padding: '0 16px', gap: '8px' }}>
          {filters.map((filter) => (
            <li key={filter}>
              <button className="flex items-center px-3 py-1.5 border border-gray-300 rounded-full text-[13px] text-gray-700 bg-white" style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '9999px', fontSize: '13px', color: '#374151', backgroundColor: '#fff' }}>
                {filter}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* 3. 지도 영역 */}
      <div className="flex-1 relative w-full overflow-hidden bg-[#e6eed4]" style={{ flex: 1, position: 'relative', width: '100%', overflow: 'hidden', backgroundColor: '#e6eed4' }}>
        {/* 가상의 지도 배경 (패턴이나 이미지) */}
        <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.4, pointerEvents: 'none', backgroundImage: 'radial-gradient(#9ca3af 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        
        {/* 가상의 길 및 구역 표시 */}
        <div className="absolute top-[30%] left-[20%] w-[100px] h-[50px] bg-blue-100 rounded opacity-60" style={{ position: 'absolute', top: '30%', left: '20%', width: '100px', height: '50px', backgroundColor: '#dbeafe', borderRadius: '4px', opacity: 0.6 }}></div>
        <div className="absolute top-[40%] right-[10%] w-[150px] h-[80px] bg-green-100 rounded opacity-60" style={{ position: 'absolute', top: '40%', right: '10%', width: '150px', height: '80px', backgroundColor: '#dcfce3', borderRadius: '4px', opacity: 0.6 }}></div>

        {/* 클러스터 마커 모음 */}
        {[
          { top: '20%', left: '30%', num: 8 },
          { top: '45%', left: '70%', num: 7 },
          { top: '55%', left: '20%', num: 11 },
          { top: '65%', left: '45%', num: 20 },
          { top: '80%', left: '80%', num: 13 },
          { top: '75%', left: '15%', num: 12 },
          { top: '85%', left: '60%', num: 2 },
          { top: '35%', left: '85%', num: 23 },
        ].map((marker, idx) => (
          <div key={idx} className="absolute flex items-center justify-center rounded-full bg-blue-500 text-white font-bold text-[14px] shadow-md border-2 border-white cursor-pointer" style={{ position: 'absolute', top: marker.top, left: marker.left, width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '2px solid #fff', transform: 'translate(-50%, -50%)' }}>
            {marker.num}
          </div>
        ))}

        {/* 지하철역 마커 */}
        <div className="absolute top-[25%] left-[45%] flex flex-col items-center" style={{ position: 'absolute', top: '25%', left: '45%', display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'translate(-50%, -50%)' }}>
          <div className="bg-green-600 text-white text-[10px] px-1 rounded-sm mb-1" style={{ backgroundColor: '#16a34a', color: '#fff', fontSize: '10px', padding: '0 4px', borderRadius: '2px', marginBottom: '4px' }}>2</div>
          <div className="bg-gray-800 text-white text-[11px] px-2 py-0.5 rounded opacity-80 font-bold" style={{ backgroundColor: '#1f2937', color: '#fff', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', opacity: 0.8, fontWeight: 700 }}>잠실역</div>
        </div>

        {/* 4. 플로팅 버튼 영역 */}
        
        {/* 우측 상단 AI중개사 */}
        <button className="absolute top-4 right-4 bg-white text-blue-600 font-bold px-4 py-2 rounded-full shadow-lg flex items-center text-[14px]" style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: '#fff', color: '#2563eb', fontWeight: 700, padding: '8px 16px', borderRadius: '9999px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', fontSize: '14px', zIndex: 20 }}>
          <span className="text-blue-400 mr-1 text-[16px] leading-none" style={{ color: '#60a5fa', marginRight: '4px', fontSize: '16px', lineHeight: 1 }}>✦</span> AI중개사
        </button>

        {/* 좌측 하단 방내놓기 */}
        <div className="absolute bottom-[90px] left-4 flex flex-col items-start z-20" style={{ position: 'absolute', bottom: '90px', left: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', zIndex: 20 }}>
          <div className="bg-blue-500 text-white text-[11px] font-bold px-2 py-1 rounded-md mb-1 shadow-md relative" style={{ backgroundColor: '#3b82f6', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 8px', borderRadius: '6px', marginBottom: '4px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', position: 'relative' }}>
            중개사무소에
            <div className="absolute bottom-[-4px] left-4 w-2 h-2 bg-blue-500 rotate-45" style={{ position: 'absolute', bottom: '-4px', left: '16px', width: '8px', height: '8px', backgroundColor: '#3b82f6', transform: 'rotate(45deg)' }}></div>
          </div>
          <button className="bg-white border border-gray-200 text-gray-900 font-bold px-3 py-2 rounded-lg shadow-lg flex items-center text-[13px]" style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', color: '#111827', fontWeight: 700, padding: '8px 12px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', fontSize: '13px' }}>
            <div className="bg-gray-800 text-white p-1 rounded-sm mr-2 flex items-center justify-center" style={{ backgroundColor: '#1f2937', color: '#fff', padding: '4px', borderRadius: '4px', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </div>
            방 내놓기
          </button>
        </div>

        {/* 우측 하단 내위치 */}
        <button className="absolute bottom-[90px] right-4 bg-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center z-20 border border-gray-100" style={{ position: 'absolute', bottom: '90px', right: '16px', backgroundColor: '#fff', width: '40px', height: '40px', borderRadius: '50%', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, border: '1px solid #f3f4f6' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a2e50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="3" fill="#1a2e50"></circle>
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
          </svg>
        </button>

        {/* 하단 주황색 롱 버튼 */}
        <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-white/80 to-transparent z-20" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '16px', background: 'linear-gradient(to top, rgba(255,255,255,0.8), transparent)', zIndex: 20 }}>
          <button className="w-full bg-[#1a2e50] hover:bg-[#111827] text-white font-bold py-3.5 rounded-lg text-[16px] shadow-md transition-colors" style={{ width: '100%', backgroundColor: '#1a2e50', color: '#fff', fontWeight: 700, padding: '14px 0', borderRadius: '8px', fontSize: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', textAlign: 'center', border: 'none' }}>
            이 지역 매물보기 200개
          </button>
        </div>
      </div>
    </div>
  );
}
