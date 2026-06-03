"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { saveArticle, getArticleDetail, getPhotoLibrary, togglePhotoFavorite } from "@/app/actions/article";
import { uploadArticleMediaDirect } from "@/utils/uploadDirect";

import imageCompression from "browser-image-compression";

/* ?€?€ WebP ?•ì¶• ë³€??(browser-image-compression ?œìš©) ?€?€ */
const compressToWebP = async (file: File, maxWidth = 1200, quality = 0.82): Promise<File> => {
  if (!file.type.startsWith("image/") && !file.name.toLowerCase().endsWith(".heic")) {
    return file;
  }
  try {
    const options = {
      maxSizeMB: 1,          // ìµœë? ?©ëŸ‰ 1MB ?œí•œ
      maxWidthOrHeight: maxWidth, // ê°€ë¡œì„¸ë¡?ìµœë? maxWidth ë¦¬ì‚¬?´ì§•
      useWebWorker: true,
      fileType: "image/webp", // WebP ?¬ë§·?¼ë¡œ ë³€??ê°•ì œ
      initialQuality: quality
    };
    // HEIC ë°?ê³ í•´?ë„ ì²˜ë¦¬ë¥??„ë²½?˜ê²Œ ëª¨ë°”???˜ë“œ?¨ì–´ ?¨ì—??ìµœì ??ì§€??    const compressedBlob = await imageCompression(file, options);
    return new File([compressedBlob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
      type: "image/webp"
    });
  } catch (error) {
    console.error("?•ì¶• ?¤íŒ¨, ?ë³¸ ?…ë¡œ??", error);
    return file;
  }
};



function MobileArticleWrite() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  /* ?€?€ ?íƒœ ?€?€ */
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
  const [isAdmin, setIsAdmin] = useState(false);

  /* ?€?€ ë¯¸ë””???íƒœ ?€?€ */
  const [photos, setPhotos] = useState<{ file: File | null; preview: string; caption: string; isCover: boolean; mediaId?: string }[]>([]);
  const [videos, setVideos] = useState<{ url: string; videoId: string; isCover: boolean; isShorts: boolean }[]>([]);
  const [youtubeInput, setYoutubeInput] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  /* ?€?€ ?ˆì•½ ?¸ì¶œ ?íƒœ ?€?€ */
  const [isReserved, setIsReserved] = useState(false);
  const [publishDate, setPublishDate] = useState("");
  const [publishTime, setPublishTime] = useState("");

  /* ?€?€ ?¬í†  DB ?íƒœ ?€?€ */
  const [showPhotoDbModal, setShowPhotoDbModal] = useState(false);
  const [photoDbItems, setPhotoDbItems] = useState<any[]>([]);
  const [photoDbSearch, setPhotoDbSearch] = useState("");
  const [photoDbTab, setPhotoDbTab] = useState<"?„ì²´?¬ì§„" | "ì¦ê²¨ì°¾ê¸°">("?„ì²´?¬ì§„");
  const [isPhotoDbLoading, setIsPhotoDbLoading] = useState(false);

  useEffect(() => {
    if (editorRef.current && content && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = content;
    }
  }, [content, authChecked]);

  /* ?€?€ ?¸ì¦ ë°??˜ì • ëª¨ë“œ ?€?€ */
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/m"); return; }

      const { data: m } = await supabase.from("members").select("name, email, role").eq("id", user.id).single();
      if (m) {
        setReporterName(m.name || "?‘ì„±??);
        setReporterEmail(m.email || "");
        if (m.role === "ADMIN") setIsAdmin(true);
      }
      setCurrentUserId(user.id);
      setAuthChecked(true);

      /* ?˜ì • ëª¨ë“œ */
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
          // ?ìƒ ì¶”ì¶œ
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
          // ì¶”ì¶œ ??ë³¸ë¬¸?ì„œ ?ìƒ ?œê·¸ ?œê±° (ëª¨ë°”???ë””?°ì—?œëŠ” ì¹´ë“œë¡?ê´€ë¦?
          htmlContent = htmlContent.replace(/<div[^>]*class="inserted-video"[^>]*>.*?<\/div>/g, "");
          
          if (d.published_at) {
            const dt = new Date(d.published_at);
            const now = new Date();
            // KST ê¸°ì??¼ë¡œ ? ì§œ/?œê°„ ?Œì‹± (Vercel UTC ?œë²„ ?€??
            const kstParts = dt.toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).split(' ');
            // ?œê°„??ë¯¸ë˜?¼ë©´ ?ˆì•½ ?íƒœë¡??¸íŒ…
            if (dt > now) {
              setIsReserved(true);
              setPublishDate(kstParts[0]);
              const timeParts = kstParts[1]?.split(':') || ['00','00'];
              setPublishTime(`${timeParts[0]}:${timeParts[1]}`);
            }
          }
          
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

  /* ?€?€ ?¬í† DB ë¡œì§ ?€?€ */
  const openPhotoDbModal = () => {
    setShowPhotoDbModal(true);
    setPhotoDbTab("?„ì²´?¬ì§„");
    setPhotoDbSearch("");
    fetchPhotoDb("", false);
  };

  const fetchPhotoDb = async (searchStr: string, favOnly: boolean) => {
    setIsPhotoDbLoading(true);
    const res = await getPhotoLibrary({ search: searchStr, isFavorite: favOnly, authorId: currentUserId });
    if (res.success && res.data) {
      setPhotoDbItems(res.data);
    } else {
      setPhotoDbItems([]);
    }
    setIsPhotoDbLoading(false);
  };

  useEffect(() => {
    if (showPhotoDbModal) {
      fetchPhotoDb(photoDbSearch, photoDbTab === "ì¦ê²¨ì°¾ê¸°");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoDbTab]);

  const handlePhotoDbSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPhotoDb(photoDbSearch, photoDbTab === "ì¦ê²¨ì°¾ê¸°");
  };

  const handleToggleFav = async (e: React.MouseEvent, photoId: string, currentFav: boolean) => {
    e.stopPropagation();
    const res = await togglePhotoFavorite(photoId, !currentFav);
    if (res.success) {
      setPhotoDbItems(prev => prev.map(p => p.id === photoId ? { ...p, is_favorite: !currentFav } : p));
      if (photoDbTab === "ì¦ê²¨ì°¾ê¸°") {
        fetchPhotoDb(photoDbSearch, true);
      }
    } else {
      alert("?íƒœ ë³€ê²½ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.");
    }
  };

  const handleSelectFromPhotoDb = async (photo: any) => {
    setShowPhotoDbModal(false);
    try {
      const response = await fetch(photo.url, { cache: 'no-cache' });
      if (!response.ok) throw new Error("Network response was not ok");
      const blob = await response.blob();
      const ext = photo.filename ? photo.filename.split(".").pop() : "webp";
      const file = new File([blob], photo.filename || `db_photo_${Date.now()}.${ext}`, { type: blob.type });
      handlePhotoAdd([file] as unknown as FileList);
    } catch (err: any) {
      alert(`?¬ì§„??ë¶ˆëŸ¬?¤ëŠ” ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.\n(${err.message || err})`);
    }
  };

  /* ?€?€ ?¤ì›Œ??ì¶”ê? ?€?€ */
  const addKeyword = () => {
    const kw = keyword.trim();
    if (!kw || keywords.includes(kw)) return;
    setKeywords([...keywords, kw]);
    setKeyword("");
  };

  /* ?€?€ ?¬ì§„ ì¶”ê? ?€?€ */
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
      // ?ë””?°ì— ì¦‰ì‹œ ?½ì…
      if (editorRef.current) {
        const currentHtml = editorRef.current.innerHTML;
        const imgHtml = `<br/><div style="text-align: center;"><img src="${preview}" style="max-width: 100%; height: auto; border-radius: 8px;" /></div><br/>`;
        editorRef.current.innerHTML = currentHtml + (currentHtml.endsWith('<br>') ? '' : '<br/>') + imgHtml;
        setContent(editorRef.current.innerHTML);
      }
    }
  };

  /* ?€?€ ?¬ì§„ ?? œ ?€?€ */
  const removePhoto = (idx: number) => {
    setPhotos(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      if (updated.length > 0 && !updated.some(p => p.isCover) && !videos.some(v => v.isCover)) updated[0].isCover = true;
      return updated;
    });
  };

  /* ?€?€ ?ìƒ ì¶”ê? ?€?€ */
  const handleAddVideo = () => {
    const url = youtubeInput.trim();
    if (!url) return;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/);
    if (!match) {
      alert("? íš¨??? íŠœë¸?ë§í¬ë¥??…ë ¥?´ì£¼?¸ìš”.");
      return;
    }
    const videoId = match[1];
    const isShorts = url.includes("shorts");
    setVideos(prev => {
      if (prev.some(v => v.videoId === videoId)) return prev;
      return [...prev, { url, videoId, isCover: false, isShorts }];
    });
    setYoutubeInput("");

    // ?ë””?°ì— ì¦‰ì‹œ ?½ì…
    if (editorRef.current) {
      const currentHtml = editorRef.current.innerHTML;
      const videoHtml = `<div class="inserted-video" style="margin-top: 16px;"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen style="width:100%; aspect-ratio: ${isShorts ? '9/16' : '16/9'}; border-radius: 8px;"></iframe></div><br/>`;
      editorRef.current.innerHTML = currentHtml + (currentHtml.endsWith('<br>') ? '' : '<br/>') + videoHtml;
      setContent(editorRef.current.innerHTML);
    }
  };

  /* ?€?€ ?ìƒ ?? œ ?€?€ */
  const removeVideo = (idx: number) => {
    setVideos(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      if (updated.length > 0 && !updated.some(v => v.isCover) && !photos.some(p => p.isCover)) updated[0].isCover = true;
      return updated;
    });
  };

  /* ?€?€ ?€??ë¯¸ë””???¤ì • ?€?€ */
  const setCover = (type: 'photo' | 'video', idx: number) => {
    setPhotos(prev => prev.map((p, i) => ({ ...p, isCover: type === 'photo' && i === idx })));
    setVideos(prev => prev.map((v, i) => ({ ...v, isCover: type === 'video' && i === idx })));
  };

  /* ?€?€ ?€???¹ì¸? ì²­ ?€?€ */
  const handleSave = async (requestApproval: boolean = false) => {
    if (!title.trim()) { alert("?œëª©???…ë ¥?´ì£¼?¸ìš”."); return; }
    if (!content.trim()) { alert("ë³¸ë¬¸ ?´ìš©???…ë ¥?´ì£¼?¸ìš”."); return; }
    if (!currentUserId) { alert("ë¡œê·¸?¸ì´ ?„ìš”?©ë‹ˆ??"); return; }

    setSaving(true);

    try {
      // 1. ê¸°ì‚¬ ë³¸ë¬¸???¬ì§„???½ì…??HTML ?ì„±
      let fullContent = editorRef.current ? editorRef.current.innerHTML : content;
      
      // ?´ë? content??HTML???¬í•¨?˜ì–´ ?ˆì? ?Šê³ , ?œìˆ˜ ?ìŠ¤?¸ì¸ ê²½ìš° p ?œê·¸ë¡??˜í•‘
      if (!fullContent.includes("<")) {
        fullContent = fullContent.split("\n").filter(Boolean).map(line => `<p>${line}</p>`).join("\n");
      }

      // 2. ê¸°ì‚¬ ?€??      const status = requestApproval ? "?¹ì¸? ì²­" : "?‘ì„±ì¤?;

      // KST ê¸°ì? ?„ì¬ ?œê°„
      let published_at = new Date().toISOString(); // ê¸°ë³¸ê°? ?„ì¬ ?œê°„

      if (isReserved && publishDate) {
        // ?ˆì•½: KST ê¸°ì? ? ì§œ+?œê°„??ISOë¡?ë³€??        const kstDateStr = `${publishDate}T${publishTime || "00:00"}:00+09:00`;
        published_at = new Date(kstDateStr).toISOString();
      }
      // ?ˆì•½???„ë‹Œ ê²½ìš°: ? ê·œ/?˜ì • ëª¨ë‘ ?„ì¬ ?œê°„ (ê¸°ë³¸ê°?? ì?)

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
        form_type: "?¼ë°˜",
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
        alert("?€???¤íŒ¨: " + res.error);
        setSaving(false);
        return;
      }

      const articleId = res.articleId;

      // 3. ?ˆë¡œ ì¶”ê????¬ì§„ ?…ë¡œ??      if (articleId) {
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
              // ë¡œì»¬ blob URL???…ë¡œ?œëœ ?¤ì œ URLë¡?êµì²´
              if (fullContent.includes(p.preview)) {
                fullContent = fullContent.replaceAll(p.preview, uploadRes.url);
                htmlChanged = true;
              }
            }
          }
        }

        // 4. ?€???´ë?ì§€ URL ?…ë°?´íŠ¸ ?ëŠ” ë³¸ë¬¸ HTML ë³€ê²????¤ì‹œ ?€??        if ((thumbnailUrl && thumbnailUrl !== coverPhoto?.preview) || htmlChanged) {
          await saveArticle({
            id: articleId,
            author_id: currentUserId,
            author_name: reporterName,
            author_email: reporterEmail,
            status,
            form_type: "?¼ë°˜",
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

      alert(requestApproval ? "?¹ì¸? ì²­???„ë£Œ?˜ì—ˆ?µë‹ˆ??" : "ê¸°ì‚¬ê°€ ?€?¥ë˜?ˆìŠµ?ˆë‹¤.");
      router.push("/m/admin/article");
    } catch (err: any) {
      alert("?¤ë¥˜: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked) {
    return (
      <div style={{ display: "flex", height: "100dvh", alignItems: "center", justifyContent: "center", background: "#f4f5f7" }}>
        <div style={{ textAlign: "center", color: "#9ca3af" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>?ï¸</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>ì¤€ë¹?ì¤?..</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#f4f5f7", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* ?ë‹¨ ?¤ë” */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => { if (confirm("?‘ì„± ì¤‘ì¸ ?´ìš©???¬ë¼ì§‘ë‹ˆ?? ?˜ê??œê² ?µë‹ˆê¹?")) router.push("/m/admin/article"); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>
            {editId ? "ê¸°ì‚¬ ?˜ì •" : "ê¸°ì‚¬ ?‘ì„±"}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            style={{ height: 36, padding: "0 14px", background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            {saving ? "?€?¥ì¤‘..." : "?„ì‹œ?€??}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            style={{ height: 36, padding: "0 14px", background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            {saving ? "ì²˜ë¦¬ì¤?.." : "?¹ì¸? ì²­"}
          </button>
        </div>
      </div>
      <div style={{ height: 56 }} />

      {/* ???ì—­ */}
      <div style={{ padding: "16px 16px 32px" }}>

        {/* ?¹ì…˜ ? íƒ */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>
            ì¹´í…Œê³ ë¦¬ <span style={{ color: "#ef4444" }}>*</span>
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
              <option value="" disabled style={{ color: "#9ca3af" }}>1ì°¨ì„¹??? íƒ</option>
              <option value="ê³µì‹¤?´ìŠ¤">ê³µì‹¤?´ìŠ¤</option>
              <option value="ë¶€?™ì‚°Â·ê²½ì œ">ë¶€?™ì‚°Â·ê²½ì œ</option>
              <option value="AIë§ˆì???>AIë§ˆì???/option>
              <option value="?¼ì´?„Â·ì˜¤?¼ë‹ˆ??>?¼ì´?„Â·ì˜¤?¼ë‹ˆ??/option>
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
              <option value="" disabled style={{ color: "#9ca3af" }}>2ì°¨ì„¹??? íƒ</option>
              {section1 === "ê³µì‹¤?´ìŠ¤" && (
                <>
                  <option value="?„íŒŒ???¤í”¼?¤í…”">?„íŒŒ???¤í”¼?¤í…”</option>
                  <option value="ë¹Œë¼/ì£¼íƒ">ë¹Œë¼/ì£¼íƒ</option>
                  <option value="?ë£¸/?¬ë£¸(?€?µì…˜)">?ë£¸/?¬ë£¸(?€?µì…˜)</option>
                  <option value="?ê?/?¬ë¬´??ê³µì¥/? ì?">?ê?/?¬ë¬´??ê³µì¥/? ì?</option>
                  <option value="? ì¶•/ë¶„ì–‘/ê²½ë§¤">? ì¶•/ë¶„ì–‘/ê²½ë§¤</option>
                </>
              )}
              {section1 === "ë¶€?™ì‚°Â·ê²½ì œ" && (
                <>
                  <option value="ë¶€?™ì‚° ?•ì±…/?™í–¥">ë¶€?™ì‚° ?•ì±…/?™í–¥</option>
                  <option value="ê²½ì œ/?¬í…Œ??ì£¼ì‹">ê²½ì œ/?¬í…Œ??ì£¼ì‹</option>
                  <option value="ë²•ë¥ /?¸ë¬´ ì§€??>ë²•ë¥ /?¸ë¬´ ì§€??/option>
                </>
              )}
              {section1 === "AIë§ˆì??? && (
                <>
                  <option value="AI/NEWS">AI/NEWS</option>
                  <option value="ë¶€?™ì‚°? íŠœë¸?ë¸”ë¡œê·?>ë¶€?™ì‚°? íŠœë¸?ë¸”ë¡œê·?/option>
                  <option value="ê³µì‹¤/?„ë?ê´€ë¦?>ê³µì‹¤/?„ë?ê´€ë¦?/option>
                </>
              )}
              {section1 === "?¼ì´?„Â·ì˜¤?¼ë‹ˆ?? && (
                <>
                  <option value="?¸ë¬¼/?¸í„°ë·?>?¸ë¬¼/?¸í„°ë·?/option>
                  <option value="ë¶€?™ì‚°/?¸í…Œë¦¬ì–´ ê¿€??>ë¶€?™ì‚°/?¸í…Œë¦¬ì–´ ê¿€??/option>
                  <option value="ë§›ì§‘/?¬í–‰/ê±´ê°•">ë§›ì§‘/?¬í–‰/ê±´ê°•</option>
                  <option value="?ìœ  ?ì„¸??>?ìœ  ?ì„¸??/option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* ?œëª© */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>
            ?œëª© <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="ê¸°ì‚¬ ?œëª©???…ë ¥?´ì£¼?¸ìš”"
            style={{ width: "100%", height: 48, padding: "0 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 16, fontWeight: 600, outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* ë¶€?œëª© */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>ë¶€?œëª©</label>
          <textarea
            value={subtitle}
            onChange={e => setSubtitle(e.target.value)}
            placeholder="ë¶€?œëª© (? íƒ)"
            style={{ width: "100%", minHeight: 64, padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }}
          />
        </div>

        {/* ?¸ì¶œ?œê°„ ?ˆì•½ (ê´€ë¦¬ì ?„ìš©) */}
        {isAdmin && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            ?¸ì¶œ?œê°„
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: "50%", border: "1px solid #9ca3af", fontSize: 9, color: "#9ca3af" }}>i</span>
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600 }}>
              <input type="checkbox" checked={isReserved} onChange={e => setIsReserved(e.target.checked)} style={{ accentColor: "#3b82f6" }} />
              ?ˆì•½
            </label>
            <input type="date" value={publishDate} onChange={e => setPublishDate(e.target.value)} disabled={!isReserved && !editId} style={{ flex: 1, padding: "0 10px", height: 40, border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, background: (!isReserved && !editId) ? "#f3f4f6" : "#fff", color: (!isReserved && !editId) ? "#9ca3af" : "#111", outline: "none" }} />
            <input type="time" value={publishTime} onChange={e => setPublishTime(e.target.value)} disabled={!isReserved && !editId} style={{ flex: 1, padding: "0 10px", height: 40, border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, background: (!isReserved && !editId) ? "#f3f4f6" : "#fff", color: (!isReserved && !editId) ? "#9ca3af" : "#111", outline: "none" }} />
          </div>
        </div>
        )}

        {/* ë¯¸ë””???¹ì…˜ (?¬ì§„/?ìƒ) */}
        <div style={{ marginBottom: 16, background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>?“· ë¯¸ë””??ì²¨ë? (?¬ì§„ {photos.length} / ?ìƒ {videos.length})</span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            <button
              onClick={() => photoInputRef.current?.click()}
              style={{ flex: 1, minWidth: "80px", height: 40, background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              + ?¬ì§„
            </button>
            <button
              onClick={openPhotoDbModal}
              style={{ flex: 1, minWidth: "80px", height: 40, background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              + ?¬í† DB
            </button>
            <div style={{ flex: 2, minWidth: "160px", display: "flex", gap: 6 }}>
               <input
                 type="url"
                 value={youtubeInput}
                 onChange={e => setYoutubeInput(e.target.value)}
                 onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddVideo(); } }}
                 placeholder="? íŠœë¸??ìƒ ë§í¬ ?…ë ¥"
                 style={{ flex: 1, padding: "0 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, outline: "none" }}
               />
               <button
                 onClick={handleAddVideo}
                 style={{ padding: "0 14px", background: "#374151", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
               >
                 ì¶”ê?
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
              <div style={{ fontSize: 28, marginBottom: 6 }}>?“</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>?¬ì§„?´ë‚˜ ? íŠœë¸??ìƒ??ì¶”ê??´ì£¼?¸ìš”</div>
              <div style={{ fontSize: 11, color: "#b0b5bf", marginTop: 4 }}>?ë™ WebP ?•ì¶• ?ìš©</div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
              {/* ?¬ì§„ ëª©ë¡ */}
              {photos.map((p, idx) => (
                <div key={`photo-${idx}`} style={{ position: "relative", flexShrink: 0, width: 100, height: 100, borderRadius: 10, overflow: "hidden", border: p.isCover ? "2px solid #3b82f6" : "1px solid #e5e7eb" }}>
                  <img src={p.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  {p.isCover && (
                    <div style={{ position: "absolute", top: 4, left: 4, background: "#3b82f6", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>?€??/div>
                  )}
                  <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 4 }}>
                    {!p.isCover && (
                      <button onClick={() => setCover('photo', idx)} style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "none", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>â­?/button>
                    )}
                    <button onClick={() => removePhoto(idx)} style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(239,68,68,0.9)", color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>??/button>
                  </div>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 10, textAlign: "center", padding: "2px 0" }}>?¬ì§„</div>
                </div>
              ))}
              {/* ?ìƒ ëª©ë¡ */}
              {videos.map((v, idx) => (
                <div key={`video-${idx}`} style={{ position: "relative", flexShrink: 0, width: 100, height: 100, borderRadius: 10, overflow: "hidden", border: v.isCover ? "2px solid #3b82f6" : "1px solid #e5e7eb" }}>
                  <img src={`https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 24, height: 24, background: "rgba(0,0,0,0.7)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                     <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21" /></svg>
                  </div>
                  {v.isCover && (
                    <div style={{ position: "absolute", top: 4, left: 4, background: "#3b82f6", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>?€??/div>
                  )}
                  <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 4 }}>
                    {!v.isCover && (
                      <button onClick={() => setCover('video', idx)} style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "none", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>â­?/button>
                    )}
                    <button onClick={() => removeVideo(idx)} style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(239,68,68,0.9)", color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>??/button>
                  </div>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(220,38,38,0.8)", color: "#fff", fontSize: 10, textAlign: "center", padding: "2px 0", fontWeight: "bold" }}>?ìƒ</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ë³¸ë¬¸ */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>
            ë³¸ë¬¸ <span style={{ color: "#ef4444" }}>*</span>
          </label>
          {/* ?ë””???´ë°” */}
          <div style={{ display: "flex", gap: 4, padding: "8px 12px", background: "#fafafa", border: "1px solid #d1d5db", borderBottom: "none", borderTopLeftRadius: 10, borderTopRightRadius: 10, overflowX: "auto" }}>
            <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('bold', false); }} style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", fontSize: 14, fontWeight: 800, color: "#1f2937", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>B</button>
            <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('italic', false); }} style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", fontSize: 14, fontStyle: "italic", color: "#1f2937", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>I</button>
            <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('underline', false); }} style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", fontSize: 14, textDecoration: "underline", color: "#1f2937", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>U</button>
            <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('strikeThrough', false); }} style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", fontSize: 14, color: "#1f2937", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "line-through" }}>S</button>
            <div style={{ width: 1, height: 20, background: "#d1d5db", margin: "6px 4px" }} />
            <select onChange={e => { document.execCommand(e.target.value, false); editorRef.current?.focus(); }} defaultValue="" title="?ìŠ¤???•ë ¬" style={{ padding: "0 8px", border: "none", borderRadius: 4, fontSize: 13, color: "#1f2937", background: "none", cursor: "pointer", outline: "none" }}>
              <option value="" disabled hidden>?•ë ¬</option>
              <option value="justifyLeft">?¼ìª½</option>
              <option value="justifyCenter">ê°€?´ë°</option>
              <option value="justifyRight">?¤ë¥¸ìª?/option>
              <option value="justifyFull">?‘ìª½</option>
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
            {content.replace(/<[^>]*>/g, '').length}??          </div>
        </div>



        {/* ?¤ì›Œ??*/}
        <div style={{ marginBottom: 16, background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb" }}>
          <label style={{ fontSize: 14, fontWeight: 800, color: "#111", display: "block", marginBottom: 8 }}>?·ï¸??¤ì›Œ??/label>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
              placeholder="?¤ì›Œ?œë? ?…ë ¥?˜ì„¸??
              style={{ flex: 1, height: 40, padding: "0 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none" }}
            />
            <button
              onClick={addKeyword}
              style={{ height: 40, padding: "0 14px", background: "#374151", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
            >
              ì¶”ê?
            </button>
          </div>
          {keywords.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {keywords.map((kw, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 4, background: "#eff6ff", color: "#2563eb", fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 14, border: "1px solid #bfdbfe" }}>
                  #{kw}
                  <button onClick={() => setKeywords(keywords.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#93c5fd", fontSize: 14, cursor: "pointer", padding: 0, lineHeight: 1 }}>??/button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ?‘ì„±???•ë³´ */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb" }}>
          <label style={{ fontSize: 14, fontWeight: 800, color: "#111", display: "block", marginBottom: 10 }}>?‘¤ ?‘ì„±???•ë³´</label>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>?´ë¦„</div>
              <input
                type="text"
                value={reporterName}
                onChange={e => setReporterName(e.target.value)}
                style={{ width: "100%", height: 40, padding: "0 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>?´ë©”??/div>
              <input
                type="email"
                value={reporterEmail}
                onChange={e => setReporterEmail(e.target.value)}
                style={{ width: "100%", height: 40, padding: "0 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>
        </div>

        {/* ?˜ë‹¨ ?¸ë¼??ë²„íŠ¼ */}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            style={{ flex: 2, height: 56, background: saving ? "#9ca3af" : "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", border: "none", borderRadius: 14, fontSize: 17, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 4px 12px rgba(59,130,246,0.3)" }}
          >
            {saving ? "ì²˜ë¦¬ì¤?.." : "?“‹ ?¹ì¸? ì²­"}
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            style={{ flex: 1, height: 56, background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "?€?¥ì¤‘..." : "?’¾ ?„ì‹œ?€??}
          </button>
        </div>
      </div>

      {/* ?€?€ ?¬í†  DB ëª¨ë‹¬ ?€?€ */}
      {showPhotoDbModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 500, maxHeight: "90vh", borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f9fafb" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>?¬í† DB ë¶ˆëŸ¬?¤ê¸°</h3>
              <button onClick={() => setShowPhotoDbModal(false)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#9ca3af" }}>Ã—</button>
            </div>
            
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
              <form onSubmit={handlePhotoDbSearch} style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="?´ë?ì§€ ê²€?‰ì–´ ?…ë ¥"
                  value={photoDbSearch}
                  onChange={e => setPhotoDbSearch(e.target.value)}
                  style={{ flex: 1, padding: "0 12px", height: 40, border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none" }}
                />
                <button type="submit" style={{ padding: "0 16px", background: "#374151", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>ê²€??/button>
              </form>
            </div>

            <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
              <button onClick={() => setPhotoDbTab("?„ì²´?¬ì§„")} style={{ flex: 1, padding: "12px 0", border: "none", background: "none", fontSize: 14, fontWeight: photoDbTab === "?„ì²´?¬ì§„" ? 800 : 600, color: photoDbTab === "?„ì²´?¬ì§„" ? "#3b82f6" : "#6b7280", borderBottom: photoDbTab === "?„ì²´?¬ì§„" ? "2px solid #3b82f6" : "2px solid transparent", cursor: "pointer" }}>?„ì²´?¬ì§„</button>
              <button onClick={() => setPhotoDbTab("ì¦ê²¨ì°¾ê¸°")} style={{ flex: 1, padding: "12px 0", border: "none", background: "none", fontSize: 14, fontWeight: photoDbTab === "ì¦ê²¨ì°¾ê¸°" ? 800 : 600, color: photoDbTab === "ì¦ê²¨ì°¾ê¸°" ? "#3b82f6" : "#6b7280", borderBottom: photoDbTab === "ì¦ê²¨ì°¾ê¸°" ? "2px solid #3b82f6" : "2px solid transparent", cursor: "pointer" }}>ì¦ê²¨ì°¾ê¸° â­ï¸</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#f3f4f6" }}>
              {isPhotoDbLoading ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#6b7280", fontSize: 14 }}>ë¶ˆëŸ¬?¤ëŠ” ì¤?..</div>
              ) : photoDbItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 14 }}>ê²€??ê²°ê³¼ê°€ ?†ìŠµ?ˆë‹¤.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 10 }}>
                  {photoDbItems.map((item, idx) => (
                    <div key={idx} style={{ background: "#fff", borderRadius: 8, overflow: "hidden", border: "1px solid #e5e7eb", cursor: "pointer", position: "relative" }} onClick={() => handleSelectFromPhotoDb(item)}>
                      <div style={{ width: "100%", aspectRatio: "1/1", background: "#f3f4f6", backgroundImage: `url(${item.url})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                      <button onClick={(e) => handleToggleFav(e, item.id, item.is_favorite)} style={{ position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        {item.is_favorite ? "â­ï¸" : "??}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
