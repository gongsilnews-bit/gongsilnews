"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RecentSearch {
  term: string;
  date: string;
}

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('gongsil_recent_searches');
      if (saved) {
        try {
          setRecentSearches(JSON.parse(saved));
        } catch (e) {
          // ignore
        }
      }
    }
  }, [isOpen]);

  const saveRecentSearch = (term: string) => {
    if (!term.trim()) return;
    const now = new Date();
    const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}.`;
    
    let updated = [...recentSearches];
    updated = updated.filter(item => item.term !== term);
    updated.unshift({ term, date: dateStr });
    updated = updated.slice(0, 10);
    
    setRecentSearches(updated);
    localStorage.setItem('gongsil_recent_searches', JSON.stringify(updated));
  };

  const handleSearch = (term: string) => {
    if (!term.trim()) return;
    saveRecentSearch(term);
    onClose();
    router.push(`/m/news?keyword=${encodeURIComponent(term)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(searchTerm);
    }
  };

  const removeRecentSearch = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter(item => item.term !== term);
    setRecentSearches(updated);
    localStorage.setItem('gongsil_recent_searches', JSON.stringify(updated));
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('gongsil_recent_searches');
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100dvh', backgroundColor: '#fff', zIndex: 99999, display: 'flex', flexDirection: 'column' }}>
      {/* Header with Input */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f3f4f6', gap: '12px' }}>
        <button onClick={onClose} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="검색어를 입력해 주세요." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: 'none', backgroundColor: '#f9fafb', fontSize: '16px', outline: 'none' }} 
            autoFocus
          />
        </div>
        <button onClick={() => handleSearch(searchTerm)} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a2e50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </button>
      </div>

      <div style={{ flex: 1, padding: '20px 16px', overflowY: 'auto' }}>
        {recentSearches.length > 0 ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111' }}>최근 검색어</h3>
              <button onClick={clearAllRecent} style={{ fontSize: '13px', color: '#999', background: 'none', border: 'none', cursor: 'pointer' }}>전체삭제</button>
            </div>
            <div>
              {recentSearches.map((item, i) => (
                <div key={i} onClick={() => handleSearch(item.term)} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', cursor: 'pointer' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginRight: '12px' }}>
                    <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <span style={{ flex: 1, fontSize: '16px', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.term}</span>
                  <span style={{ fontSize: '13px', color: '#999', marginLeft: '12px' }}>{item.date}</span>
                  <button onClick={(e) => removeRecentSearch(item.term, e)} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', marginLeft: '8px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999', fontSize: '15px' }}>
            최근 검색어 내역이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
