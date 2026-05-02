"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getLectureDetail } from "@/app/actions/lecture";
import SubPageHeader from "../_components/SubPageHeader";

export default function MobileStudyWatchPage() {
  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: "center", color: "#999" }}>로딩 중...</div>}>
      <MobileStudyWatchContent />
    </Suspense>
  );
}

function MobileStudyWatchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lectureId = searchParams.get("id");

  const [lecture, setLecture] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (lectureId) {
        const res = await getLectureDetail(lectureId);
        if (res.success && res.data) {
          setLecture(res.data);
          // 기본으로 첫 번째 비디오 세팅
          const firstChapter = res.data.chapters?.[0];
          const firstLesson = firstChapter?.lessons?.[0];
          if (firstLesson?.video_url) {
            setActiveVideo(firstLesson.video_url);
            setActiveTitle(`Ch.${firstChapter.chapter_no}-${firstLesson.lesson_no}. ${firstLesson.title}`);
          }
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [lectureId]);

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
    <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh", paddingTop: 36 }}>
      <SubPageHeader title={lecture.title} />

      {/* ── 비디오 플레이어 영역 (상단 고정) ── */}
      <div style={{ position: "sticky", top: 36, zIndex: 40, width: "100%", aspectRatio: "16/9", background: "#000", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
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

      <div style={{ padding: "16px 16px 24px", background: "#fff", marginBottom: 8 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 8, lineHeight: 1.4 }}>{activeTitle || lecture.title}</h1>
        <div style={{ fontSize: 13, color: "#666" }}>강사: {lecture.instructor_name || "공실뉴스"}</div>
      </div>

      {/* ── 커리큘럼 리스트 ── */}
      <div style={{ background: "#fff", padding: "16px 16px 40px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a", marginBottom: 16 }}>전체 커리큘럼</h2>
        
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
    </div>
  );
}
