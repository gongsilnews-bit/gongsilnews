import React, { useState } from 'react';

/**
 * 웹(크롬)에서 여는 AI 물건보고서는 표지·개요 두 쪽만 (2026-10-29 사장님) — 나머지 쪽·전체 내보내기·공유는 공실마케팅 앱에서
 * 앱 안에서는 보고서가 틀(iframe)로 열리고 바깥 창에 gongsilStudio 가 있다.
 */
export const inStudioApp = (): boolean => {
  try {
    return Boolean((window.parent as any)?.gongsilStudio || (window as any).gongsilStudio || (window.opener as any)?.gongsilStudio); // 앱에서 새 창으로 연 것도
  } catch {
    return false;
  }
};
export const WEB_LIMITED = typeof window !== 'undefined' && !inStudioApp();
/** 웹에서 쓸 수 있는 쪽 (data-export-id) */
export const WEB_PAGE_IDS = ['page-0', 'page-1'];
export const WEB_PAGE_NUMS = [0, 1];
export const webAllowed = (exportId: string | null | undefined) => !WEB_LIMITED || WEB_PAGE_IDS.includes(String(exportId || ''));

/** 공실마케팅 소개 페이지로 (2026-10-29 사장님: 설치는 마케팅 페이지에서) */
const MARKETING_URL = 'https://www.gongsilnews.com/marketing';
function goMarketing() {
  try { (window.top || window).open(MARKETING_URL, '_blank', 'noopener'); } catch { window.open(MARKETING_URL, '_blank', 'noopener'); }
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
        <div className="text-[13px] font-bold tracking-wider text-orange-600">공실마케팅 앱</div>
        <h3 className="mt-2 text-xl font-black text-gray-900">{why || '전체 보고서는 공실마케팅 앱에서 만들어요'}</h3>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          웹에서는 <b>표지·개요 두 쪽</b>만 만들 수 있어요.<br />
          공실마케팅 앱을 설치하면 <b>모든 쪽</b>(시세·임대현황·사진·입지·로드뷰·지적도·연락처)과 <b>PDF·이미지 전체 내보내기·공유</b>까지 쓸 수 있어요.
        </p>
        <div className="mt-6 flex gap-2">
          <button className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50" onClick={() => setWhy(null)}>닫기</button>
          <button className="flex-[2] rounded-xl bg-orange-500 py-3 text-sm font-black text-white hover:bg-orange-600"
            onClick={() => { goMarketing(); setWhy(null); }}>
            공실마케팅 앱 알아보기 →
          </button>
        </div>
      </div>
    </div>
  );
};

/** 웹에서 막힌 쪽 위에 덮는 흰 반투명 막 */
export const WebLockCover: React.FC<{ exportId: string }> = ({ exportId }) => {
  if (webAllowed(exportId)) return null;
  return (
    <div data-web-lock className="absolute inset-0 z-[60] flex items-center justify-center bg-white/80 backdrop-blur-[3px] print:hidden">
      <div className="rounded-2xl bg-white/95 px-8 py-7 text-center shadow-xl ring-1 ring-gray-200">
        <div className="text-3xl">🔒</div>
        <div className="mt-2 text-lg font-black text-gray-900">이 쪽은 공실마케팅 앱에서 만들 수 있어요</div>
        <div className="mt-1 text-sm text-gray-500">웹에서는 표지·개요 두 쪽만 · 앱은 모든 쪽과 PDF·공유까지</div>
        <button className="mt-4 rounded-xl bg-orange-500 px-6 py-3 text-sm font-black text-white hover:bg-orange-600" onClick={() => askInstallApp()}>
          공실마케팅 앱 알아보기 →
        </button>
      </div>
    </div>
  );
};
