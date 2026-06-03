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
          // 병렬 조회: 프로필 + 중개사 상태 동시
          const [{ data }, { data: agencyData }] = await Promise.all([
            supabase.from('members').select('name, email, role, profile_image_url, plan_type, signup_completed').eq('id', user.id).single(),
            supabase.from('agencies').select('status').eq('owner_id', user.id).single(),
          ]);
          if (data) {
            setMemberData({ ...data, agencyStatus: agencyData?.status || null });
            const r = data.role?.trim().toUpperCase() || '';
            const isAdmin = r === 'ADMIN' || r === '최고관리자' || r.includes('관리자');
            // 병렬 조회: 활동 카운트 + 관리자 PENDING 카운트 동시
            const [activityRes, ...adminResults] = await Promise.all([
              getUserActivityCounts(user.id),
              ...(isAdmin ? [
                supabase.from('vacancies').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
                supabase.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
                supabase.from('agencies').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
              ] : []),
            ]);
            if (activityRes.success) setUserActivityCounts(activityRes.counts);
            if (isAdmin && adminResults.length === 3) {
              setPendingCounts({ vacancies: adminResults[0].count || 0, articles: adminResults[1].count || 0, members: adminResults[2].count || 0 });
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

  // 스크롤 위치 저장 & 복원
  useEffect(() => {
    if (!loading) {
      const saved = sessionStorage.getItem('menu_scroll_y');
      if (saved) {
        requestAnimationFrame(() => {
          window.scrollTo(0, parseInt(saved, 10));
        });
      }
    }
  }, [loading]);

  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem('menu_scroll_y', String(window.scrollY));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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
      alert('로그인 오류: ' + (err?.message || String(err)));
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/m';
  };

  const getRoleLabel = (role?: string, agencyStatus?: string) => {
    const r = role?.trim().toUpperCase() || '';
    if (r === 'ADMIN' || r === '최고관리자' || r.includes('관리자')) return '최고관리자';
    if (r === 'REALTOR' || r === '부동산회원' || r === '부동산' || r.includes('REALTOR')) {
      if (agencyStatus === 'PENDING') return '승인대기';
      if (agencyStatus === 'REJECTED') return '서류보완';
      return '부동산';
    }
    return '일반';
  };

  const getRoleBadgeStyle = (role?: string, agencyStatus?: string): React.CSSProperties => {
    const r = role?.trim().toUpperCase() || '';
    if (r === 'ADMIN' || r === '최고관리자' || r.includes('관리자')) return { background: '#111827', color: '#fff' };
    if (r === 'REALTOR' || r === '부동산회원' || r === '부동산' || r.includes('REALTOR')) {
      if (agencyStatus === 'PENDING') return { background: '#fbbf24', color: '#78350f' };
      if (agencyStatus === 'REJECTED') return { background: '#ef4444', color: '#fff' };
      return { background: '#2563eb', color: '#fff' };
    }
    return { background: '#e5e7eb', color: '#374151' };
  };

  const getAdminMenus = (role?: string) => {
    const r = role?.trim().toUpperCase() || '';
    const isAdmin = r === 'ADMIN' || r === '최고관리자' || r.includes('관리자');
    const isRealtor = r === 'REALTOR' || r === '부동산회원' || r === '부동산' || r.includes('REALTOR');
    const dashboard = { icon: '📊', label: '대시보드', href: '/m/admin/dashboard' };
    const vacancy = { icon: '🏢', label: '공실관리', href: '/m/admin/vacancy', badgeCount: isAdmin ? pendingCounts.vacancies : 0 };
    const article = { icon: '📝', label: '기사관리', href: '/m/admin/article', badgeCount: isAdmin ? pendingCounts.articles : 0 };
    const point = {
      icon: (<div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff', fontSize: '16px', fontWeight: 900, boxShadow: '0 2px 6px rgba(245, 158, 11, 0.4)', fontFamily: 'system-ui, sans-serif' }}>G</div>),
      label: '포인트', href: '/m/admin/point'
    };
    const member = { icon: '👥', label: '회원관리', href: '/m/admin/member', badgeCount: isAdmin ? pendingCounts.members : 0 };
    const realtor: any[] = [
      { icon: '👥', label: '고객/문의', href: '/m/admin/customer' },
      { icon: '⚙️', label: '정보설정', href: '/m/admin/settings' },
    ];
    const admin: any[] = [
      { icon: '🖼️', label: '배너관리', href: '/m/admin/banner' },
      { icon: '📋', label: '게시판관리', href: '/m/admin/board' },
      { icon: '✉️', label: '문의관리', href: '/m/admin/inquiry' },
      { icon: '⚙️', label: '설정', href: '/m/admin/settings' },
    ];
    const user: any[] = [{ icon: '⚙️', label: '정보설정', href: '/m/admin/settings' }];
    if (isAdmin) return [dashboard, member, vacancy, article, point, ...admin];
    if (isRealtor) return [dashboard, vacancy, article, point, ...realtor];
    return [dashboard, vacancy, article, point, ...user];
  };

  const menus = getAdminMenus(memberData?.role);

  const activityItems = [
    { icon: '📄', label: '내가 등록한 기사', href: '/m/admin/article', count: userActivityCounts.myArticles },
    { icon: '🏢', label: '내가 등록한 공실', href: '/m/admin/vacancy', count: userActivityCounts.myVacancies },
    { icon: '🔖', label: '내가 찜한 기사', href: '/m/news_bookmarks', count: userActivityCounts.bookmarkedArticles },
    { icon: '❤️', label: '내가 찜한 공실', href: '/m/gongsil_bookmarks', count: userActivityCounts.bookmarkedVacancies },
    { icon: '👥', label: '내가 구독한 기자', href: '/m/subscribed_reporters', count: userActivityCounts.subscribedReporters },
    { icon: '📚', label: '내 수강특강', href: '/m/my_lectures', count: userActivityCounts.myLectures },
  ];

  const newsMenus = [
    { name: "공실뉴스", path: "/m/news_gongsil" },
    { name: "부동산·경제", path: "/m/news_politics" },
    { name: "AI마케팅", path: "/m/news_marketing" },
    { name: "라이프·오피니언", path: "/m/news_etc" }
  ];

  const serviceMenus = [
    { name: "공실열람", path: "/m/gongsil" },
    { name: "부동산특강", path: "/m/study" },
    { name: "드론영상", path: "/m/board?id=drone" },
    { name: "APP(앱)", path: "/m/board?id=app" },
    { name: "AI 프롬프트", path: "/m/board?id=prompt" },
    { name: "음원", path: "/m/board?id=sound" },
    { name: "계약서/양식", path: "/m/board?id=doc" }
  ];

  const communityMenus = [
    { name: "자유게시판", path: "/m/board?id=free" },
    { name: "Q&A게시판", path: "/m/board?id=qna" },
    { name: "공지사항", path: "/m/board?id=notice" },
    { name: "1:1 문의", path: "/m/board?id=inquiry" }
  ];

  const chevron = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f5f7' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', backgroundColor: '#fff', borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, zIndex: 10 }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#111' }}>메뉴</h2>
      </div>

      {loading ? (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '3px solid #e5e7eb', borderTopColor: '#1e56a0', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>로딩 중...</p>
        </div>
      ) : (
        <>
          {/* 1. 프로필 / 로그인 */}
          {!currentUser ? (
            <div style={{ padding: '30px 20px 20px', backgroundColor: '#fff', borderBottom: '8px solid #f4f5f7' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', border: '1px solid #eee', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 2px 6px rgba(0,0,0,0.06)', overflow: 'hidden', margin: '0 auto 16px' }}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="24" fill="#222"/><circle cx="24" cy="24" r="16" fill="#FFF"/><path d="M19 15.34L34 24L19 32.66Z" fill="#F59E0B" stroke="#222" strokeWidth="3" strokeLinejoin="round"/></svg>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#111', margin: '0 0 6px 0' }}>
                  <span style={{ color: '#1e56a0' }}>11만</span> 부동산 무료 정보채널
                </h3>
                <p style={{ fontSize: 13, color: '#888', lineHeight: 1.5, margin: '0 0 20px 0' }}>
                  단 한 번의 가입으로 중개 실무에 꼭 필요한<br/>특별한 혜택들을 모두 무료로 누려보세요.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button onClick={() => handleOAuthLogin('google')} style={{ width: '100%', padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '14px', fontWeight: 700, color: '#222', background: '#fff', border: '2px solid #4285F4', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', position: 'relative' }}>
                  <span style={{ position: 'absolute', top: -9, right: 14, background: '#4285F4', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10 }}>추천</span>
                  Google 계정으로 시작
                </button>
                <button onClick={() => handleOAuthLogin('kakao')} style={{ width: '100%', padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '14px', fontWeight: 700, color: '#000', background: '#FEE500', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  카카오 계정으로 3초만에 시작
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
                        {(memberData?.name || currentUser?.user_metadata?.full_name || '회')[0]}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 800 }}>{memberData?.name || currentUser?.user_metadata?.full_name || '회원'}님</span>
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

          {/* 부동산회원 전환 유도 */}
          {currentUser && memberData && (memberData.role === 'USER' || (!memberData.role)) && (() => {
            const dismissed = typeof window !== 'undefined' && localStorage.getItem(`realtor_banner_dismissed_${currentUser.id}`);
            if (dismissed) return null;
            return (
              <div style={{ padding: '0 20px 10px', background: '#fff', position: 'relative' }}>
                <Link href="/m/admin/settings?tab=agency" style={{ display: 'block', textDecoration: 'none', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', borderRadius: '12px', padding: '16px 20px', border: '1px solid #fbbf24' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '28px' }}>🏡</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#92400e', marginBottom: '2px' }}>부동산 중개사이신가요?</div>
                      <div style={{ fontSize: '12px', color: '#a16207', lineHeight: 1.4 }}>부동산회원 전환 시 공실광고 무료 등록!</div>
                    </div>
                    {chevron}
                  </div>
                </Link>
                <button onClick={(e) => { e.stopPropagation(); localStorage.setItem(`realtor_banner_dismissed_${currentUser.id}`, 'true'); (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
                  style={{ position: 'absolute', top: 2, right: 24, width: 22, height: 22, borderRadius: '50%', background: 'rgba(146,64,14,0.15)', border: 'none', color: '#92400e', fontSize: 14, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
              </div>
            );
          })()}

          {/* 2. 관리 메뉴 그리드 */}
          {currentUser && (
            <div style={{ padding: '16px', background: '#fff', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#6b7280', marginBottom: '12px', padding: '0 4px' }}>관리 메뉴</h3>
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

          {/* 3. 나의 활동 */}
          <div style={{ background: '#fff', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#6b7280', padding: '16px 20px 8px' }}>나의 활동</h3>
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

          {/* 4. 뉴스 */}
          <div style={{ background: '#fff', marginBottom: '8px' }}>
            <h3 style={{ padding: '16px 20px 8px', fontSize: '14px', fontWeight: 700, color: '#6b7280', margin: 0 }}>뉴스</h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {newsMenus.map(menu => (
                <li key={menu.name}><Link href={menu.path} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f9fafb', color: '#1f2937', textDecoration: 'none' }}><span style={{ fontSize: '15px', fontWeight: 500 }}>{menu.name}</span>{chevron}</Link></li>
              ))}
            </ul>
          </div>

          {/* 5. 서비스 */}
          <div style={{ background: '#fff', marginBottom: '8px' }}>
            <h3 style={{ padding: '16px 20px 8px', fontSize: '14px', fontWeight: 700, color: '#6b7280', margin: 0 }}>서비스</h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {serviceMenus.map(menu => (
                <li key={menu.name}><Link href={menu.path} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f9fafb', color: '#1f2937', textDecoration: 'none' }}><span style={{ fontSize: '15px', fontWeight: 500 }}>{menu.name}</span>{chevron}</Link></li>
              ))}
            </ul>
          </div>

          {/* 6. 커뮤니티 */}
          <div style={{ background: '#fff', marginBottom: '8px' }}>
            <h3 style={{ padding: '16px 20px 8px', fontSize: '14px', fontWeight: 700, color: '#6b7280', margin: 0 }}>커뮤니티</h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {communityMenus.map(menu => (
                <li key={menu.name}><Link href={menu.path} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f9fafb', color: '#1f2937', textDecoration: 'none' }}><span style={{ fontSize: '15px', fontWeight: 500 }}>{menu.name}</span>{chevron}</Link></li>
              ))}
            </ul>
          </div>

          {/* 7. 로그아웃 */}
          {currentUser && (
            <div style={{ background: '#fff', marginBottom: '16px' }}>
              <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', color: '#ef4444', fontWeight: 600, fontSize: '15px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <span>로그아웃</span>
                {chevron}
              </button>
            </div>
          )}

          {/* 풋터 */}
          <div style={{ backgroundColor: '#f3f4f6', padding: '24px 20px 80px', marginTop: '16px' }}>
            <div style={{ marginBottom: '16px', display: 'flex', gap: '16px' }}>
              <Link href="/m/terms" style={{ fontSize: '13px', fontWeight: 700, color: '#4b5563', textDecoration: 'none' }}>이용약관</Link>
              <span style={{ color: '#d1d5db' }}>|</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#4b5563' }}>개인정보처리방침</span>
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.6 }}>
              (주)공실마케팅<br/>
              대표자·발행인 : 김윤경 | 편집인 : 김동현<br/>
              사업자등록번호 : 337-81-03010<br/>
              인터넷신문 등록번호 : 서울 아55037<br/>
              주소 : 서울특별시 강남구 논현로115길 31, 105호<br/>
              이메일 : master@gongsilnews.com<br/>
              고객센터 : 1555-5343 (평일 10:00~18:00)
            </div>
            <div style={{ fontSize: '11px', color: '#d1d5db', marginTop: '16px' }}>
              © GONGSIL NEWS Co., Ltd. All Rights Reserved.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
