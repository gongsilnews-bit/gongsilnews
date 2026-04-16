"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveLecture, getLectureDetail, uploadLectureImage } from "@/app/actions/lecture";
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
type Material = {
  type: string;
  label: string;
  url: string;
};

const CATEGORIES = ["중개실무", "법률", "세무", "분양", "마케팅", "기타"];

/* ── WebP 압축 변환 ── */
const compressToWebP = (file: File, maxWidth = 1920, quality = 0.82): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) { resolve(file); return; }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        const webpFile = new File([blob!], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' });
        resolve(webpFile);
      }, 'image/webp', quality);
    };
    img.src = URL.createObjectURL(file);
  });
};

export default function StudyWriteForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loadId, setLoadId] = useState<string | null>(null);

  /* ── 기본 정보 ── */
  const [category, setCategory] = useState("중개실무");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [photoUploading, setPhotoUploading] = useState(false);

  /* ── 에디터 ── */
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const editorFileRef = useRef<HTMLInputElement>(null);
  const [editorUploading, setEditorUploading] = useState(false);

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

  /* ── 자료 첨부 ── */
  const [materials, setMaterials] = useState<Material[]>([]);

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
            // 이미지 배열 복원
            const loadedImages: string[] = d.images || [];
            if (d.thumbnail_url && !loadedImages.includes(d.thumbnail_url)) {
              loadedImages.unshift(d.thumbnail_url);
            }
            setImages(loadedImages);
            if (d.thumbnail_url && loadedImages.length > 0) {
              const idx = loadedImages.indexOf(d.thumbnail_url);
              setCoverIndex(idx >= 0 ? idx : 0);
            }
            setInstructorName(d.instructor_name || "");
            setInstructorBio(d.instructor_bio || "");
            setInstructorPhoto(d.instructor_photo || "");
            setPrice(d.price || 0);
            setDiscountPrice(d.discount_price ?? "");
            setDiscountLabel(d.discount_label || "");
            setDurationMonths(d.duration_months || 5);
            setTotalDuration(d.total_duration || "");
            setMaterials(d.materials || []);

            // 에디터에 기존 HTML 로드
            if (d.description && editorRef.current) {
              editorRef.current.innerHTML = d.description;
            }

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

  /* ── 에디터에 기존 description 로드 (초기 렌더 시) ── */
  useEffect(() => {
    if (description && editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = description;
    }
  }, [description]);

  /* ── 에디터 커서 저장 ── */
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }
  };

  /* ── 에디터 명령 실행 ── */
  const execCmd = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncEditorContent();
  };

  /* ── 에디터 내용 → state 동기화 ── */
  const syncEditorContent = () => {
    if (editorRef.current) {
      setDescription(editorRef.current.innerHTML);
    }
  };

  /* ── 에디터 내 이미지 삽입 (WebP 압축 → 업로드 → URL 삽입) ── */
  const handleEditorImageInsert = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setEditorUploading(true);

    for (const rawFile of Array.from(files)) {
      if (!rawFile.type.startsWith('image/')) continue;

      // WebP 압축
      const compressed = await compressToWebP(rawFile);

      // 서버 업로드
      const formData = new FormData();
      formData.append("file", compressed);
      formData.append("lecture_id", loadId || "temp");
      formData.append("type", "content");

      const res = await uploadLectureImage(formData);
      if (res.success && res.url) {
        // 에디터 커서 위치에 삽입
        if (editorRef.current) {
          editorRef.current.focus();

          const wrapper = document.createElement('div');
          wrapper.style.cssText = 'margin: 16px 0; text-align: center;';
          wrapper.setAttribute('contenteditable', 'false');
          wrapper.className = 'inserted-photo';

          const img = document.createElement('img');
          img.src = res.url;
          img.style.cssText = 'max-width: 100%; height: auto; border-radius: 8px; display: block; margin: 0 auto;';
          img.alt = '강의 이미지';
          wrapper.appendChild(img);

          const br = document.createElement('br');

          if (savedRangeRef.current && editorRef.current.contains(savedRangeRef.current.commonAncestorContainer)) {
            const range = savedRangeRef.current;
            range.deleteContents();
            range.insertNode(br);
            range.insertNode(wrapper);
            range.setStartAfter(br);
            range.collapse(true);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
          } else {
            editorRef.current.appendChild(wrapper);
            editorRef.current.appendChild(br);
          }

          syncEditorContent();
        }
      } else {
        alert("이미지 업로드 실패: " + (res.error || ""));
      }
    }

    setEditorUploading(false);
    // input 초기화
    if (editorFileRef.current) editorFileRef.current.value = "";
  };

  /* ── 사진 여러장 업로드 (WebP 압축) ── */
  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPhotoUploading(true);
    const newUrls: string[] = [];
    for (const rawFile of Array.from(files)) {
      if (!rawFile.type.startsWith('image/')) continue;
      try {
        const compressed = await compressToWebP(rawFile);
        const formData = new FormData();
        formData.append("file", compressed);
        formData.append("lecture_id", loadId || "temp");
        formData.append("type", "thumbnail");
        const res = await uploadLectureImage(formData);
        if (res.success && res.url) {
          newUrls.push(res.url);
        } else {
          alert("업로드 실패: " + (res.error || ""));
        }
      } catch (e: any) {
        alert("오류: " + e.message);
      }
    }
    if (newUrls.length > 0) {
      setImages(prev => {
        const next = [...prev, ...newUrls];
        if (prev.length === 0) setCoverIndex(0);
        return next;
      });
    }
    setPhotoUploading(false);
  };

  const removePhoto = (idx: number) => {
    setImages(prev => {
      const next = prev.filter((_, i) => i !== idx);
      // 커버 인덱스 보정
      if (coverIndex === idx) setCoverIndex(0);
      else if (coverIndex > idx) setCoverIndex(ci => ci - 1);
      return next;
    });
  };

  const setCover = (idx: number) => setCoverIndex(idx);

  /* ── 챕터/레슨 핸들러 ── */
  const addChapter = () => {
    setChapters((prev) => {
      const newIdx = prev.length;
      setExpandedChapters((s) => new Set([...s, newIdx]));
      return [
        ...prev,
        { chapter_no: prev.length + 1, title: "", sort_order: prev.length, lessons: [{ lesson_no: 1, title: "", video_url: "", duration: "", is_preview: false, sort_order: 0 }] },
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
          ? { ...ch, lessons: [...ch.lessons, { lesson_no: ch.lessons.length + 1, title: "", video_url: "", duration: "", is_preview: false, sort_order: ch.lessons.length }] }
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

  /* ── 저장 ── */
  const handleSave = async (status: string) => {
    if (!title.trim()) { alert("강의 제목을 입력해주세요."); return; }
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
        thumbnail_url: images.length > 0 ? images[coverIndex] || images[0] : "",
        images,
        instructor_name: instructorName,
        instructor_bio: instructorBio,
        instructor_photo: instructorPhoto,
        price,
        discount_price: discountPrice === "" ? undefined : Number(discountPrice),
        discount_label: discountLabel,
        duration_months: durationMonths,
        total_duration: totalDuration,
        materials,
        chapters: chapters.map((ch) => ({ ...ch, lessons: ch.lessons.filter((ls) => ls.title.trim()) })).filter((ch) => ch.title.trim()),
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
  const sectionStyle: React.CSSProperties = { background: "#fff", borderRadius: 14, padding: "28px 32px", marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #e5e7eb" };
  const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" };
  const inputStyle: React.CSSProperties = { width: "100%", height: 42, padding: "0 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, color: "#111", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" };
  const textareaStyle: React.CSSProperties = { ...inputStyle, height: 120, padding: "12px 14px", resize: "vertical" as const, lineHeight: "1.6" };
  const sectionTitleStyle: React.CSSProperties = { fontSize: 17, fontWeight: 800, color: "#111", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 };

  /* ── 에디터 툴바 버튼 ── */
  const ToolBtn = ({ onClick, title: t, children, active }: { onClick: () => void; title: string; children: React.ReactNode; active?: boolean }) => (
    <button
      onClick={onClick}
      title={t}
      style={{
        width: 34, height: 34, border: "1px solid #d1d5db", borderRadius: 6, background: active ? "#e5e7eb" : "#fff",
        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, color: "#374151", transition: "all 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f4f6"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = active ? "#e5e7eb" : "#fff"; }}
    >
      {children}
    </button>
  );

  // ArticleSection/StudySection 등 대시보드 내부 영역에 렌더링되므로, 기존의 사이드바 및 헤더, 100vh 래퍼를 제거하고 콘텐츠만 반환합니다.
  return (
    <>
      <div style={{ padding: "24px 32px", width: "100%", maxWidth: 1000, margin: "0 auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111", margin: 0 }}>{loadId ? "강의 수정" : "새 강의 등록"}</h2>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => router.push("?menu=study")} style={{ height: 40, padding: "0 20px", background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>취소</button>
            <button onClick={() => handleSave("DRAFT")} disabled={saving} style={{ height: 40, padding: "0 20px", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>💾 임시저장</button>
            <button onClick={() => handleSave("ACTIVE")} disabled={saving} style={{ height: 40, padding: "0 24px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>🚀 공개 등록</button>
          </div>
        </div>

        {/* ========== 1. 기본 정보 ========== */}
        <div style={sectionStyle}>
              <div style={sectionTitleStyle}><span style={{ fontSize: 20 }}>📋</span> 기본 정보</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>카테고리 *</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>총 강의 시간</label>
                  <input type="text" value={totalDuration} onChange={(e) => setTotalDuration(e.target.value)} placeholder='예: "4시간 10분"' style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>강의 제목 *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 초보 공인중개사도 월 천만 원 버는 상가 중개 실전 비법" style={inputStyle} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>부제목</label>
                <input type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="예: 매물 접수부터 계약까지 완벽 가이드" style={inputStyle} />
              </div>

              {/* ── 리치 에디터 (상세 설명) ── */}
              <div>
                <label style={labelStyle}>상세 설명</label>

                {/* 툴바 */}
                <div style={{
                  display: "flex", flexWrap: "wrap", gap: 4, padding: "8px 12px",
                  border: "1px solid #d1d5db", borderBottom: "none", borderRadius: "8px 8px 0 0",
                  background: "#f9fafb",
                }}>
                  <ToolBtn onClick={() => execCmd("bold")} title="굵게 (Ctrl+B)"><b>B</b></ToolBtn>
                  <ToolBtn onClick={() => execCmd("italic")} title="기울임 (Ctrl+I)"><i>I</i></ToolBtn>
                  <ToolBtn onClick={() => execCmd("underline")} title="밑줄 (Ctrl+U)"><u>U</u></ToolBtn>
                  <ToolBtn onClick={() => execCmd("strikeThrough")} title="취소선"><s>S</s></ToolBtn>
                  <div style={{ width: 1, background: "#d1d5db", margin: "0 4px" }} />
                  <ToolBtn onClick={() => execCmd("formatBlock", "h2")} title="제목 (H2)"><span style={{ fontWeight: 800, fontSize: 14 }}>H2</span></ToolBtn>
                  <ToolBtn onClick={() => execCmd("formatBlock", "h3")} title="소제목 (H3)"><span style={{ fontWeight: 800, fontSize: 12 }}>H3</span></ToolBtn>
                  <ToolBtn onClick={() => execCmd("formatBlock", "p")} title="본문 (P)"><span style={{ fontSize: 12 }}>P</span></ToolBtn>
                  <div style={{ width: 1, background: "#d1d5db", margin: "0 4px" }} />
                  <ToolBtn onClick={() => execCmd("insertUnorderedList")} title="목록">•</ToolBtn>
                  <ToolBtn onClick={() => execCmd("insertOrderedList")} title="번호 목록">1.</ToolBtn>
                  <div style={{ width: 1, background: "#d1d5db", margin: "0 4px" }} />
                  <ToolBtn onClick={() => execCmd("justifyLeft")} title="왼쪽 정렬">⫷</ToolBtn>
                  <ToolBtn onClick={() => execCmd("justifyCenter")} title="가운데 정렬">☰</ToolBtn>
                  <div style={{ width: 1, background: "#d1d5db", margin: "0 4px" }} />
                  <ToolBtn onClick={() => { saveSelection(); editorFileRef.current?.click(); }} title="사진 삽입 (WebP 자동 압축)">
                    📷
                  </ToolBtn>
                  {editorUploading && (
                    <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600, display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
                      ⏳ 업로드 중...
                    </span>
                  )}
                  <input
                    ref={editorFileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleEditorImageInsert(e.target.files)}
                    style={{ display: "none" }}
                  />
                </div>

                {/* 에디터 본문 */}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={syncEditorContent}
                  onMouseUp={saveSelection}
                  onKeyUp={saveSelection}
                  onPaste={async (e) => {
                    // 클립보드 이미지 붙여넣기 지원
                    const items = e.clipboardData?.items;
                    if (items) {
                      for (const item of Array.from(items)) {
                        if (item.type.startsWith("image/")) {
                          e.preventDefault();
                          const file = item.getAsFile();
                          if (file) {
                            const dt = new DataTransfer();
                            dt.items.add(file);
                            await handleEditorImageInsert(dt.files);
                          }
                          return;
                        }
                      }
                    }
                  }}
                  style={{
                    minHeight: 320,
                    maxHeight: 600,
                    overflowY: "auto",
                    padding: "16px 18px",
                    border: "1px solid #d1d5db",
                    borderRadius: "0 0 8px 8px",
                    fontSize: 15,
                    lineHeight: "1.8",
                    color: "#111",
                    outline: "none",
                    background: "#fff",
                  }}
                  data-placeholder="강의에 대한 상세 소개를 입력하세요. 사진을 삽입하면 WebP로 자동 압축됩니다."
                />
                <style>{`
                  [contenteditable]:empty:before {
                    content: attr(data-placeholder);
                    color: #9ca3af;
                    pointer-events: none;
                  }
                  .inserted-photo { position: relative; }
                  .inserted-photo:hover::after {
                    content: '✕';
                    position: absolute; top: 8px; right: 8px;
                    width: 26px; height: 26px; border-radius: 50%;
                    background: rgba(239,68,68,0.9); color: #fff;
                    font-size: 13px; font-weight: 700;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                  }
                `}</style>
              </div>
            </div>

            {/* ========== 2. 강의 이미지 (여러장 + 대표이미지 선택) ========== */}
            <div style={sectionStyle}>
              <div style={{ ...sectionTitleStyle, justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>🖼️</span> 강의 이미지
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#6b7280" }}>
                    ({images.length}장{images.length > 0 ? ` · 대표: ${coverIndex + 1}번` : ""})
                  </span>
                </div>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", background: "#3b82f6", color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: photoUploading ? "not-allowed" : "pointer", opacity: photoUploading ? 0.6 : 1 }}>
                  {photoUploading ? "⏳ 업로드 중..." : "📎 사진 추가 (여러장 선택 가능)"}
                  <input type="file" accept="image/*" multiple onChange={(e) => handlePhotoUpload(e.target.files)} style={{ display: "none" }} disabled={photoUploading} />
                </label>
              </div>

              {images.length === 0 ? (
                <div style={{ padding: "50px 0", textAlign: "center", border: "2px dashed #d1d5db", borderRadius: 12, background: "#fafbfc" }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📷</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#6b7280" }}>사진을 업로드하세요</div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>여러 장 업로드 후 대표 이미지를 선택할 수 있습니다 · WebP 자동 압축</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {images.map((url, idx) => (
                    <div key={idx} style={{
                      position: "relative", aspectRatio: "16/9", borderRadius: 10, overflow: "hidden",
                      border: coverIndex === idx ? "3px solid #f59e0b" : "2px solid #e5e7eb",
                      boxShadow: coverIndex === idx ? "0 0 0 2px rgba(245,158,11,0.3)" : "none",
                      transition: "all 0.2s",
                    }}>
                      <img src={url} alt={`강의 이미지 ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />

                      {/* 대표이미지 뱃지 */}
                      {coverIndex === idx && (
                        <div style={{ position: "absolute", top: 8, left: 8, padding: "3px 10px", background: "#f59e0b", color: "#fff", borderRadius: 20, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", gap: 3, boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }}>
                          ⭐ 대표
                        </div>
                      )}

                      {/* 호버 오버레이 */}
                      <div style={{
                        position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, opacity: 0, transition: "opacity 0.2s",
                      }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = "0"; }}>
                        {coverIndex !== idx && (
                          <button onClick={() => setCover(idx)} style={{ padding: "6px 14px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                            ⭐ 대표로 설정
                          </button>
                        )}
                        <button onClick={() => removePhoto(idx)} style={{ padding: "6px 14px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          🗑️ 삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 12, lineHeight: "1.5" }}>
                💡 사진 위에 마우스를 올려 "⭐ 대표로 설정" 클릭 → 메인 화면/상세 페이지에 대표 이미지로 표시됩니다.
              </p>
            </div>

            {/* ========== 3. 강사 정보 ========== */}
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}><span style={{ fontSize: 20 }}>👨‍🏫</span> 강사 정보</div>
              <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
                {/* 프로필 사진 업로드 */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <div style={{
                    width: 100, height: 100, borderRadius: "50%", overflow: "hidden",
                    border: "2px dashed #d1d5db", background: "#f9fafb",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {instructorPhoto ? (
                      <img src={instructorPhoto} alt="강사" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 32, color: "#d1d5db" }}>👤</span>
                    )}
                  </div>
                  <label style={{
                    padding: "5px 14px", background: "#3b82f6", color: "#fff", borderRadius: 6,
                    fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                  }}>
                    📷 사진 첨부
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const compressed = await compressToWebP(file, 400, 0.85);
                      const formData = new FormData();
                      formData.append("file", compressed);
                      formData.append("lecture_id", loadId || "temp");
                      formData.append("type", "content");
                      const res = await uploadLectureImage(formData);
                      if (res.success && res.url) {
                        setInstructorPhoto(res.url);
                      } else {
                        alert("업로드 실패: " + (res.error || ""));
                      }
                      e.target.value = "";
                    }} />
                  </label>
                  {instructorPhoto && (
                    <button onClick={() => setInstructorPhoto("")} style={{ fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>삭제</button>
                  )}
                </div>
                {/* 강사명 */}
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>강사명</label>
                  <input type="text" value={instructorName} onChange={(e) => setInstructorName(e.target.value)} placeholder="예: 부동산마스터 김대표" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>강사 소개</label>
                <textarea value={instructorBio} onChange={(e) => setInstructorBio(e.target.value)} placeholder={"- (현) 공실뉴스 부동산 아카데미 대표강사\n- (현) 강남역 1번출구 부동산중개법인 대표"} style={textareaStyle} />
              </div>
            </div>

            {/* ========== 4. 가격 설정 ========== */}
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}><span style={{ fontSize: 20 }}>💰</span> 가격 설정</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>정가 (원)</label>
                  <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} placeholder="300000" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>할인가 (원)</label>
                  <input type="number" value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value === "" ? "" : Number(e.target.value))} placeholder="210000" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>수강 기간 (개월)</label>
                  <input type="number" value={durationMonths} onChange={(e) => setDurationMonths(Number(e.target.value))} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>할인 라벨</label>
                <input type="text" value={discountLabel} onChange={(e) => setDiscountLabel(e.target.value)} placeholder='예: "🔥 기간 한정 30% 얼리버드 혜택"' style={inputStyle} />
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
                <button onClick={addChapter} style={{ height: 36, padding: "0 16px", background: "#10b981", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>+ 챕터 추가</button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {chapters.map((chapter, ci) => (
                  <div key={ci} style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", background: "#fafbfc" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", background: "#f1f5f9", cursor: "pointer", borderBottom: expandedChapters.has(ci) ? "1px solid #e5e7eb" : "none" }}
                      onClick={() => toggleChapter(ci)}
                    >
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#8a3ffc", background: "#ede9fe", padding: "2px 10px", borderRadius: 4 }}>Ch.{chapter.chapter_no}</span>
                      <input type="text" value={chapter.title} onChange={(e) => { e.stopPropagation(); updateChapter(ci, "title", e.target.value); }} onClick={(e) => e.stopPropagation()} placeholder="챕터 제목을 입력하세요" style={{ flex: 1, height: 34, padding: "0 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, fontWeight: 700, color: "#111", outline: "none", background: "#fff" }} />
                      <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600, whiteSpace: "nowrap" }}>{chapter.lessons.length}개 강의</span>
                      <span style={{ color: "#9ca3af", fontSize: 16, transition: "transform 0.2s", transform: expandedChapters.has(ci) ? "rotate(180deg)" : "none" }}>▼</span>
                      {chapters.length > 1 && (
                        <button onClick={(e) => { e.stopPropagation(); removeChapter(ci); }} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #fca5a5", background: "#fff", color: "#ef4444", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} title="챕터 삭제">×</button>
                      )}
                    </div>

                    {expandedChapters.has(ci) && (
                      <div style={{ padding: "16px 20px" }}>
                        {chapter.lessons.map((lesson, li) => (
                          <div key={li} style={{ display: "grid", gridTemplateColumns: "32px 1fr 200px 80px 60px 32px", gap: 8, alignItems: "center", marginBottom: 10, padding: "8px 12px", background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#8a3ffc", textAlign: "center" }}>{ci + 1}-{li + 1}</span>
                            <input type="text" value={lesson.title} onChange={(e) => updateLesson(ci, li, "title", e.target.value)} placeholder="강의 제목" style={{ height: 34, padding: "0 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, color: "#111", outline: "none" }} />
                            <input type="text" value={lesson.video_url} onChange={(e) => updateLesson(ci, li, "video_url", e.target.value)} placeholder="YouTube URL" style={{ height: 34, padding: "0 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, color: "#555", outline: "none" }} />
                            <input type="text" value={lesson.duration} onChange={(e) => updateLesson(ci, li, "duration", e.target.value)} placeholder="12:40" style={{ height: 34, padding: "0 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, color: "#555", textAlign: "center", outline: "none" }} />
                            <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 11, color: "#6b7280", whiteSpace: "nowrap" }}>
                              <input type="checkbox" checked={lesson.is_preview} onChange={(e) => updateLesson(ci, li, "is_preview", e.target.checked)} style={{ accentColor: "#3b82f6" }} />미리보기
                            </label>
                            <button onClick={() => removeLesson(ci, li)} style={{ width: 28, height: 28, border: "1px solid #fca5a5", borderRadius: 6, background: "#fff", color: "#ef4444", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="강의 삭제">×</button>
                          </div>
                        ))}
                        <button onClick={() => addLesson(ci)} style={{ width: "100%", height: 36, border: "2px dashed #d1d5db", borderRadius: 8, background: "none", color: "#6b7280", fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 4, transition: "all 0.2s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.color = "#3b82f6"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.color = "#6b7280"; }}>
                          + 강의 추가
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ========== 6. 특강 자료 (첨부 파일 및 외부 링크) ========== */}
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}><span style={{ fontSize: 20 }}>🔗</span> 자료 첨부</div>
              <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>영상 스킨(video_album) 및 자료실 스킨(file_album) 전용 간편 등록. 외부 링크 또는 직접 파일 첨부가 가능합니다.</p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {materials.map((mat, mi) => (
                  <div key={mi} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select value={mat.type} onChange={(e) => { const newArr=[...materials]; newArr[mi].type=e.target.value; if (e.target.value !== "FILE") newArr[mi].url=""; setMaterials(newArr); }} style={{ height: 40, padding: "0 12px", border: "1px solid #d1d5db", borderRadius: 6, width: 180 }}>
                      <option value="YOUTUBE">🎬 YouTube 영상</option>
                      <option value="DRIVE">📁 구글 드라이브 다운로드</option>
                      <option value="LINK">🔗 일반 외부링크</option>
                      <option value="FILE">📎 파일 직접 첨부</option>
                    </select>
                    <input type="text" value={mat.label} onChange={(e) => { const newArr=[...materials]; newArr[mi].label=e.target.value; setMaterials(newArr); }} placeholder="라벨 (예: 수업자료)" style={{ height: 40, padding: "0 12px", border: "1px solid #d1d5db", borderRadius: 6, width: 200 }} />
                    
                    {mat.type === "FILE" ? (
                      mat.url ? (
                        <div style={{ flex: 1, height: 40, display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, color: "#2563eb", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{mat.url.split("/").pop()}</span>
                          <button onClick={() => { const newArr=[...materials]; newArr[mi].url=""; setMaterials(newArr); }} style={{ fontSize: 12, color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>파일 변경</button>
                        </div>
                      ) : (
                        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                          <label style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#374151" }}>
                            파일 선택
                            <input type="file" style={{ display: "none" }} onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const formData = new FormData();
                              formData.append("file", file);
                              formData.append("lecture_id", loadId || "temp");
                              formData.append("type", "material");
                              const res = await uploadLectureImage(formData); // Using same general media upload approach
                              if (res.success && res.url) {
                                const newArr=[...materials]; 
                                newArr[mi].url = res.url; 
                                setMaterials(newArr);
                              } else {
                                alert("업로드 실패: " + (res.error || ""));
                              }
                              e.target.value = "";
                            }} />
                          </label>
                        </div>
                      )
                    ) : (
                      <input type="text" value={mat.url} onChange={(e) => { const newArr=[...materials]; newArr[mi].url=e.target.value; setMaterials(newArr); }} placeholder="https://..." style={{ height: 40, padding: "0 12px", border: "1px solid #d1d5db", borderRadius: 6, flex: 1 }} />
                    )}
                    
                    <button onClick={() => setMaterials(materials.filter((_, i) => i !== mi))} style={{ width: 40, height: 40, border: "1px solid #fca5a5", borderRadius: 6, background: "#fff", color: "#ef4444", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="삭제">×</button>
                  </div>
                ))}
                
                <button onClick={() => setMaterials([...materials, { type: "LINK", label: "", url: "" }])} style={{ height: 40, background: "#1f2937", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", width: 120 }}>+ 추가</button>
              </div>
            </div>

            {/* ========== 하단 버튼 ========== */}
            <div style={{ display: "flex", justifyContent: "center", gap: 16, padding: "20px 0 60px" }}>
              <button onClick={() => router.push("/admin?menu=study")} style={{ height: 48, padding: "0 32px", background: "#fff", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>취소</button>
              <button onClick={() => handleSave("DRAFT")} disabled={saving} style={{ height: 48, padding: "0 32px", background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>💾 임시저장</button>
              <button onClick={() => handleSave("ACTIVE")} disabled={saving} style={{ height: 48, padding: "0 40px", background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, boxShadow: "0 4px 14px rgba(245,158,11,0.3)" }}>🚀 공개 등록</button>
            </div>
      </div>
    </>
  );
}
