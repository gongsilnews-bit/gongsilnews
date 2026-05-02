"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import SignupCompleteModal from '@/components/SignupCompleteModal';

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HamburgerMenu({ isOpen, onClose }: HamburgerMenuProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [memberData, setMemberData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [isSignupCompleteOpen, setIsSignupCompleteOpen] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupName, setSignupName] = useState('');

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 250);
  };

  useEffect(() => {
    if (!isOpen) return;
    const checkAuth = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          const { data } = await supabase
            .from('members')
            .select('name, email, role, signup_completed, profile_image_url')
            .eq('id', user.id)
            .single();
          if (data) {
            setMemberData(data);
            // 가입 미완료 시 가입완료 모달
            if (data.signup_completed === false) {
              setSignupEmail(data.email || user.email || '');
              setSignupName(data.name || user.user_metadata?.full_name || '');
              setIsSignupCompleteOpen(true);
            }
          }
        } else {
          setCurrentUser(null);
          setMemberData(null);
        }
      } catch (err) {
        console.error('Auth check error:', err);
      }
      setLoading(false);
    };
    checkAuth();
  }, [isOpen]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setCurrentUser(null);
    setMemberData(null);
    handleClose();
    setTimeout(() => window.location.reload(), 300);
  };

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
      { icon: '📊', label: '대시보드', href: isAdmin ? '/admin?menu=dashboard' : isRealtor ? '/realty_admin?menu=dashboard' : '/user_admin?menu=dashboard' },
      { icon: '🏢', label: '공실관리', href: '/m/admin/vacancy' },
      { icon: '📝', label: '기사관리', href: '/m/admin/article' },
      { icon: '💰', label: '포인트', href: '/m/admin/point' },
    ];
    const realtor = [
      { icon: '👥', label: '고객관리', href: '/realty_admin?menu=customer' },
      { icon: '💬', label: 'TALK', href: '/realty_admin?menu=comment' },
      { icon: '🌐', label: '홈페이지', href: '/realty_admin?menu=homepage' },
      { icon: '⚙️', label: '정보설정', href: '/m/admin/settings' },
    ];
    const admin = [
      { icon: '👥', label: '회원관리', href: '/admin?menu=member' },
      { icon: '🖼️', label: '배너관리', href: '/admin?menu=banner' },
      { icon: '📋', label: '게시판관리', href: '/admin?menu=board' },
      { icon: '⚙️', label: '설정', href: '/admin?menu=settings' },
    ];
    const user = [
      { icon: '⚙️', label: '정보설정', href: '/m/admin/settings' },
    ];
    if (isAdmin) return [...common, ...admin];
    if (isRealtor) return [...common, ...realtor];
    return [...common, ...user];
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={isClosing ? "animate-slide-out-left" : "animate-slide-in-left"} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100dvh', backgroundColor: '#f9fafb', zIndex: 99999, display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
        <style>{`
          @keyframes slideInLeft {
            from { transform: translateX(-100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes slideOutLeft {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(-100%); opacity: 0; }
          }
          .animate-slide-in-left {
            animation: slideInLeft 0.25s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          }
          .animate-slide-out-left {
            animation: slideOutLeft 0.25s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          }
        `}</style>
        
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: '#fff', borderBottom: '1px solid #f3f4f6' }}>
          <img src="/logo.png" alt="공실뉴스" style={{ height: '24px', objectFit: 'contain' }} />
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleClose();
            }} 
            style={{ padding: '4px' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* 프로필 영역 — 인증 상태에 따라 분기 */}
          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderBottom: '1px solid #f3f4f6' }}>
            {loading ? (
              /* 로딩 스켈레톤 */
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', backgroundColor: '#e5e7eb', borderRadius: '50%', marginRight: '12px', animation: 'pulse 1.5s infinite' }} />
                <div>
                  <div style={{ width: '100px', height: '16px', backgroundColor: '#e5e7eb', borderRadius: '4px', marginBottom: '8px' }} />
                  <div style={{ width: '140px', height: '12px', backgroundColor: '#e5e7eb', borderRadius: '4px' }} />
                </div>
              </div>
            ) : currentUser ? (
              /* ── 로그인 상태 — 마이페이지 스타일 ── */
              <div>
                {/* 프로필 헤더 */}
                <div style={{ background: 'linear-gradient(135deg, #1a3a6b 0%, #1e56a0 100%)', padding: '20px', borderRadius: '12px', marginBottom: '16px', color: '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(255,255,255,0.3)' }}>
                      {memberData?.profile_image_url || currentUser.user_metadata?.avatar_url ? (
                        <img src={memberData?.profile_image_url || currentUser.user_metadata?.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.2)', fontSize: '18px', fontWeight: 700 }}>
                          {(memberData?.name || currentUser.user_metadata?.full_name || '회')[0]}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 800 }}>{memberData?.name || currentUser.user_metadata?.full_name || '회원'}님</span>
                        <span style={{
                          ...getRoleBadgeStyle(memberData?.role || 'USER'),
                          fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                        }}>
                          {getRoleLabel(memberData?.role || 'USER')}
                        </span>
                      </div>
                      <p style={{ fontSize: '11px', opacity: 0.7, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{memberData?.email || currentUser.email}</span>
                        {currentUser?.app_metadata?.providers?.includes('google') && <span style={{ fontSize: '9px', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>구글</span>}
                        {currentUser?.app_metadata?.providers?.includes('kakao') && <span style={{ fontSize: '9px', background: '#FEE500', color: '#000', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>카카오</span>}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 관리 메뉴 그리드 */}
                <div style={{ marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#6b7280', marginBottom: '10px' }}>관리 메뉴</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {getAdminMenus(memberData?.role || 'USER').map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={handleClose}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          padding: '12px 4px 8px', background: '#f8f9fb', borderRadius: '10px',
                          textDecoration: 'none', transition: 'all 0.15s',
                        }}
                      >
                        <span style={{ fontSize: '22px', marginBottom: '4px' }}>{item.icon}</span>
                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#374151', textAlign: 'center', lineHeight: 1.3, wordBreak: 'keep-all' }}>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* ── 비로그인 상태 — 바로 소셜 로그인 ── */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', flexShrink: 0 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 2px 0' }}>간편 로그인</h2>
                    <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>소셜 계정으로 바로 시작하세요</p>
                  </div>
                </div>
                {/* 구글 로그인 */}
                <button
                  onClick={() => handleOAuthLogin('google')}
                  style={{
                    width: '100%',
                    padding: '12px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#222',
                    background: '#fff',
                    border: '2px solid #4285F4',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    marginBottom: '8px',
                    boxShadow: '0 1px 4px rgba(66,133,244,0.12)',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  Google 계정으로 시작하기
                </button>
                {/* 카카오 로그인 */}
                <button
                  onClick={() => handleOAuthLogin('kakao')}
                  style={{
                    width: '100%',
                    padding: '12px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#000',
                    background: '#FEE500',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#3C1E1E" d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24l-1.12 4.16c-.1.36.3.65.6.44l4.94-3.26c.39.04.79.06 1.2.06 5.52 0 10-3.36 10-7.64C22 6.36 17.52 3 12 3z"/></svg>
                  카카오 계정으로 시작하기
                </button>
              </div>
            )}
          </div>

          {/* 뉴스 메뉴 */}
          <div style={{ marginTop: '8px', backgroundColor: '#ffffff' }}>
            <h3 style={{ padding: '20px 20px 8px 20px', fontSize: '14px', fontWeight: 700, color: '#6b7280' }}>공실뉴스</h3>
            <ul>
              {["전체뉴스", "우리동네뉴스", "부동산·주식·재테크", "정치·경제·사회", "세무·법률", "여행·건강·생활", "기타"].map(menu => (
                <li key={menu}>
                  <Link href="/m/news" onClick={handleClose} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #f9fafb', color: '#1f2937', textDecoration: 'none' }}>
                    <span style={{ fontSize: '15px', fontWeight: 500 }}>{menu}</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 서비스 메뉴 */}
          <div style={{ marginTop: '8px', backgroundColor: '#ffffff' }}>
            <h3 style={{ padding: '20px 20px 8px 20px', fontSize: '14px', fontWeight: 700, color: '#6b7280' }}>서비스</h3>
            <ul>
              {[
                { name: "공실열람", path: "/m/gongsil" },
                { name: "자료실", path: "/m/study" },
                { name: "부동산특강", path: "/m/study" },
                { name: "중개업소무료가입", path: "/m" }
              ].map(menu => (
                <li key={menu.name}>
                  <Link href={menu.path} onClick={onClose} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #f9fafb', color: '#1f2937', textDecoration: 'none' }}>
                    <span style={{ fontSize: '15px', fontWeight: 500 }}>{menu.name}</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 나의 활동 + 로그아웃 — 로그인 상태에서만 표시 */}
          {currentUser && (
            <>
              <div style={{ marginTop: '8px', backgroundColor: '#ffffff' }}>
                <h3 style={{ padding: '20px 20px 8px 20px', fontSize: '14px', fontWeight: 700, color: '#6b7280' }}>나의 활동</h3>
                <ul>
                  {[
                    { icon: '📝', label: '내가 등록한 기사', href: '/m/admin/article' },
                    { icon: '🏢', label: '내가 등록한 공실', href: '/m/admin/vacancy' },
                    { icon: '🔖', label: '내가 찜한 기사', href: '#' },
                    { icon: '❤️', label: '내가 찜한 공실', href: '#' },
                  ].map((item) => (
                    <li key={item.label}>
                      <Link href={item.href} onClick={handleClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #f9fafb', textDecoration: 'none', color: '#1f2937' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '16px' }}>{item.icon}</span>
                          <span style={{ fontSize: '15px', fontWeight: 500 }}>{item.label}</span>
                        </div>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ marginTop: '8px', backgroundColor: '#ffffff' }}>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '14px 20px', color: '#ef4444', fontWeight: 600,
                    fontSize: '15px', background: 'none', border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>🚪</span>
                  로그아웃
                </button>
              </div>
            </>
          )}
          {/* 풋터 영역 — 실제 회사 정보 */}
          <div style={{ backgroundColor: '#f3f4f6', padding: '24px 20px', marginTop: '16px' }}>
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
      </div>

      {/* AuthModal & SignupCompleteModal */}
      {/* SignupCompleteModal — 가입 미완료 시 추가정보 입력 */}
      <SignupCompleteModal
        isOpen={isSignupCompleteOpen}
        onClose={() => setIsSignupCompleteOpen(false)}
        email={signupEmail}
        name={signupName}
      />
    </>
  );
}
