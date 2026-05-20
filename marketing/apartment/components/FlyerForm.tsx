
import React, { useRef, useState } from 'react';
import { PropertyInfo, FlyerSection, SectionItem, SectionType, TransactionType, FlyerColor, FlyerLayout } from '../types';
import { PhotoIcon, SparklesIcon, DocumentTextIcon, PlusIcon, TrashIcon, Squares2X2Icon, ListBulletIcon, ChevronUpIcon, ChevronDownIcon, CloudArrowUpIcon, CameraIcon, XMarkIcon, TableCellsIcon, MapPinIcon, LinkIcon, SwatchIcon, RectangleGroupIcon, GlobeAltIcon, ShareIcon } from '@heroicons/react/24/outline';

interface FlyerFormProps {
  info: PropertyInfo;
  setInfo: (info: PropertyInfo) => void;
  onImageUpload: (key: string, file: File) => void;
  onGenerate: () => void;
  onAnalyzeImage: (files: File[]) => void;
  onAnalyzeAgentImage?: (file: File) => void;
  onAnalyzeComplexImage?: (sectionId: string, file: File) => void;
  isGenerating: boolean;
  uploadedImages: Record<string, string | null | any>;
  colors: FlyerColor[];
  layouts: FlyerLayout[];
  currentColor: FlyerColor;
  currentLayout: FlyerLayout;
  onColorSelect: (color: FlyerColor) => void;
  onLayoutSelect: (layout: FlyerLayout) => void;
}

const FlyerForm: React.FC<FlyerFormProps> = ({ 
    info, setInfo, onImageUpload, onGenerate, onAnalyzeImage, onAnalyzeAgentImage, onAnalyzeComplexImage, isGenerating, uploadedImages, 
    colors, layouts, currentColor, currentLayout, onColorSelect, onLayoutSelect 
}) => {
  const analysisInputRef = useRef<HTMLInputElement>(null);
  const agentImageInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [analysisFiles, setAnalysisFiles] = useState<File[]>([]);
  const [agentImagePreview, setAgentImagePreview] = useState<string | null>(null);
  const [agentFile, setAgentFile] = useState<File | null>(null);
  const [complexFiles, setComplexFiles] = useState<Record<string, File>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInfo({ ...info, [name]: value });
  };

  const handleTransactionChange = (type: TransactionType) => {
      setInfo({ ...info, transactionType: type });
  };

  const handleFileChange = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageUpload(key, e.target.files[0]);
    }
  };

  const handleAnalysisFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const files: File[] = Array.from(e.target.files);
        setAnalysisFiles(prev => [...prev, ...files]);
        
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setPreviewUrls(prev => [...prev, ...newPreviews]);

        if (analysisInputRef.current) {
            analysisInputRef.current.value = '';
        }
    }
  };

  const handleRunSmartAnalysis = async () => {
      if (analysisFiles.length === 0) {
          alert("먼저 사진을 업로드해주세요.");
          return;
      }

      setIsAnalyzing(true);
      try {
          await onAnalyzeImage(analysisFiles);
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleAgentImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setAgentFile(file);
          setAgentImagePreview(URL.createObjectURL(file));
      }
  };

  const handleAiAnalysisClick = async () => {
    if (!onAnalyzeAgentImage) return;

    if (agentFile) {
        await onAnalyzeAgentImage(agentFile);
    } else if (uploadedImages.agentImage) {
        try {
            const response = await fetch(uploadedImages.agentImage);
            const blob = await response.blob();
            const file = new File([blob], "agent_image.jpg", { type: blob.type });
            setAgentFile(file);
            await onAnalyzeAgentImage(file);
        } catch (e) {
            agentImageInputRef.current?.click();
        }
    } else {
        agentImageInputRef.current?.click();
    }
  };

  const handleComplexFileChange = (sectionId: string) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setComplexFiles(prev => ({...prev, [sectionId]: file}));
        onImageUpload(`complexImage-${sectionId}`, file);
    }
  };

  const handleComplexAnalysisClick = (sectionId: string) => {
      if (!onAnalyzeComplexImage) return;
      
      const file = complexFiles[sectionId];
      if (file) {
          onAnalyzeComplexImage(sectionId, file);
      } else if (uploadedImages[`complexImage-${sectionId}`]) {
           fetch(uploadedImages[`complexImage-${sectionId}`])
            .then(res => res.blob())
            .then(blob => {
                const f = new File([blob], "complex_info.jpg", { type: blob.type });
                setComplexFiles(prev => ({...prev, [sectionId]: f}));
                onAnalyzeComplexImage(sectionId, f);
            })
            .catch(() => {
                document.getElementById(`complex-upload-${sectionId}`)?.click();
            });
      } else {
          document.getElementById(`complex-upload-${sectionId}`)?.click();
      }
  };

  const clearPreviews = () => {
    setPreviewUrls([]);
    setAnalysisFiles([]);
  };

  // Section Management functions...
  const addSection = (type: SectionType) => {
      const newSection: FlyerSection = {
          id: `section-${Date.now()}`,
          type,
          title: type === 'grid' ? '주요 특징' : type === 'list' ? '공간 상세' : type === 'table' ? '단지 정보' : '관련 링크',
          intro: type === 'grid' ? 'HIGHLIGHTS' : type === 'list' ? 'DETAILS' : type === 'table' ? 'COMPLEX INFO' : 'MEDIA & NEWS',
          description: type === 'list' ? '상세 설명을 입력해주세요.' : undefined,
          items: [
              { id: `item-${Date.now()}-1`, text: '', title: type === 'table' ? '' : type === 'sns' ? '홍보 영상' : undefined, imageKey: type === 'sns' ? 'youtube' : `img-${Date.now()}-1` }
          ]
      };
      setInfo({ ...info, sections: [...info.sections, newSection] });
  };

  const removeSection = (sectionIndex: number) => {
      const newSections = info.sections.filter((_, i) => i !== sectionIndex);
      setInfo({ ...info, sections: newSections });
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
      const newSections = [...info.sections];
      if (direction === 'up' && index > 0) {
          [newSections[index], newSections[index - 1]] = [newSections[index - 1], newSections[index]];
      } else if (direction === 'down' && index < newSections.length - 1) {
          [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
      }
      setInfo({ ...info, sections: newSections });
  };

  const updateSection = (sectionIndex: number, field: keyof FlyerSection, value: any) => {
      const newSections = info.sections.map((sec, i) => {
          if (i === sectionIndex) {
              return { ...sec, [field]: value };
          }
          return sec;
      });
      setInfo({ ...info, sections: newSections });
  };

  const addItemToSection = (sectionIndex: number) => {
      const newSections = info.sections.map((sec, i) => {
          if (i === sectionIndex) {
              if (sec.items.length >= 12) {
                  alert("섹션당 최대 12개까지만 추가 가능합니다.");
                  return sec;
              }
              return {
                  ...sec,
                  items: [
                      ...sec.items,
                      {
                          id: `item-${Date.now()}`,
                          text: '',
                          title: sec.type === 'list' ? `공간 0${sec.items.length + 1}` : sec.type === 'sns' ? '새 링크' : undefined,
                          imageKey: sec.type === 'sns' ? 'youtube' : `img-${sec.id}-${Date.now()}`
                      }
                  ]
              };
          }
          return sec;
      });
      setInfo({ ...info, sections: newSections });
  };

  const removeItemFromSection = (sectionIndex: number, itemIndex: number) => {
      const targetSection = info.sections[sectionIndex];
      if (targetSection.items.length <= 1) {
           alert("최소 1개의 항목이 필요합니다.");
           return;
      }
      const newSections = info.sections.map((sec, i) => {
          if (i === sectionIndex) {
              return {
                  ...sec,
                  items: sec.items.filter((_, itemIdx) => itemIdx !== itemIndex)
              };
          }
          return sec;
      });
      setInfo({ ...info, sections: newSections });
  };

  const moveItemInSection = (sectionIndex: number, itemIndex: number, direction: 'up' | 'down') => {
      const newSections = info.sections.map((sec, i) => {
          if (i === sectionIndex) {
              const newItems = [...sec.items];
              if (direction === 'up' && itemIndex > 0) {
                  [newItems[itemIndex], newItems[itemIndex - 1]] = [newItems[itemIndex - 1], newItems[itemIndex]];
              } else if (direction === 'down' && itemIndex < newItems.length - 1) {
                  [newItems[itemIndex], newItems[itemIndex + 1]] = [newItems[itemIndex + 1], newItems[itemIndex]];
              }
              return { ...sec, items: newItems };
          }
          return sec;
      });
      setInfo({ ...info, sections: newSections });
  };

  const updateItemInSection = (sectionIndex: number, itemIndex: number, field: keyof SectionItem, value: string) => {
      const newSections = info.sections.map((sec, i) => {
          if (i === sectionIndex) {
              const newItems = sec.items.map((item, itemIdx) => {
                  if (itemIdx === itemIndex) {
                      return { ...item, [field]: value };
                  }
                  return item;
              });
              return { ...sec, items: newItems };
          }
          return sec;
      });
      setInfo({ ...info, sections: newSections });
  };

  const addAgentInfoItem = () => {
    const current = info.agentAdditionalInfo || [];
    setInfo({ ...info, agentAdditionalInfo: [...current, ""] });
  };

  const removeAgentInfoItem = (index: number) => {
    const current = info.agentAdditionalInfo || [];
    setInfo({ ...info, agentAdditionalInfo: current.filter((_, i) => i !== index) });
  };

  const updateAgentInfoItem = (index: number, value: string) => {
    const current = info.agentAdditionalInfo || [];
    const updated = [...current];
    updated[index] = value;
    setInfo({ ...info, agentAdditionalInfo: updated });
  };

  const clearAgentInfo = () => {
    if(confirm("중개사 정보를 초기화하시겠습니까?")) {
        setInfo({ ...info, agentName: '', agentPhone: '', agentMobile: '', agentRepresentative: '', agentMapUrl: '', consultationUrl: '', agentAdditionalInfo: [], socialYoutube: '', socialBlog: '', socialInstagram: '', socialFacebook: '', socialKakao: '', socialThreads: '' });
    }
  };

  const primaryColor = currentColor.primary;

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 h-full overflow-y-auto custom-scrollbar">
      
      {/* Design Theme Selection */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
             <SwatchIcon className="w-5 h-5" />
             디자인 색상 선택
        </h3>
        <div className="flex gap-3 mb-6">
            {colors.map(color => (
                <button
                    key={color.id}
                    onClick={() => onColorSelect(color)}
                    className={`w-10 h-10 rounded-full border-2 transition-all shadow-sm flex items-center justify-center ${currentColor.id === color.id ? 'border-gray-800 scale-110 ring-2 ring-offset-2 ring-gray-300' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: color.primary }}
                    title={color.name}
                >
                    {currentColor.id === color.id && <div className="w-2 h-2 bg-white rounded-full"></div>}
                </button>
            ))}
        </div>

        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
             <RectangleGroupIcon className="w-5 h-5" />
             레이아웃 테마 선택
        </h3>
        <div className="flex gap-3">
             {layouts.map((layout, idx) => (
                 <button
                    key={layout.id}
                    onClick={() => onLayoutSelect(layout)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${currentLayout.id === layout.id ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                 >
                     <span className="block text-lg mb-1">{idx + 1}</span>
                     {layout.name.split(' ')[0]}
                 </button>
             ))}
        </div>
      </div>

      {/* Smart Analysis Section */}
      <div className="mb-8 p-4 rounded-xl border" style={{ backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}30` }}>
        <h3 className="text-sm font-bold flex items-center gap-2 mb-3" style={{ color: primaryColor }}>
             <CameraIcon className="w-5 h-5" />
             스마트 매물 분석 (이미지 자동 완성)
        </h3>
        <p className="text-xs text-gray-500 mb-3">
            매물 전단지, 정보지, 사진(JPG/PNG)을 여러 장 업로드하여 자동 생성<br/>
            AI가 내용을 분석하여 아래 입력 폼을 자동으로 채워줍니다.
        </p>
        
        <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
                <input 
                    ref={analysisInputRef}
                    type="file" 
                    accept="image/jpeg, image/png"
                    onChange={handleAnalysisFileChange}
                    className="hidden" 
                    id="analysis-upload"
                    multiple
                />
                <label 
                    htmlFor="analysis-upload"
                    className={`w-full py-3 rounded-lg border-2 border-dashed text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all hover:text-white bg-white`}
                    style={{ 
                        borderColor: `${primaryColor}66`, 
                        color: primaryColor,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = primaryColor; e.currentTarget.style.color = 'white'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.color = primaryColor; }}
                >
                    <CloudArrowUpIcon className="w-5 h-5" />
                    {analysisFiles.length > 0 ? `${analysisFiles.length}장 선택됨 (클릭하여 추가)` : "매물정보 업로드(JPG/PNG)"}
                </label>
            </div>
            
            <button
                onClick={handleRunSmartAnalysis}
                disabled={analysisFiles.length === 0 || isAnalyzing}
                className={`px-4 rounded-lg font-bold text-white transition-all flex flex-col items-center justify-center gap-1 min-w-[80px] text-xs ${analysisFiles.length === 0 || isAnalyzing ? 'opacity-50 cursor-not-allowed bg-gray-400' : 'shadow-md hover:opacity-90'}`}
                style={{ backgroundColor: analysisFiles.length > 0 && !isAnalyzing ? primaryColor : undefined }}
            >
                {isAnalyzing ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : (
                    <SparklesIcon className="w-5 h-5" />
                )}
                AI 분석
            </button>
        </div>

        {/* Previews of analyzed images */}
        {previewUrls.length > 0 && (
            <div className="mt-3 relative">
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {previewUrls.map((url, idx) => (
                        <div key={idx} className="w-16 h-16 rounded border border-gray-200 overflow-hidden flex-shrink-0 relative group bg-white">
                            <img src={url} className="w-full h-full object-cover" />
                        </div>
                    ))}
                </div>
                <button 
                    onClick={clearPreviews} 
                    className="absolute -top-2 -right-2 bg-gray-200 rounded-full p-1 text-gray-500 hover:bg-gray-300"
                    title="Clear previews"
                >
                    <XMarkIcon className="w-3 h-3" />
                </button>
            </div>
        )}
      </div>

      <div className="mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <DocumentTextIcon className="w-6 h-6" style={{ color: primaryColor }} />
          매물 정보 입력
        </h2>
      </div>

      <div className="space-y-8">
        
        {/* Basic Info */}
        <div className="space-y-4">
            <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }}></span>
                기본 정보
            </h3>
            {/* ... Inputs ... */}
            <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">매물 명칭 (타이틀)</label>
                <input
                    type="text"
                    name="address"
                    value={info.address}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded outline-none focus:ring-1"
                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                    placeholder="예: 래미안 퍼스티지"
                />
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">매물 슬로건 (헤드카피)</label>
                <input
                    type="text"
                    name="promotionText"
                    value={info.promotionText}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded outline-none focus:ring-1"
                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                    placeholder="예: 매매 45억 또는 월세 2억/500만"
                />
            </div>
             <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">서브 타이틀</label>
                <input
                    type="text"
                    name="subTitle"
                    value={info.subTitle}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded outline-none focus:ring-1"
                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                    placeholder="예: 한강 조망 | 입주협의"
                />
            </div>
             {/* Main Photo */}
            <div className="pt-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1">메인 매물 사진 (전단지 배경)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center relative hover:bg-gray-50 transition-colors group overflow-hidden h-32 flex items-center justify-center">
                    {uploadedImages.mainImage ? (
                        <img src={uploadedImages.mainImage} className="absolute inset-0 w-full h-full object-cover" />
                    ) : null}
                    <div className={`flex flex-col items-center relative z-10 ${uploadedImages.mainImage ? 'bg-white/80 p-2 rounded' : ''}`}>
                        <PhotoIcon className="w-6 h-6 text-gray-400 group-hover:text-gray-600" />
                        <span className="text-xs text-gray-400 mt-1">클릭하여 업로드</span>
                    </div>
                    <input type="file" accept="image/*" onChange={handleFileChange('mainImage')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                </div>
            </div>
        </div>

        <hr className="border-gray-200" />
        
        {/* Price & Specs Section */}
        <div className="space-y-4 pt-2">
             <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }}></span>
                거래 금액 및 상세 스펙
            </h3>
            
            {/* Transaction Type Selection */}
            <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">거래 유형</label>
                <div className="flex gap-2">
                    {['매매', '전세', '월세', '단기임대'].map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => handleTransactionChange(type as TransactionType)}
                            className={`flex-1 py-2 text-xs font-bold rounded border transition-colors`}
                            style={{
                                backgroundColor: info.transactionType === type ? primaryColor : 'white',
                                color: info.transactionType === type ? 'white' : '#4b5563',
                                borderColor: info.transactionType === type ? primaryColor : '#e5e7eb'
                            }}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Price Inputs */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                     <label className="block text-xs font-semibold text-gray-500 mb-1">
                        {info.transactionType === '매매' ? '매매가' : '보증금'}
                     </label>
                     <input
                        name="priceMain"
                        value={info.priceMain}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-sm border rounded outline-none focus:ring-1"
                        style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                        placeholder={info.transactionType === '매매' ? '예: 10억 5천' : '예: 5,000만'}
                     />
                </div>
                {(info.transactionType === '월세' || info.transactionType === '단기임대') && (
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">월세</label>
                        <input
                            name="priceSub"
                            value={info.priceSub}
                            onChange={handleChange}
                            className="w-full px-3 py-2 text-sm border rounded outline-none focus:ring-1"
                            style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                            placeholder="예: 60만"
                        />
                    </div>
                )}
            </div>
             <div>
                 <label className="block text-xs font-semibold text-gray-500 mb-1">관리비</label>
                 <input
                    name="managementFee"
                    value={info.managementFee}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border rounded outline-none focus:ring-1"
                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                    placeholder="예: 20만원 (인터넷 포함)"
                 />
            </div>

            {/* Spec Inputs */}
            <div className="grid grid-cols-2 gap-3 pt-2">
                 {[
                    { label: '면적 (전용/공급)', name: 'area', placeholder: '84㎡ / 112㎡' },
                    { label: '층수', name: 'floor', placeholder: '15층 / 20층' },
                    { label: '방향', name: 'direction', placeholder: '남향 (거실 기준)' },
                    { label: '방/욕실 수', name: 'roomCount', placeholder: '3개 / 2개' },
                    { label: '주차', name: 'parking', placeholder: '세대당 1대' },
                    { label: '입주가능일', name: 'moveInDate', placeholder: '즉시 입주' }
                 ].map(field => (
                     <div key={field.name}>
                         <label className="block text-xs font-semibold text-gray-500 mb-1">{field.label}</label>
                         <input 
                            name={field.name} 
                            value={(info as any)[field.name]} 
                            onChange={handleChange} 
                            className="w-full px-2 py-1.5 text-xs border rounded outline-none focus:ring-1" 
                            style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                            placeholder={field.placeholder} 
                        />
                     </div>
                 ))}
            </div>
            
            <div>
                 <label className="block text-xs font-semibold text-gray-500 mb-1">옵션 정보</label>
                 <input
                    name="options"
                    value={info.options}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs border rounded outline-none focus:ring-1"
                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                    placeholder="예: 시스템에어컨, 냉장고, 세탁기 풀옵션"
                 />
            </div>

            <div>
                 <label className="block text-xs font-semibold text-gray-500 mb-1">상세 설명 제목 (중간 박스)</label>
                 <input name="noticeTitle" value={info.noticeTitle} onChange={handleChange} className="w-full px-3 py-2 text-xs border rounded outline-none focus:ring-1" style={{ '--tw-ring-color': primaryColor } as React.CSSProperties} />
            </div>
            <div>
                 <label className="block text-xs font-semibold text-gray-500 mb-1">상세 설명 내용 (중간 박스, 줄바꿈 가능)</label>
                 <textarea name="noticeContent" value={info.noticeContent} onChange={handleChange} rows={5} className="w-full px-3 py-2 text-xs border rounded outline-none focus:ring-1" style={{ '--tw-ring-color': primaryColor } as React.CSSProperties} />
            </div>
        </div>

        <hr className="border-gray-200" />
        
        {/* Dynamic Sections Loop */}
        {info.sections.map((section, sIndex) => (
            <div key={section.id} className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200 relative transition-all">
                {/* Header */}
                <div className="flex justify-between items-center mb-2">
                     <div className="flex items-center gap-2">
                        <span 
                            className="text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider"
                            style={{ backgroundColor: section.type === 'grid' ? primaryColor : section.type === 'list' ? currentColor.dark : section.type === 'table' ? 'gray' : '#ef4444' }}
                        >
                            {section.type === 'grid' ? '사진/특징 그리드' : 
                             section.type === 'list' ? '상세 설명 리스트' : 
                             section.type === 'table' ? '단지 정보 테이블' : 'SNS 링크'}
                        </span>
                     </div>
                     <div className="flex gap-1">
                         <button type="button" onClick={() => moveSection(sIndex, 'up')} disabled={sIndex === 0} className="p-1 rounded-full border border-gray-100 text-gray-500 hover:bg-gray-100"><ChevronUpIcon className="w-4 h-4" /></button>
                         <button type="button" onClick={() => moveSection(sIndex, 'down')} disabled={sIndex === info.sections.length - 1} className="p-1 rounded-full border border-gray-100 text-gray-500 hover:bg-gray-100"><ChevronDownIcon className="w-4 h-4" /></button>
                         <div className="w-px h-6 bg-gray-200 mx-1"></div>
                         <button type="button" onClick={() => removeSection(sIndex)} className="text-red-400 hover:text-red-600 p-1 bg-white rounded-full shadow-sm border border-gray-100"><TrashIcon className="w-4 h-4" /></button>
                     </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-gray-400 mb-1">섹션 제목</label>
                        <input value={section.title} onChange={(e) => updateSection(sIndex, 'title', e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded outline-none focus:ring-1" style={{ '--tw-ring-color': primaryColor } as React.CSSProperties} placeholder="제목" />
                    </div>
                    <div>
                         <label className="block text-[10px] font-bold text-gray-400 mb-1">영문/소제목</label>
                        <input value={section.intro || ''} onChange={(e) => updateSection(sIndex, 'intro', e.target.value)} className="w-full px-2 py-1.5 text-xs border rounded outline-none focus:ring-1" style={{ '--tw-ring-color': primaryColor } as React.CSSProperties} placeholder="INTRO" />
                    </div>
                    {section.type === 'list' && (
                         <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-gray-400 mb-1">섹션 설명</label>
                            <textarea value={section.description || ''} onChange={(e) => updateSection(sIndex, 'description', e.target.value)} rows={2} className="w-full px-2 py-1.5 text-xs border rounded outline-none focus:ring-1" style={{ '--tw-ring-color': primaryColor } as React.CSSProperties} placeholder="설명" />
                        </div>
                    )}
                </div>

                {/* Complex Info Analysis Upload Area */}
                {section.type === 'table' && (
                    <div className="mt-4 mb-2 bg-white p-3 rounded border border-gray-100">
                        <label className="block text-[10px] font-bold text-gray-400 mb-2">단지 정보 사진 (자동 입력)</label>
                        <div className="flex gap-3 items-center">
                            <div className="relative w-16 h-16 bg-gray-100 rounded border border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50 overflow-hidden">
                                {uploadedImages[`complexImage-${section.id}`] ? (
                                    <img src={uploadedImages[`complexImage-${section.id}`]} className="w-full h-full object-cover" />
                                ) : (
                                    <PhotoIcon className="w-6 h-6 text-gray-400" />
                                )}
                                <input 
                                    id={`complex-upload-${section.id}`}
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleComplexFileChange(section.id)} 
                                    className="absolute inset-0 opacity-0 cursor-pointer" 
                                />
                            </div>
                            <div className="flex-1">
                                <button 
                                    onClick={() => document.getElementById(`complex-upload-${section.id}`)?.click()}
                                    className="text-xs font-bold hover:underline mb-1"
                                    style={{ color: primaryColor }}
                                >
                                    이미지 업로드
                                </button>
                                <p className="text-[10px] text-gray-400">단지 개요표 등을 올리면 자동으로 정보를 입력해줍니다.</p>
                            </div>
                            <button
                                onClick={() => handleComplexAnalysisClick(section.id)}
                                className="px-3 py-1.5 text-white text-xs font-bold rounded hover:opacity-90 flex items-center gap-1"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <SparklesIcon className="w-3 h-3" />
                                AI 분석
                            </button>
                        </div>
                    </div>
                )}

                <div className="space-y-3 mt-4">
                    {section.items.map((item, iIndex) => {
                        const previewUrl = uploadedImages[item.imageKey];
                        return (
                          <div key={item.id} className="flex gap-3 items-start bg-white p-3 rounded border border-gray-100">
                              
                              {section.type !== 'table' && section.type !== 'sns' && (
                                <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0 overflow-hidden relative group cursor-pointer border hover:border-gray-400">
                                    {previewUrl ? (
                                        <img src={previewUrl} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <PhotoIcon className="w-6 h-6" />
                                        </div>
                                    )}
                                    <input type="file" accept="image/*" onChange={handleFileChange(item.imageKey)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>
                              )}

                              <div className="flex-1 space-y-2">
                                  {(section.type === 'list' || section.type === 'table' || section.type === 'sns') && (
                                      <input 
                                        value={item.title || ''} 
                                        onChange={(e) => updateItemInSection(sIndex, iIndex, 'title', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border rounded outline-none focus:ring-1 font-bold" 
                                        style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                        placeholder={section.type === 'table' ? "항목명 (예: 세대수)" : section.type === 'sns' ? "기사/영상 제목 (예: 반포 자이 시세 분석)" : "공간 소제목 (Living Room)"} 
                                      />
                                  )}

                                  {section.type === 'sns' && (
                                      <select
                                          value={item.imageKey}
                                          onChange={(e) => updateItemInSection(sIndex, iIndex, 'imageKey', e.target.value)}
                                          className="w-full px-2 py-1 text-xs border rounded outline-none focus:ring-1"
                                          style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                      >
                                          <option value="youtube">YouTube (영상)</option>
                                          <option value="blog">Blog (블로그)</option>
                                          <option value="news">News (뉴스)</option>
                                      </select>
                                  )}
                                  
                                  {section.type === 'table' ? (
                                      <input 
                                        value={item.text} 
                                        onChange={(e) => updateItemInSection(sIndex, iIndex, 'text', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border rounded outline-none focus:ring-1" 
                                        style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                        placeholder="내용 (예: 2444세대)" 
                                      />
                                  ) : section.type === 'sns' ? (
                                      <input 
                                        value={item.text} 
                                        onChange={(e) => updateItemInSection(sIndex, iIndex, 'text', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border rounded outline-none focus:ring-1" 
                                        style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                        placeholder="링크 URL 입력 (예: https://youtube.com/...)" 
                                      />
                                  ) : (
                                    <textarea 
                                        value={item.text} 
                                        onChange={(e) => updateItemInSection(sIndex, iIndex, 'text', e.target.value)}
                                        rows={2} 
                                        className="w-full px-2 py-1 text-xs border rounded outline-none focus:ring-1 resize-none" 
                                        style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                        placeholder={section.type === 'grid' ? "특징 설명 (짧게)" : "공간 상세 설명"} 
                                    />
                                  )}
                              </div>

                              <div className="flex flex-col gap-1">
                                  <button onClick={() => moveItemInSection(sIndex, iIndex, 'up')} disabled={iIndex === 0} className="text-gray-400 hover:text-gray-600"><ChevronUpIcon className="w-3 h-3" /></button>
                                  <button onClick={() => moveItemInSection(sIndex, iIndex, 'down')} disabled={iIndex === section.items.length - 1} className="text-gray-400 hover:text-gray-600"><ChevronDownIcon className="w-3 h-3" /></button>
                                  <button onClick={() => removeItemFromSection(sIndex, iIndex)} className="text-red-300 hover:text-red-500"><TrashIcon className="w-3 h-3" /></button>
                              </div>
                          </div>
                        );
                    })}
                </div>
                
                <button 
                    onClick={() => addItemToSection(sIndex)}
                    className="w-full py-2 mt-2 border border-dashed rounded text-xs font-bold flex items-center justify-center gap-1 hover:opacity-70 transition-opacity"
                    style={{ borderColor: primaryColor, color: primaryColor }}
                >
                    <PlusIcon className="w-3 h-3" /> 항목 추가
                </button>
            </div>
        ))}

        {/* Agent Info Section */}
        <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200 relative transition-all mt-4">
            <div className="flex justify-between items-center mb-2">
                 <div className="flex items-center gap-2">
                    <span className="text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider" style={{ backgroundColor: primaryColor }}>
                        중개사 정보
                    </span>
                 </div>
                 <div className="flex gap-1">
                     <button type="button" disabled title="고정 섹션" className="p-1 rounded-full border border-gray-100 text-gray-300 cursor-not-allowed"><ChevronUpIcon className="w-4 h-4" /></button>
                     <button type="button" disabled title="고정 섹션" className="p-1 rounded-full border border-gray-100 text-gray-300 cursor-not-allowed"><ChevronDownIcon className="w-4 h-4" /></button>
                     <div className="w-px h-6 bg-gray-200 mx-1"></div>
                     <button type="button" onClick={clearAgentInfo} className="text-red-400 hover:text-red-600 p-1 bg-white rounded-full shadow-sm border border-gray-100"><TrashIcon className="w-4 h-4" /></button>
                 </div>
            </div>

            <div className="mb-4 bg-white p-3 rounded border border-gray-100">
                <label className="block text-[10px] font-bold text-gray-400 mb-2">명함/로고 사진 (자동 입력)</label>
                <div className="flex gap-3 items-center">
                    <div className="relative w-16 h-16 bg-gray-100 rounded border border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50 overflow-hidden">
                        {agentImagePreview || uploadedImages.agentImage ? (
                            <img src={agentImagePreview || uploadedImages.agentImage} className="w-full h-full object-cover" />
                        ) : (
                            <PhotoIcon className="w-6 h-6 text-gray-400" />
                        )}
                        <input 
                            ref={agentImageInputRef}
                            type="file" 
                            accept="image/*" 
                            onChange={handleAgentImageFileChange} 
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                        />
                    </div>
                    <div className="flex-1">
                        <button 
                            onClick={() => agentImageInputRef.current?.click()}
                            className="text-xs font-bold hover:underline mb-1"
                            style={{ color: primaryColor }}
                        >
                            이미지 업로드
                        </button>
                        <p className="text-[10px] text-gray-400">명함이나 로고를 올리면 자동으로 정보를 입력해줍니다.</p>
                    </div>
                    <button
                        onClick={handleAiAnalysisClick}
                        className="px-3 py-1.5 text-white text-xs font-bold rounded hover:opacity-90 flex items-center gap-1"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <SparklesIcon className="w-3 h-3" />
                        AI 분석
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                 {[
                    { label: '중개사/사무소명', name: 'agentName', placeholder: '예: 래미안 공인중개사' },
                    { label: '대표자명', name: 'agentRepresentative', placeholder: '예: 박미양' },
                    { label: '연락처 (일반전화)', name: 'agentPhone', placeholder: '예: 02-123-4567' },
                    { label: '휴대전화 (스마트폰)', name: 'agentMobile', placeholder: '예: 010-1234-5678' }
                 ].map(field => (
                    <div key={field.name}>
                        <label className="block text-[10px] font-bold text-gray-400 mb-1">{field.label}</label>
                        <input 
                            name={field.name} 
                            value={(info as any)[field.name]} 
                            onChange={handleChange} 
                            className="w-full px-2 py-1.5 text-sm border rounded outline-none focus:ring-1" 
                            style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                            placeholder={field.placeholder} 
                        />
                    </div>
                 ))}
                 
                 <div className="col-span-2 bg-gray-100 p-2 rounded space-y-2">
                    <div className="flex gap-2 items-center">
                        <MapPinIcon className="w-4 h-4 text-gray-500"/>
                        <input name="agentMapUrl" value={info.agentMapUrl || ''} onChange={handleChange} className="flex-1 px-2 py-1.5 text-xs border rounded outline-none focus:ring-1" style={{ '--tw-ring-color': primaryColor } as React.CSSProperties} placeholder="네이버 지도 링크 (선택)" />
                    </div>
                    <div className="flex gap-2 items-center">
                        <LinkIcon className="w-4 h-4 text-gray-500"/>
                        <input name="consultationUrl" value={info.consultationUrl || ''} onChange={handleChange} className="flex-1 px-2 py-1.5 text-xs border rounded outline-none focus:ring-1" style={{ '--tw-ring-color': primaryColor } as React.CSSProperties} placeholder="문의하기 버튼 링크 (카카오톡 등)" />
                    </div>
                 </div>

                 {/* Social Media Inputs */}
                 <div className="col-span-2 bg-gray-50 p-2 rounded border border-gray-100 mt-2">
                    <h4 className="text-[10px] font-bold text-gray-400 mb-2 flex items-center gap-1">
                        <GlobeAltIcon className="w-3 h-3" /> SNS 링크 (아이콘 자동 생성)
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { name: 'socialYoutube', placeholder: '유튜브 URL', label: 'YouTube' },
                            { name: 'socialBlog', placeholder: '블로그 URL', label: 'Blog' },
                            { name: 'socialInstagram', placeholder: '인스타그램 URL', label: 'Instagram' },
                            { name: 'socialFacebook', placeholder: '페이스북 URL', label: 'Facebook' },
                            { name: 'socialKakao', placeholder: '카카오톡 채널 URL', label: 'KakaoTalk' },
                            { name: 'socialThreads', placeholder: '쓰레드 URL', label: 'Threads' },
                        ].map(item => (
                            <div key={item.name} className="relative">
                                <span className="absolute left-2 top-1.5 text-[10px] text-gray-400 font-bold">{item.label}</span>
                                <input 
                                    name={item.name}
                                    value={(info as any)[item.name]}
                                    onChange={handleChange}
                                    className="w-full pl-2 pr-2 pt-5 pb-1 text-xs border rounded outline-none focus:ring-1"
                                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                    placeholder={item.placeholder}
                                />
                            </div>
                        ))}
                    </div>
                 </div>

            </div>

            {info.agentAdditionalInfo && info.agentAdditionalInfo.length > 0 && (
                <div className="space-y-2 mt-2">
                     {info.agentAdditionalInfo.map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                            <input 
                                value={item} 
                                onChange={(e) => updateAgentInfoItem(idx, e.target.value)}
                                className="flex-1 px-2 py-1.5 text-sm border rounded outline-none focus:ring-1" 
                                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                placeholder="추가 정보 (예: 등록번호, 주소)" 
                            />
                            <button onClick={() => removeAgentInfoItem(idx)} className="text-red-300 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                        </div>
                     ))}
                </div>
            )}

            <button 
                onClick={addAgentInfoItem}
                className="w-full py-2 mt-2 border border-dashed rounded text-xs font-bold flex items-center justify-center gap-1 hover:opacity-70 transition-opacity"
                style={{ borderColor: primaryColor, color: primaryColor }}
            >
                <PlusIcon className="w-3 h-3" /> 항목 추가
            </button>
        </div>

        <div className="flex gap-2 pt-4 pb-8">
             {['grid', 'list', 'table', 'sns'].map(type => (
                 <button 
                    key={type}
                    onClick={() => addSection(type as SectionType)}
                    className="flex-1 py-3 bg-white border rounded-lg shadow-sm text-sm font-bold flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
                    style={{ borderColor: primaryColor, color: primaryColor }}
                >
                    {type === 'grid' && <Squares2X2Icon className="w-5 h-5" />}
                    {type === 'list' && <ListBulletIcon className="w-5 h-5" />}
                    {type === 'table' && <TableCellsIcon className="w-5 h-5" />}
                    {type === 'sns' && <ShareIcon className="w-5 h-5" />}
                    {type === 'grid' ? '사진특징' : type === 'list' ? '상세설명' : type === 'table' ? '단지정보' : 'SNS'} 섹션 추가
                </button>
             ))}
        </div>

      </div>
    </div>
  );
};

export default FlyerForm;