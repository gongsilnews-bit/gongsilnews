"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveLecture, getLectureDetail, uploadLectureThumbnail } from "@/app/actions/lecture";
import { createClient } from "@/utils/supabase/client";
import AdminSidebar from "@/components/admin/AdminSidebar";

/* ── 타입 ── */
type Chapter = {
  id?: string;
  chapter_no: number;
  title: string;
  sort_order: number;
  lessons: Lesson[];
};
type Lesson = {
  id?: string;
  lesson_no: number;
  title: string;
  video_url: string;
  duration: string;
  is_preview: boolean;
  sort_order: number;
};

const CATEGORIES = ["중개실무", "법률", "세무", "분양", "마케팅", "기타"];

export default function LectureWritePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loadId, setLoadId] = useState<string | null>(null);

  /* ── 기본 정보 ── */
  const [category, setCategory] = useState("중개실무");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);

  /* ── 강사 정보 ── */
  const [instructorName, setInstructorName] = useState("");
  const [instructorBio, setInstructorBio] = useState("");
  const [instructorPhoto, setInstructorPhoto] = useState("");

  /* ── 가격 ── */
  const [price, setPrice] = useState(0);
  const [discountPrice, setDiscountPrice] = useState<number | "">("");
  const [discountLabel, setDiscountLabel] = useState("");
  const [durationMonths, setDurationMonths] = useState(5);
  const [totalDuration, setTotalDuration] = useState("");

  /* ── 커리큘럼 ── */
  const [chapters, setChapters] = useState<Chapter[]>([
    { chapter_no: 1, title: "", sort_order: 0, lessons: [{ lesson_no: 1, title: "", video_url: "", duration: "", is_preview: false, sort_order: 0 }] },
  ]);
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set([0]));

  /* ── 초기 로드 ── */
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    fetchUser();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      if (id) {
        setLoadId(id);
        getLectureDetail(id).then((res) => {
          if (res.success && res.data) {
            const d = res.data;
            setCategory(d.category || "중개실무");
            setTitle(d.title || "");
            setSubtitle(d.subtitle || "");
            setDescription(d.description || "");
            setThumbnailUrl(d.thumbnail_url || "");
            setInstructorName(d.instructor_name || "");
            setInstructorBio(d.instructor_bio || "");
            setInstructorPhoto(d.instructor_photo || "");
            setPrice(d.price || 0);
            setDiscountPrice(d.discount_price ?? "");
            setDiscountLabel(d.discount_label || "");
            setDurationMonths(d.duration_months || 5);
            setTotalDuration(d.total_duration || "");

            if (d.chapters && d.chapters.length > 0) {
              setChapters(
                d.chapters.map((ch: any, ci: number) => ({
                  id: ch.id,
                  chapter_no: ch.chapter_no,
                  title: ch.title,
                  sort_order: ch.sort_order || ci,
                  lessons: (ch.lessons || []).map((ls: any, li: number) => ({
                    id: ls.id,
                    lesson_no: ls.lesson_no,
                    title: ls.title,
                    video_url: ls.video_url || "",
                    duration: ls.duration || "",
                    is_preview: ls.is_preview || false,
                    sort_order: ls.sort_order || li,
                  })),
                }))
              );
              setExpandedChapters(new Set(d.chapters.map((_: any, i: number) => i)));
            }
          }
        });
      }
    }
  }, []);

  /* ── 챕터/레슨 핸들러 ── */
  const addChapter = () => {
    setChapters((prev) => {
      const newIdx = prev.length;
      setExpandedChapters((s) => new Set([...s, newIdx]));
      return [
        ...prev,
        {
          chapter_no: prev.length + 1,
          title: "",
          sort_order: prev.length,
          lessons: [{ lesson_no: 1, title: "", video_url: "", duration: "", is_preview: false, sort_order: 0 }],
        },
      ];
    });
  };

  const removeChapter = (idx: number) => {
    if (chapters.length <= 1) return;
    setChapters((prev) => prev.filter((_, i) => i !== idx).map((ch, i) => ({ ...ch, chapter_no: i + 1, sort_order: i })));
  };

  const updateChapter = (idx: number, field: string, value: string) => {
    setChapters((prev) => prev.map((ch, i) => (i === idx ? { ...ch, [field]: value } : ch)));
  };

  const addLesson = (chapterIdx: number) => {
    setChapters((prev) =>
      prev.map((ch, i) =>
        i === chapterIdx
          ? {
              ...ch,
              lessons: [
                ...ch.lessons,
                { lesson_no: ch.lessons.length + 1, title: "", video_url: "", duration: "", is_preview: false, sort_order: ch.lessons.length },
              ],
            }
          : ch
      )
    );
  };

  const removeLesson = (chapterIdx: number, lessonIdx: number) => {
    setChapters((prev) =>
      prev.map((ch, i) =>
        i === chapterIdx
          ? { ...ch, lessons: ch.lessons.filter((_, li) => li !== lessonIdx).map((ls, li) => ({ ...ls, lesson_no: li + 1, sort_order: li })) }
          : ch
      )
    );
  };

  const updateLesson = (chapterIdx: number, lessonIdx: number, field: string, value: any) => {
    setChapters((prev) =>
      prev.map((ch, ci) =>
        ci === chapterIdx ? { ...ch, lessons: ch.lessons.map((ls, li) => (li === lessonIdx ? { ...ls, [field]: value } : ls)) } : ch
      )
    );
  };

  const toggleChapter = (idx: number) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  /* ── 썸네일 업로드 ── */
  const handleThumbnailUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setThumbnailUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", files[0]);
      formData.append("lecture_id", loadId || "temp");
      const res = await uploadLectureThumbnail(formData);
      if (res.success && res.url) {
        setThumbnailUrl(res.url);
      } else {
        alert("썸네일 업로드 실패: " + (res.error || "알 수 없는 오류"));
      }
    } catch (e: any) {
      alert("업로드 오류: " + e.message);
    }
    setThumbnailUploading(false);
  };

  /* ── 저장 ── */
  const handleSave = async (status: string) => {
    if (!title.trim()) {
      alert("강의 제목을 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      const res = await saveLecture({
        id: loadId || undefined,
        author_id: currentUserId || undefined,
        status,
        category,
        title,
        subtitle,
        description,
        thumbnail_url: thumbnailUrl,
        instructor_name: instructorName,
        instructor_bio: instructorBio,
        instructor_photo: instructorPhoto,
        price,
        discount_price: discountPrice === "" ? undefined : Number(discountPrice),
        discount_label: discountLabel,
        duration_months: durationMonths,
        total_duration: totalDuration,
        chapters: chapters.map((ch) => ({
          ...ch,
          lessons: ch.lessons.filter((ls) => ls.title.trim()),
        })).filter((ch) => ch.title.trim()),
      });

      if (res.success) {
        alert(status === "DRAFT" ? "임시저장 완료!" : "등록 완료!");
        router.push("/admin?menu=study");
      } else {
        alert("저장 실패: " + (res.error || ""));
      }
    } catch (e: any) {
      alert("오류: " + e.message);
    }
    setSaving(false);
  };

  /* ── 스타일 상수 ── */
  const sectionStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: 14,
    padding: "28px 32px",
    marginBottom: 20,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    border: "1px solid #e5e7eb",
  };
  const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 42,
    padding: "0 14px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    color: "#111",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  };
  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    height: 120,
    padding: "12px 14px",
    resize: "vertical" as const,
    lineHeight: "1.6",
  };
  const sectionTitleStyle: React.CSSProperties = { fontSize: 17, fontWeight: 800, color: "#111", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", background: "#f5f6f8" }}>
      {/* Sidebar */}
      <AdminSidebar activeMenu="study" onMenuChange={() => {}} />

      {/* Main */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <header
          style={{
            height: 64,
            background: "#fff",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 32px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => router.push("/admin?menu=study")}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#6b7280", display: "flex", alignItems: "center" }}
            >
              ←
            </button>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>{loadId ? "강의 수정" : "새 강의 등록"}</h1>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => handleSave("DRAFT")}
              disabled={saving}
              style={{
                height: 40,
                padding: "0 20px",
                background: "#fff",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
              }}
            >
              💾 임시저장
            </button>
            <button
              onClick={() => handleSave("ACTIVE")}
              disabled={saving}
              style={{
                height: 40,
                padding: "0 24px",
                background: "#f59e0b",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
              }}
            >
              🚀 공개 등록
            </button>
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            {/* ========== 1. 기본 정보 ========== */}
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>
                <span style={{ fontSize: 20 }}>📋</span> 기본 정보
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>카테고리 *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>총 강의 시간</label>
                  <input
                    type="text"
                    value={totalDuration}
                    onChange={(e) => setTotalDuration(e.target.value)}
                    placeholder='예: "4시간 10분"'
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>강의 제목 *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 초보 공인중개사도 월 천만 원 버는 상가 중개 실전 비법"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>부제목</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="예: 매물 접수부터 계약까지 완벽 가이드"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>상세 설명</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="강의에 대한 상세 소개를 입력하세요..."
                  style={textareaStyle}
                />
              </div>
            </div>

            {/* ========== 2. 썸네일 ========== */}
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>
                <span style={{ fontSize: 20 }}>🖼️</span> 강의 썸네일
              </div>

              <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 320,
                    aspectRatio: "16/9",
                    background: thumbnailUrl ? `url(${thumbnailUrl}) center/cover` : "#f3f4f6",
                    borderRadius: 10,
                    border: "2px dashed #d1d5db",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  {!thumbnailUrl && (
                    <span style={{ color: "#9ca3af", fontSize: 14, fontWeight: 600 }}>
                      {thumbnailUploading ? "업로드 중..." : "썸네일 미리보기"}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "10px 20px",
                      background: "#3b82f6",
                      color: "#fff",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    📎 이미지 업로드
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleThumbnailUpload(e.target.files)}
                      style={{ display: "none" }}
                    />
                  </label>
                  <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 10, lineHeight: "1.5" }}>
                    권장 사이즈: 1280 × 720 (16:9)<br />
                    형식: JPG, PNG, WebP
                  </p>
                  {thumbnailUrl && (
                    <button
                      onClick={() => setThumbnailUrl("")}
                      style={{ marginTop: 8, padding: "6px 14px", fontSize: 12, color: "#ef4444", border: "1px solid #fca5a5", borderRadius: 6, background: "#fff", cursor: "pointer", fontWeight: 600 }}
                    >
                      🗑️ 삭제
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ========== 3. 강사 정보 ========== */}
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>
                <span style={{ fontSize: 20 }}>👨‍🏫</span> 강사 정보
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>강사명</label>
                  <input
                    type="text"
                    value={instructorName}
                    onChange={(e) => setInstructorName(e.target.value)}
                    placeholder="예: 부동산마스터 김대표"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>프로필 사진 URL</label>
                  <input
                    type="text"
                    value={instructorPhoto}
                    onChange={(e) => setInstructorPhoto(e.target.value)}
                    placeholder="https://..."
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>강사 소개</label>
                <textarea
                  value={instructorBio}
                  onChange={(e) => setInstructorBio(e.target.value)}
                  placeholder="- (현) 공실뉴스 부동산 아카데미 대표강사&#10;- (현) 강남역 1번출구 부동산중개법인 대표"
                  style={textareaStyle}
                />
              </div>
            </div>

            {/* ========== 4. 가격 설정 ========== */}
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>
                <span style={{ fontSize: 20 }}>💰</span> 가격 설정
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>정가 (원)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    placeholder="300000"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>할인가 (원)</label>
                  <input
                    type="number"
                    value={discountPrice}
                    onChange={(e) => setDiscountPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="210000"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>수강 기간 (개월)</label>
                  <input
                    type="number"
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(Number(e.target.value))}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>할인 라벨</label>
                <input
                  type="text"
                  value={discountLabel}
                  onChange={(e) => setDiscountLabel(e.target.value)}
                  placeholder='예: "🔥 기간 한정 30% 얼리버드 혜택"'
                  style={inputStyle}
                />
              </div>
            </div>

            {/* ========== 5. 커리큘럼 빌더 ========== */}
            <div style={sectionStyle}>
              <div style={{ ...sectionTitleStyle, justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>📚</span> 커리큘럼
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#6b7280" }}>
                    ({chapters.length}개 챕터, {chapters.reduce((sum, ch) => sum + ch.lessons.length, 0)}개 강의)
                  </span>
                </div>
                <button
                  onClick={addChapter}
                  style={{
                    height: 36,
                    padding: "0 16px",
                    background: "#10b981",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  + 챕터 추가
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {chapters.map((chapter, ci) => (
                  <div key={ci} style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", background: "#fafbfc" }}>
                    {/* 챕터 헤더 */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "14px 20px",
                        background: "#f1f5f9",
                        cursor: "pointer",
                        borderBottom: expandedChapters.has(ci) ? "1px solid #e5e7eb" : "none",
                      }}
                      onClick={() => toggleChapter(ci)}
                    >
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#8a3ffc", background: "#ede9fe", padding: "2px 10px", borderRadius: 4 }}>
                        Ch.{chapter.chapter_no}
                      </span>
                      <input
                        type="text"
                        value={chapter.title}
                        onChange={(e) => { e.stopPropagation(); updateChapter(ci, "title", e.target.value); }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="챕터 제목을 입력하세요"
                        style={{ flex: 1, height: 34, padding: "0 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, fontWeight: 700, color: "#111", outline: "none", background: "#fff" }}
                      />
                      <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {chapter.lessons.length}개 강의
                      </span>
                      <span style={{ color: "#9ca3af", fontSize: 16, transition: "transform 0.2s", transform: expandedChapters.has(ci) ? "rotate(180deg)" : "none" }}>
                        ▼
                      </span>
                      {chapters.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeChapter(ci); }}
                          style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #fca5a5", background: "#fff", color: "#ef4444", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                          title="챕터 삭제"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* 레슨 목록 */}
                    {expandedChapters.has(ci) && (
                      <div style={{ padding: "16px 20px" }}>
                        {chapter.lessons.map((lesson, li) => (
                          <div
                            key={li}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "32px 1fr 200px 80px 60px 32px",
                              gap: 8,
                              alignItems: "center",
                              marginBottom: 10,
                              padding: "8px 12px",
                              background: "#fff",
                              borderRadius: 8,
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#8a3ffc", textAlign: "center" }}>
                              {ci + 1}-{li + 1}
                            </span>
                            <input
                              type="text"
                              value={lesson.title}
                              onChange={(e) => updateLesson(ci, li, "title", e.target.value)}
                              placeholder="강의 제목"
                              style={{ height: 34, padding: "0 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, color: "#111", outline: "none" }}
                            />
                            <input
                              type="text"
                              value={lesson.video_url}
                              onChange={(e) => updateLesson(ci, li, "video_url", e.target.value)}
                              placeholder="YouTube URL"
                              style={{ height: 34, padding: "0 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, color: "#555", outline: "none" }}
                            />
                            <input
                              type="text"
                              value={lesson.duration}
                              onChange={(e) => updateLesson(ci, li, "duration", e.target.value)}
                              placeholder="12:40"
                              style={{ height: 34, padding: "0 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, color: "#555", textAlign: "center", outline: "none" }}
                            />
                            <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 11, color: "#6b7280", whiteSpace: "nowrap" }}>
                              <input
                                type="checkbox"
                                checked={lesson.is_preview}
                                onChange={(e) => updateLesson(ci, li, "is_preview", e.target.checked)}
                                style={{ accentColor: "#3b82f6" }}
                              />
                              미리보기
                            </label>
                            <button
                              onClick={() => removeLesson(ci, li)}
                              style={{ width: 28, height: 28, border: "1px solid #fca5a5", borderRadius: 6, background: "#fff", color: "#ef4444", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                              title="강의 삭제"
                            >
                              ×
                            </button>
                          </div>
                        ))}

                        <button
                          onClick={() => addLesson(ci)}
                          style={{
                            width: "100%",
                            height: 36,
                            border: "2px dashed #d1d5db",
                            borderRadius: 8,
                            background: "none",
                            color: "#6b7280",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            marginTop: 4,
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.color = "#3b82f6"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.color = "#6b7280"; }}
                        >
                          + 강의 추가
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ========== 하단 버튼 ========== */}
            <div style={{ display: "flex", justifyContent: "center", gap: 16, padding: "20px 0 60px" }}>
              <button
                onClick={() => router.push("/admin?menu=study")}
                style={{
                  height: 48,
                  padding: "0 32px",
                  background: "#fff",
                  color: "#6b7280",
                  border: "1px solid #d1d5db",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                onClick={() => handleSave("DRAFT")}
                disabled={saving}
                style={{
                  height: 48,
                  padding: "0 32px",
                  background: "#fff",
                  color: "#374151",
                  border: "1px solid #d1d5db",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                💾 임시저장
              </button>
              <button
                onClick={() => handleSave("ACTIVE")}
                disabled={saving}
                style={{
                  height: 48,
                  padding: "0 40px",
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                  boxShadow: "0 4px 14px rgba(245,158,11,0.3)",
                }}
              >
                🚀 공개 등록
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
