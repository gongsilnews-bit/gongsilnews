
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vacancyId = params.get("vacancy_id");

    if (vacancyId) {
      const loadVacancyData = async () => {
        setLoadingData(true);
        try {
          const res = await fetch(`/api/vacancy/detail?id=${vacancyId}`);
          const json = await res.json();
          if (json.success && json.data) {
            const v = json.data;
            
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
          }
        } catch (err) {
          console.error("공실 데이터 연동 오류:", err);
        } finally {
          setLoadingData(false);
        }
      };

      loadVacancyData();
    }
  }, []);

  const handleInfoChange = (newInfo: PropertyInfo) => {
    setState(prev => ({ ...prev, info: newInfo }));
  };

  const handleColorChange = (color: FlyerColor) => {
    setState(prev => ({ ...prev, colorTheme: color }));
  };

  const handleLayoutChange = (layout: FlyerLayout) => {
    setState(prev => ({ ...prev, layoutTheme: layout }));
  };

  const handleImageUpload = (key: string, file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setState(prev => ({
      ...prev,
      [key]: objectUrl
    }));
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
    setIsGenerating(true);
    try {
        const imagesData = await Promise.all(files.map(async (file) => ({
            data: await fileToGenerativePart(file),
            mimeType: file.type
        })));

        const { info: extractedInfo, generated } = await extractPropertyInfoFromImages(imagesData);

        // Map uploaded files to object URLs for flyer display
        const newImages: Record<string, string> = {};
        const imageSlots = [
            'mainImage', 
            'subImage1', 'subImage2', 
            'featureImage1', 'featureImage2', 'featureImage3', 'featureImage4'
        ];
        
        let fileIndex = 0;
        
        imageSlots.forEach(slot => {
            if (!state[slot] && fileIndex < files.length) {
                newImages[slot] = URL.createObjectURL(files[fileIndex]);
                fileIndex++;
            }
        });

        const mergedInfo: PropertyInfo = {
            ...state.info,
            ...extractedInfo,
            sections: state.info.sections 
        };

        applyGeneratedContent(generated, mergedInfo, newImages);

    } catch (e) {
        console.error(e);
        alert("이미지 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        setIsGenerating(false); 
    }
  };

  // 3. Agent Image Analysis
  const handleAnalyzeAgentImage = async (file: File) => {
      // Set the image first
      handleImageUpload('agentImage', file);
      
      setIsGenerating(true);
      try {
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
      handleImageUpload(`complexImage-${sectionId}`, file);
      
      setIsGenerating(true);
      try {
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
      
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xl font-serif" style={{ backgroundColor: state.colorTheme.primary }}>
                    {state.colorTheme.name[0]}
                </div>
                <h1 className="text-xl font-bold text-gray-800">EasyRealtor AI <span className="text-xs text-gray-500 font-normal ml-2">부동산 전단지 제작</span></h1>
            </div>
            <div className="flex gap-3">
                <button onClick={downloadHtml} className="px-4 py-2 bg-white border text-sm font-medium flex items-center gap-2 hover:bg-gray-50 rounded-lg" style={{ borderColor: state.colorTheme.primary, color: state.colorTheme.primary }}>
                    <CodeBracketIcon className="w-4 h-4" /> HTML 저장
                </button>
                <button onClick={() => setShowExportModal(true)} className="px-4 py-2 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity" style={{ backgroundColor: state.colorTheme.primary }}>
                    <ArrowDownTrayIcon className="w-4 h-4" /> 이미지 저장
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
