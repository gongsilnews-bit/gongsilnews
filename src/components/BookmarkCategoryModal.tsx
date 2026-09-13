'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  getBookmarkCategories, 
  createBookmarkCategory, 
  setArticleBookmarkCategory, 
  setVacancyBookmarkCategory,
  updateBookmarkCategory,
  deleteBookmarkCategory
} from '@/app/actions/bookmark';

interface BookmarkCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  itemId: string | number | null;
  type: 'ARTICLE' | 'VACANCY';
  onSuccess?: () => void;
}

export default function BookmarkCategoryModal({ 
  isOpen, onClose, userId, itemId, type, onSuccess 
}: BookmarkCategoryModalProps) {
  const isManagementMode = itemId == null;
  const modalTitle = isManagementMode ? '폴더 관리' : '이동할 폴더를 선택하세요';
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !mounted) return;
    const viewport = window.visualViewport;
    const updateViewport = () => {
      const overlay = overlayRef.current;
      if (!overlay) return;
      overlay.style.setProperty('--bookmark-height', `${viewport?.height ?? window.innerHeight}px`);
      overlay.style.setProperty('--bookmark-top', `${viewport?.offsetTop ?? 0}px`);
      const input = document.activeElement;
      if (input instanceof HTMLInputElement && overlay.contains(input)) {
        input.scrollIntoView({ block: 'nearest' });
      }
    };
    updateViewport();
    viewport?.addEventListener('resize', updateViewport);
    viewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);
    return () => {
      viewport?.removeEventListener('resize', updateViewport);
      viewport?.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
    };
  }, [isOpen, mounted]);

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

  const handleEditCategory = async (categoryId: string) => {
    if (!editCategoryName.trim()) return;
    const res = await updateBookmarkCategory(categoryId, editCategoryName.trim());
    if (res.success) {
      setCategories(categories.map(c => c.id === categoryId ? { ...c, name: editCategoryName.trim() } : c));
      setEditingCategory(null);
    } else {
      alert('폴더 수정에 실패했습니다.');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('이 폴더를 삭제하시겠습니까? 폴더 내 항목은 유지됩니다.')) return;
    const res = await deleteBookmarkCategory(categoryId);
    if (res.success) {
      setCategories(categories.filter(c => c.id !== categoryId));
    } else {
      alert('폴더 삭제에 실패했습니다.');
    }
  };

  const handleSelectCategory = async (categoryId: string | null) => {
    if (saving || itemId == null) return;
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
      ref={overlayRef}
      className="bookmark-category-overlay"
      style={{
        position: 'fixed', left: 0, right: 0,
        width: '100%', zIndex: 99999999,
        display: 'flex', justifyContent: 'center',
        boxSizing: 'border-box',
      }}
    >
      {/* 딤 배경 */}
      <div 
        onClick={onClose} 
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', transition: 'opacity 0.3s' }} 
      />

      {/* 바텀시트 / 모달 컨테이너 */}
      <div 
        className="bookmark-category-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={modalTitle}
        style={{ 
          position: 'relative', background: '#fff', width: '100%',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <style>{`
          .bookmark-category-overlay { top: var(--bookmark-top, 0px); height: var(--bookmark-height, 100dvh); align-items: stretch; padding: 0; }
          .bookmark-category-dialog { height: 100%; min-height: 0; overflow: hidden; }
          .bookmark-category-header { padding: max(20px, env(safe-area-inset-top)) 20px 16px; flex-shrink: 0; }
          .bookmark-category-content { display: flex; flex-direction: column; gap: 24px; min-height: 0; overscroll-behavior: contain; padding-bottom: max(24px, env(safe-area-inset-bottom)) !important; }
          .bookmark-category-list { order: 2; }
          .bookmark-category-create { order: 1; padding-bottom: 16px; border-bottom: 1px dashed #e5e7eb; }
          .bookmark-category-dialog input { min-width: 0; font-size: 16px !important; scroll-margin-block: 16px; }
          .bookmark-category-dialog li button { min-width: 0; overflow-wrap: anywhere; }
          @media (min-width: 768px) {
            .bookmark-category-overlay { top: 0; height: 100dvh; align-items: center; padding: 24px; }
            .bookmark-category-dialog { height: auto; max-width: 440px; border-radius: 20px; max-height: calc(100dvh - 48px); box-shadow: 0 24px 80px rgba(0,0,0,.24); animation: bookmarkFadeIn .2s ease-out; }
            .bookmark-category-list { order: 1; }
            .bookmark-category-create { order: 2; padding-top: 16px; padding-bottom: 0; border-top: 1px dashed #e5e7eb; border-bottom: 0; }
          }
          @keyframes bookmarkFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>
        
        <div className="bookmark-category-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111' }}>{modalTitle}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, color: '#aaa', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
        </div>

        <div className="bookmark-category-content" style={{ overflowY: 'auto', padding: '12px 20px 24px' }}>
          <div className="bookmark-category-list">
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#888', fontSize: 14 }}>불러오는 중...</div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* 기본 폴더 */}
              <li>
                <button 
                  onClick={() => handleSelectCategory(null)}
                  disabled={saving || itemId == null}
                  style={{
                    width: '100%', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#f8f9fa', border: '1px solid #e5e7eb', borderRadius: 12, cursor: isManagementMode ? 'default' : 'pointer',
                    fontSize: 15, fontWeight: 600, color: '#111', fontFamily: 'inherit', textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>📁</span>
                    기본 폴더
                  </div>
                  {!isManagementMode && <span style={{ color: '#aaa', fontSize: 13, fontWeight: 400 }}>선택</span>}
                </button>
              </li>

              {/* 사용자 생성 폴더들 */}
              {categories.map((cat) => (
                <li key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {editingCategory === cat.id ? (
                    <div style={{ display: 'flex', width: '100%', gap: 8 }}>
                      <input 
                        type="text" 
                        value={editCategoryName} 
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        onKeyDown={(e) => { if(e.key === 'Enter') handleEditCategory(cat.id); }}
                        style={{ flex: 1, padding: '10px 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none' }}
                        autoFocus
                      />
                      <button onClick={() => handleEditCategory(cat.id)} style={{ padding: '0 12px', background: '#1e56a0', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>저장</button>
                      <button onClick={() => setEditingCategory(null)} style={{ padding: '0 12px', background: '#e5e7eb', color: '#4b5563', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>취소</button>
                    </div>
                  ) : (
                    <>
                      <button 
                        onClick={() => handleSelectCategory(cat.id)}
                        disabled={saving || itemId == null}
                        style={{
                          flex: 1, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, cursor: isManagementMode ? 'default' : 'pointer',
                          fontSize: 15, fontWeight: 600, color: '#111', fontFamily: 'inherit', textAlign: 'left'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 20 }}>📂</span>
                          {cat.name}
                        </div>
                        {!isManagementMode && <span style={{ color: '#aaa', fontSize: 13, fontWeight: 400 }}>선택</span>}
                      </button>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <button 
                          onClick={() => { setEditingCategory(cat.id); setEditCategoryName(cat.name); }}
                          style={{ background: 'none', border: 'none', color: '#4b5563', fontSize: 12, cursor: 'pointer', padding: '4px' }}
                        >수정</button>
                        <button 
                          onClick={() => handleDeleteCategory(cat.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer', padding: '4px' }}
                        >삭제</button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          </div>
          {/* 새 폴더 추가 */}
          <div className="bookmark-category-create">
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#666', marginBottom: 8 }}>+ 폴더 만들기</label>
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
                만들기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
