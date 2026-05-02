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
  const [section1, setSection1] = useState("");
  const [section2, setSection2] = useState("");
  const [content, setContent] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  /* ── 미디어 상태 ── */
  const [photos, setPhotos] = useState<{ file: File | null; preview: string; caption: string; isCover: boolean; mediaId?: string }[]>([]);
  const [videos, setVideos] = useState<{ url: string; videoId: string; isCover: boolean; isShorts: boolean }[]>([]);
  const [youtubeInput, setYoutubeInput] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && content && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = content;
    }
  }, [content, authChecked]);

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
          setSection1(d.section1 || "");
          setSection2(d.section2 || "");
          if (d.keywords) {
            setKeywords(Array.isArray(d.keywords) ? d.keywords : d.keywords.split(',').map((k: string) => k.trim()).filter(Boolean));
          }
          // 영상 추출
          const vids: any[] = [];
          let htmlContent = d.content || "";
          const regex = /<div[^>]*class="inserted-video"[^>]*>.*?src="https:\/\/www\.youtube\.com\/embed\/([\w-]{11})".*?<\/div>/g;
          let match;
          while ((match = regex.exec(htmlContent)) !== null) {
            vids.push({
              url: `https://www.youtube.com/watch?v=${match[1]}`,
              videoId: match[1],
              isCover: d.thumbnail_url?.includes(match[1]) || false,
              isShorts: false,
            });
          }
          // 추출 후 본문에서 영상 태그 제거 (모바일 에디터에서는 카드로 관리)
          htmlContent = htmlContent.replace(/<div[^>]*class="inserted-video"[^>]*>.*?<\/div>/g, "");
          
          if (d.youtube_url) {
            const mainMatch = d.youtube_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/);
            if (mainMatch && !vids.find(v => v.videoId === mainMatch[1])) {
               vids.push({
                 url: d.youtube_url,
                 videoId: mainMatch[1],
                 isCover: d.thumbnail_url?.includes(mainMatch[1]) || false,
                 isShorts: !!d.is_shorts
               });
            }
          }
          setVideos(vids);
          setContent(htmlContent);
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
        const updated = [...prev, { file: compressed, preview, caption: "", isCover: prev.length === 0 && videos.length === 0 }];
        return updated;
      });
      // 에디터에 즉시 삽입
      if (editorRef.current) {
        const currentHtml = editorRef.current.innerHTML;
        const imgHtml = `<br/><div style="text-align: center;"><img src="${preview}" style="max-width: 100%; height: auto; border-radius: 8px;" /></div><br/>`;
        editorRef.current.innerHTML = currentHtml + (currentHtml.endsWith('<br>') ? '' : '<br/>') + imgHtml;
        setContent(editorRef.current.innerHTML);
      }
    }
  };

  /* ── 사진 삭제 ── */
  const removePhoto = (idx: number) => {
    setPhotos(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      if (updated.length > 0 && !updated.some(p => p.isCover) && !videos.some(v => v.isCover)) updated[0].isCover = true;
      return updated;
    });
  };

  /* ── 영상 추가 ── */
  const handleAddVideo = () => {
    const url = youtubeInput.trim();
    if (!url) return;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/);
    if (!match) {
      alert("유효한 유튜브 링크를 입력해주세요.");
      return;
    }
    const videoId = match[1];
    const isShorts = url.includes("shorts");
    setVideos(prev => {
      if (prev.some(v => v.videoId === videoId)) return prev;
      return [...prev, { url, videoId, isCover: false, isShorts }];
    });
    setYoutubeInput("");

    // 에디터에 즉시 삽입
    if (editorRef.current) {
      const currentHtml = editorRef.current.innerHTML;
      const videoHtml = `<div class="inserted-video" style="margin-top: 16px;"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen style="width:100%; aspect-ratio: ${isShorts ? '9/16' : '16/9'}; border-radius: 8px;"></iframe></div><br/>`;
      editorRef.current.innerHTML = currentHtml + (currentHtml.endsWith('<br>') ? '' : '<br/>') + videoHtml;
      setContent(editorRef.current.innerHTML);
    }
  };

  /* ── 영상 삭제 ── */
  const removeVideo = (idx: number) => {
    setVideos(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      if (updated.length > 0 && !updated.some(v => v.isCover) && !photos.some(p => p.isCover)) updated[0].isCover = true;
      return updated;
    });
  };

  /* ── 대표 미디어 설정 ── */
  const setCover = (type: 'photo' | 'video', idx: number) => {
    setPhotos(prev => prev.map((p, i) => ({ ...p, isCover: type === 'photo' && i === idx })));
    setVideos(prev => prev.map((v, i) => ({ ...v, isCover: type === 'video' && i === idx })));
  };

  /* ── 저장/승인신청 ── */
  const handleSave = async (requestApproval: boolean = false) => {
    if (!title.trim()) { alert("제목을 입력해주세요."); return; }
    if (!content.trim()) { alert("본문 내용을 입력해주세요."); return; }
    if (!currentUserId) { alert("로그인이 필요합니다."); return; }

    setSaving(true);

    try {
      // 1. 기사 본문에 사진을 삽입한 HTML 생성
      let fullContent = editorRef.current ? editorRef.current.innerHTML : content;
      
      // 이미 content에 HTML이 포함되어 있지 않고, 순수 텍스트인 경우 p 태그로 래핑
      if (!fullContent.includes("<")) {
        fullContent = fullContent.split("\n").filter(Boolean).map(line => `<p>${line}</p>`).join("\n");
      }

      // 2. 기사 저장
      const status = requestApproval ? "승인신청" : "작성중";
      const now = new Date();
      const published_at = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      const coverPhoto = photos.find(p => p.isCover);
      const coverVideo = videos.find(v => v.isCover);
      
      let thumbnailUrl = coverPhoto?.preview || "";
      if (coverVideo) {
         thumbnailUrl = `https://img.youtube.com/vi/${coverVideo.videoId}/hqdefault.jpg`;
      }

      const res = await saveArticle({
        id: editId || undefined,
        author_id: currentUserId,
        author_name: reporterName,
        author_email: reporterEmail,
        status,
        form_type: "일반",
        section1,
        section2,
        series: "",
        title,
        subtitle: subtitle || "",
        content: fullContent,
        youtube_url: videos.length > 0 ? videos[0].url : "",
        is_shorts: videos.length > 0 ? videos[0].isShorts : false,
        published_at,
        keywords,
        thumbnail_url: thumbnailUrl || undefined,
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
        let htmlChanged = false;

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
              // 로컬 blob URL을 업로드된 실제 URL로 교체
              if (fullContent.includes(p.preview)) {
                fullContent = fullContent.replaceAll(p.preview, uploadRes.url);
                htmlChanged = true;
              }
            }
          }
        }

        // 4. 대표 이미지 URL 업데이트 또는 본문 HTML 변경 시 다시 저장
        if ((thumbnailUrl && thumbnailUrl !== coverPhoto?.preview) || htmlChanged) {
          await saveArticle({
            id: articleId,
            author_id: currentUserId,
            author_name: reporterName,
            author_email: reporterEmail,
            status,
            form_type: "일반",
            section1,
            section2,
            series: "",
            title,
            subtitle: subtitle || "",
            content: fullContent,
            youtube_url: videos.length > 0 ? videos[0].url : "",
            is_shorts: videos.length > 0 ? videos[0].isShorts : false,
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
          <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>
            카테고리 <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={section1}
              onChange={e => { setSection1(e.target.value); setSection2(""); }}
              style={{
                flex: 1, padding: "0 12px", height: 44, border: "1px solid #d1d5db", borderRadius: 10,
                fontSize: 14, color: "#111", background: "#fff", outline: "none", boxSizing: "border-box",
                appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center"
              }}
            >
              <option value="" disabled style={{ color: "#9ca3af" }}>1차섹션 선택</option>
              <option value="우리동네부동산">우리동네부동산</option>
              <option value="뉴스/칼럼">뉴스/칼럼</option>
            </select>
            <select
              value={section2}
              onChange={e => setSection2(e.target.value)}
              style={{
                flex: 1, padding: "0 12px", height: 44, border: "1px solid #d1d5db", borderRadius: 10,
                fontSize: 14, color: "#111", background: "#fff", outline: "none", boxSizing: "border-box",
                appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center"
              }}
            >
              <option value="" disabled style={{ color: "#9ca3af" }}>2차섹션 선택</option>
              {section1 === "우리동네부동산" && (
                <>
                  <option value="아파트·오피스텔">아파트·오피스텔</option>
                  <option value="빌라·주택">빌라·주택</option>
                  <option value="원룸·투룸">원룸·투룸</option>
                  <option value="상가·업무·공장·토지">상가·업무·공장·토지</option>
                  <option value="분양">분양</option>
                </>
              )}
              {section1 === "뉴스/칼럼" && (
                <>
                  <option value="부동산·주식·재테크">부동산·주식·재테크</option>
                  <option value="정치·경제·사회">정치·경제·사회</option>
                  <option value="세무·법률">세무·법률</option>
                  <option value="여행·건강·생활">여행·건강·생활</option>
                  <option value="IT·가전·가구">IT·가전·가구</option>
                  <option value="스포츠·연예·Car">스포츠·연예·Car</option>
                  <option value="인물·미션·기타">인물·미션·기타</option>
                </>
              )}
            </select>
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

        {/* 부제목 */}
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

        {/* 미디어 섹션 (사진/영상) */}
        <div style={{ marginBottom: 16, background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>📷 미디어 첨부 (사진 {photos.length} / 영상 {videos.length})</span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            <button
              onClick={() => photoInputRef.current?.click()}
              style={{ flex: 1, minWidth: "120px", height: 40, background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              + 사진 추가
            </button>
            <div style={{ flex: 2, minWidth: "200px", display: "flex", gap: 6 }}>
               <input
                 type="url"
                 value={youtubeInput}
                 onChange={e => setYoutubeInput(e.target.value)}
                 onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddVideo(); } }}
                 placeholder="유튜브 영상 링크 입력"
                 style={{ flex: 1, padding: "0 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, outline: "none" }}
               />
               <button
                 onClick={handleAddVideo}
                 style={{ padding: "0 14px", background: "#374151", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
               >
                 추가
               </button>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={e => handlePhotoAdd(e.target.files)}
              style={{ display: "none" }}
            />
          </div>

          {photos.length === 0 && videos.length === 0 ? (
            <div
              onClick={() => photoInputRef.current?.click()}
              style={{ border: "2px dashed #d1d5db", borderRadius: 10, padding: "24px 0", textAlign: "center", color: "#9ca3af", cursor: "pointer" }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>📁</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>사진이나 유튜브 영상을 추가해주세요</div>
              <div style={{ fontSize: 11, color: "#b0b5bf", marginTop: 4 }}>자동 WebP 압축 적용</div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
              {/* 사진 목록 */}
              {photos.map((p, idx) => (
                <div key={`photo-${idx}`} style={{ position: "relative", flexShrink: 0, width: 100, height: 100, borderRadius: 10, overflow: "hidden", border: p.isCover ? "2px solid #3b82f6" : "1px solid #e5e7eb" }}>
                  <img src={p.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  {p.isCover && (
                    <div style={{ position: "absolute", top: 4, left: 4, background: "#3b82f6", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>대표</div>
                  )}
                  <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 4 }}>
                    {!p.isCover && (
                      <button onClick={() => setCover('photo', idx)} style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "none", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>⭐</button>
                    )}
                    <button onClick={() => removePhoto(idx)} style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(239,68,68,0.9)", color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                  </div>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 10, textAlign: "center", padding: "2px 0" }}>사진</div>
                </div>
              ))}
              {/* 영상 목록 */}
              {videos.map((v, idx) => (
                <div key={`video-${idx}`} style={{ position: "relative", flexShrink: 0, width: 100, height: 100, borderRadius: 10, overflow: "hidden", border: v.isCover ? "2px solid #3b82f6" : "1px solid #e5e7eb" }}>
                  <img src={`https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 24, height: 24, background: "rgba(0,0,0,0.7)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                     <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21" /></svg>
                  </div>
                  {v.isCover && (
                    <div style={{ position: "absolute", top: 4, left: 4, background: "#3b82f6", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>대표</div>
                  )}
                  <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 4 }}>
                    {!v.isCover && (
                      <button onClick={() => setCover('video', idx)} style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "none", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>⭐</button>
                    )}
                    <button onClick={() => removeVideo(idx)} style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(239,68,68,0.9)", color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                  </div>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(220,38,38,0.8)", color: "#fff", fontSize: 10, textAlign: "center", padding: "2px 0", fontWeight: "bold" }}>영상</div>
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
          {/* 에디터 툴바 */}
          <div style={{ display: "flex", gap: 4, padding: "8px 12px", background: "#fafafa", border: "1px solid #d1d5db", borderBottom: "none", borderTopLeftRadius: 10, borderTopRightRadius: 10, overflowX: "auto" }}>
            <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('bold', false); }} style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", fontSize: 14, fontWeight: 800, color: "#1f2937", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>B</button>
            <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('italic', false); }} style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", fontSize: 14, fontStyle: "italic", color: "#1f2937", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>I</button>
            <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('underline', false); }} style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", fontSize: 14, textDecoration: "underline", color: "#1f2937", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>U</button>
            <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('strikeThrough', false); }} style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", fontSize: 14, color: "#1f2937", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "line-through" }}>S</button>
            <div style={{ width: 1, height: 20, background: "#d1d5db", margin: "6px 4px" }} />
            <select onChange={e => { document.execCommand(e.target.value, false); editorRef.current?.focus(); }} defaultValue="" title="텍스트 정렬" style={{ padding: "0 8px", border: "none", borderRadius: 4, fontSize: 13, color: "#1f2937", background: "none", cursor: "pointer", outline: "none" }}>
              <option value="" disabled hidden>정렬</option>
              <option value="justifyLeft">왼쪽</option>
              <option value="justifyCenter">가운데</option>
              <option value="justifyRight">오른쪽</option>
              <option value="justifyFull">양쪽</option>
            </select>
          </div>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={e => setContent(e.currentTarget.innerHTML || "")}
            onBlur={e => setContent(e.currentTarget.innerHTML || "")}
            style={{
              width: "100%", minHeight: 260, padding: 14, border: "1px solid #d1d5db",
              borderBottomLeftRadius: 10, borderBottomRightRadius: 10, fontSize: 15, lineHeight: 1.8, outline: "none",
              boxSizing: "border-box", fontFamily: "inherit", background: "#fff", overflowY: "auto"
            }}
          />
          <div style={{ textAlign: "right", fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
            {content.replace(/<[^>]*>/g, '').length}자
          </div>
        </div>



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
      <div style={{ position: "fixed", bottom: 65, left: 0, right: 0, background: "#fff", borderTop: "1px solid #e5e7eb", padding: "12px 16px", display: "flex", gap: 10, zIndex: 50 }}>
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
