"use client";

import React from 'react';
import Link from 'next/link';

interface SubPageHeaderProps {
  title?: string;
}

export default function SubPageHeader({ title }: SubPageHeaderProps) {

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
        {/* ì¢Œì¸¡ ë¡œê³  ???ˆìœ¼ë¡??´ë™ */}
        <Link href="/m" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/logo.png" alt="ê³µì‹¤?´ìŠ¤" style={{ height: '26px', objectFit: 'contain' }} />
        </Link>

        {/* ì¤‘ì•™ ?€?´í? (? íƒ?? */}
        {title && (
          <span style={{ 
            fontSize: '16px', fontWeight: 700, color: '#111827', 
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            maxWidth: '55%', textAlign: 'center'
          }}>
            {title}
          </span>
        )}

        {/* ?°ì¸¡ ?„ë²„ê±?ë©”ë‰´ (ë©”ë‰´ ?˜ì´ì§€ ?´ë™) */}
        <a href="/m/menu" style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', textDecoration: 'none' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </a>
      </header>
    </>
  );
}
