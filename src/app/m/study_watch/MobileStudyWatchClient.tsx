"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getLectureDetail, checkEnrollment } from "@/app/actions/lecture";
import { createClient } from "@/utils/supabase/client";

const toEmbedUrl = (url: string): string => {
  if (!url) return "";
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (m) return `https://www.youtube.com/embed/${m[1]}?rel=0&autoplay=1`;
  return url;
};

const PROGRESS_KEY = "lecture_progress";
const getProgress = (lectureId: string): Set<string> => {
  try {
    const raw = localStorage.getItem(`${PROGRESS_KEY}_${lectureId}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};
const saveProgress = (lectureId: string, completed: Set<string>) => {
  localStorage.setItem(`${PROGRESS_KEY}_${lectureId}`, JSON.stringify([...completed]));
};

export default function MobileStudyWatchClient({ initialLecture }: { initialLecture: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lessonParam = searchParams.get("lesson");

  const [lecture, setLecture] = useState<any>(initialLecture);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"curriculum" | "desc" | "files">("curriculum");
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [activeLessonId, setActiveLessonId] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      if (!initialLecture) return;

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("로그인이 필요합니다.");
        router.replace(`/m/study_read?id=${initialLecture.id}`);
        return;
      }

      let hasAccess = false;
      let errorMessage = "수강 등록이 필요한 특강입니다.";
      const isFree = (initialLecture.discount_price || initialLecture.price || 0) <= 0;
      const enrollRes = await checkEnrollment(initialLecture.id, user.id);

      if (enrollRes.success && enrollRes.enrolled) {
        hasAccess = true;
      } else {
        const { data: member } = await supabase.from("members").select("role").eq("id", user.id).single();
        if (initialLecture.author_id === user.id || member?.role === "ADMIN" || isFree) {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        alert(errorMessage);
        router.replace(`/m/study_read?id=${initialLecture.id}`);
        return;
      }

      setCompleted(getProgress(initialLecture.id));
      const allLessonsList = (initialLecture.chapters || []).flatMap((ch: any) => ch.lessons || []);
      if (lessonParam) {
        setActiveLessonId(lessonParam);
      } else if (allLessonsList.length > 0) {
        setActiveLessonId(allLessonsList[0].id);
      }
    };
    init();
  }, [initialLecture, lessonParam]);

  const allLessons = useMemo(() => {
    if (!lecture) return [];
    return (lecture.chapters || []).flatMap((ch: any) =>
      (ch.lessons || []).map((ls: any) => ({
        ...ls,
        chapterTitle: ch.title,
        chapterNo: ch.chapter_no,
      }))
    );
  }, [lecture]);

  const activeLesson = allLessons.find((l: any) => l.id === activeLessonId) || allLessons[0];
  const activeLessonIndex = allLessons.findIndex((l: any) => l.id === activeLessonId);
  const totalLessons = allLessons.length;
  const completedCount = completed.size;
  const progressPercent = totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0;

  const playLesson = useCallback((lessonId: string) => {
    setActiveLessonId(lessonId);
  }, []);

  const handleCompleteAndNext = () => {
    if (!activeLessonId || !lecture?.id) return;
    const next = new Set(completed);
    next.add(activeLessonId);
    setCompleted(next);
    saveProgress(lecture.id, next);
    if (activeLessonIndex < allLessons.length - 1) {
      setActiveLessonId(allLessons[activeLessonIndex + 1].id);
    }
  };

  const handlePrevLesson = () => {
    if (activeLessonIndex > 0) {
      setActiveLessonId(allLessons[activeLessonIndex - 1].id);
    }
  };

  if (!lecture) {
    return (
      <div style={{ padding: "80px 20px", textAlign: "center", color: "#64748b" }}>
        강의 정보를 찾을 수 없습니다.
      </div>
    );
  }

  const embedUrl = activeLesson?.video_url ? toEmbedUrl(activeLesson.video_url) : "";
  const nextLesson = activeLessonIndex < allLessons.length - 1 ? allLessons[activeLessonIndex + 1] : null;

  return (
    <div style={{ backgroundColor: "#ffffff", minHeight: "100vh", paddingBottom: "70px", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", color: "#1e293b" }}>
      
      {/* ── 1. 상단 미니 네비바 (뒤로가기 + 진도율) ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, backgroundColor: "#ffffff", height: "50px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
        <button onClick={() => router.push(`/m/study_read?id=${lecture.id}`)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: "4px", marginLeft: "-4px", fontSize: 13, fontWeight: 700, color: "#059669" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          소개
        </button>

        <div style={{ fontSize: 14, fontWeight: 800, color: "#062828", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "45%" }}>
          {lecture.title}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#059669" }}>
          <span>{completedCount}/{totalLessons}강</span>
          <div style={{ width: 44, height: 5, background: "#e2e8f0", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ width: `${progressPercent}%`, height: "100%", background: "#059669" }} />
          </div>
        </div>
      </div>

      {/* ── 2. 비디오 플레이어 ── */}
      <div style={{ width: "100%", aspectRatio: "16/9", background: "#062326", position: "relative" }}>
        {embedUrl ? (
          <iframe
            key={activeLessonId}
            src={embedUrl}
            style={{ width: "100%", height: "100%", border: "none" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#a7f3d0", gap: 8 }}>
            <span style={{ fontSize: 32 }}>🎬</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>등록된 강의 영상이 없습니다.</span>
          </div>
        )}
      </div>

      {/* ── 3. 레슨 정보 & 이전/다음 이동 바 ── */}
      <div style={{ padding: "16px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{ background: "#ecfdf5", color: "#047857", fontSize: 11.5, fontWeight: 800, padding: "2px 7px", borderRadius: 4 }}>
            {activeLessonIndex + 1}강
          </span>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {activeLesson?.duration_minutes ? `${activeLesson.duration_minutes}분` : "8:04"}
          </span>
        </div>
        <h2 style={{ fontSize: "17px", fontWeight: 800, color: "#062828", margin: "0 0 14px 0", lineHeight: 1.35 }}>
          {activeLesson ? `${activeLessonIndex + 1}강. ${activeLesson.title}` : "강의를 선택해 주세요"}
        </h2>

        {/* 이전/다음 버튼 */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handlePrevLesson}
            disabled={activeLessonIndex <= 0}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: activeLessonIndex > 0 ? "#f1f5f9" : "#f8fafc",
              color: activeLessonIndex > 0 ? "#334155" : "#cbd5e1",
              border: "1px solid #e2e8f0",
              fontSize: 13,
              fontWeight: 700,
              cursor: activeLessonIndex > 0 ? "pointer" : "default",
            }}
          >
            ← 이전
          </button>
          <button
            onClick={handleCompleteAndNext}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 8,
              background: "#059669",
              color: "#ffffff",
              border: "none",
              fontSize: 13.5,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {nextLesson ? `${nextLesson.lesson_no || activeLessonIndex + 2}강. ${nextLesson.title} →` : "✓ 수강 완료"}
          </button>
        </div>
      </div>

      {/* ── 4. 서브 탭 (커리큘럼 / 강의 설명 / 자료) ── */}
      <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", padding: "0 16px", background: "#ffffff" }}>
        {[
          { id: "curriculum", label: `커리큘럼 (${totalLessons})` },
          { id: "desc", label: "강의 설명" },
          { id: "files", label: "자료 및 서식" },
        ].map((tab) => {
          const isSel = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                flex: 1,
                padding: "11px 0",
                background: "none",
                border: "none",
                borderBottom: isSel ? "2.5px solid #059669" : "2.5px solid transparent",
                fontSize: 13.5,
                fontWeight: isSel ? 800 : 600,
                color: isSel ? "#062828" : "#64748b",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── 5. 탭 내용 ── */}
      <div style={{ padding: "16px" }}>
        {activeTab === "curriculum" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {allLessons.map((les: any, idx: number) => {
              const isActive = activeLessonId === les.id;
              const isDone = completed.has(les.id);

              return (
                <div
                  key={les.id || idx}
                  onClick={() => playLesson(les.id)}
                  style={{
                    padding: "11px 14px",
                    borderRadius: 8,
                    cursor: "pointer",
                    backgroundColor: isActive ? "#062326" : "#ffffff",
                    color: isActive ? "#ffffff" : "#1e293b",
                    border: isActive ? "1px solid #062326" : "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: isActive ? "#059669" : isDone ? "#ecfdf5" : "#f1f5f9", color: isActive ? "#fff" : isDone ? "#047857" : "#64748b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 800, flexShrink: 0 }}>
                      {isDone ? "✓" : idx + 1}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: isActive ? 800 : 600, color: isActive ? "#ffffff" : "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {idx + 1}강. {les.title}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: isActive ? "#a7f3d0" : "#94a3b8", flexShrink: 0 }}>
                    {les.duration_minutes ? `${les.duration_minutes}분` : "8:04"}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "desc" && (
          <div style={{ fontSize: 13.5, color: "#334155", lineHeight: 1.6 }}>
            {activeLesson?.description ? (
              <p style={{ margin: 0 }}>{activeLesson.description}</p>
            ) : (
              <p style={{ color: "#94a3b8", margin: 0 }}>본 강의에 대한 설명이 등록되어 있습니다. 영상을 시청하며 실습을 진행해 보세요.</p>
            )}
          </div>
        )}

        {activeTab === "files" && (
          <div>
            {lecture.materials && lecture.materials.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {lecture.materials.map((mat: any, idx: number) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#062828" }}>📎 {mat.label || "실습 자료 및 계약서 양식"}</span>
                    <a href={mat.url} target="_blank" rel="noreferrer" style={{ padding: "5px 10px", background: "#059669", color: "#fff", textDecoration: "none", borderRadius: 4, fontSize: 11.5, fontWeight: 700 }}>
                      다운로드
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>등록된 첨부 파일이 없습니다.</p>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
