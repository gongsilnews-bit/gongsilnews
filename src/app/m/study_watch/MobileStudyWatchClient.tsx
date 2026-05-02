"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getLectureDetail } from "@/app/actions/lecture";
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
    if (!lecture && initialLecture) {
      setLecture(initialLecture);
    }
    if (initialLecture) {
      const firstChapter = initialLecture.chapters?.[0];
      const firstLesson = firstChapter?.lessons?.[0];
      if (firstLesson?.video_url && !activeVideo) {
        setActiveVideo(firstLesson.video_url);
        setActiveTitle(`Ch.${firstChapter.chapter_no}-${firstLesson.lesson_no}. ${firstLesson.title}`);
      }
    }
  }, [initialLecture, lecture, activeVideo]);

  const toEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=1`;
    if (url.includes("youtube.com/embed")) return url + (url.includes("?") ? "&autoplay=1" : "?autoplay=1");
    return url;
  };

  if (loading) return <div style={{ paddingTop: 50 }}><SubPageHeader title="특강 수강하기" /><div style={{ textAlign: "center", padding: 80, color: "#999" }}>⏳ 로딩 중...</div></div>;
  if (!lecture) return <div style={{ paddingTop: 50 }}><SubPageHeader title="특강 수강하기" /><div style={{ textAlign: "center", padding: 80, color: "#999" }}>📭 강의 정보를 찾을 수 없습니다.</div></div>;

  const chapters = lecture.chapters || [];

  return (
    <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh", paddingTop: 90 }}>
      
      {/* 1. 최상단 메인 헤더 */}
      <HomeHeader 
        bgColor="#16a34a" 
        logoText="부동산특강"
        sloganPrefix="AI시대 부동산중개에 필요한 "
        sloganHighlight="마케팅 특강"
        highlightColor="#fcd34d"
      />

      {/* 2. 뒤로가기 및 제목 바 */}
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
          뒤로가기
        </button>
        <div style={{ width: 1, height: 12, backgroundColor: "#ddd", margin: "0 12px", flexShrink: 0 }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
          {lecture.title}
        </div>
      </div>

      {/* ── 비디오 플레이어 영역 (상단 고정) ── */}
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
            재생할 동영상이 없습니다.
          </div>
        )}
      </div>

      <div style={{ padding: "16px 16px 0", background: "#fff", borderBottom: "1px solid #eee" }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 8, lineHeight: 1.4 }}>{activeTitle || lecture.title}</h1>
        <div style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>강사: {lecture.instructor_name || "공실뉴스"}</div>
        
        {/* ── 탭 메뉴 ── */}
        <div style={{ display: "flex", gap: 20 }}>
          {[
            { id: "curriculum", label: "커리큘럼" },
            { id: "material", label: "수업 자료" },
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

      {/* ── 탭 콘텐츠 ── */}
      <div style={{ background: "#fff", padding: "16px 16px 40px", minHeight: "50vh" }}>
        
        {/* 1. 커리큘럼 */}
        {activeTab === "curriculum" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a" }}>전체 커리큘럼</h2>
              <span style={{ fontSize: 13, color: "#059669", fontWeight: 700 }}>총 {chapters.reduce((acc: number, ch: any) => acc + (ch.lessons?.length || 0), 0)}강</span>
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
                            alert("등록된 동영상이 없습니다.");
                          }
                        }}
                        style={{ width: "100%", textAlign: "left", padding: "14px 12px", borderRadius: 8, border: isPlaying ? "1px solid #059669" : "1px solid #f0f0f0", background: isPlaying ? "#ecfdf5" : "#fff", display: "flex", alignItems: "center", gap: 10, cursor: hasVideo ? "pointer" : "default" }}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: isPlaying ? "#059669" : "#f5f5f5", color: isPlaying ? "#fff" : "#999", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                          {isPlaying ? "▶" : lesson.lesson_no || li + 1}
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
            )) : <div style={{ fontSize: 14, color: "#999", textAlign: "center", padding: "20px 0" }}>커리큘럼이 준비 중입니다.</div>}
          </div>
        )}

        {/* 2. 수업 자료 */}
        {activeTab === "material" && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a", marginBottom: 16 }}>수업 자료 다운로드</h2>
            {lecture.materials && lecture.materials.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {lecture.materials.map((mat: any, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, border: "1px solid #e0e0e0", borderRadius: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ fontSize: 24 }}>📄</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>{mat.title || `학습 자료 ${i + 1}`}</div>
                        <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>PDF 문서</div>
                      </div>
                    </div>
                    <button onClick={() => { if(mat.url) window.open(mat.url, "_blank"); else alert("자료 링크가 없습니다."); }} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#f0fdf4", color: "#059669", fontSize: 13, fontWeight: 700 }}>
                      다운로드
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: 14, background: "#fafafa", borderRadius: 8 }}>
                등록된 수업 자료가 없습니다.
              </div>
            )}
          </div>
        )}

        {/* 3. Q&A */}
        {activeTab === "qna" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a" }}>크리에이터 Q&A</h2>
              <button onClick={() => alert("질문하기 기능은 준비 중입니다.")} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e0e0e0", background: "#fff", fontSize: 13, fontWeight: 700 }}>
                질문하기
              </button>
            </div>
            
            <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: 14, background: "#fafafa", borderRadius: 8 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
              아직 등록된 질문이 없습니다.<br/>
              <span style={{ fontSize: 13, color: "#bbb", display: "inline-block", marginTop: 8 }}>강의에 대해 궁금한 점을 남겨보세요!</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
