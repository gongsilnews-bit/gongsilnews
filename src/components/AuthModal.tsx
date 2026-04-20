'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/utils/supabase/client';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'signup' | 'login';
  onGoogleClick?: () => void;
}

export default function AuthModal({ isOpen, onClose, initialTab = 'signup', onGoogleClick }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'signup' | 'login'>(initialTab);
  const [mounted, setMounted] = useState(false);
  const [showFindAccount, setShowFindAccount] = useState(false);
  const [findName, setFindName] = useState('');
  const [findPhone, setFindPhone] = useState('');
  const [findResult, setFindResult] = useState<{ found: boolean; email?: string; provider?: string } | null>(null);
  const [findLoading, setFindLoading] = useState(false);

  const handleOAuthLogin = async (providerName: 'google' | 'kakao' | 'naver') => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: providerName as any,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      alert('로그인 오류: ' + (err?.message || String(err)));
    }
  };

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      setActiveTab(initialTab);
      setShowFindAccount(false);
      setFindResult(null);
      setFindName('');
      setFindPhone('');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, initialTab]);

  const handleFindAccount = async () => {
    if (!findName.trim() || !findPhone.trim()) return;
    setFindLoading(true);
    setFindResult(null);
    try {
      const res = await fetch(`/api/find-account?name=${encodeURIComponent(findName)}&phone=${encodeURIComponent(findPhone)}`);
      const data = await res.json();
      setFindResult(data);
    } catch {
      setFindResult({ found: false });
    }
    setFindLoading(false);
  };

  if (!isOpen || !mounted) return null;

  const providerLabel = (p?: string) => {
    if (p === 'kakao') return '카카오';
    if (p === 'naver') return '네이버';
    return 'Google';
  };

  const providerColor = (p?: string) => {
    if (p === 'kakao') return '#FEE500';
    if (p === 'naver') return '#03C75A';
    return '#fff';
  };

  const modalContent = (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        width: '100vw', height: '100vh', zIndex: 99999999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, boxSizing: 'border-box',
      }}
    >
      <div onClick={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />

      <div style={{ position: 'relative', background: '#fff', width: 440, maxWidth: '100%', borderRadius: 8, boxShadow: '0 25px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '90vh' }}>
        {/* 닫기 */}
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', fontSize: 24, color: '#aaa', cursor: 'pointer', zIndex: 10, lineHeight: 1, padding: 0 }}>✕</button>

        <div style={{ overflowY: 'auto', flex: 1 }}>

          {/* ━━━ 계정 찾기 모드 ━━━ */}
          {showFindAccount ? (
            <div style={{ padding: '28px 32px 24px' }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e56a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#111', margin: '0 0 6px' }}>계정 찾기</h3>
                <p style={{ fontSize: 13, color: '#888', margin: 0 }}>가입 시 입력한 이름과 연락처를 입력해 주세요.</p>
              </div>

              <label style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 6, display: 'block' }}>이름</label>
              <input type="text" value={findName} onChange={e => setFindName(e.target.value)} placeholder="이름 입력"
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, marginBottom: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} />

              <label style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 6, display: 'block' }}>연락처</label>
              <input type="tel" value={findPhone} onChange={e => {
                let val = e.target.value.replace(/[^0-9]/g, '');
                if (val.length > 3 && val.length <= 7) val = val.slice(0, 3) + '-' + val.slice(3);
                else if (val.length > 7) val = val.slice(0, 3) + '-' + val.slice(3, 7) + '-' + val.slice(7, 11);
                setFindPhone(val);
              }} placeholder="010-0000-0000" maxLength={13}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, marginBottom: 20, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} />

              <button onClick={handleFindAccount} disabled={findLoading}
                style={{ width: '100%', padding: '12px 0', background: '#1e56a0', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16 }}>
                {findLoading ? '조회 중...' : '계정 찾기'}
              </button>

              {/* 결과 표시 */}
              {findResult && (
                <div style={{ padding: '16px', borderRadius: 8, background: findResult.found ? '#f0fdf4' : '#fef2f2', border: `1px solid ${findResult.found ? '#bbf7d0' : '#fecaca'}`, marginBottom: 16 }}>
                  {findResult.found ? (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 14, color: '#166534', fontWeight: 700, marginBottom: 8 }}>✅ 회원 정보를 찾았습니다!</div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 20, background: providerColor(findResult.provider), border: '1px solid #ddd', marginBottom: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: findResult.provider === 'naver' ? '#fff' : '#333' }}>
                          {providerLabel(findResult.provider)}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{findResult.email}</div>
                      <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>위 소셜 계정으로 로그인해 주세요.</div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', fontSize: 14, color: '#991b1b', fontWeight: 600 }}>
                      ❌ 일치하는 회원 정보가 없습니다.
                    </div>
                  )}
                </div>
              )}

              <button onClick={() => { setShowFindAccount(false); setFindResult(null); }}
                style={{ width: '100%', padding: '10px 0', background: 'none', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, color: '#666', cursor: 'pointer', fontFamily: 'inherit' }}>
                ← 뒤로 돌아가기
              </button>
            </div>
          ) : (
            /* ━━━ 일반 모드 (회원가입/로그인) ━━━ */
            <div style={{ padding: '40px 32px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* 로고 원형 */}
              <div style={{ width: 80, height: 80, borderRadius: '50%', border: '1px solid #eee', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, boxShadow: '0 2px 6px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
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
              <ul style={{ width: '100%', listStyle: 'none', margin: '0 0 28px 0', background: '#f4f6fa', borderRadius: '10px', padding: '18px 20px', border: '1px solid #eef0f5' }}>
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

              {/* ━━━ 소셜 로그인 버튼 ━━━ */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* 구글 (메인 - 추천) */}
                <button onClick={() => handleOAuthLogin('google')}
                  style={{ width: '100%', background: '#fff', border: '2px solid #4285F4', borderRadius: 8, padding: '13px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontWeight: 'bold', fontSize: 15, color: '#222', boxShadow: '0 2px 8px rgba(66,133,244,0.15)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', position: 'relative' }}
                  onMouseOver={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(66,133,244,0.25)'; e.currentTarget.style.background = '#f8faff'; }}
                  onMouseOut={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(66,133,244,0.15)'; e.currentTarget.style.background = '#fff'; }}
                >
                  <span style={{ position: 'absolute', top: -9, right: 14, background: '#4285F4', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10, letterSpacing: 0.5 }}>추천</span>
                  <svg width="20" height="20" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  Google 계정으로 시작하기
                </button>

                {/* 카카오 */}
                <button onClick={() => handleOAuthLogin('kakao')}
                  style={{ width: '100%', background: '#FEE500', border: 'none', borderRadius: 8, padding: '13px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontWeight: 'bold', fontSize: 15, color: '#000', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                  onMouseOver={e => (e.currentTarget.style.background = '#f5dc00')}
                  onMouseOut={e => (e.currentTarget.style.background = '#FEE500')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#3C1E1E" d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24l-1.12 4.16c-.1.36.3.65.6.44l4.94-3.26c.39.04.79.06 1.2.06 5.52 0 10-3.36 10-7.64C22 6.36 17.52 3 12 3z"/></svg>
                  카카오 계정으로 시작하기
                </button>
              </div>

              {/* 계정 찾기 링크 */}
              <button onClick={() => { setShowFindAccount(true); setFindResult(null); }}
                style={{ marginTop: 24, background: 'none', border: 'none', fontSize: 12, color: '#999', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
                onMouseOver={e => (e.currentTarget.style.color = '#1e56a0')}
                onMouseOut={e => (e.currentTarget.style.color = '#999')}
              >
                어떤 계정으로 가입했는지 모르시나요?
              </button>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div style={{ borderTop: '1px solid #eee', padding: '14px 0', textAlign: 'center', fontSize: 12, color: '#888', cursor: 'pointer', background: '#fff' }}>
          고객센터
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
