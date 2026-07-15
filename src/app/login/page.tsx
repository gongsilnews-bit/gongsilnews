'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnToParam = searchParams.get('returnTo') || '/';

  const [showFindAccount, setShowFindAccount] = useState(false);
  const [findName, setFindName] = useState('');
  const [findPhone, setFindPhone] = useState('');
  const [findResult, setFindResult] = useState<{ found: boolean; email?: string; provider?: string } | null>(null);
  const [findLoading, setFindLoading] = useState(false);

  const handleOAuthLogin = async (providerName: 'google' | 'kakao' | 'naver') => {
    try {
      const supabase = createClient();
      const returnTo = encodeURIComponent(returnToParam);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: providerName as any,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?returnTo=${returnTo}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      alert('로그인 오류: ' + (err?.message || String(err)));
    }
  };

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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', fontFamily: "'Pretendard Variable', -apple-system, sans-serif", background: '#f8fafc' }}>
      
      {/* ━━━ Left Column: Premium Branding Promo ━━━ */}
      <div 
        style={{
          flex: 1.2,
          background: 'radial-gradient(circle at top right, #1e1b4b 0%, #090d16 100%)',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 80px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'absolute', top: 40, left: 60, cursor: 'pointer' }} onClick={() => router.push('/')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="24" fill="#222" />
              <circle cx="24" cy="24" r="16" fill="#FFF" />
              <path d="M19 15.34L34 24L19 32.66Z" fill="#fbbf24" stroke="#222" strokeWidth="3" />
            </svg>
            <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.5px', color: '#fff' }}>공실뉴스</span>
          </div>
        </div>

        <div style={{ maxWidth: 520, zIndex: 2, marginTop: 40 }}>
          <span style={{ display: 'inline-block', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 50, padding: '6px 14px', fontSize: 13, color: '#fbbf24', fontWeight: 800, marginBottom: 20 }}>
            ✨ 공실뉴스 스마트 중개망
          </span>
          <h1 style={{ fontSize: 36, fontWeight: 900, lineHeight: 1.35, marginBottom: 24, wordBreak: 'keep-all', letterSpacing: '-1px' }}>
            부동산이세요?<br />
            <span style={{ color: '#fbbf24' }}>공동중개 등록/열람 평생 무료!</span>
          </h1>
          <p style={{ fontSize: 16, color: '#94a3b8', lineHeight: 1.6, marginBottom: 40, wordBreak: 'keep-all' }}>
            지금 가입하시면, 공동중개 3건 등록/열람, AI물건보고서, 그리고 전국 법원 경공매 정보를 무료로 열람하실 수 있습니다.
          </p>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px 28px' }}>
            {[
              <><strong style={{color: '#fff', fontWeight: 800}}>전국 부동산 누구나 가입하는</strong> 100% 무료 공동중개망</>,
              <><strong style={{color: '#fff', fontWeight: 800}}>중개사에게 꼭 필요한</strong> 1초 완성 AI 물건보고서 3건 무료</>,
              <><strong style={{color: '#fff', fontWeight: 800}}>실시간 업데이트</strong> 전국 법원 경공매 물건 무료 열람</>
            ].map((item, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: '#cbd5e1', marginBottom: i < 2 ? 18 : 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '24px', fontSize: '13px', lineHeight: '1.7', color: '#94a3b8' }}>
            <div style={{ marginBottom: 6, display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', flexShrink: 0 }}>· 일반회원 :</span>
              <span>공실등록 3건 무료, 경공매 열람 가능, <span style={{ color: '#64748b' }}>공동중개 열람 불가</span></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', flexShrink: 0 }}>· 부동산회원 :</span>
              <span>공동중개 3건 등록 무료, 경공매 열람 가능, <span style={{ color: '#fbbf24', fontWeight: 600 }}>공동중개 열람 가능</span></span>
            </div>
          </div>
        </div>


      </div>

      {/* ━━━ Right Column: Login Card Container ━━━ */}
      <div 
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px 40px',
          background: '#ffffff'
        }}
      >
        <div style={{ width: '100%', maxWidth: 400 }}>
          
          {showFindAccount ? (
            /* Account Search Mode */
            <div>
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: '0 0 8px' }}>계정 찾기</h2>
                <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>가입 시 입력한 이름과 연락처를 입력해 주세요.</p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6, display: 'block' }}>이름</label>
                <input 
                  type="text" 
                  value={findName} 
                  onChange={e => setFindName(e.target.value)} 
                  placeholder="이름 입력"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} 
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6, display: 'block' }}>연락처</label>
                <input 
                  type="tel" 
                  value={findPhone} 
                  onChange={e => {
                    let val = e.target.value.replace(/[^0-9]/g, '');
                    if (val.length > 3 && val.length <= 7) val = val.slice(0, 3) + '-' + val.slice(3);
                    else if (val.length > 7) val = val.slice(0, 3) + '-' + val.slice(3, 7) + '-' + val.slice(7, 11);
                    setFindPhone(val);
                  }} 
                  placeholder="010-0000-0000" 
                  maxLength={13}
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} 
                />
              </div>

              <button 
                onClick={handleFindAccount} 
                disabled={findLoading}
                style={{ width: '100%', padding: '14px 0', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16 }}
              >
                {findLoading ? '조회 중...' : '계정 찾기'}
              </button>

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
                      <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{findResult.email}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>위 소셜 계정으로 로그인해 주세요.</div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', fontSize: 14, color: '#991b1b', fontWeight: 600 }}>
                      ❌ 일치하는 회원 정보가 없습니다.
                    </div>
                  )}
                </div>
              )}

              <button 
                onClick={() => { setShowFindAccount(false); setFindResult(null); }}
                style={{ width: '100%', padding: '12px 0', background: 'none', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, color: '#475569', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
              >
                ← 뒤로 돌아가기
              </button>
            </div>
          ) : (
            /* Main Login Mode */
            <div>
              <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '0 0 10px', letterSpacing: '-0.5px' }}>공실뉴스 시작하기</h2>
                <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                  3초 만에 소셜 연동으로 간편하게 시작하세요.<br />
                  첫 로그인 시 자동으로 가입이 완료됩니다.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* 구글 */}
                <button 
                  onClick={() => handleOAuthLogin('google')}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '2px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '14px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    fontWeight: 800,
                    fontSize: 15,
                    color: '#0f172a',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                    position: 'relative'
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#ffffff'; }}
                >
                  <span style={{ position: 'absolute', top: -9, right: 14, background: '#2563eb', color: '#fff', fontSize: 10, fontWeight: 900, padding: '2px 8px', borderRadius: 10, letterSpacing: 0.5 }}>추천</span>
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
                    width: '100%',
                    background: '#FEE500',
                    border: 'none',
                    borderRadius: 8,
                    padding: '15px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    fontWeight: 800,
                    fontSize: 15,
                    color: '#1e1e1e',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s'
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = '#f5dc00')}
                  onMouseOut={e => (e.currentTarget.style.background = '#FEE500')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#3C1E1E" d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24l-1.12 4.16c-.1.36.3.65.6.44l4.94-3.26c.39.04.79.06 1.2.06 5.52 0 10-3.36 10-7.64C22 6.36 17.52 3 12 3z"/></svg>
                  카카오 계정으로 시작하기
                </button>
              </div>

              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <button 
                  onClick={() => { setShowFindAccount(true); setFindResult(null); }}
                  style={{ background: 'none', border: 'none', fontSize: 13, color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
                  onMouseOver={e => (e.currentTarget.style.color = '#2563eb')}
                  onMouseOut={e => (e.currentTarget.style.color = '#94a3b8')}
                >
                  어떤 계정으로 가입했는지 모르시나요?
                </button>
              </div>
            </div>
          )}

          <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 40, paddingTop: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>공실뉴스 고객센터</div>
            <div style={{ fontSize: 11, color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ fontWeight: 800, color: '#475569', marginBottom: 6, fontSize: 11.5, textAlign: 'left' }}>부동산 회원가입 절차</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, color: '#64748b' }}>
                <span>회원가입</span>
                <span style={{ color: '#cbd5e1' }}>➔</span>
                <span>관리자페이지</span>
                <span style={{ color: '#cbd5e1' }}>➔</span>
                <span>정보설정</span>
                <span style={{ color: '#cbd5e1' }}>➔</span>
                <span style={{ fontWeight: 600 }}>중개소 가입/서류제출</span>
                <span style={{ color: '#cbd5e1' }}>➔</span>
                <span style={{ fontWeight: 800, color: '#2563eb' }}>승인완료</span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: 'center', fontFamily: 'sans-serif', color: '#666' }}>로딩 중...</div>}>
      <LoginClient />
    </Suspense>
  );
}
