"use client";

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import dynamic from 'next/dynamic';

// 지연 로딩 (Lazy Loading) 처리된 오버레이 컴포넌트들
const HamburgerMenu = dynamic(() => import('./header/HamburgerMenu'), { ssr: false });
const SearchOverlay = dynamic(() => import('./header/SearchOverlay'), { ssr: false });

export default function MobileHeader() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 로그인 성공 후 돌아오면 자동으로 햄버거 메뉴 열기
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('login') === 'success') {
      const timer = setTimeout(() => {
        setIsMenuOpen(true);
        // URL에서 ?login=success 제거 (새로고침 시 다시 열리지 않도록)
        window.history.replaceState({}, '', '/m');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <>
      <header 
        className="fixed top-0 z-50 w-full max-w-md bg-white flex items-center justify-between px-4 h-[36px]"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: '36px', position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 50, backgroundColor: '#ffffff', width: '100%', maxWidth: '448px' }}
      >
        {/* 좌측 햄버거 메뉴 */}
        <button className="p-1" onClick={() => setIsMenuOpen(true)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        {/* 중앙 로고 */}
        <Link href="/m" className="flex items-center justify-center" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/logo_mobile.png" alt="공실뉴스" style={{ height: '28px', objectFit: 'contain', marginTop: '2px' }} />
        </Link>

        {/* 우측 검색 & 공실톡 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="p-1" onClick={() => setIsSearchOpen(true)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a2e50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
          <button 
            className="p-1 relative" 
            style={{ position: 'relative' }}
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("openGongsilTalkMain"));
              }
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a2e50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span className="absolute top-0 right-0 block w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', border: '2px solid #ffffff' }}></span>
          </button>
        </div>
      </header>

      {/* 조건부 렌더링으로 변경 - 지연 로딩 오버레이 렌더링 */}
      {isSearchOpen && <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}
      {isMenuOpen && <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />}
    </>
  );
}
