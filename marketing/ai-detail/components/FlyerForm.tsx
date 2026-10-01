
import React from 'react';
import { PropertyInfo, TransactionType, FlyerColor, FlyerLayout } from '../types';
import { PhotoIcon, DocumentTextIcon, PlusIcon, TrashIcon, SwatchIcon, RectangleGroupIcon } from '@heroicons/react/24/outline';

interface FlyerFormProps {
  info: PropertyInfo;
  setInfo: (info: PropertyInfo) => void;
  onImageUpload: (key: string, file: File) => void;
  uploadedImages: Record<string, string | null | any>;
  colors: FlyerColor[];
  layouts: FlyerLayout[];
  currentColor: FlyerColor;
  currentLayout: FlyerLayout;
  onColorSelect: (color: FlyerColor) => void;
  onLayoutSelect: (layout: FlyerLayout) => void;
  isUploadingImage?: Record<string, boolean>;
}

const FlyerForm: React.FC<FlyerFormProps> = ({ 
    info, setInfo, onImageUpload, uploadedImages, 
    colors, layouts, currentColor, currentLayout, onColorSelect, onLayoutSelect, isUploadingImage
}) => {

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
        setInfo({ ...info, agentName: '', agentPhone: '', agentMobile: '', agentRepresentative: '', agentAdditionalInfo: [] });
    }
  };

  const adjustColor = (hex: string, percent: number): string => {
    let cleanHex = hex.replace(/^\s*#|\s*$/g, '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.replace(/(.)/g, '$1$1');
    }
    let r = parseInt(cleanHex.substring(0, 2), 16);
    let g = parseInt(cleanHex.substring(2, 4), 16);
    let b = parseInt(cleanHex.substring(4, 6), 16);

    r = Math.min(255, Math.max(0, r + Math.round(percent * 2.55)));
    g = Math.min(255, Math.max(0, g + Math.round(percent * 2.55)));
    b = Math.min(255, Math.max(0, b + Math.round(percent * 2.55)));

    const rHex = r.toString(16).padStart(2, '0');
    const gHex = g.toString(16).padStart(2, '0');
    const bHex = b.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  };

  const primaryColor = currentColor.primary;

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
      
      {/* Design Theme Selection */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
             <SwatchIcon className="w-5 h-5" />
             디자인 색상 선택
        </h3>
        <div className="flex items-center gap-3 mb-6 flex-wrap">
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

            {/* Custom Color Picker Swatch */}
            <div 
                className={`relative w-10 h-10 rounded-full border transition-all shadow-sm flex items-center justify-center cursor-pointer hover:scale-105 ${currentColor.id === 'custom' ? 'border-gray-800 scale-110 ring-2 ring-offset-2 ring-gray-300' : 'border-gray-200 hover:border-gray-300'}`}
                style={{ 
                    backgroundColor: currentColor.id === 'custom' ? '#f0f5fa' : '#ffffff'
                }}
                title="직접 색상 선택"
            >
                <input 
                    type="color"
                    value={currentColor.id === 'custom' ? currentColor.primary : '#00788c'}
                    onChange={(e) => {
                        const val = e.target.value;
                        onColorSelect({
                            id: 'custom',
                            name: '사용자 지정',
                            primary: val,
                            secondary: adjustColor(val, 40),
                            dark: adjustColor(val, -45)
                        });
                    }}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                />
                
                {/* Paintbrush icon matching user image */}
                <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    strokeWidth="1.8" 
                    stroke="currentColor" 
                    className={`w-5 h-5 transition-colors ${currentColor.id === 'custom' ? 'text-slate-800' : 'text-slate-400'}`}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122A3 3 0 0 0 13.5 20.38m-3.97-4.258 5.764-5.764L15 6.622l-1.242-.88 2.84-2.84a1.2 1.2 0 1 1 1.697 1.696L15.45 6.439l-.88-1.242-5.764 5.764M9.53 16.122a3 3 0 0 0-3.97-4.258m3.97 4.258H3" />
                </svg>

                {currentColor.id === 'custom' && (
                    <div 
                        className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: currentColor.primary }}
                    />
                )}
            </div>
        </div>

        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
             <RectangleGroupIcon className="w-5 h-5" />
             레이아웃 테마 선택
        </h3>
        <div className="grid grid-cols-4 gap-2">
             {layouts.map((layout, idx) => (
                 <button
                    key={layout.id}
                    onClick={() => onLayoutSelect(layout)}
                    className={`py-2 rounded-lg border text-xs font-bold transition-all flex flex-col items-center justify-center ${currentLayout.id === layout.id ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                 >
                     <span className="block text-lg mb-0.5">{idx + 1}</span>
                     <span className="text-[10px] text-center leading-tight">{layout.name.replace(' ', '\n')}</span>
                 </button>
             ))}
        </div>
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
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center relative hover:bg-gray-50 transition-colors group overflow-hidden h-32 flex items-center justify-center bg-gray-50">
                    {uploadedImages.mainImage ? (
                        <img src={uploadedImages.mainImage} className="absolute inset-0 w-full h-full object-cover" />
                    ) : null}
                    {isUploadingImage && isUploadingImage.mainImage ? (
                        <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center text-white text-xs font-bold gap-2 z-30">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>압축 및 저장 중...</span>
                        </div>
                    ) : (
                        <div className={`flex flex-col items-center relative z-10 ${uploadedImages.mainImage ? 'bg-white/80 p-2 rounded' : ''}`}>
                            <PhotoIcon className="w-6 h-6 text-gray-400 group-hover:text-gray-600" />
                            <span className="text-xs text-gray-400 mt-1">클릭하여 업로드</span>
                        </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange('mainImage')} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
                      disabled={isUploadingImage && !!isUploadingImage.mainImage}
                    />
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

            {/* 유리창 홍보지 — 딱지 · 평형 · 사진 */}
            <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">딱지 (빨간 표시)</label>
                <div className="flex gap-1.5 flex-wrap">
                    {['', '급매', '초급매', '신규', '가격조정'].map((b) => (
                        <button
                            key={b || 'none'}
                            type="button"
                            onClick={() => setInfo({ ...info, badge: b })}
                            className="px-3 py-1.5 text-xs font-bold rounded border transition-colors"
                            style={{
                                backgroundColor: (info.badge || '') === b ? (b ? '#e11d2a' : '#374151') : 'white',
                                color: (info.badge || '') === b ? 'white' : '#4b5563',
                                borderColor: (info.badge || '') === b ? (b ? '#e11d2a' : '#374151') : '#e5e7eb',
                            }}
                        >
                            {b || '없음'}
                        </button>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">평형 (크게 표시)</label>
                    <input
                        name="pyeong"
                        value={info.pyeong || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-sm border rounded outline-none focus:ring-1"
                        style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                        placeholder="예: 46평"
                    />
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer select-none pb-2">
                    <input
                        type="checkbox"
                        checked={info.showPhoto !== false}
                        onChange={(e) => setInfo({ ...info, showPhoto: e.target.checked })}
                        className="w-4 h-4"
                    />
                    대표 사진 넣기
                </label>
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

        {/* Agent Info Section — 홍보지 아래쪽 연락처 */}
        <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200 relative transition-all">
            <div className="flex justify-between items-center mb-2">
                 <span className="text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider" style={{ backgroundColor: primaryColor }}>
                     중개사 연락처
                 </span>
                 <button type="button" onClick={clearAgentInfo} className="text-red-400 hover:text-red-600 p-1 bg-white rounded-full shadow-sm border border-gray-100"><TrashIcon className="w-4 h-4" /></button>
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

      </div>
    </div>
  );
};

export default FlyerForm;
