"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveArticle, uploadArticleMedia, getPhotoLibrary, togglePhotoFavorite, getArticleDetail } from "@/app/actions/article";
import { geocodeAddress } from "@/app/actions/geocode";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

/* ─── 타입 ─── */
type StatusType = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | string;
type FormType = "일반" | "카드뉴스" | "갤러리";



export default function NewsWritePage({ initialIsMemberMode = false }: { initialIsMemberMode?: boolean } = {}) {
  const router = useRouter();

  /* ─── 상태 ─── */
  const [status, setStatus] = useState<StatusType>("DRAFT");
  const [formType, setFormType] = useState<FormType>("일반");
  const [publishDate, setPublishDate] = useState("2026-03-24");
  const [publishTime, setPublishTime] = useState("00:00");
  const [section1, setSection1] = useState("");
  const [section2, setSection2] = useState("");
  const [series, setSeries] = useState("");
  const [reporterName, setReporterName] = useState("김미숙");
  const [reporterEmail, setReporterEmail] = useState("gongsilnews@gmail.com");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [content, setContent] = useState("");
  const editorRef = React.useRef<HTMLDivElement>(null);
  const savedRangeRef = React.useRef<Range | null>(null);
  const [keyword, setKeyword] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isShortsRatio, setIsShortsRatio] = useState(false);
  const [videoItems, setVideoItems] = useState<{ url: string; videoId: string; caption: string; isShorts: boolean; isCover: boolean }[]>([]);
  /* ── 동영상 수정 모달 상태 ── */
  const [showVideoEditModal, setShowVideoEditModal] = useState(false);
  const [editVideoIdx, setEditVideoIdx] = useState(-1);
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [editVideoCaption, setEditVideoCaption] = useState('');
  const [photoCollapsed, setPhotoCollapsed] = useState(false);
  const [videoCollapsed, setVideoCollapsed] = useState(false);
  const [fileCollapsed, setFileCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [articleCoords, setArticleCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<{ file: File | null; preview: string; caption: string; isCover: boolean; size: number; align: string; captionAlign: string; mediaId?: string }[]>([]);
  const [attachFiles, setAttachFiles] = useState<{ file: File; name: string }[]>([]);
  const [loadArticleId, setLoadArticleId] = useState<string | null>(null);

  /* ── 회원 모드 (URL 파라미터: role=member) ── */
  const [isMemberMode, setIsMemberMode] = useState(initialIsMemberMode);
  const [memberReturnPath, setMemberReturnPath] = useState("/admin?menu=article");
  const [memberAuthorId, setMemberAuthorId] = useState<string | null>(null);

  /* ── 관련기사 관련 상태 ── */
  const [relatedArticles, setRelatedArticles] = useState<{id: string, title: string, section1: string, published_at: string}[]>([]);
  const [showRelatedArticleModal, setShowRelatedArticleModal] = useState(false);
  const [relatedArticlesDb, setRelatedArticlesDb] = useState<any[]>([]);

  /* ── 반려 사유 상태 ── */
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const REJECT_REASONS = [
    "사진 화질 불량 또는 이미지 누락",
    "제목 및 본문 오타 수정 요망",
    "사실 확인 필요 (내용 불충분)",
    "기타 사유 (직접 입력)"
  ];
  const [isRelatedArticlesLoading, setIsRelatedArticlesLoading] = useState(false);
  const [relatedArticleSearch, setRelatedArticleSearch] = useState('');

  const fetchRelatedArticles = async (searchKw: string = '') => {
    setIsRelatedArticlesLoading(true);
    const { getArticles } = await import('@/app/actions/article');
    const res = await getArticles({ limit: 130 }); // 최근 130건 (이미지 참조)
    if (res.success && res.data) {
      let data = res.data;
      if (searchKw) {
         data = data.filter((a: any) => a.title?.includes(searchKw));
      }
      setRelatedArticlesDb(data);
    }
    setIsRelatedArticlesLoading(false);
  };

  const handleRelatedSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRelatedArticles(relatedArticleSearch);
  };

  const handleSelectRelatedArticle = (article: any) => {
    if (relatedArticles.some(a => a.id === article.id)) return;
    setRelatedArticles(prev => [...prev, {
      id: article.id,
      title: article.title,
      section1: article.section1,
      published_at: article.published_at
    }]);
  };

  useEffect(() => {
    if (showRelatedArticleModal) {
       fetchRelatedArticles(relatedArticleSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRelatedArticleModal]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const articleId = params.get("id");
      /* ── 작성자 정보 및 멤버 모드 감지 (Session) ── */
      const returnPath = params.get("return");
      if (returnPath) setMemberReturnPath(`/${returnPath}`);

      const fetchCurrentUser = async () => {
        const supabase = createClient();
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) {
          const { data: m } = await supabase.from('members').select('name, email, role').eq('id', authData.user.id).single();
          if (m) {
            // 새 글 쓰기일 때만 초기값 세팅 (기존 글 수정 시에는 DB 정보로 덮어씌워짐)
            if (!articleId) {
              setReporterName(m.name || "작성자");
              setReporterEmail(m.email || "");
            }
            if (m.role === 'REALTOR' || m.role === 'USER') {
              setIsMemberMode(true);
              setMemberAuthorId(authData.user.id);
              // 만약 returnPath가 URL에 없었다면, 권한에 맞게 강제지정
              if (!returnPath) {
                setMemberReturnPath(m.role === 'REALTOR' ? '/realty_admin?menu=article' : '/user_admin?menu=article');
              }
            } else {
              setIsMemberMode(false);
            }
          }
        }
      };
      
      fetchCurrentUser();
      if (articleId) {
        setLoadArticleId(articleId);
        getArticleDetail(articleId).then(res => {
          if (res.success && res.data) {
            const d = res.data;
            if (d.status === "PENDING") setStatus("승인신청");
            else if (d.status === "REJECTED") setStatus("반려");
            else setStatus("작성중");
            
            if (d.form_type === "CARD_NEWS") setFormType("카드뉴스");
            else if (d.form_type === "GALLERY") setFormType("갤러리");
            else setFormType("일반");
            
            if (d.published_at) {
              const dt = new Date(d.published_at);
              const yy = dt.getFullYear();
              const mm = String(dt.getMonth()+1).padStart(2,'0');
              const dd = String(dt.getDate()).padStart(2,'0');
              setPublishDate(`${yy}-${mm}-${dd}`);
              
              const hh = String(dt.getHours()).padStart(2,'0');
              const _min = String(dt.getMinutes()).padStart(2,'0');
              setPublishTime(`${hh}:${_min}`);
            }
            if (d.section1) setSection1(d.section1);
            if (d.section2) setSection2(d.section2);
            if (d.series) setSeries(d.series);
            if (d.author_name) setReporterName(d.author_name);
            if (d.author_email) setReporterEmail(d.author_email);
            if (d.author_id) setMemberAuthorId(d.author_id);
            if (d.title) setTitle(d.title);
            if (d.subtitle) setSubtitle(d.subtitle);
            if (d.youtube_url) setYoutubeUrl(d.youtube_url);
            if (d.is_shorts) setIsShortsRatio(true);
            if (d.lat && d.lng) setArticleCoords({ lat: d.lat, lng: d.lng });
            if (d.location_name) setLocation(d.location_name);
            if (d.content) {
              setContent(d.content);
              if (editorRef.current) {
                editorRef.current.innerHTML = d.content;
              }
            }

            if (d.article_keywords) {
              setKeywords(d.article_keywords.map((k: any) => k.keyword));
            }

            // [기존 DB 파일(사진) 불러오기]
            let existingPhotos: any[] = [];
            if (d.article_media) {
              existingPhotos = d.article_media
                .filter((m: any) => m.media_type === "PHOTO")
                .map((m: any) => ({
                  file: null,
                  preview: m.url,
                  caption: m.caption || "",
                  isCover: d.thumbnail_url === m.url,
                  size: m.file_size || 0,
                  align: "center",
                  captionAlign: "center",
                  mediaId: m.id
                }));
            }

            // [에디터 DOM 파싱을 통한 상태 복원 - DB에 부분 누락된 영상/사진 살리기]
            if (editorRef.current) {
              const domPhotos = Array.from(editorRef.current.querySelectorAll('.inserted-photo')).map(wrapper => {
                const img = wrapper.querySelector('img');
                return {
                  file: null,
                  preview: img ? img.src : '',
                  caption: wrapper.querySelector('p')?.textContent || '',
                  isCover: d.thumbnail_url === (img ? img.src : ''),
                  size: 600, align: 'center', captionAlign: 'center'
                };
              });

              // DB photo와 DOM photo 병합 (DB 정보 우선)
              if (existingPhotos.length === 0 && domPhotos.length > 0) {
                existingPhotos = domPhotos;
              }

              const domVideos = Array.from(editorRef.current.querySelectorAll('.inserted-video')).map(wrapper => {
                const iframe = wrapper.querySelector('iframe');
                let vId = '';
                if (iframe && iframe.src) {
                  const match = iframe.src.match(/embed\/([^?]+)/);
                  if (match) vId = match[1];
                }
                return {
                  url: iframe ? iframe.src : '',
                  videoId: vId,
                  caption: wrapper.querySelector('p')?.textContent || '',
                  isShorts: false, isCover: false
                };
              });

              setPhotoFiles(existingPhotos);
              setVideoItems(domVideos);
            }
          }
        });
      }
    }
  }, []);

  /* ── 사진추가 모달 상태 ── */
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [modalFile, setModalFile] = useState<File | null>(null);
  const [modalPreview, setModalPreview] = useState<string>("");
  const [modalSize, setModalSize] = useState<number>(600);
  const [modalInsertMode, setModalInsertMode] = useState<'자동' | '수동'>('자동');
  const [modalAlign, setModalAlign] = useState<'left' | 'center' | 'right'>('left');
  const [modalWatermark, setModalWatermark] = useState<number>(0);
  const [modalCaption, setModalCaption] = useState('');
  const [modalCaptionAlign, setModalCaptionAlign] = useState<'left' | 'center' | 'right'>('left');
  const modalFileRef = React.useRef<HTMLInputElement>(null);

  /* ── 사진수정 모달 상태 ── */
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPhotoIdx, setEditPhotoIdx] = useState<number>(-1);
  const [editSize, setEditSize] = useState<number>(600);
  const [editInsertMode, setEditInsertMode] = useState<'자동' | '수동'>('자동');
  const [editAlign, setEditAlign] = useState<'left' | 'center' | 'right'>('left');
  const [editCaption, setEditCaption] = useState('');
  const [editCaptionAlign, setEditCaptionAlign] = useState<'left' | 'center' | 'right'>('left');

  /* ── 포토DB 모달 상태 ── */
  const [showPhotoDbModal, setShowPhotoDbModal] = useState(false);
  const [photoDbTab, setPhotoDbTab] = useState<'전체사진' | '즐겨찾기'>('전체사진');
  const [photoDbSearch, setPhotoDbSearch] = useState('');
  const [photoDbItems, setPhotoDbItems] = useState<any[]>([]);
  const [isPhotoDbLoading, setIsPhotoDbLoading] = useState(false);

  /* ── 지도 검색 모달 (카카오맵) ── */
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapSearchKw, setMapSearchKw] = useState('');
  const mapRef = React.useRef<HTMLDivElement>(null);
  const kakaoMapRef = React.useRef<any>(null);
  const kakaoMarkerRef = React.useRef<any>(null);
  const kakaoInfoWindowRef = React.useRef<any>(null);
  const kakaoPlacesRef = React.useRef<any>(null);

  /* ── 유튜브 헬퍼 ── */
  const extractYoutubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/,
      /youtube\.com\/shorts\/([\w-]{11})/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return null;
  };
  const getYoutubeThumbnail = (videoId: string) => `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

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

  /* ── 에디터 커서 위치 저장 ── */
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      // 에디터 내부인지 확인
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }
  };

  /* ── 에디터 내 미디어 삭제 버튼 생성 ── */
  const createDeleteBtn = (wrapper: HTMLElement, type: 'photo' | 'video') => {
    const btn = document.createElement('button');
    btn.className = 'editor-media-delete';
    btn.innerHTML = '✕';
    btn.setAttribute('contenteditable', 'false');
    btn.title = type === 'photo' ? '사진 삭제' : '영상 삭제';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // 뒤의 br 제거
      const nextSib = wrapper.nextSibling;
      if (nextSib && nextSib.nodeName === 'BR') nextSib.remove();
      wrapper.remove();
      if (editorRef.current) setContent(editorRef.current.innerHTML || '');
      syncSidebarFromEditor();
    });
    wrapper.style.position = 'relative';
    wrapper.appendChild(btn);
  };

  /* ── 에디터 DOM 변경 시 사이드바 상태 동기화 ── */
  const syncSidebarFromEditor = () => {
    if (!editorRef.current) return;
    const currentPhotos = editorRef.current.querySelectorAll('.inserted-photo');
    const currentVideos = editorRef.current.querySelectorAll('.inserted-video');

    // 사진: 에디터에 없는 것들은 사이드바에서도 제거
    setPhotoFiles(prev => {
      if (prev.length <= currentPhotos.length) return prev;
      // 에디터에 남은 수만큼만 유지 (앞에서부터)
      const updated = prev.slice(0, currentPhotos.length);
      if (updated.length > 0 && !updated.some(p => p.isCover)) {
        updated[0].isCover = true;
      }
      return updated;
    });

    setVideoItems(prev => {
      if (prev.length <= currentVideos.length) return prev;
      return prev.slice(0, currentVideos.length);
    });
  };

  /* ── 에디터 hover 삭제 버튼 CSS 주입 ── */
  useEffect(() => {
    const styleId = 'editor-media-styles';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .inserted-photo, .inserted-video {
        position: relative;
      }
      .inserted-photo .editor-media-delete,
      .inserted-video .editor-media-delete {
        display: none;
        position: absolute;
        top: 6px;
        right: 6px;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: rgba(239,68,68,0.9);
        color: #fff;
        border: 2px solid #fff;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        z-index: 10;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        transition: transform 0.15s;
      }
      .inserted-photo:hover .editor-media-delete,
      .inserted-video:hover .editor-media-delete {
        display: flex;
      }
      .inserted-photo .editor-media-delete:hover,
      .inserted-video .editor-media-delete:hover {
        transform: scale(1.15);
        background: rgba(220,38,38,1);
      }
    `;
    document.head.appendChild(style);
  }, []);

  /* ── 에디터 커서 위치에 이미지 삽입 ── */
  const insertImageAtCursor = (previewUrl: string, caption: string, opts?: { size?: number; align?: string; captionAlign?: string }) => {
    if (!editorRef.current) return;
    const imgSize = opts?.size || 600;
    const align = opts?.align || 'center';
    const capAlign = opts?.captionAlign || 'left';

    // 이미지 + 캡션 wrapper 생성
    const wrapper = document.createElement('div');
    const wrapAlign = align === 'left' ? 'left' : align === 'right' ? 'right' : 'center';
    wrapper.style.cssText = `margin: 16px 0; text-align: ${wrapAlign};`;
    wrapper.setAttribute('contenteditable', 'false');
    wrapper.className = 'inserted-photo';

    const img = document.createElement('img');
    img.src = previewUrl;
    const floatCss = align === 'left' ? 'float: left; margin: 0 16px 8px 0;' : align === 'right' ? 'float: right; margin: 0 0 8px 16px;' : 'display: block; margin: 0 auto;';
    img.style.cssText = `max-width: ${imgSize}px; width: 100%; height: auto; border-radius: 6px; ${floatCss}`;
    img.alt = caption || '기사 이미지';
    wrapper.appendChild(img);

    if (caption) {
      const cap = document.createElement('p');
      cap.style.cssText = `font-size: 13px; color: #6b7280; margin: 8px 0 0 0; text-align: ${capAlign}; line-height: 1.5; clear: both;`;
      cap.textContent = caption;
      wrapper.appendChild(cap);
    }

    // float 해제용 clearfix
    if (align !== 'center') {
      const clear = document.createElement('div');
      clear.style.cssText = 'clear: both;';
      wrapper.appendChild(clear);
    }

    // 삭제 버튼 추가
    createDeleteBtn(wrapper, 'photo');

    // 커서 뒤에 줄바꿈 추가
    const br = document.createElement('br');

    if (savedRangeRef.current && editorRef.current.contains(savedRangeRef.current.commonAncestorContainer)) {
      const range = savedRangeRef.current;
      range.deleteContents();
      range.insertNode(br);
      range.insertNode(wrapper);
      // 커서를 이미지 뒤로 이동
      range.setStartAfter(br);
      range.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    } else {
      // 저장된 커서가 없으면 에디터 맨 끝에 삽입
      editorRef.current.appendChild(wrapper);
      editorRef.current.appendChild(br);
    }

    // content 상태 업데이트
    setContent(editorRef.current.innerHTML || "");
  };

  /* ── 사진 선택 (우측 사이드바 드래그/클릭용 — WebP 압축 후 삽입) ── */
  const handlePhotoSelect = async (files: FileList | File[] | null) => {
    if (!files) return;
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));

    for (const f of newFiles) {
      const compressed = await compressToWebP(f);
      const preview = URL.createObjectURL(compressed);
      const photo = {
        file: compressed,
        preview,
        caption: '',
        isCover: false,
        size: 600,
        align: 'center',
        captionAlign: 'left',
      };

      setPhotoFiles(prev => {
        const updated = [...prev, photo];
        if (prev.length === 0) updated[0].isCover = true;
        return updated;
      });

      insertImageAtCursor(preview, '', { size: 600, align: 'center', captionAlign: 'left' });
    }
  };

  /* ── 사진추가 모달: 좌측 사진 버튼 클릭 시 열기 ── */
  const openPhotoModal = () => {
    saveSelection();
    setModalFile(null);
    setModalPreview('');
    setModalSize(600);
    setModalInsertMode('자동');
    setModalAlign('left');
    setModalWatermark(0);
    setModalCaption('');
    setModalCaptionAlign('left');
    setShowPhotoModal(true);
  };

  /* ── 모달에서 파일 선택 (즐시 WebP 압축) ── */
  const handleModalFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (!f.type.startsWith('image/')) return;
    const compressed = await compressToWebP(f);
    setModalFile(compressed);
    setModalPreview(URL.createObjectURL(compressed));
  };

  /* ── 모달 확인 → 에디터 커서 위치 삽입 + 우측 사이드바 반영 ── */
  const handlePhotoModalConfirm = () => {
    if (!modalFile || !modalPreview) {
      alert('사진 파일을 선택해주세요.');
      return;
    }

    const newPhoto = {
      file: modalFile,
      preview: modalPreview,
      caption: modalCaption,
      isCover: false,
      size: modalSize,
      align: modalAlign,
      captionAlign: modalCaptionAlign,
    };

    setPhotoFiles(prev => {
      const updated = [...prev, newPhoto];
      if (prev.length === 0) updated[0].isCover = true;
      return updated;
    });

    // 에디터 커서 위치에 삽입
    insertImageAtCursor(modalPreview, modalCaption, {
      size: modalSize,
      align: modalAlign,
      captionAlign: modalCaptionAlign,
    });

    setShowPhotoModal(false);
  };

  /* ── 사진 캡션 업데이트 ── */
  const updatePhotoCaption = (idx: number, caption: string) => {
    setPhotoFiles(prev => prev.map((p, i) => i === idx ? { ...p, caption } : p));
    // 에디터 내 해당 이미지의 캡션도 업데이트
    if (editorRef.current) {
      const photos = editorRef.current.querySelectorAll('.inserted-photo');
      if (photos[idx]) {
        let capEl = photos[idx].querySelector('p');
        if (caption) {
          if (!capEl) {
            capEl = document.createElement('p');
            capEl.style.cssText = 'font-size: 13px; color: #6b7280; margin: 8px 0 0 0; text-align: center; line-height: 1.5;';
            photos[idx].appendChild(capEl);
          }
          capEl.textContent = caption;
        } else if (capEl) {
          capEl.remove();
        }
        setContent(editorRef.current.innerHTML || "");
      }
    }
  };

  /* ── 대표 지정 (사진) — 영상 대표도 해제 ── */
  const setAsCover = (idx: number) => {
    setPhotoFiles(prev => prev.map((p, i) => ({ ...p, isCover: i === idx })));
    setVideoItems(prev => prev.map(v => ({ ...v, isCover: false })));
  };

  /* ── 대표 지정 (영상) — 사진 대표도 해제 ── */
  const setVideoCover = (idx: number) => {
    setVideoItems(prev => prev.map((v, i) => ({ ...v, isCover: i === idx })));
    setPhotoFiles(prev => prev.map(p => ({ ...p, isCover: false })));
  };

  /* ── 사진 정렬 변경 (우측 사이드바 버튼 클릭 시 에디터에도 반영) ── */
  const updatePhotoAlign = (idx: number, newAlign: 'left' | 'center' | 'right') => {
    setPhotoFiles(prev => prev.map((p, i) => i === idx ? { ...p, align: newAlign } : p));
    // 에디터 내 해당 이미지 정렬도 변경
    if (editorRef.current) {
      const photos = editorRef.current.querySelectorAll('.inserted-photo');
      if (photos[idx]) {
        const wrapper = photos[idx] as HTMLElement;
        const wrapAlign = newAlign === 'left' ? 'left' : newAlign === 'right' ? 'right' : 'center';
        wrapper.style.textAlign = wrapAlign;
        const img = wrapper.querySelector('img') as HTMLElement;
        if (img) {
          const floatCss = newAlign === 'left' ? 'float: left; margin: 0 16px 8px 0; display: inline;'
            : newAlign === 'right' ? 'float: right; margin: 0 0 8px 16px; display: inline;'
            : 'float: none; display: block; margin: 0 auto;';
          img.style.cssText = img.style.cssText.replace(/float:[^;]*;?/g, '').replace(/display:[^;]*;?/g, '').replace(/margin:[^;]*;?/g, '') + floatCss;
        }
        // clearfix 처리
        const existingClear = wrapper.querySelector('div[style*="clear"]');
        if (newAlign !== 'center') {
          if (!existingClear) {
            const clear = document.createElement('div');
            clear.style.cssText = 'clear: both;';
            wrapper.appendChild(clear);
          }
        } else if (existingClear) {
          existingClear.remove();
        }
        setContent(editorRef.current.innerHTML || '');
      }
    }
  };

  /* ── 사진수정 모달 열기 ── */
  const openEditPhotoModal = (idx: number) => {
    const p = photoFiles[idx];
    if (!p) return;
    setEditPhotoIdx(idx);
    setEditSize(p.size || 600);
    setEditInsertMode('자동');
    setEditAlign((p.align || 'center') as 'left' | 'center' | 'right');
    setEditCaption(p.caption || '');
    setEditCaptionAlign((p.captionAlign || 'left') as 'left' | 'center' | 'right');
    setShowEditModal(true);
  };

  /* ── 사진수정 모달 확인 → 에디터 + 상태 반영 ── */
  const handleEditPhotoConfirm = () => {
    const idx = editPhotoIdx;
    if (idx < 0) return;

    // 상태 업데이트
    setPhotoFiles(prev => prev.map((p, i) => i === idx ? {
      ...p,
      caption: editCaption,
      size: editSize,
      align: editAlign,
      captionAlign: editCaptionAlign,
    } : p));

    // 에디터 DOM 업데이트
    if (editorRef.current) {
      const photos = editorRef.current.querySelectorAll('.inserted-photo');
      if (photos[idx]) {
        const wrapper = photos[idx] as HTMLElement;
        const wrapAlign = editAlign === 'left' ? 'left' : editAlign === 'right' ? 'right' : 'center';
        wrapper.style.textAlign = wrapAlign;

        // 이미지 크기 + 정렬
        const img = wrapper.querySelector('img') as HTMLElement;
        if (img) {
          const floatCss = editAlign === 'left' ? 'float: left; margin: 0 16px 8px 0;'
            : editAlign === 'right' ? 'float: right; margin: 0 0 8px 16px;'
            : 'display: block; margin: 0 auto;';
          img.style.cssText = `max-width: ${editSize}px; width: 100%; height: auto; border-radius: 6px; ${floatCss}`;
        }

        // 캡션 업데이트
        let capEl = wrapper.querySelector('p');
        if (editCaption) {
          if (!capEl) {
            capEl = document.createElement('p');
            // clearfix 앞에 삽입
            const clearDiv = wrapper.querySelector('div[style*="clear"]');
            if (clearDiv) wrapper.insertBefore(capEl, clearDiv);
            else wrapper.appendChild(capEl);
          }
          capEl.style.cssText = `font-size: 13px; color: #6b7280; margin: 8px 0 0 0; text-align: ${editCaptionAlign}; line-height: 1.5; clear: both;`;
          capEl.textContent = editCaption;
        } else if (capEl) {
          capEl.remove();
        }

        // clearfix 처리
        const existingClear = wrapper.querySelector('div[style*="clear"]');
        if (editAlign !== 'center') {
          if (!existingClear) {
            const clear = document.createElement('div');
            clear.style.cssText = 'clear: both;';
            wrapper.appendChild(clear);
          }
        } else if (existingClear) {
          existingClear.remove();
        }

        setContent(editorRef.current.innerHTML || '');
      }
    }

    setShowEditModal(false);
  };

  const removePhoto = (idx: number) => {
    // 에디터 내 해당 이미지도 제거
    if (editorRef.current) {
      const photos = editorRef.current.querySelectorAll('.inserted-photo');
      if (photos[idx]) {
        // 뒤에 br이 있으면 같이 제거
        const nextSib = photos[idx].nextSibling;
        if (nextSib && nextSib.nodeName === 'BR') nextSib.remove();
        photos[idx].remove();
        setContent(editorRef.current.innerHTML || "");
      }
    }
    setPhotoFiles(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      const updated = prev.filter((_, i) => i !== idx);
      // 대표사진이 삭제되면 첫번째를 대표로
      if (updated.length > 0 && !updated.some(p => p.isCover)) {
        updated[0].isCover = true;
      }
      return updated;
    });
  };

  /* ── 파일 선택 ── */
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).map(f => ({ file: f, name: f.name }));
    setAttachFiles(prev => [...prev, ...newFiles]);
  };
  const removeFile = (idx: number) => {
    setAttachFiles(prev => prev.filter((_, i) => i !== idx));
  };

  /* ── 유튜브 영상 커서 위치에 삽입 ── */
  const insertVideoAtCursor = (videoId: string, caption: string, isShorts: boolean) => {
    if (!editorRef.current) return;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'margin: 16px 0; text-align: center;';
    wrapper.setAttribute('contenteditable', 'false');
    wrapper.className = 'inserted-video';

    const iframeWrap = document.createElement('div');
    iframeWrap.style.cssText = isShorts
      ? 'position: relative; width: 315px; height: 560px; margin: 0 auto;'
      : 'position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%;';

    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}`;
    iframe.style.cssText = isShorts
      ? 'width: 100%; height: 100%; border: none; border-radius: 8px;'
      : 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;';
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    iframeWrap.appendChild(iframe);
    wrapper.appendChild(iframeWrap);

    if (caption) {
      const cap = document.createElement('p');
      cap.style.cssText = 'font-size: 13px; color: #6b7280; margin: 8px 0 0 0; text-align: center; line-height: 1.5;';
      cap.textContent = caption;
      wrapper.appendChild(cap);
    }

    // 삭제 버튼 추가
    createDeleteBtn(wrapper, 'video');

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
    setContent(editorRef.current.innerHTML || '');
  };

  /* ── 영상 추가 (입력하기 버튼) ── */
  const handleAddVideo = () => {
    if (!youtubeUrl.trim()) { alert('유튜브 링크를 입력해주세요.'); return; }
    const videoId = extractYoutubeId(youtubeUrl);
    if (!videoId) { alert('올바른 YouTube 링크를 입력해주세요.'); return; }

    setVideoItems(prev => [...prev, { url: youtubeUrl, videoId, caption: '', isShorts: isShortsRatio, isCover: false }]);
    insertVideoAtCursor(videoId, '', isShortsRatio);
    setYoutubeUrl('');
  };

  /* ── 영상 삭제 ── */
  const removeVideo = (idx: number) => {
    if (editorRef.current) {
      const videos = editorRef.current.querySelectorAll('.inserted-video');
      if (videos[idx]) {
        const nextSib = videos[idx].nextSibling;
        if (nextSib && nextSib.nodeName === 'BR') nextSib.remove();
        videos[idx].remove();
        setContent(editorRef.current.innerHTML || '');
      }
    }
    setVideoItems(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      // 대표영상이 삭제되면 첫 사진을 대표로
      if (prev[idx]?.isCover && updated.length === 0 && photoFiles.length > 0) {
        setPhotoFiles(pf => {
          const pfu = [...pf];
          if (pfu.length > 0 && !pfu.some(p => p.isCover)) pfu[0].isCover = true;
          return pfu;
        });
      }
      return updated;
    });
  };

  /* ── 영상 수정 모달 열기 ── */
  const openEditVideoModal = (idx: number) => {
    const v = videoItems[idx];
    if (!v) return;
    setEditVideoIdx(idx);
    setEditVideoUrl(v.url);
    setEditVideoCaption(v.caption);
    setShowVideoEditModal(true);
  };

  /* ── 영상 수정 모달 확인 ── */
  const handleEditVideoConfirm = () => {
    const idx = editVideoIdx;
    if (idx < 0) return;
    const newId = extractYoutubeId(editVideoUrl);
    if (!newId) { alert('올바른 YouTube 링크를 입력해주세요.'); return; }

    setVideoItems(prev => prev.map((v, i) => i === idx ? { ...v, url: editVideoUrl, videoId: newId, caption: editVideoCaption } : v));

    // 에디터 DOM 업데이트
    if (editorRef.current) {
      const videos = editorRef.current.querySelectorAll('.inserted-video');
      if (videos[idx]) {
        const wrapper = videos[idx] as HTMLElement;
        const iframe = wrapper.querySelector('iframe');
        if (iframe) iframe.src = `https://www.youtube.com/embed/${newId}`;

        let capEl = wrapper.querySelector('p');
        if (editVideoCaption) {
          if (!capEl) {
            capEl = document.createElement('p');
            capEl.style.cssText = 'font-size: 13px; color: #6b7280; margin: 8px 0 0 0; text-align: center; line-height: 1.5;';
            wrapper.appendChild(capEl);
          }
          capEl.textContent = editVideoCaption;
        } else if (capEl) {
          capEl.remove();
        }
        setContent(editorRef.current.innerHTML || '');
      }
    }
    setShowVideoEditModal(false);
  };

  /* ── 에디터에 이미 삽입된 영상 다시 삽입 (□ 삽입 버튼) ── */
  const reinsertVideo = (idx: number) => {
    const v = videoItems[idx];
    if (!v) return;
    insertVideoAtCursor(v.videoId, v.caption, v.isShorts);
  };

  /* ── 포토DB 모달 로직 ── */
  const openPhotoDbModal = () => {
    setShowPhotoDbModal(true);
    setPhotoDbTab('전체사진');
    setPhotoDbSearch('');
    fetchPhotoDb('', false);
  };

  const fetchPhotoDb = async (searchStr: string, favOnly: boolean) => {
    setIsPhotoDbLoading(true);
    const res = await getPhotoLibrary({ search: searchStr, isFavorite: favOnly });
    if (res.success && res.data) {
      setPhotoDbItems(res.data);
    } else {
      setPhotoDbItems([]);
    }
    setIsPhotoDbLoading(false);
  };

  useEffect(() => {
    if (showPhotoDbModal) {
      fetchPhotoDb(photoDbSearch, photoDbTab === '즐겨찾기');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoDbTab]);

  const handlePhotoDbSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPhotoDb(photoDbSearch, photoDbTab === '즐겨찾기');
  };

  const handleToggleFav = async (e: React.MouseEvent, photoId: string, currentFav: boolean) => {
    e.stopPropagation();
    const res = await togglePhotoFavorite(photoId, !currentFav);
    if (res.success) {
      setPhotoDbItems(prev => prev.map(p => p.id === photoId ? { ...p, is_favorite: !currentFav } : p));
      if (photoDbTab === '즐겨찾기') {
        fetchPhotoDb(photoDbSearch, true); // 목록 갱신
      }
    } else {
      alert("상태 변경에 실패했습니다.");
    }
  };

  const handleSelectFromPhotoDb = async (photo: any) => {
    setShowPhotoDbModal(false);
    try {
      // URL에서 Blob으로 변환하여 일반 첨부와 동일한 로직 태우기
      const response = await fetch(photo.url);
      const blob = await response.blob();
      const ext = photo.filename ? photo.filename.split('.').pop() : 'webp';
      const file = new File([blob], photo.filename || `db_photo_${Date.now()}.${ext}`, { type: blob.type });
      
      handlePhotoSelect([file]); // 기존 로직 재활용
    } catch (err) {
      alert("사진을 불러오는 중 오류가 발생했습니다.");
    }
  };

  /* ── 카카오맵 모달 로직 ── */
  useEffect(() => {
    if (showMapModal) {
      if (!(window as any).kakao || !(window as any).kakao.maps) {
        const script = document.createElement("script");
        const kakaoApiKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc";
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoApiKey}&libraries=services&autoload=false`;
        document.head.appendChild(script);
        script.onload = () => {
          (window as any).kakao.maps.load(() => initKakaoMap());
        };
      } else {
        initKakaoMap();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMapModal]);

  const initKakaoMap = () => {
    if (!mapRef.current) return;
    const kakao = (window as any).kakao;
    const centerLatLng = articleCoords ? new kakao.maps.LatLng(articleCoords.lat, articleCoords.lng) : new kakao.maps.LatLng(37.498095, 127.027610); // 기본 강남역
    const options = { center: centerLatLng, level: 3 };
    
    if (!kakaoMapRef.current) {
      kakaoMapRef.current = new kakao.maps.Map(mapRef.current, options);
      kakaoMarkerRef.current = new kakao.maps.Marker({ position: centerLatLng });
      kakaoMarkerRef.current.setMap(kakaoMapRef.current);
      kakaoPlacesRef.current = new kakao.maps.services.Places();
      kakaoInfoWindowRef.current = new kakao.maps.InfoWindow({ zIndex: 1, removable: true });
    } else {
      kakaoMapRef.current.setCenter(centerLatLng);
      kakaoMarkerRef.current.setPosition(centerLatLng);
    }

    // 클릭 이벤트 (마커 이동 및 오버레이 띄우기)
    kakao.maps.event.addListener(kakaoMapRef.current, 'click', (mouseEvent: any) => {
      const latlng = mouseEvent.latLng;
      kakaoMarkerRef.current.setPosition(latlng);
      displayMapOverlay(latlng.getLat(), latlng.getLng(), "직접 선택한 위치");
    });
  };

  const handleMapSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapSearchKw.trim() || !kakaoPlacesRef.current) return;
    kakaoPlacesRef.current.keywordSearch(mapSearchKw, (data: any, status: any) => {
      const kakao = (window as any).kakao;
      if (status === kakao.maps.services.Status.OK && data.length > 0) {
        const place = data[0];
        const latlng = new kakao.maps.LatLng(place.y, place.x);
        kakaoMapRef.current.setCenter(latlng);
        kakaoMarkerRef.current.setPosition(latlng);
        displayMapOverlay(place.y, place.x, place.place_name || place.address_name);
      } else {
        alert("검색 결과가 없습니다.");
      }
    });
  };

  const displayMapOverlay = (lat: number, lng: number, title: string) => {
    const kakao = (window as any).kakao;
    const content = `
      <div style="padding: 12px; background: #fff; border-radius: 8px; min-width: 200px; text-align: center; font-family: sans-serif;">
        <div style="font-size: 14px; font-weight: 800; color: #111827; margin-bottom: 6px;">${title}</div>
        <div style="font-size: 12px; color: #6b7280; margin-bottom: 12px;">📍 좌표: ${parseFloat(lat as any).toFixed(6)}, ${parseFloat(lng as any).toFixed(6)}</div>
        <button id="kakao-modal-confirm-btn" style="width: 100%; padding: 10px 0; background: #e8590c; color: #fff; border: none; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer;">
          ✔ 이 위치를 기사 좌표로 등록
        </button>
      </div>
    `;
    kakaoInfoWindowRef.current.setContent(content);
    kakaoInfoWindowRef.current.open(kakaoMapRef.current, kakaoMarkerRef.current);

    setTimeout(() => {
      const btn = document.getElementById('kakao-modal-confirm-btn');
      if (btn) {
        btn.onclick = () => {
          setArticleCoords({ lat: parseFloat(lat as any), lng: parseFloat(lng as any) });
          setShowMapModal(false);
          kakaoInfoWindowRef.current.close();
        };
      }
    }, 100);
  };

  /* ── 현재 로그인 사용자 권한 가져오기 ── */
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setCurrentUserId(data.user.id);
        const { data: memberData } = await supabase.from('members').select('role').eq('id', data.user.id).single();
        if (memberData && memberData.role) {
          setCurrentUserRole(memberData.role);
        }
      }
    };
    fetchUser();
  }, []);

  /* ─── 키워드 추가 ─── */
  const handleKeywordAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && keyword.trim()) {
      e.preventDefault();
      // 콤마, 띄어쓰기, 해시태그(#) 기준으로 분할
      const newKeywords = keyword.split(/[,#\s]+/).map(k => k.trim()).filter(k => k);
      setKeywords(prev => [...prev, ...newKeywords]);
      setKeyword("");
    }
  };

  const removeKeyword = (idx: number) => {
    setKeywords(prev => prev.filter((_, i) => i !== idx));
  };

  /* ── 위치 좌표 변환 (장소명/주소 → 좌표) ── */
  const handleGeocode = async () => {
    if (!location.trim()) {
      alert("장소명 또는 주소를 입력해주세요.");
      return;
    }
    setGeocoding(true);
    try {
      const result = await geocodeAddress(location);
      if (result.success && result.lat && result.lng) {
        setArticleCoords({ lat: result.lat, lng: result.lng });
      } else {
        alert("❌ 좌표를 찾을 수 없습니다. 다른 주소로 시도해주세요.");
        setArticleCoords(null);
      }
    } catch {
      alert("❌ 좌표 변환 중 오류가 발생했습니다.");
      setArticleCoords(null);
    } finally {
      setGeocoding(false);
    }
  };

  /* ── 기사 저장 ── */
  const handleSave = async (overrideStatus?: string, overrideRejectReason?: string) => {
    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }
    if (!section1) {
      alert("1차 섹션을 선택해주세요.");
      return;
    }

    setSaving(true);
    try {
      // 노출시간 조합
      let publishedAt: string | null = null;
      if (publishDate) {
        publishedAt = `${publishDate}T${publishTime || "00:00"}:00`;
      }

      // 대표 이미지 URL 결정
      let thumbnailUrl = '';
      const coverVideo = videoItems.find(v => v.isCover);
      if (coverVideo) {
        // YouTube 고해상도 썸네일
        thumbnailUrl = `https://img.youtube.com/vi/${coverVideo.videoId}/maxresdefault.jpg`;
      }
      // 사진 대표이면 업로드 후 URL 업데이트 (아래에서 처리)

      const currentHtmlContent = editorRef.current ? editorRef.current.innerHTML : content;

      const finalStatus = overrideStatus || status;

      const result = await saveArticle({
        id: loadArticleId || undefined,
        author_id: memberAuthorId || currentUserId || undefined,
        author_name: reporterName,
        author_email: reporterEmail,
        status: finalStatus,
        form_type: formType,
        section1,
        section2,
        series,
        title,
        subtitle,
        content: currentHtmlContent,
        youtube_url: youtubeUrl,
        is_shorts: isShortsRatio,
        published_at: publishedAt,
        keywords,
        location_name: location,
        lat: articleCoords?.lat,
        lng: articleCoords?.lng,
        thumbnail_url: thumbnailUrl || undefined,
        reject_reason: overrideRejectReason || undefined,
      });

      if (result.success) {
        const articleId = result.articleId;
        let finalHtml = currentHtmlContent;
        let finalThumbnailUrl = thumbnailUrl;
        let htmlChanged = false;

        // 사진 첨부: 신규 파일(p.file !== null)은 업로드 진행
        if (articleId && photoFiles.length > 0) {
          for (let i = 0; i < photoFiles.length; i++) {
            const p = photoFiles[i];
            if (p.file) {
              const formData = new FormData();
              formData.append('file', p.file);
              formData.append('article_id', articleId);
              formData.append('media_type', 'PHOTO');
              formData.append('sort_order', String(i));
              formData.append('is_cover', p.isCover ? 'true' : 'false');
              
              const uploadResult = await uploadArticleMedia(formData);
              if (uploadResult.success && uploadResult.url) {
                // 본문에 삽입된 브라우저 Blob URL을 실제 서버 Public URL로 치환
                const localUrl = p.preview;
                if (finalHtml.includes(localUrl)) {
                  finalHtml = finalHtml.replaceAll(localUrl, uploadResult.url);
                  htmlChanged = true;
                }
                if (p.isCover) {
                  finalThumbnailUrl = uploadResult.url;
                }
              }
            } else {
              // 기존에 DB에 있던 사진
              if (p.isCover) finalThumbnailUrl = p.preview;
            }
          }
        }

        // 2차 저장: HTML 본문이 치환되었거나 대표사진(커버)이 새로 할당된 경우 덮어쓰기 업데이트
        if (htmlChanged || finalThumbnailUrl !== thumbnailUrl || finalStatus !== status) {
          await saveArticle({
            id: articleId,
            author_id: memberAuthorId || currentUserId || undefined,
            author_name: reporterName,
            author_email: reporterEmail,
            status: finalStatus, form_type: formType,
            section1, section2, series,
            title, subtitle, 
            content: finalHtml,
            youtube_url: youtubeUrl,
            is_shorts: isShortsRatio,
            published_at: publishedAt,
            keywords,
            location_name: location,
            lat: articleCoords?.lat,
            lng: articleCoords?.lng,
            thumbnail_url: finalThumbnailUrl || undefined,
            reject_reason: overrideRejectReason || undefined,
          });
        }

        // 첨부파일 업로드
        if (articleId && attachFiles.length > 0) {
          for (let i = 0; i < attachFiles.length; i++) {
            const formData = new FormData();
            formData.append('file', attachFiles[i].file);
            formData.append('article_id', articleId);
            formData.append('media_type', 'FILE');
            formData.append('sort_order', String(i));
            await uploadArticleMedia(formData);
          }
        }

        alert("✅ 기사가 저장되었습니다!");
        router.push(isMemberMode ? memberReturnPath : "/admin?menu=article");
      } else {
        alert("❌ 저장 실패: " + result.error);
      }
    } catch (err: any) {
      alert("❌ 오류 발생: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ─── 공통 스타일 변수 ─── */
  const pageBg = "#f4f5f7";
  const cardBg = "#ffffff";
  const border = "#e1e4e8";
  const textPrimary = "#1f2937";
  const textSecondary = "#6b7280";
  const textMuted = "#9ca3af";
  const inputBg = "#fafafa";
  const accentBlue = "#3b82f6";
  const headerBg = "#ffffff";

  // 폼이 ArticleSection 안에서 렌더링되므로, 기존의 사이드바/상단헤더/전체화면높이 스타일은 제거하고 내부 컨텐츠 래퍼만 반환합니다.
  return (
    <>
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 0", display: "flex", gap: 20, alignItems: "flex-start", width: "100%" }}>

        {/* ═══ 좌측 사이드바: 글쓰기도구 ═══ */}
        <aside style={{ width: 220, minWidth: 220, position: "sticky", top: 80, flexShrink: 0 }}>
          <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, padding: "20px 16px" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: textPrimary, margin: "0 0 16px 0" }}>글쓰기도구</h3>

            {/* 6개 아이콘 그리드 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, marginBottom: 20 }}>
              {/* 사진 */}
              <button onClick={openPhotoModal} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 4px", border: "none", background: "none", cursor: "pointer", borderRadius: 8 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#3b82f6" }}>사진</span>
              </button>
              {/* 영상 */}
              <button style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 4px", border: "none", background: "none", cursor: "pointer", borderRadius: 8 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10 8 16 12 10 16 10 8"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 600, color: textSecondary }}>영상</span>
              </button>
              {/* 파일 */}
              <button style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 4px", border: "none", background: "none", cursor: "pointer", borderRadius: 8 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 600, color: textSecondary }}>파일</span>
              </button>
              {/* 포토DB */}
              <button onClick={openPhotoDbModal} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 4px", border: "none", background: "none", cursor: "pointer", borderRadius: 8 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="2"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 600, color: textSecondary }}>포토DB</span>
              </button>
              {/* 임시보관함 */}
              <button style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 4px", border: "none", background: "none", cursor: "pointer", borderRadius: 8 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7L2 7"/><path d="M10 12h4"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 600, color: textSecondary }}>임시보관함</span>
              </button>
              {/* 사진편집 */}
              <button style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 4px", border: "none", background: "none", cursor: "pointer", borderRadius: 8 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 600, color: textSecondary }}>사진편집</span>
              </button>
            </div>

            {/* AI 마법사 카드 */}
            <div style={{ border: "2px solid #f59e0b", borderRadius: 12, padding: "18px 16px", background: "linear-gradient(135deg, #fffbeb, #fef3c7)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>✨</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#d97706" }}>AI 마법사</span>
              </div>
              <p style={{ fontSize: 12, color: "#92400e", lineHeight: 1.6, margin: "0 0 14px 0" }}>
                매물 정보만 한 번 입력하면 기사, 블로그, 쇼츠 대본까지 5가지 콘텐츠를 AI가 한 번에 완성해 줍니다!
              </p>
              <button style={{
                width: "100%", padding: "12px 0", background: "linear-gradient(135deg, #f59e0b, #f97316)",
                color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6
              }}>
                <span>✨</span> 실행하기
              </button>
            </div>
          </div>
        </aside>

        {/* ═══ 중앙 메인 폼: 기사쓰기 ═══ */}
        <main style={{ flex: 1, minWidth: 0 }}>
          <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, padding: "32px 36px" }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: "0 0 28px 0" }}>기사쓰기</h2>

            {/* ── 기사검토 상태 ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: textPrimary, minWidth: 80, display: "flex", alignItems: "center", gap: 4 }}>
                기사검토
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", border: `1px solid ${textMuted}`, fontSize: 10, color: textMuted, cursor: "help" }}>ⓘ</span>
              </label>
              <div style={{ display: "flex", gap: 0, background: "#f3f4f6", borderRadius: 8, padding: 3 }}>
                {(isMemberMode ? ["작성중", "승인신청"] as StatusType[] : ["작성중", "승인신청", "반려"] as StatusType[]).map(s => (
                  <button key={s} onClick={() => setStatus(s)} style={{
                    padding: "8px 18px", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    background: status === s ? "#1f2937" : "transparent",
                    color: status === s ? "#fff" : textSecondary,
                    transition: "all 0.15s",
                  }}>{s}</button>
                ))}
              </div>
            </div>

            {/* ── 형태 ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, padding: "16px 20px", background: inputBg, borderRadius: 8, border: `1px solid ${border}` }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: textPrimary, minWidth: 60, display: "flex", alignItems: "center", gap: 4 }}>
                형태
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", border: `1px solid ${textMuted}`, fontSize: 10, color: textMuted, cursor: "help" }}>ⓘ</span>
              </label>
              <div style={{ display: "flex", gap: 0, background: "#e5e7eb", borderRadius: 6, padding: 2 }}>
                {(["일반", "카드뉴스", "갤러리"] as FormType[]).map(ft => (
                  <button key={ft} onClick={() => setFormType(ft)} style={{
                    padding: "7px 16px", border: "none", borderRadius: 5, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    background: formType === ft ? "#374151" : "transparent",
                    color: formType === ft ? "#fff" : textSecondary,
                    transition: "all 0.15s",
                  }}>{ft}</button>
                ))}
              </div>
            </div>

            {/* ── 노출시간 ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: textPrimary, minWidth: 80, display: "flex", alignItems: "center", gap: 4 }}>
                노출시간
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", border: `1px solid ${textMuted}`, fontSize: 10, color: textMuted, cursor: "help" }}>ⓘ</span>
              </label>
              <input type="date" value={publishDate} onChange={e => setPublishDate(e.target.value)}
                style={{ padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, color: textPrimary, background: cardBg, outline: "none", fontFamily: "inherit" }} />
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: 12, fontSize: 13, color: textMuted }}>오전</span>
                <input type="time" value={publishTime} onChange={e => setPublishTime(e.target.value)}
                  style={{ padding: "10px 14px 10px 40px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, color: textPrimary, background: cardBg, outline: "none", fontFamily: "inherit" }} />
              </div>
            </div>

            {/* ── 구분선 ── */}
            <hr style={{ border: "none", borderTop: `1px solid ${border}`, margin: "0 0 24px 0" }} />

            {/* ── 섹션 ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: textPrimary, minWidth: 80 }}>섹션</label>
              <select value={section1} onChange={e => { setSection1(e.target.value); setSection2(""); }}
                style={{ width: 180, padding: "8px 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, color: textPrimary, background: cardBg, outline: "none", fontFamily: "inherit", cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
                <option value="" disabled style={{ color: textMuted }}>1차섹션 선택</option>
                <option value="우리동네부동산">우리동네부동산</option>
                <option value="뉴스/칼럼">뉴스/칼럼</option>
              </select>
              <select value={section2} onChange={e => setSection2(e.target.value)}
                style={{ width: 180, padding: "8px 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, color: textPrimary, background: cardBg, outline: "none", fontFamily: "inherit", cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
                <option value="" disabled style={{ color: textMuted }}>2차섹션 전체</option>
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
              <select value={series} onChange={e => setSeries(e.target.value)}
                style={{ width: 180, padding: "8px 12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, color: textPrimary, background: cardBg, outline: "none", fontFamily: "inherit", cursor: "pointer", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
                <option value="" disabled style={{ color: textMuted }}>연재</option>
              </select>
            </div>

            {/* ── 기자명 ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: textPrimary, minWidth: 80 }}>기자명</label>
              <input type="text" value={reporterName} onChange={e => setReporterName(e.target.value)}
                style={{ width: 140, padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, color: textPrimary, background: cardBg, outline: "none", fontFamily: "inherit" }} />
              <input type="email" value={reporterEmail} onChange={e => setReporterEmail(e.target.value)}
                style={{ flex: 1, padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, color: textPrimary, background: cardBg, outline: "none", fontFamily: "inherit" }} />
            </div>

            {/* ── 구분선 ── */}
            <hr style={{ border: "none", borderTop: `1px solid ${border}`, margin: "0 0 24px 0" }} />

            {/* ── 제목 ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: textPrimary, minWidth: 80 }}>제목</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="제목을 입력하세요"
                style={{ flex: 1, padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, color: textPrimary, background: cardBg, outline: "none", fontFamily: "inherit" }} />
            </div>

            {/* ── 부제목 ── */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: textPrimary, minWidth: 80, paddingTop: 10 }}>부제목</label>
              <textarea value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="부제목을 입력하세요(여러 줄 입력도 가능합니다.)" rows={3}
                style={{ flex: 1, padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, color: textPrimary, background: cardBg, outline: "none", fontFamily: "inherit", resize: "vertical", lineHeight: 1.6 }} />
            </div>

            {/* ── 구분선 ── */}
            <hr style={{ border: "none", borderTop: `1px solid ${border}`, margin: "0 0 0 0" }} />

            {/* ── 에디터 툴바 ── */}
            {/* ── 에디터 툴바 ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "8px 12px", borderBottom: `1px solid ${border}`, background: "#fafafa", flexWrap: "wrap" }}>
              {/* 폰트 */}
              <select onChange={(e) => { document.execCommand('fontName', false, e.target.value); editorRef.current?.focus(); }} style={{ padding: "6px 8px", border: `1px solid ${border}`, borderRadius: 4, fontSize: 13, color: textPrimary, background: cardBg, cursor: "pointer", fontFamily: "inherit" }}>
                <option value="sans-serif">sans-serif</option>
                <option value="serif">serif</option>
                <option value="monospace">monospace</option>
              </select>
              {/* 크기 (실제로는 1~7 크기를 사용) */}
              <select onChange={(e) => { document.execCommand('fontSize', false, e.target.value); editorRef.current?.focus(); }} defaultValue="3" style={{ padding: "6px 8px", border: `1px solid ${border}`, borderRadius: 4, fontSize: 13, color: textPrimary, background: cardBg, cursor: "pointer", marginLeft: 4 }}>
                <option value="2">12</option>
                <option value="3">14</option>
                <option value="4">16</option>
                <option value="5">18</option>
                <option value="6">20</option>
                <option value="7">24</option>
              </select>
              <div style={{ width: 1, height: 20, background: border, margin: "0 6px" }} />
              
              {/* B I U S */}
              <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('bold', false); }} style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", fontSize: 14, fontWeight: 800, color: textPrimary, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>B</button>
              <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('italic', false); }} style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", fontSize: 14, fontStyle: "italic", color: textPrimary, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>I</button>
              <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('underline', false); }} style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", fontSize: 14, textDecoration: "underline", color: textPrimary, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>U</button>
              {/* 취소선 */}
              <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('strikeThrough', false); }} style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", fontSize: 14, color: textPrimary, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "line-through" }}>S</button>
              {/* 지우개 */}
              <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('removeFormat', false); }} title="서식 지우기" style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="2"><path d="M20 20H7L3 16l10-10 7 7-6 7"/><path d="M6 11l7 7"/></svg>
              </button>
              
              <div style={{ width: 1, height: 20, background: border, margin: "0 6px" }} />
              
              {/* 글자색 A▼ */}
              <label title="글자색" style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", fontSize: 15, fontWeight: 800, color: textPrimary, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <span onMouseDown={e => e.preventDefault()}>A<span style={{ fontSize: 8, marginLeft: 1 }}>▼</span></span>
                <input type="color" onChange={e => { document.execCommand('foreColor', false, e.target.value); editorRef.current?.focus(); }} style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer" }} />
              </label>
              {/* 배경색 A▼ */}
              <label title="배경색" style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", fontSize: 15, fontWeight: 800, color: "#f59e0b", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <span onMouseDown={e => e.preventDefault()}>A<span style={{ fontSize: 8, marginLeft: 1, color: textSecondary }}>▼</span></span>
                <input type="color" onChange={e => { document.execCommand('hiliteColor', false, e.target.value); editorRef.current?.focus(); }} style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer" }} />
              </label>
              
              <div style={{ width: 1, height: 20, background: border, margin: "0 6px" }} />
              
              {/* 정렬 셀렉트 */}
              <select onChange={e => { document.execCommand(e.target.value, false); editorRef.current?.focus(); }} defaultValue="" title="텍스트 정렬" style={{ padding: "6px 8px", border: `1px solid ${border}`, borderRadius: 4, fontSize: 13, color: textPrimary, background: cardBg, cursor: "pointer" }}>
                <option value="" disabled hidden>정렬</option>
                <option value="justifyLeft">왼쪽</option>
                <option value="justifyCenter">가운데</option>
                <option value="justifyRight">오른쪽</option>
                <option value="justifyFull">양쪽</option>
              </select>
              
              {/* 링크 */}
              <button type="button" onMouseDown={e => {
                e.preventDefault();
                const url = prompt("연결할 링크의 URL을 입력하세요 (예: https://gongsil.com):", "https://");
                if (url) document.execCommand('createLink', false, url);
              }} title="링크 삽입" style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 4 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </button>
            </div>

            {/* ── 에디터 본문 영역 ── */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              style={{
                minHeight: 360, padding: "20px 16px", border: `1px solid ${border}`, borderTop: "none",
                fontSize: 15, lineHeight: 1.8, color: textPrimary, outline: "none", background: cardBg,
                borderBottomLeftRadius: 6, borderBottomRightRadius: 6,
              }}
              onInput={(e) => setContent(e.currentTarget.innerHTML || "")}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.classList.contains('editor-media-delete')) {
                  e.preventDefault();
                  e.stopPropagation();
                  const wrapper = target.closest('.inserted-photo, .inserted-video') as HTMLElement;
                  if (wrapper) {
                    const nextSib = wrapper.nextSibling;
                    if (nextSib && nextSib.nodeName === 'BR') nextSib.remove();
                    wrapper.remove();
                    if (editorRef.current) setContent(editorRef.current.innerHTML || '');
                    syncSidebarFromEditor();
                  }
                }
              }}
              onMouseUp={saveSelection}
              onKeyUp={saveSelection}
              onFocus={saveSelection}
              onPaste={(e) => {
                e.preventDefault();
                const text = e.clipboardData.getData("text/plain");
                document.execCommand("insertText", false, text);
              }}
            />

            {/* ── 구분선 ── */}
            <hr style={{ border: "none", borderTop: `1px solid ${border}`, margin: "28px 0 24px 0" }} />

            {/* ── 키워드 ── */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: textPrimary, minWidth: 80, paddingTop: 10 }}>키워드</label>
              <div style={{ flex: 1 }}>
                {keywords.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {keywords.map((kw, idx) => (
                      <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "#f3f4f6", borderRadius: 20, fontSize: 13, color: textPrimary }}>
                        #{kw}
                        <button onClick={() => removeKeyword(idx)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 12, color: textMuted, padding: 0, lineHeight: 1 }}>✕</button>
                      </span>
                    ))}
                  </div>
                )}
                <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={handleKeywordAdd}
                  onPaste={(e) => {
                    const pastedData = e.clipboardData.getData("text");
                    // 여러 단어나 #, 콤마가 포함된 경우 복붙 즉시 자동 분할 (엔터 없이도)
                    if (/[,#\s]/.test(pastedData)) {
                       e.preventDefault();
                       const pastedKeywords = pastedData.split(/[,#\s]+/).map(k => k.trim()).filter(k => k);
                       setKeywords(prev => [...prev, ...pastedKeywords]);
                    }
                  }}
                  placeholder="키워드 입력 후 엔터 (#, 콤마, 띄어쓰기로 여러 개 붙여넣기 가능)"
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, color: textPrimary, background: cardBg, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
            </div>

            {/* ── 구분선 ── */}
            <hr style={{ border: "none", borderTop: `1px solid ${border}`, margin: "0 0 24px 0" }} />

            {/* ── 관련기사 ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <label style={{ fontSize: 14, fontWeight: 600, color: textPrimary, minWidth: 80 }}>관련기사</label>
                <button type="button" onClick={() => setShowRelatedArticleModal(true)} style={{ padding: "8px 14px", background: "#4b5563", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ 관련기사추가</button>
              </div>
              {relatedArticles.length > 0 && (
                <div style={{ paddingLeft: 92, display: "flex", flexDirection: "column", gap: 8 }}>
                  {relatedArticles.map((ra, idx) => (
                    <div key={ra.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: textPrimary }}>
                      <span style={{ color: textSecondary }}>ㄴ</span>
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 500 }}>{ra.title}</span>
                      <button type="button" onClick={() => {
                        setRelatedArticles(prev => prev.filter((_, i) => i !== idx));
                      }} style={{ padding: "4px 8px", background: "#fff", border: `1px solid ${border}`, borderRadius: 4, fontSize: 12, color: textSecondary, cursor: "pointer" }}>삭제</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── 구분선 ── */}
            <hr style={{ border: "none", borderTop: `1px solid ${border}`, margin: "0 0 24px 0" }} />

            {/* ── 위치등록 (레거시 공실뉴스 UI 복원) ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: textPrimary, minWidth: 80 }}>위치등록</label>
              
              <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1 }}>
                <button type="button" onClick={() => setShowMapModal(true)} style={{ padding: "0 16px", height: 40, background: "#6b7280", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                  지도검색
                </button>
                
                <input type="text" value={articleCoords ? `${articleCoords.lat.toFixed(6)}, ${articleCoords.lng.toFixed(6)}` : ''} 
                  onChange={e => {
                    const parts = e.target.value.split(',').map(s => parseFloat(s.trim()));
                    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                      setArticleCoords({ lat: parts[0], lng: parts[1] });
                    } else if (e.target.value === '') {
                      setArticleCoords(null);
                    }
                  }}
                  placeholder="예: 37.490416, 127.518709"
                  style={{ width: 240, padding: "0 14px", height: 40, border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, color: textPrimary, background: "#f9fafb", outline: "none", fontFamily: "inherit" }} />
                
                <button type="button" onClick={() => alert("카카오맵 지도검색 버튼을 눌러 위치를 누르면 자동으로 입력됩니다!\n직접 입력 시: 위도, 경도 순으로 입력하세요.")} style={{ padding: "0 16px", height: 40, background: "#9ca3af", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
                  #위도 경도 넣는법
                </button>
              </div>
            </div>

            {/* ── 저장완료 버튼 영역 (권한 분기) ── */}
            {currentUserRole === 'ADMIN' ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" disabled={saving} onClick={async () => { setStatus('APPROVED'); await handleSave('APPROVED'); }}
                  style={{ flex: 1, padding: "16px 0", background: saving ? "#9ca3af" : "#10b981", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "⏳ 처리 중..." : "✓ 승인 (바로 발행)"}
                </button>
                <button type="button" disabled={saving} onClick={() => { setRejectReason(REJECT_REASONS[0]); setShowRejectModal(true); }}
                  style={{ flex: 1, padding: "16px 0", background: saving ? "#9ca3af" : "#ef4444", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                  반려 (보류)
                </button>
                <button type="button" disabled={saving} onClick={() => handleSave()}
                  style={{ flex: 1, padding: "16px 0", background: saving ? "#9ca3af" : "#4b5563", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                  수정저장
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" disabled={saving} onClick={async () => { setStatus('DRAFT'); await handleSave('DRAFT'); }}
                  style={{ flex: 1, padding: "16px 0", background: saving ? "#9ca3af" : "#6b7280", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                  임시저장 (작성중)
                </button>
                <button type="button" disabled={saving} onClick={async () => { setStatus('PENDING'); await handleSave('PENDING'); }}
                  style={{ flex: 1, padding: "16px 0", background: saving ? "#9ca3af" : accentBlue, color: "#fff", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
                  onMouseOver={e => { if (!saving) e.currentTarget.style.background = "#2563eb"; }}
                  onMouseOut={e => { if (!saving) e.currentTarget.style.background = accentBlue; }}>
                  {saving ? "⏳ 저장 중..." : "✓ 승인신청"}
                </button>
              </div>
            )}
          </div>
        </main>

        {/* ═══ 우측 사이드바: 라이브러리 ═══ */}
        <aside style={{ width: 280, minWidth: 280, position: "sticky", top: 80, flexShrink: 0 }}>
          <div style={{ background: cardBg, borderRadius: 12, border: `1px solid ${border}`, padding: "20px 18px" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: textPrimary, margin: "0 0 16px 0" }}>라이브러리</h3>

            {/* 포토DB 간편검색 */}
            <form onSubmit={handlePhotoDbSearch} style={{ position: "relative", marginBottom: 20 }}>
              <input type="text" placeholder="포토DB 간편검색"
                value={photoDbSearch} onChange={e => setPhotoDbSearch(e.target.value)}
                onClick={openPhotoDbModal}
                style={{ width: "100%", padding: "10px 36px 10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, color: textPrimary, background: cardBg, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
              <button type="button" onClick={openPhotoDbModal} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </button>
            </form>

            {/* ── 사진 섹션 ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>사진</span>
                <button onClick={() => setPhotoCollapsed(!photoCollapsed)} style={{ width: 24, height: 24, border: `1px solid ${border}`, borderRadius: 4, background: cardBg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: textMuted }}>
                  {photoCollapsed ? "+" : "−"}
                </button>
              </div>
              {!photoCollapsed && (
                <>
                  <input type="file" id="photo-upload" accept="image/*" multiple hidden
                    onChange={e => handlePhotoSelect(e.target.files)} />
                  <div 
                    onClick={() => document.getElementById('photo-upload')?.click()}
                    onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#3b82f6'; }}
                    onDragLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; }}
                    onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#d1d5db'; handlePhotoSelect(e.dataTransfer.files); }}
                    style={{
                      border: `2px dashed #d1d5db`, borderRadius: 8, padding: "18px 16px",
                      textAlign: "center", color: textMuted, fontSize: 12, lineHeight: 1.6, cursor: "pointer",
                      background: "#fdfdfd", transition: "border-color 0.2s",
                    }}>
                    📷 마우스로 이미지를 끌어오거나, 클릭해주세요.<br />
                    <span style={{ fontSize: 11, color: "#b0b0b0" }}>(WebP 자동 압축 · 허용용량 10MB)</span>
                  </div>
                  {photoFiles.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                      {photoFiles.map((p, i) => (
                        <div key={i} style={{
                          background: "#f9fafb", borderRadius: 8,
                          border: p.isCover ? "2px solid #3b82f6" : `1px solid ${border}`,
                          overflow: "hidden", transition: "border-color 0.2s",
                        }}>
                          {/* 썸네일 + 삭제/대표 버튼 */}
                          <div style={{ position: "relative" }}>
                            <img src={p.preview} alt="" style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
                            {/* 대표 라벨 */}
                            {p.isCover && (
                              <div style={{
                                position: "absolute", top: 6, left: 6, padding: "2px 8px",
                                background: "rgba(59,130,246,0.9)", color: "#fff", fontSize: 10, fontWeight: 700,
                                borderRadius: 4,
                              }}>대표</div>
                            )}
                            {/* 삭제 버튼 */}
                            <button type="button" onClick={() => removePhoto(i)}
                              style={{
                                position: "absolute", top: 5, right: 5, width: 20, height: 20,
                                background: "rgba(0,0,0,0.55)", color: "#fff", border: "none", borderRadius: "50%",
                                fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                              }}>✕</button>
                          </div>

                          {/* 정렬 버튼 + 설정 버튼 */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", gap: 4 }}>
                            {/* 좌/중앙/우 정렬 버튼 */}
                            <div style={{ display: "flex", gap: 2 }}>
                              {([{ k: 'left' as const, icon: '◧', tip: '좌측' }, { k: 'center' as const, icon: '▣', tip: '중앙' }, { k: 'right' as const, icon: '◨', tip: '우측' }]).map(({ k, icon, tip }) => (
                                <button key={k} type="button" title={tip}
                                  onClick={() => updatePhotoAlign(i, k)}
                                  style={{
                                    width: 28, height: 26, borderRadius: 4, fontSize: 14, cursor: "pointer",
                                    border: p.align === k ? "2px solid #3b82f6" : `1px solid ${border}`,
                                    background: p.align === k ? "#dbeafe" : "#fff",
                                    color: p.align === k ? "#3b82f6" : textMuted,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    transition: "all 0.12s",
                                  }}>{icon}</button>
                              ))}
                            </div>

                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                              {!p.isCover && (
                                <button type="button" onClick={() => setAsCover(i)}
                                  style={{ padding: "2px 6px", background: "#e5e7eb", color: textSecondary, border: "none", borderRadius: 3, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>대표지정</button>
                              )}
                              {/* 설정 버튼 */}
                              <button type="button" onClick={() => openEditPhotoModal(i)}
                                title="사진 설정"
                                style={{
                                  width: 26, height: 26, borderRadius: 4, cursor: "pointer",
                                  border: `1px solid ${border}`, background: "#fff",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  color: textSecondary, fontSize: 14,
                                }}>⚙</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── 영상 섹션 ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>영상</span>
                <button onClick={() => setVideoCollapsed(!videoCollapsed)} style={{ width: 24, height: 24, border: `1px solid ${border}`, borderRadius: 4, background: cardBg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: textMuted }}>
                  {videoCollapsed ? "+" : "−"}
                </button>
              </div>
              {!videoCollapsed && (
                <div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <input type="text" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)}
                      placeholder="YouTube영상링크입력"
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddVideo(); } }}
                      style={{ flex: 1, padding: "8px 10px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 12, color: textPrimary, background: cardBg, outline: "none", fontFamily: "inherit" }} />
                    <button onClick={handleAddVideo}
                      style={{ padding: "8px 12px", background: "#374151", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>입력하기</button>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: textSecondary, cursor: "pointer", marginBottom: 8 }}>
                    <input type="checkbox" checked={isShortsRatio} onChange={e => setIsShortsRatio(e.target.checked)} style={{ accentColor: accentBlue }} />
                    쇼츠(세로) 영상으로 크기 맞춤
                  </label>

                  {/* 등록된 영상 목록 */}
                  {videoItems.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {videoItems.map((v, i) => (
                        <div key={i} style={{
                          background: '#f9fafb', borderRadius: 8,
                          border: v.isCover ? '2px solid #3b82f6' : `1px solid ${border}`,
                          overflow: 'hidden', transition: 'border-color 0.2s',
                        }}>
                          {/* 썸네일 */}
                          <div style={{ position: 'relative' }}>
                            <img src={getYoutubeThumbnail(v.videoId)} alt=""
                              style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                            {/* 재생 아이콘 */}
                            <div style={{
                              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                              width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.6)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><polygon points="6 3 20 12 6 21" /></svg>
                            </div>
                            {/* 삭제 버튼 */}
                            <button type="button" onClick={() => removeVideo(i)}
                              style={{
                                position: 'absolute', top: 4, right: 4, width: 20, height: 20,
                                background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%',
                                fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>✕</button>
                            {/* 대표 라벨 */}
                            {v.isCover && (
                              <div style={{
                                position: 'absolute', top: 6, left: 6, padding: '2px 8px',
                                background: 'rgba(59,130,246,0.9)', color: '#fff', fontSize: 10, fontWeight: 700,
                                borderRadius: 4,
                              }}>대표</div>
                            )}
                          </div>
                          {/* 버튼 영역 */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px' }}>
                            <button type="button" onClick={() => reinsertVideo(i)}
                              style={{
                                padding: '3px 10px', background: '#e5e7eb', color: textSecondary, border: 'none',
                                borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 4,
                              }}>□ 삽입</button>
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                              {!v.isCover && (
                                <button type="button" onClick={() => setVideoCover(i)}
                                  style={{ padding: '2px 6px', background: '#e5e7eb', color: textSecondary, border: 'none', borderRadius: 3, fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>대표지정</button>
                              )}
                              <button type="button" onClick={() => openEditVideoModal(i)}
                                title="영상 설정"
                                style={{
                                  width: 26, height: 26, borderRadius: 4, cursor: 'pointer',
                                  border: `1px solid ${border}`, background: '#fff',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: textSecondary, fontSize: 14,
                                }}>⚙</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── 파일 섹션 ── */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>파일</span>
                <button onClick={() => setFileCollapsed(!fileCollapsed)} style={{ width: 24, height: 24, border: `1px solid ${border}`, borderRadius: 4, background: cardBg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: textMuted }}>
                  {fileCollapsed ? "+" : "−"}
                </button>
              </div>
              {!fileCollapsed && (
                <>
                  <input type="file" id="file-upload" multiple hidden
                    onChange={e => handleFileSelect(e.target.files)} />
                  <div 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#3b82f6'; }}
                    onDragLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; }}
                    onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#d1d5db'; handleFileSelect(e.dataTransfer.files); }}
                    style={{
                      border: `2px dashed #d1d5db`, borderRadius: 8, padding: "18px 16px",
                      textAlign: "center", color: textMuted, fontSize: 12, lineHeight: 1.6, cursor: "pointer",
                      background: "#fdfdfd", transition: "border-color 0.2s",
                    }}>
                    📎 마우스로 파일을 끌어오거나, 클릭해주세요.<br />
                    <span style={{ fontSize: 11, color: "#b0b0b0" }}>(허용용량 2MB)</span>
                  </div>
                  {attachFiles.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      {attachFiles.map((f, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", fontSize: 12, color: textSecondary }}>
                          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📄 {f.name}</span>
                          <button type="button" onClick={() => removeFile(i)}
                            style={{ background: "none", border: "none", color: "#ef4444", fontSize: 11, cursor: "pointer" }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
        </aside>

      </div>

      {/* ═══ 사진추가 모달 ═══ */}
      {showPhotoModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.45)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowPhotoModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 14, width: 540, maxHeight: '85vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}>
            {/* 헤더 */}
            <div style={{
              background: '#3b82f6', color: '#fff', padding: '16px 24px',
              borderRadius: '14px 14px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 17, fontWeight: 800 }}>사진추가</span>
              <button onClick={() => setShowPhotoModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            {/* 바디 */}
            <div style={{ padding: '24px 28px' }}>
              {/* 선택 */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 80, paddingTop: 8 }}>선택</label>
                <div style={{ flex: 1 }}>
                  <input type="file" ref={modalFileRef} accept="image/*" hidden onChange={e => handleModalFileSelect(e.target.files)} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={() => modalFileRef.current?.click()} style={{
                      padding: '8px 16px', background: '#f3f4f6', border: `1px solid ${border}`, borderRadius: 6,
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', color: textPrimary,
                    }}>파일 선택</button>
                    <span style={{ fontSize: 13, color: modalFile ? textPrimary : textMuted }}>
                      {modalFile ? modalFile.name : '선택된 파일 없음'}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#f59e0b', margin: '8px 0 0 0' }}>⚠ 허용용량 (10 Mb) / 이미지 파일(jpg, gif, png)</p>
                  {modalPreview && (
                    <div style={{ marginTop: 12, borderRadius: 8, overflow: 'hidden', border: `1px solid ${border}`, maxWidth: 200 }}>
                      <img src={modalPreview} alt="미리보기" style={{ width: '100%', height: 'auto', display: 'block' }} />
                    </div>
                  )}
                </div>
              </div>

              {/* 기준크기 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 80 }}>기준크기</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[180, 250, 600, 960, 1280].map(s => (
                    <button key={s} onClick={() => setModalSize(s)} style={{
                      padding: '7px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      border: modalSize === s ? '2px solid #3b82f6' : `1px solid ${border}`,
                      background: modalSize === s ? '#1e3a5f' : '#fff',
                      color: modalSize === s ? '#fff' : textPrimary,
                      transition: 'all 0.15s',
                    }}>{s}px</button>
                  ))}
                </div>
              </div>

              {/* 삽입방식 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 80 }}>삽입방식</label>
                <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 6, padding: 3 }}>
                  {(['자동', '수동'] as const).map(m => (
                    <button key={m} onClick={() => setModalInsertMode(m)} style={{
                      padding: '7px 18px', border: 'none', borderRadius: 5, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      background: modalInsertMode === m ? '#1e3a5f' : 'transparent',
                      color: modalInsertMode === m ? '#fff' : textSecondary,
                      transition: 'all 0.15s',
                    }}>{m}</button>
                  ))}
                </div>
              </div>

              {/* 삽입위치 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 80 }}>삽입위치</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {([{ k: 'left' as const, icon: '◧' }, { k: 'center' as const, icon: '▣' }, { k: 'right' as const, icon: '◨' }]).map(({ k, icon }) => (
                    <button key={k} onClick={() => setModalAlign(k)} style={{
                      width: 38, height: 38, borderRadius: 6, fontSize: 18, cursor: 'pointer',
                      border: modalAlign === k ? '2px solid #3b82f6' : `1px solid ${border}`,
                      background: modalAlign === k ? '#1e3a5f' : '#fff',
                      color: modalAlign === k ? '#fff' : textSecondary,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>{icon}</button>
                  ))}
                </div>
              </div>

              {/* 워터마크 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 80 }}>워터마크</label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {Array.from({ length: 9 }, (_, i) => (
                    <button key={i} onClick={() => setModalWatermark(i)} style={{
                      width: 34, height: 34, borderRadius: 5, cursor: 'pointer',
                      border: modalWatermark === i ? '2px solid #3b82f6' : `1px solid ${border}`,
                      background: modalWatermark === i ? '#dbeafe' : '#f0fdf4',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={modalWatermark === i ? '#3b82f6' : '#6b7280'} strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        {i === 0 && <circle cx="8" cy="8" r="2" fill={modalWatermark === i ? '#3b82f6' : '#6b7280'}/>}
                        {i === 1 && <circle cx="12" cy="8" r="2" fill={modalWatermark === i ? '#3b82f6' : '#6b7280'}/>}
                        {i === 2 && <circle cx="16" cy="8" r="2" fill={modalWatermark === i ? '#3b82f6' : '#6b7280'}/>}
                        {i === 3 && <circle cx="8" cy="12" r="2" fill={modalWatermark === i ? '#3b82f6' : '#6b7280'}/>}
                        {i === 4 && <circle cx="12" cy="12" r="2" fill={modalWatermark === i ? '#3b82f6' : '#6b7280'}/>}
                        {i === 5 && <circle cx="16" cy="12" r="2" fill={modalWatermark === i ? '#3b82f6' : '#6b7280'}/>}
                        {i === 6 && <circle cx="8" cy="16" r="2" fill={modalWatermark === i ? '#3b82f6' : '#6b7280'}/>}
                        {i === 7 && <circle cx="12" cy="16" r="2" fill={modalWatermark === i ? '#3b82f6' : '#6b7280'}/>}
                        {i === 8 && <circle cx="16" cy="16" r="2" fill={modalWatermark === i ? '#3b82f6' : '#6b7280'}/>}
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              {/* 설명 (캡션) */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 80, paddingTop: 8 }}>설명 <span style={{ fontWeight: 400, color: textMuted }}>(캡션)</span></label>
                <textarea value={modalCaption} onChange={e => setModalCaption(e.target.value)}
                  placeholder="사진설명입력"
                  rows={3}
                  style={{
                    flex: 1, padding: '10px 14px', border: `1px solid ${border}`, borderRadius: 8,
                    fontSize: 14, color: textPrimary, background: '#fafafa', outline: 'none',
                    fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.6,
                  }}
                />
              </div>

              {/* 캡션정렬 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 80 }}>캡션정렬</label>
                <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 6, padding: 3 }}>
                  {([{ k: 'left' as const, label: '좌측' }, { k: 'center' as const, label: '중앙' }, { k: 'right' as const, label: '우측' }]).map(({ k, label }) => (
                    <button key={k} onClick={() => setModalCaptionAlign(k)} style={{
                      padding: '7px 18px', border: 'none', borderRadius: 5, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      background: modalCaptionAlign === k ? '#1e3a5f' : 'transparent',
                      color: modalCaptionAlign === k ? '#fff' : textSecondary,
                      transition: 'all 0.15s',
                    }}>{label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* 푸터 버튼 */}
            <div style={{ padding: '16px 28px 24px', display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button onClick={handlePhotoModalConfirm} style={{
                padding: '12px 36px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 2px 8px rgba(59,130,246,0.3)', transition: 'background 0.15s',
              }}
              onMouseOver={e => e.currentTarget.style.background = '#2563eb'}
              onMouseOut={e => e.currentTarget.style.background = '#3b82f6'}
              >✓ 확인</button>
              <button onClick={() => setShowPhotoModal(false)} style={{
                padding: '12px 36px', background: '#fff', color: textPrimary, border: `1px solid ${border}`, borderRadius: 8,
                fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}>✕ 취소</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 사진수정 모달 ═══ */}
      {showEditModal && editPhotoIdx >= 0 && photoFiles[editPhotoIdx] && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.45)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowEditModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 14, width: 540, maxHeight: '85vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}>
            {/* 헤더 */}
            <div style={{
              background: '#374151', color: '#fff', padding: '16px 24px',
              borderRadius: '14px 14px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 17, fontWeight: 800 }}>사진수정</span>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            {/* 바디 */}
            <div style={{ padding: '24px 28px' }}>
              {/* 선택 (미리보기) */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 80, paddingTop: 8 }}>선택</label>
                <div style={{ flex: 1 }}>
                  <div style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${border}`, background: '#f9fafb', textAlign: 'center', padding: 16 }}>
                    <img src={photoFiles[editPhotoIdx].preview} alt="미리보기"
                      style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 6, objectFit: 'contain' }} />
                  </div>
                  <p style={{ fontSize: 12, color: textMuted, margin: '6px 0 0 0' }}>
                    {photoFiles[editPhotoIdx].file ? `${photoFiles[editPhotoIdx].file?.name} (${((photoFiles[editPhotoIdx].file?.size || 0) / 1024).toFixed(0)}KB)` : '기존 업로드 사진'}
                  </p>
                </div>
              </div>

              {/* 기준크기 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 80 }}>기준크기</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[180, 250, 600, 960, 1280].map(s => (
                    <button key={s} onClick={() => setEditSize(s)} style={{
                      padding: '7px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      border: editSize === s ? '2px solid #3b82f6' : `1px solid ${border}`,
                      background: editSize === s ? '#1e3a5f' : '#fff',
                      color: editSize === s ? '#fff' : textPrimary,
                      transition: 'all 0.15s',
                    }}>{s}px</button>
                  ))}
                </div>
              </div>

              {/* 삽입방식 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 80 }}>삽입방식</label>
                <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 6, padding: 3 }}>
                  {(['자동', '수동'] as const).map(m => (
                    <button key={m} onClick={() => setEditInsertMode(m)} style={{
                      padding: '7px 18px', border: 'none', borderRadius: 5, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      background: editInsertMode === m ? '#1e3a5f' : 'transparent',
                      color: editInsertMode === m ? '#fff' : textSecondary,
                      transition: 'all 0.15s',
                    }}>{m}</button>
                  ))}
                </div>
              </div>

              {/* 삽입위치 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 80 }}>삽입위치</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {([{ k: 'left' as const, icon: '◧' }, { k: 'center' as const, icon: '▣' }, { k: 'right' as const, icon: '◨' }]).map(({ k, icon }) => (
                    <button key={k} onClick={() => setEditAlign(k)} style={{
                      width: 38, height: 38, borderRadius: 6, fontSize: 18, cursor: 'pointer',
                      border: editAlign === k ? '2px solid #3b82f6' : `1px solid ${border}`,
                      background: editAlign === k ? '#1e3a5f' : '#fff',
                      color: editAlign === k ? '#fff' : textSecondary,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>{icon}</button>
                  ))}
                </div>
              </div>

              {/* 설명 (캡션) */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 80, paddingTop: 8 }}>설명 <span style={{ fontWeight: 400, color: textMuted }}>(캡션)</span></label>
                <textarea value={editCaption} onChange={e => setEditCaption(e.target.value)}
                  placeholder="사진설명입력"
                  rows={3}
                  style={{
                    flex: 1, padding: '10px 14px', border: `1px solid ${border}`, borderRadius: 8,
                    fontSize: 14, color: textPrimary, background: '#fafafa', outline: 'none',
                    fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.6,
                  }}
                />
              </div>

              {/* 캡션정렬 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 80 }}>캡션정렬</label>
                <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 6, padding: 3 }}>
                  {([{ k: 'left' as const, label: '좌측' }, { k: 'center' as const, label: '중앙' }, { k: 'right' as const, label: '우측' }]).map(({ k, label }) => (
                    <button key={k} onClick={() => setEditCaptionAlign(k)} style={{
                      padding: '7px 18px', border: 'none', borderRadius: 5, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      background: editCaptionAlign === k ? '#1e3a5f' : 'transparent',
                      color: editCaptionAlign === k ? '#fff' : textSecondary,
                      transition: 'all 0.15s',
                    }}>{label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* 푸터 버튼 */}
            <div style={{ padding: '16px 28px 24px', display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button onClick={handleEditPhotoConfirm} style={{
                padding: '12px 36px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 2px 8px rgba(59,130,246,0.3)', transition: 'background 0.15s',
              }}
              onMouseOver={e => e.currentTarget.style.background = '#2563eb'}
              onMouseOut={e => e.currentTarget.style.background = '#3b82f6'}
              >✓ 확인</button>
              <button onClick={() => setShowEditModal(false)} style={{
                padding: '12px 36px', background: '#fff', color: textPrimary, border: `1px solid ${border}`, borderRadius: 8,
                fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}>✕ 취소</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 동영상추가/수정 모달 ═══ */}
      {showVideoEditModal && editVideoIdx >= 0 && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.45)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowVideoEditModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 14, width: 520, maxHeight: '80vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}>
            {/* 헤더 */}
            <div style={{
              background: '#374151', color: '#fff', padding: '16px 24px',
              borderRadius: '14px 14px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 17, fontWeight: 800 }}>동영상추가</span>
              <button onClick={() => setShowVideoEditModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            {/* 바디 */}
            <div style={{ padding: '28px 28px' }}>
              {/* 영상URL/태그 */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 90, paddingTop: 10 }}>영상URL/태그</label>
                <textarea value={editVideoUrl} onChange={e => setEditVideoUrl(e.target.value)}
                  placeholder="https://youtu.be/..."
                  rows={3}
                  style={{
                    flex: 1, padding: '10px 14px', border: `1px solid ${border}`, borderRadius: 8,
                    fontSize: 14, color: textPrimary, background: '#fafafa', outline: 'none',
                    fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.6,
                  }}
                />
              </div>

              {/* 미리보기 */}
              {editVideoUrl && extractYoutubeId(editVideoUrl) && (
                <div style={{ marginBottom: 24, textAlign: 'center' }}>
                  <img src={getYoutubeThumbnail(extractYoutubeId(editVideoUrl)!)} alt="미리보기"
                    style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8, border: `1px solid ${border}` }} />
                </div>
              )}

              {/* 캡션 */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 8 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: textPrimary, minWidth: 90, paddingTop: 10 }}>캡션</label>
                <textarea value={editVideoCaption} onChange={e => setEditVideoCaption(e.target.value)}
                  placeholder="동영상설명입력"
                  rows={3}
                  style={{
                    flex: 1, padding: '10px 14px', border: `1px solid ${border}`, borderRadius: 8,
                    fontSize: 14, color: textPrimary, background: '#fafafa', outline: 'none',
                    fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.6,
                  }}
                />
              </div>
            </div>

            {/* 푸터 버튼 */}
            <div style={{ padding: '16px 28px 24px', display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button onClick={handleEditVideoConfirm} style={{
                padding: '12px 36px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 2px 8px rgba(59,130,246,0.3)', transition: 'background 0.15s',
              }}
              onMouseOver={e => e.currentTarget.style.background = '#2563eb'}
              onMouseOut={e => e.currentTarget.style.background = '#3b82f6'}
              >✓ 확인</button>
              <button onClick={() => setShowVideoEditModal(false)} style={{
                padding: '12px 36px', background: '#fff', color: textPrimary, border: `1px solid ${border}`, borderRadius: 8,
                fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}>✕ 취소</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 포토DB 모달 ═══ */}
      {showPhotoDbModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(2px)', zIndex: 9999
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, width: 800, maxWidth: '90%', maxHeight: '90%', display: "flex", flexDirection: "column",
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)', overflow: 'hidden', animation: 'scaleUp 0.3s ease-out'
          }}>
            {/* 헤더 */}
            <div style={{ background: '#3b82f6', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🖼️</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>포토DB</span>
              </div>
              <button type="button" onClick={() => setShowPhotoDbModal(false)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            {/* 검색바 & 탭 */}
            <div style={{ padding: '20px 24px 0 24px' }}>
              <form onSubmit={handlePhotoDbSearch} style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                <input type="text" placeholder="사진 설명 또는 파일명으로 검색"
                  value={photoDbSearch} onChange={e => setPhotoDbSearch(e.target.value)}
                  style={{ flex: 1, padding: "12px 16px", border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, outline: "none" }} />
                <button type="submit" style={{ padding: "0 24px", background: "#374151", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>검색</button>
              </form>

              <div style={{ display: "flex", gap: 24, borderBottom: `1px solid ${border}` }}>
                {['전체사진', '즐겨찾기'].map(tab => (
                  <button key={tab} type="button" onClick={() => setPhotoDbTab(tab as any)}
                    style={{
                      background: "none", border: "none", borderBottom: photoDbTab === tab ? "3px solid #f97316" : "3px solid transparent",
                      padding: "8px 4px", fontSize: 15, fontWeight: photoDbTab === tab ? 800 : 600,
                      color: photoDbTab === tab ? "#f97316" : textSecondary, cursor: "pointer", transition: "all 0.2s"
                    }}>
                    {tab === '즐겨찾기' && <span style={{ color: '#f59e0b', marginRight: 4 }}>⭐</span>}
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* 메인 리스트 영역 */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", background: "#f9fafb" }}>
              {isPhotoDbLoading ? (
                <div style={{ textAlign: "center", padding: "40px", color: textMuted }}>⏳ 불러오는 중...</div>
              ) : photoDbItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: textMuted }}>저장된 사진이 없습니다.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 16 }}>
                  {photoDbItems.map(photo => (
                    <div key={photo.id} style={{ 
                      background: "#fff", borderRadius: 8, border: `1px solid ${border}`, overflow: "hidden", 
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)", cursor: "pointer", transition: "transform 0.2s"
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = "translateY(-4px)"}
                    onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
                    onClick={() => handleSelectFromPhotoDb(photo)}>
                      <div style={{ position: "relative", width: "100%", paddingTop: "100%", background: "#f3f4f6" }}>
                        <img src={photo.url} alt="" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                        {/* 즐겨찾기 별모양 버튼 */}
                        <button type="button" onClick={(e) => handleToggleFav(e, photo.id, photo.is_favorite)}
                          style={{
                            position: "absolute", top: 6, right: 6, width: 28, height: 28, background: "rgba(255,255,255,0.9)",
                            borderRadius: "50%", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.2)"
                          }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill={photo.is_favorite ? "#f59e0b" : "none"} stroke={photo.is_favorite ? "#f59e0b" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                          </svg>
                        </button>
                      </div>
                      <div style={{ padding: "8px", fontSize: 11, color: textSecondary }}>
                        <div style={{ fontWeight: 600, color: textPrimary, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{photo.filename || "무제"}</div>
                        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{photo.caption || "설명 없음"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ 지도 모달 (카카오맵) ═══ */}
      {showMapModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(2px)', zIndex: 9999
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, width: 1000, height: 750, maxWidth: '95%', maxHeight: '95%', display: "flex", flexDirection: "column",
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)', overflow: 'hidden', animation: 'scaleUp 0.3s ease-out', position: 'relative'
          }}>
            {/* 상단 오렌지 헤더 띠 */}
            <div style={{ background: '#f97316', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🗺️</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>위치 자동 입력 (카카오맵)</span>
              </div>
              <button type="button" onClick={() => setShowMapModal(false)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            {/* 검색 폼 */}
            <div style={{ padding: '16px 24px', background: '#fff', borderBottom: `1px solid ${border}` }}>
              <form onSubmit={handleMapSearch} style={{ display: "flex", gap: 10 }}>
                <input type="text" placeholder="지역명, 아파트명, 건물명 검색 (예: 강남역, 대치동 은마)"
                  value={mapSearchKw} onChange={e => setMapSearchKw(e.target.value)}
                  style={{ flex: 1, padding: "12px 16px", border: `2px solid #e5e7eb`, borderRadius: 8, fontSize: 15, outline: "none" }} />
                <button type="submit" style={{ padding: "0 32px", background: "#c2410c", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 800, cursor: "pointer" }}>지도 검색</button>
              </form>
              <div style={{ fontSize: 13, color: textSecondary, textAlign: 'center', marginTop: 12 }}>
                지도를 마우스로 클릭하시면 해당 위치의 빨간 마커와 함께 좌표가 임시 저장됩니다.
              </div>
            </div>

            {/* 지도 영역 */}
            <div ref={mapRef} style={{ flex: 1, position: 'relative', width: '100%' }}>
              {/* 지도 렌더링 컨테이너 */}
            </div>
          </div>
        </div>
      )}

      {/* ═══ 관련기사 검색 모달 ═══ */}
      {showRelatedArticleModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(2px)', zIndex: 9999
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, width: 900, height: 750, maxWidth: '95%', maxHeight: '95%', display: "flex", flexDirection: "column",
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)', overflow: 'hidden', animation: 'scaleUp 0.3s ease-out', position: 'relative'
          }}>
            {/* 헤더 */}
            <div style={{ background: '#3b4363', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>관련기사검색</span>
              <button type="button" onClick={() => setShowRelatedArticleModal(false)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            {/* 검색 폼 및 리스트 헤더 */}
            <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${border}` }}>
              <div>
                <span style={{ fontSize: 18, fontWeight: 700 }}>기사</span>
                <span style={{ fontSize: 13, color: textSecondary, marginLeft: 8 }}>(전체 {relatedArticlesDb.length}건)</span>
              </div>
              <form onSubmit={handleRelatedSearch} style={{ display: 'flex', gap: 8 }}>
                <input type="text" placeholder="기사 제목 검색 (테스트)" value={relatedArticleSearch} onChange={e => setRelatedArticleSearch(e.target.value)}
                  style={{ padding: '8px 12px', border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, minWidth: 200 }} />
                <button type="submit" style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Q 검색하기</button>
              </form>
            </div>

            {/* 리스트 본문 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
              {isRelatedArticlesLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: textSecondary }}>로딩 중...</div>
              ) : relatedArticlesDb.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: textSecondary }}>검색 결과가 없습니다.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {relatedArticlesDb.map((article) => (
                    <div key={article.id} style={{ display: 'flex', alignItems: 'flex-start', padding: '16px 0', borderBottom: `1px solid ${border}`, gap: 16 }}>
                      <input type="checkbox" style={{ marginTop: 4, transform: 'scale(1.2)' }}
                        checked={relatedArticles.some(a => a.id === article.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleSelectRelatedArticle(article);
                          } else {
                            setRelatedArticles(prev => prev.filter(a => a.id !== article.id));
                          }
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>{article.title}</div>
                        <div style={{ fontSize: 13, color: textSecondary, display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span>{article.section1 || '분류없음'}</span>
                          <span style={{ color: '#d1d5db' }}>|</span>
                          <span>{article.author_name || '관리자'}</span>
                          <span style={{ color: '#d1d5db' }}>|</span>
                          <span>{article.published_at ? new Date(article.published_at).toISOString().substring(0, 10) : '발행일없음'}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: article.status === 'PENDING' ? '#8b5cf6' : article.status === 'DRAFT' ? '#9ca3af' : '#10b981', padding: '4px 8px', borderRadius: 4 }}>
                        {article.status === 'PENDING' ? '승인신청' : article.status === 'DRAFT' ? '미출판' : '발행됨'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* 완료 버튼 */}
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${border}`, textAlign: 'center', background: '#f9fafb' }}>
              <button type="button" onClick={() => setShowRelatedArticleModal(false)}
                style={{ padding: '12px 32px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>선택 완료</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 반려 사유 모달 ===== */}
      {showRejectModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", width: 420, borderRadius: 12, padding: "24px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 18, color: textPrimary, fontWeight: 800 }}>기사 반려 사유 입력</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 13, color: textSecondary }}>작성자에게 전달할 반려 사유를 선택하거나 기입해주세요.</p>
            
            <select 
              value={REJECT_REASONS.includes(rejectReason) ? rejectReason : "기타 사유 (직접 입력)"} 
              onChange={(e) => setRejectReason(e.target.value === "기타 사유 (직접 입력)" ? "" : e.target.value)}
              style={{ width: "100%", padding: "12px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, marginBottom: 12, outline: "none", color: textPrimary, background: "#fff" }}
            >
              {REJECT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            {(!REJECT_REASONS.includes(rejectReason) || rejectReason === "기타 사유 (직접 입력)") && (
               <textarea 
                 value={rejectReason === "기타 사유 (직접 입력)" ? "" : rejectReason} 
                 onChange={e => setRejectReason(e.target.value)} 
                 placeholder="상세 반려 사유를 직접 입력하세요." 
                 style={{ width: "100%", height: 80, padding: 12, border: `1px solid ${border}`, borderRadius: 6, fontSize: 14, resize: "none", outline: "none", color: textPrimary, background: "#fff", boxSizing: "border-box" }} 
               />
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 24 }}>
              <button type="button" onClick={() => setShowRejectModal(false)} style={{ padding: "10px 18px", background: "#f3f4f6", color: "#4b5563", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>취소</button>
              <button type="button" onClick={async () => {
                setShowRejectModal(false);
                setStatus('REJECTED');
                await handleSave('REJECTED', rejectReason);
              }} style={{ padding: "10px 18px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>반려 처리</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
