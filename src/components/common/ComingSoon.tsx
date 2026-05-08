import React from 'react';

export default function ComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FEF01B] font-['Pretendard'] px-4">
      {/* Badge */}
      <div className="bg-[#111111] text-white px-6 md:px-8 py-2 md:py-3 rounded-full text-lg md:text-xl font-bold mb-8 md:mb-10 shadow-sm">
        2026년 6월 1일
      </div>
      
      {/* Main Title */}
      <h1 className="text-[#111111] text-[36px] md:text-[64px] font-[900] text-center leading-[1.3] md:leading-[1.2] break-keep tracking-[-2px] md:tracking-[-3px]">
        11만 부동산 무료<br className="md:hidden" /> 공실정보채널 OPEN
      </h1>
    </div>
  );
}
