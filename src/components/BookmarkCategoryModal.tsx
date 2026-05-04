'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  getBookmarkCategories, 
  createBookmarkCategory, 
  setArticleBookmarkCategory, 
  setVacancyBookmarkCategory 
} from '@/app/actions/bookmark';

interface BookmarkCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  itemId: string | number;
  type: 'ARTICLE' | 'VACANCY';
  onSuccess?: () => void;
}

export default function BookmarkCategoryModal({ 
  isOpen, onClose, userId, itemId, type, onSuccess 
}: BookmarkCategoryModalProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      loadCategories();
    } else {
      document.body.style.overflow = '';
      setNewCategoryName('');
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const loadCategories = async () => {
    setLoading(true);
    const res = await getBookmarkCategories(userId, type);
    if (res.success && res.categories) {
      setCategories(res.categories);
    }
    setLoading(false);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || creating) return;
    setCreating(true);
    const res = await createBookmarkCategory(userId, newCategoryName.trim(), type);
    if (res.success && res.category) {
      setCategories([...categories, res.category]);
      setNewCategoryName('');
    } else {
      alert('폴더 생성에 실패했습니다: ' + res.error);
    }
    setCreating(false);
  };

  const handleSelectCategory = async (categoryId: string | null) => {
    if (saving) return;
    setSaving(true);
    let res;
    if (type === 'ARTICLE') {
      res = await setArticleBookmarkCategory(userId, itemId, categoryId);
    } else {
      res = await setVacancyBookmarkCategory(userId, String(itemId), categoryId);
    }

    if (res.success) {
      if (onSuccess) onSuccess();
      onClose();
    } else {
      alert('저장에 실패했습니다: ' + res.error);
    }
    setSaving(false);
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        width: '100vw', height: '100vh', zIndex: 99999999,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: 0, boxSizing: 'border-box',
      }}
    >
      {/* 딤 배경 */}
      <div 
        onClick={onClose} 
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', transition: 'opacity 0.3s' }} 
      />

      {/* 바텀시트 / 모달 컨테이너 */}
      <div 
        style={{ 
          position: 'relative', background: '#fff', width: '100%', maxWidth: '440px', 
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          display: 'flex', flexDirection: 'column', maxHeight: '85vh',
          animation: 'slideUp 0.3s ease-out'
        }}
      >
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>
        
        {/* 핸들바 (모바일용) */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
          <div style={{ width: 40, height: 4, background: '#e5e7eb', borderRadius: 2 }} />
        </div>

        <div style={{ padding: '0 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111' }}>어느 폴더에 저장할까요?</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, color: '#aaa', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 20px 24px' }}>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#888', fontSize: 14 }}>불러오는 중...</div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* 기본 폴더 */}
              <li>
                <button 
                  onClick={() => handleSelectCategory(null)}
                  disabled={saving}
                  style={{
                    width: '100%', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#f8f9fa', border: '1px solid #e5e7eb', borderRadius: 12, cursor: 'pointer',
                    fontSize: 15, fontWeight: 600, color: '#111', fontFamily: 'inherit', textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>📁</span>
                    기본 폴더
                  </div>
                  <span style={{ color: '#aaa', fontSize: 13, fontWeight: 400 }}>선택</span>
                </button>
              </li>

              {/* 사용자 생성 폴더들 */}
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button 
                    onClick={() => handleSelectCategory(cat.id)}
                    disabled={saving}
                    style={{
                      width: '100%', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, cursor: 'pointer',
                      fontSize: 15, fontWeight: 600, color: '#111', fontFamily: 'inherit', textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>📂</span>
                      {cat.name}
                    </div>
                    <span style={{ color: '#aaa', fontSize: 13, fontWeight: 400 }}>선택</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* 새 폴더 추가 */}
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px dashed #e5e7eb' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#666', marginBottom: 8 }}>+ 새 폴더 추가</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input 
                type="text" 
                value={newCategoryName} 
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => { if(e.key === 'Enter') handleCreateCategory(); }}
                placeholder="폴더 이름을 입력하세요"
                style={{
                  flex: 1, padding: '12px 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit'
                }}
              />
              <button 
                onClick={handleCreateCategory}
                disabled={!newCategoryName.trim() || creating}
                style={{
                  padding: '0 20px', background: newCategoryName.trim() ? '#1e56a0' : '#e5e7eb', color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: newCategoryName.trim() ? 'pointer' : 'default', fontFamily: 'inherit'
                }}
              >
                추가
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}