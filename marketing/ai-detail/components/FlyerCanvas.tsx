
import React, { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FlyerItem, FlyerState, PropertyInfo } from '../types';
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
  /** 새 디자인 글자 위치·크기 조정 (null = 처음대로) */
  onAdjust?: (key: string, value: { x: number; y: number; s: number; c?: string; f?: string; h?: boolean } | null) => void;
  /** 계산해서 만든 글자를 손으로 고친 값 (null = 처음대로, '' = 빼기) */
  onTextOverride?: (name: string, value: string | null) => void;
  /** 새로 넣은 글자·이미지 목록 바꾸기 */
  onItemsChange?: (items: FlyerItem[]) => void;
  /** 이미지 고르기 창을 열어 올린 뒤 주소를 돌려준다 */
  onPickImage?: (done: (url: string) => void) => void;
}

const FlyerCanvas = forwardRef<HTMLDivElement, FlyerCanvasProps>(({ data, orientation, qrDataUrl, qrLink, onTextChange, onImageClick, onAdjust, onTextOverride, onItemsChange, onPickImage }, ref) => {
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
  /** 입력란 [표시] 체크를 끈 항목은 홍보지에서 뺀다 */
  const vis = (key: string) => !(info.hiddenFields || []).includes(key);
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
        {vis('propertyKind') && info.propertyKind && <span {...editable('propertyKind')} className={editClass}
          style={{ border: `3px solid ${primaryColor}`, color: primaryColor, fontSize: 28, fontWeight: 900, padding: '3px 16px', borderRadius: 6 }}>{info.propertyKind}</span>}
        {vis('transactionType') && <span {...editable('transactionType')} className={editClass}
          style={{ border: `3px solid ${primaryColor}`, color: primaryColor, fontSize: 28, fontWeight: 900, padding: '3px 16px', borderRadius: 6 }}>{tradeWord}</span>}
      </div>
    );
    const name = (
      <h1 {...editable('address')} {...fitAttrs(isLand ? 80 : 90, 40)} className={editClass}
        style={{ ...oneLine, fontWeight: 900, color: '#111', lineHeight: 1.12, letterSpacing: -2 }}>{info.address}</h1>
    );
    // 크기 줄 — 물건 종류별로 처음 채운 값 (예전 저장본은 평형·층으로)
    const sizeText = info.sizeLine ?? [pyeong, clean(info.floor) !== '-' ? info.floor : ''].filter(Boolean).join(' · ');
    const sizeLine = vis('sizeLine') && sizeText ? (
      <div {...editable('sizeLine')} className={editClass} style={{ ...oneLine, fontSize: isLand ? 34 : 40, fontWeight: 800, color: '#374151', marginTop: 6 }}>{sizeText}</div>
    ) : null;
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
    // 정보 표 — 사장님이 입력란에서 지우고·고치고·추가한 그대로. 값이 빈 줄은 싣지 않는다.
    const tableRows = (info.rows ?? [
      { id: 'area', label: '면적', value: info.area }, { id: 'dir', label: '방향', value: info.direction },
      { id: 'room', label: '방/욕실', value: info.roomCount }, { id: 'park', label: '주차', value: info.parking },
      { id: 'fee', label: '관리비', value: info.managementFee }, { id: 'move', label: '입주', value: info.moveInDate },
      { id: 'opt', label: '옵션', value: info.options },
    ]).filter((r) => r.label.trim() && clean(r.value) !== '-');
    const big = !showPhoto;
    const infoRows = (
      <div className="grid grid-cols-2" style={{ columnGap: 28, gridAutoFlow: 'row dense' }}>
        {tableRows.map((r) => (
          <div key={r.id} className={r.value.length > 13 ? 'col-span-2' : ''}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14, borderBottom: '1px solid #e5e7eb', padding: big ? '12px 0' : '9px 0' }}>
            <span style={{ fontSize: big ? 22 : 19, fontWeight: 700, color: '#6b7280', flexShrink: 0 }}>{r.label}</span>
            <span style={{ fontSize: big ? 26 : 22, fontWeight: 800, color: '#111', textAlign: 'right', wordBreak: 'keep-all' }}>{r.value}</span>
          </div>
        ))}
      </div>
    );
    const notice = vis('noticeContent') && info.noticeContent && info.noticeContent.trim() !== '' ? (
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
            {vis('agentRepresentative') ? [info.agentRepresentative, ...(info.agentAdditionalInfo || []).filter((l) => l.startsWith('등록번호'))].filter(Boolean).join('  ·  ') : ''}
          </p>
          <div className="flex items-center" style={{ gap: 12, marginTop: 8 }}>
            <PhoneIcon style={{ width: 46, height: 46, flexShrink: 0 }} />
            <span {...editable(info.agentMobile ? 'agentMobile' : 'agentPhone')} {...fitAttrs(isLand ? 62 : 70, 36)} className={editClass}
              style={{ ...oneLine, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1.05 }}>{phone}</span>
          </div>
        </div>
        {qrDataUrl && vis('qr') && (
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

  // ══ 6번 디자인 — 심플 (글자만 크게, 흰 바탕·검정 글씨, 가운데 정렬) ══
  // 붙여 둔 종이 한 장처럼: 물건구분+거래 → 금액 → 핵심 몇 줄 → 전화번호. 사진·표 없이 멀리서 읽히는 것만.
  const renderSimple = () => {
    const kind = (info.propertyKind || '').split('/')[0].trim();
    const head = [vis('propertyKind') ? kind : '', vis('transactionType') ? tradeWord : ''].filter(Boolean).join(' ');
    const lines = (info.rows ?? [])
      .filter((r) => r.label.trim() && clean(r.value) !== '-' && r.value.length <= 18)
      .slice(0, isLand ? 2 : 3);
    const fit = (max: number, min: number) => ({ 'data-fit': '', 'data-fit-max': max, 'data-fit-min': min } as Record<string, unknown>);
    const line: React.CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', width: '100%', textAlign: 'center', flexShrink: 0 };
    return (
      <div ref={ref} data-flyer-page className="bg-white overflow-hidden flex flex-col items-center font-sans"
        style={{ width: pageW, height: pageH, padding: isLand ? '44px 80px 36px' : '80px 70px 56px', color: '#111', border: `14px solid ${primaryColor}` }}>
        {info.badge && (
          <span style={{ background: '#e11d2a', color: '#fff', fontSize: 30, fontWeight: 900, padding: '6px 22px', borderRadius: 6, marginBottom: 18, flexShrink: 0 }}>{info.badge}</span>
        )}
        {head && <div {...fit(isLand ? 120 : 150, 50)} style={{ ...line, fontWeight: 900, lineHeight: 1.15, letterSpacing: -3 }}>{head}</div>}
        <div {...fit(isLand ? 150 : 180, 70)} style={{ ...line, fontWeight: 900, lineHeight: 1.1, letterSpacing: -5, marginTop: isLand ? 6 : 14 }}>{priceText}</div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: isLand ? 8 : 14, paddingTop: isLand ? 6 : 12 }}>
          {vis('sizeLine') && info.sizeLine && <div {...fit(isLand ? 46 : 54, 28)} style={{ ...line, fontWeight: 800, color: '#374151' }}>{info.sizeLine}</div>}
          {lines.map((r) => (
            <div key={r.id} {...fit(isLand ? 36 : 42, 24)} style={{ ...line, fontWeight: 700, color: '#374151' }}>{r.label} {r.value}</div>
          ))}
        </div>
        <div style={{ width: 120, height: 5, background: primaryColor, margin: isLand ? '6px 0 14px' : '10px 0 22px', flexShrink: 0 }} />
        <div {...fit(isLand ? 96 : 110, 50)} style={{ ...line, fontWeight: 900, letterSpacing: -2, lineHeight: 1.1 }}>{phone}</div>
        <div className="flex items-center justify-center" style={{ gap: 18, marginTop: 10, width: '100%', flexShrink: 0 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#4b5563', textAlign: 'center' }}>
            {info.agentName}
            {vis('agentRepresentative') && info.agentRepresentative && <span style={{ fontWeight: 600, fontSize: 20, marginLeft: 10 }}>{info.agentRepresentative}</span>}
          </div>
          {qrDataUrl && vis('qr') && (
            <a href={qrLink || undefined} target="_blank" rel="noopener noreferrer" title="매물 상세보기" style={{ display: 'block' }}>
              <img src={qrDataUrl} alt="매물 QR" style={{ width: 92, height: 92 }} />
            </a>
          )}
        </div>
      </div>
    );
  };

  // ══ 새 디자인 (2026-10-15 사장님 회의) — "유리창 밖 2~3m에서 3초 안에 읽히게" ══
  // ① 숫자 크게형: 물건·거래 → 금액(가장 크게) → 크기 줄 → 실제 장점 칩 → 전화(크게)+QR
  // ② 사진형: 사진 1장 → 금액 → 크기 줄 → 칩 → 전화+QR
  // 흰 바탕 + 사무소 대표색 하나 (잉크 절약·햇빛에 바래도 읽힘). 장식·영어 문구 없음. 값은 등록된 실제 값만.
  const fitBy = (max: number, min: number) => ({ 'data-fit': '', 'data-fit-max': max, 'data-fit-min': min } as Record<string, unknown>);
  const one: React.CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', width: '100%', flexShrink: 0, textAlign: 'center' };
  const kindWord = (info.propertyKind || '').split('/')[0].trim();
  const headWord = [vis('propertyKind') ? kindWord : '', vis('transactionType') ? tradeWord : ''].filter(Boolean).join(' · ');
  const sizeWord = (info.sizeLine || '').replace(/저층층|중층층|고층층/g, (w) => w.slice(0, 2)) || [pyeong, clean(info.floor) !== '-' ? info.floor : '', clean(info.direction) !== '-' ? info.direction : ''].filter(Boolean).join(' · ');
  /* 장점 칩 — 정보 표에서 짧은 실제 값만 (없으면 칩 없음) */
  const chips = (info.rows ?? [])
    .filter((r) => r.label.trim() && clean(r.value) !== '-' && `${r.label} ${r.value}`.length <= 14)
    .slice(0, 4)
    .map((r) => `${r.label} ${r.value}`);
  const priceEditable = {
    ...editable('priceMain'),
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      const [main, sub] = e.currentTarget.innerText.split('/').map((t) => t.trim());
      onTextChange?.('priceMain', main || '');
      if (isRent) onTextChange?.('priceSub', sub || '');
    },
  };

  /* ── 요소 편집 — 인디자인처럼 (2026-10-15 사장님 요청) ──
   * 한 번 클릭: 파란 테두리 + 네 모서리 손잡이. 안쪽을 끌면 이동, 모서리를 끌면 크기.
   * 더블클릭: 글자 고치기 (사진은 사진 바꾸기). 빈 곳 클릭: 선택 풀기.
   * 값은 info.adjust 에 저장돼 인쇄·이미지·공유 페이지에도 그대로 나온다. 테두리·손잡이·도구는 data-noexport 라 찍히지 않는다. */
  const [sel, setSel] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  /* 계산해서 만든 글자(머리 띠·금액 이름·칩·사무소 줄)도 눌러서 고친다 — info.texts 에 저장, 비우면 그 글자는 빠진다 */
  const tx = (name: string, fallback: string) => info.texts?.[name] ?? fallback;
  const edt = (name: string, fallback: string) => ({
    contentEditable: !!onTextOverride,
    spellCheck: false,
    suppressContentEditableWarning: true,
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      const v = e.currentTarget.innerText.replace(/\s+/g, ' ').trim();
      onTextOverride?.(name, v === fallback ? null : v);
    },
  });
  const canAdjust = !!onAdjust;
  const akey = (name: string) => `${layout}-${orientation}-${name}`;
  const adj = (name: string) => info.adjust?.[akey(name)] || { x: 0, y: 0, s: 1 };
  const sz = (name: string, n: number) => Math.round(n * adj(name).s);
  /* 미리보기는 줄여 보이므로 화면 px → 홍보지 px */
  const ratioOf = (el: HTMLElement) => {
    const page = el.closest('[data-flyer-page]') as HTMLElement | null;
    return page ? page.getBoundingClientRect().width / page.offsetWidth : 1;
  };
  const drag = (e: React.PointerEvent, onMove: (ev: PointerEvent) => void) => {
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX, sy = e.clientY;
    let moved = false;
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 3) return; // 살짝 떨린 클릭은 이동 아님
      moved = true;
      onMove(ev);
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  /* 안쪽 끌기 = 이동 */
  const startMove = (name: string, e: React.PointerEvent) => {
    setSel(name);
    setEditing(null);
    const ratio = ratioOf(e.currentTarget as HTMLElement);
    const base = adj(name);
    const sx = e.clientX, sy = e.clientY;
    drag(e, (ev) => onAdjust?.(akey(name), { ...base, x: Math.round(base.x + (ev.clientX - sx) / ratio), y: Math.round(base.y + (ev.clientY - sy) / ratio) }));
  };
  /* 모서리 끌기 = 크기 (가운데에서 멀어지면 커지고 가까워지면 작아진다) */
  const startResize = (name: string, e: React.PointerEvent) => {
    const box = ((e.currentTarget as HTMLElement).closest('[data-mov]') as HTMLElement).getBoundingClientRect();
    const cx = box.left + box.width / 2, cy = box.top + box.height / 2;
    const d0 = Math.max(8, Math.hypot(e.clientX - cx, e.clientY - cy));
    const base = adj(name);
    drag(e, (ev) => {
      const k = Math.hypot(ev.clientX - cx, ev.clientY - cy) / d0;
      onAdjust?.(akey(name), { ...base, s: Math.min(3, Math.max(0.3, +(base.s * k).toFixed(3))) });
    });
  };
  /* 더블클릭 = 글자 고치기 — 그 칸 끝에 커서를 넣는다 */
  const startEdit = (name: string, e: React.MouseEvent, onDouble?: () => void) => {
    e.stopPropagation();
    if (onDouble) return onDouble();
    const wrap = (e.currentTarget as HTMLElement).closest('[data-mov]') as HTMLElement;
    // 칩처럼 한 묶음에 여러 칸이면 누른 자리의 칸
    const hit = document.elementsFromPoint(e.clientX, e.clientY).find((x) => wrap?.contains(x) && x.getAttribute('contenteditable') === 'true') as HTMLElement | undefined;
    const el = hit || wrap?.querySelector<HTMLElement>('[contenteditable="true"]');
    if (!el) return;
    setEditing(name);
    requestAnimationFrame(() => {
      el.focus();
      const r = document.createRange();
      r.selectNodeContents(el);
      if (el.innerText.trim() !== '새 글자') r.collapse(false); // 막 넣은 글자는 통째로 골라 바로 덮어 쓰게
      const ws = window.getSelection();
      ws?.removeAllRanges();
      ws?.addRange(r);
    });
  };
  /* 글자 폰트 — index.html 에서 불러온다 */
  const FONTS: [string, string][] = [
    ['', '기본 (프리텐다드)'], ["'Black Han Sans'", '검은고딕'], ["'Do Hyeon'", '도현'], ["'Jua'", '주아'],
    ["'Nanum Myeongjo'", '나눔명조'], ["'Song Myung'", '송명'], ["'Nanum Pen Script'", '나눔손글씨'],
  ];
  /* 고른 글자 색·폰트 — 요소에 직접 넣는다 */
  const look = (name: string): React.CSSProperties => {
    const a = adj(name);
    return { ...(a.c ? { color: a.c } : {}), ...(a.f ? { fontFamily: `${a.f}, 'Pretendard', sans-serif` } : {}) };
  };
  const setStyle = (name: string, patch: { c?: string; f?: string }) => {
    const next = { ...adj(name), ...patch };
    if (!next.c) delete next.c;
    if (!next.f) delete next.f;
    onAdjust?.(akey(name), next);
  };
  const toolBtn: React.CSSProperties = { height: 28, padding: '0 10px', border: 0, borderRadius: 6, background: '#fff', color: '#111', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' };
  const HANDLE = 14;
  const handles: [string, React.CSSProperties][] = [
    ['nwse-resize', { left: -HANDLE / 2 - 4, top: -HANDLE / 2 - 4 }],
    ['nesw-resize', { right: -HANDLE / 2 - 4, top: -HANDLE / 2 - 4 }],
    ['nesw-resize', { left: -HANDLE / 2 - 4, bottom: -HANDLE / 2 - 4 }],
    ['nwse-resize', { right: -HANDLE / 2 - 4, bottom: -HANDLE / 2 - 4 }],
  ];
  const mov = (name: string, node: React.ReactNode, wrap: React.CSSProperties = {}, opt: { texts?: string[]; extra?: React.ReactNode; onDouble?: () => void; noStyle?: boolean } = {}) => {
    const a = adj(name);
    if (a.h) return null; // 삭제(숨김)한 요소
    const on = canAdjust && sel === name;
    const typing = editing === name;
    return (
      <div data-mov="" data-name={name} onBlurCapture={() => typing && setEditing(null)}
        style={{ position: 'relative', flexShrink: 0, width: 'fit-content', maxWidth: '100%', marginLeft: 'auto', marginRight: 'auto', transform: a.x || a.y ? `translate(${a.x}px, ${a.y}px)` : undefined, zIndex: on ? 40 : undefined, ...wrap }}>
        {!opt.noStyle && (a.c || a.f) && React.isValidElement(node)
          ? React.cloneElement(node as React.ReactElement<{ style?: React.CSSProperties }>, { style: { ...((node as React.ReactElement<{ style?: React.CSSProperties }>).props.style || {}), ...look(name) } })
          : node}
        {/* 글자를 고치는 중이 아니면 덮개가 클릭·끌기를 받는다 */}
        {canAdjust && !typing && (
          <div data-noexport="" title="끌어서 이동 · 모서리로 크기 · 더블클릭으로 고치기"
            onPointerDown={(e) => startMove(name, e)} onDoubleClick={(e) => startEdit(name, e, opt.onDouble)}
            style={{ position: 'absolute', inset: 0, cursor: on ? 'move' : 'pointer', zIndex: 1 }} />
        )}
        {on && (
          <>
            <div data-noexport="" style={{ position: 'absolute', inset: -4, border: `2px solid ${typing ? '#f59e0b' : '#1d9bf0'}`, pointerEvents: 'none', zIndex: 45 }} />
            {!typing && handles.map(([cursor, pos], i) => (
              <div key={i} data-noexport="" onPointerDown={(e) => startResize(name, e)}
                style={{ position: 'absolute', width: HANDLE, height: HANDLE, background: '#fff', border: '2px solid #1d9bf0', cursor, zIndex: 46, ...pos }} />
            ))}
            <div data-noexport="" className="flex items-center" onPointerDown={(e) => e.stopPropagation()}
              style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 14, gap: 4, padding: 4, borderRadius: 8, background: '#0f172a', boxShadow: '0 6px 20px rgba(0,0,0,.3)', whiteSpace: 'nowrap', zIndex: 50 }}>
              <span style={{ color: '#cbd5e1', fontSize: 12, fontWeight: 700, padding: '0 6px' }}>{Math.round(a.s * 100)}%</span>
              {!opt.noStyle && (
                <>
                  <label title="글자 색" style={{ ...toolBtn, display: 'flex', alignItems: 'center', gap: 4, padding: '0 6px' }}>
                    <span style={{ width: 16, height: 16, borderRadius: 4, background: a.c || '#111', border: '1px solid #cbd5e1' }} />
                    색
                    <input type="color" value={a.c || '#111111'} onChange={(e) => setStyle(name, { c: e.target.value })} style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }} />
                  </label>
                  <select title="폰트" value={a.f || ''} onChange={(e) => setStyle(name, { f: e.target.value })}
                    style={{ ...toolBtn, padding: '0 4px', fontFamily: a.f || 'inherit' }}>
                    {FONTS.map(([v, label]) => <option key={label} value={v} style={{ fontFamily: v || 'inherit' }}>{label}</option>)}
                  </select>
                </>
              )}
              {opt.extra ?? <span style={{ color: '#94a3b8', fontSize: 12, padding: '0 6px' }}>{typing ? '고치는 중 — 바깥을 누르면 끝' : '더블클릭: 글자 고치기'}</span>}
              <button type="button" title="위치·크기·글자 처음대로" onClick={() => { onAdjust?.(akey(name), null); (opt.texts || [name]).forEach((t) => onTextOverride?.(t, null)); }} style={toolBtn}>↺ 처음대로</button>
            </div>
          </>
        )}
      </div>
    );
  };
  /* ── 오른쪽 클릭 메뉴 (인디자인처럼) ──
   * 요소 위: [복사] [삭제]  ·  빈 곳: [새 글자 넣기] [새 이미지 넣기] [붙여넣기] [숨긴 것 다시 보이기]
   * 키보드: Delete = 삭제, Ctrl+C / Ctrl+V = 복사·붙여넣기 (글자를 고치는 중이 아닐 때)
   * 기본 요소(금액·전화 등)는 삭제하면 숨겨지고, 복사하면 같은 글자·크기·색·폰트의 "새 글자"가 생긴다. */
  type Clip = { kind: 'text' | 'image'; x: number; y: number; text?: string; src?: string; size?: number; w?: number; c?: string; f?: string };
  const [menu, setMenu] = useState<{ x: number; y: number; name?: string; chip?: number; clip?: Clip } | null>(null);
  const clipRef = useRef<Clip | null>(null);
  const lay = `${layout}-${orientation}`;
  const items = (info.items || []).filter((it) => it.lay === lay);
  const hiddenKeys = Object.entries(info.adjust || {}).filter(([k, v]) => k.startsWith(`${lay}-`) && v.h).map(([k]) => k);
  const pageEl = () => (ref as React.RefObject<HTMLDivElement>)?.current || null;
  const addItem = (it: Omit<FlyerItem, 'id' | 'lay'>, look?: { c?: string; f?: string }) => {
    const id = Math.random().toString(36).slice(2, 9);
    onItemsChange?.([...(info.items || []), { ...it, id, lay }]);
    if (look && (look.c || look.f)) onAdjust?.(`${layout}-${orientation}-item-${id}`, { x: 0, y: 0, s: 1, ...(look.c ? { c: look.c } : {}), ...(look.f ? { f: look.f } : {}) });
    setSel(`item-${id}`);
  };
  const removeItem = (id: string) => {
    onItemsChange?.((info.items || []).filter((it) => it.id !== id));
    setSel(null);
  };
  /* 요소 하나를 복사할 내용으로 — 화면에 보이는 글자·크기·색 그대로 */
  const clipOf = (name: string, chip?: number): Clip | null => {
    const page = pageEl();
    const wrap = page?.querySelector<HTMLElement>(`[data-name="${name}"]`);
    if (!page || !wrap) return null;
    const pr = page.getBoundingClientRect();
    const ratio = pr.width / page.offsetWidth;
    const target = (chip !== undefined ? wrap.querySelector<HTMLElement>(`[data-chip="${chip}"]`) : null) || wrap;
    const r = target.getBoundingClientRect();
    const x = Math.round((r.left - pr.left) / ratio) + 40, y = Math.round((r.top - pr.top) / ratio) + 40;
    const img = target.querySelector('img');
    if (img && !target.querySelector('[contenteditable="true"]')) return { kind: 'image', x, y, src: img.src, w: Math.round(img.getBoundingClientRect().width / ratio) };
    const textEl = (target.matches('[contenteditable="true"]') ? target : target.querySelector<HTMLElement>('[contenteditable="true"]')) || target;
    const cs = getComputedStyle(textEl);
    const node = (wrap.firstElementChild as HTMLElement | null) || wrap; // 요소 자신 (아래 도구 줄 글자는 빼고)
    const text = (chip !== undefined ? target.innerText : node.innerText).replace(/\s+/g, ' ').trim();
    if (!text) return null;
    return { kind: 'text', x, y, text, size: Math.round(parseFloat(cs.fontSize)), c: cs.color, f: adj(name).f };
  };
  const paste = (clip: Clip, at?: { x: number; y: number }) => {
    const { kind, text, src, size, w, c, f } = clip;
    addItem({ kind, x: at ? at.x : clip.x, y: at ? at.y : clip.y, text, src, size, w }, kind === 'text' ? { c, f } : undefined);
    if (!at) clip.x += 40, clip.y += 40; // 여러 번 붙이면 조금씩 비켜서
  };
  const remove = (name: string, chip?: number) => {
    if (name.startsWith('item-')) return removeItem(name.slice(5));
    if (chip !== undefined) { onTextOverride?.(`chip${chip}`, ''); return setSel(null); }
    onAdjust?.(akey(name), { ...adj(name), h: true });
    setSel(null);
  };
  const onMenu = (e: React.MouseEvent) => {
    if (!canAdjust || !onItemsChange) return;
    e.preventDefault();
    const page = e.currentTarget as HTMLElement;
    const r = page.getBoundingClientRect();
    const ratio = r.width / page.offsetWidth;
    const wrap = (e.target as HTMLElement).closest('[data-name]') as HTMLElement | null;
    // 칩은 덮개 아래에 있어 누른 자리로 찾는다
    const chipEl = document.elementsFromPoint(e.clientX, e.clientY).find((el) => el.hasAttribute('data-chip')) as HTMLElement | undefined;
    const name = wrap?.dataset.name;
    if (name) setSel(name);
    setMenu({ x: Math.round((e.clientX - r.left) / ratio), y: Math.round((e.clientY - r.top) / ratio), name, chip: chipEl ? Number(chipEl.dataset.chip) : undefined });
  };
  /* 키보드 — 고른 요소 삭제·복사·붙여넣기 */
  useEffect(() => {
    if (!canAdjust) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (editing || (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (sel && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); remove(sel); }
      else if (sel && ctrl && e.key.toLowerCase() === 'c') { const c = clipOf(sel); if (c) clipRef.current = c; }
      else if (ctrl && e.key.toLowerCase() === 'v' && clipRef.current) { e.preventDefault(); paste(clipRef.current); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const menuBtn: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 0, background: 'transparent', fontSize: 16, fontWeight: 700, color: '#111', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' };
  const menuEl = menu && (
    <div data-noexport="" onPointerDown={(e) => e.stopPropagation()} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
      style={{ position: 'absolute', left: Math.min(menu.x, pageW - 260), top: Math.min(menu.y, pageH - 220), zIndex: 60, background: '#fff', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,.25)', border: '1px solid #e5e7eb', padding: 6, minWidth: 240 }}>
      {menu.name ? (
        <>
          <button type="button" style={menuBtn} onClick={() => { const c = clipOf(menu.name!, menu.chip); setMenu(null); if (c) { clipRef.current = { ...c }; paste(c); } }}>⧉ 복사 <span style={{ color: '#9ca3af', fontWeight: 500, fontSize: 13 }}>Ctrl+C·V</span></button>
          <button type="button" style={{ ...menuBtn, color: '#dc2626' }} onClick={() => { remove(menu.name!, menu.chip); setMenu(null); }}>🗑 삭제 <span style={{ color: '#9ca3af', fontWeight: 500, fontSize: 13 }}>Delete</span></button>
        </>
      ) : (
        <>
          <button type="button" style={menuBtn} onClick={() => { addItem({ kind: 'text', x: menu.x, y: menu.y }); setMenu(null); }}>✎ 새 글자 넣기</button>
          <button type="button" style={menuBtn} onClick={() => { const { x, y } = menu; setMenu(null); onPickImage?.((url) => addItem({ kind: 'image', x, y, src: url })); }}>🖼 새 이미지 넣기</button>
          {clipRef.current && <button type="button" style={menuBtn} onClick={() => { paste(clipRef.current!, { x: menu.x, y: menu.y }); setMenu(null); }}>📋 여기에 붙여넣기</button>}
          {hiddenKeys.length > 0 && (
            <button type="button" style={menuBtn} onClick={() => { hiddenKeys.forEach((k) => { const v = { ...info.adjust![k] }; delete v.h; onAdjust?.(k, v); }); setMenu(null); }}>👁 숨긴 것 다시 보이기 ({hiddenKeys.length})</button>
          )}
        </>
      )}
    </div>
  );
  const itemLayer = (
    <>
      {items.map((it) => {
        const name = `item-${it.id}`;
        const del = <button type="button" title="지우기" onClick={() => removeItem(it.id)} style={{ ...toolBtn, color: '#dc2626' }}>🗑 지우기</button>;
        return (
          <div key={it.id} data-item={it.id} style={{ position: 'absolute', left: it.x, top: it.y, zIndex: sel === name ? 40 : 20 }}>
            {it.kind === 'text'
              ? mov(name, <div {...edt(name, it.text || '새 글자')} className={editClass} style={{ fontSize: sz(name, it.size || 56), fontWeight: 900, color: '#111', whiteSpace: 'nowrap', lineHeight: 1.2 }}>{tx(name, it.text || '새 글자')}</div>, { margin: 0 }, { extra: del })
              : mov(name, <img src={it.src} alt="" style={{ width: sz(name, it.w || 260), display: 'block' }} />, { margin: 0 }, {
                  noStyle: true,
                  onDouble: () => onPickImage?.((url) => onItemsChange?.((info.items || []).map((x) => (x.id === it.id ? { ...x, src: url } : x)))),
                  extra: <>{del}<button type="button" title="이미지 바꾸기" onClick={() => onPickImage?.((url) => onItemsChange?.((info.items || []).map((x) => (x.id === it.id ? { ...x, src: url } : x))))} style={toolBtn}>🖼 바꾸기</button></>,
                })}
          </div>
        );
      })}
      {menuEl}
    </>
  );
  /* 빈 곳을 누르면 선택을 푼다 */
  const pageDown = (e: React.PointerEvent) => {
    if (e.button === 2) return; // 오른쪽 클릭은 메뉴
    setMenu(null);
    if (!(e.target as HTMLElement).closest('[data-mov]')) { setSel(null); setEditing(null); }
  };

  const officeLine = [vis('agentRepresentative') ? info.agentRepresentative : '', ...(info.agentAdditionalInfo || [])].filter(Boolean).join('  ·  ');
  /* 아래 연락 띠 — 전화번호가 주인공. 표시·광고 필수 정보(사무소·대표·등록번호·소재지)는 작게 */
  const renderCallBand = (compact = false) => (
    <div className="flex items-center" style={{ flexShrink: 0, gap: 28, background: '#111827', color: '#fff', padding: `${compact ? 20 : 26}px ${isLand ? 44 : 52}px` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {mov('phone', (
          <div className="flex items-center" style={{ gap: 14 }}>
            <span style={{ width: sz('phone', 58), height: sz('phone', 58), borderRadius: 999, background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <PhoneIcon style={{ width: sz('phone', 32), height: sz('phone', 32) }} />
            </span>
            <span {...editable(info.agentMobile ? 'agentMobile' : 'agentPhone')} {...fitBy(sz('phone', isLand ? 76 : 84), 30)} className={editClass}
              style={{ ...one, textAlign: 'left', width: 'auto', flex: 1, minWidth: 0, flexShrink: 1, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1.05 }}>{phone}</span>
          </div>
        ), { marginLeft: 0 })}
        {mov('agent', <p {...editable('agentName')} {...fitBy(sz('agent', 28), 14)} className={editClass} style={{ ...one, textAlign: 'left', fontWeight: 900, lineHeight: 1.2 }}>{info.agentName}</p>, { marginTop: 10, marginLeft: 0 })}
        {mov('office', (
          <p {...edt('office', officeLine)} className={editClass} style={{ ...one, textAlign: 'left', fontSize: sz('office', 14), fontWeight: 600, opacity: .75, textOverflow: 'ellipsis' }}>
            {tx('office', officeLine)}
          </p>
        ), { marginTop: 4, marginLeft: 0 })}
      </div>
      {qrDataUrl && vis('qr') && mov('qr', (
        <div style={{ textAlign: 'center' }}>
          <a href={canAdjust ? undefined : qrLink || undefined} target="_blank" rel="noopener noreferrer" title="매물 상세보기" style={{ display: 'block' }}>
            <img src={qrDataUrl} alt="매물 QR" style={{ width: sz('qr', compact ? 120 : 140), height: sz('qr', compact ? 120 : 140), background: '#fff', padding: 7, borderRadius: 10 }} />
          </a>
          <div {...edt('qrLabel', '사진·위치 보기')} className={editClass} style={{ fontSize: sz('qr', 14), fontWeight: 800, marginTop: 6 }}>{tx('qrLabel', '사진·위치 보기')}</div>
        </div>
      ), {}, { texts: ['qr', 'qrLabel'], noStyle: true })}
    </div>
  );

  /* 칩 — 정해진 줄 수만 (넘치는 줄은 통째로 빼서 반쯤 잘린 칩이 보이지 않게), 가운데 정렬 */
  const renderChips = (base: number, rows = 2) => {
    if (!chips.length) return null;
    const size = sz('chips', base);
    return mov('chips', (
      <div className="flex flex-wrap justify-center" style={{ gap: 12, overflow: 'hidden', maxHeight: rows * (Math.round(size * 1.2) + Math.round(size * 0.22) * 2 + 8) + (rows - 1) * 12 }}>
        {chips.map((ch, i) => tx(`chip${i}`, ch) !== '' && (
          <span key={i} data-chip={i} {...edt(`chip${i}`, ch)} className={editClass} style={{ fontSize: size, fontWeight: 800, color: primaryColor, border: `3px solid ${adj('chips').c || primaryColor}`, ...look('chips'), borderRadius: 999, padding: `${Math.round(size * 0.22)}px ${Math.round(size * 0.7)}px`, whiteSpace: 'nowrap', lineHeight: 1.2 }}>{tx(`chip${i}`, ch)}</span>
        ))}
      </div>
    ), {}, { texts: chips.map((_, i) => `chip${i}`) });
  };

  const badgeEl = info.badge ? (
    <span style={{ background: '#e11d2a', color: '#fff', fontSize: 30, fontWeight: 900, padding: '6px 20px', borderRadius: 8, flexShrink: 0 }}>{info.badge}</span>
  ) : null;

  /* 금액 묶음 (두 디자인 공통): 금액 이름 → 금액 → 크기 줄 → 칩. 모두 가운데 정렬, 하나씩 옮기고 키울 수 있다 */
  const priceBlock = (p: { label: number; price: number; size: number; chip: number; rows: number; gap: number }) => (
    <div className="flex flex-col" style={{ flex: 1, minHeight: 0, justifyContent: 'center' }}>
      {tx('label', priceLabel) !== '' && mov('label', <div {...edt('label', priceLabel)} className={editClass} style={{ fontSize: sz('label', p.label), fontWeight: 800, color: '#4b5563', textAlign: 'center' }}>{tx('label', priceLabel)}</div>)}
      {mov('price', <div {...priceEditable} {...fitBy(sz('price', p.price), 60)} className={editClass}
        style={{ ...one, fontWeight: 900, color: primaryColor, lineHeight: 1.05, letterSpacing: -5, marginTop: 4 }}>{priceText}</div>)}
      {vis('sizeLine') && sizeWord && mov('size', <div {...editable('sizeLine')} {...fitBy(sz('size', p.size), 26)} className={editClass}
        style={{ ...one, fontWeight: 900, color: '#111', letterSpacing: -1 }}>{sizeWord}</div>, { marginTop: p.gap })}
      {chips.length > 0 && <div style={{ marginTop: p.gap + 8, flexShrink: 0 }}>{renderChips(p.chip, p.rows)}</div>}
    </div>
  );
  /* 어디 매물인지 — 건물·단지명 */
  const addressLine = (base: number) => (
    <div style={{ paddingTop: isLand ? 12 : 16, flexShrink: 0 }}>
      {mov('address', <div {...editable('address')} {...fitBy(sz('address', base), 20)} className={editClass}
        style={{ ...one, fontWeight: 800, color: '#374151' }}>{info.address}</div>)}
    </div>
  );

  // ① 숫자 크게형
  const renderBig = () => (
    <div ref={ref} data-flyer-page onPointerDown={pageDown} onContextMenu={onMenu} className="bg-white overflow-hidden flex flex-col font-sans" style={{ position: 'relative', width: pageW, height: pageH, color: '#111' }}>
      {/* 머리 띠: 딱지 + 물건·거래 */}
      <div className="flex items-center justify-center" style={{ flexShrink: 0, gap: 18, background: primaryColor, color: '#fff', padding: `${isLand ? 22 : 30}px ${isLand ? 44 : 52}px` }}>
        {badgeEl}
        {mov('head', <span {...edt('head', headWord || tradeWord)} {...fitBy(sz('head', isLand ? 56 : 64), 24)} className={editClass} style={{ ...one, display: 'block', fontWeight: 900, letterSpacing: -1, lineHeight: 1.2 }}>{tx('head', headWord || tradeWord)}</span>, { minWidth: 0 })}
      </div>
      <div className="flex flex-col" style={{ flex: 1, minHeight: 0, padding: `${isLand ? 26 : 40}px ${isLand ? 44 : 52}px ${isLand ? 22 : 30}px` }}>
        {priceBlock(isLand ? { label: 34, price: 210, size: 60, chip: 28, rows: 2, gap: 10 } : { label: 44, price: 240, size: 72, chip: 38, rows: 3, gap: 24 })}
        {addressLine(isLand ? 36 : 40)}
      </div>
      {renderCallBand(isLand)}
      {itemLayer}
    </div>
  );

  // ② 사진형
  const renderPhoto = () => {
    /* 사진 — 누르면 [옮기기][크기][사진 바꾸기] 도구. 공유 화면에서는 도구 없음 */
    const photoBox = (style: React.CSSProperties) => mov('photo', (
      <div style={{ position: 'relative', overflow: 'hidden', background: '#e5e7eb', ...style }}>
        <img onClick={() => !canAdjust && onImageClick?.('mainImage')} src={mainImgSrc} className="w-full h-full object-cover cursor-pointer" />
        <div style={{ position: 'absolute', left: 24, top: 24, display: 'flex', gap: 10, zIndex: 3 }}>
          {badgeEl}
          {tx('head', headWord) !== '' && mov('head', <span {...edt('head', headWord)} className={editClass} style={{ display: 'block', background: '#fff', color: primaryColor, fontSize: sz('head', 30), fontWeight: 900, padding: '6px 18px', borderRadius: 8 }}>{tx('head', headWord)}</span>)}
        </div>
      </div>
    ), { width: isLand ? undefined : '100%', margin: 0 }, { noStyle: true, onDouble: () => onImageClick?.('mainImage'), extra: <button type="button" title="사진 바꾸기" onClick={() => onImageClick?.('mainImage')} style={toolBtn}>🖼 사진 바꾸기 (더블클릭)</button> });
    const text = (
      <div className="flex flex-col" style={{ flex: 1, minHeight: 0, minWidth: 0, padding: `${isLand ? 30 : 26}px ${isLand ? 40 : 52}px ${isLand ? 20 : 22}px` }}>
        {/* 세로는 칩 한 줄 — 주소·연락 띠와 겹치지 않게 */}
        {priceBlock(isLand ? { label: 30, price: 150, size: 48, chip: 24, rows: 2, gap: 8 } : { label: 34, price: 150, size: 52, chip: 28, rows: 1, gap: 8 })}
        {addressLine(34)}
      </div>
    );
    return (
      <div ref={ref} data-flyer-page onPointerDown={pageDown} onContextMenu={onMenu} className="bg-white overflow-hidden flex flex-col font-sans" style={{ position: 'relative', width: pageW, height: pageH, color: '#111' }}>
        {isLand ? (
          <div className="flex" style={{ flex: 1, minHeight: 0 }}>
            {photoBox({ width: sz('photo', 600), height: '100%' })}
            {text}
          </div>
        ) : (
          <>
            {photoBox({ height: sz('photo', 470) })}
            {text}
          </>
        )}
        {renderCallBand(true)}
        {itemLayer}
      </div>
    );
  };

  if (layout === 'big') return renderBig();
  if (layout === 'photo') return renderPhoto();
  if (layout === 'type6') return renderSimple();
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
