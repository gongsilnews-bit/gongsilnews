
import React, { forwardRef } from 'react';
import { FlyerState, FlyerSection } from '../types';
import { MapPinIcon } from '@heroicons/react/24/outline';
import { PhoneIcon } from '@heroicons/react/24/solid';

interface FlyerCanvasProps {
  data: FlyerState;
  onTextChange?: (key: keyof typeof FlyerState.prototype.info, value: string) => void;
  onSectionTextChange?: (sectionId: string, itemId: string, key: 'title' | 'text', value: string) => void;
  onImageClick?: (imageKey: string) => void;
}

const FlyerCanvas = forwardRef<HTMLDivElement, FlyerCanvasProps>(({ data, onTextChange, onSectionTextChange, onImageClick }, ref) => {
  const { info, mainImage, colorTheme, layoutTheme } = data; 
  const primaryColor = colorTheme?.primary || '#00788c';
  const secondaryColor = colorTheme?.secondary || '#00c6d7';
  const darkColor = colorTheme?.dark || '#003845';
  
  // Font Classes
  const headingFont = layoutTheme?.headingFont || 'font-serif-kr';
  const bodyFont = layoutTheme?.bodyFont || 'font-sans';
  const layout = layoutTheme?.type || 'type1';

  const editClass = "outline-none focus:outline focus:outline-2 focus:outline-sky-400 focus:bg-sky-400/10 hover:ring-1 hover:ring-sky-300 rounded transition-all cursor-text";
  const placeholder = "https://placehold.co/860x600/e2e8f0/1e293b?text=Property";
  const mainImgSrc = mainImage || placeholder;
  
  const getImage = (key: string) => {
      const img = data[key];
      return typeof img === 'string' ? img : null;
  };

  const formatPrice = (value: string) => {
    const num = parseInt(value.replace(/[^0-9]/g, ''), 10);
    if (isNaN(num)) return value;
    if (value.includes('억')) return value;
    if (num >= 10000) {
        const eok = Math.floor(num / 10000);
        const man = num % 10000;
        return `${eok}억${man > 0 ? ` ${man.toLocaleString()}` : ''}`;
    }
    return value;
  };

  const getPriceLabel = (type: string) => {
      if (type === '매매') return '매매가';
      if (type === '전세') return '전세금';
      if (type === '월세' || type === '단기임대') return '보증금 / 월세';
      return '가격';
  };

  const isRent = info.transactionType === '월세' || info.transactionType === '단기임대';

  // --- Layout Renderers ---

  // 1. Hero Section Renderer
  const renderHero = () => {
    // Common elements
    const tag = (
        <div className={`inline-block px-3 py-1 border text-xs font-medium mb-4 w-fit tracking-wider ${layout === 'type3' ? 'border-gray-800 text-gray-800' : 'border-white/30 text-white'}`}>
             <span contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onTextChange?.('transactionType', e.currentTarget.innerText)} className={editClass}>{info.transactionType || '거래 유형'}</span>
        </div>
    );
    const title = <h1 contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onTextChange?.('address', e.currentTarget.innerText)} className={`font-bold leading-tight mb-2 tracking-tight drop-shadow-sm max-w-full break-words ${headingFont} ${editClass} ${layout === 'type5' ? 'text-5xl md:text-8xl' : 'text-4xl md:text-7xl'}`}>{info.address}</h1>;
    const slogan = <p contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onTextChange?.('promotionText', e.currentTarget.innerText)} className={`font-bold mb-4 drop-shadow-md max-w-full break-words ${headingFont} ${editClass} ${layout === 'type5' ? 'text-2xl md:text-4xl' : 'text-2xl md:text-5xl'} ${layout === 'type3' ? 'text-gray-800 hover:bg-black/5' : 'text-white'}`}>{info.promotionText}</p>;
    const subtitle = <p contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onTextChange?.('subTitle', e.currentTarget.innerText)} className={`text-base md:text-xl font-medium ${editClass} ${layout === 'type3' ? 'text-gray-600 hover:bg-black/5' : 'text-white opacity-90'}`} style={{ color: layout === 'type3' ? undefined : secondaryColor }}>{info.subTitle}</p>;

    let content = null;
    switch (layout) {
        case 'type1': // Modern Overlay (Bottom Left)
            content = (
                <div className="relative h-[500px] md:h-[650px] flex flex-col">
                    <div className="absolute inset-0 z-0">
                        <img onClick={() => onImageClick?.('mainImage')} src={mainImgSrc} className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" title="클릭하여 메인 이미지 변경" />
                        <div className="absolute inset-0" style={{ background: `linear-gradient(to right, ${darkColor}E6, transparent)` }}></div>
                    </div>
                    <div className="relative z-10 p-8 md:p-16 flex flex-col h-full justify-center text-white items-start text-left">
                        <div className="w-12 h-1 mb-8" style={{ backgroundColor: secondaryColor }}></div>
                        {tag}
                        {title}
                        {slogan}
                        {subtitle}
                    </div>
                </div>
            );
            break;
        case 'type2': // Luxury Center (Centered with Frame)
            content = (
                <div className="relative h-[500px] md:h-[650px] flex flex-col">
                    <div className="absolute inset-0 z-0">
                        <img onClick={() => onImageClick?.('mainImage')} src={mainImgSrc} className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" title="클릭하여 메인 이미지 변경" />
                        <div className="absolute inset-0 bg-black/40"></div>
                    </div>
                    <div className="relative z-10 p-6 md:p-12 h-full flex items-center justify-center">
                        <div className="border border-white/40 p-6 md:p-12 w-full h-full flex flex-col items-center justify-center text-center text-white overflow-hidden">
                            <span contentEditable spellCheck={false} suppressContentEditableWarning className={`mb-4 text-xl md:text-2xl font-serif-en italic max-w-full break-words ${editClass}`} style={{ color: secondaryColor }}>Prestige Collection</span>
                            {title}
                            <div className="w-20 h-px bg-white/50 my-6"></div>
                            {slogan}
                            <p contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onTextChange?.('subTitle', e.currentTarget.innerText)} className={`mt-4 w-full text-sm md:text-lg font-light tracking-widest uppercase max-w-full break-keep break-words ${editClass}`}>{info.subTitle}</p>
                        </div>
                    </div>
                </div>
            );
            break;
        case 'type3': // Natural Clean (Top Left, No Overlay)
            content = (
                <div className="relative h-[500px] md:h-[650px] flex flex-col bg-white">
                     {/* Image takes bottom 80% */}
                     <div className="h-[70%] md:h-[80%] w-full absolute bottom-0 right-0 z-0">
                        <img onClick={() => onImageClick?.('mainImage')} src={mainImgSrc} className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" title="클릭하여 메인 이미지 변경" />
                     </div>
                     {/* Text Block Top Left Floating */}
                     <div className="relative z-10 p-8 md:p-12 bg-white/95 w-[90%] md:w-2/3 shadow-sm rounded-br-3xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-2 h-8 md:h-12" style={{ backgroundColor: primaryColor }}></div>
                            <span contentEditable spellCheck={false} suppressContentEditableWarning className={`text-xl md:text-3xl font-bold text-gray-800 tracking-widest ${editClass}`}>PREMIUM</span>
                        </div>
                        <h1 contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onTextChange?.('address', e.currentTarget.innerText)} className={`text-4xl md:text-6xl font-bold text-gray-900 mb-4 ${headingFont} ${editClass}`}>{info.address}</h1>
                        <p contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onTextChange?.('promotionText', e.currentTarget.innerText)} className={`text-xl md:text-3xl text-gray-600 font-medium mb-2 ${editClass}`}>{info.promotionText}</p>
                     </div>
                </div>
            );
            break;
        case 'type4': // Bold Box (Text in White Box Bottom Right)
             content = (
                <div className="relative h-[500px] md:h-[650px] flex flex-col">
                    <div className="absolute inset-0 z-0">
                        <img onClick={() => onImageClick?.('mainImage')} src={mainImgSrc} className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" title="클릭하여 메인 이미지 변경" />
                    </div>
                    <div className="absolute bottom-6 right-6 md:bottom-12 md:right-12 z-10 bg-white/95 p-6 md:p-10 max-w-[90%] md:max-w-xl shadow-2xl border-l-8" style={{ borderColor: primaryColor }}>
                        <div contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onTextChange?.('transactionType', e.currentTarget.innerText)} className={`text-xs md:text-sm font-bold tracking-widest mb-2 text-gray-500 uppercase ${editClass}`}>{info.transactionType}</div>
                        <h1 contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onTextChange?.('address', e.currentTarget.innerText)} className={`text-3xl md:text-5xl font-extrabold text-gray-900 mb-2 leading-tight ${headingFont} ${editClass}`}>{info.address}</h1>
                        <p contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onTextChange?.('promotionText', e.currentTarget.innerText)} className={`text-xl md:text-3xl font-bold mb-4 ${headingFont} ${editClass}`} style={{ color: primaryColor }}>{info.promotionText}</p>
                        <p contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onTextChange?.('subTitle', e.currentTarget.innerText)} className={`text-gray-600 text-sm leading-relaxed border-t pt-4 border-gray-200 ${editClass}`}>{info.subTitle}</p>
                    </div>
                </div>
             );
             break;
        case 'type5': // High-end Minimal (Huge Typography)
             content = (
                <div className="relative h-[500px] md:h-[700px] flex flex-col">
                    <div className="absolute inset-0 z-0">
                        <img onClick={() => onImageClick?.('mainImage')} src={mainImgSrc} className="w-full h-full object-cover grayscale-[30%] contrast-125 cursor-pointer hover:opacity-90 transition-opacity" title="클릭하여 메인 이미지 변경" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                    </div>
                    <div className="relative z-10 p-8 md:p-12 flex flex-col justify-end h-full">
                        <p contentEditable spellCheck={false} suppressContentEditableWarning className={`text-white/80 text-sm md:text-lg tracking-[0.5em] mb-4 uppercase font-light ${editClass}`}>Residence</p>
                        <h1 contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onTextChange?.('address', e.currentTarget.innerText)} className={`text-6xl md:text-8xl font-black text-white mb-2 tracking-tighter ${headingFont} ${editClass}`}>{info.address}</h1>
                        <div className="flex items-end gap-4">
                            <p contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onTextChange?.('promotionText', e.currentTarget.innerText)} className={`text-3xl md:text-6xl font-thin text-white tracking-tight ${editClass}`}>{info.promotionText}</p>
                        </div>
                    </div>
                </div>
             );
             break;
        default: return null;
    }

    return <div data-export-id="hero">{content}</div>;
  };

  // 2. Stats Section Renderer
  const renderStats = () => {
      const statsItems = [
          { label: 'Price', value: `${formatPrice(info.priceMain)}${isRent && info.priceSub ? ` / ${info.priceSub}` : ''}`, sub: getPriceLabel(info.transactionType) },
          { label: 'Area', value: info.area.split('/')[0], sub: '전용면적' },
          { label: 'Rooms', value: info.roomCount, sub: '방 / 욕실' },
          { label: 'Move-in', value: info.moveInDate.split(' ')[0], sub: '입주가능일' }
      ];

      let content = null;
      switch (layout) {
          case 'type1': // Floating Overlap
              content = (
                <div className="relative z-20 -mt-16 mx-4 md:mx-12 bg-white shadow-xl flex flex-wrap md:flex-nowrap rounded-sm overflow-hidden min-h-[100px]">
                    {statsItems.map((item, i) => (
                        <div key={i} className="w-1/2 md:flex-1 py-6 px-4 border-r border-b md:border-b-0 border-gray-100 flex flex-col items-center justify-center text-center group hover:bg-gray-50">
                            <span contentEditable spellCheck={false} suppressContentEditableWarning className={`text-[10px] text-gray-400 font-bold tracking-widest mb-1 uppercase ${editClass}`}>{item.label}</span>
                            <span contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => {
                                if (i === 0) onTextChange?.('priceMain', e.currentTarget.innerText);
                                if (i === 1) onTextChange?.('area', e.currentTarget.innerText);
                                if (i === 2) onTextChange?.('roomCount', e.currentTarget.innerText);
                                if (i === 3) onTextChange?.('moveInDate', e.currentTarget.innerText);
                            }} className="text-lg md:text-xl font-bold whitespace-nowrap ${editClass}" style={{ color: primaryColor }}>{item.value}</span>
                            <span contentEditable spellCheck={false} suppressContentEditableWarning className={`text-[10px] text-gray-400 mt-1 ${editClass}`}>{item.sub}</span>
                        </div>
                    ))}
                </div>
              );
              break;
          case 'type2': // Simple Divider Bar
              content = (
                  <div className="bg-white py-10 border-b border-gray-200">
                      <div className="flex flex-col md:flex-row justify-center md:divide-x divide-gray-300 gap-8 md:gap-0">
                          {statsItems.map((item, i) => (
                              <div key={i} className="px-0 md:px-12 text-center">
                                  <span contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => {
                                      if (i === 0) onTextChange?.('priceMain', e.currentTarget.innerText);
                                      if (i === 1) onTextChange?.('area', e.currentTarget.innerText);
                                      if (i === 2) onTextChange?.('roomCount', e.currentTarget.innerText);
                                      if (i === 3) onTextChange?.('moveInDate', e.currentTarget.innerText);
                                  }} className={`block text-2xl font-bold text-gray-800 mb-1 ${editClass} ${headingFont}`}>{item.value}</span>
                                  <span contentEditable spellCheck={false} suppressContentEditableWarning className={`text-xs uppercase tracking-widest text-gray-500 font-serif-en ${editClass}`}>{item.label}</span>
                              </div>
                          ))}
                      </div>
                  </div>
              );
              break;
          case 'type3': // Solid Color Bar (Prugio)
              content = (
                  <div className="py-8 text-white flex flex-wrap md:flex-nowrap justify-around items-center gap-4" style={{ backgroundColor: primaryColor }}>
                      {statsItems.map((item, i) => (
                          <div key={i} className="text-center w-1/2 md:w-auto mb-4 md:mb-0">
                              <span contentEditable spellCheck={false} suppressContentEditableWarning className={`block text-sm opacity-70 mb-1 ${editClass}`}>{item.sub}</span>
                              <span contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => {
                                  if (i === 0) onTextChange?.('priceMain', e.currentTarget.innerText);
                                  if (i === 1) onTextChange?.('area', e.currentTarget.innerText);
                                  if (i === 2) onTextChange?.('roomCount', e.currentTarget.innerText);
                                  if (i === 3) onTextChange?.('moveInDate', e.currentTarget.innerText);
                              }} className="block text-xl md:text-2xl font-bold ${editClass}">{item.value}</span>
                          </div>
                      ))}
                  </div>
              );
              break;
           case 'type4': // Grid Box (Hillstate)
               content = (
                   <div className="bg-gray-100 p-6 md:p-12">
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                           {statsItems.map((item, i) => (
                               <div key={i} className="bg-white p-6 border-t-4 shadow-sm" style={{ borderColor: primaryColor }}>
                                   <span contentEditable spellCheck={false} suppressContentEditableWarning className={`block text-xs font-bold text-gray-400 uppercase mb-2 ${editClass}`}>{item.label}</span>
                                   <span contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => {
                                       if (i === 0) onTextChange?.('priceMain', e.currentTarget.innerText);
                                       if (i === 1) onTextChange?.('area', e.currentTarget.innerText);
                                       if (i === 2) onTextChange?.('roomCount', e.currentTarget.innerText);
                                       if (i === 3) onTextChange?.('moveInDate', e.currentTarget.innerText);
                                   }} className="block text-lg md:text-xl font-extrabold text-gray-900 ${editClass}">{item.value}</span>
                               </div>
                           ))}
                       </div>
                   </div>
               );
               break;
           case 'type5': // Minimal Text Row (Acro)
               content = (
                   <div className="bg-black text-white py-12 px-6 md:px-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-0">
                       {statsItems.map((item, i) => (
                           <div key={i} className="flex flex-col">
                               <span contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => {
                                   if (i === 0) onTextChange?.('priceMain', e.currentTarget.innerText);
                                   if (i === 1) onTextChange?.('area', e.currentTarget.innerText);
                                   if (i === 2) onTextChange?.('roomCount', e.currentTarget.innerText);
                                   if (i === 3) onTextChange?.('moveInDate', e.currentTarget.innerText);
                               }} className="text-3xl md:text-4xl font-thin tracking-tighter mb-1 ${editClass}" style={{ color: i === 0 ? secondaryColor : 'white' }}>{item.value}</span>
                               <span contentEditable spellCheck={false} suppressContentEditableWarning className={`text-xs font-bold text-gray-500 uppercase tracking-[0.2em] ${editClass}`}>{item.label}</span>
                           </div>
                       ))}
                   </div>
               );
               break;
          default: return null;
      }
      return <div data-export-id="stats">{content}</div>;
  };

  // Section Headers Renderer Helper
  const renderSectionHeader = (title: string, intro?: string, description?: string) => {
      if (layout === 'type2') {
          return (
            <div className="flex flex-col items-center mb-12 text-center">
                <div contentEditable spellCheck={false} suppressContentEditableWarning className={`font-serif-en italic text-base md:text-lg mb-2 tracking-wide ${editClass}`} style={{ color: secondaryColor }}>{intro}</div>
                <h2 contentEditable spellCheck={false} suppressContentEditableWarning className={`text-2xl md:text-3xl font-bold text-gray-800 mb-6 ${headingFont} ${editClass}`}>{title}</h2>
                <div className="w-10 h-0.5" style={{ backgroundColor: primaryColor }}></div>
                {description && <p contentEditable spellCheck={false} suppressContentEditableWarning className={`mt-4 text-gray-500 max-w-xl font-serif-kr text-sm md:text-base ${editClass}`}>{description}</p>}
            </div>
          );
      }
      if (layout === 'type3') {
          return (
            <div className="mb-10 border-b pb-4 border-gray-200">
                <span contentEditable spellCheck={false} suppressContentEditableWarning className={`text-sm font-bold tracking-widest uppercase text-gray-400 mb-1 block ${editClass}`}>{intro}</span>
                <h2 contentEditable spellCheck={false} suppressContentEditableWarning className={`text-2xl md:text-3xl font-bold text-gray-800 ${headingFont} ${editClass}`} style={{ color: primaryColor }}>{title}</h2>
                {description && <p contentEditable spellCheck={false} suppressContentEditableWarning className={`mt-2 text-gray-600 text-sm md:text-base ${editClass}`}>{description}</p>}
            </div>
          );
      }
      if (layout === 'type4') {
        return (
            <div className="mb-12 flex items-center gap-4">
                <div className="w-4 h-12" style={{ backgroundColor: primaryColor }}></div>
                <div>
                    <h2 contentEditable spellCheck={false} suppressContentEditableWarning className={`text-2xl md:text-3xl font-extrabold text-gray-900 uppercase ${headingFont} ${editClass}`}>{title}</h2>
                    <span contentEditable spellCheck={false} suppressContentEditableWarning className={`text-sm font-bold text-gray-400 tracking-widest ${editClass}`}>{intro}</span>
                </div>
            </div>
        );
      }
      if (layout === 'type5') {
        return (
            <div className="mb-16">
                 <h2 contentEditable spellCheck={false} suppressContentEditableWarning className={`text-4xl md:text-5xl font-thin text-gray-900 mb-2 ${headingFont} ${editClass}`}>{title}</h2>
                 <p contentEditable spellCheck={false} suppressContentEditableWarning className={`text-xs font-bold text-gray-400 uppercase tracking-[0.3em] ${editClass}`}>{intro}</p>
                 {description && <p contentEditable spellCheck={false} suppressContentEditableWarning className={`mt-6 text-lg md:text-xl font-light text-gray-600 ${editClass}`}>{description}</p>}
            </div>
        );
      }
      // Default Type 1
      return (
        <div className="flex flex-col items-center mb-12 text-center">
            <div contentEditable spellCheck={false} suppressContentEditableWarning className={`font-serif-en italic text-base md:text-lg mb-2 tracking-wide ${editClass}`} style={{ color: primaryColor }}>{intro}</div>
            <h2 className={`text-2xl md:text-3xl font-bold text-gray-800 mb-6 ${headingFont}`}>{title}</h2>
            <div className="w-10 h-0.5" style={{ backgroundColor: primaryColor }}></div>
            {description && <p contentEditable spellCheck={false} suppressContentEditableWarning className={`mt-4 text-gray-500 max-w-xl text-sm md:text-base ${editClass}`}>{description}</p>}
        </div>
      );
  };

  const renderGridSection = (section: FlyerSection) => {
    const itemCount = section.items.length;
    let gridColsClass = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
    if (itemCount === 1) gridColsClass = 'grid-cols-1';
    else if (itemCount === 2) gridColsClass = 'grid-cols-1 md:grid-cols-2';
    else if (itemCount === 3) gridColsClass = 'grid-cols-1 md:grid-cols-3';

    return (
        <div key={section.id} data-export-id={section.id} className={`py-20 px-6 md:px-12 ${layout === 'type4' ? 'bg-white' : 'bg-gray-50'}`}>
            {renderSectionHeader(section.title, section.intro)}

            <div className={`grid ${gridColsClass} gap-6 h-auto md:h-80`}>
                {section.items.map((item, idx) => {
                     const imgSrc = getImage(item.imageKey) || placeholder;
                     return (
                        <div key={item.id} className={`relative h-64 md:h-full group overflow-hidden ${layout === 'type4' ? 'rounded-none border-2 border-gray-100' : 'rounded-sm shadow-md hover:shadow-xl'} transition-all`}>
                            <img onClick={() => onImageClick?.(item.imageKey)} src={imgSrc} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 cursor-pointer" title="이미지 변경" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-90 pointer-events-none"></div>
                            <div className="absolute bottom-0 left-0 w-full p-6 text-white transform transition-transform duration-300 group-hover:-translate-y-2">
                                <span className="text-[10px] font-bold tracking-widest mb-2 block pointer-events-none" style={{ color: secondaryColor }}>0{idx + 1}</span>
                                <span contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onSectionTextChange?.(section.id, item.id, 'text', e.currentTarget.innerText)} className={`font-bold text-lg leading-tight block ${editClass} ${headingFont}`}>{item.text}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };

  const renderListSection = (section: FlyerSection) => {
    return (
        <div key={section.id} data-export-id={section.id} className="py-20 bg-white">
             <div className="px-6 md:px-12">
                 {renderSectionHeader(section.title, section.intro, section.description)}
             </div>

            {section.items.map((item, idx) => {
                const imgSrc = getImage(item.imageKey) || placeholder;
                const isReversed = idx % 2 === 1;
                
                // Style switch for list items
                if (layout === 'type4') {
                     return (
                        <div key={item.id} className="grid grid-cols-1 md:grid-cols-2 mb-12 mx-6 md:mx-12 border-b border-gray-100 pb-12">
                            <div className={`h-[250px] md:h-[300px] ${isReversed ? 'md:order-2' : ''}`}>
                                <img onClick={() => onImageClick?.(item.imageKey)} src={imgSrc} className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" title="이미지 변경" />
                            </div>
                            <div className={`flex flex-col justify-center p-8 bg-gray-50 ${isReversed ? 'md:order-1' : ''}`}>
                                <h4 contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onSectionTextChange?.(section.id, item.id, 'title', e.currentTarget.innerText)} className={`text-xl md:text-2xl font-extrabold text-gray-900 mb-4 ${editClass} ${headingFont}`}>{item.title}</h4>
                                <p contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onSectionTextChange?.(section.id, item.id, 'text', e.currentTarget.innerText)} className={`text-gray-800 text-base md:text-sm leading-8 ${editClass} ${bodyFont}`}>{item.text}</p>
                            </div>
                        </div>
                     )
                }

                if (layout === 'type5') {
                    return (
                        <div key={item.id} className="mb-24 px-6 md:px-12">
                            <div className="mb-6">
                                <span className="text-4xl md:text-6xl font-thin text-gray-200 block mb-2 pointer-events-none">0{idx+1}</span>
                                <h4 contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onSectionTextChange?.(section.id, item.id, 'title', e.currentTarget.innerText)} className={`text-2xl md:text-3xl font-bold text-gray-900 ${editClass} ${headingFont}`}>{item.title}</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                                <div className="col-span-1 md:col-span-8 h-[300px] md:h-[400px]">
                                     <img onClick={() => onImageClick?.(item.imageKey)} src={imgSrc} className="w-full h-full object-cover grayscale-[20%] cursor-pointer hover:opacity-90 transition-opacity" title="이미지 변경" />
                                </div>
                                <div className="col-span-1 md:col-span-4 flex items-end">
                                    <p contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onSectionTextChange?.(section.id, item.id, 'text', e.currentTarget.innerText)} className={`text-gray-700 text-base md:text-lg leading-relaxed ${editClass} ${bodyFont}`}>{item.text}</p>
                                </div>
                            </div>
                        </div>
                    )
                }

                // Default Style
                return (
                    <div key={item.id} className={`flex flex-col ${isReversed ? 'md:flex-row-reverse' : 'md:flex-row'} items-stretch mb-0 min-h-[400px]`}>
                         <div className="w-full md:w-1/2 relative overflow-hidden group h-[300px] md:h-auto">
                             <img onClick={() => onImageClick?.(item.imageKey)} src={imgSrc} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 cursor-pointer" title="이미지 변경" />
                         </div>
                         <div className="w-full md:w-1/2 flex flex-col justify-center px-8 md:px-16 py-12 bg-gray-50/50">
                             <div className="w-8 h-0.5 mb-6" style={{ backgroundColor: primaryColor }}></div>
                             <h4 contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onSectionTextChange?.(section.id, item.id, 'title', e.currentTarget.innerText)} className={`text-xl md:text-2xl font-bold text-gray-800 mb-4 ${editClass} ${headingFont}`}>{item.title}</h4>
                             <p contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onSectionTextChange?.(section.id, item.id, 'text', e.currentTarget.innerText)} className={`text-gray-700 text-base md:text-sm leading-8 break-keep whitespace-pre-wrap ${editClass} ${bodyFont}`}>
                                 {item.text}
                             </p>
                         </div>
                    </div>
                );
            })}
        </div>
    );
  };

  const renderTableSection = (section: FlyerSection) => {
    return (
        <div key={section.id} data-export-id={section.id} className="py-20 px-6 md:px-12 bg-white">
            {renderSectionHeader(section.title, section.intro)}
            
            <div className={`border-t-2 ${layout === 'type4' ? 'border-black' : 'border-gray-800'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2">
                    {section.items.map((item, idx) => (
                        <div key={item.id} className={`flex border-b border-gray-200 ${idx % 2 === 1 ? 'md:border-l border-gray-200' : ''}`}>
                            <div contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onSectionTextChange?.(section.id, item.id, 'title', e.currentTarget.innerText)} className={`w-28 md:w-32 py-5 px-3 text-[17px] md:text-sm flex items-center justify-center text-center shrink-0 border-r border-gray-200 ${editClass} ${layout === 'type4' ? 'bg-gray-800 text-white font-extrabold' : 'bg-gray-50 text-gray-800 font-extrabold'}`}>
                                {item.title}
                            </div>
                            <div className={`flex-1 py-5 px-4 text-[18px] md:text-sm text-gray-950 font-extrabold flex items-center break-keep ${bodyFont}`}>
                                {(item.title === '주소' || item.title === '소재지' || item.title === '위치') && item.text ? (
                                    <a 
                                        href={`https://map.naver.com/p/search/${encodeURIComponent(item.text)}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="hover:underline flex items-center gap-1.5"
                                        style={{ color: primaryColor }}
                                        title="네이버 지도로 보기"
                                    >
                                        <MapPinIcon className="w-4 h-4 flex-shrink-0" />
                                        <span contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onSectionTextChange?.(section.id, item.id, 'text', e.currentTarget.innerText)} className={editClass}>{item.text}</span>
                                    </a>
                                ) : (
                                    <span contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onSectionTextChange?.(section.id, item.id, 'text', e.currentTarget.innerText)} className={`w-full ${editClass}`}>{item.text}</span>
                                )}
                            </div>
                        </div>
                    ))}
                    {section.items.length % 2 !== 0 && (
                        <div className="hidden md:flex border-b border-gray-200 border-l border-gray-200">
                             <div className={`w-32 py-5 shrink-0 border-r border-gray-200 ${layout === 'type4' ? 'bg-gray-800' : 'bg-gray-50'}`}></div>
                             <div className="flex-1 py-5 px-4"></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
  };

  const renderSnsSection = (section: FlyerSection) => {
      // Simplified: Just render all items as links
      return (
          <div key={section.id} data-export-id={section.id} className={`py-16 px-6 md:px-12 ${layout === 'type4' ? 'bg-white' : 'bg-gray-50'}`}>
              {renderSectionHeader(section.title, section.intro)}
              
              <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
                  <div className="space-y-4">
                      {section.items.map((item) => {
                          const type = item.imageKey; // 'youtube', 'blog', 'news'
                          const url = item.text;
                          const title = item.title;
                          
                          let badgeClass = "bg-gray-100 text-gray-600";
                          let label = "LINK";
                          
                          if (type === 'youtube') {
                              badgeClass = "bg-red-50 text-red-600";
                              label = "YOUTUBE";
                          } else if (type === 'blog') {
                              badgeClass = "bg-green-50 text-green-600";
                              label = "BLOG";
                          } else if (type === 'news') {
                              badgeClass = "bg-blue-50 text-blue-600";
                              label = "NEWS";
                          }

                          return (
                              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between group gap-2">
                                  <a 
                                    href={url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-start gap-2 hover:underline decoration-gray-400 underline-offset-4 flex-1"
                                  >
                                      <span className="text-gray-300 select-none">↳</span>
                                      <span className={`text-gray-800 font-medium ${bodyFont} group-hover:text-blue-600 transition-colors`}>
                                          {title || url}
                                      </span>
                                  </a>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider w-fit shrink-0 ${badgeClass}`}>
                                      {label}
                                  </span>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      );
  };

  const socialLinks = [
    { key: 'socialYoutube', url: info.socialYoutube, icon: "M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z", viewBox: "0 0 24 24" },
    { key: 'socialBlog', url: info.socialBlog, icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5z", viewBox: "0 0 24 24" }, // Using generic info icon for blog or similar
    { key: 'socialInstagram', url: info.socialInstagram, icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z", viewBox: "0 0 24 24" },
    { key: 'socialFacebook', url: info.socialFacebook, icon: "M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z", viewBox: "0 0 24 24" },
    { key: 'socialKakao', url: info.socialKakao, icon: "M12 2C6.48 2 2 5.92 2 10.75c0 2.82 1.51 5.33 3.87 6.95-.16.6-.58 2.18-.67 2.5-.1.35.13.34.27.25.11-.08 1.83-1.24 2.56-1.74.65.09 1.32.14 2 .14 5.52 0 10-3.92 10-8.75S17.52 2 12 2z", viewBox: "0 0 24 24" },
    { key: 'socialThreads', url: info.socialThreads, icon: "M12.71 14.96c-.33.32-.78.5-1.36.5-1.07 0-1.7-.82-1.7-1.92 0-1.07.63-1.93 1.74-1.93.57 0 1.01.19 1.33.5.14-.3.26-.62.36-.93-.45-.33-1.02-.5-1.74-.5-1.85 0-3.19 1.43-3.19 3.25 0 1.71 1.25 3.08 3.19 3.08 1.25 0 2.07-.5 2.52-1.23l1.1.66c-.66 1.08-1.9 1.85-3.62 1.85-2.6 0-4.52-1.92-4.52-4.36 0-2.52 2.01-4.43 4.62-4.43 2.76 0 4.25 1.87 4.25 4.3 0 .28-.02.55-.05.81h-1.33c.02-.21.03-.43.03-.66 0-1.63-.84-2.9-2.9-2.9-1.99 0-3.19 1.34-3.19 3.16 0 1.95 1.34 3.05 3.17 3.05.9 0 1.55-.31 1.96-.7.15-.33.27-.68.35-1.06zm1.18-4.43c-.15.42-.33.82-.54 1.2.3-.3.57-.65.79-1.05-.08-.06-.16-.11-.25-.15z M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z", viewBox: "0 0 24 24" }
  ];

  const hasSocialLinks = socialLinks.some(link => link.url);




  return (
    <div className="flex justify-center p-4">
      <div 
        ref={ref}
        className={`bg-white shadow-2xl flex flex-col w-full max-w-[860px] mx-auto min-h-[1400px] ${bodyFont}`}
      >
        <style dangerouslySetInnerHTML={{ __html: `
            /* Global font size overrides for Flyer Canvas */
            
            /* Stats Bar values */
            [data-export-id="stats"] .text-lg,
            [data-export-id="stats"] .text-xl,
            [data-export-id="stats"] .md\\:text-xl,
            [data-export-id="stats"] .text-2xl,
            [data-export-id="stats"] .md\\:text-2xl,
            [data-export-id="stats"] .text-3xl,
            [data-export-id="stats"] .md\\:text-3xl {
              font-size: 26px !important;
              font-weight: 900 !important;
            }
            /* Stats Bar labels */
            [data-export-id="stats"] .text-\\[10px\\],
            [data-export-id="stats"] .text-xs,
            [data-export-id="stats"] .opacity-70 {
              font-size: 13px !important;
              font-weight: 700 !important;
            }
            /* Property Info Table Title */
            [data-export-id="basic-info"] h2 {
              font-size: 32px !important;
              font-weight: 900 !important;
            }
            /* Property Info Table Management Fee Label */
            [data-export-id="basic-info"] .text-gray-400 {
              font-size: 14px !important;
              font-weight: 700 !important;
            }
            /* Property Info Table Management Fee Value */
            [data-export-id="basic-info"] .text-xl {
              font-size: 26px !important;
              font-weight: 900 !important;
            }
            /* Table Row Labels */
            [data-export-id="basic-info"] .grid > div > span:first-child {
              font-size: 18px !important;
              font-weight: 800 !important;
            }
            /* Table Row Values */
            [data-export-id="basic-info"] .grid > div > span:last-child {
              font-size: 20px !important;
              font-weight: 900 !important;
            }
            /* Notice Box default (JS loop overrides font-size, padding, margin-top) */
            [data-print-notice-box] {
              padding: 20px;
              margin-top: 16px;
            }
            [data-print-notice-box] > span {
              font-size: 15px !important;
              font-weight: 800 !important;
            }
            [data-print-notice-text] {
              font-size: 16px;
              font-weight: 800 !important;
            }
        `}} />
        {/* 1. HERO SECTION */}
        {renderHero()}

        {/* 2. STATS BAR */}
        {renderStats()}

        {/* 3. INFO TABLE SECTION */}
        <div data-export-id="basic-info" className="pt-20 pb-12 px-6 md:px-12 bg-white">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4 md:gap-0">
                <div>
                    <span contentEditable spellCheck={false} suppressContentEditableWarning className={`font-bold text-xs tracking-widest block mb-1 ${editClass}`} style={{ color: primaryColor }}>PROPERTY INFO</span>
                    <h2 contentEditable spellCheck={false} suppressContentEditableWarning className={`text-2xl md:text-3xl font-bold text-gray-800 ${headingFont} ${editClass}`}>매물 상세 정보</h2>
                </div>
                <div className="text-left md:text-right">
                    <span contentEditable spellCheck={false} suppressContentEditableWarning className={`text-gray-400 text-xs block mb-1 ${editClass}`}>월 관리비</span>
                    <span contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onTextChange?.('managementFee', e.currentTarget.innerText)} className={`text-xl font-bold text-gray-800 ${editClass}`}>{info.managementFee}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-7 text-[16px] md:text-sm">
                {[
                    { l: '공급/전용면적', v: info.area },
                    { l: '해당층/총층', v: info.floor },
                    { l: '방향', v: info.direction },
                    { l: '주차가능대수', v: info.parking },
                    { l: '옵션 정보', v: info.options, full: true }
                ].map((item, i) => (
                    <div key={i} className={`flex justify-between border-b border-gray-150 pb-4 ${item.full ? 'col-span-1 md:col-span-2' : ''}`}>
                        <span contentEditable spellCheck={false} suppressContentEditableWarning className={`text-gray-700 font-bold text-[16px] md:text-sm ${editClass}`}>{item.l}</span>
                        <span contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => { if (item.l === '공급/전용면적') onTextChange?.('area', e.currentTarget.innerText); else if (item.l === '해당층/총층') onTextChange?.('floor', e.currentTarget.innerText); else if (item.l === '방향') onTextChange?.('direction', e.currentTarget.innerText); else if (item.l === '주차가능대수') onTextChange?.('parking', e.currentTarget.innerText); else onTextChange?.('options', e.currentTarget.innerText); }} className={`font-extrabold text-gray-950 text-[18px] md:text-[15px] ${editClass}`}>{item.v}</span>
                    </div>
                ))}

                {/* Notice Box */}
                <div data-print-notice-box className={`col-span-1 md:col-span-2 p-6 mt-4 ${layout === 'type4' ? 'border-2 border-gray-100 bg-white' : 'bg-[#f4f6f8] rounded-sm'}`}>
                    <span className="font-bold block mb-2 text-xs" style={{ color: primaryColor }}>
                        <span contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onTextChange?.('noticeTitle', e.currentTarget.innerText)} className={editClass}>{info.noticeTitle || "DETAIL INFO"}</span>
                    </span>
                    <p data-print-notice-text contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onTextChange?.('noticeContent', e.currentTarget.innerText)} className={`text-gray-950 text-[17px] md:text-sm font-bold leading-relaxed whitespace-pre-wrap ${bodyFont} ${editClass}`}>
                        {info.noticeContent}
                    </p>
                </div>
            </div>
        </div>

        {/* 4. DYNAMIC SECTIONS */}
        <div className="bg-white">
            {info.sections.map(section => {
                if (section.type === 'grid') return renderGridSection(section);
                if (section.type === 'list') return renderListSection(section);
                if (section.type === 'table') return renderTableSection(section);
                if (section.type === 'sns') return renderSnsSection(section);
                return null;
            })}
        </div>

        {/* 5. FOOTER / AGENT INFO */}
        <div data-export-id="agent-info" className={`text-white py-20 px-6 md:px-12 ${layout === 'type5' ? 'bg-black' : ''}`} style={{ backgroundColor: layout === 'type5' ? '#000' : '#222222' }}>
            <div className="flex flex-col items-center">
                <div className={`w-full max-w-3xl p-12 flex flex-col items-center text-center ${layout === 'type4' ? 'bg-white text-gray-900' : 'bg-[#2a2a2a] border border-gray-700'}`}>
                    
                    <span contentEditable spellCheck={false} suppressContentEditableWarning className={`text-sm font-bold tracking-widest mb-6 block ${layout === 'type4' ? 'text-gray-400' : ''} ${editClass}`} style={{ color: layout === 'type4' ? undefined : primaryColor }}>CONTACT AGENT</span>
                    
                    <div className="flex items-center justify-center gap-3 mb-3">
                        <p contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onTextChange?.('agentName', e.currentTarget.innerText)} className={`font-bold text-2xl md:text-3xl ${headingFont} ${editClass}`}>{info.agentName}</p>
                        {info.agentMapUrl && (
                            <a 
                                href={info.agentMapUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`p-2 rounded-full transition-colors group ${layout === 'type4' ? 'bg-gray-200 hover:bg-gray-300' : 'bg-gray-700'}`}
                                style={{ backgroundColor: layout === 'type4' ? undefined : 'rgb(55, 65, 81)' }}
                                title="네이버 지도 보기"
                            >
                                <MapPinIcon className={`w-4 h-4 ${layout === 'type4' ? 'text-gray-600' : 'text-white'}`} />
                            </a>
                        )}
                    </div>
                    
                    {info.agentRepresentative && (
                         <p contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onTextChange?.('agentRepresentative', e.currentTarget.innerText)} className={`text-base font-medium mb-6 ${layout === 'type4' ? 'text-gray-500' : 'text-gray-400'} ${editClass}`}>{info.agentRepresentative}</p>
                    )}

                    <div className="w-10 h-0.5 bg-gray-500 mb-6"></div>
                    
                    <div className="flex items-center justify-center gap-4 mb-8">
                        {/* Phone Icon Button */}
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${layout === 'type4' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
                            <PhoneIcon className="w-6 h-6" />
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
                            <a contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onTextChange?.('agentPhone', e.currentTarget.innerText)} href={`tel:${info.agentPhone}`} className={`text-3xl md:text-4xl font-bold font-serif-en hover:opacity-80 transition-colors ${layout === 'type4' ? 'text-gray-900' : 'text-white'} ${editClass}`}>
                                {info.agentPhone}
                            </a>
                            {info.agentMobile && (
                                <>
                                    <span className="hidden md:inline text-gray-500 font-thin text-3xl">|</span>
                                    <a contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => onTextChange?.('agentMobile', e.currentTarget.innerText)} href={`tel:${info.agentMobile}`} className={`text-3xl md:text-4xl font-bold font-serif-en hover:opacity-80 transition-colors ${layout === 'type4' ? 'text-gray-900' : 'text-white'} ${editClass}`}>
                                        {info.agentMobile}
                                    </a>
                                </>
                            )}
                        </div>
                    </div>
                    
                    {info.agentAdditionalInfo && info.agentAdditionalInfo.map((infoLine, idx) => (
                        <p key={idx} contentEditable spellCheck={false} suppressContentEditableWarning onBlur={(e) => { const lines = [...(info.agentAdditionalInfo || [])]; lines[idx] = e.currentTarget.innerText; onTextChange?.('agentAdditionalInfo' as any, lines as any); }} className={`text-base mb-1 ${layout === 'type4' ? 'text-gray-500' : 'text-gray-400'} ${editClass}`}>{infoLine}</p>
                    ))}
                    
                    {hasSocialLinks && (
                        <div className="flex gap-4 mt-8 items-center justify-center">
                            {socialLinks.map(link => {
                                if (!link.url) return null;
                                return (
                                    <a 
                                        key={link.key}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors hover:opacity-80 ${layout === 'type4' ? 'bg-gray-200 text-gray-700' : 'bg-white/10 text-white'}`}
                                        title={link.key.replace('social', '')}
                                    >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox={link.viewBox}>
                                            <path d={link.icon} />
                                        </svg>
                                    </a>
                                )
                            })}
                        </div>
                    )}

                    <div className="flex gap-4 w-full max-w-md mt-10">
                        <a 
                            href={`tel:${info.agentMobile || info.agentPhone || ''}`}
                            className="flex-1 py-5 text-white text-2xl font-bold tracking-widest hover:opacity-90 transition-colors block text-center rounded-xl shadow-md"
                            style={{ backgroundColor: primaryColor }}
                        >
                            전화하기
                        </a>
                        <a 
                            href={`sms:${info.agentMobile || info.agentPhone || ''}`}
                            className="flex-1 py-5 text-white text-2xl font-bold tracking-widest hover:opacity-90 transition-colors block text-center rounded-xl shadow-md"
                            style={{ backgroundColor: secondaryColor }}
                        >
                            문자보내기
                        </a>
                    </div>
                </div>
                
                <div className="mt-16 text-xs text-gray-600 text-center">
                    Copyright © EasyRealtor AI. All rights reserved. 본 이미지는 소비자의 이해를 돕기 위한 것으로 실제와 다를 수 있습니다.
                </div>
            </div>
        </div>

      </div>
    </div>
  );
});

FlyerCanvas.displayName = 'FlyerCanvas';

export default FlyerCanvas;
