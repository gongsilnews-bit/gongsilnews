import React, { useState } from 'react';
import { PropertyInfo, FlyerColor, FlyerLayout } from '../types';
import { SwatchIcon, RectangleGroupIcon, PhotoIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

interface FlyerFormProps {
  info: PropertyInfo;
  setInfo: (info: PropertyInfo) => void;
  onImageUpload: (key: string, file: File) => void;
  onDeleteImage?: (key: string) => void;
  colors: FlyerColor[];
  layouts: FlyerLayout[];
  currentColor: FlyerColor;
  currentLayout: FlyerLayout;
  onColorSelect: (color: FlyerColor) => void;
  onLayoutSelect: (layout: FlyerLayout) => void;
  uploadedImages: Record<string, string | null | any>;
  isUploadingImage?: Record<string, boolean>;
  activeTab: number | 'all';
  setActiveTab: (tab: number | 'all') => void;
  onOpenTableEditor: () => void;
  onBackTab?: () => void;
}

const FlyerForm: React.FC<FlyerFormProps> = ({ 
    info, setInfo, onImageUpload, onDeleteImage,
    colors, layouts, currentColor, currentLayout, onColorSelect, onLayoutSelect,
    uploadedImages, isUploadingImage,
    activeTab, setActiveTab,
    onOpenTableEditor, onBackTab
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setInfo({ ...info, [name]: value });
  };

  const handleNestedChange = (parent: string, key: string, value: string) => {
    setInfo({ ...info, [parent]: { ...(info as any)[parent], [key]: value } });
  };

  const handleFloorStatusChange = (index: number, key: string, value: string) => {
    const newFloorStatus = [...info.floorStatus];
    newFloorStatus[index] = { ...newFloorStatus[index], [key]: value };
    setInfo({ ...info, floorStatus: newFloorStatus });
  };

  const addFloorStatus = () => {
    const newFloorStatus = [...(info.floorStatus || [])];
    newFloorStatus.push({ floor: '', purpose: '', lease: '', status: '', note: '' });
    setInfo({ ...info, floorStatus: newFloorStatus });
  };

  const removeFloorStatus = (index: number) => {
    const newFloorStatus = [...(info.floorStatus || [])];
    newFloorStatus.splice(index, 1);
    setInfo({ ...info, floorStatus: newFloorStatus });
  };

  const handleHighlightsChange = (index: number, value: string) => {
    const newHighlights = [...info.highlights];
    newHighlights[index] = value;
    setInfo({ ...info, highlights: newHighlights });
  };

  const addHighlight = () => {
    const newHighlights = [...(info.highlights || [])];
    newHighlights.push('');
    setInfo({ ...info, highlights: newHighlights });
  };

  const removeHighlight = (index: number) => {
    const newHighlights = [...(info.highlights || [])];
    newHighlights.splice(index, 1);
    setInfo({ ...info, highlights: newHighlights });
  };

  const handleFileChange = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageUpload(key, e.target.files[0]);
    }
  };

  const primaryColor = currentColor.primary;

  const renderImageUpload = (key: string, label: string) => (
      <div className="mb-4 animate-fadeIn">
          <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-gray-500">{label}</label>
              {uploadedImages[key] && onDeleteImage && (
                  <button
                      type="button"
                      onClick={() => onDeleteImage(key)}
                      className="text-red-500 hover:text-red-700 font-bold text-[10px] flex items-center gap-0.5 border-none bg-transparent cursor-pointer transition-colors"
                  >
                      <TrashIcon className="w-3.5 h-3.5" />
                      <span>삭제</span>
                  </button>
              )}
          </div>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center relative hover:bg-gray-50 transition-colors group overflow-hidden h-32 flex items-center justify-center bg-gray-50">
              {uploadedImages[key] ? (
                  <img src={uploadedImages[key]} className="absolute inset-0 w-full h-full object-cover" />
              ) : null}
              {isUploadingImage && isUploadingImage[key] ? (
                  <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center text-white text-xs font-bold z-30">
                      <span>업로드 중...</span>
                  </div>
              ) : (
                  <div className={`flex flex-col items-center relative z-10 ${uploadedImages[key] ? 'bg-white/80 p-2 rounded' : ''}`}>
                      <PhotoIcon className="w-6 h-6 text-gray-400 group-hover:text-gray-600" />
                      <span className="text-xs text-gray-400 mt-1">클릭하여 업로드</span>
                  </div>
              )}
              <input 
                type="file" accept="image/*" onChange={handleFileChange(key)} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
                disabled={isUploadingImage && !!isUploadingImage[key]}
              />
          </div>
      </div>
  );

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 h-full overflow-y-auto custom-scrollbar flex flex-col">
      
      {/* Design Theme Selection */}
      <div className="mb-8 shrink-0">
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
                    title={color.name || '색상'}
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
                     <span className="text-[10px] text-center leading-tight whitespace-pre-wrap">{layout.name ? layout.name.replace(' ', '\n') : `타입 ${idx + 1}`}</span>
                 </button>
             ))}
        </div>
        
        <div className="mt-4">
             <label className="text-xs font-bold text-gray-500 block mb-1">하단 공통 문구 (Footer Text)</label>
             <input 
                 type="text" 
                 name="footerText" 
                 value={info.footerText || "PROPERTY REPORT"} 
                 onChange={handleChange} 
                 className="w-full border rounded p-2 text-sm font-semibold tracking-wider placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                 placeholder="PROPERTY REPORT"
             />
        </div>
      </div>

      <hr className="border-gray-100 mb-6 shrink-0" />

      {/* Combined Tabs & Page Visibility Toggles */}
      <div className="grid grid-cols-3 gap-2.5 bg-gray-100/80 p-3 rounded-xl mb-6 shrink-0 shadow-inner">
          {[
              { id: 'all' as const, label: '전체' },
              { id: 0, label: '0. 표지' },
              { id: 1, label: '1. 개요' },
              { id: 2, label: '2. 매물설명 & 시세' },
              { id: 3, label: '3. 임대현황' },
              { id: 4, label: '4. 사진' },
              { id: 5, label: '5. 입지' },
              { id: 6, label: '6. 로드맵' },
              { id: 7, label: '7. 연락처' },
          ].map(tab => {
              let visiblePages = [...(info.visiblePages || [0, 1, 2, 3, 4, 5, 6, 7])];
              
              let isVisible = false;
              let isAllSelected = false;
              if (tab.id === 'all') {
                  isAllSelected = [0, 1, 2, 3, 4, 5, 6, 7].every(p => visiblePages.includes(p));
                  isVisible = isAllSelected;
              } else {
                  isVisible = visiblePages.includes(tab.id as number);
              }

              return (
                  <div
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative flex flex-col justify-center items-center h-[75px] px-2 text-xs sm:text-[13px] font-bold rounded-lg transition-all cursor-pointer ${activeTab === tab.id ? 'bg-white text-blue-700 shadow-md ring-2 ring-blue-500 z-10' : 'bg-white/60 text-gray-500 hover:bg-white ring-1 ring-gray-200/50'}`}
                  >
                      {/* Checkbox wrapper */}
                      <div 
                          className="absolute top-1.5 right-1.5"
                          onClick={(e) => e.stopPropagation()}
                      >
                          <input 
                              type="checkbox" 
                              className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                              checked={isVisible}
                              title={tab.id === 'all' ? "전체 출력 선택/해제" : "출력(포함) 여부"}
                              onChange={(e) => {
                                  if (tab.id === 'all') {
                                      setInfo({ ...info, visiblePages: e.target.checked ? [0, 1, 2, 3, 4, 5, 6, 7] : [] });
                                  } else {
                                      let newVisible = [...visiblePages];
                                      if (e.target.checked) {
                                          if (!newVisible.includes(tab.id as number)) newVisible.push(tab.id as number);
                                      } else {
                                          newVisible = newVisible.filter(p => p !== tab.id);
                                      }
                                      newVisible.sort();
                                      setInfo({ ...info, visiblePages: newVisible });
                                  }
                              }}
                          />
                      </div>
                      <span className={`mt-2 text-center leading-tight ${!isVisible && tab.id !== 'all' ? 'text-gray-400 opacity-60' : 'text-gray-800'}`}>
                          {tab.label}
                      </span>
                  </div>
              );
          })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto pr-2 pb-10 space-y-6">
          
          {(activeTab === 0 || (activeTab === 'all' && (info.visiblePages || [0, 1, 2, 3, 4, 5, 6, 7]).includes(0))) && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'h-[620px] overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                      <div className="pb-2 border-b-[3px] border-black mb-4">
                          <h2 className="text-xl font-black text-black tracking-tight">0. 표지</h2>
                      </div>
                      <div>
                          <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">표지 기본 정보</h4>
                          <div className="space-y-3">
                              <div>
                                  <label className="text-xs text-gray-500">표지 대제목 (Title)</label>
                                  <textarea name="address" value={info.address || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm font-semibold resize-y" rows={2} />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500">표지 부제목 (Subtitle)</label>
                                  <input type="text" name="coverSubtitle" value={info.coverSubtitle || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm" />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500">QR 안내 링크 (QR Code Link)</label>
                                  <input type="text" name="coverQRLink" value={info.coverQRLink || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm placeholder-gray-400 font-mono" placeholder="https://..." />
                              </div>
                          </div>
                      </div>
                  </div>

                  {activeTab === 'all' && (
                      <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-white via-white/90 to-transparent flex items-end justify-center pb-6 z-10 pointer-events-none">
                          <button 
                              type="button" 
                              onClick={() => setActiveTab(0)}
                              className="pointer-events-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-full shadow-lg flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                          >
                              📝 0. 표지 수정하기
                          </button>
                      </div>
                  )}
                  {activeTab !== 'all' && (
                      <div className="flex gap-2 justify-center mt-6 pt-6 border-t border-gray-100">
                          <button 
                              type="button" 
                              onClick={onBackTab || (() => setActiveTab('all'))}
                              className="flex-1 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-lg transition-colors text-sm"
                          >
                              뒤로가기
                          </button>
                          <button 
                              type="button" 
                              onClick={() => setActiveTab('all')}
                              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors shadow-sm text-sm"
                          >
                              전체보기
                          </button>
                      </div>
                  )}
              </div>
          )}

          {(activeTab === 1 || (activeTab === 'all' && (info.visiblePages || [0, 1, 2, 3, 4, 5, 6, 7]).includes(1))) && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'h-[620px] overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                      <div className="pb-2 border-b-[3px] border-black mb-4">
                          <h2 className="text-xl font-black text-black tracking-tight">1. 개요</h2>
                      </div>
                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">기본 타이틀</h4>
                      <div className="space-y-3">
                          <div><label className="text-xs text-gray-500">보고서 제목 (Address)</label><textarea name="address" value={info.address || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm resize-y" rows={2} /></div>
                          <div><label className="text-xs text-gray-500">서브 타이틀</label><textarea name="subTitle" value={info.subTitle || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm resize-y" rows={3} /></div>
                      </div>
                  </div>

                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">물건 개요 (표)</h4>
                      <div className="space-y-3">
                          {(() => {
                              const tbl = Array.isArray(info.overviewTable) 
                                  ? info.overviewTable 
                                  : (() => {
                                      const { detectPropertyCategory, getOverviewTemplate } = require('../../propertyTemplates');
                                      const cat = detectPropertyCategory(info.propertyCategory);
                                      const isSale = !info.transactionType || info.transactionType === '매매';
                                      const template = getOverviewTemplate(cat, isSale);
                                      const tblObj = info.overviewTable as any;
                                      return template.map((f: any) => ({
                                        label: f.label,
                                        value: (tblObj && f.dataKey ? tblObj[f.dataKey] : '') || ''
                                      }));
                                    })();
                              
                              return (
                                  <>
                                      {tbl.map((row, i) => (
                                          <div key={i} className="flex gap-1.5 items-center bg-gray-50 p-2 rounded border border-transparent hover:border-gray-200 transition-colors">
                                              <div className="flex flex-col gap-0.5 shrink-0">
                                                  <button
                                                      type="button"
                                                      disabled={i === 0}
                                                      onClick={() => {
                                                          const newTable = [...tbl];
                                                          const temp = newTable[i];
                                                          newTable[i] = newTable[i - 1];
                                                          newTable[i - 1] = temp;
                                                          setInfo({ ...info, overviewTable: newTable });
                                                      }}
                                                      className="text-gray-400 hover:text-gray-700 disabled:opacity-30 hover:bg-gray-200 rounded p-0.5 transition-colors"
                                                  >
                                                      <ArrowUpIcon className="w-3.5 h-3.5" />
                                                  </button>
                                                  <button
                                                      type="button"
                                                      disabled={i === tbl.length - 1}
                                                      onClick={() => {
                                                          const newTable = [...tbl];
                                                          const temp = newTable[i];
                                                          newTable[i] = newTable[i + 1];
                                                          newTable[i + 1] = temp;
                                                          setInfo({ ...info, overviewTable: newTable });
                                                      }}
                                                      className="text-gray-400 hover:text-gray-700 disabled:opacity-30 hover:bg-gray-200 rounded p-0.5 transition-colors"
                                                  >
                                                      <ArrowDownIcon className="w-3.5 h-3.5" />
                                                  </button>
                                              </div>
                                              <input 
                                                  value={row.label} 
                                                  onChange={(e) => {
                                                      const newTable = [...tbl];
                                                      newTable[i] = { ...newTable[i], label: e.target.value };
                                                      setInfo({ ...info, overviewTable: newTable });
                                                  }} 
                                                  placeholder="항목명" 
                                                  className="w-24 border rounded p-1.5 text-xs text-center font-bold text-gray-600 bg-white" 
                                              />
                                              <input 
                                                  value={row.value} 
                                                  onChange={(e) => {
                                                      const newTable = [...tbl];
                                                      newTable[i] = { ...newTable[i], value: e.target.value };
                                                      setInfo({ ...info, overviewTable: newTable });
                                                  }} 
                                                  placeholder="내용" 
                                                  className="flex-1 border rounded p-1.5 text-xs bg-white text-gray-800 font-bold min-w-0" 
                                              />
                                              <button
                                                  type="button"
                                                  onClick={() => {
                                                      const newTable = [...tbl];
                                                      newTable.splice(i, 1);
                                                      setInfo({ ...info, overviewTable: newTable });
                                                  }}
                                                  className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors shrink-0"
                                                  title="삭제"
                                              >
                                                  <TrashIcon className="w-4 h-4" />
                                              </button>
                                          </div>
                                      ))}
                                      <button
                                          type="button"
                                          onClick={() => {
                                              const newTable = [...tbl];
                                              newTable.push({ label: '', value: '' });
                                              setInfo({ ...info, overviewTable: newTable });
                                          }}
                                          className="w-full mt-2 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 border border-dashed border-blue-200"
                                      >
                                          + 개요 항목(행) 추가
                                      </button>
                                  </>
                              );
                          })()}
                          {/* 거래 형태 및 금액 설정 */}
                          <div className="mt-4 bg-orange-50/50 p-3 rounded-lg border border-orange-100/80 space-y-3">
                              <div className="flex items-center justify-between">
                                  <label className="text-xs font-extrabold text-[#cc5a27] flex items-center gap-1">
                                      🤝 거래 형태 및 금액 설정
                                  </label>
                                  {/* Select transaction type */}
                                  <div className="flex bg-white rounded border border-gray-200 p-0.5 shadow-sm shrink-0 opacity-70">
                                      {["매매", "전세", "월세"].map((t) => (
                                          <span
                                              key={t}
                                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold select-none ${
                                                  (info.transactionType || "매매") === t 
                                                      ? 'bg-[#cc5a27] text-white shadow-sm' 
                                                      : 'text-gray-400'
                                              }`}
                                          >
                                              {t}
                                          </span>
                                      ))}
                                  </div>
                              </div>

                              <div>
                                  {(() => {
                                      const tType = info.transactionType || "매매";
                                      let priceLabel = "매매가";
                                      let pricePlaceholder = "예: 500억";
                                      if (tType === "전세") {
                                          priceLabel = "보증금";
                                          pricePlaceholder = "예: 150억";
                                      } else if (tType === "월세") {
                                          priceLabel = "보증금 / 월세";
                                          pricePlaceholder = "예: 5000만 / 300만";
                                      }
                                      
                                      return (
                                          <div>
                                              <span className="text-[10px] text-gray-500 font-semibold block mb-1">{priceLabel}</span>
                                              <input 
                                                  name="priceMain" 
                                                  value={info.priceMain} 
                                                  onChange={handleChange} 
                                                  placeholder={pricePlaceholder} 
                                                  className="w-full border border-gray-300 rounded p-1.5 text-xs font-bold text-gray-800 bg-white" 
                                              />
                                              <div className="flex gap-2 mt-2">
                                                  <div className="flex-1">
                                                      <span className="text-[9px] text-gray-400 font-semibold block mb-0.5">배경색</span>
                                                      <div className="flex items-center gap-1">
                                                          <input 
                                                              type="color" 
                                                              name="priceBgColor" 
                                                              value={info.priceBgColor || "#fff9f0"} 
                                                              onChange={handleChange}
                                                              className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer shrink-0"
                                                          />
                                                          <input
                                                              type="text"
                                                              name="priceBgColor"
                                                              value={info.priceBgColor || ""}
                                                              onChange={handleChange}
                                                              placeholder="기본값"
                                                              className="w-full border border-gray-300 rounded p-1 text-[10px] bg-white text-gray-600"
                                                          />
                                                      </div>
                                                  </div>
                                                  <div className="flex-1">
                                                      <span className="text-[9px] text-gray-400 font-semibold block mb-0.5">글씨색</span>
                                                      <div className="flex items-center gap-1">
                                                          <input 
                                                              type="color" 
                                                              name="priceTextColor" 
                                                              value={info.priceTextColor || "#cc5a27"} 
                                                              onChange={handleChange}
                                                              className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer shrink-0"
                                                          />
                                                          <input
                                                              type="text"
                                                              name="priceTextColor"
                                                              value={info.priceTextColor || ""}
                                                              onChange={handleChange}
                                                              placeholder="테마색"
                                                              className="w-full border border-gray-300 rounded p-1 text-[10px] bg-white text-gray-600"
                                                          />
                                                      </div>
                                                  </div>
                                              </div>
                                          </div>
                                      );
                                  })()}
                              </div>
                          </div>
                      </div>
                  </div>

                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">투자 요약 (하단 3박스)</h4>
                      {[1,2,3].map(i => (
                          <div key={i} className="mb-3 bg-gray-50 p-3 rounded">
                              <label className="text-xs font-bold">박스 {i}</label>
                              <div className="flex gap-2 mt-1">
                                  <input value={(info.investmentSummary as any)[`box${i}Title`]} onChange={(e)=>handleNestedChange('investmentSummary', `box${i}Title`, e.target.value)} placeholder="영문 타이틀" className="w-1/3 border rounded p-2 text-xs uppercase" />
                                  <textarea value={(info.investmentSummary as any)[`box${i}Text`]} onChange={(e)=>handleNestedChange('investmentSummary', `box${i}Text`, e.target.value)} placeholder="한글 키워드" className="w-2/3 border rounded p-2 text-xs" rows={2} />
                              </div>
                          </div>
                      ))}
                  </div>

                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">문의 안내 (담당자)</h4>
                      <div className="space-y-3">
                          <div><label className="text-xs text-gray-500">중개사무소명</label><input name="agentName" value={info.agentName || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
                          <div><label className="text-xs text-gray-500">등록번호</label><input name="agentRegistrationNumber" value={info.agentRegistrationNumber || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm" placeholder="제11680-2015-00123호" /></div>
                          <div><label className="text-xs text-gray-500">대표자명</label><input name="agencyRepresentative" value={info.agencyRepresentative || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
                          <div><label className="text-xs text-gray-500">담당자명/직급</label><input name="agentRepresentative" value={info.agentRepresentative || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
                          <div><label className="text-xs text-gray-500">대표 번호</label><input name="agentPhone" value={info.agentPhone || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm" placeholder="02-1234-5678" /></div>
                          <div><label className="text-xs text-gray-500">문의 휴대전화</label><input name="agentMobile" value={info.agentMobile || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
                          <div><label className="text-xs text-gray-500">사무소 주소</label><input name="agentAddress" value={info.agentAddress || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm" placeholder="서울시 강남구 논현동" /></div>
                      </div>
                  </div>
                  </div>

                  {activeTab === 'all' && (
                      <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-white via-white/90 to-transparent flex items-end justify-center pb-6 z-10 pointer-events-none">
                          <button 
                              type="button" 
                              onClick={() => setActiveTab(1)}
                              className="pointer-events-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-full shadow-lg flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                          >
                              📝 1. 개요 수정하기
                          </button>
                      </div>
                  )}
                  {activeTab !== 'all' && (
                      <div className="flex gap-2 justify-center mt-6 pt-6 border-t border-gray-100">
                          <button 
                              type="button" 
                              onClick={() => setActiveTab('all')}
                              className="flex-1 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-lg transition-colors text-sm"
                          >
                              뒤로가기
                          </button>
                          <button 
                              type="button" 
                              onClick={() => setActiveTab('all')}
                              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors shadow-sm text-sm"
                          >
                              전체보기
                          </button>
                      </div>
                  )}
              </div>
          )}

          {(activeTab === 2 || (activeTab === 'all' && (info.visiblePages || [1, 2, 3, 4, 5, 6]).includes(2))) && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'h-[620px] overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                      <div className="pb-2 border-b-[3px] border-black mb-4">
                          <h2 className="text-xl font-black text-black tracking-tight">2. 매물설명 & 시세</h2>
                      </div>


                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">매물 핵심 하이라이트</h4>
                      <div className="space-y-2">
                          {info.highlights.map((hl, i) => (
                              <div key={i} className="flex gap-2 items-center bg-gray-50 p-2 rounded border border-transparent hover:border-gray-200 transition-colors">
                                  <div className="flex flex-col gap-0.5 shrink-0">
                                      <button
                                          type="button"
                                          disabled={i === 0}
                                          onClick={() => {
                                              const newList = [...info.highlights];
                                              const temp = newList[i];
                                              newList[i] = newList[i - 1];
                                              newList[i - 1] = temp;
                                              setInfo({ ...info, highlights: newList });
                                          }}
                                          className="text-gray-400 hover:text-gray-700 disabled:opacity-30 hover:bg-gray-200 rounded p-0.5 transition-colors"
                                      >
                                          <ArrowUpIcon className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                          type="button"
                                          disabled={i === info.highlights.length - 1}
                                          onClick={() => {
                                              const newList = [...info.highlights];
                                              const temp = newList[i];
                                              newList[i] = newList[i + 1];
                                              newList[i + 1] = temp;
                                              setInfo({ ...info, highlights: newList });
                                          }}
                                          className="text-gray-400 hover:text-gray-700 disabled:opacity-30 hover:bg-gray-200 rounded p-0.5 transition-colors"
                                      >
                                          <ArrowDownIcon className="w-3.5 h-3.5" />
                                      </button>
                                  </div>
                                  <input value={hl} onChange={(e)=>handleHighlightsChange(i, e.target.value)} className="flex-1 border rounded p-2 text-xs" placeholder={`메리트 ${i+1}`} />
                                  <button
                                      type="button"
                                      onClick={() => removeHighlight(i)}
                                      className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors shrink-0"
                                      title="삭제"
                                  >
                                      <TrashIcon className="w-4 h-4" />
                                  </button>
                              </div>
                          ))}
                          <button
                              type="button"
                              onClick={addHighlight}
                              className="w-full mt-2 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 border border-dashed border-yellow-200"
                          >
                              + 하이라이트 행 추가
                          </button>
                      </div>
                  </div>

                  {/* 시세 분석 그래프 설정 */}
                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">시세 분석 그래프 설정</h4>
                      <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-xs mb-4">
                          <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-700">📈 그래프 화면 표시</span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                  <input 
                                      type="checkbox" 
                                      checked={info.showChart !== false} 
                                      onChange={(e) => setInfo({ ...info, showChart: e.target.checked })}
                                      className="sr-only peer"
                                  />
                                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                              </label>
                          </div>

                          {info.showChart !== false && (
                              <div className="space-y-2.5 pt-2.5 border-t border-slate-200 animate-fadeIn">
                                  <div className="flex justify-between items-center mb-1 font-semibold text-slate-500">
                                      <span>막대 데이터 직접 입력</span>
                                      <span>(최대 6개)</span>
                                  </div>
                                  {(info.chartBars || [
                                      { label: "탁상감정가", value: "80", isHighlight: false },
                                      { label: "기존 희망가", value: "75", isHighlight: false },
                                      { label: "인근 시세", value: "85", isHighlight: false },
                                      { label: "현재 급매가", value: "65", isHighlight: true }
                                  ]).map((bar: any, idx: number) => {
                                      const chartBars = info.chartBars || [
                                          { label: "탁상감정가", value: "80", isHighlight: false },
                                          { label: "기존 희망가", value: "75", isHighlight: false },
                                          { label: "인근 시세", value: "85", isHighlight: false },
                                          { label: "현재 급매가", value: "65", isHighlight: true }
                                      ];
                                      return (
                                          <div key={idx} className="flex gap-1.5 items-center">
                                              <input 
                                                  value={bar.label} 
                                                  onChange={(e) => {
                                                      const newBars = [...chartBars];
                                                      newBars[idx] = { ...newBars[idx], label: e.target.value };
                                                      setInfo({ ...info, chartBars: newBars });
                                                  }} 
                                                  placeholder="항목명" 
                                                  className="w-20 border rounded p-1 text-[11px] font-bold text-center text-slate-700 bg-white" 
                                              />
                                              <input 
                                                  value={bar.value} 
                                                  onChange={(e) => {
                                                      const newBars = [...chartBars];
                                                      newBars[idx] = { ...newBars[idx], value: e.target.value };
                                                      setInfo({ ...info, chartBars: newBars });
                                                  }} 
                                                  placeholder="수치(억)" 
                                                  className="flex-1 border rounded p-1 text-[11px] text-center text-slate-800 bg-white" 
                                              />
                                              {/* Highlight Toggle */}
                                              <button
                                                  type="button"
                                                  onClick={() => {
                                                      const newBars = [...chartBars];
                                                      newBars[idx] = { ...newBars[idx], isHighlight: !newBars[idx].isHighlight };
                                                      setInfo({ ...info, chartBars: newBars });
                                                  }}
                                                  className={`px-1.5 py-1 rounded text-[9px] font-bold transition-all ${
                                                      bar.isHighlight ? 'bg-orange-100 text-[#cc5a27] border border-orange-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                                                  }`}
                                                  title="막대 색상 강조"
                                              >
                                                  강조
                                              </button>
                                              {chartBars.length > 2 && (
                                                  <button
                                                      type="button"
                                                      onClick={() => {
                                                          const newBars = chartBars.filter((_, i) => i !== idx);
                                                          setInfo({ ...info, chartBars: newBars });
                                                      }}
                                                      className="text-red-400 hover:text-red-600 p-1 text-sm leading-none shrink-0"
                                                      title="삭제"
                                                  >
                                                      ✕
                                                  </button>
                                              )}
                                          </div>
                                      );
                                  })}
                                  
                                  {/* Add chart bar button */}
                                  {(info.chartBars || [
                                      { label: "탁상감정가", value: "80", isHighlight: false },
                                      { label: "기존 희망가", value: "75", isHighlight: false },
                                      { label: "인근 시세", value: "85", isHighlight: false },
                                      { label: "현재 급매가", value: "65", isHighlight: true }
                                  ]).length < 6 && (
                                      <button
                                          type="button"
                                          onClick={() => {
                                              const chartBars = info.chartBars || [
                                                  { label: "탁상감정가", value: "80", isHighlight: false },
                                                  { label: "기존 희망가", value: "75", isHighlight: false },
                                                  { label: "인근 시세", value: "85", isHighlight: false },
                                                  { label: "현재 급매가", value: "65", isHighlight: true }
                                              ];
                                              const newBars = [...chartBars, { label: "새 항목", value: "70", isHighlight: false }];
                                              setInfo({ ...info, chartBars: newBars });
                                          }}
                                          className="w-full mt-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-[11px] font-bold transition-colors flex items-center justify-center gap-1 border border-dashed border-blue-200"
                                      >
                                          + 막대 추가
                                      </button>
                                  )}
                              </div>
                          )}
                      </div>
                  </div>

                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">시세 분석 요약 (하단)</h4>
                      <div className="space-y-3">
                          <div>
                              <label className="text-xs text-gray-500 font-bold">좌측 텍스트 (STRATEGIC ADVISORY)</label>
                              <textarea name="valuationText" value={info.valuationText || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm" rows={4} />
                          </div>
                          <div>
                              <label className="text-xs text-gray-500 font-bold">우측 텍스트 (그래프 하단)</label>
                              <textarea name="chartAdviseText" value={(info as any).chartAdviseText || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm" rows={4} />
                          </div>
                      </div>
                  </div>
                  </div>

                  {activeTab === 'all' && (
                      <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-white via-white/90 to-transparent flex items-end justify-center pb-6 z-10 pointer-events-none">
                          <button 
                              type="button" 
                              onClick={() => setActiveTab(2)}
                              className="pointer-events-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-full shadow-lg flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                          >
                              📝 2. 매물설명 & 시세 수정하기
                          </button>
                      </div>
                  )}
                  {activeTab !== 'all' && (
                      <div className="flex gap-2 justify-center mt-6 pt-6 border-t border-gray-100">
                          <button 
                              type="button" 
                              onClick={onBackTab || (() => setActiveTab('all'))}
                              className="flex-1 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-lg transition-colors text-sm"
                          >
                              뒤로가기
                          </button>
                          <button 
                              type="button" 
                              onClick={() => setActiveTab('all')}
                              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors shadow-sm text-sm"
                          >
                              전체보기
                          </button>
                      </div>
                  )}
              </div>
          )}

          {(activeTab === 3 || (activeTab === 'all' && (info.visiblePages || [1, 2, 3, 4, 5, 6]).includes(3))) && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'h-[620px] overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                      <div className="pb-2 border-b-[3px] border-black mb-4">
                          <h2 className="text-xl font-black text-black tracking-tight">3. 임대현황</h2>
                      </div>
                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">페이지 타이틀</h4>
                      <div className="space-y-3">
                          <div><label className="text-xs text-gray-500">페이지 제목 (기본: 임대 상세 현황)</label><input name="page3Title" value={info.page3Title || "임대 상세 현황"} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
                          <div><label className="text-xs text-gray-500">테이블 상단 소제목 (기본: PROPERTY RENTAL REPORT)</label><input name="page3HighlightHeader" value={(info as any).page3HighlightHeader || "PROPERTY RENTAL REPORT"} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
                          <div><label className="text-xs text-gray-500">페이지 부제목</label><input name="page3Subtitle" value={info.page3Subtitle || "Rent Roll"} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
                          <div><label className="text-xs text-gray-500">표 하단 요약 (Total Summary)</label><input name="leaseSummaryText" value={(info as any).leaseSummaryText || "총 6세대 / 보증금 0원 / 월세 0원"} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
                          
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                              <span className="font-bold text-slate-700 text-xs">우측 설명란 표시</span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                  <input 
                                      type="checkbox" 
                                      checked={(info as any).showLeaseSummaryDesc !== false} 
                                      onChange={(e) => setInfo({ ...info, showLeaseSummaryDesc: e.target.checked })}
                                      className="sr-only peer"
                                  />
                                  <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-orange-500"></div>
                              </label>
                          </div>
                          {(info as any).showLeaseSummaryDesc !== false && (
                              <div>
                                  <label className="text-xs text-gray-500">우측 설명 내용</label>
                                  <textarea name="leaseSummaryDesc" value={(info as any).leaseSummaryDesc || "임대 수익률 및 상세 조건은 협의 가능합니다."} onChange={handleChange} className="w-full border rounded p-2 text-sm" rows={2} />
                              </div>
                          )}
                      </div>
                  </div>



                  <div className="mt-4">
                      <label className="text-xs text-gray-500 font-semibold">표 하단 유의 사항</label>
                      <textarea name="leaseNotice" value={info.leaseNotice} onChange={handleChange} className="w-full border rounded p-2 text-xs mt-1" rows={2} />
                  </div>
                  </div>
                  {activeTab === 'all' && (
                      <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-white via-white/90 to-transparent flex items-end justify-center pb-6 z-10 pointer-events-none">
                          <button 
                              type="button" 
                              onClick={() => setActiveTab(3)}
                              className="pointer-events-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-full shadow-lg flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                          >
                              📝 3. 임대현황 수정하기
                          </button>
                      </div>
                  )}
                  {activeTab !== 'all' && (
                      <div className="flex gap-2 justify-center mt-6 pt-6 border-t border-gray-100">
                          <button 
                              type="button" 
                              onClick={onBackTab || (() => setActiveTab('all'))}
                              className="flex-1 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-lg transition-colors text-sm"
                          >
                              뒤로가기
                          </button>
                          <button 
                              type="button" 
                              onClick={() => setActiveTab('all')}
                              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors shadow-sm text-sm"
                          >
                              전체보기
                          </button>
                      </div>
                  )}
              </div>
          )}

          {(activeTab === 4 || (activeTab === 'all' && (info.visiblePages || [1, 2, 3, 4, 5, 6]).includes(4))) && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'h-[620px] overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                      <div className="pb-2 border-b-[3px] border-black mb-4">
                          <h2 className="text-xl font-black text-black tracking-tight">4. 사진</h2>
                      </div>
                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">페이지 타이틀</h4>
                      <div className="space-y-3 mb-4">
                          <div><label className="text-xs text-gray-500">페이지 제목 (기본: 매물 사진)</label><input name="page4Title" value={info.page4Title || "매물 사진"} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
                          <div><label className="text-xs text-gray-500">페이지 부제목 (기본: Property Photo)</label><input name="page4Subtitle" value={info.page4Subtitle || "Property Photo"} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
                      </div>
                  </div>
                  {renderImageUpload('mainImage', '메인 사진 (정면 외관)')}
                  <div className="grid grid-cols-2 gap-4">
                      {renderImageUpload('subImage1', '서브 사진 1')}
                      {renderImageUpload('subImage2', '서브 사진 2')}
                      {renderImageUpload('featureImage1', '서브 사진 3')}
                      {renderImageUpload('featureImage2', '서브 사진 4')}
                  </div>
                  </div>

                  {activeTab === 'all' && (
                      <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-white via-white/90 to-transparent flex items-end justify-center pb-6 z-10 pointer-events-none">
                          <button 
                              type="button" 
                              onClick={() => setActiveTab(4)}
                              className="pointer-events-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-full shadow-lg flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                          >
                              📝 4. 사진 수정하기
                          </button>
                      </div>
                  )}
                  {activeTab !== 'all' && (
                      <div className="flex gap-2 justify-center mt-6 pt-6 border-t border-gray-100">
                          <button 
                              type="button" 
                              onClick={onBackTab || (() => setActiveTab('all'))}
                              className="flex-1 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-lg transition-colors text-sm"
                          >
                              뒤로가기
                          </button>
                          <button 
                              type="button" 
                              onClick={() => setActiveTab('all')}
                              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors shadow-sm text-sm"
                          >
                              전체보기
                          </button>
                      </div>
                  )}
              </div>
          )}

          {(activeTab === 5 || (activeTab === 'all' && (info.visiblePages || [1, 2, 3, 4, 5, 6]).includes(5))) && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'h-[620px] overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                      <div className="pb-2 border-b-[3px] border-black mb-4">
                          <h2 className="text-xl font-black text-black tracking-tight">5. 입지</h2>
                      </div>
                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">입지 개요 및 지도 설정</h4>
                      <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60 mb-4 text-xs">
                          <div>
                              <label className="text-xs text-gray-500 font-semibold block mb-1">🗺️ 지도 유형 선택</label>
                              <div className="flex bg-gray-100 p-1 rounded-lg">
                                  {[
                                      { type: "kakao", label: "카카오 지도" },
                                      { type: "google", label: "구글 지도" },
                                      { type: "upload", label: "캡처 이미지 업로드" }
                                  ].map(opt => (
                                      <button
                                          key={opt.type}
                                          type="button"
                                          onClick={() => setInfo({ ...info, mapType: opt.type as any })}
                                          className={`flex-1 py-1.5 rounded-md text-[10px] font-extrabold transition-all cursor-pointer border-none ${
                                              (info.mapType || "kakao") === opt.type 
                                                  ? "bg-white text-gray-900 shadow-sm" 
                                                  : "text-gray-500 hover:bg-gray-200 bg-transparent"
                                          }`}
                                      >
                                          {opt.label}
                                      </button>
                                  ))}
                              </div>
                          </div>
                          
                          {info.mapType === "upload" && (
                              <div className="pt-2 border-t border-slate-200 animate-fadeIn">
                                  {renderImageUpload('mapImage', '네이버/카카오 지도 캡처 이미지')}
                              </div>
                          )}
                      </div>

                      <div className="space-y-3">
                          <div><label className="text-xs text-gray-500">타겟 로케이션 (우측 상단 뱃지)</label><textarea name="areaTargetName" value={info.areaTargetName} onChange={handleChange} className="w-full border rounded p-2 text-sm" rows={2}/></div>
                          <div><label className="text-xs text-gray-500">입지 설명 텍스트</label><textarea name="areaTargetDesc" value={info.areaTargetDesc} onChange={handleChange} className="w-full border rounded p-2 text-sm" rows={4}/></div>
                      </div>
                  </div>
                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">입지 상세 분석 (하단 3박스)</h4>
                      {[1,2,3].map(i => (
                          <div key={i} className="mb-3 bg-gray-50 p-3 rounded">
                              <label className="text-xs font-bold text-gray-600">박스 {i}</label>
                              <div className="space-y-2 mt-1">
                                  <input value={(info as any)[`areaBox${i}Title`]} onChange={handleChange} name={`areaBox${i}Title`} placeholder="영문 타이틀" className="w-full border rounded p-2 text-xs uppercase" />
                                  <textarea value={(info as any)[`areaBox${i}Text`]} onChange={handleChange} name={`areaBox${i}Text`} placeholder="분석 내용" className="w-full border rounded p-2 text-xs" rows={2} />
                              </div>
                          </div>
                      ))}
                  </div>
                  </div>

                  {activeTab === 'all' && (
                      <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-white via-white/90 to-transparent flex items-end justify-center pb-6 z-10 pointer-events-none">
                          <button 
                              type="button" 
                              onClick={() => setActiveTab(5)}
                              className="pointer-events-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-full shadow-lg flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                          >
                              📝 5. 입지 수정하기
                          </button>
                      </div>
                  )}
                  {activeTab !== 'all' && (
                      <div className="flex gap-2 justify-center mt-6 pt-6 border-t border-gray-100">
                          <button 
                              type="button" 
                              onClick={onBackTab || (() => setActiveTab('all'))}
                              className="flex-1 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-lg transition-colors text-sm"
                          >
                              뒤로가기
                          </button>
                          <button 
                              type="button" 
                              onClick={() => setActiveTab('all')}
                              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors shadow-sm text-sm"
                          >
                              전체보기
                          </button>
                      </div>
                  )}
              </div>
          )}

          {(activeTab === 6 || (activeTab === 'all' && (info.visiblePages || [1, 2, 3, 4, 5, 6]).includes(6))) && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'h-[620px] overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                      <div className="pb-2 border-b-[3px] border-black mb-4">
                          <h2 className="text-xl font-black text-black tracking-tight">6. 로드맵</h2>
                      </div>
                  <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">개발 및 활용 로드맵 (시나리오)</h4>
                  {(() => {
                      const ROADMAP_ICONS = [
                          { value: '🏢', label: '빌딩/오피스' },
                          { value: '🏡', label: '주택/거주' },
                          { value: '📈', label: '성장/수익' },
                          { value: '🏗️', label: '건설/개발' },
                          { value: '💰', label: '자산/투자' },
                          { value: '🤝', label: '계약/협력' },
                          { value: '🚀', label: '혁신/미래' },
                          { value: '🎯', label: '목표/타겟' },
                          { value: '💡', label: '아이디어' },
                          { value: '📊', label: '분석/데이터' },
                          { value: '🛡️', label: '안전/보안' },
                          { value: '🚆', label: '역세권/교통' },
                          { value: '🏥', label: '의료/병원' },
                          { value: '🏪', label: '상가/리테일' },
                          { value: '👑', label: '프리미엄' },
                          { value: '🌟', label: '핵심가치' }
                      ];

                      const list = info.roadmapList || [1, 2, 3, 4].map((i, index) => ({
                          title: (info.roadmap as any)?.[`box${i}Title`] || "",
                          text: (info.roadmap as any)?.[`box${i}Text`] || "",
                          icon: (info.roadmap as any)?.[`box${i}Icon`] || ['🏢', '🏡', '📈', '🏗️'][index] || '🏢',
                          bg: ['bg-blue-50', 'bg-green-50', 'bg-red-50', 'bg-yellow-50'][index] || 'bg-gray-50',
                          border: ['border-blue-100', 'border-green-100', 'border-red-100', 'border-yellow-100'][index] || 'border-gray-200'
                      }));

                      return (
                          <>
                              {list.map((item: any, idx: number) => (
                                  <div key={idx} className="mb-4 bg-gray-50 p-4 rounded-lg relative">
                                      <div className="flex items-center justify-between mb-2">
                                          <label className="text-xs font-bold text-gray-800">시나리오 {idx + 1}</label>
                                          <div className="flex items-center gap-2">
                                              <span className="text-[10px] text-gray-500 font-normal">아이콘:</span>
                                              <select
                                                  value={item.icon}
                                                  onChange={(e) => {
                                                      const newList = [...list];
                                                      newList[idx] = { ...newList[idx], icon: e.target.value };
                                                      setInfo({ ...info, roadmapList: newList });
                                                  }}
                                                  className="w-28 text-xs border rounded p-1 text-gray-800 bg-white cursor-pointer"
                                              >
                                                  {ROADMAP_ICONS.map(ic => (
                                                      <option key={ic.value} value={ic.value}>
                                                          {ic.value} {ic.label}
                                                      </option>
                                                  ))}
                                                  {!ROADMAP_ICONS.find(ic => ic.value === item.icon) && (
                                                      <option value={item.icon}>{item.icon} 직접입력</option>
                                                  )}
                                              </select>
                                              {list.length > 1 && (
                                                  <button
                                                      type="button"
                                                      onClick={() => {
                                                          const newList = list.filter((_, i) => i !== idx);
                                                          setInfo({ ...info, roadmapList: newList });
                                                      }}
                                                      className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded"
                                                  >
                                                      <TrashIcon className="w-4 h-4" />
                                                  </button>
                                              )}
                                          </div>
                                      </div>
                                      <input 
                                          value={item.title} 
                                          onChange={(e) => {
                                              const newList = [...list];
                                              newList[idx] = { ...newList[idx], title: e.target.value };
                                              setInfo({ ...info, roadmapList: newList });
                                          }} 
                                          placeholder="제목" 
                                          className="w-full border rounded p-2 text-sm mb-2 font-bold" 
                                      />
                                      <textarea 
                                          value={item.text} 
                                          onChange={(e) => {
                                              const newList = [...list];
                                              newList[idx] = { ...newList[idx], text: e.target.value };
                                              setInfo({ ...info, roadmapList: newList });
                                          }} 
                                          placeholder="상세 내용" 
                                          className="w-full border rounded p-2 text-sm" 
                                          rows={3} 
                                      />
                                  </div>
                              ))}
                              {list.length < 6 && (
                                  <button
                                      type="button"
                                      onClick={() => {
                                          const newList = [...list, { title: '', text: '', icon: '🌟', bg: 'bg-gray-50', border: 'border-gray-200' }];
                                          setInfo({ ...info, roadmapList: newList });
                                      }}
                                      className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 border border-dashed border-blue-200"
                                  >
                                      + 시나리오 추가
                                  </button>
                              )}
                          </>
                      );
                  })()}
                  </div>

                  {activeTab === 'all' && (
                      <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-white via-white/90 to-transparent flex items-end justify-center pb-6 z-10 pointer-events-none">
                          <button 
                              type="button" 
                              onClick={() => setActiveTab(6)}
                              className="pointer-events-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-full shadow-lg flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                          >
                              📝 6. 로드맵 수정하기
                          </button>
                      </div>
                  )}
                  {activeTab !== 'all' && (
                      <div className="flex gap-2 justify-center mt-6 pt-6 border-t border-gray-100">
                          <button 
                              type="button" 
                              onClick={onBackTab || (() => setActiveTab('all'))}
                              className="flex-1 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-lg transition-colors text-sm"
                          >
                              뒤로가기
                          </button>
                          <button 
                              type="button" 
                              onClick={() => setActiveTab('all')}
                              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors shadow-sm text-sm"
                          >
                              전체보기
                          </button>
                      </div>
                  )}
              </div>
          )}

          {(activeTab === 7 || (activeTab === 'all' && (info.visiblePages || [0, 1, 2, 3, 4, 5, 6, 7]).includes(7))) && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'h-[620px] overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6 animate-fadeIn">
                      <div className="pb-2 border-b-[3px] border-black mb-4">
                          <h2 className="text-xl font-black text-black tracking-tight">7. 연락처</h2>
                      </div>
                      <div>
                          <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">담당자 및 부동산 정보</h4>
                          <div className="space-y-3">
                              <div>
                                  <label className="text-xs text-gray-500">중개사무소명 (Agency Name)</label>
                                  <input type="text" name="agentName" value={info.agentName || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm font-semibold" />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500">담당자 성명 및 직책 (Representative)</label>
                                  <input type="text" name="agentRepresentative" value={info.agentRepresentative || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm" />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500">담당자 휴대폰 번호 (Mobile)</label>
                                  <input type="text" name="agentMobile" value={info.agentMobile || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm" />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500">대표 유선 번호 (Phone)</label>
                                  <input type="text" name="agentPhone" value={info.agentPhone || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm" />
                              </div>
                          </div>
                      </div>
                      <div>
                          <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">SNS / 외부 채널 링크 및 QR</h4>
                          <div className="space-y-3">
                              <div>
                                  <label className="text-xs text-gray-500">네이버 블로그 링크 (Blog)</label>
                                  <input type="text" name="contactBlog" value={info.contactBlog || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm font-mono text-xs animate-fadeIn" placeholder="https://blog.naver.com/..." />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500">유튜브 채널 링크 (YouTube)</label>
                                  <input type="text" name="contactYoutube" value={info.contactYoutube || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm font-mono text-xs" placeholder="https://youtube.com/..." />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500">홈페이지 링크 (Website)</label>
                                  <input type="text" name="contactWebsite" value={info.contactWebsite || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm font-mono text-xs" placeholder="https://..." />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500">상담 연결 QR 링크 (Inquiry QR Link)</label>
                                  <input type="text" name="contactQRLink" value={info.contactQRLink || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm font-mono text-xs" placeholder="https://..." />
                              </div>
                          </div>
                      </div>
                  </div>

                  {activeTab === 'all' && (
                      <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-white via-white/90 to-transparent flex items-end justify-center pb-6 z-10 pointer-events-none">
                          <button 
                              type="button" 
                              onClick={() => setActiveTab(7)}
                              className="pointer-events-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-full shadow-lg flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                          >
                              📝 7. 연락처 수정하기
                          </button>
                      </div>
                  )}
                  {activeTab !== 'all' && (
                      <div className="flex gap-2 justify-center mt-6 pt-6 border-t border-gray-100">
                          <button 
                              type="button" 
                              onClick={onBackTab || (() => setActiveTab('all'))}
                              className="flex-1 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-lg transition-colors text-sm"
                          >
                              뒤로가기
                          </button>
                          <button 
                              type="button" 
                              onClick={() => setActiveTab('all')}
                              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors shadow-sm text-sm"
                          >
                              전체보기
                          </button>
                      </div>
                  )}
              </div>
          )}

      </div>
    </div>
  );
};

export default FlyerForm;