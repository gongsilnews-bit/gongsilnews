"use client";

import React from "react";

export default function VacancyMapSummary() {
  return (
    <section className="py-6 border-b border-gray-100 bg-white">
      <div className="px-4 mb-4 flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-[#1a2e50] flex items-center">
          실시간 공실 <span className="ml-1 text-[12px]">&gt;</span>
        </h2>
        <div className="text-[12px] text-gray-500 border border-gray-200 rounded px-2 py-1">전체 ▾</div>
      </div>
      
      {/* 모바일 맵 요약 뷰 */}
      <div className="px-4 mb-4">
        <div className="relative w-full h-[180px] bg-[#e5e9f0] rounded-xl overflow-hidden border border-gray-200">
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(#9ca3af 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          <div className="absolute top-[40%] left-0 w-full h-[30px] bg-blue-200/50 transform -skew-y-12"></div>
          
          <div className="absolute top-1/4 left-1/3 w-6 h-6 bg-[#3b82f6] text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-md">1</div>
          <div className="absolute top-1/2 left-2/3 w-6 h-6 bg-[#3b82f6] text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-md">6</div>
          <div className="absolute bottom-1/4 left-1/2 w-6 h-6 bg-[#3b82f6] text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-md">2</div>
          
          <button className="absolute top-3 left-1/2 transform -translate-x-1/2 bg-[#1a2e50] text-white text-[11px] font-bold px-4 py-1.5 rounded-full shadow-md">
            내 위치에서 검색
          </button>
        </div>
      </div>

      {/* 실시간 부동산 지수 티커 */}
      <div className="px-4">
        <div className="flex items-center bg-gray-50 border border-gray-100 rounded-lg overflow-hidden h-10 text-[12px]">
          <div className="bg-[#1a2e50] text-white font-bold px-3 h-full flex items-center">
            실시간 부동산 지수
          </div>
          <div className="flex-1 px-3 whitespace-nowrap overflow-hidden flex items-center gap-4 text-gray-700 font-medium">
            <span>매매가격지수(서울) <span className="text-red-500 font-bold ml-1">102.4 ▲ 0.15%</span></span>
            <span>전세가격지수(서울) <span className="text-red-500 font-bold ml-1">105.2 ▲ 0.28%</span></span>
          </div>
        </div>
      </div>
    </section>
  );
}
