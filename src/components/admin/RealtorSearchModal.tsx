'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';

export interface RealtorInfo {
  compName: string;
  ceo: string;
  addr: string;
  regNum: string;
  status: string;
}

interface RealtorSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (info: RealtorInfo) => void;
}

export default function RealtorSearchModal({ isOpen, onClose, onSelect }: RealtorSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RealtorInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return alert("중개사무소 상호명을 입력해주세요.");

    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/realtor-search?q=${encodeURIComponent(query)}`);
      const body = await res.json();
      
      if (body.success) {
        setResults(body.list || []);
      } else {
        alert(body.error || "검색 중 오류가 발생했습니다.");
        setResults([]);
      }
    } catch (err) {
      console.error(err);
      alert("검색에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: RealtorInfo) => {
    if (item.status && !item.status.includes('영업중') && !item.status.includes('운영')) {
      if (!confirm(`현재 해당 중개사무소의 상태가 [${item.status}] 입니다.\n이대로 선택하시겠습니까?`)) {
        return;
      }
    }
    onSelect(item);
  };

  const modalContent = (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999999
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, width: 600, maxWidth: '90%', 
        maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #eee' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>국가 DB 중개사무소 검색</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#888' }}>&times;</button>
        </div>

        <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input 
              type="text" 
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="예) 공실부동산, 중앙공인중개사" 
              style={{ flex: 1, padding: '12px 16px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, outline: 'none' }}
              autoFocus
            />
            <button 
              type="submit" 
              disabled={loading}
              style={{ padding: '0 24px', background: '#1e56a0', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? '검색 중...' : '검색'}
            </button>
          </form>

          {searched && (
            <div style={{ background: '#f8f9fa', borderRadius: 8, overflow: 'hidden', border: '1px solid #eee' }}>
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>조회 중입니다...</div>
              ) : results.length > 0 ? (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {results.slice(0, 50).map((r, i) => (
                    <li key={i} style={{ borderBottom: i < results.length - 1 ? '1px solid #eee' : 'none', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#111', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {r.compName}
                          {r.status && <span style={{ fontSize: 11, padding: '2px 6px', background: r.status.includes('영업중') ? '#e8f5e9' : '#ffebee', color: r.status.includes('영업중') ? '#2e7d32' : '#c62828', borderRadius: 4, fontWeight: 700 }}>{r.status}</span>}
                        </div>
                        <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>대표자: {r.ceo} | 등록번호: {r.regNum}</div>
                        <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{r.addr}</div>
                      </div>
                      <button 
                        onClick={() => handleSelect(r)}
                        style={{ background: '#ecf3fb', color: '#1e56a0', border: '1px solid #d0e1f9', padding: '8px 16px', borderRadius: 6, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: 12 }}
                      >
                        이 업소 선택
                      </button>
                    </li>
                  ))}
                  {results.length > 50 && (
                    <div style={{ padding: 12, textAlign: 'center', background: '#f5f5f5', color: '#888', fontSize: 12 }}>
                      검색 결과가 너무 많습니다. 50개만 표시됩니다. 상세히 검색해주세요.
                    </div>
                  )}
                </ul>
              ) : (
                <div style={{ padding: 40, textAlign: 'center', color: '#888', lineHeight: 1.6 }}>
                  "{query}"<br/>검색 결과가 없습니다.<br/><span style={{ fontSize: 13 }}>정확한 상호명을 입력하시거나, 직접 입력을 이용해주세요.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
