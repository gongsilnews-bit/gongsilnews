import React, { forwardRef } from 'react';
import { FlyerState } from '../types';

interface FlyerCanvasProps {
  data: FlyerState;
  activeTab?: number | 'all';
  onUpdateInfo?: (info: any) => void;
  onImageUpload?: (key: string, file: File) => Promise<string | undefined>;
  onDeleteImage?: (key: string) => void;
  isUploadingImage?: Record<string, boolean>;
  onOpenTableEditor?: () => void;
}

// ??? NOTION & CANVA STYLE INLINE EDITORS ??????????????????????????????????????

const EditableText = ({
  value,
  onChange,
  className = "",
  placeholder = "?띿뒪???낅젰..."
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
      className={`outline-none hover:bg-amber-100/50 hover:ring-1 hover:ring-amber-300 focus:bg-amber-100/80 focus:ring-1 focus:ring-amber-500 rounded px-1 transition-all duration-150 cursor-text min-w-[30px] inline-block w-full ${className}`}
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
  placeholder = "?띿뒪???낅젰..."
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

// ??? PREMIUM DIRECT IMAGE UPLOADER OVERLAY ????????????????????????????????????

const EditableImage = ({
  src,
  alt,
  className = "",
  imageKey,
  onImageUpload,
  onDelete,
  isUploading = false,
  aspectRatioClass = "object-contain"
}: {
  src: string;
  alt: string;
  className?: string;
  imageKey: string;
  onImageUpload?: (key: string, file: File) => Promise<string | undefined>;
  onDelete?: () => void;
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
        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center z-20 print:hidden text-white gap-2">
          <div className="flex flex-col sm:flex-row gap-2 px-4 w-full justify-center items-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-extrabold px-3 py-1.5 rounded-xl shadow-lg text-[11px] flex items-center gap-1.5 transition-all cursor-pointer border-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
              <span>?낅줈??蹂寃?/span>
            </button>
            
            {src && onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="bg-red-500 hover:bg-red-600 active:scale-95 text-white font-extrabold px-3 py-1.5 rounded-xl shadow-lg text-[11px] flex items-center gap-1.5 transition-all cursor-pointer border-none"
                title="?ъ쭊 ??젣"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                <span>?ъ쭊 ??젣</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading indicator (print:hidden) */}
      {isUploading && (
        <div className="absolute inset-0 bg-slate-900/80 z-[25] flex flex-col items-center justify-center print:hidden">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500 mb-2"></div>
          <span className="text-[10px] text-amber-500 font-bold">WebP 理쒖쟻???낅줈??以?..</span>
        </div>
      )}
    </div>
  );
};

// ??? REPORT PAGE WRAPPER ??????????????????????????????????????????????????????

const ReportPage = ({ 
    children, 
    pageNumber, 
    pageString,
    isHidden,
    title, 
    subtitle, 
    badgeText,
    exportId,
    onUpdateTitle,
    onUpdateSubtitle,
    onUpdateBadge,
    footerText = "CONFIDENTIAL | INFORMATION MEMORANDUM",
    onUpdateFooter,
    layoutTheme,
    colorTheme
}: { 
    children: React.ReactNode, 
    pageNumber: number, 
    pageString?: string,
    isHidden?: boolean,
    title: string, 
    subtitle: string, 
    badgeText?: string,
    exportId?: string,
    onUpdateTitle?: (text: string) => void,
    onUpdateSubtitle?: (text: string) => void,
    onUpdateBadge?: (text: string) => void,
    footerText?: string,
    onUpdateFooter?: (text: string) => void,
    layoutTheme?: any,
    colorTheme?: any
}) => {
    const layoutType = layoutTheme?.type || 'type1';
    const headingFont = layoutTheme?.headingFont || 'font-sans';
    const bodyFont = layoutTheme?.bodyFont || 'font-sans';

    const renderHeader = () => {
        if (layoutType === 'type2') {
            return (
                <div className={`h-[120px] bg-white text-[var(--theme-dark)] border-b-2 border-[var(--theme-dark)] px-10 py-6 flex flex-col justify-center items-center shrink-0 ${headingFont}`}>
                    <h1 className="text-3xl font-extrabold tracking-widest uppercase">
                        {onUpdateTitle ? <EditableText value={title} onChange={onUpdateTitle} className="text-center hover:bg-gray-100 focus:bg-gray-200 px-2" /> : title}
                    </h1>
                    <span className="text-gray-500 text-sm tracking-widest mt-1">
                        {onUpdateSubtitle ? <EditableText value={subtitle} onChange={onUpdateSubtitle} className="text-center hover:bg-gray-100 focus:bg-gray-200 px-2" /> : subtitle}
                    </span>
                    {badgeText && <div className="absolute top-6 right-10 border border-[var(--theme-dark)] text-[var(--theme-dark)] px-3 py-1 text-xs font-bold tracking-widest uppercase">{onUpdateBadge ? <EditableText value={badgeText} onChange={onUpdateBadge} /> : badgeText}</div>}
                </div>
            );
        }
        if (layoutType === 'type3') {
            return (
                <div className={`h-[120px] bg-gray-50 px-10 py-6 flex flex-col justify-end shrink-0 border-l-[12px] border-[var(--theme-primary)] ${headingFont}`}>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                        {onUpdateTitle ? <EditableText value={title} onChange={onUpdateTitle} className="hover:bg-gray-200 focus:bg-gray-300 px-1" /> : title}
                    </h1>
                    <span className="text-[var(--theme-primary)] font-bold tracking-widest mt-1 text-sm">
                        {onUpdateSubtitle ? <EditableText value={subtitle} onChange={onUpdateSubtitle} className="hover:bg-[var(--theme-primary)]/10 focus:bg-[var(--theme-primary)]/20 px-1" /> : subtitle}
                    </span>
                    {badgeText && <div className="absolute top-6 right-10 bg-[var(--theme-primary)] text-white px-3 py-1 text-xs font-bold tracking-widest uppercase shadow-sm">{onUpdateBadge ? <EditableText value={badgeText} onChange={onUpdateBadge} /> : badgeText}</div>}
                </div>
            );
        }
        if (layoutType === 'type4') {
            return (
                <div className={`h-[120px] bg-[var(--theme-dark)] text-white px-10 py-6 flex justify-between items-center shrink-0 ${headingFont}`}>
                    <div className="flex items-center gap-6 w-full">
                        <div className="text-5xl font-black opacity-20">0{pageNumber}</div>
                        <div className="flex-1">
                            <h1 className="text-3xl font-black uppercase tracking-tight">
                                {onUpdateTitle ? <EditableText value={title} onChange={onUpdateTitle} className="hover:bg-white/10 focus:bg-white/20 px-1" /> : title}
                            </h1>
                            <span className="text-white/70 font-bold tracking-widest uppercase text-xs mt-1 block">
                                {onUpdateSubtitle ? <EditableText value={subtitle} onChange={onUpdateSubtitle} className="hover:bg-white/10 focus:bg-white/20 px-1" /> : subtitle}
                            </span>
                        </div>
                        {badgeText && (
                            <div className="bg-[var(--theme-primary)] text-white px-4 py-2 font-black tracking-widest shadow-md text-sm">
                                {onUpdateBadge ? <EditableText value={badgeText} onChange={onUpdateBadge} className="hover:bg-white/20 focus:bg-white/30" /> : badgeText}
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        if (layoutType === 'type5') {
            return (
                <div className={`h-[120px] bg-white px-10 flex flex-col justify-end shrink-0 ${headingFont}`}>
                    <div className="w-full flex items-end relative pb-4">
                        
                        <div className="flex-1 flex items-end">
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase pb-2 shrink-0 z-10 relative">
                                {onUpdateTitle ? <EditableText value={title} onChange={onUpdateTitle} className="hover:bg-gray-100 focus:bg-gray-200 px-1" /> : title}
                            </h1>
                        </div>
                        
                        {badgeText && (
                            <div className="ml-6 z-10 bg-[var(--theme-primary)] text-white px-5 py-2 font-black tracking-widest uppercase text-[13px] shadow-sm mb-2 relative">
                                {onUpdateBadge ? <EditableText value={badgeText} onChange={onUpdateBadge} className="hover:bg-white/20 focus:bg-white/30 text-center" /> : badgeText}
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        
        // Default Type 1 (Current)
        return (
            <div className={`h-[120px] bg-[var(--theme-dark)] text-white px-10 py-6 flex justify-between items-end shrink-0 ${headingFont}`}>
                <div>
                    <h1 className="text-3xl font-extrabold mb-1 tracking-tight">
                        {onUpdateTitle ? (
                            <EditableText 
                              value={title} 
                              onChange={onUpdateTitle} 
                              className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-white px-1" 
                            />
                        ) : title}
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-400 text-sm">
                            {onUpdateSubtitle ? (
                                <EditableText 
                                  value={subtitle} 
                                  onChange={onUpdateSubtitle} 
                                  className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-gray-300 px-1" 
                                />
                            ) : subtitle}
                        </span>
                    </div>
                </div>
                {badgeText && (
                    <div className="flex items-center gap-4 h-full pb-2">
                        <div className="w-px h-8 bg-gray-600"></div>
                        <span className={`text-2xl font-black tracking-widest text-white`}>
                            {onUpdateBadge ? (
                                <EditableText 
                                  value={badgeText} 
                                  onChange={onUpdateBadge} 
                                  className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 px-1" 
                                />
                            ) : badgeText}
                        </span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div data-export-id={exportId} className={`relative bg-white w-[1122px] h-[794px] overflow-hidden flex flex-col shadow-2xl mb-8 ${bodyFont}`} style={{ pageBreakAfter: 'always' }}>
            {isHidden && (
                <div className="absolute top-0 left-0 right-0 z-50 bg-red-500/90 text-white py-1.5 text-center text-sm font-bold shadow-md tracking-wider backdrop-blur-sm">
                    ?좑툘 ?꾩옱 異쒕젰(PDF/?몄뇙)?먯꽌 ?쒖쇅???섏씠吏?낅땲?? (醫뚯륫 ??硫붾돱?먯꽌 ?ㅼ젙??蹂寃쏀븷 ???덉뒿?덈떎.)
                </div>
            )}
            {renderHeader()}

            {/* Content Body */}
            <div className="flex-1 p-10 relative">
                {children}
            </div>

            {/* Footer */}
            <div className="h-[50px] px-10 flex justify-between items-center shrink-0 border-t border-gray-100">
                <div className="text-gray-400 text-xs font-bold tracking-widest">
                    {onUpdateFooter ? (
                        <EditableText 
                            value={footerText} 
                            onChange={onUpdateFooter} 
                            className="hover:bg-amber-100/50 hover:ring-1 hover:ring-amber-300 focus:bg-amber-100/80 focus:ring-1 focus:ring-amber-500 rounded px-1 transition-all cursor-text min-w-[280px] inline-block uppercase text-gray-400"
                        />
                    ) : footerText}
                </div>
                <div className="text-gray-400 text-xs font-bold tracking-widest">
                    {pageString || `PAGE 0${pageNumber} / 06`}
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
                    className="hover:bg-amber-100/50 hover:ring-1 hover:ring-amber-300 focus:bg-amber-100/80 focus:ring-1 focus:ring-amber-500 text-gray-700 rounded px-1 transition-all cursor-text min-w-[120px] inline-block"
                />
            ) : title}
        </h3>
        <span className="text-gray-300">|</span>
        <span className="text-gray-800 font-bold text-sm">
            {onUpdateSubtitle ? (
                <EditableText 
                    value={subtitle} 
                    onChange={onUpdateSubtitle} 
                    className="hover:bg-amber-100/50 hover:ring-1 hover:ring-amber-300 focus:bg-amber-100/80 focus:ring-1 focus:ring-amber-500 text-gray-800 rounded px-1 transition-all cursor-text min-w-[60px] inline-block"
                />
            ) : subtitle}
        </span>
    </div>
);

// ??? GEDITOR STYLE PREMIUM FLOATING TOOLBAR WRAPPER ????????????????????????????

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
    <Component className={`relative group/geditor ${className}`}>
      {children}
      
      {/* Floating Canvas Controls on Hover */}
      {(onMoveUp || onMoveDown || onDelete || onDuplicate) && (
        <div className="absolute -left-8 top-1/2 transform -translate-y-1/2 bg-[var(--theme-dark)] text-white text-[10px] rounded-md shadow-md border border-gray-700 p-1 flex flex-col items-center gap-1 opacity-0 group-hover/geditor:opacity-100 transition-opacity duration-200 print:hidden z-30">
          {onMoveUp && (
            <button
              type="button"
              disabled={isFirst}
              onClick={onMoveUp}
              className="text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer border-none bg-transparent font-bold p-0.5"
              title="?꾨줈 ?대룞"
            >
              ??
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              disabled={isLast}
              onClick={onMoveDown}
              className="text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer border-none bg-transparent font-bold p-0.5"
              title="?꾨옒濡??대룞"
            >
              ??
            </button>
          )}
          {onDuplicate && (
            <button
              type="button"
              onClick={onDuplicate}
              className="text-green-400 hover:text-green-300 cursor-pointer border-none bg-transparent font-bold p-0.5"
              title="蹂듭젣"
            >
              竊?
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-red-400 hover:text-red-300 cursor-pointer border-none bg-transparent font-bold p-0.5"
              title="??젣"
            >
              ??
            </button>
          )}
        </div>
      )}
    </Component>
  );
};

// ??? KAKAO MAP COMPONENT FOR PAGE 4 ??????????????????????????????????????????
const KakaoMap = ({ address }: { address: string }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadScript = () => {
      if ((window as any).kakao && (window as any).kakao.maps && (window as any).kakao.maps.services) {
        setLoaded(true);
        return;
      }

      // Check if another script is already adding it
      const existingScript = document.querySelector('script[src*="dapi.kakao.com"]');
      if (existingScript) {
        const handleScriptLoad = () => {
          (window as any).kakao.maps.load(() => {
            setLoaded(true);
          });
        };
        existingScript.addEventListener('load', handleScriptLoad);
        return;
      }

      const script = document.createElement("script");
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=435d3602201a49ea712e5f5a36fe6efc&libraries=services&autoload=false`;
      script.async = true;
      script.onload = () => {
        (window as any).kakao.maps.load(() => {
          setLoaded(true);
        });
      };
      script.onerror = () => {
        setErrorMsg("吏???ㅽ겕由쏀듃 濡쒕뱶 ?ㅽ뙣");
      };
      document.head.appendChild(script);
    };

    loadScript();
  }, []);

  React.useEffect(() => {
    if (!loaded || !containerRef.current || !address) return;

    try {
      const container = containerRef.current;
      container.innerHTML = "";

      const geocoder = new (window as any).kakao.maps.services.Geocoder();
      
      // Clean up search query
      let cleanAddress = address;
      const cleanPatterns = [/(留ㅻℓ|?꾩꽭|?붿꽭|?꾨?).*/g, /\d+??*/g];
      cleanPatterns.forEach(pat => {
        cleanAddress = cleanAddress.replace(pat, "").trim();
      });

      geocoder.addressSearch(cleanAddress, (result: any, status: any) => {
        if (status === (window as any).kakao.maps.services.Status.OK) {
          setErrorMsg(null);
          const coords = new (window as any).kakao.maps.LatLng(result[0].y, result[0].x);
          
          const options = {
            center: coords,
            level: 3
          };

          const map = new (window as any).kakao.maps.Map(container, options);

          // Add a custom styled marker
          const marker = new (window as any).kakao.maps.Marker({
            map: map,
            position: coords
          });

          // Add a beautiful custom styled info bubble overlay
          const contentStr = `
            <div style="
              padding: 6px 12px;
              background-color: #fff;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
              font-size: 11px;
              font-weight: 800;
              color: #1e293b;
              text-align: center;
              white-space: nowrap;
            ">
              ?뱦 ${cleanAddress.split(' ').slice(0, 3).join(' ')}
            </div>
          `;
          
          const customOverlay = new (window as any).kakao.maps.CustomOverlay({
            position: coords,
            content: contentStr,
            yAnchor: 2.2
          });

          customOverlay.setMap(map);
          
          // Disable interactive behaviors
          map.setZoomable(false);
          map.setDraggable(false);
        } else {
          // Fallback to default coordinate if exact geocode fails
          geocoder.addressSearch("?쒖슱 媛뺣궓援???궪??, (fallbackResult: any, fallbackStatus: any) => {
            if (fallbackStatus === (window as any).kakao.maps.services.Status.OK) {
              const coords = new (window as any).kakao.maps.LatLng(fallbackResult[0].y, fallbackResult[0].x);
              const map = new (window as any).kakao.maps.Map(container, { center: coords, level: 3 });
              new (window as any).kakao.maps.Marker({ map, position: coords });
            }
          });
          setErrorMsg("?낅젰??二쇱냼???뺥솗??醫뚰몴瑜?李얠쓣 ???놁뒿?덈떎.");
        }
      });
    } catch (e) {
      console.error("Kakao Map init error", e);
      setErrorMsg("吏??珥덇린???ㅻ쪟");
    }
  }, [loaded, address]);

  if (errorMsg) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400 font-bold p-6 text-center">
        <svg className="w-8 h-8 text-red-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="text-xs text-red-500 mb-1">{errorMsg}</span>
        <span className="text-[10px] text-gray-400">?ъ씠?쒕컮 二쇱냼 ?ㅼ젙???뺤젙?섍굅?? 吏??罹≪쿂 ?대?吏 吏곸젒 ?낅줈?쒕? ?ъ슜?섏꽭??</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ minHeight: "100%" }} />
  );
};

// ??? MAIN CANVAS COMPONENT ????????????????????????????????????????????????????

const FlyerCanvas = forwardRef<HTMLDivElement, FlyerCanvasProps>(({ data, activeTab = 'all', onUpdateInfo, onImageUpload, onDeleteImage, isUploadingImage, onOpenTableEditor }, ref) => {
  const { info, mainImage, subImage1, subImage2, featureImage1, featureImage2, mapImage, colorTheme, layoutTheme } = data; 
  const placeholder = "https://placehold.co/800x600/e2e8f0/1e293b?text=Image";

  // Data mapping from info
  const targetTitle = info.address || '?쒖큹????꽭沅?留ㅻℓ ?덈궡??;
  const price = info.priceMain || '75????;

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
          { label: '????ぉ', value: '?댁슜 ?낅젰' }
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
          { floor: '??痢?, purpose: '?⑸룄', lease: '?꾨?李?, status: '?먯쑀?곹깭', note: '鍮꾧퀬' }
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
        highlights: [...info.highlights, '?덈줈???섏씠?쇱씠???듭떖 臾멸뎄瑜??낅젰?섏꽭??']
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

  let visiblePages = info.visiblePages || [0, 1, 2, 3, 4, 5, 6, 7];
  if (info.hideRentRoll) visiblePages = visiblePages.filter(p => p !== 3);
  if (info.hideRoadmap) visiblePages = visiblePages.filter(p => p !== 6);
  
  const getPageStatus = (pageNum: number) => {
      const isVisible = visiblePages.includes(pageNum);
      const shouldRender = (activeTab === 'all' && isVisible) || activeTab === pageNum;
      
      let pageString = `PAGE 0${pageNum} / 08`;
      if (isVisible) {
          const idx = visiblePages.indexOf(pageNum) + 1;
          const total = visiblePages.length;
          pageString = `PAGE 0${idx} / 0${total}`;
      } else {
          pageString = `EXCLUDED`;
      }
      
      return { isVisible, shouldRender, pageString, isHidden: !isVisible };
  };

  const themeStyles = {
    '--theme-primary': colorTheme.primary,
    '--theme-secondary': colorTheme.secondary,
    '--theme-dark': colorTheme.dark,
  } as React.CSSProperties;

  return (
    <div className="flex flex-col items-center p-8 bg-gray-100" ref={ref} style={themeStyles}>
        
        {/* PAGE 0: COVER */}
        {getPageStatus(0).shouldRender && (
            <ReportPage layoutTheme={layoutTheme} colorTheme={colorTheme}
                pageNumber={0} 
                pageString={getPageStatus(0).pageString}
                isHidden={getPageStatus(0).isHidden}
                title={info.coverTitle || "INVESTMENT MEMORANDUM"} 
                subtitle={info.coverSubtitle || "부동산 투자 분석 보고서"}
                badgeText="BROCHURE"
            >
                <div className="flex flex-col items-center justify-center h-full w-full relative -mt-10">
                    <div className="absolute inset-0 opacity-10 flex items-center justify-center overflow-hidden">
                        <svg className="w-[120%] h-[120%] text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <polygon points="0,100 100,0 100,100" />
                        </svg>
                    </div>
                    
                    <div className="z-10 w-full flex flex-col items-center mb-16">
                        <div className="w-24 h-2 bg-[var(--theme-primary)] mb-8"></div>
                        <h1 className="text-[64px] font-black text-gray-900 tracking-tighter leading-none mb-4 text-center px-4">
                            {info.address || "서울 강남구 논현동"}
                        </h1>
                        <h2 className="text-3xl font-bold text-[var(--theme-primary)] tracking-widest text-center px-4">
                            {info.subTitle || "Asset Sales Briefing"}
                        </h2>
                    </div>

                    <div className="z-10 w-full max-w-3xl flex flex-col items-center gap-12 mt-8">
                        <div className="w-full aspect-[21/9] bg-gray-100 rounded-2xl overflow-hidden shadow-2xl relative">
                            {mainImage ? (
                                <img src={mainImage} alt="Cover Main" className="w-full h-full object-cover" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                    <span className="text-2xl font-bold">MAIN IMAGE</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="absolute bottom-10 right-10 flex flex-col items-end z-10">
                        {info.coverQRLink && (
                            <div className="bg-white p-3 shadow-xl rounded-xl border border-gray-100 flex flex-col items-center gap-2">
                                <div className="w-24 h-24 bg-gray-100 rounded flex items-center justify-center border border-dashed border-gray-300">
                                    <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h4a1 1 0 001-1V5a1 1 0 00-1-1H3a1 1 0 00-1 1v4a1 1 0 001 1zm0 11h4a1 1 0 001-1v-4a1 1 0 00-1-1H3a1 1 0 00-1 1v4a1 1 0 001 1zm11-11h4a1 1 0 001-1V5a1 1 0 00-1-1h-4a1 1 0 00-1 1v4a1 1 0 001 1zm0 11h4a1 1 0 001-1v-4a1 1 0 00-1-1h-4a1 1 0 00-1 1v4a1 1 0 001 1z" />
                                    </svg>
                                </div>
                                <span className="text-[10px] font-black tracking-widest text-[var(--theme-primary)]">SCAN FOR MORE</span>
                            </div>
                        )}
                    </div>
                </div>
            </ReportPage>
        )}

        {/* PAGE 1: OVERVIEW */}
        {getPageStatus(1).shouldRender && (
        <ReportPage layoutTheme={layoutTheme} colorTheme={colorTheme}
            pageNumber={1} 
            pageString={getPageStatus(1).pageString}
            isHidden={getPageStatus(1).isHidden}
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
            footerText={info.footerText || "CONFIDENTIAL | INFORMATION MEMORANDUM"}
            onUpdateFooter={(val) => handleTextChange('footerText', val)}
        >
            <div className="flex gap-8 h-full">
                {/* Left Col: Overview Table */}
                <div className="w-5/12 flex flex-col justify-between">
                    <div>
                        <SectionTitle 
                            title={info.overviewTitle || "PROPERTY OVERVIEW"} 
                            subtitle={info.overviewSubtitle || "臾쇨굔媛쒖슂"} 
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
                        <div className="border-t-[3px] border-[var(--theme-primary)] flex flex-col text-sm border-b border-gray-200">
                            {(() => {
                                const rows = Array.isArray(info.overviewTable) 
                                    ? info.overviewTable.map(r => ({ k: r.label, v: r.value }))
                                    : [
                                        { k: '?뚯옱吏', v: info.overviewTable?.location },
                                        { k: '?⑸룄吏??, v: info.overviewTable?.zoning },
                                        { k: '?吏硫댁쟻', v: info.overviewTable?.landArea },
                                        { k: '?곕㈃??, v: info.overviewTable?.totalArea },
                                        { k: '嫄대Ъ洹쒕え', v: info.overviewTable?.buildingScale },
                                        { k: '二쇱슜??, v: info.overviewTable?.mainPurpose },
                                        { k: '二쇱감???, v: info.overviewTable?.parking },
                                        { k: '?밴컯湲?, v: info.overviewTable?.elevator },
                                        { k: '以怨듭뿰??, v: info.overviewTable?.completionYear },
                                    ];
                                    
                                if (Array.isArray(info.overviewTable)) {
                                    return (
                                        <>
                                            {info.overviewTable.map((row, i) => (
                                                <div key={i} className="flex w-full border-b border-gray-100 last:border-0 bg-white">
                                                    <div className="w-1/3 text-gray-500 font-bold py-2 pl-4 flex items-center">
                                                        <EditableText 
                                                            value={row.label} 
                                                            onChange={(val) => {
                                                                const newTable = [...info.overviewTable];
                                                                newTable[i] = { ...newTable[i], label: val };
                                                                handleTextChange('overviewTable', newTable as any);
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="w-2/3 text-gray-800 font-bold py-2 pl-4 flex items-center">
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
                                            ))}
                                            

                                        </>
                                    );
                                }
                                
                                return rows.filter(row => row.v && row.v.trim() !== '').map((row, i) => (
                                    <div key={i} className="flex border-b border-gray-100 last:border-0 bg-white">
                                        <div className="w-1/3 text-gray-500 font-bold py-2 pl-4 flex items-center">{row.k}</div>
                                        <div className="w-2/3 text-gray-800 font-bold py-2 pl-4 flex items-center">{row.v}</div>
                                    </div>
                                ));
                            })()}
                            
                            {/* Price Row */}
                            {(() => {
                                const tType = info.transactionType || "留ㅻℓ";
                                let label = "留ㅻℓ媛";
                                
                                if (tType === "?꾩꽭") {
                                    label = "蹂댁쬆湲?(?꾩꽭)";
                                } else if (tType === "?붿꽭" || tType === "?꾨?") {
                                    label = "蹂댁쬆湲?/ ?붿꽭";
                                } else if (tType !== "留ㅻℓ") {
                                    label = "?꾨?媛";
                                }
                                
                                return (
                                    <div className="flex border-t border-gray-200" style={{ backgroundColor: info.priceBgColor || '#fff9f0' }}>
                                        {/* Transaction switcher removed to prevent visual clutter; handled in form */}
 
                                        <div className="w-1/3 text-gray-600 font-bold py-2 pl-4 flex items-center">{label}</div>
                                        <div className="w-2/3 font-extrabold py-2 pl-4 flex items-center" style={{ color: info.priceTextColor || 'var(--theme-primary)' }}>
                                            <EditableText value={price} onChange={(val) => handleTextChange('priceMain', val)} />
                                        </div>
                                    </div>
                                );
                            })()}

                        </div>
                    </div>
 
                    {/* Agent Footer Details */}
                    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3.5 mt-3 flex flex-col justify-center shadow-sm">
                        <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1.5 text-sm">
                            <span className="text-gray-500 font-bold">遺?숈궛紐?/span>
                            <span className="text-gray-800 font-extrabold">
                                <EditableText value={info.agentName} onChange={(val) => handleTextChange('agentName', val)} />
                            </span>
 
                            <span className="text-gray-500 font-bold">?대떦??/span>
                            <span className="text-gray-800 font-extrabold">
                                <EditableText value={info.agentRepresentative} onChange={(val) => handleTextChange('agentRepresentative', val)} />
                            </span>
 
                            <span className="text-gray-500 font-bold">?곕씫泥?/span>
                            <span className="text-[var(--theme-primary)] font-black text-base">
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
                            aspectRatioClass="object-cover"
                        />
                    </div>
                    <div>
                        <SectionTitle 
                            title={info.investmentTitle || "INVESTMENT SUMMARY"} 
                            subtitle={info.investmentSubtitle || "?ъ옄?붿빟"} 
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
                        <div className="flex gap-4 border-l-4 border-[var(--theme-primary)] pl-4">
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
        {getPageStatus(2).shouldRender && (
        <ReportPage layoutTheme={layoutTheme} colorTheme={colorTheme}
            pageNumber={2} 
            pageString={getPageStatus(2).pageString}
            isHidden={getPageStatus(2).isHidden}
            title={info.page2Title || "留ㅻЪ?ㅻ챸 & ?쒖꽭"} 
            onUpdateTitle={(val) => handleTextChange('page2Title', val)}
            subtitle={info.page2Subtitle || "Status & Valuation"} 
            onUpdateSubtitle={(val) => handleTextChange('page2Subtitle', val)}
            badgeText={info.pageBadges?.page2 || ""}
            exportId="page-2"
            onUpdateBadge={(val) => {
                if (onUpdateInfo) {
                    onUpdateInfo({
                        ...info,
                        pageBadges: { ...(info.pageBadges || {}), page2: val }
                    });
                }
            }}
            footerText={info.footerText || "CONFIDENTIAL | INFORMATION MEMORANDUM"}
            onUpdateFooter={(val) => handleTextChange('footerText', val)}
        >
                        <div className="flex gap-8 h-full w-full">
                <div className="w-full h-full flex flex-col">
                    <div className="text-gray-600 font-bold text-sm mb-4">
                        <EditableText 
                            value={info.page2HighlightHeader || "PROPERTY INFORMATION & VALUE"} 
                            onChange={(val) => handleTextChange('page2HighlightHeader', val)} 
                        />
                    </div>
                    <div className="flex-1 flex gap-6">
                        {/* Left Half: Highlights */}
                        <div className="w-1/2 border border-gray-200 rounded-lg p-6 bg-white shadow-sm flex flex-col">
                            <h3 className="text-xl font-extrabold text-gray-900 mb-4 border-b-2 border-gray-800 pb-2 inline-block">
                                <EditableText 
                                    value={info.page2HighlightBoxTitle || "留ㅻЪ ?듭떖 ?섏씠?쇱씠??} 
                                    onChange={(val) => handleTextChange('page2HighlightBoxTitle', val)} 
                                />
                            </h3>
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
                                        <span className="text-[#cc5a27] font-bold">??/span>
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
                            </ul>
                            
                            <div className="mt-auto">
                                <div className="text-[10px] font-bold tracking-widest text-[var(--theme-primary)] uppercase mb-1">
                                    <EditableText 
                                        value={(info as any).valuationAdvisoryTitle || "STRATEGIC ADVISORY"} 
                                        onChange={(val) => handleTextChange('valuationAdvisoryTitle', val)} 
                                    />
                                </div>
                                <div className="text-xs text-gray-600 leading-relaxed">
                                    <EditableBlock value={info.valuationText || ""} onChange={(val) => handleTextChange('valuationText', val)} />
                                </div>
                            </div>
                        </div>

                        {/* Right Half: Chart */}
                        <div className="w-1/2 border border-gray-200 rounded-lg p-6 bg-white shadow-sm flex flex-col justify-between">
                            <h3 className="text-xl font-extrabold text-gray-900 mb-4 border-b-2 border-[var(--theme-primary)] pb-2 inline-block">
                                <EditableText 
                                    value={(info as any).page2ChartBoxTitle || "二쇰??쒖꽭 由ы룷??} 
                                    onChange={(val) => handleTextChange('page2ChartBoxTitle', val)} 
                                />
                            </h3>
                            {(() => {
                                const showChart = info.showChart !== false;
                                const chartBars = info.chartBars || [
                                    { label: "?곸긽媛먯젙媛", value: "80", isHighlight: false },
                                    { label: "湲곗〈 ?щ쭩媛", value: "75", isHighlight: false },
                                    { label: "?멸렐 ?쒖꽭", value: "85", isHighlight: false },
                                    { label: "?꾩옱 湲됰ℓ媛", value: "65", isHighlight: true }
                                ];

                                return (
                                    <div className="relative group/chart flex flex-col h-full justify-center">
                                        {/* Hover Chart Controls */}
                                        <div className="absolute -top-3 right-0 opacity-0 group-hover/chart:opacity-100 transition-all duration-200 z-30 flex gap-2 print:hidden">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (onUpdateInfo) {
                                                        onUpdateInfo({
                                                            ...info,
                                                            showChart: !showChart
                                                        });
                                                    }
                                                }}
                                                className="px-2 py-1 bg-slate-900 text-white rounded text-[9px] font-bold shadow flex items-center gap-1 active:scale-95 cursor-pointer"
                                            >
                                                {showChart ? "?뱤 洹몃옒???④린湲? : "?뱤 洹몃옒??蹂댁씠湲?}
                                            </button>
                                            {showChart && chartBars.length < 6 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (onUpdateInfo) {
                                                            const newBars = [...chartBars, { label: "????ぉ", value: "70", isHighlight: false }];
                                                            onUpdateInfo({
                                                                ...info,
                                                                chartBars: newBars
                                                            });
                                                        }
                                                    }}
                                                    className="px-2 py-1 bg-[var(--theme-primary)] text-white rounded text-[9px] font-bold shadow flex items-center gap-1 active:scale-95 cursor-pointer"
                                                >
                                                    ????ぉ 異붽?
                                                </button>
                                            )}
                                        </div>

                                        {showChart ? (
                                            <div className="animate-fadeIn mt-auto mb-auto">
                                                {/* Chart Bars */}
                                                <div className="h-40 flex items-end justify-around px-4 border-b border-slate-200 pb-2 mb-2 relative">
                                                    {chartBars.map((bar: any, idx: number) => {
                                                        const numericValues = chartBars.map((b: any) => parseFloat(b.value) || 0);
                                                        const maxVal = Math.max(...numericValues, 1);
                                                        const heightPercent = Math.max(15, Math.min(95, Math.round(((parseFloat(bar.value) || 0) / maxVal) * 90)));

                                                        return (
                                                            <div key={idx} className="flex flex-col items-center justify-end h-full relative w-20 group/bar">
                                                                {/* Delete single bar button on hover */}
                                                                {chartBars.length > 2 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (onUpdateInfo) {
                                                                                const newBars = chartBars.filter((_: any, i: number) => i !== idx);
                                                                                onUpdateInfo({
                                                                                    ...info,
                                                                                    chartBars: newBars
                                                                                });
                                                                            }
                                                                        }}
                                                                        className="absolute -top-3 p-0.5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover/bar:opacity-100 transition-opacity z-20 cursor-pointer shadow print:hidden"
                                                                        title="??젣"
                                                                    >
                                                                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                                        </svg>
                                                                    </button>
                                                                )}

                                                                {/* Editable Value Badge above the bar */}
                                                                <div className="text-[10px] font-extrabold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded shadow-sm border border-slate-200/50 mb-1 leading-none hover:bg-amber-100 transition-colors">
                                                                    <EditableText 
                                                                        value={bar.value} 
                                                                        onChange={(val) => {
                                                                            if (onUpdateInfo) {
                                                                                const newBars = [...chartBars];
                                                                                newBars[idx] = { ...newBars[idx], value: val };
                                                                                onUpdateInfo({ ...info, chartBars: newBars });
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>

                                                                {/* The Dynamic Bar */}
                                                                <div 
                                                                    className={`w-12 rounded-t transition-all duration-500 shadow-sm relative cursor-pointer ${
                                                                        bar.isHighlight || idx === chartBars.length - 1
                                                                            ? 'bg-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/90' 
                                                                            : 'bg-slate-300 hover:bg-slate-400'
                                                                    }`}
                                                                    style={{ height: `${heightPercent}%` }}
                                                                    title="?대┃?섏뿬 媛뺤“ ?됱긽 蹂寃?
                                                                    onClick={() => {
                                                                        if (onUpdateInfo) {
                                                                            const newBars = [...chartBars];
                                                                            newBars[idx] = { ...newBars[idx], isHighlight: !newBars[idx].isHighlight };
                                                                            onUpdateInfo({ ...info, chartBars: newBars });
                                                                        }
                                                                    }}
                                                                >
                                                                    {(bar.isHighlight || idx === chartBars.length - 1) && (
                                                                        <div className="absolute inset-x-0 top-0 h-1 bg-white/20 rounded-t"></div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Chart Labels */}
                                                <div className="flex justify-around px-4 text-[10px] font-bold text-gray-500">
                                                    {chartBars.map((bar: any, idx: number) => (
                                                        <div key={idx} className={`w-20 text-center truncate ${bar.isHighlight || idx === chartBars.length - 1 ? 'text-[var(--theme-primary)]' : ''}`}>
                                                            <EditableText 
                                                                value={bar.label} 
                                                                onChange={(val) => {
                                                                    if (onUpdateInfo) {
                                                                        const newBars = [...chartBars];
                                                                        newBars[idx] = { ...newBars[idx], label: val };
                                                                        onUpdateInfo({ ...info, chartBars: newBars });
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="border-2 border-dashed border-slate-200 rounded-xl py-8 px-4 text-center text-slate-400 text-xs font-semibold hover:bg-slate-50 cursor-pointer animate-fadeIn print:hidden mt-auto mb-auto"
                                                 onClick={() => {
                                                     if (onUpdateInfo) {
                                                         onUpdateInfo({
                                                             ...info,
                                                             showChart: true
                                                         });
                                                     }
                                                 }}>
                                                ?뱤 ?쒖꽭 遺꾩꽍 洹몃옒?꾧? ?④? 泥섎━?섏뿀?듬땲?? ?대┃?섏뿬 ?ㅼ떆 ?쒖떆?섍린
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                            <div className="mt-auto pt-6 border-t border-gray-100">
                                <div className="text-[10px] font-bold tracking-widest text-[var(--theme-primary)] uppercase mb-1">
                                    <EditableText 
                                        value={(info as any).chartAdvisoryTitle || "STRATEGIC ADVISORY"} 
                                        onChange={(val) => handleTextChange('chartAdvisoryTitle', val)} 
                                    />
                                </div>
                                <div className="text-xs text-gray-600 leading-relaxed">
                                    <EditableBlock value={(info as any).chartAdviseText || "蹂??먯궛???쒖꽭??理쒓렐 ?ㅺ굅?섍? 諛??쒖옣 ?숉뼢??諛섏쁺?섏뿬 ?곗텧?섏뿀?듬땲?? ?낆? 議곌굔???곕Ⅸ ?꾨━誘몄뾼???댁옱?섏뼱 ?덉뼱 ?ν썑 媛移??곸듅??湲곕??⑸땲??"} onChange={(val) => handleTextChange('chartAdviseText', val)} placeholder="洹몃옒??遺꾩꽍 諛?議곗뼵 ?낅젰..." />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
</ReportPage>
        )}

        {/* PAGE 3: LEASE STATUS (NEW DYNAMIC TABLE PAGE) */}
        {getPageStatus(3).shouldRender && (
        <ReportPage layoutTheme={layoutTheme} colorTheme={colorTheme}
            pageNumber={3} 
            pageString={getPageStatus(3).pageString}
            isHidden={getPageStatus(3).isHidden}
            title={info.page3Title || "?꾨? ?곸꽭 ?꾪솴"} 
            onUpdateTitle={(val) => handleTextChange('page3Title', val)}
            subtitle={info.page3Subtitle || "Rent Roll"} 
            onUpdateSubtitle={(val) => handleTextChange('page3Subtitle', val)}
            badgeText={info.pageBadges?.page3 || "RENT ROLL"}
            exportId="page-3"
            onUpdateBadge={(val) => {
                if (onUpdateInfo) {
                    onUpdateInfo({
                        ...info,
                        pageBadges: { ...(info.pageBadges || {}), page3: val }
                    });
                }
            }}
            footerText={info.footerText || "CONFIDENTIAL | INFORMATION MEMORANDUM"}
            onUpdateFooter={(val) => handleTextChange('footerText', val)}
        >
            {(() => {
                const leaseTable = info.leaseTable || {
                    headers: ["痢듭닔", "?몄떎", "硫댁쟻", "湲덉븸", "?꾩슜??, "湲고?"],
                    rows: [
                        ["吏??5痢?, "501??, "165.2??, "蹂댁쬆湲?1??/ ?붿꽭 450留?, "?щТ??, "利됱떆?낆＜"],
                        ["吏??4痢?, "401??, "165.2??, "蹂댁쬆湲?1??/ ?붿꽭 450留?, "?숈썝", "?꾨?以?],
                    ]
                };
                const headers = leaseTable.headers;
                const rows = leaseTable.rows;

                const updateCell = (rIdx: number, cIdx: number, val: string) => {
                    if (!onUpdateInfo) return;
                    const newRows = rows.map((r, ri) => ri === rIdx ? r.map((c, ci) => ci === cIdx ? val : c) : r);
                    onUpdateInfo({
                        ...info,
                        leaseTable: { ...leaseTable, rows: newRows }
                    });
                };

                const updateHeader = (cIdx: number, val: string) => {
                    if (!onUpdateInfo) return;
                    const newHeaders = headers.map((h, ci) => ci === cIdx ? val : h);
                    onUpdateInfo({
                        ...info,
                        leaseTable: { ...leaseTable, headers: newHeaders }
                    });
                };

                const addColumn = (insertIdx: number) => {
                    if (!onUpdateInfo) return;
                    const newHeaders = [...headers];
                    newHeaders.splice(insertIdx, 0, "????);
                    const newRows = rows.map(r => {
                        const newR = [...r];
                        newR.splice(insertIdx, 0, "");
                        return newR;
                    });
                    
                    const currentWidths = leaseTable.widths || new Array(headers.length).fill(Math.round(100 / headers.length));
                    const newWidths = [...currentWidths];
                    newWidths.splice(insertIdx, 0, 15); // Add default new width 15%
                    
                    onUpdateInfo({
                        ...info,
                        leaseTable: { ...leaseTable, headers: newHeaders, rows: newRows, widths: newWidths }
                    });
                };

                const deleteColumn = (colIdx: number) => {
                    if (!onUpdateInfo || headers.length <= 1) return;
                    const newHeaders = headers.filter((_, ci) => ci !== colIdx);
                    const newRows = rows.map(r => r.filter((_, ci) => ci !== colIdx));
                    
                    const currentWidths = leaseTable.widths || new Array(headers.length).fill(Math.round(100 / headers.length));
                    const newWidths = currentWidths.filter((_, ci) => ci !== colIdx);
                    
                    onUpdateInfo({
                        ...info,
                        leaseTable: { ...leaseTable, headers: newHeaders, rows: newRows, widths: newWidths }
                    });
                };

                const clearTableContents = () => {
                    if (!onUpdateInfo) return;
                    const newRows = rows.map(r => new Array(headers.length).fill(""));
                    onUpdateInfo({
                        ...info,
                        leaseTable: { ...leaseTable, rows: newRows }
                    });
                };



                const addRow = () => {
                    if (!onUpdateInfo) return;
                    const newRows = [...rows, new Array(headers.length).fill("")];
                    onUpdateInfo({
                        ...info,
                        leaseTable: { ...leaseTable, rows: newRows }
                    });
                };

                const deleteRow = (rIdx: number) => {
                    if (!onUpdateInfo) return;
                    const newRows = rows.filter((_, ri) => ri !== rIdx);
                    onUpdateInfo({
                        ...info,
                        leaseTable: { ...leaseTable, rows: newRows }
                    });
                };

                const duplicateRow = (rIdx: number) => {
                    if (!onUpdateInfo) return;
                    const newRows = [...rows];
                    newRows.splice(rIdx + 1, 0, [...rows[rIdx]]);
                    onUpdateInfo({
                        ...info,
                        leaseTable: { ...leaseTable, rows: newRows }
                    });
                };

                const moveRow = (rIdx: number, dir: number) => {
                    if (!onUpdateInfo) return;
                    const targetIdx = rIdx + dir;
                    if (targetIdx < 0 || targetIdx >= rows.length) return;
                    const newRows = [...rows];
                    const temp = newRows[rIdx];
                    newRows[rIdx] = newRows[targetIdx];
                    newRows[targetIdx] = temp;
                    onUpdateInfo({
                        ...info,
                        leaseTable: { ...leaseTable, rows: newRows }
                    });
                };

                const handleResizeStart = (e: React.MouseEvent, colIdx: number) => {
                    e.preventDefault();
                    if (!onUpdateInfo) return;
                    
                    const startX = e.clientX;
                    const currentWidths = leaseTable.widths || new Array(headers.length).fill(Math.round(100 / headers.length));
                    const startWidth = currentWidths[colIdx];
                    
                    const tableEl = (e.currentTarget as HTMLElement).closest('table');
                    const tableWidth = tableEl ? tableEl.offsetWidth : 800;
                    
                    let finalWidths = [...currentWidths];
                    
                    const onMouseMove = (moveEvent: MouseEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        const deltaPercent = (deltaX / tableWidth) * 100;
                        
                        finalWidths[colIdx] = Math.max(5, startWidth + deltaPercent);
                        
                        if (colIdx + 1 < finalWidths.length) {
                             const nextStartWidth = currentWidths[colIdx + 1];
                             finalWidths[colIdx + 1] = Math.max(5, nextStartWidth - deltaPercent);
                        }
                        
                        // Update DOM directly for high performance (prevent React re-render lag)
                        const thElements = tableEl?.querySelectorAll('th');
                        if (thElements) {
                            if (thElements[colIdx]) thElements[colIdx].style.width = `${finalWidths[colIdx]}%`;
                            if (colIdx + 1 < thElements.length) thElements[colIdx + 1].style.width = `${finalWidths[colIdx + 1]}%`;
                        }
                    };
                    
                    const onMouseUp = () => {
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                        
                        // Commit to React state only when dragging finishes
                        onUpdateInfo({
                            ...info,
                            leaseTable: { ...leaseTable, widths: finalWidths }
                        });
                    };
                    
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                };

                return (
                    <div className="flex flex-col h-full w-full">
                        <div className="text-gray-600 font-bold text-sm mb-4">
                            <EditableText 
                                value={(info as any).page3HighlightHeader || "PROPERTY RENTAL REPORT"} 
                                onChange={(val) => handleTextChange('page3HighlightHeader', val)} 
                            />
                        </div>
                        <div className="w-full flex-1 flex flex-col justify-between bg-white rounded-2xl border border-slate-100 p-6 shadow-sm overflow-visible relative group/table">
                        {/* Global Table Controls */}
                        <div className="absolute top-4 right-6 flex items-center gap-2 print:hidden z-20 opacity-0 group-hover/table:opacity-100 transition-opacity" data-html2canvas-ignore="true">
                            <button type="button" onClick={addRow} className="text-[10px] bg-[var(--theme-primary)] hover:opacity-80 text-white px-2 py-1 rounded shadow-sm font-bold cursor-pointer transition-opacity">????異붽?</button>
                            <button type="button" onClick={() => addColumn(headers.length)} className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-1 rounded shadow-sm font-bold border border-blue-200 cursor-pointer transition-colors">????異붽?</button>
                            <button type="button" onClick={clearTableContents} className="text-[10px] bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded shadow-sm font-bold border border-red-100 cursor-pointer transition-colors">?뿊截??댁슜 吏?곌린</button>
                        </div>
                        <div className="overflow-visible flex-1 mt-6 relative">
                            <table className="w-full text-left border-collapse table-fixed">
                                <thead>
                                    <tr>
                                        {headers.map((h, colIdx) => {
                                            const currentWidths = leaseTable.widths || new Array(headers.length).fill(Math.round(100 / headers.length));
                                            const colWidth = currentWidths[colIdx];
                                            return (
                                                <th 
                                                    key={colIdx} 
                                                    className="border border-slate-200 p-2.5 text-xs font-extrabold text-white text-center uppercase relative group/header overflow-visible"
                                                    style={{ 
                                                        backgroundColor: colorTheme.primary,
                                                        width: `${colWidth}%`
                                                    }}
                                                >
                                                    <EditableText 
                                                        value={h} 
                                                        onChange={(val) => updateHeader(colIdx, val)}
                                                    />
                                                    
                                                    {/* Resize Handle */}
                                                    {colIdx < headers.length - 1 && (
                                                        <div 
                                                            className="absolute top-0 -right-2 w-4 h-full cursor-col-resize z-50 flex items-center justify-center opacity-0 group-hover/header:opacity-100 hover:bg-white/20 transition-colors"
                                                            onMouseDown={(e) => handleResizeStart(e, colIdx)}
                                                            title="?쒕옒洹명븯???덈퉬 議곗젅"
                                                        >
                                                            <div className="w-0.5 h-1/2 bg-white/50 rounded-full"></div>
                                                        </div>
                                                    )}

                                                    {/* Hover Delete Column */}
                                                    {headers.length > 1 && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => deleteColumn(colIdx)}
                                                            className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-red-500 hover:bg-red-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shadow-md cursor-pointer print:hidden opacity-0 group-hover/header:opacity-100 transition-opacity z-[100]"
                                                            title="????젣"
                                                        >
                                                            ??
                                                        </button>
                                                    )}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, rowIdx) => (
                                        <tr key={rowIdx} className="hover:bg-slate-50/50 transition-colors group/row relative">
                                            {row.map((cell, colIdx) => (
                                                <td 
                                                    key={colIdx} 
                                                    className="border border-slate-200 p-2.5 text-xs text-slate-700 font-semibold relative text-center whitespace-normal break-all"
                                                >
                                                    <EditableText 
                                                        value={cell || ""} 
                                                        onChange={(val) => updateCell(rowIdx, colIdx, val)}
                                                    />
                                                    
                                                    {/* Hover Delete Row (shown on the last cell of the row) */}
                                                    {colIdx === row.length - 1 && rows.length > 1 && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => deleteRow(rowIdx)}
                                                            className="absolute top-1/2 -right-3 transform -translate-y-1/2 bg-red-500 hover:bg-red-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shadow-md cursor-pointer print:hidden opacity-0 group-hover/row:opacity-100 transition-opacity z-[100]"
                                                            title="????젣"
                                                        >
                                                            ??
                                                        </button>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Custom Total / Summary Block & Explanation */}
                        <div className="flex gap-4 mt-4 shrink-0 items-stretch">
                            <div className={`${(info as any).showLeaseSummaryDesc !== false ? 'w-1/2' : 'w-full'} bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col gap-2 shadow-sm`}>
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2 mb-1 shrink-0">
                                    Total Summary
                                </span>
                                <div className="text-xs font-bold text-slate-800 flex-1 leading-relaxed whitespace-pre-wrap">
                                    <EditableBlock 
                                        value={(info as any).leaseSummaryText || "珥?6?몃? / 蹂댁쬆湲?0??/ ?붿꽭 0??} 
                                        onChange={(val) => handleTextChange('leaseSummaryText', val)} 
                                    />
                                </div>
                            </div>
                            
                            {(info as any).showLeaseSummaryDesc !== false && (
                                <div className="w-1/2 bg-white border border-slate-200 rounded-lg p-4 text-xs text-slate-600 shadow-sm leading-relaxed whitespace-pre-wrap flex flex-col">
                                    <EditableBlock 
                                        value={(info as any).leaseSummaryDesc || "?꾨? ?섏씡瑜?諛??곸꽭 議곌굔? ?묒쓽 媛?ν빀?덈떎."} 
                                        onChange={(val) => handleTextChange('leaseSummaryDesc', val)} 
                                    />
                                </div>
                            )}
                        </div>

                        {/* Notice text block */}
                        <div className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100 leading-normal shrink-0">
                            <EditableBlock 
                                value={info.leaseNotice || ""} 
                                onChange={(val) => handleTextChange('leaseNotice', val)}
                            />
                        </div>
                    </div>
                    </div>
                );
            })()}
        </ReportPage>
        )}

        {/* PAGE 4: PHOTOS */}
        {getPageStatus(4).shouldRender && (
        <ReportPage layoutTheme={layoutTheme} colorTheme={colorTheme}
            pageNumber={4} 
            pageString={getPageStatus(4).pageString}
            isHidden={getPageStatus(4).isHidden}
            title={info.page4Title || "留ㅻЪ ?ъ쭊"} 
            onUpdateTitle={(val) => handleTextChange('page4Title', val)}
            subtitle={info.page4Subtitle || "Property Photo"} 
            onUpdateSubtitle={(val) => handleTextChange('page4Subtitle', val)}
            badgeText={info.pageBadges?.page4 !== undefined ? info.pageBadges.page4 : ""}
            exportId="page-4"
            onUpdateBadge={(val) => {
                if (onUpdateInfo) {
                    onUpdateInfo({
                        ...info,
                        pageBadges: { ...(info.pageBadges || {}), page4: val }
                    });
                }
            }}
            footerText={info.footerText || "CONFIDENTIAL | INFORMATION MEMORANDUM"}
            onUpdateFooter={(val) => handleTextChange('footerText', val)}
        >
            {(() => {
                // Group active uploaded photos
                const activePhotos = [
                    { src: mainImage, key: 'mainImage', captionKey: 'main', label: "Exterior" },
                    { src: subImage1, key: 'subImage1', captionKey: 'sub1', label: "Side View" },
                    { src: subImage2, key: 'subImage2', captionKey: 'sub2', label: "Entrance" },
                    { src: featureImage1, key: 'featureImage1', captionKey: 'feat1', label: "Interior" },
                    { src: featureImage2, key: 'featureImage2', captionKey: 'feat2', label: "Rooftop" }
                ].filter(p => p.src);

                const count = activePhotos.length;

                // Case 0: No photos uploaded
                if (count === 0) {
                    return (
                        <div className="w-full h-[550px] border-4 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-50 hover:border-amber-400 transition-all p-8 relative cursor-pointer group">
                            <EditableImage 
                                src="" 
                                alt="No Photos" 
                                imageKey="mainImage"
                                onImageUpload={onImageUpload}
                                isUploading={isUploadingImage?.mainImage}
                                aspectRatioClass="object-cover"
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center">
                                <span className="text-4xl mb-3">?벝</span>
                                <h3 className="text-base font-bold text-gray-700 mb-1">?깅줉???꾩옣 ?ъ쭊???놁뒿?덈떎</h3>
                                <p className="text-xs text-gray-400 max-w-sm">留덉슦?ㅻ? ?щ젮 [?ъ쭊 ?낅줈?? 踰꾪듉???꾨Ⅴ嫄곕굹 醫뚯륫 ?ъ씠?쒕컮?먯꽌 ?ъ쭊??異붽???二쇱꽭?? (理쒕? 5???깅줉 媛??</p>
                            </div>
                        </div>
                    );
                }

                // Case 1: Single photo (100% full height & width)
                if (count === 1) {
                    const p = activePhotos[0];
                    const captionValue = info.photoCaptions?.[p.captionKey] !== undefined ? info.photoCaptions[p.captionKey] : p.label;
                    return (
                        <div className="w-full h-[550px] relative rounded-2xl overflow-hidden shadow-md group">
                            <EditableImage 
                                src={p.src || ""} 
                                alt={p.label} 
                                imageKey={p.key}
                                onImageUpload={onImageUpload}
                                onDelete={() => onDeleteImage && onDeleteImage(p.key)}
                                isUploading={isUploadingImage?.[p.key]}
                                aspectRatioClass="object-cover"
                            />
                            <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/85 to-transparent z-20">
                                <span className="text-white font-bold relative z-30 text-sm">
                                    <EditableText 
                                        value={captionValue} 
                                        onChange={(val) => {
                                            if (onUpdateInfo) {
                                                onUpdateInfo({
                                                    ...info,
                                                    photoCaptions: { ...(info.photoCaptions || {}), [p.captionKey]: val }
                                                });
                                            }
                                        }}
                                        className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-white"
                                    />
                                </span>
                            </div>
                        </div>
                    );
                }

                // Case 2: 2 photos (50/50 tall side-by-side columns)
                if (count === 2) {
                    return (
                        <div className="flex gap-4 h-[550px] w-full">
                            {activePhotos.map((p, idx) => {
                                const captionValue = info.photoCaptions?.[p.captionKey] !== undefined ? info.photoCaptions[p.captionKey] : p.label;
                                return (
                                    <div key={idx} className="w-1/2 relative h-full rounded-2xl overflow-hidden shadow-md group">
                                        <EditableImage 
                                            src={p.src || ""} 
                                            alt={p.label} 
                                            imageKey={p.key}
                                            onImageUpload={onImageUpload}
                                            onDelete={() => onDeleteImage && onDeleteImage(p.key)}
                                            isUploading={isUploadingImage?.[p.key]}
                                            aspectRatioClass="object-cover"
                                        />
                                        <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/85 to-transparent z-20">
                                            <span className="text-white font-bold relative z-30 text-sm">
                                                <EditableText 
                                                    value={captionValue} 
                                                    onChange={(val) => {
                                                        if (onUpdateInfo) {
                                                            onUpdateInfo({
                                                                ...info,
                                                                photoCaptions: { ...(info.photoCaptions || {}), [p.captionKey]: val }
                                                            });
                                                        }
                                                    }}
                                                    className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-white"
                                                />
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                }

                // Case 3: 3 photos (Left 1 large 60%, Right 2 stacked vertically 40%)
                if (count === 3) {
                    const largePhoto = activePhotos[0];
                    const small1 = activePhotos[1];
                    const small2 = activePhotos[2];
                    
                    const largeCaption = info.photoCaptions?.[largePhoto.captionKey] !== undefined ? info.photoCaptions[largePhoto.captionKey] : largePhoto.label;
                    
                    return (
                        <div className="flex gap-4 h-[550px] w-full">
                            <div className="w-[60%] relative h-full rounded-2xl overflow-hidden shadow-md group">
                                <EditableImage 
                                    src={largePhoto.src || ""} 
                                    alt={largePhoto.label} 
                                    imageKey={largePhoto.key}
                                    onImageUpload={onImageUpload}
                                    onDelete={() => onDeleteImage && onDeleteImage(largePhoto.key)}
                                    isUploading={isUploadingImage?.[largePhoto.key]}
                                    aspectRatioClass="object-cover"
                                />
                                <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/85 to-transparent z-20">
                                    <span className="text-white font-bold relative z-30 text-sm">
                                        <EditableText 
                                            value={largeCaption} 
                                            onChange={(val) => {
                                                if (onUpdateInfo) {
                                                    onUpdateInfo({
                                                        ...info,
                                                        photoCaptions: { ...(info.photoCaptions || {}), [largePhoto.captionKey]: val }
                                                    });
                                                }
                                            }}
                                            className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-white"
                                        />
                                    </span>
                                </div>
                            </div>
                            
                            <div className="w-[40%] flex flex-col gap-4 h-full">
                                {[small1, small2].map((p, idx) => {
                                    const captionValue = info.photoCaptions?.[p.captionKey] !== undefined ? info.photoCaptions[p.captionKey] : p.label;
                                    return (
                                        <div key={idx} className="h-[calc(50%-8px)] relative rounded-2xl overflow-hidden shadow-md group">
                                            <EditableImage 
                                                src={p.src || ""} 
                                                alt={p.label} 
                                                imageKey={p.key}
                                                onImageUpload={onImageUpload}
                                                onDelete={() => onDeleteImage && onDeleteImage(p.key)}
                                                isUploading={isUploadingImage?.[p.key]}
                                                aspectRatioClass="object-cover"
                                            />
                                            <div className="absolute bottom-0 left-0 w-full p-3 bg-gradient-to-t from-black/85 to-transparent z-20">
                                                <span className="text-white font-bold relative z-30 text-xs">
                                                    <EditableText 
                                                        value={captionValue} 
                                                        onChange={(val) => {
                                                            if (onUpdateInfo) {
                                                                onUpdateInfo({
                                                                    ...info,
                                                                    photoCaptions: { ...(info.photoCaptions || {}), [p.captionKey]: val }
                                                                });
                                                            }
                                                        }}
                                                        className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-white"
                                                    />
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                }

                // Case 4: 4 photos (2x2 grid)
                if (count === 4) {
                    return (
                        <div className="grid grid-cols-2 grid-rows-2 gap-4 h-[550px] w-full">
                            {activePhotos.map((p, idx) => {
                                const captionValue = info.photoCaptions?.[p.captionKey] !== undefined ? info.photoCaptions[p.captionKey] : p.label;
                                return (
                                    <div key={idx} className="relative rounded-2xl overflow-hidden shadow-md group">
                                        <EditableImage 
                                            src={p.src || ""} 
                                            alt={p.label} 
                                            imageKey={p.key}
                                            onImageUpload={onImageUpload}
                                            onDelete={() => onDeleteImage && onDeleteImage(p.key)}
                                            isUploading={isUploadingImage?.[p.key]}
                                            aspectRatioClass="object-cover"
                                        />
                                        <div className="absolute bottom-0 left-0 w-full p-3 bg-gradient-to-t from-black/85 to-transparent z-20">
                                            <span className="text-white font-bold relative z-30 text-xs">
                                                <EditableText 
                                                    value={captionValue} 
                                                    onChange={(val) => {
                                                        if (onUpdateInfo) {
                                                            onUpdateInfo({
                                                                ...info,
                                                                photoCaptions: { ...(info.photoCaptions || {}), [p.captionKey]: val }
                                                            });
                                                        }
                                                    }}
                                                    className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-white"
                                                />
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                }

                // Case 5: 5 photos (Magazine layout: Left 1 large, Right 4 small)
                const mainP = activePhotos[0];
                const mainCaption = info.photoCaptions?.[mainP.captionKey] !== undefined ? info.photoCaptions[mainP.captionKey] : mainP.label;
                return (
                    <div className="flex gap-4 h-[550px] w-full">
                        {/* Main Large Photo */}
                        <div className="w-1/2 relative h-full group">
                            <EditableImage 
                                src={mainP.src || ""} 
                                alt={mainP.label} 
                                imageKey={mainP.key}
                                onImageUpload={onImageUpload}
                                onDelete={() => onDeleteImage && onDeleteImage(mainP.key)}
                                isUploading={isUploadingImage?.[mainP.key]}
                                aspectRatioClass="object-cover"
                            />
                            <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/85 to-transparent z-20">
                                <span className="text-white font-bold relative z-30">
                                    <EditableText 
                                        value={mainCaption} 
                                        onChange={(val) => {
                                            if (onUpdateInfo) {
                                                onUpdateInfo({
                                                    ...info,
                                                    photoCaptions: { ...(info.photoCaptions || {}), [mainP.captionKey]: val }
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
                            {[activePhotos[1], activePhotos[2], activePhotos[3], activePhotos[4]].map((p, i) => {
                                const captionValue = info.photoCaptions?.[p.captionKey] !== undefined ? info.photoCaptions[p.captionKey] : p.label;
                                return (
                                    <div key={i} className="relative rounded-xl overflow-hidden shadow-md bg-gray-200 group">
                                        <EditableImage 
                                            src={p.src || ""} 
                                            alt={p.label || ""} 
                                            imageKey={p.key}
                                            onImageUpload={onImageUpload}
                                            onDelete={() => onDeleteImage && onDeleteImage(p.key)}
                                            isUploading={isUploadingImage?.[p.key]}
                                            aspectRatioClass="object-cover"
                                        />
                                        <div className="absolute bottom-0 left-0 w-full p-3 bg-gradient-to-t from-[var(--theme-dark)]/90 to-transparent z-20">
                                            <span className="text-white font-bold text-sm relative z-30">
                                                <EditableText 
                                                    value={captionValue} 
                                                    onChange={(val) => {
                                                        if (onUpdateInfo) {
                                                            onUpdateInfo({
                                                                ...info,
                                                                photoCaptions: { ...(info.photoCaptions || {}), [p.captionKey]: val }
                                                            });
                                                        }
                                                    }}
                                                    className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-white"
                                                />
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}
        </ReportPage>
        )}

        {/* PAGE 5: AREA ANALYSIS */}
        {getPageStatus(5).shouldRender && (
        <ReportPage layoutTheme={layoutTheme} colorTheme={colorTheme}
            pageNumber={5} 
            pageString={getPageStatus(5).pageString}
            isHidden={getPageStatus(5).isHidden}
            title={info.page5Title || "?낆? 諛??꾩튂??} 
            onUpdateTitle={(val) => handleTextChange('page5Title', val)}
            subtitle={info.page5Subtitle || "Strategic Connectivity"} 
            onUpdateSubtitle={(val) => handleTextChange('page5Subtitle', val)}
            badgeText={info.pageBadges?.page5 || "AREA ANALYSIS"}
            exportId="page-5"
            onUpdateBadge={(val) => {
                if (onUpdateInfo) {
                    onUpdateInfo({
                        ...info,
                        pageBadges: { ...(info.pageBadges || {}), page5: val }
                    });
                }
            }}
            footerText={info.footerText || "CONFIDENTIAL | INFORMATION MEMORANDUM"}
            onUpdateFooter={(val) => handleTextChange('footerText', val)}
        >
            <div className="flex flex-col h-[550px] gap-6">
                <div className="flex gap-6 h-3/4">
                    {/* Map Box */}
                    <div className="w-2/3 border border-gray-200 rounded-2xl overflow-hidden relative shadow-sm bg-gray-50 flex items-center justify-center group/map z-10">
                        {/* Map Mode Picker Overlay (print:hidden, visible on hover) */}
                        <div className="absolute top-4 left-4 z-[40] flex items-center gap-1 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl p-1 shadow-md opacity-0 group-hover/map:opacity-100 transition-opacity duration-200 print:hidden">
                            {[
                                { type: "kakao", label: "移댁뭅?? },
                                { type: "google", label: "援ш?" },
                                { type: "upload", label: "?대?吏 ?낅줈?? }
                            ].map(opt => (
                                <button
                                    key={opt.type}
                                    type="button"
                                    onClick={() => handleTextChange('mapType', opt.type)}
                                    className={`px-2 py-1 rounded-lg text-[9px] font-extrabold transition-colors cursor-pointer border-none ${
                                        (info.mapType || "kakao") === opt.type 
                                            ? "bg-[#cc5a27] text-white" 
                                            : "hover:bg-gray-100 text-gray-600 bg-transparent"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        {(!info.mapType || info.mapType === "kakao") && (
                            info.address ? (
                                <KakaoMap address={info.address} />
                            ) : (
                                <div className="text-gray-400 font-bold">二쇱냼瑜??낅젰?섎㈃ 吏?꾧? ?쒖떆?⑸땲??</div>
                            )
                        )}

                        {info.mapType === "google" && (
                            info.address ? (
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
                                <div className="text-gray-400 font-bold">二쇱냼瑜??낅젰?섎㈃ 吏?꾧? ?쒖떆?⑸땲??</div>
                            )
                        )}

                        {info.mapType === "upload" && (
                            <div className="w-full h-full relative">
                                <EditableImage 
                                    src={mapImage || ""} 
                                    alt="Uploaded Location Map" 
                                    imageKey="mapImage"
                                    onImageUpload={onImageUpload}
                                    onDelete={() => onDeleteImage && onDeleteImage('mapImage')}
                                    isUploading={isUploadingImage?.mapImage}
                                    aspectRatioClass="object-cover"
                                />
                                {!mapImage && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 text-center">
                                        <svg className="w-8 h-8 text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-[10px] text-gray-400 font-bold">留덉슦?ㅻ? ?щ젮 吏?꾨? ?낅줈?쒗븯?몄슂</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Direct Naver Map link on canvas (print:hidden) */}
                        {info.address && (
                            <a 
                                href={info.agentMapUrl || `https://map.naver.com/p/search/${encodeURIComponent(info.address)}`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="absolute bottom-4 left-4 bg-white/95 text-slate-800 hover:bg-white active:scale-95 font-extrabold px-3 py-1.5 rounded-xl shadow-lg text-[10px] flex items-center gap-1.5 transition-all border border-gray-200 z-20 print:hidden"
                                title="?ㅼ씠踰?吏?꾨줈 ?먯꽭??蹂닿린"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 text-green-600">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25z" />
                                </svg>
                                <span>?ㅼ씠踰?吏?꾨줈 蹂닿린</span>
                            </a>
                        )}

                        <div className="absolute top-4 right-4 bg-[var(--theme-dark)] text-white p-3 rounded-lg shadow-lg border border-gray-700 z-20">
                            <div className="text-[#e29d45] text-[10px] font-bold tracking-widest uppercase mb-1">
                                <EditableText 
                                    value={info.page4TargetLocationHeader || "TARGET LOCATION"} 
                                    onChange={(val) => handleTextChange('page4TargetLocationHeader', val)} 
                                    className="text-[#e29d45]"
                                />
                            </div>
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
                    <div className="w-1/3 bg-[var(--theme-dark)] rounded-2xl p-8 flex flex-col shadow-md text-white">
                        <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-6">
                            <svg className="w-6 h-6 text-[#e29d45]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </div>
                        <h3 className="text-[#e29d45] text-2xl font-bold mb-4 leading-snug whitespace-pre-wrap">
                            <EditableBlock 
                                value={info.page4TargetTitle || ((info.areaTargetName?.split('\n')[0] || "") + " ?대윭?ㅽ꽣")} 
                                onChange={(val) => handleTextChange('page4TargetTitle', val)}
                                className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-[#e29d45]"
                            />
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

        {/* PAGE 6: ROADMAP */}
        {getPageStatus(6).shouldRender && (
        <ReportPage layoutTheme={layoutTheme} colorTheme={colorTheme}
            pageNumber={6} 
            pageString={getPageStatus(6).pageString}
            isHidden={getPageStatus(6).isHidden}
            title={info.page6Title || "媛移?諛?濡쒕뱶留?} 
            onUpdateTitle={(val) => handleTextChange('page6Title', val)}
            subtitle={info.page6Subtitle || "Value & Roadmap"} 
            onUpdateSubtitle={(val) => handleTextChange('page6Subtitle', val)}
            badgeText={info.pageBadges?.page6 || "INVESTMENT ROADMAP"}
            exportId="page-6"
            onUpdateBadge={(val) => {
                if (onUpdateInfo) {
                    onUpdateInfo({
                        ...info,
                        pageBadges: { ...(info.pageBadges || {}), page6: val }
                    });
                }
            }}
            footerText={info.footerText || "CONFIDENTIAL | INFORMATION MEMORANDUM"}
            onUpdateFooter={(val) => handleTextChange('footerText', val)}
        >
            <div className="h-[480px] overflow-hidden">
                {(() => {
                    const list = info.roadmapList || [1, 2, 3, 4].map((i, index) => ({
                        title: (info.roadmap as any)?.[`box${i}Title`] || "",
                        text: (info.roadmap as any)?.[`box${i}Text`] || "",
                        icon: (info.roadmap as any)?.[`box${i}Icon`] || ['?룫', '?룪', '?뱢', '?룛截?][index] || '?룫',
                        bg: ['bg-[var(--theme-primary)]/10', 'bg-green-50', 'bg-red-50', 'bg-yellow-50'][index] || 'bg-gray-50',
                        border: ['border-blue-100', 'border-green-100', 'border-red-100', 'border-yellow-100'][index] || 'border-gray-200'
                    }));
                    
                    return (
                        <div className={`grid grid-cols-2 gap-6 h-full ${
                            list.length <= 2 ? 'grid-rows-1' :
                            list.length <= 4 ? 'grid-rows-2' : 'grid-rows-3'
                        }`}>
                            {list.map((item: any, idx: number) => (
                                <div key={idx} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex items-center gap-5 hover:shadow-md transition-shadow">
                                    <div className={`w-16 h-16 shrink-0 ${item.bg} rounded-xl border ${item.border} flex items-center justify-center cursor-text transition-colors hover:bg-black/5`}>
                                        <EditableText 
                                            value={item.icon} 
                                            onChange={(val) => {
                                                if (onUpdateInfo) {
                                                    const newList = [...list];
                                                    newList[idx] = { ...newList[idx], icon: val };
                                                    onUpdateInfo({ ...info, roadmapList: newList });
                                                }
                                            }}
                                            className="text-3xl text-center bg-transparent min-w-[36px]"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-extrabold text-gray-900 mb-2">
                                            <EditableText 
                                                value={item.title} 
                                                onChange={(val) => {
                                                    if (onUpdateInfo) {
                                                        const newList = [...list];
                                                        newList[idx] = { ...newList[idx], title: val };
                                                        onUpdateInfo({ ...info, roadmapList: newList });
                                                    }
                                                }}
                                            />
                                        </h3>
                                        <div className="text-gray-500 text-xs leading-relaxed">
                                            <EditableBlock 
                                                value={item.text} 
                                                onChange={(val) => {
                                                    if (onUpdateInfo) {
                                                        const newList = [...list];
                                                        newList[idx] = { ...newList[idx], text: val };
                                                        onUpdateInfo({ ...info, roadmapList: newList });
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })()}
            </div>
            
            <div className="mt-8 text-right pr-4">
                <p className="text-gray-500 italic font-serif-kr text-lg">
                    <EditableText 
                        value={info.page6FooterQuote || '"理쒓퀬???낆???誘몃옒 媛移섎? ?뷀빀?덈떎."'} 
                        onChange={(val) => handleTextChange('page6FooterQuote', val)} 
                    />
                </p>
            </div>
        </ReportPage>
        )}

        {/* PAGE 7: CONTACT / ENDING */}
        {getPageStatus(7).shouldRender && (
        <ReportPage layoutTheme={layoutTheme} colorTheme={colorTheme}
            pageNumber={7} 
            pageString={getPageStatus(7).pageString}
            isHidden={getPageStatus(7).isHidden}
            title={info.agentName || "미래에셋공인중개사사무소"} 
            subtitle="Contact Us"
            badgeText="CONTACT"
        >
            <div className="flex flex-col items-center justify-center h-full w-full relative -mt-10">
                <div className="absolute top-10 left-10 opacity-10">
                    <svg className="w-64 h-64 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </div>

                <div className="z-10 w-full flex flex-col items-center mb-10">
                    <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-2">THANK YOU</h1>
                    <div className="w-16 h-1 bg-[var(--theme-primary)] mb-6"></div>
                    <p className="text-gray-500 font-bold text-lg tracking-widest text-center">
                        성공적인 투자를 위한 최고의 파트너가 되겠습니다.
                    </p>
                </div>

                <div className="z-10 w-full max-w-4xl grid grid-cols-5 gap-8 mt-4 bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
                    <div className="col-span-2 flex flex-col items-center justify-center border-r border-gray-100 pr-8">
                        <div className="w-48 h-48 rounded-full overflow-hidden mb-6 shadow-inner border-4 border-gray-50 bg-gray-100 relative">
                            {info.agentPhotoKey ? (
                                <img src={info.agentPhotoKey} alt="Agent" className="w-full h-full object-cover" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                    <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <h3 className="text-2xl font-black text-gray-900">{info.agentRepresentative || "김민혁 과장"}</h3>
                        <p className="text-[var(--theme-primary)] font-bold mb-4">{info.agentName || "미래에셋공인 중개사 사무소"}</p>
                    </div>
                    
                    <div className="col-span-3 flex flex-col justify-center pl-4">
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold mb-0.5">MOBILE</p>
                                    <p className="text-lg font-bold text-gray-800">{info.agentMobile || "010-5554-4444"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold mb-0.5">OFFICE</p>
                                    <p className="text-lg font-bold text-gray-800">{info.agentPhone || "02-1234-5678"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 mt-6 p-4 bg-gray-50 rounded-xl">
                                <div className="w-16 h-16 bg-white rounded-lg p-1 border border-gray-200 shrink-0 flex items-center justify-center relative shadow-sm">
                                    {info.contactQRLink ? (
                                        <div className="w-full h-full relative border border-dashed border-gray-300 rounded overflow-hidden">
                                            {/* Placeholder for QR Code */}
                                            <svg className="w-full h-full text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 10h4a1 1 0 001-1V5a1 1 0 00-1-1H3a1 1 0 00-1 1v4a1 1 0 001 1zm0 11h4a1 1 0 001-1v-4a1 1 0 00-1-1H3a1 1 0 00-1 1v4a1 1 0 001 1zm11-11h4a1 1 0 001-1V5a1 1 0 00-1-1h-4a1 1 0 00-1 1v4a1 1 0 001 1zm0 11h4a1 1 0 001-1v-4a1 1 0 00-1-1h-4a1 1 0 00-1 1v4a1 1 0 001 1z" />
                                            </svg>
                                        </div>
                                    ) : (
                                        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                        </svg>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="text-[11px] text-gray-500 font-bold mb-1">MORE INFORMATION</p>
                                    <div className="flex gap-2">
                                        {info.contactYoutube && <span className="bg-red-50 text-red-600 text-[10px] px-2 py-0.5 rounded font-black border border-red-100">YOUTUBE</span>}
                                        {info.contactBlog && <span className="bg-green-50 text-green-600 text-[10px] px-2 py-0.5 rounded font-black border border-green-100">BLOG</span>}
                                        {info.contactWebsite && <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded font-black border border-blue-100">WEBSITE</span>}
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1.5 break-all leading-tight">{info.contactQRLink || "https://gongsilnews.com"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="absolute bottom-12 right-0 left-0 flex justify-center z-10 opacity-70">
                    <div className="h-12 w-48 relative grayscale">
                        {info.agencyLogoKey ? (
                            <img src={info.agencyLogoKey} alt="Agency Logo" className="w-full h-full object-contain" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold text-xl tracking-widest border border-dashed border-gray-200 rounded">LOGO</div>
                        )}
                    </div>
                </div>
            </div>
        </ReportPage>
        )}
    </div>
  );
});

FlyerCanvas.displayName = 'FlyerCanvas';

export default FlyerCanvas;




