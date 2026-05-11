import React from 'react';

export default function ComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FEF01B] font-['Pretendard'] px-4">
      {/* Badge */}
      <div className="bg-[#111111] text-white px-10 md:px-14 py-4 md:py-5 text-3xl md:text-4xl font-bold mb-8 md:mb-12 shadow-sm">
        2026년 6월 1일
      </div>
      
      {/* Main Title */}
      <h1 className="text-[#111111] text-[40px] md:text-[72px] font-[900] text-center leading-[1.3] md:leading-[1.25] break-keep tracking-[-2px] md:tracking-[-3px]">
        11만 부동산<br />무료 공실정보채널 OPEN
      </h1>

      {/* Sub Text */}
      <p className="mt-8 md:mt-10 text-[#333333] text-2xl md:text-3xl font-[800] tracking-wider uppercase mb-16">
        Coming Soon
      </p>

      {/* Privacy Policy Link for App Reviewers */}
      <div className="absolute bottom-8 text-center">
        <a href="/com/privacy.html" className="text-[#555555] text-sm md:text-base underline underline-offset-4 hover:text-black transition-colors">
          개인정보 처리방침 및 계정 삭제 안내
        </a>
      </div>
    </div>
  );
}
