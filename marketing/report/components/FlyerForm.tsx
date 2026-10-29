import React, { useState } from 'react';
import { WEB_LIMITED, WEB_PAGE_NUMS, askInstallApp } from '../webLimit';
import { PropertyInfo, FlyerColor, FlyerLayout } from '../types';
import { detectPropertyCategory, getOverviewTemplate } from '../propertyTemplates';
import { MAX_PHOTO_PAGES, photoPageCount, photoPageKeys } from './canvas/photoPages';
import { DEFAULT_ORDER, pageOrder, pageNumberLabel } from './canvas/pageOrder';
import SimPanel from './SimPanel';
import { SimKind } from './canvas/PageSim';
import { pageFields, fieldValue, setField, captionKeyOf, photoCaption, setPhotoCaption, roadmapItems } from '../reportFields';
import { ROADMAP_ICONS, RoadmapIcon, roadmapIconKey } from './canvas/roadmapIcons';
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
    onSave?: () => void;
    /** 쪽별 [AI 수정 요청] — 그 쪽 글 칸만 요청대로 다시 쓴다 (앱에서만, 2026-10-25) */
    onAiAsk?: (page: number, request: string) => void;
    aiPages?: number[];
    aiBusy?: boolean;
    /** [공실뉴스 캡처 사진 넣기] — 앱에서만 (없으면 단추를 숨긴다) · 진행 글 */
    onInsertCaptures?: () => void;
    capturesBusy?: string;
    /** [지적도·건축물대장 가져오기] (2026-10-24) · 진행 글 */
    onFetchLand?: () => void;
    landBusy?: string;
    /** 12·13쪽 AI시뮬레이션 (App 이 돌린다) */
    simBusy?: string;
    onSimRun?: (kind: SimKind, simId: string) => void;
    onSimUse?: (kind: SimKind, simId: string) => void;
}

/** 쪽별 [AI 수정 요청] — "더 홍보하는 말투로", "짧게" 처럼 적으면 이 쪽 글 칸만 AI 가 다시 쓴다 (2026-10-25 사장님) */
const AiAsk: React.FC<{ onAsk: (request: string) => void; busy?: boolean }> = ({ onAsk, busy }) => {
  const [text, setText] = React.useState("");
  const send = () => { const t = text.trim(); if (t && !busy) onAsk(t); };
  return (
    <div className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
      <div className="text-xs font-bold text-indigo-700 mb-1.5">✨ 이 쪽 글 AI에게 수정 요청</div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); } }}
        placeholder="예) 손님이 보러 오고 싶게 더 홍보하는 말투로 / 더 짧게 / 주차 장점을 강조"
        className="w-full border border-indigo-200 rounded-lg p-2 text-sm resize-y bg-white" />
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[11px] text-gray-500">숫자·사실은 그대로 두고 이 쪽 글만 다시 씁니다.</span>
        <button type="button" onClick={send} disabled={busy || !text.trim()}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold">
          {busy ? "쓰는 중…" : "AI로 수정"}
        </button>
      </div>
    </div>
  );
};

/** 이 쪽의 글 칸 — 칸 목록(reportFields)에서 만든다. 보고서 화면과 같은 값이라 어느 쪽에서 고쳐도 같이 바뀐다 (2026-10-25 사장님: "입력란과 보고서 100% 호환")
 *  skip = 이 탭이 따로 그려 둔 칸. 제목·머리글·배지 같은 꾸밈 글은 접어 둔다 */
const PageFields: React.FC<{ info: any; setInfo: (info: any) => void; page: number; skip?: string[]; title?: string }> = ({ info, setInfo, page, skip = [], title }) => {
  const all = pageFields(page).filter((f) => !skip.includes(f.key));
  const main = all.filter((f) => !f.deco);
  const deco = all.filter((f) => f.deco);
  if (!all.length) return null;
  const input = (f: (typeof all)[number]) => {
    const v = fieldValue(info, f.key);
    const on = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setInfo(setField(info, f.key, e.target.value));
    return (
      <div key={f.key}>
        <label className="text-xs text-gray-500">{f.label}</label>
        {f.multiline
          ? <textarea value={v} onChange={on} placeholder={f.ph || ''} rows={2} className="w-full border rounded p-2 text-sm resize-y" />
          : <input value={v} onChange={on} placeholder={f.ph || ''} className="w-full border rounded p-2 text-sm" />}
      </div>
    );
  };
  return (
    <div className="space-y-3">
      {title && <h4 className="font-bold text-gray-800 text-sm border-b pb-2">{title}</h4>}
      {main.map(input)}
      {deco.length > 0 && (
        <details className="rounded-lg border border-gray-200 bg-gray-50/60">
          <summary className="cursor-pointer select-none px-3 py-2 text-xs font-bold text-gray-600">쪽 꾸밈 글 (제목·머리글·배지) {deco.length}개</summary>
          <div className="space-y-3 px-3 pb-3">{deco.map(input)}</div>
        </details>
      )}
    </div>
  );
};

const FlyerForm: React.FC<FlyerFormProps> = ({
    info, setInfo, onImageUpload, onDeleteImage,
    colors, layouts, currentColor, currentLayout, onColorSelect, onLayoutSelect,
    uploadedImages, isUploadingImage,
    activeTab, setActiveTab,
    onOpenTableEditor, onBackTab, onSave, onInsertCaptures, capturesBusy, onFetchLand, landBusy, simBusy, onSimRun, onSimUse, onAiAsk, aiPages, aiBusy
}) => {
    const [isDesignLayoutOpen, setIsDesignLayoutOpen] = useState(true);
    // 쪽 차례 바꾸기 (2026-10-24 사장님) — 끌어서 놓기 · ◀ ▶ · [처음 순서로]. 표지는 맨 앞 고정
    const [dragId, setDragId] = useState<number | null>(null);
    const [rmPick, setRmPick] = useState(-1); // 로드맵 아이콘 고르는 중인 상자
    const order = pageOrder(info as any);
    const setOrder = (o: number[]) => setInfo({ ...info, pageOrder: o } as any);
    const moveTo = (id: number, beforeId: number) => {
        if (id === 0 || id === beforeId) return;
        const rest = order.filter((p) => p !== id);
        const at = beforeId === 0 ? 1 : rest.indexOf(beforeId);
        rest.splice(Math.max(1, at), 0, id);
        setOrder(rest);
    };
    const step = (id: number, d: -1 | 1) => {
        const i = order.indexOf(id), j = i + d;
        if (id === 0 || j < 1 || j >= order.length) return;
        const o = [...order];
        [o[i], o[j]] = [o[j], o[i]];
        setOrder(o);
    };
    const L = (id: number) => pageNumberLabel(id, info as any);
    const fv = (key: string) => fieldValue(info, key);
    const PF = (page: number, skip: string[] = [], title?: string) => <PageFields info={info} setInfo={setInfo} page={page} skip={skip} title={title} />;
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

  const handleGeocodeAddress = (type: 'page5' | 'page7') => {
    const addressToSearch = type === 'page5'
      ? (info.mapAddress || info.address)
      : (info.agentMapAddress || info.agentAddress);

    if (!addressToSearch) {
      alert("검색할 주소를 먼저 입력해주세요.");
      return;
    }

    if (!(window as any).kakao || !(window as any).kakao.maps || !(window as any).kakao.maps.services) {
      alert("지도 라이브러리가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    try {
      const geocoder = new (window as any).kakao.maps.services.Geocoder();
      let cleanAddress = addressToSearch.split('\n')[0];
      const cleanPatterns = [/(매매|전세|월세|임대).*/g, /\d+억.*/g, /\s+([지상하B]*\d+[층호]).*$/g];
      cleanPatterns.forEach(pat => {
        cleanAddress = cleanAddress.replace(pat, "").trim();
      });

      geocoder.addressSearch(cleanAddress, (result: any, status: any) => {
        if (status === (window as any).kakao.maps.services.Status.OK) {
          const newLat = Number(result[0].y);
          const newLng = Number(result[0].x);
          if (type === 'page5') {
            setInfo({
              ...info,
              page5Lat: newLat,
              page5Lng: newLng
            });
          } else {
            setInfo({
              ...info,
              page7Lat: newLat,
              page7Lng: newLng
            });
          }
          alert("주소 검색 결과로 지도 위치가 갱신되었습니다.");
        } else {
          alert(`주소 "${cleanAddress}"에 매칭되는 정확한 좌표를 찾을 수 없습니다. 올바른 지번이나 도로명 주소인지 확인해주세요.`);
        }
      });
    } catch (e) {
      console.error("Geocoding reset error", e);
      alert("주소 검색 중 오류가 발생했습니다.");
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
          {uploadedImages[key] && (
              <input value={photoCaption(info, captionKeyOf(key))} onChange={(e) => setInfo(setPhotoCaption(info, captionKeyOf(key), e.target.value))}
                  placeholder="사진 설명 한 줄 (보고서 사진 아래)" className="mt-1.5 w-full border rounded p-1.5 text-xs" />
          )}
      </div>
  );

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 h-full overflow-y-auto custom-scrollbar flex flex-col">

            {/* Design Theme Selection */}
            <div className="mb-6 shrink-0">
                <button
                    type="button"
                    onClick={() => setIsDesignLayoutOpen(prev => !prev)}
                    className="w-full flex items-center justify-between px-3 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-black text-slate-800 transition-colors"
                    aria-expanded={isDesignLayoutOpen}
                >
                    <span className="flex items-center gap-2">
                        <RectangleGroupIcon className="w-5 h-5" />
                        보고서 편집 디자인 레이아웃
                    </span>
                    <span aria-hidden="true">{isDesignLayoutOpen ? "▲" : "▼"}</span>
                </button>

                {isDesignLayoutOpen && <div className="mt-4">
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
                </div>}
      </div>

      <hr className="border-gray-100 mb-6 shrink-0" />

      {/* Combined Tabs & Page Visibility Toggles */}
      {order.join() !== DEFAULT_ORDER.join() && (
          <div className="flex justify-end -mb-1.5 mt-[-6px]">
              <button type="button" onClick={() => setOrder(DEFAULT_ORDER)} className="text-[11px] font-bold text-gray-500 hover:text-blue-600 underline">처음 순서로</button>
          </div>
      )}
      <div className="grid grid-cols-3 gap-2.5 bg-gray-100/80 p-3 rounded-xl mb-6 shrink-0 shadow-inner">
          {[
              { id: 'all' as const, label: '전체' },
              ...order.map((id) => ({ id, label: L(id) })),
          ].map(tab => {
              let visiblePages = [...(info.visiblePages || [0, 1, 2, 3, 4, 5, 6, 7])];

              let isVisible = false;
              let isAllSelected = false;
              if (tab.id === 'all') {
                  isAllSelected = order.every(p => visiblePages.includes(p));
                  isVisible = isAllSelected;
              } else {
                  isVisible = visiblePages.includes(tab.id as number);
              }

              return (
                  <div
                      key={tab.id}
                      onClick={() => (WEB_LIMITED && typeof tab.id === 'number' && !WEB_PAGE_NUMS.includes(tab.id) ? askInstallApp() : setActiveTab(tab.id))}
                      draggable={typeof tab.id === 'number' && tab.id !== 0}
                      onDragStart={(e) => { if (typeof tab.id === 'number') { setDragId(tab.id); e.dataTransfer.effectAllowed = 'move'; } }}
                      onDragOver={(e) => { if (dragId !== null && typeof tab.id === 'number') e.preventDefault(); }}
                      onDrop={(e) => { e.preventDefault(); if (dragId !== null && typeof tab.id === 'number') moveTo(dragId, tab.id); setDragId(null); }}
                      onDragEnd={() => setDragId(null)}
                      title={typeof tab.id === 'number' && tab.id !== 0 ? '끌어서 순서를 바꿀 수 있어요' : undefined}
                      className={`group/tile relative flex flex-col justify-center items-center h-[75px] px-2 text-xs sm:text-[13px] font-bold rounded-lg transition-all cursor-pointer ${dragId === tab.id ? 'opacity-40' : ''} ${activeTab === tab.id ? 'bg-white text-blue-700 shadow-md ring-2 ring-blue-500 z-10' : 'bg-white/60 text-gray-500 hover:bg-white ring-1 ring-gray-200/50'}`}
                  >
                      {WEB_LIMITED && typeof tab.id === 'number' && !WEB_PAGE_NUMS.includes(tab.id) && (
                          <span className="absolute top-1 left-1.5 text-[11px]" title="공실마케팅 앱에서 만들 수 있어요">🔒</span>
                      )}
                      {/* ◀ ▶ — 끌기가 불편할 때 (표지·전체는 없음) */}
                      {typeof tab.id === 'number' && tab.id !== 0 && (
                          <div className="absolute bottom-1 inset-x-1 justify-between hidden group-hover/tile:flex" onClick={(e) => e.stopPropagation()}>
                              <button type="button" onClick={() => step(tab.id as number, -1)} disabled={order.indexOf(tab.id) <= 1} title="앞으로" className="w-5 h-5 rounded bg-gray-100 hover:bg-blue-100 text-[10px] text-gray-600 disabled:opacity-30">◀</button>
                              <button type="button" onClick={() => step(tab.id as number, 1)} disabled={order.indexOf(tab.id) >= order.length - 1} title="뒤로" className="w-5 h-5 rounded bg-gray-100 hover:bg-blue-100 text-[10px] text-gray-600 disabled:opacity-30">▶</button>
                          </div>
                      )}
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
                                      setInfo({ ...info, visiblePages: e.target.checked ? [...order] : [] });
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
                          <h2 className="text-xl font-black text-black tracking-tight">{L(0)}</h2>
                      </div>
                      {activeTab === 0 && onAiAsk && aiPages?.includes(0) && <AiAsk onAsk={(r) => onAiAsk(0, r)} busy={aiBusy} />}
                      {PF(0, [])}
                      <div>
                          <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">표지 기본 정보</h4>
                          <div className="space-y-3">
                              <div>
                                  <div className="flex items-center justify-between">
                                      <label className="text-xs text-gray-500">QR 온라인 보고서 링크 (QR Code Link)</label>
                                      <button type="button" title="링크 복사"
                                          onClick={(e) => {
                                              const btn = e.currentTarget;
                                              navigator.clipboard.writeText(info.coverQRLink || "").then(() => {
                                                  btn.dataset.copied = "1";
                                                  setTimeout(() => { delete btn.dataset.copied; }, 1500);
                                              }).catch(() => alert("복사하지 못했습니다."));
                                          }}
                                          className="group flex items-center gap-1 px-2 py-0.5 rounded-md border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50 data-[copied]:text-green-600 data-[copied]:border-green-300">
                                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></svg>
                                          <span className="group-data-[copied]:hidden">링크 복사</span>
                                          <span className="hidden group-data-[copied]:inline">복사됨</span>
                                      </button>
                                  </div>
                                  <input type="text" name="coverQRLink" value={info.coverQRLink || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm placeholder-gray-400 font-mono" placeholder="https://..." />
                                  <label className="mt-2 flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                                      <input type="checkbox" checked={!info.hideCoverQR} onChange={(e) => setInfo({ ...info, hideCoverQR: !e.target.checked })} className="w-4 h-4" />
                                      QR코드 넣기 <span className="text-xs text-gray-400">(표지·개요)</span>
                                  </label>
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
                              📝 {L(0)} 수정하기
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
                              onClick={onSave}
                              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors shadow-sm text-sm"
                          >
                              저장하기
                          </button>
                      </div>
                  )}
              </div>
          )}

          {(activeTab === 1 || (activeTab === 'all' && (info.visiblePages || [0, 1, 2, 3, 4, 5, 6, 7]).includes(1))) && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'h-[620px] overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                      <div className="pb-2 border-b-[3px] border-black mb-4">
                          <h2 className="text-xl font-black text-black tracking-tight">{L(1)}</h2>
                      </div>
                      {activeTab === 1 && onAiAsk && aiPages?.includes(1) && <AiAsk onAsk={(r) => onAiAsk(1, r)} busy={aiBusy} />}
                      {PF(1, ['address', 'subTitle', 'priceMain', 'agentName', 'agentRepresentative', 'agentMobile'])}
                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">기본 타이틀</h4>
                      <div className="space-y-3">
                          <div><label className="text-xs text-gray-500">보고서 제목 (Address)</label><textarea name="address" value={fv('address')} onChange={handleChange} className="w-full border rounded p-2 text-sm resize-y" rows={2} /></div>
                          <div><label className="text-xs text-gray-500">서브 타이틀</label><textarea name="subTitle" value={fv('subTitle')} onChange={handleChange} className="w-full border rounded p-2 text-sm resize-y" rows={3} /></div>
                      </div>
                  </div>

                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">물건 개요 (표)</h4>
                      <div className="space-y-3">
                          {(() => {
                              const tbl = Array.isArray(info.overviewTable)
                                  ? info.overviewTable
                                  : (() => {
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
                                      <div className="flex gap-2 w-full mt-2">
                                          <button
                                              type="button"
                                              onClick={() => {
                                                  const newTable = [...tbl];
                                                  newTable.push({ label: '', value: '' });
                                                  setInfo({ ...info, overviewTable: newTable });
                                              }}
                                              className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition-colors border border-dashed border-blue-200"
                                          >
                                              + 개요 항목(행) 추가
                                          </button>
                                          <button
                                              type="button"
                                              onClick={() => {
                                                  if (window.confirm('기본 물건 개요 양식으로 초기화하시겠습니까? (기존에 수정한 표 내용이 삭제됩니다)')) {
                                                      const cat = detectPropertyCategory(info.propertyCategory);
                                                      const isSale = !info.transactionType || info.transactionType === '매매';
                                                      const template = getOverviewTemplate(cat, isSale);
                                                      const newTable = template.map(f => ({ label: f.label, value: '' }));
                                                      setInfo({ ...info, overviewTable: newTable });
                                                  }
                                              }}
                                              className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-xs font-bold transition-colors border border-dashed border-gray-200 shrink-0"
                                          >
                                              ↺ 표 초기화
                                          </button>
                                      </div>
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
                          <div><label className="text-xs text-gray-500">중개사무소명</label><input name="agentName" value={fv('agentName')} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
                          <div><label className="text-xs text-gray-500">등록번호</label><input name="agentRegistrationNumber" value={fv('agentRegistrationNumber')} onChange={handleChange} className="w-full border rounded p-2 text-sm" placeholder="제11680-2015-00123호" /></div>
                          <div><label className="text-xs text-gray-500">대표자명</label><input name="agencyRepresentative" value={fv('agencyRepresentative')} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
                          <div><label className="text-xs text-gray-500">담당자명/직급</label><input name="agentRepresentative" value={fv('agentRepresentative')} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
                          <div><label className="text-xs text-gray-500">대표 번호</label><input name="agentPhone" value={fv('agentPhone')} onChange={handleChange} className="w-full border rounded p-2 text-sm" placeholder="02-1234-5678" /></div>
                          <div><label className="text-xs text-gray-500">문의 휴대전화</label><input name="agentMobile" value={fv('agentMobile')} onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>
                          <div><label className="text-xs text-gray-500">사무소 주소</label><input name="agentAddress" value={fv('agentAddress')} onChange={handleChange} className="w-full border rounded p-2 text-sm" placeholder="서울시 강남구 논현동" /></div>
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
                              📝 {L(1)} 수정하기
                          </button>
                      </div>
                  )}
                  {activeTab !== 'all' && (
                      <div className="flex gap-2 justify-center mt-6 pt-6 border-t border-gray-100">
                          <button
                              type="button"
                              onClick={onSave}
                              className="flex-1 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-lg transition-colors text-sm"
                          >
                              뒤로가기
                          </button>
                          <button
                              type="button"
                              onClick={() => setActiveTab('all')}
                              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors shadow-sm text-sm"
                          >
                              저장하기
                          </button>
                      </div>
                  )}
              </div>
          )}

          {(activeTab === 2 || (activeTab === 'all' && (info.visiblePages || [1, 2, 3, 4, 5, 6]).includes(2))) && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'h-[620px] overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                      <div className="pb-2 border-b-[3px] border-black mb-4">
                          <h2 className="text-xl font-black text-black tracking-tight">{L(2)}</h2>
                      </div>
                      {activeTab === 2 && onAiAsk && aiPages?.includes(2) && <AiAsk onAsk={(r) => onAiAsk(2, r)} busy={aiBusy} />}
                      {PF(2, ['valuationText', 'chartAdviseText'])}


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
                              <textarea name="valuationText" value={fv('valuationText')} onChange={handleChange} className="w-full border rounded p-2 text-sm" rows={4} />
                          </div>
                          <div>
                              <label className="text-xs text-gray-500 font-bold">우측 텍스트 (그래프 하단)</label>
                              <textarea name="chartAdviseText" value={fv('chartAdviseText')} onChange={handleChange} className="w-full border rounded p-2 text-sm" rows={4} />
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
                              📝 {L(2)} 수정하기
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
                              onClick={onSave}
                              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors shadow-sm text-sm"
                          >
                              저장하기
                          </button>
                      </div>
                  )}
              </div>
          )}

          {(activeTab === 3 || (activeTab === 'all' && (info.visiblePages || [1, 2, 3, 4, 5, 6]).includes(3))) && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'h-[620px] overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                      <div className="pb-2 border-b-[3px] border-black mb-4">
                          <h2 className="text-xl font-black text-black tracking-tight">{L(3)}</h2>
                      </div>
                      {activeTab === 3 && onAiAsk && aiPages?.includes(3) && <AiAsk onAsk={(r) => onAiAsk(3, r)} busy={aiBusy} />}
                      {PF(3, ['leaseSummaryText', 'leaseSummaryDesc', 'leaseNotice'])}
                  <div>
                      <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">페이지 타이틀</h4>
                      <div className="space-y-3">
                          <div><label className="text-xs text-gray-500">표 하단 요약 (Total Summary)</label><input name="leaseSummaryText" value={fv('leaseSummaryText')} placeholder="요약 입력" onChange={handleChange} className="w-full border rounded p-2 text-sm" /></div>

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
                                  <textarea name="leaseSummaryDesc" value={fv('leaseSummaryDesc')} onChange={handleChange} className="w-full border rounded p-2 text-sm" rows={2} />
                              </div>
                          )}
                      </div>
                  </div>



                  <div className="mt-4">
                      <label className="text-xs text-gray-500 font-semibold">표 하단 유의 사항</label>
                      <textarea name="leaseNotice" value={fv('leaseNotice')} onChange={handleChange} className="w-full border rounded p-2 text-xs mt-1" rows={2} />
                  </div>
                  </div>
                  {activeTab === 'all' && (
                      <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-white via-white/90 to-transparent flex items-end justify-center pb-6 z-10 pointer-events-none">
                          <button
                              type="button"
                              onClick={() => setActiveTab(3)}
                              className="pointer-events-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-full shadow-lg flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                          >
                              📝 {L(3)} 수정하기
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
                              onClick={onSave}
                              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors shadow-sm text-sm"
                          >
                              저장하기
                          </button>
                      </div>
                  )}
              </div>
          )}

          {(activeTab === 4 || (activeTab === 'all' && (info.visiblePages || [1, 2, 3, 4, 5, 6]).includes(4))) && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'h-[620px] overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                      <div className="pb-2 border-b-[3px] border-black mb-4">
                          <h2 className="text-xl font-black text-black tracking-tight">{L(4)}</h2>
                      </div>
                      {activeTab === 4 && onAiAsk && aiPages?.includes(4) && <AiAsk onAsk={(r) => onAiAsk(4, r)} busy={aiBusy} />}
                      {PF(4, [])}
                  {/* 사진 쪽 1 — 예전 칸 그대로 */}
                  {photoPageCount(info) > 1 && <h4 className="font-bold text-gray-800 mb-2 text-sm">사진 쪽 1</h4>}
                  {renderImageUpload('mainImage', '메인 사진 (정면 외관)')}
                  <div className="grid grid-cols-2 gap-4">
                      {renderImageUpload('subImage1', '서브 사진 1')}
                      {renderImageUpload('subImage2', '서브 사진 2')}
                      {renderImageUpload('featureImage1', '서브 사진 3')}
                      {renderImageUpload('featureImage2', '서브 사진 4')}
                  </div>
                  {/* 사진 쪽 2~5 — 쪽마다 1~5장, 장수에 맞춰 배치는 자동 (2026-10-24 사장님) */}
                  {Array.from({ length: photoPageCount(info) - 1 }, (_, i) => i + 2).map((n) => (
                      <div key={n} className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                              <h4 className="font-bold text-gray-800 text-sm">사진 쪽 {n} <span className="text-xs font-normal text-gray-400">· 1~5장 (장수에 맞춰 배치)</span></h4>
                              {n === photoPageCount(info) && (
                                  <button type="button" onClick={() => {
                                      photoPageKeys(n).forEach((k) => uploadedImages[k] && onDeleteImage && onDeleteImage(k));
                                      setInfo({ ...info, photoPageCount: n - 1 } as any);
                                  }} className="text-red-500 hover:text-red-700 font-bold text-[11px] border-none bg-transparent cursor-pointer">이 쪽 빼기</button>
                              )}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              {photoPageKeys(n).map((k, i) => <React.Fragment key={k}>{renderImageUpload(k, `사진 ${i + 1}`)}</React.Fragment>)}
                          </div>
                      </div>
                  ))}
                  <div className="flex flex-wrap gap-2 mt-4">
                      {photoPageCount(info) < MAX_PHOTO_PAGES && (
                          <button type="button" onClick={() => setInfo({ ...info, photoPageCount: photoPageCount(info) + 1 } as any)}
                              className="flex-1 min-w-[140px] py-2.5 px-3 rounded-lg border-2 border-dashed border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-50">
                              + 사진 쪽 추가 ({photoPageCount(info)}/{MAX_PHOTO_PAGES})
                          </button>
                      )}
                      {onInsertCaptures && (
                          <button type="button" onClick={onInsertCaptures} disabled={Boolean(capturesBusy)}
                              title="공실뉴스에서 분석·캡처한 공실열람 검증·지도·로드뷰 사진을 빈 칸에 넣어요"
                              className="flex-1 min-w-[140px] py-2.5 px-3 rounded-lg text-white font-bold text-sm disabled:opacity-60" style={{ background: '#1a3a6b' }}>
                              {capturesBusy || '공실뉴스 캡처 사진 넣기'}
                          </button>
                      )}
                  </div>
                  </div>

                  {activeTab === 'all' && (
                      <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-white via-white/90 to-transparent flex items-end justify-center pb-6 z-10 pointer-events-none">
                          <button
                              type="button"
                              onClick={() => setActiveTab(4)}
                              className="pointer-events-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-full shadow-lg flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                          >
                              📝 {L(4)} 수정하기
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
                              onClick={onSave}
                              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors shadow-sm text-sm"
                          >
                              저장하기
                          </button>
                      </div>
                  )}
              </div>
          )}

          {(activeTab === 5 || (activeTab === 'all' && (info.visiblePages || [1, 2, 3, 4, 5, 6]).includes(5))) && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'h-[620px] overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                      <div className="pb-2 border-b-[3px] border-black mb-4">
                          <h2 className="text-xl font-black text-black tracking-tight">{L(5)}</h2>
                      </div>
                      {activeTab === 5 && onAiAsk && aiPages?.includes(5) && <AiAsk onAsk={(r) => onAiAsk(5, r)} busy={aiBusy} />}
                      {PF(5, ['areaTargetName', 'areaTargetDesc'])}
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
                          <div>
                              <label className="text-xs text-gray-500 font-bold block mb-1">📍 지도용 검색 주소 (기본 주소와 다를 경우만 입력)</label>
                              <input
                                  type="text"
                                  name="mapAddress"
                                  value={info.mapAddress || ""}
                                  onChange={handleChange}
                                  placeholder={info.address || "예: 서울시 강남구 역삼동 123"}
                                  className="w-full border rounded p-2 text-sm bg-white text-gray-800"
                              />
                              <button
                                  type="button"
                                  onClick={() => handleGeocodeAddress('page5')}
                                  className="w-full mt-1.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow transition-colors flex items-center justify-center gap-1 border-none cursor-pointer"
                              >
                                  🔍 입력한 주소로 재검색
                              </button>
                          </div>
                          <div><label className="text-xs text-gray-500">타겟 로케이션 (우측 상단 뱃지)</label><textarea name="areaTargetName" value={fv('areaTargetName')} onChange={handleChange} className="w-full border rounded p-2 text-sm" rows={2}/></div>
                          <div><label className="text-xs text-gray-500">입지 설명 텍스트</label><textarea name="areaTargetDesc" value={fv('areaTargetDesc')} onChange={handleChange} className="w-full border rounded p-2 text-sm" rows={4}/></div>
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
                              📝 {L(5)} 수정하기
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
                              onClick={onSave}
                              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors shadow-sm text-sm"
                          >
                              저장하기
                          </button>
                      </div>
                  )}
              </div>
          )}

          {(activeTab === 6 || (activeTab === 'all' && (info.visiblePages || [1, 2, 3, 4, 5, 6]).includes(6))) && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'h-[620px] overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6">
                      <div className="pb-2 border-b-[3px] border-black mb-4">
                          <h2 className="text-xl font-black text-black tracking-tight">{L(6)}</h2>
                      </div>
                      {activeTab === 6 && onAiAsk && aiPages?.includes(6) && <AiAsk onAsk={(r) => onAiAsk(6, r)} busy={aiBusy} />}
                      {PF(6, [])}
                  <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">개발 및 활용 로드맵 (시나리오)</h4>
                  {(() => {
                      // 보고서 6쪽과 같은 목록·같은 픽토그램 (예전엔 그림 문자 목록이라 보고서 아이콘과 달랐다, 2026-10-25 사장님)
                      const list = roadmapItems(info);
                      const tint = /^#[0-9a-f]{6}$/i.test(currentColor.primary || '') ? currentColor.primary : '#1a3a6b';

                      return (
                          <>
                              {list.map((item: any, idx: number) => (
                                  <div key={idx} className="mb-4 bg-gray-50 p-4 rounded-lg relative">
                                      <div className="flex items-center justify-between mb-2">
                                          <label className="text-xs font-bold text-gray-800">시나리오 {idx + 1}</label>
                                          <div className="flex items-center gap-2">
                                              <span className="text-[10px] text-gray-500 font-normal">아이콘:</span>
                                              <div className="relative">
                                                  <button type="button" title="아이콘 바꾸기" onClick={() => setRmPick(rmPick === idx ? -1 : idx)}
                                                      className="flex items-center gap-1.5 h-8 pl-1.5 pr-2 rounded-lg border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50">
                                                      <span style={{ color: tint }}><RoadmapIcon name={roadmapIconKey(item.icon, idx, item.title)} size={18} /></span>
                                                      {ROADMAP_ICONS[roadmapIconKey(item.icon, idx, item.title)]?.label}
                                                      <span className="text-gray-400">▾</span>
                                                  </button>
                                                  {rmPick === idx && (
                                                      <div className="absolute right-0 top-9 z-50 w-[264px] p-2 bg-white border border-gray-200 rounded-xl shadow-xl grid grid-cols-6 gap-1">
                                                          {Object.entries(ROADMAP_ICONS).map(([key, ic]) => (
                                                              <button key={key} type="button" title={ic.label}
                                                                  onClick={() => {
                                                                      setRmPick(-1);
                                                                      const newList = [...list];
                                                                      newList[idx] = { ...newList[idx], icon: key };
                                                                      setInfo({ ...info, roadmapList: newList });
                                                                  }}
                                                                  className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100"
                                                                  style={{ color: tint, outline: roadmapIconKey(item.icon, idx, item.title) === key ? `2px solid ${tint}` : 'none' }}>
                                                                  <RoadmapIcon name={key} size={20} />
                                                              </button>
                                                          ))}
                                                      </div>
                                                  )}
                                              </div>
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
                                          const newList = [...list, { title: '', text: '', icon: 'star', bg: 'bg-gray-50', border: 'border-gray-200' }];
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
                              📝 {L(6)} 수정하기
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
                              onClick={onSave}
                              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors shadow-sm text-sm"
                          >
                              저장하기
                          </button>
                      </div>
                  )}
              </div>
          )}

          {/* 8. 지적도 · 9. 건축물대장 — 한 번에 가져온다 (공부에 있는 실제 값만) */}
          {([8, 9, 10, 11].includes(activeTab as number) || (activeTab === 'all' && (info.visiblePages || []).some((p) => [8, 9, 10, 11].includes(p)))) && (() => {
              const land = (info as any).landInfo;
              const trade = (info as any).tradeInfo;
              const edits = Object.keys((info as any).publicEdits || {}).length;
              const hidden = Object.values((info as any).publicHidden || {}).filter(Boolean).length;
              const b = land?.buildings?.[0];
              const target = land?.parcels?.find((p: any) => p.pnu === land.pnu);
              const row = (ok: boolean, page: string, text: string, warn = '') => (
                  <div className="flex gap-2"><span className={ok ? 'text-green-600' : 'text-amber-500'}>{ok ? '✓' : '·'}</span><b className="shrink-0 w-[92px]">{page}</b><span className={ok ? 'text-gray-700' : 'text-amber-600'}>{ok ? text : warn || '없음'}</span></div>
              );
              return (
                  <div className="animate-fadeIn space-y-4 mb-8">
                      <div className="pb-2 border-b-[3px] border-black">
                          <h2 className="text-lg font-black text-black tracking-tight">지적도 · 건축물대장 · 층별 현황 · 실거래 이력</h2>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed"><b>2쪽 주변시세 그래프</b>와 로드맵 뒤 <b>8~11쪽</b>을 이 매물에 맞게 채워요. 보고서를 처음 열 때 저절로 채우고, 30일이 지나면 [AI로 채우기] 때 새로 채워요. 채운 내용은 쪽에서 눌러 고칠 수 있어요.</p>
                      {onFetchLand && (
                          <button type="button" onClick={onFetchLand} disabled={Boolean(landBusy)}
                              className="w-full py-3 rounded-lg text-white font-bold text-sm disabled:opacity-60" style={{ background: '#1a3a6b' }}>
                              {landBusy || (land ? '지적도·대장·층별·실거래 새로 채우기' : '지적도·대장·층별·실거래 채우기')}
                          </button>
                      )}
                      {land && (
                          <div className="text-xs leading-relaxed rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-1">
                              {trade && row(!!trade.chart?.points?.length, '2쪽 주변시세', `${trade.chart.scope} ${trade.kindLabel} ${trade.rentChart ? '전세' : '매매'} · ${trade.chart.points?.length}구간`, '거래가 적어 그래프 없음')}
                              {row(!!land.parcels?.length, '8쪽 지적도', `필지 ${land.parcels?.length}개${target ? ` · ${target.jibun}` : ''}`, land.cadastralError)}
                              {row(!!b, '9쪽 건축물대장', b ? [b.purpose, b.totArea && `연면적 ${b.totArea}㎡`, b.useAprDay && `${String(b.useAprDay).slice(0, 4)} 사용승인`].filter(Boolean).join(' · ') : '', land.buildingError)}
                              {trade && row(!!trade.floors?.length, '10쪽 층별 현황', `${trade.floors?.length}개 층${trade.permits?.length ? ` · 인허가 ${trade.permits.length}건` : ''}`)}
                              {trade && row(!!(trade.history?.length || trade.examples?.length), '11쪽 실거래', `이 건물 ${trade.history?.length || 0}건 · 비슷한 거래 ${trade.examples?.length || 0}건`)}
                              {trade?.errors?.length > 0 && <div className="text-amber-600 pt-1">일부 내용을 채우지 못했어요. 잠시 뒤 [새로 채우기]를 눌러 주세요.</div>}
                          </div>
                      )}
                      {[8, 9, 10, 11].filter((p) => activeTab === p || (activeTab === 'all' && (info.visiblePages || []).includes(p))).map((p) => (
                          <React.Fragment key={p}>{PF(p, [], L(p))}</React.Fragment>
                      ))}
                      {(edits > 0 || hidden > 0) && (
                          <div className="flex flex-wrap gap-2 text-xs">
                              {edits > 0 && <button type="button" onClick={() => window.confirm(`고친 칸 ${edits}개를 받은 값으로 되돌릴까요?`) && setInfo({ ...info, publicEdits: {} } as any)} className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white font-bold text-gray-700">고친 칸 {edits}개 되돌리기</button>}
                              {hidden > 0 && <button type="button" onClick={() => setInfo({ ...info, publicHidden: {} } as any)} className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white font-bold text-gray-700">숨긴 줄 {hidden}개 되살리기</button>}
                          </div>
                      )}
                  </div>
              );
          })()}

          {/* 12. 인테리어 전후 · 13. 리모델링 전후 — 여기서 바로 AI시뮬레이션 */}
          {onSimRun && onSimUse && ([['interior', 12], ['remodel', 13]] as [SimKind, number][]).filter(([, id]) => activeTab === id || (activeTab === 'all' && (info.visiblePages || []).includes(id))).map(([kind, id]) => (
              <SimPanel key={kind} kind={kind} title={L(id)} busy={simBusy || ''}
                  vacancyId={new URLSearchParams(window.location.search).get('vacancy_id') || ''}
                  usedSimId={(info as any).simInfo?.[kind]?.simId}
                  areaHint={(info as any).landInfo?.unit?.exclusive ?? null}
                  onRun={onSimRun} onUse={onSimUse} />
          ))}
          {([12, 13] as const).filter((id) => activeTab === id).map((id) => <div key={id} className="mb-8">{PF(id, [], `${L(id)} 글`)}</div>)}

          {(activeTab === 7 || (activeTab === 'all' && (info.visiblePages || [0, 1, 2, 3, 4, 5, 6, 7]).includes(7))) && (
              <div className={`animate-fadeIn relative ${activeTab === 'all' ? 'h-[620px] overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8 shrink-0' : 'space-y-6'}`}>
                  <div className="space-y-6 animate-fadeIn">
                      <div className="pb-2 border-b-[3px] border-black mb-4">
                          <h2 className="text-xl font-black text-black tracking-tight">{L(7)}</h2>
                      </div>
                      {activeTab === 7 && onAiAsk && aiPages?.includes(7) && <AiAsk onAsk={(r) => onAiAsk(7, r)} busy={aiBusy} />}
                      {PF(7, ['agentName', 'agentRepresentative', 'agentMobile', 'agentPhone'])}
                      <div>
                          <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">담당자 및 부동산 정보</h4>
                          <div className="space-y-3">
                              <div>
                                  <label className="text-xs text-gray-500">중개사무소명 (Agency Name)</label>
                                  <input type="text" name="agentName" value={fv('agentName')} onChange={handleChange} className="w-full border rounded p-2 text-sm font-semibold" />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500">담당자 성명 및 직책 (Representative)</label>
                                  <input type="text" name="agentRepresentative" value={fv('agentRepresentative')} onChange={handleChange} className="w-full border rounded p-2 text-sm" />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500">담당자 휴대폰 번호 (Mobile)</label>
                                  <input type="text" name="agentMobile" value={fv('agentMobile')} onChange={handleChange} className="w-full border rounded p-2 text-sm" />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500">대표 유선 번호 (Phone)</label>
                                  <input type="text" name="agentPhone" value={fv('agentPhone')} onChange={handleChange} className="w-full border rounded p-2 text-sm" />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500 font-bold block mb-1">📍 사무소 지도용 검색 주소 (기본 주소와 다를 경우만 입력)</label>
                                  <input
                                      type="text"
                                      name="agentMapAddress"
                                      value={info.agentMapAddress || ""}
                                      onChange={handleChange}
                                      placeholder={info.agentAddress || "예: 서울시 서초구 서초동 456"}
                                      className="w-full border rounded p-2 text-sm bg-white text-gray-800"
                                  />
                                  <button
                                      type="button"
                                      onClick={() => handleGeocodeAddress('page7')}
                                      className="w-full mt-1.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow transition-colors flex items-center justify-center gap-1 border-none cursor-pointer"
                                  >
                                      🔍 입력한 주소로 재검색
                              </button>
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
                              📝 {L(7)} 수정하기
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
                              onClick={onSave}
                              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors shadow-sm text-sm"
                          >
                              저장하기
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