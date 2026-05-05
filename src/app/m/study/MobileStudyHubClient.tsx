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

      {/* 1-Depth: 메인 탭 (가로 스크롤) */}
      <div style={{ padding: '20px 16px 12px', overflowX: 'auto', whiteSpace: 'nowrap', display: 'flex', gap: '8px', WebkitOverflowScrolling: 'touch', backgroundColor: '#fff', borderBottom: '1px solid #f3f4f6' }} className="hide-scrollbar">
        {[
          { id: "lecture", label: "🎓 부동산특강" },
          { id: "resource", label: "📁 자료실" },
          { id: "community", label: "💬 커뮤니티" }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            style={{
              padding: '10px 20px',
              borderRadius: '24px',
              border: activeTab === t.id ? '1px solid #2563eb' : '1px solid #e5e7eb',
              backgroundColor: activeTab === t.id ? '#eff6ff' : '#fff',
              color: activeTab === t.id ? '#2563eb' : '#4b5563',
              fontSize: '15px',
              fontWeight: activeTab === t.id ? 700 : 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 2-Depth: 서브 탭 (자료실/커뮤니티인 경우) */}
      {activeTab === "resource" && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', overflowX: 'auto', whiteSpace: 'nowrap', display: 'flex', gap: '16px', WebkitOverflowScrolling: 'touch' }} className="hide-scrollbar">
          {resourceTabs.map(t => (
            <button
              key={t.id}
              onClick={() => handleSubtabChange("resource", t.id)}
              style={{
                background: 'none', border: 'none', padding: '4px 0',
                color: initialSubtab === t.id ? '#111827' : '#9ca3af',
                fontSize: '14px',
                fontWeight: initialSubtab === t.id ? 700 : 500,
                position: 'relative',
                cursor: 'pointer'
              }}
            >
              {t.name}
              {initialSubtab === t.id && (
                <div style={{ position: 'absolute', bottom: -12, left: 0, width: '100%', height: '2px', backgroundColor: '#111827' }} />
              )}
            </button>
          ))}
        </div>
      )}

      {activeTab === "community" && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '20px' }}>
          {communityTabs.map(t => (
            <button
              key={t.id}
              onClick={() => handleSubtabChange("community", t.id)}
              style={{
                background: 'none', border: 'none', padding: '4px 0',
                color: initialSubtab === t.id ? '#111827' : '#9ca3af',
                fontSize: '15px',
                fontWeight: initialSubtab === t.id ? 700 : 500,
                position: 'relative',
                cursor: 'pointer'
              }}
            >
              {t.name}
              {initialSubtab === t.id && (
                <div style={{ position: 'absolute', bottom: -12, left: 0, width: '100%', height: '2px', backgroundColor: '#111827' }} />
              )}
            </button>
          ))}
        </div>
      )}

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
                    <div style={{ position: 'absolute', top: 0, right: '16px', width: '28px', height: '36px', backgroundColor: '#ff4d4f', display: 'flex', justifyContent: 'center', paddingTop: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    </div>
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
