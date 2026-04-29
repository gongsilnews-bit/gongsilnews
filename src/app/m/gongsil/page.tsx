"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// --- 더미 데이터 ---
const MOCK_VACANCIES = [
  {
    id: 'v1',
    building_name: '순화더샵(주상복합) B동',
    trade_type: '매매',
    price: '5억',
    price_detail: '3,571만원/3.3㎡',
    property_type: '아파트',
    area: '46G1㎡ (전용35G1)',
    floor: '중/27층',
    direction: '북향',
    description: '입주가능한 서울역 도보 5분 원룸 순화동 더샵',
    created_at: '2026.04.21.',
    thumbnail: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&q=80',
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1de2d9d000?w=800&q=80',
    ],
    details: {
      매매가: '5억원',
      관리비: '10만원',
      구조: '방 1, 욕실 1',
      난방: '개별난방, 도시가스',
    },
    realtor_count: 2,
  },
  {
    id: 'v2',
    building_name: '덕수궁롯데캐슬(주상복합) 101동',
    trade_type: '매매',
    price: '6억 1,000 ~ 6억 5,000',
    price_detail: '',
    property_type: '아파트',
    area: '42㎡ (전용31)',
    floor: '7/22층',
    direction: '북동향',
    description: '덕수궁 뷰가 나오는 깔끔한 소형 아파트',
    created_at: '2026.04.29.',
    thumbnail: 'https://images.unsplash.com/photo-1502672260266-1c1de2d9d000?w=500&q=80',
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1de2d9d000?w=800&q=80',
    ],
    details: {
      매매가: '6억 3,000만원',
      관리비: '15만원',
      구조: '방 1, 욕실 1',
      난방: '지역난방, 열병합',
    },
    realtor_count: 2,
  },
  {
    id: 'v3',
    building_name: '삼정아트테라스정동(도시형) 1동',
    trade_type: '매매',
    price: '2억 5,000',
    price_detail: '',
    property_type: '아파트',
    area: '21F2㎡ (전용14F2)',
    floor: '5/9층',
    direction: '남향',
    description: '풀옵션 신축급 오피스텔형 아파트',
    created_at: '2026.04.29.',
    thumbnail: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=500&q=80',
    images: [
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80',
    ],
    details: {
      매매가: '2억 5,000만원',
      관리비: '8만원',
      구조: '원룸형, 욕실 1',
      난방: '개별난방, 도시가스',
    },
    realtor_count: 2,
  },
  {
    id: 'v4',
    building_name: '삼정아트테라스정동(도시형) 1동',
    trade_type: '매매',
    price: '3억 5,000',
    price_detail: '',
    property_type: '아파트',
    area: '21A1㎡ (전용13A1)',
    floor: '7/9층',
    direction: '북향',
    description: '시티뷰가 좋은 고층 매물',
    created_at: '2026.04.27.',
    thumbnail: 'https://images.unsplash.com/photo-1502005097973-6a7082348e28?w=500&q=80',
    images: [
      'https://images.unsplash.com/photo-1502005097973-6a7082348e28?w=800&q=80',
    ],
    details: {
      매매가: '3억 5,000만원',
      관리비: '9만원',
      구조: '원룸형, 욕실 1',
      난방: '개별난방, 도시가스',
    },
    realtor_count: 3,
  }
];

export default function MobileGongsilPage() {
  const [filters] = useState(['거래유형', '가격', '구조', '면적', '층수']);
  
  // 상태 관리
  const [selectedCluster, setSelectedCluster] = useState<any[] | null>(null);
  const [selectedVacancy, setSelectedVacancy] = useState<any | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

  // 클러스터 클릭 시 가짜 데이터 로드
  const handleClusterClick = (num: number) => {
    // 숫자에 관계없이 일단 가짜 데이터 세팅 (테스트용)
    // 네이버 부동산처럼 하단에서 올라오도록
    setSelectedCluster(MOCK_VACANCIES);
  };

  // 배경 클릭 시 닫기
  const handleMapClick = () => {
    setSelectedCluster(null);
  };

  return (
    <div className="w-full relative flex flex-col bg-gray-50 overflow-hidden" style={{ width: '100%', height: 'calc(100vh - 116px)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* 바텀 시트 애니메이션 */
        .bottom-sheet {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          background: white;
          border-radius: 20px 20px 0 0;
          box-shadow: 0 -4px 16px rgba(0,0,0,0.1);
          transform: translateY(100%);
          transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
          z-index: 30;
          max-height: 75vh;
          display: flex;
          flex-direction: column;
        }
        .bottom-sheet.open {
          transform: translateY(0);
        }

        /* 상세 뷰 애니메이션 (오른쪽에서 왼쪽으로 슬라이드) */
        .detail-view {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100dvh;
          background: white;
          z-index: 99999;
          transform: translateX(100%);
          transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .detail-view.open {
          transform: translateX(0);
        }
      `}</style>

      {/* 1. 필터 칩 영역 */}
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

      {/* 2. 지도 영역 */}
      <div className="flex-1 relative w-full overflow-hidden bg-[#e6eed4]" onClick={handleMapClick} style={{ flex: 1, position: 'relative', width: '100%', overflow: 'hidden', backgroundColor: '#e6eed4' }}>
        <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.4, pointerEvents: 'none', backgroundImage: 'radial-gradient(#9ca3af 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        
        {/* 가상의 길 및 구역 표시 */}
        <div className="absolute top-[30%] left-[20%] w-[100px] h-[50px] bg-blue-100 rounded opacity-60" style={{ position: 'absolute', top: '30%', left: '20%', width: '100px', height: '50px', backgroundColor: '#dbeafe', borderRadius: '4px', opacity: 0.6 }}></div>
        <div className="absolute top-[40%] right-[10%] w-[150px] h-[80px] bg-green-100 rounded opacity-60" style={{ position: 'absolute', top: '40%', right: '10%', width: '150px', height: '80px', backgroundColor: '#dcfce3', borderRadius: '4px', opacity: 0.6 }}></div>

        {/* 클러스터 마커 모음 */}
        {[
          { top: '20%', left: '30%', num: 8 },
          { top: '45%', left: '70%', num: 7 },
          { top: '55%', left: '20%', num: 11 },
          { top: '65%', left: '45%', num: 78 }, // 78개짜리 대표 클러스터
          { top: '80%', left: '80%', num: 13 },
          { top: '75%', left: '15%', num: 20 },
          { top: '85%', left: '60%', num: 2 },
          { top: '35%', left: '85%', num: 23 },
        ].map((marker, idx) => (
          <div 
            key={idx} 
            onClick={(e) => { e.stopPropagation(); handleClusterClick(marker.num); }}
            className={`absolute flex flex-col items-center justify-center rounded-full text-white shadow-md border-2 border-white cursor-pointer transition-transform ${selectedCluster ? 'scale-90 opacity-70' : 'scale-100'}`} 
            style={{ 
              position: 'absolute', top: marker.top, left: marker.left, 
              width: marker.num > 50 ? '56px' : '44px', height: marker.num > 50 ? '56px' : '44px', 
              borderRadius: '50%', 
              backgroundColor: marker.num > 50 ? '#1a2e50' : '#f97316', // 공실뉴스 네이비/오렌지 스타일
              color: '#fff', 
              transform: 'translate(-50%, -50%)',
              zIndex: 15
            }}
          >
            <span style={{ fontSize: marker.num > 50 ? '16px' : '14px', fontWeight: 800 }}>{marker.num}</span>
          </div>
        ))}

        {/* 우측 상단 AI중개사 */}
        <button className="absolute top-4 right-4 bg-white text-[#1a2e50] font-bold px-4 py-2 rounded-full shadow-lg flex items-center text-[14px]" style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: '#fff', color: '#1a2e50', fontWeight: 700, padding: '8px 16px', borderRadius: '9999px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', fontSize: '14px', zIndex: 20 }}>
          <span className="text-[#f97316] mr-1 text-[16px] leading-none" style={{ color: '#f97316', marginRight: '4px', fontSize: '16px', lineHeight: 1 }}>✦</span> AI중개사
        </button>
      </div>

      {/* 3. 매물 리스트 바텀 시트 (Bottom Sheet) */}
      <div className={`bottom-sheet ${selectedCluster ? 'open' : ''}`}>
        {/* 핸들 (드래그 바 표시) */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }} onClick={handleMapClick}>
          <div style={{ width: '40px', height: '4px', backgroundColor: '#e5e7eb', borderRadius: '4px' }}></div>
        </div>
        
        {/* 헤더 */}
        <div style={{ padding: '0 20px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>매물 <span style={{ color: '#f97316' }}>{selectedCluster?.length || 0}</span>개</h3>
          <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#6b7280' }}>
            <span style={{ fontWeight: 700, color: '#111' }}>랭킹순</span>
            <span>가격순</span>
            <span>최신순</span>
          </div>
        </div>

        {/* 리스트 (스크롤) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px', backgroundColor: '#f9fafb' }}>
          {selectedCluster?.map((vacancy) => (
            <div 
              key={vacancy.id} 
              onClick={() => { setSelectedVacancy(vacancy); setImageIndex(0); }}
              style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', marginTop: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', color: '#4b5563', marginBottom: '4px' }}>{vacancy.building_name}</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827', marginBottom: '4px' }}>
                    {vacancy.trade_type} {vacancy.price}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                    {vacancy.property_type} <span style={{ color: '#d1d5db' }}>|</span> {vacancy.area} <span style={{ color: '#d1d5db' }}>|</span> {vacancy.floor} <span style={{ color: '#d1d5db' }}>|</span> {vacancy.direction}
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#1a2e50', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>집주인</span>
                    <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>확인매물 {vacancy.created_at}</span>
                  </div>
                </div>
                <div style={{ width: '80px', height: '80px', flexShrink: 0, position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
                  <img src={vacancy.thumbnail} alt="매물" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: '4px', right: '4px', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>
                    {vacancy.images.length}
                  </div>
                </div>
              </div>
              <div style={{ backgroundColor: '#fff7ed', color: '#ea580c', fontSize: '13px', fontWeight: 700, padding: '10px', borderRadius: '8px', textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
                중개사 {vacancy.realtor_count}곳에서 등록했어요
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. 매물 상세 풀스크린 뷰 (Detail View) */}
      <div className={`detail-view ${selectedVacancy ? 'open' : ''}`}>
        {selectedVacancy && (
          <>
            {/* 상단 헤더바 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button onClick={() => setSelectedVacancy(null)} style={{ padding: '8px', marginLeft: '-8px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                </button>
                <div style={{ fontWeight: 800, fontSize: '16px' }}>{selectedVacancy.building_name.split('(')[0]}</div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
              </div>
            </div>

            {/* 메인 이미지 스와이프 영역 */}
            <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', backgroundColor: '#f3f4f6', overflow: 'hidden' }}>
              <img src={selectedVacancy.images[imageIndex]} alt="상세이미지" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              
              {/* 이미지 인디케이터 */}
              <div style={{ position: 'absolute', bottom: '16px', right: '16px', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '12px', padding: '4px 12px', borderRadius: '16px', fontWeight: 700 }}>
                {imageIndex + 1} / {selectedVacancy.images.length}
              </div>

              {/* 좌우 화살표 (이미지가 여러장일 때만) */}
              {selectedVacancy.images.length > 1 && (
                <>
                  <button onClick={() => setImageIndex(prev => Math.max(0, prev - 1))} style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: imageIndex === 0 ? 0.3 : 1 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </button>
                  <button onClick={() => setImageIndex(prev => Math.min(selectedVacancy.images.length - 1, prev + 1))} style={{ position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: imageIndex === selectedVacancy.images.length - 1 ? 0.3 : 1 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </button>
                </>
              )}
            </div>

            {/* 타이틀 및 핵심 요약 */}
            <div style={{ padding: '24px 20px', borderBottom: '8px solid #f3f4f6' }}>
              <div style={{ fontSize: '15px', color: '#4b5563', marginBottom: '8px' }}>{selectedVacancy.building_name}</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#111827', marginBottom: '4px' }}>
                {selectedVacancy.trade_type} {selectedVacancy.price}
              </div>
              {selectedVacancy.price_detail && (
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>{selectedVacancy.price_detail}</div>
              )}
              
              <div style={{ fontSize: '15px', color: '#374151', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontWeight: 800 }}>{selectedVacancy.property_type}</span>
                <span style={{ color: '#d1d5db' }}>|</span> 
                {selectedVacancy.area} 
                <span style={{ color: '#d1d5db' }}>|</span> 
                {selectedVacancy.floor} 
                <span style={{ color: '#d1d5db' }}>|</span> 
                {selectedVacancy.direction}
              </div>

              <div style={{ fontSize: '15px', color: '#4b5563', lineHeight: 1.5, marginBottom: '16px' }}>
                {selectedVacancy.description}
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#1a2e50', backgroundColor: '#e2e8f0', padding: '4px 8px', borderRadius: '4px', fontWeight: 700 }}>집주인</span>
                <span style={{ fontSize: '11px', color: '#ef4444', backgroundColor: '#fef2f2', padding: '4px 8px', borderRadius: '4px', fontWeight: 700 }}>확인매물 {selectedVacancy.created_at}</span>
              </div>
            </div>

            {/* 기본 정보 테이블 */}
            <div style={{ padding: '30px 20px 100px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', marginBottom: '20px' }}>기본 정보</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Object.entries(selectedVacancy.details).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: '15px', color: '#6b7280' }}>{key}</span>
                    <span style={{ fontSize: '15px', color: '#111827', fontWeight: 700 }}>{value as string}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 고정 하단 CTA 버튼 (전화걸기) */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', padding: '16px 20px 24px', backgroundColor: '#fff', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '12px', zIndex: 20 }}>
              <button style={{ width: '56px', height: '56px', borderRadius: '12px', border: '1px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: '#fff' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
              </button>
              <button style={{ flex: 1, height: '56px', borderRadius: '12px', backgroundColor: '#1a2e50', color: '#fff', fontSize: '18px', fontWeight: 800, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                전화하기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
