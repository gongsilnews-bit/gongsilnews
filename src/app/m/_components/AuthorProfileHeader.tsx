import React from 'react';
import { useRouter } from 'next/navigation';

export default function AuthorProfileHeader({ profile }: { profile: any }) {
  const router = useRouter();
  
  if (!profile) return null;

  return (
    <div style={{ position: 'relative', width: '100%', background: 'linear-gradient(135deg, #2b1139 0%, #1a0824 100%)', color: '#fff', padding: '16px', paddingTop: '20px', paddingBottom: '60px' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button onClick={() => router.push('/m/news?tab=all')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
          전체 기자
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18L15 12L9 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Main card */}
      <div style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', padding: '24px', position: 'relative', zIndex: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
          {profile.profile_image_url ? (
            <div style={{ width: '72px', height: '72px', borderRadius: '24px', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(255,255,255,0.2)' }}>
              <img src={profile.profile_image_url} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
            <div style={{ width: '72px', height: '72px', borderRadius: '24px', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid rgba(255,255,255,0.2)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '12px' }}>
                {profile.role === 'ADMIN' ? '기자' : '부동산기자'}
              </span>
            </div>
            <div style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px' }}>
              {profile.name}
            </div>
          </div>
        </div>

        <div style={{ fontSize: '15px', lineHeight: '1.6', color: 'rgba(255,255,255,0.9)', marginBottom: '20px', wordBreak: 'keep-all' }}>
          {profile.introduction || '공실뉴스와 함께하는 소중한 기자님입니다. 항상 신속하고 정확한 뉴스를 전달하기 위해 최선을 다하겠습니다.'}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div>구독 {Math.floor(Math.random()*1000)} | 응원 {profile.point_balance || Math.floor(Math.random()*5000)}</div>
          <div style={{width: 1, height: 10, background: 'rgba(255,255,255,0.3)'}}></div>
          <div>{profile.phone || profile.email || '연락처 정보 없음'}</div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ flex: 1, padding: '12px 0', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
            + 구독
          </button>
          <button style={{ flex: 1, padding: '12px 0', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', color: '#fff', fontSize: '14px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
            👏 응원
          </button>
          <button style={{ width: '44px', height: '44px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
            ✉️
          </button>
          <button style={{ width: '44px', height: '44px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
            🔗
          </button>
        </div>
      </div>
      
      {/* Decorative overlapping bottom for smooth transition to white list */}
      <div style={{ position: 'absolute', bottom: '-20px', left: 0, width: '100%', height: '40px', background: '#fff', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', zIndex: 5 }}></div>
    </div>
  );
}
