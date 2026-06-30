export interface FlyerColor {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  dark: string;
}

export interface FlyerLayout {
  id: string;
  name: string;
  type: 'type1' | 'type2' | 'type3' | 'type4' | 'type5';
  headingFont: string;
  bodyFont: string;
}

export const COLORS: FlyerColor[] = [
  { id: 'teal', name: 'Teal (Raemian)', primary: '#00788c', secondary: '#00c6d7', dark: '#003845' },
  { id: 'gold', name: 'Gold (Lotte)', primary: '#bfa068', secondary: '#e6cc9f', dark: '#3e301b' },
  { id: 'green', name: 'Green (Prugio)', primary: '#005f4d', secondary: '#4fb89e', dark: '#002820' },
  { id: 'burgundy', name: 'Burgundy (Hillstate)', primary: '#7c1f2d', secondary: '#ff9ea7', dark: '#380d13' },
  { id: 'orange', name: 'Orange (Acro)', primary: '#f27405', secondary: '#ffac63', dark: '#5e2609' },
];

export const LAYOUTS: FlyerLayout[] = [
  { id: 'type1', name: 'Modern Overlay', type: 'type1', headingFont: 'font-serif-kr', bodyFont: 'font-sans' },
  { id: 'type2', name: 'Luxury Center', type: 'type2', headingFont: 'font-serif-kr', bodyFont: 'font-serif-kr' },
  { id: 'type3', name: 'Natural Clean', type: 'type3', headingFont: 'font-sans', bodyFont: 'font-sans' },
  { id: 'type4', name: 'Bold Box', type: 'type4', headingFont: 'font-sans', bodyFont: 'font-sans' },
  { id: 'type5', name: 'High-end Minimal', type: 'type5', headingFont: 'font-sans', bodyFont: 'font-sans' },
];

const placeholder = "https://placehold.co/860x600/e2e8f0/1e293b?text=Property";

export function generateFlyerHtml(state: any): string {
  const { info, mainImage, colorTheme, layoutTheme } = state;
  const primaryColor = colorTheme?.primary || '#00788c';
  const secondaryColor = colorTheme?.secondary || '#00c6d7';
  const darkColor = colorTheme?.dark || '#003845';
  
  const headingFont = layoutTheme?.headingFont || 'font-serif-kr';
  const bodyFont = layoutTheme?.bodyFont || 'font-sans';
  const layout = layoutTheme?.type || 'type1';
  const mainImgSrc = mainImage || placeholder;

  const getImage = (key: string) => {
    const img = state[key];
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

  // Stats
  const statsItems = [
      { label: 'Price', value: `${formatPrice(info.priceMain)}${isRent && info.priceSub ? ` / ${info.priceSub}` : ''}`, sub: getPriceLabel(info.transactionType) },
      { label: 'Area', value: info.area ? info.area.split('/')[0] : '', sub: '전용면적' },
      { label: 'Rooms', value: info.roomCount || '', sub: '방 / 욕실' },
      { label: 'Move-in', value: info.moveInDate ? info.moveInDate.split(' ')[0] : '', sub: '입주가능일' }
  ];

  // 1. Hero Render
  let heroContent = '';
  switch (layout) {
    case 'type1':
      heroContent = `
        <div class="relative h-[500px] md:h-[650px] flex flex-col">
            <div class="absolute inset-0 z-0">
                <img src="${mainImgSrc}" class="w-full h-full object-cover" />
                <div class="absolute inset-0" style="background: linear-gradient(to right, ${darkColor}E6, transparent)"></div>
            </div>
            <div class="relative z-10 p-8 md:p-16 flex flex-col h-full justify-center text-white items-start text-left">
                <div class="w-12 h-1 mb-8" style="background-color: ${secondaryColor}"></div>
                <div class="inline-block px-3 py-1 border text-xs font-medium mb-4 w-fit tracking-wider border-white/30 text-white">
                     <span>${info.transactionType || ''}</span>
                </div>
                <h1 class="font-bold leading-tight mb-2 tracking-tight drop-shadow-sm max-w-full break-words text-4xl md:text-7xl ${headingFont}">${info.address || ''}</h1>
                <p class="font-bold mb-4 drop-shadow-md max-w-full break-words text-2xl md:text-5xl ${headingFont}">${info.promotionText || ''}</p>
                <p class="text-base md:text-xl font-medium opacity-90" style="color: ${secondaryColor}">${info.subTitle || ''}</p>
            </div>
        </div>
      `;
      break;
    case 'type2':
      heroContent = `
        <div class="relative h-[500px] md:h-[650px] flex flex-col">
            <div class="absolute inset-0 z-0">
                <img src="${mainImgSrc}" class="w-full h-full object-cover" />
                <div class="absolute inset-0 bg-black/40"></div>
            </div>
            <div class="relative z-10 p-6 md:p-12 h-full flex items-center justify-center">
                <div class="border border-white/40 p-6 md:p-12 w-full h-full flex flex-col items-center justify-center text-center text-white overflow-hidden">
                    <span class="mb-4 text-xl md:text-2xl font-serif-en italic max-w-full break-words" style="color: ${secondaryColor}">Prestige Collection</span>
                    <h1 class="font-bold leading-tight mb-2 tracking-tight drop-shadow-sm max-w-full break-words text-4xl md:text-7xl ${headingFont}">${info.address || ''}</h1>
                    <div class="w-20 h-px bg-white/50 my-6"></div>
                    <p class="font-bold mb-4 drop-shadow-md max-w-full break-words text-2xl md:text-5xl ${headingFont}">${info.promotionText || ''}</p>
                    <p class="mt-4 w-full text-sm md:text-lg font-light tracking-widest uppercase max-w-full break-keep break-words">${info.subTitle || ''}</p>
                </div>
            </div>
        </div>
      `;
      break;
    case 'type3':
      heroContent = `
        <div class="relative h-[500px] md:h-[650px] flex flex-col bg-white">
             <div class="h-[70%] md:h-[80%] w-full absolute bottom-0 right-0 z-0">
                <img src="${mainImgSrc}" class="w-full h-full object-cover" />
             </div>
             <div class="relative z-10 p-8 md:p-12 bg-white/95 w-[90%] md:w-2/3 shadow-sm rounded-br-3xl">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-2 h-8 md:h-12" style="background-color: ${primaryColor}"></div>
                    <span class="text-xl md:text-3xl font-bold text-gray-800 tracking-widest">PREMIUM</span>
                </div>
                <h1 class="text-4xl md:text-6xl font-bold text-gray-900 mb-4 ${headingFont}">${info.address || ''}</h1>
                <p class="text-xl md:text-3xl text-gray-600 font-medium mb-2">${info.promotionText || ''}</p>
                <p class="text-base md:text-xl font-medium text-gray-600">${info.subTitle || ''}</p>
             </div>
        </div>
      `;
      break;
    case 'type4':
      heroContent = `
        <div class="relative h-[500px] md:h-[650px] flex flex-col">
            <div class="absolute inset-0 z-0">
                <img src="${mainImgSrc}" class="w-full h-full object-cover" />
            </div>
            <div class="absolute bottom-6 right-6 md:bottom-12 md:right-12 z-10 bg-white/95 p-6 md:p-10 max-w-[90%] md:max-w-xl shadow-2xl border-l-8" style="border-color: ${primaryColor}">
                <div class="text-xs md:text-sm font-bold tracking-widest mb-2 text-gray-500 uppercase">${info.transactionType || ''}</div>
                <h1 class="text-3xl md:text-5xl font-extrabold text-gray-900 mb-2 leading-tight ${headingFont}">${info.address || ''}</h1>
                <p class="text-xl md:text-3xl font-bold mb-4 ${headingFont}" style="color: ${primaryColor}">${info.promotionText || ''}</p>
                <p class="text-gray-600 text-sm leading-relaxed border-t pt-4 border-gray-200">${info.subTitle || ''}</p>
            </div>
        </div>
      `;
      break;
    case 'type5':
      heroContent = `
        <div class="relative h-[500px] md:h-[700px] flex flex-col">
            <div class="absolute inset-0 z-0">
                <img src="${mainImgSrc}" class="w-full h-full object-cover grayscale-[30%] contrast-125" />
                <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
            </div>
            <div class="relative z-10 p-8 md:p-12 flex flex-col justify-end h-full">
                <p class="text-white/80 text-sm md:text-lg tracking-[0.5em] mb-4 uppercase font-light">Residence</p>
                <h1 class="text-6xl md:text-8xl font-black text-white mb-2 tracking-tighter ${headingFont}">${info.address || ''}</h1>
                <div class="flex items-end gap-4">
                    <p class="text-3xl md:text-6xl font-thin text-white tracking-tight">${info.promotionText || ''}</p>
                </div>
            </div>
        </div>
      `;
      break;
  }

  // 2. Stats Bar Render
  let statsContent = '';
  switch (layout) {
    case 'type1':
      statsContent = `
        <div class="relative z-20 -mt-16 mx-4 md:mx-12 bg-white shadow-xl flex flex-wrap md:flex-nowrap rounded-sm overflow-hidden min-h-[100px]">
            ${statsItems.map((item) => `
                <div class="w-1/2 md:flex-1 py-6 px-4 border-r border-b md:border-b-0 border-gray-100 flex flex-col items-center justify-center text-center group hover:bg-gray-50">
                    <span class="text-[10px] text-gray-400 font-bold tracking-widest mb-1 uppercase">${item.label}</span>
                    <span class="text-lg md:text-xl font-bold whitespace-nowrap" style="color: ${primaryColor}">${item.value}</span>
                    <span class="text-[10px] text-gray-400 mt-1">${item.sub}</span>
                </div>
            `).join('')}
        </div>
      `;
      break;
    case 'type2':
      statsContent = `
        <div class="bg-white py-10 border-b border-gray-200">
            <div class="flex flex-col md:flex-row justify-center md:divide-x divide-gray-300 gap-8 md:gap-0">
                ${statsItems.map((item) => `
                    <div class="px-0 md:px-12 text-center">
                        <span class="block text-2xl font-bold text-gray-800 mb-1 ${headingFont}">${item.value}</span>
                        <span class="text-xs uppercase tracking-widest text-gray-500 font-serif-en">${item.label}</span>
                    </div>
                `).join('')}
            </div>
        </div>
      `;
      break;
    case 'type3':
      statsContent = `
        <div class="py-8 text-white flex flex-wrap md:flex-nowrap justify-around items-center gap-4" style="background-color: ${primaryColor}">
            ${statsItems.map((item) => `
                <div class="text-center w-1/2 md:w-auto mb-4 md:mb-0">
                    <span class="block text-sm opacity-70 mb-1">${item.sub}</span>
                    <span class="block text-xl md:text-2xl font-bold">${item.value}</span>
                </div>
            `).join('')}
        </div>
      `;
      break;
    case 'type4':
      statsContent = `
        <div class="bg-gray-100 p-6 md:p-12">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                ${statsItems.map((item) => `
                    <div class="bg-white p-6 border-t-4 shadow-sm" style="border-color: ${primaryColor}">
                        <span class="block text-xs font-bold text-gray-400 uppercase mb-2">${item.label}</span>
                        <span class="block text-lg md:text-xl font-extrabold text-gray-900">${item.value}</span>
                    </div>
                `).join('')}
            </div>
        </div>
      `;
      break;
    case 'type5':
      statsContent = `
        <div class="bg-black text-white py-12 px-6 md:px-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-0">
            ${statsItems.map((item, i) => `
                <div class="flex flex-col">
                    <span class="text-3xl md:text-4xl font-thin tracking-tighter mb-1" style="color: ${i === 0 ? secondaryColor : 'white'}">${item.value}</span>
                    <span class="text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">${item.label}</span>
                </div>
            `).join('')}
        </div>
      `;
      break;
  }

  // Section Header Helper
  const getSectionHeaderHtml = (title: string, intro?: string, description?: string) => {
      if (layout === 'type2') {
          return `
            <div class="flex flex-col items-center mb-12 text-center">
                <div class="font-serif-en italic text-base md:text-lg mb-2 tracking-wide" style="color: ${secondaryColor}">${intro || ''}</div>
                <h2 class="text-2xl md:text-3xl font-bold text-gray-800 mb-6 ${headingFont}">${title}</h2>
                <div class="w-10 h-0.5" style="background-color: ${primaryColor}"></div>
                ${description ? `<p class="mt-4 text-gray-500 max-w-xl font-serif-kr text-sm md:text-base">${description}</p>` : ''}
            </div>
          `;
      }
      if (layout === 'type3') {
          return `
            <div class="mb-10 border-b pb-4 border-gray-200">
                <span class="text-sm font-bold tracking-widest uppercase text-gray-400 mb-1 block">${intro || ''}</span>
                <h2 class="text-2xl md:text-3xl font-bold text-gray-800 ${headingFont}" style="color: ${primaryColor}">${title}</h2>
                ${description ? `<p class="mt-2 text-gray-600 text-sm md:text-base">${description}</p>` : ''}
            </div>
          `;
      }
      if (layout === 'type4') {
        return `
            <div class="mb-12 flex items-center gap-4">
                <div class="w-4 h-12" style="background-color: ${primaryColor}"></div>
                <div>
                    <h2 class="text-2xl md:text-3xl font-extrabold text-gray-900 uppercase ${headingFont}">${title}</h2>
                    <span class="text-sm font-bold text-gray-400 tracking-widest">${intro || ''}</span>
                </div>
            </div>
        `;
      }
      if (layout === 'type5') {
        return `
            <div class="mb-16">
                 <h2 class="text-4xl md:text-5xl font-thin text-gray-900 mb-2 ${headingFont}">${title}</h2>
                 <p class="text-xs font-bold text-gray-400 uppercase tracking-[0.3em]">${intro || ''}</p>
                 ${description ? `<p class="mt-6 text-lg md:text-xl font-light text-gray-600">${description}</p>` : ''}
            </div>
        `;
      }
      return `
        <div class="flex flex-col items-center mb-12 text-center">
            <div class="font-serif-en italic text-base md:text-lg mb-2 tracking-wide" style="color: ${primaryColor}">${intro || ''}</div>
            <h2 class="text-2xl md:text-3xl font-bold text-gray-800 mb-6 ${headingFont}">${title}</h2>
            <div class="w-10 h-0.5" style="background-color: ${primaryColor}"></div>
            ${description ? `<p class="mt-4 text-gray-500 max-w-xl text-sm md:text-base">${description}</p>` : ''}
        </div>
      `;
  };

  // 3. Grid Section
  const getGridSectionHtml = (section: any) => {
    const itemCount = section.items.length;
    let gridColsClass = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
    if (itemCount === 1) gridColsClass = 'grid-cols-1';
    else if (itemCount === 2) gridColsClass = 'grid-cols-1 md:grid-cols-2';
    else if (itemCount === 3) gridColsClass = 'grid-cols-1 md:grid-cols-3';

    return `
        <div data-export-id="${section.id}" class="py-20 px-6 md:px-12 ${layout === 'type4' ? 'bg-white' : 'bg-gray-50'}">
            ${getSectionHeaderHtml(section.title, section.intro)}
            <div class="grid ${gridColsClass} gap-6 h-auto md:h-80">
                ${section.items.map((item: any, idx: number) => {
                     const imgSrc = getImage(item.imageKey) || placeholder;
                     return `
                        <div class="relative h-64 md:h-full group overflow-hidden ${layout === 'type4' ? 'rounded-none border-2 border-gray-100' : 'rounded-sm shadow-md hover:shadow-xl'} transition-all">
                            <img src="${imgSrc}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-90 pointer-events-none"></div>
                            <div class="absolute bottom-0 left-0 w-full p-6 text-white transform transition-transform duration-300 group-hover:-translate-y-2">
                                <span class="text-[10px] font-bold tracking-widest mb-2 block" style="color: ${secondaryColor}">0${idx + 1}</span>
                                <span class="font-bold text-lg leading-tight block ${headingFont}">${item.text}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
  };

  // 4. List Section
  const getListSectionHtml = (section: any) => {
    return `
        <div data-export-id="${section.id}" class="py-20 bg-white">
             <div class="px-6 md:px-12">
                 ${getSectionHeaderHtml(section.title, section.intro, section.description)}
             </div>
            ${section.items.map((item: any, idx: number) => {
                const imgSrc = getImage(item.imageKey) || placeholder;
                const isReversed = idx % 2 === 1;
                
                if (layout === 'type4') {
                     return `
                        <div class="grid grid-cols-1 md:grid-cols-2 mb-12 mx-6 md:mx-12 border-b border-gray-100 pb-12">
                            <div class="h-[250px] md:h-[300px] ${isReversed ? 'md:order-2' : ''}">
                                <img src="${imgSrc}" class="w-full h-full object-cover" />
                            </div>
                            <div class="flex flex-col justify-center p-8 bg-gray-50 ${isReversed ? 'md:order-1' : ''}">
                                <h4 class="text-xl md:text-2xl font-extrabold text-gray-900 mb-4 ${headingFont}">${item.title}</h4>
                                <p class="text-gray-800 text-base md:text-sm leading-8 ${bodyFont}">${item.text}</p>
                            </div>
                        </div>
                     `;
                }

                if (layout === 'type5') {
                    return `
                        <div class="mb-24 px-6 md:px-12">
                            <div class="mb-6">
                                <span class="text-4xl md:text-6xl font-thin text-gray-200 block mb-2">0${idx+1}</span>
                                <h4 class="text-2xl md:text-3xl font-bold text-gray-900 ${headingFont}">${item.title}</h4>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
                                <div class="col-span-1 md:col-span-8 h-[300px] md:h-[400px]">
                                     <img src="${imgSrc}" class="w-full h-full object-cover grayscale-[20%]" />
                                </div>
                                <div class="col-span-1 md:col-span-4 flex items-end">
                                    <p class="text-gray-700 text-base md:text-lg leading-relaxed ${bodyFont}">${item.text}</p>
                                </div>
                            </div>
                        </div>
                    `;
                }

                return `
                    <div class="flex flex-col ${isReversed ? 'md:flex-row-reverse' : 'md:flex-row'} items-stretch mb-0 min-h-[400px]">
                         <div class="w-full md:w-1/2 relative overflow-hidden group h-[300px] md:h-auto">
                             <img src="${imgSrc}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                         </div>
                         <div class="w-full md:w-1/2 flex flex-col justify-center px-8 md:px-16 py-12 bg-gray-50/50">
                             <div class="w-8 h-0.5 mb-6" style="background-color: ${primaryColor}"></div>
                             <h4 class="text-xl md:text-2xl font-bold text-gray-800 mb-4 ${headingFont}">${item.title}</h4>
                             <p class="text-gray-700 text-base md:text-sm leading-8 break-keep whitespace-pre-wrap ${bodyFont}">${item.text}</p>
                         </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
  };

  // 5. Table Section
  const getTableSectionHtml = (section: any) => {
    return `
        <div data-export-id="${section.id}" class="py-20 px-6 md:px-12 bg-white">
            ${getSectionHeaderHtml(section.title, section.intro)}
            <div class="border-t-2 ${layout === 'type4' ? 'border-black' : 'border-gray-800'}">
                <div class="grid grid-cols-1 md:grid-cols-2">
                    ${section.items.map((item: any, idx: number) => `
                        <div class="flex border-b border-gray-200 ${idx % 2 === 1 ? 'md:border-l border-gray-200' : ''}">
                            <div class="w-28 md:w-32 py-5 px-3 text-[17px] md:text-sm flex items-center justify-center text-center shrink-0 border-r border-gray-200 ${layout === 'type4' ? 'bg-gray-800 text-white font-extrabold' : 'bg-gray-50 text-gray-800 font-extrabold'}">
                                ${item.title}
                            </div>
                            <div class="flex-1 py-5 px-4 text-[18px] md:text-sm text-gray-950 font-extrabold flex items-center break-keep ${bodyFont}">
                                ${item.text || ''}
                            </div>
                        </div>
                    `).join('')}
                    ${section.items.length % 2 !== 0 ? `
                        <div class="hidden md:flex border-b border-gray-200 border-l border-gray-200">
                             <div class="w-32 py-5 shrink-0 border-r border-gray-200 ${layout === 'type4' ? 'bg-gray-800' : 'bg-gray-50'}"></div>
                             <div class="flex-1 py-5 px-4"></div>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
  };

  // 6. SNS Section
  const getSnsSectionHtml = (section: any) => {
      return `
          <div data-export-id="${section.id}" class="py-16 px-6 md:px-12 ${layout === 'type4' ? 'bg-white' : 'bg-gray-50'}">
              ${getSectionHeaderHtml(section.title, section.intro)}
              <div class="max-w-4xl mx-auto bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
                  <div class="space-y-4">
                      ${section.items.map((item: any) => {
                          const type = item.imageKey;
                          const url = item.text;
                          const title = item.title;
                          
                          let badgeClass = "bg-gray-100 text-gray-600";
                          let label = "LINK";
                          if (type === 'youtube') badgeClass = "bg-red-50 text-red-600";
                          else if (type === 'blog') badgeClass = "bg-green-50 text-green-600";
                          else if (type === 'news') badgeClass = "bg-blue-50 text-blue-600";

                          return `
                              <div class="flex flex-col sm:flex-row sm:items-center justify-between group gap-2">
                                  <a href="${url}" target="_blank" rel="noopener noreferrer" class="flex items-start gap-2 hover:underline decoration-gray-400 underline-offset-4 flex-1">
                                      <span class="text-gray-300 select-none">↳</span>
                                      <span class="text-gray-800 font-medium ${bodyFont} group-hover:text-blue-600 transition-colors">
                                          ${title || url}
                                      </span>
                                  </a>
                                  <span class="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider w-fit shrink-0 ${badgeClass}">
                                      ${label}
                                  </span>
                              </div>
                          `;
                      }).join('')}
                  </div>
              </div>
          </div>
      `;
  };

  const socialLinks = [
    { key: 'socialYoutube', url: info.socialYoutube, icon: "M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z", viewBox: "0 0 24 24" },
    { key: 'socialBlog', url: info.socialBlog, icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5z", viewBox: "0 0 24 24" },
    { key: 'socialInstagram', url: info.socialInstagram, icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z", viewBox: "0 0 24 24" },
    { key: 'socialFacebook', url: info.socialFacebook, icon: "M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z", viewBox: "0 0 24 24" },
    { key: 'socialKakao', url: info.socialKakao, icon: "M12 2C6.48 2 2 5.92 2 10.75c0 2.82 1.51 5.33 3.87 6.95-.16.6-.58 2.18-.67 2.5-.1.35.13.34.27.25.11-.08 1.83-1.24 2.56-1.74.65.09 1.32.14 2 .14 5.52 0 10-3.92 10-8.75S17.52 2 12 2z", viewBox: "0 0 24 24" },
    { key: 'socialThreads', url: info.socialThreads, icon: "M12.71 14.96c-.33.32-.78.5-1.36.5-1.07 0-1.7-.82-1.7-1.92 0-1.07.63-1.93 1.74-1.93.57 0 1.01.19 1.33.5.14-.3.26-.62.36-.93-.45-.33-1.02-.5-1.74-.5-1.85 0-3.19 1.43-3.19 3.25 0 1.71 1.25 3.08 3.19 3.08 1.25 0 2.07-.5 2.52-1.23l1.1.66c-.66 1.08-1.9 1.85-3.62 1.85-2.6 0-4.52-1.92-4.52-4.36 0-2.52 2.01-4.43 4.62-4.43 2.76 0 4.25 1.87 4.25 4.3 0 .28-.02.55-.05.81h-1.33c.02-.21.03-.43.03-.66 0-1.63-.84-2.9-2.9-2.9-1.99 0-3.19 1.34-3.19 3.16 0 1.95 1.34 3.05 3.17 3.05.9 0 1.55-.31 1.96-.7.15-.33.27-.68.35-1.06zm1.18-4.43c-.15.42-.33.82-.54 1.2.3-.3.57-.65.79-1.05-.08-.06-.16-.11-.25-.15z M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z", viewBox: "0 0 24 24" }
  ];
  const hasSocialLinks = socialLinks.some(link => link.url);

  // Dynamic sections HTML
  const dynamicSectionsHtml = info.sections.map((section: any) => {
    if (section.type === 'grid') return getGridSectionHtml(section);
    if (section.type === 'list') return getListSectionHtml(section);
    if (section.type === 'table') return getTableSectionHtml(section);
    if (section.type === 'sns') return getSnsSectionHtml(section);
    return '';
  }).join('');

  // 7. Assemble Full HTML
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${info.address || "매물 전단지"} - ${info.transactionType || '매매'} ${info.priceMain || ""}</title>
<meta property="og:type" content="article">
<meta property="og:site_name" content="AI 매물 전단지">
<meta property="og:title" content="${info.promotionText || info.address || '매물 상세정보'}">
<meta property="og:description" content="${info.subTitle || '상세 정보를 확인해보세요.'}">
<meta property="og:image" content="${mainImage || 'https://www.gongsilnews.com/logo.png'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${info.promotionText || info.address || '매물 상세정보'}">
<meta name="twitter:description" content="${info.subTitle || '상세 정보를 확인해보세요.'}">
<meta name="twitter:image" content="${mainImage || 'https://www.gongsilnews.com/logo.png'}">
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
<link href="https://fonts.googleapis.com/css2?family=Song+Myung:wght@400&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Roboto', 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', 'sans-serif'],
            serif: ['Playfair Display', 'Song Myung', 'serif'],
          }
        }
      }
    }
</script>
<style>
    body { font-family: 'Pretendard', sans-serif; background-color: #e5e7eb; padding: 0; margin: 0; display: flex; justify-content: center; min-height: 100vh; }
    .font-serif-en { font-family: 'Playfair Display', serif; }
    .completed-overlay { pointer-events: auto !important; }
    
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
    /* Notice Box */
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
</style>
</head>
<body class="bg-gray-100">
  <div class="bg-white shadow-2xl flex flex-col w-full max-w-[860px] mx-auto min-h-[1400px] ${bodyFont}">
    
    <!-- 1. HERO SECTION -->
    ${heroContent}

    <!-- 2. STATS BAR -->
    ${statsContent}

    <!-- 3. INFO TABLE SECTION -->
    <div data-export-id="basic-info" class="pt-6 pb-12 px-6 md:px-12 bg-white">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4 md:gap-0">
            <div>
                <span class="font-bold text-xs tracking-widest block mb-1" style="color: ${primaryColor}">PROPERTY INFO</span>
                <h2 class="text-2xl md:text-3xl font-bold text-gray-800 ${headingFont}">매물 상세 정보</h2>
            </div>
            <div class="text-left md:text-right">
                <span class="text-gray-400 text-xs block mb-1">월 관리비</span>
                <span class="text-xl font-bold text-gray-800">${info.managementFee || '없음'}</span>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-7 text-[16px] md:text-sm">
            ${[
                { l: '공급/전용면적', v: info.area },
                { l: '해당층/총층', v: info.floor },
                { l: '방향', v: info.direction },
                { l: '주차가능대수', v: info.parking },
                { l: '옵션 정보', v: info.options, full: true }
            ].map((item) => `
                <div class="flex justify-between border-b border-gray-150 pb-4 ${item.full ? 'col-span-1 md:col-span-2' : ''}">
                    <span class="text-gray-700 font-bold text-[16px] md:text-sm">${item.l}</span>
                    <span class="font-extrabold text-gray-950 text-[18px] md:text-[15px]">${item.v || '정보 없음'}</span>
                </div>
            `).join('')}

            <!-- Notice Box -->
            ${info.noticeContent && info.noticeContent.trim() !== "" ? `
                <div data-print-notice-box class="col-span-1 md:col-span-2 p-6 mt-4 ${layout === 'type4' ? 'border-2 border-gray-100 bg-white' : 'bg-[#f4f6f8] rounded-sm'}">
                    <p data-print-notice-text class="text-gray-950 text-[17px] md:text-sm font-bold leading-relaxed whitespace-pre-wrap ${bodyFont}">
                        ${info.noticeContent}
                    </p>
                </div>
            ` : ''}
        </div>
    </div>

    <!-- 4. DYNAMIC SECTIONS -->
    <div class="bg-white">
        ${dynamicSectionsHtml}
    </div>

    <!-- 5. FOOTER / AGENT INFO -->
    <div data-export-id="agent-info" class="text-white py-20 px-6 md:px-12 ${layout === 'type5' ? 'bg-black' : ''}" style="background-color: ${layout === 'type5' ? '#000' : '#222222'}">
        <div class="flex flex-col items-center">
            <div class="w-full max-w-3xl p-12 flex flex-col items-center text-center ${layout === 'type4' ? 'bg-white text-gray-900' : 'bg-[#2a2a2a] border border-gray-700'}">
                
                <span class="text-sm font-bold tracking-widest mb-6 block" style="color: ${layout === 'type4' ? undefined : primaryColor}">CONTACT AGENT</span>
                
                <div class="flex items-center justify-center gap-3 mb-3">
                    <p class="font-bold text-2xl md:text-3xl ${headingFont}">${info.agentName || ''}</p>
                </div>
                
                ${info.agentRepresentative ? `
                     <p class="text-base font-medium mb-6 ${layout === 'type4' ? 'text-gray-500' : 'text-gray-400'}">${info.agentRepresentative}</p>
                ` : ''}

                <div class="w-10 h-0.5 bg-gray-500 mb-6"></div>
                
                <div class="flex items-center justify-center gap-4 mb-8">
                    <!-- Phone Icon Button -->
                    <div class="w-12 h-12 rounded-full flex items-center justify-center ${layout === 'type4' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}">
                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    </div>

                    <div class="flex flex-col md:flex-row gap-4 items-center justify-center">
                        <a href="tel:${info.agentPhone || ''}" class="text-3xl md:text-4xl font-bold font-serif-en hover:opacity-80 transition-colors ${layout === 'type4' ? 'text-gray-900' : 'text-white'}">
                            ${info.agentPhone || ''}
                        </a>
                        ${info.agentMobile ? `
                            <span class="hidden md:inline text-gray-500 font-thin text-3xl">|</span>
                            <a href="tel:${info.agentMobile}" class="text-3xl md:text-4xl font-bold font-serif-en hover:opacity-80 transition-colors ${layout === 'type4' ? 'text-gray-900' : 'text-white'}">
                                ${info.agentMobile}
                            </a>
                        ` : ''}
                    </div>
                </div>
                
                ${info.agentAdditionalInfo ? info.agentAdditionalInfo.map((infoLine: string) => `
                    <p class="text-base mb-1 ${layout === 'type4' ? 'text-gray-500' : 'text-gray-400'}">${infoLine}</p>
                `).join('') : ''}
                
                ${hasSocialLinks ? `
                    <div class="flex gap-4 mt-8 items-center justify-center">
                        ${socialLinks.map(link => {
                            if (!link.url) return '';
                            return `
                                <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="w-10 h-10 flex items-center justify-center rounded-full transition-colors hover:opacity-80 ${layout === 'type4' ? 'bg-gray-200 text-gray-700' : 'bg-white/10 text-white'}">
                                    <svg class="w-5 h-5" fill="currentColor" viewBox="${link.viewBox}"><path d="${link.icon}" /></svg>
                                </a>
                            `;
                        }).join('')}
                    </div>
                ` : ''}

                <div class="flex gap-4 w-full max-w-md mt-10">
                    <a href="tel:${info.agentMobile || info.agentPhone || ''}" class="flex-1 py-5 text-white text-2xl font-bold tracking-widest hover:opacity-90 transition-colors block text-center rounded-xl shadow-md" style="background-color: ${primaryColor}">전화하기</a>
                    <a href="sms:${info.agentMobile || info.agentPhone || ''}" class="flex-1 py-5 text-white text-2xl font-bold tracking-widest hover:opacity-90 transition-colors block text-center rounded-xl shadow-md" style="background-color: ${secondaryColor}">문자보내기</a>
                </div>
            </div>
            
            <div class="mt-16 text-xs text-gray-600 text-center">
                Copyright © EasyRealtor AI. All rights reserved. 본 이미지는 소비자의 이해를 돕기 위한 것으로 실제와 다를 수 있습니다.
            </div>
        </div>
    </div>

  </div>
</body>
</html>`;
}
