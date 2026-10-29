
import React, { useState, useRef, useEffect } from 'react';
import FlyerForm from './components/FlyerForm';
import FlyerCanvas, { FlyerOrientation, PAGE_SIZE } from './components/FlyerCanvas';
// Removed geminiService import
import { FlyerState, PropertyInfo, GeneratedContent, FlyerColor, FlyerLayout, isNewLayout } from './types';
import { ArrowDownTrayIcon } from '@heroicons/react/24/solid';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { buildFlyerRows } from './flyerRows';
import { toCanvas } from 'html-to-image';
import { WebLockCover, InstallAppModal, askInstallApp, webLayoutAllowed } from './webLimit';

export const COLORS: FlyerColor[] = [
  { id: 'teal', name: 'Teal (Raemian)', primary: '#00788c', secondary: '#00c6d7', dark: '#003845' },
  { id: 'gold', name: 'Gold (Lotte)', primary: '#bfa068', secondary: '#e6cc9f', dark: '#3e301b' },
  { id: 'green', name: 'Green (Prugio)', primary: '#005f4d', secondary: '#4fb89e', dark: '#002820' },
  { id: 'burgundy', name: 'Burgundy (Hillstate)', primary: '#7c1f2d', secondary: '#ff9ea7', dark: '#380d13' },
  { id: 'orange', name: 'Orange (Acro)', primary: '#f27405', secondary: '#ffac63', dark: '#5e2609' },
];

export const LAYOUTS: FlyerLayout[] = [
  // 새 기본 디자인 (2026-10-15) — 유리창 밖에서 3초 안에 읽히게
  { id: 'big', name: '숫자 크게', type: 'big', headingFont: 'font-sans', bodyFont: 'font-sans' },
  { id: 'photo', name: '사진형', type: 'photo', headingFont: 'font-sans', bodyFont: 'font-sans' },
  // 2026-10-28 사장님이 보내 준 견본 스타일
  { id: 'board', name: '추천 걸이판', type: 'board', headingFont: 'font-sans', bodyFont: 'font-sans' },
  // 사선 사진은 목록에서 뺐다 (2026-10-29 사장님: 디자인이 별로) — 이미 만든 홍보지는 그대로 열린다
  { id: 'diagonal', name: '사선 사진', type: 'diagonal', headingFont: 'font-sans', bodyFont: 'font-sans', hidden: true },
  { id: 'split', name: '반반 사진', type: 'split', headingFont: 'font-sans', bodyFont: 'font-sans' },
  { id: 'color', name: '색 바탕', type: 'color', headingFont: 'font-sans', bodyFont: 'font-sans' },
  { id: 'frame', name: '테두리', type: 'frame', headingFont: 'font-sans', bodyFont: 'font-sans' },
  { id: 'gallery', name: '사진 갤러리', type: 'gallery', headingFont: 'font-sans', bodyFont: 'font-sans' },
  // 예전 디자인 — 이미 만든 홍보지가 그대로 열리게 남겨 둔다
  { id: 'type1', name: 'Modern Overlay', type: 'type1', headingFont: 'font-serif-kr', bodyFont: 'font-sans' },
  { id: 'type2', name: 'Luxury Center', type: 'type2', headingFont: 'font-serif-kr', bodyFont: 'font-serif-kr' },
  { id: 'type3', name: 'Natural Clean', type: 'type3', headingFont: 'font-sans', bodyFont: 'font-sans' },
  { id: 'type4', name: 'Bold Box', type: 'type4', headingFont: 'font-sans', bodyFont: 'font-sans' },
  { id: 'type5', name: 'High-end Minimal', type: 'type5', headingFont: 'font-sans', bodyFont: 'font-sans' },
  { id: 'type6', name: 'Simple 심플', type: 'type6', headingFont: 'font-sans', bodyFont: 'font-sans' },

];

// ⚠ 예시(가짜) 값을 두지 않는다 — 불러오기 전·실패했을 때도 남의 매물·가짜 중개사가 보이지 않게 (2026-10-15)

/* QR·공유 링크는 늘 실제 사이트 주소로 — 개발 PC(localhost)나 앱에서 만들어도 손님 휴대폰에서 열려야 한다 (2026-10-15) */
const SITE_ORIGIN = "https://www.gongsilnews.com";

const INITIAL_INFO: PropertyInfo = {
  promotionText: "",
  address: "",
  subTitle: "",
  transactionType: "월세",
  priceMain: "",
  priceSub: "",
  managementFee: "",
  area: "",
  floor: "",
  direction: "",
  roomCount: "",
  parking: "",
  moveInDate: "",
  options: "",
  badge: "",
  pyeong: "",
  showPhoto: true,
  sizeLine: "",
  flyerGroup: "A",
  propertyKind: "",
  rows: [],
  agentName: "",
  agentRepresentative: "",
  agentPhone: "",
  agentMobile: "",
  agentMapUrl: "",
  consultationUrl: "",
  agentAdditionalInfo: [],
  socialYoutube: "",
  socialBlog: "",
  socialInstagram: "",
  socialFacebook: "",
  socialKakao: "",
  socialThreads: "",
  noticeTitle: "",
  noticeContent: "",
  sections: []
};


const INITIAL_GENERATED: GeneratedContent = {
  promotionText: INITIAL_INFO.promotionText,
  summary: "",
};


const compressToWebP = (file: File, quality = 0.85): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1920;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context is null"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("WebP conversion failed"));
            }
          },
          "image/webp",
          quality
        );
      };
      img.onerror = (err) => reject(err);
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

/**
 * 이미지·인쇄에 폰트를 확실히 담는다 — 화면에 실제로 불러온 폰트 조각(한글 폰트는 글자 범위별로 잘게 나뉨)만 골라
 * 파일을 data URL 로 넣은 @font-face 를 만든다. html-to-image 가 스스로 담게 두면 고른 폰트(도현 등)가 빠지기도 했다.
 */
const fontDataCache = new Map<string, string>();
const normRange = (r: string) => (r || 'U+0-10FFFF').replace(/\s+/g, '').toUpperCase();
const buildFontEmbedCSS = async (): Promise<string | undefined> => {
  const loaded = new Set(
    Array.from(document.fonts || []).filter((f) => f.status === 'loaded')
      .map((f) => `${f.family.replace(/["']/g, '').trim()}|${normRange(f.unicodeRange)}|${f.weight}|${f.style}`),
  );
  const parts: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const st = rule.style;
      const fam = st.getPropertyValue('font-family').replace(/["']/g, '').trim();
      const key = `${fam}|${normRange(st.getPropertyValue('unicode-range'))}|${st.getPropertyValue('font-weight') || '400'}|${st.getPropertyValue('font-style') || 'normal'}`;
      if (!loaded.has(key)) continue;
      const src = st.getPropertyValue('src');
      const m = src.match(/url\(["']?([^"')]+)["']?\)/);
      if (!m) continue;
      const url = new URL(m[1], sheet.href || location.href).href;
      let data = fontDataCache.get(url);
      if (!data) {
        const blob = await fetch(url).then((r) => r.blob());
        data = await new Promise<string>((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result)); fr.onerror = no; fr.readAsDataURL(blob); });
        fontDataCache.set(url, data);
      }
      const ur = st.getPropertyValue('unicode-range');
      parts.push(`@font-face { font-family: "${fam}"; src: url(${data}); font-weight: ${st.getPropertyValue('font-weight') || '400'}; font-style: ${st.getPropertyValue('font-style') || 'normal'};${ur ? ` unicode-range: ${ur};` : ''} }`);
    }
  }
  return parts.length ? parts.join('\n') : undefined;
};

const uploadImageToServer = async (file: File | Blob, vacancyId: string): Promise<string> => {
  const formData = new FormData();
  const uploadFile = file instanceof File ? file : new File([file], "image.webp", { type: "image/webp" });
  formData.append("file", uploadFile);
  formData.append("vacancyId", vacancyId);

  try {
    const res = await fetch("/api/vacancy/upload-image", {
      method: "POST",
      body: formData,
    });
    
    const text = await res.text();
    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse response as JSON:", text);
      if (text.includes("<!DOCTYPE") || text.includes("<html") || res.status >= 500) {
        throw new Error("서버가 현재 일시적인 점검 중이거나 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.");
      }
      throw new Error(text.substring(0, 100) || `업로드 중 서버 오류가 발생했습니다. (상태 코드: ${res.status})`);
    }

    if (json.success && json.url) {
      return json.url;
    }
    throw new Error(json.error || "업로드에 실패했습니다.");
  } catch (err: any) {
    console.error("Upload network/server error:", err);
    throw new Error(err.message || "네트워크 연결 오류가 발생했습니다.");
  }
};

function App() {
  const [state, setState] = useState<FlyerState>({
    info: INITIAL_INFO,
    generated: INITIAL_GENERATED,
    mainImage: null,
    agentImage: null,
    colorTheme: COLORS[0],
    layoutTheme: LAYOUTS[0],
    orientation: 'portrait',
  });
  const orientation: FlyerOrientation = state.orientation === 'landscape' ? 'landscape' : 'portrait';

  const [isGenerating, setIsGenerating] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  /** QR 이 여는 매물 페이지 주소 (서버가 알려 준다) 와 그 QR 그림 */
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [vacPhotos, setVacPhotos] = useState<string[]>([]); // 이 매물 등록 사진 — 사진 여러 장 디자인용
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [showAutoSaveIndicator, setShowAutoSaveIndicator] = useState(false);
  const flyerRef = useRef<HTMLDivElement>(null);
  const hiddenFileInputRef = useRef<HTMLInputElement>(null);

  const [showSharePopover, setShowSharePopover] = useState(false);
  const sharePopoverRef = useRef<HTMLDivElement>(null);

  // 5. URL 파라미터 기반 공실 데이터 연동 로드
  const [loadingData, setLoadingData] = useState(false);
  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  /* ── 되돌리기 Ctrl+Z · 다시 하기 Ctrl+Shift+Z / Ctrl+Y (2026-10-28 사장님) ──
   * 고친 것(isDirty)만 기록한다. 끌기처럼 잇달아 바뀌는 것은 0.5초 안이면 한 번으로 묶는다. 최근 100번까지. */
  const hist = useRef<{ past: FlyerState[]; future: FlyerState[]; last: FlyerState | null; burst: ReturnType<typeof setTimeout> | null; skip: boolean }>({ past: [], future: [], last: null, burst: null, skip: false });
  useEffect(() => {
    const h = hist.current;
    if (h.skip || !isDirty) { h.skip = false; h.last = state; return; }
    if (h.last && h.last !== state) {
      if (!h.burst) {
        h.past.push(h.last);
        if (h.past.length > 100) h.past.shift();
        h.future = [];
      } else clearTimeout(h.burst);
      h.burst = setTimeout(() => { h.burst = null; }, 500);
    }
    h.last = state;
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const step = (back: boolean) => {
      const h = hist.current;
      const from = back ? h.past : h.future;
      const to = back ? h.future : h.past;
      const next = from.pop();
      if (!next || !h.last) return;
      to.push(h.last);
      if (h.burst) { clearTimeout(h.burst); h.burst = null; }
      h.skip = true;
      setState(next);
      setIsDirty(true);
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return; // 글자 고치는 중엔 그 칸의 되돌리기
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); step(true); }
      else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); step(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState<Record<string, boolean>>({});
  const [authError, setAuthError] = useState<string | null>(null);

  /* 새 디자인 글자 옮기기·크기 — info.adjust 에 저장 (null 이면 처음대로) */
  const handleAdjust = (key: string, value: { x: number; y: number; s: number; c?: string; f?: string; h?: boolean; z?: number } | null) => {
      setState(prev => {
          const next = { ...(prev.info.adjust || {}) };
          if (value) next[key] = value; else delete next[key];
          return { ...prev, info: { ...prev.info, adjust: next } };
      });
      setIsDirty(true);
  };

  /* 새 디자인 글자 손질 — info.texts 에 저장 (null 이면 처음 글자로) */
  const handleTextOverride = (name: string, value: string | null) => {
      setState(prev => {
          const next = { ...(prev.info.texts || {}) };
          if (value === null) { if (!(name in next)) return prev; delete next[name]; } else next[name] = value;
          return { ...prev, info: { ...prev.info, texts: next } };
      });
      setIsDirty(true);
  };

  /* ── 내 디자인 3칸 (회원 계정에 저장) ──
   * 담는 것: 디자인·색·방향, 요소 위치/크기/색/폰트, 넣은 글자·이미지, 표시 켜고 끈 항목, 특징 켜기.
   * 담지 않는 것: 금액·면적 등 매물 값 — 불러오면 지금 매물의 실제 값으로 채워진다. */
  type Preset = { name: string; savedAt?: string; layoutId: string; colorTheme: FlyerColor; orientation: FlyerOrientation; adjust: Record<string, any>; items: any[]; itemTexts: Record<string, string>; hiddenFields?: string[]; showNotice?: boolean };
  const [presets, setPresets] = useState<(Preset | null)[] | null>(null);
  const [presetMsg, setPresetMsg] = useState('');
  useEffect(() => {
    fetch('/api/vacancy/flyer-presets').then((r) => r.json()).then((j) => setPresets(j.success ? j.presets : [null, null, null])).catch(() => setPresets([null, null, null]));
  }, []);
  const callPresets = async (slot: number, preset: Preset | null) => {
    const r = await fetch('/api/vacancy/flyer-presets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slot, preset }) }).then((x) => x.json()).catch(() => null);
    if (!r?.success) { setPresetMsg(`저장하지 못했습니다${r?.error ? `: ${r.error}` : ''}`); return false; }
    setPresets(r.presets);
    return true;
  };
  const savePreset = async (slot: number) => {
    if (presets?.[slot] && !window.confirm(`"${presets[slot]!.name}"에 지금 디자인을 덮어쓸까요?`)) return;
    const L = state.layoutTheme;
    const lay = `${L.type}-${orientation}`;
    const items = (state.info.items || []).filter((it) => it.lay === lay);
    const itemKeys = new Set(items.map((it) => `item-${it.id}`));
    const preset: Preset = {
      name: `${L.name} · ${orientation === 'landscape' ? '가로' : '세로'}`,
      layoutId: L.id, colorTheme: state.colorTheme, orientation,
      adjust: Object.fromEntries(Object.entries(state.info.adjust || {}).filter(([k]) => k.startsWith(`${lay}-`))),
      items,
      itemTexts: Object.fromEntries(Object.entries(state.info.texts || {}).filter(([k]) => itemKeys.has(k))),
      hiddenFields: state.info.hiddenFields, showNotice: state.info.showNotice,
    };
    if (await callPresets(slot, preset)) setPresetMsg(`내 디자인 ${slot + 1}에 저장했습니다. 다른 매물에서 불러올 수 있어요.`);
  };
  const applyPreset = (p: Preset) => {
    const L = LAYOUTS.find((l) => l.id === p.layoutId) || state.layoutTheme;
    const lay = `${L.type}-${p.orientation}`;
    setState((prev) => {
      const adjust = Object.fromEntries(Object.entries(prev.info.adjust || {}).filter(([k]) => !k.startsWith(`${lay}-`)));
      return {
        ...prev, layoutTheme: L, colorTheme: p.colorTheme || prev.colorTheme, orientation: p.orientation,
        info: {
          ...prev.info,
          adjust: { ...adjust, ...(p.adjust || {}) },
          items: [...(prev.info.items || []).filter((it) => it.lay !== lay), ...(p.items || [])],
          texts: { ...(prev.info.texts || {}), ...(p.itemTexts || {}) },
          hiddenFields: p.hiddenFields ?? prev.info.hiddenFields,
          showNotice: p.showNotice,
        },
      };
    });
    setIsDirty(true);
    setPresetMsg(`"${p.name}"을(를) 불러왔습니다. 금액·면적은 이 매물의 값입니다.`);
  };
  const clearPreset = async (slot: number) => {
    if (!window.confirm('이 칸의 디자인을 지울까요?')) return;
    if (await callPresets(slot, null)) setPresetMsg(`내 디자인 ${slot + 1}을 비웠습니다.`);
  };
  const presetBox = isNewLayout(state.layoutTheme?.type) && (
    <div className="mt-4">
      <div className="text-xs font-bold text-gray-600 mb-1">내 디자인 <span className="font-normal text-gray-400">· 계정에 저장, 다른 매물에서 불러오기</span></div>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => {
          const p = presets?.[i] || null;
          return (
            <div key={i} className={`rounded-lg border p-2 text-center ${p ? 'border-gray-300 bg-white' : 'border-dashed border-gray-300 bg-gray-50'}`}>
              <div className="text-[11px] font-bold text-gray-700 truncate" title={p?.name}>{p ? p.name : `빈 칸 ${i + 1}`}</div>
              <div className="text-[10px] text-gray-400 mb-1.5">{p?.savedAt ? new Date(p.savedAt).toLocaleDateString('ko-KR') : '저장 전'}</div>
              {p && <button type="button" onClick={() => applyPreset(p)} className="w-full mb-1 py-1 rounded-md text-[11px] font-bold text-white" style={{ background: state.colorTheme.primary }}>불러오기</button>}
              <button type="button" disabled={presets === null} onClick={() => savePreset(i)} className="w-full py-1 rounded-md border border-gray-300 text-[11px] font-bold text-gray-600 hover:bg-gray-50">{p ? '덮어쓰기' : '지금 저장'}</button>
              {p && <button type="button" onClick={() => clearPreset(i)} className="mt-1 text-[10px] text-gray-400 hover:text-red-500">비우기</button>}
            </div>
          );
        })}
      </div>
      {presetMsg && <p className={`mt-1.5 text-[11px] ${/못했/.test(presetMsg) ? 'text-red-500' : 'text-green-600'}`}>{presetMsg}</p>}
    </div>
  );

  const handleTextChange = (key: any, value: string) => {
      setState(prev => ({ ...prev, info: { ...prev.info, [key]: value } }));
      setIsDirty(true);
  };


  const [activeImageKey, setActiveImageKey] = useState<string>('');
  const vacancyMetaRef = useRef<{ title?: string; no?: string }>({});

  /* 오른쪽 클릭 [새 이미지 넣기] — 고른 파일을 올리고 주소를 돌려준다 */
  const pickImageDone = useRef<((url: string) => void) | null>(null);
  const handlePickImage = (done: (url: string) => void) => {
      pickImageDone.current = done;
      setActiveImageKey('__item__');
      hiddenFileInputRef.current?.click();
  };
  const handleItemsChange = (items: NonNullable<PropertyInfo['items']>) => {
      setState(prev => ({ ...prev, info: { ...prev.info, items } }));
      setIsDirty(true);
  };

  const handleImageClick = (imageKey: string) => {
      setActiveImageKey(imageKey);
      hiddenFileInputRef.current?.click();
  };

  const handleHiddenFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && activeImageKey === '__item__') {
          const params = new URLSearchParams(window.location.search);
          try {
              const url = await uploadImageToServer(await compressToWebP(file, 0.85), params.get("vacancy_id") || "unknown");
              pickImageDone.current?.(url);
          } catch (err: any) {
              alert("이미지를 올리지 못했습니다: " + err.message);
          }
          pickImageDone.current = null;
      } else if (file && activeImageKey) {
          await handleImageUpload(activeImageKey, file);
      }
      if (hiddenFileInputRef.current) hiddenFileInputRef.current.value = '';
  };

  const loadVacancyDataDirectly = async (vacancyId: string) => {
    hist.current.past = []; hist.current.future = []; // 다른 매물로 바꾸면 되돌리기 기록은 새로
    setLoadingData(true);
    try {
      const res = await fetch(`/api/vacancy/detail?id=${vacancyId}`);
      if (res.status === 401 || res.status === 403) {
        setAuthError(res.status === 401 ? "unauthorized" : "forbidden");
        setLoadingData(false);
        return;
      }
      const json = await res.json();
      if (json.success && json.data) {
        const v = json.data;
        // 저장 폴더 이름 (매물 이름 + 공실번호)
        vacancyMetaRef.current = { title: v.building_name || [v.dong, v.property_type].filter(Boolean).join(' '), no: v.vacancy_no ? String(v.vacancy_no) : '' };
        const photos = json.photos || [];
        if (json.qrUrl) setQrUrl(json.qrUrl);
        setVacPhotos(photos.map((p: { url?: string }) => p.url || '').filter(Boolean));

        // 포맷팅 헬퍼들
        const formatAmount = (amt: number) => {
          if (!amt) return '';
          const m = Math.round(amt / 10000); // 원 → 만원
          if (m === 0) return '';
          const e = Math.floor(m / 10000); // 만원 → 억
          const r = m % 10000;
          let result = '';
          if (e > 0) result += `${e}억`;
          if (r > 0) {
            const c = Math.floor(r / 1000);
            const rem = r % 1000;
            let rest = '';
            if (c > 0) rest += `${c}천`;
            if (rem > 0) rest += `${rem}`;
            if (rest) {
              result += (result && !result.endsWith(' ') ? ' ' : '') + rest;
              if (e === 0 && c === 0 && rem > 0) result += '만';
            }
          }
          return result || '';
        };

        const priceText = v.trade_type === '매매' ? `매매 ${formatAmount(v.deposit)}`
          : v.trade_type === '전세' ? `전세 ${formatAmount(v.deposit)}`
          : `${v.trade_type} ${formatAmount(v.deposit)}/${Math.round((v.monthly_rent || 0) / 10000)}만`;

        const supArea = v.supply_m2 ? parseFloat(v.supply_m2) : 0;
        const excArea = v.exclusive_m2 ? parseFloat(v.exclusive_m2) : 0;
        const fmtM2 = (m2: number) => m2 ? `${m2}㎡(${(m2 / 3.3058).toFixed(1)}평)` : '';
        let areaDisplay = '-';
        if (supArea && excArea) areaDisplay = `공급 ${fmtM2(supArea)} / 전용 ${fmtM2(excArea)}`;
        else if (supArea) areaDisplay = `공급 ${fmtM2(supArea)}`;
        else if (excArea) areaDisplay = `전용 ${fmtM2(excArea)}`;

        // 중개사/명함 데이터 매핑
        const owner = v.members || {};
        const agency = Array.isArray(owner.agencies) ? owner.agencies[0] : owner.agencies;
        
        const agentName = agency?.name || owner.company_name || owner.name || "공실뉴스 중개소";
        const agentRepresentative = agency ? `대표 공인중개사 ${agency.ceo_name}` : (owner.ceo_name ? `대표 ${owner.ceo_name}` : `대표 ${owner.name}`);
        const agentPhone = agency?.phone || owner.tel_num || v.client_phone || "";
        const agentMobile = agency?.cell || owner.cell_num || "";
        
        const additionalInfo: string[] = [];
        if (agency?.reg_num || owner.company_reg_no) {
          additionalInfo.push(`등록번호: ${agency?.reg_num || owner.company_reg_no}`);
        }
        const fullAddress = [agency?.address || owner.address, agency?.address_detail || owner.address_detail].filter(Boolean).join(" ");
        if (fullAddress) {
          additionalInfo.push(`소재지: ${fullAddress}`);
        }

        // 물건 종류(아파트·상가·토지…)에 맞춰 크기 줄·정보 표를 처음 채운다
        const auto = buildFlyerRows(v);
        const mappedInfo: PropertyInfo = {
          promotionText: priceText,
          address: v.building_name || [v.sido, v.sigungu, v.dong].filter(Boolean).join(" ") || "공실 매물 정보",
          // 등록 안 된 값은 지어내지 않는다 (남향·즉시 입주·관리비 없음 같은 추측 금지 — 2026-10-15)
          subTitle: [v.property_type, v.direction, areaDisplay !== "-" ? areaDisplay : ""].filter(Boolean).join(" | "),
          transactionType: v.trade_type || "월세",
          priceMain: formatAmount(v.deposit) || "",
          priceSub: v.monthly_rent ? `${Math.round(v.monthly_rent / 10000)}만` : "",
          managementFee: v.maintenance_fee ? `${Math.round(v.maintenance_fee / 10000)}만원` : "-",
          area: areaDisplay,
          floor: `${/^-?\d+$/.test(String(v.current_floor ?? "")) ? `${v.current_floor}층` : (v.current_floor || "-")} / 총 ${v.total_floor ? `${String(v.total_floor).replace(/층$/, "")}층` : "-"}`,
          direction: v.direction || "-",
          roomCount: `${v.room_count || "-"}개 / ${v.bathroom_count || "-"}개`,
          parking: v.parking || "-",
          moveInDate: v.move_in_date || "-",
          options: Array.isArray(v.options) ? v.options.join(", ") : (v.options || ""),
          badge: "",
          pyeong: supArea ? `${Math.round(supArea / 3.3058)}평` : excArea ? `${Math.round(excArea / 3.3058)}평` : "",
          showPhoto: auto.showPhoto,
          sizeLine: auto.sizeLine,
          rows: auto.rows,
          flyerGroup: auto.group,
          propertyKind: v.sub_category || v.property_type || "",
          
          agentName,
          agentRepresentative,
          agentPhone,
          agentMobile,
          agentMapUrl: fullAddress ? `https://map.naver.com/p/search/${encodeURIComponent(fullAddress)}` : "",
          consultationUrl: "",
          agentAdditionalInfo: additionalInfo,

          noticeTitle: "PREMIUM LISTING DETAIL",
          noticeContent: v.description || "",
          sections: []
        };

        const aiCopy = {
            promotionText: mappedInfo.promotionText,
            summary: mappedInfo.subTitle, // 서브타이틀을 요약문구로 활용
        };

        const getPhotoUrl = (index: number) => {
          if (photos.length > 0) {
            return photos[index % photos.length].url;
          }
          return null;
        };


        // 아파트 브랜드 자동 감지해서 컬러 테마 설정
        let autoTheme = COLORS[0]; // 기본 Teal
        const buildingLower = (v.building_name || "").toLowerCase();
        if (buildingLower.includes("롯데") || buildingLower.includes("캐슬")) autoTheme = COLORS[1]; // Gold
        else if (buildingLower.includes("푸르지오")) autoTheme = COLORS[2]; // Green
        else if (buildingLower.includes("힐스") || buildingLower.includes("현대")) autoTheme = COLORS[3]; // Burgundy
        else if (buildingLower.includes("아크로") || buildingLower.includes("자이")) autoTheme = COLORS[4]; // Orange

        // 1. Supabase 클라우드 동기화 데이터 우선 로드
        let supabaseFlyerSettings = json.flyer?.flyer_state;
        if (supabaseFlyerSettings) {
          if ('flyer' in supabaseFlyerSettings || 'report' in supabaseFlyerSettings) {
            supabaseFlyerSettings = supabaseFlyerSettings.flyer;
          }
        }
        if (!supabaseFlyerSettings) {
          supabaseFlyerSettings = v.infrastructure?._flyer_settings;
        }
        if (supabaseFlyerSettings) {
          let loadedState = { ...supabaseFlyerSettings };
          if (!loadedState.info) {
            loadedState.info = { ...INITIAL_INFO };
          }
          loadedState.info.sections = [];
          // 가격은 늘 공실관리의 최신 값으로 — 저장본의 옛 가격·망가진 가격이 유리창에 붙지 않게 (2026-10-01)
          loadedState.info = { ...loadedState.info, transactionType: mappedInfo.transactionType, priceMain: mappedInfo.priceMain, priceSub: mappedInfo.priceSub, managementFee: mappedInfo.managementFee };
          // 정보 표가 없던 예전 저장본은 물건 종류에 맞춰 한 번 채운다 (있으면 사장님이 고친 그대로)
          if (!loadedState.info.rows) loadedState.info = { ...loadedState.info, rows: auto.rows, sizeLine: auto.sizeLine, flyerGroup: auto.group };
          if (loadedState.info.propertyKind === undefined) loadedState.info = { ...loadedState.info, propertyKind: mappedInfo.propertyKind };
          if (!loadedState.mainImage && photos.length > 0) loadedState.mainImage = getPhotoUrl(0);
          setState(loadedState);
          setIsLoadedFromStorage(true);
          setIsInitialized(true);
          setLoadingData(false);
          return;
        }

        // 2. 브라우저 로컬 스토리지 캐시 로드
        const savedStr = localStorage.getItem(`easyflyer_saved_${vacancyId}`);
        if (savedStr) {
          try {
            const savedState = JSON.parse(savedStr);
            let loadedState = { ...savedState };
            if (!loadedState.info) {
              loadedState.info = { ...INITIAL_INFO };
            }
            loadedState.info.sections = [];
            // 가격은 늘 공실관리의 최신 값으로 — 저장본의 옛 가격·망가진 가격이 유리창에 붙지 않게 (2026-10-01)
            loadedState.info = { ...loadedState.info, transactionType: mappedInfo.transactionType, priceMain: mappedInfo.priceMain, priceSub: mappedInfo.priceSub, managementFee: mappedInfo.managementFee };
            // 정보 표가 없던 예전 저장본은 물건 종류에 맞춰 한 번 채운다 (있으면 사장님이 고친 그대로)
            if (!loadedState.info.rows) loadedState.info = { ...loadedState.info, rows: auto.rows, sizeLine: auto.sizeLine, flyerGroup: auto.group };
            if (loadedState.info.propertyKind === undefined) loadedState.info = { ...loadedState.info, propertyKind: mappedInfo.propertyKind };
            if (!loadedState.mainImage && photos.length > 0) loadedState.mainImage = getPhotoUrl(0);
            setState(loadedState);
            setIsLoadedFromStorage(true);
            setIsInitialized(true);
            setLoadingData(false);
            return;
          } catch (e) {
            console.error("로컬 저장소 데이터 로드 실패, 새로 생성합니다:", e);
          }
        }

        setState(prev => ({
          ...prev,
          mainImage: getPhotoUrl(0),
          colorTheme: autoTheme,
          info: mappedInfo,
          generated: aiCopy
        }));
        
        setIsGenerating(false);
        setIsInitialized(true);
      }
    } catch (err) {
      console.error("공실 데이터 연동 오류:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vacancyId = params.get("vacancy_id");

    if (vacancyId) {
      loadVacancyDataDirectly(vacancyId);
    } else {
      // 매물 없이 연 견본 화면 — QR 자리를 보여 주려고 공실열람 주소를 넣는다
      setQrUrl("https://www.gongsilnews.com/gongsil");
    }
  }, []);

  // 카카오 SDK 로드 및 외부 클릭 감지
  useEffect(() => {
    const scriptId = "kakao-share-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
      script.onload = () => {
        const Kakao = (window as any).Kakao;
        if (Kakao && !Kakao.isInitialized()) {
          const kakaoJsKey = "435d3602201a49ea712e5f5a36fe6efc";
          Kakao.init(kakaoJsKey);
        }
      };
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (!showSharePopover) return;
    const handleClick = (e: MouseEvent) => {
      if (sharePopoverRef.current && !sharePopoverRef.current.contains(e.target as Node)) {
        setShowSharePopover(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showSharePopover]);

  const handleSaveToStorageQuietly = async () => {
    const params = new URLSearchParams(window.location.search);
    const vacancyId = params.get("vacancy_id");
    if (!vacancyId) return;
    localStorage.setItem(`easyflyer_saved_${vacancyId}`, JSON.stringify(state));
    setIsLoadedFromStorage(true);
    try {
      const htmlContent = await generateHtmlContent();
      const res = await fetch("/api/vacancy/save-flyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vacancyId, flyerState: { ...state, htmlContent }, type: "flyer" })
      });
      const json = await res.json();
      if (json.success) {
        setIsDirty(false);
      }
    } catch (err) {
      console.warn("Silent cloud save failed:", err);
    }
  };

  const handleKakaoShare = async () => {
    if (!webLayoutAllowed(state.layoutTheme?.id)) { askInstallApp(); return; } // 웹은 숫자 크게·사진형만 (2026-10-29)
    const Kakao = (window as any).Kakao;
    if (!Kakao || !Kakao.isInitialized()) {
      alert("카카오 SDK 로드 중입니다. 잠시 후 시도해 주세요.");
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const vacancyId = params.get("vacancy_id");
    if (!vacancyId) return;

    const shareUrl = `${SITE_ORIGIN}/flyer/${vacancyId}.html`;
    
    // First, save the current flyer state before sharing
    await handleSaveToStorageQuietly();

    Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: state.info.address || "매물 전단지",
        description: state.info.promotionText || "공실뉴스에서 제공하는 검증된 매물 전단지입니다.",
        imageUrl: state.mainImage || "https://gongsilnews.com/logo.png",
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [
        { title: "전단지 보기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } },
      ],
    });
    setShowSharePopover(false);
  };

  const handleCopyUrl = async () => {
    if (!webLayoutAllowed(state.layoutTheme?.id)) { askInstallApp(); return; } // 웹은 숫자 크게·사진형만 (2026-10-29)
    const params = new URLSearchParams(window.location.search);
    const vacancyId = params.get("vacancy_id");
    if (!vacancyId) {
      alert("공실 ID를 찾을 수 없습니다.");
      return;
    }
    
    // Save first
    await handleSaveToStorageQuietly();

    const shareUrl = `${SITE_ORIGIN}/flyer/${vacancyId}.html`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        alert(`📋 공유 링크가 클립보드에 복사되었습니다!\n\n${shareUrl}`);
      } else {
        const tempInput = document.createElement("input");
        tempInput.value = shareUrl;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
        alert(`📋 공유 링크가 클립보드에 복사되었습니다!\n\n${shareUrl}`);
      }
    } catch (e) {
      alert(`📋 공유 주소:\n${shareUrl}\n\n위 주소를 복사해 전달해 주세요.`);
    }
    setShowSharePopover(false);
  };

  // 자동 임시저장
  useEffect(() => {
    if (!isInitialized) return;
    const params = new URLSearchParams(window.location.search);
    const vacancyId = params.get("vacancy_id");
    if (vacancyId && !loadingData && !isGenerating) {
      localStorage.setItem(`easyflyer_saved_${vacancyId}`, JSON.stringify(state));
      
      // 오직 실제로 변경사항이 발생한 경우에만 실시간 임시저장 인디케이터 깜빡임
      if (isDirty) {
        setShowAutoSaveIndicator(true);
        const timer = setTimeout(() => {
          setShowAutoSaveIndicator(false);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [state, loadingData, isGenerating, isInitialized, isDirty]);

  // 페이지 이탈(닫기, 새로고침 등) 시 저장 경고
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "저장하지 않은 변경사항이 있습니다. 페이지를 나가시겠습니까?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // 단축키 Ctrl+S (Cmd+S): 즉시 저장
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveToStorage();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [state]);

  const handleSaveToStorage = async () => {
    const params = new URLSearchParams(window.location.search);
    const vacancyId = params.get("vacancy_id");
    if (!vacancyId) {
      alert("공실 ID를 찾을 수 없습니다.");
      return;
    }
    
    // 1. 브라우저 로컬 저장소 즉시 보존
    localStorage.setItem(`easyflyer_saved_${vacancyId}`, JSON.stringify(state));
    setIsLoadedFromStorage(true);

    // 2. Supabase 클라우드 동기화 저장
    setIsSavingCloud(true);
    try {
      const htmlContent = await generateHtmlContent();
      const res = await fetch("/api/vacancy/save-flyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vacancyId, flyerState: { ...state, htmlContent }, type: "flyer" })
      });
      const json = await res.json();
      if (json.success) {
        alert("성공적으로 저장되었습니다");
        setIsDirty(false);
      } else {
        throw new Error(json.error || "서버 응답 오류");
      }
    } catch (err: any) {
      console.error("클라우드 저장 실패:", err);
      alert("로컬 저장은 성공했으나, 다른 기기와의 클라우드 동기화 중 오류가 발생했습니다: " + err.message);
    } finally {
      setIsSavingCloud(false);
    }
  };

  const handleCopyShareLink = async () => {
    const params = new URLSearchParams(window.location.search);
    const vacancyId = params.get("vacancy_id");
    if (!vacancyId) {
      alert("공실 ID를 찾을 수 없습니다.");
      return;
    }
    
    // 1. 공유하기 전 최신 편집 데이터를 무조건 선저장
    setIsSavingCloud(true);
    try {
      localStorage.setItem(`easyflyer_saved_${vacancyId}`, JSON.stringify(state));
      setIsLoadedFromStorage(true);

      const htmlContent = await generateHtmlContent();
      const res = await fetch("/api/vacancy/save-flyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vacancyId, flyerState: { ...state, htmlContent }, type: "flyer" })
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "서버 응답 오류");
      }
      setIsDirty(false);
    } catch (err: any) {
      console.warn("클라우드 동기화 저장 실패:", err);
    } finally {
      setIsSavingCloud(false);
    }

    // 2. 공유 고유 URL 주소 빌드
    const shareUrl = `${SITE_ORIGIN}/flyer/${vacancyId}.html`;
    
    // 3. 브라우저 클립보드 복사
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        alert(`🎉 전단지가 성공적으로 저장되고, 공유 링크가 복사되었습니다!\n\n📋 복사된 주소:\n${shareUrl}\n\n카카오톡이나 문자에 붙여넣어 다른 사람에게 자유롭게 보내보세요!`);
      } else {
        const tempInput = document.createElement("input");
        tempInput.value = shareUrl;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
        alert(`🎉 전단지가 성공적으로 저장되고, 공유 링크가 복사되었습니다!\n\n📋 복사된 주소:\n${shareUrl}\n\n카카오톡이나 문자에 붙여넣어 다른 사람에게 자유롭게 보내보세요!`);
      }
    } catch (e) {
      alert(`공유 주소:\n${shareUrl}\n\n위 주소를 마우스 드래그로 복사해서 상대방에게 전달해 주세요.`);
    }
  };


  /* ── 공실스튜디오 앱 안(공실마케팅 메뉴)에서 열렸으면 앱이 회원 ChatGPT 로 칸을 채운다 (2026-10-15) ──
     앱 화면 안의 틀(iframe)로 열리므로 바깥 창의 window.gongsilStudio.marketing 을 쓴다. 웹에서는 없다. */
  type StudioMarketing = {
    fill: (opts: { kind: string; vacancyId: string; fields: Record<string, unknown> }) => Promise<Record<string, any>>;
    onProgress?: (fn: (t: string) => void) => () => void;
    /** 그림·PDF 를 문서\공실스튜디오\<매물>\<sub>\ 에 저장 (앱 안에서만) */
    saveFile?: (opts: { id: string; sub: string; fileName: string; dataUrl: string; hint?: { title?: string; no?: string } }) => Promise<{ file: string; folder: string }>;
  };
  const studioMarketing: StudioMarketing | null = (() => {
    try {
      return ((window.parent as any)?.gongsilStudio?.marketing || (window as any).gongsilStudio?.marketing || null) as StudioMarketing | null;
    } catch {
      return null;
    }
  })();
  /* 앱 안이면 저장 창 없이 문서\공실스튜디오\<매물 이름_공실번호>\홍보지\ 에 바로 저장 (2026-10-15 사장님 회의).
     웹에서는 false — 예전처럼 브라우저 다운로드. */
  const saveToStudio = async (fileName: string, dataUrl: string): Promise<boolean> => {
    const id = new URLSearchParams(window.location.search).get("vacancy_id");
    if (!id || !studioMarketing?.saveFile) return false;
    try {
      await studioMarketing.saveFile({ id, sub: '홍보지', fileName, dataUrl, hint: vacancyMetaRef.current });
      return true;
    } catch (e: any) {
      alert("내 저장 폴더에 저장하지 못했습니다: " + (e?.message || e) + "\n대신 다운로드로 받습니다.");
      return false;
    }
  };
  const [aiProgress, setAiProgress] = useState("");
  const runAiFill = async (kind: "flyer" | "report", fields: Record<string, unknown>, apply: (out: Record<string, any>) => void) => {
    const vacancyId = new URLSearchParams(window.location.search).get("vacancy_id");
    if (!vacancyId || !studioMarketing) return;
    setAiProgress("AI에 요청하는 중…");
    const off = studioMarketing.onProgress?.((t) => setAiProgress(t));
    try {
      const out = await studioMarketing.fill({ kind, vacancyId, fields });
      apply(out);
      setAiProgress("✓ AI가 채웠습니다. 확인하고 [저장하기]를 눌러 주세요.");
      setTimeout(() => setAiProgress(""), 2500);
    } catch (e: any) {
      setAiProgress("");
      alert("AI로 채우지 못했습니다: " + String(e?.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, ""));
    } finally {
      off?.();
    }
  };

  /* [AI로 채우기] — 홍보 문구 · 특징 한 줄 · 코멘트 */
  const handleAiFill = () => {
    const info = state.info;
    runAiFill("flyer", {
      promotionText: info.promotionText || "",
      subTitle: info.subTitle || "",
      noticeTitle: info.noticeTitle || "",
      noticeContent: info.noticeContent || "",
    }, (out) => {
      setState((prev) => ({
        ...prev,
        info: { ...prev.info, ...out },
        generated: { ...prev.generated, promotionText: out.promotionText ?? prev.generated.promotionText, summary: out.subTitle ?? prev.generated.summary },
      }));
      setIsDirty(true);
    });
  };

  const handleResetAndRegenerate = async () => {
    const params = new URLSearchParams(window.location.search);
    const vacancyId = params.get("vacancy_id");
    if (!vacancyId) return;

    if (window.confirm("임시저장된 편집 데이터가 삭제되고, AI가 새로 홍보 카피를 작성합니다. 계속하시겠습니까?")) {
      // 1. 브라우저 캐시 삭제
      localStorage.removeItem(`easyflyer_saved_${vacancyId}`);
      setIsLoadedFromStorage(false);
      setIsInitialized(false);

      // 2. Supabase 클라우드 백업 비우기
      setLoadingData(true);
      try {
        const detailRes = await fetch(`/api/vacancy/detail?id=${vacancyId}`);
        const detailJson = await detailRes.json();
        if (detailJson.success && detailJson.data) {
          const currentInfra = detailJson.data.infrastructure || {};
          const { _flyer_settings, ...restInfra } = currentInfra;
          
          await fetch("/api/vacancy/save-flyer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vacancyId, flyerState: null, type: "flyer" }) // null 전달하여 삭제
          });
        }
      } catch (e) {
        console.error("클라우드 데이터 초기화 실패:", e);
      }

      // 3. 처음부터 AI 재생성 로드
      await loadVacancyDataDirectly(vacancyId);
    }
  };

  const handleInfoChange = (newInfo: PropertyInfo) => {
    setState(prev => ({ ...prev, info: newInfo }));
    setIsDirty(true);
  };

  const handleColorChange = (color: FlyerColor) => {
    setState(prev => ({ ...prev, colorTheme: color }));
    setIsDirty(true);
  };

  const handleLayoutChange = (layout: FlyerLayout) => {
    setState(prev => ({ ...prev, layoutTheme: layout }));
    setIsDirty(true);
  };

  const handleImageUpload = async (key: string, file: File): Promise<string | undefined> => {
    const params = new URLSearchParams(window.location.search);
    const vacancyId = params.get("vacancy_id") || "unknown";

    setIsUploadingImage(prev => ({ ...prev, [key]: true }));

    try {
      const compressedBlob = await compressToWebP(file, 0.82);
      const publicUrl = await uploadImageToServer(compressedBlob, vacancyId);

      setState(prev => ({
        ...prev,
        [key]: publicUrl
      }));
      setIsDirty(true);
      return publicUrl;
    } catch (err: any) {
      console.error("이미지 업로드 실패:", err);
      alert("이미지 업로드 및 최적화 중 오류가 발생했습니다: " + err.message);
      return undefined;
    } finally {
      setIsUploadingImage(prev => ({ ...prev, [key]: false }));
    }
  };

  // QR 그림 — 매물 페이지 주소가 정해지면 만든다
  useEffect(() => {
    if (!qrUrl) { setQrDataUrl(null); return; }
    QRCode.toDataURL(qrUrl, { margin: 1, width: 320, errorCorrectionLevel: 'M' })
      .then(setQrDataUrl)
      .catch((e) => { console.warn('QR 생성 실패:', e); setQrDataUrl(null); });
  }, [qrUrl]);

  const previewBoxRef = useRef<HTMLDivElement>(null);
  const [previewBoxWidth, setPreviewBoxWidth] = useState(0);
  useEffect(() => {
    const el = previewBoxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setPreviewBoxWidth(el.clientWidth));
    ro.observe(el);
    setPreviewBoxWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const setOrientation = (o: FlyerOrientation) => {
    setState(prev => ({ ...prev, orientation: o }));
    setIsDirty(true);
  };

  /**
   * 홍보지 한 장을 그림으로 뜬다 — 화면에 보이는 모양 그대로.
   * html2canvas 는 화면을 흉내 내 다시 그리면서 글자를 아래로 밀어 그려, 칸에 꽉 찬 가격·전화번호
   * 아랫부분이 잘렸다 (2026-10-01). html-to-image 는 브라우저가 그린 그대로(SVG foreignObject) 뜬다.
   * 미리보기는 부모가 transform 으로 줄여 보여 주지만, 홍보지 자신은 원래 크기(860×1216 등)라 그대로 뜨면 된다.
   */
  const capturePage = async (): Promise<HTMLCanvasElement | null> => {
    if (!flyerRef.current) return null;
    const { w, h } = PAGE_SIZE[orientation];
    (document.activeElement as HTMLElement | null)?.blur(); // 고치던 칸의 파란 테두리가 찍히지 않게
    // 고르던 글자의 점선·도구도 닫는다 (홍보지 빈 곳을 누른 것처럼)
    flyerRef.current.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await document.fonts?.ready;
    const fontEmbedCSS = await buildFontEmbedCSS().catch(() => undefined);
    return toCanvas(flyerRef.current, {
      // 3배(A4 약 300dpi) — 인쇄해도 글자가 깨지지 않게. 글자 옮기기 도구(data-noexport)는 찍지 않는다
      width: w, height: h, canvasWidth: w * 3, canvasHeight: h * 3, pixelRatio: 1,
      backgroundColor: '#ffffff', cacheBust: true,
      ...(fontEmbedCSS ? { fontEmbedCSS } : {}),
      filter: (node) => !(node instanceof HTMLElement && node.dataset.noexport !== undefined),
    });
  };

  const fileBaseName = () => `유리창홍보지_${(state.info.address || '매물').replace(/[\\/:*?"<>|\s]+/g, '_')}`;

  // ── 이미지 내보내기: 보이는 한 장 그대로 JPG ──
  const handleExportImage = async () => {
    if (!webLayoutAllowed(state.layoutTheme?.id)) { askInstallApp(); return; } // 웹은 숫자 크게·사진형만 (2026-10-29)
    setIsExporting(true);
    try {
      const canvas = await capturePage();
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const name = `${fileBaseName()}_${orientation === 'landscape' ? '가로' : '세로'}.jpg`;
      if (await saveToStudio(name, dataUrl)) return;
      const link = document.createElement('a');
      link.download = name;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert("이미지 내보내기에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsExporting(false);
    }
  };

  // ── 인쇄: A4 한 장 (세로/가로 그대로). 화면 그대로 뜬 그림 → jsPDF → iframe 인쇄 ──
  const handlePrintFlyer = async () => {
    if (!webLayoutAllowed(state.layoutTheme?.id)) { askInstallApp(); return; } // 웹은 숫자 크게·사진형만 (2026-10-29)
    setIsPrinting(true);
    try {
      const canvas = await capturePage();
      if (!canvas) { setIsPrinting(false); return; }
      const land = orientation === 'landscape';
      const pageW = land ? 841.89 : 595.28;
      const pageH = land ? 595.28 : 841.89;
      const pdf = new jsPDF(land ? 'l' : 'p', 'px', [pageW, pageH]);
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pageW, pageH);

      const pdfUrl = URL.createObjectURL(pdf.output('blob'));
      document.getElementById('flyer-print-frame')?.remove();
      const iframe = document.createElement('iframe');
      iframe.id = 'flyer-print-frame';
      iframe.style.cssText = 'position:absolute;width:0;height:0;border:none;left:-9999px;top:-9999px;';
      iframe.src = pdfUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setIsPrinting(false);
        }, 150);
      };
    } catch (err) {
      console.error(err);
      alert("인쇄 데이터를 준비하는 중 오류가 발생했습니다.");
      setIsPrinting(false);
    }
  };

  /**
   * 공유 페이지(/flyer/매물번호.html)에 저장할 HTML — 홍보지 한 장을 그대로 담고,
   * 폰에서는 화면 폭에 맞춰 그림처럼 줄여 보여 준다. 아래에 전화·문자 버튼을 붙인다.
   */
  const generateHtmlContent = async (): Promise<string | null> => {
    if (!flyerRef.current) return null;
    try {
      const { w, h } = PAGE_SIZE[orientation];
      const clone = flyerRef.current.cloneNode(true) as HTMLElement;
      const editClasses = ['outline-none', 'focus:outline', 'focus:outline-2', 'focus:outline-sky-400', 'focus:bg-sky-400/10', 'hover:ring-1', 'hover:ring-sky-300', 'cursor-text', 'cursor-pointer'];
      clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
      clone.querySelectorAll('*').forEach(el => editClasses.forEach(c => el.classList.remove(c)));
      clone.querySelectorAll('img[title]').forEach(el => el.removeAttribute('title'));

      const esc = (t: string) => String(t || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      const phone = (state.info.agentMobile || state.info.agentPhone || '').replace(/[^0-9+]/g, '');
      const title = `${state.info.address || "매물 홍보지"} - ${state.info.promotionText || ''}`;
      const callBar = phone ? `
<div class="callbar">
  <a href="tel:${phone}" style="background:${state.colorTheme.primary}">전화하기</a>
  <a href="sms:${phone}" style="background:${state.colorTheme.secondary}">문자보내기</a>
</div>` : '';

      return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta property="og:type" content="article">
<meta property="og:site_name" content="공실뉴스 유리창 홍보지">
<meta property="og:title" content="${esc(state.info.address || '매물 홍보지')}">
<meta property="og:description" content="${esc(state.info.promotionText || state.info.subTitle || '')}">
<meta property="og:image" content="${esc(state.mainImage || 'https://www.gongsilnews.com/logo.png')}">
<meta name="twitter:card" content="summary_large_image">
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
<link href="https://fonts.googleapis.com/css2?family=Song+Myung:wght@400&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<script>tailwind.config = { theme: { extend: { fontFamily: { sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', 'sans-serif'] } } } }</script>
<style>
  body { font-family: 'Pretendard', sans-serif; background: #e5e7eb; margin: 0; padding: 12px 0 ${phone ? 88 : 12}px; }
  .font-serif-kr { font-family: 'Song Myung', serif; }
  .font-serif-en { font-family: 'Playfair Display', serif; }
  #wrap { margin: 0 auto; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,.18); }
  #poster { width: ${w}px; height: ${h}px; transform-origin: top left; }
  .callbar { position: fixed; left: 0; right: 0; bottom: 0; display: flex; gap: 8px; padding: 10px 12px calc(10px + env(safe-area-inset-bottom)); background: rgba(255,255,255,.96); box-shadow: 0 -4px 14px rgba(0,0,0,.12); }
  .callbar a { flex: 1; text-align: center; padding: 14px 0; border-radius: 12px; color: #fff; font-weight: 800; font-size: 17px; text-decoration: none; }
</style>
</head>
<body>
<div id="wrap"><div id="poster">${clone.outerHTML}</div></div>${callBar}
<script>
  (function () {
    var W = ${w}, H = ${h};
    function fit() {
      var s = Math.min(1, (window.innerWidth - 16) / W);
      document.getElementById('poster').style.transform = 'scale(' + s + ')';
      var wrap = document.getElementById('wrap');
      wrap.style.width = (W * s) + 'px';
      wrap.style.height = (H * s) + 'px';
    }
    fit();
    window.addEventListener('resize', fit);
  })();
</script>
</body>
</html>`;
    } catch (err) {
      console.error("HTML generation error:", err);
      return null;
    }
  };

  if (authError) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-white font-sans">
        <div className="max-w-md w-full bg-slate-800/80 border border-slate-700 p-8 rounded-2xl shadow-2xl text-center backdrop-blur-md">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black mb-3 text-slate-100 tracking-tight">유리창 홍보지 접근 제한</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            {authError === "unauthorized" 
              ? "이 서비스를 이용하시려면 로그인이 필요합니다." 
              : "유리창 홍보지 서비스는 공실뉴스 [부동산 회원] 및 [최고 관리자]만 이용하실 수 있습니다. 일반 회원은 이용이 불가능합니다."}
          </p>
          <button 
            onClick={() => window.location.href = "/"}
            className="w-full py-3 px-6 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition-all duration-150"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // --- 화면 내 [닫기] 및 종료 모달 핸들러 ---
  const handleRequestExit = () => {
    if (isDirty) {
      setShowExitConfirmModal(true);
    } else {
      window.close();
      setTimeout(() => {
        if (!window.closed) {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            alert("편집기가 종료되었습니다. 브라우저 탭을 닫아주세요.");
          }
        }
      }, 250);
    }
  };

  // 모달 옵션 1: 저장하고 닫기
  const handleSaveAndExit = async () => {
    const params = new URLSearchParams(window.location.search);
    const vacancyId = params.get("vacancy_id");

    setIsSavingCloud(true);
    try {
      if (vacancyId) {
        localStorage.setItem(`easyflyer_saved_${vacancyId}`, JSON.stringify(state));
        setIsLoadedFromStorage(true);

        const htmlContent = await generateHtmlContent();
        const res = await fetch("/api/vacancy/save-flyer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vacancyId, flyerState: { ...state, htmlContent }, type: "flyer" })
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || "서버 응답 오류");
        }
      }
      setIsDirty(false);
      setShowExitConfirmModal(false);

      window.close();
      setTimeout(() => {
        if (!window.closed) {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            alert("성공적으로 저장되었습니다! 브라우저 탭을 닫아주세요.");
          }
        }
      }, 250);
    } catch (err: any) {
      console.error("클라우드 저장 실패:", err);
      alert("저장 중 오류가 발생했습니다: " + err.message);
    } finally {
      setIsSavingCloud(false);
    }
  };

  // 모달 옵션 2: 저장하지 않고 그냥 닫기 (수정 취소)
  const handleDiscardAndExit = () => {
    setIsDirty(false);
    setShowExitConfirmModal(false);
    window.close();
    setTimeout(() => {
      if (!window.closed) {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          alert("저장하지 않고 종료되었습니다. 브라우저 탭을 닫아주세요.");
        }
      }
    }, 250);
  };

  // 모달 옵션 3: 취소 (계속 편집하기)
  const handleCancelExit = () => {
    setShowExitConfirmModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-32">
      {loadingData && (
        <div className="fixed inset-0 bg-slate-900/80 z-[200] flex flex-col items-center justify-center text-white backdrop-blur-sm">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-amber-500 mb-6"></div>
          <h2 className="text-xl font-bold mb-2">🪄 공실 데이터 가져오는 중...</h2>
          <p className="text-sm text-slate-400">매물 정보로 유리창 홍보지를 구성하고 있습니다.</p>
        </div>
      )}
      
      
      {/* 저장 여부 확인 이탈 모달 (3개 선택지) */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 p-6 text-center transform animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            
            <h3 className="text-lg font-black text-gray-900 mb-2">
              유리창 홍보지 편집을 종료하시겠습니까?
            </h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              아직 저장되지 않은 수정사항이 있습니다.<br />
              저장하고 닫으시겠습니까, 아니면 수정을 취소하시겠습니까?
            </p>

            <div className="flex flex-col gap-2.5">
              {/* 1. 저장하고 닫기 */}
              <button
                type="button"
                onClick={handleSaveAndExit}
                disabled={isSavingCloud}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {isSavingCloud ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>저장 중...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                    <span>저장하고 닫기</span>
                  </>
                )}
              </button>

              {/* 2. 저장하지 않고 그냥 닫기 */}
              <button
                type="button"
                onClick={handleDiscardAndExit}
                disabled={isSavingCloud}
                className="w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 active:scale-[0.99] text-rose-700 font-bold rounded-xl border border-rose-200 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                <span>저장하지 않고 그냥 닫기</span>
              </button>

              {/* 3. 취소 (계속 편집하기) */}
              <button
                type="button"
                onClick={handleCancelExit}
                disabled={isSavingCloud}
                className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 active:scale-[0.99] text-gray-700 font-semibold rounded-xl transition-all text-sm mt-1"
              >
                계속 편집하기 (취소)
              </button>
            </div>
          </div>
        </div>
      )}
      
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <img 
                  src="/logo.png" 
                  className="h-9 w-auto object-contain cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95" 
                  alt="공실뉴스 로고" 
                  onClick={handleRequestExit}
                />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3">
                    <h1 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                      유리창 홍보지
                    </h1>
                  </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
              {showAutoSaveIndicator ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 transition-all duration-300 animate-pulse">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                  <span>임시저장 완료</span>
                </div>
              ) : isDirty ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100 transition-all duration-300">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  <span>편집 중 (저장 필요)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-slate-300">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  <span>클라우드 동기화 완료</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleRequestExit}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg border border-slate-700 transition-all active:scale-95 text-xs flex items-center gap-1.5 shadow-sm ml-2"
                title="편집기를 닫습니다"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>닫기</span>
              </button>
            </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto w-full p-4 lg:p-8 grid grid-cols-12 gap-6 items-start">
        <div className="col-span-12 lg:col-span-4 xl:col-span-3">
          <FlyerForm 
            qrLink={qrUrl}
            presetsSlot={presetBox}
            info={state.info}
            setInfo={handleInfoChange}
            onImageUpload={handleImageUpload}
            uploadedImages={state}
            colors={COLORS}
            layouts={LAYOUTS}
            currentColor={state.colorTheme}
            currentLayout={state.layoutTheme}
            onColorSelect={handleColorChange}
            onLayoutSelect={handleLayoutChange}
            isUploadingImage={isUploadingImage}
          />
        </div>
        <div className="col-span-12 lg:col-span-8 xl:col-span-9 bg-gray-200/50 rounded-xl border border-gray-300 flex flex-col">
            <div className="bg-white px-4 py-2 border-b flex justify-between items-center text-xs text-gray-500 rounded-t-xl">
                <span className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span>미리보기 · A4 한 장 (보이는 그대로 인쇄됩니다){isNewLayout(state.layoutTheme?.type) && <span className="text-sky-600 font-bold">· 클릭 후 끌면 이동 · 모서리로 크기 · 더블클릭으로 글자 고치기</span>}</span>
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                    {([['portrait', '세로'], ['landscape', '가로']] as const).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setOrientation(key)}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${orientation === key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            {key === 'portrait' ? '▯' : '▭'} A4 {label}
                        </button>
                    ))}
                </div>
            </div>
            <div ref={previewBoxRef} className="flex-1 shadow-inner p-6">
                {(() => {
                    const { w, h } = PAGE_SIZE[orientation];
                    const scale = previewBoxWidth ? Math.min(1, (previewBoxWidth - 48) / w) : 1;
                    return (
                        <div className="mx-auto shadow-2xl relative" style={{ width: w * scale, height: h * scale }}>
                            <WebLockCover layoutId={state.layoutTheme?.id} />
                            <div style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                                <FlyerCanvas
                                    ref={flyerRef}
                                    data={state}
                                    orientation={orientation}
                                    qrDataUrl={qrDataUrl}
                                    qrLink={qrUrl}
                                    onTextChange={handleTextChange}
                                    onImageClick={handleImageClick}
                                    onAdjust={handleAdjust}
                                    onTextOverride={handleTextOverride}
                                    onItemsChange={handleItemsChange}
                                    onPickImage={handlePickImage}
                                    photos={vacPhotos}
                                />
                            </div>
                        </div>
                    );
                })()}
                <input
                    type="file"
                    ref={hiddenFileInputRef}
                    onChange={handleHiddenFileChange}
                    style={{ display: 'none' }}
                    accept="image/*"
                />
            </div>
        </div>
      </main>

      {/* Floating Bottom Action Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] w-[95%] sm:w-auto sm:min-w-[520px] bg-white/95 backdrop-blur-md border border-gray-200/80 p-4 rounded-2xl shadow-[0_15px_35px_-5px_rgba(0,0,0,0.15)] flex items-center justify-between gap-4">
        {/* Save Button */}
        <button 
          onClick={handleSaveToStorage}
          disabled={isSavingCloud}
          className="flex-1 py-3 px-6 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 active:scale-95 transition-all duration-150 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: state.colorTheme.primary }}
        >
          {isSavingCloud ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>저장 중...</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
              </svg>
              <span>저장하기</span>
            </>
          )}
        </button>

        {/* 스튜디오 앱: 회원 ChatGPT 로 칸 채우기 */}
        {studioMarketing && (
          <button
            onClick={handleAiFill}
            disabled={Boolean(aiProgress)}
            className="py-3 px-5 bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-150 shadow-sm disabled:opacity-60"
            title="이 공실 정보로 홍보 문구·특징·코멘트를 연결한 AI가 새로 씁니다."
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>
            <span>AI로 채우기</span>
          </button>
        )}

        {/* AI Reset/Regenerate Button (웹: 기본 문구로 다시) */}
        {!studioMarketing && isLoadedFromStorage && (
          <button 
            onClick={handleResetAndRegenerate} 
            className="py-3 px-5 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 active:scale-95 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-150 shadow-sm"
            title="임시저장 데이터를 지우고 AI로 처음부터 다시 생성합니다."
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span>AI 새로 생성</span>
          </button>
        )}

        {/* Image Export Button */}
        <button 
          onClick={handleExportImage}
          disabled={isExporting}
          className="py-3 px-5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-95 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-150 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowDownTrayIcon className="w-4 h-4 text-gray-500" />
          <span>{isExporting ? '이미지 만드는 중...' : '이미지 내보내기'}</span>
        </button>

        {/* Print Button */}
        <button 
          onClick={handlePrintFlyer}
          disabled={isPrinting}
          className="py-3 px-5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-95 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-150 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPrinting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>인쇄 준비 중...</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-gray-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0v-2.94a2.25 2.25 0 012.25-2.25h6a2.25 2.25 0 012.25 2.25v2.94z" />
              </svg>
              <span>홍보지 인쇄하기</span>
            </>
          )}
        </button>


        {/* Share Button (Relative Container for Popover) */}
        <div ref={sharePopoverRef} className="relative">
          <button 
            onClick={() => setShowSharePopover(!showSharePopover)}
            className="py-3 px-5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-95 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-150 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-gray-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935-2.186 2.25 2.25 0 00-3.935 2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            <span>공유하기</span>
          </button>

          {/* Share Dropdown Popover */}
          {showSharePopover && (
            <div className="absolute bottom-[60px] right-0 bg-white border border-gray-200/80 rounded-xl shadow-[0_6px_24px_rgba(0,0,0,0.15)] w-48 z-[100] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
              <button 
                onClick={handleKakaoShare}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-100 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-[#FEE500] flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#3C1E1E">
                    <path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.8 5.2 4.4 6.5l-1 3.7c-.1.3.3.6.5.4l4.3-2.9c.6.1 1.2.1 1.8.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z"></path>
                  </svg>
                </div>
                <span className="text-sm font-semibold text-gray-700">카카오톡 공유</span>
              </button>
              <button 
                onClick={handleCopyUrl}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                </div>
                <span className="text-sm font-semibold text-gray-700">URL 복사</span>
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #999; }
      `}</style>
      {/* AI 채우는 중 (스튜디오 앱) */}
      {aiProgress && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 max-w-md text-center">
            {aiProgress.startsWith("✓") ? (
            <div className="mx-auto mb-3 w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </div>
          ) : (
            <div className="flex items-end justify-center gap-1 h-5 mb-3">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-2 h-2 rounded-full bg-blue-600" style={{ animation: `gwLoadingDot 1s ease-in-out ${i * 0.15}s infinite` }} />
              ))}
              <style>{`@keyframes gwLoadingDot { 0%, 60%, 100% { transform: translateY(0); opacity: .45 } 30% { transform: translateY(-7px); opacity: 1 } }`}</style>
            </div>
          )}
            <div className="font-bold text-gray-900 leading-relaxed">{aiProgress.replace(/^✓\s*/, "")}</div>
            {!aiProgress.startsWith("✓") && <div className="mt-2 text-sm text-gray-500">스튜디오 전용 크롬에서 연결한 AI(ChatGPT·Gemini)가 씁니다. 1~2분 걸립니다.</div>}
          </div>
        </div>
      )}

      <InstallAppModal />
    </div>
  );
}

export default App;
