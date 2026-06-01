import React, { forwardRef } from 'react';
import { FlyerState } from '../types';

interface FlyerCanvasProps {
  data: FlyerState;
  activeTab?: number | 'all';
  onUpdateInfo?: (info: any) => void;
  onImageUpload?: (key: string, file: File) => Promise<string | undefined>;
  isUploadingImage?: Record<string, boolean>;
}

// ─── NOTION & CANVA STYLE INLINE EDITORS ──────────────────────────────────────

const EditableText = ({
  value,
  onChange,
  className = "",
  placeholder = "텍스트 입력..."
}: {
  value: string;
  onChange: (text: string) => void;
  className?: string;
  placeholder?: string;
}) => {
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    if (ref.current && ref.current.textContent !== value) {
      ref.current.textContent = value || "";
    }
  }, [value]);

  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={`outline-none hover:bg-amber-100/50 hover:ring-1 hover:ring-amber-300 focus:bg-amber-100/80 focus:ring-1 focus:ring-amber-500 rounded px-1 transition-all duration-150 cursor-text min-w-[30px] inline-block ${className}`}
      onBlur={(e) => {
        onChange(e.currentTarget.textContent || "");
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      placeholder={placeholder}
    />
  );
};

const EditableBlock = ({
  value,
  onChange,
  className = "",
  placeholder = "텍스트 입력..."
}: {
  value: string;
  onChange: (text: string) => void;
  className?: string;
  placeholder?: string;
}) => {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (ref.current && ref.current.textContent !== value) {
      ref.current.textContent = value || "";
    }
  }, [value]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={`outline-none hover:bg-amber-100/50 hover:ring-1 hover:ring-amber-300 focus:bg-amber-100/80 focus:ring-1 focus:ring-amber-500 rounded p-1 transition-all duration-150 cursor-text whitespace-pre-wrap ${className}`}
      onBlur={(e) => {
        onChange(e.currentTarget.textContent || "");
      }}
      placeholder={placeholder}
    />
  );
};

// ─── PREMIUM DIRECT IMAGE UPLOADER OVERLAY ────────────────────────────────────

const EditableImage = ({
  src,
  alt,
  className = "",
  imageKey,
  onImageUpload,
  isUploading = false,
  aspectRatioClass = "object-contain"
}: {
  src: string;
  alt: string;
  className?: string;
  imageKey: string;
  onImageUpload?: (key: string, file: File) => Promise<string | undefined>;
  isUploading?: boolean;
  aspectRatioClass?: "object-contain" | "object-cover";
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const placeholder = "https://placehold.co/800x600/e2e8f0/1e293b?text=Image";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageUpload) {
      await onImageUpload(imageKey, file);
    }
  };

  return (
    <div className={`group relative w-full h-full bg-[#0f172a]/95 rounded-2xl overflow-hidden shadow-md border border-gray-100 ${className}`}>
      {/* Hidden file input */}
      {onImageUpload && (
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
      )}

      {/* Double layer for portrait background blur */}
      {aspectRatioClass === "object-contain" ? (
        <>
          <img 
            src={src || placeholder} 
            alt={`${alt} Blur`} 
            className="absolute inset-0 w-full h-full object-cover filter blur-2xl opacity-50 scale-110 pointer-events-none" 
          />
          <img 
            src={src || placeholder} 
            alt={alt} 
            className="relative w-full h-full object-contain z-10" 
          />
        </>
      ) : (
        <img 
          src={src || placeholder} 
          alt={alt} 
          className="w-full h-full object-cover" 
        />
      )}

      {/* Hover overlay with direct upload action (print:hidden) */}
      {onImageUpload && (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center cursor-pointer z-20 print:hidden text-white gap-2"
        >
          <div className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-extrabold px-3.5 py-2 rounded-xl shadow-lg text-xs flex items-center gap-1.5 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
            <span>사진 업로드 / 변경</span>
          </div>
        </div>
      )}

      {/* Loading indicator (print:hidden) */}
      {isUploading && (
        <div className="absolute inset-0 bg-slate-900/80 z-[25] flex flex-col items-center justify-center print:hidden">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500 mb-2"></div>
          <span className="text-[10px] text-amber-500 font-bold">WebP 최적화 업로드 중...</span>
        </div>
      )}
    </div>
  );
};

// ─── REPORT PAGE WRAPPER ──────────────────────────────────────────────────────

const ReportPage = ({ 
    children, 
    pageNumber, 
    title, 
    subtitle, 
    badgeText,
    exportId,
    onUpdateTitle,
    onUpdateSubtitle,
    onUpdateBadge
}: { 
    children: React.ReactNode, 
    pageNumber: number, 
    title: string, 
    subtitle: string, 
    badgeText?: string,
    exportId?: string,
    onUpdateTitle?: (text: string) => void,
    onUpdateSubtitle?: (text: string) => void,
    onUpdateBadge?: (text: string) => void
}) => {
    return (
        <div data-export-id={exportId} className="relative bg-white w-[1122px] h-[794px] overflow-hidden flex flex-col shadow-2xl mb-8" style={{ pageBreakAfter: 'always' }}>
            {/* Header */}
            <div className="h-[120px] bg-[#0d1424] text-white px-10 py-6 flex justify-between items-end shrink-0">
                <div>
                    <h1 className="text-3xl font-extrabold mb-1 tracking-tight">
                        {onUpdateTitle ? (
                            <EditableText 
                              value={title} 
                              onChange={onUpdateTitle} 
                              className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-white" 
                            />
                        ) : title}
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-400 text-sm">
                            {onUpdateSubtitle ? (
                                <EditableText 
                                  value={subtitle} 
                                  onChange={onUpdateSubtitle} 
                                  className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-gray-300" 
                                />
                            ) : subtitle}
                        </span>
                    </div>
                </div>
                {badgeText && (
                    <div className="flex items-center gap-4 h-full pb-2">
                        <div className="w-px h-8 bg-gray-600"></div>
                        <span className={`text-2xl font-black tracking-widest ${pageNumber === 1 ? 'text-[#e29d45]' : 'text-white'}`}>
                            {onUpdateBadge ? (
                                <EditableText 
                                  value={badgeText} 
                                  onChange={onUpdateBadge} 
                                  className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50" 
                                />
                            ) : badgeText}
                        </span>
                    </div>
                )}
            </div>

            {/* Content Body */}
            <div className="flex-1 p-10 relative">
                {children}
            </div>

            {/* Footer */}
            <div className="h-[50px] px-10 flex justify-between items-center shrink-0 border-t border-gray-100">
                <div className="text-gray-400 text-xs font-bold tracking-widest">
                    CONFIDENTIAL <span className="mx-1">|</span> INFORMATION MEMORANDUM
                </div>
                <div className="text-gray-400 text-xs font-bold tracking-widest">
                    PAGE 0{pageNumber} / 05
                </div>
            </div>
        </div>
    );
};

const SectionTitle = ({ 
  title, 
  subtitle,
  onUpdateTitle,
  onUpdateSubtitle
}: { 
  title: string, 
  subtitle: string,
  onUpdateTitle?: (val: string) => void,
  onUpdateSubtitle?: (val: string) => void
}) => (
    <div className="mb-4 flex items-center gap-2">
        <h3 className="text-gray-500 font-bold tracking-widest uppercase text-sm">
            {onUpdateTitle ? (
                <EditableText 
                    value={title} 
                    onChange={onUpdateTitle} 
                    className="hover:bg-slate-100 hover:ring-1 hover:ring-slate-300 focus:bg-slate-200 focus:ring-slate-400 text-gray-600 rounded px-1 transition-all"
                />
            ) : title}
        </h3>
        <span className="text-gray-300">|</span>
        <span className="text-gray-800 font-bold text-sm">
            {onUpdateSubtitle ? (
                <EditableText 
                    value={subtitle} 
                    onChange={onUpdateSubtitle} 
                    className="hover:bg-slate-100 hover:ring-1 hover:ring-slate-300 focus:bg-slate-200 focus:ring-slate-400 text-gray-800 rounded px-1 transition-all"
                />
            ) : subtitle}
        </span>
    </div>
);

// ─── GEDITOR STYLE PREMIUM FLOATING TOOLBAR WRAPPER ────────────────────────────

const GeditorWrapper = ({
  children,
  onMoveUp,
  onMoveDown,
  onDelete,
  onDuplicate,
  isFirst = false,
  isLast = false,
  className = "",
  tag = "div"
}: {
  children: React.ReactNode;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  className?: string;
  tag?: "div" | "tr" | "li";
}) => {
  const Component = tag;
  return (
    <Component className={className}>
      {children}
    </Component>
  );
};

// ─── MAIN CANVAS COMPONENT ────────────────────────────────────────────────────

const FlyerCanvas = forwardRef<HTMLDivElement, FlyerCanvasProps>(({ data, activeTab = 'all', onUpdateInfo, onImageUpload, isUploadingImage }, ref) => {
  const { info, mainImage, subImage1, subImage2, featureImage1, featureImage2 } = data; 
  const placeholder = "https://placehold.co/800x600/e2e8f0/1e293b?text=Image";

  // Data mapping from info
  const targetTitle = info.address || '서초동 역세권 매매 안내서';
  const price = info.priceMain || '75억 원';

  const handleTextChange = (key: string, value: string) => {
    if (onUpdateInfo) {
      onUpdateInfo({
        ...info,
        [key]: value
      });
    }
  };

  const updateFloorStatusRow = (index: number, field: string, value: string) => {
    if (onUpdateInfo && info.floorStatus) {
      const newFloorStatus = [...info.floorStatus];
      newFloorStatus[index] = {
        ...newFloorStatus[index],
        [field]: value
      };
      onUpdateInfo({
        ...info,
        floorStatus: newFloorStatus
      });
    }
  };

  // --- OVERVIEW TABLE DYNAMIC ACTIONS (WYSIWYG CANVAS) ---
  const addOverviewTableRow = () => {
    if (onUpdateInfo && Array.isArray(info.overviewTable)) {
      onUpdateInfo({
        ...info,
        overviewTable: [
          ...info.overviewTable,
          { label: '새 항목', value: '내용 입력' }
        ]
      });
    }
  };

  const deleteOverviewTableRow = (index: number) => {
    if (onUpdateInfo && Array.isArray(info.overviewTable)) {
      const newTable = info.overviewTable.filter((_, i) => i !== index);
      onUpdateInfo({
        ...info,
        overviewTable: newTable
      });
    }
  };

  const moveOverviewTableRow = (index: number, direction: 'up' | 'down') => {
    if (onUpdateInfo && Array.isArray(info.overviewTable)) {
      const newTable = [...info.overviewTable];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex >= 0 && targetIndex < newTable.length) {
        const temp = newTable[index];
        newTable[index] = newTable[targetIndex];
        newTable[targetIndex] = temp;
        onUpdateInfo({
          ...info,
          overviewTable: newTable
        });
      }
    }
  };

  // --- FLOOR STATUS TABLE DYNAMIC ACTIONS (WYSIWYG CANVAS) ---
  const addFloorStatusRow = () => {
    if (onUpdateInfo && Array.isArray(info.floorStatus)) {
      onUpdateInfo({
        ...info,
        floorStatus: [
          ...info.floorStatus,
          { floor: '새 층', purpose: '용도', lease: '임대차', status: '점유상태', note: '비고' }
        ]
      });
    }
  };

  const deleteFloorStatusRow = (index: number) => {
    if (onUpdateInfo && Array.isArray(info.floorStatus)) {
      const newStatus = info.floorStatus.filter((_, i) => i !== index);
      onUpdateInfo({
        ...info,
        floorStatus: newStatus
      });
    }
  };

  const moveFloorStatusRow = (index: number, direction: 'up' | 'down') => {
    if (onUpdateInfo && Array.isArray(info.floorStatus)) {
      const newStatus = [...info.floorStatus];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex >= 0 && targetIndex < newStatus.length) {
        const temp = newStatus[index];
        newStatus[index] = newStatus[targetIndex];
        newStatus[targetIndex] = temp;
        onUpdateInfo({
          ...info,
          floorStatus: newStatus
        });
      }
    }
  };

  // --- HIGHLIGHTS DYNAMIC ACTIONS (WYSIWYG CANVAS) ---
  const addHighlightRow = () => {
    if (onUpdateInfo && Array.isArray(info.highlights)) {
      onUpdateInfo({
        ...info,
        highlights: [...info.highlights, '새로운 하이라이트 핵심 문구를 입력하세요.']
      });
    }
  };

  const deleteHighlightRow = (index: number) => {
    if (onUpdateInfo && Array.isArray(info.highlights)) {
      const newHl = info.highlights.filter((_, i) => i !== index);
      onUpdateInfo({
        ...info,
        highlights: newHl
      });
    }
  };

  const moveHighlightRow = (index: number, direction: 'up' | 'down') => {
    if (onUpdateInfo && Array.isArray(info.highlights)) {
      const newHl = [...info.highlights];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex >= 0 && targetIndex < newHl.length) {
        const temp = newHl[index];
        newHl[index] = newHl[targetIndex];
        newHl[targetIndex] = temp;
        onUpdateInfo({
          ...info,
          highlights: newHl
        });
      }
    }
  };

  return (
    <div className="flex flex-col items-center p-8 bg-gray-100" ref={ref}>
        {/* PAGE 1: OVERVIEW */}
        {(activeTab === 'all' || activeTab === 1) && (
        <ReportPage 
            pageNumber={1} 
            title={targetTitle} 
            subtitle={info.subTitle} 
            badgeText={info.pageBadges?.page1 || "FOR SALE"}
            exportId="page-1"
            onUpdateTitle={(val) => handleTextChange('address', val)}
            onUpdateSubtitle={(val) => handleTextChange('subTitle', val)}
            onUpdateBadge={(val) => {
                if (onUpdateInfo) {
                    onUpdateInfo({
                        ...info,
                        pageBadges: { ...(info.pageBadges || {}), page1: val }
                    });
                }
            }}
        >
            <div className="flex gap-8 h-full">
                {/* Left Col: Overview Table */}
                <div className="w-5/12 flex flex-col justify-between">
                    <div>
                        <SectionTitle 
                            title={info.overviewTitle || "PROPERTY OVERVIEW"} 
                            subtitle={info.overviewSubtitle || "물건개요"} 
                            onUpdateTitle={(val) => {
                                if (onUpdateInfo) {
                                    onUpdateInfo({
                                        ...info,
                                        overviewTitle: val
                                    });
                                }
                            }}
                            onUpdateSubtitle={(val) => {
                                if (onUpdateInfo) {
                                    onUpdateInfo({
                                        ...info,
                                        overviewSubtitle: val
                                    });
                                }
                            }}
                        />
                        <div className="border-t-[3px] border-gray-800 flex flex-col text-sm border-b border-gray-200">
                            {(() => {
                                const rows = Array.isArray(info.overviewTable) 
                                    ? info.overviewTable.map(r => ({ k: r.label, v: r.value }))
                                    : [
                                        { k: '소재지', v: info.overviewTable?.location },
                                        { k: '용도지역', v: info.overviewTable?.zoning },
                                        { k: '대지면적', v: info.overviewTable?.landArea },
                                        { k: '연면적', v: info.overviewTable?.totalArea },
                                        { k: '건물규모', v: info.overviewTable?.buildingScale },
                                        { k: '주용도', v: info.overviewTable?.mainPurpose },
                                        { k: '주차대수', v: info.overviewTable?.parking },
                                        { k: '승강기', v: info.overviewTable?.elevator },
                                        { k: '준공연도', v: info.overviewTable?.completionYear },
                                    ];
                                    
                                if (Array.isArray(info.overviewTable)) {
                                    return (
                                        <>
                                            {info.overviewTable.map((row, i) => (
                                                <GeditorWrapper
                                                    key={i}
                                                    onMoveUp={() => moveOverviewTableRow(i, 'up')}
                                                    onMoveDown={() => moveOverviewTableRow(i, 'down')}
                                                    onDelete={() => deleteOverviewTableRow(i)}
                                                    onDuplicate={addOverviewTableRow}
                                                    isFirst={i === 0}
                                                    isLast={i === info.overviewTable.length - 1}
                                                    className="border-b border-gray-100 last:border-0 bg-white"
                                                >
                                                    <div className="flex w-full">
                                                        <div className="w-1/3 text-gray-500 font-bold py-3 pl-4 flex items-center">
                                                            <EditableText 
                                                                value={row.label} 
                                                                onChange={(val) => {
                                                                    const newTable = [...info.overviewTable];
                                                                    newTable[i] = { ...newTable[i], label: val };
                                                                    handleTextChange('overviewTable', newTable as any);
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="w-2/3 text-gray-800 font-bold py-3 pl-4 flex items-center">
                                                            <EditableText 
                                                                value={row.value} 
                                                                onChange={(val) => {
                                                                    const newTable = [...info.overviewTable];
                                                                    newTable[i] = { ...newTable[i], value: val };
                                                                    handleTextChange('overviewTable', newTable as any);
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </GeditorWrapper>
                                            ))}
                                            
                                            {/* Add Row Button on Canvas (print:hidden) */}
                                            <button 
                                                onClick={addOverviewTableRow}
                                                className="print:hidden w-full py-2 bg-slate-50 hover:bg-slate-100 border-b border-dashed border-gray-200 text-gray-500 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                                </svg>
                                                <span>개요 항목(행) 추가</span>
                                            </button>
                                        </>
                                    );
                                }
                                
                                return rows.filter(row => row.v && row.v.trim() !== '').map((row, i) => (
                                    <div key={i} className="flex border-b border-gray-100 last:border-0 bg-white">
                                        <div className="w-1/3 text-gray-500 font-bold py-3 pl-4 flex items-center">{row.k}</div>
                                        <div className="w-2/3 text-gray-800 font-bold py-3 pl-4 flex items-center">{row.v}</div>
                                    </div>
                                ));
                            })()}
                            
                            {/* Price Row */}
                            {(() => {
                                const tType = info.transactionType || "매매";
                                let label = "매매가";
                                
                                if (tType === "전세") {
                                    label = "보증금 (전세)";
                                } else if (tType === "월세" || tType === "임대") {
                                    label = "보증금 / 월세";
                                } else if (tType !== "매매") {
                                    label = "임대가";
                                }
                                
                                return (
                                    <div className="flex bg-[#fff9f0] border-t border-gray-200 group relative">
                                        {/* Direct Transaction Type Switcher: print:hidden */}
                                        <div className="absolute -left-20 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 print:hidden bg-white/95 shadow-md border border-gray-200 rounded-md p-1.5 z-30">
                                            <span className="text-[10px] text-gray-400 font-bold text-center border-b pb-0.5 mb-0.5">거래 형태</span>
                                            {["매매", "전세", "월세"].map((type) => (
                                                <button
                                                    key={type}
                                                    onClick={() => handleTextChange('transactionType', type)}
                                                    className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold transition-colors ${tType === type ? 'bg-[#cc5a27] text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
 
                                        <div className="w-1/3 text-gray-600 font-bold py-3 pl-4 flex items-center">{label}</div>
                                        <div className="w-2/3 text-[#cc5a27] font-extrabold py-3 pl-4 flex items-center">
                                            {tType === "월세" || tType === "임대" ? (
                                                <div className="flex items-center gap-1">
                                                    <EditableText value={price} onChange={(val) => handleTextChange('priceMain', val)} />
                                                    <span>/</span>
                                                    <EditableText value={info.priceSub || ''} onChange={(val) => handleTextChange('priceSub', val)} placeholder="월세" />
                                                </div>
                                            ) : (
                                                <EditableText value={price} onChange={(val) => handleTextChange('priceMain', val)} />
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
 
                    {/* Agent Footer Details */}
                    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 mt-4 flex flex-col justify-center shadow-sm">
                        <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1.5 text-sm">
                            <span className="text-gray-500 font-bold">부동산명</span>
                            <span className="text-gray-800 font-extrabold">
                                <EditableText value={info.agentName} onChange={(val) => handleTextChange('agentName', val)} />
                            </span>
 
                            <span className="text-gray-500 font-bold">담당자</span>
                            <span className="text-gray-800 font-extrabold">
                                <EditableText value={info.agentRepresentative} onChange={(val) => handleTextChange('agentRepresentative', val)} />
                            </span>
 
                            <span className="text-gray-500 font-bold">연락처</span>
                            <span className="text-[#cc5a27] font-black text-base">
                                <EditableText value={info.agentMobile || info.agentPhone || ""} onChange={(val) => handleTextChange('agentMobile', val)} />
                            </span>
                        </div>
                    </div>
                </div>
 
                {/* Right Col: Image & Summary */}
                <div className="w-7/12 flex flex-col justify-between h-full">
                    <div className="h-[340px]">
                        <EditableImage 
                            src={mainImage || ""} 
                            alt="Main Image" 
                            imageKey="mainImage"
                            onImageUpload={onImageUpload}
                            isUploading={isUploadingImage?.mainImage}
                            aspectRatioClass="object-contain"
                        />
                    </div>
                    <div>
                        <SectionTitle 
                            title={info.investmentTitle || "INVESTMENT SUMMARY"} 
                            subtitle={info.investmentSubtitle || "투자요약"} 
                            onUpdateTitle={(val) => {
                                if (onUpdateInfo) {
                                    onUpdateInfo({
                                        ...info,
                                        investmentTitle: val
                                    });
                                }
                            }}
                            onUpdateSubtitle={(val) => {
                                if (onUpdateInfo) {
                                    onUpdateInfo({
                                        ...info,
                                        investmentSubtitle: val
                                    });
                                }
                            }}
                        />
                        <div className="flex gap-4 border-l-4 border-[#cc5a27] pl-4">
                            {[1,2,3].map(i => (
                                <div key={i} className="flex-1 bg-white border border-gray-100 rounded-lg p-4 text-center shadow-sm">
                                    <div className="text-xs text-gray-400 font-bold tracking-widest mb-2 uppercase">
                                        <EditableText 
                                            value={(info.investmentSummary as any)?.[`box${i}Title`] || ""} 
                                            onChange={(val) => {
                                                if (onUpdateInfo) {
                                                    onUpdateInfo({
                                                        ...info,
                                                        investmentSummary: {
                                                            ...info.investmentSummary,
                                                            [`box${i}Title`]: val
                                                        }
                                                    });
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="font-extrabold text-gray-800 text-lg leading-tight whitespace-pre-wrap">
                                        <EditableBlock 
                                            value={(info.investmentSummary as any)?.[`box${i}Text`] || ""} 
                                            onChange={(val) => {
                                                if (onUpdateInfo) {
                                                    onUpdateInfo({
                                                        ...info,
                                                        investmentSummary: {
                                                            ...info.investmentSummary,
                                                            [`box${i}Text`]: val
                                                        }
                                                    });
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </ReportPage>
        )}
 
        {/* PAGE 2: STATUS & VALUATION */}
        {(activeTab === 'all' || activeTab === 2) && (
        <ReportPage 
            pageNumber={2} 
            title="현황 및 가치" 
            subtitle="Status & Valuation" 
            badgeText={info.pageBadges?.page2 || "EVIDENCE & DATA"}
            exportId="page-2"
            onUpdateBadge={(val) => {
                if (onUpdateInfo) {
                    onUpdateInfo({
                        ...info,
                        pageBadges: { ...(info.pageBadges || {}), page2: val }
                    });
                }
            }}
        >
            <div className="flex gap-8 h-full">
                {/* Left: Table */}
                <div className="w-5/12 h-full flex flex-col">
                    <div className="text-gray-600 font-bold text-sm mb-4">1. 층별 점유 및 임대 상세 현황</div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-[#f8fafc] flex flex-col h-[500px]">
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-center text-sm">
                                <thead className="bg-white border-b border-gray-200 sticky top-0 z-10">
                                    <tr>
                                        <th className="py-4 font-bold text-gray-600">층수</th>
                                        <th className="py-4 font-bold text-gray-600">현용도</th>
                                        <th className="py-4 font-bold text-gray-600">임대차</th>
                                        <th className="py-4 font-bold text-gray-600">점유 상태</th>
                                        <th className="py-4 font-bold text-gray-600">비고</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {info.floorStatus?.map((row, i) => (
                                        <GeditorWrapper
                                            key={i}
                                            tag="tr"
                                            onMoveUp={() => moveFloorStatusRow(i, 'up')}
                                            onMoveDown={() => moveFloorStatusRow(i, 'down')}
                                            onDelete={() => deleteFloorStatusRow(i)}
                                            onDuplicate={addFloorStatusRow}
                                            isFirst={i === 0}
                                            isLast={i === info.floorStatus.length - 1}
                                            className="group"
                                        >
                                            <td className={`py-4 relative ${row.floor === 'B1' || row.floor.includes('지하') ? 'font-bold' : ''}`}>
                                                <EditableText value={row.floor} onChange={(val) => updateFloorStatusRow(i, 'floor', val)} />
                                            </td>
                                            <td className={row.floor === 'B1' || row.floor.includes('지하') ? 'font-bold' : ''}>
                                                <EditableText value={row.purpose} onChange={(val) => updateFloorStatusRow(i, 'purpose', val)} />
                                            </td>
                                            {i === 0 && info.floorStatus[0].lease === '보증금 / 차임 내역 별도문의' ? (
                                                 <>
                                                    <td rowSpan={info.floorStatus.length} className="text-[#cc5a27] font-bold text-xs writing-vertical-lr tracking-widest border-x border-dashed border-[#cc5a27]/30 bg-[#fff9f0]">
                                                        <EditableText value={row.lease} onChange={(val) => updateFloorStatusRow(i, 'lease', val)} />
                                                    </td>
                                                    <td className="font-bold">
                                                        <EditableText value={row.status} onChange={(val) => updateFloorStatusRow(i, 'status', val)} />
                                                    </td>
                                                    <td className="text-gray-500">
                                                        <EditableText value={row.note} onChange={(val) => updateFloorStatusRow(i, 'note', val)} />
                                                    </td>
                                                 </>
                                            ) : (
                                                 info.floorStatus[0].lease === '보증금 / 차임 내역 별도문의' ? (
                                                     <>
                                                         <td className={row.status.includes('현재 공실') ? 'text-[#cc5a27] font-bold' : 'font-bold'}>
                                                             <EditableText value={row.status} onChange={(val) => updateFloorStatusRow(i, 'status', val)} />
                                                         </td>
                                                         <td className={row.note.includes('즉시 활용') ? 'font-bold text-gray-800' : 'text-gray-500'}>
                                                             <EditableText value={row.note} onChange={(val) => updateFloorStatusRow(i, 'note', val)} />
                                                         </td>
                                                     </>
                                                   ) : (
                                                     <>
                                                         <td className={row.lease.includes('공실') ? 'text-[#cc5a27] font-bold' : 'font-bold'}>
                                                             <EditableText value={row.lease} onChange={(val) => updateFloorStatusRow(i, 'lease', val)} />
                                                         </td>
                                                         <td className={row.status.includes('공실') ? 'text-[#cc5a27] font-bold' : 'font-bold'}>
                                                             <EditableText value={row.status} onChange={(val) => updateFloorStatusRow(i, 'status', val)} />
                                                         </td>
                                                         <td className={row.note.includes('즉시') ? 'font-bold text-gray-800' : 'text-gray-500'}>
                                                             <EditableText value={row.note} onChange={(val) => updateFloorStatusRow(i, 'note', val)} />
                                                         </td>
                                                     </>
                                                   )
                                             )}
                                        </GeditorWrapper>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Add Floor Row Button on Canvas (print:hidden) */}
                        <button 
                            onClick={addFloorStatusRow}
                            className="print:hidden w-full py-2.5 bg-slate-50 hover:bg-slate-100 border-t border-dashed border-gray-200 text-gray-500 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            <span>임대현황 행 추가</span>
                        </button>
                        
                        <div className="p-4 mt-auto border-t border-gray-100 text-xs text-gray-500 leading-relaxed bg-[#f8fafc] shrink-0">
                            <EditableBlock value={info.floorStatusNotice || ""} onChange={(val) => handleTextChange('floorStatusNotice', val)} />
                        </div>
                    </div>
                </div>
 
                {/* Right: Highlights & Chart */}
                <div className="w-7/12 h-full flex flex-col">
                    <div className="text-gray-600 font-bold text-sm mb-4">2. 매각 핵심 하이라이트 & 시세 분석</div>
                    <div className="flex-1 border border-yellow-200 rounded-lg p-6 bg-white shadow-sm flex flex-col">
                        <h3 className="text-xl font-extrabold text-gray-900 mb-4 border-b-2 border-gray-800 pb-2 inline-block">매각 핵심 하이라이트</h3>
                        <ul className="space-y-3 mb-8">
                            {info.highlights?.map((hl, i) => (
                                <GeditorWrapper
                                    key={i}
                                    tag="li"
                                    onMoveUp={() => moveHighlightRow(i, 'up')}
                                    onMoveDown={() => moveHighlightRow(i, 'down')}
                                    onDelete={() => deleteHighlightRow(i)}
                                    onDuplicate={addHighlightRow}
                                    isFirst={i === 0}
                                    isLast={i === info.highlights.length - 1}
                                    className="flex gap-2 text-sm items-center w-full"
                                >
                                    <span className="text-[#cc5a27] font-bold">•</span>
                                    <span className="w-full">
                                        <EditableText 
                                            value={hl} 
                                            onChange={(val) => {
                                                const newHl = [...info.highlights];
                                                newHl[i] = val;
                                                handleTextChange('highlights', newHl as any);
                                            }}
                                        />
                                    </span>
                                </GeditorWrapper>
                            ))}
                            
                            {/* Add Highlight Button on Canvas (print:hidden) */}
                            <button 
                                onClick={addHighlightRow}
                                className="print:hidden w-full py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-gray-200 text-gray-500 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                <span>하이라이트 항목 추가</span>
                            </button>
                        </ul>
                        
                        {/* Fake Chart */}
                        <div className="mt-auto border-t-2 border-[#cc5a27] pt-6 relative">
                            <div className="h-40 flex items-end justify-around px-8 border-b border-gray-300 pb-2 mb-2">
                                <div className="w-12 bg-gray-200 h-[80%] rounded-t-sm"></div>
                                <div className="w-12 bg-gray-300 h-[75%] rounded-t-sm"></div>
                                <div className="w-12 bg-gray-400 h-[85%] rounded-t-sm"></div>
                                <div className="w-12 bg-[#cc5a27] h-[65%] rounded-t-sm"></div>
                            </div>
                            <div className="flex justify-around px-8 text-xs font-bold text-gray-500">
                                <span>탁상감정가</span>
                                <span>기존 희망가</span>
                                <span>인근 시세</span>
                                <span className="text-[#cc5a27]">현재 급매가</span>
                            </div>
 
                            <div className="mt-6">
                                <div className="text-xs font-bold tracking-widest text-[#cc5a27] uppercase mb-1">STRATEGIC ADVISORY</div>
                                <div className="text-sm text-gray-600 leading-relaxed">
                                    <EditableBlock value={info.valuationText || ""} onChange={(val) => handleTextChange('valuationText', val)} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ReportPage>
        )}
 
        {/* PAGE 3: PHOTOS */}
        {(activeTab === 'all' || activeTab === 3) && (
        <ReportPage 
            pageNumber={3} 
            title="현장 사진" 
            subtitle="Actual Field Photos" 
            badgeText={info.pageBadges?.page3 || "PROPERTY VISUALS"}
            exportId="page-3"
            onUpdateBadge={(val) => {
                if (onUpdateInfo) {
                    onUpdateInfo({
                        ...info,
                        pageBadges: { ...(info.pageBadges || {}), page3: val }
                    });
                }
            }}
        >
            <div className="flex gap-4 h-[550px]">
                {/* Main Large Photo */}
                <div className="w-1/2 relative h-full group">
                    <EditableImage 
                        src={mainImage || ""} 
                        alt="Exterior" 
                        imageKey="mainImage"
                        onImageUpload={onImageUpload}
                        isUploading={isUploadingImage?.mainImage}
                        aspectRatioClass="object-contain"
                    />
                    <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/80 to-transparent z-20">
                        <span className="text-white font-bold relative z-30">
                            <EditableText 
                                value={info.photoCaptions?.main || ""} 
                                onChange={(val) => {
                                    if (onUpdateInfo) {
                                        onUpdateInfo({
                                            ...info,
                                            photoCaptions: { ...info.photoCaptions, main: val }
                                        });
                                    }
                                }}
                                className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-white"
                            />
                        </span>
                    </div>
                </div>
                
                {/* 4 Grid Photos */}
                <div className="w-1/2 grid grid-cols-2 grid-rows-2 gap-4">
                    {[
                        { img: subImage1, label: info.photoCaptions?.sub1, key: 'sub1', slot: 'subImage1' },
                        { img: subImage2, label: info.photoCaptions?.sub2, key: 'sub2', slot: 'subImage2' },
                        { img: featureImage1, label: info.photoCaptions?.feat1, key: 'feat1', slot: 'featureImage1' },
                        { img: featureImage2, label: info.photoCaptions?.feat2, key: 'feat2', slot: 'featureImage2' },
                    ].map((p, i) => (
                        <div key={i} className="relative rounded-xl overflow-hidden shadow-md bg-gray-200">
                            <EditableImage 
                                src={p.img || ""} 
                                alt={p.label || ""} 
                                imageKey={p.slot}
                                onImageUpload={onImageUpload}
                                isUploading={isUploadingImage?.[p.slot]}
                                aspectRatioClass="object-cover"
                            />
                            <div className="absolute bottom-0 left-0 w-full p-3 bg-gradient-to-t from-[#0d1424]/90 to-transparent z-20">
                                <span className="text-white font-bold text-sm relative z-30">
                                    <EditableText 
                                        value={p.label || ""} 
                                        onChange={(val) => {
                                            if (onUpdateInfo) {
                                                onUpdateInfo({
                                                    ...info,
                                                    photoCaptions: { ...info.photoCaptions, [p.key]: val }
                                                });
                                            }
                                        }}
                                        className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-white"
                                    />
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </ReportPage>
        )}

        {/* PAGE 4: AREA ANALYSIS */}
        {(activeTab === 'all' || activeTab === 4) && (
        <ReportPage 
            pageNumber={4} 
            title="입지 및 위치도" 
            subtitle="Strategic Connectivity" 
            badgeText={info.pageBadges?.page4 || "AREA ANALYSIS"}
            exportId="page-4"
            onUpdateBadge={(val) => {
                if (onUpdateInfo) {
                    onUpdateInfo({
                        ...info,
                        pageBadges: { ...(info.pageBadges || {}), page4: val }
                    });
                }
            }}
        >
            <div className="flex flex-col h-[550px] gap-6">
                <div className="flex gap-6 h-3/4">
                    {/* Map Box */}
                    <div className="w-2/3 border border-gray-200 rounded-2xl overflow-hidden relative shadow-sm bg-gray-50 flex items-center justify-center">
                        {info.address ? (
                            <iframe 
                                title="Location Map"
                                width="100%" 
                                height="100%" 
                                frameBorder="0" 
                                style={{ border: 0 }}
                                src={`https://maps.google.com/maps?q=${encodeURIComponent(info.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                allowFullScreen
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="text-gray-400 font-bold">주소를 입력하면 지도가 표시됩니다.</div>
                        )}

                        {/* Direct Naver Map link on canvas (print:hidden) */}
                        {info.address && (
                            <a 
                                href={info.agentMapUrl || `https://map.naver.com/p/search/${encodeURIComponent(info.address)}`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="absolute bottom-4 left-4 bg-white/95 text-slate-800 hover:bg-white active:scale-95 font-extrabold px-3 py-1.5 rounded-xl shadow-lg text-[10px] flex items-center gap-1.5 transition-all border border-gray-200 z-20 print:hidden"
                                title="네이버 지도로 자세히 보기"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 text-green-600">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25z" />
                                </svg>
                                <span>네이버 지도로 보기</span>
                            </a>
                        )}

                        <div className="absolute top-4 right-4 bg-[#0d1424] text-white p-3 rounded-lg shadow-lg border border-gray-700 z-20">
                            <div className="text-[#e29d45] text-[10px] font-bold tracking-widest uppercase mb-1">TARGET LOCATION</div>
                            <div className="font-bold text-sm whitespace-pre-wrap">
                                <EditableBlock 
                                    value={info.areaTargetName || ""} 
                                    onChange={(val) => handleTextChange('areaTargetName', val)}
                                    className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-white"
                                />
                            </div>
                        </div>
                    </div>
                    {/* Info Box */}
                    <div className="w-1/3 bg-[#0d1424] rounded-2xl p-8 flex flex-col shadow-md text-white">
                        <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-6">
                            <svg className="w-6 h-6 text-[#e29d45]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </div>
                        <h3 className="text-[#e29d45] text-2xl font-bold mb-4 leading-snug whitespace-pre-wrap">
                            <EditableBlock 
                                value={info.areaTargetName?.split('\n')[0] || ""} 
                                onChange={(val) => handleTextChange('areaTargetName', val)}
                                className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-[#e29d45]"
                            />
                            클러스터
                        </h3>
                        <div className="text-gray-300 text-sm leading-relaxed mb-auto">
                            <EditableBlock 
                                value={info.areaTargetDesc || ""} 
                                onChange={(val) => handleTextChange('areaTargetDesc', val)}
                                className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-gray-300"
                            />
                        </div>
                    </div>
                </div>

                {/* Bottom 3 Boxes */}
                <div className="flex gap-4 h-1/4">
                    {[1,2,3].map(i => (
                        <div key={i} className={`flex-1 border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-center ${i===3 ? 'bg-[#f8fafc]' : 'bg-white'}`}>
                            <div className={`font-bold text-xs uppercase tracking-widest mb-2 ${i===1 ? 'text-[#cc5a27]' : 'text-gray-400'}`}>
                                <EditableText 
                                    value={(info as any)[`areaBox${i}Title`] || ""} 
                                    onChange={(val) => handleTextChange(`areaBox${i}Title`, val)} 
                                />
                            </div>
                            <div className="text-gray-800 font-bold text-sm">
                                <EditableText 
                                    value={(info as any)[`areaBox${i}Text`] || ""} 
                                    onChange={(val) => handleTextChange(`areaBox${i}Text`, val)} 
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </ReportPage>
        )}

        {/* PAGE 5: ROADMAP */}
        {(activeTab === 'all' || activeTab === 5) && (
        <ReportPage 
            pageNumber={5} 
            title="가치 및 로드맵" 
            subtitle="Value & Roadmap" 
            badgeText={info.pageBadges?.page5 || "INVESTMENT ROADMAP"}
            exportId="page-5"
            onUpdateBadge={(val) => {
                if (onUpdateInfo) {
                    onUpdateInfo({
                        ...info,
                        pageBadges: { ...(info.pageBadges || {}), page5: val }
                    });
                }
            }}
        >
            <div className="grid grid-cols-2 grid-rows-2 gap-8 h-[480px]">
                {[
                    { bg: 'bg-blue-50', border: 'border-blue-100', icon: '🏢' },
                    { bg: 'bg-green-50', border: 'border-green-100', icon: '🏡' },
                    { bg: 'bg-red-50', border: 'border-red-100', icon: '📈' },
                    { bg: 'bg-yellow-50', border: 'border-yellow-100', icon: '🏗️' },
                ].map((style, i) => {
                    const idx = i + 1;
                    return (
                        <div key={idx} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 flex items-start gap-6 hover:shadow-md transition-shadow">
                            <div className={`w-20 h-20 shrink-0 ${style.bg} rounded-xl border ${style.border} flex items-center justify-center`}>
                                 <span className="text-4xl">{style.icon}</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-extrabold text-gray-900 mb-3">
                                    <EditableText 
                                        value={(info.roadmap as any)?.[`box${idx}Title`] || ""} 
                                        onChange={(val) => {
                                            if (onUpdateInfo) {
                                                onUpdateInfo({
                                                    ...info,
                                                    roadmap: { ...info.roadmap, [`box${idx}Title`]: val }
                                                });
                                            }
                                        }}
                                    />
                                </h3>
                                <div className="text-gray-500 text-sm leading-relaxed">
                                    <EditableBlock 
                                        value={(info.roadmap as any)?.[`box${idx}Text`] || ""} 
                                        onChange={(val) => {
                                            if (onUpdateInfo) {
                                                onUpdateInfo({
                                                    ...info,
                                                    roadmap: { ...info.roadmap, [`box${idx}Text`]: val }
                                                });
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
            
            <div className="mt-8 text-right pr-4">
                <p className="text-gray-500 italic font-serif-kr text-lg">"최고의 입지에 미래 가치를 더합니다."</p>
            </div>
        </ReportPage>
        )}
    </div>
  );
});

FlyerCanvas.displayName = 'FlyerCanvas';

export default FlyerCanvas;
