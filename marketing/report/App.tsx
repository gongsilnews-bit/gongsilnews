
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { WEB_LIMITED, webAllowed, askInstallApp, InstallAppModal } from './webLimit';
import { jsPDF } from 'jspdf';
import FlyerForm from './components/FlyerForm';
import FlyerCanvas from './components/FlyerCanvas';
import TableEditorModal from './components/TableEditorModal';
import { MAX_PHOTO_PAGES, photoPageCount, photoPageKeys } from './components/canvas/photoPages';
import { pageOrder, pageNumberLabel } from './components/canvas/pageOrder';
import { SimKind, SimData, SIM_PAGE, SIM_LABEL } from './components/canvas/PageSim';
import { simBridge, cleanErr } from './components/SimPanel';
// Removed geminiService imports to prevent client-side API usage
import { FlyerState, PropertyInfo, GeneratedContent, FlyerColor, FlyerLayout } from './types';
import { detectPropertyCategory, getOverviewTemplate, buildOverviewTable, buildInvestmentSummary, buildPage2Content, buildPage5Content, buildPage6Content, type OverviewField } from './propertyTemplates';
import { ArrowDownTrayIcon, CodeBracketIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/solid';
import { fillFieldDefaults, roadmapItems } from './reportFields';
import { scrubSampleInfo, buildLeaseTable, buildLeaseRight, LEASE_NOTICE, floorText } from './realData';

export const COLORS: FlyerColor[] = [
  { id: 'teal', name: 'Teal (Raemian)', primary: '#00788c', secondary: '#00c6d7', dark: '#003845' },
  { id: 'gold', name: 'Gold (Lotte)', primary: '#bfa068', secondary: '#e6cc9f', dark: '#3e301b' },
  { id: 'green', name: 'Green (Prugio)', primary: '#005f4d', secondary: '#4fb89e', dark: '#002820' },
  { id: 'burgundy', name: 'Burgundy (Hillstate)', primary: '#7c1f2d', secondary: '#ff9ea7', dark: '#380d13' },
  { id: 'orange', name: 'Orange (Acro)', primary: '#f27405', secondary: '#ffac63', dark: '#5e2609' },
];

export const LAYOUTS: FlyerLayout[] = [
  { id: 'type1', name: 'Modern Overlay', type: 'type1', headingFont: 'font-sans', bodyFont: 'font-sans' },
  { id: 'type2', name: 'Luxury Center', type: 'type2', headingFont: 'font-serif-kr', bodyFont: 'font-serif-kr' },
  { id: 'type3', name: 'Natural Clean', type: 'type3', headingFont: 'font-sans', bodyFont: 'font-sans' },
  { id: 'type4', name: 'Bold Box', type: 'type4', headingFont: 'font-sans', bodyFont: 'font-sans' },
  { id: 'type5', name: 'High-end Minimal', type: 'type5', headingFont: 'font-sans', bodyFont: 'font-sans' },
];


/* QR·공유 링크는 늘 실제 사이트 주소로 — 개발 PC(localhost)나 앱에서 만들어도 손님 휴대폰에서 열려야 한다 (2026-10-15) */
const SITE_ORIGIN = "https://www.gongsilnews.com";

/* 공실 없이 만든 보고서 (2026-10-23, docs/2026-10-23_report_without_vacancy_plan.md) — ?local=rpt-… 로 열린다.
   스튜디오 앱이 PC에 저장한다 (공유 링크 없음, 공실스터디 멤버십 전용). 앱 화면 안 틀(iframe)이라 바깥 창의 gongsilStudio.report 를 쓴다 */
const getLocalId = (): string => (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('local') || '' : '');
type StudioReport = {
  get: (id: string) => Promise<{ id: string; title: string; createdAt: string; updatedAt: string; vacancy: any; photos: string[]; state: any }>;
  save: (opts: { id: string; state: any; title?: string }) => Promise<{ updatedAt: string }>;
};
const studioReportBridge = (): StudioReport | null => {
  try {
    return ((window.parent as any)?.gongsilStudio?.report || (window as any).gongsilStudio?.report || null) as StudioReport | null;
  } catch {
    return null;
  }
};

const INITIAL_INFO: PropertyInfo = {
  // Page 0: Cover
  coverTitle: "INVESTMENT MEMORANDUM",
  coverSubtitle: "부동산 물건 보고서",
  coverQRLink: "https://gongsilnews.com",

  // Page 1: Overview
  // ⚠ 예시(가짜) 값을 두지 않는다 — 실제 매물로 채우지 못한 칸은 빈칸으로 남는다 (realData.ts)
  address: "",
  subTitle: "",
  priceMain: "",
  overviewTable: [],
  agentName: "",
  agentLabel: "REALTY AGENCY",
  agentRegistrationNumber: "",
  agentRepresentative: "",
  agentPhone: "",
  agentMobile: "",
  agentAddress: "",
  investmentSummary: {
    box1Title: "CONNECTIVITY", box1Text: "",
    box2Title: "ASSET QUALITY", box2Text: "",
    box3Title: "SUITABILITY", box3Text: "",
  },

  // Page 2: Status & Valuation
  floorStatus: [],
  floorStatusNotice: "",
  highlights: [],
  valuationText: "",
  showChart: false, // 시세 자료가 없으면 그래프를 숨긴다 (중개사가 숫자를 넣으면 보인다)
  chartBars: [
    { label: "탁상감정가", value: "", isHighlight: false },
    { label: "기존 희망가", value: "", isHighlight: false },
    { label: "인근 시세", value: "", isHighlight: false },
    { label: "현재 급매가", value: "", isHighlight: true }
  ],

  // Page 3: Lease Status (New PPT style interactive grid page)
  leaseTable: {
    headers: ["층수", "호실", "면적", "금액", "현용도", "기타"],
    rows: [],
    widths: [10, 10, 15, 35, 15, 15]
  },
  leaseNotice: "※ 위 임대현황은 임차인 사정 및 임대 시장 상황에 따라 실제 조건과 상이할 수 있으므로, 반드시 사전 확인 바랍니다.",
  leaseRightTitle: "임대 조건 요약",
  leaseRightText: "",

  // Page 4: Photos Captions (was Page 3)
  photoCaptions: {
    main: "",
    sub1: "",
    sub2: "",
    feat1: "",
    feat2: ""
  },

  // Page 5: Area Analysis (was Page 4)
  areaTargetName: "",
  areaTargetDesc: "",
  areaBox1Title: "STATION AREA", areaBox1Text: "",
  areaBox2Title: "CULTURAL DIST.", areaBox2Text: "",
  areaBox3Title: "CONNECTIVITY", areaBox3Text: "",
  mapType: 'kakao',

  // Page 6: Roadmap (was Page 5)
  roadmap: {
    box1Title: "", box1Text: "",
    box2Title: "", box2Text: "",
    box3Title: "", box3Text: "",
    box4Title: "", box4Text: ""
  },
  
  pageBadges: {}, // 처음 글은 칸 목록(reportFields) — 1쪽은 "종류 | 거래"로 계산
  
  // Backward compat
  promotionText: "",
  sections: [],

  // New defaults
  hideRentRoll: false,
  hideRoadmap: false,
  contactYoutube: "https://youtube.com/@gongsilnews",
  contactBlog: "https://blog.naver.com/gongsilnews",
  contactWebsite: "https://gongsilnews.com",
  contactQRLink: "https://gongsilnews.com",
  propertyType: "commercial_sales",
  visiblePages: [0, 1, 2, 3, 4, 5, 6, 7],
  footerText: "PROPERTY REPORT"
};

const INITIAL_GENERATED: GeneratedContent = {
  promotionText: "",
  summary: "",
};

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    sections: { id: string; label: string }[];
    onExport: (selectedIds: string[]) => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, sections, onExport }) => {
    const [selected, setSelected] = useState<Set<string>>(new Set(sections.map(s => s.id)));

    if (!isOpen) return null;

    const toggle = (id: string) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelected(next);
    };

    const toggleAll = () => {
        if (selected.size === sections.length) setSelected(new Set());
        else setSelected(new Set(sections.map(s => s.id)));
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-800">이미지 내보내기 옵션</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="w-5 h-5"/></button>
                </div>
                <div className="p-4">
                    <p className="text-sm text-gray-500 mb-4">내보내고 싶은 섹션만 선택하세요.</p>
                    <div className="flex justify-end mb-2">
                        <button onClick={toggleAll} className="text-xs font-bold text-blue-600 hover:underline">
                            {selected.size === sections.length ? '전체 해제' : '전체 선택'}
                        </button>
                    </div>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                        {sections.map(sec => (
                            <label key={sec.id} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${selected.has(sec.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}>
                                    {selected.has(sec.id) && <CheckIcon className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <input type="checkbox" className="hidden" checked={selected.has(sec.id)} onChange={() => toggle(sec.id)} />
                                <span className={`text-sm font-medium ${selected.has(sec.id) ? 'text-gray-900' : 'text-gray-500'}`}>{sec.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="p-4 border-t bg-gray-50 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-300 font-bold text-gray-600 text-sm hover:bg-white transition-colors">취소</button>
                    <button 
                        onClick={() => onExport(Array.from(selected))} 
                        disabled={selected.size === 0}
                        className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        선택한 섹션 내보내기 ({selected.size})
                    </button>
                </div>
            </div>
        </div>
    )
}

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

const convertOverviewTableToArray = (tbl: any, category?: string, transactionType?: string, subCategory?: string): { label: string; value: string }[] => {
  if (Array.isArray(tbl)) return tbl;
  const sub = subCategory || category || "";
  const detected = detectPropertyCategory(sub, category);
  const isSale = !transactionType || transactionType === '매매';
  const template = getOverviewTemplate(detected, isSale, sub);
  if (tbl && typeof tbl === 'object') {
    // 카테고리 기반으로 동적 템플릿 적용 (물건 유형에 맞는 필드명 사용)
    return template.map((f: OverviewField) => ({
      label: f.label,
      value: (f.dataKey ? (tbl[f.dataKey] || '') : '') || '',
    }));
  }
  // 카테고리가 주어지면 해당 템플릿의 필드명 사용
  return template.map((f: OverviewField) => ({ label: f.label, value: '' }));
};

const mergeStateWithDefaults = (loaded: any): FlyerState => {
  let mergedVisiblePages = loaded?.info?.visiblePages || INITIAL_INFO.visiblePages;
  if (!mergedVisiblePages.includes(0)) mergedVisiblePages = [0, ...mergedVisiblePages];
  if (!mergedVisiblePages.includes(7)) mergedVisiblePages = [...mergedVisiblePages, 7];
  mergedVisiblePages.sort((a: number, b: number) => a - b);

  let shareUrl = "https://gongsilnews.com";
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const vacancyId = params.get("vacancy_id");
    if (vacancyId) {
      shareUrl = `${SITE_ORIGIN}/flyer/${vacancyId}.html`;
    }
  }

  const loadedInfo = loaded?.info || {};
  let coverQRLink = loadedInfo.coverQRLink;
  if (getLocalId()) {
    // 공실 없는 보고서는 공유 페이지가 없다 — 회원이 넣은 주소만 (없으면 QR 없음)
    coverQRLink = coverQRLink && coverQRLink !== "https://gongsilnews.com" ? coverQRLink : "";
  } else if (!coverQRLink || coverQRLink === "https://gongsilnews.com" || /localhost|127\.0\.0\.1/.test(coverQRLink)) {
    coverQRLink = shareUrl;
  }

  return {
    ...loaded,
    // 칸 목록의 처음 글을 실제 값으로 (보이는 글 = 저장된 글, 2026-10-25)
    info: fillFieldDefaults({
      ...INITIAL_INFO,
      ...loadedInfo,
      coverQRLink,
      visiblePages: mergedVisiblePages,
      overviewTable: convertOverviewTableToArray(
        loaded?.info?.overviewTable || loaded?.info?.overviewTableObj,
        loadedInfo.propertyCategory || loadedInfo.sub_category || loadedInfo.property_type,
        loadedInfo.transactionType,
        loadedInfo.subCategory || loadedInfo.sub_category
      ),
      floorStatus: loaded?.info?.floorStatus || INITIAL_INFO.floorStatus,
      highlights: loaded?.info?.highlights || INITIAL_INFO.highlights,
      leaseTable: (loaded?.info?.leaseTable && Array.isArray(loaded.info.leaseTable.headers) && Array.isArray(loaded.info.leaseTable.rows)) 
        ? {
            ...INITIAL_INFO.leaseTable,
            ...loaded.info.leaseTable,
            widths: loaded.info.leaseTable.widths || INITIAL_INFO.leaseTable.widths || [10, 10, 15, 35, 15, 15]
          } 
        : INITIAL_INFO.leaseTable,
      leaseNotice: loaded?.info?.leaseNotice !== undefined ? loaded?.info?.leaseNotice : INITIAL_INFO.leaseNotice,
      leaseRightTitle: loaded?.info?.leaseRightTitle !== undefined ? loaded?.info?.leaseRightTitle : INITIAL_INFO.leaseRightTitle,
      leaseRightText: loaded?.info?.leaseRightText !== undefined ? loaded?.info?.leaseRightText : INITIAL_INFO.leaseRightText,
      pageBadges: (() => {
        // 회원이 고친 배지는 그대로 둔다 (예전엔 불러올 때마다 DETAILS 등으로 덮었다 — 2026-10-25). 빈 배지는 칸 목록의 처음 글로
        const rawBadges: any = { ...(loaded?.info?.pageBadges || {}) };
        const p1 = String(rawBadges.page1 || '').trim();
        // 1쪽 배지: 옛 틀 문구면 비워서 "종류 | 거래" 로 계산되게
        if (!p1 || ["FOR SALE", "FOR RENT", "FOR LEASE", "FOR AUCTION", "매매", "전세", "월세", "임대", "CONFIDENTIAL | INFORMATION MEMORANDUM"].includes(p1.toUpperCase())) delete rawBadges.page1;
        return rawBadges;
      })(),
      subCategory: loaded?.info?.subCategory || loaded?.info?.sub_category || "",
      investmentSummary: {
        ...INITIAL_INFO.investmentSummary,
        ...(loaded?.info?.investmentSummary || {})
      },
      photoCaptions: {
        ...INITIAL_INFO.photoCaptions,
        ...(loaded?.info?.photoCaptions || {})
      },
      roadmap: {
        ...INITIAL_INFO.roadmap,
        ...(loaded?.info?.roadmap || {})
      }
    }),
    generated: {
      ...INITIAL_GENERATED,
      ...(loaded?.generated || {})
    },
    colorTheme: loaded?.colorTheme || COLORS[0],
    layoutTheme: loaded?.layoutTheme || LAYOUTS[0]
  };
};


/** html2canvas 는 글자를 6px 쯤 아래로 그린다 — 고치는 칸(contentEditable)만 올리던 것을 일반 글자에도 똑같이.
 *  (9쪽 건축물대장 표 이름 칸·"타입 구성" 제목이 내려가 값과 어긋나고 "이 매물" 표시에 겹쳤다, 2026-10-25 사장님) */
const liftTextForCapture = (clone: HTMLElement) => {
  const texts: Text[] = [];
  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const t = walker.currentNode as Text;
    if (t.nodeValue?.trim() && !t.parentElement?.closest('[contenteditable], svg, style, script')) texts.push(t);
  }
  // 줄 바꿈·자리는 그대로 두고 그리는 자리만 올리게 relative 로
  texts.forEach((t) => {
    const s = document.createElement('span');
    s.style.position = 'relative';
    s.style.top = '-6px';
    t.replaceWith(s);
    s.appendChild(t);
  });
  // 편집 화면에만 있는 것(단추·비운 줄)은 결과물에서 뺀다 — 이미지·PDF·인쇄 모두
  clone.querySelectorAll('.print\\:hidden').forEach(el => el.remove());
  clone.querySelectorAll('[contentEditable]').forEach(el => {
    el.removeAttribute('contentEditable');
    el.removeAttribute('suppressContentEditableWarning');
    (el as HTMLElement).style.transform = 'translateY(-6px)';
  });
};

function App() {
  const [state, setState] = useState<FlyerState>({
    info: fillFieldDefaults(INITIAL_INFO),
    generated: INITIAL_GENERATED,
    mainImage: null,
    agentImage: null,
    colorTheme: COLORS[0],
    layoutTheme: LAYOUTS[0],
    subImage1: null,
    subImage2: null,
    featureImage1: null,
    featureImage2: null,
    featureImage3: null,
    featureImage4: null,
    mapImage: null,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isTableEditorOpen, setIsTableEditorOpen] = useState(false);
  const flyerRef = useRef<HTMLDivElement>(null);
  const hiddenFlyerRef = useRef<HTMLDivElement>(null);
  const [showSharePopover, setShowSharePopover] = useState(false);
  const sharePopoverRef = useRef<HTMLDivElement>(null);

  // 5. URL 파라미터 기반 공실 데이터 연동 로드
  const [loadingData, setLoadingData] = useState(false);
  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState<Record<string, boolean>>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTabInternal] = useState<number | 'all'>('all');
  const [tabHistory, setTabHistory] = useState<(number | 'all')[]>(['all']);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const touchStartXRef = useRef<number | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const reportHistoryReadyRef = useRef(false);
  const editorScrollRef = useRef<HTMLDivElement>(null);

  // 이탈 방지 및 종료 모달 상태
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const hasUnsavedChangesRef = useRef(false);
  const isInitialLoadRef = useRef(true);

  const getEditorScrollTop = () => editorScrollRef.current?.scrollTop || 0;

  useEffect(() => {
    const updateViewportWidth = () => setViewportWidth(window.innerWidth);
    updateViewportWidth();
    window.addEventListener('resize', updateViewportWidth);
    return () => window.removeEventListener('resize', updateViewportWidth);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => {
      const next = !prev;
      if (window.innerWidth < 768 && reportHistoryReadyRef.current) {
        window.history.replaceState({ ...window.history.state, reportEditor: true, sidebarOpen: prev, activeTab, editorScrollTop: getEditorScrollTop() }, "", window.location.href);
        window.history.pushState({ reportEditor: true, sidebarOpen: next, activeTab, editorScrollTop: 0 }, "", window.location.href);
      }
      return next;
    });
  }, [activeTab]);

  const handleReportBack = useCallback(() => {
    if (reportHistoryReadyRef.current) {
      window.history.back();
    } else {
      window.history.back();
    }
  }, []);

  const handleMobileTouchStart = useCallback((event: React.TouchEvent<HTMLElement>) => {
    if (window.innerWidth > 767) return;
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
  }, []);

  const handleMobileTouchEnd = useCallback((event: React.TouchEvent<HTMLElement>) => {
    const startX = touchStartXRef.current;
    touchStartXRef.current = null;
    if (window.innerWidth > 767 || startX === null) return;

    const distance = event.changedTouches[0]?.clientX - startX;
    if (Math.abs(distance) < 60) return;
    if (distance < 0 && !isSidebarOpen) setIsSidebarOpen(true);
    if (distance > 0 && isSidebarOpen) setIsSidebarOpen(false);
  }, [isSidebarOpen]);

  const mobilePreviewPageCount = activeTab === 'all'
    ? (state.info.visiblePages || [0, 1, 2, 3, 4, 5, 6, 7]).length + ((state.info.visiblePages || [4]).includes(4) ? photoPageCount(state.info) - 1 : 0)
    : 1;
  const mobileReportScale = viewportWidth > 0 ? Math.min(1, Math.max(0.1, (viewportWidth - 24) / 1122)) : 1;
  const mobilePreviewHeight = mobilePreviewPageCount * 826 * mobileReportScale;
  const mobilePreviewPanelHeight = mobilePreviewHeight + 68;

  const setActiveTab = useCallback((tab: number | 'all') => {
    if (window.innerWidth < 768 && reportHistoryReadyRef.current && tab !== activeTab) {
      window.history.replaceState({ ...window.history.state, reportEditor: true, sidebarOpen: isSidebarOpen, activeTab, editorScrollTop: getEditorScrollTop() }, "", window.location.href);
      window.history.pushState({ reportEditor: true, sidebarOpen: isSidebarOpen, activeTab: tab, editorScrollTop: 0 }, "", window.location.href);
    }
    setTabHistory(prev => [...prev, tab]);
    setActiveTabInternal(tab);
  }, [activeTab, isSidebarOpen]);

  useEffect(() => {
    const initialState = window.history.state || {};
    window.history.replaceState({ ...initialState, reportEditor: true, sidebarOpen: isSidebarOpen, activeTab, editorScrollTop: 0 }, "", window.location.href);
    reportHistoryReadyRef.current = true;

    const handlePopState = (event: PopStateEvent) => {
      if (!event.state?.reportEditor) return;
      if (typeof event.state.activeTab === 'number' || event.state.activeTab === 'all') {
        setActiveTabInternal(event.state.activeTab);
      }
      if (typeof event.state.sidebarOpen === 'boolean') {
        setIsSidebarOpen(event.state.sidebarOpen);
      }
      const scrollTop = typeof event.state.editorScrollTop === 'number' ? event.state.editorScrollTop : 0;
      requestAnimationFrame(() => {
        if (editorScrollRef.current) editorScrollRef.current.scrollTop = scrollTop;
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleBackTab = useCallback(() => {
    setTabHistory(prev => {
      if (prev.length <= 1) return prev;
      const newHistory = [...prev];
      newHistory.pop(); // remove current
      const previousTab = newHistory[newHistory.length - 1];
      setActiveTabInternal(previousTab);
      return newHistory;
    });
  }, []);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to top when '전체보기' is selected
  useEffect(() => {
    if (activeTab === 'all' && previewContainerRef.current) {
      previewContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab]);

  // --- UNDO / REDO HISTORY ENGINE ---
  const [past, setPast] = useState<FlyerState[]>([]);
  const [future, setFuture] = useState<FlyerState[]>([]);
  const historyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const checkpointStateRef = useRef<FlyerState | null>(null);
  const isDebouncingRef = useRef<boolean>(false);

  const commitPendingHistory = useCallback(() => {
    if (historyTimeoutRef.current) {
      clearTimeout(historyTimeoutRef.current);
      historyTimeoutRef.current = null;
    }
    if (checkpointStateRef.current) {
      const checkpoint = checkpointStateRef.current;
      setPast(prev => {
        const last = prev[prev.length - 1];
        if (last && JSON.stringify(last) === JSON.stringify(checkpoint)) {
          return prev;
        }
        return [...prev.slice(-49), checkpoint];
      });
      setFuture([]); // Clear redo stack on new action
      checkpointStateRef.current = null;
    }
    isDebouncingRef.current = false;
  }, []);

  const pushToHistoryDebounced = useCallback((currentState: FlyerState) => {
    if (!isDebouncingRef.current) {
      checkpointStateRef.current = currentState;
      isDebouncingRef.current = true;
    }
    
    if (historyTimeoutRef.current) {
      clearTimeout(historyTimeoutRef.current);
    }
    
    historyTimeoutRef.current = setTimeout(() => {
      commitPendingHistory();
    }, 1000);
  }, [commitPendingHistory]);

  const pushToHistoryInstant = useCallback((currentState: FlyerState) => {
    commitPendingHistory();
    setPast(prev => {
      const last = prev[prev.length - 1];
      if (last && JSON.stringify(last) === JSON.stringify(currentState)) {
        return prev;
      }
      return [...prev.slice(-49), currentState];
    });
    setFuture([]);
  }, [commitPendingHistory]);

  const handleUndo = useCallback(() => {
    if (historyTimeoutRef.current) {
      clearTimeout(historyTimeoutRef.current);
      historyTimeoutRef.current = null;
    }
    if (checkpointStateRef.current) {
      const checkpoint = checkpointStateRef.current;
      checkpointStateRef.current = null;
      isDebouncingRef.current = false;
      setState(currentState => {
        setFuture(prevFuture => [currentState, ...prevFuture]);
        return checkpoint;
      });
      return;
    }

    setPast(prevPast => {
      if (prevPast.length === 0) return prevPast;
      const previous = prevPast[prevPast.length - 1];
      const newPast = prevPast.slice(0, -1);
      
      setState(currentState => {
        setFuture(prevFuture => [currentState, ...prevFuture]);
        return previous;
      });
      
      return newPast;
    });
  }, []);

  const handleRedo = useCallback(() => {
    commitPendingHistory();
    setFuture(prevFuture => {
      if (prevFuture.length === 0) return prevFuture;
      const next = prevFuture[0];
      const newFuture = prevFuture.slice(1);
      
      setState(currentState => {
        setPast(prevPast => [...prevPast, currentState]);
        return next;
      });
      
      return newFuture;
    });
  }, [commitPendingHistory]);

  useEffect(() => {
    return () => {
      if (historyTimeoutRef.current) {
        clearTimeout(historyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. 단축키 Ctrl+S (Cmd+S): 즉시 저장
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveToStorage();
        return;
      }

      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.hasAttribute('contenteditable') || 
        activeEl.closest('[contenteditable]')
      );
      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleUndo, handleRedo]);

  /* 공실 정보(v) → 보고서 처음 상태. 공실 없는 보고서는 붙여넣은 글을 AI가 정리한 같은 모양의 v (2026-10-23) */
  const applyVacancy = (v: any, json: any, shareUrl: string) => {
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

    const priceText = !v.trade_type ? (formatAmount(v.deposit) || '')
      : v.trade_type === '매매' ? `매매 ${formatAmount(v.deposit)}`
      : v.trade_type === '전세' ? `전세 ${formatAmount(v.deposit)}`
      : `${v.trade_type} ${formatAmount(v.deposit)}/${Math.round((v.monthly_rent || 0) / 10000)}만`;

    const supArea = v.supply_m2 ? parseFloat(v.supply_m2) : 0;
    const excArea = v.exclusive_m2 ? parseFloat(v.exclusive_m2) : 0;
    const fmtM2 = (m2: number) => m2 ? `${m2}㎡(${(m2 / 3.3058).toFixed(1)}평)` : '';
    let areaDisplay = '-';
    if (supArea && excArea) areaDisplay = `공급 ${fmtM2(supArea)} / 전용 ${fmtM2(excArea)}`;
    else if (supArea) areaDisplay = `공급 ${fmtM2(supArea)}`;
    else if (excArea) areaDisplay = `전용 ${fmtM2(excArea)}`;

    // 중개사/명함 데이터 매핑 (로그인한 중개사회원 본인 우선 연동, 없으면 매물 등록자)
    const currentMember = json.currentMember;
    const currentAgency = Array.isArray(currentMember?.agencies) ? currentMember.agencies[0] : currentMember?.agencies;
    const owner = v.members || {};
    const ownerAgency = Array.isArray(owner.agencies) ? owner.agencies[0] : owner.agencies;

    // 로그인한 회원이 중개사이면 본인 중개소 정보를 최우선 사용
    const agency = currentAgency?.name ? currentAgency : ownerAgency;
    const activeMember = (currentAgency?.name ? currentMember : (owner.name ? owner : currentMember)) || {};

    const agentName = agency?.name || activeMember?.company_name || activeMember?.name || "";
    const agentRepresentative = activeMember?.name || agency?.ceo_name || v.client_name || "";
    const agencyRepresentative = agency?.ceo_name || activeMember?.name || "";
    const agentPhone = agency?.phone || activeMember?.phone || activeMember?.tel_num || v.client_phone || "";
    const agentMobile = activeMember?.cellphone || activeMember?.phone || activeMember?.cell_num || agency?.cell || v.client_phone || "";
    const agentRegistrationNumber = agency?.reg_num || activeMember?.company_reg_no || "";

    const additionalInfo: string[] = [];
    if (agentRegistrationNumber) {
      additionalInfo.push(`등록번호: ${agentRegistrationNumber}`);
    }
    const fullAddress = [agency?.address || activeMember?.address, agency?.address_detail || activeMember?.address_detail].filter(Boolean).join(" ");
    if (fullAddress) {
      additionalInfo.push(`소재지: ${fullAddress}`);
    }

    // 아파트 브랜드 자동 감지해서 컬러 테마 설정
    let autoTheme = COLORS[0]; // 기본 Teal
    const buildingLower = (v.building_name || "").toLowerCase();
    if (buildingLower.includes("롯데") || buildingLower.includes("캐슬")) autoTheme = COLORS[1]; // Gold
    else if (buildingLower.includes("푸르지오")) autoTheme = COLORS[2]; // Green
    else if (buildingLower.includes("힐스") || buildingLower.includes("현대")) autoTheme = COLORS[3]; // Burgundy
    else if (buildingLower.includes("아크로") || buildingLower.includes("자이")) autoTheme = COLORS[4]; // Orange

    // 매물 사진들 매핑
    const newImages: Record<string, any> = {};
    const photos = json.photos || [];
    if (photos.length > 0) {
      const imageSlots = [
        'mainImage', 
        'subImage1', 'subImage2', 
        'featureImage1', 'featureImage2', 'featureImage3', 'featureImage4'
      ];
      photos.forEach((ph: any, i: number) => {
        if (i < imageSlots.length) {
          newImages[imageSlots[i]] = ph.url;
        }
      });
    }

    // 복합 단지 테이블 조립
    const newSections = INITIAL_INFO.sections.map(sec => {
      if (sec.type !== 'table') return sec;
      
      const newItems = sec.items.map(item => {
        if (item.title === '세대수' && (v.total_units || v.metadata?.total_units)) return { ...item, text: `${v.total_units || v.metadata?.total_units}세대` }; // 공실등록 단지정보 (metadata.total_units, 2026-10-24)
        if (item.title === '저/최고층' && v.current_floor && v.total_floor) return { ...item, text: `${floorText(v.current_floor)}/${floorText(v.total_floor)}` };
        if (item.title === '사용승인일' && v.approval_year) return { ...item, text: `${v.approval_year}년` };
        if (item.title === '건설사' && v.constructor_name) return { ...item, text: v.constructor_name };
        if (item.title === '주소') return { ...item, text: [v.sido, v.sigungu, v.dong].filter(Boolean).join(" ") };
        if (item.title === '면적' && areaDisplay !== '-') return { ...item, text: areaDisplay };
        return item;
      });

      return { ...sec, items: newItems };
    });

    const getEnglishTradeType = (tradeType: string) => {
      switch (tradeType) {
        case '매매': return 'FOR SALE';
        case '전세': return 'FOR LEASE';
        case '월세': return 'FOR RENT';
        case '경매': return 'FOR AUCTION';
        default: return 'FOR SALE';
      }
    };

    const dongBunji = [v.dong, v.detail_addr].filter(Boolean).join(" ");
    const locationName = [dongBunji, v.building_name].filter(Boolean).join(" ");
    const autoAddress = locationName ? `${locationName}\n${priceText}` : priceText;

    const mappedInfo: PropertyInfo = {
      ...INITIAL_INFO,
      coverQRLink: shareUrl,
      promotionText: priceText,
      propertyNumber: (v.property_no || v.id || v.vacancy_id) ? `No. ${v.property_no || v.id || v.vacancy_id}` : "",
      address: autoAddress || "공실 매물 정보",
      // 5쪽 지도 — 공실 좌표로 바로 (주소 글로 다시 찾지 않아도 되게, 2026-10-24)
      ...(v.lat && v.lng ? { page5Lat: Number(v.lat), page5Lng: Number(v.lng) } : {}),
      // 등록 안 된 값은 지어내지 않는다 (남향·즉시 입주·관리비 없음 같은 추측 금지 — 2026-10-15)
      subTitle: [v.sub_category || v.property_type, v.direction, areaDisplay !== "-" ? areaDisplay : ""].filter(Boolean).join(" | "),
      transactionType: v.trade_type || "월세",
      propertyCategory: detectPropertyCategory(v.sub_category, v.property_type),
      subCategory: v.sub_category || "",
      priceMain: formatAmount(v.deposit) || "",
      priceSub: v.monthly_rent ? `${Math.round(v.monthly_rent / 10000)}만` : "",
      managementFee: v.maintenance_fee ? `${Math.round(v.maintenance_fee / 10000)}만원` : "-",
      area: areaDisplay,
      floor: `${floorText(v.current_floor) || "-"} / 총 ${floorText(v.total_floor) || "-"}`,
      direction: v.direction || "-",
      roomCount: `${v.room_count || "-"}개 / ${v.bathroom_count || "-"}개`,
      parking: v.parking || "-",
      moveInDate: v.move_in_date || "-",
      options: Array.isArray(v.options) ? v.options.join(", ") : (v.options || ""),
      
      agentName,
      isOwnerDirect: !agency?.name,
      agentRepresentative,
      agencyRepresentative,
      agentPhone,
      agentMobile,
      agentRegistrationNumber,
      agentAddress: fullAddress || "",
      agentMapUrl: fullAddress ? `https://map.naver.com/p/search/${encodeURIComponent(fullAddress)}` : "",
      consultationUrl: "",
      agentAdditionalInfo: additionalInfo,

      pageBadges: {
        ...INITIAL_INFO.pageBadges,
        page1: `${v.sub_category || "매물"} | ${v.trade_type || "매매"}`,
        page6: buildPage6Content(
          v,
          detectPropertyCategory(v.sub_category, v.property_type),
          v.trade_type || '매매'
        ).page6Badge
      },

      overviewTable: buildOverviewTable(
        v,
        detectPropertyCategory(v.sub_category, v.property_type),
        (v.trade_type || '매매') === '매매'
      ),
      ...(() => {
        const summary = buildInvestmentSummary(
          v,
          detectPropertyCategory(v.sub_category, v.property_type),
          v.trade_type || '매매'
        );
        return {
          investmentTitle: summary.sectionTitle,
          investmentSubtitle: summary.sectionSubtitle,
          investmentSummary: {
            box1Title: summary.box1Title, box1Text: summary.box1Text,
            box2Title: summary.box2Title, box2Text: summary.box2Text,
            box3Title: summary.box3Title, box3Text: summary.box3Text,
          },
        };
      })(),
      ...(() => {
        const page2 = buildPage2Content(
          v,
          detectPropertyCategory(v.sub_category, v.property_type),
          v.trade_type || '매매'
        );
        return {
          highlights: page2.highlights,
          chartBars: page2.chartBars,
          valuationText: page2.valuationText,
          page2Title: page2.page2Title,
          page2Subtitle: page2.page2Subtitle,
          page2HighlightBoxTitle: page2.page2HighlightHeader,
        };
      })(),
      ...(() => {
        const page5 = buildPage5Content(
          v,
          detectPropertyCategory(v.sub_category, v.property_type)
        );
        return {
          areaTargetName: page5.areaTargetName,
          areaTargetDesc: page5.areaTargetDesc,
          areaBox1Title: page5.areaBox1Title,
          areaBox1Text: page5.areaBox1Text,
          areaBox2Title: page5.areaBox2Title,
          areaBox2Text: page5.areaBox2Text,
          areaBox3Title: page5.areaBox3Title,
          areaBox3Text: page5.areaBox3Text,
          page4TargetTitle: page5.page4TargetTitle,
        };
      })(),
      ...(() => {
        const page6 = buildPage6Content(
          v,
          detectPropertyCategory(v.sub_category, v.property_type),
          v.trade_type || '매매'
        );
        return {
          page6Title: page6.page6Title,
          page6Subtitle: page6.page6Subtitle,
          page6FooterQuote: page6.page6FooterQuote,
          roadmap: page6.roadmap,
        };
      })(),
      noticeTitle: "PREMIUM LISTING DETAIL",
      noticeContent: v.description || "상세 설명이 등록되지 않았습니다.",
      sections: newSections
    };

    // AI 문구 자동 생성 (제미나이 호출 제거 및 규칙 기반 매핑 적용 - 로딩 0초)
    // setIsGenerating(true);
    // const aiCopy = await generateFlyerCopy(mappedInfo);
    const aiCopy = {
        promotionText: mappedInfo.promotionText,
        summary: mappedInfo.subTitle, // 서브타이틀을 요약문구로 활용
        gridInfo: {
            title: "주요 특징",
            intro: "HIGHLIGHTS",
            // 실제 등록 값으로만 (없으면 빈칸 — "탁 트인 개방감" 같은 지어낸 장점 금지)
            features: [
              v.direction ? `${v.direction}` : "",
              v.parking ? `주차 ${v.parking}` : "",
              v.move_in_date ? `입주 ${v.move_in_date}` : "",
              (Array.isArray(v.options) ? v.options.slice(0, 3).join(" · ") : String(v.options || "").split(",").slice(0, 3).join(" · ")) || "",
            ]
        },
        listInfo: {
            title: "공간 상세",
            intro: "DETAILS",
            description: "",
            items: [
                { title: "", description: "" },
                { title: "", description: "" }
            ]
        }
    };
    
    const finalSections = [...mappedInfo.sections];
    
    // Grid Section
    const gridIndex = finalSections.findIndex(s => s.type === 'grid');
    if (gridIndex !== -1 && aiCopy.gridInfo) {
      const sec = { ...finalSections[gridIndex] };
      sec.title = aiCopy.gridInfo.title || sec.title;
      sec.intro = aiCopy.gridInfo.intro || sec.intro;
      sec.items = sec.items.map((it, idx) => ({
        ...it,
        text: aiCopy.gridInfo?.features[idx] || it.text
      }));
      finalSections[gridIndex] = sec;
    }

    // List Section
    const listIndex = finalSections.findIndex(s => s.type === 'list');
    if (listIndex !== -1 && aiCopy.listInfo) {
      const sec = { ...finalSections[listIndex] };
      sec.title = aiCopy.listInfo.title || sec.title;
      sec.intro = aiCopy.listInfo.intro || sec.intro;
      sec.description = aiCopy.listInfo.description || sec.description;
      sec.items = sec.items.map((it, idx) => ({
        ...it,
        title: aiCopy.listInfo?.items[idx]?.title || it.title,
        text: aiCopy.listInfo?.items[idx]?.description || it.text
      }));
      finalSections[listIndex] = sec;
    }

    setState(prev => ({
      ...prev,
      ...newImages,
      colorTheme: autoTheme,
      // 실제 매물로 만들 수 있는 칸은 실제로, 없는 자료는 비운다 (예시 값이 남지 않게)
      info: fillFieldDefaults(scrubSampleInfo({
        ...mappedInfo,
        leaseTable: buildLeaseTable(v),
        leaseNotice: LEASE_NOTICE,
        leaseRightTitle: buildLeaseRight(v).title,
        leaseRightText: buildLeaseRight(v).text,
        floorStatus: [],
        floorStatusNotice: "",
        showChart: false,
        photoCaptions: { main: "", sub1: "", sub2: "", feat1: "", feat2: "" },
        sections: finalSections
      }, v)),
      generated: aiCopy
    }));
    
    setIsGenerating(false);
    setIsInitialized(true);
  };

  const loadVacancyDataDirectly = async (vacancyId: string) => {
    const shareUrl = typeof window !== 'undefined' ? `${SITE_ORIGIN}/report/${vacancyId}.html` : "https://gongsilnews.com";
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

        // 1. Supabase 클라우드 동기화 데이터 우선 로드
        let supabaseFlyerSettings = json.flyer?.flyer_state;
        if (supabaseFlyerSettings) {
          if ('flyer' in supabaseFlyerSettings || 'report' in supabaseFlyerSettings) {
            supabaseFlyerSettings = supabaseFlyerSettings.report;
          } else {
            // Ignore legacy flyer settings for reports
            supabaseFlyerSettings = null;
          }
        }
        if (supabaseFlyerSettings) {
          const merged = { ...mergeStateWithDefaults(supabaseFlyerSettings), isAdClosed: v.status === 'STOPPED' };
          // 항상 최신 vacancy 데이터로 overviewTable 갱신 (공실등록 수정 시 즉시 반영)
          const cat = detectPropertyCategory(v.sub_category, v.property_type);
          const isSale = (v.trade_type || '매매') === '매매';
          merged.info = {
            ...merged.info,
            overviewTable: buildOverviewTable(v, cat, isSale),
            propertyCategory: cat,
            transactionType: v.trade_type || '매매',
            subCategory: v.sub_category || "",
          };
          // 예전 저장본에 남은 예시(가짜) 값은 실제 값으로 바꾼다 (realData.ts)
          merged.info = fillFieldDefaults(scrubSampleInfo(merged.info, v));
          if (!merged.info.pageBadges) merged.info.pageBadges = {};
          if (!merged.info.pageBadges.page1 || ["FOR SALE", "FOR RENT", "FOR LEASE", "FOR AUCTION", "매매", "전세", "월세", "임대"].includes((merged.info.pageBadges.page1 || "").toUpperCase().trim())) {
            merged.info.pageBadges.page1 = `${v.sub_category || "매물"} | ${v.trade_type || "매매"}`;
          }
          // 지도 좌표가 비었으면 공실 좌표로 (주소를 공개하지 않은 공실도 5쪽 지도가 나오게, 2026-10-24)
          if (!merged.info.page5Lat && v.lat && v.lng) merged.info = { ...merged.info, page5Lat: Number(v.lat), page5Lng: Number(v.lng) };
          setState(merged);
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
            const merged = { ...mergeStateWithDefaults(savedState), isAdClosed: v.status === 'STOPPED' };
            // 항상 최신 vacancy 데이터로 overviewTable 갱신 (공실등록 수정 시 즉시 반영)
            const cat = detectPropertyCategory(v.sub_category, v.property_type);
            const isSale = (v.trade_type || '매매') === '매매';
            merged.info = {
              ...merged.info,
              overviewTable: buildOverviewTable(v, cat, isSale),
              propertyCategory: cat,
              transactionType: v.trade_type || '매매',
              subCategory: v.sub_category || "",
            };
            merged.info = fillFieldDefaults(scrubSampleInfo(merged.info, v));
            if (!merged.info.pageBadges) merged.info.pageBadges = {};
            if (!merged.info.pageBadges.page1 || ["FOR SALE", "FOR RENT", "FOR LEASE", "FOR AUCTION", "매매", "전세", "월세", "임대"].includes((merged.info.pageBadges.page1 || "").toUpperCase().trim())) {
              merged.info.pageBadges.page1 = `${v.sub_category || "매물"} | ${v.trade_type || "매매"}`;
            }
            if (!merged.info.page5Lat && v.lat && v.lng) merged.info = { ...merged.info, page5Lat: Number(v.lat), page5Lng: Number(v.lng) };
            setState(merged);
            setIsLoadedFromStorage(true);
            setIsInitialized(true);
            setLoadingData(false);
            return;
          } catch (e) {
            console.error("로컬 저장소 데이터 로드 실패, 새로 생성합니다:", e);
          }
        }
        
        applyVacancy(v, json, shareUrl);
      }
    } catch (err) {
      console.error("공실 데이터 연동 오류:", err);
    } finally {
      setLoadingData(false);
    }
  };

  /* 공실 없이 만든 보고서 열기 — 저장본 → (저장 안 한 고침이 있으면 물어보고) → 처음이면 정리한 매물 정보로 틀 채우기 */
  const loadLocalReport = async (localId: string) => {
    const bridge = studioReportBridge();
    if (!bridge) {
      alert("공실 없이 만든 매물보고서는 공실스튜디오 앱에서 열 수 있어요.");
      setIsInitialized(true);
      return;
    }
    setLoadingData(true);
    try {
      const d = await bridge.get(localId);
      vacancyMetaRef.current = { title: d.title };
      let draft: any = null;
      try {
        const raw = localStorage.getItem(`easyflyer_saved_${localId}`);
        if (raw) draft = JSON.parse(raw);
      } catch {}
      if (draft && JSON.stringify(draft) !== JSON.stringify(d.state)
        && window.confirm("저장하지 않은 고친 내용이 있어요. 이어서 고칠까요?\n[취소]를 누르면 마지막으로 저장한 보고서를 엽니다.")) {
        setState(mergeStateWithDefaults(draft));
        hasUnsavedChangesRef.current = true;
        setIsLoadedFromStorage(true);
        setIsInitialized(true);
        return;
      }
      try { localStorage.removeItem(`easyflyer_saved_${localId}`); } catch {}
      if (d.state) {
        setState(mergeStateWithDefaults(d.state));
        setIsLoadedFromStorage(true);
        setIsInitialized(true);
        return;
      }
      // 처음 — 붙여넣은 글을 정리한 정보·넣은 사진으로. 중개사 정보는 로그인한 회원 것
      const me = await fetch('/api/vacancy/detail').then((r) => r.json()).catch(() => ({}));
      applyVacancy(d.vacancy || {}, { currentMember: me?.currentMember, photos: (d.photos || []).map((url) => ({ url })) }, "");
    } catch (e: any) {
      alert("보고서를 열지 못했습니다: " + String(e?.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, ""));
      setIsInitialized(true);
    } finally {
      setLoadingData(false);
    }
  };

  /* 공실 없이 만든 보고서 저장 — PC (앱). Ctrl+S 는 예전 화면 값을 쥐고 있을 수 있어 늘 최신 상태(stateRef)로 */
  const stateRef = useRef(state);
  stateRef.current = state;
  const saveLocalReport = async (showDone: boolean) => {
    const localId = getLocalId();
    const bridge = studioReportBridge();
    if (!localId || !bridge) return false;
    setIsSavingCloud(true);
    try {
      // 홈 [AI 매물보고서] 카드에 보일 표지 그림 (2026-10-30 사장님) — 못 찍어도 저장은 한다
      let thumb = "";
      try { thumb = await captureCover(); } catch {}
      await bridge.save({ id: localId, state: stateRef.current, ...(thumb ? { thumb } : {}) });
      try { localStorage.removeItem(`easyflyer_saved_${localId}`); } catch {}
      hasUnsavedChangesRef.current = false;
      setIsLoadedFromStorage(true);
      if (showDone) alert("PC에 저장했습니다. 공실마케팅 › AI 매물보고서에서 다시 열 수 있어요.");
      return true;
    } catch (e: any) {
      alert("저장하지 못했습니다: " + String(e?.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, ""));
      return false;
    } finally {
      setIsSavingCloud(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vacancyId = params.get("vacancy_id");
    const localId = getLocalId();

    if (localId) {
      loadLocalReport(localId);
    } else if (vacancyId) {
      loadVacancyDataDirectly(vacancyId);
    } else {
      // 매물 ID 없이 열었을 때도 로그인한 중개사 본인 정보를 자동으로 채움
      fetch('/api/vacancy/detail')
        .then(res => res.json())
        .then(json => {
          if (json.currentMember) {
            const m = json.currentMember;
            const ag = Array.isArray(m.agencies) ? m.agencies[0] : m.agencies;
            const fullAddr = [ag?.address || m.address, ag?.address_detail || m.address_detail].filter(Boolean).join(" ");
            setState(prev => ({
              ...prev,
              info: {
                ...prev.info,
                agentName: ag?.name || m.company_name || m.name || "",
                isOwnerDirect: !ag?.name,
                agentRepresentative: m.name || ag?.ceo_name || "",
                agencyRepresentative: ag?.ceo_name || m.name || "",
                agentPhone: ag?.phone || m.phone || "",
                agentMobile: m.cellphone || m.phone || ag?.cell || "",
                agentRegistrationNumber: ag?.reg_num || m.company_reg_no || "",
                agentAddress: fullAddr || "",
              }
            }));
          }
          setIsInitialized(true);
        })
        .catch(() => {
          setIsInitialized(true);
        });
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
      const target = e.target as HTMLElement;
      if (
        sharePopoverRef.current && 
        !sharePopoverRef.current.contains(target) &&
        !target.closest(".share-popover-content")
      ) {
        setShowSharePopover(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showSharePopover]);

  const handleSaveToStorageQuietly = async () => {
    if (getLocalId()) { await saveLocalReport(false); return; }
    const params = new URLSearchParams(window.location.search);
    const vacancyId = params.get("vacancy_id");
    if (!vacancyId) return;
    localStorage.setItem(`easyflyer_saved_${vacancyId}`, JSON.stringify(state));
    setIsLoadedFromStorage(true);
    try {
      const htmlContent = await generateHtmlContent();
      await fetch("/api/vacancy/save-flyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vacancyId, flyerState: { ...state, htmlContent, coverThumb: await captureCover().catch(() => "") }, type: "report" })
      });
    } catch (err) {
      console.warn("Silent cloud save failed:", err);
    }
  };

  const handleKakaoShare = async () => {
    const Kakao = (window as any).Kakao;
    if (!Kakao || !Kakao.isInitialized()) {
      alert("카카오 SDK 로드 중입니다. 잠시 후 시도해 주세요.");
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const vacancyId = params.get("vacancy_id");
    if (!vacancyId) return;

    const shareUrl = `${SITE_ORIGIN}/report/${vacancyId}.html`;
    
    // First, save the current flyer state before sharing
    await handleSaveToStorageQuietly();

    // 보고서에 들어간 중개사무소 이름으로 "○○에서 제공하는 검증된 물건 보고서입니다".
    // 홍보 문구와 관계없이 항상 이 문장 (카톡 카드 설명은 두 줄 정도만 보인다)
    const agent = state.info.agentName;
    const provider = agent && agent !== "공실뉴스 중개소" ? agent : "공실뉴스";
    const shareLine = state.info.isOwnerDirect && agent
      ? `집주인 ${agent}님이 직접 내놓은 물건 보고서입니다.`
      : `${provider}에서 제공하는 검증된 물건 보고서입니다.`;

    Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: state.info.address || "물건보고서",
        description: shareLine,
        imageUrl: state.mainImage || "https://gongsilnews.com/logo.png",
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [
        { title: "물건보고서 열람하기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } },
      ],
    });
    setShowSharePopover(false);
  };

  const handleCopyUrl = async () => {
    const params = new URLSearchParams(window.location.search);
    const vacancyId = params.get("vacancy_id");
    if (!vacancyId) {
      alert("공실 ID를 찾을 수 없습니다.");
      return;
    }
    
    // Save first
    await handleSaveToStorageQuietly();

    const shareUrl = `${SITE_ORIGIN}/report/${vacancyId}.html`;
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

  // 자동 임시저장 및 변경사항 추적
  useEffect(() => {
    if (!isInitialized || loadingData || isGenerating) return;
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }
    hasUnsavedChangesRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const vacancyId = params.get("vacancy_id") || getLocalId();
    if (vacancyId) {
      // 공실 없는 보고서는 사진이 그림 데이터라 클 수 있다 — 브라우저 저장 칸이 넘치면 임시본만 못 남긴다
      try { localStorage.setItem(`easyflyer_saved_${vacancyId}`, JSON.stringify(state)); } catch (e) { console.warn("임시 저장 실패:", e); }
    }
  }, [state, loadingData, isGenerating, isInitialized]);

  // 브라우저 탭/창 닫기(X) 또는 새로고침 시 이탈 방지 경고창
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChangesRef.current) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const handleSaveToStorage = async () => {
    if (getLocalId()) { await saveLocalReport(true); return; }
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
        body: JSON.stringify({ vacancyId, flyerState: { ...state, htmlContent, coverThumb: await captureCover().catch(() => "") }, type: "report" })
      });
      const json = await res.json();
      if (json.success) {
        hasUnsavedChangesRef.current = false;
        alert("성공적으로 저장되었습니다");
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
        body: JSON.stringify({ vacancyId, flyerState: { ...state, htmlContent, coverThumb: await captureCover().catch(() => "") }, type: "report" })
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "서버 응답 오류");
      }
      hasUnsavedChangesRef.current = false;
    } catch (err: any) {
      console.warn("클라우드 동기화 저장 실패:", err);
    } finally {
      setIsSavingCloud(false);
    }

    // 2. 공유 고유 URL 주소 빌드 (html 확장자 유지)
    const shareUrl = `${SITE_ORIGIN}/report/${vacancyId}.html`;
    
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
    fill: (opts: { kind: string; vacancyId: string; fields: Record<string, unknown>; facts?: Record<string, unknown>; publicFacts?: string; request?: string }) => Promise<Record<string, any>>;
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
  /* 앱 안이면 저장 창 없이 문서\공실스튜디오\<매물 이름_공실번호>\매물보고서\ 에 바로 저장 (2026-10-15 사장님 회의).
     웹에서는 false — 예전처럼 브라우저 다운로드. */
  const saveToStudio = async (fileName: string, dataUrl: string): Promise<boolean> => {
    const id = new URLSearchParams(window.location.search).get("vacancy_id") || getLocalId();
    if (!id || !studioMarketing?.saveFile) return false;
    try {
      await studioMarketing.saveFile({ id, sub: '매물보고서', fileName, dataUrl, hint: vacancyMetaRef.current });
      return true;
    } catch (e: any) {
      alert("내 저장 폴더에 저장하지 못했습니다: " + (e?.message || e) + "\n대신 다운로드로 받습니다.");
      return false;
    }
  };
  const [aiProgress, setAiProgress] = useState("");
  /* [지적도·대장·층별·실거래 가져오기]로 받아 둔 사실을 AI 에게 줄 짧은 글로 (2026-10-24 사장님: AI 가 실제 자료를 근거로 쓰게) */
  const publicFactsText = (info: any): string => {
    const land = info.landInfo, t = info.tradeInfo;
    if (!land && !t) return "";
    const L: string[] = [];
    const m2 = (v: any) => (v ? `${Number(v).toLocaleString('ko-KR')}㎡(${(Number(v) / 3.3058).toFixed(1)}평)` : "");
    const d8 = (s: string) => (/^\d{8}$/.test(s || "") ? `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6)}` : s || "");
    const man = (v: any) => (v == null ? "" : Number(v) >= 10000 ? `${(Number(v) / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}억 원` : `${Number(v).toLocaleString('ko-KR')}만 원`);
    if (land?.jibunAddr) L.push(`- 소재지(지번): ${land.jibunAddr}${land.roadAddr ? ` / 도로명: ${land.roadAddr}` : ""}`);
    const target = land?.parcels?.find((p: any) => p.pnu === land.pnu);
    if (target?.jibun) L.push(`- 지목: ${String(target.jibun).replace(/^[\d-]+\s*/, "")}`);
    const z = t?.permits?.[0]?.zoning; if (z) L.push(`- 용도지역: ${z}`);
    const b = land?.buildings?.[0];
    if (b) {
      L.push(`- 건축물대장: ${[b.kind, b.purpose, b.etcPurpose && `(${b.etcPurpose})`, b.structure].filter(Boolean).join(" · ")}`);
      L.push(`- 면적: 대지 ${m2(b.platArea)} · 건축 ${m2(b.archArea)} · 연면적 ${m2(b.totArea)}${b.bcRat ? ` · 건폐율 ${b.bcRat}%` : ""}${b.vlRat ? ` · 용적률 ${b.vlRat}%` : ""}`);
      L.push(`- 규모: ${[b.grndFlr && `지상 ${b.grndFlr}층`, b.ugrndFlr && `지하 ${b.ugrndFlr}층`, b.height && `높이 ${b.height}m`, b.households && `${b.households}세대`, b.families && `${b.families}가구`, b.elevators && `승강기 ${b.elevators}대`, b.parking && `주차 ${b.parking}대`].filter(Boolean).join(" · ")}`);
      if (b.useAprDay) L.push(`- 사용승인일: ${d8(b.useAprDay)}`);
    }
    // 아파트·오피스텔 — 단지 전체 · 이 매물 호실
    const cx = land?.complex, ux = land?.unit;
    if (cx) L.push(`- 단지(건물) 전체: ${[cx.name, cx.dongs && `${cx.dongs}개 동`, cx.households && `${cx.households}세대`, cx.totArea && `연면적 ${m2(cx.totArea)}`, cx.parking && `주차 ${cx.parking}대`, cx.useAprDay && `사용승인 ${d8(cx.useAprDay)}`].filter(Boolean).join(" · ")}`);
    const ty = info.typeInfo?.types || [];
    if (ty.length) {
      const main = [...ty].sort((a: any, b: any) => b.count - a.count)[0];
      const mine = ux?.exclusive ? ty.find((x: any) => Math.abs(x.exclusive - ux.exclusive) < 0.01) : null;
      L.push(`- 타입 구성(건축물대장 전유부, 같은 지번 ${info.typeInfo.counted}세대): ${ty.map((x: any) => `전용 ${x.exclusive}㎡${x.supply ? `(공급 ${x.supply}㎡)` : ""} ${x.count}세대`).join(", ")} · 가장 많은 타입 전용 ${main.exclusive}㎡${mine ? ` · 이 매물은 전용 ${mine.exclusive}㎡ 타입(${mine.count}세대)` : ""}`);
    }
    if (ux) L.push(`- 이 매물 호실:${[ux.dong, ux.ho && `${ux.ho}호`, ux.floor, ux.purpose, ux.exclusive && `전용 ${m2(ux.exclusive)}`, ux.common && `공용 ${m2(ux.common)}`].filter(Boolean).join(" · ")}`);
    if (t?.floors?.length) L.push(`- 층별 용도: ${t.floors.slice(0, 12).map((f: any) => `${f.floor} ${f.purpose}${f.area ? ` ${f.area}㎡` : ""}`).join("; ")}`);
    if (t?.permits?.length) L.push(`- 건축 인허가: ${t.permits.slice(0, 5).map((p: any) => `${d8(p.permitDay)} ${p.kind}`).join("; ")}`);
    if (t) {
      const hist = (t.history || []).filter((h: any) => !h.cancelled).slice(-5);
      L.push(hist.length
        ? `- 이 건물 매매 실거래(${t.kindLabel}): ${hist.map((h: any) => `${h.date} ${man(h.amount)}${h.perPyeong ? ` (${t.chart?.basis} 평당 ${man(h.perPyeong)})` : ""}`).join("; ")}`
        : `- 이 건물 매매 실거래: 최근 ${t.rentChart ? 5 : 10}년 신고 없음`);
      const pts = t.chart?.points || [];
      if (pts.length) L.push(`- 주변시세(${t.chart.scope} ${t.kindLabel} ${t.rentChart ? "전세" : "매매"}, ${t.chart.basis} 평당 ${t.rentChart ? "보증금" : "가격"} 중앙값, 반기별): ${pts.map((p: any) => `${p.label} ${p.value.toLocaleString('ko-KR')}만 원(${p.count}건)`).join(", ")}`);
      const ex = (t.examples || []).slice(0, 3);
      if (ex.length) L.push(`- ${t.parcel?.dong || ""} 최근 비슷한 거래: ${ex.map((h: any) => `${h.date} ${t.rentChart ? (h.monthly ? `보증금 ${man(h.deposit)}/월 ${h.monthly}만 원` : `전세 ${man(h.deposit)}`) : man(h.amount)}`).join("; ")}`);
    }
    // 중개사가 8·9쪽 표에서 고친 값 — 받은 값보다 먼저
    const fix = Object.entries(info.publicEdits || {}).filter(([k, v]) => /^p[89]\./.test(k) && !/others$/.test(k) && String(v).trim()).map(([k, v]) => `${k.slice(3)}: ${String(v).slice(0, 80)}`);
    if (fix.length) L.push(`- 중개사가 고친 값(위 값보다 이것을 따를 것): ${fix.slice(0, 15).join("; ")}`);
    return L.join("\n");
  };
  const runAiFill = async (kind: "flyer" | "report", fields: Record<string, unknown>, apply: (out: Record<string, any>) => void, infoOverride?: any, request?: string) => {
    const vacancyId = new URLSearchParams(window.location.search).get("vacancy_id") || getLocalId();
    if (!vacancyId || !studioMarketing) return;
    setAiProgress("AI에 요청하는 중…");
    const off = studioMarketing.onProgress?.((t) => setAiProgress(t));
    // 공실 없는 보고서: 회원이 화면에서 넣은 값이 곧 매물 정보다
    const i: any = infoOverride || state.info;
    const facts = getLocalId() ? {
      "주소·이름": i.address, "가격": i.promotionText, "거래 구분": i.transactionType, "매물 종류": i.subCategory, "면적": i.area, "층": i.floor,
      "방향": i.direction, "방·욕실": i.roomCount, "주차": i.parking, "입주": i.moveInDate, "관리비": i.managementFee, "옵션": i.options, "중개사 설명": i.noticeContent,
    } : undefined;
    try {
      const out = await studioMarketing.fill({ kind, vacancyId, fields, facts, publicFacts: kind === "report" ? publicFactsText(i) : undefined, ...(request ? { request } : {}) });
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

  /* [AI로 채우기] — 페이지마다 문장 칸 (숫자·표·사진은 그대로) */
  const REPORT_TEXT_KEYS = [
    "coverTitle", "coverSubtitle", "subTitle", "highlights", "valuationText", "page2HighlightBoxTitle",
    "areaTargetName", "areaTargetDesc", "areaBox1Title", "areaBox1Text", "areaBox2Title", "areaBox2Text", "areaBox3Title", "areaBox3Text",
    "page4TargetTitle", "page6FooterQuote", "noticeContent", "chartAdviseText", "leaseRightTitle", "leaseRightText",
  ];
  /* 쪽별 [AI 수정 요청] — 그 쪽 글 칸만 사장님 요청대로 다시 쓴다 (2026-10-25 사장님) */
  const REPORT_PAGE_KEYS: Record<number, string[]> = {
    0: ["coverSubtitle"],
    1: ["subTitle", "investmentSummary"],
    2: ["page2HighlightBoxTitle", "highlights", "valuationText", "chartAdviseText"],
    5: ["page4TargetTitle", "areaTargetName", "areaTargetDesc", "areaBox1Title", "areaBox1Text", "areaBox2Title", "areaBox2Text", "areaBox3Title", "areaBox3Text"],
    6: ["roadmap", "page6FooterQuote"],
  };
  const handleAiFill = async (page?: number, request?: string) => {
    const only = page === undefined ? null : REPORT_PAGE_KEYS[page];
    const want = (k: string) => !only || only.includes(k);
    let info: any = state.info;
    // 지적도·대장·층별·실거래가 없거나 30일이 지났으면 먼저 받는다 (받는 중이면 기다린다) — AI 가 그 자료를 근거로 쓰게 (2026-10-24)
    if (studioMarketing && new URLSearchParams(window.location.search).get("vacancy_id") && (publicStale(info) || publicRun.current)) {
      setAiProgress("지적도·건축물대장·층별 현황·실거래가를 채우는 중…");
      const got = await fetchPublic({ silent: true });
      if (got) info = got;
    }
    const fields: Record<string, unknown> = {};
    for (const k of REPORT_TEXT_KEYS) {
      if (!want(k)) continue;
      const v = info[k];
      if ((typeof v === "string" && v.trim()) || (Array.isArray(v) && v.length)) fields[k] = v;
    }
    // 비어 있으면 화면이 틀 문구를 대신 보여 주는 칸 — 그 틀 문구를 보내 같이 다시 쓰게 한다
    if (want("chartAdviseText") && !fields.chartAdviseText) fields.chartAdviseText = "본 자산의 시세는 최근 실거래가 및 시장 동향을 반영하여 산출되었습니다. 입지 조건에 따른 프리미엄이 내재되어 있어 향후 가치 상승이 기대됩니다.";
    if (want("page6FooterQuote") && !fields.page6FooterQuote) fields.page6FooterQuote = '"최고의 입지에 미래 가치를 더합니다."';
    const pickText = (o: any) => Object.fromEntries(Object.entries(o || {}).filter(([k, v]) => /(Title|Text)$/.test(k) && typeof v === "string"));
    if (want("investmentSummary") && info.investmentSummary) fields.investmentSummary = pickText(info.investmentSummary);
    // 로드맵은 화면·입력란이 보는 목록(roadmapList)을 보낸다 — 예전엔 roadmap 칸에만 써서 한 번 고친 보고서는 AI 글이 안 보였다 (2026-10-25)
    const rmList = roadmapItems(info);
    if (want("roadmap") && rmList.length) fields.roadmap = Object.fromEntries(rmList.flatMap((it, n) => [[`box${n + 1}Title`, it.title], [`box${n + 1}Text`, it.text]]));
    runAiFill("report", fields, (out) => {
      pushToHistoryInstant(state);
      setState((prev) => {
        const p: any = prev.info;
        return {
          ...prev,
          info: {
            ...prev.info,
            ...out,
            investmentSummary: out.investmentSummary ? { ...p.investmentSummary, ...out.investmentSummary } : p.investmentSummary,
            roadmap: out.roadmap ? { ...p.roadmap, ...out.roadmap } : p.roadmap,
            roadmapList: out.roadmap ? roadmapItems(p).map((it, n) => ({ ...it, title: out.roadmap[`box${n + 1}Title`] ?? it.title, text: out.roadmap[`box${n + 1}Text`] ?? it.text })) : p.roadmapList,
          },
        };
      });
    }, info, request);
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
      isInitialLoadRef.current = true;
      hasUnsavedChangesRef.current = false;

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
            body: JSON.stringify({ vacancyId, flyerState: null, type: "report" }) // null 전달하여 삭제
          });
        }
      } catch (e) {
        console.error("클라우드 데이터 초기화 실패:", e);
      }

      // 3. 처음부터 AI 재생성 로드
      await loadVacancyDataDirectly(vacancyId);
    }
  };

  /* [공실뉴스 캡처 사진 넣기] — 앱이 공실뉴스 분석·캡처 때 찍어 둔 공실열람 검증·지도·로드뷰를 사진 쪽 빈 칸에 넣는다.
     칸이 모자라면 사진 쪽을 늘린다 (최대 5쪽, 2026-10-24 사장님). 앱 안 틀(iframe)이라 바깥 창의 gongsilStudio.vacancy 를 쓴다 */
  const captureBridge = (): { captures: (id: string) => Promise<{ kind: string; label: string; dataUrl: string }[]> } | null => {
    try {
      const v = (window.parent as any)?.gongsilStudio?.vacancy || (window as any).gongsilStudio?.vacancy;
      return v && typeof v.captures === 'function' ? v : null;
    } catch {
      return null;
    }
  };
  const [capturesBusy, setCapturesBusy] = useState("");
  const insertCaptures = async () => {
    const b = captureBridge();
    const vacancyId = new URLSearchParams(window.location.search).get("vacancy_id") || "";
    if (!b || !vacancyId) return;
    setCapturesBusy("캡처 사진을 가져오는 중…");
    try {
      const caps = await b.captures(vacancyId);
      if (!caps.length) {
        alert("이 공실을 공실뉴스에서 [분석·캡처]한 사진이 없어요.\n뉴스·SNS자동화 → 공실뉴스에서 이 공실을 먼저 분석·캡처해 주세요.");
        return;
      }
      // 빈 칸 찾기 (1쪽부터) — 모자라면 쪽을 늘린다
      const empty: { key: string; captionKey: string; page: number }[] = [];
      for (let page = 1; page <= MAX_PHOTO_PAGES && empty.length < caps.length; page++) {
        photoPageKeys(page).forEach((key, i) => {
          if (!state[key] && empty.length < caps.length) empty.push({ key, captionKey: page === 1 ? ['main', 'sub1', 'sub2', 'feat1', 'feat2'][i] : `p${page}_${i + 1}`, page });
        });
      }
      if (!empty.length) {
        alert(`사진 칸이 가득 찼어요 (사진 쪽 ${MAX_PHOTO_PAGES}쪽). 사진을 몇 장 지운 뒤 다시 눌러 주세요.`);
        return;
      }
      const pages = Math.max(photoPageCount(state.info), ...empty.map((e) => e.page));
      const captions = { ...(state.info.photoCaptions || {}) };
      empty.forEach((e, i) => { captions[e.captionKey] = caps[i].label; });
      handleInfoChange({ ...state.info, photoPageCount: pages, photoCaptions: captions } as any);
      for (let i = 0; i < empty.length; i++) {
        setCapturesBusy(`캡처 사진 넣는 중… (${i + 1}/${empty.length})`);
        const blob = await (await fetch(caps[i].dataUrl)).blob();
        await handleImageUpload(empty[i].key, new File([blob], `${caps[i].kind}.jpg`, { type: blob.type || "image/jpeg" }));
      }
      if (empty.length < caps.length) alert(`사진 칸이 모자라 ${empty.length}장만 넣었어요.`);
    } catch (e: any) {
      alert("캡처 사진을 넣지 못했어요: " + (e?.message || e));
    } finally {
      setCapturesBusy("");
    }
  };

  /* [지적도·대장·층별·실거래 가져오기] (2026-10-24 사장님)
     공실 좌표로 서버(/api/report/land · /api/report/trades)에서 받아 info.landInfo · info.tradeInfo 에 넣는다.
     - 보고서를 처음 열 때(아직 없으면) 뒤에서 저절로 · [AI로 채우기] 때 없거나 30일 지났으면 다시 · 버튼으로 직접
     - 매물 종류별 쪽 구성은 처음 한 번만 (이미 저장된 보고서를 저절로 받을 때는 받은 쪽만 켠다)
     - 받는 동안 회원이 고친 칸을 덮지 않게, 끝나면 그때 화면(prev)에 받은 것만 얹는다
     돌려줌: 받은 뒤의 info (못 받았으면 null) */
  const [landBusy, setLandBusy] = useState("");
  const [typeBusy, setTypeBusy] = useState(false);
  const publicRun = useRef<Promise<any> | null>(null);
  const PUBLIC_MAX_AGE = 30 * 864e5;
  const fetchPublic = (opts: { silent?: boolean } = {}): Promise<any> => {
    if (publicRun.current) return publicRun.current; // 이미 받는 중이면 그것을 기다린다
    const say = (m: string) => { if (!opts.silent) alert(m); };
    const run = (async () => {
      const vacancyId = new URLSearchParams(window.location.search).get("vacancy_id") || "";
      if (!vacancyId) { say("등록한 공실로 만든 보고서에서만 가져올 수 있어요."); return null; }
      setLandBusy("지적도·건축물대장을 채우는 중…");
      try {
        const d = await fetch(`/api/vacancy/detail?id=${vacancyId}`).then((r) => r.json());
        const v = d?.data || {};
        if (!v.lat || !v.lng) { say("이 공실의 위치(좌표)가 없어요. 공실등록에서 주소를 다시 저장해 주세요."); return null; }
        const q = `lat=${v.lat}&lng=${v.lng}`;
        const land = await fetch(`/api/report/land?${q}&type=${encodeURIComponent(v.property_type || "")}&sub=${encodeURIComponent(v.sub_category || "")}&dong=${encodeURIComponent(v.apt_dong || "")}&ho=${encodeURIComponent(v.hosu || "")}`).then((r) => r.json());
        if (!land.ok) { say(land.error || "가져오지 못했어요."); return null; }
        setLandBusy("층별 현황·실거래가를 채우는 중… (처음엔 1분쯤)");
        const trade = await fetch(`/api/report/trades?${q}&type=${encodeURIComponent(v.property_type || "")}&sub=${encodeURIComponent(v.sub_category || "")}&trade=${encodeURIComponent(v.trade_type || "")}`)
          .then((r) => r.json()).catch(() => null);
        const t = trade?.ok ? trade : null;
        const has: Record<number, boolean> = {
          8: !!land.parcels?.length, 9: !!land.buildings?.length, 10: !!t?.floors?.length, 11: !!(t?.history?.length || t?.examples?.length),
        };
        pushToHistoryInstant(stateRef.current);
        const info0: any = stateRef.current.info; // 받는 동안 회원이 고친 것까지 들어 있는 최신 화면 값
        let vis = [...(info0.visiblePages || [0, 1, 2, 3, 4, 5, 6, 7])];
        // 매물 종류별 쪽 구성 (사장님 표) — 처음 한 번만. 이미 저장된 보고서를 저절로 받을 때는 회원이 고른 쪽을 그대로 둔다
        if (!info0.publicPreset && t && !(opts.silent && isLoadedFromStorage)) {
          const k = t.kind;
          const base = k === 'Apt' || k === 'Offi' ? [0, 1, 2, 4, 5, 6, 9, 11, 7]
            : k === 'Land' ? [0, 1, 2, 4, 5, 6, 8, 11, 7]
            : k === 'SH' || k === 'RH' ? [0, 1, 2, ...(String(v.sub_category || '').includes('다가구') ? [3] : []), 4, 5, 6, 8, 9, 10, 11, 7]
            : [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 7];
          vis = base.filter((p) => p < 8 || has[p]);
        } else {
          [8, 9, 10, 11].forEach((p) => { if (has[p] && !vis.includes(p) && !info0.publicPreset) vis.push(p); });
        }
        // 2쪽 주변시세 그래프 — 반기별 평당가 중앙값 (실제 거래). 회원이 그래프를 고쳤으면(chartEdited) 그대로 둔다
        const pts = t?.chart?.points || [];
        const chart = pts.length >= 2 && !info0.chartEdited ? {
          showChart: true,
          chartBars: pts.map((p: any, i: number) => ({ label: p.label, value: `${Number(p.value).toLocaleString('ko-KR')}만원`, isHighlight: i === pts.length - 1 })),
          page2ChartBoxTitle: `주변시세 리포트 · ${t.chart.scope}`,
          chartAdviseText: `${t.chart.scope} ${t.kindLabel} ${t.rentChart ? '전세' : '매매'} 실거래의 ${t.chart.basis} 평당 ${t.rentChart ? '보증금' : '가격'} 중앙값(만원, 반기별)입니다. 최근 구간 ${pts[pts.length - 1].value.toLocaleString('ko-KR')}만원/평 (${pts[pts.length - 1].count}건 기준). 자료: 국토교통부 실거래가 공개 자료.`,
        } : {};
        const patch = { landInfo: land, tradeInfo: t || info0.tradeInfo, visiblePages: vis, publicPreset: true, ...chart };
        setState((prev) => ({ ...prev, info: { ...prev.info, ...patch } as any }));
        // 아파트·오피스텔 9쪽 타입 구성 — 큰 단지는 1~2분이라 기다리지 않고 뒤에서 따로 (다 세면 그 표만 채운다)
        if (land.multiUnit && (!opts.silent || !info0.typeInfo)) fetchTypes(q);
        const next = { ...info0, ...patch };
        if (!t) say("지적도·건축물대장은 넣었어요. 층별 현황·실거래가는 받지 못했어요. 잠시 뒤 [지적도·대장·층별·실거래 새로 채우기]를 눌러 주세요.");
        return next;
      } catch (e: any) {
        say("가져오지 못했어요: " + (e?.message || e));
        return null;
      } finally {
        setLandBusy("");
        publicRun.current = null;
      }
    })();
    publicRun.current = run;
    return run;
  };
  /* 9쪽 타입 구성 (아파트·오피스텔) — 같은 지번 전유부를 모두 세어서. 큰 단지는 1~2분이라 따로 뒤에서 */
  const fetchTypes = (q: string) => {
    setTypeBusy(true);
    fetch(`/api/report/types?${q}`).then((r) => r.json()).then((ty) => {
      if (ty?.ok) setState((prev) => ({ ...prev, info: { ...prev.info, typeInfo: { types: ty.types, counted: ty.counted, fetchedAt: ty.fetchedAt } } as any }));
    }).catch(() => {}).finally(() => setTypeBusy(false));
  };
  const fetchLand = () => { void fetchPublic(); };

  /* 12·13쪽 인테리어·리모델링 전후 — 보고서 안에서 바로 AI시뮬레이션 (2026-10-24 사장님)
     앱의 시뮬레이션(gongsilStudio.sim)으로 돌리고, 지금 모습·예측 그림은 보고서 사진처럼 서버에 올려 info.simInfo[kind] 에 */
  const [simBusy, setSimBusy] = useState("");
  const storeSimImage = async (dataUrl: string, name: string): Promise<string> => {
    const blob = await (await fetch(dataUrl)).blob();
    const small = await compressToWebP(new File([blob], name, { type: blob.type || "image/jpeg" }), 0.85);
    if (getLocalId()) return await new Promise<string>((resolve, reject) => { const fr = new FileReader(); fr.onload = () => resolve(String(fr.result)); fr.onerror = () => reject(new Error("그림을 읽지 못했어요.")); fr.readAsDataURL(small); });
    return await uploadImageToServer(small, new URLSearchParams(window.location.search).get("vacancy_id") || "unknown");
  };
  const putSim = async (kind: SimKind, simId: string) => {
    const b = simBridge();
    if (!b) throw new Error("앱에서만 쓸 수 있어요.");
    const [s, media] = await Promise.all([b.get(simId), b.reportMedia(simId)]);
    const r: any = s?.result;
    if (!r) throw new Error("이 시뮬레이션에는 아직 결과가 없어요.");
    setSimBusy(`${SIM_LABEL[kind]} 전후 사진을 넣는 중…`);
    const before = media.before ? await storeSimImage(media.before, "before.jpg") : null;
    const first = media.after.find((a) => a.image);
    const after = first ? [{ ...first, image: await storeSimImage(first.image as string, "after.jpg") }] : [];
    const data: SimData = { simId, kind, before, after, roomName: r.roomName || "", dateText: r.dateText || "", design: r.design || {}, cost: r.cost || null, disclaimer: r.disclaimer || "", fetchedAt: new Date().toISOString() };
    const p = SIM_PAGE[kind];
    pushToHistoryInstant(stateRef.current);
    setState((prev) => {
      const info: any = { ...prev.info };
      delete info[`p${p}Cost`]; delete info[`p${p}CostBasis`]; // 새 결과에는 새 공사비
      const vis: number[] = info.visiblePages || [];
      return { ...prev, info: { ...info, simInfo: { ...(info.simInfo || {}), [kind]: data }, visiblePages: vis.includes(p) ? vis : [...vis, p] } };
    });
  };
  const applySim = async (kind: SimKind, simId: string) => {
    setSimBusy(`${SIM_LABEL[kind]} 결과를 넣는 중…`);
    try { await putSim(kind, simId); } catch (e) { alert("넣지 못했어요: " + cleanErr(e)); } finally { setSimBusy(""); }
  };
  const runSim = async (kind: SimKind, simId: string) => {
    const b = simBridge();
    if (!b) return;
    setSimBusy(`${SIM_LABEL[kind]} AI시뮬레이션 준비 중…`);
    const off = b.onProgress((t) => setSimBusy(`${SIM_LABEL[kind]} AI시뮬레이션 · ${t}`));
    try {
      await b.run(simId);
      off();
      await putSim(kind, simId);
    } catch (e) {
      alert("AI시뮬레이션을 하지 못했어요: " + cleanErr(e));
    } finally {
      off();
      setSimBusy("");
    }
  };
  /** 받아 둔 자료가 없거나 30일이 지났는가 */
  const publicStale = (info: any) => !info?.tradeInfo?.fetchedAt || Date.now() - new Date(info.tradeInfo.fetchedAt).getTime() > PUBLIC_MAX_AGE;
  // 보고서를 처음 열 때 — 아직 받지 않았으면 뒤에서 저절로 (편집은 계속 할 수 있다)
  const autoPublicDone = useRef(false);
  useEffect(() => {
    if (!isInitialized || autoPublicDone.current) return;
    if (!new URLSearchParams(window.location.search).get("vacancy_id")) return;
    autoPublicDone.current = true;
    const info: any = state.info;
    if (!info.landInfo || !info.tradeInfo) void fetchPublic({ silent: true });
    else if (info.landInfo.multiUnit && !info.typeInfo) {
      // 타입 구성이 생기기 전에 만든 아파트 보고서 — 그것만 받는다
      const id = new URLSearchParams(window.location.search).get("vacancy_id") || "";
      fetch(`/api/vacancy/detail?id=${id}`).then((r) => r.json()).then((d) => { const v = d?.data; if (v?.lat && v?.lng) fetchTypes(`lat=${v.lat}&lng=${v.lng}`); }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]);

  const handleInfoChange = (newInfo: PropertyInfo) => {
    pushToHistoryDebounced(state);
    setState(prev => ({ ...prev, info: newInfo }));
  };

  const handleColorChange = (color: FlyerColor) => {
    pushToHistoryInstant(state);
    setState(prev => ({ ...prev, colorTheme: color }));
  };

  const handleLayoutChange = (layout: FlyerLayout) => {
    pushToHistoryInstant(state);
    setState(prev => ({ ...prev, layoutTheme: layout }));
  };

  const handleImageUpload = async (key: string, file: File): Promise<string | undefined> => {
    const params = new URLSearchParams(window.location.search);
    const vacancyId = params.get("vacancy_id") || "unknown";

    setIsUploadingImage(prev => ({ ...prev, [key]: true }));

    try {
      const compressedBlob = await compressToWebP(file, 0.82);
      const publicUrl = getLocalId()
        ? await new Promise<string>((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(String(fr.result));
            fr.onerror = () => reject(new Error("사진을 읽지 못했습니다."));
            fr.readAsDataURL(compressedBlob);
          })
        : await uploadImageToServer(compressedBlob, vacancyId);

      pushToHistoryInstant(state);
      setState(prev => ({
        ...prev,
        [key]: publicUrl
      }));
      return publicUrl;
    } catch (err: any) {
      console.error("이미지 업로드 실패:", err);
      alert("이미지 업로드 및 최적화 중 오류가 발생했습니다: " + err.message);
      return undefined;
    } finally {
      setIsUploadingImage(prev => ({ ...prev, [key]: false }));
    }
  };

  // 1. Text-based Generation
  const handleGenerateAI = async () => {
    alert("보안상의 이유로 클라이언트 AI 생성 기능이 비활성화되었습니다.");
  };

  // 2. Image-based Analysis & Generation
  const handleAnalyzeImage = async (files: File[]) => {
    alert("보안상의 이유로 클라이언트 이미지 분석 기능이 비활성화되었습니다.");
  };

  // 3. Agent Image Analysis
  const handleAnalyzeAgentImage = async (file: File) => {
      alert("보안상의 이유로 클라이언트 명함 분석 기능이 비활성화되었습니다.");
  };

  // 4. Complex Info Analysis
  const handleAnalyzeComplexImage = async (sectionId: string, file: File) => {
      alert("보안상의 이유로 클라이언트 단지 정보 분석 기능이 비활성화되었습니다.");
  };

  // Helper to apply generated content to sections
  const applyGeneratedContent = (result: GeneratedContent, baseInfo?: PropertyInfo, newImages?: Record<string, string>) => {
      const currentInfo = baseInfo || state.info;
      const newSections = [...currentInfo.sections];

      // Update Grid Section (Highlights)
      const gridSectionIndex = newSections.findIndex(s => s.type === 'grid');
      if (gridSectionIndex !== -1 && result.gridInfo) {
          const section = { ...newSections[gridSectionIndex] };
          
          // Apply title and intro if provided
          if (result.gridInfo.title) section.title = result.gridInfo.title;
          if (result.gridInfo.intro) section.intro = result.gridInfo.intro;

          const newItems = [...section.items];
          result.gridInfo.features.forEach((text, i) => {
             if (newItems[i]) {
                newItems[i] = { ...newItems[i], text };
             }
          });
          section.items = newItems;
          newSections[gridSectionIndex] = section;
      }

      // Update List Section (Zones)
      const listSectionIndex = newSections.findIndex(s => s.type === 'list');
      if (listSectionIndex !== -1 && result.listInfo) {
          const section = { ...newSections[listSectionIndex] };

          // Apply title, intro, description if provided
          if (result.listInfo.title) section.title = result.listInfo.title;
          if (result.listInfo.intro) section.intro = result.listInfo.intro;
          if (result.listInfo.description) section.description = result.listInfo.description;

          const newItems = [...section.items];
          result.listInfo.items.forEach((itemData, i) => {
            if (newItems[i]) {
                newItems[i] = { 
                    ...newItems[i], 
                    title: itemData.title || newItems[i].title, // Update title
                    text: itemData.description // Update description
                };
            }
          });
          section.items = newItems;
          newSections[listSectionIndex] = section;
      }

      pushToHistoryInstant(state);
      setState(prev => ({ 
        ...prev, 
        ...(newImages || {}), // Apply new images if provided
        generated: result,
        info: {
            ...currentInfo,
            promotionText: result.promotionText || currentInfo.promotionText,
            sections: newSections
        }
      }));
      setIsGenerating(false);
  };

  const generateHtmlContent = async (): Promise<string | null> => {
    if (!hiddenFlyerRef.current) return null;
    try {
        const clone = hiddenFlyerRef.current.cloneNode(true) as HTMLElement;
        const imgs = clone.querySelectorAll('img');
        
        // Fix width for IM Report (A4 Landscape)
        clone.style.width = '1122px';
        clone.style.maxWidth = 'none';
        clone.style.minHeight = 'auto';
        clone.style.margin = '0 auto';

        // 1. Strip contentEditable and hover edit styles from clone
        const editables = clone.querySelectorAll('[contentEditable]');
        editables.forEach(el => {
            el.removeAttribute('contentEditable');
            el.removeAttribute('suppressContentEditableWarning');
            // Remove hover ring, background highlight, and cursor-text styles
            el.className = el.className
                .replace(/hover:bg-amber-100\/50/g, '')
                .replace(/hover:ring-1/g, '')
                .replace(/hover:ring-amber-300/g, '')
                .replace(/focus:bg-amber-100\/80/g, '')
                .replace(/focus:ring-1/g, '')
                .replace(/focus:ring-amber-500/g, '')
                .replace(/cursor-text/g, 'cursor-default')
                .trim();
        });

        // 2. Remove all editor-only print-hidden elements completely (upload overlays, toolbar controllers)
        const printHiddenElements = clone.querySelectorAll('.print\\:hidden');
        printHiddenElements.forEach(el => {
            el.remove();
        });

        await Promise.all(Array.from(imgs).map(async (img) => {
            if (img.src.startsWith('blob:')) {
                try {
                    const response = await fetch(img.src);
                    const blob = await response.blob();
                    await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            img.src = reader.result as string;
                            resolve(null);
                        };
                        reader.readAsDataURL(blob);
                    });
                } catch (e) {
                    console.error("Failed to inline image", e);
                }
            }
        }));

        const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1122, user-scalable=yes">
<title>${state.info.address || "물건보고서"} - 물건보고서</title>
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
<link href="https://fonts.googleapis.com/css2?family=Song+Myung:wght@400&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<script>
    tailwind.config = {
    theme: {
        extend: {
        fontFamily: {
            sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Roboto', 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', 'sans-serif'],
            serif: ['Playfair Display', 'Song Myung', 'serif'],
        }
        }
    }
    }
</script>
<style>
    body { font-family: 'Pretendard', sans-serif; background-color: #e5e7eb; padding: 0; margin: 0; display: flex; justify-content: center; min-height: 100vh; }
    .font-serif-en { font-family: 'Playfair Display', serif; }
</style>
</head>
<body class="bg-gray-100">
${clone.outerHTML}
</body>
</html>`;

        return html;
    } catch (err) {
        console.error("HTML generation error:", err);
        return null;
    }
  };

  const downloadHtml = async () => {
    try {
        const html = await generateHtmlContent();
        if (!html) throw new Error("Generated HTML is empty");

        const blob = new Blob([html], { type: 'text/html' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `flyer_${Date.now()}.html`;
        link.click();
    } catch (err) {
        alert("HTML 저장 중 오류가 발생했습니다.");
    }
  };

  // --- 화면 내 [닫기] 및 종료 모달 핸들러 ---
  const handleRequestExit = useCallback(() => {
    if (hasUnsavedChangesRef.current) {
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
  }, []);

  // 모달 옵션 1: 저장하고 닫기
  const handleSaveAndExit = async () => {
    const params = new URLSearchParams(window.location.search);
    const vacancyId = params.get("vacancy_id");
    if (getLocalId()) {
      if (await saveLocalReport(false)) setShowExitConfirmModal(false);
      return;
    }

    setIsSavingCloud(true);
    try {
      if (vacancyId) {
        localStorage.setItem(`easyflyer_saved_${vacancyId}`, JSON.stringify(state));
        setIsLoadedFromStorage(true);

        const htmlContent = await generateHtmlContent();
        const res = await fetch("/api/vacancy/save-flyer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vacancyId, flyerState: { ...state, htmlContent, coverThumb: await captureCover().catch(() => "") }, type: "report" })
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || "서버 응답 오류");
        }
      }
      hasUnsavedChangesRef.current = false;
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
    hasUnsavedChangesRef.current = false;
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

  const downloadJpg = async (selectedIds: string[]) => {
    if (!hiddenFlyerRef.current || isExportingImage) return;
    setIsExportingImage(true);
    try {
      const element = hiddenFlyerRef.current;
      
      // Clone the element to filter sections without affecting the view
      const clone = element.cloneNode(true) as HTMLElement;
      
      liftTextForCapture(clone);

      // We need to append the clone to the document to capture it, but keep it hidden/out of view
      clone.style.position = 'absolute';
      clone.style.left = '0px';
      clone.style.top = '-99999px'; // Move out of view vertically to avoid x: 0 offset issues
      
      // FIX: Force auto height to remove whitespace from min-h-[1400px] class
      clone.style.minHeight = '0px'; 
      clone.style.height = 'auto';

      document.body.appendChild(clone);

      // Make all pages visible in clone for correct capture
      // Make all pages visible in clone for correct capture
      const sections = clone.querySelectorAll('[data-export-id]');
      sections.forEach(p => {
          (p as HTMLElement).style.display = 'flex';
      });

      // Filter sections: remove ones not in selectedIds
      sections.forEach((sec) => {
          const id = sec.getAttribute('data-export-id');
          if (id && (!selectedIds.includes(id) || !webAllowed(id))) {
              sec.remove();
          }
      });
      clone.querySelectorAll('[data-web-lock]').forEach((n) => n.remove());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const canvas = await (window as any).html2canvas(clone, {
        scale: 2, 
        // useCORS: true,
          proxy: '/api/proxy-image',
        backgroundColor: '#ffffff',
        windowWidth: 1400, // Ensure enough width for the 1122px wide layout
        scrollX: 0,
        scrollY: 0
      });

      document.body.removeChild(clone); // Cleanup

      const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
      const name = `매물보고서_${(state.info.address || '매물').replace(/[\\/:*?"<>|\s]+/g, '_')}.jpg`;
      if (!(await saveToStudio(name, dataUrl))) {
        const link = document.createElement('a');
        link.download = name;
        link.href = dataUrl;
        link.click();
      }
      setShowExportModal(false);
    } catch (err) {
      console.error(err);
      alert("이미지 다운로드 실패. 다시 시도해주세요.");
    } finally {
      setIsExportingImage(false);
    }
  };

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const vacancyMetaRef = useRef<{ title?: string; no?: string }>({});
  const [isPrinting, setIsPrinting] = useState(false);
  /* 홈 카드 메뉴 [PDF 내보내기]·[이미지 내보내기]·[인쇄] — 열리고 다 그려지면 한 번 실행 (2026-10-30, 10분 안에 누른 것만) */
  const autoDoneRef = useRef(false);
  useEffect(() => {
    if (!isInitialized || autoDoneRef.current) return;
    let job: { id?: string; action?: string; at?: number } | null = null;
    try { job = JSON.parse(localStorage.getItem("gs-auto-action") || "null"); } catch {}
    const id = new URLSearchParams(window.location.search).get("vacancy_id");
    if (!job || !id || job.id !== id || Date.now() - (job.at || 0) > 10 * 60 * 1000) return;
    autoDoneRef.current = true;
    try { localStorage.removeItem("gs-auto-action"); } catch {}
    const t = setTimeout(() => { if (job!.action === "pdf") void downloadPdf(); else if (job!.action === "image") setShowExportModal(true); }, 1200); // 사진·글꼴이 다 그려질 때까지 잠깐
    return () => clearTimeout(t);
  }, [isInitialized]); // eslint-disable-line react-hooks/exhaustive-deps

  /** 표지(첫 쪽)를 작게 찍는다 — PDF 내보내기와 같은 숨은 판에서, 폭 480 JPEG */
  const captureCover = async (): Promise<string> => {
    const h2c = (window as any).html2canvas;
    if (!hiddenFlyerRef.current || !h2c) return "";
    const clone = hiddenFlyerRef.current.cloneNode(true) as HTMLElement;
    liftTextForCapture(clone);
    clone.style.position = 'absolute'; clone.style.left = '0px'; clone.style.top = '-99999px'; clone.style.minHeight = '0px'; clone.style.height = 'auto';
    document.body.appendChild(clone);
    try {
      // 표지(page-0)를 콕 집어서 — 없으면 첫 쪽
      const sec = (clone.querySelector('[data-export-id="page-0"]') || clone.querySelector('[data-export-id]')) as HTMLElement | null;
      if (!sec) return "";
      sec.style.display = 'flex';
      const canvas = await h2c(sec, { scale: 480 / 1122, proxy: '/api/proxy-image', backgroundColor: '#ffffff', width: 1122, height: 794, windowWidth: 1400, scrollX: 0, scrollY: 0, logging: false });
      return canvas.toDataURL('image/jpeg', 0.8);
    } finally {
      document.body.removeChild(clone);
    }
  };
  const [isExportingImage, setIsExportingImage] = useState(false);

  const downloadPdf = async () => {
    // 이미지 내보내기와 같은 곳에서 찍는다 — 보고 있는 화면은 한 쪽만 열려 있을 수 있다 (2026-10-25)
    if (!hiddenFlyerRef.current) return;
    try {
      setIsGeneratingPdf(true);
      const element = hiddenFlyerRef.current;
      
      const clone = element.cloneNode(true) as HTMLElement;
      
      liftTextForCapture(clone);

      clone.style.position = 'absolute';
      clone.style.left = '0px';
      clone.style.top = '-99999px';
      clone.style.minHeight = '0px'; 
      clone.style.height = 'auto';

      document.body.appendChild(clone);

      // 웹에서는 표지·개요 두 쪽만 (2026-10-29 사장님 — 전체는 공실마케팅 앱)
      clone.querySelectorAll('[data-export-id]').forEach((n) => { if (!webAllowed(n.getAttribute('data-export-id'))) n.remove(); });
      clone.querySelectorAll('[data-web-lock]').forEach((n) => n.remove());
      const sections = Array.from(clone.querySelectorAll('[data-export-id]')) as HTMLElement[];
      sections.forEach(p => { p.style.display = 'flex'; });

      const pdf = new jsPDF('l', 'px', [1122, 794]);

      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const canvas = await (window as any).html2canvas(sec, {
          scale: 2, 
          // useCORS: true,
          proxy: '/api/proxy-image',
          backgroundColor: '#ffffff',
          width: 1122,
          height: 794,
          windowWidth: 1400,
          scrollX: 0,
          scrollY: 0
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) pdf.addPage([1122, 794], 'l');
        pdf.addImage(imgData, 'JPEG', 0, 0, 1122, 794);
      }

      document.body.removeChild(clone);
      
      // Save PDF
      const pdfName = `매물보고서_${(state.info.address || '보고서').replace(/[\\/:*?"<>|\s]+/g, '_')}.pdf`;
      if (!(await saveToStudio(pdfName, pdf.output('datauristring')))) pdf.save(pdfName);
      
    } catch (err) {
      console.error(err);
      alert("PDF 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDirectPrint = async () => {
    if (!hiddenFlyerRef.current) return;
    try {
      setIsPrinting(true);
      const element = hiddenFlyerRef.current;
      
      const clone = element.cloneNode(true) as HTMLElement;
      
      liftTextForCapture(clone);

      clone.style.position = 'absolute';
      clone.style.left = '0px';
      clone.style.top = '-99999px';
      clone.style.minHeight = '0px'; 
      clone.style.height = 'auto';

      document.body.appendChild(clone);

      clone.querySelectorAll('[data-export-id]').forEach((n) => { if (!webAllowed(n.getAttribute('data-export-id'))) n.remove(); });
      clone.querySelectorAll('[data-web-lock]').forEach((n) => n.remove());
      const sections = Array.from(clone.querySelectorAll('[data-export-id]')) as HTMLElement[];
      sections.forEach(p => { p.style.display = 'flex'; });

      // Create PDF with landscape orientation
      const pdf = new jsPDF('l', 'px', [1122, 794]);

      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const canvas = await (window as any).html2canvas(sec, {
          scale: 2, 
          // useCORS: true,
          proxy: '/api/proxy-image',
          backgroundColor: '#ffffff',
          width: 1122,
          height: 794,
          windowWidth: 1400,
          scrollX: 0,
          scrollY: 0
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) pdf.addPage([1122, 794], 'l');
        pdf.addImage(imgData, 'JPEG', 0, 0, 1122, 794);
      }

      document.body.removeChild(clone);
      
      // Convert to blob and trigger silent print via iframe
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Remove any existing print iframe
      const existingFrame = document.getElementById('silent-print-iframe');
      if (existingFrame) existingFrame.remove();
      
      const iframe = document.createElement('iframe');
      iframe.id = 'silent-print-iframe';
      iframe.style.position = 'absolute';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = 'none';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.src = pdfUrl;
      
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        setTimeout(() => {
          if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          }
          setIsPrinting(false);
        }, 150);
      };
      
    } catch (err) {
      console.error(err);
      alert("인쇄 데이터를 준비하는 중 오류가 발생했습니다.");
      setIsPrinting(false);
    }
  };

  // Generate selectable sections list
  // 회원이 바꾼 쪽 차례·번호 그대로 (2026-10-24)
  const getExportableSections = () => {
      return pageOrder(state.info as any).flatMap((id) => {
          const label = pageNumberLabel(id, state.info as any);
          if (id !== 4) return webAllowed(`page-${id}`) ? [{ id: `page-${id}`, label }] : [];
          // 늘린 사진 쪽
          if (!webAllowed('page-4')) return [];
          return [{ id: 'page-4', label }, ...Array.from({ length: photoPageCount(state.info) - 1 }, (_, i) => ({ id: `page-4-${i + 2}`, label: `${label} ${i + 2}쪽` }))];
      });
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
          <h2 className="text-2xl font-black mb-3 text-slate-100 tracking-tight">AI 물건보고서 접근 제한</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            {authError === "unauthorized" 
              ? "이 서비스를 이용하시려면 로그인이 필요합니다." 
              : "AI 물건보고서 서비스는 공실뉴스 [부동산 회원] 및 [최고 관리자]만 이용하실 수 있습니다. 일반 회원은 이용이 불가능합니다."}
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

  const handleResetAll = useCallback(() => {
    if (window.confirm("정말로 모든 내용을 초기화하시겠습니까? (이 작업은 복구할 수 없습니다)")) {
      pushToHistoryInstant(state);
      setState({
        info: INITIAL_INFO,
        generated: INITIAL_GENERATED,
        mainImage: null,
        agentImage: null,
        colorTheme: state.colorTheme,
        layoutTheme: state.layoutTheme,
        subImage1: null,
        subImage2: null,
        featureImage1: null,
        featureImage2: null,
        featureImage3: null,
        featureImage4: null,
        mapImage: null,
      });
      setActiveTab('all');
    }
  }, [state, pushToHistoryInstant]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans relative">
      <InstallAppModal />
      {isExportingImage && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-900/35 backdrop-blur-[2px]">
          <div className="flex items-center gap-3 rounded-xl border border-white/70 bg-white/95 px-5 py-4 shadow-xl">
            <style>{`
              @keyframes imageExportLoadingDot {
                0%, 60%, 100% { transform: translateY(0); opacity: 0.45; }
                30% { transform: translateY(-7px); opacity: 1; }
              }
            `}</style>
            <div className="flex h-4 items-end gap-1">
              {[0, 1, 2].map((index) => (
                <span key={index} className="h-1.5 w-1.5 rounded-full bg-blue-600" style={{ animation: `imageExportLoadingDot 1s ease-in-out ${index * 0.15}s infinite` }} />
              ))}
            </div>
            <span className="whitespace-nowrap text-sm font-bold text-slate-700">이미지를 생성중입니다</span>
          </div>
        </div>
      )}
      {loadingData && (
        <div className="fixed inset-0 bg-slate-900/80 z-[200] flex flex-col items-center justify-center text-white backdrop-blur-sm">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-amber-500 mb-6"></div>
          <h2 className="text-xl font-bold mb-2">🪄 공실 데이터 가져오는 중...</h2>
          <p className="text-sm text-slate-400">Gemini AI가 실시간으로 프리미엄 마케팅 카피를 구성하고 있습니다.</p>
        </div>
      )}
      
      <ExportModal 
        isOpen={showExportModal} 
        onClose={() => setShowExportModal(false)} 
        sections={getExportableSections()}
        onExport={downloadJpg}
      />

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
              보고서 편집을 종료하시겠습니까?
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

      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', pointerEvents: 'none', opacity: 0 }}>
        <div ref={hiddenFlyerRef}>
          <FlyerCanvas 
            data={state} 
            activeTab="all"
            onUpdateInfo={() => {}}
            onImageUpload={async () => undefined}
            onDeleteImage={() => {}}
            isUploadingImage={{}}
            onOpenTableEditor={() => {}}
          />
        </div>
      </div>
      
      <header className="print:hidden bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleRequestExit}
                  className="report-mobile-back hidden items-center justify-center rounded-lg border border-gray-300 bg-white p-2 text-gray-700"
                  aria-label="보고서 편집기에서 나가기"
                >
                  ‹
                </button>
                <img
                  src="/logo.png"
                  className="report-header-logo h-9 w-auto object-contain cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95"
                  alt="공실뉴스 로고"
                  onClick={handleRequestExit}
                />
                <div className="flex items-center gap-3">
                  <h1 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                    AI 물건보고서
                  </h1>
                </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSidebar}
                className="report-header-toggle px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded border border-gray-300 transition-all active:scale-95 text-xs flex items-center gap-1.5"
              >
                {isSidebarOpen ? "◀ 보고서 편집 접기" : "▶ 보고서 편집 열기"}
              </button>
              <button
                type="button"
                onClick={handleRequestExit}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg border border-slate-700 transition-all active:scale-95 text-xs flex items-center gap-1.5 shadow-sm"
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

      <main onTouchStart={handleMobileTouchStart} onTouchEnd={handleMobileTouchEnd} className={`report-editor-main ${isSidebarOpen ? 'mobile-editor-open' : 'mobile-editor-closed'} print:block print:h-auto print:p-0 flex-1 max-w-[1600px] mx-auto w-full p-4 lg:p-8 grid grid-cols-12 gap-6 h-[calc(100vh-64px)]`}>
        <div ref={editorScrollRef} className={`report-editor-sidebar print:hidden col-span-12 lg:col-span-4 xl:col-span-3 lg:h-full lg:overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'is-open' : 'is-closed'}`}>
            <FlyerForm 
              info={state.info}
              setInfo={handleInfoChange}
              onAiAsk={studioMarketing ? (page, req) => handleAiFill(page, req) : undefined}
              aiPages={Object.keys(REPORT_PAGE_KEYS).map(Number)}
              aiBusy={Boolean(aiProgress)}
              onImageUpload={handleImageUpload}
              onDeleteImage={(key) => {
                pushToHistoryInstant(state);
                setState(prev => ({
                  ...prev,
                  [key]: null
                }));
              }}
              onGenerate={handleGenerateAI}
              onAnalyzeImage={handleAnalyzeImage}
              onAnalyzeAgentImage={handleAnalyzeAgentImage}
              onAnalyzeComplexImage={handleAnalyzeComplexImage}
              isGenerating={isGenerating}
              uploadedImages={state}
              colors={COLORS}
              layouts={LAYOUTS}
              currentColor={state.colorTheme}
              currentLayout={state.layoutTheme}
              onColorSelect={handleColorChange}
              onLayoutSelect={handleLayoutChange}
              isUploadingImage={isUploadingImage}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onBackTab={handleBackTab}
              onOpenTableEditor={() => setIsTableEditorOpen(true)}
              onSave={handleSaveToStorage}
              onInsertCaptures={captureBridge() ? () => void insertCaptures() : undefined}
              capturesBusy={capturesBusy}
              onFetchLand={() => void fetchLand()}
              landBusy={landBusy}
              simBusy={simBusy}
              onSimRun={(k: SimKind, id: string) => void runSim(k, id)}
              onSimUse={(k: SimKind, id: string) => void applySim(k, id)}
            />
        </div>
        <div className={`report-preview-panel print:col-span-12 print:border-none print:bg-white print:m-0 print:p-0 transition-all duration-300 ${isSidebarOpen ? 'col-span-12 lg:col-span-8 xl:col-span-9' : 'col-span-12'} bg-gray-200/50 rounded-xl border border-gray-300 overflow-hidden flex flex-col`}>
            <div className="print:hidden bg-white px-4 py-2 border-b flex justify-between items-center text-xs text-gray-500">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span>미리보기 에디터</span>
                </div>
                <span>Width: 860px (A4 가로 배율)</span>
            </div>
            <div ref={previewContainerRef} className="print:overflow-visible print:p-0 print:block flex-1 overflow-auto p-8 flex justify-start custom-scrollbar">
                {/* Fixed width container for editor preview */}
                <div
                  // 가운데 정렬은 mx-auto 로 — 화면이 좁으면 왼쪽이 잘리지 않고 옆으로 스크롤된다 (justify-center 는 왼쪽을 잘랐다)
                  className="report-canvas-shell w-[860px] shrink-0 mx-auto print:w-[1122px] print:mx-auto print:shrink"
                  style={{
                    '--mobile-report-page-count': mobilePreviewPageCount,
                    '--mobile-report-scale': mobileReportScale,
                    '--mobile-report-preview-height': `${mobilePreviewHeight}px`,
                    '--mobile-report-panel-height': `${mobilePreviewPanelHeight}px`
                  } as React.CSSProperties}
                >
                    <FlyerCanvas 
                      ref={flyerRef} 
                      data={state} 
                      activeTab={activeTab} 
                      onUpdateInfo={handleInfoChange}
                      onImageUpload={handleImageUpload}
                      onDeleteImage={(key) => {
                        pushToHistoryInstant(state);
                        setState(prev => ({
                          ...prev,
                          [key]: null
                        }));
                      }}
                      isUploadingImage={isUploadingImage}
                      onOpenTableEditor={() => setIsTableEditorOpen(true)}
                    />
                </div>
            </div>
        </div>
      </main>

      {/* Floating Bottom Action Bar */}
      <div className={`report-action-bar ${isSidebarOpen ? 'mobile-editor-open' : 'mobile-editor-closed'} print:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] w-[95%] sm:w-auto sm:max-w-[95%] bg-white/95 backdrop-blur-md border border-gray-200/80 p-4 rounded-2xl shadow-[0_15px_35px_-5px_rgba(0,0,0,0.15)] flex items-center justify-between gap-4 overflow-visible`}>
        {/* Share Dropdown Popover */}
        {showSharePopover && (
          <div className="share-popover-content absolute bottom-[72px] right-4 bg-white border border-gray-200/80 rounded-xl shadow-[0_6px_24px_rgba(0,0,0,0.15)] w-48 z-[100] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
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

        {/* Inner Scroll Container for buttons */}
        <div className="report-action-buttons w-full flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
          {/* Save Button */}
          <button 
            onClick={handleSaveToStorage}
            disabled={isSavingCloud}
            className="flex-1 py-3 px-6 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 active:scale-95 transition-all duration-150 shadow-md disabled:opacity-50 disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
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

          {/* 스튜디오 앱: 회원 ChatGPT 로 페이지별 문장 채우기 */}
          {studioMarketing && (
            <button
              onClick={() => handleAiFill()}
              disabled={Boolean(aiProgress)}
              className="py-3 px-5 bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-150 shadow-sm shrink-0 whitespace-nowrap disabled:opacity-60"
              title="이 공실 정보로 페이지마다 문장을 연결한 AI가 새로 씁니다. 금액·표·사진은 그대로입니다."
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>
              <span>AI로 채우기</span>
            </button>
          )}

          {/* AI Regenerate Button (웹: 기본 문구로 다시) */}
          {!studioMarketing && <button
              onClick={handleResetAndRegenerate} 
              className="py-3 px-5 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 active:scale-95 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-150 shadow-sm shrink-0 whitespace-nowrap"
              title="임시저장 데이터를 지우고 AI로 처음부터 다시 생성합니다."
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span>AI 새로 생성</span>
            </button>}

          {/* Image Export Button */}
          <button 
            onClick={() => setShowExportModal(true)}
            className="py-3 px-5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-95 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-150 shadow-sm shrink-0 whitespace-nowrap"
          >
            <ArrowDownTrayIcon className="w-4 h-4 text-gray-500" />
            <span>이미지 내보내기</span>
          </button>

          {/* Direct Print Button */}
          <button 
            onClick={handleDirectPrint}
            disabled={isPrinting || isGeneratingPdf}
            className="py-3 px-5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-95 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-150 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0v2.796c0 1.161.94 2.1 2.1 2.1h6.3c1.16 0 2.1-.939 2.1-2.1V7.03z" />
                </svg>
                <span>바로 인쇄하기</span>
              </>
            )}
          </button>

          {/* PDF Export Button */}
          <button 
            onClick={downloadPdf}
            disabled={isGeneratingPdf}
            className="py-3 px-5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-95 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-150 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
          >
            {isGeneratingPdf ? (
              <svg className="animate-spin h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-gray-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            )}
            <span>{isGeneratingPdf ? "생성 중..." : "PDF 내보내기"}</span>
          </button>


          {/* Share Button (Relative Container for Popover) — 공실 없는 보고서는 공유 링크가 없다 (PDF·이미지로 보낸다) */}
          {!getLocalId() && <div ref={sharePopoverRef} className="relative shrink-0">
            <button 
              onClick={() => (WEB_LIMITED ? askInstallApp("공유는 공실마케팅 앱에서 할 수 있어요") : setShowSharePopover(!showSharePopover))}
              className="py-3 px-5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-95 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-150 shadow-sm whitespace-nowrap"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-gray-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935-2.186 2.25 2.25 0 00-3.935 2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
              <span>공유하기</span>
            </button>
          </div>}
        </div>
      </div>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none !important; }
        .no-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #999; }
        
        @media print {
            body { 
                margin: 0; 
                padding: 0; 
                background: white !important; 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
            }
            @page {
                size: A4 landscape;
                margin: 0;
            }
            
            /* Hide non-printable elements */
            header, .print\:hidden {
                display: none !important;
            }
            
            /* Main layout adjustments for full print screen */
            main {
                display: block !important;
                padding: 0 !important;
                margin: 0 !important;
                max-width: none !important;
                width: 100% !important;
                height: auto !important;
            }

            .print\:col-span-12 {
                display: block !important;
                width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
                background: white !important;
            }

            .print\:overflow-visible {
                overflow: visible !important;
                padding: 0 !important;
                display: block !important;
            }

            .print\:w-\[1122px\] {
                width: 297mm !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
            }

            /* exact fit for slides container */
            div.flex.flex-col.items-center.p-8.bg-gray-100 {
                padding: 0 !important;
                background: transparent !important;
            }

            /* Perfect sizing for ReportPage container to match A4 landscape print exactly */
            div[data-export-id] {
                width: 297mm !important;
                height: 210mm !important;
                margin: 0 !important;
                box-shadow: none !important;
                page-break-after: always !important;
                break-after: page !important;
                overflow: hidden !important;
                box-sizing: border-box !important;
                position: relative !important;
            }

            img {
                max-width: 100%;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }
      `}</style>

      {/* Smart Table Grid Editor Modal */}
      <TableEditorModal
        isOpen={isTableEditorOpen}
        onClose={() => setIsTableEditorOpen(false)}
        floorStatus={state.info.floorStatus || []}
        onChange={(newStatus) => {
          handleInfoChange({
            ...state.info,
            floorStatus: newStatus
          });
        }}
      />

      {/* 지적도·대장·층별·실거래가를 뒤에서 받는 중 — 편집은 계속 된다 (2026-10-24) */}
      {(landBusy || typeBusy || simBusy) && !aiProgress && (
        <div className="print:hidden fixed top-3 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-lg text-[13px] font-bold text-gray-800">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-[#1a3a6b] border-t-transparent animate-spin" />
          {landBusy || simBusy || "단지 타입 구성을 세는 중… (큰 단지는 1~2분)"}
        </div>
      )}
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
    </div>
  );
}

export default App;
