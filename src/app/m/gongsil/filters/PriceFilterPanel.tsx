import React, { useState, useEffect } from 'react';
import { FilterState } from './useVacancyFilters';

interface Props {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
}

const PRESETS = [
  { label: '1천', val: 1000 }, { label: '3천', val: 3000 }, { label: '5천', val: 5000 },
  { label: '1억', val: 10000 }, { label: '2억', val: 20000 }, { label: '3억', val: 30000 },
  { label: '4억', val: 40000 }, { label: '5억', val: 50000 }, { label: '6억', val: 60000 },
  { label: '7억', val: 70000 }, { label: '8억', val: 80000 }, { label: '9억', val: 90000 },
  { label: '10억', val: 100000 }, { label: '12억', val: 120000 }, { label: '15억', val: 150000 },
  { label: '20억', val: 200000 }, { label: '30억', val: 300000 }, { label: '30억~', val: 300001 }
];

export default function PriceFilterPanel({ filters, onFilterChange }: Props) {
  const minVal = filters.priceMin ?? 0;
  const maxVal = filters.priceMax ?? 100000; // 10억

  const formatPrice = (val: number): string => {
    if (val === 0) return "최소";
    if (val >= 100000) return "최대";
    const uk = Math.floor(val / 10000);
    const man = val % 10000;
    if (uk > 0 && man > 0) {
      return `${uk}억 ${man.toLocaleString()}만`;
    }
    if (uk > 0) {
      return `${uk}억`;
    }
    return `${man.toLocaleString()}만`;
  };

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Number(e.target.value), maxVal - 500);
    onFilterChange({ priceMin: value === 0 ? null : value });
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(Number(e.target.value), minVal + 500);
    onFilterChange({ priceMax: value >= 100000 ? null : value });
  };

  const minPercent = (minVal / 100000) * 100;
  const maxPercent = (maxVal / 100000) * 100;

  return (
    <div style={{ padding: "10px 0" }}>
      {/* 실시간 말풍선 라벨 */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
        <div style={{
          backgroundColor: "#f0f7ff", border: "1.5px solid #1a73e8", color: "#1a73e8",
          padding: "6px 16px", borderRadius: "20px", fontSize: "14px", fontWeight: 800,
          boxShadow: "0 2px 8px rgba(26, 115, 232, 0.15)"
        }}>
          {minVal === 0 && maxVal >= 100000 ? "전체" : `${formatPrice(minVal)} ~ ${formatPrice(maxVal)}`}
        </div>
      </div>

      {/* 이중 슬라이더 레인지 컨테이너 */}
      <div style={{ position: "relative", width: "100%", height: "40px", display: "flex", alignItems: "center" }}>
        {/* 기본 회색 트랙 */}
        <div style={{ position: "absolute", left: 0, right: 0, height: "6px", backgroundColor: "#e5e7eb", borderRadius: "3px" }} />
        
        {/* 활성화 블루 트랙 */}
        <div style={{
          position: "absolute",
          left: `${minPercent}%`,
          width: `${maxPercent - minPercent}%`,
          height: "6px",
          backgroundColor: "#1a73e8",
          borderRadius: "3px"
        }} />

        {/* 투명 레인지 인풋 2개 (겹침 배치) */}
        <input 
          type="range"
          min="0"
          max="100000"
          step="500"
          value={minVal}
          onChange={handleMinChange}
          style={{
            position: "absolute", width: "100%", pointerEvents: "none", WebkitAppearance: "none", appearance: "none",
            background: "none", outline: "none", margin: 0, zIndex: 3
          }}
          className="dual-slider-thumb-left"
        />
        <input 
          type="range"
          min="0"
          max="100000"
          step="500"
          value={maxVal}
          onChange={handleMaxChange}
          style={{
            position: "absolute", width: "100%", pointerEvents: "none", WebkitAppearance: "none", appearance: "none",
            background: "none", outline: "none", margin: 0, zIndex: 4
          }}
          className="dual-slider-thumb-right"
        />
      </div>

      {/* 최소/최대 축 힌트 */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
        <span>최소</span>
        <span>5천만</span>
        <span>2.5억</span>
        <span>5억</span>
        <span>최대(10억+)</span>
      </div>

      {/* CSS 스타일 주입 */}
      <style>{`
        .dual-slider-thumb-left::-webkit-slider-thumb {
          pointer-events: auto !important;
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #1a73e8;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          cursor: pointer;
          transition: transform 0.1s;
        }
        .dual-slider-thumb-left::-webkit-slider-thumb:active {
          transform: scale(1.2);
        }
        .dual-slider-thumb-right::-webkit-slider-thumb {
          pointer-events: auto !important;
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #1a73e8;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          cursor: pointer;
          transition: transform 0.1s;
        }
        .dual-slider-thumb-right::-webkit-slider-thumb:active {
          transform: scale(1.2);
        }
      `}</style>

      {/* 조건삭제 */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
        <button onClick={() => onFilterChange({ priceMin: null, priceMax: null })} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
          ↻ 조건삭제
        </button>
      </div>
    </div>
  );
}
