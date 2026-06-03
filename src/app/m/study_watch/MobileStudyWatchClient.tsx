"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getLectureDetail, checkEnrollment } from "@/app/actions/lecture";
import { createClient } from "@/utils/supabase/client";
import SubPageHeader from "../_components/SubPageHeader";
import HomeHeader from "../_components/HomeHeader";

export default function MobileStudyWatchClient({ initialLecture }: { initialLecture: any }) {
  const router = useRouter();

  const [lecture, setLecture] = useState<any>(initialLecture);
  const [loading, setLoading] = useState(false);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState("");
  const [activeTab, setActiveTab] = useState("curriculum");

  useEffect(() => {
    const init = async () => {
      if (!initialLecture) return;

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("ë¡œê·¸?¸ì´ ?„ìš”?©ë‹ˆ??");
        router.replace(`/m/study_read?id=${initialLecture.id}`);
        return;
      }

      let hasAccess = false;
      let errorMessage = "?˜ê°• ?±ë¡???„ìš”???¹ê°•?…ë‹ˆ??";
      const isFree = (initialLecture.discount_price || initialLecture.price || 0) <= 0;
      const enrollRes = await checkEnrollment(initialLecture.id, user.id);
      
      if (enrollRes.success && enrollRes.enrolled) {
        hasAccess = true;
      } else {
        if (enrollRes.error) {
          errorMessage = `?˜ê°• ?•ë³´ ?•ì¸ ?¤ë¥˜: ${enrollRes.error}`;
          console.error("Enrollment check error:", enrollRes.error);
        }
        const { data: member } = await supabase.from("members").select("role").eq("id", user.id).single();
        if (initialLecture.author_id === user.id || member?.role === "ADMIN") {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        alert(errorMessage);
        router.replace(`/m/study_read?id=${initialLecture.id}`);
        return;
      }

      if (!lecture) setLecture(initialLecture);
      
      const firstChapter = initialLecture.chapters?.[0];
      const firstLesson = firstChapter?.lessons?.[0];
      if (firstLesson?.video_url && !activeVideo) {
        setActiveVideo(firstLesson.video_url);
        setActiveTitle(`Ch.${firstChapter.chapter_no}-${firstLesson.lesson_no}. ${firstLesson.title}`);
      }
    };
    init();
  }, [initialLecture, lecture, activeVideo]);

  const toEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=1`;
    if (url.includes("youtube.com/embed")) return url + (url.includes("?") ? "&autoplay=1" : "?autoplay=1");
    return url;
  };

  if (loading) return (
    <div style={{ paddingTop: 50, minHeight: "100vh", backgroundColor: "#f8f9fa", display: "flex", flexDirection: "column" }}>
      <SubPageHeader title="?¹ê°• ?˜ê°•?˜ê¸°" />
      <div style={{ flex: 1, backgroundColor: "#f8f9fa" }} />
    </div>
  );
  if (!lecture) return <div style={{ paddingTop: 50 }}><SubPageHeader title="?¹ê°• ?˜ê°•?˜ê¸°" /><div style={{ textAlign: "center", padding: 80, color: "#999" }}>?“­ ê°•ì˜ ?•ë³´ë¥?ì°¾ì„ ???†ìŠµ?ˆë‹¤.</div></div>;

  const chapters = lecture.chapters || [];

  return (
    <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh", paddingTop: 90 }}>
      
      {/* 1. ìµœìƒ??ë©”ì¸ ?¤ë” */}
      <HomeHeader 
        bgColor="#16a34a" 
        logoText="ë¶€?™ì‚°?¹ê°•"
        sloganPrefix="AI?œë? ë¶€?™ì‚°ì¤‘ê°œ???„ìš”??"
        sloganHighlight="ë§ˆì????¹ê°•"
        highlightColor="#fcd34d"
      />

      {/* 2. ?¤ë¡œê°€ê¸?ë°??œëª© ë°?*/}
      <div style={{
        position: "fixed",
        top: 50,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 448,
        height: 40,
        backgroundColor: "#fff",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        zIndex: 50,
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
      }}>
        <button 
          onClick={() => router.back()} 
          style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "#666", fontSize: 13, fontWeight: 600, padding: 0, cursor: "pointer", flexShrink: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          ?¤ë¡œê°€ê¸?        </button>
        <div style={{ width: 1, height: 12, backgroundColor: "#ddd", margin: "0 12px", flexShrink: 0 }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
          {lecture.title}
        </div>
      </div>

      {/* ?€?€ ë¹„ë””???Œë ˆ?´ì–´ ?ì—­ (?ë‹¨ ê³ ì •) ?€?€ */}
      <div style={{ position: "sticky", top: 90, zIndex: 40, width: "100%", aspectRatio: "16/9", background: "#000", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
        {activeVideo ? (
          (() => {
            const embed = toEmbedUrl(activeVideo);
            return embed && embed.includes("youtube") ? (
              <iframe src={embed} style={{ width: "100%", height: "100%", border: "none" }} allow="autoplay; encrypted-media" allowFullScreen />
            ) : (
              <video src={activeVideo} controls autoPlay playsInline style={{ width: "100%", height: "100%" }} />
            );
          })()
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#666", fontSize: 14 }}>
            ?¬ìƒ???™ì˜?ì´ ?†ìŠµ?ˆë‹¤.
          </div>
        )}
      </div>

      <div style={{ padding: "16px 16px 0", background: "#fff", borderBottom: "1px solid #eee" }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 8, lineHeight: 1.4 }}>{activeTitle || lecture.title}</h1>
        <div style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>ê°•ì‚¬: {lecture.instructor_name || "ê³µì‹¤?´ìŠ¤"}</div>
        
        {/* ?€?€ ??ë©”ë‰´ ?€?€ */}
        <div style={{ display: "flex", gap: 20 }}>
          {[
            { id: "curriculum", label: "ì»¤ë¦¬?˜ëŸ¼" },
            { id: "material", label: "?˜ì—… ?ë£Œ" },
            { id: "qna", label: "Q&A" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "10px 0",
                fontSize: 15,
                fontWeight: activeTab === tab.id ? 800 : 500,
                color: activeTab === tab.id ? "#1a1a1a" : "#999",
                background: "none",
                border: "none",
                borderBottom: activeTab === tab.id ? "2px solid #1a1a1a" : "2px solid transparent",
                transition: "all 0.2s"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ?€?€ ??ì½˜í…ì¸??€?€ */}
      <div style={{ background: "#fff", padding: "16px 16px 40px", minHeight: "50vh" }}>
        
        {/* 1. ì»¤ë¦¬?˜ëŸ¼ */}
        {activeTab === "curriculum" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a" }}>?„ì²´ ì»¤ë¦¬?˜ëŸ¼</h2>
              <span style={{ fontSize: 13, color: "#059669", fontWeight: 700 }}>ì´?{chapters.reduce((acc: number, ch: any) => acc + (ch.lessons?.length || 0), 0)}ê°?/span>
            </div>
            
            {chapters.length > 0 ? chapters.map((ch: any, ci: number) => (
              <div key={ch.id || ci} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a", padding: "12px 0", borderBottom: "2px solid #1a1a1a", marginBottom: 8 }}>
                  Chapter {ch.chapter_no}. {ch.title}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {ch.lessons?.map((lesson: any, li: number) => {
                    const hasVideo = !!lesson.video_url;
                    const isPlaying = activeVideo === lesson.video_url && !!lesson.video_url;
                    
                    return (
                      <button key={li}
                        onClick={() => {
                          if (hasVideo) {
                            setActiveVideo(lesson.video_url);
                            setActiveTitle(`Ch.${ch.chapter_no}-${lesson.lesson_no}. ${lesson.title}`);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          } else {
                            alert("?±ë¡???™ì˜?ì´ ?†ìŠµ?ˆë‹¤.");
                          }
                        }}
                        style={{ width: "100%", textAlign: "left", padding: "14px 12px", borderRadius: 8, border: isPlaying ? "1px solid #059669" : "1px solid #f0f0f0", background: isPlaying ? "#ecfdf5" : "#fff", display: "flex", alignItems: "center", gap: 10, cursor: hasVideo ? "pointer" : "default" }}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: isPlaying ? "#059669" : "#f5f5f5", color: isPlaying ? "#fff" : "#999", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                          {isPlaying ? "?? : lesson.lesson_no || li + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: isPlaying ? 700 : 500, color: isPlaying ? "#059669" : "#333", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {lesson.title}
                          </div>
                        </div>
                        {lesson.duration && <div style={{ fontSize: 12, color: "#999", flexShrink: 0 }}>{lesson.duration}</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )) : <div style={{ fontSize: 14, color: "#999", textAlign: "center", padding: "20px 0" }}>ì»¤ë¦¬?˜ëŸ¼??ì¤€ë¹?ì¤‘ì…?ˆë‹¤.</div>}
          </div>
        )}

        {/* 2. ?˜ì—… ?ë£Œ */}
        {activeTab === "material" && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a", marginBottom: 16 }}>?˜ì—… ?ë£Œ ?¤ìš´ë¡œë“œ</h2>
            {lecture.materials && lecture.materials.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {lecture.materials.map((mat: any, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, border: "1px solid #e0e0e0", borderRadius: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ fontSize: 24 }}>?“„</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>{mat.title || `?™ìŠµ ?ë£Œ ${i + 1}`}</div>
                        <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>PDF ë¬¸ì„œ</div>
                      </div>
                    </div>
                    <button onClick={() => { if(mat.url) window.open(mat.url, "_blank"); else alert("?ë£Œ ë§í¬ê°€ ?†ìŠµ?ˆë‹¤."); }} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#f0fdf4", color: "#059669", fontSize: 13, fontWeight: 700 }}>
                      ?¤ìš´ë¡œë“œ
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: 14, background: "#fafafa", borderRadius: 8 }}>
                ?±ë¡???˜ì—… ?ë£Œê°€ ?†ìŠµ?ˆë‹¤.
              </div>
            )}
          </div>
        )}

        {/* 3. Q&A */}
        {activeTab === "qna" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a" }}>?¬ë¦¬?ì´??Q&A</h2>
              <button onClick={() => alert("ì§ˆë¬¸?˜ê¸° ê¸°ëŠ¥?€ ì¤€ë¹?ì¤‘ì…?ˆë‹¤.")} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e0e0e0", background: "#fff", fontSize: 13, fontWeight: 700 }}>
                ì§ˆë¬¸?˜ê¸°
              </button>
            </div>
            
            <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: 14, background: "#fafafa", borderRadius: 8 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>?’¬</div>
              ?„ì§ ?±ë¡??ì§ˆë¬¸???†ìŠµ?ˆë‹¤.<br/>
              <span style={{ fontSize: 13, color: "#bbb", display: "inline-block", marginTop: 8 }}>ê°•ì˜???€??ê¶ê¸ˆ???ì„ ?¨ê²¨ë³´ì„¸??</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
