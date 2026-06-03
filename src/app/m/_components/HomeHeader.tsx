"use client";

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import dynamic from 'next/dynamic';
import { useRouter, usePathname } from 'next/navigation';

const SearchOverlay = dynamic(() => import('./header/SearchOverlay'), { ssr: false });

interface HomeHeaderProps {
  bgColor?: string;
  logoText?: string;
  sloganPrefix?: string;
  sloganHighlight?: string;
  highlightColor?: string;
  homeUrl?: string;
}

export default function HomeHeader({
  bgColor = '#102142',
  logoText = 'Í≥µÏã§?¥Ïä§',
  sloganPrefix = '11Îß?Î∂Ä?ôÏÇ∞???ÑÌïú',
  sloganHighlight = 'Î¨¥Î£å ?ïÎ≥¥ Ï±ÑÎÑê',
  highlightColor = '#fcd34d',
  homeUrl = '/m'
}: HomeHeaderProps = {}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Î°úÍ∑∏???±Í≥µ ???åÏïÑ?§Î©¥ ?êÎèô?ºÎ°ú Î©îÎâ¥ ?¥Í∏∞
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('login') === 'success') {
      const timer = setTimeout(() => {
        router.push('/m/menu');
        window.history.replaceState({}, '', '/m');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [router]);

  const handleLogoClick = (e: React.MouseEvent) => {
    const targetPath = homeUrl.split('?')[0];
    if (pathname === targetPath || pathname + '/' === targetPath || pathname === targetPath + '/') {
      e.preventDefault();
      window.location.href = homeUrl;
    }
  };

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
          backgroundColor: bgColor,
          width: '100%',
          maxWidth: '448px',
        }}
      >
        {/* Ï¢åÏ∏° Î°úÍ≥† & ?¨Î°úÍ±?*/}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', paddingTop: '2px' }}>
          <Link href={homeUrl} onClick={handleLogoClick} style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <span style={{ color: '#ffffff', fontSize: '22px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-1px', lineHeight: 1 }}>
              {logoText}
            </span>
          </Link>
          <span style={{ display: 'inline-block', color: 'rgba(255,255,255,0.95)', fontSize: '13px', fontWeight: 600, letterSpacing: '-0.5px', animation: 'sloganFadeIn 1s ease-out forwards' }}>
            {sloganPrefix} <span style={{ color: highlightColor, fontWeight: 800 }}>{sloganHighlight}</span>
          </span>
        </div>

        {/* ?∞Ï∏° ?ÑÏù¥ÏΩ?2Í∞?(Í≤Ä?? ?ÑÎ≤ÑÍ±? */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Í≤Ä???ÑÏù¥ÏΩ?*/}
          <button style={{ padding: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }} onClick={() => setIsSearchOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>

          {/* ?ÑÎ≤ÑÍ±?Î©îÎâ¥ ?ÑÏù¥ÏΩ?(Î©îÎâ¥ ?òÏù¥ÏßÄ ?¥Îèô) */}
          <button onClick={() => router.push('/m/menu')} style={{ padding: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </header>

      {isSearchOpen && <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}

      <style>{`
        @keyframes sloganFadeIn {
          0% { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
