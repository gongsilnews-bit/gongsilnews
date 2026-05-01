"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { saveArticle, getArticleDetail } from "@/app/actions/article";
import { uploadArticleMediaDirect } from "@/utils/uploadDirect";

/* ── WebP 압축 변환 ── */
const compressToWebP = (file: File, maxWidth = 1920, quality = 0.82): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) { resolve(file); return; }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        const webpFile = new File([blob!], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
        resolve(webpFile);
      }, "image/webp", quality);
    };
    img.src = URL.createObjectURL(file);
  });
};

const SECTIONS = [
  { label: "뉴스/칼럼", value: "뉴스/칼럼" },
  { label: "부동산", value: "부동산" },
  { label: "경제", value: "경제" },
  { label: "사회", value: "사회" },
  { label: "문화", value: "문화" },
  { label: "기타", value: "기타" },
];

function MobileArticleWrite() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  /* ── 상태 ── */
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [section1, setSection1] = useState("뉴스/칼럼");
  const [content, setContent] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showYoutube, setShowYoutube] = useState(false);

  /* ── 사진 상태 ── */
  const [photos, setPhotos] = useState<{ file: File | null; preview: string; caption: string; isCover: boolean; mediaId?: string }[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  /* ── 인증 및 수정 모드 ── */
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/m"); return; }

      const { data: m } = await supabase.from("members").select("name, email, role").eq("id", user.id).single();
      if (m) {
        setReporterName(m.name || "작성자");
        setReporterEmail(m.email || "");
      }
      setCurrentUserId(user.id);
      setAuthChecked(true);

      /* 수정 모드 */
      if (editId) {
        const res = await getArticleDetail(editId);
        if (res.success && res.data) {
          const d = res.data;
          setTitle(d.title || "");
          setSubtitle(d.subtitle || "");
          setSection1(d.section1 || "뉴스/칼럼");
          setContent(d.content || "");
          setYoutubeUrl(d.youtube_url || "");
          if (d.author_name) setReporterName(d.author_name);
          if (d.author_email) setReporterEmail(d.author_email);
          if (d.subtitle) setShowSubtitle(true);
          if (d.youtube_url) setShowYoutube(true);
          if (d.article_keywords) setKeywords(d.article_keywords.map((k: any) => k.keyword));
          if (d.article_media) {
            const existingPhotos = d.article_media
              .filter((m: any) => m.media_type === "PHOTO")
              .map((m: any) => ({
                file: null,
                preview: m.url,
                caption: m.caption || "",
                isCover: d.thumbnail_url === m.url,
                mediaId: m.id,
              }));
            setPhotos(existingPhotos);
          }
        }
      }
    })();
  }, [editId]);

  /* ── 키워드 추가 ── */
  const addKeyword = () => {
    const kw = keyword.trim();
    if (!kw || keywords.includes(kw)) return;
    setKeywords([...keywords, kw]);
    setKeyword("");
  };

  /* ── 사진 추가 ── */
  const handlePhotoAdd = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) continue;
      const compressed = await compressToWebP(f);
      const preview = URL.createObjectURL(compressed);
      setPhotos(prev => {
        const updated = [...prev, { file: compressed, preview, caption: "", isCover: prev.length === 0 }];
        return updated;
      });
    }
  };

  /* ── 사진 삭제 ── */
  const removePhoto = (idx: number) => {
    setPhotos(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      if (updated.length > 0 && !updated.some(p => p.isCover)) updated[0].isCover = true;
      return updated;
    });
  };

  /* ── 대표 사진 설정 ── */
  const setCover = (idx: number) => {
    setPhotos(prev => prev.map((p, i) => ({ ...p, isCover: i === idx })));
  };

  /* ── 저장/승인신청 ── */
  const handleSave = async (requestApproval: boolean = false) => {
    if (!title.trim()) { alert("제목을 입력해주세요."); return; }
    if (!content.trim()) { alert("본문 내용을 입력해주세요."); return; }
    if (!currentUserId) { alert("로그인이 필요합니다."); return; }

    setSaving(true);

    try {
      // 1. 기사 본문에 사진을 삽입한 HTML 생성
      let fullContent = content;
      
      // 이미 content에 HTML이 포함되어 있지 않고, 순수 텍스트인 경우 p 태그로 래핑
      if (!fullContent.includes("<")) {
        fullContent = fullContent.split("\n").filter(Boolean).map(line => `<p>${line}</p>`).join("\n");
      }

      // 2. 기사 저장
      const status = requestApproval ? "승인신청" : "작성중";
      const now = new Date();
      const published_at = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      const coverPhoto = photos.find(p => p.isCover);

      const res = await saveArticle({
        id: editId || undefined,
        author_id: currentUserId,
        author_name: reporterName,
        author_email: reporterEmail,
        status,
        form_type: "일반",
        section1,
        section2: "",
        series: "",
        title,
        subtitle: subtitle || "",
        content: fullContent,
        youtube_url: youtubeUrl || "",
        is_shorts: false,
        published_at,
        keywords,
        thumbnail_url: coverPhoto?.preview || undefined,
      });

      if (!res.success) {
        alert("저장 실패: " + res.error);
        setSaving(false);
        return;
      }

      const articleId = res.articleId;

      // 3. 새로 추가된 사진 업로드
      if (articleId) {
        let thumbnailUrl = coverPhoto?.preview || "";

        for (let i = 0; i < photos.length; i++) {
          const p = photos[i];
          if (p.file) {
            const uploadRes = await uploadArticleMediaDirect(p.file, articleId, {
              mediaType: "PHOTO",
              sortOrder: i,
              caption: p.caption,
            });
            if (uploadRes.success && uploadRes.url) {
              if (p.isCover) thumbnailUrl = uploadRes.url;
            }
          }
        }

        // 4. 대표 이미지 URL 업데이트
        if (thumbnailUrl && thumbnailUrl !== coverPhoto?.preview) {
          await saveArticle({
            id: articleId,
            author_id: currentUserId,
            author_name: reporterName,
            author_email: reporterEmail,
            status,
            form_type: "일반",
            section1,
            section2: "",
            series: "",
            title,
            subtitle: subtitle || "",
            content: fullContent,
            youtube_url: youtubeUrl || "",
            is_shorts: false,
            published_at,
            keywords,
            thumbnail_url: thumbnailUrl,
          });
        }
      }

      alert(requestApproval ? "승인신청이 완료되었습니다." : "기사가 저장되었습니다.");
      router.push("/m/admin/article");
    } catch (err: any) {
      alert("오류: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked) {
    return (
      <div style={{ display: "flex", height: "100dvh", alignItems: "center", justifyContent: "center", background: "#f4f5f7" }}>
        <div style={{ textAlign: "center", color: "#9ca3af" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✏️</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>준비 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#f4f5f7", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* 상단 헤더 */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => { if (confirm("작성 중인 내용이 사라집니다. 나가시겠습니까?")) router.push("/m/admin/article"); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>
            {editId ? "기사 수정" : "기사 작성"}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            style={{ height: 36, padding: "0 14px", background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            {saving ? "저장중..." : "임시저장"}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            style={{ height: 36, padding: "0 14px", background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            {saving ? "처리중..." : "승인신청"}
          </button>
        </div>
      </div>

      {/* 폼 영역 */}
      <div style={{ padding: "16px 16px 120px" }}>

        {/* 섹션 선택 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>카테고리</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SECTIONS.map(s => (
              <button
                key={s.value}
                onClick={() => setSection1(s.value)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 20,
                  border: section1 === s.value ? "1.5px solid #3b82f6" : "1px solid #d1d5db",
                  background: section1 === s.value ? "#eff6ff" : "#fff",
                  color: section1 === s.value ? "#2563eb" : "#4b5563",
                  fontSize: 13,
                  fontWeight: section1 === s.value ? 700 : 500,
                  cursor: "pointer",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 제목 */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>
            제목 <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="기사 제목을 입력해주세요"
            style={{ width: "100%", height: 48, padding: "0 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 16, fontWeight: 600, outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* 부제목 토글 */}
        {!showSubtitle ? (
          <button onClick={() => setShowSubtitle(true)} style={{ fontSize: 13, color: "#6b7280", background: "none", border: "none", cursor: "pointer", marginBottom: 12, padding: 0, fontWeight: 600 }}>
            + 부제목 추가
          </button>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>부제목</label>
            <input
              type="text"
              value={subtitle}
              onChange={e => setSubtitle(e.target.value)}
              placeholder="부제목 (선택)"
              style={{ width: "100%", height: 44, padding: "0 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
          </div>
        )}

        {/* 사진 섹션 */}
        <div style={{ marginBottom: 16, background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>📷 사진 ({photos.length})</span>
            <button
              onClick={() => photoInputRef.current?.click()}
              style={{ height: 32, padding: "0 12px", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              + 사진 추가
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={e => handlePhotoAdd(e.target.files)}
              style={{ display: "none" }}
            />
          </div>

          {photos.length === 0 ? (
            <div
              onClick={() => photoInputRef.current?.click()}
              style={{ border: "2px dashed #d1d5db", borderRadius: 10, padding: "24px 0", textAlign: "center", color: "#9ca3af", cursor: "pointer" }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>📁</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>터치하여 사진을 추가해주세요</div>
              <div style={{ fontSize: 11, color: "#b0b5bf", marginTop: 4 }}>자동 WebP 압축 적용</div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
              {photos.map((p, idx) => (
                <div key={idx} style={{ position: "relative", flexShrink: 0, width: 100, height: 100, borderRadius: 10, overflow: "hidden", border: p.isCover ? "2px solid #3b82f6" : "1px solid #e5e7eb" }}>
                  <img src={p.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  {p.isCover && (
                    <div style={{ position: "absolute", top: 4, left: 4, background: "#3b82f6", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>대표</div>
                  )}
                  <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 4 }}>
                    {!p.isCover && (
                      <button onClick={() => setCover(idx)} style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "none", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>⭐</button>
                    )}
                    <button onClick={() => removePhoto(idx)} style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(239,68,68,0.9)", color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 본문 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>
            본문 <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="기사 본문 내용을 입력해주세요..."
            style={{
              width: "100%", minHeight: 260, padding: 14, border: "1px solid #d1d5db",
              borderRadius: 10, fontSize: 15, lineHeight: 1.8, outline: "none",
              boxSizing: "border-box", resize: "vertical", fontFamily: "inherit",
            }}
          />
          <div style={{ textAlign: "right", fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
            {content.length}자
          </div>
        </div>

        {/* 유튜브 링크 토글 */}
        {!showYoutube ? (
          <button onClick={() => setShowYoutube(true)} style={{ fontSize: 13, color: "#6b7280", background: "none", border: "none", cursor: "pointer", marginBottom: 16, padding: 0, fontWeight: 600 }}>
            + 유튜브 영상 링크 추가
          </button>
        ) : (
          <div style={{ marginBottom: 16, background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb" }}>
            <label style={{ fontSize: 14, fontWeight: 800, color: "#111", display: "block", marginBottom: 8 }}>🎬 유튜브 영상</label>
            <input
              type="url"
              value={youtubeUrl}
              onChange={e => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              style={{ width: "100%", height: 44, padding: "0 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
            {youtubeUrl && (() => {
              const match = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/);
              if (match) return (
                <div style={{ marginTop: 8, borderRadius: 8, overflow: "hidden", position: "relative", paddingBottom: "56.25%", height: 0 }}>
                  <iframe src={`https://www.youtube.com/embed/${match[1]}`} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none", borderRadius: 8 }} allowFullScreen />
                </div>
              );
              return null;
            })()}
          </div>
        )}

        {/* 키워드 */}
        <div style={{ marginBottom: 16, background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb" }}>
          <label style={{ fontSize: 14, fontWeight: 800, color: "#111", display: "block", marginBottom: 8 }}>🏷️ 키워드</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
              placeholder="키워드를 입력하세요"
              style={{ flex: 1, height: 40, padding: "0 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none" }}
            />
            <button
              onClick={addKeyword}
              style={{ height: 40, padding: "0 14px", background: "#374151", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
            >
              추가
            </button>
          </div>
          {keywords.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {keywords.map((kw, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 4, background: "#eff6ff", color: "#2563eb", fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 14, border: "1px solid #bfdbfe" }}>
                  #{kw}
                  <button onClick={() => setKeywords(keywords.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#93c5fd", fontSize: 14, cursor: "pointer", padding: 0, lineHeight: 1 }}>✕</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 작성자 정보 */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb" }}>
          <label style={{ fontSize: 14, fontWeight: 800, color: "#111", display: "block", marginBottom: 10 }}>👤 작성자 정보</label>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>이름</div>
              <input
                type="text"
                value={reporterName}
                onChange={e => setReporterName(e.target.value)}
                style={{ width: "100%", height: 40, padding: "0 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>이메일</div>
              <input
                type="email"
                value={reporterEmail}
                onChange={e => setReporterEmail(e.target.value)}
                style={{ width: "100%", height: 40, padding: "0 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 하단 고정 바 */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #e5e7eb", padding: "12px 16px 24px", display: "flex", gap: 10, zIndex: 50 }}>
        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          style={{ flex: 1, height: 50, background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer" }}
        >
          💾 임시저장
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving}
          style={{ flex: 2, height: 50, background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(59,130,246,0.3)" }}
        >
          📋 승인신청
        </button>
      </div>
    </div>
  );
}

export default function MobileArticleWritePage() {
  return (
    <Suspense fallback={null}>
      <MobileArticleWrite />
    </Suspense>
  );
}
