"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

function MobileBottomNavContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profileImg, setProfileImg] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminPendingCount, setAdminPendingCount] = useState(0);

  // 스크롤 반응형 하단바 상태
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = React.useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // 스크롤을 내릴 때 (현재 스크롤이 이전보다 크고, 상단에서 50px 이상 내려왔을 때)
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsVisible(false);
      }
      // 스크롤을 올릴 때
      else if (currentScrollY < lastScrollY.current) {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const fetchUserData = async (userId: string, userMetaImg: string | undefined) => {
      // Get profile image and role
      const { data } = await supabase.from('members').select('avatar_url, role').eq('id', userId).single();
      setProfileImg(data?.avatar_url || userMetaImg || null);

      // Fetch admin pending count if role is ADMIN
      if (data?.role) {
        const r = data.role.trim().toUpperCase();
        if (r === 'ADMIN' || r === '최고관리자' || r.includes('관리자')) {
          try {
            const [
              { count: vCount },
              { count: aCount },
              { count: mCount }
            ] = await Promise.all([
              supabase.from('vacancies').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
              supabase.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
              supabase.from('agencies').select('*', { count: 'exact', head: true }).eq('status', 'PENDING')
            ]);
            setAdminPendingCount((vCount || 0) + (aCount || 0) + (mCount || 0));
          } catch (e) {
            console.error("Failed to fetch pending counts", e);
          }
        }
      }

      // Get unread messages
      try {
        const { getMyRooms } = await import('@/app/actions/talkActions');
        const res = await getMyRooms(userId);
        if (res.success && res.data) {
          const count = res.data.reduce((sum: number, r: any) => sum + (r.unread_count || 0), 0);
          setUnreadCount(count);
        }
      } catch (e) {
        console.error("Failed to fetch unread messages", e);
      }
    };

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser(user);
        fetchUserData(user.id, user.user_metadata?.avatar_url);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        fetchUserData(session.user.id, session.user.user_metadata?.avatar_url);
      } else {
        setCurrentUser(null);
        setProfileImg(null);
        setUnreadCount(0);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 공실등록/수정 페이지에서는 전역 탭바 숨김 (폼 전용 BottomNav 사용)
  if (pathname.startsWith('/m/admin/vacancy/write')) return null;

  const navItems = [
    {
      name: "홈", path: "/m",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
      iconFilled: <svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 2.5L2 10.5V22h20V10.5L12 2.5z" fill="currentColor"/><rect x="9" y="13" width="6" height="9" rx="1" fill="white"/></svg>,
    },
    {
      name: "우리동네", path: "/m/news_map",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>,
      iconFilled: <svg width="24" height="24" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" fill="currentColor"/><circle cx="12" cy="10" r="3" fill="white"/></svg>,
    },
    {
      name: "공실", path: "/m/gongsil",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
          <path d="M9 22v-4h6v4" />
          <line x1="8" y1="6" x2="10" y2="6" />
          <line x1="14" y1="6" x2="16" y2="6" />
          <line x1="8" y1="10" x2="10" y2="10" />
          <line x1="14" y1="10" x2="16" y2="10" />
          <line x1="8" y1="14" x2="10" y2="14" />
          <line x1="14" y1="14" x2="16" y2="14" />
        </svg>
      ),
      iconFilled: (
        <svg width="24" height="24" viewBox="0 0 24 24">
          <rect x="4" y="2" width="16" height="20" rx="2" fill="currentColor" />
          <path d="M9 22v-4h6v4z" fill="white" />
          <rect x="8" y="5" width="2" height="2" rx="0.5" fill="white" />
          <rect x="14" y="5" width="2" height="2" rx="0.5" fill="white" />
          <rect x="8" y="9" width="2" height="2" rx="0.5" fill="white" />
          <rect x="14" y="9" width="2" height="2" rx="0.5" fill="white" />
          <rect x="8" y="13" width="2" height="2" rx="0.5" fill="white" />
          <rect x="14" y="13" width="2" height="2" rx="0.5" fill="white" />
        </svg>
      ),
    },
    {
      name: "부동산특강", path: "/m/study",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>,
      iconFilled: <svg width="24" height="24" viewBox="0 0 24 24"><path d="M2 10l10-5 10 5-10 5z" fill="currentColor"/><path d="M6 12v5c3 3 9 3 12 0v-5L12 15 6 12z" fill="currentColor" opacity=".6"/><rect x="21" y="10" width="2" height="6" rx="1" fill="currentColor"/></svg>,
    },
    {
      name: "마이", path: "/m/mypage",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
      iconFilled: <svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="7" r="4" fill="currentColor"/><path d="M4 21v-2a4 4 0 014-4h8a4 4 0 014 4v2H4z" fill="currentColor"/></svg>,
    },
  ];

  return (
    <nav
      className={`fixed bottom-0 left-0 w-full z-50 bg-white border-t border-gray-200 pb-safe transition-transform duration-300 ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
      style={{
        position: 'fixed', bottom: 0, left: 0, width: '100%', zIndex: 50,
        backgroundColor: '#ffffff', borderTop: '1px solid #e5e7eb',
        transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div
        className="max-w-md mx-auto flex justify-between items-center h-[60px] px-2"
        style={{ maxWidth: '448px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px', padding: '0 8px' }}
      >
        {navItems.map((item) => {
          const isActive = (() => {
            if (item.name === "홈") {
              if (pathname === "/m") return true;
              if (pathname.startsWith("/m/news") && !pathname.startsWith("/m/news_map")) return true;
              return false;
            }
            if (item.name === "우리동네") {
              if (pathname.startsWith("/m/news_map")) return true;
              return false;
            }
            return pathname === item.path ||
              (item.path !== "/m" && pathname.startsWith(item.path.split('?')[0]));
          })();

          return item.name === "마이" ? (
            <button
              key={item.name}
              onClick={() => window.dispatchEvent(new Event('open-drawer'))}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', position: 'relative', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: isActive ? '#ea580c' : '#333' }}
            >
              <span style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2px' }}>
                {profileImg ? (
                  <div style={{ width: 24, height: 24, borderRadius: '50%', overflow: 'hidden', border: isActive ? '2px solid #ea580c' : '1px solid #ccc' }}>
                    <img src={profileImg} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  isActive ? item.iconFilled : item.icon
                )}

                {/* Unread Message Badge */}
                {unreadCount > 0 ? (
                  <span style={{
                    position: 'absolute',
                    top: -4,
                    right: -6,
                    backgroundColor: '#ef4444',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #fff',
                    zIndex: 10
                  }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                ) : (
                  <span style={{
                    position: 'absolute',
                    top: -2,
                    right: -6,
                    backgroundColor: '#f97316',
                    color: 'white',
                    fontSize: '9px',
                    fontWeight: '900',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #fff',
                    zIndex: 10,
                    boxShadow: '0 2px 4px rgba(249, 115, 22, 0.3)'
                  }}>
                    N
                  </span>
                )}
                {/* Admin Pending Count Badge */}
                {adminPendingCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -4,
                    left: -6,
                    backgroundColor: '#f97316',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    padding: '2px 5px',
                    minWidth: '16px',
                    height: '16px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #fff',
                    lineHeight: 1,
                    zIndex: 10
                  }}>
                    {adminPendingCount > 99 ? '99+' : adminPendingCount}
                  </span>
                )}
              </span>
              <span style={{ fontSize: '10px', fontWeight: isActive ? 700 : 500, color: isActive ? '#ea580c' : '#333' }}>
                {item.name}
              </span>
            </button>
          ) : (
            <Link
              key={item.name}
              href={item.path}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', position: 'relative', textDecoration: 'none', color: isActive ? '#ea580c' : '#333' }}
            >
              <span style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2px' }}>
                {isActive ? item.iconFilled : item.icon}
              </span>
              <span style={{ fontSize: '10px', fontWeight: isActive ? 700 : 500, color: isActive ? '#ea580c' : '#333' }}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function MobileBottomNav() {
  return (
    <Suspense fallback={
      <nav
        className="fixed bottom-0 left-0 w-full z-50 bg-white border-t border-gray-200 pb-safe"
        style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', zIndex: 50, backgroundColor: '#ffffff', borderTop: '1px solid #e5e7eb', height: '60px' }}
      />
    }>
      <MobileBottomNavContent />
    </Suspense>
  );
}
