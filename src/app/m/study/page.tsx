"use client";

import React from 'react';
import Link from 'next/link';

export default function MobileStudyPage() {
  const lectures = [
    {
      id: 1,
      image: "https://images.unsplash.com/photo-1590650153855-d9e808231d41?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      category: "중개실무",
      title: "미국증시",
      author: "미국증시",
      rating: 0.0,
      reviews: 0,
      price: "21,000 P"
    },
    {
      id: 2,
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      category: "중개실무",
      title: "매매강의 시간 5천만원",
      author: "김강수",
      rating: 0.0,
      reviews: 0,
      price: "21,000 P"
    },
    {
      id: 3,
      image: "https://images.unsplash.com/photo-1579621970588-a3f5ce5a08def?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      category: "중개실무",
      title: "월급으로 1억 모으기! 2030 사회초년생을 위한, 실전형 투자 스터디",
      author: "공실뉴스 강사",
      rating: 0.0,
      reviews: 0,
      price: "40,000 P"
    }
  ];

  return (
    <div className="w-full bg-[#f8f9fa] min-h-screen pb-10" style={{ width: '100%', backgroundColor: '#f8f9fa', minHeight: '100vh', paddingBottom: '40px' }}>
      
      {/* 상단 타이틀 영역 */}
      <div className="px-4 py-5" style={{ padding: '20px 16px' }}>
        <h1 className="text-[20px] font-black text-[#1a2e50] flex items-center" style={{ fontSize: '20px', fontWeight: 900, color: '#1a2e50', display: 'flex', alignItems: 'center' }}>
          <span className="w-1.5 h-5 bg-[#1a2e50] mr-2 inline-block" style={{ width: '6px', height: '20px', backgroundColor: '#1a2e50', marginRight: '8px', display: 'inline-block' }}></span>
          부동산특강
        </h1>
        <p className="text-gray-500 text-[14px] mt-1" style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
          공실뉴스가 엄선한 최고의 실무 강의
        </p>
      </div>

      {/* 특강 리스트 (1열 세로형, 큼직하게) */}
      <div className="px-4 flex flex-col gap-6" style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {lectures.map((lecture) => (
          <div key={lecture.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 relative cursor-pointer" style={{ backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', border: '1px solid #f3f4f6', position: 'relative', cursor: 'pointer' }}>
            
            {/* 상단 썸네일 큼직하게 배치 */}
            <div className="w-full relative bg-gray-200" style={{ width: '100%', aspectRatio: '16/9', position: 'relative', backgroundColor: '#e5e7eb' }}>
              <img 
                src={lecture.image} 
                alt={lecture.title} 
                className="w-full h-full object-cover"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {/* 북마크 리본 아이콘 */}
              <div className="absolute top-0 right-4 w-[28px] h-[36px] bg-[#ff4d4f] flex justify-center pt-2 shadow-md" style={{ position: 'absolute', top: 0, right: '16px', width: '28px', height: '36px', backgroundColor: '#ff4d4f', display: 'flex', justifyContent: 'center', paddingTop: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ fill: 'white' }}>
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
            </div>

            {/* 하단 텍스트 정보 */}
            <div className="p-4" style={{ padding: '16px' }}>
              {/* 카테고리 */}
              <div className="text-[#3b82f6] text-[12px] font-bold mb-1" style={{ color: '#3b82f6', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                {lecture.category}
              </div>
              
              {/* 타이틀 */}
              <h2 className="text-[#111827] text-[18px] font-bold leading-tight mb-3 line-clamp-2 break-keep" style={{ color: '#111827', fontSize: '18px', fontWeight: 700, lineHeight: 1.3, marginBottom: '12px', wordBreak: 'keep-all', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {lecture.title}
              </h2>
              
              {/* 강사명 & 별점 */}
              <div className="flex items-center text-[13px] text-gray-600 mb-4" style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: '#4b5563', marginBottom: '16px' }}>
                <span style={{ marginRight: '8px' }}>{lecture.author}</span>
                <span className="flex items-center text-[#3b82f6]" style={{ display: 'flex', alignItems: 'center', color: '#3b82f6' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" className="mr-1" style={{ marginRight: '4px', fill: 'currentColor' }}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                  {lecture.rating.toFixed(1)} ({lecture.reviews})
                </span>
              </div>
              
              {/* 가격/포인트 버튼 */}
              <div className="inline-block bg-[#f8f9fa] border border-gray-200 rounded-lg px-4 py-2" style={{ display: 'inline-block', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 16px' }}>
                <span className="text-[#111827] font-bold text-[16px]" style={{ color: '#111827', fontWeight: 700, fontSize: '16px' }}>
                  {lecture.price}
                </span>
              </div>
            </div>
            
          </div>
        ))}
      </div>
    </div>
  );
}
