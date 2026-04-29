import React from 'react';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100dvh', backgroundColor: '#fff', zIndex: 99999, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid #f3f4f6' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>전체 검색 조건</h2>
        <button onClick={onClose} style={{ padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: '#374151' }}>지역 검색</h3>
          <input type="text" placeholder="지역, 지하철역, 건물명" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb', fontSize: '15px' }} />
        </div>
        
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: '#374151' }}>거래 유형</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['매매', '전세', '월세'].map(type => (
              <button key={type} style={{ flex: 1, padding: '10px 0', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: '#fff', fontSize: '14px', color: '#4b5563' }}>{type}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: '#374151' }}>가격 (보증금/월세)</h3>
          <div style={{ height: '40px', backgroundColor: '#f3f4f6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '13px' }}>가격 슬라이더 영역</div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: '#374151' }}>면적</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {['10평 이하', '10~20평', '20~30평', '30~40평', '40평 이상'].map(area => (
              <button key={area} style={{ padding: '8px 12px', borderRadius: '20px', border: '1px solid #e5e7eb', backgroundColor: '#fff', fontSize: '13px', color: '#4b5563' }}>{area}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding: '16px', borderTop: '1px solid #f3f4f6' }}>
        <button onClick={onClose} style={{ width: '100%', padding: '14px 0', backgroundColor: '#1a2e50', color: '#fff', fontWeight: 700, borderRadius: '8px', fontSize: '16px', border: 'none' }}>조건 적용하여 검색</button>
      </div>
    </div>
  );
}
