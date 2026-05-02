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
  const [minInput, setMinInput] = useState<string>('');
  const [maxInput, setMaxInput] = useState<string>('');

  useEffect(() => {
    setMinInput(filters.priceMin ? filters.priceMin.toString() : '');
    setMaxInput(filters.priceMax ? filters.priceMax.toString() : '');
  }, [filters.priceMin, filters.priceMax]);

  const handlePresetClick = (val: number) => {
    // 네이버 방식: 
    // 최소값이 비어있거나, 선택값이 최소값보다 작으면 최소값 갱신.
    // 최소값이 있고 최대값이 비어있으며, 선택값이 최소값보다 크면 최대값 갱신.
    // 둘 다 있으면 리셋하고 최소값으로 지정.
    if (filters.priceMin === null) {
      onFilterChange({ priceMin: val, priceMax: null });
    } else if (filters.priceMax === null) {
      if (val > filters.priceMin) {
        onFilterChange({ priceMax: val });
      } else {
        onFilterChange({ priceMin: val, priceMax: null });
      }
    } else {
      onFilterChange({ priceMin: val, priceMax: null });
    }
  };

  const applyInputs = () => {
    const min = minInput ? parseInt(minInput, 10) : null;
    const max = maxInput ? parseInt(maxInput, 10) : null;
    onFilterChange({ priceMin: min && !isNaN(min) ? min : null, priceMax: max && !isNaN(max) ? max : null });
  };

  const gridBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 4px", borderRadius: "4px", fontSize: "14px", fontWeight: active ? 700 : 500, textAlign: "center",
    border: active ? "1.5px solid #4b89ff" : "1px solid #e5e7eb",
    background: active ? "#eef4ff" : "#fff", color: active ? "#4b89ff" : "#374151",
    cursor: "pointer", transition: "all 0.15s",
  });

  const isPresetActive = (val: number) => filters.priceMin === val || filters.priceMax === val;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "20px" }}>
        {PRESETS.map(p => (
          <button key={p.label} onClick={() => handlePresetClick(p.val)} style={gridBtnStyle(isPresetActive(p.val))}>
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <div style={{ flex: 1, display: "flex", border: "1px solid #d1d5db", borderRadius: "6px", overflow: "hidden" }}>
          <button type="button" style={{ padding: "10px", background: "#f9fafb", border: "none", borderRight: "1px solid #d1d5db", color: "#6b7280", cursor: "pointer" }} onClick={() => { const val = Math.max(0, parseInt(minInput || "0") - 1000); setMinInput(val.toString()); onFilterChange({ priceMin: val }); }}>-</button>
          <input type="number" placeholder="최소" value={minInput} onChange={(e) => setMinInput(e.target.value)} onBlur={applyInputs} style={{ flex: 1, width: "100%", border: "none", textAlign: "center", fontSize: "14px", outline: "none" }} />
          <button type="button" style={{ padding: "10px", background: "#f9fafb", border: "none", borderLeft: "1px solid #d1d5db", color: "#6b7280", cursor: "pointer" }} onClick={() => { const val = parseInt(minInput || "0") + 1000; setMinInput(val.toString()); onFilterChange({ priceMin: val }); }}>+</button>
        </div>
        <span style={{ color: "#9ca3af" }}>~</span>
        <div style={{ flex: 1, display: "flex", border: "1px solid #d1d5db", borderRadius: "6px", overflow: "hidden" }}>
          <button type="button" style={{ padding: "10px", background: "#f9fafb", border: "none", borderRight: "1px solid #d1d5db", color: "#6b7280", cursor: "pointer" }} onClick={() => { const val = Math.max(0, parseInt(maxInput || "0") - 1000); setMaxInput(val.toString()); onFilterChange({ priceMax: val }); }}>-</button>
          <input type="number" placeholder="최대" value={maxInput} onChange={(e) => setMaxInput(e.target.value)} onBlur={applyInputs} style={{ flex: 1, width: "100%", border: "none", textAlign: "center", fontSize: "14px", outline: "none" }} />
          <button type="button" style={{ padding: "10px", background: "#f9fafb", border: "none", borderLeft: "1px solid #d1d5db", color: "#6b7280", cursor: "pointer" }} onClick={() => { const val = parseInt(maxInput || "0") + 1000; setMaxInput(val.toString()); onFilterChange({ priceMax: val }); }}>+</button>
        </div>
      </div>
      <div style={{ textAlign: "center", fontSize: "12px", color: "#9ca3af", marginBottom: "16px" }}>
        직접 입력: 만원 단위 (예: 1억 = 10000, 5천만 = 5000)
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => onFilterChange({ priceMin: null, priceMax: null })} style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
          ↻ 조건삭제
        </button>
      </div>
    </div>
  );
}
