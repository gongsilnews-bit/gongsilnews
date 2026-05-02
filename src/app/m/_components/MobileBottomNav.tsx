"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profileImg, setProfileImg] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminPendingCount, setAdminPendingCount] = useState(0);

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

  const navItems = [
    { 
      name: "홈", path: "/m", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
    },
    { 
      name: "우리동네", path: "/m/news?tab=local", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
    },
    { 
      name: "공실", path: "/m/gongsil", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
    },
    { 
      name: "특강", path: "/m/study", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
    },
    { 
      name: "마이", path: "/m/mypage", 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
    },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 w-full z-50 bg-white border-t border-gray-200 pb-safe"
      style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', zIndex: 50, backgroundColor: '#ffffff', borderTop: '1px solid #e5e7eb' }}
    >
      <div 
        className="max-w-md mx-auto flex justify-between items-center h-[60px] px-2"
        style={{ maxWidth: '448px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px', padding: '0 8px' }}
      >
        {navItems.map((item) => {
          const isActive = pathname === item.path || 
            (item.path !== "/m" && pathname.startsWith(item.path.split('?')[0]));

          return item.name === "마이" ? (
            <button
              key={item.name}
              onClick={() => window.dispatchEvent(new Event('open-drawer'))}
              className="flex flex-col items-center justify-center w-full h-full cursor-pointer"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', position: 'relative', background: 'none', border: 'none', padding: 0 }}
            >
              <span className={`text-xl mb-1 ${isActive ? "opacity-100 scale-110" : "opacity-50 grayscale"} transition-all duration-200`} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {profileImg ? (
                  <div style={{ width: 24, height: 24, borderRadius: '50%', overflow: 'hidden', border: isActive ? '2px solid #1a2e50' : '1px solid #ccc' }}>
                    <img src={profileImg} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  item.icon
                )}
                
                {/* Unread Message Badge */}
                {unreadCount > 0 && (
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
              <span className={`text-[10px] font-bold ${isActive ? "text-[#1a2e50]" : "text-gray-400"}`}>
                {item.name}
              </span>
            </button>
          ) : (
            <Link
              key={item.name}
              href={item.path}
              className="flex flex-col items-center justify-center w-full h-full"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', position: 'relative' }}
            >
              <span className={`text-xl mb-1 ${isActive ? "opacity-100 scale-110" : "opacity-50 grayscale"} transition-all duration-200`} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.icon}
              </span>
              <span className={`text-[10px] font-bold ${isActive ? "text-[#1a2e50]" : "text-gray-400"}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
