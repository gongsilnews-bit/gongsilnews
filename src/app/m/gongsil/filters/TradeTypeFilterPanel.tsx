import React from 'react';
import { FilterState } from './useVacancyFilters';

interface Props {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  TRADE_TYPES: string[];
}

export default function TradeTypeFilterPanel({ filters, onFilterChange, TRADE_TYPES }: Props) {
  const isAllSelected = TRADE_TYPES.length > 0 && TRADE_TYPES.every(item => filters.tradeTypes.includes(item));

  const toggleTrade = (item: string) => {
    const arr = filters.tradeTypes;
    const newArr = arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
    onFilterChange({ tradeTypes: newArr });
  };

  const handleToggleAll = () => {
    if (isAllSelected) {
      onFilterChange({ tradeTypes: [] });
    } else {
      onFilterChange({ tradeTypes: TRADE_TYPES });
    }
  };

  const gridBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 4px", borderRadius: "8px", fontSize: "15px", fontWeight: active ? 700 : 500, textAlign: "center",
    border: active ? "1.5px solid #4b89ff" : "1px solid #e5e7eb",
    background: active ? "#eef4ff" : "#fff", color: active ? "#4b89ff" : "#000",
    cursor: "pointer", transition: "all 0.15s",
  });

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
        <button 
          onClick={handleToggleAll} 
          style={{ ...gridBtnStyle(isAllSelected), fontSize: "14px" }}
        >
          {isAllSelected ? "✓ 전체해제" : "✓ 전체선택"}
        </button>
        {TRADE_TYPES.map(t => (
          <button key={t} onClick={() => toggleTrade(t)} style={gridBtnStyle(filters.tradeTypes.includes(t))}>
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
