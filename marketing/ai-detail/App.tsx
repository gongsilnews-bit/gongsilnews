
import React, { useState, useRef, useEffect } from 'react';
import FlyerForm from './components/FlyerForm';
import FlyerCanvas, { FlyerOrientation, PAGE_SIZE } from './components/FlyerCanvas';
// Removed geminiService import
import { FlyerState, PropertyInfo, GeneratedContent, FlyerColor, FlyerLayout } from './types';
import { ArrowDownTrayIcon } from '@heroicons/react/24/solid';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { buildFlyerRows } from './flyerRows';
import { toCanvas } from 'html-to-image';

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
  promotionText: "월세 2억/520 만원",
  address: "래미안 퍼스티지",
  subTitle: "트리플 역세권의 편리함 | 대한민국 최상위 명문 학군 | 한강 생활권의 여유",
  
  transactionType: "월세",
  priceMain: "2억",
  priceSub: "520만",
  managementFee: "50만원 (커뮤니티 포함)",
  
  area: "전용 116㎡ / 공급 152㎡",
  floor: "25층 / 총 35층",
  direction: "남향 (거실 기준)",
  roomCount: "4개 / 2개",
  parking: "세대당 2.5대",
  moveInDate: "즉시 입주 가능",
  options: "독일 주방가구, 시스템 에어컨, 고급 원목마루, 빌트인 가전 풀옵션",
  badge: "급매",
  pyeong: "46평",
  showPhoto: true,
  sizeLine: "46평 · 25층",
  flyerGroup: "A",
  rows: [
    { id: "s1", label: "면적", value: "공급 152㎡(46평) / 전용 116㎡(35평)" },
    { id: "s2", label: "방/욕실", value: "4개 / 2개" },
    { id: "s3", label: "방향", value: "남향" },
    { id: "s4", label: "관리비", value: "50만원" },
    { id: "s5", label: "입주", value: "즉시 입주" },
    { id: "s6", label: "세대수", value: "2,444세대" },
    { id: "s7", label: "커뮤니티", value: "피트니스 · 수영장 · 스카이라운지" },
  ],

  agentName: "단지내바른공인중개사사무소",
  agentRepresentative: "대표 공인중개사 박미양",
  agentPhone: "02-595-0071",
  agentMobile: "010-1234-5678",
  agentMapUrl: "https://map.naver.com",
  consultationUrl: "https://open.kakao.com",
  agentAdditionalInfo: [
    "등록번호: 11650-2018-00170",
    "소재지: 서울특별시 서초구 반포대로 287,1층 134호 (반포동 18-3,래미안퍼스티지 중심상가)",
  ],
  
  socialYoutube: "",
  socialBlog: "",
  socialInstagram: "",
  socialFacebook: "",
  socialKakao: "",
  socialThreads: "",

  noticeTitle: "RAEMIAN PRIDE",
  noticeContent: "◼︎ 세계적인 설계사들이 참여한 랜드마크 디자인\n◼︎ 스카이 브릿지, 수영장, 사우나 등 호텔급 커뮤니티\n◼︎ 신세계백화점, 성모병원, 고속터미널 등 최상의 인프라\n◼︎ 한강공원과 바로 연결되는 쾌적한 주거 환경\n◼︎ 명문 학군과 우수한 교통망을 갖춘 최고의 입지",
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
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showAutoSaveIndicator, setShowAutoSaveIndicator] = useState(false);
  const flyerRef = useRef<HTMLDivElement>(null);
  const hiddenFileInputRef = useRef<HTMLInputElement>(null);

  const [showSharePopover, setShowSharePopover] = useState(false);
  const sharePopoverRef = useRef<HTMLDivElement>(null);

  // 5. URL 파라미터 기반 공실 데이터 연동 로드
  const [loadingData, setLoadingData] = useState(false);
  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState<Record<string, boolean>>({});
  const [authError, setAuthError] = useState<string | null>(null);

  const handleTextChange = (key: any, value: string) => {
      setState(prev => ({ ...prev, info: { ...prev.info, [key]: value } }));
      setIsDirty(true);
  };


  const [activeImageKey, setActiveImageKey] = useState<string>('');

  const handleImageClick = (imageKey: string) => {
      setActiveImageKey(imageKey);
      hiddenFileInputRef.current?.click();
  };

  const handleHiddenFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && activeImageKey) {
          await handleImageUpload(activeImageKey, file);
      }
      if (hiddenFileInputRef.current) hiddenFileInputRef.current.value = '';
  };

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
        const photos = json.photos || [];
        if (json.qrUrl) setQrUrl(json.qrUrl);

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
          subTitle: `${v.property_type || "프리미엄"} | ${v.direction || "방향 없음"} | ${areaDisplay}`,
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
          badge: "",
          pyeong: supArea ? `${Math.round(supArea / 3.3058)}평` : excArea ? `${Math.round(excArea / 3.3058)}평` : "",
          showPhoto: auto.showPhoto,
          sizeLine: auto.sizeLine,
          rows: auto.rows,
          flyerGroup: auto.group,
          
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
    await document.fonts?.ready;
    return toCanvas(flyerRef.current, {
      width: w, height: h, canvasWidth: w * 2, canvasHeight: h * 2, pixelRatio: 1,
      backgroundColor: '#ffffff', cacheBust: true,
    });
  };

  const fileBaseName = () => `유리창홍보지_${(state.info.address || '매물').replace(/[\\/:*?"<>|\s]+/g, '_')}`;

  // ── 이미지 내보내기: 보이는 한 장 그대로 JPG ──
  const handleExportImage = async () => {
    setIsExporting(true);
    try {
      const canvas = await capturePage();
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `${fileBaseName()}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
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

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-32">
      {loadingData && (
        <div className="fixed inset-0 bg-slate-900/80 z-[200] flex flex-col items-center justify-center text-white backdrop-blur-sm">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-amber-500 mb-6"></div>
          <h2 className="text-xl font-bold mb-2">🪄 공실 데이터 가져오는 중...</h2>
          <p className="text-sm text-slate-400">매물 정보로 유리창 홍보지를 구성하고 있습니다.</p>
        </div>
      )}
      
      
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <img 
                  src="/logo.png" 
                  className="h-9 w-auto object-contain cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95" 
                  alt="공실뉴스 로고" 
                  onClick={() => window.location.href = "/"}
                />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3">
                    <h1 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                      유리창 홍보지
                    </h1>
                    <span className="text-xs font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-md ml-1 border border-red-100">
                      초안작성이기 때문에 부정확할 수 있습니다. 참고하시기 바랍니다.
                    </span>
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
            </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto w-full p-4 lg:p-8 grid grid-cols-12 gap-6 items-start">
        <div className="col-span-12 lg:col-span-4 xl:col-span-3">
          <FlyerForm 
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
                <span className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span>미리보기 · A4 한 장 (보이는 그대로 인쇄됩니다)</span>
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
                        <div className="mx-auto shadow-2xl" style={{ width: w * scale, height: h * scale }}>
                            <div style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                                <FlyerCanvas
                                    ref={flyerRef}
                                    data={state}
                                    orientation={orientation}
                                    qrDataUrl={qrDataUrl}
                                    qrLink={qrUrl}
                                    onTextChange={handleTextChange}
                                    onImageClick={handleImageClick}
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

        {/* AI Reset/Regenerate Button */}
        {isLoadedFromStorage && (
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
    </div>
  );
}

export default App;
