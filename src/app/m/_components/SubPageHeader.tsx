"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const HamburgerMenu = dynamic(() => import('./header/HamburgerMenu'), { ssr: false });

interface SubPageHeaderProps {
  title?: string;
}

export default function SubPageHeader({ title }: SubPageHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          height: '36px',
          position: 'fixed',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
          backgroundColor: '#ffffff',
          width: '100%',
          maxWidth: '448px',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        {/* 좌측 로고 — 홈으로 이동 */}
        <Link href="/m" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/logo.png" alt="공실뉴스" style={{ height: '26px', objectFit: 'contain' }} />
        </Link>

        {/* 중앙 타이틀 (선택적) */}
        {title && (
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            {title}
          </span>
        )}

        {/* 우측 햄버거 메뉴 */}
        <button
          style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => setIsMenuOpen(true)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </header>

      {isMenuOpen && <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />}
    </>
  );
}
