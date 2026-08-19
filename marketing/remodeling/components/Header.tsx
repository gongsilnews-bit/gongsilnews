import React from 'react';
import { Bookmark, FolderOpen, ArrowLeft, MapPin } from 'lucide-react';

interface VacancyInfo {
  id: string;
  buildingName?: string;
  address?: string;
  tradeType?: string;
}

interface HeaderProps {
  onOpenSave?: () => void;
  onOpenLoad?: () => void;
  canSave?: boolean;
  vacancyInfo?: VacancyInfo | null;
}

const Header: React.FC<HeaderProps> = ({ onOpenSave, onOpenLoad, canSave, vacancyInfo }) => {
  const handleBack = () => {
    if (vacancyInfo?.id) {
      window.location.href = `/realty_admin?menu=gongsil&action=marketing&id=${vacancyInfo.id}`;
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-30 shadow-md">
      <div className="container mx-auto px-4 md:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Navigation & Branding */}
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-700/70 hover:bg-gray-700 text-gray-200 hover:text-white rounded-lg text-xs font-semibold transition border border-gray-600/60 shadow-sm flex-shrink-0 active:scale-95"
            title="이전 화면으로 돌아가기"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">뒤로가기</span>
          </button>

          {/* Gongsil News Logo -> Click to Home */}
          <a
            href="/"
            className="flex items-center gap-2 flex-shrink-0 hover:opacity-85 transition active:scale-95 py-0.5"
            title="공실뉴스 홈으로 이동"
          >
            <img
              src="/logo.png"
              alt="공실뉴스"
              className="h-7 md:h-8 object-contain"
              onError={(e) => {
                // Fallback to text if image not found
                e.currentTarget.style.display = 'none';
              }}
            />
          </a>

          {/* Vertical Divider */}
          <div className="h-6 w-px bg-gray-700 hidden sm:block flex-shrink-0"></div>

          {/* Title & Property Info */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base md:text-xl font-bold text-gray-100 tracking-tight truncate">
                건물 외관 리모델링 예측 시뮬레이터
              </h1>
              <span className="text-[10px] md:text-xs font-bold text-[#f4a71b] bg-[#f4a71b]/10 px-2 py-0.5 rounded border border-[#f4a71b]/30 flex-shrink-0">
                RE1.0
              </span>
            </div>

            {vacancyInfo ? (
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-amber-300 font-medium truncate">
                <MapPin className="w-3 h-3 text-[#f4a71b] flex-shrink-0" />
                <span className="truncate">
                  {vacancyInfo.buildingName ? `${vacancyInfo.buildingName} ` : ''}
                  {vacancyInfo.address ? `(${vacancyInfo.address})` : ''}
                </span>
                <span className="text-gray-400 text-[11px] hidden md:inline">• 매물 연동됨</span>
              </div>
            ) : (
              <p className="mt-0.5 text-xs text-gray-400 truncate hidden sm:block">
                AI를 통해 리모델링 후의 모습을 미리 확인하고 내 계정에 보관하세요.
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
          {onOpenLoad && (
            <button
              onClick={onOpenLoad}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-gray-700 text-white rounded-xl font-bold text-xs shadow-sm transition border border-gray-700 active:scale-95"
              title="내 계정에 저장된 리모델링 프로젝트 목록"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#f4a71b]" />
              <span>내 보관함</span>
            </button>
          )}

          {onOpenSave && (
            <button
              onClick={onOpenSave}
              disabled={!canSave}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#f4a71b] hover:bg-[#d9900d] text-black rounded-xl font-extrabold text-xs shadow-md transition border border-amber-300 active:scale-95 disabled:opacity-40 disabled:bg-gray-700 disabled:text-gray-500 disabled:border-transparent"
              title="현재 리모델링 시뮬레이션 결과를 내 계정에 영구 저장"
            >
              <Bookmark className="w-3.5 h-3.5 fill-current" />
              <span>프로젝트 저장</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;