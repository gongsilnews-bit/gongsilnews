"use client";

import React from "react";
import { extractYoutubeId, getYoutubeThumbnail } from "./articleFormUtils";

export interface ArticlePhotoModalsProps {
  // Video Modal
  showVideoModal: boolean;
  setShowVideoModal: (v: boolean) => void;
  modalVideoUrl: string;
  setModalVideoUrl: (v: string) => void;
  modalVideoShorts: boolean;
  setModalVideoShorts: (v: boolean) => void;
  handleVideoModalConfirm: () => void;

  // Photo Add Modal
  showPhotoModal: boolean;
  setShowPhotoModal: (v: boolean) => void;
  modalFile: File | null;
  modalPreview: string;
  modalSize: number;
  setModalSize: (v: number) => void;
  modalInsertMode: "자동" | "수동";
  setModalInsertMode: (v: "자동" | "수동") => void;
  modalAlign: "left" | "center" | "right";
  setModalAlign: (v: "left" | "center" | "right") => void;
  modalWatermark: number;
  setModalWatermark: (v: number) => void;
  modalCaption: string;
  setModalCaption: (v: string) => void;
  modalCaptionAlign: "left" | "center" | "right";
  setModalCaptionAlign: (v: "left" | "center" | "right") => void;
  mosaicMode: boolean;
  setMosaicMode: React.Dispatch<React.SetStateAction<boolean>>;
  mosaicRect: { left: number; top: number; width: number; height: number } | null;
  setMosaicRect: React.Dispatch<React.SetStateAction<{ left: number; top: number; width: number; height: number } | null>>;
  modalFileRef: React.RefObject<HTMLInputElement | null>;
  handleModalFileSelect: (files: FileList | null) => void;
  handleMosaicPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  handleMosaicPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  handleMosaicPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  resetMosaic: () => void;
  handlePhotoModalConfirm: () => void;

  // Photo Edit Modal
  showEditModal: boolean;
  setShowEditModal: (v: boolean) => void;
  editPhotoIdx: number;
  photoFiles: any[];
  editSize: number;
  setEditSize: (v: number) => void;
  editInsertMode: "자동" | "수동";
  setEditInsertMode: (v: "자동" | "수동") => void;
  editAlign: "left" | "center" | "right";
  setEditAlign: (v: "left" | "center" | "right") => void;
  editCaption: string;
  setEditCaption: (v: string) => void;
  editCaptionAlign: "left" | "center" | "right";
  setEditCaptionAlign: (v: "left" | "center" | "right") => void;
  handleEditPhotoConfirm: () => void;

  // Video Edit Modal
  showVideoEditModal: boolean;
  setShowVideoEditModal: (v: boolean) => void;
  editVideoIdx: number;
  videoItems: any[];
  editVideoUrl: string;
  setEditVideoUrl: (v: string) => void;
  editVideoCaption: string;
  setEditVideoCaption: (v: string) => void;
  handleEditVideoConfirm: () => void;

  // Common UI Styles
  border?: string;
  textPrimary?: string;
  textSecondary?: string;
  textMuted?: string;
}

export default function ArticlePhotoModals({
  showVideoModal,
  setShowVideoModal,
  modalVideoUrl,
  setModalVideoUrl,
  modalVideoShorts,
  setModalVideoShorts,
  handleVideoModalConfirm,

  showPhotoModal,
  setShowPhotoModal,
  modalFile,
  modalPreview,
  modalSize,
  setModalSize,
  modalInsertMode,
  setModalInsertMode,
  modalAlign,
  setModalAlign,
  modalWatermark,
  setModalWatermark,
  modalCaption,
  setModalCaption,
  modalCaptionAlign,
  setModalCaptionAlign,
  mosaicMode,
  setMosaicMode,
  mosaicRect,
  setMosaicRect,
  modalFileRef,
  handleModalFileSelect,
  handleMosaicPointerDown,
  handleMosaicPointerMove,
  handleMosaicPointerUp,
  resetMosaic,
  handlePhotoModalConfirm,

  showEditModal,
  setShowEditModal,
  editPhotoIdx,
  photoFiles,
  editSize,
  setEditSize,
  editInsertMode,
  setEditInsertMode,
  editAlign,
  setEditAlign,
  editCaption,
  setEditCaption,
  editCaptionAlign,
  setEditCaptionAlign,
  handleEditPhotoConfirm,

  showVideoEditModal,
  setShowVideoEditModal,
  editVideoIdx,
  videoItems,
  editVideoUrl,
  setEditVideoUrl,
  editVideoCaption,
  setEditVideoCaption,
  handleEditVideoConfirm,

  border = "#e2e8f0",
  textPrimary = "#0f172a",
  textSecondary = "#64748b",
  textMuted = "#94a3b8",
}: ArticlePhotoModalsProps) {
  const accentBlue = "#3b82f6";

  return (
    <>
      {/* ═══ 영상추가 모달 ═══ */}
      {showVideoModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.45)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowVideoModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 14, width: 540, maxHeight: '85vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}>
            {/* 헤더 */}
            <div style={{
              background: '#ef4444', color: '#fff', padding: '16px 20px',
              borderTopLeftRadius: 14, borderTopRightRadius: 14,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>영상추가</h3>
              <button onClick={() => setShowVideoModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
            {/* 본문 */}
            <div style={{ padding: '24px 30px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 16, alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>링크</span>
                <div>
                  <input type="text" value={modalVideoUrl} onChange={e => setModalVideoUrl(e.target.value)}
                    placeholder="YouTube 영상 링크 입력"
                    style={{ width: '100%', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 6, fontSize: 13 }} />
                </div>

                <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>크기 맞춤</span>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={modalVideoShorts} onChange={e => setModalVideoShorts(e.target.checked)} style={{ accentColor: accentBlue }} />
                  쇼츠(세로) 영상으로 크기 맞춤
                </label>
              </div>

              {/* 하단 버튼 */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 32 }}>
                <button type="button" onClick={handleVideoModalConfirm}
                  style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', width: 120 }}>
                  ✔ 확인
                </button>
                <button type="button" onClick={() => setShowVideoModal(false)}
                  style={{ background: '#fff', color: textPrimary, border: `1px solid ${border}`, padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', width: 120 }}>
                  ✕ 취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 사진추가 모달 ═══ */}
      {showPhotoModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.45)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowPhotoModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 14, width: 540, maxHeight: '85vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}>
            {/* 헤더 */}
            <div style={{
              background: '#3b82f6', color: '#fff', padding: '16px 24px',
              borderRadius: '14px 14px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 17, fontWeight: 800 }}>사진추가</span>
              <button onClick={() => setShowPhotoModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            {/* 바디 */}
            <div style={{ padding: '24px 28px' }}>
              {/* 선택 */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 80, paddingTop: 8 }}>선택</label>
                <div style={{ flex: 1 }}>
                  <input type="file" ref={modalFileRef} accept="image/*" hidden onChange={e => handleModalFileSelect(e.target.files)} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={() => modalFileRef.current?.click()} style={{
                      padding: '8px 16px', background: '#f3f4f6', border: `1px solid ${border}`, borderRadius: 6,
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', color: textPrimary,
                    }}>파일 선택</button>
                    <span style={{ fontSize: 13, color: modalFile ? textPrimary : textMuted }}>
                      {modalFile ? modalFile.name : '선택된 파일 없음'}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#f59e0b', margin: '8px 0 0 0' }}>⚠ 허용용량 (10 Mb) / 이미지 파일(jpg, gif, png)</p>
                  {modalPreview && (
                    <div
                      onPointerDown={handleMosaicPointerDown}
                      onPointerMove={handleMosaicPointerMove}
                      onPointerUp={handleMosaicPointerUp}
                      style={{ marginTop: 12, position: 'relative', borderRadius: 8, overflow: 'hidden', border: `1px solid ${border}`, width: '100%', maxWidth: 360, cursor: mosaicMode ? 'crosshair' : 'default', touchAction: 'none', userSelect: 'none' }}
                    >
                      <img src={modalPreview} alt="미리보기" draggable={false} style={{ width: '100%', height: 'auto', maxWidth: '100%', display: 'block', pointerEvents: 'none', userSelect: 'none' }} />
                      {mosaicRect && (
                        <div style={{ position: 'absolute', left: mosaicRect.left, top: mosaicRect.top, width: mosaicRect.width, height: mosaicRect.height, border: '2px solid #ef4444', background: 'rgba(239,68,68,0.18)', pointerEvents: 'none', boxSizing: 'border-box' }} />
                      )}
                    </div>
                  )}
                  {modalPreview && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                      <button type="button" onClick={() => { setMosaicMode(prev => !prev); setMosaicRect(null); }} style={{ padding: '7px 12px', borderRadius: 6, border: mosaicMode ? '2px solid #2563eb' : `1px solid ${border}`, background: mosaicMode ? '#eff6ff' : '#fff', color: mosaicMode ? '#2563eb' : textPrimary, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        {mosaicMode ? '모자이크 지정 중' : '모자이크'}
                      </button>
                      <button type="button" onClick={resetMosaic} style={{ padding: '7px 10px', borderRadius: 6, border: `1px solid ${border}`, background: '#fff', color: textSecondary, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        모자이크 초기화
                      </button>
                      {mosaicMode && <span style={{ fontSize: 11, color: textMuted }}>사진 위에서 영역을 드래그하세요. 여러 번 지정할 수 있습니다.</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* 기준크기 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 80 }}>기준크기</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[180, 250, 600, 960, 1280].map(s => (
                    <button key={s} onClick={() => setModalSize(s)} style={{
                      padding: '7px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      border: modalSize === s ? '2px solid #3b82f6' : `1px solid ${border}`,
                      background: modalSize === s ? '#1e3a5f' : '#fff',
                      color: modalSize === s ? '#fff' : textPrimary,
                      transition: 'all 0.15s',
                    }}>{s}px</button>
                  ))}
                </div>
              </div>

              {/* 삽입방식 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 80 }}>삽입방식</label>
                <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 6, padding: 3 }}>
                  {(['자동', '수동'] as const).map(m => (
                    <button key={m} onClick={() => setModalInsertMode(m)} style={{
                      padding: '7px 18px', border: 'none', borderRadius: 5, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      background: modalInsertMode === m ? '#1e3a5f' : 'transparent',
                      color: modalInsertMode === m ? '#fff' : textSecondary,
                      transition: 'all 0.15s',
                    }}>{m}</button>
                  ))}
                </div>
              </div>

              {/* 삽입위치 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 80 }}>삽입위치</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {([{ k: 'left' as const, icon: '◧' }, { k: 'center' as const, icon: '▣' }, { k: 'right' as const, icon: '◨' }]).map(({ k, icon }) => (
                    <button key={k} onClick={() => setModalAlign(k)} style={{
                      width: 38, height: 38, borderRadius: 6, fontSize: 18, cursor: 'pointer',
                      border: modalAlign === k ? '2px solid #3b82f6' : `1px solid ${border}`,
                      background: modalAlign === k ? '#1e3a5f' : '#fff',
                      color: modalAlign === k ? '#fff' : textSecondary,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>{icon}</button>
                  ))}
                </div>
              </div>

              {/* 워터마크 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 80 }}>워터마크</label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                  {Array.from({ length: 9 }, (_, i) => (
                    <button key={i} onClick={() => setModalWatermark(i)} style={{
                      width: 34, height: 34, borderRadius: 5, cursor: 'pointer',
                      border: modalWatermark === i ? '2px solid #3b82f6' : `1px solid ${border}`,
                      background: modalWatermark === i ? '#dbeafe' : '#f0fdf4',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={modalWatermark === i ? '#3b82f6' : '#6b7280'} strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        {i === 0 && <circle cx="8" cy="8" r="2" fill={modalWatermark === i ? '#3b82f6' : '#6b7280'}/>}
                        {i === 1 && <circle cx="12" cy="8" r="2" fill={modalWatermark === i ? '#3b82f6' : '#6b7280'}/>}
                        {i === 2 && <circle cx="16" cy="8" r="2" fill={modalWatermark === i ? '#3b82f6' : '#6b7280'}/>}
                        {i === 3 && <circle cx="8" cy="12" r="2" fill={modalWatermark === i ? '#3b82f6' : '#6b7280'}/>}
                        {i === 4 && <circle cx="12" cy="12" r="2" fill={modalWatermark === i ? '#3b82f6' : '#6b7280'}/>}
                        {i === 5 && <circle cx="16" cy="12" r="2" fill={modalWatermark === i ? '#3b82f6' : '#6b7280'}/>}
                        {i === 6 && <circle cx="8" cy="16" r="2" fill={modalWatermark === i ? '#3b82f6' : '#6b7280'}/>}
                        {i === 7 && <circle cx="12" cy="16" r="2" fill={modalWatermark === i ? '#3b82f6' : '#6b7280'}/>}
                        {i === 8 && <circle cx="16" cy="16" r="2" fill={modalWatermark === i ? '#3b82f6' : '#6b7280'}/>}
                      </svg>
                    </button>
                  ))}
                  <button onClick={() => setModalWatermark(9)} style={{
                    padding: '0 12px', height: 34, borderRadius: 5, cursor: 'pointer', fontSize: 12, fontWeight: 600, marginLeft: 8,
                    border: modalWatermark === 9 ? '2px solid #ef4444' : `1px solid ${border}`,
                    background: modalWatermark === 9 ? '#fef2f2' : '#f9fafb',
                    color: modalWatermark === 9 ? '#ef4444' : textSecondary,
                    transition: 'all 0.15s',
                  }}>
                    없음
                  </button>
                </div>
              </div>

              {/* 설명 (캡션) */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 80, paddingTop: 8 }}>설명 <span style={{ fontWeight: 400, color: textMuted }}>(캡션)</span></label>
                <textarea value={modalCaption} onChange={e => setModalCaption(e.target.value)}
                  placeholder="사진설명입력"
                  rows={3}
                  style={{
                    flex: 1, padding: '10px 14px', border: `1px solid ${border}`, borderRadius: 8,
                    fontSize: 14, color: textPrimary, background: '#fafafa', outline: 'none',
                    fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.6,
                  }}
                />
              </div>

              {/* 캡션정렬 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 80 }}>캡션정렬</label>
                <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 6, padding: 3 }}>
                  {([{ k: 'left' as const, label: '좌측' }, { k: 'center' as const, label: '중앙' }, { k: 'right' as const, label: '우측' }]).map(({ k, label }) => (
                    <button key={k} onClick={() => setModalCaptionAlign(k)} style={{
                      padding: '7px 18px', border: 'none', borderRadius: 5, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      background: modalCaptionAlign === k ? '#1e3a5f' : 'transparent',
                      color: modalCaptionAlign === k ? '#fff' : textSecondary,
                      transition: 'all 0.15s',
                    }}>{label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* 푸터 버튼 */}
            <div style={{ padding: '16px 28px 24px', display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button onClick={handlePhotoModalConfirm} style={{
                padding: '12px 36px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 2px 8px rgba(59,130,246,0.3)', transition: 'background 0.15s',
              }}
              onMouseOver={e => e.currentTarget.style.background = '#2563eb'}
              onMouseOut={e => e.currentTarget.style.background = '#3b82f6'}
              >✓ 확인</button>
              <button onClick={() => setShowPhotoModal(false)} style={{
                padding: '12px 36px', background: '#fff', color: textPrimary, border: `1px solid ${border}`, borderRadius: 8,
                fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}>✕ 취소</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 사진수정 모달 ═══ */}
      {showEditModal && editPhotoIdx >= 0 && photoFiles[editPhotoIdx] && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.45)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowEditModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 14, width: 540, maxHeight: '85vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}>
            {/* 헤더 */}
            <div style={{
              background: '#374151', color: '#fff', padding: '16px 24px',
              borderRadius: '14px 14px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 17, fontWeight: 800 }}>사진수정</span>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            {/* 바디 */}
            <div style={{ padding: '24px 28px' }}>
              {/* 선택 (미리보기) */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 80, paddingTop: 8 }}>선택</label>
                <div style={{ flex: 1 }}>
                  <div style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${border}`, background: '#f9fafb', textAlign: 'center', padding: 16 }}>
                    <img src={photoFiles[editPhotoIdx].preview} alt="미리보기"
                      style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 6, objectFit: 'contain' }} />
                  </div>
                  <p style={{ fontSize: 12, color: textMuted, margin: '6px 0 0 0' }}>
                    {photoFiles[editPhotoIdx].file ? `${photoFiles[editPhotoIdx].file?.name} (${((photoFiles[editPhotoIdx].file?.size || 0) / 1024).toFixed(0)}KB)` : '기존 업로드 사진'}
                  </p>
                </div>
              </div>

              {/* 기준크기 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 80 }}>기준크기</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[180, 250, 600, 960, 1280].map(s => (
                    <button key={s} onClick={() => setEditSize(s)} style={{
                      padding: '7px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      border: editSize === s ? '2px solid #3b82f6' : `1px solid ${border}`,
                      background: editSize === s ? '#1e3a5f' : '#fff',
                      color: editSize === s ? '#fff' : textPrimary,
                      transition: 'all 0.15s',
                    }}>{s}px</button>
                  ))}
                </div>
              </div>

              {/* 삽입방식 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 80 }}>삽입방식</label>
                <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 6, padding: 3 }}>
                  {(['자동', '수동'] as const).map(m => (
                    <button key={m} onClick={() => setEditInsertMode(m)} style={{
                      padding: '7px 18px', border: 'none', borderRadius: 5, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      background: editInsertMode === m ? '#1e3a5f' : 'transparent',
                      color: editInsertMode === m ? '#fff' : textSecondary,
                      transition: 'all 0.15s',
                    }}>{m}</button>
                  ))}
                </div>
              </div>

              {/* 삽입위치 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 80 }}>삽입위치</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {([{ k: 'left' as const, icon: '◧' }, { k: 'center' as const, icon: '▣' }, { k: 'right' as const, icon: '◨' }]).map(({ k, icon }) => (
                    <button key={k} onClick={() => setEditAlign(k)} style={{
                      width: 38, height: 38, borderRadius: 6, fontSize: 18, cursor: 'pointer',
                      border: editAlign === k ? '2px solid #3b82f6' : `1px solid ${border}`,
                      background: editAlign === k ? '#1e3a5f' : '#fff',
                      color: editAlign === k ? '#fff' : textSecondary,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>{icon}</button>
                  ))}
                </div>
              </div>

              {/* 설명 (캡션) */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 80, paddingTop: 8 }}>설명 <span style={{ fontWeight: 400, color: textMuted }}>(캡션)</span></label>
                <textarea value={editCaption} onChange={e => setEditCaption(e.target.value)}
                  placeholder="사진설명입력"
                  rows={3}
                  style={{
                    flex: 1, padding: '10px 14px', border: `1px solid ${border}`, borderRadius: 8,
                    fontSize: 14, color: textPrimary, background: '#fafafa', outline: 'none',
                    fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.6,
                  }}
                />
              </div>

              {/* 캡션정렬 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 80 }}>캡션정렬</label>
                <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 6, padding: 3 }}>
                  {([{ k: 'left' as const, label: '좌측' }, { k: 'center' as const, label: '중앙' }, { k: 'right' as const, label: '우측' }]).map(({ k, label }) => (
                    <button key={k} onClick={() => setEditCaptionAlign(k)} style={{
                      padding: '7px 18px', border: 'none', borderRadius: 5, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      background: editCaptionAlign === k ? '#1e3a5f' : 'transparent',
                      color: editCaptionAlign === k ? '#fff' : textSecondary,
                      transition: 'all 0.15s',
                    }}>{label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* 푸터 버튼 */}
            <div style={{ padding: '16px 28px 24px', display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button onClick={handleEditPhotoConfirm} style={{
                padding: '12px 36px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 2px 8px rgba(59,130,246,0.3)', transition: 'background 0.15s',
              }}
              onMouseOver={e => e.currentTarget.style.background = '#2563eb'}
              onMouseOut={e => e.currentTarget.style.background = '#3b82f6'}
              >✓ 확인</button>
              <button onClick={() => setShowEditModal(false)} style={{
                padding: '12px 36px', background: '#fff', color: textPrimary, border: `1px solid ${border}`, borderRadius: 8,
                fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}>✕ 취소</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 동영상추가/수정 모달 ═══ */}
      {showVideoEditModal && editVideoIdx >= 0 && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.45)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowVideoEditModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 14, width: 520, maxHeight: '80vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}>
            {/* 헤더 */}
            <div style={{
              background: '#374151', color: '#fff', padding: '16px 24px',
              borderRadius: '14px 14px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 17, fontWeight: 800 }}>동영상추가</span>
              <button onClick={() => setShowVideoEditModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            {/* 바디 */}
            <div style={{ padding: '28px 28px' }}>
              {/* 영상URL/태그 */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 90, paddingTop: 10 }}>영상URL/태그</label>
                <textarea value={editVideoUrl} onChange={e => setEditVideoUrl(e.target.value)}
                  placeholder="https://youtu.be/..."
                  rows={3}
                  style={{
                    flex: 1, padding: '10px 14px', border: `1px solid ${border}`, borderRadius: 8,
                    fontSize: 14, color: textPrimary, background: '#fafafa', outline: 'none',
                    fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.6,
                  }}
                />
              </div>

              {/* 미리보기 */}
              {editVideoUrl && extractYoutubeId(editVideoUrl) && (
                <div style={{ marginBottom: 24, textAlign: 'center' }}>
                  <img src={getYoutubeThumbnail(extractYoutubeId(editVideoUrl)!)} alt="미리보기"
                    style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8, border: `1px solid ${border}` }} />
                </div>
              )}

              {/* 캡션 */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 8 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 90, paddingTop: 10 }}>캡션</label>
                <textarea value={editVideoCaption} onChange={e => setEditVideoCaption(e.target.value)}
                  placeholder="동영상설명입력"
                  rows={3}
                  style={{
                    flex: 1, padding: '10px 14px', border: `1px solid ${border}`, borderRadius: 8,
                    fontSize: 14, color: textPrimary, background: '#fafafa', outline: 'none',
                    fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.6,
                  }}
                />
              </div>
            </div>

            {/* 푸터 버튼 */}
            <div style={{ padding: '16px 28px 24px', display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button onClick={handleEditVideoConfirm} style={{
                padding: '12px 36px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 2px 8px rgba(59,130,246,0.3)', transition: 'background 0.15s',
              }}
              onMouseOver={e => e.currentTarget.style.background = '#2563eb'}
              onMouseOut={e => e.currentTarget.style.background = '#3b82f6'}
              >✓ 확인</button>
              <button onClick={() => setShowVideoEditModal(false)} style={{
                padding: '12px 36px', background: '#fff', color: textPrimary, border: `1px solid ${border}`, borderRadius: 8,
                fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}>✕ 취소</button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
