import React from 'react';
import { BuildingIcon } from './icons';
import { Bookmark, FolderOpen } from 'lucide-react';

interface HeaderProps {
  onOpenSave?: () => void;
  onOpenLoad?: () => void;
  canSave?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onOpenSave, onOpenLoad, canSave }) => {
  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-[#f4a71b] p-3 rounded-lg shadow-lg flex-shrink-0">
            <BuildingIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-100 flex flex-wrap items-center gap-3">
              <span>공실뉴스 아파트 내부 인테리어 예측 시뮬레이터</span>
              <span className="text-xs font-medium text-[#f4a71b] bg-[#f4a71b]/10 px-2 py-0.5 rounded border border-[#f4a71b]/30">
                ARE1.0
              </span>
            </h1>
            <p className="mt-1 text-xs md:text-sm text-gray-400">
              AI를 통해 아파트 내부 리모델링 후의 모습을 미리 확인하고 내 계정에 보관하세요.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          {onOpenLoad && (
            <button
              onClick={onOpenLoad}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 hover:bg-gray-700 text-white rounded-xl font-bold text-xs shadow-sm transition border border-gray-700 active:scale-95"
              title="내 계정에 저장된 홈인테리어 프로젝트 목록"
            >
              <FolderOpen className="w-4 h-4 text-[#f4a71b]" />
              <span>내 보관함</span>
            </button>
          )}

          {onOpenSave && (
            <button
              onClick={onOpenSave}
              disabled={!canSave}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#f4a71b] hover:bg-[#d9900d] text-black rounded-xl font-extrabold text-xs shadow-md transition border border-amber-300 active:scale-95 disabled:opacity-40 disabled:bg-gray-700 disabled:text-gray-500 disabled:border-transparent"
              title="현재 인테리어 시뮬레이션 결과를 내 계정에 영구 저장"
            >
              <Bookmark className="w-4 h-4 fill-current" />
              <span>프로젝트 저장</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;