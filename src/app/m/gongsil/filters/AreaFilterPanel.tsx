import React, { useState, useEffect } from 'react';
import { FilterState } from './useVacancyFilters';

interface Props {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
}

const PRESETS = [
  { label: '10평대', min: 10, max: 20 },
  { label: '20평대', min: 20, max: 30 },
  { label: '30평대', min: 30, max: 40 },
  { label: '40평대', min: 40, max: 50 },
  { label: '50평대', min: 50, max: 60 },
  { label: '60평 이상', min: 60, max: null }
];

export default function AreaFilterPanel({ filters, onFilterChange }: Props) {
  const [minInput, setMinInput] = useState<string>('');
  const [maxInput, setMaxInput] = useState<string>('');

  useEffect(() => {
    setMinInput(filters.areaMin ? filters.areaMin.toString() : '');
    setMaxInput(filters.areaMax ? filters.areaMax.toString() : '');
  }, [filters.areaMin, filters.areaMax]);

  const handlePresetClick = (min: number | null, max: number | null) => {
    onFilterChange({ areaMin: min, areaMax: max });
  };

  const applyInputs = () => {
    const min = minInput !== '' ? parseInt(minInput, 10) : null;
    const max = maxInput !== '' ? parseInt(maxInput, 10) : null;
    onFilterChange({ 
      areaMin: min !== null && !isNaN(min) ? min : null, 
      areaMax: max !== null && !isNaN(max) ? max : null 
    });
  };

  const gridBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 4px", borderRadius: "4px", fontSize: "14px", fontWeight: active ? 700 : 500, textAlign: "center",
    border: active ? "1.5px solid #4b89ff" : "1px solid #e5e7eb",
    background: active ? "#eef4ff" : "#fff", color: active ? "#4b89ff" : "#374151",
    cursor: "pointer", transition: "all 0.15s",
  });

  const isPresetActive = (min: number | null, max: number | null) => filters.areaMin === min && filters.areaMax === max;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "20px" }}>
        {PRESETS.map(p => (
          <button key={p.label} onClick={() => handlePresetClick(p.min, p.max)} style={gridBtnStyle(isPresetActive(p.min, p.max))}>
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <div style={{ flex: 1, display: "flex", border: "1px solid #d1d5db", borderRadius: "6px", overflow: "hidden" }}>
          <button type="button" style={{ padding: "10px", background: "#f9fafb", border: "none", borderRight: "1px solid #d1d5db", color: "#6b7280", cursor: "pointer" }} onClick={() => { const val = Math.max(0, parseInt(minInput || "0") - 5); setMinInput(val.toString()); onFilterChange({ areaMin: val }); }}>-</button>
          <input type="number" placeholder="최소(평)" value={minInput} onChange={(e) => setMinInput(e.target.value)} onBlur={applyInputs} onKeyDown={(e) => e.key === 'Enter' && applyInputs()} style={{ flex: 1, width: "100%", border: "none", textAlign: "center", fontSize: "14px", outline: "none" }} />
          <button type="button" style={{ padding: "10px", background: "#f9fafb", border: "none", borderLeft: "1px solid #d1d5db", color: "#6b7280", cursor: "pointer" }} onClick={() => { const val = parseInt(minInput || "0") + 5; setMinInput(val.toString()); onFilterChange({ areaMin: val }); }}>+</button>
        </div>
        <span style={{ color: "#9ca3af" }}>~</span>
        <div style={{ flex: 1, display: "flex", border: "1px solid #d1d5db", borderRadius: "6px", overflow: "hidden" }}>
          <button type="button" style={{ padding: "10px", background: "#f9fafb", border: "none", borderRight: "1px solid #d1d5db", color: "#6b7280", cursor: "pointer" }} onClick={() => { const val = Math.max(0, parseInt(maxInput || "0") - 5); setMaxInput(val.toString()); onFilterChange({ areaMax: val }); }}>-</button>
          <input type="number" placeholder="최대(평)" value={maxInput} onChange={(e) => setMaxInput(e.target.value)} onBlur={applyInputs} onKeyDown={(e) => e.key === 'Enter' && applyInputs()} style={{ flex: 1, width: "100%", border: "none", textAlign: "center", fontSize: "14px", outline: "none" }} />
          <button type="button" style={{ padding: "10px", background: "#f9fafb", border: "none", borderLeft: "1px solid #d1d5db", color: "#6b7280", cursor: "pointer" }} onClick={() => { const val = parseInt(maxInput || "0") + 5; setMaxInput(val.toString()); onFilterChange({ areaMax: val }); }}>+</button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
        <button onClick={() => onFilterChange({ areaMin: null, areaMax: null })} style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
          ↻ 조건삭제
        </button>
      </div>
    </div>
  );
}
