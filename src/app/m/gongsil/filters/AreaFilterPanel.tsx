import React, { useState, useEffect } from 'react';
import { FilterState } from './useVacancyFilters';

interface Props {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
}

const PRESETS = [
  { label: '10평', val: 10 },
  { label: '20평', val: 20 },
  { label: '30평', val: 30 },
  { label: '40평', val: 40 },
  { label: '50평', val: 50 },
  { label: '60평~', val: 60 }
];

export default function AreaFilterPanel({ filters, onFilterChange }: Props) {
  const minVal = filters.areaMin ?? 0;
  const maxVal = filters.areaMax ?? 100;

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Number(e.target.value), maxVal - 5);
    onFilterChange({ areaMin: value === 0 ? null : value });
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(Number(e.target.value), minVal + 5);
    onFilterChange({ areaMax: value >= 100 ? null : value });
  };

  const minPercent = (minVal / 100) * 100;
  const maxPercent = (maxVal / 100) * 100;

  return (
    <div style={{ padding: "10px 0" }}>
      {/* 실시간 말풍선 라벨 */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
        <div style={{
          backgroundColor: "#f0f7ff", border: "1.5px solid #1a73e8", color: "#1a73e8",
          padding: "6px 16px", borderRadius: "20px", fontSize: "14px", fontWeight: 800,
          boxShadow: "0 2px 8px rgba(26, 115, 232, 0.15)"
        }}>
          {minVal === 0 && maxVal >= 100 ? "전체" : `${minVal}평 ~ ${maxVal >= 100 ? "100평+" : `${maxVal}평`}`}
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
          max="100"
          step="5"
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
          max="100"
          step="5"
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
        <span>최소(0평)</span>
        <span>25평</span>
        <span>50평</span>
        <span>75평</span>
        <span>최대(100평+)</span>
      </div>

      {/* 조건삭제 */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
        <button onClick={() => onFilterChange({ areaMin: null, areaMax: null })} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
          ↻ 조건삭제
        </button>
      </div>
    </div>
  );
}
