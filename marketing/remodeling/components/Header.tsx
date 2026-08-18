
import React from 'react';
import { BuildingIcon } from './icons';

const Header: React.FC = () => {
  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4 md:px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-[#f4a71b] p-3 rounded-lg shadow-lg flex-shrink-0">
            <BuildingIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-100 flex flex-wrap items-center gap-3">
              <span>공실뉴스 건물 외관 리모델링 예측 시뮬레이터</span>
              <span className="text-sm font-medium text-[#f4a71b] bg-[#f4a71b]/10 px-2 py-0.5 rounded border border-[#f4a71b]/30">
                RE1.0
              </span>
            </h1>
            <p className="mt-1 text-sm md:text-md text-gray-400">
              AI를 통해 리모델링 후의 모습을 미리 확인해보세요.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-900 rounded-full border border-gray-700 text-sm text-gray-400 shadow-inner self-start md:self-center mt-4 md:mt-0">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span>업데이트: 2025-11-21</span>
        </div>
      </div>
    </header>
  );
};

export default Header;