"use client";

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import dynamic from 'next/dynamic';

const HamburgerMenu = dynamic(() => import('./header/HamburgerMenu'), { ssr: false });
const SearchOverlay = dynamic(() => import('./header/SearchOverlay'), { ssr: false });

export default function HomeHeader() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 로그인 성공 후 돌아오면 자동으로 햄버거 메뉴 열기
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('login') === 'success') {
      const timer = setTimeout(() => {
        setIsMenuOpen(true);
        window.history.replaceState({}, '', '/m');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          height: '50px',
          position: 'fixed',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
          backgroundColor: '#102142',
          width: '100%',
          maxWidth: '448px',
        }}
      >
        {/* 좌측 로고 & 슬로건 */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', paddingTop: '2px' }}>
          <Link href="/m" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <span style={{ color: '#ffffff', fontSize: '22px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-1px', lineHeight: 1 }}>
              공실뉴스
            </span>
          </Link>
          <span style={{ display: 'inline-block', color: 'rgba(255,255,255,0.95)', fontSize: '13px', fontWeight: 600, letterSpacing: '-0.5px', animation: 'sloganFadeIn 1s ease-out forwards' }}>
            11만 부동산을 위한 <span style={{ color: '#fcd34d', fontWeight: 800 }}>무료 정보 채널</span>
          </span>
        </div>

        {/* 우측 아이콘 3개 (검색, 마이페이지, 햄버거) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* 검색 아이콘 */}
          <button style={{ padding: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }} onClick={() => setIsSearchOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>

          {/* 마이페이지 아이콘 */}
          <Link href="/m/mypage" style={{ padding: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </Link>

          {/* 햄버거 메뉴 아이콘 */}
          <button style={{ padding: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }} onClick={() => setIsMenuOpen(true)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </header>

      {isSearchOpen && <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}
      {isMenuOpen && <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />}

      <style>{`
        @keyframes sloganFadeIn {
          0% { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
