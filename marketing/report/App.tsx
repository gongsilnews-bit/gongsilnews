
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import FlyerForm from './components/FlyerForm';
import FlyerCanvas from './components/FlyerCanvas';
import TableEditorModal from './components/TableEditorModal';
import { generateFlyerCopy, fileToGenerativePart, extractPropertyInfoFromImages, extractAgentInfoFromImage, extractComplexInfoFromImage } from './services/geminiService';
import { FlyerState, PropertyInfo, GeneratedContent, FlyerColor, FlyerLayout } from './types';
import { ArrowDownTrayIcon, CodeBracketIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/solid';

export const COLORS: FlyerColor[] = [
  { id: 'teal', name: 'Teal (Raemian)', primary: '#00788c', secondary: '#00c6d7', dark: '#003845' },
  { id: 'gold', name: 'Gold (Lotte)', primary: '#bfa068', secondary: '#e6cc9f', dark: '#3e301b' },
  { id: 'green', name: 'Green (Prugio)', primary: '#005f4d', secondary: '#4fb89e', dark: '#002820' },
  { id: 'burgundy', name: 'Burgundy (Hillstate)', primary: '#7c1f2d', secondary: '#ff9ea7', dark: '#380d13' },
  { id: 'orange', name: 'Orange (Acro)', primary: '#f27405', secondary: '#ffac63', dark: '#5e2609' },
];

export const LAYOUTS: FlyerLayout[] = [
  { id: 'type1', name: 'Modern Overlay', type: 'type1', headingFont: 'font-serif-kr', bodyFont: 'font-sans' },
  { id: 'type2', name: 'Luxury Center', type: 'type2', headingFont: 'font-serif-kr', bodyFont: 'font-serif-kr' },
  { id: 'type3', name: 'Natural Clean', type: 'type3', headingFont: 'font-sans', bodyFont: 'font-sans' },
  { id: 'type4', name: 'Bold Box', type: 'type4', headingFont: 'font-sans', bodyFont: 'font-sans' },
  { id: 'type5', name: 'High-end Minimal', type: 'type5', headingFont: 'font-sans', bodyFont: 'font-sans' },
];

const INITIAL_INFO: PropertyInfo = {
  // Page 1: Overview
  address: "서울 강남구 논현동",
  subTitle: "Asset Sales Briefing",
  priceMain: "500억",
  overviewTable: [
    { label: "소재지", value: "서울 강남구 논현동" },
    { label: "용도지역", value: "제3종 일반주거지역 / 도로 6m 접" },
    { label: "대지면적", value: "317.9㎡ (96.16평)" },
    { label: "연면적", value: "905.13㎡ (273.8평)" },
    { label: "건물규모", value: "지하 1층 / 지상 5층" },
    { label: "주용도", value: "근린생활시설 및 주택 (상가주택)" },
    { label: "주차대수", value: "자주식 7대" },
    { label: "승강기", value: "1대 완비" },
    { label: "준공연도", value: "2002년 (최근 층별 리모델링 완료)" },
  ],
  agentName: "미래에셋공인 중개사 사무소",
  agentRepresentative: "김민혁과장",
  agentPhone: "02-1234-5678",
  agentMobile: "010-5554-4444",
  investmentSummary: {
    box1Title: "CONNECTIVITY", box1Text: "전철역\n도보 4분",
    box2Title: "ASSET QUALITY", box2Text: "내외관\n리모델링",
    box3Title: "SUITABILITY", box3Text: "사옥 및\n수익형 최적",
  },

  // Page 2: Status & Valuation
  floorStatus: [
    { floor: "5F", purpose: "주택", lease: "보증금 / 차임 내역 별도문의", status: "임대 중", note: "명도 용이" },
    { floor: "4F", purpose: "주택", lease: "가족 거주", status: "가족 거주", note: "명도 용이" },
    { floor: "3F", purpose: "근생", lease: "임대 중", status: "임대 중", note: "명도 협의" },
    { floor: "2F", purpose: "근생", lease: "임대 중", status: "임대 중", note: "명도 용이" },
    { floor: "1F", purpose: "근생", lease: "가족 사용", status: "가족 사용", note: "명도 용이" },
    { floor: "B1", purpose: "근생", lease: "현재 공실", status: "즉시 활용", note: "즉시 활용" },
  ],
  floorStatusNotice: "※ 전체 6개 층 중 3개 층(B1, 1F, 4F)이 소유주 직접 관리 하에 있어, 신속한 인도 및 명도 협의가 가능합니다.",
  highlights: [
    "가격 경쟁력: 감정가 대비 매우 낮은 파격적인 금매가",
    "입지 강점: 역세권 초인접, 오피스 밀집지로 배후수요 풍부",
    "명도 완료: 지하 공실 및 소유주 가족 점유로 즉시 인도 협의 가능",
    "행정 지원: 책임명도 및 근생 용도변경 등 전폭적 지원"
  ],
  valuationText: "본 자산은 역세권 500억 희소 급매물로, 매입 즉시 감정가 대비 강력한 시세 차익 확보가 가능하며 사업 가치 증대에 최적화된 조건입니다.",
  showChart: true,
  chartBars: [
    { label: "탁상감정가", value: "80", isHighlight: false },
    { label: "기존 희망가", value: "75", isHighlight: false },
    { label: "인근 시세", value: "85", isHighlight: false },
    { label: "현재 급매가", value: "65", isHighlight: true }
  ],

  // Page 3: Photos Captions
  photoCaptions: {
    main: "EXTERIOR VIEW - 건물 정면 외관",
    sub1: "Side View",
    sub2: "Entrance",
    feat1: "1F Interior",
    feat2: "Rooftop"
  },

  // Page 4: Area Analysis
  areaTargetName: "남부터미널역(3호선)\n도보 4분 초역세권",
  areaTargetDesc: "대한민국 최고의 문화 인프라와 남부터미널 업무 지구의 풍부한 배후 수요가 공존합니다.\n희소성 높은 초역세권 대지로서 사옥 신축 및 수익형 밸류업 시 최고의 자산 가치를 보장합니다.",
  areaBox1Title: "STATION AREA", areaBox1Text: "지하철 3호선 남부터미널역과 도보 약 250m 거리로 최상의 대중교통 접근성 확보",
  areaBox2Title: "CULTURAL DIST.", areaBox2Text: "대한민국 대표 문화거점인 예술의전당, 국립국악원 및 관련 클러스터 인접",
  areaBox3Title: "CONNECTIVITY", areaBox3Text: "남부순환로, 서초중앙로 진입이 용이하여 강남권 전역 및 고속도로 접근성 탁월",
  mapType: 'kakao',

  // Page 5: Roadmap
  roadmap: {
    box1Title: "단독 사옥 활용 시나리오", box1Text: "전층 명도 협의 후 기업의 아이덴티티를 투영한 단독 사옥으로 활용합니다. 서초동 초역세권 입지의 상징성을 동시에 확보할 수 있는 최상의 환경을 제공합니다.",
    box2Title: "주거 및 근생 수익 모델", box2Text: "상층부(4~5층) 실거주를 통해 최고의 직주근접 환경을 실현합니다. 하층부(B1~3층)는 오피스 및 갤러리 임대를 통해 안정적인 월세 수익을 확보할 수 있습니다.",
    box3Title: "수익형 자산 밸류업 전략", box3Text: "주택 부분의 근생 용도변경 및 전면 리모델링을 통해 우량 법인 임차를 유치합니다. 자산 가치 극대화 후 시세 차익 실현에 집중하는 투자 안입니다.",
    box4Title: "역세권 오피스 개발안", box4Text: "제3종일반주거지역의 높은 용적률을 활용한 고품격 오피스 빌딩 신축 개발입니다. 서초동 초역세권 입지의 희소성을 활용하여 개발 이익을 극대화할 수 있습니다."
  },
  
  // Backward compat
  promotionText: "",
  sections: []
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

const convertOverviewTableToArray = (tbl: any): { label: string; value: string }[] => {
  if (Array.isArray(tbl)) return tbl;
  if (tbl && typeof tbl === 'object') {
    return [
      { label: "소재지", value: tbl.location || "" },
      { label: "용도지역", value: tbl.zoning || "" },
      { label: "대지면적", value: tbl.landArea || "" },
      { label: "연면적", value: tbl.totalArea || "" },
      { label: "건물규모", value: tbl.buildingScale || "" },
      { label: "주용도", value: tbl.mainPurpose || "" },
      { label: "주차대수", value: tbl.parking || "" },
      { label: "승강기", value: tbl.elevator || "" },
      { label: "준공연도", value: tbl.completionYear || "" },
    ].filter(row => row.value !== undefined && row.value !== null);
  }
  return [
    { label: "소재지", value: "" },
    { label: "용도지역", value: "" },
    { label: "대지면적", value: "" },
    { label: "연면적", value: "" },
    { label: "건물규모", value: "" },
    { label: "주용도", value: "" },
    { label: "주차대수", value: "" },
    { label: "승강기", value: "" },
    { label: "준공연도", value: "" },
  ];
};

const mergeStateWithDefaults = (loaded: any): FlyerState => {
  return {
    ...loaded,
    info: {
      ...INITIAL_INFO,
      ...(loaded?.info || {}),
      overviewTable: convertOverviewTableToArray(loaded?.info?.overviewTable || loaded?.info?.overviewTableObj),
      floorStatus: loaded?.info?.floorStatus || INITIAL_INFO.floorStatus,
      highlights: loaded?.info?.highlights || INITIAL_INFO.highlights,
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
    },
    generated: {
      ...INITIAL_GENERATED,
      ...(loaded?.generated || {})
    },
    colorTheme: loaded?.colorTheme || COLORS[0],
    layoutTheme: loaded?.layoutTheme || LAYOUTS[0]
  };
};

function App() {
  const [state, setState] = useState<FlyerState>({
    info: INITIAL_INFO,
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
  const [showSharePopover, setShowSharePopover] = useState(false);
  const sharePopoverRef = useRef<HTMLDivElement>(null);

  // 5. URL 파라미터 기반 공실 데이터 연동 로드
  const [loadingData, setLoadingData] = useState(false);
  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState<Record<string, boolean>>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<number | 'all'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

  const loadVacancyDataDirectly = async (vacancyId: string) => {
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

        // 1. Supabase 클라우드 동기화 데이터 우선 로드
        const supabaseFlyerSettings = json.flyer?.flyer_state || v.infrastructure?._flyer_settings;
        if (supabaseFlyerSettings) {
          setState(mergeStateWithDefaults(supabaseFlyerSettings));
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
            setState(mergeStateWithDefaults(savedState));
            setIsLoadedFromStorage(true);
            setIsInitialized(true);
            setLoadingData(false);
            return;
          } catch (e) {
            console.error("로컬 저장소 데이터 로드 실패, 새로 생성합니다:", e);
          }
        }
        
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
            if (item.title === '세대수' && v.total_units) return { ...item, text: `${v.total_units}세대` };
            if (item.title === '저/최고층' && v.current_floor && v.total_floor) return { ...item, text: `${v.current_floor}층/${v.total_floor}층` };
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
        const autoAddress = [dongBunji, v.building_name, priceText].filter(Boolean).join(" ");

        const mappedInfo: PropertyInfo = {
          ...INITIAL_INFO,
          promotionText: priceText,
          propertyNumber: `No. ${v.property_no || v.id || v.vacancy_id || "0000"}`,
          address: autoAddress || "공실 매물 정보",
          subTitle: `${v.sub_category || v.property_type || "프리미엄"} | ${v.direction || "방향 없음"} | ${areaDisplay}`,
          transactionType: v.trade_type || "월세",
          priceMain: formatAmount(v.deposit) || "",
          priceSub: v.monthly_rent ? `${Math.round(v.monthly_rent / 10000)}만` : "",
          managementFee: v.maintenance_fee ? `${Math.round(v.maintenance_fee / 10000)}만원` : "없음",
          area: areaDisplay,
          floor: `${v.current_floor || "-"}층 / 총 ${v.total_floor || "-"}층`,
          direction: v.direction || "남향",
          roomCount: `${v.room_count || "-"}개 / ${v.bathroom_count || "-"}개`,
          parking: v.parking || "없음",
          moveInDate: v.move_in_date || "즉시 입주 가능",
          options: Array.isArray(v.options) ? v.options.join(", ") : (v.options || ""),
          
          agentName,
          agentRepresentative,
          agentPhone,
          agentMobile,
          agentMapUrl: fullAddress ? `https://map.naver.com/p/search/${encodeURIComponent(fullAddress)}` : "",
          consultationUrl: "",
          agentAdditionalInfo: additionalInfo,

          pageBadges: {
            ...INITIAL_INFO.pageBadges,
            page1: getEnglishTradeType(v.trade_type)
          },

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
                features: [
                  mappedInfo.direction === "방향 없음" ? "우수한 채광" : `채광 좋은 ${mappedInfo.direction}`,
                  "탁 트인 개방감",
                  mappedInfo.parking !== "없음" ? "편리한 주차" : "역세권 인프라",
                  "다양한 옵션"
                ]
            },
            listInfo: {
                title: "공간 상세",
                intro: "DETAILS",
                description: "섬세한 디테일과 세련된 마감이 돋보이는 공간입니다.",
                items: [
                    { title: "MAIN ZONE", description: "아늑하고 편안한 분위기의 메인 공간입니다." },
                    { title: "SUB ZONE", description: "효율적인 동선으로 설계된 서브 공간입니다." }
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
          info: {
            ...mappedInfo,
            sections: finalSections
          },
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
      await fetch("/api/vacancy/save-flyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vacancyId, flyerState: { ...state, htmlContent } })
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

    const shareUrl = `${window.location.origin}/flyer/${vacancyId}.html`;
    
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
    const params = new URLSearchParams(window.location.search);
    const vacancyId = params.get("vacancy_id");
    if (!vacancyId) {
      alert("공실 ID를 찾을 수 없습니다.");
      return;
    }
    
    // Save first
    await handleSaveToStorageQuietly();

    const shareUrl = `${window.location.origin}/flyer/${vacancyId}.html`;
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
    }
  }, [state, loadingData, isGenerating, isInitialized]);

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
        body: JSON.stringify({ vacancyId, flyerState: { ...state, htmlContent } })
      });
      const json = await res.json();
      if (json.success) {
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
        body: JSON.stringify({ vacancyId, flyerState: { ...state, htmlContent } })
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "서버 응답 오류");
      }
    } catch (err: any) {
      console.warn("클라우드 동기화 저장 실패:", err);
    } finally {
      setIsSavingCloud(false);
    }

    // 2. 공유 고유 URL 주소 빌드
    const shareUrl = `${window.location.origin}/flyer/${vacancyId}.html`;
    
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
            body: JSON.stringify({ vacancyId, flyerState: null }) // null 전달하여 삭제
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
      const publicUrl = await uploadImageToServer(compressedBlob, vacancyId);

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
    if (!state.info.address) return;
    setIsGenerating(true);
    try {
      const result = await generateFlyerCopy(state.info);
      applyGeneratedContent(result);
    } catch (e) {
      alert("AI 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Image-based Analysis & Generation
  const handleAnalyzeImage = async (files: File[]) => {
    const params = new URLSearchParams(window.location.search);
    const vacancyId = params.get("vacancy_id") || "unknown";

    setIsGenerating(true);
    try {
        const imageSlots = [
            'mainImage', 
            'subImage1', 'subImage2', 
            'featureImage1', 'featureImage2', 'featureImage3', 'featureImage4'
        ];
        
        const newImages: Record<string, string> = {};
        let fileSlotIndex = 0;

        const imagesData = await Promise.all(files.map(async (file) => ({
            data: await fileToGenerativePart(file),
            mimeType: file.type
        })));

        const { info: extractedInfo, generated } = await extractPropertyInfoFromImages(imagesData);

        await Promise.all(files.map(async (file) => {
            while (fileSlotIndex < imageSlots.length && state[imageSlots[fileSlotIndex]]) {
                fileSlotIndex++;
            }
            if (fileSlotIndex < imageSlots.length) {
                const slot = imageSlots[fileSlotIndex];
                setIsUploadingImage(prev => ({ ...prev, [slot]: true }));
                try {
                  const compressedBlob = await compressToWebP(file, 0.82);
                  const publicUrl = await uploadImageToServer(compressedBlob, vacancyId);
                  newImages[slot] = publicUrl;
                } catch (e) {
                  console.error(`${slot} 업로드 실패:`, e);
                } finally {
                  setIsUploadingImage(prev => ({ ...prev, [slot]: false }));
                }
                fileSlotIndex++;
            }
        }));

        const mergedInfo: PropertyInfo = {
            ...state.info,
            ...extractedInfo,
            sections: state.info.sections 
        };

        applyGeneratedContent(generated, mergedInfo, newImages);

    } catch (e) {
        console.error(e);
        alert("이미지 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
        setIsGenerating(false); 
    }
  };

  // 3. Agent Image Analysis
  const handleAnalyzeAgentImage = async (file: File) => {
      setIsGenerating(true);
      try {
          await handleImageUpload('agentImage', file);
          
          const base64 = await fileToGenerativePart(file);
          const extractedAgentInfo = await extractAgentInfoFromImage(base64, file.type);
          
          setState(prev => ({
              ...prev,
              info: {
                  ...prev.info,
                  ...extractedAgentInfo,
                  agentAdditionalInfo: extractedAgentInfo.agentAdditionalInfo || prev.info.agentAdditionalInfo
              }
          }));
          
      } catch (e) {
          console.error(e);
          alert("명함 분석 중 오류가 발생했습니다.");
      } finally {
          setIsGenerating(false);
      }
  };

  // 4. Complex Info Analysis
  const handleAnalyzeComplexImage = async (sectionId: string, file: File) => {
      setIsGenerating(true);
      try {
          await handleImageUpload(`complexImage-${sectionId}`, file);
          
          const base64 = await fileToGenerativePart(file);
          const extractedData = await extractComplexInfoFromImage(base64, file.type);
          
          setState(prev => {
              const newSections = prev.info.sections.map(sec => {
                  if (sec.id !== sectionId) return sec;
                  
                  const newItems = sec.items.map(item => {
                      if (item.title && extractedData[item.title]) {
                          return { ...item, text: extractedData[item.title] };
                      }
                      return item;
                  });
                  return { ...sec, items: newItems };
              });
              
              return {
                  ...prev,
                  info: { ...prev.info, sections: newSections }
              };
          });
      } catch (e) {
          console.error(e);
          alert("단지 정보 분석 중 오류가 발생했습니다.");
      } finally {
          setIsGenerating(false);
      }
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
    if (!flyerRef.current) return null;
    try {
        const clone = flyerRef.current.cloneNode(true) as HTMLElement;
        const imgs = clone.querySelectorAll('img');
        
        // Fix width for IM Report (A4 Landscape)
        clone.style.width = '1122px';
        clone.style.maxWidth = 'none';
        clone.style.minHeight = 'auto';
        clone.style.margin = '0 auto';

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
<title>${state.info.address || "공실뉴스 매물 전단지"} - 매매 ${state.info.priceMain || ""}</title>
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

  const downloadJpg = async (selectedIds: string[]) => {
    if (!flyerRef.current) return;
    try {
      const element = flyerRef.current;
      
      // Clone the element to filter sections without affecting the view
      const clone = element.cloneNode(true) as HTMLElement;
      
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
          if (id && !selectedIds.includes(id)) {
              sec.remove();
          }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const canvas = await (window as any).html2canvas(clone, {
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 1400, // Ensure enough width for the 1122px wide layout
        scrollX: 0,
        scrollY: 0
      });

      document.body.removeChild(clone); // Cleanup

      const link = document.createElement('a');
      link.download = `flyer_${Date.now()}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 1.0);
      link.click();
      setShowExportModal(false);
    } catch (err) {
      console.error(err);
      alert("이미지 다운로드 실패. 다시 시도해주세요.");
    }
  };

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const downloadPdf = async () => {
    if (!flyerRef.current) return;
    try {
      setIsGeneratingPdf(true);
      const element = flyerRef.current;
      
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.left = '0px';
      clone.style.top = '-99999px';
      clone.style.minHeight = '0px'; 
      clone.style.height = 'auto';

      document.body.appendChild(clone);

      const sections = Array.from(clone.querySelectorAll('[data-export-id]')) as HTMLElement[];
      sections.forEach(p => { p.style.display = 'flex'; });

      const pdf = new jsPDF('l', 'px', [1122, 794]);

      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const canvas = await (window as any).html2canvas(sec, {
          scale: 2, 
          useCORS: true,
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
      pdf.save(`${state.info.address || '보고서'}.pdf`);
      
    } catch (err) {
      console.error(err);
      alert("PDF 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDirectPrint = async () => {
    if (!flyerRef.current) return;
    try {
      setIsPrinting(true);
      const element = flyerRef.current;
      
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.left = '0px';
      clone.style.top = '-99999px';
      clone.style.minHeight = '0px'; 
      clone.style.height = 'auto';

      document.body.appendChild(clone);

      const sections = Array.from(clone.querySelectorAll('[data-export-id]')) as HTMLElement[];
      sections.forEach(p => { p.style.display = 'flex'; });

      // Create PDF with landscape orientation
      const pdf = new jsPDF('l', 'px', [1122, 794]);

      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const canvas = await (window as any).html2canvas(sec, {
          scale: 2, 
          useCORS: true,
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
  const getExportableSections = () => {
      return [
          { id: 'page-1', label: '1. 개요 (Overview)' },
          { id: 'page-2', label: '2. 가치 (Status & Valuation)' },
          { id: 'page-3', label: '3. 사진 (Field Photos)' },
          { id: 'page-4', label: '4. 입지 (Area Analysis)' },
          { id: 'page-5', label: '5. 로드맵 (Roadmap)' },
      ];
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
          <h2 className="text-2xl font-black mb-3 text-slate-100 tracking-tight">AI 매매보고서 접근 제한</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            {authError === "unauthorized" 
              ? "이 서비스를 이용하시려면 로그인이 필요합니다." 
              : "AI 매매보고서 서비스는 공실뉴스 [부동산 회원] 및 [최고 관리자]만 이용하실 수 있습니다. 일반 회원은 이용이 불가능합니다."}
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

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans relative">
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
      
      <header className="print:hidden bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <img 
                  src="/logo.png" 
                  className="h-9 w-auto object-contain cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95" 
                  alt="공실뉴스 로고" 
                  onClick={() => window.location.href = "/"}
                />
                <div className="flex items-center gap-3">
                  <h1 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                    AI 매매보고서
                  </h1>
                  {isLoadedFromStorage && (
                      <button 
                          onClick={handleResetAndRegenerate} 
                          className="px-2.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-600 hover:text-rose-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-rose-100 active:scale-95 rounded-lg transition-all duration-200"
                          title="임시저장 데이터를 지우고 AI로 처음부터 다시 생성합니다."
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                          </svg>
                          <span>AI 새로 생성</span>
                      </button>
                  )}
                </div>
            </div>
            <div></div>
        </div>
      </header>

      <main className="print:block print:h-auto print:p-0 flex-1 max-w-[1600px] mx-auto w-full p-4 lg:p-8 grid grid-cols-12 gap-6 h-[calc(100vh-64px)]">
        {isSidebarOpen && (
          <div className="print:hidden col-span-12 lg:col-span-4 xl:col-span-3 lg:h-full lg:overflow-hidden transition-all duration-300">
            <FlyerForm 
              info={state.info}
              setInfo={handleInfoChange}
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
              onOpenTableEditor={() => setIsTableEditorOpen(true)}
            />
          </div>
        )}
        <div className={`print:col-span-12 print:border-none print:bg-white print:m-0 print:p-0 transition-all duration-300 ${isSidebarOpen ? 'col-span-12 lg:col-span-8 xl:col-span-9' : 'col-span-12'} bg-gray-200/50 rounded-xl border border-gray-300 overflow-hidden flex flex-col`}>
            <div className="print:hidden bg-white px-4 py-2 border-b flex justify-between items-center text-xs text-gray-500">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded border border-gray-300 transition-all active:scale-95 text-xs flex items-center gap-1.5"
                    >
                        {isSidebarOpen ? "◀ 사이드바 접기" : "▶ 사이드바 펼치기"}
                    </button>
                    <span className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span>미리보기 에디터</span>
                </div>
                <span>Width: 860px (A4 가로 배율)</span>
            </div>
            <div className="print:overflow-visible print:p-0 print:block flex-1 overflow-auto p-8 flex justify-center custom-scrollbar">
                {/* Fixed width container for editor preview */}
                <div className="w-[860px] shrink-0 print:w-[1122px] print:mx-auto print:shrink">
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
      <div className="print:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] w-[95%] sm:w-auto sm:min-w-[520px] bg-white/95 backdrop-blur-md border border-gray-200/80 p-4 rounded-2xl shadow-[0_15px_35px_-5px_rgba(0,0,0,0.15)] flex items-center justify-between gap-4">
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

        {/* Image Export Button */}
        <button 
          onClick={() => setShowExportModal(true)}
          className="py-3 px-5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-95 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-150 shadow-sm"
        >
          <ArrowDownTrayIcon className="w-4 h-4 text-gray-500" />
          <span>이미지 내보내기</span>
        </button>

        {/* Direct Print Button */}
        <button 
          onClick={handleDirectPrint}
          disabled={isPrinting || isGeneratingPdf}
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
          className="py-3 px-5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-95 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-150 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
}

export default App;
