"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

/* ─── 타입 정의 ─── */
type Lesson = { id: string; title: string; duration?: string };
type Section = { title: string; lessons: Lesson[] };

/* ─── 더미 데이터 (레거시와 동일한 구조) ─── */
const COURSE_TITLE = "[2026] 부동산이 쉽게 활용하는 유튜브 쇼츠 운영법";
const CURRICULUM: Section[] = [
  {
    title: "쇼츠",
    lessons: [
      { id: "lesson-1", title: "유튜브 쇼츠 활용법", duration: "12:34" },
    ],
  },
];

const CURRENT_LESSON = CURRICULUM[0].lessons[0];

export default function StudyWatchPage() {
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({ 0: true });
  const [activeLesson, setActiveLesson] = useState(CURRENT_LESSON.id);
  const [activeTab, setActiveTab] = useState<"notes" | "qna">("notes");
  const [darkMode, setDarkMode] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const totalLessons = CURRICULUM.reduce((a, s) => a + s.lessons.length, 0);
  const completedCount = completed.size;
  const progressPercent = totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0;

  const toggleSection = (idx: number) => {
    setExpandedSections((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleComplete = () => {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.add(activeLesson);
      return next;
    });
  };

  // 스타일 변수
  const bg = darkMode ? "#1a1b1e" : "#ffffff";
  const textPrimary = darkMode ? "#e5e7eb" : "#1e293b";
  const textSecondary = darkMode ? "#9ca3af" : "#64748b";
  const sidebarBg = darkMode ? "#111827" : "#f8fafc";
  const borderColor = darkMode ? "#374151" : "#e2e8f0";
  const accentColor = "#0ea5e9"; // sky-500

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", background: bg, overflow: "hidden" }}>
      {/* ═══ 상단 헤더 바 ═══ */}
      <header style={{
        height: 56, minHeight: 56, background: bg, borderBottom: `1px solid ${borderColor}`,
        display: "flex", alignItems: "center", padding: "0 20px", gap: 16, position: "sticky", top: 0, zIndex: 50,
      }}>
        {/* 뒤로가기 */}
        <button
          onClick={() => router.back()}
          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14, color: textSecondary, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500, padding: 0 }}
          onMouseOver={(e) => (e.currentTarget.style.color = textPrimary)}
          onMouseOut={(e) => (e.currentTarget.style.color = textSecondary)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          뒤로가기
        </button>

        {/* 구분선 */}
        <div style={{ width: 1, height: 20, background: borderColor }} />

        {/* 강의 타이틀 */}
        <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {COURSE_TITLE}
        </div>

        {/* 다크모드 */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${borderColor}`, background: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, color: textSecondary }}
        >
          {darkMode ? "☀️" : "🌙"}
        </button>
      </header>

      {/* ═══ 메인 콘텐츠 (좌: 비디오 / 우: 사이드바) ═══ */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ── 좌측: 비디오 + 정보 ── */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {/* 비디오 플레이어 */}
          <div style={{ width: "100%", position: "relative", background: "#000" }}>
            <div style={{ paddingTop: "56.25%", position: "relative" }}>
              <iframe
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0"
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>

          {/* 강의 정보 영역 */}
          <div style={{ padding: "24px 32px" }}>
            {/* 강의명 + 수강완료 버튼 */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, marginBottom: 8 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: textPrimary, margin: "0 0 6px 0", lineHeight: 1.4 }}>
                  {CURRICULUM.flatMap(s => s.lessons).find(l => l.id === activeLesson)?.title || "강의"}
                </h2>
                <div style={{ fontSize: 13, color: textSecondary }}>
                  {CURRICULUM.find(s => s.lessons.some(l => l.id === activeLesson))?.title || ""}
                </div>
              </div>
              <button
                onClick={handleComplete}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "12px 24px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: completed.has(activeLesson) ? "#10b981" : accentColor,
                  color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                  whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.2s",
                  boxShadow: `0 2px 8px ${completed.has(activeLesson) ? "rgba(16,185,129,0.3)" : "rgba(14,165,233,0.3)"}`,
                }}
                onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
                onMouseOut={(e) => (e.currentTarget.style.transform = "none")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                {completed.has(activeLesson) ? "수강 완료됨" : "수강 완료 및 다음"}
              </button>
            </div>

            {/* 탭 메뉴 */}
            <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${borderColor}`, marginTop: 24 }}>
              <button
                onClick={() => setActiveTab("notes")}
                style={{
                  padding: "12px 20px", fontSize: 14, fontWeight: activeTab === "notes" ? 700 : 500,
                  color: activeTab === "notes" ? accentColor : textSecondary,
                  background: "none", border: "none", borderBottom: activeTab === "notes" ? `2px solid ${accentColor}` : "2px solid transparent",
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
                }}
              >
                강의 노트 & 자료
              </button>
              <button
                onClick={() => setActiveTab("qna")}
                style={{
                  padding: "12px 20px", fontSize: 14, fontWeight: activeTab === "qna" ? 700 : 500,
                  color: activeTab === "qna" ? accentColor : textSecondary,
                  background: "none", border: "none", borderBottom: activeTab === "qna" ? `2px solid ${accentColor}` : "2px solid transparent",
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
                }}
              >
                질문 & 답변 (Q&A)
              </button>
            </div>

            {/* 탭 콘텐츠 */}
            <div style={{ padding: "40px 0", minHeight: 200 }}>
              {activeTab === "notes" ? (
                <div style={{ textAlign: "center", color: textSecondary, fontSize: 14 }}>
                  등록된 핵심 요약이나 수업 배포 자료가 아직 없습니다.
                </div>
              ) : (
                <div style={{ textAlign: "center", color: textSecondary, fontSize: 14 }}>
                  등록된 질문이 없습니다. 첫 질문을 남겨보세요!
                </div>
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
              <span style={{ fontSize: 14, fontWeight: 700, color: accentColor }}>
                {progressPercent}% ({completedCount} / {totalLessons}강)
              </span>
            </div>
            <div style={{ height: 6, background: darkMode ? "#374151" : "#e2e8f0", borderRadius: 100, overflow: "hidden" }}>
              <div style={{ width: `${progressPercent}%`, height: "100%", background: accentColor, borderRadius: 100, transition: "width 0.5s ease" }} />
            </div>
          </div>

          {/* 커리큘럼 리스트 */}
          <div style={{ flex: 1 }}>
            {CURRICULUM.map((section, sIdx) => (
              <div key={sIdx}>
                {/* 섹션 헤더 */}
                <button
                  onClick={() => toggleSection(sIdx)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "16px 24px", background: "none", border: "none", borderBottom: `1px solid ${borderColor}`,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 700, color: textPrimary }}>{section.title}</span>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transition: "transform 0.2s", transform: expandedSections[sIdx] ? "rotate(180deg)" : "rotate(0)" }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* 강의 리스트 */}
                {expandedSections[sIdx] && section.lessons.map((lesson) => {
                  const isActive = activeLesson === lesson.id;
                  const isDone = completed.has(lesson.id);
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => setActiveLesson(lesson.id)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 12,
                        padding: "14px 24px", background: isActive ? (darkMode ? "#0c4a6e" : "#f0f9ff") : "transparent",
                        border: "none", borderLeft: isActive ? `4px solid ${accentColor}` : "4px solid transparent",
                        borderBottom: `1px solid ${borderColor}`, cursor: "pointer", fontFamily: "inherit",
                        transition: "all 0.15s",
                      }}
                      onMouseOver={(e) => { if (!isActive) e.currentTarget.style.background = darkMode ? "#1f2937" : "#f1f5f9"; }}
                      onMouseOut={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                    >
                      {/* 재생/완료 아이콘 */}
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: isDone ? "#10b981" : isActive ? accentColor : (darkMode ? "#374151" : "#e2e8f0"),
                        color: isDone || isActive ? "#fff" : textSecondary,
                      }}>
                        {isDone ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                        )}
                      </div>

                      {/* 강의명 */}
                      <span style={{
                        fontSize: 13, fontWeight: isActive ? 700 : 500, textAlign: "left",
                        color: isActive ? accentColor : textPrimary,
                        flex: 1,
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
