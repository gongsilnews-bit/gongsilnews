import React from 'react';

export default function ComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FEF01B] font-['Pretendard'] px-4">
      {/* Badge */}
      <div className="bg-[#111111] text-white px-8 md:px-10 py-3 md:py-4 rounded-full text-2xl md:text-3xl font-bold mb-8 md:mb-12 shadow-sm">
        2026년 6월 1일
      </div>
      
      {/* Main Title */}
      <h1 className="text-[#111111] text-[40px] md:text-[72px] font-[900] text-center leading-[1.3] md:leading-[1.25] break-keep tracking-[-2px] md:tracking-[-3px]">
        11만 부동산<br />무료 공실정보채널 OPEN
      </h1>
    </div>
  );
}
