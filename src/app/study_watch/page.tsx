"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getLectureDetail } from "@/app/actions/lecture";

/* ── YouTube URL → embed URL ── */
const toEmbed = (url: string): string => {
  if (!url) return "";
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (m) return `https://www.youtube.com/embed/${m[1]}?rel=0&autoplay=1`;
  if (url.includes("youtube.com/embed")) return url + (url.includes("?") ? "&autoplay=1" : "?autoplay=1");
  return url;
};

/* ── localStorage 진도 관리 ── */
const PROGRESS_KEY = "lecture_progress";
const getProgress = (lectureId: string): Set<string> => {
  try {
    const raw = localStorage.getItem(`${PROGRESS_KEY}_${lectureId}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
};
const saveProgress = (lectureId: string, completed: Set<string>) => {
  localStorage.setItem(`${PROGRESS_KEY}_${lectureId}`, JSON.stringify([...completed]));
};

export default function StudyWatchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lectureId = searchParams.get("id");
  const lessonParam = searchParams.get("lesson");

  const [lecture, setLecture] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"notes" | "qna">("notes");
  const [expandedChapters, setExpandedChapters] = useState<Record<number, boolean>>({});
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  /* 현재 재생 중인 레슨 */
  const [activeLessonId, setActiveLessonId] = useState<string>("");

  /* ── 데이터 로드 ── */
  useEffect(() => {
    const fetch = async () => {
      if (!lectureId) { setLoading(false); return; }
      const res = await getLectureDetail(lectureId);
      if (res.success && res.data) {
        setLecture(res.data);
        // 모든 챕터 펼침
        const exp: Record<number, boolean> = {};
        (res.data.chapters || []).forEach((_: any, i: number) => { exp[i] = true; });
        setExpandedChapters(exp);
        // 진도 복원
        setCompleted(getProgress(lectureId));
        // 초기 레슨 설정
        const allLessons = (res.data.chapters || []).flatMap((ch: any) => ch.lessons || []);
        if (lessonParam) {
          setActiveLessonId(lessonParam);
        } else if (allLessons.length > 0) {
          setActiveLessonId(allLessons[0].id);
        }
      }
      setLoading(false);
    };
    fetch();
  }, [lectureId, lessonParam]);

  /* ── 전체 레슨 플랫 리스트 ── */
  const allLessons = useMemo(() => {
    if (!lecture) return [];
    return (lecture.chapters || []).flatMap((ch: any) =>
      (ch.lessons || []).map((ls: any) => ({ ...ls, chapterTitle: ch.title, chapterNo: ch.chapter_no }))
    );
  }, [lecture]);

  const activeLesson = allLessons.find((l: any) => l.id === activeLessonId);
  const activeLessonIndex = allLessons.findIndex((l: any) => l.id === activeLessonId);
  const totalLessons = allLessons.length;
  const completedCount = completed.size;
  const progressPercent = totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0;

  /* ── 레슨 전환 ── */
  const playLesson = useCallback((lessonId: string) => {
    setActiveLessonId(lessonId);
  }, []);

  /* ── 수강 완료 → 다음 레슨 ── */
  const handleComplete = () => {
    if (!activeLessonId || !lectureId) return;
    const next = new Set(completed);
    next.add(activeLessonId);
    setCompleted(next);
    saveProgress(lectureId, next);

    // 다음 레슨 자동 재생
    if (activeLessonIndex < allLessons.length - 1) {
      setActiveLessonId(allLessons[activeLessonIndex + 1].id);
    }
  };

  /* ── 스타일 ── */
  const bg = darkMode ? "#1a1b1e" : "#ffffff";
  const textPrimary = darkMode ? "#e5e7eb" : "#1e293b";
  const textSecondary = darkMode ? "#9ca3af" : "#64748b";
  const sidebarBg = darkMode ? "#111827" : "#f8fafc";
  const borderColor = darkMode ? "#374151" : "#e2e8f0";
  const accent = "#f59e0b";

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: bg, color: textSecondary, fontFamily: "'Pretendard Variable', sans-serif", fontSize: 16 }}>
        ⏳ 강의를 불러오는 중...
      </div>
    );
  }

  if (!lecture) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: bg, fontFamily: "'Pretendard Variable', sans-serif", gap: 16 }}>
        <div style={{ fontSize: 48 }}>📭</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: textPrimary }}>강의를 찾을 수 없습니다.</div>
        <button onClick={() => router.back()} style={{ padding: "10px 24px", background: accent, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>뒤로가기</button>
      </div>
    );
  }

  const embedUrl = activeLesson?.video_url ? toEmbed(activeLesson.video_url) : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", background: bg, overflow: "hidden" }}>

      {/* ═══ 상단 헤더 ═══ */}
      <header style={{
        height: 52, minHeight: 52, background: darkMode ? "#111827" : "#fff",
        borderBottom: `1px solid ${borderColor}`,
        display: "flex", alignItems: "center", padding: "0 20px", gap: 14,
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <button onClick={() => router.push(`/study_read?id=${lectureId}`)}
          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: textSecondary, background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: "6px 0" }}
          onMouseEnter={(e) => e.currentTarget.style.color = accent}
          onMouseLeave={(e) => e.currentTarget.style.color = textSecondary}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          강의 소개
        </button>
        <div style={{ width: 1, height: 18, background: borderColor }} />
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {lecture.title}
        </div>
        <button onClick={() => setDarkMode(!darkMode)}
          style={{ width: 34, height: 34, borderRadius: "50%", border: `1px solid ${borderColor}`, background: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 15, color: textSecondary }}>
          {darkMode ? "☀️" : "🌙"}
        </button>
      </header>

      {/* ═══ 메인 ═══ */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── 좌측: 비디오 + 정보 ── */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {/* 비디오 */}
          <div style={{ width: "100%", background: "#000", flexShrink: 0 }}>
            <div style={{ paddingTop: "56.25%", position: "relative" }}>
              {embedUrl ? (
                <iframe
                  key={activeLessonId}
                  src={embedUrl}
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#666", gap: 12 }}>
                  <div style={{ fontSize: 48 }}>🎬</div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>영상 URL이 등록되지 않았습니다.</div>
                </div>
              )}
            </div>
          </div>

          {/* 강의 정보 */}
          <div style={{ padding: "20px 28px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: accent, fontWeight: 700, marginBottom: 4 }}>
                  {activeLesson ? `Chapter ${activeLesson.chapterNo} · ${activeLesson.chapterTitle}` : ""}
                </div>
                <h2 style={{ fontSize: 19, fontWeight: 800, color: textPrimary, margin: 0, lineHeight: 1.4 }}>
                  {activeLesson ? `${activeLesson.chapterNo}-${activeLesson.lesson_no}. ${activeLesson.title}` : "강의를 선택하세요"}
                </h2>
              </div>
              <button onClick={handleComplete}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "11px 22px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: completed.has(activeLessonId) ? "#10b981" : accent,
                  color: "#fff", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.2s",
                  boxShadow: `0 2px 8px ${completed.has(activeLessonId) ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "none"}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                {completed.has(activeLessonId)
                  ? "✅ 수강 완료"
                  : activeLessonIndex < allLessons.length - 1
                    ? "수강 완료 → 다음"
                    : "수강 완료"
                }
              </button>
            </div>

            {/* 탭 */}
            <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${borderColor}`, marginTop: 20 }}>
              {(["notes", "qna"] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "11px 20px", fontSize: 13, fontWeight: activeTab === tab ? 700 : 500,
                    color: activeTab === tab ? accent : textSecondary,
                    background: "none", border: "none",
                    borderBottom: activeTab === tab ? `2px solid ${accent}` : "2px solid transparent",
                    cursor: "pointer", transition: "all 0.2s",
                  }}>
                  {tab === "notes" ? "📝 강의 노트 & 자료" : "💬 질문 & 답변"}
                </button>
              ))}
            </div>

            <div style={{ padding: "36px 0", minHeight: 160, textAlign: "center", color: textSecondary, fontSize: 14 }}>
              {activeTab === "notes"
                ? "등록된 강의 노트나 자료가 아직 없습니다."
                : "등록된 질문이 없습니다. 첫 질문을 남겨보세요!"
              }
            </div>
          </div>
        </div>

        {/* ── 우측: 사이드바 ── */}
        <aside style={{
          width: 360, minWidth: 360, background: sidebarBg,
          borderLeft: `1px solid ${borderColor}`,
          display: "flex", flexDirection: "column", overflowY: "auto",
        }}>
          {/* 진도율 */}
          <div style={{ padding: "18px 22px", borderBottom: `1px solid ${borderColor}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>전체 진도율</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: progressPercent === 100 ? "#10b981" : accent }}>
                {progressPercent}% ({completedCount} / {totalLessons}강)
              </span>
            </div>
            <div style={{ height: 6, background: darkMode ? "#374151" : "#e2e8f0", borderRadius: 100, overflow: "hidden" }}>
              <div style={{
                width: `${progressPercent}%`, height: "100%", borderRadius: 100, transition: "width 0.5s ease",
                background: progressPercent === 100 ? "#10b981" : `linear-gradient(90deg, ${accent}, #d97706)`,
              }} />
            </div>
          </div>

          {/* 커리큘럼 */}
          <div style={{ flex: 1 }}>
            {(lecture.chapters || []).map((chapter: any, ci: number) => (
              <div key={chapter.id || ci}>
                {/* 챕터 헤더 */}
                <button onClick={() => setExpandedChapters(prev => ({ ...prev, [ci]: !prev[ci] }))}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 22px", background: "none", border: "none",
                    borderBottom: `1px solid ${borderColor}`, cursor: "pointer",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: accent, background: darkMode ? "#422006" : "#fef3c7", padding: "2px 8px", borderRadius: 4 }}>
                      Ch.{chapter.chapter_no}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>{chapter.title}</span>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="2"
                    style={{ transition: "transform 0.2s", transform: expandedChapters[ci] ? "rotate(180deg)" : "none" }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* 레슨 목록 */}
                {expandedChapters[ci] && (chapter.lessons || []).map((lesson: any) => {
                  const isActive = activeLessonId === lesson.id;
                  const isDone = completed.has(lesson.id);
                  return (
                    <button key={lesson.id} onClick={() => playLesson(lesson.id)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10,
                        padding: "12px 22px", background: isActive ? (darkMode ? "#422006" : "#fffbeb") : "transparent",
                        border: "none", borderLeft: isActive ? `3px solid ${accent}` : "3px solid transparent",
                        borderBottom: `1px solid ${darkMode ? "#1f2937" : "#f1f5f9"}`,
                        cursor: "pointer", transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = darkMode ? "#1f2937" : "#f8fafc"; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? (darkMode ? "#422006" : "#fffbeb") : "transparent"; }}>

                      {/* 아이콘 */}
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: isDone ? "#10b981" : isActive ? accent : (darkMode ? "#374151" : "#e2e8f0"),
                        color: isDone || isActive ? "#fff" : textSecondary, transition: "all 0.2s",
                      }}>
                        {isDone ? (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : (
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                        )}
                      </div>

                      {/* 레슨 제목 */}
                      <span style={{
                        fontSize: 13, fontWeight: isActive ? 700 : 500, textAlign: "left", flex: 1,
                        color: isActive ? accent : isDone ? "#10b981" : textPrimary,
                      }}>
                        {lesson.title}
                      </span>

                      {/* 시간 */}
                      {lesson.duration && (
                        <span style={{ fontSize: 11, color: textSecondary, flexShrink: 0 }}>{lesson.duration}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
