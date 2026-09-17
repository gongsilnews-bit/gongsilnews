"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from "next/link";
import dynamic from 'next/dynamic';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useNotificationsRealtime } from '@/hooks/useNotificationsRealtime';

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
  logoText = '공실뉴스',
  sloganPrefix = '11만 부동산을 위한',
  sloganHighlight = '무료 정보 채널',
  highlightColor = '#fcd34d',
  homeUrl = '/m'
}: HomeHeaderProps = {}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [unreadNoti, setUnreadNoti] = useState(0);
  const [notiUser, setNotiUser] = useState<{ id: string; isAdmin: boolean } | null>(null);

  // 안 읽은 알림 수 (헤더에는 숫자만 보여주고, 목록은 /m/notifications 에서 본다)
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("members").select("role").eq("id", user.id).single();
      const role = (data?.role || "").toUpperCase();
      setNotiUser({ id: user.id, isAdmin: role === "ADMIN" || (data?.role || "").includes("관리자") });
    });
  }, []);

  const loadUnread = useCallback(async () => {
    if (!notiUser) return;
    const { getNotifications } = await import("@/app/actions/notification");
    const res = await getNotifications({ userId: notiUser.id, isAdmin: notiUser.isAdmin, limit: 1 });
    if (res.success) setUnreadNoti(res.unread);
  }, [notiUser]);

  useEffect(() => { void loadUnread(); }, [loadUnread]);

  useNotificationsRealtime(notiUser?.id ?? null, loadUnread);
  const router = useRouter();
  const pathname = usePathname();

  // 로그인 성공 시 돌아오면 자동으로 메뉴 열기
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
        {/* 좌측 로고 & 슬로건 */}
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

        {/* 우측 아이콘 2개 (검색, 햄버거) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* 알림 종 (목록은 전용 페이지에서 — 헤더가 좁아 팝업 대신 이동) */}
          {unreadNoti > 0 && (
            <button
              onClick={() => router.push('/m/notifications')}
              aria-label={`알림 ${unreadNoti}건`}
              style={{ padding: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', position: 'relative' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span style={{
                position: 'absolute', top: -5, right: -6, minWidth: 16, height: 16, padding: '0 4px',
                borderRadius: 8, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
              }}>
                {unreadNoti > 99 ? '99+' : unreadNoti}
              </span>
            </button>
          )}

          {/* 검색 아이콘 */}
          <button style={{ padding: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }} onClick={() => setIsSearchOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>

          {/* 햄버거 메뉴 아이콘 (메뉴 페이지 이동) */}
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
