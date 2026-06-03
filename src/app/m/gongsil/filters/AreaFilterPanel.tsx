import React, { useState, useEffect } from 'react';
import { FilterState } from './useVacancyFilters';

interface Props {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
}

const PRESETS = [
  { label: '10??, val: 10 },
  { label: '20??, val: 20 },
  { label: '30??, val: 30 },
  { label: '40??, val: 40 },
  { label: '50??, val: 50 },
  { label: '60??', val: 60 }
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
      {/* ?¤ì‹œê°?ë§í’???¼ë²¨ */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
        <div style={{
          backgroundColor: "#f0f7ff", border: "1.5px solid #1a73e8", color: "#1a73e8",
          padding: "6px 16px", borderRadius: "20px", fontSize: "14px", fontWeight: 800,
          boxShadow: "0 2px 8px rgba(26, 115, 232, 0.15)"
        }}>
          {minVal === 0 && maxVal >= 100 ? "?„ì²´" : `${minVal}??~ ${maxVal >= 100 ? "100??" : `${maxVal}??}`}
        </div>
      </div>

      {/* ?´ì¤‘ ?¬ë¼?´ë” ?ˆì¸ì§€ ì»¨í…Œ?´ë„ˆ */}
      <div style={{ position: "relative", width: "100%", height: "40px", display: "flex", alignItems: "center" }}>
        {/* ê¸°ë³¸ ?Œìƒ‰ ?¸ë™ */}
        <div style={{ position: "absolute", left: 0, right: 0, height: "6px", backgroundColor: "#e5e7eb", borderRadius: "3px" }} />
        
        {/* ?œì„±??ë¸”ë£¨ ?¸ë™ */}
        <div style={{
          position: "absolute",
          left: `${minPercent}%`,
          width: `${maxPercent - minPercent}%`,
          height: "6px",
          backgroundColor: "#1a73e8",
          borderRadius: "3px"
        }} />

        {/* ?¬ëª… ?ˆì¸ì§€ ?¸í’‹ 2ê°?(ê²¹ì¹¨ ë°°ì¹˜) */}
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

      {/* ìµœì†Œ/ìµœë? ì¶??ŒíŠ¸ */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
        <span>ìµœì†Œ(0??</span>
        <span>25??/span>
        <span>50??/span>
        <span>75??/span>
        <span>ìµœë?(100??)</span>
      </div>

      {/* ì¡°ê±´?? œ */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
        <button onClick={() => onFilterChange({ areaMin: null, areaMax: null })} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
          ??ì¡°ê±´?? œ
        </button>
      </div>
    </div>
  );
}
