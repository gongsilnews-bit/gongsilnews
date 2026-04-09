'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'signup' | 'login';
}

export default function AuthModal({ isOpen, onClose, initialTab = 'signup' }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'signup' | 'login'>(initialTab);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      setActiveTab(initialTab);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, initialTab]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      {/* 반투명 배경 */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* 모달 박스 */}
      <div
        style={{
          position: 'relative',
          background: '#fff',
          width: 440,
          maxWidth: '100%',
          borderRadius: 8,
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* 닫기 X 버튼 */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 20,
            background: 'none',
            border: 'none',
            fontSize: 24,
            color: '#aaa',
            cursor: 'pointer',
            zIndex: 10,
            lineHeight: 1,
            padding: 0,
          }}
        >
          ✕
        </button>

        {/* 탭 영역 */}
        <div style={{ display: 'flex', gap: 12, padding: '32px 32px 0 32px' }}>
          {/* 회원가입 탭 */}
          <button
            onClick={() => setActiveTab('signup')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 0',
              border: `1px solid ${activeTab === 'signup' ? '#1e56a0' : '#ddd'}`,
              borderRadius: 6,
              fontWeight: 'bold',
              fontSize: 14,
              cursor: 'pointer',
              background: activeTab === 'signup' ? '#f4f6fa' : '#fff',
              color: activeTab === 'signup' ? '#1e56a0' : '#444',
              transition: 'all 0.2s',
              fontFamily: 'inherit',
            }}
          >
            <svg style={{ width: 16, height: 16, marginRight: 6 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            회원가입
          </button>

          {/* 로그인 탭 */}
          <button
            onClick={() => setActiveTab('login')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 0',
              border: `1px solid ${activeTab === 'login' ? '#1e56a0' : '#ddd'}`,
              borderRadius: 6,
              fontWeight: 'bold',
              fontSize: 14,
              cursor: 'pointer',
              background: activeTab === 'login' ? '#f4f6fa' : '#fff',
              color: activeTab === 'login' ? '#1e56a0' : '#444',
              transition: 'all 0.2s',
              fontFamily: 'inherit',
            }}
          >
            <svg style={{ width: 16, height: 16, marginRight: 6 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            로그인
          </button>
        </div>

        {/* 본문 영역 */}
        <div style={{ padding: '32px 32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* 로고 원형 */}
          <div style={{ width: 64, height: 64, borderRadius: '50%', border: '1px solid #eee', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <span style={{ color: '#1e56a0', fontWeight: 800, fontSize: 14, letterSpacing: -0.5 }}>공실뉴스</span>
          </div>

          {/* 타이틀 */}
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#111', marginBottom: 8, textAlign: 'center', margin: '0 0 8px 0' }}>
            {activeTab === 'signup' ? '공실뉴스 회원이 되어 보세요' : '공실뉴스에 로그인하세요'}
          </h3>

          {/* 서브타이틀 */}
          <p style={{ fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 32, lineHeight: 1.6, margin: '0 0 32px 0' }}>
            {activeTab === 'signup'
              ? <>지금 바로 공실뉴스 회원으로 가입하시고, 독점 혜택을<br />누려보세요</>
              : '회원 전용 서비스를 이용하시려면 로그인해 주세요'}
          </p>

          {/* 혜택 리스트 (회원가입 탭에서만) */}
          {activeTab === 'signup' && (
            <ul style={{ width: '100%', listStyle: 'none', padding: 0, margin: '0 0 32px 0' }}>
              {[
                '프리미엄 부동산 뉴스와 분석 보고서 접근',
                '동네별 실시간 공실 및 매물 동향 최신 정보',
                '공실뉴스만의 독자적인 부동산 지수 열람',
                '온/오프라인 세미나 우선 참가 기회',
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#444', marginBottom: i < 3 ? 12 : 0 }}>
                  <span style={{ color: '#1e56a0', fontWeight: 'bold', marginTop: 2 }}>•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}

          {/* 안내 문구 */}
          <p style={{ fontSize: 12, color: '#888', marginBottom: 16, textAlign: 'center', margin: '0 0 16px 0' }}>
            {activeTab === 'signup' ? (
              <>이미 회원이시면 <button onClick={() => setActiveTab('login')} style={{ fontWeight: 'bold', color: '#555', cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontSize: 12, fontFamily: 'inherit' }}>로그인</button>을 클릭해 주세요</>
            ) : (
              <>아직 회원이 아니시면 <button onClick={() => setActiveTab('signup')} style={{ fontWeight: 'bold', color: '#555', cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontSize: 12, fontFamily: 'inherit' }}>회원가입</button>을 클릭해 주세요</>
            )}
          </p>

          {/* Google 버튼 */}
          <button style={{ width: '100%', background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontWeight: 'bold', fontSize: 15, color: '#222', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
            {/* Google G 로고 */}
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Google 계정으로 계속하기
          </button>
        </div>

        {/* 푸터 - 고객센터 */}
        <div style={{ borderTop: '1px solid #eee', padding: '16px 0', textAlign: 'center', fontSize: 12, color: '#888', cursor: 'pointer', background: '#fff' }}>
          고객센터
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
