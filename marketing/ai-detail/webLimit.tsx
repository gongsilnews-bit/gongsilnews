import React, { useState } from 'react';

/**
 * 웹(크롬)에서 여는 유리창홍보지는 "숫자 크게"·"사진형" 두 디자인만 (2026-10-29 사장님) — 나머지 디자인은 공실마케팅 앱에서
 * 매물보고서(marketing/report/webLimit.tsx)와 같은 방식: 흰 막 + 앱 안내. 앱 안에서는 틀(iframe) 바깥 창에 gongsilStudio 가 있다.
 */
export const inStudioApp = (): boolean => {
  try {
    return Boolean((window.parent as any)?.gongsilStudio || (window as any).gongsilStudio || (window.opener as any)?.gongsilStudio); // 앱에서 새 창으로 연 것도
  } catch {
    return false;
  }
};
/** 웹(크롬)에서 열었는지 — 공유하기만 웹에서 숨긴다 (2026-11-04 사장님: 보고서·홍보지는 이미지로 보낸다) */
export const IS_WEB = typeof window !== 'undefined' && !inStudioApp();
/**
 * 무료 잠금 — 2026-11-04 사장님 등급 회의: 공실뉴스부동산(무료)은 매물보고서 표지·개요만 · 유리창홍보지 "숫자 크게"만, PRO 는 모두
 * 관리자 화면(바깥 창)이 window.__gsTierPro 를 알려 준다 (realty_admin). 아직 모르면(불러오는 중) 막지 않는다.
 * 앱 안에서는 예전처럼 막지 않는다.
 */
const parentPro = (): boolean | undefined => {
  try { const v = (window.parent as any)?.__gsTierPro ?? (window as any).__gsTierPro; return typeof v === 'boolean' ? v : undefined; } catch { return undefined; }
};
export const isLimited = (): boolean => typeof window !== 'undefined' && !inStudioApp() && parentPro() === false;
/** 예전 이름 — 공유 단추에서만 쓴다 (웹은 공유를 숨긴다) */
export const WEB_LIMITED = false;
/** 웹에서 쓸 수 있는 디자인 (LAYOUTS id) */
export const WEB_LAYOUT_IDS = ['big']; // 무료는 "숫자 크게"만 (2026-11-04)
export const webLayoutAllowed = (id: string | null | undefined) => !isLimited() || WEB_LAYOUT_IDS.includes(String(id || ''));

/** 금액안내 — 관리자 화면의 [금액안내] 창을 연다 (없으면 금액안내 페이지) */
function goPricing() {
  try { const f = (window.parent as any)?.__gsAskUpgrade; if (typeof f === 'function') { f(); return; } } catch { /* */ }
  window.open('https://www.gongsilnews.com/marketing/pricing', '_blank', 'noopener');
}

let openFn: ((why: string) => void) | null = null;
/** 어디서든 — 앱 설치 안내 창을 연다 */
export const askInstallApp = (why = '') => openFn?.(why);

/** 앱 설치 안내 창 (App 맨 아래에 한 번 둔다) */
export const InstallAppModal: React.FC = () => {
  const [why, setWhy] = useState<string | null>(null);
  openFn = (w) => setWhy(w);
  if (why === null) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] print:hidden" onClick={() => setWhy(null)}>
      <div className="w-[440px] max-w-[92vw] rounded-2xl bg-white p-7 shadow-2xl text-center" onClick={(e) => e.stopPropagation()}>
        <div className="text-[13px] font-bold tracking-wider text-orange-600">공실뉴스부동산 PRO</div>
        <h3 className="mt-2 text-xl font-black text-gray-900">{why || '이 디자인은 PRO에서 만들 수 있어요'}</h3>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          무료 공실뉴스부동산은 <b>숫자 크게</b> 디자인만 만들 수 있어요.<br />
          공실뉴스부동산 <b>PRO</b>는 <b>모든 디자인</b>(사진형·추천 걸이판·반반 사진·색 바탕·테두리·사진 갤러리 등)을 쓸 수 있어요.
        </p>
        <div className="mt-6 flex gap-2">
          <button className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50" onClick={() => setWhy(null)}>닫기</button>
          <button className="flex-[2] rounded-xl bg-orange-500 py-3 text-sm font-black text-white hover:bg-orange-600"
            onClick={() => { goPricing(); setWhy(null); }}>
            금액안내 보기 →
          </button>
        </div>
      </div>
    </div>
  );
};

/** 웹에서 막힌 디자인 위에 덮는 흰 막 — 안내 창과 같은 글을 바로, [금액안내 보기] 한 번이면 금액안내 (2026-11-04 사장님: 한 번만 클릭) */
export const WebLockCover: React.FC<{ layoutId: string }> = ({ layoutId }) => {
  if (webLayoutAllowed(layoutId)) return null;
  return (
    <div data-web-lock className="absolute inset-0 z-[60] flex items-center justify-center bg-white/80 backdrop-blur-[3px] print:hidden">
      <div className="w-[440px] max-w-[92%] rounded-2xl bg-white p-7 text-center shadow-2xl ring-1 ring-gray-200">
        <div className="text-[13px] font-bold tracking-wider text-orange-600">🔒 공실뉴스부동산 PRO</div>
        <h3 className="mt-2 text-xl font-black text-gray-900">이 디자인은 PRO에서 만들 수 있어요</h3>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          무료 공실뉴스부동산은 <b>숫자 크게</b> 디자인만 만들 수 있어요.<br />
          공실뉴스부동산 <b>PRO</b>는 <b>모든 디자인</b>(사진형·추천 걸이판·반반 사진·색 바탕·테두리·사진 갤러리 등)을 쓸 수 있어요.
        </p>
        <button className="mt-6 w-full rounded-xl bg-orange-500 py-3 text-sm font-black text-white hover:bg-orange-600" onClick={() => goPricing()}>
          금액안내 보기 →
        </button>
      </div>
    </div>
  );
};
