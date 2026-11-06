import React from 'react';
import { openFromWebFolder, WEB_FOLDER_NAME } from './webFolder';

/** [📁] 내보낸 파일 보기 (2026-11-06 사장님) — 아래 버튼 줄 맨 끝. 웹 저장 폴더에서 파일 고르기 창 → 고른 파일을 새 탭으로.
 *  앱(공실마케팅 앱) 안이면 보이지 않는다 (앱은 따로 폴더를 연다) */
const FolderOpenButton: React.FC = () => {
  let inApp = false;
  try { inApp = Boolean((window.parent as any)?.gongsilStudio || (window as any).gongsilStudio); } catch { /* */ }
  if (inApp) return null;
  const click = async () => {
    const r = await openFromWebFolder();
    if (r === 'nofolder') alert(`저장 폴더를 아직 정하지 않았어요.\n관리자 화면 왼쪽 아래 [저장 폴더 › 정하기]로 정하면, 내보낸 파일을 여기서 바로 볼 수 있어요.\n(정하지 않으면 내보낸 파일은 다운로드 폴더에 있어요)`);
  };
  return (
    <button type="button" onClick={click} title={`내보낸 파일 보기 (공실뉴스\\${WEB_FOLDER_NAME})`}
      className="py-3 px-3.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-95 rounded-xl font-bold text-sm flex items-center justify-center transition-all duration-150 shadow-sm shrink-0">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-5 h-5 text-amber-500" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
      </svg>
    </button>
  );
};
export default FolderOpenButton;