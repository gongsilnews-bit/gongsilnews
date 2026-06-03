"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { getUserActivityCounts } from '@/app/actions/userActivity';

export default function MenuPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [memberData, setMemberData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pendingCounts, setPendingCounts] = useState({ vacancies: 0, articles: 0, members: 0 });
  const [userActivityCounts, setUserActivityCounts] = useState({
    myArticles: 0, myVacancies: 0, bookmarkedArticles: 0,
    bookmarkedVacancies: 0, subscribedReporters: 0, myLectures: 0
  });
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          const { data } = await supabase
            .from('members')
            .select('name, email, role, profile_image_url, plan_type, signup_completed')
            .eq('id', user.id)
            .single();
          const { data: agencyData } = await supabase
            .from('agencies')
            .select('status')
            .eq('owner_id', user.id)
            .single();
          if (data) {
            setMemberData({ ...data, agencyStatus: agencyData?.status || null });
            const r = data.role?.trim().toUpperCase() || '';
            const isAdmin = r === 'ADMIN' || r === 'ìµœê³ ê´€ë¦¬ì' || r.includes('ê´€ë¦¬ì');
            const activityRes = await getUserActivityCounts(user.id);
            if (activityRes.success) setUserActivityCounts(activityRes.counts);
            if (isAdmin) {
              const [{ count: vCount }, { count: aCount }, { count: mCount }] = await Promise.all([
                supabase.from('vacancies').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
                supabase.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
                supabase.from('agencies').select('*', { count: 'exact', head: true }).eq('status', 'PENDING')
              ]);
              setPendingCounts({ vacancies: vCount || 0, articles: aCount || 0, members: mCount || 0 });
            }
          }
        } else {
          setCurrentUser(null);
          setMemberData(null);
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleOAuthLogin = async (providerName: 'google' | 'kakao') => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: providerName as any,
        options: { redirectTo: `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent('/m/menu')}` },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      alert('ë¡œê·¸???¤ë¥˜: ' + (err?.message || String(err)));
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/m';
  };

  const getRoleLabel = (role?: string, agencyStatus?: string) => {
    const r = role?.trim().toUpperCase() || '';
    if (r === 'ADMIN' || r === 'ìµœê³ ê´€ë¦¬ì' || r.includes('ê´€ë¦¬ì')) return 'ìµœê³ ê´€ë¦¬ì';
    if (r === 'REALTOR' || r === 'ë¶€?™ì‚°?Œì›' || r === 'ë¶€?™ì‚°' || r.includes('REALTOR')) {
      if (agencyStatus === 'PENDING') return '?¹ì¸?€ê¸?;
      if (agencyStatus === 'REJECTED') return '?œë¥˜ë³´ì™„';
      return 'ë¶€?™ì‚°';
    }
    return '?¼ë°˜';
  };

  const getRoleBadgeStyle = (role?: string, agencyStatus?: string): React.CSSProperties => {
    const r = role?.trim().toUpperCase() || '';
    if (r === 'ADMIN' || r === 'ìµœê³ ê´€ë¦¬ì' || r.includes('ê´€ë¦¬ì')) return { background: '#111827', color: '#fff' };
    if (r === 'REALTOR' || r === 'ë¶€?™ì‚°?Œì›' || r === 'ë¶€?™ì‚°' || r.includes('REALTOR')) {
      if (agencyStatus === 'PENDING') return { background: '#fbbf24', color: '#78350f' };
      if (agencyStatus === 'REJECTED') return { background: '#ef4444', color: '#fff' };
      return { background: '#2563eb', color: '#fff' };
    }
    return { background: '#e5e7eb', color: '#374151' };
  };

  const getAdminMenus = (role?: string) => {
    const r = role?.trim().toUpperCase() || '';
    const isAdmin = r === 'ADMIN' || r === 'ìµœê³ ê´€ë¦¬ì' || r.includes('ê´€ë¦¬ì');
    const isRealtor = r === 'REALTOR' || r === 'ë¶€?™ì‚°?Œì›' || r === 'ë¶€?™ì‚°' || r.includes('REALTOR');
    const dashboard = { icon: '?“Š', label: '?€?œë³´??, href: '/m/admin/dashboard' };
    const vacancy = { icon: '?¢', label: 'ê³µì‹¤ê´€ë¦?, href: '/m/admin/vacancy', badgeCount: isAdmin ? pendingCounts.vacancies : 0 };
    const article = { icon: '?“', label: 'ê¸°ì‚¬ê´€ë¦?, href: '/m/admin/article', badgeCount: isAdmin ? pendingCounts.articles : 0 };
    const point = {
      icon: (<div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff', fontSize: '16px', fontWeight: 900, boxShadow: '0 2px 6px rgba(245, 158, 11, 0.4)', fontFamily: 'system-ui, sans-serif' }}>G</div>),
      label: '?¬ì¸??, href: '/m/admin/point'
    };
    const member = { icon: '?‘¥', label: '?Œì›ê´€ë¦?, href: '/m/admin/member', badgeCount: isAdmin ? pendingCounts.members : 0 };
    const realtor: any[] = [
      { icon: '?‘¥', label: 'ê³ ê°/ë¬¸ì˜', href: '/m/admin/customer' },
      { icon: '?™ï¸', label: '?•ë³´?¤ì •', href: '/m/admin/settings' },
    ];
    const admin: any[] = [
      { icon: '?–¼ï¸?, label: 'ë°°ë„ˆê´€ë¦?, href: '/m/admin/banner' },
      { icon: '?“‹', label: 'ê²Œì‹œ?ê?ë¦?, href: '/m/admin/board' },
      { icon: '?‰ï¸', label: 'ë¬¸ì˜ê´€ë¦?, href: '/m/admin/inquiry' },
      { icon: '?™ï¸', label: '?¤ì •', href: '/m/admin/settings' },
    ];
    const user: any[] = [{ icon: '?™ï¸', label: '?•ë³´?¤ì •', href: '/m/admin/settings' }];
    if (isAdmin) return [dashboard, member, vacancy, article, point, ...admin];
    if (isRealtor) return [dashboard, vacancy, article, point, ...realtor];
    return [dashboard, vacancy, article, point, ...user];
  };

  const menus = getAdminMenus(memberData?.role);

  const activityItems = [
    { icon: '?“„', label: '?´ê? ?±ë¡??ê¸°ì‚¬', href: '/m/admin/article', count: userActivityCounts.myArticles },
    { icon: '?¢', label: '?´ê? ?±ë¡??ê³µì‹¤', href: '/m/admin/vacancy', count: userActivityCounts.myVacancies },
    { icon: '?”–', label: '?´ê? ì°œí•œ ê¸°ì‚¬', href: '/m/news_bookmarks', count: userActivityCounts.bookmarkedArticles },
    { icon: '?¤ï¸', label: '?´ê? ì°œí•œ ê³µì‹¤', href: '/m/gongsil_bookmarks', count: userActivityCounts.bookmarkedVacancies },
    { icon: '?‘¥', label: '?´ê? êµ¬ë…??ê¸°ì', href: '/m/subscribed_reporters', count: userActivityCounts.subscribedReporters },
    { icon: '?“š', label: '???˜ê°•?¹ê°•', href: '/m/my_lectures', count: userActivityCounts.myLectures },
  ];

  const newsMenus = [
    { name: "ê³µì‹¤?´ìŠ¤", path: "/m/news_gongsil" },
    { name: "ë¶€?™ì‚°Â·ê²½ì œ", path: "/m/news_politics" },
    { name: "AIë§ˆì???, path: "/m/news_marketing" },
    { name: "?¼ì´?„Â·ì˜¤?¼ë‹ˆ??, path: "/m/news_etc" }
  ];

  const serviceMenus = [
    { name: "ê³µì‹¤?´ëŒ", path: "/m/gongsil" },
    { name: "ë¶€?™ì‚°?¹ê°•", path: "/m/study" },
    { name: "?œë¡ ?ìƒ", path: "/m/board?id=drone" },
    { name: "APP(??", path: "/m/board?id=app" },
    { name: "AI ?„ë¡¬?„íŠ¸", path: "/m/board?id=prompt" },
    { name: "?Œì›", path: "/m/board?id=sound" },
    { name: "ê³„ì•½???‘ì‹", path: "/m/board?id=doc" }
  ];

  const communityMenus = [
    { name: "?ìœ ê²Œì‹œ??, path: "/m/board?id=free" },
    { name: "Q&Aê²Œì‹œ??, path: "/m/board?id=qna" },
    { name: "ê³µì??¬í•­", path: "/m/board?id=notice" },
    { name: "1:1 ë¬¸ì˜", path: "/m/board?id=inquiry" }
  ];

  const chevron = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f5f7' }}>
      {/* ?¤ë” */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', backgroundColor: '#fff', borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, zIndex: 10 }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#111' }}>ë©”ë‰´</h2>
      </div>

      {loading ? (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '3px solid #e5e7eb', borderTopColor: '#1e56a0', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>ë¡œë”© ì¤?..</p>
        </div>
      ) : (
        <>
          {/* 1. ?„ë¡œ??/ ë¡œê·¸??*/}
          {!currentUser ? (
            <div style={{ padding: '30px 20px 20px', backgroundColor: '#fff', borderBottom: '8px solid #f4f5f7' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', border: '1px solid #eee', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 2px 6px rgba(0,0,0,0.06)', overflow: 'hidden', margin: '0 auto 16px' }}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="24" fill="#222"/><circle cx="24" cy="24" r="16" fill="#FFF"/><path d="M19 15.34L34 24L19 32.66Z" fill="#F59E0B" stroke="#222" strokeWidth="3" strokeLinejoin="round"/></svg>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#111', margin: '0 0 6px 0' }}>
                  <span style={{ color: '#1e56a0' }}>11ë§?/span> ë¶€?™ì‚° ë¬´ë£Œ ?•ë³´ì±„ë„
                </h3>
                <p style={{ fontSize: 13, color: '#888', lineHeight: 1.5, margin: '0 0 20px 0' }}>
                  ????ë²ˆì˜ ê°€?…ìœ¼ë¡?ì¤‘ê°œ ?¤ë¬´??ê¼??„ìš”??br/>?¹ë³„???œíƒ?¤ì„ ëª¨ë‘ ë¬´ë£Œë¡??„ë ¤ë³´ì„¸??
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button onClick={() => handleOAuthLogin('google')} style={{ width: '100%', padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '14px', fontWeight: 700, color: '#222', background: '#fff', border: '2px solid #4285F4', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', position: 'relative' }}>
                  <span style={{ position: 'absolute', top: -9, right: 14, background: '#4285F4', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10 }}>ì¶”ì²œ</span>
                  Google ê³„ì •?¼ë¡œ ?œì‘
                </button>
                <button onClick={() => handleOAuthLogin('kakao')} style={{ width: '100%', padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '14px', fontWeight: 700, color: '#000', background: '#FEE500', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  ì¹´ì¹´??ê³„ì •?¼ë¡œ 3ì´ˆë§Œ???œì‘
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '20px 20px 10px', backgroundColor: '#fff' }}>
              <div style={{ background: 'linear-gradient(135deg, #1a3a6b 0%, #1e56a0 100%)', padding: '20px', borderRadius: '12px', color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(255,255,255,0.3)' }}>
                    {memberData?.profile_image_url || currentUser?.user_metadata?.avatar_url ? (
                      <img src={memberData?.profile_image_url || currentUser?.user_metadata?.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.2)', fontSize: '22px', fontWeight: 700 }}>
                        {(memberData?.name || currentUser?.user_metadata?.full_name || '??)[0]}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 800 }}>{memberData?.name || currentUser?.user_metadata?.full_name || '?Œì›'}??/span>
                      <span style={{ ...getRoleBadgeStyle(memberData?.role || 'USER', memberData?.agencyStatus), fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>
                        {getRoleLabel(memberData?.role || 'USER', memberData?.agencyStatus)}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', opacity: 0.8, margin: 0 }}>{memberData?.email || currentUser?.email}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ë¶€?™ì‚°?Œì› ?„í™˜ ? ë„ */}
          {currentUser && memberData && (memberData.role === 'USER' || (!memberData.role)) && (() => {
            const dismissed = typeof window !== 'undefined' && localStorage.getItem(`realtor_banner_dismissed_${currentUser.id}`);
            if (dismissed) return null;
            return (
              <div style={{ padding: '0 20px 10px', background: '#fff', position: 'relative' }}>
                <Link href="/m/admin/settings?tab=agency" style={{ display: 'block', textDecoration: 'none', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', borderRadius: '12px', padding: '16px 20px', border: '1px solid #fbbf24' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '28px' }}>?¡</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#92400e', marginBottom: '2px' }}>ë¶€?™ì‚° ì¤‘ê°œ?¬ì´? ê???</div>
                      <div style={{ fontSize: '12px', color: '#a16207', lineHeight: 1.4 }}>ë¶€?™ì‚°?Œì› ?„í™˜ ??ê³µì‹¤ê´‘ê³  ë¬´ë£Œ ?±ë¡!</div>
                    </div>
                    {chevron}
                  </div>
                </Link>
                <button onClick={(e) => { e.stopPropagation(); localStorage.setItem(`realtor_banner_dismissed_${currentUser.id}`, 'true'); (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
                  style={{ position: 'absolute', top: 2, right: 24, width: 22, height: 22, borderRadius: '50%', background: 'rgba(146,64,14,0.15)', border: 'none', color: '#92400e', fontSize: 14, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>Ã—</button>
              </div>
            );
          })()}

          {/* 2. ê´€ë¦?ë©”ë‰´ ê·¸ë¦¬??*/}
          {currentUser && (
            <div style={{ padding: '16px', background: '#fff', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#6b7280', marginBottom: '12px', padding: '0 4px' }}>ê´€ë¦?ë©”ë‰´</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {menus.map((item: any) => (
                  <Link key={item.label} href={item.href} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '14px 4px 10px', background: '#f8f9fb', borderRadius: '12px', textDecoration: 'none' }}>
                    <span style={{ fontSize: '24px', marginBottom: '6px', position: 'relative' }}>
                      {item.icon}
                      {item.badgeCount ? (<span style={{ position: 'absolute', top: -6, right: -12, background: '#f97316', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 5px', borderRadius: 10, lineHeight: 1 }}>{item.badgeCount > 99 ? '99+' : item.badgeCount}</span>) : null}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#374151', textAlign: 'center', lineHeight: 1.3 }}>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 3. ?˜ì˜ ?œë™ */}
          <div style={{ background: '#fff', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#6b7280', padding: '16px 20px 8px' }}>?˜ì˜ ?œë™</h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {activityItems.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f3f4f6', textDecoration: 'none', color: '#1f2937' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span>{item.icon}</span>
                      <span style={{ fontSize: '15px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {item.label}
                        <span style={{ color: '#1e56a0', fontWeight: 700, fontSize: '14px' }}>{item.count}</span>
                      </span>
                    </div>
                    {chevron}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 4. ?´ìŠ¤ */}
          <div style={{ background: '#fff', marginBottom: '8px' }}>
            <h3 style={{ padding: '16px 20px 8px', fontSize: '14px', fontWeight: 700, color: '#6b7280', margin: 0 }}>?´ìŠ¤</h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {newsMenus.map(menu => (
                <li key={menu.name}><Link href={menu.path} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f9fafb', color: '#1f2937', textDecoration: 'none' }}><span style={{ fontSize: '15px', fontWeight: 500 }}>{menu.name}</span>{chevron}</Link></li>
              ))}
            </ul>
          </div>

          {/* 5. ?œë¹„??*/}
          <div style={{ background: '#fff', marginBottom: '8px' }}>
            <h3 style={{ padding: '16px 20px 8px', fontSize: '14px', fontWeight: 700, color: '#6b7280', margin: 0 }}>?œë¹„??/h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {serviceMenus.map(menu => (
                <li key={menu.name}><Link href={menu.path} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f9fafb', color: '#1f2937', textDecoration: 'none' }}><span style={{ fontSize: '15px', fontWeight: 500 }}>{menu.name}</span>{chevron}</Link></li>
              ))}
            </ul>
          </div>

          {/* 6. ì»¤ë??ˆí‹° */}
          <div style={{ background: '#fff', marginBottom: '8px' }}>
            <h3 style={{ padding: '16px 20px 8px', fontSize: '14px', fontWeight: 700, color: '#6b7280', margin: 0 }}>ì»¤ë??ˆí‹°</h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {communityMenus.map(menu => (
                <li key={menu.name}><Link href={menu.path} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f9fafb', color: '#1f2937', textDecoration: 'none' }}><span style={{ fontSize: '15px', fontWeight: 500 }}>{menu.name}</span>{chevron}</Link></li>
              ))}
            </ul>
          </div>

          {/* 7. ë¡œê·¸?„ì›ƒ */}
          {currentUser && (
            <div style={{ background: '#fff', marginBottom: '16px' }}>
              <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', color: '#ef4444', fontWeight: 600, fontSize: '15px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <span>ë¡œê·¸?„ì›ƒ</span>
                {chevron}
              </button>
            </div>
          )}

          {/* ?‹í„° */}
          <div style={{ backgroundColor: '#f3f4f6', padding: '24px 20px 80px', marginTop: '16px' }}>
            <div style={{ marginBottom: '16px', display: 'flex', gap: '16px' }}>
              <Link href="/m/terms" style={{ fontSize: '13px', fontWeight: 700, color: '#4b5563', textDecoration: 'none' }}>?´ìš©?½ê?</Link>
              <span style={{ color: '#d1d5db' }}>|</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#4b5563' }}>ê°œì¸?•ë³´ì²˜ë¦¬ë°©ì¹¨</span>
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.6 }}>
              (ì£?ê³µì‹¤ë§ˆì???br/>
              ?€?œìÂ·ë°œí–‰??: ê¹€?¤ê²½ | ?¸ì§‘??: ê¹€?™í˜„<br/>
              ?¬ì—…?ë“±ë¡ë²ˆ??: 337-81-03010<br/>
              ?¸í„°?·ì‹ ë¬??±ë¡ë²ˆí˜¸ : ?œìš¸ ??5037<br/>
              ì£¼ì†Œ : ?œìš¸?¹ë³„??ê°•ë‚¨êµ??¼í˜„ë¡?15ê¸?31, 105??br/>
              ?´ë©”??: master@gongsilnews.com<br/>
              ê³ ê°?¼í„° : 1555-5343 (?‰ì¼ 10:00~18:00)
            </div>
            <div style={{ fontSize: '11px', color: '#d1d5db', marginTop: '16px' }}>
              Â© GONGSIL NEWS Co., Ltd. All Rights Reserved.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
