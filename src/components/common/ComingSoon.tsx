import React from 'react';

export default function ComingSoon() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: "'Pretendard', -apple-system, 'Apple SD Gothic Neo', sans-serif",
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        padding: '40px 30px',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        maxWidth: '480px',
        width: '100%'
      }}>
        <div style={{ marginBottom: '24px' }}>
          <span style={{ fontSize: '48px' }} aria-label="도구 아이콘">🛠️</span>
        </div>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#1e293b',
          marginBottom: '16px',
          letterSpacing: '-0.5px'
        }}>
          서비스 준비 중입니다
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#64748b',
          lineHeight: '1.6',
          marginBottom: '24px',
          wordBreak: 'keep-all'
        }}>
          더 나은 서비스를 제공하기 위해 사이트 개편 및 점검 중입니다.
          <br />
          신속하게 작업을 완료하고 다시 찾아뵙겠습니다.
        </p>
        <div style={{
          padding: '16px',
          backgroundColor: '#f1f5f9',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#475569'
        }}>
          이용에 불편을 드려 대단히 죄송합니다.
        </div>
      </div>
    </div>
  );
}
