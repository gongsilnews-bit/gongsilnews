"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

export default function MobileMyPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [memberData, setMemberData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
            .select('name, email, role, avatar_url, plan_type, signup_completed')
            .eq('id', user.id)
            .single();
          if (data) setMemberData(data);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleOAuthLogin = async (providerName: 'google' | 'kakao') => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: providerName as any,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?from=mobile`,
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
    window.location.href = '/m';
  };

  const getRoleLabel = (role?: string) => {
    if (role === 'ADMIN') return '관리자';
    if (role === 'REALTOR') return '부동산회원';
    return '일반회원';
  };

  const getRoleBadgeStyle = (role?: string): React.CSSProperties => {
    if (role === 'ADMIN') return { background: '#111827', color: '#fff' };
    if (role === 'REALTOR') return { background: '#2563eb', color: '#fff' };
    return { background: '#e5e7eb', color: '#374151' };
  };

  // 역할별 관리 메뉴 구성
  const getAdminMenus = (role?: string) => {
    const common = [
      { icon: '📊', label: '대시보드', desc: '활동 요약 및 통계', href: role === 'ADMIN' ? '/admin?menu=dashboard' : role === 'REALTOR' ? '/realty_admin?menu=dashboard' : '/user_admin?menu=dashboard' },
      { icon: '🏢', label: '공실관리', desc: '등록한 공실 매물 관리', href: role === 'ADMIN' ? '/admin?menu=gongsil' : role === 'REALTOR' ? '/realty_admin?menu=gongsil' : '/user_admin?menu=gongsil' },
      { icon: '📝', label: '기사관리', desc: '작성한 기사 관리', href: role === 'ADMIN' ? '/admin?menu=article' : role === 'REALTOR' ? '/realty_admin?menu=article' : '/user_admin?menu=article' },
      { icon: '💰', label: '포인트', desc: '포인트 내역 및 충전', href: role === 'REALTOR' ? '/realty_admin?menu=point' : '/user_admin?menu=point' },
    ];
    const realtor = [
      { icon: '👥', label: '고객관리', desc: '상담 고객 목록', href: '/realty_admin?menu=customer' },
      { icon: '💬', label: 'TALK', desc: '채팅 및 문의 관리', href: '/realty_admin?menu=comment' },
      { icon: '🌐', label: '홈페이지', desc: '미니 홈페이지 관리', href: '/realty_admin?menu=homepage' },
      { icon: '⚙️', label: '정보설정', desc: '내 정보 및 업소 설정', href: '/realty_admin?menu=settings' },
    ];
    const admin = [
      { icon: '👥', label: '회원관리', desc: '전체 회원 관리', href: '/admin?menu=member' },
      { icon: '🖼️', label: '배너관리', desc: '광고 배너 관리', href: '/admin?menu=banner' },
      { icon: '📋', label: '게시판관리', desc: '게시판 관리', href: '/admin?menu=board' },
      { icon: '⚙️', label: '설정', desc: '시스템 설정', href: '/admin?menu=settings' },
    ];
    const user = [
      { icon: '⚙️', label: '정보설정', desc: '내 프로필 정보 수정', href: '/user_admin?menu=settings' },
    ];

    if (role === 'ADMIN') return [...common, ...admin];
    if (role === 'REALTOR') return [...common, ...realtor];
    return [...common, ...user];
  };

  // 로딩 상태
  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', border: '3px solid #e5e7eb', borderTopColor: '#1e56a0', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#9ca3af', fontSize: '14px' }}>로딩 중...</p>
      </div>
    );
  }

  // 비로그인 상태
  if (!currentUser) {
    return (
      <div style={{ padding: '40px 20px' }}>
        {/* 로그인 유도 */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          {/* 로고 원형 */}
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

          {/* 혜택 리스트 */}
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

        {/* 구글 */}
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

        {/* 카카오 */}
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
    );
  }

  // ── 로그인 상태 ──
  const menus = getAdminMenus(memberData?.role);

  return (
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#f4f5f7' }}>
      {/* ── 1. 프로필 카드 ── */}
      <div style={{ background: 'linear-gradient(135deg, #1a3a6b 0%, #1e56a0 100%)', padding: '24px 20px 20px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(255,255,255,0.3)' }}>
            {memberData?.avatar_url ? (
              <img src={memberData.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.2)', fontSize: '22px', fontWeight: 700 }}>
                {(memberData?.name || '회')[0]}
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800 }}>{memberData?.name || '회원'}님</span>
              <span style={{
                ...getRoleBadgeStyle(memberData?.role),
                fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
              }}>
                {getRoleLabel(memberData?.role)}
              </span>
            </div>
            <p style={{ fontSize: '12px', opacity: 0.7, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {memberData?.email || currentUser?.email}
            </p>
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
            { icon: '📝', label: '내가 등록한 기사', href: memberData?.role === 'REALTOR' ? '/realty_admin?menu=article' : '/user_admin?menu=article' },
            { icon: '🏢', label: '내가 등록한 공실', href: memberData?.role === 'REALTOR' ? '/realty_admin?menu=gongsil' : '/user_admin?menu=gongsil' },
            { icon: '🔖', label: '내가 찜한 기사', href: '#' },
            { icon: '❤️', label: '내가 찜한 공실', href: '#' },
          ].map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
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

      {/* ── 4. 기타 ── */}
      <div style={{ background: '#fff', marginBottom: '32px' }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          <li>
            <Link href="#" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f3f4f6', textDecoration: 'none', color: '#374151' }}>
              <span style={{ fontSize: '15px' }}>공지사항 / 이벤트</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </Link>
          </li>
          <li>
            <Link href="#" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f3f4f6', textDecoration: 'none', color: '#374151' }}>
              <span style={{ fontSize: '15px' }}>고객센터 (1555-5343)</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </Link>
          </li>
          <li>
            <button
              onClick={handleLogout}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                padding: '14px 20px', color: '#ef4444', fontWeight: 600,
                fontSize: '15px', background: 'none', border: 'none',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              로그아웃
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
