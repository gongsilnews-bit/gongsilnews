"use client";

import React, { useState, useEffect } from "react";
import { getPhotoLibrary, togglePhotoFavorite } from "@/app/actions/article";

export interface ArticlePhotoLibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPhoto: (file: File) => void;
  authorId?: string | null;
  border?: string;
  textPrimary?: string;
  textSecondary?: string;
  textMuted?: string;
}

export default function ArticlePhotoLibraryDrawer({
  isOpen,
  onClose,
  onSelectPhoto,
  authorId,
  border = "#e2e8f0",
  textPrimary = "#0f172a",
  textSecondary = "#64748b",
  textMuted = "#94a3b8",
}: ArticlePhotoLibraryDrawerProps) {
  const [photoDbTab, setPhotoDbTab] = useState<"전체사진" | "즐겨찾기">("전체사진");
  const [photoDbSearch, setPhotoDbSearch] = useState("");
  const [photoDbItems, setPhotoDbItems] = useState<any[]>([]);
  const [isPhotoDbLoading, setIsPhotoDbLoading] = useState(false);

  const fetchPhotoDb = async (searchStr: string, favOnly: boolean) => {
    setIsPhotoDbLoading(true);
    const res = await getPhotoLibrary({ search: searchStr, isFavorite: favOnly, authorId: authorId || undefined });
    if (res.success && res.data) {
      setPhotoDbItems(res.data);
    } else {
      setPhotoDbItems([]);
    }
    setIsPhotoDbLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchPhotoDb(photoDbSearch, photoDbTab === "즐겨찾기");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, photoDbTab]);

  const handlePhotoDbSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPhotoDb(photoDbSearch, photoDbTab === "즐겨찾기");
  };

  const handleToggleFav = async (e: React.MouseEvent, photoId: string, currentFav: boolean) => {
    e.stopPropagation();
    const res = await togglePhotoFavorite(photoId, !currentFav);
    if (res.success) {
      setPhotoDbItems(prev => prev.map(p => p.id === photoId ? { ...p, is_favorite: !currentFav } : p));
      if (photoDbTab === "즐겨찾기") {
        fetchPhotoDb(photoDbSearch, true);
      }
    } else {
      alert("상태 변경에 실패했습니다.");
    }
  };

  const handleSelectFromPhotoDb = async (photo: any) => {
    onClose();
    try {
      const response = await fetch(photo.url);
      const blob = await response.blob();
      const ext = photo.filename ? photo.filename.split('.').pop() : "webp";
      const file = new File([blob], photo.filename || `db_photo_${Date.now()}.${ext}`, { type: blob.type });
      onSelectPhoto(file);
    } catch (err) {
      alert("사진을 불러오는 중 오류가 발생했습니다.");
    }
  };

  if (!isOpen) return null;

  return (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(2px)', zIndex: 9999
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, width: 800, maxWidth: '90%', maxHeight: '90%', display: "flex", flexDirection: "column",
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)', overflow: 'hidden', animation: 'scaleUp 0.3s ease-out'
          }}>
            {/* 헤더 */}
            <div style={{ background: '#3b82f6', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🖼️</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>포토DB</span>
              </div>
              <button type="button" onClick={() => onClose()}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            {/* 검색바 & 탭 */}
            <div style={{ padding: '20px 24px 0 24px' }}>
              <form onSubmit={handlePhotoDbSearch} style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                <input type="text" placeholder="사진 설명 또는 파일명으로 검색"
                  value={photoDbSearch} onChange={e => setPhotoDbSearch(e.target.value)}
                  style={{ flex: 1, padding: "12px 16px", border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, outline: "none" }} />
                <button type="submit" style={{ padding: "0 24px", background: "#374151", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>검색</button>
              </form>

              <div style={{ display: "flex", gap: 24, borderBottom: `1px solid ${border}` }}>
                {['전체사진', '즐겨찾기'].map(tab => (
                  <button key={tab} type="button" onClick={() => setPhotoDbTab(tab as any)}
                    style={{
                      background: "none", border: "none", borderBottom: photoDbTab === tab ? "3px solid #f97316" : "3px solid transparent",
                      padding: "8px 4px", fontSize: 15, fontWeight: photoDbTab === tab ? 800 : 600,
                      color: photoDbTab === tab ? "#f97316" : textSecondary, cursor: "pointer", transition: "all 0.2s"
                    }}>
                    {tab === '즐겨찾기' && <span style={{ color: '#f59e0b', marginRight: 4 }}>⭐</span>}
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* 메인 리스트 영역 */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", background: "#f9fafb" }}>
              {isPhotoDbLoading ? (
                <div style={{ textAlign: "center", padding: "40px", color: textMuted }}>⏳ 불러오는 중...</div>
              ) : photoDbItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: textMuted }}>저장된 사진이 없습니다.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 16 }}>
                  {photoDbItems.map(photo => (
                    <div key={photo.id} style={{ 
                      background: "#fff", borderRadius: 8, border: `1px solid ${border}`, overflow: "hidden", 
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)", cursor: "pointer", transition: "transform 0.2s"
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = "translateY(-4px)"}
                    onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
                    onClick={() => handleSelectFromPhotoDb(photo)}>
                      <div style={{ position: "relative", width: "100%", paddingTop: "100%", background: "#f3f4f6" }}>
                        <img src={photo.url} alt="" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                        {/* 즐겨찾기 별모양 버튼 */}
                        <button type="button" onClick={(e) => handleToggleFav(e, photo.id, photo.is_favorite)}
                          style={{
                            position: "absolute", top: 6, right: 6, width: 28, height: 28, background: "rgba(255,255,255,0.9)",
                            borderRadius: "50%", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.2)"
                          }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill={photo.is_favorite ? "#f59e0b" : "none"} stroke={photo.is_favorite ? "#f59e0b" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                          </svg>
                        </button>
                      </div>
                      <div style={{ padding: "8px", fontSize: 11, color: textSecondary }}>
                        <div style={{ fontWeight: 600, color: textPrimary, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{photo.filename || "무제"}</div>
                        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{photo.caption || "설명 없음"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
  );
}
