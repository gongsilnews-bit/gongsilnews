export interface ReportColor {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  dark: string;
}

export interface ReportLayout {
  id: string;
  name: string;
  type: 'type1' | 'type2' | 'type3' | 'type4' | 'type5';
  headingFont: string;
  bodyFont: string;
}

export const COLORS: ReportColor[] = [
  { id: 'teal', name: 'Teal (Raemian)', primary: '#00788c', secondary: '#00c6d7', dark: '#003845' },
  { id: 'gold', name: 'Gold (Lotte)', primary: '#bfa068', secondary: '#e6cc9f', dark: '#3e301b' },
  { id: 'green', name: 'Green (Prugio)', primary: '#005f4d', secondary: '#4fb89e', dark: '#002820' },
  { id: 'burgundy', name: 'Burgundy (Hillstate)', primary: '#7c1f2d', secondary: '#ff9ea7', dark: '#380d13' },
  { id: 'orange', name: 'Orange (Acro)', primary: '#f27405', secondary: '#ffac63', dark: '#5e2609' },
];

export const LAYOUTS: ReportLayout[] = [
  { id: 'type1', name: 'Modern Overlay', type: 'type1', headingFont: 'font-sans', bodyFont: 'font-sans' },
  { id: 'type2', name: 'Luxury Center', type: 'type2', headingFont: 'font-serif-kr', bodyFont: 'font-serif-kr' },
  { id: 'type3', name: 'Natural Clean', type: 'type3', headingFont: 'font-sans', bodyFont: 'font-sans' },
  { id: 'type4', name: 'Bold Box', type: 'type4', headingFont: 'font-sans', bodyFont: 'font-sans' },
  { id: 'type5', name: 'High-end Minimal', type: 'type5', headingFont: 'font-sans', bodyFont: 'font-sans' },
];

const placeholder = "https://placehold.co/860x600/e2e8f0/1e293b?text=Property";

export function generateReportHtml(state: any): string {
  const { info, colorTheme, layoutTheme } = state;
  
  const primaryColor = colorTheme?.primary || '#00788c';
  const secondaryColor = colorTheme?.secondary || '#00c6d7';
  const darkColor = colorTheme?.dark || '#003845';
  
  const headingFont = layoutTheme?.headingFont || 'font-sans';
  const bodyFont = layoutTheme?.bodyFont || 'font-sans';
  const layout = layoutTheme?.type || 'type1';

  const mainImage = state.mainImage || placeholder;
  const subImage1 = state.subImage1 || placeholder;
  const subImage2 = state.subImage2 || placeholder;
  const featureImage1 = state.featureImage1 || placeholder;
  const featureImage2 = state.featureImage2 || placeholder;
  const mapImage = state.mapImage || placeholder;
  const agentImage = state.agentImage || null;
  const customQrImage = state.customQrImage || null;

  const qrCodeUrl = info.coverQRLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(info.coverQRLink)}`
    : null;

  const qrSrc = customQrImage || qrCodeUrl || 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://gongsilnews.com';

  const visiblePages = info.visiblePages || [1, 2, 3, 4, 5, 6];
  const isPageVisible = (num: number) => visiblePages.includes(num);

  const getPageString = (num: number) => {
    if (!isPageVisible(num)) return 'EXCLUDED';
    const idx = visiblePages.indexOf(num) + 1;
    const total = visiblePages.length;
    return `PAGE 0${idx} / 0${total}`;
  };

  // Helper to wrap each page inside the exact A4 layout frame
  const wrapPage = (num: number, title: string, subtitle: string, badgeText: string, contentHtml: string) => {
    const pageString = getPageString(num);
    const isHidden = !isPageVisible(num);
    const footerText = info.footerText || "PROPERTY REPORT";

    let headerHtml = '';
    if (layout === 'type2') {
      headerHtml = `
        <div class="h-[120px] bg-white text-[var(--theme-dark)] border-b-2 border-[var(--theme-dark)] px-10 py-6 flex flex-col justify-center items-center shrink-0 ${headingFont}">
            <h1 class="text-3xl font-extrabold tracking-widest uppercase">${title}</h1>
            <span class="text-gray-500 text-sm tracking-widest mt-1">${subtitle}</span>
            ${badgeText ? `<div class="absolute top-6 right-10 border border-[var(--theme-dark)] text-[var(--theme-dark)] px-3 py-1 text-xs font-bold tracking-widest uppercase">${badgeText}</div>` : ''}
        </div>
      `;
    } else if (layout === 'type3') {
      headerHtml = `
        <div class="h-[120px] bg-gray-50 px-10 py-6 flex flex-col justify-end shrink-0 border-l-[12px] border-[var(--theme-primary)] ${headingFont}">
            <h1 class="text-3xl font-black text-gray-900 tracking-tight">${title}</h1>
            <span class="text-[var(--theme-primary)] font-bold tracking-widest mt-1 text-sm">${subtitle}</span>
            ${badgeText ? `<div class="absolute top-6 right-10 bg-[var(--theme-primary)] text-white px-3 py-1 text-xs font-bold tracking-widest uppercase shadow-sm">${badgeText}</div>` : ''}
        </div>
      `;
    } else if (layout === 'type4') {
      headerHtml = `
        <div class="h-[120px] bg-[var(--theme-dark)] text-white px-10 py-6 flex justify-between items-center shrink-0 ${headingFont}">
            <div class="flex items-center gap-6 w-full">
                <div class="text-5xl font-black opacity-20">0${num}</div>
                <div class="flex-1">
                    <h1 class="text-3xl font-black uppercase tracking-tight">${title}</h1>
                    <span class="text-white/70 font-bold tracking-widest uppercase text-xs mt-1 block">${subtitle}</span>
                </div>
                ${badgeText ? `
                    <div class="bg-[var(--theme-primary)] text-white px-4 py-2 font-black tracking-widest shadow-md text-sm">
                        ${badgeText}
                    </div>
                ` : ''}
            </div>
        </div>
      `;
    } else if (layout === 'type5') {
      headerHtml = `
        <div class="h-[120px] bg-white px-10 py-8 flex justify-between items-center shrink-0 border-b border-gray-100 ${headingFont}">
            <div class="flex-1">
                <h1 class="text-3xl font-black text-gray-900 tracking-tight">${title}</h1>
            </div>
            <div class="text-right flex flex-col items-end justify-center">
                ${badgeText ? `
                    <div class="bg-[var(--theme-primary)] text-white px-4 py-2 font-black tracking-widest uppercase text-sm shadow-sm">${badgeText}</div>
                ` : ''}
            </div>
        </div>
      `;
    } else {
      // Default type1
      headerHtml = `
        <div class="h-[120px] bg-[var(--theme-dark)] text-white px-10 py-6 flex justify-between items-end shrink-0 ${headingFont}">
            <div>
                <h1 class="text-3xl font-extrabold mb-1 tracking-tight">${title}</h1>
                <div class="flex items-center gap-4">
                    <span class="text-gray-400 text-sm">${subtitle}</span>
                </div>
            </div>
            ${badgeText ? `
                <div class="flex items-center gap-4 h-full pb-2">
                    <div class="w-px h-8 bg-gray-600"></div>
                    <span class="text-2xl font-black tracking-widest text-white">${badgeText}</span>
                </div>
            ` : ''}
        </div>
      `;
    }

    return `
      <div data-export-id="page-${num}" class="relative bg-white w-[1122px] h-[794px] overflow-hidden flex flex-col shadow-2xl mb-8 ${bodyFont} ${isHidden ? 'hidden' : ''}" style="page-break-after: always; position: relative;">
          ${headerHtml}
          <!-- Content Body -->
          <div class="flex-1 p-10 relative">
              ${contentHtml}
          </div>
          <!-- Footer -->
          <div class="h-[50px] px-10 flex justify-between items-center shrink-0 border-t border-gray-100">
              <div class="text-gray-400 text-xs font-bold tracking-widest uppercase">${footerText}</div>
              <div class="text-gray-400 text-xs font-bold tracking-widest">${pageString}</div>
          </div>
      </div>
    `;
  };

  // 1. Page 0 Cover HTML
  let coverContent = '';
  if (layout === 'type2') {
    coverContent = `
      <div class="flex-1 flex flex-col justify-between p-20 border-[16px] border-[var(--theme-dark)] h-full">
        <div class="text-center mt-12">
          <p class="text-[var(--theme-primary)] text-lg tracking-[0.3em] font-bold uppercase mb-4">${info.coverSubtitle || "부동산 물건 보고서"}</p>
          <div class="w-16 h-[2px] bg-[var(--theme-primary)] mx-auto my-6"></div>
          <h1 class="text-5xl font-black text-gray-900 tracking-tight leading-[1.3] max-w-[800px] mx-auto">${(info.address || '').replace('\n', '<br/>')}</h1>
        </div>
        <div class="flex justify-between items-end">
          <div class="flex flex-col text-left">
            <span class="text-[16px] text-gray-400 font-bold tracking-widest block mb-2 uppercase">${info.agentLabel || "PREPARED BY"}</span>
            <div class="text-[16px] font-bold text-gray-800 tracking-wide leading-[1.6] flex flex-col items-start gap-1.5">
              <div>🏢 ${info.agentName || ""} | 대표 ${info.agencyRepresentative || info.agentRepresentative || ""}</div>
              <div>📝 등록번호 : ${info.agentRegistrationNumber || ""}</div>
              <div>📞 ${info.agentPhone || ""}</div>
              <div>📍 ${info.agentAddress || ""}</div>
            </div>
          </div>
          <div class="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100 shadow-sm text-gray-800">
            <img src="${qrSrc}" class="w-32 h-32 rounded-md" />
            <div class="text-left">
              <p class="text-xs font-black text-gray-800">QR 온라인 보고서</p>
              <p class="text-[14px] text-gray-400 font-bold leading-tight mt-0.5">스마트폰 카메라로<br />스캔하여 상세 정보 확인</p>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (layout === 'type3') {
    coverContent = `
      <div class="flex-1 flex h-full">
        <div class="w-[40px] bg-[var(--theme-primary)] h-full shrink-0"></div>
        <div class="flex-1 flex flex-col justify-between p-20">
          <div class="mt-10">
            <div class="inline-block bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] px-3 py-1 text-xs font-black tracking-widest uppercase rounded-full mb-4">
              ${info.coverSubtitle || "부동산 물건 보고서"}
            </div>
            <h1 class="text-4xl font-extrabold text-gray-900 tracking-tight leading-[1.3] mt-2 max-w-[650px]">${(info.address || '').replace('\n', '<br/>')}</h1>
            <div class="w-24 h-[6px] bg-[var(--theme-primary)] mt-8"></div>
          </div>
          <div class="flex justify-between items-end border-t border-gray-100 pt-10">
            <div class="flex flex-col text-left">
              <span class="text-[14px] text-gray-400 font-bold tracking-widest block mb-2 uppercase">${info.agentLabel || "ISSUED BY"}</span>
              <div class="text-[16px] font-bold text-gray-800 tracking-wide leading-[1.6] flex flex-col items-start gap-1">
                <div>🏢 ${info.agentName || ""} | 대표 ${info.agencyRepresentative || info.agentRepresentative || ""}</div>
                <div>📝 등록번호 : ${info.agentRegistrationNumber || ""}</div>
                <div>📞 ${info.agentPhone || ""}</div>
                <div>📍 ${info.agentAddress || ""}</div>
              </div>
            </div>
            <div class="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100 shadow-sm">
              <img src="${qrSrc}" class="w-32 h-32 rounded-md" />
              <div class="text-left">
                <p class="text-xs font-black text-gray-800">QR 온라인 보고서</p>
                <p class="text-[14px] text-gray-400 font-bold leading-tight mt-0.5">스마트폰 카메라로<br />스캔하여 상세 정보 확인</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (layout === 'type4') {
    coverContent = `
      <div class="flex-1 flex flex-col justify-between p-20 bg-[var(--theme-dark)] text-white h-full relative z-0 overflow-hidden">
        <div class="absolute inset-0 z-[-2] opacity-35">
          <img src="${mainImage}" class="w-full h-full object-cover mix-blend-luminosity" />
        </div>
        <div class="absolute top-0 right-0 w-[300px] h-[300px] bg-[var(--theme-primary)] opacity-10 rounded-bl-full pointer-events-none z-[-1]"></div>
        <div class="mt-10">
          <span class="text-[var(--theme-secondary)] text-sm font-bold tracking-[0.3em] uppercase block mb-3">${info.coverSubtitle || "부동산 물건 보고서"}</span>
          <h1 class="text-5xl font-black tracking-tight leading-[1.2] text-white max-w-[750px]">${(info.address || '').replace('\n', '<br/>')}</h1>
          <div class="w-32 h-[8px] bg-[var(--theme-secondary)] mt-6"></div>
        </div>
        <div class="flex justify-between items-end border-t border-white/10 pt-10">
          <div class="flex flex-col text-left">
            <span class="text-[14px] text-white/60 font-bold tracking-widest block mb-2 uppercase">${info.agentLabel || "PARTNER BROKER"}</span>
            <div class="text-[16px] font-bold text-white tracking-wide leading-[1.6] flex flex-col items-start gap-1">
              <div>🏢 ${info.agentName || ""} | 대표 ${info.agencyRepresentative || info.agentRepresentative || ""}</div>
              <div>📝 등록번호 : ${info.agentRegistrationNumber || ""}</div>
              <div>📞 ${info.agentPhone || ""}</div>
              <div>📍 ${info.agentAddress || ""}</div>
            </div>
          </div>
          <div class="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/10 shadow-sm">
            <img src="${qrSrc}" class="w-32 h-32 rounded-md bg-white p-1" />
            <div class="text-left text-white">
              <p class="text-xs font-black text-white/95">QR 온라인 보고서</p>
              <p class="text-[14px] text-white/60 font-bold leading-tight mt-0.5">스마트폰 카메라로<br />스캔하여 상세 정보 확인</p>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (layout === 'type5') {
    coverContent = `
      <div class="flex-1 flex flex-col justify-between p-24 bg-black text-white h-full">
        <div class="mt-10">
          <span class="text-[var(--theme-secondary)] text-xs font-bold tracking-[0.5em] uppercase block mb-6">${info.coverSubtitle || "부동산 물건 보고서"}</span>
          <h1 class="text-6xl font-thin tracking-tighter leading-[1.2] text-white max-w-[800px]">${(info.address || '').replace('\n', '<br/>')}</h1>
          <div class="w-16 h-px bg-white/35 mt-10"></div>
        </div>
        <div class="flex justify-between items-end">
          <div class="flex flex-col text-left">
            <span class="text-[12px] text-white/45 font-bold tracking-widest block mb-3 uppercase">${info.agentLabel || "PREPARED BY"}</span>
            <div class="text-[15px] font-light text-white/80 tracking-wide leading-[1.7] flex flex-col items-start gap-1">
              <div>🏢 ${info.agentName || ""} | 대표 ${info.agencyRepresentative || info.agentRepresentative || ""}</div>
              <div>📝 등록번호 : ${info.agentRegistrationNumber || ""}</div>
              <div>📞 ${info.agentPhone || ""}</div>
              <div>📍 ${info.agentAddress || ""}</div>
            </div>
          </div>
          <div class="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/10">
            <img src="${qrSrc}" class="w-32 h-32 rounded-md bg-white p-1" />
            <div class="text-left">
              <p class="text-xs font-bold text-white">QR 온라인 보고서</p>
              <p class="text-[14px] text-white/50 leading-tight mt-0.5">스마트폰 카메라로<br />스캔하여 상세 정보 확인</p>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    // Default Type 1 (Classic Corporate)
    coverContent = `
      <div class="flex-1 flex flex-col justify-between p-20 border-t-[20px] border-[var(--theme-primary)] h-full">
        <div class="mt-10">
          <span class="text-[var(--theme-primary)] text-sm font-extrabold tracking-[0.2em] uppercase block mb-2">${info.coverSubtitle || "부동산 물건 보고서"}</span>
          <h1 class="text-5xl font-black text-gray-900 tracking-tight leading-[1.3]">${(info.address || '').replace('\n', '<br/>')}</h1>
          <div class="w-20 h-[5px] bg-[var(--theme-primary)] mt-6"></div>
        </div>
        <div class="flex justify-between items-end border-t border-gray-150 pt-10">
          <div class="flex flex-col text-left">
            <span class="text-[14px] text-gray-400 font-bold tracking-widest block mb-2 uppercase">${info.agentLabel || "PREPARED BY"}</span>
            <div class="text-[16px] font-bold text-gray-800 tracking-wide leading-[1.6] flex flex-col items-start gap-1">
              <div>🏢 ${info.agentName || ""} | 대표 ${info.agencyRepresentative || info.agentRepresentative || ""}</div>
              <div>📝 등록번호 : ${info.agentRegistrationNumber || ""}</div>
              <div>📞 ${info.agentPhone || ""}</div>
              <div>📍 ${info.agentAddress || ""}</div>
            </div>
          </div>
          <div class="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100 shadow-sm text-gray-800">
            <img src="${qrSrc}" class="w-32 h-32 rounded-md" />
            <div class="text-left">
              <p class="text-xs font-black text-gray-800">QR 온라인 보고서</p>
              <p class="text-[14px] text-gray-400 font-bold leading-tight mt-0.5">스마트폰 카메라로<br />스캔하여 상세 정보 확인</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  const page0CoverHtml = `
    <div data-export-id="page-0" class="relative bg-white w-[1122px] h-[794px] overflow-hidden flex flex-col shadow-2xl mb-8 ${bodyFont}" style="page-break-after: always;">
        ${coverContent}
    </div>
  `;

  // 2. Page 1 Overview HTML
  const overviewRowsHtml = Array.isArray(info.overviewTable) ? info.overviewTable.map((row: any) => `
    <tr class="border-b border-gray-100 last:border-0 bg-white">
        <td class="w-1/3 text-gray-500 font-bold py-2 pl-4 align-middle">${row.label}</td>
        <td class="w-2/3 text-gray-800 font-bold py-2 pl-4 align-middle">${row.value}</td>
    </tr>
  `).join('') : '';

  const priceLabel = info.transactionType === '월세' || info.transactionType === '단기임대' ? '보증금 / 월세' : (info.transactionType === '전세' ? '보증금 (전세)' : '매매가');
  const priceValue = info.priceMain ? `${info.priceMain}${info.transactionType === '월세' && info.priceSub ? ` / ${info.priceSub}` : ''}` : '';

  const page1OverviewHtml = wrapPage(1, info.address || "매물 기본 정보", info.subTitle || "", info.pageBadges?.page1 || "OVERVIEW", `
    <div class="flex gap-8 h-full">
        <!-- Left Col: Overview Table -->
        <div class="w-5/12 flex flex-col justify-between">
            <div>
                <div class="mb-4">
                    <span class="text-xs font-bold text-[var(--theme-primary)] tracking-wider uppercase block">${info.overviewSubtitle || "물건개요"}</span>
                    <h2 class="text-xl font-extrabold text-gray-800 leading-tight">${info.overviewTitle || "PROPERTY OVERVIEW"}</h2>
                </div>
                <table class="w-full text-sm border-collapse table-fixed border-t-[3px] border-gray-800 border-b border-gray-200">
                    <tbody>
                        ${overviewRowsHtml}
                        <tr class="border-t border-gray-200" style="background-color: ${info.priceBgColor || '#fff9f0'}">
                            <td class="w-1/3 text-gray-600 font-bold py-2 pl-4 align-middle">${info.priceMainLabel || priceLabel}</td>
                            <td class="w-2/3 font-extrabold py-2 pl-4 align-middle" style="color: ${info.priceTextColor || '#cc5a27'}">${priceValue}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <!-- Agent Footer -->
            <div class="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3.5 mt-3 flex flex-col justify-center shadow-sm">
                <div class="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1.5 text-sm">
                    <span class="text-gray-500 font-bold flex items-center">부동산명</span>
                    <span class="text-gray-800 font-extrabold flex items-center">${info.agentName || ''}</span>
                    <span class="text-gray-500 font-bold flex items-center">담당자</span>
                    <span class="text-gray-800 font-extrabold flex items-center">${info.agentRepresentative || ''}</span>
                    <span class="text-gray-500 font-bold flex items-center">연락처</span>
                    <span class="text-[#cc5a27] font-black text-base flex items-center">${info.agentMobile || info.agentPhone || ""}</span>
                </div>
            </div>
        </div>
        <!-- Right Col: Image & Summary -->
        <div class="w-7/12 flex flex-col justify-between h-full">
            <div class="h-[340px] relative">
                <img src="${mainImage}" class="w-full h-full object-cover rounded-lg" />
                <div class="absolute bottom-3 right-3 p-1 bg-white rounded shadow-md border border-gray-100 z-30">
                    <img src="${qrSrc}" class="w-32 h-32 rounded object-cover" />
                </div>
            </div>
            <div>
                <div class="mb-4">
                    <span class="text-xs font-bold text-[var(--theme-primary)] tracking-wider uppercase block">${info.investmentSubtitle || "투자요약"}</span>
                    <h2 class="text-xl font-extrabold text-gray-800 leading-tight">${info.investmentTitle || "INVESTMENT SUMMARY"}</h2>
                </div>
                <div class="flex gap-4 border-l-4 pl-4" style="border-color: ${primaryColor}">
                    ${[1, 2, 3].map(i => `
                        <div class="flex-1 bg-white border border-gray-100 rounded-lg p-4 text-center shadow-sm">
                            <div class="text-xs text-gray-400 font-bold tracking-widest mb-2 uppercase">${(info.investmentSummary as any)?.[`box${i}Title`] || ""}</div>
                            <div class="font-extrabold text-gray-800 text-lg leading-tight whitespace-pre-wrap">${(info.investmentSummary as any)?.[`box${i}Text`] || ""}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    </div>
  `);

  // 3. Page 2 Status & Valuation HTML
  const highlightsList = info.highlights?.map((hl: string) => `
    <li class="flex gap-2 text-sm items-center w-full">
        <span class="font-bold" style="color: ${primaryColor}">•</span>
        <span class="w-full text-gray-700">${hl}</span>
    </li>
  `).join('') || '';

  const bars = info.chartBars || [];
  const chartHtml = info.showChart !== false && bars.length > 0 ? `
    <div class="animate-fadeIn mt-auto mb-auto">
        <div class="h-40 flex items-end justify-around px-4 border-b border-slate-200 pb-2 mb-2 relative">
            ${bars.map((bar: any, idx: number) => {
                const nums = bars.map((b: any) => parseFloat(b.value) || 0);
                const mx = Math.max(...nums, 1);
                const hp = Math.max(15, Math.min(95, Math.round(((parseFloat(bar.value) || 0) / mx) * 90)));
                return `
                    <div class="flex flex-col items-center justify-end h-full relative w-20">
                        <div class="text-[10px] font-extrabold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded shadow-sm border border-slate-200/50 mb-1 leading-none">
                            ${bar.value}
                        </div>
                        <div class="w-12 rounded-t transition-all duration-500 shadow-sm relative ${bar.isHighlight || idx === bars.length - 1 ? 'bg-[#cc5a27]' : 'bg-slate-300'}" style="height: ${hp}%">
                            ${(bar.isHighlight || idx === bars.length - 1) ? '<div class="absolute inset-x-0 top-0 h-1 bg-white/20 rounded-t"></div>' : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
        <div class="flex justify-around px-4 text-[10px] font-bold text-gray-500">
            ${bars.map((bar: any, idx: number) => `
                <div class="w-20 text-center truncate ${bar.isHighlight || idx === bars.length - 1 ? 'text-[#cc5a27]' : ''}">
                    ${bar.label}
                </div>
            `).join('')}
        </div>
    </div>
  ` : `
    <div class="py-8 px-4 text-center text-slate-400 text-xs font-semibold">
        📊 시세 분석 그래프 비활성화
    </div>
  `;

  const page2StatusValuationHtml = wrapPage(2, info.page2Title || "매물설명 & 시세", info.page2Subtitle || "Status & Valuation", "DETAILS", `
    <div class="flex gap-8 h-full w-full">
        <div class="w-full h-full flex flex-col">
            <div class="text-gray-600 font-bold text-sm mb-4">
                ${info.page2HighlightHeader || "PROPERTY INFORMATION & VALUE"}
            </div>
            <div class="flex-1 flex gap-6">
                <!-- Left: Highlights -->
                <div class="w-1/2 border border-gray-200 rounded-lg p-6 bg-white shadow-sm flex flex-col">
                    <h3 class="text-xl font-extrabold text-gray-900 mb-4 border-b-2 border-gray-800 pb-2 inline-block">
                        ${info.page2HighlightBoxTitle || "매물 핵심 하이라이트"}
                    </h3>
                    <ul class="space-y-3 mb-8">
                        ${highlightsList}
                    </ul>
                    <div class="mt-auto">
                        <div class="text-[10px] font-bold tracking-widest uppercase mb-1" style="color: ${primaryColor}">STRATEGIC ADVISORY</div>
                        <div class="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">${info.valuationText || ""}</div>
                    </div>
                </div>
                <!-- Right: Chart -->
                <div class="w-1/2 border border-gray-200 rounded-lg p-6 bg-white shadow-sm flex flex-col justify-between">
                    <h3 class="text-xl font-extrabold text-gray-900 mb-4 border-b-2 border-gray-800 pb-2 inline-block">
                        ${state.page2ChartBoxTitle || "주변시세 리포트"}
                    </h3>
                    <div class="flex flex-col h-full justify-center">
                        ${chartHtml}
                    </div>
                    <div class="mt-auto pt-6 border-t border-gray-100">
                        <div class="text-[10px] font-bold tracking-widest text-[#cc5a27] uppercase mb-1">STRATEGIC ADVISORY</div>
                        <div class="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">${info.chartAdviseText || ""}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  `);

  // 4. Page 3 Lease Status HTML
  const leaseHeaders = info.leaseTable?.headers || ["층수", "호실", "면적", "금액", "현용도", "기타"];
  const leaseRows = info.leaseTable?.rows || [];
  const leaseRowsHtml = leaseRows.map((row: string[]) => `
    <tr class="border-b border-gray-100 last:border-0 bg-white text-xs font-bold text-gray-700">
        ${row.map(cell => `<td class="py-2.5 pl-4 align-middle text-left truncate">${cell}</td>`).join('')}
    </tr>
  `).join('');

  const page3LeaseStatusHtml = wrapPage(3, info.page3Title || "임대 정보", info.page3Subtitle || "Lease Status", "LEASE", `
    <div class="flex gap-8 h-full w-full">
        <!-- Left: Lease Table -->
        <div class="w-7/12 flex flex-col justify-between">
            <div>
                <table class="w-full text-sm border-collapse table-fixed border-t-[3px] border-gray-800 border-b border-gray-200">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500">
                            ${leaseHeaders.map(h => `<th class="py-2 pl-4 text-left font-extrabold">${h}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${leaseRowsHtml}
                    </tbody>
                </table>
                ${info.leaseNotice ? `<p class="text-[10px] text-gray-400 mt-3 font-semibold">${info.leaseNotice}</p>` : ''}
            </div>
        </div>
        <!-- Right: Lease Strategy -->
        <div class="w-5/12 border border-gray-200 rounded-lg p-6 bg-white shadow-sm flex flex-col justify-between">
            <div>
                <h3 class="text-xl font-extrabold text-gray-900 mb-4 border-b-2 border-gray-800 pb-2 inline-block">
                    ${info.leaseRightTitle || "임대 핵심 가치 및 MD 추천 전략"}
                </h3>
                <div class="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-bold mt-2">
                    ${info.leaseRightText || ""}
                </div>
            </div>
        </div>
    </div>
  `);

  // 5. Page 4 Photos HTML
  const page4PhotosHtml = wrapPage(4, info.page4Title || "매물 사진 특징", info.page4Subtitle || "Property Features", "PHOTOS", `
    <div class="grid grid-cols-12 gap-6 h-full">
        <!-- Left: Main Photo (Large) -->
        <div class="col-span-6 flex flex-col justify-between">
            <div class="flex-1 rounded-lg overflow-hidden relative shadow-sm border border-gray-150 h-[360px]">
                <img src="${mainImage}" class="w-full h-full object-cover" />
            </div>
            <div class="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100 text-center">
                <span class="text-xs font-extrabold text-gray-800">${info.photoCaptions?.main || "EXTERIOR VIEW - 건물 전면 외관"}</span>
            </div>
        </div>
        <!-- Right: Sub Photos Grid -->
        <div class="col-span-6 grid grid-cols-2 gap-4">
            ${[
                { img: subImage1, cap: info.photoCaptions?.sub1 || "Side View" },
                { img: subImage2, cap: info.photoCaptions?.sub2 || "Entrance" },
                { img: featureImage1, cap: info.photoCaptions?.feat1 || "Interior" },
                { img: featureImage2, cap: info.photoCaptions?.feat2 || "Detail" }
            ].map(slot => `
                <div class="flex flex-col justify-between border border-gray-150 rounded-lg p-2 bg-white shadow-xs">
                    <div class="h-36 rounded overflow-hidden">
                        <img src="${slot.img}" class="w-full h-full object-cover" />
                    </div>
                    <div class="text-center py-1 mt-2 text-[11px] font-bold text-gray-600 truncate">
                        ${slot.cap}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
  `);

  // 6. Page 5 Area Analysis HTML
  const page5AreaAnalysisHtml = wrapPage(5, info.page5Title || "위치 및 입지 분석", info.page5Subtitle || "Area & Location Analysis", "LOCATION", `
    <div class="flex gap-8 h-full w-full">
        <!-- Left: Map Image -->
        <div class="w-1/2 flex flex-col justify-between">
            <div class="flex-1 rounded-lg overflow-hidden border border-gray-200 relative h-[360px]">
                <img src="${mapImage}" class="w-full h-full object-cover" />
            </div>
            <div class="mt-3 p-3 bg-gray-50 border border-gray-100 rounded-lg">
                <h4 class="text-sm font-extrabold text-gray-800">${info.page4TargetTitle || "입지분석 대상지"}</h4>
                <p class="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap font-bold mt-1">${info.areaTargetDesc || ""}</p>
            </div>
        </div>
        <!-- Right: Location Highlights -->
        <div class="w-1/2 flex flex-col justify-between">
            <div class="bg-slate-50 border-l-4 rounded-r-lg p-4 mb-4" style="border-color: ${primaryColor}">
                <span class="text-[10px] font-black text-gray-400 block mb-0.5 uppercase">TARGET LOCATION</span>
                <h4 class="text-lg font-black text-gray-800 leading-tight whitespace-pre-wrap">${info.areaTargetName || ""}</h4>
            </div>
            <div class="space-y-3">
                ${[1, 2, 3].map(i => `
                    <div class="border border-gray-100 rounded-xl p-4 bg-white shadow-sm flex items-start gap-3">
                        <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 mt-0.5" style="background-color: ${primaryColor}">
                            0${i}
                        </div>
                        <div>
                            <h5 class="text-sm font-black text-gray-800 mb-0.5">${(info as any)[`areaBox${i}Title`] || ""}</h5>
                            <p class="text-xs text-gray-600 leading-relaxed font-bold">${(info as any)[`areaBox${i}Text`] || ""}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
  `);

  // 7. Page 6 Roadmap HTML
  const roadmapItems = info.roadmap || {
    box1Title: "1단계", box1Text: "매수 계약 체결 및 리모델링 인허가 완료",
    box2Title: "2단계", box2Text: "공실 호실 명도 완료 및 내부 철거 작업",
    box3Title: "3단계", box3Text: "층별 내외관 인테리어 및 기계식 설비 리뉴얼",
    box4Title: "4단계", box4Text: "우량 임차 브랜드 유치 및 임대 안정화 달성"
  };

  const page6RoadmapHtml = wrapPage(6, info.page6Title || "밸류업 로드맵", info.page6Subtitle || "Value-up Roadmap", "ROADMAP", `
    <div class="flex flex-col justify-between h-full w-full">
        <div class="grid grid-cols-4 gap-6 my-auto">
            ${[1, 2, 3, 4].map(i => `
                <div class="border border-gray-200 rounded-2xl p-6 bg-white shadow-md flex flex-col justify-between min-h-[300px] hover:shadow-lg transition-shadow">
                    <div>
                        <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg font-black text-white mb-4" style="background-color: ${primaryColor}">
                            0${i}
                        </div>
                        <h4 class="text-base font-extrabold text-gray-900 mb-3">${(roadmapItems as any)[`box${i}Title`] || ""}</h4>
                        <p class="text-xs text-gray-600 leading-relaxed font-bold">${(roadmapItems as any)[`box${i}Text`] || ""}</p>
                    </div>
                </div>
            `).join('')}
        </div>
        ${info.page6FooterQuote ? `
            <div class="mt-6 p-4 bg-slate-50 border border-slate-100 rounded-xl text-center">
                <span class="text-xs font-black text-gray-600 italic">"${info.page6FooterQuote}"</span>
            </div>
        ` : ''}
    </div>
  `);

  // 8. Page 7 Ending HTML
  const hasYoutube = !!info.contactYoutube;
  const hasBlog = !!info.contactBlog;
  const hasWebsite = !!info.contactWebsite;
  const showSocials = hasYoutube || hasBlog || hasWebsite;

  const page7EndingHtml = `
    <div data-export-id="page-7" class="relative bg-white w-[1122px] h-[794px] overflow-hidden flex flex-col shadow-2xl mb-8 ${bodyFont}" style="page-break-after: always;">
        <div class="flex-1 flex flex-col justify-between p-20 border-b-[20px] border-[var(--theme-primary)] h-full">
            <div class="flex-1 flex items-center justify-center">
                <div class="w-full max-w-4xl grid grid-cols-12 gap-12 items-center">
                    <!-- Left: Broker Card -->
                    <div class="col-span-7 flex flex-col gap-6 text-left">
                        <div>
                            <span class="text-xs font-bold text-[var(--theme-primary)] tracking-widest block mb-2 uppercase">PARTNER REALTY GROUP</span>
                            <h2 class="text-3xl font-black text-gray-900 leading-none">${info.agentName || ""}</h2>
                        </div>
                        <div class="h-px bg-gray-200"></div>
                        <div class="flex items-center gap-6">
                            ${agentImage ? `<img src="${agentImage}" class="w-24 h-24 rounded-full object-cover shadow-sm border border-gray-150" />` : ''}
                            <div class="flex flex-col gap-1.5 text-sm font-bold text-gray-800">
                                <div class="text-lg font-extrabold text-gray-900">대표 ${info.agencyRepresentative || info.agentRepresentative || ""}</div>
                                <div>📝 등록번호 : ${info.agentRegistrationNumber || ""}</div>
                                <div>📞 전화 : ${info.agentPhone || ""}</div>
                                <div>📱 휴대폰 : ${info.agentMobile || ""}</div>
                                <div>📍 주소 : ${info.agentAddress || ""}</div>
                            </div>
                        </div>
                    </div>
                    <!-- Right: QR Code & Map -->
                    <div class="col-span-5 flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-gray-100 shadow-sm text-center">
                        <img src="${qrSrc}" class="w-40 h-40 bg-white p-2 rounded-xl border shadow-xs mb-3" />
                        <h4 class="text-sm font-black text-gray-800">온라인 모바일 보고서</h4>
                        <p class="text-xs text-gray-400 font-bold leading-relaxed mt-1">스마트폰으로 QR 코드를 스캔하시면<br/>현장 동영상과 상세 도면을 보실 수 있습니다.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
  `;

  // Assemble all 8 pages together
  const fullHtmlContent = `
    ${page0CoverHtml}
    ${page1OverviewHtml}
    ${page2StatusValuationHtml}
    ${page3LeaseStatusHtml}
    ${page4PhotosHtml}
    ${page5AreaAnalysisHtml}
    ${page6RoadmapHtml}
    ${page7EndingHtml}
  `.trim();

  // Assemble full standalone document
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1122, user-scalable=yes">
<title>${info.address || "매물 보고서"} - ${info.transactionType || '매매'} ${info.priceMain || ""}</title>
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
    :root {
      --theme-primary: ${primaryColor};
      --theme-secondary: ${secondaryColor};
      --theme-dark: ${darkColor};
    }
    body { font-family: 'Pretendard', sans-serif; background-color: #e5e7eb; padding: 0; margin: 0; display: flex; flex-direction: column; align-items: center; min-height: 100vh; }
    .font-serif-en { font-family: 'Playfair Display', serif; }
    .completed-overlay { pointer-events: auto !important; }
</style>
</head>
<body class="bg-gray-150">
    <div class="flex flex-col items-center">
        ${fullHtmlContent}
    </div>
</body>
</html>`;
}
