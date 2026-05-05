"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import HomeHeader from "../_components/HomeHeader";

function getYoutubeThumbnail(url: string): string | null {
  if (!url) return null;
  const regex = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
}

function getDriveThumbnail(url: string): string | null {
  if (!url) return null;
  const m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w400` : null;
}

function getPrimaryThumbnail(p: any): string {
  if (p.thumbnail_url) return p.thumbnail_url;
  let ytUrl = p.youtube_url;
  let drUrl = p.drive_url;
  try {
    if (p.external_url && p.external_url.startsWith("[")) {
      const links = JSON.parse(p.external_url);
      const firstYt = links.find((l: any) => l.type === "YOUTUBE" || (l.url && (l.url.includes("youtube.com") || l.url.includes("youtu.be"))));
      const firstDr = links.find((l: any) => l.type === "DRIVE" || (l.url && l.url.includes("drive.google.com")));
      if (firstYt?.url) ytUrl = firstYt.url;
      if (firstDr?.url) drUrl = firstDr.url;
    }
  } catch(e) {}

  const ytThumb = getYoutubeThumbnail(ytUrl);
  if (ytThumb) return ytThumb;
  const drThumb = getDriveThumbnail(drUrl);
  if (drThumb) return drThumb;

  return "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=320&q=80";
}

function hasVideoLink(p: any, skinType: string): boolean {
  let hasVideo = p.youtube_url;
  let isDriveVideo = (skinType === "VIDEO_ALBUM") && p.drive_url && p.drive_url.includes("drive.google.com/file/d/");
  hasVideo = hasVideo || isDriveVideo;
  try {
    if (p.external_url && p.external_url.startsWith("[")) {
      const links = JSON.parse(p.external_url);
      hasVideo = hasVideo || links.some((l: any) => {
        if (l.type === "YOUTUBE" || (l.url && (l.url.includes("youtube.com") || l.url.includes("youtu.be")))) return true;
        if (skinType === "VIDEO_ALBUM" && (l.type === "DRIVE" || (l.url && l.url.includes("drive.google.com")))) return true;
        return false;
      });
    }
  } catch(e) {}
  return !!hasVideo;
}

export default function MobileStudyHubClient({ initialTab, initialSubtab, lectures, board, boardPosts }: any) {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // 자료실 서브 탭
  const resourceTabs = [
    { id: "drone", name: "드론영상" },
    { id: "app", name: "APP(앱)" },
    { id: "prompt", name: "AI 프롬프트" },
    { id: "sound", name: "음원" },
    { id: "doc", name: "계약서/양식" },
  ];

  // 커뮤니티 서브 탭
  const communityTabs = [
    { id: "free", name: "자유게시판" },
    { id: "qna", name: "Q&A" },
  ];

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "lecture") router.push('/m/study?tab=lecture');
    else if (tab === "resource") router.push('/m/study?tab=resource&subtab=drone');
    else if (tab === "community") router.push('/m/study?tab=community&subtab=free');
  };

  const handleSubtabChange = (tab: string, subtab: string) => {
    router.push(`/m/study?tab=${tab}&subtab=${subtab}`);
  };

  return (
    <div style={{ width: '100%', backgroundColor: '#f8f9fa', minHeight: '100vh', paddingBottom: '40px', paddingTop: '50px' }}>
      <HomeHeader 
        bgColor="#1a2e50" 
        logoText="공실스터디"
        sloganPrefix="함께 성장하는 "
        sloganHighlight="부동산 커뮤니티"
        highlightColor="#fcd34d"
        homeUrl="/m/study"
      />

      {/* ═══ 탭 필터 바 ═══ */}
      <div style={{ display: "flex", alignItems: "center", background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "12px 0", flexShrink: 0, width: "100%" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 0, overflow: "hidden" }}>
          <div className="hide-scrollbar" style={{ overflowX: "auto", display: "flex", gap: "8px", padding: "0 16px", WebkitOverflowScrolling: "touch", alignItems: "center" }}>
            
            {/* 부동산특강 버튼 */}
            <button 
              onClick={() => handleTabChange("lecture")}
              style={{ 
                padding: "7px 14px", borderRadius: "20px", fontSize: "14px", fontWeight: 700, 
                border: activeTab === "lecture" ? "1.5px solid #2563eb" : "1px solid #d1d5db", 
                background: activeTab === "lecture" ? "#eff6ff" : "#fff", 
                color: activeTab === "lecture" ? "#2563eb" : "#4b5563", 
                cursor: "pointer", outline: "none", flexShrink: 0, 
                transition: "all 0.2s"
              }}
            >
              🎓 부동산특강
            </button>

            {/* 자료실 드롭다운 */}
            <select 
              value={activeTab === "resource" ? (initialSubtab || 'drone') : 'default'} 
              onChange={(e) => {
                if (e.target.value === 'default' || e.target.value === 'drone') {
                  handleTabChange("resource");
                } else {
                  handleSubtabChange("resource", e.target.value);
                }
              }} 
              style={{ 
                padding: "7px 10px", borderRadius: "20px", fontSize: "14px", fontWeight: 700, 
                border: activeTab === "resource" ? "1.5px solid #2563eb" : "1px solid #d1d5db", 
                background: activeTab === "resource" ? "#eff6ff" : "#fff", 
                color: activeTab === "resource" ? "#2563eb" : "#4b5563", 
                cursor: "pointer", outline: "none", flexShrink: 0, 
                appearance: "none", WebkitAppearance: "none", 
                paddingRight: "28px", 
                backgroundImage: activeTab === "resource" 
                  ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%232563eb' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")" 
                  : "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%234b5563' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")", 
                backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
                transition: "all 0.2s"
              }}
            >
              <option value="default">📁 자료실</option>
              {resourceTabs.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            {/* 커뮤니티 드롭다운 */}
            <select 
              value={activeTab === "community" ? (initialSubtab || 'free') : 'default'} 
              onChange={(e) => {
                if (e.target.value === 'default' || e.target.value === 'free') {
                  handleTabChange("community");
                } else {
                  handleSubtabChange("community", e.target.value);
                }
              }} 
              style={{ 
                padding: "7px 10px", borderRadius: "20px", fontSize: "14px", fontWeight: 700, 
                border: activeTab === "community" ? "1.5px solid #2563eb" : "1px solid #d1d5db", 
                background: activeTab === "community" ? "#eff6ff" : "#fff", 
                color: activeTab === "community" ? "#2563eb" : "#4b5563", 
                cursor: "pointer", outline: "none", flexShrink: 0, 
                appearance: "none", WebkitAppearance: "none", 
                paddingRight: "28px", 
                backgroundImage: activeTab === "community" 
                  ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%232563eb' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")" 
                  : "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%234b5563' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")", 
                backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
                transition: "all 0.2s"
              }}
            >
              <option value="default">💬 커뮤니티</option>
              {communityTabs.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            <div style={{ flexShrink: 0, width: "8px" }} />
          </div>
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "24px", background: "linear-gradient(to right, transparent, #f8f9fa)", pointerEvents: "none" }} />
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div style={{ padding: '16px', paddingTop: '20px' }}>
        {/* A. 부동산특강 */}
        {activeTab === "lecture" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {lectures.map((lecture: any) => (
              <Link key={lecture.id} href={`/m/study_read?id=${lecture.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', border: '1px solid #f3f4f6', cursor: 'pointer' }}>
                  <div style={{ width: '100%', aspectRatio: '16/9', position: 'relative', backgroundColor: '#e5e7eb' }}>
                    {lecture.thumbnail_url ? (
                      <img src={lecture.thumbnail_url} alt={lecture.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#a8edea,#fed6e3)', fontSize: 24, fontWeight: 800, color: '#555' }}>
                        {lecture.category || "특강"}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '16px' }}>
                    <div style={{ color: '#3b82f6', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                      {lecture.category || "중개실무"}
                    </div>
                    <h2 style={{ color: '#111827', fontSize: '18px', fontWeight: 700, lineHeight: 1.3, marginBottom: '12px', wordBreak: 'keep-all', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {lecture.title}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: '#4b5563', marginBottom: '16px' }}>
                      <span style={{ marginRight: '8px' }}>{lecture.instructor_name || "강사"}</span>
                      <span style={{ display: 'flex', alignItems: 'center', color: '#3b82f6' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" style={{ marginRight: '4px' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        {(lecture.rating || 0).toFixed(1)} ({lecture.review_count || 0})
                      </span>
                    </div>
                    <div style={{ display: 'inline-block', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 16px' }}>
                      <span style={{ color: '#111827', fontWeight: 700, fontSize: '16px' }}>
                        {lecture.discount_price ? lecture.discount_price.toLocaleString() : lecture.price ? lecture.price.toLocaleString() : "무료"} P
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* B, C. 게시판 (자료실, 커뮤니티) */}
        {(activeTab === "resource" || activeTab === "community") && board && (
          <>
            {boardPosts.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9ca3af', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
                등록된 게시물이 없습니다.
              </div>
            ) : board.skin_type === "LIST" ? (
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f3f4f6', overflow: 'hidden' }}>
                {boardPosts.map((p: any, i: number) => (
                  <Link key={p.id} href={`/m/board_read?id=${p.id}&board_id=${board.board_id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ padding: '16px', borderBottom: i < boardPosts.length - 1 ? '1px solid #f3f4f6' : 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {p.title.match(/^\[([^\]]+)\]/) && (
                        <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600, backgroundColor: '#eff6ff', padding: '4px 8px', borderRadius: '4px', alignSelf: 'flex-start' }}>
                          {p.title.match(/^\[([^\]]+)\]/)?.[0]}
                        </span>
                      )}
                      <div style={{ fontSize: '16px', color: '#111827', fontWeight: 600, lineHeight: 1.4 }}>
                        {p.title.replace(/^\[([^\]]+)\]\s*/, "")}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#6b7280' }}>
                        <span>{p.author_name || "관리자"}</span>
                        <span>조회 {p.view_count || 0} · {new Date(p.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {boardPosts.map((p: any) => (
                  <Link key={p.id} href={`/m/board_read?id=${p.id}&board_id=${board.board_id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f3f4f6', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ width: '100%', aspectRatio: '4/3', position: 'relative', backgroundColor: '#e5e7eb' }}>
                        <img src={getPrimaryThumbnail(p)} alt="thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {hasVideoLink(p, board.skin_type) && (
                          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '36px', height: '36px', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.8)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {p.title.match(/^\[([^\]]+)\]/) && (
                          <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600, marginBottom: '6px', backgroundColor: '#eff6ff', padding: '2px 6px', borderRadius: '4px', alignSelf: 'flex-start' }}>
                            {p.title.match(/^\[([^\]]+)\]/)?.[0]}
                          </span>
                        )}
                        <div style={{ fontSize: '14px', color: '#111827', fontWeight: 700, lineHeight: 1.4, marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {p.title.replace(/^\[([^\]]+)\]\s*/, "")}
                        </div>
                        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#9ca3af' }}>
                          <span style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '60px' }}>{p.author_name || "관리자"}</span>
                          <span>조회 {p.view_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
