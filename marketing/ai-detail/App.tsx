
import React, { useState, useRef, useEffect } from 'react';
import FlyerForm from './components/FlyerForm';
import FlyerCanvas from './components/FlyerCanvas';
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

  sections: [
    {
      id: 'section-features',
      type: 'grid',
      intro: "Experience of PRIDE",
      title: "래미안이 선사하는 가치",
      items: [
        { id: 'feat-1', text: '파노라마 한강 뷰', imageKey: 'featureImage1' },
        { id: 'feat-2', text: '호텔식 조식 서비스', imageKey: 'featureImage2' },
        { id: 'feat-3', text: '프라이빗 스카이 라운지', imageKey: 'featureImage3' },
        { id: 'feat-4', text: '최첨단 IoT 시스템', imageKey: 'featureImage4' },
      ]
    },
    {
      id: 'section-zones',
      type: 'list',
      intro: "THE COLLECTION",
      title: "품격 있는 공간 미학",
      description: "머무는 것만으로도 자부심이 되는 공간.\n섬세한 디테일과 고급스러운 마감재로 완성된 래미안의 인테리어를 만나보세요.",
      items: [
        { 
          id: 'zone-1', 
          title: 'LIVING & DINING', 
          text: '탁 트인 개방감과 우아한 아트월이 조화를 이루는 거실은 가족의 품격을 대변합니다. 다이닝 공간은 갤러리 같은 분위기를 연출합니다.', 
          imageKey: 'subImage1' 
        },
        { 
          id: 'zone-2', 
          title: 'MASTER ZONE', 
          text: '휴식 그 이상의 가치를 선사하는 마스터룸. 넓은 드레스룸과 호텔식 파우더룸은 일상을 특별하게 만들어줍니다.', 
          imageKey: 'subImage2' 
        }
      ]
    },
    {
      id: 'section-complex',
      type: 'table',
      intro: "COMPLEX INFO",
      title: "단지 정보",
      items: [
        { id: 'info-1', title: '세대수', text: '2444세대(장기전세 266세대 포함, 총28개동)', imageKey: '' },
        { id: 'info-2', title: '저/최고층', text: '23층/32층', imageKey: '' },
        { id: 'info-3', title: '사용승인일', text: '2009년 07월 14일', imageKey: '' },
        { id: 'info-4', title: '총주차대수', text: '4368대(세대당 1.78대)', imageKey: '' },
        { id: 'info-5', title: '용적률', text: '269%', imageKey: '' },
        { id: 'info-6', title: '건폐율', text: '12%', imageKey: '' },
        { id: 'info-7', title: '건설사', text: '삼성물산(주)', imageKey: '' },
        { id: 'info-8', title: '난방', text: '지역난방, 열병합', imageKey: '' },
        { id: 'info-9', title: '관리사무소', text: '02-599-9960', imageKey: '' },
        { id: 'info-10', title: '주소', text: '서울시 서초구 반포동 18-1', imageKey: '' },
        { id: 'info-11', title: '면적', text: '86T2㎡, 87P㎡, 113L1㎡, 113T2㎡, 113T1㎡ 외', imageKey: '' },
      ]
    }
  ]
};

const INITIAL_GENERATED: GeneratedContent = {
  promotionText: INITIAL_INFO.promotionText,
  summary: "",
  gridInfo: {
    title: INITIAL_INFO.sections[0].title,
    intro: INITIAL_INFO.sections[0].intro || "",
    features: INITIAL_INFO.sections[0].items.map(i => i.text)
  },
  listInfo: {
    title: INITIAL_INFO.sections[1].title,
    intro: INITIAL_INFO.sections[1].intro || "",
    description: INITIAL_INFO.sections[1].description || "",
    items: INITIAL_INFO.sections[1].items.map(i => ({ title: i.title || "", description: i.text }))
  }
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
                    <h3 className="font-bold text-lg text-gray-800">이미지 저장 옵션</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="w-5 h-5"/></button>
                </div>
                <div className="p-4">
                    <p className="text-sm text-gray-500 mb-4">저장하고 싶은 섹션만 선택하세요.</p>
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
                        선택한 섹션 저장 ({selected.size})
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
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const flyerRef = useRef<HTMLDivElement>(null);

  // 5. URL 파라미터 기반 공실 데이터 연동 로드
  const [loadingData, setLoadingData] = useState(false);
  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState<Record<string, boolean>>({});

  const loadVacancyDataDirectly = async (vacancyId: string) => {
    setLoadingData(true);
    try {
      const res = await fetch(`/api/vacancy/detail?id=${vacancyId}`);
      const json = await res.json();
      if (json.success && json.data) {
        const v = json.data;

        // 1. Supabase 클라우드 동기화 데이터 우선 로드
        const supabaseFlyerSettings = json.flyer?.flyer_state || v.infrastructure?._flyer_settings;
        if (supabaseFlyerSettings) {
          setState(supabaseFlyerSettings);
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
            setState(savedState);
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
          
          agentName,
          agentRepresentative,
          agentPhone,
          agentMobile,
          agentMapUrl: fullAddress ? `https://map.naver.com/p/search/${encodeURIComponent(fullAddress)}` : "",
          consultationUrl: "",
          agentAdditionalInfo: additionalInfo,

          noticeTitle: "PREMIUM LISTING DETAIL",
          noticeContent: v.description || "상세 설명이 등록되지 않았습니다.",
          sections: newSections
        };

        // AI 문구 자동 생성 작동
        setIsGenerating(true);
        const aiCopy = await generateFlyerCopy(mappedInfo);
        
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
      const res = await fetch("/api/vacancy/save-flyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vacancyId, flyerState: state })
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

      const res = await fetch("/api/vacancy/save-flyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vacancyId, flyerState: state })
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
    const shareUrl = `${window.location.origin}/flyer/${vacancyId}`;
    
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
    setState(prev => ({ ...prev, info: newInfo }));
  };

  const handleColorChange = (color: FlyerColor) => {
    setState(prev => ({ ...prev, colorTheme: color }));
  };

  const handleLayoutChange = (layout: FlyerLayout) => {
    setState(prev => ({ ...prev, layoutTheme: layout }));
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

  const downloadHtml = async () => {
    if (!flyerRef.current) return;
    try {
        const clone = flyerRef.current.cloneNode(true) as HTMLElement;
        const imgs = clone.querySelectorAll('img');
        
        // Remove fixed width/height for responsive behavior in downloaded file
        clone.style.width = '100%';
        clone.style.maxWidth = '860px';
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
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${state.info.address} - 매물정보</title>
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
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = '860px'; // Enforce width for consistency
      
      // FIX: Force auto height to remove whitespace from min-h-[1400px] class
      clone.style.minHeight = '0px'; 
      clone.style.height = 'auto';

      document.body.appendChild(clone);

      // Filter sections: remove ones not in selectedIds
      const sections = clone.querySelectorAll('[data-export-id]');
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
        width: 860, // Fixed width
        windowWidth: 1080, 
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0
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

  // Generate selectable sections list
  const getExportableSections = () => {
      const sections = [
          { id: 'hero', label: '메인 타이틀/이미지 (Hero)' },
          { id: 'stats', label: '요약 스탯 (Bar)' },
          { id: 'basic-info', label: '매물 상세 정보 (Table)' },
      ];

      state.info.sections.forEach((sec) => {
          sections.push({ 
              id: sec.id, 
              label: `${sec.title} (${sec.type === 'grid' ? '사진특징' : sec.type === 'list' ? '상세설명' : sec.type === 'table' ? '단지정보' : 'SNS'})` 
          });
      });

      sections.push({ id: 'agent-info', label: '중개사 정보 (Footer)' });
      return sections;
  };

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
      
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <img 
                  src="/logo.png" 
                  className="h-9 w-auto object-contain cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95" 
                  alt="공실뉴스 로고" 
                  onClick={() => window.location.href = "/"}
                />
                <div className="flex flex-col">
                  <h1 className="text-base sm:text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                    AI매물상세보기
                    <span className="text-xs text-gray-400 font-normal hidden sm:inline">공실뉴스</span>
                  </h1>
                  {isInitialized && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold tracking-tight">
                        {isLoadedFromStorage ? "임시저장 편집중" : "자동 저장 활성"}
                      </span>
                    </div>
                  )}
                </div>
            </div>
            <div className="flex gap-2 sm:gap-3 items-center">
                {isLoadedFromStorage && (
                    <button 
                        onClick={handleResetAndRegenerate} 
                        className="px-3 py-2 bg-rose-50 border border-rose-200 text-rose-600 hover:text-rose-700 text-xs sm:text-sm font-semibold flex items-center gap-1.5 hover:bg-rose-100 active:scale-95 rounded-lg transition-all duration-200"
                        title="임시저장 데이터를 지우고 AI로 처음부터 다시 생성합니다."
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        <span className="hidden md:inline">AI 새로 생성</span>
                        <span className="md:hidden">초기화</span>
                    </button>
                )}
                <button 
                    onClick={handleSaveToStorage} 
                    disabled={isSavingCloud}
                    className="px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-600 hover:text-emerald-700 text-xs sm:text-sm font-semibold flex items-center gap-1.5 hover:bg-emerald-100 active:scale-95 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="현재 작업 내용을 수동으로 임시저장합니다."
                >
                    {isSavingCloud ? (
                        <svg className="animate-spin h-3.5 w-3.5 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                        </svg>
                    )}
                    <span>{isSavingCloud ? "저장 중..." : "임시 저장"}</span>
                </button>
                <button 
                    onClick={handleCopyShareLink} 
                    className="px-3 py-2 bg-blue-50 border border-blue-200 text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-bold flex items-center gap-1.5 hover:bg-blue-100 active:scale-95 rounded-lg transition-all duration-200"
                    title="전단지를 저장하고, 다른 사람에게 공유할 수 있는 링크 주소를 복사합니다."
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935-2.186 2.25 2.25 0 00-3.935 2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                    </svg>
                    <span>링크 복사</span>
                </button>
                <div className="h-5 w-[1px] bg-gray-200 mx-1"></div>
                <button onClick={downloadHtml} className="px-3 py-2 bg-white border text-xs sm:text-sm font-semibold flex items-center gap-1.5 hover:bg-gray-50 rounded-lg transition-colors" style={{ borderColor: state.colorTheme.primary, color: state.colorTheme.primary }}>
                    <CodeBracketIcon className="w-3.5 h-3.5" /> HTML 저장
                </button>
                <button onClick={() => setShowExportModal(true)} className="px-3.5 py-2 text-white rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all" style={{ backgroundColor: state.colorTheme.primary }}>
                    <ArrowDownTrayIcon className="w-3.5 h-3.5" /> 이미지 저장
                </button>
            </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] mx-auto w-full p-4 lg:p-8 grid grid-cols-12 gap-6 h-[calc(100vh-64px)]">
        <div className="col-span-12 lg:col-span-4 xl:col-span-3 lg:h-full lg:overflow-hidden">
          <FlyerForm 
            info={state.info}
            setInfo={handleInfoChange}
            onImageUpload={handleImageUpload}
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
          />
        </div>
        <div className="col-span-12 lg:col-span-8 xl:col-span-9 bg-gray-200/50 rounded-xl border border-gray-300 overflow-hidden flex flex-col">
            <div className="bg-white px-4 py-2 border-b flex justify-between items-center text-xs text-gray-500">
                <span className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span>미리보기</span>
                <span>Width: 860px</span>
            </div>
            <div className="flex-1 overflow-auto p-8 flex justify-center custom-scrollbar">
                {/* Fixed width container for editor preview */}
                <div style={{ width: '860px', flexShrink: 0 }}>
                    <FlyerCanvas ref={flyerRef} data={state} />
                </div>
            </div>
        </div>
      </main>
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
