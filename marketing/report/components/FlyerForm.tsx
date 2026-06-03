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
}

const FlyerForm: React.FC<FlyerFormProps> = ({ 
    info, setInfo, onImageUpload, onDeleteImage,
    colors, layouts, currentColor, currentLayout, onColorSelect, onLayoutSelect,
    uploadedImages, isUploadingImage,
    activeTab, setActiveTab,
    onOpenTableEditor
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
      
      {/* Design Theme Selection (Kept from original) */}
      <div className="mb-6 shrink-0">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3"><SwatchIcon className="w-5 h-5" /> 디자인 색상 선택</h3>
        <div className="flex items-center gap-3 mb-4 flex-wrap">
            {colors.map(color => (
                <button
                    key={color.id}
                    onClick={() => onColorSelect(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all shadow-sm flex items-center justify-center ${currentColor.id === color.id ? 'border-gray-800 scale-110 ring-2 ring-offset-2 ring-gray-300' : 'border-transparent'}`}
                    style={{ backgroundColor: color.primary }}
                />
            ))}
        </div>
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3"><RectangleGroupIcon className="w-5 h-5" /> 레이아웃 선택</h3>
        <div className="flex gap-2 mb-2">
             {layouts.map((layout, idx) => (
                 <button
                    key={layout.id}
                    onClick={() => onLayoutSelect(layout)}
                    className={`flex-1 py-1.5 rounded border text-[10px] font-bold transition-all ${currentLayout.id === layout.id ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'}`}
                 >
                     {idx + 1}
                 </button>
             ))}
        </div>
      </div>

      <hr className="border-gray-100 mb-6 shrink-0" />

      {/* Combined Tabs & Page Visibility Toggles */}
      <div className="grid grid-cols-4 gap-2 bg-gray-100/80 p-2.5 rounded-xl mb-6 shrink-0 shadow-inner">
          {[
              { id: 'all' as const, label: '전체' },
              { id: 1, label: '1. 개요' },
              { id: 2, label: '2. 매물설명 & 시세' },
              { id: 3, label: '3. 임대현황' },
              { id: 4, label: '4. 사진' },
              { id: 5, label: '5. 입지' },
              { id: 6, label: '6. 로드맵' },
          ].map(tab => {
              const visiblePages = info.visiblePages || [1, 2, 3, 4, 5, 6];
              
              let isVisible = false;
              let isAllSelected = false;
              if (tab.id === 'all') {
                  isAllSelected = visiblePages.length === 6;
                  isVisible = isAllSelected;
              } else {
                  isVisible = visiblePages.includes(tab.id as number);
              }

              return (
                  <div
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative flex flex-col justify-center items-center h-[60px] px-1 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === tab.id ? 'bg-white text-blue-700 shadow-md ring-2 ring-blue-500 z-10' : 'bg-white/60 text-gray-500 hover:bg-white ring-1 ring-gray-200/50'}`}
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
                                      setInfo({ ...info, visiblePages: e.target.checked ? [1, 2, 3, 4, 5, 6] : [] });
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
          
          {(activeTab === 1 || (activeTab === 'all' && (info.visiblePages || [1, 2, 3, 4, 5, 6]).includes(1))) && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'max-h-[750px] overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                      {activeTab === 'all' && (
                          <div className="pb-2 border-b-[3px] border-black mb-4">
                              <h2 className="text-xl font-black text-black tracking-tight">1. 개요</h2>
                          </div>
                      )}
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
                                  : [
                                      { label: "소재지", value: (info.overviewTable as any)?.location || "" },
                                      { label: "용도지역", value: (info.overviewTable as any)?.zoning || "" },
                                      { label: "대지면적", value: (info.overviewTable as any)?.landArea || "" },
                                      { label: "연면적", value: (info.overviewTable as any)?.totalArea || "" },
                                      { label: "건물규모", value: (info.overviewTable as any)?.buildingScale || "" },
                                      { label: "주용도", value: (info.overviewTable as any)?.mainPurpose || "" },
                                      { label: "주차대수", value: (info.overviewTable as any)?.parking || "" },
                                      { label: "승강기", value: (info.overviewTable as any)?.elevator || "" },
                                      { label: "준공연도", value: (info.overviewTable as any)?.completionYear || "" },
                                  ];
                              
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
                                  <div className="flex bg-white rounded border border-gray-200 p-0.5 shadow-sm shrink-0">
                                      {["매매", "전세", "월세"].map((t) => (
                                          <button
                                              key={t}
                                              type="button"
                                              onClick={() => setInfo({ ...info, transactionType: t as any })}
                                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold transition-all cursor-pointer ${
                                                  (info.transactionType || "매매") === t 
                                                      ? 'bg-[#cc5a27] text-white shadow-sm' 
                                                      : 'text-gray-500 hover:bg-gray-100'
                                              }`}
                                          >
                                              {t}
                                          </button>
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
                          <div><label className="text-xs text-gray-500">중개사무소명</label><input name="agentName" value={info.agentName} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
                          <div><label className="text-xs text-gray-500">담당자명/직급</label><input name="agentRepresentative" value={info.agentRepresentative} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
                          <div><label className="text-xs text-gray-500">문의 연락처</label><input name="agentMobile" value={info.agentMobile} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
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
              </div>
          )}

          {(activeTab === 2 || (activeTab === 'all' && (info.visiblePages || [1, 2, 3, 4, 5, 6]).includes(2))) && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'max-h-[750px] overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                      {activeTab === 'all' && (
                          <div className="pb-2 border-b-[3px] border-black mb-4">
                              <h2 className="text-xl font-black text-black tracking-tight">2. 매물설명 & 시세</h2>
                          </div>
                      )}


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
              </div>
          )}

          {(activeTab === 3 || (activeTab === 'all' && (info.visiblePages || [1, 2, 3, 4, 5, 6]).includes(3))) && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'max-h-[750px] overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                      {activeTab === 'all' && (
                          <div className="pb-2 border-b-[3px] border-black mb-4">
                              <h2 className="text-xl font-black text-black tracking-tight">3. 임대현황</h2>
                          </div>
                      )}
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

                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">임대 현황 표 편집 (PPT식 동적 표)</h4>
                      <p className="text-xs text-gray-400 mb-3">※ 캔버스 화면 위에서도 행과 열을 직접 자유롭게 추가/삭제할 수 있습니다.</p>
                      
                      <div className="space-y-4">
                          {/* Column settings with individual width sliders */}
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                              <label className="text-xs text-slate-500 font-bold block mb-1">📋 세로 열(칸) 제목 및 너비 조절</label>
                              <div className="space-y-3">
                                  {info.leaseTable?.headers.map((h, idx) => {
                                      const currentWidths = info.leaseTable?.widths || [10, 10, 15, 35, 15, 15];
                                      const colWidth = currentWidths[idx] || Math.round(100 / (info.leaseTable?.headers.length || 6));
                                      return (
                                          <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-2">
                                              <div className="flex items-center justify-between gap-2">
                                                  <span className="text-[10px] font-bold text-slate-400">세로 {idx + 1}번째 칸</span>
                                                  {info.leaseTable?.headers && info.leaseTable.headers.length > 1 && (
                                                      <button 
                                                          type="button"
                                                          onClick={() => {
                                                              const newHeaders = info.leaseTable!.headers.filter((_, i) => i !== idx);
                                                              const newRows = info.leaseTable!.rows.map(row => row.filter((_, i) => i !== idx));
                                                              const newWidths = currentWidths.filter((_, i) => i !== idx);
                                                              setInfo({
                                                                  ...info,
                                                                  leaseTable: { ...info.leaseTable, headers: newHeaders, rows: newRows, widths: newWidths }
                                                              });
                                                          }}
                                                          className="text-red-400 hover:text-red-600 font-bold border-none bg-transparent cursor-pointer text-[10px]"
                                                          title="열 삭제"
                                                      >
                                                          ✕ 삭제
                                                      </button>
                                                  )}
                                              </div>
                                              <input 
                                                  value={h} 
                                                  onChange={(e) => {
                                                      const newHeaders = [...(info.leaseTable?.headers || [])];
                                                      newHeaders[idx] = e.target.value;
                                                      setInfo({
                                                          ...info,
                                                          leaseTable: {
                                                              ...info.leaseTable,
                                                              headers: newHeaders
                                                          }
                                                      });
                                                  }} 
                                                  className="w-full border border-slate-200 rounded px-2 py-1.5 font-bold text-slate-800 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                                  placeholder="열 제목"
                                              />
                                              <div className="flex items-center gap-2 pt-1">
                                                  <input 
                                                      type="range"
                                                      min="5"
                                                      max="80"
                                                      value={colWidth}
                                                      onChange={(e) => {
                                                          const newWidths = [...currentWidths];
                                                          newWidths[idx] = parseInt(e.target.value);
                                                          setInfo({
                                                              ...info,
                                                              leaseTable: {
                                                                  ...info.leaseTable,
                                                                  widths: newWidths
                                                              }
                                                          });
                                                      }}
                                                      className="flex-1 accent-blue-500 h-1 bg-gray-200 rounded-lg cursor-pointer"
                                                  />
                                                  <span className="text-[10px] font-bold font-mono text-slate-500 shrink-0 w-8 text-right">
                                                      {colWidth}%
                                                  </span>
                                              </div>
                                          </div>
                                      );
                                  })}
                                  <button
                                      type="button"
                                      onClick={() => {
                                          const currentWidths = info.leaseTable?.widths || new Array(info.leaseTable?.headers.length || 6).fill(Math.round(100 / (info.leaseTable?.headers.length || 6)));
                                          const newHeaders = [...(info.leaseTable?.headers || []), "새 열"];
                                          const newRows = (info.leaseTable?.rows || []).map(row => [...row, ""]);
                                          const newWidths = [...currentWidths, 15]; // Default new width 15%
                                          setInfo({
                                              ...info,
                                              leaseTable: { ...info.leaseTable, headers: newHeaders, rows: newRows, widths: newWidths }
                                          });
                                      }}
                                      className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-bold transition-all border border-dashed border-blue-200 cursor-pointer flex items-center justify-center gap-1 active:scale-95 shadow-sm"
                                  >
                                      ➕ 새로운 세로칸(열) 추가
                                  </button>
                              </div>
                          </div>

                          {/* Rows data count info */}
                          <div className="border border-slate-100 bg-slate-50/50 rounded-xl p-4 text-xs space-y-2">
                              <div className="flex justify-between font-semibold text-slate-500 pb-1.5 border-b border-dashed border-slate-200">
                                  <span>현재 등록된 행(줄) 수</span>
                                  <span>{info.leaseTable?.rows.length || 0}줄</span>
                              </div>
                              <button
                                  type="button"
                                  onClick={() => {
                                      const headersCount = info.leaseTable?.headers.length || 6;
                                      const newRows = [...(info.leaseTable?.rows || [])];
                                      newRows.push(new Array(headersCount).fill(""));
                                      setInfo({
                                          ...info,
                                          leaseTable: {
                                              ...info.leaseTable,
                                              rows: newRows
                                          }
                                      });
                                  }}
                                  className="w-full py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 border border-dashed border-yellow-200 cursor-pointer shadow-sm"
                              >
                                  ➕ 표 가로줄(행) 추가
                              </button>
                          </div>

                          <div>
                              <label className="text-xs text-gray-500 font-semibold">표 하단 유의 사항</label>
                              <textarea name="leaseNotice" value={info.leaseNotice} onChange={handleChange} className="w-full border rounded p-2 text-xs mt-1" rows={2} />
                          </div>
                      </div>
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
              </div>
          )}

          {(activeTab === 4 || (activeTab === 'all' && (info.visiblePages || [1, 2, 3, 4, 5, 6]).includes(4))) && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'max-h-[750px] overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                      {activeTab === 'all' && (
                          <div className="pb-2 border-b-[3px] border-black mb-4">
                              <h2 className="text-xl font-black text-black tracking-tight">4. 사진</h2>
                          </div>
                      )}
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
              </div>
          )}

          {(activeTab === 5 || (activeTab === 'all' && (info.visiblePages || [1, 2, 3, 4, 5, 6]).includes(5))) && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'max-h-[750px] overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                      {activeTab === 'all' && (
                          <div className="pb-2 border-b-[3px] border-black mb-4">
                              <h2 className="text-xl font-black text-black tracking-tight">5. 입지</h2>
                          </div>
                      )}
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
              </div>
          )}

          {(activeTab === 6 || (activeTab === 'all' && (info.visiblePages || [1, 2, 3, 4, 5, 6]).includes(6))) && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'max-h-[750px] overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                      {activeTab === 'all' && (
                          <div className="pb-2 border-b-[3px] border-black mb-4">
                              <h2 className="text-xl font-black text-black tracking-tight">6. 로드맵</h2>
                          </div>
                      )}
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
              </div>
          )}

      </div>
    </div>
  );
};

export default FlyerForm;