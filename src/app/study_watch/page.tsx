"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getLectureDetail } from "@/app/actions/lecture";

/* ── YouTube URL → embed URL ── */
const toEmbed = (url: string): string => {
  if (!url) return "";
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (m) return `https://www.youtube.com/embed/${m[1]}?rel=0`;
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
  const [activeLessonId, setActiveLessonId] = useState<string>("");

  /* ── 데이터 로드 ── */
  useEffect(() => {
    const fetchData = async () => {
      if (!lectureId) { setLoading(false); return; }
      const res = await getLectureDetail(lectureId);
      if (res.success && res.data) {
        setLecture(res.data);
        const exp: Record<number, boolean> = {};
        (res.data.chapters || []).forEach((_: any, i: number) => { exp[i] = true; });
        setExpandedChapters(exp);
        setCompleted(getProgress(lectureId));
        const allLessons = (res.data.chapters || []).flatMap((ch: any) => ch.lessons || []);
        if (lessonParam) {
          setActiveLessonId(lessonParam);
        } else if (allLessons.length > 0) {
          setActiveLessonId(allLessons[0].id);
        }
      }
      setLoading(false);
    };
    fetchData();
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

  const playLesson = useCallback((lessonId: string) => { setActiveLessonId(lessonId); }, []);

  /* ── 수강 완료 → 다음 레슨 ── */
  const handleComplete = () => {
    if (!activeLessonId || !lectureId) return;
    const next = new Set(completed);
    next.add(activeLessonId);
    setCompleted(next);
    saveProgress(lectureId, next);
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
        height: 56, minHeight: 56, background: darkMode ? "#111827" : "#fff",
        borderBottom: `1px solid ${borderColor}`,
        display: "flex", alignItems: "center", padding: "0 20px", gap: 16,
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <button onClick={() => router.push(`/study_read?id=${lectureId}`)}
          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14, color: textSecondary, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500, padding: 0 }}
          onMouseOver={(e) => (e.currentTarget.style.color = textPrimary)}
          onMouseOut={(e) => (e.currentTarget.style.color = textSecondary)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          뒤로가기
        </button>
        <div style={{ width: 1, height: 20, background: borderColor }} />
        <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {lecture.title}
        </div>
        <button onClick={() => setDarkMode(!darkMode)}
          style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${borderColor}`, background: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, color: textSecondary }}>
          {darkMode ? "☀️" : "🌙"}
        </button>
      </header>

      {/* ═══ 메인 ═══ */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── 좌측: 비디오 + 정보 ── */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {/* 비디오 */}
          <div style={{ width: "100%", position: "relative", background: "#000", flexShrink: 0 }}>
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

          {/* 강의 정보 영역 */}
          <div style={{ padding: "24px 32px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 12, color: accent, fontWeight: 700, marginBottom: 4 }}>
                  {activeLesson ? `Chapter ${activeLesson.chapterNo} · ${activeLesson.chapterTitle}` : ""}
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: textPrimary, margin: "0 0 6px 0", lineHeight: 1.4 }}>
                  {activeLesson ? `${activeLesson.chapterNo}-${activeLesson.lesson_no}. ${activeLesson.title}` : "강의를 선택하세요"}
                </h2>
              </div>
              <button onClick={handleComplete}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "12px 24px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: completed.has(activeLessonId) ? "#10b981" : accent,
                  color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                  whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.2s",
                  boxShadow: `0 2px 8px ${completed.has(activeLessonId) ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
                }}
                onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
                onMouseOut={(e) => (e.currentTarget.style.transform = "none")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                {completed.has(activeLessonId)
                  ? "✅ 수강 완료"
                  : activeLessonIndex < allLessons.length - 1
                    ? "수강 완료 및 다음"
                    : "수강 완료"
                }
              </button>
            </div>

            {/* 탭 메뉴 */}
            <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${borderColor}`, marginTop: 24 }}>
              <button onClick={() => setActiveTab("notes")}
                style={{ padding: "12px 20px", fontSize: 14, fontWeight: activeTab === "notes" ? 700 : 500, color: activeTab === "notes" ? accent : textSecondary, background: "none", border: "none", borderBottom: activeTab === "notes" ? `2px solid ${accent}` : "2px solid transparent", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>
                📝 강의 노트 & 자료
              </button>
              <button onClick={() => setActiveTab("qna")}
                style={{ padding: "12px 20px", fontSize: 14, fontWeight: activeTab === "qna" ? 700 : 500, color: activeTab === "qna" ? accent : textSecondary, background: "none", border: "none", borderBottom: activeTab === "qna" ? `2px solid ${accent}` : "2px solid transparent", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>
                💬 질문 & 답변 (Q&A)
              </button>
            </div>

            <div style={{ padding: "40px 0", minHeight: 200 }}>
              {activeTab === "notes" ? (
                <>
                  {(lecture.materials && lecture.materials.length > 0) ? (
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px 0", color: textPrimary }}>📑 참고 자료 / 첨부 파일</h3>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                        {lecture.materials.map((mat: any, idx: number) => {
                          let icon = "🔗";
                          switch(mat.type) {
                            case "YOUTUBE": icon = "🎬"; break;
                            case "DRIVE": icon = "📁"; break;
                            case "FILE": icon = "📎"; break;
                            case "LINK": icon = "🔗"; break;
                          }
                          return (
                            <a key={idx} href={mat.url} target="_blank" rel="noopener noreferrer"
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px",
                                background: darkMode ? "#1f2937" : "#f8fafc",
                                border: `1px solid ${borderColor}`, borderRadius: 8,
                                textDecoration: "none", color: textPrimary,
                                transition: "all 0.2s",
                                maxWidth: 300, minWidth: 200
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)"; }}
                              onMouseOut={(e) => { e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                            >
                              <span style={{ fontSize: 18 }}>{icon}</span>
                              <span style={{ fontSize: 13, fontWeight: 700, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{mat.label || (mat.type === "FILE" ? "첨부파일" : "참고자료")}</span>
                              <span style={{ fontSize: 11, color: accent, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: darkMode ? "#422006" : "#fef3c7", whiteSpace: "nowrap" }}>
                                {mat.type === "FILE" ? "다운로드" : "열기"}
                              </span>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", color: textSecondary, fontSize: 14 }}>등록된 강의 노트나 자료가 아직 없습니다.</div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: "center", color: textSecondary, fontSize: 14 }}>등록된 질문이 없습니다. 첫 질문을 남겨보세요!</div>
              )}
            </div>
          </div>
        </div>

        {/* ── 우측: 사이드바 (커리큘럼) ── */}
        <aside style={{
          width: 380, minWidth: 380, background: sidebarBg,
          borderLeft: `1px solid ${borderColor}`,
          display: "flex", flexDirection: "column", overflowY: "auto",
        }}>
          {/* 진도율 */}
          <div style={{ padding: "20px 24px", borderBottom: `1px solid ${borderColor}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>전체 진도율</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: progressPercent === 100 ? "#10b981" : accent }}>
                {progressPercent}% ({completedCount} / {totalLessons}강)
              </span>
            </div>
            <div style={{ height: 6, background: darkMode ? "#374151" : "#e2e8f0", borderRadius: 100, overflow: "hidden" }}>
              <div style={{ width: `${progressPercent}%`, height: "100%", background: progressPercent === 100 ? "#10b981" : `linear-gradient(90deg, ${accent}, #d97706)`, borderRadius: 100, transition: "width 0.5s ease" }} />
            </div>
          </div>

          {/* 커리큘럼 리스트 */}
          <div style={{ flex: 1 }}>
            {(lecture.chapters || []).map((chapter: any, ci: number) => (
              <div key={chapter.id || ci}>
                <button onClick={() => setExpandedChapters(prev => ({ ...prev, [ci]: !prev[ci] }))}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "16px 24px", background: "none", border: "none", borderBottom: `1px solid ${borderColor}`,
                    cursor: "pointer", fontFamily: "inherit",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: accent, background: darkMode ? "#422006" : "#fef3c7", padding: "2px 8px", borderRadius: 4 }}>
                      Ch.{chapter.chapter_no}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: textPrimary }}>{chapter.title}</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transition: "transform 0.2s", transform: expandedChapters[ci] ? "rotate(180deg)" : "rotate(0)" }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {expandedChapters[ci] && (chapter.lessons || []).map((lesson: any) => {
                  const isActive = activeLessonId === lesson.id;
                  const isDone = completed.has(lesson.id);
                  return (
                    <button key={lesson.id} onClick={() => playLesson(lesson.id)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 12,
                        padding: "14px 24px", background: isActive ? (darkMode ? "#422006" : "#fffbeb") : "transparent",
                        border: "none", borderLeft: isActive ? `4px solid ${accent}` : "4px solid transparent",
                        borderBottom: `1px solid ${borderColor}`, cursor: "pointer", fontFamily: "inherit",
                        transition: "all 0.15s",
                      }}
                      onMouseOver={(e) => { if (!isActive) e.currentTarget.style.background = darkMode ? "#1f2937" : "#f1f5f9"; }}
                      onMouseOut={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? (darkMode ? "#422006" : "#fffbeb") : "transparent"; }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: isDone ? "#10b981" : isActive ? accent : (darkMode ? "#374151" : "#e2e8f0"),
                        color: isDone || isActive ? "#fff" : textSecondary,
                      }}>
                        {isDone ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                        )}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, textAlign: "left", color: isActive ? accent : isDone ? "#10b981" : textPrimary, flex: 1 }}>
                        {lesson.title}
                      </span>
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
