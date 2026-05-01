import React from 'react';
import { FilterState } from './useVacancyFilters';

interface Props {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
}

const YEAR_PRESETS = [
  { label: '1년 이내', min: new Date().getFullYear() - 1, max: null },
  { label: '5년 이내', min: new Date().getFullYear() - 5, max: null },
  { label: '10년 이내', min: new Date().getFullYear() - 10, max: null },
  { label: '15년 이내', min: new Date().getFullYear() - 15, max: null },
  { label: '15년 이상', min: null, max: new Date().getFullYear() - 15 },
];

const FLOOR_PRESETS = ['1층', '2층이상', '반지하/지하', '옥탑'];

export default function DetailFilterPanel({ filters, onFilterChange }: Props) {
  const gridBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 4px", borderRadius: "4px", fontSize: "14px", fontWeight: active ? 700 : 500, textAlign: "center",
    border: active ? "1.5px solid #4b89ff" : "1px solid #e5e7eb",
    background: active ? "#eef4ff" : "#fff", color: active ? "#4b89ff" : "#374151",
    cursor: "pointer", transition: "all 0.15s",
  });

  const isYearActive = (min: number | null, max: number | null) => filters.yearMin === min && filters.yearMax === max;

  return (
    <div>
      {/* 층수 */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#111", marginBottom: "12px" }}>층수</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
          {FLOOR_PRESETS.map(f => (
            <button 
              key={f} 
              onClick={() => onFilterChange({ floor: filters.floor === f ? null : f })} 
              style={gridBtnStyle(filters.floor === f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* 사용승인일 */}
      <div>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#111", marginBottom: "12px" }}>사용승인일 (연식)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
          {YEAR_PRESETS.map(p => (
            <button 
              key={p.label} 
              onClick={() => onFilterChange({ yearMin: isYearActive(p.min, p.max) ? null : p.min, yearMax: isYearActive(p.min, p.max) ? null : p.max })} 
              style={gridBtnStyle(isYearActive(p.min, p.max))}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
        <button onClick={() => onFilterChange({ floor: null, yearMin: null, yearMax: null })} style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
          ↻ 조건삭제
        </button>
      </div>
    </div>
  );
}
