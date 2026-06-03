"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import MobileTopBarHeader from "../_components/MobileTopBarHeader";
import StudySubMenuBar, { type StudyTab } from "../_components/StudySubMenuBar";

// SVG Pictogram Icons
const IconDrone = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a2e50" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 5l2 2M19 5l-2 2M5 19l2-2M19 19l-2-2"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>;
const IconApp = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a2e50" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>;
const IconAI = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a2e50" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M16 14H8l-2 8h12l-2-8z"/><line x1="9" y1="18" x2="15" y2="18"/></svg>;
const IconMusic = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a2e50" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
const IconDoc = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a2e50" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
const IconChat = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a2e50" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const IconQnA = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a2e50" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconNotice = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a2e50" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const IconMail = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a2e50" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;

const BOARD_ITEMS = [
  { id: "drone", name: "?œë¡ ?ìƒ", desc: "ë§¤ë¬¼ ?ë³´???œë¡  ??³µ ì´¬ì˜ ?ìƒ", icon: <IconDrone /> },
  { id: "app", name: "APP(??", desc: "ë¶€?™ì‚° ?…ë¬´??? ìš©????ëª¨ìŒ", icon: <IconApp /> },
  { id: "prompt", name: "AI ?„ë¡¬?„íŠ¸", desc: "ChatGPTÂ·AI ?œìš© ?„ë¡¬?„íŠ¸ ê³µìœ ", icon: <IconAI /> },
  { id: "sound", name: "?Œì›", desc: "ë§¤ë¬¼ ?ìƒ??ë°°ê²½ ?Œì› ?ë£Œ", icon: <IconMusic /> },
  { id: "doc", name: "ê³„ì•½???‘ì‹", desc: "ë¶€?™ì‚° ê³„ì•½??ë°??¤ë¬´ ?‘ì‹", icon: <IconDoc /> },
];

const COMMUNITY_ITEMS = [
  { id: "free", name: "?ìœ ê²Œì‹œ??, desc: "ë¶€?™ì‚°?¸ë“¤???ìœ ë¡œìš´ ?Œí†µ ê³µê°„", icon: <IconChat /> },
  { id: "qna", name: "Q&Aê²Œì‹œ??, desc: "ì¤‘ê°œ ?¤ë¬´ ì§ˆë¬¸ê³??µë?", icon: <IconQnA /> },
  { id: "notice", name: "ê³µì??¬í•­", desc: "ê³µì‹¤?´ìŠ¤ ê³µì‹ ê³µì??¬í•­", icon: <IconNotice /> },
  { id: "inquiry", name: "1:1 ë¬¸ì˜", desc: "ê³ ê°?¼í„° 1:1 ë¬¸ì˜?˜ê¸°", icon: <IconMail /> },
];

export default function MobileStudyHubClient({ lectures }: any) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: StudyTab = tabParam === "board" ? "board" : tabParam === "community" ? "community" : "lecture";
  const [activeTab, setActiveTab] = useState<StudyTab>(initialTab);
  const router = useRouter();

  // ë¸Œë¼?°ì? ?¤ë¡œê°€ê¸??ìœ¼ë¡œê?ê¸???URL ë³€ê²??????íƒœ ?„ë²½ ?™ê¸°??  React.useEffect(() => {
    const currentTab: StudyTab = tabParam === "board" ? "board" : tabParam === "community" ? "community" : "lecture";
    setActiveTab(currentTab);
  }, [tabParam]);

  // ???´ë¦­ ??React ?íƒœ?€ URL ì¿¼ë¦¬ ?Œë¼ë¯¸í„° ?™ì‹œ ?…ë°?´íŠ¸ (?ë„ ?€???†ëŠ” replace)
  const handleTabChange = (newTab: StudyTab) => {
    setActiveTab(newTab);
    router.replace(`/m/study?tab=${newTab}`, { scroll: false });
  };

  return (
    <div style={{ width: '100%', backgroundColor: '#f8f9fa', minHeight: '100vh', paddingBottom: '40px', paddingTop: '56px' }}>
      <MobileTopBarHeader />
      <StudySubMenuBar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* ?€?€ ?¹ê°• ì½˜í…ì¸??€?€ */}
      {activeTab === "lecture" && (
        <div style={{ padding: '16px', paddingTop: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {lectures.length === 0 && (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9ca3af', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
                ?±ë¡???¹ê°•???†ìŠµ?ˆë‹¤.
              </div>
            )}
            {lectures.map((lecture: any) => (
              <Link key={lecture.id} href={`/m/study_read?id=${lecture.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', border: '1px solid #f3f4f6', cursor: 'pointer' }}>
                  <div style={{ width: '100%', aspectRatio: '16/9', position: 'relative', backgroundColor: '#e5e7eb' }}>
                    {lecture.thumbnail_url ? (
                      <img src={lecture.thumbnail_url} alt={lecture.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#a8edea,#fed6e3)', fontSize: 24, fontWeight: 800, color: '#555' }}>
                        {lecture.category || "?¹ê°•"}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '16px' }}>
                    <div style={{ color: '#3b82f6', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                      {lecture.category || "ì¤‘ê°œ?¤ë¬´"}
                    </div>
                    <h2 style={{ color: '#111827', fontSize: '18px', fontWeight: 700, lineHeight: 1.3, marginBottom: '12px', wordBreak: 'keep-all', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {lecture.title}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: '#4b5563', marginBottom: '16px' }}>
                      <span style={{ marginRight: '8px' }}>{lecture.instructor_name || "ê°•ì‚¬"}</span>
                      <span style={{ display: 'flex', alignItems: 'center', color: '#3b82f6' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" style={{ marginRight: '4px' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        {(lecture.rating || 0).toFixed(1)} ({lecture.review_count || 0})
                      </span>
                    </div>
                    <div style={{ display: 'inline-block', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 16px' }}>
                      <span style={{ color: '#111827', fontWeight: 700, fontSize: '16px' }}>
                        {lecture.discount_price ? lecture.discount_price.toLocaleString() : lecture.price ? lecture.price.toLocaleString() : "ë¬´ë£Œ"} P
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ?€?€ ?ë£Œ??ì½˜í…ì¸??€?€ */}
      {activeTab === "board" && (
        <div style={{ padding: '16px', paddingTop: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {BOARD_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => router.push(`/m/board?id=${item.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '16px',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #f3f4f6',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '2px' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.desc}
                  </div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ?€?€ ì»¤ë??ˆí‹° ì½˜í…ì¸??€?€ */}
      {activeTab === "community" && (
        <div style={{ padding: '16px', paddingTop: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {COMMUNITY_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => router.push(`/m/board?id=${item.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '16px',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #f3f4f6',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '2px' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.desc}
                  </div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
