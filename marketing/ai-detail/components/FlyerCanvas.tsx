
import React, { forwardRef, useLayoutEffect, useRef } from 'react';
import { FlyerState, PropertyInfo } from '../types';
import { PhoneIcon } from '@heroicons/react/24/solid';

/*
 * 유리창 홍보지 — A4 한 장.
 *
 * 화면에 보이는 이 한 장이 그대로 인쇄·이미지·공유 페이지가 된다. 그래서 크기는 px 로 고정하고
 * (세로 860×1216, 가로 1216×860 = A4 비율) 화면 폭에 따라 바뀌는 md: 같은 반응형 클래스는 쓰지 않는다.
 * 공유 페이지를 폰에서 열어도 글자 크기가 바뀌지 않고 그림처럼 줄어들기만 한다.
 */

export type FlyerOrientation = 'portrait' | 'landscape';

export const PAGE_SIZE: Record<FlyerOrientation, { w: number; h: number }> = {
  portrait: { w: 860, h: 1216 },
  landscape: { w: 1216, h: 860 },
};

interface FlyerCanvasProps {
  data: FlyerState;
  orientation: FlyerOrientation;
  qrDataUrl?: string | null;
  /** QR 을 누르면 여는 매물 상세 주소 (화면·공유 페이지에서) */
  qrLink?: string | null;
  onTextChange?: (key: keyof PropertyInfo, value: string) => void;
  onImageClick?: (imageKey: string) => void;
}

const FlyerCanvas = forwardRef<HTMLDivElement, FlyerCanvasProps>(({ data, orientation, qrDataUrl, qrLink, onTextChange, onImageClick }, ref) => {
  const { info, mainImage, colorTheme, layoutTheme } = data;
  const primaryColor = colorTheme?.primary || '#00788c';
  const secondaryColor = colorTheme?.secondary || '#00c6d7';
  const darkColor = colorTheme?.dark || '#003845';
  const headingFont = layoutTheme?.headingFont || 'font-serif-kr';
  const bodyFont = layoutTheme?.bodyFont || 'font-sans';
  const layout = layoutTheme?.type || 'type1';
  const isLand = orientation === 'landscape';
  const { w: pageW, h: pageH } = PAGE_SIZE[orientation];

  const editClass = "outline-none focus:outline focus:outline-2 focus:outline-sky-400 focus:bg-sky-400/10 hover:ring-1 hover:ring-sky-300 rounded transition-colors cursor-text";
  const mainImgSrc = mainImage || "https://placehold.co/860x600/e2e8f0/1e293b?text=Property";

  /** 손으로 고칠 수 있는 글자 — 고치고 나가면 입력란에도 반영된다 */
  const editable = (key: keyof PropertyInfo) => ({
    contentEditable: !!onTextChange,
    spellCheck: false,
    suppressContentEditableWarning: true,
    onBlur: (e: React.FocusEvent<HTMLElement>) => onTextChange?.(key, e.currentTarget.innerText),
  });

  // 숫자만 적힌 값(예: 50000)만 '5억' 으로 바꾼다. '8천', '2억 5천' 처럼 이미 글로 적힌 값은 그대로.
  // (예전엔 '8천 / 550만' 의 숫자를 이어 붙여 8550 으로 읽어 가격이 뒤엉켰다)
  const formatPrice = (value: string) => {
    if (!/^[\d,]+$/.test(value.trim())) return value;
    const num = parseInt(value.replace(/[^0-9]/g, ''), 10);
    if (isNaN(num)) return value;
    if (num >= 10000) {
      const eok = Math.floor(num / 10000);
      const man = num % 10000;
      return `${eok}억${man > 0 ? ` ${man.toLocaleString()}` : ''}`;
    }
    return value;
  };
  const isRent = info.transactionType === '월세' || info.transactionType === '단기임대';
  /** 정보가 비어 '-층 / 총 -층', '-개 / -개' 처럼 나오는 값은 '-' 하나로 */
  const clean = (v: unknown) => {
    const t = String(v ?? '').trim();
    return !t || t.replace(/[-층총개/\s]/g, '') === '' ? '-' : t;
  };
  const priceLabel = info.transactionType === '매매' ? '매매가' : info.transactionType === '전세' ? '전세금' : isRent ? '보증금 / 월세' : '가격';

  // ── 1. 대표 사진 (5가지 디자인) ──
  const renderHero = () => {
    const titleSize = isLand ? 'text-[52px]' : 'text-[60px]';
    const sloganSize = isLand ? 'text-[34px]' : 'text-[40px]';
    const img = (extra = '') => (
      <img onClick={() => onImageClick?.('mainImage')} src={mainImgSrc}
        className={`w-full h-full object-cover cursor-pointer ${extra}`} title="클릭하여 메인 이미지 변경" />
    );
    const tag = (
      <div className={`inline-block px-3 py-1 border text-sm font-medium mb-4 w-fit tracking-wider ${layout === 'type3' ? 'border-gray-800 text-gray-800' : 'border-white/40 text-white'}`}>
        <span {...editable('transactionType')} className={editClass}>{info.transactionType || '거래 유형'}</span>
      </div>
    );
    const title = <h1 {...editable('address')} className={`font-bold leading-tight mb-2 tracking-tight drop-shadow-sm max-w-full break-words ${headingFont} ${editClass} ${titleSize}`}>{info.address}</h1>;
    const slogan = <p {...editable('promotionText')} className={`font-bold mb-3 drop-shadow-md max-w-full break-words ${headingFont} ${editClass} ${sloganSize} text-white`}>{info.promotionText}</p>;
    const subtitle = <p {...editable('subTitle')} className={`text-lg font-medium max-w-full break-keep ${editClass}`} style={{ color: secondaryColor }}>{info.subTitle}</p>;

    switch (layout) {
      case 'type2': // Luxury Center
        return (
          <div className="relative h-full">
            <div className="absolute inset-0">{img()}<div className="absolute inset-0 bg-black/40" /></div>
            <div className="relative z-10 p-8 h-full flex items-center justify-center">
              <div className="border border-white/40 p-8 w-full h-full flex flex-col items-center justify-center text-center text-white overflow-hidden">
                <span className="mb-3 text-2xl font-serif-en italic" style={{ color: secondaryColor }}>Prestige Collection</span>
                {title}
                <div className="w-20 h-px bg-white/50 my-5" />
                {slogan}
                <p {...editable('subTitle')} className={`mt-2 w-full text-base font-light tracking-widest break-keep ${editClass}`}>{info.subTitle}</p>
              </div>
            </div>
          </div>
        );
      case 'type3': // Natural Clean
        return (
          <div className="relative h-full bg-white">
            <div className="absolute bottom-0 right-0 w-full h-[78%]">{img()}</div>
            <div className="relative z-10 p-9 bg-white/95 w-[82%] shadow-sm rounded-br-3xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-10" style={{ backgroundColor: primaryColor }} />
                <span className="text-2xl font-bold text-gray-800 tracking-widest">PREMIUM</span>
              </div>
              <h1 {...editable('address')} className={`${isLand ? 'text-[44px]' : 'text-[52px]'} font-bold text-gray-900 mb-2 leading-tight ${headingFont} ${editClass}`}>{info.address}</h1>
              <p {...editable('promotionText')} className={`text-[30px] font-bold mb-1 ${editClass}`} style={{ color: primaryColor }}>{info.promotionText}</p>
            </div>
          </div>
        );
      case 'type4': // Bold Box
        return (
          <div className="relative h-full">
            <div className="absolute inset-0">{img()}</div>
            <div className="absolute bottom-8 right-8 z-10 bg-white/95 p-8 max-w-[86%] shadow-2xl border-l-8" style={{ borderColor: primaryColor }}>
              <div {...editable('transactionType')} className={`text-sm font-bold tracking-widest mb-2 text-gray-500 ${editClass}`}>{info.transactionType}</div>
              <h1 {...editable('address')} className={`${isLand ? 'text-[40px]' : 'text-[46px]'} font-extrabold text-gray-900 mb-2 leading-tight ${headingFont} ${editClass}`}>{info.address}</h1>
              <p {...editable('promotionText')} className={`text-[30px] font-bold mb-3 ${headingFont} ${editClass}`} style={{ color: primaryColor }}>{info.promotionText}</p>
              <p {...editable('subTitle')} className={`text-gray-600 text-base leading-relaxed border-t pt-3 border-gray-200 ${editClass}`}>{info.subTitle}</p>
            </div>
          </div>
        );
      case 'type5': // High-end Minimal
        return (
          <div className="relative h-full">
            <div className="absolute inset-0">{img('grayscale-[30%] contrast-125')}<div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" /></div>
            <div className="relative z-10 p-10 flex flex-col justify-end h-full">
              <p className="text-white/80 text-lg tracking-[0.5em] mb-3 font-light">RESIDENCE</p>
              <h1 {...editable('address')} className={`${isLand ? 'text-[60px]' : 'text-[72px]'} font-black text-white mb-2 tracking-tighter leading-none ${headingFont} ${editClass}`}>{info.address}</h1>
              <p {...editable('promotionText')} className={`text-[44px] font-thin text-white tracking-tight ${editClass}`}>{info.promotionText}</p>
            </div>
          </div>
        );
      default: // type1 Modern Overlay
        return (
          <div className="relative h-full">
            <div className="absolute inset-0">{img()}<div className="absolute inset-0" style={{ background: `linear-gradient(to right, ${darkColor}E6, transparent)` }} /></div>
            <div className="relative z-10 p-12 flex flex-col h-full justify-center text-white items-start text-left">
              <div className="w-12 h-1 mb-6" style={{ backgroundColor: secondaryColor }} />
              {tag}
              {title}
              {slogan}
              {subtitle}
            </div>
          </div>
        );
    }
  };

  // ── 2. 요약 띠 (가격·면적·방·입주) — 세로는 4칸 한 줄, 가로는 2×2 ──
  const renderStats = () => {
    const items: { label: string; key: keyof PropertyInfo; value: string; sub: string }[] = [
      { label: 'PRICE', key: 'priceMain', value: `${formatPrice(info.priceMain)}${isRent && info.priceSub ? ` / ${info.priceSub}` : ''}`, sub: priceLabel },
      { label: 'AREA', key: 'area', value: (info.area || '').split('/')[0].trim(), sub: '면적' },
      { label: 'ROOMS', key: 'roomCount', value: info.roomCount, sub: '방 / 욕실' },
      { label: 'MOVE-IN', key: 'moveInDate', value: (info.moveInDate || '').split(' ')[0], sub: '입주가능일' },
    ];
    const cols = isLand ? 'grid-cols-2' : 'grid-cols-4';
    const valueCls = `block font-black leading-tight break-keep ${isLand ? 'text-[22px]' : 'text-[24px]'}`;

    switch (layout) {
      case 'type2':
        return (
          <div className={`grid ${cols} bg-white border-b border-gray-200 py-5 shrink-0`}>
            {items.map((it, i) => (
              <div key={i} className="px-4 py-2 text-center border-r last:border-r-0 border-gray-200">
                <span {...editable(it.key)} className={`${valueCls} text-gray-800 mb-1 ${headingFont} ${editClass}`}>{it.value}</span>
                <span className="text-xs tracking-widest text-gray-500 font-serif-en">{it.label}</span>
              </div>
            ))}
          </div>
        );
      case 'type3':
        return (
          <div className={`grid ${cols} text-white py-5 shrink-0`} style={{ backgroundColor: primaryColor }}>
            {items.map((it, i) => (
              <div key={i} className="px-4 py-2 text-center">
                <span className="block text-sm opacity-75 mb-1 font-bold">{it.sub}</span>
                <span {...editable(it.key)} className={`${valueCls} ${editClass}`}>{it.value}</span>
              </div>
            ))}
          </div>
        );
      case 'type4':
        return (
          <div className="bg-gray-100 px-8 py-5 shrink-0">
            <div className={`grid ${cols} gap-3`}>
              {items.map((it, i) => (
                <div key={i} className="bg-white px-4 py-3 border-t-4 shadow-sm" style={{ borderColor: primaryColor }}>
                  <span className="block text-xs font-bold text-gray-400 mb-1">{it.label}</span>
                  <span {...editable(it.key)} className={`${valueCls} text-gray-900 ${editClass}`}>{it.value}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 'type5':
        return (
          <div className={`grid ${cols} gap-y-4 bg-black text-white px-10 py-6 shrink-0`}>
            {items.map((it, i) => (
              <div key={i} className="flex flex-col">
                <span {...editable(it.key)} className={`${valueCls} font-light tracking-tight mb-1 ${editClass}`} style={{ color: i === 0 ? secondaryColor : 'white' }}>{it.value}</span>
                <span className="text-xs font-bold text-gray-500 tracking-[0.2em]">{it.label}</span>
              </div>
            ))}
          </div>
        );
      default: // type1 — 사진 위에 살짝 겹쳐 뜨는 카드 (가로는 오른쪽 칸 맨 위라 겹치지 않는다)
        return (
          <div className={`relative z-20 ${isLand ? 'mx-8 mt-8' : '-mt-14 mx-10'} bg-white shadow-xl grid ${cols} overflow-hidden shrink-0`}>
            {items.map((it, i) => (
              <div key={i} className="py-4 px-3 border-r border-b border-gray-100 flex flex-col items-center justify-center text-center">
                <span className="text-xs text-gray-400 font-bold tracking-widest mb-1">{it.label}</span>
                <span {...editable(it.key)} className={`${valueCls} ${editClass}`} style={{ color: primaryColor }}>{it.value}</span>
                <span className="text-xs text-gray-400 mt-1 font-bold">{it.sub}</span>
              </div>
            ))}
          </div>
        );
    }
  };

  // ── 3. 매물 상세 정보 + 소개글 (남는 칸을 소개글이 채우고, 넘치면 글자를 줄인다) ──
  const noticeBoxRef = useRef<HTMLDivElement>(null);
  const noticeTextRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const fit = () => {
      const box = noticeBoxRef.current;
      const text = noticeTextRef.current;
      if (!box || !text) return;
      const cs = getComputedStyle(box);
      const avail = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      let size = 17;
      Object.assign(text.style, { fontSize: `${size}px`, display: '', webkitLineClamp: '', overflow: '' });
      while (text.scrollHeight > avail && size > 12) {
        size -= 0.5;
        text.style.fontSize = `${size}px`;
      }
      if (text.scrollHeight > avail) {
        const lh = parseFloat(getComputedStyle(text).lineHeight) || size * 1.6;
        Object.assign(text.style, { display: '-webkit-box', webkitBoxOrient: 'vertical', overflow: 'hidden', webkitLineClamp: String(Math.max(1, Math.floor(avail / lh))) });
      }
    };
    fit();
    document.fonts?.ready.then(fit);
  });

  const renderInfo = () => {
    const rows: { l: string; key: keyof PropertyInfo; full?: boolean }[] = [
      { l: '공급/전용면적', key: 'area', full: true },
      { l: '해당층/총층', key: 'floor' },
      { l: '방향', key: 'direction' },
      { l: '주차', key: 'parking' },
      { l: '월 관리비', key: 'managementFee' },
      { l: '옵션', key: 'options', full: true },
    ];
    return (
      <div className={`flex-1 min-h-0 flex flex-col ${isLand ? 'px-8 pt-5 pb-4' : 'px-10 pt-6 pb-5'} bg-white`}>
        <div className="flex items-end justify-between mb-3 shrink-0">
          <div>
            <span className="font-bold text-xs tracking-widest block mb-1" style={{ color: primaryColor }}>PROPERTY INFO</span>
            <h2 className={`text-[26px] font-black text-gray-800 ${headingFont}`}>매물 상세 정보</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-8 shrink-0">
          {rows.map((r) => (
            <div key={r.key} className={`flex justify-between items-baseline gap-4 border-b border-gray-200 py-2.5 ${r.full ? 'col-span-2' : ''}`}>
              <span className="text-gray-600 font-bold text-[15px] shrink-0">{r.l}</span>
              <span {...editable(r.key)} className={`font-extrabold text-gray-950 text-[17px] text-right break-keep ${editClass}`}>{clean(info[r.key])}</span>
            </div>
          ))}
        </div>
        {info.noticeContent && info.noticeContent.trim() !== '' ? (
          <div ref={noticeBoxRef} className={`flex-1 min-h-0 overflow-hidden mt-4 px-5 py-4 ${layout === 'type4' ? 'border-2 border-gray-100' : 'bg-[#f4f6f8] rounded-sm'}`}>
            <p ref={noticeTextRef} {...editable('noticeContent')} className={`text-gray-900 font-bold leading-relaxed whitespace-pre-wrap ${bodyFont} ${editClass}`}>{info.noticeContent}</p>
          </div>
        ) : <div className="flex-1" />}
      </div>
    );
  };

  // ── 4. 연락처 (사무소·전화·QR) — 인쇄물이라 버튼 대신 크게 적고 QR 로 매물 페이지를 연다 ──
  const renderContact = () => {
    const light = layout === 'type4';
    const bg = layout === 'type5' ? '#000000' : light ? '#ffffff' : darkColor;
    const sub = light ? 'text-gray-500' : 'text-white/70';
    const mainPhone = info.agentMobile || info.agentPhone;
    const otherPhone = info.agentMobile && info.agentPhone && info.agentPhone !== info.agentMobile ? info.agentPhone : '';
    return (
      <div className={`shrink-0 flex items-center gap-6 ${isLand ? 'px-8 py-5' : 'px-10 py-6'} ${light ? 'text-gray-900 border-t-4' : 'text-white'}`}
        style={{ backgroundColor: bg, borderColor: light ? primaryColor : undefined }}>
        <div className="flex-1 min-w-0">
          <p {...editable('agentName')} className={`font-black text-[24px] leading-tight break-keep ${headingFont} ${editClass}`}>{info.agentName}</p>
          {info.agentRepresentative && <p {...editable('agentRepresentative')} className={`text-[14px] font-bold mt-1 ${sub} ${editClass}`}>{info.agentRepresentative}</p>}
          {(info.agentAdditionalInfo || []).filter(Boolean).map((line, i) => (
            <p key={i} className={`text-[12px] leading-snug mt-0.5 ${sub} break-keep`}>{line}</p>
          ))}
        </div>
        <div className="shrink-0 flex flex-col items-end">
          <div className="flex items-center gap-2">
            <span className={`w-10 h-10 rounded-full flex items-center justify-center ${light ? 'text-white' : 'bg-white'}`} style={{ backgroundColor: light ? primaryColor : undefined, color: light ? undefined : bg }}>
              <PhoneIcon className="w-5 h-5" />
            </span>
            <span {...editable(info.agentMobile ? 'agentMobile' : 'agentPhone')} className={`font-black tracking-tight ${isLand ? 'text-[32px]' : 'text-[36px]'} ${editClass}`}>{mainPhone}</span>
          </div>
          {otherPhone && <span className={`text-[16px] font-bold mt-1 ${sub}`}>{otherPhone}</span>}
        </div>
        {qrDataUrl && (
          <div className="shrink-0 flex flex-col items-center">
            <img src={qrDataUrl} alt="매물 QR" className="w-[104px] h-[104px] bg-white p-1.5 rounded" />
            <span className={`text-[11px] font-bold mt-1 ${sub}`}>QR로 매물 보기</span>
          </div>
        )}
      </div>
    );
  };

  // ══ 1번 디자인 — 거리 가독성 (압구정 유리창 연구, 2026-10-01) ══
  // 행인이 3~5m 밖에서 1~2초 본다 → 가격(종이 높이 12% 이상) > 단지명·평형 > 전화 순서로 크게.
  // 색은 사무소 대표색 + 검정 두 가지, 빨강은 딱지에만. 모든 매물이 같은 틀이라 여러 장 붙이면 브랜드 벽이 된다.
  const pyeong = info.pyeong || (() => {
    const m = (info.area || '').match(/([\d.]+)\s*평/);
    return m ? `${Math.round(parseFloat(m[1]))}평` : '';
  })();
  // 예전 버그로 '8천 / 550만 / 550만' 처럼 저장된 값도 있어 '/' 앞만 보증금으로 쓴다
  const priceMainOnly = (info.priceMain || '').split('/')[0].trim();
  const priceText = `${formatPrice(priceMainOnly)}${isRent && info.priceSub ? ` / ${info.priceSub}` : ''}`;
  const tradeWord = info.transactionType === '단기임대' ? '단기' : info.transactionType;
  const showPhoto = info.showPhoto !== false;
  const phone = info.agentMobile || info.agentPhone || '';

  const renderStreet = () => {
    const pad = 56;
    const fitAttrs = (max: number, min: number) => ({ 'data-fit': '', 'data-fit-max': max, 'data-fit-min': min } as Record<string, unknown>);
    const oneLine: React.CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', width: '100%', flexShrink: 0 };

    const head = (
      <div className="flex items-center gap-3" style={{ marginBottom: 16, flexShrink: 0 }}>
        {info.badge && (
          <span style={{ background: '#e11d2a', color: '#fff', fontSize: 28, fontWeight: 900, padding: '6px 18px', borderRadius: 6, letterSpacing: 1 }}>{info.badge}</span>
        )}
        <span {...editable('transactionType')} className={editClass}
          style={{ border: `3px solid ${primaryColor}`, color: primaryColor, fontSize: 28, fontWeight: 900, padding: '3px 16px', borderRadius: 6 }}>{tradeWord}</span>
      </div>
    );
    const name = (
      <h1 {...editable('address')} {...fitAttrs(isLand ? 80 : 90, 40)} className={editClass}
        style={{ ...oneLine, fontWeight: 900, color: '#111', lineHeight: 1.12, letterSpacing: -2 }}>{info.address}</h1>
    );
    const sizeLine = (
      <div style={{ ...oneLine, fontSize: isLand ? 34 : 40, fontWeight: 800, color: '#374151', marginTop: 6 }}>
        <span {...editable('pyeong')} className={editClass}>{pyeong}</span>
        {clean(info.floor) !== '-' && <span style={{ color: '#9ca3af', fontWeight: 600 }}>{pyeong ? '  ·  ' : ''}{info.floor}</span>}
      </div>
    );
    const price = (
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, marginTop: isLand ? 14 : 18, flexShrink: 0 }}>
        <span style={{ fontSize: isLand ? 30 : 34, fontWeight: 900, color: primaryColor, flexShrink: 0 }}>{priceLabel}</span>
        <span {...editable('priceMain')} {...fitAttrs(isLand ? 140 : 168, 70)} className={editClass}
          onBlur={(e) => {
            // '보증금 / 월세' 를 한 번에 고치므로 '/' 앞뒤를 나눠 각각 저장한다
            const [main, sub] = e.currentTarget.innerText.split('/').map((t) => t.trim());
            onTextChange?.('priceMain', main || '');
            if (isRent) onTextChange?.('priceSub', sub || '');
          }}
          style={{ ...oneLine, flex: 1, fontWeight: 900, color: primaryColor, lineHeight: 1, letterSpacing: -5 }}>{priceText}</span>
      </div>
    );
    const rows: { l: string; key: keyof PropertyInfo }[] = [
      { l: '면적', key: 'area' }, { l: '방향', key: 'direction' },
      { l: '방/욕실', key: 'roomCount' }, { l: '주차', key: 'parking' },
      { l: '관리비', key: 'managementFee' }, { l: '입주', key: 'moveInDate' },
    ];
    const big = !showPhoto;
    const infoRows = (
      <div className="grid grid-cols-2" style={{ columnGap: 28 }}>
        {rows.map((r) => (
          <div key={r.key} className={r.key === 'area' ? 'col-span-2' : ''}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14, borderBottom: '1px solid #e5e7eb', padding: big ? '12px 0' : '9px 0' }}>
            <span style={{ fontSize: big ? 22 : 19, fontWeight: 700, color: '#6b7280', flexShrink: 0 }}>{r.l}</span>
            <span {...editable(r.key)} className={editClass} style={{ fontSize: big ? 26 : 22, fontWeight: 800, color: '#111', textAlign: 'right', wordBreak: 'keep-all' }}>{clean(info[r.key])}</span>
          </div>
        ))}
      </div>
    );
    const notice = info.noticeContent && info.noticeContent.trim() !== '' ? (
      <div ref={noticeBoxRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden', marginTop: 16, padding: '14px 18px', background: '#f4f6f8', borderLeft: `5px solid ${primaryColor}` }}>
        <p ref={noticeTextRef} {...editable('noticeContent')} className={`text-gray-900 font-bold leading-relaxed whitespace-pre-wrap ${editClass}`}>{info.noticeContent}</p>
      </div>
    ) : <div style={{ flex: 1 }} />;
    const photo = (h: number | string) => (
      <div style={{ height: h, borderRadius: 14, overflow: 'hidden', flexShrink: 0 }}>
        <img onClick={() => onImageClick?.('mainImage')} src={mainImgSrc} className="w-full h-full object-cover cursor-pointer" title="클릭하여 메인 이미지 변경" />
      </div>
    );
    const band = (
      <div className="flex items-center" style={{ flexShrink: 0, gap: 28, background: primaryColor, color: '#fff', padding: `${isLand ? 18 : 22}px ${pad}px` }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-baseline" style={{ gap: 14 }}>
            <p {...editable('agentName')} {...fitAttrs(30, 18)} className={editClass} style={{ ...oneLine, width: 'auto', maxWidth: '100%', fontWeight: 900, lineHeight: 1.2 }}>{info.agentName}</p>
          </div>
          <p style={{ ...oneLine, fontSize: 16, fontWeight: 600, opacity: .85, marginTop: 2, textOverflow: 'ellipsis' }}>
            {[info.agentRepresentative, ...(info.agentAdditionalInfo || []).filter((l) => l.startsWith('등록번호'))].filter(Boolean).join('  ·  ')}
          </p>
          <div className="flex items-center" style={{ gap: 12, marginTop: 8 }}>
            <PhoneIcon style={{ width: 46, height: 46, flexShrink: 0 }} />
            <span {...editable(info.agentMobile ? 'agentMobile' : 'agentPhone')} {...fitAttrs(isLand ? 62 : 70, 36)} className={editClass}
              style={{ ...oneLine, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1.05 }}>{phone}</span>
          </div>
        </div>
        {qrDataUrl && (
          <div style={{ flexShrink: 0, textAlign: 'center' }}>
            <a href={qrLink || undefined} target="_blank" rel="noopener noreferrer" title="매물 상세보기" style={{ display: 'block', cursor: qrLink ? 'pointer' : 'default' }}>
              <img src={qrDataUrl} alt="매물 QR" style={{ width: isLand ? 116 : 128, height: isLand ? 116 : 128, background: '#fff', padding: 6, borderRadius: 8 }} />
            </a>
            <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4, opacity: .9 }}>QR로 사진·위치 보기</div>
          </div>
        )}
      </div>
    );

    return (
      <div ref={ref} data-flyer-page className="bg-white overflow-hidden flex flex-col font-sans" style={{ width: pageW, height: pageH }}>
        <div style={{ height: 14, background: primaryColor, flexShrink: 0 }} />
        {isLand ? (
          <div className="flex" style={{ flex: 1, minHeight: 0 }}>
            <div className="flex flex-col" style={{ flex: 1, minWidth: 0, padding: `32px ${pad}px 22px` }}>
              {head}{name}{sizeLine}{price}
              <div style={{ marginTop: 18, flexShrink: 0 }}>{infoRows}</div>
              {!showPhoto && notice}
            </div>
            {showPhoto && <div style={{ width: 500, padding: '32px 40px 22px 0', display: 'flex', flexDirection: 'column' }}>{photo('100%')}</div>}
          </div>
        ) : (
          <div className="flex flex-col" style={{ flex: 1, minHeight: 0, padding: `38px ${pad}px 24px` }}>
            {head}{name}{sizeLine}{price}
            {showPhoto && <div style={{ marginTop: 22, flexShrink: 0 }}>{photo(290)}</div>}
            <div style={{ marginTop: showPhoto ? 16 : 30, flexShrink: 0 }}>{infoRows}</div>
            {notice}
          </div>
        )}
        {band}
      </div>
    );
  };

  // 한 줄 글자(단지명·가격·사무소명)가 칸을 넘치면 넘치지 않을 때까지 줄인다
  useLayoutEffect(() => {
    const host = (ref as React.RefObject<HTMLDivElement>)?.current;
    if (!host) return;
    const fitAll = () => {
      host.querySelectorAll<HTMLElement>('[data-fit]').forEach((el) => {
        const max = Number(el.dataset.fitMax) || 60;
        const min = Number(el.dataset.fitMin) || 16;
        let size = max;
        el.style.fontSize = `${size}px`;
        while (el.scrollWidth > el.clientWidth + 1 && size > min) {
          size -= 2;
          el.style.fontSize = `${size}px`;
        }
      });
    };
    fitAll();
    document.fonts?.ready.then(fitAll);
  });

  if (layout === 'type1') return renderStreet();

  return (
    <div
      ref={ref}
      data-flyer-page
      className={`bg-white overflow-hidden flex ${isLand ? 'flex-row' : 'flex-col'} ${bodyFont}`}
      style={{ width: pageW, height: pageH }}
    >
      {isLand ? (
        <>
          <div className="relative h-full shrink-0" style={{ width: 600 }}>{renderHero()}</div>
          <div className="flex-1 min-w-0 h-full flex flex-col">
            {renderStats()}
            {renderInfo()}
            {renderContact()}
          </div>
        </>
      ) : (
        <>
          <div className="relative shrink-0" style={{ height: 500 }}>{renderHero()}</div>
          {renderStats()}
          {renderInfo()}
          {renderContact()}
        </>
      )}
    </div>
  );
});

FlyerCanvas.displayName = 'FlyerCanvas';

export default FlyerCanvas;
