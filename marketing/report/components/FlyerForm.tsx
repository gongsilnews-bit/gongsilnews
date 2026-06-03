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
                      <span>??젣</span>
                  </button>
              )}
          </div>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center relative hover:bg-gray-50 transition-colors group overflow-hidden h-32 flex items-center justify-center bg-gray-50">
              {uploadedImages[key] ? (
                  <img src={uploadedImages[key]} className="absolute inset-0 w-full h-full object-cover" />
              ) : null}
              {isUploadingImage && isUploadingImage[key] ? (
                  <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center text-white text-xs font-bold z-30">
                      <span>?낅줈??以?..</span>
                  </div>
              ) : (
                  <div className={`flex flex-col items-center relative z-10 ${uploadedImages[key] ? 'bg-white/80 p-2 rounded' : ''}`}>
                      <PhotoIcon className="w-6 h-6 text-gray-400 group-hover:text-gray-600" />
                      <span className="text-xs text-gray-400 mt-1">?대┃?섏뿬 ?낅줈??/span>
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
             ?붿옄???됱긽 ?좏깮
        </h3>
        <div className="flex items-center gap-3 mb-6 flex-wrap">
            {colors.map(color => (
                <button
                    key={color.id}
                    onClick={() => onColorSelect(color)}
                    className={`w-10 h-10 rounded-full border-2 transition-all shadow-sm flex items-center justify-center ${currentColor.id === color.id ? 'border-gray-800 scale-110 ring-2 ring-offset-2 ring-gray-300' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: color.primary }}
                    title={color.name || '?됱긽'}
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
                title="吏곸젒 ?됱긽 ?좏깮"
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
                            name: '?ъ슜??吏??,
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
             ?덉씠?꾩썐 ?뚮쭏 ?좏깮
        </h3>
        <div className="grid grid-cols-4 gap-2">
             {layouts.map((layout, idx) => (
                 <button
                    key={layout.id}
                    onClick={() => onLayoutSelect(layout)}
                    className={`py-2 rounded-lg border text-xs font-bold transition-all flex flex-col items-center justify-center ${currentLayout.id === layout.id ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                 >
                     <span className="block text-lg mb-0.5">{idx + 1}</span>
                     <span className="text-[10px] text-center leading-tight whitespace-pre-wrap">{layout.name ? layout.name.replace(' ', '\n') : `???${idx + 1}`}</span>
                 </button>
             ))}
        </div>
      </div>

      <hr className="border-gray-100 mb-6 shrink-0" />

      {/* Combined Tabs & Page Visibility Toggles */}
      <div className="grid grid-cols-3 gap-2.5 bg-gray-100/80 p-3 rounded-xl mb-6 shrink-0 shadow-inner">
          {[
              { id: 'all' as const, label: '?꾩껜' },
              { id: 0, label: '0. 而ㅻ쾭 & ?붾뵫' },
              { id: 1, label: '1. 媛쒖슂' },
              { id: 2, label: '2. 留ㅻЪ?ㅻ챸 & ?쒖꽭' },
              { id: 3, label: '3. ?꾨??꾪솴' },
              { id: 4, label: '4. ?ъ쭊' },
              { id: 5, label: '5. ?낆?' },
              { id: 6, label: '6. 濡쒕뱶留? },
          ].map(tab => {
              let visiblePages = [...(info.visiblePages || [0, 1, 2, 3, 4, 5, 6, 7])];
              if (!visiblePages.includes(0)) visiblePages.push(0);
              
              let isVisible = false;
              let isAllSelected = false;
              if (tab.id === 'all') {
                  isAllSelected = visiblePages.length >= 6;
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
                              title={tab.id === 'all' ? "?꾩껜 異쒕젰 ?좏깮/?댁젣" : "異쒕젰(?ы븿) ?щ?"}
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
          
          {/* 0. 而ㅻ쾭 & ?붾뵫 */}
          {(activeTab === 0 || activeTab === 'all') && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                      <div className="pb-2 border-b-[3px] border-black mb-4">
                          <h2 className="text-xl font-black text-black tracking-tight">0. 而ㅻ쾭 & ?붾뵫</h2>
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                          <h4 className="font-bold text-blue-800 mb-2">?꾨━??Pre-fill) ?쒗뵆由??좏깮</h4>
                          <select
                              value={info.propertyType || 'commercial_sales'}
                              onChange={(e) => {
                                  const type = e.target.value as any;
                                  setInfo({ ...info, propertyType: type });
                                  // We can add actual prefill logic here later, for now just change type
                              }}
                              className="w-full border-blue-200 rounded p-2 text-sm text-blue-900 bg-white focus:ring-blue-500"
                          >
                              <option value="commercial_sales">?곸뾽??留ㅻℓ (嫄대Ъ/鍮뚮뵫)</option>
                              <option value="commercial_rent">?곸뾽???꾨? (?곴?/?щТ??</option>
                              <option value="residential">二쇨굅??(留ㅻℓ/?꾩썡??</option>
                          </select>
                      </div>

                      <div>
                          <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">而ㅻ쾭 (?쒖?) ?ㅼ젙</h4>
                          <div className="space-y-3">
                              <div>
                                  <label className="text-xs text-gray-500">而ㅻ쾭 硫붿씤 ??댄?</label>
                                  <input type="text" name="coverTitle" value={info.coverTitle || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm" placeholder="INVESTMENT MEMORANDUM" />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500">而ㅻ쾭 ?쒕툕 ??댄?</label>
                                  <input type="text" name="coverSubtitle" value={info.coverSubtitle || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm" placeholder="遺?숈궛 ?ъ옄 遺꾩꽍 蹂닿퀬?? />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500">留ㅻЪ ?곸꽭 蹂닿린 QR 留곹겕 (VR/?덊럹?댁?)</label>
                                  <input type="text" name="coverQRLink" value={info.coverQRLink || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm" placeholder="https://" />
                              </div>
                          </div>
                      </div>

                      <div>
                          <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">?붾뵫 (留덉?留??? ?ㅼ젙</h4>
                          <div className="grid grid-cols-2 gap-4">
                              {renderImageUpload('agentPhoto', '?대떦???꾨줈??/ ?좊ː ?ъ쭊')}
                              {renderImageUpload('agencyLogo', '以묎컻踰뺤씤 濡쒓퀬 (?섎떒)')}
                          </div>
                          <div className="space-y-3 mt-3">
                              <div>
                                  <label className="text-xs text-gray-500">?좏뒠釉?留곹겕</label>
                                  <input type="text" name="contactYoutube" value={info.contactYoutube || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm" />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500">釉붾줈洹?留곹겕</label>
                                  <input type="text" name="contactBlog" value={info.contactBlog || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm" />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500">?덊럹?댁?/臾몄쓽 QR 留곹겕</label>
                                  <input type="text" name="contactQRLink" value={info.contactQRLink || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm" />
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {(activeTab === 1 || (activeTab === 'all' && (info.visiblePages || [1, 2, 3, 4, 5, 6]).includes(1))) && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'h-[620px] overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                      <div className="pb-2 border-b-[3px] border-black mb-4">
                          <h2 className="text-xl font-black text-black tracking-tight">1. 媛쒖슂</h2>
                      </div>
                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">湲곕낯 ??댄?</h4>
                      <div className="space-y-3">
                          <div><label className="text-xs text-gray-500">蹂닿퀬???쒕ぉ (Address)</label><textarea name="address" value={info.address || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm resize-y" rows={2} /></div>
                          <div><label className="text-xs text-gray-500">?쒕툕 ??댄?</label><textarea name="subTitle" value={info.subTitle || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm resize-y" rows={3} /></div>
                      </div>
                  </div>

                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">臾쇨굔 媛쒖슂 (??</h4>
                      <div className="space-y-3">
                          {(() => {
                              const tbl = Array.isArray(info.overviewTable) 
                                  ? info.overviewTable 
                                  : [
                                      { label: "?뚯옱吏", value: (info.overviewTable as any)?.location || "" },
                                      { label: "?⑸룄吏??, value: (info.overviewTable as any)?.zoning || "" },
                                      { label: "?吏硫댁쟻", value: (info.overviewTable as any)?.landArea || "" },
                                      { label: "?곕㈃??, value: (info.overviewTable as any)?.totalArea || "" },
                                      { label: "嫄대Ъ洹쒕え", value: (info.overviewTable as any)?.buildingScale || "" },
                                      { label: "二쇱슜??, value: (info.overviewTable as any)?.mainPurpose || "" },
                                      { label: "二쇱감???, value: (info.overviewTable as any)?.parking || "" },
                                      { label: "?밴컯湲?, value: (info.overviewTable as any)?.elevator || "" },
                                      { label: "以怨듭뿰??, value: (info.overviewTable as any)?.completionYear || "" },
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
                                                  placeholder="??ぉ紐? 
                                                  className="w-24 border rounded p-1.5 text-xs text-center font-bold text-gray-600 bg-white" 
                                              />
                                              <input 
                                                  value={row.value} 
                                                  onChange={(e) => {
                                                      const newTable = [...tbl];
                                                      newTable[i] = { ...newTable[i], value: e.target.value };
                                                      setInfo({ ...info, overviewTable: newTable });
                                                  }} 
                                                  placeholder="?댁슜" 
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
                                                  title="??젣"
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
                                          + 媛쒖슂 ??ぉ(?? 異붽?
                                      </button>
                                  </>
                              );
                          })()}
                          {/* 嫄곕옒 ?뺥깭 諛?湲덉븸 ?ㅼ젙 */}
                          <div className="mt-4 bg-orange-50/50 p-3 rounded-lg border border-orange-100/80 space-y-3">
                              <div className="flex items-center justify-between">
                                  <label className="text-xs font-extrabold text-[#cc5a27] flex items-center gap-1">
                                      ?쩃 嫄곕옒 ?뺥깭 諛?湲덉븸 ?ㅼ젙
                                  </label>
                                  {/* Select transaction type */}
                                  <div className="flex bg-white rounded border border-gray-200 p-0.5 shadow-sm shrink-0">
                                      {["留ㅻℓ", "?꾩꽭", "?붿꽭"].map((t) => (
                                          <button
                                              key={t}
                                              type="button"
                                              onClick={() => setInfo({ ...info, transactionType: t as any })}
                                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold transition-all cursor-pointer ${
                                                  (info.transactionType || "留ㅻℓ") === t 
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
                                      const tType = info.transactionType || "留ㅻℓ";
                                      let priceLabel = "留ㅻℓ媛";
                                      let pricePlaceholder = "?? 500??;
                                      if (tType === "?꾩꽭") {
                                          priceLabel = "蹂댁쬆湲?;
                                          pricePlaceholder = "?? 150??;
                                      } else if (tType === "?붿꽭") {
                                          priceLabel = "蹂댁쬆湲?/ ?붿꽭";
                                          pricePlaceholder = "?? 5000留?/ 300留?;
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
                                                      <span className="text-[9px] text-gray-400 font-semibold block mb-0.5">諛곌꼍??/span>
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
                                                              placeholder="湲곕낯媛?
                                                              className="w-full border border-gray-300 rounded p-1 text-[10px] bg-white text-gray-600"
                                                          />
                                                      </div>
                                                  </div>
                                                  <div className="flex-1">
                                                      <span className="text-[9px] text-gray-400 font-semibold block mb-0.5">湲?⑥깋</span>
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
                                                              placeholder="?뚮쭏??
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
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">?ъ옄 ?붿빟 (?섎떒 3諛뺤뒪)</h4>
                      {[1,2,3].map(i => (
                          <div key={i} className="mb-3 bg-gray-50 p-3 rounded">
                              <label className="text-xs font-bold">諛뺤뒪 {i}</label>
                              <div className="flex gap-2 mt-1">
                                  <input value={(info.investmentSummary as any)[`box${i}Title`]} onChange={(e)=>handleNestedChange('investmentSummary', `box${i}Title`, e.target.value)} placeholder="?곷Ц ??댄?" className="w-1/3 border rounded p-2 text-xs uppercase" />
                                  <textarea value={(info.investmentSummary as any)[`box${i}Text`]} onChange={(e)=>handleNestedChange('investmentSummary', `box${i}Text`, e.target.value)} placeholder="?쒓? ?ㅼ썙?? className="w-2/3 border rounded p-2 text-xs" rows={2} />
                              </div>
                          </div>
                      ))}
                  </div>

                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">臾몄쓽 ?덈궡 (?대떦??</h4>
                      <div className="space-y-3">
                          <div><label className="text-xs text-gray-500">以묎컻?щТ?뚮챸</label><input name="agentName" value={info.agentName} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
                          <div><label className="text-xs text-gray-500">?대떦?먮챸/吏곴툒</label><input name="agentRepresentative" value={info.agentRepresentative} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
                          <div><label className="text-xs text-gray-500">臾몄쓽 ?곕씫泥?/label><input name="agentMobile" value={info.agentMobile} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
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
                              ?뱷 1. 媛쒖슂 ?섏젙?섍린
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
                              ?ㅻ줈媛湲?
                          </button>
                          <button 
                              type="button" 
                              onClick={() => setActiveTab('all')}
                              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors shadow-sm text-sm"
                          >
                              ?꾩껜蹂닿린
                          </button>
                      </div>
                  )}
              </div>
          )}

          {(activeTab === 2 || (activeTab === 'all' && (info.visiblePages || [1, 2, 3, 4, 5, 6]).includes(2))) && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'h-[620px] overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                      <div className="pb-2 border-b-[3px] border-black mb-4">
                          <h2 className="text-xl font-black text-black tracking-tight">2. 留ㅻЪ?ㅻ챸 & ?쒖꽭</h2>
                      </div>


                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">留ㅻЪ ?듭떖 ?섏씠?쇱씠??/h4>
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
                                  <input value={hl} onChange={(e)=>handleHighlightsChange(i, e.target.value)} className="flex-1 border rounded p-2 text-xs" placeholder={`硫붾━??${i+1}`} />
                                  <button
                                      type="button"
                                      onClick={() => removeHighlight(i)}
                                      className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors shrink-0"
                                      title="??젣"
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
                              + ?섏씠?쇱씠????異붽?
                          </button>
                      </div>
                  </div>

                  {/* ?쒖꽭 遺꾩꽍 洹몃옒???ㅼ젙 */}
                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">?쒖꽭 遺꾩꽍 洹몃옒???ㅼ젙</h4>
                      <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-xs mb-4">
                          <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-700">?뱢 洹몃옒???붾㈃ ?쒖떆</span>
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
                                      <span>留됰? ?곗씠??吏곸젒 ?낅젰</span>
                                      <span>(理쒕? 6媛?</span>
                                  </div>
                                  {(info.chartBars || [
                                      { label: "?곸긽媛먯젙媛", value: "80", isHighlight: false },
                                      { label: "湲곗〈 ?щ쭩媛", value: "75", isHighlight: false },
                                      { label: "?멸렐 ?쒖꽭", value: "85", isHighlight: false },
                                      { label: "?꾩옱 湲됰ℓ媛", value: "65", isHighlight: true }
                                  ]).map((bar: any, idx: number) => {
                                      const chartBars = info.chartBars || [
                                          { label: "?곸긽媛먯젙媛", value: "80", isHighlight: false },
                                          { label: "湲곗〈 ?щ쭩媛", value: "75", isHighlight: false },
                                          { label: "?멸렐 ?쒖꽭", value: "85", isHighlight: false },
                                          { label: "?꾩옱 湲됰ℓ媛", value: "65", isHighlight: true }
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
                                                  placeholder="??ぉ紐? 
                                                  className="w-20 border rounded p-1 text-[11px] font-bold text-center text-slate-700 bg-white" 
                                              />
                                              <input 
                                                  value={bar.value} 
                                                  onChange={(e) => {
                                                      const newBars = [...chartBars];
                                                      newBars[idx] = { ...newBars[idx], value: e.target.value };
                                                      setInfo({ ...info, chartBars: newBars });
                                                  }} 
                                                  placeholder="?섏튂(??" 
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
                                                  title="留됰? ?됱긽 媛뺤“"
                                              >
                                                  媛뺤“
                                              </button>
                                              {chartBars.length > 2 && (
                                                  <button
                                                      type="button"
                                                      onClick={() => {
                                                          const newBars = chartBars.filter((_, i) => i !== idx);
                                                          setInfo({ ...info, chartBars: newBars });
                                                      }}
                                                      className="text-red-400 hover:text-red-600 p-1 text-sm leading-none shrink-0"
                                                      title="??젣"
                                                  >
                                                      ??
                                                  </button>
                                              )}
                                          </div>
                                      );
                                  })}
                                  
                                  {/* Add chart bar button */}
                                  {(info.chartBars || [
                                      { label: "?곸긽媛먯젙媛", value: "80", isHighlight: false },
                                      { label: "湲곗〈 ?щ쭩媛", value: "75", isHighlight: false },
                                      { label: "?멸렐 ?쒖꽭", value: "85", isHighlight: false },
                                      { label: "?꾩옱 湲됰ℓ媛", value: "65", isHighlight: true }
                                  ]).length < 6 && (
                                      <button
                                          type="button"
                                          onClick={() => {
                                              const chartBars = info.chartBars || [
                                                  { label: "?곸긽媛먯젙媛", value: "80", isHighlight: false },
                                                  { label: "湲곗〈 ?щ쭩媛", value: "75", isHighlight: false },
                                                  { label: "?멸렐 ?쒖꽭", value: "85", isHighlight: false },
                                                  { label: "?꾩옱 湲됰ℓ媛", value: "65", isHighlight: true }
                                              ];
                                              const newBars = [...chartBars, { label: "????ぉ", value: "70", isHighlight: false }];
                                              setInfo({ ...info, chartBars: newBars });
                                          }}
                                          className="w-full mt-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-[11px] font-bold transition-colors flex items-center justify-center gap-1 border border-dashed border-blue-200"
                                      >
                                          + 留됰? 異붽?
                                      </button>
                                  )}
                              </div>
                          )}
                      </div>
                  </div>

                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">?쒖꽭 遺꾩꽍 ?붿빟 (?섎떒)</h4>
                      <div className="space-y-3">
                          <div>
                              <label className="text-xs text-gray-500 font-bold">醫뚯륫 ?띿뒪??(STRATEGIC ADVISORY)</label>
                              <textarea name="valuationText" value={info.valuationText || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm" rows={4} />
                          </div>
                          <div>
                              <label className="text-xs text-gray-500 font-bold">?곗륫 ?띿뒪??(洹몃옒???섎떒)</label>
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
                              ?뱷 2. 留ㅻЪ?ㅻ챸 & ?쒖꽭 ?섏젙?섍린
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
                              ?ㅻ줈媛湲?                          </button>
                          <button 
                              type="button" 
                              onClick={() => setActiveTab('all')}
                              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors shadow-sm text-sm"
                          >
                              ?꾩껜蹂닿린
                          </button>
                      </div>
                  )}
              </div>
          )}

          {(activeTab === 3 || (activeTab === 'all' && (info.visiblePages || [1, 2, 3, 4, 5, 6]).includes(3))) && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'h-[620px] overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                      <div className="pb-2 border-b-[3px] border-black mb-4">
                          <h2 className="text-xl font-black text-black tracking-tight">3. ?꾨??꾪솴</h2>
                      </div>
                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">?섏씠吏 ??댄?</h4>
                      <div className="space-y-3">
                          <div><label className="text-xs text-gray-500">?섏씠吏 ?쒕ぉ (湲곕낯: ?꾨? ?곸꽭 ?꾪솴)</label><input name="page3Title" value={info.page3Title || "?꾨? ?곸꽭 ?꾪솴"} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
                          <div><label className="text-xs text-gray-500">?뚯씠釉??곷떒 ?뚯젣紐?(湲곕낯: PROPERTY RENTAL REPORT)</label><input name="page3HighlightHeader" value={(info as any).page3HighlightHeader || "PROPERTY RENTAL REPORT"} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
                          <div><label className="text-xs text-gray-500">?섏씠吏 遺?쒕ぉ</label><input name="page3Subtitle" value={info.page3Subtitle || "Rent Roll"} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
                          <div><label className="text-xs text-gray-500">???섎떒 ?붿빟 (Total Summary)</label><input name="leaseSummaryText" value={(info as any).leaseSummaryText || "珥?6?몃? / 蹂댁쬆湲?0??/ ?붿꽭 0??} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
                          
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                              <span className="font-bold text-slate-700 text-xs">?곗륫 ?ㅻ챸? ?쒖떆</span>
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
                                  <label className="text-xs text-gray-500">?곗륫 ?ㅻ챸 ?댁슜</label>
                                  <textarea name="leaseSummaryDesc" value={(info as any).leaseSummaryDesc || "?꾨? ?섏씡瑜?諛??곸꽭 議곌굔? ?묒쓽 媛?ν빀?덈떎."} onChange={handleChange} className="w-full border rounded p-2 text-sm" rows={2} />
                              </div>
                          )}
                      </div>
                  </div>



                  <div className="mt-4">
                      <label className="text-xs text-gray-500 font-semibold">???섎떒 ?좎쓽 ?ы빆</label>
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
                              ?뱷 3. ?꾨??꾪솴 ?섏젙?섍린
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
                              ?ㅻ줈媛湲?                          </button>
                          <button 
                              type="button" 
                              onClick={() => setActiveTab('all')}
                              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors shadow-sm text-sm"
                          >
                              ?꾩껜蹂닿린
                          </button>
                      </div>
                  )}
              </div>
          )}

          {(activeTab === 4 || (activeTab === 'all' && (info.visiblePages || [1, 2, 3, 4, 5, 6]).includes(4))) && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'h-[620px] overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                      <div className="pb-2 border-b-[3px] border-black mb-4">
                          <h2 className="text-xl font-black text-black tracking-tight">4. ?ъ쭊</h2>
                      </div>
                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">?섏씠吏 ??댄?</h4>
                      <div className="space-y-3 mb-4">
                          <div><label className="text-xs text-gray-500">?섏씠吏 ?쒕ぉ (湲곕낯: 留ㅻЪ ?ъ쭊)</label><input name="page4Title" value={info.page4Title || "留ㅻЪ ?ъ쭊"} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
                          <div><label className="text-xs text-gray-500">?섏씠吏 遺?쒕ぉ (湲곕낯: Property Photo)</label><input name="page4Subtitle" value={info.page4Subtitle || "Property Photo"} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
                      </div>
                  </div>
                  {renderImageUpload('mainImage', '硫붿씤 ?ъ쭊 (?뺣㈃ ?멸?)')}
                  <div className="grid grid-cols-2 gap-4">
                      {renderImageUpload('subImage1', '?쒕툕 ?ъ쭊 1')}
                      {renderImageUpload('subImage2', '?쒕툕 ?ъ쭊 2')}
                      {renderImageUpload('featureImage1', '?쒕툕 ?ъ쭊 3')}
                      {renderImageUpload('featureImage2', '?쒕툕 ?ъ쭊 4')}
                  </div>
                  </div>

                  {activeTab === 'all' && (
                      <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-white via-white/90 to-transparent flex items-end justify-center pb-6 z-10 pointer-events-none">
                          <button 
                              type="button" 
                              onClick={() => setActiveTab(4)}
                              className="pointer-events-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-full shadow-lg flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                          >
                              ?뱷 4. ?ъ쭊 ?섏젙?섍린
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
                              ?ㅻ줈媛湲?                          </button>
                          <button 
                              type="button" 
                              onClick={() => setActiveTab('all')}
                              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors shadow-sm text-sm"
                          >
                              ?꾩껜蹂닿린
                          </button>
                      </div>
                  )}
              </div>
          )}

          {(activeTab === 5 || (activeTab === 'all' && (info.visiblePages || [1, 2, 3, 4, 5, 6]).includes(5))) && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'h-[620px] overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                      <div className="pb-2 border-b-[3px] border-black mb-4">
                          <h2 className="text-xl font-black text-black tracking-tight">5. ?낆?</h2>
                      </div>
                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">?낆? 媛쒖슂 諛?吏???ㅼ젙</h4>
                      <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60 mb-4 text-xs">
                          <div>
                              <label className="text-xs text-gray-500 font-semibold block mb-1">?뿺截?吏???좏삎 ?좏깮</label>
                              <div className="flex bg-gray-100 p-1 rounded-lg">
                                  {[
                                      { type: "kakao", label: "移댁뭅??吏?? },
                                      { type: "google", label: "援ш? 吏?? },
                                      { type: "upload", label: "罹≪쿂 ?대?吏 ?낅줈?? }
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
                                  {renderImageUpload('mapImage', '?ㅼ씠踰?移댁뭅??吏??罹≪쿂 ?대?吏')}
                              </div>
                          )}
                      </div>

                      <div className="space-y-3">
                          <div><label className="text-xs text-gray-500">?寃?濡쒖??댁뀡 (?곗륫 ?곷떒 諭껋?)</label><textarea name="areaTargetName" value={info.areaTargetName} onChange={handleChange} className="w-full border rounded p-2 text-sm" rows={2}/></div>
                          <div><label className="text-xs text-gray-500">?낆? ?ㅻ챸 ?띿뒪??/label><textarea name="areaTargetDesc" value={info.areaTargetDesc} onChange={handleChange} className="w-full border rounded p-2 text-sm" rows={4}/></div>
                      </div>
                  </div>
                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">?낆? ?곸꽭 遺꾩꽍 (?섎떒 3諛뺤뒪)</h4>
                      {[1,2,3].map(i => (
                          <div key={i} className="mb-3 bg-gray-50 p-3 rounded">
                              <label className="text-xs font-bold text-gray-600">諛뺤뒪 {i}</label>
                              <div className="space-y-2 mt-1">
                                  <input value={(info as any)[`areaBox${i}Title`]} onChange={handleChange} name={`areaBox${i}Title`} placeholder="?곷Ц ??댄?" className="w-full border rounded p-2 text-xs uppercase" />
                                  <textarea value={(info as any)[`areaBox${i}Text`]} onChange={handleChange} name={`areaBox${i}Text`} placeholder="遺꾩꽍 ?댁슜" className="w-full border rounded p-2 text-xs" rows={2} />
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
                              ?뱷 5. ?낆? ?섏젙?섍린
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
                              ?ㅻ줈媛湲?                          </button>
                          <button 
                              type="button" 
                              onClick={() => setActiveTab('all')}
                              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors shadow-sm text-sm"
                          >
                              ?꾩껜蹂닿린
                          </button>
                      </div>
                  )}
              </div>
          )}

          {(activeTab === 6 || (activeTab === 'all' && (info.visiblePages || [1, 2, 3, 4, 5, 6]).includes(6))) && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'h-[620px] overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                      <div className="pb-2 border-b-[3px] border-black mb-4">
                          <h2 className="text-xl font-black text-black tracking-tight">6. 濡쒕뱶留?/h2>
                      </div>
                  <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">媛쒕컻 諛??쒖슜 濡쒕뱶留?(?쒕굹由ъ삤)</h4>
                  {(() => {
                      const ROADMAP_ICONS = [
                          { value: '?룫', label: '鍮뚮뵫/?ㅽ뵾?? },
                          { value: '?룪', label: '二쇳깮/嫄곗＜' },
                          { value: '?뱢', label: '?깆옣/?섏씡' },
                          { value: '?룛截?, label: '嫄댁꽕/媛쒕컻' },
                          { value: '?뮥', label: '?먯궛/?ъ옄' },
                          { value: '?쩃', label: '怨꾩빟/?묐젰' },
                          { value: '??', label: '?곸떊/誘몃옒' },
                          { value: '?렞', label: '紐⑺몴/?寃? },
                          { value: '?뮕', label: '?꾩씠?붿뼱' },
                          { value: '?뱤', label: '遺꾩꽍/?곗씠?? },
                          { value: '?썳截?, label: '?덉쟾/蹂댁븞' },
                          { value: '?쉮', label: '??꽭沅?援먰넻' },
                          { value: '?룯', label: '?섎즺/蹂묒썝' },
                          { value: '?룵', label: '?곴?/由ы뀒?? },
                          { value: '?몣', label: '?꾨━誘몄뾼' },
                          { value: '?뙚', label: '?듭떖媛移? }
                      ];

                      const list = info.roadmapList || [1, 2, 3, 4].map((i, index) => ({
                          title: (info.roadmap as any)?.[`box${i}Title`] || "",
                          text: (info.roadmap as any)?.[`box${i}Text`] || "",
                          icon: (info.roadmap as any)?.[`box${i}Icon`] || ['?룫', '?룪', '?뱢', '?룛截?][index] || '?룫',
                          bg: ['bg-blue-50', 'bg-green-50', 'bg-red-50', 'bg-yellow-50'][index] || 'bg-gray-50',
                          border: ['border-blue-100', 'border-green-100', 'border-red-100', 'border-yellow-100'][index] || 'border-gray-200'
                      }));

                      return (
                          <>
                              {list.map((item: any, idx: number) => (
                                  <div key={idx} className="mb-4 bg-gray-50 p-4 rounded-lg relative">
                                      <div className="flex items-center justify-between mb-2">
                                          <label className="text-xs font-bold text-gray-800">?쒕굹由ъ삤 {idx + 1}</label>
                                          <div className="flex items-center gap-2">
                                              <span className="text-[10px] text-gray-500 font-normal">?꾩씠肄?</span>
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
                                                      <option value={item.icon}>{item.icon} 吏곸젒?낅젰</option>
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
                                          placeholder="?쒕ぉ" 
                                          className="w-full border rounded p-2 text-sm mb-2 font-bold" 
                                      />
                                      <textarea 
                                          value={item.text} 
                                          onChange={(e) => {
                                              const newList = [...list];
                                              newList[idx] = { ...newList[idx], text: e.target.value };
                                              setInfo({ ...info, roadmapList: newList });
                                          }} 
                                          placeholder="?곸꽭 ?댁슜" 
                                          className="w-full border rounded p-2 text-sm" 
                                          rows={3} 
                                      />
                                  </div>
                              ))}
                              {list.length < 6 && (
                                  <button
                                      type="button"
                                      onClick={() => {
                                          const newList = [...list, { title: '', text: '', icon: '?뙚', bg: 'bg-gray-50', border: 'border-gray-200' }];
                                          setInfo({ ...info, roadmapList: newList });
                                      }}
                                      className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 border border-dashed border-blue-200"
                                  >
                                      + ?쒕굹由ъ삤 異붽?
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
                              ?뱷 6. 濡쒕뱶留??섏젙?섍린
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
                              ?ㅻ줈媛湲?                          </button>
                          <button 
                              type="button" 
                              onClick={() => setActiveTab('all')}
                              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors shadow-sm text-sm"
                          >
                              ?꾩껜蹂닿린
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


