import React from "react";

export default function BannerAd() {
  return (
    <div className="px-4 py-4 bg-gray-50">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative p-4 flex items-center cursor-pointer">
        <div className="absolute top-2 right-2 text-[9px] text-gray-400 border border-gray-200 px-1 rounded bg-white z-10">AD</div>
        <div className="flex-1 pr-4">
          <p className="text-[14px] font-bold text-gray-900 leading-snug mb-2">3개월분만 샀는데<br/>6개월분이 왔네요!</p>
          <div className="flex items-center gap-2">
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">-68%</span>
            <span className="text-[11px] text-gray-500 font-bold">대웅제약</span>
          </div>
        </div>
        <div className="w-[100px] h-[60px] bg-red-50 rounded overflow-hidden flex items-center justify-center flex-shrink-0">
           <img src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&q=80" className="h-full object-cover mix-blend-multiply" alt="Ad" />
        </div>
      </div>
    </div>
  );
}
