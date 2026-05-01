import React from 'react';
import { FilterState } from './useVacancyFilters';

interface Props {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  TRADE_TYPES: string[];
}

export default function TradeTypeFilterPanel({ filters, onFilterChange, TRADE_TYPES }: Props) {
  const toggleTrade = (item: string) => {
    const arr = filters.tradeTypes;
    const newArr = arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
    onFilterChange({ tradeTypes: newArr });
  };

  const gridBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "14px 4px", borderRadius: "8px", fontSize: "14px", fontWeight: active ? 700 : 500, textAlign: "center",
    border: active ? "1.5px solid #4b89ff" : "1px solid #e5e7eb",
    background: active ? "#eef4ff" : "#fff", color: active ? "#4b89ff" : "#374151",
    cursor: "pointer", transition: "all 0.15s",
  });

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
        {TRADE_TYPES.map(t => (
          <button key={t} onClick={() => toggleTrade(t)} style={gridBtnStyle(filters.tradeTypes.includes(t))}>
            {t}
          </button>
        ))}
      </div>
      <button 
        onClick={() => onFilterChange({ tradeTypes: [] })} 
        style={{ width: "100%", padding: "12px", background: "#f3f4f6", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, color: "#6b7280", cursor: "pointer", marginTop: "16px" }}
      >
        초기화
      </button>
    </div>
  );
}
