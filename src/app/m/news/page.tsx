"use client";

import React, { useState } from 'react';
import Link from 'next/link';

export default function MobileNewsPage() {
  // 사용자가 요청한 현재 공실뉴스 PC 버전의 메뉴
  const categories = [
    "전체뉴스", "우리동네뉴스", "부동산·주식·재테크", "정치·경제·사회", "세무·법률", "여행·건강·생활", "기타"
  ];

  const [activeTab, setActiveTab] = useState(categories[0]);

  return (
    <div className="w-full bg-white min-h-screen flex flex-col" style={{ width: '100%', backgroundColor: '#ffffff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      {/* 1. 카테고리 탭 (가로 스크롤) - 남색 배경에 흰색 글씨, 활성화 시 흰색 하단 바 */}
      <div className="w-full overflow-x-auto whitespace-nowrap no-scrollbar sticky top-[44px] z-40" style={{ width: '100%', overflowX: 'auto', whiteSpace: 'nowrap', position: 'sticky', top: '44px', backgroundColor: '#1a2e50', zIndex: 40, marginTop: '-1px' }}>
        <ul className="flex px-4" style={{ display: 'flex', padding: '0 16px' }}>
          {categories.map((cat, i) => (
            <li 
              key={cat} 
              className="mr-6 py-3 relative cursor-pointer" 
              style={{ marginRight: '24px', padding: '12px 0', position: 'relative', cursor: 'pointer' }}
              onClick={() => setActiveTab(cat)}
            >
              <span className={`text-[15px] ${activeTab === cat ? 'font-bold' : 'font-medium'}`} style={{ fontSize: '15px', color: activeTab === cat ? '#ffffff' : 'rgba(255, 255, 255, 0.7)', fontWeight: activeTab === cat ? 700 : 500 }}>
                {cat}
              </span>
              {activeTab === cat && (
                <div className="absolute bottom-0 left-0 w-full h-[3px] bg-white" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '3px', backgroundColor: '#ffffff' }}></div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {activeTab === '우리동네뉴스' ? (
        /* 우리동네뉴스: 지도 기반 특화 뷰 */
        <div className="relative w-full flex-1 overflow-hidden bg-[#e5e9f0]" style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#e5e9f0' }}>
          {/* 가상의 지도 배경 (그리드 패턴) */}
          <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#9ca3af 1px, transparent 1px)', backgroundSize: '20px 20px', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}></div>
          
          {/* 가상의 강/도로 표시 */}
          <div className="absolute top-[40%] left-0 w-full h-[40px] bg-blue-200/50 transform -skew-y-12" style={{ position: 'absolute', top: '40%', left: 0, width: '100%', height: '40px', backgroundColor: 'rgba(191, 219, 254, 0.5)', transform: 'skewY(-12deg)' }}></div>

          {/* 지도 마커 (오렌지색 클러스터) */}
          {[
            { top: '30%', left: '40%', num: 1 },
            { top: '45%', left: '50%', num: 2 },
            { top: '55%', left: '60%', num: 14 },
            { top: '60%', left: '65%', num: 3 },
            { top: '50%', left: '70%', num: 1 },
            { top: '70%', left: '40%', num: 1 },
            { top: '25%', left: '65%', num: 1 },
          ].map((marker, idx) => (
            <div key={idx} className="absolute flex items-center justify-center rounded-full bg-[#f97316] text-white font-bold text-[14px] shadow-md border-2 border-white cursor-pointer" style={{ position: 'absolute', top: marker.top, left: marker.left, width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#f97316', color: '#fff', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '2px solid #fff', transform: 'translate(-50%, -50%)', zIndex: 10 }}>
              {marker.num}
            </div>
          ))}

          {/* 상단 컨트롤 UI */}
          <div className="absolute top-4 left-0 w-full px-4 flex justify-between z-20" style={{ position: 'absolute', top: '16px', left: 0, width: '100%', padding: '0 16px', display: 'flex', justifyContent: 'space-between', zIndex: 20 }}>
            <div className="bg-white rounded-full px-4 py-2 shadow-md text-[13px] font-bold text-gray-700 flex items-center" style={{ backgroundColor: '#fff', borderRadius: '9999px', padding: '8px 16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '13px', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center' }}>
              <span>서울시 강남구</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            <button className="bg-[#f97316] text-white rounded-full px-4 py-2 shadow-md text-[13px] font-bold" style={{ backgroundColor: '#f97316', color: '#fff', borderRadius: '9999px', padding: '8px 16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '13px', fontWeight: 700, border: 'none' }}>
              내 위치에서 검색
            </button>
          </div>

          {/* 하단 뉴스 카드 슬라이더 */}
          <div className="absolute bottom-6 left-0 w-full overflow-x-auto whitespace-nowrap no-scrollbar z-20 px-4" style={{ position: 'absolute', bottom: '24px', left: 0, width: '100%', overflowX: 'auto', whiteSpace: 'nowrap', zIndex: 20, padding: '0 16px' }}>
            <div className="flex gap-3" style={{ display: 'flex', gap: '12px' }}>
              
              {/* 뉴스 카드 1 */}
              <div className="w-[280px] bg-white rounded-xl shadow-lg p-3 inline-block whitespace-normal align-top flex-shrink-0" style={{ width: '280px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px', display: 'inline-block', whiteSpace: 'normal', verticalAlign: 'top', flexShrink: 0 }}>
                <div className="flex gap-3" style={{ display: 'flex', gap: '12px' }}>
                  <div className="flex-1" style={{ flex: 1 }}>
                    <span className="text-[11px] font-bold text-[#f97316] mb-1 block" style={{ fontSize: '11px', fontWeight: 700, color: '#f97316', marginBottom: '4px', display: 'block' }}>우리동네 단독</span>
                    <h4 className="text-[14px] font-bold text-gray-900 leading-snug line-clamp-2" style={{ fontSize: '14px', fontWeight: 700, color: '#111827', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>작년 공인중개사 신규 개업 1998년 IMF 외환위기 이후 최소</h4>
                    <p className="text-[11px] text-gray-500 mt-2" style={{ fontSize: '11px', color: '#6b7280', marginTop: '8px' }}>1시간 전 · 김민석 기자</p>
                  </div>
                  <div className="w-[70px] h-[70px] bg-gray-200 rounded-lg overflow-hidden flex-shrink-0" style={{ width: '70px', height: '70px', backgroundColor: '#e5e7eb', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                    <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200&q=80" className="w-full h-full object-cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                </div>
              </div>
              
              {/* 뉴스 카드 2 */}
              <div className="w-[280px] bg-white rounded-xl shadow-lg p-3 inline-block whitespace-normal align-top flex-shrink-0" style={{ width: '280px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px', display: 'inline-block', whiteSpace: 'normal', verticalAlign: 'top', flexShrink: 0 }}>
                <div className="flex gap-3" style={{ display: 'flex', gap: '12px' }}>
                  <div className="flex-1" style={{ flex: 1 }}>
                    <span className="text-[11px] font-bold text-[#f97316] mb-1 block" style={{ fontSize: '11px', fontWeight: 700, color: '#f97316', marginBottom: '4px', display: 'block' }}>우리동네 핫이슈</span>
                    <h4 className="text-[14px] font-bold text-gray-900 leading-snug line-clamp-2" style={{ fontSize: '14px', fontWeight: 700, color: '#111827', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>"이채·결제 다 뚫리나"...세계 경제수장들 '미도스' 대응 고심</h4>
                    <p className="text-[11px] text-gray-500 mt-2" style={{ fontSize: '11px', color: '#6b7280', marginTop: '8px' }}>2시간 전 · 공실뉴스</p>
                  </div>
                  <div className="w-[70px] h-[70px] bg-gray-200 rounded-lg overflow-hidden flex-shrink-0" style={{ width: '70px', height: '70px', backgroundColor: '#e5e7eb', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                    <img src="https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=200&q=80" className="w-full h-full object-cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      ) : (
        /* 기존 일반 리스트 뷰 */
        <div className="flex-1 pb-10" style={{ flex: 1, paddingBottom: '40px' }}>
          {/* 2. 메인 헤드라인 히어로 배너 */}
          <div className="relative w-full h-[240px] bg-gray-200 overflow-hidden cursor-pointer" style={{ position: 'relative', width: '100%', height: '240px', backgroundColor: '#e5e7eb', overflow: 'hidden', cursor: 'pointer' }}>
            <img 
              src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
              alt="Headline" 
              className="w-full h-full object-cover"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.3), transparent)' }}></div>
            <div className="absolute bottom-0 left-0 w-full p-5" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '20px' }}>
              <span className="inline-block px-2 py-1 bg-red-600 text-white text-xs font-bold mb-2" style={{ display: 'inline-block', padding: '4px 8px', backgroundColor: '#dc2626', color: '#ffffff', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>부동산·주식·재테크</span>
              <h2 className="text-white text-xl font-bold leading-snug break-keep" style={{ color: '#ffffff', fontSize: '20px', fontWeight: 700, lineHeight: 1.3, wordBreak: 'keep-all' }}>
                강남 오피스 공실률 0%대 진입... '품귀 현상' 언제까지 이어질까
              </h2>
            </div>
          </div>

          {/* 3. 실시간 뉴스 티커 */}
          <div className="flex items-center px-4 py-3 border-b border-gray-100 bg-white" style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#ffffff' }}>
            <span className="text-red-600 font-bold text-sm mr-3 flex-shrink-0" style={{ color: '#dc2626', fontWeight: 700, fontSize: '14px', marginRight: '12px', flexShrink: 0 }}>실시간</span>
            <p className="text-[14px] text-gray-800 truncate flex-1 font-medium" style={{ fontSize: '14px', color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, fontWeight: 500 }}>
              성수동 지식산업센터, 매매가 평당 4천만원 돌파하며 역대 최고가 경신
            </p>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 ml-2" style={{ flexShrink: 0, marginLeft: '8px' }}>
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>

          {/* 4. 뉴스 리스트 */}
          <div className="px-4 py-2" style={{ padding: '8px 16px' }}>
            {/* 리스트 아이템 1 */}
            <div className="flex py-4 border-b border-gray-100 cursor-pointer" style={{ display: 'flex', padding: '16px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}>
              <div className="flex-1 pr-4" style={{ flex: 1, paddingRight: '16px' }}>
                <h3 className="text-[16px] font-bold text-gray-900 leading-snug mb-2 line-clamp-2 break-keep" style={{ fontSize: '16px', fontWeight: 700, color: '#111827', lineHeight: 1.3, marginBottom: '8px', wordBreak: 'keep-all', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  정부, 상가 임대차보호법 개정안 발표... 자영업자 보호 강화된다
                </h3>
                <div className="text-[12px] text-gray-500 flex items-center" style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                  <span className="text-blue-600 font-semibold mr-2" style={{ color: '#2563eb', fontWeight: 600, marginRight: '8px' }}>정치·경제·사회</span>
                  <span>2026-04-29</span>
                </div>
              </div>
              <div className="w-[100px] h-[70px] bg-gray-200 rounded-lg overflow-hidden flex-shrink-0" style={{ width: '100px', height: '70px', backgroundColor: '#e5e7eb', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                <img src="https://images.unsplash.com/photo-1541888081622-4a00cb9f3f4c?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" alt="News" className="w-full h-full object-cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>

            {/* 리스트 아이템 2 */}
            <div className="flex py-4 border-b border-gray-100 cursor-pointer" style={{ display: 'flex', padding: '16px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}>
              <div className="flex-1 pr-4" style={{ flex: 1, paddingRight: '16px' }}>
                <h3 className="text-[16px] font-bold text-gray-900 leading-snug mb-2 line-clamp-2 break-keep" style={{ fontSize: '16px', fontWeight: 700, color: '#111827', lineHeight: 1.3, marginBottom: '8px', wordBreak: 'keep-all', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  여름의 시작 '서울썸머바이브' 음악과 춤, 아트와 패션까지 노들섬을 달구다
                </h3>
                <div className="text-[12px] text-gray-500 flex items-center" style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                  <span className="text-blue-600 font-semibold mr-2" style={{ color: '#2563eb', fontWeight: 600, marginRight: '8px' }}>여행·건강·생활</span>
                  <span>2026-04-29</span>
                </div>
              </div>
              <div className="w-[100px] h-[70px] bg-gray-200 rounded-lg overflow-hidden flex-shrink-0" style={{ width: '100px', height: '70px', backgroundColor: '#e5e7eb', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                <img src="https://images.unsplash.com/photo-1459749411175-04bf5292ceea?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" alt="News" className="w-full h-full object-cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>

            {/* 리스트 아이템 3 */}
            <div className="flex py-4 border-b border-gray-100 cursor-pointer" style={{ display: 'flex', padding: '16px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}>
              <div className="flex-1 pr-4" style={{ flex: 1, paddingRight: '16px' }}>
                <h3 className="text-[16px] font-bold text-gray-900 leading-snug mb-2 line-clamp-2 break-keep" style={{ fontSize: '16px', fontWeight: 700, color: '#111827', lineHeight: 1.3, marginBottom: '8px', wordBreak: 'keep-all', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  '제46회 국제환경산업기술·그린에너지전' 코엑스 개막식
                </h3>
                <div className="text-[12px] text-gray-500 flex items-center" style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                  <span className="text-blue-600 font-semibold mr-2" style={{ color: '#2563eb', fontWeight: 600, marginRight: '8px' }}>기타</span>
                  <span>2026-04-28</span>
                </div>
              </div>
              <div className="w-[100px] h-[70px] bg-gray-200 rounded-lg overflow-hidden flex-shrink-0" style={{ width: '100px', height: '70px', backgroundColor: '#e5e7eb', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" alt="News" className="w-full h-full object-cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
