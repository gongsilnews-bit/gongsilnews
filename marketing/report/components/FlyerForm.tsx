import React, { useState } from 'react';
import { PropertyInfo, FlyerColor, FlyerLayout } from '../types';
import { SwatchIcon, RectangleGroupIcon, PhotoIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

interface FlyerFormProps {
  info: PropertyInfo;
  setInfo: (info: PropertyInfo) => void;
  onImageUpload: (key: string, file: File) => void;
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
}

const FlyerForm: React.FC<FlyerFormProps> = ({ 
    info, setInfo, onImageUpload,
    colors, layouts, currentColor, currentLayout, onColorSelect, onLayoutSelect,
    uploadedImages, isUploadingImage,
    activeTab, setActiveTab
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
      <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
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

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-lg mb-6 shrink-0">
          {[
              { id: 'all' as const, label: '전체' },
              { id: 1, label: '1. 개요' },
              { id: 2, label: '2. 가치' },
              { id: 3, label: '3. 사진' },
              { id: 4, label: '4. 입지' },
              { id: 5, label: '5. 로드맵' },
          ].map(tab => (
              <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
              >
                  {tab.label}
              </button>
          ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto pr-2 pb-10 space-y-6">
          
          {(activeTab === 'all' || activeTab === 1) && (
              <div className="space-y-6 animate-fadeIn">
                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">기본 타이틀</h4>
                      <div className="space-y-3">
                          <div><label className="text-xs text-gray-500">보고서 제목 (Address)</label><input name="address" value={info.address} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
                          <div><label className="text-xs text-gray-500">서브 타이틀</label><input name="subTitle" value={info.subTitle} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
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
                          <div className="mt-4">
                              <label className="text-xs font-bold text-[#cc5a27]">매매가</label>
                              <input name="priceMain" value={info.priceMain} onChange={handleChange} className="w-full border-2 border-orange-200 rounded p-2 text-sm font-bold text-gray-800 mt-1" />
                          </div>
                      </div>
                  </div>

                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">문의 안내 (담당자)</h4>
                      <div className="space-y-3">
                          <div><label className="text-xs text-gray-500">중개사무소명</label><input name="agentName" value={info.agentName} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
                          <div><label className="text-xs text-gray-500">담당자명/직급</label><input name="agentRepresentative" value={info.agentRepresentative} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
                          <div><label className="text-xs text-gray-500">문의 연락처</label><input name="agentMobile" value={info.agentMobile} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
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
              </div>
          )}

          {(activeTab === 'all' || activeTab === 2) && (
              <div className="space-y-6 animate-fadeIn">
                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">층별 점유 및 임대 현황</h4>
                      <div className="space-y-3">
                          {info.floorStatus.map((row, i) => (
                              <div key={i} className="flex gap-1.5 items-center bg-gray-50 p-2 rounded relative group border border-transparent hover:border-gray-200 transition-colors">
                                  <div className="flex flex-col gap-0.5 shrink-0">
                                      <button
                                          type="button"
                                          disabled={i === 0}
                                          onClick={() => {
                                              const newList = [...info.floorStatus];
                                              const temp = newList[i];
                                              newList[i] = newList[i - 1];
                                              newList[i - 1] = temp;
                                              setInfo({ ...info, floorStatus: newList });
                                          }}
                                          className="text-gray-400 hover:text-gray-700 disabled:opacity-30 hover:bg-gray-200 rounded p-0.5 transition-colors"
                                      >
                                          <ArrowUpIcon className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                          type="button"
                                          disabled={i === info.floorStatus.length - 1}
                                          onClick={() => {
                                              const newList = [...info.floorStatus];
                                              const temp = newList[i];
                                              newList[i] = newList[i + 1];
                                              newList[i + 1] = temp;
                                              setInfo({ ...info, floorStatus: newList });
                                          }}
                                          className="text-gray-400 hover:text-gray-700 disabled:opacity-30 hover:bg-gray-200 rounded p-0.5 transition-colors"
                                      >
                                          <ArrowDownIcon className="w-3.5 h-3.5" />
                                      </button>
                                  </div>
                                  <input value={row.floor} onChange={(e)=>handleFloorStatusChange(i, 'floor', e.target.value)} placeholder="층" className="w-12 border rounded p-1.5 text-xs text-center" />
                                  <input value={row.purpose} onChange={(e)=>handleFloorStatusChange(i, 'purpose', e.target.value)} placeholder="용도" className="w-16 border rounded p-1.5 text-xs text-center" />
                                  <input value={row.lease} onChange={(e)=>handleFloorStatusChange(i, 'lease', e.target.value)} placeholder="임대차" className="flex-1 border rounded p-1.5 text-xs text-center min-w-0" />
                                  <input value={row.status} onChange={(e)=>handleFloorStatusChange(i, 'status', e.target.value)} placeholder="점유상태" className="w-20 border rounded p-1.5 text-xs text-center" />
                                  <input value={row.note} onChange={(e)=>handleFloorStatusChange(i, 'note', e.target.value)} placeholder="비고" className="w-20 border rounded p-1.5 text-xs text-center" />
                                  <button 
                                      type="button" 
                                      onClick={() => removeFloorStatus(i)}
                                      className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors shrink-0"
                                      title="삭제"
                                  >
                                      <TrashIcon className="w-4 h-4" />
                                  </button>
                              </div>
                          ))}
                          <button
                              type="button"
                              onClick={addFloorStatus}
                              className="w-full mt-2 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 border border-dashed border-blue-200"
                          >
                              + 층 임대현황 행 추가
                          </button>
                          <div className="mt-4">
                              <label className="text-xs text-gray-500">현황 하단 안내문</label>
                              <input name="floorStatusNotice" value={info.floorStatusNotice} onChange={handleChange} className="w-full border rounded p-2 text-xs mt-1" />
                          </div>
                      </div>
                  </div>

                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">매각 핵심 하이라이트</h4>
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

                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">시세 분석 요약 (차트 하단)</h4>
                      <textarea name="valuationText" value={info.valuationText} onChange={handleChange} className="w-full border rounded p-2 text-sm" rows={4} />
                  </div>
              </div>
          )}

          {(activeTab === 'all' || activeTab === 3) && (
              <div className="space-y-6 animate-fadeIn">
                  {renderImageUpload('mainImage', '메인 사진 (정면 외관)')}
                  <div className="grid grid-cols-2 gap-4">
                      {renderImageUpload('subImage1', '서브 사진 1')}
                      {renderImageUpload('subImage2', '서브 사진 2')}
                      {renderImageUpload('featureImage1', '서브 사진 3')}
                      {renderImageUpload('featureImage2', '서브 사진 4')}
                  </div>
              </div>
          )}

          {(activeTab === 'all' || activeTab === 4) && (
              <div className="space-y-6 animate-fadeIn">
                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">입지 개요</h4>
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
          )}

          {(activeTab === 'all' || activeTab === 5) && (
              <div className="space-y-6 animate-fadeIn">
                  <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">개발 및 활용 로드맵 (4 시나리오)</h4>
                  {[1,2,3,4].map(i => (
                      <div key={i} className="mb-4 bg-gray-50 p-4 rounded-lg">
                          <label className="text-xs font-bold text-gray-800 mb-2 block">시나리오 {i}</label>
                          <input value={(info.roadmap as any)[`box${i}Title`]} onChange={(e)=>handleNestedChange('roadmap', `box${i}Title`, e.target.value)} placeholder="제목" className="w-full border rounded p-2 text-sm mb-2 font-bold" />
                          <textarea value={(info.roadmap as any)[`box${i}Text`]} onChange={(e)=>handleNestedChange('roadmap', `box${i}Text`, e.target.value)} placeholder="상세 내용" className="w-full border rounded p-2 text-sm" rows={3} />
                      </div>
                  ))}
              </div>
          )}

      </div>
    </div>
  );
};

export default FlyerForm;