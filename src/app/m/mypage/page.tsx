"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function MobileMyPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div 
      className={`w-full min-h-screen bg-gray-50 pb-10 overflow-x-hidden ${mounted ? 'animate-slide-in-right' : 'opacity-0 translate-x-full'}`}
      style={{ width: '100%', minHeight: '100vh', backgroundColor: '#f9fafb', paddingBottom: '40px', overflowX: 'hidden' }}
    >
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
      `}</style>

      {/* 1. 프로필 및 포인트 영역 */}
      <div className="bg-white p-6 border-b border-gray-100" style={{ backgroundColor: '#ffffff', padding: '24px', borderBottom: '1px solid #f3f4f6' }}>
        <div className="flex items-center mb-6" style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
          <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden mr-4" style={{ width: '64px', height: '64px', backgroundColor: '#e5e7eb', borderRadius: '50%', overflow: 'hidden', marginRight: '16px' }}>
            <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80" alt="Profile" className="w-full h-full object-cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <h2 className="text-[20px] font-bold text-gray-900" style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>홍길동 대표님</h2>
            <p className="text-[13px] text-gray-500 mt-1" style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>hong@gongsil.com</p>
          </div>
        </div>

        {/* 내 포인트 박스 */}
        <div className="bg-[#1a2e50] rounded-xl p-4 flex justify-between items-center shadow-lg" style={{ backgroundColor: '#1a2e50', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}>
          <div className="flex items-center" style={{ display: 'flex', alignItems: 'center' }}>
            <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center mr-3 text-[#1a2e50] font-bold text-[14px]" style={{ width: '32px', height: '32px', backgroundColor: '#facc15', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', color: '#1a2e50', fontWeight: 700, fontSize: '14px' }}>
              P
            </div>
            <span className="text-white font-medium text-[15px]" style={{ color: '#ffffff', fontWeight: 500, fontSize: '15px' }}>내 포인트</span>
          </div>
          <div className="text-white font-bold text-[22px]" style={{ color: '#ffffff', fontWeight: 700, fontSize: '22px' }}>
            21,000 <span className="text-[14px] text-yellow-400" style={{ fontSize: '14px', color: '#facc15' }}>P</span>
          </div>
        </div>
      </div>

      {/* 2. 나의 활동 메뉴 */}
      <div className="mt-2 bg-white" style={{ marginTop: '8px', backgroundColor: '#ffffff' }}>
        <h3 className="px-5 pt-5 pb-2 text-[14px] font-bold text-gray-500" style={{ padding: '20px 20px 8px 20px', fontSize: '14px', fontWeight: 700, color: '#6b7280' }}>나의 활동</h3>
        <ul>
          {/* 내가 등록한 기사 */}
          <li>
            <button className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-50 active:bg-gray-50" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f9fafb', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
              <div className="flex items-center" style={{ display: 'flex', alignItems: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '12px' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <span className="text-[16px] text-gray-800 font-medium" style={{ fontSize: '16px', color: '#1f2937', fontWeight: 500 }}>내가 등록한 기사</span>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </li>
          
          {/* 내가 찜한 기사 */}
          <li>
            <button className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-50 active:bg-gray-50" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f9fafb', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
              <div className="flex items-center" style={{ display: 'flex', alignItems: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '12px' }}>
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
                <span className="text-[16px] text-gray-800 font-medium" style={{ fontSize: '16px', color: '#1f2937', fontWeight: 500 }}>내가 찜한 기사</span>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </li>

          {/* 내가 등록한 공실 */}
          <li>
            <button className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-50 active:bg-gray-50" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f9fafb', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
              <div className="flex items-center" style={{ display: 'flex', alignItems: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '12px' }}>
                  <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                  <path d="M9 22v-4h6v4"></path>
                  <path d="M8 6h.01"></path>
                  <path d="M16 6h.01"></path>
                  <path d="M12 6h.01"></path>
                  <path d="M12 10h.01"></path>
                  <path d="M12 14h.01"></path>
                  <path d="M16 10h.01"></path>
                  <path d="M16 14h.01"></path>
                  <path d="M8 10h.01"></path>
                  <path d="M8 14h.01"></path>
                </svg>
                <span className="text-[16px] text-gray-800 font-medium" style={{ fontSize: '16px', color: '#1f2937', fontWeight: 500 }}>내가 등록한 공실</span>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </li>

          {/* 내가 찜한 공실 */}
          <li>
            <button className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-50 active:bg-gray-50" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f9fafb', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
              <div className="flex items-center" style={{ display: 'flex', alignItems: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '12px' }}>
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                <span className="text-[16px] text-gray-800 font-medium" style={{ fontSize: '16px', color: '#1f2937', fontWeight: 500 }}>내가 찜한 공실</span>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </li>
        </ul>
      </div>

      {/* 3. 기타 메뉴 */}
      <div className="mt-2 bg-white mb-8" style={{ marginTop: '8px', backgroundColor: '#ffffff', marginBottom: '32px' }}>
        <ul>
          <li>
            <button className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-50 text-gray-700" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f9fafb', color: '#374151', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
              <span className="text-[15px]" style={{ fontSize: '15px' }}>공지사항 / 이벤트</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </li>
          <li>
            <button className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-50 text-gray-700" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f9fafb', color: '#374151', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
              <span className="text-[15px]" style={{ fontSize: '15px' }}>고객센터</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </li>
          <li>
            <button className="w-full flex items-center px-5 py-4 text-red-500 font-medium" style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '16px 20px', color: '#ef4444', fontWeight: 500, backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
              <span className="text-[15px]" style={{ fontSize: '15px' }}>로그아웃</span>
            </button>
          </li>
        </ul>
      </div>

    </div>
  );
}
