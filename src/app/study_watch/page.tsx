"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getLectureDetail, checkEnrollment } from "@/app/actions/lecture";
import { createClient } from "@/utils/supabase/client";

/* ── YouTube URL → embed URL ── */
const toEmbed = (url: string): string => {
  if (!url) return "";
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (m) return `https://www.youtube.com/embed/${m[1]}?rel=0&autoplay=1`;
  return url;
};

/* ── localStorage 진도 관리 ── */
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

export default function StudyWatchPage() {
  return (
    <Suspense fallback={<div style={{ padding: "100px", textAlign: "center", color: "#64748b" }}>수강 환경을 불러오는 중입니다...</div>}>
      <StudyWatchContent />
    </Suspense>
  );
}

function StudyWatchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lectureId = searchParams.get("id");
  const lessonParam = searchParams.get("lesson");

  const [lecture, setLecture] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"desc" | "files" | "qna">("desc");
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [activeLessonId, setActiveLessonId] = useState<string>("");

  /* ── 데이터 로드 ── */
  useEffect(() => {
    const fetchData = async () => {
      if (!lectureId) {
        setLoading(false);
        return;
      }
      const res = await getLectureDetail(lectureId);
      if (res.success && res.data) {
        setLecture(res.data);

        // 권한 체크
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          alert("로그인이 필요합니다.");
          router.replace(`/study_read?id=${lectureId}`);
          return;
        }

        const isFree = (res.data.discount_price || res.data.price || 0) <= 0;
        let hasAccess = false;
        let errorMessage = "수강 등록이 필요한 특강입니다.";

        const enrollRes = await checkEnrollment(lectureId, user.id);
        if (enrollRes.success && enrollRes.enrolled) {
          hasAccess = true;
        } else {
          if (enrollRes.error) {
            errorMessage = `수강 정보 확인 오류: ${enrollRes.error}`;
          }
          // 관리자/작성자 체크
          const { data: member } = await supabase.from("members").select("role").eq("id", user.id).single();
          if (res.data.author_id === user.id || member?.role === "ADMIN" || isFree) {
            hasAccess = true;
          }
        }

        if (!hasAccess) {
          alert(errorMessage);
          router.replace(`/study_read?id=${lectureId}`);
          return;
        }

        setCompleted(getProgress(lectureId));
        const allLessonsList = (res.data.chapters || []).flatMap((ch: any) => ch.lessons || []);
        if (lessonParam) {
          setActiveLessonId(lessonParam);
        } else if (allLessonsList.length > 0) {
          setActiveLessonId(allLessonsList[0].id);
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

  /* ── 수강 완료 → 다음 레슨 ── */
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

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
        수강 환경을 불러오는 중입니다...
      </div>
    );
  }

  if (!lecture) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 16 }}>
        <div style={{ fontSize: 48 }}>📭</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>강의 정보를 찾을 수 없습니다.</div>
        <Link href="/study" style={{ padding: "10px 24px", background: "#059669", color: "#fff", textDecoration: "none", borderRadius: 8, fontWeight: 700 }}>
          공실스터디 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const embedUrl = activeLesson?.video_url ? toEmbed(activeLesson.video_url) : "";
  const nextLesson = activeLessonIndex < allLessons.length - 1 ? allLessons[activeLessonIndex + 1] : null;

  return (
    <div style={{ backgroundColor: "#ffffff", minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", color: "#1e293b" }}>
      
      {/* ━━━ 1. TOP MINIMAL NAVBAR (윤자동 Learn 스타일 - 화면 상단 고정) ━━━ */}
      <header
        style={{
          position: "sticky",
          top: 0,
          height: 54,
          minHeight: 54,
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          zIndex: 50,
        }}
      >
        {/* Left: Back Link & Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, maxWidth: "60%" }}>
          <button
            onClick={() => router.push(`/study_read?id=${lectureId}`)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13.5,
              fontWeight: 700,
              color: "#059669",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            ← 강의 소개
          </button>
          <span style={{ color: "#cbd5e1" }}>|</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#062828", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {lecture.title}
          </span>
        </div>

        {/* Right: Progress Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>
            진도 <strong style={{ color: "#062828" }}>{completedCount}/{totalLessons}강</strong> ({progressPercent}%)
          </span>
          <div style={{ width: 110, height: 6, background: "#e2e8f0", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ width: `${progressPercent}%`, height: "100%", background: "#059669", borderRadius: 10, transition: "width 0.3s" }} />
          </div>
        </div>
      </header>

      {/* ━━━ 2. MAIN 2-COLUMN LAYOUT (윤자동 자연 스크롤 + 우측 Sticky 사이드바) ━━━ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", maxWidth: 1560, margin: "0 auto", width: "100%", alignItems: "start", boxSizing: "border-box" }}>
        
        {/* ── 좌측: 비디오 플레이어 & 본문 설명 (자연스러운 전체 스크롤) ── */}
        <div style={{ display: "flex", flexDirection: "column", background: "#ffffff", minWidth: 0, paddingBottom: 80 }}>
          
          {/* 비디오 컨테이너 */}
          <div style={{ width: "100%", background: "#062326", display: "flex", justifyContent: "center" }}>
            <div style={{ width: "100%", maxWidth: 1100, aspectRatio: "16/9", position: "relative" }}>
              {embedUrl ? (
                <iframe
                  key={activeLessonId}
                  src={embedUrl}
                  style={{ width: "100%", height: "100%", border: "none" }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#a7f3d0", gap: 10 }}>
                  <span style={{ fontSize: 44 }}>🎬</span>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>등록된 강의 영상이 없습니다.</span>
                </div>
              )}
            </div>
          </div>

          {/* 영상 하단 상세 영역 */}
          <div style={{ maxWidth: 1100, width: "100%", margin: "0 auto", padding: "28px 24px 0", boxSizing: "border-box" }}>
            
            {/* 레슨 뱃지 & 타이틀 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ background: "#ecfdf5", color: "#047857", fontSize: 12, fontWeight: 800, padding: "3px 8px", borderRadius: 4 }}>
                  {activeLessonIndex + 1}강
                </span>
                {activeLesson?.is_preview && (
                  <span style={{ background: "#f0fdf4", color: "#059669", border: "1px solid #d1fae5", fontSize: 11.5, fontWeight: 700, padding: "2px 7px", borderRadius: 4 }}>
                    미리보기
                  </span>
                )}
                <span style={{ fontSize: 12.5, color: "#64748b" }}>
                  {activeLesson?.duration_minutes ? `${activeLesson.duration_minutes}분` : "8:04"}
                </span>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: "#062828", margin: 0, lineHeight: 1.4 }}>
                {activeLesson ? `${activeLessonIndex + 1}강. ${activeLesson.title}` : "강의를 선택해 주세요"}
              </h2>
            </div>

            {/* 서브 탭 바 */}
            <div style={{ display: "flex", gap: 24, borderBottom: "1px solid #e2e8f0", marginBottom: 24 }}>
              <button
                onClick={() => setActiveTab("desc")}
                style={{
                  padding: "10px 0",
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === "desc" ? "2.5px solid #059669" : "2.5px solid transparent",
                  fontSize: 14.5,
                  fontWeight: activeTab === "desc" ? 800 : 600,
                  color: activeTab === "desc" ? "#062828" : "#64748b",
                  cursor: "pointer",
                }}
              >
                강의 설명
              </button>
              <button
                onClick={() => setActiveTab("files")}
                style={{
                  padding: "10px 0",
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === "files" ? "2.5px solid #059669" : "2.5px solid transparent",
                  fontSize: 14.5,
                  fontWeight: activeTab === "files" ? 800 : 600,
                  color: activeTab === "files" ? "#062828" : "#64748b",
                  cursor: "pointer",
                }}
              >
                자료 및 서식
              </button>
              <button
                onClick={() => setActiveTab("qna")}
                style={{
                  padding: "10px 0",
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === "qna" ? "2.5px solid #059669" : "2.5px solid transparent",
                  fontSize: 14.5,
                  fontWeight: activeTab === "qna" ? 800 : 600,
                  color: activeTab === "qna" ? "#062828" : "#64748b",
                  cursor: "pointer",
                }}
              >
                질문하기
              </button>
            </div>

            {/* 탭 내용 */}
            <div style={{ minHeight: 120, fontSize: 14.5, color: "#334155", lineHeight: 1.7, marginBottom: 36 }}>
              {activeTab === "desc" && (
                <div>
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
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {lecture.materials.map((mat: any, idx: number) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                          <span style={{ fontWeight: 600, color: "#062828" }}>📎 {mat.label || "실습 자료 및 계약서 양식"}</span>
                          <a href={mat.url} target="_blank" rel="noreferrer" style={{ padding: "6px 14px", background: "#059669", color: "#fff", textDecoration: "none", borderRadius: 6, fontSize: 12.5, fontWeight: 700 }}>
                            다운로드
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "#94a3b8", margin: 0 }}>본 강의에 등록된 별도 첨부파일이 없습니다.</p>
                  )}
                </div>
              )}

              {activeTab === "qna" && (
                <div>
                  <p style={{ color: "#94a3b8", margin: 0 }}>강의 내용 중 궁금한 점을 질문해 주시면 강사진이 답변해 드립니다.</p>
                </div>
              )}
            </div>

            {/* 하단 이전/다음 네비게이션 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 20, borderTop: "1px solid #e2e8f0" }}>
              <button
                onClick={handlePrevLesson}
                disabled={activeLessonIndex <= 0}
                style={{
                  padding: "10px 18px",
                  borderRadius: 8,
                  background: activeLessonIndex > 0 ? "#f1f5f9" : "#f8fafc",
                  color: activeLessonIndex > 0 ? "#334155" : "#cbd5e1",
                  border: "1px solid #e2e8f0",
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: activeLessonIndex > 0 ? "pointer" : "default",
                }}
              >
                ← 이전 강의
              </button>

              <button
                onClick={handleCompleteAndNext}
                style={{
                  padding: "11px 24px",
                  borderRadius: 8,
                  background: "#059669",
                  color: "#ffffff",
                  border: "none",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(5,150,105,0.25)",
                }}
              >
                {nextLesson ? `${nextLesson.lesson_no || activeLessonIndex + 2}강. ${nextLesson.title} →` : "✓ 수강 완료"}
              </button>
            </div>

          </div>
        </div>

        {/* ── 우측: 윤자동 스타일 Sticky 커리큘럼 사이드바 (화면 우측 고정) ── */}
        <aside
          style={{
            position: "sticky",
            top: 54,
            maxHeight: "calc(100vh - 54px)",
            overflowY: "auto",
            backgroundColor: "#f8fafc",
            borderLeft: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* 사이드바 헤더 */}
          <div style={{ padding: "18px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff", position: "sticky", top: 0, zIndex: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#062828" }}>커리큘럼</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>{completedCount}/{totalLessons}강</span>
          </div>

          <div style={{ padding: "12px 18px 6px", fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
            전체강의
          </div>

          {/* 레슨 리스트 */}
          <div style={{ flex: 1, padding: "0 12px 30px" }}>
            {allLessons.map((les: any, idx: number) => {
              const isActive = activeLessonId === les.id;
              const isDone = completed.has(les.id);

              return (
                <div
                  key={les.id || idx}
                  onClick={() => playLesson(les.id)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    marginBottom: 6,
                    cursor: "pointer",
                    backgroundColor: isActive ? "#062326" : isDone ? "#ffffff" : "#ffffff",
                    color: isActive ? "#ffffff" : "#1e293b",
                    border: isActive ? "1px solid #062326" : "1px solid #e2e8f0",
                    transition: "all 0.15s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                    {/* 번호 / 완료 아이콘 */}
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: isActive ? "#059669" : isDone ? "#ecfdf5" : "#f1f5f9",
                        color: isActive ? "#fff" : isDone ? "#047857" : "#64748b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {isDone ? "✓" : idx + 1}
                    </div>

                    <span
                      style={{
                        fontSize: 13.5,
                        fontWeight: isActive ? 800 : 600,
                        color: isActive ? "#ffffff" : "#1e293b",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {idx + 1}강. {les.title}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {les.is_preview && !isActive && (
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#ecfdf5", color: "#047857" }}>
                        미리보기
                      </span>
                    )}
                    <span style={{ fontSize: 11.5, color: isActive ? "#a7f3d0" : "#94a3b8" }}>
                      {les.duration_minutes ? `${les.duration_minutes}분` : "8:04"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

      </div>
    </div>
  );
}
