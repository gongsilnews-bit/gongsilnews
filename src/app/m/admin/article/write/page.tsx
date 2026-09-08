"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { saveArticle, getArticleDetail, getPhotoLibrary, togglePhotoFavorite, getMyArticles } from "@/app/actions/article";
import { uploadArticleMediaDirect } from "@/utils/uploadDirect";

import imageCompression from "browser-image-compression";

/* ── WebP 압축 변환 (browser-image-compression 활용) ── */
const compressToWebP = async (file: File, maxWidth = 1200, quality = 0.82): Promise<File> => {
  if (!file.type.startsWith("image/") && !file.name.toLowerCase().endsWith(".heic")) {
    return file;
  }
  try {
    const options = {
      maxSizeMB: 1,          // 최대 용량 1MB 제한
      maxWidthOrHeight: maxWidth, // 가로세로 최대 maxWidth 리사이징
      useWebWorker: true,
      fileType: "image/webp", // WebP 포맷으로 변환 강제
      initialQuality: quality
    };
    // HEIC 및 고해상도 처리를 완벽하게 모바일 하드웨어 단에서 최적화 지원
    const compressedBlob = await imageCompression(file, options);
    return new File([compressedBlob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
      type: "image/webp"
    });
  } catch (error) {
    console.error("압축 실패, 원본 업로드:", error);
    return file;
  }
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

  /* ── 관련기사 상태 ── */
  const [relatedArticles, setRelatedArticles] = useState<{ id: string; title: string; section1: string; published_at: string }[]>([]);
  const [showRelatedArticleModal, setShowRelatedArticleModal] = useState(false);
  const [relatedArticlesDb, setRelatedArticlesDb] = useState<any[]>([]);
  const [isRelatedArticlesLoading, setIsRelatedArticlesLoading] = useState(false);
  const [relatedArticleSearch, setRelatedArticleSearch] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  /* ── 미디어 상태 ── */
  const [photos, setPhotos] = useState<{ file: File | null; preview: string; caption: string; isCover: boolean; align?: 'left' | 'center' | 'right'; mediaId?: string }[]>([]);
  const [videos, setVideos] = useState<{ url: string; videoId: string; isCover: boolean; isShorts: boolean }[]>([]);
  const [youtubeInput, setYoutubeInput] = useState("");
  const [isShortsCheck, setIsShortsCheck] = useState(false);
  const [photoCollapsed, setPhotoCollapsed] = useState(false);
  const [videoCollapsed, setVideoCollapsed] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  /* ── 에디터 커서 위치 저장/복원 ── */
  const saveEditorSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const insertHtmlAtCursor = (html: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const sel = window.getSelection();
    const range = savedRangeRef.current && editor.contains(savedRangeRef.current.startContainer)
      ? savedRangeRef.current
      : null;
    if (sel && range) {
      sel.removeAllRanges();
      sel.addRange(range);
    } else if (sel) {
      // 저장된 위치가 없으면 맨 끝에 커서를 둔다
      const endRange = document.createRange();
      endRange.selectNodeContents(editor);
      endRange.collapse(false);
      sel.removeAllRanges();
      sel.addRange(endRange);
    }
    document.execCommand("insertHTML", false, html);
    setContent(editor.innerHTML || "");
  };

  // 에디터 호버/터치 삭제 버튼 주입 스타일
  useEffect(() => {
    const styleId = "mobile-editor-media-styles";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .inserted-photo, .inserted-video {
        position: relative !important;
        display: table;
      }
      .inserted-photo .editor-media-delete,
      .inserted-video .editor-media-delete {
        display: flex;
        position: absolute;
        top: 6px;
        right: 6px;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: rgba(239,68,68,0.95);
        color: #fff;
        border: 2px solid #fff;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        z-index: 20;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        touch-action: manipulation;
      }
      .inserted-photo .editor-media-delete:active,
      .inserted-video .editor-media-delete:active {
        transform: scale(1.15);
        background: rgba(220,38,38,1);
      }
    `;
    document.head.appendChild(style);
  }, []);

  /* ── 예약 노출 상태 ── */
  const [isReserved, setIsReserved] = useState(false);
  const [publishDate, setPublishDate] = useState("");
  const [publishTime, setPublishTime] = useState("");

  /* ── 포토 DB 상태 ── */
  const [showPhotoDbModal, setShowPhotoDbModal] = useState(false);
  const [photoDbItems, setPhotoDbItems] = useState<any[]>([]);
  const [photoDbSearch, setPhotoDbSearch] = useState("");
  const [photoDbTab, setPhotoDbTab] = useState<"전체사진" | "즐겨찾기">("전체사진");
  const [isPhotoDbLoading, setIsPhotoDbLoading] = useState(false);

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
        if (m.role === "ADMIN") setIsAdmin(true);
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
          if (d.article_keywords && Array.isArray(d.article_keywords)) {
            const parsedKeywords = d.article_keywords.flatMap((k: any) => {
              const val = String(k.keyword || "");
              return val.split(/[,#\s]+/).map((s: string) => s.replace(/^#+/, "").trim()).filter(Boolean);
            });
            setKeywords(Array.from(new Set(parsedKeywords)));
          }
          if (d.related_articles && Array.isArray(d.related_articles)) {
            setRelatedArticles(d.related_articles.map((ra: any) => ({
              id: ra.id,
              title: ra.title,
              section1: ra.section1,
              published_at: ra.published_at
            })));
          }

          let htmlContent = d.content || "";

          // 1. 기존 DB 사진 목록 복원
          let restoredPhotos: { file: File | null; preview: string; caption: string; isCover: boolean; align?: 'left' | 'center' | 'right'; mediaId?: string }[] = [];
          if (d.article_media && Array.isArray(d.article_media)) {
            restoredPhotos = d.article_media
              .filter((m: any) => m.media_type === "PHOTO")
              .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
              .map((m: any) => ({
                file: null,
                preview: m.url,
                caption: m.caption || "",
                isCover: d.thumbnail_url === m.url,
                align: "center",
                mediaId: m.id
              }));
          }

          // 2. HTML 파서로 사진 및 영상 파싱 & wrapper에 삭제 버튼 삽입
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = htmlContent;

          // (1) 에디터 내 사진 래핑 및 삭제버튼 주입
          const imgElements = tempDiv.querySelectorAll("img");
          imgElements.forEach((img) => {
            const src = img.getAttribute("src") || "";
            if (!src) return;

            // 이미 .inserted-photo 내부에 있는지 확인
            let wrapper = img.closest(".inserted-photo") as HTMLElement | null;
            if (!wrapper) {
              wrapper = document.createElement("div");
              wrapper.className = "inserted-photo";
              wrapper.style.cssText = "position: relative; display: table; margin: 16px auto; text-align: center;";
              wrapper.setAttribute("contenteditable", "false");
              img.parentNode?.insertBefore(wrapper, img);
              wrapper.appendChild(img);
            }
            // 삭제 버튼이 없으면 추가
            if (!wrapper.querySelector(".editor-media-delete")) {
              const btn = document.createElement("button");
              btn.type = "button";
              btn.className = "editor-media-delete";
              btn.innerHTML = "✕";
              btn.setAttribute("contenteditable", "false");
              btn.title = "사진 삭제";
              wrapper.appendChild(btn);
            }

            // DB 목록에 없는 인라인 사진도 photos 상태에 추가
            if (!restoredPhotos.some(p => p.preview === src)) {
              const caption = wrapper.querySelector("p")?.textContent || "";
              restoredPhotos.push({
                file: null,
                preview: src,
                caption,
                isCover: d.thumbnail_url === src,
                align: "center"
              });
            }
          });

          // (2) 영상 파싱 및 복원
          const restoredVideos: { url: string; videoId: string; isCover: boolean; isShorts: boolean }[] = [];
          const iframes = tempDiv.querySelectorAll("iframe");
          iframes.forEach((iframe) => {
            const src = iframe.getAttribute("src") || "";
            const match = src.match(/embed\/([\w-]{11})/);
            if (match) {
              const vId = match[1];
              let wrapper = iframe.closest(".inserted-video") as HTMLElement | null;
              if (!wrapper) {
                wrapper = document.createElement("div");
                wrapper.className = "inserted-video";
                wrapper.style.cssText = "position: relative; display: table; width: 100%; margin: 16px auto; text-align: center;";
                wrapper.setAttribute("contenteditable", "false");
                iframe.parentNode?.insertBefore(wrapper, iframe);
                wrapper.appendChild(iframe);
              }
              if (!wrapper.querySelector(".editor-media-delete")) {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "editor-media-delete";
                btn.innerHTML = "✕";
                btn.setAttribute("contenteditable", "false");
                btn.title = "영상 삭제";
                wrapper.appendChild(btn);
              }

              if (!restoredVideos.some(v => v.videoId === vId)) {
                restoredVideos.push({
                  url: `https://www.youtube.com/watch?v=${vId}`,
                  videoId: vId,
                  isCover: d.thumbnail_url?.includes(vId) || false,
                  isShorts: iframe.style.aspectRatio?.includes("9/16") || false,
                });
              }
            }
          });

          if (d.youtube_url) {
            const mainMatch = d.youtube_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/);
            if (mainMatch && !restoredVideos.find(v => v.videoId === mainMatch[1])) {
              restoredVideos.push({
                url: d.youtube_url,
                videoId: mainMatch[1],
                isCover: d.thumbnail_url?.includes(mainMatch[1]) || false,
                isShorts: !!d.is_shorts
              });
            }
          }

          // 대표 지정이 전혀 안 되어 있으면 첫 번째 사진 혹은 영상을 대표로 설정
          if (restoredPhotos.length > 0 && !restoredPhotos.some(p => p.isCover) && !restoredVideos.some(v => v.isCover)) {
            restoredPhotos[0].isCover = true;
          }

          setPhotos(restoredPhotos);
          setVideos(restoredVideos);

          htmlContent = tempDiv.innerHTML;
          setContent(htmlContent);
          if (editorRef.current) {
            editorRef.current.innerHTML = htmlContent;
          }
          
          if (d.published_at) {
            const dt = new Date(d.published_at);
            const now = new Date();
            // KST 기준으로 날짜/시간 파싱 (Vercel UTC 서버 대응)
            const kstParts = dt.toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).split(' ');
            // 시간이 미래라면 예약 상태로 세팅
            if (dt > now) {
              setIsReserved(true);
              setPublishDate(kstParts[0]);
              const timeParts = kstParts[1]?.split(':') || ['00','00'];
              setPublishTime(`${timeParts[0]}:${timeParts[1]}`);
            }
          }
        }
      }
    })();
  }, [editId]);

  /* ── 포토DB 로직 ── */
  const openPhotoDbModal = () => {
    setShowPhotoDbModal(true);
    setPhotoDbTab("전체사진");
    setPhotoDbSearch("");
    fetchPhotoDb("", false);
  };

  /* ── 관련기사 검색/추가 ── */
  const fetchRelatedArticles = async (searchKw: string = "") => {
    setIsRelatedArticlesLoading(true);
    if (currentUserId) {
      const res = await getMyArticles(currentUserId);
      if (res.success && res.data) {
        let data = res.data.filter((a: any) => a.status === "APPROVED");
        if (searchKw) {
          data = data.filter((a: any) => a.title?.includes(searchKw));
        }
        setRelatedArticlesDb(data);
      } else {
        setRelatedArticlesDb([]);
      }
    } else {
      setRelatedArticlesDb([]);
    }
    setIsRelatedArticlesLoading(false);
  };

  const openRelatedArticleModal = () => {
    setShowRelatedArticleModal(true);
    setRelatedArticleSearch("");
    fetchRelatedArticles("");
  };

  const handleRelatedSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRelatedArticles(relatedArticleSearch);
  };

  const handleSelectRelatedArticle = (article: any) => {
    setRelatedArticles(prev => {
      if (prev.some(a => a.id === article.id)) {
        return prev.filter(a => a.id !== article.id);
      }
      return [...prev, { id: article.id, title: article.title, section1: article.section1, published_at: article.published_at }];
    });
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
      fetchPhotoDb(photoDbSearch, photoDbTab === "즐겨찾기");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoDbTab]);

  const handlePhotoDbSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPhotoDb(photoDbSearch, photoDbTab === "즐겨찾기");
  };

  const handleToggleFav = async (e: React.MouseEvent, photoId: string, currentFav: boolean) => {
    e.stopPropagation();
    const res = await togglePhotoFavorite(photoId, !currentFav);
    if (res.success) {
      setPhotoDbItems(prev => prev.map(p => p.id === photoId ? { ...p, is_favorite: !currentFav } : p));
      if (photoDbTab === "즐겨찾기") {
        fetchPhotoDb(photoDbSearch, true);
      }
    } else {
      alert("상태 변경에 실패했습니다.");
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
      alert(`사진을 불러오는 중 오류가 발생했습니다.\n(${err.message || err})`);
    }
  };

  /* ── 키워드 추가 (콤마, 공백, # 복수 분할 지원) ── */
  const addKeyword = (rawText?: string) => {
    const textToProcess = (typeof rawText === "string" ? rawText : keyword).trim();
    if (!textToProcess) return;

    // 콤마, 띄어쓰기, 해시태그(#) 기준으로 자동 분할 및 앞뒤 공백/# 제거
    const newKeywords = textToProcess
      .split(/[,#\s]+/)
      .map(k => k.replace(/^#+/, "").trim())
      .filter(Boolean);

    if (newKeywords.length === 0) return;

    setKeywords(prev => {
      const existing = new Set(prev);
      const uniqueNew = newKeywords.filter(k => !existing.has(k));
      return [...prev, ...uniqueNew];
    });
    setKeyword("");
  };

  /* ── 에디터 DOM 미디어 삭제 시 상태 동기화 ── */
  const syncSidebarFromEditor = () => {
    if (!editorRef.current) return;
    const currentPhotos = editorRef.current.querySelectorAll('.inserted-photo');
    const currentVideos = editorRef.current.querySelectorAll('.inserted-video');

    setPhotos(prev => {
      const editorPhotoUrls = new Set(
        Array.from(currentPhotos)
          .map(wrapper => wrapper.querySelector('img')?.getAttribute('src'))
          .filter((src): src is string => Boolean(src))
      );
      const updated = prev.filter(photo => editorPhotoUrls.has(photo.preview));
      if (updated.length > 0 && !updated.some(p => p.isCover)) {
        updated[0].isCover = true;
      }
      return updated;
    });

    setVideos(prev => {
      if (prev.length <= currentVideos.length) return prev;
      return prev.slice(0, currentVideos.length);
    });
  };

  /* ── 사진 추가 ── */
  const handlePhotoAdd = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) continue;
      const compressed = await compressToWebP(f);
      const preview = URL.createObjectURL(compressed);
      setPhotos(prev => {
        const updated = [...prev, { file: compressed, preview, caption: "", isCover: prev.length === 0 && videos.length === 0, align: 'center' as const }];
        return updated;
      });
      // 에디터의 커서 위치에 즉시 삽입 (삭제 버튼 포함된 .inserted-photo)
      const imgHtml = `<div class="inserted-photo" contenteditable="false" style="position: relative; display: table; margin: 16px auto; text-align: center;"><button type="button" class="editor-media-delete" contenteditable="false" title="사진 삭제">✕</button><img src="${preview}" style="max-width: 100%; height: auto; border-radius: 8px; display: block;" /></div><p><br/></p>`;
      insertHtmlAtCursor(imgHtml);
    }
  };

  /* ── 사진 삭제 ── */
  const removePhoto = (idx: number) => {
    const target = photos[idx];
    if (target && editorRef.current) {
      const wrappers = editorRef.current.querySelectorAll('.inserted-photo');
      wrappers.forEach(w => {
        if (w.querySelector('img')?.getAttribute('src') === target.preview) {
          w.remove();
        }
      });
      setContent(editorRef.current.innerHTML || "");
    }
    setPhotos(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      if (updated.length > 0 && !updated.some(p => p.isCover) && !videos.some(v => v.isCover)) updated[0].isCover = true;
      return updated;
    });
  };

  /* ── 사진 캡션 수정 (에디터 DOM과 양방향 반영) ── */
  const updatePhotoCaption = (idx: number, newCaption: string) => {
    setPhotos(prev => prev.map((p, i) => i === idx ? { ...p, caption: newCaption } : p));
    const target = photos[idx];
    if (target && editorRef.current) {
      const wrappers = editorRef.current.querySelectorAll('.inserted-photo');
      wrappers.forEach(w => {
        if (w.querySelector('img')?.getAttribute('src') === target.preview) {
          let capEl = w.querySelector('p');
          if (newCaption.trim()) {
            if (!capEl) {
              capEl = document.createElement('p');
              capEl.style.cssText = "display: table-caption; caption-side: bottom; font-size: 12px; color: #6b7280; margin: 6px 0 0 0; text-align: center;";
              w.appendChild(capEl);
            }
            capEl.textContent = newCaption;
          } else if (capEl) {
            capEl.remove();
          }
        }
      });
      setContent(editorRef.current.innerHTML || "");
    }
  };

  /* ── 사진 정렬 수정 (좌/중앙/우) ── */
  const updatePhotoAlign = (idx: number, align: 'left' | 'center' | 'right') => {
    setPhotos(prev => prev.map((p, i) => i === idx ? { ...p, align } : p));
    const target = photos[idx];
    if (target && editorRef.current) {
      const wrappers = editorRef.current.querySelectorAll('.inserted-photo');
      wrappers.forEach(w => {
        if (w.querySelector('img')?.getAttribute('src') === target.preview) {
          const marginCss = align === 'left' ? '16px auto 16px 0' : align === 'right' ? '16px 0 16px auto' : '16px auto';
          (w as HTMLElement).style.margin = marginCss;
        }
      });
      setContent(editorRef.current.innerHTML || "");
    }
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
    const isShorts = isShortsCheck || url.includes("shorts");
    setVideos(prev => {
      if (prev.some(v => v.videoId === videoId)) return prev;
      return [...prev, { url, videoId, isCover: false, isShorts }];
    });
    setYoutubeInput("");

    // 에디터의 커서 위치에 즉시 삽입 (삭제 버튼 포함된 .inserted-video)
    const videoHtml = `<div class="inserted-video" contenteditable="false" style="position: relative; display: table; width: 100%; margin: 16px auto; text-align: center;"><button type="button" class="editor-media-delete" contenteditable="false" title="영상 삭제">✕</button><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen style="width:100%; aspect-ratio: ${isShorts ? '9/16' : '16/9'}; border-radius: 8px;"></iframe></div><p><br/></p>`;
    insertHtmlAtCursor(videoHtml);
  };

  /* ── 영상 삭제 ── */
  const removeVideo = (idx: number) => {
    const target = videos[idx];
    if (target && editorRef.current) {
      const wrappers = editorRef.current.querySelectorAll('.inserted-video');
      wrappers.forEach(w => {
        if (w.querySelector('iframe')?.getAttribute('src')?.includes(target.videoId)) {
          w.remove();
        }
      });
      setContent(editorRef.current.innerHTML || "");
    }
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
      // 1. 기사 본문에 사진을 삽입한 HTML 생성 (에디터 내 삭제 버튼 태그는 본문 저장 시 완전 제거)
      let fullContent = editorRef.current ? editorRef.current.innerHTML : content;
      fullContent = fullContent.replace(/<button[^>]*class="editor-media-delete"[^>]*>.*?<\/button>/gi, "");
      
      // 이미 content에 HTML이 포함되어 있지 않고, 순수 텍스트인 경우 p 태그로 래핑
      if (!fullContent.includes("<")) {
        fullContent = fullContent.split("\n").filter(Boolean).map(line => `<p>${line}</p>`).join("\n");
      }

      // 2. 기사 저장
      const status = requestApproval ? "승인신청" : "작성중";

      // KST 기준 현재 시간
      let published_at = new Date().toISOString(); // 기본값: 현재 시간

      if (isReserved && publishDate) {
        // 예약: KST 기준 날짜+시간을 ISO로 변환
        const kstDateStr = `${publishDate}T${publishTime || "00:00"}:00+09:00`;
        published_at = new Date(kstDateStr).toISOString();
      }
      // 예약이 아닌 경우: 신규/수정 모두 현재 시간 (기본값 유지)

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
        relatedIds: relatedArticles.map(a => a.id),
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
        const photoSortOrders = new Map(
          photos
            .map(photo => ({ photo, position: fullContent.indexOf(photo.preview) }))
            .sort((a, b) => {
              const aPosition = a.position < 0 ? Number.MAX_SAFE_INTEGER : a.position;
              const bPosition = b.position < 0 ? Number.MAX_SAFE_INTEGER : b.position;
              return aPosition - bPosition;
            })
            .map(({ photo }, index) => [photo.preview, index] as const)
        );

        for (let i = 0; i < photos.length; i++) {
          const p = photos[i];
          if (p.file) {
            const uploadRes = await uploadArticleMediaDirect(p.file, articleId, {
              mediaType: "PHOTO",
              sortOrder: photoSortOrders.get(p.preview) ?? i,
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
            relatedIds: relatedArticles.map(a => a.id),
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
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
      <div style={{ height: 56 }} />

      {/* 폼 영역 */}
      <div style={{ padding: "16px 16px 32px" }}>

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
              <option value="" disabled style={{ color: "#9ca3af" }}>카테고리 선택</option>
              <option value="공실뉴스">공실뉴스</option>
              <option value="부동산·경제">부동산·경제</option>
              <option value="AI마케팅">AI마케팅</option>
              <option value="라이프·오피니언">라이프·오피니언</option>
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
              <option value="">세부 분류 (선택사항)</option>
              {(section1 === "공실뉴스" || section1 === "공실현장") && (
                <>
                  <option value="아파트/오피스텔">아파트/오피스텔</option>
                  <option value="빌라/주택">빌라/주택</option>
                  <option value="원룸/투룸(풀옵션)">원룸/투룸(풀옵션)</option>
                  <option value="상가/사무실/공장/토지">상가/사무실/공장/토지</option>
                  <option value="신축/분양/경매">신축/분양/경매</option>
                </>
              )}
              {(section1 === "부동산·경제" || section1 === "정책시장") && (
                <>
                  <option value="부동산정책/정치">부동산정책/정치</option>
                  <option value="경제/재테크/주식">경제/재테크/주식</option>
                  <option value="세무/법률/기타">세무/법률/기타</option>
                </>
              )}
              {(section1 === "AI마케팅" || section1 === "AI중개실무") && (
                <>
                  <option value="AI/NEWS">AI/NEWS</option>
                  <option value="부동산유튜브/블로그">부동산유튜브/블로그</option>
                  <option value="공실/임대관리">공실/임대관리</option>
                </>
              )}
              {(section1 === "라이프·오피니언" || section1 === "기타") && (
                <>
                  <option value="인물/인터뷰">인물/인터뷰</option>
                  <option value="중개실무/인테리어Tip">중개실무/인테리어Tip</option>
                  <option value="맛집/여행/건강">맛집/여행/건강</option>
                  <option value="스포츠/연예/기타">스포츠/연예/기타</option>
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
          <textarea
            value={subtitle}
            onChange={e => setSubtitle(e.target.value)}
            placeholder="부제목 (선택)"
            style={{ width: "100%", minHeight: 64, padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }}
          />
        </div>

        {/* 노출시간 예약 (관리자 전용) */}
        {isAdmin && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            노출시간
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: "50%", border: "1px solid #9ca3af", fontSize: 9, color: "#9ca3af" }}>i</span>
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600 }}>
              <input type="checkbox" checked={isReserved} onChange={e => setIsReserved(e.target.checked)} style={{ accentColor: "#3b82f6" }} />
              예약
            </label>
            <input type="date" value={publishDate} onChange={e => setPublishDate(e.target.value)} disabled={!isReserved && !editId} style={{ flex: 1, padding: "0 10px", height: 40, border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, background: (!isReserved && !editId) ? "#f3f4f6" : "#fff", color: (!isReserved && !editId) ? "#9ca3af" : "#111", outline: "none" }} />
            <input type="time" value={publishTime} onChange={e => setPublishTime(e.target.value)} disabled={!isReserved && !editId} style={{ flex: 1, padding: "0 10px", height: 40, border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, background: (!isReserved && !editId) ? "#f3f4f6" : "#fff", color: (!isReserved && !editId) ? "#9ca3af" : "#111", outline: "none" }} />
          </div>
        </div>
        )}

        {/* ── 1. 라이브러리 섹션 ── */}
        <div style={{ marginBottom: 14, background: "#fff", borderRadius: 14, padding: 14, border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>📁 라이브러리</span>
          </div>
          <form onSubmit={handlePhotoDbSearch} style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="포토DB 간편검색"
              value={photoDbSearch}
              onChange={e => setPhotoDbSearch(e.target.value)}
              onClick={openPhotoDbModal}
              style={{ width: "100%", height: 38, padding: "0 38px 0 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, color: "#111", background: "#fff", outline: "none", boxSizing: "border-box" }}
            />
            <button
              type="button"
              onClick={openPhotoDbModal}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </form>
        </div>

        {/* ── 2. 사진 섹션 ── */}
        <div style={{ marginBottom: 14, background: "#fff", borderRadius: 14, padding: 14, border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>📷 사진 ({photos.length})</span>
            <button
              type="button"
              onClick={() => setPhotoCollapsed(!photoCollapsed)}
              style={{ width: 26, height: 26, border: "1px solid #e5e7eb", borderRadius: 6, background: "#f9fafb", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#6b7280" }}
            >
              {photoCollapsed ? "+" : "−"}
            </button>
          </div>

          {!photoCollapsed && (
            <>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={e => handlePhotoAdd(e.target.files)}
                style={{ display: "none" }}
              />
              <div
                onClick={() => photoInputRef.current?.click()}
                style={{
                  border: "2px dashed #d1d5db",
                  borderRadius: 10,
                  padding: "16px 12px",
                  textAlign: "center",
                  color: "#6b7280",
                  fontSize: 12,
                  lineHeight: 1.6,
                  cursor: "pointer",
                  background: "#fcfcfd",
                  marginBottom: photos.length > 0 ? 12 : 0,
                }}
              >
                📷 마우스/터치로 이미지를 끌어오거나, 클릭해주세요.<br />
                <span style={{ fontSize: 11, color: "#9ca3af" }}>(WebP 자동 압축 · 허용용량 10MB)</span>
              </div>

              {photos.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {photos.map((p, i) => (
                    <div
                      key={`photo-card-${i}`}
                      style={{
                        background: "#f9fafb",
                        borderRadius: 10,
                        border: p.isCover ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                        overflow: "hidden",
                      }}
                    >
                      {/* 썸네일 + 대표라벨 + 삭제버튼 */}
                      <div style={{ position: "relative" }}>
                        <img src={p.preview} alt="" style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} />
                        {p.isCover && (
                          <div style={{ position: "absolute", top: 6, left: 6, padding: "3px 8px", background: "#3b82f6", color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 4 }}>대표</div>
                        )}
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          style={{
                            position: "absolute", top: 6, right: 6, width: 24, height: 24,
                            background: "rgba(239,68,68,0.95)", color: "#fff", border: "1.5px solid #fff", borderRadius: "50%",
                            fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.3)"
                          }}
                        >
                          ✕
                        </button>
                      </div>

                      {/* 캡션 입력 */}
                      <div style={{ padding: "8px 8px 0 8px" }}>
                        <input
                          type="text"
                          value={p.caption || ""}
                          onChange={e => updatePhotoCaption(i, e.target.value)}
                          placeholder="사진 설명(캡션) 입력"
                          style={{
                            width: "100%", padding: "7px 10px", fontSize: 12, border: "1px solid #d1d5db",
                            borderRadius: 6, background: "#fff", color: "#111", outline: "none", boxSizing: "border-box"
                          }}
                        />
                      </div>

                      {/* 하단: 정렬 버튼 + 대표지정 */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px" }}>
                        {/* 정렬 버튼 */}
                        <div style={{ display: "flex", gap: 3 }}>
                          {([{ k: "left" as const, icon: "◧", tip: "좌측" }, { k: "center" as const, icon: "▣", tip: "중앙" }, { k: "right" as const, icon: "◨", tip: "우측" }]).map(({ k, icon, tip }) => (
                            <button
                              key={k}
                              type="button"
                              title={tip}
                              onClick={() => updatePhotoAlign(i, k)}
                              style={{
                                width: 30, height: 28, borderRadius: 6, fontSize: 14, cursor: "pointer",
                                border: p.align === k ? "2px solid #3b82f6" : "1px solid #d1d5db",
                                background: p.align === k ? "#dbeafe" : "#fff",
                                color: p.align === k ? "#2563eb" : "#6b7280",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}
                            >
                              {icon}
                            </button>
                          ))}
                        </div>

                        {!p.isCover && (
                          <button
                            type="button"
                            onClick={() => setCover("photo", i)}
                            style={{ padding: "4px 10px", background: "#e5e7eb", color: "#374151", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                          >
                            대표지정
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── 3. 영상 섹션 ── */}
        <div style={{ marginBottom: 14, background: "#fff", borderRadius: 14, padding: 14, border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>🎥 영상 ({videos.length})</span>
            <button
              type="button"
              onClick={() => setVideoCollapsed(!videoCollapsed)}
              style={{ width: 26, height: 26, border: "1px solid #e5e7eb", borderRadius: 6, background: "#f9fafb", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#6b7280" }}
            >
              {videoCollapsed ? "+" : "−"}
            </button>
          </div>

          {!videoCollapsed && (
            <div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <input
                  type="url"
                  value={youtubeInput}
                  onChange={e => setYoutubeInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddVideo(); } }}
                  placeholder="YouTube 영상 링크 입력"
                  style={{ flex: 1, padding: "0 10px", height: 38, border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12, color: "#111", background: "#fff", outline: "none" }}
                />
                <button
                  type="button"
                  onClick={handleAddVideo}
                  style={{ padding: "0 14px", height: 38, background: "#374151", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  입력하기
                </button>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#4b5563", cursor: "pointer", marginBottom: 10 }}>
                <input
                  type="checkbox"
                  checked={isShortsCheck}
                  onChange={e => setIsShortsCheck(e.target.checked)}
                  style={{ accentColor: "#3b82f6" }}
                />
                쇼츠(세로) 영상으로 크기 맞춤
              </label>

              {/* 등록된 영상 목록 */}
              {videos.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {videos.map((v, i) => (
                    <div
                      key={`video-card-${i}`}
                      style={{
                        background: "#f9fafb",
                        borderRadius: 10,
                        border: v.isCover ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ position: "relative" }}>
                        <img
                          src={`https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`}
                          alt=""
                          style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }}
                        />
                        <div
                          style={{
                            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                            width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,0.65)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><polygon points="6 3 20 12 6 21" /></svg>
                        </div>
                        {v.isCover && (
                          <div style={{ position: "absolute", top: 6, left: 6, padding: "3px 8px", background: "#3b82f6", color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 4 }}>대표</div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeVideo(i)}
                          style={{
                            position: "absolute", top: 6, right: 6, width: 24, height: 24,
                            background: "rgba(239,68,68,0.95)", color: "#fff", border: "1.5px solid #fff", borderRadius: "50%",
                            fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.3)"
                          }}
                        >
                          ✕
                        </button>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px" }}>
                        <span style={{ fontSize: 11, color: "#6b7280" }}>{v.isShorts ? "📱 쇼츠 (9:16)" : "🎬 일반 영상 (16:9)"}</span>
                        {!v.isCover && (
                          <button
                            type="button"
                            onClick={() => setCover("video", i)}
                            style={{ padding: "4px 10px", background: "#e5e7eb", color: "#374151", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                          >
                            대표지정
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
            onBlur={e => { setContent(e.currentTarget.innerHTML || ""); saveEditorSelection(); }}
            onKeyUp={saveEditorSelection}
            onMouseUp={saveEditorSelection}
            onClick={e => {
              const target = e.target as HTMLElement;
              // 에디터 내 빨간색 ✕ 삭제 버튼 클릭 처리
              if (target.classList.contains("editor-media-delete") || target.closest(".editor-media-delete")) {
                e.preventDefault();
                e.stopPropagation();
                const wrapper = target.closest(".inserted-photo, .inserted-video");
                if (wrapper) {
                  // 다음 줄바꿈 제거
                  const nextSib = wrapper.nextSibling;
                  if (nextSib && nextSib.nodeName === "BR") nextSib.remove();
                  wrapper.remove();
                  if (editorRef.current) {
                    setContent(editorRef.current.innerHTML || "");
                  }
                  syncSidebarFromEditor();
                }
              }
            }}
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
              onPaste={e => {
                const pastedData = e.clipboardData.getData("text");
                if (/[,#\s]/.test(pastedData)) {
                  e.preventDefault();
                  addKeyword(pastedData);
                }
              }}
              placeholder="키워드 입력 후 엔터 (#, 콤마, 띄어쓰기로 여러 개 붙여넣기 가능)"
              style={{ flex: 1, height: 40, padding: "0 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, outline: "none" }}
            />
            <button
              type="button"
              onClick={() => addKeyword()}
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

        {/* 관련기사 */}
        <div style={{ marginBottom: 16, background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>📎 관련기사</label>
            <button
              onClick={openRelatedArticleModal}
              style={{ height: 36, padding: "0 14px", background: "#374151", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              + 관련기사추가
            </button>
          </div>
          {relatedArticles.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {relatedArticles.map((ra, i) => (
                <div key={ra.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px" }}>
                  <span style={{ fontSize: 13, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ra.title}</span>
                  <button onClick={() => setRelatedArticles(relatedArticles.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 14, cursor: "pointer", padding: 0, flexShrink: 0 }}>삭제</button>
                </div>
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

        {/* 하단 인라인 버튼 */}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            style={{ flex: 2, height: 56, background: saving ? "#9ca3af" : "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", border: "none", borderRadius: 14, fontSize: 17, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 4px 12px rgba(59,130,246,0.3)" }}
          >
            {saving ? "처리중..." : "📋 승인신청"}
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            style={{ flex: 1, height: 56, background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "저장중..." : "💾 임시저장"}
          </button>
        </div>
      </div>

      {/* ── 포토 DB 모달 ── */}
      {showPhotoDbModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 500, maxHeight: "90vh", borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f9fafb" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>포토DB 불러오기</h3>
              <button onClick={() => setShowPhotoDbModal(false)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#9ca3af" }}>×</button>
            </div>
            
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
              <form onSubmit={handlePhotoDbSearch} style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="이미지 검색어 입력"
                  value={photoDbSearch}
                  onChange={e => setPhotoDbSearch(e.target.value)}
                  style={{ flex: 1, padding: "0 12px", height: 40, border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none" }}
                />
                <button type="submit" style={{ padding: "0 16px", background: "#374151", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>검색</button>
              </form>
            </div>

            <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
              <button onClick={() => setPhotoDbTab("전체사진")} style={{ flex: 1, padding: "12px 0", border: "none", background: "none", fontSize: 14, fontWeight: photoDbTab === "전체사진" ? 800 : 600, color: photoDbTab === "전체사진" ? "#3b82f6" : "#6b7280", borderBottom: photoDbTab === "전체사진" ? "2px solid #3b82f6" : "2px solid transparent", cursor: "pointer" }}>전체사진</button>
              <button onClick={() => setPhotoDbTab("즐겨찾기")} style={{ flex: 1, padding: "12px 0", border: "none", background: "none", fontSize: 14, fontWeight: photoDbTab === "즐겨찾기" ? 800 : 600, color: photoDbTab === "즐겨찾기" ? "#3b82f6" : "#6b7280", borderBottom: photoDbTab === "즐겨찾기" ? "2px solid #3b82f6" : "2px solid transparent", cursor: "pointer" }}>즐겨찾기 ⭐️</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#f3f4f6" }}>
              {isPhotoDbLoading ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#6b7280", fontSize: 14 }}>불러오는 중...</div>
              ) : photoDbItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 14 }}>검색 결과가 없습니다.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 10 }}>
                  {photoDbItems.map((item, idx) => (
                    <div key={idx} style={{ background: "#fff", borderRadius: 8, overflow: "hidden", border: "1px solid #e5e7eb", cursor: "pointer", position: "relative" }} onClick={() => handleSelectFromPhotoDb(item)}>
                      <div style={{ width: "100%", aspectRatio: "1/1", background: "#f3f4f6", backgroundImage: `url(${item.url})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                      <button onClick={(e) => handleToggleFav(e, item.id, item.is_favorite)} style={{ position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        {item.is_favorite ? "⭐️" : "☆"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 관련기사 검색 모달 ── */}
      {showRelatedArticleModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 500, maxHeight: "90vh", borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f9fafb" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>관련기사 검색 <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>(전체 {relatedArticlesDb.length}건)</span></h3>
              <button onClick={() => setShowRelatedArticleModal(false)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#9ca3af" }}>×</button>
            </div>

            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
              <form onSubmit={handleRelatedSearch} style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="기사 제목 검색"
                  value={relatedArticleSearch}
                  onChange={e => setRelatedArticleSearch(e.target.value)}
                  style={{ flex: 1, padding: "0 12px", height: 40, border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none" }}
                />
                <button type="submit" style={{ padding: "0 16px", background: "#374151", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>검색</button>
              </form>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#f3f4f6" }}>
              {isRelatedArticlesLoading ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#6b7280", fontSize: 14 }}>불러오는 중...</div>
              ) : relatedArticlesDb.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 14 }}>검색 결과가 없습니다.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {relatedArticlesDb.map((article) => (
                    <label key={article.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={relatedArticles.some(a => a.id === article.id)}
                        onChange={() => handleSelectRelatedArticle(article)}
                      />
                      <span style={{ fontSize: 13, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{article.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e7eb" }}>
              <button onClick={() => setShowRelatedArticleModal(false)} style={{ width: "100%", height: 44, background: "#374151", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>완료</button>
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
