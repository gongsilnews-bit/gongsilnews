'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

function MobileLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnToParam = searchParams.get('returnTo') || '/m';

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
          redirectTo: `${window.location.origin}/auth/callback?from=mobile&returnTo=${returnTo}`,
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
    <div style={{ minHeight: '85vh', padding: '24px 20px', fontFamily: "'Pretendard', -apple-system, sans-serif", background: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      
      {showFindAccount ? (
        /* Account Search Mode */
        <div>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: '0 0 6px' }}>계정 찾기</h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>가입 시 입력한 이름과 연락처를 입력해 주세요.</p>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6, display: 'block' }}>이름</label>
            <input 
              type="text" 
              value={findName} 
              onChange={e => setFindName(e.target.value)} 
              placeholder="이름 입력"
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} 
            />
          </div>

          <div style={{ marginBottom: 20 }}>
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
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} 
            />
          </div>

          <button 
            onClick={handleFindAccount} 
            disabled={findLoading}
            style={{ width: '100%', padding: '13px 0', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 12 }}
          >
            {findLoading ? '조회 중...' : '계정 찾기'}
          </button>

          {findResult && (
            <div style={{ padding: '14px', borderRadius: 8, background: findResult.found ? '#f0fdf4' : '#fef2f2', border: `1px solid ${findResult.found ? '#bbf7d0' : '#fecaca'}`, marginBottom: 14 }}>
              {findResult.found ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: '#166534', fontWeight: 700, marginBottom: 8 }}>✅ 회원 정보를 찾았습니다!</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 20, background: providerColor(findResult.provider), border: '1px solid #ddd', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: findResult.provider === 'naver' ? '#fff' : '#333' }}>
                      {providerLabel(findResult.provider)}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{findResult.email}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>위 소셜 계정으로 로그인해 주세요.</div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', fontSize: 13, color: '#991b1b', fontWeight: 600 }}>
                  ❌ 일치하는 회원 정보가 없습니다.
                </div>
              )}
            </div>
          )}

          <button 
            onClick={() => { setShowFindAccount(false); setFindResult(null); }}
            style={{ width: '100%', padding: '11px 0', background: 'none', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13.5, color: '#475569', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
          >
            ← 뒤로 돌아가기
          </button>
        </div>
      ) : (
        /* Main Login Mode */
        <div>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            {/* Logo */}
            <div style={{ width: 64, height: 64, borderRadius: '50%', border: '1px solid #eee', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="24" cy="24" r="24" fill="#222222" />
                <circle cx="24" cy="24" r="16" fill="#FFFFFF" />
                <path d="M19 15.34L34 24L19 32.66Z" fill="#fbbf24" stroke="#222222" strokeWidth="3" />
              </svg>
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
              <span style={{ color: '#2563eb' }}>11만</span> 부동산 무료 정보채널
            </h3>
            
            <p style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.5, margin: 0 }}>
              단 한 번의 로그인으로 공동중개망부터<br />
              AI 물건보고서까지 모두 무료로 이용하세요.
            </p>
          </div>

          {/* Benefits list */}
          <ul style={{ listStyle: 'none', margin: '0 0 28px 0', background: '#f8fafc', borderRadius: 12, padding: '16px 18px', border: '1px solid #f1f5f9' }}>
            {[
              <><strong style={{color: '#0f172a', fontWeight: 800}}>로컬 부동산이 직접 전달하는</strong> 시세 현황 뉴스</>,
              <><strong style={{color: '#0f172a', fontWeight: 800}}>중개사 필수</strong> 1초 완성 AI 물건보고서 무제한</>,
              <><strong style={{color: '#0f172a', fontWeight: 800}}>대한민국 부동산 누구나</strong> 100% 무료 공동중개</>
            ].map((item, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#475569', marginBottom: i < 2 ? 10 : 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span style={{ lineHeight: 1.4 }}>{item}</span>
              </li>
            ))}
          </ul>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* 구글 */}
            <button 
              onClick={() => handleOAuthLogin('google')}
              style={{
                width: '100%',
                background: '#ffffff',
                border: '2px solid #cbd5e1',
                borderRadius: 8,
                padding: '13px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                fontWeight: 800,
                fontSize: 14.5,
                color: '#0f172a',
                cursor: 'pointer',
                fontFamily: 'inherit',
                position: 'relative'
              }}
            >
              <span style={{ position: 'absolute', top: -9, right: 12, background: '#2563eb', color: '#fff', fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 10 }}>추천</span>
              <svg width="18" height="18" viewBox="0 0 48 48">
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
                padding: '14px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                fontWeight: 800,
                fontSize: 14.5,
                color: '#1e1e1e',
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#3C1E1E" d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24l-1.12 4.16c-.1.36.3.65.6.44l4.94-3.26c.39.04.79.06 1.2.06 5.52 0 10-3.36 10-7.64C22 6.36 17.52 3 12 3z"/></svg>
              카카오 계정으로 시작하기
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button 
              onClick={() => { setShowFindAccount(true); setFindResult(null); }}
              style={{ background: 'none', border: 'none', fontSize: 12, color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
            >
              어떤 계정으로 가입했는지 모르시나요?
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 32, paddingTop: 14, borderTop: '1px solid #f1f5f9', textAlign: 'center', fontSize: 12, color: '#cbd5e1' }}>
        공실뉴스 고객센터
      </div>

      {/* ===== Membership Guide & Workflow (Clean & Premium Theme) ===== */}
      <div style={{ marginTop: 20 }}>
        <div style={{ 
          background: '#f8fafc', 
          border: '1px solid #e2e8f0', 
          borderRadius: 12, 
          padding: '14px 16px', 
          fontSize: '12px', 
          lineHeight: '1.6', 
          color: '#475569' 
        }}>
          <div style={{ marginBottom: 6, display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#1e293b', flexShrink: 0 }}>· 일반회원 :</span>
            <span>공실등록 3건 무료, 경공매 열람 가능, <span style={{ fontWeight: 600, color: '#64748b' }}>공동중개 열람 불가</span></span>
          </div>
          <div style={{ marginBottom: 10, display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#1e293b', flexShrink: 0 }}>· 부동산회원 :</span>
            <span>공동중개 3건 등록 무료, 경공매 열람 가능, <span style={{ fontWeight: 600, color: '#1e293b' }}>공동중개 열람 가능</span></span>
          </div>
          
          <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: 8, fontSize: '10.5px', color: '#64748b', wordBreak: 'keep-all' }}>
            <strong style={{ color: '#1e293b', marginRight: 4 }}>부동산 회원가입 절차:</strong><br />
            회원가입 ➔ 관리자 ➔ 내 정보 ➔ 중개소 가입 및 서류 제출 ➔ 승인완료
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MobileLoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif', color: '#888' }}>로딩 중...</div>}>
      <MobileLoginClient />
    </Suspense>
  );
}
