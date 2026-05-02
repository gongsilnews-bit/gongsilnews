"use client";

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

export default function GlobalDrawerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [memberData, setMemberData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const touchStartX = useRef<number | null>(null);
  const [translateX, setTranslateX] = useState(0);

  // 전역 이벤트(open-drawer) 감지
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);
    window.addEventListener('open-drawer', handleOpen);
    window.addEventListener('close-drawer', handleClose);

    // 엣지 스와이프(열기) 감지 - 화면 맨 왼쪽 30px 이내에서 터치 시작 시
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch.clientX < 30) {
        touchStartX.current = touch.clientX;
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartX.current !== null && !isOpen) {
        const diff = e.touches[0].clientX - touchStartX.current;
        if (diff > 40) { // 오른쪽으로 40px 이상 당기면 열기
          setIsOpen(true);
          touchStartX.current = null;
        }
      }
    };
    const handleTouchEnd = () => {
      touchStartX.current = null;
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('open-drawer', handleOpen);
      window.removeEventListener('close-drawer', handleClose);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen]);

  // 데이터 로딩
  useEffect(() => {
    if (!isOpen) return; // 열릴 때만 로딩
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
          if (data) setMemberData(data);
        } else {
          setCurrentUser(null);
          setMemberData(null);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    checkAuth();
  }, [isOpen]);

  const handleClose = () => {
    setTranslateX(0);
    setIsOpen(false);
  };

  const onDrawerTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onDrawerTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX.current;
    if (diff < 0) { // 왼쪽으로 스와이프할 때만 (닫는 방향)
      setTranslateX(diff);
    }
  };

  const onDrawerTouchEnd = () => {
    if (translateX < -80) {
      handleClose();
    } else {
      setTranslateX(0);
    }
    touchStartX.current = null;
  };

  const handleOAuthLogin = async (providerName: 'google' | 'kakao') => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: providerName as any,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`,
        },
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
    handleClose();
    window.location.href = '/m';
  };

  const getRoleLabel = (role?: string) => {
    const r = role?.trim().toUpperCase() || '';
    if (r === 'ADMIN' || r === '최고관리자' || r.includes('관리자')) return '최고관리자';
    if (r === 'REALTOR' || r === '부동산회원' || r === '부동산' || r.includes('REALTOR')) return '부동산';
    return '일반';
  };

  const getRoleBadgeStyle = (role?: string): React.CSSProperties => {
    const r = role?.trim().toUpperCase() || '';
    if (r === 'ADMIN' || r === '최고관리자' || r.includes('관리자')) return { background: '#111827', color: '#fff' };
    if (r === 'REALTOR' || r === '부동산회원' || r === '부동산' || r.includes('REALTOR')) return { background: '#2563eb', color: '#fff' };
    return { background: '#e5e7eb', color: '#374151' };
  };

  const getAdminMenus = (role?: string) => {
    const r = role?.trim().toUpperCase() || '';
    const isAdmin = r === 'ADMIN' || r === '최고관리자' || r.includes('관리자');
    const isRealtor = r === 'REALTOR' || r === '부동산회원' || r === '부동산' || r.includes('REALTOR');

    const common = [
      { icon: '📊', label: '대시보드', desc: '활동 요약 및 통계', href: isAdmin ? '/admin?menu=dashboard' : isRealtor ? '/realty_admin?menu=dashboard' : '/user_admin?menu=dashboard' },
      { icon: '🏢', label: '공실관리', desc: '등록한 공실 매물 관리', href: '/m/admin/vacancy' },
      { icon: '📝', label: '기사관리', desc: '작성한 기사 관리', href: '/m/admin/article' },
      { icon: '💰', label: '포인트', desc: '포인트 내역 및 충전', href: '/m/admin/point' },
    ];
    const realtor = [
      { icon: '👥', label: '고객관리', desc: '상담 고객 목록', href: '/realty_admin?menu=customer' },
      { icon: '💬', label: 'TALK', desc: '채팅 및 문의 관리', href: '/realty_admin?menu=comment' },
      { icon: '🌐', label: '홈페이지', desc: '미니 홈페이지 관리', href: '/realty_admin?menu=homepage' },
      { icon: '⚙️', label: '정보설정', desc: '내 정보 및 업소 설정', href: '/m/admin/settings' },
    ];
    const admin = [
      { icon: '👥', label: '회원관리', desc: '전체 회원 관리', href: '/admin?menu=member' },
      { icon: '🖼️', label: '배너관리', desc: '광고 배너 관리', href: '/admin?menu=banner' },
      { icon: '📋', label: '게시판관리', desc: '게시판 관리', href: '/admin?menu=board' },
      { icon: '⚙️', label: '설정', desc: '시스템 설정', href: '/admin?menu=settings' },
    ];
    const user = [
      { icon: '⚙️', label: '정보설정', desc: '내 프로필 정보 수정', href: '/m/admin/settings' },
    ];

    if (isAdmin) return [...common, ...admin];
    if (isRealtor) return [...common, ...realtor];
    return [...common, ...user];
  };

  const menus = getAdminMenus(memberData?.role);

  return (
    <>
      {/* 딤 배경 */}
      <div 
        onClick={handleClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9998,
          opacity: isOpen ? Math.max(0, 1 + translateX / 300) : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: translateX === 0 ? 'opacity 0.3s' : 'none'
        }} 
      />

      {/* Drawer */}
      <div 
        onTouchStart={onDrawerTouchStart}
        onTouchMove={onDrawerTouchMove}
        onTouchEnd={onDrawerTouchEnd}
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: '100%', maxWidth: '448px',
          backgroundColor: '#f4f5f7', zIndex: 9999,
          overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          transform: `translateX(${isOpen ? (translateX < 0 ? translateX : 0) + 'px' : '-100%'})`,
          transition: translateX === 0 ? 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
          boxShadow: '4px 0 15px rgba(0,0,0,0.1)',
          pointerEvents: isOpen ? 'auto' : 'none'
        }}
      >
        {/* 헤더 바 (X 닫기 버튼) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', backgroundColor: '#fff', borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, zIndex: 10 }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#111' }}>메뉴</h2>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', border: '3px solid #e5e7eb', borderTopColor: '#1e56a0', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>로딩 중...</p>
          </div>
        ) : !currentUser ? (
          <div style={{ padding: '40px 20px', backgroundColor: '#fff', minHeight: 'calc(100vh - 60px)' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', border: '1px solid #eee', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, boxShadow: '0 2px 6px rgba(0,0,0,0.06)', overflow: 'hidden', margin: '0 auto 24px' }}>
                <svg width="64" height="64" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="24" cy="24" r="24" fill="#222222" />
                  <circle cx="24" cy="24" r="16" fill="#FFFFFF" />
                  <path d="M19 15.34L34 24L19 32.66Z" fill="#F59E0B" stroke="#222222" strokeWidth="3" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: '#111', textAlign: 'center', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>
                <span style={{ color: '#1e56a0' }}>11만</span> 부동산 무료 정보채널
              </h3>
              <p style={{ fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 1.6, margin: '0 0 26px 0' }}>
                단 한 번의 가입으로 중개 실무에 꼭 필요한<br />특별한 혜택들을 모두 무료로 누려보세요.
              </p>
              <ul style={{ width: '100%', listStyle: 'none', margin: '0 0 28px 0', background: '#f4f6fa', borderRadius: '10px', padding: '18px 20px', border: '1px solid #eef0f5', boxSizing: 'border-box', textAlign: 'left' }}>
                {[
                  <><strong style={{color: '#111', fontWeight: 800}}>로컬 부동산이 직접 전달하는</strong> 시세 현황 뉴스</>,
                  <><strong style={{color: '#111', fontWeight: 800}}>중개사에게 꼭 필요한</strong> AI 유튜브 특강 시청</>,
                  <><strong style={{color: '#111', fontWeight: 800}}>대한민국 부동산 누구나 가입하는</strong> 100% 무료 공동중개망</>
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#555', marginBottom: i < 2 ? 14 : 0, letterSpacing: '-0.3px' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#1e56a0', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, flexShrink: 0 }}>✓</div>
                    <span style={{ lineHeight: 1.4 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => handleOAuthLogin('google')}
              style={{
                width: '100%', padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                fontSize: '15px', fontWeight: 700, color: '#222', background: '#fff', border: '2px solid #4285F4',
                borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '10px',
                boxShadow: '0 2px 6px rgba(66,133,244,0.12)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Google 계정으로 시작하기
            </button>
            <button
              onClick={() => handleOAuthLogin('kakao')}
              style={{
                width: '100%', padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                fontSize: '15px', fontWeight: 700, color: '#000', background: '#FEE500', border: 'none',
                borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#3C1E1E" d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24l-1.12 4.16c-.1.36.3.65.6.44l4.94-3.26c.39.04.79.06 1.2.06 5.52 0 10-3.36 10-7.64C22 6.36 17.52 3 12 3z"/></svg>
              카카오 계정으로 시작하기
            </button>
          </div>
        ) : (
          <>
            {/* ── 1. 프로필 카드 ── */}
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
                      <span style={{
                        ...getRoleBadgeStyle(memberData?.role || 'USER'),
                        fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                      }}>
                        {getRoleLabel(memberData?.role || 'USER')}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', opacity: 0.8, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{memberData?.email || currentUser?.email}</span>
                      {currentUser?.app_metadata?.providers?.includes('google') && <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>구글</span>}
                      {currentUser?.app_metadata?.providers?.includes('kakao') && <span style={{ fontSize: '10px', background: '#FEE500', color: '#000', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>카카오</span>}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 2. 관리 메뉴 그리드 ── */}
            <div style={{ padding: '16px', background: '#fff', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#6b7280', marginBottom: '12px', padding: '0 4px' }}>관리 메뉴</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {menus.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={handleClose}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      padding: '14px 4px 10px', background: '#f8f9fb', borderRadius: '12px',
                      textDecoration: 'none', transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: '24px', marginBottom: '6px' }}>{item.icon}</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#374151', textAlign: 'center', lineHeight: 1.3, wordBreak: 'keep-all' }}>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* ── 3. 나의 활동 ── */}
            <div style={{ background: '#fff', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#6b7280', padding: '16px 20px 8px' }}>나의 활동</h3>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {[
                  { icon: '📝', label: '내가 등록한 기사', href: '/m/admin/article' },
                  { icon: '🏢', label: '내가 등록한 공실', href: '/m/admin/vacancy' },
                  { icon: '🔖', label: '내가 찜한 기사', href: '#' },
                  { icon: '❤️', label: '내가 찜한 공실', href: '#' },
                ].map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={handleClose}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 20px', borderBottom: '1px solid #f3f4f6',
                        textDecoration: 'none', color: '#1f2937',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '18px' }}>{item.icon}</span>
                        <span style={{ fontSize: '15px', fontWeight: 500 }}>{item.label}</span>
                      </div>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── 4. 공실뉴스 ── */}
            <div style={{ background: '#fff', marginBottom: '8px' }}>
              <h3 style={{ padding: '16px 20px 8px', fontSize: '14px', fontWeight: 700, color: '#6b7280', margin: 0 }}>공실뉴스</h3>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {["전체뉴스", "우리동네뉴스", "부동산·주식·재테크", "정치·경제·사회", "세무·법률", "여행·건강·생활", "기타"].map(menu => (
                  <li key={menu}>
                    <Link href="/m/news" onClick={handleClose} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f9fafb', color: '#1f2937', textDecoration: 'none' }}>
                      <span style={{ fontSize: '15px', fontWeight: 500 }}>{menu}</span>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── 5. 서비스 ── */}
            <div style={{ background: '#fff', marginBottom: '8px' }}>
              <h3 style={{ padding: '16px 20px 8px', fontSize: '14px', fontWeight: 700, color: '#6b7280', margin: 0 }}>서비스</h3>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {[
                  { name: "공실열람", path: "/m/gongsil" },
                  { name: "자료실", path: "/m/study" },
                  { name: "부동산특강", path: "/m/study" },
                  { name: "중개업소무료가입", path: "/m" }
                ].map(menu => (
                  <li key={menu.name}>
                    <Link href={menu.path} onClick={handleClose} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f9fafb', color: '#1f2937', textDecoration: 'none' }}>
                      <span style={{ fontSize: '15px', fontWeight: 500 }}>{menu.name}</span>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── 6. 기타 ── */}
            <div style={{ background: '#fff', marginBottom: '16px' }}>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                <li>
                  <Link href="#" onClick={handleClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f3f4f6', textDecoration: 'none', color: '#374151' }}>
                    <span style={{ fontSize: '15px', fontWeight: 500 }}>공지사항 / 이벤트</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </Link>
                </li>
                <li>
                  <Link href="#" onClick={handleClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f3f4f6', textDecoration: 'none', color: '#374151' }}>
                    <span style={{ fontSize: '15px', fontWeight: 500 }}>고객센터 (1555-5343)</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </Link>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 20px', color: '#ef4444', fontWeight: 600,
                      fontSize: '15px', background: 'none', border: 'none',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>🚪</span>
                      로그아웃
                    </div>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </button>
                </li>
              </ul>
            </div>
          </>
        )}

        {/* ── 풋터 영역 ── */}
        <div style={{ backgroundColor: '#f3f4f6', padding: '24px 20px 80px', marginTop: '16px' }}>
          <div style={{ marginBottom: '16px', display: 'flex', gap: '16px' }}>
            <Link href="/terms" onClick={handleClose} style={{ fontSize: '13px', fontWeight: 700, color: '#4b5563', textDecoration: 'none' }}>이용약관</Link>
            <Link href="#" onClick={handleClose} style={{ fontSize: '13px', fontWeight: 700, color: '#4b5563', textDecoration: 'none' }}>개인정보처리방침</Link>
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.6 }}>
            (주)공실마케팅<br/>
            대표자·발행인 : 김윤경 | 편집인 : 김동현<br/>
            사업자등록번호 : 337-81-03010<br/>
            인터넷신문 등록번호 : 서울 아55037<br/>
            주소 : 서울특별시 강남구 논현로115길 31, 105호<br/>
            고객센터 : 1555-5343 (평일 10:00~18:00)
          </div>
          <div style={{ fontSize: '11px', color: '#d1d5db', marginTop: '16px' }}>
            © GONGSIL NEWS Co., Ltd. All Rights Reserved.
          </div>
        </div>
      </div>
    </>
  );
}
